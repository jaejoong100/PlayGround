'use strict';
/* =========================================================================
   BONK BALL — game state, input, players
   ========================================================================= */

/* ------------------------------ player factory ------------------------------ */
function makePlayer(idx, charId) {
  const char = CHAR_BY_ID[charId] || CHARS[idx];
  const p = {
    idx, char, x: 0, y: 0, vx: 0, vy: 0, facing: idx === 0 ? 1 : -1,
    onGround: true, coyote: 0, jumpsLeft: 1, jumpBuffer: 0,
    hp: maxHpFor(), maxHp: maxHpFor(),
    charging: false, charge: 0, throwCd: 0, throwAnim: 0, catchAnim: 0, rageT: 0, shieldT: 0,
    invuln: 0, hitstun: 0, ko: false, koT: 0, koDir: 1,
    runPhase: rand(0, TAU), blink: 0, blinkTimer: rand(1.2, 3.4),
    ai: false, aiTimer: rand(0.5, 1.4), aiMove: 0, aiJumpCd: 0,
    aiStrafe: pick([-1, 0, 1]), aiStrafeTimer: rand(0.6, 1.5),
    aiHold: 0.5, aiCharge: 0, demo: false, demoT: rand(0, 10), demoThrow: rand(1.4, 3.2),
    chargeFx: 0, wasGround: true, needsMove: false, dropThrough: 0, platform: null,
  };
  return p;
}

function randomDuo() {
  const pool = [...new Set(profile.unlocked.filter(id => CHAR_BY_ID[id]))];
  if (pool.length < 2) pool.push(...CHARS.map(c => c.id).filter(id => !pool.includes(id)));
  const a = pick(pool);
  let b = pick(pool);
  let guard = 0;
  while (b === a && pool.length > 1 && guard++ < 30) b = pick(pool);
  return [a, b];
}

function setTitleChars(chars, rerender) {
  titleChars = chars || randomDuo();
  el.titleP1Name.textContent = CHAR_BY_ID[titleChars[0]].name;
  el.titleP2Name.textContent = CHAR_BY_ID[titleChars[1]].name;
  if (rerender) {
    renderPortrait(el.titleP1Canvas, titleChars[0], P1C);
    renderPortrait(el.titleP2Canvas, titleChars[1], P2C);
  }
  if (state === 'title' && players.length === 2) {
    players[0].char = CHAR_BY_ID[titleChars[0]];
    players[1].char = CHAR_BY_ID[titleChars[1]];
  }
}

function resetDemoStage() {
  players = [makePlayer(0, titleChars[0]), makePlayer(1, titleChars[1])];
  players.forEach((p, i) => {
    p.demo = true;
    p.ai = true;
    p.x = arena.left + (arena.right - arena.left) * (i === 0 ? 0.13 : 0.87);
    p.y = floorY;
    p.facing = i === 0 ? 1 : -1;
    p.maxHp = p.hp = maxHpFor();
  });
  generatePlatforms();
  balls = []; pickups = []; particles = []; floaters = [];
  roundMod = MODS[0];
}

/* ------------------------------ title / menu ------------------------------ */
function showTitle() {
  state = 'title';
  paused = false;
  modalOpen = false;
  match = null;
  endShown = false;
  roundWinner = null;
  timeScale = 1; timeScaleTarget = 1; slowmoT = 0;
  shake = 0; hitstop = 0;
  hideAllScreens();
  el.screenTitle.classList.remove('hidden');
  el.hud.classList.add('hidden');
  el.touch.classList.add('hidden');
  el.btnPauseTouch.classList.add('hidden');
  el.btnPauseTouch.classList.add('hidden');
  resetJoysticks();
  el.deskHints.classList.add('hidden');
  el.roundCard.classList.add('hidden');
  el.screenEnd.classList.add('hidden');
  el.screenPause.classList.add('hidden');
  el.announce.classList.remove('show');
  resetDemoStage();
  setTitleChars(titleChars, true);
}

function hideAllScreens() {
  [el.screenTitle, el.screenEnd, el.screenArcade, el.screenHow, el.screenPause].forEach(s => s && s.classList.add('hidden'));
  modalOpen = false;
}

