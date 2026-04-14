// utils.js - Shared helper functions

function fmt1(num) {
    if (num === undefined || num === null) return '—';
    return Number(num).toFixed(1);
}

function fmtH(hours) {
    if (hours === undefined || hours === null) return '—';
    return Math.round(hours).toLocaleString() + 'h';
}

function fmtN(num) {
    if (num === undefined || num === null) return '—';
    return Math.round(num).toLocaleString();
}

function fmtK(num) {
    if (num === undefined || num === null) return '—';
    return num >= 1000 ? '£' + (num/1000).toFixed(1) + 'k' : '£' + Math.round(num);
}

function oeeColor(oee) {
    const val = +oee;
    if (val >= 85) return '#27ae60';
    if (val >= 70) return '#e6b800';
    if (val >= 50) return '#e67e22';
    if (val > 0) return '#c0392b';
    return '#ccc';
}

function oeeBadgeClass(oee) {
    const val = +oee;
    if (val >= 85) return 'badge-good';
    if (val >= 70) return 'badge-ok';
    if (val >= 50) return 'badge-low';
    if (val > 0) return 'badge-poor';
    return 'badge-none';
}

function dtBadgeClass(dt) {
    const val = +dt;
    if (val >= 500) return 'badge-critical';
    if (val >= 200) return 'badge-high';
    if (val >= 50) return 'badge-medium';
    if (val > 0) return 'badge-low';
    return 'badge-none';
}

function emptyState(msg) {
    return `<div class="empty-state"><div class="es-icon">📭</div><h3>${msg}</h3></div>`;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.className = 'toast';
        document.body.appendChild(newToast);
    }
    const toastEl = document.getElementById('toast');
    toastEl.textContent = message;
    toastEl.className = `toast toast-${type} show`;
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

function getWeekOptions() {
    return state.weeks.map(w => `<option value="${w}">${w}</option>`).join('');
}

function formatDate(date) {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}