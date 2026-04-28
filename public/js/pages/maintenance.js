// maintenance.js - Maintenance page with Pareto analysis

let paretoMetric = 'downtime_hrs';

function renderMaintPage() {
    const data = state.maintData;
    if (!data.length) {
        document.getElementById('maintKpiGrid').innerHTML = '';
        document.getElementById('maintBarChart').innerHTML = emptyState('No Agility data yet — upload an AG3-601 report');
        document.getElementById('paretoCard').innerHTML = '';
        document.getElementById('maintTableBody').innerHTML = '';
        return;
    }

    const totalDT = data.reduce((s, m) => s + (+m.downtime_hrs), 0);
    const totalCost = data.reduce((s, m) => s + (+m.cost_labour), 0);
    const totalJobs = data.reduce((s, m) => s + (+m.num_jobs), 0);
    const withDT = data.filter(m => +m.downtime_hrs > 0).length;
    const period = data[0]?.period_label || '';

    document.getElementById('maintKpiGrid').innerHTML = `
        <div class="kpi-card" style="border-left-color:#c0392b">
            <div class="kpi-label">Total Downtime</div>
            <div class="kpi-value" style="color:#c0392b">${Math.round(totalDT).toLocaleString()}h</div>
            <div class="kpi-sub">${period}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Total Labour Cost</div>
            <div class="kpi-value">${fmtK(totalCost)}</div>
            <div class="kpi-sub">maintenance labour</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Work Orders</div>
            <div class="kpi-value">${totalJobs}</div>
            <div class="kpi-sub">across all assets</div>
        </div>
        <div class="kpi-card" style="border-left-color:#e67e22">
            <div class="kpi-label">Assets With Downtime</div>
            <div class="kpi-value" style="color:#e67e22">${withDT}</div>
            <div class="kpi-sub">recorded breakdown time</div>
        </div>`;

    document.getElementById('maintPeriodLabel').textContent = period;

    // Bar chart — top 15
    const top = [...data].sort((a, b) => +b.downtime_hrs - +a.downtime_hrs).slice(0, 15);
    const maxDT = +top[0]?.downtime_hrs || 1;
    document.getElementById('maintBarChart').innerHTML = top.map(m => {
        const pct = (+m.downtime_hrs / maxDT) * 100;
        const col = +m.downtime_hrs >= 500 ? '#c0392b' : +m.downtime_hrs >= 200 ? '#e67e22' : +m.downtime_hrs >= 50 ? '#e6b800' : '#27ae60';
        return `<div class="bar-row">
            <div class="bar-machine-name" title="${m.name}">${m.name}</div>
            <div class="bar-track" style="cursor:pointer" onclick="showPage('detail',${JSON.stringify({ ...m, type: 'maint' }).replace(/"/g, '&quot;')})">
                <div class="bar-fill" style="width:${pct}%;background:${col};"></div>
            </div>
            <span class="bar-value-out">${+m.downtime_hrs > 0 ? Math.round(+m.downtime_hrs) + 'h' : ''}</span>
        </div>`;
    }).join('');

    renderPareto();
    renderTrendCharts();
    renderMaintTable();
}

