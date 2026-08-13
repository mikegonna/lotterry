/* ═══════════════════════════════════════
   Wheel Lottery — main.js
   ═══════════════════════════════════════ */

/* ── Palette ── */
const PALETTE = [
  '#6dd49a','#a8e6bf','#3db87a','#b8f0d0',
  '#52c48a','#d4f5e2','#2a9460','#7de0aa',
  '#c6f0d8','#45c97e','#e8faf0','#5bd494',
];

/* ── State ── */
let items    = [];   // { text: string }
let spinning = false;
let history  = [];

/* ── Canvas ── */
const canvas = document.getElementById('wheel');
const ctx    = canvas.getContext('2d');
const CX = canvas.width / 2;
const CY = canvas.height / 2;
const R  = CX - 10;
let currentAngle = 0;

/* ═══════════════ WHEEL DRAW ══════════════ */
function drawWheel(rot) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const texts = items.map(i => i.text);

  if (texts.length === 0) { drawEmpty(); return; }

  const n     = texts.length;
  const slice = (2 * Math.PI) / n;

  texts.forEach((label, i) => {
    const a0 = rot + i * slice;
    const a1 = a0 + slice;
    const col = PALETTE[i % PALETTE.length];

    /* Segment */
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* Label */
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(a0 + slice / 2);
    const dist = n <= 6 ? R * .58 : n <= 14 ? R * .64 : R * .70;
    ctx.translate(dist, 0);
    const fs = n <= 4 ? 18 : n <= 8 ? 14 : n <= 16 ? 11 : n <= 30 ? 9 : 7;
    ctx.font = `700 ${fs}px 'Kanit', sans-serif`;
    ctx.fillStyle = '#1e3a2a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,.35)';
    ctx.shadowBlur  = 3;
    const maxLen = n > 20 ? 6 : 10;
    const txt = label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  });

  /* Centre cap */
  ctx.beginPath();
  ctx.arc(CX, CY, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0d18';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,200,66,.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c842';
  ctx.fill();
}

function drawEmpty() {
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.07)';
  ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = '600 14px Kanit, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('เพิ่มรายการทางขวามือ', CX, CY);
}

drawWheel(currentAngle);

