# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-23

### Added
- **Core Fourier Engine (`core/fourier.py`)**:
  - Discrete Fourier Transform via `np.fft.fft` sorting complex phasors strictly by descending radius.
  - Periodic path reconstruction with continuous normalized time parameter \(t \in [0, 1)\).
  - Tip-to-tail epicycle animation frame generator.
- **Coordinate Feature Mappings (`core/features.py`)**:
  - Raw 1D coordinate identity pass-through.
  - Multi-frequency Fourier feature encoding with interleaved \([\sin(2^k \pi x), \cos(2^k \pi x)]\).
- **Coordinate MLP & Spectral Bias Engine (`core/tiny_net.py`)**:
  - Pure NumPy 2-hidden-layer MLP with backprop and Adam optimizer.
  - Square, spike, and step target signal generators demonstrating the high-frequency spectral bias gap.
- **FastAPI WebSocket Streaming Backend (`server/`)**:
  - `/ws/fourier`: Real-time path reception, DFT epicycle decomposition, and progressive term sweep streaming.
  - `/ws/spectral-bias`: Synchronous lockstep training with start, pause, reset, step, and hyperparameter configuration actions.
  - Pydantic v2 validation contracts for all socket payloads.
- **Oscilloscope-Themed Frontend UI (`frontend/src/`)**:
  - Analog signal lab design system with CRT grid lines, scanline overlays, and phosphor green / coral glow styling.
  - `DrawCanvas`: Pointer and touch drawing input with automatic arc-length resampling.
  - `EpicycleAnimator`: 60 FPS `requestAnimationFrame` canvas rendering tip-to-tail rotating phasors and glowing trajectory trails.
  - `FrequencySpectrum`: D3.js interactive bar chart displaying harmonic amplitude, phase, and complex coefficients.
  - `TermCountSlider`: Dynamic harmonic truncation slider with automated sweep mode.
  - `SpectralRaceView`: Dual oscilloscope signal screens comparing raw vs Fourier feature network fits in real time.
  - `DualLossChart`: Recharts live MSE loss divergence with linear/log scale toggle.
- **Presets**:
  - Parametric Lissajous knot (3:2 frequency ratio) and 5-petal mathematical Rose curve presets.
- **Export & Accessibility**:
  - Vector SVG export downloading high-resolution reconstructed curves.
  - Global `Space` key shortcut to toggle epicycle playback.
- **CI & Developer Tools**:
  - GitHub Actions automated CI testing Python mathematical core and frontend Vite production builds.
  - Comprehensive unit test suite with 14 test cases covering reconstruction accuracy and edge cases.
  - Architecture documentation (`docs/architecture.md`) and contribution guide (`CONTRIBUTING.md`).

### Performance
- Added in-memory path caching keyed by `(num_terms, num_points)` in `FourierReconstructionSession`, reducing CPU usage during rapid slider scrubbing.
- Mobile viewport coordinate scaling and gesture cancellation handling in `DrawCanvas`.
