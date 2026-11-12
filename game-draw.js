'use strict';
/* =========================================================================
   BONK BALL — drawing
   ========================================================================= */

/* ------------------------------ characters ------------------------------ */
function limb(g, x1, y1, x2, y2, w, color, outline = 3) {
  g.lineCap = 'round';
  g.strokeStyle = INK;
  g.lineWidth = w + outline * 2;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}

function drawShoe(g, x, y, ang, color = CREAM) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  rr(g, -7, -4.5, 15, 8.5, 4);
  g.fillStyle = color; g.fill();
  g.lineWidth = 2.6; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.moveTo(-4, 1.8); g.lineTo(5, 1.8);
  g.lineWidth = 1.6; g.strokeStyle = 'rgba(36,19,53,.35)'; g.stroke();
  g.restore();
}

function drawLegs(g, char, o) {
  const pitch = o.phase || 0;
  const run = o.run || 0;
  const hip = -35;
  const swing = o.onGround ? Math.sin(pitch) * 7 * run : 0;
  const lift1 = o.onGround ? Math.max(0, Math.sin(pitch)) * 3.5 * run : 4;
  const lift2 = o.onGround ? Math.max(0, -Math.sin(pitch)) * 3.5 * run : 4;
  const bx = 7.5;
  // back leg
  limb(g, -bx, hip, -bx - swing, -6 - lift2, 5.2, char.skinDark, 2.2);
  drawShoe(g, -bx - swing, -5 - lift2, o.onGround ? -0.06 * Math.sin(pitch) * run : -0.22);
  // front leg
  limb(g, bx, hip, bx + swing, -6 - lift1, 5.2, char.skin, 2.2);
  drawShoe(g, bx + swing, -5 - lift1, o.onGround ? 0.06 * Math.sin(pitch) * run : 0.18);
}

function drawArm(g, char, o, aim, front) {
  const shoulderX = aim * 14;
  const shoulderY = -59;
  let hx, hy;
  if (front && (o.throwAnim || 0) > 0) {
    const k = 1 - clamp(o.throwAnim / 0.3, 0, 1);
    hx = aim * lerp(16, 40, k);
    hy = lerp(-48, -62, k);
  } else if (front && o.charging) {
    hx = aim * 14;
    hy = -48;
  } else if (front && (o.catchAnim || 0) > 0) {
    hx = aim * 30;
    hy = -54;
  } else if (front) {
    hx = aim * 22;
    hy = -48;
  } else {
    hx = -aim * 16;
    hy = -44;
  }
  limb(g, shoulderX, shoulderY, hx, hy, 4.8, front ? char.skin : char.skinDark, 2.2);
  // jersey sleeve cap
  g.beginPath(); g.arc(shoulderX, shoulderY, 7.2, 0, TAU);
  g.fillStyle = char.color; g.fill();
  g.lineWidth = 2.8; g.strokeStyle = INK; g.stroke();
  // team glove
  g.beginPath(); g.arc(hx, hy, 5.8, 0, TAU);
  g.fillStyle = o.color; g.fill();
  g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.arc(hx - 1.6, hy - 1.8, 1.6, 0, TAU);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();

  if (front && o.showBall) {
    const br = o.ballRadius || 8;
    if (o.charging) {
      const pulse = 1 + Math.sin((o.t || 0) * 12) * 0.06;
      g.beginPath(); g.arc(hx, hy, br * 1.7 * pulse, 0, TAU);
      g.fillStyle = withA(o.color, 0.16); g.fill();
    }
    g.beginPath(); g.arc(hx, hy, br, 0, TAU);
    g.fillStyle = o.color; g.fill();
    g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    g.save();
    g.beginPath(); g.arc(hx, hy, br - 1, 0, TAU); g.clip();
    g.strokeStyle = withA(CREAM, 0.92);
    g.lineWidth = br * 0.34;
    g.beginPath(); g.arc(hx, hy, br * 0.74, -1.05, 1.05); g.stroke();
    g.beginPath(); g.arc(hx, hy, br * 0.74, Math.PI - 1.05, Math.PI + 1.05); g.stroke();
    g.restore();
    g.beginPath(); g.arc(hx - br * 0.3, hy - br * 0.35, br * 0.22, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
  }
}

function paintBody(g, fill) {
  g.fillStyle = fill;
  g.fill();
  g.lineJoin = 'round';
  g.lineWidth = 4.4;
  g.strokeStyle = INK;
  g.stroke();
}

function drawBody(g, char, o) {
  // neck
  rr(g, -6, -70, 12, 12, 5);
  g.fillStyle = char.skin; g.fill();
  g.lineWidth = 3.4; g.strokeStyle = INK; g.stroke();

  // jersey torso
  g.beginPath();
  g.moveTo(-18, -62);
  g.quadraticCurveTo(-20, -51, -15, -41);
  g.quadraticCurveTo(0, -38, 15, -41);
  g.quadraticCurveTo(20, -51, 18, -62);
  g.quadraticCurveTo(9, -67, 0, -67);
  g.quadraticCurveTo(-9, -67, -18, -62);
  g.closePath();
  paintBody(g, char.color);

  // team stripe across the chest
  g.save();
  g.clip();
  g.strokeStyle = o.color; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-20, -56); g.lineTo(20, -49); g.stroke();
  g.strokeStyle = withA(CREAM, 0.72); g.lineWidth = 2;
  g.beginPath(); g.moveTo(-20, -59); g.lineTo(20, -52); g.stroke();
  g.restore();

  // team star emblem
  g.save();
  g.translate(0, -45.5);
  starPath(g, 6.4, 2.8, 5);
  g.fillStyle = o.color; g.fill();
  g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  g.restore();

  // shorts
  rr(g, -16, -43, 32, 14, 5);
  paintBody(g, char.dark);
  // waistband
  rr(g, -14, -40, 28, 3.4, 1.7);
  g.fillStyle = o.color; g.fill();
  // short hems
  g.strokeStyle = 'rgba(36,19,53,.4)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(-12, -29.5); g.lineTo(-5, -29.5); g.stroke();
  g.beginPath(); g.moveTo(5, -29.5); g.lineTo(12, -29.5); g.stroke();
}

