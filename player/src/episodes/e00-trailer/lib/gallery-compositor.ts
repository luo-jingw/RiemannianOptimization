import * as THREE from "three";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../../../core/Frame";
import type { StageLayer } from "../../../layers/StageLayer";
import { smoothstep } from "../../../primitives/Easing";
import { Palette } from "../../../primitives/Palette";
import type { GalleryVignette } from "./gallery-vignette";

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * Match cut of two linear-light shots: each shot is magnified about its own focus point, which is carried to a shared
 * pivot, with a radial blur toward the pivot; then radial vignette (depth), fade to background, ordered dither.
 */
const FRAGMENT = /* glsl */ `
uniform sampler2D tA;
uniform sampler2D tB;
uniform float wB;
uniform float useB;
uniform float fade;
uniform vec3 bg;
uniform vec2 pivot;
uniform vec2 focusA;
uniform vec2 focusB;
uniform float zoomA;
uniform float zoomB;
uniform float blur;
varying vec2 vUv;

vec3 tap(sampler2D tex, vec2 p) {
  return (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) ? bg : texture2D(tex, p).rgb;
}

vec3 shot(sampler2D tex, vec2 focus, float zoom) {
  vec2 d = vUv - pivot;
  if (blur < 1e-4) return tap(tex, focus + d / zoom);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float k = float(i) / 7.0;
    acc += tap(tex, focus + d * (1.0 - blur * k) / zoom);
  }
  return acc / 8.0;
}

void main() {
  vec3 a = shot(tA, focusA, zoomA);
  vec3 b = useB > 0.5 ? shot(tB, focusB, zoomB) : a;
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

/** Extra magnification of each shot at the moment of a match cut, and the strength of the radial blur. */
const CUT_ZOOM = 1.3;
const CUT_BLUR = 0.22;

/** A match cut in progress from the current shot to `next`. */
export interface MatchCut {
  readonly next: GalleryVignette;
  /** Frame uv of the outgoing shot's key element. */
  readonly focusA: THREE.Vector2;
  /** Frame uv of the incoming shot's key element. */
  readonly focusB: THREE.Vector2;
  /** 0 at the start of the cut window, 1 at its end; the shots swap at 0.5. */
  readonly progress: number;
}

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
        pivot: { value: new THREE.Vector2(0.5, 0.5) },
        focusA: { value: new THREE.Vector2(0.5, 0.5) },
        focusB: { value: new THREE.Vector2(0.5, 0.5) },
        zoomA: { value: 1 },
        zoomB: { value: 1 },
        blur: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), this.material);
    quad.frustumCulled = false;
    stage.root.add(quad);
  }

  /**
   * Draws shot `a`, or the match cut from `a` to `cut.next`, then mixes towards the background colour by `fade`.
   * Each shot must already have been drawn for this frame. Returns the frame uv of the cut's pivot (the point both
   * shots zoom through); without a cut, the frame centre.
   */
  compose(a: GalleryVignette, cut: MatchCut | null, fade: number): THREE.Vector2 {
    this.renderShot(a, this.targetA);
    const u = this.material.uniforms;
    u.fade.value = fade;
    this.stage.setView2D(0, 0, 9);
    if (cut === null) {
      u.useB.value = 0;
      u.wB.value = 0;
      u.blur.value = 0;
      u.zoomA.value = 1;
      u.pivot.value.set(0.5, 0.5);
      u.focusA.value.set(0.5, 0.5);
      return new THREE.Vector2(0.5, 0.5);
    }
    this.renderShot(cut.next, this.targetB);
    const w = smoothstep(0, 1, cut.progress);
    const pivot = new THREE.Vector2().lerpVectors(cut.focusA, cut.focusB, w);
    u.useB.value = 1;
    u.wB.value = smoothstep(0.4, 0.6, cut.progress);
    u.pivot.value.copy(pivot);
    u.focusA.value.copy(cut.focusA);
    u.focusB.value.copy(cut.focusB);
    u.zoomA.value = 1 + CUT_ZOOM * w;
    u.zoomB.value = 1 + CUT_ZOOM * (1 - w);
    u.blur.value = CUT_BLUR * Math.sin(Math.PI * cut.progress);
    return pivot;
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
