from __future__ import annotations
from dataclasses import dataclass
import numpy as np


@dataclass
class Epicycle:
    frequency: int
    radius: float
    phase: float


def path_to_epicycles(points: list[tuple[float, float]]) -> list[Epicycle]:
    """
    Runs a Discrete Fourier Transform (DFT) on a drawn path (as complex numbers x + iy).
    Returns epicycles sorted by descending radius so truncating to the first N gives
    the best N-term reconstruction.
    """
    N = len(points)
    if N == 0:
        return []

    # Convert coordinates to complex numbers z = x + iy
    z = np.array([p[0] + 1j * p[1] for p in points], dtype=np.complex128)

    # Standard DFT via FFT: c_k = (1/N) * sum_{n=0}^{N-1} z_n * exp(-i * 2pi * k * n / N)
    fft_vals = np.fft.fft(z) / N
    freqs = np.fft.fftfreq(N, d=1.0 / N).astype(int)

    epicycles: list[Epicycle] = []
    for k in range(N):
        c_k = fft_vals[k]
        freq = int(freqs[k])
        radius = float(np.abs(c_k))
        phase = float(np.angle(c_k))
        epicycles.append(Epicycle(frequency=freq, radius=radius, phase=phase))

    # Sort descending by radius
    epicycles.sort(key=lambda ep: ep.radius, reverse=True)
    return epicycles


def reconstruct_point(epicycles: list[Epicycle], t: float, num_terms: int) -> tuple[float, float]:
    """
    The traced point at normalized time t (0.0 to 1.0, one full loop)
    using only the first num_terms epicycles.
    """
    terms = epicycles[:num_terms]
    if not terms:
        return (0.0, 0.0)

    x = 0.0
    y = 0.0
    for ep in terms:
        angle = 2.0 * np.pi * ep.frequency * t + ep.phase
        x += ep.radius * np.cos(angle)
        y += ep.radius * np.sin(angle)

    return (float(x), float(y))


def reconstruct_path(epicycles: list[Epicycle], num_points: int, num_terms: int) -> list[tuple[float, float]]:
    """
    A full closed path sampled at num_points, for rendering one reconstruction frame.
    """
    if num_points <= 0 or not epicycles:
        return []

    # Sample t uniformly in [0, 1)
    ts = np.linspace(0.0, 1.0, num_points, endpoint=False)
    return [reconstruct_point(epicycles, float(t), num_terms) for t in ts]


def epicycle_frame(epicycles: list[Epicycle], t: float, num_terms: int) -> list[dict]:
    """
    For the classic "circles chained tip to tail" animation:
    returns each circle's running {center, radius, angle} in drawing order,
    so the frontend can draw each circle and connect it to the next one's center.
    """
    terms = epicycles[:num_terms]
    frames: list[dict] = []

    curr_x = 0.0
    curr_y = 0.0

    for ep in terms:
        angle = 2.0 * np.pi * ep.frequency * t + ep.phase
        frames.append({
            "center": (curr_x, curr_y),
            "radius": float(ep.radius),
            "angle": float(angle),
            "frequency": ep.frequency,
            "phase": ep.phase
        })
        curr_x += ep.radius * np.cos(angle)
        curr_y += ep.radius * np.sin(angle)

    return frames
