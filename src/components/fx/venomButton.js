// "Venom" liquid button: the pill is drawn as a glossy black liquid in a
// WebGL shader. When the cursor comes near, sticky strands stretch out of the
// surface and cling to it; pull too far and they snap, fling droplets and
// wobble back into the body. Tapping on touch screens splashes instead.
//
// Everything is a 2D signed-distance field (pill + tapered strand segments +
// droplets, merged with smooth-min so they look gooey), shaded as a rounded
// glossy surface. The canvas sits behind the real <button>/<a>, which keeps
// its text, focus and click handling.

const PAD_X = 210;
const PAD_Y = 170;
const MAX_STRANDS = 4;
const SEG = 8; // segments per strand
const MAX_SEG = 40;
const MAX_DROPS = 16;
const REACH = 140; // px from the surface where strands start reaching
const MAX_LEN = 200; // strands snap beyond this length

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform vec4 uBox;
uniform vec4 uBump;
uniform vec4 uSeg[${MAX_SEG}];
uniform vec2 uSegR[${MAX_SEG}];
uniform int uNSeg;
uniform vec3 uDrop[${MAX_DROPS}];
uniform int uNDrop;
uniform vec3 uGlow;
uniform float uHover;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float sdPill(vec2 p) {
  vec2 d = p - uBox.xy;
  d.x = max(abs(d.x) - (uBox.z - uBox.w), 0.0);
  return length(d) - uBox.w;
}
float sdSeg(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}
float map(vec2 p) {
  float d = sdPill(p);
  if (uBump.z > 0.5) d = smin(d, length(p - uBump.xy) - uBump.z, 9.0);
  for (int i = 0; i < ${MAX_SEG}; i++) {
    if (i >= uNSeg) break;
    d = smin(d, sdSeg(p, uSeg[i].xy, uSeg[i].zw, uSegR[i].x, uSegR[i].y), 6.0);
  }
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uNDrop) break;
    d = smin(d, length(p - uDrop[i].xy) - uDrop[i].z, 5.0);
  }
  return d;
}
float height(float d) {
  float t = clamp(-d / 12.0, 0.0, 1.0);
  return sqrt(1.0 - (1.0 - t) * (1.0 - t)) * 12.0;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float d = map(p);
  float glow = exp(-max(d, 0.0) / 18.0) * (0.28 + 0.3 * uHover) * smoothstep(90.0, 0.0, sdPill(p));
  if (d > 1.5) {
    if (glow < 0.004) discard;
    gl_FragColor = vec4(uGlow * glow, glow * 0.85);
    return;
  }
  float h = height(d);
  float hx = height(map(p + vec2(1.0, 0.0)));
  float hy = height(map(p + vec2(0.0, 1.0)));
  vec3 n = normalize(vec3(-(hx - h), -(hy - h), 1.0));

  vec3 L = normalize(vec3(-0.35, -0.75, 0.6));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
  float spec = pow(max(dot(R, L), 0.0), 70.0) * 1.6;
  float spec2 = pow(max(dot(R, normalize(vec3(0.6, 0.55, 0.6))), 0.0), 24.0) * 0.45;
  float env = smoothstep(0.05, -0.85, R.y) * 0.3 + smoothstep(0.25, 0.95, R.y) * 0.05;
  float fres = pow(1.0 - n.z, 2.5);

  vec3 col = vec3(0.012, 0.014, 0.02);
  col += max(dot(n, L), 0.0) * 0.025;
  col += env * vec3(0.72, 0.78, 0.9) * (0.35 + fres);
  col += spec * vec3(1.0);
  col += spec2 * uGlow;
  col += fres * uGlow * (0.25 + 0.3 * uHover);

  // soft studio-light reflection across the top of the pill
  float yRel = (p.y - (uBox.y - uBox.w)) / (2.0 * uBox.w);
  float xRel = abs(p.x - uBox.x) / uBox.z;
  float inner = smoothstep(-3.0, -9.0, sdPill(p));
  col += inner * smoothstep(0.55, 0.08, yRel) * smoothstep(1.0, 0.55, xRel) * 0.12;

  float a = clamp(0.5 - d * uDpr, 0.0, 1.0);
  gl_FragColor = vec4(col * a + uGlow * glow * (1.0 - a), a + glow * 0.85 * (1.0 - a));
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

const hexToRgb = (hex) => {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

export function createVenom(button, canvas, { color = '#2f7bff' } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uDpr', 'uBox', 'uBump', 'uSeg', 'uSegR', 'uNSeg', 'uDrop', 'uNDrop', 'uGlow', 'uHover'].forEach((k) => {
    U[k] = gl.getUniformLocation(prog, k);
  });
  gl.uniform3fv(U.uGlow, hexToRgb(color));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr = 1;
  let W = 0;
  let H = 0;
  const box = { cx: 0, cy: 0, hw: 0, hh: 0 };
  const layout = () => {
    const bw = button.offsetWidth;
    const bh = button.offsetHeight;
    W = bw + PAD_X * 2;
    H = bh + PAD_Y * 2;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.style.left = `${button.offsetLeft - PAD_X}px`;
    canvas.style.top = `${button.offsetTop - PAD_Y}px`;
    box.cx = W / 2;
    box.cy = H / 2;
    box.hw = bw / 2;
    box.hh = bh / 2;
    gl.viewport(0, 0, canvas.width, canvas.height);
    dirty = true;
  };

  // ── geometry helpers (canvas px, y down) ──
  const pillDist = (x, y, s = 1) => {
    const L = box.hw * s - box.hh * s;
    const dx = Math.max(Math.abs(x - box.cx) - L, 0);
    return Math.hypot(dx, y - box.cy) - box.hh * s;
  };
  const nearestSurface = (x, y, out) => {
    const L = box.hw - box.hh;
    const qx = box.cx + Math.max(-L, Math.min(L, x - box.cx));
    let nx = x - qx;
    let ny = y - box.cy;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    out.x = qx + nx * box.hh;
    out.y = box.cy + ny * box.hh;
    out.nx = nx;
    out.ny = ny;
    return out;
  };

  // ── state ──
  const pointer = { x: -1e4, y: -1e4, cx: -1e4, cy: -1e4, present: false, mouse: true };
  let strands = [];
  let drops = [];
  const bump = { amt: 0, vel: 0, x: 0, y: 0, nx: 0, ny: -1 };
  let hover = 0;
  let press = 0;
  let pressTarget = 0;
  let spawnCooldown = 0;
  let dirty = true;
  const tmp = { x: 0, y: 0, nx: 0, ny: 0 };

  const addDrops = (x, y, dirx, diry, n, speed) => {
    for (let i = 0; i < n && drops.length < MAX_DROPS; i++) {
      const a = Math.atan2(diry, dirx) + (Math.random() - 0.5) * 1.4;
      const v = speed * (0.4 + Math.random() * 0.8);
      drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, r: 1.6 + Math.random() * 2.6, life: 0, max: 0.55 + Math.random() * 0.4 });
    }
  };

  const snap = (s, fling) => {
    if (s.state !== 'attached') return;
    s.state = 'retract';
    s.t = 0;
    s.from = { x: s.tip.x, y: s.tip.y };
    if (fling) {
      const dx = s.tip.x - s.root.x;
      const dy = s.tip.y - s.root.y;
      const len = Math.hypot(dx, dy) || 1;
      addDrops(s.tip.x - (dx / len) * len * 0.15, s.tip.y - (dy / len) * len * 0.15, dx / len, dy / len, 2 + Math.floor(Math.random() * 2), 160);
      bump.vel -= 160; // the body jiggles as the strand whips back
    }
  };

  const spawn = (k) => {
    const spread = [0, -24, 24, -46][k] ?? 0;
    const dx = pointer.x - box.cx;
    const dy = pointer.y - box.cy;
    const len = Math.hypot(dx, dy) || 1;
    // offset the anchor sideways so several strands fan out from the body
    nearestSurface(pointer.x + (-dy / len) * spread, pointer.y + (dx / len) * spread, tmp);
    strands.push({
      state: 'attached',
      t: 0,
      k,
      spread,
      root: { x: tmp.x - tmp.nx * 3, y: tmp.y - tmp.ny * 3 },
      tip: { x: tmp.x, y: tmp.y },
      wob: { x: 0, y: 0, vx: 0, vy: 0 },
      grow: 0,
      jitter: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 },
    });
  };

  // ── simulation ──
  const step = (dt) => {
    const dOut = pillDist(pointer.x, pointer.y);
    const near = pointer.present && pointer.mouse && dOut > 2 && dOut < REACH;
    hover += ((pointer.present && dOut < REACH * 0.6 ? 1 : 0) - hover) * (1 - Math.exp(-6 * dt));
    press += (pressTarget - press) * (1 - Math.exp(-18 * dt));

    // the surface bulges towards the cursor and wobbles like jelly
    nearestSurface(pointer.x, pointer.y, tmp);
    const want = near ? 7 * (1 - dOut / REACH) + 2 : pointer.present && dOut <= 2 ? 3 : 0;
    bump.vel += ((want - bump.amt) * 220 - bump.vel * 9) * dt;
    bump.amt += bump.vel * dt;
    if (pointer.present) { bump.x = tmp.x; bump.y = tmp.y; bump.nx = tmp.nx; bump.ny = tmp.ny; }

    const attached = strands.filter((s) => s.state === 'attached');
    spawnCooldown -= dt;
    if (near && attached.length < 3 && spawnCooldown <= 0 && strands.length < MAX_STRANDS) {
      spawn(attached.length);
      spawnCooldown = 0.12;
    }

    strands.forEach((s) => {
      s.t += dt;
      if (s.state === 'attached') {
        // anchor slides slowly along the surface (sticky), tip clings to the cursor
        const dx = pointer.x - box.cx;
        const dy = pointer.y - box.cy;
        const len = Math.hypot(dx, dy) || 1;
        nearestSurface(pointer.x + (-dy / len) * s.spread, pointer.y + (dx / len) * s.spread, tmp);
        const rk = 1 - Math.exp(-2.5 * dt);
        s.root.x += (tmp.x - tmp.nx * 3 - s.root.x) * rk;
        s.root.y += (tmp.y - tmp.ny * 3 - s.root.y) * rk;
        s.grow = Math.min(1, s.grow + dt * 5);
        const tx = s.root.x + (pointer.x + s.jitter.x - s.root.x) * s.grow;
        const ty = s.root.y + (pointer.y + s.jitter.y - s.root.y) * s.grow;
        const pvx = s.tip.x;
        const pvy = s.tip.y;
        const tk = 1 - Math.exp(-22 * dt);
        s.tip.x += (tx - s.tip.x) * tk;
        s.tip.y += (ty - s.tip.y) * tk;
        // tip motion excites a sideways wobble in the strand body
        s.wob.vx += (-(s.tip.x - pvx) * 6 - s.wob.x * 90 - s.wob.vx * 7) * dt * 10;
        s.wob.vy += (-(s.tip.y - pvy) * 6 - s.wob.y * 90 - s.wob.vy * 7) * dt * 10;
        s.wob.x += s.wob.vx * dt;
        s.wob.y += s.wob.vy * dt;
        const L = Math.hypot(s.tip.x - s.root.x, s.tip.y - s.root.y);
        if (L > MAX_LEN || !near) snap(s, near || dOut >= REACH);
      } else {
        // whip back into the body with a little overshoot
        const t = s.t;
        const f = Math.exp(-t * 9) * Math.cos(t * 13);
        s.tip.x = s.root.x + (s.from.x - s.root.x) * f;
        s.tip.y = s.root.y + (s.from.y - s.root.y) * f;
        s.wob.x *= Math.exp(-8 * dt);
        s.wob.y *= Math.exp(-8 * dt);
      }
    });
    strands = strands.filter((s) => s.state === 'attached' || s.t < 0.5);

    drops.forEach((d) => {
      d.life += dt;
      d.vy += 700 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    });
    drops = drops.filter((d) => d.life < d.max);
  };

  // ── upload to the shader ──
  const segBuf = new Float32Array(MAX_SEG * 4);
  const segR = new Float32Array(MAX_SEG * 2);
  const dropBuf = new Float32Array(MAX_DROPS * 3);
  const P = (s, t, out) => {
    // quadratic curve root → control → tip; the control sags and wobbles
    const mx = (s.root.x + s.tip.x) / 2;
    const my = (s.root.y + s.tip.y) / 2;
    const L = Math.hypot(s.tip.x - s.root.x, s.tip.y - s.root.y);
    const cx = mx + s.wob.x * 3;
    const cy = my + s.wob.y * 3 + L * 0.12;
    const u = 1 - t;
    out.x = u * u * s.root.x + 2 * u * t * cx + t * t * s.tip.x;
    out.y = u * u * s.root.y + 2 * u * t * cy + t * t * s.tip.y;
  };
  const a = { x: 0, y: 0 };
  const b = { x: 0, y: 0 };
  const render = () => {
    let n = 0;
    strands.forEach((s) => {
      const L = Math.hypot(s.tip.x - s.root.x, s.tip.y - s.root.y);
      const stretch = Math.min(1, L / MAX_LEN);
      const fade = s.state === 'attached' ? Math.min(1, s.t * 6) : Math.max(0, 1 - s.t / 0.45);
      const rootR = (9 - 3 * stretch) * fade;
      const midR = Math.max(0.9, 6 * (1 - stretch) ** 1.3 + 0.9) * fade;
      const tipR = 3.2 * fade;
      const rad = (t) => (t < 0.5 ? rootR + (midR - rootR) * Math.min(1, t / 0.4) : midR + (tipR - midR) * Math.max(0, (t - 0.6) / 0.4));
      for (let i = 0; i < SEG && n < MAX_SEG; i++) {
        const t0 = i / SEG;
        const t1 = (i + 1) / SEG;
        P(s, t0, a);
        P(s, t1, b);
        segBuf.set([a.x, a.y, b.x, b.y], n * 4);
        segR.set([rad(t0), rad(t1)], n * 2);
        n++;
      }
    });
    drops.forEach((d, i) => {
      const k = 1 - d.life / d.max;
      dropBuf.set([d.x, d.y, d.r * Math.sqrt(Math.max(k, 0))], i * 3);
    });
    const sq = 1 - press * 0.05;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform4f(U.uBox, box.cx, box.cy, box.hw * sq, box.hh * (1 - press * 0.08));
    const R = box.hh * 0.6;
    const amt = Math.max(-4, bump.amt);
    gl.uniform4f(U.uBump, bump.x - bump.nx * (R - amt), bump.y - bump.ny * (R - amt), Math.abs(bump.amt) > 0.05 ? R : 0, 0);
    gl.uniform4fv(U.uSeg, segBuf);
    gl.uniform2fv(U.uSegR, segR);
    gl.uniform1i(U.uNSeg, n);
    gl.uniform3fv(U.uDrop, dropBuf);
    gl.uniform1i(U.uNDrop, drops.length);
    gl.uniform1f(U.uHover, hover);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // ── input ──
  const toLocal = () => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((pointer.cx - r.left) / r.width) * W;
    pointer.y = ((pointer.cy - r.top) / r.height) * H;
  };
  const onMove = (e) => {
    pointer.cx = e.clientX;
    pointer.cy = e.clientY;
    pointer.mouse = e.pointerType === 'mouse' || e.pointerType === 'pen';
    pointer.present = pointer.mouse;
    dirty = true;
  };
  const onLeaveWin = () => { pointer.present = false; dirty = true; };
  const onDown = (e) => {
    pressTarget = 1;
    dirty = true;
    if (e.pointerType !== 'mouse') {
      pointer.cx = e.clientX;
      pointer.cy = e.clientY;
      toLocal();
      const dx = pointer.x - box.cx;
      const dy = pointer.y - box.cy;
      addDrops(pointer.x, pointer.y, dx || 1, dy - 20, 6, 220);
      bump.vel -= 220;
    }
  };
  const onUp = () => { pressTarget = 0; dirty = true; };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeaveWin);
  window.addEventListener('blur', onLeaveWin);
  button.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });

  const ro = new ResizeObserver(layout);
  ro.observe(button);
  layout();

  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; dirty = true; }, { rootMargin: '150px' });
  io.observe(canvas);

  let raf = 0;
  let last = performance.now();
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (!visible || document.hidden) return;
    toLocal();
    const active = strands.length || drops.length || Math.abs(bump.amt) > 0.02 || Math.abs(bump.vel) > 0.05
      || Math.abs(press - pressTarget) > 0.002 || hover > 0.002 || (pointer.present && pillDist(pointer.x, pointer.y) < REACH + 30);
    if (!active && !dirty) return;
    if (!reduced) step(dt);
    else { press = pressTarget; hover = 0; }
    render();
    dirty = false;
  };
  raf = requestAnimationFrame(frame);

  const onLost = (e) => { e.preventDefault(); destroy(); fail?.(); };
  let fail = null;
  canvas.addEventListener('webglcontextlost', onLost);

  function destroy() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeaveWin);
    window.removeEventListener('blur', onLeaveWin);
    button.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('webglcontextlost', onLost);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return { destroy, onFail(cb) { fail = cb; } };
}
