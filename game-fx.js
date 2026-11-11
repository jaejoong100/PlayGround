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

function beginThrow(p, manual) {
  if (!p || p.ko || paused) return;
  if (state !== 'play' && state !== 'title') return;
  if (p.throwCd > 0 || p.charging || p.hitstun > 0) return;
  const b = nearbyCatchable(p);
  if (b) { doCatch(p, b); return; }
  p.charging = true;
  p.charge = 0;
  p.chargeFx = 0;
  p.throwAnim = 0;
  p.aimT = 0;
  p.aimManual = !!manual;
  if (!manual) p.aimAngle = 0.18;
  else if (!Number.isFinite(p.aimAngle)) p.aimAngle = 0.55;
  blip(180, 0.05, 'triangle', 0.06, 80);
}

function releaseThrow(p) {
  if (!p || !p.charging) return;
  const charge = Math.max(0.12, p.charge);
  p.charging = false;
  p.charge = 0;
  if (state !== 'play' && state !== 'title') return;
  spawnProjectile(p, charge, {});
  p.throwCd = 0.3;
  p.throwAnim = 0.3;
}

function spawnBall(p, charge, opts = {}) {
  return spawnProjectile(p, charge, opts);
}

function spawnProjectile(p, charge, opts = {}) {
  const weapon = WEAPON_BY_ID[opts.weaponId] || weaponOf(p);
  const plan = throwPlan(p, charge, weapon);
  const dmg = Math.round((weapon.damage + weapon.chargeDamage * charge) * (roundMod.damage || 1) * (opts.catchBonus ? 1.2 : 1));
  const r = (weapon.radius + weapon.chargeRadius * charge) * S * (roundMod.ballSize || 1);
  const b = {
    x: plan.hand.x, y: plan.hand.y,
    vx: plan.vx, vy: plan.vy,
    r, owner: p.idx, charge,
    damage: dmg,
    weaponId: weapon.id,
    weapon,
    gravity: plan.g,
    drag: weapon.drag,
    spawnX: plan.hand.x, spawnY: plan.hand.y,
    rot: rand(0, TAU), spin: rand(-8, 8) * (weapon.id === 'frisbee' ? 1.6 : 1),
    age: 0, dead: false, caught: !!opts.catchBonus,
  };
  balls.push(b);

  // muzzle fx
  const col = P_COLORS[p.idx];
  for (let i = 0; i < 7; i++) {
    addParticle({
      x: plan.hand.x, y: plan.hand.y,
      vx: plan.vx * rand(0.04, 0.16) + rand(-60, 60) * S,
      vy: plan.vy * rand(0.04, 0.16) + rand(-70, 70) * S,
      life: rand(0.12, 0.32), size: rand(2, 5) * S,
      color: i % 2 ? weapon.accent : col, kind: 'spark', grav: 120 * S, drag: 0.9,
    });
  }
  burst(plan.hand.x, plan.hand.y, col, 4, 0.5, 'dot');
  sfx.throwBall(charge, weapon);
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
  spawnProjectile(p, Math.min(1, (b.charge || 0.2) + 0.45), { catchBonus: true, weaponId: b.weaponId });
  return true;
}

/* ------------------------------ projectiles ------------------------------ */
function ballHitsRect(b, pl) {
  const nx = clamp(b.x, pl.x, pl.x + pl.w);
  const ny = clamp(b.y, pl.y, pl.y + pl.h);
  const dx = b.x - nx, dy = b.y - ny;
  return dx * dx + dy * dy <= b.r * b.r;
}

function crushProjectile(b, x, y) {
  if (!b || b.dead) return;
  b.dead = true;
  const w = b.weapon || WEAPONS[0];
  if (w.id === 'bomb') { explodeBomb(b, x, y); return; }

  const team = b.owner >= 0 ? P_COLORS[b.owner] : w.color;
  const shards = w.id === 'bowl' ? 14 : 11;
  for (let i = 0; i < shards; i++) {
    const a = rand(0, TAU), sp = rand(70, 320) * (w.id === 'bowl' ? 1.2 : 1) * S;
    addParticle({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70 * S,
      life: rand(0.24, 0.62), size: rand(2, 6) * S,
      color: i % 3 === 0 ? w.accent : (i % 2 ? team : w.color),
      kind: w.id === 'frisbee' ? 'rect' : 'dot',
      grav: 900 * S, spin: rand(-10, 10), drag: 0.94,
    });
  }
  addParticle({ x, y, life: 0.28, size: (w.id === 'bowl' ? 18 : 13) * S, color: team, kind: 'ring', grav: 0 });
  dust(x, y, w.id === 'bowl' ? 8 : 5);
  sfx.crush(w);
  shakeIt(w.id === 'bowl' ? 8 : 4);
}

function explodeBomb(b, x, y) {
  const w = b.weapon || WEAPON_BY_ID.bomb;
  const radius = (w.blastRadius || 96) * S * (roundMod.ballSize || 1) * (0.92 + b.charge * 0.16);
  const baseDmg = (w.blastDamage || 24) * (roundMod.damage || 1) * (1 + b.charge * 0.3);
  for (const p of players) {
    if (!p || p.ko || p.idx === b.owner) continue;
    const d = dist(p.x, p.y - 42 * S, x, y);
    if (d > radius) continue;
    const falloff = 1 - (d / radius) * 0.42;
    hitPlayer(p, Math.max(6, Math.round(baseDmg * falloff)), Math.sign(p.x - x) || 1, b);
  }
  for (let i = 0; i < 30; i++) {
    const a = rand(0, TAU), sp = rand(80, 520) * S;
    addParticle({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * S,
      life: rand(0.3, 0.9), size: rand(3, 9) * S,
      color: pick(['#ffd23f', '#ff5d5d', '#fff4d8', '#3a2154', '#ff8fab']),
      kind: i % 3 === 0 ? 'star' : i % 3 === 1 ? 'dot' : 'spark',
      grav: 700 * S, spin: rand(-10, 10), drag: 0.95,
    });
  }
  addParticle({ x, y, life: 0.5, size: radius * 0.55, color: '#ffd23f', kind: 'ring', grav: 0 });
  addParticle({ x, y, life: 0.35, size: radius * 0.35, color: '#ff5d5d', kind: 'ring', grav: 0 });
  confettiBurst(x, y, 16);
  shakeIt(22);
  hitstop = Math.max(hitstop, 0.08);
  sfx.boom();
  addFloater('BOOM!', x, y - 24 * S, '#ffd23f', 34, rand(-0.1, 0.1));
}

