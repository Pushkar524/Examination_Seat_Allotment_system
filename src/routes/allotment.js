const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Trigger seat allotment process
router.post('/allot', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Clear existing allotments
    await client.query('DELETE FROM seat_allotments');

    // Get all students ordered by roll number
    const studentsResult = await client.query(
      'SELECT id, roll_no FROM students ORDER BY roll_no'
    );
    const students = studentsResult.rows;

    if (students.length === 0) {
      return res.status(400).json({ error: 'No students found to allot seats' });
    }

    // Get all rooms ordered by room number
    const roomsResult = await client.query(
      'SELECT id, room_no, capacity FROM rooms ORDER BY room_no'
    );
    const rooms = roomsResult.rows;

    if (rooms.length === 0) {
      return res.status(400).json({ error: 'No rooms found for seat allotment' });
    }

    // Calculate total capacity
    const totalCapacity = rooms.reduce((sum, room) => sum + parseInt(room.capacity), 0);

    if (students.length > totalCapacity) {
      return res.status(400).json({ 
        error: 'Insufficient room capacity',
        studentsCount: students.length,
        totalCapacity
      });
    }

    // Allot seats
    let studentIndex = 0;
    let allottedCount = 0;

    for (const room of rooms) {
      for (let seatNumber = 1; seatNumber <= room.capacity && studentIndex < students.length; seatNumber++) {
        const student = students[studentIndex];
        
        await client.query(
          `INSERT INTO seat_allotments (student_id, room_id, seat_number)
           VALUES ($1, $2, $3)`,
          [student.id, room.id, seatNumber]
        );

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
      totalStudents: students.length,
      allottedSeats: allottedCount,
      roomsUsed: Math.ceil(allottedCount / (totalCapacity / rooms.length))
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seat allotment error:', error);
    res.status(500).json({ error: 'Failed to allot seats' });
  } finally {
    client.release();
  }
});

// Get all seat allotments
router.get('/allotments', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sa.id,
        s.name as student_name,
        s.roll_no,
        s.department,
        r.room_no,
        r.floor,
        sa.seat_number,
        sa.allotment_date
      FROM seat_allotments sa
      JOIN students s ON sa.student_id = s.id
      JOIN rooms r ON sa.room_id = r.id
      ORDER BY r.room_no, sa.seat_number
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
