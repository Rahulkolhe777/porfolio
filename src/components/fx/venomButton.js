// "Venom" liquid button: the pill is drawn as a glossy black liquid in a
// WebGL shader. When the cursor comes near, the liquid pulls out into a thick
// lump that splits into several thin, taut strands which cling to the cursor
// (with a spray of glowing specks at the tip). Pull too far and the strands
// snap, fling droplets and whip back into the body, which wobbles like jelly.
// Tapping on touch screens splashes instead.
//
// Everything is a 2D signed-distance field (pill + lump + tapered strand
// segments + droplets, merged with smooth-min so they read as one liquid),
// shaded as a glossy, chrome-like black surface. The canvas sits behind the
// real <button>/<a>, which keeps its text, focus and click handling.

const PAD_X = 300;
const PAD_Y = 240;
const MAX_STRANDS = 4;
const SEG = 7; // segments per strand
const MAX_SEG = 36;
const MAX_DROPS = 16;
const MAX_SPARKS = 28;
const REACH = 170; // px from the surface where the liquid starts reaching
const MAX_LEN = 250; // strands snap beyond this length
const LUMP_MAX = 20; // how far the dripping lump can pull out when the cursor is very close

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform vec4 uBox;
uniform vec4 uLump;
uniform vec3 uLumpR;
uniform vec4 uSeg[${MAX_SEG}];
uniform vec2 uSegR[${MAX_SEG}];
uniform int uNSeg;
uniform vec3 uDrop[${MAX_DROPS}];
uniform int uNDrop;
uniform vec4 uSpark[${MAX_SPARKS}];
uniform vec2 uSparkA[${MAX_SPARKS}];
uniform int uNSpark;
uniform float uTime;
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
  if (uLumpR.z > 0.5) d = smin(d, sdSeg(p, uLump.xy, uLump.zw, uLumpR.x, uLumpR.y), 12.0);
  for (int i = 0; i < ${MAX_SEG}; i++) {
    if (i >= uNSeg) break;
    d = smin(d, sdSeg(p, uSeg[i].xy, uSeg[i].zw, uSegR[i].x, uSegR[i].y), 4.0);
  }
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uNDrop) break;
    d = smin(d, length(p - uDrop[i].xy) - uDrop[i].z, 4.0);
  }
  return d;
}
float height(float d) {
  float t = clamp(-d / 16.0, 0.0, 1.0);
  return sqrt(1.0 - (1.0 - t) * (1.0 - t)) * 16.0;
}
// splatter: thin bright streaks (each spark is a short line along its motion)
float sparks(vec2 p) {
  float s = 0.0;
  for (int i = 0; i < ${MAX_SPARKS}; i++) {
    if (i >= uNSpark) break;
    vec2 a = uSpark[i].xy, b = uSpark[i].zw;
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    vec2 q = pa - ba * h;
    float r = uSparkA[i].x;
    float d2 = dot(q, q);
    s += uSparkA[i].y * (exp(-d2 / (r * r)) + 0.18 * exp(-d2 / (r * r * 12.0)));
  }
  return s;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float d = map(p);
  float sp = sparks(p);
  vec3 spCol = mix(uGlow, vec3(0.85, 0.92, 1.0), clamp(sp - 0.6, 0.0, 1.0));
  float glow = exp(-max(d, 0.0) / 20.0) * (0.3 + 0.35 * uHover) * smoothstep(110.0, 0.0, sdPill(p));
  if (d > 1.5) {
    float a = clamp(glow * 0.85 + sp, 0.0, 1.0);
    if (a < 0.004) discard;
    gl_FragColor = vec4(uGlow * glow + spCol * sp, a);
    return;
  }
  float h = height(d);
  float hx = height(map(p + vec2(1.0, 0.0)));
  float hy = height(map(p + vec2(0.0, 1.0)));
  vec3 n = normalize(vec3(-(hx - h), -(hy - h), 1.0));

  // studio lighting on wet black plastic: a big soft key from the top-left,
  // a cool rim from the bottom-right and a bright environment on the slopes
  vec3 L = normalize(vec3(-0.35, -0.75, 0.6));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
  float spec = pow(max(dot(R, L), 0.0), 60.0) * 1.9;
  float spec2 = pow(max(dot(R, normalize(vec3(0.65, 0.5, 0.55))), 0.0), 20.0) * 0.5;
  float env = smoothstep(0.0, -0.9, R.y) * 0.62 + smoothstep(0.3, 0.95, abs(R.x)) * 0.28 + smoothstep(0.3, 0.95, R.y) * 0.06;
  float fres = pow(1.0 - n.z, 2.0);

  vec3 col = vec3(0.012, 0.013, 0.018);
  col += max(dot(n, L), 0.0) * 0.03;
  col += env * vec3(0.72, 0.75, 0.8) * (0.25 + fres * 1.2);
  col += spec * vec3(1.0);
  col += spec2 * mix(uGlow, vec3(1.0), 0.6);
  // bright grey rim all round the liquid (strongest on the upper edges)
  col += fres * vec3(0.62, 0.64, 0.68) * (0.75 + 0.5 * smoothstep(0.3, -0.6, n.y));
  col += fres * uGlow * (0.08 + 0.2 * uHover);
  // slow smoky reflections drifting inside the glossy body
  vec2 sp2 = p * vec2(0.022, 0.05) + vec2(uTime * 0.12, -uTime * 0.05);
  float smoke = vnoise(sp2) * 0.6 + vnoise(sp2 * 2.3 + 4.0) * 0.4;
  float innerAll = smoothstep(-5.0, -14.0, d);
  col += innerAll * smoothstep(0.55, 0.85, smoke) * vec3(0.32, 0.34, 0.38) * 0.55;

  // soft studio-light reflection across the top of the pill
  float yRel = (p.y - (uBox.y - uBox.w)) / (2.0 * uBox.w);
  float xRel = (p.x - (uBox.x - uBox.z)) / (2.0 * uBox.z);
  float inner = smoothstep(-4.0, -12.0, sdPill(p));
  col += inner * smoothstep(0.5, 0.06, yRel) * smoothstep(0.0, 0.12, xRel) * smoothstep(1.0, 0.75, xRel) * 0.14;
  // smeared reflection on the left cap, like a softbox on glossy liquid
  col += inner * exp(-pow((xRel - 0.1) * 7.0, 2.0)) * smoothstep(0.85, 0.2, yRel) * 0.1;

  float a = clamp(0.5 - d * uDpr, 0.0, 1.0);
  vec3 outCol = col * a + uGlow * glow * (1.0 - a) + spCol * sp;
  gl_FragColor = vec4(outCol, clamp(a + glow * 0.85 * (1.0 - a) + sp, 0.0, 1.0));
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
  ['uRes', 'uDpr', 'uBox', 'uLump', 'uLumpR', 'uSeg', 'uSegR', 'uNSeg', 'uDrop', 'uNDrop', 'uSpark', 'uSparkA', 'uNSpark', 'uGlow', 'uHover', 'uTime'].forEach((k) => {
    U[k] = gl.getUniformLocation(prog, k);
  });
  gl.uniform3fv(U.uGlow, hexToRgb(color));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr = 1;
  let W = 0;
  let H = 0;
  let dirty = true;
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
  const pillDist = (x, y) => {
    const L = box.hw - box.hh;
    const dx = Math.max(Math.abs(x - box.cx) - L, 0);
    return Math.hypot(dx, y - box.cy) - box.hh;
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
  const pointer = { x: -1e4, y: -1e4, cx: -1e4, cy: -1e4, px: 0, py: 0, present: false, mouse: true };
  let strands = [];
  let drops = [];
  let sparks = [];
  // the lump: a thick cone of liquid pulled out of the body towards the cursor
  const lump = { len: 0, vel: 0, x: 0, y: 0, nx: 1, ny: 0, tx: 0, ty: 0 };
  let hover = 0;
  let press = 0;
  let pressTarget = 0;
  let spawnCooldown = 0;
  let sparkClock = 0;
  const tmp = { x: 0, y: 0, nx: 0, ny: 0 };

  const addDrops = (x, y, dirx, diry, n, speed) => {
    for (let i = 0; i < n && drops.length < MAX_DROPS; i++) {
      const a = Math.atan2(diry, dirx) + (Math.random() - 0.5) * 1.4;
      const v = speed * (0.4 + Math.random() * 0.8);
      drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, r: 1.4 + Math.random() * 2.4, life: 0, max: 0.5 + Math.random() * 0.4 });
    }
  };
  const addSparks = (x, y, n, speed, dirx = 0, diry = 0) => {
    for (let i = 0; i < n; i++) {
      if (sparks.length >= MAX_SPARKS) sparks.shift();
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.9);
      sparks.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * v + dirx,
        vy: Math.sin(a) * v + diry,
        r: 0.55 + Math.random() * 0.7,
        life: 0,
        max: 0.12 + Math.random() * 0.22,
      });
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
      addDrops(s.tip.x - (dx / len) * len * 0.2, s.tip.y - (dy / len) * len * 0.2, dx / len, dy / len, 1 + Math.floor(Math.random() * 2), 170);
      addSparks(s.tip.x, s.tip.y, 3, 140);
      lump.vel -= 90; // the body jiggles as the strand whips back
    }
  };

  const spawn = (k) => {
    const spread = [0, -0.8, 0.8, -0.4][k] ?? 0;
    const dx = pointer.x - box.cx;
    const dy = pointer.y - box.cy;
    const len = Math.hypot(dx, dy) || 1;
    const off = spread * box.hh * 1.6;
    nearestSurface(pointer.x + (-dy / len) * off, pointer.y + (dx / len) * off, tmp);
    strands.push({
      state: 'attached',
      t: 0,
      spread,
      root: { x: tmp.x - tmp.nx * 2, y: tmp.y - tmp.ny * 2 },
      tip: { x: tmp.x, y: tmp.y },
      wob: { x: 0, y: 0, vx: 0, vy: 0 },
      sag: (Math.random() - 0.5) * 0.08,
      grow: 0,
      jitter: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
    });
  };

  // ── simulation ──
  const step = (dt) => {
    const dOut = pillDist(pointer.x, pointer.y);
    const near = pointer.present && pointer.mouse && dOut > 3 && dOut < REACH;
    hover += ((pointer.present && dOut < REACH * 0.6 ? 1 : 0) - hover) * (1 - Math.exp(-6 * dt));
    press += (pressTarget - press) * (1 - Math.exp(-18 * dt));

    // lump: anchored where the cursor is closest, pulled out more the closer
    // the strands are to snapping; springy so it wobbles when released
    if (pointer.present) {
      nearestSurface(pointer.x, pointer.y, tmp);
      // snap straight to the surface when idle (no strands hanging off it)
      const k = strands.length ? 1 - Math.exp(-10 * dt) : 1;
      lump.x += (tmp.x - lump.x) * k;
      lump.y += (tmp.y - lump.y) * k;
      const nl = Math.hypot(lump.nx + (tmp.nx - lump.nx) * k, lump.ny + (tmp.ny - lump.ny) * k) || 1;
      lump.nx = (lump.nx + (tmp.nx - lump.nx) * k) / nl;
      lump.ny = (lump.ny + (tmp.ny - lump.ny) * k) / nl;
    }
    const attached = strands.filter((s) => s.state === 'attached');
    const pull = attached.length
      ? Math.min(1, Math.max(...attached.map((s) => Math.hypot(s.tip.x - s.root.x, s.tip.y - s.root.y))) / MAX_LEN)
      : 0;
    // a gooey lump only bulges out when the cursor is right next to the body
    const closeK = near ? Math.max(0, 1 - dOut / 80) : 0;
    const want = closeK * LUMP_MAX * (0.6 + 0.4 * (1 - pull));
    lump.vel += ((want - lump.len) * 160 - lump.vel * 10) * dt;
    lump.len += lump.vel * dt;
    lump.tx = lump.x + lump.nx * Math.max(lump.len, 0);
    lump.ty = lump.y + lump.ny * Math.max(lump.len, 0);

    spawnCooldown -= dt;
    if (near && attached.length < MAX_STRANDS && spawnCooldown <= 0 && strands.length < MAX_STRANDS + 2) {
      spawn(attached.length);
      spawnCooldown = 0.07;
    }

    const pdx = pointer.x - lump.tx;
    const pdy = pointer.y - lump.ty;
    const plen = Math.hypot(pdx, pdy) || 1;
    strands.forEach((s) => {
      s.t += dt;
      if (s.state === 'attached') {
        // roots fan out across the lump tip, tips converge on the cursor
        // roots sit spread across the facing end of the body (top, middle,
        // bottom of the cap) and slide there slowly, like something sticky
        const off = s.spread * box.hh * 1.6;
        nearestSurface(pointer.x + (-pdy / plen) * off, pointer.y + (pdx / plen) * off, tmp);
        const rx = tmp.x - tmp.nx * 2 + (lump.tx - lump.x) * (s.spread === 0 ? 1 : 0.3);
        const ry = tmp.y - tmp.ny * 2 + (lump.ty - lump.y) * (s.spread === 0 ? 1 : 0.3);
        const rk = 1 - Math.exp(-8 * dt);
        s.root.x += (rx - s.root.x) * rk;
        s.root.y += (ry - s.root.y) * rk;
        s.grow = Math.min(1, s.grow + dt * 6);
        const tx = s.root.x + (pointer.x + s.jitter.x - s.root.x) * s.grow;
        const ty = s.root.y + (pointer.y + s.jitter.y - s.root.y) * s.grow;
        const pvx = s.tip.x;
        const pvy = s.tip.y;
        const tk = 1 - Math.exp(-26 * dt);
        s.tip.x += (tx - s.tip.x) * tk;
        s.tip.y += (ty - s.tip.y) * tk;
        // fast tip motion makes the strand body twang sideways
        s.wob.vx += (-(s.tip.x - pvx) * 5 - s.wob.x * 120 - s.wob.vx * 8) * dt * 10;
        s.wob.vy += (-(s.tip.y - pvy) * 5 - s.wob.y * 120 - s.wob.vy * 8) * dt * 10;
        s.wob.x += s.wob.vx * dt;
        s.wob.y += s.wob.vy * dt;
        const L = Math.hypot(s.tip.x - s.root.x, s.tip.y - s.root.y);
        s.len = L;
        if (L > MAX_LEN || !near) snap(s, near || dOut >= REACH);
      } else {
        // whip back into the lump: roots gather together, tip reels in fast
        const t = s.t;
        const f = Math.exp(-t * 13) * (1 + t * 13);
        s.tip.x = s.root.x + (s.from.x - s.root.x) * f;
        s.tip.y = s.root.y + (s.from.y - s.root.y) * f;
        s.wob.x *= Math.exp(-8 * dt);
        s.wob.y *= Math.exp(-8 * dt);
      }
    });
    strands = strands.filter((s) => s.state === 'attached' || s.t < 0.34);

    // a spray of glowing specks where the strands grab the cursor
    if (attached.length && !reduced) {
      const moved = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
      sparkClock += dt * (22 + Math.min(moved, 30) * 2);
      while (sparkClock > 1) {
        sparkClock -= 1;
        addSparks(pointer.x, pointer.y, 1, 260, (pointer.x - pointer.px) * 3, (pointer.y - pointer.py) * 3);
      }
    }
    pointer.px = pointer.x;
    pointer.py = pointer.y;

    drops.forEach((d) => {
      d.life += dt;
      d.vy += 700 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    });
    drops = drops.filter((d) => d.life < d.max);
    sparks.forEach((p) => {
      p.life += dt;
      p.vx *= Math.exp(-4 * dt);
      p.vy = p.vy * Math.exp(-4 * dt) + 120 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    sparks = sparks.filter((p) => p.life < p.max);
  };

  // ── upload to the shader ──
  const segBuf = new Float32Array(MAX_SEG * 4);
  const segR = new Float32Array(MAX_SEG * 2);
  const dropBuf = new Float32Array(MAX_DROPS * 3);
  const sparkBuf = new Float32Array(MAX_SPARKS * 4);
  const sparkA = new Float32Array(MAX_SPARKS * 2);
  const P = (s, t, out) => {
    // nearly straight, taut curve root → tip with a little sag and twang
    const mx = (s.root.x + s.tip.x) / 2;
    const my = (s.root.y + s.tip.y) / 2;
    const L = Math.hypot(s.tip.x - s.root.x, s.tip.y - s.root.y);
    const cx = mx + s.wob.x * 2.2;
    const cy = my + s.wob.y * 2.2 + L * (0.035 + s.sag);
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
      const fade = s.state === 'attached' ? Math.min(1, s.t * 7) : Math.max(0, 1 - s.t / 0.32);
      const rootR = (5.5 - 2 * stretch) * fade;
      const midR = Math.max(1.05, 2.6 * (1 - stretch) ** 1.4 + 1.05) * fade;
      const tipR = 1.5 * fade;
      const rad = (t) => (t < 0.5 ? rootR + (midR - rootR) * Math.min(1, t / 0.18) : midR + (tipR - midR) * Math.max(0, (t - 0.8) / 0.2));
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
    sparks.forEach((p, i) => {
      const k = 1 - p.life / p.max;
      // streak from the spark back along its velocity
      sparkBuf.set([p.x, p.y, p.x - p.vx * 0.035, p.y - p.vy * 0.035], i * 4);
      sparkA.set([p.r, k * 1.4], i * 2);
    });
    const sq = 1 - press * 0.05;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform4f(U.uBox, box.cx, box.cy, box.hw * sq, box.hh * (1 - press * 0.08));
    // lump: from inside the body out to its tip, fat at the base, narrow at the tip
    const len = Math.max(lump.len, -3);
    const baseR = box.hh * 0.62;
    const bx = lump.x - lump.nx * baseR * 0.55;
    const by = lump.y - lump.ny * baseR * 0.55;
    gl.uniform4f(U.uLump, bx, by, lump.x + lump.nx * len, lump.y + lump.ny * len);
    const tipR = Math.max(3.5, 9 - len * 0.12);
    gl.uniform3f(U.uLumpR, baseR * 0.85, tipR, Math.abs(lump.len) > 0.1 ? 1 : 0);
    gl.uniform4fv(U.uSeg, segBuf);
    gl.uniform2fv(U.uSegR, segR);
    gl.uniform1i(U.uNSeg, n);
    gl.uniform3fv(U.uDrop, dropBuf);
    gl.uniform1i(U.uNDrop, drops.length);
    gl.uniform4fv(U.uSpark, sparkBuf);
    gl.uniform2fv(U.uSparkA, sparkA);
    gl.uniform1f(U.uTime, (performance.now() / 1000) % 1000);
    gl.uniform1i(U.uNSpark, sparks.length);
    gl.uniform1f(U.uHover, hover);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // ── input ──
  let visible = false;
  const toLocal = () => {
    const r = canvas.getBoundingClientRect();
    const was = visible;
    visible = r.width > 0 && r.bottom > -100 && r.top < window.innerHeight + 100;
    if (visible && !was) dirty = true;
    if (!r.width) return;
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
      addSparks(pointer.x, pointer.y, 8, 160);
      lump.vel -= 160;
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


  let raf = 0;
  let last = performance.now();
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (document.hidden) return;
    toLocal();
    if (!visible) return;
    const active = strands.length || drops.length || sparks.length || Math.abs(lump.len) > 0.05 || Math.abs(lump.vel) > 0.05
      || Math.abs(press - pressTarget) > 0.002 || hover > 0.002 || (pointer.present && pillDist(pointer.x, pointer.y) < REACH + 30);
    if (!active && !dirty) return;
    if (!reduced) step(dt);
    else { press = pressTarget; hover = 0; }
    render();
    dirty = false;
  };
  raf = requestAnimationFrame(frame);

  let fail = null;
  const onLost = (e) => { e.preventDefault(); destroy(); fail?.(); };
  canvas.addEventListener('webglcontextlost', onLost);

  function destroy() {
    cancelAnimationFrame(raf);
    ro.disconnect();
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
