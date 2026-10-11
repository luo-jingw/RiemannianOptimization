"""Frame helpers for MuJoCo MJCF attributes (pos, quat in w-x-y-z order) as 4x4 matrices."""
from __future__ import annotations

import numpy as np


def parse_vector(text: str | None, default: list[float]) -> np.ndarray:
    if text is None:
        return np.array(default, dtype=np.float64)
    return np.array([float(v) for v in text.split()], dtype=np.float64)


def quaternion_wxyz_matrix(q: np.ndarray) -> np.ndarray:
    w, x, y, z = q / np.linalg.norm(q)
    return np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
            [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
            [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
        ]
    )


def pose_matrix(pos: np.ndarray, quat_wxyz: np.ndarray) -> np.ndarray:
    m = np.eye(4)
    m[:3, :3] = quaternion_wxyz_matrix(quat_wxyz)
    m[:3, 3] = pos
    return m


def z_up_to_y_up() -> np.ndarray:
    """Rotation of -90 degrees about x: MuJoCo +z (up) becomes three.js +y (up)."""
    m = np.eye(4)
    m[1:3, 1:3] = np.array([[0.0, 1.0], [-1.0, 0.0]])
    return m
