import { useEffect, useRef } from 'react';
import { theme } from '../../theme';

// Electric trail behind the mouse: a glowing tail, sparks thrown backwards
// and little lightning forks when you move fast. Desktop only.
const MAX_SPARKS = 160;
const MAX_BOLTS = 24;
const TRAIL_POINTS = 14;
const WHITE = '255,255,255';

function makeBolt(x, y, angle, length, out) {
  out.length = 0;
  const segments = 4 + Math.floor(Math.random() * 4);
  let px = x;
  let py = y;
  out.push(px, py);
  for (let i = 1; i <= segments; i++) {
    const a = angle + (Math.random() - 0.5) * 1.1;
    const step = length / segments;
    px += Math.cos(a) * step;
    py += Math.sin(a) * step;
    out.push(px, py);
  }
}

export default function SparkCursor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sparks = Array.from({ length: MAX_SPARKS }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, hot: false }));
    const bolts = Array.from({ length: MAX_BOLTS }, () => ({ pts: [], life: 0, max: 1, width: 1, bright: false }));
    const trail = [];
    let sparkIdx = 0;
    let boltIdx = 0;
    let mx = -9999, my = -9999, px = -9999, py = -9999;
    let energy = 0;
    let glow = 0;
    let raf = 0;
    let running = false;
    let last = performance.now();
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    const spawnSpark = (x, y, dx, dy, e) => {
      const s = sparks[sparkIdx];
      sparkIdx = (sparkIdx + 1) % MAX_SPARKS;
      const a = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5) * 2.6;
      const v = 0.05 + Math.random() * 0.25 * (0.5 + e);
      s.x = x; s.y = y;
      s.vx = Math.cos(a) * v + dx * 0.02;
      s.vy = Math.sin(a) * v + dy * 0.02;
      s.max = s.life = 250 + Math.random() * 400;
      s.size = 0.6 + Math.random() * 1.6;
      s.hot = Math.random() < 0.15;
    };
    const spawnBolt = (x, y, e, big) => {
      const b = bolts[boltIdx];
      boltIdx = (boltIdx + 1) % MAX_BOLTS;
      makeBolt(x, y, Math.random() * Math.PI * 2, (10 + Math.random() * 28) * (big ? 1.8 : 1) * (0.6 + e * 0.6), b.pts);
      b.max = b.life = big ? 160 : 70 + Math.random() * 80;
      b.width = big ? 1.6 : 0.6 + Math.random() * 0.8;
      b.bright = big;
    };

    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (px < -999) { px = mx; py = my; }
      const dx = mx - px;
      const dy = my - py;
      const dist = Math.hypot(dx, dy);
      energy = Math.min(1.5, energy * 0.6 + dist / 40);
      const now = performance.now();
      trail.push({ x: mx, y: my, t: now });
      if (trail.length > TRAIL_POINTS) trail.shift();
      const n = Math.min(8, Math.floor(dist / 6) + (Math.random() < 0.4 ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const t = Math.random();
        spawnSpark(px + dx * t, py + dy * t, dx, dy, energy);
      }
      if (Math.random() < 0.15 + energy * 0.4) spawnBolt(mx, my, energy, false);
      if (dist > 45 && Math.random() < 0.25) spawnBolt(mx, my, energy, true);
      glow = Math.min(1, glow + dist / 120);
      px = mx; py = my;
      if (!running) { running = true; last = now; raf = requestAnimationFrame(draw); }
    };

    const draw = (now) => {
      const dt = Math.min(48, now - last);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = 'lighter';
      let alive = false;

      glow *= Math.pow(0.992, dt);
      if (glow > 0.02) {
        alive = true;
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 70);
        g.addColorStop(0, `rgba(${theme.sparkCore},${0.14 * glow})`);
        g.addColorStop(1, `rgba(${theme.sparkCore},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(mx - 70, my - 70, 140, 140);
      }

      while (trail.length && now - trail[0].t > 220) trail.shift();
      if (trail.length > 1) {
        alive = true;
        ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
          const k = 1 - (now - trail[i].t) / 220;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = `rgba(${theme.sparkDeep},${k * 0.6})`;
          ctx.lineWidth = 3 * k;
          ctx.stroke();
          ctx.strokeStyle = `rgba(${theme.sparkCore},${k * 0.5})`;
          ctx.lineWidth = 0.8 * k;
          ctx.stroke();
        }
      }

      for (const b of bolts) {
        if (b.life <= 0) continue;
        b.life -= dt;
        alive = true;
        const k = Math.max(0, b.life / b.max) * (Math.random() < 0.25 ? 0.4 : 1);
        ctx.beginPath();
        ctx.moveTo(b.pts[0], b.pts[1]);
        for (let i = 2; i < b.pts.length; i += 2) ctx.lineTo(b.pts[i], b.pts[i + 1]);
        ctx.shadowBlur = b.bright ? 14 : 8;
        ctx.shadowColor = theme.sparkGlow;
        ctx.strokeStyle = `rgba(${theme.sparkCore},${k * 0.85})`;
        ctx.lineWidth = b.width * 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${WHITE},${k * (b.bright ? 0.8 : 0.45)})`;
        ctx.lineWidth = b.width * 0.5;
        ctx.stroke();
      }

      for (const s of sparks) {
        if (s.life <= 0) continue;
        s.life -= dt;
        alive = true;
        const k = Math.max(0, s.life / s.max);
        const ox = s.x;
        const oy = s.y;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.985;
        s.vy *= 0.985;
        ctx.strokeStyle = `rgba(${s.hot ? WHITE : theme.sparkCore},${k * 0.9})`;
        ctx.lineWidth = s.size * k;
        ctx.beginPath();
        ctx.moveTo(ox - s.vx * 18, oy - s.vy * 18);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }

      energy *= Math.pow(0.95, dt / 16);
      if (alive) raf = requestAnimationFrame(draw);
      else { running = false; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="spark-cursor" aria-hidden="true" />;
}
