const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Smart Seat Allotment with Pattern-Based Seating
 * Implements zigzag/criss-cross patterns to prevent cheating
 * Segregates students by department/subject
 */
router.post('/smart-allot', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      segregate_by = 'department',  // 'department', 'academic_year', 'subject'
      students_per_bench = 2,        // 2 or 3
      pattern = 'criss-cross',       // 'criss-cross' or 'linear'
      room_ids = []                  // Optional: specific rooms
    } = req.body;

    await client.query('BEGIN');

    // Clear existing allotments
    await client.query('DELETE FROM seat_allotments');
    
    // Clear existing invigilator assignments
    await client.query('UPDATE invigilators SET room_id = NULL');

    // Get all students grouped by segregation criteria
    const studentsResult = await client.query(`
      SELECT id, roll_no, name, department, academic_year
      FROM students 
      ORDER BY ${segregate_by}, roll_no
    `);
    const allStudents = studentsResult.rows;

    if (allStudents.length === 0) {
      return res.status(400).json({ error: 'No students found to allot seats' });
    }

    // Group students by segregation criteria
    const studentGroups = {};
    allStudents.forEach(student => {
      const key = student[segregate_by];
      if (!studentGroups[key]) {
        studentGroups[key] = [];
      }
      studentGroups[key].push(student);
    });

    const groupKeys = Object.keys(studentGroups);
    console.log(`Segregated students into ${groupKeys.length} groups:`, groupKeys);

    // Get rooms with bench configuration
    let roomsQuery = `
      SELECT id, room_no, capacity, number_of_benches, seats_per_bench 
      FROM rooms 
      WHERE number_of_benches > 0 AND seats_per_bench > 0
    `;
    let roomsParams = [];
    
    if (room_ids && room_ids.length > 0) {
      roomsQuery += ' AND id = ANY($1::int[])';
      roomsParams = [room_ids];
    }
    
    roomsQuery += ' ORDER BY room_no';

    const roomsResult = await client.query(roomsQuery, roomsParams);
    const rooms = roomsResult.rows;

    if (rooms.length === 0) {
      return res.status(400).json({ 
        error: 'No rooms with bench configuration found. Please configure room layouts first.' 
      });
    }

    // Calculate total capacity
    const totalCapacity = rooms.reduce((sum, room) => sum + parseInt(room.capacity), 0);
    if (allStudents.length > totalCapacity) {
      return res.status(400).json({ 
        error: 'Insufficient room capacity',
        studentsCount: allStudents.length,
        totalCapacity
      });
    }

    // Perform pattern-based allocation
    let allottedCount = 0;
    let roomIndex = 0;
    let currentRoom = rooms[roomIndex];
    let benchIndex = 0;
    let seatInBench = 0;

    // Create allocation arrays for each group
    const groupIndices = {};
    groupKeys.forEach(key => {
      groupIndices[key] = 0;
    });

    // Allocate seats using the specified pattern
    while (roomIndex < rooms.length && allottedCount < allStudents.length) {
      currentRoom = rooms[roomIndex];
      const { number_of_benches, seats_per_bench } = currentRoom;

      // Process current room
      for (benchIndex = 0; benchIndex < number_of_benches; benchIndex++) {
        for (seatInBench = 0; seatInBench < seats_per_bench; seatInBench++) {
          // Skip if we've allocated specific number per bench
          if (students_per_bench === 2 && seatInBench >= 2) break;
          if (students_per_bench === 3 && seatInBench >= 3) break;

          // Calculate seat number
          const seatNumber = benchIndex * seats_per_bench + seatInBench + 1;

          // Determine which group to pick from based on pattern
          let groupKey;
          if (pattern === 'criss-cross') {
            // Special handling for 3 students per bench with 3 subjects
            if (students_per_bench === 3 && groupKeys.length === 3) {
              // Pattern 3: [S1,S2,S3] [S1,S2,S3] consistent across all benches
              groupKey = groupKeys[seatInBench % 3];
            } 
            // 2 students per bench with 2 subjects - Criss-cross zigzag
            else if (students_per_bench === 2 && groupKeys.length === 2) {
              // Pattern 1: Zigzag with crossing lines
              // Bench 0: S1, S2
              // Bench 1: S2, S1
              // Bench 2: S1, S2
              if (benchIndex % 2 === 0) {
                groupKey = groupKeys[seatInBench % 2]; // S1, S2
              } else {
                groupKey = groupKeys[(seatInBench + 1) % 2]; // S2, S1
              }
            }
            // Default criss-cross for other combinations
            else {
              groupKey = groupKeys[(benchIndex * seats_per_bench + seatInBench) % groupKeys.length];
            }
          } else {
            // Linear/Sequential pattern: fill with one group completely, then next (Pattern 2)
            let cumulativeCount = 0;
            for (const key of groupKeys) {
              cumulativeCount += studentGroups[key].length;
              if (allottedCount < cumulativeCount) {
                groupKey = key;
                break;
              }
            }
          }

          // Get student from the selected group
          const groupIndex = groupIndices[groupKey];
          const group = studentGroups[groupKey];

          if (groupIndex < group.length) {
            const student = group[groupIndex];
            
            // Insert allotment
            await client.query(
              `INSERT INTO seat_allotments (student_id, room_id, seat_number)
               VALUES ($1, $2, $3)`,
              [student.id, currentRoom.id, seatNumber]
            );

            groupIndices[groupKey]++;
            allottedCount++;

            // Check if all students are allocated
            if (allottedCount >= allStudents.length) break;
          }
        }
        if (allottedCount >= allStudents.length) break;
      }

      // Move to next room if needed
      if (allottedCount < allStudents.length) {
        roomIndex++;
      }
    }

    // Auto-assign invigilators to rooms with students
    const usedRoomIds = rooms.slice(0, roomIndex + 1).map(r => r.id);
    
    // Get available invigilators
    const availableInvigilatorsResult = await client.query(`
      SELECT id, name, invigilator_id 
      FROM invigilators 
      WHERE room_id IS NULL 
      ORDER BY name
    `);
    const availableInvigilators = availableInvigilatorsResult.rows;

    // Assign invigilators to rooms
    let assignedCount = 0;
    for (let i = 0; i < usedRoomIds.length && i < availableInvigilators.length; i++) {
      await client.query(
        'UPDATE invigilators SET room_id = $1 WHERE id = $2',
        [usedRoomIds[i], availableInvigilators[i].id]
      );
      assignedCount++;
    }

    await client.query('COMMIT');

    res.json({
      message: 'Smart seat allotment completed successfully',
      totalStudents: allStudents.length,
      allottedSeats: allottedCount,
      roomsUsed: roomIndex + 1,
      invigilatorsAssigned: assignedCount,
      vacantRooms: usedRoomIds.length - assignedCount,
      pattern: pattern,
      studentsPerBench: students_per_bench,
      segregatedBy: segregate_by,
      groups: groupKeys
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Smart allotment error:', error);
    res.status(500).json({ error: 'Failed to perform smart allotment' });
  } finally {
    client.release();
  }
});