/* ------------------------------ match flow ------------------------------ */
function newMatch(mode = '2p', chars = null) {
  ensureAudio();
  const duo = chars && chars.length === 2 ? chars : randomDuo();
  titleChars = duo;
  players = [makePlayer(0, duo[0]), makePlayer(1, duo[1])];
  players[1].ai = mode === 'bot';
  players.forEach(p => { p.demo = false; });

  match = {
    mode, scores: [0, 0], round: 1, winner: null,
    lastMod: null, hits: 0, catches: 0,
    chars: duo.slice(),
  };
  matchEarnings = { hits: 0, rounds: 0, victory: 0 };
  roundDamage = [0, 0];
  endShown = false;
  paused = false;
  state = 'countdown';
  timeScale = 1; timeScaleTarget = 1; slowmoT = 0;

  profile.stats.matches = (profile.stats.matches || 0) + 1;
  saveSoon();

  hideAllScreens();
  el.screenTitle.classList.add('hidden');
  el.hud.classList.remove('hidden');
  el.touch.classList.toggle('hidden', !isTouch);
  el.btnPauseTouch.classList.toggle('hidden', !isTouch);
  el.deskHints.classList.toggle('hidden', isTouch);
  el.screenEnd.classList.add('hidden');
  el.screenPause.classList.add('hidden');
  document.querySelector('.fighter-card.p2 .p-tag').textContent = mode === 'bot' ? 'CPU' : 'P2';
  updatePips();
  startRound();
}

function chooseMod() {
  if (match.round === 1 && Math.random() < 0.58) {
    match.lastMod = 'classic';
    return MODS[0];
  }
  const pool = MODS.filter(m => m.id !== match.lastMod);
  const m = pick(pool.length ? pool : MODS);
  match.lastMod = m.id;
  return m;
}

function resetPlayerForRound(p) {
  p.maxHp = maxHpFor();
  p.hp = p.maxHp;
  p.vx = 0; p.vy = 0;
  p.onGround = true; p.coyote = 0; p.jumpsLeft = 1; p.jumpBuffer = 0;
  p.charging = false; p.charge = 0; p.throwCd = 0; p.throwAnim = 0; p.catchAnim = 0; p.rageT = 0; p.shieldT = 0;
  p.invuln = 0; p.hitstun = 0; p.ko = false; p.koT = 0; p.koDir = 1;
  p.blink = 0; p.blinkTimer = rand(1.2, 3.4);
  p.aiTimer = rand(0.6, 1.6); p.aiMove = 0; p.aiJumpCd = 0;
  p.aiStrafe = pick([-1, 0, 1]); p.aiStrafeTimer = rand(0.6, 1.5);
  p.chargeFx = 0; p.needsMove = false; p.dropThrough = 0; p.platform = null;
  const bw = arena.right - arena.left;
  p.x = arena.left + bw * (p.idx === 0 ? 0.22 : 0.78);
  p.y = floorY;
  p.facing = p.idx === 0 ? 1 : -1;
}

function startRound() {
  state = 'countdown';
  paused = false;
  elsPause(false);
  roundMod = chooseMod();
  roundTime = 55;
  countdown = 3.0;
  countdownLabel = '3';
  roundDamage = [0, 0];
  roundWinner = null;
  balls = []; particles = []; floaters = []; pickups = [];
  stormTimer = 2.6; heartTimer = 2.25; chickenTimer = rand(5, 10); shieldTimer = rand(5, 10);
  shake = 0; hitstop = 0;
  timeScale = 1; timeScaleTarget = 1; slowmoT = 0;
  generatePlatforms();
  players.forEach(resetPlayerForRound);
  resetJoysticks();

  el.roundCard.classList.remove('hidden');
  el.rcRound.textContent = 'ROUND ' + match.round;
  el.rcVs.innerHTML = `${players[0].char.name} <span>VS</span> ${players[1].char.name}`;
  el.rcMod.textContent = roundMod.name;
  el.rcDesc.textContent = roundMod.desc;
  el.rcCount.textContent = '3';
  el.modBadge.textContent = roundMod.name;
  el.announce.classList.remove('show');
  el.screenEnd.classList.add('hidden');
  el.screenPause.classList.add('hidden');
  updateHud();
  updatePips();
  sfx.count();
}

function beginPlay() {
  state = 'play';
  roundTime = 55;
  el.roundCard.classList.add('hidden');
  showAnnounce('FIGHT!');
  sfx.fight();
  updateHud();
}

function finishRound(winner, reason) {
  if (state !== 'play') return;
  state = 'roundEnd';
  roundEndT = 2.45;
  roundWinner = winner;
  slowmoT = 0.8;
  timeScaleTarget = 0.34;
  hitstop = 0.07;
  players.forEach(p => { p.charging = false; p.charge = 0; });

  if (winner !== null) {
    match.scores[winner]++;
    profile.stats.rounds = (profile.stats.rounds || 0) + 1;
    awardMatchCoins('rounds', 20);
    updatePips();
    const wname = players[winner].char.name;
    if (reason === 'ko') showAnnounce('K.O.!', `${wname} TAKES ROUND ${match.round}`);
    else showAnnounce('TIME!', `${wname} WINS THE ROUND`);
    confettiBurst(players[winner].x, players[winner].y - 70 * S, 26);
  } else {
    showAnnounce('DRAW!', 'NOBODY SCORES. EMBARRASSING.');
  }
  updateHud();
  saveSoon();
}

