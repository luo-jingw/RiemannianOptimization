"""Convert the MuJoCo Menagerie UR5e (BSD-3-Clause) into an articulated GLB plus a rig description.

Run: .venv/bin/python -I -m rvideo.assets.ur5e_model

Source: google-deepmind/mujoco_menagerie universal_robots_ur5e (ur5e.xml + assets/*.obj), copied into
build/trailer-assets/raw/universal_robots_ur5e/. Copyright 2018 ROS Industrial Consortium, BSD-3-Clause.

GLB node layout (units: metres, three.js y-up):
  ur5e (z-up -> y-up)
    base (fixed body pose) -> base meshes
      shoulder_link (fixed body pose)
        shoulder_pan_joint (identity rest transform; rotate this node about its rig axis)
          shoulder_link meshes, upper_arm_link (fixed) -> shoulder_lift_joint -> ... -> wrist_3_joint
A joint angle theta is applied by setting the joint node's quaternion to a rotation of theta about
the joint's axis (given in the joint node's local frame in ur5e-rig.json).
"""
from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

from rvideo.assets.mesh_cleanup import MeshCleanup
from rvideo.assets.mjcf_frames import parse_vector, pose_matrix, z_up_to_y_up
from rvideo.assets.trailer_asset_paths import TrailerAssetPaths

KEEP_FRACTION: float = 0.35
CREASE_ANGLE_DEG: float = 35.0
DEFAULT_JOINT_AXIS: list[float] = [0.0, 1.0, 0.0]
ROUGHNESS_BY_MATERIAL: dict[str, float] = {"black": 0.55, "jointgray": 0.45, "linkgray": 0.35, "urblue": 0.4}
METALLIC_BY_MATERIAL: dict[str, float] = {"black": 0.0, "jointgray": 0.3, "linkgray": 0.6, "urblue": 0.0}


@dataclass(frozen=True)
class RigJoint:
    name: str
    node: str
    axis: list[float]
    range_rad: list[float]
    home_rad: float


@dataclass(frozen=True)
class Rig:
    model: str
    file: str
    source: str
    licence: str
    units: str
    up_axis: str
    root_node: str
    application: str
    joints: list[RigJoint]
    end_effector_node: str
    end_effector_offset_local: list[float]


class Ur5eConverter:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.tree = ET.parse(directory / "ur5e.xml").getroot()
        self.cleanup = MeshCleanup(CREASE_ANGLE_DEG)
        self.scene = trimesh.Scene(base_frame="world")
        self.joints: list[RigJoint] = []
        self.face_count = 0
        self.materials = {
            m.get("name", ""): parse_vector(m.get("rgba"), [1, 1, 1, 1]) for m in self.tree.iter("material")
        }
        self.class_ranges = {
            "size3": [-6.28319, 6.28319],
            "size3_limited": [-3.1415, 3.1415],
            "size1": [-6.28319, 6.28319],
        }
        home = self.tree.find("keyframe/key[@name='home']")
        if home is None:
            raise ValueError("ur5e.xml has no home keyframe")
        self.home = [float(v) for v in home.get("qpos", "").split()]

    def material(self, name: str) -> PBRMaterial:
        rgba = self.materials[name]
        return PBRMaterial(
            name=name,
            baseColorFactor=[float(c) for c in rgba],
            metallicFactor=METALLIC_BY_MATERIAL[name],
            roughnessFactor=ROUGHNESS_BY_MATERIAL[name],
        )

    def add_meshes(self, body: ET.Element, parent: str) -> None:
        for index, geom in enumerate(body.findall("geom")):
            mesh_name = geom.get("mesh")
            if mesh_name is None or geom.get("class") != "visual":
                continue
            raw = trimesh.load(self.directory / "assets" / f"{mesh_name}.obj", force="mesh", process=False)
            mesh = self.cleanup.clean(raw, KEEP_FRACTION)
            mesh.visual = trimesh.visual.TextureVisuals(material=self.material(geom.get("material", "")))
            self.face_count += len(mesh.faces)
            self.scene.add_geometry(
                mesh, node_name=f"{body.get('name')}_mesh{index}", geom_name=mesh_name, parent_node_name=parent
            )

    def add_body(self, body: ET.Element, parent: str) -> None:
        name = body.get("name", "")
        transform = pose_matrix(parse_vector(body.get("pos"), [0, 0, 0]), parse_vector(body.get("quat"), [1, 0, 0, 0]))
        self.scene.graph.update(frame_from=parent, frame_to=name, matrix=transform)
        attach = name
        joint = body.find("joint")
        if joint is not None:
            joint_name = joint.get("name", "")
            self.scene.graph.update(frame_from=name, frame_to=joint_name, matrix=np.eye(4))
            self.joints.append(
                RigJoint(
                    name=joint_name,
                    node=joint_name,
                    axis=[float(v) for v in parse_vector(joint.get("axis"), DEFAULT_JOINT_AXIS)],
                    range_rad=self.class_ranges[joint.get("class", "")],
                    home_rad=self.home[len(self.joints)],
                )
            )
            attach = joint_name
        self.add_meshes(body, attach)
        for child in body.findall("body"):
            self.add_body(child, attach)

    def convert(self) -> trimesh.Scene:
        self.scene.graph.update(frame_from="world", frame_to="ur5e", matrix=z_up_to_y_up())
        worldbody = self.tree.find("worldbody")
        if worldbody is None:
            raise ValueError("ur5e.xml has no worldbody")
        for body in worldbody.findall("body"):
            self.add_body(body, "ur5e")
        return self.scene


def main() -> None:
    paths = TrailerAssetPaths.from_repository()
    converter = Ur5eConverter(paths.ur5e_dir)
    scene = converter.convert()
    paths.models_dir.mkdir(parents=True, exist_ok=True)
    paths.robot_arm_glb.write_bytes(scene.export(file_type="glb", include_normals=True))
    rig = Rig(
        model="Universal Robots UR5e (MuJoCo Menagerie description)",
        file="ur5e.glb",
        source="https://github.com/google-deepmind/mujoco_menagerie/tree/main/universal_robots_ur5e",
        licence="BSD-3-Clause, Copyright 2018 ROS Industrial Consortium (see SOURCES.md)",
        units="metres",
        up_axis="+y (root node 'ur5e' rotates the MuJoCo z-up frame to y-up)",
        root_node="ur5e",
        application="set joint node quaternion = rotation(axis, theta); rest pose (theta = 0) is the identity",
        joints=converter.joints,
        end_effector_node="wrist_3_joint",
        end_effector_offset_local=[0.0, 0.1, 0.0],
    )
    paths.robot_arm_rig_json.write_text(json.dumps(asdict(rig), indent=2))
    print(f"faces={converter.face_count} joints={[j.name for j in converter.joints]}")
    print(f"wrote {paths.robot_arm_glb} ({paths.robot_arm_glb.stat().st_size} bytes)")
    print(f"wrote {paths.robot_arm_rig_json} ({paths.robot_arm_rig_json.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
