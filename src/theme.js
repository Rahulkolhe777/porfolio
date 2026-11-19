// Colours used by the WebGL / canvas effects (keep in sync with src/index.css).
export const theme = {
  accent: '#2f7bff',
  accentSoft: '#7fb0ff',
  glassReflection: '#11308b', // tint of the hero glass shards
  glassHighlight: '#4a7ad9',  // specular colour of the shards
  // particles: dim core colour -> bright colour (0–1 RGB, used in the shader)
  particleDim: [0.03, 0.22, 0.85],
  particleBright: [0.45, 0.72, 1.0],
  // spark cursor (r,g,b strings)
  sparkCore: '60,140,255',
  sparkDeep: '10,60,200',
  sparkGlow: 'rgba(30,110,255,0.35)',
};
