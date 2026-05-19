const express = require('express');
const cors = require('cors');
const path = require('path');
const ElasticsearchService = require('./services/elasticsearch');
const MySQLCollector = require('./services/mysqlCollector');
const PostgreSQLCollector = require('./services/postgresqlCollector');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const esService = new ElasticsearchService();

app.get('/api/health', async (req, res) => {
  try {
    await esService.ping();
    res.json({ status: 'ok', elasticsearch: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', elasticsearch: 'disconnected', message: error.message });
  }
});

app.get('/api/queries', async (req, res) => {
  try {
    const {
      dbType,
      database,
      startTime,
      endTime,
      sqlType,
      page = 1,
      pageSize = 20
    } = req.query;

    const result = await esService.search({
      dbType,
      database,
      startTime,
      endTime,
      sqlType,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

    res.json(result);
  } catch (error) {
    console.error('查询失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const { dbType, database, startTime, endTime } = req.query;

    const stats = await esService.getStats({
      dbType,
      database,
      startTime,
      endTime
    });

    res.json(stats);
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/databases', async (req, res) => {
  try {
    const { dbType } = req.query;
    const databases = await esService.getDatabases(dbType);
    res.json(databases);
  } catch (error) {
    console.error('获取数据库列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/explain', async (req, res) => {
  try {
    const { sql, dbType, database } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL 语句不能为空' });
    }

    if (!dbType) {
      return res.status(400).json({ error: '数据库类型不能为空' });
    }

    let collector;
    let result;

    try {
      if (dbType === 'mysql') {
        collector = new MySQLCollector();
        result = await collector.explain(sql, database);
      } else if (dbType === 'postgresql') {
        collector = new PostgreSQLCollector();
        result = await collector.explain(sql, database);
      } else {
        return res.status(400).json({ error: `不支持的数据库类型: ${dbType}` });
      }

      res.json(result);
    } finally {
      if (collector) {
        await collector.disconnect();
      }
    }
  } catch (error) {
    console.error('EXPLAIN 失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/collect', async (req, res) => {
  try {
    const { type, source, limit = 1000 } = req.body;

    if (!type) {
      return res.status(400).json({ error: '数据库类型不能为空' });
    }

    let collector;
    let queries = [];

    try {
      if (type === 'mysql') {
        collector = new MySQLCollector();
        if (source === 'slow_log' || !source) {
          queries = await collector.collectFromSlowLog(null, limit);
        } else if (source === 'performance_schema') {
          queries = await collector.collectFromPerformanceSchema(null, limit);
        }
      } else if (type === 'postgresql') {
        collector = new PostgreSQLCollector();
        if (source === 'log_directory' || !source) {
          queries = await collector.collectFromLogDirectory(null, null, limit);
        } else if (source === 'pg_stat_statements') {
          queries = await collector.collectFromPgStatStatements(null, limit);
        }
      } else {
        return res.status(400).json({ error: `不支持的数据库类型: ${type}` });
      }

      if (queries.length > 0) {
        await esService.init();
        const inserted = await esService.bulkInsert(queries);
        res.json({ success: true, collected: queries.length, inserted });
      } else {
        res.json({ success: true, collected: 0, inserted: 0, message: '没有采集到慢查询' });
      }
    } finally {
      if (collector) {
        await collector.disconnect();
      }
    }
  } catch (error) {
    console.error('手动采集失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/generate-test-data', async (req, res) => {
  try {
    await esService.init();

    const sqlTypes = ['SELECT', 'UPDATE', 'DELETE', 'INSERT'];
    const databases = ['ecommerce', 'analytics', 'users', 'orders'];
    const testQueries = [];

    for (let i = 0; i < 50; i++) {
      const sqlType = sqlTypes[Math.floor(Math.random() * sqlTypes.length)];
      const database = databases[Math.floor(Math.random() * databases.length)];
      const executionTime = Math.random() * 10 + 0.5;
      const lockWaitTime = Math.random() * 2;

      let sqlText;
      switch (sqlType) {
        case 'SELECT':
          sqlText = `SELECT * FROM users WHERE id = ${i} AND status = 'active'`;
          break;
        case 'UPDATE':
          sqlText = `UPDATE products SET price = ${100 + i} WHERE category_id = ${i % 10}`;
          break;
        case 'DELETE':
          sqlText = `DELETE FROM logs WHERE created_at < '2024-01-01' LIMIT ${i * 100}`;
          break;
        case 'INSERT':
          sqlText = `INSERT INTO orders (user_id, amount) VALUES (${i}, ${100 + i * 50})`;
          break;
      }

      const startTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

      testQueries.push({
        db_type: 'mysql',
        database,
        sql_text: sqlText,
        sql_type: sqlType,
        execution_time: parseFloat(executionTime.toFixed(3)),
        lock_wait_time: parseFloat(lockWaitTime.toFixed(3)),
        rows_sent: Math.floor(Math.random() * 1000),
        rows_examined: Math.floor(Math.random() * 10000),
        host: 'localhost',
        user: 'app_user',
        start_time: startTime.toISOString(),
        end_time: null,
        created_at: new Date().toISOString()
      });
    }

    const inserted = await esService.bulkInsert(testQueries);
    res.json({ success: true, inserted, total: testQueries.length });
  } catch (error) {
    console.error('生成测试数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await esService.init();
    console.log('Elasticsearch 连接成功');
  } catch (error) {
    console.warn('Elasticsearch 连接失败:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}

startServer();
