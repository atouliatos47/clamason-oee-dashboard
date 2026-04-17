// kpi.js - Maintenance KPI Board for board meetings

const DEFAULT_TARGETS = {
    avail: { value: 75, label: 'Availability', unit: '%' },
    maxDowntime: { value: 3000, label: 'Max Annual Downtime', unit: 'h' },
    maxBDs: { value: 200, label: 'Max Breakdowns', unit: '' },
    maxMTTR: { value: 4, label: 'Max MTTR', unit: 'h' },
    minMTBF: { value: 200, label: 'Min MTBF', unit: 'h' },
    tpmTarget: { value: 12, label: 'TPM Visits per Asset', unit: '' },
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
        style="cursor:text;border-bottom:2px dashed #95C11F;padding:0 4px;color:#243547;font-weight:700;font-size:18px;"
        title="Click to edit target"
    >${value}${unit}</span>`;
}

function updateTarget(key, rawVal) {
    const num = parseFloat(rawVal.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
        saveTarget(key, num);
        if (key === 'avail') state.wcTarget = num;
        renderKPIBoard();
    }
}

function kpiRow(row, targets) {
    const t = targets[row.key];
    const tl = trafficLight(row.actual, t.value, row.higher);
    const gap = row.higher
        ? (row.actual - t.value).toFixed(1)
        : (t.value - row.actual).toFixed(1);
    const gapText = +gap >= 0
        ? `<span style="color:#27ae60;font-size:18px;font-weight:700;">+${gap}${row.unit}</span>`
        : `<span style="color:#c0392b;font-size:18px;font-weight:700;">${gap}${row.unit}</span>`;
    return `<tr style="background:${tl.bg};">
        <td style="padding:12px 16px;font-weight:700;color:#243547;width:220px;">${row.label}</td>
        <td style="padding:12px 16px;font-size:20px;font-weight:700;color:${tl.color};width:130px;">${row.display || (fmt1(row.actual) + row.unit)}</td>
        <td style="padding:12px 16px;width:150px;">${editableTarget(row.key, t.value, row.unit)}</td>
        <td style="padding:12px 16px;width:110px;">${gapText}</td>
        <td style="padding:12px 16px;font-size:16px;">${tl.icon} ${tl.label}</td>
    </tr>`;
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

    // ── Production data (context only) ──
    const avgOEE = active.length ? active.reduce((s, d) => s + (+d.oee), 0) / active.length : 0;
    const avgAvail = active.length ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const avgPerf = active.length ? active.reduce((s, d) => s + (+d.perf), 0) / active.length : 0;
    const avgQual = active.length ? active.reduce((s, d) => s + (+d.quality), 0) / active.length : 0;
    const totalUnpl = data.reduce((s, d) => s + (+d.unplanned_h), 0);

    // OEE impact calculation
    // If Availability hits target, what would OEE be?
    const projectedOEE = (targets.avail.value / 100) * (avgPerf / 100) * (avgQual / 100) * 100;

    // ── Maintenance data ──
    const totalDT = maint.reduce((s, m) => s + (+m.downtime_hrs), 0);
    const totalBDs = maint.reduce((s, m) => s + (+m.breakdown_count), 0);
    const totalTPM = maint.reduce((s, m) => s + (+m.tpm_count), 0);
    const totalRunH = state.weeks.reduce((s, w) =>
        s + (state.oeeData[w] || []).reduce((ss, d) => ss + (+d.run_h || 0), 0), 0);

    const fleetMTTR = totalBDs > 0 ? Math.round((totalDT / totalBDs) * 10) / 10 : 0;
    const fleetMTBF = totalBDs > 0 && totalRunH > 0
        ? Math.round((totalRunH / totalBDs) * 10) / 10 : 0;
    const avgTPM = maint.length > 0 ? Math.round((totalTPM / maint.length) * 10) / 10 : 0;

    // Best/worst availability from SFC
    const bestAvail = [...active].sort((a, b) => +b.avail - +a.avail)[0];
    const worstAvail = [...active].sort((a, b) => +a.avail - +b.avail)[0];

    // Worst asset by downtime
    const top5 = [...maint].filter(m => +m.downtime_hrs > 0)
        .sort((a, b) => +b.downtime_hrs - +a.downtime_hrs).slice(0, 5);

    // Availability trend
    const availTrend = state.weeks.map(w => {
        const wd = (state.oeeData[w] || []).filter(d => +d.avail > 0);
        return { week: w, avg: wd.length ? wd.reduce((s, d) => s + (+d.avail), 0) / wd.length : 0 };
    });
    const weeksOnTarget = availTrend.filter(w => w.avg >= targets.avail.value).length;

    const sparkline = availTrend.map(w => {
        const h = Math.max((w.avg / 100) * 50, 2);
        const tl = trafficLight(w.avg, targets.avail.value);
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
            <div style="font-size:9px;color:#888">${fmt1(w.avg)}%</div>
            <div style="height:${h}px;width:100%;background:${tl.color};border-radius:2px 2px 0 0;min-height:2px"></div>
            <div style="font-size:9px;color:#888">${w.week}</div>
        </div>`;
    }).join('');

    // Maintenance KPI rows
    const maintRows = [
        { key: 'avail', label: 'Availability %', actual: avgAvail, unit: '%', higher: true },
        { key: 'maxMTTR', label: 'Fleet MTTR', actual: fleetMTTR, unit: 'h', higher: false },
        { key: 'minMTBF', label: 'Fleet MTBF', actual: fleetMTBF, unit: 'h', higher: true },
        { key: 'maxDowntime', label: 'Annual Downtime', actual: Math.round(totalDT), unit: 'h', higher: false },
        { key: 'maxBDs', label: 'Total Breakdowns', actual: totalBDs, unit: '', higher: false },
        { key: 'tpmTarget', label: 'Avg TPM per Asset', actual: avgTPM, unit: '', higher: true },
    ];

    const tlAvail = trafficLight(avgAvail, targets.avail.value);

    el.innerHTML = `
        <!-- ── HEADER ── -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;align-items:center;gap:16px;">
                <img src="/icons/Clamason-Logo-Side-PNG.png" style="height:65px;">
                <div>
                    <h2 style="color:#243547;font-size:24px;margin:0;">Maintenance KPI Board</h2>
                    <div style="color:#888;font-size:13px;margin-top:4px;">
                        Week: <strong>${wk || '—'}</strong> &nbsp;·&nbsp;
                        Maintenance Period: <strong>${period}</strong> &nbsp;·&nbsp;
                        <span style="color:#95C11F;font-size:12px;">✎ Click any target to edit</span>
                    </div>
                </div>
            </div>
            <button class="btn btn-lime" onclick="exportKPIPDF()" style="font-size:12px;padding:8px 16px;">📄 Export PDF</button>
        </div>

        <!-- ── SECTION 1: BUSINESS CONTEXT (not your number) ── -->
        <div style="background:#f8f9fa;border-radius:10px;padding:16px 20px;margin-bottom:20px;border-left:4px solid #243547;">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:10px;">
                📊 Business Context — Overall OEE (shared KPI)
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
                <div>
                    <div style="font-size:11px;color:#888;margin-bottom:2px;">Overall OEE</div>
                    <div style="font-size:22px;font-weight:700;color:${avgOEE >= targets.avail.value ? '#27ae60' : '#c0392b'}">${fmt1(avgOEE)}%</div>
                    <div style="font-size:11px;color:#888;">target ${targets.avail.value}%</div>
                </div>
                <div>
                    <div style="font-size:11px;color:#888;margin-bottom:2px;">Performance %</div>
                    <div style="font-size:22px;font-weight:700;color:#243547;">${fmt1(avgPerf)}%</div>
                    <div style="font-size:11px;color:#888;">production dept</div>
                </div>
                <div>
                    <div style="font-size:11px;color:#888;margin-bottom:2px;">Quality %</div>
                    <div style="font-size:22px;font-weight:700;color:#243547;">${fmt1(avgQual)}%</div>
                    <div style="font-size:11px;color:#888;">quality dept</div>
                </div>
                <div>
                    <div style="font-size:11px;color:#888;margin-bottom:2px;">Unplanned Down</div>
                    <div style="font-size:22px;font-weight:700;color:#c0392b;">${fmtH(totalUnpl)}</div>
                    <div style="font-size:11px;color:#888;">this week</div>
                </div>
            </div>
        </div>

        <!-- ── SECTION 2: YOUR HERO NUMBER ── -->
        <div style="background:${tlAvail.bg};border-radius:12px;padding:24px;margin-bottom:20px;border:2px solid ${tlAvail.color};">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:12px;">
                🎯 Your Number — Maintenance Availability
            </div>
            <div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap;">
                <div>
                    <div style="font-size:48px;font-weight:700;color:${tlAvail.color};line-height:1;">${fmt1(avgAvail)}%</div>
                    <div style="font-size:14px;color:#888;margin-top:4px;">Current Availability · Week ${wk || '—'}</div>
                </div>
                <div style="width:1px;height:70px;background:#ddd;"></div>
                <div>
                    <div style="font-size:14px;color:#888;margin-bottom:4px;">Target</div>
                    <div style="font-size:32px;font-weight:700;color:#243547;">${editableTarget('avail', targets.avail.value, '%')}</div>
                </div>
                <div style="width:1px;height:70px;background:#ddd;"></div>
                <div>
                    <div style="font-size:14px;color:#888;margin-bottom:4px;">Gap</div>
                    <div style="font-size:32px;font-weight:700;color:${tlAvail.color};">
                        ${avgAvail >= targets.avail.value ? '+' : ''}${fmt1(avgAvail - targets.avail.value)}%
                    </div>
                </div>
                <div style="width:1px;height:70px;background:#ddd;"></div>
                <div style="background:#fff;border-radius:10px;padding:18px 22px;max-width:340px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <div style="font-size:14px;font-weight:700;color:#243547;margin-bottom:10px;">💡 OEE Impact</div>
                    <div style="font-size:16px;color:#555;line-height:1.6;">
                        If Availability reaches <strong style="font-size:18px;">${targets.avail.value}%</strong> target,<br>
                        OEE would improve from <strong style="font-size:18px;color:#c0392b">${fmt1(avgOEE)}%</strong> 
                        to approximately <strong style="font-size:20px;color:#27ae60">${fmt1(projectedOEE)}%</strong>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── SECTION 3: AVAILABILITY TREND ── -->
        <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
                <span class="card-title">📈 Availability Trend</span>
                <span class="card-sub">${weeksOnTarget} of ${availTrend.length} weeks at/above ${targets.avail.value}% target</span>
            </div>
            <div style="display:flex;gap:6px;align-items:flex-end;height:80px;padding:0 4px;">
                ${sparkline}
            </div>
            <div style="margin-top:8px;display:flex;gap:16px;font-size:11px;color:#888;">
                <span>🟢 On target</span>
                <span>🟡 Near target (&lt;5% gap)</span>
                <span>🔴 Below target</span>
            </div>
        </div>

        <!-- ── SECTION 4: MAINTENANCE KPI TABLE ── -->
        <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden;">
            <div class="card-header" style="padding:14px 16px;">
                <span class="card-title">🔧 Maintenance KPIs</span>
                <span class="card-sub">${period} · from Agility + SFC</span>
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
                    ${maintRows.map(r => kpiRow(r, targets)).join('')}
                </tbody>
            </table>
        </div>

        <!-- ── SECTION 5: BEST / WORST AVAILABILITY ── -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="background:#f0faf4;border-radius:10px;padding:14px 18px;border-left:4px solid #27ae60;">
                <div style="font-size:11px;font-weight:700;color:#155724;text-transform:uppercase;margin-bottom:6px;">🏆 Best Availability This Week</div>
                <div style="font-size:18px;font-weight:700;color:#155724;">${bestAvail?.machine || '—'}</div>
                <div style="font-size:13px;color:#155724;">${fmt1(bestAvail?.avail || 0)}% availability</div>
            </div>
            <div style="background:#fff5f5;border-radius:10px;padding:14px 18px;border-left:4px solid #c0392b;">
                <div style="font-size:11px;font-weight:700;color:#721c24;text-transform:uppercase;margin-bottom:6px;">⚠️ Lowest Availability</div>
                <div style="font-size:18px;font-weight:700;color:#721c24;">${worstAvail?.machine || '—'}</div>
                <div style="font-size:13px;color:#721c24;">${fmt1(worstAvail?.avail || 0)}% availability</div>
            </div>
        </div>

        <!-- ── SECTION 6: TOP 5 WORST ASSETS ── -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">🔴 Top 5 Assets by Annual Downtime</span>
                <span class="card-sub">focus maintenance effort here</span>
            </div>
            ${top5.map((m, i) => {
        const assetMTTR = +m.breakdown_count > 0
            ? Math.round((+m.downtime_hrs / +m.breakdown_count) * 10) / 10 : 0;
        const mttrCol = assetMTTR <= 4 ? '#27ae60' : assetMTTR <= 8 ? '#e67e22' : '#c0392b';
        return `
                <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <div style="width:28px;height:28px;border-radius:50%;background:${i === 0 ? '#c0392b' : i === 1 ? '#e67e22' : i === 2 ? '#e6b800' : '#888'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${i + 1}</div>
                    <div style="flex:1;font-size:14px;font-weight:700;color:#243547;">${m.name}</div>
                    <div style="text-align:center;min-width:80px;">
                        <div style="font-size:14px;color:#c0392b;font-weight:700;">${Math.round(+m.downtime_hrs)}h</div>
                        <div style="font-size:10px;color:#888;">downtime</div>
                    </div>
                    <div style="text-align:center;min-width:70px;">
                        <div style="font-size:14px;font-weight:700;color:#243547;">${m.breakdown_count}</div>
                        <div style="font-size:10px;color:#888;">breakdowns</div>
                    </div>
                    <div style="text-align:center;min-width:80px;">
                        <div style="font-size:14px;font-weight:700;color:${mttrCol};">${assetMTTR}h</div>
                        <div style="font-size:10px;color:#888;">MTTR</div>
                    </div>
                    <div style="text-align:center;min-width:70px;">
                        <div style="font-size:14px;font-weight:700;color:#243547;">${m.tpm_count}</div>
                        <div style="font-size:10px;color:#888;">TPM visits</div>
                    </div>
                </div>`;
    }).join('')}
        </div>`;
}
