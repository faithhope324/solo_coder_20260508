import { create } from 'zustand';
import type { Planet, SimulationConfig, TimeStepData, PresetScene } from '../../shared/types';

interface SimulationState {
  planets: Planet[];
  integrator: 'rk4' | 'hermite';
  timeStep: number;
  gravitationalConstant: number;
  softening: number;
  isRunning: boolean;
  isConnected: boolean;
  currentTime: number;
  speed: number;
  trajectoryHistory: [number, number, number][][];
  energyHistory: { time: number; total: number; kinetic: number; potential: number }[];
  currentStepData: TimeStepData | null;
  showCenterOfMass: boolean;
  showOrbits: boolean;
  showLabels: boolean;
  selectedPlanetId: string | null;
  presets: PresetScene[];
  
  setPlanets: (planets: Planet[]) => void;
  addPlanet: (planet: Planet) => void;
  updatePlanet: (id: string, updates: Partial<Planet>) => void;
  removePlanet: (id: string) => void;
  setIntegrator: (integrator: 'rk4' | 'hermite') => void;
  setTimeStep: (timeStep: number) => void;
  setGravitationalConstant: (G: number) => void;
  setSoftening: (softening: number) => void;
  setSpeed: (speed: number) => void;
  setIsRunning: (isRunning: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;
  setCurrentTime: (time: number) => void;
  setCurrentStepData: (data: TimeStepData | null) => void;
  setShowCenterOfMass: (show: boolean) => void;
  setShowOrbits: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setSelectedPlanetId: (id: string | null) => void;
  setPresets: (presets: PresetScene[]) => void;
  loadPreset: (preset: PresetScene) => void;
  resetSimulation: () => void;
  getConfig: () => SimulationConfig;
}

const defaultPlanets: Planet[] = [
  {
    id: '1',
    name: '恒星 A',
    mass: 1000,
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    color: '#ffd700',
    radius: 0.5,
  },
  {
    id: '2',
    name: '行星 I',
    mass: 1,
    position: [3, 0, 0],
    velocity: [0, 18.26, 0],
    color: '#4a90d9',
    radius: 0.15,
  },
];

export const useSimulationStore = create<SimulationState>((set, get) => ({
  planets: defaultPlanets,
  integrator: 'rk4',
  timeStep: 0.01,
  gravitationalConstant: 1,
  softening: 0.01,
  isRunning: false,
  isConnected: false,
  currentTime: 0,
  speed: 1,
  trajectoryHistory: [],
  energyHistory: [],
  currentStepData: null,
  showCenterOfMass: true,
  showOrbits: true,
  showLabels: true,
  selectedPlanetId: null,
  presets: [],

  setPlanets: (planets) => set({ planets }),
  addPlanet: (planet) => set((state) => ({ planets: [...state.planets, planet] })),
  updatePlanet: (id, updates) => set((state) => ({
    planets: state.planets.map(p => p.id === id ? { ...p, ...updates } : p),
  })),
  removePlanet: (id) => set((state) => ({
    planets: state.planets.filter(p => p.id !== id),
    selectedPlanetId: state.selectedPlanetId === id ? null : state.selectedPlanetId,
  })),
  setIntegrator: (integrator) => set({ integrator }),
  setTimeStep: (timeStep) => set({ timeStep }),
  setGravitationalConstant: (gravitationalConstant) => set({ gravitationalConstant }),
  setSoftening: (softening) => set({ softening }),
  setSpeed: (speed) => set({ speed }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setCurrentStepData: (data) => set((state) => {
    if (!data) return { currentStepData: null };
    
    const newTrajectory = state.planets.map((_, i) => 
      data.positions[i] || [0, 0, 0] as [number, number, number]
    );
    const maxHistory = 1000;
    const newHistory = [...state.trajectoryHistory, newTrajectory];
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    }

    const newEnergyHistory = [...state.energyHistory, {
      time: data.time,
      total: data.totalEnergy,
      kinetic: data.kineticEnergy,
      potential: data.potentialEnergy,
    }];
    if (newEnergyHistory.length > maxHistory) {
      newEnergyHistory.shift();
    }

    return {
      currentStepData: data,
      currentTime: data.time,
      trajectoryHistory: newHistory,
      energyHistory: newEnergyHistory,
    };
  }),
  setShowCenterOfMass: (showCenterOfMass) => set({ showCenterOfMass }),
  setShowOrbits: (showOrbits) => set({ showOrbits }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setSelectedPlanetId: (selectedPlanetId) => set({ selectedPlanetId }),
  setPresets: (presets) => set({ presets }),
  
  loadPreset: (preset) => set({
    planets: [...preset.config.planets],
    integrator: preset.config.integrator,
    timeStep: preset.config.timeStep,
    gravitationalConstant: preset.config.gravitationalConstant,
    softening: preset.config.softening,
    trajectoryHistory: [],
    energyHistory: [],
    currentStepData: null,
    currentTime: 0,
    isRunning: false,
  }),
  
  resetSimulation: () => set({
    trajectoryHistory: [],
    energyHistory: [],
    currentStepData: null,
    currentTime: 0,
    isRunning: false,
  }),
  
  getConfig: () => {
    const state = get();
    return {
      planets: state.planets,
      integrator: state.integrator,
      timeStep: state.timeStep,
      gravitationalConstant: state.gravitationalConstant,
      softening: state.softening,
    };
  },
}));
