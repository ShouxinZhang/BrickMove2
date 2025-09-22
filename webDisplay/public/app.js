const dropZone = document.getElementById('dropZone');
const pickFileButton = document.getElementById('pickFile');
const fileInput = document.getElementById('fileInput');
const statusLine = document.getElementById('statusLine');
const entryPicker = document.getElementById('entryPicker');
const entrySelect = document.getElementById('entrySelect');
const prevEntryButton = document.getElementById('prevEntry');
const nextEntryButton = document.getElementById('nextEntry');
const entryPosition = document.getElementById('entryPosition');
const mathStatement = document.getElementById('mathStatement');
const mathProof = document.getElementById('mathProof');
const leanCode = document.getElementById('leanCode');
const openVsCodeButton = document.getElementById('openVsCode');
const openVsCodeLink = document.getElementById('openVsCodeLink');
const copyStatementButton = document.getElementById('copyStatement');
const copyProofButton = document.getElementById('copyProof');
const copyLeanButton = document.getElementById('copyLean');

const state = {
  fileName: '',
  entries: [],
  leanInfo: new Map(),
  selectedId: null,
  selectedIndex: 0,
  stream: null,
  currentLeanText: '',
};

const STATUS_TIMEOUT = 6000;
let statusTimeout;

pickFileButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const [file] = fileInput.files;
  if (file) {
    handleFile(file);
    fileInput.value = '';
  }
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragover');
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    handleFile(file);
  }
});

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

entrySelect.addEventListener('change', () => {
  const entryId = entrySelect.value;
  if (entryId) {
    selectEntry(entryId);
  }
});

prevEntryButton.addEventListener('click', () => {
  if (state.selectedIndex > 0) {
    const previous = state.entries[state.selectedIndex - 1];
    if (previous) {
      selectEntry(previous.id);
    }
  }
});

nextEntryButton.addEventListener('click', () => {
  if (state.selectedIndex < state.entries.length - 1) {
    const next = state.entries[state.selectedIndex + 1];
    if (next) {
      selectEntry(next.id);
    }
  }
});

copyStatementButton?.addEventListener('click', async () => {
  const entry = state.entries[state.selectedIndex];
  if (!entry) {
    setStatus('No entry selected.', true);
    return;
  }
  const stmt = (entry.data.informal_statement || '').trim();
  if (!stmt) {
    setStatus('No statement to copy.', true);
    return;
  }
  try {
    await copyTextToClipboard(stmt);
    // No success notice by request
  } catch (_) {
    setStatus('Copy failed.', true);
  }
});

copyProofButton?.addEventListener('click', async () => {
  const entry = state.entries[state.selectedIndex];
  if (!entry) {
    setStatus('No entry selected.', true);
    return;
  }
  const proof = (entry.data.informal_proof || '').trim();
  if (!proof) {
    setStatus('No proof to copy.', true);
    return;
  }
  try {
    await copyTextToClipboard(proof);
    // No success notice by request
  } catch (_) {
    setStatus('Copy failed.', true);
  }
});

copyLeanButton?.addEventListener('click', async () => {
  const text = state.currentLeanText || '';
  if (!text.trim()) {
    setStatus('No Lean code to copy.', true);
    return;
  }
  try {
    await copyTextToClipboard(text);
    setStatus('Copied Lean to clipboard.');
  } catch (_) {
    setStatus('Copy failed.', true);
  }
});

