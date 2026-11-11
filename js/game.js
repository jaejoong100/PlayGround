import {
  CARS, WEAPONS, ARMOR, PARTS, TURRETS, BASE_MODULES,
  STOPS, ENEMIES, BOSS_NAMES, TIPS
} from './data.js';
import { sound } from './audio.js';

// ═══════════════════════════════════════════════════════════════
//  THE LONG ROAD
//  A 2D road-trip survival / tower-defense game.
// ═══════════════════════════════════════════════════════════════

const SAVE_KEY = 'the-long-road-save-v1';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const dist2 = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;
const fmt = n => Math.round(n).toLocaleString('en-US');

// ── DOM ────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const el = {
  hud: $('hud'), title: $('titleScreen'), garage: $('garageScreen'),
  pause: $('pauseScreen'), end: $('endScreen'), how: $('howScreen'),
  build: $('buildPanel'), toast: $('toast'), banner: $('banner'), flash: $('flash'),
  hudMile: $('hudMile'), hudStop: $('hudStop'), hudLoc: $('hudLoc'),
  hudScrap: $('hudScrap'), routeFill: $('routeFill'), routeMarker: $('routeMarker'),
  routeNodes: $('routeNodes'), healthFill: $('healthFill'), healthText: $('healthText'),
  armorFill: $('armorFill'), armorText: $('armorText'), weaponName: $('weaponName'),
  weaponDot: $('weaponDot'), baseHud: $('baseHud'), baseFill: $('baseFill'),
  baseText: $('baseText'), waveLabel: $('waveLabel'), abilityBtn: $('abilityBtn'),
  abilityIcon: $('abilityIcon'), abilityLabel: $('abilityLabel'), abilityCd: $('abilityCd'),
  hint: $('hint'), buildEyebrow: $('buildEyebrow'), buildTitle: $('buildTitle'),
  buildSub: $('buildSub'), buildScrap: $('buildScrap'), turretCards: $('turretCards'),
  startWaveBtn: $('startWaveBtn'), autoPlaceBtn: $('autoPlaceBtn'),
  garageEyebrow: $('garageEyebrow'), garageTitle: $('garageTitle'),
  garageTagline: $('garageTagline'), garageSummary: $('garageSummary'),
  garageTabs: $('garageTabs'), garageList: $('garageList'), garageScrap: $('garageScrap'),
  garageCar: $('garageCar'), garageCarName: $('garageCarName'), garageCarClass: $('garageCarClass'),
  nextLegBtn: $('nextLegBtn'), continueBtn: $('continueBtn'), continueLabel: $('continueLabel'),
  startBtn: $('startBtn'), resetBtn: $('resetBtn'), howBtn: $('howBtn'), howCloseBtn: $('howCloseBtn'),
  pauseBtn: $('pauseBtn'), resumeBtn: $('resumeBtn'), muteBtn: $('muteBtn'), abandonBtn: $('abandonBtn'),
  pauseStats: $('pauseStats'), endKicker: $('endKicker'), endTitle: $('endTitle'),
  endSub: $('endSub'), endStats: $('endStats'), retryBtn: $('retryBtn'), endTitleBtn: $('endTitleBtn'),
  bannerKicker: $('bannerKicker'), bannerMain: $('bannerMain'), bannerSub: $('bannerSub')
};

// ── canvas sizing ──────────────────────────────────────────────
let W = 0, H = 0, DPR = 1;
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  initWeather();
  buildRouteNodes();
}
window.addEventListener('resize', resize);

// ── state ──────────────────────────────────────────────────────
function emptyParts() {
  return Object.fromEntries(Object.keys(PARTS).map(k => [k, 0]));
}
function freshState() {
  return {
    screen: 'title', mode: 'road',
    stopIndex: 0, distance: 0, checkpointMile: 0,
    scrap: 130, health: 100, armor: 0,
    carId: 'interceptor', ownedCars: ['interceptor'],
    weaponId: 'pistol', ownedWeapons: ['pistol'],
    armorId: 'none', ownedArmors: ['none'],
    parts: emptyParts(),
    turretLevels: { gunner: 1 },
    baseLevels: { hull: 0, hardpoint: 0, ammo: 0, optics: 0, repair: 0, barricade: 0 },
    placedTurrets: [], baseHealth: 0, wave: 0,
    kills: 0, stopsCleared: 0, runTime: 0, muted: false, completed: false,
    lastReward: 0, lastStop: ''
  };
}

let S = freshState();
let stats = null;
let saveData = null;
let paused = false;
let howOpen = false;
let endWin = false;
let deathMode = 'road';
let newRunArmed = false;
let newRunTimer = 0;

function computeStats() {
  const car = CARS[S.carId] || CARS.interceptor;
  const armor = ARMOR[S.armorId] || ARMOR.none;
  const p = id => S.parts[id] || 0;
  return {
    maxHealth: 100 + armor.health + p('fuel') * 12,
    maxArmor: armor.armor + p('plating') * 16,
    speed: car.stats.speed * (1 + p('engine') * 0.07),
    handling: car.stats.handling * (1 + p('tires') * 0.07),
    damageMult: 1 + p('engine') * 0.02 + p('roof') * 0.06,
    fireRate: 1 + p('targeting') * 0.05,
    rangeMult: 1 + p('targeting') * 0.05,
    scrapMult: 1 + p('scavenger') * 0.08,
    ram: 32 * car.stats.ram * (1 + p('ram') * 0.26),
    nitroCd: Math.max(4, 9 - p('nitro') * 1.2),
    collisionMult: Math.max(0.5, 1 - p('suspension') * 0.07),
    heal: 0.25 + p('recovery') * 0.05,
    slowAura: p('horn') * 0.08,
    damageTaken: 1 / car.stats.armor,
    baseMax: 120 + S.baseLevels.hull * 45,
    slots: 3 + S.baseLevels.hardpoint,
    turretDmg: 1 + S.baseLevels.ammo * 0.12,
    turretRange: 1 + S.baseLevels.optics * 0.12,
    repair: S.baseLevels.repair * 0.10,
    barricade: S.baseLevels.barricade * 0.25
  };
}

function recalc(clampValues = true) {
  stats = computeStats();
  if (clampValues) {
    S.health = clamp(S.health, 0, stats.maxHealth);
    S.armor = clamp(S.armor, 0, stats.maxArmor);
  }
}

function saveState() {
  try {
    if (S.screen === 'end' || S.screen === 'title') return;
    const safeWave = (S.mode === 'holdout' && holdout.phase === 'wave')
      ? Math.max(0, holdout.wave - 1)
      : S.wave;
    const copy = { ...S, stats: undefined, wave: safeWave };
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    saveData = copy;
  } catch {}
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const base = freshState();
    const merged = {
      ...base, ...parsed,
      parts: { ...base.parts, ...(parsed.parts || {}) },
      turretLevels: { ...base.turretLevels, ...(parsed.turretLevels || {}) },
      baseLevels: { ...base.baseLevels, ...(parsed.baseLevels || {}) },
      ownedCars: Array.isArray(parsed.ownedCars) ? parsed.ownedCars : base.ownedCars,
      ownedWeapons: Array.isArray(parsed.ownedWeapons) ? parsed.ownedWeapons : base.ownedWeapons,
      ownedArmors: Array.isArray(parsed.ownedArmors) ? parsed.ownedArmors : base.ownedArmors,
      placedTurrets: Array.isArray(parsed.placedTurrets) ? parsed.placedTurrets : []
    };
    return merged;
  } catch { return null; }
}

function updateContinueButton() {
  saveData = readSave();
  const has = !!(saveData && saveData.stopIndex !== undefined && !saveData.completed);
  el.continueBtn.classList.toggle('hidden', !has);
  if (has) {
    const stop = STOPS[Math.min(saveData.stopIndex, STOPS.length - 1)];
    el.continueLabel.textContent = `· ${stop ? stop.name : 'OPEN ROAD'}`;
  }
}

// ── global live data ──────────────────────────────────────────
let enemies = [];
let bullets = [];
let particles = [];
let floaters = [];
let effects = [];
let pickups = [];
let strikes = [];
let roadProps = [];
let weather = [];
let titleAsh = [];

let scroll = 0;
let spawnTimer = 0;
let propTimer = 0;
let fireTimer = 0;
let abilityTimer = 0;
let nitroTime = 0;
let shake = 0;
let shakeX = 0, shakeY = 0;
let time = 0;
let titleTime = 0;
let enemyId = 1;
let hintTimer = 0;
let uiTimer = 0;
let saveTimer = 0;
let gameOver = false;

const car = { x: 0, y: 0, targetX: 0, tilt: 0, prevX: 0 };
const pointer = { x: 0, y: 0, down: false, active: false, lastMove: -99 };
const keys = Object.create(null);
const aim = { x: 0, y: 0 };

const base = { x: 0, y: 0, hp: 120, maxHp: 120, angle: -Math.PI / 2, hit: 0 };
const holdout = {
  phase: 'build', wave: 0, totalWaves: 2, spawnQueue: [], spawnTimer: 0,
  selected: null, placed: [], endTimer: 0, startDelay: 0, waveReward: 0
};

function layout() {
  const roadW = Math.min(W * 0.94, 600);
  const roadX = (W - roadW) / 2;
  return {
    roadW, roadX, cx: W / 2,
    carY: H - Math.max(158, Math.min(210, H * 0.2)),
    baseY: H - Math.max(245, Math.min(310, H * 0.33)),
    margin: Math.max(24, roadW * 0.075)
  };
}

function currentStop() { return STOPS[Math.min(S.stopIndex, STOPS.length - 1)]; }
function palette() { return currentStop().palette; }
function maxMile() { return STOPS[STOPS.length - 1].mile; }

// ── UI helpers ────────────────────────────────────────────────
function syncScreens() {
  el.title.classList.toggle('hidden', S.screen !== 'title');
  el.garage.classList.toggle('hidden', S.screen !== 'garage');
  el.end.classList.toggle('hidden', S.screen !== 'end');
  el.hud.classList.toggle('hidden', !(S.screen === 'road' || S.screen === 'holdout'));
  el.hud.classList.toggle('holdout', S.screen === 'holdout');
  const showBuild = S.screen === 'holdout' && holdout.phase === 'build' && !paused && !gameOver;
  el.build.classList.toggle('hidden', !showBuild);
  el.hud.classList.toggle('build-open', showBuild);
  el.pause.classList.toggle('hidden', !paused);
  if (!howOpen) el.how.classList.add('hidden');
}

function showTitle() {
  S.screen = 'title';
  paused = false;
  gameOver = false;
  sound.engineOn(false);
  updateContinueButton();
  syncScreens();
}

function showGarage() {
  paused = false;
  S.screen = 'garage';
  sound.engineOn(false);
  renderGarage();
  syncScreens();
  saveState();
}

function showEnd(win) {
  endWin = win;
  gameOver = true;
  paused = false;
  S.screen = 'end';
  sound.engineOn(false);
  el.end.classList.toggle('win', win);
  el.end.classList.toggle('lose', !win);
  el.endKicker.textContent = win ? 'ROUTE 66 COMPLETE' : 'RUN ENDED';
  el.endTitle.textContent = win ? 'YOU MADE HAVEN' : 'THE ROAD WINS';
  el.endSub.textContent = win
    ? 'The gate opens. Somewhere behind you, the road keeps feeding.'
    : (deathMode === 'base'
      ? 'The rig is scrap. The horde walks on. The road remembers.'
      : 'The horde got the driver. The road remembers.');
  el.retryBtn.textContent = win ? 'START A NEW RUN' : 'RETRY CHECKPOINT';
  const miles = Math.floor(win ? maxMile() : S.distance);
  el.endStats.innerHTML = `
    <div class="end-stat"><span>MILES</span><b>${fmt(miles)}</b></div>
    <div class="end-stat"><span>STOPS</span><b>${S.stopsCleared} / ${STOPS.length}</b></div>
    <div class="end-stat"><span>KILLS</span><b>${fmt(S.kills)}</b></div>
    <div class="end-stat"><span>SCRAP LEFT</span><b>${fmt(S.scrap)}</b></div>`;
  syncScreens();
  if (win) sound.win(); else sound.lose();
}

function showBanner(kicker, main, sub) {
  el.bannerKicker.textContent = kicker || '';
  el.bannerMain.textContent = main || '';
  el.bannerSub.textContent = sub || '';
  el.banner.classList.remove('show');
  void el.banner.offsetWidth;
  el.banner.classList.add('show');
}

let toastTimer = 0;
function toast(text, ms = 2200) {
  el.toast.textContent = text;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
}

function showHint(text, ms = 4200) {
  el.hint.textContent = text;
  el.hint.classList.add('show');
  hintTimer = ms / 1000;
}

function flashScreen(gold = false) {
  el.flash.classList.remove('on', 'gold');
  void el.flash.offsetWidth;
  if (gold) el.flash.classList.add('gold');
  el.flash.classList.add('on');
}

function buildRouteNodes() {
  const max = maxMile();
  el.routeNodes.innerHTML = STOPS.map(s => `<i style="left:${(s.mile / max) * 100}%"></i>`).join('');
}

function updateHUD() {
  if (!stats) recalc(false);
  const stop = currentStop();
  const inHold = S.mode === 'holdout';
  const prevMile = S.stopIndex === 0 ? 0 : STOPS[S.stopIndex - 1].mile;
  let progress;
  if (inHold) progress = stop.mile / maxMile();
  else progress = clamp((S.distance - prevMile) / Math.max(1, stop.mile - prevMile), 0, 1);
  const routePct = inHold ? (stop.mile / maxMile()) * 100 : (S.distance / maxMile()) * 100;

  el.hudMile.textContent = `MILE ${String(Math.floor(inHold ? stop.mile : S.distance)).padStart(3, '0')}`;
  el.hudStop.textContent = `STOP ${S.stopIndex + 1} / ${STOPS.length}`;
  el.hudLoc.textContent = stop.name;
  el.hudScrap.textContent = fmt(S.scrap);
  el.routeFill.style.width = clamp(routePct, 0, 100) + '%';
  el.routeMarker.style.left = clamp(routePct, 0, 100) + '%';
  const nodes = el.routeNodes.children;
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].classList.toggle('done', i < S.stopIndex || (i === S.stopIndex && inHold));
    nodes[i].classList.toggle('current', i === S.stopIndex);
  }

  const hpPct = clamp(S.health / stats.maxHealth, 0, 1);
  const arPct = stats.maxArmor > 0 ? clamp(S.armor / stats.maxArmor, 0, 1) : 0;
  el.healthFill.style.width = (hpPct * 100) + '%';
  el.armorFill.style.width = (arPct * 100) + '%';
  el.healthText.textContent = Math.ceil(S.health);
  el.armorText.textContent = Math.ceil(S.armor);
  el.healthFill.parentElement.classList.toggle('low', hpPct < 0.3);
  const w = WEAPONS[S.weaponId] || WEAPONS.pistol;
  el.weaponName.textContent = w.name;
  el.weaponDot.style.background = w.color;
  el.weaponDot.style.boxShadow = `0 0 7px ${w.color}`;

  el.baseHud.classList.toggle('hidden', !inHold);
  if (inHold) {
    el.baseText.textContent = Math.ceil(base.hp);
    el.baseFill.style.width = clamp(base.hp / base.maxHp, 0, 1) * 100 + '%';
    el.waveLabel.textContent = holdout.phase === 'wave'
      ? `WAVE ${holdout.wave} / ${holdout.totalWaves} · ${enemies.length + holdout.spawnQueue.length} HOSTILES`
      : `WAVE ${holdout.wave} / ${holdout.totalWaves} · PREPARE`;
  }

  const cd = Math.max(0, abilityTimer);
  el.abilityBtn.classList.toggle('cooling', cd > 0.05);
  el.abilityBtn.classList.toggle('ready', cd <= 0.05);
  el.abilityCd.textContent = Math.ceil(cd);
  el.abilityLabel.textContent = inHold ? 'PULSE' : 'NOS';
  el.abilityIcon.textContent = inHold ? '◎' : '»';

}

// ── route / game transitions ─────────────────────────────────
function startNewRun() {
  sound.ensure();
  S = freshState();
  recalc(false);
  S.health = stats.maxHealth;
  S.armor = stats.maxArmor;
  S.screen = 'road';
  S.mode = 'road';
  S.distance = 0;
  S.checkpointMile = 0;
  saveData = null;
  startRoad(true);
  showBanner('ROUTE 66 · 388 MILES', 'THE LONG ROAD', 'REACH THE DINER · 12 MILES');
  showHint('DRAG TO STEER · YOUR GUN AUTO-FIRES', 5200);
  sound.engineOn(true, 1);
}

function continueRun() {
  const saved = readSave();
  if (!saved) { startNewRun(); return; }
  sound.ensure();
  S = saved;
  recalc(false);
  if (S.screen === 'garage') {
    S.screen = 'garage';
    showGarage();
    return;
  }
  if (S.mode === 'holdout') {
    if ((S.wave || 0) >= currentStop().waves) {
      S.lastReward = S.lastReward || 0;
      showGarage();
      return;
    }
    startHoldout(true);
  } else {
    S.screen = 'road';
    S.mode = 'road';
    startRoad(false);
  }
  toast('RUN RESUMED', 1800);
}

function startRoad(fresh = false) {
  S.mode = 'road';
  S.screen = 'road';
  paused = false;
  gameOver = false;
  enemies = []; bullets = []; pickups = []; strikes = [];
  effects = []; particles = []; floaters = [];
  roadProps = [];
  seedProps();
  spawnTimer = 1.4;
  propTimer = 0;
  fireTimer = 0;
  abilityTimer = Math.max(0, abilityTimer);
  nitroTime = 0;
  const L = layout();
  car.x = L.cx; car.targetX = L.cx; car.prevX = L.cx; car.tilt = 0;
  car.y = L.carY;
  if (S.health <= 0) S.health = stats.maxHealth * 0.7;
  if (S.armor <= 0) S.armor = stats.maxArmor * 0.4;
  S.health = clamp(S.health, 1, stats.maxHealth);
  S.armor = clamp(S.armor, 0, stats.maxArmor);
  S.distance = clamp(S.distance, S.checkpointMile, currentStop().mile);
  initWeather();
  syncScreens();
  sound.engineOn(true, 1);
  saveState();
  updateHUD();
}

function arriveAtStop() {
  S.distance = currentStop().mile;
  enemies = []; bullets = []; pickups = [];
  effects = [];
  sound.engineOn(false);
  S.armor = stats.maxArmor;
  S.placedTurrets = [];
  startHoldout(false);
  showBanner(`STOP ${S.stopIndex + 1} OF ${STOPS.length}`, currentStop().name, currentStop().tagline);
}

