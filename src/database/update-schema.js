const pool = require('../config/database');

/**
 * Comprehensive Database Schema Update Script
 * Runs all necessary migrations to update the database to the latest schema
 */
async function updateSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database schema update...\n');

    // Step 1: Add room assignment to invigilators
    console.log('Step 1: Adding room assignment capability...');
    await client.query(`
      ALTER TABLE invigilators
      ADD COLUMN IF NOT EXISTS room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL;
    `);
    console.log('✓ Added room_id column to invigilators table\n');

    // Step 2: Add bench-based seating to rooms
    console.log('Step 2: Adding bench-based seating layout...');
    await client.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS number_of_benches INTEGER DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS seats_per_bench INTEGER DEFAULT 0;
    `);
    // Update existing rooms with default configuration
    await client.query(`
      UPDATE rooms
      SET number_of_benches = CEIL(capacity::float / 6),
          seats_per_bench = 6
      WHERE number_of_benches = 0 OR number_of_benches IS NULL;
    `);
    console.log('✓ Added number_of_benches and seats_per_bench columns to rooms\n');

    // Step 3: Add subject column to seat_allotments
    console.log('Step 3: Adding subject tracking...');
    await client.query(`
      ALTER TABLE seat_allotments
      ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
    `);
    // Add index for performance
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
    console.log('✓ Added subject column to seat_allotments\n');

    // Step 4: Add unique constraint to room assignments
    console.log('Step 4: Adding unique room assignment constraint...');
    // Clean up duplicate assignments first
    await client.query(`
      UPDATE invigilators i1
      SET room_id = NULL
      WHERE room_id IS NOT NULL
      AND id NOT IN (
        SELECT MIN(id)
        FROM invigilators
        WHERE room_id IS NOT NULL
        GROUP BY room_id
      );
    `);
    // Add unique constraint
    await client.query(`
      ALTER TABLE invigilators
      DROP CONSTRAINT IF EXISTS unique_room_assignment;
      
      ALTER TABLE invigilators
      ADD CONSTRAINT unique_room_assignment UNIQUE (room_id);
    `);
    console.log('✓ Added unique constraint - each room can only have one invigilator\n');

    // Step 5: Additional useful migrations
    console.log('Step 5: Adding optional columns...');
    await client.query(`
      ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS building VARCHAR(100);
    `);
    await client.query(`
      ALTER TABLE rooms 
      ALTER COLUMN floor DROP NOT NULL;
    `);
    await client.query(`
      ALTER TABLE invigilators 
      ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    `);
    await client.query(`
      ALTER TABLE invigilators 
      ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
    `);
    console.log('✓ Added optional columns to rooms and invigilators\n');

    console.log('✅ Database schema update completed successfully!');
    console.log('\nUpdated schema includes:');
    console.log('  • Room assignments for invigilators');
    console.log('  • Bench-based seating layout for rooms');
    console.log('  • Subject tracking for seat allotments');
    console.log('  • Unique room assignment constraint');
    console.log('  • Additional optional fields\n');

  } catch (error) {
    console.error('❌ Error during schema update:', error);
    console.error('\nDetails:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run update
if (require.main === module) {
  updateSchema()
    .then(() => {
      console.log('✅ Schema update completed. You can now start your server.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Schema update failed:', err.message);
      process.exit(1);
    });
}

module.exports = updateSchema;
