// Draws a 16:9 cover for a project card (used when there's no screenshot yet):
// label, title, tag chips and a little blue illustration on the right.
const W = 1600;
const H = 900;
const BLUE = '#2f7bff';
const BLUE_SOFT = 'rgba(80,150,255,';
const ARTS = ['network', 'bars', 'wave', 'cube', 'scatter', 'chat', 'calendar', 'field', 'radar'];

function rand(seed) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowDot(ctx, x, y, r, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  g.addColorStop(0, `rgba(200,225,255,${alpha})`);
  g.addColorStop(0.25, `${BLUE_SOFT}${alpha * 0.8})`);
  g.addColorStop(1, `${BLUE_SOFT}0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
}

// ── illustrations (drawn inside box x0,y0,w,h) ──
const art = {
  network(ctx, x0, y0, w, h, r) {
    const cx = x0 + w / 2, cy = y0 + h / 2;
    ctx.strokeStyle = `${BLUE_SOFT}0.18)`;
    ctx.lineWidth = 2;
    [0.42, 0.3, 0.18].forEach((k) => { ctx.beginPath(); ctx.arc(cx, cy, h * k, 0, Math.PI * 2); ctx.stroke(); });
    const nodes = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + r() * 0.5;
      const d = h * (0.18 + r() * 0.26);
      return [cx + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d];
    });
    ctx.strokeStyle = 'rgba(200,215,240,0.45)';
    ctx.lineWidth = 2;
    nodes.forEach((n, i) => {
      const m = nodes[(i + 2) % nodes.length];
      ctx.beginPath(); ctx.moveTo(n[0], n[1]); ctx.lineTo(i % 3 ? m[0] : cx, i % 3 ? m[1] : cy); ctx.stroke();
    });
    nodes.forEach((n, i) => {
      ctx.fillStyle = i % 4 === 0 ? BLUE : '#e6ecf7';
      ctx.beginPath(); ctx.arc(n[0], n[1], i % 4 === 0 ? 11 : 8, 0, Math.PI * 2); ctx.fill();
    });
    glowDot(ctx, cx, cy, 16);
  },
  bars(ctx, x0, y0, w, h, r) {
    const n = 16, gap = 10, bw = (w - gap * (n - 1)) / n;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const v = 0.2 + r() * 0.75;
      const bh = v * h * 0.8;
      const x = x0 + i * (bw + gap);
      const g = ctx.createLinearGradient(0, y0 + h - bh, 0, y0 + h);
      const lit = i % 3 !== 1;
      g.addColorStop(0, lit ? '#3d86ff' : '#c9d2e3');
      g.addColorStop(1, lit ? 'rgba(30,90,255,0.25)' : 'rgba(200,210,230,0.2)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y0 + h - bh, bw, bh);
      pts.push([x + bw / 2, y0 + h - bh - 40 - r() * 30]);
    }
    ctx.strokeStyle = '#e8eef9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    pts.forEach((p) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, Math.PI * 2); ctx.fill(); });
  },
  wave(ctx, x0, y0, w, h) {
    for (let j = 0; j < 26; j++) {
      for (let i = 0; i < 60; i++) {
        const u = i / 59, v = j / 25;
        const x = x0 + u * w * (0.75 + v * 0.25) + (1 - v) * w * 0.12;
        const y = y0 + h * 0.2 + v * h * 0.55 + Math.sin(u * 7 + v * 4) * h * 0.12 * (0.4 + v);
        const a = 0.25 + 0.6 * v * (0.5 + 0.5 * Math.sin(u * 5 + v * 3));
        ctx.fillStyle = `${BLUE_SOFT}${a})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
  },
  cube(ctx, x0, y0, w, h) {
    const cx = x0 + w / 2, cy = y0 + h / 2;
    const iso = (x, y, z, s) => [cx + (x - z) * s * 0.87, cy + (x + z) * s * 0.5 - y * s];
    [1, 0.66, 0.36].forEach((k, n) => {
      const s = h * 0.32 * k;
      const v = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([a, b, c]) => iso(a, b, c, s));
      const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      ctx.strokeStyle = n === 1 ? 'rgba(60,140,255,0.85)' : 'rgba(200,215,240,0.4)';
      ctx.lineWidth = n === 1 ? 3 : 2;
      e.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...v[a]); ctx.lineTo(...v[b]); ctx.stroke(); });
    });
    glowDot(ctx, cx, cy, 12);
  },
  scatter(ctx, x0, y0, w, h, r) {
    for (let i = 0; i < 140; i++) {
      const x = x0 + r() * w;
      const y = y0 + r() * h;
      const above = y < y0 + h / 2 + Math.sin(((x - x0) / w) * Math.PI * 2) * h * 0.25;
      ctx.fillStyle = above ? 'rgba(220,230,245,0.75)' : 'rgba(60,140,255,0.9)';
      ctx.beginPath(); ctx.arc(x, y, 3 + r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = x0 + (i / 60) * w;
      const y = y0 + h / 2 + Math.sin((i / 60) * Math.PI * 2) * h * 0.25;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  },
  chat(ctx, x0, y0, w, h) {
    roundRect(ctx, x0 + w * 0.12, y0 + h * 0.1, w * 0.36, h * 0.22, 18);
    ctx.fillStyle = 'rgba(220,228,240,0.85)'; ctx.fill();
    [0.24, 0.3, 0.36].forEach((k) => { ctx.fillStyle = '#1b2233'; ctx.beginPath(); ctx.arc(x0 + w * k, y0 + h * 0.21, 7, 0, Math.PI * 2); ctx.fill(); });
    roundRect(ctx, x0 + w * 0.36, y0 + h * 0.3, w * 0.5, h * 0.24, 18);
    ctx.fillStyle = BLUE; ctx.fill();
    [0.36, 0.42, 0.48].forEach((k, i) => { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x0 + w * 0.42, y0 + h * k, w * (0.36 - i * 0.08), 8); });
    [0.3, 0.45, 0.62, 0.8].forEach((k, i) => {
      ctx.fillStyle = i % 2 ? 'rgba(60,140,255,0.8)' : 'rgba(30,80,200,0.7)';
      const bh = h * k * 0.35;
      ctx.fillRect(x0 + w * (0.2 + i * 0.13), y0 + h * 0.95 - bh, w * 0.09, bh);
    });
  },
  calendar(ctx, x0, y0, w, h, r) {
    const cols = 7, rows = 5, gap = 12;
    const size = Math.min((w * 0.8 - gap * (cols - 1)) / cols, (h * 0.75 - gap * (rows - 1)) / rows);
    const ox = x0 + (w - (size * cols + gap * (cols - 1))) / 2;
    const oy = y0 + (h - (size * rows + gap * (rows - 1))) / 2;
    roundRect(ctx, ox - 20, oy - 20, size * cols + gap * (cols - 1) + 40, size * rows + gap * (rows - 1) + 40, 16);
    ctx.strokeStyle = 'rgba(200,215,240,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const lit = r() < 0.18;
      roundRect(ctx, ox + i * (size + gap), oy + j * (size + gap), size, size, 6);
      ctx.fillStyle = lit ? BLUE : 'rgba(255,255,255,0.08)';
      ctx.fill();
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    const px = ox + size * cols + gap * (cols - 1) + 6, py = oy - 26;
    ctx.beginPath(); ctx.moveTo(px - 24, py); ctx.lineTo(px + 24, py); ctx.moveTo(px, py - 24); ctx.lineTo(px, py + 24); ctx.stroke();
  },
  field(ctx, x0, y0, w, h) {
    const fw = w * 0.7, fh = h * 0.5, fx = x0 + (w - fw) / 2, fy = y0 + h * 0.12;
    ctx.strokeStyle = 'rgba(220,230,245,0.75)'; ctx.lineWidth = 3;
    ctx.strokeRect(fx, fy, fw, fh);
    ctx.beginPath(); ctx.moveTo(fx + fw / 2, fy); ctx.lineTo(fx + fw / 2, fy + fh); ctx.stroke();
    ctx.beginPath(); ctx.arc(fx + fw / 2, fy + fh / 2, fh * 0.18, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(fx, fy + fh * 0.3, fw * 0.1, fh * 0.4);
    ctx.strokeRect(fx + fw * 0.9, fy + fh * 0.3, fw * 0.1, fh * 0.4);
    for (let i = 0; i < 6; i++) {
      roundRect(ctx, fx + i * (fw / 6) + 6, fy + fh + 40, fw / 6 - 12, 34, 6);
      ctx.fillStyle = i === 2 || i === 4 ? 'rgba(255,255,255,0.15)' : BLUE;
      ctx.fill();
    }
  },
  radar(ctx, x0, y0, w, h, r) {
    const cx = x0 + w / 2, cy = y0 + h / 2, R = h * 0.42, spokes = 12;
    ctx.strokeStyle = `${BLUE_SOFT}0.55)`; ctx.lineWidth = 1.6;
    for (let k = 1; k <= 6; k++) {
      ctx.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const rr = (R * k) / 6 * (0.92 + 0.08 * Math.sin(i * 3 + k));
        const x = cx + Math.cos(a) * rr * 1.15, y = cy + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R * 1.15, cy + Math.sin(a) * R); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) glowDot(ctx, cx + (r() - 0.5) * R * 1.8, cy + (r() - 0.5) * R * 1.4, 5, 0.9);
    glowDot(ctx, cx, cy, 10);
  },
};

