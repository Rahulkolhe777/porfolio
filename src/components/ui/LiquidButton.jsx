import { useEffect, useRef, useState } from 'react';
import { theme } from '../../theme';

// Primary call-to-action button.
// With WebGL it becomes a glossy black liquid ("venom") blob whose sticky
// strands reach for the cursor (see fx/venomButton.js). Without WebGL, or with
// reduced motion, it falls back to the CSS liquid-glass pill.
export default function LiquidButton({ children, href, onClick, type = 'button', className = '' }) {
  const ref = useRef(null);
  const canvasRef = useRef(null);
  const [venom, setVenom] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let handle = null;
    let cancelled = false;
    import('../fx/venomButton').then(({ createVenom }) => {
      if (cancelled || !ref.current || !canvasRef.current) return;
      handle = createVenom(el, canvasRef.current, { color: theme.accent });
      if (!handle) return;
      handle.onFail(() => setVenom(false));
      setVenom(true);
    });
    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, []);

  const move = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--lx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--ly', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const press = (v) => () => ref.current?.style.setProperty('--press', v);

  const props = {
    ref,
    onClick,
    onPointerMove: move,
    onPointerDown: press(1),
    onPointerUp: press(0),
    onPointerLeave: press(0),
    className: `liquid-btn ${venom ? 'venom-on' : ''}`,
  };
  const inner = (
    <>
      <span className="lb-blob" aria-hidden="true" />
      {children}
    </>
  );
  return (
    <span className={`venom-wrap ${className}`}>
      <canvas ref={canvasRef} className="venom-canvas" aria-hidden="true" style={venom ? undefined : { display: 'none' }} />
      {href ? <a href={href} {...props}>{inner}</a> : <button type={type} {...props}>{inner}</button>}
    </span>
  );
}
