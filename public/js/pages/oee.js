// oee.js - Availability & OEE performance page (maintenance focus)

let oeeQuickFilter = 4; // default: last 4 weeks
let oeeTrendMachine = '__fleet__';

function renderOEEPage() {
    const select = document.getElementById('weekSelect');
    if (select) {
        select.innerHTML = state.weeks.map(w =>
            `<option value="${w}" ${w === state.currentWeek ? 'selected' : ''}>${w}</option>`
        ).join('');
    }
    renderOEEKPIs();
    renderOEETrendChart();
    renderOEETable();
}

function renderOEEKPIs() {
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.net_avail_h > 0);

    const avgAvail  = active.length ? active.reduce((s, d) => s + (+d.avail), 0)  / active.length : 0;
    const avgOEE    = active.length ? active.reduce((s, d) => s + (+d.oee), 0)    / active.length : 0;
    const avgPerf   = active.length ? active.reduce((s, d) => s + (+d.perf), 0)   / active.length : 0;
    const totalUnpl = data.reduce((s, d) => s + (+d.unplanned_h), 0);
    const wcTarget  = state.wcTarget || 65;
    const aboveAvail = active.filter(d => +d.avail >= wcTarget).length;
    const availCol  = avgAvail >= wcTarget ? '#27ae60' : avgAvail >= wcTarget * 0.95 ? '#e67e22' : '#c0392b';

    const grid = document.getElementById('oeeKpiGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="kpi-card" style="border-left-color:${availCol}">
            <div class="kpi-label">Equipment Avg Availability</div>
            <div class="kpi-value" style="color:${availCol}">${fmt1(avgAvail)}%</div>
            <div class="kpi-sub">target ${wcTarget}% · ${wk || '—'}</div>
        </div>
        <div class="kpi-card" style="border-left-color:#27ae60">
            <div class="kpi-label">Above Avail Target</div>
            <div class="kpi-value" style="color:#27ae60">${aboveAvail} / ${active.length}</div>
            <div class="kpi-sub">machines ≥ ${wcTarget}% availability</div>
        </div>
        <div class="kpi-card" style="border-left-color:#c0392b">
            <div class="kpi-label">Total Unplanned Down</div>
            <div class="kpi-value" style="color:#c0392b">${fmtH(totalUnpl)}</div>
            <div class="kpi-sub">all presses this week</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Equipment Avg OEE</div>
            <div class="kpi-value" style="color:${avgOEE >= wcTarget ? '#27ae60' : '#c0392b'}">${fmt1(avgOEE)}%</div>
            <div class="kpi-sub">active machines · ${wk || '—'}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Equipment Avg Performance</div>
            <div class="kpi-value">${fmt1(avgPerf)}%</div>
            <div class="kpi-sub">active machines</div>
        </div>`;
}

// ── TREND CHART ───────────────────────────────────────────────────────────────
function renderOEETrendChart() {
    const container = document.getElementById('oeeTrendChart');
    if (!container) return;

    const weeks = state.weeks;
    if (weeks.length < 2) {
        container.innerHTML = `<div class="card" style="padding:20px;text-align:center;color:#aaa">
            Upload at least 2 weeks of SFC data to see trends</div>`;
        return;
    }

    const target = state.wcTarget || 65;

    // Build machine list for selector
    const allMachines = [...new Set(
        weeks.flatMap(w => (state.oeeData[w] || []).map(d => d.machine))
    )].sort();

    // Get data points for selected machine or fleet
    const availPoints = weeks.map(w => {
        const data = state.oeeData[w] || [];
        if (oeeTrendMachine === '__fleet__') {
            const active = data.filter(d => +d.net_avail_h > 0);
            return active.length ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : null;
        } else {
            const row = data.find(d => d.machine === oeeTrendMachine);
            return row ? +row.avail : null;
        }
    });

    const oeePoints = weeks.map(w => {
        const data = state.oeeData[w] || [];
        if (oeeTrendMachine === '__fleet__') {
            const active = data.filter(d => +d.oee > 0);
            return active.length ? active.reduce((s, d) => s + (+d.oee), 0) / active.length : null;
        } else {
            const row = data.find(d => d.machine === oeeTrendMachine);
            return row ? +row.oee : null;
        }
    });

    // Detect "since Feb 2026" — find first week index that is Feb 2026 or later
    // Week labels may be "Wk 6 2026", "2026-W06", or date strings — try to detect
    const febIndex = weeks.findIndex(w => {
        const s = String(w);
        // Match patterns like "Wk 6 2026", "Wk 7 2026" ... "Wk 52 2026" after Feb
        if (/wk\s*([0-9]+)\s*2026/i.test(s)) {
            const wkNum = parseInt(s.match(/wk\s*([0-9]+)/i)[1]);
            return wkNum >= 5; // week 5 is ~Feb
        }
        // ISO week: 2026-W05
        if (/2026-W([0-9]+)/i.test(s)) {
            return parseInt(s.match(/W([0-9]+)/i)[1]) >= 5;
        }
        // Date string containing 2026
        if (s.includes('2026')) return true;
        return false;
    });

    // SVG dimensions
    const W = 860, H = 260;
    const padL = 48, padR = 20, padT = 20, padB = 50;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const n = weeks.length;
    const xStep = chartW / Math.max(n - 1, 1);

    function xOf(i) { return padL + i * xStep; }
    function yOf(v) { return padT + chartH - (Math.min(v, 100) / 100) * chartH; }

    // Feb shading
    let febShade = '';
    if (febIndex >= 0) {
        const x1 = xOf(febIndex);
        febShade = `<rect x="${x1}" y="${padT}" width="${W - padR - x1}" height="${chartH}"
            fill="#95C11F" opacity="0.08" rx="2"/>
            <text x="${x1 + 6}" y="${padT + 14}" font-size="10" fill="#95C11F" font-weight="700">Since Feb 2026</text>`;
    }

    // Grid lines & Y labels
    let grid = '';
    [0, 25, 50, 65, 75, 100].forEach(pct => {
        const y = yOf(pct);
        const isTarget = pct === target;
        grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
            stroke="${isTarget ? '#c0392b' : '#f0f0f0'}"
            stroke-width="${isTarget ? 1.5 : 1}"
            stroke-dasharray="${isTarget ? '6,3' : 'none'}"/>
            <text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="10"
            fill="${isTarget ? '#c0392b' : '#aaa'}"
            font-weight="${isTarget ? 700 : 400}">${pct}%</text>`;
    });
    grid += `<text x="${padL - 6}" y="${yOf(target) - 6}" text-anchor="end" font-size="9"
        fill="#c0392b" font-weight="700">Target</text>`;

    // X labels — show every other week if crowded
    let xLabels = '';
    weeks.forEach((w, i) => {
        if (n > 12 && i % 2 !== 0) return;
        const x = xOf(i);
        const label = String(w).replace('Wk ', 'W').slice(0, 10);
        xLabels += `<text x="${x}" y="${H - padB + 16}" text-anchor="end"
            transform="rotate(-35,${x},${H - padB + 16})"
            font-size="9" fill="#888">${label}</text>`;
    });

    // Build polyline points, skip nulls
    function buildLine(points, col, dash = '') {
        let path = '';
        let segments = [];
        let seg = [];
        points.forEach((v, i) => {
            if (v !== null) {
                seg.push(`${xOf(i)},${yOf(v)}`);
            } else {
                if (seg.length > 1) segments.push(seg);
                seg = [];
            }
        });
        if (seg.length > 1) segments.push(seg);
        segments.forEach(s => {
            path += `<polyline points="${s.join(' ')}" fill="none" stroke="${col}"
                stroke-width="2.5" stroke-dasharray="${dash}" stroke-linejoin="round"/>`;
        });
        // dots
        points.forEach((v, i) => {
            if (v !== null) {
                path += `<circle cx="${xOf(i)}" cy="${yOf(v)}" r="3.5"
                    fill="${col}" stroke="#fff" stroke-width="1.5"/>`;
            }
        });
        return path;
    }

    const availLine = buildLine(availPoints, '#95C11F');
    const oeeLine   = buildLine(oeePoints,   '#243547', '5,3');

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
         style="width:100%;height:auto;display:block">
        ${febShade}
        ${grid}
        ${availLine}
        ${oeeLine}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#ddd" stroke-width="1"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#ddd" stroke-width="1"/>
        ${xLabels}
    </svg>`;

    // Machine selector options
    const machineOptions = `
        <option value="__fleet__">Fleet Average</option>
        ${allMachines.map(m => `<option value="${m}" ${m === oeeTrendMachine ? 'selected' : ''}>${m}</option>`).join('')}`;

    container.innerHTML = `
    <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="margin-bottom:12px">
            <span class="card-title">📈 Availability &amp; OEE Trend</span>
            <div style="display:flex;align-items:center;gap:10px;">
                <select onchange="setOEETrendMachine(this.value)"
                    style="padding:5px 10px;border-radius:6px;border:1px solid #ddd;
                           font-size:12px;color:#243547;cursor:pointer">
                    ${machineOptions}
                </select>
            </div>
        </div>
        <div style="overflow-x:auto">${svg}</div>
        <div style="display:flex;align-items:center;gap:20px;margin-top:10px;font-size:11px;color:#888;flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:24px;height:3px;background:#95C11F;border-radius:2px;display:inline-block"></span>
                Availability %
            </span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:24px;height:3px;background:#243547;border-radius:2px;display:inline-block;
                    background: repeating-linear-gradient(to right,#243547 0,#243547 5px,transparent 5px,transparent 8px)"></span>
                OEE %
            </span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:24px;height:2px;background:#c0392b;border-radius:2px;display:inline-block"></span>
                Target ${target}%
            </span>
            ${febIndex >= 0 ? `<span style="display:flex;align-items:center;gap:5px">
                <span style="width:14px;height:14px;background:#95C11F;opacity:0.25;border-radius:2px;display:inline-block;border:1px solid #95C11F"></span>
                Your period (Feb 2026 →)
            </span>` : ''}
        </div>
    </div>`;
}

function setOEETrendMachine(val) {
    oeeTrendMachine = val;
    renderOEETrendChart();
}

// ── WEEK FILTERS ──────────────────────────────────────────────────────────────
function setWeekFromSelect(wk) {
    state.currentWeek = wk;
    document.querySelectorAll('#quickFilters .week-tab').forEach(t => t.classList.remove('active'));
    renderOEEKPIs();
    renderOEETable();
}

function setQuickFilter(n, btn) {
    oeeQuickFilter = n;
    document.querySelectorAll('#quickFilters .week-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (state.weeks.length) {
        state.currentWeek = state.weeks[state.weeks.length - 1];
        const select = document.getElementById('weekSelect');
        if (select) select.value = state.currentWeek;
    }
    renderOEEKPIs();
    renderOEETable();
}

function getOEEFiltered() {
    let visibleWeeks = state.weeks;
    if (oeeQuickFilter > 0) {
        visibleWeeks = state.weeks.slice(-oeeQuickFilter);
    }

    const wk = visibleWeeks.includes(state.currentWeek)
        ? state.currentWeek
        : visibleWeeks[visibleWeeks.length - 1] || state.currentWeek;

    const select = document.getElementById('weekSelect');
    if (select && select.value !== wk) {
        select.innerHTML = visibleWeeks.map(w =>
            `<option value="${w}" ${w === wk ? 'selected' : ''}>${w}</option>`
        ).join('');
        state.currentWeek = wk;
    }

    const data = [...(state.oeeData[wk] || [])];
    const search = document.getElementById('oeeSearch')?.value.toLowerCase() || '';
    const type   = document.getElementById('oeeTypeFilter')?.value || '';
    const band   = document.getElementById('oeeBandFilter')?.value || '';

    return data
        .filter(d => !search || d.machine.toLowerCase().includes(search))
        .filter(d => !type || d.machine.includes(type))
        .filter(d => {
            if (!band) return true;
            const v = +d.avail;
            if (band === 'good') return v >= 85;
            if (band === 'ok')   return v >= 70 && v < 85;
            if (band === 'low')  return v >= 50 && v < 70;
            if (band === 'poor') return v > 0 && v < 50;
            return true;
        })
        .sort((a, b) => {
            const av = a[state.sortOEECol] ?? 0, bv = b[state.sortOEECol] ?? 0;
            return (av > bv ? 1 : -1) * state.sortOEEDir;
        });
}

function renderOEETable() {
    const data   = getOEEFiltered();
    const target = state.wcTarget || 65;
    const tbody  = document.getElementById('oeeTableBody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#aaa">No data</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(d => {
        const availCol = +d.avail >= target ? '#27ae60'
            : +d.avail >= target * 0.9 ? '#e67e22' : +d.avail > 0 ? '#c0392b' : '#ccc';
        return `
        <tr onclick="showPage('detail',${JSON.stringify({ ...d, type: 'oee' }).replace(/"/g, '&quot;')})">
            <td class="name-cell">${d.machine}</td>
            <td style="color:${+d.unplanned_h > 20 ? '#c0392b' : +d.unplanned_h > 10 ? '#e67e22' : 'inherit'};
                font-weight:${+d.unplanned_h > 20 ? 700 : 400}">${fmtH(d.unplanned_h)}</td>
            <td><span style="font-weight:700;color:${availCol}">${fmt1(d.avail)}%</span></td>
            <td>${fmt1(d.perf)}%</td>
            <td><span class="badge ${oeeBadgeClass(d.oee)}">${fmt1(d.oee)}%</span></td>
            <td>${fmtH(d.planned_down_h)}</td>
            <td>${fmtH(d.run_h)}</td>
        </tr>`;
    }).join('');
}

function sortOEE(col) {
    state.sortOEEDir = state.sortOEECol === col ? state.sortOEEDir * -1 : -1;
    state.sortOEECol = col;
    renderOEETable();
}
