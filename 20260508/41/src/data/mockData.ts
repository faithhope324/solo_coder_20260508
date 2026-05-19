import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import type { GitCommit, BranchInfo, AuthorContribution, DailyCommit, FileExtensionStats, RepoStats } from '../types';

const AUTHORS = [
  { name: '张三', email: 'zhangsan@example.com' },
  { name: '李四', email: 'lisi@example.com' },
  { name: '王五', email: 'wangwu@example.com' },
  { name: '赵六', email: 'zhaoliu@example.com' },
  { name: '陈七', email: 'chenqi@example.com' },
];

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json', '.md', '.html', '.py', '.java', '.go'];

const MESSAGES = [
  'feat: 添加用户认证模块',
  'fix: 修复登录页面bug',
  'docs: 更新API文档',
  'refactor: 重构数据处理逻辑',
  'style: 优化界面样式',
  'test: 添加单元测试',
  'chore: 更新依赖包',
  'perf: 优化加载性能',
  'feat: 实现数据导出功能',
  'fix: 修复内存泄漏问题',
  'feat: 新增仪表盘组件',
  'refactor: 简化状态管理',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCommits(count: number, days: number): GitCommit[] {
  const commits: GitCommit[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = randomInt(0, days);
    const date = subDays(now, daysAgo);
    const author = AUTHORS[randomInt(0, AUTHORS.length - 1)];
    const fileCount = randomInt(1, 8);
    const files: string[] = [];

    for (let j = 0; j < fileCount; j++) {
      const ext = EXTENSIONS[randomInt(0, EXTENSIONS.length - 1)];
      files.push(`src/file${randomInt(1, 100)}${ext}`);
    }

    commits.push({
      id: `commit-${i.toString().padStart(7, '0')}`,
      author: author.name,
      email: author.email,
      date: format(date, 'yyyy-MM-dd HH:mm:ss'),
      message: MESSAGES[randomInt(0, MESSAGES.length - 1)],
      additions: randomInt(5, 500),
      deletions: randomInt(0, 200),
      files: [...new Set(files)],
    });
  }

  return commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const mockBranches: BranchInfo[] = [
  { name: 'main', isDefault: true, commitCount: 1247 },
  { name: 'develop', isDefault: false, commitCount: 856 },
  { name: 'feature/user-auth', isDefault: false, commitCount: 123 },
  { name: 'feature/dashboard', isDefault: false, commitCount: 89 },
  { name: 'hotfix/login-bug', isDefault: false, commitCount: 12 },
  { name: 'release/v2.0', isDefault: false, commitCount: 45 },
];

const branchCommitConfigs: Record<string, { count: number; days: number; seed: number }> = {
  'main': { count: 500, days: 90, seed: 1 },
  'develop': { count: 400, days: 60, seed: 2 },
  'feature/user-auth': { count: 120, days: 30, seed: 3 },
  'feature/dashboard': { count: 80, days: 25, seed: 4 },
  'hotfix/login-bug': { count: 15, days: 7, seed: 5 },
  'release/v2.0': { count: 50, days: 15, seed: 6 },
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateCommitsWithSeed(count: number, days: number, seed: number): GitCommit[] {
  const commits: GitCommit[] = [];
  const now = new Date();
  const random = seededRandom(seed);

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(random() * (days + 1));
    const date = subDays(now, daysAgo);
    const author = AUTHORS[Math.floor(random() * AUTHORS.length)];
    const fileCount = Math.floor(random() * 8) + 1;
    const files: string[] = [];

    for (let j = 0; j < fileCount; j++) {
      const ext = EXTENSIONS[Math.floor(random() * EXTENSIONS.length)];
      files.push(`src/file${Math.floor(random() * 100) + 1}${ext}`);
    }

    commits.push({
      id: `commit-${seed}-${i.toString().padStart(7, '0')}`,
      author: author.name,
      email: author.email,
      date: format(date, 'yyyy-MM-dd HH:mm:ss'),
      message: MESSAGES[Math.floor(random() * MESSAGES.length)],
      additions: Math.floor(random() * 496) + 5,
      deletions: Math.floor(random() * 201),
      files: [...new Set(files)],
    });
  }

  return commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const branchCommitsCache = new Map<string, GitCommit[]>();

export function getCommitsByBranch(branchName: string): GitCommit[] {
  if (branchCommitsCache.has(branchName)) {
    return branchCommitsCache.get(branchName)!;
  }

  const config = branchCommitConfigs[branchName] || branchCommitConfigs['main'];
  const commits = generateCommitsWithSeed(config.count, config.days, config.seed);
  branchCommitsCache.set(branchName, commits);
  return commits;
}

export const mockCommits: GitCommit[] = getCommitsByBranch('main');

export function getDailyCommits(commits: GitCommit[], startDate?: string, endDate?: string): DailyCommit[] {
  const dailyMap = new Map<string, DailyCommit>();

  commits.forEach((commit) => {
    const date = commit.date.split(' ')[0];
    const existing = dailyMap.get(date) || {
      date,
      commits: 0,
      additions: 0,
      deletions: 0,
    };
    existing.commits += 1;
    existing.additions += commit.additions;
    existing.deletions += commit.deletions;
    dailyMap.set(date, existing);
  });

  if (startDate && endDate) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const allDays = eachDayOfInterval({ start, end });

    return allDays.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return dailyMap.get(dateStr) || {
        date: dateStr,
        commits: 0,
        additions: 0,
        deletions: 0,
      };
    });
  }

  if (commits.length === 0) {
    return [];
  }

  const dates = Array.from(dailyMap.keys()).sort();
  const start = parseISO(dates[0]);
  const end = parseISO(dates[dates.length - 1]);
  const allDays = eachDayOfInterval({ start, end });

  return allDays.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return dailyMap.get(dateStr) || {
      date: dateStr,
      commits: 0,
      additions: 0,
      deletions: 0,
    };
  });
}

