const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

// GET all audits (summary list)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, bms_number, auditor, area, audit_date, total_score, created_at
       FROM fives_audits ORDER BY audit_date DESC, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single audit with answers
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM fives_audits WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new audit
router.post('/', async (req, res) => {
  const { bms_number, auditor, area, audit_date, answers } = req.body;
  if (!answers) return res.status(400).json({ error: 'answers required' });

  // Calculate score: each yes = 0.2 points
  let yesCount = 0;
  const categories = ['sort', 'straighten', 'shine', 'standardise', 'sustain'];
  for (const cat of categories) {
    const items = answers[cat] || [];
    for (const item of items) {
      if (item.answer === true) yesCount++;
    }
  }
  const total_score = +(yesCount * 0.2).toFixed(2);

  try {
    const result = await pool.query(
      `INSERT INTO fives_audits (bms_number, auditor, area, audit_date, answers, total_score)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [bms_number || null, auditor || null, area || null,
       audit_date || new Date().toISOString().slice(0,10),
       JSON.stringify(answers), total_score]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an audit
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM fives_audits WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
