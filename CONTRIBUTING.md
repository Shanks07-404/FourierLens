# Contributing to FourierLens

Thank you for contributing to FourierLens! This guide covers development environment setup, running tests, and instructions for extending the codebase.

---

## 1. Development Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**

### Backend Setup
```bash
# Create virtual environment (optional)
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI WebSocket dev server (runs on :8000)
python -m uvicorn server.main:app --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Vite dev server runs on :5173
```

---

## 2. How to Run Tests

Always verify all tests pass before submitting changes:

```bash
# 1. Run the Python mathematical unit tests
python -m unittest discover -s core/tests -v

# 2. Verify frontend TypeScript build with zero errors
cd frontend
npm run build
```

---

## 3. How to Add a New Preset Shape

To add a new mathematical curve preset to the Part A canvas toolbar:

1. Open `frontend/src/utils/path-sampling.ts`.
2. Add your curve identifier to the `preset` union type in `getPresetPath`:
   ```typescript
   export function getPresetPath(
     preset: 'star' | 'heart' | 'spiral' | 'trefoil' | 'lissajous' | 'rose' | 'your_curve',
     numPoints = 200
   ): Point[] {
   ```
3. Implement the parametric coordinates over \(t \in [0, 2\pi]\):
   ```typescript
   if (preset === 'your_curve') {
     for (let i = 0; i < numPoints; i++) {
       const t = (i / numPoints) * 2 * Math.PI;
       const x = 200 + 120 * Math.cos(t);
       const y = 200 + 120 * Math.sin(t);
       points.push([x, y]);
     }
     return points;
   }
   ```
4. Add the button in `frontend/src/components/DrawCanvas.tsx` inside the presets array.

---

## 4. How to Add a New WebSocket Action

Both `/ws/fourier` and `/ws/spectral-bias` follow a typed JSON protocol:

1. **Define Schema**: Add your request/response models in `server/schemas.py` using Pydantic v2.
2. **Backend Handler**: In `server/main.py`, handle the action string:
   ```python
   elif action == "your_new_action":
       result = session.compute_something(data.get("param"))
       await websocket.send_json({"type": "your_response", "data": result})
   ```
3. **Frontend Client**: Update `frontend/src/api/socket.ts` message types and dispatch via `sendMessage({ action: "your_new_action" })`.

---

## 5. Pull Request Guidelines

1. Create a feature or bugfix branch: `git checkout -b feat/your-feature`
2. Follow conventional commit messages: `feat(...)`, `fix(...)`, `docs(...)`, `test(...)`, `perf(...)`
3. Link related GitHub issues in PR descriptions using `Closes #<issue_number>`
