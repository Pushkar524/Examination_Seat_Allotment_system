const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Admin Login
router.post('/login/admin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Student Login
router.post('/login/student', async (req, res) => {
  try {
    const { roll_no, date_of_birth } = req.body;

    if (!roll_no || !date_of_birth) {
      return res.status(400).json({ error: 'Roll number and date of birth are required' });
    }

    const result = await pool.query(
      `SELECT s.*, u.id as user_id, u.email, u.role 
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.roll_no = $1 AND s.date_of_birth = $2`,
      [roll_no, date_of_birth]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const student = result.rows[0];

    const token = jwt.sign(
      { id: student.user_id, studentId: student.id, roll_no: student.roll_no, role: student.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      student: {
        id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        department: student.department,
        academic_year: student.academic_year
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
