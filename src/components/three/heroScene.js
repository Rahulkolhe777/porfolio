import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { theme } from '../../theme';
import { HERO_FOCUS_X } from './heroArt';

// The hero is a big picture split into 5 thick glass shards.
// Points are in 0–1 panel space (x right, y down).
const A = [0.22, 0], B = [0.515, 0], C = [0.84, 0];
const D = [0.34, 1], E = [0.865, 1];
const P = [0.385, 0.72], Q = [0.48, 0.62], R = [0.716, 0.49];
const SHARDS = [
  [[0, 0], A, Q, P, D, [0, 1]],
  [A, B, R, Q],
  [B, C, R],
  [C, [1, 0], [1, 1], E, R],
  [P, Q, R, E, D],
];

const SPRING = { stiffness: 85, damping: 14, maxOffsetRatio: 0.12 };
function stepSpring(s, target, dt) {
  let left = Math.min(Math.max(dt, 0), 0.05);
  while (left > 0) {
    const h = Math.min(left, 1 / 120);
    s.velocity += ((target - s.position) * SPRING.stiffness - s.velocity * SPRING.damping) * h;
    s.position += s.velocity * h;
    left -= h;
  }
  if (Math.abs(s.position - target) < 1e-4 && Math.abs(s.velocity) < 1e-4) {
    s.position = target;
    s.velocity = 0;
  }
}
const clampOffset = (v, size) => {
  const m = size * SPRING.maxOffsetRatio;
  return Math.max(-m, Math.min(m, v));
};

// Where the glass panel sits inside the section (px).
export function panelRect(w, h) {
  const mobile = w < 768;
  const left = mobile ? Math.min(Math.max(w * 0.05, 16), 22) : w * 0.055;
  const top = Math.max(h * 0.085, mobile ? 84 : 96);
  const height = mobile ? h * 0.5 : h - top - h * 0.085;
  return { left, top, width: w - left * 2, height, mobile };
}

// shrink a polygon by `d` so neighbouring shards get a thin gap
function insetPolygon(pts, d) {
  const n = pts.length;
  const area = pts.reduce((acc, p, i) => {
    const q = pts[(i + 1) % n];
    return acc + (p[0] * q[1] - q[0] * p[1]);
  }, 0);
  const sign = area > 0 ? 1 : -1;
  const edges = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    let nx = -(q[1] - p[1]);
    let ny = q[0] - p[0];
    const len = Math.hypot(nx, ny) || 1;
    nx = (nx / len) * sign * d;
    ny = (ny / len) * sign * d;
    return [[p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny]];
  });
  return edges.map((e, i) => {
    const [a1, a2] = edges[(i - 1 + n) % n];
    const [b1, b2] = e;
    const dax = a2[0] - a1[0], day = a2[1] - a1[1];
    const dbx = b2[0] - b1[0], dby = b2[1] - b1[1];
    const den = dax * dby - day * dbx;
    if (Math.abs(den) < 1e-9) return b1;
    const t = ((b1[0] - a1[0]) * dby - (b1[1] - a1[1]) * dbx) / den;
    return [a1[0] + dax * t, a1[1] + day * t];
  });
}

function roundedShape(pts, radius) {
  const shape = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const v1 = [prev[0] - p[0], prev[1] - p[1]];
    const v2 = [next[0] - p[0], next[1] - p[1]];
    const l1 = Math.hypot(...v1);
    const l2 = Math.hypot(...v2);
    const r = Math.min(radius, l1 * 0.4, l2 * 0.4);
    const a = [p[0] + (v1[0] / l1) * r, p[1] + (v1[1] / l1) * r];
    const b = [p[0] + (v2[0] / l2) * r, p[1] + (v2[1] / l2) * r];
    if (i === 0) shape.moveTo(a[0], a[1]);
    else shape.lineTo(a[0], a[1]);
    shape.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  }
  shape.closePath();
  return shape;
}

