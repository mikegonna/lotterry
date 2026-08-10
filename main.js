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
   AUDIO ENGINE — Web Audio API (no files)
   ═══════════════════════════════════════ */

let audioCtx      = null;
let ambientNodes  = {};   // holds oscillators/gains for ambient loop
let ambientOn     = false;
let spinMusicNodes = [];  // holds nodes active during spin
let audioReady    = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/* ── Master volume ── */
function masterGain(vol = 0.18) {
  const ac = getAudioCtx();
  const g  = ac.createGain();
  g.gain.value = vol;
  g.connect(ac.destination);
  return g;
}

/* ─────────────────────────────────────
   AMBIENT MUSIC — gentle looping BGM
   Simple pentatonic arpeggio + pad
───────────────────────────────────── */
const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00,
               523.25, 587.33, 659.25, 783.99, 880.00]; // C pentatonic x2

function startAmbient() {
  if (ambientOn) return;
  ambientOn = true;
  const ac  = getAudioCtx();
  if (ac.state === 'suspended') ac.resume();

  const master = ac.createGain();
  master.gain.setValueAtTime(0, ac.currentTime);
  master.gain.linearRampToValueAtTime(0.12, ac.currentTime + 2.5);
  master.connect(ac.destination);

  /* Reverb convolver (impulse) */
  const reverb = makeReverb(ac, 2.5);
  reverb.connect(master);

  /* Soft pad — slow sine chords */
  // const padFreqs = [261.63, 329.63, 392.00, 523.25];
  // padFreqs.forEach(freq => {
  //   const osc = ac.createOscillator();
  //   const g   = ac.createGain();
  //   osc.type = 'sine';
  //   osc.frequency.value = freq;
  //   g.gain.value = 0.04;
  //   osc.connect(g); g.connect(reverb); g.connect(master);
  //   osc.start();
  //   ambientNodes[`pad_${freq}`] = { osc, g };
  // });

  /* Arpeggio — plucked notes looping */
  let step = 0;
  const BPM   = 96;
  const beat  = 60 / BPM;
  const NOTE_PATTERN = [0, 2, 4, 7, 5, 4, 2, 0, 1, 3, 5, 7]; // indices into PENTA

  function scheduleArp() {
    if (!ambientOn) return;
    const now  = ac.currentTime;
    const freq = PENTA[NOTE_PATTERN[step % NOTE_PATTERN.length]];
    pluck(ac, freq, now, reverb, master, 0.09);
    step++;
    ambientNodes._arpTimer = setTimeout(scheduleArp, beat * 1000 * 0.5);
  }
  scheduleArp();

  /* Bass note — long low tone */
  const bass = ac.createOscillator();
  const bassG = ac.createGain();
  bass.type = 'triangle';
  bass.frequency.value = 65.41; // C2
  bassG.gain.value = 0.05;
  bass.connect(bassG); bassG.connect(master);
  bass.start();
  ambientNodes.bass = { osc: bass, g: bassG };
  ambientNodes.master = master;
}

function stopAmbient(fade = 1.5) {
  if (!ambientOn) return;
  ambientOn = false;
  clearTimeout(ambientNodes._arpTimer);
  const ac = getAudioCtx();
  if (ambientNodes.master) {
    ambientNodes.master.gain.linearRampToValueAtTime(0, ac.currentTime + fade);
  }
  setTimeout(() => {
    Object.values(ambientNodes).forEach(n => {
      try { if (n.osc) n.osc.stop(); } catch(e) {}
    });
    ambientNodes = {};
  }, (fade + 0.1) * 1000);
}

