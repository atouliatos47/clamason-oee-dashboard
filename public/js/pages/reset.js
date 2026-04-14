// reset.js - Reset all data

async function resetAllData() {
    if (!confirm('⚠️ This will delete ALL OEE and Agility data. Are you sure?')) return;
    const status = document.getElementById('resetStatus');
    status.textContent = 'Resetting...';
    try {
        const res = await fetch('/api/upload/reset', { method: 'POST' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        status.style.color = '#27ae60';
        status.textContent = '✅ All data cleared — ready for fresh upload';
        state.weeks = [];
        state.oeeData = {};
        state.maintData = [];
        renderDashboard();
        showToast('✅ All data cleared', 'success');
    } catch (err) {
        status.style.color = '#c0392b';
        status.textContent = '❌ ' + err.message;
    }
}