const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// ALLOCATE SEATS FOR A SPECIFIC SUBJECT
// ============================================================================
router.post('/subject/:subjectId', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { subjectId } = req.params;
    const { room_ids } = req.body; // Array of room IDs to use

    if (!room_ids || !Array.isArray(room_ids) || room_ids.length === 0) {
      return res.status(400).json({ error: 'room_ids array is required' });
    }

    await client.query('BEGIN');

    // Step 1: Get subject details
    const subjectResult = await client.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subjectResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subject = subjectResult.rows[0];

    // Step 2: Check if allocations already exist for this subject
    const existingCheck = await client.query(
      'SELECT COUNT(*) as count FROM seat_allotments WHERE subject_id = $1',
      [subjectId]
    );

    if (parseInt(existingCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: `Seat allocations already exist for subject '${subject.subject_code}'`,
        existing_allocations: parseInt(existingCheck.rows[0].count),
        suggestion: 'Delete existing allocations first or use a different endpoint to update'
      });
    }

    // Step 3: Get all students from this subject's department
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

    // Step 5: Calculate total capacity
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

    // Step 6: Allocate seats (same deterministic logic as original)
    let studentIndex = 0;
    let allottedCount = 0;
    const allocations = [];

    for (const room of rooms) {
      for (let seatNumber = 1; seatNumber <= room.capacity && studentIndex < students.length; seatNumber++) {
        const student = students[studentIndex];
        
        await client.query(
          `INSERT INTO seat_allotments (student_id, room_id, seat_number, subject_id)
           VALUES ($1, $2, $3, $4)`,
          [student.id, room.id, seatNumber, subjectId]
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
        exam_date: subject.exam_date,
        start_time: subject.start_time,
        end_time: subject.end_time
      },
      total_students: students.length,
      allotted_seats: allottedCount,
      rooms_used: rooms.length,
      allocations: allocations.slice(0, 10) // Show first 10 for preview
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seat allotment error:', error);
    res.status(500).json({ error: 'Failed to complete seat allotment' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET ALLOCATIONS FOR A SPECIFIC SUBJECT
// ============================================================================
router.get('/subject/:subjectId', authMiddleware(['admin', 'staff']), async (req, res) => {
  try {
    const { subjectId } = req.params;

    // Get subject details
    const subjectResult = await pool.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subjectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subject = subjectResult.rows[0];

    // Get allocations with student and room details
    const allocationsResult = await pool.query(
      `SELECT 
        sa.id,
        sa.seat_number,
        s.id as student_id,
        s.roll_no,
        s.name as student_name,
        s.department,
        r.id as room_id,
        r.room_no,
        r.capacity as room_capacity
       FROM seat_allotments sa
       JOIN students s ON sa.student_id = s.id
       JOIN rooms r ON sa.room_id = r.id
       WHERE sa.subject_id = $1
       ORDER BY r.room_no, sa.seat_number`,
      [subjectId]
    );

    // Group by room
    const roomGroups = {};
    allocationsResult.rows.forEach(alloc => {
      if (!roomGroups[alloc.room_no]) {
        roomGroups[alloc.room_no] = {
          room_id: alloc.room_id,
          room_no: alloc.room_no,
          capacity: alloc.room_capacity,
          students: []
        };
      }
      roomGroups[alloc.room_no].students.push({
        seat_number: alloc.seat_number,
        roll_no: alloc.roll_no,
        name: alloc.student_name
      });
    });

    res.json({
      subject: {
        subject_code: subject.subject_code,
        subject_name: subject.subject_name,
        department: subject.department,
        exam_date: subject.exam_date,
        start_time: subject.start_time,
        end_time: subject.end_time
      },
      total_allocations: allocationsResult.rows.length,
      rooms: Object.values(roomGroups)
    });

  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

// ============================================================================
// DELETE ALLOCATIONS FOR A SPECIFIC SUBJECT
// ============================================================================
router.delete('/subject/:subjectId', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { subjectId } = req.params;

    await client.query('BEGIN');

    // Check if subject exists
    const subjectResult = await client.query(
      'SELECT subject_code FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subjectResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Delete allocations
    const deleteResult = await client.query(
      'DELETE FROM seat_allotments WHERE subject_id = $1',
      [subjectId]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Seat allocations deleted successfully',
      subject_code: subjectResult.rows[0].subject_code,
      deleted_count: deleteResult.rowCount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting allocations:', error);
    res.status(500).json({ error: 'Failed to delete allocations' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET STUDENT'S EXAM SCHEDULE (All subjects with seat assignments)
// ============================================================================
router.get('/student/:studentId/schedule', authMiddleware(['admin', 'staff', 'student']), async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `SELECT 
        sub.subject_code,
        sub.subject_name,
        sub.exam_date,
        sub.start_time,
        sub.end_time,
        r.room_no,
        sa.seat_number,
        s.roll_no,
        s.name as student_name
       FROM seat_allotments sa
       JOIN students s ON sa.student_id = s.id
       JOIN subjects sub ON sa.subject_id = sub.id
       JOIN rooms r ON sa.room_id = r.id
       WHERE sa.student_id = $1
       ORDER BY sub.exam_date, sub.start_time`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No exam schedule found for this student' 
      });
    }

    res.json({
      student: {
        roll_no: result.rows[0].roll_no,
        name: result.rows[0].student_name
      },
      total_exams: result.rows.length,
      schedule: result.rows.map(row => ({
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        exam_date: row.exam_date,
        start_time: row.start_time,
        end_time: row.end_time,
        room_no: row.room_no,
        seat_number: row.seat_number
      }))
    });

  } catch (error) {
    console.error('Error fetching student schedule:', error);
    res.status(500).json({ error: 'Failed to fetch student schedule' });
  }
});

// ============================================================================
// GET ALL ALLOCATIONS (with optional filters)
// ============================================================================
router.get('/', authMiddleware(['admin', 'staff']), async (req, res) => {
  try {
    const { subject_id, room_id, department } = req.query;

    let query = `
      SELECT 
        sa.id,
        sa.seat_number,
        s.roll_no,
        s.name as student_name,
        s.department,
        r.room_no,
        sub.subject_code,
        sub.subject_name,
        sub.exam_date
      FROM seat_allotments sa
      JOIN students s ON sa.student_id = s.id
      JOIN rooms r ON sa.room_id = r.id
      JOIN subjects sub ON sa.subject_id = sub.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (subject_id) {
      query += ` AND sa.subject_id = $${paramIndex}`;
      params.push(subject_id);
      paramIndex++;
    }

    if (room_id) {
      query += ` AND sa.room_id = $${paramIndex}`;
      params.push(room_id);
      paramIndex++;
    }

    if (department) {
      query += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    query += ` ORDER BY sub.exam_date, r.room_no, sa.seat_number`;

    const result = await pool.query(query, params);

    res.json({
      total: result.rows.length,
      allocations: result.rows
    });

  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

module.exports = router;