function endMatch(winner) {
  if (state === 'matchEnd') return;
  state = 'matchEnd';
  match.winner = winner;
  endDelay = 1.15;
  endShown = false;
  timeScaleTarget = 0.55;
  slowmoT = 1.2;
  profile.stats.wins = (profile.stats.wins || 0) + 1;
  awardMatchCoins('victory', 50);
  confettiBurst(W / 2, arena.top + 60 * S, 70);
  sfx.win();
  el.touch.classList.add('hidden');
  el.btnPauseTouch.classList.add('hidden');
  el.deskHints.classList.add('hidden');
  saveProfile();
}

function showEndScreen() {
  if (endShown) return;
  endShown = true;
  const w = match.winner;
  const winner = players[w];
  const loser = players[1 - w];
  const color = P_COLORS[w];
  el.screenEnd.classList.remove('hidden');
  el.endWinner.textContent = match.mode === 'bot'
    ? (w === 0 ? 'YOU WIN!' : 'BOT WINS!')
    : `PLAYER ${w + 1} WINS!`;
  el.endWinner.style.color = color;
  el.endChar.textContent = winner.char.name;
  el.endScore.textContent = `${match.scores[w]} — ${match.scores[1 - w]}`;
  const quips = [
    'A hard-fought bonk-off.',
    'Somebody call the dodgeball police.',
    'That was legally a lot of bonking.',
    'The crowd goes absolutely bananas.',
    'Sportsmanship? Never heard of her.',
  ];
  el.endSub.textContent = match.mode === 'bot'
    ? (w === 0 ? `The bot has been bonked. ${pick(quips)}` : `Skill issue. ${pick(quips)}`)
    : quips[match.round % quips.length];
  renderPortrait(el.endPortrait, winner.char.id, color);

  const e = matchEarnings || { hits: 0, rounds: 0, victory: 0 };
  const total = e.hits + e.rounds + e.victory;
  el.earnings.innerHTML = [
    ['Bonks landed', e.hits],
    ['Round wins', e.rounds],
    ['Match bonus', e.victory],
  ].map(([label, val]) => `<div class="earn-row"><span>${label}</span><span>+${val}</span></div>`).join('') +
    `<div class="earn-row total"><span>TOTAL EARNED</span><span>+${total}</span></div>`;
  el.hud.classList.add('hidden');
}

function rematch() {
  ensureAudio();
  const mode = match ? match.mode : '2p';
  titleChars = randomDuo();
  newMatch(mode, titleChars);
}

function quitToMenu() {
  el.screenEnd.classList.add('hidden');
  titleChars = randomDuo();
  showTitle();
  setTitleChars(titleChars, true);
}

function pauseGame(force) {
  if (!['play', 'countdown'].includes(state)) return;
  const next = typeof force === 'boolean' ? force : !paused;
  if (next === paused) return;
  paused = next;
  elsPause(paused);
  if (paused) {
    players.forEach(p => { p.charging = false; p.charge = 0; });
    keys.clear();
    resetJoysticks();
    saveSoon();
  }
}
function elsPause(on) {
  if (!el.screenPause) return;
  el.screenPause.classList.toggle('hidden', !on);
  if (on) el.screenArcade.classList.add('hidden');
}

/* ------------------------------ HUD ------------------------------ */
function awardMatchCoins(category, amount) {
  if (!matchEarnings || !Object.hasOwn(matchEarnings, category) || amount <= 0) return;
  matchEarnings[category] += amount;
  saveProfile();
  refreshArcadeIfOpen();
}