/**
 * Get allotment statistics with invigilator warnings
 */
router.get('/allotment-report', authMiddleware(['admin']), async (req, res) => {
  try {
    // Get allotments with student and room details
    const allotmentsResult = await pool.query(`
      SELECT 
        sa.id,
        sa.seat_number,
        s.name as student_name,
        s.roll_no,
        s.department,
        s.academic_year,
        r.room_no,
        r.floor,
        i.name as invigilator_name,
        i.invigilator_id
      FROM seat_allotments sa
      JOIN students s ON sa.student_id = s.id
      JOIN rooms r ON sa.room_id = r.id
      LEFT JOIN invigilators i ON r.id = i.room_id
      ORDER BY r.room_no, sa.seat_number
    `);

    // Get rooms with missing invigilators
    const vacantRoomsResult = await pool.query(`
      SELECT DISTINCT r.id, r.room_no, r.floor
      FROM seat_allotments sa
      JOIN rooms r ON sa.room_id = r.id
      LEFT JOIN invigilators i ON r.id = i.room_id
      WHERE i.id IS NULL
    `);

    // Get invigilator assignments
    const invigilatorsResult = await pool.query(`
      SELECT 
        i.name as invigilator_name,
        i.invigilator_id,
        r.room_no,
        r.floor,
        COUNT(sa.id) as students_count
      FROM invigilators i
      LEFT JOIN rooms r ON i.room_id = r.id
      LEFT JOIN seat_allotments sa ON r.id = sa.room_id
      WHERE r.id IS NOT NULL
      GROUP BY i.id, i.name, i.invigilator_id, r.room_no, r.floor
      ORDER BY r.room_no
    `);

    res.json({
      allotments: allotmentsResult.rows,
      vacantRooms: vacantRoomsResult.rows,
      invigilatorAssignments: invigilatorsResult.rows
    });

  } catch (error) {
    console.error('Allotment report error:', error);
    res.status(500).json({ error: 'Failed to generate allotment report' });
  }
});

module.exports = router;
