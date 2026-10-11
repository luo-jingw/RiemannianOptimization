import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

/** Gradient colors of the backdrop, as sRGB hex strings. */
export interface BackdropColors {
  /** Color at the glow center. */
  inner: string;
  /** Color at the frame corners. */
  outer: string;
}

/** Glow placement in output-frame pixels (origin top-left, 1920 x 1080). */
export interface BackdropGlow {
  x: number;
  y: number;
  /** Radius in pixels at which the gradient reaches the outer color. */
  radius: number;
  /** 0 = flat outer color everywhere, 1 = full gradient. */
  strength: number;
}

function srgbVector(hex: string): THREE.Vector3 {
  const v = parseInt(hex.replace("#", ""), 16);
  return new THREE.Vector3(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
}

const VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.999, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uInner;
uniform vec3 uOuter;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;
uniform float uBrightness;
void main() {
  vec2 px = vec2(gl_FragCoord.x, 1080.0 - gl_FragCoord.y);
  float d = length(px - uCenter) / uRadius;
  float w = uStrength * (1.0 - smoothstep(0.0, 1.0, d));
  vec3 col = mix(uOuter, uInner, w);
  float corner = length((px - vec2(960.0, 540.0)) / vec2(960.0, 540.0));
  col *= 1.0 - 0.35 * smoothstep(0.7, 1.45, corner);
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor = vec4(col * uBrightness + (n - 0.5) / 255.0, 1.0);
}`;

/**
 * Full-frame radial gradient drawn behind everything, independent of the camera.
 * Colors are written to the framebuffer as given (sRGB), with a vignette and a fixed dither pattern.
 */
export class RadialBackdrop {
  private readonly material: THREE.ShaderMaterial;
  readonly mesh: THREE.Mesh;

  constructor(stage: StageLayer, colors: BackdropColors) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uInner: { value: srgbVector(colors.inner) },
        uOuter: { value: srgbVector(colors.outer) },
        uCenter: { value: new THREE.Vector2(960, 430) },
        uRadius: { value: 900 },
        uStrength: { value: 1 },
        uBrightness: { value: 1 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    stage.root.add(this.mesh);
  }

  /** Sets the glow and the overall brightness (0 = black frame). Call every frame. */
  set(glow: BackdropGlow, brightness: number): void {
    const u = this.material.uniforms;
    (u.uCenter.value as THREE.Vector2).set(glow.x, glow.y);
    u.uRadius.value = glow.radius;
    u.uStrength.value = glow.strength;
    u.uBrightness.value = Math.max(0, brightness);
  }
}
