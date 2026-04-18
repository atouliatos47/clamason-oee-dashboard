// oee.js - Availability & OEE performance page (maintenance focus)

let oeeQuickFilter = 4;
let oeeTrendPeriod = null;
let _weekYearCache = null; // { weekLabel -> {year, month} }

// ── WEEK → YEAR/MONTH INFERENCE ───────────────────────────────────────────────
// Processes all weeks in state.weeks in order to assign years even when
// the label is just "Wk 15" with no year embedded.
function buildWeekYearMap() {
    if (_weekYearCache) return _weekYearCache;
    const map = {};
    const today = new Date();
    const allWks = state.weeks || [];

    // Try to find an explicit year anchor in any label
    let anchorYear = null;
    for (const w of allWks) {
        const m = String(w).match(/\b(20\d{2})\b/);
        if (m) { anchorYear = parseInt(m[1]); break; }
    }

    // If no explicit year found, infer from week numbers
    if (!anchorYear) {
        const nums = allWks.map(w => {
            const m = String(w).match(/wk\s*(\d+)/i);
            return m ? parseInt(m[1]) : null;
        }).filter(n => n !== null);
        const maxWk = nums.length ? Math.max(...nums) : 0;
        // If we have weeks going up to ~40+ the sequence likely starts last year
        anchorYear = maxWk > 30 ? today.getFullYear() - 1 : today.getFullYear();
    }

    let currentYear = anchorYear;
    let prevWkNum   = null;

    for (const w of allWks) {
        const s      = String(w).trim();
        const wkMatch = s.match(/wk\s*(\d+)/i);
        if (!wkMatch) { map[w] = null; continue; }

        const wkNum = parseInt(wkMatch[1]);

        // Explicit year overrides
        const yrMatch = s.match(/\b(20\d{2})\b/);
        if (yrMatch) {
            currentYear = parseInt(yrMatch[1]);
        } else if (prevWkNum !== null && wkNum < prevWkNum - 20) {
            // Week number rolled over → new year
            currentYear++;
        }

        // ISO week → calendar date
        const jan4     = new Date(currentYear, 0, 4);
        const dow      = jan4.getDay() || 7;
        const week1Mon = new Date(jan4);
        week1Mon.setDate(jan4.getDate() - (dow - 1));
        const weekMon  = new Date(week1Mon);
        weekMon.setDate(week1Mon.getDate() + (wkNum - 1) * 7);

        map[w]     = { year: weekMon.getFullYear(), month: weekMon.getMonth() };
        prevWkNum  = wkNum;
    }

    _weekYearCache = map;
    return map;
}

function getWeekYM(label) {
    return buildWeekYearMap()[label] || null;
}

function weekToPeriodKey(label) {
    const ym = getWeekYM(label);
    if (!ym) return null;
    const { year, month } = ym;
    const start = month >= 3 ? year : year - 1; // April starts period
    return `${start}-${start + 1}`;
}

