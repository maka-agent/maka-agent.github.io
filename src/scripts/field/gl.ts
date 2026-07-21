/* Minimal WebGL helpers shared by the execution-field renderer. */

export const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader allocation failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
  }
  return shader;
};

export const linkProgram = (
  gl: WebGLRenderingContext,
  vertex: string,
  fragment: string,
): WebGLProgram => {
  const program = gl.createProgram();
  if (!program) throw new Error("program allocation failed");
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
  }
  return program;
};

export const createStaticBuffer = (
  gl: WebGLRenderingContext,
  data: Float32Array,
): WebGLBuffer => {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("buffer allocation failed");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};

export const createDynamicBuffer = (
  gl: WebGLRenderingContext,
  data: Float32Array,
): WebGLBuffer => {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("buffer allocation failed");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  return buffer;
};

export const createIndexBuffer = (
  gl: WebGLRenderingContext,
  data: Uint16Array,
): WebGLBuffer => {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("buffer allocation failed");
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};

export const createCanvasTexture = (
  gl: WebGLRenderingContext,
  source: HTMLCanvasElement,
): WebGLTexture => {
  const texture = gl.createTexture();
  if (!texture) throw new Error("texture allocation failed");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};

/* ————— Small vector / matrix kit (column-major mat4) ————— */

export type Vec3 = [number, number, number];

export const vec3 = {
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  cross: (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  length: (a: Vec3): number => Math.hypot(a[0], a[1], a[2]),
  normalize: (a: Vec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

/** Rotate `v` around unit axis `axis` by `angle` (Rodrigues). */
export const rotateAround = (v: Vec3, axis: Vec3, angle: number): Vec3 => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cross = vec3.cross(axis, v);
  const dot = vec3.dot(axis, v) * (1 - cos);
  return [
    v[0] * cos + cross[0] * sin + axis[0] * dot,
    v[1] * cos + cross[1] * sin + axis[1] * dot,
    v[2] * cos + cross[2] * sin + axis[2] * dot,
  ];
};

/** model = translate · rotZ · rotY · rotX · uniformScale, column-major. */
export const composeModelMatrix = (
  tx: number,
  ty: number,
  tz: number,
  rx: number,
  ry: number,
  rz: number,
  scale: number,
): Float32Array => {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  /* R = Rz * Ry * Rx */
  const r00 = cz * cy;
  const r01 = cz * sy * sx - sz * cx;
  const r02 = cz * sy * cx + sz * sx;
  const r10 = sz * cy;
  const r11 = sz * sy * sx + cz * cx;
  const r12 = sz * sy * cx - cz * sx;
  const r20 = -sy;
  const r21 = cy * sx;
  const r22 = cy * cx;

  return new Float32Array([
    r00 * scale, r10 * scale, r20 * scale, 0,
    r01 * scale, r11 * scale, r21 * scale, 0,
    r02 * scale, r12 * scale, r22 * scale, 0,
    tx, ty, tz, 1,
  ]);
};

export const transformPoint = (m: Float32Array, p: Vec3): Vec3 => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];
