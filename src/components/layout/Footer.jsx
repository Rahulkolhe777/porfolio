import { site, navLinks } from '../../data/site';
import { Logo } from './Navbar';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-[#07080b]/90 backdrop-blur-xl py-12 px-6 md:px-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Logo className="text-2xl text-white" />
          <span className="text-[11px] uppercase tracking-[0.15em] text-gray-400 font-mono">{site.title}</span>
        </div>
        <div className="flex gap-3">
          {site.socials.map((s) => (
            <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" className="glass-chip px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-gray-200 hover:text-white">
              {s.label}
            </a>
          ))}
        </div>
        <div className="flex flex-col items-center md:items-end gap-3">
          <ul className="flex flex-wrap justify-center gap-5 text-xs font-bold uppercase tracking-[0.12em] text-gray-300">
            {navLinks.map((l) => <li key={l.href}><a href={l.href} className="hover:text-brand transition-colors">{l.label}</a></li>)}
          </ul>
          <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