function chips(ctx, tags, x, y, maxX, font, size = 28, align = 'left') {
  ctx.font = `600 ${size}px ${font}`;
  const pad = size * 0.7;
  const h = size * 2;
  const list = (tags || []).slice(0, 5).map((t) => ({ t, w: ctx.measureText(t).width + pad * 2 }));
  if (align === 'center') {
    const total = list.reduce((a, c) => a + c.w + 12, -12);
    x = (W - total) / 2;
  }
  list.forEach(({ t, w }) => {
    if (x + w > maxX) return;
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(t, x + pad, y + h * 0.68);
    x += w + 12;
  });
}

function fitFont(ctx, text, weight, start, min, maxW, font) {
  let size = start;
  ctx.font = `${weight} ${size}px ${font}`;
  while (ctx.measureText(text).width > maxW && size > min) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${font}`;
  }
  let t = text;
  while (ctx.measureText(t).width > maxW && t.length > 4) t = `${t.slice(0, -2)}…`;
  return t;
}

function spaced(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

// Three layouts (cycled per card) like a designed project grid:
//  A: label + title + stack at top-left, illustration on the right
//  B: giant number in the middle with the illustration over it, title centred at the bottom
//  C: number tag top-left, big illustration top-right, huge title bottom-left
export function drawProjectCover(project, index, owner) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const r = rand(index + 3);
  const font = '"General Sans", system-ui, sans-serif';
  const layout = project.layout || ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'C', 'C'][index % 9];
  const kind = project.art || ARTS[index % ARTS.length];

  // charcoal base + coloured glow rising from the bottom (the cards' signature look)
  ctx.fillStyle = '#0b0d13';
  ctx.fillRect(0, 0, W, H);
  const gx = layout === 'A' ? W * 0.62 : layout === 'B' ? W * 0.5 : W * 0.45;
  let g = ctx.createRadialGradient(gx, H * 1.02, 0, gx, H * 1.02, W * 0.7);
  g.addColorStop(0, 'rgba(45,115,255,0.95)');
  g.addColorStop(0.3, 'rgba(28,80,225,0.55)');
  g.addColorStop(0.65, 'rgba(15,40,140,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W * 0.8, H * 0.2, 0, W * 0.8, H * 0.2, W * 0.45);
  g.addColorStop(0, 'rgba(70,130,255,0.2)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // darker top-left so text reads
  g = ctx.createLinearGradient(0, 0, W * 0.7, H * 0.7);
  g.addColorStop(0, 'rgba(5,6,10,0.55)');
  g.addColorStop(1, 'rgba(5,6,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'alphabetic';

  if (layout === 'B') {
    ctx.save();
    ctx.font = `800 700px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fillText(project.number, W * 0.5, H * 0.43);
    ctx.strokeStyle = 'rgba(120,170,255,0.16)';
    ctx.lineWidth = 3;
    ctx.strokeText(project.number, W * 0.5, H * 0.43);
    ctx.restore();
    ctx.save();
    (art[kind] || art.network)(ctx, W * 0.27, H * 0.08, W * 0.46, H * 0.62, r);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    const t = fitFont(ctx, project.title, 700, 66, 44, W * 0.84, font);
    ctx.fillText(t, W / 2, H * 0.84);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8b95a8';
    ctx.font = `500 26px ${font}`;
    const line = (project.tags || []).slice(0, 4).join('  ·  ');
    const lw = ctx.measureText(line).width;
    ctx.fillText(line, (W - lw) / 2, H * 0.92);
  } else if (layout === 'C') {
    ctx.save();
    (art[kind] || art.network)(ctx, W * 0.52, H * 0.06, W * 0.42, H * 0.56, r);
    ctx.restore();
    spaced(ctx, 4);
    ctx.font = `700 30px ${font}`;
    ctx.fillStyle = BLUE;
    ctx.fillText(project.number, 80, 104);
    ctx.fillRect(80, 122, 52, 5);
    spaced(ctx, 0);
    ctx.fillStyle = '#ffffff';
    const t = fitFont(ctx, project.title, 700, 116, 64, W * 0.86, font);
    ctx.fillText(t, 80, H * 0.72);
    ctx.fillStyle = '#b4bccb';
    ctx.font = `500 50px ${font}`;
    ctx.fillText(project.subtitle, 82, H * 0.72 + 66);
    chips(ctx, project.tags, 80, H * 0.72 + 100, W * 0.9, font, 26);
  } else {
    ctx.save();
    ctx.font = `800 560px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillText(project.number, W * 0.72, H * 0.53);
    ctx.restore();
    ctx.save();
    (art[kind] || art.network)(ctx, W * 0.54, H * 0.14, W * 0.4, H * 0.66, r);
    ctx.restore();
    spaced(ctx, 4);
    ctx.font = `700 26px ${font}`;
    ctx.fillStyle = BLUE;
    ctx.fillText(`PROJECT ${project.number}`, 80, 100);
    ctx.fillRect(80, 118, 52, 5);
    spaced(ctx, 0);
    ctx.fillStyle = '#ffffff';
    const t = fitFont(ctx, project.title, 700, 88, 56, W * 0.5, font);
    ctx.fillText(t, 80, 222);
    ctx.fillStyle = '#aab3c5';
    ctx.font = `500 42px ${font}`;
    ctx.fillText(project.subtitle, 80, 284);
    spaced(ctx, 3);
    ctx.fillStyle = '#6b7280';
    ctx.font = `600 18px ${font}`;
    ctx.fillText('STACK', 80, 372);
    spaced(ctx, 0);
    chips(ctx, project.tags, 80, 394, W * 0.54, font, 28);
    ctx.fillStyle = '#6b7280';
    ctx.font = `500 26px ${font}`;
    ctx.fillText(`${owner} · Developer`, 80, H - 70);
  }

  // glass sheen across the top
  g = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  g.addColorStop(0, 'rgba(255,255,255,0.06)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H * 0.45);
  return canvas;
}
