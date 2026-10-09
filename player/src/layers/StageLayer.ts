import * as THREE from "three";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../core/Frame";

export interface FramePoint {
  x: number;
  y: number;
}

/**
 * Three.js drawing surface. Scenes add objects under `root`; the renderer clears `root`
 * between chapters. Two camera modes: an orthographic 2D view in math units and a 3D perspective view.
 */
export class StageLayer {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly root: THREE.Group;
  readonly resolution: THREE.Vector2;
  private readonly ortho: THREE.OrthographicCamera;
  private readonly persp: THREE.PerspectiveCamera;
  private mode: "2d" | "3d" = "2d";

  constructor(host: HTMLElement, background: string) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(FRAME_WIDTH, FRAME_HEIGHT, false);
    this.renderer.setClearColor(new THREE.Color(background), 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.style.position = "absolute";
    this.canvas.style.left = "0";
    this.canvas.style.top = "0";
    this.canvas.style.width = `${FRAME_WIDTH}px`;
    this.canvas.style.height = `${FRAME_HEIGHT}px`;
    host.appendChild(this.canvas);
    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.resolution = new THREE.Vector2(FRAME_WIDTH, FRAME_HEIGHT);
    this.ortho = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, -100, 100);
    this.persp = new THREE.PerspectiveCamera(40, FRAME_WIDTH / FRAME_HEIGHT, 0.05, 200);
    this.setView2D(0, 0, 9);
  }

  /** Orthographic view: the frame shows world height `worldHeight` centered at (cx, cy). */
  setView2D(cx: number, cy: number, worldHeight: number): void {
    const halfH = worldHeight / 2;
    const halfW = (halfH * FRAME_WIDTH) / FRAME_HEIGHT;
    this.ortho.left = cx - halfW;
    this.ortho.right = cx + halfW;
    this.ortho.top = cy + halfH;
    this.ortho.bottom = cy - halfH;
    this.ortho.position.set(0, 0, 10);
    this.ortho.lookAt(0, 0, 0);
    this.ortho.updateProjectionMatrix();
    this.ortho.updateMatrixWorld(true);
    this.mode = "2d";
  }

  /** Perspective view from `position` looking at `target`. */
  setView3D(position: THREE.Vector3, target: THREE.Vector3, fovDeg: number): void {
    this.persp.fov = fovDeg;
    this.persp.position.copy(position);
    this.persp.up.set(0, 0, 1);
    this.persp.lookAt(target);
    this.persp.updateProjectionMatrix();
    this.persp.updateMatrixWorld(true);   // project() must not read the previous frame's camera
    this.mode = "3d";
  }

  get camera(): THREE.Camera {
    return this.mode === "2d" ? this.ortho : this.persp;
  }

  /** World point -> output-frame pixel coordinates. */
  project(p: THREE.Vector3): FramePoint {
    const v = p.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * FRAME_WIDTH, y: ((1 - v.y) / 2) * FRAME_HEIGHT };
  }

  /** Output-frame pixel -> world point on the z=0 plane (2D mode only). */
  unproject2D(px: number, py: number): THREE.Vector3 {
    const x = this.ortho.left + (px / FRAME_WIDTH) * (this.ortho.right - this.ortho.left);
    const y = this.ortho.top - (py / FRAME_HEIGHT) * (this.ortho.top - this.ortho.bottom);
    return new THREE.Vector3(x, y, 0);
  }

  /** World units per output pixel in 2D mode. */
  get worldPerPixel(): number {
    return (this.ortho.top - this.ortho.bottom) / FRAME_HEIGHT;
  }

  clear(): void {
    const disposeTree = (obj: THREE.Object3D): void => {
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    };
    for (const child of [...this.root.children]) {
      disposeTree(child);
      this.root.remove(child);
    }
    this.setView2D(0, 0, 9);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
