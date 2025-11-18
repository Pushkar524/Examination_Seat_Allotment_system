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
        floor VARCHAR(20) NOT NULL,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Invigilators table created');

    // Create seat_allotments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seat_allotments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        seat_number INTEGER NOT NULL,
        allotment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, seat_number)
      );
    `);
    console.log('✓ Seat allotments table created');

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
