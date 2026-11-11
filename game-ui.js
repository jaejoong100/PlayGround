'use strict';
/* =========================================================================
   BONK BALL — arcade UI, shop, achievements, boot
   ========================================================================= */

const ICONS = {
  shoe: `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M4 20c0-2 1-3 3-3h6l5-5 4 3c3 2 6 3 6 7v3H4z" fill="#fff4d8" stroke="#241335" stroke-width="2.4" stroke-linejoin="round"/><path d="M4 25h26M9 18v-3M14 16v-3" fill="none" stroke="#241335" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  spring: `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M10 28h12M16 28V24M11 24h10l-9-4 10-4-10-4 10-4-8-3" fill="none" stroke="#241335" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  fist: `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M9 13c0-2 1-4 4-4h10c4 0 6 3 6 7v4c0 4-3 7-7 7h-8c-3 0-5-2-5-5z" fill="#fff4d8" stroke="#241335" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 15H5c-1 0-2 1-2 2v2c0 1 1 2 2 2h4M15 9v9M20 9v9" fill="none" stroke="#241335" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  heart: `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M16 27C8 21 4 17 4 12a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 5-4 9-12 15z" fill="#fff4d8" stroke="#241335" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 12c0-2 2-3 4-2" fill="none" stroke="#ff5d5d" stroke-width="2.2" stroke-linecap="round"/></svg>`,
};

let currentArcadeTab = 'brawlers';
let toastCount = 0;
let howFromPause = false;

