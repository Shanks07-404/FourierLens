from __future__ import annotations
from typing import Literal, Optional, List, Tuple
from pydantic import BaseModel, Field


# ================= Fourier / Epicycles Schemas =================

class EpicycleItem(BaseModel):
    frequency: int
    radius: float
    phase: float


class CircleFrameItem(BaseModel):
    center: Tuple[float, float]
    radius: float
    angle: float
    frequency: int


class FourierRequest(BaseModel):
    action: Literal["set_path", "set_terms", "get_frame", "sweep", "ping"]
    path: Optional[List[Tuple[float, float]]] = None
    num_points: Optional[int] = Field(default=200, ge=10, le=2000)
    num_terms: Optional[int] = Field(default=None, ge=1)
    t: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)


class EpicyclesResponse(BaseModel):
    type: Literal["epicycles"] = "epicycles"
    total_terms: int
    epicycles: List[EpicycleItem]


class ReconstructionResponse(BaseModel):
    type: Literal["reconstruction"] = "reconstruction"
    num_terms: int
    total_terms: int
    path: List[Tuple[float, float]]


class EpicycleFrameResponse(BaseModel):
    type: Literal["frame"] = "frame"
    t: float
    num_terms: int
    tip_point: Tuple[float, float]
    circles: List[CircleFrameItem]


# ================= Spectral Bias Race Schemas =================

class SpectralConfig(BaseModel):
    signal_type: Literal["square", "spike", "step"] = "square"
    num_frequencies: int = Field(default=6, ge=1, le=16)
    hidden_dim: int = Field(default=64, ge=16, le=128)
    lr: float = Field(default=0.01, ge=0.0001, le=0.5)
    optimizer: Literal["adam", "sgd"] = "adam"
    activation: Literal["relu", "tanh"] = "relu"
    steps_per_tick: int = Field(default=5, ge=1, le=50)
    delay_ms: int = Field(default=30, ge=5, le=500)
    num_points: int = Field(default=150, ge=50, le=500)


class SpectralActionRequest(BaseModel):
    action: Literal["start", "pause", "resume", "reset", "step", "config"]
    config: Optional[SpectralConfig] = None


class SpectralStepResponse(BaseModel):
    type: Literal["step"] = "step"
    epoch: int
    loss_raw: float
    loss_fourier: float
    x: List[float]
    y_target: List[float]
    y_pred_raw: List[float]
    y_pred_fourier: List[float]


class SpectralStatusResponse(BaseModel):
    type: Literal["status"] = "status"
    state: Literal["running", "paused", "idle", "reset"]
    epoch: int
