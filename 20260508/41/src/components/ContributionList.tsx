import type { AuthorContribution, GitCommit } from '../types';

interface ContributionListProps {
  authors: AuthorContribution[];
  commits: GitCommit[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ContributionList({ authors, commits }: ContributionListProps) {
  const recentCommits = commits.slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-gray-800 mb-4">贡献排行榜</h3>
        <div className="space-y-3">
          {authors.map((author, index) => (
            <div key={author.name} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              >
                {author.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 truncate">{author.name}</span>
                  <span className="text-sm text-gray-500">{author.commits} 次提交</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${author.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700 w-12 text-right">
                {author.percentage}%
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">详细统计</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-2 font-medium">作者</th>
                  <th className="text-right py-2 font-medium">提交</th>
                  <th className="text-right py-2 font-medium">新增</th>
                  <th className="text-right py-2 font-medium">删除</th>
                </tr>
              </thead>
              <tbody>
                {authors.map((author, index) => (
                  <tr key={author.name} className="border-t border-gray-50">
                    <td className="py-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {author.name}
                    </td>
                    <td className="text-right py-2 text-gray-700">{author.commits}</td>
                    <td className="text-right py-2 text-green-600">+{author.additions.toLocaleString()}</td>
                    <td className="text-right py-2 text-red-500">-{author.deletions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-gray-800 mb-4">最近提交</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {recentCommits.map((commit) => (
            <div key={commit.id} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{
                    backgroundColor: COLORS[authors.findIndex((a) => a.name === commit.author) % COLORS.length] || '#6b7280',
                  }}
                >
                  {commit.author.charAt(0)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">{commit.author}</span>
                  <span className="text-xs text-gray-400">{formatDate(commit.date)}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{commit.message}</p>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="text-green-600">+{commit.additions}</span>
                  <span className="text-red-500">-{commit.deletions}</span>
                  <span className="text-gray-400">{commit.files.length} 个文件</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