/* ─────────────────────────────────────
   SPIN MUSIC — exciting build-up
───────────────────────────────────── */
function startSpinMusic(duration) {
  const ac = getAudioCtx();
  if (ac.state === 'suspended') ac.resume();
  stopAmbient(0.4);

  const master = ac.createGain();
  master.gain.value = 0.18;
  master.connect(ac.destination);
  spinMusicNodes = [master];

  const reverb = makeReverb(ac, 1.2);
  reverb.connect(master);

  const now = ac.currentTime;

  /* Rapid tick — accelerates then decelerates like the wheel */
  const TICK_NOTES = [523.25, 659.25, 783.99, 1046.50];
  const totalTicks = 28;
  // ease-in then ease-out timing mirrors wheel physics
  for (let i = 0; i < totalTicks; i++) {
    const progress = i / totalTicks;
    // fast in middle, slow at ends
    const spacing  = duration / totalTicks * (0.3 + 1.4 * Math.abs(progress - 0.5) * 2);
    const t        = now + (duration * easeForTick(i / totalTicks));
    const freq     = TICK_NOTES[i % TICK_NOTES.length];
    const vol      = 0.06 + progress * 0.1;
    pluck(ac, freq, t, reverb, master, vol, 0.08);
  }

  /* Build-up chord swell — rises over the spin */
  const chordFreqs = [261.63, 392.00, 523.25, 659.25];
  chordFreqs.forEach((freq, ci) => {
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    // filter for softer sound
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.018, now + duration * 0.4);
    g.gain.linearRampToValueAtTime(0.032, now + duration * 0.8);
    g.gain.linearRampToValueAtTime(0,     now + duration);

    osc.connect(filter); filter.connect(g);
    g.connect(reverb); g.connect(master);
    osc.start(now); osc.stop(now + duration + 0.1);
    spinMusicNodes.push(osc, g, filter);
  });

  /* Drum: bass kick every beat */
  const beatInterval = 60 / 110; // 110 BPM
  let bt = now + 0.1;
  while (bt < now + duration - 0.2) {
    kick(ac, bt, master);
    bt += beatInterval;
  }
  /* Snare on beats 2 & 4 */
  let st = now + beatInterval;
  while (st < now + duration - 0.2) {
    snare(ac, st, master);
    st += beatInterval * 2;
  }
}

function stopSpinMusic() {
  const ac = getAudioCtx();
  try {
    if (spinMusicNodes[0]) {
      spinMusicNodes[0].gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
    }
  } catch(e) {}
  setTimeout(() => {
    spinMusicNodes.forEach(n => { try { if (n.stop) n.stop(); } catch(e) {} });
    spinMusicNodes = [];
  }, 400);
}

function playWinFanfare() {
  const ac  = getAudioCtx();
  const now = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.22;
  master.connect(ac.destination);

  // Rising arpeggio fanfare
  const fanfare = [523.25, 659.25, 783.99, 1046.50, 1318.51];
  fanfare.forEach((freq, i) => {
    const t = now + i * 0.11;
    pluck(ac, freq, t, null, master, 0.18, 0.35);
  });
  // Final chord
  [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
    pluck(ac, freq, now + fanfare.length * 0.11, null, master, 0.14, 0.8);
  });

  // Restart ambient after fanfare settles
  setTimeout(() => startAmbient(), 1800);
}

/* ─────────────────────────────────────
   LOW-LEVEL SOUND PRIMITIVES
───────────────────────────────────── */

/* Karplus-Strong-ish pluck */
function pluck(ac, freq, when, reverb, dest, vol = 0.1, dur = 0.25) {
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  if (reverb) g.connect(reverb);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

/* Kick drum */
function kick(ac, when, dest) {
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(40, when + 0.12);
  g.gain.setValueAtTime(0.3, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
  osc.connect(g); g.connect(dest);
  osc.start(when); osc.stop(when + 0.25);
}

/* Snare */
function snare(ac, when, dest) {
  const buf  = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src  = ac.createBufferSource();
  const g    = ac.createGain();
  const filt = ac.createBiquadFilter();
  filt.type = 'highpass'; filt.frequency.value = 1800;
  src.buffer = buf;
  g.gain.setValueAtTime(0.12, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
  src.connect(filt); filt.connect(g); g.connect(dest);
  src.start(when);
}

/* Simple reverb impulse */
function makeReverb(ac, secs = 2) {
  const rate   = ac.sampleRate;
  const len    = rate * secs;
  const buf    = ac.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  }
  const conv = ac.createConvolver();
  conv.buffer = buf;
  return conv;
}

/* Ease helper for tick spacing */
function easeForTick(t) {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
    float:right; margin-top:2px;
    background: var(--accent-l); border: 1px solid var(--rim2);
    color: var(--accent2); font-family:'Kanit',sans-serif;
    font-size:.78rem; font-weight:600; padding:5px 14px;
    border-radius:20px; cursor:pointer;
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