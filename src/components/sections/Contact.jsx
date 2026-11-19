import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mail, Phone, Send } from 'lucide-react';
import { siWhatsapp } from 'simple-icons';
import { site } from '../../data/site';
import LiquidButton from '../ui/LiquidButton';

gsap.registerPlugin(ScrollTrigger);

const inputClass = 'glass-input w-full rounded-2xl px-6 py-5 text-lg text-white placeholder:text-gray-500';
const labelClass = 'text-sm md:text-base font-bold uppercase tracking-wider text-gray-400';

export default function Contact() {
  const sectionRef = useRef(null);
  const headRef = useRef(null);
  const cardsRef = useRef(null);
  const formRef = useRef(null);
  const [sent, setSent] = useState(false);
  const { email, phone, whatsapp } = site.contact;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' } })
        .fromTo(headRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
        .fromTo(cardsRef.current?.children || [], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, '-=0.3')
        .fromTo(formRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.4)' }, '-=0.3');
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // No backend needed: opens the visitor's email app with the message pre-filled.
  const onSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const subject = encodeURIComponent(`Project Inquiry from ${f.get('name')}`);
    const body = encodeURIComponent(`Name: ${f.get('name')}\nEmail: ${f.get('email')}\n\nMessage:\n${f.get('message')}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <section id="contact" ref={sectionRef} className="relative w-full text-gray-100 py-28 px-6 md:px-16 lg:px-24 flex flex-col items-center justify-center overflow-hidden border-t border-white/5">
      <div ref={headRef} className="flex flex-col items-center text-center mb-14 z-10">
        <span className="text-brand-deep font-bold uppercase text-sm md:text-base tracking-[0.2em] mb-2">Get In Touch</span>
        <h2 className="text-5xl md:text-7xl font-black tracking-tight uppercase text-white">Contact.</h2>
        <div className="w-20 h-1.5 bg-brand-deep mt-3 rounded-full shadow-[0_0_14px_rgba(47,123,255,0.6)]" />
      </div>

      <div className="relative w-full max-w-4xl z-10">
        <div ref={cardsRef}>
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Chat with ${site.name} on WhatsApp`}
            className="whatsapp-card glass mb-8 flex items-center gap-4 rounded-3xl px-6 py-5 md:px-8 relative z-10"
          >
            <span className="whatsapp-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d={siWhatsapp.path} /></svg>
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">WhatsApp</span>
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-gray-100">{phone}</span>
            </span>
            <span className="whatsapp-cta ml-auto hidden shrink-0 text-xs font-bold uppercase tracking-wider sm:block">Chat now →</span>
          </a>
          <a href={`tel:${phone}`} className="glass mb-8 flex items-center gap-4 rounded-3xl px-6 py-5 md:px-8 relative z-10">
            <span className="glass-chip grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-brand">
              <Phone className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Call</span>
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-gray-100">{phone}</span>
            </span>
          </a>
        </div>

        <div className="blue-halo" style={{ inset: '-14% -10%' }} aria-hidden="true" />
        <div ref={formRef} className="glass glass-panel w-full p-8 md:p-14 rounded-3xl relative z-10">
          {sent ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="glass-blue w-16 h-16 text-white rounded-full flex items-center justify-center text-3xl font-black mb-4 animate-bounce">✓</div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-white mb-3">Message Ready!</h3>
              <p className="text-lg text-gray-300 font-medium max-w-md">Thanks for reaching out! Your email app has been opened with the project details pre-filled.</p>
              <button type="button" onClick={() => setSent(false)} className="mt-6 glass-chip rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider">Send another</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-7">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 shrink-0 rounded-full glass-chip flex items-center justify-center text-brand"><Mail size={18} aria-hidden="true" /></span>
                  <span className="min-w-0">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">Direct Inquiries</span>
                    <a href={`mailto:${email}`} className="text-white font-bold break-all">{email}</a>
                  </span>
                </div>
                <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Open To New Projects
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <label className="flex flex-col gap-3">
                  <span className={labelClass}>Your Name</span>
                  <input name="name" required placeholder="Your Name" className={inputClass} />
                </label>
                <label className="flex flex-col gap-3">
                  <span className={labelClass}>Your Email</span>
                  <input name="email" type="email" required placeholder="your.email@example.com" className={inputClass} />
                </label>
              </div>
              <label className="flex flex-col gap-3">
                <span className={labelClass}>Message &amp; Project Scope</span>
                <textarea name="message" required rows={5} placeholder="Tell me about your idea, timeline and what you need built..." className={`${inputClass} resize-none`} />
              </label>
              <div className="flex justify-center pt-2">
                <LiquidButton type="submit">Send Message <Send className="w-4 h-4" aria-hidden="true" /></LiquidButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