function startHoldout(resume = false) {
  S.mode = 'holdout';
  S.screen = 'holdout';
  paused = false;
  gameOver = false;
  const stop = currentStop();
  base.maxHp = stats.baseMax;
  if (resume && S.baseHealth > 0) {
    base.hp = clamp(S.baseHealth, 1, base.maxHp);
    holdout.wave = clamp(S.wave || 0, 0, stop.waves);
  } else {
    base.hp = base.maxHp;
    holdout.wave = 0;
  }
  base.angle = -Math.PI / 2;
  base.hit = 0;
  enemies = []; bullets = []; pickups = []; strikes = [];
  effects = []; particles = []; floaters = [];
  holdout.phase = 'build';
  S.wave = holdout.wave;
  S.baseHealth = base.hp;
  holdout.totalWaves = stop.waves;
  holdout.spawnQueue = [];
  holdout.spawnTimer = 0;
  holdout.selected = null;
  holdout.placed = (resume && Array.isArray(S.placedTurrets) ? S.placedTurrets : [])
    .filter(p => p && TURRETS[p.type] && (S.turretLevels[p.type] || 0) > 0)
    .filter(p => p.slot >= 0 && p.slot < stats.slots);
  holdout.endTimer = 0;
  holdout.startDelay = 0;
  seedProps();
  const L = layout();
  base.x = L.cx;
  base.y = L.baseY;
  aim.x = L.cx; aim.y = L.baseY - 280;
  abilityTimer = Math.max(0, abilityTimer);
  initWeather();
  renderBuildPanel();
  syncScreens();
  updateHUD();
  saveState();
  showHint('SELECT A TURRET · TAP A GLOWING HARDPOINT', 5200);
}

function nextLeg() {
  if (S.stopIndex >= STOPS.length - 1) {
    S.completed = true;
    saveState();
    showEnd(true);
    return;
  }
  S.stopIndex++;
  S.checkpointMile = STOPS[S.stopIndex - 1].mile;
  S.distance = S.checkpointMile;
  S.health = Math.min(stats.maxHealth, S.health + stats.maxHealth * stats.heal);
  S.armor = stats.maxArmor;
  S.wave = 0;
  S.placedTurrets = [];
  S.screen = 'road';
  S.mode = 'road';
  abilityTimer = 0;
  startRoad(false);
  const stop = currentStop();
  showBanner(`LEG ${S.stopIndex + 1} OF ${STOPS.length}`, stop.name.toUpperCase(), `${Math.round(stop.mile - S.checkpointMile)} MILES · KEEP MOVING`);
  showHint('DRAG TO STEER · AUTO-FIRE ONLINE', 3600);
  sound.engineOn(true, 1);
}

function completeStop() {
  const stop = currentStop();
  const bonus = 70 + S.stopIndex * 25;
  S.scrap += bonus;
  S.stopsCleared = Math.max(S.stopsCleared, S.stopIndex + 1);
  S.lastReward = bonus;
  S.lastStop = stop.name;
  S.baseHealth = stats.baseMax;
  S.placedTurrets = holdout.placed.slice();
  S.health = Math.min(stats.maxHealth, S.health + stats.maxHealth * stats.heal);
  S.armor = stats.maxArmor;
  holdout.phase = 'cleared';
  sound.win();
  flashScreen(true);
  showBanner('STOP SECURED', 'THE RIG HOLDS', `+${bonus} SCRAP · GARAGE UNLOCKED`);
  setTimeout(() => {
    if (S.screen === 'holdout' && !paused && !gameOver) showGarage();
  }, 1300);
  saveState();
}

function retryCheckpoint() {
  sound.ensure();
  S.screen = S.mode === 'holdout' ? 'holdout' : 'road';
  S.health = stats.maxHealth * (S.mode === 'holdout' ? 0.85 : 0.7);
  S.armor = stats.maxArmor * 0.5;
  gameOver = false;
  paused = false;
  abilityTimer = 0;
  if (deathMode === 'holdout' || S.mode === 'holdout') {
    S.mode = 'holdout';
    S.baseHealth = 0;
    S.wave = 0;
    S.placedTurrets = [];
    startHoldout(false);
  } else {
    S.mode = 'road';
    S.distance = S.checkpointMile;
    startRoad(false);
  }
  toast('CHECKPOINT RESTORED', 1800);
}

function endRun(reason) {
  if (gameOver) return;
  deathMode = reason === 'base' ? 'holdout' : S.mode;
  S.screen = 'end';
  saveState();
  showEnd(false);
}

function pauseGame() {
  if (paused || gameOver || (S.screen !== 'road' && S.screen !== 'holdout')) return;
  paused = true;
  sound.engineOn(false);
  el.pauseStats.innerHTML = `
    <div class="pause-stat"><span>MILE</span><b>${fmt(S.distance)}</b></div>
    <div class="pause-stat"><span>STOP</span><b>${S.stopIndex + 1} / ${STOPS.length}</b></div>
    <div class="pause-stat"><span>KILLS</span><b>${fmt(S.kills)}</b></div>
    <div class="pause-stat"><span>SCRAP</span><b>${fmt(S.scrap)}</b></div>`;
  el.muteBtn.textContent = `SOUND: ${S.muted ? 'OFF' : 'ON'}`;
  syncScreens();
  saveState();
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  syncScreens();
  if (S.mode === 'road') sound.engineOn(true, 1);
  updateHUD();
}

// ── input ─────────────────────────────────────────────────────
function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

canvas.addEventListener('pointerdown', ev => {
  if (paused || gameOver) return;
  if (S.screen !== 'road' && S.screen !== 'holdout') return;
  ev.preventDefault();
  canvas.setPointerCapture?.(ev.pointerId);
  const p = canvasPoint(ev);
  pointer.x = p.x; pointer.y = p.y; pointer.down = true; pointer.active = true; pointer.lastMove = time;
  if (S.mode === 'road') {
    car.targetX = p.x;
  } else if (S.mode === 'holdout') {
    aim.x = p.x; aim.y = p.y;
    handleHoldoutTap(p.x, p.y);
  }
}, { passive: false });

canvas.addEventListener('pointermove', ev => {
  if (S.screen !== 'road' && S.screen !== 'holdout') return;
  const p = canvasPoint(ev);
  pointer.x = p.x; pointer.y = p.y; pointer.active = true; pointer.lastMove = time;
  if (pointer.down) {
    if (S.mode === 'road') car.targetX = p.x;
    else if (S.mode === 'holdout') { aim.x = p.x; aim.y = p.y; }
  }
});

canvas.addEventListener('pointerup', ev => {
  pointer.down = false;
  try { canvas.releasePointerCapture?.(ev.pointerId); } catch {}
});
canvas.addEventListener('pointercancel', () => { pointer.down = false; });

window.addEventListener('keydown', ev => {
  const k = ev.key.toLowerCase();
  keys[k] = true;
  if (k === 'escape' || k === 'p') { if (paused) resumeGame(); else pauseGame(); }
  if (k === ' ') {
    ev.preventDefault();
    useAbility();
  }
  if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) ev.preventDefault();
});
window.addEventListener('keyup', ev => { keys[ev.key.toLowerCase()] = false; });

window.addEventListener('blur', () => { pointer.down = false; });

// ── main button wiring ────────────────────────────────────────
el.startBtn.addEventListener('click', () => {
  sound.ensure();
  const saved = readSave();
  if (saved && !saved.completed) {
    if (!newRunArmed) {
      newRunArmed = true;
      newRunTimer = 4;
      el.startBtn.textContent = 'TAP AGAIN TO WIPE SAVE';
      return;
    }
  }
  newRunArmed = false;
  el.startBtn.textContent = 'START THE ENGINE';
  startNewRun();
});
el.continueBtn.addEventListener('click', continueRun);
el.resetBtn.addEventListener('click', () => {
  localStorage.removeItem(SAVE_KEY);
  saveData = null;
  updateContinueButton();
  toast('SAVE ERASED', 1800);
  sound.deny();
});
el.howBtn.addEventListener('click', () => { howOpen = true; el.how.classList.remove('hidden'); });
el.howCloseBtn.addEventListener('click', () => { howOpen = false; el.how.classList.add('hidden'); });
el.pauseBtn.addEventListener('click', pauseGame);
el.resumeBtn.addEventListener('click', resumeGame);
el.muteBtn.addEventListener('click', () => {
  S.muted = !S.muted;
  sound.setMuted(S.muted);
  el.muteBtn.textContent = `SOUND: ${S.muted ? 'OFF' : 'ON'}`;
  saveState();
});
el.abandonBtn.addEventListener('click', () => {
  paused = false;
  saveState();
  showTitle();
});
el.abilityBtn.addEventListener('click', useAbility);
el.endTitleBtn.addEventListener('click', () => {
  if (endWin) S = freshState();
  showTitle();
});
el.retryBtn.addEventListener('click', () => {
  if (endWin) { startNewRun(); return; }
  retryCheckpoint();
});
el.nextLegBtn.addEventListener('click', nextLeg);

el.garageTabs.addEventListener('click', ev => {
  const btn = ev.target.closest('button[data-tab]');
  if (!btn) return;
  [...el.garageTabs.children].forEach(b => b.classList.toggle('active', b === btn));
  renderGarageList(btn.dataset.tab);
});

el.garageList.addEventListener('click', ev => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  handleGarageAction(btn.dataset.action, btn.dataset.kind, btn.dataset.id);
});

el.turretCards.addEventListener('click', ev => {
  const card = ev.target.closest('[data-turret]');
  if (!card) return;
  const type = card.dataset.turret;
  if ((S.turretLevels[type] || 0) <= 0) {
    toast('BUY THIS TURRET IN THE GARAGE', 2000);
    sound.deny();
    return;
  }
  holdout.selected = holdout.selected === type ? null : type;
  sound.build();
  renderBuildPanel();
});
el.autoPlaceBtn.addEventListener('click', autoPlace);
el.startWaveBtn.addEventListener('click', () => {
  if (holdout.phase !== 'build') return;
  startWave();
});

// ═══════════════════════════════════════════════════════════════
//  GARAGE
// ═══════════════════════════════════════════════════════════════
const ICONS = {
  car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 14l1.4-4.4A2 2 0 0 1 7.3 8h9.4a2 2 0 0 1 1.9 1.6L20 14v4h-2v-2H6v2H4v-4z"/><path d="M6.5 14h11"/><circle cx="7" cy="16" r="1.2"/><circle cx="17" cy="16" r="1.2"/></svg>`,
  weapon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13h10l3-3h5v3h-2l-2 3H9l-2 3H4l2-4H3z"/><path d="M11 10V7h3v3"/></svg>`,
  armor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3l7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-5"/></svg>`,
  engine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9h3V7h5v2h3l3 2v6H8l-2-3H4z"/><path d="M8 9v5M12 9v5M16 9v5"/></svg>`,
  tire: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/></svg>`,
  plate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h6"/></svg>`,
  ram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 18l4-12 4 12 4-12 4 12"/><path d="M4 18h16"/></svg>`,
  nitro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3h6v4l2 3v10H7V10l2-3V3z"/><path d="M9 7h6M10 14h4"/></svg>`,
  scrap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3l4 5-4 13-4-13 4-5z"/><path d="M8 8h8"/></svg>`,
  chip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>`,
  fuel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h8v18H6z"/><path d="M8 6h4M14 8h3v9a2 2 0 0 1-4 0"/></svg>`,
  spring: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 5h12M6 9h12M6 13h12M6 17h12"/><path d="M8 5v12M16 5v12"/></svg>`,
  rack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h16M4 17h16M7 4v16M17 4v16"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4a5 5 0 0 0-4.7 6.7L4 16l4 4 5.3-5.3A5 5 0 0 0 20 10l-3 3-3-1-1-3 3-3a5 5 0 0 0-2-2z"/></svg>`,
  horn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 10v4h4l7 5V5L8 10H4z"/><path d="M18 9a5 5 0 0 1 0 6M20 6a9 9 0 0 1 0 12"/></svg>`,
  hull: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9l3-4h10l3 4v9H4z"/><path d="M4 13h16M8 9h8"/></svg>`,
  hardpoint: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`,
  ammo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16v12H4z"/><path d="M7 7V4h3v3M14 7V4h3v3M8 11h8M8 15h8"/></svg>`,
  optics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  drone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="6" height="6"/><path d="M9 9L5 5M15 9l4-4M9 15l-4 4M15 15l4 4"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></svg>`,
  barricade: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6l16 12M20 6L4 18"/><path d="M4 4v16M20 4v16"/></svg>`,
  gunner: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="14" r="5"/><path d="M12 9V3M9 6h6M6 14H2M22 14h-4"/></svg>`,
  pyro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2c1 5 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 1 2 2 3 3 3 0-3 1-5 0-7z"/></svg>`,
  tesla: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/></svg>`,
  mortar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 19l7-14 3 2-6 14H5z"/><path d="M14 4l3 2M9 16l3 2"/></svg>`,
  sniper: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12h13l5-3v4l-5 1H2z"/><circle cx="9" cy="9" r="2"/><path d="M5 15l2 4M16 13l2 3"/></svg>`,
  cryo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M4 6l16 12M20 6L4 18"/><path d="M9 4l3 3 3-3M9 20l3-3 3 3"/></svg>`
};
function icon(name) { return ICONS[name] || ICONS.scrap; }

function itemCard({ id, kind, name, tag, desc, stat, iconName, color, action, owned, equipped, locked, pips }) {
  const cls = ['item-card', owned ? 'owned' : '', equipped ? 'equipped' : '', locked ? 'locked' : ''].join(' ');
  return `<article class="${cls}">
    <div class="item-icon" style="--ic:${color || '#ff7a1a'}">${icon(iconName || kind)}</div>
    <div class="item-main">
      <div class="item-name-row"><span class="item-name">${name}</span>${tag ? `<span class="item-tag">${tag}</span>` : ''}</div>
      <div class="item-desc">${desc}</div>
      <div class="item-stat">${stat || ''}${pips || ''}</div>
    </div>
    ${action || ''}
  </article>`;
}

function buyButton(label, cost, action, kind, id, disabled = false, extra = '') {
  return `<button class="buy-btn ${disabled ? 'cant' : ''} ${extra}" data-action="${action}" data-kind="${kind}" data-id="${id}" ${disabled ? 'disabled' : ''}>${label}${cost != null ? `<span class="cost">◆ ${fmt(cost)}</span>` : ''}</button>`;
}

function pipsHTML(level, max) {
  return `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</span>`;
}

function renderGarage() {
  const stop = currentStop();
  el.garageEyebrow.textContent = S.lastReward > 0 ? `STOP ${S.stopIndex + 1} SECURED · +${S.lastReward} SCRAP` : `STOP ${S.stopIndex + 1} · GARAGE`;
  el.garageTitle.textContent = stop.name;
  el.garageTagline.textContent = stop.tagline;
  el.garageScrap.textContent = fmt(S.scrap);
  const carDef = CARS[S.carId];
  el.garageCarName.textContent = carDef.name;
  el.garageCarClass.textContent = carDef.klass;
  el.garageSummary.innerHTML = `
    <span class="summary-chip">HULL <b>${Math.ceil(stats.maxHealth)}</b></span>
    <span class="summary-chip">ARMOR <b>${Math.ceil(stats.maxArmor)}</b></span>
    <span class="summary-chip">SPEED <b>${Math.round(stats.speed * 100)}%</b></span>
    <span class="summary-chip">HANDLING <b>${Math.round(stats.handling * 100)}%</b></span>
    <span class="summary-chip">HARDPOINTS <b>${stats.slots}</b></span>`;
  const active = el.garageTabs.querySelector('button.active')?.dataset.tab || 'cars';
  renderGarageList(active);
  drawGarageCar();
}

function renderGarageList(tab) {
  let html = '';
  if (tab === 'cars') {
    for (const c of Object.values(CARS)) {
      const owned = S.ownedCars.includes(c.id);
      const equipped = S.carId === c.id;
      const can = S.scrap >= c.cost;
      const action = equipped
        ? `<button class="buy-btn owned-label">EQUIPPED</button>`
        : owned
          ? buyButton('EQUIP', null, 'equip-car', 'car', c.id, false, 'equip')
          : buyButton('BUY', c.cost, 'buy-car', 'car', c.id, !can);
      html += itemCard({
        id: c.id, kind: 'car', name: c.name, tag: c.klass, desc: c.desc,
        stat: `SPD ${Math.round(c.stats.speed * 100)} · HDL ${Math.round(c.stats.handling * 100)} · ARM ${Math.round(c.stats.armor * 100)} · RAM ${Math.round(c.stats.ram * 100)}`,
        iconName: 'car', color: c.color, action, owned, equipped, locked: !owned && !can
      });
    }
  } else if (tab === 'weapons') {
    for (const w of Object.values(WEAPONS)) {
      const owned = S.ownedWeapons.includes(w.id);
      const equipped = S.weaponId === w.id;
      const can = S.scrap >= w.cost;
      const action = equipped
        ? `<button class="buy-btn owned-label">EQUIPPED</button>`
        : owned
          ? buyButton('EQUIP', null, 'equip-weapon', 'weapon', w.id, false, 'equip')
          : buyButton('BUY', w.cost, 'buy-weapon', 'weapon', w.id, !can);
      html += itemCard({
        id: w.id, kind: 'weapon', name: w.name, tag: w.short, desc: w.desc,
        stat: w.statline, iconName: 'weapon', color: w.color, action, owned, equipped, locked: !owned && !can
      });
    }
  } else if (tab === 'armor') {
    for (const a of Object.values(ARMOR)) {
      const owned = S.ownedArmors.includes(a.id);
      const equipped = S.armorId === a.id;
      const can = S.scrap >= a.cost;
      const action = equipped
        ? `<button class="buy-btn owned-label">EQUIPPED</button>`
        : owned
          ? buyButton('EQUIP', null, 'equip-armor', 'armor', a.id, false, 'equip')
          : buyButton('BUY', a.cost, 'buy-armor', 'armor', a.id, !can);
      html += itemCard({
        id: a.id, kind: 'armor', name: a.name, tag: 'DRIVER', desc: a.desc,
        stat: a.statline, iconName: 'armor', color: '#6fc8df', action, owned, equipped, locked: !owned && !can
      });
    }
  } else if (tab === 'parts') {
    for (const p of Object.values(PARTS)) {
      const lvl = S.parts[p.id] || 0;
      const cost = Math.round(p.cost * Math.pow(p.growth, lvl));
      const maxed = lvl >= p.max;
      const can = S.scrap >= cost;
      const action = maxed
        ? `<button class="buy-btn owned-label">MAXED</button>`
        : buyButton(lvl === 0 ? 'INSTALL' : 'UPGRADE', cost, 'buy-part', 'part', p.id, !can);
      html += itemCard({
        id: p.id, kind: 'part', name: p.name, tag: `MK ${lvl}`, desc: `${p.effect} · ${p.detail}`,
        stat: pipsHTML(lvl, p.max), iconName: p.icon, color: '#ff9a3d', action,
        owned: lvl > 0, equipped: false, locked: !can && !maxed
      });
    }
  } else if (tab === 'base') {
    html += `<div class="list-section"><span>DEFENSE TURRETS</span><i>PLACE THESE ON THE RIG</i></div>`;
    for (const t of Object.values(TURRETS)) {
      const lvl = S.turretLevels[t.id] || 0;
      const baseCost = t.cost || 120;
      const cost = lvl === 0 ? t.cost : Math.round(baseCost * Math.pow(1.7, lvl - 1));
      const maxed = lvl >= 4;
      const can = S.scrap >= cost;
      let action;
      if (maxed) action = `<button class="buy-btn owned-label">MAXED</button>`;
      else if (lvl === 0) action = buyButton('BUY', cost, 'buy-turret', 'turret', t.id, !can);
      else action = buyButton('UPGRADE', cost, 'buy-turret', 'turret', t.id, !can);
      html += itemCard({
        id: t.id, kind: 'turret', name: t.name, tag: lvl ? `LV ${lvl}` : 'LOCKED',
        desc: t.desc, stat: `${t.statline}${lvl ? ` · ${Math.round(t.dmg * (1 + (lvl - 1) * t.levelScale))} DMG` : ''}`,
        iconName: t.id, color: t.color, action, owned: lvl > 0, equipped: false, locked: lvl === 0 && !can
      });
    }
    html += `<div class="list-section"><span>RIG MODULES</span><i>PERMANENT BASE UPGRADES</i></div>`;
    for (const m of Object.values(BASE_MODULES)) {
      const lvl = S.baseLevels[m.id] || 0;
      const cost = Math.round(m.cost * Math.pow(m.growth, lvl));
      const maxed = lvl >= m.max;
      const can = S.scrap >= cost;
      const action = maxed
        ? `<button class="buy-btn owned-label">MAXED</button>`
        : buyButton(lvl === 0 ? 'INSTALL' : 'UPGRADE', cost, 'buy-module', 'module', m.id, !can);
      html += itemCard({
        id: m.id, kind: 'module', name: m.name, tag: `MK ${lvl}`, desc: m.desc,
        stat: pipsHTML(lvl, m.max), iconName: m.icon, color: '#5ed4c8', action,
        owned: lvl > 0, equipped: false, locked: !can && !maxed
      });
    }
  }
  el.garageList.innerHTML = html || `<div class="garage-empty">NOTHING HERE BUT DUST.</div>`;
  el.garageList.scrollTop = 0;
  el.garageScrap.textContent = fmt(S.scrap);
}

