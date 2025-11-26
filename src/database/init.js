const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Users table created');

    // Create students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        roll_no VARCHAR(50) UNIQUE NOT NULL,
        date_of_birth DATE NOT NULL,
        department VARCHAR(100) NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Students table created');

    // Create rooms table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        room_no VARCHAR(50) UNIQUE NOT NULL,
        capacity INTEGER NOT NULL,
        floor VARCHAR(20),
        building VARCHAR(100),
        number_of_benches INTEGER DEFAULT 0,
        seats_per_bench INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Rooms table created');

    // Create invigilators table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invigilators (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        invigilator_id VARCHAR(50) UNIQUE NOT NULL,
        room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
        department VARCHAR(100),
        contact_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_room_assignment UNIQUE (room_id)
      );
    `);
    console.log('✓ Invigilators table created');

    // Create exams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        exam_name VARCHAR(255) NOT NULL,
        exam_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Exams table created');

    // Create exam_subjects table (many-to-many relationship)
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_subjects (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        subject_name VARCHAR(255) NOT NULL,
        subject_code VARCHAR(50),
        exam_date DATE,
        start_time TIME,
        end_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Exam subjects table created');

    // Create seat_allotments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seat_allotments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        seat_number INTEGER NOT NULL,
        subject VARCHAR(100),
        exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL,
        allotment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, seat_number, exam_id)
      );
    `);
    console.log('✓ Seat allotments table created');

    // Create index for subject-based queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_seat_allotments_subject ON seat_allotments(subject);
    `);
    console.log('✓ Index created on seat_allotments.subject');

    // Create default admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await client.query(`
      INSERT INTO users (email, password, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (email) DO NOTHING;
    `, [process.env.ADMIN_EMAIL || 'admin@example.com', hashedPassword]);
    console.log('✓ Default admin user created');

    console.log('\n✅ Database initialization completed successfully!');
    console.log(`\nDefault Admin Credentials:`);
    console.log(`Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}`);
    console.log(`Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run initialization if this file is executed directly
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = initDatabase;
