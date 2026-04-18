const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS oee_data (
        id          SERIAL PRIMARY KEY,
        week_label  VARCHAR(20) NOT NULL,
        machine     VARCHAR(100) NOT NULL,
        planned_down_h NUMERIC(8,2) DEFAULT 0,
        net_avail_h    NUMERIC(8,2) DEFAULT 0,
        unplanned_h    NUMERIC(8,2) DEFAULT 0,
        run_h          NUMERIC(8,2) DEFAULT 0,
        avail          NUMERIC(6,2) DEFAULT 0,
        perf           NUMERIC(6,2) DEFAULT 0,
        quality        NUMERIC(6,2) DEFAULT 0,
        oee            NUMERIC(6,2) DEFAULT 0,
        total_parts    BIGINT DEFAULT 0,
        uploaded_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(week_label, machine)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agility_data (
        id             SERIAL PRIMARY KEY,
        period_label   VARCHAR(50) NOT NULL,
        code           VARCHAR(20) NOT NULL,
        name           VARCHAR(150) NOT NULL,
        cost_labour    NUMERIC(10,2) DEFAULT 0,
        labour_hrs     NUMERIC(8,2) DEFAULT 0,
        num_jobs       INTEGER DEFAULT 0,
        downtime_hrs   NUMERIC(8,2) DEFAULT 0,
        tpm_count      INTEGER DEFAULT 0,
        breakdown_count INTEGER DEFAULT 0,
        breakdowns     JSONB DEFAULT '[]',
        uploaded_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(period_label, code)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS machine_mapping (
        id           SERIAL PRIMARY KEY,
        agility_name VARCHAR(150) NOT NULL UNIQUE,
        sfc_name     VARCHAR(100),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Database tables ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