function handleGarageAction(action, kind, id) {
  let bought = false;
  if (action === 'buy-car' || action === 'equip-car') {
    const c = CARS[id];
    if (!c) return;
    if (action === 'buy-car') {
      if (S.ownedCars.includes(id)) return;
      if (S.scrap < c.cost) { sound.deny(); toast('NOT ENOUGH SCRAP'); return; }
      S.scrap -= c.cost; S.ownedCars.push(id); bought = true;
    }
    S.carId = id;
  } else if (action === 'buy-weapon' || action === 'equip-weapon') {
    const w = WEAPONS[id];
    if (!w) return;
    if (action === 'buy-weapon') {
      if (S.ownedWeapons.includes(id)) return;
      if (S.scrap < w.cost) { sound.deny(); toast('NOT ENOUGH SCRAP'); return; }
      S.scrap -= w.cost; S.ownedWeapons.push(id); bought = true;
    }
    S.weaponId = id;
  } else if (action === 'buy-armor' || action === 'equip-armor') {
    const a = ARMOR[id];
    if (!a) return;
    if (action === 'buy-armor') {
      if (S.ownedArmors.includes(id)) return;
      if (S.scrap < a.cost) { sound.deny(); toast('NOT ENOUGH SCRAP'); return; }
      S.scrap -= a.cost; S.ownedArmors.push(id); bought = true;
    }
    const oldMaxHealth = stats.maxHealth;
    S.armorId = id;
    recalc(false);
    S.armor = stats.maxArmor;
    S.health = Math.min(stats.maxHealth, S.health + Math.max(0, stats.maxHealth - oldMaxHealth));
  } else if (action === 'buy-part') {
    const p = PARTS[id];
    if (!p) return;
    const lvl = S.parts[id] || 0;
    if (lvl >= p.max) return;
    const cost = Math.round(p.cost * Math.pow(p.growth, lvl));
    if (S.scrap < cost) { sound.deny(); toast('NOT ENOUGH SCRAP'); return; }
    const oldMaxHealth = stats.maxHealth, oldMaxArmor = stats.maxArmor;
    S.scrap -= cost; S.parts[id] = lvl + 1; bought = true;
    recalc(false);
    if (id === 'fuel') S.health = Math.min(stats.maxHealth, S.health + (stats.maxHealth - oldMaxHealth));
    if (id === 'plating') S.armor = stats.maxArmor;
    if (id === 'recovery') S.health = Math.min(stats.maxHealth, S.health + 5);
  } else if (action === 'buy-turret') {
    const t = TURRETS[id];
    if (!t) return;
    const lvl = S.turretLevels[id] || 0;
    const baseCost = t.cost || 120;
    const cost = lvl === 0 ? t.cost : Math.round(baseCost * Math.pow(1.7, lvl - 1));
    if (lvl >= 4) return;
    if (S.scrap < cost) { sound.deny(); toast('NOT ENOUGH SCRAP'); return; }
    S.scrap -= cost;
    S.turretLevels[id] = lvl + 1;
    bought = true;
  } else if (action === 'buy-module') {
    const m = BASE_MODULES[id];
    if (!m) return;
    const lvl = S.baseLevels[id] || 0;
    if (lvl >= m.max) return;
    const cost = Math.round(m.cost * Math.pow(m.growth, lvl));
    if (S.scrap < cost) { sound.deny(); toast('NOT ENOUGH SCRAP'); return; }
    S.scrap -= cost;
    S.baseLevels[id] = lvl + 1;
    bought = true;
    const oldBaseMax = stats.baseMax;
    recalc(false);
    if (id === 'hull') base.maxHp = stats.baseMax;
    if (id === 'hardpoint') {
      // nothing else; slots update automatically
    }
    if (id === 'hull' && base.hp > 0) base.hp = Math.min(base.maxHp, base.hp + (stats.baseMax - oldBaseMax));
  }
  recalc(false);
  if (bought) sound.buy(); else sound.build();
  updateHUD();
  renderGarage();
  saveState();
  if (bought) toast('INSTALLED · ' + (kind === 'part' || kind === 'module' ? 'RIG UPGRADED' : 'NEW GEAR ACQUIRED'), 1800);
}

function drawGarageCar() {
  const c = el.garageCar;
  const g = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = c.getBoundingClientRect();
  const cw = Math.max(120, rect.width || 300), ch = Math.max(60, rect.height || 150);
  if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
    c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);
  const carDef = CARS[S.carId];
  const grd = g.createRadialGradient(cw * 0.5, ch * 0.58, 4, cw * 0.5, ch * 0.58, cw * 0.45);
  grd.addColorStop(0, 'rgba(255,122,26,0.20)');
  grd.addColorStop(1, 'rgba(255,122,26,0)');
  g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
  g.save();
  g.translate(cw / 2, ch * 0.54);
  const sc = Math.min(cw / 112, ch / 68);
  g.rotate(Math.PI / 2); // nose points right for the garage turntable
  drawCar(g, 0, 0, sc, carDef, { preview: true, weaponId: S.weaponId, armorId: S.armorId, parts: S.parts, noShadow: false });
  g.restore();
}

// ═══════════════════════════════════════════════════════════════
//  BUILD PANEL / HARDPOINTS
// ═══════════════════════════════════════════════════════════════
function getSlots() {
  const L = layout();
  const side = Math.min(L.roadW * 0.4, 238);
  return [
    { x: L.cx - side, y: L.baseY - 112 },
    { x: L.cx + side, y: L.baseY - 112 },
    { x: L.cx - side * 0.74, y: L.baseY - 225 },
    { x: L.cx + side * 0.74, y: L.baseY - 225 },
    { x: L.cx - side * 1.02, y: L.baseY - 338 },
    { x: L.cx + side * 1.02, y: L.baseY - 338 }
  ];
}

function renderBuildPanel() {
  const stop = currentStop();
  el.buildEyebrow.textContent = `STOP ${S.stopIndex + 1} / ${STOPS.length}${stop.boss ? ' · BOSS STOP' : ''}`;
  if (holdout.phase === 'build' && holdout.wave > 0) {
    el.buildTitle.textContent = `WAVE ${holdout.wave} CLEARED`;
    el.buildSub.textContent = `Re-arm, place reinforcements, then call wave ${holdout.wave + 1}.`;
    el.build.classList.add('wave-clear');
  } else {
    el.buildTitle.textContent = 'PREPARE THE RIG';
    el.buildSub.textContent = holdout.selected
      ? `Selected ${TURRETS[holdout.selected].name}. Tap a glowing hardpoint.`
      : `Hardpoints ${holdout.placed.length}/${stats.slots}. Tap a turret, then a pad.`;
    el.build.classList.remove('wave-clear');
  }
  el.buildScrap.textContent = fmt(S.scrap);
  el.turretCards.innerHTML = Object.values(TURRETS).map(t => {
    const lvl = S.turretLevels[t.id] || 0;
    const placed = holdout.placed.some(p => p.type === t.id);
    const selected = holdout.selected === t.id;
    return `<button class="turret-card ${selected ? 'selected' : ''} ${lvl <= 0 ? 'locked' : ''} ${placed ? 'placed' : ''}" data-turret="${t.id}">
      <span class="mini-lvl">${lvl > 0 ? 'LV ' + lvl : '—'}</span>
      <span class="turret-glyph" style="color:${t.color}">${turretGlyph(t.id)}</span>
      <span class="turret-name">${t.name}</span>
      <span class="turret-meta">${lvl <= 0 ? 'BUY IN GARAGE' : placed ? 'DEPLOYED' : 'READY'}</span>
    </button>`;
  }).join('');
  el.startWaveBtn.textContent = holdout.wave === 0 ? 'START WAVE' : `NEXT WAVE · ${holdout.wave + 1}/${holdout.totalWaves}`;
  el.startWaveBtn.disabled = holdout.wave >= holdout.totalWaves;
  el.autoPlaceBtn.textContent = holdout.placed.length >= Math.min(stats.slots, ownedTurretCount()) ? 'ALL PLACED' : 'AUTO-PLACE';
}

function turretGlyph(id) {
  return { gunner: '⌖', pyro: '♨', tesla: 'ϟ', mortar: '◉', sniper: '✛', cryo: '❄' }[id] || '◎';
}

function ownedTurretCount() {
  return Object.keys(TURRETS).filter(id => (S.turretLevels[id] || 0) > 0).length;
}

function handleHoldoutTap(x, y) {
  if (holdout.phase !== 'build') return;
  const slots = getSlots();
  let hit = -1;
  for (let i = 0; i < slots.length; i++) {
    if (dist2(x, y, slots[i].x, slots[i].y) < 44 * 44) { hit = i; break; }
  }
  if (hit < 0) return;
  if (hit >= stats.slots) {
    toast('HARDPOINT LOCKED · UPGRADE THE RIG', 2000);
    sound.deny();
    return;
  }
  const existing = holdout.placed.find(p => p.slot === hit);
  if (existing) {
    holdout.placed = holdout.placed.filter(p => p.slot !== hit);
    sound.build();
    toast(`${TURRETS[existing.type].name} RECALLED`, 1500);
    renderBuildPanel();
    updateHUD();
    return;
  }
  if (!holdout.selected) {
    toast('SELECT A TURRET BELOW', 1600);
    sound.deny();
    return;
  }
  if ((S.turretLevels[holdout.selected] || 0) <= 0) { holdout.selected = null; return; }
  // move a deployed copy of the selected type if it exists
  holdout.placed = holdout.placed.filter(p => p.type !== holdout.selected);
  holdout.placed.push({ slot: hit, type: holdout.selected });
  sound.build();
  holdout.selected = null;
  renderBuildPanel();
  updateHUD();
}

function autoPlace() {
  if (holdout.phase !== 'build') return;
  const slots = getSlots();
  const occupied = new Set(holdout.placed.map(p => p.slot));
  const deployed = new Set(holdout.placed.map(p => p.type));
  for (const t of Object.values(TURRETS)) {
    if ((S.turretLevels[t.id] || 0) <= 0 || deployed.has(t.id)) continue;
    let free = -1;
    for (let i = 0; i < stats.slots; i++) if (!occupied.has(i)) { free = i; break; }
    if (free < 0) break;
    occupied.add(free); deployed.add(t.id);
    holdout.placed.push({ slot: free, type: t.id });
  }
  holdout.selected = null;
  sound.build();
  renderBuildPanel();
  updateHUD();
}

