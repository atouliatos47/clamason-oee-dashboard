// kpi.js - KPI Board for board meetings

const DEFAULT_TARGETS = {
    oee: { value: 65, label: 'OEE', unit: '%' },
    avail: { value: 75, label: 'Availability', unit: '%' },
    perf: { value: 90, label: 'Performance', unit: '%' },
    quality: { value: 99, label: 'Quality', unit: '%' },
    maxDowntime: { value: 3000, label: 'Max Annual Downtime', unit: 'h' },
    maxBDs: { value: 200, label: 'Max Breakdowns', unit: '' },
};

function getTargets() {
    const saved = localStorage.getItem('clamason_kpi_targets');
    return saved ? { ...DEFAULT_TARGETS, ...JSON.parse(saved) } : { ...DEFAULT_TARGETS };
}

function saveTarget(key, value) {
    const targets = getTargets();
    targets[key].value = value;
    localStorage.setItem('clamason_kpi_targets', JSON.stringify(targets));
}

function trafficLight(actual, target, higherIsBetter = true) {
    const pct = higherIsBetter ? actual / target : target / actual;
    if (pct >= 1) return { color: '#27ae60', icon: '🟢', label: 'On Target', bg: '#f0faf4' };
    if (pct >= 0.95) return { color: '#e67e22', icon: '🟡', label: 'Near Target', bg: '#fffbf0' };
    return { color: '#c0392b', icon: '🔴', label: 'Below Target', bg: '#fff5f5' };
}

function editableTarget(key, value, unit) {
    return `<span 
        contenteditable="true" 
        onblur="updateTarget('${key}', this.innerText)"
        style="cursor:text;border-bottom:1px dashed #95C11F;padding:0 2px;color:#243547;font-weight:700;"
        title="Click to edit target"
    >${value}${unit}</span>`;
}

function updateTarget(key, rawVal) {
    const num = parseFloat(rawVal.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
        saveTarget(key, num);
        renderKPIBoard();
    }
}

