import { useEffect, useRef, useState } from 'react';
import { site } from '../../data/site';

// Photo frame hanging from a nail. It sways when the mouse sweeps past,
// and you can grab it and swing it (pendulum physics).
const STIFF = 26;
const STIFF_DRAG = 70;
const MAX_ANGLE = 0.38;
const PUSH = 9e-4;
const clamp = (v, m) => Math.max(-m, Math.min(m, v));

export default function HangingFrame() {
  const rigRef = useRef(null);
  const swingRef = useRef(null);
  const shadowRef = useRef(null);
  const [photoOk, setPhotoOk] = useState(true);
  const initials = site.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    const rig = rigRef.current;
    const swing = swingRef.current;
    if (!rig || !swing) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let angle = 0;
    let vel = 0;
    let yaw = 0;
    let target = 0;
    let dragging = false;
    let dragId = -1;
    let lastX = 0;
    let lastT = performance.now();
    let visible = true;
    let raf = 0;

    const pivot = () => {
      const r = rig.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + 8 };
    };
    const onMove = (e) => {
      const now = performance.now();
      const dt = Math.max((now - lastT) / 1000, 0.008);
      const vx = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
      if (dragging && e.pointerId === dragId) {
        const p = pivot();
        target = clamp(Math.atan2(-(e.clientX - p.x), Math.max(e.clientY - p.y, 60)), MAX_ANGLE);
        return;
      }
      if (reduced || coarse || !visible) return;
      // the mouse sweeping past pushes the frame like a breeze
      const r = rig.getBoundingClientRect();
      const dist = Math.abs(e.clientX - (r.left + r.width / 2)) + Math.max(0, Math.abs(e.clientY - (r.top + r.height / 2)) - r.height / 2);
      const near = Math.max(0, 1 - dist / 900);
      vel += clamp(-vx * PUSH * near, 0.25);
    };
    const onDown = (e) => {
      dragging = true;
      dragId = e.pointerId;
      swing.setPointerCapture?.(e.pointerId);
      swing.style.cursor = 'grabbing';
      lastX = e.clientX;
    };
    const onUp = (e) => {
      if (e.pointerId !== dragId) return;
      dragging = false;
      dragId = -1;
      target = 0;
      swing.style.cursor = '';
    };
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '200px' });
    io.observe(rig);

    let last = performance.now();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible && !dragging) return;
      const k = dragging ? STIFF_DRAG : STIFF;
      const goal = dragging ? target : 0;
      vel += -k * (angle - goal) * dt;
      vel *= Math.exp(-3.2 * dt);
      angle += vel * dt;
      if (Math.abs(angle) > MAX_ANGLE) { angle = Math.sign(angle) * MAX_ANGLE; vel *= -0.3; }
      yaw += (vel * 0.6 - yaw) * (1 - Math.exp(-6 * dt));
      const deg = (angle * 180) / Math.PI;
      swing.style.transform = `rotateZ(${deg}deg) rotateY(${clamp(yaw, 0.4) * 30}deg)`;
      if (shadowRef.current) shadowRef.current.style.transform = `translateX(${-deg * 2.2}px) rotateZ(${deg * 0.8}deg)`;
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    swing.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      swing.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <div ref={rigRef} className="hang-rig" data-no-ripple>
      <span className="hang-nail" aria-hidden="true" />
      <div ref={shadowRef} className="hang-shadow" aria-hidden="true" />
      <div ref={swingRef} className="hang-swing">
        <svg className="hang-strings" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="50" y1="0" x2="12" y2="100" />
          <line x1="50" y1="0" x2="88" y2="100" />
        </svg>
        <div className="hang-frame">
          <span className="hang-ring hang-ring-l" aria-hidden="true" />
          <span className="hang-ring hang-ring-r" aria-hidden="true" />
          <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-black/40 ring-1 ring-white/15">
            {photoOk ? (
              <img
                src={site.profileImage}
                alt={`Portrait of ${site.name}`}
                draggable={false}
                onError={() => setPhotoOk(false)}
                className="w-full h-full object-cover object-top select-none"
              />
            ) : (
              <div className="w-full h-full grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#1d4ed8_0%,#0b1a3a_45%,#05060a_80%)]">
                <span className="text-7xl font-black text-white/90 drop-shadow-[0_0_30px_rgba(47,123,255,0.9)]">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="hang-glare" aria-hidden="true" />
            <div className="absolute bottom-3 left-3 right-3 text-center">
              <span className="text-white text-base md:text-xl font-black uppercase tracking-wider block">{site.name.split(' ')[0]}</span>
              <span className="text-brand-soft text-xs md:text-sm uppercase font-bold tracking-widest">{site.about.subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