// ═══════════════════════════════════════════════════════════════
//  WAVES
// ═══════════════════════════════════════════════════════════════
function buildWaveQueue(stop, wave) {
  const q = [];
  const count = Math.round(7 + S.stopIndex * 1.25 + wave * 2.4);
  const weights = {
    walker: 52,
    crawler: 18 + S.stopIndex,
    runner: 10 + S.stopIndex * 1.2,
    bloater: Math.max(0, S.stopIndex - 1) * 4,
    brute: Math.max(0, S.stopIndex - 3) * 3
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  for (let i = 0; i < count; i++) {
    let r = Math.random() * total, type = 'walker';
    for (const [k, v] of Object.entries(weights)) {
      if (r < v) { type = k; break; }
      r -= v;
    }
    q.push(type);
  }
  if (stop.boss && wave === stop.waves) q.unshift('screamer');
  return q;
}

function startWave() {
  if (holdout.phase !== 'build') return;
  if (holdout.wave >= holdout.totalWaves) { completeStop(); return; }
  holdout.wave++;
  holdout.phase = 'wave';
  holdout.spawnQueue = buildWaveQueue(currentStop(), holdout.wave);
  holdout.spawnTimer = 0.65;
  holdout.startDelay = 0.8;
  holdout.selected = null;
  S.wave = holdout.wave;
  S.baseHealth = base.hp;
  S.placedTurrets = holdout.placed.slice();
  sound.wave();
  syncScreens();
  updateHUD();
  const boss = holdout.spawnQueue.includes('screamer');
  showBanner(`WAVE ${holdout.wave} / ${holdout.totalWaves}`, boss ? 'BOSS INCOMING' : 'HOLD THE LINE', boss ? 'KILL IT BEFORE IT REACHES THE RIG' : `${holdout.spawnQueue.length} HOSTILES INBOUND`);
  showHint('DRAG TO AIM THE MAIN GUN · TURRETS AUTO-FIRE', 4200);
  saveState();
}

function spawnEnemy(type, x, y, zone = 'holdout') {
  const def = ENEMIES[type] || ENEMIES.walker;
  const boss = !!def.boss;
  const hpMult = zone === 'road'
    ? 1 + S.stopIndex * 0.10
    : 1 + S.stopIndex * 0.115 + Math.max(0, holdout.wave - 1) * 0.055;
  const hp = def.hp * hpMult * (boss ? 1.05 : 1);
  const e = {
    id: enemyId++, type, x, y,
    hp, maxHp: hp,
    speed: def.speed * (zone === 'road' ? 1.15 : 1) * rand(0.88, 1.12) + (zone === 'road' ? 45 : 0),
    dmg: def.dmg * (1 + S.stopIndex * 0.045),
    scrap: def.scrap,
    radius: def.radius * (boss ? 1.1 : 1),
    color: def.color, cloth: def.cloth, skin: def.skin,
    boss, flash: 0, burn: 0, slow: 0, slowT: 0, attackTimer: 0, attacking: false,
    t: rand(0, 10), seed: rand(0, 100), wobble: rand(10, 32),
    dead: false, zone, angle: Math.PI,
    spawnCd: boss ? 5 : 0,
    name: boss ? BOSS_NAMES[Math.min(Math.floor(S.stopIndex / 4), BOSS_NAMES.length - 1)] : def.name
  };
  enemies.push(e);
  return e;
}

function spawnRoadEnemy() {
  const L = layout();
  const r = Math.random();
  let type = 'walker';
  if (r < 0.15 + S.stopIndex * 0.01) type = 'runner';
  else if (r < 0.24) type = 'crawler';
  else if (r < 0.30 + S.stopIndex * 0.006 && S.stopIndex > 1) type = 'bloater';
  else if (r < 0.33 + S.stopIndex * 0.008 && S.stopIndex > 4) type = 'brute';
  const x = L.roadX + L.margin + rand(0, L.roadW - L.margin * 2);
  return spawnEnemy(type, x, -40, 'road');
}

function completeWave() {
  if (holdout.phase !== 'wave') return;
  const reward = Math.round(16 + holdout.wave * 7 + S.stopIndex * 4);
  S.scrap += reward;
  S.baseHealth = base.hp;
  const repaired = base.maxHp * stats.repair;
  base.hp = Math.min(base.maxHp, base.hp + repaired);
  holdout.phase = 'build';
  sound.pickup();
  if (holdout.wave >= holdout.totalWaves) {
    completeStop();
    return;
  }
  renderBuildPanel();
  syncScreens();
  updateHUD();
  showBanner('WAVE CLEARED', `+${reward} SCRAP`, repaired > 0 ? `RIG REPAIRED +${Math.round(repaired)}` : 'RE-ARM AND REINFORCE');
  saveState();
}

// ═══════════════════════════════════════════════════════════════
//  ABILITIES
// ═══════════════════════════════════════════════════════════════
function useAbility() {
  if (paused || gameOver || abilityTimer > 0.05) return;
  if (S.screen !== 'road' && S.screen !== 'holdout') return;
  sound.ensure();
  if (S.mode === 'road') {
    abilityTimer = stats.nitroCd;
    nitroTime = 1.8;
    sound.pulse();
    addRing(car.x, car.y, 12, '#ffb347', 0.7, 5);
    spawnParticles(26, car.x, car.y + 30, { kind: 'flame', color: '#ff7a1a', speed: 210, size: 7, life: 0.5 });
    shake = Math.max(shake, 6);
    showHint('NOS ENGAGED · 1.8s INVULNERABLE', 1800);
  } else {
    abilityTimer = 18;
    sound.pulse();
    addRing(base.x, base.y - 20, 20, '#7de8ff', 0.8, 8);
    addRing(base.x, base.y - 20, 60, '#b8fff4', 0.65, 4);
    spawnParticles(36, base.x, base.y - 20, { kind: 'spark', color: '#7de8ff', speed: 330, size: 5, life: 0.7 });
    shake = Math.max(shake, 9);
    const dmg = 58 * stats.damageMult;
    for (const e of enemies) {
      if (e.dead) continue;
      hitEnemy(e, dmg, { color: '#7de8ff' });
      e.slow = Math.max(e.slow, 0.55);
      e.slowT = Math.max(e.slowT, 3);
      e.y -= 24;
    }
    flashScreen(false);
    showHint('RIG PULSE · HOSTILES SLOWED', 2000);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ROAD UPDATE
// ═══════════════════════════════════════════════════════════════
function nearestEnemy(x, y, range, onlyAhead = false) {
  let best = null, bd = range * range;
  for (const e of enemies) {
    if (e.dead) continue;
    if (onlyAhead && e.y > car.y + 20) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function findEnemyNear(x, y, range) {
  let best = null, bd = range * range;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function updateRoad(dt) {
  S.runTime += dt;
  const L = layout();
  car.y = L.carY;
  let speedMult = 1;
  if (nitroTime > 0) {
    nitroTime -= dt;
    speedMult = 1.75;
    if (Math.random() < 0.65) {
      spawnParticles(2, car.x + rand(-15, 15), car.y + 38, { kind: 'flame', color: pick(['#ff7a1a', '#ffb347', '#ffe28a']), speed: 180, size: rand(3, 7), life: rand(0.2, 0.45) });
    }
  }
  S.distance = Math.min(currentStop().mile, S.distance + dt * 0.55 * stats.speed * speedMult);
  scroll += dt * 255 * stats.speed * speedMult;

  let target = car.targetX;
  const steer = 430 * stats.handling;
  if (keys['a'] || keys['arrowleft']) target -= steer * dt;
  if (keys['d'] || keys['arrowright']) target += steer * dt;
  target = clamp(target, L.roadX + L.margin, L.roadX + L.roadW - L.margin);
  car.targetX = target;
  car.x += (target - car.x) * Math.min(1, dt * 9.5 * stats.handling);
  car.x = clamp(car.x, L.roadX + L.margin, L.roadX + L.roadW - L.margin);
  car.tilt = lerp(car.tilt, clamp((target - car.x) * 0.0028, -0.17, 0.17), Math.min(1, dt * 10));

  // headlight flicker / engine dust
  if (Math.random() < dt * 8) {
    spawnParticles(1, car.x + rand(-14, 14), car.y + 42, { kind: 'smoke', color: '#67655d', speed: 16, size: rand(3, 7), life: rand(0.4, 0.8), gravity: -4 });
  }

  spawnTimer -= dt;
  if (spawnTimer <= 0 && enemies.length < 40) {
    spawnRoadEnemy();
    if (Math.random() < 0.13 + S.stopIndex * 0.01 && enemies.length < 38) spawnRoadEnemy();
    spawnTimer = Math.max(0.34, 0.80 - S.stopIndex * 0.035 - Math.random() * 0.18);
  }

  fireTimer -= dt;
  if (fireTimer <= 0) {
    const w = WEAPONS[S.weaponId];
    const t = nearestEnemy(car.x, car.y - 30, w.range * stats.rangeMult, true);
    if (t) {
      firePlayerWeapon('road', t.x, t.y);
      fireTimer = w.rate / stats.fireRate;
    }
  }

  updateEnemies(dt, 'road');
  updateBullets(dt);
  updateStrikes(dt);
  updatePickups(dt);
  updateEffects(dt);
  updateParticles(dt);
  updateFloaters(dt);
  updateWeather(dt);
  updateProps(dt, speedMult);
  updateShake(dt);
  if (abilityTimer > 0) abilityTimer -= dt;

  saveTimer -= dt;
  if (saveTimer <= 0) { saveState(); saveTimer = 4; }
  sound.engineOn(true, speedMult);

  if (S.health <= 0) { endRun('hull'); return; }
  if (S.distance >= currentStop().mile - 0.001) arriveAtStop();
}

function updateEnemies(dt, zone) {
  const L = layout();
  for (const e of enemies) {
    if (e.dead) continue;
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.collideCd > 0) e.collideCd -= dt;
    if (e.attackPulse > 0) e.attackPulse -= dt * 4;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.burn > 0) {
      e.hp -= e.burn * dt;
      if (Math.random() < dt * 10) spawnParticles(1, e.x + rand(-8, 8), e.y + rand(-6, 6), { kind: 'flame', color: pick(['#ff7a1a', '#ffb347']), speed: 32, size: rand(2, 5), life: 0.28, gravity: -35 });
      if (e.hp <= 0) { killEnemy(e); continue; }
    }
    let slowFactor = 1 - e.slow;
    if (zone === 'road' && stats.slowAura > 0 && dist2(e.x, e.y, car.x, car.y) < 130 * 130) slowFactor *= 1 - stats.slowAura;
    const sp = e.speed * slowFactor;

    if (zone === 'road') {
      e.y += sp * dt;
      e.x += Math.cos(e.t * 1.9 + e.seed) * e.wobble * dt;
      e.x = clamp(e.x, L.roadX + 12, L.roadX + L.roadW - 12);
      e.angle = Math.PI + Math.sin(e.t * 2 + e.seed) * 0.12;
      // ram / collision
      if (e.y > car.y - 34 && e.y < car.y + 64 && Math.abs(e.x - car.x) < 32 + e.radius * 0.6 && (e.collideCd || 0) <= 0) {
        e.collideCd = 0.7;
        damagePlayer(e.dmg * stats.collisionMult, 'crash');
        hitEnemy(e, stats.ram, { color: '#ffb347' });
        e.y -= 44;
        shake = Math.max(shake, 8);
        spawnParticles(14, e.x, car.y - 12, { kind: 'blood', color: '#a9382d', speed: 170, size: 4, life: 0.5 });
        spawnParticles(10, e.x, car.y - 12, { kind: 'spark', color: '#ffb347', speed: 220, size: 3, life: 0.3 });
      }
      if (e.y > H + 70) e.dead = true;
    } else {
      if (!e.attacking) {
        let barrierSlow = 1;
        if (stats.barricade > 0 && e.y > base.y - 195) barrierSlow = 1 - stats.barricade;
        e.y += sp * dt * barrierSlow;
        const laneShift = Math.sin(e.t * 1.35 + e.seed) * 18;
        e.x = (e.laneX ?? e.x) + laneShift;
        e.angle = Math.PI + Math.sin(e.t * 2.2 + e.seed) * 0.16;
        if (e.y >= base.y - 58) { e.attacking = true; e.attackTimer = 0.2; }
      } else {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.boss ? 1.25 : 1.0;
          e.attackPulse = 1;
          damageBase(e.dmg);
        }
      }
      if (e.boss) {
        e.spawnCd -= dt;
        if (e.spawnCd <= 0 && enemies.length < 34) {
          e.spawnCd = 6.2;
          const minion = spawnEnemy('walker', e.x + rand(-28, 28), e.y - 18, 'holdout');
          minion.laneX = minion.x;
          addRing(e.x, e.y, 20, '#a94343', 0.5, 3);
        }
      }
      if (e.y > H + 90) e.dead = true;
    }
    if (e.hp <= 0 && !e.dead) killEnemy(e);
  }
  enemies = enemies.filter(e => !e.dead);
}

function damagePlayer(amount, source = 'hit') {
  if (nitroTime > 0 || gameOver) return;
  amount *= stats.damageTaken;
  if (S.armor > 0) {
    const absorbed = Math.min(S.armor, amount);
    S.armor -= absorbed;
    amount -= absorbed;
  }
  S.health = Math.max(0, S.health - amount);
  shake = Math.max(shake, 10);
  flashScreen(false);
  sound.hurt();
  spawnParticles(12, car.x, car.y, { kind: 'spark', color: '#ff6b3d', speed: 190, size: 3, life: 0.4 });
  if (S.health <= 0) endRun(source === 'base' ? 'base' : 'hull');
}

function damageBase(amount) {
  base.hp = Math.max(0, base.hp - amount);
  base.hit = 0.35;
  shake = Math.max(shake, 8);
  flashScreen(false);
  sound.hurt();
  spawnParticles(14, base.x + rand(-40, 40), base.y - 20, { kind: 'spark', color: '#ffb347', speed: 200, size: 3, life: 0.5 });
  if (base.hp <= 0) endRun('base');
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  S.kills++;
  const gain = Math.max(1, Math.round(e.scrap * stats.scrapMult));
  S.scrap += gain;
  addFloater(`+${gain}`, e.x + rand(-6, 6), e.y - 10, '#ffb347', e.boss ? 20 : 11);
  spawnParticles(e.boss ? 60 : 10, e.x, e.y, { kind: 'blood', color: pick(['#8f2e24', '#a9382d', '#6e211a']), speed: e.boss ? 280 : 120, size: e.boss ? 5 : 3, life: rand(0.3, 0.65) });
  spawnParticles(e.boss ? 40 : 5, e.x, e.y, { kind: 'spark', color: '#ffb347', speed: e.boss ? 300 : 130, size: 2.5, life: 0.35 });
  sound.kill();
  if (e.boss) {
    sound.explode();
    shake = Math.max(shake, 18);
    flashScreen(true);
    addRing(e.x, e.y, 20, '#ff7a1a', 0.8, 10);
    addRing(e.x, e.y, 70, '#ffb347', 0.6, 5);
    S.scrap += Math.round(30 * stats.scrapMult);
    showBanner('BOSS DOWN', e.name, 'THE HORDE STILL COMES');
  }
  // drops
  if (e.zone === 'road') {
    const r = Math.random();
    if (r < 0.022) spawnPickup(e.x, e.y, 'health');
    else if (r < 0.048) spawnPickup(e.x, e.y, 'armor');
    else if (r < 0.057) spawnPickup(e.x, e.y, 'part');
  } else if (Math.random() < 0.018) {
    spawnPickup(e.x, e.y, 'health');
  }
  updateHUD();
}

function addScrap(n) {
  S.scrap += Math.max(0, Math.round(n * stats.scrapMult));
}

// ═══════════════════════════════════════════════════════════════
//  HOLDOUT UPDATE
// ═══════════════════════════════════════════════════════════════
function updateHoldout(dt) {
  S.runTime += dt;
  if (abilityTimer > 0) abilityTimer -= dt;
  updateShake(dt);
  updateWeather(dt);
  updateParticles(dt);
  updateEffects(dt);
  updateFloaters(dt);

  if (holdout.phase === 'build' || holdout.phase === 'cleared') {
    // idle target reticle still tracks the nearest corpse-to-be
    if (holdout.phase === 'build') updateHoldoutAim(dt, false);
    return;
  }
  if (holdout.phase !== 'wave') return;

  holdout.startDelay -= dt;
  if (holdout.startDelay <= 0) {
    holdout.spawnTimer -= dt;
    if (holdout.spawnTimer <= 0 && holdout.spawnQueue.length > 0) {
      const type = holdout.spawnQueue.shift();
      const L = layout();
      const lane = type === 'screamer' ? 1 : pick([0, 1, 2]);
      const x = L.roadX + L.roadW * (0.25 + lane * 0.25) + rand(-18, 18);
      const e = spawnEnemy(type, x, -36, 'holdout');
      e.laneX = x;
      holdout.spawnTimer = type === 'screamer' ? 1.2 : Math.max(0.26, 0.62 - S.stopIndex * 0.013 - holdout.wave * 0.018) * rand(0.8, 1.15);
    }
  }

  updateHoldoutAim(dt, true);
  updateTurrets(dt);
  updateEnemies(dt, 'holdout');
  updateBullets(dt);
  updateStrikes(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateEffects(dt);
  updateFloaters(dt);
  updateWeather(dt);
  if (base.hit > 0) base.hit -= dt;

  if (S.health <= 0) { endRun('hull'); return; }
  if (holdout.phase === 'wave' && holdout.spawnQueue.length === 0 && enemies.length === 0) {
    completeWave();
  }
}

function updateHoldoutAim(dt, canFire) {
  const L = layout();
  base.x = L.cx;
  base.y = L.baseY;
  const w = WEAPONS[S.weaponId];
  const range = w.range * stats.rangeMult;
  const nearest = nearestEnemy(base.x, base.y - 40, range);
  let targetX = base.x, targetY = base.y - 280;

  if (nearest) {
    targetX = nearest.x; targetY = nearest.y;
    if (pointer.active) {
      const nearPointer = findEnemyNear(pointer.x, pointer.y, 165);
      if (nearPointer) { targetX = nearPointer.x; targetY = nearPointer.y; }
      else if (time - pointer.lastMove < 9) {
        targetX = pointer.x;
        targetY = Math.min(pointer.y, base.y - 70);
        // if the pointer is nowhere near a target, fall back to assist
        if (findEnemyNear(targetX, targetY, 190)) {
          const assist = findEnemyNear(targetX, targetY, 190);
          targetX = assist.x; targetY = assist.y;
        }
      }
    }
  } else if (pointer.active) {
    targetX = pointer.x;
    targetY = Math.min(pointer.y, base.y - 80);
  }

  targetX = clamp(targetX, 18, W - 18);
  targetY = clamp(targetY, 60, base.y - 60);
  aim.x = lerp(aim.x, targetX, Math.min(1, dt * 16));
  aim.y = lerp(aim.y, targetY, Math.min(1, dt * 16));

  const angle = Math.atan2(aim.y - (base.y - 76), aim.x - base.x);
  base.angle = lerpAngle(base.angle, angle, Math.min(1, dt * 10));

  fireTimer -= dt;
  if (canFire && nearest && fireTimer <= 0) {
    // only fire when the target is within the weapon's reach
    const d = Math.sqrt(dist2(base.x, base.y - 76, aim.x, aim.y));
    if (d <= range + 30) {
      firePlayerWeapon('holdout', aim.x, aim.y);
      fireTimer = w.rate / stats.fireRate;
    }
  }
}

function updateTurrets(dt) {
  const slots = getSlots();
  for (const p of holdout.placed) {
    const t = TURRETS[p.type];
    const lvl = S.turretLevels[p.type] || 1;
    if (!t) continue;
    const slot = slots[p.slot];
    if (!slot) continue;
    p.x = slot.x; p.y = slot.y;
    const range = t.range * stats.turretRange;
    const target = nearestEnemy(p.x, p.y, range);
    if (p.cd > 0) p.cd -= dt;
    if (!target) continue;
    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    p.angle = lerpAngle(p.angle ?? -Math.PI / 2, angle, Math.min(1, dt * 12));
    if (p.cd > 0) continue;
    p.cd = t.rate;
    const dmg = t.dmg * (1 + (lvl - 1) * t.levelScale) * stats.turretDmg;
    const color = t.color;

    if (p.type === 'gunner') {
      spawnBullet(p.x, p.y, target.x, target.y, { dmg, speed: 820, color, radius: 3.5, owner: 'turret', homing: target });
      addMuzzle(p.x, p.y, angle, color, 5);
    } else if (p.type === 'pyro') {
      const baseAngle = Math.atan2(target.y - p.y, target.x - p.x);
      for (const e of enemies) {
        if (e.dead) continue;
        const d = Math.sqrt(dist2(p.x, p.y, e.x, e.y));
        if (d > range + e.radius) continue;
        let da = Math.abs(normAngle(Math.atan2(e.y - p.y, e.x - p.x) - baseAngle));
        if (da < 0.62) {
          hitEnemy(e, dmg, { color });
          e.burn = Math.max(e.burn, 3.2);
        }
      }
      for (let i = 0; i < 3; i++) {
        spawnParticles(1, p.x + Math.cos(baseAngle) * rand(10, range), p.y + Math.sin(baseAngle) * rand(10, range), { kind: 'flame', color: pick(['#ff7a1a', '#ffb347', '#ffd36b']), speed: 60, size: rand(2, 5), life: rand(0.2, 0.4) });
      }
      addMuzzle(p.x, p.y, angle, color, 7);
    } else if (p.type === 'tesla') {
      const points = [{ x: p.x, y: p.y }, { x: target.x, y: target.y }];
      hitEnemy(target, dmg, { color });
      let prev = target;
      const chained = new Set([target.id]);
      for (let c = 1; c < 3; c++) {
        let next = null, bd = 130 * 130;
        for (const e of enemies) {
          if (e.dead || chained.has(e.id)) continue;
          const d = dist2(prev.x, prev.y, e.x, e.y);
          if (d < bd) { bd = d; next = e; }
        }
        if (!next) break;
        chained.add(next.id);
        hitEnemy(next, dmg * 0.72, { color });
        points.push({ x: next.x, y: next.y });
        prev = next;
      }
      addLightning(points, color, 0.18);
      addRing(p.x, p.y, 12, color, 0.25, 2);
    } else if (p.type === 'mortar') {
      strikes.push({ x: target.x, y: target.y, t: 0.6, radius: 78, dmg, color });
      addRing(target.x, target.y, 8, color, 0.6, 2);
      addMuzzle(p.x, p.y, angle, color, 7);
    } else if (p.type === 'sniper') {
      addBeam(p.x, p.y, target.x, target.y, color, 2.2, 0.16);
      hitEnemy(target, dmg, { color });
      addMuzzle(p.x, p.y, angle, color, 8);
      shake = Math.max(shake, 2);
    } else if (p.type === 'cryo') {
      addRing(p.x, p.y, range * 0.45, color, 0.45, 2);
      for (const e of enemies) {
        if (e.dead) continue;
        if (dist2(p.x, p.y, e.x, e.y) < range * range) {
          hitEnemy(e, dmg, { color });
          e.slow = Math.max(e.slow, 0.45);
          e.slowT = Math.max(e.slowT, 1.8);
        }
      }
    }
  }
}

function normAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}
function lerpAngle(a, b, t) {
  return a + normAngle(b - a) * t;
}

// ═══════════════════════════════════════════════════════════════
//  WEAPONS / PROJECTILES
// ═══════════════════════════════════════════════════════════════
function firePlayerWeapon(mode, tx, ty) {
  const w = WEAPONS[S.weaponId];
  const origin = mode === 'road'
    ? { x: car.x, y: car.y - 38 }
    : { x: base.x, y: base.y - 78 };
  const dmg = w.dmg * stats.damageMult * (mode === 'holdout' ? 1.08 : 1);
  const angle = Math.atan2(ty - origin.y, tx - origin.x);
  sound.shot(w.id);
  addMuzzle(origin.x, origin.y, angle, w.color, w.type === 'rail' ? 12 : 6);

  if (w.type === 'bullet') {
    spawnBullet(origin.x, origin.y, tx, ty, { dmg, speed: w.speed, color: w.color, radius: 4, owner: 'player' });
  } else if (w.type === 'shotgun') {
    for (let i = 0; i < w.pellets; i++) {
      const a = angle + rand(-w.spread, w.spread);
      const d = Math.sqrt(dist2(origin.x, origin.y, tx, ty)) + rand(-20, 20);
      spawnBullet(origin.x, origin.y, origin.x + Math.cos(a) * d, origin.y + Math.sin(a) * d, { dmg, speed: w.speed, color: w.color, radius: 3.4, owner: 'player' });
    }
    shake = Math.max(shake, 3);
  } else if (w.type === 'flame') {
    const range = w.range * stats.rangeMult;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.sqrt(dist2(origin.x, origin.y, e.x, e.y));
      if (d > range + e.radius) continue;
      const da = Math.abs(normAngle(Math.atan2(e.y - origin.y, e.x - origin.x) - angle));
      if (da < w.cone) {
        hitEnemy(e, dmg, { color: w.color });
        e.burn = Math.max(e.burn, 2.4);
      }
    }
    for (let i = 0; i < 7; i++) {
      const a = angle + rand(-w.cone, w.cone);
      const d = rand(12, range);
      spawnParticles(1, origin.x + Math.cos(a) * d, origin.y + Math.sin(a) * d, { kind: 'flame', color: pick(['#ff7a1a', '#ffb347', '#ffe28a']), speed: rand(20, 80), size: rand(3, 8), life: rand(0.18, 0.42) });
    }
  } else if (w.type === 'arc') {
    const range = w.range * stats.rangeMult;
    let primary = findEnemyNear(tx, ty, 85) || nearestEnemy(origin.x, origin.y, range);
    if (!primary) return;
    const points = [{ x: origin.x, y: origin.y }, { x: primary.x, y: primary.y }];
    hitEnemy(primary, dmg, { color: w.color });
    let prev = primary;
    const chained = new Set([primary.id]);
    for (let c = 1; c < w.chain; c++) {
      let next = null, bd = 145 * 145;
      for (const e of enemies) {
        if (e.dead || chained.has(e.id)) continue;
        const d = dist2(prev.x, prev.y, e.x, e.y);
        if (d < bd) { bd = d; next = e; }
      }
      if (!next) break;
      chained.add(next.id);
      hitEnemy(next, dmg * 0.7, { color: w.color });
      points.push({ x: next.x, y: next.y });
      prev = next;
    }
    addLightning(points, w.color, 0.22);
  } else if (w.type === 'rail') {
    const range = w.range * stats.rangeMult;
    const ex = origin.x + Math.cos(angle) * range;
    const ey = origin.y + Math.sin(angle) * range;
    for (const e of enemies) {
      if (e.dead) continue;
      if (distToSegment(e.x, e.y, origin.x, origin.y, ex, ey) < e.radius + 14) {
        hitEnemy(e, dmg, { color: w.color });
      }
    }
    addBeam(origin.x, origin.y, ex, ey, w.color, 5, 0.26);
    addBeam(origin.x, origin.y, ex, ey, '#fff0d0', 1.4, 0.18);
    shake = Math.max(shake, 7);
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.sqrt((px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2);
}

function spawnBullet(x, y, tx, ty, opts) {
  const dx = tx - x, dy = ty - y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = opts.speed || 900;
  bullets.push({
    x, y, px: x, py: y,
    vx: (dx / len) * speed, vy: (dy / len) * speed,
    dmg: opts.dmg, life: opts.life || 1.4, color: opts.color || '#ffd36b',
    radius: opts.radius || 3.5, owner: opts.owner || 'player',
    homing: opts.homing || null, dead: false, hit: new Set(),
    speed
  });
}

function updateBullets(dt) {
  for (const b of bullets) {
    if (b.dead) continue;
    b.px = b.x; b.py = b.y;
    if (b.homing && !b.homing.dead) {
      const dx = b.homing.x - b.x, dy = b.homing.y - b.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const turn = Math.min(1, dt * 7);
      b.vx = lerp(b.vx, (dx / len) * b.speed, turn);
      b.vy = lerp(b.vy, (dy / len) * b.speed, turn);
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -80 || b.x > W + 80 || b.y < -100 || b.y > H + 80) { b.dead = true; continue; }
    for (const e of enemies) {
      if (e.dead || b.hit.has(e.id)) continue;
      if (dist2(b.x, b.y, e.x, e.y) < (b.radius + e.radius) ** 2) {
        hitEnemy(e, b.dmg, { color: b.color });
        b.hit.add(e.id);
        spawnParticles(4, b.x, b.y, { kind: 'spark', color: b.color, speed: 90, size: 2, life: 0.22 });
        if (b.owner === 'turret') addRing(b.x, b.y, 5, b.color, 0.18, 1.5);
        b.dead = true;
        break;
      }
    }
  }
  bullets = bullets.filter(b => !b.dead);
}

function updateStrikes(dt) {
  for (const s of strikes) {
    s.t -= dt;
    if (s.t <= 0) {
      addRing(s.x, s.y, 8, s.color, 0.5, 4);
      addRing(s.x, s.y, s.radius, s.color, 0.36, 3);
      spawnParticles(22, s.x, s.y, { kind: 'spark', color: pick([s.color, '#ffb347']), speed: 230, size: 3, life: 0.5 });
      spawnParticles(10, s.x, s.y, { kind: 'smoke', color: '#5b5143', speed: 60, size: 9, life: 0.8, gravity: -8 });
      sound.explode();
      shake = Math.max(shake, 6);
      for (const e of enemies) {
        if (e.dead) continue;
        if (dist2(s.x, s.y, e.x, e.y) < (s.radius + e.radius) ** 2) hitEnemy(e, s.dmg, { color: s.color });
      }
      s.dead = true;
    }
  }
  strikes = strikes.filter(s => !s.dead);
}

function hitEnemy(e, dmg, opts = {}) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.11;
  if (Math.random() < 0.45) sound.hit();
  spawnParticles(3, e.x + rand(-5, 5), e.y + rand(-5, 5), { kind: 'blood', color: pick(['#8f2e24', '#a9382d', '#6e211a']), speed: 85, size: 2.4, life: 0.28 });
  if (e.hp <= 0) killEnemy(e);
}

// ═══════════════════════════════════════════════════════════════
//  PARTICLES / EFFECTS / FLOATERS
// ═══════════════════════════════════════════════════════════════
function spawnParticles(n, x, y, opts = {}) {
  if (particles.length > 620) n = Math.min(n, 6);
  for (let i = 0; i < n; i++) {
    const a = opts.angle != null ? opts.angle + rand(-0.7, 0.7) : rand(0, TAU);
    const sp = (opts.speed || 80) * rand(0.35, 1);
    particles.push({
      x: x + rand(-3, 3), y: y + rand(-3, 3),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: (opts.life || 0.5) * rand(0.65, 1.15),
      maxLife: opts.life || 0.5,
      size: (opts.size || 3) * rand(0.65, 1.2),
      color: opts.color || '#ffb347',
      kind: opts.kind || 'spark',
      gravity: opts.gravity || 0,
      drag: opts.drag ?? 2.2,
      spin: rand(-6, 6), rot: rand(0, TAU)
    });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.max(0, 1 - p.drag * dt);
    p.vy = p.vy * Math.max(0, 1 - p.drag * dt) + p.gravity * dt;
    p.rot += p.spin * dt;
    if (p.life <= 0) p.dead = true;
  }
  particles = particles.filter(p => !p.dead);
}

function addFloater(text, x, y, color = '#ffb347', size = 11) {
  floaters.push({ text, x, y, color, size, life: 1.05, maxLife: 1.05 });
}
function updateFloaters(dt) {
  for (const f of floaters) {
    f.life -= dt;
    f.y -= dt * 34;
    if (f.life <= 0) f.dead = true;
  }
  floaters = floaters.filter(f => !f.dead);
}

function addBeam(x1, y1, x2, y2, color, width = 3, life = 0.16) {
  effects.push({ kind: 'beam', x1, y1, x2, y2, color, width, life, maxLife: life });
}
function addRing(x, y, r, color, life = 0.5, width = 4) {
  effects.push({ kind: 'ring', x, y, r, color, life, maxLife: life, width });
}
function addLightning(points, color, life = 0.2) {
  effects.push({ kind: 'lightning', points, color, life, maxLife: life });
}
function addMuzzle(x, y, angle, color, size = 6) {
  effects.push({ kind: 'muzzle', x, y, angle, color, size, life: 0.09, maxLife: 0.09 });
  spawnParticles(3, x, y, { kind: 'spark', color, speed: 170, size: 2, life: 0.15, angle });
}

function updateEffects(dt) {
  for (const e of effects) {
    e.life -= dt;
    if (e.life <= 0) e.dead = true;
  }
  effects = effects.filter(e => !e.dead);
}

function updateShake(dt) {
  if (shake > 0.2) {
    shakeX = rand(-shake, shake);
    shakeY = rand(-shake, shake);
    shake = Math.max(0, shake - dt * 32);
  } else {
    shake = 0; shakeX = 0; shakeY = 0;
  }
}

// ═══════════════════════════════════════════════════════════════
//  PICKUPS
// ═══════════════════════════════════════════════════════════════
function spawnPickup(x, y, type) {
  pickups.push({ x, y, type, t: rand(0, 10), dead: false });
}

function updatePickups(dt) {
  const L = layout();
  for (const p of pickups) {
    if (p.dead) continue;
    p.t += dt;
    p.y += 44 * dt;
    const d = Math.sqrt(dist2(p.x, p.y, car.x, car.y));
    if (S.mode === 'road' && d < 115) {
      const pull = Math.min(1, dt * 6);
      p.x += (car.x - p.x) * pull;
      p.y += (car.y - p.y) * pull;
    }
    if (S.mode === 'road' && d < 28) collectPickup(p);
    if (S.mode === 'holdout' && dist2(p.x, p.y, base.x, base.y - 30) < 45 * 45) collectPickup(p);
    if (p.y > H + 50) p.dead = true;
  }
  pickups = pickups.filter(p => !p.dead);
}

function collectPickup(p) {
  if (p.dead) return;
  p.dead = true;
  sound.pickup();
  if (p.type === 'health') {
    if (S.health < stats.maxHealth) {
      S.health = Math.min(stats.maxHealth, S.health + 24);
      addFloater('+24 HULL', p.x, p.y - 10, '#ff8d6b', 12);
    } else {
      S.scrap += 14;
      addFloater('+14', p.x, p.y - 10, '#ffb347', 12);
    }
  } else if (p.type === 'armor') {
    if (S.armor < stats.maxArmor) {
      S.armor = Math.min(stats.maxArmor, S.armor + 20);
      addFloater('+20 ARMOR', p.x, p.y - 10, '#7de8ff', 12);
    } else {
      S.scrap += 12;
      addFloater('+12', p.x, p.y - 10, '#ffb347', 12);
    }
  } else if (p.type === 'part') {
    const available = Object.values(PARTS).filter(part => (S.parts[part.id] || 0) < part.max);
    if (available.length) {
      const part = pick(available);
      S.parts[part.id] = (S.parts[part.id] || 0) + 1;
      recalc(false);
      toast(`SALVAGED PART · ${part.name} MK ${S.parts[part.id]}`, 2600);
      addFloater('PART!', p.x, p.y - 10, '#c9f34c', 15);
    } else {
      S.scrap += 90;
      toast('ALL PARTS MAXED · +90 SCRAP', 2200);
      addFloater('+90', p.x, p.y - 10, '#ffb347', 15);
    }
  }
  updateHUD();
}

// ═══════════════════════════════════════════════════════════════
//  WEATHER / PROPS
// ═══════════════════════════════════════════════════════════════
function initWeather() {
  weather = [];
  if (!W || !H) return;
  const stop = currentStop();
  const biome = stop ? stop.biome : 'diner';
  const kind = biome === 'ash' ? 'ember' : biome === 'city' ? 'rain' : biome === 'bridge' ? 'rain' : biome === 'relay' ? 'rain' : biome === 'tunnel' ? 'dust' : biome === 'quarry' || biome === 'boneyard' ? 'dust' : 'ash';
  const count = kind === 'rain' ? 70 : 44;
  for (let i = 0; i < count; i++) {
    weather.push({
      x: rand(0, W), y: rand(0, H),
      speed: kind === 'rain' ? rand(280, 460) : rand(10, 32),
      drift: kind === 'rain' ? rand(-60, -20) : rand(-12, 12),
      size: kind === 'rain' ? rand(5, 12) : rand(1, 3),
      alpha: rand(0.12, 0.38), kind
    });
  }
  titleAsh = [];
  for (let i = 0; i < 40; i++) titleAsh.push({ x: rand(0, W), y: rand(0, H), s: rand(0.5, 2.2), sp: rand(5, 22), drift: rand(-8, 14), a: rand(0.15, 0.5) });
}

function updateWeather(dt) {
  for (const p of weather) {
    p.y += p.speed * dt;
    p.x += p.drift * dt;
    if (p.y > H + 20) { p.y = -20; p.x = rand(0, W); }
    if (p.y < -20) p.y = H + 10;
    if (p.x < -20) p.x = W + 10;
    if (p.x > W + 20) p.x = -10;
  }
}

function makeProp(type, y, side) {
  const L = layout();
  const offset = rand(-6, 22);
  const x = side < 0 ? L.roadX - offset : L.roadX + L.roadW + offset;
  return { type, x, y, side, scale: rand(0.75, 1.25), seed: rand(0, 100) };
}

function seedProps() {
  roadProps = [];
  const type = palette().prop;
  const L = layout();
  for (let i = 0; i < 12; i++) {
    const y = rand(-60, H + 40);
    roadProps.push(makeProp(type, y, i % 2 ? 1 : -1));
  }
}

function updateProps(dt, speedMult = 1) {
  const sp = dt * 255 * stats.speed * speedMult;
  for (const p of roadProps) p.y += sp;
  roadProps = roadProps.filter(p => p.y < H + 120);
  propTimer -= dt;
  if (propTimer <= 0) {
    propTimer = rand(0.18, 0.46);
    roadProps.push(makeProp(palette().prop, -80, Math.random() < 0.5 ? -1 : 1));
  }
}

// ═══════════════════════════════════════════════════════════════
//  RENDERING
// ═══════════════════════════════════════════════════════════════
function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (S.screen === 'title') { renderTitle(); return; }
  if (S.screen === 'garage') {
    ctx.fillStyle = '#0b0d09';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.save();
  if (shake > 0) ctx.translate(shakeX, shakeY);
  if (S.mode === 'road') renderRoad();
  else if (S.mode === 'holdout') renderHoldout();
  ctx.restore();
}

function drawGround(pal) {
  const g = ctx;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, pal.ground2);
  grad.addColorStop(0.45, pal.ground);
  grad.addColorStop(1, pal.ground2);
  g.fillStyle = grad;
  g.fillRect(-20, -20, W + 40, H + 40);

  const L = layout();
  // rough shoulder texture
  g.save();
  g.globalAlpha = 0.2;
  g.strokeStyle = pal.line;
  g.lineWidth = 1;
  for (let i = 0; i < 38; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side < 0
      ? rand(0, Math.max(1, L.roadX - 4))
      : rand(L.roadX + L.roadW + 4, W);
    const y = ((i * 83 + scroll * 0.36) % (H + 80)) - 40;
    g.beginPath();
    g.moveTo(x - 5, y);
    g.lineTo(x + 6, y + 3);
    g.stroke();
  }
  g.restore();

  // faint side hazard bands
  g.save();
  g.globalAlpha = 0.15;
  g.fillStyle = pal.accent;
  g.fillRect(0, 0, Math.max(3, L.roadX - 8), H);
  g.fillRect(L.roadX + L.roadW + 8, 0, Math.max(3, W - L.roadX - L.roadW - 8), H);
  g.restore();

  if (pal.prop === 'bridge') {
    g.save();
    g.strokeStyle = 'rgba(120,205,205,0.18)';
    g.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side < 0 ? rand(0, L.roadX - 12) : rand(L.roadX + L.roadW + 12, W);
      const y = ((i * 61 + scroll * 0.5) % (H + 40)) - 20;
      g.beginPath(); g.moveTo(x - 11, y); g.quadraticCurveTo(x, y - 3, x + 11, y); g.stroke();
    }
    g.restore();
  } else if (pal.prop === 'tunnel') {
    g.save();
    g.fillStyle = 'rgba(255,179,71,0.035)';
    for (let i = 0; i < 8; i++) {
      const y = ((i * 121 + scroll * 0.7) % (H + 80)) - 40;
      g.fillRect(0, y, Math.max(4, L.roadX - 8), 3);
      g.fillRect(L.roadX + L.roadW + 8, y, Math.max(4, W - L.roadX - L.roadW - 8), 3);
    }
    g.restore();
  }
}

function drawRoad(pal) {
  const g = ctx;
  const L = layout();
  const grad = g.createLinearGradient(L.roadX, 0, L.roadX + L.roadW, 0);
  grad.addColorStop(0, pal.road2);
  grad.addColorStop(0.5, pal.road);
  grad.addColorStop(1, pal.road2);
  g.fillStyle = grad;
  g.fillRect(L.roadX, -10, L.roadW, H + 20);

  // asphalt sheen
  g.save();
  const sheen = g.createLinearGradient(0, 0, 0, H);
  sheen.addColorStop(0, 'rgba(255,255,255,0.025)');
  sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.15)');
  g.fillStyle = sheen;
  g.fillRect(L.roadX, 0, L.roadW, H);
  g.restore();

  // edge lines
  g.save();
  g.strokeStyle = pal.line;
  g.globalAlpha = 0.7;
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(L.roadX + 9, 0); g.lineTo(L.roadX + 9, H); g.stroke();
  g.beginPath(); g.moveTo(L.roadX + L.roadW - 9, 0); g.lineTo(L.roadX + L.roadW - 9, H); g.stroke();
  g.globalAlpha = 0.2;
  g.strokeStyle = pal.accent;
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(L.roadX + 14, 0); g.lineTo(L.roadX + 14, H); g.stroke();
  g.beginPath(); g.moveTo(L.roadX + L.roadW - 14, 0); g.lineTo(L.roadX + L.roadW - 14, H); g.stroke();
  g.restore();

  // lane dashes
  g.save();
  g.strokeStyle = pal.line;
  g.globalAlpha = 0.48;
  g.lineWidth = 2.5;
  g.setLineDash([30, 48]);
  g.lineDashOffset = -(scroll % 78);
  const x1 = L.roadX + L.roadW / 3;
  const x2 = L.roadX + (L.roadW / 3) * 2;
  g.beginPath(); g.moveTo(x1, 0); g.lineTo(x1, H); g.stroke();
  g.beginPath(); g.moveTo(x2, 0); g.lineTo(x2, H); g.stroke();
  g.setLineDash([]);
  g.restore();

  // cracks and skid marks
  g.save();
  g.globalAlpha = 0.18;
  g.strokeStyle = '#060706';
  g.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const y = ((i * 191 + scroll * 0.7) % (H + 120)) - 60;
    const x = L.roadX + 35 + ((i * 97) % Math.max(1, L.roadW - 70));
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 14, y + 17);
    g.lineTo(x + 8, y + 28);
    g.lineTo(x + 22, y + 43);
    g.stroke();
  }
  g.restore();
}

