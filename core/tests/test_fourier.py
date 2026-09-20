import unittest
import numpy as np

from core.fourier import (
    Epicycle,
    path_to_epicycles,
    reconstruct_point,
    reconstruct_path,
    epicycle_frame,
)
from core.features import (
    raw_features,
    fourier_features,
    output_dim,
)


class TestFourierMath(unittest.TestCase):
    def setUp(self):
        # Create a non-trivial closed path with rich high-frequency content (100 points)
        np.random.seed(123)
        walk = np.cumsum(np.random.randn(100, 2), axis=0)
        # Close the loop smoothly
        walk[-1] = walk[0]
        self.points = [(float(x), float(y)) for x, y in walk]

    def test_full_reconstruction_error(self):
        """1. Full reconstruction matches original path to <1e-8 error."""
        epicycles = path_to_epicycles(self.points)
        self.assertEqual(len(epicycles), len(self.points))

        # Reconstruct with all terms at the exact sample points
        reconstructed = reconstruct_path(epicycles, num_points=len(self.points), num_terms=len(epicycles))
        
        orig_arr = np.array(self.points)
        rec_arr = np.array(reconstructed)
        max_error = np.max(np.linalg.norm(orig_arr - rec_arr, axis=1))
        
        self.assertLess(max_error, 1e-8)

    def test_error_strictly_decreases_as_terms_increase(self):
        """2. Error strictly decreases as terms increase (1 -> 5 -> 20 -> all)."""
        epicycles = path_to_epicycles(self.points)
        orig_arr = np.array(self.points)
        
        term_counts = [1, 5, 20, len(epicycles)]
        errors = []
        for n_terms in term_counts:
            reconstructed = reconstruct_path(epicycles, num_points=len(self.points), num_terms=n_terms)
            rec_arr = np.array(reconstructed)
            mse = float(np.mean((orig_arr - rec_arr) ** 2))
            errors.append(mse)

        # Confirm strictly decreasing: errors[0] > errors[1] > errors[2] > errors[3]
        for i in range(len(errors) - 1):
            self.assertGreater(errors[i], errors[i + 1])

    def test_epicycle_ordering_descending(self):
        """3. Epicycles are sorted strictly descending by radius."""
        epicycles = path_to_epicycles(self.points)
        radii = [ep.radius for ep in epicycles]
        for i in range(len(radii) - 1):
            self.assertGreaterEqual(radii[i], radii[i + 1])

    def test_reconstruct_point_periodicity(self):
        """4. Reconstructed point is periodic: t=0 and t=1 evaluate to the same coordinates."""
        epicycles = path_to_epicycles(self.points)
        pt_0 = reconstruct_point(epicycles, 0.0, num_terms=10)
        pt_1 = reconstruct_point(epicycles, 1.0, num_terms=10)
        self.assertAlmostEqual(pt_0[0], pt_1[0], places=7)
        self.assertAlmostEqual(pt_0[1], pt_1[1], places=7)

    def test_epicycle_frame_tip_matches_point(self):
        """5. Chained tip-to-tail circles end exactly at the reconstructed point."""
        epicycles = path_to_epicycles(self.points)
        t = 0.37
        num_terms = 8
        frames = epicycle_frame(epicycles, t, num_terms=num_terms)
        self.assertEqual(len(frames), num_terms)

        last_frame = frames[-1]
        tip_x = last_frame["center"][0] + last_frame["radius"] * np.cos(last_frame["angle"])
        tip_y = last_frame["center"][1] + last_frame["radius"] * np.sin(last_frame["angle"])

        pt = reconstruct_point(epicycles, t, num_terms=num_terms)
        self.assertAlmostEqual(tip_x, pt[0], places=7)
        self.assertAlmostEqual(tip_y, pt[1], places=7)

    def test_raw_features_shape_and_identity(self):
        """6. raw_features returns (N, 1) unchanged."""
        x = np.array([-1.0, -0.5, 0.0, 0.5, 1.0])
        feats = raw_features(x)
        self.assertEqual(feats.shape, (5, 1))
        np.testing.assert_allclose(feats[:, 0], x)

    def test_fourier_features_shape_and_interleaving(self):
        """7. fourier_features shape is (N, 2 * k) with interleaved sin and cos."""
        x = np.linspace(-1.0, 1.0, 20)
        k = 4
        feats = fourier_features(x, num_frequencies=k)
        self.assertEqual(feats.shape, (20, 2 * k))

        # Check sin and cos interleaving for first frequency (2^0 * pi = pi)
        np.testing.assert_allclose(feats[:, 0], np.sin(np.pi * x))
        np.testing.assert_allclose(feats[:, 1], np.cos(np.pi * x))

    def test_fourier_features_known_values(self):
        """8. fourier_features checks known values at x=0 and x=0.5."""
        x_zero = np.array([0.0])
        feats_zero = fourier_features(x_zero, num_frequencies=3)
        # sin(freq * 0) = 0, cos(freq * 0) = 1
        expected = np.array([[0.0, 1.0, 0.0, 1.0, 0.0, 1.0]])
        np.testing.assert_allclose(feats_zero, expected, atol=1e-7)

        # For x=0.5, frequency 0: 2^0 * pi * 0.5 = pi/2 -> sin=1, cos=0
        x_half = np.array([0.5])
        feats_half = fourier_features(x_half, num_frequencies=1)
        self.assertAlmostEqual(feats_half[0, 0], 1.0, places=6)
        self.assertAlmostEqual(feats_half[0, 1], 0.0, places=6)

    def test_output_dim_helper(self):
        """9. output_dim returns 2 * num_frequencies."""
        self.assertEqual(output_dim(1), 2)
        self.assertEqual(output_dim(6), 12)
        self.assertEqual(output_dim(16), 32)

    def test_minimal_two_point_path(self):
        """10. Minimal 2-point path returns epicycles and reconstructs without error."""
        min_pts = [(0.0, 0.0), (10.0, 20.0)]
        epicycles = path_to_epicycles(min_pts)
        self.assertEqual(len(epicycles), 2)

        reconstructed = reconstruct_path(epicycles, num_points=2, num_terms=2)
        self.assertEqual(len(reconstructed), 2)
        np.testing.assert_allclose(reconstructed, min_pts, atol=1e-8)

    def test_zero_terms_and_empty_path(self):
        """11. Edge case handling for zero terms and empty path."""
        epicycles = path_to_epicycles(self.points)

        # num_terms = 0
        frames = epicycle_frame(epicycles, t=0.5, num_terms=0)
        self.assertEqual(frames, [])

        pt = reconstruct_point(epicycles, t=0.5, num_terms=0)
        self.assertEqual(pt, (0.0, 0.0))

        # Empty path input
        self.assertEqual(path_to_epicycles([]), [])

    def test_zero_sample_points_reconstruction(self):
        """12. Edge case handling for zero sample points in reconstruct_path."""
        epicycles = path_to_epicycles(self.points)
        self.assertEqual(reconstruct_path(epicycles, num_points=0, num_terms=5), [])
        self.assertEqual(reconstruct_path([], num_points=20, num_terms=5), [])


if __name__ == "__main__":
    unittest.main()
