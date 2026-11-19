import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { services } from '../../data/services';

gsap.registerPlugin(ScrollTrigger);

export default function Services() {
  const sectionRef = useRef(null);
  const headRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' } })
        .fromTo(headRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
        .fromTo('.service-item', { y: 25, x: -10, opacity: 0 }, { y: 0, x: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(1.4)' }, '-=0.2');
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="services" ref={sectionRef} className="relative w-full text-gray-100 py-20 px-6 md:px-16 lg:px-24 flex flex-col items-center justify-center overflow-hidden border-t border-white/5">
      <div ref={headRef} className="flex flex-col items-center text-center mb-12 z-10">
        <span className="text-brand-deep font-bold uppercase text-[10px] md:text-xs tracking-[0.2em] mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" aria-hidden="true" /> What I Do
        </span>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase text-white">Services &amp; Pricing.</h2>
        <div className="w-12 h-1 bg-brand-deep mt-2 rounded-full shadow-[0_0_12px_rgba(47,123,255,0.6)]" />
      </div>

      <ul className="grid-blur relative list-none p-0 m-0 w-full max-w-4xl grid grid-cols-2 gap-3 md:flex md:flex-col md:gap-4 z-10">
        {services.map((s, i) => (
          <li key={s.id} className="service-item">
            <a href="#contact" className="glass glass-card group relative flex h-full flex-col items-start gap-3 p-4 md:flex-row md:items-center md:gap-6 md:p-5 rounded-3xl outline-none">
              <span className="glass-chip shrink-0 w-7 h-7 md:w-11 md:h-11 rounded-full flex items-center justify-center text-[10px] md:text-sm font-black tabular-nums text-gray-200 group-hover:text-white">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm md:text-xl text-gray-100 group-hover:text-brand transition-colors">{s.title}</h3>
                  {s.featured && (
                    <span className="glass-blue inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white">Specialty</span>
                  )}
                </div>
                <div className="md:text-right shrink-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{s.priceLabel}</span>
                  <span className="glass-chip inline-block text-xs md:text-base font-black tabular-nums px-3 py-1 md:px-3.5 rounded-full text-gray-100 group-hover:text-white">{s.price}</span>
                </div>
              </div>
              <span
                aria-hidden="true"
                className="glass-chip shrink-0 absolute right-3 top-3 w-8 h-8 md:static md:w-11 md:h-11 rounded-full flex items-center justify-center text-gray-300 group-hover:[background-image:linear-gradient(145deg,rgba(47,123,255,0.65),rgba(29,78,216,0.5))] group-hover:border-[rgba(130,170,255,0.45)] group-hover:text-white"
              >
                <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-8 w-full max-w-4xl text-center text-[11px] md:text-xs text-gray-500 leading-relaxed z-10">
        *Final pricing depends on features, complexity, timeline and project scope.
      </p>
    </section>
  );
}
