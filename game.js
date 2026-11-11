'use strict';
/* =========================================================================
   BONK BALL — a 2-player local dodgebrawl
   Vanilla canvas game. No assets, no dependencies.
   ========================================================================= */

/* ------------------------------ utils ------------------------------ */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const TAU = Math.PI * 2;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function withA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function rr(g, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function starPath(g, r1, r2, points = 5, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = rot + i * Math.PI / points;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}
const INK = '#241335';
const CREAM = '#fff4d8';
const PAPER = '#fffaf0';
const P1C = '#25d9f2';
const P2C = '#ff3ea5';

/* ------------------------------ cast ------------------------------ */
const CHARS = [
  {
    id: 'gloop', name: 'GLOOP', tag: '100% goo. 0% manners.',
    color: '#8fe34f', dark: '#4f9a24', skin: '#e7b184', skinDark: '#c78a5d',
    animal: 'frog', headW: 36, eyeY: -88.5, eyeGap: 9.5, eyeR: 5.2, cost: 0,
  },
  {
    id: 'pickle', name: 'SIR PICKLE', tag: 'Big dill energy.',
    color: '#72cd57', dark: '#357c2f', skin: '#a86b45', skinDark: '#7f4c2d',
    animal: 'croc', headW: 34, eyeY: -88.5, eyeGap: 7.5, eyeR: 4.8, cost: 0,
  },
  {
    id: 'toast', name: 'TOASTY', tag: 'Butter late than never.',
    color: '#f2c47c', dark: '#b47c3e', skin: '#f3c9a0', skinDark: '#cfa276',
    animal: 'lion', headW: 34, eyeY: -82.5, eyeGap: 7, eyeR: 4.8, cost: 150,
  },
  {
    id: 'donut', name: 'DONUT DAN', tag: 'Glazed and confused.',
    color: '#ff9fc4', dark: '#d45c8d', skin: '#df9a78', skinDark: '#bd7455',
    animal: 'pig', headW: 33, eyeY: -84.5, eyeGap: 7, eyeR: 4.6, cost: 250,
  },
  {
    id: 'nugget', name: 'NUGGET NED', tag: 'Crispy outside. Chaos inside.',
    color: '#f5b84d', dark: '#c07f1e', skin: '#cf9564', skinDark: '#a76f42',
    animal: 'chicken', headW: 31, eyeY: -84, eyeGap: 6.5, eyeR: 4.4, cost: 350,
  },
  {
    id: 'egg', name: 'EGGBERT', tag: 'Hard-boiled. Soft-hearted.',
    color: '#fff3e0', dark: '#cfae86', skin: '#f4cbb0', skinDark: '#d0a184',
    animal: 'duck', headW: 32, eyeY: -83.5, eyeGap: 7, eyeR: 4.5, cost: 500,
  },
];
const CHAR_BY_ID = Object.fromEntries(CHARS.map(c => [c.id, c]));
const WEAPONS = {
  gloop: { name: 'SLIMEBALL', color: '#8fe34f', size: 1.0, speed: 1.0, base: 12, spin: 4, shape: 'blob', knock: 1.0, special: 'heavy' },
  pickle: { name: 'FISHBONE', color: '#2ec4b6', size: 0.8, speed: 1.3, base: 5, spin: 12, shape: 'diamond', knock: 0.9, special: 'fast' },
  toast: { name: 'FIREBALL', color: '#ff8c42', size: 1.0, speed: 1.1, base: 10, spin: 12, shape: 'star', knock: 1.0, special: 'explosive' },
  donut: { name: 'DONUT', color: '#ff9fc4', size: 1.4, speed: 0.75, base: 30, spin: 6, shape: 'ring', knock: 1.2, special: 'split' },
  nugget: { name: 'EGG', color: '#fff3a8', size: 1.0, speed: 1.0, base: 10, spin: 8, shape: 'egg', knock: 1.0, special: 'homing' },
  egg: { name: 'FEATHER', color: '#fffaf0', size: 0.7, speed: 1.35, base: 5, spin: 14, shape: 'feather', knock: 0.85, special: 'pierce' },
};
function weaponOf(charId) { return WEAPONS[charId] || WEAPONS.gloop; }
const P_COLORS = [P1C, P2C];

/* ------------------------------ round modifiers ------------------------------ */
const MODS = [
  { id: 'classic', name: 'CLASSIC RULES', desc: 'No funny business. (Allegedly.)' },
  { id: 'bouncy', name: 'SUPER BALL', desc: 'Dodgeballs bounce like caffeinated kangaroos.', bounce: 3, rest: 1.02 },
  { id: 'moon', name: 'MOON SHOES', desc: 'Low gravity. Maximum hang time.', grav: 0.56, jump: 0.78, ballGrav: 0.58 },
  { id: 'speedy', name: 'HYPER SOCKS', desc: 'Everyone moves extra fast. Good luck.', speed: 1.34 },
  { id: 'big', name: 'BIG BALL ENERGY', desc: 'Giant dodgeballs. Giant bonks.', ballSize: 1.5, damage: 1.12 },
  { id: 'storm', name: 'BALL STORM', desc: 'Bonus dodgeballs rain from the sky.', storm: true },
];

/* ------------------------------ upgrades ------------------------------ */
const UPGRADES = {
  speed: { name: 'SPEEDY SNEAKERS', desc: '+5% run speed per level.', max: 3, costs: [60, 130, 230], icon: 'shoe', color: '#ffd23f' },
  jump: { name: 'SPRING HEELS', desc: '+5% jump per level.', max: 3, costs: [60, 130, 230], icon: 'spring', color: '#2ec4b6' },
  power: { name: 'POWER GLOVES', desc: '+8% bonk damage per level.', max: 3, costs: [80, 160, 280], icon: 'fist', color: '#ff8fab' },
  hp: { name: 'IRON BELLY', desc: '+10 max HP per level.', max: 3, costs: [80, 160, 280], icon: 'heart', color: '#25d9f2' },
};
const UPGRADE_IDS = Object.keys(UPGRADES);

/* ------------------------------ achievements ------------------------------ */
const ACHIEVEMENTS = [
  { id: 'random', name: 'RANDOM RUMBLE', desc: 'Start a match with random brawlers.', reward: 20, icon: '🎲' },
  { id: 'first', name: 'FIRST BONK', desc: 'Land your very first hit.', reward: 25, icon: '💥' },
  { id: 'catcher', name: 'NICE CATCH', desc: 'Catch an incoming dodgeball.', reward: 40, icon: '🧤' },
  { id: 'wall', name: 'OFF THE WALL', desc: 'Bonk someone with a bounced ball.', reward: 30, icon: '🪃' },
  { id: 'trick', name: 'TRICK SHOT', desc: 'Hit after two or more bounces.', reward: 60, icon: '🎯' },
  { id: 'untouchable', name: 'UNTOUCHABLE', desc: 'Win a round without getting hit.', reward: 75, icon: '🛡️' },
  { id: 'coin25', name: 'COIN PURSE', desc: 'Collect 25 coins total.', reward: 50, icon: '🪙' },
  { id: 'shopper', name: 'BIG SPENDER', desc: 'Buy an upgrade.', reward: 50, icon: '🛒' },
  { id: 'maxed', name: 'FULLY LOADED', desc: 'Max out any upgrade.', reward: 200, icon: '💪' },
  { id: 'regular', name: 'ARCADE REGULAR', desc: 'Play 5 matches.', reward: 80, icon: '🎟️' },
  { id: 'champion', name: 'CHAMPION', desc: 'Win a match.', reward: 100, icon: '👑' },
  { id: 'sweep', name: 'CLEAN SWEEP', desc: 'Win a match 3–0.', reward: 150, icon: '🧹' },
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/* ------------------------------ save profile ------------------------------ */
const SAVE_KEY = 'bonkball.profile.v1';
function defaultProfile() {
  return {
    upgrades: { speed: 0, jump: 0, power: 0, hp: 0 },
    unlocked: CHARS.map(c => c.id),
    ach: [],
    stats: { matches: 0, wins: 0, hits: 0, catches: 0, coins: 0, ricochets: 0, rounds: 0, botWins: 0 },
    muted: false,
  };
}
function loadProfile() {
  const base = defaultProfile();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return base;
    return {
      ...base, ...p,
      upgrades: { ...base.upgrades, ...(p.upgrades || {}) },
      stats: { ...base.stats, ...(p.stats || {}) },
      unlocked: CHARS.map(c => c.id),
      ach: Array.isArray(p.ach) ? p.ach.filter(id => ACH_BY_ID[id]) : [],
      muted: !!p.muted,
    };
  } catch { return base; }
}
let profile = loadProfile();
let saveTimer = null;
function saveProfile() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); } catch {}
}
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveProfile, 160);
}

