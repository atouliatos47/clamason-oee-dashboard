// oee.js - OEE & Availability per machine bar chart

let oeeQuickFilter = 4;

function renderOEEPage() {
    const select = document.getElementById('weekSelect');
    if (select) {
        select.innerHTML = state.weeks.map(w =>
            `<option value="${w}" ${w === state.currentWeek ? 'selected' : ''}>${w}</option>`
        ).join('');
    }
    renderOEEKPIs();
    renderOEEBars();
    renderOEETable();
}

// ── KPI STRIP ─────────────────────────────────────────────────────────────────
function renderOEEKPIs() {
    const wk     = state.currentWeek;
    const data   = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.net_avail_h > 0);

    const avgAvail   = active.length ? active.reduce((s, d) => s + +d.avail, 0) / active.length : 0;
    const avgOEE     = active.length ? active.reduce((s, d) => s + +d.oee,   0) / active.length : 0;
    const avgPerf    = active.length ? active.reduce((s, d) => s + +d.perf,  0) / active.length : 0;
    const totalUnpl  = data.reduce((s, d) => s + +d.unplanned_h, 0);
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

// ── BAR CHART ─────────────────────────────────────────────────────────────────
function renderOEEBars() {
    const el = document.getElementById('oeeBarsChart');
    if (!el) return;

    const wk     = state.currentWeek;
    const data   = wk ? (state.oeeData[wk] || []) : [];
    const target = state.wcTarget || 65;

    const active = data
        .filter(d => +d.net_avail_h > 0)
        .sort((a, b) => +b.avail - +a.avail); // sorted by availability

    if (!active.length) {
        el.innerHTML = `<div style="padding:30px;text-align:center;color:#aaa">No data for ${wk || 'this week'}</div>`;
        return;
    }

    const rows = active.map(d => {
        const avail = Math.min(+d.avail, 100);
        const oee   = Math.min(+d.oee,   100);
        const availCol = avail >= target ? '#95C11F' : avail >= target * 0.9 ? '#e67e22' : '#c0392b';
        const oeeCol   = oee   >= target ? '#243547' : oee   >= target * 0.85 ? '#4a6b8a' : '#7a9bbf';

        return `
        <div class="bar-row" style="margin-bottom:10px;cursor:pointer"
             onclick="showPage('detail',${JSON.stringify({ ...d, type: 'oee' }).replace(/"/g, '&quot;')})">
            <div class="bar-machine-name" title="${d.machine}">${d.machine}</div>
            <div style="flex:1;position:relative">
                <!-- Availability bar -->
                <div style="display:flex;align-items:center;margin-bottom:3px">
                    <div style="position:relative;flex:1;height:14px;background:#f0f0f0;border-radius:3px;overflow:visible">
                        <div style="width:${avail}%;height:100%;background:${availCol};border-radius:3px;
                            transition:width .4s"></div>
                        <!-- target line -->
                        <div style="position:absolute;top:-2px;bottom:-2px;left:${target}%;
                            width:2px;background:#c0392b;border-radius:1px"></div>
                    </div>
                    <span style="width:46px;text-align:right;font-size:12px;font-weight:700;
                        color:${availCol};margin-left:6px">${fmt1(avail)}%</span>
                </div>
                <!-- OEE bar -->
                <div style="display:flex;align-items:center">
                    <div style="position:relative;flex:1;height:10px;background:#f0f0f0;border-radius:3px;overflow:visible">
                        <div style="width:${oee}%;height:100%;background:${oeeCol};border-radius:3px;
                            opacity:0.85;transition:width .4s"></div>
                        <!-- target line -->
                        <div style="position:absolute;top:-2px;bottom:-2px;left:${target}%;
                            width:2px;background:#c0392b;border-radius:1px"></div>
                    </div>
                    <span style="width:46px;text-align:right;font-size:11px;color:${oeeCol};
                        margin-left:6px">${fmt1(oee)}%</span>
                </div>
            </div>
        </div>`;
    }).join('');

    el.innerHTML = `
        <div style="margin-bottom:12px;display:flex;align-items:center;gap:20px;font-size:11px;color:#888;flex-wrap:wrap;">
            <span><strong style="font-size:13px">OEE &amp; Availability — ${wk || '—'}</strong></span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:18px;height:10px;background:#95C11F;border-radius:2px;display:inline-block"></span>
                Availability %
            </span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:18px;height:8px;background:#243547;border-radius:2px;display:inline-block;opacity:.85"></span>
                OEE %
            </span>
            <span style="display:flex;align-items:center;gap:5px">
                <span style="width:3px;height:16px;background:#c0392b;border-radius:1px;display:inline-block"></span>
                Target ${target}%
            </span>
        </div>
        ${rows}`;
}

// ── WEEK FILTERS ──────────────────────────────────────────────────────────────
function setWeekFromSelect(wk) {
    state.currentWeek = wk;
    document.querySelectorAll('#quickFilters .week-tab').forEach(t => t.classList.remove('active'));
    renderOEEKPIs();
    renderOEEBars();
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
    renderOEEBars();
    renderOEETable();
}

// ── TABLE ─────────────────────────────────────────────────────────────────────
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
    const band   = document.getElementById('oeeBandFilter')?.value || '';

    return data
        .filter(d => !search || d.machine.toLowerCase().includes(search))
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