openVsCodeButton.addEventListener('click', async () => {
  const info = state.leanInfo.get(state.selectedId);
  if (!info) return;

  const uri = info.vscodeUri;
  const absPath = info.absPath;
  if (!uri && !absPath) return;

  // Try protocol handler first (best-effort)
  if (uri) {
    try {
      openVsCodeLink.href = uri;
      openVsCodeLink.click();
    } catch (_) {}
  }

  // Fallback via server after a brief delay; avoids duplicate opens on systems
  // where protocol handler succeeds but we cannot detect it.
  if (absPath) {
    setTimeout(async () => {
      try {
        const res = await fetch('/api/open-in-vscode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: absPath }),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(text || 'Failed to open in VS Code');
        // If server returns JSON with error/ok, attempt to parse it for message.
        try {
          const data = JSON.parse(text || '{}');
          if (data && data.error) throw new Error(data.error);
        } catch (_) {}
        setStatus('Opened file in VS Code.');
      } catch (err) {
        console.error('Open in VS Code failed', err);
        const msg = err && err.message ? err.message : 'Could not open in VS Code.';
        setStatus(msg, true);
      }
    }, 500);
  }
});

async function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.json')) {
    setStatus('Please provide a .json file.', true);
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const entries = Array.isArray(parsed) ? parsed : [parsed];

    if (!entries.length) {
      setStatus('No entries found in JSON file.', true);
      return;
    }

    state.fileName = file.name;
    state.entries = entries.map((entry, index) => ({
      id: stringId(entry.id, index + 1),
      data: entry,
    }));
    state.selectedIndex = 0;

    const persisted = await persistLeanFiles(file.name, entries);
    if (!persisted) {
      return;
    }

    populateEntryPicker();
    const firstEntryId = state.entries[0]?.id;
    if (firstEntryId) {
      selectEntry(firstEntryId);
    }
  } catch (error) {
    console.error('Failed to read JSON', error);
    setStatus('Unable to parse JSON file.', true);
  }
}

async function persistLeanFiles(fileName, entries) {
  try {
    const response = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, entries }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Server rejected import');
    }

    const { leanFiles } = await response.json();
    state.leanInfo.clear();
    leanFiles.forEach((info, index) => {
      const entry = state.entries[index];
      if (entry) {
        state.leanInfo.set(entry.id, info);
      }
    });

    const entryCount = state.entries.length;
    setStatus(`Imported ${entryCount} entr${entryCount === 1 ? 'y' : 'ies'} from ${fileName}.`);
    return true;
  } catch (error) {
    console.error('Import request failed', error);
    setStatus('Failed to create Lean cache files.', true);
    return false;
  }
}

function populateEntryPicker() {
  entrySelect.innerHTML = '';

  state.entries.forEach((entry, index) => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = buildOptionLabel(entry, index);
    entrySelect.appendChild(option);
  });

  entryPicker.hidden = state.entries.length === 0;
  if (state.entries.length > 0) {
    state.selectedIndex = Math.min(state.selectedIndex, state.entries.length - 1);
    entrySelect.value = state.entries[state.selectedIndex]?.id || state.entries[0].id;
  }

  updateNavigation();
}

function selectEntry(entryId) {
  const entry = state.entries.find((candidate) => candidate.id === entryId);
  if (!entry) {
    return;
  }

  state.selectedId = entryId;
  const index = state.entries.findIndex((candidate) => candidate.id === entryId);
  state.selectedIndex = index >= 0 ? index : 0;
  entrySelect.value = entryId;

  renderMarkdown(entry.data.informal_statement || '', mathStatement);
  renderMarkdown(entry.data.informal_proof || '', mathProof);

  const leanDetails = state.leanInfo.get(entryId);
  const relativePath = leanDetails?.relativeLeanPath;

  openVsCodeButton.disabled = !leanDetails?.vscodeUri;
  if (leanDetails?.vscodeUri) {
    openVsCodeButton.dataset.vscodeUri = leanDetails.vscodeUri;
    openVsCodeLink.href = leanDetails.vscodeUri;
  } else {
    delete openVsCodeButton.dataset.vscodeUri;
    openVsCodeLink.removeAttribute('href');
  }

  connectLeanStream(relativePath);
  updateNavigation();
}

