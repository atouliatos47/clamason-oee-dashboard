// state.js - Central state management

const state = {
    currentWeek: null,
    weeks: [],
    oeeData: {},
    maintData: [],
    sortOEECol: 'unplanned_h',
    sortOEEDir: -1,
    sortMaintCol: 'downtime_hrs',
    sortMaintDir: -1,
    maintTrends: []
};

// Helper function to load all data from server
async function loadAllData() {
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        
        state.weeks = data.weeks || [];
        state.oeeData = data.oeeData || {};
        state.maintData = data.maintData || [];
        
        if (state.weeks.length > 0) {
            state.currentWeek = state.weeks[state.weeks.length - 1];
        }

        // Load monthly trend data
        try {
            const trendRes = await fetch('/api/maintenance/trends');
            state.maintTrends = trendRes.ok ? await trendRes.json() : [];
        } catch(e) {
            state.maintTrends = [];
        }
        
        renderDashboard();
        if (document.getElementById('oeeTableBody')) renderOEETable();
        if (document.getElementById('maintTableBody')) renderMaintPage();
        
    } catch (err) {
        console.error('Failed to load data:', err);
        showToast('Failed to load data', 'error');
    }
}