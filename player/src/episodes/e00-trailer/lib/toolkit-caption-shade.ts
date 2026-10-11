import * as THREE from "three";
import type { StageLayer } from "../../../layers/StageLayer";

const VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uTop;
uniform float uFull;
uniform float uStrength;
void main() {
  float y = 1080.0 - gl_FragCoord.y;
  float a = uStrength * smoothstep(uTop, uFull, y);
  gl_FragColor = vec4(uColor, a);
}`;

/**
 * Full-width shade drawn over the scene that darkens the bottom of the frame, so a full-bleed
 * 3D subject melts into darkness before the caption band (y ≥ 860 px).
 */
export class CaptionShade {
  private readonly material: THREE.ShaderMaterial;

  /** @param top y (px) where the shade starts; @param full y (px) where it reaches full strength */
  constructor(stage: StageLayer, color: string, top: number, full: number) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTop: { value: top },
        uFull: { value: full },
        uStrength: { value: 1 },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1000;
    stage.root.add(mesh);
  }

  setStrength(s: number): void {
    this.material.uniforms.uStrength.value = Math.max(0, Math.min(1, s));
  }
}
