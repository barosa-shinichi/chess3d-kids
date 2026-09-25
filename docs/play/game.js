/* 3Dちぇす — げーむの ほんたい */
(function () {
  'use strict';
  const C = window.Chess;
  const $ = (id) => document.getElementById(id);

  // ---------------- ことば ----------------
  const NAME = { K: 'おうさま', Q: 'じょおう', R: 'おしろ', B: 'ぼうさん', N: 'うま', P: 'へいたい' };
  const SYM = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' };
  const HOW = {
    K: 'まわりの 1ますに うごけるよ。とられそうに なったら にげよう！ いちばん だいじな こま。',
    Q: 'たて・よこ・ななめ、どこまでも まっすぐ うごけるよ。いちばん つよい こま！',
    R: 'たてと よこに、どこまでも まっすぐ うごけるよ。',
    B: 'ななめに、どこまでも まっすぐ うごけるよ。',
    N: '「L」の かたちに ぴょんと とぶよ。ほかの こまを とびこえられる！',
    P: 'まえに 1ます すすむよ（さいしょだけ 2ます）。とるときは ななめまえ。むこうまで いくと ほかの こまに かわれる！'
  };
  const COLOR = { w: 'しろ', b: 'くろ' };

  // ---------------- おと ----------------
  let soundOn = true, actx = null;
  function audio() {
    if (!soundOn) return null;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { return null; }
    return actx;
  }
  function tone(freq, start, dur, type, vol, freqEnd) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    const t = a.currentTime + start;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const SND = {
    select: () => tone(660, 0, 0.08, 'sine', 0.15),
    move: () => tone(420, 0, 0.14, 'sine', 0.3, 250),
    capture: () => { tone(300, 0, 0.12, 'square', 0.12, 180); tone(700, 0.08, 0.18, 'triangle', 0.2, 900); },
    check: () => { tone(880, 0, 0.12, 'triangle', 0.2); tone(880, 0.16, 0.12, 'triangle', 0.2); },
    bad: () => tone(200, 0, 0.15, 'sine', 0.15, 150),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.22)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.2, 0.35, 'sine', 0.2)),
    promo: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.15, 'sine', 0.18))
  };

  // ---------------- 3D の じゅんび ----------------
  const view = $('view');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  view.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a7b5a, 1.7));
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
  sun.position.set(5, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sun.shadow.bias = -0.0015;
  scene.add(sun);

  const std = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55 }, extra || {}));

  // じめん・き・くも
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 0.4, 48), std(0x9ee07a, { roughness: 0.9 }));
  ground.position.y = -0.85; ground.receiveShadow = true; scene.add(ground);
  const treeTrunk = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8);
  const treeTop = new THREE.SphereGeometry(0.7, 16, 12);
  const trunkMat = std(0x9c6b3f), leafMats = [std(0x3fb950), std(0x2ecc71), std(0x58c96b)];
  const treeSpots = [[-8, -3], [-8.5, 2.5], [8, -2], [8.7, 3.4], [-3.5, -8.4], [4, -8.8], [-4.8, 8.3], [3.2, 8.6], [-9.5, -7], [9.6, 7.5]];
  treeSpots.forEach(([x, z], i) => {
    const t = new THREE.Group();
    const tr = new THREE.Mesh(treeTrunk, trunkMat); tr.position.y = 0.4;
    const lf = new THREE.Mesh(treeTop, leafMats[i % 3]); lf.position.y = 1.2; lf.scale.set(1, 1.15, 1);
    t.add(tr, lf); t.position.set(x, -0.65, z);
    const s = 0.8 + ((i * 37) % 10) / 20; t.scale.setScalar(s);
    t.traverse((o) => { o.castShadow = true; });
    scene.add(t);
  });
  const clouds = [];
  const cloudMat = std(0xffffff, { roughness: 1 });
  const cloudGeo = new THREE.SphereGeometry(1, 16, 12);
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    [[0, 0, 1], [0.9, -0.1, 0.75], [-0.9, -0.1, 0.8], [0.3, 0.4, 0.7]].forEach(([x, y, s]) => {
      const m = new THREE.Mesh(cloudGeo, cloudMat); m.position.set(x, y, 0); m.scale.setScalar(s); c.add(m);
    });
    const a = (i / 6) * Math.PI * 2;
    c.position.set(Math.cos(a) * 16, 7 + (i % 3), Math.sin(a) * 16);
    c.userData.a = a; c.userData.speed = 0.01 + (i % 3) * 0.004;
    scene.add(c); clouds.push(c);
  }

  // ばん
  const boardGroup = new THREE.Group(); scene.add(boardGroup);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.5, 9.3), std(0xb97a4a, { roughness: 0.6 }));
  frame.position.y = -0.36; frame.receiveShadow = true; frame.castShadow = true; boardGroup.add(frame);
  const tileGeo = new THREE.BoxGeometry(1, 0.2, 1);
  const tileMats = [std(0x6ab04c, { roughness: 0.7 }), std(0xf6f1dc, { roughness: 0.7 })];
  const tiles = [];
  const sqPos = (s) => new THREE.Vector3(C.fileOf(s) - 3.5, 0, 3.5 - C.rankOf(s));
  for (let s = 0; s < 64; s++) {
    const light = (C.fileOf(s) + C.rankOf(s)) % 2 === 1;
    const t = new THREE.Mesh(tileGeo, tileMats[light ? 1 : 0]);
    t.position.copy(sqPos(s)); t.position.y = -0.1; t.receiveShadow = true;
    t.userData.sq = s; boardGroup.add(t); tiles.push(t);
  }

  // しるし
  const fxGroup = new THREE.Group(); scene.add(fxGroup);
  const dotGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24);
  const ringGeo = new THREE.TorusGeometry(0.4, 0.06, 10, 36);
  const flatGeo = new THREE.PlaneGeometry(0.98, 0.98);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.14 : 0.32, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: false });
  starGeo.center();
  const MAT = {
    dot: std(0x1dd1a1, { emissive: 0x0b7a5c, emissiveIntensity: 0.6 }),
    cap: std(0xff4757, { emissive: 0xaa1122, emissiveIntensity: 0.6 }),
    sel: std(0xffd32a, { emissive: 0xaa8800, emissiveIntensity: 0.7 }),
    last: new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.55, depthWrite: false }),
    check: new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.6, depthWrite: false }),
    hint: std(0xffc312, { emissive: 0xff9f1a, emissiveIntensity: 0.8 })
  };
  const lastGroup = new THREE.Group(); scene.add(lastGroup);

  // ---------------- こま の かたち ----------------
  const pieceMat = {
    w: std(0xfff4e0, { roughness: 0.4 }),
    b: std(0x353b48, { roughness: 0.35, metalness: 0.1 })
  };
  const goldMat = std(0xffc93c, { roughness: 0.3, metalness: 0.4 });
  const eyeWhite = std(0xffffff, { roughness: 0.2 });
  const eyeBlack = std(0x111111, { roughness: 0.1 });
  const cheekMat = std(0xff8fa3, { roughness: 0.8 });
  const v2 = (arr) => arr.map(([x, y]) => new THREE.Vector2(x, y));
  const lathe = (pts, mat) => new THREE.Mesh(new THREE.LatheGeometry(v2(pts), 32), mat);
  const BASE = [[0, 0], [0.38, 0], [0.4, 0.05], [0.38, 0.1], [0.3, 0.14], [0.27, 0.18]];
  const sph = (r, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); m.position.set(x, y, z); return m; };
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };

  function addFace(g, y, z, spread, s) {
    s = s || 1;
    for (const dx of [-1, 1]) {
      g.add(sph(0.06 * s, eyeWhite, dx * spread, y, z));
      g.add(sph(0.034 * s, eyeBlack, dx * spread, y + 0.005, z + 0.04 * s));
      g.add(sph(0.011 * s, eyeWhite, dx * spread + 0.012 * s, y + 0.02 * s, z + 0.065 * s));
      const ch = sph(0.035 * s, cheekMat, dx * (spread + 0.06 * s), y - 0.07 * s, z - 0.015);
      ch.scale.set(1, 0.6, 0.4); g.add(ch);
    }
  }

  function buildPiece(type, color) {
    const m = pieceMat[color];
    const g = new THREE.Group();
    switch (type) {
      case 'P':
        g.add(lathe(BASE.concat([[0.2, 0.3], [0.15, 0.46], [0.24, 0.5], [0.24, 0.54], [0.12, 0.56], [0, 0.56]]), m));
        g.add(sph(0.2, m, 0, 0.7, 0));
        addFace(g, 0.72, 0.16, 0.075, 0.9);
        break;
      case 'R':
        g.add(lathe(BASE.concat([[0.26, 0.24], [0.24, 0.72], [0.32, 0.78], [0.32, 0.98], [0.22, 0.98], [0.22, 0.9], [0, 0.9]]), m));
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const c = box(0.14, 0.14, 0.12, m, Math.cos(a) * 0.26, 1.04, Math.sin(a) * 0.26);
          c.rotation.y = -a; g.add(c);
        }
        g.add(box(0.12, 0.2, 0.03, eyeBlack, 0, 0.36, 0.25)); // とびら
        addFace(g, 0.62, 0.25, 0.09);
        break;
      case 'B':
        g.add(lathe(BASE.concat([[0.2, 0.3], [0.14, 0.58], [0.23, 0.62], [0.23, 0.66], [0.1, 0.68], [0, 0.68]]), m));
        { const h = sph(0.22, m, 0, 0.9, 0); h.scale.set(1, 1.3, 1); g.add(h); }
        g.add(sph(0.06, goldMat, 0, 1.22, 0));
        { const slit = box(0.03, 0.18, 0.2, eyeBlack, 0.07, 1.03, 0.08); slit.rotation.z = -0.5; g.add(slit); }
        addFace(g, 0.86, 0.19, 0.08, 0.9);
        break;
      case 'N': {
        g.add(lathe(BASE.concat([[0.26, 0.3], [0.26, 0.34], [0, 0.34]]), m));
        const neck = box(0.3, 0.55, 0.34, m, 0, 0.58, -0.05); neck.rotation.x = -0.25; g.add(neck);
        const head = box(0.28, 0.26, 0.5, m, 0, 0.86, 0.1); head.rotation.x = 0.25; g.add(head);
        const nose = box(0.26, 0.18, 0.14, m, 0, 0.76, 0.34); nose.rotation.x = 0.25; g.add(nose);
        g.add(box(0.1, 0.05, 0.02, eyeBlack, 0, 0.74, 0.42));
        const mane = box(0.08, 0.6, 0.12, goldMat, 0, 0.72, -0.24); mane.rotation.x = -0.3; g.add(mane);
        for (const dx of [-0.08, 0.08]) {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), m);
          ear.position.set(dx, 1.06, -0.02); g.add(ear);
        }
        for (const dx of [-1, 1]) {
          g.add(sph(0.055, eyeWhite, dx * 0.145, 0.93, 0.12));
          g.add(sph(0.032, eyeBlack, dx * 0.175, 0.94, 0.14));
        }
        break;
      }
      case 'Q':
        g.add(lathe(BASE.concat([[0.22, 0.3], [0.15, 0.66], [0.26, 0.72], [0.26, 0.76], [0.12, 0.8], [0, 0.8]]), m));
        g.add(sph(0.2, m, 0, 0.96, 0));
        g.add(lathe([[0.1, 1.08], [0.14, 1.1], [0.27, 1.3], [0.24, 1.31], [0.12, 1.16], [0, 1.16]], goldMat));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.add(sph(0.045, goldMat, Math.cos(a) * 0.26, 1.32, Math.sin(a) * 0.26));
        }
        g.add(sph(0.07, goldMat, 0, 1.22, 0));
        addFace(g, 0.96, 0.17, 0.075, 0.85);
        break;
      case 'K':
        g.add(lathe(BASE.concat([[0.23, 0.3], [0.16, 0.76], [0.27, 0.82], [0.27, 0.86], [0.17, 0.9], [0, 0.92]]), m));
        g.add(sph(0.22, m, 0, 1.06, 0));
        g.add(lathe([[0.2, 1.14], [0.24, 1.16], [0.24, 1.3], [0.2, 1.3], [0.18, 1.2], [0, 1.2]], goldMat));
        g.add(box(0.08, 0.3, 0.08, goldMat, 0, 1.44, 0));
        g.add(box(0.24, 0.08, 0.08, goldMat, 0, 1.47, 0));
        addFace(g, 1.06, 0.19, 0.08, 0.9);
        break;
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  const protos = {};
  function makePieceMesh(p) {
    const t = C.typeOf(p), c = C.colorOf(p), key = t + c;
    if (!protos[key]) protos[key] = buildPiece(t, c);
    const g = protos[key].clone();
    g.rotation.y = c === 'w' ? Math.PI : 0; // あいての ほうを みる
    return g;
  }

  // ---------------- げーむの じょうたい ----------------
  const G = {
    mode: 'two', level: 2, human: 'w', autoTurn: true,
    state: C.initial(), history: [], lastMove: null,
    selected: -1, legal: [], hint: null, over: false, busy: false, started: false
  };
  const piecesGroup = new THREE.Group(); scene.add(piecesGroup);
  let pieceAt = new Array(64).fill(null);

  function syncBoard() {
    while (piecesGroup.children.length) piecesGroup.remove(piecesGroup.children[0]);
    pieceAt = new Array(64).fill(null);
    G.state.b.forEach((p, s) => {
      if (!p) return;
      const g = makePieceMesh(p);
      g.position.copy(sqPos(s));
      g.userData.sq = s;
      piecesGroup.add(g); pieceAt[s] = g;
    });
    drawMarks();
  }

  function drawMarks() {
    while (fxGroup.children.length) fxGroup.remove(fxGroup.children[0]);
    while (lastGroup.children.length) lastGroup.remove(lastGroup.children[0]);
    const flat = (s, mat) => {
      const f = new THREE.Mesh(flatGeo, mat); f.rotation.x = -Math.PI / 2;
      f.position.copy(sqPos(s)); f.position.y = 0.006; lastGroup.add(f);
    };
    if (G.lastMove) { flat(G.lastMove.from, MAT.last); flat(G.lastMove.to, MAT.last); }
    if (C.inCheck(G.state, G.state.turn)) flat(C.kingSquare(G.state, G.state.turn), MAT.check);
    if (G.selected >= 0) {
      const r = new THREE.Mesh(ringGeo, MAT.sel); r.rotation.x = -Math.PI / 2;
      r.position.copy(sqPos(G.selected)); r.position.y = 0.03; fxGroup.add(r);
      const seen = new Set();
      for (const m of G.legal) {
        if (seen.has(m.to)) continue; seen.add(m.to);
        let mk;
        if (m.capture) { mk = new THREE.Mesh(ringGeo, MAT.cap); mk.rotation.x = -Math.PI / 2; mk.position.y = 0.03; }
        else { mk = new THREE.Mesh(dotGeo, MAT.dot); mk.position.y = 0.03; }
        mk.position.x = sqPos(m.to).x; mk.position.z = sqPos(m.to).z;
        mk.userData.sq = m.to; mk.userData.pulse = true;
        fxGroup.add(mk);
      }
    }
    if (G.hint) {
      const st = new THREE.Mesh(starGeo, MAT.hint);
      st.scale.setScalar(1.4);
      st.position.copy(sqPos(G.hint.to)); st.position.y = 0.9;
      st.userData.spin = true; st.userData.sq = G.hint.to;
      fxGroup.add(st);
    }
  }

  // ---------------- かめら ----------------
  const cam = { az: 0, targetAz: 0, pol: 0.85, zoom: 1, dist: 12 };
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 50 : 40;
    camera.updateProjectionMatrix();
    const tv = Math.tan((camera.fov * Math.PI) / 360);
    const rw = 5.2 / (tv * aspect);
    const rh = 6.6 / tv;
    cam.dist = Math.max(rw, rh * 0.9, 9);
    cam.pol = aspect < 1 ? 0.72 : 0.85;
  }
  window.addEventListener('resize', resize);
  resize();
  function updateCamera() {
    const r = cam.dist * cam.zoom;
    camera.position.set(r * Math.sin(cam.pol) * Math.sin(cam.az), r * Math.cos(cam.pol), r * Math.sin(cam.pol) * Math.cos(cam.az));
    const aspect = camera.aspect;
    camera.lookAt(0, aspect < 1 ? -0.6 : -0.9, 0);
  }
  function faceSide(color) {
    let t = color === 'w' ? 0 : Math.PI;
    // いちばん ちかい まわりかた
    while (t - cam.az > Math.PI) t -= 2 * Math.PI;
    while (t - cam.az < -Math.PI) t += 2 * Math.PI;
    cam.targetAz = t;
  }

  // ---------------- うごき（あにめーしょん） ----------------
  const tweens = [];
  function tween(dur, fn, done) { tweens.push({ t0: performance.now(), dur, fn, done }); }
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  function animateMove(m, done) {
    const mesh = pieceAt[m.from];
    const p0 = sqPos(m.from), p1 = sqPos(m.to);
    const capSq = m.ep ? C.sq(C.fileOf(m.to), C.rankOf(m.from)) : m.to;
    const victim = m.capture ? pieceAt[capSq] : null;
    const hop = C.typeOf(m.piece) === 'N' ? 1.3 : 0.45;
    const dur = C.typeOf(m.piece) === 'N' ? 520 : 420;
    let rook = null, r0, r1;
    if (m.castle) {
      const home = C.rankOf(m.from);
      const rf = m.castle === 'K' ? 7 : 0, rt = m.castle === 'K' ? 5 : 3;
      rook = pieceAt[C.sq(rf, home)]; r0 = sqPos(C.sq(rf, home)); r1 = sqPos(C.sq(rt, home));
    }
    tween(dur, (k) => {
      const e = ease(k);
      if (mesh) {
        mesh.position.lerpVectors(p0, p1, e);
        mesh.position.y = Math.sin(Math.PI * k) * hop;
      }
      if (rook) { rook.position.lerpVectors(r0, r1, e); rook.position.y = Math.sin(Math.PI * k) * 0.8; }
      if (victim && k > 0.55) {
        const s = Math.max(0.001, 1 - (k - 0.55) / 0.45);
        victim.scale.setScalar(s); victim.rotation.y += 0.25;
      }
    }, done);
  }

  // ---------------- がめん の もじ ----------------
  let msgTimer = null;
  function say(text, warn, keep) {
    const el = $('msg');
    clearTimeout(msgTimer);
    if (!text) { el.classList.add('empty'); el.innerHTML = '&nbsp;'; return; }
    el.textContent = text;
    el.classList.remove('empty');
    el.classList.toggle('warn', !!warn);
    if (!keep) msgTimer = setTimeout(() => el.classList.add('empty'), 4500);
  }
  function whoName(color) {
    if (G.mode === 'robot') return color === G.human ? 'あなた' : 'ろぼっと';
    return COLOR[color];
  }
  function updateTurnUI() {
    const t = G.state.turn;
    $('turnDot').style.background = t === 'w' ? '#fff4e0' : '#353b48';
    $('turnText').textContent = G.over ? 'おしまい' : whoName(t) + 'の ばん';
    $('thinking').style.display = G.mode === 'robot' && t !== G.human && !G.over ? 'block' : 'none';
    const canUndo = !G.busy && (G.mode === 'two' ? G.history.length > 0 : G.history.some((s) => s.turn === G.human));
    $('bUndo').disabled = !canUndo;
    $('bHint').disabled = G.over || G.busy || !humanTurn();
  }
  const humanTurn = () => G.mode === 'two' || G.state.turn === G.human;

  // ---------------- たっぷ の しょり ----------------
  function select(s) {
    G.selected = s;
    G.legal = s >= 0 ? C.legalMoves(G.state).filter((m) => m.from === s) : [];
    drawMarks();
  }

  function onTap(s) {
    if (!G.started || G.over || G.busy || !humanTurn()) return;
    const st = G.state, p = st.b[s];
    if (G.selected >= 0) {
      const ms = G.legal.filter((m) => m.to === s);
      if (ms.length) { chooseAndMove(ms); return; }
      if (s === G.selected) { select(-1); say(''); return; }
    }
    if (p && C.colorOf(p) === st.turn) {
      select(s);
      G.hint = G.hint && G.hint.from === s ? G.hint : null;
      drawMarks();
      SND.select();
      const t = C.typeOf(p);
      if (G.legal.length === 0) {
        say(C.inCheck(st, st.turn)
          ? NAME[t] + 'は いま うごけないよ。おうさまを まもれる こまを さがそう！'
          : NAME[t] + 'は いま うごけないよ。ほかの こまを えらんでね。', true);
      } else {
        say(SYM[t] + ' ' + NAME[t] + '：' + HOW[t]);
      }
      return;
    }
    if (p) { SND.bad(); say('それは あいての こまだよ。じぶんの こまを さわってね。'); return; }
    if (G.selected >= 0) {
      SND.bad();
      say(C.inCheck(st, st.turn) ? 'そこには いけないよ。おうさまが ねらわれているよ！' : 'そこには いけないよ。みどりの ところを さわってね。');
      return;
    }
    say('うごかしたい こまを さわってね。');
  }

  function chooseAndMove(ms) {
    if (ms.length === 1) { doMove(ms[0]); return; }
    // なりかわり
    const col = $('promoCol');
    col.innerHTML = '';
    const opts = [['Q', 'いちばん つよい！'], ['R', ''], ['B', ''], ['N', '']];
    opts.forEach(([t, note], i) => {
      const b = document.createElement('button');
      b.className = ['', 'b-blue', 'b-green', 'b-purple'][i];
      b.textContent = SYM[t] + ' ' + NAME[t] + (note ? '（' + note + '）' : '');
      b.onclick = () => {
        $('ovPromo').classList.remove('show');
        doMove(ms.find((m) => C.typeOf(m.promo) === t));
      };
      col.appendChild(b);
    });
    $('ovPromo').classList.add('show');
  }

  function doMove(m) {
    G.busy = true;
    G.history.push(G.state);
    G.hint = null;
    select(-1);
    updateTurnUI();
    SND.move();
    animateMove(m, () => {
      const mover = G.state.turn;
      G.state = C.makeMove(G.state, m);
      G.lastMove = m;
      syncBoard();
      afterMove(m, mover);
    });
  }

  function afterMove(m, mover) {
    const st = G.state;
    const status = C.status(st, G.history.concat([st]));
    let text = '', warn = false;
    if (m.capture) { SND.capture(); text = whoName(mover) + 'が ' + NAME[C.typeOf(m.capture)] + 'を とったよ！'; }
    if (m.castle) text = 'おうさまと おしろが いれかわったよ！（きゃすりんぐ）';
    if (m.ep) text = 'とくべつな とりかた！ へいたいを とったよ！（あんぱっさん）';
    if (m.promo) { SND.promo(); text = 'へいたいが ' + NAME[C.typeOf(m.promo)] + 'に かわったよ！'; }
    if (status === 'play' && C.inCheck(st, st.turn)) {
      SND.check(); warn = true;
      text = (G.mode === 'robot' && st.turn === G.human)
        ? 'ちぇっく！ あなたの おうさまが ねらわれているよ！ まもろう！'
        : 'ちぇっく！ ' + whoName(st.turn) + 'の おうさまが ねらわれているよ！';
    }
    G.busy = false;
    save();
    if (status !== 'play') { endGame(status, mover); return; }
    say(text, warn);
    if (G.mode === 'two' && G.autoTurn) faceSide(st.turn);
    updateTurnUI();
    if (G.mode === 'robot' && st.turn !== G.human) robotTurn();
  }

  function robotTurn() {
    G.busy = true;
    updateTurnUI();
    const myState = G.state;
    setTimeout(() => {
      if (G.state !== myState || G.over) return;
      const t0 = performance.now();
      const m = C.bestMove(G.state, G.level);
      const wait = Math.max(0, 500 - (performance.now() - t0));
      setTimeout(() => {
        if (G.state !== myState || !m) return;
        G.busy = false;
        doMove(m);
      }, wait);
    }, 350);
  }

  function endGame(status, mover) {
    G.over = true;
    updateTurnUI();
    let emoji = '🎉', title = '', text = '', happy = true;
    if (status === 'mate') {
      if (G.mode === 'robot') {
        if (mover === G.human) { title = 'やったね！ あなたの かち！'; text = 'ろぼっとの おうさまを つかまえたよ！ すごい！'; }
        else { emoji = '🤖'; title = 'ろぼっとの かち…'; text = 'ざんねん！ もういちど ちょうせん しよう！'; happy = false; }
      } else {
        title = COLOR[mover] + 'の かち！';
        text = COLOR[C.other(mover)] + 'の おうさまを つかまえたよ！ ちぇっくめいと！';
      }
    } else {
      emoji = '🤝'; title = 'ひきわけ！'; happy = false;
      text = {
        stalemate: 'おうさまは ねらわれて いないけど、うごける こまが ないよ。（すているめいと）',
        insufficient: 'こまが すくなくて、どちらも おうさまを つかまえられないよ。',
        fifty: 'ながい あいだ こまを とらなかったので ひきわけだよ。',
        repetition: 'おなじ かたちが 3かい でたので ひきわけだよ。'
      }[status];
    }
    $('endEmoji').textContent = emoji;
    $('endTitle').textContent = title;
    $('endText').textContent = text;
    if (happy) { SND.win(); confetti(); } else if (emoji === '🤖') SND.lose();
    say(title, false, true);
    setTimeout(() => $('ovEnd').classList.add('show'), 700);
  }

  // ---------------- ぼたん ----------------
  function undo() {
    if (G.busy || G.history.length === 0) return;
    if (G.mode === 'robot') {
      // あなたの ばんに もどるまで もどす
      if (!G.history.some((s) => s.turn === G.human)) return;
      do { G.state = G.history.pop(); } while (G.history.length && G.state.turn !== G.human);
    } else {
      G.state = G.history.pop();
    }
    G.over = false; G.lastMove = null; G.hint = null;
    $('ovEnd').classList.remove('show');
    select(-1); syncBoard();
    if (G.mode === 'two' && G.autoTurn) faceSide(G.state.turn);
    say('ひとつ まえに もどったよ。');
    save(); updateTurnUI();
  }

  function hint() {
    if (G.busy || G.over || !humanTurn()) return;
    say('かんがえちゅう…', false, true);
    setTimeout(() => {
      const m = C.bestMove(G.state, 2);
      if (!m) return;
      select(m.from);
      G.hint = m;
      drawMarks();
      say('💡 ' + NAME[C.typeOf(m.piece)] + 'を ⭐の ところに うごかすと いいかも！');
    }, 50);
  }

  function newGame(mode, level, human) {
    G.mode = mode; G.level = level || G.level; G.human = human || 'w';
    G.state = C.initial(); G.history = []; G.lastMove = null; G.hint = null;
    G.over = false; G.busy = false; G.started = true;
    ['ovStart', 'ovRobot', 'ovEnd', 'ovMenu'].forEach((id) => $(id).classList.remove('show'));
    select(-1); syncBoard();
    faceSide(mode === 'robot' ? G.human : 'w');
    updateTurnUI();
    say(mode === 'robot'
      ? (G.human === 'w' ? 'あなたは しろ。さきに うごかしてね！' : 'あなたは くろ。ろぼっとが さきに うごくよ。')
      : 'しろから はじめるよ。こまを さわってね！');
    save();
    if (mode === 'robot' && G.human === 'b') robotTurn();
  }

  // ---------------- ほぞん ----------------
  function save() {
    try {
      localStorage.setItem('chess3d', JSON.stringify({
        mode: G.mode, level: G.level, human: G.human, autoTurn: G.autoTurn,
        state: G.state, history: G.history, lastMove: G.lastMove, over: G.over, soundOn
      }));
    } catch (e) { /* ほぞん できなくても だいじょうぶ */ }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem('chess3d') || 'null');
      if (!d) return null;
      soundOn = d.soundOn !== false;
      G.autoTurn = d.autoTurn !== false;
      return d;
    } catch (e) { return null; }
  }
  function resume(d) {
    Object.assign(G, { mode: d.mode, level: d.level, human: d.human, state: d.state, history: d.history || [],
      lastMove: d.lastMove, over: false, busy: false, started: true, hint: null });
    $('ovStart').classList.remove('show');
    select(-1); syncBoard();
    faceSide(G.mode === 'robot' ? G.human : (G.autoTurn ? G.state.turn : 'w'));
    updateTurnUI();
    say('つづきから あそぼう！');
    if (G.mode === 'robot' && G.state.turn !== G.human) robotTurn();
  }

  // ---------------- かみふぶき ----------------
  function confetti() {
    const cv = $('confetti'), ctx = cv.getContext('2d');
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#54a0ff'];
    const ps = Array.from({ length: 140 }, () => ({
      x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)], s: 6 + Math.random() * 6
    }));
    const t0 = performance.now();
    (function frame(now) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (now - t0 < 4000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  // ---------------- ゆび の そうさ ----------------
  const ptrs = new Map();
  let drag = null, pinch0 = 0, zoom0 = 1;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => {
    audio();
    el.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false };
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = cam.zoom;
      if (drag) drag.moved = true;
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) cam.zoom = Math.min(1.5, Math.max(0.55, zoom0 * pinch0 / d));
      return;
    }
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) drag.moved = true;
    if (drag.moved) {
      cam.az -= (e.clientX - prev.x) * 0.008;
      cam.targetAz = cam.az;
      cam.pol = Math.min(1.25, Math.max(0.2, cam.pol - (e.clientY - prev.y) * 0.006));
    }
  });
  const end = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size === 0) {
      if (drag && !drag.moved && e.type === 'pointerup') tapAt(e.clientX, e.clientY);
      drag = null; pinch0 = 0;
    }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => { cam.zoom = Math.min(1.5, Math.max(0.55, cam.zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: true });

  function tapAt(x, y) {
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // ばんの たいらな めんで どの ますか しらべる
    let planeSq = -1;
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(boardPlane, hit)) {
      const f = Math.floor(hit.x + 4), r = Math.floor(4 - hit.z);
      if (f >= 0 && f < 8 && r >= 0 && r < 8) planeSq = C.sq(f, r);
    }
    // こまが えらばれていて、いける ますを さわったら それを ゆうせん
    if (G.selected >= 0 && G.legal.some((m) => m.to === planeSq)) { onTap(planeSq); return; }
    const hits = ray.intersectObjects(piecesGroup.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.userData.sq === undefined) o = o.parent;
      if (o) { onTap(o.userData.sq); return; }
    }
    if (planeSq >= 0) onTap(planeSq);
  }
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // ---------------- ぼたん の せつぞく ----------------
  const show = (id) => $(id).classList.add('show');
  const hide = (id) => $(id).classList.remove('show');
  const soundLabel = () => { $('bSound').textContent = soundOn ? '🔊 おと: あり' : '🔇 おと: なし'; };
  const autoLabel = () => { $('bAutoTurn').textContent = '🔄 じどうで まわす: ' + (G.autoTurn ? 'する' : 'しない'); };

  let robotLevel = 2, robotColor = 'w';
  $('bTwo').onclick = () => newGame('two');
  $('bRobot').onclick = () => { hide('ovStart'); show('ovRobot'); };
  $('bRobotBack').onclick = () => { hide('ovRobot'); show('ovStart'); };
  $('levelRow').querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      robotLevel = +b.dataset.level;
      $('levelRow').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
    };
  });
  $('colorRow').querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      robotColor = b.dataset.color;
      $('colorRow').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
    };
  });
  $('bRobotGo').onclick = () => newGame('robot', robotLevel, robotColor);

  $('howList').innerHTML = 'KQRBNP'.split('').map((t) =>
    '<div class="pc"><div class="sym">' + SYM[t] + '</div><div><b>' + NAME[t] + '</b><br><span>' + HOW[t] + '</span></div></div>'
  ).join('');
  let howReturn = 'ovStart';
  $('bHow').onclick = () => { howReturn = 'ovStart'; hide('ovStart'); show('ovHow'); };
  $('bMenuHow').onclick = () => { howReturn = 'ovMenu'; hide('ovMenu'); show('ovHow'); };
  $('bHowBack').onclick = () => { hide('ovHow'); show(howReturn); };

  $('bSound').onclick = () => { soundOn = !soundOn; soundLabel(); save(); if (soundOn) SND.select(); };

  $('bUndo').onclick = undo;
  $('bHint').onclick = hint;
  $('bTurn').onclick = () => { cam.targetAz = cam.az + Math.PI; };
  $('bMenu').onclick = () => { autoLabel(); $('bAutoTurn').style.display = G.mode === 'two' ? '' : 'none'; show('ovMenu'); };
  $('bMenuBack').onclick = () => hide('ovMenu');
  $('bAutoTurn').onclick = () => { G.autoTurn = !G.autoTurn; autoLabel(); save(); if (G.autoTurn) faceSide(G.state.turn); };
  $('bMenuNew').onclick = () => newGame(G.mode, G.level, G.human);
  $('bMenuTop').onclick = () => { hide('ovMenu'); refreshStart(); show('ovStart'); };

  $('bAgain').onclick = () => newGame(G.mode, G.level, G.human);
  $('bLook').onclick = () => hide('ovEnd');
  $('bEndMenu').onclick = () => { hide('ovEnd'); refreshStart(); show('ovStart'); };

  let saved = load();
  function refreshStart() {
    saved = G.started ? (G.over ? null : { mode: G.mode, level: G.level, human: G.human, state: G.state, history: G.history, lastMove: G.lastMove }) : saved;
    $('bResume').style.display = saved && !saved.over && saved.history && saved.history.length ? '' : 'none';
  }
  $('bResume').onclick = () => { if (saved) resume(saved); };
  soundLabel();
  refreshStart();

  // あんどろいど の もどる ぼたん
  window.onAndroidBack = function () {
    const open = ['ovPromo', 'ovHow', 'ovRobot', 'ovMenu', 'ovEnd'].find((id) => $(id).classList.contains('show'));
    if (open === 'ovPromo') return true;
    if (open === 'ovHow') { $('bHowBack').click(); return true; }
    if (open === 'ovRobot') { $('bRobotBack').click(); return true; }
    if (open) { hide(open); return true; }
    if (!$('ovStart').classList.contains('show')) { refreshStart(); show('ovStart'); return true; }
    return false;
  };



  // ---------------- まいふれーむ ----------------
  syncBoard();
  updateTurnUI();
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now(), t = now / 1000;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const k = Math.min(1, (now - tw.t0) / tw.dur);
      tw.fn(k);
      if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
    }
    // かめら を ゆっくり まわす
    const dt = Math.min(0.1, clock.getDelta());
    const d = cam.targetAz - cam.az;
    if (Math.abs(d) > 0.001) cam.az += d * (1 - Math.exp(-dt * 5)); else cam.az = cam.targetAz;
    updateCamera();
    // えらんだ こま を ぴょこぴょこ
    pieceAt.forEach((g, s) => {
      if (!g || tweens.length) return;
      g.position.y = s === G.selected ? 0.18 + Math.sin(t * 6) * 0.06 : 0;
    });
    fxGroup.children.forEach((o) => {
      if (o.userData.pulse) o.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
      if (o.userData.spin) { o.rotation.y = t * 2.5; o.position.y = 0.9 + Math.sin(t * 4) * 0.12; }
    });
    clouds.forEach((c) => {
      c.userData.a += c.userData.speed * 0.02;
      c.position.x = Math.cos(c.userData.a) * 16; c.position.z = Math.sin(c.userData.a) * 16;
    });
    renderer.render(scene, camera);
  }
  loop();
})();
