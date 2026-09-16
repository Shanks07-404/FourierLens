export function getWebSocketUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  // If Vite dev server is on port 5173, connect directly to backend ws on port 8000 if proxy isn't direct
  if (host.includes('localhost:5173') || host.includes('127.0.0.1:5173')) {
    return `${protocol}//${window.location.hostname}:8000${path}`;
  }
  return `${protocol}//${host}${path}`;
}

export type EpicycleItem = {
  frequency: number;
  radius: number;
  phase: number;
};

export type CircleFrameItem = {
  center: [number, number];
  radius: number;
  angle: number;
  frequency: number;
};

export type FourierSocketMessage =
  | { type: 'epicycles'; total_terms: number; epicycles: EpicycleItem[] }
  | { type: 'reconstruction'; num_terms: number; total_terms: number; path: [number, number][] }
  | { type: 'frame'; t: number; num_terms: number; tip_point: [number, number]; circles: CircleFrameItem[] }
  | { type: 'pong' };

export type SpectralConfig = {
  signal_type: 'square' | 'spike' | 'step';
  num_frequencies: number;
  hidden_dim: number;
  lr: number;
  optimizer: 'adam' | 'sgd';
  activation: 'relu' | 'tanh';
  steps_per_tick: number;
  delay_ms: number;
  num_points: number;
};

export type SpectralStepMessage = {
  type: 'step';
  epoch: number;
  loss_raw: number;
  loss_fourier: number;
  x: number[];
  y_target: number[];
  y_pred_raw: number[];
  y_pred_fourier: number[];
};

export type SpectralStatusMessage = {
  type: 'status';
  state: 'running' | 'paused' | 'idle' | 'reset';
  epoch: number;
};

export type SpectralSocketMessage = SpectralStepMessage | SpectralStatusMessage;
