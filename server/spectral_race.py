from __future__ import annotations
from typing import Dict, Any, Optional
import numpy as np

from core.features import raw_features, fourier_features
from core.tiny_net import TinyMLP, generate_target_signal
from server.schemas import SpectralConfig


class SpectralRaceSession:
    """
    Manages lockstep training of the raw coordinate network vs. Fourier feature network.
    """

    def __init__(self, config: Optional[SpectralConfig] = None) -> None:
        self.config = config or SpectralConfig()
        self.epoch = 0
        self.state = "idle"  # idle, running, paused
        self.setup_data_and_models()

    def setup_data_and_models(self) -> None:
        """Initializes dataset and identical architectures."""
        self.x, self.y = generate_target_signal(
            signal_type=self.config.signal_type,
            num_points=self.config.num_points,
        )

        self.X_raw = raw_features(self.x)
        self.X_fourier = fourier_features(self.x, num_frequencies=self.config.num_frequencies)

        fourier_dim = 2 * self.config.num_frequencies

        self.net_raw = TinyMLP(
            in_dim=1,
            hidden_dim=self.config.hidden_dim,
            activation=self.config.activation,
            optimizer=self.config.optimizer,
            lr=self.config.lr,
            seed=42,
        )

        self.net_fourier = TinyMLP(
            in_dim=fourier_dim,
            hidden_dim=self.config.hidden_dim,
            activation=self.config.activation,
            optimizer=self.config.optimizer,
            lr=self.config.lr,
            seed=42,
        )

        self.epoch = 0

    def reset(self, config: Optional[SpectralConfig] = None) -> None:
        """Resets training progression and models."""
        if config is not None:
            self.config = config
        self.setup_data_and_models()
        self.state = "idle"

    def update_config(self, config: SpectralConfig) -> None:
        """Updates configuration and re-initializes."""
        self.config = config
        self.setup_data_and_models()

    def train_steps(self, num_steps: Optional[int] = None) -> Dict[str, Any]:
        """Executes lockstep training steps for both networks."""
        steps = num_steps or self.config.steps_per_tick

        loss_raw = 0.0
        loss_fourier = 0.0

        for _ in range(steps):
            loss_raw = self.net_raw.train_step(self.X_raw, self.y)
            loss_fourier = self.net_fourier.train_step(self.X_fourier, self.y)
            self.epoch += 1

        pred_raw = self.net_raw.predict(self.X_raw)
        pred_fourier = self.net_fourier.predict(self.X_fourier)

        return {
            "type": "step",
            "epoch": self.epoch,
            "loss_raw": float(loss_raw),
            "loss_fourier": float(loss_fourier),
            "x": self.x.tolist(),
            "y_target": self.y.ravel().tolist(),
            "y_pred_raw": pred_raw.ravel().tolist(),
            "y_pred_fourier": pred_fourier.ravel().tolist(),
        }

    def current_state(self) -> Dict[str, Any]:
        """Returns predictions and losses for current epoch without taking a training step."""
        pred_raw = self.net_raw.predict(self.X_raw)
        pred_fourier = self.net_fourier.predict(self.X_fourier)
        loss_raw = float(np.mean((pred_raw - self.y) ** 2))
        loss_fourier = float(np.mean((pred_fourier - self.y) ** 2))

        return {
            "type": "step",
            "epoch": self.epoch,
            "loss_raw": loss_raw,
            "loss_fourier": loss_fourier,
            "x": self.x.tolist(),
            "y_target": self.y.ravel().tolist(),
            "y_pred_raw": pred_raw.ravel().tolist(),
            "y_pred_fourier": pred_fourier.ravel().tolist(),
        }
