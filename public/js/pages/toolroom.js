// toolroom.js — Toolroom page renderer

function renderToolroomOEE() {
    const el = document.getElementById('toolroom-oee');
    if (!el) return;
    el.innerHTML = `
        <div style="padding:24px;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
                ${[
            ['On Time %', formatDDStat(state.dueDateStats?.currentMonth), getDDCol(state.dueDateStats?.currentMonth)],
            ['LTM Average', formatDDStat(state.dueDateStats?.ltmAvg), getDDCol(state.dueDateStats?.ltmAvg)],
            ['Target', '>90%', '#243547'],
        ].map(([l, v, c]) => `
                    <div class="card" style="text-align:center;padding:20px;border-top:4px solid #7b5ea7;">
                        <div style="font-size:32px;font-weight:700;color:${c};">${v}</div>
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-top:6px;">${l}</div>
                    </div>`).join('')}
            </div>
            <div class="card" style="padding:16px 20px;">
                <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:16px;">
                    📅 TPM Completed to Plan — Monthly Trend
                </div>
                <div id="toolroom-oee-chart"></div>
            </div>
            <div class="card" style="padding:16px 20px;margin-top:16px;border-left:4px solid #7b5ea7;">
                <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">ℹ️ About this data</div>
                <div style="font-size:13px;color:#555;line-height:1.6;">
                    OEE & TEEP for Toolroom machines requires dedicated machine data from ShopFloorConnect.
                    Once toolroom assets are configured in SFC, this page will display full OEE, TEEP and loading metrics.
                    The data above reflects <strong>Planned Service & Maintenance</strong> job completion performance from Agility AG3-205.
                </div>
            </div>
        </div>`;
    renderToolroomTrendChart();
}

