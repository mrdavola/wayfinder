// Campsite3D — a low-poly night-camp diorama that visualizes a project's
// stages as waypoints on a winding trail. Drop-in alternative to TreasureMap:
// same props (stages, activeCard, onNodeClick, studentName, studentEmoji).
//
// Theme: campfire explorers. Trailhead = lit campfire. Completed = cairn +
// green pennant. Active = lantern with warm point light. Locked = fogged.
// Summit = final waypoint as a peak. Camera dollies to the active stage.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const COL = {
  ink:        0x1A1A2E,
  parchment:  0xF0EDE6,
  paper:      0xFAF8F5,
  graphite:   0x6B7280,
  pencil:     0x9CA3AF,
  specimen:   0xC0392B,
  field:      0x2D6A4F,
  fieldDark:  0x1F4D38,
  compass:    0xB8860B,
  compassWarm:0xE8B84F,
  lab:        0x1B4965,
  ember:      0xFF7A3D,
  moon:       0xC9D7F0,
};

// Convert a stage list into 3D waypoint positions along a gentle S-curve.
// We snake the trail along +X with sinusoidal sway in Z so it never feels
// like a runway. Y is mostly flat; the last waypoint lifts slightly to read
// as a summit.
function layoutWaypoints(stages) {
  const n = Math.max(stages.length, 1);
  const span = Math.max(8, n * 4.2);              // total trail length
  const swayAmp = 2.6;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = -span / 2 + t * span;
    const z = Math.sin(t * Math.PI * 2.1) * swayAmp + (i % 2 ? 0.4 : -0.4);
    const yLift = i === n - 1 ? 1.1 : 0;          // summit lift on the last
    out.push(new THREE.Vector3(x, yLift, z));
  }
  return out;
}

// Build the trail as a tube along a Catmull-Rom spline through the
// waypoints. Faintly emissive on completed segments, dim on locked.
function buildTrail(points, stages) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.4);
  const geo = new THREE.TubeGeometry(curve, points.length * 12, 0.085, 6, false);
  const mat = new THREE.MeshStandardMaterial({
    color: COL.pencil,
    roughness: 0.95,
    metalness: 0,
  });
  return new THREE.Mesh(geo, mat);
}

// Tiny low-poly tree: a brown cylinder trunk + green cone canopy.
function makeTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.5, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1, flatShading: true })
  );
  trunk.position.y = 0.25;
  g.add(trunk);
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1.1, 6),
    new THREE.MeshStandardMaterial({ color: COL.field, roughness: 1, flatShading: true })
  );
  canopy.position.y = 0.95;
  g.add(canopy);
  g.scale.setScalar(scale);
  return g;
}

// Stack of pebbles + tiny pennant flag. Used for completed waypoints.
function makeCairn(flagColor = COL.field) {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa39a8b, roughness: 1, flatShading: true });
  const sizes = [0.32, 0.26, 0.2, 0.15];
  let y = 0;
  for (const s of sizes) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stoneMat);
    stone.position.y = y + s * 0.7;
    stone.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(stone);
    y += s * 1.3;
  }
  // pennant
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.6, 5),
    new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 1 })
  );
  pole.position.set(0, y + 0.3, 0);
  g.add(pole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.16),
    new THREE.MeshStandardMaterial({ color: flagColor, roughness: 1, side: THREE.DoubleSide })
  );
  flag.position.set(0.14, y + 0.5, 0);
  g.add(flag);
  return g;
}

// Lantern post for the active waypoint. Glow + warm point light handled by caller.
function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 })
  );
  post.position.y = 0.55;
  g.add(post);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.15, 6),
    new THREE.MeshStandardMaterial({ color: 0x2d2317, roughness: 1, flatShading: true })
  );
  cap.position.y = 1.18;
  g.add(cap);
  // The glowing core — pure emissive so it reads warm even if the renderer
  // skips lighting on it. We tag it so the animation loop can find it.
  const glow = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.14, 1),
    new THREE.MeshStandardMaterial({
      color: COL.compassWarm,
      emissive: COL.compassWarm,
      emissiveIntensity: 1.4,
      roughness: 1,
    })
  );
  glow.position.y = 1.0;
  glow.userData.isLanternGlow = true;
  g.add(glow);
  return g;
}

