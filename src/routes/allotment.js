const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// SAFE PER-SUBJECT SEAT ALLOTMENT
// ============================================================================
// WARNING: Global/all-students allocation disabled to prevent accidental deletion.
// You MUST provide subject_id to allocate seats for a specific subject only.
// This ensures existing allocations for other subjects are NOT cleared.
router.post('/allot', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { subject_id, room_ids } = req.body;

    // Validate required fields
    if (!subject_id) {
      return res.status(400).json({ 
        error: 'subject_id is required',
        message: 'Global allocation disabled for safety. Provide subject_id to allocate specific subject.'
      });
    }

    if (!room_ids || !Array.isArray(room_ids) || room_ids.length === 0) {
      return res.status(400).json({ error: 'room_ids array is required' });
    }

    await client.query('BEGIN');

    // Step 1: Get subject details and validate it exists
    const subjectResult = await client.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subject_id]
    );

    if (subjectResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subject = subjectResult.rows[0];

    // Step 2: Check if allocations already exist for this subject (409 conflict)
    const existingCheck = await client.query(
      'SELECT COUNT(*) as count FROM seat_allotments WHERE subject_id = $1',
      [subject_id]
    );

    if (parseInt(existingCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: `Seat allocations already exist for subject '${subject.subject_code}'`,
        existing_allocations: parseInt(existingCheck.rows[0].count),
        suggestion: 'Delete existing allocations first using DELETE endpoint'
      });
    }

    // Step 3: Get students for this subject's department
    const studentsResult = await client.query(
      'SELECT id, roll_no, name, department FROM students WHERE department = $1 ORDER BY roll_no',
      [subject.department]
    );

    const students = studentsResult.rows;

    if (students.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `No students found in department '${subject.department}'` 
      });
    }

    // Step 4: Get selected rooms
    const roomsResult = await client.query(
      'SELECT id, room_no, capacity FROM rooms WHERE id = ANY($1::int[]) ORDER BY room_no',
      [room_ids]
    );

    const rooms = roomsResult.rows;

    if (rooms.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid rooms found' });
    }

    // Step 5: Calculate total capacity and validate
    const totalCapacity = rooms.reduce((sum, room) => sum + parseInt(room.capacity), 0);

    if (students.length > totalCapacity) {
      await client.query('ROLLBACK');
      const shortage = students.length - totalCapacity;
      return res.status(400).json({ 
        error: 'Insufficient room capacity',
        students_count: students.length,
        total_capacity: totalCapacity,
        shortage: shortage,
        message: `Need ${shortage} more seats. Add more rooms or increase room capacity.`
      });
    }

    // Step 6: Allocate seats room-by-room, seat-by-seat
    let studentIndex = 0;
    let allottedCount = 0;
    const allocations = [];

    for (const room of rooms) {
      for (let seatNumber = 1; seatNumber <= room.capacity && studentIndex < students.length; seatNumber++) {
        const student = students[studentIndex];
        
        await client.query(
          `INSERT INTO seat_allotments (student_id, room_id, seat_number, subject_id)
           VALUES ($1, $2, $3, $4)`,
          [student.id, room.id, seatNumber, subject_id]
        );

        allocations.push({
          student_roll_no: student.roll_no,
          room_no: room.room_no,
          seat_number: seatNumber
        });

        allottedCount++;
        studentIndex++;
      }

      if (studentIndex >= students.length) {
        break;
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Seat allotment completed successfully',
      subject: {
        subject_code: subject.subject_code,
        subject_name: subject.subject_name,
        department: subject.department,
        exam_date: subject.exam_date
      },
      total_students: students.length,
      allotted_seats: allottedCount,
      rooms_used: rooms.length,
      allocations: allocations.slice(0, 10) // Preview first 10
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seat allotment error:', error);
    res.status(500).json({ error: 'Failed to allot seats' });
  } finally {
    client.release();
  }
});

