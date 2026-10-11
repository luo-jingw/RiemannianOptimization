"""Convert the MuJoCo Menagerie Skydio X2 quadrotor (Apache-2.0) into a GLB with separate rotor discs.

Run: .venv/bin/python -I -m rvideo.assets.x2_model

Source: google-deepmind/mujoco_menagerie skydio_x2 (assets/X2_lowpoly.obj and
X2_lowpoly_texture_SpinningProps_1024.png), copied into build/trailer-assets/raw/skydio_x2/.
Assets provided by Skydio, Apache License 2.0.

The OBJ is placed exactly as in x2.xml (scale 0.01, geom quat 0 0 1 1). The four flat rotor discs
(the texture paints them as motion-blurred spinning propellers) are split from the body into nodes
rotor1..rotor4, numbered as in x2.xml, each translated to its disc centre so it can be spun about
its local +z axis or hidden.

GLB node layout (units: metres, three.js y-up):
  skydio_x2 (z-up -> y-up)
    body       -> fuselage, arms, motors, antennas
    rotor1..4  -> one textured disc each
"""
from __future__ import annotations

import numpy as np
import trimesh
from PIL import Image
from trimesh.visual.material import PBRMaterial

from rvideo.assets.mjcf_frames import quaternion_wxyz_matrix, z_up_to_y_up
from rvideo.assets.trailer_asset_paths import TrailerAssetPaths

MESH_SCALE: float = 0.01
GEOM_QUAT_WXYZ: tuple[float, float, float, float] = (0.0, 0.0, 1.0, 1.0)
ROTOR_CENTRES_XY: list[tuple[float, float]] = [(-0.14, -0.18), (-0.14, 0.18), (0.14, 0.18), (0.14, -0.18)]
DISC_MAX_THICKNESS_M: float = 0.005
DISC_MIN_DIAMETER_M: float = 0.2
ROTOR_MATCH_RADIUS_M: float = 0.03


def placed_mesh(paths: TrailerAssetPaths) -> trimesh.Trimesh:
    raw = trimesh.load(paths.x2_dir / "assets" / "X2_lowpoly.obj", force="mesh", process=False)
    rotation = quaternion_wxyz_matrix(np.array(GEOM_QUAT_WXYZ))
    normals = np.asarray(raw.vertex_normals) @ rotation.T
    return trimesh.Trimesh(
        vertices=(np.asarray(raw.vertices) * MESH_SCALE) @ rotation.T,
        faces=np.asarray(raw.faces),
        vertex_normals=normals,
        visual=trimesh.visual.TextureVisuals(uv=np.asarray(raw.visual.uv)),
        process=False,
    )


def face_components(mesh: trimesh.Trimesh) -> np.ndarray:
    welded = trimesh.Trimesh(vertices=mesh.vertices.copy(), faces=mesh.faces.copy(), process=False)
    welded.merge_vertices(merge_tex=True, merge_norm=True)
    return trimesh.graph.connected_component_labels(welded.face_adjacency, node_count=len(welded.faces))


def rotor_face_sets(mesh: trimesh.Trimesh) -> list[np.ndarray]:
    labels = face_components(mesh)
    rotors: list[np.ndarray | None] = [None, None, None, None]
    for label in np.unique(labels):
        faces = np.flatnonzero(labels == label)
        points = mesh.vertices[np.unique(mesh.faces[faces])]
        extent = points.max(axis=0) - points.min(axis=0)
        if extent[2] > DISC_MAX_THICKNESS_M or min(extent[0], extent[1]) < DISC_MIN_DIAMETER_M:
            continue
        centre = (points.max(axis=0) + points.min(axis=0)) / 2.0
        for n, (x, y) in enumerate(ROTOR_CENTRES_XY):
            if np.hypot(centre[0] - x, centre[1] - y) < ROTOR_MATCH_RADIUS_M:
                if rotors[n] is not None:
                    raise ValueError(f"two discs matched rotor{n + 1}")
                rotors[n] = faces
    if any(r is None for r in rotors):
        raise ValueError(f"rotor discs not all found: {[r is not None for r in rotors]}")
    return [r for r in rotors if r is not None]


def face_subset(
    mesh: trimesh.Trimesh, faces: np.ndarray, offset: np.ndarray, material: PBRMaterial
) -> trimesh.Trimesh:
    """Sub-mesh of the given faces keeping the source OBJ normals and UVs, translated by -offset."""
    used, inverse = np.unique(mesh.faces[faces], return_inverse=True)
    return trimesh.Trimesh(
        vertices=np.asarray(mesh.vertices)[used] - offset,
        faces=inverse.reshape(-1, 3),
        vertex_normals=np.asarray(mesh.vertex_normals)[used],
        visual=trimesh.visual.TextureVisuals(uv=np.asarray(mesh.visual.uv)[used], material=material),
        process=False,
    )


def main() -> None:
    paths = TrailerAssetPaths.from_repository()
    mesh = placed_mesh(paths)
    texture = Image.open(paths.x2_dir / "assets" / "X2_lowpoly_texture_SpinningProps_1024.png").convert("RGB")
    material = PBRMaterial(name="x2", baseColorTexture=texture, metallicFactor=0.1, roughnessFactor=0.55)

    rotors = rotor_face_sets(mesh)
    rotor_faces = np.concatenate(rotors)
    body_faces = np.setdiff1d(np.arange(len(mesh.faces)), rotor_faces)

    scene = trimesh.Scene(base_frame="world")
    scene.graph.update(frame_from="world", frame_to="skydio_x2", matrix=z_up_to_y_up())
    body = face_subset(mesh, body_faces, np.zeros(3), material)
    scene.add_geometry(body, node_name="body", geom_name="body", parent_node_name="skydio_x2")
    for n, faces in enumerate(rotors):
        points = mesh.vertices[np.unique(mesh.faces[faces])]
        centre = (points.max(axis=0) + points.min(axis=0)) / 2.0
        disc = face_subset(mesh, faces, centre, material)
        offset = np.eye(4)
        offset[:3, 3] = centre
        scene.add_geometry(
            disc, node_name=f"rotor{n + 1}", geom_name=f"rotor{n + 1}", parent_node_name="skydio_x2", transform=offset
        )
        print(f"rotor{n + 1}: faces={len(faces)} centre={np.round(centre, 4).tolist()}")

    paths.models_dir.mkdir(parents=True, exist_ok=True)
    paths.drone_glb.write_bytes(scene.export(file_type="glb", include_normals=True))
    print(f"body faces={len(body_faces)} bounds={np.round(mesh.bounds, 3).tolist()}")
    print(f"wrote {paths.drone_glb} ({paths.drone_glb.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