function drawEyes(g, char, o) {
  const ey = char.eyeY, gap = char.eyeGap, r = char.eyeR;
  const lookX = (o.lookX || 0) * 1.5;
  const lookY = (o.lookY || 0) * 1.2;
  const ko = o.ko;
  const blink = o.blink && !ko;

  if (ko) {
    g.strokeStyle = INK; g.lineWidth = 2.7; g.lineCap = 'round';
    [-gap, gap].forEach(x => {
      g.beginPath();
      g.moveTo(x - r * 0.7, ey - r * 0.7); g.lineTo(x + r * 0.7, ey + r * 0.7);
      g.moveTo(x + r * 0.7, ey - r * 0.7); g.lineTo(x - r * 0.7, ey + r * 0.7);
      g.stroke();
    });
    return;
  }

  [-gap, gap].forEach((x, i) => {
    if (blink) {
      g.strokeStyle = INK; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - r * 0.8, ey + (i ? -0.4 : 0.4));
      g.quadraticCurveTo(x, ey + 1.8, x + r * 0.8, ey + (i ? -0.4 : 0.4));
      g.stroke();
    } else {
      g.beginPath(); g.arc(x, ey, r, 0, TAU);
      g.fillStyle = PAPER; g.fill();
      g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(x + lookX, ey + lookY, r * 0.48, 0, TAU);
      g.fillStyle = INK; g.fill();
      g.beginPath(); g.arc(x + lookX - r * 0.18, ey + lookY - r * 0.2, r * 0.14, 0, TAU);
      g.fillStyle = '#fff'; g.fill();
    }
  });

  if (o.charging || (o.hurt || 0) > 0) {
    g.strokeStyle = INK; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-gap - r * 0.8, ey - r * 1.7); g.lineTo(-gap + r * 0.5, ey - r * 1.3); g.stroke();
    g.beginPath(); g.moveTo(gap + r * 0.8, ey - r * 1.7); g.lineTo(gap - r * 0.5, ey - r * 1.3); g.stroke();
  }
}