function upgradeBonus(key) {
  return profile.upgrades[key] || 0;
}
function maxHpFor() { return 100 + upgradeBonus('hp') * 10; }

/* ------------------------------ dom ------------------------------ */
const $ = sel => document.querySelector(sel);
const el = {
  canvas: $('#game'),
  hud: $('#hud'),
  p1Name: $('#p1Name'), p2Name: $('#p2Name'),
  p1Hp: $('#p1Hp'), p2Hp: $('#p2Hp'),
  p1HpNum: $('#p1HpNum'), p2HpNum: $('#p2HpNum'),
  p1Pips: $('#p1Pips'), p2Pips: $('#p2Pips'),
  roundTag: $('#roundTag'), timer: $('#timer'), modBadge: $('#modBadge'),
  deskHints: $('#deskHints'),
  screenTitle: $('#screenTitle'),
  titleP1Name: $('#titleP1Name'), titleP2Name: $('#titleP2Name'),
  titleP1Canvas: $('#titleP1 .portrait'), titleP2Canvas: $('#titleP2 .portrait'),
  btnPlay: $('#btnPlay'), btnSolo: $('#btnSolo'), btnArcade: $('#btnArcade'), btnHow: $('#btnHow'),
  btnReroll: $('#btnReroll'),
  roundCard: $('#roundCard'), rcRound: $('#rcRound'), rcVs: $('#rcVs'), rcMod: $('#rcMod'),
  rcDesc: $('#rcDesc'), rcCount: $('#rcCount'),
  announce: $('#announce'),
  touch: $('#touch'),
  btnPauseTouch: $('#btnPauseTouch'), btnMute: $('#btnMute'),
  screenEnd: $('#screenEnd'), endWinner: $('#endWinner'), endChar: $('#endChar'),
  endScore: $('#endScore'), endSub: $('#endSub'), endPortrait: $('#endPortrait'),
  earnings: $('#earnings'),
  btnRematch: $('#btnRematch'), btnEndArcade: $('#btnEndArcade'), btnEndMenu: $('#btnEndMenu'),
  screenArcade: $('#screenArcade'), arcadeBody: $('#arcadeBody'), arcadeSub: $('#arcadeSub'),
  btnArcadeClose: $('#btnArcadeClose'),
  screenHow: $('#screenHow'), btnHowClose: $('#btnHowClose'),
  screenPause: $('#screenPause'), btnResume: $('#btnResume'), btnRestart: $('#btnRestart'),
  btnPauseHow: $('#btnPauseHow'), btnPauseMenu: $('#btnPauseMenu'),
  toasts: $('#toasts'),
  tabs: document.querySelectorAll('.tab'),
};
const ctx = el.canvas.getContext('2d');

