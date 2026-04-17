// kpi-pdf.js - PDF export for Maintenance KPI Board

function exportKPIPDF() {
    const targets = getTargets();
    const wk      = state.currentWeek;
    const data    = wk ? (state.oeeData[wk] || []) : [];
    const active  = data.filter(d => +d.oee > 0);
    const maint   = state.maintData || [];
    const period  = maint[0]?.period_label || 'Annual';
    const now     = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

    // Production context
    const avgOEE   = active.length ? active.reduce((s,d)=>s+(+d.oee),0)/active.length   : 0;
    const avgAvail = active.length ? active.reduce((s,d)=>s+(+d.avail),0)/active.length  : 0;
    const avgPerf  = active.length ? active.reduce((s,d)=>s+(+d.perf),0)/active.length   : 0;
    const avgQual  = active.length ? active.reduce((s,d)=>s+(+d.quality),0)/active.length : 0;
    const totalUnpl  = data.reduce((s,d)=>s+(+d.unplanned_h),0);
    const totalParts = data.reduce((s,d)=>s+(+d.total_parts),0);

    // OEE impact
    const projectedOEE = (targets.avail.value/100) * (avgPerf/100) * (avgQual/100) * 100;

    // Maintenance KPIs
    const totalDT  = maint.reduce((s,m)=>s+(+m.downtime_hrs),0);
    const totalBDs = maint.reduce((s,m)=>s+(+m.breakdown_count),0);
    const totalTPM = maint.reduce((s,m)=>s+(+m.tpm_count),0);
    const totalRunH = state.weeks.reduce((s,w)=>
        s+(state.oeeData[w]||[]).reduce((ss,d)=>ss+(+d.run_h||0),0),0);

    const fleetMTTR = totalBDs > 0 ? Math.round((totalDT/totalBDs)*10)/10 : 0;
    const fleetMTBF = totalBDs > 0 && totalRunH > 0
        ? Math.round((totalRunH/totalBDs)*10)/10 : 0;
    const avgTPM = maint.length > 0 ? Math.round((totalTPM/maint.length)*10)/10 : 0;

    const bestAvail  = [...active].sort((a,b)=>+b.avail - +a.avail)[0];
    const worstAvail = [...active].sort((a,b)=>+a.avail - +b.avail)[0];

    const top5 = [...maint].filter(m=>+m.downtime_hrs>0)
        .sort((a,b)=>+b.downtime_hrs - +a.downtime_hrs).slice(0,5);

    // Traffic light helper
    function tl(actual, target, higher=true) {
        const pct = higher ? actual/target : target/actual;
        if (pct>=1)    return { color:'#27ae60', bg:'#f0faf4', icon:'🟢', label:'On Target' };
        if (pct>=0.95) return { color:'#e67e22', bg:'#fffbf0', icon:'🟡', label:'Near Target' };
        return         { color:'#c0392b', bg:'#fff5f5', icon:'🔴', label:'Below Target' };
    }

    function gap(actual, target, unit, higher=true) {
        const diff = higher ? (actual-target) : (target-actual);
        const col  = diff >= 0 ? '#27ae60' : '#c0392b';
        const sign = diff >= 0 ? '+' : '';
        return `<span style="color:${col};font-weight:700;">${sign}${fmt1(diff)}${unit}</span>`;
    }

    function maintRow(label, actual, key, unit, higher=true, display=null) {
        const t = targets[key];
        const s = tl(actual, t.value, higher);
        return `<tr style="background:${s.bg};">
            <td style="padding:10px 14px;font-weight:700;color:#243547;">${label}</td>
            <td style="padding:10px 14px;font-size:18px;font-weight:700;color:${s.color};">${display||fmt1(actual)+unit}</td>
            <td style="padding:10px 14px;font-weight:700;color:#243547;">${t.value}${unit}</td>
            <td style="padding:10px 14px;">${gap(actual, t.value, unit, higher)}</td>
            <td style="padding:10px 14px;">${s.icon} ${s.label}</td>
        </tr>`;
    }

    const tlAvail = tl(avgAvail, targets.avail.value);

    const logoUrl = 'https://clamason-oee-dashboard.onrender.com/icons/Clamason-Logo-Side-PNG.png';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Clamason Maintenance KPI Board — ${wk}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:13px; color:#1a1a1a; background:#fff; padding:24px; }

  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:3px solid #243547; margin-bottom:20px; }
  .header-left { display:flex; align-items:center; gap:14px; }
  .title { font-size:24px; font-weight:700; color:#243547; }
  .sub { font-size:12px; color:#888; margin-top:4px; }

  .context-box { background:#f8f9fa; border-radius:8px; padding:14px 18px; margin-bottom:16px; border-left:4px solid #243547; }
  .context-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .context-item .label { font-size:10px; color:#888; margin-bottom:2px; }
  .context-item .value { font-size:18px; font-weight:700; }

  .hero { border-radius:10px; padding:20px; margin-bottom:16px; }
  .hero-grid { display:flex; align-items:center; gap:24px; flex-wrap:wrap; }
  .hero-number { font-size:48px; font-weight:700; line-height:1; }
  .hero-divider { width:1px; height:60px; background:#ddd; }
  .hero-label { font-size:12px; color:#888; margin-bottom:3px; }
  .hero-val { font-size:28px; font-weight:700; }
  .impact-box { background:#fff; border-radius:8px; padding:12px 16px; max-width:280px; }
  .impact-title { font-size:12px; font-weight:700; color:#243547; margin-bottom:6px; }
  .impact-text { font-size:14px; color:#555; line-height:1.6; }

  .section-title { font-size:14px; font-weight:700; color:#243547; margin:16px 0 10px; padding-bottom:6px; border-bottom:2px solid #f0f0f0; }

  table { width:100%; border-collapse:collapse; margin-bottom:14px; }
  thead tr { background:#243547; color:#fff; }
  thead th { padding:9px 14px; text-align:left; font-size:11px; font-weight:700; }

  .highlight { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
  .hl-card { border-radius:8px; padding:12px 16px; }

  .asset-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0f0f0; }
  .asset-badge { width:26px;height:26px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0; }
  .asset-stat { text-align:center; min-width:70px; }
  .asset-stat .val { font-size:13px; font-weight:700; }
  .asset-stat .lbl { font-size:10px; color:#888; }

  .footer { margin-top:20px; padding-top:10px; border-top:1px solid #eee; font-size:10px; color:#aaa; display:flex; justify-content:space-between; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <img src="${logoUrl}" style="height:60px;">
    <div>
      <div class="title">Maintenance KPI Board</div>
      <div class="sub">Production Week: <strong>${wk||'—'}</strong> &nbsp;·&nbsp; Maintenance Period: <strong>${period}</strong></div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:10px;color:#888;">Generated</div>
    <div style="font-size:13px;font-weight:700;color:#243547;">${now}</div>
  </div>
</div>

<!-- SECTION 1: BUSINESS CONTEXT -->
<div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:8px;">📊 Business Context — Overall OEE (shared KPI)</div>
<div class="context-box">
  <div class="context-grid">
    <div class="context-item">
      <div class="label">Overall OEE</div>
      <div class="value" style="color:${avgOEE>=targets.avail.value?'#27ae60':'#c0392b'}">${fmt1(avgOEE)}%</div>
      <div style="font-size:10px;color:#888;">target ${targets.avail.value}%</div>
    </div>
    <div class="context-item">
      <div class="label">Performance %</div>
      <div class="value" style="color:#243547;">${fmt1(avgPerf)}%</div>
      <div style="font-size:10px;color:#888;">production dept</div>
    </div>
    <div class="context-item">
      <div class="label">Quality %</div>
      <div class="value" style="color:#243547;">${fmt1(avgQual)}%</div>
      <div style="font-size:10px;color:#888;">quality dept</div>
    </div>
    <div class="context-item">
      <div class="label">Unplanned Down</div>
      <div class="value" style="color:#c0392b;">${fmtH(totalUnpl)}</div>
      <div style="font-size:10px;color:#888;">this week</div>
    </div>
  </div>
</div>

<!-- SECTION 2: HERO NUMBER -->
<div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:8px;">🎯 Your Number — Maintenance Availability</div>
<div class="hero" style="background:${tlAvail.bg};border:2px solid ${tlAvail.color};">
  <div class="hero-grid">
    <div>
      <div style="font-size:11px;color:#888;margin-bottom:4px;">Current Availability · ${wk||'—'}</div>
      <div class="hero-number" style="color:${tlAvail.color};">${fmt1(avgAvail)}%</div>
    </div>
    <div class="hero-divider"></div>
    <div>
      <div class="hero-label">Target</div>
      <div class="hero-val" style="color:#243547;">${targets.avail.value}%</div>
    </div>
    <div class="hero-divider"></div>
    <div>
      <div class="hero-label">Gap</div>
      <div class="hero-val" style="color:${tlAvail.color};">
        ${avgAvail>=targets.avail.value?'+':''}${fmt1(avgAvail-targets.avail.value)}%
      </div>
    </div>
    <div class="hero-divider"></div>
    <div class="impact-box">
      <div class="impact-title">💡 OEE Impact</div>
      <div class="impact-text">
        If Availability reaches <strong>${targets.avail.value}%</strong>,<br>
        OEE would improve from <strong style="color:#c0392b">${fmt1(avgOEE)}%</strong>
        to approximately <strong style="color:#27ae60">${fmt1(projectedOEE)}%</strong>
      </div>
    </div>
  </div>
</div>

<!-- SECTION 3: MAINTENANCE KPI TABLE -->
<div class="section-title">🔧 Maintenance KPIs — ${period}</div>
<table>
  <thead>
    <tr>
      <th style="width:200px;">KPI</th>
      <th style="width:120px;">Actual</th>
      <th style="width:100px;">Target</th>
      <th style="width:90px;">Gap</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${maintRow('Availability %',     avgAvail,         'avail',       '%', true,  fmt1(avgAvail)+'%')}
    ${maintRow('Fleet MTTR',         fleetMTTR,        'maxMTTR',     'h', false, fleetMTTR+'h')}
    ${maintRow('Fleet MTBF',         fleetMTBF,        'minMTBF',     'h', true,  fleetMTBF > 0 ? fleetMTBF+'h' : '—')}
    ${maintRow('Annual Downtime',    Math.round(totalDT), 'maxDowntime','h', false, Math.round(totalDT)+'h')}
    ${maintRow('Total Breakdowns',   totalBDs,         'maxBDs',      '',  false, String(totalBDs))}
    ${maintRow('Avg TPM per Asset',  avgTPM,           'tpmTarget',   '',  true,  fmt1(avgTPM))}
  </tbody>
</table>

<!-- SECTION 4: BEST / WORST AVAILABILITY -->
<div class="highlight">
  <div class="hl-card" style="background:#f0faf4;border-left:4px solid #27ae60;">
    <div style="font-size:10px;font-weight:700;color:#155724;text-transform:uppercase;margin-bottom:4px;">🏆 Best Availability</div>
    <div style="font-size:16px;font-weight:700;color:#155724;">${bestAvail?.machine||'—'}</div>
    <div style="font-size:12px;color:#155724;">${fmt1(bestAvail?.avail||0)}% availability</div>
  </div>
  <div class="hl-card" style="background:#fff5f5;border-left:4px solid #c0392b;">
    <div style="font-size:10px;font-weight:700;color:#721c24;text-transform:uppercase;margin-bottom:4px;">⚠️ Lowest Availability</div>
    <div style="font-size:16px;font-weight:700;color:#721c24;">${worstAvail?.machine||'—'}</div>
    <div style="font-size:12px;color:#721c24;">${fmt1(worstAvail?.avail||0)}% availability</div>
  </div>
</div>

<!-- SECTION 5: TOP 5 ASSETS -->
<div class="section-title">🔴 Top 5 Assets by Annual Downtime</div>
${top5.map((m,i) => {
    const assetMTTR = +m.breakdown_count > 0
        ? Math.round((+m.downtime_hrs / +m.breakdown_count)*10)/10 : 0;
    const mttrCol = assetMTTR<=4?'#27ae60':assetMTTR<=8?'#e67e22':'#c0392b';
    const bgCol = ['#c0392b','#e67e22','#e6b800','#888','#aaa'][i];
    return `
    <div class="asset-row">
      <div class="asset-badge" style="background:${bgCol};">${i+1}</div>
      <div style="flex:1;font-size:13px;font-weight:700;color:#243547;">${m.name}</div>
      <div class="asset-stat">
        <div class="val" style="color:#c0392b;">${Math.round(+m.downtime_hrs)}h</div>
        <div class="lbl">downtime</div>
      </div>
      <div class="asset-stat">
        <div class="val">${m.breakdown_count}</div>
        <div class="lbl">breakdowns</div>
      </div>
      <div class="asset-stat">
        <div class="val" style="color:${mttrCol};">${assetMTTR}h</div>
        <div class="lbl">MTTR</div>
      </div>
      <div class="asset-stat">
        <div class="val">${m.tpm_count}</div>
        <div class="lbl">TPM visits</div>
      </div>
    </div>`;
}).join('')}

<div class="footer">
  <span>Clamason Engineering — Maintenance KPI Board — Confidential</span>
  <span>${now}</span>
</div>

</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
}
