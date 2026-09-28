/* ═══════════════════════════════════════
   Wheel Lottery — main.js
   ═══════════════════════════════════════ */

/* ── Palette ── */
const PALETTE = [
  '#3db87a','#e85d75','#4a90d9','#f5a623',
  '#9b59b6','#2eccc7','#e67e22','#5dade2',
  '#e74c8b','#1abc9c','#d4ac0d','#8e44ad',
  '#27ae60','#e84393','#2980b9','#f39c12',
  '#16a085','#c0392b','#6c5ce7','#00b894',
  '#fd79a8','#0984e3','#fdcb6e','#6c5ce7',
];

/* ── State ── */
const STORAGE_KEY = 'lottery-wheel-state-v1';

function normalizeItems(values) {
  const seen = new Set();
  const normalized = [];
  (Array.isArray(values) ? values : []).forEach(value => {
    const text = String(typeof value === 'string' ? value : value?.text ?? '').trim().slice(0, 40);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    normalized.push({ text });
  });
  return normalized.length ? normalized : [{ text: '' }];
}

function loadSavedState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

const savedState = loadSavedState();
let items = normalizeItems(savedState.items);
let spinning = false;
let history = Array.isArray(savedState.history) ? savedState.history.slice(0, 40).map(String) : [];
let undoSnapshot = null;
let modalReturnFocus = null;

/* ── Canvas ── */
const canvas = document.getElementById('wheel');
const ctx    = canvas.getContext('2d');
const WHEEL_SIZE = 740;
const CX = WHEEL_SIZE / 2;
const CY = WHEEL_SIZE / 2;
const R  = CX - 10;
const wheelBuffer = document.createElement('canvas');
wheelBuffer.width = WHEEL_SIZE;
wheelBuffer.height = WHEEL_SIZE;
const bctx = wheelBuffer.getContext('2d');
let currentAngle = 0;

/* ═══════════════ WHEEL DRAW ══════════════ */
function getEligibleItems() { return items.filter(item => item.text.trim()); }

function drawWheel(rot, refresh = true) {
  if (refresh) renderWheelBase();
  ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(rot);
  ctx.drawImage(wheelBuffer, -CX, -CY);
  ctx.restore();
}

function renderWheelBase() {
  bctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);
  const texts = getEligibleItems().map(item => item.text);

  if (texts.length === 0) { drawEmpty(bctx); return; }

  const n     = texts.length;
  const slice = (2 * Math.PI) / n;

  texts.forEach((label, i) => {
    const a0 = i * slice;
    const a1 = a0 + slice;
    const col = PALETTE[i % PALETTE.length];

    /* Segment */
    bctx.beginPath();
    bctx.moveTo(CX, CY);
    bctx.arc(CX, CY, R, a0, a1);
    bctx.closePath();
    bctx.fillStyle = col;
    bctx.fill();
    bctx.strokeStyle = 'rgba(255,255,255,.5)';
    bctx.lineWidth = 2;
    bctx.stroke();

    /* Label — ชิดขอบ เหมือน wheelofnames */
    bctx.save();
    bctx.translate(CX, CY);
    bctx.rotate(a0 + slice / 2);

    // Clip to segment
    bctx.beginPath();
    bctx.moveTo(0, 0);
    bctx.arc(0, 0, R - 1, -slice / 2, slice / 2);
    bctx.closePath();
    bctx.clip();

    const capR   = 26;                 // รัศมี centre cap
    const innerR = capR + 4;          // เริ่มวาดข้อความหลัง cap
    const outerR = R - 6;             // สิ้นสุดก่อนขอบ
    const textLen = outerR - innerR;  // ความยาวพื้นที่วาดข้อความ

    // ความกว้างช่องที่กึ่งกลาง (สำหรับกำหนด font size)
    const midR = innerR + textLen * 0.5;
    const arcW = 2 * midR * Math.tan(slice / 2) * 0.78;

    // Font size: เหมาะกับความกว้างช่อง min 11 max 20
    const fs = Math.min(20, Math.max(11, Math.floor(arcW * 0.6)));
    bctx.font = `900 ${fs}px 'Kanit', sans-serif`;
    bctx.fillStyle = '#ffffff';
    bctx.textAlign = 'right';
    bctx.textBaseline = 'middle';
    bctx.strokeStyle = 'rgba(0,0,0,.5)';
    bctx.lineWidth = 3;
    bctx.lineJoin = 'round';
    bctx.shadowColor = 'rgba(0,0,0,.6)';
    bctx.shadowBlur  = 4;

    // Truncate ให้พอดีกับ textLen
    let txt = label;
    while (txt.length > 1 && bctx.measureText(txt).width > textLen) {
      txt = txt.slice(0, -1);
    }
    if (txt !== label) txt = txt.slice(0, -1) + '…';

    bctx.strokeText(txt, outerR, 0);
    bctx.shadowBlur = 0;
    bctx.fillText(txt, outerR, 0);
    bctx.restore();
  });

  /* Centre cap — white like wheelofnames */
  bctx.beginPath();
  bctx.arc(CX, CY, 26, 0, Math.PI * 2);
  bctx.fillStyle = '#ffffff';
  bctx.fill();
  bctx.strokeStyle = 'rgba(0,0,0,.15)';
  bctx.lineWidth = 2;
  bctx.stroke();
}

