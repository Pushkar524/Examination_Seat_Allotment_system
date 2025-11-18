const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const bcrypt = require('bcryptjs');
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
          fs.unlinkSync(filePath); // Delete file after parsing
          resolve(results);
        })
        .on('error', reject);
    } else if (ext === 'xlsx' || ext === 'xls') {
      try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        fs.unlinkSync(filePath); // Delete file after parsing
        resolve(data);
      } catch (error) {
        reject(error);
      }
    } else {
      reject(new Error('Unsupported file format'));
    }
  });
};

// Upload Students
router.post('/students/upload', authMiddleware(['admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const students = await parseFile(req.file.path);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const student of students) {
        try {
          // Create user account for student (using roll_no as email prefix)
          const email = `${student.roll_no}@student.edu`;
          const defaultPassword = await bcrypt.hash(student.date_of_birth || '123456', 10);
          
          const userResult = await client.query(
            `INSERT INTO users (email, password, role) 
             VALUES ($1, $2, 'student') 
             ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
             RETURNING id`,
            [email, defaultPassword]
          );
          
          const userId = userResult.rows[0].id;

          // Insert student data
          await client.query(
            `INSERT INTO students (user_id, name, roll_no, date_of_birth, department, academic_year)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (roll_no) DO UPDATE 
             SET name = EXCLUDED.name, 
                 date_of_birth = EXCLUDED.date_of_birth,
                 department = EXCLUDED.department,
                 academic_year = EXCLUDED.academic_year`,
            [userId, student.name, student.roll_no, student.date_of_birth, student.department, student.academic_year]
          );
          
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push({ roll_no: student.roll_no, error: error.message });
        }
      }

      await client.query('COMMIT');
      
      res.json({
        message: 'Students upload completed',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Students upload error:', error);
    res.status(500).json({ error: 'Failed to upload students' });
  }
});

// Upload Rooms
router.post('/rooms/upload', authMiddleware(['admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const rooms = await parseFile(req.file.path);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const room of rooms) {
        try {
          await client.query(
            `INSERT INTO rooms (room_no, capacity, floor)
             VALUES ($1, $2, $3)
             ON CONFLICT (room_no) DO UPDATE 
             SET capacity = EXCLUDED.capacity,
                 floor = EXCLUDED.floor`,
            [room.room_no, room.capacity, room.floor]
          );
          
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push({ room_no: room.room_no, error: error.message });
        }
      }

      await client.query('COMMIT');
      
      res.json({
        message: 'Rooms upload completed',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Rooms upload error:', error);
    res.status(500).json({ error: 'Failed to upload rooms' });
  }
});

// Upload Invigilators
router.post('/invigilators/upload', authMiddleware(['admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const invigilators = await parseFile(req.file.path);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const invigilator of invigilators) {
        try {
          await client.query(
            `INSERT INTO invigilators (name, invigilator_id)
             VALUES ($1, $2)
             ON CONFLICT (invigilator_id) DO UPDATE 
             SET name = EXCLUDED.name`,
            [invigilator.name, invigilator.invigilator_id]
          );
          
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push({ invigilator_id: invigilator.invigilator_id, error: error.message });
        }
      }

      await client.query('COMMIT');
      
      res.json({
        message: 'Invigilators upload completed',
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Invigilators upload error:', error);
    res.status(500).json({ error: 'Failed to upload invigilators' });
  }
});

// Get all students
router.get('/students', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM students ORDER BY roll_no'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get all rooms
router.get('/rooms', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rooms ORDER BY room_no'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get all invigilators
router.get('/invigilators', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM invigilators ORDER BY invigilator_id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get invigilators error:', error);
    res.status(500).json({ error: 'Failed to fetch invigilators' });
  }
});

module.exports = router;
