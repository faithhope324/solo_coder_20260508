const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const MySQLCollector = require('./services/mysqlCollector');
const PostgreSQLCollector = require('./services/postgresqlCollector');
const ElasticsearchService = require('./services/elasticsearch');
require('dotenv').config();

const argv = yargs(hideBin(process.argv))
  .option('type', {
    alias: 't',
    description: '数据库类型: mysql 或 postgresql',
    type: 'string',
    default: 'mysql'
  })
  .option('source', {
    alias: 's',
    description: '采集来源: slow_log, performance_schema, log_directory, pg_stat_statements',
    type: 'string',
    default: 'slow_log'
  })
  .option('limit', {
    alias: 'l',
    description: '采集数量限制',
    type: 'number',
    default: 1000
  })
  .option('daemon', {
    alias: 'd',
    description: '守护进程模式',
    type: 'boolean',
    default: false
  })
  .option('interval', {
    alias: 'i',
    description: '采集间隔(毫秒)',
    type: 'number',
    default: 60000
  })
  .help()
  .alias('help', 'h')
  .argv;

async function collectOnce(dbType, source, limit, lastCollectTime) {
  let collector;
  let queries = [];

  try {
    if (dbType === 'mysql') {
      collector = new MySQLCollector();
      if (source === 'slow_log') {
        queries = await collector.collectFromSlowLog(lastCollectTime, limit);
      } else if (source === 'performance_schema') {
        queries = await collector.collectFromPerformanceSchema(lastCollectTime, limit);
      }
    } else if (dbType === 'postgresql') {
      collector = new PostgreSQLCollector();
      if (source === 'log_directory') {
        queries = await collector.collectFromLogDirectory(null, lastCollectTime, limit);
      } else if (source === 'pg_stat_statements') {
        queries = await collector.collectFromPgStatStatements(lastCollectTime, limit);
      }
    } else {
      throw new Error(`不支持的数据库类型: ${dbType}`);
    }

    console.log(`采集到 ${queries.length} 条慢查询`);

    if (queries.length > 0) {
      const esService = new ElasticsearchService();
      await esService.init();
      const inserted = await esService.bulkInsert(queries);
      console.log(`成功写入 Elasticsearch: ${inserted} 条`);
    }

    return new Date().toISOString();
  } catch (error) {
    console.error('采集失败:', error.message);
    throw error;
  } finally {
    if (collector) {
      await collector.disconnect();
    }
  }
}

async function runDaemon(dbType, source, limit, interval) {
  console.log(`启动守护进程模式，间隔: ${interval}ms`);
  let lastCollectTime = null;

  while (true) {
    try {
      lastCollectTime = await collectOnce(dbType, source, limit, lastCollectTime);
    } catch (error) {
      console.error('采集循环出错:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

async function main() {
  const { type, source, limit, daemon, interval } = argv;

  console.log(`开始采集慢查询:`);
  console.log(`  数据库类型: ${type}`);
  console.log(`  采集来源: ${source}`);
  console.log(`  数量限制: ${limit}`);

  if (daemon) {
    await runDaemon(type, source, limit, interval);
  } else {
    await collectOnce(type, source, limit, null);
  }
}

main().catch(error => {
  console.error('程序异常退出:', error);
  process.exit(1);
});