/* ═══════════════ SPIN ══════════════ */
function spinWheel() {
  if (spinning) return;
  if (items.length < 2) { showToast('ต้องมีอย่างน้อย 2 รายการ'); return; }
  spinning = true;

  const btn = document.getElementById('spinBtn');
  btn.disabled = true;

  // ── Audio: stop ambient, start spin music ──
  if (audioEnabled) {
    const approxDuration = 4500;
    startSpinMusic(approxDuration / 1000);
  }

  const n          = items.length;
  const winIdx     = Math.floor(Math.random() * n);
  const sliceAngle = (2 * Math.PI) / n;
  const extraSpins = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;

  /* Target angle: winning slice centre lands at pointer (top = -π/2) */
  const targetAngle = -Math.PI / 2 - winIdx * sliceAngle - sliceAngle / 2;
  const offset = ((targetAngle - currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const totalDelta = extraSpins + offset;

  const duration  = 4000 + Math.random() * 1000;
  const startAngle = currentAngle;
  let   startTime  = null;

  function ease(t) { return 1 - Math.pow(1 - t, 4); }

  function frame(ts) {
    if (!startTime) startTime = ts;
    const t = Math.min((ts - startTime) / duration, 1);
    currentAngle = startAngle + totalDelta * ease(t);
    drawWheel(currentAngle);
    if (t < 1) { requestAnimationFrame(frame); return; }
    currentAngle = startAngle + totalDelta;
    drawWheel(currentAngle);
    onSpinEnd(winIdx);
  }
  requestAnimationFrame(frame);
}

function onSpinEnd(idx) {
  const winner = items[idx].text;
  triggerWinEffect();
  // ── Audio: stop spin music, play fanfare ──
  if (audioEnabled) {
    stopSpinMusic();
    setTimeout(() => playWinFanfare(), 200);
  }
  setTimeout(() => {
    document.getElementById('modalNumber').textContent = winner;
    document.getElementById('modalOverlay').classList.add('show');
    addHistory(winner);
    spinning = false;
    document.getElementById('spinBtn').disabled = false;
  }, 350);
}

/* ═══════════════ MODAL ══════════════ */
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }

function removeAndClose() {
  const winner = document.getElementById('modalNumber').textContent;
  const idx = items.findIndex(it => it.text === winner);
  if (idx !== -1) {
    items.splice(idx, 1);
    if (items.length === 0) items.push({ text: '' });
    renderList();
    drawWheel(currentAngle);
    updateCount();
  }
  closeModal();
}

document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });

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
    inp.addEventListener('input', () => {
      items[i].text = inp.value;
      drawWheel(currentAngle);
      updateCount();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        /* Insert new row below */
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
      // Replace current row with first line, insert rest below
      items[i].text = lines[0];
      const newItems = lines.slice(1).map(t => ({ text: t }));
      items.splice(i + 1, 0, ...newItems);
      renderList();
      drawWheel(currentAngle);
      updateCount();
      showToast(`วาง ${lines.length} รายการ`);
      // Focus last inserted row
      const rows = document.querySelectorAll('.entry-input');
      if (rows[i + lines.length - 1]) rows[i + lines.length - 1].focus();
    });

    /* Delete button */
    const del = document.createElement('button');
    del.className   = 'entry-del';
    del.textContent = '×';
    del.title = 'ลบรายการนี้';
    del.onclick = () => {
      if (items.length <= 1) { items[0].text = ''; renderList(); return; }
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
  const newInp = document.createElement('input');
  newInp.className = 'entry-new-input';
  newInp.type = 'text';
  newInp.placeholder = '+ พิมพ์รายการใหม่…';
  newInp.maxLength = 40;
  newInp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && newInp.value.trim()) {
      commitNew(newInp.value.trim());
      newInp.value = '';
    }
  });
  newInp.addEventListener('blur', () => {
    if (newInp.value.trim()) { commitNew(newInp.value.trim()); newInp.value = ''; }
  });
  /* Also handle paste of multi-line text */
  newInp.addEventListener('paste', e => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    // Split by newline (\r\n, \n) or tab — covers Google Sheets single-column copy
    const lines = pasted.split(/\r?\n|\t/).map(s => s.trim()).filter(Boolean);
    if (lines.length > 1) {
      let added = 0;
      // Remove trailing empty placeholder before inserting
      items = items.filter(it => it.text.trim());
      lines.forEach(l => { if (!isDup(l)) { items.push({ text: l }); added++; } });
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
  items.push({ text });
  renderList();
  drawWheel(currentAngle);
  updateCount();
  /* Focus the newly created input */
  const rows = document.querySelectorAll('.entry-input');
  if (rows[items.length - 1]) rows[items.length - 1].focus();
}

function isDup(text) { return items.some(i => i.text === text); }

function updateCount() {
  const real = items.filter(i => i.text.trim()).length;
  document.getElementById('itemCount').textContent = `${real} รายการ`;
}

/* ── Init with one empty row ── */
items.push({ text: '' });
renderList();

/* ═══════════════ TOOLBAR ══════════════ */
function shuffleItems() {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  renderList(); drawWheel(currentAngle);
}

function sortItems() {
  items.sort((a, b) => a.text.localeCompare(b.text, 'th'));
  renderList(); drawWheel(currentAngle);
}

function clearAll() {
  if (!confirm('ล้างรายการทั้งหมด?')) return;
  items = [{ text: '' }];
  renderList(); drawWheel(currentAngle); updateCount();
}

/* ═══════════════ PRESETS ══════════════ */
function addPreset(range) {
  const [lo, hi] = range.split('-').map(Number);
  let added = 0;
  for (let n = lo; n <= hi; n++) {
    const s = String(n).padStart(3, '0');
    if (!isDup(s)) { items.push({ text: s }); added++; }
  }
  /* Remove trailing empty placeholder if real items exist */
  items = items.filter((it, idx) => it.text.trim() || idx === items.length - 1);
  renderList(); drawWheel(currentAngle); updateCount();
  showToast(`เพิ่ม ${added} รายการ`);
}

/* ═══════════════ HISTORY ══════════════ */
function addHistory(val) {
  history.unshift(val);
  if (history.length > 40) history.pop();
  renderHistory();
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
function clearHistory() { history = []; renderHistory(); }

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
  const cols = ['#3db87a','#6dd49a','#a8e6bf','#ffffff','#2a9460','#b8f0d0','#52c48a','#e8faf0'];
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

/* ──────────────────────────────────────────────────────────
   🎵 เปลี่ยนเพลง: แก้ path ใน 3 บรรทัดนี้
   วางไฟล์เพลงไว้ใน folder  sounds/  ข้างๆ main.js
────────────────────────────────────────────────────────── */
const AUDIO_AMBIENT = new Audio('sounds/ambient.mp3');   // ← เพลงคลอ background
const AUDIO_SPIN    = new Audio('sounds/spin.mp3');      // ← เพลงตอนหมุน
const AUDIO_FANFARE = new Audio('sounds/fanfare.mp3');   // ← เสียงตอนได้ผล

/* ── ตั้งค่าเริ่มต้น ── */
AUDIO_AMBIENT.loop   = true;   // วนซ้ำตลอด
AUDIO_AMBIENT.volume = 0.4;    // ← ปรับเสียง ambient  (0.0 – 1.0)
AUDIO_SPIN.volume    = 0.8;    // ← ปรับเสียง spin     (0.0 – 1.0)
AUDIO_FANFARE.volume = 0.9;    // ← ปรับเสียง fanfare  (0.0 – 1.0)

/* ── ฟังก์ชันควบคุม (ไม่ต้องแก้) ── */
function startAmbient() {
  AUDIO_AMBIENT.currentTime = 0;
  AUDIO_AMBIENT.play().catch(() => {});
}

function stopAmbient(fadeSecs = 1.0) {
  // Fade out แทนหยุดทันที
  const step = AUDIO_AMBIENT.volume / (fadeSecs * 20);
  const timer = setInterval(() => {
    if (AUDIO_AMBIENT.volume > step) {
      AUDIO_AMBIENT.volume -= step;
    } else {
      AUDIO_AMBIENT.pause();
      AUDIO_AMBIENT.volume = 0.4; // reset volume
      clearInterval(timer);
    }
  }, 50);
}

function startSpinMusic(duration) {
  stopAmbient(0.3);
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
  // กลับมาเล่น ambient หลัง fanfare จบ
  AUDIO_FANFARE.onended = () => startAmbient();
}

/* ─────────────────────────────────────
   AUDIO TOGGLE BUTTON (in header)
───────────────────────────────────── */
let audioEnabled = false;

function initAudioButton() {
  const header = document.querySelector('.app-header');
  const btn = document.createElement('button');
  btn.id = 'audioBtn';
  btn.innerHTML = '🔇 เปิดเสียง';
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
    btn.innerHTML = '🔊 เสียงเปิด';
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--accent)';
    startAmbient();
  } else {
    btn.innerHTML = '🔇 เปิดเสียง';
    btn.style.background = 'var(--accent-l)';
    btn.style.color = 'var(--accent2)';
    btn.style.borderColor = 'var(--rim2)';
    stopAmbient();
  }
}

document.addEventListener('DOMContentLoaded', initAudioButton);