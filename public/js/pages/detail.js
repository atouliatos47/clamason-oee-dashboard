// detail.js - Machine detail view

function groupSimilarBreakdowns(breakdowns) {
    const STOP_WORDS = new Set(['not', 'or', 'be', 'the', 'a', 'an', 'and', 'to', 'in', 'on', 'is', 'it', 'of', 'cannot', 'do', 'does', 'will', 'with', 'for', 'from', 'by', 'get', 'no']);

    function getKeywords(desc) {
        return desc.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    }

    function similarity(a, b) {
        const ka = new Set(getKeywords(a));
        const kb = new Set(getKeywords(b));
        return [...ka].filter(w => kb.has(w)).length;
    }

    const groups = [];
    const used = new Set();

    breakdowns.forEach((bd, i) => {
        if (used.has(i)) return;
        const group = {
            ...bd,
            downtime_hrs: +bd.downtime_hrs,
            labour_hrs: +bd.labour_hrs,
            cost_labour: +bd.cost_labour,
            count: 1,
            wos: [bd.wo]
        };
        used.add(i);

        breakdowns.forEach((other, j) => {
            if (i === j || used.has(j)) return;
            if (similarity(bd.desc, other.desc) >= 2) {
                group.downtime_hrs = Math.round((group.downtime_hrs + +other.downtime_hrs) * 10) / 10;
                group.labour_hrs = Math.round((group.labour_hrs + +other.labour_hrs) * 10) / 10;
                group.cost_labour = Math.round(group.cost_labour + +other.cost_labour);
                group.count++;
                group.wos.push(other.wo);
                group.desc = getKeywords(bd.desc).slice(0, 5).join(' ');
                used.add(j);
            }
        });
        groups.push(group);
    });

    return groups.sort((a, b) => b.downtime_hrs - a.downtime_hrs);
}

function renderBreakdownCard(b) {
    const isGrouped = b.count && b.count > 1;
    const woLine = isGrouped
        ? `WOs: ${b.wos.join(', ')} &nbsp;·&nbsp; Labour: ${b.labour_hrs}h &nbsp;·&nbsp; Cost: ${fmtK(b.cost_labour)}`
        : `WO: ${b.wo} &nbsp;·&nbsp; Labour: ${b.labour_hrs}h &nbsp;·&nbsp; Cost: ${fmtK(b.cost_labour)}`;
    return `
        <div class="breakdown-card">
            <div class="bd-hrs">${b.downtime_hrs}h</div>
            <div class="bd-info">
                <div class="bd-desc">${b.desc}${isGrouped ? ` <span class="badge badge-amber">${b.count} similar jobs</span>` : ''}</div>
                <div class="bd-meta">${woLine}</div>
            </div>
        </div>`;
}

