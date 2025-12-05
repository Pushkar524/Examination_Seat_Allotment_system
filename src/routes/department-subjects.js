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
      // Pattern 1: Group students by subject
      const studentsBySubject = {};
      studentsToAllot.forEach(student => {
        if (!studentsBySubject[student.subject_id]) {
          studentsBySubject[student.subject_id] = [];
        }
        studentsBySubject[student.subject_id].push(student);
      });
      
      const subjectKeys = Object.keys(studentsBySubject);
      
      // Store organized by subject for column-based allocation
      orderedStudents = { bySubject: studentsBySubject, subjectKeys };
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
    
    // Get total students to allocate (handling pattern1 structure)
    const totalStudentsToAllocate = pattern === 'pattern1' 
      ? Object.values(orderedStudents.bySubject).reduce((sum, arr) => sum + arr.length, 0)
      : orderedStudents.length;
    
    if (totalStudentsToAllocate > totalSeats) {
      await client.query('ROLLBACK');
      const shortage = totalStudentsToAllocate - totalSeats;
      const roomsNeeded = Math.ceil(shortage / (rooms[0]?.capacity || 30));
      return res.status(400).json({ 
        error: `Insufficient classroom capacity`,
        details: {
          totalStudents: totalStudentsToAllocate,
          availableSeats: totalSeats,
          shortageOfSeats: shortage,
          additionalRoomsNeeded: roomsNeeded,
          message: `Need ${shortage} more seats. Please add approximately ${roomsNeeded} more room(s) or select additional rooms for this exam.`
        }
      });
    }
    
    // Allocate seats based on pattern
    let allocatedCount = 0;
    const unallocatedStudents = [];
    
    if (pattern === 'pattern1') {
      // Pattern 1: Optimal column allocation with smart buffer usage
      const studentsBySubject = orderedStudents.bySubject;
      const subjectKeys = orderedStudents.subjectKeys;
      
      for (const room of rooms) {
        const numBenches = room.number_of_benches || 10;
        const seatsPerBench = room.seats_per_bench || 4;
        
        // Track which subject is in each column
        const columnSubjects = new Array(seatsPerBench).fill(null);
        let currentSubjectIndex = 0;
        
        for (let col = 0; col < seatsPerBench; col++) {
          // Find a subject that can be placed in this column
          let placed = false;
          let attempts = 0;
          
          while (!placed && attempts < subjectKeys.length) {
            const subjectId = subjectKeys[currentSubjectIndex % subjectKeys.length];
            const studentsForThisSubject = studentsBySubject[subjectId];
            
            if (!studentsForThisSubject || studentsForThisSubject.length === 0) {
              currentSubjectIndex++;
              attempts++;
              continue;
            }
            
            // Check if this subject is different from adjacent columns
            const leftSubject = col > 0 ? columnSubjects[col - 1] : null;
            const rightSubject = col < seatsPerBench - 1 ? columnSubjects[col + 1] : null;
            
            const isDifferentFromLeft = !leftSubject || leftSubject !== subjectId;
            const isDifferentFromRight = !rightSubject || rightSubject !== subjectId;
            
            if (isDifferentFromLeft && isDifferentFromRight) {
              // Safe to place this subject here
              for (let bench = 0; bench < numBenches && studentsForThisSubject.length > 0; bench++) {
                const seatNumber = col * numBenches + bench + 1;
                if (seatNumber > room.capacity) break;
                
                const student = studentsForThisSubject.shift();
                
                await client.query(`
                  INSERT INTO seat_allotments (student_id, room_id, seat_number, exam_id, subject_id, allotment_pattern)
                  VALUES ($1, $2, $3, $4, $5, $6)
                `, [student.id, room.id, seatNumber, examId, student.subject_id, pattern]);
                
                allocatedCount++;
              }
              
              columnSubjects[col] = subjectId;
              placed = true;
              currentSubjectIndex++;
            } else {
              // Try next subject
              currentSubjectIndex++;
              attempts++;
            }
          }
          
          // If no subject could be placed, leave empty and continue
          if (!placed) {
            columnSubjects[col] = null; // Empty column
          }
        }
        
        // Check if all students are allocated
        const allAllocated = subjectKeys.every(key => studentsBySubject[key].length === 0);
        if (allAllocated) break;
      }
      
      // Collect unallocated students
      for (const subjectId of subjectKeys) {
        if (studentsBySubject[subjectId].length > 0) {
          unallocatedStudents.push(...studentsBySubject[subjectId]);
        }
      }
    } else {
      // Pattern 2: Sequential allocation
      let currentRoomIndex = 0;
      let currentSeatNumber = 1;
      
      for (const student of orderedStudents) {
        if (currentRoomIndex >= rooms.length) {
          unallocatedStudents.push(student);
          continue;
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
    
    // Check if there are unallocated students
    if (unallocatedStudents.length > 0) {
      await client.query('ROLLBACK');
      const roomsNeeded = Math.ceil(unallocatedStudents.length / (rooms[0]?.capacity || 30));
      return res.status(400).json({
        error: 'Insufficient classroom capacity - allocation incomplete',
        details: {
          totalStudents: totalStudentsToAllocate,
          studentsAllocated: allocatedCount,
          studentsUnallocated: unallocatedStudents.length,
          availableSeats: totalSeats,
          additionalRoomsNeeded: roomsNeeded,
          message: `${unallocatedStudents.length} students could not be allocated seats. Please add approximately ${roomsNeeded} more room(s) or select additional rooms for this exam.`,
          unallocatedStudentsList: unallocatedStudents.map(s => ({
            rollNo: s.roll_no,
            department: s.department
          })).slice(0, 10) // Show first 10 unallocated students
        }
      });
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Seat allotment completed successfully',
      pattern,
      allocatedCount,
      totalRooms: rooms.length,
      totalStudents: totalStudentsToAllocate,
      utilizationPercentage: Math.round((allocatedCount / totalSeats) * 100)
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
