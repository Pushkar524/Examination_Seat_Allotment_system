const pool = require('../config/database');

const addStudentExamConstraint = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration: Adding student-exam unique constraint...');

    // Add unique constraint to prevent same student from getting multiple seats for same exam
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'seat_allotments_student_exam_unique'
        ) THEN
          ALTER TABLE seat_allotments 
          ADD CONSTRAINT seat_allotments_student_exam_unique 
          UNIQUE(student_id, exam_id);
        END IF;
      END $$;
    `);
    console.log('✓ Added unique constraint on (student_id, exam_id)');

    console.log('\n✅ Database migration completed successfully!');
    console.log('Now students cannot be assigned multiple seats for the same exam');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  addStudentExamConstraint()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = addStudentExamConstraint;