function drawEmpty(target = bctx) {
  target.beginPath();
  target.arc(CX, CY, R, 0, Math.PI * 2);
  target.strokeStyle = 'rgba(255,255,255,.07)';
  target.lineWidth = 2; target.setLineDash([10, 8]); target.stroke(); target.setLineDash([]);
  target.font = '600 14px Kanit, sans-serif';
  target.fillStyle = 'rgba(255,255,255,.2)';
  target.textAlign = 'center'; target.textBaseline = 'middle';
  target.fillText('เพิ่มรายการทางขวามือ', CX, CY);
}

function resizeWheelCanvas() {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width) return;
  const backingSize = Math.round(bounds.width * Math.min(window.devicePixelRatio || 1, 2));
  if (canvas.width !== backingSize || canvas.height !== backingSize) {
    canvas.width = backingSize;
    canvas.height = backingSize;
  }
  ctx.setTransform(backingSize / WHEEL_SIZE, 0, 0, backingSize / WHEEL_SIZE, 0, 0);
  drawWheel(currentAngle, false);
}

drawWheel(currentAngle);
new ResizeObserver(resizeWheelCanvas).observe(canvas);
window.addEventListener('resize', resizeWheelCanvas);

/* ═══════════════ SPIN ══════════════ */
function spinWheel() {
  if (spinning) return;
  const eligibleItems = getEligibleItems();
  if (eligibleItems.length < 2) { showToast('ต้องมีอย่างน้อย 2 รายการที่ไม่ว่าง'); return; }
  spinning = true;
  setEditorLocked(true);

  const btn = document.getElementById('spinBtn');
  btn.disabled = true;

  // ── Audio: stop ambient, start spin music ──
  if (audioEnabled) {
    const approxDuration = 4500;
    startSpinMusic(approxDuration / 1000);
  }

  const n          = eligibleItems.length;
  const winIdx     = Math.floor(Math.random() * n);
  const winner     = eligibleItems[winIdx].text;
  const sliceAngle = (2 * Math.PI) / n;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const extraSpins = (reducedMotion ? 1 : 5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;

  /* Target angle: winning slice centre lands at pointer (right = 0) */
  const targetAngle = -winIdx * sliceAngle - sliceAngle / 2;
  const offset = ((targetAngle - currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const totalDelta = extraSpins + offset;

  const duration  = reducedMotion ? 1000 : 4000 + Math.random() * 1000;
  const startAngle = currentAngle;
  let   startTime  = null;

  function ease(t) { return 1 - Math.pow(1 - t, 4); }

  function frame(ts) {
    if (!startTime) startTime = ts;
    const t = Math.min((ts - startTime) / duration, 1);
    currentAngle = startAngle + totalDelta * ease(t);
    drawWheel(currentAngle, false);
    if (t < 1) { requestAnimationFrame(frame); return; }
    currentAngle = startAngle + totalDelta;
    drawWheel(currentAngle, false);
    onSpinEnd(winner);
  }
  requestAnimationFrame(frame);
}

function onSpinEnd(winner) {
  triggerWinEffect();
  // ── Audio: stop spin music, play fanfare ──
  if (audioEnabled) {
    stopSpinMusic();
    setTimeout(() => playWinFanfare(), 200);
  }
  setTimeout(() => {
    document.getElementById('modalNumber').textContent = winner;
    modalReturnFocus = document.activeElement;
    const overlay = document.getElementById('modalOverlay');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show');
    document.querySelector('.modal').focus();
    addHistory(winner);
    spinning = false;
    document.getElementById('spinBtn').disabled = false;
    setEditorLocked(false);
  }, 350);
}

/* ═══════════════ MODAL ══════════════ */
function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}

function removeAndClose() {
  const winner = document.getElementById('modalNumber').textContent;
  const idx = items.findIndex(it => it.text === winner);
  if (idx !== -1) {
    rememberUndo();
    items.splice(idx, 1);
    if (!items.length) items.push({ text: '' });
    renderList();
    drawWheel(currentAngle);
    updateCount();
  }
  closeModal();
}

document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });
document.addEventListener('keydown', e => {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay.classList.contains('show')) return;
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
  if (e.key !== 'Tab') return;
  const controls = [...overlay.querySelectorAll('button:not(:disabled)')];
  const first = controls[0];
  const last = controls[controls.length - 1];
  const dialog = overlay.querySelector('.modal');
  if (document.activeElement === dialog) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

function setEditorLocked(locked) {
  document.querySelectorAll('.editor-col button, .editor-col input').forEach(control => {
    control.disabled = locked;
  });
  if (!locked) updateUndoButton();
}

function rememberUndo() {
  undoSnapshot = items.map(item => ({ text: item.text }));
  updateUndoButton();
}

function updateUndoButton() {
  const button = document.getElementById('undoBtn');
  if (button) button.disabled = !undoSnapshot || spinning;
}

function undoLastChange() {
  if (!undoSnapshot || spinning) return;
  items = undoSnapshot;
  undoSnapshot = null;
  renderList();
  drawWheel(currentAngle);
  updateCount();
  updateUndoButton();
}

/* ═══════════════ ENTRY LIST (wheelofnames style) ══════════════ */
function renderList() {
  const list = document.getElementById('entryList');
  list.innerHTML = '';

  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'entry-row';
    row.dataset.idx = i;

    /* Colour swatch */
    const sw = document.createElement('div');
    sw.className = 'entry-swatch';
    sw.style.background = PALETTE[i % PALETTE.length];

    /* Line number */
    const num = document.createElement('span');
    num.className = 'entry-num';
    num.textContent = i + 1;

    /* Editable text */
    const inp = document.createElement('input');
    inp.className = 'entry-input';
    inp.type  = 'text';
    inp.value = item.text;
    inp.placeholder = `รายการที่ ${i + 1}`;
    inp.maxLength = 40;
    let originalText = item.text;
    let editSnapshotTaken = false;
    inp.addEventListener('focus', () => { editSnapshotTaken = false; });
    inp.addEventListener('input', () => {
      if (!editSnapshotTaken) {
        rememberUndo();
        editSnapshotTaken = true;
      }
      items[i].text = inp.value;
      drawWheel(currentAngle);
      updateCount();
    });
    inp.addEventListener('blur', () => {
      const value = inp.value.trim();
      if (value && isDup(value, i)) {
        items[i].text = originalText;
        inp.value = originalText;
        showToast(`"${value}" มีอยู่แล้ว`);
      } else {
        items[i].text = value;
        inp.value = value;
        originalText = value;
      }
      drawWheel(currentAngle);
      updateCount();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        /* Insert new row below */
        rememberUndo();
        items.splice(i + 1, 0, { text: '' });
        renderList();
        drawWheel(currentAngle);
        updateCount();
        /* Focus next row */
        const rows = document.querySelectorAll('.entry-input');
        if (rows[i + 1]) rows[i + 1].focus();
      }
      if (e.key === 'Backspace' && inp.value === '' && items.length > 1) {
        e.preventDefault();
        if (!editSnapshotTaken) rememberUndo();
        items.splice(i, 1);
        renderList();
        drawWheel(currentAngle);
        updateCount();
        const rows = document.querySelectorAll('.entry-input');
        const target = rows[Math.max(0, i - 1)];
        if (target) { target.focus(); target.setSelectionRange(target.value.length, target.value.length); }
      }
    });
    /* Paste multi-line into existing row */
    inp.addEventListener('paste', e => {
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const lines = pasted.split(/\r?\n|\t/).map(s => s.trim()).filter(Boolean);
      if (lines.length <= 1) return; // let normal paste handle single line
      e.preventDefault();
      rememberUndo();
      const seen = new Set(items.filter((_, index) => index !== i).map(entry => entry.text.trim().toLocaleLowerCase()).filter(Boolean));
      const accepted = lines.filter(line => {
        const key = line.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!accepted.length) { showToast('รายการซ้ำกับข้อมูลที่มีอยู่'); return; }
      items[i].text = accepted[0];
      const newItems = accepted.slice(1).map(text => ({ text }));
      items.splice(i + 1, 0, ...newItems);
      renderList();
      drawWheel(currentAngle);
      updateCount();
      showToast(`วาง ${accepted.length} รายการ${accepted.length < lines.length ? ` (ข้ามรายการซ้ำ ${lines.length - accepted.length})` : ''}`);
      // Focus last inserted row
      const rows = document.querySelectorAll('.entry-input');
      if (rows[i + accepted.length - 1]) rows[i + accepted.length - 1].focus();
    });

    /* Delete button */
    const del = document.createElement('button');
    del.className   = 'entry-del';
    del.textContent = '×';
    del.title = 'ลบรายการนี้';
    del.onclick = () => {
      rememberUndo();
      if (items.length <= 1) { items[0].text = ''; renderList(); drawWheel(currentAngle); return; }
      items.splice(i, 1);
      renderList();
      drawWheel(currentAngle);
      updateCount();
    };

    row.appendChild(sw);
    row.appendChild(num);
    row.appendChild(inp);
    row.appendChild(del);
    list.appendChild(row);
  });

  /* "Add new entry" placeholder at bottom */
  const newRow = document.createElement('div');
  newRow.className = 'entry-row entry-new';
  const newInp = document.createElement('textarea');
  newInp.className = 'entry-new-input';
  newInp.rows = 2;
  newInp.placeholder = '+ พิมพ์รายการใหม่ แล้วกด Enter';
  newInp.maxLength = 120;
  newInp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const lines = newInp.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (!lines.length) return;
      if (lines.length === 1) {
        commitNew(lines[0]);
      } else {
        rememberUndo();
        items = items.filter(item => item.text.trim());
        let added = 0;
        lines.forEach(line => {
          if (!isDup(line)) {
            items.push({ text: line });
            added++;
          }
        });
        renderList(); drawWheel(currentAngle); updateCount();
        showToast(`เพิ่ม ${added} รายการ${added < lines.length ? ` (ข้าม ${lines.length - added} ซ้ำ)` : ''}`);
      }
      newInp.value = '';
    }
  });
  newInp.addEventListener('blur', () => {
    const lines = newInp.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    if (lines.length === 1) {
      commitNew(lines[0]);
    } else {
      rememberUndo();
      items = items.filter(item => item.text.trim());
      let added = 0;
      lines.forEach(line => {
        if (!isDup(line)) {
          items.push({ text: line });
          added++;
        }
      });
      renderList(); drawWheel(currentAngle); updateCount();
      showToast(`เพิ่ม ${added} รายการ${added < lines.length ? ` (ข้าม ${lines.length - added} ซ้ำ)` : ''}`);
    }
    newInp.value = '';
  });
  /* Also handle paste of multi-line text */
  newInp.addEventListener('paste', e => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    // Split by newline (\r\n, \n) or tab — covers Google Sheets single-column copy
    const lines = pasted.split(/\r?\n|\t/).map(s => s.trim()).filter(Boolean);
    if (lines.length > 1) {
      rememberUndo();
      let added = 0;
      // Remove trailing empty placeholder before inserting
      items = items.filter(it => it.text.trim());
      lines.forEach(line => { if (!isDup(line)) { items.push({ text: line }); added++; } });
      renderList(); drawWheel(currentAngle); updateCount();
      showToast(`วาง ${added} รายการ${added < lines.length ? ` (ข้าม ${lines.length - added} ซ้ำ)` : ''}`);
    } else {
      newInp.value = lines[0] || '';
    }
  });
  newRow.appendChild(newInp);
  list.appendChild(newRow);

  updateCount();
}

