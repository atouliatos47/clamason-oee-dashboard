// app.js - Main application router and initialization

function showPage(page, param = null, anchor = null) {
    // Redirect old page names to new dept structure
    if (page === 'oee') { showDept('maintenance', 'oee'); return; }
    if (page === 'kpi') { showDept('maintenance', 'kpi'); return; }

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
    } else if (page === 'detail' && param) {
        renderDetail(param);
        const detailPage = document.getElementById('page-detail');
        if (detailPage) detailPage.classList.add('active');
    }

    if (anchor) {
        setTimeout(() => {
            const el = document.getElementById(anchor);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function showDept(dept, sub = null) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="'${dept}'"]`);
    if (activeNav) activeNav.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const target = document.getElementById('page-' + dept);
    if (target) target.classList.add('active');

    const defaultSub = sub || 'oee';
    showSub(dept, defaultSub);
}

function showSub(dept, sub) {
    document.querySelectorAll(`#page-${dept} .sub-page`).forEach(p => p.classList.remove('active'));
    document.querySelectorAll(`#page-${dept} .sub-tab`).forEach(t => t.classList.remove('active'));

    const activeSub = document.getElementById(`${dept}-${sub}`);
    const activeSubTab = document.getElementById(`${dept}-tab-${sub}`);
    if (activeSub) activeSub.classList.add('active');
    if (activeSubTab) activeSubTab.classList.add('active');

    // Call render functions for maintenance sub-pages
    if (dept === 'maintenance') {
        if (sub === 'oee') renderOEEPage();
        else if (sub === 'maint') renderMaintPage();
        else if (sub === 'kpi') renderKPIBoard();
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
