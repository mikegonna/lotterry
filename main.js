/* ─── Config ─── */
const REEL_RANGES = [
  [0, 1, 2],               // reel 0: 0–2
  [0,1,2,3,4,5,6,7,8,9],  // reel 1: 0–9
  [0,1,2,3,4,5,6,7,8,9],  // reel 2: 0–9
];

const REEL_HEIGHT     = 140;  // px — must match CSS .reel height
const DIGIT_H         = REEL_HEIGHT / 3;
const SPIN_DURATIONS  = [1500, 2000, 2600]; // ms, staggered stop per reel

let spinning = false;
let history  = [];

/* ─── Build reel strips ─── */
function buildStrip(stripEl, digits) {
  stripEl.innerHTML = '';
  const repeated = [];
  for (let i = 0; i < 20; i++) repeated.push(...digits);
  repeated.forEach(d => {
    const div = document.createElement('div');
    div.className = 'reel-digit';
    div.textContent = d;
    stripEl.appendChild(div);
  });
}

REEL_RANGES.forEach((digits, i) => {
  buildStrip(document.getElementById(`strip${i}`), digits);
});

/* ─── Spin helpers ─── */
function getRandomDigit(digits) {
  return digits[Math.floor(Math.random() * digits.length)];
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

function spinReel(stripEl, digits, targetDigit, duration) {
  return new Promise(resolve => {
    const digitH        = DIGIT_H;
    const landingCycle  = 14 + Math.floor(Math.random() * 4);
    const landingIndex  = landingCycle * digits.length + digits.indexOf(targetDigit);
    const endTop        = -(landingIndex * digitH) + digitH;

    stripEl.style.transition = 'none';
    stripEl.style.top = '0px';

    let startTime = null;

    function frame(ts) {
      if (!startTime) startTime = ts;
      const elapsed  = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current  = endTop * easeOut(progress);

      stripEl.style.top = current + 'px';

      // Highlight the digit currently in the center window
      const centerIdx = Math.round((-current) / digitH);
      stripEl.querySelectorAll('.reel-digit').forEach((el, i) => {
        el.classList.toggle('center', i === centerIdx);
      });

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        stripEl.style.top = endTop + 'px';
        resolve(targetDigit);
      }
    }

    requestAnimationFrame(frame);
  });
}

/* ─── Main spin ─── */
async function spin() {
  if (spinning) return;
  spinning = true;

  const btn      = document.getElementById('spinBtn');
  const resultEl = document.getElementById('resultNumber');
  const labelEl  = document.getElementById('resultLabel');

  btn.disabled = true;
  btn.classList.add('clicked');
  setTimeout(() => btn.classList.remove('clicked'), 300);

  resultEl.classList.remove('visible');
  labelEl.textContent = 'กำลังปั่น...';

  const results = REEL_RANGES.map(getRandomDigit);

  await Promise.all(
    results.map((digit, i) =>
      spinReel(document.getElementById(`strip${i}`), REEL_RANGES[i], digit, SPIN_DURATIONS[i])
    )
  );

  const numberStr = results.join('');
  resultEl.textContent = numberStr;
  resultEl.classList.add('visible');
  labelEl.textContent = '✨ หมายเลขสลากที่ได้';

  addToHistory(numberStr);
  triggerWinEffect();
  showModal(results);

  setTimeout(() => {
    btn.disabled = false;
    spinning = false;
  }, 600);
}

/* ─── Modal ─── */
function showModal(digits) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('show');

  digits.forEach((d, i) => {
    const box = document.getElementById(`popDigit${i}`);
    box.textContent = d;
    box.classList.remove('pop');
    setTimeout(() => box.classList.add('pop'), 120 + i * 110);
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

document.getElementById('modalOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

/* ─── History ─── */
function addToHistory(num) {
  history.unshift(num);
  if (history.length > 30) history.pop();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  history.forEach((num, i) => {
    const chip = document.createElement('span');
    chip.className = 'history-chip';
    chip.textContent = num;
    chip.style.animationDelay = i === 0 ? '0ms' : `${i * 30}ms`;
    list.appendChild(chip);
  });
}

function clearHistory() {
  history = [];
  document.getElementById('historyList').innerHTML =
    `<span style="color:var(--muted);font-size:.8rem;font-family:'Kanit',sans-serif;">ยังไม่มีการจับสลาก</span>`;
}

/* ─── Win effect ─── */
function triggerWinEffect() {
  const flash = document.getElementById('winFlash');
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 600);
  launchConfetti();
}

/* ─── Confetti ─── */
const canvas = document.getElementById('confetti');
const ctx    = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function launchConfetti() {
  const colors = ['#f5c842','#00e5ff','#e03040','#ffffff','#ff9f43','#a29bfe'];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x:        Math.random() * canvas.width,
      y:        -10,
      vx:       (Math.random() - .5) * 4,
      vy:       Math.random() * 4 + 2,
      size:     Math.random() * 7 + 3,
      color:    colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - .5) * .2,
      alpha:    1,
    });
  }
  requestAnimationFrame(animateConfetti);
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.alpha > .01);
  particles.forEach(p => {
    p.x        += p.vx;
    p.y        += p.vy;
    p.vy       += .08;
    p.rotation += p.rotSpeed;
    p.alpha    -= .012;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .5);
    ctx.restore();
  });
  if (particles.length > 0) requestAnimationFrame(animateConfetti);
  else ctx.clearRect(0, 0, canvas.width, canvas.height);
}