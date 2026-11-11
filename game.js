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
const P_COLORS = [P1C, P2C];

/* ------------------------------ weapons ------------------------------ */
const WEAPONS = [
  {
    id: 'ball', name: 'DODGEBALL', short: 'BALL', icon: 'ball',
    desc: 'The classic. Balanced arc, honest bonk.',
    color: '#ff5d5d', accent: '#fff4d8',
    speed: 1160, gravity: 1, drag: 0.9995,
    radius: 10, chargeRadius: 8,
    damage: 15, chargeDamage: 18,
    knock: 1, spin: 7,
  },
  {
    id: 'frisbee', name: 'FRISBEE', short: 'DISC', icon: 'frisbee',
    desc: 'Fast and flat. Low damage, high style.',
    color: '#2ec4b6', accent: '#fff4d8',
    speed: 1580, gravity: 0.16, drag: 0.998,
    radius: 8, chargeRadius: 5,
    damage: 10, chargeDamage: 10,
    knock: 0.7, spin: 16,
  },
  {
    id: 'bomb', name: 'BOMB', short: 'BOMB', icon: 'bomb',
    desc: 'Lob it. Everything nearby goes boom.',
    color: '#3a2154', accent: '#ff5d5d',
    speed: 940, gravity: 1.18, drag: 0.9995,
    radius: 11, chargeRadius: 6,
    damage: 0, chargeDamage: 0,
    blastDamage: 24, blastRadius: 98,
    knock: 1.1, spin: 3,
  },
  {
    id: 'bowl', name: 'BOWLING BALL', short: 'BOWL', icon: 'bowl',
    desc: 'Heavy, slow, and deeply rude.',
    color: '#4b2d7f', accent: '#ffd23f',
    speed: 1000, gravity: 1.45, drag: 0.9995,
    radius: 13, chargeRadius: 9,
    damage: 25, chargeDamage: 17,
    knock: 1.5, spin: 4,
  },
];
const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

/* ------------------------------ maps ------------------------------ */
const MAPS = [
  {
    id: 'rooftop', name: 'SUNSET ROOFTOP', tag: 'HIGH-ALTITUDE BONKING',
    sky: ['#3a1e66', '#8a3a8d', '#f56d73', '#ffb35e', '#ffe29a'],
    sun: '#ffedb0', glow: 'rgba(255,199,110,.16)',
    far: 'rgba(73,42,104,.72)', near: 'rgba(46,24,73,.9)',
    window: 'rgba(255,218,130,.22)',
    floor: '#1d1030', floor2: '#462669', platform: '#e2ab60', platformTop: '#ffe0a0',
    accent: '#ffd23f', checker: ['#ff8a5c', '#ffe3a1'],
    platformStyle: 'wood', decor: 'city',
    layout: [
      { fx: 0.05, fy: 1, fw: 0.32, motion: 'x' },
      { fx: 0.42, fy: 2, fw: 0.28, motion: 'y' },
      { fx: 0.70, fy: 3, fw: 0.24, motion: null },
    ],
  },
  {
    id: 'harbor', name: 'NEON HARBOR', tag: 'DOCKSIDE DODGEBALL',
    sky: ['#06162e', '#0c3557', '#14707a', '#2ab39a', '#a8f0cf'],
    sun: '#bfffe9', glow: 'rgba(80,255,220,.18)',
    far: 'rgba(10,46,72,.8)', near: 'rgba(6,28,48,.94)',
    window: 'rgba(120,255,230,.3)',
    floor: '#061826', floor2: '#0d3b52', platform: '#2f8f9d', platformTop: '#8ff5e2',
    accent: '#5fffe0', checker: ['#18a2a0', '#bfffe9'],
    platformStyle: 'metal', decor: 'harbor',
    layout: [
      { fx: 0.06, fy: 1, fw: 0.36, motion: 'x' },
      { fx: 0.50, fy: 1, fw: 0.26, motion: null },
      { fx: 0.30, fy: 2, fw: 0.30, motion: 'y' },
      { fx: 0.62, fy: 3, fw: 0.22, motion: 'x' },
    ],
  },
  {
    id: 'temple', name: 'JUNGLE TEMPLE', tag: 'ANCIENT BONK RUINS',
    sky: ['#0d2417', '#1d4a2c', '#4c8738', '#b7c95a', '#ffe9a8'],
    sun: '#fff0a8', glow: 'rgba(255,236,150,.18)',
    far: 'rgba(24,62,36,.78)', near: 'rgba(12,38,22,.92)',
    window: 'rgba(255,236,150,.24)',
    floor: '#0c2414', floor2: '#1e4a2b', platform: '#a8894f', platformTop: '#e8d39a',
    accent: '#ffe066', checker: ['#4f8b3a', '#e8d39a'],
    platformStyle: 'stone', decor: 'temple',
    layout: [
      { fx: 0.04, fy: 1, fw: 0.28, motion: 'x' },
      { fx: 0.38, fy: 1, fw: 0.28, motion: null },
      { fx: 0.22, fy: 2, fw: 0.26, motion: 'y' },
      { fx: 0.60, fy: 2, fw: 0.24, motion: 'x' },
      { fx: 0.38, fy: 3, fw: 0.24, motion: null },
    ],
  },
];
const MAP_BY_ID = Object.fromEntries(MAPS.map(m => [m.id, m]));

