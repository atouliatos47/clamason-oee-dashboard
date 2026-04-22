// fives.js – 5S Audit page

const FIVES_CATEGORIES = [
  {
    key: 'sort',
    label: 'Sort',
    color: '#e74c3c',
    questions: [
      'Are all unserviceable items removed from the immediate work environment?',
      'Are all inadequate raw materials, semi finished products and/or waste properly disposed of and away from the immediate work environment?',
      'Are all unused tools, spare parts and/or materials properly stored away from the immediate work environment?',
      'Are all frequently used objects sorted, arranged, stored and labelled?',
      'Does the current inventory or in-process inventory reflect only required materials and/or parts?'
    ]
  },
  {
    key: 'straighten',
    label: 'Straighten',
    color: '#e67e22',
    questions: [
      'Are all access aisles, storage areas, working places and equipment clearly marked and defined?',
      'Are all electronic files organised in an efficient, easy to find data/file system?',
      'Are all tools, devices and instruments properly organised in regular or special designated areas?',
      'Are all fire extinguishers, walkways and exits clear of obstacles?',
      'Are all shelves labelled for item location, quantities and weight (if applicable)?'
    ]
  },
  {
    key: 'shine',
    label: 'Shine',
    color: '#f1c40f',
    questions: [
      'Are all tools/equipment clean and properly stored/shutdown on a daily basis?',
      'Are all machines, workstations, floors, walls and surfaces clean, free from clutter and properly maintained?',
      'Is all lighting within the office/shopfloor environment clean and in working order?',
      'Are designated work areas properly marked within the office/shopfloor?',
      'Is cleaning completed daily and recorded on a cleaning check sheet?'
    ]
  },
  {
    key: 'standardise',
    label: 'Standardise',
    color: '#27ae60',
    questions: [
      'Do all workplace areas have adequate lighting and/or ventilation?',
      'Do all employees actively participate in continuous improvement efforts (5S Team, ideas boards, root cause for variation, safety workshops, updated on Standard Work etc.)?',
      'Are all 5S standard procedures written, clear and actively used?',
      'Are all 5S Standards reviewed to create clear improvement plans for work areas?',
      'Is there a documented process in place to ensure unnecessary items do not "creep" back into the work area?'
    ]
  },
  {
    key: 'sustain',
    label: 'Sustain',
    color: '#2980b9',
    questions: [
      'Is a daily cleaning check sheet in place and up-to-date?',
      'Are all cleaning/maintenance reports completed and on file?',
      'Have Sort-Straighten-Shine-Standardise been fully implemented and functioning well? Are past audits posted and used for improvement?',
      'Have all employees been adequately trained in 5S standard procedures?',
      'Are all 5S procedures up-to date and regularly reviewed?'
    ]
  }
];

// In-memory answers for the active form
let fivesAnswers = {};
let fivesAudits  = [];
let fivesView    = 'list'; // 'list' | 'form' | 'detail'
let fivesDetail  = null;

function initFivesAnswers() {
  fivesAnswers = {};
  for (const cat of FIVES_CATEGORIES) {
    fivesAnswers[cat.key] = cat.questions.map(() => ({ answer: null, obs: '' }));
  }
}

function fivesScore(answers) {
  let yes = 0;
  for (const cat of FIVES_CATEGORIES) {
    const items = (answers || {})[cat.key] || [];
    for (const item of items) {
      if (item.answer === true) yes++;
    }
  }
  return +(yes * 0.2).toFixed(2);
}

function fivesCatScore(answers, key) {
  const items = (answers || {})[key] || [];
  let yes = 0;
  for (const item of items) {
    if (item.answer === true) yes++;
  }
  return +(yes * 0.2).toFixed(2);
}

function fivesScoreClass(score, max) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return 'fives-good';
  if (pct >= 0.6) return 'fives-ok';
  if (pct >= 0.4) return 'fives-low';
  return 'fives-poor';
}

function renderFivesPage() {
  const container = document.getElementById('page-fives');
  if (!container) return;
  if (fivesView === 'form') {
    container.innerHTML = renderFivesForm();
  } else if (fivesView === 'detail' && fivesDetail) {
    container.innerHTML = renderFivesDetail(fivesDetail);
  } else {
    container.innerHTML = renderFivesList();
  }
}

// ── LIST VIEW ─────────────────────────────────────────────────────────────
function renderFivesList() {
  const rows = fivesAudits.map(a => {
    const sc = +a.total_score;
    const cls = fivesScoreClass(sc, 5);
    const d = a.audit_date ? a.audit_date.slice(0,10) : '—';
    return `
      <tr>
        <td>${d}</td>
        <td>${a.bms_number || '—'}</td>
        <td>${a.area || '—'}</td>
        <td>${a.auditor || '—'}</td>
        <td><span class="fives-score-badge ${cls}">${sc.toFixed(1)} / 5.0</span></td>
        <td>
          <button class="btn-sm btn-outline" onclick="fivesOpenDetail(${a.id})">View</button>
          <button class="btn-sm btn-danger" onclick="fivesDelete(${a.id})">Delete</button>
        </td>
      </tr>`;
  }).join('');

  const empty = fivesAudits.length === 0
    ? `<tr><td colspan="6" style="text-align:center;padding:32px;color:#888;">No audits yet — click New Audit to start</td></tr>`
    : '';

  return `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div>
        <h2 style="color:var(--navy);font-size:20px;">5S Audit History</h2>
        <p style="color:#666;font-size:13px;margin-top:4px;">25 criteria · each Yes = 0.2 pts · max 5.0</p>
      </div>
      <button class="btn-primary" onclick="fivesNewAudit()">+ New Audit</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="fives-table">
        <thead>
          <tr>
            <th>Date</th><th>BMS #</th><th>Area</th><th>Auditor</th><th>Score</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}${empty}</tbody>
      </table>
    </div>`;
}

