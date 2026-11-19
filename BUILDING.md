# Building the Portfolio Website

How the site was reverse-engineered, how it's structured, and what's left to do.

> **Reference:** `aswin-dev-portfolio.vercel.app` (red theme)
> **Our version:** same structure and the same kinds of effects, **blue theme**, our own content.

---

## 1. How the reference site was analysed

The reference is a client-rendered React SPA, so the analysis came from its built JS/CSS bundles plus
headless-Chrome screenshots taken at every scroll position (loader frames, hover, scroll states).

| Effect on the reference | How it works | Our file |
|---|---|---|
| Glitch loader (rolling 00→100 digits, statement fades in, slices apart) | React + CSS `clip-path` fragments, `loader-veil` keyframes | `fx/Loader.jsx` + `index.css` |
| Glowing particle field over the whole page | Three.js `Points` + custom shader; particles fly forward on scroll, lean to the cursor, get pushed by a shock-wave on click | `fx/ParticleField.jsx` |
| Electric cursor trail | 2D canvas: tail, sparks, lightning forks | `fx/SparkCursor.jsx` |
| Hero: shattered glass panels over the artwork | Three.js extruded, bevelled `MeshPhysicalMaterial` shards (clearcoat + iridescence) using the art as emissive map; tilt to mouse, hover light, drag with springs, burst apart on scroll | `three/heroScene.js` |
| Hero artwork | Reference uses a photo; ours is generated (blue smoke nebula + your photo blended in) | `three/heroArt.js` |
| Liquid glass button | Reference: custom WebGL; ours: CSS glass with cursor-following light blob, press squish, refraction sweep | `ui/LiquidButton.jsx` |
| Stats panel light that follows the mouse | CSS radial gradients driven by `--mx/--my` vars + GSAP counters | `sections/Stats.jsx` |
| Projects: cards fly along a 3D rail then into a grid | Pinned 420vh section, Three.js planes on a Catmull-Rom curve, shader with rounded corners + rim | `sections/Projects.jsx` |
| Project covers | Reference uses screenshots; ours are drawn in code until you add screenshots | `three/projectCover.js` |
| Hanging photo frame that swings | Pendulum physics, mouse "breeze", drag to swing | `ui/HangingFrame.jsx` |
| Glass cards, blur-in reveals, staggered entrances | CSS glass system + GSAP ScrollTrigger timelines | `index.css`, each section |

---

## 2. Tech stack

React 18 + Vite 6 · Tailwind CSS 4 · Three.js · GSAP + ScrollTrigger · Lenis (smooth scroll) · lucide-react (UI icons) · simple-icons (tech logos) · General Sans font.
No backend: the contact form opens the visitor's email app with the message pre-filled.

---

## 3. Page order

Loader → Navbar → Hero `#hero` → Stats `#stats` → Projects `#projects` → About `#about` → Services `#services` → Skills + Tech Stack `#skills` → Contact `#contact` → Footer, plus the project popup.

---

## 4. Folder structure

```
src/
├── App.jsx                 ← loader, background effects, sections in order
├── index.css               ← THEME COLOURS + glass system + loader/frame/button styles
├── theme.js                ← colours used by the WebGL/canvas effects
├── data/                   ← ✏️ ALL CONTENT LIVES HERE
│   ├── site.js             ← name, tagline, bio, contact, socials, loader line, images
│   ├── projects.js         ← project cards
│   ├── services.js         ← services & prices
│   ├── skills.js           ← skills + tech stack logos
│   └── stats.js            ← counter numbers
├── hooks/useBlurReveal.js  ← blur-in on scroll
└── components/
    ├── fx/                 ← Loader, ParticleField, SparkCursor
    ├── three/              ← heroScene, heroArt, projectCover, coverCache
    ├── layout/             ← Navbar (+ Logo), Footer
    ├── sections/           ← Hero, Stats, Projects, About, Services, Skills, Contact
    └── ui/                 ← LiquidButton, HangingFrame, ProjectModal
```

**Rule of thumb:** content → `src/data/`. Colours → top of `src/index.css` and `src/theme.js`. Layout/effects → `src/components/`.

---

## 5. Colour theme (blue)

| Token | Value | Used for |
|---|---|---|
| `--color-brand` | `#2f7bff` | logo letter, hero eyebrow, glows |
| `--color-brand-deep` | `#2563eb` | section eyebrows + underline bars |
| `--color-brand-soft` | `#7fb0ff` | small coloured text |
| `--color-brand-btn` | `#1f6bff` | solid buttons |
| `--glow` | `30 110 255` | glass glows |
| `theme.js` | particle / shard / spark colours | WebGL + canvas effects |

---

## 6. Build log

- [x] Analyse the reference (bundles + screenshots)
- [x] Rebuild every effect in blue (table in section 1)
- [x] Compare against the reference in headless Chrome at every scroll position, desktop and mobile
- [x] Production build passes (`npm run build`, ~890 kB JS)
- [x] Upgrade pass: living hero smoke (flows + parallax behind the glass, core moved off the seam),
      faster loading (three.js lazy-loaded, first load ~360 kB JS instead of ~870 kB; effects pause in
      background tabs and run lighter on weak devices), Lenis smooth scroll, two scroll-reactive text
      marquees (words in `site.js` → `marquee`)
- [ ] Replace the placeholder content with your real details (checklist below)
- [ ] Deploy to Vercel

---

## 7. What I need from you

Everything below is currently **placeholder data**:

- [ ] **Name** (currently "Alex Carter") → `src/data/site.js`
- [ ] **Profile photo** → `public/media/profile.webp` (portrait, ~4:5). It appears in the hanging frame and is blended into the hero artwork automatically.
- [ ] *(optional)* **Full hero artwork** → set `heroImage` in `site.js` (16:9, you standing ~69% across)
- [ ] **Tagline, roles, loader line**
- [ ] **About me** paragraphs + technologies + focus areas
- [ ] **Projects**: title, subtitle, category, description, tags, live/GitHub links, and ideally a 16:9 screenshot in `public/assets/thumbnails/`
- [ ] **Services & prices** (or tell me to remove pricing)
- [ ] **Stats numbers**
- [ ] **Contact**: email, phone, WhatsApp number; **GitHub + LinkedIn URLs**
- [ ] Browser tab **title** → `index.html`

---

## 8. Commands

```bash
npm install        # first time only
npm run dev        # http://localhost:5173 while developing
npm run build      # production build into /dist
npm run preview    # preview the production build
```

**Deploy (Vercel):** push to GitHub → import the repo on vercel.com → framework "Vite" → Deploy.
