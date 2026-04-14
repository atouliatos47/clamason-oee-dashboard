require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function reset() {
  const client = await pool.connect();
  try {
    console.log('⚠️  Clearing all data...');
    await client.query('TRUNCATE TABLE oee_data RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE TABLE agility_data RESTART IDENTITY CASCADE');
    console.log('✅ All data cleared — tables are empty and ready');
    console.log('👉 Now run: node-v24.14.0-win-x64\\node.exe seed.js');
  } catch (err) {
    // Tables might not exist yet — that's fine
    if (err.message.includes('does not exist')) {
      console.log('ℹ️  Tables do not exist yet — nothing to clear');
    } else {
      console.error('❌ Error:', err.message);
    }
  } finally {
    client.release();
    process.exit(0);
  }
}

reset();
