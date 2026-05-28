type PressureLevel = 1000 | 850 | 500 | 250;

interface GridConfig {
  latMin: number;
  latMax: number;
  latStep: number;
  lonMin: number;
  lonMax: number;
  lonStep: number;
}

interface GridData {
  latMin: number;
  latMax: number;
  latStep: number;
  lonMin: number;
  lonMax: number;
  lonStep: number;
  values: number[][];
}

interface WindGridData extends Omit<GridData, 'values'> {
  u: number[][];
  v: number[][];
}

interface PointData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  u: number;
  v: number;
}

const CONFIG: GridConfig = {
  latMin: 15,
  latMax: 55,
  latStep: 0.5,
  lonMin: 70,
  lonMax: 140,
  lonStep: 0.5,
};

const LAT_COUNT = Math.round((CONFIG.latMax - CONFIG.latMin) / CONFIG.latStep) + 1;
const LON_COUNT = Math.round((CONFIG.lonMax - CONFIG.lonMin) / CONFIG.lonStep) + 1;

const LEVEL_HEIGHTS: Record<PressureLevel, number> = {
  1000: 0.111,
  850: 1.457,
  500: 5.574,
  250: 10.36,
};

const OMEGA = 7.292e-5;
const G = 9.80665;
const RD = 287.05;
const RHO_0 = 1.225;

const LEVEL_BASE_TEMPS: Record<PressureLevel, number> = {
  1000: 28,
  850: 18,
  500: -8,
  250: -45,
};

const CACHE = new Map<string, GridData | WindGridData>();

function cacheKey(variable: string, level: PressureLevel, step: number): string {
  return `${variable}_${level}_${step}`;
}