function commitNew(text) {
  if (isDup(text)) { showToast(`"${text}" มีอยู่แล้ว`); return; }
  rememberUndo();
  items = items.filter(item => item.text.trim());
  items.push({ text });
  renderList();
  drawWheel(currentAngle);
  updateCount();
  /* Focus the newly created input */
  const rows = document.querySelectorAll('.entry-input');
  if (rows[items.length - 1]) rows[items.length - 1].focus();
}

function isDup(text, exceptIndex = -1) {
  const key = text.trim().toLocaleLowerCase();
  return items.some((item, index) => index !== exceptIndex && item.text.trim().toLocaleLowerCase() === key);
}

function updateCount() {
  const real = items.filter(i => i.text.trim()).length;
  document.getElementById('itemCount').textContent = `${real} รายการ`;
  persistState();
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: items.map(item => item.text),
      history,
    }));
  } catch { showToast('บันทึกข้อมูลในเครื่องไม่สำเร็จ'); }
}

/* ── Init from saved state ── */
renderList();
renderHistory();

/* ═══════════════ TOOLBAR ══════════════ */
function shuffleItems() {
  rememberUndo();
  items = getEligibleItems();
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  renderList(); drawWheel(currentAngle);
}

function sortItems() {
  rememberUndo();
  items = getEligibleItems().sort((a, b) => a.text.localeCompare(b.text, 'th'));
  renderList(); drawWheel(currentAngle);
}

