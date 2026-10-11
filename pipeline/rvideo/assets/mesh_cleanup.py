"""Mesh cleanup shared by the model converters: weld, decimate, and crease-aware normals."""
from __future__ import annotations

import fast_simplification
import numpy as np
import trimesh


class MeshCleanup:
    """Turns a face-split CAD/OBJ mesh into a compact indexed mesh with crease-preserving normals."""

    def __init__(self, crease_angle_deg: float) -> None:
        self.crease_angle_rad = float(np.radians(crease_angle_deg))

    def weld(self, mesh: trimesh.Trimesh) -> trimesh.Trimesh:
        welded = trimesh.Trimesh(vertices=mesh.vertices.copy(), faces=mesh.faces.copy(), process=False)
        welded.merge_vertices(merge_tex=True, merge_norm=True)
        welded.update_faces(welded.nondegenerate_faces())
        welded.remove_unreferenced_vertices()
        return welded

    def decimate(self, mesh: trimesh.Trimesh, keep_fraction: float) -> trimesh.Trimesh:
        if keep_fraction >= 1.0 or len(mesh.faces) < 200:
            return mesh
        points, faces = fast_simplification.simplify(
            np.asarray(mesh.vertices, dtype=np.float32), np.asarray(mesh.faces, dtype=np.int32), 1.0 - keep_fraction
        )
        return trimesh.Trimesh(vertices=points, faces=faces, process=False)

    def crease_shade(self, mesh: trimesh.Trimesh) -> trimesh.Trimesh:
        return trimesh.graph.smooth_shade(mesh, angle=self.crease_angle_rad)

    def clean(self, mesh: trimesh.Trimesh, keep_fraction: float) -> trimesh.Trimesh:
        return self.crease_shade(self.decimate(self.weld(mesh), keep_fraction))
