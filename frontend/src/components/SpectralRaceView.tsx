import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Cpu,
  Zap,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  useWebSocket,
} from '../hooks/useSocketStream';
import {
  SpectralConfig,
  SpectralStepMessage,
  SpectralSocketMessage,
} from '../api/socket';
import { DualLossChart, LossPoint } from './DualLossChart';

interface SignalScreenProps {
  title: string;
  badge: string;
  badgeColor: 'slate' | 'coral';
  xVals: number[];
  yTarget: number[];
  yPred: number[];
  loss: number;
  curveColor: string;
  shadowColor: string;
  width?: number;
  height?: number;
}

const SignalScreen: React.FC<SignalScreenProps> = ({
  title,
  badge,
  badgeColor,
  xVals,
  yTarget,
  yPred,
  loss,
  curveColor,
  shadowColor,
  width = 380,
  height = 240,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Oscilloscope grid
    ctx.strokeStyle = '#1B2A3A';
    ctx.lineWidth = 1;
    const stepX = width / 8;
    const stepY = height / 6;

    for (let x = 0; x <= width; x += stepX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += stepY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Zero-axis dashed lines (x=0, y=0)
    ctx.strokeStyle = '#22364B';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!xVals || xVals.length === 0) return;

    // Coordinate mapping helper
    // x in [-1, 1] -> [padding, width - padding]
    // y in [-1.5, 1.5] -> [height - padding, padding]
    const padX = 20;
    const padY = 25;
    const mapX = (x: number) => padX + ((x + 1) / 2) * (width - 2 * padX);
    const mapY = (y: number) => height / 2 - (y / 1.5) * (height / 2 - padY);

    // 1. Draw Target Signal (dashed phosphor line)
    if (yTarget && yTarget.length === xVals.length) {
      ctx.save();
      ctx.strokeStyle = 'rgba(232, 241, 236, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(mapX(xVals[0]), mapY(yTarget[0]));
      for (let i = 1; i < xVals.length; i++) {
        ctx.lineTo(mapX(xVals[i]), mapY(yTarget[i]));
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Network Fitted Waveform (solid glowing trace)
    if (yPred && yPred.length === xVals.length) {
      ctx.save();
      ctx.strokeStyle = curveColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(mapX(xVals[0]), mapY(yPred[0]));
      for (let i = 1; i < xVals.length; i++) {
        ctx.lineTo(mapX(xVals[i]), mapY(yPred[i]));
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [xVals, yTarget, yPred, curveColor, shadowColor, width, height]);

  return (
    <div className="flex-1 bg-osc-card border border-osc-border rounded-xl p-4 shadow-screen-glow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-serif font-semibold text-sm text-osc-text tracking-wide">
            {title}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-mono rounded border ${
            badgeColor === 'coral'
              ? 'bg-osc-coral/10 text-osc-coral border-osc-coral/30'
              : 'bg-osc-panel text-osc-slate border-osc-grid'
          }`}
        >
          {badge}
        </span>
      </div>

      {/* Screen */}
      <div className="relative border-2 border-osc-border rounded-lg overflow-hidden bg-osc-bg flex justify-center items-center shadow-inner">
        <canvas ref={canvasRef} width={width} height={height} className="block w-full h-auto" />
      </div>

      {/* Status Footer */}
      <div className="mt-2.5 flex items-center justify-between text-xs font-mono">
        <span className="text-osc-slate">MSE Error:</span>
        <span
          className={`font-semibold ${
            badgeColor === 'coral' ? 'text-osc-coral glow-text-coral' : 'text-osc-slate'
          }`}
        >
          {loss.toFixed(5)}
        </span>
      </div>
    </div>
  );
};

export const SpectralRaceView: React.FC = () => {
  const { isConnected, lastMessage, sendMessage } = useWebSocket<SpectralSocketMessage>('/ws/spectral-bias');

  const [isRunning, setIsRunning] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [currentLossRaw, setCurrentLossRaw] = useState(0);
  const [currentLossFourier, setCurrentLossFourier] = useState(0);
  const [xVals, setXVals] = useState<number[]>([]);
  const [yTarget, setYTarget] = useState<number[]>([]);
  const [yPredRaw, setYPredRaw] = useState<number[]>([]);
  const [yPredFourier, setYPredFourier] = useState<number[]>([]);
  const [lossHistory, setLossHistory] = useState<LossPoint[]>([]);

  // Config parameters
  const [config, setConfig] = useState<SpectralConfig>({
    signal_type: 'square',
    num_frequencies: 6,
    hidden_dim: 64,
    lr: 0.01,
    optimizer: 'adam',
    activation: 'relu',
    steps_per_tick: 5,
    delay_ms: 30,
    num_points: 150,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'step') {
      const step = lastMessage as SpectralStepMessage;
      setEpoch(step.epoch);
      setCurrentLossRaw(step.loss_raw);
      setCurrentLossFourier(step.loss_fourier);
      setXVals(step.x);
      setYTarget(step.y_target);
      setYPredRaw(step.y_pred_raw);
      setYPredFourier(step.y_pred_fourier);

      setLossHistory((prev) => [
        ...prev,
        {
          epoch: step.epoch,
          loss_raw: step.loss_raw,
          loss_fourier: step.loss_fourier,
        },
      ]);
    } else if (lastMessage.type === 'status') {
      setIsRunning(lastMessage.state === 'running');
      if (lastMessage.state === 'reset') {
        setEpoch(0);
        setLossHistory([]);
      }
    }
  }, [lastMessage]);

  const handleStartResume = () => {
    if (isRunning) {
      sendMessage({ action: 'pause' });
      setIsRunning(false);
    } else {
      sendMessage({ action: 'start', config });
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    sendMessage({ action: 'reset', config });
    setIsRunning(false);
    setEpoch(0);
    setLossHistory([]);
  };

  const handleSingleStep = () => {
    sendMessage({ action: 'step' });
  };

  const updateConfigField = <K extends keyof SpectralConfig>(field: K, val: SpectralConfig[K]) => {
    const next = { ...config, [field]: val };
    setConfig(next);
    sendMessage({ action: 'config', config: next });
    setLossHistory([]);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Control Strip */}
      <div className="bg-osc-card border border-osc-border rounded-xl p-4 shadow-screen-glow flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartResume}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-colors ${
              isRunning
                ? 'bg-osc-coral text-osc-bg shadow-phosphor-coral'
                : 'bg-osc-green text-osc-bg shadow-phosphor-green hover:opacity-90'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Halt Race' : 'Start Lockstep Race'}
          </button>

          <button
            onClick={handleSingleStep}
            disabled={isRunning}
            title="Single Training Tick"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-osc-panel text-osc-text border border-osc-grid hover:bg-osc-grid disabled:opacity-40 text-xs font-mono transition-colors"
          >
            <StepForward className="w-3.5 h-3.5" /> Step
          </button>

          <button
            onClick={handleReset}
            title="Reset Networks & Weights"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-osc-panel text-osc-slate hover:text-osc-text border border-osc-grid text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {/* Target Signal & Frequency Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-osc-bg px-3 py-1.5 rounded-lg border border-osc-grid">
            <span className="text-xs font-mono text-osc-slate">Target:</span>
            {(['square', 'spike', 'step'] as const).map((sig) => (
              <button
                key={sig}
                onClick={() => updateConfigField('signal_type', sig)}
                className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                  config.signal_type === sig
                    ? 'bg-osc-green text-osc-bg font-bold shadow-phosphor-green'
                    : 'text-osc-slate hover:text-osc-text'
                }`}
              >
                {sig.charAt(0).toUpperCase() + sig.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-osc-bg px-3 py-1.5 rounded-lg border border-osc-grid">
            <span className="text-xs font-mono text-osc-slate">Frequencies (k):</span>
            <input
              type="range"
              min={2}
              max={10}
              value={config.num_frequencies}
              onChange={(e) => updateConfigField('num_frequencies', parseInt(e.target.value, 10))}
              className="w-16 h-1.5 bg-osc-grid rounded appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-osc-coral glow-text-coral w-4">
              {config.num_frequencies}
            </span>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 rounded-lg bg-osc-panel text-osc-slate hover:text-osc-text border border-osc-grid"
            title="Hyperparameter Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Hyperparameter Drawer */}
      {showAdvanced && (
        <div className="bg-osc-card/60 border border-osc-grid rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <label className="text-osc-slate block mb-1">Optimizer</label>
            <div className="flex gap-2">
              {(['adam', 'sgd'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => updateConfigField('optimizer', opt)}
                  className={`px-3 py-1 rounded border ${
                    config.optimizer === opt
                      ? 'bg-osc-green text-osc-bg font-bold'
                      : 'bg-osc-panel text-osc-slate border-osc-grid'
                  }`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-osc-slate block mb-1">Learning Rate</label>
            <input
              type="range"
              min={0.001}
              max={0.05}
              step={0.001}
              value={config.lr}
              onChange={(e) => updateConfigField('lr', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-osc-grid rounded"
            />
            <span className="text-osc-text">{config.lr.toFixed(3)}</span>
          </div>

          <div>
            <label className="text-osc-slate block mb-1">Hidden Units</label>
            <div className="flex gap-2">
              {[32, 64, 96].map((units) => (
                <button
                  key={units}
                  onClick={() => updateConfigField('hidden_dim', units)}
                  className={`px-2.5 py-1 rounded border ${
                    config.hidden_dim === units
                      ? 'bg-osc-green text-osc-bg font-bold'
                      : 'bg-osc-panel text-osc-slate border-osc-grid'
                  }`}
                >
                  {units}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-osc-slate block mb-1">Activation</label>
            <div className="flex gap-2">
              {(['relu', 'tanh'] as const).map((act) => (
                <button
                  key={act}
                  onClick={() => updateConfigField('activation', act)}
                  className={`px-3 py-1 rounded border ${
                    config.activation === act
                      ? 'bg-osc-green text-osc-bg font-bold'
                      : 'bg-osc-panel text-osc-slate border-osc-grid'
                  }`}
                >
                  {act.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Oscilloscope Screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SignalScreen
          title="Raw Coordinate MLP"
          badge="Input: x ∈ ℝ¹"
          badgeColor="slate"
          xVals={xVals}
          yTarget={yTarget}
          yPred={yPredRaw}
          loss={currentLossRaw}
          curveColor="#7F93A6"
          shadowColor="rgba(127, 147, 166, 0.4)"
        />

        <SignalScreen
          title="Fourier Features MLP"
          badge={`Input: [sin(2ᵏπx), cos(2ᵏπx)] (${config.num_frequencies * 2}D)`}
          badgeColor="coral"
          xVals={xVals}
          yTarget={yTarget}
          yPred={yPredFourier}
          loss={currentLossFourier}
          curveColor="#FF8A5C"
          shadowColor="rgba(255, 138, 92, 0.6)"
        />
      </div>

      {/* Dual Loss Oscilloscope Chart */}
      <DualLossChart
        history={lossHistory}
        currentLossRaw={currentLossRaw}
        currentLossFourier={currentLossFourier}
        epoch={epoch}
      />
    </div>
  );
};
