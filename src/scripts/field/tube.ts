/*
 * The hero sculpture: one continuous pearl-chrome tube writing a cursive
 * lowercase "m" — the Maka monogram. Built as a Catmull-Rom centerline
 * swept with parallel-transport frames, shaded by a procedurally painted
 * matcap. No 3D library involved.
 */

import { rotateAround, vec3, type Vec3 } from "./gl";

/*
 * Centerline of a cursive "m": entry swash, three humps, exit swash.
 * Gentle z variation keeps the ribbon from reading as a flat cutout.
 */
const MONOGRAM_POINTS: Vec3[] = [
  [-2.95, -0.55, 0.30],
  [-2.45, -0.72, 0.42],
  [-1.98, -0.30, 0.30],
  [-1.72, 0.45, 0.10],
  [-1.55, 0.98, -0.06],
  [-1.28, 1.12, -0.14],
  [-1.02, 0.86, -0.10],
  [-0.88, 0.32, 0.02],
  [-0.80, -0.42, 0.14],
  [-0.76, -0.72, 0.18],
  [-0.68, -0.44, 0.10],
  [-0.48, 0.42, -0.04],
  [-0.26, 0.98, -0.14],
  [0.02, 1.10, -0.18],
  [0.28, 0.82, -0.10],
  [0.42, 0.28, 0.02],
  [0.50, -0.44, 0.16],
  [0.54, -0.72, 0.20],
  [0.62, -0.42, 0.12],
  [0.82, 0.44, -0.02],
  [1.04, 1.00, -0.12],
  [1.32, 1.12, -0.16],
  [1.58, 0.84, -0.08],
  [1.72, 0.30, 0.04],
  [1.80, -0.44, 0.18],
  [1.90, -0.72, 0.26],
  [2.18, -0.74, 0.34],
  [2.55, -0.50, 0.38],
  [2.85, -0.12, 0.30],
];

const catmullRom = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 => {
  const t2 = t * t;
  const t3 = t2 * t;
  const out: Vec3 = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    out[axis] = 0.5 * (
      2 * p1[axis]
      + (-p0[axis] + p2[axis]) * t
      + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2
      + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3
    );
  }
  return out;
};

const sampleCenterline = (points: Vec3[], samples: number): Vec3[] => {
  const result: Vec3[] = [];
  const segments = points.length - 1;
  for (let i = 0; i < samples; i += 1) {
    const global = (i / (samples - 1)) * segments;
    const segment = Math.min(segments - 1, Math.floor(global));
    const t = global - segment;
    const p0 = points[Math.max(0, segment - 1)];
    const p1 = points[segment];
    const p2 = points[segment + 1];
    const p3 = points[Math.min(points.length - 1, segment + 2)];
    result.push(catmullRom(p0, p1, p2, p3, t));
  }
  return result;
};

export interface TubeGeometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  /** A few centerline points for placing glints, in model space. */
  glintAnchors: Vec3[];
}

