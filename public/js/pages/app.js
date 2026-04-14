// app.js - Main application router and initialization

function showPage(page, param = null) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
    // Show selected page
    const target = document.getElementById(page + 'Page');
    if (target) target.style.display = 'block';
    
    // Render page content
    if (page === 'dashboard') {
        renderDashboard();
    } else if (page === 'oee') {
        renderOEEPage();
    } else if (page === 'maintenance') {
        renderMaintPage();
    } else if (page === 'detail' && param) {
        renderDetail(param);
        document.getElementById('detailPage').style.display = 'block';
    } else if (page === 'upload') {
        // Reset file inputs
        document.getElementById('sfcFile').value = '';
        document.getElementById('agilityFile').value = '';
        sfcFile = null;
        agilityFile = null;
        document.getElementById('sfcFileName').textContent = 'or click to browse';
        document.getElementById('agilityFileName').textContent = 'or click to browse';
        document.getElementById('sfcUploadBtn').disabled = true;
        document.getElementById('agilityUploadBtn').disabled = true;
    }
}

// Initialize application
async function init() {
    await loadAllData();
    
    // Setup navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.dataset.page;
            if (page) showPage(page);
        });
    });
    
    // Show dashboard by default
    showPage('dashboard');
}

// Start the app
init();