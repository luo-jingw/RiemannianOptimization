import * as THREE from "three";

export interface SymmetricEigen3 {
  /** Eigenvalues in descending order. */
  values: [number, number, number];
  /** Unit eigenvectors, vectors[k] belongs to values[k]. */
  vectors: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
}

/** Eigen-decomposition of a symmetric 3 x 3 matrix given row-major as a[r][c] (cyclic Jacobi rotations). */
export function symmetricEigen3(a: number[][]): SymmetricEigen3 {
  const m = a.map((row) => row.slice());
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    const off = m[0][1] ** 2 + m[0][2] ** 2 + m[1][2] ** 2;
    if (off < 1e-24) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]] as const) {
      if (Math.abs(m[p][q]) < 1e-30) continue;
      const theta = (m[q][q] - m[p][p]) / (2 * m[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k++) {
        const mkp = m[k][p];
        const mkq = m[k][q];
        m[k][p] = c * mkp - s * mkq;
        m[k][q] = s * mkp + c * mkq;
      }
      for (let k = 0; k < 3; k++) {
        const mpk = m[p][k];
        const mqk = m[q][k];
        m[p][k] = c * mpk - s * mqk;
        m[q][k] = s * mpk + c * mqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => m[j][j] - m[i][i]);
  const vec = (k: number): THREE.Vector3 => new THREE.Vector3(v[0][k], v[1][k], v[2][k]).normalize();
  return {
    values: [m[order[0]][order[0]], m[order[1]][order[1]], m[order[2]][order[2]]],
    vectors: [vec(order[0]), vec(order[1]), vec(order[2])],
  };
}

/** Rotation matrix exp(theta [axis]x) for a unit axis (Rodrigues). */
export function rotationAbout(axis: THREE.Vector3, theta: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationAxis(axis, theta);
}

/** Pose matrix with columns x, y, z (orthonormal) and translation p. */
export function poseFromAxes(x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3, p: THREE.Vector3, out: THREE.Matrix4): THREE.Matrix4 {
  return out.set(
    x.x, y.x, z.x, p.x,
    x.y, y.y, z.y, p.y,
    x.z, y.z, z.z, p.z,
    0, 0, 0, 1,
  );
}
