/*
 * The particle stream. Every particle has a deterministic seed and a
 * per-section "home" pattern; frames spring positions toward the home of
 * the current scroll stage, add organic drift, and let the pointer carve
 * a local wake.
 *
 * Stages: 0 hero · 1 work · 2 statement · 3 runtime · 4 surfaces · 5 cta.
 */

export interface PointerState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  active: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export class ParticleSystem {
  readonly count: number;
  readonly positions: Float32Array;
  readonly sizes: Float32Array;
  readonly shades: Float32Array;
  /** Two vertices per particle for the Runtime warp streaks. */
  readonly linePositions: Float32Array;
  readonly lineShades: Float32Array;
  /** 0..1 — how strongly the warp streaks should show. */
  warpStrength = 0;

  private readonly velocities: Float32Array;
  private readonly random1: Float32Array;
  private readonly random2: Float32Array;
  private readonly random3: Float32Array;
  private readonly gaussX: Float32Array;
  private readonly gaussY: Float32Array;

  constructor(count: number) {
    this.count = count;
    this.positions = new Float32Array(count * 2);
    this.linePositions = new Float32Array(count * 4);
    this.lineShades = new Float32Array(count * 2);
    this.velocities = new Float32Array(count * 2);
    this.sizes = new Float32Array(count);
    this.shades = new Float32Array(count);
    this.random1 = new Float32Array(count);
    this.random2 = new Float32Array(count);
    this.random3 = new Float32Array(count);
    this.gaussX = new Float32Array(count);
    this.gaussY = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      this.random1[i] = seeded(i, 1);
      this.random2[i] = seeded(i, 2);
      this.random3[i] = seeded(i, 3);
      const radius = Math.sqrt(-2 * Math.log(Math.max(1e-6, seeded(i, 4))));
      const angle = seeded(i, 5) * Math.PI * 2;
      this.gaussX[i] = radius * Math.cos(angle) * 0.24;
      this.gaussY[i] = radius * Math.sin(angle) * 0.2;
      this.sizes[i] = 2.6 + seeded(i, 6) * 4.2 + (seeded(i, 7) > 0.93 ? 5.5 : 0);
      this.shades[i] = seeded(i, 8);
      this.positions[i * 2] = (this.random1[i] * 2 - 1) * 1.4;
      this.positions[i * 2 + 1] = (this.random2[i] * 2 - 1) * 1.1;
      this.lineShades[i * 2] = this.shades[i];
      this.lineShades[i * 2 + 1] = this.shades[i];
    }
  }

  /*
   * Runtime warp: radial light streaks racing outward from a center point,
   * the reference's hyperspace field translated to Maka's palette. Head and
   * tail per particle; streaks lengthen with radius.
   */
  updateWarp(stage: number, elapsed: number, aspect: number): void {
    this.warpStrength = Math.max(0, 1 - Math.abs(stage - 3) * 1.6);
    if (this.warpStrength <= 0.01) return;

    const maxRadius = Math.max(1.15, aspect) * 1.35;
    for (let i = 0; i < this.count; i += 1) {
      const angle = this.random1[i] * Math.PI * 2;
      const speed = 0.16 + this.random2[i] * 0.5;
      const radius = ((this.random3[i] * maxRadius + elapsed * speed) % maxRadius);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle) * 0.9;
      const grow = radius / maxRadius;
      const tail = Math.min(radius, 0.05 + grow * grow * 0.34);
      const headX = dirX * radius;
      const headY = dirY * radius + 0.05;
      this.linePositions[i * 4] = headX;
      this.linePositions[i * 4 + 1] = headY;
      this.linePositions[i * 4 + 2] = headX - dirX * tail;
      this.linePositions[i * 4 + 3] = headY - dirY * tail;
    }
  }

  private stageX(stage: number, i: number, time: number): number {
    switch (stage) {
      case 0: /* hero — loose cloud around the monogram */
        return 0.34 + this.gaussX[i] * 1.6;
      case 1: /* work — clear the reading plane, hold the margins */
        return Math.sign(this.random1[i] - 0.5) * (0.84 + this.random2[i] * 0.14);
      case 2: /* statement — wide ring */
        return Math.cos(this.random1[i] * Math.PI * 2) * (0.62 + this.random2[i] * 0.2);
      case 3: { /* runtime — one flowing band */
        const flow = this.random1[i] * 2 + time * 0.028 * (0.4 + this.random3[i]);
        return ((flow % 2) + 2) % 2 - 1;
      }
      default: /* surfaces + cta — sparse field */
        return (this.random1[i] * 2 - 1) * 0.95;
    }
  }

  private stageY(stage: number, i: number, time: number): number {
    switch (stage) {
      case 0:
        return 0.16 + this.gaussY[i] * 1.7 + Math.sin(time * 0.4 + this.random3[i] * 9) * 0.02;
      case 1:
        return (this.random3[i] * 2 - 1) * 0.85;
      case 2:
        return Math.sin(this.random1[i] * Math.PI * 2) * (0.5 + this.random2[i] * 0.16);
      case 3:
        return (this.random2[i] * 2 - 1) * 0.14 + Math.sin(time * 0.6 + this.random1[i] * 12) * 0.015;
      case 4:
        return (this.random2[i] * 2 - 1) * 0.85;
      default:
        return (this.random2[i] * 2 - 1) * 0.85 + 0.05;
    }
  }

  private homeX(stage: number, i: number, time: number): number {
    const s0 = Math.min(5, Math.max(0, Math.floor(stage)));
    const s1 = Math.min(5, s0 + 1);
    return lerp(this.stageX(s0, i, time), this.stageX(s1, i, time), stage - s0);
  }

  private homeY(stage: number, i: number, time: number): number {
    const s0 = Math.min(5, Math.max(0, Math.floor(stage)));
    const s1 = Math.min(5, s0 + 1);
    return lerp(this.stageY(s0, i, time), this.stageY(s1, i, time), stage - s0);
  }

  update(
    stage: number,
    elapsed: number,
    delta: number,
    aspect: number,
    pointer: PointerState,
    settle: boolean,
  ): void {
    const pointerWorldX = pointer.x * aspect;
    const pointerWorldY = pointer.y;
    const speed = Math.min(1, Math.hypot(pointer.velocityX, pointer.velocityY) * 0.35);
    const damping = Math.exp(-delta * 2.1);

    for (let i = 0; i < this.count; i += 1) {
      const targetX = this.homeX(stage, i, elapsed) * aspect;
      const targetY = this.homeY(stage, i, elapsed);

      if (settle) {
        this.positions[i * 2] = targetX;
        this.positions[i * 2 + 1] = targetY;
        continue;
      }

      const px = this.positions[i * 2];
      const py = this.positions[i * 2 + 1];
      let vx = this.velocities[i * 2];
      let vy = this.velocities[i * 2 + 1];

      /* Spring toward the section home. */
      vx += (targetX - px) * delta * 2.4;
      vy += (targetY - py) * delta * 2.4;

      /* Gentle organic drift. */
      vx += Math.sin(elapsed * (0.24 + this.random2[i] * 0.3) + this.random1[i] * 20) * delta * 0.05;
      vy += Math.cos(elapsed * (0.2 + this.random1[i] * 0.3) + this.random2[i] * 20) * delta * 0.05;

      /* Pointer wake: nearby particles are pushed along the motion. */
      if (pointer.active) {
        const dx = px - pointerWorldX;
        const dy = py - pointerWorldY;
        const fall = Math.exp(-(dx * dx + dy * dy) * 9);
        vx += (dx * 1.4 + pointer.velocityX * 0.16) * fall * delta * (0.6 + speed * 2.2);
        vy += (dy * 1.4 + pointer.velocityY * 0.16) * fall * delta * (0.6 + speed * 2.2);
      }

      vx *= damping;
      vy *= damping;
      this.velocities[i * 2] = vx;
      this.velocities[i * 2 + 1] = vy;
      this.positions[i * 2] = px + vx * delta;
      this.positions[i * 2 + 1] = py + vy * delta;
    }
  }
}
