import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { projects } from '../../data/projects';
import { getCovers, resolvePoster } from '../three/coverCache';
import useBlurReveal from '../../hooks/useBlurReveal';

// Scroll-driven 3D gallery: while the section is pinned, the cards ride a
// curved rail through space one after another, then fly into a grid.
const CFG = {
  FOV: 42,
  CAM_Z: 9,
  CARD_W: 3.4,
  SPACING: 0.13,
  RAIL_SPAN: 1.7,
  FLY_SPAN: 0.35,
  HOLD: 0.12,
  RAIL: [[0, 3, -60], [-10, 2, -34], [-12, 0.5, -14], [-7, -0.4, -1], [0, -0.8, 3.2], [7, -0.4, -1], [12, 0.6, -12], [9, 1.6, -26], [2, 2.2, -34]],
  RAIL_MOBILE: [[0, 3, -50], [-4, 1.5, -26], [-3.5, 0, -8], [0, -0.6, 2.5], [3.5, 0, -8], [4, 1.5, -24], [1, 2.4, -32]],
};
const ASPECT = 16 / 9;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function cardProgress(t, i, n) {
  const total = CFG.RAIL_SPAN + CFG.FLY_SPAN + (n - 1) * CFG.SPACING + CFG.HOLD;
  const local = clamp01(t) * total - i * CFG.SPACING;
  return {
    rail: clamp01(local / CFG.RAIL_SPAN),
    fly: clamp01((local - CFG.RAIL_SPAN) / CFG.FLY_SPAN),
    opacity: local <= 0 ? 0 : Math.min(1, local / 0.12),
  };
}

function gridLayout(n, w, h) {
  const vh = 2 * CFG.CAM_Z * Math.tan(((CFG.FOV / 2) * Math.PI) / 180);
  const aspect = w / h;
  const vw = vh * aspect;
  const cols = aspect < 0.8 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const header = vh * (aspect < 0.8 ? 0.34 : 0.4);
  const avail = vh - header - vh * 0.04;
  const gap = Math.min(vw, vh) * 0.025;
  let cellW = Math.min((vw * 0.92 - gap * (cols - 1)) / cols, ((avail - gap * (rows - 1)) / rows) * ASPECT);
  cellW = Math.max(cellW, 0.5);
  const cellH = cellW / ASPECT;
  const totalW = cols * cellW + (cols - 1) * gap;
  const totalH = rows * cellH + (rows - 1) * gap;
  const top = vh / 2 - header - (avail - totalH) / 2;
  return {
    cellW,
    cellH,
    cells: Array.from({ length: n }, (_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return {
        x: -totalW / 2 + cellW / 2 + c * (cellW + gap),
        y: top - cellH / 2 - r * (cellH + gap),
        side: cols > 1 && c === 0 ? -1 : cols > 1 && c === cols - 1 ? 1 : 0,
        vert: r === 0 ? 1 : r === rows - 1 ? -1 : 0,
      };
    }),
  };
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 uvScale;
  uniform vec2 uvOffset;
  uniform float uOpacity;
  uniform float uHover;
  varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 uv = vUv;
    if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
    vec2 p = (uv - 0.5) * vec2(${ASPECT.toFixed(4)}, 1.0);
    float d = rbox(p, vec2(${(ASPECT / 2).toFixed(4)}, 0.5), 0.07);
    float mask = 1.0 - smoothstep(-0.003, 0.003, d);
    if (mask < 0.01) discard;
    vec3 col = texture2D(map, uv * uvScale + uvOffset).rgb;
    col *= 0.92 + 0.22 * uHover;
    col += vec3(1.0) * 0.07 * smoothstep(0.55, 1.0, uv.y) * (1.0 - uv.x * 0.6);
    col += vec3(0.12, 0.42, 1.0) * 0.2 * uHover * smoothstep(0.45, 0.0, uv.y);
    float rim = smoothstep(-0.026, -0.004, d);
    vec3 rimCol = mix(vec3(0.78, 0.8, 0.86), vec3(0.35, 0.6, 1.0), uHover);
    col = mix(col, rimCol, rim * (0.45 + 0.3 * uHover));
    gl_FragColor = vec4(col, mask * uOpacity);
  }
