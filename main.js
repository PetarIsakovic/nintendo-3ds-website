/* Petar Isakovic — a clamshell dual-screen handheld, modelled in three.js.
   Top screen shows content, bottom screen is the touch menu. */
(() => {
  'use strict';

  const canvas = document.getElementById('gl');

  // a refresh always starts at the top, with the lid closed
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  addEventListener('beforeunload', () => scrollTo(0, 0));
  addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); else scrollTo(0, 0); });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still\b/.test(location.search);
  const phone = matchMedia('(max-width: 700px) and (orientation: portrait)'); // phones get a close-up of the screens and larger type on them
  const onPhone = () => phone.matches;
  { const mq = phone, was = mq.matches, flip = () => { if (mq.matches !== was) location.reload(); }; if (mq.addEventListener) mq.addEventListener('change', flip); else if (mq.addListener) mq.addListener(flip); } // turning a phone between upright and sideways switches between the two versions of the site
  // Phones do not get the 3D console. They get what runs on it, full screen: the startup animation, the icon menu, and pages
  // you tap into, all as ordinary page elements (real text, native scrolling). ?3d on the address forces the console instead.
  const APP = phone.matches && !/[?&]3d\b/.test(location.search);
  let renderer;
  try {
    if (!window.THREE) throw new Error('three.js failed to load');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    canvas.remove(); renderer = null;
    if (!APP) { document.getElementById('fallback').hidden = false; return; } // (the phone version still works without WebGL: it just runs full screen, without the device around it)
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* unavailable */ } },
  };
  const openUrl = (u) => window.open(u, '_blank', 'noopener');
  const FONT = '"Inter", -apple-system, "Helvetica Neue", Arial, sans-serif';

  /* ======================= content ======================= */
  const C = { about: '#7c9cff', work: '#ff7a59', projects: '#ffd166', awards: '#5ee0a0', snake: '#c58bff', contact: '#ff6fb1' };

  const SECTIONS = [
    { id: 'about', label: 'About', blurb: 'Background', color: C.about, items: [
      { label: 'Bio', kicker: 'ABOUT', title: 'Hey, I’m Petar', sub: 'Software Engineering @ University of Waterloo',
        body: ['I’m a Software Engineering student at the University of Waterloo. Right now I’m an intern on the audiences team at StackAdapt.',
          'Before that I built a metal-loss contour detection algorithm for oil and gas pipelines at Zomp, and worked on mobile games at Heseri Games.',
          'Outside of work I go to a lot of hackathons. I also co-founded one, GooseHacks, in 2023.'] },
      { label: 'Stack', kicker: 'ABOUT', title: 'Tech stack',
        body: ['Web: TypeScript, React, Ruby on Rails, GraphQL, Go, AWS', 'Games and desktop: Unity, C#, .NET, WPF, gRPC', 'Mobile and AI: React Native, Python, Firebase', 'Also: Java. I <3 Java.'], bullets: true },
    ] },
    { id: 'work', label: 'Work', blurb: 'Experience', color: C.work, items: [
      { label: 'StackAdapt', kicker: 'SEP 2026 – NOW', title: 'StackAdapt', sub: 'Software Engineering Intern', bullets: true,
        body: ['Led the launch of SFTP-based CRM audience ingestion with the Data Hub team: a pipeline that imports customer audiences into the ad platform.', 'Built an AI security auditor in Slack that scans for exposed credentials. It found 45+ client GraphQL API keys and mapped them to the affected accounts.', 'Built an internal Electron and React overlay that uses LLM APIs to guide people through complex workflows in the advertiser interface.'],
        chips: ['Rails', 'GraphQL', 'Go', 'React', 'TypeScript', 'AWS'] },
      { label: 'Zomp', kicker: 'JAN – APR 2026', title: 'Zomp', sub: 'Software Engineering Intern', bullets: true,
        body: ['Built a contour detection pipeline for metal-loss analysis streaming millions of bounding boxes across 100+ km of pipeline. 60+ analysts use it daily.', 'Added a caching layer with source-generated synchronous wrappers that made metal-loss detection 500× faster.', 'Matched features between inline inspection and laser scan data as a min-cost assignment problem, raising detection accuracy by 78%.'],
        chips: ['C#', '.NET', 'gRPC', 'WPF', 'EF Core', 'Podman'] },
      { label: 'Heseri Games', kicker: 'MAY – AUG 2025', title: 'Heseri Games', sub: 'Mobile Game Developer · game published by Voodoo', bullets: true,
        body: ['Shipped gameplay, progression and monetization features for Epic Plane Evolution, a mobile game with 15M+ downloads on iOS and Android.', 'Built offline earnings, chase-camera behaviour, ragdoll physics and rocket boosts in Unity and C#. Revenue went up 10%.', 'Wrote a stall-aware rocket boost that scales thrust by angle of attack every FixedUpdate. A/B tested at +8% day-3 retention.'],
        chips: ['Unity', 'C#', 'iOS', 'Android'] },
      { label: 'GooseHacks', kicker: 'MAY – AUG 2023', title: 'GooseHacks', sub: 'Co-founder · a 200+ person hackathon in Waterloo', bullets: true,
        body: ['Started with no budget, no brand and no sponsor contacts.', 'Raised $10K+ from Desmos, 1Password and Unity, and built the website.'],
        links: [['Website', 'https://goosehacks.netlify.app/']] },
      { label: 'UWaterloo', kicker: '2024 – 2029', title: 'University of Waterloo', sub: 'Software Engineering', bullets: true,
        body: ['President’s Scholarship of Distinction.', '$15,000 Scotiabank Software Engineering Scholarship.'] },
    ] },
    { id: 'projects', label: 'Projects', blurb: '10 projects', color: C.projects, items: [
      ['BoxHead', 'BROWSER AR', 'Say an object out loud and it finds it for you in real time, using object detection and speech recognition.', [['Devpost', 'https://devpost.com/software/boxhead'], ['GitHub', 'https://github.com/PetarIsakovic/BoxHead']]],
      ['Oyster', '1ST OVERALL · SOON HACKATHON', 'AI game-dev copilot. Sketches and prompts become game-ready 3D assets, then an agent edits the engine files and hot-reloads the scene.', [['Devpost', 'https://devpost.com/software/godmode-aerf6x'], ['GitHub', 'https://github.com/ryushen-tan/GodMode']]],
      ['Proteful', '1ST OVERALL · HACK404', 'React Native safety app. A crowdsourced live hazard map with geofenced alerts, AI risk summaries and A* routing around danger zones.', [['Devpost', 'https://devpost.com/software/temp-3m7t0b'], ['GitHub', 'https://github.com/austinjiann/Proteful']]],
      ['Beat The Clock', '1ST OVERALL · AGENT HACK @ WAYFAIR HQ', 'Turns a video of your room into a shoppable furniture board. Built in under 2 hours at Boston Tech Week.', [['LinkedIn', 'https://www.linkedin.com/posts/petar-isakovic_bostechweek-build617-activity-7466639587612794881-VPg6'], ['X', 'https://x.com/PetarIsakovic06/status/2060546107222991221']]],
      ['What The Fit', 'PHIA HACKATHON · IOS APP', 'An iOS app that watches an Instagram, TikTok or YouTube video, picks out the outfit and finds real buy links.', [['Devpost', 'https://devpost.com/software/what-the-fit'], ['GitHub', 'https://github.com/PetarIsakovic/WhatTheFIt']]],
      ['Tonalysis', 'AI COMMUNICATION COACH', 'Real-time coaching with MediaPipe, FastAPI websockets, Gemini and TwelveLabs that reads your expression, posture and delivery.', [['Devpost', 'https://devpost.com/software/tonalysis'], ['Demo', 'https://www.youtube.com/watch?v=hJl7EJ7JZRQ']]],
      ['GooseHacks', 'HACKATHON SITE', 'The website and community for the 200+ person hackathon I co-founded.', [['Website', 'https://goosehacks.netlify.app/'], ['GitHub', 'https://github.com/PetarIsakovic/GooseHacks']]],
      ['Chess AI', 'JAVA', 'A chess engine with a GUI, an object-oriented piece hierarchy, move validation and check/checkmate logic.', [['GitHub', 'https://github.com/PetarIsakovic/Chess-A.I']]],
      ['Cursed Pacman', 'JAVA · TERMINAL', 'Multithreaded terminal Pacman. Each ghost runs on its own thread.', [['GitHub', 'https://github.com/PetarIsakovic/Pacman-But-Cursed']]],
      ['Multiplayer Vibe Coding', 'CAL HACKS 13.0 · SOLO BUILD', 'A shared canvas where people build apps together with AI prompts, voice and live cursors. It can copy a public website into an editable project, and has a 3D multiplayer racing game.', [['Devpost', 'https://devpost.com/software/multiplayer-vibe-coding'], ['GitHub', 'https://github.com/PetarIsakovic/Multiplayer-Vibe-coding'], ['juntumi.com', 'https://juntumi.com']]],
    ].map(([label, kicker, text, links]) => ({ label, kicker, title: label, body: [text], links, win: kicker.startsWith('1ST') })) },
    { id: 'awards', label: 'Awards', blurb: 'Hackathons, scholarships', color: C.awards, items: [
      { label: 'Hackathons', kicker: 'AWARDS', title: 'Hackathons', bullets: true, tight: true,
        body: ['1st overall, SOON Hackathon', '1st overall, Beat The Clock Agent Hack @ Wayfair HQ', '1st overall, Hack404 (200+ hackers)', '1st place, Hackamental', 'Best beginner hack, TurtleHacks', '3rd place, Spring Hacks'] },
      { label: 'Scholarships', kicker: 'AWARDS', title: 'Scholarships', bullets: true,
        body: ['$15,000 Scotiabank Software Engineering Scholarship', 'UWaterloo President’s Scholarship of Distinction', 'Governor General’s Bronze Academic Medal', 'Carter Family Award'] },
    ] },
    { id: 'snake', label: 'Snake', blurb: 'Game', color: C.snake, game: true, items: [] },
    { id: 'contact', label: 'Contact', blurb: 'Links', color: C.contact, items: [
      ['LinkedIn', 'linkedin.com/in/petar-isakovic', 'https://www.linkedin.com/in/petar-isakovic'],
      ['GitHub', 'github.com/PetarIsakovic', 'https://github.com/PetarIsakovic'],
      ['X', '@PetarIsakovic06', 'https://x.com/PetarIsakovic06'],
      ['Devpost', 'devpost.com/PetarIsakovic', 'https://devpost.com/PetarIsakovic'],
    ].map(([label, handle, url]) => ({ label, kicker: 'CONTACT', title: 'Contact', sub: handle, body: ['Press A or tap the button below to open ' + label + '.'], links: [[label, url]] })) },
  ];

  // which cut-out image each entry shows on the top screen
  const IMG = { Bio: 'petar', StackAdapt: 'stackadapt', Zomp: 'zomp', 'Heseri Games': 'heseri', GooseHacks: 'goose', UWaterloo: 'waterloo',
    Oyster: 'oyster', Proteful: 'proteful', 'Beat The Clock': 'four', 'What The Fit': 'phia', Tonalysis: 'ton_icon', 'Cursed Pacman': 'pac', 'Multiplayer Vibe Coding': 'mvc_icon', BoxHead: 'boxhead', 'Chess AI': 'knight', Hackathons: 'soon', Scholarships: 'waterloo',
    LinkedIn: 'linkedin', GitHub: 'github', X: 'xlogo', Devpost: 'devpost' };
  SECTIONS.forEach((s) => s.items.forEach((it) => { it.img = IMG[it.label]; }));
  SECTIONS[0].items[0].corner = true;
  SECTIONS[1].items.find((it) => it.label === 'Heseri Games').corner2 = 'voodoo'; // the game's publisher, beside the studio's logo
  SECTIONS[0].items[1].thumb = 't_java'; // Stack: a logo for its row in the list
  SECTIONS[2].items.find((it) => it.label === 'Cursed Pacman').gallery = [['pac', 112, 322, 124, 124], ['ghost_r', 244, 316, 100, 100], ['ghost_b', 352, 334, 82, 82]];
  SECTIONS[2].items.find((it) => it.label === 'What The Fit').gallery = [['phia', 482, 236, 250, 200]];
  SECTIONS[2].items.find((it) => it.label === 'What The Fit').mw = 304; // a narrower text column leaves room for the group photo
  { // product screenshots per project: [keys, tall?]. tall = phone or square shots, shown beside the text; wide ones go under it
    const SH = { Oyster: [['s_oyster1', 's_oyster2']], 'Beat The Clock': [['s_btc1', 's_btc2']], Proteful: [['s_proteful1', 's_proteful2'], 1], 'What The Fit': [['s_wtf1'], 1], Tonalysis: [['s_ton1', 's_ton2']], GooseHacks: [['s_goose1']],
      BoxHead: [['s_box1', 's_box2'], 1], 'Chess AI': [['s_chess1'], 1], 'Cursed Pacman': [['s_pac1'], 1], 'Multiplayer Vibe Coding': [['s_mvc1', 's_mvc2']] };
    SECTIONS[2].items.forEach((it) => { const v = SH[it.label]; if (v) { it.shots = v[0]; it.tall = !!v[1]; } });
  }
  SECTIONS[2].items.find((it) => it.label === 'What The Fit').body.push('Built at the Phia hackathon. I was one of 30 selected to compete, out of 1,000.');
  SECTIONS[2].items.find((it) => it.label === 'Beat The Clock').more = ['crowd', 'venue']; // event photos: only on the phone layout, which scrolls
  SECTIONS[2].items.find((it) => it.label === 'Oyster').rowExtra = 'soon'; // the team, at the end of the screenshot row
  SECTIONS[0].items.find((it) => it.label === 'Stack').scatter = [ // logo stickers slapped on at odd angles: [key, x, y, size, tilt]
    ['t_ts', 506, 112, 74, -0.16], ['t_react', 606, 96, 84, 0.12], ['t_aws', 708, 118, 80, -0.08],
    ['t_rails', 482, 196, 82, 0.2], ['t_graphql', 574, 186, 78, -0.22], ['t_go', 672, 200, 92, 0.1], ['t_unity', 744, 262, 76, 0.24],
    ['t_csharp', 520, 280, 80, -0.1], ['t_python', 624, 286, 84, 0.17], ['t_dotnet', 478, 356, 84, 0.14],
    ['t_firebase', 590, 370, 86, 0.08], ['t_java', 706, 372, 80, -0.15],
  ];
  SECTIONS[3].items[1].gallery = [['waterloo', 610, 168, 150, 150], ['huskies', 610, 328, 250, 170]]; // Scholarships: university and high school

  /* ======================= phone: the console's software, full screen ======================= */
  if (APP) { phoneApp(); return; }
  function phoneApp() {
    document.documentElement.classList.add('app'); if (renderer) document.documentElement.classList.add('dev'); // (set before the page is built, so the screen starts hidden; set later, it showed as a white box fading out)
    const ST = window.STICKERS || {};
    const h = (tag, cls, kids) => { const e = document.createElement(tag); if (cls) e.className = cls; (kids || []).forEach((k) => k && e.append(k)); return e; };
    const t = (tag, cls, text) => { const e = h(tag, cls); e.textContent = text; return e; };
    const pic = (k, cls) => { if (!ST[k]) return null; const e = h('img', cls); e.src = ST[k]; e.alt = ''; e.draggable = false; e.loading = 'lazy'; return e; };
    const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) { /* no haptics */ } };
    const btn = (cls, kids, fn) => { const b = h('button', cls, kids); b.type = 'button'; b.addEventListener('click', () => { buzz(); fn(); }); return b; };
    const clock = t('span', '', '');
    const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); }; tick(); setInterval(tick, 15000);
    const stage = h('div', 'os-stage');
    const os = h('main', 'os', [h('header', 'os-bar', [t('b', '', 'Petar Isakovic'), h('span', 'os-right', [clock, h('i', 'os-batt')])]), stage]);
    const boot = h('div', 'os-boot', [h('div', '', [t('h1', '', 'Petar Isakovic'), h('i', 'os-line'), h('p', '', [t('span', '', 'Starting up'), h('em', '', [h('u'), h('u'), h('u')])])])]);
    os.append(boot); document.body.append(os);
    const startBoot = () => { os.classList.add('on'); setTimeout(() => { boot.classList.add('done'); os.classList.add('ready'); }, reduced ? 60 : 2900); setTimeout(() => boot.remove(), reduced ? 500 : 3800); };

    // views slide in from the right and back out again; the phone's own back gesture works too
    const stack = [];
    function push(v) {
      const prev = stack[stack.length - 1]; v.classList.add('right'); stage.append(v); void v.offsetWidth; v.classList.remove('right');
      if (prev) prev.classList.add('left'); stack.push(v); setFoc(-1);
      if (stack.length > 1) history.pushState({ depth: stack.length }, '');
    }
    function pop() {
      if (stack.length < 2) return; const v = stack.pop(), prev = stack[stack.length - 1];
      if (v.leave) v.leave(); v.classList.add('right'); prev.classList.remove('left'); setTimeout(() => v.remove(), 380); setFoc(-1);
    }
    addEventListener('popstate', (e) => { const d = (e.state && e.state.depth) || 1; while (stack.length > d) pop(); });
    // the device's buttons drive the same screens: the D-pad moves a highlight (or scrolls a page), A opens, B goes back, START goes home
    let foc = -1;
    const cur = () => stack[stack.length - 1];
    const items = () => (cur() ? [...cur().querySelectorAll('.os-tile, .os-row')] : []);
    function setFoc(i) { foc = i; items().forEach((e, k) => e.classList.toggle('foc', k === i)); const e = items()[i]; if (e) e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    // Up Up Down Down Left Right Left Right B A Start, on the device's own buttons
    const KON = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a', 'start']; let kp = 0, onCheat = () => {}, bursting = false, spr = null;
    function cheat() {
      onCheat();
      const tag = t('div', 'os-cheat', 'Cheat unlocked  ·  +30 lives'); os.append(tag); setTimeout(() => tag.remove(), 4200);
      if (reduced || bursting) return; bursting = true;
      const keys = Object.keys(ST).filter((k) => !k.startsWith('s_') && k !== 'photo');
      const ready = spr ? Promise.resolve(spr) : Promise.all(keys.map((k) => new Promise((res) => { const im = new Image(); im.onload = () => { const sc = 120 / Math.max(im.naturalWidth, im.naturalHeight), c = document.createElement('canvas'); c.width = Math.max(1, im.naturalWidth * sc | 0); c.height = Math.max(1, im.naturalHeight * sc | 0); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c); }; im.onerror = () => res(null); im.src = ST[k]; }))).then((l) => (spr = l.filter(Boolean)));
      ready.then((SPR) => { // stickers burst out of the device across the whole display, bounce, then fall away
        const cv = document.createElement('canvas'); cv.className = 'burst'; document.body.append(cv);
        const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'), R = (a, b) => a + Math.random() * (b - a), P = [];
        for (let n = 0; n < 70; n++) { const g = SPR[n % SPR.length], an = R(0, 6.28), sp = R(300, 1300), sz = R(34, 78) / Math.max(g.width, g.height); P.push({ g, x: W / 2, y: H * 0.42, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 380, w: g.width * sz, h: g.height * sz, r: R(0, 6.3), vr: R(-7, 7), born: n < 44 ? R(0, 0.15) : R(0.5, 1.8), hits: 0 }); }
        let t0 = 0, last = 0; const LIFE = 6.5;
        (function step(now) { if (!t0) t0 = last = now; const tt = (now - t0) / 1000, dt = Math.min(0.033, (now - last) / 1000); last = now;
          if (tt > LIFE) { cv.remove(); bursting = false; return; }
          c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); const floor = tt < LIFE - 2.2;
          for (const q of P) { if (tt < q.born || q.y > H + 150) continue; q.vy += 1500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; const hh = Math.max(q.w, q.h) / 2;
            if (q.x < hh && q.vx < 0) { q.x = hh; q.vx *= -0.7; } else if (q.x > W - hh && q.vx > 0) { q.x = W - hh; q.vx *= -0.7; }
            if (floor && q.y > H - hh && q.vy > 0) { q.y = H - hh; q.vy *= -(q.hits++ < 3 ? 0.55 : 0.2); q.vx *= 0.8; }
            const co = Math.cos(q.r) * dpr, si = Math.sin(q.r) * dpr; c.setTransform(co, si, -si, co, q.x * dpr, q.y * dpr); c.drawImage(q.g, -q.w / 2, -q.h / 2, q.w, q.h); }
          requestAnimationFrame(step); })(performance.now());
      });
    }
    function ctl(k) {
      if (!os.classList.contains('ready')) return;
      { if (k === KON[kp] || (kp === KON.length - 1 && k === 'a')) kp++; else kp = k === 'up' ? (kp === 2 ? 2 : 1) : 0;
        if (kp > 8) { if (kp === KON.length) { kp = 0; cheat(); } return; } }  // the B, A, Start that finish the code do not also navigate
      const v = cur(), it = items();
      if (k === 'b') { if (stack.length > 1) back(); return; }
      if (k === 'start') { if (stack.length > 1) history.go(1 - stack.length); return; }
      if (v.ctl && v.ctl(k)) return;
      if (it.length) {
        const cols = v.classList.contains('os-home') ? 2 : 1, d = { up: -cols, down: cols, left: cols > 1 ? -1 : 0, right: cols > 1 ? 1 : 0 }[k];
        if (k === 'a') { if (foc < 0) setFoc(0); else it[foc].click(); } else if (d) { if (foc < 0) setFoc(0); else { const n = foc + d, sameRow = Math.abs(d) !== 1 || Math.floor(n / cols) === Math.floor(foc / cols); if (n >= 0 && n < it.length && sameRow) setFoc(n); } } // at an edge it simply stops
        return;
      }
      if (k === 'up' || k === 'down') v.scrollBy({ top: k === 'up' ? -190 : 190, behavior: 'smooth' });
      else if (k === 'left' || k === 'right') { const b = [...v.querySelectorAll('.os-pn button')].find((q) => q.textContent.includes(k === 'left' ? 'Previous' : 'Next')); if (b) b.click(); }
      else if (k === 'a') { const b = v.querySelector('.os-btn'); if (b) b.click(); }
    }
    const back = () => history.back();
    const view = (title, right, kids) => h('section', 'os-view', [h('div', 'os-head', [btn('os-back', [t('span', '', '‹'), t('b', '', 'Back')], back), t('strong', '', title), t('span', 'os-count', right || '')]), h('div', 'os-body', kids)]);

    // ---- home: the icon menu
    const ICON = ['petar', 'stackadapt', 'oyster', 'cheque', null, 'linkedin'];
    const snakeIcon = () => h('span', 'os-snake', [h('i'), h('i'), h('i'), h('i'), h('i'), h('b')]);
    const home = h('section', 'os-view os-home', [h('div', 'os-grid', SECTIONS.map((sec, n) => btn('os-tile', [h('span', 'os-ico', [ICON[n] ? pic(ICON[n]) : snakeIcon()]), t('b', '', sec.label), t('small', '', sec.blurb)], () => push(section(sec))))),
      h('footer', 'os-foot', [t('p', '', 'Software Engineering, University of Waterloo'), h('nav', '', SECTIONS[5].items.map((it) => { const a = t('a', '', it.label); a.href = it.links[0][1]; a.target = '_blank'; a.rel = 'noopener'; return a; }))])]);
    push(home);

    // ---- a section: its list of entries (or the game, or the contact links)
    function section(sec) {
      if (sec.game) return snakeView();
      if (sec.id === 'contact') return view('Contact', '', [h('div', 'os-links', sec.items.map((it) => btn('os-row', [h('span', 'os-th', [pic(it.img)]), h('span', 'os-rt', [t('b', '', it.label), t('small', '', it.sub)]), t('span', 'os-go', '↗')], () => openUrl(it.links[0][1]))))]);
      return view(sec.label, sec.items.length + (sec.items.length === 1 ? ' entry' : ' entries'), [h('div', 'os-list', sec.items.map((it, i) =>
        btn('os-row', [h('span', 'os-th', [pic(it.thumb || it.img) || t('em', '', it.label[0])]), h('span', 'os-rt', [t('b', '', it.label), t('small', '', (it.kicker || '').replace(/^1ST OVERALL · /, ''))]), it.win ? t('span', 'os-win', '1st') : null, t('span', 'os-go', '›')], () => push(page(sec, i)))))]);
    }

    // ---- one entry, laid out for reading
    function page(sec, i) {
      const it = sec.items[i], n = sec.items.length, kids = [];
      if (it.label === 'Bio') kids.push(pic('photo', 'os-photo'));
      else if (it.img && !it.tight) kids.push(h('div', 'os-hero', [pic(it.img), it.corner2 ? pic(it.corner2) : null]));
      if (it.kicker) kids.push(t('p', 'os-kick', it.kicker));
      kids.push(t('h2', '', it.title)); if (it.sub) kids.push(t('p', 'os-sub', it.sub));
      if (it.scatter) { // the stack: just the technologies, each logo with its name
        const NAME = { t_ts: 'TypeScript', t_react: 'React', t_aws: 'AWS', t_rails: 'Rails', t_graphql: 'GraphQL', t_go: 'Go', t_unity: 'Unity', t_csharp: 'C#', t_python: 'Python', t_dotnet: '.NET', t_firebase: 'Firebase', t_java: 'Java' };
        kids.push(h('div', 'os-stack', it.scatter.map(([k]) => h('span', '', [pic(k), t('b', '', NAME[k] || '')]))));
      } else
      kids.push(it.bullets ? h('ul', '', it.body.map((b) => t('li', '', b))) : h('div', 'os-text', it.body.map((b) => t('p', '', b))));
      if (it.chips) kids.push(h('p', 'os-chips', it.chips.map((c) => t('span', '', c))));
      if (it.shots) kids.push(h('div', 'os-shots' + (it.tall ? ' tall' : ''), it.shots.map((k) => pic(k))));
      const extra = [].concat(it.tight ? [it.img, 'cheque', 'four'] : [], it.gallery ? it.gallery.map((g) => g[0]) : [], it.more || [], it.rowExtra || []).filter((k, q, a) => k && k !== 'huskies' && a.indexOf(k) === q && !(k === it.img && !it.tight)); // (the high-school logo is left off the phone version)
      if (extra.length) kids.push(h('div', 'os-stickers', extra.map((k, q) => { const e = pic(k); if (e) e.style.transform = `rotate(${q % 2 ? 2.5 : -2.5}deg)`; return e; })));
      if (it.links) kids.push(h('div', 'os-btns', it.links.map(([l, u]) => btn('os-btn', [t('span', '', 'Open ' + l), t('i', '', '↗')], () => openUrl(u)))));
      if (n > 1) kids.push(h('div', 'os-pn', [i > 0 ? btn('', [t('small', '', '‹ Previous'), t('b', '', sec.items[i - 1].label)], () => swap(page(sec, i - 1))) : h('span'), i < n - 1 ? btn('', [t('small', '', 'Next ›'), t('b', '', sec.items[i + 1].label)], () => swap(page(sec, i + 1))) : h('span')]));
      return view(sec.label, (i + 1) + ' / ' + n, kids);
    }
    function swap(v) { const was = stack.pop(); stage.append(v); stack.push(v); was.remove(); } // previous / next replace the page in place, so Back still returns to the list

    // ---- Snake: swipe to steer
    function snakeView() {
      const N = 18, cv = h('canvas', 'os-game'); cv.width = cv.height = N * 24; const c = cv.getContext('2d');
      const score = t('b', '', '0'), bestEl = t('span', '', ''), msg = t('p', 'os-gmsg', 'Swipe to start');
      let body, dir, q, food, alive, started, pts, best = +store.get('snake-best') || 0, timer = 0;
      const place = () => { do { food = [Math.random() * N | 0, Math.random() * N | 0]; } while (body.some((b) => b[0] === food[0] && b[1] === food[1])); };
      const draw = () => {
        c.fillStyle = '#f3f5f8'; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = '#e9ecf1';
        for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2) c.fillRect(x * 24, y * 24, 24, 24);
        const cell = (p, pad, col) => { c.fillStyle = col; c.beginPath(); c.roundRect ? c.roundRect(p[0] * 24 + pad, p[1] * 24 + pad, 24 - pad * 2, 24 - pad * 2, 5) : c.rect(p[0] * 24 + pad, p[1] * 24 + pad, 24 - pad * 2, 24 - pad * 2); c.fill(); };
        cell(food, 4, '#e0584d'); body.forEach((b, k) => cell(b, 1.5, k ? '#1aa3b3' : '#0e7f8d'));
        score.textContent = pts; bestEl.textContent = 'Best ' + best; msg.textContent = !alive ? 'Game over. Tap to play again.' : started ? '' : 'Swipe to start';
      };
      const reset = () => { body = [[5, 9], [4, 9], [3, 9]]; dir = [1, 0]; q = []; alive = true; started = false; pts = 0; place(); draw(); };
      const step = () => {
        if (!alive || !started) return; if (q.length) dir = q.shift();
        const hd = [body[0][0] + dir[0], body[0][1] + dir[1]];
        if (hd[0] < 0 || hd[1] < 0 || hd[0] >= N || hd[1] >= N || body.some((b) => b[0] === hd[0] && b[1] === hd[1])) { alive = false; if (pts > best) { best = pts; store.set('snake-best', best); } buzz(); }
        else { body.unshift(hd); if (hd[0] === food[0] && hd[1] === food[1]) { pts++; place(); } else body.pop(); }
        draw();
      };
      const turn = (d) => { const last = q.length ? q[q.length - 1] : dir; if (d[0] !== -last[0] || d[1] !== -last[1]) q.push(d); started = true; };
      let sw = null;
      const v = view('Snake', '', [h('div', 'os-score', [h('span', '', [t('small', '', 'Score '), score]), bestEl]), h('div', 'os-gwrap', [cv, msg])]); v.classList.add('os-snakev'); // the board is sized to whatever room is left, so all of it is always on screen
      v.addEventListener('pointerdown', (e) => { if (e.target.closest('.os-head')) return; sw = { x: e.clientX, y: e.clientY, moved: false }; });
      v.addEventListener('pointermove', (e) => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) { if (alive) turn(Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? 1 : -1, 0] : [0, dy > 0 ? 1 : -1]); sw.x = e.clientX; sw.y = e.clientY; sw.moved = true; draw(); } });
      const end = () => { if (sw && !sw.moved && !alive) reset(); sw = null; };
      v.addEventListener('pointerup', end); v.addEventListener('pointercancel', () => { sw = null; });
      v.classList.add('os-nosel'); reset(); timer = setInterval(step, 120); v.leave = () => clearInterval(timer);
      v.ctl = (k) => { const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k]; if (d) { if (alive) turn(d); draw(); return true; } if (k === 'a') { reset(); return true; } return false; };
      return v;
    }

    // ---- the device: a pocket handheld modelled in 3D and built to the phone's own proportions, so it fills the display.
    // Its screen is the page above (real text, native scrolling); its buttons are real and drive it. It arrives showing its
    // sticker-covered back, turns round, and powers on. Swipe across the body, or press SELECT, to flip it over again.
    if (!renderer) { os.classList.add('full'); startBoot(); return; }
    document.documentElement.classList.add('dev');
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(24, 1, 1, 600), HALF = Math.PI / 2;
    { const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene(); env.background = new THREE.Color(0x2c3036);
      const panel = (w, hh, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
      panel(34, 16, 0, 26, 10, 0xffffff); panel(18, 34, -28, 4, 12, 0xcfe6ee); panel(18, 34, 28, 0, 10, 0xfff0d8); panel(44, 12, 0, -24, 12, 0x4c5660);
      scene.environment = pm.fromScene(env, 0.05).texture; pm.dispose(); }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x90a0b0, 0.5)); { const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(-8, 14, 20); scene.add(dl); }
    const mat = (hex, r, m, extra) => { const mt = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: r, metalness: m }, extra || {})); mt.color.convertSRGBToLinear(); return mt; };
    const flatM = (hex) => new THREE.MeshBasicMaterial({ color: hex });
    const BODY = mat(0xcbc9c1, 0.55, 0.04, { envMapIntensity: 0.7 }), DARK = mat(0x2a2c31, 0.5, 0.1), GLASS = mat(0x5c606d, 0.45, 0.1, { envMapIntensity: 0.6 }), SOFT = mat(0x8a8d95, 0.75, 0.02), INSET = mat(0xb9b7af, 0.6, 0.03), BERRY = mat(0x9a1f56, 0.45, 0.08), NAVY = '#2c3080'; // the classic palette: warm grey shell, slate screen lens, berry buttons, navy print
    const BW = 10, BH = Math.max(15, Math.min(24, BW * (innerHeight * 0.955) / (innerWidth * 0.93))), BT = 1.7; // as tall as the phone allows
    const dev = new THREE.Group(); scene.add(dev);
    const rrect = (w, hh, r, rbr) => { const sh = new THREE.Shape(), x = -w / 2, y = -hh / 2, R = rbr === undefined ? r : rbr; // rounded rectangle; the bottom-right corner can be rounder, as on the classic handhelds
      sh.moveTo(x + r, y); sh.lineTo(x + w - R, y); sh.quadraticCurveTo(x + w, y, x + w, y + R); sh.lineTo(x + w, y + hh - r); sh.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); sh.lineTo(x + r, y + hh); sh.quadraticCurveTo(x, y + hh, x, y + hh - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; };
    const put = (geo, m, x, y, z, par) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); (par || dev).add(o); return o; };
    { const g = new THREE.ExtrudeGeometry(rrect(BW - 0.5, BH - 0.5, 0.8, 2.2), { depth: BT - 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 8, curveSegments: 24 }); g.center(); put(g, BODY, 0, 0, 0); }
    const FZ = BT / 2, SHt = BH * 0.585, bezTop = BH / 2 - 0.62, bezBot = bezTop - SHt;
    put(new THREE.ShapeGeometry(rrect(BW - 1.25, SHt, 0.55, 1.5), 16), GLASS, 0, (bezTop + bezBot) / 2, FZ + 0.012);                 // the dark glass round the screen
    const SX = BW / 2 - 1.12, sTop = bezTop - 0.5, sBot = bezBot + 0.6;                                                            // the screen itself (the page is laid exactly over this)
    put(new THREE.PlaneGeometry(SX * 2, sTop - sBot), flatM(0x000000), 0, (sTop + sBot) / 2, FZ + 0.016);
    const label = (text, px, w, color, weight) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = color; x.font = `${weight || 600} ${px}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; let cx = 256 - (text.length - 1) * 2; x.fillText(text, 256, 34); const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 8; return new THREE.Mesh(new THREE.PlaneGeometry(w, w / 8), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false })); };
    { // the lens: two thin stripes across its top, a small power light on its left edge
      const nm = label('PETAR ISAKOVIC', 46, 5.6, NAVY, 800); nm.position.set(-BW / 2 + 3.5, bezBot - 0.52, FZ + 0.02); dev.add(nm);                 // the name, printed on the shell under the lens
      put(new THREE.PlaneGeometry(BW - 1.6, 0.045), flatM(0xa3a199), 0, BH / 2 - 0.3, FZ + 0.014);                                                   // the groove across the top
      for (const gx of [-BW / 2 + 1.5, BW / 2 - 1.5]) put(new THREE.PlaneGeometry(0.045, 0.3), flatM(0xa3a199), gx, BH / 2 - 0.16, FZ + 0.014); }
    const led = put(new THREE.CircleGeometry(0.1, 16), flatM(0x3a1512), -SX - 0.25, (sTop + sBot) / 2 + 1.2, FZ + 0.02); led.visible = false; // (no power light on the lens: on a phone it just read as a stray dot)
    // controls
    const CZ = bezBot + BH / 2, cy = bezBot - CZ * 0.47, buttons = [];
    const key = (mesh, k, hit) => { mesh.userData = { k, z0: mesh.position.z, p: 0 }; buttons.push(mesh); if (hit) { hit.userData = { k, proxy: mesh }; hits.push(hit); } else hits.push(mesh); return mesh; };
    const hits = [];
    { const DX = -2.35, L = 3.1, Wd = 1.02; // D-pad: one cross, four directions
      put(new THREE.CircleGeometry(L / 2 + 0.28, 40), INSET, DX, cy, FZ + 0.012);
      const cross = new THREE.Group(); cross.position.set(DX, cy, FZ + 0.2); dev.add(cross);
      const bx = (w, hh) => { const g = new THREE.ExtrudeGeometry(rrect(w, hh, 0.16), { depth: 0.34, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 }); g.center(); return g; };
      put(bx(L, Wd), DARK, 0, 0, 0, cross); put(bx(Wd, L), DARK, 0, 0, 0, cross); put(new THREE.CircleGeometry(0.26, 20), mat(0x1a1d22, 0.6, 0.1), 0, 0, 0.24, cross);
      cross.userData = { z0: cross.position.z, p: 0, tilt: [0, 0] }; buttons.push(cross);
      [['up', 0, 1], ['down', 0, -1], ['left', -1, 0], ['right', 1, 0]].forEach(([k, ax, ay]) => { const hm = put(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), DX + ax * 1.08, cy + ay * 1.08, FZ + 0.45); hm.userData = { k, proxy: cross, dir: [ax, ay] }; hits.push(hm); }); }
    { const ax = 3.05, ay = cy + 0.5, bxp = 1.25, byp = cy - 0.45; // A and B, set on a slanted pad
      const pad = put(new THREE.ShapeGeometry(rrect(4.3, 2.05, 1.02), 20), INSET, (ax + bxp) / 2, (ay + byp) / 2, FZ + 0.012); pad.rotation.z = Math.atan2(ay - byp, ax - bxp);
      [['a', ax, ay, 'A'], ['b', bxp, byp, 'B']].forEach(([k, x, y, ch]) => { const g = new THREE.CylinderGeometry(0.8, 0.84, 0.42, 36); g.rotateX(HALF); key(put(g, BERRY, x, y, FZ + 0.2), k);
        const l = label(ch, 56, 3.4, NAVY, 800); l.position.set(x + 0.62, y - 1.12, FZ + 0.02); l.rotation.z = Math.atan2(ay - byp, ax - bxp); dev.add(l); }); } // lettered on the shell, below each button
    [['select', -1.15, 'SELECT'], ['start', 1.15, 'START']].forEach(([k, x, text]) => { // the two rubber keys
      const y = -BH / 2 + CZ * 0.17, g = new THREE.ExtrudeGeometry(rrect(1.45, 0.42, 0.21), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 }); g.center();
      const b = key(put(g, SOFT, x, y, FZ + 0.1), k); b.rotation.z = 0.42; const big = put(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), x, y - 0.1, FZ + 0.4); big.userData = { k, proxy: b }; hits.push(big);
      const l = label(text, 56, 2.5, NAVY, 800); l.position.set(x + 0.22, y - 0.62, FZ + 0.02); l.rotation.z = 0.42; dev.add(l); });
    for (let n = 0; n < 6; n++) { const sl = put(new THREE.ShapeGeometry(rrect(0.2, 1.3, 0.1), 6), mat(0x9f9d95, 0.7, 0.02), BW / 2 - 2.7 + n * 0.36, -BH / 2 + 1.5 + n * 0.16, FZ + 0.012); sl.rotation.z = -0.5; } // speaker
    // back: the stickers
    { // laid out in rows once every picture has loaded and its shape is known: each row is scaled to fit the width, so nothing overlaps
      const ROWS = [['stackadapt', 'heseri', 'voodoo'], ['mlh', 'waterloo', 'ggb'], ['mic', 'soon'], ['cheque', 'four'], ['knight', 'goose', 'proteful', 'zomp'], ['oyster', 'boxhead']].map((r) => r.filter((k) => ST[k])).filter((r) => r.length);
      const load = (k) => new Promise((res) => { const im = new Image(); im.onload = () => res([k, im]); im.onerror = () => res([k, null]); im.src = ST[k]; });
      Promise.all(ROWS.flat().map(load)).then((list) => {
        const IM = Object.fromEntries(list), GAP = 0.42, availW = BW - 1.9, rowH = (BH - 2.2) / ROWS.length - GAP;
        ROWS.forEach((row, r) => {
          const ims = row.map((k) => IM[k]).filter(Boolean), asp = ims.reduce((q, im) => q + im.naturalWidth / im.naturalHeight, 0);
          const hh = Math.min(rowH, (availW - GAP * (ims.length - 1)) / asp), total = asp * hh + GAP * (ims.length - 1), y = BH / 2 - 1.1 - rowH / 2 - r * (rowH + GAP);
          let x = -total / 2;
          ims.forEach((im, n) => { const w = hh * im.naturalWidth / im.naturalHeight, tx = new THREE.Texture(im); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 8; tx.needsUpdate = true;
            const m = put(new THREE.PlaneGeometry(w * 0.94, hh * 0.94), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }), -(x + w / 2), y, -FZ - 0.012); m.rotation.y = Math.PI; m.rotation.z = ((r + n) % 2 ? 1 : -1) * 0.035; x += w + GAP; });
        });
      }); }
    // camera and the page's place on the screen
    const v3 = new THREE.Vector3();
    function fit() {
      const w = innerWidth, hh = innerHeight; renderer.setSize(w, hh, false); cam.aspect = w / hh;
      const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), d = Math.max((BH / 0.955 / 2) / tan, (BW / 0.93 / 2) / (tan * cam.aspect));
      cam.position.set(0, 0, d + FZ); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const px = (x, y) => { v3.set(x, y, FZ + 0.016).project(cam); return [(v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * hh]; };
      const [l, tp] = px(-SX, sTop), [r, bt] = px(SX, sBot);
      Object.assign(os.style, { left: l + 'px', top: tp + 'px', width: (r - l) + 'px', height: (bt - tp) + 'px' });
    }
    addEventListener('resize', fit); fit();
    window.__pocket = { at(k) { const o = hits.find((q) => q.userData.k === k); dev.updateWorldMatrix(true, true); o.getWorldPosition(v3).project(cam); return [(v3.x * 0.5 + 0.5) * innerWidth, (-v3.y * 0.5 + 0.5) * innerHeight]; } }; // where a button is on the page (for tests)
    // turning it over, pressing its buttons
    let rot = Math.PI * 3, rotT = 0, landed = false, landT = 0, drag = null, intro = 0;
    onCheat = () => { rot = Math.PI * 4; rotT = 0; }; // the cheat spins the device twice
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const pickAt = (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.intersectObjects(hits, false)[0]; };
    const press = (ud) => { buzz(); const b = ud.proxy || null; if (b) { b.userData.p = 1; if (ud.dir) b.userData.tilt = ud.dir; } if (ud.k === 'select') { rotT = Math.abs(rotT) < 0.1 ? Math.PI : 0; return; } ctl(ud.k); };
    canvas.addEventListener('pointerdown', (e) => {
      if (!landed) return;
      const front = Math.abs(rot) < 0.2, hit = front ? pickAt(e) : null;
      if (hit) { const ud = hit.object.userData; if (!ud.proxy) hit.object.userData.p = 1; press(ud); return; }
      drag = { x: e.clientX, r: rot, moved: false }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    });
    canvas.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true; if (drag.moved) rot = rotT = drag.r + dx * (Math.PI / (innerWidth * 0.8)); });
    const up = () => { if (!drag) return; const d = drag; drag = null; if (!d.moved) { if (Math.abs(rot) > 0.5) rotT = 0; return; } const turns = Math.round(rot / Math.PI); rotT = turns * Math.PI; if (Math.abs(turns) % 2 === 0) { rot -= rotT; rotT = 0; } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    let lastT = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      if (!landed) { // arrival: it comes up from below, back first, and turns to face you
        // it is thrown in from far off, tumbling so the stickers on its back flash past, overshoots a little as it arrives, and lands
        intro = Math.min(1, intro + dt / (reduced ? 0.01 : 2.1)); const e = 1 - Math.pow(1 - intro, 3), q = intro - 1, back = 1 + 2.70158 * q * q * q + 1.70158 * q * q;
        rot = Math.PI * 3 * (1 - e); dev.rotation.x = 1.1 * (1 - e) * Math.cos(intro * 5); dev.rotation.z = -0.5 * (1 - e);
        dev.position.set(BW * 0.9 * (1 - e) * (1 - e), -BH * 0.55 * (1 - e) * (1 - e), 0); dev.scale.setScalar(0.16 + 0.84 * back);
        if (intro >= 1) { landed = true; landT = now; rot = rotT = 0; dev.position.set(0, 0, 0); dev.scale.setScalar(1); dev.rotation.x = 0; dev.rotation.z = 0; led.material.color.setHex(0xff4b3a); startBoot(); }
      } else if (!drag) rot += (rotT - rot) * (1 - Math.exp(-dt * 9));
      dev.rotation.y = rot;
      if (landed && !reduced) { const w = (now - landT) / 1000; dev.rotation.x = w < 1.4 ? Math.sin(w * 19) * Math.exp(-w * 4.5) * 0.085 : 0; dev.position.y = w < 1.4 ? -Math.abs(Math.sin(w * 9.5)) * Math.exp(-w * 5) * 0.5 : 0; } // the landing: a short, settling rock
      const facing = landed && Math.abs(rot) < 0.035; if (os.classList.contains('face') !== facing) os.classList.toggle('face', facing);
      for (const b of buttons) { const u = b.userData; if (u.p > 0.002) { u.p *= Math.exp(-dt * 11); b.position.z = u.z0 - 0.13 * u.p; if (u.tilt) { b.rotation.x = -u.tilt[1] * 0.12 * u.p; b.rotation.y = u.tilt[0] * 0.12 * u.p; } } }
      renderer.render(scene, cam);
    })(lastT);
  }

  /* ======================= screens (2D canvases used as textures) ======================= */
  const TW = 800, TH = 480, BW = 640, BH = 480;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const topCv = mk(TW, TH), botCv = mk(BW, BH);
  let tc = topCv.getContext('2d'); const bc = botCv.getContext('2d');
  const topTex = new THREE.CanvasTexture(topCv), botTex = new THREE.CanvasTexture(botCv);
  [topTex, botTex].forEach((t) => { t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); const mips = !phone.matches; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.generateMipmaps = mips; }); // (phones show the screens close to full size, and building mipmaps on every update is costly there) // mipmaps: the screens are usually drawn smaller than their canvases

  const S = { sec: null, i: 0, home: 0, booted: false, changed: 0 };
  let regions = []; // tappable areas on the bottom screen, in canvas px

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function font(c, weight, size) { c.font = `${weight} ${size}px ${FONT}`; }
  function wrap(c, text, maxW) {
    const out = []; let line = '';
    for (const w of text.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
  function spaced(c, text, x, y, gap) { // letter-spaced caps
    for (const ch of text) { c.fillText(ch, x, y); x += c.measureText(ch).width + gap; }
    return x;
  }
  const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  // Screen look: a light system UI, like a handheld's own menus. White tiles, hairlines, dark text, one teal highlight.
  const INK = '#2a2d33', MUTE = '#7a808a', SOFT = '#4a4f57', LINE = '#d6dae0', TILE = '#ffffff', ACC = '#1aa3b3', TINT = '#e3f4f6';
  const PICS = {};
  Object.keys(window.STICKERS || {}).forEach((k) => { const im = new Image(); im.onload = () => redraw(); im.src = window.STICKERS[k]; PICS[k] = im; });
  const pic = (k) => (k && PICS[k] && PICS[k].naturalWidth ? PICS[k] : null);

  // Stereo 3D for the top screen (red/cyan glasses). Each layer gets a depth; the two eyes see it shifted apart.
  let eye = 0, depth3d = 0;                       // eye: -1 left, +1 right, 0 flat. depth3d: the slider, 0..1
  const mainTc = tc, eyeCx = [mk(TW, TH), mk(TW, TH)].map((c) => c.getContext('2d'));
  const layer = (z) => tc.setTransform(1, 0, 0, 1, -eye * z * 9 * depth3d, 0); // z > 0 pops out, z < 0 sinks in

  function backdrop(c, W, H) {
    c.globalAlpha = 1;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f8f9fb'); g.addColorStop(1, '#e3e6eb');
    c.fillStyle = g; c.fillRect(-24, 0, W + 48, H);
  }
  function bar(c, W, left, right) { // the strip along the top of each screen
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#f2f4f7'; c.fillRect(0, 0, W, 42); c.fillStyle = LINE; c.fillRect(0, 42, W, 1.5);
    c.textAlign = 'left'; c.fillStyle = INK; font(c, 500, 15.5); c.fillText(left, 20, 27);
    c.textAlign = 'right'; c.fillStyle = MUTE; font(c, 400, 14.5); c.fillText(right, W - 20, 27);
    c.textAlign = 'left';
  }
  function status(title) {
    const d = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    bar(tc, TW - 38, title, d + '   ' + clock());
    tc.fillStyle = '#f2f4f7'; tc.fillRect(TW - 38, 0, 38, 42); tc.fillStyle = LINE; tc.fillRect(TW - 38, 42, 38, 1.5);
    tc.strokeStyle = MUTE; tc.lineWidth = 1.5; rr(tc, TW - 46, 15, 24, 12, 3); tc.stroke();
    tc.fillStyle = MUTE; tc.fillRect(TW - 43, 18, 14, 6); tc.fillRect(TW - 21, 19, 2.5, 4);
  }
  function topFrame(color, title) { backdrop(tc, TW, TH); status(title); }
  // Shrinking a big image to icon size in one step skips most of its pixels and looks rough. Halve it in steps instead
  // (cached per image), then draw from the copy closest to the size needed.
  const MIPS = new Map();
  function mip(im, w) {
    let lv = MIPS.get(im); if (!lv) { lv = [im]; MIPS.set(im, lv); }
    let i = 0, cw = im.naturalWidth || im.width;
    while (cw / 2 >= w && cw > 16) {
      i++; cw /= 2;
      if (!lv[i]) {
        const pv = lv[i - 1], cv = mk(Math.max(1, Math.round((pv.naturalWidth || pv.width) / 2)), Math.max(1, Math.round((pv.naturalHeight || pv.height) / 2))), x = cv.getContext('2d');
        x.imageSmoothingQuality = 'high'; x.drawImage(pv, 0, 0, cv.width, cv.height); lv[i] = cv;
      }
    }
    return lv[i];
  }
  const fitPic = (c, im, cx, cy, w, h) => { if (!im) return; const s = Math.min(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s; c.imageSmoothingQuality = 'high'; c.drawImage(mip(im, dw), cx - dw / 2, cy - dh / 2, dw, dh); };
  function drawPic(im, cx, cy, bw, bh, t, a, shadow) {
    const s = Math.min(bw / im.naturalWidth, bh / im.naturalHeight) * (0.92 + 0.08 * a);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    tc.save(); tc.globalAlpha = a;
    if (shadow) { tc.fillStyle = 'rgba(0,0,0,.13)'; tc.beginPath(); tc.ellipse(cx, cy + bh / 2 + 10, w * 0.34, 7, 0, 0, 7); tc.fill(); }
    tc.translate(cx, cy + Math.sin(t * 1.4) * (shadow ? 3 : 1.5));
    tc.imageSmoothingQuality = 'high'; tc.drawImage(mip(im, w), -w / 2, -h / 2, w, h);
    tc.restore();
  }
  const hint = (label) => { // "A  Open ..." along the bottom of the top screen
    tc.fillStyle = LINE; tc.fillRect(44, onPhone() ? 410 : 418, TW - 88, 1.5);
    if (onPhone()) { tc.fillStyle = INK; tc.beginPath(); tc.arc(60, 444, 16, 0, 7); tc.fill(); tc.fillStyle = '#fff'; font(tc, 600, 19); tc.textAlign = 'center'; tc.fillText('A', 60, 451); tc.textAlign = 'left'; tc.fillStyle = MUTE; font(tc, 400, 23); tc.fillText(label, 88, 452); return; }
    tc.fillStyle = INK; tc.beginPath(); tc.arc(55, 446, 11, 0, 7); tc.fill();
    tc.fillStyle = '#fff'; font(tc, 600, 13); tc.textAlign = 'center'; tc.fillText('A', 55, 451); tc.textAlign = 'left';
    tc.fillStyle = MUTE; font(tc, 400, 15); tc.fillText(label, 76, 451);
  };

  function heroTop(t, a) { // About: photo, name, and a plain list of where he is now
    layer(-1); backdrop(tc, TW, TH); layer(0); status('About');
    layer(1.0);
    const PX = 44, PY = 84, PW = 200, PH = 252, ph = pic('photo');
    tc.save(); rr(tc, PX, PY, PW, PH, 10); tc.clip(); tc.fillStyle = '#dfe3e8'; tc.fillRect(PX, PY, PW, PH);
    if (ph) { const sh = ph.naturalHeight / 1.04, sw = sh * PW / PH; tc.globalAlpha = a; tc.drawImage(ph, (ph.naturalWidth - sw) / 2, (ph.naturalHeight - sh) * 0.3, sw, sh, PX, PY, PW, PH); tc.globalAlpha = 1; }
    tc.restore();
    layer(0.5); const X = 272 + (1 - a) * 14; tc.globalAlpha = a;
    if (onPhone()) { // phone: fewer, larger lines
      tc.fillStyle = INK; font(tc, 600, 50); tc.fillText('Petar Isakovic', X - 2, 134);
      tc.fillStyle = MUTE; font(tc, 400, 23); tc.fillText('Software engineer in Waterloo, Ontario', X, 168);
      [['stackadapt', 'SWE Intern', 'StackAdapt · Sep 2026 – now'], ['waterloo', 'Software Engineering', 'University of Waterloo · 2024 – 2029']].forEach(([k, l1, l2], i) => {
        const y = 196 + i * 96;
        tc.fillStyle = LINE; tc.fillRect(X, y, 756 - X, 1.5);
        fitPic(tc, pic(k), X + 28, y + 48, 54, 54);
        tc.fillStyle = INK; font(tc, 600, 27); tc.fillText(l1, X + 70, y + 42);
        tc.fillStyle = MUTE; font(tc, 400, 21); tc.fillText(l2, X + 70, y + 72);
      });
      tc.globalAlpha = 1; layer(0); hint('Open About'); return;
    }
    tc.fillStyle = INK; font(tc, 600, 40); tc.fillText('Petar Isakovic', X - 1, 128);
    tc.fillStyle = MUTE; font(tc, 400, 16.5); tc.fillText('Software engineer in Waterloo, Ontario', X, 156);
    [['stackadapt', 'Software Engineering Intern', 'StackAdapt', 'Sep 2026 – now'], ['waterloo', 'Software Engineering', 'University of Waterloo', '2024 – 2029']].forEach(([k, l1, l2, when], i) => {
      const y = 184 + i * 70;
      tc.fillStyle = LINE; tc.fillRect(X, y, 756 - X, 1.5);
      fitPic(tc, pic(k), X + 20, y + 34, 38, 38);
      tc.fillStyle = INK; font(tc, 600, 17); tc.fillText(l1, X + 52, y + 30);
      tc.fillStyle = MUTE; font(tc, 400, 14.5); tc.fillText(l2, X + 52, y + 50);
      tc.textAlign = 'right'; font(tc, 400, 14); tc.fillText(when, 756, y + 30); tc.textAlign = 'left';
    });
    tc.globalAlpha = 1; layer(0);
    hint('Open About');
  }

  // Home works like a console menu: the icon you are on decides what the top screen shows.
  const HOME_ICON = ['petar', 'stackadapt', 'oyster', 'cheque', null, 'linkedin'];
  const HOME_ART = [
    null, // About uses the profile screen
    { title: 'Work', sub: ['Three internships: StackAdapt, Zomp', 'and Heseri Games.'], pics: [['stackadapt', 498, 142, 116, -0.1], ['voodoo', 640, 118, 84, 0.1], ['waterloo', 734, 208, 90, -0.07], ['zomp', 566, 262, 94, 0.08], ['heseri', 668, 348, 186, -0.05], ['goose', 462, 338, 94, 0.1]] },
    { title: 'Projects', sub: ['Ten projects. Three of them took', 'first place at hackathons.'], pics: [['oyster', 528, 150, 178, -0.06], ['boxhead', 706, 152, 118, 0.08], ['proteful', 470, 312, 90, 0.1], ['knight', 578, 332, 82, -0.09], ['pac', 676, 300, 84, 0.08], ['mvc_icon', 744, 362, 68, -0.1]] },
    { title: 'Awards', sub: ['Four first-place hackathon finishes', 'and four scholarships.'], pics: [['soon', 594, 148, 280, -0.04], ['cheque', 506, 322, 188, 0.05], ['four', 682, 316, 148, -0.06]] },
    { title: 'Snake', sub: ['A quick game. Steer with the D-pad,', 'press A to restart.'], snake: true },
    { title: 'Contact', sub: ['LinkedIn, GitHub, X and Devpost.'], pics: [['linkedin', 492, 172, 110, -0.08], ['github', 632, 132, 102, 0.07], ['xlogo', 566, 312, 96, 0.06], ['devpost', 712, 272, 106, -0.06]] },
  ];
  function drawHomeTop(t, a) {
    const art = HOME_ART[S.home];
    if (!art) { heroTop(t, a); return; }
    layer(-1); backdrop(tc, TW, TH); layer(0); status(art.title);
    layer(1.4);
    (art.pics || []).forEach(([k, cx, cy, w, rot], i) => {
      const im = pic(k); if (!im) return;
      const on = Math.max(0, Math.min(1, a * 1.8 - i * 0.12)); // they land one after another
      tc.save(); tc.translate(cx, cy); tc.rotate((rot || 0) + Math.sin(t * 0.8 + i * 1.3) * 0.012); tc.scale(1 + 0.2 * (1 - on), 1 + 0.2 * (1 - on));
      tc.shadowColor = 'rgba(30,40,55,.2)'; tc.shadowBlur = 10; tc.shadowOffsetY = 4;
      drawPic(im, 0, 0, w, w, t + i * 1.7, on, false); tc.restore();
    });
    if (art.snake) { // a small game board, with a snake doing laps and eating the apple
      const CS = 22, NX = 13, NY = 12, BX = 756 - NX * CS, BY = 100;
      tc.save(); tc.globalAlpha = a;
      tc.shadowColor = 'rgba(30,40,55,.14)'; tc.shadowBlur = 18; tc.shadowOffsetY = 5;
      tc.fillStyle = TILE; rr(tc, BX - 8, BY - 8, NX * CS + 16, NY * CS + 16, 12); tc.fill();
      tc.shadowColor = 'transparent';
      rr(tc, BX, BY, NX * CS, NY * CS, 6); tc.clip();
      tc.fillStyle = '#f3f5f8'; tc.fillRect(BX, BY, NX * CS, NY * CS);
      tc.fillStyle = '#e9ecf1';
      for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) if ((x + y) % 2) tc.fillRect(BX + x * CS, BY + y * CS, CS, CS);
      const path = []; // a closed loop of cells around the board
      for (let x = 2; x <= 10; x++) path.push([x, 2]);
      for (let y = 3; y <= 9; y++) path.push([10, y]);
      for (let x = 9; x >= 2; x--) path.push([x, 9]);
      for (let y = 8; y >= 3; y--) path.push([2, y]);
      const L = path.length, head = Math.floor(t * 7) % L, apple = path[(Math.floor(head / 10) * 10 + 9) % L];
      const cell = (c, pad, r, col) => { tc.fillStyle = col; rr(tc, BX + c[0] * CS + pad, BY + c[1] * CS + pad, CS - pad * 2, CS - pad * 2, r); tc.fill(); };
      if (apple !== path[head]) cell(apple, 4, 4, '#e0584d');
      for (let i = 6; i >= 0; i--) cell(path[(head - i + L) % L], 1.5, 4, i ? ACC : '#0e7f8d');
      tc.restore();
    }
    layer(0.6); const X = 44 + (1 - a) * 14; tc.globalAlpha = a;
    if (onPhone()) {
      tc.fillStyle = INK; font(tc, 600, 62); tc.fillText(art.title, X - 3, 170);
      tc.fillStyle = MUTE; font(tc, 400, 26); wrap(tc, art.sub.join(' '), 400).forEach((s, i) => tc.fillText(s, X, 218 + i * 36));
    } else {
    tc.fillStyle = INK; font(tc, 600, 46); tc.fillText(art.title, X - 2, 180);
    tc.fillStyle = MUTE; font(tc, 400, 18.5); art.sub.forEach((s, i) => tc.fillText(s, X, 218 + i * 27));
    }
    tc.globalAlpha = 1; layer(0);
    hint('Open ' + art.title);
  }

  function shotFrame(g, x, y, w, h, a) { // a screenshot in a thin rounded frame
    tc.save(); tc.globalAlpha = a;
    tc.shadowColor = 'rgba(30,40,55,.2)'; tc.shadowBlur = 14; tc.shadowOffsetY = 4; tc.fillStyle = '#fff'; rr(tc, x, y, w, h, 9); tc.fill();
    tc.shadowColor = 'transparent'; rr(tc, x, y, w, h, 9); tc.clip(); tc.imageSmoothingQuality = 'high'; tc.drawImage(mip(g, w), x, y, w, h); tc.restore();
    tc.save(); tc.globalAlpha = a; tc.strokeStyle = 'rgba(42,45,51,.22)'; tc.lineWidth = 1.2; rr(tc, x, y, w, h, 9); tc.stroke(); tc.restore();
  }
  // Phone: the same page set in much larger type. It runs longer than the screen, so it scrolls (drag the top screen).
  let padScroll = 0, padMax = 0, padKey = '';
  function phoneCard(it, sec, t, a) {
    tc.setTransform(1, 0, 0, 1, 0, 0); backdrop(tc, TW, TH); status(sec.label);
    const kk = sec.id + '|' + S.i; if (kk !== padKey) { padKey = kk; padScroll = 0; }
    const X = 36, W = TW - 72 - 12, multi = it.gallery || it.tight, im = multi ? null : pic(it.img), IW = im ? 112 : 0;
    tc.save(); tc.beginPath(); tc.rect(0, 43.5, TW, TH - 43.5); tc.clip(); tc.translate(0, -padScroll); tc.globalAlpha = a;
    let y = 94;
    font(tc, 600, 19); tc.fillStyle = MUTE; spaced(tc, it.kicker || '', X, y, 1.6);
    if (im) fitPic(tc, im, X + W - 50, 124, 100, 100);
    if (im && pic(it.corner2)) fitPic(tc, pic(it.corner2), X + W - 50, 60 + 124 + 14, 64, 64);
    let size = 52; font(tc, 600, size);
    while (tc.measureText(it.title).width > W - IW && size > 32) { size -= 2; font(tc, 600, size); }
    y += 56; tc.fillStyle = INK; tc.fillText(it.title, X - 1, y);
    if (it.sub) { font(tc, 400, 24); tc.fillStyle = MUTE; wrap(tc, it.sub, W - IW).forEach((ln) => { y += 33; tc.fillText(ln, X, y); }); }
    y += 52; font(tc, 400, 27);
    for (const p of it.body) {
      if (it.bullets) { tc.fillStyle = MUTE; tc.beginPath(); tc.arc(X + 7, y - 9, 4.5, 0, 7); tc.fill(); }
      tc.fillStyle = SOFT;
      wrap(tc, p, W - (it.bullets ? 30 : 0)).forEach((ln) => { tc.fillText(ln, X + (it.bullets ? 30 : 0), y); y += 38; });
      y += it.bullets ? 12 : 18;
    }
    if (it.chips) { tc.fillStyle = LINE; tc.fillRect(X, y - 22, W, 1.5); font(tc, 500, 21); tc.fillStyle = MUTE; wrap(tc, it.chips.join('  ·  '), W).forEach((ln) => { y += 16; tc.fillText(ln, X, y); y += 16; }); y += 22; }
    if (it.scatter) { // the logo stickers, in loose rows
      const per = 5, cw = W / per;
      it.scatter.forEach(([k, , , , rot], n) => { const g = pic(k); if (!g) return; tc.save(); tc.translate(X + cw * (n % per + 0.5), y + 40 + Math.floor(n / per) * 112 + (n % 2 ? 8 : -6)); tc.rotate(rot); tc.shadowColor = 'rgba(30,40,55,.22)'; tc.shadowBlur = 9; tc.shadowOffsetY = 3; fitPic(tc, g, 0, 0, 96, 96); tc.restore(); });
      y += Math.ceil(it.scatter.length / per) * 112 + 16;
    }
    if (multi) { // the photos, side by side under the text
      const ks = it.gallery ? it.gallery.map((g) => g[0]) : [it.img, 'cheque', 'four'], cw = W / ks.length;
      ks.forEach((k, n) => { const g = pic(k); if (g) fitPic(tc, g, X + cw * (n + 0.5), y + 84, cw - 16, 180); });
      y += 196;
    }
    (it.more || []).concat(it.rowExtra || []).forEach((k) => { const g = pic(k); if (!g) return; const h = Math.min(300, W * g.naturalHeight / g.naturalWidth); fitPic(tc, g, X + W / 2, y + h / 2, W, h); y += h + 22; });
    if (it.shots) { // screenshots: wide ones stacked full width, phone ones side by side
      const ims = it.shots.map(pic).filter(Boolean);
      if (it.tall) { const w = Math.min(300, (W - 16 * (ims.length - 1)) / ims.length); let mh = 0; ims.forEach((g, n) => { const h = w * g.naturalHeight / g.naturalWidth; shotFrame(g, X + n * (w + 16), y, w, h, a); mh = Math.max(mh, h); }); y += mh + 34; }
      else ims.forEach((g) => { const h = W * g.naturalHeight / g.naturalWidth; shotFrame(g, X, y, W, h, a); y += h + 20; });
      y += 14;
    }
    if (it.links) { font(tc, 400, 22); tc.fillStyle = MUTE; tc.fillText('Links are on the touch screen below.', X, y + 6); y += 34; }
    tc.restore(); tc.globalAlpha = 1;
    padMax = Math.max(0, y + 10 - TH); padScroll = Math.min(padScroll, padMax);
    if (padMax > 0) {
      const tr = TH - 60, th = Math.max(46, tr * TH / (TH + padMax));
      tc.fillStyle = 'rgba(42,45,51,.28)'; rr(tc, TW - 13, 52 + (tr - th) * (padScroll / padMax), 6, th, 3); tc.fill();
      if (padScroll < padMax - 4) { // more below
        const g = tc.createLinearGradient(0, TH - 70, 0, TH); g.addColorStop(0, 'rgba(232,235,239,0)'); g.addColorStop(1, 'rgba(232,235,239,1)');
        tc.fillStyle = g; tc.fillRect(0, TH - 70, TW - 20, 70);
        tc.strokeStyle = MUTE; tc.lineWidth = 3; tc.lineCap = 'round'; tc.beginPath(); const by = TH - 22 + Math.sin(t * 3) * 3; tc.moveTo(TW / 2 - 12, by - 6); tc.lineTo(TW / 2, by + 5); tc.lineTo(TW / 2 + 12, by - 6); tc.stroke();
      }
    }
  }
  function drawCard(it, sec, t, a) {
    if (onPhone() && !it.stats) { phoneCard(it, sec, t, a); return; }
    padMax = 0;
    layer(-1); backdrop(tc, TW, TH); layer(0); status(sec.label); layer(0.5);
    const row = it.shots && !it.tall, col = it.shots && it.tall; // product screenshots: a row under the text, or (phone screenshots) a column beside it
    const im = pic(it.img), wide = im && (it.tight || it.gallery), corner = im && !wide && (it.bullets || it.corner || row), side = im && !wide && !corner && !col;
    const X = 44 + (1 - a) * 14, FULL = TW - 88;
    tc.globalAlpha = a;
    if (it.stats) {
      it.stats.forEach(([n, l], i) => {
        const x = X + (i % 2) * 360, y = 150 + Math.floor(i / 2) * 160;
        tc.fillStyle = INK; font(tc, 600, 54); tc.fillText(n.replace('×', ''), x - 2, y);
        tc.fillStyle = MUTE; font(tc, 400, 16);
        wrap(tc, l, 310).forEach((ln, k) => tc.fillText(ln, x, y + 28 + k * 21));
      });
      tc.globalAlpha = 1; layer(0); return;
    }
    let y = row ? 84 : 90;
    font(tc, 600, 12.5); tc.fillStyle = MUTE; spaced(tc, it.kicker || '', X, y, 1.2);
    const TWD = side || col ? 400 : corner ? FULL - 130 : FULL, MW = it.mw ? it.mw : side ? 400 : col ? 390 : wide ? 380 : it.scatter ? 392 : corner && row ? FULL - 120 : FULL;
    let size = row ? 36 : 40; font(tc, 600, size);
    while (tc.measureText(it.title).width > TWD && size > 26) { size -= 2; font(tc, 600, size); }
    y += row ? 40 : 46; tc.fillStyle = INK; tc.fillText(it.title, X - 1, y);
    if (it.sub) { y += 28; font(tc, 400, 17); tc.fillStyle = MUTE; tc.fillText(it.sub, X, y); }
    y += it.tight ? 34 : row ? 36 : 42;
    const fs = it.bullets ? 18.5 : 20, lh = it.bullets ? 27 : 30;
    font(tc, 400, fs);
    for (const p of it.body) {
      const lines = wrap(tc, p, MW - (it.bullets ? 22 : 0));
      if (it.bullets) { tc.fillStyle = MUTE; tc.beginPath(); tc.arc(X + 5, y - 6, 3, 0, 7); tc.fill(); }
      tc.fillStyle = SOFT;
      lines.forEach((ln) => { tc.fillText(ln, X + (it.bullets ? 22 : 0), y); y += lh; });
      y += it.bullets ? (it.tight ? 2 : 6) : 10;
    }
    tc.globalAlpha = 1;
    layer(1.4);
    if (it.scatter) it.scatter.forEach(([k, x, y, sz, rot], n) => { // stickers pop on one after another, each at its own angle
      const g = pic(k); if (!g) return;
      const on = Math.max(0, Math.min(1, a * 2.2 - n * 0.09)), pop = 1 + 0.25 * (1 - on);
      tc.save(); tc.globalAlpha = on; layer(1.0 + (n % 3) * 0.35);
      tc.translate(x, y + Math.sin(t * 1.2 + n * 1.3) * 1.5); tc.rotate(rot + Math.sin(t * 0.9 + n) * 0.012); tc.scale(pop, pop);
      tc.shadowColor = 'rgba(30,40,55,.22)'; tc.shadowBlur = 9; tc.shadowOffsetY = 3;
      fitPic(tc, g, 0, 0, sz, sz); tc.restore();
    });
    layer(1.4);
    if (side) drawPic(im, 624, 232, 250, 250, t, a, true);
    if (corner) drawPic(im, TW - 44 - 50, 112, 100, 100, t, a, false);
    if (corner && pic(it.corner2)) drawPic(pic(it.corner2), TW - 44 - 100 - 46, 112, 60, 60, t + 1.7, a, false);
    if (wide && it.gallery) { it.gallery.forEach(([k, cx, cy, w, h], i) => { const g = pic(k); if (g) drawPic(g, cx, cy, w, h, t + i * 1.7, a, false); }); }
    else if (wide) { // a short list on the left, the team photos beside it
      drawPic(im, 604, 176, 300, 170, t, a, false);
      const p2 = pic('cheque'), p3 = pic('four');
      if (p2) drawPic(p2, 534, 330, 180, 150, t + 1.7, a, false);
      if (p3) drawPic(p3, 690, 334, 140, 140, t + 3.1, a, false);
    }
    if (it.shots) {
      const ims = it.shots.map(pic).filter(Boolean); layer(0.9);
      if (row) { // as tall as fits: the space under the text, and the row's total width (leaving room for a sticker at the end, if any)
        const ex = pic(it.rowExtra), asp = ims.reduce((q, g) => q + g.naturalWidth / g.naturalHeight, 0);
        const top = y - 14, h = Math.min(190, 404 - top, (FULL - 14 * (ims.length - 1) - (ex ? 240 : 0)) / asp); let x = 44;
        ims.forEach((g) => { const w = g.naturalWidth * h / g.naturalHeight; shotFrame(g, x, top, w, h, a); x += w + 14; });
        if (ex) { layer(1.4); drawPic(ex, (x + 756) / 2, top + h / 2, 756 - x, h + 16, t, a, false); }
      }
      else { let x = 756; ims.slice().reverse().forEach((g) => { const w = g.naturalWidth * 300 / g.naturalHeight; x -= w; shotFrame(g, x, 84, w, 300, a); x -= 14; });
        if (im && !wide && y < 322) { layer(1.4); drawPic(im, 134, (y + 396) / 2, 180, 392 - y, t, a, false); } }
    }
    layer(0);
    if (it.chips || it.links) { tc.fillStyle = LINE; tc.fillRect(44, 418, FULL, 1.5); }
    if (it.chips) { font(tc, 400, 14.5); tc.fillStyle = MUTE; tc.fillText(it.chips.join('  ·  '), 44, 451); }
    if (it.links) {
      const label = 'Open ' + it.links[0][0]; font(tc, 400, 15);
      const w = tc.measureText(label).width;
      tc.fillStyle = MUTE; tc.textAlign = 'right'; tc.fillText(label, TW - 44, 451); tc.textAlign = 'left';
      tc.fillStyle = INK; tc.beginPath(); tc.arc(TW - 44 - w - 20, 446, 11, 0, 7); tc.fill();
      tc.fillStyle = '#fff'; font(tc, 600, 13); tc.textAlign = 'center'; tc.fillText('A', TW - 44 - w - 20, 451); tc.textAlign = 'left';
    }
  }

  // power-on sequence: both screens come up white, the wordmark fades in, then it cuts to the home screen
  const BOOT = 2.6;
  const isBooting = () => !reduced && S.booted && performance.now() / 1000 - S.bootAt < BOOT;
  const ramp = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
  function bootScreen(c, W, H, u, top) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.globalAlpha = ramp(u, 0.05, 0.4); c.fillStyle = '#f3f4f6'; c.fillRect(0, 0, W, H);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    if (top) {
      const k = ramp(u, 0.45, 1.0), e = 1 - Math.pow(1 - k, 3);
      c.globalAlpha = e; c.fillStyle = INK; font(c, 600, 50);
      c.fillText('Petar Isakovic', W / 2, H / 2 + 6 + (1 - e) * 12);
      c.fillStyle = ACC; c.fillRect(W / 2 - 130 * ramp(u, 0.8, 1.4), H / 2 + 28, 260 * ramp(u, 0.8, 1.4), 3);
    } else {
      c.globalAlpha = ramp(u, 0.7, 1.1); c.fillStyle = MUTE; font(c, 400, 18);
      c.fillText('Starting up', W / 2, H / 2 - 4);
      for (let i = 0; i < 3; i++) { c.globalAlpha = ramp(u, 0.7, 1.1) * (0.25 + 0.75 * Math.max(0, Math.sin(u * 5 - i * 0.9))); c.fillStyle = ACC; c.beginPath(); c.arc(W / 2 - 16 + i * 16, H / 2 + 26, 4, 0, 7); c.fill(); }
    }
    c.globalAlpha = ramp(u, BOOT - 0.4, BOOT - 0.05); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.globalAlpha = 1; c.textAlign = 'left';
  }

  function toast(text) { S.toast = { text, until: performance.now() / 1000 + 2.4 }; if (reduced) setTimeout(drawTop, 2500); drawTop(); }
  const music = { on: false, title: '', by: '', p: 0 }; // what the headphone jack is playing, shown in the top screen's bar
  function paintSecret(t) { // the Konami code: every sticker rains down the top screen
    const u = performance.now() / 1000 - secret.at;
    if (u < 0 || u > SECRET_FOR || !S.booted || isBooting()) return;
    const fade = reduced ? 1 : Math.min(1, u / 0.3) * Math.min(1, (SECRET_FOR - u) / 0.6);
    tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = fade * 0.9; tc.fillStyle = '#12343b'; tc.fillRect(0, 0, TW, TH);
    if (reduced) { // no page-wide burst in reduced motion, so the screen shows a still scatter instead
      const ks = Object.keys(PICS).filter((k) => !k.startsWith('s_') && k !== 'photo' && pic(k));
      for (let n = 0; n < 24; n++) { tc.save(); tc.translate(30 + (n * 173) % 740, 40 + (n * 97) % 420); tc.rotate(n); fitPic(tc, pic(ks[n % ks.length]), 0, 0, 74, 74); tc.restore(); }
    }
    tc.globalAlpha = fade; tc.textAlign = 'center';
    tc.fillStyle = 'rgba(18,52,59,.82)'; rr(tc, TW / 2 - 210, 176, 420, 128, 18); tc.fill();
    tc.fillStyle = '#fff'; font(tc, 700, 40); tc.fillText('Cheat unlocked', TW / 2, 236);
    tc.fillStyle = '#9fe3ea'; font(tc, 500, 19); tc.fillText('↑ ↑ ↓ ↓ ← → ← → B A Start   ·   +30 lives', TW / 2, 274);
    tc.textAlign = 'left'; tc.globalAlpha = 1;
  }
  function paintTop(t, a) {
    paintBody(t, a); paintSecret(t);
    if (music.on && S.booted && !isBooting()) {
      tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = 1; tc.textAlign = 'left';
      font(tc, 500, 14.5); const label = music.title + '  ·  ' + music.by, w = tc.measureText(label).width, x0 = (TW - w - 30) / 2;
      tc.fillStyle = '#f2f4f7'; tc.fillRect(x0 - 12, 6, w + 54, 32);
      tc.fillStyle = ACC; for (let n = 0; n < 4; n++) { const h = music.paused ? 5 : 5 + 11 * Math.abs(Math.sin(t * (3.1 + n * 0.9) + n * 1.7)); rr(tc, x0 + n * 5.5, 30 - h, 3.5, h, 1.5); tc.fill(); } // little level bars
      tc.fillStyle = INK; tc.fillText(label, x0 + 30, 27);
      tc.fillStyle = ACC; tc.fillRect(0, 41, TW * music.p, 3);                                                                                                         // how far through the track
    }
    const now = performance.now() / 1000, T = S.toast;
    if (!T || !S.booted || isBooting() || now > T.until) return;
    tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = Math.min(1, (T.until - now) / 0.3);
    font(tc, 500, 16.5); const w = tc.measureText(T.text).width + 44;
    rr(tc, TW / 2 - w / 2, 362, w, 42, 21); tc.fillStyle = 'rgba(42,45,51,.94)'; tc.fill();
    tc.fillStyle = '#fff'; tc.textAlign = 'center'; tc.fillText(T.text, TW / 2, 389); tc.textAlign = 'left'; tc.globalAlpha = 1;
  }
  function paintBody(t, a) {
    if (isBooting()) { bootScreen(tc, TW, TH, t - S.bootAt, true); return; }
    if (!S.booted) { tc.globalAlpha = 1; tc.fillStyle = '#000'; tc.fillRect(0, 0, TW, TH); }
    else if (!S.sec) { padMax = 0; drawHomeTop(t, a); }
    else if (S.sec.game) { padMax = 0; snake.draw(); }
    else drawCard(S.sec.items[S.i], S.sec, t, a);
  }
  function drawTop() {
    const t = reduced ? 0 : performance.now() / 1000;
    const k = reduced ? 1 : Math.max(0, Math.min(1, (t - S.changed) / 0.28)), a = 1 - Math.pow(1 - k, 3);
    if (depth3d > 0 && S.booted && !(S.sec && S.sec.game)) {
      // draw once per eye, keep red from the left and cyan from the right, then add them together
      eyeCx.forEach((cx, i) => {
        tc = cx; eye = i ? 1 : -1;
        tc.setTransform(1, 0, 0, 1, 0, 0); paintTop(t, a);
        tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = 1;
        tc.globalCompositeOperation = 'multiply'; tc.fillStyle = i ? '#00ffff' : '#ff0000'; tc.fillRect(0, 0, TW, TH);
        tc.globalCompositeOperation = 'source-over';
      });
      tc = mainTc; eye = 0;
      tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = 1; tc.fillStyle = '#000'; tc.fillRect(0, 0, TW, TH);
      tc.globalCompositeOperation = 'lighter';
      tc.drawImage(eyeCx[0].canvas, 0, 0); tc.drawImage(eyeCx[1].canvas, 0, 0);
      tc.globalCompositeOperation = 'source-over';
    } else { eye = 0; tc.setTransform(1, 0, 0, 1, 0, 0); paintTop(t, a); }
    topTex.needsUpdate = true;
  }

  function tile(x, y, w, h, on, color, fn) { // a white tile with a soft drop shadow; teal ring when selected
    rr(bc, x, y + 2, w, h, 12); bc.fillStyle = 'rgba(0,0,0,.07)'; bc.fill();
    rr(bc, x, y, w, h, 12); bc.fillStyle = on ? TINT : TILE; bc.fill();
    bc.lineWidth = on ? 2.5 : 1; bc.strokeStyle = on ? ACC : LINE; bc.stroke();
    if (fn) regions.push({ x, y, w, h, fn });
  }

  function drawBottom() {
    regions = [];
    bc.textBaseline = 'alphabetic'; bc.textAlign = 'left';
    if (!S.booted) { bc.fillStyle = '#000'; bc.fillRect(0, 0, BW, BH); botTex.needsUpdate = true; return; }
    if (isBooting()) { bootScreen(bc, BW, BH, performance.now() / 1000 - S.bootAt, false); botTex.needsUpdate = true; return; }
    backdrop(bc, BW, BH);

    if (!S.sec) { // home: a grid of icons
      const cur = SECTIONS[S.home];
      bar(bc, BW, cur.label, cur.blurb);
      const w = 190, h = 196, gx = 15, gy = 14;
      SECTIONS.forEach((s, i) => {
        const x = 20 + (i % 3) * (w + gx), y = 56 + Math.floor(i / 3) * (h + gy), on = i === S.home;
        tile(x, y, w, h, on, null, () => enter(i)); regions[regions.length - 1].home = i;
        const im = pic(HOME_ICON[i]), cx = x + w / 2, cy = y + 84;
        if (im) fitPic(bc, im, cx, cy, 126, 108);
        else { [[-2, 0], [-1, 0], [0, 0], [0, -1], [1, -1]].forEach(([dx, dy], q) => { bc.fillStyle = q === 4 ? '#0e7f8d' : ACC; rr(bc, cx + dx * 26 - 11, cy + dy * 26 + 2, 22, 22, 5); bc.fill(); }); bc.fillStyle = '#e0584d'; rr(bc, cx + 41, cy + 28, 22, 22, 5); bc.fill(); }
        bc.textAlign = 'center'; bc.fillStyle = INK; font(bc, on ? 600 : 500, onPhone() ? 25 : 17.5); bc.fillText(s.label, cx, y + h - (onPhone() ? 18 : 22)); bc.textAlign = 'left';
      });
      botTex.needsUpdate = true;
      return;
    }

    const sec = S.sec;
    bar(bc, BW, '', sec.label);
    regions.push({ x: 0, y: 0, w: 150, h: 48, fn: goHome });
    bc.fillStyle = ACC; font(bc, 500, onPhone() ? 23 : 16); bc.fillText('‹  Back', 20, onPhone() ? 31 : 28);

    if (sec.game) { snake.drawPad(); botTex.needsUpdate = true; return; }

    const n = sec.items.length, cols = n > 5 ? 2 : 1, rows = Math.ceil(n / cols);
    sec.cols = cols;
    const links = sec.items[S.i].links;
    const top = 56, bottom = links ? 398 : 464, gap = 8;
    const h = Math.min(62, (bottom - top - gap * (rows - 1)) / rows);
    const w = (BW - 40 - gap * (cols - 1)) / cols;
    sec.items.forEach((it, i) => {
      const x = 20 + (i % cols) * (w + gap), y = top + Math.floor(i / cols) * (h + gap), on = i === S.i;
      tile(x, y, w, h, on, null, () => { S.i = i; redraw(); });
      const th = pic(it.thumb || it.img); let tx = x + 18;
      if (th) { fitPic(bc, th, x + 32, y + h / 2, 40, Math.min(40, h - 14)); tx = x + 62; }
      bc.fillStyle = INK; font(bc, on ? 600 : 500, onPhone() ? (cols > 1 ? 21 : 26) : h < 56 ? 17 : 18.5);
      bc.fillText(it.label, tx, y + h / 2 + 6.5);
      if (it.win) { bc.textAlign = 'right'; font(bc, 500, 12.5); bc.fillStyle = MUTE; bc.fillText('1st', x + w - 14, y + h / 2 + 5); bc.textAlign = 'left'; }
    });
    if (links) {
      const lw = (BW - 40 - gap * (links.length - 1)) / links.length;
      links.forEach(([label, url], i) => {
        const x = 20 + i * (lw + gap);
        rr(bc, x, 412, lw, 50, 12);
        if (i === 0) { bc.fillStyle = ACC; bc.fill(); } else { bc.fillStyle = TILE; bc.fill(); bc.lineWidth = 1; bc.strokeStyle = LINE; bc.stroke(); }
        regions.push({ x, y: 406, w: lw, h: 62, fn: () => openUrl(url) });
        bc.fillStyle = i === 0 ? '#fff' : INK; font(bc, 600, onPhone() ? 23 : 16.5); bc.textAlign = 'center';
        bc.fillText('Open ' + label, x + lw / 2, 443); bc.textAlign = 'left';
      });
    }
    botTex.needsUpdate = true;
  }
  function redraw() { S.changed = performance.now() / 1000; drawTop(); drawBottom(); }

  /* ======================= snake (plays on the top screen) ======================= */
  const snake = (() => {
    const W = 40, H = 21, Sz = 20, OY = 44;
    let body, dir, queue, food, alive, score, started, timer;
    let best = +store.get('snake-best') || 0;
    const place = () => { do { food = [Math.random() * W | 0, Math.random() * H | 0]; } while (body.some((s) => s[0] === food[0] && s[1] === food[1])); };
    function reset() { body = [[10, 11], [9, 11], [8, 11]]; dir = [1, 0]; queue = []; alive = true; score = 0; started = false; place(); }
    function tick() {
      if (alive && started) {
        if (queue.length) dir = queue.shift();
        const h = [body[0][0] + dir[0], body[0][1] + dir[1]];
        if (h[0] < 0 || h[1] < 0 || h[0] >= W || h[1] >= H || body.some((s) => s[0] === h[0] && s[1] === h[1])) {
          alive = false;
          if (score > best) { best = score; store.set('snake-best', best); }
        } else {
          body.unshift(h);
          if (h[0] === food[0] && h[1] === food[1]) { score++; place(); } else body.pop();
        }
        redraw();
      }
    }
    function draw() {
      topFrame(C.snake, 'Snake');
      tc.fillStyle = 'rgba(0,0,0,.035)';
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if ((x + y) % 2) tc.fillRect(x * Sz, OY + y * Sz, Sz, Sz);
      tc.fillStyle = '#e0584d'; rr(tc, food[0] * Sz + 3, OY + food[1] * Sz + 3, Sz - 6, Sz - 6, 3); tc.fill();
      body.forEach((s, i) => { tc.fillStyle = i ? '#1aa3b3' : '#0e7f8d'; rr(tc, s[0] * Sz + 1, OY + s[1] * Sz + 1, Sz - 2, Sz - 2, 3); tc.fill(); });
      tc.textAlign = 'center';
      if (!started && alive) { tc.fillStyle = '#2a2d33'; font(tc, 600, onPhone() ? 34 : 26); tc.fillText(onPhone() ? 'Swipe to start' : 'Press any direction to start', TW / 2, 258); }
      if (!alive) {
        tc.fillStyle = 'rgba(244,245,247,.88)'; tc.fillRect(0, OY, TW, TH - OY);
        tc.fillStyle = '#2a2d33'; font(tc, 700, 44); tc.fillText('Game over', TW / 2, 250);
        tc.fillStyle = '#7a808a'; font(tc, 500, 20); tc.fillText(onPhone() ? `Score ${score}. Tap to play again.` : `Score ${score}. Press A to try again.`, TW / 2, 290);
      }
      tc.textAlign = 'left';
    }
    function drawPad() { // bottom screen: score + touch arrows
      bc.fillStyle = '#2a2d33'; font(bc, 700, 60); bc.fillText(String(score), 28, 150);
      bc.fillStyle = '#7a808a'; font(bc, 500, 16); bc.fillText('Score', 30, 176); bc.fillText('Best  ' + best, 30, 204);
      const cx = 430, cy = 270, s = 92;
      [['up', 0, -1, '▲'], ['down', 0, 1, '▼'], ['left', -1, 0, '◀'], ['right', 1, 0, '▶']].forEach(([k, dx, dy, g]) => {
        const x = cx + dx * (s + 8) - s / 2, y = cy + dy * (s + 8) - s / 2;
        tile(x, y, s, s, false, C.snake, () => key(k));
        bc.fillStyle = '#2a2d33'; font(bc, 500, 26); bc.textAlign = 'center'; bc.fillText(g, x + s / 2, y + s / 2 + 11); bc.textAlign = 'left';
      });
      rr(bc, 24, 400, 200, 50, 8); bc.lineWidth = 1.5; bc.strokeStyle = '#2a2d33'; bc.stroke();
      regions.push({ x: 24, y: 394, w: 200, h: 64, fn: () => key('a') });
      bc.fillStyle = '#2a2d33'; font(bc, 600, 17); bc.textAlign = 'center'; bc.fillText(alive ? 'Restart' : 'Play again', 124, 431); bc.textAlign = 'left';
    }
    function onKey(k) {
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
      if (d) {
        const last = queue.length ? queue[queue.length - 1] : dir;
        if (d[0] !== -last[0] || d[1] !== -last[1]) queue.push(d);
        if (!started) { started = true; redraw(); }
        return true;
      }
      if (k === 'a') { reset(); started = true; redraw(); return true; }
      return false;
    }
    return { start() { reset(); clearInterval(timer); timer = setInterval(tick, 95); }, stop() { clearInterval(timer); }, draw, drawPad, key: onKey, over: () => !alive };
  })();

  /* ======================= navigation ======================= */
  function enter(i) {
    S.home = i; S.sec = SECTIONS[i]; S.i = 0;
    if (S.sec.game) snake.start();
    redraw();
  }
  function goHome() {
    if (S.sec && S.sec.game) snake.stop();
    S.sec = null; redraw();
  }
  // Up Up Down Down Left Right Left Right B A Start
  const KONAMI = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a', 'start'];
  const secret = { at: -1e9 }, SECRET_FOR = 6.5;
  function secretOn() {
    secret.at = performance.now() / 1000;
    goal.yaw += Math.PI * 2;                       // the console does a full spin
    if (reduced) { drawTop(); setTimeout(drawTop, SECRET_FOR * 1000 + 50); }
    else { document.body.classList.remove('flash'); void document.body.offsetWidth; document.body.classList.add('flash'); burst(); }
  }
  // The whole page joins in: stickers blast out of the console in every direction, bounce off the edges of the window
  // and the floor, a second wave rains from the top, then they all fall away.
  let bursting = false, sprites = null;
  // Each sticker is drawn once into a small canvas ahead of time; the animation then only moves those small pictures around.
  function makeSprites() {
    if (sprites) return sprites;
    const ks = Object.keys(PICS).filter((k) => !k.startsWith('s_') && k !== 'photo' && pic(k));
    sprites = ks.map((k) => {
      const g = pic(k), sc = 150 / Math.max(g.naturalWidth, g.naturalHeight), cv = mk(Math.max(1, Math.round(g.naturalWidth * sc)), Math.max(1, Math.round(g.naturalHeight * sc)));
      const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(mip(g, cv.width), 0, 0, cv.width, cv.height); return cv;
    });
    return sprites;
  }
  addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => { if (!sprites) makeSprites(); }, { timeout: 4000 }));
  function burst() {
    if (bursting) return;
    const SP = makeSprites();
    if (!SP.length) return;
    bursting = true;
    const cv = document.createElement('canvas'); cv.className = 'burst'; document.body.appendChild(cv);
    const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext('2d'); c.imageSmoothingQuality = 'low';
    const R = (a, b) => a + Math.random() * (b - a), many = W < 700 ? 0.5 : 1, P = [];
    const add = (x, y, vx, vy, born) => { const g = SP[P.length % SP.length], s = R(46, 112) * (W < 700 ? 0.7 : 1) / Math.max(g.width, g.height); P.push({ g, x, y, vx, vy, born, w: g.width * s, h: g.height * s, r: R(0, 6.3), vr: R(-7, 7), hits: 0 }); };
    for (let n = 0; n < 64 * many; n++) { const an = R(0, Math.PI * 2), sp = R(380, 1750); add(W / 2 + R(-40, 40), H * 0.5 + R(-40, 40), Math.cos(an) * sp, Math.sin(an) * sp - 420, R(0, 0.18)); } // the blast
    for (let n = 0; n < 40 * many; n++) add(R(0, W), R(-260, -60), R(-90, 90), R(80, 420), R(0.7, 2.6));                                                                          // the rain
    for (let n = 0; n < 2; n++) for (let q = 0; q < 14 * many; q++) { const an = (n ? Math.PI : 0) + R(-0.9, -0.2) * (n ? -1 : 1); add(n ? W + 40 : -40, H * 0.82, Math.cos(an) * R(700, 1500), -Math.abs(Math.sin(an)) * R(900, 1700), R(1.5, 1.9)); } // two side cannons
    const LIFE = 8.2; let t0 = 0, last = 0;
    function step(now) {
      if (!t0) { t0 = last = now; }
      const t = (now - t0) / 1000, dt = Math.min(0.033, (now - last) / 1000); last = now;
      if (t > LIFE || !cv.isConnected) { cv.remove(); bursting = false; return; }
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      const floor = t < LIFE - 2.4; // near the end the floor opens and everything drops out
      for (const p of P) {
        if (t < p.born || p.y > H + 200) continue;
        p.vy += 1500 * dt; p.vx *= 1 - 0.25 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        const h = Math.max(p.w, p.h) / 2;
        if (p.x < h && p.vx < 0) { p.x = h; p.vx *= -0.7; p.vr *= -0.6; } else if (p.x > W - h && p.vx > 0) { p.x = W - h; p.vx *= -0.7; p.vr *= -0.6; }
        if (floor && p.y > H - h && p.vy > 0) { p.y = H - h; p.vy *= -(p.hits < 3 ? 0.55 : 0.2); p.vx *= 0.8; p.vr *= 0.6; p.hits++; }
        if (p.y < -h * 2) continue;
        const pop = Math.min(1, (t - p.born) / 0.18) * dpr, co = Math.cos(p.r) * pop, si = Math.sin(p.r) * pop;
        c.setTransform(co, si, -si, co, p.x * dpr, p.y * dpr); c.drawImage(p.g, -p.w / 2, -p.h / 2, p.w, p.h);
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  let kp = 0; // how much of the code has been entered so far
  function key(k, code) { // code: which physical button it was, when that differs from what it does (START acts as A)
    if (openness() < 0.9) return;   // closed: buttons do nothing. Only scrolling opens the lid.
    {
      const c = code || k, last = kp === KONAMI.length - 1;
      if (c === KONAMI[kp] || (last && (c === 'a' || c === 'select'))) kp++;   // the last press can be START, SELECT, HOME or Enter
      else kp = c === 'up' ? (kp === 2 ? 2 : 1) : 0;
      if (kp > 8) { // the B, A, Start that finish the code: they do not also go back, open a page or follow a link
        if (kp === KONAMI.length) { kp = 0; secretOn(); }
        return;
      }
    }
    if (k === 'power') { scrollClosed(); return; }   // power button shuts the console
    if (isBooting()) return;
    const was = S.home + '|' + S.i; // only redraw (and replay the slide-in) when the selection really changes
    if (k === 'l' || k === 'r') { // shoulder buttons step through whatever is on screen
      const d = k === 'r' ? 1 : -1;
      if (!S.sec) S.home = (S.home + d + SECTIONS.length) % SECTIONS.length;
      else if (S.sec.items.length) S.i = (S.i + d + S.sec.items.length) % S.sec.items.length;
      if (was !== S.home + '|' + S.i) redraw();
      return;
    }
    if (k === 'y') return; // Y does nothing; only the power button (or scrolling up) closes the lid
    if (k === 'start' || k === 'x') { if (S.sec || S.home !== 0) { S.home = 0; goHome(); } return; } // HOME: back to the first screen
    if (S.sec && S.sec.game && snake.key(k)) return;
    const mv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
    if (!S.sec) {
      if (mv) { const n = S.home + mv[0] + mv[1] * 3; if (n >= 0 && n < SECTIONS.length && !(mv[0] && Math.floor(n / 3) !== Math.floor(S.home / 3))) S.home = n; }
      else if (k === 'a') return enter(S.home);
    } else {
      const cols = S.sec.cols || 1, n = S.sec.items.length;
      if (mv && n) { const t = S.i + mv[0] + mv[1] * cols; if (t >= 0 && t < n && !(mv[0] && (cols === 1 || Math.floor(t / cols) !== Math.floor(S.i / cols)))) S.i = t; }
      else if (k === 'a') { const it = S.sec.items[S.i]; if (it && it.links) openUrl(it.links[0][1]); return; }
      else if (k === 'b') return goHome();
    }
    if (was !== S.home + '|' + S.i) redraw();
  }

  /* ======================= the 3D model ======================= */
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
  const rig = new THREE.Group();     // rotates (orbit)
  const device = new THREE.Group();  // offset so the open device is centred on the rig
  device.position.set(0, -4.3, 2.1);
  rig.add(device); scene.add(rig);

  // studio reflections: a few soft boxes baked into an environment map
  (() => {
    const env = new THREE.Scene(); env.background = new THREE.Color(0x040405);
    const soft = (w, h, x, y, z, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    soft(34, 14, 0, 26, 8, 2.6); soft(10, 26, -28, 8, 6, 1.3); soft(10, 26, 28, 10, -4, 1.0); soft(44, 6, 0, 6, -30, 0.7);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.05).texture; pm.dispose();
  })();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x0a0a0e, 0.35));
  const keyL = new THREE.DirectionalLight(0xffffff, 0.8); keyL.position.set(8, 18, 14); scene.add(keyL);
  const rimL = new THREE.DirectionalLight(0xdfe6ff, 0.7); rimL.position.set(-14, 8, -14); scene.add(rimL);
  const warmL = new THREE.DirectionalLight(0xffffff, 0.3); warmL.position.set(16, 4, -10); scene.add(warmL);

  const M = {
    body: new THREE.MeshStandardMaterial({ color: 0x117587, roughness: 0.36, metalness: 0.55, envMapIntensity: 1.0 }),   // metallic aqua deck
    tray: new THREE.MeshStandardMaterial({ color: 0x1c9fb0, roughness: 0.3, metalness: 0.4, envMapIntensity: 1.0 }),    // lighter lower tray
    shell: new THREE.MeshStandardMaterial({ color: 0x0f6e80, roughness: 0.22, metalness: 0.6, envMapIntensity: 1.2 }),   // glossy lid top
    panel: new THREE.MeshStandardMaterial({ color: 0x0e6677, roughness: 0.42, metalness: 0.5 }),                         // touch-screen surround
    key: new THREE.MeshStandardMaterial({ color: 0x117284, roughness: 0.42, metalness: 0.4 }),                          // buttons
    btn: new THREE.MeshStandardMaterial({ color: 0x0c5a69, roughness: 0.45, metalness: 0.45 }),                           // shoulder buttons
    pad: new THREE.MeshStandardMaterial({ color: 0x8f96a3, roughness: 0.6, metalness: 0.05 }),                          // circle pad cap
    gloss: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.08, metalness: 0.4, envMapIntensity: 1.0 }),   // black glass
    dark: new THREE.MeshStandardMaterial({ color: 0x094450, roughness: 0.55 }),                                          // recesses
    lens: new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.05, metalness: 0.9, envMapIntensity: 1.6 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.7 }),
    hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),                              // invisible touch target
  };
  // hex colours above are authored in sRGB; r128 treats them as linear unless converted
  Object.values(M).forEach((m) => { if (m === M.hit) return; m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); });
  function roundRect(w, d, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(w, d, h, r, b = 0.16) { // rounded box lying flat: w along X, d along Z, h along Y
    const g = new THREE.ExtrudeGeometry(roundRect(w - 2 * b, d - 2 * b, r), { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 6, curveSegments: 24 });
    g.center(); g.rotateX(Math.PI / 2);
    return g;
  }
  const flat = (w, d, r, up) => { const g = new THREE.ShapeGeometry(roundRect(w, d, r), 16); g.rotateX(up ? -Math.PI / 2 : Math.PI / 2); return g; };
  const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  const BW3 = 15.6, BD = 8.8, BH3 = 1.15, LH = 0.7, TOP = BH3;
  const tickers = [];      // extra per-frame updates (the SD card)
  let stow = () => false;  // puts any card that is out back in its slot; returns true if one was out
  let cartTick = () => {}; // per-frame update for the game card, set once the card is built
  const props = [];   // meshes with userData.act: ports, slots, switches
  const slides = [];  // meshes that slide between two positions
  const prop = (m, act) => { m.userData.act = act; props.push(m); return m; };
  const slide = (m, dx, dy, dz) => { m.userData.s = { base: m.position.clone(), d: new THREE.Vector3(dx, dy, dz), cur: 0, tgt: 0 }; slides.push(m); return m; };
  const flip = (m) => (m.userData.s.tgt = m.userData.s.tgt ? 0 : 1);
  const tap = (m) => { m.userData.s.tgt = 1; setTimeout(() => { m.userData.s.tgt = 0; }, 160); };
  const buttons = []; // meshes with userData.key
  const solids = [];  // everything that blocks a ray
  const xView = { u: 0 }; // 0 = assembled, 1 = taken apart (the exploded view)

  // ---- base half: lighter lower tray under a metallic deck, squared-off corners
  const CR = 0.55;
  solids.push(add(device, slab(BW3, BD, 0.62, CR, 0.1), M.tray, 0, 0.31, 0));
  solids.push(add(device, slab(BW3 - 0.08, BD - 0.08, 0.6, CR, 0.1), M.body, 0, TOP - 0.3, 0));
  // raised surround that holds the touch screen and the SELECT / HOME / START strip
  solids.push(add(device, slab(8.7, 7.5, 0.1, 0.22, 0.04), M.panel, 0, TOP + 0.03, 0.15));
  const PT = TOP + 0.082;
  add(device, flat(7.9, 6.0, 0.1, true), M.gloss, 0, PT, -0.45);
  const botGeo = new THREE.PlaneGeometry(7.5, 5.625); botGeo.rotateX(-Math.PI / 2);
  const botMat = new THREE.MeshBasicMaterial({ map: botTex });
  const botScreen = add(device, botGeo, botMat, 0, PT + 0.004, -0.45);

  function button(geo, mat, x, z, k, h, y) {
    const m = add(device, geo, mat, x, (y === undefined ? TOP : y) + h / 2, z);
    m.userData = { key: k, y0: m.position.y, press: 0 };
    buttons.push(m);
    return m;
  }
  const decal = (cv, w, d, x, y, z) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); return add(device, g, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }), x, y, z); };
  // circle pad: pale cap in a round well
  add(device, new THREE.CylinderGeometry(1.14, 1.14, 0.05, 48), M.dark, -5.85, TOP + 0.012, -1.95);
  // circle pad: grab it and push it around; it springs back, and pushing far enough steers like the D-pad
  const PAD = { x: -5.85, z: -1.95, r: 0.42 };
  const padM = prop(add(device, new THREE.CylinderGeometry(0.74, 0.8, 0.22, 48), M.pad, PAD.x, TOP + 0.13, PAD.z), () => {});
  padM.userData.stick = true;
  let stick = false, stickDir = [null, null], stickAt = [0, 0]; // per axis: [left/right, up/down]
  const stPlane = new THREE.Plane(), stN = new THREE.Vector3(), stP = new THREE.Vector3(), stHit = new THREE.Vector3();
  function stickTo(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    device.updateWorldMatrix(true, false);
    stP.set(PAD.x, TOP + 0.24, PAD.z); device.localToWorld(stP);
    stN.set(0, 1, 0).transformDirection(device.matrixWorld);
    stPlane.setFromNormalAndCoplanarPoint(stN, stP);
    if (!ray.ray.intersectPlane(stPlane, stHit)) return;
    device.worldToLocal(stHit);
    let dx = stHit.x - PAD.x, dz = stHit.z - PAD.z; const len = Math.hypot(dx, dz);
    if (len > PAD.r) { dx *= PAD.r / len; dz *= PAD.r / len; }
    padM.position.x = PAD.x + dx; padM.position.z = PAD.z + dz;
    padM.rotation.z = -dx * 0.45; padM.rotation.x = dz * 0.45; // lean the way it is pushed
    // read the two axes separately, so a diagonal push moves both ways (up AND right), not just the stronger one
    const th = PAD.r * 0.42, now = performance.now();
    const want = [dx > th ? 'right' : dx < -th ? 'left' : null, dz > th ? 'down' : dz < -th ? 'up' : null];
    want.forEach((dir, n) => {
      if (dir && (dir !== stickDir[n] || now - stickAt[n] > 320)) { stickDir[n] = dir; stickAt[n] = now; key(dir); }
      if (!dir) stickDir[n] = null;
    });
  }
  // d-pad: body-coloured cross with pale tick marks
  const arm = new THREE.BoxGeometry(0.7, 0.2, 0.7), tick = new THREE.BoxGeometry(0.3, 0.012, 0.06), tickM = new THREE.MeshBasicMaterial({ color: 0xd8eef8 });
  add(device, arm, M.key, -5.85, TOP + 0.1, 1.6);
  [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]].forEach(([k, dx, dz]) => {
    const b = button(arm, M.key, -5.85 + dx * 0.7, 1.6 + dz * 0.7, k, 0.2);
    const t = new THREE.Mesh(tick, tickM); t.position.y = 0.107; if (dz) t.rotation.y = Math.PI / 2; b.add(t);
  });
  // face buttons: body colour, pale letters
  const cap = new THREE.CylinderGeometry(0.45, 0.48, 0.2, 36);
  [['a', 0.95, 0, 'A'], ['b', 0, 0.95, 'B'], ['x', 0, -0.95, 'X'], ['y', -0.95, 0, 'Y']].forEach(([k, dx, dz, letter]) => {
    const b = button(cap, M.key, 5.85 + dx, 0.15 + dz, k, 0.2);
    const lc = mk(64, 64), lx = lc.getContext('2d');
    lx.fillStyle = '#e4f3fa'; lx.font = `500 38px ${FONT}`; lx.textAlign = 'center'; lx.textBaseline = 'middle'; lx.fillText(letter, 32, 35);
    const lg = new THREE.PlaneGeometry(0.6, 0.6); lg.rotateX(-Math.PI / 2);
    const lm = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lc), transparent: true, depthWrite: false }));
    lm.position.y = 0.104; b.add(lm);
  });
  { // SELECT / HOME / START: plain lettering printed on the strip under the touch screen, as on the real console. Each word is a touch target.
    const c = mk(1024, 96), x = c.getContext('2d');
    x.fillStyle = '#e4f3fa'; x.font = `500 30px ${FONT}`; x.textAlign = 'center';
    x.fillText('SELECT', 170, 60); x.fillText('START', 854, 60); x.fillText('HOME', 540, 60);
    // the house: a wide roof with a small chimney on the left, and a square window cut out of the wall
    x.beginPath(); x.moveTo(428, 49); x.lineTo(456, 25); x.lineTo(484, 49); x.closePath(); x.fill();   // roof, overhanging the walls
    x.fillRect(436, 28, 7, 14);                                                                         // chimney
    x.fillRect(437, 47, 38, 20);                                                                        // walls
    x.globalCompositeOperation = 'destination-out'; x.fillRect(450, 50, 12, 11); x.globalCompositeOperation = 'source-over'; // window
    decal(c, 7.4, 0.69, 0, PT + 0.003, 3.2);
    button(new THREE.BoxGeometry(2.2, 0.02, 0.8), M.hit, 0, 3.2, 'start', 0.02, PT);
    button(new THREE.BoxGeometry(2.2, 0.02, 0.8), M.hit, -2.47, 3.2, 'a', 0.02, PT).userData.code = 'select';   // SELECT picks whatever is highlighted
    button(new THREE.BoxGeometry(2.2, 0.02, 0.8), M.hit, 2.47, 3.2, 'a', 0.02, PT).userData.code = 'start';     // START opens (and is the Start of the Konami code)
  }
  { // power button with its icon and label
    button(slab(0.74, 0.74, 0.12, 0.16, 0.03), M.key, 5.25, 3.55, 'power', 0.12, TOP - 0.01); // press to shut the lid
    const c = mk(256, 64), x = c.getContext('2d');
    x.strokeStyle = x.fillStyle = '#e4f3fa'; x.lineWidth = 5; x.lineCap = 'round';
    // the icon sits at canvas x = 39, which is the middle of the button under it (the decal is wider than the button)
    x.beginPath(); x.arc(39, 34, 14, -Math.PI / 2 + 0.75, -Math.PI / 2 - 0.75 + Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(39, 15); x.lineTo(39, 32); x.stroke();
    x.font = `600 25px ${FONT}`; x.fillText('POWER', 96, 42);
    decal(c, 2.3, 0.575, 6.05, TOP + 0.114, 3.55);
  }

  // ---- ports, switches and printed labels around the edges
  {
    const FZ = BD / 2, SX = BW3 / 2, HALF = Math.PI / 2, INK = '#d3ecf0';
    const blk = new THREE.MeshStandardMaterial({ color: 0x040506, roughness: 0.3, metalness: 0.4 });
    const box = (w, h, d, mat, x, y, z) => add(device, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
    const wall = (cv, w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); m.position.set(x, y, z); m.rotation.y = ry; device.add(m); return m; };
    const text = (t, px) => { const c = mk(px, 64), x = c.getContext('2d'); x.fillStyle = INK; x.font = `600 30px ${FONT}`; x.textAlign = 'center'; x.fillText(t, px / 2, 43); return c; };
    const icon = (draw) => { const c = mk(64, 64), x = c.getContext('2d'); x.strokeStyle = x.fillStyle = INK; x.lineWidth = 5; x.lineCap = 'round'; draw(x); return c; };

    // front: headphone jack, two status LEDs with their icons, strap notches
    const jack = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 36); jack.rotateX(HALF);
    // Headphone jack: click to plug in and play a piece of music, click again to unplug.
    // It plays through YouTube's own embedded player, shown as a small card, so the recording stays on its official upload.
    const TRACKS = [
      { id: 'Xd1qKLxp_HA', title: 'Valse des Adieux', by: 'Claudio Constantini' },
      { id: 'afIIY1elpBM', title: 'The Swan', by: 'Saint-Saëns · Yo-Yo Ma, Kathryn Stott', start: 3 },
      { id: 'noW9fM9vgJs', title: 'Cello Suite No. 1', by: 'Bach · Yo-Yo Ma' },
      { id: 'AhsLh1iQ_qo', title: 'Clair de lune', by: 'Debussy · Seong-Jin Cho' },
      { id: 'Wk7RrtEGDyo', title: 'Mia & Sebastian’s Theme', by: 'La La Land · Justin Hurwitz' },
    ];
    let trackN = 0;
    const cue = () => ({ videoId: TRACKS[trackN].id, startSeconds: TRACKS[trackN].start || 0 }); // `start` skips a track's quiet lead-in, in seconds
    // The player on the page is a small spinning disc with the track's cover on it, previous/next either side and the title under it.
    const showTrack = () => {
      const T = TRACKS[trackN]; music.title = T.title; music.by = T.by; music.p = 0;
      if (npEl) {
        npEl.querySelector('.np-disc').style.backgroundImage = 'url(https://i.ytimg.com/vi/' + T.id + '/mqdefault.jpg)';
        npEl.querySelector('.np-t').textContent = T.title; npEl.querySelector('.np-by').textContent = T.by;
      }
      drawTop();
    };
    const skip = (d) => { trackN = (trackN + d + TRACKS.length) % TRACKS.length; showTrack(); if (yt && yt.loadVideoById) yt.loadVideoById(cue()); };
    const plugG = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 20); plugG.rotateX(HALF);
    const plug = add(device, plugG, new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.3, metalness: 0.8 }), 0, 0.36, FZ + 0.25);
    { const g = new THREE.CylinderGeometry(0.17, 0.2, 0.7, 20); g.rotateX(HALF); const grip = new THREE.Mesh(g, blk); grip.position.z = 0.55; plug.add(grip); // the plug's grip
      const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0.85), new THREE.Vector3(0, -0.1, 1.5), new THREE.Vector3(0.5, -0.9, 2.4), new THREE.Vector3(1.8, -2.4, 3.0), new THREE.Vector3(4.5, -5, 3.2), new THREE.Vector3(9, -9, 3.2), new THREE.Vector3(20, -18, 3.2), new THREE.Vector3(40, -34, 3.2)]); // long enough to always run off the page
      plug.add(new THREE.Mesh(new THREE.TubeGeometry(path, 96, 0.055, 10, false), blk)); }                                   // and its cable, trailing off the page
    slide(plug, 0.6, -0.5, 5.5); plug.userData.s.cur = plug.userData.s.tgt = 1; plug.visible = false; // starts unplugged, off to the front
    let yt = null, npEl = null, lastVol = -1, discA = 0, discT = 0;
    const dtDisc = () => { const n = performance.now(), d = Math.min(100, n - (discT || n)); discT = n; return d * 0.05; };
    const stopMusic = () => { plug.userData.s.tgt = 1; music.on = false; music.p = 0; if (yt && yt.destroy) yt.destroy(); yt = null; if (npEl) { npEl.remove(); npEl = null; } drawTop(); };
    const startMusic = () => {
      plug.userData.s.tgt = 0; plug.visible = true; music.on = true;
      music.paused = true;
      npEl = document.createElement('aside'); npEl.className = 'np paused';
      npEl.innerHTML = '<div class="np-row"><button data-d="-1" aria-label="Previous track"><svg viewBox="0 0 24 24"><path d="M6 5h2.4v14H6zM20 5v14L9.5 12z"/></svg></button>' +
        '<button class="np-disc" data-pp aria-label="Pause or play"></button>' +
        '<button data-d="1" aria-label="Next track"><svg viewBox="0 0 24 24"><path d="M15.600 5H18v14h-2.400zM4 5v14l10.500-7z"/></svg></button></div>' +
        '<p><span class="np-t"></span><span class="np-by"></span></p><button class="np-x" aria-label="Stop the music">Unplug</button><div class="np-yt"><div id="np-player"></div></div>';
      npEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.d) skip(+b.dataset.d);
        else if (b.dataset.pp !== undefined) { if (yt && yt.getPlayerState) (yt.getPlayerState() === 1 ? yt.pauseVideo() : yt.playVideo()); }
        else stopMusic();
      }));
      document.body.appendChild(npEl); showTrack();
      const onState = (e) => {
        if (e.data === 0) { skip(1); return; }
        music.paused = e.data !== 1; discT = 0;
        if (npEl) npEl.classList.toggle('paused', music.paused);
      };
      const onErr = () => { if (npEl) npEl.querySelector('.np-by').textContent = location.protocol === 'file:' ? 'Needs the site served over http to play' : 'Could not load this track'; };
      const make = () => {
        if (!npEl) return;
        lastVol = -1;
        yt = new YT.Player('np-player', { width: 200, height: 200, videoId: TRACKS[trackN].id,
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3 },
          events: { onReady: (e) => e.target.loadVideoById(cue()), onStateChange: onState, onError: onErr } });
      };
      if (window.YT && YT.Player) make();
      else { const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) prev(); make(); };
        if (!document.getElementById('yt-api')) { const sc = document.createElement('script'); sc.id = 'yt-api'; sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc); } }
    };
    prop(add(device, jack, blk, 0, 0.36, FZ + 0.005), () => (music.on ? stopMusic() : startMusic()));
    prop(plug, stopMusic);
    tickers.push(() => {
      if (!music.on && plug.userData.s.cur > 0.97) plug.visible = false; // fully pulled out
      if (yt && yt.getDuration) { const d = yt.getDuration(); music.p = d ? yt.getCurrentTime() / d : 0; }
      if (npEl && !music.paused) { discA = (discA + dtDisc()) % 360; npEl.querySelector('.np-disc').style.transform = 'rotate(' + discA.toFixed(2) + 'deg)'; }
    });
    tickers.push(() => { // the volume slider on the left side sets the music's volume ("+" is toward the back)
      if (!yt || !yt.setVolume) return;
      const v = Math.round(100 * (1 - (vol.position.z - VZ[0]) / (VZ[1] - VZ[0])));
      if (v !== lastVol) { lastVol = v; yt.setVolume(Math.max(0, Math.min(100, v))); }
    });
    add(device, new THREE.RingGeometry(0.12, 0.2, 32), M.accent, 0, 0.36, FZ + 0.047);
    add(device, new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0.36, FZ + 0.048);
    box(0.2, 0.15, 0.05, new THREE.MeshBasicMaterial({ color: 0x69d7ff }), 3.9, 0.87, FZ - 0.045);   // power LED, lit
    const chargeLed = box(0.2, 0.15, 0.05, blk, 5.4, 0.87, FZ - 0.045);                               // charge LED, off until you plug in
    const amber = new THREE.MeshBasicMaterial({ color: 0xffa530 });
    wall(icon((x) => { x.beginPath(); x.arc(32, 35, 15, -HALF + 0.75, -HALF - 0.75 + Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(32, 14); x.lineTo(32, 33); x.stroke(); }), 0.36, 0.36, 3.9, 0.3, FZ + 0.004, 0);
    wall(icon((x) => { x.fillRect(22, 24, 20, 18); x.fillRect(25, 10, 4, 15); x.fillRect(35, 10, 4, 15); x.fillRect(30, 40, 4, 16); }), 0.36, 0.36, 5.4, 0.3, FZ + 0.004, 0);
    { // strap holes at the front corners: drawn as real openings, with the inside walls and floor of the hole visible in shadow
      const hc = mk(144, 60), hx = hc.getContext('2d');
      hx.fillStyle = '#03090b'; hx.fillRect(0, 0, 144, 60);                                                          // the dark back of the hole
      const fl = hx.createLinearGradient(0, 34, 0, 60); fl.addColorStop(0, '#0a3a45'); fl.addColorStop(1, '#1b7f93'); // its floor, catching a little light toward the opening
      hx.fillStyle = fl; hx.beginPath(); hx.moveTo(0, 60); hx.lineTo(22, 34); hx.lineTo(122, 34); hx.lineTo(144, 60); hx.closePath(); hx.fill();
      hx.fillStyle = '#0b3640'; hx.beginPath(); hx.moveTo(0, 0); hx.lineTo(22, 12); hx.lineTo(22, 34); hx.lineTo(0, 60); hx.closePath(); hx.fill();     // left wall
      hx.fillStyle = '#082a32'; hx.beginPath(); hx.moveTo(144, 0); hx.lineTo(122, 12); hx.lineTo(122, 34); hx.lineTo(144, 60); hx.closePath(); hx.fill(); // right wall
      hx.fillStyle = '#051c22'; hx.beginPath(); hx.moveTo(0, 0); hx.lineTo(144, 0); hx.lineTo(122, 12); hx.lineTo(22, 12); hx.closePath(); hx.fill();     // ceiling, in shadow
      hx.strokeStyle = 'rgba(160,235,245,.55)'; hx.lineWidth = 2; hx.strokeRect(1, 1, 142, 58);                       // the lit lip of the opening
      const hm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hc) });
      add(device, new THREE.PlaneGeometry(0.4, 0.17), hm, -7.0, 0.72, FZ + 0.004);                                     // both front holes rest on the seam between the two halves of the base
      add(device, new THREE.PlaneGeometry(0.4, 0.17), hm, 7.0, 0.72, FZ + 0.004);
      { const sideHole = add(device, new THREE.PlaneGeometry(0.4, 0.17), hm, SX + 0.004, 0.72, FZ - 0.75); sideHole.rotation.y = HALF; } // and its other opening, round the corner on the right side: a strap threads in one and out the other
    }  // the right-hand one sits lower: its bottom edge rests on the seam between the two halves of the base

    // left side: volume slider and the SD card door
    box(0.05, 0.13, 1.3, blk, -SX + 0.045, 0.87, -1.7);
    // volume: grab the knob (or anywhere on the groove) and slide it. "+" is toward the back, as printed.
    const VZ = [-2.15, -1.25];
    const ridge = (m, out) => { for (const rz of [-0.11, 0, 0.11]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.035), M.dark); r.position.set(out * 0.04, 0, rz); m.add(r); } return m; }; // three grip ridges across a slider knob
    const vol = ridge(box(0.09, 0.2, 0.36, M.key, -SX + 0.03, 0.87, -1.7), -1);
    const vPlane = new THREE.Plane(), vN = new THREE.Vector3(), vP = new THREE.Vector3(), vHit = new THREE.Vector3();
    const volDrag = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      device.updateWorldMatrix(true, false);
      vP.set(-SX, 0.87, -1.7); device.localToWorld(vP);
      vN.set(-1, 0, 0).transformDirection(device.matrixWorld);
      vPlane.setFromNormalAndCoplanarPoint(vN, vP);
      if (!ray.ray.intersectPlane(vPlane, vHit)) return;
      device.worldToLocal(vHit);
      vol.position.z = THREE.MathUtils.clamp(vHit.z, VZ[0], VZ[1]);
      toast('Volume ' + Math.round(((VZ[1] - vol.position.z) / (VZ[1] - VZ[0])) * 100) + '%');
    };
    prop(vol, () => {}).userData.drag = volDrag;
    prop(box(0.14, 0.36, 1.6, M.hit, -SX, 0.87, -1.7), () => {}).userData.drag = volDrag;
    wall(text('+   VOLUME   −', 320), 1.6, 0.32, -SX - 0.004, 0.3, -1.7, -HALF);
    const grey0 = new THREE.MeshStandardMaterial({ color: 0x2f5a66, roughness: 0.5, metalness: 0.3 });
    // SD card: the door drops open, the card springs out, then flies up to the camera and flips to show what is on it
    // the opening behind the door: a dark recess sitting just proud of the shell (so it is not buried inside it), with the card slit in it
    box(0.006, 0.38, 2.3, new THREE.MeshBasicMaterial({ color: 0x0c1418 }), -SX - 0.004, 0.31, 1.6);
    box(0.008, 0.16, 2.08, new THREE.MeshBasicMaterial({ color: 0x000000 }), -SX - 0.005, 0.31, 1.6);
    box(0.008, 0.03, 2.3, grey0, -SX - 0.005, 0.485, 1.6); box(0.008, 0.03, 2.3, grey0, -SX - 0.005, 0.135, 1.6); // top and bottom rim
    const doorPivot = new THREE.Group(); doorPivot.position.set(-SX + 0.004, 0.1, 1.6); device.add(doorPivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 2.4), M.tray); door.position.y = 0.21; doorPivot.add(door);
    { const dc = mk(600, 105), dx2 = dc.getContext('2d'), ENG = 'rgba(6,62,76,.8)';   // the door's face: a seam all round, the SD mark, the words, and a finger notch on the top edge
      dx2.strokeStyle = ENG; dx2.lineWidth = 4; rr(dx2, 4, 4, 592, 97, 8); dx2.stroke();
      dx2.fillStyle = 'rgba(4,40,50,.9)'; dx2.beginPath(); dx2.arc(430, 0, 30, 0, Math.PI); dx2.fill();
      dx2.lineWidth = 3.5; dx2.beginPath(); dx2.moveTo(150, 34); dx2.lineTo(172, 34); dx2.lineTo(182, 44); dx2.lineTo(182, 74); dx2.lineTo(150, 74); dx2.closePath(); dx2.stroke(); for (let n = 0; n < 3; n++) { dx2.beginPath(); dx2.moveTo(156 + n * 7, 38); dx2.lineTo(156 + n * 7, 48); dx2.stroke(); }
      dx2.fillStyle = ENG; dx2.font = `700 34px ${FONT}`; dx2.textAlign = 'left'; dx2.fillText('SD CARD', 200, 67);
      const dl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(dc), transparent: true, depthWrite: false })); dl.rotation.y = -HALF; dl.position.set(-0.017, 0, 0); door.add(dl); }
    const SW = 2.0, SH = 2.6, ST = 0.12;
    const ss = new THREE.Shape(); { const w = SW / 2, h = SH / 2, r = 0.1, ch = 0.36;
      ss.moveTo(-w + r, -h); ss.lineTo(w - ch, -h); ss.lineTo(w, -h + ch);                       // clipped corner at the end that goes in
      ss.lineTo(w, h - r); ss.quadraticCurveTo(w, h, w - r, h); ss.lineTo(-w + r, h); ss.quadraticCurveTo(-w, h, -w, h - r);
      ss.lineTo(-w, -h + r); ss.quadraticCurveTo(-w, -h, -w + r, -h); }
    const sgeo = new THREE.ExtrudeGeometry(ss, { depth: ST, bevelEnabled: false, curveSegments: 6 }); sgeo.rotateX(-HALF); sgeo.translate(0, -ST / 2, 0);
    const sdMat = new THREE.MeshStandardMaterial({ color: 0x1b2742, roughness: 0.45, metalness: 0.2 }); sdMat.color.convertSRGBToLinear();
    const sd = new THREE.Group(); scene.add(sd);
    const sdBody = new THREE.Mesh(sgeo, sdMat); sd.add(sdBody);
    const sdCv = mk(400, 500), sx2 = sdCv.getContext('2d'), sdTex = new THREE.CanvasTexture(sdCv); sdTex.encoding = THREE.sRGBEncoding; sdTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const sh = SECTIONS[2].items.map(() => 0); let shT = -1; // hover progress per row, and the row the pointer is on
    const sdRow = (uv) => { const n = uv ? Math.floor(((1 - uv.y) * 500 - 81) / 36) : -1; return su > 0.9 && n >= 0 && n < sh.length ? n : -1; };
    function drawSd() {
      const c = sx2, f = (w, s) => { c.font = `${w} ${s}px ${FONT}`; };
      c.fillStyle = '#f6f7f9'; c.fillRect(0, 0, 400, 500);
      c.fillStyle = '#1b2742'; c.fillRect(0, 0, 400, 62);
      c.fillStyle = '#fff'; f(600, 24); c.textAlign = 'left'; c.fillText('Projects', 22, 40); c.textAlign = 'right'; f(400, 19); c.fillText('10 on this card', 378, 40); c.textAlign = 'left';
      SECTIONS[2].items.forEach((it, n) => {
        const y = 106 + n * 36;
        c.fillStyle = '#d6dae0'; c.fillRect(22, y - 25, 356, 1.5);
        const q = sh[n], mix = (a, b) => Math.round(a + (b - a) * q);
        f(500, 20); c.fillStyle = `rgb(${mix(74, 22)},${mix(79, 25)},${mix(87, 28)})`; c.fillText(it.label, 22, y);
        c.fillRect(22, y + 6, c.measureText(it.label).width * q, 1.8);
        if (it.win) { c.textAlign = 'right'; c.fillStyle = '#1aa3b3'; f(600, 16); c.fillText('1st place', 378, y); c.textAlign = 'left'; }
      });
      c.fillStyle = '#7a808a'; f(400, 16); c.fillText('Click a project to open its page', 22, 478);
      sdTex.needsUpdate = true;
    }
    drawSd(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSd, () => {});
    const slg = new THREE.PlaneGeometry(1.76, 2.2); slg.rotateX(-HALF);
    const sdLbl = new THREE.Mesh(slg, new THREE.MeshBasicMaterial({ map: sdTex })); sdLbl.position.set(0, ST / 2 + 0.004, -0.08); sd.add(sdLbl);
    const sbCv = mk(256, 330), sbx = sbCv.getContext('2d'); sbx.fillStyle = '#141d33'; sbx.fillRect(0, 0, 256, 330); for (let q = 0; q < 8; q++) { sbx.fillStyle = '#d7b35a'; sbx.fillRect(20 + q * 27, 16, 17, 70); }
    const sbg = new THREE.PlaneGeometry(1.86, 2.4); sbg.rotateX(HALF);
    const sdBack = new THREE.Mesh(sbg, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sbCv) })); sdBack.position.y = -ST / 2 - 0.004; sd.add(sdBack);
    const sdSlot = new THREE.Object3D(); sdSlot.position.set(-SX + 0.03 + SH / 2, 0.31, 1.6); sdSlot.rotation.y = HALF; device.add(sdSlot); // label end faces out of the slot
    let su = 0, st = 0;
    const sdAct = () => {
      st = st ? 0 : 1;
      if (st) { if (ct) ct = 0; toast('SD card ejected: 10 projects on it'); if (openness() > 0.9 && !isBooting()) enter(2); }
      else toast('SD card back in');
    };
    [door, sdBody, sdBack].forEach((m) => prop(m, () => sdAct()));
    sdLbl.userData.hover = (uv) => { shT = sdRow(uv); };
    prop(sdLbl, (uv) => { // each row is a link to that project's page
      const n = sdRow(uv);
      if (n >= 0) { const it = SECTIONS[2].items[n]; openUrl(it.links[0][1]); toast('Opened ' + it.label + ' on ' + it.links[0][0]); return; }
      sdAct();
    });
    { const A = new THREE.Vector3(), Aq = new THREE.Quaternion(), d = new THREE.Vector3(), T = new THREE.Vector3(), Tq = new THREE.Quaternion(), sp = new THREE.Quaternion(), up = new THREE.Vector3();
      const face = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), HALF);
      tickers.push((dt, t) => {
        { let moved = false; for (let n = 0; n < sh.length; n++) { const to = shT === n ? 1 : 0, was = sh[n]; sh[n] += (to - sh[n]) * (1 - Math.exp(-dt * 16)); if (Math.abs(to - sh[n]) < 0.004) sh[n] = to; if (sh[n] !== was) moved = true; } if (moved) drawSd(); }
        su += (st - su) * (1 - Math.exp(-dt * (reduced ? 80 : 3.0)));
        if (Math.abs(st - su) < 0.0005) su = st;
        doorPivot.rotation.z = 1.75 * THREE.MathUtils.smoothstep(su, 0, 0.12);                   // door drops first
        rig.updateWorldMatrix(true, true);
        sdSlot.getWorldPosition(A); sdSlot.getWorldQuaternion(Aq);
        const sc = rig.scale.x, o = THREE.MathUtils.clamp((su - 0.1) / 0.22, 0, 1), fly = THREE.MathUtils.smootherstep(su, 0.36, 1);
        const pop = 1 + 2.4 * Math.pow(o - 1, 3) + 1.4 * Math.pow(o - 1, 2);                      // springs out past its rest point, then settles
        d.set(0, 0, -1).applyQuaternion(Aq); A.addScaledVector(d, (SH * 0.8) * pop * sc);
        d.set(0, 0, -1).applyQuaternion(camera.quaternion); T.copy(camera.position).addScaledVector(d, Math.max(11, dist * 0.4));
        up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        sp.setFromAxisAngle(up, fly * Math.PI * 2 + Math.sin(t * 1.1 + 1) * 0.16 * fly); // one full flip on the way (a whole turn, so it starts and ends square), then a slow sway
        Tq.copy(camera.quaternion).multiply(face);
        sd.position.lerpVectors(A, T, fly); sd.quaternion.copy(Aq).slerp(Tq, fly).premultiply(sp); // turn first, then add the flip on top: blending toward an already-spinning pose made it jump
        sd.scale.setScalar(sc + (1.5 - sc) * fly);
      }); }

    // right side: wireless switch
    box(0.05, 0.13, 1.0, blk, SX - 0.045, 0.87, -1.7);
    const wifi = slide(ridge(box(0.09, 0.2, 0.32, M.key, SX - 0.03, 0.87, -1.9), 1), 0, 0, 0.4);
    const wifiLed = box(0.05, 0.1, 0.1, blk, SX - 0.02, 0.87, -2.62);                                   // the small wireless light, just past the switch
    const wifiAct = () => { const on = flip(wifi); wifiLed.material = on ? amber : blk; toast(on ? 'Wireless on' : 'Wireless off'); };
    prop(wifi, wifiAct); prop(box(0.12, 0.3, 1.2, M.hit, SX - 0.0, 0.87, -1.7), wifiAct);
    { const wc = mk(360, 64), wx = wc.getContext('2d'); wx.fillStyle = '#e6d48a'; wx.font = `600 30px ${FONT}`; wx.textAlign = 'left'; wx.fillText('WIRELESS', 20, 43); // printed in pale yellow, with the Wi-Fi mark after it
      wx.strokeStyle = '#e6d48a'; wx.lineWidth = 4.5; wx.lineCap = 'round'; for (const r of [11, 21, 31]) { wx.beginPath(); wx.arc(331, 50, r, -Math.PI * 0.75, -Math.PI * 0.25); wx.stroke(); } wx.beginPath(); wx.arc(331, 50, 4.5, 0, 7); wx.fill(); // the Wi-Fi mark: a dot with three arcs fanning up from it
      wall(wc, 1.7, 0.3, SX + 0.004, 0.3, -1.85, HALF); }

    // back (seen from behind, left to right): R button, charging port, game card slot, stylus, infrared window, strap hole, L button
    const BZ = -FZ, silver = new THREE.MeshStandardMaterial({ color: 0xa9b0b8, roughness: 0.35, metalness: 0.7 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.5, metalness: 0.4 });
    const stripM = new THREE.MeshStandardMaterial({ color: 0x76736f, roughness: 0.36, metalness: 0.9 }); stripM.color.convertSRGBToLinear(); // dark, slightly warm gunmetal, like the real back plate
    box(10.9, 0.64, 0.06, stripM, 0, 0.29, BZ);                         // the back face of the metal plate, between the two bumpers
    box(10.9, 0.04, 0.08, blk, 0, 0.61, BZ);                            // shadow line under the hinge
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a44a, roughness: 0.35, metalness: 0.8 }); gold.color.convertSRGBToLinear();
    // right-hand end (next to R): strap hole, then the charging port between its two cradle contacts. All of them are
    // rounded openings in the upper part of the plate, each with a bright bevelled edge; the rating is stamped below the port.
    const bevM = new THREE.MeshStandardMaterial({ color: 0xb4b1ab, roughness: 0.28, metalness: 0.9 }); bevM.color.convertSRGBToLinear();
    const holeM = new THREE.MeshBasicMaterial({ color: 0x08090a });
    const flatB = (w, h, r, mat, x, y, dz) => add(device, new THREE.ShapeGeometry(roundRect(w, h, r), 10).rotateY(Math.PI), mat, x, y, BZ - dz); // a flat rounded shape on the back face
    const hole = (w, h, r, x, y) => { flatB(w + 0.07, h + 0.07, r + 0.03, bevM, x, y, 0.032); return flatB(w, h, r, holeM, x, y, 0.034); };
    const HY = 0.41; // the row of openings sits high on the plate
    for (const hx of [5.02, -5.02]) hole(0.3, 0.19, 0.07, hx, HY);                                                             // strap holes, one at each end
    for (const gx of [4.5, 3.24]) { hole(0.3, 0.25, 0.07, gx, HY); flatB(0.2, 0.15, 0.03, gold, gx, HY - 0.03, 0.036); }          // the two gold cradle contacts, sitting low in their holes
    { const port = hole(0.9, 0.33, 0.12, 3.87, HY);                                                                               // charging port: a wide rounded opening with the metal tongue inside
      prop(port, () => { const on = chargeLed.material !== amber; chargeLed.material = on ? amber : blk; toast(on ? 'Charging' : 'Unplugged'); });
      flatB(0.52, 0.07, 0.02, stripM, 3.87, HY + 0.02, 0.036); flatB(0.66, 0.04, 0.02, grey, 3.87, HY - 0.09, 0.036); }
    { const tc2 = mk(300, 64), tx3 = tc2.getContext('2d'); tx3.fillStyle = 'rgba(18,18,18,.82)'; tx3.font = `600 34px ${FONT}`; tx3.textAlign = 'center'; tx3.fillText('4.6V ⎓ IN', 150, 44);
      wall(tc2, 0.86, 0.184, 3.87, 0.12, BZ - 0.034, Math.PI); }
    box(2.56, 0.022, 0.02, bevM, -4.17, -0.022, BZ - 0.03); box(0.46, 0.022, 0.02, bevM, -2.18, -0.022, BZ - 0.03); box(3.5, 0.022, 0.02, bevM, 3.7, -0.022, BZ - 0.03); // (broken where the stylus hole and the card slot pass through)
                                                                              // the bright line where the plate folds under
    // finger notch scooped out of the underside below the card slot
    // the metal strip arches up onto the underside over the card slot, with one screw in it
    // under the card slot the plate is cut away in an arch, so you can see (and push) the card through it: a metal rim, the card showing inside
    const notchDark = new THREE.MeshBasicMaterial({ color: 0x06090b });
    { // the plate folds under the console as a wide band. Below the card slot a rounded bite is taken out of it, so the card shows through and can be pushed.
      const NX = 1.62, NZ = 0.46, BD2 = 0.95; // a shallow bite, narrower than the card
      const sh = new THREE.Shape(); sh.moveTo(-5.45, 0); sh.lineTo(-NX, 0); sh.absellipse(0, 0, NX, NZ, Math.PI, 0, true); sh.lineTo(5.45, 0); sh.lineTo(5.45, BD2); sh.lineTo(-5.45, BD2); sh.closePath();
      const bandG = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 40 }); bandG.rotateX(HALF);
      add(device, bandG, stripM, 0, 0, BZ);
      const rs = new THREE.Shape(); rs.moveTo(-NX - 0.1, 0); rs.absellipse(0, 0, NX + 0.1, NZ + 0.1, Math.PI, 0, true); rs.lineTo(NX, 0); rs.absellipse(0, 0, NX, NZ, 0, Math.PI, false); rs.closePath(); // the bite's rolled edge
      const rimG = new THREE.ExtrudeGeometry(rs, { depth: 0.075, bevelEnabled: false, curveSegments: 40 }); rimG.rotateX(HALF);
      const rimM = new THREE.MeshStandardMaterial({ color: 0xa9a6a0, roughness: 0.3, metalness: 0.9 }); rimM.color.convertSRGBToLinear(); add(device, rimG, rimM, 0, 0, BZ);
      const ng = new THREE.CircleGeometry(1, 48, 0, Math.PI).rotateX(HALF); const hole = add(device, ng, notchDark, 0, -0.004, BZ - 0.005); hole.scale.set(NX, 1, NZ); } // the empty slot, seen through the bite when the card is out. Seated, the card itself covers it.
    // game card: a real card that ejects, flies up to the camera and flips over to show its label
    box(3.86, 0.34, 0.02, blk, 0, 0.142, BZ - 0.032);                 // the card slot: open right down to the plate's bottom edge, so the card's end and its underside (seen through the bite) are one piece
    const CW = 3.5, CH = 3.8, CT = 0.3; // a chunky card, as thick as the real one looks in its slot
    const cs = new THREE.Shape(); { const w = CW / 2, h = CH / 2, r = 0.16;
      cs.moveTo(-w + r, -h); cs.lineTo(w - r, -h); cs.quadraticCurveTo(w, -h, w, -h + r);
      cs.lineTo(w, h - 1.0); cs.lineTo(w + 0.14, h - 0.9); cs.lineTo(w + 0.14, h - r); cs.quadraticCurveTo(w + 0.14, h, w + 0.14 - r, h); // the small tab by the top corner
      cs.lineTo(-w + r, h); cs.quadraticCurveTo(-w, h, -w, h - r); cs.lineTo(-w, -h + r); cs.quadraticCurveTo(-w, -h, -w + r, -h); }
    const cg = new THREE.ExtrudeGeometry(cs, { depth: CT, bevelEnabled: false, curveSegments: 8 }); cg.rotateX(-HALF); cg.translate(0, -CT / 2, 0);
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.62, metalness: 0.02 }); // white, like the card in a real console cardMat.color.convertSRGBToLinear();
    const card = new THREE.Group(); scene.add(card);
    const cardBody = new THREE.Mesh(cg, cardMat); card.add(cardBody);
    // front label
    const lblCv = mk(640, 600), lx = lblCv.getContext('2d'), lblTex = new THREE.CanvasTexture(lblCv);
    lblTex.encoding = THREE.sRGBEncoding; lblTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const lh = [0, 0]; let lhT = -1; // hover progress for the two links, and which one the pointer is on
    function drawLabel() {
      const c = lx, f = (w, s) => { c.font = `${w} ${s}px ${FONT}`; };
      c.fillStyle = '#f6f7f9'; c.fillRect(0, 0, 640, 600);
      c.fillStyle = '#1aa3b3'; c.fillRect(0, 0, 640, 64);
      c.fillStyle = '#fff'; f(600, 22); c.textAlign = 'left'; c.fillText('Portfolio', 30, 41); c.textAlign = 'right'; f(500, 20); c.fillText('Game card', 610, 41); c.textAlign = 'left';
      const ph = PICS.photo && PICS.photo.naturalWidth ? PICS.photo : null;
      c.save(); rr(c, 30, 92, 176, 176, 14); c.clip(); c.fillStyle = '#dfe3e8'; c.fillRect(30, 92, 176, 176); if (ph) c.drawImage(ph, 30, 92, 176, 176); c.restore();
      c.fillStyle = '#2a2d33'; f(600, 40); c.fillText('Petar Isakovic', 232, 150);
      c.fillStyle = '#7a808a'; f(400, 22); c.fillText('Software Engineering', 232, 188); c.fillText('University of Waterloo', 232, 218);
      [['Now', 'StackAdapt, audiences team'], ['Before', 'Zomp and Heseri Games'], ['Also', 'Co-founder of GooseHacks'], ['Based', 'Waterloo, Ontario']].forEach(([k, v], i) => {
        const y = 312 + i * 54;
        c.fillStyle = '#d6dae0'; c.fillRect(30, y - 34, 580, 2);
        c.fillStyle = '#7a808a'; f(400, 21); c.fillText(k, 30, y);
        c.fillStyle = '#2a2d33'; f(500, 22); c.fillText(v, 150, y);
      });
      c.fillStyle = '#d6dae0'; c.fillRect(30, 494, 580, 2);
      f(500, 20); // the two links: grey, and on hover they darken while an underline sweeps in from the left (same as the page's top-right links)
      [['petarisakovic.ca', 30], ['github.com/PetarIsakovic', 610 - c.measureText('github.com/PetarIsakovic').width]].forEach(([s, x], n) => {
        const q = lh[n], w = c.measureText(s).width, mix = (a, b) => Math.round(a + (b - a) * q);
        c.fillStyle = `rgb(${mix(122, 22)},${mix(128, 25)},${mix(138, 28)})`;
        c.fillText(s, x, 540); c.fillRect(x, 548, w * q, 1.8);
      });
      lblTex.needsUpdate = true;
    }
    drawLabel(); if (PICS.photo) PICS.photo.addEventListener('load', drawLabel);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLabel, () => {});
    const lg = new THREE.PlaneGeometry(3.14, 2.944); lg.rotateX(-HALF);
    const lbl = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ map: lblTex })); lbl.position.set(0, CT / 2 + 0.004, 0.28); card.add(lbl);
    // back: plain grey with a row of gold contacts at the end that goes in
    const bkCv = mk(512, 560), bx = bkCv.getContext('2d'); bx.fillStyle = '#efefec'; bx.fillRect(0, 0, 512, 560); bx.fillStyle = '#e2e2de'; bx.fillRect(24, 150, 464, 260);
    for (let q = 0; q < 16; q++) { bx.fillStyle = '#d7b35a'; bx.fillRect(40 + q * 27.4, 36, 17, 92); }
    bx.save(); bx.translate(256, 486); bx.rotate(Math.PI); bx.textAlign = 'center'; bx.fillStyle = '#23262b'; bx.font = `700 46px ${FONT}`; bx.fillText('PETAR', -40, 16); bx.fillStyle = '#c0392b'; bx.beginPath(); bx.arc(86, 0, 22, 0, 7); bx.fill(); bx.restore(); // reads the right way up through the bite
    const bg = new THREE.PlaneGeometry(3.3, 3.6); bg.rotateX(HALF);
    const bk = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bkCv) })); bk.position.y = -CT / 2 - 0.004; card.add(bk);
    const slotA = new THREE.Object3D(); slotA.position.set(0, CT / 2 - 0.032, BZ + CH / 2 - 0.075); device.add(slotA); // seated: only the card's end shows, just inside the slot's rim
    let cu = 0, ct = 0;
    const cardAct = () => {
      ct = ct ? 0 : 1;
      if (ct && st) st = 0;
      if (ct) { toast('Game card ejected'); if (S.sec && S.sec.game) goHome(); }
      else toast('Game card back in');
    };
    [cardBody, bk].forEach((m) => prop(m, () => cardAct()));
    lbl.userData.hover = (uv) => { lhT = uv && cu > 0.9 && (1 - uv.y) * 600 > 506 ? (uv.x < 0.5 ? 0 : 1) : -1; };
    prop(lbl, (uv) => { // the bottom strip of the label holds two links
      if (uv && cu > 0.9 && (1 - uv.y) * 600 > 506) { openUrl(uv.x < 0.5 ? 'https://petarisakovic.ca' : 'https://github.com/PetarIsakovic'); return; }
      cardAct();
    });
    const cA = new THREE.Vector3(), cAq = new THREE.Quaternion(), cDir = new THREE.Vector3(), cT = new THREE.Vector3(), cTq = new THREE.Quaternion(), cSpin = new THREE.Quaternion(), cUp = new THREE.Vector3();
    const cFace = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), HALF);
    stow = () => { const any = !!(st || ct); st = 0; ct = 0; return any; };
    cartTick = (dt, t) => {
      { let moved = false; for (let n = 0; n < 2; n++) { const to = lhT === n ? 1 : 0, was = lh[n]; lh[n] += (to - lh[n]) * (1 - Math.exp(-dt * 16)); if (Math.abs(to - lh[n]) < 0.004) lh[n] = to; if (lh[n] !== was) moved = true; } if (moved) drawLabel(); }
      cu += (ct - cu) * (1 - Math.exp(-dt * (reduced ? 80 : 2.6)));
      if (Math.abs(ct - cu) < 0.0005) cu = ct;
      rig.updateWorldMatrix(true, true);
      slotA.getWorldPosition(cA); slotA.getWorldQuaternion(cAq);
      const sc = rig.scale.x, out = Math.min(1, cu / 0.26), fly = THREE.MathUtils.smootherstep(cu, 0.26, 1);
      // like the real thing: press it in until it clicks, it springs part-way out, then it is pulled the rest of the way
      const ss = THREE.MathUtils.smoothstep, press = ss(out, 0, 0.12) - ss(out, 0.12, 0.22);
      const pop = ss(out, 0.14, 0.34), bounce = Math.sin(Math.min(1, Math.max(0, (out - 0.22) / 0.3)) * Math.PI * 2) * 0.05 * (1 - ss(out, 0.3, 0.52));
      const travel = -0.07 * press + pop * 0.95 + bounce + ss(out, 0.55, 1) * (CH + 0.3 - 0.95);
      cDir.set(0, 0, -1).applyQuaternion(cAq); cA.addScaledVector(cDir, travel * sc);
      cDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
      cT.copy(camera.position).addScaledVector(cDir, Math.max(11, dist * 0.4));                       // then it flies up in front of the camera
      cUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      cSpin.setFromAxisAngle(cUp, fly * Math.PI * 2 + Math.sin(t * 1.1) * 0.16 * fly);                // one full flip on the way, then a slow sway
      cTq.copy(camera.quaternion).multiply(cFace);
      card.position.lerpVectors(cA, cT, fly);
      card.quaternion.copy(cAq).slerp(cTq, fly).premultiply(cSpin);
      card.scale.setScalar(sc + (1 - sc) * fly);
    };
    const sty = new THREE.CylinderGeometry(0.2, 0.2, 0.09, 28); sty.rotateX(HALF);
    { // stylus hole: an arch-shaped opening cut into the plate, rounded at the top, carrying on round the fold
      const as = new THREE.Shape(); as.moveTo(-0.23, -0.378); as.lineTo(-0.23, -0.1); as.absarc(0, -0.1, 0.23, Math.PI, 0, true); as.lineTo(0.23, -0.378); as.closePath(); // open right down to the fold
      add(device, new THREE.ShapeGeometry(as, 24).rotateY(Math.PI), new THREE.MeshBasicMaterial({ color: 0x050607 }), -2.65, 0.31, BZ - 0.034); // cut straight into the plate: no frame, no raised block
      const stepM = new THREE.MeshStandardMaterial({ color: 0x4f4d4a, roughness: 0.4, metalness: 0.85 }); stepM.color.convertSRGBToLinear();
      const rimL0 = new THREE.MeshStandardMaterial({ color: 0xa9a6a0, roughness: 0.3, metalness: 0.9 }); rimL0.color.convertSRGBToLinear();
      { const dn = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.46), new THREE.MeshBasicMaterial({ color: 0x050607 })); dn.position.set(-2.65, -0.042, BZ + 0.185); device.add(dn); } // the same hole carrying on round the fold, seen from underneath
      box(0.46, 0.02, 0.06, stepM, -2.65, -0.045, BZ + 0.385);                                           // the step at its inner end
    }
    const rod = new THREE.CylinderGeometry(0.11, 0.09, 3.2, 20); rod.rotateX(HALF);
    const stylus = slide(add(device, rod, silver, -2.65, 0.31, BZ + 1.62), 0, 0, -1.5); // stowed, only its cap shows, flush with the back
    const cap = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 24); cap.rotateX(HALF);
    { const capM = new THREE.Mesh(cap, blk); capM.position.z = -1.6; stylus.add(capM); }                // the black grip cap on the end you pull
    prop(stylus, () => toast(flip(stylus) ? 'Stylus out. A mouse works on the touch screen too.' : 'Stylus stowed'));
    prop(box(1.0, 0.32, 0.03, M.gloss, -3.95, 0.31, BZ - 0.035), () => toast('Infrared port. Nothing to beam today.')); // infrared window, by L
    const bump = M.tray; // the bumpers are the lighter, glossier teal of the lower shell
    { // underside: screws along the back edge, a wordmark, small print, a serial label, the battery cover seam, rubber feet
      const c = mk(1520, 840), x = c.getContext('2d'), INKP = 'rgba(214,240,244,.92)';
      x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 3; rr(x, 34, 118, 1452, 690, 26); x.stroke();
      x.fillStyle = INKP; x.textAlign = 'center';
      x.strokeStyle = INKP; x.lineWidth = 2.5; rr(x, 747, 132, 26, 24, 3); x.stroke(); x.beginPath(); x.moveTo(753, 132); x.lineTo(753, 124); x.lineTo(767, 124); x.lineTo(767, 132); x.stroke();
      x.font = `700 64px ${FONT}`; let wx = 760 - 330; for (const ch of 'PETAR ISAKOVIC') { x.textAlign = 'left'; x.fillText(ch, wx, 296); wx += x.measureText(ch).width + 7; }
      x.textAlign = 'center'; x.font = `500 19px ${FONT}`;
      ['SOFTWARE ENGINEERING, UNIVERSITY OF WATERLOO. ASSEMBLED IN WATERLOO, ONTARIO.', 'THIS IS A 3D MODEL BUILT FOR PETARISAKOVIC.CA. IT IS NOT A NINTENDO PRODUCT', 'AND IS NOT AFFILIATED WITH OR ENDORSED BY NINTENDO.'].forEach((l, i) => x.fillText(l, 760, 362 + i * 28));
      x.strokeStyle = INKP; x.lineWidth = 2.5; rr(x, 690, 478, 140, 44, 22); x.stroke(); x.font = `700 22px ${FONT}`; x.fillText('petar', 760, 508);
      // serial label. The stripes are a real Code 128 barcode: a scanner reads a hidden message, not the serial printed under it.
      rr(x, 560, 700, 400, 70, 6); x.fillStyle = '#f2f3f5'; x.fill();
      let coded = false;
      if (window.JsBarcode) { try { const bcv = mk(10, 10); window.JsBarcode(bcv, 'I <3 JAVA', { format: 'CODE128', displayValue: false, width: 2, height: 30, margin: 0, background: '#f2f3f5', lineColor: '#2a2d33' });
        x.imageSmoothingEnabled = false; x.drawImage(bcv, Math.round(760 - bcv.width / 2), 710); x.imageSmoothingEnabled = true; coded = true; } catch (err) { /* fall back to plain stripes */ } } // centred, with clear space either side: scanners need that margin
      if (!coded) { x.fillStyle = '#2a2d33'; for (let q = 0; q < 46; q++) x.fillRect(578 + q * 7.9, 710, q % 3 ? 3 : 5, 30); }
      x.fillStyle = '#2a2d33'; x.font = `500 15px ${FONT}`; x.fillText('PI-2026-WATERLOO', 760, 762);
      x.fillStyle = 'rgba(0,0,0,.45)'; [[70, 776], [1450, 776]].forEach(([fx, fy]) => { rr(x, fx - 26, fy - 10, 52, 20, 8); x.fill(); });
      const g = new THREE.PlaneGeometry(15.2, 8.4); g.rotateX(HALF); g.rotateY(Math.PI); // faces down, top of the print toward the hinge
      // The back cover is its own part, held on by four screws. Click each screw to take it out; with all four out the
      // console comes apart into an exploded view: back cover, battery, mainboard, shell.
      const plate = new THREE.Group(); device.add(plate);
      const plateM = new THREE.Mesh(slab(15.3, 7.6, 0.07, 0.5, 0.02), M.tray); plateM.position.set(0, -0.04, 0.35); plate.add(plateM); solids.push(plateM);
      const dec = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); dec.position.y = -0.079; plate.add(dec);
      { const cv2 = mk(1530, 760), q = cv2.getContext('2d'); q.fillStyle = '#9aa1a9'; rr(q, 20, 20, 1490, 720, 44); q.fill(); // inside of the cover: a grey steel plate with ribs and a foil patch
        q.strokeStyle = 'rgba(0,0,0,.2)'; q.lineWidth = 4; for (let n = 0; n < 9; n++) { q.beginPath(); q.moveTo(80 + n * 170, 60); q.lineTo(80 + n * 170, 700); q.stroke(); } for (let n = 0; n < 4; n++) { q.beginPath(); q.moveTo(60, 120 + n * 170); q.lineTo(1470, 120 + n * 170); q.stroke(); }
        q.fillStyle = '#3b4046'; q.fillRect(820, 250, 560, 330); q.fillStyle = '#c9ced4'; q.font = `600 20px ui-monospace, Menlo, monospace`; q.fillText('BATTERY BAY   PI-BATT-003', 846, 290); q.fillText('COVER  PC+ABS  1.2t   STEEL 0.4t', 90, 100);
        [[60, 60], [1470, 60], [60, 700], [1470, 700]].forEach(([a, b]) => { q.fillStyle = '#c9a44a'; q.beginPath(); q.arc(a, b, 16, 0, 7); q.fill(); q.fillStyle = '#23262b'; q.beginPath(); q.arc(a, b, 7, 0, 7); q.fill(); });
        const ug = new THREE.PlaneGeometry(15.3, 7.6); ug.rotateX(-HALF); const tx2 = new THREE.CanvasTexture(cv2); tx2.encoding = THREE.sRGBEncoding; const um = new THREE.Mesh(ug, new THREE.MeshBasicMaterial({ map: tx2, transparent: true })); um.position.set(0, -0.004, 0.35); plate.add(um); }
      const down = (w, d) => { const pg = new THREE.PlaneGeometry(w, d); pg.rotateX(HALF); pg.rotateY(Math.PI); return pg; }; // a flat face looking down, print reading the same way as the cover
      { // the inside of the shell, seen once the cover is off: moulded ribs, screw bosses, and a bay marked out for every part
        const cv2 = mk(1460, 700), q = cv2.getContext('2d'), X = (wx) => (0.5 - wx / 14.6) * 1460, Z = (wz) => ((wz - 0.35) / 7.0 + 0.5) * 700, SC = 100;
        const bay = (x0, z0, x1, z1, label, fill) => { const a = Math.min(X(x0), X(x1)), b = Math.min(Z(z0), Z(z1)), w = Math.abs(X(x1) - X(x0)), h = Math.abs(Z(z1) - Z(z0)); if (fill) { q.fillStyle = fill; q.fillRect(a, b, w, h); } q.strokeStyle = 'rgba(190,200,210,.55)'; q.lineWidth = 2; q.strokeRect(a, b, w, h); q.strokeStyle = 'rgba(0,0,0,.5)'; q.strokeRect(a + 3, b + 3, w - 6, h - 6); if (label) { q.fillStyle = 'rgba(200,210,220,.8)'; q.font = '600 13px ui-monospace, Menlo, monospace'; q.fillText(label, a + 10, b + 20); } };
        q.fillStyle = '#1d2025'; q.fillRect(0, 0, 1460, 700);
        q.strokeStyle = 'rgba(255,255,255,.055)'; q.lineWidth = 2; for (let n = 0; n < 60; n++) { q.beginPath(); q.moveTo(n * 26, 0); q.lineTo(n * 26, 700); q.stroke(); } for (let n = 0; n < 28; n++) { q.beginPath(); q.moveTo(0, n * 26); q.lineTo(1460, n * 26); q.stroke(); } // rib grid
        q.strokeStyle = 'rgba(120,130,140,.9)'; q.lineWidth = 6; q.strokeRect(8, 8, 1444, 684);                                                            // the shell's inner lip
        bay(-4.1, -3.1, 4.1, 2.65, 'LCD BAY  8.2 x 6.2', '#15171b');
        bay(0.3, -0.75, 6.3, 2.75, 'BATT BAY  PI-BATT-003', '#22262c');
        bay(-2.35, -3.1, 2.35, -1.0, 'SLOT-1', '#2a2e35');
        q.strokeStyle = 'rgba(190,200,210,.55)'; q.lineWidth = 2;
        q.beginPath(); q.arc(X(-5.85), Z(-0.6), 1.05 * SC, 0, 7); q.stroke(); q.beginPath(); q.arc(X(-5.85), Z(-0.6), 0.75 * SC, 0, 7); q.stroke();               // circle pad well
        { const c = 0.4 * SC, L = 1.15 * SC, x0 = X(-5.85), z0 = Z(2.0); q.beginPath(); [[-c, -L], [c, -L], [c, -c], [L, -c], [L, c], [c, c], [c, L], [-c, L], [-c, c], [-L, c], [-L, -c], [-c, -c]].forEach(([a, b], n) => (n ? q.lineTo(x0 + a, z0 + b) : q.moveTo(x0 + a, z0 + b))); q.closePath(); q.stroke(); } // D-pad well
        [[0.95, 0], [0, 0.95], [0, -0.95], [-0.95, 0]].forEach(([ax, az]) => { q.beginPath(); q.arc(X(5.85 + ax), Z(0.15 + az), 0.5 * SC, 0, 7); q.stroke(); q.beginPath(); q.arc(X(5.85 + ax), Z(0.15 + az), 0.2 * SC, 0, 7); q.stroke(); });
        [-2.4, 0, 2.4].forEach((bx3) => q.strokeRect(X(bx3 + 0.9), Z(2.95), 1.8 * SC, 0.5 * SC));
        [[-7.0, -2.9], [7.0, -2.9], [-7.0, 3.6], [7.0, 3.6], [-4.6, -2.9], [4.6, -2.9], [6.5, -3.0], [4.3, -3.0], [-4.3, -3.0], [-6.5, -3.0], [0, 3.6]].forEach(([bx3, bz3]) => { q.fillStyle = '#3a3f46'; q.beginPath(); q.arc(X(bx3), Z(bz3), 20, 0, 7); q.fill(); q.fillStyle = '#c9a44a'; q.beginPath(); q.arc(X(bx3), Z(bz3), 12, 0, 7); q.fill(); q.fillStyle = '#0c0e10'; q.beginPath(); q.arc(X(bx3), Z(bz3), 5, 0, 7); q.fill(); }); // bosses with brass inserts
        q.fillStyle = 'rgba(200,210,220,.8)'; q.font = '600 13px ui-monospace, Menlo, monospace';
        q.fillText('PI-CTR-UPR   >PC+ABS<   CAV 2   2026-11', 960, 676); q.fillText('EMI COAT  Cu/Ni', 40, 676); q.fillText('CPAD', X(-5.85) - 18, Z(-0.6) + 4); q.fillText('DPAD', X(-5.85) - 18, Z(2.0) + 4); q.fillText('A B X Y', X(5.85) - 30, Z(0.15) + 4);
        for (let n = 0; n < 2; n++) { const cx = 60 + n * 70, cy = 60; q.strokeStyle = 'rgba(200,210,220,.7)'; q.lineWidth = 1.5; q.beginPath(); q.arc(cx, cy, 24, 0, 7); q.stroke(); for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; q.beginPath(); q.moveTo(cx + Math.cos(an) * 18, cy + Math.sin(an) * 18); q.lineTo(cx + Math.cos(an) * 24, cy + Math.sin(an) * 24); q.stroke(); } q.beginPath(); q.moveTo(cx, cy); q.lineTo(cx + 12, cy - 10); q.stroke(); } // mould date clocks
        const tx2 = new THREE.CanvasTexture(cv2); tx2.encoding = THREE.sRGBEncoding; tx2.anisotropy = renderer.capabilities.getMaxAnisotropy();
        add(device, down(14.6, 7.0), new THREE.MeshBasicMaterial({ map: tx2 }), 0, -0.003, 0.35); }
      // ---- what is inside. All of it sits hidden in the shell until the cover comes off.
      const std = (c, r, m) => { const mt = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); mt.color.convertSRGBToLinear(); return mt; };
      const steel = std(0xb9c0c8, 0.34, 0.9), chipM = std(0x15181c, 0.5, 0.2), rubber = std(0xd9dde2, 0.8, 0), amberM = new THREE.MeshBasicMaterial({ color: 0xd08a1e, side: THREE.DoubleSide });
      const part = (x, y, z) => { const gp = new THREE.Group(); gp.position.set(x, y, z); device.add(gp); gp.userData.y0 = y; return gp; };
      const put = (gp, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); gp.add(m); solids.push(m); return m; };
      const face = (gp, w, d, cvs, y, x, z) => { const tx = new THREE.CanvasTexture(cvs); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = renderer.capabilities.getMaxAnisotropy(); const m = new THREE.Mesh(down(w, d), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); m.position.set(x || 0, y, z || 0); gp.add(m); return tx; };
      const mono = (c2, w, sz) => { c2.font = `${w} ${sz}px ui-monospace, "SF Mono", Menlo, monospace`; };
      // the same, for the side of a part that faces up (seen when you look at the stack from above)
      const faceUp = (gp, w, d, cvs, y, x, z) => { const tx = new THREE.CanvasTexture(cvs); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = renderer.capabilities.getMaxAnisotropy(); const ug = new THREE.PlaneGeometry(w, d); ug.rotateX(-HALF); const m = new THREE.Mesh(ug, new THREE.MeshBasicMaterial({ map: tx, transparent: true })); m.position.set(x || 0, y, z || 0); gp.add(m); return tx; };

      // 2. touch panel + LCD module
      const lcd = part(0, 0.95, -0.45);
      put(lcd, new THREE.BoxGeometry(8.2, 0.16, 6.2), chipM, 0, 0, 0);
      { const cv2 = mk(820, 620), q = cv2.getContext('2d'); q.fillStyle = '#8e959d'; q.fillRect(0, 0, 820, 620); q.strokeStyle = '#6d747c'; q.lineWidth = 3; q.strokeRect(22, 22, 776, 576);
        q.strokeStyle = 'rgba(255,255,255,.18)'; q.lineWidth = 1; for (let n = 0; n < 60; n++) { q.beginPath(); q.moveTo(22, 30 + n * 9.6); q.lineTo(798, 30 + n * 9.6); q.stroke(); }
        q.fillStyle = '#f1f3f5'; q.fillRect(60, 70, 330, 150); q.fillStyle = '#22252a'; mono(q, 700, 24); q.fillText('LCD-BTM-302', 78, 108); mono(q, 500, 18);
        ['3.02 in TFT  320x240', '4-wire resistive touch', 'src 640x480 canvas', 'REV C  2026-11'].forEach((l, n) => q.fillText(l, 78, 136 + n * 22));
        q.fillStyle = '#d9b450'; for (let n = 0; n < 22; n++) q.fillRect(470 + n * 13, 40, 7, 46); q.fillStyle = '#22252a'; mono(q, 500, 15); q.fillText('J1  FPC 22P 0.5mm', 470, 110);
        q.fillText('TP+  TP-  VCOM  AVDD', 470, 560); face(lcd, 8.2, 6.2, cv2, -0.085); }
      put(lcd, new THREE.BoxGeometry(1.4, 0.02, 1.5), amberM, -1.5, -0.02, -3.6);                    // its flex tail
      { const cv2 = mk(820, 620), q = cv2.getContext('2d'); q.fillStyle = '#9aa1a9'; q.fillRect(0, 0, 820, 620); q.fillStyle = '#0b0d10'; q.fillRect(26, 26, 768, 568); // the glass side: digitizer over the panel
        const gr = q.createLinearGradient(0, 0, 820, 620); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(26, 26, 768, 568);
        q.strokeStyle = 'rgba(210,180,90,.75)'; q.lineWidth = 3; q.strokeRect(40, 40, 740, 540); q.fillStyle = '#d9b450'; for (let n = 0; n < 4; n++) q.fillRect(360 + n * 26, 592, 14, 22);
        q.fillStyle = 'rgba(255,255,255,.45)'; mono(q, 500, 15); q.fillText('TOUCH  X+ X- Y+ Y-', 52, 572); faceUp(lcd, 8.2, 6.2, cv2, 0.085); }

      // 3. midframe: the black plastic frame everything mounts to, with openings for the screen, pad and buttons
      const shield = part(0, 0.86, 0);
      { const sh = new THREE.Shape(); const W2 = 7.4, D2 = 4.1; sh.moveTo(-W2 + 0.4, -D2); sh.lineTo(W2 - 0.4, -D2); sh.quadraticCurveTo(W2, -D2, W2, -D2 + 0.4); sh.lineTo(W2, D2 - 0.4); sh.quadraticCurveTo(W2, D2, W2 - 0.4, D2); sh.lineTo(-W2 + 0.4, D2); sh.quadraticCurveTo(-W2, D2, -W2, D2 - 0.4); sh.lineTo(-W2, -D2 + 0.4); sh.quadraticCurveTo(-W2, -D2, -W2 + 0.4, -D2);
        const hole = (pts) => { const h = new THREE.Path(); pts.forEach(([a, b], n) => (n ? h.lineTo(a, b) : h.moveTo(a, b))); h.closePath(); sh.holes.push(h); };
        const circ = (cx, cz, r) => { const h = new THREE.Path(); h.absarc(cx, cz, r, 0, Math.PI * 2, true); sh.holes.push(h); };
        hole([[-3.9, -3.45], [3.9, -3.45], [3.9, 2.45], [-3.9, 2.45]]);                                                             // screen window
        circ(-5.85, -0.6, 1.02);                                                                                                    // circle pad
        { const c = 0.36, L = 1.08, x0 = -5.85, z0 = 2.0; hole([[x0 - c, z0 - L], [x0 + c, z0 - L], [x0 + c, z0 - c], [x0 + L, z0 - c], [x0 + L, z0 + c], [x0 + c, z0 + c], [x0 + c, z0 + L], [x0 - c, z0 + L], [x0 - c, z0 + c], [x0 - L, z0 + c], [x0 - L, z0 - c], [x0 - c, z0 - c]]); } // D-pad
        [[0.95, 0], [0, 0.95], [0, -0.95], [-0.95, 0]].forEach(([ax, az]) => circ(5.85 + ax, 0.15 + az, 0.5));                      // A B X Y
        [-2.4, 0, 2.4].forEach((bx3) => hole([[bx3 - 0.85, 3.0], [bx3 + 0.85, 3.0], [bx3 + 0.85, 3.4], [bx3 - 0.85, 3.4]]));          // SELECT HOME START
        circ(5.25, 3.55, 0.3);                                                                                                      // power
        const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false, curveSegments: 20 }); fg.rotateX(HALF); fg.translate(0, 0.12, 0);
        put(shield, fg, std(0x191b1f, 0.72, 0.05), 0, 0, 0);
        [1, -1].forEach((side) => { // side: 1 = the face that looks down, -1 = up
          const cv2 = mk(1480, 820), q = cv2.getContext('2d'), X = (wx) => (0.5 - side * wx / 14.8) * 1480, Z = (wz) => (wz / 8.2 + 0.5) * 820;
          q.strokeStyle = 'rgba(255,255,255,.16)'; q.lineWidth = 3;
          [[-7.2, -3.9, -4.2, -3.9], [-7.2, 3.9, 7.2, 3.9], [4.2, -3.9, 7.2, -3.9], [-7.2, -3.9, -7.2, 3.9], [7.2, -3.9, 7.2, 3.9], [-4.4, -3.6, -4.4, 2.7], [4.4, -3.6, 4.4, 2.7], [-4.4, 2.7, 4.4, 2.7]].forEach(([a, b, c2, d]) => { q.beginPath(); q.moveTo(X(a), Z(b)); q.lineTo(X(c2), Z(d)); q.stroke(); }); // ribs
          q.lineWidth = 2; q.beginPath(); q.arc(X(-5.85), Z(-0.6), 118, 0, 7); q.stroke(); [[0.95, 0], [0, 0.95], [0, -0.95], [-0.95, 0]].forEach(([ax, az]) => { q.beginPath(); q.arc(X(5.85 + ax), Z(0.15 + az), 62, 0, 7); q.stroke(); });
          for (let n = 0; n < 14; n++) { q.fillStyle = 'rgba(255,255,255,.2)'; q.fillRect(X(-4.2 + n * 0.62) - 14, Z(-3.82), 28, 10); }                                 // snap-fit clips along the hinge edge
          q.fillStyle = 'rgba(215,220,226,.82)'; q.font = '600 14px ui-monospace, Menlo, monospace';
          q.fillText(side > 0 ? 'PI-CTR-MID  >ABS-GF20<  CAV 1' : 'PI-CTR-MID  TOP', X(side > 0 ? 7.0 : -7.0), Z(3.72)); q.fillText('CPAD', X(side > 0 ? -5.4 : -6.3), Z(0.72)); q.fillText('DPAD', X(side > 0 ? -5.4 : -6.3), Z(3.42)); q.fillText('ABXY', X(side > 0 ? 6.3 : 5.4), Z(1.9)); q.fillText('LCD WINDOW  7.8 x 5.9', X(side > 0 ? 3.7 : -3.7), Z(-3.6));
          (side > 0 ? face : faceUp)(shield, 14.8, 8.2, cv2, side > 0 ? -0.125 : 0.125);
        });
        for (const [rx, rz] of [[-7.0, -3.7], [7.0, -3.7], [-7.0, 3.7], [7.0, 3.7], [-4.6, -3.7], [4.6, -3.7]]) put(shield, new THREE.CylinderGeometry(0.16, 0.16, 0.34, 14), std(0xc9a44a, 0.35, 0.8), rx, 0, rz); } // brass screw bosses

      // 4. mainboard: an L-shaped board that wraps round the battery bay. U1 to U10 are the stack.
      const pcb = part(0, 0.72, 0.35);
      const b2w = (bx3, by3) => [-(bx3 / 1400 - 0.5) * 14, (by3 / 680 - 0.5) * 6.8];                   // board pixel -> position on the board
      { const sh = new THREE.Shape(); [[-7, -3.4], [7, -3.4], [7, -1.0], [0.2, -1.0], [0.2, 3.4], [-7, 3.4]].forEach(([a, b], n) => (n ? sh.lineTo(a, b) : sh.moveTo(a, b))); sh.closePath();
        const bg2 = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }); bg2.rotateX(HALF); bg2.translate(0, 0.04, 0); put(pcb, bg2, std(0x1e8f52, 0.55, 0.05), 0, 0, 0); }
      const pcv = mk(1400, 680), px = pcv.getContext('2d'), pcbTex = face(pcb, 14.0, 6.8, pcv, -0.045);
      { const cv2 = mk(1400, 680), q = cv2.getContext('2d'); q.fillStyle = '#1e8f52'; q.fillRect(0, 0, 1400, 240); q.fillRect(0, 240, 714, 440); // top side (mirrored outline: the bay is on the right from above)
        q.save(); q.beginPath(); q.rect(0, 0, 1400, 240); q.rect(0, 240, 714, 440); q.clip();
        q.strokeStyle = 'rgba(210,245,190,.34)'; q.lineWidth = 2.2; for (let n = 0; n < 14; n++) { q.beginPath(); q.moveTo(20 + n * 10, 660); q.lineTo(20 + n * 10, 40 + n * 13); q.lineTo(1380, 40 + n * 13); q.stroke(); }
        q.fillStyle = 'rgba(210,245,190,.55)'; for (let n = 0; n < 150; n++) { q.beginPath(); q.arc(20 + (n * 89) % 1360, 20 + (n * 67) % 640, 3.2, 0, 7); q.fill(); }
        [[90, 330, 250, 150, 'CN1  LCD'], [400, 300, 250, 130, 'CN2  TOUCH'], [90, 520, 300, 110, 'CN3  INPUT'], [760, 60, 300, 130, 'CN4  CARD'], [1120, 60, 220, 130, 'CN5  LID']].forEach(([a, b, w, h, t2]) => { q.fillStyle = '#e8e3d4'; q.fillRect(a, b, w, h); q.fillStyle = '#d9b450'; for (let n = 0; n < Math.floor(w / 14) - 1; n++) q.fillRect(a + 8 + n * 14, b + h - 26, 7, 20); q.fillStyle = '#2b3036'; mono(q, 700, 15); q.fillText(t2, a + 10, b + 24); });
        [[460, 80], [620, 80], [460, 500], [600, 560]].forEach(([a, b], n) => { q.fillStyle = '#15181c'; q.fillRect(a, b, 110, 110); q.fillStyle = '#aeb5bd'; mono(q, 600, 13); q.fillText('IC' + (n + 1), a + 10, b + 24); });
        q.fillStyle = 'rgba(240,250,240,.92)'; mono(q, 600, 14); q.fillText('PI-MB-2026 REV4  TOP', 40, 664); for (let n = 0; n < 12; n++) q.fillText('TP' + (n + 1), 60 + n * 52, 236);
        q.fillStyle = '#c9a44a'; for (let n = 0; n < 12; n++) { q.beginPath(); q.arc(72 + n * 52, 212, 7, 0, 7); q.fill(); }
        q.restore(); faceUp(pcb, 14.0, 6.8, cv2, 0.085);
        put(pcb, new THREE.BoxGeometry(2.3, 0.2, 1.5), steel, -4.4, 0.18, -2.4); put(pcb, new THREE.BoxGeometry(1.7, 0.2, 1.3), steel, 2.9, 0.18, -2.4); put(pcb, new THREE.BoxGeometry(1.2, 0.18, 1.2), chipM, -1.2, 0.17, 1.8); } // shield cans and one more IC on top
      const CHIPS = [['t_ts', 'TypeScript'], ['t_react', 'React'], ['t_rails', 'Rails'], ['t_graphql', 'GraphQL'], ['t_go', 'Go'], ['t_aws', 'AWS'], ['t_unity', 'Unity'], ['t_csharp', 'C#'], ['t_python', 'Python'], ['t_java', 'Java']];
      const chipAt = (n) => (n < 6 ? [130 + n * 205, 128] : [800 + ((n - 6) % 2) * 190, 345 + Math.floor((n - 6) / 2) * 200]);
      const chipFaces = CHIPS.map(([k, name], n) => {
        const [bx3, by3] = chipAt(n), [wx2, wz2] = b2w(bx3, by3);
        put(pcb, new THREE.BoxGeometry(1.25, 0.17, 1.25), chipM, wx2, -0.125, wz2);
        const cv2 = mk(150, 150); return { cv2, k, name, n, tx: face(pcb, 1.25, 1.25, cv2, -0.213, wx2, wz2) };
      });
      { const capM = std(0xb08d57, 0.45, 0.4), canM = std(0x2a2f36, 0.4, 0.5);                           // passives: capacitors, inductors, a crystal, two shield cans
        for (let n = 0; n < 15; n++) { const [wx2, wz2] = b2w(60 + n * 44, 224); put(pcb, new THREE.CylinderGeometry(0.09, 0.09, 0.2, 12), capM, wx2, -0.14, wz2); }
        for (let n = 0; n < 9; n++) { const [wx2, wz2] = b2w(712, 270 + n * 44); put(pcb, new THREE.CylinderGeometry(0.09, 0.09, 0.2, 12), capM, wx2, -0.14, wz2); }
        for (let n = 0; n < 4; n++) { const [wx2, wz2] = b2w(1290 + (n % 2) * 62, 90 + Math.floor(n / 2) * 76); put(pcb, new THREE.BoxGeometry(0.4, 0.2, 0.4), canM, wx2, -0.14, wz2); }
        { const [wx2, wz2] = b2w(905, 646); put(pcb, new THREE.BoxGeometry(0.7, 0.14, 0.3), steel, wx2, -0.11, wz2); } }
      function drawBoard() {
        px.clearRect(0, 0, 1400, 680); px.fillStyle = '#1e8f52'; px.fillRect(0, 0, 1400, 240); px.fillRect(680, 240, 720, 440);
        px.save(); px.beginPath(); px.rect(0, 0, 1400, 240); px.rect(680, 240, 720, 440); px.clip();
        px.strokeStyle = 'rgba(210,245,190,.34)'; px.lineWidth = 2.2; // traces
        for (let q = 0; q < 9; q++) { px.beginPath(); px.moveTo(20, 50 + q * 22); px.lineTo(1380 - q * 12, 50 + q * 22); px.lineTo(1380 - q * 12, 660 - q * 9); px.stroke(); }
        for (let n = 0; n < 10; n++) { const [cx, cy] = chipAt(n); for (let q = -3; q <= 3; q++) { px.beginPath(); px.moveTo(cx + q * 14, cy); px.lineTo(cx + q * 14, cy + 96 + q * 3); px.lineTo(cx + q * 14 + (n % 2 ? 50 : -50), cy + 96 + q * 3); px.stroke(); } }
        px.fillStyle = 'rgba(210,245,190,.55)'; for (let q = 0; q < 140; q++) { px.beginPath(); px.arc(20 + (q * 97) % 1360, 20 + (q * 61) % 640, 3.2, 0, 7); px.fill(); } // vias
        px.fillStyle = '#d9b450'; for (let q = 0; q < 40; q++) px.fillRect(180 + q * 26, 6, 15, 26);                                                                        // edge connector
        [[30, 30], [1370, 30], [30, 210], [710, 650], [1370, 650]].forEach(([hx, hy]) => { px.fillStyle = '#c9a44a'; px.beginPath(); px.arc(hx, hy, 18, 0, 7); px.fill(); px.fillStyle = '#04100b'; px.beginPath(); px.arc(hx, hy, 8, 0, 7); px.fill(); });
        px.fillStyle = 'rgba(240,250,240,.92)'; mono(px, 600, 14);                                                                                                         // silkscreen
        CHIPS.forEach(([, name], n) => { const [cx, cy] = chipAt(n); px.fillText('U' + (n + 1) + ' ' + name.toUpperCase(), cx - 62, cy - 70); px.strokeStyle = 'rgba(240,250,240,.7)'; px.lineWidth = 1.5; px.strokeRect(cx - 68, cy - 66, 136, 132); });
        px.fillText('PI-MB-2026 REV4  6L FR-4', 730, 664); for (let n = 0; n < 15; n++) px.fillText('C' + (n + 1), 50 + n * 44, 206);
        px.strokeStyle = 'rgba(240,250,240,.7)'; px.strokeRect(1150, 258, 232, 196); px.strokeRect(1150, 468, 232, 196); px.fillText('J5 WLAN', 1156, 252); px.fillText('J4 SD', 1156, 462);
        px.restore(); pcbTex.needsUpdate = true;
        chipFaces.forEach((cf) => { const q = cf.cv2.getContext('2d'); q.fillStyle = '#15181c'; q.fillRect(0, 0, 150, 150); const g2 = pic(cf.k); if (g2) fitPic(q, g2, 75, 64, 88, 88); q.fillStyle = '#aeb5bd'; mono(q, 600, 13); q.textAlign = 'center'; q.fillText('U' + (cf.n + 1) + ' ' + cf.name.toUpperCase(), 75, 136); q.beginPath(); q.arc(14, 14, 5, 0, 7); q.fill(); cf.tx.needsUpdate = true; });
      }
      // 5. wireless daughterboard, 6. SD reader: both plug into the mainboard
      const wl = new THREE.Group(), sdr = new THREE.Group(); { const [wx2, wz2] = b2w(1266, 356), [sx3, sz3] = b2w(1266, 566); wl.position.set(wx2, -0.1, wz2); sdr.position.set(sx3, -0.1, sz3); pcb.add(wl); pcb.add(sdr); }
      put(wl, new THREE.BoxGeometry(2.2, 0.06, 1.8), std(0x1d4e89, 0.6, 0), 0, 0, 0); put(wl, new THREE.BoxGeometry(1.1, 0.16, 0.9), steel, 0.4, -0.1, 0.3);
      { const cv2 = mk(240, 260), q = cv2.getContext('2d'); q.fillStyle = '#1d4e89'; q.fillRect(0, 0, 240, 260); q.strokeStyle = '#d9b450'; q.lineWidth = 5; q.beginPath(); for (let n = 0; n < 7; n++) { q.lineTo(20 + n * 30, 22); q.lineTo(20 + n * 30, 62); q.lineTo(35 + n * 30, 62); q.lineTo(35 + n * 30, 22); } q.stroke();
        q.fillStyle = '#dfe8f5'; mono(q, 600, 14); q.fillText('WLAN  2.4GHz', 14, 92); q.fillText('802.11 b/g', 14, 110); q.fillText('ANT1', 180, 92); face(wl, 2.2, 1.8, cv2, -0.035); }
      put(sdr, new THREE.BoxGeometry(2.2, 0.22, 1.8), steel, 0, -0.1, 0);
      { const cv2 = mk(240, 270), q = cv2.getContext('2d'); q.fillStyle = '#b3bac2'; q.fillRect(0, 0, 240, 270); q.strokeStyle = '#6d747c'; q.lineWidth = 3; q.strokeRect(14, 14, 212, 242); q.strokeRect(30, 150, 180, 90);
        q.fillStyle = '#3d4249'; mono(q, 700, 16); q.fillText('J4  SD', 30, 50); mono(q, 500, 13); q.fillText('PUSH-PUSH', 30, 72); q.fillText('10 PROJECTS', 30, 92); q.fillStyle = '#d9b450'; for (let n = 0; n < 9; n++) q.fillRect(36 + n * 19, 120, 11, 22); face(sdr, 2.2, 1.8, cv2, -0.215); }
      // 7. card reader and the input modules that sit under the buttons
      const inp = part(0, 0.5, 0);
      put(inp, new THREE.BoxGeometry(4.7, 0.28, 3.5), steel, 0, 0, -2.3);
      { const cv2 = mk(470, 350), q = cv2.getContext('2d'); q.fillStyle = '#b3bac2'; q.fillRect(0, 0, 470, 350); q.strokeStyle = '#6d747c'; q.lineWidth = 3; q.strokeRect(16, 16, 438, 318); for (let n = 0; n < 5; n++) q.strokeRect(50 + n * 78, 200, 50, 110);
        q.fillStyle = '#3d4249'; mono(q, 700, 20); q.fillText('SLOT-1  CARD READER', 40, 62); mono(q, 500, 15); q.fillText('17P  DETECT SW  EJECT SPRING', 40, 90); q.fillText('LOADED: PORTFOLIO', 40, 112); q.fillStyle = '#d9b450'; for (let n = 0; n < 17; n++) q.fillRect(44 + n * 23, 140, 13, 34); face(inp, 4.7, 3.5, cv2, -0.145, 0, -2.3); faceUp(inp, 4.7, 3.5, cv2, 0.145, 0, -2.3); }
      put(inp, new THREE.CylinderGeometry(0.95, 0.95, 0.26, 32), chipM, -5.85, 0, -0.6); put(inp, new THREE.CylinderGeometry(0.3, 0.3, 0.2, 20), steel, -5.85, -0.2, -0.6); put(inp, new THREE.BoxGeometry(1.3, 0.05, 2.3), std(0x0f5a3c, 0.6, 0), -5.85, 0.12, -0.6); // circle pad module
      put(inp, new THREE.BoxGeometry(2.0, 0.14, 0.62), chipM, -5.85, 0, 2.0); put(inp, new THREE.BoxGeometry(0.62, 0.14, 2.0), chipM, -5.85, 0, 2.0);                                                                                                      // D-pad membrane
      [[0.95, 0], [0, 0.95], [0, -0.95], [-0.95, 0]].forEach(([ax, az]) => put(inp, new THREE.CylinderGeometry(0.42, 0.46, 0.12, 24), rubber, 5.85 + ax, 0, 0.15 + az));                                                                                    // A B X Y domes
      put(inp, new THREE.BoxGeometry(6.9, 0.07, 0.56), rubber, 0, 0, 3.2);                                                                                                                                                                                 // SELECT HOME START strip
      // 8. battery
      const batt = part(3.3, 0.3, 1.0);
      put(batt, slab(5.8, 3.5, 0.46, 0.18, 0.05), std(0x2b3036, 0.5, 0.3), 0, 0, 0);
      { const cv2 = mk(580, 350), q = cv2.getContext('2d'); q.fillStyle = '#e9ecef'; rr(q, 24, 24, 532, 302, 14); q.fill();
        q.fillStyle = '#23262b'; mono(q, 700, 34); q.fillText('Li-ion  PI-BATT-003', 48, 86); mono(q, 500, 21); q.fillStyle = '#4c535b';
        ['3.7 V   1300 mAh   4.8 Wh', '1S1P  prismatic  PCM on board', 'Charge 4.2 V CC/CV  0 to 45 C', 'Recharged at hackathons.'].forEach((l, n) => q.fillText(l, 48, 132 + n * 34));
        q.fillStyle = '#c9a44a'; for (let n = 0; n < 3; n++) q.fillRect(430 + n * 36, 262, 24, 46); q.fillStyle = '#23262b'; mono(q, 600, 15); q.fillText('+    T    -', 428, 252); face(batt, 5.8, 3.5, cv2, -0.236);
        const cv3 = mk(580, 350), q3 = cv3.getContext('2d'); q3.fillStyle = '#f0c419'; rr(q3, 24, 24, 532, 110, 10); q3.fill(); q3.fillStyle = '#23262b'; mono(q3, 700, 24); q3.fillText('CAUTION', 48, 68); mono(q3, 500, 17); q3.fillText('Do not puncture, crush or heat above 60 C.', 48, 100);
        q3.fillStyle = 'rgba(233,236,239,.85)'; mono(q3, 500, 19); ['PI-BATT-003   Li-ion', 'Cell: 1S1P  3.7 V nominal', 'Made for one console only.'].forEach((l, n) => q3.fillText(l, 48, 190 + n * 34)); faceUp(batt, 5.8, 3.5, cv3, 0.236); }
      // ribbons and wires between the layers; they stretch as the parts separate
      const links = [[lcd, pcb, -1.5, -2.9, 1.3, amberM], [pcb, inp, -5.85, 3.2, 0.7, amberM], [pcb, inp, -5.85, -1.9, 0.5, amberM], [pcb, batt, 5.6, -0.4, 0.09, new THREE.MeshBasicMaterial({ color: 0xc23b34, side: THREE.DoubleSide })], [pcb, batt, 5.85, -0.4, 0.09, new THREE.MeshBasicMaterial({ color: 0x15181c, side: THREE.DoubleSide })]].map(([A, B, lx2, lz2, w, mt]) => {
        const lg2 = new THREE.PlaneGeometry(1, 1); lg2.translate(0, -0.5, 0); const m = new THREE.Mesh(lg2, mt); m.visible = false; device.add(m); return { A, B, m, x: lx2, z: lz2, w };
      });
      // screws
      const screws = [[6.5, -3.1], [4.3, -3.1], [-4.3, -3.1], [-6.5, -3.1]].map(([sx2, sz2]) => {
        const sg = new THREE.Group(); sg.position.set(sx2, -0.08, sz2); device.add(sg);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.07, 24), silver); sg.add(head);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.7, 12), silver); shaft.position.y = 0.38; sg.add(shaft);
        for (const r of [0, HALF]) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.05), grey); sl.position.y = -0.03; sl.rotation.y = r; sg.add(sl); } // the cross slot
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 12), M.hit); sg.add(hit); // a bigger target than the head
        const st = { g: sg, u: 0, t: 0, x: sx2, z: sz2 };
        const act = () => { if (xT) { reassemble(); return; } st.t = st.t ? 0 : 1; const left = screws.filter((q) => !q.t).length; toast(st.t ? (left ? left + (left > 1 ? ' screws' : ' screw') + ' to go' : 'Opening it up') : 'Screw back in'); };
        prop(head, act); prop(hit, act);
        return st;
      });
      let xT = 0; // exploded-view target
      const xp = document.createElement('aside'); xp.className = 'xp'; xp.hidden = true;
      const PARTS = [
        ['Upper shell', 'Polycarbonate. D-pad, A/B/X/Y, circle pad, three system keys.'],
        ['Touch panel + LCD', '4-wire resistive digitizer over a 320×240 TFT, fed from a 640×480 canvas. J1: 22-pin flex.'],
        ['Midframe', 'Glass-filled ABS. Locates the screen, the circle pad and every button; brass inserts take the screws.'],
        ['Mainboard', '6-layer FR-4, cut in an L round the battery bay. U1–U10 are the stack: TypeScript, React, Rails, GraphQL, Go, AWS, Unity, C#, Python, Java.'],
        ['Wireless module', '2.4 GHz 802.11 b/g daughterboard with a printed meander antenna.'],
        ['SD reader', 'Push-push socket. The card in it lists ten projects.'],
        ['Card reader + inputs', 'Slot-1 cage holding the portfolio card; circle-pad module; D-pad, A/B/X/Y and system-key membranes.'],
        ['Battery', 'Li-ion 3.7 V, 1300 mAh, 4.8 Wh. Recharged at hackathons.'],
        ['Back cover', 'Held by four Phillips #00 screws, M1.7 × 5.'],
      ];
      xp.innerHTML = PARTS.map((q, n) => `<i class="xp-dot">${n + 1}</i>`).join('') + '<div class="xp-key"><p>Exploded view</p><ol>' + PARTS.map(([a]) => `<li><b>${a}</b></li>`).join('') + '</ol><p class="xp-desc"></p><button>Put it back together</button></div>';
      document.body.appendChild(xp);
      const dots = [...xp.querySelectorAll('.xp-dot')], rows = [...xp.querySelectorAll('li')], desc = xp.querySelector('.xp-desc');
      // the key lists the part names; pick one (from the list or its dot) to read its details
      const choose = (n) => { rows.forEach((r, k) => r.classList.toggle('on', k === n)); dots.forEach((d, k) => d.classList.toggle('on', k === n)); desc.textContent = n < 0 ? 'Pick a part to read about it.' : PARTS[n][1]; };
      rows.forEach((r, n) => { r.addEventListener('click', () => choose(n)); r.addEventListener('mouseenter', () => choose(n)); });
      dots.forEach((d, n) => d.addEventListener('click', () => choose(n)));
      choose(-1);
      const anchors = [[device, 6.4, 0.6, 3.6], [lcd, 4.1, -0.1, 3.1], [shield, 7.1, 0, 3.6], [pcb, -3.4, -0.1, 3.2], [wl, -0.9, -0.1, -0.7], [sdr, -0.9, -0.2, 0.7], [inp, 2.35, -0.1, -0.55], [batt, 2.6, -0.2, 1.6], [plate, 6.9, -0.05, 3.9]].map(([par, ax, ay, az]) => { const o = new THREE.Object3D(); o.position.set(ax, ay, az); par.add(o); return o; });
      function reassemble() { xT = 0; screws.forEach((q) => { q.t = 0; }); toast('Back together'); }
      xp.querySelector('button').addEventListener('click', reassemble);
      const ez = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }, pv = new THREE.Vector3();
      const DROP = [[lcd, 2.5], [shield, 4.7], [pcb, 7.1], [inp, 9.5], [batt, 11.4]];
      tickers.push((dt) => {
        for (const q of screws) { q.u += (q.t - q.u) * (1 - Math.exp(-dt * 5)); if (Math.abs(q.t - q.u) < 0.002) q.u = q.t; }
        if (!xT && screws.every((q) => q.t && q.u > 0.94)) { // the last screw is out
          xT = 1; drawBoard();
          goal.yaw = Math.round(goal.yaw / (Math.PI * 2)) * Math.PI * 2 + 0.62; goal.pitch = -1.5; // turn it to show the layers from the side and below
        }
        const was = xView.u;
        xView.u += (xT - xView.u) * (1 - Math.exp(-dt * (reduced ? 60 : 2.2))); if (Math.abs(xT - xView.u) < 0.002) xView.u = xT;
        const u = xView.u, a1 = ez(u * 1.7);
        plate.position.y = -13.6 * a1;                                                         // the cover leaves first, then each layer in turn, deepest last
        DROP.forEach(([gp, d], n) => { gp.visible = u > 0.001; gp.position.y = gp.userData.y0 - d * ez(u * 1.7 - 0.5 + n * 0.1); }); // nothing inside is drawn while it is assembled
        { const sub = ez(u * 1.7 - 0.7); wl.position.y = -0.1 - 0.75 * sub; sdr.position.y = -0.1 - 0.75 * sub; } // the two plug-in modules lift off the board
        screws.forEach((q, n) => { q.g.position.set(q.x, -0.08 - q.u * 1.0 - 14.4 * a1, q.z); q.g.rotation.y = q.u * Math.PI * 7 + n; }); // unscrew: turn and back out; once apart they hang below their holes
        for (const L of links) { const top = L.A.position.y - 0.05, len = top - L.B.position.y; L.m.visible = u > 0.02 && len > 0.3; if (L.m.visible) { L.m.position.set(L.x, top, L.z); L.m.scale.set(L.w, len, 1); } }
        xp.hidden = u < 0.5;
        if (!xp.hidden) {
          xp.style.opacity = Math.min(1, (u - 0.5) * 4);
          anchors.forEach((o, n) => { o.getWorldPosition(pv).project(camera); dots[n].style.transform = `translate(${((pv.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-pv.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px)`; });
        }
        if (was !== u && reduced) drawTop();
      });
    }
    for (const sx of [-1, 1]) { // shoulder bumpers wrap the back corners
      const sh = slide(add(device, slab(2.3, 1.0, 0.48, 0.22, 0.08), bump, sx * 6.42, 0.35, BZ + 0.1), 0, 0, 0.12);
      prop(sh, () => { tap(sh); key(sx < 0 ? 'l' : 'r'); });
      { // the marking is moulded into the bumper, tone on tone: a small camera and the letter (L and R also fire the camera on the real thing)
        const lc3 = mk(176, 64), lq3 = lc3.getContext('2d'), ENG2 = 'rgba(3,62,78,.78)', R = sx > 0, ix = R ? 46 : 130, tx4 = R ? 122 : 50;
        lq3.fillStyle = ENG2; rr(lq3, ix - 26, 22, 52, 32, 6); lq3.fill(); lq3.fillRect(ix - 12, 15, 22, 9);            // camera body and its top bump
        lq3.globalCompositeOperation = 'destination-out'; lq3.beginPath(); lq3.arc(ix, 38, 10, 0, 7); lq3.fill(); lq3.globalCompositeOperation = 'source-over';
        lq3.beginPath(); lq3.arc(ix, 38, 5, 0, 7); lq3.fill();                                                          // lens
        lq3.font = `800 46px ${FONT}`; lq3.textAlign = 'center'; lq3.fillText(R ? 'R' : 'L', tx4, 55);
        const lab = wall(lc3, 1.1, 0.4, sx * 6.42, 0.35, BZ - 0.406, Math.PI); if (lab) sh.attach(lab); }  // it sits on the bumper, so it moves in with it
    }
  }

  // ---- hinge + lid
  const HR = 0.55, HZ = -BD / 2 + 0.05;
  const lid = new THREE.Group(); lid.position.set(0, TOP + 0.02, HZ); device.add(lid);
  const barrel = (len) => { const g = new THREE.CylinderGeometry(HR, HR, len, 40); g.rotateZ(Math.PI / 2); return g; };
  for (const sx of [-1, 1]) {
    solids.push(add(device, barrel(1.3), M.body, sx * 7.1, TOP + 0.02, HZ));                                        // base knuckles
    add(device, new THREE.CircleGeometry(HR * 0.6, 28).rotateY(sx * Math.PI / 2), M.dark, sx * 7.765, TOP + 0.02, HZ);
  }
  solids.push(add(lid, barrel(12.8), M.body, 0, 0, 0));                                                             // lid barrel
  const LD = BD - 0.45, LZ = BD / 2 + 0.15;
  solids.push(add(lid, slab(BW3, LD, LH, CR, 0.1), M.shell, 0, LH / 2 - 0.02, LZ));
  // outer camera pair, near the edge away from the hinge
  // Two separate lenses set straight into the lid, well apart (they are a stereo pair), with a tiny light just past the right one.
  { const snap = () => { document.body.classList.remove('flash'); void document.body.offsetWidth; document.body.classList.add('flash'); }; // a lens takes a 'photo'
    const CZ = BD - 0.95, up = (g) => g.rotateX(-Math.PI / 2), B2 = (c) => new THREE.MeshBasicMaterial({ color: c });
    for (const cx of [-1.75, 1.75]) {
      prop(add(lid, up(new THREE.CircleGeometry(0.3, 36)), B2(0x06080a), cx, LH - 0.014, CZ), snap);       // the dark surround, flush with the lid
      add(lid, up(new THREE.RingGeometry(0.27, 0.3, 36)), B2(0x0d2f38), cx, LH - 0.013, CZ);              // a thin shadowed lip where it meets the shell
      add(lid, up(new THREE.CircleGeometry(0.2, 32)), M.lens, cx, LH - 0.012, CZ);                        // the glass
      add(lid, up(new THREE.RingGeometry(0.105, 0.125, 28)), B2(0x1a2433), cx, LH - 0.011, CZ);           // the lens barrel inside
      add(lid, up(new THREE.CircleGeometry(0.05, 16)), B2(0x000000), cx, LH - 0.011, CZ);
      add(lid, up(new THREE.CircleGeometry(0.028, 12)), B2(0x2c3a58), cx - 0.07, LH - 0.01, CZ - 0.07);   // a small glint
    }
    add(lid, up(new THREE.CircleGeometry(0.07, 16)), B2(0x06363f), 2.75, LH - 0.013, CZ); }                // the camera light, to the right of the right lens
  // inside of the lid: black glass, wide screen, five-hole speakers, camera, depth slider
  add(lid, flat(15.0, LD - 0.7, 0.3, false), M.gloss, 0, -0.026, LZ + 0.05);
  const topGeo = new THREE.PlaneGeometry(10.9, 6.54); topGeo.rotateX(Math.PI / 2);
  const topMat = new THREE.MeshBasicMaterial({ map: topTex });
  const topScreen = add(lid, topGeo, topMat, 0, -0.032, LZ - 0.05);
  const dot = new THREE.CircleGeometry(0.07, 14).rotateX(Math.PI / 2), dotM = new THREE.MeshBasicMaterial({ color: 0x2b2e36 });
  for (const sx of [-1, 1]) for (const [dx, dz] of [[0, 0], [0.26, 0], [-0.26, 0], [0, 0.26], [0, -0.26]]) add(lid, dot, dotM, sx * 6.5 + dx, -0.03, LZ - 0.05 + dz);
  { // the inner camera, centred above the top screen: a rim, the lens, its pupil and a small glint. Click it to take a 'photo'.
    const cz = LZ - 0.05 + 3.27 + 0.33, B = (c) => new THREE.MeshBasicMaterial({ color: c });
    add(lid, new THREE.RingGeometry(0.15, 0.185, 32).rotateX(Math.PI / 2), B(0x08090a), 0, -0.03, cz);
    const lensM = add(lid, new THREE.CircleGeometry(0.15, 32).rotateX(Math.PI / 2), B(0x020305), 0, -0.03, cz);
    add(lid, new THREE.CircleGeometry(0.075, 24).rotateX(Math.PI / 2), B(0x000000), 0, -0.031, cz);
    add(lid, new THREE.CircleGeometry(0.022, 12).rotateX(Math.PI / 2), B(0x0b101e), -0.05, -0.032, cz + 0.05);
    prop(lensM, () => { document.body.classList.remove('flash'); void document.body.offsetWidth; document.body.classList.add('flash'); toast('Say cheese'); });
  }
  // depth slider: drag it up to turn on stereo 3D for the top screen
  const SL = { x: 7.2, z0: 1.9, len: 1.4 };
  add(lid, flat(0.16, SL.len + 0.3, 0.08, false), dotM, SL.x, -0.03, SL.z0 + SL.len / 2);
  const knob = add(lid, new THREE.BoxGeometry(0.26, 0.09, 0.4), M.accent, SL.x, -0.06, SL.z0);
  { const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.05), M.accent); knob.add(ridge); } // the raised grip line across the knob
  const sliderHit = add(lid, new THREE.BoxGeometry(0.9, 0.3, SL.len + 0.9), M.hit, SL.x - 0.15, -0.1, SL.z0 + SL.len / 2);
  { // printed beside the slider: the depth wedge (wide at full depth, tapering to nothing) with OFF at its point. The canvas has the same
    // proportions as the label, so the lettering is not stretched.
    const LW = 0.7, LD = SL.len + 0.8, c = mk(210, Math.round(210 * LD / LW)), x = c.getContext('2d'), H = c.height;
    x.fillStyle = '#e3e7ea'; x.beginPath(); x.moveTo(140, 24); x.lineTo(182, 24); x.lineTo(182, H - 96); x.closePath(); x.fill();
    x.textAlign = 'center'; x.font = `700 58px ${FONT}`; x.fillText('OFF', 96, H - 22);
    const g = new THREE.PlaneGeometry(LW, LD); g.rotateX(Math.PI / 2);
    add(lid, g, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }), SL.x - 0.6, -0.03, SL.z0 + SL.len / 2); }
  function setDepth(v) {
    v = Math.max(0, Math.min(1, v));
    knob.position.z = SL.z0 + v * SL.len;
    depth3d = v < 0.06 ? 0 : v;
    document.body.classList.toggle('stereo', depth3d > 0);
    drawTop();
  }
  const slPlane = new THREE.Plane(), slN = new THREE.Vector3(), slP = new THREE.Vector3(), slHit = new THREE.Vector3();
  function slideTo(e) { // where on the lid's inner face is the pointer?
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    lid.updateWorldMatrix(true, false);
    slP.set(SL.x, -0.03, SL.z0); lid.localToWorld(slP);
    slN.set(0, -1, 0).transformDirection(lid.matrixWorld);
    slPlane.setFromNormalAndCoplanarPoint(slN, slP);
    if (ray.ray.intersectPlane(slPlane, slHit)) { lid.worldToLocal(slHit); setDepth((slHit.z - SL.z0) / SL.len); }
  }
  let sliding = false;

  // ---- stickers on the outer shell (cut-outs live in stickers.js). Decorative only.
  // three tidy rows: logos along the top, photos through the middle, small ones along the bottom
  const STICKER_DEFS = [
    { k: 'stackadapt', x: -5.95, z: 1.95, w: 1.3, r: -0.05 },
    { k: 'heseri', x: -3.73, z: 1.95, w: 2.2, r: 0.04 },
    { k: 'voodoo', x: -1.51, z: 1.95, w: 1.3, r: -0.04 },
    { k: 'mlh', x: 0.71, z: 1.95, w: 2.2, r: 0.04 },
    { k: 'waterloo', x: 3.0, z: 1.95, w: 1.45, r: -0.04 },
    { k: 'ggb', x: 5.4, z: 1.95, w: 2.4, r: 0.03 },
    { k: 'mic', x: -5.65, z: 4.55, w: 1.9, r: -0.05 },
    { k: 'soon', x: -2.3, z: 4.55, w: 4.0, r: 0.03 },
    { k: 'cheque', x: 1.9, z: 4.55, w: 3.5, r: -0.03 },
    { k: 'four', x: 5.3, z: 4.55, w: 2.5, r: 0.04 },
    { k: 'knight', x: -6.5, z: 7.2, w: 1.2, r: -0.08 },
    { k: 'goose', x: -4.9, z: 7.15, w: 1.6, r: 0.05 },
    { k: 'proteful', x: -3.2, z: 7.1, w: 1.45, r: -0.06 },   // (the bottom row leaves the middle clear for the two camera lenses)
    { k: 'oyster', x: 4.3, z: 7.0, w: 2.1, r: 0.05 },
    { k: 'boxhead', x: 6.35, z: 7.0, w: 1.6, r: 0.05 },
  ];
  const SRC = window.STICKERS || {};
  STICKER_DEFS.forEach((d, i) => {
    const tex = new THREE.Texture(); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, visible: false });
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 2 + i;
    m.position.set(d.x, LH - 0.012 + i * 0.003, d.z); m.rotation.y = d.r; lid.add(m);
    const setImg = (img, w, h) => { tex.image = img; tex.needsUpdate = true; m.scale.set(d.w, 1, d.w * h / w); mat.visible = true; };
    if (SRC[d.k]) { const im = new Image(); im.onload = () => setImg(im, im.width, im.height); im.src = SRC[d.k]; }
  });

  // soft contact shadow
  const sc = mk(256, 256), sx2 = sc.getContext('2d');
  const sg = sx2.createRadialGradient(128, 128, 10, 128, 128, 128);
  sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  sx2.fillStyle = sg; sx2.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(26, 17).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.position.set(0, -1.4, 0); device.add(shadow);

  /* ======================= animation + interaction ======================= */
  const OPEN = THREE.MathUtils.degToRad(112);
  let lidAngle = 0, lidTarget = 0;
  const openness = () => lidAngle / OPEN; // 0 closed .. 1 open
  // Phone browsers slide their toolbars in and out while you scroll, which changes the window's height mid-gesture. Sizing anything
  // from that makes the picture stretch and then jump. So the canvas keeps one fixed height (the smallest the window gets), and
  // scroll progress is measured against the tallest, neither of which moves while you scroll.
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100lvh;visibility:hidden;pointer-events:none'; document.body.appendChild(probe);
  const tallH = () => Math.max(probe.offsetHeight || 0, innerHeight);
  const scrollMax = () => Math.max(1, document.documentElement.scrollHeight - tallH());
  const forceP = new URLSearchParams(location.search).get('p'); // ?p=0..1 pins the lid, for testing
  const scrollP = () => forceP !== null ? +forceP : THREE.MathUtils.clamp(scrollY / scrollMax(), 0, 1);
  function scrollOpen() { scrollTo({ top: scrollMax(), behavior: reduced ? 'auto' : 'smooth' }); }
  function scrollClosed() { scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }
  const POS_CLOSED = new THREE.Vector3(0, -1.0, 0.2), POS_OPEN = new THREE.Vector3(0, -4.3, 2.1);
  const introEl = document.getElementById('intro');
  const base = { yaw: 0, pitch: 0 };          // resting pose
  const orbit = { yaw: 0, pitch: 0 };          // current
  const goal = { yaw: 0, pitch: 0 };
  const hover = { x: 0, y: 0 };
  let dist = 40;

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight, aspect = w / h; // the canvas's own, steady size
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    const half = 9.6; // half-extent that must stay in view
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = Math.max(half / tan, 8.4 / (tan * aspect)); // fit height, or width on narrow screens
    const el = THREE.MathUtils.degToRad(50);
    camera.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist);
    camera.lookAt(0, 0, 0);
    distFar = dist; distNear = Math.max(half / tan, 5.75 / (tan * aspect)); // near: the top screen spans the phone's width
    camera.clearViewOffset(); zoomed = -1; zoom();
    camera.updateProjectionMatrix();
  }
  // phones: as the lid opens the camera moves in until the top screen fills the width, so its text is large enough to read
  let distFar = 40, distNear = 40, zoomed = -1;
  const EL = THREE.MathUtils.degToRad(50);
  function zoom() {
    const u = phone.matches ? THREE.MathUtils.smoothstep(openness(), 0.15, 1) : 0;
    if (u === zoomed) return;
    zoomed = u; dist = distFar + (distNear - distFar) * u;
    camera.position.set(0, Math.sin(EL) * dist, Math.cos(EL) * dist);
  }
  addEventListener('resize', resize); resize();

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (openness() > 0.6 && ray.intersectObject(sliderHit, false).length) return { slider: true };
    const hit = ray.intersectObjects([botScreen, topScreen, ...buttons, ...props, ...solids], false)[0];
    if (!hit) return null;
    if (hit.object === botScreen) {
      const x = hit.uv.x * BW, y = (1 - hit.uv.y) * BH;
      return { screen: true, region: regions.find((g) => x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) };
    }
    if (hit.object === topScreen) return { body: true, top: true };
    if (hit.object.userData.key) return { button: hit.object };
    if (hit.object.userData.act) return { prop: hit.object, uv: hit.uv };
    return { body: true };
  }
  let lastHover = null; // a prop that reacts to the pointer being over it
  let padDrag = null;
  // a touch that starts on a scrollable top screen scrolls that page, not the document (which would move the lid)
  // Touch: a finger on the console only takes hold of it once the page has been scrolled all the way open and has come to rest.
  // Until then every swipe is a scroll, so opening the lid (and the swipes people add once it is open) never tumble the console.
  let lastScrollT = -1e9; addEventListener('scroll', () => { lastScrollT = performance.now(); }, { passive: true });
  // Phones: the page only ever rests fully closed or fully open. Let go part-way and it carries on in the direction you were
  // going (a short swipe is enough), so there is no half-open state where a touch could mean either thing.
  { let dirS = 0, lastY = scrollY, fingers = 0, settleT = 0;
    const settle = () => { clearTimeout(settleT); settleT = setTimeout(() => {
      if (!phone.matches || fingers > 0 || forceP !== null) return;
      const pr = scrollP(); if (pr <= 0.004 || pr >= 0.996) return;
      const open = dirS > 0 ? pr > 0.07 : dirS < 0 ? pr > 0.93 : pr > 0.5;
      scrollTo({ top: open ? scrollMax() : 0, behavior: reduced ? 'auto' : 'smooth' });
    }, 90); };
    addEventListener('scroll', () => { const y = scrollY; if (y !== lastY) dirS = y > lastY ? 1 : -1; lastY = y; settle(); }, { passive: true });
    addEventListener('touchstart', () => { fingers++; clearTimeout(settleT); }, { passive: true });
    const up = () => { fingers = Math.max(0, fingers - 1); settle(); };
    addEventListener('touchend', up, { passive: true }); addEventListener('touchcancel', up, { passive: true }); }
  const touchReady = () => openness() > 0.9 && scrollP() > 0.985 && performance.now() - lastScrollT > 450;
  addEventListener('touchend', () => { if (performance.now() - lastScrollT < 450 || !touchReady()) lastScrollT = performance.now(); }, { passive: true }); // a run of quick swipes counts as one scroll, even after the page has hit the end
  canvas.addEventListener('touchstart', (e) => {
    if (!touchReady()) { lastScrollT = performance.now(); return; }
    if (S.sec && S.sec.game) { e.preventDefault(); return; }                                    // in Snake a swipe steers, so it must not scroll the page
    const p = pick(e.touches[0]);
    if (p) e.preventDefault();                               // open: a finger on the console turns it (or scrolls a long page on its top screen); only the background scrolls the page
  }, { passive: false });
  let swipe = null; // Snake on a touch screen: swipe anywhere to turn
  let drag = null, dragFn = null; // dragFn: a part being slid (e.g. the volume knob)
  canvas.addEventListener('pointerdown', (e) => {
    const p = pick(e);
    if ((!p || p.body) && stow()) return; // a click anywhere off a card that is out puts it back
    if (p && p.top && padMax > 0 && openness() > 0.9) { padDrag = { y: e.clientY, s: padScroll }; canvas.setPointerCapture(e.pointerId); return; } // phone: drag the top screen to scroll its page
    if (p && p.slider) { sliding = true; slideTo(e); canvas.setPointerCapture(e.pointerId); return; }
    if (p && p.button) { p.button.userData.press = 1; key(p.button.userData.key, p.button.userData.code); return; }
    if (p && p.prop && p.prop.userData.stick) { stick = true; stickTo(e); canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing'); return; }
    if (p && p.prop && p.prop.userData.drag) { dragFn = p.prop.userData.drag; dragFn(e); canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing'); return; }
    if (p && p.prop) { p.prop.userData.act(p.uv); return; }
    if (e.pointerType === 'touch' && S.sec && S.sec.game && touchReady()) { // a finger down during Snake starts a swipe, wherever it lands
      swipe = { x: e.clientX, y: e.clientY, moved: false, region: p && p.region, top: !!(p && p.top) };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ } return;
    }
    if (!p) return; // only a press that lands on the console can grab and turn it
    if (e.pointerType === 'touch' && !touchReady()) return; // touch: this swipe is scrolling the page, not turning the console
    drag = { x: e.clientX, y: e.clientY, yaw: goal.yaw, pitch: goal.pitch, moved: false, region: p && p.region };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    hover.x = (e.clientX / innerWidth) * 2 - 1; hover.y = (e.clientY / innerHeight) * 2 - 1;
    if (padDrag) { // screen pixels per CSS pixel, from how big the top screen is drawn
      const per = TW / (10.9 * innerHeight / (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
      padScroll = Math.max(0, Math.min(padMax, padDrag.s - (e.clientY - padDrag.y) * per)); if (reduced) drawTop(); return;
    }
    if (swipe) { // turn as soon as the finger has travelled far enough, then measure the next turn from there
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) { key(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); swipe.x = e.clientX; swipe.y = e.clientY; swipe.moved = true; }
      return;
    }
    if (sliding) { slideTo(e); return; }
    if (stick) { stickTo(e); return; }
    if (dragFn) { dragFn(e); return; }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 7) { drag.moved = true; canvas.classList.add('grabbing'); }
      if (drag.moved) {
        const sp = Math.max(0.006, 4.4 / innerWidth); // on a narrow screen each pixel turns it further: a swipe across a phone is about two-thirds of a turn
        const nowT = performance.now(); if (nowT - (drag.t || 0) > 40) { drag.px = drag.lx; drag.py = drag.ly; drag.pt = drag.t; drag.lx = e.clientX; drag.ly = e.clientY; drag.t = nowT; } drag.sp = sp; // remember the last stretch of the drag, for the flick on release
        goal.yaw = drag.yaw + dx * sp; // spin it all the way round to see the back
        goal.pitch = drag.pitch + dy * sp * 0.6; // free: flip it over to read the underside
      }
      return;
    }
    const p = pick(e);
    canvas.classList.toggle('grab', !!p);
    { const hv = p && p.prop && p.prop.userData.hover ? p.prop : null; if (lastHover && lastHover !== hv) lastHover.userData.hover(null); if (hv) hv.userData.hover(p.uv); lastHover = hv; }
    if (!p) { hover.x = 0; hover.y = 0; } // off the console: no tilt either
    if (p && p.region && p.region.home !== undefined && !S.sec && S.home !== p.region.home && !isBooting()) { S.home = p.region.home; redraw(); }
    canvas.classList.toggle('point', !!(p && (p.button || p.region || p.slider || p.prop)));
  });
  const endDrag = (e) => {
    if (swipe) { // no travel means it was a tap: press whatever is under it, or restart after a game over
      const w = swipe; swipe = null; try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      if (!w.moved) { if (w.region) w.region.fn(); else if (S.sec && S.sec.game && snake.over()) key('a'); }
      return;
    }
    if (padDrag) { padDrag = null; try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ } return; }
    if (dragFn) { dragFn = null; canvas.classList.remove('grabbing'); try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ } return; }
    if (stick) { stick = false; stickDir = [null, null]; canvas.classList.remove('grabbing'); try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ } return; }
    if (sliding) { sliding = false; try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ } return; }
    if (!drag) return;
    if (drag.moved && drag.pt && e.clientX !== undefined) { // a flick keeps turning a little after the finger lifts
      const dtm = Math.max(16, performance.now() - drag.pt), vx = (e.clientX - drag.px) / dtm, vy = (e.clientY - drag.py) / dtm, lim = (v) => Math.max(-1.6, Math.min(1.6, v));
      if (Math.hypot(vx, vy) > 0.25) { goal.yaw += lim(vx * 160 * drag.sp); goal.pitch += lim(vy * 160 * drag.sp * 0.6); }
    }
    if (!drag.moved) {
      if (openness() < 0.9) { /* closed: a click does not open it; scrolling does */ }
      else if (drag.region) drag.region.fn();
    }
    drag = null; canvas.classList.remove('grabbing');
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { if (drag) { goal.yaw = drag.yaw; goal.pitch = drag.pitch; } swipe = null; padDrag = null; // (a touch the browser took over as a scroll must not leave the console turned)
    dragFn = null; stick = false; sliding = false; drag = null; canvas.classList.remove('grabbing'); });

  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', a: 'a', b: 'b', x: 'x', y: 'y', Enter: 'a', ' ': 'a', Escape: 'b', Backspace: 'b', h: 'start', q: 'l', e: 'r' }; // the letters A, B, X, Y press the buttons with those letters
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('a')) return;
    if (e.key === 'Escape' && stow()) return; // Esc also puts a card back
    if (openness() < 0.9) return; // closed: keys do nothing, the page just scrolls
    const k = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!k) return;
    e.preventDefault();
    const b = buttons.find((m) => m.userData.key === k && !m.userData.code); // A presses the A button, not SELECT or START
    if (b) b.userData.press = 1;
    key(k);
  });

  /* ======================= boot + loop ======================= */
  const t0 = performance.now();
  redraw();
  if (document.fonts && document.fonts.load) {
    Promise.all([400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 20px "Inter"`))).then(redraw, () => {});
  }
  setInterval(() => { if (S.booted && !(S.sec && S.sec.game)) drawTop(); }, 30000);

  let last = t0, topDrawn = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; // rAF time can precede t0
    const t = Math.max(0, (now - t0) / 1000);
    const k = 1 - Math.exp(-dt * 5);

    lidTarget = OPEN * THREE.MathUtils.smoothstep(scrollP(), 0.04, 0.9); // the scrollbar is the hinge
    lidAngle = reduced ? lidTarget : lidAngle + (lidTarget - lidAngle) * (1 - Math.exp(-dt * 8));
    const o = openness();
    if (S.booted && o < 0.25) { // shut: power down, so the next open starts from scratch with the boot sequence
      if (S.sec && S.sec.game) snake.stop();
      S.booted = false; S.sec = null; S.home = 0; S.i = 0; redraw();
      goal.yaw = Math.round(goal.yaw / (Math.PI * 2)) * Math.PI * 2; goal.pitch = Math.round(goal.pitch / (Math.PI * 2)) * Math.PI * 2; // and it faces front again, however it had been turned
    }
    if (!S.booted && o > 0.7) { S.booted = true; S.bootAt = reduced ? -1e9 : performance.now() / 1000; redraw(); if (!reduced) { S.changed = S.bootAt + BOOT; setTimeout(() => { drawTop(); drawBottom(); }, BOOT * 1000 + 40); } }
    document.body.classList.toggle('open', o > 0.9);
    document.body.classList.toggle('moved', o > 0.03);
    if (introEl) introEl.style.opacity = Math.max(0, 1 - o * 2.5);
    lid.rotation.x = -lidAngle;
    zoom();
    const lit = THREE.MathUtils.smoothstep(lidAngle, 0.5, 1.5);
    topMat.color.setScalar(lit); botMat.color.setScalar(lit);
    if (!reduced && S.booted && lit > 0.05 && !(S.sec && S.sec.game)) { // the top screen is alive
      // Redrawing it and re-uploading it to the graphics card every frame is the most expensive thing on the page. A phone only
      // does that while something on it is actually changing; otherwise it refreshes once a second, which keeps scrolling and turning smooth.
      const nowS = now / 1000, live = !phone.matches || performance.now() / 1000 - S.changed < 1.0 || isBooting() || music.on || padDrag || (S.toast && performance.now() / 1000 < S.toast.until) || performance.now() / 1000 - secret.at < SECRET_FOR + 0.2;
      if (live || nowS - topDrawn > 1) { drawTop(); topDrawn = nowS; }
    }
    if (isBooting()) drawBottom();

    const px = drag ? 0 : hover.x * 0.07, py = drag ? 0 : hover.y * 0.04;
    const kf = drag ? 1 - Math.exp(-dt * 16) : k; // while a finger or the mouse is turning it, it follows closely; let go and it eases
    orbit.yaw += (goal.yaw + px - orbit.yaw) * (reduced ? 1 : kf);
    orbit.pitch += (goal.pitch + py - orbit.pitch) * (reduced ? 1 : kf);
    // closed: tipped toward the camera so the stickers read; open: upright
    rig.rotation.set(orbit.pitch + (1 - o) * 0.3, orbit.yaw - (1 - o) * 0.38, 0);
    device.position.lerpVectors(POS_CLOSED, POS_OPEN, o);
    device.position.y += 6.6 * xView.u;                                       // exploded: the parts drop below, so the shell rides up to keep the stack in view
    rig.position.y = reduced ? 0 : Math.sin(t * 1.1) * 0.12;
    const s = reduced ? 1 : 0.82 + 0.18 * THREE.MathUtils.smoothstep(t, 0, 1.6);
    rig.scale.setScalar(s * (1 + (1 - o) * (phone.matches ? -0.2 : 0.06)) * (1 - 0.36 * xView.u));
    rig.position.x = phone.matches ? 0 : -2.6 * xView.u; // exploded: the stack sits left of its key // phones: the tilted, closed console is wider, so it sits a little smaller

    if (!stick) { const kk = 1 - Math.exp(-dt * 16); padM.position.x += (PAD.x - padM.position.x) * kk; padM.position.z += (PAD.z - padM.position.z) * kk; padM.rotation.x *= 1 - kk; padM.rotation.z *= 1 - kk; } // spring back
    cartTick(dt, t); for (const f of tickers) f(dt, t);
    for (const m of slides) { const s = m.userData.s; s.cur += (s.tgt - s.cur) * (1 - Math.exp(-dt * 11)); m.position.copy(s.base).addScaledVector(s.d, s.cur); }
    for (const b of buttons) {
      const u = b.userData;
      if (u.press > 0.001) { u.press *= Math.exp(-dt * 12); b.position.y = u.y0 - 0.09 * u.press; }
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // small hook so the page can be driven from the console / tests
  window.__handheld = { key, enter, goHome, goal, burst, scrollOpen, setDepth, props, card: () => props.find((m) => m.geometry && m.geometry.type === 'ExtrudeGeometry' && m.userData.act && m.parent && m.parent.parent === scene).userData.act() };
})();
