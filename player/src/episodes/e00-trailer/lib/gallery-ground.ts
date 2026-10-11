import * as THREE from "three";

const VERTEX = /* glsl */ `
varying vec2 vXY;
void main() {
  vXY = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 lineColor;
uniform vec3 glowColor;
uniform float radius;
uniform float spacing;
uniform float opacity;
varying vec2 vXY;
void main() {
  vec2 g = abs(fract(vXY / spacing - 0.5) - 0.5) / fwidth(vXY / spacing);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float r = length(vXY) / radius;
  float falloff = 1.0 - smoothstep(0.15, 1.0, r);
  float glow = (1.0 - smoothstep(0.0, 0.7, r)) * 0.22;
  vec3 c = lineColor * line * 0.55 + glowColor * glow;
  float a = (line * 0.55 + glow) * falloff * opacity;
  gl_FragColor = vec4(c, a);
}`;

/** A square grid on the plane z = 0 that fades out radially: a floor that dissolves into the background. */
export function createGalleryGround(radius: number, spacing: number, lineColor: string, glowColor: string): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      lineColor: { value: new THREE.Color(lineColor) },
      glowColor: { value: new THREE.Color(glowColor) },
      radius: { value: radius },
      spacing: { value: spacing },
      opacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2, 1, 1), mat);
}