/* ------------------------------ audio ------------------------------ */
let AC = null, masterGain = null, noiseBuffer = null;
function ensureAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  AC = new C();
  masterGain = AC.createGain();
  masterGain.gain.value = profile.muted ? 0 : 0.34;
  masterGain.connect(AC.destination);
  const len = Math.floor(AC.sampleRate * 1.2);
  noiseBuffer = AC.createBuffer(1, len, AC.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}
function setMuted(m, silent) {
  profile.muted = !!m;
  if (masterGain) masterGain.gain.value = m ? 0 : 0.34;
  el.btnMute.classList.toggle('muted', !!m);
  el.btnMute.setAttribute('aria-pressed', m ? 'true' : 'false');
  el.btnMute.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
  el.btnMute.title = m ? 'Unmute sound' : 'Mute sound';
  if (!silent) { saveSoon(); if (!m) ensureAudio(); }
}
function blip(freq, dur, type = 'sine', vol = 0.18, slide = 0, delay = 0) {
  if (!AC || profile.muted) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator(), gn = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(35, freq + slide), t0 + dur);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(masterGain);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function noiseBurst(dur, vol = 0.18, freq = 1100, delay = 0, type = 'bandpass', slideTo) {
  if (!AC || profile.muted || !noiseBuffer) return;
  const t0 = AC.currentTime + delay;
  const src = AC.createBufferSource();
  src.buffer = noiseBuffer;
  const f = AC.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t0);
  if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const gn = AC.createGain();
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(gn); gn.connect(masterGain);
  src.start(t0); src.stop(t0 + dur + 0.02);
}
const sfx = {
  ui() { blip(620, 0.06, 'triangle', 0.12, 120); },
  throwBall(charge) {
    noiseBurst(0.1, 0.09 + charge * 0.07, 700 + charge * 900, 0, 'bandpass', 2400);
    blip(260 + charge * 120, 0.11, 'triangle', 0.12, -110);
  },
  jump() { blip(300, 0.14, 'sine', 0.13, 260); },
  land() { noiseBurst(0.06, 0.05, 320, 0, 'lowpass'); },
  bonk(power = 1) {
    noiseBurst(0.16, 0.16, 520, 0, 'lowpass', 140);
    blip(150, 0.13, 'square', 0.1, -60);
    blip(320, 0.05, 'triangle', 0.08, 160);
  },
  catchBall() {
    blip(760, 0.06, 'square', 0.1, 200);
    blip(1180, 0.12, 'sine', 0.13, 240, 0.04);
  },
  coin() { blip(1046, 0.07, 'square', 0.09); blip(1568, 0.11, 'sine', 0.1, 0, 0.06); },
  heart() { blip(500, 0.1, 'sine', 0.11, 220); blip(760, 0.14, 'triangle', 0.1, 180, 0.07); },
  count() { blip(460, 0.1, 'square', 0.12); },
  fight() { blip(520, 0.12, 'square', 0.15, 180); blip(880, 0.22, 'square', 0.13, 220, 0.1); },
  ko() {
    blip(360, 0.5, 'sawtooth', 0.14, -260);
    noiseBurst(0.5, 0.18, 900, 0, 'bandpass', 200);
    for (let i = 0; i < 6; i++) noiseBurst(0.08, 0.04, 1500, 0.25 + i * 0.09, 'bandpass', 900);
  },
  win() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => blip(f, 0.22, 'triangle', 0.13, 0, i * 0.11));
  },
  ach() {
    [659, 784, 988, 1318].forEach((f, i) => blip(f, 0.16, 'square', 0.08, 0, i * 0.07));
  },
  buy() {
    blip(660, 0.07, 'square', 0.1); blip(990, 0.12, 'sine', 0.12, 0, 0.06);
    noiseBurst(0.08, 0.05, 2000, 0.02);
  },
};

