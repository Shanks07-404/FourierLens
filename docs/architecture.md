# FourierLens System Architecture

FourierLens is structured as an interactive oscilloscope lab with two coupled mathematical domains:
1. **Geometric Epicycle Decomposition (Part A)**: Continuous 2D path Fourier series reconstruction.
2. **Coordinate Network Spectral Bias (Part B)**: Comparative lockstep MLP training with and without Fourier feature encodings.

---

## 1. High-Level Dataflow

```
+-------------------------------------------------------------------------+
|                              REACT FRONTEND                             |
|                                                                         |
|  [Part A: Draw & Rebuild]                  [Part B: Spectral Bias Race] |
|   - DrawCanvas (Pointer/Touch)              - Dual Oscilloscope Screens |
|   - EpicycleAnimator (60 FPS Canvas)        - DualLossChart (Recharts)  |
|   - FrequencySpectrum (D3.js Bar Chart)     - Hyperparameter Controls   |
|   - TermCountSlider (Harmonic Truncation)                               |
+--------------------+-----------------------------------+----------------+
                     |                                   |
         WebSocket:  | /ws/fourier           WebSocket:  | /ws/spectral-bias
                     v                                   v
+-------------------------------------------------------------------------+
|                           FASTAPI SERVER (:8000)                        |
|                                                                         |
|  - WebSocket Connection Management                                      |
|  - FourierReconstructionSession             - SpectralRaceSession       |
|    * Path caching                            * Lockstep Adam trainer    |
|    * Progressive term sweep generator        * Async streaming ticks    |
+--------------------+-----------------------------------+----------------+
                     |                                   |
                     v                                   v
+-------------------------------------------------------------------------+
|                              CORE ENGINE                                |
|                                                                         |
|  core/fourier.py:                          core/tiny_net.py:            |
|   - path_to_epicycles() [FFT DFT]           - TinyMLP (Pure NumPy)      |
|   - reconstruct_point() / path()            - Adam optimizer + SGD      |
|   - epicycle_frame() [Tip-to-tail]          - generate_target_signal()  |
|                                                                         |
|  core/features.py:                                                      |
|   - raw_features() -> (N, 1)                                            |
|   - fourier_features() -> (N, 2k) [Interleaved sin/cos]                 |
+-------------------------------------------------------------------------+
```

---

## 2. Component Directory Structure

```
FourierLens/
├── core/                       # Pure NumPy mathematical core
│   ├── fourier.py              # DFT, epicycles, path reconstruction, phasor frames
│   ├── features.py             # Coordinate feature encodings [sin(2^k pi x), cos(2^k pi x)]
│   ├── tiny_net.py             # 2-layer MLP with backprop and Adam optimizer
│   └── tests/                  # 11 unit tests verifying <1e-8 error & spectral gap
│
├── server/                     # FastAPI ASGI backend
│   ├── main.py                 # FastAPI application, CORS, and WebSocket endpoints
│   ├── schemas.py              # Pydantic v2 validation contracts
│   ├── reconstruction.py       # Session manager for epicycle calculations
│   └── spectral_race.py        # Lockstep async training loop
│
├── frontend/                   # React + TypeScript + Vite application
│   └── src/
│       ├── components/         # Oscilloscope visualization components
│       ├── hooks/              # useWebSocket auto-reconnecting hook
│       ├── utils/              # Arc-length path resampling & preset generators
│       └── styles/             # Tailwind CRT scanlines & phosphor glows
│
└── docs/                       # Architecture diagrams and specifications
```

---

## 3. WebSocket Protocol Contracts

### `/ws/fourier`
- **Inbound Actions**:
  - `set_path`: `{ action: "set_path", path: [[x, y], ...], num_points: 200 }`
  - `set_terms`: `{ action: "set_terms", num_terms: int }`
  - `get_frame`: `{ action: "get_frame", t: float, num_terms: int }`
  - `sweep`: Progressive stream from term 1 to all terms
- **Outbound Payloads**:
  - `epicycles`: `{ type: "epicycles", total_terms: int, epicycles: [{frequency, radius, phase}, ...] }`
  - `reconstruction`: `{ type: "reconstruction", num_terms: int, path: [[x, y], ...] }`
  - `frame`: `{ type: "frame", t: float, tip_point: [x, y], circles: [...] }`

### `/ws/spectral-bias`
- **Inbound Actions**:
  - `start`: `{ action: "start", config: {...} }`
  - `pause` / `resume` / `reset` / `step`
  - `config`: Update learning rate, frequency count `k`, activation, optimizer
- **Outbound Payloads**:
  - `step`: `{ type: "step", epoch: int, loss_raw: float, loss_fourier: float, y_pred_raw: [...], y_pred_fourier: [...] }`
  - `status`: `{ type: "status", state: "running" | "paused" | "idle", epoch: int }`
