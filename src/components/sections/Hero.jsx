import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { site } from '../../data/site';
import { createHeroArt } from '../three/heroArt';
import LiquidButton from '../ui/LiquidButton';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function Hero({ ready }) {
  const sectionRef = useRef(null);
  const mountRef = useRef(null);
  const copyRef = useRef(null);
  const sceneRef = useRef(null);
  const [webgl, setWebgl] = useState(null);
  const [fallbackArt, setFallbackArt] = useState('');
  const [mobile, setMobile] = useState(false);
  const firstName = site.name.split(' ')[0].toUpperCase();

  useEffect(() => setWebgl(hasWebGL()), []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // build the 3D glass scene
  useEffect(() => {
    if (webgl === null) return;
    let cancelled = false;
    let handle = null;
    // three.js + the glass scene download while the art is painted
    const scenePromise = webgl ? import('../three/heroScene').catch(() => null) : Promise.resolve(null);
    Promise.all([createHeroArt({ heroImage: site.heroImage, profileImage: site.profileImage }), scenePromise]).then(([canvas, mod]) => {
      if (cancelled) return;
      if (!webgl || !mod) {
        if (webgl) setWebgl(false); // chunk failed to load: show the flat picture instead
        setFallbackArt(canvas.toDataURL('image/jpeg', 0.85));
        mountRef.current?.setAttribute('data-scene-ready', '1');
        return;
      }
      handle = mod.createHeroScene({
        section: sectionRef.current,
        mount: mountRef.current,
        copy: copyRef.current,
        artCanvas: canvas,
      });
      sceneRef.current = handle;
    });
    return () => {
      cancelled = true;
      handle?.destroy();
      sceneRef.current = null;
    };
  }, [webgl]);

  // intro once the loader is gone: shards snap together, copy blurs in
  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.playIntro();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = copyRef.current?.querySelectorAll('[data-hero-item]');
    if (!items?.length) return;
    const tween = gsap.fromTo(
      items,
      { opacity: 0, y: 24, filter: 'blur(12px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.09, delay: 0.55, ease: 'power3.out' },
    );
    return () => tween.kill();
  }, [ready]);

  const fallback = webgl === false;

  return (
    <div id="hero" className="w-full flex flex-col overflow-hidden">
      <section ref={sectionRef} className="relative w-full h-[100svh] min-h-[640px] overflow-hidden" style={{ touchAction: 'pan-y' }}>
        {fallback && (
          <div
            className="absolute rounded-[28px] overflow-hidden border border-white/10"
            style={mobile
              ? { left: 'clamp(16px, 5%, 22px)', right: 'clamp(16px, 5%, 22px)', top: 'max(8.5%, 84px)', height: '50%' }
              : { left: '5.5%', right: '5.5%', top: 'max(8.5%, 96px)', bottom: '8.5%' }}
          >
            {fallbackArt && <img src={fallbackArt} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '69% center' }} />}
          </div>
        )}
        <div ref={mountRef} className="absolute inset-0 touch-pan-y" aria-hidden="true" />

        <div
          ref={copyRef}
          className="absolute flex items-center max-md:items-end will-change-transform pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto"
          style={fallback
            ? mobile
              ? { left: '4%', right: '4%', top: 'calc(max(8.5%, 84px) + 50% + 12px)', bottom: '3%' }
              : { left: '5.5%', right: '5.5%', top: 'max(8.5%, 96px)', bottom: '8.5%' }
            : { transformOrigin: '50% 50%' }}
        >
          <div className="pl-[6%] pr-6 max-w-[min(44rem,92%)] max-md:max-w-full max-md:px-3 max-md:pb-1 max-md:w-full max-md:rounded-3xl max-md:bg-gradient-to-t max-md:from-[#050507]/90 max-md:via-[#050507]/55 max-md:to-transparent max-md:pt-4">
            <div className="flex flex-col gap-2 sm:gap-3.5">
              <span data-hero-item className="text-brand font-bold uppercase text-[11px] sm:text-xs md:text-sm tracking-[0.25em]">
                {site.tagline}
              </span>
              <h1 data-hero-item className="text-white text-6xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-[0.88] uppercase drop-shadow-md">
                {firstName}
              </h1>
              <div data-hero-item className="flex flex-wrap items-center gap-2 sm:gap-3 text-white font-extrabold text-sm sm:text-base md:text-lg lg:text-xl uppercase tracking-wider mt-0.5">
                {site.roles.map((role, i) => (
                  <span key={role} className="flex items-center gap-2 sm:gap-3">
                    {i > 0 && <span className="text-brand font-bold">/</span>}
                    {role}
                  </span>
                ))}
              </div>
              <p data-hero-item className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg tracking-wide mt-1">{site.heroLine}</p>
              <div data-hero-item className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-6">
                <LiquidButton href="#projects">Explore My Work</LiquidButton>
                <a
                  href="#contact"
                  className="glass inline-flex items-center justify-center px-5 py-3 sm:px-7 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-200 hover:text-white"
                >
                  Get In Touch
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