export const buildMonogramTube = (
  radius = 0.30,
  tubularSegments = 220,
  radialSegments = 22,
): TubeGeometry => {
  const centers = sampleCenterline(MONOGRAM_POINTS, tubularSegments);

  /* Parallel-transport frames along the centerline. */
  const tangents: Vec3[] = centers.map((point, i) => {
    const previous = centers[Math.max(0, i - 1)];
    const next = centers[Math.min(centers.length - 1, i + 1)];
    return vec3.normalize(vec3.sub(next, previous));
  });

  const normals: Vec3[] = [];
  let normal = vec3.normalize(vec3.cross(tangents[0], [0, 0, 1]));
  if (!Number.isFinite(normal[0]) || vec3.length(normal) < 0.5) normal = [1, 0, 0];
  for (let i = 0; i < centers.length; i += 1) {
    if (i > 0) {
      const axis = vec3.cross(tangents[i - 1], tangents[i]);
      const axisLength = vec3.length(axis);
      if (axisLength > 1e-6) {
        const angle = Math.atan2(
          axisLength,
          vec3.dot(tangents[i - 1], tangents[i]),
        );
        normal = rotateAround(normal, vec3.scale(axis, 1 / axisLength), angle);
      }
    }
    normals.push(vec3.normalize(normal));
  }

  /* Sweep rings. Radius eases in and out so the stroke tapers like a pen. */
  const ringCount = centers.length;
  const vertexCount = ringCount * (radialSegments + 1);
  const positionData = new Float32Array(vertexCount * 3);
  const normalData = new Float32Array(vertexCount * 3);
  const indexData = new Uint16Array((ringCount - 1) * radialSegments * 6);

  let vertex = 0;
  for (let i = 0; i < ringCount; i += 1) {
    const center = centers[i];
    const n = normals[i];
    const b = vec3.normalize(vec3.cross(tangents[i], n));
    const along = i / (ringCount - 1);
    const taper = 0.62 + 0.38 * Math.sin(Math.min(1, Math.min(along / 0.10, (1 - along) / 0.10)) * Math.PI * 0.5);
    const r = radius * taper;

    for (let j = 0; j <= radialSegments; j += 1) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const offset: Vec3 = [
        n[0] * cos + b[0] * sin,
        n[1] * cos + b[1] * sin,
        n[2] * cos + b[2] * sin,
      ];
      positionData[vertex * 3] = center[0] + offset[0] * r;
      positionData[vertex * 3 + 1] = center[1] + offset[1] * r;
      positionData[vertex * 3 + 2] = center[2] + offset[2] * r;
      normalData[vertex * 3] = offset[0];
      normalData[vertex * 3 + 1] = offset[1];
      normalData[vertex * 3 + 2] = offset[2];
      vertex += 1;
    }
  }

  let index = 0;
  for (let i = 0; i < ringCount - 1; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const a = i * (radialSegments + 1) + j;
      const b2 = a + radialSegments + 1;
      indexData[index] = a;
      indexData[index + 1] = b2;
      indexData[index + 2] = a + 1;
      indexData[index + 3] = b2;
      indexData[index + 4] = b2 + 1;
      indexData[index + 5] = a + 1;
      index += 6;
    }
  }

  const glintAnchors = [0.16, 0.38, 0.60, 0.84].map((t) => {
    const center = centers[Math.round(t * (ringCount - 1))];
    return [center[0], center[1] + radius * 0.9, center[2] + radius] as Vec3;
  });

  return { positions: positionData, normals: normalData, indices: indexData, glintAnchors };
};

/*
 * Matcap painted on a canvas: cool pearl sphere lit from upper-left with a
 * soft blue ambient floor — the material haoqi's tube evokes, painted fresh.
 */
export const paintMatcap = (): HTMLCanvasElement => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2d context unavailable");

  /* Base: vertical pearl gradient. */
  const base = context.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, "#f2f8ff");
  base.addColorStop(0.40, "#cfe2f6");
  base.addColorStop(0.74, "#93bce8");
  base.addColorStop(1, "#6494d2");
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  /* Key highlight, upper-left. */
  const key = context.createRadialGradient(
    size * 0.34, size * 0.28, size * 0.02,
    size * 0.34, size * 0.28, size * 0.46,
  );
  key.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  key.addColorStop(0.28, "rgba(255, 255, 255, 0.65)");
  key.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = key;
  context.fillRect(0, 0, size, size);

  /* Secondary bounce, lower-right. */
  const bounce = context.createRadialGradient(
    size * 0.74, size * 0.66, size * 0.01,
    size * 0.74, size * 0.66, size * 0.22,
  );
  bounce.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  bounce.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = bounce;
  context.fillRect(0, 0, size, size);

  /* Blue ambient pooling at the bottom. */
  const pool = context.createRadialGradient(
    size * 0.5, size * 1.05, size * 0.1,
    size * 0.5, size * 1.05, size * 0.75,
  );
  pool.addColorStop(0, "rgba(47, 98, 176, 0.78)");
  pool.addColorStop(1, "rgba(47, 98, 176, 0)");
  context.fillStyle = pool;
  context.fillRect(0, 0, size, size);

  /* Cool rim so grazing angles deepen instead of clipping to white. */
  const rim = context.createRadialGradient(
    size * 0.5, size * 0.5, size * 0.30,
    size * 0.5, size * 0.5, size * 0.5,
  );
  rim.addColorStop(0, "rgba(58, 96, 148, 0)");
  rim.addColorStop(0.85, "rgba(58, 96, 148, 0.18)");
  rim.addColorStop(1, "rgba(44, 76, 122, 0.42)");
  context.fillStyle = rim;
  context.fillRect(0, 0, size, size);

  return canvas;
};
