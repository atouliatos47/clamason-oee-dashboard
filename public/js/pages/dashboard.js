// dashboard.js - Dashboard page with KPIs and charts

// World Class target — stored in state so it persists during session
if (!state.wcTarget) state.wcTarget = 65;

function renderDashboard() {
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);
    const allActive = data.filter(d => +d.net_avail_h > 0).length;

    // SFC KPIs
    const avgOEE = active.length ? active.reduce((s, d) => s + (+d.oee), 0) / active.length : 0;
    const avgAvail = active.length ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const totalUnpl = data.reduce((s, d) => s + (+d.unplanned_h), 0);
    const totalParts = data.reduce((s, d) => s + (+d.total_parts), 0);
    const aboveWC = active.filter(d => +d.oee >= state.wcTarget).length;

    // Agility KPIs
    const maint = state.maintData || [];
    const totalDT = maint.reduce((s, m) => s + (+m.downtime_hrs), 0);
    const totalCost = maint.reduce((s, m) => s + (+m.cost_labour), 0);
    const totalBDs = maint.reduce((s, m) => s + (+m.breakdown_count), 0);
    const worstMaint = [...maint].sort((a, b) => +b.downtime_hrs - +a.downtime_hrs)[0];

    // ── KPI GRID ──
    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Avg OEE</div>
            <div class="kpi-value" style="color:${avgOEE >= state.wcTarget ? '#27ae60' : avgOEE >= state.wcTarget * 0.95 ? '#e67e22' : '#c0392b'}">${fmt1(avgOEE)}%</div>
            <div class="kpi-sub">active machines · target ${state.wcTarget}%</div>
        </div>
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Avg Availability</div>
            <div class="kpi-value">${fmt1(avgAvail)}%</div>
            <div class="kpi-sub">active machines this week</div>
        </div>
        <div class="kpi-card" style="border-left-color:#c0392b;cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Unplanned Downtime</div>
            <div class="kpi-value" style="color:#c0392b">${fmtH(totalUnpl)}</div>
            <div class="kpi-sub">all presses this week</div>
        </div>
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Parts Made</div>
            <div class="kpi-value">${fmtN(totalParts)}</div>
            <div class="kpi-sub">total across all machines</div>
        </div>
        <div class="kpi-card" style="border-left-color:#27ae60;cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">At World Class
                <span onclick="event.stopPropagation();editWCTarget()" 
                      title="Click to change target"
                      style="margin-left:6px;font-size:10px;color:#95C11F;cursor:pointer;font-weight:700;">✎ ${state.wcTarget}%</span>
            </div>
            <div class="kpi-value" style="color:#27ae60">${aboveWC} / ${allActive}</div>
            <div class="kpi-sub">machines ≥ ${state.wcTarget}% OEE</div>
        </div>
        <div class="kpi-card" style="border-left-color:#e67e22;cursor:pointer" onclick="showPage('maintenance')">
            <div class="kpi-label">Annual Downtime</div>
            <div class="kpi-value" style="color:#e67e22">${Math.round(totalDT).toLocaleString()}h</div>
            <div class="kpi-sub">${maint[0]?.period_label || 'from Agility'}</div>
        </div>
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('maintenance')">
            <div class="kpi-label">Maintenance Cost</div>
            <div class="kpi-value">${fmtK(totalCost)}</div>
            <div class="kpi-sub">annual labour cost</div>
        </div>
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('maintenance')">
            <div class="kpi-label">Total Breakdowns</div>
            <div class="kpi-value">${totalBDs}</div>
            <div class="kpi-sub">recorded this period</div>
        </div>
        ${worstMaint ? `
        <div class="kpi-card" style="border-left-color:#c0392b;cursor:pointer" onclick="showPage('detail',${JSON.stringify({ ...worstMaint, type: 'maint' }).replace(/"/g, '&quot;')})">
            <div class="kpi-label">Worst Asset</div>
            <div class="kpi-value" style="font-size:14px;color:#c0392b">${worstMaint.name.length > 20 ? worstMaint.name.slice(0, 18) + '…' : worstMaint.name}</div>
            <div class="kpi-sub">${Math.round(+worstMaint.downtime_hrs)}h downtime · click to view</div>
        </div>` : ''}`;

    document.getElementById('latestWeekLabel').textContent = wk || '—';

    // ── TWO COLUMN LAYOUT: OEE Chart + Top 5 Downtime ──
    const oeeSection = document.getElementById('oeeBarChart');
    const top5Section = document.getElementById('top5Downtime');

    if (!data.length) {
        oeeSection.innerHTML = emptyState('No data yet — upload your first SFC report');
    } else {
        const sorted = [...data].sort((a, b) => +b.oee - +a.oee);
        oeeSection.innerHTML = sorted.map(d => `
            <div class="bar-row">
                <div class="bar-machine-name" title="${d.machine}">${d.machine}</div>
                <div class="bar-track" style="cursor:pointer" onclick="showPage('detail',${JSON.stringify({ ...d, type: 'oee' }).replace(/"/g, '&quot;')})">
                    <div class="bar-fill" style="width:${Math.min(+d.oee, 100)}%;background:${oeeColor(+d.oee)};"></div>
                    <div class="wc-line" style="left:${state.wcTarget}%" title="World class ${state.wcTarget}%"></div>
                </div>
                <span class="bar-value-out">${+d.oee > 0 ? fmt1(d.oee) + '%' : ''}</span>
            </div>`).join('');
    }

    if (top5Section) {
        const top5 = [...maint].filter(m => +m.downtime_hrs > 0)
            .sort((a, b) => +b.downtime_hrs - +a.downtime_hrs).slice(0, 5);
        const maxDT = +top5[0]?.downtime_hrs || 1;
        top5Section.innerHTML = top5.length ? top5.map(m => {
            const pct = (+m.downtime_hrs / maxDT) * 100;
            const col = +m.downtime_hrs >= 500 ? '#c0392b' : +m.downtime_hrs >= 200 ? '#e67e22' : '#e6b800';
            return `<div class="bar-row">
                <div class="bar-machine-name" title="${m.name}">${m.name}</div>
                <div class="bar-track" style="cursor:pointer" onclick="showPage('detail',${JSON.stringify({ ...m, type: 'maint' }).replace(/"/g, '&quot;')})">
                    <div class="bar-fill" style="width:${pct}%;background:${col};"></div>
                </div>
                <span class="bar-value-out">${Math.round(+m.downtime_hrs)}h</span>
            </div>`;
        }).join('') : emptyState('No Agility data — upload an AG3-601 report');
    }

    // ── SPARKLINES ──
    const allMachines = [...new Set(state.weeks.flatMap(w => (state.oeeData[w] || []).map(d => d.machine)))].sort();
    if (!allMachines.length) {
        document.getElementById('sparkGrid').innerHTML = emptyState('Upload at least 2 weeks to see trends');
    } else {
        document.getElementById('sparkGrid').innerHTML = allMachines.map(m => {
            const vals = state.weeks.map(w => { const r = (state.oeeData[w] || []).find(d => d.machine === m); return r ? +r.oee : null; });
            const bars = state.weeks.map((w, i) => {
                const v = vals[i];
                if (v === null) return `<div class="spark-bar" style="flex:1;background:#eee;"></div>`;
                return `<div class="spark-bar" style="flex:1;height:${Math.max((v / 100) * 36, 1)}px;background:${oeeColor(v)};"></div>`;
            }).join('');
            const latest = vals[vals.length - 1];
            return `<div class="spark-card" onclick="showPage('detail',${JSON.stringify({ machine: m, type: 'trend' }).replace(/"/g, '&quot;')})">
                <div class="spark-name">${m}</div>
                <div class="spark-bars">${bars}</div>
                <div class="spark-latest">Latest: <strong>${latest !== null ? fmt1(latest) + '%' : '—'}</strong></div>
            </div>`;
        }).join('');
    }
}

function editWCTarget() {
    const val = prompt(`Set World Class OEE target (%)\nCurrent: ${state.wcTarget}%`, state.wcTarget);
    if (val && !isNaN(val) && +val > 0 && +val <= 100) {
        state.wcTarget = +val;
        renderDashboard();
        showToast(`✅ World Class target set to ${state.wcTarget}%`, 'success');
    }
}