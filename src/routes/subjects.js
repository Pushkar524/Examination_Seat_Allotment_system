const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// CREATE NEW SUBJECT
// ============================================================================
router.post('/', authMiddleware(['admin']), async (req, res) => {
  try {
    const { subject_code, subject_name, department, exam_date, start_time, end_time } = req.body;

    // Validation
    if (!subject_code || !subject_name || !department || !exam_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: subject_code, subject_name, department, exam_date' 
      });
    }

    // Validate time logic
    if (start_time && end_time && start_time >= end_time) {
      return res.status(400).json({ error: 'start_time must be before end_time' });
    }

    // Check for duplicate subject_code
    const existingCheck = await pool.query(
      'SELECT id FROM subjects WHERE subject_code = $1',
      [subject_code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: `Subject with code '${subject_code}' already exists` 
      });
    }

    // Insert new subject
    const result = await pool.query(
      `INSERT INTO subjects (subject_code, subject_name, department, exam_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [subject_code, subject_name, department, exam_date, start_time, end_time]
    );

    res.status(201).json({
      message: 'Subject created successfully',
      subject: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// ============================================================================
// GET ALL SUBJECTS
// ============================================================================
router.get('/', authMiddleware(['admin', 'staff']), async (req, res) => {
  try {
    const { department, exam_date, sort_by = 'exam_date' } = req.query;

    let query = 'SELECT * FROM subjects WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Filter by department
    if (department) {
      query += ` AND department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    // Filter by exam_date
    if (exam_date) {
      query += ` AND exam_date = $${paramIndex}`;
      params.push(exam_date);
      paramIndex++;
    }

    // Sorting
    const validSortFields = ['exam_date', 'subject_code', 'department', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'exam_date';
    query += ` ORDER BY ${sortField}, start_time NULLS LAST, subject_code`;

    const result = await pool.query(query, params);

    res.json({
      total: result.rows.length,
      subjects: result.rows
    });

  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// ============================================================================
// GET SINGLE SUBJECT BY ID
// ============================================================================
router.get('/:id', authMiddleware(['admin', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        s.*,
        COUNT(DISTINCT sa.student_id) as students_allocated,
        COUNT(DISTINCT sa.room_id) as rooms_used
       FROM subjects s
       LEFT JOIN seat_allotments sa ON s.id = sa.subject_id
       WHERE s.id = $1
       GROUP BY s.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
});

// ============================================================================
// UPDATE SUBJECT
// ============================================================================
router.put('/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_code, subject_name, department, exam_date, start_time, end_time } = req.body;

    // Check if subject exists
    const existing = await pool.query('SELECT id FROM subjects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Validate time logic
    if (start_time && end_time && start_time >= end_time) {
      return res.status(400).json({ error: 'start_time must be before end_time' });
    }

    // Check for duplicate subject_code (excluding current subject)
    if (subject_code) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM subjects WHERE subject_code = $1 AND id != $2',
        [subject_code, id]
      );
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ 
          error: `Subject with code '${subject_code}' already exists` 
        });
      }
    }

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (subject_code !== undefined) {
      updates.push(`subject_code = $${paramIndex}`);
      values.push(subject_code);
      paramIndex++;
    }
    if (subject_name !== undefined) {
      updates.push(`subject_name = $${paramIndex}`);
      values.push(subject_name);
      paramIndex++;
    }
    if (department !== undefined) {
      updates.push(`department = $${paramIndex}`);
      values.push(department);
      paramIndex++;
    }
    if (exam_date !== undefined) {
      updates.push(`exam_date = $${paramIndex}`);
      values.push(exam_date);
      paramIndex++;
    }
    if (start_time !== undefined) {
      updates.push(`start_time = $${paramIndex}`);
      values.push(start_time);
      paramIndex++;
    }
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramIndex}`);
      values.push(end_time);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE subjects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, values);

    res.json({
      message: 'Subject updated successfully',
      subject: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// ============================================================================
// DELETE SUBJECT
// ============================================================================
router.delete('/:id', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if subject exists
    const subjectCheck = await client.query('SELECT subject_code FROM subjects WHERE id = $1', [id]);
    if (subjectCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if there are seat allocations
    const allocationsCheck = await client.query(
      'SELECT COUNT(*) as count FROM seat_allotments WHERE subject_id = $1',
      [id]
    );

    const allocationCount = parseInt(allocationsCheck.rows[0].count);

    if (allocationCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: `Cannot delete subject: ${allocationCount} seat allocations exist`,
        suggestion: 'Delete seat allocations first, or use force=true parameter'
      });
    }

    // Delete subject (CASCADE will handle dependent records)
    await client.query('DELETE FROM subjects WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ 
      message: 'Subject deleted successfully',
      subject_code: subjectCheck.rows[0].subject_code
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET SUBJECTS BY DEPARTMENT
// ============================================================================
router.get('/by-department/:department', authMiddleware(['admin', 'staff']), async (req, res) => {
  try {
    const { department } = req.params;

    const result = await pool.query(
      `SELECT * FROM subjects 
       WHERE department = $1 
       ORDER BY exam_date, start_time NULLS LAST, subject_code`,
      [department]
    );

    res.json({
      department,
      total: result.rows.length,
      subjects: result.rows
    });

  } catch (error) {
    console.error('Error fetching subjects by department:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// ============================================================================
// GET SUBJECT ALLOCATION SUMMARY
// ============================================================================
router.get('/:id/allocation-summary', authMiddleware(['admin', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        s.subject_code,
        s.subject_name,
        s.department,
        s.exam_date,
        s.start_time,
        s.end_time,
        COUNT(DISTINCT sa.student_id) as students_allocated,
        COUNT(DISTINCT sa.room_id) as rooms_used,
        COUNT(sa.id) as total_seats_allocated,
        json_agg(DISTINCT jsonb_build_object(
          'room_no', r.room_no,
          'capacity', r.capacity,
          'allocated', (
            SELECT COUNT(*) FROM seat_allotments sa2 
            WHERE sa2.room_id = r.id AND sa2.subject_id = s.id
          )
        )) FILTER (WHERE r.id IS NOT NULL) as rooms
       FROM subjects s
       LEFT JOIN seat_allotments sa ON s.id = sa.subject_id
       LEFT JOIN rooms r ON sa.room_id = r.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching allocation summary:', error);
    res.status(500).json({ error: 'Failed to fetch allocation summary' });
  }
});

module.exports = router;
