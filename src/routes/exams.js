const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Helper function to parse CSV or Excel file
const parseFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const ext = filePath.split('.').pop().toLowerCase();
    
    if (ext === 'csv') {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          fs.unlinkSync(filePath);
          resolve(results);
        })
        .on('error', reject);
    } else if (ext === 'xlsx' || ext === 'xls') {
      try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        fs.unlinkSync(filePath);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    } else {
      reject(new Error('Unsupported file format'));
    }
  });
};

// Get all exams
router.get('/exams', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
             json_agg(
               json_build_object(
                 'id', es.id,
                 'subject_name', es.subject_name,
                 'subject_code', es.subject_code,
                 'exam_date', es.exam_date,
                 'start_time', es.start_time,
                 'end_time', es.end_time
               )
             ) FILTER (WHERE es.id IS NOT NULL) as subjects
      FROM exams e
      LEFT JOIN exam_subjects es ON e.id = es.exam_id
      GROUP BY e.id
      ORDER BY e.exam_date DESC, e.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// Bulk delete all exams (MUST be before /exams/:id to avoid matching "all" as an ID)
router.delete('/exams/all', authMiddleware(['admin']), async (req, res) => {
  try {
    // Delete all exams (cascade will handle exam_subjects)
    const result = await pool.query('DELETE FROM exams RETURNING id');
    const deletedCount = result.rows.length;
    
    res.json({ message: `Successfully deleted ${deletedCount} exams`, count: deletedCount });
  } catch (error) {
    console.error('Error deleting all exams:', error);
    res.status(500).json({ error: 'Failed to delete all exams' });
  }
});

// Get single exam
router.get('/exams/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*, 
             json_agg(
               json_build_object(
                 'id', es.id,
                 'subject_name', es.subject_name,
                 'subject_code', es.subject_code,
                 'exam_date', es.exam_date,
                 'start_time', es.start_time,
                 'end_time', es.end_time
               )
             ) FILTER (WHERE es.id IS NOT NULL) as subjects
      FROM exams e
      LEFT JOIN exam_subjects es ON e.id = es.exam_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// Create exam
router.post('/exams', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { exam_name, exam_date, start_time, end_time, description, subjects } = req.body;

    if (!exam_name || !exam_date) {
      return res.status(400).json({ error: 'Exam name and date are required' });
    }

    await client.query('BEGIN');

    // Create exam
    const examResult = await client.query(
      `INSERT INTO exams (exam_name, exam_date, start_time, end_time, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [exam_name, exam_date, start_time || null, end_time || null, description || null]
    );

    const exam = examResult.rows[0];

    // Create exam subjects if provided
    if (subjects && Array.isArray(subjects) && subjects.length > 0) {
      for (const subject of subjects) {
        await client.query(
          `INSERT INTO exam_subjects (exam_id, subject_name, subject_code, exam_date, start_time, end_time)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            exam.id,
            subject.subject_name,
            subject.subject_code || null,
            subject.exam_date || exam_date,
            subject.start_time || null,
            subject.end_time || null
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch created exam with subjects
    const result = await pool.query(`
      SELECT e.*, 
             json_agg(
               json_build_object(
                 'id', es.id,
                 'subject_name', es.subject_name,
                 'subject_code', es.subject_code,
                 'exam_date', es.exam_date,
                 'start_time', es.start_time,
                 'end_time', es.end_time
               )
             ) FILTER (WHERE es.id IS NOT NULL) as subjects
      FROM exams e
      LEFT JOIN exam_subjects es ON e.id = es.exam_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [exam.id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  } finally {
    client.release();
  }
});

// Update exam
router.put('/exams/:id', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { exam_name, exam_date, start_time, end_time, description } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE exams 
       SET exam_name = $1, exam_date = $2, start_time = $3, end_time = $4, description = $5
       WHERE id = $6 RETURNING *`,
      [exam_name, exam_date, start_time || null, end_time || null, description || null, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Exam not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  } finally {
    client.release();
  }
});

// Delete exam
router.delete('/exams/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM exams WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

// Add subject to exam
router.post('/exams/:id/subjects', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_name, subject_code, exam_date, start_time, end_time } = req.body;

    if (!subject_name) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    // Get exam details for validation
    const examResult = await pool.query('SELECT exam_date, start_time, end_time FROM exams WHERE id = $1', [id]);
    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResult.rows[0];

    // Validate subject date is not before exam date
    if (exam_date) {
      const examDate = new Date(exam.exam_date);
      const subjectDate = new Date(exam_date);
      if (subjectDate < examDate) {
        return res.status(400).json({ error: 'Subject exam date cannot be before the exam date' });
      }
    }

    // Validate subject end time does not exceed exam end time (only if both are on same date and times are provided)
    if (exam_date && exam.exam_date && end_time && exam.end_time) {
      const examDate = new Date(exam.exam_date).toDateString();
      const subjectDate = new Date(exam_date).toDateString();
      
      if (examDate === subjectDate) {
        // Compare times only if on the same date
        const examEndMinutes = timeToMinutes(exam.end_time);
        const subjectEndMinutes = timeToMinutes(end_time);
        
        if (subjectEndMinutes > examEndMinutes) {
          return res.status(400).json({ error: 'Subject end time cannot exceed exam end time on the same date' });
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO exam_subjects (exam_id, subject_name, subject_code, exam_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, subject_name, subject_code || null, exam_date || null, start_time || null, end_time || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding subject:', error);
    res.status(500).json({ error: 'Failed to add subject' });
  }
});

// Helper function to convert time string (HH:MM) to minutes
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Bulk upload subjects from CSV/Excel
router.post('/exams/:id/subjects/upload', authMiddleware(['admin']), upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded:', req.file.originalname);

    // Get exam details for validation
    const examResult = await pool.query('SELECT exam_date, start_time, end_time FROM exams WHERE id = $1', [id]);
    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResult.rows[0];
    console.log('Exam found:', exam);

    // Parse the file
    let subjects;
    try {
      subjects = await parseFile(req.file.path);
      console.log('Parsed subjects:', subjects);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(400).json({ error: `Failed to parse CSV file: ${parseError.message}` });
    }

    if (!subjects || subjects.length === 0) {
      return res.status(400).json({ error: 'No subjects found in the uploaded file' });
    }
    
    try {
      await client.query('BEGIN');
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const subject of subjects) {
        try {
          let { subject_name, subject_code, exam_date, start_time, end_time } = subject;

          // Trim whitespace from all fields
          if (typeof subject_name === 'string') subject_name = subject_name.trim();
          if (typeof subject_code === 'string') subject_code = subject_code.trim();
          if (typeof exam_date === 'string') exam_date = exam_date.trim();
          if (typeof start_time === 'string') start_time = start_time.trim();
          if (typeof end_time === 'string') end_time = end_time.trim();

          if (!subject_name) {
            errors.push({ subject: subject_name || 'Unknown', error: 'Subject name is required' });
            errorCount++;
            continue;
          }

          // Parse and validate exam_date format (YYYY-MM-DD)
          let parsedExamDate = null;
          if (exam_date) {
            // Handle various date formats
            if (/^\d{4}-\d{2}-\d{2}$/.test(exam_date)) {
              parsedExamDate = exam_date;
            } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(exam_date)) {
              // Convert MM/DD/YYYY to YYYY-MM-DD
              const parts = exam_date.split('/');
              parsedExamDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            } else {
              errors.push({ subject: subject_name, error: `Invalid date format: ${exam_date}. Use YYYY-MM-DD` });
              errorCount++;
              continue;
            }
          }

          // Validate time format (HH:MM)
          if (start_time && !/^\d{1,2}:\d{2}$/.test(start_time)) {
            errors.push({ subject: subject_name, error: `Invalid start time format: ${start_time}. Use HH:MM` });
            errorCount++;
            continue;
          }
          if (end_time && !/^\d{1,2}:\d{2}$/.test(end_time)) {
            errors.push({ subject: subject_name, error: `Invalid end time format: ${end_time}. Use HH:MM` });
            errorCount++;
            continue;
          }

          // Validate subject date is not before exam date
          if (parsedExamDate) {
            const examDate = new Date(exam.exam_date);
            const subjectDate = new Date(parsedExamDate);
            if (subjectDate < examDate) {
              errors.push({ subject: subject_name, error: 'Subject exam date cannot be before the exam date' });
              errorCount++;
              continue;
            }
          }

          // Validate subject end time does not exceed exam end time (if on same date)
          if (parsedExamDate && exam.exam_date && end_time && exam.end_time) {
            const examDateStr = new Date(exam.exam_date).toDateString();
            const subjectDateStr = new Date(parsedExamDate).toDateString();
            
            if (examDateStr === subjectDateStr) {
              const examEndMinutes = timeToMinutes(exam.end_time);
              const subjectEndMinutes = timeToMinutes(end_time);
              
              if (subjectEndMinutes > examEndMinutes) {
                errors.push({ subject: subject_name, error: 'Subject end time exceeds exam end time on same date' });
                errorCount++;
                continue;
              }
            }
          }

          await client.query(
            `INSERT INTO exam_subjects (exam_id, subject_name, subject_code, exam_date, start_time, end_time)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, subject_name, subject_code || null, parsedExamDate || null, start_time || null, end_time || null]
          );
          
          successCount++;
        } catch (err) {
          console.error('Subject insertion error:', err);
          errorCount++;
          errors.push({ subject: subject.subject_name || 'Unknown', error: err.message });
        }
      }

      await client.query('COMMIT');
      
      const response = {
        message: 'Subjects upload completed',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      };
      
      console.log('Upload response:', response);
      return res.json(response);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      return res.status(500).json({ error: `Transaction failed: ${error.message}` });
    }
  } catch (error) {
    console.error('Subjects upload error:', error);
    return res.status(500).json({ error: `Failed to upload subjects: ${error.message}` });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Delete subject from exam
router.delete('/exams/:examId/subjects/:subjectId', authMiddleware(['admin']), async (req, res) => {
  try {
    const { examId, subjectId } = req.params;
    const result = await pool.query(
      'DELETE FROM exam_subjects WHERE id = $1 AND exam_id = $2 RETURNING *',
      [subjectId, examId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

module.exports = router;
