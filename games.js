/* Small games for the console's Games menu. Each one draws itself into any W x H area of a 2D canvas, so the same code runs on
   the desktop console's top screen and full screen on a phone.

   make(env) returns a game:  resize(W, H)  reset()  step(dt)  draw(c, t)  key(k)  pointer(type, x, y)  hud() -> [left, right]
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

  /* ---------------- Snake ---------------- */
  function snake(env) {
    let W = 400, H = 400, cs = 20, nx = 20, ny = 20, ox = 0, oy = 0, body, dir, q, food, state, score, acc, best = env.load('snake');
    const place = () => { do { food = [Math.random() * nx | 0, Math.random() * ny | 0]; } while (body.some((b) => b[0] === food[0] && b[1] === food[1])); };
    const g = {
      resize(w, h) { W = w; H = h; cs = Math.max(12, Math.floor(Math.min(W, H) / 17)); nx = Math.floor(W / cs); ny = Math.floor(H / cs); ox = (W - nx * cs) / 2; oy = (H - ny * cs) / 2; },
      reset() { const y = ny >> 1; body = [[4, y], [3, y], [2, y]]; dir = [1, 0]; q = []; state = 'ready'; score = 0; acc = 0; place(); },
      step(dt) {
        if (state !== 'play') return; acc += dt; const tick = Math.max(0.065, 0.11 - score * 0.0015);
        while (acc >= tick) { acc -= tick; if (q.length) dir = q.shift();
          const hd = [body[0][0] + dir[0], body[0][1] + dir[1]];
          if (hd[0] < 0 || hd[1] < 0 || hd[0] >= nx || hd[1] >= ny || body.some((b) => b[0] === hd[0] && b[1] === hd[1])) { state = 'over'; if (score > best) { best = score; env.save('snake', best); } env.buzz(); return; }
          body.unshift(hd); if (hd[0] === food[0] && hd[1] === food[1]) { score++; place(); } else body.pop(); }
      },
      draw(c, t) {
        c.fillStyle = BG; c.fillRect(0, 0, W, H); c.fillStyle = BG2;
        for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) if ((x + y) % 2) c.fillRect(ox + x * cs, oy + y * cs, cs, cs);
        const cell = (p, pad, col) => { c.fillStyle = col; rr(c, ox + p[0] * cs + pad, oy + p[1] * cs + pad, cs - pad * 2, cs - pad * 2, cs * 0.25); c.fill(); };
        cell(food, cs * 0.18 + Math.sin(t * 6) * cs * 0.04, RED); body.forEach((b, k) => cell(b, 1.5, k ? ACC : DEEP));
        if (state === 'ready') banner(c, W, H, 'Snake', env.touch ? 'Swipe to start' : 'Press any direction to start', env, false);
        if (state === 'over') banner(c, W, H, 'Game over', `Score ${score}\n${againWord(env)}`, env, true);
      },
      key(k) {
        const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
        if (d) { if (state === 'over') return true; const last = q.length ? q[q.length - 1] : dir;
          if ((d[0] !== -last[0] || d[1] !== -last[1]) && (d[0] !== last[0] || d[1] !== last[1]) && q.length < 3) q.push(d); state = 'play'; return true; }
        if (k === 'a') { if (state !== 'play') { g.reset(); state = 'play'; } return true; }
        return false;
      },
      pointer(type) { if (type === 'down' && state === 'over') { g.reset(); } },
      hud: () => ['Score ' + score, 'Best ' + best],
      swipe: true,
    };
    return g;
  }

  /* ---------------- Bricks ---------------- */
  function bricks(env) {
    let W = 400, H = 400, s = 1, pw, px, pt, ball, bricks, state, score, lives, level, best = env.load('bricks'), flash = [];
    const COLS = ['#e0584d', '#f2994a', GOLD, '#4cb782', ACC, '#5b7fd6'];
    const build = () => { const cols = W > H ? 10 : 7, rows = 5 + Math.min(2, level - 1), gap = 5 * s, top = 30 * s, bw = (W - 24 * s - gap * (cols - 1)) / cols, bh = 16 * s; bricks = [];
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) bricks.push({ x: 12 * s + k * (bw + gap), y: top + r * (bh + gap), w: bw, h: bh, col: COLS[r % COLS.length], hp: r === 0 && level > 1 ? 2 : 1 }); };
    const serve = () => { ball = { x: px, y: H - 34 * s, vx: 0, vy: 0, r: 6 * s, stuck: true }; };
    const launch = () => { if (!ball.stuck) return; const sp = (330 + level * 30) * s, a = rnd(-0.5, 0.5); ball.vx = Math.sin(a) * sp; ball.vy = -Math.cos(a) * sp; ball.stuck = false; state = 'play'; };
    const g = {
      resize(w, h) { W = w; H = h; s = Math.min(W, H) / 420; pw = Math.max(70 * s, W * 0.17); },
      reset() { score = 0; lives = 3; level = 1; px = pt = W / 2; build(); serve(); state = 'ready'; flash = []; },
      step(dt) {
        px += (pt - px) * (1 - Math.exp(-dt * 20)); px = clamp(px, pw / 2, W - pw / 2);
        flash = flash.filter((f) => (f.t -= dt) > 0);
        if (state === 'over') return;
        if (ball.stuck) { ball.x = px; return; }
        const n = Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / (ball.r * 0.8)) || 1;
        for (let i = 0; i < n; i++) {
          const b = ball, h = dt / n; b.x += b.vx * h; b.y += b.vy * h;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); } if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
          const py = H - 22 * s;
          if (b.vy > 0 && b.y + b.r >= py && b.y + b.r <= py + 14 * s && Math.abs(b.x - px) <= pw / 2 + b.r) { // off the paddle: where it lands sets the angle
            const sp = Math.hypot(b.vx, b.vy) * 1.01, a = clamp((b.x - px) / (pw / 2), -1, 1) * 1.05; b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp; b.y = py - b.r; env.buzz(); }
          if (b.y > H + 20 * s) { lives--; env.buzz(); if (lives <= 0) { state = 'over'; if (score > best) { best = score; env.save('bricks', best); } } else serve(); return; }
          for (const k of bricks) { if (k.hp <= 0) continue;
            const nx = clamp(b.x, k.x, k.x + k.w), ny = clamp(b.y, k.y, k.y + k.h), dx = b.x - nx, dy = b.y - ny;
            if (dx * dx + dy * dy <= b.r * b.r) { k.hp--; if (k.hp <= 0) { score += 10; flash.push({ x: k.x + k.w / 2, y: k.y + k.h / 2, t: 0.35, col: k.col }); }
              if (Math.abs(dx) > Math.abs(dy)) b.vx = Math.sign(dx || -b.vx) * Math.abs(b.vx); else b.vy = Math.sign(dy || -b.vy) * Math.abs(b.vy); break; } }
        }
        if (bricks.every((k) => k.hp <= 0)) { level++; build(); serve(); }
      },
      draw(c) {
        c.fillStyle = BG; c.fillRect(0, 0, W, H);
        for (const k of bricks) if (k.hp > 0) { c.fillStyle = k.col; rr(c, k.x, k.y, k.w, k.h, 4 * s); c.fill(); if (k.hp > 1) { c.fillStyle = 'rgba(255,255,255,.45)'; rr(c, k.x + 3, k.y + 3, k.w - 6, k.h * 0.3, 2); c.fill(); } }
        for (const f of flash) { c.globalAlpha = f.t / 0.35; c.fillStyle = f.col; c.beginPath(); c.arc(f.x, f.y, (1 - f.t / 0.35) * 26 * s + 4, 0, 7); c.fill(); } c.globalAlpha = 1;
        c.fillStyle = INK; rr(c, px - pw / 2, H - 22 * s, pw, 11 * s, 6 * s); c.fill();
        c.fillStyle = DEEP; c.beginPath(); c.arc(ball.x, ball.y, ball.r, 0, 7); c.fill();
        for (let i = 0; i < lives; i++) { c.fillStyle = RED; c.beginPath(); c.arc(W - 14 * s - i * 16 * s, H - 8 * s, 4.5 * s, 0, 7); c.fill(); }
        if (state === 'ready') banner(c, W, H * 1.15, 'Bricks', env.touch ? 'Drag to move · tap to launch' : 'Left / right to move · A to launch', env, false);
        if (state === 'over') banner(c, W, H, 'Game over', `Score ${score}\n${againWord(env)}`, env, true);
      },
      key(k) {
        if (k === 'left' || k === 'right') { pt = clamp(pt + (k === 'left' ? -1 : 1) * W * 0.11, pw / 2, W - pw / 2); return true; }
        if (k === 'a' || k === 'up') { if (state === 'over') g.reset(); else launch(); return true; }
        return false;
      },
      pointer(type, x) { if (state === 'over') { if (type === 'down') g.reset(); return; } pt = x; if (type === 'down' && ball.stuck) setTimeout(launch, 0); },
      hud: () => ['Score ' + score, 'Best ' + best],
    };
    return g;
  }

  /* ---------------- Goose Glide: one button, keep the goose airborne between the posts ---------------- */
  function glide(env) {
    let W = 400, H = 400, s = 1, y, vy, posts, state, score, best = env.load('glide'), deadT = 0, scroll = 0;
    const gx = () => W * 0.26, R = () => 17 * s, GROUND = () => H - 26 * s;
    const gapH = () => Math.max(132 * s, H * 0.3), postW = () => 52 * s;
    const add = (x) => { const gh = gapH(), m = 30 * s; posts.push({ x, gy: rnd(m + gh / 2, GROUND() - m - gh / 2), done: false }); };
    const flap = () => { if (state === 'over') { if (deadT > 0.45) g.reset(); return; } state = 'play'; vy = -410 * s; };
    const g = {
      resize(w, h) { W = w; H = h; s = Math.min(1.4, Math.max(0.7, H / 430)); },
      reset() { y = H * 0.45; vy = 0; posts = []; score = 0; state = 'ready'; deadT = 0; const sp = Math.max(230 * s, W * 0.5); for (let i = 0; i < 4; i++) add(W + 60 * s + i * sp); },
      step(dt) {
        scroll += dt * (state === 'over' ? 0 : 1);
        if (state === 'ready') { y = H * 0.45 + Math.sin(scroll * 3) * 8 * s; return; }
        if (state === 'over') { deadT += dt; vy = Math.min(vy + 1500 * s * dt, 900 * s); y = Math.min(GROUND() - R(), y + vy * dt); return; }
        vy = Math.min(vy + 1450 * s * dt, 820 * s); y += vy * dt;
        const v = (165 + Math.min(70, score * 3)) * s, sp = Math.max(230 * s, W * 0.5);
        for (const p of posts) { p.x -= v * dt; if (!p.done && p.x + postW() / 2 < gx()) { p.done = true; score++; } }
        if (posts[0].x < -postW()) { posts.shift(); add(posts[posts.length - 1].x + sp); }
        const r = R() * 0.8, die = () => { state = 'over'; deadT = 0; env.buzz(); if (score > best) { best = score; env.save('glide', best); } };
        if (y + r > GROUND() || y - r < 0) return die();
        for (const p of posts) if (Math.abs(p.x - gx()) < postW() / 2 + r && Math.abs(y - p.gy) > gapH() / 2 - r) return die();
      },
      draw(c, t) {
        const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#dff3f6'); sky.addColorStop(1, '#f6f1e6'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 4; i++) { const x = ((i * 260 - scroll * 22) % (W + 200) + W + 200) % (W + 200) - 100; c.beginPath(); c.ellipse(x, 60 * s + i * 37 % 90 * s, 46 * s, 14 * s, 0, 0, 7); c.fill(); }
        for (const p of posts) { const w = postW(), gh = gapH(); c.fillStyle = ACC;
          rr(c, p.x - w / 2, -10, w, p.gy - gh / 2 + 10, 10 * s); c.fill(); rr(c, p.x - w / 2, p.gy + gh / 2, w, GROUND() - p.gy - gh / 2 + 10, 10 * s); c.fill();
          c.fillStyle = DEEP; rr(c, p.x - w / 2 - 4 * s, p.gy - gh / 2 - 14 * s, w + 8 * s, 14 * s, 5 * s); c.fill(); rr(c, p.x - w / 2 - 4 * s, p.gy + gh / 2, w + 8 * s, 14 * s, 5 * s); c.fill(); }
        c.fillStyle = '#c9b78f'; c.fillRect(0, GROUND(), W, H - GROUND()); c.fillStyle = '#b3a07a'; for (let x = -((scroll * 165 * s) % (24 * s)); x < W; x += 24 * s) c.fillRect(x, GROUND(), 12 * s, 4 * s);
        c.save(); c.translate(gx(), y); c.rotate(clamp(vy / (900 * s), -0.45, 1.1)); const im = env.pic('goose');
        if (!fit(c, im, 0, 0, R() * 2.6, R() * 2.6)) { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, R(), 0, 7); c.fill(); c.fillStyle = GOLD; c.fillRect(R() * 0.6, -3, 10 * s, 6); }
        c.restore();
        if (state === 'play') { c.fillStyle = INK; font(c, 800, 44 * s); c.textAlign = 'center'; c.fillText(score, W / 2, 62 * s); c.textAlign = 'left'; }
        if (state === 'ready') banner(c, W, H * 1.25, 'Goose Glide', env.touch ? 'Tap to flap' : 'Press A (or Up) to flap', env, false);
        if (state === 'over') banner(c, W, H, 'Splat', `Score ${score}\n${againWord(env)}`, env, true);
      },
      key(k) { if (k === 'a' || k === 'up') { flap(); return true; } return false; },
      pointer(type) { if (type === 'down') flap(); },
      hud: () => ['Score ' + score, 'Best ' + best],
    };
    return g;
  }

  /* ---------------- Sticker Match: find the pairs ---------------- */
  function match(env) {
    const POOL = ['stackadapt', 'waterloo', 'mlh', 'goose', 'zomp', 'heseri', 'voodoo', 'github', 'linkedin', 'devpost', 'boxhead', 'oyster', 'proteful', 'knight', 'ggb', 't_java'];
    let W = 400, H = 400, cards, cols, rows, cw, ch, ox, oy, gap, cur, open, moves, wait, state, best = env.load('match'), found;
    const layout = () => { gap = Math.min(W, H) * 0.025; const n = cards.length; cols = W > H * 1.3 ? (n === 16 ? 8 : 6) : 4; rows = Math.ceil(n / cols);
      const fw = (W - gap * (cols + 1)) / cols, fh = (H - gap * (rows + 1)) / rows; cw = Math.min(fw, fh); ch = Math.min(fh, cw * 1.3); ox = (W - cols * cw - (cols - 1) * gap) / 2; oy = (H - rows * ch - (rows - 1) * gap) / 2; };
    const at = (x, y) => cards.findIndex((cd, i) => { const cx = ox + (i % cols) * (cw + gap), cy = oy + Math.floor(i / cols) * (ch + gap); return x >= cx && x <= cx + cw && y >= cy && y <= cy + ch; });
    const pick = (i) => {
      if (state === 'over') { g.reset(); return; }
      if (i < 0 || wait > 0) return; const cd = cards[i]; if (cd.up || cd.done) return;
      state = 'play'; cd.up = true; open.push(i);
      if (open.length === 2) { moves++; const [a, b] = open.map((j) => cards[j]);
        if (a.k === b.k) { a.done = b.done = true; open = []; found++; env.buzz(); if (cards.every((q) => q.done)) { state = 'over'; if (!best || moves < best) { best = moves; env.save('match', best); } } }
        else wait = 0.75; }
    };
    const g = {
      resize(w, h) { W = w; H = h; if (cards) layout(); },
      reset() { const have = POOL.filter((k) => env.pic(k)), pairs = (have.length >= 8 ? have : POOL).slice().sort(() => Math.random() - 0.5).slice(0, 8);
        cards = pairs.concat(pairs).sort(() => Math.random() - 0.5).map((k) => ({ k, up: false, done: false, f: 0 })); open = []; moves = 0; wait = 0; cur = 0; found = 0; state = 'ready'; layout(); },
      step(dt) { if (wait > 0 && (wait -= dt) <= 0) { open.forEach((j) => { cards[j].up = false; }); open = []; } cards.forEach((cd) => { cd.f += ((cd.up || cd.done ? 1 : 0) - cd.f) * (1 - Math.exp(-dt * 14)); }); },
      draw(c, t) {
        c.fillStyle = BG; c.fillRect(0, 0, W, H);
        cards.forEach((cd, i) => { const x = ox + (i % cols) * (cw + gap), y = oy + Math.floor(i / cols) * (ch + gap), sx = Math.abs(Math.cos(cd.f * Math.PI)), face = cd.f > 0.5;
          c.save(); c.translate(x + cw / 2, y + ch / 2); c.scale(Math.max(0.02, sx), 1);
          c.shadowColor = 'rgba(30,40,55,.16)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
          c.fillStyle = face ? (cd.done ? '#e3f4f6' : '#fff') : ACC; rr(c, -cw / 2, -ch / 2, cw, ch, Math.min(cw, ch) * 0.14); c.fill(); c.shadowColor = 'transparent';
          if (face) fit(c, env.pic(cd.k), 0, 0, cw * 0.72, ch * 0.72);
          else { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; rr(c, -cw / 2 + 6, -ch / 2 + 6, cw - 12, ch - 12, Math.min(cw, ch) * 0.1); c.stroke(); c.fillStyle = 'rgba(255,255,255,.9)'; font(c, 800, Math.min(cw, ch) * 0.34); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 2); c.textBaseline = 'alphabetic'; c.textAlign = 'left'; }
          c.restore();
          if (!env.touch && i === cur && state !== 'over') { c.strokeStyle = INK; c.lineWidth = 3; rr(c, x - 4, y - 4, cw + 8, ch + 8, Math.min(cw, ch) * 0.18); c.stroke(); } });
        if (state === 'over') banner(c, W, H, 'All matched', `${moves} moves\n${againWord(env)}`, env, true);
      },
      key(k) {
        const d = { left: -1, right: 1, up: -cols, down: cols }[k];
        if (d) { const n = cur + d; if (n >= 0 && n < cards.length && (Math.abs(d) !== 1 || Math.floor(n / cols) === Math.floor(cur / cols))) cur = n; return true; }
        if (k === 'a') { pick(cur); return true; } return false;
      },
      pointer(type, x, y) { if (type === 'down') { const i = at(x, y); if (i >= 0) cur = i; pick(state === 'over' ? -1 : i); } },
      hud: () => ['Moves ' + moves, best ? 'Best ' + best : 'Pairs ' + found + '/8'],
    };
    return g;
  }

  /* ---------------- Whack-a-Goose: 30 seconds, bop every goose that pops up ---------------- */
  function whack(env) {
    let W = 400, H = 400, holes, cur, score, time, state, best = env.load('whack'), spawn, pops = [];
    const LEN = 30;
    const layout = () => { const cols = 3, rows = 3, cw = W / cols, chh = (H - 44) / rows; holes = []; for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) holes.push({ x: cw * (k + 0.5), y: 34 + chh * (r + 0.66), r: Math.min(cw, chh) * 0.3, up: 0, t: 0, life: 0, hit: 0 }); };
    const whackAt = (i) => {
      if (state === 'over') { if (time < -0.6) g.reset(); return; }
      if (state === 'ready') { state = 'play'; return; }
      const h = holes[i]; if (!h) return;
      if (h.life > 0 && h.up > 0.35 && !h.hit) { h.hit = 1; h.life = Math.min(h.life, 0.18); score++; pops.push({ x: h.x, y: h.y - h.r, t: 0.6 }); env.buzz(); }
    };
    const g = {
      resize(w, h) { W = w; H = h; layout(); },
      reset() { score = 0; time = LEN; state = 'ready'; spawn = 0.5; cur = 4; pops = []; layout(); },
      step(dt) {
        pops = pops.filter((p) => (p.t -= dt) > 0);
        holes.forEach((h) => { if (h.life > 0) h.life -= dt; h.up += ((h.life > 0 ? 1 : 0) - h.up) * (1 - Math.exp(-dt * 16)); if (h.life <= 0 && h.up < 0.05) h.hit = 0; });
        if (state === 'over') { time -= dt; return; }
        if (state !== 'play') return;
        time -= dt; if (time <= 0) { state = 'over'; time = 0; holes.forEach((h) => { h.life = 0; }); if (score > best) { best = score; env.save('whack', best); } return; }
        if ((spawn -= dt) <= 0) { const k = 1 - time / LEN; spawn = rnd(0.45, 0.85) * (1 - k * 0.45); const free = holes.filter((h) => h.life <= 0 && h.up < 0.1); const h = free[Math.random() * free.length | 0]; if (h) { h.life = rnd(0.75, 1.15) * (1 - k * 0.4); h.hit = 0; } }
      },
      draw(c, t) {
        c.fillStyle = '#e8f1df'; c.fillRect(0, 0, W, H);
        const im = env.pic('goose');
        holes.forEach((h, i) => {
          c.fillStyle = '#5b4a3a'; c.beginPath(); c.ellipse(h.x, h.y, h.r, h.r * 0.36, 0, 0, 7); c.fill();
          c.save(); c.beginPath(); c.rect(h.x - h.r * 1.4, h.y - h.r * 2.6, h.r * 2.8, h.r * 2.6); c.clip();
          const lift = h.up * h.r * 1.5, sq = h.hit ? 0.75 : 1;
          c.translate(h.x, h.y + h.r * 0.9 - lift); c.scale(1 / sq, sq);
          if (!fit(c, im, 0, -h.r * 0.2, h.r * 2.1, h.r * 2.1)) { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, h.r * 0.7, 0, 7); c.fill(); }
          c.restore();
          c.fillStyle = '#7a6450'; c.beginPath(); c.ellipse(h.x, h.y + h.r * 0.05, h.r * 1.04, h.r * 0.2, 0, 0, Math.PI); c.fill();
          if (!env.touch && i === cur && state === 'play') { c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(h.x, h.y, h.r * 1.15, h.r * 0.5, 0, 0, 7); c.stroke(); }
        });
        for (const p of pops) { c.globalAlpha = Math.min(1, p.t / 0.3); c.fillStyle = DEEP; font(c, 800, 26); c.textAlign = 'center'; c.fillText('+1', p.x, p.y - (0.6 - p.t) * 50); c.textAlign = 'left'; } c.globalAlpha = 1;
        c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(0, 0, W, 26); c.fillStyle = ACC; c.fillRect(0, 0, W * Math.max(0, time) / LEN, 26);
        c.fillStyle = INK; font(c, 600, 15); c.fillText(Math.ceil(Math.max(0, time)) + 's', 10, 18);
        if (state === 'ready') banner(c, W, H, 'Whack-a-Goose', env.touch ? 'Tap the geese · tap to start' : 'Move with the D-pad, A to bop\nPress A to start', env, true);
        if (state === 'over') banner(c, W, H, "Time's up", `${score} geese\n${againWord(env)}`, env, true);
      },
      key(k) {
        const d = { left: -1, right: 1, up: -3, down: 3 }[k];
        if (d) { const n = cur + d; if (n >= 0 && n < 9 && (Math.abs(d) !== 1 || Math.floor(n / 3) === Math.floor(cur / 3))) cur = n; return true; }
        if (k === 'a') { whackAt(cur); return true; } return false;
      },
      pointer(type, x, y) { if (type !== 'down') return; let bi = -1, bd = 1e9; holes.forEach((h, i) => { const d = Math.hypot(x - h.x, (y - (h.y - h.r * 0.6)) * 0.8); if (d < bd) { bd = d; bi = i; } }); if (bd < holes[0].r * 1.6) cur = bi; whackAt(bd < holes[0].r * 1.6 ? bi : -1); },
      hud: () => ['Score ' + score, 'Best ' + best],
    };
    return g;
  }

  /* ---------------- Logo Rain: catch the logos, dodge the bombs ---------------- */
  function rain(env) {
    const LOGOS = ['stackadapt', 'waterloo', 'mlh', 'zomp', 'heseri', 'voodoo', 'github', 'linkedin', 'devpost', 't_ts', 't_react', 't_python', 't_java', 't_go', 't_unity'];
    let W = 400, H = 400, s = 1, bx, bt, bw, drops, lives, score, state, spawn, best = env.load('rain'), elapsed, pops;
    const g = {
      resize(w, h) { W = w; H = h; s = Math.min(1.3, Math.max(0.7, Math.min(W, H) / 420)); bw = 96 * s; },
      reset() { drops = []; lives = 3; score = 0; state = 'ready'; spawn = 0.4; bx = bt = W / 2; elapsed = 0; pops = []; },
      step(dt) {
        bx += (bt - bx) * (1 - Math.exp(-dt * 18)); bx = clamp(bx, bw / 2, W - bw / 2);
        pops = pops.filter((p) => (p.t -= dt) > 0);
        if (state !== 'play') return; elapsed += dt;
        if ((spawn -= dt) <= 0) { spawn = Math.max(0.32, 0.95 - elapsed * 0.012); const bomb = Math.random() < Math.min(0.28, 0.08 + elapsed * 0.004), ks = LOGOS.filter((k) => env.pic(k));
          drops.push({ x: rnd(24 * s, W - 24 * s), y: -30 * s, v: (120 + elapsed * 3.2 + rnd(0, 60)) * s, r: 22 * s, bomb, k: ks[Math.random() * ks.length | 0], spin: rnd(-2, 2), a: 0 }); }
        const top = H - 40 * s;
        for (const d of drops) { d.y += d.v * dt; d.a += d.spin * dt;
          if (!d.gone && d.y + d.r * 0.5 >= top && d.y - d.r < top + 16 * s && Math.abs(d.x - bx) < bw / 2 + d.r * 0.4) { d.gone = true;
            if (d.bomb) { lives--; env.buzz(); pops.push({ x: d.x, y: top, t: 0.6, txt: 'Ouch', col: RED }); } else { score++; pops.push({ x: d.x, y: top, t: 0.6, txt: '+1', col: DEEP }); } }
          if (!d.gone && d.y - d.r > H) { d.gone = true; if (!d.bomb) { lives--; env.buzz(); } } }
        drops = drops.filter((d) => !d.gone);
        if (lives <= 0) { state = 'over'; if (score > best) { best = score; env.save('rain', best); } }
      },
      draw(c, t) {
        const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#eef6f8'); sky.addColorStop(1, BG); c.fillStyle = sky; c.fillRect(0, 0, W, H);
        for (const d of drops) { c.save(); c.translate(d.x, d.y); c.rotate(d.a);
          if (d.bomb) { c.fillStyle = INK; c.beginPath(); c.arc(0, 0, d.r * 0.8, 0, 7); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(0, -d.r * 0.8); c.quadraticCurveTo(d.r * 0.4, -d.r * 1.3, d.r * 0.2, -d.r * 1.5); c.stroke(); c.fillStyle = RED; c.beginPath(); c.arc(d.r * 0.2, -d.r * 1.5, 3.5 * s * (1 + 0.3 * Math.sin(t * 20)), 0, 7); c.fill(); }
          else if (!fit(c, env.pic(d.k), 0, 0, d.r * 2, d.r * 2)) { c.fillStyle = ACC; c.beginPath(); c.arc(0, 0, d.r * 0.8, 0, 7); c.fill(); }
          c.restore(); }
        const top = H - 40 * s; c.fillStyle = DEEP; rr(c, bx - bw / 2, top, bw, 22 * s, 8 * s); c.fill(); c.fillStyle = ACC; rr(c, bx - bw / 2 + 4 * s, top + 3 * s, bw - 8 * s, 7 * s, 4 * s); c.fill();
        for (const p of pops) { c.globalAlpha = Math.min(1, p.t / 0.3); c.fillStyle = p.col; font(c, 800, 22 * s); c.textAlign = 'center'; c.fillText(p.txt, p.x, p.y - (0.6 - p.t) * 60 * s); c.textAlign = 'left'; } c.globalAlpha = 1;
        for (let i = 0; i < 3; i++) { c.fillStyle = i < lives ? RED : 'rgba(0,0,0,.12)'; c.beginPath(); c.arc(W - 16 * s - i * 18 * s, 16 * s, 6 * s, 0, 7); c.fill(); }
        if (state === 'ready') banner(c, W, H, 'Logo Rain', env.touch ? 'Drag to catch the logos, dodge the bombs\nTap to start' : 'Catch the logos, dodge the bombs\nLeft / right to move · A to start', env, false);
        if (state === 'over') banner(c, W, H, 'Game over', `Caught ${score}\n${againWord(env)}`, env, true);
      },
      key(k) {
        if (k === 'left' || k === 'right') { bt = clamp(bt + (k === 'left' ? -1 : 1) * W * 0.12, bw / 2, W - bw / 2); if (state === 'ready') state = 'play'; return true; }
        if (k === 'a') { if (state !== 'play') { g.reset(); state = 'play'; } return true; } return false;
      },
      pointer(type, x) { if (type === 'down' && state !== 'play') { g.reset(); state = 'play'; } bt = x; },
      hud: () => ['Caught ' + score, 'Best ' + best],
    };
    return g;
  }

  // the menu's icons, drawn so they work at any size
  const ICON = {
    snake(c, z) { [[-2, 0], [-1, 0], [0, 0], [0, -1], [1, -1]].forEach(([dx, dy], q) => { c.fillStyle = q === 4 ? DEEP : ACC; rr(c, z / 2 + dx * z * 0.17 - z * 0.075 - z * 0.08, z / 2 + dy * z * 0.17 - z * 0.075 + z * 0.06, z * 0.15, z * 0.15, z * 0.035); c.fill(); }); c.fillStyle = RED; rr(c, z * 0.74, z * 0.62, z * 0.14, z * 0.14, z * 0.035); c.fill(); },
    bricks(c, z) { const C = ['#e0584d', GOLD, '#4cb782']; for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { c.fillStyle = C[r]; rr(c, z * (0.14 + k * 0.25), z * (0.14 + r * 0.13), z * 0.21, z * 0.1, z * 0.025); c.fill(); } c.fillStyle = DEEP; c.beginPath(); c.arc(z * 0.56, z * 0.66, z * 0.06, 0, 7); c.fill(); c.fillStyle = INK; rr(c, z * 0.3, z * 0.8, z * 0.4, z * 0.07, z * 0.035); c.fill(); },
    glide(c, z, env) { c.fillStyle = ACC; rr(c, z * 0.62, 0, z * 0.2, z * 0.3, z * 0.05); c.fill(); rr(c, z * 0.62, z * 0.68, z * 0.2, z * 0.32, z * 0.05); c.fill(); if (!fit(c, env.pic('goose'), z * 0.36, z * 0.5, z * 0.5, z * 0.5)) { c.fillStyle = '#fff'; c.beginPath(); c.arc(z * 0.36, z * 0.5, z * 0.16, 0, 7); c.fill(); } },
    match(c, z, env) { [['waterloo', -0.12], [null, 0.12]].forEach(([k, a], i) => { c.save(); c.translate(z * (0.38 + i * 0.26), z * 0.5); c.rotate(a); c.fillStyle = k ? '#fff' : ACC; c.shadowColor = 'rgba(0,0,0,.15)'; c.shadowBlur = 6; rr(c, -z * 0.17, -z * 0.23, z * 0.34, z * 0.46, z * 0.05); c.fill(); c.shadowColor = 'transparent'; if (k) fit(c, env.pic(k), 0, 0, z * 0.26, z * 0.26); else { c.fillStyle = '#fff'; font(c, 800, z * 0.2); c.textAlign = 'center'; c.fillText('?', 0, z * 0.07); c.textAlign = 'left'; } c.restore(); }); },
    whack(c, z, env) { c.fillStyle = '#5b4a3a'; c.beginPath(); c.ellipse(z / 2, z * 0.76, z * 0.34, z * 0.1, 0, 0, 7); c.fill(); if (!fit(c, env.pic('goose'), z / 2, z * 0.48, z * 0.58, z * 0.58)) { c.fillStyle = '#fff'; c.beginPath(); c.arc(z / 2, z * 0.5, z * 0.2, 0, 7); c.fill(); } },
    rain(c, z, env) { [['github', 0.3, 0.26], ['t_react', 0.68, 0.18], ['mlh', 0.55, 0.5]].forEach(([k, x, y]) => fit(c, env.pic(k), z * x, z * y, z * 0.24, z * 0.24)); c.fillStyle = DEEP; rr(c, z * 0.28, z * 0.76, z * 0.44, z * 0.1, z * 0.04); c.fill(); },
  };

  window.GAMES = [
    { id: 'snake', name: 'Snake', blurb: 'Eat, grow, do not bite yourself.', how: ['D-pad steers', 'A restarts'], make: snake },
    { id: 'bricks', name: 'Bricks', blurb: 'Clear the wall with one ball.', how: ['Left / right moves the paddle', 'A launches the ball'], make: bricks },
    { id: 'glide', name: 'Goose Glide', blurb: 'Flap through the gaps.', how: ['A or Up flaps', 'Do not touch the posts'], make: glide },
    { id: 'match', name: 'Sticker Match', blurb: 'Find the eight pairs of stickers.', how: ['D-pad picks a card', 'A turns it over'], make: match },
    { id: 'whack', name: 'Whack-a-Goose', blurb: '30 seconds. Bop every goose.', how: ['D-pad picks a hole', 'A bops'], make: whack },
    { id: 'rain', name: 'Logo Rain', blurb: 'Catch the logos, dodge the bombs.', how: ['Left / right moves the tray', 'Miss three and it is over'], make: rain },
  ].map((g) => Object.assign(g, { icon: (c, z, env) => ICON[g.id](c, z, env) }));
})();