/* ------------------------------ round modifiers ------------------------------ */
const MODS = [
  { id: 'classic', name: 'CLASSIC RULES', desc: 'No funny business. (Allegedly.)' },
  { id: 'moon', name: 'MOON SHOES', desc: 'Low gravity. Maximum hang time.', grav: 0.56, jump: 0.78, ballGrav: 0.58 },
  { id: 'speedy', name: 'HYPER SOCKS', desc: 'Everyone moves extra fast. Good luck.', speed: 1.34 },
  { id: 'big', name: 'BIG BALL ENERGY', desc: 'Giant projectiles. Giant bonks.', ballSize: 1.5, damage: 1.12 },
  { id: 'storm', name: 'BALL STORM', desc: 'Bonus projectiles rain from the sky.', storm: true },
  { id: 'glass', name: 'GLASS CANNON', desc: 'Everything hits much harder. Yikes.', damage: 1.55 },
];

/* ------------------------------ achievements ------------------------------ */
const ACHIEVEMENTS = [
  { id: 'random', name: 'RANDOM RUMBLE', desc: 'Start a match with random brawlers.', reward: 20, icon: '🎲' },
  { id: 'first', name: 'FIRST BONK', desc: 'Land your very first hit.', reward: 25, icon: '💥' },
  { id: 'catcher', name: 'NICE CATCH', desc: 'Catch an incoming projectile.', reward: 40, icon: '🧤' },
  { id: 'demolition', name: 'DEMOLITION', desc: 'KO someone with a bomb.', reward: 80, icon: '💣' },
  { id: 'heavy', name: 'HEAVY HITTER', desc: 'KO someone with a bowling ball.', reward: 80, icon: '🎳' },
  { id: 'sniper', name: 'LONG SHOT', desc: 'Land a hit from across the arena.', reward: 60, icon: '🎯' },
  { id: 'untouchable', name: 'UNTOUCHABLE', desc: 'Win a round without getting hit.', reward: 75, icon: '🛡️' },
  { id: 'coin25', name: 'COIN PURSE', desc: 'Collect 25 coins total.', reward: 50, icon: '🪙' },
  { id: 'regular', name: 'ARCADE REGULAR', desc: 'Play 5 matches.', reward: 80, icon: '🎟️' },
  { id: 'champion', name: 'CHAMPION', desc: 'Win a match.', reward: 100, icon: '👑' },
  { id: 'sweep', name: 'CLEAN SWEEP', desc: 'Win a match 3–0.', reward: 150, icon: '🧹' },
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/* ------------------------------ save profile ------------------------------ */
const SAVE_KEY = 'bonkball.profile.v1';
function defaultProfile() {
  return {
    gold: 150,
    unlocked: ['gloop', 'pickle'],
    ach: [],
    stats: { matches: 0, wins: 0, hits: 0, catches: 0, coins: 0, rounds: 0, botWins: 0 },
    muted: false,
    controls: 'buttons',
    weapons: ['ball', 'ball'],
  };
}
function loadProfile() {
  const base = defaultProfile();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return base;
    const weapons = Array.isArray(p.weapons) && p.weapons.length === 2 && p.weapons.every(id => WEAPON_BY_ID[id])
      ? p.weapons.slice()
      : base.weapons.slice();
    return {
      ...base, ...p,
      stats: { ...base.stats, ...(p.stats || {}) },
      unlocked: Array.isArray(p.unlocked) && p.unlocked.length ? p.unlocked.filter(id => CHAR_BY_ID[id]) : base.unlocked,
      ach: Array.isArray(p.ach) ? p.ach.filter(id => ACH_BY_ID[id]) : [],
      gold: Number.isFinite(p.gold) ? Math.max(0, Math.floor(p.gold)) : base.gold,
      muted: !!p.muted,
      controls: p.controls === 'sliders' ? 'sliders' : 'buttons',
      weapons,
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

function maxHpFor() { return 100; }

/* ------------------------------ dom ------------------------------ */
const $ = sel => document.querySelector(sel);
const el = {
  canvas: $('#game'),
  hud: $('#hud'),
  p1Name: $('#p1Name'), p2Name: $('#p2Name'),
  p1Hp: $('#p1Hp'), p2Hp: $('#p2Hp'),
  p1HpNum: $('#p1HpNum'), p2HpNum: $('#p2HpNum'),
  p1Pips: $('#p1Pips'), p2Pips: $('#p2Pips'),
  p1Weapon: $('#p1Weapon'), p2Weapon: $('#p2Weapon'),
  roundTag: $('#roundTag'), timer: $('#timer'), modBadge: $('#modBadge'),
  deskHints: $('#deskHints'),
  screenTitle: $('#screenTitle'),
  titleP1Name: $('#titleP1Name'), titleP2Name: $('#titleP2Name'),
  titleP1Weapon: $('#titleP1Weapon'), titleP2Weapon: $('#titleP2Weapon'),
  weaponsP1: $('#weaponsP1'), weaponsP2: $('#weaponsP2'),
  titleP1Canvas: $('#titleP1 .portrait'), titleP2Canvas: $('#titleP2 .portrait'),
  btnPlay: $('#btnPlay'), btnSolo: $('#btnSolo'), btnArcade: $('#btnArcade'), btnHow: $('#btnHow'),
  btnReroll: $('#btnReroll'),
  ctrlSeg: $('#ctrlSeg'), pauseCtrlSeg: $('#pauseCtrlSeg'),
  mapTitle: $('#mapTitle'),
  goldTitle: $('#goldTitle'), goldArcade: $('#goldArcade'),
  roundCard: $('#roundCard'), rcRound: $('#rcRound'), rcVs: $('#rcVs'), rcMod: $('#rcMod'),
  rcDesc: $('#rcDesc'), rcCount: $('#rcCount'), rcMap: $('#rcMap'),
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
  throwBall(charge, weapon) {
    const id = weapon && weapon.id;
    if (id === 'frisbee') {
      noiseBurst(0.16, 0.07 + charge * 0.04, 1900, 0, 'bandpass', 900);
      blip(880 + charge * 160, 0.08, 'triangle', 0.07, 120);
    } else if (id === 'bomb') {
      blip(180 + charge * 80, 0.13, 'square', 0.09, -60);
      noiseBurst(0.1, 0.05, 500, 0, 'lowpass', 260);
    } else if (id === 'bowl') {
      noiseBurst(0.14, 0.12, 280, 0, 'lowpass', 90);
      blip(120, 0.12, 'triangle', 0.11, -50);
    } else {
      noiseBurst(0.1, 0.09 + charge * 0.07, 700 + charge * 900, 0, 'bandpass', 2400);
      blip(260 + charge * 120, 0.11, 'triangle', 0.12, -110);
    }
  },
  crush(weapon) {
    const id = weapon && weapon.id;
    if (id === 'frisbee') {
      noiseBurst(0.08, 0.08, 2600, 0, 'highpass', 1400);
      blip(1200, 0.06, 'square', 0.06, -300);
    } else if (id === 'bowl') {
      noiseBurst(0.18, 0.16, 220, 0, 'lowpass', 70);
      blip(90, 0.16, 'square', 0.1, -40);
    } else {
      noiseBurst(0.12, 0.1, 600, 0, 'bandpass', 200);
      blip(220, 0.09, 'triangle', 0.07, -100);
    }
  },
  boom() {
    noiseBurst(0.38, 0.24, 420, 0, 'lowpass', 60);
    blip(90, 0.34, 'sawtooth', 0.16, -50);
    blip(180, 0.18, 'square', 0.09, -80, 0.03);
    for (let i = 0; i < 5; i++) noiseBurst(0.09, 0.05, 1200, 0.08 + i * 0.05, 'bandpass', 300);
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
let titleWeapons = (profile.weapons || ['ball', 'ball']).slice();
let currentMap = MAPS[0];
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
let stormTimer = 0, coinTimer = 0, heartTimer = 0;
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

  isTouch = window.matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('touch', isTouch);
  const portraitBoost = H > W * 1.15 ? 1.26 : 1;
  S = clamp((Math.sqrt(W * H) / 860) * portraitBoost, 0.66, 1.35);
  apron = isTouch ? clamp(H * 0.27, 96, 134) : clamp(H * 0.075, 44, 66);
  arenaTop = isTouch ? 78 : 96;
  floorY = H - apron;
  const margin = isTouch ? 14 : 24;
  arena = { left: margin, right: W - margin, top: arenaTop, bottom: floorY };

  applyMapTheme();
  rebuildDecor();
  if (prevW && (prevW !== W || prevH !== H)) {
    const sx = W / prevW;
    const sy = prevFloor ? floorY / prevFloor : 1;
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

function applyMapTheme() {
  const map = currentMap || MAPS[0];
  skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(200, floorY));
  const stops = [0, 0.38, 0.64, 0.85, 1];
  map.sky.forEach((c, i) => skyGrad.addColorStop(stops[i] ?? i / (map.sky.length - 1), c));
  vignetteGrad = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.2, W / 2, H * 0.5, Math.max(W, H) * 0.78);
  vignetteGrad.addColorStop(0, 'rgba(20,8,35,0)');
  vignetteGrad.addColorStop(0.72, 'rgba(20,8,35,0.12)');
  vignetteGrad.addColorStop(1, map.decor === 'temple' ? 'rgba(6,20,10,0.58)' : 'rgba(20,8,35,0.55)');
}

function useMap(id) {
  currentMap = MAP_BY_ID[id] || MAPS[0];
  applyMapTheme();
  rebuildDecor();
}

function generatePlatforms() {
  const bw = arena.right - arena.left;
  const step = 122 * S;
  const maxRise = Math.max(step, floorY - (arena.top + 54 * S));
  let levels = 1;
  if (maxRise >= step * 2) levels = 2;
  if (maxRise >= step * 3) levels = 3;

  const specs = (currentMap.layout || MAPS[0].layout).filter(s => s.fy <= levels);
  platforms = specs.map((spec, i) => {
    const w = clamp(bw * spec.fw, 150 * S, bw * 0.42);
    let x = arena.left + bw * spec.fx;
    x = clamp(x, arena.left + 8, arena.right - w - 8);
    let y = floorY - step * spec.fy;
    y = Math.max(y, arena.top + 54 * S);
    const pl = {
      x, y, w, h: 12 * S, style: i % 3,
      baseX: x, baseY: y, phase: rand(0, TAU),
      motion: null, dx: 0, dy: 0,
    };
    if (spec.motion === 'x') {
      const roomL = x - arena.left - 12;
      const roomR = arena.right - (x + w) - 12;
      const range = Math.min(62 * S, roomL, roomR);
      if (range > 10 * S) pl.motion = { axis: 'x', range, speed: rand(0.7, 1.05) };
    } else if (spec.motion === 'y') {
      const roomUp = y - (arena.top + 68 * S);
      const roomDown = (floorY - 74 * S) - y;
      const range = Math.min(28 * S, Math.max(0, roomUp), Math.max(0, roomDown));
      if (range > 8 * S) pl.motion = { axis: 'y', range, speed: rand(0.8, 1.2) };
    }
    return pl;
  });
}

function updatePlatforms(dt) {
  for (const pl of platforms) {
    if (!pl.motion) { pl.dx = 0; pl.dy = 0; continue; }
    pl.phase += pl.motion.speed * dt;
    const off = Math.sin(pl.phase) * pl.motion.range;
    const nx = pl.motion.axis === 'x' ? pl.baseX + off : pl.baseX;
    const ny = pl.motion.axis === 'y' ? pl.baseY + off : pl.baseY;
    pl.dx = nx - pl.x;
    pl.dy = ny - pl.y;
    pl.x = nx;
    pl.y = ny;
    for (const p of players) {
      if (p && !p.ko && p.onGround && p.platform === pl) {
        p.x += pl.dx;
        p.y += pl.dy;
        p.x = clamp(p.x, arena.left + 18 * S, arena.right - 18 * S);
      }
    }
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
  return 330 * S * (roundMod.speed || 1);
}
function gravityFor() {
  return 2100 * S * (roundMod.grav || 1);
}
function jumpSpeedFor() {
  return 790 * S * (roundMod.jump || 1);
}
function ballGravityFor() {
  return 1650 * S * (roundMod.ballGrav || 1);
}
function weaponOf(p) {
  return WEAPON_BY_ID[p && p.weaponId] || WEAPONS[0];
}
function throwSpeedFor(weapon, charge) {
  const w = weapon || WEAPONS[0];
  return w.speed * S * (0.82 + 0.42 * clamp(charge || 0, 0, 1));
}
function handPoint(p) {
  const dir = p.facing || 1;
  const charging = p.charging;
  const lift = charging ? Math.sin(clamp(p.aimAngle ?? 0.55, 0, 1.35)) * 10 : 0;
  return {
    x: p.x + dir * (charging ? 15 : 22) * S,
    y: p.y - (48 + lift) * S,
    dir,
  };
}
function throwPlan(p, charge, weapon) {
  const w = weapon || weaponOf(p);
  const h = handPoint(p);
  const angle = clamp(p.aimAngle ?? 0.55, 0.04, 1.35);
  const speed = throwSpeedFor(w, charge);
  return {
    hand: h,
    weapon: w,
    angle,
    vx: Math.cos(angle) * speed * (p.facing || 1),
    vy: -Math.sin(angle) * speed,
    g: ballGravityFor() * w.gravity,
  };
}
function solveAimAngle(p, target, charge, weapon) {
  const w = weapon || weaponOf(p);
  const h = handPoint(p);
  const speed = throwSpeedFor(w, charge);
  const g = ballGravityFor() * w.gravity;
  const X = Math.max(24 * S, Math.abs((target.x || 0) - h.x));
  const Y = -(((target.y || 0) - 40 * S) - h.y);
  const v2 = speed * speed;
  const disc = v2 * v2 - g * (g * X * X + 2 * Y * v2);
  if (disc < 0) return 0.72;
  const root = Math.sqrt(disc);
  const low = Math.atan2(v2 - root, g * X);
  const high = Math.atan2(v2 + root, g * X);
  const a = clamp(Math.min(low, high), 0.1, 1.3);
  return Number.isFinite(a) ? a : 0.72;
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