function drawAnimalHead(g, char, o) {
  const c = char.color, d = char.dark;

  if (char.animal === 'frog') {
    // bulging eye sockets
    [-1, 1].forEach(s => {
      g.beginPath(); g.arc(s * 9.5, -88, 7.6, 0, TAU);
      paintBody(g, c);
    });
    // wide froggy head
    g.beginPath(); g.ellipse(0, -78.5, 18, 14.5, 0, 0, TAU);
    paintBody(g, c);
    // smile
    g.strokeStyle = INK; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-11, -75.5); g.quadraticCurveTo(0, -69.5, 11, -75.5); g.stroke();
    // nostrils + cheeks
    g.fillStyle = withA(d, 0.85);
    g.beginPath(); g.arc(-4, -82, 1.3, 0, TAU); g.fill();
    g.beginPath(); g.arc(4, -82, 1.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,93,93,.24)';
    g.beginPath(); g.ellipse(-11, -77, 3.2, 2.1, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(11, -77, 3.2, 2.1, 0, 0, TAU); g.fill();
    drawEyes(g, char, o);
  } else if (char.animal === 'croc') {
    // scaly skull
    g.beginPath(); g.ellipse(-1, -81, 16, 13, 0, 0, TAU);
    paintBody(g, c);
    // long snout
    rr(g, -1, -81, 23, 11, 5);
    paintBody(g, c);
    // nostrils
    g.fillStyle = withA(d, 0.9);
    g.beginPath(); g.arc(16.5, -78, 1.3, 0, TAU); g.fill();
    g.beginPath(); g.arc(20, -78, 1.3, 0, TAU); g.fill();
    // jaw line + teeth
    g.strokeStyle = INK; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(2, -71.5); g.lineTo(21, -71.5); g.stroke();
    g.fillStyle = CREAM;
    [4.5, 9.5, 14.5, 19].forEach(x => {
      g.beginPath(); g.moveTo(x - 1.2, -71.5); g.lineTo(x + 1.2, -71.5); g.lineTo(x, -68.4); g.closePath(); g.fill();
    });
    // scales
    g.fillStyle = withA(d, 0.55);
    [[-11, -86, 1.3], [-5, -90, 1], [5, -88, 1.1], [11, -84, 1.2], [-13, -78, 1]].forEach(([x, y, r]) => {
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    });
    drawEyes(g, char, o);
  } else if (char.animal === 'lion') {
    // mane
    g.beginPath();
    const spikes = 18;
    for (let i = 0; i < spikes; i++) {
      const a = i / spikes * TAU;
      const r = i % 2 ? 14.5 : 17.5;
      const x = Math.cos(a) * r, y = -79 + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    paintBody(g, d);
    // ears
    [-1, 1].forEach(s => {
      g.beginPath(); g.arc(s * 11, -90, 4.8, 0, TAU);
      g.fillStyle = c; g.fill(); g.lineWidth = 2.8; g.strokeStyle = INK; g.stroke();
    });
    // face
    g.beginPath(); g.ellipse(0, -79, 14.5, 13.5, 0, 0, TAU);
    paintBody(g, c);
    // muzzle
    g.beginPath(); g.ellipse(0, -72.5, 8, 5.4, 0, 0, TAU);
    g.fillStyle = '#ffe6b8'; g.fill();
    g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
    // nose + mouth
    g.beginPath(); g.moveTo(-2.3, -76); g.lineTo(2.3, -76); g.lineTo(0, -73.7); g.closePath();
    g.fillStyle = INK; g.fill();
    g.strokeStyle = INK; g.lineWidth = 1.7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -73.7); g.lineTo(0, -71.6); g.stroke();
    g.beginPath(); g.moveTo(0, -71.6); g.quadraticCurveTo(-3, -69.8, -5, -71.4); g.stroke();
    g.beginPath(); g.moveTo(0, -71.6); g.quadraticCurveTo(3, -69.8, 5, -71.4); g.stroke();
    // mane shading
    g.strokeStyle = withA('#6d421d', 0.4); g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(-15, -86); g.lineTo(-12.5, -89); g.stroke();
    g.beginPath(); g.moveTo(15, -86); g.lineTo(12.5, -89); g.stroke();
    drawEyes(g, char, o);
  } else if (char.animal === 'pig') {
    // ears
    [-1, 1].forEach(s => {
      g.beginPath();
      g.moveTo(s * 8, -91); g.lineTo(s * 16, -96); g.lineTo(s * 14, -86);
      g.closePath();
      g.fillStyle = c; g.fill(); g.lineWidth = 2.8; g.strokeStyle = INK; g.stroke();
    });
    // head
    g.beginPath(); g.ellipse(0, -80, 16, 14, 0, 0, TAU);
    paintBody(g, c);
    // snout
    g.beginPath(); g.ellipse(0, -73.5, 8.2, 5.6, 0, 0, TAU);
    g.fillStyle = '#ffd0e1'; g.fill();
    g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
    g.fillStyle = withA(d, 0.95);
    g.beginPath(); g.ellipse(-3, -73.5, 1.3, 1.9, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(3, -73.5, 1.3, 1.9, 0, 0, TAU); g.fill();
    // sprinkle freckles
    const sprinkles = [[-11, -79, 0.6], [-12, -74, -0.5], [11, -79, -0.4], [12, -75, 0.7]];
    sprinkles.forEach(([x, y, rot], i) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      rr(g, -2.2, -0.9, 4.4, 1.8, 0.9);
      g.fillStyle = ['#fff4d8', '#2ec4b6', '#ffd23f', '#a06cff'][i % 4];
      g.fill();
      g.restore();
    });
    drawEyes(g, char, o);
  } else if (char.animal === 'chicken') {
    // comb
    g.fillStyle = '#e8434f';
    [-5.5, 0, 5.5].forEach((x, i) => {
      g.beginPath(); g.arc(x, -93 + (i === 1 ? -1 : 0), 3.2, 0, TAU);
      g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    });
    // head
    g.beginPath(); g.ellipse(0, -81, 14.5, 13.5, 0, 0, TAU);
    paintBody(g, c);
    // beak
    g.beginPath(); g.moveTo(4, -77); g.lineTo(17, -73.6); g.lineTo(4, -70.5); g.closePath();
    g.fillStyle = '#ffa32e'; g.fill();
    g.lineWidth = 2.3; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(4, -70.5); g.lineTo(14, -72); g.lineTo(4, -68.8); g.closePath();
    g.fillStyle = '#e07f16'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    // wattle
    g.beginPath(); g.ellipse(7, -66.5, 3, 4.2, 0.2, 0, TAU);
    g.fillStyle = '#e8434f'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    // nostril
    g.fillStyle = INK;
    g.beginPath(); g.arc(10, -75.5, 0.9, 0, TAU); g.fill();
    drawEyes(g, char, o);
  } else {
    // duck
    g.beginPath(); g.ellipse(0, -80, 15, 13.5, 0, 0, TAU);
    paintBody(g, c);
    // feather tuft
    g.strokeStyle = withA(d, 0.85); g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-3, -93); g.quadraticCurveTo(-5, -97, -1, -98); g.stroke();
    g.beginPath(); g.moveTo(1, -93); g.quadraticCurveTo(0, -97, 4, -98); g.stroke();
    // bill
    rr(g, 1, -77.5, 17, 6.5, 3.2);
    g.fillStyle = '#ffae3b'; g.fill();
    g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(3, -74); g.lineTo(17, -74);
    g.strokeStyle = 'rgba(36,19,53,.45)'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = INK;
    g.beginPath(); g.arc(9, -75.5, 0.8, 0, TAU); g.fill();
    drawEyes(g, char, o);
  }
}

function drawCharacter(g, char, o) {
  const s = o.scale || 1;
  g.save();
  g.scale(s, s);
  const run = o.run || 0;
  const phase = o.phase || 0;
  const t = o.t || 0;
  const bob = o.ko ? 0 : o.onGround
    ? (run > 0.06 ? Math.abs(Math.sin(phase)) * 2.4 * run : Math.sin(t * 2.1 + (o.seed || 0)) * 1.4)
    : -1.5;
  g.translate(0, bob);
  if ((o.hurt || 0) > 0) g.rotate(-0.09);
  if (o.charging) g.translate(rand(-0.9, 0.9), rand(-0.9, 0.9));
  g.scale(o.facing || 1, 1);

  drawLegs(g, char, o);
  drawArm(g, char, o, -(o.aim || 1), false);
  drawBody(g, char, o);
  drawAnimalHead(g, char, o);
  drawArm(g, char, o, (o.aim || 1), true);
  g.restore();
}

