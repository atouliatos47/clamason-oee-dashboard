// dashboard.js — Home page orchestrator
// Depends on: dashboard-gauge.js, dashboard-charts.js

if (!state.wcTarget) state.wcTarget = 65;

function oc(v, target) {
    return v >= target ? '#27ae60' : v >= target * 0.9 ? '#e67e22' : '#c0392b';
}

function renderDashboard() {
    // ── Targets ──
    const _saved = (() => { try { return JSON.parse(localStorage.getItem('clamason_kpi_targets') || '{}'); } catch { return {}; } })();
    const mttrTarget = _saved.maxMTTR?.value || 8;
    const mtbfTarget = _saved.minMTBF?.value || 6;

    const wk   = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.oee > 0);

    // ── Maintenance KPIs ──
    const maint     = state.maintData || [];
    const totalDT   = maint.reduce((s, m) => s + (+m.downtime_hrs), 0);
    const totalCost = maint.reduce((s, m) => s + (+m.cost_labour), 0);
    const totalBDs  = maint.reduce((s, m) => s + (+m.breakdown_count), 0);
    const totalRunH = state.weeks.reduce((s, w) =>
        s + (state.oeeData[w] || []).reduce((ss, d) => ss + (+d.run_h || 0), 0), 0);
    const equipMTTR = totalBDs > 0 ? Math.round((totalDT / totalBDs) * 10) / 10 : 0;
    const equipMTBF = totalBDs > 0 && totalRunH > 0
        ? Math.round((totalRunH / totalBDs) * 10) / 10 : 0;
    const equipMTTF = equipMTBF > 0 ? Math.round((equipMTBF - equipMTTR) * 10) / 10 : 0;
    const mttrCol   = equipMTTR <= mttrTarget ? '#27ae60' : equipMTTR <= mttrTarget * 1.5 ? '#e67e22' : '#c0392b';
    const mtbfCol   = equipMTBF >= mtbfTarget ? '#27ae60' : equipMTBF >= mtbfTarget * 0.5 ? '#e67e22' : '#c0392b';

    // ── Availability & OEE ──
    const avgAvail   = active.length ? active.reduce((s, d) => s + (+d.avail), 0) / active.length : 0;
    const avgOEE     = active.length ? active.reduce((s, d) => s + (+d.oee),   0) / active.length : 0;
    const availCol   = oc(avgAvail, state.wcTarget);
    const avgOEECol  = oc(avgOEE,   state.wcTarget);
    // ── Current period (latest month uploaded) ──
    const periods = [...new Set(maint.map(m => m.period_label).filter(Boolean))].sort();
    const period  = periods[periods.length - 1] || 'Annual';
    const maintCurrent = period !== 'Annual'
        ? maint.filter(m => m.period_label === period)
        : maint;

    // ── Fleet TEEP ──
    const allMachineSet = new Set(state.weeks.flatMap(w => (state.oeeData[w] || []).map(d => d.machine)));
    const numMachines   = allMachineSet.size || 1;
    const totalNetAvailAll = state.weeks.reduce((s, w) =>
        s + (state.oeeData[w] || []).reduce((ss, d) => ss + (+d.net_avail_h || 0), 0), 0);
    const totalCalendarH = numMachines * state.weeks.length * 7 * 24;
    const fleetLoading   = totalCalendarH > 0 ? totalNetAvailAll / totalCalendarH : 0;
    const allOEEVals     = state.weeks.flatMap(w => (state.oeeData[w] || []).filter(x => +x.oee > 0).map(x => +x.oee));
    const allAvgOEE      = allOEEVals.length ? allOEEVals.reduce((a, b) => a + b, 0) / allOEEVals.length : 0;
    const fleetTEEP      = Math.round(allAvgOEE * fleetLoading * 10) / 10;
    const teepCol        = fleetTEEP >= 20 ? '#27ae60' : fleetTEEP >= 12 ? '#e67e22' : '#c0392b';

    const totalParts   = data.reduce((s, d) => s + (+d.total_parts), 0);
    const totalRunH_wk = data.reduce((s, d) => s + (+d.run_h || 0), 0);
    const totalNetAvail = data.reduce((s, d) => s + (+d.net_avail_h || 0), 0);
    const schedAdherence = totalNetAvail > 0
        ? Math.round((totalRunH_wk / totalNetAvail) * 1000) / 10 : 0;

    // ── Trend data (last 6 weeks) ──
    const last6wks  = state.weeks.slice(-6);
    const trendOEE  = last6wks.map(w => {
        const d = state.oeeData[w] || [];
        const a = d.filter(x => +x.oee > 0);
        return a.length ? Math.round(a.reduce((s, x) => s + (+x.oee), 0) / a.length * 10) / 10 : 0;
    });
    const trendAvail = last6wks.map(w => {
        const d = state.oeeData[w] || [];
        const a = d.filter(x => +x.avail > 0);
        return a.length ? Math.round(a.reduce((s, x) => s + (+x.avail), 0) / a.length * 10) / 10 : 0;
    });

    // ── Render home layout ──
    const kpiEl = document.getElementById('kpiGrid');
    kpiEl.style.display = 'block';
    kpiEl.innerHTML = `
    <!-- TOP ROW -->
    <div style="display:grid;grid-template-columns:190px 1fr 210px;gap:12px;margin-bottom:12px;">

        <div class="card" style="text-align:center;padding:12px 10px;">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Fleet OEE</div>
            <canvas id="gaugeHome" width="160" height="92"></canvas>
            <div style="font-size:24px;font-weight:700;color:${avgOEECol};margin-top:-8px;">${fmt1(avgOEE)}%</div>
            <div style="font-size:10px;color:#555;margin-top:2px;">Target ${state.wcTarget}% · ${wk || '—'}</div>
        </div>

        <div class="card" style="padding:12px 14px;">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">OEE trend — last 6 weeks</div>
            <canvas id="homeTrend" width="360" height="100" style="width:100%;height:auto;display:block;"></canvas>
            <div style="display:flex;gap:14px;margin-top:6px;">
                <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#555;">
                    <div style="width:12px;height:3px;background:#95C11F;border-radius:2px;"></div>OEE
                </div>
                <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#555;">
                    <div style="width:12px;height:3px;background:#243547;border-radius:2px;"></div>Availability
                </div>
            </div>
        </div>

        <div class="card" style="padding:12px 14px;">
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Site summary</div>
            ${[
                ['Availability', fmt1(avgAvail) + '%', availCol],
                ['MTBF',        equipMTBF > 0 ? equipMTBF + 'h' : '—', mtbfCol],
                ['MTTR',        equipMTTR + 'h', mttrCol],
                ['Breakdowns',  totalBDs,         '#c0392b'],
                ['TEEP',        fleetTEEP > 0 ? fleetTEEP + '%' : '—', teepCol],
            ].map(([lbl, val, col]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:5px 0;border-bottom:0.5px solid #f0f0f0;font-size:11px;">
                    <span style="color:#444;">${lbl}</span>
                    <span style="font-weight:700;color:${col};background:${col}15;
                        padding:2px 8px;border-radius:10px;">${val}</span>
                </div>`).join('')}
        </div>
    </div>

    <!-- DEPT CARDS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">

        <div class="card" style="border-top:4px solid #243547;cursor:pointer;padding:14px 16px;"
            onclick="showDept('maintenance')">
            <div style="font-size:14px;font-weight:700;color:#243547;margin-bottom:3px;">🔧 Maintenance</div>
            <div style="font-size:11px;color:#888;margin-bottom:12px;">All production assets · Click to drill in</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">
                ${[['OEE', fmt1(avgOEE)+'%', avgOEECol],['MTBF', equipMTBF > 0 ? equipMTBF+'h':'—', mtbfCol],['Avail', fmt1(avgAvail)+'%', availCol]]
                .map(([l,v,c]) => `<div style="background:#f8f8f8;border-radius:7px;padding:8px;text-align:center;">
                    <div style="font-size:15px;font-weight:700;color:${c};">${v}</div>
                    <div style="font-size:9px;color:#888;text-transform:uppercase;margin-top:2px;">${l}</div>
                </div>`).join('')}
            </div>
            <div style="font-size:11px;color:#95C11F;font-weight:700;">OEE · Maintenance · KPIs →</div>
        </div>

        <div class="card" style="border-top:4px solid #7b5ea7;cursor:pointer;padding:14px 16px;"
            onclick="showDept('toolroom')">
            <div style="font-size:14px;font-weight:700;color:#7b5ea7;margin-bottom:3px;">⚙️ Toolroom</div>
            <div style="font-size:11px;color:#888;margin-bottom:12px;">Die maintenance · Tool management · Click to drill in</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">
                ${['OEE','MTBF','TEEP'].map(l => `<div style="background:#f8f8f8;border-radius:7px;padding:8px;text-align:center;">
                    <div style="font-size:15px;font-weight:700;color:#bbb;">—</div>
                    <div style="font-size:9px;color:#888;text-transform:uppercase;margin-top:2px;">${l}</div>
                </div>`).join('')}
            </div>
            <div style="font-size:11px;color:#7b5ea7;font-weight:700;">OEE · Tool jobs · KPIs →</div>
        </div>
    </div>`;

    // ── Draw canvas elements ──
    setTimeout(() => {
        const gc = document.getElementById('gaugeHome');
        if (gc) drawHomeGauge(gc, avgOEE, avgOEECol);
        drawHomeTrend(last6wks, trendOEE, trendAvail);
    }, 50);

    // ── Secondary charts — current period only ──
    const top5 = [...maintCurrent].filter(m => +m.downtime_hrs > 0)
        .sort((a, b) => +b.downtime_hrs - +a.downtime_hrs).slice(0, 5);
    const maxDT = +top5[0]?.downtime_hrs || 1;
    document.getElementById('oeeBarChart').innerHTML = top5.length
        ? top5.map(m => {
            const pct = (+m.downtime_hrs / maxDT) * 100;
            const col = +m.downtime_hrs >= 500 ? '#c0392b' : +m.downtime_hrs >= 200 ? '#e67e22' : '#e6b800';
            return `<div class="bar-row">
                <div class="bar-machine-name" title="${m.name}">${m.name}</div>
                <div class="bar-track" style="cursor:pointer"
                    onclick="showPage('detail',${JSON.stringify({...m,type:'maint'}).replace(/"/g,'&quot;')})">
                    <div class="bar-fill" style="width:${pct}%;background:${col};"></div>
                </div>
                <span class="bar-value-out">${Math.round(+m.downtime_hrs)}h</span>
            </div>`;
        }).join('')
        : emptyState('No Agility data — upload an AG3-601 report');

    document.getElementById('latestWeekLabel').textContent = period;

    renderTPMPie();
    renderScheduleChart();

    const tpmTrendEl = document.getElementById('tpmTrendCard');
    if (tpmTrendEl) tpmTrendEl.innerHTML = renderTPMTrendCard();

    // ── Availability sparklines ──
    const allMachines = [...new Set(
        state.weeks.flatMap(w => (state.oeeData[w] || []).map(d => d.machine))
    )].sort();

    document.getElementById('sparkGrid').innerHTML = allMachines.length
        ? allMachines.map(m => {
            const vals = state.weeks.map(w => {
                const r = (state.oeeData[w] || []).find(d => d.machine === m);
                return r ? +r.avail : null;
            });
            const bars = state.weeks.map((w, i) => {
                const v = vals[i];
                if (v === null) return `<div class="spark-bar" style="flex:1;background:#eee;"></div>`;
                const col = v >= state.wcTarget ? '#27ae60' : v >= state.wcTarget * 0.9 ? '#e67e22' : '#c0392b';
                return `<div class="spark-bar" style="flex:1;height:${Math.max((v/100)*36,1)}px;background:${col};"></div>`;
            }).join('');
            const latest = vals[vals.length - 1];
            return `<div class="spark-card"
                onclick="showPage('detail',${JSON.stringify({machine:m,type:'trend'}).replace(/"/g,'&quot;')})">
                <div class="spark-name">${m}</div>
                <div class="spark-bars">${bars}</div>
                <div class="spark-latest">Avail: <strong>${latest !== null ? fmt1(latest)+'%' : '—'}</strong></div>
            </div>`;
        }).join('')
        : emptyState('Upload at least 2 weeks to see trends');
}

function editWCTarget() {
    const val = prompt(`Set Availability target (%)\nCurrent: ${state.wcTarget}%`, state.wcTarget);
    if (val && !isNaN(val) && +val > 0 && +val <= 100) {
        state.wcTarget = +val;
        renderDashboard();
        showToast(`✅ Target set to ${state.wcTarget}%`, 'success');
    }
}