function renderPareto() {
    const data = state.maintData;
    if (!data.length) return;

    const metrics = {
        downtime_hrs: { label: 'Downtime Hrs', fmt: v => `${Math.round(v)}h`, color: '#c0392b' },
        cost_labour: { label: 'Labour Cost', fmt: v => fmtK(v), color: '#e67e22' },
        breakdown_count: { label: 'Breakdowns', fmt: v => `${Math.round(v)}`, color: '#243547' },
    };
    const m = metrics[paretoMetric];

    const sorted = [...data]
        .filter(d => +d[paretoMetric] > 0)
        .sort((a, b) => +b[paretoMetric] - +a[paretoMetric])
        .slice(0, 20);

    if (!sorted.length) {
        document.getElementById('paretoCard').innerHTML = `<div class="card"><p style="color:#aaa;text-align:center;padding:20px">No data for this metric</p></div>`;
        return;
    }

    const total = sorted.reduce((s, d) => s + +d[paretoMetric], 0);
    const maxVal = +sorted[0][paretoMetric];

    const W = 900, H = 340;
    const padL = 60, padR = 60, padT = 20, padB = 110;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const barW = chartW / sorted.length;

    let cumPct = 0;
    const bars = [], linePoints = [];

    sorted.forEach((d, i) => {
        const val = +d[paretoMetric];
        const barH = (val / maxVal) * chartH;
        const x = padL + i * barW;
        const y = padT + chartH - barH;
        cumPct += (val / total) * 100;
        const lineX = padL + i * barW + barW / 2;
        const lineY = padT + chartH - (cumPct / 100) * chartH;
        linePoints.push(`${lineX},${lineY}`);

        const prevCum = cumPct - (val / total) * 100;
        const col = prevCum < 50 ? '#c0392b' : prevCum < 80 ? '#e67e22' : '#e6b800';

        bars.push(`
            <rect x="${x + 2}" y="${y}" width="${barW - 4}" height="${barH}"
                  fill="${col}" rx="2" style="cursor:pointer"
                  onclick="showPage('detail',${JSON.stringify({ ...d, type: 'maint' }).replace(/"/g, '&quot;')})"
                  title="${d.name}: ${m.fmt(val)}">
                <title>${d.name}: ${m.fmt(val)}</title>
            </rect>`);
    });

    const line80Y = padT + chartH - 0.8 * chartH;

    const xLabels = sorted.map((d, i) => {
        const x = padL + i * barW + barW / 2;
        const name = d.name.length > 15 ? d.name.slice(0, 14) + '…' : d.name;
        return `<text x="${x}" y="${H - padB + 14}" text-anchor="end"
                      transform="rotate(-45,${x},${H - padB + 14})"
                      font-size="10" fill="#555">${name}</text>`;
    }).join('');

    const yLabels = [0, 25, 50, 75, 100].map(pct => {
        const y = padT + chartH - (pct / 100) * chartH;
        const val = (pct / 100) * maxVal;
        return `
            <text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#888">${m.fmt(val)}</text>
            <text x="${W - padR + 6}" y="${y + 4}" text-anchor="start" font-size="10" fill="#888">${pct}%</text>
            <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>`;
    }).join('');

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
        ${yLabels}
        <line x1="${padL}" y1="${line80Y}" x2="${W - padR}" y2="${line80Y}"
              stroke="#243547" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.4"/>
        <text x="${W - padR + 6}" y="${line80Y - 4}" font-size="10" fill="#243547" font-weight="700" opacity="0.6">80%</text>
        ${bars.join('')}
        <polyline points="${linePoints.join(' ')}" fill="none" stroke="#243547" stroke-width="2.5"/>
        ${linePoints.map((pt, i) => {
        const [lx, ly] = pt.split(',');
        return `<circle cx="${lx}" cy="${ly}" r="4" fill="#243547"/>`;
    }).join('')}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#ccc" stroke-width="1"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#ccc" stroke-width="1"/>
        ${xLabels}
    </svg>`;

    let cum80 = 0, count80 = 0;
    for (const d of sorted) {
        cum80 += (+d[paretoMetric] / total) * 100;
        count80++;
        if (cum80 >= 80) break;
    }

    document.getElementById('paretoCard').innerHTML = `
        <div class="card">
            <div class="card-header">
                <span class="card-title">📊 Pareto Analysis</span>
                <div style="display:flex;gap:6px;">
                    ${Object.entries(metrics).map(([k, v]) =>
        `<button onclick="setParetoMetric('${k}')"
                            style="padding:5px 12px;border-radius:16px;border:1px solid ${k === paretoMetric ? v.color : '#ddd'};
                                   background:${k === paretoMetric ? v.color : '#fff'};color:${k === paretoMetric ? '#fff' : '#666'};
                                   font-size:12px;font-weight:700;cursor:pointer">${v.label}</button>`
    ).join('')}
                </div>
            </div>
            <div style="background:#f9f9f9;border-radius:6px;padding:10px;margin-bottom:12px;font-size:13px;color:#555">
                🎯 <strong>${count80} machine${count80 > 1 ? 's' : ''}</strong> account for <strong>80%</strong> of total ${m.label.toLowerCase()}
                &nbsp;·&nbsp; Focus here first for maximum impact
            </div>
            <div style="overflow-x:auto">${svg}</div>
            <div style="display:flex;align-items:center;gap:16px;margin-top:10px;font-size:11px;color:#888;flex-wrap:wrap;">
                <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:#c0392b;border-radius:2px;display:inline-block"></span>First 50% of impact</span>
                <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:#e67e22;border-radius:2px;display:inline-block"></span>50–80% of impact</span>
                <span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:#e6b800;border-radius:2px;display:inline-block"></span>Last 20% of impact</span>
                <span style="display:flex;align-items:center;gap:4px"><span style="width:24px;height:2px;background:#243547;display:inline-block"></span>Cumulative %</span>
                <span style="display:flex;align-items:center;gap:4px"><span style="width:24px;height:2px;background:#243547;display:inline-block;opacity:0.4"></span>80% threshold</span>
            </div>
        </div>`;
}

// ── MONTHLY TREND CHARTS ─────────────────────────────────────────────────────
function renderTrendCharts() {
    const el = document.getElementById('maintTrendCharts');
    if (!el) return;
    const trends = state.maintTrends || [];
    if (!trends.length) {
        el.innerHTML = `<div class="card" style="grid-column:1/-1;padding:20px;text-align:center;color:#aaa">
            Upload monthly Agility reports to see trend charts</div>`;
        return;
    }

    const charts = [
        { key: 'breakdowns', label: 'Breakdowns', color: '#c0392b', unit: '', fmt: v => Math.round(v) },
        { key: 'tpm',        label: 'PPM Conducted', color: '#95C11F', unit: '', fmt: v => Math.round(v) },
        { key: 'mttr',       label: 'Mean Time To Repair', color: '#e67e22', unit: 'h', fmt: v => (+v).toFixed(1) },
        { key: 'downtime_hrs', label: 'Total Downtime', color: '#243547', unit: 'h', fmt: v => Math.round(v) },
    ];

    el.innerHTML = charts.map(chart => {
        const vals = trends.map(t => +t[chart.key] || 0);
        const maxV = Math.max(...vals, 1);
        const W = 420, H = 200, padL = 40, padR = 10, padT = 20, padB = 50;
        const chartH = H - padT - padB, chartW = W - padL - padR;
        const bw = Math.min(30, chartW / trends.length - 4);
        const gap = chartW / trends.length;

        // Y ticks
        const yMax = Math.ceil(maxV / 5) * 5 || 10;
        const ticks = [0, Math.round(yMax*0.5), yMax];

        let bars = '', yLabels = '', xLabels = '';

        ticks.forEach(v => {
            const y = padT + chartH - (v/yMax)*chartH;
            yLabels += `<text x="${padL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="9" fill="#bbb">${v}${chart.unit}</text>`;
            yLabels += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="#f0f0f0" stroke-width="1"/>`;
        });

        // Target line for MTTR (8h)
        let targetLine = '';
        if (chart.key === 'mttr') {
            const ty = padT + chartH - (8/yMax)*chartH;
            if (ty > padT) targetLine = `<line x1="${padL}" y1="${ty.toFixed(1)}" x2="${W-padR}" y2="${ty.toFixed(1)}" stroke="#c0392b" stroke-width="1.5" stroke-dasharray="4,2"/>
            <text x="${W-padR-2}" y="${(ty-3).toFixed(1)}" text-anchor="end" font-size="8" fill="#c0392b">T8h</text>`;
        }

        let linePoints = [];
        trends.forEach((t, i) => {
            const v = +t[chart.key] || 0;
            const x = padL + i * gap + gap/2;
            const bh = (v/yMax)*chartH;
            const baseY = padT + chartH;
            bars += `<rect x="${(x-bw/2).toFixed(1)}" y="${(baseY-bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" fill="${chart.color}" rx="2" opacity="0.85"/>`;
            if (v > 0) bars += `<text x="${x.toFixed(1)}" y="${(baseY-bh-3).toFixed(1)}" text-anchor="middle" font-size="8" fill="${chart.color}" font-weight="700">${chart.fmt(v)}</text>`;
            xLabels += `<text x="${x.toFixed(1)}" y="${H-padB+14}" text-anchor="end" transform="rotate(-35,${x.toFixed(1)},${H-padB+14})" font-size="9" fill="#999">${t.period_label}</text>`;
            linePoints.push(`${x.toFixed(1)},${(baseY-bh).toFixed(1)}`);
        });

        // Trend line
        let trendLine = '';
        if (linePoints.length > 1) {
            trendLine = `<polyline points="${linePoints.join(' ')}" fill="none" stroke="${chart.color}" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.5"/>`;
        }

        return `<div class="card" style="padding:14px 16px">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${chart.label}</div>
            <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
                ${yLabels}${targetLine}${bars}${trendLine}
                <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
                <line x1="${padL}" y1="${padT+chartH}" x2="${W-padR}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
                ${xLabels}
            </svg>
        </div>`;
    }).join('');
}

