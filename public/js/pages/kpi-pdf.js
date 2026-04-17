// kpi-pdf.js - PDF export for KPI Board

function exportKPIPDF() {
    const targets = getTargets();
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);
    const maint = state.maintData || [];
    const period = maint[0]?.period_label || 'Annual';
    const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    const avgOEE = active.length ? active.reduce((s, d) => s + (+d.oee), 0) / active.length : 0;
    const avgAvail = active.length ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const avgPerf = active.length ? active.reduce((s, d) => s + (+d.perf), 0) / active.length : 0;
    const avgQual = active.length ? active.reduce((s, d) => s + (+d.quality), 0) / active.length : 0;
    const totalUnpl = data.reduce((s, d) => s + (+d.unplanned_h), 0);
    const totalParts = data.reduce((s, d) => s + (+d.total_parts), 0);
    const totalDT = maint.reduce((s, m) => s + (+m.downtime_hrs), 0);
    const totalBDs = maint.reduce((s, m) => s + (+m.breakdown_count), 0);
    const bestOEE = [...active].sort((a, b) => +b.oee - +a.oee)[0];
    const worstOEE = [...active].sort((a, b) => +a.oee - +b.oee)[0];
    const top3 = [...maint].filter(m => +m.downtime_hrs > 0)
        .sort((a, b) => +b.downtime_hrs - +a.downtime_hrs).slice(0, 3);

    function tl(actual, target, higher = true) {
        const pct = higher ? actual / target : target / actual;
        if (pct >= 1) return { color: '#27ae60', bg: '#f0faf4', icon: '🟢', label: 'On Target' };
        if (pct >= 0.95) return { color: '#e67e22', bg: '#fffbf0', icon: '🟡', label: 'Near Target' };
        return { color: '#c0392b', bg: '#fff5f5', icon: '🔴', label: 'Below Target' };
    }

    function gap(actual, target, unit, higher = true) {
        const diff = higher ? (actual - target) : (target - actual);
        const sign = diff >= 0 ? '+' : '';
        const col = diff >= 0 ? '#27ae60' : '#c0392b';
        return `<span style="color:${col};font-weight:700;">${sign}${fmt1(diff)}${unit}</span>`;
    }

    function prodRow(label, actual, key, unit, higher = true) {
        const t = targets[key];
        const s = tl(actual, t.value, higher);
        return `<tr style="background:${s.bg};">
            <td style="padding:10px 14px;font-weight:700;color:#243547;">${label}</td>
            <td style="padding:10px 14px;font-size:18px;font-weight:700;color:${s.color};">${fmt1(actual)}${unit}</td>
            <td style="padding:10px 14px;font-weight:700;color:#243547;">${t.value}${unit}</td>
            <td style="padding:10px 14px;">${gap(actual, t.value, unit, higher)}</td>
            <td style="padding:10px 14px;">${s.icon} ${s.label}</td>
        </tr>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Clamason KPI Board — ${wk}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:13px; color:#1a1a1a; background:#fff; padding:28px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:3px solid #243547; margin-bottom:20px; }
  .title { font-size:22px; font-weight:700; color:#243547; }
  .sub { font-size:12px; color:#888; margin-top:4px; }
  .section { font-size:14px; font-weight:700; color:#243547; margin:18px 0 10px; padding-bottom:6px; border-bottom:2px solid #f0f0f0; }
  table { width:100%; border-collapse:collapse; margin-bottom:14px; }
  thead tr { background:#243547; color:#fff; }
  thead th { padding:9px 14px; text-align:left; font-size:11px; font-weight:700; }
  .highlight { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
  .hl-card { border-radius:8px; padding:12px 16px; }
  .top3-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0f0f0; }
  .badge { width:26px;height:26px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0; }
  .footer { margin-top:24px; padding-top:10px; border-top:1px solid #eee; font-size:10px; color:#aaa; display:flex; justify-content:space-between; }
</style>
</head>
<body>

<div class="header">
  <div>
<div style="display:flex;align-items:center;gap:14px;">
    <img src="https://clamason-oee-dashboard.onrender.com/icons/Clamason-Logo-Side-PNG.png" style="height:65px;">
    <div>
        <div class="title">KPI Board</div>
        <div class="sub">Production Week: <strong>${wk || '—'}</strong> &nbsp;·&nbsp; Maintenance Period: <strong>${period}</strong></div>
    </div>
</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:11px;color:#888;">Generated</div>
    <div style="font-size:13px;font-weight:700;color:#243547;">${now}</div>
  </div>
</div>

<div class="section">⚙️ Production Performance — ${wk || '—'}</div>
<table>
  <thead>
    <tr>
      <th style="width:180px;">KPI</th>
      <th style="width:120px;">This Week</th>
      <th style="width:100px;">Target</th>
      <th style="width:80px;">Gap</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${prodRow('OEE %', avgOEE, 'oee', '%')}
    ${prodRow('Availability %', avgAvail, 'avail', '%')}
    ${prodRow('Performance %', avgPerf, 'perf', '%')}
    ${prodRow('Quality %', avgQual, 'quality', '%')}
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;font-weight:700;">Parts Made</td>
      <td style="padding:10px 14px;font-size:16px;font-weight:700;">${fmtN(totalParts)}</td>
      <td colspan="3" style="padding:10px 14px;color:#888;font-size:11px;">production output this week</td>
    </tr>
    <tr style="background:#fff5f5;">
      <td style="padding:10px 14px;font-weight:700;">Unplanned Downtime</td>
      <td style="padding:10px 14px;font-size:16px;font-weight:700;color:#c0392b;">${fmtH(totalUnpl)}</td>
      <td colspan="3" style="padding:10px 14px;color:#888;font-size:11px;">all presses this week</td>
    </tr>
  </tbody>
</table>

<div class="highlight">
  <div class="hl-card" style="background:#f0faf4;border-left:4px solid #27ae60;">
    <div style="font-size:10px;font-weight:700;color:#155724;text-transform:uppercase;margin-bottom:4px;">🏆 Best Machine</div>
    <div style="font-size:16px;font-weight:700;color:#155724;">${bestOEE?.machine || '—'}</div>
    <div style="font-size:12px;color:#155724;">${fmt1(bestOEE?.oee || 0)}% OEE</div>
  </div>
  <div class="hl-card" style="background:#fff5f5;border-left:4px solid #c0392b;">
    <div style="font-size:10px;font-weight:700;color:#721c24;text-transform:uppercase;margin-bottom:4px;">⚠️ Needs Attention</div>
    <div style="font-size:16px;font-weight:700;color:#721c24;">${worstOEE?.machine || '—'}</div>
    <div style="font-size:12px;color:#721c24;">${fmt1(worstOEE?.oee || 0)}% OEE</div>
  </div>
</div>

<div class="section">🔧 Maintenance Performance — ${period}</div>
<table>
  <thead>
    <tr>
      <th style="width:180px;">KPI</th>
      <th style="width:120px;">Actual</th>
      <th style="width:100px;">Target</th>
      <th style="width:80px;">Gap</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${prodRow('Annual Downtime', Math.round(totalDT), 'maxDowntime', 'h', false)}
    ${prodRow('Total Breakdowns', totalBDs, 'maxBDs', '', false)}
  </tbody>
</table>

<div class="section">Top 3 Assets by Annual Downtime</div>
${top3.map((m, i) => `
<div class="top3-row">
  <div class="badge" style="background:${i === 0 ? '#c0392b' : i === 1 ? '#e67e22' : '#e6b800'}">${i + 1}</div>
  <div style="flex:1;font-weight:700;font-size:13px;">${m.name}</div>
  <div style="color:#c0392b;font-weight:700;font-size:13px;">${Math.round(+m.downtime_hrs)}h downtime</div>
  <div style="color:#888;font-size:12px;margin-left:16px;">${m.breakdown_count} breakdowns</div>
</div>`).join('')}

<div class="footer">
  <span>Clamason Engineering — KPI Board — Confidential</span>
  <span>${now}</span>
</div>

</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
}