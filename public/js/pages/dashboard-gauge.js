// dashboard-gauge.js — Home page gauge and trend chart helpers

function drawHomeGauge(canvas, pct, color) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr) || 160;
    canvas.height = Math.round(rect.height * dpr) || 100;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const w = rect.width || 160, h = rect.height || 100;
    const cx = w / 2, cy = h - 8, r = Math.min(w, h * 1.9) / 2 - 8;

    // Background arc
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();

    // Value arc
    const angle = Math.PI + (Math.min(pct, 100) / 100) * Math.PI;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, angle, false);
    ctx.strokeStyle = color; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();

    // Tick mark at end of arc
    const nx = cx + r * Math.cos(angle), ny = cy + r * Math.sin(angle);
    const tx = cx + (r - 8) * Math.cos(angle), ty = cy + (r - 8) * Math.sin(angle);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(nx, ny);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
}

function drawHomeTrend(last6wks, trendOEE, trendAvail) {
    const tc = document.getElementById('homeTrend');
    if (!tc) return;

    const rect = tc.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    tc.width = Math.round(rect.width * dpr) || 360;
    tc.height = Math.round(rect.height * dpr) || 100;

    const ctx = tc.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width || 360, H = rect.height || 100, pad = 22;
    ctx.clearRect(0, 0, W, H);

    if (last6wks.length < 2) {
        ctx.fillStyle = '#aaa'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
        ctx.fillText('Upload at least 2 weeks of data', W / 2, H / 2);
        return;
    }

    function px(i) { return pad + i * (W - pad * 2) / (last6wks.length - 1); }
    function py(v) { return H - pad - (v - 20) / (100 - 20) * (H - pad * 2); }

    [[trendAvail, '#243547'], [trendOEE, '#95C11F']].forEach(([vals, color]) => {
        ctx.beginPath();
        vals.forEach((v, i) => { i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)); });
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
        vals.forEach((v, i) => {
            ctx.beginPath(); ctx.arc(px(i), py(v), 3.5, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
        });
    });

    // Value labels on last point
    const lastOEE = trendOEE[trendOEE.length - 1];
    const lastAvail = trendAvail[trendAvail.length - 1];
    ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#95C11F';
    ctx.fillText(fmt1(lastOEE) + '%', px(last6wks.length - 1), py(lastOEE) - 7);
    ctx.fillStyle = '#243547';
    ctx.fillText(fmt1(lastAvail) + '%', px(last6wks.length - 1), py(lastAvail) - 7);

    // Week labels
    last6wks.forEach((w, i) => {
        ctx.fillStyle = '#555';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(w).replace('Wk ', 'Wk'), px(i), H - 4);
    });
}