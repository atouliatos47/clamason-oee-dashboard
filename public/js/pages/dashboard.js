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
    const fleetMTTR = totalBDs > 0 ? Math.round((totalDT / totalBDs) * 10) / 10 : 0;
    const fleetMTBF = totalBDs > 0 && totalRunH > 0
        ? Math.round((totalRunH / totalBDs) * 10) / 10 : 0;
    const mttrCol = fleetMTTR <= 4 ? '#27ae60' : fleetMTTR <= 8 ? '#e67e22' : '#c0392b';
    const mtbfCol = fleetMTBF >= 200 ? '#27ae60' : fleetMTBF >= 100 ? '#e67e22' : '#c0392b';

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

    // ── YOUR NUMBERS (Maintenance) ──
    document.getElementById('kpiGrid').innerHTML = `
        <div style="grid-column:1/-1;font-size:11px;font-weight:700;color:#888;
            text-transform:uppercase;letter-spacing:.5px;margin-bottom:-4px;">
            🔧 Your Numbers — Maintenance
        </div>

        <div class="kpi-card" style="border-left-color:${availCol};cursor:pointer"
            onclick="showPage('kpi')">
            <div class="kpi-label">Fleet Availability</div>
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
            <div class="kpi-label">Fleet MTTR</div>
            <div class="kpi-value" style="color:${mttrCol}">${fleetMTTR}h</div>
            <div class="kpi-sub">target &lt;4h · mean time to repair</div>
        </div>
        <div class="kpi-card" style="border-left-color:${mtbfCol};cursor:pointer"
            onclick="showPage('kpi')">
            <div class="kpi-label">Fleet MTBF</div>
            <div class="kpi-value" style="color:${mtbfCol}">${fleetMTBF > 0 ? fleetMTBF + 'h' : '—'}</div>
            <div class="kpi-sub">target &gt;200h · mean time between failures</div>
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
            <div class="kpi-sub">fleet avg · ${wk || '—'}</div>
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