function renderDetail(d) {
    const el = document.getElementById('detailContent');

    if (d.type === 'oee' || d.type === 'trend') {
        const history = state.weeks.map(w => {
            const row = (state.oeeData[w] || []).find(x => x.machine === d.machine);
            return { week: w, ...(row || {}) };
        });
        const latest = history.filter(h => +h.oee > 0).pop() || {};
        const bds = sparkBars(history);

        const MAPPING = {
            'Kaiser 50T 1': '00029', 'Kaiser 50T 2': '00030',
            'HME 20T A ISI23': '00025', 'HME 20T C ISI22': '00024',
            'Chin Fong 110 ISI1': '00009', 'Chin Fong 110 ISI74': '00044',
            'Bruderer 60T ISI73': '00043',
        };
        const agCode = MAPPING[d.machine];
        const ag = agCode ? state.maintData.find(m => m.code === agCode) : null;
        const rawAgBds = ag ? (Array.isArray(ag.breakdowns) ? ag.breakdowns : JSON.parse(ag.breakdowns || '[]')) : [];
        const agTpmJobs = ag ? (Array.isArray(ag.tpm_jobs) ? ag.tpm_jobs : JSON.parse(ag.tpm_jobs || '[]')) : [];
        const agBds = groupSimilarBreakdowns(rawAgBds.filter(b => +b.downtime_hrs > 0));

        el.innerHTML = `
            <div class="detail-header">
                <div>
                    <div class="detail-name">${d.machine}</div>
                    <div class="detail-sub">Availability Performance — ${state.weeks.join(', ')}</div>
                </div>
                <div class="detail-stats">
                    <div class="detail-stat">
                        <div class="val" style="color:${oeeColor(latest.oee)}">${fmt1(latest.oee)}%</div>
                        <div class="lbl">Latest OEE</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val" style="color:#c0392b">${fmtH(latest.unplanned_h)}</div>
                        <div class="lbl">Unplanned Hrs</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val">${fmt1(latest.avail)}%</div>
                        <div class="lbl">Availability</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val">${fmt1(latest.perf)}%</div>
                        <div class="lbl">Performance</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Weekly Availability trend</span></div>
                <div style="margin-bottom:16px">${bds}</div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Week</th><th>OEE %</th><th>Avail %</th><th>Perf %</th><th>Quality %</th><th>Unplanned h</th><th>Parts</th></tr></thead>
                        <tbody>${history.map(h => `<tr>
                            <td style="font-weight:700">${h.week}</td>
                            <td><span class="badge ${oeeBadgeClass(h.oee)}">${fmt1(h.oee)}%</span></td>
                            <td>${fmt1(h.avail)}%</td><td>${fmt1(h.perf)}%</td><td>${fmt1(h.quality)}%</td>
                            <td style="color:${+h.unplanned_h > 20 ? '#c0392b' : 'inherit'}">${fmtH(h.unplanned_h)}</td>
                            <td>${fmtN(h.total_parts)}</td>
                        </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            ${ag ? `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">🔧 Maintenance history (Agility)</span>
                    <span class="card-sub">${ag.period_label || ''}</span>
                </div>
                ${(() => {
                    const mttr = +ag.breakdown_count > 0
                        ? Math.round((+ag.downtime_hrs / +ag.breakdown_count) * 10) / 10 : 0;
                    const machineRunH = state.weeks.reduce((s, w) => {
                        const r = (state.oeeData[w] || []).find(x => x.machine === d.machine);
                        return s + (r ? +r.run_h : 0);
                    }, 0);
                    const mtbf = +ag.breakdown_count > 0 && machineRunH > 0
                        ? Math.round((machineRunH / +ag.breakdown_count) * 10) / 10 : 0;
                    const mttrColor = mttr <= 4 ? '#27ae60' : mttr <= 8 ? '#e67e22' : '#c0392b';
                    const mtbfColor = mtbf >= 200 ? '#27ae60' : mtbf >= 100 ? '#e67e22' : '#c0392b';
                    return `
                    <div class="kpi-grid" style="margin-bottom:14px">
                        <div class="kpi-card" style="border-left-color:#c0392b">
                            <div class="kpi-label">Annual Downtime</div>
                            <div class="kpi-value" style="color:#c0392b">${fmt1(ag.downtime_hrs)}h</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-label">Breakdowns</div>
                            <div class="kpi-value">${ag.breakdown_count}</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-label">TPM Visits</div>
                            <div class="kpi-value">${ag.tpm_count}</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-label">Labour Cost</div>
                            <div class="kpi-value">${fmtK(ag.cost_labour)}</div>
                        </div>
                        <div class="kpi-card" style="border-left-color:${mttrColor}">
                            <div class="kpi-label">MTTR</div>
                            <div class="kpi-value" style="color:${mttrColor}">${mttr}h</div>
                            <div class="kpi-sub">mean time to repair · target &lt;4h</div>
                        </div>
                        <div class="kpi-card" style="border-left-color:${mtbfColor}">
                            <div class="kpi-label">MTBF</div>
                            <div class="kpi-value" style="color:${mtbfColor}">${mtbf > 0 ? mtbf + 'h' : '—'}</div>
                            <div class="kpi-sub">mean time between failures · target &gt;200h</div>
                        </div>
                    </div>`;
                })()}
                ${agBds.length ? agBds.map(b => renderBreakdownCard(b)).join('') : '<p style="color:#aaa;font-size:13px">No significant breakdowns recorded</p>'}
            </div>` : ''}
            ${agTpmJobs.length ? `
            <div class="card" style="margin-top:12px;">
                <div class="card-header"><span class="card-title">✅ PPM History (planned visits)</span></div>
                ${agTpmJobs.map(t => `
                <div class="breakdown-card" style="border-left-color:#27ae60;">
                    <div class="bd-hrs" style="color:#27ae60;">PPM</div>
                    <div class="bd-info">
                        <div class="bd-desc">${t.desc}</div>
                        <div class="bd-meta">WO: ${t.wo} &nbsp;·&nbsp; Labour: ${t.labour_hrs}h &nbsp;·&nbsp; Cost: ${fmtK(t.cost_labour)}</div>
                    </div>
                </div>`).join('')}
            </div>` : ''}
        `;
    } else if (d.type === 'maint') {
        const rawBds = Array.isArray(d.breakdowns) ? d.breakdowns : JSON.parse(d.breakdowns || '[]');
        const bds = groupSimilarBreakdowns(rawBds);
        el.innerHTML = `
            <div class="detail-header">
                <div>
                    <div class="detail-name">${d.name}</div>
                    <div class="detail-sub">Agility code: ${d.code} &nbsp;·&nbsp; ${d.period_label || ''}</div>
                </div>
                <div class="detail-stats">
${(() => {
                const mttr = +d.breakdown_count > 0
                    ? Math.round((+d.downtime_hrs / +d.breakdown_count) * 10) / 10 : 0;
                const mttrColor = mttr <= 4 ? '#27ae60' : mttr <= 8 ? '#e67e22' : '#c0392b';
                return `
    <div class="detail-stat"><div class="val" style="color:#c0392b">${fmt1(d.downtime_hrs)}h</div><div class="lbl">Downtime</div></div>
    <div class="detail-stat"><div class="val">${d.breakdown_count}</div><div class="lbl">Breakdowns</div></div>
    <div class="detail-stat"><div class="val">${d.tpm_count}</div><div class="lbl">TPM Visits</div></div>
    <div class="detail-stat"><div class="val">${fmtK(d.cost_labour)}</div><div class="lbl">Labour Cost</div></div>
    <div class="detail-stat"><div class="val" style="color:${mttrColor}">${mttr}h</div><div class="lbl">MTTR</div></div>`;
            })()}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><span class="card-title">Breakdown history (unplanned only)</span></div>
                ${bds.length ? bds.map(b => renderBreakdownCard(b)).join('') : '<p style="color:#aaa;font-size:13px">No breakdown downtime recorded</p>'}
            </div>`;
    }
}
// detail.js - Machine detail view

function groupSimilarBreakdowns(breakdowns) {
    const STOP_WORDS = new Set(['not', 'or', 'be', 'the', 'a', 'an', 'and', 'to', 'in', 'on', 'is', 'it', 'of', 'cannot', 'do', 'does', 'will', 'with', 'for', 'from', 'by', 'get', 'no']);

    function getKeywords(desc) {
        return desc.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    }

    function similarity(a, b) {
        const ka = new Set(getKeywords(a));
        const kb = new Set(getKeywords(b));
        return [...ka].filter(w => kb.has(w)).length;
    }

    const groups = [];
    const used = new Set();

    breakdowns.forEach((bd, i) => {
        if (used.has(i)) return;
        const group = {
            ...bd,
            downtime_hrs: +bd.downtime_hrs,
            labour_hrs: +bd.labour_hrs,
            cost_labour: +bd.cost_labour,
            count: 1,
            wos: [bd.wo]
        };
        used.add(i);

        breakdowns.forEach((other, j) => {
            if (i === j || used.has(j)) return;
            if (similarity(bd.desc, other.desc) >= 2) {
                group.downtime_hrs = Math.round((group.downtime_hrs + +other.downtime_hrs) * 10) / 10;
                group.labour_hrs = Math.round((group.labour_hrs + +other.labour_hrs) * 10) / 10;
                group.cost_labour = Math.round(group.cost_labour + +other.cost_labour);
                group.count++;
                group.wos.push(other.wo);
                group.desc = getKeywords(bd.desc).slice(0, 5).join(' ');
                used.add(j);
            }
        });
        groups.push(group);
    });

    return groups.sort((a, b) => b.downtime_hrs - a.downtime_hrs);
}

function renderBreakdownCard(b) {
    const isGrouped = b.count && b.count > 1;
    const woLine = isGrouped
        ? `WOs: ${b.wos.join(', ')} &nbsp;·&nbsp; Labour: ${b.labour_hrs}h &nbsp;·&nbsp; Cost: ${fmtK(b.cost_labour)}`
        : `WO: ${b.wo} &nbsp;·&nbsp; Labour: ${b.labour_hrs}h &nbsp;·&nbsp; Cost: ${fmtK(b.cost_labour)}`;
    return `
        <div class="breakdown-card">
            <div class="bd-hrs">${b.downtime_hrs}h</div>
            <div class="bd-info">
                <div class="bd-desc">${b.desc}${isGrouped ? ` <span class="badge badge-amber">${b.count} similar jobs</span>` : ''}</div>
                <div class="bd-meta">${woLine}</div>
            </div>
        </div>`;
}

function calcMTTR(downtimeHrs, breakdownCount) {
    if (+breakdownCount <= 0) return 0;
    return Math.round((+downtimeHrs / +breakdownCount) * 10) / 10;
}

function calcMTBF(runHrs, breakdownCount) {
    if (+breakdownCount <= 0 || runHrs <= 0) return 0;
    return Math.round((runHrs / +breakdownCount) * 10) / 10;
}

function mttrColor(val) {
    if (val <= 4) return '#27ae60';
    if (val <= 8) return '#e67e22';
    return '#c0392b';
}

function mtbfColor(val) {
    if (val >= 200) return '#27ae60';
    if (val >= 100) return '#e67e22';
    return '#c0392b';
}

function renderDetail(d) {
    const el = document.getElementById('detailContent');

    if (d.type === 'oee' || d.type === 'trend') {
        const history = state.weeks.map(w => {
            const row = (state.oeeData[w] || []).find(x => x.machine === d.machine);
            return { week: w, ...(row || {}) };
        });
        const latest = history.filter(h => +h.oee > 0).pop() || {};
        const bars = sparkBars(history);

        const MAPPING = {
            'Kaiser 50T 1': '00029',
            'Kaiser 50T 2': '00030',
            'HME 20T A ISI23': '00025',
            'HME 20T C ISI22': '00024',
            'Chin Fong 110 ISI1': '00009',
            'Chin Fong 110 ISI74': '00044',
            'Bruderer 60T ISI73': '00043',
        };

        const agCode = MAPPING[d.machine];
        const ag = agCode ? state.maintData.find(m => m.code === agCode) : null;
        const rawAgBds = ag ? (Array.isArray(ag.breakdowns) ? ag.breakdowns : JSON.parse(ag.breakdowns || '[]')) : [];
        const agBds = groupSimilarBreakdowns(rawAgBds.filter(b => +b.downtime_hrs > 0));
        const agTpmJobs2 = ag ? (Array.isArray(ag.tpm_jobs) ? ag.tpm_jobs : JSON.parse(ag.tpm_jobs || '[]')) : [];

        // MTTR / MTBF for this machine
        const machineRunH = state.weeks.reduce((s, w) => {
            const r = (state.oeeData[w] || []).find(x => x.machine === d.machine);
            return s + (r ? +r.run_h : 0);
        }, 0);
        const mttr = ag ? calcMTTR(ag.downtime_hrs, ag.breakdown_count) : 0;
        const mtbf = ag ? calcMTBF(machineRunH, ag.breakdown_count) : 0;

        el.innerHTML = `
            <div class="detail-header">
                <div>
                    <div class="detail-name">${d.machine}</div>
                    <div class="detail-sub">Availability Performance — ${state.weeks.join(', ')}</div>
                </div>
                <div class="detail-stats">
                    <div class="detail-stat">
                        <div class="val" style="color:${oeeColor(latest.oee)}">${fmt1(latest.oee)}%</div>
                        <div class="lbl">Latest OEE</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val" style="color:#c0392b">${fmtH(latest.unplanned_h)}</div>
                        <div class="lbl">Unplanned Hrs</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val">${fmt1(latest.avail)}%</div>
                        <div class="lbl">Availability</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val">${fmt1(latest.perf)}%</div>
                        <div class="lbl">Performance</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Weekly Availability trend</span></div>
                <div style="margin-bottom:16px">${bars}</div>
                <div class="table-wrap">
                    <table>
                        <thead><tr>
                            <th>Week</th><th>Avail %</th><th>OEE %</th>
                            <th>Perf %</th><th>Unplanned h</th><th>Planned Down</th><th>Run Time</th>
                        </tr></thead>
                        <tbody>
                            ${history.map(h => {
                                const ac = +h.avail >= (state.wcTarget||65) ? '#27ae60' : +h.avail >= (state.wcTarget||65)*0.9 ? '#e67e22' : +h.avail > 0 ? '#c0392b' : '#ccc';
                                return `<tr>
                                <td style="font-weight:700">${h.week}</td>
                                <td style="font-weight:700;color:${ac}">${fmt1(h.avail)}%</td>
                                <td><span class="badge ${oeeBadgeClass(h.oee)}">${fmt1(h.oee)}%</span></td>
                                <td>${fmt1(h.perf)}%</td>
                                <td style="color:${+h.unplanned_h > 20 ? '#c0392b' : 'inherit'}">${fmtH(h.unplanned_h)}</td>
                                <td>${fmtH(h.planned_down_h)}</td>
                                <td>${fmtH(h.run_h)}</td>
                            </tr>`;}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            ${ag ? `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">🔧 Maintenance history (Agility)</span>
                    <span class="card-sub">${ag.period_label || ''}</span>
                </div>
                <div class="kpi-grid" style="margin-bottom:14px">
                    <div class="kpi-card" style="border-left-color:#c0392b">
                        <div class="kpi-label">Annual Downtime</div>
                        <div class="kpi-value" style="color:#c0392b">${fmt1(ag.downtime_hrs)}h</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Breakdowns</div>
                        <div class="kpi-value">${ag.breakdown_count}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">TPM Visits</div>
                        <div class="kpi-value">${ag.tpm_count}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Labour Cost</div>
                        <div class="kpi-value">${fmtK(ag.cost_labour)}</div>
                    </div>
                    <div class="kpi-card" style="border-left-color:${mttrColor(mttr)}">
                        <div class="kpi-label">MTTR</div>
                        <div class="kpi-value" style="color:${mttrColor(mttr)}">${mttr}h</div>
                        <div class="kpi-sub">mean time to repair · target &lt;4h</div>
                    </div>
                    <div class="kpi-card" style="border-left-color:${mtbfColor(mtbf)}">
                        <div class="kpi-label">MTBF</div>
                        <div class="kpi-value" style="color:${mtbfColor(mtbf)}">${mtbf > 0 ? mtbf + 'h' : '—'}</div>
                        <div class="kpi-sub">mean time between failures · target &gt;200h</div>
                    </div>
                </div>
                ${agBds.length
                    ? agBds.map(b => renderBreakdownCard(b)).join('')
                    : '<p style="color:#aaa;font-size:13px">No significant breakdowns recorded</p>'}
            </div>` : ''}
            ${agTpmJobs2.length ? `
            <div class="card" style="margin-top:12px;">
                <div class="card-header"><span class="card-title">✅ PPM History (planned visits)</span></div>
                ${agTpmJobs2.map(t => `
                <div class="breakdown-card" style="border-left-color:#27ae60;">
                    <div class="bd-hrs" style="color:#27ae60;">PPM</div>
                    <div class="bd-info">
                        <div class="bd-desc">${t.desc}</div>
                        <div class="bd-meta">WO: ${t.wo} &nbsp;·&nbsp; Labour: ${t.labour_hrs}h &nbsp;·&nbsp; Cost: ${fmtK(t.cost_labour)}</div>
                    </div>
                </div>`).join('')}
            </div>` : ''}
        `;

    } else if (d.type === 'maint') {
        const rawBds = Array.isArray(d.breakdowns) ? d.breakdowns : JSON.parse(d.breakdowns || '[]');
        const bds = groupSimilarBreakdowns(rawBds);
        const mttr = calcMTTR(d.downtime_hrs, d.breakdown_count);

        el.innerHTML = `
            <div class="detail-header">
                <div>
                    <div class="detail-name">${d.name}</div>
                    <div class="detail-sub">Agility code: ${d.code} &nbsp;·&nbsp; ${d.period_label || ''}</div>
                </div>
                <div class="detail-stats">
                    <div class="detail-stat">
                        <div class="val" style="color:#c0392b">${fmt1(d.downtime_hrs)}h</div>
                        <div class="lbl">Downtime</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val">${d.breakdown_count}</div>
                        <div class="lbl">Breakdowns</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val">${d.tpm_count}</div>
                        <div class="lbl">TPM Visits</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val">${fmtK(d.cost_labour)}</div>
                        <div class="lbl">Labour Cost</div>
                    </div>
                    <div class="detail-stat">
                        <div class="val" style="color:${mttrColor(mttr)}">${mttr}h</div>
                        <div class="lbl">MTTR</div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><span class="card-title">Breakdown history (unplanned only)</span></div>
                ${bds.length
                ? bds.map(b => renderBreakdownCard(b)).join('')
                : '<p style="color:#aaa;font-size:13px">No breakdown downtime recorded</p>'}
            </div>`;
    }
}

function sparkBars(history) {
    const target = state.wcTarget || 65;
    const bars = history.map(h => {
        const oee  = +h.oee  || 0;
        const avail = +h.avail || 0;
        const barH = Math.max((avail / 100) * 60, avail > 0 ? 4 : 2);
        const col  = avail >= target ? '#27ae60'
                   : avail >= target * 0.9 ? '#e67e22' : '#c0392b';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="font-size:10px;color:#888">${fmt1(avail)}%</div>
            <div style="width:100%;height:${barH}px;background:${avail > 0 ? col : '#eee'};border-radius:3px 3px 0 0;"></div>
            <div style="font-size:10px;color:#888">${h.week}</div>
        </div>`;
    }).join('');
    return `<div style="display:flex;gap:8px;align-items:flex-end;height:90px;padding:0 4px">${bars}</div>`;
}