// ── RENDER PAGE ───────────────────────────────────────────────────────────────
function renderOEEPage() {
    _weekYearCache = null; // reset cache on page render
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
    const wk     = state.currentWeek;
    const data   = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.net_avail_h > 0);

    const avgAvail   = active.length ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const avgOEE     = active.length ? active.reduce((s, d) => s + (+d.oee),   0) / active.length : 0;
    const avgPerf    = active.length ? active.reduce((s, d) => s + (+d.perf),  0) / active.length : 0;
    const totalUnpl  = data.reduce((s, d) => s + (+d.unplanned_h), 0);
    const wcTarget   = state.wcTarget || 65;
    const aboveAvail = active.filter(d => +d.avail >= wcTarget).length;
    const availCol   = avgAvail >= wcTarget ? '#27ae60' : avgAvail >= wcTarget * 0.95 ? '#e67e22' : '#c0392b';

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

    // Build year map for all weeks
    buildWeekYearMap();

    // Detect periods
    const periodSet = new Set();
    weeks.forEach(w => { const p = weekToPeriodKey(w); if (p) periodSet.add(p); });
    const periods = [...periodSet].sort();

    // Fallback if no periods detected (no year info at all)
    if (!periods.length) {
        container.innerHTML = `<div class="card" style="padding:20px;text-align:center;color:#aaa">
            Unable to determine year from week labels. Please include the year in week labels (e.g. "Wk 15 2026").</div>`;
        return;
    }

    if (!oeeTrendPeriod || !periods.includes(oeeTrendPeriod)) {
        oeeTrendPeriod = periods[periods.length - 1];
    }

    // Monthly buckets Apr…Mar
    const MONTH_NAMES = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    const [pyStart]   = oeeTrendPeriod.split('-').map(Number);

    const monthBuckets = {};
    MONTH_NAMES.forEach((_, idx) => {
        const yr = idx < 9 ? pyStart : pyStart + 1;
        const mo = (idx + 3) % 12;
        monthBuckets[`${yr}-${mo}`] = { avail: [], oee: [], perf: [], quality: [] };
    });

    weeks.filter(w => weekToPeriodKey(w) === oeeTrendPeriod).forEach(w => {
        const ym = getWeekYM(w);
        if (!ym) return;
        const key = `${ym.year}-${ym.month}`;
        if (!monthBuckets[key]) return;
        const data   = state.oeeData[w] || [];
        const active = data.filter(d => +d.net_avail_h > 0);
        if (!active.length) return;
        monthBuckets[key].avail.push(active.reduce((s, d) => s + +d.avail, 0) / active.length);
        monthBuckets[key].oee.push(active.reduce((s, d) => s + +d.oee, 0) / active.length);
        monthBuckets[key].perf.push(active.reduce((s, d) => s + +d.perf, 0) / active.length);
        monthBuckets[key].quality.push(active.reduce((s, d) => s + +d.quality, 0) / active.length);
    });

    function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }

    const monthKeys  = MONTH_NAMES.map((_, idx) => {
        const yr = idx < 9 ? pyStart : pyStart + 1;
        const mo = (idx + 3) % 12;
        return `${yr}-${mo}`;
    });

    const availPts   = monthKeys.map(k => avg(monthBuckets[k].avail));
    const oeePts     = monthKeys.map(k => avg(monthBuckets[k].oee));
    const perfPts    = monthKeys.map(k => avg(monthBuckets[k].perf));
    const qualityPts = monthKeys.map(k => avg(monthBuckets[k].quality));

    const febIdx = MONTH_NAMES.indexOf('Feb'); // 10

    // Check if any data at all
    const hasData = availPts.some(v => v !== null);
    if (!hasData) {
        // Fallback — show all weeks without grouping as a simple line chart
        renderOEESimpleTrend(container, target, periods);
        return;
    }

    // SVG
    const W = 880, H = 300;
    const padL = 50, padR = 20, padT = 24, padB = 50;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const n      = MONTH_NAMES.length;
    const barW   = chartW / n;
    const barPad = barW * 0.15;

    function xCenter(i) { return padL + i * barW + barW / 2; }
    function yOf(v)     { return padT + chartH - (Math.min(v, 100) / 100) * chartH; }

    // Feb shading
    let febShade = '';
    if (oeeTrendPeriod === '2025-2026') {
        const x1 = padL + febIdx * barW;
        febShade = `
            <rect x="${x1}" y="${padT}" width="${chartW - febIdx * barW}" height="${chartH}"
                fill="#95C11F" opacity="0.07" rx="2"/>
            <text x="${x1 + 4}" y="${padT + 13}" font-size="9" fill="#95C11F" font-weight="700">Since Feb 2026</text>`;
    }

    // Grid
    let gridSvg = '';
    [0, 20, 40, 60, 80, 100].forEach(pct => {
        const y  = yOf(pct);
        const isT = pct === target;
        gridSvg += `
            <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
                stroke="${isT ? '#c0392b' : '#f0f0f0'}" stroke-width="${isT ? 1.5 : 1}"
                stroke-dasharray="${isT ? '6,3' : ''}"/>
            <text x="${padL - 5}" y="${y + 4}" text-anchor="end" font-size="10"
                fill="${isT ? '#c0392b' : '#bbb'}" font-weight="${isT ? 700 : 400}">${pct}%</text>`;
    });
    if (target % 20 !== 0) {
        gridSvg += `<text x="${padL - 5}" y="${yOf(target) - 5}" text-anchor="end"
            font-size="9" fill="#c0392b" font-weight="700">T${target}%</text>`;
    }

    // X labels
    const xLabelsSvg = MONTH_NAMES.map((m, i) =>
        `<text x="${xCenter(i)}" y="${H - padB + 16}" text-anchor="middle" font-size="10" fill="#666">${m}</text>`
    ).join('');

    // OEE bars
    const barsSvg = oeePts.map((v, i) => {
        if (v === null) return '';
        const bh  = (v / 100) * chartH;
        const bx  = padL + i * barW + barPad;
        const bw  = barW - barPad * 2;
        const col = v >= target ? '#243547' : v >= target * 0.85 ? '#4a6b8a' : '#7a9bbf';
        return `<rect x="${bx}" y="${yOf(v)}" width="${bw}" height="${bh}"
            fill="${col}" opacity="0.85" rx="2"/>
            <text x="${bx + bw/2}" y="${yOf(v) - 4}" text-anchor="middle"
            font-size="9" fill="#555">${Math.round(v)}%</text>`;
    }).join('');

    // Line builder
    function buildLine(pts, col, strokeW, dash = '') {
        let out = '', seg = [];
        const flush = () => {
            if (seg.length > 1)
                out += `<polyline points="${seg.join(' ')}" fill="none" stroke="${col}"
                    stroke-width="${strokeW}" stroke-dasharray="${dash}"
                    stroke-linejoin="round" stroke-linecap="round"/>`;
            seg = [];
        };
        pts.forEach((v, i) => { if (v !== null) seg.push(`${xCenter(i)},${yOf(v)}`); else flush(); });
        flush();
        pts.forEach((v, i) => {
            if (v !== null)
                out += `<circle cx="${xCenter(i)}" cy="${yOf(v)}" r="${strokeW + 0.5}"
                    fill="${col}" stroke="#fff" stroke-width="1.5"/>`;
        });
        return out;
    }

    const qualityLine = buildLine(qualityPts, '#27ae60', 1.5, '4,3');
    const perfLine    = buildLine(perfPts,    '#e67e22', 1.5, '4,3');
    const availLine   = buildLine(availPts,   '#95C11F', 3.5);

    // Period tabs
    const tabsHtml = periods.map(p =>
        `<button onclick="setOEETrendPeriod('${p}')"
            style="padding:5px 14px;border-radius:16px;font-size:12px;font-weight:700;cursor:pointer;
                   border:1px solid ${p === oeeTrendPeriod ? '#243547' : '#ddd'};
                   background:${p === oeeTrendPeriod ? '#243547' : '#fff'};
                   color:${p === oeeTrendPeriod ? '#fff' : '#666'}">${p}</button>`
    ).join('');

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
        ${febShade}
        ${gridSvg}
        ${barsSvg}
        ${qualityLine}
        ${perfLine}
        ${availLine}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
        <line x1="${padL}" y1="${padT+chartH}" x2="${W-padR}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
        ${xLabelsSvg}
    </svg>`;

    container.innerHTML = `
    <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="margin-bottom:12px">
            <span class="card-title">📈 OEE — By Component</span>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${tabsHtml}</div>
        </div>
        <div style="overflow-x:auto">${svg}</div>
        <div style="display:flex;align-items:center;gap:20px;margin-top:10px;font-size:11px;color:#888;flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:18px;height:12px;background:#243547;opacity:0.85;border-radius:2px;display:inline-block"></span>
                OEE %
            </span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:28px;height:4px;background:#95C11F;border-radius:2px;display:inline-block"></span>
                Availability % <strong style="color:#95C11F">(focus)</strong>
            </span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:24px;height:2px;background:#e67e22;border-radius:2px;display:inline-block"></span>
                Performance %
            </span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:24px;height:2px;background:#27ae60;border-radius:2px;display:inline-block"></span>
                Quality %
            </span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:24px;height:1.5px;background:#c0392b;display:inline-block"></span>
                Target ${target}%
            </span>
            ${oeeTrendPeriod === '2025-2026' ? `<span style="display:flex;align-items:center;gap:5px">
                <span style="width:14px;height:14px;background:#95C11F;opacity:0.2;border-radius:2px;
                    display:inline-block;border:1px solid #95C11F"></span>
                Since Feb 2026
            </span>` : ''}
        </div>
    </div>`;
}

// Fallback: simple weekly line chart when monthly grouping yields no data
function renderOEESimpleTrend(container, target, periods) {
    const weeks  = state.weeks;
    const W = 880, H = 280, padL = 50, padR = 20, padT = 24, padB = 50;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const n = weeks.length;
    const xStep = chartW / Math.max(n - 1, 1);

    function xOf(i) { return padL + i * xStep; }
    function yOf(v) { return padT + chartH - (Math.min(v, 100) / 100) * chartH; }

    const availPts = weeks.map(w => {
        const d = state.oeeData[w] || [];
        const a = d.filter(x => +x.net_avail_h > 0);
        return a.length ? a.reduce((s, x) => s + +x.avail, 0) / a.length : null;
    });
    const oeePts = weeks.map(w => {
        const d = state.oeeData[w] || [];
        const a = d.filter(x => +x.oee > 0);
        return a.length ? a.reduce((s, x) => s + +x.oee, 0) / a.length : null;
    });

    let gridSvg = '';
    [0, 20, 40, 60, 80, 100].forEach(pct => {
        const y = yOf(pct), isT = pct === target;
        gridSvg += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}"
            stroke="${isT ? '#c0392b' : '#f0f0f0'}" stroke-width="${isT ? 1.5 : 1}"
            stroke-dasharray="${isT ? '6,3' : ''}"/>
            <text x="${padL-5}" y="${y+4}" text-anchor="end" font-size="10"
            fill="${isT ? '#c0392b' : '#bbb'}" font-weight="${isT ? 700 : 400}">${pct}%</text>`;
    });

    const xLabelsSvg = weeks.map((w, i) => {
        if (n > 20 && i % 4 !== 0) return '';
        const x = xOf(i), lbl = String(w).replace('Wk ', 'W').slice(0, 8);
        return `<text x="${x}" y="${H - padB + 16}" text-anchor="end"
            transform="rotate(-35,${x},${H - padB + 16})" font-size="9" fill="#888">${lbl}</text>`;
    }).join('');

    function buildLine(pts, col, strokeW, dash = '') {
        let out = '', seg = [];
        const flush = () => {
            if (seg.length > 1) out += `<polyline points="${seg.join(' ')}" fill="none" stroke="${col}"
                stroke-width="${strokeW}" stroke-dasharray="${dash}" stroke-linejoin="round"/>`;
            seg = [];
        };
        pts.forEach((v, i) => { if (v !== null) seg.push(`${xOf(i)},${yOf(v)}`); else flush(); });
        flush();
        pts.forEach((v, i) => { if (v !== null)
            out += `<circle cx="${xOf(i)}" cy="${yOf(v)}" r="3" fill="${col}" stroke="#fff" stroke-width="1.5"/>`;
        });
        return out;
    }

    const tabsHtml = periods.map(p =>
        `<button onclick="setOEETrendPeriod('${p}')"
            style="padding:5px 14px;border-radius:16px;font-size:12px;font-weight:700;cursor:pointer;
                   border:1px solid ${p === oeeTrendPeriod ? '#243547' : '#ddd'};
                   background:${p === oeeTrendPeriod ? '#243547' : '#fff'};
                   color:${p === oeeTrendPeriod ? '#fff' : '#666'}">${p}</button>`
    ).join('');

    const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
        ${gridSvg}
        ${buildLine(oeePts, '#243547', 1.5, '5,3')}
        ${buildLine(availPts, '#95C11F', 3.5)}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
        <line x1="${padL}" y1="${padT+chartH}" x2="${W-padR}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
        ${xLabelsSvg}
    </svg>`;

    container.innerHTML = `
    <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="margin-bottom:12px">
            <span class="card-title">📈 OEE — By Component (weekly)</span>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${tabsHtml}</div>
        </div>
        <div style="overflow-x:auto">${svg}</div>
        <div style="font-size:11px;color:#aaa;margin-top:8px;">
            Tip: include year in week labels (e.g. "Wk 15 2026") to enable monthly view with year tabs.
        </div>
    </div>`;
}

function setOEETrendPeriod(p) {
    oeeTrendPeriod = p;
    _weekYearCache = null;
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
    if (oeeQuickFilter > 0) visibleWeeks = state.weeks.slice(-oeeQuickFilter);

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

    const data   = [...(state.oeeData[wk] || [])];
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
