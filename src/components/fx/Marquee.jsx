import { useEffect, useRef } from 'react';
import { getScrollVelocity } from '../../lib/smoothScroll';

// Big infinite text strip. It drifts on its own, speeds up with scroll
// speed and flips direction when you scroll back up.
export default function Marquee({ words, reverse = false, tilt = 0 }) {
  const rootRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const base = reverse ? 1 : -1; // px/frame-ish direction
    let x = 0;
    let dir = 1;
    let boost = 0;
    let lastY = window.scrollY;
    let last = performance.now();
    let visible = false;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' });
    io.observe(root);

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const y = window.scrollY;
      // Lenis velocity when smooth scroll is on, raw scroll delta otherwise (touch)
      const v = getScrollVelocity() || (y - lastY) / Math.max(dt * 60, 1);
      lastY = y;
      if (!visible || document.hidden) return;
      if (Math.abs(v) > 0.3) dir = v > 0 ? 1 : -1;
      boost += (Math.min(Math.abs(v), 60) - boost) * (1 - Math.exp(-6 * dt));
      const half = track.scrollWidth / 2;
      x += base * dir * (55 + boost * 22) * dt;
      if (half > 0) x = ((x % half) - half) % half; // wrap into (-half, 0]
      track.style.transform = `translate3d(${x}px,0,0)`;
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [reverse]);

  const row = words.map((w, i) => (
    <span key={i} className="marquee__item">
      <span className={i % 2 ? 'marquee__word marquee__word--outline' : 'marquee__word'}>{w}</span>
      <span className="marquee__dot" aria-hidden="true" />
    </span>
  ));

  return (
    <div ref={rootRef} className="marquee" style={{ '--tilt': `${tilt}deg` }} aria-label={words.join(', ')} role="marquee">
      <div ref={trackRef} className="marquee__track" aria-hidden="true">
        {row}
        {row}
      </div>
    </div>
  );
}
