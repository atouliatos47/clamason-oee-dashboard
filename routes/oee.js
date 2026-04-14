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
