"""Render a matplotlib preview of player/public/trailer/pca-cloud.json.

Run: .venv/bin/python -I -m rvideo.assets.preview_pca_cloud

Left: oblique 3D view with the plane spanned by the top-2 principal directions. Right: edge-on view
along the second principal direction, showing how thin the cloud is out of the plane.
"""
from __future__ import annotations

import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from rvideo.assets.trailer_asset_paths import TrailerAssetPaths  # noqa: E402

PALETTE: list[str] = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1"]


def main() -> None:
    paths = TrailerAssetPaths.from_repository()
    data = json.loads(paths.pca_cloud_json.read_text())
    pts = np.array(data["points"])
    labels = np.array(data["labels"])
    e1, e2 = (np.array(d) for d in data["principal_directions"])
    normal = np.cross(e1, e2)
    colours = np.array(PALETTE)[labels]

    fig = plt.figure(figsize=(14, 7), facecolor="#0b0d12")
    ax = fig.add_subplot(1, 2, 1, projection="3d")
    ax.set_facecolor("#0b0d12")
    u, v = pts @ e1, pts @ e2
    gu, gv = np.meshgrid(np.linspace(u.min(), u.max(), 2), np.linspace(v.min(), v.max(), 2))
    plane = gu[..., None] * e1 + gv[..., None] * e2
    ax.plot_surface(plane[..., 0], plane[..., 1], plane[..., 2], color="#9fb3d9", alpha=0.18, linewidth=0)
    ax.scatter(pts[:, 0], pts[:, 1], pts[:, 2], c=colours, s=3, depthshade=False)
    ax.view_init(elev=22, azim=-58)
    ax.set_box_aspect((1, 1, 1))
    lim = float(np.abs(pts).max())
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim, lim)
    ax.set_zlim(-lim, lim)
    ax.set_axis_off()
    ax.set_title("3D view + top-2 principal plane", color="#cfd6e4")

    side = fig.add_subplot(1, 2, 2)
    side.set_facecolor("#0b0d12")
    side.scatter(pts @ e1, pts @ normal, c=colours, s=3)
    side.set_aspect("equal")
    side.set_xlabel("along e1", color="#cfd6e4")
    side.set_ylabel("along normal e1 x e2", color="#cfd6e4")
    side.tick_params(colors="#cfd6e4")
    s = data["singular_values_all3"]
    side.set_title(f"edge-on; singular values {s}", color="#cfd6e4")
    for name, colour in zip(data["class_names"], PALETTE):
        side.scatter([], [], c=colour, s=20, label=name)
    side.legend(loc="lower right", fontsize=8, facecolor="#0b0d12", labelcolor="#cfd6e4", edgecolor="none")

    paths.preview_dir.mkdir(parents=True, exist_ok=True)
    out = paths.preview_dir / "pca-cloud.png"
    fig.savefig(out, dpi=100, facecolor=fig.get_facecolor())
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
