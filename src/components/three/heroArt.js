// Builds the picture shown through the hero's glass panels.
// - If site.heroImage is set, that image is used as-is (16:9 cover).
// - Otherwise a blue smoke nebula is generated, with the profile photo
//   blended in on the right (or a glowing energy core if there's no photo).
const W = 2048;
const H = 1152;
export const HERO_FOCUS_X = 0.69; // where the subject sits horizontally (0–1)

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── tiny value-noise + fbm ──
function makeNoise(seed = 7) {
  const perm = new Uint8Array(512);
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const noise = (x, y) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const a = perm[X] + Y;
    const b = perm[X + 1] + Y;
    const l1 = grad(perm[a], x, y) + u * (grad(perm[b], x - 1, y) - grad(perm[a], x, y));
    const l2 = grad(perm[a + 1], x, y - 1) + u * (grad(perm[b + 1], x - 1, y - 1) - grad(perm[a + 1], x, y - 1));
    return l1 + v * (l2 - l1); // ~[-1,1]
  };
  return (x, y, oct = 5) => {
    let sum = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) {
      sum += amp * noise(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };
}

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function paintNebula(ctx) {
  const w = 384;
  const h = 216;
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(w, h);
  const fbm = makeNoise(11);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      // domain-warped fbm → smoky tendrils
      const qx = fbm(nx * 3 + 1.7, ny * 3 + 9.2, 4);
      const qy = fbm(nx * 3 + 8.3, ny * 3 + 2.8, 4);
      let v = fbm(nx * 2.4 + qx * 1.9, ny * 2.4 + qy * 1.9, 5);
      v = Math.max(0, v * 1.25 + 0.18);
      // where the smoke lives: right side, bottom-left swirl, faint top-left
      const right = smooth(0.38, 0.95, nx) * (0.55 + 0.45 * smooth(1, 0.2, Math.abs(ny - 0.45)));
      const bl = Math.exp(-((nx - 0.12) ** 2 / 0.03 + (ny - 0.88) ** 2 / 0.02));
      const tl = Math.exp(-((nx - 0.25) ** 2 / 0.05 + (ny - 0.1) ** 2 / 0.03)) * 0.35;
      const mask = 0.08 + right * 1.1 + bl * 0.8 + tl;
      const k = Math.min(1.4, v * v * 2.6 * mask);
      // colour ramp: black → navy → blue → cyan-white
      const r = 255 * (0.02 + 0.10 * k + 0.55 * smooth(0.8, 1.4, k));
      const g = 255 * (0.03 + 0.28 * k + 0.45 * smooth(0.7, 1.3, k));
      const b = 255 * (0.06 + 0.85 * smooth(0, 0.75, k) + 0.1 * k);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, W, H);
  // glow pass
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(28px)';
  ctx.globalAlpha = 0.55;
  ctx.drawImage(small, 0, 0, W, H);
  ctx.restore();
}

function paintSparks(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const big = Math.random() < 0.05;
    const r = big ? 3 + Math.random() * 5 : 0.6 + Math.random() * 1.6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    const a = big ? 0.5 : 0.25 + Math.random() * 0.45;
    g.addColorStop(0, `rgba(170,210,255,${a})`);
    g.addColorStop(0.3, `rgba(60,130,255,${a * 0.5})`);
    g.addColorStop(1, 'rgba(30,90,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  ctx.restore();
}

function paintBacklight(ctx, cx, cy, radius) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, 'rgba(90,160,255,0.75)');
  g.addColorStop(0.35, 'rgba(30,100,255,0.45)');
  g.addColorStop(1, 'rgba(10,40,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

function paintPortrait(ctx, img) {
  const h = H * 0.94;
  const w = (img.width / img.height) * h;
  const cx = W * HERO_FOCUS_X;
  const x = cx - w / 2;
  const y = H - h;
  paintBacklight(ctx, cx, H * 0.42, H * 0.55);

  // soft-edged copy of the photo
  const off = document.createElement('canvas');
  off.width = Math.ceil(w);
  off.height = Math.ceil(h);
  const o = off.getContext('2d');
  o.drawImage(img, 0, 0, w, h);
  o.globalCompositeOperation = 'destination-in';
  const mask = o.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.25, w / 2, h * 0.5, Math.max(w, h) * 0.62);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.7, 'rgba(0,0,0,0.85)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = mask;
  o.fillRect(0, 0, w, h);
  // fade the sides a little more so it melts into the smoke
  const side = o.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, 'rgba(0,0,0,0)');
  side.addColorStop(0.18, 'rgba(0,0,0,1)');
  side.addColorStop(0.82, 'rgba(0,0,0,1)');
  side.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = side;
  o.fillRect(0, 0, w, h);
  ctx.drawImage(off, x, y);

  // blue rim light from the right
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const rim = ctx.createLinearGradient(x, 0, x + w, 0);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(0.75, 'rgba(40,120,255,0.25)');
  rim.addColorStop(1, 'rgba(90,170,255,0.6)');
  ctx.fillStyle = rim;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function paintCore(ctx) {
  // abstract glowing energy core used when there is no photo yet
  const cx = W * HERO_FOCUS_X;
  const cy = H * 0.48;
  paintBacklight(ctx, cx, cy, H * 0.6);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const r = 120 + i * 7.5 + Math.random() * 10;
    const start = Math.random() * Math.PI * 2;
    const len = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.15, r * 0.78, -0.35, start, start + len);
    const a = 0.08 + Math.random() * 0.3 * (1 - i / 50);
    ctx.strokeStyle = `rgba(${90 + Math.random() * 80},${160 + Math.random() * 60},255,${a})`;
    ctx.lineWidth = 1 + Math.random() * 3.5;
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(40,120,255,0.9)';
    ctx.stroke();
  }
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 170);
  core.addColorStop(0, 'rgba(235,245,255,0.95)');
  core.addColorStop(0.18, 'rgba(120,180,255,0.75)');
  core.addColorStop(0.5, 'rgba(30,100,255,0.3)');
  core.addColorStop(1, 'rgba(10,50,200,0)');
  ctx.shadowBlur = 0;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function darkenLeft(ctx) {
  const g = ctx.createLinearGradient(0, 0, W * 0.62, 0);
  g.addColorStop(0, 'rgba(3,5,10,0.78)');
  g.addColorStop(0.55, 'rgba(3,5,10,0.35)');
  g.addColorStop(1, 'rgba(3,5,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export async function createHeroArt({ heroImage, profileImage }) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const custom = await loadImage(heroImage);
  if (custom) {
    const scale = Math.max(W / custom.width, H / custom.height);
    const w = custom.width * scale;
    const h = custom.height * scale;
    ctx.drawImage(custom, (W - w) / 2, (H - h) / 2, w, h);
    return canvas;
  }

  ctx.fillStyle = '#03050c';
  ctx.fillRect(0, 0, W, H);
  paintNebula(ctx);
  paintSparks(ctx);
  const photo = await loadImage(profileImage);
  if (photo) paintPortrait(ctx, photo);
  else paintCore(ctx);
  darkenLeft(ctx);
  return canvas;
}
