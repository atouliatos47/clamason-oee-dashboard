// routes/spares.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db'); // same pool used by the rest of the dashboard

// helper — auto-calculate status and total_cost before saving
function calcFields(qty, minQty, unitCost) {
  const q    = parseFloat(qty)      || 0;
  const m    = parseFloat(minQty)   || 0;
  const uc   = parseFloat(unitCost) || 0;
  const status     = q === 0 ? 'R' : q <= m ? 'Y' : 'G';
  const total_cost = parseFloat((q * uc).toFixed(2));
  return { status, total_cost };
}

// ---------------------------------------------------------------
// SUPPLIERS
// ---------------------------------------------------------------

// GET  /api/spares/suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM spares_suppliers ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/spares/suppliers  { name }
router.post('/suppliers', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO spares_suppliers (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0] || { message: 'already exists' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/spares/suppliers/:id
router.delete('/suppliers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM spares_suppliers WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// SPARES
// ---------------------------------------------------------------

// GET /api/spares  (optional ?location=  ?status=  ?supplier_id= )
router.get('/', async (req, res) => {
  try {
    const { location, status, supplier_id } = req.query;
    let query = `
      SELECT cs.*, ss.name AS supplier_name
      FROM   critical_spares cs
      LEFT JOIN spares_suppliers ss ON ss.id = cs.supplier_id
      WHERE 1=1
    `;
    const params = [];
    if (location)    { params.push(location);    query += ` AND cs.location = $${params.length}`; }
    if (status)      { params.push(status);      query += ` AND cs.status = $${params.length}`; }
    if (supplier_id) { params.push(supplier_id); query += ` AND cs.supplier_id = $${params.length}`; }
    query += ' ORDER BY cs.ref NULLS LAST, cs.id';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/spares/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cs.*, ss.name AS supplier_name
       FROM critical_spares cs
       LEFT JOIN spares_suppliers ss ON ss.id = cs.supplier_id
       WHERE cs.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/spares
router.post('/', async (req, res) => {
  const { ref, part, description, catalog_number, supplier_id,
          location, unit, qty, min_qty, unit_cost } = req.body;
  if (!part || !location) return res.status(400).json({ error: 'part and location are required' });
  const { status, total_cost } = calcFields(qty, min_qty, unit_cost);
  try {
    const { rows } = await pool.query(
      `INSERT INTO critical_spares
         (ref, part, description, catalog_number, supplier_id, location, unit,
          qty, min_qty, unit_cost, total_cost, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [ref||null, part, description||'-', catalog_number||'-', supplier_id||null,
       location, unit||'Each', qty||0, min_qty||1, unit_cost||0, total_cost, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/spares/:id
router.put('/:id', async (req, res) => {
  const { ref, part, description, catalog_number, supplier_id,
          location, unit, qty, min_qty, unit_cost } = req.body;
  if (!part || !location) return res.status(400).json({ error: 'part and location are required' });
  const { status, total_cost } = calcFields(qty, min_qty, unit_cost);
  try {
    const { rows } = await pool.query(
      `UPDATE critical_spares SET
         ref=$1, part=$2, description=$3, catalog_number=$4, supplier_id=$5,
         location=$6, unit=$7, qty=$8, min_qty=$9, unit_cost=$10,
         total_cost=$11, status=$12
       WHERE id=$13
       RETURNING *`,
      [ref||null, part, description||'-', catalog_number||'-', supplier_id||null,
       location, unit||'Each', qty||0, min_qty||1, unit_cost||0,
       total_cost, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/spares/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM critical_spares WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
