require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const allotmentRoutes = require('./routes/allotment');
const exportRoutes = require('./routes/export');
const subjectsRoutes = require('./routes/subjects');
const examsRoutes = require('./routes/exams');
const departmentSubjectsRoutes = require('./routes/department-subjects');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/allotment', allotmentRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/dept-subjects', departmentSubjectsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;
