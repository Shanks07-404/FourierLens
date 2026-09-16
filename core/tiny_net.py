from __future__ import annotations
from typing import Literal
import numpy as np


class TinyMLP:
    """
    A minimal feedforward neural network fitting a 1D function f(x).
    Architecture: Linear -> Act -> Linear -> Act -> Linear (1D output).
    Trained with gradient descent (plain SGD or Adam) using pure NumPy.
    """

    def __init__(
        self,
        in_dim: int,
        hidden_dim: int = 64,
        activation: Literal["relu", "tanh"] = "relu",
        optimizer: Literal["sgd", "adam"] = "adam",
        lr: float = 0.01,
        seed: int = 42,
    ) -> None:
        self.in_dim = in_dim
        self.hidden_dim = hidden_dim
        self.activation = activation
        self.optimizer = optimizer
        self.lr = lr
        self.seed = seed

        self.reset(seed)

    def reset(self, seed: int | None = None) -> None:
        """Resets weights and optimizer state."""
        if seed is not None:
            self.seed = seed
        rng = np.random.RandomState(self.seed)

        # Weight initialization: He for ReLU, Xavier for Tanh
        scale1 = np.sqrt(2.0 / self.in_dim) if self.activation == "relu" else np.sqrt(1.0 / self.in_dim)
        scale2 = np.sqrt(2.0 / self.hidden_dim) if self.activation == "relu" else np.sqrt(1.0 / self.hidden_dim)
        scale3 = np.sqrt(2.0 / self.hidden_dim) if self.activation == "relu" else np.sqrt(1.0 / self.hidden_dim)

        self.W1 = rng.randn(self.in_dim, self.hidden_dim) * scale1
        self.b1 = np.zeros((1, self.hidden_dim))

        self.W2 = rng.randn(self.hidden_dim, self.hidden_dim) * scale2
        self.b2 = np.zeros((1, self.hidden_dim))

        self.W3 = rng.randn(self.hidden_dim, 1) * scale3
        self.b3 = np.zeros((1, 1))

        # Optimizer state
        self.m_W1 = np.zeros_like(self.W1)
        self.v_W1 = np.zeros_like(self.W1)
        self.m_b1 = np.zeros_like(self.b1)
        self.v_b1 = np.zeros_like(self.b1)

        self.m_W2 = np.zeros_like(self.W2)
        self.v_W2 = np.zeros_like(self.W2)
        self.m_b2 = np.zeros_like(self.b2)
        self.v_b2 = np.zeros_like(self.b2)

        self.m_W3 = np.zeros_like(self.W3)
        self.v_W3 = np.zeros_like(self.W3)
        self.m_b3 = np.zeros_like(self.b3)
        self.v_b3 = np.zeros_like(self.b3)

        self.step_count = 0

    def forward(self, X: np.ndarray) -> np.ndarray:
        """Forward pass through network."""
        self.X_cache = X
        self.z1 = X @ self.W1 + self.b1
        self.a1 = np.maximum(0.0, self.z1) if self.activation == "relu" else np.tanh(self.z1)

        self.z2 = self.a1 @ self.W2 + self.b2
        self.a2 = np.maximum(0.0, self.z2) if self.activation == "relu" else np.tanh(self.z2)

        self.z3 = self.a2 @ self.W3 + self.b3
        return self.z3

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Computes predictions without mutating backprop cache unnecessarily."""
        z1 = X @ self.W1 + self.b1
        a1 = np.maximum(0.0, z1) if self.activation == "relu" else np.tanh(z1)
        z2 = a1 @ self.W2 + self.b2
        a2 = np.maximum(0.0, z2) if self.activation == "relu" else np.tanh(z2)
        return a2 @ self.W3 + self.b3

    def train_step(self, X: np.ndarray, y: np.ndarray) -> float:
        """Executes one gradient descent training step and returns the MSE loss."""
        N = X.shape[0]
        pred = self.forward(X)
        loss = float(np.mean((pred - y) ** 2))

        # Output layer gradients (dLoss/dpred = 2 * (pred - y) / N)
        d_out = 2.0 * (pred - y) / N
        dW3 = self.a2.T @ d_out
        db3 = np.sum(d_out, axis=0, keepdims=True)

        # Hidden layer 2 gradients
        da2 = d_out @ self.W3.T
        dz2 = da2 * (self.z2 > 0.0) if self.activation == "relu" else da2 * (1.0 - self.a2 ** 2)
        dW2 = self.a1.T @ dz2
        db2 = np.sum(dz2, axis=0, keepdims=True)

        # Hidden layer 1 gradients
        da1 = dz2 @ self.W2.T
        dz1 = da1 * (self.z1 > 0.0) if self.activation == "relu" else da1 * (1.0 - self.a1 ** 2)
        dW1 = self.X_cache.T @ dz1
        db1 = np.sum(dz1, axis=0, keepdims=True)

        # Parameter update
        if self.optimizer == "sgd":
            self.W1 -= self.lr * dW1
            self.b1 -= self.lr * db1
            self.W2 -= self.lr * dW2
            self.b2 -= self.lr * db2
            self.W3 -= self.lr * dW3
            self.b3 -= self.lr * db3
        else:
            # Adam optimization
            self.step_count += 1
            beta1 = 0.9
            beta2 = 0.999
            eps = 1e-8

            params = [
                (self.W1, dW1, self.m_W1, self.v_W1),
                (self.b1, db1, self.m_b1, self.v_b1),
                (self.W2, dW2, self.m_W2, self.v_W2),
                (self.b2, db2, self.m_b2, self.v_b2),
                (self.W3, dW3, self.m_W3, self.v_W3),
                (self.b3, db3, self.m_b3, self.v_b3),
            ]

            for param, grad, m, v in params:
                m[:] = beta1 * m + (1.0 - beta1) * grad
                v[:] = beta2 * v + (1.0 - beta2) * (grad ** 2)
                m_corr = m / (1.0 - beta1 ** self.step_count)
                v_corr = v / (1.0 - beta2 ** self.step_count)
                param -= self.lr * m_corr / (np.sqrt(v_corr) + eps)

        return loss


def generate_target_signal(signal_type: str = "square", num_points: int = 200) -> tuple[np.ndarray, np.ndarray]:
    """
    Generates a 1D synthetic target signal with genuine sharp detail over x in [-1, 1].
    signal_type:
      - 'square': square wave with sharp jump discontinuities
      - 'spike': narrow impulse spike at center
      - 'step': Heaviside step at x=0
    """
    x = np.linspace(-1.0, 1.0, num_points, dtype=np.float64)

    if signal_type == "spike":
        # Narrow impulse spike between -0.15 and 0.15
        y = np.where(np.abs(x) < 0.15, 1.0, -1.0)[:, None]
    elif signal_type == "step":
        # Single sharp step function
        y = np.where(x >= 0.0, 1.0, -1.0)[:, None]
    else:
        # Default: periodic square wave
        y = np.where(np.sin(2.0 * np.pi * x) >= 0.0, 1.0, -1.0)[:, None]

    return x, y