// Create manual seat allotment
router.post('/allotments', authMiddleware(['admin']), async (req, res) => {
  try {
    const { student_id, room_id, seat_number } = req.body;

    if (!student_id || !room_id || !seat_number) {
      return res.status(400).json({ error: 'Student ID, room ID, and seat number are required' });
    }

    // Check if student exists
    const studentCheck = await pool.query('SELECT id FROM students WHERE id = $1', [student_id]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student already has an allotment
    const existingAllotment = await pool.query(
      'SELECT * FROM seat_allotments WHERE student_id = $1',
      [student_id]
    );

    if (existingAllotment.rows.length > 0) {
      return res.status(400).json({ error: 'Student already has a seat allotment. Please delete the existing one first.' });
    }

    // Check if the seat is already occupied
    const seatCheck = await pool.query(
      'SELECT * FROM seat_allotments WHERE room_id = $1 AND seat_number = $2',
      [room_id, seat_number]
    );

    if (seatCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This seat is already occupied' });
    }

    // Check if seat number exceeds room capacity
    const roomResult = await pool.query(
      'SELECT capacity FROM rooms WHERE id = $1',
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (parseInt(seat_number) > parseInt(roomResult.rows[0].capacity)) {
      return res.status(400).json({ 
        error: `Seat number exceeds room capacity (${roomResult.rows[0].capacity})` 
      });
    }

    // Insert allotment
    const result = await pool.query(
      `INSERT INTO seat_allotments (student_id, room_id, seat_number)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [student_id, room_id, seat_number]
    );

    res.json({
      message: 'Seat allotted successfully',
      allotment: result.rows[0]
    });

  } catch (error) {
    console.error('Manual allotment error:', error);
    res.status(500).json({ error: 'Failed to create seat allotment' });
  }
});

// Get all seat allotments
router.get('/allotments', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sa.id,
        sa.student_id,
        sa.room_id,
        sa.seat_number,
        sa.subject_id,
        sub.subject_code,
        sub.subject_name,
        sub.exam_date,
        s.name as student_name,
        s.roll_no,
        s.department,
        r.room_no,
        r.floor,
        sa.allotment_date
      FROM seat_allotments sa
      JOIN students s ON sa.student_id = s.id
      JOIN rooms r ON sa.room_id = r.id
      LEFT JOIN subjects sub ON sa.subject_id = sub.id
      ORDER BY sub.exam_date NULLS LAST, r.room_no, sa.seat_number
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get allotments error:', error);
    res.status(500).json({ error: 'Failed to fetch seat allotments' });
  }
});

// Get seat allotment for a specific student (student endpoint)
router.get('/my-seat', authMiddleware(['student']), async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const result = await pool.query(`
      SELECT 
        s.name as student_name,
        s.roll_no,
        s.department,
        s.academic_year,
        r.room_no,
        r.floor,
        sa.seat_number,
        sa.allotment_date
      FROM seat_allotments sa
      JOIN students s ON sa.student_id = s.id
      JOIN rooms r ON sa.room_id = r.id
      WHERE sa.student_id = $1
    `, [studentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No seat allotted yet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get student seat error:', error);
    res.status(500).json({ error: 'Failed to fetch seat information' });
  }
});

// Update seat allotment manually
router.put('/allotments/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, seat_number } = req.body;

    if (!room_id || !seat_number) {
      return res.status(400).json({ error: 'Room ID and seat number are required' });
    }

    // Check if the seat is already occupied
    const checkResult = await pool.query(
      'SELECT * FROM seat_allotments WHERE room_id = $1 AND seat_number = $2 AND id != $3',
      [room_id, seat_number, id]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'This seat is already occupied' });
    }

    // Check if seat number exceeds room capacity
    const roomResult = await pool.query(
      'SELECT capacity FROM rooms WHERE id = $1',
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (seat_number > roomResult.rows[0].capacity) {
      return res.status(400).json({ 
        error: 'Seat number exceeds room capacity',
        capacity: roomResult.rows[0].capacity
      });
    }

    // Update the allotment
    const result = await pool.query(
      `UPDATE seat_allotments 
       SET room_id = $1, seat_number = $2 
       WHERE id = $3 
       RETURNING *`,
      [room_id, seat_number, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Allotment not found' });
    }

    res.json({
      message: 'Seat allotment updated successfully',
      allotment: result.rows[0]
    });
  } catch (error) {
    console.error('Update allotment error:', error);
    res.status(500).json({ error: 'Failed to update seat allotment' });
  }
});

// Delete seat allotment
router.delete('/allotments/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM seat_allotments WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Allotment not found' });
    }

    res.json({ message: 'Seat allotment deleted successfully' });
  } catch (error) {
    console.error('Delete allotment error:', error);
    res.status(500).json({ error: 'Failed to delete seat allotment' });
  }
});

// Get allotment statistics
router.get('/statistics', authMiddleware(['admin']), async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT sa.student_id) as allotted_students,
        COUNT(DISTINCT sa.room_id) as rooms_used,
        (SELECT COUNT(*) FROM students) as total_students,
        (SELECT COUNT(*) FROM rooms) as total_rooms,
        (SELECT SUM(capacity) FROM rooms) as total_capacity
      FROM seat_allotments sa
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