function updateBalls(dt) {
  for (const b of balls) {
    if (b.dead) continue;
    b.age += dt;
    b.vy += (b.gravity ?? ballGravityFor()) * dt;
    if (b.drag) b.vx *= Math.pow(b.drag, dt * 60);
    b.rot += b.spin * dt;

    const sp = Math.hypot(b.vx, b.vy);
    const steps = clamp(Math.ceil(sp * dt / (10 * S)), 1, 5);
    for (let s = 0; s < steps && !b.dead; s++) {
      const step = dt / steps;
      b.x += b.vx * step;
      b.y += b.vy * step;

      for (const p of players) {
        if (!p || p.ko || p.invuln > 0 || p.idx === b.owner) continue;
        const hx = p.x, hy = p.y - 40 * S;
        if (dist(b.x, b.y, hx, hy) < b.r + 26 * S) {
          if ((b.weaponId || 'ball') === 'bomb') {
            crushProjectile(b, b.x, b.y);
          } else {
            hitPlayer(p, b.damage, Math.sign(b.vx) || 1, b);
            crushProjectile(b, b.x, b.y);
          }
          break;
        }
      }
      if (b.dead) break;

      for (const pl of platforms) {
        if (ballHitsRect(b, pl)) { crushProjectile(b, b.x, b.y); break; }
      }
      if (b.dead) break;

      if (b.x - b.r < arena.left) { b.x = arena.left + b.r; crushProjectile(b, arena.left, b.y); }
      else if (b.x + b.r > arena.right) { b.x = arena.right - b.r; crushProjectile(b, arena.right, b.y); }
      if (!b.dead && b.y - b.r < arena.top) { b.y = arena.top + b.r; crushProjectile(b, b.x, arena.top); }
      if (!b.dead && b.y + b.r > floorY) { b.y = floorY - b.r; crushProjectile(b, b.x, floorY); }
    }
    if (!b.dead && b.age > 7) {
      b.dead = true;
      dust(b.x, b.y, 3);
    }
  }
  balls = balls.filter(b => !b.dead && b.y < H + 200);
}

function spawnStormBall() {
  const w = pick(WEAPONS.filter(x => x.id !== 'bomb' || Math.random() < 0.35));
  const x = rand(arena.left + 40 * S, arena.right - 40 * S);
  balls.push({
    x, y: arena.top + 26 * S,
    vx: rand(-70, 70) * S, vy: rand(80, 170) * S,
    r: (w.radius + 3) * S, owner: -1, charge: 0.3,
    damage: Math.round((w.damage || w.blastDamage || 12) * 0.7),
    weaponId: w.id, weapon: w,
    gravity: ballGravityFor() * w.gravity,
    drag: w.drag,
    spawnX: x, spawnY: arena.top + 26 * S,
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
  const knock = (ball && ball.weapon && ball.weapon.knock) || 1;
  p.vx += dir * 320 * S * knock;
  p.vy = Math.min(p.vy, -250 * S * knock);
  p.onGround = false;
  p.squash = 0.26;
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
    if (ball.spawnX != null) {
      const range = dist(ball.spawnX, ball.spawnY, p.x, p.y - 42 * S);
      if (range > (arena.right - arena.left) * 0.62) unlock('sniper');
    }
  }

  if (p.hp <= 0) {
    const wid = ball && ball.weaponId;
    if (wid === 'bomb') unlock('demolition');
    if (wid === 'bowl') unlock('heavy');
    knockout(p);
  }
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
  pickups.push({ type, x, y, ph: rand(0, TAU), life: 26 });
  addParticle({ x, y, life: 0.45, size: 10 * S, color: type === 'coin' ? '#ffd23f' : '#ff5d5d', kind: 'ring', grav: 0 });
}

function updatePickups(dt) {
  for (const pk of pickups) {
    if (pk.dead) continue;
    pk.life -= dt;
    for (const p of players) {
      if (!p || p.ko) continue;
      if (dist(p.x, p.y - 40 * S, pk.x, pk.y) < 38 * S) {
        pk.dead = true;
        if (pk.type === 'coin') {
          awardGold(2, 'coins');
          profile.stats.coins = (profile.stats.coins || 0) + 1;
          if (profile.stats.coins >= 25) unlock('coin25');
          addFloater('+2', pk.x, pk.y - 22 * S, '#ffd23f', 22);
          burst(pk.x, pk.y, '#ffd23f', 10, 0.7, 'star');
          sfx.coin();
        } else {
          p.hp = Math.min(p.maxHp, p.hp + 22);
          addFloater('+22', pk.x, pk.y - 22 * S, '#ff6b8a', 22);
          burst(pk.x, pk.y, '#ff5d5d', 10, 0.7, 'star');
          sfx.heart();
          updateHud();
        }
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