function setParetoMetric(metric) {
    paretoMetric = metric;
    renderPareto();
}

function getMaintFiltered() {
    let data = [...state.maintData];
    const s = document.getElementById('maintSearch')?.value.toLowerCase() || '';
    const f = document.getElementById('maintFilter')?.value || '';
    if (s) data = data.filter(m => m.name.toLowerCase().includes(s));
    if (f === 'dt') data = data.filter(m => +m.downtime_hrs > 0);
    if (f === 'nodt') data = data.filter(m => +m.downtime_hrs === 0);
    return data.sort((a, b) => {
        const av = a[state.sortMaintCol] ?? 0, bv = b[state.sortMaintCol] ?? 0;
        return (av > bv ? 1 : -1) * state.sortMaintDir;
    });
}

function renderMaintTable() {
    const data = getMaintFiltered();
    const tbody = document.getElementById('maintTableBody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#aaa">No data</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(m => {
        const bds = Array.isArray(m.breakdowns) ? m.breakdowns : (typeof m.breakdowns === 'string' ? JSON.parse(m.breakdowns) : []);
        const topCause = bds[0] ? `<span style="font-size:12px">${bds[0].desc.slice(0, 50)}</span><br><span style="font-size:11px;color:#aaa">${bds[0].downtime_hrs}h</span>` : '<span style="color:#aaa;font-size:12px">—</span>';
        return `<tr onclick="showPage('detail',${JSON.stringify({ ...m, type: 'maint' }).replace(/"/g, '&quot;')})">
            <td class="name-cell">${m.name}<br><span style="font-size:10px;color:#aaa">${m.code}</span></td>
            <td><span class="badge ${dtBadgeClass(m.downtime_hrs)}">${fmt1(m.downtime_hrs)}h</span></td>
            <td>${m.breakdown_count}</td>
            <td>${m.tpm_count}</td>
            <td>${fmt1(m.labour_hrs)}h</td>
            <td>${fmtK(m.cost_labour)}</td>
            <td style="min-width:220px">${topCause}</td>
        </tr>`;
    }).join('');
}

function sortMaint(col) {
    state.sortMaintDir = state.sortMaintCol === col ? state.sortMaintDir * -1 : -1;
    state.sortMaintCol = col;
    renderMaintTable();
}
