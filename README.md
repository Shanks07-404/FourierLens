# FourierLens

[![CI](https://github.com/Shanks07-404/FourierLens/actions/workflows/ci.yml/badge.svg)](https://github.com/Shanks07-404/FourierLens/actions/workflows/ci.yml)

> **An oscilloscope-inspired playground connecting two ideas:**
> 1. Any 2D shape is a sum of rotating circles (Fourier epicycles)
> 2. Those same sin/cos features are why modern neural nets learn sharp detail instead of blur

---

## Quick Start

**Requirements:** Python 3.11+, Node 18+

```bash
# 1 — Backend
pip install -r requirements.txt
python -m uvicorn server.main:app --port 8000 --reload

# 2 — Frontend (new terminal)
cd frontend
npm install
npm run dev
# → open http://localhost:5173
```

Run the full test suite first to verify the core math:

```bash
python -m unittest discover -s core/tests
# → Ran 11 tests in 0.18s — OK
```

---

## Part A — Draw & Rebuild (Fourier Epicycles)

Any continuous closed curve \(z(t)\) can be decomposed as:

$$z(t) = \sum_{k} c_k \, e^{i 2\pi k t}$$

Each term \(c_k\) is a rotating circle — a phasor with radius \(|c_k|\) and angular speed \(k\). Chain them tip-to-tail and the pen traces the original curve exactly when all \(N\) terms are used. Truncate to the first \(K\) largest-radius terms and you get the best rank-K approximation.

**How to use:**
- **Draw any closed shape** on the left canvas with a mouse or finger, or pick a preset (Star, Heart, Spiral, Trefoil)
- The app runs a DFT, sorts epicycles by descending radius, and animates the phasor chain on the right
- **Drag the term slider** from 1 → All to watch the reconstruction progressively sharpen
- Hit **Auto Sweep** to animate the whole range automatically
- The **Frequency Spectrum** bar chart below shows which harmonics carry the most energy

---

## Part B — Spectral Bias Race

Plain feedforward MLPs are mathematically biased toward low-frequency outputs — a property called **spectral bias** (Rahaman et al., 2019). The gradient magnitudes for frequency component \(k\) decay as \(O(e^{-k})\), so raw-coordinate networks plateau into smooth, blurry approximations of sharp signals.

**The fix:** Map the input through Fourier features first:

$$\gamma(x) = \bigl[\sin(2^0\pi x),\ \cos(2^0\pi x),\ \sin(2^1\pi x),\ \cos(2^1\pi x),\ \ldots\bigr]$$

This is the key ingredient in **NeRF** (Neural Radiance Fields) and many other modern coordinate-MLP architectures.

**What the app shows:**
- Two **identical** MLPs (same architecture, width, optimizer, learning rate, seed) trained on a **square wave** — the hardest test because it contains all odd harmonics
- The only difference: one receives raw coordinate `x`, the other receives Fourier features `γ(x)`
- Watch them train in real-time on separate oscilloscope screens — the raw network plateaus at a blurry sine-like blob while the Fourier features network converges to sharp square edges
- The **Dual Loss Chart** beneath shows the MSE curves diverge within ~50 epochs

---

## Architecture

```
fourierlens/
├── core/
│   ├── fourier.py       # DFT → Epicycles, reconstruction, phasor frames
│   ├── features.py      # raw_features(), fourier_features(), output_dim()
│   ├── tiny_net.py      # Pure-NumPy 2-hidden-layer MLP (SGD / Adam)
│   └── tests/           # 11 unit tests (9 Fourier math + 2 TinyNet)
│
├── server/
│   ├── main.py          # FastAPI app + WebSocket endpoints
│   ├── reconstruction.py # FourierReconstructionSession
│   ├── spectral_race.py  # SpectralRaceSession (lockstep training)
│   └── schemas.py        # Pydantic models
│
└── frontend/src/
    ├── App.tsx                  # Tab switcher with Framer Motion
    ├── components/
    │   ├── DrawCanvas.tsx        # Pointer/touch free-hand canvas
    │   ├── EpicycleAnimator.tsx  # Canvas-based phasor animation loop
    │   ├── FrequencySpectrum.tsx # D3 bar chart of |c_k|
    │   ├── TermCountSlider.tsx   # Harmonic term count control
    │   ├── SpectralRaceView.tsx  # Dual oscilloscope training view
    │   └── DualLossChart.tsx     # Recharts MSE divergence plot
    └── hooks/
        └── useSocketStream.ts   # WebSocket with auto-reconnect
```

### WebSocket Endpoints

| Endpoint | Actions | Streams |
|---|---|---|
| `ws://localhost:8000/ws/fourier` | `set_path`, `set_terms`, `get_frame`, `sweep` | `epicycles`, `reconstruction`, `frame` |
| `ws://localhost:8000/ws/spectral-bias` | `start`, `pause`, `reset`, `step`, `config` | `step` (epoch, losses, predictions), `status` |

---

## Design Language

- **Analog Signal Lab** aesthetic — oscilloscope phosphor screens, CRT grid lines, scanlines overlay
- `#0B1220` deep petrol-ink background, `#5CE6B0` phosphor green (primary trace), `#FF8A5C` coral-amber (Fourier features network only)
- **Fraunces** headings · **IBM Plex Mono** numeric readouts & code
- Framer Motion for tab transitions only — no gratuitous animation elsewhere

---

## Documentation & Contributing

- [System Architecture & Dataflow Diagram](docs/architecture.md)
- [Contribution Guide & Development Setup](CONTRIBUTING.md)

---

## References

- Tancik et al. (2020) — *Fourier Features Let Networks Learn High Frequency Functions in Low Dimensional Domains* — [arXiv:2006.10739](https://arxiv.org/abs/2006.10739)
- Mildenhall et al. (2020) — *NeRF: Representing Scenes as Neural Radiance Fields* — [arXiv:2003.08934](https://arxiv.org/abs/2003.08934)
- Rahaman et al. (2019) — *On the Spectral Bias of Neural Networks* — [arXiv:1806.08734](https://arxiv.org/abs/1806.08734)

