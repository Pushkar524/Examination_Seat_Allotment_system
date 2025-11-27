const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get department-subject mappings for an exam
router.get('/exams/:examId/department-subjects', authMiddleware(['admin']), async (req, res) => {
  try {
    const { examId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ds.id,
        ds.exam_id,
        ds.department,
        ds.subject_id,
        es.subject_name,
        es.subject_code
      FROM department_subjects ds
      JOIN exam_subjects es ON ds.subject_id = es.id
      WHERE ds.exam_id = $1
      ORDER BY ds.department, es.subject_name
    `, [examId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching department-subjects:', error);
    res.status(500).json({ error: 'Failed to fetch department-subject mappings' });
  }
});

// Add department-subject mapping
router.post('/exams/:examId/department-subjects', authMiddleware(['admin']), async (req, res) => {
  try {
    const { examId } = req.params;
    const { department, subject_id } = req.body;
    
    if (!department || !subject_id) {
      return res.status(400).json({ error: 'Department and subject_id are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO department_subjects (exam_id, department, subject_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (exam_id, department, subject_id) DO NOTHING
      RETURNING *
    `, [examId, department, subject_id]);
    
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'This mapping already exists' });
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating department-subject mapping:', error);
    res.status(500).json({ error: 'Failed to create mapping' });
  }
});

// Bulk add department-subject mappings
router.post('/exams/:examId/department-subjects/bulk', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { examId } = req.params;
    const { mappings } = req.body; // Array of {department, subject_id}
    
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ error: 'Mappings array is required' });
    }
    
    await client.query('BEGIN');
    
    // Clear existing mappings for this exam
    await client.query('DELETE FROM department_subjects WHERE exam_id = $1', [examId]);
    
    // Insert new mappings
    for (const mapping of mappings) {
      await client.query(`
        INSERT INTO department_subjects (exam_id, department, subject_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (exam_id, department, subject_id) DO NOTHING
      `, [examId, mapping.department, mapping.subject_id]);
    }
    
    await client.query('COMMIT');
    
    res.json({ message: 'Department-subject mappings updated successfully', count: mappings.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk creating mappings:', error);
    res.status(500).json({ error: 'Failed to create mappings' });
  } finally {
    client.release();
  }
});

