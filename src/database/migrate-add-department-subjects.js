const pool = require('../config/database');

const migrateAddDepartmentSubjects = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration: Adding department-subject mapping...');

    // Create department_subjects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS department_subjects (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        department VARCHAR(100) NOT NULL,
        subject_id INTEGER REFERENCES exam_subjects(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(exam_id, department, subject_id)
      );
    `);
    console.log('✓ Department-subjects mapping table created');

    // Add allotment_pattern column to seat_allotments if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='seat_allotments' AND column_name='allotment_pattern'
        ) THEN
          ALTER TABLE seat_allotments 
          ADD COLUMN allotment_pattern VARCHAR(20) CHECK (allotment_pattern IN ('pattern1', 'pattern2'));
        END IF;
      END $$;
    `);
    console.log('✓ Added allotment_pattern column to seat_allotments');

    // Add subject_id column to seat_allotments to link specific subject
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='seat_allotments' AND column_name='subject_id'
        ) THEN
          ALTER TABLE seat_allotments 
          ADD COLUMN subject_id INTEGER REFERENCES exam_subjects(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('✓ Added subject_id column to seat_allotments');

    console.log('\n✅ Database migration completed successfully!');
    console.log('New features available:');
    console.log('  - Map subjects to departments for each exam');
    console.log('  - Track allotment pattern used (Pattern 1 or Pattern 2)');
    console.log('  - Link seat allotments to specific subjects');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAddDepartmentSubjects()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateAddDepartmentSubjects;
