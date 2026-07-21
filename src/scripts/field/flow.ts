/*
 * The pointer flow buffer: a half-resolution ping-pong render target that
 * carries fluid-like velocity and dye. Each frame the previous state is
 * semi-Lagrangian advected, decayed, and splatted with pointer velocity.
 * The background and the glass tube sample it to bend light around the
 * reader's motion — the living-water feel of the reference, built fresh.
 *
 * Velocity is encoded in RG around 0.5; dye lives in B. RGBA8 everywhere,
 * so it runs on plain WebGL1.
 */

import { compileShader, linkProgram } from "./gl";

const FLOW_VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FLOW_UPDATE_FRAGMENT = `
precision mediump float;
uniform sampler2D uPrev;
uniform vec2 uPointer;      /* uv space */
uniform vec2 uPointerVel;   /* uv/s, aspect-corrected */
uniform float uDelta;
uniform float uAspect;
varying vec2 vUv;

vec2 decodeVel(vec4 sample4) {
  return (sample4.rg - 0.5) * 2.0;
}

void main() {
  /* Semi-Lagrangian advection: follow the local velocity backwards. */
  vec2 velHere = decodeVel(texture2D(uPrev, vUv));
  vec2 source = vUv - velHere * uDelta * 0.28;
  vec4 prev = texture2D(uPrev, source);
  vec2 velocity = decodeVel(prev);
  float dye = prev.b;

  /* Dissipation. */
  float velDecay = exp(-uDelta * 1.9);
  float dyeDecay = exp(-uDelta * 1.15);
  velocity *= velDecay;
  dye *= dyeDecay;

  /* Pointer splat. */
  vec2 toPointer = vUv - uPointer;
  toPointer.x *= uAspect;
  float influence = exp(-dot(toPointer, toPointer) * 90.0);
  velocity += uPointerVel * influence * 0.9 * uDelta * 60.0 * 0.016;
  float speed = min(1.0, length(uPointerVel) * 2.2);
  dye = min(1.0, dye + speed * influence * 0.5);

  velocity = clamp(velocity, -1.0, 1.0);
  gl_FragColor = vec4(velocity * 0.5 + 0.5, dye, 1.0);
}
`;

export interface FlowField {
  /** Advance the simulation and leave the result bound as `texture`. */
  update(
    pointerU: number,
    pointerV: number,
    velU: number,
    velV: number,
    delta: number,
    aspect: number,
  ): void;
  /** Latest state texture (velocity RG biased, dye B). */
  readonly texture: WebGLTexture;
  /** Restore the default framebuffer viewport after update(). */
  resize(canvasWidth: number, canvasHeight: number): void;
  clear(): void;
}

const TARGET_HEIGHT = 216;

export const createFlowField = (
  gl: WebGLRenderingContext,
  quadBuffer: WebGLBuffer,
): FlowField => {
  const program = linkProgram(gl, FLOW_VERTEX, FLOW_UPDATE_FRAGMENT);
  /* compileShader imported transitively; reference to satisfy bundlers. */
  void compileShader;

  const uniforms = {
    prev: gl.getUniformLocation(program, "uPrev"),
    pointer: gl.getUniformLocation(program, "uPointer"),
    pointerVel: gl.getUniformLocation(program, "uPointerVel"),
    delta: gl.getUniformLocation(program, "uDelta"),
    aspect: gl.getUniformLocation(program, "uAspect"),
  };
  const positionAttr = gl.getAttribLocation(program, "aPosition");

  let width = 384;
  let height = TARGET_HEIGHT;
  let canvasWidth = 1;
  let canvasHeight = 1;

  const makeTarget = () => {
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) throw new Error("flow target allocation failed");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0.5, 0.5, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, framebuffer };
  };

  let read = makeTarget();
  let write = makeTarget();

  const clear = () => {
    for (const target of [read, write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.clearColor(0.5, 0.5, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  return {
    get texture() {
      return read.texture;
    },
    resize(nextCanvasWidth: number, nextCanvasHeight: number) {
      canvasWidth = nextCanvasWidth;
      canvasHeight = nextCanvasHeight;
      const aspect = nextCanvasWidth / Math.max(1, nextCanvasHeight);
      const nextWidth = Math.max(64, Math.round(TARGET_HEIGHT * aspect));
      if (nextWidth !== width) {
        width = nextWidth;
        height = TARGET_HEIGHT;
        read = makeTarget();
        write = makeTarget();
      }
    },
    update(pointerU, pointerV, velU, velV, delta, aspect) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.viewport(0, 0, width, height);
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.uniform1i(uniforms.prev, 0);
      gl.uniform2f(uniforms.pointer, pointerU, pointerV);
      gl.uniform2f(uniforms.pointerVel, velU, velV);
      gl.uniform1f(uniforms.delta, delta);
      gl.uniform1f(uniforms.aspect, aspect);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(positionAttr);
      gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      const swap = read;
      read = write;
      write = swap;
    },
    clear,
  };
};