function connectLeanStream(relativePath) {
  if (state.stream) {
    state.stream.close();
    state.stream = null;
  }

  if (!relativePath) {
    renderLeanCode('');
    state.currentLeanText = '';
    if (copyLeanButton) copyLeanButton.disabled = true;
    return;
  }

  renderLeanCode('Loading Lean file…');
  if (copyLeanButton) copyLeanButton.disabled = true;
  const stream = new EventSource(`/api/stream?file=${encodeURIComponent(relativePath)}`);
  state.stream = stream;

  stream.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.error) {
        renderLeanCode(payload.error);
        if (copyLeanButton) copyLeanButton.disabled = true;
      } else if (typeof payload.content === 'string') {
        state.currentLeanText = payload.content;
        renderLeanCode(payload.content);
        if (copyLeanButton) copyLeanButton.disabled = !payload.content;
      }
    } catch (error) {
      console.error('Stream payload parse failure', error);
    }
  };

  stream.onerror = () => {
    setStatus('Lost connection to Lean file updates.', true);
    stream.close();
    state.stream = null;
  };
}

function renderMarkdown(source, target) {
  const text = typeof source === 'string' ? source.trim() : '';
  if (!text) {
    target.innerHTML = '<p class="muted">No content.</p>';
    typeset(target);
    return;
  }

  const lines = text.split(/\r?\n/);
  const htmlParts = [];
  let inList = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      htmlParts.push('<p></p>');
      return;
    }

    if (/^[-*] +/.test(trimmed)) {
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      const listItem = trimmed.replace(/^[-*] +/, '');
      htmlParts.push(`<li>${formatInline(listItem)}</li>`);
      return;
    }

    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }

    htmlParts.push(`<p>${formatInline(trimmed)}</p>`);
  });

  if (inList) {
    htmlParts.push('</ul>');
  }

  target.innerHTML = htmlParts
    .join('')
    .replace(/<p><\/p>/g, '<p class="spacer"></p>');

  // Try to typeset LaTeX if MathJax is available
  typeset(target);
}

function formatInline(text) {
  const escaped = escapeHtml(text)
    .replace(/\\\\/g, '<br />');

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLeanCode(text) {
  const source = typeof text === 'string' ? text : '';
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const html = lines
    .map((line) => {
      const escaped = escapeHtml(line).replace(/\t/g, '    ');
      return `<span class="line"><span class="ln"></span><span class="lc">${escaped || '&nbsp;'}</span></span>`;
    })
    .join('');
  leanCode.innerHTML = html;
}

function buildOptionLabel(entry, index) {
  const raw = entry.data.informal_statement || '';
  const summary = String(raw)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  const prefix = `#${index + 1}`;
  if (!summary) {
    return `${prefix} — id ${entry.id}`;
  }
  return `${prefix} — ${summary}${summary.length >= 80 ? '…' : ''}`;
}

function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle('error', Boolean(isError));

  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }

  if (!isError) {
    statusTimeout = window.setTimeout(() => {
      statusLine.textContent = '';
    }, STATUS_TIMEOUT);
  }
}

function stringId(value, fallback) {
  if (value === undefined || value === null) {
    return String(fallback);
  }
  return String(value);
}

window.addEventListener('beforeunload', () => {
  if (state.stream) {
    state.stream.close();
  }
});

function typeset(element) {
  const mj = window.MathJax;
  if (mj && typeof mj.typesetPromise === 'function') {
    // Defer to allow DOM to paint before typesetting
    Promise.resolve().then(() => mj.typesetPromise([element])).catch(() => {});
  }
}

function updateNavigation() {
  const total = state.entries.length;
  const index = Math.max(0, Math.min(state.selectedIndex, total - 1));

  if (total === 0) {
    entryPosition.textContent = '0 / 0';
    prevEntryButton.disabled = true;
    nextEntryButton.disabled = true;
    return;
  }

  entryPosition.textContent = `${index + 1} / ${total}`;
  prevEntryButton.disabled = index <= 0;
  nextEntryButton.disabled = index >= total - 1;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}
