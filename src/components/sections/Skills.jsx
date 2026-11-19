import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { skills, techStack } from '../../data/skills';

gsap.registerPlugin(ScrollTrigger);

function TechStack() {
  return (
    <div className="relative w-full max-w-7xl mt-24 z-10 flex flex-col items-center">
      <div className="blue-halo" aria-hidden="true" />
      <span className="relative text-brand-deep font-bold uppercase text-sm md:text-base tracking-[0.2em] mb-4">Languages &amp; Tools</span>
      <h3 className="relative text-4xl md:text-6xl font-black tracking-tight uppercase text-white mb-12">My Tech Stack.</h3>
      <ul className="grid-blur relative flex flex-wrap justify-center gap-4 md:gap-6 list-none p-0 m-0">
        {techStack.map((t) => {
          const icon = t.icon;
          const color = t.color || (icon ? `#${icon.hex}` : '#7fb0ff');
          return (
            <li key={t.label} className="matrix-item glass glass-card group w-[132px] h-[190px] md:w-[148px] md:h-[216px] xl:w-[152px] xl:h-[224px] rounded-3xl flex flex-col items-center justify-center gap-5 px-2">
              {icon && (
                <svg viewBox="0 0 24 24" role="img" aria-label={t.label} className="shrink-0 w-14 h-14 md:w-16 md:h-16 transition-transform duration-300 group-hover:scale-110" style={{ fill: color, filter: `drop-shadow(0 0 10px ${color}55)` }}>
                  <path d={icon.path} />
                </svg>
              )}
              <span className="text-xs md:text-sm font-semibold text-gray-400 group-hover:text-gray-100 transition-colors text-center leading-tight">{t.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Skills() {
  const sectionRef = useRef(null);
  const headRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' } })
        .fromTo(headRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
        .fromTo('.matrix-item', { y: 25, x: -10, opacity: 0 }, { y: 0, x: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'back.out(1.4)' }, '-=0.2');
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="skills" ref={sectionRef} className="relative w-full text-gray-100 py-28 px-6 md:px-12 lg:px-20 flex flex-col items-center justify-center overflow-hidden border-t border-white/5">
      <div ref={headRef} className="flex flex-col items-center text-center mb-16 z-10">
        <span className="text-brand-deep font-bold uppercase text-sm md:text-base tracking-[0.2em] mb-2">What I Work With</span>
        <h2 className="text-5xl md:text-7xl font-black tracking-tight uppercase text-white">Technical Skills.</h2>
        <div className="w-20 h-1.5 bg-brand-deep mt-3 rounded-full shadow-[0_0_14px_rgba(47,123,255,0.6)]" />
      </div>
      <div className="relative w-full max-w-6xl z-10">
        <div className="blue-halo" aria-hidden="true" />
        <div className="grid-blur relative grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7">
          {skills.map((s) => (
            <div key={s.name} className="matrix-item glass glass-card group p-6 md:p-8 rounded-3xl flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-bold text-lg md:text-2xl text-gray-100 group-hover:text-brand transition-colors">{s.name}</h3>
                <span className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">{s.category}</span>
              </div>
              <span className="glass-chip text-xs md:text-sm font-black uppercase tracking-wider px-4 py-1.5 text-gray-200 shrink-0 group-hover:text-white rounded-full">{s.level}</span>
            </div>
          ))}
        </div>
      </div>
      <TechStack />
    </section>
  );
}