function clearAll() {
  if (!confirm('ล้างรายการทั้งหมด?')) return;
  rememberUndo();
  items = [{ text: '' }];
  renderList(); drawWheel(currentAngle); updateCount();
}

/* ═══════════════ PRESETS ══════════════ */
function addPreset(range) {
  const [lo, hi] = range.split('-').map(Number);
  let added = 0;
  const previousItems = items.map(item => ({ text: item.text }));
  for (let n = lo; n <= hi; n++) {
    const s = String(n).padStart(3, '0');
    if (!isDup(s)) { items.push({ text: s }); added++; }
  }
  /* Remove trailing empty placeholder if real items exist */
  items = items.filter(it => it.text.trim());
  if (!items.length) items.push({ text: '' });
  if (added) {
    undoSnapshot = previousItems;
    updateUndoButton();
  }
  renderList(); drawWheel(currentAngle); updateCount();
  showToast(`เพิ่ม ${added} รายการ`);
}

/* ═══════════════ HISTORY ══════════════ */
function addHistory(val) {
  history.unshift(val);
  if (history.length > 40) history.pop();
  renderHistory();
  persistState();
}
function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  if (!history.length) { list.innerHTML = '<span class="empty-text">ยังไม่มีผล</span>'; return; }
  history.forEach((v, i) => {
    const c = document.createElement('span');
    c.className = 'h-chip';
    c.textContent = v;
    c.style.animationDelay = i === 0 ? '0ms' : `${i * 20}ms`;
    list.appendChild(c);
  });
}
function clearHistory() { history = []; renderHistory(); persistState(); }

