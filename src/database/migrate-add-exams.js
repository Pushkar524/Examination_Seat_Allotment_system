const pool = require('../config/database');

const migrateAddExams = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration: Adding exams functionality...');

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

    // Create exam_subjects table
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

    // Add exam_id column to seat_allotments if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='seat_allotments' AND column_name='exam_id'
        ) THEN
          ALTER TABLE seat_allotments 
          ADD COLUMN exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('✓ Added exam_id column to seat_allotments');

    // Drop old unique constraint and add new one with exam_id
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'seat_allotments_room_id_seat_number_key'
        ) THEN
          ALTER TABLE seat_allotments 
          DROP CONSTRAINT seat_allotments_room_id_seat_number_key;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'seat_allotments_room_seat_exam_unique'
        ) THEN
          ALTER TABLE seat_allotments 
          ADD CONSTRAINT seat_allotments_room_seat_exam_unique 
          UNIQUE(room_id, seat_number, exam_id);
        END IF;
      END $$;
    `);
    console.log('✓ Updated unique constraint on seat_allotments');

    console.log('\n✅ Database migration completed successfully!');
    console.log('New features available:');
    console.log('  - Create exams with name, date, and time');
    console.log('  - Add multiple subjects to each exam');
    console.log('  - Link seat allotments to specific exams');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAddExams()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateAddExams;
