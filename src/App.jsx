import { useCallback, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Loader from './components/fx/Loader';
import ParticleField from './components/fx/ParticleField';
import SparkCursor from './components/fx/SparkCursor';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import Stats from './components/sections/Stats';
import Projects from './components/sections/Projects';
import About from './components/sections/About';
import Services from './components/sections/Services';
import Skills from './components/sections/Skills';
import Contact from './components/sections/Contact';
import ProjectModal from './components/ui/ProjectModal';
import { projects } from './data/projects';

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

  return (
    <div className="relative isolate min-h-screen text-gray-100 flex flex-col font-sans bg-[#07080c]">
      <ParticleField />
      <div className="ambient" aria-hidden="true"><i className="o1" /><i className="o3" /></div>
      <SparkCursor />
      {loading && <Loader onComplete={onLoaded} />}
      <Navbar />
      <main className="relative z-10 w-full flex-1">
        <Hero ready={!loading} />
        <Stats />
        <Projects onSelect={setActive} />
        <About />
        <Services />
        <Skills />
        <Contact />
      </main>
      <Footer />
      <ProjectModal project={active} onClose={close} onNavigate={navigate} onInquire={inquire} />
    </div>
  );
}