/* ------------------------------ world state ------------------------------ */
let W = 0, H = 0, DPR = 1, S = 1;
let isTouch = false, apron = 0, floorY = 0, arenaTop = 0;
let arena = { left: 0, right: 0, top: 0, bottom: 0 };
let platforms = [];
let skyGrad = null, vignetteGrad = null;

let state = 'title';           // title | countdown | play | roundEnd | matchEnd
let paused = false;
let modalOpen = false;
let match = null;              // { mode, chars, scores, round, damageTaken, ... }
let players = [];
let balls = [];
let particles = [];
let floaters = [];
let pickups = [];
let confetti = [];
let titleChars = [];
let roundMod = MODS[0];
let roundTime = 0;
let countdown = 0;
let roundEndT = 0;
let endDelay = 0;
let endShown = false;
let roundWinner = null;
let matchEarnings = null;
let roundDamage = [0, 0];
let shake = 0, shakeX = 0, shakeY = 0;
let hitstop = 0;
let timeScale = 1, timeScaleTarget = 1, slowmoT = 0;
let gameT = 0;
let lastFrame = 0;
let stormTimer = 0, heartTimer = 0;
let countdownLabel = '';
let lastTimerLabel = '';

/* decor */
let stars = [], clouds = [], buildingsFar = [], buildingsNear = [], ambientConfetti = [];

/* ------------------------------ layout ------------------------------ */
function computeLayout() {
  const prevW = W, prevH = H, prevFloor = floorY;
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  el.canvas.width = Math.round(W * DPR);
  el.canvas.height = Math.round(H * DPR);
  el.canvas.style.width = W + 'px';
  el.canvas.style.height = H + 'px';

  isTouch = window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
  document.body.classList.toggle('touch', isTouch);
  S = clamp(Math.sqrt(W * H) / 860, 0.66, 1.3);
  apron = isTouch ? clamp(H * 0.27, 96, 134) : clamp(H * 0.075, 44, 66);
  arenaTop = isTouch ? 78 : 96;
  floorY = H - apron;
  const margin = isTouch ? 14 : 24;
  arena = { left: margin, right: W - margin, top: arenaTop, bottom: floorY };

  skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(200, floorY));
  skyGrad.addColorStop(0, '#3a1e66');
  skyGrad.addColorStop(0.38, '#8a3a8d');
  skyGrad.addColorStop(0.64, '#f56d73');
  skyGrad.addColorStop(0.85, '#ffb35e');
  skyGrad.addColorStop(1, '#ffe29a');
  vignetteGrad = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.2, W / 2, H * 0.5, Math.max(W, H) * 0.78);
  vignetteGrad.addColorStop(0, 'rgba(20,8,35,0)');
  vignetteGrad.addColorStop(0.72, 'rgba(20,8,35,0.12)');
  vignetteGrad.addColorStop(1, 'rgba(20,8,35,0.55)');

  rebuildDecor();
  if (prevW && (prevW !== W || prevH !== H)) {
    const sx = W / prevW;
    const sy = H / prevFloor;
    for (const p of players) {
      p.x *= sx;
      p.y = prevFloor ? p.y * sy : floorY;
      p.y = Math.min(p.y, floorY);
    }
    for (const b of balls) { b.x *= sx; b.y *= sy; }
    for (const pk of pickups) { pk.x *= sx; pk.y = Math.min(pk.y * sy, floorY - 20); }
    if (state === 'title' || state === 'matchEnd') generatePlatforms();
  }
}