function clamped(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateInitialTemperature(level: PressureLevel): number[][] {
  const baseTemp = LEVEL_BASE_TEMPS[level];
  const grid: number[][] = [];

  for (let i = 0; i < LAT_COUNT; i++) {
    grid[i] = [];
    const lat = CONFIG.latMin + i * CONFIG.latStep;

    const latFactor = (55 - lat) / 40;
    const meridional = -18 * latFactor;

    for (let j = 0; j < LON_COUNT; j++) {
      const lon = CONFIG.lonMin + j * CONFIG.lonStep;

      const continental = -6 * Math.sin(((lon - 100) / 40) * Math.PI) * latFactor;

      const wave1 = 4 * Math.sin((lat * Math.PI) / 15) * Math.cos(((lon - 85) * Math.PI) / 25);
      const wave2 = 3 * Math.cos(((lat - 35) * Math.PI) / 12) * Math.sin(((lon - 115) * Math.PI) / 20);
      const wave3 = 2 * Math.sin(((lat - 45) * Math.PI) / 10) * Math.cos(((lon - 95) * Math.PI) / 15);

      grid[i][j] = baseTemp + meridional + continental + wave1 + wave2 + wave3;
    }
  }
  return grid;
}

function satVaporPressure(T: number): number {
  return 6.1078 * Math.exp(17.269 * T / (T + 237.3));
}

function generateHumidity(tempGrid: number[][], level: PressureLevel): number[][] {
  const grid: number[][] = [];
  const rhBase = level <= 850 ? 0.7 : 0.45;

  for (let i = 0; i < LAT_COUNT; i++) {
    grid[i] = [];
    const lat = CONFIG.latMin + i * CONFIG.latStep;

    for (let j = 0; j < LON_COUNT; j++) {
      const lon = CONFIG.lonMin + j * CONFIG.lonStep;
      const T = tempGrid[i][j];

      const e_s = satVaporPressure(T);

      const coastal = 0.3 * Math.exp(-Math.pow(lon - 125, 2) / 300) * (1 - (lat - 25) / 30);
      const desert = -0.25 * Math.exp(-Math.pow(lon - 100, 2) / 200) * Math.exp(-Math.pow(lat - 40, 2) / 200);
      const plateau = -0.2 * Math.exp(-Math.pow(lon - 90, 2) / 150) * Math.exp(-Math.pow(lat - 35, 2) / 100);
      const tropical = 0.15 * Math.exp(-Math.pow(lat - 20, 2) / 50) * Math.sin(((lon - 110) * Math.PI) / 30);

      const rh = clamped(rhBase + coastal + desert + plateau + tropical, 0.05, 0.98);
      grid[i][j] = rh * e_s;
    }
  }
  return grid;
}

function computeGeostrophicWind(tempGrid: number[][], level: PressureLevel): { u: number[][]; v: number[][] } {
  const u: number[][] = [];
  const v: number[][] = [];

  for (let i = 0; i < LAT_COUNT; i++) {
    u[i] = [];
    v[i] = [];
    const lat = CONFIG.latMin + i * CONFIG.latStep;
    const f = 2 * OMEGA * Math.sin((lat * Math.PI) / 180);
    const fAbs = Math.max(Math.abs(f), 1e-5);
    const fSign = f >= 0 ? 1 : -1;

    for (let j = 0; j < LON_COUNT; j++) {
      let dTdx = 0;
      let dTdy = 0;

      if (j > 0 && j < LON_COUNT - 1) {
        dTdx = (tempGrid[i][j + 1] - tempGrid[i][j - 1]) / (2 * CONFIG.lonStep * 111000 * Math.cos((lat * Math.PI) / 180));
      } else if (j === 0) {
        dTdx = (tempGrid[i][j + 1] - tempGrid[i][j]) / (CONFIG.lonStep * 111000 * Math.cos((lat * Math.PI) / 180));
      } else {
        dTdx = (tempGrid[i][j] - tempGrid[i][j - 1]) / (CONFIG.lonStep * 111000 * Math.cos((lat * Math.PI) / 180));
      }

      if (i > 0 && i < LAT_COUNT - 1) {
        dTdy = (tempGrid[i + 1][j] - tempGrid[i - 1][j]) / (2 * CONFIG.latStep * 111000);
      } else if (i === 0) {
        dTdy = (tempGrid[i + 1][j] - tempGrid[i][j]) / (CONFIG.latStep * 111000);
      } else {
        dTdy = (tempGrid[i][j] - tempGrid[i - 1][j]) / (CONFIG.latStep * 111000);
      }

      const H = LEVEL_HEIGHTS[level] * 1000;
      const T_avg = LEVEL_BASE_TEMPS[level] + 273.15;
      const thermalWindFactor = (G * H) / (fAbs * T_avg) * fSign;

      u[i][j] = clamped(-thermalWindFactor * dTdy * 1000, -40, 40);
      v[i][j] = clamped(thermalWindFactor * dTdx * 1000, -40, 40);

      const bgU = level === 250 ? 15 : level === 500 ? 10 : level === 850 ? 6 : 3;
      const bgV = level === 250 ? 2 : level === 500 ? 1.5 : level === 850 ? 1 : 0.5;
      const lonVal = CONFIG.lonMin + j * CONFIG.lonStep;
      u[i][j] += bgU * Math.sin(((lat - 25) / 30) * Math.PI);
      v[i][j] += bgV * Math.cos(((lonVal - 105) / 35) * Math.PI);

      const jetEffect = Math.exp(-((lat - 42) ** 2) / 45) * (level === 250 ? 25 : level === 500 ? 15 : level === 850 ? 6 : 2);
      u[i][j] += jetEffect * Math.cos(((CONFIG.lonMin + j * CONFIG.lonStep) - 110) * Math.PI / 55);

      const troughRidge = Math.sin(((lonVal - 100) * Math.PI) / 60) * 3;
      v[i][j] += troughRidge * (level / 1000);

      const baseMag = Math.sqrt(u[i][j] ** 2 + v[i][j] ** 2);
      if (baseMag > 40) {
        const ratio = 40 / baseMag;
        u[i][j] *= ratio;
        v[i][j] *= ratio;
      }
    }
  }
  return { u, v };
}

function advectField(
  field: number[][],
  u: number[][],
  v: number[][],
  dtSeconds: number
): number[][] {
  const result: number[][] = [];
  const dxMeters = CONFIG.lonStep * 111000;
  const dyMeters = CONFIG.latStep * 111000;

  for (let i = 0; i < LAT_COUNT; i++) {
    result[i] = [];
    const lat = CONFIG.latMin + i * CONFIG.latStep;
    const cosLat = Math.cos((lat * Math.PI) / 180);

    for (let j = 0; j < LON_COUNT; j++) {
      let dTdx = 0;
      let dTdy = 0;

      if (j > 0 && j < LON_COUNT - 1) {
        dTdx = (field[i][j + 1] - field[i][j - 1]) / (2 * dxMeters * cosLat);
      }
      if (i > 0 && i < LAT_COUNT - 1) {
        dTdy = (field[i + 1][j] - field[i - 1][j]) / (2 * dyMeters);
      }

      const advection = -(u[i][j] * dTdx + v[i][j] * dTdy);

      result[i][j] = field[i][j] + advection * dtSeconds * 0.5;
    }
  }
  return result;
}

function evolveToStep(level: PressureLevel, targetStep: number): {
  temperature: number[][];
  humidity: number[][];
  u: number[][];
  v: number[][];
} {
  let temp = generateInitialTemperature(level);
  const dtSeconds = 3600;

  for (let step = 0; step < targetStep; step++) {
    const wind = computeGeostrophicWind(temp, level);
    let { u, v } = wind;

    const wavePhase = step * 0.08;
    for (let i = 0; i < LAT_COUNT; i++) {
      const lat = CONFIG.latMin + i * CONFIG.latStep;
      for (let j = 0; j < LON_COUNT; j++) {
        const lon = CONFIG.lonMin + j * CONFIG.lonStep;
        const rossby = 2.5 * Math.sin(((lat - 35) / 18) * Math.PI * 2 + wavePhase) *
                       Math.cos(((lon - 110) / 28) * Math.PI * 2 + wavePhase * 0.65);
        u[i][j] += rossby;
        v[i][j] += rossby * 0.5;
      }
    }

    temp = advectField(temp, u, v, dtSeconds);

    const damping = 0.997;
    const initTemp = generateInitialTemperature(level);
    for (let i = 0; i < LAT_COUNT; i++) {
      for (let j = 0; j < LON_COUNT; j++) {
        temp[i][j] = temp[i][j] * damping + initTemp[i][j] * (1 - damping);
      }
    }
  }

  const wind = computeGeostrophicWind(temp, level);
  let { u, v } = wind;

  if (targetStep > 0) {
    const wavePhase = targetStep * 0.08;
    for (let i = 0; i < LAT_COUNT; i++) {
      const lat = CONFIG.latMin + i * CONFIG.latStep;
      for (let j = 0; j < LON_COUNT; j++) {
        const lon = CONFIG.lonMin + j * CONFIG.lonStep;
        const rossby = 2.5 * Math.sin(((lat - 35) / 18) * Math.PI * 2 + wavePhase) *
                       Math.cos(((lon - 110) / 28) * Math.PI * 2 + wavePhase * 0.65);
        u[i][j] += rossby;
        v[i][j] += rossby * 0.5;
      }
    }
  }

  const humidity = generateHumidity(temp, level);

  return { temperature: temp, humidity, u, v };
}

function getOrCompute(variable: string, level: PressureLevel, step: number) {
  const key = cacheKey(variable, level, step);
  if (CACHE.has(key)) return CACHE.get(key);

  const data = evolveToStep(level, step);

  let result: GridData | WindGridData;
  if (variable === 'wind') {
    result = {
      latMin: CONFIG.latMin, latMax: CONFIG.latMax, latStep: CONFIG.latStep,
      lonMin: CONFIG.lonMin, lonMax: CONFIG.lonMax, lonStep: CONFIG.lonStep,
      u: data.u, v: data.v,
    };
  } else {
    const values = variable === 'temperature' ? data.temperature : data.humidity;
    result = {
      latMin: CONFIG.latMin, latMax: CONFIG.latMax, latStep: CONFIG.latStep,
      lonMin: CONFIG.lonMin, lonMax: CONFIG.lonMax, lonStep: CONFIG.lonStep,
      values,
    };
  }

  CACHE.set(key, result);
  if (CACHE.size > 500) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey) CACHE.delete(firstKey);
  }

  return result;
}

