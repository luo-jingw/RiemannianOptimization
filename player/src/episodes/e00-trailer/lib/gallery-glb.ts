import type * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** Loads a GLB from player/public/trailer/models/ and returns its scene root. */
export async function loadTrailerModel(file: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}trailer/models/${file}`);
  return gltf.scene;
}
