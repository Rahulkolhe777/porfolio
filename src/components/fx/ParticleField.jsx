import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { theme } from '../../theme';

// Full-page field of glowing particles. They drift, fly towards the camera
// as you scroll, lean towards the cursor (near ones more) and get pushed
// away by a shock-wave wherever you click.
const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uTravel;
  uniform float uDepth;
  uniform vec2 uMouse;
  uniform float uSpeed;
  uniform float uPixelRatio;
  uniform float uClock;
  uniform float uAspect;
  uniform vec3 uClick[4];
  varying float vAlpha;
  varying float vSeed;
  varying float vSize;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * (0.12 + aSeed * 0.2) + aSeed * 31.0) * (0.4 + aSeed * 0.6);
    p.y += cos(uTime * (0.10 + aSeed * 0.18) + aSeed * 17.0) * (0.4 + aSeed * 0.6);

    float z = p.z + uTravel + uTime * 0.25;
    z = mod(z + uDepth, uDepth + 6.0) - uDepth;
    p.z = z;

    float near = clamp((z + uDepth) / (uDepth + 6.0), 0.0, 1.0);
    p.xy += uMouse * near * near * 1.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    vec4 clip0 = projectionMatrix * mv;
    vec2 ndc = clip0.xy / clip0.w;
    for (int i = 0; i < 4; i++) {
      float age = uClock - uClick[i].z;
      if (age > 0.0 && age < 4.0) {
        vec2 d = ndc - uClick[i].xy;
        d.x *= uAspect;
        float dist = length(d);
        float reach = 0.15 + age * 0.55;
        float fall = exp(-dist * dist / (reach * reach * 0.35));
        float env = age * exp(-age * 2.2) * 6.0;
        vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0, 1.0);
        dir.x /= uAspect;
        mv.xy += dir * fall * env * 0.22 * -mv.z;
      }
    }

    gl_Position = projectionMatrix * mv;
    float pulse = 0.75 + 0.25 * sin(uTime * (0.6 + aSeed) + aSeed * 50.0);
    gl_PointSize = aSize * uPixelRatio * (1.0 + uSpeed * 0.6) * (60.0 / -mv.z) * (0.8 + near * near * 1.8);

    float fadeFar = smoothstep(-uDepth, -uDepth + 14.0, z);
    float fadeNear = 1.0 - smoothstep(2.0, 5.5, z);
    vAlpha = fadeFar * fadeNear * pulse * (0.35 + aSeed * 0.65) * (0.55 + near * 0.75);
    vSeed = aSeed;
    vSize = aSize;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uDim;
  uniform vec3 uBright;
  varying float vAlpha;
  varying float vSeed;
  varying float vSize;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = exp(-d * d * 60.0);
    float halo = exp(-d * d * 7.0) * (0.35 + vSize * 0.04);
    float a = (core + halo) * vAlpha;
    if (a < 0.003) discard;
    vec3 col = mix(uDim, uBright, core * (0.4 + vSeed * 0.6));
    gl_FragColor = vec4(col * a, a);
  }
`;

const NO_RIPPLE = 'a,button,input,textarea,select,label,video,img,nav,[role="button"],[data-no-ripple],.glass,.glass-chip,.glass-blue';

export default function ParticleField() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    // weak laptops: fewer particles + lower resolution (these are soft glows anyway)
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    const dpr = Math.min(window.devicePixelRatio || 1, small || weak ? 1.25 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(0, 0, 6);

    const count = small ? 800 : weak ? 1300 : 2200;
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.7) * 26;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r * 1.4 + (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.9 + (Math.random() - 0.5) * 4;
      pos[i * 3 + 2] = -Math.random() * 70;
      size[i] = Math.random() < 0.06 ? 7 + Math.random() * 11 : 1.1 + Math.random() * 3.4;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uTravel: { value: 0 },
        uDepth: { value: 70 },
        uMouse: { value: new THREE.Vector2() },
        uSpeed: { value: 0 },
        uPixelRatio: { value: dpr },
        uClock: { value: 0 },
        uAspect: { value: 1 },
        uClick: { value: [0, 1, 2, 3].map(() => new THREE.Vector3(0, 0, -99)) },
        uDim: { value: new THREE.Vector3(...theme.particleDim) },
        uBright: { value: new THREE.Vector3(...theme.particleBright) },
      },
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      mat.uniforms.uAspect.value = w / h;
    };
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const start = performance.now();
    let clickIdx = 0;
    const onDown = (e) => {
      if (!e.target || e.target.closest(NO_RIPPLE)) return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      mat.uniforms.uClick.value[clickIdx++ % 4].set(x, y, (performance.now() - start) / 1000);
      if (reduced) return;
      const ring = document.createElement('span');
      ring.className = 'pf-ripple';
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      host.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove(), { once: true });
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });

    let travel = 0;
    let travelTarget = 0;
    let lastScroll = window.scrollY;
    let speed = 0;
    let last = start;
    let raf = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const sy = window.scrollY;
      travelTarget += (sy - lastScroll) * 0.02;
      lastScroll = sy;
      const prev = travel;
      travel += (travelTarget - travel) * (1 - Math.exp(-6 * dt));
      const v = Math.min(Math.abs(travel - prev) / Math.max(dt, 0.001) / 25, 1);
      speed += (v - speed) * (1 - Math.exp(-8 * dt));
      const u = mat.uniforms;
      u.uTime.value = reduced ? 0 : (now - start) / 1000;
      u.uTravel.value = travel;
      u.uSpeed.value = speed;
      u.uClock.value = (now - start) / 1000;
      u.uMouse.value.x += (mouse.x - u.uMouse.value.x) * (1 - Math.exp(-3 * dt));
      u.uMouse.value.y += (mouse.y - u.uMouse.value.y) * (1 - Math.exp(-3 * dt));
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[#05060a]" />;
}
