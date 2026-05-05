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
