from __future__ import annotations
from typing import List, Tuple, Dict, Any, Optional
import numpy as np

from core.fourier import (
    Epicycle,
    path_to_epicycles,
    reconstruct_point,
    reconstruct_path,
    epicycle_frame,
)


class FourierReconstructionSession:
    """
    Manages epicycle state and progressive path reconstruction for a client connection.
    """

    def __init__(self) -> None:
        self.raw_path: List[Tuple[float, float]] = []
        self.epicycles: List[Epicycle] = []
        self.num_points: int = 200
        self._reconstruction_cache: Dict[Tuple[int, int], List[Tuple[float, float]]] = {}

    def set_path(self, points: List[Tuple[float, float]], num_points: int = 200) -> List[Epicycle]:
        """
        Sets a new path, computes epicycles sorted by descending radius.
        """
        self._reconstruction_cache.clear()
        if len(points) < 3:
            self.raw_path = []
            self.epicycles = []
            return []

        self.raw_path = points
        self.num_points = max(50, min(1000, num_points))
        self.epicycles = path_to_epicycles(points)
        return self.epicycles

    @property
    def total_terms(self) -> int:
        return len(self.epicycles)

    def get_epicycles_data(self) -> List[Dict[str, Any]]:
        """Returns metadata for all epicycles."""
        return [
            {
                "frequency": ep.frequency,
                "radius": ep.radius,
                "phase": ep.phase,
            }
            for ep in self.epicycles
        ]

    def get_reconstruction(self, num_terms: Optional[int] = None, num_points: Optional[int] = None) -> List[Tuple[float, float]]:
        """
        Reconstructs the full closed loop for a given number of terms.
        Memoizes results in _reconstruction_cache so interactive slider dragging
        and repeated sweeps avoid redundant evaluation.
        """
        if not self.epicycles:
            return []

        terms = self.total_terms if num_terms is None else min(max(1, num_terms), self.total_terms)
        pts = self.num_points if num_points is None else num_points

        cache_key = (terms, pts)
        if cache_key in self._reconstruction_cache:
            return self._reconstruction_cache[cache_key]

        reconstructed = reconstruct_path(self.epicycles, num_points=pts, num_terms=terms)
        self._reconstruction_cache[cache_key] = reconstructed
        return reconstructed

    def get_frame(self, t: float, num_terms: Optional[int] = None) -> Dict[str, Any]:
        """
        Generates tip-to-tail circle positions and the current pen tip location for normalized time t.
        """
        if not self.epicycles:
            return {
                "t": t,
                "num_terms": 0,
                "tip_point": (0.0, 0.0),
                "circles": [],
            }

        terms = self.total_terms if num_terms is None else min(max(1, num_terms), self.total_terms)
        circles = epicycle_frame(self.epicycles, t, num_terms=terms)
        tip_point = reconstruct_point(self.epicycles, t, num_terms=terms)

        return {
            "t": t,
            "num_terms": terms,
            "tip_point": tip_point,
            "circles": circles,
        }
