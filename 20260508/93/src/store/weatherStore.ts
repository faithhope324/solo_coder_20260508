import { create } from 'zustand';

export type WeatherVariable = 'temperature' | 'humidity' | 'wind_speed';
export type PressureLevel = 1000 | 850 | 500 | 250;
export type RenderMode = 'contour' | 'streamline';

interface WeatherState {
  variable: WeatherVariable;
  level: PressureLevel;
  step: number;
  renderMode: RenderMode;
  selectedPoint: { lat: number; lon: number } | null;
  pointData: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    u: number;
    v: number;
  } | null;
  panelCollapsed: boolean;
  loading: boolean;

  setVariable: (v: WeatherVariable) => void;
  setLevel: (l: PressureLevel) => void;
  setStep: (s: number) => void;
  setRenderMode: (m: RenderMode) => void;
  setSelectedPoint: (p: { lat: number; lon: number } | null) => void;
  setPointData: (d: WeatherState['pointData']) => void;
  togglePanel: () => void;
  setLoading: (l: boolean) => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  variable: 'temperature',
  level: 850,
  step: 0,
  renderMode: 'contour',
  selectedPoint: null,
  pointData: null,
  panelCollapsed: false,
  loading: false,

  setVariable: (v) => set({ variable: v }),
  setLevel: (l) => set({ level: l }),
  setStep: (s) => set({ step: s }),
  setRenderMode: (m) => set({ renderMode: m }),
  setSelectedPoint: (p) => set({ selectedPoint: p }),
  setPointData: (d) => set({ pointData: d }),
  togglePanel: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
  setLoading: (l) => set({ loading: l }),
}));
