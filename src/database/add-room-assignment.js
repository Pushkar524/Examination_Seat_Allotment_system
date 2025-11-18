const pool = require('../config/database');

const addRoomAssignmentColumn = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Adding room assignment to invigilators table...');

    // Add room_id column to invigilators table
    await client.query(`
      ALTER TABLE invigilators
      ADD COLUMN IF NOT EXISTS room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL;
    `);
    
    console.log('✓ room_id column added to invigilators table');
    console.log('\n✅ Migration completed successfully!');
    console.log('Invigilators can now be assigned to specific rooms.');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
addRoomAssignmentColumn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
