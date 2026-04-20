// upload.js - File upload functionality

let sfcFile = null;
let agilityFile = null;

function handleSFCFile(input) {
    sfcFile = input.files[0];
    document.getElementById('sfcFileName').textContent = sfcFile ? sfcFile.name : 'or click to browse';
    document.getElementById('sfcUploadBtn').disabled = !sfcFile;
}

function handleAgilityFile(input) {
    agilityFile = input.files[0];
    document.getElementById('agilityFileName').textContent = agilityFile ? agilityFile.name : 'or click to browse';
    document.getElementById('agilityUploadBtn').disabled = !agilityFile;
}

async function uploadSFC() {
    let weekLabel = document.getElementById('sfcWeekLabel').value.trim(); // let not const
    const fileInput = document.getElementById('sfcFile');
    const files = fileInput ? fileInput.files : null;
    const status = document.getElementById('sfcStatus');

    if (!files || files.length === 0) {
        status.style.color = '#c0392b';
        status.textContent = '❌ Please select at least one file';
        return;
    }

    // Single file with no label — let backend auto-detect from file dates
    // (no filename parsing — just send it through)

    const btn = document.querySelector('button[onclick="uploadSFC()"]');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    status.style.color = '#888';
    status.textContent = `Uploading ${files.length} file(s)...`;

    let uploaded = 0;
    const errors = [];

    for (const file of Array.from(files)) {
        let label = weekLabel;
        if (files.length > 1 && !label) {
            // Try filename first, fall back to backend auto-detect (empty string)
            const match = file.name.match(/(\d+)/);
            if (match) label = `Wk ${match[1]}`;
        }
        const fd = new FormData();
        fd.append('file', file);
        if (label) fd.append('week_label', label);
        try {
            const res = await fetch('/api/upload/sfc', { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            uploaded++;
            const shownLabel = label || json.week || '(auto)';
            status.textContent = `Uploading... (${uploaded}/${files.length}) — ${shownLabel} done`;
        } catch (err) {
            errors.push(`${file.name}: ${err.message}`);
        }
    }

    btn.disabled = false;
    btn.textContent = 'Upload SFC Data';
    fileInput.value = '';

    if (errors.length) {
        status.style.color = '#c0392b';
        status.textContent = '❌ ' + errors.join(' | ');
    } else {
        status.style.color = '#27ae60';
        status.textContent = `✅ ${uploaded} week(s) uploaded successfully`;
        showToast(`✅ ${uploaded} SFC week(s) uploaded`, 'success');
        await loadAllData();
    }
}

async function uploadAgility() {
    const fileInput = document.getElementById('agilityFile');
    const file = fileInput.files[0];
    const status = document.getElementById('agilityStatus');

    if (!file) { showToast('Please select a file', 'error'); return; }

    const now = new Date();
    const from = new Date(now.getFullYear() - 1, now.getMonth());
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const periodLabel = `${months[from.getMonth()]} ${from.getFullYear()} - ${months[now.getMonth()]} ${now.getFullYear()}`;

    const btn = document.querySelector('button[onclick="uploadAgility()"]');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    status.style.color = '#888';
    status.textContent = `Uploading as "${periodLabel}"...`;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('period_label', periodLabel);

    try {
        const res = await fetch('/api/upload/agility', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        status.style.color = '#27ae60';
        status.textContent = `✅ ${json.machines} machines uploaded (${periodLabel})`;
        showToast(`✅ Agility uploaded — ${json.machines} machines`, 'success');
        fileInput.value = '';
        await loadAllData();
    } catch (err) {
        status.style.color = '#c0392b';
        status.textContent = '❌ ' + err.message;
        showToast('❌ ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Agility Data';
    }
}

// Drag and drop handlers
['sfcDropZone','agilityDropZone'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (id === 'sfcDropZone') {
            sfcFile = file;
            document.getElementById('sfcFileName').textContent = file.name;
            document.getElementById('sfcUploadBtn').disabled = false;
        } else {
            agilityFile = file;
            document.getElementById('agilityFileName').textContent = file.name;
            document.getElementById('agilityUploadBtn').disabled = false;
        }
    });
});

// ── MACHINE MAPPING ───────────────────────────────────────────────────────────
async function loadMachineMapping() {
    const el = document.getElementById('machineMappingBody');
    if (!el) return;

    // Build lists from state (already loaded in browser — no extra API call)
    const agilityNames = [...new Set((state.maintData || []).map(m => m.name).filter(Boolean))].sort();
    const sfcNames = [...new Set(
        Object.values(state.oeeData || {}).flatMap(wk => wk.map(m => m.machine))
    )].filter(Boolean).sort();

    if (!agilityNames.length) {
        el.innerHTML = '<tr><td colspan="3" style="padding:16px;color:#aaa;text-align:center">Upload Agility data first to see machines here</td></tr>';
        return;
    }

    // Load saved mappings from API (best effort)
    let savedMappings = {};
    try {
        const res = await fetch('/api/upload/machine-mapping');
        if (res.ok) {
            const data = await res.json();
            (data.mappings || []).forEach(m => { savedMappings[m.agility_name] = m.sfc_name || ''; });
        }
    } catch(e) { /* show empty dropdowns if API fails */ }

    el.innerHTML = agilityNames.map(name => {
        const currentSfc = savedMappings[name] || '';
        const opts = `<option value="">— Not in SFC —</option>` +
            sfcNames.map(s => `<option value="${s}" ${s === currentSfc ? 'selected' : ''}>${s}</option>`).join('');
        return `<tr style="border-bottom:1px solid #f0f0f0">
            <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#243547">${name}</td>
            <td style="padding:10px 14px;font-size:13px;color:#888">→</td>
            <td style="padding:10px 14px">
                <select data-agility="${name.replace(/"/g,'&quot;')}"
                    style="width:100%;border:1px solid #ddd;border-radius:6px;padding:5px 8px;font-size:13px;color:#243547;background:#fff">
                    ${opts}
                </select>
            </td>
        </tr>`;
    }).join('');

    state.machineMapping = Object.entries(savedMappings)
        .map(([k,v]) => ({agility_name: k, sfc_name: v}));
}

async function saveMachineMapping() {
    const rows = document.querySelectorAll('#machineMappingBody select');
    const mappings = Array.from(rows).map(sel => ({
        agility_name: sel.dataset.agility,
        sfc_name: sel.value || null,
    }));
    const btn = document.getElementById('saveMappingBtn');
    const status = document.getElementById('mappingStatus');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        const res = await fetch('/api/upload/machine-mapping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mappings }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        // Update state for immediate use
        state.machineMapping = mappings.filter(m => m.sfc_name);
        status.style.color = '#27ae60';
        status.textContent = `✅ ${json.saved} mappings saved`;
        showToast('✅ Machine mappings saved', 'success');
    } catch (err) {
        status.style.color = '#c0392b';
        status.textContent = '❌ ' + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Mappings';
    }
}