function drawPlayer(p, t) {
  const opp = getOpponent(p);
  const color = playerColor(p);
  const lookX = opp ? clamp((opp.x - p.x) / (260 * S), -1, 1) * p.facing : 0;
  const lookY = opp ? clamp(((opp.y - 42 * S) - (p.y - 52 * S)) / (260 * S), -1, 1) : 0;
  const aimSign = opp ? (Math.sign(opp.x - p.x) || 1) : p.facing;

  if ((p.onGround || p.ko) && state !== 'title') {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * S, 26 * S, 6 * S, 0, 0, TAU);
    ctx.fillStyle = 'rgba(36,19,53,.22)';
    ctx.fill();
  }

  if (p.rageT > 0) {
    ctx.beginPath();
    ctx.arc(p.x, p.y - 42 * S, 46 * S, 0, TAU);
    ctx.fillStyle = `rgba(255,140,40,${0.16 + Math.sin(t * 10) * 0.05})`;
    ctx.fill();
    ctx.lineWidth = 3 * S;
    ctx.strokeStyle = 'rgba(255,210,63,.8)';
    ctx.stroke();
  }
  if (p.shieldT > 0) {
    ctx.beginPath();
    ctx.arc(p.x, p.y - 42 * S, 52 * S, 0, TAU);
    ctx.fillStyle = `rgba(125,211,252,${0.18 + Math.sin(t * 8) * 0.05})`;
    ctx.fill();
    ctx.lineWidth = 3 * S;
    ctx.strokeStyle = 'rgba(14,165,233,.85)';
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && state === 'play' && Math.floor(p.invuln * 22) % 2 === 0) ctx.globalAlpha = 0.55;
  if (p.ko) {
    const k = clamp(p.koT / 0.9, 0, 1);
    ctx.rotate(k * Math.PI * 0.48 * (p.koDir || 1));
  }
  drawCharacter(ctx, p.char, {
    scale: S,
    facing: p.facing,
    t, phase: p.runPhase, run: p.onGround ? clamp(Math.abs(p.vx) / (runSpeedFor() || 1), 0, 1) : 0.4,
    onGround: p.onGround, vy: p.vy, seed: p.idx * 2.3,
    aiming: true, aim: aimSign * p.facing,
    charging: p.charging, charge: p.charge,
    throwAnim: p.throwAnim, catchAnim: p.catchAnim,
    hurt: p.hitstun, ko: p.ko,
    lookX, lookY,
    blink: p.blink > 0,
    color,
    showBall: !p.ko && p.throwAnim <= 0 && p.throwCd <= 0,
    ballRadius: 7.5 + p.charge * 7,
  });
  ctx.restore();

  // player ID badge above the head
  if (state !== 'title' && state !== 'matchEnd') {
    const bw = Math.max(15, 18 * S), bh = Math.max(11, 13 * S);
    const by = p.y - 104 * S;
    ctx.save();
    ctx.translate(p.x, by);
    rr(ctx, -bw / 2, -bh / 2, bw, bh, 7 * S);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.4 * S;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3.4 * S, bh / 2 - 1);
    ctx.lineTo(0, bh / 2 + 5 * S);
    ctx.lineTo(3.4 * S, bh / 2 - 1);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2 * S; ctx.stroke();
    ctx.font = `${Math.max(8, 10 * S)}px Bungee, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = p.idx === 0 ? INK : CREAM;
    ctx.fillText(String(p.idx + 1), 0, 0.6 * S);
    ctx.restore();
  }
  if (state === 'play' && !p.ko) {
    const b = nearbyCatchable(p);
    if (b && !p.charging) {
      const r = 66 * S + Math.sin(t * 8 + p.idx) * 3 * S;
      ctx.beginPath(); ctx.arc(p.x, p.y - 40 * S, r, 0, TAU);
      ctx.strokeStyle = withA(color, 0.5);
      ctx.lineWidth = 2.5 * S;
      ctx.setLineDash([5 * S, 6 * S]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `${9 * S}px Bungee, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3 * S;
      ctx.strokeStyle = 'rgba(36,19,53,.8)';
      ctx.strokeText('CATCH!', p.x, p.y + 24 * S);
      ctx.fillStyle = CREAM;
      ctx.fillText('CATCH!', p.x, p.y + 24 * S);
    }
  }

  // KO stars
  if (p.ko) {
    for (let i = 0; i < 3; i++) {
      const a = t * 3.4 + i * TAU / 3;
      const sx = p.x + Math.cos(a) * 22 * S;
      const sy = p.y - 82 * S + Math.sin(a) * 9 * S;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
      starPath(ctx, 6 * S, 2.6 * S, 5);
      ctx.fillStyle = '#ffd23f'; ctx.fill();
      ctx.lineWidth = 1.6 * S; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }
  }
}

