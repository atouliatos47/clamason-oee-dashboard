// kpi.js - KPI Board for board meetings

const KPI_TARGETS = {
    oee:          { value: 65,  label: 'OEE Target',          unit: '%' },
    avail:        { value: 75,  label: 'Availability Target',  unit: '%' },
    perf:         { value: 90,  label: 'Performance Target',   unit: '%' },
    quality:      { value: 99,  label: 'Quality Target',       unit: '%' },
    maxDowntime:  { value: 200, label: 'Max Downtime/Machine', unit: 'h' },
};

function getTargets() {
    const saved = localStorage.getItem('clamason_kpi_targets');
    return saved ? JSON.parse(saved) : KPI_TARGETS;
}

function saveTargets(targets) {
    localStorage.setItem('clamason_kpi_targets', JSON.stringify(targets));
}

function trafficLight(actual, target, higherIsBetter = true) {
    const pct = higherIsBetter ? actual / target : target / actual;
    if (pct >= 1)    return { color: '#27ae60', label: '▲ On Target', bg: '#d4edda' };
    if (pct >= 0.95) return { color: '#e67e22', label: '► Near Target', bg: '#fff3cd' };
    return           { color: '#c0392b', label: '▼ Below Target', bg: '#ffe0e0' };
}

function renderKPIBoard() {
    const el = document.getElementById('kpiBoard');
    if (!el) return;

    const targets = getTargets();
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);
    const maint  = state.maintData || [];

    // Actuals
    const avgOEE   = active.length ? active.reduce((s,d)=>s+(+d.oee),0)/active.length : 0;
    const avgAvail = active.length ? active.reduce((s,d)=>s+(+d.avail),0)/active.length : 0;
    const avgPerf  = active.length ? active.reduce((s,d)=>s+(+d.perf),0)/active.length : 0;
    const avgQual  = active.length ? active.reduce((s,d)=>s+(+d.quality),0)/active.length : 0;
    const totalUnpl  = data.reduce((s,d)=>s+(+d.unplanned_h),0);
    const totalParts = data.reduce((s,d)=>s+(+d.total_parts),0);
    const totalDT    = maint.reduce((s,m)=>s+(+m.downtime_hrs),0);
    const totalBDs   = maint.reduce((s,m)=>s+(+m.breakdown_count),0);
    const worstMachine = [...maint].sort((a,b)=>+b.downtime_hrs - +a.downtime_hrs)[0];
    const bestOEE  = [...active].sort((a,b)=>+b.oee - +a.oee)[0];
    const worstOEE = [...active].sort((a,b)=>+a.oee - +b.oee)[0];

    // OEE trend across all weeks
    const weekTrend = state.weeks.map(w => {
        const wd = (state.oeeData[w]||[]).filter(d=>+d.oee>0);
        const avg = wd.length ? wd.reduce((s,d)=>s+(+d.oee),0)/wd.length : 0;
        return { week: w, avg };
    });
    const weeksOnTarget = weekTrend.filter(w=>w.avg >= targets.oee.value).length;

    // Traffic lights
    const tlOEE   = trafficLight(avgOEE,   targets.oee.value);
    const tlAvail = trafficLight(avgAvail,  targets.avail.value);
    const tlPerf  = trafficLight(avgPerf,   targets.perf.value);
    const tlQual  = trafficLight(avgQual,   targets.quality.value);

    // Trend sparkline
    const maxAvg = Math.max(...weekTrend.map(w=>w.avg), 1);
    const sparkline = weekTrend.map(w => {
        const h = Math.max((w.avg/100)*60, 2);
        const col = trafficLight(w.avg, targets.oee.value).color;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
            <div style="font-size:9px;color:#888">${fmt1(w.avg)}%</div>
            <div style="height:${h}px;width:100%;background:${col};border-radius:2px 2px 0 0;min-height:2px"></div>
            <div style="font-size:9px;color:#888">${w.week}</div>
        </div>`;
    }).join('');

    const period = maint[0]?.period_label || 'Annual';

    el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
            <div>
                <h2 style="color:#243547;font-size:22px;margin:0">🎯 KPI Board</h2>
                <div style="color:#888;font-size:13px;margin-top:4px;">Week: <strong>${wk||'—'}</strong> &nbsp;·&nbsp; Maintenance: <strong>${period}</strong></div>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="btn btn-navy" onclick="editKPITargets()" style="font-size:12px;padding:8px 16px;">⚙️ Set Targets</button>
                <button class="btn btn-lime" onclick="exportKPIPDF()" style="font-size:12px;padding:8px 16px;">📄 Export PDF</button>
            </div>
        </div>

        <!-- PRODUCTION KPIs -->
        <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
                <span class="card-title">⚙️ Production Performance</span>
                <span class="card-sub">${wk||'—'} · from SFC</span>
            </div>
            <div class="kpi-grid" style="margin-bottom:16px;">
                ${[
                    { label:'Fleet OEE',      actual:avgOEE,   tl:tlOEE,   unit:'%', target:targets.oee.value },
                    { label:'Availability',   actual:avgAvail, tl:tlAvail, unit:'%', target:targets.avail.value },
                    { label:'Performance',    actual:avgPerf,  tl:tlPerf,  unit:'%', target:targets.perf.value },
                    { label:'Quality',        actual:avgQual,  tl:tlQual,  unit:'%', target:targets.quality.value },
                ].map(k=>`
                    <div class="kpi-card" style="border-left-color:${k.tl.color};background:${k.tl.bg};">
                        <div class="kpi-label">${k.label}</div>
                        <div class="kpi-value" style="color:${k.tl.color}">${fmt1(k.actual)}${k.unit}</div>
                        <div class="kpi-sub">Target: ${k.target}${k.unit} &nbsp; <strong style="color:${k.tl.color}">${k.tl.label}</strong></div>
                    </div>`).join('')}
                <div class="kpi-card">
                    <div class="kpi-label">Parts Made</div>
                    <div class="kpi-value">${fmtN(totalParts)}</div>
                    <div class="kpi-sub">this week</div>
                </div>
                <div class="kpi-card" style="border-left-color:#c0392b">
                    <div class="kpi-label">Unplanned Downtime</div>
                    <div class="kpi-value" style="color:#c0392b">${fmtH(totalUnpl)}</div>
                    <div class="kpi-sub">this week · all machines</div>
                </div>
            </div>

            <!-- Best/Worst -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div style="background:#d4edda;border-radius:8px;padding:12px 16px;">
                    <div style="font-size:11px;font-weight:700;color:#155724;text-transform:uppercase;margin-bottom:4px;">🏆 Best Machine</div>
                    <div style="font-size:16px;font-weight:700;color:#155724">${bestOEE?.machine||'—'}</div>
                    <div style="font-size:13px;color:#155724">${fmt1(bestOEE?.oee||0)}% OEE</div>
                </div>
                <div style="background:#ffe0e0;border-radius:8px;padding:12px 16px;">
                    <div style="font-size:11px;font-weight:700;color:#721c24;text-transform:uppercase;margin-bottom:4px;">⚠️ Needs Attention</div>
                    <div style="font-size:16px;font-weight:700;color:#721c24">${worstOEE?.machine||'—'}</div>
                    <div style="font-size:13px;color:#721c24">${fmt1(worstOEE?.oee||0)}% OEE</div>
                </div>
            </div>

            <!-- OEE Trend -->
            <div style="font-size:12px;font-weight:700;color:#243547;margin-bottom:8px;">
                OEE Trend — ${weeksOnTarget} of ${weekTrend.length} weeks at/above target (${targets.oee.value}%)
            </div>
            <div style="display:flex;gap:6px;align-items:flex-end;height:90px;padding:0 4px;">
                ${sparkline}
            </div>
            <div style="margin-top:6px;display:flex;align-items:center;gap:6px;font-size:11px;color:#888;">
                <span style="display:inline-block;width:12px;height:12px;background:#27ae60;border-radius:2px;"></span> On target
                <span style="display:inline-block;width:12px;height:12px;background:#e67e22;border-radius:2px;margin-left:8px;"></span> Near target
                <span style="display:inline-block;width:12px;height:12px;background:#c0392b;border-radius:2px;margin-left:8px;"></span> Below target
            </div>
        </div>

        <!-- MAINTENANCE KPIs -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">🔧 Maintenance Performance</span>
                <span class="card-sub">${period} · from Agility</span>
            </div>
            <div class="kpi-grid" style="margin-bottom:16px;">
                <div class="kpi-card" style="border-left-color:#e67e22">
                    <div class="kpi-label">Total Downtime</div>
                    <div class="kpi-value" style="color:#e67e22">${Math.round(totalDT).toLocaleString()}h</div>
                    <div class="kpi-sub">annual · all assets</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Total Breakdowns</div>
                    <div class="kpi-value">${totalBDs}</div>
                    <div class="kpi-sub">recorded this period</div>
                </div>
                <div class="kpi-card" style="border-left-color:#c0392b">
                    <div class="kpi-label">Worst Asset</div>
                    <div class="kpi-value" style="font-size:14px;color:#c0392b">${worstMachine?.name?.slice(0,20)||'—'}</div>
                    <div class="kpi-sub">${Math.round(+worstMachine?.downtime_hrs||0)}h downtime</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Assets Monitored</div>
                    <div class="kpi-value">${maint.length}</div>
                    <div class="kpi-sub">in Agility this period</div>
                </div>
            </div>

            <!-- Top 3 problem machines -->
            <div style="font-size:12px;font-weight:700;color:#243547;margin-bottom:10px;">Top 3 Assets by Downtime</div>
            ${[...maint].filter(m=>+m.downtime_hrs>0).sort((a,b)=>+b.downtime_hrs - +a.downtime_hrs).slice(0,3).map((m,i)=>`
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:${i===0?'#c0392b':i===1?'#e67e22':'#e6b800'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${i+1}</div>
                    <div style="flex:1;font-size:13px;font-weight:700;color:#243547;">${m.name}</div>
                    <div style="font-size:13px;color:#c0392b;font-weight:700;">${Math.round(+m.downtime_hrs)}h</div>
                    <div style="font-size:12px;color:#888;">${m.breakdown_count} breakdowns</div>
                </div>`).join('')}
        </div>`;
}

function editKPITargets() {
    const targets = getTargets();
    const fields = [
        { key:'oee',         prompt:`OEE Target (%)`,               current: targets.oee.value },
        { key:'avail',       prompt:`Availability Target (%)`,       current: targets.avail.value },
        { key:'perf',        prompt:`Performance Target (%)`,        current: targets.perf.value },
        { key:'quality',     prompt:`Quality Target (%)`,            current: targets.quality.value },
        { key:'maxDowntime', prompt:`Max Downtime per Machine (hrs)`, current: targets.maxDowntime.value },
    ];

    for (const f of fields) {
        const val = prompt(`${f.prompt}\nCurrent: ${f.current}`, f.current);
        if (val === null) return; // cancelled
        if (!isNaN(val) && +val > 0) targets[f.key].value = +val;
    }
    saveTargets(targets);
    renderKPIBoard();
    showToast('✅ Targets saved', 'success');
}

function exportKPIPDF() {
    const targets = getTargets();
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);
    const maint  = state.maintData || [];

    const avgOEE   = active.length ? active.reduce((s,d)=>s+(+d.oee),0)/active.length : 0;
    const avgAvail = active.length ? active.reduce((s,d)=>s+(+d.avail),0)/active.length : 0;
    const avgPerf  = active.length ? active.reduce((s,d)=>s+(+d.perf),0)/active.length : 0;
    const avgQual  = active.length ? active.reduce((s,d)=>s+(+d.quality),0)/active.length : 0;
    const totalUnpl  = data.reduce((s,d)=>s+(+d.unplanned_h),0);
    const totalParts = data.reduce((s,d)=>s+(+d.total_parts),0);
    const totalDT    = maint.reduce((s,m)=>s+(+m.downtime_hrs),0);
    const totalBDs   = maint.reduce((s,m)=>s+(+m.breakdown_count),0);
    const worstMachine = [...maint].sort((a,b)=>+b.downtime_hrs - +a.downtime_hrs)[0];
    const bestOEE  = [...active].sort((a,b)=>+b.oee - +a.oee)[0];
    const worstOEE = [...active].sort((a,b)=>+a.oee - +b.oee)[0];
    const period   = maint[0]?.period_label || 'Annual';
    const now      = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

    function tl(actual, target, higher=true) {
        const pct = higher ? actual/target : target/actual;
        if (pct>=1)    return { color:'#27ae60', bg:'#d4edda', label:'▲ On Target' };
        if (pct>=0.95) return { color:'#e67e22', bg:'#fff3cd', label:'► Near Target' };
        return         { color:'#c0392b', bg:'#ffe0e0', label:'▼ Below Target' };
    }

    const top3 = [...maint].filter(m=>+m.downtime_hrs>0)
        .sort((a,b)=>+b.downtime_hrs - +a.downtime_hrs).slice(0,3);

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Clamason KPI Board — ${wk}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:13px; color:#1a1a1a; background:#fff; padding:30px; }
  .header { display:flex; align-items:center; gap:16px; padding-bottom:16px; border-bottom:3px solid #243547; margin-bottom:24px; }
  .header-title { font-size:22px; font-weight:700; color:#243547; }
  .header-sub { font-size:13px; color:#888; margin-top:4px; }
  .section-title { font-size:16px; font-weight:700; color:#243547; margin:20px 0 12px; padding-bottom:6px; border-bottom:2px solid #f0f0f0; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
  .kpi-card { border-radius:8px; padding:12px 14px; border-left:4px solid #95C11F; }
  .kpi-label { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; margin-bottom:4px; }
  .kpi-value { font-size:22px; font-weight:700; line-height:1.1; }
  .kpi-sub { font-size:10px; color:#888; margin-top:3px; }
  .highlight-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
  .highlight { border-radius:8px; padding:12px 16px; }
  .top3 { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
  .badge { width:24px;height:24px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0; }
  .footer { margin-top:30px; padding-top:12px; border-top:1px solid #eee; font-size:11px; color:#aaa; display:flex; justify-content:space-between; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="header-title">🎯 Clamason KPI Board</div>
    <div class="header-sub">Production Week: ${wk} &nbsp;·&nbsp; Maintenance: ${period} &nbsp;·&nbsp; Generated: ${now}</div>
  </div>
</div>

<div class="section-title">⚙️ Production Performance (SFC)</div>
<div class="kpi-grid">
  ${[
    {label:'Fleet OEE',    actual:avgOEE,   t:tl(avgOEE,targets.oee.value),     target:targets.oee.value,   unit:'%'},
    {label:'Availability', actual:avgAvail, t:tl(avgAvail,targets.avail.value),  target:targets.avail.value, unit:'%'},
    {label:'Performance',  actual:avgPerf,  t:tl(avgPerf,targets.perf.value),    target:targets.perf.value,  unit:'%'},
    {label:'Quality',      actual:avgQual,  t:tl(avgQual,targets.quality.value), target:targets.quality.value,unit:'%'},
  ].map(k=>`
  <div class="kpi-card" style="border-left-color:${k.t.color};background:${k.t.bg};">
    <div class="kpi-label">${k.label}</div>
    <div class="kpi-value" style="color:${k.t.color}">${fmt1(k.actual)}${k.unit}</div>
    <div class="kpi-sub">Target: ${k.target}${k.unit} &nbsp; <strong>${k.t.label}</strong></div>
  </div>`).join('')}
</div>
<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">Parts Made</div><div class="kpi-value">${fmtN(totalParts)}</div><div class="kpi-sub">this week</div></div>
  <div class="kpi-card" style="border-left-color:#c0392b"><div class="kpi-label">Unplanned Downtime</div><div class="kpi-value" style="color:#c0392b">${fmtH(totalUnpl)}</div><div class="kpi-sub">this week</div></div>
</div>

<div class="highlight-grid">
  <div class="highlight" style="background:#d4edda;">
    <div style="font-size:11px;font-weight:700;color:#155724;text-transform:uppercase;margin-bottom:4px;">🏆 Best Machine</div>
    <div style="font-size:16px;font-weight:700;color:#155724">${bestOEE?.machine||'—'}</div>
    <div style="font-size:13px;color:#155724">${fmt1(bestOEE?.oee||0)}% OEE</div>
  </div>
  <div class="highlight" style="background:#ffe0e0;">
    <div style="font-size:11px;font-weight:700;color:#721c24;text-transform:uppercase;margin-bottom:4px;">⚠️ Needs Attention</div>
    <div style="font-size:16px;font-weight:700;color:#721c24">${worstOEE?.machine||'—'}</div>
    <div style="font-size:13px;color:#721c24">${fmt1(worstOEE?.oee||0)}% OEE</div>
  </div>
</div>

<div class="section-title">🔧 Maintenance Performance (Agility)</div>
<div class="kpi-grid">
  <div class="kpi-card" style="border-left-color:#e67e22"><div class="kpi-label">Total Downtime</div><div class="kpi-value" style="color:#e67e22">${Math.round(totalDT).toLocaleString()}h</div><div class="kpi-sub">annual · all assets</div></div>
  <div class="kpi-card"><div class="kpi-label">Total Breakdowns</div><div class="kpi-value">${totalBDs}</div><div class="kpi-sub">this period</div></div>
  <div class="kpi-card" style="border-left-color:#c0392b"><div class="kpi-label">Worst Asset</div><div class="kpi-value" style="font-size:14px;color:#c0392b">${worstMachine?.name?.slice(0,20)||'—'}</div><div class="kpi-sub">${Math.round(+worstMachine?.downtime_hrs||0)}h downtime</div></div>
  <div class="kpi-card"><div class="kpi-label">Assets Monitored</div><div class="kpi-value">${maint.length}</div><div class="kpi-sub">in Agility</div></div>
</div>

<div style="font-size:12px;font-weight:700;color:#243547;margin-bottom:10px;">Top 3 Assets by Downtime</div>
${top3.map((m,i)=>`
<div class="top3">
  <div class="badge" style="background:${i===0?'#c0392b':i===1?'#e67e22':'#e6b800'}">${i+1}</div>
  <div style="flex:1;font-weight:700;">${m.name}</div>
  <div style="color:#c0392b;font-weight:700;">${Math.round(+m.downtime_hrs)}h</div>
  <div style="color:#888;margin-left:12px;">${m.breakdown_count} breakdowns</div>
</div>`).join('')}

<div class="footer">
  <span>Clamason OEE Dashboard · Confidential</span>
  <span>${now}</span>
</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
}