// Locked waypoint: a tarp/tent silhouette that fogs out. Cool, dim, low.
function makeLocked() {
  const g = new THREE.Group();
  const tent = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.55, 4),
    new THREE.MeshStandardMaterial({
      color: 0x3a4252, roughness: 1, flatShading: true, transparent: true, opacity: 0.55,
    })
  );
  tent.rotation.y = Math.PI / 4;
  tent.position.y = 0.27;
  g.add(tent);
  return g;
}

// Summit marker — a small triangular peak + a signpost behind.
function makeSummit() {
  const g = new THREE.Group();
  const peak = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x6f6553, roughness: 1, flatShading: true })
  );
  peak.position.y = 0.6;
  g.add(peak);
  // Snowcap on top
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 0.32, 4),
    new THREE.MeshStandardMaterial({ color: COL.paper, roughness: 1, flatShading: true })
  );
  cap.position.y = 1.18;
  g.add(cap);
  return g;
}

// Campfire: ring of stones + crossed logs + emissive flame cone.
// Returns the group plus the flame mesh and point light so the loop can
// flicker them in sync.
function makeCampfire() {
  const g = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b5a4a, roughness: 1, flatShading: true });
  const stoneCount = 8;
  for (let i = 0; i < stoneCount; i++) {
    const a = (i / stoneCount) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), stoneMat);
    s.position.set(Math.cos(a) * 0.45, 0.07, Math.sin(a) * 0.45);
    s.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(s);
  }

  // Crossed logs
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 });
  for (let i = 0; i < 2; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = i === 0 ? 0.4 : -0.4;
    log.position.y = 0.13;
    g.add(log);
  }

  // Flame
  const flameMat = new THREE.MeshStandardMaterial({
    color: COL.compassWarm,
    emissive: COL.ember,
    emissiveIntensity: 2.2,
    roughness: 1,
    transparent: true,
    opacity: 0.95,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), flameMat);
  flame.position.y = 0.36;
  flame.userData.isFlame = true;
  g.add(flame);

  // Inner brighter flame
  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.34, 6),
    new THREE.MeshStandardMaterial({
      color: 0xffe5a8, emissive: 0xffe5a8, emissiveIntensity: 3, roughness: 1, transparent: true, opacity: 0.95,
    })
  );
  innerFlame.position.y = 0.32;
  innerFlame.userData.isFlameInner = true;
  g.add(innerFlame);

  // Warm point light. Flickered each frame.
  const light = new THREE.PointLight(COL.ember, 3.0, 8, 1.6);
  light.position.set(0, 0.5, 0);
  light.userData.isFireLight = true;
  g.add(light);

  return g;
}

// Procedural starfield as a single Points object.
function makeStars(count = 220) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Hemisphere of stars above
    const u = Math.random(); const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(v); // upper hemisphere only
    const r = 28 + Math.random() * 4;
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: COL.moon, size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0.85,
  });
  return new THREE.Points(geo, mat);
}

