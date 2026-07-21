/*
 * All GLSL sources for the execution field.
 *
 * The daylight field is shared between the background pass and the glass
 * tube's transmission: both call the same `fieldColor` chunk so the
 * sculpture genuinely refracts the sky behind it. A pointer flow buffer
 * (see flow.ts) bends the light field around the reader's motion, and a
 * dark-theme palette mixes in via uNight.
 */

const NOISE_CHUNK = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 4; i++) {
    sum += valueNoise(p) * amp;
    p = p * 2.03 + vec2(17.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}
`;

/*
 * The scroll-and-theme-aware light field.
 *   uv       — 0..1 screen coordinate
 *   flowVel  — decoded pointer-flow velocity at uv
 *   flowDye  — pointer-flow energy at uv
 * Theme: 0 sky · 1 paper · 2 night (scroll). Night mode flips palettes.
 */
const FIELD_CHUNK = `
vec3 fieldColor(
  vec2 uv,
  float aspect,
  float time,
  float theme,
  float nightMode,
  vec2 flowVel,
  float flowDye
) {
  vec2 p = uv - 0.5;
  p.x *= aspect;

  /* The flow bends the light coordinates — water over the light. */
  vec2 lightP = p + flowVel * 0.22;

  /* Diagonal watercolor streaks: strongly slanted major layer × finer detail. */
  vec2 slant = vec2(lightP.x * 0.60 + lightP.y * 0.62, lightP.y * 1.28 - lightP.x * 0.30);
  float lightA = fbm(slant * 0.92 + vec2(time * 0.014, time * 0.007));
  float lightB = fbm(lightP * 2.1 - vec2(time * 0.010, time * 0.018) + 4.7);
  float patches = smoothstep(0.38, 0.90, lightA * 0.74 + lightB * 0.36);
  float halo = smoothstep(0.30, 1.05, lightA) * 0.5;

  /* Sky state */
  vec3 skyLight = mix(vec3(0.742, 0.836, 0.934), vec3(0.816, 0.887, 0.952), uv.y * 0.9);
  skyLight += vec3(0.215, 0.168, 0.098) * patches;
  skyLight += vec3(0.070, 0.056, 0.030) * halo;
  vec3 skyDark = mix(vec3(0.075, 0.105, 0.158), vec3(0.098, 0.135, 0.205), uv.y * 0.9);
  skyDark += vec3(0.075, 0.108, 0.170) * patches;
  skyDark += vec3(0.025, 0.040, 0.070) * halo;
  vec3 sky = mix(skyLight, skyDark, nightMode);

  /* Paper state */
  vec3 paperLight = vec3(0.980, 0.984, 0.992) + vec3(0.012, 0.010, 0.004) * patches;
  vec3 paperDark = vec3(0.063, 0.071, 0.086) + vec3(0.016, 0.024, 0.040) * patches;
  vec3 paper = mix(paperLight, paperDark, nightMode);

  /* Night state (the Runtime band — dark in both themes) */
  vec3 night = vec3(0.055, 0.063, 0.078);
  night += vec3(0.020, 0.032, 0.058) * patches * 0.8;
  float vignette = smoothstep(1.45, 0.35, length(p));
  night *= mix(0.82, 1.0, vignette);

  float toPaper = clamp(theme, 0.0, 1.0);
  float toNight = clamp(theme - 1.0, 0.0, 1.0);
  vec3 color = mix(mix(sky, paper, toPaper), night, toNight);

  /* Pointer-flow energy leaves a soft luminous wake. */
  vec3 wake = mix(vec3(0.055, 0.050, 0.032), vec3(0.05, 0.075, 0.125), max(toNight, nightMode));
  color += wake * flowDye;

  return color;
}
`;

export const BACKGROUND_VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const BACKGROUND_FRAGMENT = `
precision highp float;
uniform float uTime;
uniform float uAspect;
uniform float uTheme;
uniform float uNight;
uniform vec2 uPointer;
uniform sampler2D uFlow;
varying vec2 vUv;

${NOISE_CHUNK}
${FIELD_CHUNK}

void main() {
  vec4 flowSample = texture2D(uFlow, vUv);
  vec2 flowVel = (flowSample.rg - 0.5) * 2.0;
  float flowDye = flowSample.b;

  vec3 color = fieldColor(vUv, uAspect, uTime, uTheme, uNight, flowVel, flowDye);

  /* Soft glow directly under the pointer. */
  vec2 toPointer = (vUv - 0.5) * vec2(uAspect, 1.0) - uPointer * vec2(uAspect, 1.0) * 0.5;
  float pointerGlow = exp(-dot(toPointer, toPointer) * 7.0);
  color += mix(vec3(0.085, 0.070, 0.045), vec3(0.045, 0.065, 0.105), uNight) * pointerGlow;

  /* Fine grain to avoid banding. */
  color += (hash(vUv * vec2(1920.0, 1080.0) + fract(uTime)) - 0.5) * 0.012;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const PARTICLE_VERTEX = `
attribute vec2 aPosition;
attribute float aSize;
attribute float aShade;
uniform float uAspect;
uniform float uDpr;
varying float vShade;
void main() {
  vShade = aShade;
  gl_Position = vec4(aPosition.x / uAspect, aPosition.y, 0.0, 1.0);
  gl_PointSize = aSize * uDpr;
}
`;

export const PARTICLE_FRAGMENT = `
precision mediump float;
uniform float uTheme;
uniform float uNight;
uniform float uWarpFade;
varying float vShade;
void main() {
  vec2 offset = gl_PointCoord - 0.5;
  float disc = smoothstep(0.5, 0.18, length(offset));
  if (disc < 0.01) discard;

  float toPaper = clamp(uTheme, 0.0, 1.0);
  float dark = max(clamp(uTheme - 1.0, 0.0, 1.0), uNight);

  vec3 dayColor = mix(vec3(0.22, 0.42, 0.76), vec3(0.44, 0.62, 0.88), vShade);
  vec3 nightColor = mix(vec3(0.52, 0.68, 0.96), vec3(0.86, 0.92, 1.0), vShade);
  vec3 color = mix(dayColor, nightColor, dark);

  float dayAlpha = mix(0.20, 0.10, toPaper);
  float alpha = mix(dayAlpha, 0.5, dark) * disc * uWarpFade;
  gl_FragColor = vec4(color, alpha);
}
`;

/*
 * Runtime warp streaks: radial lines racing outward behind the Event Log,
 * the reference's hyperspace field in Maka's blue range.
 */
export const WARP_VERTEX = `
attribute vec2 aPosition;
attribute float aShade;
uniform float uAspect;
varying float vShade;
void main() {
  vShade = aShade;
  gl_Position = vec4(aPosition.x / uAspect, aPosition.y, 0.0, 1.0);
}
`;

export const WARP_FRAGMENT = `
precision mediump float;
uniform float uStrength;
varying float vShade;
void main() {
  vec3 cyan = vec3(0.42, 0.78, 0.96);
  vec3 blue = vec3(0.36, 0.55, 0.95);
  vec3 violet = vec3(0.66, 0.52, 0.96);
  vec3 color = mix(blue, cyan, smoothstep(0.2, 0.7, vShade));
  color = mix(color, violet, step(0.86, vShade));
  color = mix(color, vec3(1.0), step(0.965, vShade) * 0.8);
  float alpha = uStrength * (0.45 + vShade * 0.5);
  gl_FragColor = vec4(color, alpha);
}
`;

/*
 * The monogram tube: matcap pearl highlights over true transmission — the
 * fragment re-evaluates the light field behind it, refracted by the surface
 * normal and bent by the pointer flow, so the sculpture reads as glass in
 * the same weather as the page.
 */
export const TUBE_VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform float uAspect;
varying vec3 vNormal;
void main() {
  vec3 world = (uModel * vec4(aPosition, 1.0)).xyz;
  vNormal = normalize(mat3(uModel) * aNormal);
  gl_Position = vec4(world.x / uAspect, world.y, world.z * -0.08, 1.0);
}
`;

export const TUBE_FRAGMENT = `
precision highp float;
uniform sampler2D uMatcap;
uniform sampler2D uFlow;
uniform vec2 uResolution;
uniform float uAspect;
uniform float uTime;
uniform float uTheme;
uniform float uNight;
uniform float uOpacity;
varying vec3 vNormal;

${NOISE_CHUNK}
${FIELD_CHUNK}

void main() {
  vec3 normal = normalize(vNormal);
  /* Canvas textures upload top-row-first, so flip v to keep the painted
     key light above the sculpture. */
  vec2 matcapUv = vec2(normal.x, -normal.y) * 0.485 + 0.5;
  vec3 matcap = texture2D(uMatcap, matcapUv).rgb;

  /* Transmission: sample the field behind this fragment, refracted by the
     surface normal and stirred by the pointer flow. */
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  vec4 flowSample = texture2D(uFlow, screenUv);
  vec2 flowVel = (flowSample.rg - 0.5) * 2.0;
  vec2 refractedUv = screenUv + normal.xy * vec2(0.052, -0.052) + flowVel * 0.10;
  vec3 behind = fieldColor(refractedUv, uAspect, uTime, uTheme, uNight, flowVel, flowSample.b);

  /* Glass mix: transmissive in the body, pearl matcap toward grazing angles
     and highlights. */
  float facing = abs(normal.z);
  float fresnel = pow(1.0 - facing, 2.2);
  float transmission = 0.20 + 0.30 * facing;
  vec3 color = mix(matcap, behind, transmission);

  /* Let the painted highlights punch through the glass. */
  float sparkle = smoothstep(0.72, 0.98, dot(matcap, vec3(0.3333)));
  color += matcap * sparkle * 0.32;

  vec3 rimTint = mix(vec3(0.83, 0.90, 0.96), vec3(0.30, 0.42, 0.62), uNight);
  color = mix(color, rimTint, fresnel * 0.30);

  gl_FragColor = vec4(color, uOpacity);
}
`;

export const GLINT_VERTEX = `
attribute vec2 aPosition;
attribute float aSize;
attribute float aPulse;
uniform float uAspect;
uniform float uDpr;
varying float vPulse;
void main() {
  vPulse = aPulse;
  gl_Position = vec4(aPosition.x / uAspect, aPosition.y, -0.5, 1.0);
  gl_PointSize = aSize * uDpr;
}
`;

export const GLINT_FRAGMENT = `
precision mediump float;
uniform float uOpacity;
varying float vPulse;
void main() {
  vec2 offset = (gl_PointCoord - 0.5) * 2.0;
  float core = pow(max(0.0, 1.0 - length(offset)), 3.0);
  float rays = exp(-abs(offset.x) * 9.0) * exp(-abs(offset.y) * 1.6)
             + exp(-abs(offset.y) * 9.0) * exp(-abs(offset.x) * 1.6);
  float intensity = (core * 1.1 + rays * 0.5) * vPulse * uOpacity;
  gl_FragColor = vec4(vec3(1.0), intensity);
}
`;
