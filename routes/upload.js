const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { pool } = require('../db');

const upload = multer({ storage: multer.memoryStorage() });

// ── Parse SFC XLS ─────────────────────────────────────────────────────────────
function parseSFC(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const machines = [];
  let currentMachine = null;
  let machineCol = -1;

  function toHrs(val) {
    if (val === null || val === undefined || val === '') return 0;
    const s = String(val).trim();
    if (s.includes(':')) {
      const parts = s.split(':');
      try { return Math.round((parseInt(parts[0]) + parseInt(parts[1]) / 60) * 100) / 100; }
      catch { return 0; }
    }
    return parseFloat(s) || 0;
  }

  function toNum(val) {
    if (val === null || val === undefined) return 0;
    return Math.round(parseFloat(val) * 100) / 100 || 0;
  }

  for (const row of raw) {
    for (let c = 0; c < row.length; c++) {
      if (row[c] && String(row[c]).includes('Machine:')) { machineCol = c; break; }
    }
    if (machineCol >= 0) break;
  }
  if (machineCol < 0) return [];

  let colMap = null;
  for (const row of raw) {
    const cell = row[machineCol] ? String(row[machineCol]).trim() : '';
    if (cell.includes('Time') && row.some(c => c && String(c).includes('Avail'))) {
      colMap = {};
      for (let c = 0; c < row.length; c++) {
        const h = row[c] ? String(row[c]).replace(/\n/g, ' ').toLowerCase().trim() : '';
        if (h.includes('total') && h.includes('avail'))   colMap.totalAvail  = c;
        if (h.includes('planned') && h.includes('down'))  colMap.plannedDown = c;
        if (h.includes('net') && h.includes('avail'))     colMap.netAvail    = c;
        if (h.includes('unplanned'))                       colMap.unplanned   = c;
        if (h.includes('run') && h.includes('time'))      colMap.runTime     = c;
        if (h.includes('equip') && h.includes('avail'))   colMap.avail       = c;
        if (h.includes('total') && h.includes('parts'))   colMap.totalParts  = c;
        if (h.includes('perf') && h.includes('eff'))      colMap.perf        = c;
        if (h.includes('scrap'))                           colMap.scrap       = c;
        if (h.includes('quality'))                         colMap.quality     = c;
        if (h.includes('oee'))                             colMap.oee         = c;
      }
    }
    if (cell.includes('Machine:')) currentMachine = cell.replace('Machine:', '').trim();
    if (cell.includes('Sub Totals') && currentMachine) {
      const pd = colMap ? row[colMap.plannedDown] : row[machineCol + 8];
      const na = colMap ? row[colMap.netAvail]    : row[machineCol + 13];
      const un = colMap ? row[colMap.unplanned]   : row[machineCol + 14];
      const rt = colMap ? row[colMap.runTime]     : row[machineCol + 16];
      const av = colMap ? row[colMap.avail]       : row[machineCol + 20];
      const tp = colMap ? row[colMap.totalParts]  : row[machineCol + 22];
      const pe = colMap ? row[colMap.perf]        : row[machineCol + 28];
      const qu = colMap ? row[colMap.quality]     : row[machineCol + 32];
      const oe = colMap ? row[colMap.oee]         : row[machineCol + 34];
      machines.push({
        machine: currentMachine,
        planned_down_h: toHrs(pd), net_avail_h: toHrs(na), unplanned_h: toHrs(un),
        run_h: toHrs(rt), avail: toNum(av), perf: toNum(pe), quality: toNum(qu),
        oee: toNum(oe), total_parts: parseInt(tp) || 0,
      });
    }
  }
  return machines;
}

// ── Parse Agility XLSX ────────────────────────────────────────────────────────
function parseAgility(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets['Sheet2'] || wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]];
  if (!ws) throw new Error('Could not find data sheet in Agility file');
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const machines = [];
  let current = null;

  for (const row of raw) {
    const c0 = row[0] != null ? String(row[0]).trim() : '';
    const c1 = row[1] != null ? String(row[1]).replace(/\n/g, ' ').trim() : '';
    const c2 = row[2] != null ? String(row[2]).trim() : '';

    const isMachineRow = /^\d{4,8}$/.test(c0) && c1 !== '' && c2 === '';
    const isJobRow = c0 === '' && /^\d{6}$/.test(c1) && c2 !== '';

    if (isMachineRow) {
      if (current) machines.push(current);
      current = {
        code: c0, name: c1.replace(/\s+/g, ' '),
        cost_labour: Math.round(parseFloat(row[6]) || 0),
        labour_hrs: Math.round((parseFloat(row[7]) || 0) * 10) / 10,
        num_jobs: parseInt(row[10]) || 0,
        downtime_hrs: Math.round((parseFloat(row[11]) || 0) * 10) / 10,
        tpm_count: 0, breakdown_count: 0, breakdowns: [], tpm_jobs: [],
      };
    } else if (isJobRow && current) {
      const isTpm = /tpm|preventive|planned service/i.test(c2);
      const dt = parseFloat(row[11]) || 0;
      const lh = parseFloat(row[7]) || 0;
      const lc = parseFloat(row[6]) || 0;
      if (isTpm) {
        current.tpm_count++;
        current.tpm_jobs.push({
          wo: c1, desc: c2.slice(0, 80),
          labour_hrs: Math.round(lh * 10) / 10,
          cost_labour: Math.round(lc),
        });
      } else {
        current.breakdown_count++;
        if (dt > 0) {
          current.breakdowns.push({
            wo: c1, desc: c2.slice(0, 80),
            labour_hrs: Math.round(lh * 10) / 10,
            downtime_hrs: Math.round(dt * 10) / 10,
            cost_labour: Math.round(lc),
          });
        }
      }
    }
  }
  if (current) machines.push(current);
  for (const m of machines) {
    m.breakdowns = m.breakdowns.sort((a,b) => b.downtime_hrs - a.downtime_hrs).slice(0, 5);
  }
  return machines.filter(m => m.num_jobs > 0);
}