// Delete department-subject mapping
router.delete('/department-subjects/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM department_subjects WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

// Get all departments that have students
router.get('/departments', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT department 
      FROM students 
      ORDER BY department
    `);
    
    res.json(result.rows.map(r => r.department));
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Perform seat allotment with pattern
router.post('/exams/:examId/allot-seats', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { examId } = req.params;
    const { pattern, room_ids } = req.body; // pattern: 'pattern1' or 'pattern2'
    
    if (!pattern || !['pattern1', 'pattern2'].includes(pattern)) {
      return res.status(400).json({ error: 'Valid pattern (pattern1 or pattern2) is required' });
    }
    
    await client.query('BEGIN');
    
    // Get department-subject mappings for this exam
    const mappingsResult = await client.query(`
      SELECT ds.*, es.subject_name
      FROM department_subjects ds
      JOIN exam_subjects es ON ds.subject_id = es.id
      WHERE ds.exam_id = $1
    `, [examId]);
    
    if (mappingsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No department-subject mappings found. Please configure subjects for departments first.' });
    }
    
    // Group mappings by department
    const departmentSubjects = {};
    for (const mapping of mappingsResult.rows) {
      if (!departmentSubjects[mapping.department]) {
        departmentSubjects[mapping.department] = [];
      }
      departmentSubjects[mapping.department].push({
        subject_id: mapping.subject_id,
        subject_name: mapping.subject_name
      });
    }
    
    // Delete existing allotments for this exam
    await client.query('DELETE FROM seat_allotments WHERE exam_id = $1', [examId]);
    
    // Get available rooms
    let roomsQuery = 'SELECT * FROM rooms ORDER BY room_no';
    let roomsParams = [];
    
    if (room_ids && Array.isArray(room_ids) && room_ids.length > 0) {
      roomsQuery = 'SELECT * FROM rooms WHERE id = ANY($1) ORDER BY room_no';
      roomsParams = [room_ids];
    }
    
    const roomsResult = await client.query(roomsQuery, roomsParams);
    const rooms = roomsResult.rows;
    
    if (rooms.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No rooms available' });
    }
    
    // Get all students grouped by department, excluding those already allocated for this exam
    const studentsResult = await client.query(`
      SELECT s.id, s.roll_no, s.department
      FROM students s
      WHERE NOT EXISTS (
        SELECT 1 FROM seat_allotments sa 
        WHERE sa.student_id = s.id AND sa.exam_id = $1
      )
      ORDER BY s.department, s.roll_no
    `, [examId]);
    
    // Group students by department
    const studentsByDept = {};
    for (const student of studentsResult.rows) {
      if (!studentsByDept[student.department]) {
        studentsByDept[student.department] = [];
      }
      studentsByDept[student.department].push(student);
    }
    
    // Filter students who have subject mappings
    const studentsToAllot = [];
    for (const [dept, students] of Object.entries(studentsByDept)) {
      if (departmentSubjects[dept]) {
        // Each student gets the first subject assigned to their department
        const firstSubject = departmentSubjects[dept][0];
        students.forEach(student => {
          studentsToAllot.push({
            ...student,
            subject_id: firstSubject.subject_id
          });
        });
      }
    }
    
    if (studentsToAllot.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No students found for the mapped departments' });
    }
    
    // Apply pattern
    let orderedStudents = [];
    
    if (pattern === 'pattern1') {
      // Pattern 1: Alternate by column to avoid same subjects sitting together
      // Group students by subject
      const studentsBySubject = {};
      studentsToAllot.forEach(student => {
        if (!studentsBySubject[student.subject_id]) {
          studentsBySubject[student.subject_id] = [];
        }
        studentsBySubject[student.subject_id].push(student);
      });
      
      const subjectKeys = Object.keys(studentsBySubject);
      
      if (subjectKeys.length === 1) {
        // Only one subject, allocate sequentially
        orderedStudents = studentsToAllot;
      } else {
        // Multiple subjects: alternate by column (even/odd seats)
        // Allocate first subject to even seats (0, 2, 4...), second to odd (1, 3, 5...)
        const maxLength = Math.max(...Object.values(studentsBySubject).map(arr => arr.length));
        
        for (let i = 0; i < maxLength; i++) {
          for (const subjectId of subjectKeys) {
            if (studentsBySubject[subjectId][i]) {
              orderedStudents.push(studentsBySubject[subjectId][i]);
            }
          }
        }
      }
    } else if (pattern === 'pattern2') {
      // Pattern 2: Alternate departments (mix students from different departments)
      const deptArrays = {};
      studentsToAllot.forEach(student => {
        if (!deptArrays[student.department]) {
          deptArrays[student.department] = [];
        }
        deptArrays[student.department].push(student);
      });
      
      const deptKeys = Object.keys(deptArrays);
      let maxLength = Math.max(...Object.values(deptArrays).map(arr => arr.length));
      
      for (let i = 0; i < maxLength; i++) {
        for (const dept of deptKeys) {
          if (deptArrays[dept][i]) {
            orderedStudents.push(deptArrays[dept][i]);
          }
        }
      }
    }
    
    // Calculate total available seats
    const totalSeats = rooms.reduce((sum, room) => sum + room.capacity, 0);
    
    if (orderedStudents.length > totalSeats) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Not enough seats: ${orderedStudents.length} students need ${orderedStudents.length} seats, but only ${totalSeats} available` 
      });
    }
    
    // Allocate seats based on pattern
    let allocatedCount = 0;
    
    if (pattern === 'pattern1') {
      // Pattern 1: Alternate allocation by subject within each room
      // Group students by subject for alternating allocation
      const studentsBySubject = {};
      orderedStudents.forEach(student => {
        if (!studentsBySubject[student.subject_id]) {
          studentsBySubject[student.subject_id] = [];
        }
        studentsBySubject[student.subject_id].push(student);
      });
      
      const subjectIds = Object.keys(studentsBySubject);
      
      for (const room of rooms) {
        const seatsInRoom = [];
        
        // For each subject, allocate to specific seat positions
        subjectIds.forEach((subjectId, index) => {
          const students = studentsBySubject[subjectId];
          
          while (students.length > 0 && seatsInRoom.length < room.capacity) {
            const student = students.shift();
            
            // Find next available seat for this subject's pattern
            let seatNumber = (index % 2 === 0) ? 1 : 2; // Start at 1 for first subject, 2 for second
            
            while (seatsInRoom.some(s => s.seatNumber === seatNumber)) {
              seatNumber += 2; // Increment by 2 to maintain even/odd pattern
            }
            
            if (seatNumber <= room.capacity) {
              seatsInRoom.push({ student, seatNumber });
            } else {
              // Room full, put student back
              students.unshift(student);
              break;
            }
          }
        });
        
        // Insert allocations for this room
        for (const { student, seatNumber } of seatsInRoom.sort((a, b) => a.seatNumber - b.seatNumber)) {
          await client.query(`
            INSERT INTO seat_allotments (student_id, room_id, seat_number, exam_id, subject_id, allotment_pattern)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [student.id, room.id, seatNumber, examId, student.subject_id, pattern]);
          
          allocatedCount++;
        }
        
        // Check if all students allocated
        const remainingStudents = subjectIds.reduce((sum, id) => sum + studentsBySubject[id].length, 0);
        if (remainingStudents === 0) break;
      }
    } else {
      // Pattern 2: Sequential allocation
      let currentRoomIndex = 0;
      let currentSeatNumber = 1;
      
      for (const student of orderedStudents) {
        if (currentRoomIndex >= rooms.length) {
          break; // No more rooms available
        }
        
        const room = rooms[currentRoomIndex];
        
        // Insert allotment
        await client.query(`
          INSERT INTO seat_allotments (student_id, room_id, seat_number, exam_id, subject_id, allotment_pattern)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [student.id, room.id, currentSeatNumber, examId, student.subject_id, pattern]);
        
        allocatedCount++;
        currentSeatNumber++;
        
        // Move to next room if current room is full
        if (currentSeatNumber > room.capacity) {
          currentRoomIndex++;
          currentSeatNumber = 1;
        }
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Seat allotment completed successfully',
      pattern,
      allocatedCount,
      totalRooms: rooms.length
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during seat allotment:', error);
    res.status(500).json({ error: 'Failed to perform seat allotment' });
  } finally {
    client.release();
  }
});

module.exports = router;