function renderToolroomJobs() {
    const el = document.getElementById('toolroom-jobs');
    if (!el) return;

    const dd = state.dueDateStats;
    if (!dd || !dd.months || !dd.months.length) {
        el.innerHTML = `<div style="text-align:center;padding:60px 20px;">
            <div style="font-size:48px;margin-bottom:12px;">🔧</div>
            <div style="font-size:15px;font-weight:700;color:#7b5ea7;margin-bottom:8px;">No Due Date Data</div>
            <div style="font-size:13px;color:#888;">Upload an AG3-205 report on the Upload page to see job performance.</div>
        </div>`;
        return;
    }

    const months = dd.months;
    const W = 600, H = 180;
    const padL = 40, padR = 16, padT = 20, padB = 40;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const n = months.length;
    const barW = Math.min(40, (chartW / n) - 8);

    function xOf(i) { return padL + i * (chartW / n) + (chartW / n) / 2; }
    function yOf(v) { return padT + chartH - (Math.min(v, 100) / 100) * chartH; }

    // Grid lines
    let grid = '';
    [0, 25, 50, 75, 90, 100].forEach(v => {
        const y = yOf(v);
        const isT = v === 90;
        grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"
            stroke="${isT ? '#c0392b' : '#f0f0f0'}" stroke-width="${isT ? 1.5 : 1}"
            stroke-dasharray="${isT ? '5,3' : ''}"/>
            <text x="${padL - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="9"
                fill="${isT ? '#c0392b' : '#bbb'}" font-weight="${isT ? 700 : 400}">${v}%</text>`;
    });

    // Bars
    const bars = months.map((m, i) => {
        const x = xOf(i);
        const y = yOf(m.pct);
        const barH = Math.max(chartH - (y - padT), 2);
        const col = m.pct >= 90 ? '#27ae60' : m.pct >= 70 ? '#e67e22' : '#c0392b';
        return `<rect x="${(x - barW / 2).toFixed(1)}" y="${y.toFixed(1)}"
            width="${barW}" height="${barH.toFixed(1)}"
            fill="${col}" rx="3" opacity="0.85"/>
            <text x="${x.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle"
                font-size="9" font-weight="700" fill="${col}">${m.pct}%</text>
            <text x="${x.toFixed(1)}" y="${(H - padB + 14).toFixed(1)}"
                text-anchor="end" transform="rotate(-35,${x.toFixed(1)},${(H - padB + 14).toFixed(1)})"
                font-size="9" fill="#999">${m.month}</text>`;
    }).join('');

    // LTM line
    const ltmY = yOf(dd.ltmAvg).toFixed(1);
    const ltmLine = `<line x1="${padL}" y1="${ltmY}" x2="${W - padR}" y2="${ltmY}"
        stroke="#888" stroke-width="1" stroke-dasharray="4,3"/>
        <text x="${W - padR - 2}" y="${+ltmY - 3}" text-anchor="end" font-size="8" fill="#888">LTM ${dd.ltmAvg}%</text>`;

    el.innerHTML = `
        <div style="padding:24px;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
                ${months.slice(-3).reverse().map(m => {
        const col = m.pct >= 90 ? '#27ae60' : m.pct >= 70 ? '#e67e22' : '#c0392b';
        return `<div class="card" style="text-align:center;padding:16px;border-top:4px solid ${col};">
                        <div style="font-size:28px;font-weight:700;color:${col};">${m.pct}%</div>
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">${m.month}</div>
                        <div style="font-size:10px;color:#aaa;margin-top:2px;">On Time</div>
                    </div>`;
    }).join('')}
            </div>
            <div class="card" style="padding:16px 20px;">
                <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">
                    📊 Monthly On-Time Completion %
                </div>
                <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
                    ${grid}${ltmLine}${bars}
                </svg>
            </div>
        </div>`;
}

function renderToolroomKPI() {
    const el = document.getElementById('toolroom-kpi');
    if (!el) return;

    const dd = state.dueDateStats || {};
    const current = dd.currentMonth ?? null;
    const ltm = dd.ltmAvg ?? null;
    const target = 90;

    const rows = [
        { label: 'TPM Completed to Plan (Current Month)', actual: current, target, unit: '%', higher: true },
        { label: 'TPM Completed to Plan (LTM Average)', actual: ltm, target, unit: '%', higher: true },
    ];

    el.innerHTML = `
        <div style="padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <div>
                    <h2 style="color:#243547;font-size:20px;margin:0;">⚙️ Toolroom KPI Board</h2>
                    <div style="color:#888;font-size:12px;margin-top:4px;">Based on AG3-205 Due Date Performance data</div>
                </div>
            </div>
            <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#243547;color:#fff;">
                            <th style="padding:12px 16px;text-align:left;font-size:12px;">KPI</th>
                            <th style="padding:12px 16px;text-align:center;font-size:12px;">Actual</th>
                            <th style="padding:12px 16px;text-align:center;font-size:12px;">Target</th>
                            <th style="padding:12px 16px;text-align:center;font-size:12px;">Gap</th>
                            <th style="padding:12px 16px;text-align:center;font-size:12px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => {
        const val = r.actual;
        const col = val === null ? '#bbb' : val >= r.target ? '#27ae60' : val >= r.target * 0.8 ? '#e67e22' : '#c0392b';
        const gap = val !== null ? (val - r.target).toFixed(1) : '—';
        const gapCol = val === null ? '#bbb' : val >= r.target ? '#27ae60' : '#c0392b';
        const icon = val === null ? '—' : val >= r.target ? '✅ On Target' : val >= r.target * 0.8 ? '⚠️ Below Target' : '❌ Off Target';
        return `<tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:14px 16px;font-size:13px;color:#243547;font-weight:600;">${r.label}</td>
                                <td style="padding:14px 16px;text-align:center;">
                                    <span style="font-size:18px;font-weight:700;color:${col};">
                                        ${val !== null ? fmt1(val) + r.unit : '—'}
                                    </span>
                                </td>
                                <td style="padding:14px 16px;text-align:center;font-size:13px;color:#555;">${r.target}${r.unit}</td>
                                <td style="padding:14px 16px;text-align:center;font-size:13px;font-weight:700;color:${gapCol};">
                                    ${val !== null ? (val >= r.target ? '+' : '') + gap + r.unit : '—'}
                                </td>
                                <td style="padding:14px 16px;text-align:center;font-size:12px;">${icon}</td>
                            </tr>`;
    }).join('')}
                    </tbody>
                </table>
            </div>

        </div>`;
}

function renderToolroomTrendChart() {
    const el = document.getElementById('toolroom-oee-chart');
    if (!el) return;
    const dd = state.dueDateStats;
    if (!dd || !dd.months || dd.months.length < 2) {
        el.innerHTML = `<div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">
            Upload more AG3-205 data to see trend</div>`;
        return;
    }
    const months = dd.months;
    const W = 580, H = 130;
    const padL = 36, padR = 10, padT = 14, padB = 36;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const n = months.length;

    function xOf(i) { return padL + i * (chartW / Math.max(n - 1, 1)); }
    function yOf(v) { return padT + chartH - (Math.min(v, 100) / 100) * chartH; }

    let grid = '';
    [0, 25, 50, 75, 90, 100].forEach(v => {
        const y = yOf(v), isT = v === 90;
        grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}"
            stroke="${isT ? '#c0392b' : '#f0f0f0'}" stroke-width="${isT ? 1.5 : 1}"
            stroke-dasharray="${isT ? '5,3' : ''}"/>
            <text x="${padL - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="9"
                fill="${isT ? '#c0392b' : '#bbb'}" font-weight="${isT ? 700 : 400}">${v}%</text>`;
    });

    const ltmY = yOf(dd.ltmAvg).toFixed(1);
    grid += `<line x1="${padL}" y1="${ltmY}" x2="${W - padR}" y2="${ltmY}"
        stroke="#888" stroke-width="1" stroke-dasharray="4,3"/>
        <text x="${W - padR - 2}" y="${+ltmY - 3}" text-anchor="end" font-size="8" fill="#888">LTM ${dd.ltmAvg}%</text>`;

    const pts = months.map((m, i) => ({ x: xOf(i), y: yOf(m.pct), pct: m.pct, label: m.month }));
    const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const line = `<polyline points="${polyline}" fill="none" stroke="#7b5ea7" stroke-width="2" stroke-linejoin="round"/>`;
    const dots = pts.map(p => {
        const col = p.pct >= 90 ? '#27ae60' : p.pct >= 70 ? '#7b5ea7' : '#c0392b';
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${col}" stroke="#fff" stroke-width="1.5"/>`;
    }).join('');
    const xLabels = pts.map(p =>
        `<text x="${p.x.toFixed(1)}" y="${H - padB + 14}" text-anchor="end"
            transform="rotate(-35,${p.x.toFixed(1)},${H - padB + 14})"
            font-size="9" fill="#999">${p.label}</text>`
    ).join('');

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
        ${grid}${line}${dots}${xLabels}
    </svg>`;
}

function getDDCol(val) {
    if (val === null || val === undefined) return '#bbb';
    return val >= 90 ? '#27ae60' : val >= 70 ? '#e67e22' : '#c0392b';
}

function formatDDStat(val) {
    if (val === null || val === undefined) return '—';
    return fmt1(val) + '%';
}