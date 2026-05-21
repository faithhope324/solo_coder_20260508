export interface CdnStats {
  hitRate: number;
  bandwidth: number;
  requestCount: number;
  timestamp: string;
}

export interface HourlyStats {
  time: string;
  hitRate: number;
  bandwidth: number;
}

export interface TaskProgressResult {
  status: 'processing' | 'success' | 'failed';
  progress: number;
  successCount: number;
  failCount: number;
}

const generateHitRate = (base: number) => {
  return Math.min(99, Math.max(70, base + (Math.random() - 0.5) * 10));
};

const generateBandwidth = (base: number) => {
  return Math.max(10, base + (Math.random() - 0.5) * base * 0.3);
};

export const getCdnOverview = (domain: string) => {
  const baseHitRate = 85 + Math.random() * 10;
  const baseBandwidth = 500 + Math.random() * 500;

  return {
    domain,
    currentHitRate: generateHitRate(baseHitRate),
    currentBandwidth: generateBandwidth(baseBandwidth),
    todayRequestCount: Math.floor(100000 + Math.random() * 500000),
    todayFlow: Math.floor(500 + Math.random() * 1000),
    activeStatus: 'online' as const,
  };
};

export const getHourlyStats = (domain: string, hours: number = 24): HourlyStats[] => {
  const stats: HourlyStats[] = [];
  const now = new Date();
  const baseHitRate = 85 + Math.random() * 10;
  const baseBandwidth = 500 + Math.random() * 500;

  for (let i = hours - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStr = `${time.getHours().toString().padStart(2, '0')}:00`;
    stats.push({
      time: hourStr,
      hitRate: parseFloat(generateHitRate(baseHitRate).toFixed(2)),
      bandwidth: parseFloat(generateBandwidth(baseBandwidth).toFixed(2)),
    });
  }

  return stats;
};

export const submitPreheatTask = async (urls: string[], domain: string): Promise<{ taskId: string }> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    taskId: `PREHEAT_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
  };
};

export const submitRefreshTask = async (urls: string[], domain: string): Promise<{ taskId: string }> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    taskId: `REFRESH_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
  };
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const getTaskProgress = async (
  taskId: number,
  totalCount: number,
  elapsedMs: number
): Promise<TaskProgressResult> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  const baseSeed = taskId * 1000 + Math.floor(elapsedMs / 2000);
  const rand1 = seededRandom(baseSeed);
  const rand2 = seededRandom(baseSeed + 1);

  const totalDuration = 8000 + (rand1 * 12000);
  const rawProgress = Math.min(100, Math.floor((elapsedMs / totalDuration) * 100));

  const hasError = seededRandom(taskId * 13) < 0.08;
  const errorAtProgress = hasError ? Math.floor(30 + seededRandom(taskId * 17) * 40) : 100;

  if (hasError && rawProgress >= errorAtProgress) {
    const failCount = Math.max(1, Math.floor(totalCount * (0.1 + rand2 * 0.2)));
    const successCount = Math.floor(totalCount * (errorAtProgress / 100)) - failCount;
    return {
      status: 'failed',
      progress: errorAtProgress,
      successCount: Math.max(0, successCount),
      failCount,
    };
  }

  if (rawProgress >= 100) {
    const failCount = rand2 < 0.15 ? Math.floor(1 + rand2 * 2) : 0;
    return {
      status: 'success',
      progress: 100,
      successCount: totalCount - failCount,
      failCount,
    };
  }

  const processedCount = Math.floor(totalCount * (rawProgress / 100));
  const failCount = rand2 < 0.1 ? Math.min(processedCount, Math.floor(1 + rand2 * 2)) : 0;
  const successCount = processedCount - failCount;

  return {
    status: 'processing',
    progress: rawProgress,
    successCount: Math.max(0, successCount),
    failCount,
  };
};
