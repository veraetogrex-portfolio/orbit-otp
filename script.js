// Orbit OTP — github.com/veraetogrex-portfolio · zero dependencies
// Type the 4th digit: the row curls onto an orbit, spins 1¼ turns,
// lights up and screws down into one verified tile.

const otp   = document.querySelector('#otp');
const row   = otp.querySelector('.otp-row');
const cells = [...row.children];
const input = otp.querySelector('.otp-input');
const orbit = otp.querySelector('.otp-orbit');
const ring  = otp.querySelector('.otp-ring');
const dot   = otp.querySelector('.otp-dot');
const tick  = otp.querySelector('.otp-ok');
const foot  = otp.querySelector('.otp-foot');

// Replace with a request to your backend.
const checkCode = async code => code === '4719';

const R = 130;                     // orbit radius, px
const SEATS = [-90, 0, 90, 180];   // where each cell lands on the ring, deg
let busy = false;


// tiny tween: animate(ms, t => …, easing)
const ease = { io: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2, in: t => t ** 3, back: t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2 };
const animate = (ms, fn, e = ease.io) => new Promise(done => {
  const t0 = performance.now();
  const step = now => { const p = Math.min(1, (now - t0) / ms); fn(e(p)); p < 1 ? requestAnimationFrame(step) : done(); };
  requestAnimationFrame(step);
});
const wait = ms => new Promise(r => setTimeout(r, ms));
const polar = (deg, r) => [Math.cos(deg * Math.PI / 180) * r, Math.sin(deg * Math.PI / 180) * r];
const place = (el, x, y, rot = 0, s = 1) => el.style.transform = `translate(${x}px,${y}px) rotate(${rot}deg) scale(${s})`;

// ring ticks: 72 marks, every 18th is major
otp.querySelector('.otp-ticks').innerHTML = Array.from({ length: 72 }, (_, i) => {
  const major = i % 18 === 0, [a, b] = major ? [146, 168] : [150, 158], deg = i * 5;
  return `<line class="${major ? 'major' : ''}" x1="${polar(deg, a)[0]}" y1="${polar(deg, a)[1]}" x2="${polar(deg, b)[0]}" y2="${polar(deg, b)[1]}"/>`;
}).join('');

function render(value) {
  cells.forEach((c, i) => {
    c.textContent = value[i] || '';
    c.classList.toggle('is-focus', document.activeElement === input && i === Math.min(value.length, 3));
  });
}

input.addEventListener('input', () => {
  if (busy) return;
  input.value = input.value.replace(/\D/g, '').slice(0, 4);
  foot.classList.remove('is-err');
  render(input.value);
  if (input.value.length === 4) submit(input.value);
});
input.addEventListener('focus', () => render(input.value));
input.addEventListener('blur', () => render(input.value));

async function submit(code) {
  busy = true;
  input.blur();
  const ok = await checkCode(code);
  ok ? await spin(code) : await reject();
  busy = false;
}

async function reject() {
  cells.forEach(c => c.classList.add('is-err'));
  row.classList.remove('is-shake'); void row.offsetWidth; row.classList.add('is-shake');
  foot.textContent = 'Wrong code — try again'; foot.classList.add('is-err');
  await wait(700);
  cells.forEach(c => c.classList.remove('is-err'));
  input.value = ''; render(''); input.focus();
}

async function spin(code) {
  // 1 · lift the cells out of the row into absolutely positioned copies
  const hub = orbit.getBoundingClientRect();
  const from = cells.map(c => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2 - hub.left, r.top + r.height / 2 - hub.top]; });
  const flying = cells.map((c, i) => { const el = c.cloneNode(); el.textContent = code[i]; orbit.append(el); place(el, ...from[i]); return el; });
  row.style.visibility = 'hidden';
  otp.querySelector('.otp-sub').style.opacity = 0;
  foot.style.opacity = 0;

  // 2 · take a seat on the ring
  await animate(560, t => {
    ring.style.opacity = t;
    flying.forEach((el, i) => { const [x, y] = polar(SEATS[i], R);
      place(el, from[i][0] + (x - from[i][0]) * t, from[i][1] + (y - from[i][1]) * t, -14 * Math.sin(Math.PI * t), 1 - .22 * t); });
  });

  // 3 · one and a quarter turns, cells lean like spokes and end upright
  await animate(1000, t => {
    const turn = 450 * t;
    ring.style.transform = `rotate(${-120 * t}deg)`;
    flying.forEach((el, i) => place(el, ...polar(SEATS[i] + turn, R), turn * .8 + 34 * Math.sin(Math.PI * t), .78));
  });

  // 4 · the verdict colour lands
  flying.forEach((el, i) => setTimeout(() => el.classList.add('is-lit'), i * 55));
  ring.querySelector('circle').style.stroke = 'rgba(63,224,208,.55)';
  await wait(480);

  // 5 · screw down into a single point
  await animate(460, t => {
    ring.style.opacity = 1 - t;
    flying.forEach((el, i) => { place(el, ...polar(SEATS[i] + 450, R * (1 - t)), 360 + 90 * t, .78 * (1 - .9 * t)); el.style.opacity = 1 - t * t; });
    dot.style.opacity = t; dot.style.transform = `scale(${t})`;
  }, ease.in);
  flying.forEach(el => el.remove());

  // 6 · the point opens into the verified tile
  dot.style.opacity = 0;
  otp.classList.add('is-verified');
  otp.querySelector('.otp-title').textContent = 'Verified';
  burst(14);
  await animate(420, t => { tick.style.opacity = Math.min(1, t * 2); tick.style.scale = t; }, ease.back);
  await animate(380, t => tick.querySelector('path').style.strokeDashoffset = 100 - 100 * t);
}

function burst(n) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'otp-spark'; otp.append(s);
    const a = Math.random() * 360, d = 110 + Math.random() * 90;
    animate(800 + Math.random() * 300, t => {
      s.style.opacity = t < .15 ? t / .15 : 1 - (t - .15) / .85;
      s.style.transform = `translate(${polar(a, d * t).join('px,')}px)`;
    }, t => 1 - (1 - t) ** 3).then(() => s.remove());
  }
}