function generatePlatforms() {
  const bw = arena.right - arena.left;
  const mirror = Math.random() < 0.5;
  const w = [
    clamp(250 * S, bw * 0.22, bw * 0.34),
    clamp(215 * S, bw * 0.20, bw * 0.30),
    clamp(185 * S, bw * 0.17, bw * 0.26),
  ];

  // Keep the lowest ledge above a brawler's head (plus badge) and keep every
  // step within a single jump. Short/landscape screens get fewer ledges rather
  // than a cramped stack that clips through the fighters.
  const step = 125 * S;
  const maxRise = Math.max(step, floorY - (arena.top + 54 * S));
  let levels = 1;
  if (maxRise >= step * 2) levels = 2;
  if (maxRise >= step * 3) levels = 3;

  // Chain the platforms horizontally so each one overlaps the next.
  const xs = [arena.left + bw * 0.05];
  for (let i = 1; i < levels; i++) {
    xs[i] = Math.min(xs[i - 1] + w[i - 1] - w[i] * 0.34, arena.right - w[i] - 10);
  }

  platforms = [];
  for (let i = 0; i < levels; i++) {
    platforms.push({
      x: xs[i],
      y: floorY - step * (i + 1),
      w: w[i],
      h: 18 * S,
      style: i,
      vx: (i % 2 === 0 ? 1 : -1) * rand(40, 110) * S,
    });
  }

  if (mirror) {
    for (const p of platforms) p.x = arena.left + (arena.right - p.x - p.w);
  }
  for (const p of platforms) {
    p.x = clamp(p.x, arena.left + 8, arena.right - p.w - 8);
    p.y = Math.max(p.y, arena.top + 54 * S);
  }
}

function rebuildDecor() {
  stars = Array.from({ length: 34 }, () => ({
    x: rand(0, W), y: rand(arenaTop, floorY * 0.45), r: rand(0.5, 1.6) * Math.max(0.8, S),
    ph: rand(0, TAU), sp: rand(0.4, 1.6),
  }));
  clouds = Array.from({ length: 4 }, (_, i) => ({
    x: rand(-100, W), y: arenaTop + rand(30, Math.max(90, (floorY - arenaTop) * 0.35)),
    s: rand(0.7, 1.35) * clamp(S, 0.7, 1.2), sp: rand(3, 9), a: rand(0.1, 0.24), ph: rand(0, TAU),
  }));
  buildingsFar = []; buildingsNear = [];
  let x = -30;
  while (x < W + 60) {
    const w = rand(34, 88) * clamp(S, 0.8, 1.2);
    const h = rand(70, 190) * clamp(S, 0.8, 1.2);
    buildingsFar.push({ x, w, h, seed: rand(0, 100) });
    x += w + rand(5, 18);
  }
  x = -40;
  while (x < W + 60) {
    const w = rand(44, 110) * clamp(S, 0.8, 1.2);
    const h = rand(40, 130) * clamp(S, 0.8, 1.2);
    buildingsNear.push({ x, w, h, seed: rand(0, 100) });
    x += w + rand(8, 24);
  }
  ambientConfetti = Array.from({ length: 20 }, () => ({
    x: rand(0, W), y: rand(arenaTop, floorY), vy: rand(8, 26), vx: rand(-8, 8),
    rot: rand(0, TAU), spin: rand(-2, 2), w: rand(4, 8) * clamp(S, 0.7, 1.2),
    color: pick(['#ffd23f', '#ff5d5d', '#2ec4b6', '#ff8fab', '#fff4d8']), ph: rand(0, TAU),
  }));
}

