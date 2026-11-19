import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { stats } from '../../data/stats';

gsap.registerPlugin(ScrollTrigger);

export default function Stats() {
  const sectionRef = useRef(null);
  const panelRef = useRef(null);

  // counters roll up + bars grow when scrolled into view
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' },
      });
      tl.fromTo(panelRef.current, { y: 48, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' });
      gsap.utils.toArray('.stat-item').forEach((item, i) => {
        const num = item.querySelector('.stat-num');
        const fig = item.querySelector('.stat-fig');
        const bar = item.querySelector('.stat-bar');
        const label = item.querySelector('.stat-label');
        const value = Number(item.dataset.value);
        const counter = { v: 0 };
        const at = 0.3 + i * 0.18;
        num.textContent = '0';
        tl.fromTo(fig, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, at)
          .fromTo(counter, { v: 0 }, { v: value, duration: 2.2, ease: 'power3.out', onUpdate: () => { num.textContent = String(Math.round(counter.v)); } }, at)
          .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 2.2, ease: 'power3.out' }, at)
          .fromTo(label, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, at + 0.25);
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // spotlight + glowing rim that trail the cursor
  useEffect(() => {
    const section = sectionRef.current;
    const panel = panelRef.current;
    if (!section || !panel || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const target = { x: 0, y: 0, o: 0 };
    const cur = { x: 0, y: 0, o: 0 };
    let last = performance.now();
    let running = false;
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const kp = 1 - Math.exp(-9 * dt);
      const ko = 1 - Math.exp(-5.5 * dt);
      cur.x += (target.x - cur.x) * kp;
      cur.y += (target.y - cur.y) * kp;
      cur.o += (target.o - cur.o) * ko;
      panel.style.setProperty('--mx', `${cur.x.toFixed(1)}px`);
      panel.style.setProperty('--my', `${cur.y.toFixed(1)}px`);
      panel.style.setProperty('--lo', cur.o.toFixed(3));
      if (target.o === 0 && cur.o < 0.003) {
        panel.style.setProperty('--lo', '0');
        stop();
      }
    };
    const start = () => { if (!running) { running = true; last = performance.now(); gsap.ticker.add(tick); } };
    const stop = () => { if (running) { running = false; gsap.ticker.remove(tick); } };
    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      const r = panel.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      if (target.o === 0) { cur.x = target.x; cur.y = target.y; }
      target.o = 1;
      start();
    };
    const onLeave = () => { target.o = 0; };
    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerleave', onLeave);
    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      stop();
    };
  }, []);

  return (
    <section id="stats" ref={sectionRef} aria-labelledby="stats-heading" className="relative w-full text-gray-100 py-20 md:py-28 px-4 md:px-10 lg:px-16 overflow-hidden border-t border-white/5">
      <h2 id="stats-heading" className="sr-only">Results</h2>
      <div ref={panelRef} className="stat-panel glass glass-panel relative z-10 max-w-7xl mx-auto rounded-3xl overflow-hidden">
        <div className="stat-light" aria-hidden="true" />
        <div className="stat-rim" aria-hidden="true" />
        <dl className="relative z-10 m-0 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20">
          {stats.map((s) => (
            <div key={s.id} data-value={s.value} className="stat-item px-6 py-12 md:px-8 md:py-20 lg:px-10">
              <div className="stat-cq flex flex-col-reverse gap-6">
                <dt className="stat-label text-sm md:text-base font-semibold uppercase tracking-[0.16em] leading-snug text-gray-300">{s.label}</dt>
                <dd className="m-0">
                  <span className="sr-only">{s.value}{s.suffix}</span>
                  <div aria-hidden="true" className="stat-fig font-black uppercase text-white">
                    <span className="relative inline-block">
                      <span className="invisible">{s.value}</span>
                      <span className="stat-num absolute right-0 top-0">{s.value}</span>
                    </span>
                    <span className="stat-suffix">{s.suffix}</span>
                  </div>
                  <div className="stat-bar mt-6 w-12 h-1 bg-brand-deep rounded-full origin-left shadow-[0_0_12px_rgba(47,123,255,0.7)]" aria-hidden="true" />
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
