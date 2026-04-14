// ═══════════════════ STATE ═══════════════════
const state = {
  currentPage:   'dashboard',
  previousPage:  'dashboard',
  currentWeek:   null,
  weeks:         [],
  oeeData:       {},   // { weekLabel: [rows] }
  maintData:     [],
  sortOEECol:    'oee',  sortOEEDir: -1,
  sortMaintCol:  'downtime_hrs', sortMaintDir: -1,
  selectedMachine: null,
};

// ═══════════════════ HELPERS ═══════════════════
function fmt1(v)  { return isNaN(+v) ? '—' : Number(v).toFixed(1); }
function fmtH(h)  { const hh=Math.floor(+h||0), mm=Math.round(((+h||0)-hh)*60); return `${hh}:${String(mm).padStart(2,'0')}`; }
function fmtK(v)  { return +v>=1000 ? `£${(+v/1000).toFixed(1)}k` : `£${Math.round(+v)}`; }
function fmtN(v)  { return (+v||0).toLocaleString(); }

function oeeColor(v) {
  if (+v>=85) return '#27ae60';
  if (+v>=70) return '#95C11F';
  if (+v>=50) return '#e67e22';
  if (+v>0)   return '#c0392b';
  return '#ccc';
}
function oeeBadgeClass(v) {
  if (+v>=85) return 'badge-green';
  if (+v>=70) return 'badge-lime';
  if (+v>=50) return 'badge-amber';
  if (+v>0)   return 'badge-red';
  return 'badge-grey';
}
function dtBadgeClass(v) {
  if (+v>=200) return 'badge-red';
  if (+v>=50)  return 'badge-amber';
  if (+v>0)    return 'badge-lime';
  return 'badge-grey';
}

// ═══════════════════ NAVIGATION ═══════════════════
function showPage(name, machineData) {
  state.previousPage = state.currentPage;
  state.currentPage  = name;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');

  const ni = document.querySelector(`.nav-item[onclick*="${name}"]`);
  if (ni) ni.classList.add('active');

  if (name === 'detail' && machineData) {
    state.selectedMachine = machineData;
    renderDetail(machineData);
  }
  if (name === 'dashboard') renderDashboard();
  if (name === 'oee')         renderOEEPage();
  if (name === 'maintenance') renderMaintPage();
}

function goBack() {
  showPage(state.previousPage === 'detail' ? 'dashboard' : state.previousPage);
}

// ═══════════════════ TOAST ═══════════════════
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ═══════════════════ API CALLS ═══════════════════
async function api(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadAllData() {
  try {
    // Load OEE weeks
    const weeks = await api('/api/oee/weeks');
    state.weeks = weeks;
    if (weeks.length) {
      state.currentWeek = weeks[weeks.length - 1]; // latest
      for (const wk of weeks) {
        const data = await api(`/api/oee/${encodeURIComponent(wk)}`);
        state.oeeData[wk] = data;
      }
    }
    // Load maintenance data
    state.maintData = await api('/api/maintenance/all');
  } catch (err) {
    console.error('Load error:', err);
    showToast('Could not load data from server', 'error');
  }
  renderDashboard();
}

// ═══════════════════ REGISTER SW ═══════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('SW registered'))
    .catch(e => console.warn('SW failed:', e));
}

// ═══════════════════ INIT ═══════════════════
window.addEventListener('DOMContentLoaded', loadAllData);
