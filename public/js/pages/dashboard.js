// dashboard.js - Maintenance Reliability Dashboard

if (!state.wcTarget) state.wcTarget = 65;

function renderDashboard() {
    // Read saved targets from localStorage (same source as KPI Board)
    const _saved = (() => { try { return JSON.parse(localStorage.getItem('clamason_kpi_targets') || '{}'); } catch { return {}; } })();
    const mttrTarget = _saved.maxMTTR?.value || 8;
    const mtbfTarget = _saved.minMTBF?.value || 6;

    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);

    // ── MAINTENANCE KPIs (from Agility) ──
    const maint = state.maintData || [];
    const totalDT = maint.reduce((s, m) => s + (+m.downtime_hrs), 0);
    const totalCost = maint.reduce((s, m) => s + (+m.cost_labour), 0);
    const totalBDs = maint.reduce((s, m) => s + (+m.breakdown_count), 0);
    const hasTpmData = maint.some(m => m.tpm_count !== undefined && m.tpm_count !== null && m.tpm_count !== '');
    const totalTPMs = hasTpmData ? maint.reduce((s, m) => s + (+m.tpm_count), 0) : null;
    const totalRunH = state.weeks.reduce((s, w) =>
        s + (state.oeeData[w] || []).reduce((ss, d) => ss + (+d.run_h || 0), 0), 0);
    const equipMTTR = totalBDs > 0 ? Math.round((totalDT / totalBDs) * 10) / 10 : 0;
    const equipMTBF = totalBDs > 0 && totalRunH > 0
        ? Math.round((totalRunH / totalBDs) * 10) / 10 : 0;
    const mttrCol = equipMTTR <= mttrTarget ? '#27ae60' : equipMTTR <= mttrTarget * 1.5 ? '#e67e22' : '#c0392b';
    const mtbfCol = equipMTBF >= mtbfTarget ? '#27ae60' : equipMTBF >= mtbfTarget * 0.5 ? '#e67e22' : '#c0392b';

    // TPM vs Reactive ratio
    const totalJobs = (totalTPMs ?? 0) + totalBDs;
    const tpmPct = hasTpmData && totalJobs > 0 ? Math.round((totalTPMs / totalJobs) * 100) : null;
    const tpmRatioCol = tpmPct === null ? '#888' : tpmPct >= 50 ? '#27ae60' : tpmPct >= 35 ? '#e67e22' : '#c0392b';

    // ── AVAILABILITY & UNPLANNED (from SFC) ──
    const avgAvail = active.length
        ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const availCol = avgAvail >= state.wcTarget ? '#27ae60'
        : avgAvail >= state.wcTarget * 0.95 ? '#e67e22' : '#c0392b';
    const totalUnpl = data.reduce((s, d) => s + (+d.unplanned_h), 0);
    const unplCol = totalUnpl > 200 ? '#c0392b' : totalUnpl > 100 ? '#e67e22' : '#27ae60';

    // ── PRODUCTION CONTEXT (from SFC) ──
    const avgOEE = active.length
        ? active.reduce((s, d) => s + (+d.oee), 0) / active.length : 0;
    const totalParts = data.reduce((s, d) => s + (+d.total_parts), 0);
    const period = maint[0]?.period_label || 'Annual';

    // ── HTML: Reliability-first layout ──
    document.getElementById('kpiGrid').innerHTML = `
        <!-- BAND TITLE -->
        <div style="grid-column:1/-1;font-size:13px;font-weight:700;color:#243547;
            text-transform:uppercase;letter-spacing:.8px;margin-bottom:-2px;
            border-bottom:2px solid #95C11F;padding-bottom:6px;">
            ⚙️ Equipment Reliability — Maintenance KPIs
        </div>

        <!-- ROW 1: Headline reliability numbers -->
        <div class="kpi-card" style="border-left-color:${availCol};cursor:pointer"
            onclick="showPage('oee')">
            <div class="kpi-label">🔧 Availability</div>
            <div class="kpi-value" style="color:${availCol}">${fmt1(avgAvail)}%</div>
            <div class="kpi-sub">target ${state.wcTarget}% · ${wk || '—'} · from SFC</div>
        </div>
        <div class="kpi-card" style="border-left-color:${mttrCol};cursor:pointer"
            onclick="showPage('kpi')">
            <div class="kpi-label">⏱️ MTTR</div>
            <div class="kpi-value" style="color:${mttrCol}">${equipMTTR}h</div>
            <div class="kpi-sub">mean time to repair · target &lt;${mttrTarget}h</div>
        </div>
        <div class="kpi-card" style="border-left-color:${mtbfCol};cursor:pointer"
            onclick="showPage('kpi')">
            <div class="kpi-label">⚙️ MTBF</div>
            <div class="kpi-value" style="color:${mtbfCol}">${equipMTBF > 0 ? equipMTBF + 'h' : '—'}</div>
            <div class="kpi-sub">mean time between failures · target &gt;${mtbfTarget}h</div>
        </div>
        <div class="kpi-card" style="border-left-color:${unplCol};cursor:pointer"
            onclick="showPage('oee')">
            <div class="kpi-label">🔴 Unplanned Downtime</div>
            <div class="kpi-value" style="color:${unplCol}">${fmtH(totalUnpl)}</div>
            <div class="kpi-sub">this week · from SFC</div>
        </div>

        <!-- ROW 2: Business impact -->
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('maintenance')">
            <div class="kpi-label">💷 Reactive Labour Cost</div>
            <div class="kpi-value">${fmtK(totalCost)}</div>
            <div class="kpi-sub">annual maintenance labour</div>
        </div>
        <div class="kpi-card" style="border-left-color:#c0392b;cursor:pointer"
            onclick="showPage('maintenance')">
            <div class="kpi-label">📉 Annual Downtime</div>
            <div class="kpi-value" style="color:#c0392b">${Math.round(totalDT).toLocaleString()}h</div>
            <div class="kpi-sub">${period}</div>
        </div>
        <div class="kpi-card" style="border-left-color:${tpmRatioCol};cursor:pointer"
            onclick="showPage('maintenance')">
            <div class="kpi-label">🔄 TPM vs Reactive</div>
            <div class="kpi-value" style="color:${tpmRatioCol}">${tpmPct !== null ? tpmPct + '%' : '—'}</div>
            <div class="kpi-sub">${tpmPct !== null ? `${totalTPMs} TPM / ${totalBDs} reactive · target &gt;50%` : 'no TPM data in upload'}</div>
        </div>
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('maintenance')">
            <div class="kpi-label">🏭 Total Breakdowns</div>
            <div class="kpi-value">${totalBDs}</div>
            <div class="kpi-sub">recorded this period</div>
        </div>

        <!-- ROW 3: Production context (subtle) -->
        <div style="grid-column:1/-1;font-size:11px;font-weight:700;color:#888;
            text-transform:uppercase;letter-spacing:.5px;margin-top:10px;margin-bottom:-4px;">
            📊 Production Context — shared with production team
        </div>
        <div class="kpi-card" style="background:#f8f9fa;cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Overall OEE</div>
            <div class="kpi-value" style="font-size:18px;color:${avgOEE >= state.wcTarget ? '#27ae60' : '#c0392b'}">${fmt1(avgOEE)}%</div>
            <div class="kpi-sub">equip avg · ${wk || '—'} · from SFC</div>
        </div>
        <div class="kpi-card" style="background:#f8f9fa;cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Parts Made</div>
            <div class="kpi-value" style="font-size:18px">${fmtN(totalParts)}</div>
            <div class="kpi-sub">total this week</div>
        </div>
        <div class="kpi-card" style="background:#f8f9fa;cursor:pointer" onclick="showPage('maintenance')">
            <div class="kpi-label">TPM Visits</div>
            <div class="kpi-value" style="font-size:18px;color:${totalTPMs !== null ? '#95C11F' : '#888'}">${totalTPMs !== null ? totalTPMs : '—'}</div>
            <div class="kpi-sub">${totalTPMs !== null ? 'planned this period' : 'no TPM data in upload'}</div>
        </div>`;

    // ── INJECT RELIABILITY TREND CARD (once) ──
    renderReliabilityTrend();

    // ── TOP 5 DOWNTIME CHART ──
    const top5 = [...maint].filter(m => +m.downtime_hrs > 0)
        .sort((a, b) => +b.downtime_hrs - +a.downtime_hrs).slice(0, 5);
    const maxDT = +top5[0]?.downtime_hrs || 1;

    document.getElementById('oeeBarChart').innerHTML = top5.length
        ? top5.map(m => {
            const pct = (+m.downtime_hrs / maxDT) * 100;
            const col = +m.downtime_hrs >= 500 ? '#c0392b'
                : +m.downtime_hrs >= 200 ? '#e67e22' : '#e6b800';
            return `<div class="bar-row">
                <div class="bar-machine-name" title="${m.name}">${m.name}</div>
                <div class="bar-track" style="cursor:pointer"
                    onclick="showPage('detail',${JSON.stringify({...m, type:'maint'}).replace(/"/g,'&quot;')})">
                    <div class="bar-fill" style="width:${pct}%;background:${col};"></div>
                </div>
                <span class="bar-value-out">${Math.round(+m.downtime_hrs)}h</span>
            </div>`;
        }).join('')
        : emptyState('No Agility data — upload an AG3-601 report');

    document.getElementById('latestWeekLabel').textContent = period;

    // ── TPM PIE ──
    renderTPMPie();

    // ── AVAILABILITY TREND SPARKLINES ──
    const allMachines = [...new Set(
        state.weeks.flatMap(w => (state.oeeData[w] || []).map(d => d.machine))
    )].sort();

    if (!allMachines.length) {
        document.getElementById('sparkGrid').innerHTML =
            emptyState('Upload at least 2 weeks to see trends');
    } else {
        document.getElementById('sparkGrid').innerHTML = allMachines.map(m => {
            const vals = state.weeks.map(w => {
                const r = (state.oeeData[w] || []).find(d => d.machine === m);
                return r ? +r.avail : null;
            });
            const bars = state.weeks.map((w, i) => {
                const v = vals[i];
                if (v === null) return `<div class="spark-bar" style="flex:1;background:#eee;"></div>`;
                const col = v >= state.wcTarget ? '#27ae60'
                    : v >= state.wcTarget * 0.9 ? '#e67e22' : '#c0392b';
                return `<div class="spark-bar" style="flex:1;height:${Math.max((v / 100) * 36, 1)}px;background:${col};"></div>`;
            }).join('');
            const latest = vals[vals.length - 1];
            return `<div class="spark-card"
                onclick="showPage('detail',${JSON.stringify({machine: m, type:'trend'}).replace(/"/g,'&quot;')})">
                <div class="spark-name">${m}</div>
                <div class="spark-bars">${bars}</div>
                <div class="spark-latest">Avail: <strong>${latest !== null ? fmt1(latest) + '%' : '—'}</strong></div>
            </div>`;
        }).join('');
    }
}

