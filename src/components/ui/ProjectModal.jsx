import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import { projects } from '../../data/projects';
import { resolvePoster } from '../three/coverCache';

export default function ProjectModal({ project, onClose, onNavigate, onInquire }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const [poster, setPoster] = useState('');

  useEffect(() => {
    if (!project) return;
    setPoster('');
    let alive = true;
    resolvePoster(project, projects.findIndex((p) => p.id === project.id)).then((src) => alive && setPoster(src));
    return () => { alive = false; };
  }, [project]);

  useEffect(() => {
    if (!project) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate(1);
      if (e.key === 'ArrowLeft') onNavigate(-1);
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll('a[href], button:not([disabled])');
        if (!f.length) return;
        const first = f[0];
        const lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [project, onClose, onNavigate]);

  if (!project) return null;

  const linkClass = 'glass-chip inline-flex items-center gap-1.5 rounded-full px-4 py-3 text-xs font-bold text-gray-200 hover:text-white';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div onClick={onClose} className="fade-enter fixed inset-0 bg-black/55 backdrop-blur-2xl" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        className="modal-enter glass glass-strong relative z-10 flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl !border-[#2f7bff]/35 shadow-2xl shadow-blue-950/50"
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="glass-blue shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white">{project.category}</span>
            <h3 className="truncate text-base font-bold text-white">{project.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onNavigate(-1)} aria-label="Previous project" className="glass-chip rounded-full p-2 text-gray-100 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => onNavigate(1)} aria-label="Next project" className="glass-chip rounded-full p-2 text-gray-100 hover:text-white">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close project" className="glass-chip rounded-full p-2 text-gray-200 hover:bg-blue-600/60 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative flex aspect-video w-full items-center justify-center bg-black">
          {project.videoUrl ? (
            <video key={project.id} src={project.videoUrl} poster={poster || undefined} controls autoPlay playsInline className="h-full w-full object-contain" />
          ) : poster ? (
            <img key={project.id} src={poster} alt={`${project.title} preview`} draggable={false} className="h-full w-full object-cover" />
          ) : (
            <p className="px-6 text-center text-sm text-gray-300">Loading preview…</p>
          )}
        </div>

        <div className="flex flex-col items-start justify-between gap-4 overflow-y-auto border-t border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm leading-relaxed text-gray-100 sm:text-base">{project.description ?? `${project.title}, ${project.subtitle}`}</p>
            {project.tags?.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {project.tags.map((t) => <li key={t} className="glass-chip rounded-full px-3 py-1 text-xs font-medium text-gray-100">{t}</li>)}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                View Live <ExternalLink className="h-3.5 w-3.5 text-brand-soft" />
              </a>
            )}
            {project.codeUrl && (
              <a href={project.codeUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                View Code <ExternalLink className="h-3.5 w-3.5 text-brand-soft" />
              </a>
            )}
            <a href="#contact" onClick={onInquire} className="glass-blue rounded-full px-5 py-3 text-xs font-bold uppercase tracking-wider text-white">
              Discuss Project
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
