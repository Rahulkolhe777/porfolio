import { useEffect, useRef, useState } from 'react';
import { site } from '../../data/site';

// Intro screen: a rolling 00→100 counter while assets load, the statement
// fades in word by word, then everything glitches apart to reveal the site.
const STATEMENT = site.loaderStatement;
const WORDS = STATEMENT.split(' ');
const ACCENT = new Set(site.loaderAccentWords);
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const PRELOAD = [site.profileImage, site.heroImage].filter(Boolean);
const MAX_WAIT = 7000;

function trackLoading(onProgress) {
  const total = PRELOAD.length + 3;
  let done = 0;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    done += 1;
    onProgress(Math.min(1, done / total));
  };
  PRELOAD.forEach((src) => {
    const img = new Image();
    img.onload = img.onerror = tick;
    img.src = src;
  });
  (document.fonts?.ready ?? Promise.resolve()).then(tick, tick);
  if (document.readyState === 'complete') tick();
  else window.addEventListener('load', tick, { once: true });
  // wait for the hero WebGL scene to draw its first frame
  let tries = 0;
  const waitScene = () => {
    if (stopped) return;
    if (document.querySelector('[data-scene-ready]') || tries > 60) tick();
    else { tries += 1; setTimeout(waitScene, 100); }
  };
  waitScene();
  return () => { stopped = true; window.removeEventListener('load', tick); };
}

export default function Loader({ onComplete }) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState('loading');
  const target = useRef(0);
  const shown = useRef(0);
  const tensRef = useRef(null);
  const onesRef = useRef(null);
  const done = useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const stop = trackLoading((p) => { target.current = p; });
    const fallback = setTimeout(() => { target.current = 1; }, MAX_WAIT);
    const timers = [];
    let raf = 0;
    let last = performance.now();

    const frame = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      const goal = target.current * 100;
      const next = Math.min(goal, shown.current + Math.max(0.15, (goal - shown.current) * 0.006 * dt));
      shown.current = next;
      setCount(Math.floor(next));
      if (tensRef.current) tensRef.current.style.transform = `translateY(${-(next / 10)}em)`;
      if (onesRef.current) onesRef.current.style.transform = `translateY(${-(9 - (next % 10))}em)`;
      if (next >= 99.999) {
        setCount(100);
        timers.push(setTimeout(() => setPhase('reveal'), 500));
        timers.push(setTimeout(() => { document.body.style.overflow = ''; done.current(); }, 1500));
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      stop();
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      timers.forEach(clearTimeout);
      document.body.style.overflow = '';
    };
  }, []);

  const progress = count / 100;

  return (
    <div
      className={`glitch-loader ${phase === 'reveal' ? 'is-revealing' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={count}
      aria-label={STATEMENT}
    >
      <div className="glitch-loader__veil" />
      <div className="glitch-loader__count" aria-hidden="true">
        {count >= 100 ? (
          <span>100</span>
        ) : (
          <>
            <span className="glitch-loader__digit">
              <span ref={tensRef} className="glitch-loader__digit-strip">
                {DIGITS.map((d) => <span key={d}>{d}</span>)}
              </span>
            </span>
            <span className="glitch-loader__digit">
              <span ref={onesRef} className="glitch-loader__digit-strip">
                {[...DIGITS].reverse().map((d) => <span key={d}>{d}</span>)}
              </span>
            </span>
          </>
        )}
      </div>
      <div className="glitch-loader__center">
        <p className="glitch-loader__statement" style={{ filter: `blur(${(1 - progress) * 6}px)` }} aria-hidden="true">
          {WORDS.map((word, i) => {
            const start = i / WORDS.length;
            const opacity = Math.max(0, Math.min(1, (progress - start * 0.7) * 3));
            return (
              <span key={i} className={`glitch-loader__word${ACCENT.has(word) ? ' glitch-loader__word--accent' : ''}`} style={{ opacity }}>
                {word}
              </span>
            );
          })}
        </p>
        {[0, 1, 2, 3, 4].map((i) => (
          <p key={i} className={`glitch-loader__frag glitch-loader__frag--${i}`} aria-hidden="true">{STATEMENT}</p>
        ))}
      </div>
    </div>
  );
}
