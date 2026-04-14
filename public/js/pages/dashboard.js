// dashboard.js - Dashboard page with KPIs and charts

function renderDashboard() {
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);

    // KPIs
    const avgOEE = active.length ? active.reduce((s,d)=>s+(+d.oee),0)/active.length : 0;
    const avgAvail = active.length ? active.reduce((s,d)=>s+(+d.avail),0)/active.length : 0;
    const totalUnpl = data.reduce((s,d)=>s+(+d.unplanned_h),0);
    const totalParts = data.reduce((s,d)=>s+(+d.total_parts),0);
    const above85 = active.filter(d=>+d.oee>=85).length;
    const allActive = data.filter(d=>+d.net_avail_h>0).length;

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-label">Avg OEE</div>
            <div class="kpi-value" style="color:${oeeColor(avgOEE)}">${fmt1(avgOEE)}%</div>
            <div class="kpi-sub">active machines · target 85%</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Avg Availability</div>
            <div class="kpi-value">${fmt1(avgAvail)}%</div>
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
            <div class="kpi-sub">total across all machines</div>
        </div>
        <div class="kpi-card" style="border-left-color:#27ae60">
            <div class="kpi-label">At World Class</div>
            <div class="kpi-value" style="color:#27ae60">${above85} / ${allActive}</div>
            <div class="kpi-sub">machines ≥ 85% OEE</div>
        </div>`;

    document.getElementById('latestWeekLabel').textContent = wk || '—';

    // Bar chart
    if (!data.length) {
        document.getElementById('oeeBarChart').innerHTML = emptyState('No data yet — upload your first SFC report');
    } else {
        const sorted = [...data].sort((a,b) => +b.oee - +a.oee);
        document.getElementById('oeeBarChart').innerHTML = sorted.map(d => {
            return `<div class="bar-row">
                <div class="bar-machine-name" title="${d.machine}">${d.machine}</div>
                <div class="bar-track" style="cursor:pointer" onclick="showPage('detail', ${JSON.stringify({...d, type:'oee'}).replace(/"/g,'&quot;')})">
                    <div class="bar-fill" style="width:${Math.min(+d.oee,100)}%;background:${oeeColor(+d.oee)};"></div>
                    <div class="wc-line" title="World class 85%"></div>
                </div>
                <span class="bar-value-out">${+d.oee > 0 ? fmt1(d.oee)+'%' : ''}</span>
            </div>`;
        }).join('');
    }

    // Sparklines
    const allMachines = [...new Set(state.weeks.flatMap(w => (state.oeeData[w]||[]).map(d=>d.machine)))].sort();
    if (!allMachines.length) {
        document.getElementById('sparkGrid').innerHTML = emptyState('Upload at least 2 weeks to see trends');
    } else {
        document.getElementById('sparkGrid').innerHTML = allMachines.map(m => {
            const vals = state.weeks.map(w => { const r=(state.oeeData[w]||[]).find(d=>d.machine===m); return r?+r.oee:null; });
            const bars = state.weeks.map((w,i) => {
                const v = vals[i];
                if (v===null) return `<div class="spark-bar" style="flex:1;background:#eee;"></div>`;
                return `<div class="spark-bar" style="flex:1;height:${Math.max((v/100)*36,1)}px;background:${oeeColor(v)};"></div>`;
            }).join('');
            const latest = vals[vals.length-1];
            return `<div class="spark-card" onclick="showPage('detail',${JSON.stringify({machine:m,type:'trend'}).replace(/"/g,'&quot;')})">
                <div class="spark-name">${m}</div>
                <div class="spark-bars">${bars}</div>
                <div class="spark-latest">Latest: <strong>${latest!==null?fmt1(latest)+'%':'—'}</strong></div>
            </div>`;
        }).join('');
    }
}