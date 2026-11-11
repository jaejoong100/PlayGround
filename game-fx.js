'use strict';
/* =========================================================================
   BONK BALL — throwing, dodgeballs, bonks, loot, effects
   ========================================================================= */

/* ------------------------------ throwing ------------------------------ */
function nearbyCatchable(p) {
  if (!p || p.ko) return null;
  const cx = p.x, cy = p.y - 40 * S;
  let best = null, bd = 1e9;
  for (const b of balls) {
    if (b.dead || b.owner === p.idx || b.age < 0.05) continue;
    const d = dist(b.x, b.y, cx, cy);
    if (d < 70 * S && d < bd) { bd = d; best = b; }
  }
  return best;
}

function beginThrow(p) {
  if (!p || p.ko || paused) return;
  if (state !== 'play' && state !== 'title') return;
  if (p.throwCd > 0 || p.charging || p.hitstun > 0) return;
  const b = nearbyCatchable(p);
  if (b) { doCatch(p, b); return; }
  p.charging = true;
  p.charge = 0;
  p.chargeFx = 0;
  p.throwAnim = 0;
  blip(180, 0.05, 'triangle', 0.06, 80);
}

function releaseThrow(p) {
  if (!p || !p.charging) return;
  const charge = Math.max(0.12, p.charge);
  p.charging = false;
  p.charge = 0;
  if (state !== 'play' && state !== 'title') return;
  spawnBall(p, charge, {});
  p.throwCd = 0.29;
  p.throwAnim = 0.3;
}

function spawnBall(p, charge, opts = {}) {
  const plan = throwPlan(p, charge);
  const weapon = weaponOf(p.char.id);
  const pow = 1 + 0.08 * upgradeBonus('power');
  const dmg = Math.round((12 + 20 * charge) * pow * (roundMod.damage || 1) * weapon.damage * (opts.catchBonus ? 1.2 : 1));
  const r = (12 + 9 * charge) * S * (roundMod.ballSize || 1) * weapon.size;
  const b = {
    x: plan.hand.x, y: plan.hand.y,
    vx: plan.vx * weapon.speed, vy: plan.vy * weapon.speed,
    r, owner: p.idx, charge,
    damage: dmg,
    bounces: 0,
    bouncesLeft: roundMod.bounce ?? 2,
    rest: roundMod.rest ?? 0.78,
    rot: rand(0, TAU), spin: rand(-weapon.spin, weapon.spin),
    age: 0, dead: false, caught: !!opts.catchBonus,
    weapon: p.char.id, wcolor: weapon.color, wshape: weapon.shape,
    knock: weapon.knock || 1,
  };
  balls.push(b);

  // muzzle fx
  const col = P_COLORS[p.idx];
  for (let i = 0; i < 6; i++) {
    addParticle({
      x: plan.hand.x, y: plan.hand.y,
      vx: plan.vx * rand(0.04, 0.16) + rand(-60, 60) * S,
      vy: plan.vy * rand(0.04, 0.16) + rand(-70, 70) * S,
      life: rand(0.12, 0.32), size: rand(2, 5) * S,
      color: i % 2 ? CREAM : col, kind: 'spark', grav: 120 * S, drag: 0.9,
    });
  }
  burst(plan.hand.x, plan.hand.y, col, 4, 0.5, 'dot');
  sfx.throwBall(charge);
  shakeIt(2 + charge * 5);
  const opp = getOpponent(p);
  if (opp) p.vx -= Math.sign(opp.x - p.x) * 45 * S * charge;
}

function doCatch(p, b) {
  if (!b || b.dead) return false;
  b.dead = true;
  const col = P_COLORS[p.idx];
  p.catchAnim = 0.38;
  p.invuln = Math.max(p.invuln, 0.34);
  p.throwAnim = 0.34;
  p.throwCd = 0.32;
  burst(b.x, b.y, col, 12, 1.1, 'star');
  addParticle({ x: b.x, y: b.y, life: 0.34, size: 15 * S, color: col, kind: 'ring', grav: 0 });
  addParticle({ x: b.x, y: b.y, life: 0.28, size: 9 * S, color: CREAM, kind: 'ring', grav: 0 });
  addFloater('CATCH!', p.x, p.y - 108 * S, col, 26, rand(-0.1, 0.1));
  shakeIt(7);
  sfx.catchBall();
  profile.stats.catches = (profile.stats.catches || 0) + 1;
  if (match) match.catches++;
  unlock('catcher');
  spawnBall(p, Math.min(1, (b.charge || 0.2) + 0.45), { catchBonus: true });
  return true;
}

