import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Buttery page scroll (Lenis) driven by GSAP's ticker so ScrollTrigger,
// the pinned project rail and the 3D scenes all move in the same frame.
// Other code can read the live scroll speed via getScrollVelocity().
let lenis = null;

export function getScrollVelocity() {
  return lenis ? lenis.velocity : 0;
}

export function initSmoothScroll() {
  if (lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  lenis = new Lenis({
    lerp: 0.09,
    wheelMultiplier: 1,
    anchors: { offset: 0 },
    // touch devices keep their native momentum scroll
    syncTouch: false,
  });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // The loader and project popup lock the page with body overflow:hidden;
  // pause Lenis whenever that happens so the wheel can't scroll behind them.
  const sync = () => {
    if (document.body.style.overflow === 'hidden') lenis.stop();
    else lenis.start();
  };
  sync();
  const mo = new MutationObserver(sync);
  mo.observe(document.body, { attributes: true, attributeFilter: ['style'] });

  return () => {
    mo.disconnect();
    gsap.ticker.remove(raf);
    lenis.destroy();
    lenis = null;
  };
}
