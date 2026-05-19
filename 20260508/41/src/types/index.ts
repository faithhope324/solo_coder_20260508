export interface GitCommit {
  id: string;
  author: string;
  email: string;
  date: string;
  message: string;
  additions: number;
  deletions: number;
  files: string[];
}

export interface BranchInfo {
  name: string;
  isDefault: boolean;
  commitCount: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface AuthorContribution {
  name: string;
  commits: number;
  additions: number;
  deletions: number;
  percentage: number;
}

export interface DailyCommit {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface FileExtensionStats {
  extension: string;
  count: number;
  additions: number;
  deletions: number;
}

export interface RepoStats {
  totalCommits: number;
  totalAuthors: number;
  totalAdditions: number;
  totalDeletions: number;
  totalFilesChanged: number;
}