/* ------------------------------ dodgeballs ------------------------------ */
function collideBallRect(b, pl) {
  const nx = clamp(b.x, pl.x, pl.x + pl.w);
  const ny = clamp(b.y, pl.y, pl.y + pl.h);
  const dx = b.x - nx, dy = b.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 > b.r * b.r) return false;
  let nX, nY;
  const d = Math.sqrt(d2);
  if (d < 0.001) {
    const l = b.x - pl.x, r = pl.x + pl.w - b.x, t = b.y - pl.y, bo = pl.y + pl.h - b.y;
    const m = Math.min(l, r, t, bo);
    if (m === l) { nX = -1; nY = 0; b.x = pl.x - b.r; }
    else if (m === r) { nX = 1; nY = 0; b.x = pl.x + pl.w + b.r; }
    else if (m === t) { nX = 0; nY = -1; b.y = pl.y - b.r; }
    else { nX = 0; nY = 1; b.y = pl.y + pl.h + b.r; }
  } else {
    nX = dx / d; nY = dy / d;
    b.x = nx + nX * b.r;
    b.y = ny + nY * b.r;
  }
  const dot = b.vx * nX + b.vy * nY;
  if (dot >= 0) return false;
  b.vx -= (1 + b.rest) * dot * nX;
  b.vy -= (1 + b.rest) * dot * nY;
  b.vx *= 0.995;
  b.vy *= 0.995;
  b.spin += rand(-5, 5);
  return true;
}

function offBounce(b, x, y) {
  b.bounces++;
  b.bouncesLeft--;
  b.spin += rand(-6, 6);
  if (b.bouncesLeft < 0) {
    b.dead = true;
    dust(x, y, 5);
    burst(x, y, b.owner >= 0 ? P_COLORS[b.owner] : CREAM, 4, 0.6, 'dot');
  }
}

function updateBalls(dt) {
  for (const b of balls) {
    if (b.dead) continue;
    b.age += dt;
    b.vy += ballGravityFor() * dt;
    b.rot += b.spin * dt;

    const sp = Math.hypot(b.vx, b.vy);
    const steps = clamp(Math.ceil(sp * dt / (11 * S)), 1, 4);
    for (let s = 0; s < steps && !b.dead; s++) {
      const step = dt / steps;
      b.x += b.vx * step;
      b.y += b.vy * step;

      // arena walls
      if (b.x - b.r < arena.left) {
        b.x = arena.left + b.r;
        if (b.vx < 0) { b.vx = -b.vx * b.rest; offBounce(b, arena.left, b.y); }
      } else if (b.x + b.r > arena.right) {
        b.x = arena.right - b.r;
        if (b.vx > 0) { b.vx = -b.vx * b.rest; offBounce(b, arena.right, b.y); }
      }
      if (b.y - b.r < arena.top) {
        b.y = arena.top + b.r;
        if (b.vy < 0) { b.vy = -b.vy * b.rest; offBounce(b, b.x, arena.top); }
      }
      if (b.y + b.r > floorY) {
        b.y = floorY - b.r;
        if (b.vy > 0) {
          b.vy = -b.vy * b.rest;
          b.vx *= 0.98;
          offBounce(b, b.x, floorY);
        }
      }
      if (b.dead) break;

      for (const p of players) {
        if (!p || p.ko || p.invuln > 0 || p.idx === b.owner) continue;
        const hx = p.x, hy = p.y - 40 * S;
        if (dist(b.x, b.y, hx, hy) < b.r + 26 * S) {
          b.dead = true;
          hitPlayer(p, b.damage, Math.sign(b.vx) || 1, b);
          break;
        }
      }
    }
    if (b.age > 6.5) b.dead = true;
  }
  balls = balls.filter(b => !b.dead && b.y < H + 200);
}

function spawnStormBall() {
  const x = rand(arena.left + 40 * S, arena.right - 40 * S);
  balls.push({
    x, y: arena.top + 26 * S,
    vx: rand(-70, 70) * S, vy: rand(80, 170) * S,
    r: 14 * S, owner: -1, charge: 0.25, damage: 8,
    bounces: 0, bouncesLeft: 3, rest: 0.82,
    rot: rand(0, TAU), spin: rand(-6, 6), age: 0, dead: false,
  });
  addParticle({ x, y: arena.top + 26 * S, life: 0.5, size: 18 * S, color: '#ff5d5d', kind: 'ring', grav: 0 });
  noiseBurst(0.12, 0.05, 500, 0, 'lowpass', 200);
}

