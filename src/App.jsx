import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Loader from './components/fx/Loader';
import Marquee from './components/fx/Marquee';
import { initSmoothScroll } from './lib/smoothScroll';
import SparkCursor from './components/fx/SparkCursor';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import Stats from './components/sections/Stats';
import About from './components/sections/About';
import Services from './components/sections/Services';
import Skills from './components/sections/Skills';
import Contact from './components/sections/Contact';
import { projects } from './data/projects';
import { site } from './data/site';

// three.js-heavy parts load as separate chunks in parallel with the loader
// screen, so the first paint only needs React + the page shell.
const refreshAfter = (m) => { requestAnimationFrame(() => ScrollTrigger.refresh()); return m; };
const ParticleField = lazy(() => import('./components/fx/ParticleField'));
const Projects = lazy(() => import('./components/sections/Projects').then(refreshAfter));
const ProjectModal = lazy(() => import('./components/ui/ProjectModal'));

const ProjectsPlaceholder = () => <section id="projects" className="relative w-full" style={{ height: '420vh' }} />;

export default function App() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  const onLoaded = useCallback(() => {
    setLoading(false);
    setTimeout(() => ScrollTrigger.refresh(), 100);
  }, []);
  const close = useCallback(() => setActive(null), []);
  const navigate = useCallback((dir) => {
    setActive((cur) => {
      if (!cur) return cur;
      const i = projects.findIndex((p) => p.id === cur.id);
      return projects[(i + dir + projects.length) % projects.length];
    });
  }, []);
  const inquire = useCallback(() => setActive(null), []);

  useEffect(() => initSmoothScroll(), []);

  return (
    <div className="relative isolate min-h-screen text-gray-100 flex flex-col font-sans bg-[#07080c]">
      <Suspense fallback={null}><ParticleField /></Suspense>
      <div className="ambient" aria-hidden="true"><i className="o1" /><i className="o3" /></div>
      <SparkCursor />
      {loading && <Loader onComplete={onLoaded} />}
      <Navbar />
      <main className="relative z-10 w-full flex-1">
        <Hero ready={!loading} />
        <Stats />
        <Marquee words={site.marquee[0]} tilt={-2} />
        <Suspense fallback={<ProjectsPlaceholder />}><Projects onSelect={setActive} /></Suspense>
        <About />
        <Services />
        <Marquee words={site.marquee[1]} reverse tilt={1.5} />
        <Skills />
        <Contact />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <ProjectModal project={active} onClose={close} onNavigate={navigate} onInquire={inquire} />
      </Suspense>
    </div>
  );
}