/* ------------------------------ scene ------------------------------ */
function drawSky(t) {
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, floorY);

  const sunX = W * 0.74, sunY = arena.top + (floorY - arena.top) * 0.22;
  const sunR = Math.min(W, H) * 0.072;
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(t * 0.018);
  ctx.fillStyle = 'rgba(255,236,168,.055)';
  for (let i = 0; i < 16; i++) {
    const a = i * TAU / 16;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, Math.max(W, H) * 0.7, a, a + 0.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.8);
  glow.addColorStop(0, 'rgba(255,239,177,.55)');
  glow.addColorStop(0.5, 'rgba(255,199,110,.16)');
  glow.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 2.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU);
  ctx.fillStyle = '#ffedb0'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,244,216,.55)'; ctx.stroke();

  // stars
  for (const st of stars) {
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph));
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU);
    ctx.fillStyle = `rgba(255,244,216,${tw * 0.65})`; ctx.fill();
  }

  // clouds
  ctx.fillStyle = 'rgba(255,220,190,.18)';
  for (const c of clouds) {
    const x = ((c.x + t * c.sp + 160) % (W + 320)) - 160;
    const y = c.y + Math.sin(t * 0.4 + c.ph) * 3;
    ctx.globalAlpha = c.a;
    ctx.beginPath();
    ctx.ellipse(x, y, 46 * c.s, 15 * c.s, 0, 0, TAU);
    ctx.ellipse(x + 34 * c.s, y - 8 * c.s, 30 * c.s, 17 * c.s, 0, 0, TAU);
    ctx.ellipse(x - 36 * c.s, y - 4 * c.s, 26 * c.s, 13 * c.s, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawCity(t) {
  const base = floorY;
  // far skyline
  for (const b of buildingsFar) {
    ctx.fillStyle = 'rgba(73,42,104,.72)';
    ctx.fillRect(b.x, base - b.h, b.w, b.h + 4);
    // antenna
    if (b.seed > 70) {
      ctx.fillRect(b.x + b.w * 0.5, base - b.h - 16 * S, 2 * S, 16 * S);
    }
    // windows
    ctx.fillStyle = 'rgba(255,218,130,.22)';
    const cols = Math.max(1, Math.floor(b.w / (11 * S)));
    const rows = Math.max(1, Math.floor(b.h / (15 * S)));
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (((r * 7 + c * 3 + Math.floor(b.seed)) % 5) !== 0) continue;
        ctx.fillRect(b.x + 4 * S + c * 11 * S, base - b.h + 8 * S + r * 15 * S, 3.5 * S, 5 * S);
      }
    }
  }
  // near skyline
  for (const b of buildingsNear) {
    ctx.fillStyle = 'rgba(46,24,73,.9)';
    ctx.fillRect(b.x, base - b.h, b.w, b.h + 4);
    ctx.fillStyle = 'rgba(255,214,122,.2)';
    const cols = Math.max(1, Math.floor(b.w / (13 * S)));
    const rows = Math.max(1, Math.floor(b.h / (18 * S)));
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (((r * 5 + c * 7 + Math.floor(b.seed)) % 4) !== 0) continue;
        ctx.fillRect(b.x + 5 * S + c * 13 * S, base - b.h + 9 * S + r * 18 * S, 4 * S, 5 * S);
      }
    }
  }
  // haze at the horizon
  const haze = ctx.createLinearGradient(0, base - 90 * S, 0, base);
  haze.addColorStop(0, 'rgba(255,180,110,0)');
  haze.addColorStop(1, 'rgba(255,180,110,.2)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, base - 90 * S, W, 90 * S);
}

function drawFence(t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(arena.left, arena.top, arena.right - arena.left, floorY - arena.top);
  ctx.clip();
  const gap = 34 * Math.max(0.75, S);
  ctx.strokeStyle = 'rgba(255,244,216,.05)';
  ctx.lineWidth = 1.2;
  for (let x = arena.left - (floorY - arena.top); x < arena.right + (floorY - arena.top); x += gap) {
    ctx.beginPath(); ctx.moveTo(x, arena.top); ctx.lineTo(x + (floorY - arena.top), floorY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x + (floorY - arena.top), arena.top); ctx.stroke();
  }
  ctx.restore();

  // posters
  if (W > 640) {
    drawPoster(arena.left + (arena.right - arena.left) * 0.09, arena.top + 92 * S, -0.06, 'BONK!', '#ffd23f');
    drawPoster(arena.left + (arena.right - arena.left) * 0.84, arena.top + 104 * S, 0.05, 'OOF!', '#ff8fab');
  }
}

function drawPoster(x, y, rot, label, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const w = 74 * S, h = 50 * S;
  rr(ctx, -w / 2, -h / 2, w, h, 3 * S);
  ctx.fillStyle = 'rgba(255,244,216,.78)'; ctx.fill();
  ctx.lineWidth = 2 * S; ctx.strokeStyle = 'rgba(36,19,53,.5)'; ctx.stroke();
  ctx.save();
  ctx.translate(0, -4 * S);
  ctx.beginPath(); ctx.arc(-w * 0.24, 0, 9 * S, 0, TAU);
  ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 2 * S; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = CREAM; ctx.lineWidth = 2.5 * S;
  ctx.beginPath(); ctx.arc(-w * 0.24, 0, 6 * S, -1, 1); ctx.stroke();
  ctx.restore();
  outlineText(ctx, label, w * 0.12, -3 * S, 15 * S, color, INK, 3 * S, 'center');
  // tape
  ctx.fillStyle = 'rgba(255,244,216,.55)';
  ctx.fillRect(-w / 2 - 4 * S, -h / 2 - 3 * S, 12 * S, 8 * S);
  ctx.fillRect(w / 2 - 8 * S, -h / 2 - 3 * S, 12 * S, 8 * S);
  ctx.restore();
}

function drawArenaFrame(t) {
  const aw = arena.right - arena.left;
  // side posts
  ctx.fillStyle = '#2d1749';
  ctx.fillRect(arena.left - 9 * S, arena.top, 9 * S, floorY - arena.top);
  ctx.fillRect(arena.right, arena.top, 9 * S, floorY - arena.top);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5 * S;
  ctx.strokeRect(arena.left - 9 * S, arena.top, 9 * S, floorY - arena.top);
  ctx.strokeRect(arena.right, arena.top, 9 * S, floorY - arena.top);

  // top bar
  ctx.fillStyle = '#2d1749';
  ctx.fillRect(arena.left - 9 * S, arena.top - 11 * S, aw + 18 * S, 12 * S);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5 * S;
  ctx.strokeRect(arena.left - 9 * S, arena.top - 11 * S, aw + 18 * S, 12 * S);
  ctx.fillStyle = 'rgba(255,244,216,.35)';
  ctx.fillRect(arena.left - 9 * S, arena.top - 11 * S, aw + 18 * S, 2.5 * S);

  // bolts
  for (const x of [arena.left + aw * 0.25, arena.left + aw * 0.75]) {
    ctx.beginPath(); ctx.arc(x, arena.top - 5 * S, 3.5 * S, 0, TAU);
    ctx.fillStyle = '#ffd23f'; ctx.fill();
    ctx.lineWidth = 1.5 * S; ctx.strokeStyle = INK; ctx.stroke();
  }

  // bunting
  const n = Math.max(8, Math.floor(aw / (46 * S)));
  const colors = ['#ff5d5d', '#ffd23f', '#2ec4b6', '#ff8fab', '#fff4d8'];
  const y0 = arena.top - 8 * S;
  for (let i = 0; i < n; i++) {
    const x = arena.left + (i + 0.5) * aw / n;
    const wob = Math.sin(t * 1.1 + i * 0.8) * 1.3 * S;
    ctx.beginPath();
    ctx.moveTo(x - 9 * S, y0 + wob);
    ctx.lineTo(x + 9 * S, y0 + wob);
    ctx.lineTo(x + 1.5 * S, y0 + 22 * S + wob);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.lineWidth = 1.8 * S; ctx.strokeStyle = INK; ctx.stroke();
  }
}

