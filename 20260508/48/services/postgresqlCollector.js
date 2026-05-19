const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const moment = require('moment');
require('dotenv').config();

class PostgreSQLCollector {
  constructor() {
    this.config = {
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432'),
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      database: process.env.PG_DATABASE || 'postgres'
    };
    this.client = null;
  }

  async connect() {
    if (!this.client) {
      this.client = new Client(this.config);
      await this.client.connect();
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  determineSqlType(sql) {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('REPLACE')) return 'REPLACE';
    if (trimmed.startsWith('CREATE')) return 'CREATE';
    if (trimmed.startsWith('ALTER')) return 'ALTER';
    if (trimmed.startsWith('DROP')) return 'DROP';
    return 'OTHER';
  }

  async collectFromLogDirectory(logDirectory, sinceTime, limit = 1000) {
    const logDir = logDirectory || process.env.PG_LOG_DIRECTORY || '/var/log/postgresql';
    const queries = [];

    const files = fs.readdirSync(logDir).filter(f => f.endsWith('.csv') || f.endsWith('.log'));

    for (const file of files) {
      const filePath = path.join(logDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = this.parsePostgresLog(content, sinceTime);
      queries.push(...parsed);

      if (queries.length >= limit) break;
    }

    return queries.slice(0, limit);
  }

  parsePostgresLog(content, sinceTime) {
    const queries = [];
    const lines = content.split('\n');
    let currentEntry = null;

    for (const line of lines) {
      const logMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC:(\d+\.\d+\.\d+\.\d+)\(\d+\):(.+?)@(.+?):(\w+):\s*(.+)$/);

      if (logMatch) {
        if (currentEntry && currentEntry.duration > 0) {
          queries.push(this.normalizeLogEntry(currentEntry));
        }

        const [, timestamp, host, user, database, pid, message] = logMatch;
        const entryTime = moment(timestamp, 'YYYY-MM-DD HH:mm:ss');

        if (sinceTime && entryTime.isBefore(moment(sinceTime))) {
          currentEntry = null;
          continue;
        }

        currentEntry = {
          timestamp: entryTime.toISOString(),
          host,
          user,
          database,
          pid,
          message: message,
          duration: 0,
          sqlText: ''
        };

        const durationMatch = message.match(/duration:\s*([\d.]+)\s*ms/);
        if (durationMatch) {
          currentEntry.duration = parseFloat(durationMatch[1]) / 1000;
        }

        const statementMatch = message.match(/statement:\s*(.+)$/);
        if (statementMatch) {
          currentEntry.sqlText = statementMatch[1].trim();
        }
      } else if (currentEntry && !line.startsWith('\t')) {
        currentEntry.sqlText += ' ' + line.trim();
      }
    }

    if (currentEntry && currentEntry.duration > 0) {
      queries.push(this.normalizeLogEntry(currentEntry));
    }

    return queries;
  }

  normalizeLogEntry(entry) {
    const sqlType = this.determineSqlType(entry.sqlText);
    const checksum = this.generateChecksum(entry.sqlText, entry.timestamp, entry.database);

    return {
      id: checksum,
      db_type: 'postgresql',
      database: entry.database || 'unknown',
      sql_text: entry.sqlText,
      sql_type: sqlType,
      execution_time: entry.duration,
      lock_wait_time: 0,
      rows_sent: 0,
      rows_examined: 0,
      host: entry.host || 'unknown',
      user: entry.user || 'unknown',
      start_time: entry.timestamp,
      end_time: null,
      created_at: new Date().toISOString(),
      checksum
    };
  }

  async collectFromPgStatStatements(sinceTime, limit = 1000) {
    const client = await this.connect();

    const query = `
      SELECT
        pss.query,
        pss.total_exec_time / 1000 as total_exec_time,
        pss.mean_exec_time / 1000 as mean_exec_time,
        pss.max_exec_time / 1000 as max_exec_time,
        pss.calls,
        pss.rows,
        pd.datname as database
      FROM pg_stat_statements pss
      LEFT JOIN pg_database pd ON pss.dbid = pd.oid
      WHERE pss.mean_exec_time / 1000 >= $1
      ORDER BY pss.mean_exec_time DESC
      LIMIT $2
    `;

    const minTime = parseFloat(process.env.MYSQL_LONG_QUERY_TIME || '1');
    const result = await client.query(query, [minTime, limit]);

    return result.rows.map(row => this.normalizePgStatStatement(row));
  }

  normalizePgStatStatement(row) {
    const sqlType = this.determineSqlType(row.query);
    const startTime = new Date().toISOString();
    const checksum = this.generateChecksum(row.query, startTime, row.database);

    return {
      id: checksum,
      db_type: 'postgresql',
      database: row.database || 'unknown',
      sql_text: row.query,
      sql_type: sqlType,
      execution_time: parseFloat(row.mean_exec_time) || 0,
      lock_wait_time: 0,
      rows_sent: parseInt(row.rows) || 0,
      rows_examined: 0,
      host: process.env.PG_HOST || 'localhost',
      user: process.env.PG_USER || 'postgres',
      start_time: startTime,
      end_time: null,
      created_at: new Date().toISOString(),
      checksum
    };
  }

  generateChecksum(sqlText, startTime, database) {
    const hash = crypto.createHash('md5');
    hash.update(`${sqlText}-${startTime}-postgresql-${database}`);
    return hash.digest('hex');
  }

  async explain(sqlText, database) {
    const client = await this.connect();

    const validationError = this.validateExplainSql(sqlText);
    if (validationError) {
      return {
        success: false,
        error: validationError
      };
    }

    const dbValidationError = this.validateDatabaseName(database);
    if (dbValidationError) {
      return {
        success: false,
        error: dbValidationError
      };
    }

    try {
      if (database && database !== 'unknown') {
        const escapedDb = client.escapeIdentifier(database);
        await client.query(`SET search_path TO ${escapedDb}`);
      }

      const escapedSql = client.escapeLiteral(sqlText);
      const result = await client.query(`EXPLAIN ANALYZE ${escapedSql.slice(1, -1)}`);
      return {
        success: true,
        data: result.rows.map(row => row['QUERY PLAN']).join('\n')
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateExplainSql(sql) {
    if (!sql || typeof sql !== 'string') {
      return 'SQL 语句不能为空';
    }

    const trimmed = sql.trim();
    if (trimmed.length === 0) {
      return 'SQL 语句不能为空';
    }

    if (trimmed.length > 10000) {
      return 'SQL 语句过长';
    }

    const dangerousPatterns = [
      /;/g,
      /--/g,
      /\/\*/g,
      /\*\//g,
      /\bDROP\b/i,
      /\bALTER\b/i,
      /\bCREATE\b/i,
      /\bEXEC\b/i,
      /\bEXECUTE\b/i,
      /\bUNION\b/i,
      /\bCOPY\b/i,
      /\bINFORMATION_SCHEMA/i,
      /\bPG_CATALOG/i,
      /\bSLEEP\b/i,
      /\bPG_SLEEP\s*\(/i,
      /\b(?:OR|AND)\s+['"\d]+\s*=\s*['"\d]+/i,
      /\$\$/g,
      /\bCURRENT_USER\b/i,
      /\bSESSION_USER\b/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        return 'SQL 语句包含危险字符或关键字';
      }
    }

    if (!/^\s*(?:SELECT|UPDATE|DELETE|INSERT|REPLACE)\b/i.test(trimmed)) {
      return '只支持 SELECT/UPDATE/DELETE/INSERT/REPLACE 语句的 EXPLAIN 分析';
    }

    return null;
  }

  validateDatabaseName(database) {
    if (!database || database === 'unknown') {
      return null;
    }

    if (typeof database !== 'string') {
      return '数据库名格式不正确';
    }

    if (database.length > 63) {
      return '数据库名过长';
    }

    if (!/^[a-zA-Z0-9_$]+$/.test(database)) {
      return '数据库名包含非法字符';
    }

    return null;
  }

  async enableLogging() {
    const client = await this.connect();

    const settings = [
      "shared_preload_libraries = 'pg_stat_statements'",
      "log_min_duration_statement = 1000",
      "log_destination = 'csvlog'",
      "logging_collector = on",
      "log_directory = 'pg_log'",
      "log_filename = 'postgresql-%Y-%m-%d.log'"
    ];

    console.log('请手动在 postgresql.conf 中配置以下参数：');
    console.log(settings.join('\n'));
    console.log('\n配置完成后需要重启 PostgreSQL 服务');

    return settings;
  }

  async getStatus() {
    const client = await this.connect();

    const result = await client.query(`
      SELECT name, setting
      FROM pg_settings
      WHERE name IN ('log_min_duration_statement', 'log_destination', 'logging_collector')
    `);

    return result.rows;
  }
}

module.exports = PostgreSQLCollector;
