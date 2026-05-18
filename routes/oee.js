const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

// GET all weeks available
router.get('/weeks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT week_label FROM oee_data ORDER BY week_label ASC`
    );
    res.json(result.rows.map(r => r.week_label));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET TEEP data — must be before /:week wildcard
router.get('/teep', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        machine_name,
        COUNT(DISTINCT week_start)                          AS weeks,
        ROUND(SUM(net_avail_hrs)::numeric, 2)               AS total_net_hrs,
        ROUND(SUM(total_avail_hrs)::numeric, 2)             AS total_calendar_hrs,
        ROUND((SUM(net_avail_hrs) / NULLIF(SUM(total_avail_hrs), 0) * 100)::numeric, 1) AS loading_pct,
        ROUND(AVG(oee_pct)::numeric, 1)                     AS avg_oee_pct,
        ROUND((SUM(net_avail_hrs) / NULLIF(SUM(total_avail_hrs), 0) * AVG(oee_pct))::numeric, 1) AS teep_pct
      FROM sfc_oee
      WHERE week_start >= (SELECT MAX(week_start) FROM sfc_oee) - INTERVAL '27 days'
      GROUP BY machine_name
      HAVING SUM(net_avail_hrs) > 0
      ORDER BY machine_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('TEEP query error:', err);
    res.status(500).json({ error: 'Failed to fetch TEEP data' });
  }
});

// GET all data for a specific week
router.get('/:week', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM oee_data WHERE week_label = $1 ORDER BY machine ASC`,
      [req.params.week]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all data for a specific machine across all weeks
router.get('/machine/:name', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM oee_data WHERE machine ILIKE $1 ORDER BY week_label ASC`,
      [req.params.name]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET summary: latest week KPIs
router.get('/summary/latest', async (req, res) => {
  try {
    const weekRes = await pool.query(
      `SELECT week_label FROM oee_data ORDER BY week_label DESC LIMIT 1`
    );
    if (!weekRes.rows.length) return res.json({ week: null, data: [] });
    const week = weekRes.rows[0].week_label;
    const data = await pool.query(
      `SELECT * FROM oee_data WHERE week_label = $1`, [week]
    );
    res.json({ week, data: data.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;