function renderKPIBoard() {
    const el = document.getElementById('kpiBoard');
    if (!el) return;

    const targets = getTargets();
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);
    const maint = state.maintData || [];
    const period = maint[0]?.period_label || 'Annual';

    // Actuals — Production
    const avgOEE = active.length ? active.reduce((s, d) => s + (+d.oee), 0) / active.length : 0;
    const avgAvail = active.length ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const avgPerf = active.length ? active.reduce((s, d) => s + (+d.perf), 0) / active.length : 0;
    const avgQual = active.length ? active.reduce((s, d) => s + (+d.quality), 0) / active.length : 0;
    const totalUnpl = data.reduce((s, d) => s + (+d.unplanned_h), 0);
    const totalParts = data.reduce((s, d) => s + (+d.total_parts), 0);
    const bestOEE = [...active].sort((a, b) => +b.oee - +a.oee)[0];
    const worstOEE = [...active].sort((a, b) => +a.oee - +b.oee)[0];

    // Actuals — Maintenance
    const totalDT = maint.reduce((s, m) => s + (+m.downtime_hrs), 0);
    const totalBDs = maint.reduce((s, m) => s + (+m.breakdown_count), 0);
    const worstMachine = [...maint].sort((a, b) => +b.downtime_hrs - +a.downtime_hrs)[0];

    // OEE trend
    const weekTrend = state.weeks.map(w => {
        const wd = (state.oeeData[w] || []).filter(d => +d.oee > 0);
        return { week: w, avg: wd.length ? wd.reduce((s, d) => s + (+d.oee), 0) / wd.length : 0 };
    });
    const weeksOnTarget = weekTrend.filter(w => w.avg >= targets.oee.value).length;

    // Production KPI rows
    const prodRows = [
        { key: 'oee', label: 'OEE %', actual: avgOEE, unit: '%', higher: true },
        { key: 'avail', label: 'Availability %', actual: avgAvail, unit: '%', higher: true },
        { key: 'perf', label: 'Performance %', actual: avgPerf, unit: '%', higher: true },
        { key: 'quality', label: 'Quality %', actual: avgQual, unit: '%', higher: true },
    ];

    // Maintenance KPI rows
    const maintRows = [
        { key: 'maxDowntime', label: 'Annual Downtime', actual: Math.round(totalDT), unit: 'h', higher: false },
        { key: 'maxBDs', label: 'Total Breakdowns', actual: totalBDs, unit: '', higher: false },
    ];

    function kpiRow(row) {
        const t = targets[row.key];
        const tl = trafficLight(row.actual, t.value, row.higher);
        const gap = row.higher
            ? (row.actual - t.value).toFixed(1)
            : (t.value - row.actual).toFixed(1);
        const gapText = +gap >= 0
            ? `<span style="color:#27ae60">+${gap}${row.unit}</span>`
            : `<span style="color:#c0392b">${gap}${row.unit}</span>`;

        return `<tr style="background:${tl.bg};">
            <td style="padding:12px 16px;font-weight:700;color:#243547;width:200px;">${row.label}</td>
            <td style="padding:12px 16px;font-size:20px;font-weight:700;color:${tl.color};width:120px;">${fmt1(row.actual)}${row.unit}</td>
            <td style="padding:12px 16px;width:140px;">${editableTarget(row.key, t.value, row.unit)}</td>
            <td style="padding:12px 16px;width:100px;">${gapText}</td>
            <td style="padding:12px 16px;font-size:18px;">${tl.icon} ${tl.label}</td>
        </tr>`;
    }

    // Sparkline
    const sparkline = weekTrend.map(w => {
        const h = Math.max((w.avg / 100) * 50, 2);
        const tl = trafficLight(w.avg, targets.oee.value);
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
            <div style="font-size:9px;color:#888">${fmt1(w.avg)}%</div>
            <div style="height:${h}px;width:100%;background:${tl.color};border-radius:2px 2px 0 0;min-height:2px"></div>
            <div style="font-size:9px;color:#888">${w.week}</div>
        </div>`;
    }).join('');

    // Top 3 downtime
    const top3 = [...maint].filter(m => +m.downtime_hrs > 0)
        .sort((a, b) => +b.downtime_hrs - +a.downtime_hrs).slice(0, 3);

    el.innerHTML = `
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
            <div>
                <h2 style="color:#243547;font-size:22px;margin:0">🎯 KPI Board</h2>
                <div style="color:#888;font-size:13px;margin-top:4px;">
                    Week: <strong>${wk || '—'}</strong> &nbsp;·&nbsp; 
                    Maintenance: <strong>${period}</strong> &nbsp;·&nbsp;
                    <span style="color:#95C11F;font-size:12px;">✎ Click any target to edit</span>
                </div>
            </div>
            <button class="btn btn-lime" onclick="exportKPIPDF()" style="font-size:12px;padding:8px 16px;">📄 Export PDF</button>
        </div>

        <!-- Production Table -->
        <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden;">
            <div class="card-header" style="padding:14px 16px;">
                <span class="card-title">⚙️ Production Performance</span>
                <span class="card-sub">${wk || '—'} · from SFC</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#243547;color:#fff;">
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">KPI</th>
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">This Week</th>
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">Target <span style="color:#95C11F;font-size:10px;">(click to edit)</span></th>
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">Gap</th>
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${prodRows.map(kpiRow).join('')}
                    <tr style="background:#fafafa;">
                        <td style="padding:12px 16px;font-weight:700;color:#243547;">Parts Made</td>
                        <td style="padding:12px 16px;font-size:20px;font-weight:700;color:#243547;">${fmtN(totalParts)}</td>
                        <td colspan="3" style="padding:12px 16px;color:#888;font-size:12px;">production output this week</td>
                    </tr>
                    <tr style="background:#fff5f5;">
                        <td style="padding:12px 16px;font-weight:700;color:#243547;">Unplanned Down</td>
                        <td style="padding:12px 16px;font-size:20px;font-weight:700;color:#c0392b;">${fmtH(totalUnpl)}</td>
                        <td colspan="3" style="padding:12px 16px;color:#888;font-size:12px;">all presses this week</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Best / Worst -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="background:#f0faf4;border-radius:10px;padding:14px 18px;border-left:4px solid #27ae60;">
                <div style="font-size:11px;font-weight:700;color:#155724;text-transform:uppercase;margin-bottom:6px;">🏆 Best Machine This Week</div>
                <div style="font-size:18px;font-weight:700;color:#155724;">${bestOEE?.machine || '—'}</div>
                <div style="font-size:13px;color:#155724;">${fmt1(bestOEE?.oee || 0)}% OEE</div>
            </div>
            <div style="background:#fff5f5;border-radius:10px;padding:14px 18px;border-left:4px solid #c0392b;">
                <div style="font-size:11px;font-weight:700;color:#721c24;text-transform:uppercase;margin-bottom:6px;">⚠️ Needs Attention</div>
                <div style="font-size:18px;font-weight:700;color:#721c24;">${worstOEE?.machine || '—'}</div>
                <div style="font-size:13px;color:#721c24;">${fmt1(worstOEE?.oee || 0)}% OEE</div>
            </div>
        </div>

        <!-- OEE Trend -->
        <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
                <span class="card-title">📈 OEE Trend</span>
                <span class="card-sub">${weeksOnTarget} of ${weekTrend.length} weeks at/above ${targets.oee.value}% target</span>
            </div>
            <div style="display:flex;gap:6px;align-items:flex-end;height:80px;padding:0 4px;">
                ${sparkline}
            </div>
            <div style="margin-top:8px;display:flex;gap:16px;font-size:11px;color:#888;">
                <span>🟢 On target</span>
                <span>🟡 Near target</span>
                <span>🔴 Below target</span>
            </div>
        </div>

        <!-- Maintenance Table -->
        <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden;">
            <div class="card-header" style="padding:14px 16px;">
                <span class="card-title">🔧 Maintenance Performance</span>
                <span class="card-sub">${period} · from Agility</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#243547;color:#fff;">
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">KPI</th>
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">Actual</th>
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">Target <span style="color:#95C11F;font-size:10px;">(click to edit)</span></th>
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">Gap</th>
                        <th style="padding:10px 16px;text-align:left;font-size:12px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${maintRows.map(kpiRow).join('')}
                </tbody>
            </table>
        </div>

        <!-- Top 3 -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">Top 3 Assets by Annual Downtime</span>
            </div>
            ${top3.map((m, i) => `
                <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <div style="width:28px;height:28px;border-radius:50%;background:${i === 0 ? '#c0392b' : i === 1 ? '#e67e22' : '#e6b800'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${i + 1}</div>
                    <div style="flex:1;font-size:14px;font-weight:700;color:#243547;">${m.name}</div>
                    <div style="font-size:14px;color:#c0392b;font-weight:700;">${Math.round(+m.downtime_hrs)}h</div>
                    <div style="font-size:12px;color:#888;min-width:100px;">${m.breakdown_count} breakdowns</div>
                </div>`).join('')}
        </div>`;
}