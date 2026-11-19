import { siReact, siJavascript, siPython, siFastapi, siPostgresql, siSupabase, siSqlite, siThreedotjs, siGsap } from 'simple-icons';

// Tech stack tiles: `icon` is a Simple Icons icon (https://simpleicons.org): import it above,
// `color` overrides the brand colour when the official one is too dark on black.
export const techStack = [
  { label: 'React', icon: siReact },
  { label: 'JavaScript', icon: siJavascript },
  { label: 'Python', icon: siPython, color: '#4B8BBE' },
  { label: 'FastAPI', icon: siFastapi, color: '#05A38F' },
  { label: 'PostgreSQL', icon: siPostgresql, color: '#6A93E8' },
  { label: 'Supabase', icon: siSupabase },
  { label: 'SQLite', icon: siSqlite, color: '#3A9AD9' },
  { label: 'Three.js', icon: siThreedotjs, color: '#FFFFFF' },
  { label: 'GSAP', icon: siGsap },
];

// Technical skills grid
export const skills = [
  { name: 'Full-Stack Development', category: 'React · JavaScript', level: 'Advanced' },
  { name: 'Backend APIs', category: 'Python · FastAPI', level: 'Advanced' },
  { name: 'Databases', category: 'PostgreSQL · Supabase · SQLite', level: 'Proficient' },
  { name: 'AI-Powered Applications', category: 'AI Integration', level: 'Proficient' },
  { name: 'Interactive 3D Web', category: 'Three.js · GSAP', level: 'Proficient' },
  { name: 'Software Engineering', category: 'Algorithms · Benchmarking', level: 'Proficient' },
];
