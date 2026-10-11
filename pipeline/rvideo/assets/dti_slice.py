"""Export one downsampled axial diffusion-tensor slice of the Stanford HARDI brain to JSON.

Run: .venv/bin/python -I -m rvideo.assets.dti_slice

Source: Stanford HARDI (Rokem et al., purl.stanford.edu/yx282xq2090, ODC-PDDL 1.0), files
dwi.nii.gz / dwi.bvals / dwi.bvecs downloaded into build/trailer-assets/raw/stanford_hardi/.

Frame: the image is stored RAS (checked). x = subject right, y = anterior, z = superior, which is
right-handed with z pointing out of the axial slice towards the viewer looking down from above.
Grid index i runs along x, j along y.

Downsampling: each output voxel is the Log-Euclidean mean of a 2x2 block of fitted tensors
(eigenvalues clipped to a small positive floor before the matrix logarithm).
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import contourpy
import nibabel as nib
import numpy as np
from dipy.core.gradients import gradient_table
from dipy.reconst.dti import TensorModel
from dipy.segment.mask import median_otsu
from scipy.ndimage import gaussian_filter

from rvideo.assets.trailer_asset_paths import TrailerAssetPaths

AXIAL_SLICE_INDEX: int = 37
BLOCK: int = 2
EIGENVALUE_FLOOR_MM2_PER_S: float = 1.0e-5
MASK_SMOOTHING_SIGMA_VOXELS: float = 1.0
MIN_LOOP_AREA_OUTPUT_VOXELS: float = 2.0


@dataclass(frozen=True)
class TensorVoxel:
    i: int
    j: int
    fa: float
    evals: list[float]
    evecs: list[list[float]]


@dataclass(frozen=True)
class OutlineLoops:
    outer: list[list[float]]
    holes: list[list[list[float]]]


@dataclass(frozen=True)
class DtiSlice:
    source: str
    licence: str
    frame: str
    slice_index_full_resolution: int
    full_resolution_shape: list[int]
    grid: list[int]
    voxel_spacing_mm: list[float]
    downsampling: str
    eigenvalue_scale_mm2_per_s: float
    eigenvalue_note: str
    outline_units: str
    outline: OutlineLoops
    voxel_count: int
    voxels: list[TensorVoxel]


def load_slice_tensors(directory: Path, k: int) -> tuple[np.ndarray, np.ndarray, tuple[float, float]]:
    """Return (tensor field [X,Y,3,3] in mm^2/s, brain mask [X,Y] bool, in-plane spacing mm)."""
    image = nib.load(str(directory / "dwi.nii.gz"))
    if nib.aff2axcodes(image.affine) != ("R", "A", "S"):
        raise ValueError(f"expected RAS image, got {nib.aff2axcodes(image.affine)}")
    data = np.asarray(image.dataobj, dtype=np.float32)
    bvals = np.loadtxt(directory / "dwi.bvals")
    bvecs = np.loadtxt(directory / "dwi.bvecs").T
    gtab = gradient_table(bvals, bvecs=bvecs)
    _, mask = median_otsu(data, vol_idx=range(10, 50), median_radius=3, numpass=1)
    fit = TensorModel(gtab).fit(data[:, :, k], mask=mask[:, :, k])
    zooms = image.header.get_zooms()
    return np.asarray(fit.quadratic_form, dtype=np.float64), mask[:, :, k].astype(bool), (float(zooms[0]), float(zooms[1]))


def spd_log(tensor: np.ndarray) -> np.ndarray:
    w, v = np.linalg.eigh(tensor)
    w = np.maximum(w, EIGENVALUE_FLOOR_MM2_PER_S)
    return (v * np.log(w)) @ v.T


def spd_exp(symmetric: np.ndarray) -> np.ndarray:
    w, v = np.linalg.eigh(symmetric)
    return (v * np.exp(w)) @ v.T


def fractional_anisotropy(evals: np.ndarray) -> float:
    mean = float(evals.mean())
    num = float(np.sqrt(((evals - mean) ** 2).sum()))
    den = float(np.sqrt((evals**2).sum()))
    return float(np.sqrt(1.5) * num / den)


def smoothed_mask(mask: np.ndarray) -> np.ndarray:
    return gaussian_filter(mask.astype(np.float64), MASK_SMOOTHING_SIGMA_VOXELS)


def loop_area(points: np.ndarray) -> float:
    x, y = points[:, 0], points[:, 1]
    return 0.5 * float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def mask_outline(soft_mask: np.ndarray) -> OutlineLoops:
    """Marching-squares contour of the smoothed mask at 0.5, in output-grid index units."""
    generator = contourpy.contour_generator(z=soft_mask.T, line_type=contourpy.LineType.Separate)
    loops = [np.asarray(line, dtype=np.float64) for line in generator.lines(0.5)]
    # full-resolution index p maps to output index (p - (BLOCK - 1) / 2) / BLOCK
    loops = [(loop - (BLOCK - 1) / 2.0) / BLOCK for loop in loops]
    loops = [loop for loop in loops if abs(loop_area(loop)) >= MIN_LOOP_AREA_OUTPUT_VOXELS]
    loops.sort(key=lambda loop: -abs(loop_area(loop)))
    if not loops:
        raise ValueError("mask produced no outline")

    def oriented(loop: np.ndarray, ccw: bool) -> list[list[float]]:
        if (loop_area(loop) > 0) != ccw:
            loop = loop[::-1]
        if np.allclose(loop[0], loop[-1]):
            loop = loop[:-1]
        return [[round(float(p[0]), 3), round(float(p[1]), 3)] for p in loop]

    return OutlineLoops(outer=oriented(loops[0], True), holes=[oriented(loop, False) for loop in loops[1:]])


def build_slice(paths: TrailerAssetPaths) -> DtiSlice:
    tensors, mask, spacing = load_slice_tensors(paths.stanford_hardi_dir, AXIAL_SLICE_INDEX)
    soft = smoothed_mask(mask)
    nx, ny = mask.shape[0] // BLOCK, mask.shape[1] // BLOCK

    blocks: list[tuple[int, int, np.ndarray, np.ndarray]] = []
    for i in range(nx):
        for j in range(ny):
            ii = slice(i * BLOCK, (i + 1) * BLOCK)
            jj = slice(j * BLOCK, (j + 1) * BLOCK)
            if float(soft[ii, jj].mean()) < 0.5 or not mask[ii, jj].any():
                continue
            members = tensors[ii, jj][mask[ii, jj]]
            mean = spd_exp(np.mean([spd_log(t) for t in members], axis=0))
            w, v = np.linalg.eigh(mean)
            order = np.argsort(w)[::-1]
            w, v = w[order], v[:, order]
            v[:, 2] = np.cross(v[:, 0], v[:, 1])
            blocks.append((i, j, w, v))

    scale = max(float(w[0]) for _, _, w, _ in blocks)
    voxels = [
        TensorVoxel(
            i=i,
            j=j,
            fa=round(fractional_anisotropy(w), 4),
            evals=[round(float(x / scale), 4) for x in w],
            evecs=[[round(float(c), 4) for c in v[:, n]] for n in range(3)],
        )
        for i, j, w, v in blocks
    ]
    return DtiSlice(
        source="Stanford HARDI, Rokem et al. 2013, https://purl.stanford.edu/yx282xq2090",
        licence="ODC-PDDL-1.0",
        frame="RAS: x = subject right (+i), y = anterior (+j), z = superior (out of slice); right-handed",
        slice_index_full_resolution=AXIAL_SLICE_INDEX,
        full_resolution_shape=[int(mask.shape[0]), int(mask.shape[1])],
        grid=[nx, ny],
        voxel_spacing_mm=[spacing[0] * BLOCK, spacing[1] * BLOCK],
        downsampling=f"Log-Euclidean mean of {BLOCK}x{BLOCK} blocks of DTI tensors (dipy TensorModel, WLS)",
        eigenvalue_scale_mm2_per_s=scale,
        eigenvalue_note="evals sorted descending; evals * eigenvalue_scale_mm2_per_s = diffusivity in mm^2/s; "
        "evecs[n] is the unit eigenvector of evals[n]; evecs[2] = evecs[0] x evecs[1]",
        outline_units="output grid index units (voxel centre of (i, j) at (i, j)); outer loop CCW, holes CW",
        outline=mask_outline(soft),
        voxel_count=len(voxels),
        voxels=voxels,
    )


def main() -> None:
    paths = TrailerAssetPaths.from_repository()
    result = build_slice(paths)
    paths.shipped_dir.mkdir(parents=True, exist_ok=True)
    paths.dti_slice_json.write_text(json.dumps(asdict(result), separators=(",", ":")))
    fa = np.array([v.fa for v in result.voxels])
    l1 = np.array([v.evals[0] for v in result.voxels])
    print(f"grid={result.grid} voxels={result.voxel_count} scale={result.eigenvalue_scale_mm2_per_s:.3e} mm^2/s")
    print(f"FA min/median/max={fa.min():.3f}/{np.median(fa):.3f}/{fa.max():.3f}")
    print(f"lambda1 (normalized) p5/p50/p95={np.percentile(l1, 5):.3f}/{np.median(l1):.3f}/{np.percentile(l1, 95):.3f}")
    print(f"outline outer={len(result.outline.outer)} pts holes={[len(h) for h in result.outline.holes]}")
    print(f"wrote {paths.dti_slice_json} ({paths.dti_slice_json.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
