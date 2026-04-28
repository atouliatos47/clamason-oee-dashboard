// dashboard.js - Maintenance-first dashboard

if (!state.wcTarget) state.wcTarget = 65;

function renderDashboard() {
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);

    // Maintenance KPIs
    const maint = state.maintData || [];
    const totalDT = maint.reduce((s, m) => s + (+m.downtime_hrs), 0);
    const totalCost = maint.reduce((s, m) => s + (+m.cost_labour), 0);
    const totalBDs = maint.reduce((s, m) => s + (+m.breakdown_count), 0);
    const totalRunH = state.weeks.reduce((s, w) =>
        s + (state.oeeData[w] || []).reduce((ss, d) => ss + (+d.run_h || 0), 0), 0);
    const equipMTTR = totalBDs > 0 ? Math.round((totalDT / totalBDs) * 10) / 10 : 0;
    const equipMTBF = totalBDs > 0 && totalRunH > 0
        ? Math.round((totalRunH / totalBDs) * 10) / 10 : 0;
    const mttrCol = equipMTTR <= mttrTarget ? '#27ae60' : equipMTTR <= mttrTarget * 1.5 ? '#e67e22' : '#c0392b';
    const mtbfCol = equipMTBF >= mtbfTarget ? '#27ae60' : equipMTBF >= mtbfTarget * 0.5 ? '#e67e22' : '#c0392b';
    const equipMTTF = equipMTBF > 0 ? Math.round((equipMTBF - equipMTTR) * 10) / 10 : 0;
    const mttfCol = equipMTTF <= 0 ? '#c0392b' : equipMTTF >= mtbfTarget ? '#27ae60' : '#e67e22';

    // Availability from SFC
    const avgAvail = active.length
        ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const availCol = avgAvail >= state.wcTarget ? '#27ae60'
        : avgAvail >= state.wcTarget * 0.95 ? '#e67e22' : '#c0392b';

    // Production context
    const avgOEE = active.length
        ? active.reduce((s, d) => s + (+d.oee), 0) / active.length : 0;
    const totalUnpl = data.reduce((s, d) => s + (+d.unplanned_h), 0);
    const totalParts = data.reduce((s, d) => s + (+d.total_parts), 0);
    const period = maint[0]?.period_label || 'Annual';

    // Schedule Adherence from SFC (current week)
    const totalRunH_wk  = data.reduce((s, d) => s + (+d.run_h || 0), 0);
    const totalNetAvail  = data.reduce((s, d) => s + (+d.net_avail_h || 0), 0);
    const schedAdherence = totalNetAvail > 0 ? Math.round((totalRunH_wk / totalNetAvail) * 1000) / 10 : 0;
    const schedCol = schedAdherence >= 85 ? '#27ae60' : schedAdherence >= 70 ? '#e67e22' : '#c0392b';

    // ── YOUR NUMBERS (Maintenance) ──
    document.getElementById('kpiGrid').innerHTML = `
        <div style="grid-column:1/-1;font-size:11px;font-weight:700;color:#888;
            text-transform:uppercase;letter-spacing:.5px;margin-bottom:-4px;">
            🔧 Your Numbers — Maintenance
        </div>

        <div class="kpi-card" style="border-left-color:${availCol};cursor:pointer"
            onclick="showPage('kpi')">
            <div class="kpi-label">Equipment Availability</div>
            <div class="kpi-value" style="color:${availCol}">${fmt1(avgAvail)}%</div>
            <div class="kpi-sub">target ${state.wcTarget}% · ${wk || '—'}</div>
        </div>
        <div class="kpi-card" style="border-left-color:#c0392b;cursor:pointer"
            onclick="showPage('maintenance')">
            <div class="kpi-label">Annual Downtime</div>
            <div class="kpi-value" style="color:#c0392b">${Math.round(totalDT).toLocaleString()}h</div>
            <div class="kpi-sub">${period}</div>
        </div>
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('maintenance')">
            <div class="kpi-label">Total Breakdowns</div>
            <div class="kpi-value">${totalBDs}</div>
            <div class="kpi-sub">recorded this period</div>
        </div>
        <div class="kpi-card" style="border-left-color:${mttrCol};cursor:pointer"
            onclick="showPage('kpi')">
            <div class="kpi-label">Equipment MTTR</div>
            <div class="kpi-value" style="color:${mttrCol}">${equipMTTR}h</div>
            <div class="kpi-sub">target &lt;4h · mean time to repair</div>
        </div>
        <div class="kpi-card" style="border-left-color:${mtbfCol};cursor:pointer"
            onclick="showPage('kpi')">
            <div class="kpi-label">Equipment MTBF</div>
            <div class="kpi-value" style="color:${mtbfCol}">${equipMTBF > 0 ? equipMTBF + 'h' : '—'}</div>
            <div class="kpi-sub">target &gt;200h · mean time between failures</div>
        </div>
        <div class="kpi-card" style="border-left-color:${mttfCol};cursor:pointer" onclick="showPage('kpi')">
            <div class="kpi-label">Equipment MTTF</div>
            <div class="kpi-value" style="color:${mttfCol}">${equipMTTF > 0 ? equipMTTF + 'h' : '⚠ ' + equipMTTF + 'h'}</div>
            <div class="kpi-sub">mean time to failure · MTBF − MTTR</div>
        </div>
        <div class="kpi-card" style="cursor:pointer" onclick="showPage('maintenance')">
            <div class="kpi-label">Labour Cost</div>
            <div class="kpi-value">${fmtK(totalCost)}</div>
            <div class="kpi-sub">annual maintenance labour</div>
        </div>

        <div style="grid-column:1/-1;font-size:11px;font-weight:700;color:#888;
            text-transform:uppercase;letter-spacing:.5px;margin-bottom:-4px;margin-top:8px;">
            📊 Production Context — shared KPI
        </div>

        <div class="kpi-card" style="background:#f8f9fa;cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Overall OEE</div>
            <div class="kpi-value" style="font-size:18px;color:${avgOEE >= state.wcTarget ? '#27ae60' : '#c0392b'}">${fmt1(avgOEE)}%</div>
            <div class="kpi-sub">equip avg · ${wk || '—'}</div>
        </div>
        <div class="kpi-card" style="background:#f8f9fa;cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Unplanned Downtime</div>
            <div class="kpi-value" style="font-size:18px;color:#c0392b">${fmtH(totalUnpl)}</div>
            <div class="kpi-sub">all presses this week</div>
        </div>
        <div class="kpi-card" style="background:#f8f9fa;cursor:pointer" onclick="showPage('oee')">
            <div class="kpi-label">Parts Made</div>
            <div class="kpi-value" style="font-size:18px">${fmtN(totalParts)}</div>
            <div class="kpi-sub">total this week</div>
        </div>
        <div class="kpi-card" style="background:#f8f9fa;border-left-color:${schedCol};cursor:pointer" onclick="showPage('kpi')">
            <div class="kpi-label">Schedule Adherence</div>
            <div class="kpi-value" style="font-size:18px;color:${schedCol}">${schedAdherence}%</div>
            <div class="kpi-sub">run h ÷ net avail h · ${wk || '—'}</div>
        </div>`;

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

    // ── SCHEDULE ADHERENCE CHART ──
    renderScheduleChart();

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

