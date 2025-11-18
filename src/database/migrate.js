const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Running database migrations...\n');

    // Add building column to rooms table if it doesn't exist
    await client.query(`
      ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS building VARCHAR(100);
    `);
    console.log('✓ Added building column to rooms table');

    // Make floor column nullable if it exists
    await client.query(`
      ALTER TABLE rooms 
      ALTER COLUMN floor DROP NOT NULL;
    `);
    console.log('✓ Updated floor column to be nullable');

    // Add department column to invigilators table if it doesn't exist
    await client.query(`
      ALTER TABLE invigilators 
      ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    `);
    console.log('✓ Added department column to invigilators table');

    // Add contact_number column to invigilators table if it doesn't exist
    await client.query(`
      ALTER TABLE invigilators 
      ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
    `);
    console.log('✓ Added contact_number column to invigilators table');

    console.log('\n✅ Database migration completed successfully!');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrate;
