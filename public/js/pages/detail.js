// detail.js - Machine detail view

function renderDetail(d) {
    const el = document.getElementById('detailContent');

    if (d.type === 'oee' || d.type === 'trend') {
        const history = state.weeks.map(w => {
            const row = (state.oeeData[w]||[]).find(x=>x.machine===d.machine);
            return { week: w, ...(row||{}) };
        });
        const latest = history.filter(h=>+h.oee>0).pop() || {};
        const bds = sparkBars(history);

        const MAPPING = {
            'Kaiser 50T 1':'00029','Kaiser 50T 2':'00030',
            'HME 20T A ISI23':'00025','HME 20T C ISI22':'00024',
            'Chin Fong 110 ISI1':'00009','Chin Fong 110 ISI74':'00044',
            'Bruderer 60T ISI73':'00043',
        };
        const agCode = MAPPING[d.machine];
        const ag = agCode ? state.maintData.find(m=>m.code===agCode) : null;
        const agBds = ag ? (Array.isArray(ag.breakdowns)?ag.breakdowns:JSON.parse(ag.breakdowns||'[]')) : [];

        el.innerHTML = `
            <div class="detail-header">
                <div>
                    <div class="detail-name">${d.machine}</div>
                    <div class="detail-sub">OEE Performance — ${state.weeks.join(', ')}</div>
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
                <div class="card-header"><span class="card-title">Weekly OEE trend</span></div>
                <div style="margin-bottom:16px">${bds}</div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Week</th><th>OEE %</th><th>Avail %</th><th>Perf %</th><th>Quality %</th><th>Unplanned h</th><th>Parts</th></tr></thead>
                        <tbody>${history.map(h=>`<tr>
                            <td style="font-weight:700">${h.week}</td>
                            <td><span class="badge ${oeeBadgeClass(h.oee)}">${fmt1(h.oee)}%</span></td>
                            <td>${fmt1(h.avail)}%</td><td>${fmt1(h.perf)}%</td><td>${fmt1(h.quality)}%</td>
                            <td style="color:${+h.unplanned_h>20?'#c0392b':'inherit'}">${fmtH(h.unplanned_h)}</td>
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
                <div class="kpi-grid" style="margin-bottom:14px">
                    <div class="kpi-card" style="border-left-color:#c0392b"><div class="kpi-label">Annual Downtime</div><div class="kpi-value" style="color:#c0392b">${fmt1(ag.downtime_hrs)}h</div></div>
                    <div class="kpi-card"><div class="kpi-label">Breakdowns</div><div class="kpi-value">${ag.breakdown_count}</div></div>
                    <div class="kpi-card"><div class="kpi-label">TPM Visits</div><div class="kpi-value">${ag.tpm_count}</div></div>
                    <div class="kpi-card"><div class="kpi-label">Labour Cost</div><div class="kpi-value">${fmtK(ag.cost_labour)}</div></div>
                </div>
                ${agBds.length ? agBds.map(b=>`
                    <div class="breakdown-card">
                        <div class="bd-hrs">${b.downtime_hrs}h</div>
                        <div class="bd-info">
                            <div class="bd-desc">${b.desc}</div>
                            <div class="bd-meta">WO: ${b.wo} &nbsp;·&nbsp; Labour: ${b.labour_hrs}h &nbsp;·&nbsp; Cost: ${fmtK(b.cost_labour)}</div>
                        </div>
                    </div>`).join('') : '<p style="color:#aaa;font-size:13px">No significant breakdowns recorded</p>'}
            </div>` : ''}
        `;
    } else if (d.type === 'maint') {
        const bds = Array.isArray(d.breakdowns) ? d.breakdowns : JSON.parse(d.breakdowns||'[]');
        el.innerHTML = `
            <div class="detail-header">
                <div>
                    <div class="detail-name">${d.name}</div>
                    <div class="detail-sub">Agility code: ${d.code} &nbsp;·&nbsp; ${d.period_label||''}</div>
                </div>
                <div class="detail-stats">
                    <div class="detail-stat"><div class="val" style="color:#c0392b">${fmt1(d.downtime_hrs)}h</div><div class="lbl">Downtime</div></div>
                    <div class="detail-stat"><div class="val">${d.breakdown_count}</div><div class="lbl">Breakdowns</div></div>
                    <div class="detail-stat"><div class="val">${d.tpm_count}</div><div class="lbl">TPM Visits</div></div>
                    <div class="detail-stat"><div class="val">${fmtK(d.cost_labour)}</div><div class="lbl">Labour Cost</div></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><span class="card-title">Breakdown history</span></div>
                ${bds.length ? bds.map(b=>`
                    <div class="breakdown-card">
                        <div class="bd-hrs">${b.downtime_hrs}h</div>
                        <div class="bd-info">
                            <div class="bd-desc">${b.desc}</div>
                            <div class="bd-meta">WO: ${b.wo} &nbsp;·&nbsp; Labour: ${b.labour_hrs}h &nbsp;·&nbsp; Cost: ${fmtK(b.cost_labour)}</div>
                        </div>
                    </div>`).join('') : '<p style="color:#aaa;font-size:13px">No breakdown downtime recorded</p>'}
            </div>`;
    }
}

function sparkBars(history) {
    const bars = history.map(h => {
        const v = +h.oee||0;
        const col = oeeColor(v);
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="font-size:10px;color:#888">${fmt1(v)}%</div>
            <div style="flex:1;width:100%;background:${v>0?col:'#eee'};border-radius:3px 3px 0 0;min-height:4px;max-height:60px;height:${Math.max((v/100)*60,4)}px"></div>
            <div style="font-size:10px;color:#888">${h.week}</div>
        </div>`;
    }).join('');
    return `<div style="display:flex;gap:8px;align-items:flex-end;height:80px;padding:0 4px">${bars}</div>`;
}