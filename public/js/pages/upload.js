// ── public/js/pages/upload.js ─────────────────────────────────────────────────

function setAgilityMode(mode) {
  const picker     = document.getElementById('agilityMonthPicker');
  const btnAnnual  = document.getElementById('agilityModeAnnual');
  const btnMonthly = document.getElementById('agilityModeMonthly');
  if (picker)     picker.style.display    = mode === 'monthly' ? 'block' : 'none';
  if (btnAnnual)  btnAnnual.style.fontWeight  = mode === 'annual'  ? '700' : '400';
  if (btnMonthly) btnMonthly.style.fontWeight = mode === 'monthly' ? '700' : '400';
}

// ── Upload SFC ────────────────────────────────────────────────────────────────
async function uploadSFC() {
  const fileInput = document.getElementById('sfcFile');
  const weekLabelEl = document.getElementById('sfcWeekLabel');
  const statusEl    = document.getElementById('sfcStatus');

  function setStatus(msg, color) {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  }

  if (!fileInput || !fileInput.files.length) {
    setStatus('⚠️ Please select an SFC file first.', '#e67e22'); return;
  }

  const files = Array.from(fileInput.files);

  // Multi-file: auto-detect week label from filename
  if (files.length > 1) {
    setStatus(`⏳ Uploading ${files.length} files...`, '#243547');
    let ok = 0, fail = 0;
    for (const file of files) {
      const match = file.name.match(/[Ww][Kk]?\s*(\d+)/);
      const label = match ? 'Wk' + match[1] : file.name.replace(/\.[^.]+$/, '');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('week_label', label);
      try {
        const res  = await fetch('/api/upload/sfc', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) ok++; else fail++;
      } catch { fail++; }
    }
    setStatus(`✅ Done: ${ok} uploaded, ${fail} failed.`, fail ? '#c0392b' : '#27ae60');
    fileInput.value = '';
    if (typeof loadDashboard === 'function') loadDashboard();
    return;
  }

  // Single file: use week label field
  const weekLabel = weekLabelEl ? weekLabelEl.value.trim() : '';
  if (!weekLabel) {
    setStatus('⚠️ Please enter a week label (e.g. Wk18).', '#e67e22'); return;
  }

  setStatus('⏳ Uploading SFC data...', '#243547');
  const fd = new FormData();
  fd.append('file', files[0]);
  fd.append('week_label', weekLabel);

  try {
    const res  = await fetch('/api/upload/sfc', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      setStatus(`✅ Uploaded ${data.machines} machines for ${data.week}.`, '#27ae60');
      fileInput.value = '';
      if (typeof loadDashboard === 'function') loadDashboard();
    } else {
      setStatus('❌ Error: ' + (data.error || 'Unknown error'), '#c0392b');
    }
  } catch (err) {
    setStatus('❌ Network error: ' + err.message, '#c0392b');
  }
}

// ── Upload Agility ────────────────────────────────────────────────────────────
async function uploadAgility() {
  const fileInput  = document.getElementById('agilityFile');
  const monthInput = document.getElementById('agilityMonth');
  const statusEl   = document.getElementById('agilityStatus');

  function setStatus(msg, color) {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  }

  if (!fileInput || !fileInput.files.length) {
    setStatus('⚠️ Please select an Agility file first.', '#e67e22'); return;
  }

  // Build period label
  let periodLabel = 'Annual';
  const picker = document.getElementById('agilityMonthPicker');
  if (picker && picker.style.display !== 'none' && monthInput && monthInput.value) {
    const [yr, mo] = monthInput.value.split('-');
    const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    periodLabel    = months[parseInt(mo) - 1] + ' ' + yr;
  }

  setStatus('⏳ Uploading Agility data...', '#243547');
  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  fd.append('period_label', periodLabel);

  try {
    const res  = await fetch('/api/upload/agility', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      setStatus(`✅ Uploaded ${data.machines} machines for ${data.period}.`, '#27ae60');
      fileInput.value = '';
      if (typeof loadDashboard === 'function') loadDashboard();
    } else {
      setStatus('❌ Error: ' + (data.error || 'Unknown error'), '#c0392b');
    }
  } catch (err) {
    setStatus('❌ Network error: ' + err.message, '#c0392b');
  }
}

// ── Reset SFC ─────────────────────────────────────────────────────────────────
async function resetSFC() {
  if (!confirm('Reset ALL SFC data? This cannot be undone.')) return;
  const statusEl = document.getElementById('sfcResetStatus');
  try {
    const res  = await fetch('/api/upload/reset-sfc', { method: 'POST' });
    const data = await res.json();
    if (statusEl) {
      statusEl.textContent = data.success ? '✅ SFC data reset.' : '❌ ' + (data.error || 'Failed');
      statusEl.style.color = data.success ? '#27ae60' : '#c0392b';
    }
  } catch (err) {
    if (statusEl) { statusEl.textContent = '❌ ' + err.message; statusEl.style.color = '#c0392b'; }
  }
}