// ── POST /api/upload/sfc ──────────────────────────────────────────────────────
router.post('/sfc', upload.single('file'), async (req, res) => {
  try {
    const weekLabel = req.body.week_label;
    if (!weekLabel) return res.status(400).json({ error: 'week_label is required' });
    const machines = parseSFC(req.file.buffer);
    if (!machines.length) return res.status(400).json({ error: 'No machine data found in file' });
    const client = await pool.connect();
    try {
      let inserted = 0;
      for (const m of machines) {
        await client.query(`
          INSERT INTO oee_data
            (week_label, machine, planned_down_h, net_avail_h, unplanned_h,
             run_h, avail, perf, quality, oee, total_parts)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (week_label, machine) DO UPDATE SET
            planned_down_h=EXCLUDED.planned_down_h, net_avail_h=EXCLUDED.net_avail_h,
            unplanned_h=EXCLUDED.unplanned_h, run_h=EXCLUDED.run_h,
            avail=EXCLUDED.avail, perf=EXCLUDED.perf, quality=EXCLUDED.quality,
            oee=EXCLUDED.oee, total_parts=EXCLUDED.total_parts, uploaded_at=NOW()
        `, [weekLabel, m.machine, m.planned_down_h, m.net_avail_h, m.unplanned_h,
            m.run_h, m.avail, m.perf, m.quality, m.oee, m.total_parts]);
        inserted++;
      }
      res.json({ success: true, week: weekLabel, machines: inserted });
    } finally { client.release(); }
  } catch (err) {
    console.error('SFC upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload/agility ──────────────────────────────────────────────────
router.post('/agility', upload.single('file'), async (req, res) => {
  try {
    const periodLabel = req.body.period_label;
    if (!periodLabel) return res.status(400).json({ error: 'period_label is required' });
    const machines = parseAgility(req.file.buffer);
    if (!machines.length) return res.status(400).json({ error: 'No machine data found in file' });
    const client = await pool.connect();
    try {
      let inserted = 0;
      for (const m of machines) {
        await client.query(`
          INSERT INTO agility_data
            (period_label, code, name, cost_labour, labour_hrs, num_jobs,
             downtime_hrs, tpm_count, breakdown_count, breakdowns, tpm_jobs)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (period_label, code) DO UPDATE SET
            name=EXCLUDED.name, cost_labour=EXCLUDED.cost_labour,
            labour_hrs=EXCLUDED.labour_hrs, num_jobs=EXCLUDED.num_jobs,
            downtime_hrs=EXCLUDED.downtime_hrs, tpm_count=EXCLUDED.tpm_count,
            breakdown_count=EXCLUDED.breakdown_count, breakdowns=EXCLUDED.breakdowns,
            tpm_jobs=EXCLUDED.tpm_jobs, uploaded_at=NOW()
        `, [periodLabel, m.code, m.name, m.cost_labour, m.labour_hrs,
            m.num_jobs, m.downtime_hrs, m.tpm_count, m.breakdown_count,
            JSON.stringify(m.breakdowns), JSON.stringify(m.tpm_jobs)]);
        inserted++;
      }
      res.json({ success: true, period: periodLabel, machines: inserted });
    } finally { client.release(); }
  } catch (err) {
    console.error('Agility upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/upload/machine-mapping ──────────────────────────────────────────
router.get('/machine-mapping', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Create table if it doesn't exist yet
      await client.query(`
        CREATE TABLE IF NOT EXISTS machine_mapping (
          id           SERIAL PRIMARY KEY,
          agility_name VARCHAR(150) NOT NULL UNIQUE,
          sfc_name     VARCHAR(100),
          updated_at   TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      const mappings = await client.query(`SELECT agility_name, sfc_name FROM machine_mapping ORDER BY agility_name`);
      const agility  = await client.query(`SELECT DISTINCT name AS agility_name FROM agility_data ORDER BY name`);
      const sfc      = await client.query(`SELECT DISTINCT machine AS sfc_name FROM oee_data ORDER BY machine`);
      res.json({
        mappings: mappings.rows,
        agilityNames: agility.rows.map(r => r.agility_name),
        sfcNames: sfc.rows.map(r => r.sfc_name),
      });
    } finally { client.release(); }
  } catch (err) {
    console.error('machine-mapping GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload/machine-mapping ─────────────────────────────────────────
router.post('/machine-mapping', async (req, res) => {
  try {
    const { mappings } = req.body;
    if (!Array.isArray(mappings)) return res.status(400).json({ error: 'mappings array required' });
    const client = await pool.connect();
    try {
      for (const m of mappings) {
        if (!m.agility_name) continue;
        await client.query(`
          INSERT INTO machine_mapping (agility_name, sfc_name, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (agility_name) DO UPDATE SET sfc_name=EXCLUDED.sfc_name, updated_at=NOW()
        `, [m.agility_name, m.sfc_name || null]);
      }
      res.json({ success: true, saved: mappings.length });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload/reset-sfc ───────────────────────────────────────────────
router.post('/reset-sfc', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE TABLE oee_data RESTART IDENTITY CASCADE');
      res.json({ success: true });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload/reset-agility ───────────────────────────────────────────
router.post('/reset-agility', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE TABLE agility_data RESTART IDENTITY CASCADE');
      res.json({ success: true });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload/reset ────────────────────────────────────────────────────
router.post('/reset', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE TABLE oee_data RESTART IDENTITY CASCADE');
      await client.query('TRUNCATE TABLE agility_data RESTART IDENTITY CASCADE');
      res.json({ success: true });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