export function getAuthorContributions(commits: GitCommit[]): AuthorContribution[] {
  const authorMap = new Map<string, Omit<AuthorContribution, 'percentage'>>();

  commits.forEach((commit) => {
    const existing = authorMap.get(commit.author) || {
      name: commit.author,
      commits: 0,
      additions: 0,
      deletions: 0,
    };
    existing.commits += 1;
    existing.additions += commit.additions;
    existing.deletions += commit.deletions;
    authorMap.set(commit.author, existing);
  });

  const totalCommits = commits.length;
  const authors = Array.from(authorMap.values())
    .map((a) => ({
      ...a,
      percentage: Math.round((a.commits / totalCommits) * 100 * 100) / 100,
    }))
    .sort((a, b) => b.commits - a.commits);

  return authors;
}

export function getExtensionStats(commits: GitCommit[]): FileExtensionStats[] {
  const extMap = new Map<string, FileExtensionStats>();

  commits.forEach((commit) => {
    const fileCount = commit.files.length;
    if (fileCount === 0) return;

    const extCounts = new Map<string, number>();
    commit.files.forEach((file) => {
      const match = file.match(/\.[^.]+$/);
      if (match) {
        const ext = match[0];
        extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
      }
    });

    extCounts.forEach((count, ext) => {
      const existing = extMap.get(ext) || {
        extension: ext,
        count: 0,
        additions: 0,
        deletions: 0,
      };
      existing.count += count;
      const ratio = count / fileCount;
      existing.additions += Math.round(commit.additions * ratio);
      existing.deletions += Math.round(commit.deletions * ratio);
      extMap.set(ext, existing);
    });
  });

  return Array.from(extMap.values()).sort((a, b) => b.count - a.count).slice(0, 15);
}

export function getRepoStats(commits: GitCommit[]): RepoStats {
  const fileSet = new Set<string>();
  let totalAdditions = 0;
  let totalDeletions = 0;
  const authorSet = new Set<string>();

  commits.forEach((commit) => {
    totalAdditions += commit.additions;
    totalDeletions += commit.deletions;
    authorSet.add(commit.author);
    commit.files.forEach((f) => fileSet.add(f));
  });

  return {
    totalCommits: commits.length,
    totalAuthors: authorSet.size,
    totalAdditions,
    totalDeletions,
    totalFilesChanged: fileSet.size,
  };
}

export function filterCommitsByDate(commits: GitCommit[], startDate: string, endDate: string): GitCommit[] {
  return commits.filter((commit) => {
    const commitDate = commit.date.split(' ')[0];
    return commitDate >= startDate && commitDate <= endDate;
  });
}