async function importItems(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const content = await file.text();
    let values;
    if (file.name.toLowerCase().endsWith('.json')) {
      const data = JSON.parse(content);
      values = Array.isArray(data) ? data : data.items;
    } else {
      values = content.split(/\r?\n|\t/);
    }
    if (!Array.isArray(values)) throw new Error('Invalid import file');
    rememberUndo();
    items = normalizeItems(values);
    renderList();
    drawWheel(currentAngle);
    updateCount();
    showToast(`นำเข้า ${getEligibleItems().length} รายการ`);
  } catch {
    showToast('ไฟล์ไม่ถูกต้อง ใช้ JSON หรือ TXT');
  } finally {
    event.target.value = '';
  }
}

function exportItems() {
  const content = JSON.stringify({ items: getEligibleItems().map(item => item.text), history }, null, 2);
  const file = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lottery-wheel.json';
  link.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════ WIN EFFECT ══════════════ */
function triggerWinEffect() {
  document.getElementById('winFlash').classList.add('show');
  setTimeout(() => document.getElementById('winFlash').classList.remove('show'), 500);
  launchConfetti();
}

/* ═══════════════ CONFETTI ══════════════ */
const cc   = document.getElementById('confetti');
const cctx = cc.getContext('2d');
let parts  = [];
function resizeCC() { cc.width = window.innerWidth; cc.height = window.innerHeight; }
resizeCC(); window.addEventListener('resize', resizeCC);
function launchConfetti() {
  const cols = ['#3db87a','#e85d75','#4a90d9','#f5a623','#9b59b6','#2eccc7','#e74c8b','#fdcb6e','#ffffff'];
  for (let i = 0; i < 90; i++) parts.push({
    x: Math.random() * cc.width, y: -10,
    vx: (Math.random() - .5) * 5, vy: Math.random() * 4 + 2,
    size: Math.random() * 7 + 3,
    col: cols[Math.floor(Math.random() * cols.length)],
    rot: Math.random() * Math.PI * 2, rs: (Math.random() - .5) * .22, a: 1,
  });
  requestAnimationFrame(animCC);
}
function animCC() {
  cctx.clearRect(0, 0, cc.width, cc.height);
  parts = parts.filter(p => p.a > .01);
  parts.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += .09; p.rot += p.rs; p.a -= .011;
    cctx.save(); cctx.globalAlpha = p.a; cctx.translate(p.x, p.y); cctx.rotate(p.rot);
    cctx.fillStyle = p.col; cctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * .45);
    cctx.restore();
  });
  if (parts.length) requestAnimationFrame(animCC);
}