function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function updateHud() {
  if (!match || players.length < 2) return;
  const [p1, p2] = players;
  el.p1Name.textContent = p1.char.name;
  el.p2Name.textContent = p2.char.name;
  const p1pct = clamp(p1.hp / p1.maxHp, 0, 1) * 100;
  const p2pct = clamp(p2.hp / p2.maxHp, 0, 1) * 100;
  el.p1Hp.style.width = p1pct + '%';
  el.p2Hp.style.width = p2pct + '%';
  el.p1Hp.classList.toggle('low', p1pct <= 30);
  el.p2Hp.classList.toggle('low', p2pct <= 30);
  el.p1HpNum.textContent = Math.max(0, Math.ceil(p1.hp));
  el.p2HpNum.textContent = Math.max(0, Math.ceil(p2.hp));
  el.roundTag.textContent = 'ROUND ' + match.round;
  el.timer.textContent = fmtTime(state === 'play' ? roundTime : 55);
  el.timer.classList.toggle('low', state === 'play' && roundTime <= 10);
  el.modBadge.textContent = roundMod.name;
}
function updatePips() {
  if (!match) return;
  [el.p1Pips, el.p2Pips].forEach((row, i) => {
    const score = match.scores[i];
    [...row.children].forEach((pip, j) => {
      pip.classList.toggle('on', j < score);
      pip.classList.toggle('matchpoint', score === 2 && match.scores[1 - i] < 3);
    });
  });
}
function showAnnounce(text, sub = '') {
  if (!text) { el.announce.classList.remove('show'); el.announce.innerHTML = ''; return; }
  el.announce.innerHTML = `${text}${sub ? `<span class="sub">${sub}</span>` : ''}`;
  el.announce.classList.remove('show');
  void el.announce.offsetWidth;
  el.announce.classList.add('show');
}

/* ------------------------------ input ------------------------------ */
const keys = new Set();
const touchAxes = [0, 0];          // analog joystick output, -1..1
const joysticks = [];
const pointerOwners = new Map();
const PLAYER_KEYS = [
  { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW'], throw: ['Space'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], throw: ['Enter', 'Numpad0'] },
];
function hasAny(code, list) { return list.includes(code); }
function playerForKey(code) {
  for (let i = 0; i < 2; i++) {
    const m = PLAYER_KEYS[i];
    if (hasAny(code, m.left) || hasAny(code, m.right) || hasAny(code, m.jump) || hasAny(code, m.throw)) return { i, action: hasAny(code, m.left) ? 'left' : hasAny(code, m.right) ? 'right' : hasAny(code, m.jump) ? 'jump' : 'throw' };
  }
  return null;
}
function isModalOpen() {
  return !el.screenArcade.classList.contains('hidden') || !el.screenHow.classList.contains('hidden');
}
function getInputDir(p) {
  if (p.ai) return p.aiMove;
  let dir = 0;
  if (p.idx === 0) {
    if (keys.has('KeyA')) dir--;
    if (keys.has('KeyD')) dir++;
  } else {
    if (keys.has('ArrowLeft')) dir--;
    if (keys.has('ArrowRight')) dir++;
  }
  const axis = touchAxes[p.idx];
  if (axis) dir += axis;
  return clamp(dir, -1, 1);
}
function doJump(p, strength = 1) {
  if (!p || p.ko) return;
  p.vy = -jumpSpeedFor() * strength;
  p.onGround = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  if (p.wasGround) { dust(p.x, p.y, 4); sfx.jump(); }
  else {
    dust(p.x, p.y - 15 * S, 4);
    burst(p.x, p.y - 20 * S, P_COLORS[p.idx], 6, 0.5, 'dot');
    sfx.jump();
  }
}
function queueJump(p) {
  if (!p || p.ko) return;
  if (state !== 'play' && state !== 'title') return;
  p.jumpBuffer = 0.13;
}
function requestThrow(p) {
  if (!p || p.ko) return;
  if (state !== 'play' && state !== 'title') return;
  beginThrow(p);
}
function releaseThrowInput(p) {
  if (!p) return;
  if (p.charging) releaseThrow(p);
}

function onKeyDown(e) {
  ensureAudio();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);

  if (isModalOpen()) {
    if (e.code === 'Escape') {
      if (!el.screenHow.classList.contains('hidden')) closeHow();
      else closeArcade();
    }
    return;
  }
  if (state === 'title') {
    if (e.code === 'Enter' || e.code === 'Space') { sfx.ui(); newMatch('2p', titleChars); }
    return;
  }
  if (state === 'matchEnd') {
    if (endShown && (e.code === 'Enter' || e.code === 'Space')) rematch();
    return;
  }
  if (e.code === 'Escape') {
    if (paused) pauseGame(false);
    else pauseGame(true);
    return;
  }
  if (e.code === 'KeyM') { setMuted(!profile.muted); return; }
  if (paused) return;

  const pk = playerForKey(e.code);
  if (!pk) return;
  const p = players[pk.i];
  if (!p) return;
  if (pk.action === 'jump') queueJump(p);
  else if (pk.action === 'throw' && state === 'play') requestThrow(p);
}

function onKeyUp(e) {
  keys.delete(e.code);
  const pk = playerForKey(e.code);
  if (!pk) return;
  const p = players[pk.i];
  if (!p) return;
  if (pk.action === 'throw') releaseThrowInput(p);
  if (pk.action === 'jump' && p.vy < -60 * S) p.vy *= 0.8;
}

