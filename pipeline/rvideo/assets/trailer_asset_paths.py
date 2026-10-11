"""Path layout for trailer asset preparation: raw downloads, shipped files, previews."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class TrailerAssetPaths:
    root: Path

    @staticmethod
    def from_repository() -> "TrailerAssetPaths":
        return TrailerAssetPaths(root=Path(__file__).resolve().parents[3])

    @property
    def raw_dir(self) -> Path:
        return self.root / "build" / "trailer-assets" / "raw"

    @property
    def preview_dir(self) -> Path:
        return self.root / "build" / "trailer-assets" / "previews"

    @property
    def shipped_dir(self) -> Path:
        return self.root / "player" / "public" / "trailer"

    @property
    def models_dir(self) -> Path:
        return self.shipped_dir / "models"

    @property
    def stanford_hardi_dir(self) -> Path:
        return self.raw_dir / "stanford_hardi"

    @property
    def dry_bean_arff(self) -> Path:
        return self.raw_dir / "dry_bean" / "DryBeanDataset" / "Dry_Bean_Dataset.arff"

    @property
    def ur5e_dir(self) -> Path:
        return self.raw_dir / "universal_robots_ur5e"

    @property
    def x2_dir(self) -> Path:
        return self.raw_dir / "skydio_x2"

    @property
    def dti_slice_json(self) -> Path:
        return self.shipped_dir / "dti-slice.json"

    @property
    def pca_cloud_json(self) -> Path:
        return self.shipped_dir / "pca-cloud.json"

    @property
    def robot_arm_glb(self) -> Path:
        return self.models_dir / "ur5e.glb"

    @property
    def robot_arm_rig_json(self) -> Path:
        return self.models_dir / "ur5e-rig.json"

    @property
    def drone_glb(self) -> Path:
        return self.models_dir / "skydio-x2.glb"
