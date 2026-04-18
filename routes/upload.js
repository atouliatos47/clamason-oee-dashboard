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

    // Single file with no label — auto-extract week number from filename
    if (files.length === 1 && !weekLabel) {
        const match = files[0].name.match(/(\d+)/);
        if (match) {
            weekLabel = `Wk ${match[1]}`;
        } else {
            status.style.color = '#c0392b';
            status.textContent = '❌ Could not detect week from filename — please enter a label';
            return;
        }
    }

    const btn = document.querySelector('button[onclick="uploadSFC()"]');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    status.style.color = '#888';
    status.textContent = `Uploading ${files.length} file(s)...`;

    let uploaded = 0;
    const errors = [];

    for (const file of Array.from(files)) {
        let label = weekLabel;
        if (files.length > 1) {
            const match = file.name.match(/(\d+)/);
            label = match ? `Wk ${match[1]}` : file.name.replace(/\.[^.]+$/, '');
        }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('week_label', label);
        try {
            const res = await fetch('/api/upload/sfc', { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            uploaded++;
            status.textContent = `Uploading... (${uploaded}/${files.length}) — ${label} done`;
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
