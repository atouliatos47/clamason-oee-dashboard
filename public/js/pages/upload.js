// ── public/js/pages/upload.js ─────────────────────────────────────────────────
// Browser-side upload handler for SFC and Agility files

function showUploadStatus(id, msg, type = 'info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'upload-status ' + type;
  el.style.display = 'block';
}

function hideUploadStatus(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ── Upload SFC ────────────────────────────────────────────────────────────────
async function uploadSFC() {
  const fileInput = document.getElementById('sfc-file');
  const weekLabel = document.getElementById('sfc-week-label')
    ? document.getElementById('sfc-week-label').value.trim()
    : (document.getElementById('sfc-week') ? document.getElementById('sfc-week').value.trim() : '');

  if (!fileInput || !fileInput.files.length) {
    showUploadStatus('sfc-status', '⚠️ Please select an SFC file first.', 'warning');
    return;
  }
  if (!weekLabel) {
    showUploadStatus('sfc-status', '⚠️ Please enter a week label (e.g. Wk18).', 'warning');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('week_label', weekLabel);

  showUploadStatus('sfc-status', '⏳ Uploading SFC data...', 'info');

  try {
    const res = await fetch('/api/upload/sfc', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showUploadStatus('sfc-status', `✅ Uploaded ${data.machines} machines for ${data.week}.`, 'success');
      fileInput.value = '';
      // Refresh dashboard if available
      if (typeof loadDashboard === 'function') loadDashboard();
    } else {
      showUploadStatus('sfc-status', '❌ Error: ' + (data.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    showUploadStatus('sfc-status', '❌ Network error: ' + err.message, 'error');
  }
}

// ── Upload Agility ────────────────────────────────────────────────────────────
async function uploadAgility() {
  const fileInput = document.getElementById('agility-file');
  const periodLabel = document.getElementById('agility-period-label')
    ? document.getElementById('agility-period-label').value.trim()
    : (document.getElementById('agility-period') ? document.getElementById('agility-period').value.trim() : '');

  if (!fileInput || !fileInput.files.length) {
    showUploadStatus('agility-status', '⚠️ Please select an Agility file first.', 'warning');
    return;
  }
  if (!periodLabel) {
    showUploadStatus('agility-status', '⚠️ Please enter a period label (e.g. Apr 2026).', 'warning');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('period_label', periodLabel);

  showUploadStatus('agility-status', '⏳ Uploading Agility data...', 'info');

  try {
    const res = await fetch('/api/upload/agility', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showUploadStatus('agility-status', `✅ Uploaded ${data.machines} machines for ${data.period}.`, 'success');
      fileInput.value = '';
      if (typeof loadDashboard === 'function') loadDashboard();
    } else {
      showUploadStatus('agility-status', '❌ Error: ' + (data.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    showUploadStatus('agility-status', '❌ Network error: ' + err.message, 'error');
  }
}

// ── Reset functions ───────────────────────────────────────────────────────────
async function resetSFC() {
  if (!confirm('Reset ALL SFC data? This cannot be undone.')) return;
  try {
    const res = await fetch('/api/upload/reset-sfc', { method: 'POST' });
    const data = await res.json();
    if (data.success) showUploadStatus('sfc-status', '✅ SFC data reset.', 'success');
    else showUploadStatus('sfc-status', '❌ Reset failed: ' + (data.error || ''), 'error');
  } catch (err) {
    showUploadStatus('sfc-status', '❌ ' + err.message, 'error');
  }
}

async function resetAgility() {
  if (!confirm('Reset ALL Agility data? This cannot be undone.')) return;
  try {
    const res = await fetch('/api/upload/reset-agility', { method: 'POST' });
    const data = await res.json();
    if (data.success) showUploadStatus('agility-status', '✅ Agility data reset.', 'success');
    else showUploadStatus('agility-status', '❌ Reset failed: ' + (data.error || ''), 'error');
  } catch (err) {
    showUploadStatus('agility-status', '❌ ' + err.message, 'error');
  }
}