function renderTPMPie() {
    const el = document.getElementById('tpmPie');
    if (!el) return;

    const maint = state.maintData || [];
    const totalTPM      = maint.reduce((s, m) => s + (+m.tpm_count), 0);
    const totalReactive = maint.reduce((s, m) => s + (+m.breakdown_count), 0);
    const total = totalTPM + totalReactive;

    if (!total) {
        el.innerHTML = emptyState('No Agility data yet');
        return;
    }

    const tpmPct    = Math.round((totalTPM / total) * 100);
    const tpmCol    = '#95C11F';
    const reactCol  = '#c0392b';
    const statusCol = tpmPct >= 50 ? '#27ae60' : tpmPct >= 35 ? '#e67e22' : '#c0392b';
    const statusTxt = tpmPct >= 50 ? '✅ Good — TPM leading'
                    : tpmPct >= 35 ? '⚠️ Improving — push TPM'
                    : '🔴 Reactive dominated';

    const r = 54, cx = 80, cy = 70, stroke = 22;
    const circ    = 2 * Math.PI * r;
    const tpmDash = (totalTPM / total) * circ;

    el.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;padding:4px 0;">
      <svg width="160" height="140" viewBox="0 0 160 140">
        <circle cx="${cx}" cy="${cy}" r="${r}"
          fill="none" stroke="${reactCol}" stroke-width="${stroke}"
          stroke-dasharray="${circ}" stroke-dashoffset="0"
          transform="rotate(-90 ${cx} ${cy})"/>
        <circle cx="${cx}" cy="${cy}" r="${r}"
          fill="none" stroke="${tpmCol}" stroke-width="${stroke}"
          stroke-dasharray="${tpmDash} ${circ}"
          stroke-dashoffset="0"
          transform="rotate(-90 ${cx} ${cy})"/>
        <text x="${cx}" y="${cy - 8}" text-anchor="middle"
          font-size="18" font-weight="700" fill="#243547">${tpmPct}%</text>
        <text x="${cx}" y="${cy + 10}" text-anchor="middle"
          font-size="10" fill="#888">TPM</text>
      </svg>
      <div style="flex:1">
        <div style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="width:12px;height:12px;border-radius:2px;background:${tpmCol};display:inline-block"></span>
            <span style="font-size:13px;font-weight:700;color:#243547;">Planned TPM</span>
            <span style="margin-left:auto;font-size:16px;font-weight:700;color:${tpmCol};">${totalTPM}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:12px;height:12px;border-radius:2px;background:${reactCol};display:inline-block"></span>
            <span style="font-size:13px;font-weight:700;color:#243547;">Reactive Jobs</span>
            <span style="margin-left:auto;font-size:16px;font-weight:700;color:${reactCol};">${totalReactive}</span>
          </div>
        </div>
        <div style="background:#f8f9fa;border-radius:8px;padding:8px 10px;
          border-left:3px solid ${statusCol};font-size:12px;
          font-weight:700;color:${statusCol};">${statusTxt}</div>
        <div style="font-size:10px;color:#aaa;margin-top:6px;">
          Target: TPM &gt; Reactive &nbsp;·&nbsp; ${maint[0]?.period_label || ''}
        </div>
      </div>
    </div>`;
}

function editWCTarget() {
    const val = prompt(`Set Availability target (%)\nCurrent: ${state.wcTarget}%`, state.wcTarget);
    if (val && !isNaN(val) && +val > 0 && +val <= 100) {
        state.wcTarget = +val;
        renderDashboard();
        showToast(`✅ Target set to ${state.wcTarget}%`, 'success');
    }
}

// ── RELIABILITY TREND CARD ──
function renderReliabilityTrend() {
    // Ensure the card exists (inject once)
    let card = document.getElementById('reliabilityTrendCard');
    if (!card) {
        const host = document.getElementById('page-dashboard');
        const kpiGrid = document.getElementById('kpiGrid');
        if (!host || !kpiGrid) return;
        card = document.createElement('div');
        card.id = 'reliabilityTrendCard';
        card.className = 'card';
        card.style.marginTop = '16px';
        card.style.marginBottom = '16px';
        // Insert right after kpiGrid
        kpiGrid.parentNode.insertBefore(card, kpiGrid.nextSibling);
    }

    const weeks = state.weeks || [];
    if (weeks.length < 2) {
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">📈 Reliability Trend</span>
            </div>
            <div style="padding:20px;color:#aaa;font-size:13px;text-align:center">
                Upload at least 2 weeks of SFC data to see reliability trends
            </div>`;
        return;
    }

    // Per-week aggregations from SFC data
    const availByWk = weeks.map(w => {
        const rows = (state.oeeData[w] || []).filter(d => +d.oee > 0);
        if (!rows.length) return null;
        return rows.reduce((s, d) => s + (+d.avail), 0) / rows.length;
    });
    const unplByWk = weeks.map(w => {
        const rows = state.oeeData[w] || [];
        return rows.reduce((s, d) => s + (+d.unplanned_h), 0);
    });

    // MTTR / MTBF can't be broken down per-week without per-week Agility data, so
    // we show them as current period figures with sparkline of availability derived proxies.
    // Instead, build sparklines from availability-only trend (proxy for reliability direction)
    // and unplanned downtime trend.

    // Latest vs previous week deltas
    const latestAvail = availByWk[availByWk.length - 1];
    const prevAvail = availByWk.length > 1 ? availByWk[availByWk.length - 2] : null;
    const deltaAvail = (latestAvail != null && prevAvail != null) ? (latestAvail - prevAvail) : null;

    const latestUnpl = unplByWk[unplByWk.length - 1];
    const prevUnpl = unplByWk.length > 1 ? unplByWk[unplByWk.length - 2] : null;
    const deltaUnpl = (latestUnpl != null && prevUnpl != null) ? (latestUnpl - prevUnpl) : null;

    // Arrow helper
    function arrow(delta, goodDirection /* 'up' or 'down' */) {
        if (delta === null || Math.abs(delta) < 0.1) return `<span style="color:#888">→</span>`;
        const isUp = delta > 0;
        const isGood = (goodDirection === 'up' && isUp) || (goodDirection === 'down' && !isUp);
        const col = isGood ? '#27ae60' : '#c0392b';
        const sym = isUp ? '↗' : '↘';
        return `<span style="color:${col};font-weight:700">${sym} ${Math.abs(delta).toFixed(1)}</span>`;
    }

    // Big availability chart (SVG line + bars)
    const target = state.wcTarget || 65;
    const chartW = 900, chartH = 220, padL = 50, padR = 20, padT = 20, padB = 40;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;
    const maxVal = 100;
    const xStep = weeks.length > 1 ? plotW / (weeks.length - 1) : plotW;

    const pts = availByWk.map((v, i) => {
        if (v == null) return null;
        const x = padL + i * xStep;
        const y = padT + plotH - (v / maxVal) * plotH;
        return { x, y, v };
    });

    // Build polyline path (skip nulls gracefully)
    const lineSegments = [];
    let current = [];
    pts.forEach(p => {
        if (p) current.push(`${p.x},${p.y}`);
        else { if (current.length > 1) lineSegments.push(current.join(' ')); current = []; }
    });
    if (current.length > 1) lineSegments.push(current.join(' '));

    // Y grid lines
    const yLines = [0, 25, 50, 75, 100].map(v => {
        const y = padT + plotH - (v / maxVal) * plotH;
        return `
            <line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="#eee" stroke-width="1"/>
            <text x="${padL - 8}" y="${y + 4}" font-size="10" fill="#888" text-anchor="end">${v}%</text>`;
    }).join('');

    // Target line
    const targetY = padT + plotH - (target / maxVal) * plotH;
    const targetLine = `
        <line x1="${padL}" y1="${targetY}" x2="${padL + plotW}" y2="${targetY}"
            stroke="#95C11F" stroke-width="2" stroke-dasharray="6,4"/>
        <text x="${padL + plotW - 4}" y="${targetY - 6}" font-size="10" fill="#6a8c15"
            font-weight="700" text-anchor="end">Target ${target}%</text>`;

    // X labels (week names)
    const xLabels = weeks.map((w, i) => {
        const x = padL + i * xStep;
        return `<text x="${x}" y="${chartH - 8}" font-size="11" fill="#555"
                    text-anchor="middle" font-weight="600">${w}</text>`;
    }).join('');

    // Line + dots
    const linePath = lineSegments.map(seg =>
        `<polyline points="${seg}" fill="none" stroke="#243547" stroke-width="2.5" stroke-linejoin="round"/>`
    ).join('');
    const dots = pts.filter(Boolean).map(p => {
        const col = p.v >= target ? '#27ae60' : p.v >= target * 0.9 ? '#e67e22' : '#c0392b';
        return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${col}" stroke="#fff" stroke-width="2"/>
                <text x="${p.x}" y="${p.y - 10}" font-size="10" font-weight="700" fill="${col}"
                    text-anchor="middle">${p.v.toFixed(1)}%</text>`;
    }).join('');

    const svg = `
        <svg viewBox="0 0 ${chartW} ${chartH}" width="100%" preserveAspectRatio="xMidYMid meet">
            ${yLines}
            ${targetLine}
            ${linePath}
            ${dots}
            ${xLabels}
        </svg>`;

    // Mini sparkline helper
    function miniSpark(vals, col, formatter = v => v.toFixed(1)) {
        const w = 140, h = 40, pad = 4;
        const clean = vals.filter(v => v != null);
        if (clean.length < 2) return `<div style="font-size:11px;color:#888">n/a</div>`;
        const min = Math.min(...clean);
        const max = Math.max(...clean);
        const range = (max - min) || 1;
        const step = (w - pad * 2) / (vals.length - 1);
        const pts = vals.map((v, i) => {
            if (v == null) return null;
            const x = pad + i * step;
            const y = pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2);
            return `${x},${y}`;
        }).filter(Boolean).join(' ');
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
            <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2"/>
        </svg>`;
    }

    // Summary tiles (3 small cards beneath chart)
    const availCol = latestAvail != null && latestAvail >= target ? '#27ae60'
                   : latestAvail != null && latestAvail >= target * 0.9 ? '#e67e22' : '#c0392b';

    card.innerHTML = `
        <div class="card-header">
            <span class="card-title">📈 Reliability Trend — Availability Over Time</span>
            <span class="card-sub">${weeks.length} weeks of SFC data · target ${target}%</span>
        </div>

        <div style="padding:8px 4px">${svg}</div>

        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;padding:12px 4px 4px">
            <div style="border:1px solid #eee;border-radius:10px;padding:10px 14px;background:#fafbfc">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px">Availability</div>
                <div style="font-size:22px;font-weight:800;color:${availCol};margin:2px 0">
                    ${latestAvail != null ? latestAvail.toFixed(1) + '%' : '—'}
                    <span style="font-size:12px;margin-left:6px">${arrow(deltaAvail, 'up')}</span>
                </div>
                ${miniSpark(availByWk, '#243547')}
                <div style="font-size:10px;color:#888;margin-top:2px">Latest week vs prior</div>
            </div>
            <div style="border:1px solid #eee;border-radius:10px;padding:10px 14px;background:#fafbfc">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px">Unplanned Downtime</div>
                <div style="font-size:22px;font-weight:800;color:#c0392b;margin:2px 0">
                    ${latestUnpl != null ? fmtH(latestUnpl) : '—'}
                    <span style="font-size:12px;margin-left:6px">${arrow(deltaUnpl, 'down')}</span>
                </div>
                ${miniSpark(unplByWk, '#c0392b')}
                <div style="font-size:10px;color:#888;margin-top:2px">Lower is better</div>
            </div>
            <div style="border:1px solid #eee;border-radius:10px;padding:10px 14px;background:#fafbfc">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px">Weeks of data</div>
                <div style="font-size:22px;font-weight:800;color:#243547;margin:2px 0">${weeks.length}</div>
                <div style="font-size:11px;color:#666;margin-top:6px">
                    ${weeks[0]} → ${weeks[weeks.length-1]}
                </div>
                <div style="font-size:10px;color:#888;margin-top:6px">Build trend over more weeks</div>
            </div>
        </div>`;
}
