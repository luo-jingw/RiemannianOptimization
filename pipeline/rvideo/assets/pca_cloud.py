"""Export a 3D PCA view of the UCI Dry Bean dataset to JSON.

Run: .venv/bin/python -I -m rvideo.assets.pca_cloud

Source: Dry Bean Dataset, Koklu & Ozkan 2020, UCI Machine Learning Repository,
https://doi.org/10.24432/C50S4B, CC BY 4.0. 13 611 beans, 16 shape features, 7 varieties.

Steps: standardize the 16 features (z-scores over all beans), project onto the top 3 principal
components, drop per-class outliers (within-class Mahalanobis distance in the 3D score space above
the class's 98th percentile), draw a class-stratified random subset (fixed seed), scale so the 99th-percentile radius
is 1, and rotate by a fixed tilt so the dominant plane is oblique to the coordinate axes. The
principal directions and singular values reported in the JSON are recomputed from the exported,
centred 3D points, so they describe exactly what a scene draws.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np

from rvideo.assets.trailer_asset_paths import TrailerAssetPaths

SEED: int = 7223
PER_CLASS: int = 340
OUTLIER_QUANTILE: float = 0.98
TILT_EULER_XYZ_DEG: tuple[float, float, float] = (-62.0, 18.0, 25.0)


@dataclass(frozen=True)
class BeanTable:
    features: np.ndarray
    labels: list[str]
    feature_names: list[str]


@dataclass(frozen=True)
class PcaCloud:
    source: str
    licence: str
    feature_names: list[str]
    class_names: list[str]
    full_dataset_size: int
    point_count: int
    explained_variance_ratio_16d_top3: list[float]
    method: str
    points: list[list[float]]
    labels: list[int]
    principal_directions: list[list[float]]
    singular_values: list[float]
    singular_values_all3: list[float]


def read_arff(path: Path) -> BeanTable:
    names: list[str] = []
    rows: list[list[float]] = []
    labels: list[str] = []
    in_data = False
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("%"):
            continue
        upper = line.upper()
        if upper.startswith("@ATTRIBUTE"):
            names.append(line.split()[1])
        elif upper == "@DATA":
            in_data = True
        elif in_data:
            parts = line.split(",")
            rows.append([float(x) for x in parts[:-1]])
            labels.append(parts[-1].strip())
    return BeanTable(features=np.asarray(rows, dtype=np.float64), labels=labels, feature_names=names[:-1])


def rotation_xyz(degrees: tuple[float, float, float]) -> np.ndarray:
    ax, ay, az = np.radians(degrees)
    rx = np.array([[1, 0, 0], [0, np.cos(ax), -np.sin(ax)], [0, np.sin(ax), np.cos(ax)]])
    ry = np.array([[np.cos(ay), 0, np.sin(ay)], [0, 1, 0], [-np.sin(ay), 0, np.cos(ay)]])
    rz = np.array([[np.cos(az), -np.sin(az), 0], [np.sin(az), np.cos(az), 0], [0, 0, 1]])
    return rz @ ry @ rx


def within_class_inliers(scores: np.ndarray) -> np.ndarray:
    centred = scores - scores.mean(axis=0)
    precision = np.linalg.inv(np.cov(centred.T))
    distance = np.einsum("ni,ij,nj->n", centred, precision, centred)
    return distance <= np.quantile(distance, OUTLIER_QUANTILE)


def build_cloud(paths: TrailerAssetPaths) -> PcaCloud:
    table = read_arff(paths.dry_bean_arff)
    x = table.features
    z = (x - x.mean(axis=0)) / x.std(axis=0)
    _, s16, vt = np.linalg.svd(z, full_matrices=False)
    ratio = s16**2 / float((s16**2).sum())
    scores = z @ vt[:3].T

    class_names = sorted(set(table.labels))
    label_index = np.array([class_names.index(name) for name in table.labels])
    rng = np.random.default_rng(SEED)
    chosen: list[int] = []
    for c in range(len(class_names)):
        members = np.flatnonzero(label_index == c)
        members = members[within_class_inliers(scores[members])]
        chosen.extend(rng.choice(members, size=min(PER_CLASS, members.size), replace=False).tolist())
    chosen_a = np.array(sorted(chosen))

    pts = scores[chosen_a]
    pts = pts - pts.mean(axis=0)
    pts = pts / float(np.percentile(np.linalg.norm(pts, axis=1), 99))
    pts = pts @ rotation_xyz(TILT_EULER_XYZ_DEG).T
    pts = np.round(pts, 4)
    pts = pts - pts.mean(axis=0)
    _, s3, v3 = np.linalg.svd(pts, full_matrices=False)

    return PcaCloud(
        source="Dry Bean Dataset, Koklu & Ozkan 2020, UCI ML Repository, https://doi.org/10.24432/C50S4B",
        licence="CC BY 4.0",
        feature_names=table.feature_names,
        class_names=class_names,
        full_dataset_size=int(x.shape[0]),
        point_count=int(chosen_a.size),
        explained_variance_ratio_16d_top3=[round(float(r), 4) for r in ratio[:3]],
        method=(
            f"z-score 16 features; project on top-3 PCs; drop within-class Mahalanobis outliers above q{OUTLIER_QUANTILE}; stratified subset {PER_CLASS}/class (seed {SEED}); "
            f"scale 99th-pct radius to 1; rotate Euler XYZ {list(TILT_EULER_XYZ_DEG)} deg; "
            "principal_directions/singular_values from SVD of the exported centred points"
        ),
        points=[[float(c) for c in p] for p in pts],
        labels=[int(label_index[k]) for k in chosen_a],
        principal_directions=[[round(float(c), 6) for c in v3[n]] for n in range(2)],
        singular_values=[round(float(s), 4) for s in s3[:2]],
        singular_values_all3=[round(float(s), 4) for s in s3],
    )


def main() -> None:
    paths = TrailerAssetPaths.from_repository()
    cloud = build_cloud(paths)
    paths.shipped_dir.mkdir(parents=True, exist_ok=True)
    paths.pca_cloud_json.write_text(json.dumps(asdict(cloud), separators=(",", ":")))
    pts = np.array(cloud.points)
    counts = np.bincount(np.array(cloud.labels))
    print(f"points={cloud.point_count} per class={dict(zip(cloud.class_names, counts.tolist()))}")
    print(f"16D variance ratio top3={cloud.explained_variance_ratio_16d_top3}")
    print(f"3D singular values={cloud.singular_values_all3} s3/s2={cloud.singular_values_all3[2] / cloud.singular_values_all3[1]:.3f}")
    print(f"extent min={pts.min(axis=0)} max={pts.max(axis=0)} mean={pts.mean(axis=0)}")
    print(f"wrote {paths.pca_cloud_json} ({paths.pca_cloud_json.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
