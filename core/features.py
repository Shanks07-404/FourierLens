from __future__ import annotations
import numpy as np


def raw_features(x: np.ndarray) -> np.ndarray:
    """
    Returns the coordinate unchanged with shape (N, 1).
    """
    arr = np.asarray(x, dtype=np.float64)
    return arr.reshape(-1, 1)


def fourier_features(x: np.ndarray, num_frequencies: int = 6) -> np.ndarray:
    """
    Returns Fourier feature encodings of shape (N, 2 * num_frequencies).
    Interleaved: [sin(2^0 * pi * x), cos(2^0 * pi * x), sin(2^1 * pi * x), cos(2^1 * pi * x), ...].
    """
    arr = np.asarray(x, dtype=np.float64).reshape(-1, 1)
    N = arr.shape[0]
    out = np.zeros((N, 2 * num_frequencies), dtype=np.float64)

    for k in range(num_frequencies):
        freq = (2.0 ** k) * np.pi
        out[:, 2 * k] = np.sin(freq * arr[:, 0])
        out[:, 2 * k + 1] = np.cos(freq * arr[:, 0])

    return out


def output_dim(num_frequencies: int) -> int:
    """
    Convenience helper returning the feature dimension (2 * num_frequencies).
    """
    return 2 * num_frequencies
