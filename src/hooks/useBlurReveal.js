import { useEffect } from 'react';
import gsap from 'gsap';

// Elements matching `selector` inside `ref` fade + un-blur + rise into view
// whenever they enter the viewport, and blur back out when they leave.
export default function useBlurReveal(ref, selector, enabled = true) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;

    const els = Array.from(root.querySelectorAll(selector));
    const ctx = gsap.context(() => gsap.set(els, { opacity: 0, y: 20, filter: 'blur(12px)' }), root);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          const show = entry.isIntersecting;
          if (el.dataset.revealVisible === String(show)) return;
          el.dataset.revealVisible = String(show);
          gsap.to(el, {
            opacity: show ? 1 : 0,
            y: show ? 0 : 20,
            filter: show ? 'blur(0px)' : 'blur(12px)',
            duration: show ? 0.8 : 0.65,
            delay: show ? Math.min((els.indexOf(el) % 5) * 0.055, 0.22) : 0,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        });
      },
      { threshold: 0, rootMargin: '-4% 0px -4% 0px' },
    );
    els.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      gsap.killTweensOf(els);
      ctx.revert();
      els.forEach((el) => delete el.dataset.revealVisible);
    };
  }, [ref, selector, enabled]);
}
