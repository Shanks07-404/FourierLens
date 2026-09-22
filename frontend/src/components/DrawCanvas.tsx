import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Sparkles, Trash2, RefreshCw, PenTool } from 'lucide-react';
import { Point, resamplePath, normalizePoints, getPresetPath } from '../utils/path-sampling';

interface DrawCanvasProps {
  onPathChange: (points: Point[]) => void;
  width?: number;
  height?: number;
}

export const DrawCanvas: React.FC<DrawCanvasProps> = ({
  onPathChange,
  width = 400,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>('star');

  // Load initial preset (star) on mount
  useEffect(() => {
    const initial = getPresetPath('star', 200);
    setPoints(initial);
    onPathChange(initial);
  }, [onPathChange]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw CRT grid background
    ctx.strokeStyle = '#1B2A3A';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Crosshairs in center
    ctx.strokeStyle = '#22364B';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (points.length < 2) return;

    // Draw drawn stroke with phosphor green glow
    ctx.save();
    ctx.strokeStyle = '#5CE6B0';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(92, 230, 176, 0.7)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    // If not actively drawing, connect to close loop
    if (!isDrawing && points.length > 2) {
      ctx.lineTo(points[0][0], points[0][1]);
    }
    ctx.stroke();
    ctx.restore();

    // Draw vertex dots for visual feedback
    if (points.length < 50) {
      ctx.fillStyle = '#E8F1EC';
      for (const [px, py] of points) {
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [points, isDrawing, width, height]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setSelectedPreset(null);
    setPoints([[x, y]]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setPoints((prev) => {
      // Don't add tiny duplicate movements
      const last = prev[prev.length - 1];
      if (last && Math.hypot(last[0] - x, last[1] - y) < 3) {
        return prev;
      }
      return [...prev, [x, y]];
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    if (points.length >= 4) {
      const resampled = resamplePath(points, 200);
      setPoints(resampled);
      onPathChange(resampled);
    }
  };

  const loadPreset = (preset: 'star' | 'heart' | 'spiral' | 'trefoil' | 'lissajous' | 'rose') => {
    setSelectedPreset(preset);
    const path = getPresetPath(preset, 200);
    setPoints(path);
    onPathChange(path);
  };

  const handleClear = () => {
    setPoints([]);
    setSelectedPreset(null);
    onPathChange([]);
  };

  const handleNormalize = () => {
    if (points.length < 3) return;
    const norm = normalizePoints(points, width, height, 40);
    const resampled = resamplePath(norm, 200);
    setPoints(resampled);
    onPathChange(resampled);
  };

  return (
    <div className="flex flex-col bg-osc-card border border-osc-border rounded-xl p-4 shadow-screen-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-osc-green" />
          <span className="font-serif font-semibold text-osc-text text-sm tracking-wide">
            Input Waveform / Curve
          </span>
        </div>
        <span className="font-mono text-xs text-osc-slate bg-osc-bg px-2 py-0.5 rounded border border-osc-grid">
          {points.length} nodes
        </span>
      </div>

      {/* Drawing Canvas Box with oscilloscope bezel */}
      <div className="relative border-2 border-osc-border rounded-lg overflow-hidden bg-osc-bg flex justify-center items-center shadow-inner">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="touch-none cursor-crosshair block w-full h-auto max-w-full"
        />

        {points.length === 0 && !isDrawing && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-4 bg-osc-bg/80">
            <PenTool className="w-8 h-8 text-osc-green/50 mb-2 animate-pulse" />
            <p className="text-sm text-osc-text font-serif">Draw any continuous closed shape</p>
            <p className="text-xs text-osc-slate mt-1 font-mono">or choose a preset below</p>
          </div>
        )}
      </div>

      {/* Preset and Action Controls */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-osc-slate font-mono mr-1">Presets:</span>
          {(['star', 'heart', 'spiral', 'trefoil', 'lissajous', 'rose'] as const).map((p) => (
            <button
              key={p}
              onClick={() => loadPreset(p)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                selectedPreset === p
                  ? 'bg-osc-green text-osc-bg font-semibold shadow-phosphor-green'
                  : 'bg-osc-panel text-osc-slate hover:text-osc-text hover:bg-osc-grid border border-osc-grid'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNormalize}
            disabled={points.length < 3}
            title="Center & Fit Path"
            className="p-1.5 rounded bg-osc-panel text-osc-slate hover:text-osc-green hover:bg-osc-grid border border-osc-grid disabled:opacity-30 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            title="Clear Drawing"
            className="p-1.5 rounded bg-osc-panel text-osc-slate hover:text-red-400 hover:bg-osc-grid border border-osc-grid transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
