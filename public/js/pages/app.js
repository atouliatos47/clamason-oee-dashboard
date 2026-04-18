// app.js - Main application router and initialization

function showPage(page, param = null) {
    const currentActive = document.querySelector('.page.active');
    if (currentActive) {
        const currentId = currentActive.id.replace('page-', '');
        if (currentId !== page && currentId !== 'detail') {
            state.prevPage = currentId;
        }
    }

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="'${page}'"]`);
    if (activeNav) activeNav.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    if (page === 'dashboard') {
        renderDashboard();
    } else if (page === 'oee') {
        renderOEEPage();
    } else if (page === 'maintenance') {
        renderMaintPage();
    } else if (page === 'detail' && param) {
        renderDetail(param);
        const detailPage = document.getElementById('page-detail');
        if (detailPage) detailPage.classList.add('active');
    } else if (page === 'kpi') {
        renderKPIBoard();
    } else if (page === 'upload') {
        loadMachineMapping();
    }
}

function goBack() {
    showPage(state.prevPage || 'dashboard');
}

async function init() {
    // Load saved availability target from KPI Board settings
    try {
        const saved = localStorage.getItem('clamason_kpi_targets');
        if (saved) {
            const targets = JSON.parse(saved);
            if (targets?.avail?.value) state.wcTarget = targets.avail.value;
        }
    } catch(e) {}

    await loadAllData();

    // Load machine mapping into state
    try {
        const res = await fetch('/api/upload/machine-mapping');
        const data = await res.json();
        state.machineMapping = data.mappings || [];
    } catch(e) {
        state.machineMapping = [];
    }

    showPage('dashboard');
}

init();
