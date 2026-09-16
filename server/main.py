from __future__ import annotations
import asyncio
import json
import logging
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from server.schemas import (
    FourierRequest,
    SpectralActionRequest,
    SpectralConfig,
)
from server.reconstruction import FourierReconstructionSession
from server.spectral_race import SpectralRaceSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FourierLens")

app = FastAPI(title="FourierLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "FourierLens", "version": "1.0.0"}


# ================= WebSocket: /ws/fourier =================

@app.websocket("/ws/fourier")
async def websocket_fourier(websocket: WebSocket):
    await websocket.accept()
    session = FourierReconstructionSession()
    logger.info("Client connected to /ws/fourier")

    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            action = data.get("action", "ping")

            if action == "ping":
                await websocket.send_json({"type": "pong"})

            elif action == "set_path":
                points = data.get("path", [])
                num_points = data.get("num_points", 200)
                epicycles = session.set_path(points, num_points=num_points)

                # Send epicycles summary
                await websocket.send_json({
                    "type": "epicycles",
                    "total_terms": session.total_terms,
                    "epicycles": session.get_epicycles_data(),
                })

                # Also send initial full reconstruction
                initial_terms = data.get("num_terms") or min(10, session.total_terms)
                recon = session.get_reconstruction(num_terms=initial_terms)
                await websocket.send_json({
                    "type": "reconstruction",
                    "num_terms": initial_terms,
                    "total_terms": session.total_terms,
                    "path": recon,
                })

            elif action == "set_terms":
                num_terms = data.get("num_terms", session.total_terms)
                recon = session.get_reconstruction(num_terms=num_terms)
                await websocket.send_json({
                    "type": "reconstruction",
                    "num_terms": min(num_terms, session.total_terms),
                    "total_terms": session.total_terms,
                    "path": recon,
                })

            elif action == "get_frame":
                t = float(data.get("t", 0.0))
                num_terms = data.get("num_terms", session.total_terms)
                frame = session.get_frame(t=t, num_terms=num_terms)
                await websocket.send_json({
                    "type": "frame",
                    **frame,
                })

            elif action == "sweep":
                # Progressive sweep from 1 term to total_terms
                total = session.total_terms
                for k in range(1, total + 1):
                    recon = session.get_reconstruction(num_terms=k)
                    await websocket.send_json({
                        "type": "reconstruction",
                        "num_terms": k,
                        "total_terms": total,
                        "path": recon,
                    })
                    await asyncio.sleep(0.04)

    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/fourier")
    except Exception as e:
        logger.error(f"Error in /ws/fourier: {e}")
        try:
            await websocket.close()
        except Exception:
            pass


# ================= WebSocket: /ws/spectral-bias =================

@app.websocket("/ws/spectral-bias")
async def websocket_spectral_bias(websocket: WebSocket):
    await websocket.accept()
    session = SpectralRaceSession()
    logger.info("Client connected to /ws/spectral-bias")

    # Send initial state
    await websocket.send_json(session.current_state())
    await websocket.send_json({"type": "status", "state": "idle", "epoch": session.epoch})

    training_task: Optional[asyncio.Task] = None
    is_running = False

    async def train_loop():
        nonlocal is_running
        try:
            while is_running:
                step_data = session.train_steps()
                await websocket.send_json(step_data)
                delay_sec = max(0.005, session.config.delay_ms / 1000.0)
                await asyncio.sleep(delay_sec)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in training loop: {e}")

    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            action = data.get("action", "")

            if action == "start" or action == "resume":
                if "config" in data and data["config"]:
                    cfg = SpectralConfig(**data["config"])
                    session.update_config(cfg)
                is_running = True
                if training_task is None or training_task.done():
                    training_task = asyncio.create_task(train_loop())
                await websocket.send_json({"type": "status", "state": "running", "epoch": session.epoch})

            elif action == "pause":
                is_running = False
                if training_task and not training_task.done():
                    training_task.cancel()
                await websocket.send_json({"type": "status", "state": "paused", "epoch": session.epoch})

            elif action == "reset":
                is_running = False
                if training_task and not training_task.done():
                    training_task.cancel()
                cfg = SpectralConfig(**data["config"]) if "config" in data and data["config"] else None
                session.reset(cfg)
                await websocket.send_json(session.current_state())
                await websocket.send_json({"type": "status", "state": "reset", "epoch": session.epoch})

            elif action == "step":
                step_data = session.train_steps(num_steps=1)
                await websocket.send_json(step_data)

            elif action == "config":
                is_running = False
                if training_task and not training_task.done():
                    training_task.cancel()
                cfg = SpectralConfig(**data.get("config", {}))
                session.update_config(cfg)
                await websocket.send_json(session.current_state())
                await websocket.send_json({"type": "status", "state": "idle", "epoch": session.epoch})

    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/spectral-bias")
    finally:
        if training_task and not training_task.done():
            training_task.cancel()
