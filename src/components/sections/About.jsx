import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { site } from '../../data/site';
import HangingFrame from '../ui/HangingFrame';

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const textRef = useRef(null);
  const photoRef = useRef(null);
  const chipsRef = useRef(null);
  const [lead, ...rest] = site.about.paragraphs;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' } })
        .fromTo(titleRef.current, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' })
        .fromTo(textRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '-=0.5')
        .fromTo(photoRef.current, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.2)' }, '-=0.6')
        .fromTo(chipsRef.current?.children || [], { scale: 0.7, opacity: 0, y: 15 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'back.out(1.5)' }, '-=0.6');
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="about" ref={sectionRef} className="relative w-full text-gray-100 py-24 overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-5 md:px-12 relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-brand-deep font-bold uppercase text-sm md:text-base tracking-[0.2em]">{site.about.caption}</span>
            <h2 ref={titleRef} className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight uppercase text-white">About Me.</h2>
            <div className="w-24 h-1.5 bg-brand-deep rounded-full mt-2 shadow-[0_0_14px_rgba(47,123,255,0.6)]" />
          </div>
          <div className="relative">
            <div className="blue-halo" aria-hidden="true" />
            <div className="glass glass-panel relative rounded-3xl p-5 md:p-12 flex flex-col gap-5 md:gap-8">
              <div ref={textRef} className="flex flex-col gap-4 md:gap-5">
                <p className="text-gray-200 text-base md:text-2xl leading-relaxed font-medium">{lead}</p>
                {rest.map((p) => <p key={p} className="text-gray-400 text-base md:text-xl leading-relaxed">{p}</p>)}
              </div>
              <div>
                <h3 className="text-xs md:text-base font-bold uppercase tracking-wider text-gray-500 mb-3 md:mb-4">Technologies</h3>
                <div ref={chipsRef} className="flex flex-wrap gap-2 md:gap-3">
                  {site.about.technologies.map((t) => (
                    <span key={t} className="glass-chip px-3.5 py-1.5 text-xs md:px-5 md:py-2.5 md:text-lg font-bold text-gray-200 rounded-full cursor-default">{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs md:text-base font-bold uppercase tracking-wider text-gray-500 mb-3 md:mb-4">Areas of Focus</h3>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {site.about.focus.map((f) => (
                    <span key={f} className="px-3.5 py-1.5 text-xs md:px-4 md:py-2 md:text-base font-semibold text-blue-300 rounded-full ring-1 ring-blue-500/30 bg-blue-600/10">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 flex justify-center relative lg:sticky lg:top-28">
          <div ref={photoRef} className="flex flex-col items-center">
            <HangingFrame />
          </div>
        </div>
      </div>
    </section>
  );
}