`;

function Heading() {
  return (
    <div data-project-heading className="flex flex-col items-center text-center">
      <span className="text-brand-deep font-bold uppercase text-sm md:text-base tracking-[0.2em] mb-2">Featured Works</span>
      <h2 className="text-5xl md:text-7xl font-black tracking-tight uppercase text-white">Projects.</h2>
      <div className="w-20 h-1.5 bg-brand-deep mt-3 rounded-full shadow-[0_0_14px_rgba(47,123,255,0.6)]" />
    </div>
  );
}

function FallbackCard({ project, index, onSelect }) {
  const [src, setSrc] = useState('');
  useEffect(() => { resolvePoster(project, index).then(setSrc); }, [project, index]);
  return (
    <button
      data-project-fallback
      onClick={() => onSelect(project)}
      className="glass glass-panel p-0 block rounded-2xl overflow-hidden text-left group transition-transform duration-300 hover:scale-[1.02]"
    >
      <div className="aspect-video bg-[#07090f]">{src && <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />}</div>
      <div className="p-5">
        <span className="text-xs uppercase tracking-[0.2em] text-brand-soft font-bold">{project.category}</span>
        <h3 className="text-xl font-black text-white mt-1">{project.title}</h3>
        <p className="text-gray-400 text-sm mt-1">{project.subtitle}</p>
      </div>
    </button>
  );
}

export default function Projects({ onSelect }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const tipRef = useRef(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const [fallback, setFallback] = useState(false);

  useBlurReveal(sectionRef, '[data-project-heading] > *, [data-project-fallback]');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setFallback(true); return; }
    const section = sectionRef.current;
    const stage = stageRef.current;
    const tip = tipRef.current;
    if (!section || !stage) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFallback(true);
      return;
    }
    const small = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.setClearColor(0, 0);
    stage.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CFG.FOV, 1, 0.1, 200);
    camera.position.set(0, 0, CFG.CAM_Z);

    // pre-sample the rail
    const curve = new THREE.CatmullRomCurve3((small ? CFG.RAIL_MOBILE : CFG.RAIL).map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
    const SAMPLES = 400;
    const pts = [];
    const tans = [];
    for (let i = 0; i <= SAMPLES; i++) { pts.push(curve.getPointAt(i / SAMPLES)); tans.push(curve.getTangentAt(i / SAMPLES)); }
    const railAt = (t, outP, outT) => {
      const f = clamp01(t) * SAMPLES;
      const i = Math.min(Math.floor(f), SAMPLES - 1);
      const k = f - i;
      outP.lerpVectors(pts[i], pts[i + 1], k);
      outT.lerpVectors(tans[i], tans[i + 1], k).normalize();
    };

    const plane = new THREE.PlaneGeometry(ASPECT, 1, 24, 14);
    const blank = new THREE.DataTexture(new Uint8Array([10, 10, 16, 255]), 1, 1);
    blank.needsUpdate = true;
    const textures = [];
    const fitTexture = (mat, w, h) => {
      const a = w / h;
      if (a > ASPECT) { const s = ASPECT / a; mat.uniforms.uvScale.value.set(s, 1); mat.uniforms.uvOffset.value.set((1 - s) / 2, 0); }
      else { const s = a / ASPECT; mat.uniforms.uvScale.value.set(1, s); mat.uniforms.uvOffset.value.set(0, (1 - s) / 2); }
    };

    const cards = projects.map((project, i) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        uniforms: {
          map: { value: blank },
          uvScale: { value: new THREE.Vector2(1, 1) },
          uvOffset: { value: new THREE.Vector2(0, 0) },
          uOpacity: { value: 0 },
          uHover: { value: 0 },
        },
      });
      const mesh = new THREE.Mesh(plane, mat);
      mesh.userData.index = i;
      scene.add(mesh);
      return { project, mesh, mat, hover: 0 };
    });

    // generated covers first, real screenshots replace them if they exist
    let disposed = false;
    getCovers().then((covers) => {
      if (disposed) return;
      covers.forEach((canvas, i) => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        textures.push(tex);
        const card = cards[i];
        if (card.mat.uniforms.map.value === blank) {
          card.mat.uniforms.map.value = tex;
          fitTexture(card.mat, canvas.width, canvas.height);
        }
      });
    });
    const loader = new THREE.TextureLoader();
    cards.forEach((card) => {
      if (!card.project.poster) return;
      loader.load(card.project.poster, (tex) => {
        if (disposed) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        textures.push(tex);
        card.mat.uniforms.map.value = tex;
        fitTexture(card.mat, tex.image.width, tex.image.height);
      }, undefined, () => {});
    });

    let vw = 1;
    let vh = 1;
    let layout = null;
    const resize = () => {
      vw = stage.clientWidth;
      vh = stage.clientHeight;
      renderer.setSize(vw, vh, false);
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
      layout = gridLayout(cards.length, vw, vh);
    };
    resize();
    window.addEventListener('resize', resize);

    let target = 0;
    let progress = 0;
    const onScroll = () => {
      const r = section.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      target = span > 0 ? clamp01(-r.top / span) : 0;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '250px' });
    io.observe(stage);

    // hover + click
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(9, 9);
    let hovered = -1;
    let px = 0;
    let py = 0;
    let downX = 0;
    let downY = 0;
    const setPointer = (e) => {
      const r = stage.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
      ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
    };
    const pick = () => {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(cards.filter((c) => c.mat.uniforms.uOpacity.value > 0.3).map((c) => c.mesh));
      hovered = hits.length ? hits[0].object.userData.index : -1;
    };
    const onLeave = () => ndc.set(9, 9);
    const onDown = (e) => { downX = e.clientX; downY = e.clientY; setPointer(e); };
    const onUp = (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
      setPointer(e);
      pick();
      if (hovered >= 0) selectRef.current(cards[hovered].project);
    };
    stage.addEventListener('pointermove', setPointer);
    stage.addEventListener('pointerleave', onLeave);
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointerup', onUp);

    const P = new THREE.Vector3();
    const T = new THREE.Vector3();
    const flat = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const Z = new THREE.Vector3(0, 0, 1);
    const railQ = new THREE.Quaternion();
    const identity = new THREE.Quaternion();
    const wobble = new THREE.Quaternion();
    const end = new THREE.Vector3();
    const ctrl = new THREE.Vector3();
    const cell = new THREE.Vector3();

    let last = performance.now();
    let raf = 0;
    let flagged = false;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || document.hidden || !layout) return;
      progress += (target - progress) * (1 - Math.exp(-7 * dt));
      if (Math.abs(target - progress) < 1e-5) progress = target;

      cards.forEach((card, i) => {
        const st = cardProgress(progress, i, cards.length);
        railAt(st.rail, P, T);
        flat.set(T.x, 0, T.z);
        if (flat.lengthSq() < 1e-4) flat.set(1, 0, 0);
        flat.normalize();
        normal.crossVectors(flat, UP).normalize();
        if (normal.z < 0) normal.negate();
        // Cards mostly face the camera: following the rail exactly turned them
        // edge-on (thin, squashed) where the rail swings sideways. Keep only a
        // limited lean along the rail so they still swoop.
        const railYaw = Math.atan2(normal.x, normal.z);
        const camYaw = Math.atan2(camera.position.x - P.x, camera.position.z - P.z);
        let dev = railYaw - camYaw;
        dev = Math.atan2(Math.sin(dev), Math.cos(dev));
        const maxDev = THREE.MathUtils.lerp(0.45, 0.2, THREE.MathUtils.smoothstep(P.z, -20, 2));
        const lean = THREE.MathUtils.clamp(dev, -maxDev, maxDev);
        railQ.setFromAxisAngle(UP, camYaw + lean);
        wobble.setFromAxisAngle(Z, -lean * 0.18); // slight bank, like a card gliding past
        railQ.multiply(wobble);
        const railScale = CFG.CARD_W / ASPECT;
        const c = layout.cells[i];
        if (st.fly <= 0) {
          card.mesh.position.copy(P);
          card.mesh.quaternion.copy(railQ);
          card.mesh.scale.setScalar(railScale);
        } else {
          railAt(1, end, T);
          cell.set(c.x, c.y, 0);
          ctrl.set(c.x + c.side * layout.cellW * 0.9, c.y + c.vert * layout.cellH * 1.6, 1.2);
          const e = easeInOutCubic(st.fly);
          const k = 1 - e;
          card.mesh.position.set(
            k * k * end.x + 2 * k * e * ctrl.x + e * e * cell.x,
            k * k * end.y + 2 * k * e * ctrl.y + e * e * cell.y,
            k * k * end.z + 2 * k * e * ctrl.z + e * e * cell.z,
          );
          card.mesh.quaternion.copy(railQ).slerp(identity, e);
          wobble.setFromAxisAngle(Z, Math.sin(Math.PI * e) * 0.18 * (c.side || c.vert || 1));
          card.mesh.quaternion.multiply(wobble);
          card.mesh.scale.setScalar(THREE.MathUtils.lerp(railScale, layout.cellH, e));
        }
        card.mesh.renderOrder = Math.round(card.mesh.position.z * 100);
        card.hover += ((i === hovered ? 1 : 0) - card.hover) * (1 - Math.exp(-10 * dt));
        card.mat.uniforms.uHover.value = card.hover;
        card.mesh.scale.multiplyScalar(1 + card.hover * 0.05);
        card.mat.uniforms.uOpacity.value = st.opacity;
        card.mesh.visible = st.opacity > 0.001;
      });

      scene.updateMatrixWorld(true);
      pick();
      stage.style.cursor = hovered >= 0 ? 'pointer' : '';
      if (tip) {
        if (hovered >= 0) {
          const p = cards[hovered].project;
          if (tip.dataset.id !== p.id) {
            tip.dataset.id = p.id;
            tip.querySelector('[data-t]').textContent = p.title;
            tip.querySelector('[data-s]').textContent = p.subtitle;
            tip.querySelector('[data-c]').textContent = p.category;
          }
          tip.style.opacity = '1';
          const maxX = vw - tip.offsetWidth - 8;
          const maxY = vh - tip.offsetHeight - 8;
          tip.style.transform = `translate(${Math.max(8, Math.min(px + 18, maxX))}px, ${Math.max(8, Math.min(py + 18, maxY))}px)`;
        } else {
          tip.style.opacity = '0';
        }
      }
      renderer.render(scene, camera);
      if (!flagged) { flagged = true; stage.setAttribute('data-scene-ready', '1'); }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      stage.removeEventListener('pointermove', setPointer);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointerup', onUp);
      cards.forEach((c) => c.mat.dispose());
      textures.forEach((t) => t.dispose());
      plane.dispose();
      blank.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (fallback) {
    return (
      <section id="projects" ref={sectionRef} className="relative w-full text-gray-100 py-28 px-4 md:px-10 border-t border-white/5">
        <Heading />
        <div className="max-w-7xl mx-auto mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p, i) => <FallbackCard key={p.id} project={p} index={i} onSelect={onSelect} />)}
        </div>
      </section>
    );
  }

  return (
    <section id="projects" ref={sectionRef} className="relative w-full text-gray-100 border-t border-white/5" style={{ height: '420vh' }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-x-0 top-24 z-20 px-4 pointer-events-none">
          <Heading />
        </div>
        <div ref={stageRef} className="absolute inset-0 z-10" data-no-ripple aria-label="Featured projects" role="region" />
        <div
          ref={tipRef}
          className="pointer-events-none absolute left-0 top-0 z-30 glass rounded-xl px-4 py-3 transition-opacity duration-200 max-w-[16rem]"
          style={{ opacity: 0 }}
        >
          <span data-c className="block text-[10px] uppercase tracking-[0.2em] text-brand-soft font-bold" />
          <span data-t className="block text-base font-black text-white leading-tight mt-0.5" />
          <span data-s className="block text-xs text-gray-400 mt-0.5" />
        </div>
      </div>
    </section>
  );
}
