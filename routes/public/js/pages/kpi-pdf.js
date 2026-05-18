// kpi-pdf.js - PDF export for Maintenance KPI Board (2 landscape pages)

function exportKPIPDF() {
    const targets = getTargets();
    const wk      = state.currentWeek;
    const data    = wk ? (state.oeeData[wk] || []) : [];
    const active  = data.filter(d => +d.oee > 0);
    const maint   = state.maintData || [];
    const period  = maint[0]?.period_label || 'Annual';
    const now     = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

    const avgOEE   = active.length ? active.reduce((s,d)=>s+(+d.oee),0)/active.length   : 0;
    const avgAvail = active.length ? active.reduce((s,d)=>s+(+d.avail),0)/active.length  : 0;
    const avgPerf  = active.length ? active.reduce((s,d)=>s+(+d.perf),0)/active.length   : 0;
    const avgQual  = active.length ? active.reduce((s,d)=>s+(+d.quality),0)/active.length : 0;
    const totalUnpl = data.reduce((s,d)=>s+(+d.unplanned_h),0);
    const projectedOEE = (targets.avail.value/100) * (avgPerf/100) * (avgQual/100) * 100;

    const totalDT  = maint.reduce((s,m)=>s+(+m.downtime_hrs),0);
    const totalBDs = maint.reduce((s,m)=>s+(+m.breakdown_count),0);
    const totalTPM = maint.reduce((s,m)=>s+(+m.tpm_count),0);
    const totalRunH = state.weeks.reduce((s,w)=>
        s+(state.oeeData[w]||[]).reduce((ss,d)=>ss+(+d.run_h||0),0),0);

    const equipMTTR = totalBDs > 0 ? Math.round((totalDT/totalBDs)*10)/10 : 0;
    const equipMTBF = totalBDs > 0 && totalRunH > 0
        ? Math.round((totalRunH/totalBDs)*10)/10 : 0;
    const avgTPM = maint.length > 0 ? Math.round((totalTPM/maint.length)*10)/10 : 0;

    const bestAvail  = [...active].sort((a,b)=>+b.avail - +a.avail)[0];
    const worstAvail = [...active].sort((a,b)=>+a.avail - +b.avail)[0];

    const top5 = [...maint].filter(m=>+m.downtime_hrs>0)
        .sort((a,b)=>+b.downtime_hrs - +a.downtime_hrs).slice(0,5);

    const availTrend = state.weeks.map(w => {
        const wd = (state.oeeData[w]||[]).filter(d=>+d.avail>0);
        return { week:w, avg: wd.length ? wd.reduce((s,d)=>s+(+d.avail),0)/wd.length : 0 };
    });
    const weeksOnTarget = availTrend.filter(w=>w.avg>=targets.avail.value).length;

    function tl(actual, target, higher=true) {
        const pct = higher ? actual/target : target/actual;
        if (pct>=1)    return { color:'#27ae60', bg:'#f0faf4', icon:'🟢', label:'On Target' };
        if (pct>=0.95) return { color:'#e67e22', bg:'#fffbf0', icon:'🟡', label:'Near Target' };
        return         { color:'#c0392b', bg:'#fff5f5', icon:'🔴', label:'Below Target' };
    }

    function gapSpan(actual, target, unit, higher=true) {
        const diff = higher ? (actual-target) : (target-actual);
        const col  = diff >= 0 ? '#27ae60' : '#c0392b';
        const sign = diff >= 0 ? '+' : '';
        return `<span style="color:${col};font-weight:700;">${sign}${fmt1(diff)}${unit}</span>`;
    }

    function mRow(label, actual, key, unit, higher=true, display=null) {
        const t = targets[key];
        const s = tl(actual, t.value, higher);
        return `<tr style="background:${s.bg};">
            <td style="padding:9px 12px;font-weight:700;color:#243547;">${label}</td>
            <td style="padding:9px 12px;font-size:17px;font-weight:700;color:${s.color};">${display||fmt1(actual)+unit}</td>
            <td style="padding:9px 12px;font-weight:700;color:#243547;">${t.value}${unit}</td>
            <td style="padding:9px 12px;">${gapSpan(actual, t.value, unit, higher)}</td>
            <td style="padding:9px 12px;">${s.icon} ${s.label}</td>
        </tr>`;
    }

    const tlAvail = tl(avgAvail, targets.avail.value);
    const logoUrl = 'https://clamason-oee-dashboard.onrender.com/icons/Clamason-Logo-Side-PNG.png';

    const sparkBars = availTrend.map(w => {
        const h   = Math.max((w.avg/100)*40, 2);
        const col = tl(w.avg, targets.avail.value).color;
        return `<td style="text-align:center;vertical-align:bottom;padding:0 3px;">
            <div style="font-size:8px;color:#888;margin-bottom:2px;">${fmt1(w.avg)}%</div>
            <div style="height:${h}px;background:${col};border-radius:2px 2px 0 0;min-height:2px;"></div>
            <div style="font-size:8px;color:#888;margin-top:2px;">${w.week}</div>
        </td>`;
    }).join('');

    const headerHTML = (page) => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #243547;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:14px;">
            <img src="${logoUrl}" style="height:55px;">
            <div>
                <div style="font-size:22px;font-weight:700;color:#243547;">Maintenance KPI Board</div>
                <div style="font-size:11px;color:#888;margin-top:3px;">Production Week: <strong>${wk||'—'}</strong> &nbsp;·&nbsp; Maintenance Period: <strong>${period}</strong></div>
            </div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:10px;color:#888;">Generated · Page ${page} of 2</div>
            <div style="font-size:13px;font-weight:700;color:#243547;">${now}</div>
        </div>
    </div>`;

    const footerHTML = (page) => `
    <div style="margin-top:14px;padding-top:8px;border-top:1px solid #eee;font-size:9px;color:#aaa;display:flex;justify-content:space-between;">
        <span>Clamason Engineering — Maintenance KPI Board — Confidential</span>
        <span>Page ${page} of 2 &nbsp;·&nbsp; ${now}</span>
    </div>`;

    const sectionLabel = (text) =>
        `<div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px;letter-spacing:.5px;">${text}</div>`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Clamason Maintenance KPI Board — ${wk}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family:Arial,sans-serif; font-size:12px; color:#1a1a1a; background:#fff; }
  .page-break { page-break-before: always; }
  table.kpi { width:100%; border-collapse:collapse; margin-bottom:12px; }
  table.kpi thead tr { background:#243547; color:#fff; }
  table.kpi thead th { padding:8px 12px; text-align:left; font-size:11px; font-weight:700; }
  .asset-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #f0f0f0; }
  .asset-badge { width:24px;height:24px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0; }
  .asset-stat { text-align:center; min-width:65px; }
  .asset-stat .val { font-size:12px; font-weight:700; }
  .asset-stat .lbl { font-size:9px; color:#888; }
</style>
</head>
<body>

<!-- ═══ PAGE 1 ═══ -->
${headerHTML(1)}

${sectionLabel('📊 Business Context — Overall OEE (shared KPI)')}
<div style="background:#f8f9fa;border-radius:8px;padding:12px 16px;margin-bottom:14px;border-left:4px solid #243547;">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div>
            <div style="font-size:10px;color:#888;margin-bottom:2px;">Overall OEE</div>
            <div style="font-size:20px;font-weight:700;color:${avgOEE>=targets.avail.value?'#27ae60':'#c0392b'}">${fmt1(avgOEE)}%</div>
            <div style="font-size:10px;color:#888;">target ${targets.avail.value}%</div>
        </div>
        <div>
            <div style="font-size:10px;color:#888;margin-bottom:2px;">Performance %</div>
            <div style="font-size:20px;font-weight:700;color:#243547;">${fmt1(avgPerf)}%</div>
            <div style="font-size:10px;color:#888;">production dept</div>
        </div>
        <div>
            <div style="font-size:10px;color:#888;margin-bottom:2px;">Quality %</div>
            <div style="font-size:20px;font-weight:700;color:#243547;">${fmt1(avgQual)}%</div>
            <div style="font-size:10px;color:#888;">quality dept</div>
        </div>
        <div>
            <div style="font-size:10px;color:#888;margin-bottom:2px;">Unplanned Down</div>
            <div style="font-size:20px;font-weight:700;color:#c0392b;">${fmtH(totalUnpl)}</div>
            <div style="font-size:10px;color:#888;">this week · all presses</div>
        </div>
    </div>
</div>

${sectionLabel('🎯 Your Number — Maintenance Availability')}
<div style="background:${tlAvail.bg};border:2px solid ${tlAvail.color};border-radius:10px;padding:18px 20px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div>
            <div style="font-size:10px;color:#888;margin-bottom:4px;">Current Availability · ${wk||'—'}</div>
            <div style="font-size:52px;font-weight:700;line-height:1;color:${tlAvail.color};">${fmt1(avgAvail)}%</div>
            <div style="margin-top:4px;font-size:14px;font-weight:700;color:${tlAvail.color};">${tlAvail.icon} ${tlAvail.label}</div>
        </div>
        <div style="width:1px;height:55px;background:#ddd;flex-shrink:0;"></div>
        <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px;">Target</div>
            <div style="font-size:26px;font-weight:700;color:#243547;">${targets.avail.value}%</div>
        </div>
        <div style="width:1px;height:55px;background:#ddd;flex-shrink:0;"></div>
        <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px;">Gap</div>
            <div style="font-size:26px;font-weight:700;color:${tlAvail.color};">
                ${avgAvail>=targets.avail.value?'+':''}${fmt1(avgAvail-targets.avail.value)}%
            </div>
        </div>
        <div style="width:1px;height:55px;background:#ddd;flex-shrink:0;"></div>
        <div style="background:#fff;border-radius:8px;padding:12px 14px;max-width:260px;flex:1;">
            <div style="font-size:11px;font-weight:700;color:#243547;margin-bottom:5px;">💡 OEE Impact</div>
            <div style="font-size:13px;color:#555;line-height:1.6;">
                If Availability reaches <strong>${targets.avail.value}%</strong> target,<br>
                OEE would improve from <strong style="color:#c0392b">${fmt1(avgOEE)}%</strong>
                to approximately <strong style="color:#27ae60;font-size:16px;">${fmt1(projectedOEE)}%</strong>
            </div>
        </div>
    </div>
</div>

${sectionLabel(`📈 Availability Trend — ${weeksOnTarget} of ${availTrend.length} weeks at/above ${targets.avail.value}% target`)}
<div style="background:#f8f9fa;border-radius:8px;padding:12px 16px;margin-bottom:6px;">
    <table style="width:100%;border-collapse:collapse;">
        <tr style="vertical-align:bottom;height:60px;">${sparkBars}</tr>
    </table>
    <div style="margin-top:8px;display:flex;gap:16px;font-size:10px;color:#888;">
        <span>🟢 On target</span>
        <span>🟡 Near target (&lt;5% gap)</span>
        <span>🔴 Below target</span>
    </div>
</div>

${footerHTML(1)}

<!-- ═══ PAGE 2 ═══ -->
<div class="page-break"></div>
${headerHTML(2)}

${sectionLabel(`🔧 Maintenance KPIs — ${period} · from Agility + SFC`)}
<table class="kpi">
    <thead>
        <tr>
            <th style="width:200px;">KPI</th>
            <th style="width:120px;">Actual</th>
            <th style="width:100px;">Target</th>
            <th style="width:100px;">Gap</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        ${mRow('Availability %',     avgAvail,            'avail',       '%', true,  fmt1(avgAvail)+'%')}
        ${mRow('Equipment MTTR',         equipMTTR,           'maxMTTR',     'h', false, equipMTTR+'h')}
        ${mRow('Equipment MTBF',         equipMTBF,           'minMTBF',     'h', true,  equipMTBF>0?equipMTBF+'h':'—')}
        ${mRow('Monthly Downtime',    Math.round(totalDT), 'maxDowntime', 'h', false, Math.round(totalDT)+'h')}
        ${mRow('Total Breakdowns',   totalBDs,            'maxBDs',      '',  false, String(totalBDs))}
        ${mRow('Avg TPM per Asset',  avgTPM,              'tpmTarget',   '',  true,  fmt1(avgTPM))}
    </tbody>
</table>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;margin-top:14px;">
    <div style="background:#f0faf4;border-radius:8px;padding:11px 14px;border-left:4px solid #27ae60;">
        <div style="font-size:10px;font-weight:700;color:#155724;text-transform:uppercase;margin-bottom:4px;">🏆 Best Availability This Week</div>
        <div style="font-size:16px;font-weight:700;color:#155724;">${bestAvail?.machine||'—'}</div>
        <div style="font-size:12px;color:#155724;">${fmt1(bestAvail?.avail||0)}% availability</div>
    </div>
    <div style="background:#fff5f5;border-radius:8px;padding:11px 14px;border-left:4px solid #c0392b;">
        <div style="font-size:10px;font-weight:700;color:#721c24;text-transform:uppercase;margin-bottom:4px;">⚠️ Lowest Availability This Week</div>
        <div style="font-size:16px;font-weight:700;color:#721c24;">${worstAvail?.machine||'—'}</div>
        <div style="font-size:12px;color:#721c24;">${fmt1(worstAvail?.avail||0)}% availability</div>
    </div>
</div>

${sectionLabel('🔴 Top 5 Assets by Monthly Downtime — focus maintenance effort here')}
${top5.map((m,i) => {
    const assetMTTR = +m.breakdown_count > 0
        ? Math.round((+m.downtime_hrs / +m.breakdown_count)*10)/10 : 0;
    const mttrCol = assetMTTR<=4?'#27ae60':assetMTTR<=8?'#e67e22':'#c0392b';
    const bgCol   = ['#c0392b','#e67e22','#e6b800','#888','#aaa'][i];
    return `
    <div class="asset-row">
        <div class="asset-badge" style="background:${bgCol};">${i+1}</div>
        <div style="flex:1;font-size:13px;font-weight:700;color:#243547;">${m.name}</div>
        <div class="asset-stat"><div class="val" style="color:#c0392b;">${Math.round(+m.downtime_hrs)}h</div><div class="lbl">downtime</div></div>
        <div class="asset-stat"><div class="val">${m.breakdown_count}</div><div class="lbl">breakdowns</div></div>
        <div class="asset-stat"><div class="val" style="color:${mttrCol};">${assetMTTR}h</div><div class="lbl">MTTR</div></div>
        <div class="asset-stat"><div class="val">${m.tpm_count}</div><div class="lbl">TPM visits</div></div>
    </div>`;
}).join('')}

${footerHTML(2)}

</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
}
