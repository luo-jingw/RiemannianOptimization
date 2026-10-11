"""Render a matplotlib preview of player/public/trailer/dti-slice.json.

Run: .venv/bin/python -I -m rvideo.assets.preview_dti_slice

Each voxel is drawn as the in-plane (xy) section of its tensor ellipsoid, scaled so its long axis
spans one voxel (semi-axes proportional to eigenvalues), coloured by the absolute
principal eigenvector (red = left-right, green = anterior-posterior, blue = superior-inferior)
weighted by FA. The brain outline and holes are drawn on top.
"""
from __future__ import annotations

import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.collections import EllipseCollection  # noqa: E402

from rvideo.assets.trailer_asset_paths import TrailerAssetPaths  # noqa: E402


def main() -> None:
    paths = TrailerAssetPaths.from_repository()
    data = json.loads(paths.dti_slice_json.read_text())
    voxels = data["voxels"]
    centres = np.array([[v["i"], v["j"]] for v in voxels], dtype=np.float64)
    widths, heights, angles, colours = [], [], [], []
    for v in voxels:
        lam = np.array(v["evals"])
        vec = np.array(v["evecs"])
        tensor = (vec.T * lam) @ vec
        w, u = np.linalg.eigh(tensor[:2, :2])
        largest = u[:, 1]
        widths.append(1.0)
        heights.append(max(w[0], 0.0) / w[1])
        angles.append(np.degrees(np.arctan2(largest[1], largest[0])))
        colours.append(np.clip(np.abs(vec[0]) * (0.25 + 0.75 * v["fa"]), 0, 1))
    widths_a = np.array(widths)
    norm = 0.92
    fig, ax = plt.subplots(figsize=(8, 10), facecolor="#0b0d12")
    ax.set_facecolor("#0b0d12")
    ax.add_collection(
        EllipseCollection(
            widths_a * norm,
            np.array(heights) * norm,
            np.array(angles),
            units="xy",
            offsets=centres,
            offset_transform=ax.transData,
            facecolors=np.array(colours),
            edgecolors="none",
        )
    )
    outer = np.array(data["outline"]["outer"] + data["outline"]["outer"][:1])
    ax.plot(outer[:, 0], outer[:, 1], color="#cfd6e4", lw=1.2)
    for hole in data["outline"]["holes"]:
        h = np.array(hole + hole[:1])
        ax.plot(h[:, 0], h[:, 1], color="#cfd6e4", lw=0.8, alpha=0.6)
    gx, gy = data["grid"]
    ax.set_xlim(-1, gx)
    ax.set_ylim(-1, gy)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(
        f"DTI slice k={data['slice_index_full_resolution']}  grid {gx}x{gy}  {data['voxel_count']} voxels",
        color="#cfd6e4",
    )
    paths.preview_dir.mkdir(parents=True, exist_ok=True)
    out = paths.preview_dir / "dti-slice.png"
    fig.savefig(out, dpi=110, facecolor=fig.get_facecolor())
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
