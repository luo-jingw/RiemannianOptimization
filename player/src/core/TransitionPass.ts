import * as THREE from "three";
import { FRAME_HEIGHT, FRAME_WIDTH } from "./Frame";

/** One frame of a section transition: magnification about `center` (frame uv, y up), radial blur, brightening. */
export interface SectionTransition {
  center: THREE.Vector2;
  zoom: number;
  blur: number;
  flash: number;
}

/** Seconds on each side of a trailer chapter boundary that the zoom-through takes. */
export const TRANSITION_SECONDS = 0.35;
const TAPS = 10;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D tFrame;
uniform vec2 center;
uniform float zoom;
uniform float blur;
uniform float flash;
varying vec2 vUv;
void main() {
  vec2 d = vUv - center;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${TAPS}; i++) {
    float k = float(i) / float(${TAPS - 1});
    vec2 p = clamp(center + d * (1.0 - blur * k) / zoom, vec2(0.0), vec2(1.0));
    acc += texture2D(tFrame, p).rgb;
  }
  vec3 c = acc / float(${TAPS}) + flash * vec3(1.0, 0.93, 0.85);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * Zoom-through between trailer sections: the stage is rendered offscreen and drawn magnified about a point with a
 * radial blur toward it. The outgoing section zooms into its exit point, the incoming one out of its entry point,
 * so the cut between the two scenes falls on the most magnified, most blurred frame.
 */
export class TransitionPass {
  private readonly target = new THREE.WebGLRenderTarget(FRAME_WIDTH, FRAME_HEIGHT,
    { samples: 4, type: THREE.HalfFloatType, depthBuffer: true });
  private readonly material: THREE.ShaderMaterial;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        tFrame: { value: this.target.texture },
        center: { value: new THREE.Vector2(0.5, 0.5) },
        zoom: { value: 1 },
        blur: { value: 0 },
        flash: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.quadScene.add(quad);
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, t: SectionTransition): void {
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    const u = this.material.uniforms;
    u.center.value.copy(t.center);
    u.zoom.value = t.zoom;
    u.blur.value = t.blur;
    u.flash.value = t.flash;
    renderer.render(this.quadScene, this.quadCamera);
  }
}
