// oee.js - OEE performance page

let oeeQuickFilter = 4; // default: last 4 weeks

function renderOEEPage() {
    const select = document.getElementById('weekSelect');
    if (select) {
        select.innerHTML = state.weeks.map(w =>
            `<option value="${w}" ${w === state.currentWeek ? 'selected' : ''}>${w}</option>`
        ).join('');
    }
    renderOEEKPIs();
    renderOEETable();
}

function renderOEEKPIs() {
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);
    const allActive = data.filter(d => +d.net_avail_h > 0);

    const avgOEE = active.length ? active.reduce((s, d) => s + (+d.oee), 0) / active.length : 0;
    const avgAvail = active.length ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const avgPerf = active.length ? active.reduce((s, d) => s + (+d.perf), 0) / active.length : 0;
    const avgQual = active.length ? active.reduce((s, d) => s + (+d.quality), 0) / active.length : 0;
    const totalUnpl = data.reduce((s, d) => s + (+d.unplanned_h), 0);
    const totalParts = data.reduce((s, d) => s + (+d.total_parts), 0);
    const wcTarget = state.wcTarget || 65;
    const aboveWC = active.filter(d => +d.oee >= wcTarget).length;

    const grid = document.getElementById('oeeKpiGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-label">Fleet Avg OEE</div>
            <div class="kpi-value" style="color:${oeeColor(avgOEE)}">${fmt1(avgOEE)}%</div>
            <div class="kpi-sub">active machines · ${wk || '—'}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Fleet Avg Availability</div>
            <div class="kpi-value">${fmt1(avgAvail)}%</div>
            <div class="kpi-sub">active machines</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Fleet Avg Performance</div>
            <div class="kpi-value">${fmt1(avgPerf)}%</div>
            <div class="kpi-sub">active machines</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Fleet Avg Quality</div>
            <div class="kpi-value">${fmt1(avgQual)}%</div>
            <div class="kpi-sub">active machines</div>
        </div>
        <div class="kpi-card" style="border-left-color:#c0392b">
            <div class="kpi-label">Total Unplanned Down</div>
            <div class="kpi-value" style="color:#c0392b">${fmtH(totalUnpl)}</div>
            <div class="kpi-sub">all presses this week</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Parts Made</div>
            <div class="kpi-value">${fmtN(totalParts)}</div>
            <div class="kpi-sub">total this week</div>
        </div>
        <div class="kpi-card" style="border-left-color:#27ae60">
            <div class="kpi-label">At World Class (${wcTarget}%)</div>
            <div class="kpi-value" style="color:#27ae60">${aboveWC} / ${allActive.length}</div>
            <div class="kpi-sub">machines ≥ ${wcTarget}% OEE</div>
        </div>`;
}

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
    const type = document.getElementById('oeeTypeFilter')?.value || '';
    const band = document.getElementById('oeeBandFilter')?.value || '';

    return data
        .filter(d => !search || d.machine.toLowerCase().includes(search))
        .filter(d => !type || d.machine.includes(type))
        .filter(d => {
            if (!band) return true;
            const v = +d.oee;
            if (band === 'good') return v >= 85;
            if (band === 'ok') return v >= 70 && v < 85;
            if (band === 'low') return v >= 50 && v < 70;
            if (band === 'poor') return v > 0 && v < 50;
            return true;
        })
        .sort((a, b) => {
            const av = a[state.sortOEECol] ?? 0, bv = b[state.sortOEECol] ?? 0;
            return (av > bv ? 1 : -1) * state.sortOEEDir;
        });
}

function renderOEETable() {
    const data = getOEEFiltered();
    const tbody = document.getElementById('oeeTableBody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#aaa">No data</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(d => `
        <tr onclick="showPage('detail',${JSON.stringify({ ...d, type: 'oee' }).replace(/"/g, '&quot;')})">
            <td class="name-cell">${d.machine}</td>
            <td style="color:${+d.unplanned_h > 20 ? '#c0392b' : +d.unplanned_h > 10 ? '#e67e22' : 'inherit'};font-weight:${+d.unplanned_h > 20 ? 700 : 400}">${fmtH(d.unplanned_h)}</td>
            <td>${fmt1(d.avail)}%</td>
            <td>${fmt1(d.perf)}%</td>
            <td>${fmt1(d.quality)}%</td>
            <td><span class="badge ${oeeBadgeClass(d.oee)}">${fmt1(d.oee)}%</span></td>
            <td>${fmtN(d.total_parts)}</td>
            <td>${fmtH(d.planned_down_h)}</td>
            <td>${fmtH(d.run_h)}</td>
        </tr>`).join('');
}

function sortOEE(col) {
    state.sortOEEDir = state.sortOEECol === col ? state.sortOEEDir * -1 : -1;
    state.sortOEECol = col;
    renderOEETable();
}