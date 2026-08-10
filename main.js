/* ═══════════════════════════════════════
   Wheel Lottery — main.js
   ═══════════════════════════════════════ */

/* ── State ── */
let numbers  = [];   // items on the wheel
let spinning = false;
let history  = [];

/* ── Palette: segment colours cycling ── */
const PALETTE = [
  '#e03050','#f5c842','#00e5ff','#00e096',
  '#a78bfa','#fb923c','#38bdf8','#f472b6',
  '#4ade80','#facc15','#60a5fa','#f87171',
];

/* ── Canvas setup ── */
const canvas = document.getElementById('wheel');
const ctx    = canvas.getContext('2d');
const CX     = canvas.width  / 2;
const CY     = canvas.height / 2;
const R      = CX - 8;   // radius with a small margin

/* Current rotation in radians */
let currentAngle = 0;

/* ── Draw wheel ── */
function drawWheel(rotationRad) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (numbers.length === 0) {
    drawEmpty();
    return;
  }

  const n     = numbers.length;
  const slice = (2 * Math.PI) / n;

  numbers.forEach((num, i) => {
    const startAngle = rotationRad + i * slice;
    const endAngle   = startAngle + slice;
    const color      = PALETTE[i % PALETTE.length];

    /* Segment fill */
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    /* Segment border */
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, startAngle, endAngle);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* Label */
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(startAngle + slice / 2);

    const textR = R * (n <= 8 ? 0.62 : 0.68);
    ctx.translate(textR, 0);

    const fontSize = n <= 6 ? 18 : n <= 12 ? 14 : n <= 20 ? 11 : 9;
    ctx.font        = `700 ${fontSize}px 'Share Tech Mono', monospace`;
    ctx.fillStyle   = 'rgba(0,0,0,.8)';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';

    /* Shadow for readability */
    ctx.shadowColor  = 'rgba(255,255,255,.4)';
    ctx.shadowBlur   = 3;

    /* Truncate long labels */
    const label = String(num).length > 8 ? String(num).slice(0, 7) + '…' : String(num);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  /* Centre circle */
  ctx.beginPath();
  ctx.arc(CX, CY, 22, 0, 2 * Math.PI);
  ctx.fillStyle = '#0d0d18';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,200,66,.6)';
  ctx.lineWidth   = 3;
  ctx.stroke();

  /* Centre dot */
  ctx.beginPath();
  ctx.arc(CX, CY, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#f5c842';
  ctx.fill();
}

