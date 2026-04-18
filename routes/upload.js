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
  let machineCol = -1;  // column index where machine names appear

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

  // First pass — find which column contains 'Machine:' labels
  for (const row of raw) {
    for (let c = 0; c < row.length; c++) {
      if (row[c] && String(row[c]).includes('Machine:')) {
        machineCol = c;
        break;
      }
    }
    if (machineCol >= 0) break;
  }

  if (machineCol < 0) return []; // couldn't find machine column

  // Second pass — find Sub Totals rows relative to machine column
  // Detect column offsets from the header row
  let colMap = null;

  for (const row of raw) {
    const cell = row[machineCol] ? String(row[machineCol]).trim() : '';

    // Detect header row to find column positions
    if (cell.includes('Time') && row.some(c => c && String(c).includes('Avail'))) {
      // Map known column headers
      colMap = {};
      for (let c = 0; c < row.length; c++) {
        const h = row[c] ? String(row[c]).replace(/\n/g, ' ').toLowerCase().trim() : '';
        if (h.includes('total') && h.includes('avail')) colMap.totalAvail = c;
        if (h.includes('planned') && h.includes('down')) colMap.plannedDown = c;
        if (h.includes('net') && h.includes('avail')) colMap.netAvail = c;
        if (h.includes('unplanned')) colMap.unplanned = c;
        if (h.includes('run') && h.includes('time')) colMap.runTime = c;
        if (h.includes('equip') && h.includes('avail')) colMap.avail = c;
        if (h.includes('total') && h.includes('parts')) colMap.totalParts = c;
        if (h.includes('perf') && h.includes('eff')) colMap.perf = c;
        if (h.includes('scrap')) colMap.scrap = c;
        if (h.includes('quality')) colMap.quality = c;
        if (h.includes('oee')) colMap.oee = c;
      }
    }

    // Detect machine name
    if (cell.includes('Machine:')) {
      currentMachine = cell.replace('Machine:', '').trim();
    }

    // Detect Sub Totals row
    if (cell.includes('Sub Totals') && currentMachine) {
      // Use detected colMap or fall back to known offsets from Python parser
      const pd = colMap ? row[colMap.plannedDown] : row[machineCol + 8];
      const na = colMap ? row[colMap.netAvail] : row[machineCol + 13];
      const un = colMap ? row[colMap.unplanned] : row[machineCol + 14];
      const rt = colMap ? row[colMap.runTime] : row[machineCol + 16];
      const av = colMap ? row[colMap.avail] : row[machineCol + 20];
      const tp = colMap ? row[colMap.totalParts] : row[machineCol + 22];
      const pe = colMap ? row[colMap.perf] : row[machineCol + 28];
      const qu = colMap ? row[colMap.quality] : row[machineCol + 32];
      const oe = colMap ? row[colMap.oee] : row[machineCol + 34];

      machines.push({
        machine: currentMachine,
        planned_down_h: toHrs(pd),
        net_avail_h: toHrs(na),
        unplanned_h: toHrs(un),
        run_h: toHrs(rt),
        avail: toNum(av),
        perf: toNum(pe),
        quality: toNum(qu),
        oee: toNum(oe),
        total_parts: parseInt(tp) || 0,
      });
    }
  }
  return machines;
}

// ── Parse Agility Breakdown Summary XLSX ─────────────────────────────────────
// Handles the AG3-007 Equipment Breakdown Summary export format:
//   Row with 'Code','Description','Site','Location','','Jobs',...,'Downtime Hours'
//   Then one 'Actual' row + one 'Average' row per machine
function parseAgilityBreakdownSummary(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const machines = [];
  let headerFound = false;

  for (const row of raw) {
    const c0 = row[0] != null ? String(row[0]).trim() : '';
    const c1 = row[1] != null ? String(row[1]).replace(/\n/g, ' ').trim() : '';
    const c4 = row[4] != null ? String(row[4]).trim() : '';

    // Find the header row
    if (!headerFound && c0 === 'Code') { headerFound = true; continue; }
    if (!headerFound) continue;

    // Only process 'Actual' rows that have a machine code
    if (c4 !== 'Actual' || !/^\d{4,}$/.test(c0)) continue;

    const numJobs = parseInt(row[5]) || 0;
    const downtimeHr = Math.round((parseFloat(row[10]) || 0) * 10) / 10;

    machines.push({
      code: c0,
      name: c1.replace(/\s+/g, ' '),
      cost_labour: 0,
      labour_hrs: 0,
      num_jobs: numJobs,
      downtime_hrs: downtimeHr,
      tpm_count: 0,
      breakdown_count: numJobs,
      breakdowns: [],
    });
  }

  return machines.filter(m => m.num_jobs > 0);
}