function drawProps() {
  const pal = palette();
  for (const p of roadProps) {
    if (p.y < -140 || p.y > H + 160) continue;
    drawProp(p, pal);
  }
}

function drawProp(p, pal) {
  const g = ctx;
  const s = p.scale;
  g.save();
  g.translate(p.x, p.y);
  g.globalAlpha = 0.95;
  const flip = p.side < 0 ? 1 : -1;
  g.scale(flip * s, s);
  switch (p.type) {
    case 'cactus': {
      g.fillStyle = '#3f6b3d'; g.strokeStyle = '#243e24'; g.lineWidth = 1.5;
      roundRect(g, -3, -24, 6, 38, 3); g.fill(); g.stroke();
      roundRect(g, -12, -15, 9, 5, 2.5); g.fill(); g.stroke();
      roundRect(g, -12, -15, 5, 16, 2.5); g.fill(); g.stroke();
      roundRect(g, 4, -7, 10, 5, 2.5); g.fill(); g.stroke();
      roundRect(g, 9, -7, 5, 13, 2.5); g.fill(); g.stroke();
      break;
    }
    case 'pine': {
      g.fillStyle = '#3c2d1f'; g.fillRect(-2.5, -2, 5, 26);
      g.fillStyle = '#24442b'; g.strokeStyle = '#142819'; g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(0, -34 + i * 11); g.lineTo(-17 + i * 2, -5 + i * 8); g.lineTo(17 - i * 2, -5 + i * 8); g.closePath(); g.fill(); g.stroke();
      }
      break;
    }
    case 'wreck': {
      g.fillStyle = '#3b2f26'; roundRect(g, -18, -12, 36, 24, 5); g.fill();
      g.fillStyle = '#553d2b'; roundRect(g, -11, -9, 22, 12, 4); g.fill();
      g.fillStyle = '#171614'; g.fillRect(-15, -14, 7, 4); g.fillRect(8, -14, 7, 4); g.fillRect(-15, 10, 7, 4); g.fillRect(8, 10, 7, 4);
      g.strokeStyle = '#8a4c2d'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-14, -4); g.lineTo(14, 7); g.stroke();
      break;
    }
    case 'palm': {
      g.fillStyle = '#4b3a26'; g.beginPath(); g.moveTo(-2, 25); g.quadraticCurveTo(1, -2, 9, -27); g.lineTo(13, -26); g.quadraticCurveTo(5, -1, 3, 25); g.closePath(); g.fill();
      g.fillStyle = '#2f583a';
      for (let i = 0; i < 5; i++) {
        const a = -2.7 + i * 0.55;
        g.beginPath(); g.moveTo(10, -27); g.quadraticCurveTo(10 + Math.cos(a) * 19, -31 + Math.sin(a) * 12, 10 + Math.cos(a) * 29, -20 + Math.sin(a) * 18); g.quadraticCurveTo(10 + Math.cos(a) * 15, -26 + Math.sin(a) * 8, 10, -27); g.fill();
      }
      break;
    }
    case 'deadtree': {
      g.strokeStyle = '#2b211a'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 28); g.lineTo(-1, -16); g.stroke();
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(-1, -6); g.lineTo(-15, -21); g.moveTo(-1, -12); g.lineTo(12, -29); g.moveTo(0, 6); g.lineTo(14, -5); g.moveTo(-1, 1); g.lineTo(-16, 3); g.stroke();
      break;
    }
    case 'antenna': {
      g.strokeStyle = '#58646a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 34); g.lineTo(0, -34); g.stroke();
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(-14, -22); g.lineTo(14, -22); g.moveTo(-11, -14); g.lineTo(11, -14); g.stroke();
      g.fillStyle = '#7d8c91'; g.beginPath(); g.arc(0, -34, 3, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,90,60,${0.4 + Math.sin(time * 3 + p.seed) * 0.35})`; g.beginPath(); g.arc(0, -36, 2, 0, TAU); g.fill();
      break;
    }
    case 'rock': {
      g.fillStyle = '#6b5a44'; g.strokeStyle = '#44382a'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-19, 8); g.lineTo(-12, -12); g.lineTo(3, -18); g.lineTo(17, -6); g.lineTo(20, 10); g.lineTo(7, 15); g.lineTo(-9, 15); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(-12, -12); g.lineTo(3, -18); g.lineTo(7, -4); g.closePath(); g.fill();
      break;
    }
    case 'barricade': {
      g.fillStyle = '#2c2c2a'; g.fillRect(-19, -2, 7, 24); g.fillRect(12, -2, 7, 24);
      g.fillStyle = '#c7c1aa'; g.fillRect(-23, -10, 46, 10);
      g.fillStyle = '#a7392d';
      for (let i = -3; i < 3; i++) { g.save(); g.translate(i * 15, -5); g.rotate(-0.5); g.fillRect(-3, -8, 7, 16); g.restore(); }
      break;
    }
    case 'building': {
      g.fillStyle = '#161f26'; g.fillRect(-28, -70, 56, 100);
      g.strokeStyle = '#2e414b'; g.lineWidth = 1; g.strokeRect(-28, -70, 56, 100);
      for (let y = -60; y < 20; y += 13) for (let x = -20; x < 20; x += 13) {
        g.fillStyle = (Math.sin(x * y + p.seed) > 0.2) ? 'rgba(101,232,255,0.25)' : 'rgba(20,30,36,0.8)';
        g.fillRect(x, y, 6, 7);
      }
      break;
    }
    case 'gate': {
      g.fillStyle = '#4a5042'; g.fillRect(-25, -35, 9, 60); g.fillRect(16, -35, 9, 60);
      g.strokeStyle = '#6d7564'; g.lineWidth = 1.2;
      for (let x = -16; x <= 16; x += 8) { g.beginPath(); g.moveTo(x, -25); g.lineTo(x, 25); g.stroke(); }
      for (let y = -25; y <= 25; y += 10) { g.beginPath(); g.moveTo(-16, y); g.lineTo(16, y); g.stroke(); }
      break;
    }
    case 'bridge': {
      g.fillStyle = '#4c5452'; g.fillRect(-26, -30, 8, 70); g.fillRect(18, -30, 8, 70);
      g.strokeStyle = '#7a8781'; g.lineWidth = 2; g.beginPath(); g.moveTo(-22, -28); g.lineTo(-22, 38); g.moveTo(22, -28); g.lineTo(22, 38); g.stroke();
      break;
    }
    case 'tunnel': {
      g.fillStyle = '#333337'; g.fillRect(-30, -60, 20, 120);
      g.fillStyle = `rgba(255,179,71,${0.4 + Math.sin(time * 5 + p.seed) * 0.2})`; g.fillRect(-16, -45, 4, 20);
      break;
    }
    default: {
      g.fillStyle = '#3f3a2d'; g.fillRect(-2, -10, 4, 30);
    }
  }
  g.restore();
}

function drawWeather() {
  const g = ctx;
  g.save();
  for (const p of weather) {
    if (p.kind === 'rain') {
      g.strokeStyle = `rgba(150,210,220,${p.alpha})`;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 2, p.y + p.size); g.stroke();
    } else if (p.kind === 'ember') {
      g.fillStyle = `rgba(255,${120 + Math.sin(time * 4 + p.x) * 60},50,${p.alpha})`;
      g.beginPath(); g.arc(p.x, p.y, p.size, 0, TAU); g.fill();
    } else {
      g.fillStyle = p.kind === 'dust' ? `rgba(180,165,140,${p.alpha})` : `rgba(210,200,180,${p.alpha})`;
      g.beginPath(); g.arc(p.x, p.y, p.size, 0, TAU); g.fill();
    }
  }
  g.restore();
}

function drawNight(pal, mode) {
  if (pal.night <= 0.12) return;
  const g = ctx;
  g.save();
  g.fillStyle = `rgba(5,9,17,${pal.night * 0.52})`;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  if (mode === 'road') {
    const grad = g.createLinearGradient(0, car.y - 60, 0, car.y - 360);
    grad.addColorStop(0, 'rgba(255,214,140,0.10)');
    grad.addColorStop(1, 'rgba(255,224,160,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(car.x - 17, car.y - 38);
    g.lineTo(car.x - 100, car.y - 390);
    g.lineTo(car.x + 100, car.y - 390);
    g.lineTo(car.x + 17, car.y - 38);
    g.closePath(); g.fill();
  } else {
    const grad = g.createLinearGradient(0, base.y - 50, 0, base.y - 440);
    grad.addColorStop(0, 'rgba(255,214,140,0.10)');
    grad.addColorStop(1, 'rgba(255,224,160,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(base.x - 30, base.y - 70);
    g.lineTo(base.x - 170, base.y - 500);
    g.lineTo(base.x + 170, base.y - 500);
    g.lineTo(base.x + 30, base.y - 70);
    g.closePath(); g.fill();
  }
  g.restore();
}

// ── car drawing ───────────────────────────────────────────────
function drawCar(g, x, y, scale, carDef, opts = {}) {
  const w = 48 * scale;
  const l = 88 * scale;
  const parts = opts.parts || S.parts;
  const weaponId = opts.weaponId || S.weaponId;
  const armorId = opts.armorId || S.armorId;
  const weapon = WEAPONS[weaponId] || WEAPONS.pistol;
  const tilt = opts.tilt || 0;

  g.save();
  g.translate(x, y);
  g.rotate(tilt);

  if (!opts.noShadow) {
    g.save();
    g.translate(4 * scale, 7 * scale);
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.beginPath(); g.ellipse(0, 2, w * 0.62, l * 0.52, 0, 0, TAU); g.fill();
    g.restore();
  }

  // wheels
  g.fillStyle = '#0b0d0b';
  const wheelW = w * 0.2, wheelH = l * 0.17;
  for (const [wx, wy] of [[-w * 0.55, -l * 0.3], [w * 0.55 - wheelW, -l * 0.3], [-w * 0.55, l * 0.14], [w * 0.55 - wheelW, l * 0.14]]) {
    roundRect(g, wx, wy, wheelW, wheelH, 3 * scale); g.fill();
  }
  g.fillStyle = '#242622';
  for (const [wx, wy] of [[-w * 0.52, -l * 0.27], [w * 0.52 - wheelW, -l * 0.27], [-w * 0.52, l * 0.17], [w * 0.52 - wheelW, l * 0.17]]) {
    roundRect(g, wx, wy, wheelW * 0.7, wheelH * 0.7, 2 * scale); g.fill();
  }

  // body
  const bodyGrad = g.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
  bodyGrad.addColorStop(0, carDef.color2);
  bodyGrad.addColorStop(0.34, carDef.color);
  bodyGrad.addColorStop(0.6, carDef.color);
  bodyGrad.addColorStop(1, carDef.color2);
  g.fillStyle = bodyGrad;
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = 1.6 * scale;
  g.beginPath();
  g.moveTo(0, -l * 0.5);
  g.bezierCurveTo(w * 0.32, -l * 0.48, w * 0.5, -l * 0.29, w * 0.48, -l * 0.08);
  g.lineTo(w * 0.44, l * 0.36);
  g.quadraticCurveTo(w * 0.38, l * 0.47, 0, l * 0.47);
  g.quadraticCurveTo(-w * 0.38, l * 0.47, -w * 0.44, l * 0.36);
  g.lineTo(-w * 0.48, -l * 0.08);
  g.bezierCurveTo(-w * 0.5, -l * 0.29, -w * 0.32, -l * 0.48, 0, -l * 0.5);
  g.closePath();
  g.fill();
  g.stroke();

  // hood
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.beginPath();
  g.moveTo(0, -l * 0.44);
  g.quadraticCurveTo(w * 0.28, -l * 0.38, w * 0.32, -l * 0.24);
  g.lineTo(-w * 0.32, -l * 0.24);
  g.quadraticCurveTo(-w * 0.28, -l * 0.38, 0, -l * 0.44);
  g.fill();

  // racing stripes
  g.fillStyle = carDef.accent;
  g.globalAlpha = 0.56;
  g.fillRect(-w * 0.085, -l * 0.47, w * 0.034, l * 0.27);
  g.fillRect(w * 0.051, -l * 0.47, w * 0.034, l * 0.27);
  g.globalAlpha = 1;

  // windshield / roof / rear window
  g.fillStyle = '#0f1a20';
  g.strokeStyle = 'rgba(180,230,240,0.2)';
  g.lineWidth = 1 * scale;
  g.beginPath();
  g.moveTo(-w * 0.3, -l * 0.2);
  g.lineTo(w * 0.3, -l * 0.2);
  g.lineTo(w * 0.34, -l * 0.04);
  g.lineTo(-w * 0.34, -l * 0.04);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = carDef.trim;
  roundRect(g, -w * 0.34, -l * 0.035, w * 0.68, l * 0.23, 2 * scale); g.fill();
  g.fillStyle = carDef.accent;
  g.globalAlpha = 0.7;
  g.fillRect(-w * 0.055, -l * 0.03, w * 0.11, l * 0.22);
  g.globalAlpha = 1;
  g.fillStyle = '#101b20';
  roundRect(g, -w * 0.29, l * 0.2, w * 0.58, l * 0.095, 2 * scale); g.fill();

  // trunk
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.lineWidth = 1 * scale;
  g.beginPath(); g.moveTo(-w * 0.36, l * 0.33); g.lineTo(w * 0.36, l * 0.33); g.stroke();

  // headlights
  g.save();
  g.shadowColor = '#ffe6a3';
  g.shadowBlur = 8 * scale;
  g.fillStyle = '#ffe9a9';
  roundRect(g, -w * 0.34, -l * 0.455, w * 0.16, l * 0.026, 1.5 * scale); g.fill();
  roundRect(g, w * 0.18, -l * 0.455, w * 0.16, l * 0.026, 1.5 * scale); g.fill();
  g.restore();
  // taillights
  g.fillStyle = '#ff4c32';
  g.shadowColor = '#ff2d18'; g.shadowBlur = 7 * scale;
  roundRect(g, -w * 0.38, l * 0.43, w * 0.16, l * 0.022, 1.5 * scale); g.fill();
  roundRect(g, w * 0.22, l * 0.43, w * 0.16, l * 0.022, 1.5 * scale); g.fill();
  g.shadowBlur = 0;

  // mirrors
  g.fillStyle = carDef.trim;
  g.fillRect(-w * 0.55, -l * 0.08, w * 0.1, l * 0.025);
  g.fillRect(w * 0.45, -l * 0.08, w * 0.1, l * 0.025);

  // ram
  const ramLvl = parts.ram || 0;
  if (ramLvl > 0) {
    g.fillStyle = '#8e9188';
    g.strokeStyle = '#3e413b';
    g.lineWidth = 1 * scale;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * w * 0.13 - w * 0.04, -l * 0.47);
      g.lineTo(i * w * 0.13 + w * 0.04, -l * 0.47);
      g.lineTo(i * w * 0.13, -l * 0.55 - Math.min(ramLvl, 3) * 2 * scale);
      g.closePath(); g.fill(); g.stroke();
    }
  }

  // armor plates
  if (armorId !== 'none') {
    g.fillStyle = 'rgba(120,133,126,0.85)';
    g.strokeStyle = 'rgba(30,34,31,0.8)';
    g.lineWidth = 1 * scale;
    for (const side of [-1, 1]) {
      roundRect(g, side * w * 0.43 - (side < 0 ? w * 0.07 : 0), -l * 0.16, w * 0.07, l * 0.4, 2 * scale);
      g.fill(); g.stroke();
      g.fillStyle = '#2b302c';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(side * w * 0.465, -l * 0.06 + i * l * 0.13, 1.2 * scale, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(120,133,126,0.85)';
    }
  }

  // roof rack
  if ((parts.roof || 0) > 0) {
    g.strokeStyle = '#6b6f66'; g.lineWidth = 1.5 * scale;
    for (let i = -1; i <= 1; i++) {
      g.beginPath(); g.moveTo(i * w * 0.22, l * 0.06); g.lineTo(i * w * 0.22, l * 0.27); g.stroke();
    }
  }

  // roof weapon
  g.save();
  const gunColor = weapon.color;
  const barrelLen = weapon.type === 'rail' ? l * 0.56 : weapon.type === 'flamer' ? l * 0.34 : l * 0.42;
  g.translate(0, l * 0.01);
  g.fillStyle = '#23251f';
  roundRect(g, -w * 0.15, -l * 0.04, w * 0.3, l * 0.08, 2 * scale); g.fill();
  g.fillStyle = '#646b5e';
  roundRect(g, -w * 0.034, -barrelLen, w * 0.068, barrelLen, 2 * scale); g.fill();
  g.fillStyle = gunColor;
  g.shadowColor = gunColor; g.shadowBlur = 6 * scale;
  g.fillRect(-w * 0.018, -barrelLen, w * 0.036, 4 * scale);
  g.fillStyle = '#3a3d35';
  roundRect(g, -w * 0.08, -l * 0.045, w * 0.16, l * 0.07, 2 * scale); g.fill();
  g.restore();

  // exhausts
  g.fillStyle = '#2e302a';
  g.fillRect(-w * 0.31, l * 0.44, w * 0.1, l * 0.035);
  g.fillRect(w * 0.21, l * 0.44, w * 0.1, l * 0.035);

  // highlight rim
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 1 * scale;
  g.beginPath();
  g.moveTo(-w * 0.4, -l * 0.12);
  g.quadraticCurveTo(-w * 0.32, -l * 0.42, 0, -l * 0.46);
  g.stroke();

  g.restore();
}

// ── zombie drawing ────────────────────────────────────────────
function drawZombie(e) {
  const g = ctx;
  const baseScale = e.radius / 13;
  const s = baseScale * (e.boss ? 1.45 : 1);
  g.save();
  g.translate(e.x, e.y);
  g.rotate(e.angle);

  // shadow
  g.save();
  g.translate(2, 4);
  g.fillStyle = 'rgba(0,0,0,0.32)';
  g.beginPath(); g.ellipse(0, 0, 11 * s, 15 * s, 0, 0, TAU); g.fill();
  g.restore();

  if (e.slow > 0) {
    g.strokeStyle = 'rgba(125,232,255,0.45)';
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, 15 * s + Math.sin(time * 6) * 2, 0, TAU); g.stroke();
  }

  const step = Math.sin(e.t * (e.type === 'runner' ? 12 : 5) + e.seed) * 3 * s;
  // legs
  g.strokeStyle = e.cloth;
  g.lineWidth = 3.2 * s;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(-4 * s, 5 * s); g.lineTo(-7 * s, 14 * s + step); g.stroke();
  g.beginPath(); g.moveTo(4 * s, 5 * s); g.lineTo(7 * s, 14 * s - step); g.stroke();

  // body
  g.fillStyle = e.cloth;
  g.beginPath(); g.ellipse(0, 0, 9 * s, 12 * s, 0, 0, TAU); g.fill();
  g.fillStyle = e.skin;
  g.beginPath(); g.ellipse(0, -1 * s, 6.2 * s, 8 * s, 0, 0, TAU); g.fill();

  // torn shirt
  g.fillStyle = e.color;
  g.globalAlpha = 0.55;
  g.beginPath();
  g.moveTo(-8 * s, -4 * s); g.lineTo(8 * s, -4 * s); g.lineTo(6 * s, 6 * s); g.lineTo(2 * s, 3 * s); g.lineTo(-2 * s, 7 * s); g.lineTo(-6 * s, 4 * s); g.closePath(); g.fill();
  g.globalAlpha = 1;

  // arms reaching forward (up in local space)
  const armSwing = Math.sin(e.t * 4 + e.seed) * 2 * s;
  g.strokeStyle = e.skin;
  g.lineWidth = 2.6 * s;
  g.beginPath(); g.moveTo(-7 * s, -4 * s); g.lineTo(-9 * s + armSwing, -17 * s); g.stroke();
  g.beginPath(); g.moveTo(7 * s, -4 * s); g.lineTo(9 * s - armSwing, -17 * s); g.stroke();
  g.fillStyle = e.skin;
  g.beginPath(); g.arc(-9 * s + armSwing, -17 * s, 2 * s, 0, TAU); g.fill();
  g.beginPath(); g.arc(9 * s - armSwing, -17 * s, 2 * s, 0, TAU); g.fill();

  // head
  g.fillStyle = e.skin;
  g.beginPath(); g.arc(0, -11 * s, 6.2 * s, 0, TAU); g.fill();
  g.fillStyle = e.cloth;
  g.beginPath(); g.arc(0, -13 * s, 5.8 * s, Math.PI, TAU); g.fill();
  // eyes
  g.fillStyle = e.boss ? '#ffcf4a' : '#ff7048';
  g.shadowColor = g.fillStyle; g.shadowBlur = 6;
  g.beginPath(); g.arc(-2.2 * s, -13 * s, 1.2 * s, 0, TAU); g.fill();
  g.beginPath(); g.arc(2.2 * s, -13 * s, 1.2 * s, 0, TAU); g.fill();
  g.shadowBlur = 0;
  // mouth
  g.strokeStyle = '#4a1d18'; g.lineWidth = 1 * s;
  g.beginPath(); g.moveTo(-2 * s, -8.5 * s); g.lineTo(2 * s, -8.5 * s); g.stroke();

  if (e.type === 'brute' || e.boss) {
    g.fillStyle = 'rgba(80,85,72,0.9)';
    g.strokeStyle = 'rgba(30,34,28,0.8)'; g.lineWidth = 1 * s;
    roundRect(g, -9 * s, -5 * s, 18 * s, 6 * s, 2 * s); g.fill(); g.stroke();
    g.fillStyle = '#aeb39f';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 3.5 * s, -2 * s, 1 * s, 0, TAU); g.fill(); }
  }
  if (e.type === 'bloater') {
    g.fillStyle = 'rgba(130,160,75,0.45)';
    g.beginPath(); g.arc(0, 1 * s, 10 * s, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(50,70,30,0.7)'; g.lineWidth = 1;
    g.beginPath(); g.arc(3 * s, 2 * s, 4 * s, 0, TAU); g.stroke();
  }
  if (e.boss) {
    g.strokeStyle = '#3b1414';
    g.lineWidth = 2 * s;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      g.beginPath();
      g.moveTo(Math.cos(a) * 10 * s, Math.sin(a) * 12 * s);
      g.lineTo(Math.cos(a) * 18 * s, Math.sin(a) * 21 * s);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,80,60,0.5)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, 24 * s + Math.sin(time * 4) * 3, 0, TAU); g.stroke();
  }
  if (e.burn > 0) {
    g.fillStyle = `rgba(255,122,26,${0.15 + Math.sin(time * 18 + e.seed) * 0.08})`;
    g.beginPath(); g.arc(0, 0, 14 * s, 0, TAU); g.fill();
  }
  if (e.flash > 0) {
    g.globalAlpha = clamp(e.flash * 5, 0, 0.7);
    g.fillStyle = '#fff3d4';
    g.beginPath(); g.arc(0, 0, 14 * s, 0, TAU); g.fill();
    g.globalAlpha = 1;
  }
  g.restore();

  // health bar
  if (e.hp < e.maxHp || e.boss) {
    const w = e.boss ? 76 : 30 * s;
    const yy = e.y - e.radius * (e.boss ? 2.15 : 1.75) - 8;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(e.x - w / 2, yy, w, e.boss ? 5 : 3);
    g.fillStyle = e.boss ? '#ff5b3d' : '#c9f34c';
    g.fillRect(e.x - w / 2, yy, w * clamp(e.hp / e.maxHp, 0, 1), e.boss ? 5 : 3);
    if (e.boss) {
      g.fillStyle = '#f0dfc4';
      g.font = '700 9px "Courier New", monospace';
      g.textAlign = 'center';
      g.fillText(e.name, e.x, yy - 5);
    }
    g.restore();
  }
}

// ── bullets / effects / particles ─────────────────────────────
function drawBullets() {
  const g = ctx;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const b of bullets) {
    const a = clamp(b.life / 0.5, 0, 1);
    g.strokeStyle = b.color;
    g.globalAlpha = 0.55 * a;
    g.lineWidth = b.radius * 1.7;
    g.beginPath(); g.moveTo(b.px, b.py); g.lineTo(b.x, b.y); g.stroke();
    g.globalAlpha = 0.95;
    g.fillStyle = b.color;
    g.beginPath(); g.arc(b.x, b.y, b.radius * 0.75, 0, TAU); g.fill();
    g.globalAlpha = 0.35;
    g.fillStyle = '#fff4d2';
    g.beginPath(); g.arc(b.x, b.y, b.radius * 1.6, 0, TAU); g.fill();
  }
  g.restore();
}

function drawEffects() {
  const g = ctx;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const e of effects) {
    const k = clamp(e.life / e.maxLife, 0, 1);
    if (e.kind === 'beam') {
      g.globalAlpha = k;
      g.strokeStyle = e.color;
      g.lineWidth = e.width;
      g.beginPath(); g.moveTo(e.x1, e.y1); g.lineTo(e.x2, e.y2); g.stroke();
      g.globalAlpha = k * 0.55;
      g.strokeStyle = '#fff5d8';
      g.lineWidth = Math.max(0.7, e.width * 0.34);
      g.beginPath(); g.moveTo(e.x1, e.y1); g.lineTo(e.x2, e.y2); g.stroke();
    } else if (e.kind === 'ring') {
      const rr = e.r * (1 - k);
      g.globalAlpha = k * 0.9;
      g.strokeStyle = e.color;
      g.lineWidth = e.width;
      g.beginPath(); g.arc(e.x, e.y, Math.max(1, rr), 0, TAU); g.stroke();
    } else if (e.kind === 'lightning') {
      g.globalAlpha = k;
      g.strokeStyle = e.color;
      g.lineWidth = 3.2;
      g.beginPath();
      for (let i = 0; i < e.points.length - 1; i++) {
        const a = e.points[i], b = e.points[i + 1];
        g.moveTo(a.x, a.y);
        const steps = 5;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const jx = s === steps ? 0 : rand(-8, 8);
          const jy = s === steps ? 0 : rand(-8, 8);
          g.lineTo(lerp(a.x, b.x, t) + jx, lerp(a.y, b.y, t) + jy);
        }
      }
      g.stroke();
      g.globalAlpha = k * 0.5;
      g.strokeStyle = '#fff';
      g.lineWidth = 1;
      g.stroke();
    } else if (e.kind === 'muzzle') {
      const size = e.size * (1.4 - k * 0.4);
      g.save();
      g.globalAlpha = k;
      g.translate(e.x, e.y);
      g.rotate(e.angle);
      g.fillStyle = e.color;
      g.beginPath();
      g.moveTo(0, -size * 0.35);
      g.lineTo(size * 1.5, 0);
      g.lineTo(0, size * 0.35);
      g.lineTo(-size * 0.4, 0);
      g.closePath(); g.fill();
      g.fillStyle = '#fff3cf';
      g.beginPath(); g.arc(0, 0, size * 0.38, 0, TAU); g.fill();
      g.restore();
    }
  }
  g.restore();
}

function drawParticles() {
  const g = ctx;
  g.save();
  for (const p of particles) {
    const k = clamp(p.life / p.maxLife, 0, 1);
    g.globalAlpha = k;
    if (p.kind === 'spark' || p.kind === 'flame') {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = p.color;
      g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + k * 0.7), 0, TAU); g.fill();
    } else if (p.kind === 'smoke') {
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = p.color;
      g.globalAlpha = k * 0.26;
      g.beginPath(); g.arc(p.x, p.y, p.size * (1.5 - k * 0.5), 0, TAU); g.fill();
    } else if (p.kind === 'blood') {
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = p.color;
      g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + k * 0.6), 0, TAU); g.fill();
    } else {
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = p.color;
      g.save();
      g.translate(p.x, p.y); g.rotate(p.rot);
      g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      g.restore();
    }
  }
  g.restore();
}

function drawFloaters() {
  const g = ctx;
  g.save();
  g.textAlign = 'center';
  for (const f of floaters) {
    const k = clamp(f.life / f.maxLife, 0, 1);
    g.globalAlpha = k;
    g.font = `900 ${f.size}px "Arial Black", Impact, sans-serif`;
    g.fillStyle = '#1a0d05';
    g.fillText(f.text, f.x + 1, f.y + 1);
    g.fillStyle = f.color;
    g.fillText(f.text, f.x, f.y);
  }
  g.restore();
}

function drawPickups() {
  const g = ctx;
  for (const p of pickups) {
    const bob = Math.sin(time * 4 + p.t) * 3;
    const col = p.type === 'health' ? '#ff6b52' : p.type === 'armor' ? '#6fd8ee' : '#c9f34c';
    g.save();
    g.translate(p.x, p.y + bob);
    g.shadowColor = col; g.shadowBlur = 14;
    g.fillStyle = 'rgba(8,10,7,0.88)';
    g.strokeStyle = col; g.lineWidth = 1.4;
    roundRect(g, -10, -10, 20, 20, 3); g.fill(); g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = col;
    if (p.type === 'health') {
      g.fillRect(-6, -2, 12, 4);
      g.fillRect(-2, -6, 4, 12);
    } else if (p.type === 'armor') {
      g.beginPath(); g.moveTo(0, -7); g.lineTo(6, -4); g.lineTo(6, 2); g.lineTo(0, 7); g.lineTo(-6, 2); g.lineTo(-6, -4); g.closePath(); g.fill();
    } else {
      g.beginPath(); g.moveTo(0, -7); g.lineTo(6, 0); g.lineTo(0, 7); g.lineTo(-6, 0); g.closePath(); g.fill();
    }
    g.restore();
  }
}

// ── hardpoints / turrets / base ───────────────────────────────
function drawSlots() {
  const g = ctx;
  const slots = getSlots();
  const build = holdout.phase === 'build';
  const sel = holdout.selected ? TURRETS[holdout.selected] : null;
  for (let i = 0; i < stats.slots; i++) {
    const slot = slots[i];
    const placed = holdout.placed.find(p => p.slot === i);
    if (build && sel && !placed) {
      g.save();
      g.globalAlpha = 0.1;
      g.strokeStyle = sel.color; g.lineWidth = 1.5;
      g.beginPath(); g.arc(slot.x, slot.y, sel.range * stats.turretRange, 0, TAU); g.stroke();
      g.restore();
    }
    if (placed) {
      drawTurret(placed, slot, build);
      continue;
    }
    g.save();
    g.translate(slot.x, slot.y);
    const pulse = build ? 0.65 + Math.sin(time * 5 + i) * 0.2 : 0.3;
    g.globalAlpha = pulse;
    g.strokeStyle = sel ? sel.color : 'rgba(237,226,199,0.55)';
    g.lineWidth = 1.4;
    g.setLineDash([4, 4]);
    g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.stroke();
    g.setLineDash([]);
    g.globalAlpha *= 0.55;
    g.fillStyle = sel ? sel.color : '#ede2c7';
    g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill();
    if (build) {
      g.globalAlpha = pulse;
      g.font = '900 13px "Courier New", monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('+', 0, 1);
    }
    g.restore();
  }
}

function drawTurret(p, slot, build) {
  const g = ctx;
  const t = TURRETS[p.type];
  const lvl = S.turretLevels[p.type] || 1;
  const angle = p.angle ?? -Math.PI / 2;
  g.save();
  g.translate(slot.x, slot.y);
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.36)';
  g.beginPath(); g.ellipse(2, 6, 23, 16, 0, 0, TAU); g.fill();
  // base
  g.fillStyle = '#20231c';
  g.strokeStyle = t.color;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    const x = Math.cos(a) * 19, y = Math.sin(a) * 16;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(237,226,199,0.09)';
  g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();

  // barrels
  g.save();
  g.rotate(angle);
  if (p.type === 'gunner') {
    g.fillStyle = '#7e8477';
    roundRect(g, 3, -3.5, 25, 3.5, 1.5); g.fill();
    roundRect(g, 3, 1, 25, 3.5, 1.5); g.fill();
    g.fillStyle = t.color;
    g.fillRect(24, -4, 4, 4); g.fillRect(24, 1.5, 4, 4);
  } else if (p.type === 'pyro') {
    g.fillStyle = '#7e8477';
    roundRect(g, 2, -5, 20, 10, 3); g.fill();
    g.fillStyle = t.color;
    g.beginPath(); g.moveTo(21, -6); g.lineTo(28, 0); g.lineTo(21, 6); g.closePath(); g.fill();
    g.fillStyle = '#ffcf4a';
    g.beginPath(); g.arc(29, 0, 2.5, 0, TAU); g.fill();
  } else if (p.type === 'tesla') {
    g.fillStyle = '#3b464a';
    roundRect(g, 0, -3, 18, 6, 2); g.fill();
    g.fillStyle = t.color;
    g.shadowColor = t.color; g.shadowBlur = 12;
    g.beginPath(); g.arc(20, 0, 6, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1;
    g.beginPath(); g.arc(20, 0, 8 + Math.sin(time * 8) * 2, 0, TAU); g.stroke();
  } else if (p.type === 'mortar') {
    g.fillStyle = '#777d70';
    roundRect(g, 2, -6, 24, 12, 4); g.fill();
    g.fillStyle = '#2c3028';
    g.beginPath(); g.arc(25, 0, 5, 0, TAU); g.fill();
    g.fillStyle = t.color;
    g.beginPath(); g.arc(25, 0, 2.5, 0, TAU); g.fill();
  } else if (p.type === 'sniper') {
    g.fillStyle = '#8a9083';
    roundRect(g, 0, -2.2, 36, 4.4, 2); g.fill();
    g.fillStyle = '#2c3028';
    roundRect(g, 8, -5, 8, 10, 2); g.fill();
    g.fillStyle = t.color;
    g.fillRect(35, -2, 4, 4);
  } else if (p.type === 'cryo') {
    g.fillStyle = '#6d858d';
    roundRect(g, 0, -6, 20, 12, 4); g.fill();
    g.fillStyle = t.color;
    g.beginPath(); g.arc(21, 0, 5, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(220,250,255,.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(21, -8); g.lineTo(21, 8); g.moveTo(15, -5); g.lineTo(27, 5); g.moveTo(15, 5); g.lineTo(27, -5); g.stroke();
  }
  g.restore();

  // level pips
  g.fillStyle = t.color;
  for (let i = 0; i < 4; i++) {
    g.globalAlpha = i < lvl ? 0.9 : 0.16;
    g.fillRect(-9 + i * 5, 11, 3, 2);
  }
  g.globalAlpha = 1;
  if (build) {
    g.strokeStyle = 'rgba(237,226,199,0.12)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, t.range * stats.turretRange, 0, TAU); g.stroke();
  }
  g.restore();
}

function drawBase() {
  const g = ctx;
  const hitJ = base.hit > 0 ? rand(-2, 2) : 0;
  g.save();
  g.translate(base.x + hitJ, base.y);
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath(); g.ellipse(3, 10, 72, 88, 0, 0, TAU); g.fill();

  // barricade spikes
  if (stats.barricade > 0) {
    g.strokeStyle = '#8f8d7a'; g.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      g.beginPath(); g.moveTo(i * 18, -88); g.lineTo(i * 18 + 4, -100); g.stroke();
    }
    g.fillStyle = 'rgba(180,70,40,0.25)';
    g.fillRect(-65, -86, 130, 4);
  }

  // wheels
  g.fillStyle = '#090b09';
  for (const [wx, wy] of [[-58, -52], [42, -52], [-58, 12], [42, 12], [-58, 48], [42, 48]]) {
    roundRect(g, wx, wy, 17, 32, 5); g.fill();
  }
  g.fillStyle = '#292c26';
  for (const [wx, wy] of [[-54, -48], [46, -48], [-54, 16], [46, 16], [-54, 52], [46, 52]]) {
    roundRect(g, wx, wy, 10, 24, 3); g.fill();
  }

  // main chassis
  const bodyGrad = g.createLinearGradient(-55, 0, 55, 0);
  bodyGrad.addColorStop(0, '#22271d');
  bodyGrad.addColorStop(0.35, '#3d4533');
  bodyGrad.addColorStop(0.65, '#333b29');
  bodyGrad.addColorStop(1, '#1b2017');
  g.fillStyle = bodyGrad;
  g.strokeStyle = '#0d100b';
  g.lineWidth = 2;
  roundRect(g, -52, -74, 104, 140, 8); g.fill(); g.stroke();

  // cab
  g.fillStyle = '#4b543c';
  roundRect(g, -44, -68, 88, 40, 5); g.fill();
  g.fillStyle = '#101b20';
  roundRect(g, -34, -62, 68, 22, 3); g.fill();
  g.strokeStyle = 'rgba(180,230,240,0.18)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-32, -52); g.lineTo(32, -52); g.stroke();
  g.fillStyle = '#1b1f18';
  g.fillRect(-40, -70, 18, 5); g.fillRect(22, -70, 18, 5);

  // armor panels / rivets
  g.strokeStyle = 'rgba(160,170,140,0.22)'; g.lineWidth = 1;
  for (let y = -18; y <= 54; y += 18) {
    g.beginPath(); g.moveTo(-50, y); g.lineTo(50, y); g.stroke();
  }
  g.fillStyle = 'rgba(220,215,180,0.4)';
  for (let i = 0; i < 8; i++) {
    g.beginPath(); g.arc(-45 + (i % 2) * 90, -16 + Math.floor(i / 2) * 20, 1.4, 0, TAU); g.fill();
  }

  // hazard stripes
  g.save();
  g.beginPath(); g.rect(-52, 34, 104, 16); g.clip();
  g.fillStyle = '#c58c2c';
  g.fillRect(-52, 34, 104, 16);
  g.fillStyle = '#2a251a';
  for (let i = -6; i < 7; i++) {
    g.save(); g.translate(i * 16, 42); g.rotate(-0.55); g.fillRect(-4, -12, 8, 24); g.restore();
  }
  g.restore();

  // rear deck / fuel drums
  g.fillStyle = '#2d3226';
  roundRect(g, -40, 54, 80, 18, 3); g.fill();
  g.fillStyle = '#7d3b2a';
  roundRect(g, -30, 58, 12, 11, 2); g.fill();
  roundRect(g, -14, 58, 12, 11, 2); g.fill();
  g.fillStyle = '#9a8c52';
  roundRect(g, 6, 58, 18, 10, 2); g.fill();

  // cab lights
  g.fillStyle = `rgba(255,170,60,${0.55 + Math.sin(time * 4) * 0.25})`;
  g.shadowColor = '#ffb347'; g.shadowBlur = 12;
  g.beginPath(); g.arc(-30, -72, 3, 0, TAU); g.fill();
  g.beginPath(); g.arc(30, -72, 3, 0, TAU); g.fill();
  g.shadowBlur = 0;

  // main gun
  g.save();
  g.translate(0, -76);
  g.rotate(base.angle + Math.PI / 2);
  g.fillStyle = '#1c2018';
  g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
  g.strokeStyle = '#5b6351'; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.stroke();
  g.fillStyle = '#7c8373';
  roundRect(g, -4.5, -44, 9, 44, 3); g.fill();
  g.fillStyle = '#ffb347';
  g.shadowColor = '#ff7a1a'; g.shadowBlur = 8;
  g.fillRect(-2, -43, 4, 4);
  g.shadowBlur = 0;
  g.restore();

  // flag
  g.strokeStyle = '#3c4036'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(44, 46); g.lineTo(44, -20); g.stroke();
  const wave = Math.sin(time * 3) * 4;
  g.fillStyle = '#c34e28';
  g.beginPath();
  g.moveTo(44, -20);
  g.quadraticCurveTo(58 + wave, -14, 68 + wave, -6);
  g.lineTo(60 + wave, 0);
  g.quadraticCurveTo(52, -2, 44, 2);
  g.closePath(); g.fill();

  // shield emblem
  g.save();
  g.translate(0, 10);
  g.fillStyle = 'rgba(255,179,71,0.12)';
  g.strokeStyle = 'rgba(255,179,71,0.55)'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(0, -13); g.lineTo(11, -8); g.lineTo(11, 3); g.lineTo(0, 14); g.lineTo(-11, 3); g.lineTo(-11, -8); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffb347';
  g.font = '900 9px "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('66', 0, 0);
  g.restore();

  // parked car
  drawCar(g, -82, 38, 0.72, CARS[S.carId], { tilt: -0.05, noShadow: false });

  g.restore();

  // base hp bar above
  const pct = clamp(base.hp / base.maxHp, 0, 1);
  const bw = 118, bx = base.x - bw / 2, by = base.y - 138;
  g.save();
  g.fillStyle = 'rgba(8,10,7,0.72)';
  g.fillRect(bx - 1, by - 1, bw + 2, 8);
  g.fillStyle = pct > 0.5 ? '#5ed4c8' : pct > 0.25 ? '#ffb347' : '#ff5b3d';
  g.fillRect(bx, by, bw * pct, 6);
  g.strokeStyle = 'rgba(237,226,199,0.25)'; g.lineWidth = 1;
  g.strokeRect(bx - 1, by - 1, bw + 2, 8);
  g.restore();
}

function drawCrosshair() {
  const g = ctx;
  const w = WEAPONS[S.weaponId];
  const col = w.color;
  const pulse = Math.sin(time * 5) * 2;
  g.save();
  g.translate(aim.x, aim.y);
  g.globalAlpha = 0.18;
  g.strokeStyle = col; g.lineWidth = 1;
  g.setLineDash([3, 9]);
  g.beginPath(); g.moveTo(base.x, base.y - 78); g.lineTo(0, 0); g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 0.95;
  g.strokeStyle = col; g.lineWidth = 1.4;
  g.beginPath(); g.arc(0, 0, 11 + pulse, 0, TAU); g.stroke();
  g.globalAlpha = 0.5;
  g.beginPath(); g.arc(0, 0, 18 + pulse, 0.3, 1.3); g.stroke();
  g.beginPath(); g.arc(0, 0, 18 + pulse, Math.PI + 0.3, Math.PI + 1.3); g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = col;
  g.beginPath(); g.arc(0, 0, 2.4, 0, TAU); g.fill();
  g.strokeStyle = col;
  g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-18, 0); g.lineTo(-8, 0); g.moveTo(8, 0); g.lineTo(18, 0); g.moveTo(0, -18); g.lineTo(0, -8); g.moveTo(0, 8); g.lineTo(0, 18); g.stroke();
  g.restore();
}

// ── main scene renders ────────────────────────────────────────
function renderRoad() {
  const pal = palette();
  drawGround(pal);
  drawRoad(pal);
  drawProps();
  drawNight(pal, 'road');
  drawPickups();
  for (const e of enemies) drawZombie(e);
  drawBullets();
  drawEffects();
  drawCar(ctx, car.x, car.y, 1, CARS[S.carId], { tilt: car.tilt });
  drawParticles();
  drawFloaters();
  drawWeather();
}

function renderHoldout() {
  const pal = palette();
  const L = layout();
  base.x = L.cx;
  base.y = L.baseY;
  drawGround(pal);
  drawRoad(pal);
  drawProps();
  drawNight(pal, 'holdout');

  // build phase warning arrows
  if (holdout.phase === 'wave') {
    const g = ctx;
    g.save();
    g.globalAlpha = 0.35 + Math.sin(time * 6) * 0.2;
    g.fillStyle = '#ff6b3d';
    for (let i = 0; i < 3; i++) {
      const x = L.roadX + L.roadW * (0.25 + i * 0.25);
      g.beginPath(); g.moveTo(x - 9, 74); g.lineTo(x + 9, 74); g.lineTo(x, 88); g.closePath(); g.fill();
    }
    g.restore();
  }

  drawSlots();
  drawBase();
  for (const e of enemies) drawZombie(e);
  drawBullets();
  drawEffects();
  drawCrosshair();
  drawParticles();
  drawFloaters();
  drawWeather();
}

// ═══════════════════════════════════════════════════════════════
//  TITLE SCENE
// ═══════════════════════════════════════════════════════════════
function updateTitleAsh(dt) {
  for (const p of titleAsh) {
    p.y += p.sp * dt;
    p.x += p.drift * dt;
    if (p.y > H + 5) { p.y = -5; p.x = rand(0, W); }
    if (p.x < -5) p.x = W + 5;
    if (p.x > W + 5) p.x = -5;
  }
}

function renderTitle() {
  const g = ctx;
  const cx = W / 2;
  const horizon = H * 0.55;
  // sky
  const sky = g.createLinearGradient(0, 0, 0, horizon + 20);
  sky.addColorStop(0, '#0b1517');
  sky.addColorStop(0.38, '#19251f');
  sky.addColorStop(0.66, '#5a3221');
  sky.addColorStop(0.86, '#b95b28');
  sky.addColorStop(1, '#e3893d');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, horizon + 30);

  // sun
  const sunX = W * 0.72, sunY = horizon - H * 0.055, sunR = Math.min(W * 0.19, 128);
  const glow = g.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, 'rgba(255,205,120,0.75)');
  glow.addColorStop(0.25, 'rgba(255,145,50,0.30)');
  glow.addColorStop(1, 'rgba(255,100,20,0)');
  g.fillStyle = glow;
  g.fillRect(sunX - sunR * 2.6, sunY - sunR * 2.6, sunR * 5.2, sunR * 5.2);
  const sun = g.createRadialGradient(sunX, sunY - sunR * 0.3, 4, sunX, sunY, sunR);
  sun.addColorStop(0, '#ffe0a0');
  sun.addColorStop(0.55, '#ffab4d');
  sun.addColorStop(1, '#d85e1f');
  g.fillStyle = sun;
  g.beginPath(); g.arc(sunX, sunY, sunR, 0, TAU); g.fill();
  // sun bands
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.globalAlpha = 0.2;
  for (let i = 0; i < 4; i++) g.fillRect(sunX - sunR, sunY + sunR * 0.15 + i * 9, sunR * 2, 3);
  g.restore();

  // distant mountains
  g.fillStyle = '#17201c';
  g.beginPath();
  g.moveTo(0, horizon);
  const pts = 10;
  for (let i = 0; i <= pts; i++) {
    const x = (i / pts) * W;
    const h = 14 + Math.abs(Math.sin(i * 1.7)) * 42;
    g.lineTo(x, horizon - h);
  }
  g.lineTo(W, horizon);
  g.closePath(); g.fill();
  g.fillStyle = '#101714';
  g.beginPath();
  g.moveTo(0, horizon);
  for (let i = 0; i <= 14; i++) {
    const x = (i / 14) * W;
    const h = 8 + Math.abs(Math.cos(i * 2.3)) * 24;
    g.lineTo(x, horizon - h);
  }
  g.lineTo(W, horizon);
  g.closePath(); g.fill();

  // ground
  const ground = g.createLinearGradient(0, horizon, 0, H);
  ground.addColorStop(0, '#2e271d');
  ground.addColorStop(0.4, '#1b1a14');
  ground.addColorStop(1, '#0c0e0a');
  g.fillStyle = ground;
  g.fillRect(0, horizon, W, H - horizon);

  // road perspective
  const bottomHalf = Math.min(W * 0.42, 390);
  const roadGrad = g.createLinearGradient(0, horizon, 0, H);
  roadGrad.addColorStop(0, '#25231d');
  roadGrad.addColorStop(1, '#11120e');
  g.fillStyle = roadGrad;
  g.beginPath();
  g.moveTo(cx - 2, horizon);
  g.lineTo(cx + 2, horizon);
  g.lineTo(cx + bottomHalf, H);
  g.lineTo(cx - bottomHalf, H);
  g.closePath(); g.fill();

  // road edge lines
  g.strokeStyle = 'rgba(220,200,155,0.45)';
  g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(cx - 2, horizon); g.lineTo(cx - bottomHalf, H); g.stroke();
  g.beginPath(); g.moveTo(cx + 2, horizon); g.lineTo(cx + bottomHalf, H); g.stroke();

  // perspective center dashes
  for (let i = 0; i < 9; i++) {
    const t1 = i / 9, t2 = t1 + 0.035;
    const y1 = horizon + (H - horizon) * t1 ** 1.45;
    const y2 = horizon + (H - horizon) * t2 ** 1.45;
    const w1 = 1 + 4 * t1, w2 = 1 + 4 * t2;
    g.fillStyle = 'rgba(225,205,155,0.32)';
    g.beginPath();
    g.moveTo(cx - w1 / 2, y1); g.lineTo(cx + w1 / 2, y1);
    g.lineTo(cx + w2 / 2, y2); g.lineTo(cx - w2 / 2, y2);
    g.closePath(); g.fill();
  }

  // utility poles
  g.strokeStyle = '#0c0d0a'; g.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const y = horizon + (H - horizon) * (t ** 1.7) * 0.8;
    const x = cx - lerp(12, W * 0.62, t ** 1.2);
    const h = 18 + t * 90;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.stroke();
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x - h * 0.2, y - h * 0.9); g.lineTo(x + h * 0.2, y - h * 0.9); g.stroke();
    g.lineWidth = 3;
  }

  // zombie silhouettes
  for (let i = 0; i < 7; i++) {
    const t = 0.12 + i * 0.085;
    const y = horizon + (H - horizon) * (t ** 1.5);
    const side = i % 2 ? 1 : -1;
    const x = cx + side * (bottomHalf * t * 0.72) + Math.sin(i * 2.7) * 10;
    drawTitleZombie(x, y, 0.25 + t * 1.2, i);
  }

  // car rear
  drawTitleCar(cx, H * 0.72 + Math.sin(time * 1.6) * 2, Math.max(0.62, Math.min(1.55, W / 780)));

  // ash
  g.save();
  for (const p of titleAsh) {
    g.globalAlpha = p.a;
    g.fillStyle = '#e8d7b3';
    g.beginPath(); g.arc(p.x, p.y, p.s, 0, TAU); g.fill();
  }
  g.restore();

  // horizon haze
  const haze = g.createLinearGradient(0, horizon - 50, 0, horizon + 80);
  haze.addColorStop(0, 'rgba(220,110,40,0)');
  haze.addColorStop(0.5, 'rgba(220,110,40,0.12)');
  haze.addColorStop(1, 'rgba(220,110,40,0)');
  g.fillStyle = haze;
  g.fillRect(0, horizon - 50, W, 130);
}

function drawTitleZombie(x, y, s, seed) {
  const g = ctx;
  const sway = Math.sin(time * 1.5 + seed) * 0.08;
  g.save();
  g.translate(x, y);
  g.rotate(sway);
  g.scale(s, s);
  g.fillStyle = 'rgba(6,8,5,0.9)';
  g.strokeStyle = 'rgba(6,8,5,0.9)';
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(-3, 7); g.lineTo(-7, 22); g.stroke();
  g.beginPath(); g.moveTo(3, 7); g.lineTo(7, 22); g.stroke();
  g.beginPath(); g.ellipse(0, 0, 7, 11, 0, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, -12, 5, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-5, -5); g.lineTo(-12, -16); g.stroke();
  g.beginPath(); g.moveTo(5, -5); g.lineTo(12, -16); g.stroke();
  g.restore();
}

function drawTitleCar(x, y, s) {
  const g = ctx;
  const w = 178 * s, h = 122 * s;
  g.save();
  g.translate(x, y);
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.beginPath(); g.ellipse(0, h * 0.38, w * 0.56, h * 0.22, 0, 0, TAU); g.fill();
  // wheels
  g.fillStyle = '#070806';
  roundRect(g, -w * 0.54, -h * 0.12, w * 0.15, h * 0.5, 6 * s); g.fill();
  roundRect(g, w * 0.39, -h * 0.12, w * 0.15, h * 0.5, 6 * s); g.fill();
  // body
  const grad = g.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
  grad.addColorStop(0, '#5b1c11');
  grad.addColorStop(0.28, '#b33c24');
  grad.addColorStop(0.55, '#c94a2c');
  grad.addColorStop(1, '#56180f');
  g.fillStyle = grad;
  g.strokeStyle = '#1b0d08'; g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-w * 0.43, -h * 0.3);
  g.quadraticCurveTo(0, -h * 0.4, w * 0.43, -h * 0.3);
  g.lineTo(w * 0.49, h * 0.22);
  g.quadraticCurveTo(w * 0.4, h * 0.4, 0, h * 0.4);
  g.quadraticCurveTo(-w * 0.4, h * 0.4, -w * 0.49, h * 0.22);
  g.closePath(); g.fill(); g.stroke();
  // rear window
  g.fillStyle = '#0b1317';
  roundRect(g, -w * 0.3, -h * 0.28, w * 0.6, h * 0.19, 5 * s); g.fill();
  // trunk
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5 * s;
  g.beginPath(); g.moveTo(-w * 0.36, h * 0.04); g.lineTo(w * 0.36, h * 0.04); g.stroke();
  // tail lights
  g.fillStyle = '#ff4b2e';
  g.shadowColor = '#ff2a12'; g.shadowBlur = 18 * s;
  roundRect(g, -w * 0.38, h * 0.16, w * 0.18, h * 0.06, 2 * s); g.fill();
  roundRect(g, w * 0.2, h * 0.16, w * 0.18, h * 0.06, 2 * s); g.fill();
  g.shadowBlur = 0;
  // bumper
  g.fillStyle = '#1b1c17';
  roundRect(g, -w * 0.46, h * 0.28, w * 0.92, h * 0.07, 3 * s); g.fill();
  // plate
  g.fillStyle = '#cfc39e';
  g.fillRect(-w * 0.09, h * 0.23, w * 0.18, h * 0.055);
  g.fillStyle = '#191a15';
  g.font = `900 ${11 * s}px "Courier New", monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('66', 0, h * 0.258);
  // roof rack
  g.strokeStyle = '#5b5d51'; g.lineWidth = 2 * s;
  g.beginPath(); g.moveTo(-w * 0.28, -h * 0.12); g.lineTo(w * 0.28, -h * 0.12); g.stroke();
  g.beginPath(); g.moveTo(-w * 0.24, -h * 0.18); g.lineTo(-w * 0.24, -h * 0.04); g.stroke();
  g.beginPath(); g.moveTo(w * 0.24, -h * 0.18); g.lineTo(w * 0.24, -h * 0.04); g.stroke();
  // spare tire
  g.fillStyle = '#151612';
  g.beginPath(); g.arc(0, -h * 0.05, h * 0.09, 0, TAU); g.fill();
  g.strokeStyle = '#3b3d34'; g.lineWidth = 2 * s;
  g.beginPath(); g.arc(0, -h * 0.05, h * 0.055, 0, TAU); g.stroke();
  // exhaust
  g.fillStyle = '#2b2d26';
  roundRect(g, -w * 0.33, h * 0.36, w * 0.08, h * 0.04, 2 * s); g.fill();
  // rim light
  g.strokeStyle = 'rgba(255,179,71,0.35)'; g.lineWidth = 1.4 * s;
  g.beginPath(); g.moveTo(-w * 0.45, -h * 0.22); g.quadraticCurveTo(-w * 0.28, -h * 0.37, 0, -h * 0.37); g.stroke();
  g.restore();
}

