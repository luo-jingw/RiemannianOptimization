import * as THREE from "three";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../../core/Frame";
import type { StageLayer } from "../../../layers/StageLayer";
import { Palette } from "../../../primitives/Palette";
import type { GalleryVignette } from "./gallery-vignette";

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** Crossfade of two linear-light shots, radial vignette (depth), fade to background, ordered dither. */
const FRAGMENT = /* glsl */ `
uniform sampler2D tA;
uniform sampler2D tB;
uniform float wB;
uniform float useB;
uniform float fade;
uniform vec3 bg;
varying vec2 vUv;
void main() {
  vec3 a = texture2D(tA, vUv).rgb;
  vec3 b = useB > 0.5 ? texture2D(tB, vUv).rgb : a;
  vec3 c = mix(a, b, wB);
  vec2 d = (vUv - vec2(0.5, 0.52)) * vec2(1.7778, 1.0);
  float r = length(d);
  float vig = mix(1.08, 0.55, smoothstep(0.25, 1.05, r));
  c = mix(c, bg, fade) * vig;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor.rgb += (h - 0.5) / 255.0;
}`;

/**
 * Renders gallery shots into offscreen targets and shows them on one full-frame quad in the stage.
 * The stage's own camera is set to the 16 x 9 orthographic view that the quad fills.
 */
export class GalleryCompositor {
  private readonly targetA: THREE.WebGLRenderTarget;
  private readonly targetB: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;

  constructor(private readonly stage: StageLayer) {
    const options = { samples: 4, type: THREE.HalfFloatType, depthBuffer: true } as const;
    this.targetA = new THREE.WebGLRenderTarget(FRAME_WIDTH, FRAME_HEIGHT, options);
    this.targetB = new THREE.WebGLRenderTarget(FRAME_WIDTH, FRAME_HEIGHT, options);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        tA: { value: this.targetA.texture },
        tB: { value: this.targetB.texture },
        wB: { value: 0 },
        useB: { value: 0 },
        fade: { value: 0 },
        bg: { value: new THREE.Color(Palette.background) },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), this.material);
    quad.frustumCulled = false;
    stage.root.add(quad);
  }

  /**
   * Draws shot `a`, optionally crossfaded towards shot `b` with weight `wB`, then mixed towards the background
   * colour by `fade`. Each shot must already have been drawn for this frame.
   */
  compose(a: GalleryVignette, b: GalleryVignette | null, wB: number, fade: number): void {
    this.renderShot(a, this.targetA);
    if (b !== null) this.renderShot(b, this.targetB);
    const u = this.material.uniforms;
    u.wB.value = b !== null ? wB : 0;
    u.useB.value = b !== null ? 1 : 0;
    u.fade.value = fade;
    this.stage.setView2D(0, 0, 9);
  }

  private renderShot(v: GalleryVignette, target: THREE.WebGLRenderTarget): void {
    const r = this.stage.renderer;
    const previousTarget = r.getRenderTarget();
    const previousAutoClear = r.autoClear;
    r.setRenderTarget(target);
    r.autoClear = true;
    r.render(v.scene, v.camera);
    if (v.hud !== null) {
      r.autoClear = false;
      r.clearDepth();
      r.render(v.hud.scene, v.hud.camera);
    }
    r.autoClear = previousAutoClear;
    r.setRenderTarget(previousTarget);
  }

  dispose(): void {
    this.targetA.dispose();
    this.targetB.dispose();
  }
}
