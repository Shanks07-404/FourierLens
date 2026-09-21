import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Eye, EyeOff, Activity, Download } from 'lucide-react';
import { EpicycleItem } from '../api/socket';
import { Point } from '../utils/path-sampling';

interface EpicycleAnimatorProps {
  epicycles: EpicycleItem[];
  numTerms: number;
  originalPath?: Point[];
  width?: number;
  height?: number;
}

export const EpicycleAnimator: React.FC<EpicycleAnimatorProps> = ({
  epicycles,
  numTerms,
  originalPath = [],
  width = 400,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.5); // Readable speed
  const [showCircles, setShowCircles] = useState(true);
  const [showSpokes, setShowSpokes] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);

  // Time parameter t in [0, 1)
  const timeRef = useRef<number>(0);
  const trailRef = useRef<Point[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Reset trail when epicycles or term count changes
  useEffect(() => {
    trailRef.current = [];
  }, [epicycles, numTerms]);

  // Space key toggles play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // SVG export of the current reconstructed path at active term count
  const exportSVG = useCallback(() => {
    if (!epicycles.length) return;
    const activeTerms = epicycles.slice(0, numTerms);
    const sampleN = 300;
    const pathParts: string[] = [];

    for (let s = 0; s <= sampleN; s++) {
      const st = s / sampleN;
      let px = 0;
      let py = 0;
      for (const ep of activeTerms) {
        const a = 2 * Math.PI * ep.frequency * st + ep.phase;
        px += ep.radius * Math.cos(a);
        py += ep.radius * Math.sin(a);
      }
      pathParts.push(`${s === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`);
    }
    pathParts.push('Z');

    const svgContent = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      `  <rect width="${width}" height="${height}" fill="#0B1220"/>`,
      `  <path d="${pathParts.join(' ')}" stroke="#5CE6B0" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
      `</svg>`,
    ].join('\n');

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fourierlens-k${numTerms}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [epicycles, numTerms, width, height]);

  const drawFrame = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Oscilloscope background grid
      ctx.strokeStyle = '#1B2A3A';
      ctx.lineWidth = 1;
      const gridStep = 40;
      for (let x = 0; x <= width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center crosshairs
      ctx.strokeStyle = '#22364B';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw faint ghost of original target path if enabled
      if (showOriginal && originalPath.length > 2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(127, 147, 166, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(originalPath[0][0], originalPath[0][1]);
        for (let i = 1; i < originalPath.length; i++) {
          ctx.lineTo(originalPath[i][0], originalPath[i][1]);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      if (epicycles.length === 0) return;

      const activeTerms = epicycles.slice(0, numTerms);

      // 3. Compute Tip-to-Tail Circles
      let currX = 0;
      let currY = 0;

      // Draw tip-to-tail circles & vectors
      for (let i = 0; i < activeTerms.length; i++) {
        const ep = activeTerms[i];
        const prevX = currX;
        const prevY = currY;

        const angle = 2 * Math.PI * ep.frequency * t + ep.phase;
        const nextX = prevX + ep.radius * Math.cos(angle);
        const nextY = prevY + ep.radius * Math.sin(angle);

        // Draw circle outline
        if (showCircles && ep.radius > 0.5) {
          ctx.beginPath();
          ctx.arc(prevX, prevY, ep.radius, 0, Math.PI * 2);
          // Dimmer for smaller circles to prevent visual noise
          const alpha = Math.max(0.12, Math.min(0.4, ep.radius / 50));
          ctx.strokeStyle = `rgba(92, 230, 176, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw radial spoke
        if (showSpokes && ep.radius > 1) {
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(nextX, nextY);
          ctx.strokeStyle = 'rgba(232, 241, 236, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Small dot at center
          if (i < 10) {
            ctx.fillStyle = 'rgba(92, 230, 176, 0.6)';
            ctx.beginPath();
            ctx.arc(prevX, prevY, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        currX = nextX;
        currY = nextY;
      }

      // Add pen tip to trail
      trailRef.current.push([currX, currY]);
      // Keep trail to roughly one full period
      if (trailRef.current.length > 300) {
        trailRef.current.shift();
      }

      // 4. Draw Full Static Reconstructed Curve (Faint guide)
      ctx.save();
      ctx.strokeStyle = 'rgba(92, 230, 176, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Sample static closed curve for current numTerms
      const sampleN = 150;
      for (let s = 0; s <= sampleN; s++) {
        const st = s / sampleN;
        let px = 0;
        let py = 0;
        for (let j = 0; j < activeTerms.length; j++) {
          const ep = activeTerms[j];
          const a = 2 * Math.PI * ep.frequency * st + ep.phase;
          px += ep.radius * Math.cos(a);
          py += ep.radius * Math.sin(a);
        }
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // 5. Draw Dynamic Traced Trail (Phosphor Green Glowing Wave)
      const trail = trailRef.current;
      if (trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#5CE6B0';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(92, 230, 176, 0.8)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(trail[0][0], trail[0][1]);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i][0], trail[i][1]);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 6. Draw Active Pen Tip (Glowing dot at current tip)
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#5CE6B0';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(currX, currY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    [epicycles, numTerms, originalPath, showCircles, showSpokes, showOriginal, width, height]
  );

  // Animation loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        // Base: one loop every ~8 seconds at 1.0x speed
        const cycleDuration = 8 / speed;
        timeRef.current = (timeRef.current + dt / cycleDuration) % 1.0;
      }

      drawFrame(timeRef.current);
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, speed, drawFrame]);

  return (
    <div className="flex flex-col bg-osc-card border border-osc-border rounded-xl p-4 shadow-screen-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-osc-green" />
          <span className="font-serif font-semibold text-osc-text text-sm tracking-wide">
            Epicycle Phasor Rebuilder
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-osc-green glow-text-green">
            t = {timeRef.current.toFixed(2)}
          </span>
          <span className="font-mono text-xs text-osc-slate bg-osc-bg px-2 py-0.5 rounded border border-osc-grid">
            {numTerms} circles
          </span>
        </div>
      </div>

      {/* Epicycle Canvas */}
      <div className="relative border-2 border-osc-border rounded-lg overflow-hidden bg-osc-bg flex justify-center items-center shadow-inner">
        <canvas ref={canvasRef} width={width} height={height} className="block" />

        {epicycles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-osc-bg/80 text-osc-slate font-serif text-sm">
            Draw a shape to generate epicycles
          </div>
        )}
      </div>

      {/* Playback Controls and Visual Toggles */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded flex items-center gap-1 text-xs font-mono transition-colors ${
              isPlaying
                ? 'bg-osc-green text-osc-bg font-bold shadow-phosphor-green'
                : 'bg-osc-panel text-osc-text border border-osc-grid hover:bg-osc-grid'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={() => {
              timeRef.current = 0;
              trailRef.current = [];
              drawFrame(0);
            }}
            title="Rewind t = 0"
            className="p-1.5 rounded bg-osc-panel text-osc-slate hover:text-osc-text border border-osc-grid"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-osc-slate font-mono">Speed:</span>
            <input
              type="range"
              min={0.1}
              max={2.0}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-16 h-1 bg-osc-grid rounded appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono text-osc-text w-8">{speed.toFixed(1)}x</span>
          </div>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            onClick={() => setShowCircles(!showCircles)}
            className={`px-2 py-1 rounded border transition-colors ${
              showCircles
                ? 'bg-osc-panel text-osc-green border-osc-green/30'
                : 'bg-osc-bg text-osc-slate border-osc-grid opacity-60'
            }`}
          >
            Circles
          </button>
          <button
            onClick={() => setShowSpokes(!showSpokes)}
            className={`px-2 py-1 rounded border transition-colors ${
              showSpokes
                ? 'bg-osc-panel text-osc-green border-osc-green/30'
                : 'bg-osc-bg text-osc-slate border-osc-grid opacity-60'
            }`}
          >
            Spokes
          </button>
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className={`px-2 py-1 rounded border transition-colors ${
              showOriginal
                ? 'bg-osc-panel text-osc-text border-osc-grid'
                : 'bg-osc-bg text-osc-slate border-osc-grid opacity-60'
            }`}
          >
            Target Ghost
          </button>

          <button
            onClick={exportSVG}
            disabled={!epicycles.length}
            title="Download reconstructed curve as SVG"
            className="ml-auto px-2.5 py-1 rounded border border-osc-green/40 bg-osc-panel text-osc-green text-xs font-mono flex items-center gap-1.5 hover:bg-osc-green/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-3 h-3" />
            Export SVG
          </button>
        </div>
      </div>
    </div>
  );
};
