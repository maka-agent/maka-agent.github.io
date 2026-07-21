/* All GLSL sources for the execution field. */

export const BACKGROUND_VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/*
 * Daylight field. Theme is a scroll-driven float:
 *   0 = sky (hero) · 1 = paper (proof) · 2 = night (runtime).
 * Two drifting fbm layers multiply into watercolor light patches;
 * the pointer adds a local glow and a short velocity streak.
 */
export const BACKGROUND_FRAGMENT = `
precision highp float;
uniform float uTime;
uniform float uAspect;
uniform float uTheme;
uniform vec2 uPointer;
uniform vec2 uVelocity;
varying vec2 vUv;

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

void main() {
  vec2 p = vUv - 0.5;
  p.x *= uAspect;

  /* Watercolor light: a large diagonal-leaning layer times a finer one. */
  vec2 slant = vec2(p.x * 0.82 + p.y * 0.34, p.y * 0.9 - p.x * 0.18);
  float lightA = fbm(slant * 1.05 + vec2(uTime * 0.014, uTime * 0.007));
  float lightB = fbm(p * 2.1 - vec2(uTime * 0.010, uTime * 0.018) + 4.7);
  float patches = smoothstep(0.40, 0.92, lightA * 0.72 + lightB * 0.38);
  float halo = smoothstep(0.30, 1.05, lightA) * 0.5;

  /* Pointer: a soft local brightening plus a short velocity streak. */
  vec2 toPointer = p - uPointer * vec2(uAspect, 1.0) * 0.5;
  float pointerGlow = exp(-dot(toPointer, toPointer) * 7.0);
  float speed = min(1.0, length(uVelocity) * 0.6);
  vec2 dir = normalize(uVelocity + vec2(0.0001));
  float along = dot(toPointer, dir);
  float across = dot(toPointer, vec2(-dir.y, dir.x));
  float streak = exp(-across * across * 60.0) * exp(-abs(along + 0.18) * 4.5) * speed;

  /* Sky state */
  vec3 skyTop = vec3(0.742, 0.836, 0.934);
  vec3 skyBottom = vec3(0.816, 0.887, 0.952);
  vec3 sky = mix(skyTop, skyBottom, vUv.y * 0.9);
  sky += vec3(0.215, 0.168, 0.098) * patches;
  sky += vec3(0.070, 0.056, 0.030) * halo;
  sky += vec3(0.10, 0.08, 0.05) * pointerGlow;
  sky += vec3(0.09, 0.10, 0.11) * streak;

  /* Paper state */
  vec3 paper = vec3(0.980, 0.984, 0.992);
  paper += vec3(0.012, 0.010, 0.004) * patches;

  /* Night state */
  vec3 night = vec3(0.055, 0.063, 0.078);
  night += vec3(0.020, 0.032, 0.058) * patches * 0.8;
  night += vec3(0.05, 0.07, 0.11) * pointerGlow * 0.7;
  float vignette = smoothstep(1.45, 0.35, length(p));
  night *= mix(0.82, 1.0, vignette);

  float toPaper = clamp(uTheme, 0.0, 1.0);
  float toNight = clamp(uTheme - 1.0, 0.0, 1.0);
  vec3 color = mix(mix(sky, paper, toPaper), night, toNight);

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
varying float vShade;
void main() {
  vec2 offset = gl_PointCoord - 0.5;
  float disc = smoothstep(0.5, 0.18, length(offset));
  if (disc < 0.01) discard;

  float toPaper = clamp(uTheme, 0.0, 1.0);
  float toNight = clamp(uTheme - 1.0, 0.0, 1.0);

  vec3 dayColor = mix(vec3(0.22, 0.42, 0.76), vec3(0.44, 0.62, 0.88), vShade);
  vec3 nightColor = mix(vec3(0.52, 0.68, 0.96), vec3(0.86, 0.92, 1.0), vShade);
  vec3 color = mix(dayColor, nightColor, toNight);

  float dayAlpha = mix(0.20, 0.10, toPaper);
  float alpha = mix(dayAlpha, 0.55, toNight) * disc;
  gl_FragColor = vec4(color, alpha);
}
`;

/*
 * The monogram tube is shaded with a matcap: view-space normals index a
 * pre-painted sphere texture, which gives the soft pearl-chrome look
 * without lights or an environment map. A fresnel term melts the rim
 * into the sky so the sculpture belongs to the field.
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
precision mediump float;
uniform sampler2D uMatcap;
uniform float uOpacity;
varying vec3 vNormal;
void main() {
  vec3 normal = normalize(vNormal);
  /* Canvas textures upload top-row-first, so flip v to keep the painted
     key light above the sculpture. */
  vec2 uv = vec2(normal.x, -normal.y) * 0.485 + 0.5;
  vec3 color = texture2D(uMatcap, uv).rgb;
  float fresnel = pow(1.0 - abs(normal.z), 2.2);
  color = mix(color, vec3(0.83, 0.90, 0.96), fresnel * 0.38);
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
  gl_FragColor = vec4(vec3(1.0, 1.0, 1.0), intensity);
}
`;
