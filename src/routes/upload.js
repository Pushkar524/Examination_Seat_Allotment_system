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
    const result = await pool.query(`
      SELECT i.*, r.room_no, r.floor 
      FROM invigilators i 
      LEFT JOIN rooms r ON i.room_id = r.id 
      ORDER BY i.invigilator_id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get invigilators error:', error);
    res.status(500).json({ error: 'Failed to fetch invigilators' });
  }
});

// Manual add endpoints
router.post('/students/add', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name, roll_no, date_of_birth, department, academic_year } = req.body;

    if (!name || !roll_no || !date_of_birth || !department || !academic_year) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await client.query('BEGIN');

    // Create user account for student
    const email = `${roll_no}@student.edu`;
    const defaultPassword = await bcrypt.hash(date_of_birth, 10);
    
    const userResult = await client.query(
      `INSERT INTO users (email, password, role) 
       VALUES ($1, $2, 'student') 
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [email, defaultPassword]
    );
    
    const userId = userResult.rows[0].id;

    // Insert student data
    const result = await client.query(
      `INSERT INTO students (user_id, name, roll_no, date_of_birth, department, academic_year)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (roll_no) DO UPDATE 
       SET name = EXCLUDED.name, 
           date_of_birth = EXCLUDED.date_of_birth,
           department = EXCLUDED.department,
           academic_year = EXCLUDED.academic_year
       RETURNING *`,
      [userId, name, roll_no, date_of_birth, department, academic_year]
    );

    await client.query('COMMIT');
    res.json({ message: 'Student added successfully', student: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add student error:', error);
    
    if (error.code === '23505') {
      res.status(400).json({ error: 'Roll number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add student' });
    }
  } finally {
    client.release();
  }
});

router.post('/rooms/add', authMiddleware(['admin']), async (req, res) => {
  try {
    const { room_no, capacity, floor } = req.body;

    if (!room_no || !capacity) {
      return res.status(400).json({ error: 'Room number and capacity are required' });
    }

    const result = await pool.query(
      `INSERT INTO rooms (room_no, capacity, floor)
       VALUES ($1, $2, $3)
       ON CONFLICT (room_no) DO UPDATE 
       SET capacity = EXCLUDED.capacity,
           floor = EXCLUDED.floor
       RETURNING *`,
      [room_no, capacity, floor || null]
    );

    res.json({ message: 'Room added successfully', room: result.rows[0] });
  } catch (error) {
    console.error('Add room error:', error);
    res.status(500).json({ error: 'Failed to add room' });
  }
});

router.post('/invigilators/add', authMiddleware(['admin']), async (req, res) => {
  try {
    const { invigilator_id, name } = req.body;

    if (!invigilator_id || !name) {
      return res.status(400).json({ error: 'Invigilator ID and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO invigilators (invigilator_id, name)
       VALUES ($1, $2)
       ON CONFLICT (invigilator_id) DO UPDATE 
       SET name = EXCLUDED.name
       RETURNING *`,
      [invigilator_id, name]
    );

    res.json({ message: 'Invigilator added successfully', invigilator: result.rows[0] });
  } catch (error) {
    console.error('Add invigilator error:', error);
    res.status(500).json({ error: 'Failed to add invigilator' });
  }
});

// Assign invigilator to room
router.patch('/invigilators/:id/assign', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id } = req.body;

    // If room_id is null, we're unassigning
    if (room_id === null) {
      const result = await pool.query(
        'UPDATE invigilators SET room_id = NULL WHERE id = $1 RETURNING *',
        [id]
      );
      return res.json({ message: 'Invigilator unassigned successfully', invigilator: result.rows[0] });
    }

    // Check if room exists
    const roomCheck = await pool.query('SELECT id FROM rooms WHERE id = $1', [room_id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Assign invigilator to room
    const result = await pool.query(
      'UPDATE invigilators SET room_id = $1 WHERE id = $2 RETURNING *',
      [room_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invigilator not found' });
    }

    res.json({ message: 'Invigilator assigned successfully', invigilator: result.rows[0] });
  } catch (error) {
    console.error('Assign invigilator error:', error);
    res.status(500).json({ error: 'Failed to assign invigilator' });
  }
});

// Delete student
router.delete('/students/:id', authMiddleware(['admin']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Get user_id before deleting student
    const studentResult = await client.query('SELECT user_id FROM students WHERE id = $1', [id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const userId = studentResult.rows[0].user_id;
    
    // Delete student (cascade will handle seat_allotments)
    await client.query('DELETE FROM students WHERE id = $1', [id]);
    
    // Delete user account
    if (userId) {
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  } finally {
    client.release();
  }
});

// Update student
router.put('/students/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roll_no, date_of_birth, department, academic_year } = req.body;

    if (!name || !roll_no || !date_of_birth || !department || !academic_year) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await pool.query(
      `UPDATE students 
       SET name = $1, roll_no = $2, date_of_birth = $3, department = $4, academic_year = $5
       WHERE id = $6
       RETURNING *`,
      [name, roll_no, date_of_birth, department, academic_year, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student updated successfully', student: result.rows[0] });
  } catch (error) {
    console.error('Update student error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Roll number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update student' });
    }
  }
});

// Delete room
router.delete('/rooms/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if room has allotments
    const checkResult = await pool.query('SELECT COUNT(*) FROM seat_allotments WHERE room_id = $1', [id]);
    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete room with existing seat allotments' });
    }
    
    const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Update room
router.put('/rooms/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { room_no, capacity, floor } = req.body;

    if (!room_no || !capacity || !floor) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await pool.query(
      `UPDATE rooms 
       SET room_no = $1, capacity = $2, floor = $3
       WHERE id = $4
       RETURNING *`,
      [room_no, capacity, floor, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Room updated successfully', room: result.rows[0] });
  } catch (error) {
    console.error('Update room error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Room number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update room' });
    }
  }
});

// Delete invigilator
router.delete('/invigilators/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM invigilators WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invigilator not found' });
    }
    
    res.json({ message: 'Invigilator deleted successfully' });
  } catch (error) {
    console.error('Delete invigilator error:', error);
    res.status(500).json({ error: 'Failed to delete invigilator' });
  }
});

// Update invigilator
router.put('/invigilators/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, invigilator_id } = req.body;

    if (!name || !invigilator_id) {
      return res.status(400).json({ error: 'Name and invigilator ID are required' });
    }

    const result = await pool.query(
      `UPDATE invigilators 
       SET name = $1, invigilator_id = $2
       WHERE id = $3
       RETURNING *`,
      [name, invigilator_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invigilator not found' });
    }

    res.json({ message: 'Invigilator updated successfully', invigilator: result.rows[0] });
  } catch (error) {
    console.error('Update invigilator error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Invigilator ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update invigilator' });
    }
  }
});

module.exports = router;