function drawFloor(t) {
  // apron
  ctx.fillStyle = '#1d1030';
  ctx.fillRect(0, floorY, W, H - floorY);
  const grad = ctx.createLinearGradient(0, floorY, 0, H);
  grad.addColorStop(0, 'rgba(70,38,105,.75)');
  grad.addColorStop(0.5, 'rgba(30,15,50,.4)');
  grad.addColorStop(1, 'rgba(14,6,26,.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, floorY, W, H - floorY);

  // lip
  ctx.fillStyle = INK;
  ctx.fillRect(0, floorY - 3 * S, W, 8 * S);
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, floorY - 4 * S, W, 2 * S);

  // checker strip
  const stripY = floorY + 5 * S;
  const stripH = Math.min(22 * S, (H - floorY) * 0.34);
  const tile = 26 * S;
  for (let x = -tile; x < W + tile; x += tile) {
    for (let r = 0; r < 2; r++) {
      ctx.fillStyle = (Math.round(x / tile) + r) % 2 === 0 ? '#ff8a5c' : '#ffe3a1';
      ctx.fillRect(x, stripY + r * stripH / 2, tile, stripH / 2 + 0.5);
    }
  }
  ctx.fillStyle = 'rgba(36,19,53,.15)';
  ctx.fillRect(0, stripY, W, stripH);

  // stage bulbs
  const bulbY = floorY + 9 * S;
  for (let x = 36 * S; x < W; x += 84 * S) {
    const glow = 0.55 + 0.45 * Math.sin(t * 2.2 + x * 0.02);
    ctx.beginPath(); ctx.arc(x, bulbY, 4.5 * S, 0, TAU);
    ctx.fillStyle = withA('#ffd23f', 0.25 + glow * 0.6); ctx.fill();
    ctx.lineWidth = 1.5 * S; ctx.strokeStyle = 'rgba(36,19,53,.7)'; ctx.stroke();
  }

}

function drawPlatforms(t) {
  for (const p of platforms) {
    // short hanging chains under the ends (no ceiling clutter)
    for (const fx of [0.16, 0.84]) {
      const x = p.x + p.w * fx;
      const topY = p.y + p.h;
      ctx.strokeStyle = 'rgba(36,19,53,.42)';
      ctx.lineWidth = 2.4 * S;
      ctx.beginPath(); ctx.moveTo(x, topY - 1); ctx.lineTo(x, topY + 6 * S); ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const cy = topY + (11 + k * 11) * S + Math.sin(t * 1.8 + k * 0.7 + p.x * 0.01) * 0.7 * S;
        ctx.beginPath();
        ctx.ellipse(x, cy, 2.4 * S, 5.2 * S, 0, 0, TAU);
        ctx.strokeStyle = k === 2 ? 'rgba(36,19,53,.24)' : 'rgba(36,19,53,.32)';
        ctx.lineWidth = 1.6 * S;
        ctx.stroke();
      }
    }

    // ground shadow
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h + 6 * S, p.w * 0.44, 5.5 * S, 0, 0, TAU);
    ctx.fillStyle = 'rgba(14,6,26,.26)'; ctx.fill();

    // body
    rr(ctx, p.x, p.y, p.w, p.h, 5 * S);
    ctx.fillStyle = '#e2ab60'; ctx.fill();
    ctx.lineWidth = 3.5 * S; ctx.strokeStyle = INK; ctx.stroke();

    // lower shade
    ctx.save();
    rr(ctx, p.x, p.y, p.w, p.h, 5 * S);
    ctx.clip();
    ctx.fillStyle = 'rgba(128,76,32,.22)';
    ctx.fillRect(p.x, p.y + p.h * 0.58, p.w, p.h);
    // top surface
    ctx.fillStyle = '#ffe0a0';
    ctx.fillRect(p.x, p.y + 1, p.w, 5 * S);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(p.x + 2 * S, p.y + 1.5 * S, p.w - 4 * S, 1.6 * S);
    // plank seams
    ctx.strokeStyle = 'rgba(120,72,30,.42)';
    ctx.lineWidth = 1.6 * S;
    const step = Math.max(30 * S, p.w / 4);
    for (let x = p.x + step; x < p.x + p.w - 4 * S; x += step) {
      ctx.beginPath(); ctx.moveTo(x, p.y + 7 * S); ctx.lineTo(x, p.y + p.h - 3 * S); ctx.stroke();
    }
    // hazard tab
    const hw = Math.min(32 * S, p.w * 0.24);
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(p.x + p.w / 2 - hw / 2, p.y + p.h - 6.5 * S, hw, 3 * S);
    ctx.fillStyle = 'rgba(255,244,216,.5)';
    ctx.fillRect(p.x + p.w / 2 - hw / 2, p.y + p.h - 6.5 * S, hw, 1 * S);
    ctx.restore();

    // corner bolts
    for (const bx of [p.x + 6.5 * S, p.x + p.w - 6.5 * S]) {
      ctx.beginPath(); ctx.arc(bx, p.y + p.h * 0.5, 2.2 * S, 0, TAU);
      ctx.fillStyle = '#6b4a2c'; ctx.fill();
      ctx.beginPath(); ctx.arc(bx - 0.6 * S, p.y + p.h * 0.5 - 0.6 * S, 0.8 * S, 0, TAU);
      ctx.fillStyle = 'rgba(255,244,216,.5)'; ctx.fill();
    }
  }
}

