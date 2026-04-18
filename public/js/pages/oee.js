// oee.js - Gauge-based OEE page

let oeeQuickFilter = 4;

// ── SEMI-CIRCULAR GAUGE ───────────────────────────────────────────────────────
function drawSemiGauge(value, target, label, W, H) {
    W = W || 130; H = H || 88;
    const cx = W / 2, cy = H - 14;
    const r  = Math.min(cx - 8, cy - 4);
    const pct = Math.max(0, Math.min(100, +value || 0));
    const col = pct >= target ? '#95C11F' : pct >= target * 0.82 ? '#e67e22' : '#c0392b';

    function pt(v) {
        const a = (180 - v * 1.8) * Math.PI / 180;
        return { x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy - r * Math.sin(a)).toFixed(1) };
    }
    const p0 = pt(0), pe = pt(pct);
    const bg = `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${+(cx+r).toFixed(1)} ${cy}`;
    const arc = pct > 0
        ? `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${pe.x} ${pe.y}`
        : '';

    // Target tick
    const ta = (180 - target * 1.8) * Math.PI / 180;
    const tox = +(cx + (r + 3) * Math.cos(ta)).toFixed(1);
    const toy = +(cy - (r + 3) * Math.sin(ta)).toFixed(1);
    const tix = +(cx + (r - 13) * Math.cos(ta)).toFixed(1);
    const tiy = +(cy - (r - 13) * Math.sin(ta)).toFixed(1);

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
        <path d="${bg}" fill="none" stroke="#ebebeb" stroke-width="11" stroke-linecap="round"/>
        ${arc ? `<path d="${arc}" fill="none" stroke="${col}" stroke-width="11" stroke-linecap="round"/>` : ''}
        <line x1="${tox}" y1="${toy}" x2="${tix}" y2="${tiy}" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/>
        <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="15" font-weight="800" fill="${col}">${Math.round(pct)}%</text>
        <text x="${cx}" y="${H - 2}" text-anchor="middle" font-size="9" fill="#aaa" letter-spacing="0.3">${label}</text>
    </svg>`;
}

// ── FLEET DONUT (large centre gauge) ─────────────────────────────────────────
function renderFleetDonut(oee, avail, target) {
    const W = 200, H = 130;
    const cx = W / 2, cy = H - 20;
    const r  = 80;

    function bigPt(v) {
        const a = (180 - v * 1.8) * Math.PI / 180;
        return { x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy - r * Math.sin(a)).toFixed(1) };
    }

    const col = oee >= target ? '#95C11F' : oee >= target * 0.82 ? '#e67e22' : '#c0392b';
    const ac  = avail >= target ? '#95C11F' : avail >= target * 0.82 ? '#e67e22' : '#c0392b';
    const p0  = bigPt(0), pe = bigPt(oee);
    const bg  = `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${+(cx+r).toFixed(1)} ${cy}`;
    const arc = oee > 0
        ? `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${oee > 50 ? 1 : 0} 1 ${pe.x} ${pe.y}`
        : '';

    const ta  = (180 - target * 1.8) * Math.PI / 180;
    const tox = +(cx + (r + 5) * Math.cos(ta)).toFixed(1);
    const toy = +(cy - (r + 5) * Math.sin(ta)).toFixed(1);
    const tix = +(cx + (r - 18) * Math.cos(ta)).toFixed(1);
    const tiy = +(cy - (r - 18) * Math.sin(ta)).toFixed(1);

    return `
    <div style="text-align:center">
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:220px;height:auto;display:block;margin:0 auto">
            <path d="${bg}" fill="none" stroke="#ebebeb" stroke-width="14" stroke-linecap="round"/>
            ${arc ? `<path d="${arc}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round"/>` : ''}
            <line x1="${tox}" y1="${toy}" x2="${tix}" y2="${tiy}" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>
            <text x="${cx}" y="${cy - 28}" text-anchor="middle" font-size="30" font-weight="800" fill="${col}">${fmt1(oee)}%</text>
            <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="11" fill="#888">Fleet OEE</text>
            <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="10" fill="#aaa">Avail: <tspan fill="${ac}" font-weight="700">${fmt1(avail)}%</tspan></text>
            <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="9" fill="#c0392b">▸ Target ${target}%</text>
        </svg>
    </div>`;
}

// ── TREND LINE CHART ──────────────────────────────────────────────────────────
function renderTrendSVG(weeks, target) {
    if (weeks.length < 2) return `<div style="padding:20px;color:#aaa;font-size:13px">Upload at least 2 weeks to see trend</div>`;

    const W = 580, H = 170;
    const padL = 36, padR = 10, padT = 14, padB = 36;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const n = weeks.length, xStep = chartW / Math.max(n - 1, 1);

    function xOf(i) { return padL + i * xStep; }
    function yOf(v) { return padT + chartH - (Math.min(v, 100) / 100) * chartH; }

    // Per-week fleet averages
    const pts = weeks.map(w => {
        const d = state.oeeData[w] || [];
        const a = d.filter(x => +x.net_avail_h > 0);
        if (!a.length) return null;
        return {
            avail:   a.reduce((s,x) => s + +x.avail, 0) / a.length,
            oee:     a.reduce((s,x) => s + +x.oee,   0) / a.length,
            perf:    a.reduce((s,x) => s + +x.perf,  0) / a.length,
            quality: a.reduce((s,x) => s + +x.quality, 0) / a.length,
        };
    });

    function line(key, col, sw, dash='') {
        let segs = [], seg = [];
        pts.forEach((p, i) => {
            if (p) seg.push(`${xOf(i).toFixed(1)},${yOf(p[key]).toFixed(1)}`);
            else { if (seg.length>1) segs.push(seg); seg=[]; }
        });
        if (seg.length>1) segs.push(seg);
        let out = segs.map(s => `<polyline points="${s.join(' ')}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
        pts.forEach((p, i) => { if(p) out += `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(p[key]).toFixed(1)}" r="3" fill="${col}" stroke="#fff" stroke-width="1.5"/>`; });
        return out;
    }

    // Grid
    let grid = '';
    [0, 25, 50, 75, 100].forEach(v => {
        const y = yOf(v), isT = v === target;
        grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="${isT?'#c0392b':'#f0f0f0'}" stroke-width="${isT?1.5:1}" stroke-dasharray="${isT?'5,3':''}"/>
        <text x="${padL-4}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="9" fill="${isT?'#c0392b':'#bbb'}" font-weight="${isT?700:400}">${v}%</text>`;
    });
    if (target % 25 !== 0) {
        grid += `<text x="${padL-4}" y="${(yOf(target)-4).toFixed(1)}" text-anchor="end" font-size="8" fill="#c0392b" font-weight="700">T${target}%</text>`;
    }

    // X labels
    let xLabels = weeks.map((w, i) => {
        if (n > 16 && i % 3 !== 0) return '';
        const x = xOf(i), lbl = String(w).replace('Wk ','W').slice(0,8);
        return `<text x="${x.toFixed(1)}" y="${H-padB+14}" text-anchor="end" transform="rotate(-35,${x.toFixed(1)},${H-padB+14})" font-size="9" fill="#999">${lbl}</text>`;
    }).join('');

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
        ${grid}
        ${line('quality','#27ae60',1.5,'4,3')}
        ${line('perf','#e67e22',1.5,'4,3')}
        ${line('oee','#243547',1.5,'5,3')}
        ${line('avail','#95C11F',3)}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
        <line x1="${padL}" y1="${padT+chartH}" x2="${W-padR}" y2="${padT+chartH}" stroke="#ddd" stroke-width="1"/>
        ${xLabels}
    </svg>`;
}

// ── MACHINE GAUGE CARDS ───────────────────────────────────────────────────────
function renderMachineCards(data, target) {
    if (!data.length) return `<div style="color:#aaa;padding:16px;text-align:center">No machine data for this week</div>`;
    const sorted = [...data].filter(d => +d.net_avail_h > 0).sort((a,b) => +a.avail - +b.avail);
    return sorted.map(d => `
        <div style="background:#fff;border-radius:10px;padding:10px 8px 6px;
            box-shadow:0 1px 6px rgba(0,0,0,0.08);border:1px solid #f0f0f0;cursor:pointer"
            onclick="showPage('detail',${JSON.stringify({...d,type:'oee'}).replace(/"/g,'&quot;')})">
            <div style="font-size:11px;font-weight:700;color:#243547;text-align:center;margin-bottom:4px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${d.machine}">${d.machine}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">
                ${drawSemiGauge(+d.avail, target, 'Avail')}
                ${drawSemiGauge(+d.oee,   target, 'OEE')}
            </div>
        </div>`).join('');
}

// ── RENDER PAGE ───────────────────────────────────────────────────────────────
function renderOEEPage() {
    const select = document.getElementById('weekSelect');
    if (select) {
        select.innerHTML = state.weeks.map(w =>
            `<option value="${w}" ${w === state.currentWeek ? 'selected' : ''}>${w}</option>`
        ).join('');
    }
    renderOEEKPIs();
    renderOEEVisuals();
}

function renderOEEKPIs() {
    const wk = state.currentWeek;
    const data = wk ? (state.oeeData[wk] || []) : [];
    const active = data.filter(d => +d.net_avail_h > 0);
    const avgAvail = active.length ? active.reduce((s,d)=>s+ +d.avail,0)/active.length : 0;
    const avgOEE   = active.length ? active.reduce((s,d)=>s+ +d.oee,0)/active.length : 0;
    const avgPerf  = active.length ? active.reduce((s,d)=>s+ +d.perf,0)/active.length : 0;
    const totalUnpl = data.reduce((s,d)=>s+ +d.unplanned_h,0);
    const wcTarget  = state.wcTarget || 65;
    const aboveAvail = active.filter(d => +d.avail >= wcTarget).length;
    const availCol = avgAvail >= wcTarget ? '#27ae60' : avgAvail >= wcTarget*0.95 ? '#e67e22' : '#c0392b';
    const grid = document.getElementById('oeeKpiGrid');
    if (!grid) return;
    grid.innerHTML = `
        <div class="kpi-card" style="border-left-color:${availCol}">
            <div class="kpi-label">Equipment Avg Availability</div>
            <div class="kpi-value" style="color:${availCol}">${fmt1(avgAvail)}%</div>
            <div class="kpi-sub">target ${wcTarget}% · ${wk||'—'}</div>
        </div>
        <div class="kpi-card" style="border-left-color:#27ae60">
            <div class="kpi-label">Above Avail Target</div>
            <div class="kpi-value" style="color:#27ae60">${aboveAvail} / ${active.length}</div>
            <div class="kpi-sub">machines ≥ ${wcTarget}% availability</div>
        </div>
        <div class="kpi-card" style="border-left-color:#c0392b">
            <div class="kpi-label">Total Unplanned Down</div>
            <div class="kpi-value" style="color:#c0392b">${fmtH(totalUnpl)}</div>
            <div class="kpi-sub">all presses this week</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Equipment Avg OEE</div>
            <div class="kpi-value" style="color:${avgOEE>=wcTarget?'#27ae60':'#c0392b'}">${fmt1(avgOEE)}%</div>
            <div class="kpi-sub">active machines · ${wk||'—'}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Equipment Avg Performance</div>
            <div class="kpi-value">${fmt1(avgPerf)}%</div>
            <div class="kpi-sub">active machines</div>
        </div>`;
}

function renderOEEVisuals() {
    const el = document.getElementById('oeeBarsChart');
    if (!el) return;
    const wk     = state.currentWeek;
    const data   = wk ? (state.oeeData[wk] || []) : [];
    const target = state.wcTarget || 65;
    const active = data.filter(d => +d.net_avail_h > 0);
    const avgAvail = active.length ? active.reduce((s,d)=>s+ +d.avail,0)/active.length : 0;
    const avgOEE   = active.length ? active.reduce((s,d)=>s+ +d.oee,0)/active.length : 0;

    el.innerHTML = `
    <!-- Top row: fleet gauge + trend -->
    <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:center;margin-bottom:20px">
        <div>
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;text-align:center;margin-bottom:6px">Fleet Overview</div>
            ${renderFleetDonut(avgOEE, avgAvail, target)}
        </div>
        <div>
            <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">
                Trend — All Weeks
                <span style="float:right;font-weight:400;color:#aaa">
                    <span style="color:#95C11F">■</span> Availability &nbsp;
                    <span style="color:#243547">■</span> OEE &nbsp;
                    <span style="color:#e67e22">■</span> Perf &nbsp;
                    <span style="color:#27ae60">■</span> Quality
                </span>
            </div>
            ${renderTrendSVG(state.weeks, target)}
        </div>
    </div>
    <!-- Machine gauge grid -->
    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">
        Active Machines — ${wk || '—'}
        <span style="float:right;font-weight:400;font-size:10px;color:#aaa">sorted worst → best availability · click for detail</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">
        ${renderMachineCards(data, target)}
    </div>`;
}

// ── WEEK FILTERS ──────────────────────────────────────────────────────────────
function setWeekFromSelect(wk) {
    state.currentWeek = wk;
    document.querySelectorAll('#quickFilters .week-tab').forEach(t => t.classList.remove('active'));
    renderOEEKPIs();
    renderOEEVisuals();
}

function setQuickFilter(n, btn) {
    oeeQuickFilter = n;
    document.querySelectorAll('#quickFilters .week-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (state.weeks.length) {
        state.currentWeek = state.weeks[state.weeks.length - 1];
        const select = document.getElementById('weekSelect');
        if (select) select.value = state.currentWeek;
    }
    renderOEEKPIs();
    renderOEEVisuals();
    renderOEETable();
}

function getOEEFiltered() {
    let visibleWeeks = state.weeks;
    if (oeeQuickFilter > 0) visibleWeeks = state.weeks.slice(-oeeQuickFilter);
    const wk = visibleWeeks.includes(state.currentWeek)
        ? state.currentWeek
        : visibleWeeks[visibleWeeks.length - 1] || state.currentWeek;
    const select = document.getElementById('weekSelect');
    if (select && select.value !== wk) {
        select.innerHTML = visibleWeeks.map(w => `<option value="${w}" ${w===wk?'selected':''}>${w}</option>`).join('');
        state.currentWeek = wk;
    }
    const d     = [...(state.oeeData[wk] || [])];
    const search = document.getElementById('oeeSearch')?.value.toLowerCase() || '';
    const band   = document.getElementById('oeeBandFilter')?.value || '';
    return d
        .filter(x => !search || x.machine.toLowerCase().includes(search))
        .filter(x => {
            if (!band) return true;
            const v = +x.avail;
            if (band==='good') return v>=85;
            if (band==='ok')   return v>=70&&v<85;
            if (band==='low')  return v>=50&&v<70;
            if (band==='poor') return v>0&&v<50;
            return true;
        })
        .sort((a,b)=>{
            const av=a[state.sortOEECol]??0, bv=b[state.sortOEECol]??0;
            return (av>bv?1:-1)*state.sortOEEDir;
        });
}

function renderOEETable() {
    const data   = getOEEFiltered();
    const target = state.wcTarget || 65;
    const tbody  = document.getElementById('oeeTableBody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:#aaa">No data</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(d => {
        const ac = +d.avail>=target?'#27ae60': +d.avail>=target*.9?'#e67e22': +d.avail>0?'#c0392b':'#ccc';
        return `<tr onclick="showPage('detail',${JSON.stringify({...d,type:'oee'}).replace(/"/g,'&quot;')})">
            <td class="name-cell">${d.machine}</td>
            <td><span style="font-weight:700;color:${ac}">${fmt1(d.avail)}%</span></td>
            <td><span class="badge ${oeeBadgeClass(d.oee)}">${fmt1(d.oee)}%</span></td>
            <td style="color:${+d.unplanned_h>20?'#c0392b': +d.unplanned_h>10?'#e67e22':'inherit'};font-weight:${+d.unplanned_h>20?700:400}">${fmtH(d.unplanned_h)}</td>
            <td>${fmt1(d.perf)}%</td>
        </tr>`;
    }).join('');
}

function sortOEE(col) {
    state.sortOEEDir = state.sortOEECol===col ? state.sortOEEDir*-1 : -1;
    state.sortOEECol = col;
    renderOEETable();
}
