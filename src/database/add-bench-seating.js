const pool = require('../config/database');

/**
 * Migration to add bench-based seating layout to rooms
 * This allows rooms to have a grid layout (rows of benches with seats per bench)
 * instead of just a total capacity number
 */
const addBenchSeatingToRooms = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Adding bench-based seating columns to rooms table...');

    // Add number_of_benches column (rows in the grid)
    await client.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS number_of_benches INTEGER DEFAULT 0;
    `);
    console.log('✓ Added number_of_benches column');

    // Add seats_per_bench column (seats per row)
    await client.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS seats_per_bench INTEGER DEFAULT 0;
    `);
    console.log('✓ Added seats_per_bench column');

    // Update existing rooms to calculate benches from capacity
    // Assuming default of 6 seats per bench
    await client.query(`
      UPDATE rooms
      SET number_of_benches = CEIL(capacity::float / 6),
          seats_per_bench = 6
      WHERE number_of_benches = 0 OR number_of_benches IS NULL;
    `);
    console.log('✓ Updated existing rooms with default bench configuration');

    console.log('\n✅ Migration completed successfully!');
    console.log('Rooms now support bench-based seating layout.');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
addBenchSeatingToRooms()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