function drawPickups(t) {
  for (const pk of pickups) {
    const bob = Math.sin(t * 3 + pk.ph) * 4 * S;
    const y = pk.y + bob;
    ctx.save();
    ctx.translate(pk.x, y);
    ctx.beginPath(); ctx.ellipse(0, 24 * S, 10 * S, 3.5 * S, 0, 0, TAU);
    ctx.fillStyle = 'rgba(14,6,26,.25)'; ctx.fill();
    const pulse = 1 + Math.sin(t * 6 + pk.ph) * 0.06;
    ctx.scale(pulse, pulse);
    if (pk.type === 'chicken') {
      // chicken feed / corn
      ctx.beginPath(); ctx.ellipse(0, 0, 9 * S, 13 * S, 0, 0, TAU);
      ctx.fillStyle = '#ffe066'; ctx.fill();
      ctx.lineWidth = 3 * S; ctx.strokeStyle = INK; ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        for (let j = -3; j <= 3; j++) {
          ctx.beginPath(); ctx.arc(i * 3.2 * S, j * 3.2 * S, 1.5 * S, 0, TAU);
          ctx.fillStyle = '#ffb703'; ctx.fill();
        }
      }
      ctx.beginPath();
      ctx.moveTo(-9 * S, 6 * S); ctx.lineTo(-14 * S, 14 * S); ctx.lineTo(-4 * S, 10 * S);
      ctx.moveTo(9 * S, 6 * S); ctx.lineTo(14 * S, 14 * S); ctx.lineTo(4 * S, 10 * S);
      ctx.fillStyle = '#7bc96f'; ctx.fill();
      ctx.lineWidth = 2 * S; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    } else if (pk.type === 'shield') {
      ctx.beginPath(); ctx.arc(0, 0, 12 * S, 0, TAU);
      ctx.fillStyle = 'rgba(125,211,252,.35)'; ctx.fill();
      ctx.lineWidth = 3 * S; ctx.strokeStyle = '#0ea5e9'; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -14 * S); ctx.lineTo(10 * S, -6 * S); ctx.lineTo(10 * S, 6 * S);
      ctx.lineTo(0, 14 * S); ctx.lineTo(-10 * S, 6 * S); ctx.lineTo(-10 * S, -6 * S);
      ctx.closePath();
      ctx.fillStyle = '#e0f2fe'; ctx.fill();
      ctx.lineWidth = 2.5 * S; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    } else {
      heartPath(ctx, 0, 0, 14 * S);
      ctx.fillStyle = '#ff5d5d'; ctx.fill();
      ctx.lineWidth = 3 * S; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-5 * S, -5 * S, 3 * S, 5 * S, -0.6, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
      ctx.restore();
    }
  }
}

function heartPath(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y + r * 0.75);
  g.bezierCurveTo(x - r * 1.25, y - r * 0.15, x - r * 0.6, y - r * 1.05, x, y - r * 0.42);
  g.bezierCurveTo(x + r * 0.6, y - r * 1.05, x + r * 1.25, y - r * 0.15, x, y + r * 0.75);
  g.closePath();
}

function drawBalls() {
  for (const b of balls) {
    const color = b.wcolor || (b.owner >= 0 ? P_COLORS[b.owner] : '#f7f3e4');
    // trail
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const nx = b.vx / sp, ny = b.vy / sp;
    for (let i = 1; i <= 6; i++) {
      const f = i / 7;
      ctx.beginPath();
      ctx.arc(b.x - nx * i * b.r * 0.9, b.y - ny * i * b.r * 0.9, b.r * (1 - f * 0.7), 0, TAU);
      ctx.fillStyle = withA(color, 0.12 * (1 - f));
      ctx.fill();
    }
    // glow
    if (b.charge > 0.4) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.8 + Math.sin(gameT * 10) * 0.12), 0, TAU);
      ctx.fillStyle = withA(color, 0.12); ctx.fill();
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU);
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = Math.max(2, b.r * 0.22); ctx.strokeStyle = INK; ctx.stroke();
    // weapon mark
    ctx.save();
    ctx.rotate(-b.rot);
    const shape = b.wshape || 'ball';
    if (shape === 'star') {
      starPath(ctx, b.r * 0.55, b.r * 0.22, 5);
      ctx.fillStyle = withA(CREAM, 0.9); ctx.fill();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0, -b.r * 0.55); ctx.lineTo(b.r * 0.55, 0); ctx.lineTo(0, b.r * 0.55); ctx.lineTo(-b.r * 0.55, 0);
      ctx.closePath(); ctx.fillStyle = withA(CREAM, 0.85); ctx.fill();
    } else if (shape === 'ring') {
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.42, 0, TAU);
      ctx.lineWidth = b.r * 0.22; ctx.strokeStyle = withA(INK, 0.85); ctx.stroke();
    } else if (shape === 'egg') {
      ctx.beginPath(); ctx.ellipse(0, 0, b.r * 0.5, b.r * 0.62, 0, 0, TAU);
      ctx.fillStyle = withA(CREAM, 0.75); ctx.fill();
    } else if (shape === 'feather') {
      ctx.strokeStyle = withA(INK, 0.8); ctx.lineWidth = b.r * 0.18;
      ctx.beginPath(); ctx.moveTo(0, -b.r * 0.55); ctx.quadraticCurveTo(b.r * 0.35, 0, 0, b.r * 0.55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -b.r * 0.55); ctx.quadraticCurveTo(-b.r * 0.35, 0, 0, b.r * 0.55); ctx.stroke();
    } else if (shape === 'blob') {
      ctx.fillStyle = withA(CREAM, 0.35);
      ctx.beginPath(); ctx.arc(-b.r * 0.15, -b.r * 0.1, b.r * 0.35, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // stripes (keep subtle)
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, b.r - 1, 0, TAU); ctx.clip();
    ctx.strokeStyle = withA(CREAM, 0.55);
    ctx.lineWidth = b.r * 0.32;
    ctx.beginPath(); ctx.arc(0, 0, b.r * 0.72, -1.02, 1.02); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, b.r * 0.72, Math.PI - 1.02, Math.PI + 1.02); ctx.stroke();
    if (b.owner < 0) {
      ctx.strokeStyle = 'rgba(255,93,93,.85)';
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.72, Math.PI * 0.5 - 0.6, Math.PI * 0.5 + 0.6); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(-b.r * 0.32, -b.r * 0.36, b.r * 0.22, b.r * 0.14, -0.6, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
    ctx.restore();
  }
}