/* ------------------------------ helpers ------------------------------ */
function charOf(p) { return p.char; }
function nameOf(p) { return p.char.name; }
function playerColor(p) { return P_COLORS[p.idx]; }
function getOpponent(p) { return players[1 - p.idx]; }
function runSpeedFor() {
  let v = 330 * S;
  v *= 1 + 0.05 * upgradeBonus('speed');
  v *= roundMod.speed || 1;
  return v;
}
function gravityFor() {
  return 2100 * S * (roundMod.grav || 1);
}
function jumpSpeedFor() {
  return 790 * S * (roundMod.jump || 1) * (1 + 0.05 * upgradeBonus('jump'));
}
function ballGravityFor() {
  return 1650 * S * (roundMod.ballGrav || 1);
}
function handPoint(p) {
  const opp = getOpponent(p);
  const dir = opp ? (Math.sign(opp.x - p.x) || p.facing) : p.facing;
  const charging = p.charging;
  return {
    x: p.x + dir * (charging ? 14 : 23) * S,
    y: p.y - (charging ? 36 : 34) * S,
    dir,
  };
}
function aimTarget(p) {
  const opp = getOpponent(p);
  if (!opp) return { x: p.x + p.facing * 300 * S, y: p.y - 40 * S, vx: 0, vy: 0 };
  return { x: opp.x, y: opp.y - 40 * S, vx: 0, vy: 0 };
}
function throwPlan(p, charge) {
  const h = handPoint(p);
  const t = aimTarget(p);
  const dx = t.x - h.x, dy = t.y - h.y;
  let T = clamp(Math.hypot(dx, dy) / (1080 * S), 0.34, 0.76);
  const tx = t.x;
  const ty = t.y;
  const g = ballGravityFor();
  const vx = (tx - h.x) / T;
  const vy = (ty - h.y - 0.5 * g * T * T) / T;
  return { vx, vy, T, g, hand: h, tx, ty };
}

/* ------------------------------ drawing: primitives ------------------------------ */
function outlineText(g, text, x, y, size, fill, ink = INK, line = 7, align = 'center', font = 'Bungee') {
  g.font = `${size}px ${font}, "Trebuchet MS", sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = line;
  g.strokeStyle = ink;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

/* ------------------------------ particles / fx ------------------------------ */
function addParticle(o) {
  if (particles.length > 460) return;
  particles.push({
    x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
    life: o.life || 0.5, max: o.life || 0.5, size: o.size || 4,
    color: o.color || CREAM, kind: o.kind || 'dot', grav: o.grav ?? 900,
    rot: o.rot || 0, spin: o.spin || 0, drag: o.drag ?? 1, alpha: o.alpha ?? 1,
  });
}
function burst(x, y, color, n = 10, power = 1, kind = 'star') {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(60, 330) * power * S;
    addParticle({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * S,
      life: rand(0.35, 0.8), size: rand(3, 8) * S, color: i % 3 === 0 ? CREAM : color,
      kind: i % 2 === 0 ? kind : 'dot', grav: 700 * S, spin: rand(-8, 8), drag: 0.94,
    });
  }
}
function dust(x, y, n = 6, color = 'rgba(255,244,216,.55)') {
  for (let i = 0; i < n; i++) {
    addParticle({
      x: x + rand(-12, 12) * S, y: y - rand(0, 8) * S,
      vx: rand(-70, 70) * S, vy: rand(-80, -20) * S,
      life: rand(0.3, 0.55), size: rand(3, 7) * S, color, kind: 'dot', grav: -20 * S, drag: 0.9,
    });
  }
}
function confettiBurst(x, y, n = 30) {
  for (let i = 0; i < n; i++) {
    const a = rand(-Math.PI, 0);
    const sp = rand(120, 520) * S;
    addParticle({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.8, 1.7), size: rand(4, 9) * S,
      color: pick(['#ffd23f', '#ff5d5d', '#2ec4b6', '#ff8fab', '#fff4d8', '#b48cff']),
      kind: 'rect', grav: 620 * S, rot: rand(0, TAU), spin: rand(-12, 12), drag: 0.985,
    });
  }
}
function addFloater(text, x, y, color = CREAM, size = 30, rot = 0) {
  floaters.push({ text, x, y, color, size: size * S, life: 0.95, max: 0.95, rot, vy: -90 * S });
}
function shakeIt(v) { shake = Math.max(shake, v); }
