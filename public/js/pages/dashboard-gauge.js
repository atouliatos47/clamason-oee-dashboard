// dashboard-gauge.js — Home page gauge and trend chart helpers

function drawHomeGauge(canvas, pct, color) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h - 10, r = Math.min(w, h * 1.9) / 2 - 10;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
    const angle = Math.PI + (Math.min(pct, 100) / 100) * Math.PI;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, angle, false);
    ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.stroke();
    const nx = cx + r * Math.cos(angle), ny = cy + r * Math.sin(angle);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
}

function drawHomeTrend(last6wks, trendOEE, trendAvail) {
    const tc = document.getElementById('homeTrend');
    if (!tc) return;
    const ctx = tc.getContext('2d');
    const W = tc.width, H = tc.height, pad = 20;
    tc.width = tc.offsetWidth * window.devicePixelRatio || 360;
    tc.height = 100 * window.devicePixelRatio || 100;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const W = tc.offsetWidth || 360, H = 100, pad = 20;
    ctx.clearRect(0, 0, W, H);

    if (last6wks.length < 2) {
        ctx.fillStyle = '#aaa'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
        ctx.fillText('Upload at least 2 weeks of data', W / 2, H / 2);
        return;
    }

    function px(i) { return pad + i * (W - pad * 2) / (last6wks.length - 1); }
    function py(v)  { return H - pad - (v - 20) / (100 - 20) * (H - pad * 2); }

    [[trendAvail, '#243547'], [trendOEE, '#95C11F']].forEach(([vals, color]) => {
        ctx.beginPath();
        vals.forEach((v, i) => { i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)); });
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        vals.forEach((v, i) => {
            ctx.beginPath(); ctx.arc(px(i), py(v), 3, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
        });
    });

    const lastOEE   = trendOEE[trendOEE.length - 1];
    const lastAvail = trendAvail[trendAvail.length - 1];
    ctx.font = '9px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#95C11F';
    ctx.fillText(fmt1(lastOEE) + '%', px(last6wks.length - 1), py(lastOEE) - 6);
    ctx.fillStyle = '#243547';
    ctx.fillText(fmt1(lastAvail) + '%', px(last6wks.length - 1), py(lastAvail) - 6);

    last6wks.forEach((w, i) => {
        ctx.fillStyle = '#aaa'; ctx.font = '9px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(w).replace('Wk ', 'W'), px(i), H - 4);
    });
}
