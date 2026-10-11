import * as THREE from "three";

/** Screen position of a world point as frame uv (0..1, y up), for the match cuts between gallery shots. */
export function projectToUv(camera: THREE.Camera, world: THREE.Vector3): THREE.Vector2 {
  const ndc = world.clone().project(camera);
  return new THREE.Vector2((ndc.x + 1) / 2, (ndc.y + 1) / 2);
}
