// app.js - Main application router and initialization

function showPage(page, param = null) {
    // Track previous page for back button
    const currentActive = document.querySelector('.page.active');
    if (currentActive) {
        const currentId = currentActive.id.replace('page-', '');
        if (currentId !== page && currentId !== 'detail') {
            state.prevPage = currentId;
        }
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="'${page}'"]`);
    if (activeNav) activeNav.classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show selected page
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    // Render page content
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
    }
}

function goBack() {
    showPage(state.prevPage || 'dashboard');
}

async function init() {
    await loadAllData();
    showPage('dashboard');
}

init();