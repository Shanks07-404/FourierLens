import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Radio, CircleDot, Info } from 'lucide-react';
import { useWebSocket } from './hooks/useSocketStream';
import { FourierSocketMessage, EpicycleItem } from './api/socket';
import { Point } from './utils/path-sampling';
import { DrawCanvas } from './components/DrawCanvas';
import { EpicycleAnimator } from './components/EpicycleAnimator';
import { FrequencySpectrum } from './components/FrequencySpectrum';
import { TermCountSlider } from './components/TermCountSlider';
import { SpectralRaceView } from './components/SpectralRaceView';

export function App() {
  const [activeTab, setActiveTab] = useState<'epicycles' | 'spectral'>('epicycles');

  // WebSocket for Fourier Epicycles
  const { isConnected: isFourierConnected, lastMessage: fourierMessage, sendMessage: sendFourier } =
    useWebSocket<FourierSocketMessage>('/ws/fourier');

  // Drawing & Epicycles State
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [epicycles, setEpicycles] = useState<EpicycleItem[]>([]);
  const [totalTerms, setTotalTerms] = useState<number>(1);
  const [numTerms, setNumTerms] = useState<number>(10);

  // Handle incoming Fourier WebSocket messages
  useEffect(() => {
    if (!fourierMessage) return;

    if (fourierMessage.type === 'epicycles') {
      setEpicycles(fourierMessage.epicycles);
      setTotalTerms(fourierMessage.total_terms);
      // Sensible initial terms count (e.g. 15 or 1/4 of total)
      setNumTerms((prev) => Math.min(Math.max(prev, 10), fourierMessage.total_terms));
    }
  }, [fourierMessage]);

  const handlePathChange = useCallback(
    (points: Point[]) => {
      setCurrentPath(points);
      if (points.length >= 4) {
        sendFourier({
          action: 'set_path',
          path: points,
          num_points: 200,
          num_terms: numTerms,
        });
      }
    },
    [sendFourier, numTerms]
  );

  const handleTermsChange = useCallback(
    (terms: number) => {
      setNumTerms(terms);
      sendFourier({
        action: 'set_terms',
        num_terms: terms,
      });
    },
    [sendFourier]
  );

  return (
    <div className="min-h-screen bg-osc-bg text-osc-text flex flex-col selection:bg-osc-green selection:text-osc-bg">
      {/* Top Header / Oscilloscope Brand Bar */}
      <header className="border-b border-osc-border bg-osc-card/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-osc-panel border border-osc-grid flex items-center justify-center shadow-screen-glow">
              <CircleDot className="w-5 h-5 text-osc-green" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-bold tracking-tight text-osc-text">
                  Fourier<span className="text-osc-green glow-text-green">Lens</span>
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-osc-panel text-osc-green border border-osc-green/30">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-osc-slate font-serif italic">
                From Geometric Epicycles to Neural Spectral Bias
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-osc-panel p-1 rounded-xl border border-osc-grid">
            <button
              onClick={() => setActiveTab('epicycles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all duration-200 ${
                activeTab === 'epicycles'
                  ? 'bg-osc-green text-osc-bg font-bold shadow-phosphor-green'
                  : 'text-osc-slate hover:text-osc-text'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Part A: Draw & Rebuild
            </button>

            <button
              onClick={() => setActiveTab('spectral')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all duration-200 ${
                activeTab === 'spectral'
                  ? 'bg-osc-coral text-osc-bg font-bold shadow-phosphor-coral'
                  : 'text-osc-slate hover:text-osc-text'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Part B: Spectral Bias Race
            </button>
          </div>

          {/* Connection Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-osc-slate bg-osc-bg px-3 py-1.5 rounded-lg border border-osc-grid">
            <span
              className={`w-2 h-2 rounded-full ${
                isFourierConnected ? 'bg-osc-green shadow-phosphor-green animate-pulse' : 'bg-red-500'
              }`}
            />
            <span>{isFourierConnected ? 'ONLINE (8000)' : 'CONNECTING...'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area with Framer Motion transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'epicycles' ? (
            <motion.div
              key="epicycles"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {/* Educational Context Banner */}
              <div className="bg-osc-card/60 border border-osc-grid rounded-xl p-4 flex items-start gap-3 text-xs text-osc-slate">
                <Info className="w-4 h-4 text-osc-green flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-osc-text font-serif text-sm">
                    Part A: The Geometry of Fourier Series
                  </span>
                  <p>
                    Any continuous closed curve in the 2D plane can be decomposed into an infinite sum
                    of rotating complex vectors (Fourier Series). As you slide the
                    harmonic term count from 1 towards all, the reconstruction progressively sharpens
                    from a circular orbit into the drawn shape.
                  </p>
                </div>
              </div>

              {/* Layout: Drawing Canvas (Left) + Epicycle Animator & Spectrum (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Drawing Input */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <DrawCanvas onPathChange={handlePathChange} width={420} height={420} />
                </div>

                {/* Right Column: Epicycle Animator + Controls + Spectrum */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <EpicycleAnimator
                    epicycles={epicycles}
                    numTerms={numTerms}
                    originalPath={currentPath}
                    width={560}
                    height={380}
                  />

                  <TermCountSlider
                    numTerms={numTerms}
                    totalTerms={totalTerms}
                    onChange={handleTermsChange}
                  />

                  <FrequencySpectrum
                    epicycles={epicycles}
                    numTerms={numTerms}
                    width={560}
                    height={150}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="spectral"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {/* Educational Context Banner */}
              <div className="bg-osc-card/60 border border-osc-grid rounded-xl p-4 flex items-start gap-3 text-xs text-osc-slate">
                <Info className="w-4 h-4 text-osc-coral flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-osc-text font-serif text-sm">
                    Part B: Spectral Bias in Coordinate MLPs
                  </span>
                  <p>
                    Standard feedforward neural networks suffer from{' '}
                    <strong className="text-osc-text">spectral bias</strong>: their gradients decay
                    exponentially for high-frequency components, causing raw-coordinate networks to
                    plateau into blurry, low-frequency approximations. Mapping input x to Fourier
                    features [sin(2^k * pi * x), cos(2^k * pi * x)] enables identical networks to learn
                    sharp discontinuities (like square waves) orders of magnitude faster.
                  </p>
                </div>
              </div>

              {/* Spectral Race View */}
              <SpectralRaceView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-osc-grid py-4 px-6 text-center text-xs font-mono text-osc-slate">
        FourierLens — Oscilloscope Signal Lab & Neural Coordinate Encoding
      </footer>
    </div>
  );
}
