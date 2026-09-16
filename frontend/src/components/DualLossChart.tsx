import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingDown, Gauge } from 'lucide-react';

export interface LossPoint {
  epoch: number;
  loss_raw: number;
  loss_fourier: number;
}

interface DualLossChartProps {
  history: LossPoint[];
  currentLossRaw: number;
  currentLossFourier: number;
  epoch: number;
}

export const DualLossChart: React.FC<DualLossChartProps> = ({
  history,
  currentLossRaw,
  currentLossFourier,
  epoch,
}) => {
  const [isLogScale, setIsLogScale] = useState(false);

  // Downsample history if it grows large to keep rendering ultra smooth
  const displayData = React.useMemo(() => {
    if (history.length <= 150) return history;
    const step = Math.ceil(history.length / 150);
    return history.filter((_, idx) => idx % step === 0 || idx === history.length - 1);
  }, [history]);

  const lossRatio = currentLossFourier > 0 ? currentLossRaw / currentLossFourier : 1;

  return (
    <div className="bg-osc-card border border-osc-border rounded-xl p-4 shadow-screen-glow">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-osc-coral" />
          <span className="font-serif font-semibold text-sm text-osc-text tracking-wide">
            Spectral Bias Convergence — Dual MSE Loss
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Ratio Callout */}
          <div className="flex items-center gap-1.5 bg-osc-bg px-2.5 py-1 rounded border border-osc-grid">
            <Gauge className="w-3.5 h-3.5 text-osc-coral" />
            <span className="font-mono text-xs text-osc-slate">Sharpening Advantage:</span>
            <span className="font-mono text-xs font-bold text-osc-coral glow-text-coral">
              {lossRatio.toFixed(1)}x faster
            </span>
          </div>

          {/* Scale Toggle */}
          <button
            onClick={() => setIsLogScale(!isLogScale)}
            className="px-2 py-0.5 text-xs font-mono rounded bg-osc-panel text-osc-slate hover:text-osc-text border border-osc-grid transition-colors"
          >
            {isLogScale ? 'Log Scale' : 'Linear Scale'}
          </button>
        </div>
      </div>

      {/* Loss Numeric Indicators */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center justify-between bg-osc-bg/80 px-3 py-2 rounded-lg border border-osc-grid">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-osc-slate" />
            <span className="text-xs font-mono text-osc-slate">Raw Coordinates</span>
          </div>
          <span className="font-mono text-sm font-semibold text-osc-slate">
            {currentLossRaw.toFixed(5)}
          </span>
        </div>

        <div className="flex items-center justify-between bg-osc-bg/80 px-3 py-2 rounded-lg border border-osc-coral/30">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-osc-coral shadow-phosphor-coral" />
            <span className="text-xs font-mono text-osc-coral">Fourier Features (sin/cos)</span>
          </div>
          <span className="font-mono text-sm font-semibold text-osc-coral glow-text-coral">
            {currentLossFourier.toFixed(5)}
          </span>
        </div>
      </div>

      {/* Oscilloscope Chart Display */}
      <div className="h-48 w-full bg-osc-bg rounded-lg border border-osc-grid p-2 relative overflow-hidden">
        {displayData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs font-mono text-osc-slate">
            Start training to observe spectral bias loss divergence...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid stroke="#1B2A3A" strokeDasharray="3 3" />
              <XAxis
                dataKey="epoch"
                stroke="#7F93A6"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                tickLine={false}
              />
              <YAxis
                stroke="#7F93A6"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                tickLine={false}
                scale={isLogScale ? 'log' : 'auto'}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const raw = Number(payload.find((p) => p.dataKey === 'loss_raw')?.value ?? 0);
                    const fourier = Number(payload.find((p) => p.dataKey === 'loss_fourier')?.value ?? 0);
                    return (
                      <div className="bg-osc-card border border-osc-grid p-2.5 rounded shadow-xl text-xs font-mono z-30">
                        <div className="text-osc-text font-bold mb-1">Epoch {label}</div>
                        <div className="text-osc-slate flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-osc-slate inline-block" />
                          Raw: {raw.toFixed(5)}
                        </div>
                        <div className="text-osc-coral flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-osc-coral inline-block" />
                          Fourier: {fourier.toFixed(5)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Raw network loss (dim slate/grey) */}
              <Line
                type="monotone"
                dataKey="loss_raw"
                stroke="#7F93A6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              {/* Fourier features network loss (warm coral-amber) */}
              <Line
                type="monotone"
                dataKey="loss_fourier"
                stroke="#FF8A5C"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
