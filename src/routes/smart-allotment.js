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
 * Advanced Smart Seat Allotment
 * Accepts explicit subjects and department->subject mapping and applies
 * four defined seating patterns:
 *  - 2 subjects, 2 per bench, criss-cross (zigzag)
 *  - 2 subjects, 2 per bench, sequential (fill one subject then next)
 *  - 2 subjects, 3 per bench (balanced alternating: S1,S2,S1 / S2,S1,S2)
 *  - 3 subjects, 3 per bench rotational (bench offset rotation)
 */
router.post('/advanced', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      subjects = [],                // ["SubjA","SubjB"] or ["SubjA","SubjB","SubjC"]
      departmentSubjects = {},      // { DepartmentName: SubjectName }
      students_per_bench = 2,       // 2 or 3
      pattern = 'criss-cross',      // 'criss-cross' | 'sequential' (only meaningful for 2-per-bench)
      room_ids = []
    } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'Subjects array required' });
    }
    if (![2,3].includes(students_per_bench)) {
      return res.status(400).json({ error: 'students_per_bench must be 2 or 3' });
    }
    if (students_per_bench === 2 && subjects.length > 2) {
      return res.status(400).json({ error: 'For 2 per bench, only 2 subjects supported' });
    }
    if (students_per_bench === 3 && subjects.length < 2) {
      return res.status(400).json({ error: 'For 3 per bench, need 2 or 3 subjects' });
    }
    if (students_per_bench === 3 && subjects.length === 2 && (pattern !== 'criss-cross')) {
      // pattern ignored for this case; just note
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM seat_allotments');
    await client.query('UPDATE invigilators SET room_id = NULL');

    // Fetch all students and assign subject via mapping
    const studentsResult = await client.query(`
      SELECT id, roll_no, name, department, academic_year
      FROM students
      ORDER BY department, roll_no
    `);
    const rawStudents = studentsResult.rows;

    // Attach subject from mapping
    const studentsWithSubject = rawStudents.map(s => ({
      ...s,
      subject: departmentSubjects[s.department] || null
    })).filter(s => s.subject && subjects.includes(s.subject));

    if (studentsWithSubject.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No students matched the provided subject mapping' });
    }

    // Build queues per subject
    const subjectQueues = {};
    subjects.forEach(subj => { subjectQueues[subj] = []; });
    studentsWithSubject.forEach(stu => { subjectQueues[stu.subject].push(stu); });

    // Sort each queue consistently (by roll_no then id)
    Object.keys(subjectQueues).forEach(subj => {
      subjectQueues[subj].sort((a,b) => {
        if (a.roll_no < b.roll_no) return -1;
        if (a.roll_no > b.roll_no) return 1;
        return a.id - b.id;
      });
    });

    // Retrieve rooms (optional subset)
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
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No configured rooms available' });
    }

    // Total capacity check (raw capacity)
    const totalCapacity = rooms.reduce((sum, r) => sum + parseInt(r.capacity), 0);
    if (studentsWithSubject.length > totalCapacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient capacity for selected subjects',
        studentsCount: studentsWithSubject.length,
        totalCapacity
      });
    }

    // Helper to generate seat subject sequence for a bench
    const generateBenchSequence = (benchIndex, seatsPerBench) => {
      // Cases
      if (students_per_bench === 2 && subjects.length === 2) {
        if (pattern === 'criss-cross') {
          return benchIndex % 2 === 0
            ? [subjects[0], subjects[1]]
            : [subjects[1], subjects[0]];
        }
        // Sequential: same subject fills bench; subject chosen by remaining queue sizes
        const firstAvailable = subjects.find(subj => subjectQueues[subj].length > 0) || subjects[0];
        return [firstAvailable, firstAvailable];
      }
      if (students_per_bench === 3 && subjects.length === 2) {
        // Alternating balanced pattern
        return benchIndex % 2 === 0
          ? [subjects[0], subjects[1], subjects[0]]
          : [subjects[1], subjects[0], subjects[1]];
      }
      if (students_per_bench === 3 && subjects.length === 3) {
        // Rotational tri-subject pattern
        const offset = benchIndex % 3;
        return [subjects[offset], subjects[(offset+1)%3], subjects[(offset+2)%3]];
      }
      // Fallback simplistic round-robin (should not normally hit)
      return Array.from({ length: seatsPerBench }).map((_,i) => subjects[(benchIndex + i) % subjects.length]);
    };

    let inserted = 0;
    let seatRecords = [];
    let roomIndex = 0;

    // Continue until all queues empty or rooms exhausted
    const remainingStudents = () => Object.values(subjectQueues).reduce((sum, q) => sum + q.length, 0);

    while (roomIndex < rooms.length && remainingStudents() > 0) {
      const room = rooms[roomIndex];
      const { number_of_benches, seats_per_bench } = room;
      let seatNumberBase = 0;
      for (let b = 0; b < number_of_benches && remainingStudents() > 0; b++) {
        const sequence = generateBenchSequence(b, seats_per_bench).slice(0, students_per_bench);
        for (let sIdx = 0; sIdx < sequence.length && remainingStudents() > 0; sIdx++) {
          const subj = sequence[sIdx];
          if (subjectQueues[subj].length === 0) continue; // skip if no student left for subject
          const student = subjectQueues[subj].shift();
          const seatNumber = seatNumberBase + sIdx + 1;
          await client.query(
            `INSERT INTO seat_allotments (student_id, room_id, seat_number, subject)
             VALUES ($1, $2, $3, $4)`,
            [student.id, room.id, seatNumber, subj]
          );
          inserted++;
        }
        seatNumberBase += seats_per_bench; // advance base by full bench width even if we used subset
      }
      roomIndex++;
    }

    // Assign invigilators to used rooms
    const usedRoomIds = rooms.slice(0, roomIndex).map(r => r.id);
    const invRes = await client.query(`
      SELECT id, name, invigilator_id FROM invigilators WHERE room_id IS NULL ORDER BY name
    `);
    const invigilators = invRes.rows;
    let assignedInvigilators = 0;
    for (let i = 0; i < usedRoomIds.length && i < invigilators.length; i++) {
      await client.query('UPDATE invigilators SET room_id = $1 WHERE id = $2', [usedRoomIds[i], invigilators[i].id]);
      assignedInvigilators++;
    }

    await client.query('COMMIT');

    // Build subject counts after allocation
    const subjectCounts = {};
    subjects.forEach(subj => subjectCounts[subj] = 0);
    studentsWithSubject.forEach(stu => { if (stu.subject) subjectCounts[stu.subject]++; });
    const remaining = remainingStudents();

    res.json({
      message: 'Advanced smart allotment completed',
      subjects,
      studentsPerBench: students_per_bench,
      patternApplied: pattern,
      totalStudentsMatched: studentsWithSubject.length,
      seatsInserted: inserted,
      roomsUsed: usedRoomIds.length,
      invigilatorsAssigned: assignedInvigilators,
      pendingUnseated: remaining,
      subjectCounts
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Advanced smart allotment error:', err);
    res.status(500).json({ error: 'Failed advanced smart allotment' });
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
        sa.subject,
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
