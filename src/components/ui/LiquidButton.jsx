import { useRef } from 'react';

// Glossy "liquid glass" pill: a light blob follows the cursor across the
// surface, it squishes when pressed and a refraction streak sweeps over it.
export default function LiquidButton({ children, href, onClick, type = 'button', className = '' }) {
  const ref = useRef(null);

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
    className: `liquid-btn ${className}`,
  };
  const inner = (
    <>
      <span className="lb-blob" aria-hidden="true" />
      {children}
    </>
  );
  return href ? <a href={href} {...props}>{inner}</a> : <button type={type} {...props}>{inner}</button>;
}
