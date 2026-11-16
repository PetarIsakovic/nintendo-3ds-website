/* Small games for the console's Games menu. Each one draws itself into any W x H area of a 2D canvas, so the same code runs on
   the desktop console's top screen and full screen on a phone.

   make(env) returns a game:  resize(W, H)  reset()  step(dt)  draw(c, t)  key(k)  pointer(type, x, y)  hud() -> [left, right]
   optional: release(k) when a held button is let go ('ptr' for the pointer, 'all' for everything)
   key names: up down left right a.  pointer types: down move up (in the game's own pixels).
   env: pic(name) -> loaded image or null,  load(id) / save(id, n) for best scores,  touch (true on phones),  buzz(). */
(() => {
  'use strict';
  const INK = '#2a2d33', MUTE = '#7a808a', ACC = '#1aa3b3', DEEP = '#0e7f8d', RED = '#e0584d', BG = '#f3f5f8', BG2 = '#e9ecf1', GOLD = '#f2b632';
  const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  const rr = (c, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const font = (c, w, px) => { c.font = `${w} ${Math.round(px)}px ${FONT}`; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fit = (c, im, cx, cy, w, h) => { if (!im) return false; const s = Math.min(w / im.naturalWidth, h / im.naturalHeight); c.drawImage(im, cx - im.naturalWidth * s / 2, cy - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); return true; };
  // the card shown before a game starts and after it ends
  function banner(c, W, H, title, sub, env, dim) {
    if (dim) { c.fillStyle = 'rgba(243,245,248,.86)'; c.fillRect(0, 0, W, H); }
    const s = Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400));
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = INK; font(c, 700, 40 * s); c.fillText(title, W / 2, H / 2 - 6 * s);
    c.fillStyle = MUTE; font(c, 500, 17 * s);
    String(sub).split('\n').forEach((ln, i) => c.fillText(ln, W / 2, H / 2 + 28 * s + i * 24 * s));
    c.textAlign = 'left';
  }
  const startWord = (env) => (env.touch ? 'Tap to start' : 'Press A to start');
  const againWord = (env) => (env.touch ? 'Tap to play again' : 'Press A to play again');

  /* ---------------- Goose Kart ----------------
     The road engine (segments, curves, hills, projection, fog) is adapted from javascript-racer by Jake Gordon:
     https://github.com/jakesgordon/javascript-racer, MIT licence, Copyright (c) 2012-2016 Jake Gordon and contributors.
     Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
     files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
     modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
     is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be
     included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
     The karts, scenery and everything else here are drawn in code; none of that project's art or music is used. */
  const KART_COLS = ['#1aa3b3', '#e0584d', '#f2b632', '#4cb782', '#7b61c9', '#3b4a9a'];
  function drawKart(c, col) { // a Canada goose driving a kart, seen from behind, in an 80 x 60 box
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(40, 56, 38, 4.5, 0, 0, 7); c.fill();
    c.fillStyle = '#25272c'; rr(c, 3, 33, 17, 23, 4); c.fill(); rr(c, 60, 33, 17, 23, 4); c.fill();
    c.fillStyle = '#41444c'; for (let i = 0; i < 4; i++) { c.fillRect(5, 36 + i * 5, 13, 2); c.fillRect(62, 36 + i * 5, 13, 2); }
    c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(40, 23, 15, 10, 0, 0, 7); c.fill();
    c.fillStyle = '#6e604f'; c.beginPath(); c.ellipse(40, 26, 11, 5.5, 0, 0, 7); c.fill();
    c.fillStyle = '#1f2024'; rr(c, 36.5, 3, 7, 19, 3.5); c.fill(); c.beginPath(); c.ellipse(40, 5.5, 6, 5.5, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(34.6, 7.5, 1.5, 3, 0.3, 0, 7); c.fill(); c.beginPath(); c.ellipse(45.4, 7.5, 1.5, 3, -0.3, 0, 7); c.fill();
    c.fillStyle = col; rr(c, 11, 31, 58, 19, 6); c.fill();
    c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, 14, 33, 52, 4, 2); c.fill();
    c.fillStyle = '#2a2d33'; rr(c, 15, 45, 50, 7, 3); c.fill();
    c.fillStyle = '#ff7a6b'; rr(c, 18, 40, 7, 3, 1.5); c.fill(); rr(c, 55, 40, 7, 3, 1.5); c.fill();
    c.fillStyle = '#2a2d33'; rr(c, 22, 27, 3, 6, 1); c.fill(); rr(c, 55, 27, 3, 6, 1); c.fill(); rr(c, 13, 25, 54, 4.5, 2.2); c.fill();
  }
  function kart(env) {
    const SEG = 200, RUMBLE = 3, LANES = 3, ROADW = 2000, CAMH = 1000, DEPTH = 1 / Math.tan(50 * Math.PI / 180), PZ = CAMH * DEPTH;
    const STEP = 1 / 60, MAXV = SEG / STEP, ACC = MAXV / 5, BRAKE = -MAXV, DEC = -MAXV / 5, OFFDEC = -MAXV / 2, OFFLIM = MAXV / 4, CENT = 0.22, LAPS = 3;
    const SCALE = 0.3 / 80, PW = 80 * SCALE, FOG = '#d4ecf1';
    const LIGHT = { road: '#73777f', grass: '#86c77c', rumble: '#ffffff', lane: '#e9eef2' }, DARK = { road: '#6d7179', grass: '#78bb6f', rumble: '#e0584d' };
    const lerp = (a, b, p) => a + (b - a) * p;
    const overlap = (x1, w1, x2, w2, pc) => { const h = (pc || 1) / 2; return !(x1 + w1 * h < x2 - w2 * h || x1 - w1 * h > x2 + w2 * h); };
    const ord = (n) => n + (['th', 'st', 'nd', 'rd'][n] || 'th');
    const fmt = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };

    // ---- sprites, painted once into small canvases (sizes are in the engine's sprite units; a kart is 80 wide)
    const sprite = (w, h, res, paint, needs) => ({ w, h, res, paint, needs, img: null, ok: false });
    const ready = (s) => {
      if (s.img && (s.ok || !env.pic(s.needs))) return s.img; // (one that shows a sticker is painted again once the sticker has loaded)
      const cv = document.createElement('canvas'); cv.width = Math.ceil(s.w * s.res); cv.height = Math.ceil(s.h * s.res);
      const x = cv.getContext('2d'); x.scale(s.res, s.res); s.paint(x); s.img = cv; s.ok = !s.needs || !!env.pic(s.needs); return cv;
    };
    const KART = KART_COLS.map((col) => sprite(80, 60, 4, (x) => drawKart(x, col)));
    const BOX = sprite(70, 70, 3, (x) => {
      const g = x.createLinearGradient(0, 0, 70, 70); g.addColorStop(0, '#ffd66b'); g.addColorStop(1, '#f2a632');
      x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(35, 67, 26, 3, 0, 0, 7); x.fill();
      x.fillStyle = g; rr(x, 6, 2, 58, 58, 12); x.fill(); x.lineWidth = 3; x.strokeStyle = '#fff'; rr(x, 9, 5, 52, 52, 10); x.stroke();
      x.fillStyle = '#fff'; font(x, 800, 40); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 35, 33); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    });
    const PINE = sprite(170, 320, 1, (x) => {
      x.fillStyle = '#7a5a3c'; x.fillRect(76, 250, 18, 70);
      [['#2f7d4f', 0, 150], ['#3a8f5a', 70, 125], ['#47a266', 135, 95]].forEach(([c, y, w]) => { x.fillStyle = c; x.beginPath(); x.moveTo(85, y); x.lineTo(85 + w / 2 + 10, y + 150); x.lineTo(85 - w / 2 - 10, y + 150); x.closePath(); x.fill(); });
      x.fillStyle = '#2f7d4f'; x.beginPath(); x.moveTo(85, 120); x.lineTo(170, 268); x.lineTo(0, 268); x.closePath(); x.fill();
    });
    const TREE = sprite(260, 290, 1, (x) => {
      x.fillStyle = '#7a5a3c'; x.fillRect(116, 170, 28, 120);
      [[130, 110, 95, '#4c9e5c'], [72, 140, 62, '#58ad67'], [190, 140, 62, '#58ad67'], [130, 70, 70, '#66bb72'], [100, 120, 50, '#6cc277']].forEach(([cx, cy, r, c]) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); });
    });
    const BUSH = sprite(210, 120, 1, (x) => { [[60, 80, 50, '#4c9e5c'], [150, 80, 50, '#4c9e5c'], [105, 60, 60, '#5cb06a'], [150, 55, 30, '#e0584d']].forEach(([cx, cy, r, c], i) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, i === 3 ? 7 : r, 0, 7); x.fill(); }); });
    const ROCK = sprite(180, 120, 1, (x) => { x.fillStyle = '#9097a3'; x.beginPath(); x.moveTo(10, 120); x.lineTo(30, 50); x.lineTo(80, 10); x.lineTo(140, 30); x.lineTo(172, 120); x.closePath(); x.fill(); x.fillStyle = '#b4bac4'; x.beginPath(); x.moveTo(40, 55); x.lineTo(80, 18); x.lineTo(120, 34); x.lineTo(70, 60); x.closePath(); x.fill(); });
    const GOOSE = sprite(120, 120, 2, (x) => { if (!fit(x, env.pic('goose'), 60, 60, 120, 120)) { x.fillStyle = '#fff'; x.beginPath(); x.arc(60, 70, 40, 0, 7); x.fill(); } }, 'goose');
    const board = (k, txt) => sprite(300, 220, 1.2, (x) => {
      x.fillStyle = '#4a4f59'; x.fillRect(70, 120, 14, 100); x.fillRect(216, 120, 14, 100);
      x.fillStyle = DEEP; rr(x, 0, 0, 300, 140, 14); x.fill(); x.fillStyle = '#fff'; rr(x, 8, 8, 284, 124, 9); x.fill();
      if (!(k && fit(x, env.pic(k), 150, 70, 250, 104))) { x.fillStyle = INK; font(x, 800, 42); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 150, 72); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; }
    }, k);
    const BOARDS = [board(null, 'GO GEESE!'), board('waterloo', ''), board('github', ''), board(null, 'HONK!'), board('t_react', ''), board('mlh', ''), board(null, 'LAP IT UP')];

    // ---- the track
    let segs = [];
    const lastY = () => (segs.length ? segs[segs.length - 1].p2.y : 0);
    const addSeg = (curve, y) => { const n = segs.length; segs.push({ i: n, p1: { y: lastY(), z: n * SEG }, p2: { y, z: (n + 1) * SEG }, curve, spr: [], items: [], col: Math.floor(n / RUMBLE) % 2 ? DARK : LIGHT }); };
    const easeIn = (a, b, p) => a + (b - a) * p * p, easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
    const road = (enter, hold, leave, curve, y) => {
      const sY = lastY(), eY = sY + (y || 0) * SEG, tot = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(sY, eY, n / tot));
      for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(sY, eY, (enter + n) / tot));
      for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(sY, eY, (enter + hold + n) / tot));
    };
    road(25, 25, 25, 0, 0);
    road(25, 25, 25, 0, 10); road(25, 25, 25, 0, -20); road(25, 25, 25, 2, 20); road(25, 25, 25, -2, 10);
    road(50, 50, 50, 4, 20);
    [5, -2, -5, 8, 5, -7, 5, -2].slice(0, 4).forEach((b) => road(10, 10, 10, 0, b));
    road(50, 50, 50, -4, 0);
    road(50, 50, 50, 0, 50);
    road(100, 100, 100, 3, -20);
    road(50, 50, 50, -2, 30);
    road(50, 50, 50, 4, 0);
    road(60, 60, 60, -2, -lastY() / SEG);
    const N = segs.length, L = N * SEG, LINE = 34, LINEZ = LINE * SEG;
    segs[LINE].col = { check: 0, grass: '#86c77c', rumble: '#fff' }; segs[LINE + 1].col = { check: 1, grass: '#86c77c', rumble: '#fff' };
    for (let n = 6; n < N; n += 3) { const r = Math.random(), s = r < 0.35 ? PINE : r < 0.62 ? TREE : r < 0.85 ? BUSH : ROCK; segs[n].spr.push({ s, x: (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 2.8) }); }
    for (let n = LINE + 30, k = 0; n < N - 20; n += 95, k++) segs[n].spr.push({ s: BOARDS[k % BOARDS.length], x: k % 2 ? 1.25 : -1.25 });
    for (let n = 20; n < N; n += 47) segs[n].spr.push({ s: GOOSE, x: (n % 2 ? 1 : -1) * (1.2 + Math.random() * 0.5) });
    const BOXES = [];
    [0.22, 0.5, 0.78].forEach((f) => { const s = segs[Math.floor(N * f)]; [-0.55, 0, 0.55].forEach((x) => { const it = { x, t: 0 }; s.items.push(it); BOXES.push(it); }); });
    const wrap = (z) => ((z % L) + L) % L;
    const segAt = (z) => segs[Math.floor(wrap(z) / SEG) % N];

    // ---- the race
    let W = 400, H = 300, YK = 150, HZ = 150, DRAW = 200;
    let state, cd, goT, P, X, v, steer, time, item, itemT, boost, honkT, bumpT, lapT, lapMsg, place, newBest, rivals, acc = 0, skyOff = 0, hillOff = 0, treeOff = 0;
    let best = env.load('kart');
    const held = { left: false, right: false, down: false };
    let ptr = 0, pdown = false;
    const progress = () => P - LINEZ;
    const lapOf = () => Math.max(1, Math.min(LAPS, Math.floor(progress() / L) + 1));
    function start() { if (state === 'over') g.reset(); state = 'count'; cd = 3; env.buzz(); }
    function useItem() {
      if (state !== 'race' || !item) return;
      if (item === 'boost') boost = 1.6;
      else { honkT = 0.9; for (const r of rivals) { const dz = r.d - P; if (dz > -SEG * 8 && dz < SEG * 45) r.stun = 1.7; } }
      item = null; env.buzz();
    }
    function moveRival(r, dt) {
      if (r.stun > 0) r.stun -= dt;
      let tv = MAXV * r.top; const gap = r.d - P;
      if (gap > L * 0.04) tv *= 0.9; else if (gap < -L * 0.04) tv *= 1.07; // they wait a little for you, and catch up a little
      if (r.stun > 0) tv *= 0.3; if (state === 'count' || state === 'ready') tv = 0; if (r.fin) tv = MAXV * 0.45;
      r.v = r.v < tv ? Math.min(tv, r.v + ACC * r.top * dt) : r.v + (tv - r.v) * Math.min(1, dt * 3); // they pick up speed the way you do
      r.d += r.v * dt; r.z = wrap(r.d);
      if ((r.wait -= dt) <= 0) { r.tx = rnd(-0.6, 0.6); r.wait = rnd(2, 4); }
      let tx = r.tx; // steer round whoever is just ahead and in the way
      for (const o of rivals.concat([{ d: P, x: X, v }])) if (o !== r) { const dz = o.d - r.d; if (dz > 0 && dz < SEG * 8 && Math.abs(o.x - r.x) < 0.38 && r.v > o.v * 0.97) { tx = o.x > 0 ? o.x - 0.55 : o.x + 0.55; break; } }
      const d = clamp(tx - r.x, -dt * 0.9, dt * 0.9); r.x = clamp(r.x + d, -0.85, 0.85); r.tilt = Math.abs(d) > dt * 0.3 ? Math.sign(d) * 0.05 : 0;
      if (!r.fin && r.d - LINEZ >= LAPS * L) r.fin = time || 1;
    }
    function tick(dt) {
      for (const it of BOXES) if (it.t > 0) it.t -= dt;
      if (bumpT > 0) bumpT -= dt; if (honkT > 0) honkT -= dt; if (goT > 0) goT -= dt; if (lapT > 0) lapT -= dt; itemT += dt;
      if (state === 'count') { cd -= dt; if (cd <= 0) { state = 'race'; goT = 0.8; env.buzz(); } }
      for (const r of rivals) moveRival(r, dt);
      if (state === 'ready' || state === 'count') return;
      if (state === 'race') time += dt;
      const ps = segAt(P), pc = v / MAXV, done = state === 'over', prevP = P;
      steer = done ? 0 : (held.left || ptr < 0 ? -1 : 0) + (held.right || ptr > 0 ? 1 : 0);
      X += steer * dt * 2.2 * Math.min(1, pc); X -= dt * 2 * pc * pc * ps.curve * CENT; // the curve throws you wide; steer against it
      if (done) X += (0 - X) * dt;
      const top = boost > 0 ? MAXV * 1.3 : MAXV;
      if (done) v = Math.max(MAXV * 0.4, v + DEC * dt);
      else if (held.down) v += BRAKE * dt;
      else if (v < top) v = Math.min(top, v + (boost > 0 ? ACC * 3 : ACC) * dt);
      else v += DEC * dt * 2;
      if (boost > 0) boost -= dt;
      if (Math.abs(X) > 1) { // off the road: slower, and the scenery is solid
        if (v > OFFLIM) v += OFFDEC * dt;
        for (const o of ps.spr) { const sw = o.s.w * SCALE; if (overlap(X, PW, o.x + sw / 2 * (o.x > 0 ? 1 : -1), sw)) { v = MAXV / 5; P -= wrap(P) % SEG; X -= Math.sign(X) * 0.08; if (bumpT <= 0) env.buzz(); bumpT = 0.4; break; } }
      }
      for (const r of rivals) { // bumping into the other karts
        let dz = r.z - wrap(P); if (dz > L / 2) dz -= L; if (dz < -L / 2) dz += L;
        if (Math.abs(dz) < SEG * 0.9 && overlap(X, PW, r.x, PW, 0.85)) {
          if (dz > 0 && v > r.v) v = r.v * 0.85; else if (dz <= 0 && r.v > v) r.v = v * 0.9;
          const push = (X > r.x ? 1 : -1) * 0.035; X += push; r.x -= push; if (bumpT <= 0) env.buzz(); bumpT = 0.35;
        }
      }
      X = clamp(X, -2.6, 2.6); v = clamp(v, 0, MAXV * 1.3);
      P += v * dt;
      for (let k = Math.floor(prevP / SEG); k <= Math.floor(P / SEG); k++) for (const it of segs[((k % N) + N) % N].items) // the item boxes
        if (it.t <= 0 && Math.abs(it.x - X) < 0.3) { it.t = 4; if (!item && !done) { item = Math.random() < 0.6 ? 'boost' : 'honk'; itemT = 0; env.buzz(); } }
      const d = (P - prevP) / SEG; skyOff += 0.001 * ps.curve * d; hillOff += 0.002 * ps.curve * d; treeOff += 0.003 * ps.curve * d;
      if (!done) {
        const lp = Math.floor((prevP - LINEZ) / L), ln = Math.floor(progress() / L);
        if (ln > lp && ln >= 1 && ln < LAPS) { lapT = 1.6; lapMsg = ln === LAPS - 1 ? 'FINAL LAP' : 'LAP ' + (ln + 1); }
        place = 1 + rivals.filter((r) => r.fin || r.d > P).length;
        if (progress() >= LAPS * L) {
          state = 'over'; place = 1 + rivals.filter((r) => r.fin).length; const tt = Math.round(time * 10);
          newBest = !best || tt < best; if (newBest) { best = tt; env.save('kart', best); } env.buzz();
        }
      }
    }

    // ---- drawing
    const project = (p, cx, cy, cz) => { p.cy = p.y - cy; p.cz = p.z - cz; p.s = DEPTH / p.cz; p.sx = Math.round(W / 2 + p.s * -cx * W / 2); p.sy = Math.round(HZ - p.s * p.cy * YK); p.sw = Math.round(p.s * ROADW * W / 2); };
    const poly = (c, x1, y1, x2, y2, x3, y3, x4, y4, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.lineTo(x4, y4); c.closePath(); c.fill(); };
    function strip(c, x1, y1, w1, x2, y2, w2, fog, col) {
      const r1 = w1 / 6, r2 = w2 / 6, l1 = w1 / 32, l2 = w2 / 32;
      c.fillStyle = col.grass; c.fillRect(0, y2, W, y1 - y2);
      poly(c, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, col.rumble);
      poly(c, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, col.rumble);
      if (col.check !== undefined) { for (let i = 0; i < 8; i++) { const a = -1 + i / 4, b = a + 1 / 4; poly(c, x1 + w1 * a, y1, x1 + w1 * b, y1, x2 + w2 * b, y2, x2 + w2 * a, y2, (i + col.check) % 2 ? '#2a2d33' : '#ffffff'); } }
      else {
        poly(c, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, col.road);
        if (col.lane) { const a1 = w1 * 2 / LANES, a2 = w2 * 2 / LANES; for (let k = 1; k < LANES; k++) { const m1 = x1 - w1 + a1 * k, m2 = x2 - w2 + a2 * k; poly(c, m1 - l1 / 2, y1, m1 + l1 / 2, y1, m2 + l2 / 2, y2, m2 - l2 / 2, y2, col.lane); } }
      }
      if (fog < 1) { c.globalAlpha = 1 - fog; c.fillStyle = FOG; c.fillRect(0, y2, W, y1 - y2); c.globalAlpha = 1; }
    }
    function hills(c, off, base, amp, col, f1, f2, seed) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) { const u = x / W + off; c.lineTo(x, base - amp * (0.55 + 0.3 * Math.sin(u * 6.2832 * f1 + seed) + 0.15 * Math.sin(u * 6.2832 * f2 + seed * 2))); }
      c.lineTo(W, H); c.closePath(); c.fill();
    }
    function backdrop(c, pY) {
      const g = c.createLinearGradient(0, 0, 0, HZ); g.addColorStop(0, '#79c3dc'); g.addColorStop(1, '#dcf0f5'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 5; i++) { const x = (((i * 0.23 + skyOff) % 1 + 1) % 1) * W * 1.3 - W * 0.15, y = HZ * (0.16 + (i % 3) * 0.15), s = W * 0.028 * (1 + (i % 2));
        c.beginPath(); c.ellipse(x, y, s * 2, s * 0.7, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + s * 0.8, y - s * 0.4, s * 1.1, s * 0.75, 0, 0, 7); c.fill(); }
      hills(c, hillOff, HZ + 2 + pY * YK * 0.000008, YK * 0.3, '#a8d5c5', 2, 5, 1);
      hills(c, treeOff, HZ + 4 + pY * YK * 0.000014, YK * 0.15, '#8cc79c', 3, 7, 2);
    }
    function spr(c, s, sc, x, y, ox, oy, clip, rot) {
      if (!(sc > 0)) return;
      const w = s.w * sc * W / 2 * SCALE * ROADW, h = s.h * sc * W / 2 * SCALE * ROADW; if (w < 0.6 || w > W * 3) return;
      x += w * ox; y += h * oy;
      const ch = clip ? Math.max(0, y + h - clip) : 0; if (ch >= h) return;
      const im = ready(s), sh = im.height * (1 - ch / h);
      if (rot) { c.save(); c.translate(x + w / 2, y + h); c.rotate(rot); c.drawImage(im, 0, 0, im.width, sh, -w / 2, -h, w, h - ch); c.restore(); }
      else c.drawImage(im, 0, 0, im.width, sh, x, y, w, h - ch);
    }
    function scene(c, t) {
      const pos = wrap(P - PZ), base = segAt(pos), bp = (pos % SEG) / SEG, ps = segAt(pos + PZ), pp = (wrap(pos + PZ) % SEG) / SEG, pY = lerp(ps.p1.y, ps.p2.y, pp);
      backdrop(c, pY);
      let maxy = H, x = 0, dx = -(base.curve * bp);
      for (let n = 0; n < DRAW; n++) {
        const s = segs[(base.i + n) % N], loop = s.i < base.i ? L : 0;
        s.fog = 1 / Math.exp((n / DRAW) * (n / DRAW) * 5); s.clip = maxy;
        project(s.p1, X * ROADW - x, pY + CAMH, pos - loop); project(s.p2, X * ROADW - x - dx, pY + CAMH, pos - loop);
        x += dx; dx += s.curve;
        if (s.p1.cz <= DEPTH || s.p2.sy >= s.p1.sy || s.p2.sy >= maxy) continue;
        strip(c, s.p1.sx, s.p1.sy, s.p1.sw, s.p2.sx, s.p2.sy, s.p2.sw, s.fog, s.col);
        maxy = s.p1.sy;
      }
      const byS = new Map(); for (const r of rivals) { const k = Math.floor(r.z / SEG) % N; if (!byS.has(k)) byS.set(k, []); byS.get(k).push(r); }
      for (let n = DRAW - 1; n > 0; n--) {
        const s = segs[(base.i + n) % N];
        for (const o of s.spr) { const sc = s.p1.s; spr(c, o.s, sc, s.p1.sx + sc * o.x * ROADW * W / 2, s.p1.sy, o.x < 0 ? -1 : 0, -1, s.clip); }
        for (const it of s.items) if (it.t <= 0) { const sc = s.p1.s; spr(c, BOX, sc, s.p1.sx + sc * it.x * ROADW * W / 2, s.p1.sy - Math.abs(Math.sin(t * 3 + it.x * 2)) * sc * W * 6, -0.5, -1, s.clip); }
        const rs = byS.get(s.i);
        if (rs) for (const r of rs) { const pc = (r.z % SEG) / SEG, sc = lerp(s.p1.s, s.p2.s, pc); spr(c, KART[r.col], sc, lerp(s.p1.sx, s.p2.sx, pc) + sc * r.x * ROADW * W / 2, lerp(s.p1.sy, s.p2.sy, pc), -0.5, -1, s.clip, r.tilt + (r.stun > 0 ? Math.sin(t * 30) * 0.08 : 0)); }
        if (s === ps) {
          const sc = DEPTH / PZ, py = HZ - sc * lerp(ps.p1.cy, ps.p2.cy, pp) * YK, bounce = (v / MAXV) * rnd(-1, 1) * YK / 220 + (Math.abs(X) > 1 && v > 1 ? rnd(-2, 2) : 0);
          spr(c, KART[0], sc, W / 2, py + bounce, -0.5, -1, 0, steer * 0.06 + (bumpT > 0 ? Math.sin(t * 40) * 0.04 : 0));
          if (honkT > 0) { const k = clamp(Math.min(W, H) / 420, 0.7, 1.4); c.globalAlpha = Math.min(1, honkT * 3); c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 5 * k; font(c, 800, 30 * k); c.textAlign = 'center'; c.strokeText('HONK!', W / 2, py - W * 0.2 - (0.9 - honkT) * 30 * k); c.fillText('HONK!', W / 2, py - W * 0.2 - (0.9 - honkT) * 30 * k); c.textAlign = 'left'; c.globalAlpha = 1; }
        }
      }
      if (boost > 0) { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; for (let i = 0; i < 10; i++) { const a = rnd(0, 6.283), r0 = rnd(0.35, 0.5) * W, r1 = r0 + rnd(30, 80); c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, HZ + Math.sin(a) * r0 * 0.7); c.lineTo(W / 2 + Math.cos(a) * r1, HZ + Math.sin(a) * r1 * 0.7); c.stroke(); } }
    }
    function bolt(c, x, y, z) { c.fillStyle = GOLD; c.beginPath(); c.moveTo(x + z * 0.12, y - z * 0.5); c.lineTo(x - z * 0.3, y + z * 0.08); c.lineTo(x - z * 0.02, y + z * 0.08); c.lineTo(x - z * 0.14, y + z * 0.5); c.lineTo(x + z * 0.3, y - z * 0.1); c.lineTo(x + z * 0.02, y - z * 0.1); c.closePath(); c.fill(); }
    function horn(c, x, y, z) { c.fillStyle = RED; c.beginPath(); c.moveTo(x - z * 0.35, y - z * 0.12); c.lineTo(x - z * 0.1, y - z * 0.12); c.lineTo(x + z * 0.18, y - z * 0.35); c.lineTo(x + z * 0.18, y + z * 0.35); c.lineTo(x - z * 0.1, y + z * 0.12); c.lineTo(x - z * 0.35, y + z * 0.12); c.closePath(); c.fill();
      c.strokeStyle = RED; c.lineWidth = z * 0.07; c.lineCap = 'round'; for (const r of [0.3, 0.45]) { c.beginPath(); c.arc(x + z * 0.12, y, z * r, -0.6, 0.6); c.stroke(); } }
    const outline = (c, s, x, y, k) => { c.lineWidth = 4 * k; c.strokeStyle = 'rgba(30,34,40,.55)'; c.lineJoin = 'round'; c.strokeText(s, x, y); c.fillStyle = '#fff'; c.fillText(s, x, y); };
    function overlay(c, t) {
      const k = clamp(Math.min(W, H) / 400, 0.7, 1.4), m = 12 * k;
      c.textBaseline = 'alphabetic';
      font(c, 800, 15 * k); outline(c, 'LAP ' + lapOf() + '/' + LAPS, m, m + 15 * k, k);
      font(c, 700, 20 * k); outline(c, fmt(time), m, m + 39 * k, k);
      c.textAlign = 'right'; font(c, 800, 36 * k); outline(c, ord(place), W - m, m + 32 * k, k); font(c, 700, 13 * k); outline(c, 'of ' + (rivals.length + 1), W - m, m + 50 * k, k); c.textAlign = 'left';
      const z = 46 * k, bx = W / 2 - z / 2, by = m; // the item slot
      c.fillStyle = 'rgba(255,255,255,.82)'; rr(c, bx, by, z, z, 11 * k); c.fill(); c.lineWidth = 2; c.strokeStyle = item ? ACC : 'rgba(42,45,51,.25)'; c.stroke();
      if (item) { const p = Math.min(1, itemT * 6), zz = z * (0.6 + 0.4 * p); (item === 'boost' ? bolt : horn)(c, W / 2, by + z / 2, zz * 0.8);
        font(c, 700, 11 * k); c.textAlign = 'center'; outline(c, env.touch ? 'tap here' : 'press A', W / 2, by + z + 14 * k, k * 0.7); c.textAlign = 'left'; }
      const big = (s, a) => { c.globalAlpha = a; c.textAlign = 'center'; font(c, 800, 64 * k); c.lineWidth = 8 * k; c.strokeStyle = INK; c.strokeText(s, W / 2, HZ * 0.9); c.fillStyle = '#fff'; c.fillText(s, W / 2, HZ * 0.9); c.textAlign = 'left'; c.globalAlpha = 1; };
      if (state === 'count') big(String(Math.ceil(cd)), 1);
      if (goT > 0) big('GO!', Math.min(1, goT * 3));
      if (lapT > 0) { c.globalAlpha = Math.min(1, lapT * 2); c.textAlign = 'center'; font(c, 800, 30 * k); outline(c, lapMsg, W / 2, HZ * 0.8, k * 1.4); c.textAlign = 'left'; c.globalAlpha = 1; }
    }

    const g = {
      resize(w, h) { W = w; H = h; YK = Math.min(H * 0.5, W * 0.6); HZ = H * 0.9 - YK; DRAW = 200; },
      reset() {
        state = 'ready'; cd = 3; goT = 0; P = LINEZ - 18 * SEG; X = 0.45; v = 0; steer = 0; time = 0; item = null; itemT = 0; boost = 0; honkT = 0; bumpT = 0; lapT = 0; place = 6; newBest = false; acc = 0;
        rivals = [0.95, 0.93, 0.91, 0.89, 0.87].map((top, i) => ({ col: i + 1, top, d: LINEZ - (2 + i * 3.2) * SEG, x: i % 2 ? 0.45 : -0.45, v: 0, tx: i % 2 ? 0.45 : -0.45, wait: rnd(1.5, 3), stun: 0, tilt: 0, fin: 0 }));
        rivals.forEach((r) => { r.z = wrap(r.d); }); BOXES.forEach((b) => { b.t = 0; }); held.left = held.right = held.down = false; ptr = 0; pdown = false;
      },
      step(dt) { acc = Math.min(acc + dt, 0.1); while (acc >= STEP) { acc -= STEP; tick(STEP); } },
      draw(c, t) {
        scene(c, t);
        if (state !== 'ready') overlay(c, t);
        if (state === 'ready') banner(c, W, H, 'Goose Kart', env.touch ? 'Hold the left or right side to steer\nTap to start' : 'Left / right steers · Down brakes · A uses items\nPress A to start', env, true);
        if (state === 'over') banner(c, W, H, ord(place) + ' place', 'Time ' + fmt(time) + (newBest ? ' · new best!' : '') + '\n' + againWord(env), env, true);
      },
      key(k) {
        if (k === 'a') { if (state === 'ready' || state === 'over') start(); else useItem(); return true; }
        if (k in held) { held[k] = true; return true; }
        return k === 'up';
      },
      release(k) { if (k === 'all') { held.left = held.right = held.down = false; ptr = 0; pdown = false; } else if (k === 'ptr') { ptr = 0; pdown = false; } else if (k in held) held[k] = false; },
      pointer(type, x, y) {
        if (type === 'down') {
          if (state === 'ready' || state === 'over') { start(); return; }
          const z = 46 * clamp(Math.min(W, H) / 400, 0.7, 1.4); if (item && Math.abs(x - W / 2) < z * 0.9 && y < 12 + z * 1.6) { useItem(); return; }
          pdown = true;
        }
        if (type === 'up') { pdown = false; ptr = 0; return; }
        if (pdown) ptr = x < W / 2 ? -1 : 1;
      },
      hud: () => [state === 'ready' ? 'Goose Kart' : 'Lap ' + lapOf() + '/' + LAPS + ' · ' + ord(place), best ? 'Best ' + fmt(best / 10) : 'No best time yet'],
    };
    return g;
  }

  /* ---------------- Mini Golf ----------------
     Nine holes on a 160 x 100 course. On a tall screen the course turns a quarter so it still fills the screen. */
  function golf(env) {
    const WW = 160, WH = 100, BR = 1.6, CUP = 2.5, MAXV = 150, WALL = 1.2, LIMIT = 10;
    const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const HOLES = [
      { name: 'Warm-up', par: 2, green: rect(10, 30, 140, 40), tee: [24, 50], cup: [136, 50] },
      { name: 'Dogleg', par: 3, green: [[10, 10], [62, 10], [62, 60], [150, 60], [150, 90], [10, 90]], tee: [36, 22], cup: [136, 75] },
      { name: 'Bumpers', par: 2, green: rect(10, 14, 140, 72), tee: [22, 50], cup: [138, 50], bump: [[58, 34, 6], [58, 66, 6], [86, 50, 7], [112, 30, 5], [112, 70, 5]] },
      { name: 'Bunkers', par: 3, green: rect(10, 18, 140, 64), tee: [22, 50], cup: [138, 50], sand: [[48, 18, 26, 64], [96, 18, 26, 26], [96, 56, 26, 26]] },
      { name: 'The Bridge', par: 3, green: rect(10, 14, 140, 72), tee: [22, 50], cup: [136, 30], water: [[56, 14, 48, 31], [56, 55, 48, 31]] },
      { name: 'Gates', par: 3, green: rect(10, 20, 140, 60), tee: [22, 50], cup: [138, 50], slide: [[62, 8, 22, 26, 52, 2.6, 0], [100, 8, 22, 26, 52, 2.6, 0.5]] },
      { name: 'The Hill', par: 3, green: rect(10, 14, 140, 72), tee: [22, 70], cup: [138, 26], slope: [[50, 14, 60, 72, 0, 34]], walls: [[50, 52, 50, 86]] },
      { name: 'Windmill', par: 3, green: rect(10, 20, 140, 60), tee: [22, 50], cup: [138, 50], walls: [[80, 20, 80, 41], [80, 59, 80, 80]], spin: [[80, 50, 30, 1.6]] },
      { name: 'Switchback', par: 4, green: rect(10, 10, 140, 80), tee: [26, 22], cup: [134, 76], walls: [[56, 10, 56, 64], [104, 36, 104, 90]], sand: [[114, 12, 34, 22]], bump: [[80, 50, 5]] },
    ];
    const PAR = HOLES.reduce((a, h) => a + h.par, 0);
    let W = 400, H = 300, s = 2, rot = false, CY = 150, k = 1;
    let hi, Hn, segs, ball, vel, strokes, scores, state, ang, pow, drag, last, msg, msgT, sub2, gt = 0, sinkT, splT, flash, conf, ripple, overT, newBest;
    let best = env.load('golf');
    const held = { left: false, right: false, up: false, down: false };
    const inR = (p, r) => p[0] > r[0] && p[0] < r[0] + r[2] && p[1] > r[1] && p[1] < r[1] + r[3];
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const rel = (n) => (n === 0 ? 'E' : (n > 0 ? '+' : '') + n);

    function load(i) {
      hi = i; Hn = HOLES[i]; segs = [];
      Hn.green.forEach((p, j) => segs.push([p, Hn.green[(j + 1) % Hn.green.length]]));
      (Hn.walls || []).forEach((w) => segs.push([[w[0], w[1]], [w[2], w[3]]]));
      ball = Hn.tee.slice(); vel = [0, 0]; strokes = 0; state = 'aim'; ang = Math.atan2(Hn.cup[1] - ball[1], Hn.cup[0] - ball[0]); pow = 0.45;
      last = ball.slice(); flash = {}; drag = null; ripple = null; say('Hole ' + (i + 1), Hn.name + ' · Par ' + Hn.par, 1.6);
    }
    function say(a, b, tm) { msg = a; sub2 = b || ''; msgT = tm; }
    function collide(p, v, a, b, e, u, extra) { // the ball against a wall from a to b (u: how fast that wall is moving)
      const ex = b[0] - a[0], ey = b[1] - a[1], t = clamp(((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey), 0, 1);
      const qx = a[0] + ex * t, qy = a[1] + ey * t, dx = p[0] - qx, dy = p[1] - qy, d = Math.hypot(dx, dy), R = BR + extra;
      if (d >= R || d === 0) return false;
      const nx = dx / d, ny = dy / d; p[0] = qx + nx * R; p[1] = qy + ny * R;
      const vn = (v[0] - (u ? u[0] : 0)) * nx + (v[1] - (u ? u[1] : 0)) * ny;
      if (vn < 0) { v[0] -= (1 + e) * vn * nx; v[1] -= (1 + e) * vn * ny; }
      return true;
    }
    function movers() { // the moving gates right now, as boxes, with how fast each is moving
      return (Hn.slide || []).map(([x, w, h, y0, y1, per, ph]) => {
        const q = 2 * Math.PI * (gt / per + ph), y = y0 + (y1 - y0) * (0.5 - 0.5 * Math.cos(q)), vy = (y1 - y0) * 0.5 * Math.sin(q) * 2 * Math.PI / per;
        return [x, y, w, h, vy];
      });
    }
    function boxHit(p, v, x, y, w, h, vy) { // a solid moving box: a ball that ends up inside leaves by the nearest side
      const cx = clamp(p[0], x, x + w), cy = clamp(p[1], y, y + h), dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy);
      let nx, ny;
      if (d === 0) {
        const m = Math.min(p[0] - x, x + w - p[0], p[1] - y, y + h - p[1]);
        if (m === p[0] - x) { nx = -1; ny = 0; p[0] = x - BR; } else if (m === x + w - p[0]) { nx = 1; ny = 0; p[0] = x + w + BR; } else if (m === p[1] - y) { nx = 0; ny = -1; p[1] = y - BR; } else { nx = 0; ny = 1; p[1] = y + h + BR; }
      } else if (d < BR) { nx = dx / d; ny = dy / d; p[0] = cx + nx * BR; p[1] = cy + ny * BR; } else return false;
      const vn = v[0] * nx + (v[1] - vy) * ny; if (vn < 0) { v[0] -= 1.6 * vn * nx; v[1] -= 1.6 * vn * ny; }
      return true;
    }
    const spinAt = (sp) => { const a = gt * sp[3], dx = Math.cos(a) * sp[2] / 2, dy = Math.sin(a) * sp[2] / 2; return [[sp[0] - dx, sp[1] - dy], [sp[0] + dx, sp[1] + dy]]; };
    function pushers() { // moving parts shove the ball even while it sits still
      let hit = false;
      for (const [x, y, w, h, vy] of movers()) hit = boxHit(ball, vel, x, y, w, h, vy) || hit;
      (Hn.spin || []).forEach((sp) => { const [a, b] = spinAt(sp), w = sp[3]; hit = collide(ball, vel, a, b, 0.6, [-w * (ball[1] - sp[1]), w * (ball[0] - sp[0])], 1.1) || hit; });
      return hit;
    }
    function sub(h) {
      const sl = (Hn.slope || []).find((r) => inR(ball, r)), sand = (Hn.sand || []).some((r) => inR(ball, r));
      if (sl) { vel[0] += sl[4] * h; vel[1] += sl[5] * h; }
      let sp = Math.hypot(vel[0], vel[1]);
      if (sp > 0) { const ns = Math.max(0, sp * Math.exp(-(sand ? 3.4 : 0.6) * h) - (sand ? 34 : 5) * h); vel[0] *= ns / sp; vel[1] *= ns / sp; }
      ball[0] += vel[0] * h; ball[1] += vel[1] * h;
      let hit = false;
      for (const [a, b] of segs) hit = collide(ball, vel, a, b, 0.72, null, WALL) || hit;
      hit = pushers() || hit;
      (Hn.bump || []).forEach((bp, j) => {
        const dx = ball[0] - bp[0], dy = ball[1] - bp[1], d = Math.hypot(dx, dy), R = bp[2] + BR;
        if (d >= R || d === 0) return;
        const nx = dx / d, ny = dy / d, vn = vel[0] * nx + vel[1] * ny; ball[0] = bp[0] + nx * R; ball[1] = bp[1] + ny * R;
        if (vn < 0) { vel[0] -= 2 * vn * nx; vel[1] -= 2 * vn * ny; const s2 = Math.hypot(vel[0], vel[1]), want = Math.max(s2 * 1.1, 45); vel[0] *= want / s2; vel[1] *= want / s2; flash[j] = 0.25; env.buzz(); }
      });
      const dx = Hn.cup[0] - ball[0], dy = Hn.cup[1] - ball[1], d = Math.hypot(dx, dy);
      sp = Math.hypot(vel[0], vel[1]);
      if (d < CUP) { if (sp < 75) { sink(); return; } vel[0] = vel[0] * 0.9 + dx / d * 6; vel[1] = vel[1] * 0.9 + dy / d * 6; } // too fast: it lips out
      else if (d < CUP * 2.2 && sp < 35) { vel[0] += dx / d * 45 * h; vel[1] += dy / d * 45 * h; } // the cup's edge pulls a slow ball in
      if ((Hn.water || []).some((r) => inR(ball, r))) { splash(); return; }
      if (sp < 1.6 && (!sl || hit)) { vel = [0, 0]; rest(); }
    }
    function shoot() {
      if (state !== 'aim' || pow < 0.04) return;
      vel = [Math.cos(ang) * pow * MAXV, Math.sin(ang) * pow * MAXV]; last = ball.slice(); strokes++; state = 'roll'; env.buzz();
    }
    function rest() {
      state = 'aim';
      if (strokes >= LIMIT) { scores[hi] = LIMIT; state = 'sink'; sinkT = 0.4; say('Picked up', LIMIT + ' strokes', 1.6); }
    }
    function sink() {
      state = 'sink'; sinkT = 0; scores[hi] = strokes; ball = Hn.cup.slice(); vel = [0, 0]; env.buzz();
      const d = strokes - Hn.par, words = { '-3': 'Albatross!', '-2': 'Eagle!', '-1': 'Birdie!', 0: 'Par', 1: 'Bogey', 2: 'Double bogey' };
      say(strokes === 1 ? 'Hole in one!' : words[d] || rel(d), strokes + (strokes === 1 ? ' stroke' : ' strokes'), 1.8);
      if (d <= 0) for (let i = 0; i < (strokes === 1 ? 90 : 46); i++) conf.push({ x: W / 2, y: H * 0.42, vx: rnd(-1, 1) * W * 0.5, vy: rnd(-1.1, -0.2) * H, r: rnd(0, 6.3), vr: rnd(-9, 9), col: [ACC, GOLD, RED, '#4cb782', '#7b61c9'][i % 5], life: rnd(1.2, 2) });
    }
    function splash() { state = 'splash'; splT = 1; strokes++; ripple = { x: ball[0], y: ball[1], t: 0 }; say('Splash!', '+1 stroke', 1.1); env.buzz(); }
    function next() {
      if (hi < HOLES.length - 1) { load(hi + 1); return; }
      const tot = sum(scores); state = 'over'; overT = 0; newBest = !best || tot < best; if (newBest) { best = tot; env.save('golf', best); }
    }
    function start() { if (state === 'over' && overT < 0.6) return; scores = []; conf = []; load(0); }

    // ---- drawing
    const path = (c, pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
    function course(c, t) {
      c.save(); c.translate(W / 2, CY); if (rot) c.rotate(Math.PI / 2); c.scale(s, s); c.translate(-WW / 2, -WH / 2);
      path(c, Hn.green); c.save(); c.translate(0.6, 1.4); c.fillStyle = 'rgba(30,60,35,.2)'; c.fill(); c.restore();
      c.fillStyle = '#6cbd6e'; c.fill();
      c.save(); path(c, Hn.green); c.clip();
      c.fillStyle = '#77c779'; for (let x = -WH; x < WW + WH; x += 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 6, 0); c.lineTo(x + 6 + WH, WH); c.lineTo(x + WH, WH); c.closePath(); c.fill(); } // mowing stripes
      (Hn.slope || []).forEach((r) => {
        c.save(); c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip(); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(r[0], r[1], r[2], r[3]);
        const L = Math.hypot(r[4], r[5]), ux = r[4] / L, uy = r[5] / L, off = (gt * 9) % 12; c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.9; c.lineCap = 'round'; c.lineJoin = 'round';
        for (let gx = r[0] + 6; gx < r[0] + r[2]; gx += 12) for (let gy = r[1] - 6; gy < r[1] + r[3] + 6; gy += 12) { const px = gx + ux * off, py = gy + uy * off; c.beginPath(); c.moveTo(px - ux * 2 - uy * 2.5, py - uy * 2 + ux * 2.5); c.lineTo(px, py); c.lineTo(px - ux * 2 + uy * 2.5, py - uy * 2 - ux * 2.5); c.stroke(); }
        c.restore();
      });
      (Hn.sand || []).forEach((r) => { c.fillStyle = '#ead69e'; rr(c, r[0], r[1], r[2], r[3], 5); c.fill(); c.fillStyle = '#dcc37f'; for (let i = 0; i < r[2] * r[3] / 14; i++) { const a = Math.sin(i * 12.9898 + r[0]) * 43758.5453, b = Math.sin(i * 78.233 + r[1]) * 12543.21; c.fillRect(r[0] + 1 + (a - Math.floor(a)) * (r[2] - 2), r[1] + 1 + (b - Math.floor(b)) * (r[3] - 2), 0.5, 0.5); } });
      (Hn.water || []).forEach((r) => { c.fillStyle = '#56acd2'; rr(c, r[0], r[1], r[2], r[3], 3); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.6;
        for (let y = r[1] + 4; y < r[1] + r[3] - 2; y += 6) { c.beginPath(); for (let x = r[0] + 3; x <= r[0] + r[2] - 3; x += 2) { const yy = y + Math.sin(x * 0.5 + gt * 2 + y) * 0.7; x === r[0] + 3 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); } });
      c.restore();
      // the cup
      c.fillStyle = '#1d3a24'; c.beginPath(); c.arc(Hn.cup[0], Hn.cup[1], CUP, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 0.5; c.stroke();
      // walls
      c.lineCap = 'round'; c.lineJoin = 'round';
      const walls = (st, lw) => { c.strokeStyle = st; c.lineWidth = lw; path(c, Hn.green); c.stroke(); (Hn.walls || []).forEach((w) => { c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(w[2], w[3]); c.stroke(); }); };
      c.save(); c.translate(0.4, 0.9); walls('rgba(20,45,25,.25)', 2.8); c.restore(); walls('#d6c9a8', 2.8); walls('#f7f1e2', 1.7);
      (Hn.bump || []).forEach((bp, j) => {
        const f = flash[j] > 0 ? flash[j] : 0, r = bp[2] * (1 + f * 0.7);
        c.fillStyle = 'rgba(20,45,25,.25)'; c.beginPath(); c.arc(bp[0] + 0.5, bp[1] + 1, r, 0, 7); c.fill();
        c.fillStyle = f ? '#ff8a7d' : RED; c.beginPath(); c.arc(bp[0], bp[1], r, 0, 7); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 0.9; c.beginPath(); c.arc(bp[0], bp[1], r * 0.62, 0, 7); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(bp[0] - r * 0.3, bp[1] - r * 0.35, r * 0.35, r * 0.2, -0.6, 0, 7); c.fill();
      });
      (Hn.slide || []).forEach(([x, w, h, y0, y1, per, ph]) => {
        const y = y0 + (y1 - y0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * (gt / per + ph)));
        c.fillStyle = 'rgba(20,45,25,.25)'; rr(c, x + 0.5, y + 1, w, h, 1.5); c.fill(); c.fillStyle = '#3b4048'; rr(c, x, y, w, h, 1.5); c.fill();
        c.save(); rr(c, x, y, w, h, 1.5); c.clip(); c.fillStyle = GOLD; for (let q = -w; q < h + w; q += 6) { c.beginPath(); c.moveTo(x, y + q); c.lineTo(x + w, y + q - w); c.lineTo(x + w, y + q - w + 3); c.lineTo(x, y + q + 3); c.closePath(); c.fill(); } c.restore();
      });
      (Hn.spin || []).forEach((sp) => {
        const [a, b] = spinAt(sp);
        c.strokeStyle = 'rgba(20,45,25,.25)'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(a[0] + 0.5, a[1] + 1); c.lineTo(b[0] + 0.5, b[1] + 1); c.stroke();
        c.strokeStyle = '#8a5a3b'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        c.strokeStyle = '#b07a52'; c.lineWidth = 0.9; c.stroke();
        c.fillStyle = '#5d3d28'; c.beginPath(); c.arc(sp[0], sp[1], 2.6, 0, 7); c.fill(); c.fillStyle = GOLD; c.beginPath(); c.arc(sp[0], sp[1], 1, 0, 7); c.fill();
      });
      if (ripple) { const q = ripple.t; for (let i = 0; i < 3; i++) { const rr2 = 1 + (q * 9 - i * 2.2); if (rr2 > 0) { c.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.8 - q * 0.8)})`; c.lineWidth = 0.6; c.beginPath(); c.arc(ripple.x, ripple.y, rr2, 0, 7); c.stroke(); } } }
      if (state === 'aim') { // the aim: dots that get longer with power
        const n = 4 + Math.round(pow * 12), ca = Math.cos(ang), sa = Math.sin(ang);
        for (let i = 1; i <= n; i++) { const dd = 3 + i * 3.1, a = 1 - i / (n + 2); c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.arc(ball[0] + ca * dd, ball[1] + sa * dd, 0.7 + 0.3 * a, 0, 7); c.fill(); }
        const e = 3 + (n + 1) * 3.1, hx = ball[0] + ca * e, hy = ball[1] + sa * e; c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(hx + ca * 2.4, hy + sa * 2.4); c.lineTo(hx - sa * 1.6, hy + ca * 1.6); c.lineTo(hx + sa * 1.6, hy - ca * 1.6); c.closePath(); c.fill();
        c.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(gt * 4) * 0.2})`; c.lineWidth = 0.5; c.beginPath(); c.arc(ball[0], ball[1], BR + 1.4, 0, 7); c.stroke();
      }
      if (state !== 'splash') {
        const sc = state === 'sink' && sinkT < 0.4 ? Math.max(0, 1 - sinkT * 2.8) : state === 'sink' && scores[hi] !== LIMIT ? 0 : 1;
        if (sc > 0) { c.fillStyle = 'rgba(20,45,25,.3)'; c.beginPath(); c.ellipse(ball[0] + 0.5, ball[1] + 0.9, BR * sc, BR * 0.8 * sc, 0, 0, 7); c.fill();
          const gr = c.createRadialGradient(ball[0] - 0.5, ball[1] - 0.6, 0.2, ball[0], ball[1], BR * sc); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#dfe4ea'); c.fillStyle = gr; c.beginPath(); c.arc(ball[0], ball[1], BR * sc, 0, 7); c.fill(); }
      }
      // the flag stands up on the screen whichever way the course is turned
      c.save(); c.translate(Hn.cup[0], Hn.cup[1]); if (rot) c.rotate(-Math.PI / 2);
      const lift = state === 'sink' ? Math.min(1, sinkT * 3) * 3 : 0; c.translate(0, -lift);
      c.strokeStyle = '#4a4f59'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -15); c.stroke();
      const wv = Math.sin(gt * 3) * 0.8; c.fillStyle = ACC; c.beginPath(); c.moveTo(0, -15); c.quadraticCurveTo(4.5, -14.5 + wv, 9, -13 + wv); c.quadraticCurveTo(4.5, -11 - wv, 0, -10.5); c.closePath(); c.fill();
      c.restore();
      c.restore();
    }
    function hudDraw(c) {
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillStyle = INK; font(c, 800, 18 * k); c.fillText('Hole ' + (hi + 1), 14 * k, 24 * k); const w0 = c.measureText('Hole ' + (hi + 1)).width;
      c.fillStyle = MUTE; font(c, 600, 13 * k); c.fillText(Hn.name, 14 * k + w0 + 8 * k, 23 * k);
      c.textAlign = 'right'; c.fillStyle = INK; font(c, 700, 14 * k); c.fillText('Par ' + Hn.par + '  ·  Stroke ' + strokes, W - 14 * k, 23 * k); c.textAlign = 'left';
      if (state === 'aim') { // power meter
        const bw = 120 * k, bh = 8 * k, bx = W / 2 - bw / 2, by = H - 18 * k;
        c.fillStyle = 'rgba(42,45,51,.15)'; rr(c, bx, by, bw, bh, bh / 2); c.fill();
        const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#4cb782'); g.addColorStop(0.6, GOLD); g.addColorStop(1, RED); c.fillStyle = g; rr(c, bx, by, Math.max(bh, bw * pow), bh, bh / 2); c.fill();
        c.fillStyle = MUTE; font(c, 600, 11 * k); c.textAlign = 'center'; c.fillText(env.touch ? 'Drag back anywhere, let go to putt' : 'Left / right aim · up / down power · A putts', W / 2, by - 6 * k); c.textAlign = 'left';
      }
      if (msgT > 0) {
        const a = Math.min(1, msgT * 3); c.globalAlpha = a; c.textAlign = 'center';
        font(c, 800, 34 * k); c.lineWidth = 6 * k; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineJoin = 'round'; c.strokeText(msg, W / 2, H * 0.42); c.fillStyle = INK; c.fillText(msg, W / 2, H * 0.42);
        if (sub2) { font(c, 600, 15 * k); c.strokeText(sub2, W / 2, H * 0.42 + 24 * k); c.fillStyle = MUTE; c.fillText(sub2, W / 2, H * 0.42 + 24 * k); }
        c.textAlign = 'left'; c.globalAlpha = 1;
      }
      for (const p of conf) { c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.col; c.fillRect(-3 * k, -1.5 * k, 6 * k, 3 * k); c.restore(); } c.globalAlpha = 1;
    }
    function card(c) { // the scorecard after the last hole
      const cw = Math.min(W - 24, 9 * 34 * k), cell = cw / 9, y = H / 2 - 120 * Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400)), x0 = W / 2 - cw / 2;
      HOLES.forEach((h, i) => {
        const d = scores[i] - h.par, col = d < 0 ? '#4cb782' : d === 0 ? ACC : d === 1 ? GOLD : RED;
        c.fillStyle = '#fff'; rr(c, x0 + i * cell + 2, y, cell - 4, cell * 1.25, 6); c.fill(); c.fillStyle = col; rr(c, x0 + i * cell + 2, y + cell * 1.25 - 4, cell - 4, 4, 2); c.fill();
        c.textAlign = 'center'; c.fillStyle = MUTE; font(c, 600, cell * 0.26); c.fillText(String(i + 1), x0 + i * cell + cell / 2, y + cell * 0.38);
        c.fillStyle = INK; font(c, 800, cell * 0.42); c.fillText(String(scores[i]), x0 + i * cell + cell / 2, y + cell * 0.92); c.textAlign = 'left';
      });
    }

    const g = {
      resize(w, h) {
        W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3); rot = H > W * 1.05;
        const top = 36 * k, bot = 30 * k, aw = W - 16, ah = H - top - bot; CY = top + ah / 2;
        s = rot ? Math.min(aw / WH, ah / WW) : Math.min(aw / WW, ah / WH);
      },
      reset() { scores = []; conf = []; load(0); state = 'ready'; msgT = 0; overT = 0; },
      step(dt) {
        gt += dt; if (msgT > 0) msgT -= dt; for (const j in flash) flash[j] -= dt; if (ripple) ripple.t += dt; if (state === 'over') overT += dt;
        conf = conf.filter((p) => { p.vy += H * 1.4 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt; return p.life > 0; });
        if (state === 'aim') {
          if (!drag) { if (held.left) ang -= 1.6 * dt; if (held.right) ang += 1.6 * dt; if (held.up) pow = Math.min(1, pow + 0.7 * dt); if (held.down) pow = Math.max(0.05, pow - 0.7 * dt); }
          if (pushers() && Math.hypot(vel[0], vel[1]) > 0.5) state = 'roll';
        }
        if (state === 'roll') { const n = Math.min(60, Math.ceil(Math.hypot(vel[0], vel[1]) * dt / 0.5) + 1); for (let i = 0; i < n && state === 'roll'; i++) sub(dt / n); }
        else if (state === 'sink') { sinkT += dt; if (sinkT > 1.9) next(); }
        else if (state === 'splash') { splT -= dt; if (splT <= 0) { ball = last.slice(); vel = [0, 0]; state = 'aim'; ripple = null; if (strokes >= LIMIT) rest(); } }
      },
      draw(c, t) {
        c.fillStyle = '#e6ede3'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(60,110,70,.09)'; for (let y = 8, r = 0; y < H; y += 22, r++) for (let x = 8 + (r % 2) * 11; x < W; x += 22) c.fillRect(x, y, 2, 2);
        course(c, t);
        if (state !== 'ready' && state !== 'over') hudDraw(c);
        if (state === 'ready') banner(c, W, H, 'Mini Golf', env.touch ? '9 holes · drag back and let go to putt\nTap to start' : '9 holes · left / right aims, up / down sets power\nPress A to start', env, true);
        if (state === 'over') { const tot = sum(scores); banner(c, W, H, tot + ' strokes', rel(tot - PAR) + ' against par ' + PAR + (newBest ? ' · new best!' : best ? ' · best ' + best : '') + '\n' + againWord(env), env, true); card(c); }
      },
      key(k2) {
        if (k2 === 'a') { if (state === 'ready' || state === 'over') start(); else shoot(); return true; }
        if (k2 in held) { held[k2] = true; return true; }
        return false;
      },
      release(k2) {
        if (k2 === 'all') { for (const q in held) held[q] = false; drag = null; }
        else if (k2 === 'ptr') { if (drag) { const ok = drag.len > 8; drag = null; if (ok) shoot(); } }
        else if (k2 in held) held[k2] = false;
      },
      pointer(type, x, y) {
        if (state === 'ready' || state === 'over') { if (type === 'down') start(); return; }
        if (type === 'down') { if (state === 'aim') drag = { x, y, len: 0 }; return; }
        if (!drag) return;
        let dx = drag.x - x, dy = drag.y - y; if (rot) [dx, dy] = [dy, -dx]; // pull back: the ball goes the other way
        drag.len = Math.hypot(dx, dy);
        if (drag.len > 4) { ang = Math.atan2(dy, dx); pow = Math.min(1, drag.len / (Math.min(W, H) * 0.38)); }
        if (type === 'up') g.release('ptr');
      },
      hud: () => [state === 'ready' ? 'Mini Golf' : 'Hole ' + (hi + 1) + '/9 · Par ' + Hn.par, 'Strokes ' + (sum(scores) + (state === 'over' || state === 'sink' ? 0 : strokes)) + (best ? ' · Best ' + best : '')],
    };
    return g;
  }

  /* ---------------- Sky Patrol ----------------
     A vertical shooter in a column 180 units wide; on a wide screen the sides hold the score. */
  function skypatrol(env) {
    const VW = 180;
    let W = 400, H = 300, s = 2, ox = 0, VH = 200, k = 1, bgY = 0, gt = 0;
    let state, P, bullets, foes, shots, drops, parts, pops, score, lives, level, wave, queue, waveT, fireT, inv, shield, shake, annT, ann, boss, overT, newBest, tilt;
    let best = env.load('sky');
    const held = { left: false, right: false, up: false, down: false }; let drag = null;
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), z: rnd(0.25, 1) }));
    const clouds = Array.from({ length: 7 }, () => ({ x: Math.random(), y: Math.random(), w: rnd(0.25, 0.6), z: rnd(0.4, 1) }));
    const diff = () => 1 + (wave - 1) * 0.11;
    const STATS = { drone: { hp: 2, r: 7, pts: 100 }, diver: { hp: 2, r: 7, pts: 150 }, saucer: { hp: 1, r: 6, pts: 120 }, tank: { hp: 14, r: 12, pts: 500 }, boss: { hp: 150, r: 24, pts: 5000 } };
    function foe(type, x, y, o) { const f = Object.assign({ type, x, y, t: 0, hit: 0, fire: rnd(0.8, 2.2), vx: 0, vy: 0 }, STATS[type], o || {}); if (type === 'boss') f.hp += wave * 14; f.max = f.hp; foes.push(f); if (type === 'boss') boss = f; return f; }
    function plan(n) { // a wave is a list of [time, spawn]
      queue = []; waveT = 0;
      if (n % 5 === 0) { queue.push([1.6, () => foe('boss', VW / 2, -40)]); return; }
      const kinds = ['line', 'vee', 'sides', 'vee', 'line', 'sides'], groups = 3 + Math.min(4, Math.floor(n / 2));
      let t = 1.2;
      for (let gI = 0; gI < groups; gI++) {
        const kind = n >= 2 && gI === groups - 1 ? 'heavy' : kinds[(n + gI * 2) % kinds.length], at = t;
        if (kind === 'line') for (let i = 0; i < 5; i++) queue.push([at, () => foe('drone', 26 + i * 32, -12, { bx: 26 + i * 32, ph: i * 0.7 })]);
        if (kind === 'vee') for (let i = 0; i < 5; i++) queue.push([at + Math.abs(i - 2) * 0.18, () => foe('diver', VW / 2 + (i - 2) * 24, -12)]);
        if (kind === 'sides') for (let i = 0; i < 6; i++) { const L = i % 2 === 0; queue.push([at + i * 0.28, () => foe('saucer', L ? -10 : VW + 10, 20 + (i >> 1) * 8, { vx: (L ? 1 : -1) * rnd(55, 70) })]); }
        if (kind === 'heavy') { const two = n >= 6; queue.push([at, () => foe('tank', two ? VW * 0.3 : VW / 2, -20)]); if (two) queue.push([at + 0.6, () => foe('tank', VW * 0.7, -20)]); }
        t += Math.max(1.6, 3 - n * 0.1);
      }
    }
    function aimShot(f, sp, spread, n) { const a0 = Math.atan2(P.y - f.y, P.x - f.x); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; shots.push({ x: f.x, y: f.y + f.r * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.4 }); } }
    function ring(f, n, sp, off) { for (let i = 0; i < n; i++) { const a = off + i * 2 * Math.PI / n; shots.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.4 }); } }
    function moveFoe(f, dt) {
      f.t += dt; if (f.hit > 0) f.hit -= dt; const d = diff();
      if (f.type === 'drone') { f.y += 28 * d * dt; f.x = f.bx + Math.sin(f.t * 2 + f.ph) * 18; if ((f.fire -= dt) <= 0 && f.y > 4) { aimShot(f, 62 * Math.min(1.6, d), 0, 1); f.fire = rnd(2, 3.4) / d; } }
      else if (f.type === 'diver') {
        if (f.t < 0.9) f.y += 45 * dt;
        else { if (!f.go) { f.go = 1; const a = Math.atan2(P.y - f.y, P.x - f.x); f.vx = Math.cos(a) * 90 * d; f.vy = Math.max(45, Math.sin(a) * 90 * d); } f.x += f.vx * dt; f.y += f.vy * dt; }
      }
      else if (f.type === 'saucer') { f.x += f.vx * dt; f.y += (26 + Math.sin(f.t * 3) * 22) * dt; if ((f.fire -= dt) <= 0) { aimShot(f, 70, 0, 1); f.fire = 99; } }
      else if (f.type === 'tank') { if (f.y < 44) f.y += 32 * dt; f.x = clamp(f.x + Math.sin(f.t * 0.8) * 22 * dt, 16, VW - 16); if ((f.fire -= dt) <= 0 && f.y > 20) { aimShot(f, 58 * Math.min(1.5, d), 0.26, d > 1.5 ? 5 : 3); f.fire = 1.8 / Math.sqrt(d); } }
      else if (f.type === 'boss') {
        if (f.y < 50) f.y += 28 * dt; else f.x = VW / 2 + Math.sin(f.t * 0.55) * 44;
        const ph = f.hp / f.max;
        if ((f.fire -= dt) <= 0 && f.y >= 40) {
          f.n = (f.n || 0) + 1;
          if (ph > 0.66) { aimShot(f, 80, 0.2, 3); f.fire = 0.9; if (f.n % 3 === 0) ring(f, 12, 50, f.t); }
          else if (ph > 0.33) { ring(f, 10, 55, f.t * 1.7); f.fire = 0.42; if (f.n % 4 === 0) aimShot(f, 90, 0.14, 5); }
          else { ring(f, 13, 58, f.t * 2.3); if (f.n % 2) aimShot(f, 95, 0.2, 3); f.fire = 0.55; }
        }
      }
      return f.y < VH + 30 && f.x > -40 && f.x < VW + 40;
    }
    function burst(x, y, n, size, cols) {
      for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), sp = rnd(20, 90) * size; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.35, 0.8), max: 0.8, r: rnd(1, 2.6) * size, col: cols[i % cols.length] }); }
      parts.push({ ring: 1, x, y, life: 0.4, max: 0.4, r: 10 * size });
    }
    function kill(f) {
      score += f.pts; pops.push({ x: f.x, y: f.y, txt: String(f.pts), t: 0.8 });
      const big = f.type === 'boss' ? 3 : f.type === 'tank' ? 1.8 : 1; burst(f.x, f.y, Math.round(18 * big), big, ['#ffd66b', '#ff9f43', '#fff', RED]); shake = Math.max(shake, 0.15 * big);
      if (f.type === 'boss') { boss = null; for (let i = 0; i < 3; i++) drops.push({ x: f.x + (i - 1) * 16, y: f.y, kind: ['P', 'H', 'S'][i], t: 0 }); for (let i = 0; i < 6; i++) setTimeout(() => burst(f.x + rnd(-24, 24), f.y + rnd(-14, 14), 14, 1.4, ['#ffd66b', '#fff', RED]), i * 110); }
      else if (f.type === 'tank') drops.push({ x: f.x, y: f.y, kind: Math.random() < 0.7 ? 'P' : 'S', t: 0 });
      else if (Math.random() < 0.07) drops.push({ x: f.x, y: f.y, kind: Math.random() < 0.12 ? 'H' : Math.random() < 0.65 ? 'P' : 'S', t: 0 });
      env.buzz();
    }
    function hurt() {
      if (inv > 0 || state !== 'play') return;
      if (shield) { shield = false; inv = 1; burst(P.x, P.y, 16, 1, [ACC, '#bff6ff', '#fff']); return; }
      lives--; level = Math.max(1, level - 1); inv = 2.2; shake = 0.4; burst(P.x, P.y, 26, 1.3, ['#fff', '#8b7a66', ACC, '#ffd66b']); env.buzz();
      if (lives <= 0) { state = 'over'; overT = 0; newBest = score > best; if (newBest) { best = score; env.save('sky', best); } }
    }
    const PATTERN = [null, [[-3, 0], [3, 0]], [[0, 0], [-5, -0.12], [5, 0.12]], [[-3, 0], [3, 0], [-6, -0.15], [6, 0.15]], [[-3, 0], [3, 0], [-6, -0.13], [6, 0.13], [-8, -0.3], [8, 0.3]]];
    function tick(dt) {
      gt += dt; bgY += dt; if (shake > 0) shake -= dt; if (annT > 0) annT -= dt; if (inv > 0) inv -= dt; if (state === 'over') overT += dt;
      parts = parts.filter((p) => { p.life -= dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.vx) { p.vx *= 0.96; p.vy *= 0.96; } return p.life > 0; });
      pops = pops.filter((p) => { p.t -= dt; p.y -= 18 * dt; return p.t > 0; });
      if (state === 'ready') return;
      if (state === 'play') {
        const px = P.x, sp = 125;
        if (!drag) { P.x += ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * sp * dt; P.y += ((held.down ? 1 : 0) - (held.up ? 1 : 0)) * sp * dt; }
        P.x = clamp(P.x, 9, VW - 9); P.y = clamp(P.y, 24, VH - 12);
        tilt += (clamp((P.x - px) / dt / 110, -1, 1) - tilt) * Math.min(1, dt * 10);
        if ((fireT -= dt) <= 0) { fireT = level >= 3 ? 0.09 : 0.11; for (const [dx, a] of PATTERN[level]) bullets.push({ x: P.x + dx, y: P.y - 10, vx: Math.sin(a) * 270, vy: -Math.cos(a) * 270 }); }
      }
      waveT += dt; queue = queue.filter(([t, fn]) => (t <= waveT ? (fn(), false) : true));
      foes = foes.filter((f) => moveFoe(f, dt));
      if (state === 'play' && !queue.length && !foes.length) { wave++; plan(wave); ann = wave % 5 === 0 ? 'WARNING · BOSS' : 'WAVE ' + wave; annT = 2; }
      bullets = bullets.filter((b) => { b.x += b.vx * dt; b.y += b.vy * dt;
        for (const f of foes) if (f.hp > 0 && Math.abs(b.x - f.x) < f.r + 2 && Math.abs(b.y - f.y) < f.r + 3) { f.hp--; f.hit = 0.07; parts.push({ x: b.x, y: b.y, vx: rnd(-30, 30), vy: rnd(-40, 0), life: 0.2, max: 0.2, r: 1.4, col: '#fff' }); if (f.hp <= 0) kill(f); return false; }
        return b.y > -10 && b.x > -10 && b.x < VW + 10; });
      foes = foes.filter((f) => f.hp > 0);
      shots = shots.filter((b) => { b.x += b.vx * dt; b.y += b.vy * dt; if (state === 'play' && Math.hypot(b.x - P.x, b.y - P.y) < b.r + 2.6) { hurt(); return false; } return b.y < VH + 10 && b.y > -20 && b.x > -10 && b.x < VW + 10; });
      if (state === 'play') for (const f of foes) if (Math.hypot(f.x - P.x, f.y - P.y) < f.r + 5) { hurt(); if (f.type !== 'boss') { f.hp -= 4; if (f.hp <= 0) kill(f); } }
      foes = foes.filter((f) => f.hp > 0);
      drops = drops.filter((d) => { d.t += dt; d.y += 32 * dt; d.x += Math.sin(d.t * 3) * 14 * dt;
        if (state === 'play' && Math.hypot(d.x - P.x, d.y - P.y) < 11) {
          if (d.kind === 'P') { if (level < 4) level++; else score += 1000; } else if (d.kind === 'S') shield = true; else lives = Math.min(5, lives + 1);
          pops.push({ x: d.x, y: d.y - 6, txt: { P: level >= 4 ? 'MAX POWER' : 'POWER UP', S: 'SHIELD', H: '+1 LIFE' }[d.kind], t: 0.9 }); burst(d.x, d.y, 10, 0.7, ['#fff', GOLD]); env.buzz(); return false; }
        return d.y < VH + 10; });
    }

    // ---- drawing (world units inside the column)
    function goose(c, x, y, tl, blink) {
      if (blink) return;
      c.save(); c.translate(x, y); c.rotate(tl * 0.22);
      c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(150,230,255,${0.18 - i * 0.05})`; c.beginPath(); c.ellipse(0, 12 + i * 4 + Math.sin(gt * 30 + i) * 1, 2.4 - i * 0.5, 4, 0, 0, 7); c.fill(); } c.globalCompositeOperation = 'source-over';
      const flap = Math.sin(gt * 13) * 0.28;
      for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.rotate(flap); c.fillStyle = '#6e604f'; c.beginPath(); c.moveTo(2, -2); c.quadraticCurveTo(10, -7, 16, -2); c.lineTo(14.5, 1.5); c.quadraticCurveTo(8, 0.5, 2, 4); c.closePath(); c.fill(); c.fillStyle = '#4f4538'; c.beginPath(); c.moveTo(11, -3.6); c.quadraticCurveTo(14, -3, 16, -2); c.lineTo(14.5, 1.5); c.lineTo(11, 0.8); c.closePath(); c.fill(); c.restore(); }
      c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(0, 2, 4.4, 8, 0, 0, 7); c.fill();
      c.fillStyle = '#f2efe8'; c.beginPath(); c.ellipse(0, 8.6, 2.6, 2, 0, 0, 7); c.fill(); c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(0, 10.4, 2.4, 1.6, 0, 0, 7); c.fill();
      c.fillStyle = '#1f2024'; rr(c, -1.4, -12, 2.8, 9, 1.4); c.fill(); c.beginPath(); c.ellipse(0, -13, 2.4, 3.1, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -12, 1.8, 1.2, 0, 0, 7); c.fill();
      c.fillStyle = ACC; rr(c, -2.4, -14.8, 4.8, 1.5, 0.7); c.fill(); // flying goggles
      c.restore();
    }
    function drawFoe(c, f) {
      const w = f.hit > 0; c.save(); c.translate(f.x, f.y);
      if (f.type === 'drone') {
        c.strokeStyle = w ? '#fff' : '#4a4f59'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-8, -4); c.lineTo(8, -4); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.35)'; for (const sx of [-8, 8]) { c.beginPath(); c.ellipse(sx, -4, 4.5 * Math.abs(Math.sin(gt * 40 + sx)), 1.2, 0, 0, 7); c.fill(); }
        c.fillStyle = w ? '#fff' : '#d4d8de'; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill(); c.fillStyle = w ? '#fff' : '#3b4048'; c.beginPath(); c.arc(0, 0.6, 3.6, 0, 7); c.fill();
        c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(0, 0.8, 1.7 + Math.sin(gt * 6) * 0.3, 0, 7); c.fill();
      } else if (f.type === 'diver') {
        const a = f.go ? Math.atan2(f.vy, f.vx) - Math.PI / 2 : 0; c.rotate(a);
        c.fillStyle = w ? '#fff' : '#e0584d'; c.beginPath(); c.moveTo(0, 9); c.lineTo(7, -6); c.lineTo(0, -3); c.lineTo(-7, -6); c.closePath(); c.fill();
        c.fillStyle = w ? '#fff' : '#a63a31'; c.beginPath(); c.moveTo(0, 9); c.lineTo(2.6, -3.6); c.lineTo(0, -3); c.lineTo(-2.6, -3.6); c.closePath(); c.fill();
        c.fillStyle = '#ffd66b'; c.beginPath(); c.arc(0, 2, 1.5, 0, 7); c.fill();
      } else if (f.type === 'saucer') {
        c.fillStyle = w ? '#fff' : '#7b61c9'; c.beginPath(); c.ellipse(0, 1, 8, 3.4, 0, 0, 7); c.fill();
        c.fillStyle = w ? '#fff' : 'rgba(190,240,255,.85)'; c.beginPath(); c.ellipse(0, -1, 3.8, 3.4, 0, Math.PI, 0); c.fill();
        for (let i = 0; i < 3; i++) { c.fillStyle = (Math.floor(gt * 8) + i) % 3 ? '#ffd66b' : '#fff'; c.beginPath(); c.arc(-4 + i * 4, 2, 0.9, 0, 7); c.fill(); }
      } else if (f.type === 'tank') {
        c.fillStyle = w ? '#fff' : '#5d6470'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; c.lineTo(Math.cos(a) * 13, Math.sin(a) * 11); } c.closePath(); c.fill();
        c.fillStyle = w ? '#fff' : GOLD; c.fillRect(-12, -1.5, 24, 3);
        c.fillStyle = w ? '#fff' : '#3b4048'; c.beginPath(); c.arc(0, 0, 5.5, 0, 7); c.fill(); c.fillRect(-1.6, 3, 3.2, 8);
        c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(0, 0, 2, 0, 7); c.fill();
        if (f.hp < f.max) { c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-12, -16, 24, 2.4); c.fillStyle = '#4cb782'; c.fillRect(-12, -16, 24 * f.hp / f.max, 2.4); }
      } else if (f.type === 'boss') {
        c.fillStyle = w ? '#fff' : '#3b4048'; c.beginPath(); c.moveTo(-30, -6); c.lineTo(-18, -16); c.lineTo(18, -16); c.lineTo(30, -6); c.lineTo(24, 10); c.lineTo(-24, 10); c.closePath(); c.fill();
        c.fillStyle = w ? '#fff' : '#5d6470'; c.fillRect(-26, -4, 52, 6);
        for (const tx of [-18, 0, 18]) { c.fillStyle = w ? '#fff' : '#2a2d33'; c.beginPath(); c.arc(tx, 8, 4, 0, 7); c.fill(); c.fillRect(tx - 1.3, 8, 2.6, 7); }
        const pulse = 0.6 + Math.sin(gt * 6) * 0.4; c.fillStyle = `rgba(255,93,115,${0.35 + pulse * 0.3})`; c.beginPath(); c.arc(0, -6, 9, 0, 7); c.fill(); c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(0, -6, 5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-1.4, -7.4, 1.6, 0, 7); c.fill();
        c.fillStyle = GOLD; c.fillRect(-28, -7, 6, 2); c.fillRect(22, -7, 6, 2);
      }
      c.restore();
    }
    function drop(c, d) {
      const col = { P: GOLD, S: ACC, H: RED }[d.kind]; c.save(); c.translate(d.x, d.y); c.rotate(Math.sin(d.t * 2) * 0.2);
      c.globalCompositeOperation = 'lighter'; c.fillStyle = col; c.globalAlpha = 0.25 + Math.sin(d.t * 6) * 0.1; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = col; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } c.closePath(); c.fill();
      c.fillStyle = '#fff'; font(c, 800, 7); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.kind, 0, 0.4); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.restore();
    }
    function scene(c) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f2c42'); g.addColorStop(1, '#1d6a80'); c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
      for (const st of stars) { const y = ((st.y + bgY * 0.03 * st.z) % 1) * H; c.fillStyle = `rgba(255,255,255,${0.2 + st.z * 0.55})`; c.fillRect(st.x * W, y, 1 + st.z * 1.4, 1 + st.z * 1.4); }
      for (const cl of clouds) { const y = ((cl.y + bgY * 0.06 * cl.z) % 1.3) * H - H * 0.15; c.fillStyle = `rgba(255,255,255,${0.04 + cl.z * 0.05})`; c.beginPath(); c.ellipse(cl.x * W, y, cl.w * W * 0.5, cl.w * W * 0.12, 0, 0, 7); c.fill(); }
      c.save(); c.translate(ox, 0); c.scale(s, s);
      for (const d of drops) drop(c, d);
      for (const f of foes) drawFoe(c, f);
      if (state === 'play' || state === 'ready') {
        goose(c, P.x, P.y, tilt, inv > 0 && Math.floor(gt * 14) % 2 === 0);
        if (shield) { c.strokeStyle = `rgba(120,230,255,${0.5 + Math.sin(gt * 5) * 0.2})`; c.lineWidth = 1.2; c.beginPath(); c.arc(P.x, P.y, 17, 0, 7); c.stroke(); }
      }
      c.globalCompositeOperation = 'lighter';
      for (const b of bullets) { c.fillStyle = 'rgba(120,230,255,.35)'; rr(c, b.x - 2.2, b.y - 6, 4.4, 11, 2.2); c.fill(); c.fillStyle = '#e8fbff'; rr(c, b.x - 1, b.y - 5, 2, 8, 1); c.fill(); }
      for (const b of shots) { c.fillStyle = 'rgba(255,93,115,.4)'; c.beginPath(); c.arc(b.x, b.y, b.r + 2, 0, 7); c.fill(); c.fillStyle = '#ff7d8f'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, b.r * 0.45, 0, 7); c.fill(); }
      for (const p of parts) { const a = p.life / p.max; if (p.ring) { c.strokeStyle = `rgba(255,220,150,${a * 0.7})`; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - a), 0, 7); c.stroke(); } else { c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, 7); c.fill(); c.globalAlpha = 1; } }
      c.globalCompositeOperation = 'source-over';
      for (const p of pops) { c.globalAlpha = Math.min(1, p.t * 2.5); c.fillStyle = '#fff'; font(c, 800, 6.5); c.textAlign = 'center'; c.fillText(p.txt, p.x, p.y); c.textAlign = 'left'; } c.globalAlpha = 1;
      c.restore();
    }
    const lifeIcon = (c, x, y, z) => { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, z * 0.32, z * 0.5, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - z * 0.25, y - z * 0.1); c.lineTo(x - z * 0.7, y + z * 0.15); c.lineTo(x - z * 0.25, y + z * 0.2); c.moveTo(x + z * 0.25, y - z * 0.1); c.lineTo(x + z * 0.7, y + z * 0.15); c.lineTo(x + z * 0.25, y + z * 0.2); c.fill(); };
    function panel(c) {
      const wide = ox > 90 * k;
      const big = (label, val, x, y, al) => { c.textAlign = al; c.fillStyle = 'rgba(255,255,255,.55)'; font(c, 700, 11 * k); c.fillText(label, x, y); c.fillStyle = '#fff'; font(c, 800, 22 * k); c.fillText(val, x, y + 24 * k); };
      if (wide) {
        c.fillStyle = 'rgba(4,18,28,.45)'; c.fillRect(0, 0, ox, H); c.fillRect(ox + VW * s, 0, W - ox - VW * s, H);
        c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(ox - 1, 0, 1, H); c.fillRect(ox + VW * s, 0, 1, H);
        const lx = 20 * k, rx = W - 20 * k;
        big('SCORE', score.toLocaleString(), lx, 40 * k, 'left'); big('BEST', Math.max(best, score).toLocaleString(), lx, 100 * k, 'left');
        big('WAVE', String(wave), rx, 40 * k, 'right');
        c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.55)'; font(c, 700, 11 * k); c.fillText('LIVES', rx, 100 * k); for (let i = 0; i < lives; i++) lifeIcon(c, rx - 8 * k - i * 20 * k, 116 * k, 16 * k);
        c.fillText('POWER', rx, 150 * k); for (let i = 0; i < 4; i++) { c.fillStyle = i < level ? GOLD : 'rgba(255,255,255,.18)'; rr(c, rx - (4 - i) * 16 * k, 158 * k, 12 * k, 12 * k, 3 * k); c.fill(); }
        c.textAlign = 'left';
      } else {
        c.fillStyle = '#fff'; font(c, 800, 16 * k); c.fillText(score.toLocaleString(), ox + 10 * k, 22 * k);
        for (let i = 0; i < lives; i++) lifeIcon(c, ox + VW * s - 14 * k - i * 18 * k, 16 * k, 14 * k);
        for (let i = 0; i < 4; i++) { c.fillStyle = i < level ? GOLD : 'rgba(255,255,255,.2)'; rr(c, ox + 10 * k + i * 10 * k, 30 * k, 7 * k, 4 * k, 2); c.fill(); }
      }
      if (boss) { const bw = VW * s * 0.7, bx = ox + (VW * s - bw) / 2, by = wide ? 14 * k : 44 * k; c.fillStyle = 'rgba(0,0,0,.4)'; rr(c, bx, by, bw, 7 * k, 3.5 * k); c.fill(); c.fillStyle = '#ff5d73'; rr(c, bx, by, Math.max(7 * k, bw * boss.hp / boss.max), 7 * k, 3.5 * k); c.fill(); }
      if (annT > 0) { c.globalAlpha = Math.min(1, annT * 2); c.textAlign = 'center'; font(c, 800, 30 * k); c.fillStyle = ann.startsWith('WARN') ? '#ff7d8f' : '#fff'; c.fillText(ann, ox + VW * s / 2, H * 0.4); c.textAlign = 'left'; c.globalAlpha = 1; }
    }
    function dark(c, title, sub) { // the title and game-over cards, drawn for a dark background
      c.fillStyle = 'rgba(4,18,28,.6)'; c.fillRect(0, 0, W, H);
      const z = Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400)); c.textAlign = 'center';
      c.fillStyle = '#fff'; font(c, 800, 40 * z); c.fillText(title, W / 2, H / 2 - 6 * z);
      c.fillStyle = 'rgba(255,255,255,.75)'; font(c, 500, 16 * z); sub.split('\n').forEach((ln, i) => c.fillText(ln, W / 2, H / 2 + 28 * z + i * 23 * z)); c.textAlign = 'left';
    }
    function start() { if (state === 'over' && overT < 0.8) return; g.reset(); state = 'play'; ann = 'WAVE 1'; annT = 2; env.buzz(); }

    const g = {
      resize(w, h) { W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3); const cw = Math.min(W, H * 0.78); s = cw / VW; ox = (W - cw) / 2; VH = H / s; if (P) P.y = Math.min(P.y, VH - 12); },
      reset() {
        state = 'ready'; P = { x: VW / 2, y: VH - 34 }; bullets = []; foes = []; shots = []; drops = []; parts = []; pops = [];
        score = 0; lives = 3; level = 1; wave = 1; fireT = 0; inv = 0; shield = false; shake = 0; annT = 0; boss = null; tilt = 0; drag = null; newBest = false; plan(1);
      },
      step(dt) { tick(Math.min(dt, 0.05)); },
      draw(c) {
        c.save(); if (shake > 0) c.translate(rnd(-1, 1) * shake * 10, rnd(-1, 1) * shake * 10);
        scene(c); if (state !== 'ready') panel(c); c.restore();
        if (state === 'ready') dark(c, 'Sky Patrol', (env.touch ? 'Drag anywhere to fly · you fire on your own' : 'Arrow keys fly · you fire on your own') + '\nGrab P for power, S for a shield\n' + startWord(env));
        if (state === 'over') dark(c, 'Shot down', 'Score ' + score.toLocaleString() + ' · wave ' + wave + (newBest ? ' · new best!' : '') + '\n' + againWord(env));
      },
      key(k2) {
        if (k2 === 'a') { if (state !== 'play') start(); return true; }
        if (k2 in held) { held[k2] = true; if (state === 'ready') start(); return true; }
        return false;
      },
      release(k2) { if (k2 === 'all') { for (const q in held) held[q] = false; drag = null; } else if (k2 === 'ptr') drag = null; else if (k2 in held) held[k2] = false; },
      pointer(type, x, y) {
        const wx = (x - ox) / s, wy = y / s;
        if (type === 'down') { if (state !== 'play') { start(); return; } drag = { x: wx, y: wy, px: P.x, py: P.y }; return; }
        if (type === 'up') { drag = null; return; }
        if (drag && state === 'play') { P.x = clamp(drag.px + (wx - drag.x) * 1.3, 9, VW - 9); P.y = clamp(drag.py + (wy - drag.y) * 1.3, 24, VH - 12); }
      },
      hud: () => ['Score ' + score.toLocaleString(), 'Best ' + Math.max(best, score).toLocaleString()],
    };
    return g;
  }

  /* ---------------- Goose Run ----------------
     A runner: the goose runs on its own, you jump (hold for higher, press again in the air for a second jump). */
  function goosrun(env) {
    const GR = 1500, JV = 430, JV2 = 380, CUT = 170, PW2 = 8, PH = 20;
    let W = 400, H = 300, s = 2, VWd = 200, VHd = 220, k = 1, gt = 0;
    let state, p, plats, coins, spikes, parts, speed, dist, coinN, genX, genY, deadT, jumpHeld, buffer, coyote, jumps, shake, overT, newBest, cam, camY, why;
    let best = env.load('run');
    const scoreNow = () => Math.floor(dist / 10) + coinN * 10;

    function gen() {
      while (genX < cam + VWd * 1.8) {
        const d = Math.min(1, dist / 6000), first = plats.length < 2;
        const gap = first ? 0 : rnd(30, 44 + d * 46) * (speed / 200);
        const x = genX + gap, w = first ? 420 : rnd(120 - d * 40, 280 - d * 100), y = first ? 170 : clamp(genY + rnd(-40, 36), 115, 188);
        plats.push({ x, y, w });
        if (!first && w > 130 && Math.random() < 0.3 + d * 0.4) { const n = Math.random() < d * 0.6 ? 2 : 1; spikes.push({ x: x + rnd(50, w - 50), y, n }); }
        if (Math.random() < 0.45) { const n = Math.min(6, Math.floor((w - 40) / 18)); for (let i = 0; i < n; i++) coins.push({ x: x + 26 + i * 18, y: y - 20, got: 0 }); }
        if (gap > 40 && Math.random() < 0.6) for (let i = 0; i < 5; i++) { const q = i / 4; coins.push({ x: genX + gap * q, y: Math.min(y, genY) - 34 - Math.sin(q * Math.PI) * 34, got: 0 }); }
        if (!first && w > 180 && Math.random() < 0.35) { const fx = x + w * rnd(0.2, 0.5); plats.push({ x: fx, y: y - 58, w: 70, float: true }); for (let i = 0; i < 3; i++) coins.push({ x: fx + 17 + i * 18, y: y - 78, got: 0 }); }
        genX = x + w; genY = y;
      }
      const cut = cam - 80;
      plats = plats.filter((q) => q.x + q.w > cut); coins = coins.filter((q) => q.x > cut); spikes = spikes.filter((q) => q.x > cut);
    }
    function die(reason) { if (state !== 'play') return; state = 'dead'; deadT = 0; why = reason; p.vy = -260; shake = 0.35; env.buzz();
      for (let i = 0; i < 18; i++) parts.push({ x: p.x, y: p.y - 10, vx: rnd(-120, 120), vy: rnd(-220, -40), r: rnd(0, 6), vr: rnd(-8, 8), life: rnd(0.8, 1.4), kind: 'feather' }); }
    function dust(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-6, 6), y, vx: rnd(-60, 20), vy: rnd(-50, -10), life: rnd(0.25, 0.5), kind: 'dust' }); }
    function tick(dt) {
      gt += dt; if (shake > 0) shake -= dt; if (state === 'over') overT += dt;
      parts = parts.filter((q) => { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.kind === 'feather' ? 300 : 120) * dt; if (q.kind === 'feather') { q.vx *= 0.98; q.r += q.vr * dt; } return q.life > 0; });
      for (const cn of coins) if (cn.got) cn.got += dt;
      if (state === 'ready') return;
      if (state === 'dead' || state === 'over') { p.vy += GR * dt; p.y += p.vy * dt; p.x += 40 * dt; deadT += dt; if (state === 'dead' && deadT > 1.1) { state = 'over'; overT = 0; const sc = scoreNow(); newBest = sc > best; if (newBest) { best = sc; env.save('run', best); } } return; }
      speed = Math.min(330, 175 + dist * 0.011);
      const px = p.x, py = p.y; p.x += speed * dt; dist += speed * dt;
      buffer -= dt; coyote -= dt;
      if (buffer > 0) {
        if (p.ground || coyote > 0) { p.vy = -JV; jumps = 1; buffer = 0; coyote = 0; p.ground = false; dust(p.x, p.y, 5); }
        else if (jumps < 2) { p.vy = -JV2; jumps = 2; buffer = 0; for (let i = 0; i < 8; i++) parts.push({ x: p.x, y: p.y - 6, vx: rnd(-90, 30), vy: rnd(-30, 60), r: rnd(0, 6), vr: rnd(-6, 6), life: 0.5, kind: 'feather' }); }
      }
      if (!jumpHeld && p.vy < -CUT) p.vy = -CUT; // let go early for a short hop
      p.vy = Math.min(p.vy + GR * dt * (p.vy > 0 ? 1.15 : 1), 900); p.y += p.vy * dt;
      const was = p.ground; p.ground = false;
      for (const q of plats) {
        if (p.x + PW2 <= q.x || p.x - PW2 >= q.x + q.w) continue;
        if (p.vy >= 0 && py <= q.y + 0.5 && p.y >= q.y) { p.y = q.y; p.vy = 0; p.ground = true; jumps = 0; coyote = 0.09; if (!was) dust(p.x, p.y, 6); continue; }
        if (!q.float && p.y > q.y + 5 && px + PW2 <= q.x + 1) { die('Bonk!'); return; } // ran into the side of a ledge
      }
      if (!p.ground && was && jumps === 0) jumps = 1; // walking off an edge still leaves the second jump
      if (p.y > camY + VHd + 60 || p.y > 420) { die('Splat!'); return; }
      for (const sp of spikes) { const w = 12 * sp.n; if (Math.abs(p.x - sp.x) < w / 2 + PW2 - 3 && p.y > sp.y - 10 && p.y - PH < sp.y) { die('Ouch!'); return; } }
      for (const cn of coins) if (!cn.got && Math.abs(cn.x - p.x) < 12 && Math.abs(cn.y - (p.y - PH / 2)) < 15) { cn.got = 0.001; coinN++; env.buzz(); }
      cam = p.x - VWd * 0.26;
      const base = 168 - VHd * 0.74, want = Math.min(base, p.y - VHd * 0.4); camY += (want - camY) * Math.min(1, dt * 4);
      gen();
    }

    // ---- drawing
    function goose(c, x, y, t, air, dead) { // side view, running to the right; (x, y) is the feet
      c.save(); c.translate(x, y);
      if (dead) c.rotate(deadT * 9);
      else if (air) c.rotate(clamp(p.vy / 1400, -0.25, 0.3));
      const run = air ? 0 : t * speed / 9, l1 = Math.sin(run) * 5, l2 = Math.sin(run + Math.PI) * 5;
      c.strokeStyle = '#2a2d33'; c.lineWidth = 1.6; c.lineCap = 'round';
      for (const l of air ? [2, -1] : [l1, l2]) { c.beginPath(); c.moveTo(0, -8); c.lineTo(l * 0.6, -3); c.lineTo(l, 0); c.stroke(); c.beginPath(); c.moveTo(l - 1, 0); c.lineTo(l + 3, 0); c.stroke(); }
      const bob = air ? 0 : Math.abs(Math.sin(run)) * 1.2;
      c.translate(0, -bob);
      c.fillStyle = '#f2efe8'; c.beginPath(); c.ellipse(-6, -11, 4, 3, 0.3, 0, 7); c.fill();
      c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(0, -13, 9, 6, -0.1, 0, 7); c.fill();
      const wing = air ? Math.sin(t * 22) * 0.6 - 0.3 : 0;
      c.save(); c.translate(-1, -14); c.rotate(wing); c.fillStyle = '#6e604f'; c.beginPath(); c.ellipse(-2, 0, 7, 3.4, 0.15, 0, 7); c.fill(); c.restore();
      c.strokeStyle = '#1f2024'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(5, -16); c.quadraticCurveTo(8, -22, 7, -27); c.stroke();
      c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(8.5, -28, 3.6, 2.8, 0.2, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(7.2, -26.4, 1.8, 1.1, 0.3, 0, 7); c.fill();
      c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(11, -29); c.lineTo(15, -27.6); c.lineTo(11, -26.4); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(9.4, -29, 0.9, 0, 7); c.fill();
      c.restore();
    }
    function hills(c, par, base, amp, col, f, seed) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W + 10; x += 10) { const u = (x / s + cam * par) / 260; c.lineTo(x, base - amp * (0.6 + 0.25 * Math.sin(u * f + seed) + 0.15 * Math.sin(u * f * 2.7 + seed * 3))); }
      c.lineTo(W, H); c.closePath(); c.fill();
    }
    function scene(c, t) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9fd6e8'); g.addColorStop(1, '#eef7f5'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const hz = (168 - camY) * s;
      c.fillStyle = 'rgba(255,240,200,.55)'; c.beginPath(); c.arc(W * 0.78, hz * 0.35, 26 * s, 0, 7); c.fill(); c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(W * 0.78, hz * 0.35, 18 * s, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 5; i++) { const x = ((i * 157 - cam * 0.08 * s) % (W + 200) + W + 200) % (W + 200) - 100, y = hz * (0.2 + (i % 3) * 0.12); c.beginPath(); c.ellipse(x, y, 30 * s * 0.6, 9 * s * 0.6, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + 12 * s * 0.6, y - 5 * s * 0.6, 16 * s * 0.6, 10 * s * 0.6, 0, 0, 7); c.fill(); }
      hills(c, 0.15, hz - 10 * s, 60 * s, '#b9ddd3', 5, 1);
      hills(c, 0.35, hz + 6 * s, 42 * s, '#9fd0ad', 7, 2);
      c.save(); c.scale(s, s); c.translate(-cam, -camY);
      for (const q of plats) {
        if (q.float) { c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, q.x + 2, q.y + 3, q.w, 9, 4); c.fill(); c.fillStyle = '#b07a4f'; rr(c, q.x, q.y, q.w, 9, 4); c.fill(); c.fillStyle = '#8a5a3b'; for (let x = q.x + 14; x < q.x + q.w - 4; x += 16) c.fillRect(x, q.y + 2, 1.4, 5); c.fillStyle = '#7cc576'; rr(c, q.x - 1, q.y - 2, q.w + 2, 4, 2); c.fill(); continue; }
        const bot = camY + VHd + 40, gr = c.createLinearGradient(0, q.y, 0, q.y + 120); gr.addColorStop(0, '#c99a6a'); gr.addColorStop(1, '#9c6f48');
        c.fillStyle = gr; rr(c, q.x, q.y, q.w, bot - q.y, 6); c.fill();
        c.fillStyle = 'rgba(90,60,35,.25)'; for (let y = q.y + 22; y < bot; y += 18) c.fillRect(q.x + 4, y, q.w - 8, 2);
        c.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < q.w / 24; i++) { const a = Math.sin(q.x * 0.13 + i * 7.1) * 0.5 + 0.5; c.beginPath(); c.arc(q.x + 10 + i * 24, q.y + 30 + a * 40, 2 + a * 1.5, 0, 7); c.fill(); }
        c.fillStyle = '#6cb565'; rr(c, q.x - 2, q.y - 3, q.w + 4, 11, 5); c.fill(); c.fillStyle = '#86cf7c'; rr(c, q.x - 2, q.y - 3, q.w + 4, 5, 3); c.fill();
        c.fillStyle = '#6cb565'; for (let x = q.x + 6; x < q.x + q.w - 4; x += 9) { c.beginPath(); c.moveTo(x, q.y - 2); c.lineTo(x + 2, q.y - 6 - (x % 3)); c.lineTo(x + 4, q.y - 2); c.fill(); }
      }
      for (const sp of spikes) for (let i = 0; i < sp.n * 2; i++) { const x = sp.x - sp.n * 6 + i * 6; c.fillStyle = '#9aa1ab'; c.beginPath(); c.moveTo(x, sp.y); c.lineTo(x + 3, sp.y - 11); c.lineTo(x + 6, sp.y); c.closePath(); c.fill(); c.fillStyle = '#d5dae1'; c.beginPath(); c.moveTo(x + 1.6, sp.y - 2); c.lineTo(x + 3, sp.y - 10); c.lineTo(x + 3.2, sp.y - 2); c.closePath(); c.fill(); }
      for (const cn of coins) {
        if (cn.got > 0.35) continue;
        const up = cn.got ? cn.got * 60 : 0, sc = Math.abs(Math.cos(t * 4 + cn.x * 0.05)); c.globalAlpha = cn.got ? 1 - cn.got / 0.35 : 1;
        c.fillStyle = '#d99a1e'; c.beginPath(); c.ellipse(cn.x, cn.y - up, 5.5 * Math.max(0.15, sc), 5.5, 0, 0, 7); c.fill();
        c.fillStyle = GOLD; c.beginPath(); c.ellipse(cn.x, cn.y - up, 4.2 * Math.max(0.1, sc), 4.2, 0, 0, 7); c.fill();
        c.fillStyle = '#ffe9a8'; c.fillRect(cn.x - 0.8 * sc, cn.y - up - 2.6, 1.6 * sc, 5.2); c.globalAlpha = 1;
      }
      goose(c, p.x, p.y, t, !p.ground, state === 'dead' || state === 'over');
      for (const q of parts) { const a = Math.min(1, q.life * 2); c.globalAlpha = a;
        if (q.kind === 'dust') { c.fillStyle = '#e3d3bd'; c.beginPath(); c.arc(q.x, q.y, 2.4 * (1.4 - a * 0.4), 0, 7); c.fill(); }
        else { c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.fillStyle = Math.round(q.r * 10) % 3 ? '#8b7a66' : '#f2efe8'; c.beginPath(); c.ellipse(0, 0, 3.4, 1.3, 0, 0, 7); c.fill(); c.restore(); } }
      c.globalAlpha = 1;
      c.restore();
    }
    function start() { if (state === 'over' && overT < 0.6) return; g.reset(); state = 'play'; buffer = 0.12; jumpHeld = true; }
    function press() { if (state === 'ready' || state === 'over') { start(); return; } if (state === 'play' && !jumpHeld) { buffer = 0.12; jumpHeld = true; } } // (a key held down repeats; only a fresh press jumps)

    const g = {
      resize(w, h) { W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3); s = Math.min(H / 230, W / 250); VWd = W / s; VHd = H / s; if (p) { cam = p.x - VWd * 0.26; camY = 168 - VHd * 0.74; } },
      reset() {
        state = 'ready'; p = { x: 60, y: 170, vy: 0, ground: true }; plats = []; coins = []; spikes = []; parts = [];
        speed = 175; dist = 0; coinN = 0; genX = 0; genY = 170; jumpHeld = false; buffer = 0; coyote = 0; jumps = 0; shake = 0; newBest = false; why = '';
        cam = p.x - VWd * 0.26; camY = 168 - VHd * 0.74; gen();
      },
      step(dt) { dt = Math.min(dt, 0.05); const n = Math.ceil(dt / 0.009); for (let i = 0; i < n; i++) tick(dt / n); },
      draw(c, t) {
        c.save(); if (shake > 0) c.translate(rnd(-1, 1) * shake * 12, rnd(-1, 1) * shake * 12);
        scene(c, t); c.restore();
        if (state !== 'ready') {
          c.fillStyle = INK; font(c, 800, 24 * k); c.fillText(String(scoreNow()), 14 * k, 32 * k);
          const cx = 20 * k, cy = 50 * k; c.fillStyle = GOLD; c.beginPath(); c.arc(cx, cy, 6 * k, 0, 7); c.fill(); c.fillStyle = INK; font(c, 700, 14 * k); c.fillText('× ' + coinN, cx + 11 * k, cy + 5 * k);
          c.textAlign = 'right'; c.fillStyle = MUTE; font(c, 600, 13 * k); c.fillText('Best ' + Math.max(best, scoreNow()), W - 14 * k, 26 * k); c.textAlign = 'left';
        }
        if (state === 'ready') banner(c, W, H, 'Goose Run', (env.touch ? 'Tap to jump, hold for higher, tap again in the air to jump twice' : 'A or Up jumps · hold for higher · press again in the air') + '\n' + startWord(env), env, true);
        if (state === 'over') banner(c, W, H, why, 'Score ' + scoreNow() + ' · ' + coinN + ' coins' + (newBest ? ' · new best!' : '') + '\n' + againWord(env), env, true);
      },
      key(k2) { if (k2 === 'a' || k2 === 'up') { press(); return true; } return false; },
      release(k2) { if (k2 === 'all' || k2 === 'ptr' || k2 === 'a' || k2 === 'up') jumpHeld = false; },
      pointer(type) { if (type === 'down') press(); else if (type === 'up') jumpHeld = false; },
      hud: () => ['Score ' + scoreNow(), 'Best ' + Math.max(best, scoreNow())],
    };
    return g;
  }

  /* ---------------- Pinball ----------------
     A 100 x 160 table: flippers, pop bumpers, slingshots, drop targets, HONK rollover lanes, a nest that grabs the ball,
     a plunger and a ball save. On a wide screen the sides hold the score. */
  function pinball(env) {
    const TW = 100, TH = 160, BR = 2.2, G = 175, SUB = 1 / 600, FL = 14, A0 = 0.5, A1 = -0.52, MAXV = 300;
    let W = 400, H = 300, s = 2, ox = 0, oy = 0, k = 1, gt = 0;
    let state, ball, balls, score, mult, lanes, laneCd, tgt, tgtT, nestT, saveT, msg, msgT, parts, flash, charge, overT, newBest, lastHit;
    let best = env.load('pinball');
    const held = { left: false, right: false, up: false, down: false, a: false };
    let tl = 0, tr = 0, tc = 0;
    const FLIP = [{ x: 28, y: 140, a: A0, w: 0, side: 1 }, { x: 64, y: 140, a: A0, w: 0, side: -1 }];
    const walls = [], wall = (pts, e, tag) => { for (let i = 0; i < pts.length - 1; i++) walls.push({ a: pts[i], b: pts[i + 1], e: e === undefined ? 0.45 : e, tag }); };
    const arc = []; for (let i = 0; i <= 30; i++) { const t = Math.PI + i / 30 * Math.PI; arc.push([50 + Math.cos(t) * 46, 46 + Math.sin(t) * 46]); }
    const OUTLINE = [[4, 170], [4, 46]].concat(arc.slice(1, -1)).concat([[96, 46], [96, 170]]);
    wall(OUTLINE);
    wall([[88, 170], [88, 58]]);                                   // the shooter lane's inner wall
    wall([[10, 102], [10, 126], [27, 138.6]]); wall([[82, 102], [82, 126], [65, 138.6]]); // inlane guides
    wall([[17, 107], [17, 120], [25, 127.5]], 0.35); walls.push({ a: [25, 127.5], b: [17, 107], e: 0.5, tag: 'sling' });
    wall([[75, 107], [75, 120], [67, 127.5]], 0.35); walls.push({ a: [67, 127.5], b: [75, 107], e: 0.5, tag: 'sling' });
    for (const x of [24, 36, 48, 60, 72]) wall([[x, 13], [x, 23]], 0.4);
    const GATE = { a: [88, 58], b: [96, 50], e: 0.3 };
    const BUMP = [[34, 42, 5], [58, 40, 5], [46, 58, 5.5]];
    const TGT = [[30, 37], [42.5, 49.5], [55, 62]], TY = 84, NEST = [14, 66], LET = 'HONK', LANE_X = [30, 42, 54, 66];

    function newBall() { ball = { x: 92, y: 150, vx: 0, vy: 0, plunge: true, nest: 0 }; charge = 0; }
    function say(t, d) { msg = t; msgT = d || 1.6; }
    function add(n, x, y) { score += n * mult; if (x !== undefined) parts.push({ txt: String(n * mult), x, y, t: 0.7 }); }
    function sparks(x, y, col, n) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(20, 70); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rnd(0.25, 0.5), col }); } }
    function collide(a, b, rad, e, u) { // the ball against a capsule from a to b; u: velocity of the surface there
      const ex = b[0] - a[0], ey = b[1] - a[1], t = clamp(((ball.x - a[0]) * ex + (ball.y - a[1]) * ey) / (ex * ex + ey * ey), 0, 1);
      const qx = a[0] + ex * t, qy = a[1] + ey * t, dx = ball.x - qx, dy = ball.y - qy, d = Math.hypot(dx, dy), R = BR + rad;
      if (d >= R || d === 0) return null;
      const nx = dx / d, ny = dy / d; ball.x = qx + nx * R; ball.y = qy + ny * R;
      const ux = u ? u[0] : 0, uy = u ? u[1] : 0, vn = (ball.vx - ux) * nx + (ball.vy - uy) * ny;
      if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; }
      return { nx, ny, vn, qx, qy };
    }
    function drain() {
      if (saveT > 0) { saveT = 0; say('BALL SAVED'); newBall(); env.buzz(); return; }
      balls--; env.buzz();
      if (balls <= 0) { state = 'over'; overT = 0; newBest = score > best; if (newBest) { best = score; env.save('pinball', best); } return; }
      say('BALL ' + (4 - balls)); newBall();
    }
    function sub(h) {
      for (const f of FLIP) { // flippers swing up fast and fall back a little slower
        const up = f.side > 0 ? held.left || held.up || tl : held.right || held.up || tr, goal = up ? A1 : A0, prev = f.a;
        f.a = goal < f.a ? Math.max(goal, f.a - 32 * h) : Math.min(goal, f.a + 16 * h); f.w = (f.a - prev) / h * f.side;
      }
      if (ball.plunge || ball.nest > 0) return;
      ball.vy += G * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
      const inLane = ball.x > 88 && ball.y > 52;
      for (const w of walls) { const c = collide(w.a, w.b, 0.8, w.e); if (c && w.tag === 'sling' && c.vn < -15) { ball.vx += c.nx * 70; ball.vy += c.ny * 70; add(10); flash.sling = 0.15; sparks(ball.x, ball.y, '#ff8a7d', 6); env.buzz(); } }
      if (!inLane) collide(GATE.a, GATE.b, 0.6, GATE.e);
      TGT.forEach(([x1, x2], i) => { if (!tgt[i]) return; const c = collide([x1, TY], [x2, TY], 1, 0.5); if (c) { tgt[i] = 0; add(250, (x1 + x2) / 2, TY - 4); sparks((x1 + x2) / 2, TY, '#ffb46b', 10); env.buzz(); if (!tgt.some(Boolean)) { add(2500); say('TARGETS! +' + (2500 * mult).toLocaleString()); tgtT = 1.2; } } });
      BUMP.forEach(([x, y, r], i) => {
        const dx = ball.x - x, dy = ball.y - y, d = Math.hypot(dx, dy); if (d >= r + BR || d === 0) return;
        const nx = dx / d, ny = dy / d; ball.x = x + nx * (r + BR); ball.y = y + ny * (r + BR);
        const sp = Math.max(95, Math.hypot(ball.vx, ball.vy) * 0.9); ball.vx = nx * sp; ball.vy = ny * sp;
        flash['b' + i] = 0.18; add(100, x, y - r - 2); sparks(x + nx * r, y + ny * r, GOLD, 8); env.buzz();
      });
      for (const f of FLIP) {
        const th = f.side > 0 ? f.a : Math.PI - f.a, tip = [f.x + Math.cos(th) * FL, f.y + Math.sin(th) * FL];
        const dx = ball.x - f.x, dy = ball.y - f.y, u = [-f.w * dy, f.w * dx];
        collide([f.x, f.y], tip, 1.6, 0.2, u);
      }
      LANE_X.forEach((x, i) => { if (laneCd[i] <= 0 && Math.abs(ball.x - x) < 5 && ball.y > 15 && ball.y < 22) { laneCd[i] = 0.6; if (!lanes[i]) { lanes[i] = 1; add(500, x, 12); } if (lanes.every(Boolean)) { mult = Math.min(5, mult + 1); lanes = [0, 0, 0, 0]; say('H-O-N-K!  x' + mult); sparks(48, 18, GOLD, 24); } } });
      const nd = Math.hypot(ball.x - NEST[0], ball.y - NEST[1]);
      if (nd < 2.6 && !(ball.nestCd > 0) && Math.hypot(ball.vx, ball.vy) < 170) { ball.nest = 1.2; ball.x = NEST[0]; ball.y = NEST[1]; ball.vx = ball.vy = 0; add(1500, NEST[0], NEST[1] - 5); say('GOOSE NEST'); env.buzz(); }
      const sp = Math.hypot(ball.vx, ball.vy); if (sp > MAXV) { ball.vx *= MAXV / sp; ball.vy *= MAXV / sp; }
      ball.still = sp < 3 && ball.y < 136 ? (ball.still || 0) + h : 0; if (ball.still > 2.5) { ball.still = 0; ball.vy = -70; ball.vx = rnd(-30, 30); say('NUDGE', 0.8); } // never let the ball sit stuck
      if (ball.y > 150 && ball.x > 88 && !ball.plunge && ball.vy > 0) { if (ball.y > 152) { ball.plunge = true; ball.x = 92; ball.y = 150; ball.vx = ball.vy = 0; } } // fell back down the lane
      if (ball.y > 168) drain();
    }
    function start() { if (state === 'over' && overT < 0.8) return; g.reset(); state = 'play'; say('BALL 1'); }

    // ---- drawing (table units)
    const path = (c, p) => { c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
    function table(c) {
      c.save(); path(c, OUTLINE); c.closePath();
      const gr = c.createLinearGradient(0, 0, 0, TH); gr.addColorStop(0, '#12566d'); gr.addColorStop(1, '#082a37'); c.fillStyle = gr; c.fill(); c.clip();
      const gl = c.createRadialGradient(46, 70, 4, 46, 70, 70); gl.addColorStop(0, 'rgba(120,230,255,.18)'); gl.addColorStop(1, 'rgba(120,230,255,0)'); c.fillStyle = gl; c.fillRect(0, 0, TW, TH);
      c.globalAlpha = 0.13; fit(c, env.pic('goose'), 46, 100, 54, 54); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 0.4; for (let y = 8; y < TH; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(TW, y); c.stroke(); }
      [[20, 116, -0.4], [72, 116, 0.4], [46, 100, 0]].forEach(([x, y, r], i) => { // arrows pointing up the table, chasing lights
        for (let j = 0; j < 3; j++) { const on = Math.floor(gt * 6) % 3 === j; c.save(); c.translate(x, y - j * 5); c.rotate(r); c.fillStyle = on ? 'rgba(255,214,107,.9)' : 'rgba(255,214,107,.18)'; c.beginPath(); c.moveTo(0, -2.2); c.lineTo(2.6, 1.2); c.lineTo(-2.6, 1.2); c.closePath(); c.fill(); c.restore(); } void i; });
      c.restore();
      c.fillStyle = '#e9eef2'; // slingshots
      [[[17, 107], [17, 120], [25, 127.5]], [[75, 107], [75, 120], [67, 127.5]]].forEach((t) => { path(c, t); c.closePath(); c.fill(); c.strokeStyle = flash.sling > 0 ? '#ffd6d0' : RED; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(t[2][0], t[2][1]); c.lineTo(t[0][0], t[0][1]); c.stroke(); });
      const chrome = (draw) => { c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#04121a'; c.lineWidth = 2.6; draw(); c.strokeStyle = '#a9b8c4'; c.lineWidth = 1.6; draw(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.45; draw(); };
      chrome(() => { path(c, OUTLINE); c.stroke(); for (const w of walls) if (!w.tag) { c.beginPath(); c.moveTo(w.a[0], w.a[1]); c.lineTo(w.b[0], w.b[1]); c.stroke(); } c.beginPath(); c.moveTo(GATE.a[0], GATE.a[1]); c.lineTo(GATE.b[0], GATE.b[1]); c.stroke(); });
      LANE_X.forEach((x, i) => { const on = lanes[i] || (state === 'ready' && Math.floor(gt * 3 + i) % 4 === 0);
        if (on) { c.fillStyle = 'rgba(255,214,107,.35)'; c.beginPath(); c.arc(x, 28, 4.2, 0, 7); c.fill(); }
        c.fillStyle = on ? GOLD : 'rgba(255,214,107,.22)'; c.beginPath(); c.arc(x, 28, 2.8, 0, 7); c.fill();
        c.fillStyle = on ? '#3b2a00' : 'rgba(255,255,255,.5)'; font(c, 800, 3); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(LET[i], x, 28.2); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; });
      BUMP.forEach(([x, y, r], i) => { const f = flash['b' + i] > 0;
        if (f) { c.fillStyle = 'rgba(255,214,107,.45)'; c.beginPath(); c.arc(x, y, r + 3, 0, 7); c.fill(); }
        c.fillStyle = '#04121a'; c.beginPath(); c.arc(x + 0.4, y + 0.8, r, 0, 7); c.fill();
        c.fillStyle = f ? '#fff4d2' : '#e8edf1'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        const cg = c.createRadialGradient(x - 1, y - 1.2, 0.3, x, y, r * 0.75); cg.addColorStop(0, f ? '#fff' : '#ffe08a'); cg.addColorStop(1, f ? GOLD : '#e0a21b'); c.fillStyle = cg; c.beginPath(); c.arc(x, y, r * 0.72, 0, 7); c.fill();
        c.fillStyle = '#5a3d00'; font(c, 800, 2.6); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('100', x, y + 0.2); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; });
      TGT.forEach(([x1, x2], i) => { if (tgt[i]) { c.fillStyle = '#ff9f43'; rr(c, x1, TY - 1.4, x2 - x1, 2.8, 0.8); c.fill(); c.fillStyle = '#fff'; c.fillRect(x1 + 1, TY - 0.3, x2 - x1 - 2, 0.6); } else { c.strokeStyle = 'rgba(255,159,67,.35)'; c.lineWidth = 0.5; rr(c, x1, TY - 1.4, x2 - x1, 2.8, 0.8); c.stroke(); } });
      c.fillStyle = '#04121a'; c.beginPath(); c.arc(NEST[0], NEST[1], 3.4, 0, 7); c.fill();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, on = Math.floor(gt * 8) % 8 === i || ball.nest > 0; c.fillStyle = on ? '#9ff0ff' : 'rgba(159,240,255,.25)'; c.beginPath(); c.arc(NEST[0] + Math.cos(a) * 5, NEST[1] + Math.sin(a) * 5, 0.6, 0, 7); c.fill(); }
      for (const f of FLIP) { // tapered flippers
        const th = f.side > 0 ? f.a : Math.PI - f.a, L2 = FL, r0 = 2.3, r1 = 1.2;
        c.save(); c.translate(f.x, f.y); c.rotate(th);
        c.fillStyle = '#04121a'; c.beginPath(); c.arc(0.4, 0.8, r0, Math.PI / 2, -Math.PI / 2); c.lineTo(L2 + 0.4, -r1 + 0.8); c.arc(L2 + 0.4, 0.8, r1, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fill();
        c.fillStyle = '#f4f6f8'; c.beginPath(); c.arc(0, 0, r0, Math.PI / 2, -Math.PI / 2); c.lineTo(L2, -r1); c.arc(L2, 0, r1, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fill();
        c.strokeStyle = RED; c.lineWidth = 0.7; c.stroke(); c.fillStyle = '#a9b8c4'; c.beginPath(); c.arc(0, 0, 0.9, 0, 7); c.fill(); c.restore();
      }
      const py = 153 + charge * 8; // the plunger
      c.strokeStyle = '#a9b8c4'; c.lineWidth = 0.6; c.beginPath(); for (let i = 0; i <= 8; i++) { const y = py + 2 + (166 - py - 2) * i / 8; c.lineTo(92 + (i % 2 ? 2 : -2), y); } c.stroke();
      c.fillStyle = RED; rr(c, 89.5, py - 0.6, 5, 2.4, 1); c.fill();
      if (ball.y < 172) { // the ball, a little chrome sphere
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(ball.x + 0.6, ball.y + 1, BR, 0, 7); c.fill();
        const bg = c.createRadialGradient(ball.x - 0.8, ball.y - 0.9, 0.2, ball.x, ball.y, BR); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.45, '#cfd8e0'); bg.addColorStop(1, '#6b7885'); c.fillStyle = bg; c.beginPath(); c.arc(ball.x, ball.y, BR, 0, 7); c.fill();
      }
      for (const p of parts) { c.globalAlpha = Math.min(1, p.t * 3); if (p.txt) { c.fillStyle = '#fff'; font(c, 800, 3); c.textAlign = 'center'; c.fillText(p.txt, p.x, p.y); c.textAlign = 'left'; } else { c.fillStyle = p.col; c.fillRect(p.x - 0.4, p.y - 0.4, 0.8, 0.8); } } c.globalAlpha = 1;
    }
    function dmd(c, text, y, size) { // dot-matrix style lettering
      c.textAlign = 'center'; font(c, 800, size); c.fillStyle = 'rgba(255,170,60,.25)'; c.fillText(text, W / 2 + 1, y + 1); c.fillStyle = '#ffb347'; c.fillText(text, W / 2, y); c.textAlign = 'left';
    }
    function card(c, title, sub) {
      c.fillStyle = 'rgba(4,14,20,.66)'; c.fillRect(0, 0, W, H);
      const z = Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400)); c.textAlign = 'center';
      c.fillStyle = '#fff'; font(c, 800, 40 * z); c.fillText(title, W / 2, H / 2 - 6 * z);
      c.fillStyle = 'rgba(255,255,255,.78)'; font(c, 500, 16 * z); sub.split('\n').forEach((ln, i) => c.fillText(ln, W / 2, H / 2 + 28 * z + i * 23 * z)); c.textAlign = 'left';
    }

    const g = {
      resize(w, h) { W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3); s = Math.min(W / TW, H / TH) * 0.98; ox = (W - TW * s) / 2; oy = (H - TH * s) / 2; },
      reset() { state = 'ready'; balls = 3; score = 0; mult = 1; lanes = [0, 0, 0, 0]; laneCd = [0, 0, 0, 0]; tgt = [1, 1, 1]; tgtT = 0; saveT = 0; msg = ''; msgT = 0; parts = []; flash = {}; newBest = false; tl = tr = tc = 0; newBall(); },
      step(dt) {
        dt = Math.min(dt, 0.05); gt += dt; if (msgT > 0) msgT -= dt; if (state === 'over') overT += dt;
        for (const q in flash) flash[q] -= dt; for (let i = 0; i < 4; i++) laneCd[i] -= dt;
        parts = parts.filter((p) => { p.t -= dt; if (p.txt) p.y -= 8 * dt; else { p.x += p.vx * dt; p.y += p.vy * dt; } return p.t > 0; });
        if (tgtT > 0 && (tgtT -= dt) <= 0) tgt = [1, 1, 1];
        if (state !== 'play') return;
        if (saveT > 0) saveT -= dt;
        if (ball.nest > 0 && (ball.nest -= dt) <= 0) { ball.vx = 55; ball.vy = -150; ball.nest = 0; ball.nestCd = 1; }
        if (ball.nestCd > 0) ball.nestCd -= dt;
        if (ball.plunge) { // pull the plunger back while held, let go to fire
          if (held.down || held.a || tc) charge = Math.min(1, charge + dt / 0.8);
          else if (charge > 0.04) { ball.plunge = false; ball.vy = -(215 + charge * 85); if (saveT === 0 && !ball.saved) { saveT = 6; ball.saved = 1; } charge = 0; env.buzz(); }
        }
        const n = Math.ceil(dt / SUB); for (let i = 0; i < n && state === 'play'; i++) sub(dt / n);
      },
      draw(c) {
        const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1a24'); bg.addColorStop(1, '#050c12'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
        c.save(); c.translate(ox, oy); c.scale(s, s); table(c); c.restore();
        const wide = ox > 80 * k;
        if (wide) {
          const big = (label, val, x, y, al) => { c.textAlign = al; c.fillStyle = 'rgba(255,255,255,.5)'; font(c, 700, 11 * k); c.fillText(label, x, y); c.fillStyle = '#ffb347'; font(c, 800, 22 * k); c.fillText(val, x, y + 24 * k); c.textAlign = 'left'; };
          big('SCORE', score.toLocaleString(), 20 * k, 40 * k, 'left'); big('BEST', Math.max(best, score).toLocaleString(), 20 * k, 100 * k, 'left');
          big('BALL', state === 'over' ? '-' : String(4 - balls) + ' / 3', W - 20 * k, 40 * k, 'right'); big('MULTIPLIER', 'x' + mult, W - 20 * k, 100 * k, 'right');
          c.fillStyle = 'rgba(255,255,255,.4)'; font(c, 500, 11 * k); c.textAlign = 'right';
          (env.touch ? ['Left side: left flipper', 'Right side: right flipper'] : ['Left / right: flippers', 'Down or A: plunger']).forEach((l, i) => c.fillText(l, W - 20 * k, H - 40 * k + i * 16 * k)); c.textAlign = 'left';
        } else { c.fillStyle = '#ffb347'; font(c, 800, 14 * k); c.fillText(score.toLocaleString(), ox + 6 * k, oy + 16 * k); c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.6)'; font(c, 700, 11 * k); c.fillText('x' + mult + '  ·  ball ' + Math.min(3, 4 - balls), ox + TW * s - 6 * k, oy + 15 * k); c.textAlign = 'left'; }
        if (msgT > 0 && state === 'play') { c.globalAlpha = Math.min(1, msgT * 3); dmd(c, msg, oy + 76 * s, 18 * k); c.globalAlpha = 1; }
        if (state === 'play' && ball.plunge && !msgT) { c.globalAlpha = 0.6 + Math.sin(gt * 4) * 0.3; dmd(c, env.touch ? 'HOLD TO PULL, LET GO TO LAUNCH' : 'HOLD DOWN OR A, LET GO TO LAUNCH', oy + 76 * s, 11 * k); c.globalAlpha = 1; }
        if (state === 'ready') card(c, 'Pinball', (env.touch ? 'Tap the left or right side to flip' : 'Left / right flip · down or A launches') + '\nLight H-O-N-K for a multiplier\n' + startWord(env));
        if (state === 'over') card(c, 'Game over', 'Score ' + score.toLocaleString() + (newBest ? ' · new best!' : '') + '\n' + againWord(env));
      },
      key(k2) {
        if (state !== 'play') { if (k2 === 'a') { start(); return true; } return k2 in held; }
        if (k2 === 'l') k2 = 'left'; if (k2 === 'r') k2 = 'right';
        if (k2 in held) { held[k2] = true; return true; } return false;
      },
      release(k2) {
        if (k2 === 'l') k2 = 'left'; if (k2 === 'r') k2 = 'right';
        if (k2 === 'all') { for (const q in held) held[q] = false; tl = tr = tc = 0; } else if (k2 === 'ptr') tl = tr = tc = 0; else if (k2 in held) held[k2] = false;
      },
      pointer(type, x) {
        if (type === 'down') { if (state !== 'play') { start(); return; } if (ball.plunge) tc = 1; else if (x < W / 2) tl = 1; else tr = 1; return; }
        if (type === 'up') { tl = tr = tc = 0; }
      },
      hud: () => ['Score ' + score.toLocaleString(), state === 'play' ? 'Ball ' + (4 - balls) + '/3 · x' + mult : 'Best ' + best.toLocaleString()],
    };
    return g;
  }

  /* ---------------- Neon Tunnel ----------------
     You ride the inside wall of a 12-sided tunnel. Spin round it to slip through the gaps in the rings rushing at you. */
  function tunnel(env) {
    const N = 12, SEG = 2 * Math.PI / N, PZ = 1.6, FAR = 46, TAU = Math.PI * 2;
    let W = 400, H = 300, k = 1, cx = 200, cy = 150, F = 200, gt = 0;
    let state, ang, vAng, speed, dist, rings, nextZ, parts, shake, overT, newBest, gems, gemN, passed, deadT, streaks;
    let best = env.load('tunnel');
    const held = { left: false, right: false }; let ptr = 0;
    const md = (a) => ((a % TAU) + TAU) % TAU;
    const score = () => Math.floor(dist * 2) + gemN * 50;
    const hueNow = () => (200 + dist * 1.5) % 360;
    const blocked = (r, a) => r.mask[Math.floor(md(a - r.off) / SEG) % N];
    function spawn() {
      const d = Math.min(1, dist / 900), gap = d > 0.6 ? 2 : 3, pick = Math.random(), base = Math.floor(Math.random() * N);
      const ring = (mask, extra) => { rings.push(Object.assign({ z: nextZ, dep: 0.7, mask, off: 0, spin: 0, hit: false, done: false }, extra || {})); };
      const gapMask = (at, n) => Array.from({ length: N }, (_, i) => !(((i - at) % N + N) % N < n));
      if (pick < 0.32) { ring(gapMask(base, gap)); nextZ += rnd(5, 6.5) - d * 1.5; }
      else if (pick < 0.5) { const dir = Math.random() < 0.5 ? 1 : -1; for (let j = 0; j < 5; j++) { ring(gapMask(base + dir * j, gap + 1)); nextZ += 2.1 - d * 0.4; } nextZ += 3; } // a spiral: follow the gap round
      else if (pick < 0.66) { ring(Array.from({ length: N }, (_, i) => (i + base) % 4 < 2), {}); nextZ += 5.5 - d; }                        // teeth
      else if (pick < 0.82) { ring(Array.from({ length: N }, (_, i) => ((i - base + N) % N) < 6), { spin: (Math.random() < 0.5 ? 1 : -1) * (0.7 + d * 0.8) }); nextZ += 6 - d; } // a half ring that turns
      else { ring(gapMask(base, gap + 1)); nextZ += 2.6; ring(gapMask(base + 6, gap + 1)); nextZ += 5.5 - d; }                         // two doors on opposite sides
      if (Math.random() < 0.45) { const r = rings[rings.length - 1], open = []; for (let i = 0; i < N; i++) if (!r.mask[i]) open.push(i); if (open.length && !r.spin) gems.push({ z: r.z - 1.4, a: (open[Math.floor(open.length / 2)] + 0.5) * SEG + r.off, got: 0 }); }
    }
    function crash() { state = 'dead'; deadT = 0; shake = 0.5; env.buzz(); const h = hueNow();
      for (let i = 0; i < 40; i++) { const a = rnd(0, TAU), v = rnd(60, 260) * k; parts.push({ x: cx, y: cy + F / PZ * 0.86, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rnd(0.5, 1.1), col: `hsl(${(h + rnd(-40, 40)) % 360},95%,65%)` }); } }
    function start() { if (state === 'over' && overT < 0.7) return; g.reset(); state = 'play'; }
    const P = (a, r, z) => { const sa = a - ang + Math.PI / 2, f = F / z; return [cx + Math.cos(sa) * r * f, cy + Math.sin(sa) * r * f]; };
    function quad(c, a1, a2, r1, r2, z1, z2) { const p = [P(a1, r1, z1), P(a2, r1, z1), P(a2, r2, z2), P(a1, r2, z2)]; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 4; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); }

    const g = {
      resize(w, h) { W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3); cx = W / 2; cy = H / 2 - Math.min(W, H) * 0.06; F = Math.min(W, H) * 0.5 * PZ; },
      reset() { state = 'ready'; ang = SEG / 2; vAng = 0; speed = 6.5; dist = 0; rings = []; nextZ = 22; parts = []; shake = 0; newBest = false; gems = []; gemN = 0; passed = 0; deadT = 0; streaks = []; while (nextZ < FAR) spawn(); held.left = held.right = false; ptr = 0; },
      step(dt) {
        dt = Math.min(dt, 0.05); gt += dt; if (shake > 0) shake -= dt; if (state === 'over') overT += dt;
        parts = parts.filter((p) => { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; return p.t > 0; });
        if (state === 'dead') { deadT += dt; if (deadT > 1.1) { state = 'over'; overT = 0; const sc = score(); newBest = sc > best; if (newBest) { best = sc; env.save('tunnel', best); } } return; }
        const mv = state === 'play' ? speed : 3;
        for (const r of rings) { r.z -= mv * dt; r.off += r.spin * dt; } for (const gm of gems) gm.z -= mv * dt; nextZ -= mv * dt;
        while (nextZ < FAR) spawn();
        if (state === 'play') {
          dist += mv * dt; speed = Math.min(19, 6.5 + dist * 0.012);
          const want = ((held.left || ptr < 0 ? 1 : 0) - (held.right || ptr > 0 ? 1 : 0)) * (3.3 + speed * 0.06);
          vAng += (want - vAng) * Math.min(1, dt * 14); ang += vAng * dt;
          for (const r of rings) {
            if (!r.done && r.z <= PZ && r.z + r.dep >= PZ - 0.05) { if (blocked(r, ang - SEG * 0.26) || blocked(r, ang + SEG * 0.26)) { r.hit = true; crash(); return; } }
            if (!r.done && r.z + r.dep < PZ - 0.05) { r.done = true; passed++; }
          }
          for (const gm of gems) if (!gm.got && Math.abs(gm.z - PZ) < 0.45) { const d = Math.abs(((gm.a - ang) % TAU + TAU + Math.PI) % TAU - Math.PI); if (d < SEG * 0.6) { gm.got = 1; gemN++; env.buzz(); const [x, y] = P(gm.a, 0.86, PZ); for (let i = 0; i < 12; i++) { const a = rnd(0, TAU); parts.push({ x, y, vx: Math.cos(a) * 120 * k, vy: Math.sin(a) * 120 * k, t: 0.4, col: '#fff3b0' }); } } }
        } else ang += dt * 0.4;
        rings = rings.filter((r) => r.z + r.dep > 0.35); gems = gems.filter((gm) => gm.z > 0.35 && !(gm.got && gm.z < PZ - 0.5));
        if (Math.random() < speed * dt * 2) streaks.push({ a: rnd(0, TAU), z: FAR * 0.6, l: rnd(1, 3) }); streaks = streaks.filter((q) => { q.z -= mv * 2.2 * dt; return q.z > 0.6; });
      },
      draw(c, t) {
        c.save(); if (shake > 0) c.translate(rnd(-1, 1) * shake * 14 * k, rnd(-1, 1) * shake * 14 * k);
        const h = hueNow(), bg = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7); bg.addColorStop(0, '#000'); bg.addColorStop(1, `hsl(${h},45%,9%)`); c.fillStyle = bg; c.fillRect(-30, -30, W + 60, H + 60);
        c.globalCompositeOperation = 'lighter';
        const off = (dist % 2.5); // rings of the tunnel wall, sliding past
        for (let z = FAR - off; z > 0.6; z -= 2.5) { const a = Math.max(0, Math.min(1, (1 - z / FAR) * 1.3)) * 0.35; c.strokeStyle = `hsla(${h},90%,60%,${a})`; c.lineWidth = Math.max(0.6, 2.2 * k * PZ / z); c.beginPath(); for (let i = 0; i <= N; i++) { const [x, y] = P(i * SEG, 1, z); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
        for (let i = 0; i < N; i++) { const [x1, y1] = P(i * SEG, 1, 0.7), [x2, y2] = P(i * SEG, 1, FAR), gr = c.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, `hsla(${h},90%,60%,.4)`); gr.addColorStop(1, `hsla(${h},90%,60%,0)`); c.strokeStyle = gr; c.lineWidth = 1.2 * k; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
        for (const q of streaks) { const [x1, y1] = P(q.a, 0.6, q.z), [x2, y2] = P(q.a, 0.6, q.z + q.l); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
        c.globalCompositeOperation = 'source-over';
        const list = rings.slice().sort((a, b) => b.z - a.z);
        for (const r of list) { // the blocks: a lit front face and a darker top, fading in from the dark
          const z1 = Math.max(0.4, r.z), z2 = r.z + r.dep, behind = clamp((z2 - 0.6) / (PZ - 0.4), 0, 1), fade = Math.min(1, (1 - z1 / FAR) * 1.6) * behind, hh = (h + 150) % 360; // rings behind the ship fade away
          if (fade <= 0.01) continue;
          for (let i = 0; i < N; i++) { if (!r.mask[i]) continue; const a1 = i * SEG + r.off, a2 = a1 + SEG;
            quad(c, a1, a2, 0.62, 0.62, z1, z2); c.fillStyle = `hsla(${hh},90%,${18 + fade * 14}%,${fade * 0.9})`; c.fill();
            quad(c, a1, a2, 1, 0.62, z1, z1); const fg = c.createLinearGradient(...P(a1, 1, z1), ...P(a1, 0.62, z1)); fg.addColorStop(0, `hsla(${hh},100%,62%,${fade * 0.9})`); fg.addColorStop(1, `hsla(${(hh + 30) % 360},100%,45%,${fade * 0.75})`); c.fillStyle = fg; c.fill();
            const lw = Math.max(0.8, 2 * k * PZ / z1); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `hsla(${hh},100%,60%,${fade * 0.35})`; c.lineWidth = lw * 3.2; c.stroke();
            c.strokeStyle = `hsla(${hh},100%,${82 + (r.hit ? 15 : 0)}%,${fade})`; c.lineWidth = lw; c.stroke(); c.globalCompositeOperation = 'source-over'; }
        }
        for (const gm of gems) { if (gm.got) continue; const [x, y] = P(gm.a, 0.82, gm.z), sz = Math.max(1.5, 0.09 * F / gm.z), sp = gt * 4; c.fillStyle = 'rgba(255,240,170,.3)'; c.beginPath(); c.arc(x, y, sz * 1.7, 0, 7); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); for (let i = 0; i < 4; i++) { const a = sp + i * Math.PI / 2; c.lineTo(x + Math.cos(a) * sz, y + Math.sin(a) * sz); } c.closePath(); c.fill(); }
        if (state === 'play' || state === 'ready') { // the ship, always at the bottom: the tunnel turns round it
          const [x, y] = P(ang, 0.86, PZ), tilt = -vAng * 0.08, z = 15 * k;
          c.save(); c.translate(x, y); c.rotate(tilt);
          c.globalCompositeOperation = 'lighter'; c.fillStyle = `hsla(${(h + 40) % 360},100%,60%,.35)`; c.beginPath(); c.ellipse(0, z * 0.3, z * 1.3, z * 0.55, 0, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
          c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -z * 0.9); c.lineTo(z, z * 0.45); c.lineTo(0, z * 0.15); c.lineTo(-z, z * 0.45); c.closePath(); c.fill();
          c.fillStyle = `hsl(${(h + 40) % 360},100%,62%)`; c.beginPath(); c.moveTo(0, -z * 0.5); c.lineTo(z * 0.45, z * 0.28); c.lineTo(0, z * 0.1); c.lineTo(-z * 0.45, z * 0.28); c.closePath(); c.fill();
          c.restore();
        }
        for (const p of parts) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.fillRect(p.x - 2 * k, p.y - 2 * k, 4 * k, 4 * k); } c.globalAlpha = 1;
        c.restore();
        if (state !== 'ready') { c.fillStyle = '#fff'; font(c, 800, 24 * k); c.fillText(String(score()), 14 * k, 32 * k); c.fillStyle = 'rgba(255,255,255,.55)'; font(c, 600, 12 * k); c.fillText(Math.round(speed * 10) + ' km/h  ·  ' + gemN + ' gems', 14 * k, 50 * k); c.textAlign = 'right'; c.fillText('Best ' + Math.max(best, score()), W - 14 * k, 26 * k); c.textAlign = 'left'; }
        const card = (title, sub) => { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, W, H); const z = Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400)); c.textAlign = 'center'; c.fillStyle = '#fff'; font(c, 800, 40 * z); c.fillText(title, W / 2, H / 2 - 6 * z); c.fillStyle = 'rgba(255,255,255,.78)'; font(c, 500, 16 * z); sub.split('\n').forEach((ln, i) => c.fillText(ln, W / 2, H / 2 + 28 * z + i * 23 * z)); c.textAlign = 'left'; };
        if (state === 'ready') card('Neon Tunnel', (env.touch ? 'Hold the left or right side to spin' : 'Left / right spins you round the tunnel') + '\nSlip through the gaps · grab the gems\n' + startWord(env));
        if (state === 'over') card('Crashed', 'Score ' + score() + (newBest ? ' · new best!' : '') + '\n' + againWord(env));
      },
      key(k2) { if (k2 === 'a') { if (state === 'ready' || state === 'over') start(); return true; } if (k2 in held) { held[k2] = true; if (state === 'ready') start(); return true; } return k2 === 'up' || k2 === 'down'; },
      release(k2) { if (k2 === 'all') { held.left = held.right = false; ptr = 0; } else if (k2 === 'ptr') ptr = 0; else if (k2 in held) held[k2] = false; },
      pointer(type, x) { if (type === 'down') { if (state === 'ready' || state === 'over') { start(); return; } ptr = x < W / 2 ? -1 : 1; } else if (type === 'up') ptr = 0; else if (ptr) ptr = x < W / 2 ? -1 : 1; },
      hud: () => ['Score ' + score(), 'Best ' + Math.max(best, score())],
    };
    return g;
  }

  /* ---------------- Honk Arena ----------------
     A top-down arena wave shooter: the goose waddles round a walled meadow and honks at the nearest bot on its own.
     Genre and mechanics (auto-fire at the nearest enemy, spawn telegraphs, waves, power-ups, off-screen markers) were studied in
     jackrugile's Radius Raid (https://github.com/jackrugile/radius-raid-js13k, MIT licence, Copyright (c) Jack Rugile).
     No code, art, audio or level data from it is used: everything below is written and drawn here. */
  function arena(env) {
    const AW = 360, AH = 360, VIEW = 200, PR = 5.5, SPD = 92, DASH_V = 300, DASH_T = 0.17, DASH_CD = 1.25, MAXHP = 5, TILE = 40, COMBO_T = 2.2;
    let W = 400, H = 300, s = 2, k = 1, vw = 200, vh = 150, gt = 0;
    let state, P, cam, foes, spawns, bullets, shots, drops, parts, pops, later, queue, anchors, waveT, wave, score, comboN, comboT,
      shake, flashT, annT, ann, annSub, brk, boss, overT, newBest, fireT, drag, aHeld, dashId;
    let best = env.load('arena');
    const held = { up: false, down: false, left: false, right: false };
    const deco = Array.from({ length: 52 }, () => ({ x: rnd(16, AW - 16), y: rnd(16, AH - 16), k: Math.floor(rnd(0, 4)), a: rnd(0, 6.28) }));
    const ST = {
      chaser: { hp: 2, r: 6, sp: 46, pts: 50 }, mini: { hp: 1, r: 4.5, sp: 64, pts: 25 }, splitter: { hp: 5, r: 9, sp: 30, pts: 120 },
      shooter: { hp: 3, r: 7, sp: 38, pts: 150 }, brute: { hp: 14, r: 12, sp: 22, pts: 400 }, boss: { hp: 110, r: 24, sp: 18, pts: 3000 },
    };
    const POW = { spread: { col: GOLD, label: 'SPREAD SHOT' }, rapid: { col: '#ff8a3d', label: 'RAPID HONK' }, shield: { col: '#5fd0ff', label: 'SHIELD' }, heal: { col: RED, label: '+1 HEART' } };
    const diff = () => 1 + (wave - 1) * 0.07;
    const mult = () => Math.min(9, 1 + Math.floor(comboN / 5));
    const angDiff = (a, b) => { let d = (a - b) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; };
    const wallClamp = (o, r) => { let hit = false; if (o.x < r) { o.x = r; hit = true; } if (o.x > AW - r) { o.x = AW - r; hit = true; } if (o.y < r) { o.y = r; hit = true; } if (o.y > AH - r) { o.y = AH - r; hit = true; } return hit; };

    // ---- spawning and waves
    function mkFoe(type, x, y, o) {
      const st = ST[type], d = diff();
      const hpScale = type === 'boss' ? 1 + (wave / 5 - 1) * 0.6 : 1 + (wave - 1) * 0.06;
      const f = Object.assign({ type, x, y, vx: 0, vy: 0, t: 0, hit: 0, r: st.r, pts: st.pts, sp: st.sp * Math.min(1.6, Math.sqrt(d)), hp: Math.round(st.hp * hpScale),
        cd: rnd(1, 2.4), mode: 'walk', mt: 0, ca: 0, n: 0, ph: rnd(0, 6.28), side: Math.random() < 0.5 ? -1 : 1, dash: -1, aimT: 0 }, o || {});
      f.max = f.hp; foes.push(f); if (type === 'boss') boss = f; return f;
    }
    function spot(minD) { // a point in the arena that is not on top of the goose
      let x = AW / 2, y = AH / 2;
      for (let i = 0; i < 14; i++) { x = rnd(24, AW - 24); y = rnd(24, AH - 24); if (Math.hypot(x - P.x, y - P.y) > minD) break; }
      return { x, y };
    }
    function tele(type, x, y) { spawns.push({ type, x, y, t: 0, T: type === 'boss' ? 1.8 : 0.95, r: ST[type].r }); }
    function plan(n) {
      queue = []; anchors = {}; waveT = 0;
      if (n % 5 === 0) {
        queue.push({ t: 0.4, type: 'boss', boss: 1 });
        const extra = Math.min(8, Math.floor(n / 5) * 2); for (let i = 0; i < extra; i++) queue.push({ t: 5 + i * 2.6, type: i % 3 === 2 ? 'shooter' : 'chaser', g: 'b' + i, dx: 0, dy: 0 });
        return;
      }
      const types = ['chaser', 'chaser']; if (n >= 2) types.push('splitter'); if (n >= 3) types.push('shooter'); if (n >= 7) types.push('splitter', 'shooter');
      let count = Math.min(34, 5 + Math.round(n * 2.2)), t = 0.4, gi = 0; const gap = Math.max(0.32, 1.05 - n * 0.05);
      while (count > 0) {
        const size = Math.min(count, 1 + Math.floor(rnd(1, 3 + n * 0.3))), type = n === 1 ? 'chaser' : types[Math.floor(rnd(0, types.length))];
        for (let i = 0; i < size; i++) queue.push({ t: t + i * 0.1, type, g: 'g' + gi, dx: rnd(-22, 22), dy: rnd(-22, 22) });
        count -= size; gi++; t += gap * size;
      }
      const brutes = n >= 4 ? Math.min(4, Math.floor((n - 1) / 3)) : 0;
      for (let i = 0; i < brutes; i++) queue.push({ t: t * (i + 1) / (brutes + 1), type: 'brute', g: 'br' + i, dx: 0, dy: 0 });
      queue.sort((a, b) => a.t - b.t);
    }
    function releaseQ(q) {
      if (q.boss) { tele('boss', clamp(AW - P.x, 60, AW - 60), clamp(AH - P.y, 60, AH - 60)); return; }
      if (!anchors[q.g]) anchors[q.g] = spot(95);
      const a = anchors[q.g]; tele(q.type, clamp(a.x + q.dx, 16, AW - 16), clamp(a.y + q.dy, 16, AH - 16));
    }
    function say(a, b, d) { ann = a; annSub = b || ''; annT = d || 1.8; }

    // ---- effects
    function burst(x, y, n, size, cols, ring) {
      for (let i = 0; i < n && parts.length < 420; i++) { const a = rnd(0, 6.283), sp = rnd(25, 95) * size; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.3, 0.75), max: 0.75, r: rnd(0.8, 2.2) * size, col: cols[i % cols.length] }); }
      if (ring) parts.push({ ring: 1, x, y, life: 0.4, max: 0.4, r: 9 * size, col: ring });
    }
    function feathers(x, y, n) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), sp = rnd(20, 70); parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.7, 1.3), max: 1.3, r: rnd(1.6, 2.6), col: i % 3 ? '#8b7a66' : '#f2efe8', feather: 1, rot: rnd(0, 6) }); } }
    function pop(x, y, txt, col, sz, life) { if (pops.length > 46) pops.shift(); pops.push({ x, y, txt, col: col || '#fff', sz: sz || 6, t: life || 0.7, max: life || 0.7 }); }

    // ---- combat
    function damage(f, d, x, y) {
      if (f.dead) return;
      f.hp -= d; f.hit = 0.08; pop(x + rnd(-3, 3), y - 4, String(d), d > 1 ? GOLD : '#fff', d > 1 ? 7 : 5.5, 0.5);
      if (f.hp <= 0) kill(f);
    }
    function kill(f) {
      f.dead = true;
      const before = mult(); comboN++; comboT = COMBO_T; const m = mult(), pts = f.pts * m; score += pts;
      pop(f.x, f.y - f.r - 2, '+' + pts, m > 1 ? GOLD : '#fff', f.type === 'boss' ? 12 : 7.5, 0.9);
      if (m > before) { pop(P.x, P.y - 16, 'COMBO x' + m, GOLD, 9, 1.1); burst(P.x, P.y, 8, 0.6, [GOLD, '#fff']); }
      const big = f.type === 'boss' ? 3 : f.type === 'brute' ? 1.8 : f.type === 'splitter' ? 1.3 : 1;
      const col = { chaser: RED, mini: '#ff8fb1', splitter: '#9b7be0', shooter: GOLD, brute: '#7d8794', boss: RED }[f.type];
      burst(f.x, f.y, Math.round(14 * big), big, ['#fff', col, '#ffd66b'], 'rgba(255,230,170,1)'); shake = Math.max(shake, 0.12 * big);
      if (f.type === 'splitter') for (const sd of [-1, 1]) { const a = Math.atan2(f.y - P.y, f.x - P.x) + sd * 1.2; mkFoe('mini', f.x + Math.cos(a) * 5, f.y + Math.sin(a) * 5, { vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, cd: 0 }); }
      if (f.type === 'boss') {
        boss = null; shake = 0.7; flashT = 0.15;
        for (let i = 0; i < 7; i++) later.push({ t: 0.12 * (i + 1), fn: () => burst(f.x + rnd(-26, 26), f.y + rnd(-20, 20), 16, 1.5, ['#fff', '#ffd66b', RED], 'rgba(255,230,170,1)') });
        ['spread', 'rapid', 'heal'].forEach((kd, i) => drops.push({ x: f.x + (i - 1) * 18, y: f.y + 10, kind: kd, t: 0 }));
        say('MOWER DOWN!', 'the meadow is safe... for now', 2);
      } else if (Math.random() < (f.type === 'brute' ? 0.45 : f.type === 'shooter' || f.type === 'splitter' ? 0.09 : 0.05)) {
        const r = Math.random(), lowHp = P.hp <= 2;
        drops.push({ x: f.x, y: f.y, t: 0, kind: lowHp && r < 0.4 ? 'heal' : r < 0.3 ? 'spread' : r < 0.6 ? 'rapid' : r < 0.82 ? 'shield' : 'heal' });
      }
      env.buzz();
    }
    function hurt(sx, sy) {
      if (state !== 'play' || P.inv > 0) return;
      const a = Math.atan2(P.y - sy, P.x - sx); P.kx = Math.cos(a) * 160; P.ky = Math.sin(a) * 160;
      if (P.shield) { P.shield = false; P.inv = 0.9; burst(P.x, P.y, 16, 1, ['#5fd0ff', '#d9f6ff', '#fff'], 'rgba(120,220,255,1)'); pop(P.x, P.y - 14, 'BLOCKED', '#bff0ff', 7); shake = 0.2; env.buzz(); return; }
      P.hp--; P.inv = 1.2; P.hurtT = 1.2; shake = 0.35; flashT = 0.35; comboN = 0; comboT = 0; feathers(P.x, P.y, 12); env.buzz();
      if (P.hp <= 0) {
        state = 'over'; overT = 0; feathers(P.x, P.y, 26); burst(P.x, P.y, 30, 1.4, ['#fff', '#8b7a66', ACC, '#ffd66b'], 'rgba(255,255,255,1)'); shake = 0.6;
        newBest = score > best; if (newBest) { best = score; env.save('arena', best); }
      }
    }
    function dash() {
      if (state !== 'play' || P.dcd > 0 || P.dash > 0) return;
      const mx = (held.right ? 1 : 0) - (held.left ? 1 : 0), my = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      const a = mx || my ? Math.atan2(my, mx) : P.mdir;
      P.dvx = Math.cos(a) * DASH_V; P.dvy = Math.sin(a) * DASH_V; P.dash = DASH_T; P.dcd = DASH_CD; P.inv = Math.max(P.inv, DASH_T + 0.15); P.mdir = a; dashId++;
      burst(P.x, P.y, 8, 0.6, ['#ffffff', '#d7efe6'], 'rgba(200,255,240,1)');
    }
    function nearest(range) {
      let bf = null, bd = range;
      for (const f of foes) { if (f.dead) continue; const d = Math.hypot(f.x - P.x, f.y - P.y) - f.r; if (d < bd) { bd = d; bf = f; } }
      return bf;
    }
    function shoot(f, a, sp) { shots.push({ x: f.x + Math.cos(a) * f.r, y: f.y + Math.sin(a) * f.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.6 }); }

    // ---- per-frame updates
    function movePlayer(dt) {
      P.inv = Math.max(0, P.inv - dt); P.hurtT = Math.max(0, P.hurtT - dt); P.dcd = Math.max(0, P.dcd - dt); P.honk = Math.max(0, P.honk - dt);
      P.spread = Math.max(0, P.spread - dt); P.rapid = Math.max(0, P.rapid - dt); P.moving = Math.max(0, P.moving - dt);
      const mx = (held.right ? 1 : 0) - (held.left ? 1 : 0), my = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (P.dash > 0) {
        P.dash -= dt; P.x += P.dvx * dt; P.y += P.dvy * dt;
        if (parts.length < 420) parts.push({ ghost: 1, x: P.x, y: P.y, a: P.face, life: 0.18, max: 0.18 });
      } else if (mx || my) { const l = Math.hypot(mx, my); P.x += mx / l * SPD * dt; P.y += my / l * SPD * dt; P.mdir = Math.atan2(my, mx); P.moving = 0.1; }
      if (P.moving > 0 || P.dash > 0) P.walk += dt;
      P.x += P.kx * dt; P.y += P.ky * dt; const dmp = Math.pow(0.0005, dt); P.kx *= dmp; P.ky *= dmp;
      wallClamp(P, PR + 1);
      const tg = nearest(190);
      let want = P.mdir;
      if (tg) {
        P.aim = Math.atan2(tg.y - P.y, tg.x - P.x); want = P.aim;
        if ((fireT -= dt) <= 0) {
          fireT = P.rapid > 0 ? 0.095 : 0.2; const n = P.spread > 0 ? 3 : 1;
          for (let i = 0; i < n; i++) { const a = P.aim + (i - (n - 1) / 2) * 0.2; bullets.push({ x: P.x + Math.cos(a) * 9, y: P.y + Math.sin(a) * 9, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, life: 0.85, a }); }
          P.honk = 0.09;
        }
      } else fireT = Math.min(fireT, 0.05);
      P.face += angDiff(want, P.face) * Math.min(1, dt * 16);
    }
    function moveFoe(f, dt) {
      f.t += dt; if (f.hit > 0) f.hit -= dt;
      const tx = state === 'play' ? P.x : AW / 2 + Math.cos(gt * 0.3 + f.ph) * 120, ty = state === 'play' ? P.y : AH / 2 + Math.sin(gt * 0.3 + f.ph) * 120;
      const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const steer = (vx, vy, rate) => { const q = Math.min(1, dt * rate); f.vx += (vx - f.vx) * q; f.vy += (vy - f.vy) * q; };
      if (f.type === 'chaser' || f.type === 'mini' || f.type === 'splitter') {
        const wob = Math.sin(f.t * (f.type === 'splitter' ? 2 : 3.5) + f.ph) * (f.type === 'splitter' ? 0.6 : 0.35);
        steer((ux - uy * wob) * f.sp, (uy + ux * wob) * f.sp, f.type === 'mini' ? 2.5 : 4);
      } else if (f.type === 'shooter') {
        let want = d > 125 ? 1 : d < 80 ? -1 : 0;
        steer((ux * want - uy * f.side * 0.8) * f.sp, (uy * want + ux * f.side * 0.8) * f.sp, 3);
        if (Math.sin(f.t * 0.7 + f.ph) > 0.97) f.side = -f.side;
        if (f.aimT > 0) { f.aimT -= dt; if (f.aimT <= 0 && state === 'play') shoot(f, Math.atan2(dy, dx), 74 * Math.min(1.45, Math.sqrt(diff()))); }
        else if ((f.cd -= dt) <= 0 && d < 210) { f.aimT = 0.45; f.cd = rnd(1.8, 2.6) / Math.sqrt(diff()); }
      } else if (f.type === 'brute' || f.type === 'boss') {
        const isB = f.type === 'boss', enr = isB && f.hp < f.max * 0.5;
        if (f.mode === 'walk') {
          steer(ux * f.sp * (enr ? 1.4 : 1), uy * f.sp * (enr ? 1.4 : 1), 3);
          if ((f.cd -= dt) <= 0 && (isB || d < 170)) {
            const act = isB ? ['ring', 'aim', 'charge', 'summon', 'aim', 'charge'][f.n++ % 6] : 'charge';
            if (act === 'charge') { f.mode = 'wind'; f.mt = isB ? 0.9 : 0.75; f.ca = Math.atan2(dy, dx); }
            else if (act === 'ring') { f.vol = { kind: 'ring', n: enr ? 3 : 2, t: 0 }; f.cd = enr ? 1.6 : 2.2; }
            else if (act === 'aim') { f.vol = { kind: 'aim', n: enr ? 4 : 3, t: 0 }; f.cd = enr ? 1.6 : 2.2; }
            else { for (let i = 0; i < (enr ? 4 : 3); i++) { const a = i * 2.1 + f.t; tele('chaser', clamp(f.x + Math.cos(a) * 46, 16, AW - 16), clamp(f.y + Math.sin(a) * 46, 16, AH - 16)); } f.cd = 2; }
          }
        } else if (f.mode === 'wind') {
          f.vx *= 0.8; f.vy *= 0.8; f.mt -= dt;
          if (f.mt > 0.3) f.ca += angDiff(Math.atan2(dy, dx), f.ca) * Math.min(1, dt * 6);
          if (f.mt <= 0) { f.mode = 'charge'; f.mt = isB ? 1.1 : 0.9; const v = isB ? 215 : 235; f.vx = Math.cos(f.ca) * v; f.vy = Math.sin(f.ca) * v; }
        } else if (f.mode === 'charge') {
          f.mt -= dt; if (parts.length < 420 && Math.random() < 0.6) parts.push({ x: f.x - f.vx * 0.04 + rnd(-4, 4), y: f.y - f.vy * 0.04 + rnd(-4, 4), vx: 0, vy: 0, life: 0.4, max: 0.4, r: rnd(2, 4), col: 'rgba(120,110,95,.6)' });
          if (f.mt <= 0) { f.mode = 'walk'; f.cd = isB ? (enr ? 1.2 : 1.8) : rnd(1.6, 2.6); }
        } else if (f.mode === 'stun') { f.vx *= 0.85; f.vy *= 0.85; if ((f.mt -= dt) <= 0) { f.mode = 'walk'; f.cd = rnd(0.8, 1.6); } }
        if (f.vol && state === 'play') {
          if ((f.vol.t -= dt) <= 0) {
            const a0 = Math.atan2(dy, dx);
            if (f.vol.kind === 'ring') { const n = 16; for (let i = 0; i < n; i++) shoot(f, f.t * 0.9 + f.vol.n * 0.2 + i * 6.2832 / n, 58); f.vol.t = 0.45; }
            else { for (let i = -2; i <= 2; i++) shoot(f, a0 + i * 0.17, 92); f.vol.t = 0.3; }
            if (--f.vol.n <= 0) f.vol = null;
          }
        }
      }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (wallClamp(f, f.r)) {
        if (f.mode === 'charge') { f.mode = 'stun'; f.mt = 0.85; f.vx *= -0.3; f.vy *= -0.3; shake = Math.max(shake, f.type === 'boss' ? 0.35 : 0.22); burst(f.x, f.y, 12, 1.1, ['#c9b79c', '#8b7a66', '#fff'], 'rgba(255,255,255,1)'); env.buzz(); }
        else if (f.type === 'mini' || f.type === 'chaser') { if (f.x <= f.r || f.x >= AW - f.r) f.vx *= -0.5; if (f.y <= f.r || f.y >= AH - f.r) f.vy *= -0.5; }
      }
    }
    function tick(dt) {
      gt += dt; if (shake > 0) shake = Math.max(0, shake - dt); if (flashT > 0) flashT -= dt; if (annT > 0) annT -= dt; if (state === 'over') overT += dt;
      later = later.filter((l) => ((l.t -= dt) > 0 ? true : (l.fn(), false)));
      parts = parts.filter((p) => { p.life -= dt; if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; const q = Math.pow(p.feather ? 0.08 : 0.02, dt); p.vx *= q; p.vy *= q; if (p.feather) p.rot += dt * 4; } return p.life > 0; });
      pops = pops.filter((p) => { p.t -= dt; p.y -= 20 * dt; return p.t > 0; });
      if (state === 'ready') { followCam(dt); return; }
      const play = state === 'play';
      if (play) {
        movePlayer(dt);
        if (comboT > 0) { comboT -= dt; if (comboT <= 0) comboN = 0; }
        if (brk > 0) { brk -= dt; if (brk <= 0) { wave++; plan(wave); if (wave % 5 === 0) say('WARNING', 'the Mega Mower approaches', 2.2); else say('WAVE ' + wave, '', 1.6); } }
        else {
          if (foes.length + spawns.length < 38) waveT += dt;
          queue = queue.filter((q) => (q.t <= waveT ? (releaseQ(q), false) : true));
          if (!queue.length && !spawns.length && !foes.length) { const b = 100 * wave; score += b; if (wave % 5) say('WAVE ' + wave + ' CLEAR', '+' + b.toLocaleString() + ' bonus', 1.6); brk = 2; }
        }
      }
      spawns = spawns.filter((sp) => {
        sp.t += dt; if (sp.t < sp.T) return true;
        if (sp.type === 'boss') mkFoe('boss', sp.x, sp.y, { cd: 1.5 }); else mkFoe(sp.type, sp.x, sp.y);
        burst(sp.x, sp.y, sp.type === 'boss' ? 26 : 8, sp.type === 'boss' ? 1.6 : 0.7, ['#fff', '#ffb0a8'], 'rgba(255,140,120,1)');
        if (sp.type === 'boss') shake = 0.4;
        return false;
      });
      for (const f of foes) moveFoe(f, dt);
      for (let i = 0; i < foes.length; i++) for (let j = i + 1; j < foes.length; j++) { // keep the bots from stacking up
        const a = foes[i], b = foes[j], dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 >= R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), o = (R - d) / d, wa = b.r / R, wb = a.r / R;
        a.x -= dx * o * wa * 0.5; a.y -= dy * o * wa * 0.5; b.x += dx * o * wb * 0.5; b.y += dy * o * wb * 0.5;
      }
      bullets = bullets.filter((b) => {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.x < 0 || b.y < 0 || b.x > AW || b.y > AH) { burst(clamp(b.x, 0, AW), clamp(b.y, 0, AH), 3, 0.4, ['#e8fbff']); return false; }
        for (const f of foes) {
          if (f.dead) continue; const dx = b.x - f.x, dy = b.y - f.y, R = f.r + 2.5;
          if (dx * dx + dy * dy < R * R) {
            const crit = Math.random() < 0.12; damage(f, crit ? 2 : 1, b.x, b.y);
            if (f.type !== 'boss' && f.mode !== 'charge') { const kb = f.type === 'brute' ? 4 : 16; f.vx += b.vx / 270 * kb; f.vy += b.vy / 270 * kb; }
            if (parts.length < 420) for (let i = 0; i < 3; i++) parts.push({ x: b.x, y: b.y, vx: -b.vx * rnd(0.05, 0.25) + rnd(-30, 30), vy: -b.vy * rnd(0.05, 0.25) + rnd(-30, 30), life: 0.22, max: 0.22, r: 1.2, col: '#fff' });
            return false;
          }
        }
        return b.life > 0;
      });
      foes = foes.filter((f) => !f.dead);
      shots = shots.filter((b) => {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (play && Math.hypot(b.x - P.x, b.y - P.y) < b.r + PR - 1.5) { if (P.inv <= 0) { hurt(b.x, b.y); return false; } }
        return b.x > -4 && b.y > -4 && b.x < AW + 4 && b.y < AH + 4;
      });
      if (state === 'play') {
        for (const f of foes) {
          const d = Math.hypot(f.x - P.x, f.y - P.y);
          if (P.dash > 0 && f.dash !== dashId && d < f.r + PR + 4) { f.dash = dashId; damage(f, 3, f.x, f.y); shake = Math.max(shake, 0.12); }
          else if (!f.dead && d < f.r + PR - 1) hurt(f.x, f.y);
          if (state !== 'play') break;
        }
        foes = foes.filter((f) => !f.dead);
      }
      drops = drops.filter((dp) => {
        dp.t += dt; if (dp.t > 11) return false;
        if (state !== 'play') return true;
        const dx = P.x - dp.x, dy = P.y - dp.y, d = Math.hypot(dx, dy) || 1;
        if (d < 36) { dp.x += dx / d * 120 * dt; dp.y += dy / d * 120 * dt; }
        if (d < PR + 7) {
          let label = POW[dp.kind].label;
          if (dp.kind === 'spread') P.spread = 10; else if (dp.kind === 'rapid') P.rapid = 10; else if (dp.kind === 'shield') P.shield = true;
          else if (P.hp < MAXHP) P.hp++; else { score += 250 * mult(); label = '+' + 250 * mult(); }
          pop(dp.x, dp.y - 8, label, POW[dp.kind].col, 7, 1.1);
          burst(dp.x, dp.y, 12, 0.7, ['#fff', POW[dp.kind].col], 'rgba(255,255,255,1)'); env.buzz(); return false;
        }
        return true;
      });
      followCam(dt);
    }
    function camAxis(p, view, size, m0, m1) { const lo = -m0, hi = size + m1 - view; return hi < lo ? (lo + hi) / 2 : clamp(p - view / 2, lo, hi); }
    function camTarget() { return { x: camAxis(P.x, vw, AW, 14, 14), y: camAxis(P.y, vh, AH, 14 + 46 * k / s, 14) }; }
    function followCam(dt) { const t = camTarget(), q = Math.min(1, dt * 7); cam.x += (t.x - cam.x) * q; cam.y += (t.y - cam.y) * q; }

    // ---- drawing, in world units
    function floor(c) {
      const x0 = Math.max(0, Math.floor(cam.x / TILE)), x1 = Math.min(AW / TILE, Math.ceil((cam.x + vw) / TILE)), y0 = Math.max(0, Math.floor(cam.y / TILE)), y1 = Math.min(AH / TILE, Math.ceil((cam.y + vh) / TILE));
      c.fillStyle = '#7cc7a4'; c.fillRect(0, 0, AW, AH);
      c.fillStyle = '#73bf9b'; for (let i = x0; i < x1; i++) for (let j = y0; j < y1; j++) if ((i + j) % 2) c.fillRect(i * TILE, j * TILE, TILE, TILE);
      for (const d of deco) {
        if (d.x < cam.x - 8 || d.x > cam.x + vw + 8 || d.y < cam.y - 8 || d.y > cam.y + vh + 8) continue;
        if (d.k === 0) { c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const a = d.a + i * 1.2566; c.beginPath(); c.arc(d.x + Math.cos(a) * 1.6, d.y + Math.sin(a) * 1.6, 1.2, 0, 7); c.fill(); } c.fillStyle = GOLD; c.beginPath(); c.arc(d.x, d.y, 1, 0, 7); c.fill(); }
        else if (d.k === 1) { c.strokeStyle = '#5aa983'; c.lineWidth = 1; c.beginPath(); for (let i = -1; i <= 1; i++) { c.moveTo(d.x + i * 2, d.y + 2); c.lineTo(d.x + i * 3, d.y - 3); } c.stroke(); }
        else if (d.k === 2) { c.fillStyle = '#62b18d'; for (let i = 0; i < 3; i++) { const a = d.a + i * 2.094; c.beginPath(); c.arc(d.x + Math.cos(a) * 1.8, d.y + Math.sin(a) * 1.8, 1.8, 0, 7); c.fill(); } }
        else { c.fillStyle = '#f7b6c2'; c.beginPath(); c.arc(d.x, d.y, 1.3, 0, 7); c.fill(); }
      }
      // the wall: a low stone rim round the meadow
      c.strokeStyle = '#4f9f86'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, AW - 3, AH - 3);
      c.fillStyle = '#e4e8ee'; rr(c, -12, -12, AW + 24, 12, 4); c.fill(); rr(c, -12, AH, AW + 24, 12, 4); c.fill(); rr(c, -12, -12, 12, AH + 24, 4); c.fill(); rr(c, AW, -12, 12, AH + 24, 4); c.fill();
      c.fillStyle = '#c7cfd8'; for (let x = 0; x < AW; x += 24) { c.fillRect(x, -12, 1.2, 12); c.fillRect(x + 12, AH, 1.2, 12); } for (let y = 0; y < AH; y += 24) { c.fillRect(-12, y, 12, 1.2); c.fillRect(AW, y + 12, 12, 1.2); }
      c.strokeStyle = '#9aa6b2'; c.lineWidth = 1; c.strokeRect(-12, -12, AW + 24, AH + 24);
    }
    function goose(c, x, y) {
      const white = P.hurtT > 0 && Math.floor(gt * 16) % 2 === 0, cl = (col) => (white ? '#fff' : col);
      c.save(); c.translate(x, y);
      c.fillStyle = 'rgba(20,60,50,.2)'; c.beginPath(); c.ellipse(1.5, 3, 10, 6.5, 0, 0, 7); c.fill();
      c.rotate(P.face);
      const step = Math.sin(P.walk * 16) * 2.2;
      c.fillStyle = cl('#2b2c30'); c.beginPath(); c.ellipse(-2 + step, -3.4, 2.2, 1.4, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(-2 - step, 3.4, 2.2, 1.4, 0, 0, 7); c.fill();
      c.fillStyle = cl('#2b2c30'); c.beginPath(); c.ellipse(-8.6, 0, 3, 3.2, 0, 0, 7); c.fill(); c.fillStyle = cl('#f2efe8'); c.fillRect(-9, -1.5, 1.6, 3);
      c.fillStyle = cl('#8b7a66'); c.beginPath(); c.ellipse(-1, 0, 8.6, 6.2, 0, 0, 7); c.fill();
      const spread = P.dash > 0 ? 1 : 0;
      c.fillStyle = cl('#6e604f');
      for (const sd of [-1, 1]) {
        c.beginPath();
        if (spread) { c.moveTo(1, sd * 3); c.quadraticCurveTo(-2, sd * 15, -9, sd * 13); c.lineTo(-6, sd * 4); }
        else { c.moveTo(3, sd * 2.5); c.quadraticCurveTo(-1, sd * 7.2, -8.5, sd * 4.6); c.quadraticCurveTo(-4, sd * 2.6, 3, sd * 2.5); }
        c.closePath(); c.fill();
      }
      c.fillStyle = cl('#f2efe8'); c.beginPath(); c.ellipse(4.6, 0, 2.4, 3.4, 0, 0, 7); c.fill(); // pale chest
      c.fillStyle = cl(ACC); rr(c, 4.2, -2.3, 2.4, 4.6, 1); c.fill(); // teal bandana
      c.fillStyle = cl('#1f2024'); rr(c, 5.5, -1.5, 6, 3, 1.5); c.fill(); c.beginPath(); c.ellipse(11.6, 0, 3.6, 2.9, 0, 0, 7); c.fill();
      c.fillStyle = cl('#fff'); c.beginPath(); c.ellipse(10.6, -2, 1.7, 1.1, 0.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(10.6, 2, 1.7, 1.1, -0.4, 0, 7); c.fill();
      const open = P.honk > 0 ? 0.9 : 0;
      c.fillStyle = cl('#3a3d44'); c.beginPath(); c.moveTo(14, -1.4 - open); c.lineTo(17.6, -0.3 - open * 0.6); c.lineTo(17.6, 0.3 + open * 0.6); c.lineTo(14, 1.4 + open); c.closePath(); c.fill();
      c.restore();
      if (P.shield) { c.strokeStyle = `rgba(110,215,255,${0.6 + Math.sin(gt * 5) * 0.2})`; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, 14, 0, 7); c.stroke(); c.fillStyle = 'rgba(110,215,255,.12)'; c.fill(); }
    }
    function eye(c, ex, ey, r, f, white) {
      const a = Math.atan2(P.y - f.y, P.x - f.x);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, r, 0, 7); c.fill();
      c.fillStyle = white ? '#fff' : '#1f2024'; c.beginPath(); c.arc(ex + Math.cos(a) * r * 0.4, ey + Math.sin(a) * r * 0.4, r * 0.5, 0, 7); c.fill();
    }
    function drawFoe(c, f) {
      const w = f.hit > 0, cl = (col) => (w ? '#fff' : col);
      c.fillStyle = 'rgba(20,60,50,.18)'; c.beginPath(); c.ellipse(f.x + 1.5, f.y + f.r * 0.6, f.r * 1.05, f.r * 0.55, 0, 0, 7); c.fill();
      c.save(); c.translate(f.x, f.y);
      if (f.type === 'chaser' || f.type === 'mini') {
        const r = f.r, bob = Math.sin(f.t * 12 + f.ph) * 0.5;
        c.strokeStyle = cl('#4a4f59'); c.lineWidth = 0.9; c.beginPath(); c.moveTo(0, -r + bob); c.lineTo(0, -r - 3.5 + bob); c.stroke();
        c.fillStyle = Math.floor(gt * 6 + f.ph) % 2 ? '#ffd66b' : '#fff'; c.beginPath(); c.arc(0, -r - 3.8 + bob, 1.1, 0, 7); c.fill();
        c.fillStyle = cl(f.type === 'mini' ? '#ff8fb1' : RED); c.beginPath(); c.arc(0, bob, r, 0, 7); c.fill();
        c.fillStyle = cl(f.type === 'mini' ? '#e06b92' : '#b8443b'); c.beginPath(); c.arc(0, bob, r, 0.2, Math.PI - 0.2); c.fill();
        eye(c, 0, bob - r * 0.12, r * 0.48, f, w);
      } else if (f.type === 'splitter') {
        const r = f.r, sq = Math.sin(f.t * 5 + f.ph) * 0.08;
        c.fillStyle = cl('#9b7be0'); c.beginPath(); c.ellipse(0, 0, r * (1 + sq), r * (1 - sq), 0, 0, 7); c.fill();
        c.fillStyle = cl('#b9a1f0'); c.beginPath(); c.ellipse(-r * 0.3, -r * 0.35, r * 0.35, r * 0.22, -0.4, 0, 7); c.fill();
        c.strokeStyle = cl('#6c4fb8'); c.lineWidth = 1; c.beginPath(); c.moveTo(0, -r * (1 - sq)); c.lineTo(1.2, -r * 0.3); c.lineTo(-1.2, r * 0.3); c.lineTo(0, r * (1 - sq)); c.stroke();
        eye(c, -r * 0.42, 0, r * 0.26, f, w); eye(c, r * 0.42, 0, r * 0.26, f, w);
      } else if (f.type === 'shooter') {
        const a = Math.atan2(P.y - f.y, P.x - f.x), r = f.r;
        c.fillStyle = cl('#e0a524'); rr(c, -r, -r, r * 2, r * 2, r * 0.5); c.fill(); c.fillStyle = cl(GOLD); rr(c, -r, -r, r * 2, r * 1.5, r * 0.5); c.fill();
        c.save(); c.rotate(a); c.fillStyle = cl('#3b4048'); rr(c, 0, -1.6, r + 4, 3.2, 1.2); c.fill(); c.restore();
        c.fillStyle = cl('#3b4048'); c.beginPath(); c.arc(0, 0, r * 0.55, 0, 7); c.fill();
        if (f.aimT > 0) { const p = 1 - f.aimT / 0.45; c.fillStyle = `rgba(255,93,115,${0.4 + p * 0.6})`; c.beginPath(); c.arc(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4), 1.5 + p * 2.2, 0, 7); c.fill(); }
        c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(0, 0, r * 0.25, 0, 7); c.fill();
      } else if (f.type === 'brute') {
        const r = f.r, wind = f.mode === 'wind', jit = wind ? rnd(-0.8, 0.8) : 0;
        if (wind) { c.strokeStyle = `rgba(224,88,77,${0.25 + (1 - f.mt / 0.75) * 0.45})`; c.lineWidth = r * 1.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(f.ca) * 120, Math.sin(f.ca) * 120); c.stroke(); c.lineCap = 'butt'; }
        c.translate(jit, 0); c.rotate(f.mode === 'charge' || wind ? f.ca : Math.atan2(P.y - f.y, P.x - f.x));
        c.fillStyle = cl('#f2efe8'); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(r * 0.5, sd * r * 0.55); c.lineTo(r * 1.35, sd * r * 0.85); c.lineTo(r * 0.75, sd * r * 0.25); c.closePath(); c.fill(); }
        c.fillStyle = cl(wind ? '#a7646a' : '#6b7480'); c.beginPath(); for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; c.lineTo(Math.cos(t) * r, Math.sin(t) * r); } c.closePath(); c.fill();
        c.fillStyle = cl('#4f5761'); c.beginPath(); for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; c.lineTo(Math.cos(t) * r * 0.6, Math.sin(t) * r * 0.6); } c.closePath(); c.fill();
        c.fillStyle = cl(GOLD); c.fillRect(-r * 0.9, -1.2, r * 0.6, 2.4);
        c.fillStyle = f.mode === 'stun' ? '#fff' : '#ff5d73'; c.beginPath(); c.arc(r * 0.35, 0, 2.6, 0, 7); c.fill();
        c.restore(); c.save(); c.translate(f.x, f.y);
        if (f.mode === 'stun') for (let i = 0; i < 3; i++) { const a = gt * 5 + i * 2.1; c.fillStyle = GOLD; c.beginPath(); c.arc(Math.cos(a) * r, -r - 2 + Math.sin(a) * 2.5, 1.4, 0, 7); c.fill(); }
        if (f.hp < f.max) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-r, -r - 7, r * 2, 2.2); c.fillStyle = '#4cb782'; c.fillRect(-r, -r - 7, r * 2 * f.hp / f.max, 2.2); }
      } else if (f.type === 'boss') {
        const r = f.r, wind = f.mode === 'wind', enr = f.hp < f.max * 0.5;
        if (wind) { c.strokeStyle = `rgba(224,88,77,${0.25 + (1 - f.mt / 0.9) * 0.45})`; c.lineWidth = r * 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(f.ca) * 150, Math.sin(f.ca) * 150); c.stroke(); c.lineCap = 'butt'; c.translate(rnd(-1, 1), rnd(-1, 1)); }
        // the spinning blade underneath
        c.save(); c.rotate(gt * (f.mode === 'charge' ? 30 : 12)); c.fillStyle = cl('#c7cfd8'); c.beginPath(); c.arc(0, 0, r * 1.08, 0, 7); c.fill();
        c.strokeStyle = cl('#7d8794'); c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08); } c.stroke(); c.restore();
        c.fillStyle = cl(enr ? '#c9392f' : RED); rr(c, -r * 0.9, -r * 0.8, r * 1.8, r * 1.6, r * 0.4); c.fill();
        c.fillStyle = cl('#f06e62'); rr(c, -r * 0.9, -r * 0.8, r * 1.8, r * 0.7, r * 0.35); c.fill();
        c.fillStyle = cl('#2a2d33'); rr(c, -r * 0.55, r * 0.25, r * 1.1, r * 0.35, 2); c.fill();
        c.fillStyle = cl('#7d8794'); for (let i = -2; i <= 2; i++) c.fillRect(i * r * 0.2 - 0.7, r * 0.27, 1.4, r * 0.3);
        eye(c, -r * 0.38, -r * 0.18, r * 0.24, f, w); eye(c, r * 0.38, -r * 0.18, r * 0.24, f, w);
        c.strokeStyle = cl('#2a2d33'); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-r * 0.62, -r * 0.5); c.lineTo(-r * 0.18, -r * (enr ? 0.32 : 0.42)); c.moveTo(r * 0.62, -r * 0.5); c.lineTo(r * 0.18, -r * (enr ? 0.32 : 0.42)); c.stroke();
        if (enr && parts.length < 420 && Math.random() < 0.3) parts.push({ x: f.x + rnd(-8, 8), y: f.y - r, vx: rnd(-6, 6), vy: -24, life: 0.8, max: 0.8, r: rnd(2, 3.5), col: 'rgba(90,90,90,.45)' });
        if (f.mode === 'stun') for (let i = 0; i < 4; i++) { const a = gt * 5 + i * 1.57; c.fillStyle = GOLD; c.beginPath(); c.arc(Math.cos(a) * r, -r - 3 + Math.sin(a) * 3, 1.8, 0, 7); c.fill(); }
      }
      c.restore();
    }
    function powIcon(c, kind, z) {
      c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = z * 0.28; c.lineCap = 'round';
      if (kind === 'spread') { for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(Math.cos(-1.57 + i * 0.6) * z * 0.9, Math.sin(-1.57 + i * 0.6) * z * 0.9 + z * 0.45, z * 0.28, 0, 7); c.fill(); } }
      else if (kind === 'rapid') { c.beginPath(); c.moveTo(z * 0.25, -z); c.lineTo(-z * 0.4, z * 0.1); c.lineTo(z * 0.3, z * 0.1); c.lineTo(-z * 0.25, z); c.stroke(); }
      else if (kind === 'shield') { c.beginPath(); c.arc(0, 0, z * 0.75, 0, 7); c.stroke(); }
      else { c.beginPath(); c.moveTo(-z * 0.7, 0); c.lineTo(z * 0.7, 0); c.moveTo(0, -z * 0.7); c.lineTo(0, z * 0.7); c.stroke(); }
      c.lineCap = 'butt';
    }
    function drawDrop(c, d) {
      if (d.t > 8 && Math.floor(d.t * 8) % 2) return;
      const col = POW[d.kind].col, bob = Math.sin(d.t * 4) * 1.5;
      c.fillStyle = 'rgba(20,60,50,.18)'; c.beginPath(); c.ellipse(d.x, d.y + 6, 5, 2, 0, 0, 7); c.fill();
      c.save(); c.translate(d.x, d.y + bob);
      c.globalAlpha = 0.3 + Math.sin(d.t * 6) * 0.12; c.fillStyle = col; c.beginPath(); c.arc(0, 0, 9.5, 0, 7); c.fill(); c.globalAlpha = 1;
      c.fillStyle = col; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; c.lineTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5); } c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.8; c.stroke();
      powIcon(c, d.kind, 3); c.restore();
    }
    function world(c) {
      floor(c);
      for (const d of drops) drawDrop(c, d);
      for (const sp of spawns) { // spawn telegraphs: a shrinking warning ring and a cross
        const p = sp.t / sp.T, R = sp.r + 14 * (1 - p) + 2, boss = sp.type === 'boss';
        c.fillStyle = `rgba(224,88,77,${0.12 + p * 0.25})`; c.beginPath(); c.arc(sp.x, sp.y, sp.r * p + 1, 0, 7); c.fill();
        c.strokeStyle = `rgba(224,88,77,${0.4 + 0.5 * (Math.floor(gt * 10) % 2)})`; c.lineWidth = boss ? 2 : 1.2; c.beginPath(); c.arc(sp.x, sp.y, boss ? R * 1.6 : R, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(sp.x - 3, sp.y - 3); c.lineTo(sp.x + 3, sp.y + 3); c.moveTo(sp.x + 3, sp.y - 3); c.lineTo(sp.x - 3, sp.y + 3); c.stroke();
      }
      for (const p of parts) if (p.ghost) { c.globalAlpha = p.life / p.max * 0.35; c.fillStyle = '#e9fff7'; c.beginPath(); c.ellipse(p.x, p.y, 9, 6, p.a, 0, 7); c.fill(); }
      c.globalAlpha = 1;
      for (const f of foes) drawFoe(c, f);
      if (state !== 'over') goose(c, P.x, P.y);
      c.globalCompositeOperation = 'lighter';
      for (const b of bullets) { c.fillStyle = 'rgba(150,240,255,.3)'; c.beginPath(); c.arc(b.x, b.y, 4.2, 0, 7); c.fill(); }
      for (const b of shots) { c.fillStyle = 'rgba(255,93,115,.35)'; c.beginPath(); c.arc(b.x, b.y, b.r + 2.2, 0, 7); c.fill(); }
      c.globalCompositeOperation = 'source-over';
      c.lineCap = 'round';
      for (const b of bullets) { c.strokeStyle = '#ffffff'; c.lineWidth = 1.8; c.beginPath(); c.arc(b.x - Math.cos(b.a) * 3, b.y - Math.sin(b.a) * 3, 4, b.a - 0.8, b.a + 0.8); c.stroke(); c.fillStyle = '#c9f6ff'; c.beginPath(); c.arc(b.x - Math.cos(b.a) * 1.5, b.y - Math.sin(b.a) * 1.5, 1.2, 0, 7); c.fill(); }
      c.lineCap = 'butt';
      for (const b of shots) { c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, b.r * 0.45, 0, 7); c.fill(); }
      for (const p of parts) {
        if (p.ghost) continue; const a = p.life / p.max;
        if (p.ring) { c.globalAlpha = a * 0.7; c.strokeStyle = p.col; c.lineWidth = 1.4; c.beginPath(); c.arc(p.x, p.y, p.r * (1.7 - a), 0, 7); c.stroke(); }
        else if (p.feather) { c.globalAlpha = Math.min(1, a * 2); c.fillStyle = p.col; c.beginPath(); c.ellipse(p.x, p.y, p.r * 1.4, p.r * 0.5, p.rot, 0, 7); c.fill(); }
        else { c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r * (0.4 + a * 0.6), 0, 7); c.fill(); }
      }
      c.globalAlpha = 1;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      for (const p of pops) {
        const a = Math.min(1, p.t / p.max * 3), sc = 1 + Math.max(0, (p.t / p.max - 0.8)) * 2;
        c.globalAlpha = a; font(c, 800, p.sz * sc); c.strokeStyle = 'rgba(20,40,40,.75)'; c.lineWidth = 2; c.strokeText(p.txt, p.x, p.y); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y);
      }
      c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.lineJoin = 'miter';
    }
    // ---- the HUD, in screen pixels
    const dashBtn = () => ({ x: W - 40 * k, y: H - 40 * k, r: 26 * k });
    function heart(c, x, y, z, full) {
      c.fillStyle = full ? RED : 'rgba(255,255,255,.22)';
      c.beginPath(); c.moveTo(x, y + z * 0.35); c.bezierCurveTo(x - z * 0.6, y - z * 0.05, x - z * 0.45, y - z * 0.55, x, y - z * 0.22); c.bezierCurveTo(x + z * 0.45, y - z * 0.55, x + z * 0.6, y - z * 0.05, x, y + z * 0.35); c.fill();
    }
    function offscreen(c) { // little arrows on the edge pointing at bots you can't see
      const pad = 12 * k, top = 60 * k;
      const mark = (x, y, col, r) => {
        const sx = (x - cam.x) * s, sy = (y - cam.y) * s;
        if (sx > -r * s && sx < W + r * s && sy > -r * s && sy < H + r * s) return;
        const ex = clamp(sx, pad, W - pad), ey = clamp(sy, top, H - pad), a = Math.atan2(sy - ey, sx - ex);
        c.save(); c.translate(ex, ey); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(7 * k, 0); c.lineTo(-4 * k, -5 * k); c.lineTo(-4 * k, 5 * k); c.closePath(); c.fill(); c.restore();
      };
      for (const sp of spawns) mark(sp.x, sp.y, `rgba(242,182,50,${0.5 + 0.5 * (Math.floor(gt * 8) % 2)})`, sp.r);
      for (const f of foes) mark(f.x, f.y, f.type === 'boss' ? '#ff5d73' : 'rgba(224,88,77,.9)', f.r);
      for (const d of drops) mark(d.x, d.y, POW[d.kind].col, 6);
    }
    function hud(c) {
      const g = c.createLinearGradient(0, 0, 0, 52 * k); g.addColorStop(0, 'rgba(6,40,46,.6)'); g.addColorStop(1, 'rgba(6,40,46,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 52 * k);
      c.textBaseline = 'alphabetic';
      c.textAlign = 'left'; c.fillStyle = '#fff'; font(c, 800, 20 * k); c.fillText(score.toLocaleString(), 12 * k, 25 * k);
      c.fillStyle = 'rgba(255,255,255,.75)'; font(c, 700, 11 * k); c.fillText('WAVE ' + wave, 12 * k, 40 * k);
      const m = mult();
      if (comboN > 0 && comboT > 0) {
        const x = 64 * k; c.fillStyle = m > 1 ? GOLD : 'rgba(255,255,255,.85)'; font(c, 800, 12 * k); c.fillText('x' + m, x, 40 * k);
        c.fillStyle = 'rgba(255,255,255,.2)'; rr(c, x + 22 * k, 33 * k, 40 * k, 5 * k, 2.5 * k); c.fill();
        c.fillStyle = m > 1 ? GOLD : '#fff'; rr(c, x + 22 * k, 33 * k, Math.max(5 * k, 40 * k * comboT / COMBO_T), 5 * k, 2.5 * k); c.fill();
      }
      for (let i = 0; i < MAXHP; i++) heart(c, W - 14 * k - i * 17 * k, 18 * k, 15 * k, i < P.hp);
      if (P.shield) { c.strokeStyle = '#5fd0ff'; c.lineWidth = 2 * k; c.beginPath(); c.arc(W - 14 * k - MAXHP * 17 * k, 18 * k, 6 * k, 0, 7); c.stroke(); }
      // active power-ups
      let px = W - 12 * k;
      for (const kd of ['rapid', 'spread']) { const v = P[kd]; if (v <= 0) continue; const col = POW[kd].col;
        c.fillStyle = 'rgba(6,40,46,.5)'; rr(c, px - 46 * k, 30 * k, 46 * k, 13 * k, 6.5 * k); c.fill();
        c.fillStyle = col; rr(c, px - 46 * k, 30 * k, 46 * k * v / 10, 13 * k, 6.5 * k); c.fill();
        c.save(); c.translate(px - 37 * k, 36.5 * k); powIcon(c, kd, 3.6 * k); c.restore(); px -= 52 * k; }
      if (boss) {
        const bw = Math.min(W * 0.62, 280 * k), bx = (W - bw) / 2, by = 56 * k;
        c.fillStyle = 'rgba(6,40,46,.55)'; rr(c, bx, by, bw, 8 * k, 4 * k); c.fill(); c.fillStyle = '#ff5d73'; rr(c, bx, by, Math.max(8 * k, bw * boss.hp / boss.max), 8 * k, 4 * k); c.fill();
        c.textAlign = 'center'; c.fillStyle = '#fff'; font(c, 800, 10 * k); c.fillText('MEGA MOWER', W / 2, by + 20 * k);
      }
      // dash button (tap it, tap anywhere, or press A)
      const b = dashBtn(), ready = P.dcd <= 0;
      c.globalAlpha = 0.85; c.fillStyle = ready ? 'rgba(26,163,179,.85)' : 'rgba(6,40,46,.55)'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill();
      if (!ready) { c.strokeStyle = '#bff3f8'; c.lineWidth = 3 * k; c.beginPath(); c.arc(b.x, b.y, b.r - 1.5 * k, -1.5708, -1.5708 + 6.2832 * (1 - P.dcd / DASH_CD)); c.stroke(); }
      c.globalAlpha = 1; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; font(c, 800, (env.touch ? 10 : 15) * k); c.fillText(env.touch ? 'DASH' : 'A', b.x, b.y + 0.5);
      if (!env.touch) { font(c, 700, 8 * k); c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText('DASH', b.x, b.y - b.r - 7 * k); }
      if (annT > 0 && ann) {
        const a = Math.min(1, annT * 2.5); c.globalAlpha = a; const warn = ann === 'WARNING';
        font(c, 800, 30 * k); c.lineJoin = 'round'; c.strokeStyle = 'rgba(6,40,46,.6)'; c.lineWidth = 5 * k; c.strokeText(ann, W / 2, H * 0.38); c.fillStyle = warn ? '#ff7d8f' : '#fff'; c.fillText(ann, W / 2, H * 0.38);
        if (annSub) { font(c, 700, 13 * k); c.strokeText(annSub, W / 2, H * 0.38 + 26 * k); c.fillStyle = warn ? '#ffd0d6' : GOLD; c.fillText(annSub, W / 2, H * 0.38 + 26 * k); }
        c.globalAlpha = 1; c.lineJoin = 'miter';
      }
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    }
    function card(c, title, sub) {
      c.fillStyle = 'rgba(6,40,46,.62)'; c.fillRect(0, 0, W, H);
      const z = Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400)); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillStyle = '#fff'; font(c, 800, 40 * z); c.fillText(title, W / 2, H / 2 - 6 * z);
      c.fillStyle = 'rgba(255,255,255,.8)'; font(c, 500, 16 * z); sub.split('\n').forEach((ln, i) => c.fillText(ln, W / 2, H / 2 + 28 * z + i * 23 * z)); c.textAlign = 'left';
    }

    function init() {
      P = { x: AW / 2, y: AH / 2, kx: 0, ky: 0, hp: MAXHP, inv: 0, hurtT: 0, dash: 0, dcd: 0, dvx: 0, dvy: 0, mdir: -Math.PI / 2, face: -Math.PI / 2, aim: 0, walk: 0, moving: 0, honk: 0, spread: 0, rapid: 0, shield: false };
      foes = []; spawns = []; bullets = []; shots = []; drops = []; parts = []; pops = []; later = []; queue = []; anchors = {};
      wave = 1; score = 0; comboN = 0; comboT = 0; shake = 0; flashT = 0; annT = 0; ann = ''; annSub = ''; brk = 0; boss = null; overT = 0; newBest = false; fireT = 0.3; drag = null; dashId = 0; waveT = 0;
      cam = camTarget();
    }
    function start() {
      if (state === 'over' && overT < 0.6) return;
      init(); state = 'play'; plan(1); say('WAVE 1', env.touch ? 'drag to move · tap to dash' : 'arrows move · A dashes', 2); env.buzz();
    }

    const g = {
      resize(w, h) { W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.75, 1.3); s = Math.min(W, H) / VIEW; vw = W / s; vh = H / s; if (cam) { const t = camTarget(); cam.x = t.x; cam.y = t.y; } },
      reset() { init(); state = 'ready'; for (const q in held) held[q] = false; aHeld = false; },
      step(dt) { dt = Math.min(Math.max(dt, 0), 0.05); const n = dt > 0.025 ? 2 : 1; for (let i = 0; i < n; i++) tick(dt / n); },
      draw(c) {
        c.fillStyle = '#0f5c6b'; c.fillRect(0, 0, W, H);
        c.save();
        if (shake > 0) c.translate(rnd(-1, 1) * shake * 9, rnd(-1, 1) * shake * 9);
        c.scale(s, s); c.translate(-cam.x, -cam.y);
        c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1.2; // ripples on the pond round the arena
        for (let i = 0; i < 6; i++) { const r = ((gt * 10 + i * 30) % 180) + AW * 0.55; c.beginPath(); c.arc(AW / 2, AH / 2, r, 0, 7); c.stroke(); }
        world(c);
        c.restore();
        if (state !== 'ready') { offscreen(c); hud(c); }
        if (flashT > 0) { c.fillStyle = `rgba(224,88,77,${Math.min(0.35, flashT)})`; c.fillRect(0, 0, W, H); }
        if (state === 'ready') card(c, 'Honk Arena', (env.touch ? 'Drag anywhere to waddle · tap to dash' : 'Arrow keys waddle · A dashes') + '\nYou honk at the nearest bot on your own\n' + startWord(env));
        if (state === 'over') card(c, 'Honked out', 'Score ' + score.toLocaleString() + ' · wave ' + wave + (newBest ? ' · new best!' : '') + '\n' + againWord(env));
      },
      key(k2) {
        if (k2 === 'a') { if (state !== 'play') { if (!aHeld) start(); } else if (!aHeld) dash(); aHeld = true; return true; }
        if (k2 in held) { held[k2] = true; if (state === 'ready') start(); return true; }
        return false;
      },
      release(k2) {
        if (k2 === 'all') { for (const q in held) held[q] = false; aHeld = false; drag = null; }
        else if (k2 === 'ptr') g.pointer('up', drag ? drag.lx : 0, drag ? drag.ly : 0);
        else if (k2 === 'a') aHeld = false;
        else if (k2 in held) held[k2] = false;
      },
      pointer(type, x, y) {
        if (type === 'down') {
          if (state !== 'play') { start(); return; }
          const b = dashBtn(); if (Math.hypot(x - b.x, y - b.y) < b.r + 10 * k) { dash(); return; }
          drag = { x, y, lx: x, ly: y, t: gt, moved: 0 }; return;
        }
        if (!drag) return;
        if (type === 'up') { if (state === 'play' && gt - drag.t < 0.25 && drag.moved < 8) dash(); drag = null; return; }
        if (state !== 'play') return;
        const dx = (x - drag.lx) / s * 1.35, dy = (y - drag.ly) / s * 1.35; drag.lx = x; drag.ly = y; drag.moved += Math.hypot(x - drag.x, y - drag.y) > 8 ? 99 : 0;
        if (P.dash > 0) return;
        P.x += clamp(dx, -14, 14); P.y += clamp(dy, -14, 14); wallClamp(P, PR + 1);
        if (Math.abs(dx) + Math.abs(dy) > 0.15) { P.mdir = Math.atan2(dy, dx); P.moving = 0.12; }
      },
      hud: () => ['Score ' + score.toLocaleString() + ' · Wave ' + wave, 'Best ' + Math.max(best, score).toLocaleString()],
    };
    return g;
  }

  function ICON_arena(c, z) {
    const g = c.createLinearGradient(0, 0, 0, z); g.addColorStop(0, '#16707f'); g.addColorStop(1, '#0b3f4a'); c.fillStyle = g; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.16); c.fill();
    c.fillStyle = '#e4e8ee'; rr(c, z * 0.15, z * 0.15, z * 0.7, z * 0.7, z * 0.1); c.fill();
    c.fillStyle = '#7cc7a4'; rr(c, z * 0.19, z * 0.19, z * 0.62, z * 0.62, z * 0.07); c.fill();
    // a red bot, top right
    c.fillStyle = RED; c.beginPath(); c.arc(z * 0.67, z * 0.33, z * 0.105, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(z * 0.655, z * 0.34, z * 0.052, 0, 7); c.fill(); c.fillStyle = '#1f2024'; c.beginPath(); c.arc(z * 0.638, z * 0.352, z * 0.026, 0, 7); c.fill();
    // honk waves flying at it
    c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineWidth = z * 0.035; const a = -0.78;
    for (let i = 0; i < 2; i++) { const d = z * (0.25 + i * 0.075); c.beginPath(); c.arc(z * 0.33 + Math.cos(a) * d, z * 0.67 + Math.sin(a) * d, z * 0.055, a - 0.9, a + 0.9); c.stroke(); }
    c.lineCap = 'butt';
    // the goose, from above, facing the bot
    c.save(); c.translate(z * 0.33, z * 0.67); c.rotate(a); const u = z / 66; c.scale(u, u);
    c.fillStyle = 'rgba(20,60,50,.25)'; c.beginPath(); c.ellipse(1.5, 3, 11, 7, 0, 0, 7); c.fill();
    c.fillStyle = '#2b2c30'; c.beginPath(); c.ellipse(-9, 0, 3.2, 3.4, 0, 0, 7); c.fill();
    c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(-1, 0, 9, 6.6, 0, 0, 7); c.fill();
    c.fillStyle = '#6e604f'; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(3, sd * 2.5); c.quadraticCurveTo(-1, sd * 7.6, -9, sd * 4.8); c.quadraticCurveTo(-4, sd * 2.6, 3, sd * 2.5); c.fill(); }
    c.fillStyle = ACC; rr(c, 4, -2.5, 2.6, 5, 1); c.fill();
    c.fillStyle = '#1f2024'; rr(c, 5.5, -1.6, 6.5, 3.2, 1.6); c.fill(); c.beginPath(); c.ellipse(12, 0, 3.9, 3.1, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(11, -2.1, 1.8, 1.2, 0.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(11, 2.1, 1.8, 1.2, -0.4, 0, 7); c.fill();
    c.fillStyle = '#3a3d44'; c.beginPath(); c.moveTo(14.6, -2.2); c.lineTo(18.6, -0.9); c.lineTo(18.6, 0.9); c.lineTo(14.6, 2.2); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = GOLD; c.beginPath(); for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3 + Math.PI / 6; c.lineTo(z * 0.7 + Math.cos(t) * z * 0.065, z * 0.7 + Math.sin(t) * z * 0.065); } c.closePath(); c.fill();
  }

  /* ---------------- Peg Drop ----------------
     A peg shooter: aim the launcher, fire a ball down through a field of pegs, light every gold peg within ten balls.
     Original code (no code adapted from other projects); the layouts are designed for this game. */
  function pegdrop(env) {
    const VW = 200, VH = 300, BR = 3, G = 250, V0 = 215, LX = 100, LY = 16, MAXV = 380, BW = 34, BY = VH - 14, TAU = Math.PI * 2, PI = Math.PI;
    const COL = {
      blue: { base: '#3fb6c6', rim: '#1b6f7b', lit: '#c8fbff' },
      gold: { base: '#f2b632', rim: '#9c6a08', lit: '#fff1b0' },
      mult: { base: '#a57cff', rim: '#5a3aa8', lit: '#ece2ff' },
      goose: { base: '#4fc185', rim: '#22704a', lit: '#dcffe9' },
    };
    let W = 400, H = 300, s = 1, ox = 0, oy = 0, k = 1, gt = 0, wide = false;
    let state = 'ready', lvl = 0, pegs = [], rims = [], balls = 10, score = 0, aim = 0, ball = null, T = 0, parts = [], conf = [], trail = [];
    let msg = '', msg2 = '', msgT = 0, shake = 0, overT = 0, newBest = false, startBest = 0, clearQ = [], clearT = 0, clearIv = 0.05, clearWait = 0;
    let won = false, zoom = 1, camX = VW / 2, camY = VH / 2, ts = 1, celebT = 0, lvT = 0, bonus = 0, goldTotal = 1, goldLeft = 1, chain = 0, multOn = 1;
    let preview = [], holdT = 0, aHeld = false, ptrDown = false, fast = false, catchFx = 0, lastMult = 1;
    let best = env.load('pegs');
    const held = { left: false, right: false, up: false, down: false };

    // ---- level building blocks: round pegs, long pegs (capsules), arcs, rings, rows; mv = how a peg moves
    const rp = (x, y, mv) => ({ kind: 'r', x, y, r: 4, hl: 0, ang: 0, a0: 0, mv: mv || null });
    const lp = (x, y, ang, mv) => ({ kind: 'l', x, y, r: 2.6, hl: 6.5, ang, a0: ang, mv: mv || null });
    const rot = (cx, cy, R, a, w) => ({ k: 'rot', cx, cy, R, a, w });
    const slide = (bx, amp, w, ph) => ({ k: 'sl', bx, amp, w, ph: ph || 0 });
    function arcOf(cx, cy, R, a0, a1, n, long, w) {
      const o = [];
      for (let i = 0; i < n; i++) { const a = n === 1 ? a0 : a0 + (a1 - a0) * i / (n - 1), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, mv = w ? rot(cx, cy, R, a, w) : null; o.push(long ? lp(x, y, a + PI / 2, mv) : rp(x, y, mv)); }
      return o;
    }
    const ring = (cx, cy, R, n, long, w, off) => arcOf(cx, cy, R, off || 0, (off || 0) + TAU * (n - 1) / n, n, long, w);
    const row = (y, n, gap, long, mvf) => Array.from({ length: n }, (_, j) => { const x = 100 + (j - (n - 1) / 2) * gap, mv = mvf ? mvf(x, j) : null; return long ? lp(x, y, 0, mv) : rp(x, y, mv); });
    const LEVELS = [
      { name: 'Riverside', gold: 8, b: () => { let o = []; for (let i = 0; i < 8; i++) o = o.concat(row(78 + i * 24, i % 2 ? 7 : 8, 23)); return o; } },
      { name: 'Twin Rings', gold: 10, b: () => [].concat(row(64, 5, 32, true), ring(56, 130, 26, 10), ring(144, 130, 26, 10), [rp(56, 130), rp(144, 130), rp(100, 180), rp(14, 96), rp(186, 96), rp(14, 170), rp(186, 170)], arcOf(100, 120, 104, 0.28 * PI, 0.72 * PI, 11, true), row(258, 5, 34)) },
      { name: 'Smiles & Frowns', gold: 11, b: () => { const o = [].concat(arcOf(100, 122, 48, PI + 0.35, TAU - 0.35, 8, true), arcOf(54, 160, 30, 0.35, PI - 0.35, 6, true), arcOf(146, 160, 30, 0.35, PI - 0.35, 6, true), [rp(100, 140), rp(100, 166), rp(100, 192), rp(30, 58), rp(170, 58), rp(100, 50)], arcOf(100, 150, 110, 0.3 * PI, 0.7 * PI, 9, true)); for (let y = 84; y <= 234; y += 30) o.push(rp(11, y), rp(189, y)); return o; } },
      { name: 'Whirlpool', gold: 12, b: () => { const o = [rp(100, 165)]; for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 10; i++) { const t = i / 9, a = arm * TAU / 3 + t * 1.3 * PI, r = 15 + t * 56; o.push(rp(100 + Math.cos(a) * r, 165 + Math.sin(a) * r)); } return o.concat(arcOf(100, 160, 92, 0.12 * PI, 0.88 * PI, 10, true), row(60, 6, 30)); } },
      { name: 'Mill Wheel', gold: 13, b: (m) => [].concat(row(64, 7, 26), ring(100, 150, 54, 12, true, 0.55 * m), ring(100, 150, 22, 6, false, -0.9 * m), [rp(100, 150), rp(14, 120), rp(186, 120), rp(14, 180), rp(186, 180)], row(228, 8, 23), row(252, 7, 23)) },
      { name: 'Ferris Pair', gold: 13, b: (m) => [].concat(arcOf(100, 92, 40, PI + 0.5, TAU - 0.5, 5, true), ring(54, 135, 30, 9, false, 0.8 * m), ring(146, 135, 30, 9, false, -0.8 * m), [rp(54, 135), rp(146, 135), rp(100, 135)], row(200, 6, 30, true, (x) => slide(x, 13, 1.1 * m)), row(232, 7, 26), row(258, 3, 60, false, (x) => slide(x, 20, -0.9 * m))) },
      { name: 'Goose Windmill', gold: 16, b: (m) => { const o = [rp(100, 165)]; for (let a = 0; a < 4; a++) for (const R of [16, 29, 42]) o.push(rp(100 + Math.cos(a * PI / 2) * R, 165 + Math.sin(a * PI / 2) * R, rot(100, 165, R, a * PI / 2, 0.9 * m)));
        o.push(...row(66, 7, 26, false, (x) => slide(x, 10, 0.7 * m)), ...row(94, 6, 30, true, (x) => slide(x, 10, -0.7 * m)), ...row(238, 7, 26, false, (x) => slide(x, 10, 0.8 * m, 1)), ...row(262, 6, 30, true));
        for (let y = 128; y <= 206; y += 26) o.push(rp(16, y), rp(184, y)); return o; } },
    ];

    function place(p) { const m = p.mv; if (!m) return; if (m.k === 'rot') { const a = m.a + m.w * T; p.x = m.cx + Math.cos(a) * m.R; p.y = m.cy + Math.sin(a) * m.R; p.ang = p.a0 + m.w * T; } else p.x = m.bx + Math.sin(T * m.w + m.ph) * m.amp; }
    function movePegs() { for (const p of pegs) place(p); for (const p of rims) place(p); }
    const bucketX = () => (rims[0].x + rims[1].x) / 2;
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function say(a, b, t) { msg = a; msg2 = b || ''; msgT = t || 1.6; }
    function sparks(x, y, col, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(20, 70) * (sp || 1); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: rnd(0.25, 0.55), max: 0.55, col }); } }
    function ringFx(x, y, col, r) { parts.push({ ring: 1, x, y, t: 0.35, max: 0.35, r: r || 7, col }); }
    function pop(txt, x, y, col, size) { parts.push({ txt, x, y, t: 0.8, max: 0.8, col, size }); }
    function confetti(n) { const cols = [GOLD, ACC, '#ff7d8f', '#a57cff', '#fff', '#4fc185']; for (let i = 0; i < n; i++) conf.push({ x: rnd(0, VW), y: rnd(-40, -4), vx: rnd(-25, 25), vy: rnd(20, 70), a: rnd(0, TAU), va: rnd(-8, 8), col: cols[i % cols.length], t: rnd(2.5, 4) }); }
    const shotMult = () => { const f = (goldTotal - goldLeft) / goldTotal; return f >= 0.85 ? 5 : f >= 0.65 ? 3 : f >= 0.4 ? 2 : 1; };

    function loadLevel() {
      const L = LEVELS[lvl % LEVELS.length], lap = Math.floor(lvl / LEVELS.length), m = 1 + lap * 0.3, bw = 0.7 + Math.min(0.6, lvl * 0.06);
      pegs = L.b(m); for (const p of pegs) Object.assign(p, { type: 'blue', lit: false, gone: false, flash: 0, bump: 0, order: 0, tw: rnd(0, 9) });
      rims = [-1, 1].map((sd) => ({ kind: 'r', x: 0, y: BY, r: 2.4, hl: 0, ang: 0, a0: 0, mv: slide(VW / 2 + sd * BW / 2, VW / 2 - BW / 2 - 8, bw) }));
      T = 0; movePegs();
      const idx = shuffle(pegs.map((_, i) => i)); goldTotal = Math.min(L.gold + lap * 2, Math.floor(pegs.length * 0.45));
      for (let i = 0; i < goldTotal; i++) pegs[idx[i]].type = 'gold';
      pegs[idx[goldTotal]].type = 'goose';
      goldLeft = goldTotal; balls = 10; won = false; ball = null; celebT = 0; lastMult = 1; trail = []; pickMult();
      state = 'aim'; say('LEVEL ' + (lvl + 1), L.name + (lap ? ' · lap ' + (lap + 1) : ''), 2.2);
    }
    function pickMult() { for (const p of pegs) if (p.type === 'mult' && !p.lit) p.type = 'blue'; const c2 = pegs.filter((p) => p.type === 'blue' && !p.lit && !p.gone); if (c2.length) c2[Math.floor(Math.random() * c2.length)].type = 'mult'; }
    function start() { if (state === 'over' && overT < 0.6) return; score = 0; lvl = 0; newBest = false; startBest = best; parts = []; conf = []; loadLevel(); }
    function nextLevel() { lvl++; loadLevel(); }
    function gameOver() { state = 'over'; overT = 0; newBest = score > startBest; if (score > best) { best = score; env.save('pegs', best); } shake = 0.2; }

    // ---- physics: the ball against a round peg (circle) or a long peg (capsule), with the peg's own surface velocity
    function touch(b, p) {
      let qx = p.x, qy = p.y;
      if (p.kind === 'l') { const ex = Math.cos(p.ang) * p.hl, ey = Math.sin(p.ang) * p.hl, t = clamp(((b.x - p.x) * ex + (b.y - p.y) * ey) / (p.hl * p.hl), -1, 1); qx = p.x + ex * t; qy = p.y + ey * t; }
      const dx = b.x - qx, dy = b.y - qy, R = BR + p.r, d2 = dx * dx + dy * dy;
      if (d2 >= R * R) return false;
      const d = Math.sqrt(d2); let nx = 0, ny = -1; if (d > 1e-6) { nx = dx / d; ny = dy / d; }
      b.x = qx + nx * R; b.y = qy + ny * R;
      const m = p.mv; let ux = 0, uy = 0;
      if (m) { if (m.k === 'rot') { ux = -m.w * (qy - m.cy); uy = m.w * (qx - m.cx); } else ux = Math.cos(T * m.w + m.ph) * m.w * m.amp; }
      const vn = (b.vx - ux) * nx + (b.vy - uy) * ny;
      if (vn < 0) { const e = p.kind === 'l' ? 0.62 : 0.7; b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
      return true;
    }
    function walls(b) {
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * 0.8; return true; }
      if (b.x > VW - BR) { b.x = VW - BR; b.vx = -Math.abs(b.vx) * 0.8; return true; }
      if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy) * 0.5; return true; }
      return false;
    }
    function hit(p) {
      p.bump = 0.15;
      if (p.lit) return;
      p.lit = true; p.order = ++chain; p.flash = 0.3;
      const gold = p.type === 'gold', pts = (gold ? 100 : p.type === 'blue' ? 10 : 50) * shotMult() * multOn;
      score += pts; pop(String(pts), p.x, p.y - 8, gold ? '#ffe08a' : '#e6fdff', gold ? 8 : 6);
      sparks(p.x, p.y, COL[p.type].lit, gold ? 12 : 5); ringFx(p.x, p.y, COL[p.type].lit, 5);
      if (gold) {
        goldLeft--; shake = Math.max(shake, 0.07); env.buzz();
        const m2 = shotMult(); if (m2 > lastMult && goldLeft > 0) { lastMult = m2; say('x' + m2 + ' PEG POINTS', goldLeft + ' gold left', 1.4); }
        if (goldLeft === 0) { won = true; celebT = 1.5; shake = 0.35; confetti(90); sparks(p.x, p.y, GOLD, 30, 2); say('LEVEL CLEAR!', 'every gold peg is lit', 2.2); }
      }
      if (p.type === 'mult') { multOn *= 2; say('DOUBLE POINTS', 'x' + multOn + ' for the rest of this ball', 1.4); env.buzz(); }
      if (p.type === 'goose') { balls++; say('HONK! EXTRA BALL', balls + ' balls', 1.5); sparks(p.x, p.y, '#fff', 16, 1.5); env.buzz(); }
    }
    function endShot(caught) {
      const lines = [];
      if (caught) { balls++; catchFx = 0.8; sparks(bucketX(), BY, '#fff', 16); env.buzz(); }
      if (chain >= 8) { const b = chain * chain * 5 * shotMult(); score += b; lines.push(chain >= 25 ? 'HONK-TASTIC!' : chain >= 15 ? 'LONG FLIGHT!' : 'NICE CHAIN', chain + ' pegs · +' + b.toLocaleString()); }
      if (caught) { if (lines.length) lines[1] += ' · free ball'; else lines.push('FREE BALL!', 'the nest caught it'); }
      if (lines.length && !won) say(lines[0], lines[1], 1.8);
      ball = null; trail = [];
      clearQ = pegs.filter((p) => p.lit && !p.gone).sort((a, b) => a.order - b.order); clearIv = clamp(0.9 / Math.max(1, clearQ.length), 0.025, 0.07);
      clearT = 0.12; clearWait = 0.35; fast = false; state = 'clear';
    }
    function finishShot() {
      if (won) { bonus = 2000 + balls * 1000; score += bonus; state = 'levelup'; lvT = 0; if (score > best) { best = score; env.save('pegs', best); } confetti(60); return; }
      if (balls <= 0) { gameOver(); return; }
      state = 'aim'; pickMult();
    }
    function fire() {
      if (state !== 'aim' || balls <= 0) return;
      const dx = Math.sin(aim), dy = Math.cos(aim);
      balls--; chain = 0; multOn = 1;
      ball = { x: LX + dx * 12, y: LY + dy * 12, vx: dx * V0, vy: dy * V0, t: 0, deep: LY, st: 0 };
      state = 'fly'; sparks(ball.x, ball.y, '#e6fdff', 6); env.buzz();
    }
    function sub(h) {
      T += h; movePegs();
      const b = ball; b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
      walls(b);
      for (const p of pegs) if (!p.gone && touch(b, p)) hit(p);
      for (const p of rims) touch(b, p);
      const sp = Math.hypot(b.vx, b.vy); if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
      if (b.vy > 0 && b.y > BY && b.y < BY + 8 && Math.abs(b.x - bucketX()) < BW / 2 - 2.4) { endShot(true); return; }
      if (b.y > VH + BR + 2) endShot(false);
    }
    function unstick() { // a ball that has barely moved for a while: clear the lit pegs holding it, or give it a nudge
      let n = 0;
      for (const p of pegs) if (p.lit && !p.gone && Math.hypot(p.x - ball.x, p.y - ball.y) < 18) { p.gone = true; ringFx(p.x, p.y, COL[p.type].lit, 8); n++; }
      if (!n) { ball.vy = -90; ball.vx = rnd(-60, 60); }
    }
    function computePreview() { // the first bounce, shown as dots
      const b = { x: LX + Math.sin(aim) * 12, y: LY + Math.cos(aim) * 12, vx: Math.sin(aim) * V0, vy: Math.cos(aim) * V0 }, h = 1 / 120;
      preview = []; let hitAt = -1;
      for (let i = 0; i < 300; i++) {
        b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
        if (hitAt < 0) { if (walls(b)) hitAt = i; else for (const p of pegs) if (!p.gone && touch(b, p)) { hitAt = i; break; } }
        if (i % 3 === 0) preview.push(b.x, b.y, hitAt < 0 ? 1 : Math.max(0, 1 - (i - hitAt) / 32));
        if ((hitAt >= 0 && i - hitAt > 32) || b.y > VH) break;
      }
    }

    function tick(dt) {
      gt += dt; if (shake > 0) shake -= dt; if (msgT > 0) msgT -= dt; if (catchFx > 0) catchFx -= dt; if (celebT > 0) celebT -= dt;
      if (state === 'over') overT += dt; if (state === 'levelup') lvT += dt;
      // slow motion and zoom near the last gold peg, and for a moment after it lights
      let zt = 1, tt = 1, fx = VW / 2, fy = VH / 2;
      if (state === 'fly' && ball) {
        if (won && celebT > 0) { zt = 1.8; tt = 0.3; fx = ball.x; fy = ball.y; }
        else if (!won && goldLeft === 1) {
          const gp = pegs.find((p) => p.type === 'gold' && !p.lit);
          if (gp) { const dx = gp.x - ball.x, dy = gp.y - ball.y, d = Math.hypot(dx, dy); if (d < 40 && (dx * ball.vx + dy * ball.vy > 0 || d < 14)) { zt = 1.9; tt = 0.28; fx = (gp.x + ball.x) / 2; fy = (gp.y + ball.y) / 2; } }
        }
      }
      const e1 = Math.min(1, dt * 5); zoom += (zt - zoom) * e1; ts += (tt - ts) * Math.min(1, dt * 7);
      camX += (fx - camX) * Math.min(1, dt * 7); camY += (fy - camY) * Math.min(1, dt * 7);
      const hw = VW / 2 / zoom, hh = VH / 2 / zoom; camX = clamp(camX, hw, VW - hw); camY = clamp(camY, hh, VH - hh);
      const dtg = dt * ts, pdt = dt * Math.max(ts, 0.35);
      for (const p of pegs) { if (p.flash > 0) p.flash -= dt; if (p.bump > 0) p.bump -= dt; }
      parts = parts.filter((p) => { p.t -= pdt; if (p.txt) p.y -= 14 * pdt; else if (!p.ring) { p.x += p.vx * pdt; p.y += p.vy * pdt; p.vy += 60 * pdt; } return p.t > 0; });
      conf = conf.filter((q) => { q.t -= dt; q.x += (q.vx + Math.sin(gt * 3 + q.a) * 12) * dt; q.y += q.vy * dt; q.a += q.va * dt; return q.t > 0 && q.y < VH + 10; });
      if (state === 'levelup' && Math.random() < dt * 20) confetti(1);
      if (state === 'ready') { aim = Math.sin(gt * 0.9) * 0.7; T += dt; movePegs(); computePreview(); return; }
      if (state === 'aim') {
        const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        if (dir) { holdT += dt; aim = clamp(aim + dir * (0.3 + Math.min(1.4, holdT * 2)) * dt, -1.45, 1.45); } else holdT = 0;
      }
      if (state === 'fly' && ball) {
        ball.t += dtg;
        const n = Math.min(80, Math.ceil(Math.max(dtg * 480, Math.hypot(ball.vx, ball.vy) * dtg / 1.2)));
        for (let i = 0; i < n && state === 'fly'; i++) sub(dtg / n);
        if (state === 'fly') {
          trail.push(ball.x, ball.y); if (trail.length > 16) trail.splice(0, 2);
          if (ball.y > ball.deep + 2) { ball.deep = ball.y; ball.st = 0; } else if ((ball.st += dtg) > 2) { ball.st = 0.8; unstick(); } // no headway down the board for a while: it is stuck or rocking in a bowl
          if (ball.t > 25) { ball.t = 15; for (const p of pegs) if (p.lit && !p.gone) { p.gone = true; ringFx(p.x, p.y, COL[p.type].lit, 8); } }
        }
      } else if (state !== 'over') { T += dtg; movePegs(); }
      if (state === 'clear') {
        clearT -= dt * (fast ? 4 : 1);
        while (clearT <= 0 && clearQ.length) { const p = clearQ.shift(); p.gone = true; ringFx(p.x, p.y, COL[p.type].lit, 8); sparks(p.x, p.y, COL[p.type].lit, 3); clearT += clearIv; }
        if (!clearQ.length && (clearWait -= dt * (fast ? 3 : 1)) <= 0) finishShot();
      }
      if (state === 'aim') computePreview();
    }

    // ---- drawing (world units)
    function shape(c, p, pad, dx, dy, sc) { // a peg's outline grown by pad: a disc, or a thick round-capped line for a long peg
      if (p.kind === 'r') { c.beginPath(); c.arc(p.x + dx, p.y + dy, Math.max(0.3, (p.r + pad) * sc), 0, TAU); c.fill(); return; }
      const ex = Math.cos(p.ang) * p.hl * sc, ey = Math.sin(p.ang) * p.hl * sc;
      c.lineWidth = Math.max(0.6, (p.r + pad) * 2 * sc); c.beginPath(); c.moveTo(p.x - ex + dx, p.y - ey + dy); c.lineTo(p.x + ex + dx, p.y + ey + dy); c.stroke();
    }
    function gooseHead(c, x, y, z) {
      c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(x, y, z * 0.5, z * 0.42, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - z * 0.08, y + z * 0.14, z * 0.26, z * 0.15, 0.3, 0, TAU); c.fill();
      c.fillStyle = '#3a3d44'; c.beginPath(); c.moveTo(x + z * 0.38, y - z * 0.1); c.lineTo(x + z * 0.85, y + z * 0.02); c.lineTo(x + z * 0.38, y + z * 0.14); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + z * 0.16, y - z * 0.13, z * 0.08, 0, TAU); c.fill();
    }
    function drawPeg(c, p) {
      const C = COL[p.type], sc = 1 + Math.max(0, p.bump) * 1.6;
      c.lineCap = 'round';
      if (p.lit) { c.globalAlpha = 0.3 + 0.15 * Math.sin(gt * 8 + p.order); c.fillStyle = c.strokeStyle = C.lit; shape(c, p, 2.8, 0, 0, sc); c.globalAlpha = 1; }
      c.fillStyle = c.strokeStyle = 'rgba(0,0,0,.35)'; shape(c, p, 0, 0.7, 1, sc);
      c.fillStyle = c.strokeStyle = p.lit ? C.base : C.rim; shape(c, p, 0, 0, 0, sc);
      c.fillStyle = c.strokeStyle = p.lit ? C.lit : C.base; shape(c, p, -0.9, 0, 0, sc);
      if (p.flash > 0) { c.globalAlpha = Math.min(1, p.flash * 3); c.fillStyle = c.strokeStyle = '#fff'; shape(c, p, 0, 0, 0, sc); c.globalAlpha = 1; }
      if (p.kind === 'r') { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(p.x - 1.2, p.y - 1.3, 1.1, 0, TAU); c.fill(); }
      else { c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.7; const ex = Math.cos(p.ang) * p.hl * 0.7, ey = Math.sin(p.ang) * p.hl * 0.7; c.beginPath(); c.moveTo(p.x - ex - 0.6, p.y - ey - 0.8); c.lineTo(p.x + ex - 0.6, p.y + ey - 0.8); c.stroke(); }
      if (p.type === 'goose') gooseHead(c, p.x - 0.6, p.y, p.kind === 'r' ? 5 : 4.4);
      else if (p.type === 'mult') { c.fillStyle = p.lit ? '#5a3aa8' : '#fff'; font(c, 800, 4.6); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('x2', p.x, p.y + 0.3); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; }
      else if (p.type === 'gold' && !p.lit) { const tw = Math.sin(gt * 2.2 + p.tw); if (tw > 0.8) { const a = (tw - 0.8) * 5; c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.moveTo(p.x + 1.5, p.y - 4.5); c.lineTo(p.x + 2, p.y - 2); c.lineTo(p.x + 4.5, p.y - 1.5); c.lineTo(p.x + 2, p.y - 1); c.lineTo(p.x + 1.5, p.y + 1.5); c.lineTo(p.x + 1, p.y - 1); c.lineTo(p.x - 1.5, p.y - 1.5); c.lineTo(p.x + 1, p.y - 2); c.closePath(); c.fill(); } }
    }
    function drawBall(c, x, y) {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(x + 0.7, y + 1, BR, 0, TAU); c.fill();
      const bg = c.createRadialGradient(x - 1, y - 1.1, 0.2, x, y, BR); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.45, '#d6e0e7'); bg.addColorStop(1, '#6b7885');
      c.fillStyle = bg; c.beginPath(); c.arc(x, y, BR, 0, TAU); c.fill();
    }
    function field(c) {
      const gr = c.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#14596b'); gr.addColorStop(1, '#071f28'); c.fillStyle = gr; c.fillRect(0, 0, VW, VH);
      const gl = c.createRadialGradient(100, 150, 10, 100, 150, 160); gl.addColorStop(0, 'rgba(120,230,255,.12)'); gl.addColorStop(1, 'rgba(120,230,255,0)'); c.fillStyle = gl; c.fillRect(0, 0, VW, VH);
      c.globalAlpha = 0.08; fit(c, env.pic('goose'), 100, 160, 110, 110); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 10; y < VH; y += 14) for (let x = (y % 28 ? 7 : 0); x < VW; x += 14) c.fillRect(x, y, 0.8, 0.8);
      c.save(); c.translate(VW / 2, VH / 2); c.scale(zoom, zoom); c.translate(-camX, -camY);
      for (const p of pegs) if (!p.gone) drawPeg(c, p);
      // the nest-boat that gives the ball back
      const bx = bucketX();
      c.fillStyle = catchFx > 0 ? '#ffe9a8' : '#8b6a43'; c.beginPath(); c.moveTo(bx - BW / 2, BY); c.lineTo(bx + BW / 2, BY); c.lineTo(bx + BW / 2 - 6, BY + 13); c.lineTo(bx - BW / 2 + 6, BY + 13); c.closePath(); c.fill();
      c.strokeStyle = '#c49a63'; c.lineWidth = 0.7; c.beginPath(); for (let i = 0; i < 6; i++) { const x = bx - BW / 2 + 5 + i * 5; c.moveTo(x, BY + 1.5); c.lineTo(x + 3, BY + 7); } c.stroke();
      c.fillStyle = 'rgba(255,255,255,.85)'; font(c, 800, 5); c.textAlign = 'center'; c.fillText('FREE', bx, BY + 11); c.textAlign = 'left';
      for (const r of rims) { c.fillStyle = '#f4f6f8'; c.beginPath(); c.arc(r.x, r.y, r.r, 0, TAU); c.fill(); }
      if (catchFx > 0) { c.strokeStyle = `rgba(255,233,168,${catchFx})`; c.lineWidth = 1.2; c.beginPath(); c.arc(bx, BY + 4, 22 * (1.4 - catchFx), 0, TAU); c.stroke(); }
      c.fillStyle = 'rgba(80,190,210,.35)'; c.beginPath(); c.moveTo(0, VH); for (let x = 0; x <= VW; x += 5) c.lineTo(x, VH - 4 + Math.sin(x * 0.12 + gt * 2) * 1.2); c.lineTo(VW, VH); c.closePath(); c.fill();
      // the aim preview
      if (state === 'aim' || state === 'ready') for (let i = 0; i < preview.length; i += 3) { const a = preview[i + 2]; if (a <= 0) continue; c.fillStyle = `rgba(255,255,255,${(state === 'ready' ? 0.35 : 0.8) * a})`; c.beginPath(); c.arc(preview[i], preview[i + 1], a < 1 ? 0.8 : 1, 0, TAU); c.fill(); }
      // the launcher
      c.save(); c.translate(LX, LY); c.rotate(-aim);
      c.fillStyle = '#04121a'; rr(c, -4.2, 0.6, 8.4, 15, 2.5); c.fill(); c.fillStyle = '#dfe7ec'; rr(c, -3.6, 0, 7.2, 14, 2.2); c.fill(); c.fillStyle = ACC; c.fillRect(-3.6, 9.5, 7.2, 2.6);
      c.restore();
      c.fillStyle = '#04121a'; c.beginPath(); c.arc(LX + 0.6, LY + 0.8, 9, 0, TAU); c.fill(); c.fillStyle = DEEP; c.beginPath(); c.arc(LX, LY, 9, 0, TAU); c.fill();
      c.strokeStyle = '#e8f6f8'; c.lineWidth = 1.2; c.stroke(); gooseHead(c, LX - 1.2, LY - 0.5, 8);
      if (state === 'aim' && balls > 0) drawBall(c, LX + Math.sin(aim) * 12, LY + Math.cos(aim) * 12);
      if (ball) {
        for (let i = 0; i < trail.length; i += 2) { const a = i / trail.length; c.fillStyle = `rgba(200,250,255,${a * 0.35})`; c.beginPath(); c.arc(trail[i], trail[i + 1], BR * (0.4 + a * 0.6), 0, TAU); c.fill(); }
        drawBall(c, ball.x, ball.y);
      }
      c.globalCompositeOperation = 'lighter';
      for (const p of parts) { const a = Math.max(0, p.t / p.max); if (p.ring) { c.strokeStyle = p.col; c.globalAlpha = a; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.r * (1.8 - a), 0, TAU); c.stroke(); } else if (!p.txt) { c.globalAlpha = a; c.fillStyle = p.col; c.fillRect(p.x - 0.7, p.y - 0.7, 1.4, 1.4); } }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.textAlign = 'center'; for (const p of parts) if (p.txt) { c.globalAlpha = Math.min(1, p.t * 3); font(c, 800, p.size); c.fillStyle = 'rgba(0,0,0,.45)'; c.fillText(p.txt, p.x + 0.4, p.y + 0.5); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y); } c.globalAlpha = 1; c.textAlign = 'left';
      c.restore();
      if (zoom > 1.03) { const a = clamp((zoom - 1) * 0.6, 0, 0.45), vg = c.createRadialGradient(VW / 2, VH / 2, VW * 0.3, VW / 2, VH / 2, VH * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${a})`); c.fillStyle = vg; c.fillRect(0, 0, VW, VH); }
      for (const q of conf) { c.save(); c.translate(q.x, q.y); c.rotate(q.a); c.fillStyle = q.col; c.fillRect(-1.6, -0.9, 3.2, 1.8); c.restore(); }
    }
    const ballIcon = (c, x, y, r) => { c.fillStyle = '#e6eef3'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU); c.fill(); };
    function goldMeter(c, x, y, w, h) {
      const f = (goldTotal - goldLeft) / goldTotal;
      c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, x, y, w, h, h / 2); c.fill();
      if (f > 0) { c.fillStyle = GOLD; rr(c, x, y, Math.max(h, w * f), h, h / 2); c.fill(); }
      for (const [fr, lab] of [[0.4, 'x2'], [0.65, 'x3'], [0.85, 'x5']]) { c.fillStyle = f >= fr ? '#3b2a00' : 'rgba(255,255,255,.45)'; c.fillRect(x + w * fr - 0.5, y + 1, 1, h - 2); }
    }
    function panels(c) {
      const L = LEVELS[lvl % LEVELS.length];
      if (wide) {
        const big = (label, val, x, y, al, col) => { c.textAlign = al; c.fillStyle = 'rgba(255,255,255,.55)'; font(c, 700, 11 * k); c.fillText(label, x, y); c.fillStyle = col || '#fff'; font(c, 800, 22 * k); c.fillText(val, x, y + 24 * k); c.textAlign = 'left'; };
        const lx = 20 * k, rx = W - 20 * k;
        big('SCORE', score.toLocaleString(), lx, 40 * k, 'left', '#ffe08a'); big('BEST', Math.max(best, score).toLocaleString(), lx, 100 * k, 'left');
        big('LEVEL ' + (lvl + 1), L.name, lx, 160 * k, 'left');
        big('BALLS', String(Math.max(0, balls)), rx, 40 * k, 'right');
        for (let i = 0; i < Math.min(15, balls); i++) ballIcon(c, rx - 6 * k - (i % 5) * 15 * k - 60 * k, 52 * k + Math.floor(i / 5) * 13 * k, 5 * k);
        c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.55)'; font(c, 700, 11 * k); c.fillText('GOLD LEFT', rx, 110 * k);
        c.fillStyle = GOLD; font(c, 800, 22 * k); c.fillText(goldLeft + ' / ' + goldTotal, rx, 134 * k); c.textAlign = 'left';
        const mw = Math.min(150 * k, W - ox - VW * s - 40 * k); goldMeter(c, rx - mw, 144 * k, mw, 9 * k);
        c.fillStyle = 'rgba(255,255,255,.55)'; font(c, 700, 11 * k); c.textAlign = 'right'; c.fillText('PEG POINTS  x' + shotMult() + (multOn > 1 ? '  ·  x' + multOn : ''), rx, 174 * k);
        c.fillStyle = 'rgba(255,255,255,.4)'; font(c, 500, 11 * k);
        (env.touch ? ['Touch to aim, let go to fire', 'Light every gold peg'] : ['Left / right aims, A fires', 'Or click, aim, release']).forEach((l, i) => c.fillText(l, rx, H - 40 * k + i * 16 * k)); c.textAlign = 'left';
      } else {
        const x0 = ox + 7 * k, x1 = ox + VW * s - 7 * k;
        c.fillStyle = '#ffe08a'; font(c, 800, 15 * k); c.fillText(score.toLocaleString(), x0, oy + 18 * k);
        c.fillStyle = 'rgba(255,255,255,.7)'; font(c, 700, 10 * k); c.fillText('L' + (lvl + 1) + ' · gold ' + goldLeft + '/' + goldTotal, x0, oy + 32 * k);
        goldMeter(c, x0, oy + 37 * k, 70 * k, 5 * k);
        c.textAlign = 'right'; c.fillStyle = '#fff'; font(c, 800, 15 * k); c.fillText(String(Math.max(0, balls)), x1, oy + 18 * k);
        const tw = c.measureText(String(Math.max(0, balls))).width; ballIcon(c, x1 - tw - 9 * k, oy + 13 * k, 5 * k);
        c.fillStyle = 'rgba(255,255,255,.7)'; font(c, 700, 10 * k); c.fillText('x' + shotMult() + (multOn > 1 ? ' · x' + multOn : ''), x1, oy + 32 * k); c.textAlign = 'left';
      }
      const fw = VW * s, cx = ox + fw / 2;
      if (state === 'fly' && chain >= 3) { c.globalAlpha = 0.85; c.textAlign = 'center'; c.fillStyle = chain >= 15 ? '#ffe08a' : '#dffbff'; font(c, 800, (12 + Math.min(8, chain * 0.3)) * k); c.fillText(chain + ' peg chain', cx, oy + VH * s * 0.8); c.textAlign = 'left'; c.globalAlpha = 1; }
      if (msgT > 0 && state !== 'over') {
        c.globalAlpha = Math.min(1, msgT * 3); c.textAlign = 'center'; const y = oy + VH * s * 0.42;
        font(c, 800, 24 * k); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(msg, cx + 2, y + 2); c.fillStyle = '#ffd66b'; c.fillText(msg, cx, y);
        if (msg2) { font(c, 600, 13 * k); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(msg2, cx + 1, y + 21 * k + 1); c.fillStyle = '#fff'; c.fillText(msg2, cx, y + 21 * k); }
        c.textAlign = 'left'; c.globalAlpha = 1;
      }
      if (state === 'aim' && msgT <= 0 && balls === 10 && goldLeft === goldTotal) { c.globalAlpha = 0.55 + Math.sin(gt * 4) * 0.3; c.textAlign = 'center'; c.fillStyle = '#fff'; font(c, 700, 12 * k); c.fillText(env.touch ? 'Touch to aim · let go to fire' : 'Left / right aims · A fires', cx, oy + VH * s * 0.42); c.textAlign = 'left'; c.globalAlpha = 1; }
    }
    function card(c, title, sub) {
      c.fillStyle = 'rgba(4,16,22,.66)'; c.fillRect(0, 0, W, H);
      const z = Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400)); c.textAlign = 'center';
      c.fillStyle = '#fff'; font(c, 800, 38 * z); c.fillText(title, W / 2, H / 2 - 6 * z);
      c.fillStyle = 'rgba(255,255,255,.8)'; font(c, 500, 16 * z); sub.split('\n').forEach((ln, i) => c.fillText(ln, W / 2, H / 2 + 28 * z + i * 23 * z)); c.textAlign = 'left';
    }

    const g = {
      resize(w, h) { W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3); s = Math.min(W / VW, H / VH); ox = (W - VW * s) / 2; oy = (H - VH * s) / 2; wide = ox > 110 * k; },
      reset() { lvl = 0; score = 0; parts = []; conf = []; newBest = false; startBest = best; loadLevel(); state = 'ready'; msgT = 0; zoom = 1; ts = 1; camX = VW / 2; camY = VH / 2; aHeld = false; ptrDown = false; for (const q in held) held[q] = false; },
      step(dt) { tick(clamp(dt, 0, 0.05)); },
      draw(c) {
        c.fillStyle = '#061a22'; c.fillRect(0, 0, W, H);
        if (wide) { c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(ox - 2, 0, 2, H); c.fillRect(ox + VW * s, 0, 2, H); }
        c.save(); if (shake > 0) c.translate(rnd(-1, 1) * shake * 12, rnd(-1, 1) * shake * 12);
        c.save(); c.translate(ox, oy); c.scale(s, s); c.beginPath(); c.rect(0, 0, VW, VH); c.clip(); field(c); c.restore();
        c.restore();
        if (state !== 'ready') panels(c);
        const L2 = LEVELS[(lvl + 1) % LEVELS.length];
        if (state === 'levelup') card(c, 'Level ' + (lvl + 1) + ' clear!', 'Bonus +' + bonus.toLocaleString() + ' · score ' + score.toLocaleString() + '\nNext: ' + L2.name + '\n' + (env.touch ? 'Tap for the next level' : 'Press A for the next level'));
        if (state === 'ready') card(c, 'Peg Drop', (env.touch ? 'Touch to aim, let go to fire' : 'Left / right aims · A fires (or click)') + '\nLight every gold peg within 10 balls\n' + startWord(env));
        if (state === 'over') card(c, 'Out of balls', 'Score ' + score.toLocaleString() + ' · level ' + (lvl + 1) + (newBest ? ' · new best!' : '') + '\n' + againWord(env));
      },
      key(k2) {
        if (k2 === 'l') k2 = 'left'; if (k2 === 'r') k2 = 'right';
        if (k2 === 'a') {
          if (aHeld) return true; aHeld = true;
          if (state === 'ready' || state === 'over') start(); else if (state === 'aim') fire(); else if (state === 'levelup' && lvT > 0.8) nextLevel(); else if (state === 'clear') fast = true;
          return true;
        }
        if (k2 in held) { held[k2] = true; return true; }
        return false;
      },
      release(k2) {
        if (k2 === 'l') k2 = 'left'; if (k2 === 'r') k2 = 'right';
        if (k2 === 'all') { for (const q in held) held[q] = false; aHeld = false; ptrDown = false; }
        else if (k2 === 'ptr') { if (ptrDown && state === 'aim') fire(); ptrDown = false; }
        else if (k2 === 'a') aHeld = false;
        else if (k2 in held) held[k2] = false;
      },
      pointer(type, x, y) {
        const wx = (x - ox) / s, wy = (y - oy) / s;
        const aimAt = () => { aim = clamp(Math.atan2(wx - LX, Math.max(2, wy - LY)), -1.45, 1.45); };
        if (type === 'down') {
          if (state === 'ready' || state === 'over') { start(); return; }
          if (state === 'levelup') { if (lvT > 0.8) nextLevel(); return; }
          if (state === 'clear') { fast = true; return; }
          if (state === 'aim') { ptrDown = true; aimAt(); }
          return;
        }
        if (type === 'move') { if (ptrDown && state === 'aim') aimAt(); return; }
        if (type === 'up') { if (ptrDown && state === 'aim') { aimAt(); fire(); } ptrDown = false; }
      },
      hud: () => ['Score ' + score.toLocaleString(), state === 'ready' || state === 'over' ? 'Best ' + Math.max(best, score).toLocaleString() : 'Level ' + (lvl + 1) + ' · ' + Math.max(0, balls) + ' balls'],
    };
    return g;
  }

  function ICON_pegs(c, z) {
    const g = c.createLinearGradient(0, 0, 0, z); g.addColorStop(0, '#14596b'); g.addColorStop(1, '#071f28'); c.fillStyle = g; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.16); c.fill();
    const pg = [[0.27, 0.46, '#3fb6c6'], [0.5, 0.46, GOLD], [0.73, 0.46, '#3fb6c6'], [0.385, 0.6, '#a57cff'], [0.615, 0.6, '#c8fbff', 1], [0.27, 0.74, GOLD], [0.5, 0.74, '#3fb6c6'], [0.73, 0.74, GOLD]];
    for (const [x, y, col, lit] of pg) {
      if (lit) { c.fillStyle = 'rgba(200,251,255,.35)'; c.beginPath(); c.arc(z * x, z * y, z * 0.085, 0, 7); c.fill(); }
      c.fillStyle = col; c.beginPath(); c.arc(z * x, z * y, z * 0.058, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(z * (x - 0.017), z * (y - 0.018), z * 0.018, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 1; i <= 5; i++) { const t = i / 6; c.beginPath(); c.arc(z * (0.5 + t * 0.12), z * (0.2 + t * 0.2 + t * t * 0.12), z * 0.013, 0, 7); c.fill(); }
    c.save(); c.translate(z * 0.5, z * 0.17); c.rotate(-0.45); c.fillStyle = '#dfe7ec'; rr(c, -z * 0.035, 0, z * 0.07, z * 0.12, z * 0.02); c.fill(); c.restore();
    c.fillStyle = DEEP; c.beginPath(); c.arc(z * 0.5, z * 0.17, z * 0.075, 0, 7); c.fill(); c.strokeStyle = '#e8f6f8'; c.lineWidth = z * 0.015; c.stroke();
    const bg = c.createRadialGradient(z * 0.6, z * 0.33, 1, z * 0.61, z * 0.34, z * 0.045); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#8a97a3'); c.fillStyle = bg; c.beginPath(); c.arc(z * 0.615, z * 0.34, z * 0.04, 0, 7); c.fill();
    c.fillStyle = '#8b6a43'; c.beginPath(); c.moveTo(z * 0.36, z * 0.82); c.lineTo(z * 0.64, z * 0.82); c.lineTo(z * 0.59, z * 0.9); c.lineTo(z * 0.41, z * 0.9); c.closePath(); c.fill();
    c.fillStyle = '#f4f6f8'; for (const x of [0.36, 0.64]) { c.beginPath(); c.arc(z * x, z * 0.82, z * 0.02, 0, 7); c.fill(); }
  }

  /* ---------------- Goose Defense ----------------
     Tower defense: robots march along a winding path to the goose nest; build, upgrade and sell four kinds of tower.
     Written from scratch. The overall structure (waypoint polyline with cumulative distances, enemies stored as a distance
     along it, towers targeting the enemy furthest along) is the usual one, as seen in MIT-licensed projects such as
     victorqribeiro/towerdefense and IAmConnorWilson/canvas-td; no code, art or level data was copied from them.
     The map is defined in landscape and transposed on portrait screens, so the path runs left-to-right or top-to-bottom. */
  function defense(env) {
    const GW = 14, GH = 8, WAVES_N = 20;
    const WAY = [[-1, 1], [2, 1], [2, 6], [5, 6], [5, 2], [8, 2], [8, 6], [11, 6], [11, 3], [13, 3]];
    const DECOR = { '0,6': 'w', '0,7': 'w', '1,7': 'w', '12,0': 't', '13,0': 't', '4,0': 't', '9,7': 't', '12,6': 't', '13,7': 'r', '7,0': 'r' };
    const grid = []; // 0 grass, 1 path, 2 decor, 3 nest
    for (let x = 0; x < GW; x++) { grid[x] = []; for (let y = 0; y < GH; y++) grid[x][y] = DECOR[x + ',' + y] ? 2 : 0; }
    for (let i = 1; i < WAY.length; i++) {
      let [x, y] = WAY[i - 1]; const [bx, by] = WAY[i];
      for (;;) { if (x >= 0 && x < GW) grid[x][y] = 1; if (x === bx && y === by) break; x += Math.sign(bx - x); y += Math.sign(by - y); }
    }
    const NX = 13, NY = 3; grid[NX][NY] = 3;
    const PTS = WAY.map(([x, y]) => [x + 0.5, y + 0.5]); PTS[0][0] = -0.9;
    const SEG = []; let pathLen = 0;
    for (let i = 1; i < PTS.length; i++) { const [ax, ay] = PTS[i - 1], [bx, by] = PTS[i], len = Math.hypot(bx - ax, by - ay); SEG.push({ ax, ay, dx: (bx - ax) / len, dy: (by - ay) / len, len, s: pathLen, ang: Math.atan2(by - ay, bx - ax) }); pathLen += len; }
    const F0 = PTS[0], F1 = PTS[PTS.length - 1], flyLen = Math.hypot(F1[0] - F0[0], F1[1] - F0[1]), flyAng = Math.atan2(F1[1] - F0[1], F1[0] - F0[0]);
    function along(d) { d = clamp(d, 0, pathLen); let i = 0; while (i < SEG.length - 1 && d > SEG[i].s + SEG[i].len) i++; const g = SEG[i], f = d - g.s; return [g.ax + g.dx * f, g.ay + g.dy * f, g.ang]; }
    let seed = 7; const srnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const TUFT = []; for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) TUFT.push([x + srnd() * 0.8 + 0.1, y + srnd() * 0.8 + 0.1, srnd()], [x + srnd() * 0.8 + 0.1, y + srnd() * 0.8 + 0.1, srnd()]);

    const TD = [
      { id: 'pellet', name: 'Pellet Goose', role: 'quick shots, hits flyers', col: '#1aa3b3', cost: 50, up: [45, 90], dmg: [5, 9, 15], rate: [0.42, 0.34, 0.26], rng: [2.2, 2.5, 2.8], air: 1 },
      { id: 'honk', name: 'Honk Cannon', role: 'splash, ground only', col: GOLD, cost: 80, up: [70, 130], dmg: [14, 26, 46], splash: [0.95, 1.1, 1.3], rate: [1.45, 1.3, 1.15], rng: [2.1, 2.3, 2.6], air: 0 },
      { id: 'frost', name: 'Frost Goose', role: 'slows all nearby', col: '#5fbfe9', cost: 60, up: [55, 100], dmg: [2, 4, 7], slow: [0.4, 0.5, 0.6], dur: [1.6, 1.9, 2.3], rate: [1.1, 1, 0.9], rng: [1.7, 1.95, 2.25], air: 1 },
      { id: 'sniper', name: 'Sniper Nest', role: 'long range, pierces armour', col: '#7b61c9', cost: 110, up: [90, 160], dmg: [45, 90, 170], rate: [1.9, 1.7, 1.4], rng: [4, 4.7, 5.5], air: 1, pierce: 1 },
    ];
    const ED = {
      drone: { hp: 22, spd: 1.1, rew: 4, r: 0.27, lives: 1, armor: 0 },
      zip: { hp: 12, spd: 2.1, rew: 3, r: 0.21, lives: 1, armor: 0 },
      tank: { hp: 60, spd: 0.7, rew: 9, r: 0.33, lives: 2, armor: 4 },
      flyer: { hp: 20, spd: 1.15, rew: 5, r: 0.25, lives: 1, armor: 0, fly: 1 },
      medic: { hp: 36, spd: 0.9, rew: 8, r: 0.27, lives: 1, armor: 0, heal: 1 },
      boss: { hp: 300, spd: 0.42, rew: 120, r: 0.5, lives: 8, armor: 3, boss: 1 },
    };
    const WAVES = [
      'drone 8 1.1', 'drone 12 .9', 'drone 8 .9|zip 6 .6', 'drone 8 .8|tank 4 2', 'flyer 6 1.1|drone 10 .7',
      'drone 10 .7|medic 2 2|zip 8 .5', 'tank 6 1.4|medic 3 1.5|flyer 6 .9', 'zip 20 .35', 'tank 8 1.2|medic 4 1.2|drone 12 .5', 'drone 10 .6|boss 1 1',
      'flyer 12 .7|zip 12 .4', 'tank 10 1|medic 5 1', 'drone 20 .45|flyer 10 .6', 'zip 25 .3|tank 6 1', 'tank 14 .9|medic 6 .9',
      'flyer 20 .55|medic 4 1', 'drone 30 .3|tank 10 .8', 'zip 30 .25|flyer 14 .5', 'tank 16 .8|medic 8 .8|flyer 12 .5', 'drone 20 .4|tank 10 .8|boss 2 7',
    ].map((s) => s.split('|').map((g) => { const [t, n, gap] = g.split(' '); return [t, +n, +gap]; }));
    const INTRO = { 3: 'Zippers are fast', 4: 'Armour: pellets bounce, snipers pierce', 5: 'Flyers skip the path. Cannons can\'t hit them', 6: 'Medics repair robots nearby', 10: 'A boss is coming', 20: 'Final wave' };
    const hpMul = (n) => 1 + 0.16 * (n - 1) + 0.02 * (n - 1) * (n - 1);

    let W = 800, H = 436, k = 1, port = false, ts = 40, ox = 0, oy = 0, mw = 0, mh = 0, gt = 0;
    let PANEL = { x: 0, y: 0, w: 0, h: 0 }, BTN = [];
    let state, towers, foes, shots, fx, pops, coins, lives, score, wave, queue, qT, cd, speed, shake, nestHit, ann, annSub, annT, overT, won, newBest, cur, pick, kbd, hover, bossRef, flash;
    let best = env.load('defense');
    const held = {}; let rep = null;

    // ---- coordinates: map units (landscape grid) -> screen
    const P = (x, y) => (port ? [ox + y * ts, oy + x * ts] : [ox + x * ts, oy + y * ts]);
    const SA = (a) => (port ? Math.PI / 2 - a : a);
    const toMap = (sx, sy) => (port ? [(sy - oy) / ts, (sx - ox) / ts] : [(sx - ox) / ts, (sy - oy) / ts]);
    function layout() {
      port = H > W * 1.02; k = clamp(Math.min(W, H) / 400, 0.75, 1.2);
      if (!port) {
        const pw = Math.round(clamp(W * 0.15, 104, 150));
        ts = Math.min((W - pw - 14) / GW, (H - 12) / GH); mw = GW * ts; mh = GH * ts;
        ox = Math.round((W - pw - 6 - mw) / 2); oy = Math.round((H - mh) / 2);
        const px = ox + mw + 8; PANEL = { x: px, y: oy, w: W - px - 6, h: mh };
        const bh = 60 * k, sh = 32 * k;
        BTN = [{ x: px, y: oy + mh - sh - bh - 8 * k, w: PANEL.w, h: bh }, { x: px, y: oy + mh - sh, w: PANEL.w, h: sh }];
      } else {
        const top = 38 * k, bot = 54 * k;
        ts = Math.min((W - 12) / GH, (H - top - bot - 8) / GW); mw = GH * ts; mh = GW * ts;
        ox = Math.round((W - mw) / 2); oy = Math.round(top + (H - top - bot - mh) / 2);
        PANEL = { x: 6, y: 4, w: W - 12, h: top - 8 };
        const sw = 66 * k, by = H - bot + 6 * k, bh = bot - 12 * k;
        BTN = [{ x: 8, y: by, w: W - 24 - sw, h: bh }, { x: W - 8 - sw, y: by, w: sw, h: bh }];
      }
    }

    // ---- game logic
    function canBuild(x, y) { return x >= 0 && y >= 0 && x < GW && y < GH && grid[x][y] === 0 && !towerAt(x, y); }
    function towerAt(x, y) { return towers.find((t) => t.x === x && t.y === y); }
    function burst(x, y, n, cols, sp, sz) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(0.5, 2.4) * (sp || 1); fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.7), max: 0.7, r: rnd(0.04, 0.09) * (sz || 1), col: cols[i % cols.length] }); } }
    function ring(x, y, r, col, life, fill) { fx.push({ ring: 1, x, y, r, col, life: life || 0.4, max: life || 0.4, fill }); }
    function pop(x, y, txt, col, t, big) { pops.push({ x, y, txt, col: col || '#fff', t: t || 0.9, max: t || 0.9, big }); }
    function say(a, b, t) { ann = a; annSub = b || ''; annT = t || 2.2; }
    function startWave() {
      wave++; queue = []; qT = 0; cd = null;
      let t = 0.4; for (const [type, n, gap] of WAVES[wave - 1]) { for (let i = 0; i < n; i++) queue.push([t + i * gap, type]); t += n * gap + 1.4; }
      if (wave > 1) { const b = 20 + wave * 2; coins += b; }
      say(wave === WAVES_N ? 'FINAL WAVE' : 'WAVE ' + wave, INTRO[wave] || '', 2.4);
      if (WAVES[wave - 1].some((g) => g[0] === 'boss')) flash = 0.6;
    }
    function callNext() {
      if (state !== 'play' || cd === null || wave >= WAVES_N) return false;
      const bonus = Math.floor(cd * 1.2); if (bonus > 0) { coins += bonus; score += bonus * 5; const b = BTN[0]; pops.push({ sx: b.x + b.w / 2, sy: b.y, txt: '+' + bonus, col: GOLD, t: 1, max: 1, big: 1 }); }
      startWave(); env.buzz(); return true;
    }
    function spawn(type) {
      const d = ED[type], hp = Math.round(d.hp * hpMul(wave) * (type === 'boss' && wave === WAVES_N ? 1.35 : 1));
      const e = { type, def: d, hp, max: hp, d: 0, x: F0[0], y: F0[1], ang: 0, slowT: 0, slowF: 0, hit: 0, healT: 1.2, wob: rnd(0, 6), prog: 0 };
      foes.push(e); if (d.boss) bossRef = e;
    }
    function hurt(e, dmg, pierce) {
      if (e.hp <= 0) return;
      const a = pierce ? 0 : e.def.armor; e.hp -= Math.max(dmg * 0.25, dmg - a); e.hit = 0.08;
      if (a && !pierce && dmg <= a * 1.5) burst(e.x, e.y, 2, ['#fff', '#cfd5dc'], 1, 0.7);
      if (e.hp <= 0) kill(e);
    }
    function kill(e) {
      const d = e.def; coins += d.rew; score += d.rew * 10;
      pop(e.x, e.y - 0.3, '+' + d.rew, GOLD, 0.9, d.boss);
      burst(e.x, e.y, d.boss ? 40 : 12, ['#ffd66b', '#ff9f43', '#fff', '#8a919c'], d.boss ? 2 : 1, d.boss ? 2 : 1);
      ring(e.x, e.y, d.boss ? 1.6 : 0.6, 'rgba(255,214,107,', 0.35);
      if (d.boss) { shake = Math.max(shake, 0.5); bossRef = null; say('BOSS DOWN', '+' + d.rew + ' coins', 1.8); }
      env.buzz();
    }
    function leak(e) {
      e.hp = 0; lives = Math.max(0, lives - e.def.lives); shake = Math.max(shake, e.def.boss ? 0.6 : 0.25); nestHit = 0.6;
      burst(NX + 0.5, NY + 0.5, 14, ['#f2efe8', '#8b7a66', RED], 1.4); pop(NX + 0.5, NY - 0.1, '-' + e.def.lives, RED, 1);
      if (e.def.boss) bossRef = null;
      env.buzz();
      if (lives <= 0) end(false);
    }
    function end(w) {
      state = 'over'; overT = 0; won = w; pick = null;
      if (w) score += lives * 200 + 2000;
      newBest = score > best; if (newBest) { best = score; env.save('defense', best); }
    }
    const stat = (t, key, lvl) => TD[t.ti][key][lvl === undefined ? t.lvl : lvl];
    function fire(t, e) {
      const td = TD[t.ti], cx = t.x + 0.5, cy = t.y + 0.5; t.kick = 1;
      if (td.id === 'pellet') shots.push({ kind: 'seed', x: cx + Math.cos(t.aim) * 0.4, y: cy + Math.sin(t.aim) * 0.4, tgt: e, tx: e.x, ty: e.y, dmg: stat(t, 'dmg') });
      else if (td.id === 'honk') {
        const T = 0.55; let tx = e.x, ty = e.y;
        if (!e.def.fly) { const sp = e.def.spd * (e.slowT > 0 ? 1 - e.slowF : 1); [tx, ty] = along(e.d + sp * T); }
        shots.push({ kind: 'shell', x0: cx, y0: cy, x1: tx, y1: ty, t: 0, T, dmg: stat(t, 'dmg'), r: stat(t, 'splash') });
        pop(cx, cy - 0.55, 'HONK', '#fff', 0.45);
      } else if (td.id === 'sniper') {
        fx.push({ tracer: 1, x: cx + Math.cos(t.aim) * 0.5, y: cy + Math.sin(t.aim) * 0.5, x1: e.x, y1: e.y, life: 0.2, max: 0.2 });
        burst(e.x, e.y, 5, ['#fff', '#c6b8ff'], 1.2); hurt(e, stat(t, 'dmg'), true);
      }
    }
    function updTowers(dt) {
      for (const t of towers) {
        const td = TD[t.ti], cx = t.x + 0.5, cy = t.y + 0.5, R = stat(t, 'rng');
        t.cool -= dt; if (t.kick > 0) t.kick = Math.max(0, t.kick - dt * 5); if (t.pulse > 0) t.pulse -= dt;
        const inR = foes.filter((e) => e.hp > 0 && e.x > -0.1 && (td.air || !e.def.fly) && Math.hypot(e.x - cx, e.y - cy) <= R + e.def.r * 0.5);
        if (!inR.length) continue;
        if (td.id === 'frost') {
          if (t.cool <= 0) {
            t.cool = stat(t, 'rate'); t.pulse = 0.5; ring(cx, cy, R, 'rgba(140,215,255,', 0.5, 1);
            for (const e of inR) { const f = stat(t, 'slow') * (e.def.boss ? 0.5 : 1); if (f >= e.slowF || e.slowT <= 0) e.slowF = f; e.slowT = Math.max(e.slowT, stat(t, 'dur')); hurt(e, stat(t, 'dmg'), false); }
          }
          continue;
        }
        let tg = inR[0];
        for (const e of inR) if (td.id === 'sniper' ? e.hp > tg.hp : e.prog > tg.prog) tg = e;
        const want = Math.atan2(tg.y - cy, tg.x - cx); let da = want - t.aim; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        t.aim += da * Math.min(1, dt * 14);
        if (t.cool <= 0 && Math.abs(da) < 0.6) { t.cool = stat(t, 'rate'); fire(t, tg); }
      }
    }
    function updFoes(dt) {
      for (const e of foes) {
        if (e.hp <= 0) continue;
        if (e.hit > 0) e.hit -= dt;
        let sp = e.def.spd; if (e.slowT > 0) { e.slowT -= dt; sp *= 1 - e.slowF; } else e.slowF = 0;
        e.d += sp * dt;
        if (e.def.fly) { const f = e.d / flyLen; e.x = F0[0] + (F1[0] - F0[0]) * f; e.y = F0[1] + (F1[1] - F0[1]) * f; e.ang = flyAng; e.prog = f; }
        else { const [x, y, a] = along(e.d); e.x = x; e.y = y; let da = a - e.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; e.ang += da * Math.min(1, dt * 10); e.prog = e.d / pathLen; }
        if (e.prog >= 1) { leak(e); if (state !== 'play') return; continue; }
        if (e.def.heal && (e.healT -= dt) <= 0) {
          e.healT = 1.6; ring(e.x, e.y, 1.4, 'rgba(90,210,130,', 0.5, 1);
          for (const o of foes) if (o !== e && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < 1.4 && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + o.max * 0.12); fx.push({ x: o.x, y: o.y - 0.2, vx: 0, vy: -0.8, life: 0.6, max: 0.6, r: 0.08, col: '#5ad282', plus: 1 }); }
        }
      }
    }
    function updShots(dt) {
      shots = shots.filter((s) => {
        if (s.kind === 'seed') {
          if (s.tgt && s.tgt.hp > 0) { s.tx = s.tgt.x; s.ty = s.tgt.y; } else s.tgt = null;
          const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy), v = 10 * dt;
          if (d <= v + 0.12) { if (s.tgt) { hurt(s.tgt, s.dmg, false); burst(s.tx, s.ty, 3, ['#fff', '#9ff0f7'], 0.8, 0.7); } return false; }
          s.x += dx / d * v; s.y += dy / d * v; return true;
        }
        s.t += dt;
        if (s.t >= s.T) {
          ring(s.x1, s.y1, s.r, 'rgba(255,190,80,', 0.4, 1); burst(s.x1, s.y1, 10, ['#ffd66b', '#ff9f43', '#fff'], 1.3);
          shake = Math.max(shake, 0.08);
          for (const e of foes) if (e.hp > 0 && !e.def.fly && Math.hypot(e.x - s.x1, e.y - s.y1) <= s.r + e.def.r) hurt(e, s.dmg, false);
          return false;
        }
        return true;
      });
    }
    function sim(dt) {
      if (state !== 'play') return;
      if (queue.length) { qT += dt; while (queue.length && queue[0][0] <= qT) spawn(queue.shift()[1]); if (!queue.length && wave < WAVES_N) cd = 14; }
      else if (cd !== null) { cd -= dt; if (cd <= 0) { cd = 0; startWave(); } }
      updFoes(dt); if (state !== 'play') return;
      updTowers(dt); updShots(dt);
      foes = foes.filter((e) => e.hp > 0);
      if (wave >= WAVES_N && !queue.length && !foes.length) end(true);
    }
    function tick(dt) {
      gt += dt; if (shake > 0) shake -= dt; if (nestHit > 0) nestHit -= dt; if (annT > 0) annT -= dt; if (flash > 0) flash -= dt;
      if (state === 'over') overT += dt;
      if (rep && held[rep.k]) { rep.t -= dt; if (rep.t <= 0) { rep.t = 0.085; press(rep.k, true); } }
      const n = state === 'play' ? speed : 1;
      for (let i = 0; i < n; i++) {
        let left = dt; while (left > 1e-6) { const h = Math.min(left, 0.025); sim(h); left -= h; }
        fx = fx.filter((p) => { p.life -= dt; if (!p.ring && !p.tracer) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; } return p.life > 0; });
        pops = pops.filter((p) => { p.t -= dt; if (p.sy !== undefined) p.sy -= 22 * dt; else p.y -= 0.6 * dt; return p.t > 0; });
      }
      if (pick && pick.err > 0) pick.err -= dt;
      for (const t of towers) if (t.born > 0) t.born -= dt;
    }

    // ---- menus
    function openPick(x, y) {
      const t = towerAt(x, y);
      if (t) { pick = { kind: 'tower', x, y, t, n: 2, sel: t.lvl < 2 ? 0 : 1, err: 0 }; return true; }
      if (canBuild(x, y)) { let s = TD.findIndex((d) => d.cost <= coins); pick = { kind: 'build', x, y, n: 4, sel: kbd ? Math.max(0, s) : -1, err: 0 }; return true; }
      return false;
    }
    function confirm() {
      if (!pick || pick.sel < 0) return;
      const { x, y } = pick;
      if (pick.kind === 'build') {
        const td = TD[pick.sel];
        if (coins < td.cost) { pick.err = 0.4; pop(x + 0.5, y, 'Need ' + td.cost, '#ff8a7d', 0.8); return; }
        coins -= td.cost; towers.push({ x, y, ti: pick.sel, lvl: 0, spent: td.cost, cool: 0.2, aim: port ? Math.PI / 2 : 0, kick: 0, pulse: 0, born: 0.35 });
        burst(x + 0.5, y + 0.5, 12, ['#fff', td.col, '#d4c3a0'], 1.2); ring(x + 0.5, y + 0.5, 0.7, 'rgba(255,255,255,', 0.35); env.buzz(); pick = null;
      } else {
        const t = pick.t, td = TD[t.ti];
        if (pick.sel === 0) {
          if (t.lvl >= 2) { pick.err = 0.4; return; }
          const c = td.up[t.lvl]; if (coins < c) { pick.err = 0.4; pop(x + 0.5, y, 'Need ' + c, '#ff8a7d', 0.8); return; }
          coins -= c; t.spent += c; t.lvl++; t.born = 0.35; burst(x + 0.5, y + 0.5, 16, [GOLD, '#fff', td.col], 1.4); ring(x + 0.5, y + 0.5, stat(t, 'rng'), 'rgba(255,255,255,', 0.45);
          pop(x + 0.5, y, 'LEVEL ' + (t.lvl + 1), '#fff', 0.9); env.buzz(); if (t.lvl >= 2) pick.sel = 1;
        } else {
          const back = Math.floor(t.spent * 0.7); coins += back; towers = towers.filter((o) => o !== t);
          pop(x + 0.5, y + 0.3, '+' + back, GOLD, 0.9); burst(x + 0.5, y + 0.5, 12, ['#d4c3a0', '#fff', GOLD], 1); env.buzz(); pick = null;
        }
      }
    }
    function pickGeo() {
      const n = pick.n, bw = clamp(ts * 1.1, 44, 58), gap = 6, th = 22 * Math.min(k, 1);
      const pw = Math.max(n * bw + (n + 1) * gap, 190 * Math.min(1, k)), ph = th + bw + gap;
      const [tx, ty] = P(pick.x, pick.y), cx = tx + ts / 2;
      const bx = clamp(cx - pw / 2, 4, W - pw - 4); let by = ty - ph - 6; if (by < 4) by = ty + ts + 6;
      const x0 = bx + (pw - (n * bw + (n - 1) * gap)) / 2;
      return { bx, by, pw, ph, th, bw, rects: Array.from({ length: n }, (_, i) => ({ x: x0 + i * (bw + gap), y: by + th, w: bw, h: bw })) };
    }
    const inR = (r, x, y) => x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
    function start() { g.reset(); state = 'play'; cd = 30; say('Build your defences', env.touch ? 'Tap a grass tile to build' : 'Tap a tile, or D-pad + A', 2.6); env.buzz(); }
    function mapDir(key) {
      const L = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }, Pm = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };
      return (port ? Pm : L)[key];
    }
    function press(key, repeat) {
      if (state === 'ready') { if (!repeat) start(); return; }
      if (state === 'over') { if (key === 'a' && !repeat && overT > 0.6) start(); return; }
      kbd = true; hover = null;
      if (key === 'l') { speed = speed === 1 ? 2 : 1; return; }
      if (key === 'r') { callNext(); return; }
      if (pick) {
        if (key === 'a') { if (pick.sel < 0) pick.sel = 0; else confirm(); }
        else if (key === 'left') pick.sel = pick.sel <= 0 ? pick.n - 1 : pick.sel - 1;
        else if (key === 'right') pick.sel = (pick.sel + 1) % pick.n;
        else if (key === 'down') pick = null;
        return;
      }
      if (key === 'a') {
        if (cur.panel >= 0) { if (cur.panel === 0) { if (!callNext()) cur.err = 0.3; } else speed = speed === 1 ? 2 : 1; return; }
        if (!openPick(cur.x, cur.y)) { cur.err = 0.3; }
        return;
      }
      const [dx, dy] = mapDir(key);
      if (cur.panel >= 0) { if (dx < 0) cur.panel = -1; else if (dy) cur.panel = clamp(cur.panel + dy, 0, 1); return; }
      if (dx > 0 && cur.x === GW - 1) { cur.panel = 0; return; }
      cur.x = clamp(cur.x + dx, 0, GW - 1); cur.y = clamp(cur.y + dy, 0, GH - 1);
    }

    // ---- drawing helpers (art is drawn in a 40-unit tile box)
    function towerArt(c, ti, lvl, a, kick, pulse) {
      const td = TD[ti];
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, 13, 16, 5, 0, 0, 7); c.fill();
      c.fillStyle = '#d5dbe2'; rr(c, -15, -9, 30, 23, 7); c.fill(); c.fillStyle = '#f3f5f8'; rr(c, -15, -12, 30, 22, 7); c.fill();
      for (let i = 0; i <= lvl; i++) { c.fillStyle = lvl === 2 ? GOLD : td.col; c.beginPath(); c.arc((i - lvl / 2) * 6, 10.5, 2, 0, 7); c.fill(); }
      const s = 1 + lvl * 0.07; c.save(); c.translate(0, -2); c.scale(s, s);
      if (td.id === 'pellet') {
        c.fillStyle = td.col; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(-2, -3, 4, 0, 7); c.fill();
        c.rotate(a); c.translate(-kick * 3, 0);
        c.fillStyle = '#1f2024'; rr(c, -1, -2.6, 13, 5.2, 2.6); c.fill(); c.beginPath(); c.arc(12, 0, 4.4, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(10.5, 0, 1.6, 3.2, 0, 0, 7); c.fill();
        c.fillStyle = '#f2b632'; c.beginPath(); c.moveTo(15.5, -1.8); c.lineTo(20, 0); c.lineTo(15.5, 1.8); c.closePath(); c.fill();
        if (lvl) { c.fillStyle = '#fff'; c.beginPath(); c.arc(-4, 0, 1.5 + lvl * 0.4, 0, 7); c.fill(); }
      } else if (td.id === 'honk') {
        c.fillStyle = '#3b4048'; c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 2.4; c.stroke();
        c.rotate(a); c.translate(-kick * 4, 0);
        c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(-2, -4); c.lineTo(15, -9 - lvl); c.lineTo(15, 9 + lvl); c.lineTo(-2, 4); c.closePath(); c.fill();
        c.fillStyle = GOLD; rr(c, 13.5, -10 - lvl, 4, 20 + lvl * 2, 2); c.fill();
        c.fillStyle = '#ffe3a3'; c.fillRect(2, -3, 7, 1.4);
      } else if (td.id === 'frost') {
        const p = pulse > 0 ? pulse * 2 : 0;
        c.fillStyle = `rgba(140,215,255,${0.25 + p * 0.3})`; c.beginPath(); c.arc(0, 0, 13 + p * 3, 0, 7); c.fill();
        c.rotate(gt * 0.8);
        c.fillStyle = td.col; c.beginPath(); for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3; c.lineTo(Math.cos(q) * 10, Math.sin(q) * 10); } c.closePath(); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath();
        for (let i = 0; i < 3; i++) { const q = i * Math.PI / 3; c.moveTo(Math.cos(q) * 7, Math.sin(q) * 7); c.lineTo(-Math.cos(q) * 7, -Math.sin(q) * 7); }
        c.stroke(); c.lineCap = 'butt'; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 2.2 + lvl * 0.6, 0, 7); c.fill();
      } else {
        c.fillStyle = td.col; c.beginPath(); c.arc(0, 0, 8.5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(-2, -3, 3.5, 0, 7); c.fill();
        c.rotate(a); c.translate(-kick * 4, 0);
        c.fillStyle = '#2a2d33'; rr(c, 0, -1.8, 22 + lvl * 2, 3.6, 1.6); c.fill(); rr(c, 2, -6.5, 9, 3.4, 1.5); c.fill();
        c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(11, -4.8, 1.2, 0, 7); c.fill();
      }
      c.restore();
    }
    function foeArt(c, e) {
      const w = e.hit > 0, ty = e.type, d = e.def;
      if (ty === 'drone') {
        c.strokeStyle = '#4a4f59'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-11, -6); c.lineTo(11, -6); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.55)'; for (const sx of [-11, 11]) { c.beginPath(); c.ellipse(sx, -6, 5.5 * Math.abs(Math.sin(gt * 30 + sx)), 1.4, 0, 0, 7); c.fill(); }
        c.fillStyle = w ? '#fff' : '#cdd2d9'; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill();
        c.fillStyle = w ? '#fff' : '#3b4048'; c.beginPath(); c.arc(0, 1, 5.4, 0, 7); c.fill();
        c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(0, 1.2, 2.6, 0, 7); c.fill();
      } else if (ty === 'zip') {
        c.rotate(SA(e.ang));
        c.fillStyle = w ? '#fff' : '#f2b632'; c.beginPath(); c.moveTo(10, 0); c.lineTo(-7, -7); c.lineTo(-3, 0); c.lineTo(-7, 7); c.closePath(); c.fill();
        c.fillStyle = w ? '#fff' : '#b9841a'; c.beginPath(); c.moveTo(10, 0); c.lineTo(-1, -2.5); c.lineTo(-1, 2.5); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,214,107,.5)'; c.fillRect(-14, -1, 6, 2);
      } else if (ty === 'tank') {
        c.rotate(SA(e.ang));
        c.fillStyle = '#2a2d33'; rr(c, -12, -12, 24, 6, 3); c.fill(); rr(c, -12, 6, 24, 6, 3); c.fill();
        c.fillStyle = '#4a4f59'; for (let i = 0; i < 4; i++) { const q = ((gt * 20 + i * 6) % 24) - 12; c.fillRect(q, -12, 1.5, 6); c.fillRect(q, 6, 1.5, 6); }
        c.fillStyle = w ? '#fff' : '#5d6470'; c.beginPath(); for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3 + Math.PI / 6; c.lineTo(Math.cos(q) * 11, Math.sin(q) * 9); } c.closePath(); c.fill();
        c.fillStyle = w ? '#fff' : GOLD; c.fillRect(-9, -1.4, 18, 2.8);
        c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(5, 0, 2.2, 0, 7); c.fill();
      } else if (ty === 'flyer') {
        c.fillStyle = w ? '#fff' : '#7b61c9'; c.beginPath(); c.ellipse(0, 1, 11, 4.6, 0, 0, 7); c.fill();
        c.fillStyle = w ? '#fff' : 'rgba(200,240,255,.92)'; c.beginPath(); c.ellipse(0, -1, 5.4, 5, 0, Math.PI, 0); c.fill();
        for (let i = 0; i < 3; i++) { c.fillStyle = (Math.floor(gt * 8) + i) % 3 ? '#ffd66b' : '#fff'; c.beginPath(); c.arc(-6 + i * 6, 2.4, 1.2, 0, 7); c.fill(); }
      } else if (ty === 'medic') {
        const p = Math.max(0, 1 - e.healT / 0.4);
        c.fillStyle = `rgba(90,210,130,${0.15 + p * 0.3})`; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill();
        c.fillStyle = w ? '#fff' : '#f4f6f8'; rr(c, -9, -9, 18, 18, 6); c.fill(); c.strokeStyle = '#b8c0ca'; c.lineWidth = 1.2; c.stroke();
        c.fillStyle = '#3cbf6e'; c.fillRect(-1.8, -6, 3.6, 12); c.fillRect(-6, -1.8, 12, 3.6);
      } else if (ty === 'boss') {
        c.rotate(SA(e.ang));
        c.fillStyle = '#1f2024'; rr(c, -17, -19, 34, 8, 4); c.fill(); rr(c, -17, 11, 34, 8, 4); c.fill();
        c.fillStyle = w ? '#fff' : '#3b4048'; c.beginPath(); c.moveTo(18, 0); c.lineTo(10, -14); c.lineTo(-14, -14); c.lineTo(-18, 0); c.lineTo(-14, 14); c.lineTo(10, 14); c.closePath(); c.fill();
        c.fillStyle = w ? '#fff' : GOLD; c.fillRect(-12, -15, 4, 30); c.fillRect(2, -15, 4, 30);
        const pu = 0.6 + Math.sin(gt * 6) * 0.4; c.fillStyle = `rgba(255,93,115,${0.35 + pu * 0.3})`; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill();
        c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-1.4, -1.4, 1.6, 0, 7); c.fill();
      }
      if (e.slowT > 0) { c.fillStyle = 'rgba(150,220,255,.35)'; c.beginPath(); c.arc(0, 0, d.r * 40 + 2, 0, 7); c.fill(); }
    }
    function gooseArt(c, hit) { // a goose sitting on its nest, 40-unit box
      c.fillStyle = '#9b7b4f'; c.beginPath(); c.ellipse(0, 9, 17, 7, 0, 0, 7); c.fill();
      c.strokeStyle = '#7a5d38'; c.lineWidth = 1.4; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-16 + i * 6, 6 + (i % 2) * 3); c.lineTo(-10 + i * 6, 12 - (i % 2) * 3); c.stroke(); }
      const bob = hit > 0 ? Math.sin(hit * 40) * 2 : Math.sin(gt * 2) * 0.6;
      c.save(); c.translate(0, bob);
      c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(-2, 1, 12, 7.5, 0, 0, 7); c.fill();
      c.fillStyle = '#6e604f'; c.beginPath(); c.ellipse(-4, 0, 8, 4.4, -0.2, 0, 7); c.fill();
      c.fillStyle = '#f2efe8'; c.beginPath(); c.ellipse(4, 4, 5, 3.6, 0, 0, 7); c.fill();
      c.strokeStyle = '#1f2024'; c.lineWidth = 3.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(7, 0); c.quadraticCurveTo(10, -7, 8, -13); c.stroke(); c.lineCap = 'butt';
      c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(9.5, -14, 4.2, 3.4, 0.15, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(8, -12.6, 2, 1.3, 0.3, 0, 7); c.fill();
      c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(13, -15.4); c.lineTo(hit > 0 ? 19 : 17.5, -14.4); c.lineTo(13, -12.8); c.closePath(); c.fill();
      c.restore();
    }
    const heart = (c, x, y, z, col) => { c.fillStyle = col || RED; c.beginPath(); c.moveTo(x, y + z * 0.35); c.bezierCurveTo(x - z * 0.6, y - z * 0.05, x - z * 0.35, y - z * 0.55, x, y - z * 0.2); c.bezierCurveTo(x + z * 0.35, y - z * 0.55, x + z * 0.6, y - z * 0.05, x, y + z * 0.35); c.fill(); };
    const coin = (c, x, y, z) => { c.fillStyle = '#d99a1e'; c.beginPath(); c.arc(x, y + z * 0.06, z * 0.42, 0, 7); c.fill(); c.fillStyle = GOLD; c.beginPath(); c.arc(x, y, z * 0.42, 0, 7); c.fill(); c.fillStyle = '#ffe3a3'; c.beginPath(); c.arc(x, y, z * 0.22, 0, 7); c.fill(); };
    function txt(c, s, x, y, px, w, col, al) { font(c, w, px); c.fillStyle = col; c.textAlign = al || 'left'; c.fillText(s, x, y); }

    function drawMap(c) {
      c.save(); c.beginPath(); c.rect(ox, oy, mw, mh); c.clip();
      for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) { const [sx, sy] = P(x, y); c.fillStyle = (x + y) % 2 ? '#a9dbb7' : '#a2d5b0'; c.fillRect(sx, sy, ts + 0.5, ts + 0.5); }
      c.strokeStyle = 'rgba(60,130,90,.35)'; c.lineWidth = Math.max(1, ts * 0.03); c.beginPath();
      for (const [x, y, v] of TUFT) { const [sx, sy] = P(x, y), q = ts * 0.07; c.moveTo(sx - q, sy); c.lineTo(sx - q * 0.4, sy - q * (1 + v)); c.moveTo(sx + q * 0.2, sy); c.lineTo(sx + q * 0.6, sy - q * (1.2 + v)); }
      c.stroke();
      // the path
      c.lineJoin = 'round'; c.lineCap = 'round';
      const trace = () => { c.beginPath(); PTS.forEach(([x, y], i) => { const [sx, sy] = P(x, y); if (i) c.lineTo(sx, sy); else c.moveTo(sx, sy); }); };
      trace(); c.strokeStyle = '#cdb88e'; c.lineWidth = ts * 0.9; c.stroke();
      trace(); c.strokeStyle = '#ecdcb8'; c.lineWidth = ts * 0.74; c.stroke();
      c.setLineDash([ts * 0.12, ts * 0.3]); c.lineDashOffset = -gt * ts * 0.4; trace(); c.strokeStyle = 'rgba(180,150,100,.35)'; c.lineWidth = ts * 0.06; c.stroke(); c.setLineDash([]); c.lineDashOffset = 0;
      c.lineJoin = 'miter'; c.lineCap = 'butt';
      // decor
      for (const key in DECOR) {
        const [x, y] = key.split(',').map(Number), [sx, sy] = P(x, y), kind = DECOR[key], cx = sx + ts / 2, cy = sy + ts / 2;
        if (kind === 'w') { c.fillStyle = '#6cc3d9'; rr(c, sx + 1, sy + 1, ts - 2, ts - 2, ts * 0.25); c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(1, ts * 0.04); c.beginPath(); const q = (gt * 0.5 + x * 0.3) % 1; c.ellipse(cx, cy, ts * 0.12 + q * ts * 0.25, ts * 0.06 + q * ts * 0.1, 0, 0, 7); c.globalAlpha = 1 - q; c.stroke(); c.globalAlpha = 1; }
        else if (kind === 't') { c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(cx + ts * 0.05, cy + ts * 0.3, ts * 0.32, ts * 0.1, 0, 0, 7); c.fill(); c.fillStyle = '#7a5d38'; c.fillRect(cx - ts * 0.05, cy, ts * 0.1, ts * 0.3); c.fillStyle = '#3f9a63'; c.beginPath(); c.arc(cx, cy - ts * 0.05, ts * 0.3, 0, 7); c.fill(); c.fillStyle = '#58b47a'; c.beginPath(); c.arc(cx - ts * 0.08, cy - ts * 0.13, ts * 0.17, 0, 7); c.fill(); }
        else { c.fillStyle = '#9aa3ad'; c.beginPath(); c.ellipse(cx, cy + ts * 0.08, ts * 0.28, ts * 0.2, 0, 0, 7); c.fill(); c.fillStyle = '#c3cad2'; c.beginPath(); c.ellipse(cx - ts * 0.05, cy + ts * 0.02, ts * 0.17, ts * 0.11, 0, 0, 7); c.fill(); }
      }
      // spawn arrows
      const live = queue.length > 0, [ex, ey] = P(0.25, 1.5);
      for (let i = 0; i < 3; i++) { const a = live ? 0.4 + 0.6 * ((Math.sin(gt * 6 - i) + 1) / 2) : 0.35; c.globalAlpha = a; c.fillStyle = live ? RED : '#7a808a'; c.save(); c.translate(...(port ? [ex, ey + (i - 1) * ts * 0.22] : [ex + (i - 1) * ts * 0.22, ey])); c.rotate(SA(0)); c.beginPath(); c.moveTo(ts * 0.1, 0); c.lineTo(-ts * 0.06, -ts * 0.12); c.lineTo(-ts * 0.06, ts * 0.12); c.closePath(); c.fill(); c.restore(); }
      c.globalAlpha = 1;
      c.restore();
      // nest
      const [nx, ny] = P(NX + 0.5, NY + 0.5); c.save(); c.translate(nx, ny); c.scale(ts / 40, ts / 40);
      if (nestHit > 0) { c.fillStyle = `rgba(224,88,77,${nestHit * 0.6})`; c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill(); }
      gooseArt(c, nestHit); c.restore();
    }
    function rangeCircle(c, x, y, r, col, dash) {
      const [sx, sy] = P(x, y); c.beginPath(); c.arc(sx, sy, r * ts, 0, 7);
      c.fillStyle = col + '.14)'; c.fill(); c.lineWidth = 2; c.strokeStyle = col + '.75)'; if (dash) c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]);
    }
    function drawWorld(c) {
      drawMap(c);
      const u = ts / 40;
      // range previews under everything else
      if (pick) {
        if (pick.kind === 'build' && pick.sel >= 0) rangeCircle(c, pick.x + 0.5, pick.y + 0.5, TD[pick.sel].rng[0], 'rgba(255,255,255,');
        if (pick.kind === 'tower') { const t = pick.t; rangeCircle(c, t.x + 0.5, t.y + 0.5, stat(t, 'rng'), 'rgba(255,255,255,'); if (pick.sel === 0 && t.lvl < 2) rangeCircle(c, t.x + 0.5, t.y + 0.5, stat(t, 'rng', t.lvl + 1), 'rgba(242,182,50,', true); }
      } else if (state === 'play') {
        const h = hover || (kbd && cur.panel < 0 ? cur : null), t = h && towerAt(h.x, h.y);
        if (t) rangeCircle(c, t.x + 0.5, t.y + 0.5, stat(t, 'rng'), 'rgba(255,255,255,');
      }
      for (const t of towers) {
        const [sx, sy] = P(t.x + 0.5, t.y + 0.5);
        const b = t.born > 0 ? 1 + Math.sin(t.born / 0.35 * Math.PI) * 0.18 : 1;
        c.save(); c.translate(sx, sy); c.scale(u * b, u * b); towerArt(c, t.ti, t.lvl, SA(t.aim), t.kick, t.pulse); c.restore();
      }
      const drawE = (e) => {
        const [sx, sy] = P(e.x, e.y), fl = e.def.fly, lift = fl ? ts * (0.28 + Math.sin(gt * 3 + e.wob) * 0.05) : Math.abs(Math.sin(gt * 9 + e.wob)) * ts * 0.03;
        const sc = e.def.boss ? 1.5 : 1.15;
        c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(sx, sy + ts * 0.18, ts * e.def.r * 0.9, ts * e.def.r * 0.32, 0, 0, 7); c.fill();
        c.save(); c.translate(sx, sy - lift); c.scale(u * sc, u * sc); foeArt(c, e); c.restore();
        if (e.hp < e.max) {
          const bw = ts * Math.max(0.6, e.def.r * 2.2), bh = Math.max(3, ts * 0.08), by = sy - lift - ts * (e.def.r * sc + 0.2);
          c.fillStyle = 'rgba(30,35,45,.6)'; rr(c, sx - bw / 2 - 1, by - 1, bw + 2, bh + 2, 2); c.fill();
          const f = e.hp / e.max; c.fillStyle = f > 0.5 ? '#4cb782' : f > 0.25 ? GOLD : RED; rr(c, sx - bw / 2, by, bw * f, bh, 1.5); c.fill();
        }
      };
      for (const e of foes) if (!e.def.fly) drawE(e);
      // shells (lobbed), seeds
      for (const s of shots) {
        if (s.kind === 'seed') { const [sx, sy] = P(s.x, s.y); c.fillStyle = '#e8fbff'; c.beginPath(); c.arc(sx, sy, Math.max(2, ts * 0.06), 0, 7); c.fill(); c.fillStyle = '#1aa3b3'; c.beginPath(); c.arc(sx, sy, Math.max(1, ts * 0.03), 0, 7); c.fill(); }
        else {
          const f = s.t / s.T, [sx, sy] = P(s.x0 + (s.x1 - s.x0) * f, s.y0 + (s.y1 - s.y0) * f), h = Math.sin(f * Math.PI) * ts * 0.8;
          c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(sx, sy, ts * 0.1, ts * 0.04, 0, 0, 7); c.fill();
          c.fillStyle = '#2a2d33'; c.beginPath(); c.arc(sx, sy - h, Math.max(2.5, ts * 0.1), 0, 7); c.fill(); c.fillStyle = GOLD; c.beginPath(); c.arc(sx - ts * 0.03, sy - h - ts * 0.03, Math.max(1, ts * 0.035), 0, 7); c.fill();
        }
      }
      for (const e of foes) if (e.def.fly) drawE(e);
      // effects
      for (const p of fx) {
        const a = p.life / p.max;
        if (p.ring) {
          const [sx, sy] = P(p.x, p.y), r = p.r * ts * (p.fill ? 0.4 + 0.6 * (1 - a) : 1.3 - 0.5 * a);
          if (p.fill) { c.fillStyle = p.col + (a * 0.22) + ')'; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill(); }
          c.strokeStyle = p.col + (a * 0.85) + ')'; c.lineWidth = Math.max(1.5, ts * 0.05); c.beginPath(); c.arc(sx, sy, r, 0, 7); c.stroke();
        } else if (p.tracer) {
          const [x0, y0] = P(p.x, p.y), [x1, y1] = P(p.x1, p.y1);
          c.strokeStyle = `rgba(198,184,255,${a})`; c.lineWidth = Math.max(2, ts * 0.1) * a; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
          c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = Math.max(1, ts * 0.03); c.stroke();
        } else {
          const [sx, sy] = P(p.x, p.y); c.globalAlpha = Math.min(1, a * 1.5); c.fillStyle = p.col;
          if (p.plus) { const q = ts * 0.08; c.fillRect(sx - q, sy - q * 0.3, q * 2, q * 0.6); c.fillRect(sx - q * 0.3, sy - q, q * 0.6, q * 2); }
          else { c.beginPath(); c.arc(sx, sy, p.r * ts * (0.4 + a * 0.6), 0, 7); c.fill(); }
          c.globalAlpha = 1;
        }
      }
      // cursor
      const h = state === 'play' ? (pick ? pick : hover || (kbd && cur.panel < 0 ? cur : null)) : null;
      if (h) {
        const [sx, sy] = P(h.x, h.y), ok = pick || canBuild(h.x, h.y) || towerAt(h.x, h.y), e = cur.err > 0 && !pick ? Math.sin(cur.err * 60) * 3 : 0;
        c.strokeStyle = ok ? '#fff' : RED; c.lineWidth = 2.5; c.globalAlpha = 0.7 + Math.sin(gt * 6) * 0.25;
        rr(c, sx + 2 + e, sy + 2, ts - 4, ts - 4, ts * 0.18); c.stroke(); c.globalAlpha = 1;
        if (!pick && canBuild(h.x, h.y)) { c.fillStyle = 'rgba(255,255,255,.8)'; const q = ts * 0.14; c.fillRect(sx + ts / 2 - q, sy + ts / 2 - 1.5, q * 2, 3); c.fillRect(sx + ts / 2 - 1.5, sy + ts / 2 - q, 3, q * 2); }
      }
      // pops
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const p of pops) {
        let sx, sy; if (p.sy !== undefined) { sx = p.sx; sy = p.sy; } else [sx, sy] = P(p.x, p.y);
        c.globalAlpha = Math.min(1, p.t * 3); font(c, 800, p.sy !== undefined ? 17 * k : Math.max(11, ts * (p.big ? 0.42 : 0.28)));
        c.lineWidth = 3; c.strokeStyle = 'rgba(30,35,45,.55)'; c.strokeText(p.txt, sx, sy); c.fillStyle = p.col; c.fillText(p.txt, sx, sy);
      }
      c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    }
    function nextTypes() { if (wave >= WAVES_N) return []; return [...new Set(WAVES[wave].map((g) => g[0]))]; }
    function miniFoe(c, type, x, y, z) { c.save(); c.translate(x, y); const s = z / 30 / (type === 'boss' ? 1.3 : 1); c.scale(s, s); foeArt(c, { type, def: ED[type], hit: 0, slowT: 0, healT: 1, ang: 0 }); c.restore(); }
    function button(c, b, i) {
      const focus = kbd && cur.panel === i && state === 'play' && !pick;
      let label, sub = '', on = true;
      if (i === 0) {
        if (cd !== null && wave < WAVES_N) { label = wave === 0 ? 'Start wave 1' : 'Next wave'; sub = '+' + Math.floor(cd * 1.2); }
        else { label = wave >= WAVES_N ? 'Final wave' : 'Wave ' + wave; on = false; }
      } else label = speed + 'x';
      const pulse = i === 0 && on ? (Math.sin(gt * 5) + 1) / 2 : 0;
      c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, b.x, b.y + 3, b.w, b.h, 10 * k); c.fill();
      c.fillStyle = i === 0 ? (on ? ACC : '#c8ced6') : (speed === 2 ? DEEP : '#fff'); rr(c, b.x, b.y, b.w, b.h, 10 * k); c.fill();
      if (i === 0 && on && cd !== null) { const f = clamp(cd / (wave === 0 ? 30 : 14), 0, 1); c.fillStyle = 'rgba(255,255,255,.22)'; rr(c, b.x, b.y, b.w * f, b.h, 10 * k); c.fill(); }
      if (pulse && wave === 0) { c.strokeStyle = `rgba(26,163,179,${pulse * 0.6})`; c.lineWidth = 3; rr(c, b.x - 2 - pulse * 2, b.y - 2 - pulse * 2, b.w + 4 + pulse * 4, b.h + 4 + pulse * 4, 12 * k); c.stroke(); }
      if (focus) { c.strokeStyle = INK; c.lineWidth = 2.5; rr(c, b.x - 2, b.y - 2, b.w + 4, b.h + 4, 12 * k); c.stroke(); }
      const col = i === 0 ? '#fff' : (speed === 2 ? '#fff' : INK);
      c.textBaseline = 'middle';
      if (i === 1) { txt(c, label, b.x + b.w / 2, b.y + b.h / 2, 15 * k, 800, col, 'center'); const ax = b.x + b.w / 2 + 16 * k; c.fillStyle = col; for (let j = 0; j < speed; j++) { c.beginPath(); c.moveTo(ax + j * 6 * k, b.y + b.h / 2 - 5 * k); c.lineTo(ax + j * 6 * k + 6 * k, b.y + b.h / 2); c.lineTo(ax + j * 6 * k, b.y + b.h / 2 + 5 * k); c.fill(); } }
      else {
        const two = b.h > 50 * k;
        txt(c, label + (on ? ' ▸' : ''), b.x + b.w / 2, b.y + (two ? b.h * 0.3 : b.h / 2), 14 * k, 800, col, 'center');
        if (on) {
          const tys = nextTypes(); const y2 = two ? b.y + b.h * 0.7 : b.y + b.h / 2;
          if (two) { const z = 16 * k, x0 = b.x + 12 * k; tys.forEach((t, j) => miniFoe(c, t, x0 + j * z * 1.05, y2, z)); }
          if (sub !== '+0') { const sx = b.x + b.w - 12 * k; txt(c, sub, sx, y2, 12 * k, 800, '#fff6d8', 'right'); if (!two) coin(c, sx - c.measureText(sub).width - 8 * k, y2, 12 * k); else coin(c, sx - c.measureText(sub).width - 8 * k, y2, 12 * k); }
        }
      }
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    }
    function drawPanel(c) {
      if (!port) {
        const p = PANEL; c.fillStyle = '#fff'; rr(c, p.x, p.y, p.w, BTN[0].y - p.y - 8 * k, 12 * k); c.fill();
        const lx = p.x + 12 * k; let y = p.y + 22 * k;
        const row = (draw, label, val) => { draw(lx + 8 * k, y + 4 * k); txt(c, label, lx + 22 * k, y, 10 * k, 700, MUTE); txt(c, val, lx + 22 * k, y + 17 * k, 18 * k, 800, INK); y += 44 * k; };
        row((x, yy) => heart(c, x, yy, 16 * k), 'LIVES', String(lives));
        row((x, yy) => coin(c, x, yy, 16 * k), 'COINS', String(coins));
        row((x, yy) => { c.fillStyle = ACC; c.fillRect(x - 6 * k, yy - 6 * k, 3 * k, 12 * k); c.fillRect(x - 1 * k, yy - 3 * k, 3 * k, 9 * k); c.fillRect(x + 4 * k, yy, 3 * k, 6 * k); }, 'WAVE', Math.max(1, wave) + ' / ' + WAVES_N);
        if (p.y + 22 * k + 44 * k * 3 + 30 * k < BTN[0].y - 8 * k) row((x, yy) => { c.fillStyle = GOLD; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 * k : 7 * k, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + Math.cos(a) * r, yy + Math.sin(a) * r); } c.fill(); }, 'SCORE', score.toLocaleString());
      } else {
        const p = PANEL, cw = p.w / 3, cy = p.y + p.h / 2;
        c.fillStyle = '#fff'; rr(c, p.x, p.y, p.w, p.h, 10 * k); c.fill(); c.textBaseline = 'middle';
        heart(c, p.x + 16 * k, cy, 16 * k); txt(c, String(lives), p.x + 28 * k, cy, 16 * k, 800, INK);
        coin(c, p.x + cw + 12 * k, cy, 16 * k); txt(c, String(coins), p.x + cw + 24 * k, cy, 16 * k, 800, INK);
        txt(c, 'Wave ' + Math.max(1, wave) + '/' + WAVES_N, p.x + p.w - 10 * k, cy, 14 * k, 800, INK, 'right');
        c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      }
      button(c, BTN[0], 0); button(c, BTN[1], 1);
    }
    function drawPick(c) {
      const G = pickGeo(), err = pick.err > 0 ? Math.sin(pick.err * 70) * 4 : 0;
      c.save(); c.translate(err, 0);
      c.fillStyle = 'rgba(0,0,0,.18)'; rr(c, G.bx, G.by + 3, G.pw, G.ph, 10); c.fill();
      c.fillStyle = '#fff'; rr(c, G.bx, G.by, G.pw, G.ph, 10); c.fill();
      // little pointer towards the tile
      const [tx, ty] = P(pick.x, pick.y), tcx = clamp(tx + ts / 2, G.bx + 12, G.bx + G.pw - 12), below = G.by > ty;
      c.beginPath(); if (below) { c.moveTo(tcx - 7, G.by); c.lineTo(tcx, G.by - 7); c.lineTo(tcx + 7, G.by); } else { c.moveTo(tcx - 7, G.by + G.ph); c.lineTo(tcx, G.by + G.ph + 7); c.lineTo(tcx + 7, G.by + G.ph); } c.fill();
      let title;
      if (pick.kind === 'build') title = pick.sel >= 0 ? TD[pick.sel].name + ' · ' + TD[pick.sel].role : 'Build a tower';
      else { const t = pick.t; title = pick.sel === 0 ? (t.lvl < 2 ? 'Upgrade to level ' + (t.lvl + 2) : TD[t.ti].name + ' · max level') : 'Sell for ' + Math.floor(t.spent * 0.7); }
      c.textBaseline = 'middle'; font(c, 700, 11.5 * Math.min(1, k)); c.fillStyle = INK; c.textAlign = 'center';
      let tt = title; while (c.measureText(tt).width > G.pw - 12 && tt.length > 4) tt = tt.slice(0, -2); if (tt !== title) tt += '…';
      c.fillText(tt, G.bx + G.pw / 2, G.by + G.th / 2 + 2);
      G.rects.forEach((r, i) => {
        const sel = pick.sel === i;
        let cost, afford = true;
        if (pick.kind === 'build') { cost = TD[i].cost; afford = coins >= cost; }
        else if (i === 0) { cost = pick.t.lvl < 2 ? TD[pick.t.ti].up[pick.t.lvl] : null; afford = cost !== null && coins >= cost; }
        c.fillStyle = sel ? '#dff4f6' : BG; rr(c, r.x, r.y, r.w, r.h, 8); c.fill();
        if (sel) { c.strokeStyle = ACC; c.lineWidth = 2.5; rr(c, r.x, r.y, r.w, r.h, 8); c.stroke(); }
        c.globalAlpha = afford ? 1 : 0.45;
        const u = r.w / 48, cx = r.x + r.w / 2, cy = r.y + r.h * 0.42;
        if (pick.kind === 'build') { c.save(); c.translate(cx, cy); c.scale(u * 0.82, u * 0.82); towerArt(c, i, 0, -0.6, 0, 0); c.restore(); }
        else if (i === 0) {
          c.save(); c.translate(cx, cy); c.scale(u * 0.7, u * 0.7); towerArt(c, pick.t.ti, Math.min(2, pick.t.lvl + 1), -0.6, 0, 0); c.restore();
          if (cost !== null) { c.fillStyle = '#4cb782'; c.beginPath(); c.moveTo(r.x + r.w - 10, r.y + 4); c.lineTo(r.x + r.w - 4, r.y + 11); c.lineTo(r.x + r.w - 16, r.y + 11); c.fill(); }
        } else { coin(c, cx, cy, r.w * 0.42); }
        c.globalAlpha = 1;
        const lab = pick.kind === 'tower' && i === 1 ? '+' + Math.floor(pick.t.spent * 0.7) : cost === null ? 'MAX' : String(cost);
        font(c, 800, Math.max(10, r.w * 0.22)); c.fillStyle = afford || i === 1 ? INK : RED; c.fillText(lab, cx, r.y + r.h * 0.86);
      });
      c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.restore();
    }
    function drawAnn(c) {
      if (annT <= 0 || state !== 'play') return;
      const a = Math.min(1, annT * 2, (2.6 - annT) * 6), cx = ox + mw / 2, cy = oy + mh * 0.42;
      c.globalAlpha = clamp(a, 0, 1); c.textAlign = 'center'; c.textBaseline = 'middle';
      font(c, 800, 30 * k); c.lineWidth = 5; c.strokeStyle = 'rgba(14,60,70,.45)'; c.strokeText(ann, cx, cy); c.fillStyle = ann.includes('BOSS') || ann.includes('FINAL') ? '#ffd9d4' : '#fff'; c.fillText(ann, cx, cy);
      if (annSub) { font(c, 700, 14 * k); c.lineWidth = 4; c.strokeText(annSub, cx, cy + 28 * k); c.fillStyle = '#fff'; c.fillText(annSub, cx, cy + 28 * k); }
      c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    }

    const g = {
      resize(w, h) { W = w; H = h; layout(); },
      reset() {
        state = 'ready'; towers = []; foes = []; shots = []; fx = []; pops = []; coins = 160; lives = 20; score = 0; wave = 0; queue = []; qT = 0; cd = null; speed = 1;
        shake = 0; nestHit = 0; annT = 0; ann = ''; annSub = ''; overT = 0; won = false; newBest = false; cur = { x: 6, y: 4, panel: -1, err: 0 }; pick = null; kbd = !env.touch; hover = null; bossRef = null; flash = 0;
        for (const q in held) held[q] = false; rep = null;
      },
      step(dt) { dt = Math.min(Math.max(dt, 0), 0.05); if (cur.err > 0) cur.err -= dt; tick(dt); },
      draw(c) {
        c.fillStyle = '#d7ece6'; c.fillRect(0, 0, W, H);
        c.save();
        if (shake > 0) c.translate(rnd(-1, 1) * shake * 12, rnd(-1, 1) * shake * 12);
        c.fillStyle = 'rgba(0,0,0,.1)'; rr(c, ox - 3, oy - 1, mw + 6, mh + 6, 8); c.fill();
        drawWorld(c);
        c.restore();
        if (flash > 0) { c.fillStyle = `rgba(224,88,77,${flash * 0.3})`; c.fillRect(ox, oy, mw, mh); }
        if (bossRef && bossRef.hp > 0) {
          const bw = mw * 0.6, bx = ox + (mw - bw) / 2, by = oy + 8 * k, bh = 8 * k;
          c.fillStyle = 'rgba(30,35,45,.55)'; rr(c, bx - 2, by - 2, bw + 4, bh + 4, 6 * k); c.fill(); c.fillStyle = '#ff5d73'; rr(c, bx, by, Math.max(bh, bw * bossRef.hp / bossRef.max), bh, 4 * k); c.fill();
        }
        drawPanel(c);
        if (speed === 2 && state === 'play') { font(c, 800, 12 * k); c.fillStyle = 'rgba(14,127,141,.8)'; c.textAlign = 'right'; c.fillText('2x', ox + mw - 6, oy + mh - 6); c.textAlign = 'left'; }
        drawAnn(c);
        if (pick && state === 'play') drawPick(c);
        if (state === 'ready') banner(c, W, H, 'Goose Defense', 'Robots are marching on the nest. Build towers along the path.\n' + (env.touch ? 'Tap grass to build · tap a tower to upgrade' : 'Click a tile, or D-pad + A to build') + '\n' + startWord(env), env, true);
        if (state === 'over') banner(c, W, H, won ? 'Nest saved!' : 'Nest overrun', (won ? 'All ' + WAVES_N + ' waves held · ' : 'Reached wave ' + wave + ' · ') + 'score ' + score.toLocaleString() + (newBest ? ' · new best!' : '') + '\n' + againWord(env), env, true);
      },
      key(key) {
        if (!['up', 'down', 'left', 'right', 'a', 'l', 'r'].includes(key)) return false;
        if (held[key]) return true;
        held[key] = true; press(key, false);
        rep = ['up', 'down', 'left', 'right'].includes(key) ? { k: key, t: 0.3 } : null;
        return true;
      },
      release(key) {
        if (key === 'all') { for (const q in held) held[q] = false; rep = null; return; }
        if (key === 'ptr') return;
        held[key] = false; if (rep && rep.k === key) rep = null;
      },
      pointer(type, x, y) {
        if (type === 'move') {
          if (env.touch || state !== 'play' || pick) return;
          const [mx, my] = toMap(x, y), cx = Math.floor(mx), cy = Math.floor(my);
          hover = mx >= 0 && my >= 0 && cx < GW && cy < GH ? { x: cx, y: cy } : null; if (hover) kbd = false;
          return;
        }
        if (type !== 'down') return;
        if (state === 'ready') { start(); return; }
        if (state === 'over') { if (overT > 0.6) start(); return; }
        kbd = false;
        if (inR(BTN[0], x, y)) { callNext(); pick = null; return; }
        if (inR(BTN[1], x, y)) { speed = speed === 1 ? 2 : 1; pick = null; return; }
        if (pick) {
          const G = pickGeo();
          const i = G.rects.findIndex((r) => inR(r, x, y));
          if (i >= 0) { if (pick.sel === i) confirm(); else pick.sel = i; return; }
          if (inR({ x: G.bx, y: G.by, w: G.pw, h: G.ph }, x, y)) return;
        }
        const [mx, my] = toMap(x, y), cx = Math.floor(mx), cy = Math.floor(my);
        const same = pick && pick.x === cx && pick.y === cy; pick = null;
        if (mx < 0 || my < 0 || cx >= GW || cy >= GH || same) return;
        cur.x = cx; cur.y = cy; cur.panel = -1;
        if (!openPick(cx, cy)) cur.err = 0.3;
      },
      hud: () => ['Wave ' + Math.max(1, wave) + '/' + WAVES_N + ' · ' + (score || 0).toLocaleString(), 'Best ' + Math.max(best, score || 0).toLocaleString()],
    };
    return g;
  }
  function ICON_defense(c, z) {
    const g = c.createLinearGradient(0, 0, 0, z); g.addColorStop(0, '#b4e3c2'); g.addColorStop(1, '#8fcca3'); c.fillStyle = g; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.14); c.fill();
    c.save(); rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.14); c.clip();
    c.lineJoin = 'round'; c.lineCap = 'round';
    const path = () => { c.beginPath(); c.moveTo(z * 0.02, z * 0.3); c.lineTo(z * 0.32, z * 0.3); c.lineTo(z * 0.32, z * 0.74); c.lineTo(z * 0.68, z * 0.74); c.lineTo(z * 0.68, z * 0.42); c.lineTo(z * 0.98, z * 0.42); };
    path(); c.strokeStyle = '#cdb88e'; c.lineWidth = z * 0.17; c.stroke(); path(); c.strokeStyle = '#ecdcb8'; c.lineWidth = z * 0.13; c.stroke();
    c.lineJoin = 'miter'; c.lineCap = 'butt'; c.restore();
    // a honk cannon
    c.save(); c.translate(z * 0.53, z * 0.52); c.scale(z / 110, z / 110);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, 12, 16, 5, 0, 0, 7); c.fill();
    c.fillStyle = '#d5dbe2'; rr(c, -15, -9, 30, 23, 7); c.fill(); c.fillStyle = '#f3f5f8'; rr(c, -15, -12, 30, 22, 7); c.fill();
    c.translate(0, -2); c.fillStyle = '#3b4048'; c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 2.6; c.stroke();
    c.rotate(-2.6); c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(-2, -4.5); c.lineTo(17, -10); c.lineTo(17, 10); c.lineTo(-2, 4.5); c.closePath(); c.fill();
    c.fillStyle = GOLD; rr(c, 15.5, -11, 4.5, 22, 2.2); c.fill(); c.restore();
    // a drone on the path
    const dx = z * 0.23, dy = z * 0.3;
    c.strokeStyle = '#4a4f59'; c.lineWidth = z * 0.02; c.beginPath(); c.moveTo(dx - z * 0.1, dy - z * 0.05); c.lineTo(dx + z * 0.1, dy - z * 0.05); c.stroke();
    c.fillStyle = '#cdd2d9'; c.beginPath(); c.arc(dx, dy, z * 0.075, 0, 7); c.fill(); c.fillStyle = '#3b4048'; c.beginPath(); c.arc(dx, dy + z * 0.008, z * 0.045, 0, 7); c.fill(); c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(dx, dy + z * 0.01, z * 0.022, 0, 7); c.fill();
    // the goose on its nest
    c.save(); c.translate(z * 0.76, z * 0.66); const u = z / 95; c.scale(u, u);
    c.fillStyle = '#9b7b4f'; c.beginPath(); c.ellipse(0, 9, 17, 7, 0, 0, 7); c.fill();
    c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(-2, 1, 12, 7.5, 0, 0, 7); c.fill(); c.fillStyle = '#f2efe8'; c.beginPath(); c.ellipse(4, 4, 5, 3.6, 0, 0, 7); c.fill();
    c.strokeStyle = '#1f2024'; c.lineWidth = 3.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(7, 0); c.quadraticCurveTo(10, -7, 8, -13); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(9.5, -14, 4.4, 3.6, 0.15, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(8, -12.6, 2, 1.3, 0.3, 0, 7); c.fill();
    c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(13, -15.4); c.lineTo(18, -14.4); c.lineTo(13, -12.8); c.closePath(); c.fill();
    c.restore();
  }

  function quest(env) {
    /* ---------------- Goose Quest ----------------
       A tile platformer with six hand-made levels. Written for this site; the fixed-timestep loop and the axis-by-axis tile
       collision follow the approach described in javascript-tiny-platformer by Jake Gordon
       (https://github.com/jakesgordon/javascript-tiny-platformer, MIT licence, Copyright (c) 2013, 2014, 2015, 2016 Jake Gordon
       and contributors). No code, art or level data was copied from it; the levels below are original.
       Map legend: # ground  B stone block  - one-way plank  ^ spikes  v ceiling spikes  o coin  E golden egg  S spring
       C checkpoint  D exit door  P start  g walking cone  f drone  H / V platform moving sideways / up and down
       x fake wall (walk through it)  ! invisible stop for movers and enemies  i sign */
    const T = 16, TICK = 1 / 120, PW = 5, PH = 20, LIVES = 5;
    const ACC = 1150, AIRACC = 820, FRIC = 1500, AIRFRIC = 280, MAXV = 118, GR = 1100, JV = 345, SPRV = 560, MAXFALL = 430, COY = 0.1, BUF = 0.13, MSPD = 46;
    const LV = [
      { name: 'Ring Road', par: 110, th: 0, signs: [['Arrows run · A or Up jumps, hold it for higher', 'Hold a side to run · tap the middle to jump'], ['Land on a cone to squash it', 'Swipe up while running to jump'], ['Flags are checkpoints · springs launch you', 'Flags are checkpoints · springs launch you']], map: [
        '',
        '',
        '                                                     ooo',
        '                                                    ----',
        '',
        '                                                ooo                                                         ##########',
        '                                               -----                                                    o   ##########',
        '                                  ooo                                                                   o   ##########',
        '                                 BBBBB     ooo        ooo               ooo                             o   ##########       ooo',
        '        o o o               o             -----      -----            ###############                       ##########      -----',
        '                           ###                                       oxx  o E o  ####                       ##########',
        '  P  i     i   !      g   ####                              g         xx         ####      C  i  ^^^    S   ##########    g       g    !  D',
        '##############################   ###############################################################################################################',
        '##############################   ###############################################################################################################',
        '##############################   ###############################################################################################################',
      ] },
      { name: 'Laurel Creek', par: 120, th: 1, signs: [['The creek is cold. Jump the gaps!', 'The creek is cold. Jump the gaps!']], map: [
        '',
        '',
        '',
        '                                                                   E',
        '                                                                 -----',
        '                                                 ooooo',
        '                                                -------',
        '                                                               o                     !        f        !',
        '                    o    o    o         ooo          !   f  !  o                                                         ooo',
        '         ooo       o o  o o  o o       -----   -----           o                        o      o      o                 -----',
        '',
        ' P  i                               C                          S      ^^^           C                              g        g    !   D',
        '###################   BB   BB   #######################################################   ####   ####   ###################################',
        '###################   BB   BB   #######################################################   ####   ####   ###################################',
        '###################   BB   BB   #######################################################   ####   ####   ###################################',
      ] },
      { name: 'Columbia Lake', par: 140, th: 2, signs: [['Ride the platforms across the lake', 'Ride the platforms across the lake']], map: [
        '',
        '',
        '                                                   ooo                      !',
        '                                              !                                 ooo',
        '                                                 ##########H            !       BBBBBBBBB',
        '                                                 ##########',
        '                                                 ##########     ooo',
        '                                                 ##########             BBB V',
        '                    o  o  o        o  o  o       ##########                                        oo',
        '      ooo                                        ##########                                    ####xx####              o  o  o',
        '                !H         ! !H         !        ##########                                    ###  E ###',
        ' P  i                                       C V  ##########^^^^^^^^^^^^^^^^^^^^^^^^^^     C    ###    ###          !H             !    D',
        '#################          BBB          ############################################################################              #########',
        '#################          BBB          ############################################################################              #########',
        '#################          BBB          ############################################################################              #########',
      ] },
      { name: 'Uptown', par: 160, th: 3, signs: [['Climb the scaffolding · Down drops through', 'Climb the scaffolding to the roofs']], map: [
        '',
        '                                             o',
        '                   ooo                       o    !    f !                                   !                             ooo',
        '                  -----      BBBBBBBBB                  BBBBBBBBBB                              BBBBBBBBBBBBBBBBBBBBBBBBB',
        '                             BBBBBBBBBBBBBBB            BBBBBBBBBB                              BBBBBBBBBBBBBBBBBBBBBBBBB',
        '                         ooo BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB   ooo                        BBBBBBBBBBBBBBBBBBBBBBBBB',
        '                        -----BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB  -----                       BBBBBBBBBBBBBBBBBBBBBBBBB   -----',
        '                             BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB                              xx        BBBBBBBBBBBBBBB',
        '                             BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB         ooo                  xx    E   BBBBBBBBBBBBBBB              !  f  !',
        '      ooo         -----      BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB        -----                 BBBBBBBBBBBBBBBBBBBBBBBBB         -----',
        '                             BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB                              BBBBBBBBBBBBBBBBBBBBBBBBB',
        ' P  i                        BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB  C           g      g     V  BBBBBBBBBBBBBBBBBBBBBBBBB                  D',
        '#############################BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB##############################BBBBBBBBBBBBBBBBBBBBBBBBB#####################',
        '#############################BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB##############################BBBBBBBBBBBBBBBBBBBBBBBBB#####################',
        '#############################BBBBBBBBBBBBBBB   BBBBBB   BBBBBBBBBB##############################BBBBBBBBBBBBBBBBBBBBBBBBB#####################',
      ] },
      { name: 'Construction Zone', par: 160, th: 4, signs: [['Mind the spikes, above and below!', 'Mind the spikes, above and below!']], map: [
        '',
        '',
        '',
        '                                                                      oo   o o o o   oo',
        '                                                                    ------!H        !------',
        '                                                      BBBBBB',
        '                                                      xx  BB',
        '                                                      xx EBB                                                          o  o    o    o  o',
        '                   oooo           oooooo  BBBBBBBBBBBBBBBBBB                                                                             D',
        '      ooo         ------        --------  vvvvvvvvvvvvvvvvvv                                                  ####H         BBH        #####',
        '                                                                                                              ####          BB         #####',
        ' P  i           g   ^^   g    ^^^   g      o o o o o o o o        S^^^^^^^^^^^^^^^^^^^^^^    C      g      g  ####^^^^^^^^^^BB^^^^^^^^^#####',
        '############################################################################################################################################',
        '############################################################################################################################################',
        '############################################################################################################################################',
      ] },
      { name: 'Night Campus', par: 180, th: 5, signs: [['Last stretch. The nest is near!', 'Last stretch. The nest is near!']], map: [
        '                                                                       E   !',
        '                                                                      ---',
        '                                                                                ooo             ooo',
        '                                 oooooo   oo   o  o  o  o  oo  ooo            ######################',
        '                                ------------!H           !-------             ######################',
        '                                                                              ######################    ooo',
        '                                                                              ######################  -----',
        '                                                                              ######################',
        '                !  f   !   !  f   !                                           ######################            !   f    !     ooo',
        '      ooo           o       o                                                 ######################       -----              -----',
        '                                                                              ######################',
        ' P  i                               S    C  g      ^^    g      ^^     C  V   ######################              ^^   g     C      g  ^^^     D',
        '###################   #####   ######################################################################################################################',
        '###################   #####   ######################################################################################################################',
        '###################   #####   ######################################################################################################################',
      ] },
    ];
    const TH = [
      { sky: ['#8fd3e6', '#eaf7f3'], far: '#b9ddd3', mid: '#98cfae', near: '#7cbf98', water: '#5bbccc', sun: '#fff6dc' },
      { sky: ['#a7def0', '#f6f0dc'], far: '#c3e2d2', mid: '#a2d1a9', near: '#83c08f', water: '#4fb3c8', sun: '#fff3cf' },
      { sky: ['#6fc2e3', '#dff3f6'], far: '#a9d3dc', mid: '#86c4b8', near: '#6db3a0', water: '#3fa7c4', sun: '#fffbe8' },
      { sky: ['#7fbfd6', '#f8ddb0'], far: '#a7bec3', mid: '#8bb0ad', near: '#6f9e98', water: '#3f98ae', sun: '#ffe7b0', city: 1 },
      { sky: ['#ee8f7a', '#fcd89e'], far: '#d6a091', mid: '#b98579', near: '#9a6e66', water: '#3b8a9c', sun: '#fff0c8', city: 1 },
      { sky: ['#0d2436', '#2b5a6e'], far: '#1d3b4d', mid: '#173140', near: '#122834', water: '#1b5566', moon: 1, city: 1, night: 1 },
    ];
    const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const stars = Array.from({ length: 70 }, (_, i) => [hash(i), hash(i + 99) * 0.7, hash(i + 7)]);
    let W = 400, H = 300, s = 2, VW = 200, VH = 150, k = 1, gt = 0, acc = 0;
    let state = 'ready', S = null, grid = [], ROWS = 15, COLS = 40, door = null, signs = [], parts = [];
    const cam = { x: 0, y: 0, look: 0, ty: 0 };
    let deadT = 0, clearT = 0, overT = 0, annT = 0, shake = 0, newBest = false, tally = null, xFade = 0, reached = 0, pick = 0;
    let best = env.load('quest');
    const held = { left: false, right: false, down: false }; let jumpKey = false, ptr = null;

    const tile = (cx, cy) => (cy < 0 || cy >= ROWS ? ' ' : cx < 0 || cx >= COLS ? '#' : grid[cy][cx]);
    const hard = (ch) => ch === '#' || ch === 'B';
    const solid = (cx, cy) => hard(tile(cx, cy));
    const jumpHeld = () => jumpKey || !!(ptr && (ptr.jump || ptr.swj || ptr.j2));
    const dirNow = () => (held.right || (ptr && ptr.dir > 0) ? 1 : 0) - (held.left || (ptr && ptr.dir < 0) ? 1 : 0);
    const mmss = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t) % 60).padStart(2, '0');

    // ---- levels
    function place(m, t) { const L = m.max - m.min, v = L > 0 ? m.min + L * (1 - Math.cos(t * 2 * MSPD / L + m.ph)) / 2 : m.min; if (m.v) m.y = v; else m.x = v; }
    function fresh(sp) { return { x: sp.x, y: sp.y, vx: 0, vy: 0, ground: true, on: -1, face: 1, coy: 0, buf: 0, jumping: false, drop: 0, run: 0, sq: 0 }; }
    function load(li, keep) {
      const lv = LV[li]; ROWS = lv.map.length; COLS = Math.max(...lv.map.map((r) => r.length));
      grid = lv.map.map((r) => r.padEnd(COLS, ' ').split(''));
      const st = Object.assign({ li, time: 0, coins: [], egg: null, cps: [], foes: [], movers: [], springs: [], spawn: { x: 24, y: 192 }, lvCoins: 0 }, keep);
      signs = []; door = null; parts = [];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const ch = grid[y][x], cx = x * T + T / 2, by = (y + 1) * T; let clr = true;
        if (ch === 'P') st.spawn = { x: cx, y: by };
        else if (ch === 'o') st.coins.push({ x: cx, y: y * T + 8, got: 0 });
        else if (ch === 'E') st.egg = { x: cx, y: y * T + 8, got: 0 };
        else if (ch === 'S') st.springs.push({ x: x * T, y: y * T, t: 0 });
        else if (ch === 'C') st.cps.push({ x: cx, y: by, on: 0 });
        else if (ch === 'D') door = { x: cx, y: by };
        else if (ch === 'g') st.foes.push({ k: 'g', x: cx, y: by, vx: -26, t: x, dead: 0 });
        else if (ch === 'f') st.foes.push({ k: 'f', x: cx, y: y * T + 8, by: y * T + 8, vx: -38, t: x * 0.7, dead: 0 });
        else if (ch === 'i') signs.push({ x: cx, y: by });
        else if (ch === 'H' || ch === 'V') st.movers.push({ v: ch === 'V' ? 1 : 0, c: x, r: y });
        else clr = false;
        if (clr) grid[y][x] = ' ';
      }
      signs.sort((a, b) => a.x - b.x).forEach((q, i) => { q.txt = lv.signs[i] || ['', '']; });
      const free = (cx, cy) => cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && !hard(grid[cy][cx]) && grid[cy][cx] !== '!';
      st.movers = st.movers.map(({ v, c, r }) => {
        let a = v ? r : c, b = a;
        if (v) { const f3 = (yy) => free(c, yy) && free(c + 1, yy) && free(c + 2, yy); while (f3(a - 1)) a--; while (f3(b + 1)) b++; }
        else { while (free(a - 1, r)) a--; while (free(b + 3, r)) b++; }
        const min = a * T, max = b * T, start = (v ? r : c) * T, L = max - min;
        const m = { v, x: c * T, y: r * T, min, max, ph: L > 0 ? Math.acos(clamp(1 - 2 * (start - min) / L, -1, 1)) : 0, dx: 0, dy: 0 };
        place(m, 0); return m;
      });
      st.p = fresh(st.spawn);
      S = st; xFade = 0; annT = 2.6; acc = 0; snapCam();
    }
    function begin(li) { newBest = false; load(li, { score: 0, lives: LIVES, deaths: 0, coinN: 0, eggN: 0 }); state = 'play'; }
    function keepStats() { return { score: S.score, lives: S.lives, deaths: S.deaths, coinN: S.coinN, eggN: S.eggN }; }
    function saveBest() { if (S.score > best) { best = S.score; newBest = true; env.save('quest', best); } }
    function next() {
      if (S.li + 1 < LV.length) { reached = Math.max(reached, S.li + 1); load(S.li + 1, keepStats()); state = 'play'; }
      else { S.score += S.lives * 500; finish('won'); }
    }
    function finish(kind) { state = kind; overT = 0; pick = kind === 'won' ? 0 : S.li; reached = Math.max(reached, S.li); saveBest(); }
    function respawn() { S.p = fresh(S.spawn); state = 'play'; snapCam(); puff(S.p.x, S.p.y - 10, '#ffffff', 12); }

    // ---- effects
    function puff(x, y, col, n) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(20, 70); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.6), kind: 'spark', col }); } }
    function dust(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-5, 5), y, vx: rnd(-40, 40), vy: rnd(-40, -8), life: rnd(0.25, 0.45), kind: 'dust' }); }
    function feathers(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-110, 110), vy: rnd(-200, -40), r: rnd(0, 6), vr: rnd(-8, 8), life: rnd(0.8, 1.3), kind: 'feather' }); }
    function pop(x, y, txt, col) { parts.push({ x, y, vx: 0, vy: -26, life: 0.8, kind: 'txt', txt, col: col || INK }); }

    // ---- physics
    function moveX(dx) {
      const p = S.p; p.x += dx; if (!dx) return;
      const top = Math.floor((p.y - PH + 0.01) / T), bot = Math.floor((p.y - 0.01) / T);
      if (dx > 0) { const c = Math.floor((p.x + PW) / T); for (let r = top; r <= bot; r++) if (solid(c, r)) { p.x = c * T - PW; p.vx = Math.min(p.vx, 0); return; } }
      else { const c = Math.floor((p.x - PW) / T); for (let r = top; r <= bot; r++) if (solid(c, r)) { p.x = (c + 1) * T + PW; p.vx = Math.max(p.vx, 0); return; } }
    }
    function moveY(dy, py) {
      const p = S.p; p.y += dy;
      const l = Math.floor((p.x - PW + 0.01) / T), r = Math.floor((p.x + PW - 0.01) / T);
      if (dy > 0) {
        const row = Math.floor(p.y / T);
        if (row * T >= py - 0.01) for (let c = l; c <= r; c++) { const ch = tile(c, row); if (hard(ch) || (ch === '-' && p.drop <= 0)) { p.y = row * T; p.vy = 0; p.ground = true; return; } }
        if (p.drop <= 0) for (let i = 0; i < S.movers.length; i++) { const m = S.movers[i];
          if (p.x + PW > m.x && p.x - PW < m.x + 3 * T && py <= Math.max(m.y, m.y - m.dy) + 1 && p.y >= m.y) { p.y = m.y; p.vy = 0; p.ground = true; p.on = i; return; } }
      } else if (dy < 0) {
        const row = Math.floor((p.y - PH) / T);
        for (let c = l; c <= r; c++) if (solid(c, row)) { p.y = (row + 1) * T + PH; p.vy = 0; return; }
      }
    }
    function moveFoe(e, dt) {
      e.t += dt;
      if (e.dead) { e.dead += dt; if (e.k === 'f') e.y += 90 * dt * e.dead * 3; return; }
      const d = Math.sign(e.vx) || 1;
      if (e.k === 'g') {
        e.x += e.vx * dt; const c = Math.floor((e.x + d * 7) / T), r = Math.floor((e.y - 1) / T), ch = tile(c, r), below = tile(c, r + 1);
        if (hard(ch) || ch === 'x' || ch === '!' || ch === '^' || !(hard(below) || below === '-')) { e.vx = -e.vx; e.x += e.vx * dt; }
      } else {
        e.x += e.vx * dt; const c = Math.floor((e.x + d * 9) / T), r = Math.floor(e.by / T), ch = tile(c, r);
        if (hard(ch) || ch === '!' || ch === 'x') { e.vx = -e.vx; e.x += e.vx * dt; }
        e.y = e.by + Math.sin(e.t * 2.6) * 6;
      }
    }
    const foeBox = (e) => (e.k === 'g' ? [e.x - 6, e.y - 14, e.x + 6, e.y] : [e.x - 8, e.y - 5, e.x + 8, e.y + 5]);
    function die() {
      if (state !== 'play') return;
      const p = S.p; state = 'dead'; deadT = 0; S.deaths++; S.lives--; shake = 0.4; env.buzz();
      feathers(p.x, Math.min(p.y, ROWS * T) - 10, 16);
      if (p.y > ROWS * T - 10) for (let i = 0; i < 14; i++) parts.push({ x: p.x + rnd(-8, 8), y: (ROWS - 1.45) * T, vx: rnd(-60, 60), vy: rnd(-200, -80), life: rnd(0.5, 0.9), kind: 'drop', col: TH[LV[S.li].th].water });
    }
    function clear() {
      state = 'clear'; clearT = 0; env.buzz();
      const tb = Math.max(0, Math.round(LV[S.li].par - S.time)) * 10;
      tally = { coins: S.lvCoins, total: S.coins.length, egg: S.egg && S.egg.got, time: S.time, tb };
      S.score += tb + 1000; reached = Math.max(reached, Math.min(S.li + 1, LV.length - 1)); saveBest();
      for (let i = 0; i < 30; i++) parts.push({ x: door.x + rnd(-6, 6), y: door.y - 20, vx: rnd(-90, 90), vy: rnd(-180, -60), life: rnd(0.8, 1.4), kind: 'confetti', col: [GOLD, ACC, RED, '#7b61c9', '#4cb782'][i % 5], r: rnd(0, 6), vr: rnd(-9, 9) });
    }
    function tick(dt) {
      S.time += dt;
      for (const m of S.movers) { const ox = m.x, oy = m.y; place(m, S.time); m.dx = m.x - ox; m.dy = m.y - oy; }
      for (const q of S.springs) if (q.t > 0) q.t -= dt;
      for (const e of S.foes) moveFoe(e, dt);
      if (state !== 'play') return;
      const p = S.p;
      if (p.on >= 0) { const m = S.movers[p.on]; moveX(m.dx); p.y += m.dy; }
      const dir = dirNow();
      if (dir) { if (p.vx * dir < 0) p.vx += dir * (p.ground ? FRIC : AIRACC) * dt; p.vx += dir * (p.ground ? ACC : AIRACC) * dt; p.face = dir; }
      else { const f = (p.ground ? FRIC : AIRFRIC) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
      p.vx = clamp(p.vx, -MAXV, MAXV);
      if (p.ground) p.coy = COY; else p.coy -= dt;
      p.buf -= dt; p.drop -= dt;
      if (held.down && p.ground) { const l = Math.floor((p.x - PW + 0.01) / T), r = Math.floor((p.x + PW - 0.01) / T), row = Math.floor(p.y / T) ; if (p.on >= 0 || (!solid(l, row) && !solid(r, row))) p.drop = 0.16; }
      if (p.buf > 0 && p.coy > 0) { p.vy = -JV; p.jumping = true; p.buf = 0; p.coy = 0; p.ground = false; p.on = -1; p.sq = -0.45; dust(p.x, p.y, 5); }
      const jh = jumpHeld(); let g = GR;
      if (p.vy < 0) { if (p.jumping && !jh) g *= 2.8; else if (p.vy > -45 && jh) g *= 0.6; } else g *= p.vy < 45 && jh ? 0.7 : 1.25;
      p.vy = Math.min(MAXFALL, p.vy + g * dt); if (p.vy >= 0) p.jumping = false;
      const py = p.y, iv = p.vy, was = p.ground; p.ground = false; p.on = -1;
      moveX(p.vx * dt); p.x = clamp(p.x, PW, COLS * T - PW);
      moveY(p.vy * dt, py);
      if (p.ground && !was && iv > 150) { p.sq = Math.min(0.55, iv / 700); dust(p.x, p.y, 4 + Math.floor(iv / 120)); }
      p.sq += (0 - p.sq) * Math.min(1, dt * 10); p.run += Math.abs(p.vx) * dt * 0.13;
      // hazards
      const l = p.x - PW + 1, r = p.x + PW - 1, tp = p.y - PH + 2, bt = p.y;
      for (let cy = Math.floor(tp / T); cy <= Math.floor((bt - 0.01) / T); cy++) for (let cx = Math.floor(l / T); cx <= Math.floor(r / T); cx++) {
        const ch = tile(cx, cy);
        if ((ch === '^' && bt > cy * T + 9 && r > cx * T + 3 && l < cx * T + 13) || (ch === 'v' && tp < cy * T + 7 && r > cx * T + 3 && l < cx * T + 13)) { die(); return; }
      }
      if (p.y > ROWS * T + 24) { die(); return; }
      for (const q of S.springs) if (p.vy >= 0 && p.x + PW > q.x + 2 && p.x - PW < q.x + 14 && p.y >= q.y + 6 && p.y <= q.y + T + 0.5) {
        p.vy = -SPRV; p.jumping = false; p.ground = false; p.on = -1; q.t = 0.35; p.sq = -0.6; dust(p.x, p.y, 6);
      }
      for (const e of S.foes) {
        if (e.dead) continue; const b = foeBox(e);
        if (p.x + PW > b[0] && p.x - PW < b[2] && p.y > b[1] && p.y - PH < b[3]) {
          if (p.vy > 0 && py <= b[1] + 6) { e.dead = 0.001; p.vy = jh ? -390 : -250; p.jumping = true; S.score += 100; shake = Math.max(shake, 0.12); puff(e.x, b[1], e.k === 'g' ? '#f07b2c' : '#d4d8de', 10); pop(e.x, b[1] - 6, '+100'); env.buzz(); }
          else { die(); return; }
        }
      }
      const mx = p.x, my = p.y - PH / 2;
      for (const q of S.coins) if (!q.got && Math.abs(q.x - mx) < 11 && Math.abs(q.y - my) < 16) {
        q.got = 1; S.coinN++; S.lvCoins++; S.score += 10; puff(q.x, q.y, GOLD, 5);
        if (S.coinN % 100 === 0) { S.lives++; pop(q.x, q.y - 10, '1-UP!', DEEP); env.buzz(); }
      }
      const eg = S.egg; if (eg && !eg.got && Math.abs(eg.x - mx) < 12 && Math.abs(eg.y - my) < 17) { eg.got = 1; S.eggN++; S.score += 500; puff(eg.x, eg.y, GOLD, 22); pop(eg.x, eg.y - 12, 'Golden egg! +500', '#b07a00'); shake = 0.15; env.buzz(); }
      for (const q of S.cps) if (!q.on && Math.abs(q.x - p.x) < 12 && p.y > q.y - 40 && p.y <= q.y + 2) { q.on = 1; S.spawn = { x: q.x, y: q.y }; puff(q.x, q.y - 26, ACC, 14); pop(q.x, q.y - 34, 'Checkpoint', DEEP); }
      if (door && p.ground && Math.abs(p.x - door.x) < 9 && Math.abs(p.y - door.y) < 3) clear();
    }

    // ---- camera
    function camTarget() {
      const p = S.p, mapW = COLS * T, mapH = ROWS * T;
      let ty = cam.ty;
      if (p.ground || state !== 'play') ty = p.y - VH * 0.64;
      else { if (p.y - PH < cam.y + VH * 0.22) ty = p.y - PH - VH * 0.22; if (p.y > cam.y + VH * 0.8) ty = p.y - VH * 0.8; }
      cam.ty = VH >= mapH ? mapH - VH : clamp(ty, 0, mapH - VH);
      const tx = p.x + cam.look - VW / 2;
      return VW >= mapW ? (mapW - VW) / 2 : clamp(tx, 0, mapW - VW);
    }
    function camera(dt) {
      const p = S.p; cam.look += (clamp(p.vx / MAXV, -1, 1) * VW * 0.16 - cam.look) * Math.min(1, dt * 2.2);
      const tx = camTarget(); cam.x += (tx - cam.x) * Math.min(1, dt * 7); cam.y += (cam.ty - cam.y) * Math.min(1, dt * (p.vy > 250 ? 9 : 5));
    }
    function snapCam() { if (!S) return; cam.look = 0; cam.ty = S.p.y - VH * 0.64; cam.y = cam.ty; cam.x = camTarget(); cam.y = cam.ty; }

    // ---- drawing: the world
    function ridge(c, par, base, amp, col, f, seed) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W + 12; x += 12) { const u = (x / s + cam.x * par) / 140; c.lineTo(x, base - amp * (0.6 + 0.25 * Math.sin(u * f + seed) + 0.15 * Math.sin(u * f * 2.7 + seed * 3))); }
      c.lineTo(W, H); c.closePath(); c.fill();
    }
    function backdrop(c, th) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const mapH = ROWS * T, dy = (cam.y - Math.max(0, mapH - VH)) * s, base = H * 0.8 - dy * 0.3;
      if (th.night) { for (const [x, y, z] of stars) { c.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(gt * (0.5 + z) + z * 9)); c.fillStyle = '#fff'; c.fillRect(((x * W - cam.x * s * 0.02) % W + W) % W, y * H, 1.6 * k, 1.6 * k); } c.globalAlpha = 1; }
      const sx = W * 0.8, sy = Math.max(30 * k, base - H * 0.55);
      if (th.moon) { c.fillStyle = 'rgba(230,240,255,.18)'; c.beginPath(); c.arc(sx, sy, 34 * k, 0, 7); c.fill(); c.fillStyle = '#f1f5f9'; c.beginPath(); c.arc(sx, sy, 18 * k, 0, 7); c.fill(); c.fillStyle = th.sky[0]; c.beginPath(); c.arc(sx + 8 * k, sy - 5 * k, 15 * k, 0, 7); c.fill(); }
      else { c.fillStyle = 'rgba(255,240,200,.5)'; c.beginPath(); c.arc(sx, sy, 30 * k, 0, 7); c.fill(); c.fillStyle = th.sun; c.beginPath(); c.arc(sx, sy, 19 * k, 0, 7); c.fill(); }
      if (!th.night) { c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 5; i++) { const x = ((i * 190 - cam.x * s * 0.05 + gt * 6 * k) % (W + 220) + W + 220) % (W + 220) - 110, y = base - H * (0.5 + (i % 3) * 0.09); c.beginPath(); c.ellipse(x, y, 30 * k, 8 * k, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + 10 * k, y - 5 * k, 16 * k, 9 * k, 0, 0, 7); c.fill(); } }
      if (th.city) { // a skyline far away
        const bw = 34 * k, off = cam.x * s * 0.12, i0 = Math.floor(off / bw) - 1;
        for (let i = i0; i < i0 + W / bw + 3; i++) {
          const x = i * bw - off, h = (40 + hash(i) * 90) * k, w = bw * (0.7 + hash(i + 5) * 0.3);
          c.fillStyle = th.far; c.fillRect(x, base - h - 20 * k, w, h + 30 * k + H);
          if (th.night) { c.fillStyle = 'rgba(255,214,120,.55)'; for (let wy = 0; wy < h - 10 * k; wy += 9 * k) for (let wx = 4 * k; wx < w - 6 * k; wx += 8 * k) if (hash(i * 31 + wy * 3 + wx) > 0.62) c.fillRect(x + wx, base - h - 14 * k + wy, 3 * k, 4 * k); }
        }
      } else ridge(c, 0.1, base - 20 * k, 70 * k, th.far, 5, 1);
      ridge(c, 0.25, base + 4 * k, 40 * k, th.mid, 7, 2);
      { // a row of round trees
        const tw = 46 * k, off = cam.x * s * 0.4, i0 = Math.floor(off / tw) - 1;
        for (let i = i0; i < i0 + W / tw + 3; i++) { if (hash(i * 3) < 0.35) continue; const x = i * tw - off + hash(i) * 20 * k, h = (16 + hash(i + 2) * 22) * k, y = base + 22 * k;
          c.fillStyle = th.near; c.fillRect(x - 1.5 * k, y - h, 3 * k, h); c.beginPath(); c.arc(x, y - h, (9 + hash(i + 4) * 6) * k, 0, 7); c.fill(); }
        c.fillStyle = th.near; c.fillRect(0, base + 22 * k, W, H);
      }
    }
    function dirtCol(c, cx, cy) { return solid(cx, cy - 1) ? (solid(cx, cy - 2) ? '#a77a4f' : '#b88a5c') : '#c99a6a'; }
    function drawTile(c, ch, cx, cy) {
      const x = cx * T, y = cy * T;
      if (ch === '#' || ch === 'x') {
        c.fillStyle = dirtCol(c, cx, cy); c.fillRect(x, y, T + 0.5, T + 0.5);
        const h = hash(cx * 7.3 + cy * 13.1); c.fillStyle = 'rgba(90,60,35,.22)'; c.fillRect(x + 3 + h * 8, y + 5 + h * 6, 2.2, 2.2); c.fillRect(x + 10 - h * 6, y + 11, 1.6, 1.6);
        if (!hard(tile(cx - 1, cy)) && tile(cx - 1, cy) !== 'x') { c.fillStyle = 'rgba(70,45,25,.25)'; c.fillRect(x, y, 2, T + 0.5); }
        if (!hard(tile(cx + 1, cy)) && tile(cx + 1, cy) !== 'x') { c.fillStyle = 'rgba(70,45,25,.25)'; c.fillRect(x + T - 2, y, 2, T + 0.5); }
        const up = tile(cx, cy - 1);
        if (!hard(up) && up !== 'x') {
          c.fillStyle = '#6cb565'; c.fillRect(x - 0.3, y - 1, T + 0.8, 6); c.fillStyle = '#86cf7c'; c.fillRect(x - 0.3, y - 1, T + 0.8, 2.4);
          c.fillStyle = '#6cb565'; for (let i = 0; i < 3; i++) { const bx = x + 2 + i * 5 + hash(cx + i) * 2; c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + 1.2, y - 3 - hash(cx * 3 + i) * 2); c.lineTo(bx + 2.4, y); c.fill(); }
          if (h > 0.8) { c.fillStyle = h > 0.9 ? '#fff' : GOLD; c.beginPath(); c.arc(x + 4 + h * 8, y - 2.5, 1.4, 0, 7); c.fill(); }
        }
      } else if (ch === 'B') {
        c.fillStyle = '#7fa7ad'; c.fillRect(x, y, T + 0.5, T + 0.5);
        c.fillStyle = '#a3c6cb'; c.fillRect(x, y, T, 2); c.fillRect(x, y, 2, T);
        c.fillStyle = '#5e868c'; c.fillRect(x, y + T - 2, T, 2); c.fillRect(x + T - 2, y, 2, T);
        c.fillStyle = 'rgba(40,70,75,.25)'; c.fillRect(x + 2, y + 7, T - 4, 1.2); c.fillRect(x + ((cy & 1) ? 5 : 10), y + 2, 1.2, 5); c.fillRect(x + ((cy & 1) ? 11 : 6), y + 8, 1.2, 6);
      } else if (ch === '-') {
        c.fillStyle = '#9a6a42'; c.fillRect(x, y, T + 0.5, 5.5); c.fillStyle = '#d29a68'; c.fillRect(x, y, T + 0.5, 1.8);
        c.fillStyle = '#6e4b2f'; c.fillRect(x + 7.5, y + 2.5, 1.2, 1.2);
        if (tile(cx - 1, cy) !== '-') { c.fillStyle = '#7b5232'; c.beginPath(); c.moveTo(x + 1, y + 5); c.lineTo(x + 5, y + 5); c.lineTo(x + 1, y + 10); c.fill(); }
        if (tile(cx + 1, cy) !== '-') { c.fillStyle = '#7b5232'; c.beginPath(); c.moveTo(x + T - 1, y + 5); c.lineTo(x + T - 5, y + 5); c.lineTo(x + T - 1, y + 10); c.fill(); }
      } else if (ch === '^' || ch === 'v') {
        const up = ch === '^', b = up ? y + T : y, tip = up ? y + 6 : y + 10;
        for (let i = 0; i < 2; i++) { const sx = x + i * 8; c.fillStyle = '#8d96a0'; c.beginPath(); c.moveTo(sx, b); c.lineTo(sx + 4, tip); c.lineTo(sx + 8, b); c.closePath(); c.fill(); c.fillStyle = '#e1e6ec'; c.beginPath(); c.moveTo(sx + 2.6, up ? b - 1 : b + 1); c.lineTo(sx + 4, tip + (up ? 1.5 : -1.5)); c.lineTo(sx + 4.4, up ? b - 1 : b + 1); c.closePath(); c.fill(); }
      }
    }
    function goose(c, x, y, face, run, air, vy, sq, idle) { // side view facing right (face -1 flips); (x, y) is the feet
      c.save(); c.translate(x, y); c.scale(face * 0.84 * (1 + sq * 0.35), 0.84 * (1 - sq * 0.35));
      if (air) c.rotate(clamp(vy / 1500, -0.22, 0.28));
      const st = Math.sin(run), l1 = air ? 2 : st * 5, l2 = air ? -1.5 : -st * 5;
      c.strokeStyle = '#2a2d33'; c.lineWidth = 1.7; c.lineCap = 'round';
      for (const l of [l1, l2]) { c.beginPath(); c.moveTo(0, -8); c.lineTo(l * 0.6, air ? -4 : -3); c.lineTo(l, air ? -1.5 : 0); c.stroke(); c.beginPath(); c.moveTo(l - 1, air ? -1.5 : 0); c.lineTo(l + 3, air ? -1.5 : 0); c.stroke(); }
      const bob = air ? 0 : idle ? Math.sin(gt * 3) * 0.6 : Math.abs(st) * 1.3; c.translate(0, -bob);
      c.fillStyle = '#f2efe8'; c.beginPath(); c.ellipse(-6, -11, 4, 3, 0.3, 0, 7); c.fill();
      c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(0, -13, 9.5, 6.2, -0.1, 0, 7); c.fill();
      c.fillStyle = '#f2efe8'; c.beginPath(); c.ellipse(2, -9, 6, 2.6, -0.1, 0, 7); c.fill();
      const wing = air ? Math.sin(gt * 24) * 0.7 - 0.4 : 0;
      c.save(); c.translate(-1, -14); c.rotate(wing); c.fillStyle = '#6e604f'; c.beginPath(); c.ellipse(-2, 0, 7.5, 3.4, 0.15, 0, 7); c.fill(); c.restore();
      c.strokeStyle = '#1f2024'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(5, -16); c.quadraticCurveTo(8, -22, 7, -27); c.stroke();
      c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(8.5, -28, 3.7, 2.9, 0.2, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(7.2, -26.4, 1.8, 1.1, 0.3, 0, 7); c.fill();
      c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(11, -29); c.lineTo(15.5, -27.6); c.lineTo(11, -26.4); c.closePath(); c.fill();
      if ((gt % 3.3) > 0.12) { c.fillStyle = '#fff'; c.beginPath(); c.arc(9.4, -29, 0.95, 0, 7); c.fill(); }
      c.restore();
    }
    function cone(c, e) {
      const sq = e.dead ? Math.max(0.25, 1 - e.dead * 6) : 1, d = Math.sign(e.vx) || 1;
      c.save(); c.translate(e.x, e.y); c.scale(e.dead ? 1 + (1 - sq) * 0.4 : 1, sq); if (e.dead) c.globalAlpha = clamp(1.6 - e.dead * 2, 0, 1);
      const step = Math.sin(e.t * 12) * 1.6; c.fillStyle = '#3a3f47'; c.beginPath(); c.ellipse(-3 + step, -0.8, 2.6, 1.4, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(3 - step, -0.8, 2.6, 1.4, 0, 0, 7); c.fill();
      c.fillStyle = '#3a3f47'; rr(c, -8, -4, 16, 3, 1); c.fill();
      c.fillStyle = '#f07b2c'; c.beginPath(); c.moveTo(-6.5, -4); c.lineTo(-2, -16); c.lineTo(2, -16); c.lineTo(6.5, -4); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-5, -8); c.lineTo(-3.7, -11.5); c.lineTo(3.7, -11.5); c.lineTo(5, -8); c.closePath(); c.fill();
      c.fillStyle = '#ffa25c'; c.fillRect(-1.6, -15.5, 1.2, 10);
      if (!e.dead) { c.fillStyle = '#fff'; c.beginPath(); c.arc(d * 1.2 - 1.6, -13, 1.5, 0, 7); c.arc(d * 1.2 + 1.6, -13, 1.5, 0, 7); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(d * 1.8 - 1.6, -13, 0.75, 0, 7); c.arc(d * 1.8 + 1.6, -13, 0.75, 0, 7); c.fill(); }
      c.restore(); c.globalAlpha = 1;
    }
    function drone(c, e) {
      c.save(); c.translate(e.x, e.y); if (e.dead) { c.rotate(e.dead * 7); c.globalAlpha = clamp(1.4 - e.dead, 0, 1); }
      c.strokeStyle = '#5b636e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-7, -3); c.lineTo(7, -3); c.stroke();
      const sp = Math.abs(Math.sin(gt * 40)); c.fillStyle = 'rgba(80,90,100,.55)'; for (const x of [-7, 7]) { c.beginPath(); c.ellipse(x, -4.5, 5 * (0.4 + sp * 0.6), 1, 0, 0, 7); c.fill(); }
      c.fillStyle = '#d4d8de'; rr(c, -6, -3, 12, 6, 2.5); c.fill(); c.fillStyle = '#9aa3ad'; c.fillRect(-6, 1.5, 12, 1.5);
      c.fillStyle = e.dead ? '#555' : '#ff5d73'; c.beginPath(); c.arc((Math.sign(e.vx) || 1) * 2.5, 0, 1.7, 0, 7); c.fill();
      c.restore(); c.globalAlpha = 1;
    }
    function coin(c, x, y, t) {
      const sc = Math.abs(Math.cos(t * 4 + x * 0.05));
      c.fillStyle = '#d99a1e'; c.beginPath(); c.ellipse(x, y, 5 * Math.max(0.15, sc), 5, 0, 0, 7); c.fill();
      c.fillStyle = GOLD; c.beginPath(); c.ellipse(x, y, 3.8 * Math.max(0.1, sc), 3.8, 0, 0, 7); c.fill();
      c.fillStyle = '#ffe9a8'; c.fillRect(x - 0.7 * sc, y - 2.4, 1.4 * sc, 4.8);
    }
    function egg(c, x, y, t) {
      const b = Math.sin(t * 2.4) * 1.5;
      c.fillStyle = 'rgba(255,215,90,.28)'; c.beginPath(); c.arc(x, y + b, 11 + Math.sin(t * 4) * 1.5, 0, 7); c.fill();
      c.fillStyle = '#c98f12'; c.beginPath(); c.ellipse(x, y + b + 0.5, 5.6, 7.2, 0, 0, 7); c.fill();
      c.fillStyle = '#f7c948'; c.beginPath(); c.ellipse(x - 0.4, y + b, 4.8, 6.4, 0, 0, 7); c.fill();
      c.fillStyle = '#fff4c9'; c.beginPath(); c.ellipse(x - 1.8, y + b - 2.5, 1.4, 2.4, -0.3, 0, 7); c.fill();
      for (let i = 0; i < 2; i++) { const a = t * 1.3 + i * 3.1, r = 9, tw = Math.max(0, Math.sin(t * 3 + i * 2)) * 2.2; c.fillStyle = '#fff'; c.save(); c.translate(x + Math.cos(a) * r, y + b + Math.sin(a) * r); c.fillRect(-tw / 2, -0.4, tw, 0.8); c.fillRect(-0.4, -tw / 2, 0.8, tw); c.restore(); }
    }
    function world(c, th, t) {
      const c0 = Math.max(0, Math.floor(cam.x / T) - 1), c1 = Math.min(COLS - 1, Math.ceil((cam.x + VW) / T) + 1);
      const r0 = Math.max(0, Math.floor(cam.y / T) - 1), r1 = Math.min(ROWS - 1, Math.ceil((cam.y + VH) / T) + 1);
      const wy = (ROWS - 1.45) * T, wb = Math.max(ROWS * T, cam.y + VH) + 4;
      c.fillStyle = th.water; c.fillRect(cam.x - 4, wy, VW + 8, wb - wy);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(cam.x - 4, wy + 2);
      for (let x = Math.floor(cam.x / 8) * 8 - 8; x <= cam.x + VW + 8; x += 8) c.lineTo(x, wy + Math.sin(x * 0.15 + gt * 2.4) * 1.4); c.lineTo(cam.x + VW + 8, wy + 2.5); c.closePath(); c.fill();
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        const ch = grid[cy][cx]; if (ch === ' ' || ch === '!') continue;
        if (ch === 'x') { const a = 1 - xFade * 0.7 * clamp(1.6 - Math.hypot(cx * T + 8 - S.p.x, cy * T + 8 - S.p.y + 10) / 70, 0, 1); c.globalAlpha = a; drawTile(c, ch, cx, cy); c.globalAlpha = 1; }
        else drawTile(c, ch, cx, cy);
      }
      for (const q of signs) { c.fillStyle = '#7b5232'; c.fillRect(q.x - 1, q.y - 12, 2, 12); c.fillStyle = '#c99a6a'; rr(c, q.x - 7, q.y - 18, 14, 9, 1.5); c.fill(); c.fillStyle = '#7b5232'; c.fillRect(q.x - 4.5, q.y - 15.5, 9, 1); c.fillRect(q.x - 4.5, q.y - 12.5, 6, 1); }
      for (const q of S.cps) {
        c.fillStyle = '#8d96a0'; c.fillRect(q.x - 0.8, q.y - 28, 1.6, 28); c.fillStyle = '#5e666f'; rr(c, q.x - 3.5, q.y - 2.5, 7, 2.5, 1); c.fill();
        const wv = Math.sin(gt * 6) * 1.5, fy = q.on ? q.y - 27 : q.y - 10;
        c.fillStyle = q.on ? ACC : '#d9dde3'; c.beginPath(); c.moveTo(q.x + 0.8, fy); c.quadraticCurveTo(q.x + 6, fy + 1 + wv, q.x + 12, fy + 3.5); c.lineTo(q.x + 0.8, fy + 8); c.closePath(); c.fill();
        if (q.on) { c.fillStyle = '#fff'; c.beginPath(); c.arc(q.x + 5, fy + 3.6, 1.2, 0, 7); c.fill(); }
      }
      if (door) {
        const x = door.x, y = door.y, near = Math.abs(S.p.x - x) < 50 && Math.abs(S.p.y - y) < 40, open = state === 'clear' ? Math.min(1, clearT * 3) : 0;
        if (near || open) { c.fillStyle = `rgba(255,220,120,${0.25 + 0.12 * Math.sin(gt * 5)})`; c.beginPath(); c.arc(x, y - 14, 20, 0, 7); c.fill(); }
        c.fillStyle = '#6e4b2f'; rr(c, x - 9, y - 30, 18, 30, 8); c.fill();
        c.fillStyle = '#2c2116'; rr(c, x - 7, y - 28, 14, 28, 6.5); c.fill();
        c.fillStyle = '#ffd77a'; c.globalAlpha = open; rr(c, x - 7, y - 28, 14, 28, 6.5); c.fill(); c.globalAlpha = 1;
        c.save(); c.translate(x - 7, 0); c.scale(1 - open * 0.85, 1); c.fillStyle = '#b07a4f'; rr(c, 0, y - 28, 14, 28, 6.5); c.fill(); c.fillStyle = '#9a6a42'; c.fillRect(4.5, y - 22, 1, 20); c.fillRect(9, y - 22, 1, 20); c.fillStyle = GOLD; c.beginPath(); c.arc(11, y - 12, 1.3, 0, 7); c.fill(); c.restore();
        c.fillStyle = ACC; rr(c, x - 6, y - 38, 12, 7, 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 2, y - 36.5); c.lineTo(x + 3, y - 34.5); c.lineTo(x - 2, y - 32.5); c.fill();
      }
      for (const q of S.springs) {
        const cmp = q.t > 0 ? Math.sin((q.t / 0.35) * Math.PI) : 0, top = q.y + 8 - (q.t > 0.2 ? 5 : 0) + cmp * 2;
        c.fillStyle = '#4a4f59'; rr(c, q.x + 2, q.y + 13, 12, 3, 1); c.fill();
        c.strokeStyle = '#9aa3ad'; c.lineWidth = 1.3; c.beginPath(); for (let i = 0; i <= 4; i++) { const yy = q.y + 13 - (q.y + 13 - top - 2) * i / 4; c.lineTo(q.x + (i % 2 ? 12 : 4), yy); } c.stroke();
        c.fillStyle = RED; rr(c, q.x + 1, top, 14, 3.5, 1.5); c.fill(); c.fillStyle = '#ff9a8f'; c.fillRect(q.x + 2.5, top + 0.6, 11, 1);
      }
      for (const m of S.movers) {
        c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, m.x + 1, m.y + 2, 3 * T, 7, 3); c.fill();
        c.fillStyle = '#3d8e9a'; rr(c, m.x, m.y, 3 * T, 7, 3); c.fill(); c.fillStyle = '#7fd0da'; rr(c, m.x, m.y, 3 * T, 2.4, 1.2); c.fill();
        c.fillStyle = '#e9f6f7'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(m.x + 8 + i * 16, m.y + 4.5, 1, 0, 7); c.fill(); }
        c.fillStyle = GOLD; c.beginPath(); if (m.v) { c.moveTo(m.x + 24, m.y + 8); c.lineTo(m.x + 21, m.y + 12); c.lineTo(m.x + 27, m.y + 12); } else { c.moveTo(m.x + 3, m.y + 9); c.lineTo(m.x + 7, m.y + 11); c.lineTo(m.x + 3, m.y + 13); c.moveTo(m.x + 45, m.y + 9); c.lineTo(m.x + 41, m.y + 11); c.lineTo(m.x + 45, m.y + 13); } c.fill();
      }
      for (const q of S.coins) if (!q.got && q.x > cam.x - 10 && q.x < cam.x + VW + 10) coin(c, q.x, q.y, t);
      if (S.egg && !S.egg.got) egg(c, S.egg.x, S.egg.y, t);
      for (const e of S.foes) { if (e.dead > 1.2 || e.x < cam.x - 20 || e.x > cam.x + VW + 20) continue; if (e.k === 'g') cone(c, e); else drone(c, e); }
      const p = S.p;
      if (state === 'dead') { c.globalAlpha = clamp(1 - deadT * 1.2, 0, 1); c.save(); c.translate(p.x, Math.min(p.y, ROWS * T) - 12 - deadT * 50); c.rotate(deadT * 8); goose(c, 0, 12, p.face, 0, true, 0, 0, false); c.restore(); c.globalAlpha = 1; }
      else if (state === 'clear') { c.globalAlpha = clamp(1 - clearT * 1.6, 0, 1); goose(c, p.x, p.y, p.face, 0, false, 0, 0, true); c.globalAlpha = 1; }
      else goose(c, p.x, p.y, p.face, p.run, !p.ground, p.vy, p.sq, Math.abs(p.vx) < 5);
      for (const q of parts) {
        const a = Math.min(1, q.life * 2.5); c.globalAlpha = a;
        if (q.kind === 'dust') { c.fillStyle = '#eadbc6'; c.beginPath(); c.arc(q.x, q.y, 2.2 * (1.5 - a * 0.5), 0, 7); c.fill(); }
        else if (q.kind === 'spark' || q.kind === 'drop') { c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, 1.5, 0, 7); c.fill(); }
        else if (q.kind === 'txt') { c.fillStyle = q.col; font(c, 800, 7); c.textAlign = 'center'; c.fillText(q.txt, q.x, q.y); c.textAlign = 'left'; }
        else { c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.fillStyle = q.kind === 'confetti' ? q.col : Math.round(q.r * 10) % 3 ? '#8b7a66' : '#f2efe8'; if (q.kind === 'confetti') c.fillRect(-1.5, -1, 3, 2); else { c.beginPath(); c.ellipse(0, 0, 3.4, 1.3, 0, 0, 7); c.fill(); } c.restore(); }
      }
      c.globalAlpha = 1;
      for (const q of signs) { // speech bubble over a sign the goose is next to
        if (state !== 'play' || Math.abs(p.x - q.x) > 40 || Math.abs(p.y - q.y) > 40) continue;
        const txt = q.txt[env.touch ? 1 : 0]; if (!txt) continue;
        font(c, 600, 6.5); const w = c.measureText(txt).width + 10, bx = clamp(q.x - w / 2, cam.x + 3, cam.x + VW - w - 3), by = q.y - 36;
        c.fillStyle = 'rgba(255,255,255,.94)'; rr(c, bx, by, w, 12, 4); c.fill(); c.beginPath(); c.moveTo(q.x - 3, by + 12); c.lineTo(q.x, by + 16); c.lineTo(q.x + 3, by + 12); c.fill();
        c.fillStyle = INK; c.textBaseline = 'middle'; c.fillText(txt, bx + 5, by + 6.5); c.textBaseline = 'alphabetic';
      }
    }

    // ---- drawing: HUD, touch buttons and cards
    function gooseHead(c, x, y, z) { c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(x, y, z * 0.55, z * 0.45, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - z * 0.12, y + z * 0.12, z * 0.25, z * 0.15, 0.3, 0, 7); c.fill(); c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(x + z * 0.45, y - z * 0.15); c.lineTo(x + z * 0.95, y); c.lineTo(x + z * 0.45, y + z * 0.12); c.fill(); }
    function hudDraw(c) {
      const pd = 8 * k, bh = 42 * k;
      c.fillStyle = 'rgba(255,255,255,.78)'; rr(c, pd, pd, 112 * k, bh, 10 * k); c.fill(); rr(c, W - pd - 104 * k, pd, 104 * k, bh, 10 * k); c.fill();
      c.fillStyle = INK; font(c, 800, 16 * k); c.fillText(S.score.toLocaleString(), pd + 9 * k, pd + 18 * k);
      const ry = pd + 32 * k; c.fillStyle = GOLD; c.beginPath(); c.arc(pd + 15 * k, ry - 4 * k, 5 * k, 0, 7); c.fill(); c.fillStyle = '#d99a1e'; c.fillRect(pd + 14.4 * k, ry - 7 * k, 1.2 * k, 6 * k);
      c.fillStyle = INK; font(c, 700, 12 * k); c.fillText('× ' + S.coinN, pd + 24 * k, ry);
      const ex = pd + 90 * k, eg = S.egg && S.egg.got; c.fillStyle = eg ? '#f2b632' : 'rgba(42,45,51,.15)'; c.beginPath(); c.ellipse(ex, ry - 4 * k, 5 * k, 6.5 * k, 0, 0, 7); c.fill(); if (!eg) { c.strokeStyle = 'rgba(42,45,51,.35)'; c.lineWidth = 1; c.stroke(); }
      const rx = W - pd - 104 * k; gooseHead(c, rx + 14 * k, pd + 13 * k, 12 * k); c.fillStyle = INK; font(c, 800, 13 * k); c.fillText('× ' + S.lives, rx + 27 * k, pd + 18 * k);
      c.textAlign = 'right'; font(c, 700, 13 * k); c.fillText(mmss(S.time), W - pd - 9 * k, pd + 18 * k);
      c.fillStyle = MUTE; font(c, 600, 10.5 * k); c.fillText('Level ' + (S.li + 1) + ' · ' + S.deaths + (S.deaths === 1 ? ' fall' : ' falls'), W - pd - 9 * k, ry); c.textAlign = 'left';
      if (annT > 0 && state === 'play') {
        const a = clamp(Math.min(annT, 2.6 - annT) * 3, 0, 1), lv = LV[S.li]; c.globalAlpha = a; c.textAlign = 'center';
        const y = H * 0.3; c.fillStyle = 'rgba(14,127,141,.88)'; font(c, 800, 22 * k); const w = Math.max(c.measureText(lv.name).width, 80 * k) + 36 * k; rr(c, W / 2 - w / 2, y - 30 * k, w, 52 * k, 14 * k); c.fill();
        c.fillStyle = 'rgba(255,255,255,.75)'; font(c, 700, 11 * k); c.fillText('LEVEL ' + (S.li + 1) + ' OF ' + LV.length, W / 2, y - 13 * k);
        c.fillStyle = '#fff'; font(c, 800, 22 * k); c.fillText(lv.name, W / 2, y + 12 * k); c.textAlign = 'left'; c.globalAlpha = 1;
      }
    }
    function pad(c) {
      const r = 25 * k, y = H - 36 * k, xs = [[40 * k, -1], [W / 2, 0], [W - 40 * k, 1]];
      for (const [x, d] of xs) {
        const on = d === 0 ? jumpHeld() : (ptr && ptr.dir === d) || (d < 0 ? held.left : held.right);
        c.fillStyle = on ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.26)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = 'rgba(42,45,51,.55)'; c.beginPath();
        if (d) { c.moveTo(x + d * 8 * k, y); c.lineTo(x - d * 5 * k, y - 9 * k); c.lineTo(x - d * 5 * k, y + 9 * k); }
        else { c.moveTo(x, y - 9 * k); c.lineTo(x + 9 * k, y + 5 * k); c.lineTo(x - 9 * k, y + 5 * k); }
        c.closePath(); c.fill();
      }
    }
    function clearCard(c) {
      const a = clamp(clearT * 3, 0, 1); c.globalAlpha = a;
      c.fillStyle = 'rgba(243,245,248,.55)'; c.fillRect(0, 0, W, H);
      const z = Math.min(1.2, Math.max(0.75, Math.min(W, H) / 400)), w = Math.min(W - 30 * z, 290 * z), h = 196 * z, x = (W - w) / 2, y = (H - h) / 2;
      c.fillStyle = 'rgba(0,0,0,.08)'; rr(c, x + 3, y + 5, w, h, 16 * z); c.fill(); c.fillStyle = '#fff'; rr(c, x, y, w, h, 16 * z); c.fill();
      c.textAlign = 'center'; c.fillStyle = DEEP; font(c, 800, 26 * z); c.fillText('Level clear!', W / 2, y + 38 * z);
      c.fillStyle = MUTE; font(c, 600, 12 * z); c.fillText(LV[S.li].name, W / 2, y + 56 * z);
      const rows = [['Coins', tally.coins + ' / ' + tally.total], ['Golden egg', tally.egg ? 'Found! +500' : 'Still hidden'], ['Time', mmss(tally.time) + '  (+' + tally.tb.toLocaleString() + ')'], ['Level bonus', '+1,000'], ['Score', S.score.toLocaleString()]];
      rows.forEach(([l, v], i) => { const yy = y + (82 + i * 21) * z; c.textAlign = 'left'; c.fillStyle = MUTE; font(c, 600, 13 * z); c.fillText(l, x + 22 * z, yy); c.textAlign = 'right'; c.fillStyle = i === 4 ? INK : i === 1 && tally.egg ? '#b07a00' : INK; font(c, i === 4 ? 800 : 700, 13 * z); c.fillText(v, x + w - 22 * z, yy); });
      c.textAlign = 'center'; c.fillStyle = ACC; font(c, 700, 12 * z); c.fillText(S.li + 1 < LV.length ? 'Next: ' + LV[S.li + 1].name + (clearT > 0.8 ? (env.touch ? ' · tap' : ' · A') : '') : 'Last level done!', W / 2, y + h - 14 * z);
      c.textAlign = 'left'; c.globalAlpha = 1;
    }
    function pickLine() { return reached > 0 ? '◀   Level ' + (pick + 1) + ' · ' + LV[pick].name + '   ▶' : ''; }

    function startOver(li) { if (overT < 0.6) return; begin(li); }
    function pressJump() { if (state === 'play' && S) S.p.buf = BUF; }
    const zone = (x) => (x < W / 3 ? -1 : x > W * 2 / 3 ? 1 : 0);

    const g = {
      resize(w, h) {
        W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3);
        s = Math.min(H / (12.5 * T), W / (9.5 * T)); VW = W / s; VH = H / s;
        if (S) snapCam();
      },
      reset() { state = 'ready'; newBest = false; ptr = null; held.left = held.right = held.down = false; load(0, { score: 0, lives: LIVES, deaths: 0, coinN: 0, eggN: 0 }); annT = 0; },
      step(dt) {
        dt = Math.min(dt, 0.05); gt += dt;
        if (shake > 0) shake = Math.max(0, shake - dt);
        if (annT > 0) annT -= dt;
        for (const q of parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.kind === 'feather' || q.kind === 'confetti') { q.vy += 260 * dt; q.vx *= 0.98; q.r += q.vr * dt; } else if (q.kind === 'drop') q.vy += 500 * dt; else if (q.kind === 'dust') q.vy += 40 * dt; }
        parts = parts.filter((q) => q.life > 0); if (parts.length > 260) parts.splice(0, parts.length - 260);
        if (state === 'over' || state === 'won') overT += dt;
        if (!S) return;
        acc += dt; let n = 0; while (acc >= TICK && n < 8) { tick(TICK); acc -= TICK; n++; } if (n === 8) acc = 0;
        if (state === 'dead' && (deadT += dt) > 1.05) { if (S.lives <= 0) finish('over'); else respawn(); }
        if (state === 'clear' && (clearT += dt) > 3.4) next();
        let inX = false; const p = S.p;
        for (let cy = Math.floor((p.y - PH) / T); cy <= Math.floor((p.y - 1) / T); cy++) for (let cx = Math.floor((p.x - PW) / T); cx <= Math.floor((p.x + PW) / T); cx++) if (tile(cx, cy) === 'x') inX = true;
        xFade = clamp(xFade + (inX ? dt * 4 : -dt * 2), 0, 1);
        camera(dt);
      },
      draw(c, t) {
        const th = TH[LV[S.li].th];
        c.fillStyle = th.sky[1]; c.fillRect(0, 0, W, H);
        c.save(); if (shake > 0) c.translate(rnd(-1, 1) * shake * 9 * k, rnd(-1, 1) * shake * 9 * k);
        backdrop(c, th);
        c.save(); c.translate(-Math.round(cam.x * s), -Math.round(cam.y * s)); c.scale(s, s); world(c, th, t); c.restore();
        if (th.night) { c.fillStyle = 'rgba(10,25,45,.22)'; c.fillRect(-20, -20, W + 40, H + 40); }
        c.restore();
        if (state !== 'ready') hudDraw(c);
        if (env.touch && (state === 'play' || state === 'dead')) pad(c);
        if (state === 'clear') clearCard(c);
        if (state === 'ready') banner(c, W, H, 'Goose Quest', (env.touch ? 'Hold the sides to run · tap the middle\nor swipe up to jump' : 'Arrows run · A or Up jumps, hold for higher') + '\nCoins, a hidden golden egg, then the door\n' + startWord(env), env, true);
        if (state === 'over') banner(c, W, H, 'Out of geese', 'Score ' + S.score.toLocaleString() + (newBest ? ' · new best!' : '') + '\n' + (pickLine() ? pickLine() + '\n' : '') + againWord(env), env, true);
        if (state === 'won') banner(c, W, H, 'Home at last!', 'Score ' + S.score.toLocaleString() + (newBest ? ' · new best!' : '') + '\n' + S.eggN + ' of ' + LV.length + ' golden eggs · ' + S.deaths + ' falls\n' + againWord(env), env, true);
      },
      key(k2) {
        if (k2 === 'l') k2 = 'left'; if (k2 === 'r') k2 = 'right';
        if (k2 === 'a' || k2 === 'up') {
          const fresh2 = !jumpKey; jumpKey = true;
          if (state === 'ready') begin(0);
          else if (state === 'over' || state === 'won') { if (fresh2) startOver(pick); }
          else if (state === 'clear') { if (fresh2 && clearT > 0.8) next(); }
          else if (fresh2) pressJump();
          return true;
        }
        if (k2 in held) {
          const fresh2 = !held[k2]; held[k2] = true;
          if (fresh2 && (state === 'over' || state === 'won') && reached > 0 && k2 !== 'down') pick = clamp(pick + (k2 === 'left' ? -1 : 1), 0, reached);
          return true;
        }
        return false;
      },
      release(k2) {
        if (k2 === 'l') k2 = 'left'; if (k2 === 'r') k2 = 'right';
        if (k2 === 'all') { held.left = held.right = held.down = false; jumpKey = false; ptr = null; }
        else if (k2 === 'ptr') ptr = null;
        else if (k2 === 'a' || k2 === 'up') jumpKey = false;
        else if (k2 in held) held[k2] = false;
      },
      pointer(type, x, y) {
        if (type === 'down') {
          if (state === 'ready') { begin(0); return; }
          if (state === 'over' || state === 'won') { if (overT < 0.6) return; const z = zone(x); if (reached > 0 && z) pick = clamp(pick + z, 0, reached); else startOver(pick); return; }
          if (state === 'clear') { if (clearT > 0.8) next(); return; }
          if (ptr) { ptr.j2 = true; pressJump(); return; } // a second finger jumps
          const z = zone(x); ptr = { dir: z, ymax: y, ymin: y, swj: false, jump: z === 0, j2: false };
          if (z === 0) pressJump();
        } else if (type === 'move') {
          if (!ptr) return;
          const z = zone(x); if (z) ptr.dir = z;
          if (!ptr.swj) { ptr.ymax = Math.max(ptr.ymax, y); if (ptr.ymax - y > 24 * k) { ptr.swj = true; ptr.ymin = y; pressJump(); } }
          else { ptr.ymin = Math.min(ptr.ymin, y); if (y - ptr.ymin > 16 * k) { ptr.swj = false; ptr.ymax = y; } }
        } else if (type === 'up') ptr = null;
      },
      hud: () => [S && state !== 'ready' ? 'Score ' + S.score.toLocaleString() + ' · Level ' + (S.li + 1) : 'Goose Quest', 'Best ' + Math.max(best, S ? S.score : 0).toLocaleString()],
    };
    g.reset();
    return g;
  }

  function ICON_quest(c, z) {
    const g = c.createLinearGradient(0, 0, 0, z); g.addColorStop(0, '#6fc6e0'); g.addColorStop(1, '#dff3ef');
    c.fillStyle = g; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.14); c.fill();
    c.save(); rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.14); c.clip();
    c.fillStyle = '#9fd0ad'; c.beginPath(); c.ellipse(z * 0.3, z * 0.74, z * 0.34, z * 0.16, 0, 0, 7); c.fill();
    c.fillStyle = '#c99a6a'; c.fillRect(z * 0.08, z * 0.74, z * 0.84, z * 0.2); c.fillStyle = '#6cb565'; c.fillRect(z * 0.08, z * 0.72, z * 0.84, z * 0.06); c.fillStyle = '#86cf7c'; c.fillRect(z * 0.08, z * 0.72, z * 0.84, z * 0.022);
    c.fillStyle = '#7fa7ad'; c.fillRect(z * 0.56, z * 0.4, z * 0.3, z * 0.12); c.fillStyle = '#a3c6cb'; c.fillRect(z * 0.56, z * 0.4, z * 0.3, z * 0.025); c.fillStyle = '#5e868c'; c.fillRect(z * 0.56, z * 0.495, z * 0.3, z * 0.025); c.fillRect(z * 0.705, z * 0.4, z * 0.012, z * 0.12);
    c.fillStyle = 'rgba(255,215,90,.35)'; c.beginPath(); c.arc(z * 0.71, z * 0.29, z * 0.1, 0, 7); c.fill();
    c.fillStyle = '#c98f12'; c.beginPath(); c.ellipse(z * 0.71, z * 0.295, z * 0.055, z * 0.072, 0, 0, 7); c.fill(); c.fillStyle = '#f7c948'; c.beginPath(); c.ellipse(z * 0.705, z * 0.29, z * 0.047, z * 0.064, 0, 0, 7); c.fill(); c.fillStyle = '#fff4c9'; c.beginPath(); c.ellipse(z * 0.69, z * 0.265, z * 0.013, z * 0.022, -0.3, 0, 7); c.fill();
    [[0.2, 0.3], [0.31, 0.22], [0.42, 0.24]].forEach(([x, y]) => { c.fillStyle = '#d99a1e'; c.beginPath(); c.arc(z * x, z * y, z * 0.04, 0, 7); c.fill(); c.fillStyle = GOLD; c.beginPath(); c.arc(z * x, z * y, z * 0.03, 0, 7); c.fill(); });
    c.save(); c.translate(z * 0.32, z * 0.66); const u = z / 64; c.scale(u, u); c.rotate(-0.12);
    c.strokeStyle = '#2a2d33'; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -8); c.lineTo(2, -3); c.lineTo(4, -2); c.moveTo(-2, -8); c.lineTo(-4, -3); c.lineTo(-1, -2); c.stroke();
    c.fillStyle = '#f2efe8'; c.beginPath(); c.ellipse(-6, -11, 4, 3, 0.3, 0, 7); c.fill();
    c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(0, -13, 9.5, 6.2, -0.1, 0, 7); c.fill();
    c.save(); c.translate(-1, -15); c.rotate(-0.8); c.fillStyle = '#6e604f'; c.beginPath(); c.ellipse(-2, 0, 8, 3.6, 0.15, 0, 7); c.fill(); c.restore();
    c.strokeStyle = '#1f2024'; c.lineWidth = 3.6; c.beginPath(); c.moveTo(5, -16); c.quadraticCurveTo(8, -22, 7, -27); c.stroke();
    c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(8.5, -28, 3.8, 3, 0.2, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(7.2, -26.4, 1.9, 1.2, 0.3, 0, 7); c.fill();
    c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(11, -29); c.lineTo(15.5, -27.6); c.lineTo(11, -26.4); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(9.4, -29, 1, 0, 7); c.fill();
    c.restore(); c.restore();
  }

  /* ---------------- Sticker Slice ----------------
     A swipe-to-slice arcade game: the site's stickers are tossed up in arcs, swipe through them to cut them in two along the
     line of the swipe. Bombs cost a life, so does every sticker you let drop; three and you're out. Slice several in one
     swipe for a combo; the golden goose sticker sets off a short frenzy. All code here is original (no code adapted). */
  function slice(env) {
    const TAU = Math.PI * 2;
    const STK = [ // [picture, splat colour, fallback label]
      ['github', '#3b4250', 'GH'], ['t_react', '#61dafb', 'R'], ['t_python', '#3776ab', 'Py'], ['waterloo', '#e4b429', 'UW'],
      ['mlh', '#e73427', 'MLH'], ['devpost', '#1aa3b3', 'DP'], ['linkedin', '#0a66c2', 'in'], ['t_aws', '#ff9900', 'AWS'],
      ['goose', '#8b7a66', 'G'], ['t_ts', '#3178c6', 'TS'], ['t_go', '#00add8', 'Go'], ['t_firebase', '#ffca28', 'FB'],
      ['t_java', '#e76f00', 'J'], ['t_rails', '#cc3333', 'RB'], ['t_graphql', '#e535ab', 'GQL'], ['huskies', '#7b61c9', 'H'],
    ];
    let W = 400, H = 300, k = 1, R = 30, gt = 0;
    let state, items, halves, parts, splats, pops, slashes, strokes, stroke, queue, spawnT, elapsed, score, strikes, comboN, comboT, comboX, comboY;
    let frenzyT, frenzySpawn, goldCd, shake, flash, flashCol, overT, newBest, sliced, bestCombo, marks, decoT, byBomb, strikeT;
    let best = env.load('slice');
    const held = { up: false, down: false, left: false, right: false, a: false };
    const cur = { x: 200, y: 150, vx: 0, vy: 0, acc: 0 };
    let kb = false, ptrDown = false, last = null, pend = [];
    const grav = () => H * 1.35 * (1 + Math.min(0.4, (state === 'play' ? elapsed : 0) * 0.005));
    const rad = (it) => R * it.m;

    // ---- tossing things up
    function toss(kind, o) {
      o = o || {};
      const m = kind === 'bomb' ? 0.84 : kind === 'gold' ? 1.08 : 1, r = R * m, G = grav();
      const it = { kind, si: Math.floor(Math.random() * STK.length), m, rot: rnd(0, TAU), vr: rnd(-3, 3), dec: !!o.dec, side: !!o.side, t: 0 };
      if (o.side) { // frenzy: flung in from the sides
        const L = Math.random() < 0.5; it.x = L ? -r : W + r; it.y = H * rnd(0.45, 0.85);
        it.vx = (L ? 1 : -1) * W * rnd(0.35, 0.6); it.vy = -Math.sqrt(2 * G * Math.max(20, it.y - H * rnd(0.12, 0.35)));
      } else {
        it.x = W * rnd(0.12, 0.88); it.y = H + r;
        const apex = H * rnd(0.1, 0.36) + 30 * k, vy = Math.sqrt(2 * G * (it.y - apex)), T = 2 * vy / G;
        it.vx = (W * rnd(0.15, 0.85) - it.x) / T; it.vy = -vy;
      }
      items.push(it);
    }
    function wave() {
      const e = elapsed, maxN = Math.min(6, 1 + Math.floor(e / 14) + (Math.random() < 0.35 ? 1 : 0));
      const n = 1 + Math.floor(Math.random() * maxN), stream = n >= 3 && Math.random() < 0.45;
      const bc = e < 7 ? 0 : Math.min(0.3, 0.08 + e * 0.0035), maxB = e > 60 ? 2 : 1;
      let bombs = 0;
      for (let i = 0; i < n; i++) {
        const kind = bombs < maxB && Math.random() < bc ? 'bomb' : 's'; if (kind === 'bomb') bombs++;
        queue.push({ t: stream ? i * 0.2 : rnd(0, 0.12), kind });
      }
      if (!bombs && n >= 2 && Math.random() < bc * 0.7) queue.push({ t: rnd(0, 0.3), kind: 'bomb' });
      if (e > 16 && goldCd <= 0 && Math.random() < 0.14) { queue.push({ t: rnd(0.1, 0.4), kind: 'gold' }); goldCd = 22; }
      spawnT = Math.max(0.85, 2.3 - e * 0.016) + (stream ? n * 0.18 : 0) + n * 0.06;
    }

    // ---- effects
    function droplets(x, y, col, n, sp) {
      for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(0.3, 1) * sp * k; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * k, r: rnd(1.5, 4) * k, col, t: rnd(0.4, 0.8), max: 0.8, g: 1 }); }
    }
    function splat(x, y, col, size) {
      const blobs = []; for (let i = 0; i < 9; i++) { const a = rnd(0, TAU), d = rnd(0, 1) * R * size; blobs.push([Math.cos(a) * d, Math.sin(a) * d, rnd(0.18, 0.5) * R * size * (1 - d / (R * size * 1.6))]); }
      for (let i = 0; i < 6; i++) { const a = rnd(0, TAU), d = rnd(1.1, 1.8) * R * size; blobs.push([Math.cos(a) * d, Math.sin(a) * d, rnd(0.05, 0.12) * R]); }
      splats.push({ x, y, col, blobs, t: 4 }); if (splats.length > 26) splats.shift();
    }
    function pop(x, y, txt, col, size, life) {
      size = size || 18; const hw = Math.min(W / 2, txt.length * size * k * 0.32 + 8 * k);
      y = clamp(y, 70 * k, H - 30 * k);
      if (size >= 20) for (const p of pops) if (p.size >= 20 && Math.abs(p.y - y) < size * k * 1.2) y = p.y - size * k * 1.3; // keep big messages from overlapping
      pops.push({ x: clamp(x, hw, W - hw), y: Math.max(60 * k, y), txt, col: col || '#fff', size, t: life || 0.9, max: life || 0.9 });
    }
    function strike(x, bomb) {
      if (state !== 'play') return;
      strikes++; strikeT = 0.6; shake = Math.max(shake, bomb ? 0.5 : 0.2); env.buzz();
      if (!bomb) marks.push({ x: clamp(x, 20 * k, W - 20 * k), t: 1.2 });
      if (strikes >= 3) { state = 'over'; overT = 0; byBomb = bomb; held.a = false; endBlade(); newBest = score > best; if (newBest) { best = score; env.save('slice', best); } }
    }
    function boom(it) {
      const r = rad(it); flash = 1; flashCol = '255,240,220'; shake = 0.55;
      for (let i = 0; i < 46; i++) { const a = rnd(0, TAU), v = rnd(80, 420) * k; parts.push({ x: it.x, y: it.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rnd(2, 5) * k, col: ['#ffd66b', '#ff9f43', '#fff', RED, '#3a4250'][i % 5], t: rnd(0.4, 1), max: 1, g: 0.3 }); }
      parts.push({ ring: 1, x: it.x, y: it.y, r: r * 3.4, t: 0.45, max: 0.45 });
      splat(it.x, it.y, '#1c2128', 1.3); pop(it.x, it.y - r, 'BOOM!', '#ff7d6e', 28, 1);
      strike(it.x, true);
    }

    // ---- the blade
    function flush() { // slice along whatever path the blade took since the last step
      const list = pend; pend = [];
      if (state === 'play' && last) for (const p of list) { bladeSeg(last.x, last.y, p.x, p.y); if (!last) break; last = p; if (stroke) stroke.push({ x: p.x, y: p.y, age: 0 }); }
    }
    function endBlade() { last = null; stroke = null; pend = []; }
    const TRAIL = 0.36; // how long a swipe stays visible, hit or miss
    function newStroke(x, y) { last = { x, y }; stroke = [{ x, y, age: 0 }]; strokes.push(stroke); if (strokes.length > 6) strokes.shift(); }
    function cutItem(it, ax, ay, bx, by) {
      const r = rad(it), dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      if (it.kind === 'bomb') { boom(it); return; }
      const d = clamp((ax - it.x) * nx + (ay - it.y) * ny, -0.45 * r, 0.45 * r);
      const cs = Math.cos(-it.rot), sn = Math.sin(-it.rot), lnx = nx * cs - ny * sn, lny = nx * sn + ny * cs; // the cut, in the sticker's own frame
      const sp = 75 * k, fw = 45 * k;
      for (const sd of [1, -1]) halves.push({ it, x: it.x, y: it.y, vx: it.vx * 0.6 + nx * sp * sd + ux * fw, vy: Math.min(it.vy * 0.5, 0) + ny * sp * sd + uy * fw, rot: it.rot, vr: it.vr + sd * rnd(3, 6), nx: lnx * sd, ny: lny * sd, d: d * sd, t: 0 });
      const cx = it.x + nx * d, cy = it.y + ny * d;
      slashes.push({ x1: cx - ux * r * 1.7, y1: cy - uy * r * 1.7, x2: cx + ux * r * 1.7, y2: cy + uy * r * 1.7, t: 0.2 });
      const col = it.kind === 'gold' ? GOLD : STK[it.si][1];
      splat(it.x, it.y, col, it.kind === 'gold' ? 1.4 : 1); droplets(it.x, it.y, col, 14, 260);
      sliced++; env.buzz();
      if (state !== 'play') return;
      if (it.kind === 'gold') {
        score += 50; frenzyT = 5.5; frenzySpawn = 0; flash = 0.7; flashCol = '255,214,107'; shake = Math.max(shake, 0.25);
        pop(it.x, it.y - r, 'FRENZY! +50', GOLD, 26, 1.3); droplets(it.x, it.y, '#fff3b0', 20, 380);
        queue = queue.filter((q) => q.kind !== 'bomb'); for (const o of items) if (o.kind === 'bomb') o.fuse = 1; // bombs fizzle out
      } else { score += 10; pop(it.x, it.y - r * 0.6, '+10', '#fff', 15, 0.6); }
      comboN++; comboT = 0.32; comboX = it.x; comboY = it.y;
    }
    function bladeSeg(ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      if (L2 < 2) return;
      for (const it of items) {
        if (it.cut || it.fuse) continue;
        const r = rad(it) * (it.kind === 'bomb' ? 0.8 : 1.05);
        const tt = clamp(((it.x - ax) * dx + (it.y - ay) * dy) / L2, 0, 1), px = ax + dx * tt - it.x, py = ay + dy * tt - it.y;
        if (px * px + py * py < r * r) { it.cut = true; cutItem(it, ax, ay, bx, by); if (state !== 'play') return; }
      }
      items = items.filter((it) => !it.cut);
    }

    function start() { if (state === 'over' && overT < 0.6) return; g.reset(); state = 'play'; spawnT = 0.6; }

    // ---- simulation
    function phys(dt) {
      const G = grav();
      for (const it of items) { it.t += dt; it.vy += G * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt; }
      for (const h of halves) { h.t += dt; h.vy += G * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
    }
    function tick(dt) {
      gt += dt; if (shake > 0) shake -= dt; if (flash > 0) flash -= dt * 2.5; if (strikeT > 0) strikeT -= dt; if (state === 'over') overT += dt;
      if (goldCd > 0) goldCd -= dt;
      // the key-driven blade cursor: fast, and faster the longer an arrow is held
      const ix = (held.right ? 1 : 0) - (held.left ? 1 : 0), iy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (ix || iy) cur.acc += dt; else cur.acc = 0;
      const n0 = Math.hypot(ix, iy) || 1, spd = k * (340 + 1050 * Math.min(1, cur.acc / 0.45));
      cur.vx += (ix / n0 * spd - cur.vx) * Math.min(1, dt * 16); cur.vy += (iy / n0 * spd - cur.vy) * Math.min(1, dt * 16);
      if (!ptrDown) { cur.x = clamp(cur.x + cur.vx * dt, 4, W - 4); cur.y = clamp(cur.y + cur.vy * dt, 4, H - 4); }
      if (state === 'play' && held.a && !ptrDown) { if (!last) newStroke(cur.x, cur.y); pend.push({ x: cur.x, y: cur.y }); }

      if (state === 'play') {
        elapsed += dt;
        if (frenzyT > 0) {
          frenzyT -= dt; frenzySpawn -= dt;
          if (frenzySpawn <= 0) { toss('s', { side: Math.random() < 0.6 }); frenzySpawn = rnd(0.09, 0.17); }
          if (frenzyT <= 0) { spawnT = 1.2; pop(W / 2, H * 0.35, 'Frenzy over', '#fff', 18, 1); }
        } else {
          queue = queue.filter((q) => { q.t -= dt; if (q.t <= 0) { toss(q.kind); return false; } return true; });
          if (!queue.length && (spawnT -= dt) <= 0) wave();
        }
        if (comboT > 0 && (comboT -= dt) <= 0) {
          if (comboN >= 3) { const b = comboN * (comboN - 1) * 5; score += b; pop(comboX, comboY - R * 1.6, comboN + ' STICKER COMBO +' + b, GOLD, 22, 1.2); shake = Math.max(shake, 0.12); }
          bestCombo = Math.max(bestCombo, comboN); comboN = 0;
        }
      } else if ((decoT -= dt) <= 0) { toss('s', { dec: true }); decoT = rnd(0.8, 1.5); }

      // slicing along whatever path the blade took since the last step
      flush();

      const n = Math.ceil(dt / 0.017); for (let i = 0; i < n; i++) phys(dt / n);
      items = items.filter((it) => {
        if (it.cut) return false;
        const r = rad(it);
        if (it.fuse) { it.fuse -= dt * 1.5; if (it.fuse <= 0) { droplets(it.x, it.y, '#cfd6de', 10, 120); return false; } }
        const gone = (it.y > H + r * 1.6 && it.vy > 0) || it.x < -r * 3 || it.x > W + r * 3;
        if (gone && it.kind === 's' && !it.dec && !it.side && state === 'play') strike(it.x, false);
        return !gone;
      });
      halves = halves.filter((h) => h.y < H + R * 3 && h.t < 4);
      parts = parts.filter((p) => { p.t -= dt; if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += H * 1.2 * p.g * dt; p.vx *= 0.985; } return p.t > 0; });
      splats = splats.filter((s) => (s.t -= dt) > 0);
      pops = pops.filter((p) => { p.t -= dt; p.y -= 26 * k * dt; return p.t > 0; });
      slashes = slashes.filter((s) => (s.t -= dt) > 0);
      marks = marks.filter((m) => (m.t -= dt) > 0);
      for (const s of strokes) for (const p of s) p.age += dt;
      strokes = strokes.filter((s) => { const keep = s.filter((p, i) => p.age < TRAIL || (s === stroke && i === s.length - 1)); s.length = 0; s.push(...keep); return s.length || s === stroke; }); // trimmed in place: the stroke being drawn keeps growing
    }

    // ---- drawing
    function sticker(c, it, r) { // centred on the origin, already rotated
      if (it.kind === 'gold') {
        const gg = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r); gg.addColorStop(0, '#fff3b0'); gg.addColorStop(0.6, GOLD); gg.addColorStop(1, '#c98a12');
        c.fillStyle = '#fff8dc'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.fillStyle = gg; c.beginPath(); c.arc(0, 0, r * 0.86, 0, TAU); c.fill();
        if (!fit(c, env.pic('goose'), 0, 0, r * 1.25, r * 1.25)) { c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.26 : r * 0.6; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fill(); }
        return;
      }
      const [name, col, lab] = STK[it.si];
      c.fillStyle = '#fbfcfd'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(20,40,50,.12)'; c.lineWidth = Math.max(1, r * 0.04); c.beginPath(); c.arc(0, 0, r * 0.92, 0, TAU); c.stroke();
      if (!fit(c, env.pic(name), 0, 0, r * 1.32, r * 1.32)) {
        c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.fill();
        c.fillStyle = '#fff'; font(c, 800, r * (lab.length > 2 ? 0.5 : 0.7)); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lab, 0, r * 0.04); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      }
    }
    function bomb(c, it, r) {
      const live = !it.fuse, pulse = 0.5 + Math.sin(gt * 10 + it.t) * 0.5;
      if (live) { c.fillStyle = `rgba(224,88,77,${0.18 + pulse * 0.22})`; c.beginPath(); c.arc(it.x, it.y, r * 1.35, 0, TAU); c.fill(); }
      c.save(); c.translate(it.x, it.y); c.rotate(Math.sin(it.rot) * 0.4); if (it.fuse) c.globalAlpha = clamp(it.fuse, 0, 1);
      const bg = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r); bg.addColorStop(0, '#5a6474'); bg.addColorStop(1, '#14181e');
      c.fillStyle = bg; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.fillStyle = live ? RED : '#6b7480'; c.fillRect(-r * 0.97, -r * 0.14, r * 1.94, r * 0.28);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, TAU); c.fill();
      c.fillStyle = '#2a2f37'; rr(c, -r * 0.22, -r * 1.12, r * 0.44, r * 0.26, r * 0.06); c.fill();
      c.strokeStyle = '#c9a36a'; c.lineWidth = r * 0.09; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -r * 1.1); c.quadraticCurveTo(r * 0.15, -r * 1.5, r * 0.45, -r * 1.45); c.stroke(); c.lineCap = 'butt';
      if (live) {
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) { c.fillStyle = ['rgba(255,214,107,.5)', 'rgba(255,159,67,.6)', '#fff'][i]; c.beginPath(); c.arc(r * 0.47, -r * 1.47, r * (0.32 - i * 0.1) * (0.7 + pulse * 0.5), 0, TAU); c.fill(); }
        c.globalCompositeOperation = 'source-over';
      }
      c.globalAlpha = 1; c.restore();
    }
    function half(c, h) {
      const r = rad(h.it), L = r * 2.5, tx = -h.ny, ty = h.nx, ox = h.nx * h.d, oy = h.ny * h.d;
      c.save(); c.translate(h.x, h.y); c.rotate(h.rot); c.globalAlpha = clamp(3.5 - h.t, 0, 1);
      c.beginPath(); c.moveTo(ox + tx * L, oy + ty * L); c.lineTo(ox - tx * L, oy - ty * L); c.lineTo(ox - tx * L + h.nx * L, oy - ty * L + h.ny * L); c.lineTo(ox + tx * L + h.nx * L, oy + ty * L + h.ny * L); c.closePath(); c.clip();
      sticker(c, h.it, r);
      const hc = Math.sqrt(Math.max(0, r * r - h.d * h.d)) * 0.98; // the cut face
      c.strokeStyle = h.it.kind === 'gold' ? '#fff3b0' : STK[h.it.si][1]; c.lineWidth = Math.max(2, r * 0.12); c.beginPath(); c.moveTo(ox + tx * hc, oy + ty * hc); c.lineTo(ox - tx * hc, oy - ty * hc); c.stroke();
      c.globalAlpha = 1; c.restore();
    }
    function backdrop(c) {
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#11505b'); bg.addColorStop(1, '#0a2e37'); c.fillStyle = bg; c.fillRect(-30, -30, W + 60, H + 60);
      const step = 36 * k; c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; c.beginPath();
      for (let x = (W / 2) % step; x < W; x += step) { c.moveTo(x, 0); c.lineTo(x, H); } for (let y = (H / 2) % step; y < H; y += step) { c.moveTo(0, y); c.lineTo(W, y); } c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.09)'; c.beginPath(); for (let x = (W / 2) % (step * 4); x < W; x += step * 4) { c.moveTo(x, 0); c.lineTo(x, H); } c.stroke();
      const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,15,.45)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
      for (const s of splats) { c.globalAlpha = Math.min(1, s.t / 1.5) * 0.5; c.fillStyle = s.col; c.beginPath(); for (const [dx, dy, r] of s.blobs) { c.moveTo(s.x + dx + r, s.y + dy); c.arc(s.x + dx, s.y + dy, Math.max(0.5, r), 0, TAU); } c.fill(); } c.globalAlpha = 1;
    }
    function trail(c) {
      c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      for (const s of strokes) {
        for (let i = 1; i < s.length; i++) {
          const a = s[i - 1], b = s[i], f = clamp(1 - b.age / TRAIL, 0, 1) * (0.35 + 0.65 * i / s.length);
          if (f <= 0) continue;
          c.strokeStyle = `rgba(90,230,255,${0.45 * f})`; c.lineWidth = (5 + 11 * f) * k; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
          c.strokeStyle = `rgba(255,255,255,${f})`; c.lineWidth = (1.5 + 4 * f) * k; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        }
      }
      for (const s of slashes) { const a = s.t / 0.2; c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 3 * a * k + 0.5; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke(); }
      c.globalCompositeOperation = 'source-over'; c.lineCap = 'butt'; c.lineJoin = 'miter';
    }
    function cursor(c) { // the blade's tip when playing with keys
      if (!kb || state !== 'play') return;
      const on = held.a, r = (on ? 9 : 7) * k;
      c.globalCompositeOperation = 'lighter'; c.fillStyle = on ? 'rgba(90,230,255,.45)' : 'rgba(90,230,255,.18)'; c.beginPath(); c.arc(cur.x, cur.y, r * 2, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
      c.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.75)'; c.lineWidth = 2 * k; c.beginPath(); c.arc(cur.x, cur.y, r, 0, TAU); c.stroke();
      c.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(cur.x + dx * r * 1.4, cur.y + dy * r * 1.4); c.lineTo(cur.x + dx * r * 2, cur.y + dy * r * 2); } c.stroke();
      if (on) { c.fillStyle = '#fff'; c.beginPath(); c.arc(cur.x, cur.y, 2.5 * k, 0, TAU); c.fill(); }
    }
    function cross(c, x, y, z, col, lw) { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - z, y - z); c.lineTo(x + z, y + z); c.moveTo(x + z, y - z); c.lineTo(x - z, y + z); c.stroke(); c.lineCap = 'butt'; }
    function hudDraw(c) {
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillStyle = 'rgba(0,0,0,.25)'; font(c, 800, 30 * k); c.fillText(score.toLocaleString(), 15 * k, 39 * k);
      c.fillStyle = '#fff'; c.fillText(score.toLocaleString(), 14 * k, 37 * k);
      c.fillStyle = 'rgba(255,255,255,.6)'; font(c, 600, 12 * k); c.fillText('Best ' + Math.max(best, score).toLocaleString(), 15 * k, 55 * k);
      for (let i = 0; i < 3; i++) {
        const used = i < strikes, x = W - 20 * k - (2 - i) * 26 * k, y = 26 * k, bump = used && i === strikes - 1 && strikeT > 0 ? 1 + strikeT * 0.8 : 1;
        cross(c, x, y, 8 * k * bump, used ? RED : 'rgba(255,255,255,.28)', (used ? 5 : 3.5) * k);
      }
      if (frenzyT > 0) {
        const bw = Math.min(W * 0.5, 220 * k), bx = (W - bw) / 2, by = 14 * k;
        c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, bx, by, bw, 8 * k, 4 * k); c.fill(); c.fillStyle = GOLD; rr(c, bx, by, Math.max(8 * k, bw * frenzyT / 5.5), 8 * k, 4 * k); c.fill();
        c.textAlign = 'center'; font(c, 800, 13 * k); c.fillText('FRENZY', W / 2, by + 24 * k); c.textAlign = 'left';
      }
      for (const m of marks) { const a = Math.min(1, m.t * 2); c.globalAlpha = a; cross(c, m.x, H - 18 * k, 9 * k * (1 + (1.2 - m.t) * 0.4), RED, 5 * k); } c.globalAlpha = 1;
    }
    function card(c, title, sub) {
      c.fillStyle = 'rgba(4,22,28,.62)'; c.fillRect(0, 0, W, H);
      const z = Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400)); c.textAlign = 'center';
      c.fillStyle = '#fff'; font(c, 800, 40 * z); c.fillText(title, W / 2, H / 2 - 6 * z);
      c.fillStyle = 'rgba(255,255,255,.78)'; font(c, 500, 16 * z); sub.split('\n').forEach((ln, i) => c.fillText(ln, W / 2, H / 2 + 28 * z + i * 23 * z)); c.textAlign = 'left';
    }

    const g = {
      resize(w, h) {
        const sx = w / W, sy = h / H; W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3); R = clamp(Math.min(W, H) * 0.085, 22, 46);
        for (const list of [items || [], halves || []]) for (const o of list) { o.x *= sx; o.vx *= sx; o.y *= sy; o.vy *= sy; }
        cur.x = clamp(cur.x * sx, 4, W - 4); cur.y = clamp(cur.y * sy, 4, H - 4);
      },
      reset() {
        state = 'ready'; items = []; halves = []; parts = []; splats = []; pops = []; slashes = []; strokes = []; stroke = null; queue = []; marks = [];
        spawnT = 0.6; elapsed = 0; score = 0; strikes = 0; comboN = 0; comboT = 0; frenzyT = 0; frenzySpawn = 0; goldCd = 14; shake = 0; flash = 0; flashCol = '255,255,255';
        overT = 0; newBest = false; sliced = 0; bestCombo = 0; decoT = 0.3; byBomb = false; strikeT = 0; last = null; pend = [];
        cur.x = W / 2; cur.y = H * 0.6; cur.vx = cur.vy = 0;
      },
      step(dt) { tick(clamp(dt, 0, 0.05)); },
      draw(c) {
        c.save(); if (shake > 0) c.translate(rnd(-1, 1) * shake * 12 * k, rnd(-1, 1) * shake * 12 * k);
        backdrop(c);
        for (const it of items) if (it.kind !== 'bomb') { const r = rad(it); c.fillStyle = 'rgba(0,15,20,.3)'; c.beginPath(); c.arc(it.x + 3 * k, it.y + 5 * k, r, 0, TAU); c.fill(); }
        for (const it of items) {
          const r = rad(it);
          if (it.kind === 'bomb') { bomb(c, it, r); continue; }
          if (it.kind === 'gold') { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(242,182,50,${0.25 + Math.sin(gt * 8) * 0.1})`; c.beginPath(); c.arc(it.x, it.y, r * 1.5, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; }
          c.save(); c.translate(it.x, it.y); c.rotate(it.rot); sticker(c, it, r); c.restore();
        }
        for (const h of halves) half(c, h);
        for (const p of parts) {
          const a = clamp(p.t / p.max, 0, 1);
          if (p.ring) { c.strokeStyle = `rgba(255,220,150,${a})`; c.lineWidth = 4 * k * a; c.beginPath(); c.arc(p.x, p.y, p.r * (1.1 - a), 0, TAU); c.stroke(); }
          else { c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r * (0.4 + a * 0.6), 0, TAU); c.fill(); }
        } c.globalAlpha = 1;
        trail(c); cursor(c);
        if (frenzyT > 0) { const a = Math.min(1, frenzyT) * (0.35 + Math.sin(gt * 10) * 0.1), vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7); vg.addColorStop(0, 'rgba(242,182,50,0)'); vg.addColorStop(1, `rgba(242,182,50,${a})`); c.fillStyle = vg; c.fillRect(0, 0, W, H); }
        c.restore();
        if (state !== 'ready') hudDraw(c);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        for (const p of pops) { const a = Math.min(1, p.t / p.max * 3), sc = 1 + Math.max(0, p.t - p.max + 0.15) * 3; c.globalAlpha = a; font(c, 800, p.size * k * sc); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillText(p.txt, p.x + 1.5 * k, p.y + 2 * k); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y); }
        c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        if (flash > 0) { c.fillStyle = `rgba(${flashCol},${Math.min(0.8, flash * 0.8)})`; c.fillRect(0, 0, W, H); }
        if (state === 'ready') card(c, 'Sticker Slice', (env.touch ? 'Swipe through the stickers to slice them' : 'Drag the mouse to slice · or arrows + hold A') + '\nDodge the bombs · don\'t drop three\n' + startWord(env));
        if (state === 'over' && overT > 0.5) card(c, byBomb ? 'Boom!' : 'Game over', 'Score ' + score.toLocaleString() + ' · ' + sliced + ' sliced' + (bestCombo >= 3 ? ' · combo ' + bestCombo : '') + (newBest ? ' · new best!' : '') + '\n' + againWord(env));
      },
      key(k2) {
        if (k2 === 'a') {
          if (state !== 'play') { start(); if (state === 'play') { held.a = true; kb = true; } return true; }
          if (!held.a) { held.a = true; kb = true; if (!ptrDown) { newStroke(cur.x, cur.y); } } return true;
        }
        if (k2 in held) { held[k2] = true; kb = true; return true; }
        return false;
      },
      release(k2) {
        if (k2 === 'all') { for (const q in held) held[q] = false; ptrDown = false; endBlade(); }
        else if (k2 === 'ptr') { if (ptrDown) { flush(); ptrDown = false; endBlade(); } }
        else if (k2 in held) { held[k2] = false; if (k2 === 'a' && !ptrDown) { flush(); endBlade(); } }
      },
      pointer(type, x, y) {
        if (type === 'down') {
          if (state !== 'play') { start(); if (state !== 'play') return; }
          ptrDown = true; kb = false; cur.x = x; cur.y = y; newStroke(x, y); return;
        }
        if (type === 'up') { if (ptrDown) { pend.push({ x, y }); flush(); ptrDown = false; endBlade(); } return; }
        if (ptrDown && state === 'play') { cur.x = x; cur.y = y; if (!last) newStroke(x, y); else pend.push({ x, y }); }
      },
      hud: () => ['Score ' + score.toLocaleString(), state === 'play' ? 'Lives ' + (3 - strikes) + (frenzyT > 0 ? ' · FRENZY' : '') : 'Best ' + Math.max(best, score).toLocaleString()],
    };
    return g;
  }

  function ICON_slice(c, z) {
    const g = c.createLinearGradient(0, 0, 0, z); g.addColorStop(0, '#11505b'); g.addColorStop(1, '#0a2e37'); c.fillStyle = g; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.14); c.fill();
    c.fillStyle = 'rgba(255,159,67,.4)'; [[0.3, 0.72, 0.1], [0.22, 0.6, 0.05], [0.76, 0.3, 0.07], [0.7, 0.2, 0.035]].forEach(([x, y, r]) => { c.beginPath(); c.arc(z * x, z * y, z * r, 0, 7); c.fill(); });
    const r = z * 0.26, a = -0.75, sep = z * 0.07; // a sticker cut in two, halves drifting apart along the cut's normal
    for (const sd of [1, -1]) {
      c.save(); c.translate(z * 0.5 + Math.cos(a + Math.PI / 2) * sd * sep, z * 0.52 + Math.sin(a + Math.PI / 2) * sd * sep); c.rotate(a + sd * 0.12);
      c.beginPath(); c.rect(-r * 1.5, sd > 0 ? 0 : -r * 1.5, r * 3, r * 1.5); c.clip();
      c.fillStyle = '#fbfcfd'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.fillStyle = '#ff9f43'; c.beginPath(); c.arc(0, 0, r * 0.8, 0, 7); c.fill();
      c.fillStyle = '#ffd66b'; c.beginPath(); c.arc(0, 0, r * 0.5, 0, 7); c.fill();
      c.fillStyle = '#ffb347'; c.fillRect(-r, sd > 0 ? 0 : -r * 0.1, r * 2, r * 0.1);
      c.restore();
    }
    c.save(); c.translate(z * 0.5, z * 0.52); c.rotate(a); c.lineCap = 'round';
    c.strokeStyle = 'rgba(90,230,255,.45)'; c.lineWidth = z * 0.09; c.beginPath(); c.moveTo(-z * 0.42, 0); c.lineTo(z * 0.42, 0); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = z * 0.03; c.beginPath(); c.moveTo(-z * 0.42, 0); c.lineTo(z * 0.42, 0); c.stroke(); c.lineCap = 'butt'; c.restore();
  }

  /* ---------------- Sticker Swap ----------------
     A match-3 against the clock. Swap two neighbouring stickers to line up three or more of a kind. Four in a row makes a line
     clearer, an L or T makes a bomb, five in a row makes a rainbow goose; swap two specials together for a bigger blast.
     Each level reached adds time and raises the points multiplier, and long cascades add time too.
     Written from scratch for this site (board: row/column run scan with crossing runs merged into one group, column gravity
     with a little bounce); no code was taken from other projects. */
  function swap(env) {
    const N = 8, TYPES = ['github', 't_react', 't_python', 'waterloo', 'mlh', 'devpost'];
    const COL = ['#4a5466', '#27a9d0', '#f0b230', '#8466d6', '#e2574c', '#45b57c'];
    const DRK = ['#2c333f', '#18789a', '#b98414', '#5a42a3', '#a63b33', '#2e8458'];
    const TIME0 = 90, GRAV = 70, POP = 0.22;
    const WORDS = ['', '', 'Nice!', 'Great!', 'Super!', 'Honk-tastic!', 'Goose-tacular!', 'Un-be-leaf-able!'];
    const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    let W = 400, H = 300, k = 1, bs = 40, bx = 0, by = 0, pad = 6, wide = false, gt = 0;
    let state, grid, phase, popT, swA, swB, cascade, score, level, timeLeft, timeUp, endT, dying, parts, texts, fx, shake, overT, newBest;
    let sel, drag, cur, grab, kbd, idleT, hint, pending, bestCombo, tBon, tFlash, msg, msgT, msgCol;
    let best = env.load('swap');
    const held = {};
    const goal = (l) => 1200 * l + 400 * l * (l - 1); // points needed to finish level l
    const mult = () => 1 + (level - 1) * 0.25;
    const inB = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const mk = (t, c, y) => ({ t, sp: '', x: c, y, vy: 0, tw: null, born: 0, sq: 0 });
    const PX = (c) => bx + (c + 0.5) * bs, PY = (r) => by + (r + 0.5) * bs;
    const say = (t, col) => { msg = t; msgT = 1.3; msgCol = col || '#fff'; };
    const shp = (c, t, R) => { // fallback shapes for when a sticker picture isn't loaded yet
      c.beginPath();
      if (t === 0) c.arc(0, 0, R, 0, 7);
      else if (t === 1) { c.moveTo(0, -R * 1.15); c.lineTo(R * 0.9, 0); c.lineTo(0, R * 1.15); c.lineTo(-R * 0.9, 0); c.closePath(); }
      else if (t === 2) rr(c, -R * 0.85, -R * 0.85, R * 1.7, R * 1.7, R * 0.35);
      else if (t === 3) { c.moveTo(0, -R * 1.05); c.lineTo(R * 1.05, R * 0.8); c.lineTo(-R * 1.05, R * 0.8); c.closePath(); }
      else if (t === 4) { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * 0.48 : R * 1.15; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); }
      else { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(Math.cos(a) * R, Math.sin(a) * R); } c.closePath(); }
      c.fill();
    };

    // ---- board logic
    function lineAt(r, c) { // does the piece at (r, c) sit in a line of three?
      const p = grid[r][c]; if (!p || p.t < 0) return false;
      const same = (a, b) => inB(a, b) && grid[a][b] && grid[a][b].t === p.t;
      let h = 1, v = 1;
      for (let i = c - 1; same(r, i); i--) h++; for (let i = c + 1; same(r, i); i++) h++;
      for (let i = r - 1; same(i, c); i--) v++; for (let i = r + 1; same(i, c); i++) v++;
      return h >= 3 || v >= 3;
    }
    function findMove() { // a random swap that does something, or null
      const list = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc; if (!inB(r2, c2)) continue;
        const a = grid[r][c], b = grid[r2][c2]; if (!a || !b) continue;
        if (a.sp === 'rb' || b.sp === 'rb' || (a.sp && b.sp)) { list.push([r, c, r2, c2]); continue; }
        grid[r][c] = b; grid[r2][c2] = a;
        if (lineAt(r, c) || lineAt(r2, c2)) list.push([r, c, r2, c2]);
        grid[r][c] = a; grid[r2][c2] = b;
      }
      return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    }
    function findMatches() { // runs of 3+, with runs that cross (L / T shapes) merged into one group
      const runs = [];
      for (let d = 0; d < 2; d++) for (let i = 0; i < N; i++) {
        const at = d ? (q) => grid[q][i] : (q) => grid[i][q];
        let j = 0;
        while (j < N) {
          const p = at(j); let e = j + 1;
          if (p && p.t >= 0) while (e < N && at(e) && at(e).t === p.t) e++;
          if (p && p.t >= 0 && e - j >= 3) { const cells = []; for (let q = j; q < e; q++) cells.push(d ? q * N + i : i * N + q); runs.push({ h: !d, t: p.t, cells }); }
          j = e;
        }
      }
      const par = runs.map((_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i])));
      const own = {}, cross = {};
      runs.forEach((run, i) => run.cells.forEach((key) => { if (key in own) { par[find(i)] = find(own[key]); cross[key] = 1; } else own[key] = i; }));
      const groups = {};
      runs.forEach((run, i) => {
        const root = find(i), gp = groups[root] || (groups[root] = { t: run.t, cells: new Set(), h: false, v: false, len: 0, run: null, cross: -1 });
        run.cells.forEach((key) => { gp.cells.add(key); if (cross[key]) gp.cross = key; });
        if (run.h) gp.h = true; else gp.v = true;
        if (run.cells.length > gp.len) { gp.len = run.cells.length; gp.run = run; }
      });
      return Object.values(groups);
    }
    function fill() {
      for (let tries = 0; tries < 60; tries++) {
        grid = [];
        for (let r = 0; r < N; r++) {
          grid.push([]);
          for (let c = 0; c < N; c++) {
            let t; do t = Math.floor(Math.random() * 6); while ((c >= 2 && grid[r][c - 1].t === t && grid[r][c - 2].t === t) || (r >= 2 && grid[r - 1][c].t === t && grid[r - 2][c].t === t));
            grid[r].push(mk(t, c, r - N - 1 - c * 0.22));
          }
        }
        if (findMove()) return;
      }
    }
    function addTime(s) {
      if (timeUp || state !== 'play' || s <= 0) return;
      timeLeft = Math.min(99, timeLeft + s); tBon = '+' + s + 's'; tFlash = 1.1;
    }
    function addScore(pts, x, y) {
      score += pts; texts.push({ txt: pts.toLocaleString(), x, y, t: 0, life: 0.9, sz: 0.34 + Math.min(0.26, pts / 4000), col: '#fff' });
      while (score >= goal(level)) { level++; addTime(Math.max(2, 7 - level)); say('Level ' + level + '!', GOLD); env.buzz(); burstAt(3.5, 3.5, 30, ['#fff', GOLD, ACC]); }
    }
    function burstAt(x, y, n, cols) {
      for (let i = 0; i < n && parts.length < 600; i++) { const a = rnd(0, 6.283), v = rnd(2, 7); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, t: 0, life: rnd(0.5, 0.9), col: cols[i % cols.length], sz: rnd(0.05, 0.11) }); }
    }
    function zap(r, c, tgt, d, add, conv) { // the rainbow goose: every piece of one type, with a bolt to each
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const p = grid[i][j]; if (!p || p.t !== tgt || (i === r && j === c)) continue;
        if (conv && !p.sp) p.sp = conv();
        const dist = Math.hypot(i - r, j - c); add(i, j, d + 0.12 + dist * 0.03);
        fx.push({ k: 'bolt', x0: c, y0: r, x1: j, y1: i, t: -d - dist * 0.02, life: 0.4, col: COL[tgt] });
      }
    }
    function detonate(r, c, p, d, add) {
      shake = Math.min(0.5, shake + 0.12); env.buzz();
      if (p.sp === 'h' || p.sp === 'v') {
        const hz = p.sp === 'h';
        for (let i = 0; i < N; i++) add(hz ? r : i, hz ? i : c, d + Math.abs(i - (hz ? c : r)) * 0.035);
        fx.push({ k: 'beam', hz, r, c, t: -d, life: 0.42, col: COL[p.t] });
      } else if (p.sp === 'bomb') {
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) add(r + i, c + j, d + 0.07);
        fx.push({ k: 'ring', x: c, y: r, R: 1.9, t: -d, life: 0.45 });
      } else if (p.sp === 'rb') { // set off by something else: takes the most common type
        const cnt = [0, 0, 0, 0, 0, 0]; grid.forEach((row) => row.forEach((q) => { if (q && q.t >= 0) cnt[q.t]++; }));
        zap(r, c, cnt.indexOf(Math.max(...cnt)), d, add);
        fx.push({ k: 'ring', x: c, y: r, R: 1.4, t: -d, life: 0.4 });
      }
    }
    // clear a list of [r, c, delay] cells, setting off any specials they hit; then place new specials and score it all
    function blast(list, done, spawns, extra) {
      const clr = new Map(), q = [];
      const add = (r, c, d) => {
        if (!inB(r, c) || !grid[r][c]) return;
        const key = r * N + c;
        if (clr.has(key)) { if (d < clr.get(key)) clr.set(key, d); return; }
        clr.set(key, d); if (grid[r][c].sp && !done.has(key)) q.push(key);
      };
      for (const [r, c, d] of list) add(r, c, d);
      while (q.length) { const key = q.shift(); if (done.has(key)) continue; done.add(key); const r = (key / N) | 0, c = key % N; detonate(r, c, grid[r][c], clr.get(key), add); }
      let n = 0, sx = 0, sy = 0, maxD = 0;
      clr.forEach((d, key) => { const r = (key / N) | 0, c = key % N; dying.push({ p: grid[r][c], x: c, y: r, t: -d, popped: false }); grid[r][c] = null; n++; sx += c; sy += r; maxD = Math.max(maxD, d); });
      let pts = n * 20 * cascade + (extra || 0);
      for (const s of spawns) {
        const r = (s.key / N) | 0, c = s.key % N, p = mk(s.t, c, r); p.sp = s.sp; p.born = 1; grid[r][c] = p;
        pts += s.sp === 'rb' ? 500 : s.sp === 'bomb' ? 250 : 150;
        texts.push({ txt: s.sp === 'rb' ? 'Rainbow goose!' : s.sp === 'bomb' ? 'Bomb!' : 'Line clearer!', x: c, y: r - 0.5, t: 0, life: 1.1, sz: 0.3, col: GOLD });
        if (s.sp === 'rb') addTime(2); else if (s.sp === 'bomb') addTime(1);
      }
      if (n) addScore(Math.round(pts * mult() / 10) * 10, sx / n, sy / n);
      if (n >= 8) shake = Math.max(shake, 0.2);
      popT = POP + maxD; phase = 'pop';
    }
    function resolve(groups, swapped) {
      const list = [], spawns = [];
      for (const gp of groups) {
        const sp = gp.len >= 5 ? 'rb' : gp.h && gp.v ? 'bomb' : gp.len === 4 ? (gp.run.h ? 'v' : 'h') : '';
        gp.cells.forEach((key) => list.push([(key / N) | 0, key % N, 0]));
        if (sp) {
          let at = -1;
          if (swapped) for (const s of swapped) if (gp.cells.has(s)) at = s;
          if (at < 0) at = sp === 'bomb' && gp.cross >= 0 ? gp.cross : gp.run.cells[gp.run.cells.length >> 1];
          spawns.push({ key: at, t: sp === 'rb' ? -1 : gp.t, sp });
        }
      }
      blast(list, new Set(), spawns);
    }
    function comboSwap(ka, kb) { // a rainbow goose swapped with anything, or two specials swapped together
      const ra = (ka / N) | 0, ca = ka % N, rb = (kb / N) | 0, cb = kb % N, pa = grid[ra][ca], pb = grid[rb][cb];
      const done = new Set(), list = [], add = (r, c, d) => list.push([r, c, d]);
      if (pa.sp === 'rb' && pb.sp === 'rb') {
        done.add(ka); done.add(kb);
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) add(i, j, Math.hypot(i - rb, j - cb) * 0.04);
        fx.push({ k: 'ring', x: cb, y: rb, R: 9, t: 0, life: 0.7 }); say('Board wipe!', GOLD); addTime(4);
      } else if (pa.sp === 'rb' || pb.sp === 'rb') {
        const [kr, o, ko] = pa.sp === 'rb' ? [ka, pb, kb] : [kb, pa, ka], r0 = (kr / N) | 0, c0 = kr % N;
        done.add(kr); add(r0, c0, 0);
        const conv = o.sp ? (o.sp === 'bomb' ? () => 'bomb' : () => (Math.random() < 0.5 ? 'h' : 'v')) : null;
        zap(r0, c0, o.t, 0, add, conv); add((ko / N) | 0, ko % N, 0.05);
        fx.push({ k: 'ring', x: c0, y: r0, R: 1.6, t: 0, life: 0.45 });
        say(o.sp ? 'Super goose!' : 'Rainbow goose!', GOLD); addTime(o.sp ? 3 : 2);
      } else {
        done.add(ka); done.add(kb); add(ra, ca, 0); add(rb, cb, 0);
        const ln = (s) => s === 'h' || s === 'v', cross = (w) => {
          for (let o = -w; o <= w; o++) {
            for (let i = 0; i < N; i++) { add(rb + o, i, Math.abs(i - cb) * 0.035); add(i, cb + o, Math.abs(i - rb) * 0.035); }
            if (inB(rb + o, 0)) fx.push({ k: 'beam', hz: true, r: rb + o, c: cb, t: 0, life: 0.45, col: COL[pb.t] });
            if (inB(0, cb + o)) fx.push({ k: 'beam', hz: false, r: rb, c: cb + o, t: 0, life: 0.45, col: COL[pa.t] });
          }
        };
        if (ln(pa.sp) && ln(pb.sp)) cross(0);
        else if (ln(pa.sp) || ln(pb.sp)) cross(1);
        else { for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) add(rb + i, cb + j, Math.hypot(i, j) * 0.05); fx.push({ k: 'ring', x: cb, y: rb, R: 3.2, t: 0, life: 0.55 }); }
        say('Combo blast!', GOLD); addTime(2);
      }
      shake = 0.5; env.buzz();
      blast(list, done, [], 600);
    }
    function gravity() {
      for (let c = 0; c < N; c++) {
        let w = N - 1;
        for (let r = N - 1; r >= 0; r--) if (grid[r][c]) { const p = grid[r][c]; if (w !== r) { grid[w][c] = p; grid[r][c] = null; p.vy = Math.max(p.vy, 2); } w--; }
        const n = w + 1;
        for (let r = w; r >= 0; r--) { const p = mk(Math.floor(Math.random() * 6), c, r - n - 0.3); p.vy = 2; grid[r][c] = p; }
      }
    }
    function reshuffle() {
      const ps = []; grid.forEach((row) => row.forEach((p) => ps.push(p)));
      for (let tries = 0; tries < 300; tries++) {
        for (let i = ps.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ps[i], ps[j]] = [ps[j], ps[i]]; }
        for (let i = 0; i < ps.length; i++) grid[(i / N) | 0][i % N] = ps[i];
        if (!findMatches().length && findMove()) break;
        if (tries > 40) ps.forEach((p) => { if (!p.sp) p.t = Math.floor(Math.random() * 6); });
      }
      ps.forEach((p, i) => { p.x = i % N; p.y = ((i / N) | 0) - N - 1 - rnd(0, 1.2); p.vy = 0; p.tw = null; });
      say('No moves · shuffle!', '#bff3f7'); phase = 'fall'; hint = null;
    }
    function endChain() {
      if (cascade >= 3) addTime(Math.min(4, cascade - 2));
      bestCombo = Math.max(bestCombo, cascade); cascade = 0;
      if (!findMove()) { reshuffle(); return; }
      phase = 'idle'; idleT = 0; hint = null;
    }
    function doSwap(r1, c1, r2, c2) {
      const a = grid[r1][c1], b = grid[r2][c2]; grid[r1][c1] = b; grid[r2][c2] = a;
      a.vy = b.vy = 0; a.tw = { fx: c1, fy: r1, tx: c2, ty: r2, t: 0, d: 0.17 }; b.tw = { fx: c2, fy: r2, tx: c1, ty: r1, t: 0, d: 0.17 };
    }
    function trySwap(r1, c1, r2, c2) {
      if (state !== 'play' || timeUp || !inB(r1, c1) || !inB(r2, c2) || Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
      if (phase !== 'idle') { pending = [r1, c1, r2, c2]; return; }
      if (!grid[r1][c1] || !grid[r2][c2]) return;
      pending = null; hint = null; idleT = 0; sel = null;
      doSwap(r1, c1, r2, c2); swA = r1 * N + c1; swB = r2 * N + c2; phase = 'swap';
    }
    function evaluate() {
      const pa = grid[(swA / N) | 0][swA % N], pb = grid[(swB / N) | 0][swB % N];
      cascade = 1;
      if (pa.sp === 'rb' || pb.sp === 'rb' || (pa.sp && pb.sp)) { comboSwap(swA, swB); return; }
      const m = findMatches();
      if (!m.length) { doSwap((swA / N) | 0, swA % N, (swB / N) | 0, swB % N); phase = 'back'; cascade = 0; return; }
      resolve(m, [swA, swB]);
    }
    const settled = () => grid.every((row) => row.every((p) => !p || (!p.tw && p.vy === 0 && p.x === row.indexOf(p) && p.y === grid.indexOf(row))));
    function movePieces(dt) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const p = grid[r][c]; if (!p) continue;
        if (p.born > 0) p.born = Math.max(0, p.born - dt * 3);
        if (p.sq > 0) p.sq = Math.max(0, p.sq - dt * 5);
        if (p.tw) {
          const w = p.tw; w.t += dt / w.d; const e = w.t >= 1 ? 1 : w.t < 0.5 ? 2 * w.t * w.t : 1 - 2 * (1 - w.t) * (1 - w.t);
          p.x = w.fx + (w.tx - w.fx) * e; p.y = w.fy + (w.ty - w.fy) * e; if (w.t >= 1) { p.x = c; p.y = r; p.tw = null; }
          continue;
        }
        p.x = c;
        if (p.y < r || p.vy !== 0) {
          p.vy = Math.min(26, p.vy + GRAV * dt); p.y += p.vy * dt;
          if (p.y >= r) { if (p.vy > 7) { p.sq = Math.min(1, p.vy / 24); p.vy = -p.vy * 0.2; } else p.vy = 0; p.y = r; }
        } else if (p.y > r) p.y = r;
      }
    }
    function start() { if (state === 'over' && overT < 0.6) return; if (state === 'over') g.reset(); state = 'play'; say('Go!', GOLD); env.buzz(); }

    // ---- drawing
    function gooseFace(c, s) {
      c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(-s * 0.02, s * 0.12, s * 0.17, s * 0.09, 0, 0, 7); c.fill();
      c.fillStyle = '#1f2024'; rr(c, -s * 0.04, -s * 0.12, s * 0.07, s * 0.24, s * 0.035); c.fill(); c.beginPath(); c.ellipse(0, -s * 0.13, s * 0.08, s * 0.065, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-s * 0.01, -s * 0.1, s * 0.05, s * 0.025, 0.3, 0, 7); c.fill();
      c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(s * 0.07, -s * 0.15); c.lineTo(s * 0.16, -s * 0.125); c.lineTo(s * 0.07, -s * 0.1); c.closePath(); c.fill();
    }
    function piece(c, p, cx, cy, s, a) { // s: the tile's size in pixels
      if (s < 2) return;
      c.save(); c.translate(cx, cy); if (a < 1) c.globalAlpha = Math.max(0, a);
      if (p.sq > 0) { c.translate(0, s * 0.08 * p.sq); c.scale(1 + p.sq * 0.16, 1 - p.sq * 0.16); }
      const h = s / 2, R = s * 0.24, cy0 = -s * 0.03;
      if (p.sp === 'rb') {
        c.save(); rr(c, -h, -h, s, s, R); c.clip();
        for (let i = 0; i < 6; i++) { c.fillStyle = `hsl(${(gt * 140 + i * 60) % 360},85%,60%)`; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s, i * Math.PI / 3 + gt * 2, (i + 1) * Math.PI / 3 + gt * 2 + 0.03); c.closePath(); c.fill(); }
        c.restore();
        c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = s * 0.05; rr(c, -h + s * 0.03, -h + s * 0.03, s * 0.94, s * 0.94, R * 0.9); c.stroke();
      } else {
        c.fillStyle = DRK[p.t]; rr(c, -h, -h + s * 0.06, s, s * 0.94, R); c.fill();
        c.fillStyle = COL[p.t]; rr(c, -h, -h, s, s * 0.92, R); c.fill();
        c.fillStyle = 'rgba(255,255,255,.2)'; rr(c, -h + s * 0.1, -h + s * 0.06, s * 0.8, s * 0.24, s * 0.12); c.fill();
      }
      if (p.sp === 'h' || p.sp === 'v') {
        c.save(); if (p.sp === 'v') c.rotate(Math.PI / 2);
        c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-h + s * 0.06, cy0 - s * 0.07, s * 0.88, s * 0.14);
        c.fillStyle = '#fff'; const w = Math.abs(Math.sin(gt * 6)) * s * 0.035;
        for (const d of [-1, 1]) { const x0 = d * (s * 0.35 + w); c.beginPath(); c.moveTo(x0 + d * s * 0.12, cy0); c.lineTo(x0 - d * s * 0.02, cy0 - s * 0.13); c.lineTo(x0 - d * s * 0.02, cy0 + s * 0.13); c.closePath(); c.fill(); }
        c.restore();
      }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, cy0, s * 0.31, 0, 7); c.fill();
      if (p.sp === 'rb') { if (!fit(c, env.pic('goose'), 0, cy0, s * 0.46, s * 0.46)) { c.save(); c.translate(0, cy0); gooseFace(c, s); c.restore(); } }
      else if (!fit(c, env.pic(TYPES[p.t]), 0, cy0, s * 0.42, s * 0.42)) { c.fillStyle = COL[p.t]; c.save(); c.translate(0, cy0); shp(c, p.t, s * 0.15); c.restore(); }
      if (p.sp === 'bomb') {
        const q = 0.5 + 0.5 * Math.sin(gt * 8);
        c.strokeStyle = '#2a2d33'; c.lineWidth = s * 0.055; c.beginPath(); c.arc(0, cy0, s * 0.31, 0, 7); c.stroke();
        c.strokeStyle = `rgba(255,214,107,${0.55 + q * 0.45})`; c.lineWidth = s * (0.05 + q * 0.035); rr(c, -h + s * 0.03, -h + s * 0.03, s * 0.94, s * 0.86, R); c.stroke();
        c.fillStyle = q > 0.5 ? '#fff' : GOLD; c.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + gt * 3, rad = i % 2 ? s * 0.035 : s * 0.09; c.lineTo(h * 0.7 + Math.cos(an) * rad, -h * 0.7 + Math.sin(an) * rad); } c.closePath(); c.fill();
      }
      if (p.born > 0) { c.globalAlpha = p.born * 0.75 * Math.min(1, a); c.fillStyle = '#fff'; rr(c, -h, -h, s, s, R); c.fill(); }
      c.restore();
    }
    function boardDraw(c) {
      const S = bs * N, play = state === 'play';
      c.fillStyle = 'rgba(14,60,70,.22)'; rr(c, bx - pad, by - pad + pad * 0.7, S + pad * 2, S + pad * 2, pad * 1.6); c.fill();
      c.fillStyle = '#0f5b66'; rr(c, bx - pad, by - pad, S + pad * 2, S + pad * 2, pad * 1.6); c.fill();
      if (play && timeLeft < 10 && !timeUp) { c.strokeStyle = `rgba(224,88,77,${0.45 + 0.4 * Math.sin(gt * 9)})`; c.lineWidth = pad * 0.7; c.stroke(); }
      for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) { c.fillStyle = (r + q) % 2 ? '#166e7a' : '#13646f'; rr(c, bx + q * bs + 1, by + r * bs + 1, bs - 2, bs - 2, bs * 0.16); c.fill(); }
      const showHint = play && hint && phase === 'idle' && idleT > 5;
      if (sel && play) { c.fillStyle = `rgba(255,255,255,${0.3 + 0.12 * Math.sin(gt * 6)})`; rr(c, bx + sel[1] * bs + 1, by + sel[0] * bs + 1, bs - 2, bs - 2, bs * 0.16); c.fill(); }
      if (showHint) { const a = 0.3 + 0.3 * Math.max(0, Math.sin(gt * 5)); c.fillStyle = `rgba(255,236,160,${a})`; for (const [r, q] of [[hint[0], hint[1]], [hint[2], hint[3]]]) { rr(c, bx + q * bs + 1, by + r * bs + 1, bs - 2, bs - 2, bs * 0.16); c.fill(); } }
      c.save(); c.beginPath(); c.rect(bx, by, S, S); c.clip();
      const ts = bs * 0.9;
      for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
        const p = grid[r][q]; if (!p) continue;
        let x = p.x, y = p.y, sc = 1 + p.born * 0.35;
        if (sel && play && sel[0] === r && sel[1] === q) { sc *= 1.08; y -= 0.04 + 0.03 * Math.sin(gt * 8); }
        if (showHint) { const wig = 0.08 * Math.max(0, Math.sin(gt * 9)); if (hint[0] === r && hint[1] === q) { x += (hint[3] - hint[1]) * wig; y += (hint[2] - hint[0]) * wig; } else if (hint[2] === r && hint[3] === q) { x += (hint[1] - hint[3]) * wig; y += (hint[0] - hint[2]) * wig; } }
        piece(c, p, PX(x), PY(y), ts * sc, 1);
      }
      for (const d of dying) { if (d.t < 0) piece(c, d.p, PX(d.x), PY(d.y), ts, 1); else { const u = d.t / POP; piece(c, d.p, PX(d.x), PY(d.y), ts * (1 + u * 0.45), 1 - u); } }
      c.globalCompositeOperation = 'lighter';
      for (const f of fx) {
        if (f.t < 0) continue; const u = f.t / f.life, a = 1 - u;
        if (f.k === 'beam') {
          const w = bs * (0.9 - u * 0.6);
          c.fillStyle = f.col; c.globalAlpha = a * 0.6; if (f.hz) c.fillRect(bx, PY(f.r) - w / 2, S, w); else c.fillRect(PX(f.c) - w / 2, by, w, S);
          c.fillStyle = '#fff'; c.globalAlpha = a; if (f.hz) c.fillRect(bx, PY(f.r) - w * 0.18, S, w * 0.36); else c.fillRect(PX(f.c) - w * 0.18, by, w * 0.36, S);
        } else if (f.k === 'ring') {
          c.globalAlpha = a; c.strokeStyle = '#ffe9a8'; c.lineWidth = bs * 0.3 * a + 1; c.beginPath(); c.arc(PX(f.x), PY(f.y), f.R * bs * (0.25 + u), 0, 7); c.stroke();
          if (u < 0.3) { c.globalAlpha = (0.3 - u) * 2; c.fillStyle = '#fff'; c.beginPath(); c.arc(PX(f.x), PY(f.y), f.R * bs * 0.6, 0, 7); c.fill(); }
        } else if (f.k === 'bolt') {
          const x0 = PX(f.x0), y0 = PY(f.y0), x1 = PX(f.x1), y1 = PY(f.y1), nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
          c.beginPath(); c.moveTo(x0, y0); for (let i = 1; i < 6; i++) { const o = rnd(-0.16, 0.16) * bs; c.lineTo(x0 + (x1 - x0) * i / 6 + nx / L * o, y0 + (y1 - y0) * i / 6 + ny / L * o); } c.lineTo(x1, y1);
          c.globalAlpha = a * 0.7; c.strokeStyle = f.col; c.lineWidth = bs * 0.14; c.stroke(); c.globalAlpha = a; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, bs * 0.04); c.stroke();
        }
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.restore();
      if (kbd && play && cur) { // the keyboard cursor
        const x = bx + cur[1] * bs, y = by + cur[0] * bs, gl = grab ? 0.75 + 0.25 * Math.sin(gt * 10) : 1;
        c.strokeStyle = grab ? `rgba(242,182,50,${gl})` : '#fff'; c.lineWidth = Math.max(2, bs * 0.07); rr(c, x + 1, y + 1, bs - 2, bs - 2, bs * 0.18); c.stroke();
        if (grab) { c.fillStyle = GOLD; for (const [dr, dc] of Object.values(DIRS)) { if (!inB(cur[0] + dr, cur[1] + dc)) continue; const ax = x + bs / 2 + dc * bs * 0.62, ay = y + bs / 2 + dr * bs * 0.62, z = bs * 0.13; c.beginPath(); c.moveTo(ax + dc * z, ay + dr * z); c.lineTo(ax - dc * z * 0.4 + dr * z, ay - dr * z * 0.4 + dc * z); c.lineTo(ax - dc * z * 0.4 - dr * z, ay - dr * z * 0.4 - dc * z); c.closePath(); c.fill(); } }
      }
      for (const p of parts) { c.globalAlpha = Math.max(0, 1 - p.t / p.life); c.fillStyle = p.col; const z = p.sz * bs; c.fillRect(PX(p.x) - z / 2, PY(p.y) - z / 2, z, z); }
      c.globalAlpha = 1;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      for (const tx of texts) {
        const u = tx.t / tx.life, pop = Math.min(1, tx.t * 10); c.globalAlpha = Math.min(1, (1 - u) * 3);
        font(c, 800, bs * tx.sz * (0.7 + 0.3 * pop)); c.strokeStyle = 'rgba(8,46,56,.85)'; c.lineWidth = bs * 0.08; c.strokeText(tx.txt, PX(tx.x), PY(tx.y)); c.fillStyle = tx.col; c.fillText(tx.txt, PX(tx.x), PY(tx.y));
      }
      if (msgT > 0) {
        const e = Math.min(1, (1.3 - msgT) * 7), z = Math.min(bs * 0.75, S / Math.max(6, msg.length) * 1.5);
        c.globalAlpha = Math.min(1, msgT * 3); font(c, 900, z * (0.6 + 0.4 * e) + (1 - e) * z * 0.3);
        c.strokeStyle = 'rgba(8,46,56,.9)'; c.lineWidth = z * 0.16; c.strokeText(msg, bx + S / 2, by + S * 0.42); c.fillStyle = msgCol; c.fillText(msg, bx + S / 2, by + S * 0.42);
      }
      c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    }
    function bar(c, x, y, w, h, f, col) { c.fillStyle = 'rgba(14,79,90,.14)'; rr(c, x, y, w, h, h / 2); c.fill(); if (f > 0) { c.fillStyle = col; rr(c, x, y, Math.max(h, w * clamp(f, 0, 1)), h, h / 2); c.fill(); } }
    function panels(c) {
      const S = bs * N, low = timeLeft < 10 && !timeUp && state === 'play', tCol = low ? RED : DEEP;
      const lvF = (score - goal(level - 1)) / (goal(level) - goal(level - 1)), secs = Math.ceil(timeLeft);
      const label = (t, x, y, al) => { c.textAlign = al; c.fillStyle = MUTE; font(c, 700, 11 * k); c.fillText(t, x, y); };
      const value = (t, x, y, al, px, col) => { c.textAlign = al; c.fillStyle = col || INK; font(c, 800, px * k); c.fillText(t, x, y); };
      const bonus = (x, y, al) => { if (tFlash > 0) { c.globalAlpha = Math.min(1, tFlash * 2); c.textAlign = al; c.fillStyle = '#2f9e64'; font(c, 800, 16 * k); c.fillText(tBon, x, y - (1.1 - tFlash) * 16 * k); c.globalAlpha = 1; } };
      if (wide) {
        const lw = bx - pad, cl = lw / 2, rx0 = bx + S + pad, cr = rx0 + (W - rx0) / 2, pw = Math.min(150 * k, lw * 0.78);
        let y = by + 18 * k;
        label('SCORE', cl, y, 'center'); value(score.toLocaleString(), cl, y + 30 * k, 'center', 28);
        y += 66 * k; label('BEST', cl, y, 'center'); value(Math.max(best, score).toLocaleString(), cl, y + 24 * k, 'center', 20, DEEP);
        y += 60 * k; label('LEVEL', cl, y, 'center'); value(String(level), cl, y + 30 * k, 'center', 28, DEEP);
        bar(c, cl - pw / 2, y + 42 * k, pw, 9 * k, lvF, ACC);
        c.fillStyle = MUTE; font(c, 600, 11 * k); c.fillText('next level at ' + goal(level).toLocaleString(), cl, y + 68 * k);
        c.fillText('points x' + mult(), cl, y + 84 * k);
        const R = Math.min(52 * k, (W - rx0) * 0.3), ty = by + 18 * k + R + 16 * k;
        label('TIME', cr, by + 18 * k, 'center');
        c.lineWidth = 9 * k; c.strokeStyle = 'rgba(14,79,90,.14)'; c.beginPath(); c.arc(cr, ty, R, 0, 7); c.stroke();
        c.strokeStyle = tCol; c.lineCap = 'round'; c.beginPath(); c.arc(cr, ty, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(timeLeft / TIME0, 0.0001, 1)); c.stroke(); c.lineCap = 'butt';
        c.textBaseline = 'middle'; value(String(secs), cr, ty + 1, 'center', 34 * (low ? 1 + 0.08 * Math.max(0, Math.sin(gt * 9)) : 1), tCol); c.textBaseline = 'alphabetic';
        bonus(cr + R * 0.95, ty - R * 0.7, 'left');
        let y2 = ty + R + 32 * k; label('BEST COMBO', cr, y2, 'center'); value('x' + Math.max(1, bestCombo), cr, y2 + 26 * k, 'center', 22);
        c.fillStyle = MUTE; font(c, 500, 11 * k); c.textAlign = 'center';
        (env.touch ? ['Swipe a sticker to swap it', 'Specials: 4 in a row, L / T, 5'] : ['Drag or click neighbours', 'Arrows move · A grabs · swap']).forEach((l, i) => c.fillText(l, cr, H - 30 * k + i * 15 * k));
      } else {
        const y0 = by + S + pad + 8 * k, x0 = bx, x1 = bx + S;
        label('SCORE', x0, y0 + 10 * k, 'left'); value(score.toLocaleString(), x0, y0 + 36 * k, 'left', 26);
        label('TIME', x1, y0 + 10 * k, 'right'); value(String(secs), x1, y0 + 36 * k, 'right', 26, tCol);
        bonus(x1 - 44 * k, y0 + 34 * k, 'right');
        bar(c, x0, y0 + 46 * k, S, 8 * k, timeLeft / TIME0, tCol);
        label('LEVEL ' + level + '  ·  POINTS x' + mult(), x0, y0 + 72 * k, 'left');
        label('NEXT ' + goal(level).toLocaleString(), x1, y0 + 72 * k, 'right');
        bar(c, x0, y0 + 79 * k, S, 6 * k, lvF, ACC);
        if (y0 + 106 * k < H) { label('BEST ' + Math.max(best, score).toLocaleString(), x0, y0 + 104 * k, 'left'); label('BEST COMBO x' + Math.max(1, bestCombo), x1, y0 + 104 * k, 'right'); }
        if (y0 + 126 * k < H - 2) { c.fillStyle = MUTE; font(c, 500, 11 * k); c.textAlign = 'center'; c.fillText(env.touch ? 'Swipe a sticker into a neighbour to swap' : 'Drag or click two neighbours · keys: A grabs', bx + S / 2, y0 + 126 * k); }
      }
      c.textAlign = 'left';
    }
    function card(c, title, sub) {
      c.fillStyle = 'rgba(6,40,48,.74)'; c.fillRect(0, 0, W, H);
      const z = Math.min(1.25, Math.max(0.75, Math.min(W, H) / 400)); c.textAlign = 'center';
      c.fillStyle = '#fff'; font(c, 800, 40 * z); c.fillText(title, W / 2, H / 2 - 18 * z);
      c.fillStyle = 'rgba(255,255,255,.8)'; font(c, 500, 16 * z); sub.split('\n').forEach((ln, i) => c.fillText(ln, W / 2, H / 2 + 16 * z + i * 23 * z)); c.textAlign = 'left';
    }

    const g = {
      resize(w, h) {
        W = w; H = h; k = clamp(Math.min(W, H) / 400, 0.7, 1.3); wide = W > H * 1.15;
        if (wide) { const m = 14 * k; bs = Math.min((H - 2 * m) / N, (W - 2 * Math.min(190 * k, W * 0.25)) / N); by = (H - bs * N) / 2; }
        else { const m = 10; bs = Math.min((W - 2 * m) / N, H * 0.66 / N); by = m + 2; }
        bx = (W - bs * N) / 2; pad = Math.max(4, bs * 0.14);
      },
      reset() {
        state = 'ready'; phase = 'fall'; dying = []; parts = []; texts = []; fx = []; shake = 0; overT = 0; newBest = false;
        score = 0; level = 1; timeLeft = TIME0; timeUp = false; endT = 0; cascade = 0; bestCombo = 0; tBon = ''; tFlash = 0; msg = ''; msgT = 0; msgCol = '#fff';
        sel = null; drag = null; cur = [3, 3]; grab = false; kbd = false; idleT = 0; hint = null; pending = null; popT = 0;
        fill();
      },
      step(dt) {
        dt = Math.min(Math.max(dt, 0), 0.05); gt += dt;
        if (shake > 0) shake = Math.max(0, shake - dt); if (msgT > 0) msgT -= dt; if (tFlash > 0) tFlash -= dt; if (state === 'over') overT += dt;
        const n = dt > 0.025 ? 2 : 1; for (let i = 0; i < n; i++) movePieces(dt / n);
        dying = dying.filter((d) => {
          d.t += dt;
          if (d.t >= 0 && !d.popped) { d.popped = true; const col = d.p.t >= 0 ? COL[d.p.t] : `hsl(${rnd(0, 360)},85%,60%)`; burstAt(d.x, d.y, 6, [col, col, '#fff']); }
          return d.t < POP;
        });
        parts = parts.filter((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 14 * dt; p.vx *= 0.98; return p.t < p.life; });
        texts = texts.filter((tx) => { tx.t += dt; tx.y -= 0.9 * dt; return tx.t < tx.life; });
        fx = fx.filter((f) => (f.t += dt) < f.life);
        if (state !== 'play') return;
        if (!timeUp) { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; timeUp = true; pending = null; sel = null; grab = false; say("Time's up!", '#ffb3aa'); env.buzz(); } }
        if (phase === 'swap') { const a = grid[(swA / N) | 0][swA % N], b = grid[(swB / N) | 0][swB % N]; if (!a.tw && !b.tw) evaluate(); }
        else if (phase === 'back') { if (settled()) phase = 'idle'; }
        else if (phase === 'pop') { popT -= dt; if (popT <= 0) { gravity(); phase = 'fall'; } }
        else if (phase === 'fall') {
          if (settled()) {
            const m = findMatches();
            if (m.length) { cascade++; if (cascade >= 2) { say(WORDS[Math.min(cascade, WORDS.length - 1)] + '  x' + cascade, cascade >= 4 ? GOLD : '#fff'); env.buzz(); } resolve(m, null); }
            else endChain();
          }
        }
        if (phase === 'idle') {
          if (timeUp) { endT += dt; if (endT > 1) { state = 'over'; overT = 0; newBest = score > best; if (newBest) { best = score; env.save('swap', best); } } }
          else if (pending) { const pq = pending; pending = null; trySwap(pq[0], pq[1], pq[2], pq[3]); }
          else { idleT += dt; if (idleT > 5 && !hint) hint = findMove(); }
        }
      },
      draw(c) {
        const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#e4f5f4'); bg.addColorStop(1, '#c9e7e8'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(26,163,179,.07)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(((i * 0.37 + 0.1) % 1) * W, ((i * 0.61 + 0.2) % 1) * H + Math.sin(gt * 0.4 + i) * 8, (30 + (i % 3) * 26) * k, 0, 7); c.fill(); }
        c.save(); if (shake > 0) c.translate(rnd(-1, 1) * shake * 9 * k, rnd(-1, 1) * shake * 9 * k);
        boardDraw(c); c.restore();
        panels(c);
        if (state === 'ready') card(c, 'Sticker Swap', 'Swap neighbours to line up 3 or more\n' + (env.touch ? 'Swipe a sticker, or tap two in turn' : 'Drag, or arrows + A to grab and swap') + '\n90 seconds · big combos add time\n' + startWord(env));
        if (state === 'over') card(c, "Time's up!", 'Score ' + score.toLocaleString() + (newBest ? ' · new best!' : '') + '\nLevel ' + level + ' · best combo x' + Math.max(1, bestCombo) + '\n' + againWord(env));
      },
      key(k2) {
        if (k2 !== 'a' && !(k2 in DIRS)) return false;
        const rep = held[k2]; held[k2] = true;
        if (state !== 'play') { if (k2 === 'a' && !rep) start(); return true; }
        idleT = 0; sel = null;
        if (k2 === 'a') { if (!rep && !timeUp) { kbd = true; grab = !grab; } return true; }
        const d = DIRS[k2];
        if (!kbd) { kbd = true; return true; } // the first press just shows the cursor
        if (grab) { if (!rep) { trySwap(cur[0], cur[1], cur[0] + d[0], cur[1] + d[1]); grab = false; } return true; }
        cur = [clamp(cur[0] + d[0], 0, N - 1), clamp(cur[1] + d[1], 0, N - 1)];
        return true;
      },
      release(k2) {
        if (k2 === 'all') { for (const q in held) held[q] = false; drag = null; }
        else if (k2 === 'ptr') drag = null;
        else held[k2] = false;
      },
      pointer(type, x, y) {
        if (type === 'down') {
          if (state !== 'play') { start(); return; }
          kbd = false; grab = false; idleT = 0;
          const q = Math.floor((x - bx) / bs), r = Math.floor((y - by) / bs);
          if (!inB(r, q)) { sel = null; drag = null; return; }
          cur = [r, q];
          if (sel && Math.abs(sel[0] - r) + Math.abs(sel[1] - q) === 1) { trySwap(sel[0], sel[1], r, q); sel = null; drag = null; return; }
          sel = sel && sel[0] === r && sel[1] === q ? null : [r, q];
          drag = { r, c: q, x, y };
          return;
        }
        if (type === 'up') { drag = null; return; }
        if (type === 'move' && drag && state === 'play') {
          const dx = (x - drag.x) / bs, dy = (y - drag.y) / bs;
          if (Math.max(Math.abs(dx), Math.abs(dy)) > 0.4) {
            const hz = Math.abs(dx) > Math.abs(dy);
            trySwap(drag.r, drag.c, drag.r + (hz ? 0 : Math.sign(dy)), drag.c + (hz ? Math.sign(dx) : 0)); sel = null; drag = null;
          }
        }
      },
      hud: () => ['Score ' + score.toLocaleString(), state === 'play' ? 'Time ' + Math.ceil(timeLeft) + 's · Lv ' + level : 'Best ' + Math.max(best, score).toLocaleString()],
    };
    return g;
  }

  function ICON_swap(c, z) {
    const bg = c.createLinearGradient(0, 0, 0, z); bg.addColorStop(0, '#1aa3b3'); bg.addColorStop(1, '#0c6571'); c.fillStyle = bg; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.18); c.fill();
    const tiles = [[0.15, 0.15, '#e2574c', '#a63b33', 0], [0.52, 0.15, '#f0b230', '#b98414', 4], [0.15, 0.52, '#8466d6', '#5a42a3', 1], [0.52, 0.52, '#45b57c', '#2e8458', 3]];
    for (const [x, y, col, dk, t] of tiles) {
      const s = z * 0.33, cx = z * x + s / 2, cy = z * y + s / 2, R = s * 0.3;
      c.fillStyle = dk; rr(c, z * x, z * y + s * 0.07, s, s * 0.93, s * 0.24); c.fill();
      c.fillStyle = col; rr(c, z * x, z * y, s, s * 0.9, s * 0.24); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy - s * 0.04, R, 0, 7); c.fill();
      c.fillStyle = col; c.save(); c.translate(cx, cy - s * 0.04); c.beginPath(); const r = R * 0.55;
      if (t === 0) c.arc(0, 0, r, 0, 7);
      else if (t === 1) { c.moveTo(0, -r * 1.2); c.lineTo(r * 0.9, 0); c.lineTo(0, r * 1.2); c.lineTo(-r * 0.9, 0); }
      else if (t === 3) { c.moveTo(0, -r * 1.1); c.lineTo(r * 1.1, r * 0.8); c.lineTo(-r * 1.1, r * 0.8); }
      else for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.5 : r * 1.2; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      c.closePath(); c.fill(); c.restore();
    }
    const cx = z / 2, cy = z / 2, R = z * 0.15; // a swap symbol in the middle
    c.fillStyle = 'rgba(8,46,56,.8)'; c.beginPath(); c.arc(cx, cy, R * 1.45, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = z * 0.045; c.lineCap = 'round';
    for (const a0 of [Math.PI * 1.1, Math.PI * 0.1]) {
      c.beginPath(); c.arc(cx, cy, R, a0, a0 + Math.PI * 0.65); c.stroke();
      const a = a0 + Math.PI * 0.65, ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R, tx = -Math.sin(a), ty = Math.cos(a), h = z * 0.07;
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ex + tx * h, ey + ty * h); c.lineTo(ex - tx * h * 0.2 + Math.cos(a) * h * 0.8, ey - ty * h * 0.2 + Math.sin(a) * h * 0.8); c.lineTo(ex - tx * h * 0.2 - Math.cos(a) * h * 0.8, ey - ty * h * 0.2 - Math.sin(a) * h * 0.8); c.closePath(); c.fill();
    }
    c.lineCap = 'butt';
  }

  // the menu's icons, drawn so they work at any size
  const ICON = {
    arena: (c, z, env) => ICON_arena(c, z, env),
    pegs: (c, z, env) => ICON_pegs(c, z, env),
    defense: (c, z, env) => ICON_defense(c, z, env),
    quest: (c, z, env) => ICON_quest(c, z, env),
    slice: (c, z, env) => ICON_slice(c, z, env),
    swap: (c, z, env) => ICON_swap(c, z, env),
    pinball(c, z) { const g = c.createLinearGradient(0, 0, 0, z); g.addColorStop(0, '#12566d'); g.addColorStop(1, '#082a37'); c.fillStyle = g; rr(c, z * 0.14, z * 0.06, z * 0.72, z * 0.88, z * 0.3); c.fill();
      [[0.38, 0.32, GOLD], [0.62, 0.3, GOLD], [0.5, 0.48, GOLD]].forEach(([x, y, col]) => { c.fillStyle = '#e8edf1'; c.beginPath(); c.arc(z * x, z * y, z * 0.075, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(z * x, z * y, z * 0.05, 0, 7); c.fill(); });
      c.lineCap = 'round'; c.strokeStyle = '#f4f6f8'; c.lineWidth = z * 0.05; c.beginPath(); c.moveTo(z * 0.3, z * 0.76); c.lineTo(z * 0.45, z * 0.84); c.moveTo(z * 0.7, z * 0.76); c.lineTo(z * 0.55, z * 0.84); c.stroke();
      const bg = c.createRadialGradient(z * 0.54, z * 0.62, 1, z * 0.56, z * 0.64, z * 0.05); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#6b7885'); c.fillStyle = bg; c.beginPath(); c.arc(z * 0.56, z * 0.64, z * 0.045, 0, 7); c.fill(); },
    tunnel(c, z) { c.fillStyle = '#05060c'; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.12); c.fill();
      for (let j = 0; j < 5; j++) { const r = z * (0.4 - j * 0.075), a = 0.9 - j * 0.16; c.strokeStyle = `hsla(${190 + j * 20},90%,60%,${a})`; c.lineWidth = z * 0.018; c.beginPath(); for (let i = 0; i <= 12; i++) { const t = i * Math.PI / 6; c.lineTo(z / 2 + Math.cos(t) * r, z * 0.47 + Math.sin(t) * r); } c.stroke(); }
      c.fillStyle = '#ff5fa2'; c.beginPath(); for (let i = 0; i <= 3; i++) { const t = -0.3 + i * Math.PI / 6 * 0.9; c.lineTo(z / 2 + Math.cos(t) * z * 0.4, z * 0.47 + Math.sin(t) * z * 0.4); } for (let i = 3; i >= 0; i--) { const t = -0.3 + i * Math.PI / 6 * 0.9; c.lineTo(z / 2 + Math.cos(t) * z * 0.28, z * 0.47 + Math.sin(t) * z * 0.28); } c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(z / 2, z * 0.74); c.lineTo(z * 0.58, z * 0.86); c.lineTo(z * 0.42, z * 0.86); c.closePath(); c.fill(); },
    golf(c, z) { c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, z * 0.1, z * 0.24, z * 0.82, z * 0.6, z * 0.08); c.fill(); c.fillStyle = '#6cbd6e'; rr(c, z * 0.08, z * 0.2, z * 0.82, z * 0.6, z * 0.08); c.fill(); c.lineWidth = z * 0.035; c.strokeStyle = '#f7f1e2'; c.stroke();
      c.fillStyle = '#1d3a24'; c.beginPath(); c.arc(z * 0.68, z * 0.58, z * 0.045, 0, 7); c.fill(); c.strokeStyle = '#4a4f59'; c.lineWidth = z * 0.02; c.beginPath(); c.moveTo(z * 0.68, z * 0.58); c.lineTo(z * 0.68, z * 0.24); c.stroke();
      c.fillStyle = ACC; c.beginPath(); c.moveTo(z * 0.68, z * 0.24); c.lineTo(z * 0.86, z * 0.29); c.lineTo(z * 0.68, z * 0.35); c.closePath(); c.fill();
      for (let i = 1; i <= 4; i++) { c.fillStyle = `rgba(255,255,255,${1 - i * 0.2})`; c.beginPath(); c.arc(z * (0.27 + i * 0.07), z * (0.62 - i * 0.008), z * 0.012, 0, 7); c.fill(); }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(z * 0.26, z * 0.62, z * 0.045, 0, 7); c.fill(); },
    sky(c, z) { const g = c.createLinearGradient(0, 0, 0, z); g.addColorStop(0, '#0f2c42'); g.addColorStop(1, '#1d6a80'); c.fillStyle = g; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.12); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; [[0.2, 0.2], [0.75, 0.3], [0.3, 0.7], [0.8, 0.75], [0.55, 0.15]].forEach(([x, y]) => c.fillRect(z * x, z * y, z * 0.015, z * 0.015));
      c.fillStyle = '#e8fbff'; for (const x of [0.46, 0.54]) { rr(c, z * (x - 0.01), z * 0.3, z * 0.02, z * 0.08, z * 0.01); c.fill(); }
      c.fillStyle = '#d4d8de'; c.beginPath(); c.arc(z * 0.5, z * 0.2, z * 0.06, 0, 7); c.fill(); c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(z * 0.5, z * 0.205, z * 0.022, 0, 7); c.fill();
      c.save(); c.translate(z * 0.5, z * 0.64); c.fillStyle = '#6e604f'; c.beginPath(); c.moveTo(0, z * 0.02); c.quadraticCurveTo(-z * 0.14, -z * 0.06, -z * 0.24, 0); c.lineTo(-z * 0.2, z * 0.04); c.lineTo(0, z * 0.06); c.lineTo(z * 0.2, z * 0.04); c.lineTo(z * 0.24, 0); c.quadraticCurveTo(z * 0.14, -z * 0.06, 0, z * 0.02); c.fill();
      c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(0, z * 0.03, z * 0.06, z * 0.11, 0, 0, 7); c.fill(); c.fillStyle = '#1f2024'; rr(c, -z * 0.018, -z * 0.15, z * 0.036, z * 0.12, z * 0.018); c.fill(); c.beginPath(); c.ellipse(0, -z * 0.16, z * 0.032, z * 0.04, 0, 0, 7); c.fill(); c.fillStyle = ACC; c.fillRect(-z * 0.03, -z * 0.19, z * 0.06, z * 0.018); c.restore(); },
    run(c, z) { const g = c.createLinearGradient(0, 0, 0, z); g.addColorStop(0, '#9fd6e8'); g.addColorStop(1, '#eef7f5'); c.fillStyle = g; rr(c, z * 0.08, z * 0.08, z * 0.84, z * 0.84, z * 0.12); c.fill();
      c.fillStyle = '#c99a6a'; rr(c, z * 0.08, z * 0.66, z * 0.4, z * 0.26, z * 0.04); c.fill(); rr(c, z * 0.6, z * 0.56, z * 0.32, z * 0.36, z * 0.04); c.fill();
      c.fillStyle = '#6cb565'; rr(c, z * 0.08, z * 0.64, z * 0.4, z * 0.05, z * 0.025); c.fill(); rr(c, z * 0.6, z * 0.54, z * 0.32, z * 0.05, z * 0.025); c.fill();
      [[0.5, 0.36], [0.58, 0.3], [0.66, 0.34]].forEach(([x, y]) => { c.fillStyle = GOLD; c.beginPath(); c.arc(z * x, z * y, z * 0.03, 0, 7); c.fill(); });
      c.save(); c.translate(z * 0.3, z * 0.62); const u = z / 60; c.scale(u, u); c.rotate(-0.15);
      c.fillStyle = '#8b7a66'; c.beginPath(); c.ellipse(0, -13, 9, 6, -0.1, 0, 7); c.fill(); c.fillStyle = '#6e604f'; c.beginPath(); c.ellipse(-3, -14, 7, 3.4, -0.5, 0, 7); c.fill();
      c.strokeStyle = '#1f2024'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(5, -16); c.quadraticCurveTo(8, -22, 7, -27); c.stroke(); c.fillStyle = '#1f2024'; c.beginPath(); c.ellipse(8.5, -28, 3.6, 2.8, 0.2, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(7.2, -26.4, 1.8, 1.1, 0.3, 0, 7); c.fill(); c.fillStyle = '#2a2d33'; c.beginPath(); c.moveTo(11, -29); c.lineTo(15, -27.6); c.lineTo(11, -26.4); c.closePath(); c.fill();
      c.strokeStyle = '#2a2d33'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -8); c.lineTo(3, -2); c.moveTo(-2, -8); c.lineTo(-5, -3); c.stroke(); c.restore(); },
    kart(c, z) { c.fillStyle = '#86c77c'; rr(c, z * 0.06, z * 0.5, z * 0.88, z * 0.42, z * 0.08); c.fill(); c.fillStyle = '#73777f'; c.beginPath(); c.moveTo(z * 0.42, z * 0.5); c.lineTo(z * 0.58, z * 0.5); c.lineTo(z * 0.86, z * 0.92); c.lineTo(z * 0.14, z * 0.92); c.closePath(); c.fill(); c.fillStyle = '#79c3dc'; rr(c, z * 0.06, z * 0.12, z * 0.88, z * 0.4, z * 0.08); c.fill(); c.fillStyle = '#a8d5c5'; c.fillRect(z * 0.06, z * 0.44, z * 0.88, z * 0.07); c.save(); c.translate(z * 0.18, z * 0.3); c.scale(z * 0.008, z * 0.008); drawKart(c, KART_COLS[0]); c.restore(); },
  };

  window.GAMES = [
    { id: 'kart', name: 'Goose Kart', blurb: 'Three laps against five other geese.', how: ['Left / right steers, down brakes', 'Drive through ? boxes, A uses the item'], make: kart, best: (b) => 'Best time: ' + Math.floor(b / 600) + ':' + String(Math.floor(b / 10) % 60).padStart(2, '0') + '.' + (b % 10) },
    { id: 'pinball', name: 'Pinball', blurb: 'A full table: bumpers, targets, a nest and a H-O-N-K multiplier.', how: ['Left / right flips, down or A pulls the plunger', 'Light all four HONK lanes to raise the multiplier'], make: pinball, best: (b) => 'Best score: ' + b.toLocaleString() },
    { id: 'sky', name: 'Sky Patrol', blurb: 'Fly a goose through waves of drones. Boss every fifth wave.', how: ['Arrow keys or drag to fly, you fire on your own', 'P powers up, S is a shield, H is an extra life'], make: skypatrol, best: (b) => 'Best score: ' + b.toLocaleString() },
    { id: 'tunnel', name: 'Neon Tunnel', blurb: 'Spin round a tunnel at speed and slip through the gaps.', how: ['Left / right spins you round the tunnel', 'Grab the gems for extra points'], make: tunnel, best: (b) => 'Best score: ' + b },
    { id: 'golf', name: 'Mini Golf', blurb: 'Nine holes: sand, water, bumpers and a windmill.', how: ['Drag back from anywhere and let go to putt', 'Or: left / right aims, up / down sets power, A putts'], make: golf, best: (b) => 'Best round: ' + b + ' strokes' },
    { id: 'run', name: 'Goose Run', blurb: 'Run, jump, double jump. It keeps getting faster.', how: ['A or Up jumps, hold it for a higher jump', 'Press again in the air to jump a second time'], make: goosrun, best: (b) => 'Best score: ' + b },
    { id: 'arena', name: 'Honk Arena', blurb: 'Waddle, dash and honk through waves of bots. Boss every fifth wave.', how: ['Arrow keys or drag to move, A or tap to dash', 'You honk on your own: chain quick kills for a combo'], best: (b) => 'Best score: ' + b.toLocaleString(), make: arena },
    { id: 'pegs', name: 'Peg Drop', blurb: 'Bounce a ball through the pegs and light every gold one.', how: ['Left / right aims and A fires, or touch, aim and let go', 'Light all the gold pegs within 10 balls to clear a level'], best: (b) => 'Best score: ' + b.toLocaleString(), make: pegdrop },
    { id: 'defense', name: 'Goose Defense', blurb: 'Build honk cannons and frost geese to stop 20 waves of robots.', how: ['Tap a tile (or D-pad + A) to build, upgrade or sell', 'Keep the robots off the nest; call waves early for coins'], best: (b) => 'Best score: ' + b.toLocaleString(), make: defense },
    { id: 'quest', name: 'Goose Quest', blurb: 'Six hand-made levels: run, jump, stomp cones and find the golden eggs.', how: ['Left / right runs, A or Up jumps (hold for higher)', 'Grab coins, find each hidden golden egg, reach the door'], best: (b) => 'Best score: ' + b.toLocaleString(), make: quest },
    { id: 'slice', name: 'Sticker Slice', blurb: 'Swipe through flying stickers, dodge the bombs.', how: ['Drag to slice, or arrows move the blade and A holds it down', 'Combos for several in one swipe; gold starts a frenzy'], best: (b) => 'Best score: ' + b.toLocaleString(), make: slice },
    { id: 'swap', name: 'Sticker Swap', blurb: 'Swap stickers to make lines of three. Ninety seconds on the clock.', how: ['Drag or click two neighbours; keys: move, A grabs, then a direction swaps', 'Big combos and new levels add time; 4, L/T and 5 make specials'], best: (b) => 'Best score: ' + b.toLocaleString(), make: swap },
  ].map((g) => Object.assign(g, { icon: (c, z, env) => ICON[g.id](c, z, env) }));
})();