/* ------------------------------ toasts ------------------------------ */
function toast(title, name, icon, amount, negative) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-info">
      <div class="toast-title">${title}</div>
      <div class="toast-name">${name}</div>
    </div>
    <div class="toast-gold"${negative ? ' style="color:#d83b4a"' : ''}>${negative ? '−' : '+'}${amount}</div>`;
  el.toasts.appendChild(t);
  toastCount++;
  while (el.toasts.children.length > 2) el.toasts.firstElementChild.remove();
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => { t.remove(); toastCount = Math.max(0, toastCount - 1); }, 320);
  }, 3800);
}
function toastAchievement(a) {
  toast('ACHIEVEMENT UNLOCKED', a.name, a.icon, a.reward, false);
}

/* ------------------------------ arcade ------------------------------ */
function openArcade(tab) {
  ensureAudio();
  if (tab) currentArcadeTab = tab;
  if (currentArcadeTab === 'upgrades') currentArcadeTab = 'brawlers';
  el.screenHow.classList.add('hidden');
  el.screenArcade.classList.remove('hidden');
  modalOpen = true;
  renderArcade();
  updateGoldUI();
  sfx.ui();
}
function closeArcade() {
  if (el.screenArcade.classList.contains('hidden')) return;
  el.screenArcade.classList.add('hidden');
  modalOpen = isModalOpen();
  sfx.ui();
}
function refreshArcadeIfOpen() {
  if (!el.screenArcade.classList.contains('hidden')) renderArcade();
}
function switchArcadeTab(tab) {
  currentArcadeTab = tab;
  renderArcade();
  sfx.ui();
}
function renderArcade() {
  if (!el.arcadeBody) return;
  el.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === currentArcadeTab));
  const sub = {
    upgrades: 'Upgrades apply to BOTH brawlers — fair’s fair.',
    brawlers: 'Unlock the weirdos. Collect the whole fridge.',
    trophies: `${profile.ach.length}/${ACHIEVEMENTS.length} trophies unlocked.`,
  };
  el.arcadeSub.textContent = sub[currentArcadeTab] || '';
  updateGoldUI();

  if (currentArcadeTab === 'brawlers') {
    el.arcadeBody.innerHTML = `<div class="char-grid">${CHARS.map(c => {
      const owned = profile.unlocked.includes(c.id);
      const afford = profile.gold >= c.cost;
      return `<div class="char-card ${owned ? '' : 'locked'}">
        <canvas width="96" height="96" data-char="${c.id}"></canvas>
        <div class="cc-name">${c.name}</div>
        <div class="cc-tag">${c.tag}</div>
        <div class="cc-status ${owned ? 'ready' : ''}">${owned ? 'READY TO RUMBLE' : 'LOCKED'}</div>
        ${owned ? '' : `<button class="buy-btn" data-char-buy="${c.id}" ${afford ? '' : 'disabled'}>UNLOCK<span class="cost">${c.cost} COINS</span></button>`}
      </div>`;
    }).join('')}</div>`;
    // paint portraits
    el.arcadeBody.querySelectorAll('canvas[data-char]').forEach(c => renderPortrait(c, c.dataset.char, '#ffd23f'));
  } else {
    el.arcadeBody.innerHTML = `<div class="trophy-grid">${ACHIEVEMENTS.map(a => {
      const got = profile.ach.includes(a.id);
      return `<div class="trophy-card ${got ? 'got' : ''}">
        <div class="tr-icon">${got ? a.icon : '🔒'}</div>
        <div class="tr-info">
          <div class="tr-name">${a.name}</div>
          <div class="tr-desc">${a.desc}</div>
        </div>
        <div class="tr-reward">${got ? 'GOT IT' : '+' + a.reward}</div>
      </div>`;
    }).join('')}</div>`;
  }
}

function buyUpgrade(id) {
  const u = UPGRADES[id];
  if (!u) return;
  const lvl = upgradeBonus(id);
  if (lvl >= u.max) return;
  const cost = u.costs[lvl];
  if (profile.gold < cost) { sfx.ui(); return; }
  profile.gold -= cost;
  profile.upgrades[id] = lvl + 1;
  sfx.buy();
  toast('UPGRADE GET', `${u.name} · LV ${lvl + 1}`, '🛠️', cost, true);
  unlock('shopper');
  if (lvl + 1 >= u.max) unlock('maxed');
  saveProfile();
  updateGoldUI();
  renderArcade();
}

function unlockCharacter(id) {
  const c = CHAR_BY_ID[id];
  if (!c || profile.unlocked.includes(id)) return;
  if (profile.gold < c.cost) { sfx.ui(); return; }
  profile.gold -= c.cost;
  profile.unlocked.push(id);
  sfx.buy();
  toast('NEW BRAWLER', c.name, '🎉', c.cost, true);
  saveProfile();
  updateGoldUI();
  renderArcade();
}

/* ------------------------------ how to play ------------------------------ */
function openHow() {
  ensureAudio();
  howFromPause = paused && !el.screenPause.classList.contains('hidden');
  el.screenPause.classList.add('hidden');
  el.screenHow.classList.remove('hidden');
  el.screenArcade.classList.add('hidden');
  modalOpen = true;
  sfx.ui();
}
function closeHow() {
  el.screenHow.classList.add('hidden');
  if (howFromPause && paused) el.screenPause.classList.remove('hidden');
  howFromPause = false;
  modalOpen = isModalOpen();
  sfx.ui();
}

/* ------------------------------ title ------------------------------ */
function rerollTitle() {
  ensureAudio();
  titleChars = randomDuo();
  setTitleChars(titleChars, true);
  balls = [];
  floaters = [];
  if (players.length === 2) {
    for (const p of players) { p.charging = false; p.charge = 0; }
  }
  sfx.ui();
  burst(W / 2, arena.top + 80 * S, '#ffd23f', 12, 0.8, 'star');
}

function syncOverlayClass() {
  const open = [el.screenEnd, el.screenArcade, el.screenHow, el.screenPause]
    .some(s => s && !s.classList.contains('hidden'));
  document.body.classList.toggle('overlay-open', open);
}

function bindUI() {
  el.btnPlay.addEventListener('click', () => { ensureAudio(); sfx.ui(); newMatch('2p', titleChars); });
  el.btnSolo.addEventListener('click', () => { ensureAudio(); sfx.ui(); newMatch('bot', titleChars); });
  el.btnReroll.addEventListener('click', rerollTitle);
  el.btnArcade.addEventListener('click', () => openArcade('upgrades'));
  el.btnHow.addEventListener('click', () => openHow());
  el.btnArcadeClose.addEventListener('click', closeArcade);
  el.btnHowClose.addEventListener('click', closeHow);
  el.tabs.forEach(t => t.addEventListener('click', () => switchArcadeTab(t.dataset.tab)));
  el.arcadeBody.addEventListener('click', e => {
    const up = e.target.closest('[data-buy]');
    if (up) { buyUpgrade(up.dataset.buy); return; }
    const ch = e.target.closest('[data-char-buy]');
    if (ch) unlockCharacter(ch.dataset.charBuy);
  });

  el.btnMute.addEventListener('click', () => { setMuted(!profile.muted); if (!profile.muted) sfx.ui(); });
  el.btnPauseTouch.addEventListener('click', () => pauseGame(true));
  el.btnResume.addEventListener('click', () => pauseGame(false));
  el.btnRestart.addEventListener('click', () => {
    if (!match) return;
    const ids = [players[0].char.id, players[1].char.id];
    const mode = match.mode;
    paused = false; elsPause(false); sfx.ui();
    newMatch(mode, ids);
  });
  el.btnPauseHow.addEventListener('click', () => openHow());
  el.btnPauseMenu.addEventListener('click', () => {
    paused = false; elsPause(false); sfx.ui(); quitToMenu();
  });
  el.btnRematch.addEventListener('click', () => { sfx.ui(); rematch(); });
  el.btnEndArcade.addEventListener('click', () => openArcade('upgrades'));
  el.btnEndMenu.addEventListener('click', () => { sfx.ui(); quitToMenu(); });

  // click outside of panels to close overlays (desktop nicety)
  [el.screenArcade, el.screenHow].forEach(screen => {
    screen.addEventListener('pointerdown', e => {
      if (e.target === screen) {
        if (screen === el.screenArcade) closeArcade();
        else closeHow();
      }
    });
  });
}

/* ------------------------------ render loop ------------------------------ */
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#1a0c2e';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawScene(gameT);
  ctx.restore();
}

function frame(now) {
  const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
  lastFrame = now;
  update(dt);
  if (paused) { shakeX = 0; shakeY = 0; }
  render();
  requestAnimationFrame(frame);
}

/* ------------------------------ boot ------------------------------ */
function boot() {
  computeLayout();
  titleChars = randomDuo();
  showTitle();
  setMuted(profile.muted, true);
  bindTouch();
  bindJoysticks();
  bindUI();
  [el.screenEnd, el.screenArcade, el.screenHow, el.screenPause].forEach(s => {
    if (s) new MutationObserver(syncOverlayClass).observe(s, { attributes: true, attributeFilter: ['class'] });
  });
  syncOverlayClass();
  lastFrame = performance.now();
  requestAnimationFrame(frame);

  document.fonts?.ready.then(() => {
    if (state === 'title') {
      renderPortrait(el.titleP1Canvas, titleChars[0], P1C);
      renderPortrait(el.titleP2Canvas, titleChars[1], P2C);
    }
    if (endShown && match) {
      renderPortrait(el.endPortrait, players[match.winner].char.id, P_COLORS[match.winner]);
    }
  });

  window.addEventListener('resize', () => {
    computeLayout();
    if (state === 'title') {
      resetDemoStage();
    } else if (match && state !== 'matchEnd') {
      generatePlatforms();
      players.forEach(p => {
        p.y = Math.min(p.y, floorY);
        p.x = clamp(p.x, arena.left + 30 * S, arena.right - 30 * S);
      });
    }
    render();
  });
}

/* ------------------------------ debug helpers (handy for humans too) ------------------------------ */
window.__bonk = {
  version: '1.0',
  state: () => state,
  info: () => ({
    state, paused, round: match?.round, scores: match?.scores, mod: roundMod.id,
    players: players.map(p => ({ name: p.char.name, x: Math.round(p.x), y: Math.round(p.y), hp: Math.round(p.hp), charging: p.charging })),
    balls: balls.length, particles: particles.length, gold: profile.gold,
    ballList: balls.filter(b => !b.dead).map(b => ({ x: Math.round(b.x), y: Math.round(b.y), owner: b.owner, age: +b.age.toFixed(2) })),
    platforms: platforms.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w) })),
  }),
  start: (mode = '2p') => { titleChars = randomDuo(); newMatch(mode, titleChars); },
  startWith: (mode, chars) => newMatch(mode, chars),
  play: () => {
    if (state === 'countdown') {
      countdown = 0;
      el.roundCard.classList.add('hidden');
      beginPlay();
    }
  },
  skipRound: () => { if (state === 'play') finishRound(0, 'ko'); },
  knock: i => { if (players[i]) knockout(players[i]); },
  hurt: (i, amount) => { if (players[i]) hitPlayer(players[i], amount || 30, players[i].facing, { owner: 1 - i, bounces: 0 }); },
  toss: (i, charge = 0.6) => { if (players[i]) { players[i].throwCd = 0; spawnBall(players[i], charge, {}); players[i].throwAnim = 0.3; } },
  gold: n => { profile.gold = Math.max(0, n); saveProfile(); updateGoldUI(); },
  addGold: n => awardGold(n),
  unlock: id => unlock(id),
  profile: () => profile,
  arcade: tab => openArcade(tab || 'upgrades'),
  menu: () => quitToMenu(),
  rematch: () => rematch(),
  setPositions: (x1, x2) => {
    if (players[0]) players[0].x = x1;
    if (players[1]) players[1].x = x2;
  },
  teleport: (i, x, y) => {
    const p = players[i];
    if (!p) return;
    p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.onGround = false;
  },
  roundMod: m => {
    const mod = MODS.find(x => x.id === m);
    if (mod) { roundMod = mod; el.modBadge.textContent = mod.name; }
  },
};

boot();