// ── Reset Agility ─────────────────────────────────────────────────────────────
async function resetAgility() {
  if (!confirm('Reset ALL Agility data? This cannot be undone.')) return;
  const statusEl = document.getElementById('agilityResetStatus');
  try {
    const res  = await fetch('/api/upload/reset-agility', { method: 'POST' });
    const data = await res.json();
    if (statusEl) {
      statusEl.textContent = data.success ? '✅ Agility data reset.' : '❌ ' + (data.error || 'Failed');
      statusEl.style.color = data.success ? '#27ae60' : '#c0392b';
    }
  } catch (err) {
    if (statusEl) { statusEl.textContent = '❌ ' + err.message; statusEl.style.color = '#c0392b'; }
  }
}
// ── Upload Due Date Performance ───────────────────────────────────────────────
async function uploadDueDate() {
  const fileInput = document.getElementById('dueDateFile');
  const statusEl  = document.getElementById('dueDateStatus');

  function setStatus(msg, color) {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; }
  }

  if (!fileInput || !fileInput.files.length) {
    setStatus('⚠️ Please select a file first.', '#e67e22'); return;
  }

  setStatus('⏳ Uploading Due Date Performance data...', '#243547');
  const fd = new FormData();
  fd.append('file', fileInput.files[0]);

  try {
    const res  = await fetch('/api/upload/due-date', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      setStatus(`✅ Uploaded ${data.rows} records.`, '#27ae60');
      fileInput.value = '';
      await loadAllData();
    } else {
      setStatus('❌ Error: ' + (data.error || 'Unknown error'), '#c0392b');
    }
  } catch (err) {
    setStatus('❌ Network error: ' + err.message, '#c0392b');
  }
}

// ── Reset Due Date ────────────────────────────────────────────────────────────
async function resetDueDate() {
  if (!confirm('Reset Due Date Performance data? This cannot be undone.')) return;
  const statusEl = document.getElementById('dueDateResetStatus');
  try {
    const res  = await fetch('/api/upload/reset-due-date', { method: 'POST' });
    const data = await res.json();
    if (statusEl) {
      statusEl.textContent = data.success ? '✅ Due Date data reset.' : '❌ ' + (data.error || 'Failed');
      statusEl.style.color = data.success ? '#27ae60' : '#c0392b';
    }
  } catch (err) {
    if (statusEl) { statusEl.textContent = '❌ ' + err.message; statusEl.style.color = '#c0392b'; }
  }
}
// ── Load / Save Machine Mapping ───────────────────────────────────────────────
async function loadMachineMapping() {
  const statusEl = document.getElementById('mappingStatus');
  try {
    const res  = await fetch('/api/upload/machine-mapping');
    const data = await res.json();
    state.machineMapping = data.mappings || [];

    const tbody = document.getElementById('machineMappingBody');
    if (!tbody) return;

    const agilityNames = data.agilityNames || [];
    const sfcNames     = data.sfcNames || [];

    if (!agilityNames.length) {
      tbody.innerHTML = `<tr><td colspan="3" style="padding:16px;color:#aaa;text-align:center">No Agility machines found — upload Agility data first</td></tr>`;
      return;
    }

    const sfcOptions = ['<option value="">— not mapped —</option>',
      ...sfcNames.map(n => `<option value="${n}">${n}</option>`)
    ].join('');

    tbody.innerHTML = agilityNames.map(ag => {
      const mapped = state.machineMapping.find(m => m.agility_name === ag)?.sfc_name || '';
      const opts   = sfcNames.map(n =>
        `<option value="${n}" ${n === mapped ? 'selected' : ''}>${n}</option>`
      ).join('');
      return `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 14px;font-size:13px;color:#243547;">${ag}</td>
        <td style="padding:10px 14px;text-align:center;color:#aaa;">→</td>
        <td style="padding:10px 14px;">
          <select data-agility="${ag}"
            style="width:100%;border:1px solid #ddd;border-radius:6px;padding:6px 10px;font-size:13px">
            <option value="">— not mapped —</option>
            ${opts}
          </select>
        </td>
      </tr>`;
    }).join('');

    if (statusEl) { statusEl.textContent = '✅ Loaded'; statusEl.style.color = '#27ae60'; }
  } catch (err) {
    if (statusEl) { statusEl.textContent = '❌ ' + err.message; statusEl.style.color = '#c0392b'; }
  }
}

async function saveMachineMapping() {
  const statusEl = document.getElementById('mappingStatus');
  const selects  = document.querySelectorAll('#machineMappingBody select');
  const mappings = Array.from(selects).map(s => ({
    agility_name: s.dataset.agility,
    sfc_name: s.value || null
  }));
  try {
    const res  = await fetch('/api/upload/machine-mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings })
    });
    const data = await res.json();
    if (data.success) {
      state.machineMapping = mappings;
      if (statusEl) { statusEl.textContent = `✅ Saved ${data.saved} mappings`; statusEl.style.color = '#27ae60'; }
    } else {
      if (statusEl) { statusEl.textContent = '❌ ' + (data.error || 'Failed'); statusEl.style.color = '#c0392b'; }
    }
  } catch (err) {
    if (statusEl) { statusEl.textContent = '❌ ' + err.message; statusEl.style.color = '#c0392b'; }
  }
}