function hitPlayer(p, dmg, dir, ball) {
  if (!p || p.ko) return;
  const col = P_COLORS[p.idx];

  if (state === 'title') {
    burst(p.x, p.y - 45 * S, col, 14, 1, 'star');
    confettiBurst(p.x, p.y - 55 * S, 16);
    addFloater(pick(['BONK!', 'POW!', 'ZONK!']), p.x, p.y - 92 * S, CREAM, 30);
    shakeIt(9);
    sfx.bonk();
    return;
  }
  if (state !== 'play' || p.invuln > 0) return;

  p.hp = Math.max(0, p.hp - dmg);
  p.invuln = 0.55;
  p.hitstun = 0.2;
  p.charging = false;
  p.charge = 0;
  p.vx += dir * 320 * S * (ball && ball.knock ? ball.knock : 1);
  p.vy = Math.min(p.vy, -250 * S);
  p.onGround = false;
  roundDamage[p.idx] += dmg;

  burst(p.x, p.y - 44 * S, col, 14, 1.25, 'star');
  burst(p.x, p.y - 44 * S, CREAM, 6, 0.8, 'dot');
  dust(p.x, p.y, 5);
  addFloater(pick(['BONK!', 'POW!', 'ZONK!', 'OOF!', 'SPLAT!', 'WHAM!']), p.x, p.y - 96 * S, CREAM, 34, rand(-0.16, 0.16));
  shakeIt(11);
  hitstop = Math.max(hitstop, 0.055);
  sfx.bonk();

  if (ball && ball.owner >= 0 && ball.owner !== p.idx) {
    profile.stats.hits = (profile.stats.hits || 0) + 1;
    if (match) match.hits++;
    awardGold(1, 'hits');
    unlock('first');
    if (ball.bounces >= 2) { unlock('trick'); profile.stats.ricochets = (profile.stats.ricochets || 0) + 1; }
    else if (ball.bounces >= 1) unlock('wall');
  }

  if (p.hp <= 0) knockout(p);
  updateHud();
}

function knockout(p) {
  if (p.ko) return;
  p.ko = true;
  p.koT = 0;
  const opp = getOpponent(p);
  p.koDir = opp && p.x < opp.x ? -1 : 1;
  p.vx = p.koDir * 420 * S;
  p.vy = -620 * S;
  p.onGround = false;
  p.charging = false;
  p.charge = 0;
  p.hitstun = 2;
  shakeIt(24);
  hitstop = Math.max(hitstop, 0.09);
  confettiBurst(p.x, p.y - 50 * S, 34);
  for (let i = 0; i < 7; i++) {
    addParticle({
      x: p.x + rand(-25, 25) * S, y: p.y - 60 * S + rand(-20, 20) * S,
      vx: rand(-260, 260) * S, vy: rand(-380, -120) * S,
      life: rand(0.6, 1.2), size: rand(7, 12) * S, color: '#ffd23f',
      kind: 'star', grav: 700 * S, spin: rand(-9, 9), drag: 0.98,
    });
  }
  sfx.ko();
  finishRound(1 - p.idx, 'ko');
}

/* ------------------------------ loot ------------------------------ */
function spawnPickup(type) {
  let x, y, tries = 0;
  do {
    tries++;
    if (Math.random() < 0.55 && platforms.length) {
      const pl = pick(platforms);
      x = rand(pl.x + 26 * S, pl.x + pl.w - 26 * S);
      y = pl.y - 24 * S;
    } else {
      x = rand(arena.left + 50 * S, arena.right - 50 * S);
      y = floorY - 28 * S;
    }
  } while (tries < 12 && players.some(p => dist(p.x, p.y - 40 * S, x, y) < 80 * S));
  pickups.push({ type: 'heart', x, y, ph: rand(0, TAU), life: 26 });
  addParticle({ x, y, life: 0.45, size: 10 * S, color: '#ff5d5d', kind: 'ring', grav: 0 });
}

function updatePickups(dt) {
  for (const pk of pickups) {
    if (pk.dead) continue;
    pk.life -= dt;
    for (const p of players) {
      if (!p || p.ko) continue;
      if (dist(p.x, p.y - 40 * S, pk.x, pk.y) < 38 * S) {
        pk.dead = true;
        p.hp = Math.min(p.maxHp, p.hp + 50);
        addFloater('+50', pk.x, pk.y - 22 * S, '#ff6b8a', 22);
        burst(pk.x, pk.y, '#ff5d5d', 10, 0.7, 'star');
        sfx.heart();
        updateHud();
        break;
      }
    }
    if (pk.life <= 0) pk.dead = true;
  }
  pickups = pickups.filter(p => !p.dead);
}

/* ------------------------------ fx updates ------------------------------ */
function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
    p.vx *= Math.pow(p.drag, dt * 60);
    p.vy *= Math.pow(p.drag, dt * 60);
    p.rot += p.spin * dt;
  }
  particles = particles.filter(p => p.life > 0);
}
function updateFloaters(dt) {
  for (const f of floaters) {
    f.life -= dt;
    f.y += f.vy * dt;
    f.vy *= Math.pow(0.9, dt * 60);
  }
  floaters = floaters.filter(f => f.life > 0);
}
