const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

// GET all periods available
router.get('/periods', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT period_label FROM agility_data ORDER BY period_label DESC`
    );
    res.json(result.rows.map(r => r.period_label));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all machines for a period (default: latest)
router.get('/all', async (req, res) => {
  try {
    const period = req.query.period;
    let query, params;
    if (period) {
      query  = `SELECT * FROM agility_data WHERE period_label = $1 ORDER BY downtime_hrs DESC`;
      params = [period];
    } else {
      // Latest period
      query  = `SELECT * FROM agility_data WHERE period_label = (
                  SELECT period_label FROM agility_data ORDER BY uploaded_at DESC LIMIT 1
                ) ORDER BY downtime_hrs DESC`;
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single machine by code
router.get('/machine/:code', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM agility_data WHERE code = $1 ORDER BY uploaded_at DESC`,
      [req.params.code]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