// ── FORM VIEW ─────────────────────────────────────────────────────────────
function renderFivesForm() {
  const today = new Date().toISOString().slice(0, 10);
  const sections = FIVES_CATEGORIES.map((cat, ci) => {
    const score = fivesCatScore(fivesAnswers, cat.key);
    const questions = cat.questions.map((q, qi) => {
      const item  = fivesAnswers[cat.key][qi];
      const yYes  = item.answer === true  ? 'fives-btn-active fives-btn-yes' : '';
      const yNo   = item.answer === false ? 'fives-btn-active fives-btn-no'  : '';
      return `
        <div class="fives-question">
          <div class="fives-q-row">
            <span class="fives-q-num">${qi + 1}</span>
            <span class="fives-q-text">${q}</span>
            <div class="fives-yn">
              <button class="fives-btn ${yYes}" onclick="fivesSetAnswer(${ci},${qi},true)">Yes</button>
              <button class="fives-btn ${yNo}"  onclick="fivesSetAnswer(${ci},${qi},false)">No</button>
            </div>
          </div>
          <div class="fives-obs-row">
            <textarea class="fives-obs" placeholder="Observations / comments / improvement suggestions…"
              onchange="fivesSetObs(${ci},${qi},this.value)">${item.obs}</textarea>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="fives-section" style="--cat-color:${cat.color}">
        <div class="fives-section-header">
          <span class="fives-section-title">${cat.label}</span>
          <span class="fives-section-score ${fivesScoreClass(score, 1)}">${score.toFixed(1)} / 1.0</span>
        </div>
        ${questions}
      </div>`;
  }).join('');

  const total = fivesScore(fivesAnswers);

  return `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div>
        <h2 style="color:var(--navy);font-size:20px;">New 5S Audit</h2>
        <p style="color:#666;font-size:13px;margin-top:4px;">Answer all 25 criteria then submit</p>
      </div>
      <button class="btn-outline" onclick="fivesCancelForm()">← Back</button>
    </div>

    <div class="card" style="padding:16px;margin-bottom:16px;">
      <div class="fives-meta-grid">
        <label>BMS #<input id="fives-bms" type="text" class="fives-input" placeholder="e.g. BMS-001"></label>
        <label>Auditor<input id="fives-auditor" type="text" class="fives-input" placeholder="Name"></label>
        <label>Area / Department<input id="fives-area" type="text" class="fives-input" placeholder="e.g. Shop Floor"></label>
        <label>Date<input id="fives-date" type="date" class="fives-input" value="${today}"></label>
      </div>
    </div>

    <div id="fives-score-bar" class="fives-score-bar">
      <span>Total Score</span>
      <span id="fives-live-score" class="fives-score-big ${fivesScoreClass(total, 5)}">${total.toFixed(1)} / 5.0</span>
    </div>

    ${sections}

    <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-bottom:40px;">
      <button class="btn-outline" onclick="fivesCancelForm()">Cancel</button>
      <button class="btn-primary" onclick="fivesSubmit()">Submit Audit</button>
    </div>`;
}

// ── DETAIL VIEW ────────────────────────────────────────────────────────────
function renderFivesDetail(audit) {
  const answers = audit.answers || {};
  const sections = FIVES_CATEGORIES.map(cat => {
    const score = fivesCatScore(answers, cat.key);
    const items = (answers[cat.key] || []).map((item, qi) => {
      const ans = item.answer === true ? '<span class="fives-yes-tag">Yes</span>'
                : item.answer === false ? '<span class="fives-no-tag">No</span>'
                : '<span style="color:#aaa">—</span>';
      return `
        <div class="fives-question fives-readonly">
          <div class="fives-q-row">
            <span class="fives-q-num">${qi + 1}</span>
            <span class="fives-q-text">${cat.questions[qi]}</span>
            <div class="fives-yn">${ans}</div>
          </div>
          ${item.obs ? `<div class="fives-obs-display">${item.obs}</div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="fives-section" style="--cat-color:${cat.color}">
        <div class="fives-section-header">
          <span class="fives-section-title">${cat.label}</span>
          <span class="fives-section-score ${fivesScoreClass(score, 1)}">${score.toFixed(1)} / 1.0</span>
        </div>
        ${items}
      </div>`;
  }).join('');

  const total = +audit.total_score;
  const d = audit.audit_date ? audit.audit_date.slice(0,10) : '—';

  return `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div>
        <h2 style="color:var(--navy);font-size:20px;">5S Audit — ${d}</h2>
        <p style="color:#666;font-size:13px;margin-top:4px;">${audit.area || ''} ${audit.auditor ? '· ' + audit.auditor : ''} ${audit.bms_number ? '· BMS ' + audit.bms_number : ''}</p>
      </div>
      <button class="btn-outline" onclick="fivesBackToList()">← Back</button>
    </div>

    <div class="fives-score-bar" style="margin-bottom:16px;">
      <span>Total Score</span>
      <span class="fives-score-big ${fivesScoreClass(total, 5)}">${total.toFixed(1)} / 5.0</span>
    </div>

    ${sections}
    <div style="padding-bottom:40px;"></div>`;
}

// ── EVENT HANDLERS ────────────────────────────────────────────────────────
function fivesNewAudit() {
  initFivesAnswers();
  fivesView = 'form';
  renderFivesPage();
}

function fivesCancelForm() {
  fivesView = 'list';
  renderFivesPage();
}

function fivesBackToList() {
  fivesView = 'list';
  fivesDetail = null;
  renderFivesPage();
}

function fivesSetAnswer(catIdx, qIdx, val) {
  const key = FIVES_CATEGORIES[catIdx].key;
  fivesAnswers[key][qIdx].answer = val;
  // Update just score bar + section score without full re-render (preserves textarea focus)
  updateFivesScores(catIdx);
}

function fivesSetObs(catIdx, qIdx, val) {
  const key = FIVES_CATEGORIES[catIdx].key;
  fivesAnswers[key][qIdx].obs = val;
}

function updateFivesScores(changedCatIdx) {
  // Update total
  const total = fivesScore(fivesAnswers);
  const scoreEl = document.getElementById('fives-live-score');
  if (scoreEl) {
    scoreEl.textContent = total.toFixed(1) + ' / 5.0';
    scoreEl.className = `fives-score-big ${fivesScoreClass(total, 5)}`;
  }

  // Update all Yes/No button states + section scores
  FIVES_CATEGORIES.forEach((cat, ci) => {
    const catScore = fivesCatScore(fivesAnswers, cat.key);
    cat.questions.forEach((_, qi) => {
      const item = fivesAnswers[cat.key][qi];
      const yesBtn = document.querySelector(`[onclick="fivesSetAnswer(${ci},${qi},true)"]`);
      const noBtn  = document.querySelector(`[onclick="fivesSetAnswer(${ci},${qi},false)"]`);
      if (yesBtn) {
        yesBtn.className = 'fives-btn' + (item.answer === true ? ' fives-btn-active fives-btn-yes' : '');
      }
      if (noBtn) {
        noBtn.className = 'fives-btn' + (item.answer === false ? ' fives-btn-active fives-btn-no' : '');
      }
    });
    // Update section score label (first span.fives-section-score in each section)
    const sections = document.querySelectorAll('.fives-section');
    if (sections[ci]) {
      const scoreSpan = sections[ci].querySelector('.fives-section-score');
      if (scoreSpan) {
        scoreSpan.textContent = catScore.toFixed(1) + ' / 1.0';
        scoreSpan.className = `fives-section-score ${fivesScoreClass(catScore, 1)}`;
      }
    }
  });
}

async function fivesSubmit() {
  const bms    = document.getElementById('fives-bms')?.value.trim() || '';
  const auditor = document.getElementById('fives-auditor')?.value.trim() || '';
  const area   = document.getElementById('fives-area')?.value.trim() || '';
  const date   = document.getElementById('fives-date')?.value || new Date().toISOString().slice(0,10);

  // Check at least one answer given
  const total = fivesScore(fivesAnswers);
  const answeredCount = FIVES_CATEGORIES.reduce((acc, cat) =>
    acc + fivesAnswers[cat.key].filter(i => i.answer !== null).length, 0);
  if (answeredCount === 0) {
    showToast('Please answer at least one question before submitting', 'error');
    return;
  }

  try {
    const res = await fetch('/api/fives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bms_number: bms, auditor, area, audit_date: date, answers: fivesAnswers })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    showToast(`Audit saved — Score: ${total.toFixed(1)} / 5.0`, 'success');
    await loadFivesAudits();
    fivesView = 'list';
    renderFivesPage();
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  }
}

async function fivesOpenDetail(id) {
  try {
    const res = await fetch(`/api/fives/${id}`);
    fivesDetail = await res.json();
    fivesView = 'detail';
    renderFivesPage();
  } catch (err) {
    showToast('Could not load audit', 'error');
  }
}

async function fivesDelete(id) {
  if (!confirm('Delete this audit?')) return;
  try {
    await fetch(`/api/fives/${id}`, { method: 'DELETE' });
    showToast('Audit deleted', 'info');
    await loadFivesAudits();
    renderFivesPage();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

async function loadFivesAudits() {
  try {
    const res = await fetch('/api/fives');
    fivesAudits = await res.json();
  } catch (e) {
    fivesAudits = [];
  }
}