// ═══════════════════════════════════════════════════════════════
//  LOOP / BOOT
// ═══════════════════════════════════════════════════════════════
let lastTs = 0;
function loop(ts) {
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 60;
  dt = Math.min(dt, 0.045);
  time += dt;

  if (S.screen === 'title') {
    titleTime += dt;
    updateTitleAsh(dt);
  } else if (!paused && !gameOver && (S.screen === 'road' || S.screen === 'holdout')) {
    if (S.mode === 'road') updateRoad(dt);
    else updateHoldout(dt);
  }

  if (newRunArmed) {
    newRunTimer -= dt;
    if (newRunTimer <= 0) {
      newRunArmed = false;
      el.startBtn.textContent = 'START THE ENGINE';
    }
  }
  if (hintTimer > 0) {
    hintTimer -= dt;
    if (hintTimer <= 0) el.hint.classList.remove('show');
  }

  uiTimer -= dt;
  if (uiTimer <= 0 && (S.screen === 'road' || S.screen === 'holdout')) {
    updateHUD();
    uiTimer = 0.1;
  }

  render();
  requestAnimationFrame(loop);
}

function boot() {
  resize();
  recalc(false);
  S.health = clamp(S.health, 1, stats.maxHealth);
  sound.setMuted(!!S.muted);
  updateContinueButton();
  syncScreens();
  el.how.classList.add('hidden');
  el.end.classList.add('hidden');
  el.pause.classList.add('hidden');
  el.hud.classList.add('hidden');
  el.build.classList.add('hidden');
  requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && !paused && !gameOver && (S.screen === 'road' || S.screen === 'holdout')) {
    pauseGame();
  }
});
window.addEventListener('beforeunload', () => saveState());

boot();
