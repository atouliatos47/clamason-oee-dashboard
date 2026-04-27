// reset.js - Protected reset functions for SFC and Agility data

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

function adminAuth() {
    const user = prompt('Username:');
    if (!user) return false;
    const pass = prompt('Password:');
    if (!pass) return false;
    if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
        showToast('❌ Invalid credentials', 'error');
        return false;
    }
    return true;
}

async function resetSFC() {
    if (!confirm('Reset ALL SFC / OEE data?\nThis cannot be undone.')) return;
    if (!adminAuth()) return;

    const status = document.getElementById('sfcResetStatus');
    status.style.color = '#888';
    status.textContent = 'Resetting SFC data...';

    try {
        const res  = await fetch('/api/upload/reset-sfc', { method: 'POST' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        status.style.color = '#27ae60';
        status.textContent = '✅ SFC data cleared';
        state.weeks = [];
        state.oeeData = {};
        state.currentWeek = null;
        renderDashboard();
        showToast('✅ SFC data cleared', 'success');
    } catch (err) {
        status.style.color = '#c0392b';
        status.textContent = '❌ ' + err.message;
    }
}

async function resetAgility() {
    if (!confirm('Reset ALL Agility maintenance data?\nThis cannot be undone.')) return;
    if (!adminAuth()) return;

    const status = document.getElementById('agilityResetStatus');
    status.style.color = '#888';
    status.textContent = 'Resetting Agility data...';

    try {
        const res  = await fetch('/api/upload/reset-agility', { method: 'POST' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        status.style.color = '#27ae60';
        status.textContent = '✅ Agility data cleared';
        state.maintData = [];
        renderDashboard();
        showToast('✅ Agility data cleared', 'success');
    } catch (err) {
        status.style.color = '#c0392b';
        status.textContent = '❌ ' + err.message;
    }
}
