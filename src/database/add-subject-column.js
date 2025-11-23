const pool = require('../config/database');

/**
 * Migration to add subject column to seat_allotments
 * Provides ability to store which subject occupies a seat for multi-subject exams
 */
const addSubjectColumn = async () => {
  const client = await pool.connect();
  try {
    console.log('Adding subject column to seat_allotments table...');

    await client.query(`
      ALTER TABLE seat_allotments
      ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
    `);
    console.log('✓ Added subject column (nullable)');

    // Optional index to speed up subject-based reporting
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_seat_allotments_subject'
        ) THEN
          CREATE INDEX idx_seat_allotments_subject ON seat_allotments(subject);
        END IF;
      END$$;
    `);
    console.log('✓ Verified/created index on subject');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Error adding subject column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

addSubjectColumn()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
