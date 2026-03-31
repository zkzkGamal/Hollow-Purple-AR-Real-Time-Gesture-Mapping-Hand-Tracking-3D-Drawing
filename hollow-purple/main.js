import * as THREE from 'three';

// ── Config ─────────────────────────────────────────────────────────────────
const CFG = {
  FOV: 60, CAMERA_Z: 8,
  WORLD_X: 11, WORLD_Y: 8.5,
  PALM: 8,              // Landmark 8 = index finger tip (anime style)
  EMA: 0.22,            // exponential smoothing (lower = smoother)
  CONF: 0.65,           // minimum landmark confidence
  COLLISION: 2.2,       // adjusted for larger orbs
  PARTICLES: 400,       // Big energy!
  BLOOM_STR: 1.4, BLOOM_RAD: 0.6, BLOOM_THR: 0.08,
};

// ── Smoothing filter ─────────────────────────────────────────────────────────
class EMA {
  constructor(a = CFG.EMA) { this.a = a; this.v = null; }
  update(vec) {
    if (!this.v) this.v = vec.clone();
    else this.v.lerp(vec, this.a);
    return this.v.clone();
  }
  reset() { this.v = null; }
}

// ── MediaPipe → Three.js ─────────────────────────────────────────────────────
// Video is CSS-mirrored (scaleX -1) and selfieMode:false
// → flip x so orb tracks the mirrored visual position
function toWorld(lm) {
  // Landmarks are 0..1 from MediaPipe (top-left)
  // We want to map them to Three.js world space
  return new THREE.Vector3(
    (0.5 - lm.x) * CFG.WORLD_X,
    (0.5 - lm.y) * CFG.WORLD_Y,
    lm.z * -5,
  );
}

let renderer, scene, camera;
let ctx2d; // 2D context for landmarks

function initThree() {
  const canvas = document.getElementById('three-canvas');
  const debugCanvas = document.getElementById('debug-canvas');
  ctx2d = debugCanvas.getContext('2d');

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: false
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x000000, 0); 

  scene = new THREE.Scene();
  scene.background = null;
  scene.add(new THREE.AmbientLight(0x6677ff, 3));

  camera = new THREE.PerspectiveCamera(CFG.FOV, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = CFG.CAMERA_Z;

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    debugCanvas.width = w;
    debugCanvas.height = h;
  });
  // Initial size
  debugCanvas.width = window.innerWidth;
  debugCanvas.height = window.innerHeight;
}


