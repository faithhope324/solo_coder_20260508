export interface GridData {
  latMin: number;
  latMax: number;
  latStep: number;
  lonMin: number;
  lonMax: number;
  lonStep: number;
  values: number[][];
}

export interface WindGridData {
  latMin: number;
  latMax: number;
  latStep: number;
  lonMin: number;
  lonMax: number;
  lonStep: number;
  u: number[][];
  v: number[][];
}

export interface PointData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  u: number;
  v: number;
}

export interface TimestepInfo {
  steps: number[];
  startTime: string;
  stepHours: number;
}

export async function fetchGridData(
  variable: string,
  level: number,
  step: number
): Promise<GridData> {
  const res = await fetch(
    `/api/weather/grid?variable=${variable}&level=${level}&step=${step}`
  );
  if (!res.ok) throw new Error('Failed to fetch grid data');
  return res.json();
}

export async function fetchWindData(
  level: number,
  step: number
): Promise<WindGridData> {
  const res = await fetch(
    `/api/weather/wind?level=${level}&step=${step}`
  );
  if (!res.ok) throw new Error('Failed to fetch wind data');
  return res.json();
}

export async function fetchPointData(
  lat: number,
  lon: number,
  level: number,
  step: number
): Promise<PointData> {
  const res = await fetch(
    `/api/weather/point?lat=${lat}&lon=${lon}&level=${level}&step=${step}`
  );
  if (!res.ok) throw new Error('Failed to fetch point data');
  return res.json();
}

export async function fetchTimesteps(): Promise<TimestepInfo> {
  const res = await fetch('/api/weather/timesteps');
  if (!res.ok) throw new Error('Failed to fetch timesteps');
  return res.json();
}