export function createHeroScene({ section, mount, copy, artCanvas }) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const reflection = new THREE.Color(theme.glassReflection);
  const highlight = new THREE.Color(theme.glassHighlight);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  room.dispose?.();
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  const group = new THREE.Group();
  scene.add(group);
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));
  const key = new THREE.DirectionalLight(0xe8f0ff, 0.7);
  key.position.set(-4, 5, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(highlight, 0.45);
  fill.position.set(5, -3, 2);
  scene.add(fill);
  const hoverLight = new THREE.PointLight(reflection, 0, 6, 1.6);
  hoverLight.position.set(0, 0, 1.5);
  scene.add(hoverLight);

  const texture = new THREE.CanvasTexture(artCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0x14161d,
    roughness: 0.36,
    metalness: 0,
    specularIntensity: 0.35,
    specularColor: highlight,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    iridescence: 0.55,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [100, 400],
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 0.92,
    envMapIntensity: 0.28,
  });
  // Iridescence normally shimmers rainbow (it reads green on dark glass);
  // keep its brightness but recolour it with the theme's blue.
  const tintIridescence = (shader) => {
    shader.uniforms.uTint = { value: reflection.clone().multiplyScalar(2.2) };
    shader.fragmentShader = `uniform vec3 uTint;\n${shader.fragmentShader}`.replace(
      '#include <lights_fragment_begin>',
      THREE.ShaderChunk.lights_fragment_begin.replace(
        /(material\.iridescenceFresnel = evalIridescence\([^;]*\);)/,
        '$1\n\t\tmaterial.iridescenceFresnel = uTint * dot( material.iridescenceFresnel, vec3( 0.3333 ) );',
      ),
    );
  };
  // Living artwork: the smoke behind the glass slowly flows (domain-warped
  // sampling + a second, drifting haze layer), while the subject (photo/core)
  // stays still. Each shard also gets a slightly different parallax shift so
  // the picture reads as sitting *behind* thick glass.
  const artTime = { value: 0 };
  const focus = artCanvas.focus || { x: HERO_FOCUS_X, y: 0.45 };
  const artFocus = { value: new THREE.Vector2(focus.x, 1 - focus.y) };
  const addFlow = (shader, parallax) => {
    shader.uniforms.uArtTime = artTime;
    shader.uniforms.uArtFocus = artFocus;
    shader.uniforms.uParallax = parallax;
    shader.fragmentShader = `uniform float uArtTime;
uniform vec2 uArtFocus;
uniform vec2 uParallax;
${shader.fragmentShader}`.replace(
      '#include <emissivemap_fragment>',
      THREE.ShaderChunk.emissivemap_fragment.replace(
        'vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );',
        `vec2 euv = vEmissiveMapUv;
        // only the blue smoke moves: weight by how blue the picture is here,
        // so the photo / core stays perfectly still
        vec3 base0 = texture2D( emissiveMap, euv ).rgb;
        float keep = smoothstep(0.03, 0.22, base0.b - max(base0.r, base0.g));
        float t = uArtTime;
        vec2 flow = vec2(
          sin(euv.y * 9.0 + t * 0.35) + 0.5 * sin(euv.y * 17.0 + euv.x * 6.0 - t * 0.27),
          cos(euv.x * 8.0 - t * 0.3) + 0.5 * cos(euv.x * 15.0 + euv.y * 5.0 + t * 0.22));
        euv += flow * 0.007 * keep + uParallax;
        vec4 emissiveColor = texture2D( emissiveMap, euv );
        vec2 huv = (euv - 0.5) * 0.8 + 0.5 + vec2(t * 0.007, sin(t * 0.07) * 0.012) + uParallax * 1.8;
        vec3 haze = texture2D( emissiveMap, huv ).rgb;
        float hazeBlue = smoothstep(0.05, 0.3, haze.b - max(haze.r, haze.g));
        float hazeMask = keep * hazeBlue * (0.35 + 0.65 * smoothstep(0.15, 0.6, euv.x));
        emissiveColor.rgb += haze * haze * 0.42 * hazeMask;`,
      ),
    );
  };
  const edgeMat = new THREE.LineBasicMaterial({ color: reflection, transparent: true, opacity: 0.35 });

  let shards = [];
  let K = 1; // panel width in world units
  let G = 1; // panel height in world units
  let mobile = false;

  const build = () => {
    const prev = shards;
    shards.forEach((s) => {
      group.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.edge.geometry.dispose();
      s.mat.dispose();
    });
    shards = [];
    const unit = Math.min(K, G);
    SHARDS.forEach((poly, idx) => {
      const pts = poly.map(([x, y]) => {
        if (mobile) [x, y] = [y, x];
        return [(x - 0.5) * K, (0.5 - y) * G];
      });
      const shape = roundedShape(insetPolygon(pts, unit * 0.012), unit * 0.035);
      const depth = unit * 0.045;
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: depth * 0.35,
        bevelSize: depth * 0.3,
        bevelSegments: 3,
        curveSegments: 8,
      });
      geo.translate(0, 0, -depth);
      // map the art across the whole panel (cover-fit a 16:9 image, keep subject in view)
      const posAttr = geo.attributes.position;
      const uvAttr = geo.attributes.uv;
      const texAspect = 16 / 9;
      const aspect = K / G;
      let su = 1, sv = 1;
      if (aspect > texAspect) sv = texAspect / aspect;
      else su = aspect / texAspect;
      const shift = su < 1 ? Math.min(0.5, Math.max(0, (focus.x - 0.5) / (1 - su))) : 0;
      for (let i = 0; i < posAttr.count; i++) {
        const u = (posAttr.getX(i) / K + 0.5) * su + (1 - su) / 2 + shift * (1 - su);
        const v = (posAttr.getY(i) / G + 0.5) * sv + (1 - sv) / 2;
        uvAttr.setXY(i, Math.min(1, Math.max(0, u)), v);
      }
      uvAttr.needsUpdate = true;

      const mat = baseMat.clone();
      const parallax = prev[idx]?.parallax ?? { value: new THREE.Vector2() };
      mat.onBeforeCompile = (shader) => { tintIridescence(shader); addFlow(shader, parallax); };
      mat.customProgramCacheKey = () => 'blue-iridescence-flow';
      const mesh = new THREE.Mesh(geo, mat);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat);
      mesh.add(edge);
      mesh.userData.idx = idx;
      group.add(mesh);

      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const old = prev[idx];
      shards.push({
        mesh, edge, mat, parallax,
        depth: 0.8 + (idx % 3) * 0.25,
        dir: new THREE.Vector3(cx / K, cy / G, 0.4 + (idx % 3) * 0.25).normalize(),
        spin: old?.spin ?? new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.8),
        lift: old?.lift ?? 0,
        phase: idx * 1.37,
        x: old?.x ?? { position: 0, velocity: 0 },
        y: old?.y ?? { position: 0, velocity: 0 },
        targetX: old?.targetX ?? 0,
        targetY: old?.targetY ?? 0,
      });
    });
  };

  let rect = panelRect(1, 1);
  const resize = () => {
    const w = section.clientWidth;
    const h = section.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rect = panelRect(w, h);
    const perPx = (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h;
    K = rect.width * perPx;
    G = rect.height * perPx;
    group.position.set(0, -((rect.top - (h - rect.top - rect.height)) / 2) * perPx, 0);
    mobile = rect.mobile;
    build();
    if (copy) {
      if (rect.mobile) {
        const top = rect.top + rect.height + Math.min(h * 0.02, 16);
        Object.assign(copy.style, { left: `${rect.left}px`, top: `${top}px`, width: `${rect.width}px`, height: `${Math.max(h - top - h * 0.03, 180)}px` });
      } else {
        Object.assign(copy.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      }
    }
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(section);

  // ── pointer: tilt, hover light, drag shards ──
  const pointer = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane();
  const grabLocal = new THREE.Vector3();
  const hit = new THREE.Vector3();
  let dragIdx = -1;
  let dragPointer = null;
  let dragZ = 0;
  const dragStart = new THREE.Vector2();
  let hovering = false;
  const meshes = () => shards.map((s) => s.mesh);

  const onMove = (e) => {
    const r = section.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    hovering = true;
    if (dragIdx >= 0 && e.pointerId === dragPointer) {
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(dragPlane, hit)) {
        const local = group.worldToLocal(hit.clone());
        const s = shards[dragIdx];
        s.targetX = clampOffset(dragStart.x + local.x - grabLocal.x, K);
        s.targetY = clampOffset(dragStart.y + local.y - grabLocal.y, G);
      }
    }
  };
  const onLeave = () => { hovering = false; };
  const endDrag = () => {
    if (dragIdx < 0) return;
    const s = shards[dragIdx];
    s.targetX = 0;
    s.targetY = 0;
    dragIdx = -1;
    section.classList.remove('shard-dragging');
    mount.style.cursor = '';
    if (dragPointer !== null && section.hasPointerCapture(dragPointer)) section.releasePointerCapture(dragPointer);
    dragPointer = null;
  };
  const onDown = (e) => {
    if (dragIdx >= 0 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('a, button, input, textarea, nav')) return;
    if (section.getBoundingClientRect().top < -section.clientHeight * 0.04) return;
    onMove(e);
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const first = raycaster.intersectObjects(meshes(), false)[0];
    if (!first) return;
    dragIdx = first.object.userData.idx;
    dragPointer = e.pointerId;
    const s = shards[dragIdx];
    dragZ = s.mesh.position.z;
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), first.point);
    grabLocal.copy(group.worldToLocal(first.point.clone()));
    dragStart.set(s.x.position, s.y.position);
    section.setPointerCapture(e.pointerId);
    section.classList.add('shard-dragging');
    mount.style.cursor = 'grabbing';
    e.preventDefault();
  };
  section.addEventListener('pointermove', onMove);
  section.addEventListener('pointerleave', onLeave);
  section.addEventListener('pointerdown', onDown);
  section.addEventListener('pointerup', endDrag);
  section.addEventListener('pointercancel', endDrag);
  section.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('blur', endDrag);

  // ── intro: shards start blown apart and snap together ──
  const introState = { value: reduced ? 0 : 1, playing: false, start: 0 };
  const playIntro = () => {
    if (reduced) return;
    introState.playing = true;
    introState.start = performance.now();
  };

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) endDrag();
  });
  io.observe(section);

  const tilt = { x: 0, y: 0 };
  let hoverIdx = -1;
  let scrollP = 0;
  let last = performance.now();
  let raf = 0;
  let readyFlagged = false;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    if (!reduced) artTime.value = t % 3600;
    const ease = (k) => 1 - Math.exp(-k * dt);

    if (introState.playing) {
      const p = Math.min(1, (now - introState.start) / 1700);
      introState.value = Math.pow(1 - p, 3);
      if (p >= 1) introState.playing = false;
    }

    const dragging = dragIdx >= 0;
    const tx = dragging ? tilt.x : hovering && !reduced ? -pointer.y * THREE.MathUtils.degToRad(5.5) : 0;
    const ty = dragging ? tilt.y : hovering && !reduced ? pointer.x * THREE.MathUtils.degToRad(7) : 0;
    tilt.x += (tx - tilt.x) * ease(5);
    tilt.y += (ty - tilt.y) * ease(5);

    const r = section.getBoundingClientRect();
    const raw = THREE.MathUtils.clamp(-r.top / (r.height * 0.8), 0, 1);
    scrollP += (raw - scrollP) * ease(8);
    const scrollBurst = scrollP * scrollP * (3 - 2 * scrollP);
    const burst = Math.min(1, scrollBurst + introState.value * 0.85);

    group.rotation.set(tilt.x, tilt.y, 0);
    group.updateMatrixWorld(true);

    hoverIdx = -1;
    if (hovering && !coarse && burst < 0.05) {
      raycaster.setFromCamera(pointer, camera);
      const h = raycaster.intersectObjects(meshes(), false)[0];
      if (h) {
        hoverIdx = h.object.userData.idx;
        hoverLight.position.set(h.point.x, h.point.y, h.point.z + 1.2);
      }
    }
    hoverLight.intensity += ((hoverIdx >= 0 || dragging ? 1.6 : 0) - hoverLight.intensity) * ease(6);

    const spread = burst * Math.max(K, G) * 0.9;
    shards.forEach((s, i) => {
      const moved = dragIdx === i || s.x.position !== 0 || s.y.position !== 0;
      s.lift += ((!moved && hoverIdx === i ? 1 : 0) - s.lift) * ease(7);
      stepSpring(s.x, s.targetX, dt);
      stepSpring(s.y, s.targetY, dt);
      const bob = reduced || moved ? 0 : Math.sin(t * 0.8 + s.phase) * 0.03;
      s.mesh.position.set(
        s.dir.x * spread + s.x.position,
        s.dir.y * spread + s.y.position,
        (dragIdx === i ? dragZ : bob + s.lift * 0.35) + s.dir.z * spread * 0.6,
      );
      s.mesh.rotation.set(
        s.spin.x * burst + s.lift * -0.05 * pointer.y + s.y.position * -0.06,
        s.spin.y * burst + s.lift * 0.06 * pointer.x + s.x.position * 0.06,
        s.spin.z * burst + s.x.position * 0.025,
      );
      s.parallax.value.set(tilt.y * 0.09 * s.depth, tilt.x * 0.09 * s.depth);
      s.mat.emissiveIntensity = 0.92 * (1 - burst * 0.5) + s.lift * 0.1;
    });

    if (copy) {
      const out = scrollBurst;
      copy.style.transform = `perspective(1400px) rotateX(${(-tilt.x * 180) / Math.PI}deg) rotateY(${(tilt.y * 180) / Math.PI}deg) translate3d(${-out * 140}px, ${-out * 60}px, ${out * 80}px)`;
      copy.style.opacity = String(1 - out * 1.2);
    }

    renderer.render(scene, camera);
    if (!readyFlagged) {
      readyFlagged = true;
      mount.setAttribute('data-scene-ready', '1');
    }
  };
  raf = requestAnimationFrame(frame);

  return {
    playIntro,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      endDrag();
      section.removeEventListener('pointerdown', onDown);
      section.removeEventListener('pointerup', endDrag);
      section.removeEventListener('pointercancel', endDrag);
      section.removeEventListener('lostpointercapture', endDrag);
      window.removeEventListener('blur', endDrag);
      shards.forEach((s) => { s.mesh.geometry.dispose(); s.edge.geometry.dispose(); s.mat.dispose(); });
      baseMat.dispose();
      edgeMat.dispose();
      texture.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
