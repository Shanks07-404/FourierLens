import unittest
import numpy as np

from core.features import raw_features, fourier_features
from core.tiny_net import TinyMLP, generate_target_signal


class TestTinyNet(unittest.TestCase):
    def test_forward_shape(self):
        net = TinyMLP(in_dim=1, hidden_dim=32)
        X = np.linspace(-1, 1, 50)[:, None]
        out = net.forward(X)
        self.assertEqual(out.shape, (50, 1))

    def test_spectral_bias_gap(self):
        """Verify that Fourier features network achieves lower loss on square wave than raw network."""
        x, y = generate_target_signal("square", num_points=100)
        X_raw = raw_features(x)
        X_fourier = fourier_features(x, num_frequencies=6)

        net_raw = TinyMLP(in_dim=1, hidden_dim=48, optimizer="adam", lr=0.01, seed=42)
        net_fourier = TinyMLP(in_dim=12, hidden_dim=48, optimizer="adam", lr=0.01, seed=42)

        for _ in range(150):
            loss_raw = net_raw.train_step(X_raw, y)
            loss_fourier = net_fourier.train_step(X_fourier, y)

        # Fourier feature network should learn high-frequency discontinuities much faster
        self.assertLess(loss_fourier, loss_raw)
        self.assertLess(loss_fourier, 0.05)


if __name__ == "__main__":
    unittest.main()
