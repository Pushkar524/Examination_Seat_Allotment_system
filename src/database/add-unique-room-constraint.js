const pool = require('../config/database');

const addUniqueRoomConstraint = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Adding unique constraint to room_id in invigilators table...');

    // First, clean up any duplicate room assignments (keep the first one, unassign others)
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
    console.log('✓ Cleaned up duplicate room assignments');

    // Add unique constraint to room_id column
    await client.query(`
      ALTER TABLE invigilators
      DROP CONSTRAINT IF EXISTS unique_room_assignment;
      
      ALTER TABLE invigilators
      ADD CONSTRAINT unique_room_assignment UNIQUE (room_id);
    `);
    
    console.log('✓ Unique constraint added to room_id column');
    console.log('\n✅ Migration completed successfully!');
    console.log('Each room can now only be assigned to one invigilator.');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
addUniqueRoomConstraint()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
