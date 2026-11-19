import { projects } from '../../data/projects';
import { site } from '../../data/site';
import { drawProjectCover } from './projectCover';

// Generated covers are drawn once (after the font has loaded) and shared by
// the 3D cards, the fallback grid and the project popup.
let pending = null;
const urls = new Map();

export function getCovers() {
  if (!pending) {
    const fontReady = document.fonts?.load
      ? Promise.all([
          document.fonts.load('700 84px "General Sans"'),
          document.fonts.load('500 34px "General Sans"'),
        ]).catch(() => {})
      : Promise.resolve();
    pending = fontReady.then(() => projects.map((p, i) => drawProjectCover(p, i, site.name)));
  }
  return pending;
}

export async function getCoverUrl(index) {
  if (urls.has(index)) return urls.get(index);
  const covers = await getCovers();
  const url = covers[index]?.toDataURL('image/jpeg', 0.88) ?? '';
  urls.set(index, url);
  return url;
}

// Resolves to the real poster if it exists, otherwise the generated cover.
export function resolvePoster(project, index) {
  return new Promise((resolve) => {
    if (!project.poster) return getCoverUrl(index).then(resolve);
    const img = new Image();
    img.onload = () => resolve(project.poster);
    img.onerror = () => getCoverUrl(index).then(resolve);
    img.src = project.poster;
  });
}