/* ═══════════════ TOAST ══════════════ */
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ═══════════════════════════════════════
   AUDIO ENGINE — MP3 File Version
   ═══════════════════════════════════════ */

const AUDIO_SPIN    = new Audio('sounds/spin.mp3');      // ← เพลงตอนหมุน
const AUDIO_FANFARE = new Audio('sounds/fanfare.mp3');   // ← เสียงตอนได้ผล

/* ── ตั้งค่าเริ่มต้น ── */
AUDIO_SPIN.volume    = 1.0;    // ← ปรับเสียง spin     (0.0 – 1.0)
AUDIO_FANFARE.volume = 1.0;    // ← ปรับเสียง fanfare  (0.0 – 1.0)

/* ── ฟังก์ชันควบคุม (ไม่ต้องแก้) ── */
function startSpinMusic(duration) {
  AUDIO_SPIN.currentTime = 0;
  AUDIO_SPIN.play().catch(() => {});
}

function stopSpinMusic() {
  AUDIO_SPIN.pause();
  AUDIO_SPIN.currentTime = 0;
}

function playWinFanfare() {
  stopSpinMusic();
  AUDIO_FANFARE.currentTime = 0;
  AUDIO_FANFARE.play().catch(() => {});
}

/* ─────────────────────────────────────
   AUDIO TOGGLE BUTTON (in header)
───────────────────────────────────── */
let audioEnabled = false;

function initAudioButton() {
  const header = document.querySelector('.app-header');
  const btn = document.createElement('button');
  btn.id = 'audioBtn';
  btn.type = 'button';
  btn.textContent = '🔇 เปิดเสียงเอฟเฟกต์';
  btn.setAttribute('aria-pressed', 'false');
  btn.style.cssText = `
    background: var(--accent-l); border: 1px solid var(--rim2);
    color: var(--accent2); font-family:'Kanit',sans-serif;
    font-size:.78rem; font-weight:600; padding:5px 14px;
    border-radius:20px; cursor:pointer; flex-shrink:0;
    transition: background .15s, border-color .15s;
  `;
  btn.onclick = toggleAudio;
  header.querySelector('h1').after(btn);
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const btn = document.getElementById('audioBtn');
  if (audioEnabled) {
    btn.textContent = '🔊 เอฟเฟกต์เสียงเปิด';
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--accent)';
  } else {
    btn.textContent = '🔇 เปิดเสียงเอฟเฟกต์';
    btn.style.background = 'var(--accent-l)';
    btn.style.color = 'var(--accent2)';
    btn.style.borderColor = 'var(--rim2)';
    stopSpinMusic();
    AUDIO_FANFARE.pause();
    AUDIO_FANFARE.currentTime = 0;
  }
}

document.addEventListener('DOMContentLoaded', initAudioButton);