function drawAimPreviews() {
  if (state !== 'play') return;
  for (const p of players) {
    if (!p.charging || p.ko) continue;
    const plan = throwPlan(p, p.charge);
    const color = playerColor(p);
    const g = ballGravityFor();
    const steps = 15;
    const dt = plan.T / steps;
    let x = plan.hand.x, y = plan.hand.y;
    let vx = plan.vx, vy = plan.vy;
    ctx.save();
    for (let i = 1; i <= steps; i++) {
      x += vx * dt;
      y += vy * dt;
      vy += g * dt;
      if (x < arena.left || x > arena.right || y > floorY || y < arena.top) break;
      const a = (1 - i / steps) * 0.65;
      ctx.beginPath();
      ctx.arc(x, y, (2.2 + (i / steps) * 1.6) * S, 0, TAU);
      ctx.fillStyle = withA(color, a);
      ctx.fill();
    }
    // target reticle
    const tx = plan.tx, ty = plan.ty;
    ctx.strokeStyle = withA(color, 0.45);
    ctx.lineWidth = 1.8 * S;
    ctx.beginPath(); ctx.arc(tx, ty, 13 * S, 0, TAU); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(a) * 17 * S, ty + Math.sin(a) * 17 * S);
      ctx.lineTo(tx + Math.cos(a) * 22 * S, ty + Math.sin(a) * 22 * S);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = clamp(p.life / p.max, 0, 1) * p.alpha;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    if (p.kind === 'star') {
      ctx.rotate(p.rot);
      starPath(ctx, p.size, p.size * 0.45, 5);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(36,19,53,.35)'; ctx.stroke();
    } else if (p.kind === 'rect') {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
    } else if (p.kind === 'ring') {
      ctx.beginPath(); ctx.arc(0, 0, p.size * (1 + (1 - p.life / p.max) * 1.8), 0, TAU);
      ctx.strokeStyle = p.color; ctx.lineWidth = 2.5 * S * a; ctx.stroke();
    } else if (p.kind === 'spark') {
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -1.2, p.size * 2.2, 2.4);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, p.size, 0, TAU);
      ctx.fillStyle = p.color; ctx.fill();
    }
    ctx.restore();
  }
}

function drawFloaters() {
  for (const f of floaters) {
    const k = f.life / f.max;
    const pop = k > 0.75 ? lerp(1.35, 1, (1 - k) / 0.25) : 1;
    ctx.save();
    ctx.globalAlpha = clamp(k * 2.4, 0, 1);
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(pop, pop);
    outlineText(ctx, f.text, 0, 0, f.size, f.color, INK, Math.max(4, f.size * 0.22));
    ctx.restore();
  }
}

function drawAmbientConfetti(t) {
  for (const c of ambientConfetti) {
    const y = arena.top + ((c.y - arena.top + t * c.vy) % (floorY - arena.top));
    const x = c.x + Math.sin(t * 0.8 + c.ph) * 14 + t * c.vx;
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.translate(((x % (W + 40)) + W + 40) % (W + 40) - 20, y);
    ctx.rotate(c.rot + t * c.spin);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.w * 0.25, c.w, c.w * 0.5);
    ctx.restore();
  }
}

function drawScene(t) {
  drawSky(t);
  drawCity(t);
  drawFence(t);
  drawArenaFrame(t);
  drawFloor(t);
  drawPlatforms(t);
  drawPickups(t);
  drawAimPreviews();
  drawBalls();
  for (const p of players) drawPlayer(p, t);
  drawParticles();
  drawFloaters();
  drawAmbientConfetti(t);

  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, W, H);
}

/* ------------------------------ portraits ------------------------------ */
function renderPortrait(canvas, charId, color) {
  const c = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);
  const ch = CHAR_BY_ID[charId] || CHARS[0];
  c.save();
  c.translate(w / 2, h * 0.985);
  const scale = (w / 112) * 1.02;
  drawCharacter(c, ch, {
    scale, facing: 1, t: performance.now() / 1000, phase: 0, run: 0,
    onGround: true, showBall: true, ballRadius: 8, color: color || P1C,
    charging: false, throwAnim: 0, catchAnim: 0, hurt: 0, ko: false,
    lookX: 0.2, lookY: 0, blink: false, aim: 1,
  });
  c.restore();
}