export function getGridData(variable: 'temperature' | 'humidity' | 'wind_speed', level: PressureLevel, step: number): GridData {
  if (variable === 'wind_speed') {
    const windData = getOrCompute('wind', level, step) as WindGridData;
    const values: number[][] = [];
    for (let i = 0; i < windData.u.length; i++) {
      values[i] = [];
      for (let j = 0; j < windData.u[i].length; j++) {
        values[i][j] = Math.sqrt(windData.u[i][j] ** 2 + windData.v[i][j] ** 2);
      }
    }
    return {
      latMin: windData.latMin, latMax: windData.latMax, latStep: windData.latStep,
      lonMin: windData.lonMin, lonMax: windData.lonMax, lonStep: windData.lonStep,
      values,
    };
  }
  return getOrCompute(variable, level, step) as GridData;
}

export function getWindData(level: PressureLevel, step: number): WindGridData {
  return getOrCompute('wind', level, step) as WindGridData;
}

export function getPointData(lat: number, lon: number, level: PressureLevel, step: number): PointData {
  const data = evolveToStep(level, step);

  const latIdx = (lat - CONFIG.latMin) / CONFIG.latStep;
  const lonIdx = (lon - CONFIG.lonMin) / CONFIG.lonStep;

  const i = clamped(Math.round(latIdx), 0, LAT_COUNT - 1);
  const j = clamped(Math.round(lonIdx), 0, LON_COUNT - 1);

  const temperature = data.temperature[i][j];
  const humidity = data.humidity[i][j];
  const u = data.u[i][j];
  const v = data.v[i][j];

  return {
    temperature,
    humidity,
    windSpeed: Math.sqrt(u * u + v * v),
    windDirection: (Math.atan2(-u, -v) * 180) / Math.PI,
    u,
    v,
  };
}

export function getTimesteps() {
  const steps = Array.from({ length: 73 }, (_, i) => i);
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - startTime.getHours() % 6, 0, 0, 0);
  return {
    steps,
    startTime: startTime.toISOString(),
    stepHours: 1,
  };
}

export type { PressureLevel, GridData, WindGridData, PointData };
