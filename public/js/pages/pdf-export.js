// pdf-export.js - PDF export for maintenance reports

function exportMonthlyPDF() {
    const data = state.maintData;
    if (!data.length) { showToast('No maintenance data to export', 'error'); return; }

    const period   = data[0]?.period_label || 'Annual Report';
    const now      = new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'});
    const logoUrl  = 'https://clamason-oee-dashboard.onrender.com/icons/Clamason-Logo-Side-PNG.png';

    const totalDT   = data.reduce((s,m) => s+(+m.downtime_hrs), 0);
    const totalCost = data.reduce((s,m) => s+(+m.cost_labour), 0);
    const totalJobs = data.reduce((s,m) => s+(+m.num_jobs), 0);
    const totalBDs  = data.reduce((s,m) => s+(+m.breakdown_count), 0);
    const totalTPM  = data.reduce((s,m) => s+(+m.tpm_count), 0);
    const withDT    = data.filter(m => +m.downtime_hrs > 0).length;

    // ── Pareto SVG builder ──
    function buildParetoSVG(metric, label) {
        const sorted = [...data].filter(d => +d[metric] > 0)
            .sort((a,b) => +b[metric] - +a[metric]).slice(0, 20);
        if (!sorted.length) return '<p style="color:#aaa;font-size:11px">No data for this metric</p>';

        const total  = sorted.reduce((s,d) => s+(+d[metric]), 0);
        const maxVal = +sorted[0][metric];
        const W=840, H=300, padL=60, padR=50, padT=20, padB=85;
        const chartW = W-padL-padR, chartH = H-padT-padB;
        const barW   = chartW / sorted.length;

        let cumPct = 0;
        const bars = [], linePoints = [];

        sorted.forEach((d,i) => {
            const val  = +d[metric];
            const barH = (val/maxVal)*chartH;
            const x    = padL + i*barW;
            const y    = padT + chartH - barH;
            cumPct    += (val/total)*100;
            const lx   = padL + i*barW + barW/2;
            const ly   = padT + chartH - (cumPct/100)*chartH;
            linePoints.push(`${lx},${ly}`);
            const prevCum = cumPct - (val/total)*100;
            const col  = prevCum < 50 ? '#c0392b' : prevCum < 80 ? '#e67e22' : '#e6b800';
            const fmtV = metric==='cost_labour' ? (v=>v>=1000?`£${(v/1000).toFixed(1)}k`:`£${Math.round(v)}`)
                       : metric==='downtime_hrs' ? (v=>`${Math.round(v)}h`)
                       : (v=>`${Math.round(v)}`);
            bars.push(`<rect x="${x+2}" y="${y}" width="${barW-4}" height="${barH}" fill="${col}" rx="2"/>`);
            bars.push(`<text x="${lx}" y="${y-3}" text-anchor="middle" font-size="8" fill="#333">${fmtV(val)}</text>`);
        });

        const line80Y  = padT + chartH - 0.8*chartH;
        const xLabels  = sorted.map((d,i) => {
            const x    = padL + i*barW + barW/2;
            const name = d.name.length > 13 ? d.name.slice(0,12)+'…' : d.name;
            return `<text x="${x}" y="${H-padB+12}" text-anchor="end"
                transform="rotate(-35,${x},${H-padB+12})" font-size="9" fill="#444">${name}</text>`;
        }).join('');
        const yLabels  = [0,25,50,75,100].map(pct => {
            const y = padT + chartH - (pct/100)*chartH;
            return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#eee" stroke-width="1"/>
                    <text x="${W-padR+4}" y="${y+4}" font-size="9" fill="#888">${pct}%</text>`;
        }).join('');

        let cum80=0, count80=0;
        for (const d of sorted) { cum80 += (+d[metric]/total)*100; count80++; if(cum80>=80) break; }

        return `
        <div style="margin-bottom:5px;font-size:11px;color:#555;background:#f0f5e8;
            border-left:4px solid #95C11F;padding:5px 10px;border-radius:4px;">
            🎯 <strong>${count80} machine${count80>1?'s':''}</strong> account for
            <strong>80%</strong> of total ${label.toLowerCase()} — focus here first
        </div>
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
            ${yLabels}
            <line x1="${padL}" y1="${line80Y}" x2="${W-padR}" y2="${line80Y}"
                stroke="#243547" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.3"/>
            <text x="${W-padR+4}" y="${line80Y-3}" font-size="9" fill="#243547" font-weight="700" opacity="0.5">80%</text>
            ${bars.join('')}
            <polyline points="${linePoints.join(' ')}" fill="none" stroke="#243547" stroke-width="2"/>
            ${linePoints.map(pt => { const[lx,ly]=pt.split(','); return `<circle cx="${lx}" cy="${ly}" r="3" fill="#243547"/>`; }).join('')}
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#ccc" stroke-width="1"/>
            <line x1="${padL}" y1="${padT+chartH}" x2="${W-padR}" y2="${padT+chartH}" stroke="#ccc" stroke-width="1"/>
            ${xLabels}
        </svg>
        <div style="display:flex;gap:14px;font-size:9px;color:#666;margin-top:3px;">
            <span>🟥 First 50%</span><span>🟧 50–80%</span><span>🟨 Last 20%</span>
            <span>— Cumulative %</span><span>- - 80% line</span>
        </div>`;
    }

    // ── Top 10 table rows ──
    const top10 = [...data].filter(m => +m.downtime_hrs > 0)
        .sort((a,b) => +b.downtime_hrs - +a.downtime_hrs).slice(0,10);

    const tableRows = top10.map((m,i) => {
        const bds      = Array.isArray(m.breakdowns) ? m.breakdowns : JSON.parse(m.breakdowns||'[]');
        const topCause = bds[0] ? bds[0].desc.slice(0,55) : '—';
        const mttr     = +m.breakdown_count > 0 ? Math.round((+m.downtime_hrs/+m.breakdown_count)*10)/10 : 0;
        const mttrCol  = mttr<=4?'#27ae60':mttr<=8?'#e67e22':'#c0392b';
        return `<tr style="background:${i%2===0?'#fafafa':'#fff'}">
            <td style="padding:6px 10px;font-weight:700;color:#243547">${m.name}</td>
            <td style="padding:6px 10px;text-align:center;color:#c0392b;font-weight:700">${Math.round(+m.downtime_hrs)}h</td>
            <td style="padding:6px 10px;text-align:center">${m.breakdown_count}</td>
            <td style="padding:6px 10px;text-align:center;color:${mttrCol};font-weight:700">${mttr}h</td>
            <td style="padding:6px 10px;text-align:center">${m.tpm_count}</td>
            <td style="padding:6px 10px;text-align:right;font-weight:700">${+m.cost_labour>=1000?`£${(+m.cost_labour/1000).toFixed(1)}k`:`£${Math.round(+m.cost_labour)}`}</td>
            <td style="padding:6px 10px;color:#555;font-size:10px">${topCause}</td>
        </tr>`;
    }).join('');

    // ── TPM vs Reactive summary ──
    const tpmPct   = totalTPM+totalBDs > 0 ? Math.round((totalTPM/(totalTPM+totalBDs))*100) : 0;
    const tpmCol   = tpmPct >= 50 ? '#27ae60' : tpmPct >= 35 ? '#e67e22' : '#c0392b';
    const tpmLabel = tpmPct >= 50 ? '✅ TPM leading — good maintenance balance'
                   : tpmPct >= 35 ? '⚠️ More reactive than planned — increase TPM'
                   : '🔴 Heavily reactive — TPM programme needs attention';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Clamason Maintenance Report — ${period}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  @page { size: A4; margin: 14mm; }
  body { font-family:Arial,sans-serif; font-size:12px; color:#1a1a1a; background:#fff; }
  .page-break { page-break-before: always; }
  h2 { font-size:14px; color:#243547; margin-bottom:8px; padding-bottom:5px; border-bottom:2px solid #f0f0f0; }
  table { width:100%; border-collapse:collapse; }
  thead tr { background:#243547; color:#fff; }
  thead th { padding:7px 10px; text-align:left; font-size:11px; }
  tbody td { border-bottom:1px solid #f0f0f0; }
</style>
</head>
<body>

<!-- ═══ PAGE 1 — SUMMARY ═══ -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;
    padding-bottom:12px;border-bottom:3px solid #243547;margin-bottom:16px;">
  <div style="display:flex;align-items:center;gap:14px;">
    <img src="${logoUrl}" style="height:50px;">
    <div>
      <div style="font-size:20px;font-weight:700;color:#243547;">Maintenance Performance Report</div>
      <div style="font-size:11px;color:#888;margin-top:3px;">Period: <strong>${period}</strong></div>
    </div>
  </div>
  <div style="text-align:right;font-size:11px;color:#888;">
    <div>Generated: <strong>${now}</strong></div>
    <div>Page 1 of 3</div>
  </div>
</div>

<!-- KPI summary strip -->
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px;">
  <div style="background:#fff5f5;border-radius:8px;padding:10px 12px;border-left:4px solid #c0392b;">
    <div style="font-size:9px;color:#888;text-transform:uppercase;font-weight:700;">Annual Downtime</div>
    <div style="font-size:22px;font-weight:700;color:#c0392b;">${Math.round(totalDT).toLocaleString()}h</div>
  </div>
  <div style="background:#f8f9fa;border-radius:8px;padding:10px 12px;border-left:4px solid #243547;">
    <div style="font-size:9px;color:#888;text-transform:uppercase;font-weight:700;">Work Orders</div>
    <div style="font-size:22px;font-weight:700;color:#243547;">${totalJobs}</div>
  </div>
  <div style="background:#f8f9fa;border-radius:8px;padding:10px 12px;border-left:4px solid #243547;">
    <div style="font-size:9px;color:#888;text-transform:uppercase;font-weight:700;">Breakdowns</div>
    <div style="font-size:22px;font-weight:700;color:#243547;">${totalBDs}</div>
  </div>
  <div style="background:#f0faf4;border-radius:8px;padding:10px 12px;border-left:4px solid #27ae60;">
    <div style="font-size:9px;color:#888;text-transform:uppercase;font-weight:700;">TPM Visits</div>
    <div style="font-size:22px;font-weight:700;color:#27ae60;">${totalTPM}</div>
  </div>
  <div style="background:#f8f9fa;border-radius:8px;padding:10px 12px;border-left:4px solid #243547;">
    <div style="font-size:9px;color:#888;text-transform:uppercase;font-weight:700;">Labour Cost</div>
    <div style="font-size:22px;font-weight:700;color:#243547;">${totalCost>=1000?'£'+(totalCost/1000).toFixed(1)+'k':'£'+Math.round(totalCost)}</div>
  </div>
</div>

<!-- TPM vs Reactive -->
<div style="background:#f8f9fa;border-radius:8px;padding:12px 16px;margin-bottom:16px;
    border-left:4px solid ${tpmCol};">
  <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:8px;">
    TPM vs Reactive Balance
  </div>
  <div style="display:flex;align-items:center;gap:20px;">
    <div>
      <div style="font-size:32px;font-weight:700;color:${tpmCol};">${tpmPct}%</div>
      <div style="font-size:10px;color:#888;">planned TPM</div>
    </div>
    <div style="flex:1;background:#eee;border-radius:4px;height:16px;overflow:hidden;">
      <div style="width:${tpmPct}%;height:100%;background:${tpmCol};border-radius:4px;"></div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:14px;font-weight:700;color:#243547;">${totalTPM} TPM · ${totalBDs} Reactive</div>
      <div style="font-size:11px;color:${tpmCol};font-weight:700;">${tpmLabel}</div>
    </div>
  </div>
</div>

<!-- Top 10 table -->
<h2>Top 10 Assets by Downtime</h2>
<table>
  <thead>
    <tr>
      <th>Asset</th>
      <th style="text-align:center">Downtime</th>
      <th style="text-align:center">Breakdowns</th>
      <th style="text-align:center">MTTR</th>
      <th style="text-align:center">TPM</th>
      <th style="text-align:right">Labour Cost</th>
      <th>Top Cause</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

<div style="margin-top:10px;font-size:9px;color:#aaa;text-align:right;">
  Clamason Engineering — Maintenance Performance Report — Confidential — ${now}
</div>

<!-- ═══ PAGE 2 — PARETO: DOWNTIME ═══ -->
<div class="page-break"></div>
<div style="display:flex;justify-content:space-between;align-items:center;
    padding-bottom:10px;border-bottom:3px solid #243547;margin-bottom:14px;">
  <div style="display:flex;align-items:center;gap:12px;">
    <img src="${logoUrl}" style="height:40px;">
    <div style="font-size:17px;font-weight:700;color:#243547;">
      Pareto Analysis — Downtime Hours
    </div>
  </div>
  <div style="font-size:10px;color:#888;">Page 2 of 3 &nbsp;·&nbsp; ${period}</div>
</div>
${buildParetoSVG('downtime_hrs', 'Downtime Hours')}

<div style="margin-top:12px;font-size:9px;color:#aaa;text-align:right;">
  Clamason Engineering — Maintenance Performance Report — Confidential — ${now}
</div>

<!-- ═══ PAGE 3 — PARETO: BREAKDOWNS ═══ -->
<div class="page-break"></div>
<div style="display:flex;justify-content:space-between;align-items:center;
    padding-bottom:10px;border-bottom:3px solid #243547;margin-bottom:14px;">
  <div style="display:flex;align-items:center;gap:12px;">
    <img src="${logoUrl}" style="height:40px;">
    <div style="font-size:17px;font-weight:700;color:#243547;">
      Pareto Analysis — Breakdown Count
    </div>
  </div>
  <div style="font-size:10px;color:#888;">Page 3 of 3 &nbsp;·&nbsp; ${period}</div>
</div>
${buildParetoSVG('breakdown_count', 'Breakdown Count')}

<div style="margin-top:12px;font-size:9px;color:#aaa;text-align:right;">
  Clamason Engineering — Maintenance Performance Report — Confidential — ${now}
</div>

</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
}