export default function Campsite3D({
  stages = [],
  activeCard,
  onNodeClick,
  studentName,
  studentEmoji,
  recentlyCompleted = null, // stage id that just flipped to completed → triggers ember burst
  height = 320,
}) {
  const mountRef = useRef(null);
  const stagesRef = useRef(stages);
  const activeRef = useRef(activeCard);
  const onClickRef = useRef(onNodeClick);
  // Burst trigger: the loop reads .pending; whoever drops a stage id here
  // gets an ember puff at that waypoint on the next tick.
  const burstRef = useRef({ pending: null, lastFiredFor: null });

  // Keep refs fresh so the (single, persistent) animation loop can react
  // without us having to tear down and rebuild the scene on every prop change.
  useEffect(() => { stagesRef.current = stages; }, [stages]);
  useEffect(() => { activeRef.current = activeCard; }, [activeCard]);
  useEffect(() => { onClickRef.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => {
    if (recentlyCompleted && recentlyCompleted !== burstRef.current.lastFiredFor) {
      burstRef.current.pending = recentlyCompleted;
    }
  }, [recentlyCompleted]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.borderRadius = '12px';
    renderer.domElement.style.display = 'block';

    // ── Scene + sky ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1424, 0.045);

    // Dusk gradient sky as a backside sphere (cheaper + nicer than a shader)
    {
      const skyGeo = new THREE.SphereGeometry(60, 24, 16);
      // Vertex-coloured: dark ink at top, warm ember near horizon
      const top = new THREE.Color(0x0a1424);
      const horizon = new THREE.Color(0x3a2a3a);
      const colors = new Float32Array(skyGeo.attributes.position.count * 3);
      const pos = skyGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = THREE.MathUtils.clamp((y / 60 + 1) / 2, 0, 1);   // 0 at bottom, 1 at top
        const c = horizon.clone().lerp(top, Math.pow(t, 0.7));
        colors[i * 3 + 0] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
      skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false });
      scene.add(new THREE.Mesh(skyGeo, skyMat));
    }

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 0.5, 0);

    // ── Lights ──
    // Cool moonlight from above
    const moon = new THREE.DirectionalLight(COL.moon, 0.8);
    moon.position.set(-4, 8, 3);
    scene.add(moon);
    // Subtle blue ambient — fills shadows without flattening
    scene.add(new THREE.AmbientLight(0x2a3550, 0.45));

    // ── Ground ──
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x18221b, roughness: 1, metalness: 0,
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // ── Stars ──
    scene.add(makeStars(220));

    // ── Embers (pre-allocated particle pool, fired by burstRef) ──
    // One BufferGeometry, one Points object. We march `nextSlot` through the
    // ring buffer, so a new burst overwrites the oldest particles. Cheap and
    // allocation-free per frame.
    const EMBER_CAP = 96;
    const emberPos = new Float32Array(EMBER_CAP * 3);
    const emberVel = new Float32Array(EMBER_CAP * 3);
    const emberLife = new Float32Array(EMBER_CAP);     // 0 = dead, 1 = just spawned
    const emberSize = new Float32Array(EMBER_CAP);
    for (let i = 0; i < EMBER_CAP; i++) emberPos[i * 3 + 1] = -100; // park dead particles
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    emberGeo.setAttribute('size', new THREE.BufferAttribute(emberSize, 1));
    const emberMat = new THREE.PointsMaterial({
      color: COL.compassWarm,
      size: 0.18,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const emberPoints = new THREE.Points(emberGeo, emberMat);
    emberPoints.frustumCulled = false;
    scene.add(emberPoints);
    let emberCursor = 0;

    function fireBurst(origin, count = 36) {
      for (let k = 0; k < count; k++) {
        const i = emberCursor;
        emberCursor = (emberCursor + 1) % EMBER_CAP;
        const i3 = i * 3;
        // small jitter so the burst origin reads as a flame rising, not a point
        emberPos[i3 + 0] = origin.x + (Math.random() - 0.5) * 0.25;
        emberPos[i3 + 1] = origin.y + 0.3 + Math.random() * 0.15;
        emberPos[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.25;
        // upward cone with sideways spread
        const speed = 1.4 + Math.random() * 1.6;
        const a = Math.random() * Math.PI * 2;
        const tilt = (Math.random() * 0.55) + 0.25; // 0=horizontal, 1=straight up
        emberVel[i3 + 0] = Math.cos(a) * speed * (1 - tilt);
        emberVel[i3 + 1] = speed * tilt + 0.6;
        emberVel[i3 + 2] = Math.sin(a) * speed * (1 - tilt);
        emberLife[i] = 1.0;
        emberSize[i] = 0.08 + Math.random() * 0.12;
      }
      emberGeo.attributes.position.needsUpdate = true;
    }

    // ── Stage waypoints ──
    // We rebuild the waypoint group whenever stage status changes, but the
    // scene/lights/camera/ground above are persistent.
    const waypointGroup = new THREE.Group();
    scene.add(waypointGroup);

    // Click hit list (we raycast against each waypoint's marker)
    const clickables = [];

    function rebuildWaypoints() {
      // Tear down previous
      while (waypointGroup.children.length) {
        const child = waypointGroup.children.pop();
        child.traverse(o => {
          if (o.geometry) o.geometry.dispose?.();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.());
            else o.material.dispose?.();
          }
        });
      }
      clickables.length = 0;

      const stages = stagesRef.current;
      if (!stages.length) return;

      const points = layoutWaypoints(stages);

      // Trail
      const trail = buildTrail(points, stages);
      waypointGroup.add(trail);

      // Trees flanking the trail (deterministic by stage index)
      for (let i = 0; i < stages.length; i++) {
        const p = points[i];
        for (let side = -1; side <= 1; side += 2) {
          // 1–2 trees on each side, offset further from the trail
          const count = (i * 7 + (side > 0 ? 3 : 1)) % 3 + 1;
          for (let k = 0; k < count; k++) {
            const tree = makeTree(0.6 + ((i * 13 + k * 5) % 7) * 0.07);
            const offsetZ = side * (1.7 + ((i * 11 + k * 17) % 9) * 0.12);
            const offsetX = ((i * 5 + k * 7) % 9) * 0.18 - 0.5;
            tree.position.set(p.x + offsetX, 0, p.z + offsetZ);
            waypointGroup.add(tree);
          }
        }
      }

      // Markers per stage
      stages.forEach((stage, i) => {
        const p = points[i];
        let marker;

        if (i === 0) {
          // Trailhead campfire — always present, regardless of status,
          // because the journey starts here.
          marker = makeCampfire();
        } else if (i === stages.length - 1) {
          marker = makeSummit();
        } else if (stage.status === 'completed') {
          marker = makeCairn(COL.field);
        } else if (stage.status === 'active') {
          marker = makeLantern();
        } else {
          marker = makeLocked();
        }

        marker.position.copy(p);
        marker.userData.stageId = stage.id;
        marker.userData.stageIndex = i;
        marker.userData.stageStatus = stage.status;
        waypointGroup.add(marker);

        // Invisible click target — bigger than the marker, so it's easy to hit
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.9, 8, 6),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hit.position.copy(p);
        hit.position.y += 0.6;
        hit.userData.stageId = stage.id;
        hit.userData.marker = marker;
        waypointGroup.add(hit);
        clickables.push(hit);

        // Active lantern → also drop a warm point light at this position
        if (stage.status === 'active' && i !== 0 && i !== stages.length - 1) {
          const lightMarker = new THREE.PointLight(COL.compassWarm, 2.4, 5, 1.6);
          lightMarker.position.set(p.x, 1.0, p.z);
          waypointGroup.add(lightMarker);
        }
      });
    }
    rebuildWaypoints();

    // Watch for stage changes
    let lastSig = JSON.stringify(stages.map(s => [s.id, s.status]));

    // ── Click handling ──
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function onClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length > 0) {
        const id = hits[0].object.userData.stageId;
        if (id != null && onClickRef.current) onClickRef.current(id);
      }
    }
    renderer.domElement.addEventListener('click', onClick);

    // Pointer drag for a gentle camera orbit (no extra dep)
    let dragging = false;
    let lastX = 0, lastY = 0;
    let orbitYaw = 0;     // rotation around scene center
    let orbitPitch = 0.4; // 0 = horizon, higher = looking down
    function onPointerDown(e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    }
    function onPointerUp() { dragging = false; renderer.domElement.style.cursor = 'grab'; }
    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - lastX; const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      orbitYaw -= dx * 0.005;
      orbitPitch = THREE.MathUtils.clamp(orbitPitch + dy * 0.003, 0.15, 0.9);
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    addEventListener('pointerup', onPointerUp);
    addEventListener('pointermove', onPointerMove);

    // ── Resize ──
    function onResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ── Animation loop ──
    let raf = 0;
    let last = performance.now() * 0.001;
    const tmp = new THREE.Vector3();

    function tick() {
      const now = performance.now() * 0.001;
      const dt = now - last;
      last = now;

      // Detect stage changes (cheap signature compare)
      const sig = JSON.stringify(stagesRef.current.map(s => [s.id, s.status]));
      if (sig !== lastSig) {
        lastSig = sig;
        rebuildWaypoints();
      }

      // Pending burst: fire at the matching stage's waypoint, then mark fired.
      // The prop can be `<stageId>` or `<stageId>::<nonce>` (the suffix lets a
      // demo or test replay the burst on the same stage without changing data).
      if (burstRef.current.pending) {
        const raw = String(burstRef.current.pending);
        const id = raw.split('::')[0];
        const idx = stagesRef.current.findIndex(s => s.id === id);
        if (idx >= 0) {
          const points = layoutWaypoints(stagesRef.current);
          fireBurst(points[idx], 36);
          burstRef.current.lastFiredFor = raw;
        }
        burstRef.current.pending = null;
      }

      // Step embers — gravity + drag, life decays, dead particles get parked
      for (let i = 0; i < EMBER_CAP; i++) {
        if (emberLife[i] <= 0) continue;
        const i3 = i * 3;
        emberVel[i3 + 1] -= 2.2 * dt;          // gravity
        emberVel[i3 + 0] *= 0.96;
        emberVel[i3 + 2] *= 0.96;
        emberPos[i3 + 0] += emberVel[i3 + 0] * dt;
        emberPos[i3 + 1] += emberVel[i3 + 1] * dt;
        emberPos[i3 + 2] += emberVel[i3 + 2] * dt;
        emberLife[i] -= dt * 0.55;             // ~1.8s lifetime
        if (emberLife[i] <= 0) emberPos[i3 + 1] = -100; // park
      }
      emberGeo.attributes.position.needsUpdate = true;
      // Fade material opacity by the *average* life — cheap and good enough
      let alive = 0, lifeSum = 0;
      for (let i = 0; i < EMBER_CAP; i++) if (emberLife[i] > 0) { alive++; lifeSum += emberLife[i]; }
      emberMat.opacity = alive ? 0.55 + 0.45 * (lifeSum / alive) : 0;

      // Camera target: orbit around the active waypoint (or scene center)
      const stages = stagesRef.current;
      const points = layoutWaypoints(stages);
      let target = new THREE.Vector3(0, 0.4, 0);
      if (stages.length) {
        const activeIdx = stages.findIndex(
          s => s.id === activeRef.current || s.status === 'active'
        );
        const idx = activeIdx >= 0 ? activeIdx : 0;
        target = points[idx].clone();
        target.y += 0.4;
      }

      const radius = Math.max(8, stages.length * 1.4);
      const camX = target.x + Math.cos(orbitYaw) * radius * Math.cos(orbitPitch);
      const camY = target.y + radius * Math.sin(orbitPitch);
      const camZ = target.z + Math.sin(orbitYaw) * radius * Math.cos(orbitPitch);
      camera.position.lerp(tmp.set(camX, camY, camZ), 1 - Math.pow(0.001, dt));
      camera.lookAt(target);

      // Flicker the campfire and active lanterns
      waypointGroup.traverse(o => {
        if (o.userData.isFlame) {
          o.scale.y = 1 + Math.sin(now * 11.0) * 0.07 + Math.sin(now * 17.0) * 0.04;
          o.rotation.y = Math.sin(now * 3.0) * 0.15;
        } else if (o.userData.isFlameInner) {
          o.scale.y = 1 + Math.sin(now * 14.5 + 1.2) * 0.09;
          o.rotation.y = -Math.sin(now * 2.4) * 0.2;
        } else if (o.isPointLight && o.userData.isFireLight) {
          o.intensity = 2.6 + Math.sin(now * 13.7) * 0.5 + Math.sin(now * 21.3) * 0.25;
        } else if (o.userData.isLanternGlow) {
          // Slow steady warm pulse
          const k = 1 + Math.sin(now * 2.0) * 0.06;
          o.scale.setScalar(k);
        }
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      removeEventListener('pointerup', onPointerUp);
      removeEventListener('pointermove', onPointerMove);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.());
          else o.material.dispose?.();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []); // mount once; the loop reads from refs

  return (
    <div
      ref={mountRef}
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0a1424 0%, #1a1a2e 60%, #2a1f24 100%)',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.45)',
      }}
      aria-label={`3D campsite map of project for ${studentName || 'explorer'}`}
    >
      {/* Top-left HUD: explorer's name */}
      {(studentName || studentEmoji) && (
        <div style={{
          position: 'absolute', top: 10, left: 12, zIndex: 2,
          padding: '6px 10px', borderRadius: 999,
          background: 'rgba(20, 24, 36, 0.65)', color: 'var(--paper)',
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.4,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {studentEmoji && <span style={{ fontSize: 14 }}>{studentEmoji}</span>}
          <span>{studentName || 'explorer'}'s expedition</span>
        </div>
      )}
      {/* Bottom-right hint */}
      <div style={{
        position: 'absolute', bottom: 8, right: 12, zIndex: 2,
        padding: '4px 8px', borderRadius: 6,
        background: 'rgba(20, 24, 36, 0.55)', color: 'rgba(255,255,255,0.65)',
        fontFamily: 'var(--font-mono)', fontSize: 10,
      }}>
        drag to look · click a waypoint
      </div>
    </div>
  );
}