function renderScheduleChart() {
    const el = document.getElementById('scheduleChart');
    if (!el) return;

    // Build per-week run vs unplanned hours across all weeks
    const weeks = state.weeks;
    if (!weeks.length) {
        el.innerHTML = emptyState('Upload SFC data to see schedule adherence');
        return;
    }

    const weekData = weeks.map(w => {
        const d = state.oeeData[w] || [];
        const run     = d.reduce((s,x) => s + (+x.run_h||0), 0);
        const unpl    = d.reduce((s,x) => s + (+x.unplanned_h||0), 0);
        const netAvail= d.reduce((s,x) => s + (+x.net_avail_h||0), 0);
        const adh     = netAvail > 0 ? Math.round((run/netAvail)*1000)/10 : 0;
        return { w, run: Math.round(run), unpl: Math.round(unpl), netAvail: Math.round(netAvail), adh };
    });

    const maxH = Math.max(...weekData.map(d => d.netAvail), 1);
    const W = 560, H = 160, padL = 36, padB = 28, padT = 10, padR = 10;
    const chartH = H - padT - padB, chartW = W - padL - padR;
    const bw = Math.min(32, chartW / weeks.length - 4);
    const gap = chartW / weeks.length;

    let bars = '', labels = '', adh_pts = [];
    weekData.forEach((d, i) => {
        const x = padL + i * gap + gap/2;
        const runH  = (d.run  / maxH) * chartH;
        const unplH = (d.unpl / maxH) * chartH;
        const baseY = padT + chartH;
        bars += `<rect x="${(x - bw/2).toFixed(1)}" y="${(baseY - runH).toFixed(1)}" width="${bw}" height="${runH.toFixed(1)}" fill="#95C11F" rx="2"/>`;
        bars += `<rect x="${(x - bw/2).toFixed(1)}" y="${(baseY - runH - unplH).toFixed(1)}" width="${bw}" height="${unplH.toFixed(1)}" fill="#c0392b" rx="2"/>`;
        const lbl = String(d.w).replace('Wk ','W');
        labels += `<text x="${x.toFixed(1)}" y="${H-padB+14}" text-anchor="middle" font-size="9" fill="#999">${lbl}</text>`;
        adh_pts.push({ x, y: padT + chartH - (d.adh/100)*chartH });
    });

    // Adherence line
    let adhLine = '';
    if (adh_pts.length > 1) {
        adhLine = `<polyline points="${adh_pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="#243547" stroke-width="2" stroke-dasharray="4,2"/>`;
        adh_pts.forEach(p => { adhLine += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#243547" stroke="#fff" stroke-width="1.5"/>`; });
    }

    // Y axis labels
    let yLabels = '';
    [0,25,50,75,100].forEach(v => {
        const y = padT + chartH - (v/100)*chartH;
        yLabels += `<text x="${padL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="#bbb">${v}%</text>`;
        yLabels += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="#f0f0f0" stroke-width="1"/>`;
    });

    el.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
        📅 Schedule Adherence — Run Hours vs Unplanned Downtime
        <span style="float:right;display:flex;align-items:center;gap:12px;font-size:11px;font-weight:700;color:#243547">
            <span style="display:flex;align-items:center;gap:4px"><span style="width:16px;height:10px;background:#95C11F;border-radius:2px;display:inline-block"></span>Run h</span>
            <span style="display:flex;align-items:center;gap:4px"><span style="width:16px;height:10px;background:#c0392b;border-radius:2px;display:inline-block"></span>Unplanned</span>
            <span style="display:flex;align-items:center;gap:4px"><span style="width:16px;height:2px;background:#243547;border-radius:2px;display:inline-block;border-top:2px dashed #243547"></span>Adherence %</span>
        </span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
        ${yLabels}
        ${bars}
        ${adhLine}
        ${labels}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
        <line x1="${padL}" y1="${padT+chartH}" x2="${W-padR}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
    </svg>`;
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