// ── Parse Agility XLSX ────────────────────────────────────────────────────────
function parseAgility(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets['Sheet2'] || wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]];
  if (!ws) throw new Error('Could not find data sheet in Agility file');

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // SheetJS column mapping (0-indexed):
  // Machine row: col[0]=assetCode, col[1]=machineName, col[2]=empty
  //              col[6]=costLabour, col[7]=labourHrs, col[10]=numJobs, col[11]=downtimeHrs
  // Job row:     col[0]=empty, col[1]=WONumber, col[2]=description
  //              col[6]=costLabour, col[7]=labourHrs, col[11]=downtimeHrs

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
        code: c0,
        name: c1.replace(/\s+/g, ' '),
        cost_labour: Math.round(parseFloat(row[6]) || 0),
        labour_hrs: Math.round((parseFloat(row[7]) || 0) * 10) / 10,
        num_jobs: parseInt(row[10]) || 0,
        downtime_hrs: Math.round((parseFloat(row[11]) || 0) * 10) / 10,
        tpm_count: 0,
        breakdown_count: 0,
        breakdowns: [],
      };

    } else if (isJobRow && current) {
      const isTpm = /tpm|preventive|planned service/i.test(c2);
      const dt = parseFloat(row[11]) || 0;
      const lh = parseFloat(row[7]) || 0;
      const lc = parseFloat(row[6]) || 0;

      if (isTpm) {
        current.tpm_count++;
      } else {
        current.breakdown_count++;
        if (dt > 0 || lh > 0.3) {
          current.breakdowns.push({
            wo: c1,
            desc: c2.slice(0, 80),
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
    m.breakdowns = m.breakdowns
      .sort((a, b) => b.downtime_hrs - a.downtime_hrs)
      .slice(0, 5);
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
            planned_down_h = EXCLUDED.planned_down_h,
            net_avail_h    = EXCLUDED.net_avail_h,
            unplanned_h    = EXCLUDED.unplanned_h,
            run_h          = EXCLUDED.run_h,
            avail          = EXCLUDED.avail,
            perf           = EXCLUDED.perf,
            quality        = EXCLUDED.quality,
            oee            = EXCLUDED.oee,
            total_parts    = EXCLUDED.total_parts,
            uploaded_at    = NOW()
        `, [weekLabel, m.machine, m.planned_down_h, m.net_avail_h, m.unplanned_h,
          m.run_h, m.avail, m.perf, m.quality, m.oee, m.total_parts]);
        inserted++;
      }
      res.json({ success: true, week: weekLabel, machines: inserted });
    } finally {
      client.release();
    }
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

    // Auto-detect format: Breakdown Summary (Sheet1 only) vs detailed job export (Sheet2)
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const isBreakdownSummary = !wb.SheetNames.includes('Sheet2') &&
      wb.SheetNames.length === 1;

    const machines = isBreakdownSummary
      ? parseAgilityBreakdownSummary(req.file.buffer)
      : parseAgility(req.file.buffer);
    if (!machines.length) return res.status(400).json({ error: 'No machine data found in file' });

    const client = await pool.connect();
    try {
      let inserted = 0;
      for (const m of machines) {
        await client.query(`
          INSERT INTO agility_data
            (period_label, code, name, cost_labour, labour_hrs, num_jobs,
             downtime_hrs, tpm_count, breakdown_count, breakdowns)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (period_label, code) DO UPDATE SET
            name            = EXCLUDED.name,
            cost_labour     = EXCLUDED.cost_labour,
            labour_hrs      = EXCLUDED.labour_hrs,
            num_jobs        = EXCLUDED.num_jobs,
            downtime_hrs    = EXCLUDED.downtime_hrs,
            tpm_count       = EXCLUDED.tpm_count,
            breakdown_count = EXCLUDED.breakdown_count,
            breakdowns      = EXCLUDED.breakdowns,
            uploaded_at     = NOW()
        `, [periodLabel, m.code, m.name, m.cost_labour, m.labour_hrs, m.num_jobs,
          m.downtime_hrs, m.tpm_count, m.breakdown_count, JSON.stringify(m.breakdowns)]);
        inserted++;
      }
      res.json({ success: true, period: periodLabel, machines: inserted });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Agility upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload/debug-agility ───────────────────────────────────────────
router.post('/debug-agility', upload.single('file'), async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets['Sheet2'] || wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    // Return first 30 rows showing all columns
    const sample = raw.slice(0, 30).map((row, i) => ({
      rowIndex: i,
      cols: row.map((c, ci) => ({ ci, val: c !== null ? String(c).slice(0, 30) : null })).filter(x => x.val)
    }));
    res.json({ sheets: wb.SheetNames, sample });
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
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Reset error:', err);
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
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Reset SFC error:', err);
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
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Reset Agility error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;