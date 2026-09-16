import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, RotateCcw } from 'lucide-react';

interface TermCountSliderProps {
  numTerms: number;
  totalTerms: number;
  onChange: (terms: number) => void;
  onSweep?: () => void;
}

export const TermCountSlider: React.FC<TermCountSliderProps> = ({
  numTerms,
  totalTerms,
  onChange,
}) => {
  const [isSweeping, setIsSweeping] = useState(false);
  const sweepIntervalRef = useRef<number | null>(null);

  const safeTotal = Math.max(1, totalTerms);

  // Auto-sweep progressive sharpening animation
  useEffect(() => {
    if (isSweeping) {
      sweepIntervalRef.current = window.setInterval(() => {
        if (numTerms >= safeTotal) {
          setIsSweeping(false);
        } else {
          const step = numTerms < 15 ? 1 : numTerms < 50 ? 2 : 4;
          onChange(Math.min(safeTotal, numTerms + step));
        }
      }, 50);
    } else {
      if (sweepIntervalRef.current) {
        clearInterval(sweepIntervalRef.current);
      }
    }
    return () => {
      if (sweepIntervalRef.current) {
        clearInterval(sweepIntervalRef.current);
      }
    };
  }, [isSweeping, safeTotal, numTerms, onChange]);

  const quickJumpValues = [1, 3, 5, 10, 25, 50, 100, safeTotal].filter(
    (v, idx, arr) => v <= safeTotal && arr.indexOf(v) === idx
  );

  return (
    <div className="bg-osc-card border border-osc-border rounded-xl p-4 shadow-screen-glow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-serif font-semibold text-sm text-osc-text tracking-wide">
            Harmonic Terms (Truncation)
          </span>
          <span className="text-xs text-osc-slate font-mono">
            {Math.round((numTerms / safeTotal) * 100)}% energy
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isSweeping && numTerms >= safeTotal) {
                onChange(1);
              }
              setIsSweeping(!isSweeping);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              isSweeping
                ? 'bg-osc-coral text-osc-bg font-semibold shadow-phosphor-coral'
                : 'bg-osc-panel text-osc-green border border-osc-green/30 hover:bg-osc-grid'
            }`}
          >
            {isSweeping ? (
              <>
                <Pause className="w-3 h-3" /> Stop Sweep
              </>
            ) : (
              <>
                <FastForward className="w-3 h-3" /> Auto Sweep
              </>
            )}
          </button>

          <button
            onClick={() => onChange(1)}
            title="Reset to 1 Term"
            className="p-1.5 rounded bg-osc-panel text-osc-slate hover:text-osc-text border border-osc-grid"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Slider */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-osc-slate">1</span>
        <input
          type="range"
          min={1}
          max={safeTotal}
          value={numTerms}
          onChange={(e) => {
            setIsSweeping(false);
            onChange(parseInt(e.target.value, 10));
          }}
          className="flex-1 h-2 bg-osc-grid rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex items-center justify-center min-w-[70px] bg-osc-bg px-2.5 py-1 rounded border border-osc-grid">
          <span className="font-mono text-sm font-semibold text-osc-green glow-text-green">
            N = {numTerms}
          </span>
        </div>
      </div>

      {/* Quick Jump Pills */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-osc-slate font-mono mr-1">Jumps:</span>
        {quickJumpValues.map((val) => (
          <button
            key={val}
            onClick={() => {
              setIsSweeping(false);
              onChange(val);
            }}
            className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
              numTerms === val
                ? 'bg-osc-green text-osc-bg font-bold shadow-phosphor-green'
                : 'bg-osc-panel text-osc-slate hover:text-osc-text border border-osc-grid'
            }`}
          >
            {val === safeTotal ? 'All' : val}
          </button>
        ))}
      </div>
    </div>
  );
};
