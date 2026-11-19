import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { site, navLinks } from '../../data/site';

export function Logo({ className = '' }) {
  const first = site.name.split(' ')[0].toUpperCase();
  return (
    <span className={`font-black tracking-tight uppercase ${className}`}>
      <span className="text-brand drop-shadow-[0_0_10px_rgba(47,123,255,0.85)]">{first[0]}</span>
      <span className="transition-colors duration-300 group-hover:text-brand">{first.slice(1)}.</span>
    </span>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-3 md:px-6 pt-3">
      <div className={`glass max-w-7xl mx-auto rounded-2xl px-5 md:px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? 'py-2.5 !bg-[#111216]/80' : 'py-3.5'}`}>
        <a href="#hero" className="text-white text-2xl group flex items-center">
          <Logo />
        </a>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="relative text-xs md:text-sm font-bold text-gray-400 uppercase tracking-[0.15em] transition-colors duration-300 hover:text-white group">
              {l.label}
              <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-brand transition-all duration-300 ease-out group-hover:w-full shadow-[0_0_8px_rgba(47,123,255,0.85)]" />
            </a>
          ))}
        </div>
        <a href="#contact" className="hidden sm:inline-block glass-blue px-5 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider">
          Let&apos;s Talk
        </a>
        <button className="md:hidden glass-chip rounded-full p-2 text-gray-200" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <ul className="md:hidden glass fade-enter mt-2 mx-auto max-w-7xl rounded-2xl p-5 flex flex-col gap-4 text-sm font-bold uppercase tracking-[0.15em] text-gray-300">
          {navLinks.map((l) => (
            <li key={l.href}><a href={l.href} onClick={() => setOpen(false)} className="hover:text-white">{l.label}</a></li>
          ))}
        </ul>
      )}
    </nav>
  );
}