function bindTouch() {
  document.querySelectorAll('.tbtn[data-act]').forEach(btn => {
    const pad = btn.closest('.pad');
    const pIdx = Number(pad.dataset.player);
    const act = btn.dataset.act;
    const down = e => {
      e.preventDefault();
      ensureAudio();
      if (state !== 'play' && state !== 'title') return;
      if (paused) return;
      btn.classList.add('pressed');
      pointerOwners.set(e.pointerId, { pIdx, act, btn });
      try { btn.setPointerCapture?.(e.pointerId); } catch {}
      const p = players[pIdx];
      if (!p) return;
      if (act === 'jump') queueJump(p);
      if (act === 'throw') {
        const moving = Math.abs(getInputDir(p)) > 0.15;
        requestThrow(p);
        if (!moving) setTimeout(() => releaseThrowInput(p), 90);
      }
    };
    const up = e => {
      const own = pointerOwners.get(e.pointerId);
      if (!own || own.pIdx !== pIdx) return;
      pointerOwners.delete(e.pointerId);
      btn.classList.remove('pressed');
      const p = players[pIdx];
      if (!p) return;
      if (act === 'throw') releaseThrowInput(p);
      if (act === 'jump' && p.vy < -60 * S) p.vy *= 0.8;
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });
}

/* ------------------------------ virtual joysticks ------------------------------ */
function bindJoysticks() {
  joysticks.length = 0;
  document.querySelectorAll('#touch .joystick').forEach(joyEl => {
    const pad = joyEl.closest('.pad');
    const pIdx = Number(pad.dataset.player);
    const base = joyEl.querySelector('.stick-base');
    const knob = joyEl.querySelector('.stick-knob');
    const j = { el: joyEl, knob, pIdx, pointerId: null, max: 1, jumpLatch: false };
    joysticks.push(j);

    const centerOf = () => {
      const r = base.getBoundingClientRect();
      j.max = Math.max(1, r.width * 0.3);
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const setAxis = (dx, dy) => {
      const raw = Math.hypot(dx, dy);
      const scale = raw > j.max ? j.max / raw : 1;
      const kx = dx * scale, ky = dy * scale;
      knob.style.transform = `translate(-50%, -50%) translate(${kx}px, ${ky}px)`;
      const x = clamp(kx / j.max, -1, 1);
      const dead = 0.16;
      touchAxes[pIdx] = Math.sign(x) * clamp((Math.abs(x) - dead) / (1 - dead), 0, 1);
      // drop through platforms on downward flick
      if (ky > j.max * 0.5) {
        const pp = players[pIdx];
        if (pp) {
          pp.dropThrough = 0.25;
          if (pp.onGround && pp.y < floorY - 1) { pp.vy = 120 * S; pp.onGround = false; }
        }
      }
      // jump on upward flick
      if (ky < -j.max * 0.5 && !j.jumpLatch) {
        j.jumpLatch = true;
        const p = players[pIdx];
        if (p) queueJump(p);
      }
      if (ky > -j.max * 0.25) j.jumpLatch = false;
    };
    const release = e => {
      if (j.pointerId === null) return;
      if (e && e.pointerId !== undefined && e.pointerId !== j.pointerId) return;
      const p = players[pIdx];
      if (p && p.charging) {
        releaseThrow(p);
        p.needsMove = true;
      }
      j.pointerId = null;
      j.jumpLatch = false;
      touchAxes[pIdx] = 0;
      joyEl.classList.remove('active');
      knob.style.transform = 'translate(-50%, -50%)';
    };
    const canUse = () => (state === 'play' || state === 'title') && !paused;

    joyEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      ensureAudio();
      if (!canUse() || j.pointerId !== null) return;
      j.pointerId = e.pointerId;
      joyEl.classList.add('active');
      try { joyEl.setPointerCapture(e.pointerId); } catch {}
      const c = centerOf();
      setAxis(e.clientX - c.x, e.clientY - c.y);
    });
    joyEl.addEventListener('pointermove', e => {
      if (j.pointerId !== e.pointerId) return;
      e.preventDefault();
      const c = centerOf();
      setAxis(e.clientX - c.x, e.clientY - c.y);
    });
    joyEl.addEventListener('pointerup', release);
    joyEl.addEventListener('pointercancel', release);
    joyEl.addEventListener('lostpointercapture', release);
    joyEl.addEventListener('contextmenu', e => e.preventDefault());
  });
}

  // Global multi-touch routing keeps both joysticks responsive even if
  // pointer capture is lost or a finger drifts outside its pad.
  if (!window.__bonkJoyBound) {
    window.__bonkJoyBound = true;
    window.addEventListener('pointermove', e => {
      const j = joysticks.find(x => x.pointerId === e.pointerId);
      if (!j) return;
      e.preventDefault();
      const c = j.centerOf();
      j.setAxis(e.clientX - c.x, e.clientY - c.y);
    }, { passive: false });
    const end = e => {
      const j = joysticks.find(x => x.pointerId === e.pointerId);
      if (!j) return;
      j.releaseFn(e);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('lostpointercapture', end);
  }

function resetJoysticks() {
  touchAxes[0] = 0;
  touchAxes[1] = 0;
  for (const j of joysticks) {
    j.pointerId = null;
    j.jumpLatch = false;
    j.knob.style.transform = 'translate(-50%, -50%)';
  }
  pointerOwners.clear();
  document.querySelectorAll('.tbtn.pressed').forEach(b => b.classList.remove('pressed'));
}

/* ------------------------------ player update ------------------------------ */
function updatePlayer(p, dt) {
  if (!p) return;
  // timers
  p.throwCd = Math.max(0, p.throwCd - dt);
  p.throwAnim = Math.max(0, p.throwAnim - dt);
  p.rageT = Math.max(0, (p.rageT || 0) - dt);
  p.shieldT = Math.max(0, (p.shieldT || 0) - dt);
  p.catchAnim = Math.max(0, p.catchAnim - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.hitstun = Math.max(0, p.hitstun - dt);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
  p.dropThrough = Math.max(0, (p.dropThrough || 0) - dt);
  p.blinkTimer -= dt;
  if (p.blinkTimer <= 0) { p.blink = 0.11; p.blinkTimer = rand(2.2, 4.8); }
  p.blink = Math.max(0, p.blink - dt);
  if (p.ko) {
    p.koT += dt;
    p.vy += gravityFor() * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.2, dt);
    if (p.y > floorY) { p.y = floorY; p.vy = 0; p.vx *= 0.7; }
    p.x = clamp(p.x, arena.left + 22 * S, arena.right - 22 * S);
    p.onGround = p.y >= floorY - 0.5;
    return;
  }

  if (p.ai && (state === 'play' || state === 'title')) updateAI(p, dt);

  const canControl = state === 'play' && !paused;
  let dir = canControl ? getInputDir(p) : 0;
  if (p.hitstun > 0) dir = 0;

  // drop through platforms on down input
  if (state === 'play' && canControl && !p.ai) {
    const downHeld = (p.idx === 0 && keys.has('KeyS')) || (p.idx === 1 && keys.has('ArrowDown'));
    if (downHeld) {
      p.dropThrough = 0.2;
      if (p.onGround && p.y < floorY - 1) { p.vy = 120 * S; p.onGround = false; }
    }
  }

  // auto-charge / auto-fire for human players
  if (state === 'play' && canControl && !p.ai && !p.ko && p.hitstun <= 0) {
    const moving = Math.abs(dir) > 0.15;
    if (moving) {
      if (p.needsMove) p.needsMove = false;
      if (!p.charging && p.throwCd <= 0 && !p.needsMove) beginThrow(p);
    }
  }

  // jump buffering
  if (p.jumpBuffer > 0 && canControl) {
    if (p.onGround || p.coyote > 0) { p.wasGround = true; doJump(p, 1); p.jumpsLeft = 1; }
    else if (p.jumpsLeft > 0) { p.jumpsLeft--; p.wasGround = false; doJump(p, 0.88); }
  }

  const maxSp = runSpeedFor() * (p.charging ? 0.58 : 1) * (p.hitstun > 0 ? 0.5 : 1);
  if (dir !== 0) {
    p.facing = Math.sign(dir) || p.facing;
    p.vx += dir * 5800 * S * dt;
    p.vx = clamp(p.vx, -maxSp, maxSp);
  } else {
    p.vx *= Math.pow(0.0009, dt);
    if (Math.abs(p.vx) < 4 * S) p.vx = 0;
  }

  if (p.charging && canControl) {
    p.charge = Math.min(1, p.charge + dt / 1.24);
    p.chargeFx = (p.chargeFx || 0) - dt;
    if (p.chargeFx <= 0) {
      p.chargeFx = 0.07;
      const h = handPoint(p);
      addParticle({
        x: h.x + rand(-14, 14) * S, y: h.y + rand(-14, 14) * S,
        vx: rand(-30, 30) * S, vy: rand(-70, -10) * S,
        life: rand(0.2, 0.45), size: rand(2, 4.5) * S,
        color: P_COLORS[p.idx], kind: 'dot', grav: -60 * S, drag: 0.92,
      });
    }
  } else {
    p.charge = 0;
  }

  // physics
  p.wasGround = p.onGround;
  const prevY = p.y;
  p.vy += gravityFor() * dt;
  p.vy = Math.min(p.vy, 1900 * S);
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = clamp(p.x, arena.left + 18 * S, arena.right - 18 * S);

  p.onGround = false;
  p.platform = null;
  if (p.vy >= 0 && (p.dropThrough || 0) <= 0) {
    for (const pl of platforms) {
      if (prevY <= pl.y + 2 && p.y >= pl.y && p.y <= pl.y + pl.h + 30 * S &&
          p.x + 14 * S > pl.x + 3 && p.x - 14 * S < pl.x + pl.w - 3) {
        p.y = pl.y;
        p.vy = 0;
        p.onGround = true;
        p.jumpsLeft = 1;
        p.platform = pl;
        break;
      }
    }
  }
  if (p.y >= floorY) {
    p.y = floorY;
    p.vy = 0;
    p.onGround = true;
    p.jumpsLeft = 1;
    p.platform = null;
  }
  if (p.onGround) p.coyote = 0.1;
  else p.coyote = Math.max(0, p.coyote - dt);

  // carry on moving platforms
  if (p.onGround && p.platform) {
    p.x += (p.platform.vx || 0) * dt;
    p.x = clamp(p.x, arena.left + 18 * S, arena.right - 18 * S);
  }

  if (p.onGround && !p.wasGround && p.vy === 0) {
    dust(p.x, p.y, 5);
    if (Math.abs(p.vx) > 40 * S || state === 'play') sfx.land();
  }

  p.runPhase += Math.abs(p.vx) * dt * 0.033;
}

function updateAI(p, dt) {
  const opp = getOpponent(p);
  if (!opp) return;
  p.aiTimer -= dt;
  p.aiStrafeTimer -= dt;
  p.aiJumpCd -= dt;

  if (state === 'title') {
    p.demoT += dt;
    p.demoThrow -= dt;
    const home = arena.left + (arena.right - arena.left) * (p.idx === 0 ? 0.13 : 0.87);
    const tx = home + Math.sin(p.demoT * 0.55 + p.idx * 2.1) * 70 * S;
    p.aiMove = clamp((tx - p.x) / (70 * S), -1, 1);
    if (p.charging) {
      p.aiCharge += dt;
      if (p.aiCharge > p.aiHold) releaseThrow(p);
    } else if (p.demoThrow <= 0 && p.throwCd <= 0 && balls.length < 3) {
      beginThrow(p);
      p.aiHold = rand(0.35, 0.85);
      p.aiCharge = 0;
      p.demoThrow = rand(2.4, 4.4);
    }
    if (p.onGround && Math.random() < dt * 0.18) p.jumpBuffer = 0.1;
    return;
  }

  if (p.aiStrafeTimer <= 0) {
    p.aiStrafe = pick([-1, 0, 1]);
    p.aiStrafeTimer = rand(0.7, 1.7);
  }
  const dx = opp.x - p.x;
  const adx = Math.abs(dx);
  let move = 0;
  if (adx > 460 * S) move = Math.sign(dx);
  else if (adx < 200 * S) move = -Math.sign(dx);
  else move = p.aiStrafe * 0.65;
  if (p.x < arena.left + 70 * S) move = 1;
  if (p.x > arena.right - 70 * S) move = -1;
  p.aiMove = clamp(move, -1, 1);

  const threat = balls.find(b => !b.dead && b.owner !== p.idx &&
    dist(b.x, b.y, p.x, p.y - 42 * S) < 235 * S &&
    (b.vx * (p.x - b.x) + b.vy * (p.y - 42 * S - b.y)) > 0);
  if (threat && p.onGround && p.aiJumpCd <= 0) {
    p.jumpBuffer = 0.12;
    p.aiJumpCd = rand(0.9, 1.8);
  } else if (p.onGround && p.aiJumpCd <= 0 && adx < 430 * S && Math.random() < dt * 0.35) {
    p.jumpBuffer = 0.1;
    p.aiJumpCd = rand(1.3, 2.6);
  }

  if (p.charging) {
    p.aiCharge += dt;
    if (p.aiCharge >= p.aiHold || p.charge >= 1) releaseThrow(p);
  } else if (p.throwCd <= 0 && p.aiTimer <= 0) {
    const catchable = nearbyCatchable(p);
    if (catchable && Math.random() < 0.68) {
      doCatch(p, catchable);
      p.aiTimer = rand(0.7, 1.5);
    } else {
      beginThrow(p);
      p.aiHold = rand(0.28, 0.95);
      p.aiCharge = 0;
      p.aiTimer = rand(0.55, 1.35);
    }
  }
}

/* ------------------------------ main update ------------------------------ */
function update(dtRaw) {
  if (paused) return;
  gameT += dtRaw;
  timeScale = lerp(timeScale, timeScaleTarget, Math.min(1, dtRaw * 8));
  if (slowmoT > 0) {
    slowmoT -= dtRaw;
    if (slowmoT <= 0) timeScaleTarget = 1;
  }
  if (hitstop > 0) hitstop -= dtRaw;
  const sdt = hitstop > 0 ? 0 : dtRaw * timeScale;

  shake = Math.max(0, shake - dtRaw * 46);
  const sh = shake;
  shakeX = sh > 0.1 ? rand(-sh, sh) : 0;
  shakeY = sh > 0.1 ? rand(-sh, sh) : 0;

  // moving platforms
  for (const pl of platforms) {
    if (!pl.vx) pl.vx = (Math.random() < 0.5 ? -1 : 1) * 60 * S;
    pl.x += pl.vx * (hitstop > 0 ? 0 : dtRaw * timeScale);
    if (pl.x < arena.left) { pl.x = arena.left; pl.vx = Math.abs(pl.vx); }
    if (pl.x + pl.w > arena.right) { pl.x = arena.right - pl.w; pl.vx = -Math.abs(pl.vx); }
  }

  if (state === 'title') {
    for (const p of players) updatePlayer(p, sdt);
    updateBalls(sdt);
    updateParticles(sdt);
    updateFloaters(sdt);
    return;
  }
  if (!match) return;

  if (state === 'countdown') {
    countdown -= dtRaw;
    const n = Math.max(1, Math.ceil(countdown));
    if (String(n) !== countdownLabel && countdown > 0) {
      countdownLabel = String(n);
      el.rcCount.textContent = countdownLabel;
      el.rcCount.style.animation = 'none';
      void el.rcCount.offsetWidth;
      el.rcCount.style.animation = '';
      sfx.count();
    }
    for (const p of players) updatePlayer(p, sdt);
    updateParticles(sdt);
    updateFloaters(sdt);
    if (countdown <= 0) beginPlay();
    updateHud();
    return;
  }

  if (state === 'play') {
    roundTime -= sdt;
    if (roundTime <= 0) {
      roundTime = 0;
      const [a, b] = players;
      const winner = a.hp > b.hp ? 0 : b.hp > a.hp ? 1 : null;
      finishRound(winner, 'time');
    }

    if (roundMod.storm) {
      stormTimer -= sdt;
      if (stormTimer <= 0) { stormTimer = rand(3.2, 5); spawnStormBall(); }
    }
    heartTimer -= sdt;
    if (heartTimer <= 0) {
      heartTimer = rand(2.5, 4);
      const hearts = pickups.filter(p => p.type === 'heart').length;
      if (players.some(p => p.hp < p.maxHp * 0.7) && hearts < 1) spawnPickup('heart');
    }
    chickenTimer -= sdt;
    if (chickenTimer <= 0) {
      chickenTimer = rand(5, 10);
      const chickens = pickups.filter(p => p.type === 'chicken').length;
      if (chickens < 1) spawnPickup('chicken');
    }
    shieldTimer -= sdt;
    if (shieldTimer <= 0) {
      shieldTimer = rand(5, 10);
      const shields = pickups.filter(p => p.type === 'shield').length;
      if (shields < 1) spawnPickup('shield');
    }
  }

  for (const p of players) updatePlayer(p, sdt);
  updateBalls(sdt);
  updatePickups(sdt);
  updateParticles(sdt);
  updateFloaters(sdt);

  if (state === 'roundEnd') {
    roundEndT -= dtRaw;
    if (roundEndT <= 0) {
      if (match.scores[0] >= 3 || match.scores[1] >= 3) {
        endMatch(match.scores[0] >= 3 ? 0 : 1);
      } else {
        match.round++;
        startRound();
      }
    }
  }

  if (state === 'matchEnd') {
    endDelay -= dtRaw;
    if (endDelay <= 0 && !endShown) showEndScreen();
  }

  updateHud();
}

/* ------------------------------ init input listeners ------------------------------ */
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', () => {
  keys.clear();
  resetJoysticks();
  players.forEach(p => { if (p && !p.ai) { p.charging = false; p.charge = 0; } });
  if (state === 'play' && !paused) pauseGame(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'play' && !paused) pauseGame(true);
});
window.addEventListener('pointerdown', () => ensureAudio(), { passive: true });