// ── Energy orb factory ─────────────────────────────────────────────────────────
function makeOrb(color, lightColor, inward) {
  const g = new THREE.Group();

  // Core (larger, brighter)
  const cMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 4.5,
    roughness: 0, metalness: 1,
  });
  const cMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), cMat);
  g.add(cMesh);

  // Intense layered glow halos
  const halos = [
    [0.6, 0.4],  [1.0, 0.2],  [1.6, 0.1], [2.5, 0.04]
  ];
  for (const [r, op] of halos) {
    const m = new THREE.MeshBasicMaterial({
      color: lightColor, transparent: true, opacity: op,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), m));
  }

  // Point light (more intense)
  const light = new THREE.PointLight(lightColor, 8.5, 18);
  g.add(light);

  // Particles
  const N = CFG.PARTICLES;
  const pos = new Float32Array(N * 3);
  const phase = new Float32Array(N); const rad = new Float32Array(N); const spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    phase[i] = Math.random() * Math.PI * 2;
    rad[i]   = 0.35 + Math.random() * 0.7;
    spd[i]   = 0.6  + Math.random() * 1.5;
    pos[i*3] = pos[i*3+1] = pos[i*3+2] = 0;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({
    color: lightColor, size: 0.06, transparent: true, opacity: 1.0,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const pts = new THREE.Points(pGeo, pMat);
  pts.userData = { phase, rad, spd };
  g.add(pts);

  g.visible = false;
  return { g, cMesh, cMat, light, pts, ema: new EMA(), active: false, inward };
}

function updateOrb(orb, worldPos, t) {
  if (!orb.active) return;
  orb.g.position.copy(orb.ema.update(worldPos));
  orb.cMesh.scale.setScalar(1 + 0.12 * Math.sin(t * 9));

  const pa = orb.pts.geometry.attributes.position;
  const { phase, rad, spd } = orb.pts.userData;
  for (let i = 0; i < CFG.PARTICLES; i++) {
    const tt = (t + phase[i]) * spd[i];
    const r = orb.inward
      ? rad[i] * (0.65 + 0.35 * Math.abs(Math.sin(tt * 0.5)))
      : rad[i] * (1.0  + 0.45 * Math.abs(Math.sin(tt * 0.7)));
    pa.array[i*3]   = r * Math.sin(tt * 1.3) * Math.cos(tt * 0.8 + phase[i]);
    pa.array[i*3+1] = r * Math.cos(tt * 1.3);
    pa.array[i*3+2] = r * Math.sin(tt * 1.3) * Math.sin(tt * 0.8 + phase[i]);
  }
  pa.needsUpdate = true;
}

// ── Hollow Purple effect ──────────────────────────────────────────────────────
let hp = null;

function triggerHollowPurple(midpt) {
  clearHP();
  const grp = new THREE.Group();
  grp.position.copy(midpt);
  scene.add(grp);

  // Core sphere
  const cMat = new THREE.MeshStandardMaterial({
    color: 0x9900ff, emissive: 0xcc44ff, emissiveIntensity: 4.5,
    roughness: 0, metalness: 1, transparent: true, opacity: 1,
  });
  const cMesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 48), cMat);
  grp.add(cMesh);

  // Halos
  for (const [r, op] of [[1.4, 0.08], [2.2, 0.05], [3.2, 0.03]]) {
    grp.add(new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xcc44ff, transparent: true, opacity: op,
        side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    ));
  }

  // Lights
  const pl = new THREE.PointLight(0xcc44ff, 22, 35);
  pl.position.copy(midpt); scene.add(pl);

  // 400 explosion particles
  const EX = 400;
  const exPos = new Float32Array(EX * 3);
  const exVels = Array.from({ length: EX }, () =>
    new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
    ).normalize().multiplyScalar(0.05 + Math.random() * 0.13),
  );
  const exGeo = new THREE.BufferGeometry();
  exGeo.setAttribute('position', new THREE.BufferAttribute(exPos, 3));
  const exPts = new THREE.Points(exGeo,
    new THREE.PointsMaterial({
      color: 0xdd88ff, size: 0.11, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  grp.add(exPts);

  // Shockwave rings
  const rings = [0, 0.18, 0.36].map(delay => {
    const m = new THREE.MeshBasicMaterial({
      color: 0xcc44ff, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.04, 8, 64), m);
    r.rotation.x = Math.PI / 2; r.userData.delay = delay;
    grp.add(r);
    return { mesh: r, mat: m };
  });

  // Flash text
  const txt = document.getElementById('hp-text');
  txt.style.transition = 'none'; txt.style.opacity = '1';
  setTimeout(() => { txt.style.transition = 'opacity 1.5s ease'; txt.style.opacity = '0'; }, 900);

  hp = { grp, cMesh, cMat, pl, exPts, exVels, rings, life: 1.0 };
}

function updateHP(dt, t) {
  if (!hp) return;
  hp.life -= dt / 2.5;
  const life = Math.max(0, hp.life);

  hp.cMesh.scale.setScalar((1 + (1 - life) * 3.5) * (1 + 0.07 * Math.sin(t * 16)));
  hp.cMat.opacity = life;
  hp.cMat.emissiveIntensity = 4.5 * life;
  hp.pl.intensity = 22 * life;

  // Explosion particles
  const pa = hp.exPts.geometry.attributes.position.array;
  for (let i = 0; i < hp.exVels.length; i++) {
    pa[i*3]   += hp.exVels[i].x;
    pa[i*3+1] += hp.exVels[i].y;
    pa[i*3+2] += hp.exVels[i].z;
    hp.exVels[i].multiplyScalar(0.97);
  }
  hp.exPts.geometry.attributes.position.needsUpdate = true;
  hp.exPts.material.opacity = life;

  // Expanding rings
  for (const { mesh, mat } of hp.rings) {
    const rLife = Math.max(0, life - mesh.userData.delay);
    const s = 1 + (1 - rLife) * 8;
    mesh.scale.setScalar(s);
    mat.opacity = rLife * 0.8;
  }

  if (life <= 0) clearHP();
}

function clearHP() {
  if (!hp) return;
  scene.remove(hp.grp); scene.remove(hp.pl);
  hp = null;
}

// ── MediaPipe Hands ───────────────────────────────────────────────────────────
let blueOrb, redOrb;
let lastCollision = false;

function initHands(videoEl, onReady) {
  const hands = new window.Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}`,
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
    selfieMode: false,
  });

  let firstFrame = true;

  hands.onResults(results => {
    // Start MIRRORED block for everything on debug-canvas
    ctx2d.save();
    ctx2d.translate(ctx2d.canvas.width, 0);
    ctx2d.scale(-1, 1);
    
    // 1. Draw video frame
    ctx2d.drawImage(results.image, 0, 0, ctx2d.canvas.width, ctx2d.canvas.height);

    if (firstFrame) {
      firstFrame = false;
      document.getElementById('status').textContent = '✅ Show your hands!';
      setTimeout(() => { document.getElementById('status').style.opacity = '0'; }, 3000);
    }

    let hasR = false, hasL = false;

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const lms  = results.multiHandLandmarks[i];
        const side = results.multiHandedness[i].label;
        const palm = lms[CFG.PALM];
        const wp   = toWorld(palm);

        // 2. Draw 2D landmarks (INSIDE mirror block)
        const isRight = side === 'Left'; // Mirrored MediaPipe 'Left' is user's Right
        const handColor = isRight ? '#33aaff' : '#ff3355';

        window.drawConnectors(ctx2d, lms, window.HAND_CONNECTIONS, {
          color: handColor, lineWidth: 4
        });
        window.drawLandmarks(ctx2d, lms, {
          color: handColor, lineWidth: 1, radius: 2
        });

        if (isRight) {          // user's RIGHT hand → Blue
          if (!blueOrb.active) { blueOrb.g.visible = true; blueOrb.active = true; }
          blueOrb._next = wp; hasR = true;
          document.getElementById('chip-r').classList.remove('off');
        } else {                        // user's LEFT hand → Red
          if (!redOrb.active)  { redOrb.g.visible  = true; redOrb.active  = true; }
          redOrb._next = wp; hasL = true;
          document.getElementById('chip-l').classList.remove('off');
        }
      }
    }

    if (!hasR) { blueOrb.active = false; blueOrb.g.visible = false; blueOrb.ema.reset(); document.getElementById('chip-r').classList.add('off'); }
    if (!hasL) { redOrb.active  = false; redOrb.g.visible  = false; redOrb.ema.reset();  document.getElementById('chip-l').classList.add('off'); }

    if (hasR && hasL && !lastCollision) {
      const dist = blueOrb.g.position.distanceTo(redOrb.g.position);
      if (dist < CFG.COLLISION) {
        const mid = new THREE.Vector3().addVectors(
          blueOrb.ema.v ?? blueOrb.g.position,
          redOrb.ema.v  ?? redOrb.g.position,
        ).multiplyScalar(0.5);
        triggerHollowPurple(mid);
        lastCollision = true;
      }
    }
    if (!hasR || !hasL) lastCollision = false;

    // End MIRRORED block
    ctx2d.restore();
  });

  // Let MediaPipe Camera utility own the video element entirely
  const cam = new window.Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 640, height: 480,
  });
  cam.start();
}

// ── Entry point ───────────────────────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', async () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  document.getElementById('status').style.display = 'block';
  document.getElementById('hint').style.display = 'block';
  document.getElementById('status').textContent = '⚡ Loading hand model…';

  const videoEl = document.getElementById('webcam');

  initThree();

  blueOrb = makeOrb(0x1166ff, 0x33aaff, true);
  redOrb  = makeOrb(0xff2233, 0xff5566, false);
  scene.add(blueOrb.g); scene.add(redOrb.g);

  // Start hand tracking — background texture is created on first frame
  initHands(videoEl);

  // Animation loop
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t  = clock.getElapsedTime();
    if (blueOrb.active && blueOrb._next) updateOrb(blueOrb, blueOrb._next, t);
    if (redOrb.active  && redOrb._next)  updateOrb(redOrb,  redOrb._next,  t);
    updateHP(dt, t);
    renderer.render(scene, camera);
  }
  animate();
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.();
  if (e.key === 'd' || e.key === 'D') {
    const el = document.getElementById('status');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
});