function drawEmpty() {
  /* Dashed placeholder circle */
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth   = 2;
  ctx.setLineDash([10, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font          = '600 15px Kanit, sans-serif';
  ctx.fillStyle     = 'rgba(255,255,255,.2)';
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.fillText('เพิ่มหมายเลขก่อนหมุน', CX, CY);
}

/* Initial draw */
drawWheel(currentAngle);

/* ── Spin ── */
function spinWheel() {
  if (spinning) return;
  if (numbers.length < 2) {
    alert('กรุณาเพิ่มหมายเลขอย่างน้อย 2 รายการก่อนหมุน');
    return;
  }

  spinning = true;
  const btn = document.getElementById('spinBtn');
  btn.disabled = true;
  btn.classList.add('ripple');
  setTimeout(() => btn.classList.remove('ripple'), 300);

  /* Pick winner */
  const winnerIdx  = Math.floor(Math.random() * numbers.length);
  const n          = numbers.length;
  const sliceAngle = (2 * Math.PI) / n;

  /* We want the winning slice to land under the pointer (top = -π/2).
     The centre of slice i is at: currentAngle + i*slice + slice/2
     We need that == -π/2 (mod 2π) after spinning.
     Extra full spins (5–8) for drama. */
  const extraSpins = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
  const targetCenter = -Math.PI / 2 - (winnerIdx * sliceAngle + sliceAngle / 2);
  /* Normalise so we always spin forward */
  let delta = (targetCenter - currentAngle) % (2 * Math.PI);
  if (delta > 0) delta -= 2 * Math.PI;   // ensure negative (forward = decreasing angle visually? no — we add)
  /* Actually we spin by adding angle, pointer is fixed at top.
     Winning segment centre should be at top after spin.
     After rotation R, segment i centre is at: R + i*slice + slice/2
     We want R + i*slice + slice/2 ≡ -π/2 (pointing up) mod 2π
     So R_final = -π/2 - i*slice - slice/2
  */
  const R_final = -Math.PI / 2 - winnerIdx * sliceAngle - sliceAngle / 2;
  /* Add enough full turns */
  const spinsToAdd = extraSpins;
  const R_target   = R_final - Math.floor((R_final - currentAngle) / (2 * Math.PI)) * (2 * Math.PI)
                     - 2 * Math.PI * Math.ceil(extraSpins / (2 * Math.PI));

  /* Simpler: just set total target = currentAngle + extraSpins + offset */
  const offset = ((R_final - currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const totalDelta = extraSpins + offset;

  const duration  = 4000 + Math.random() * 1000; // 4–5 s
  const startAngle = currentAngle;
  let   startTime  = null;

  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  function frame(ts) {
    if (!startTime) startTime = ts;
    const t = Math.min((ts - startTime) / duration, 1);
    currentAngle = startAngle + totalDelta * easeOut(t);
    drawWheel(currentAngle);

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      currentAngle = startAngle + totalDelta;
      drawWheel(currentAngle);
      onSpinEnd(winnerIdx);
    }
  }

  requestAnimationFrame(frame);
}

function onSpinEnd(idx) {
  const winner = numbers[idx];

  /* Tick effect: briefly highlight pointer area */
  triggerWinEffect();

  setTimeout(() => {
    document.getElementById('modalNumber').textContent = winner;
    document.getElementById('modalOverlay').classList.add('show');
    addHistory(String(winner));
    spinning = false;
    document.getElementById('spinBtn').disabled = false;
  }, 400);
}

/* ── Modal ── */
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* ── Tabs ── */
function switchTab(tab) {
  document.getElementById('panelSingle').classList.toggle('hidden', tab !== 'single');
  document.getElementById('panelBulk').classList.toggle('hidden',  tab !== 'bulk');
  document.getElementById('tabSingle').classList.toggle('active', tab === 'single');
  document.getElementById('tabBulk').classList.toggle('active',   tab === 'bulk');
}

/* ── Bulk add ── */
function parseBulkInput(raw) {
  /* Accept newline-separated OR comma-separated, trim whitespace, drop empty */
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function addBulk() {
  const raw   = document.getElementById('bulkInput').value;
  const items = parseBulkInput(raw);
  if (!items.length) return;

  let added = 0, skipped = 0;
  items.forEach(val => {
    const v = val.slice(0, 20); // max length guard
    if (numbers.includes(v)) { skipped++; return; }
    numbers.push(v);
    added++;
  });

  document.getElementById('bulkInput').value = '';
  document.getElementById('bulkHint').textContent = '0 รายการ';
  renderChips();
  drawWheel(currentAngle);

  if (skipped > 0) {
    const msg = added > 0
      ? `เพิ่ม ${added} รายการ (ข้าม ${skipped} รายการที่ซ้ำ)`
      : `ทุกรายการซ้ำกับที่มีอยู่แล้ว (${skipped} รายการ)`;
    showToast(msg);
  }
}

/* Live count hint while typing in bulk textarea */
document.addEventListener('DOMContentLoaded', () => {
  const bulkInput = document.getElementById('bulkInput');
  if (bulkInput) {
    bulkInput.addEventListener('input', () => {
      const count = parseBulkInput(bulkInput.value).length;
      document.getElementById('bulkHint').textContent =
        count > 0 ? `${count} รายการ` : '0 รายการ';
    });
  }
});

/* ── Toast notification ── */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#1e1e30; border:1px solid rgba(255,255,255,.12);
      color:#f0f0f8; font-family:'Kanit',sans-serif; font-size:.85rem;
      padding:10px 20px; border-radius:20px; z-index:300;
      opacity:0; transition:opacity .25s, transform .25s; white-space:nowrap;
      box-shadow:0 4px 20px rgba(0,0,0,.5);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2800);
}

/* ── Number Manager ── */
function addNumber() {
  const input = document.getElementById('numInput');
  const val   = input.value.trim();
  if (!val) return;

  /* Prevent duplicates */
  if (numbers.includes(val)) {
    input.style.borderColor = '#e03050';
    setTimeout(() => input.style.borderColor = '', 800);
    input.value = '';
    return;
  }

  numbers.push(val);
  input.value = '';
  input.focus();
  renderChips();
  drawWheel(currentAngle);
}

function removeNumber(idx) {
  numbers.splice(idx, 1);
  renderChips();
  drawWheel(currentAngle);
}

function renderChips() {
  const grid = document.getElementById('chipsGrid');
  grid.innerHTML = '';

  if (numbers.length === 0) {
    grid.innerHTML = '<span class="chips-empty">ยังไม่มีหมายเลข — เพิ่มด้านบนได้เลย</span>';
    return;
  }

  numbers.forEach((num, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip';

    const dot = document.createElement('span');
    dot.style.cssText = `
      display:inline-block; width:8px; height:8px; border-radius:50%;
      background:${PALETTE[i % PALETTE.length]}; flex-shrink:0;
    `;

    const label = document.createElement('span');
    label.textContent = num;

    const del = document.createElement('button');
    del.className   = 'chip-del';
    del.textContent = '×';
    del.title       = 'ลบ';
    del.onclick     = () => removeNumber(i);

    chip.appendChild(dot);
    chip.appendChild(label);
    chip.appendChild(del);
    grid.appendChild(chip);
  });
}

function clearAll() {
  if (!numbers.length) return;
  if (!confirm('ล้างหมายเลขทั้งหมดในวงล้อ?')) return;
  numbers = [];
  renderChips();
  drawWheel(currentAngle);
}

/* ── Presets ── */
function addPreset(range) {
  const [lo, hi] = range.split('-').map(Number);
  for (let n = lo; n <= hi; n++) {
    const s = String(n).padStart(3, '0');
    if (!numbers.includes(s)) numbers.push(s);
  }
  renderChips();
  drawWheel(currentAngle);
}

/* ── History ── */
function addHistory(val) {
  history.unshift(val);
  if (history.length > 40) history.pop();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  if (!history.length) {
    list.innerHTML = '<span style="color:var(--muted);font-size:.8rem;">ยังไม่มีผล</span>';
    return;
  }
  history.forEach((v, i) => {
    const c = document.createElement('span');
    c.className = 'h-chip';
    c.textContent = v;
    c.style.animationDelay = i === 0 ? '0ms' : `${i * 25}ms`;
    list.appendChild(c);
  });
}

function clearHistory() {
  history = [];
  renderHistory();
}

/* ── Win effect ── */
function triggerWinEffect() {
  const flash = document.getElementById('winFlash');
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 500);
  launchConfetti();
}

/* ── Confetti ── */
const confCanvas = document.getElementById('confetti');
const confCtx    = confCanvas.getContext('2d');
let   particles  = [];

function resizeConf() {
  confCanvas.width  = window.innerWidth;
  confCanvas.height = window.innerHeight;
}
resizeConf();
window.addEventListener('resize', resizeConf);

function launchConfetti() {
  const colors = ['#f5c842','#00e5ff','#e03050','#ffffff','#fb923c','#a78bfa'];
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random() * confCanvas.width, y: -10,
      vx: (Math.random() - .5) * 5, vy: Math.random() * 4 + 2,
      size: Math.random() * 7 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - .5) * .22,
      alpha: 1,
    });
  }
  requestAnimationFrame(animateConf);
}

function animateConf() {
  confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  particles = particles.filter(p => p.alpha > .01);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += .09;
    p.rotation += p.rotSpeed; p.alpha -= .011;
    confCtx.save();
    confCtx.globalAlpha = p.alpha;
    confCtx.translate(p.x, p.y);
    confCtx.rotate(p.rotation);
    confCtx.fillStyle = p.color;
    confCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size * .45);
    confCtx.restore();
  });
  if (particles.length > 0) requestAnimationFrame(animateConf);
  else confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
}