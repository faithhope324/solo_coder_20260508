const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

class MySQLCollector {
  constructor() {
    this.config = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root',
      database: process.env.MYSQL_DATABASE || 'mysql',
      connectionLimit: 5
    };
    this.pool = null;
  }

  async connect() {
    if (!this.pool) {
      this.pool = mysql.createPool(this.config);
    }
    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
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

  async collectFromSlowLog(sinceTime, limit = 1000) {
    const pool = await this.connect();
    const table = process.env.MYSQL_SLOW_QUERY_TABLE || 'slow_log';
    const longQueryTime = parseFloat(process.env.MYSQL_LONG_QUERY_TIME || '1');

    let query = `
      SELECT
        start_time,
        user_host,
        query_time,
        lock_time,
        rows_sent,
        rows_examined,
        db,
        sql_text
      FROM ${table}
      WHERE query_time >= ?
    `;
    const params = [longQueryTime];

    if (sinceTime) {
      query += ' AND start_time >= ?';
      params.push(sinceTime);
    }

    query += ' ORDER BY start_time DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.execute(query, params);

    return rows.map(row => this.normalizeSlowLogRow(row));
  }

  normalizeSlowLogRow(row) {
    const userHost = (row.user_host || '').toString();
    const userMatch = userHost.match(/^\[([^\]]+)\]/);
    const hostMatch = userHost.match(/@(.+)$/);

    const sqlText = row.sql_text ? row.sql_text.toString() : '';
    const sqlType = this.determineSqlType(sqlText);
    const startTime = new Date(row.start_time).toISOString();
    const checksum = this.generateChecksum(sqlText, startTime, row.db);

    return {
      id: checksum,
      db_type: 'mysql',
      database: row.db || 'unknown',
      sql_text: sqlText,
      sql_type: sqlType,
      execution_time: row.query_time ? parseFloat(row.query_time) : 0,
      lock_wait_time: row.lock_time ? parseFloat(row.lock_time) : 0,
      rows_sent: row.rows_sent ? parseInt(row.rows_sent) : 0,
      rows_examined: row.rows_examined ? parseInt(row.rows_examined) : 0,
      host: hostMatch ? hostMatch[1].trim() : 'unknown',
      user: userMatch ? userMatch[1].trim() : 'unknown',
      start_time: startTime,
      end_time: null,
      created_at: new Date().toISOString(),
      checksum
    };
  }

  generateChecksum(sqlText, startTime, database) {
    const hash = crypto.createHash('md5');
    hash.update(`${sqlText}-${startTime}-mysql-${database}`);
    return hash.digest('hex');
  }

  async collectFromPerformanceSchema(sinceTime, limit = 1000) {
    const pool = await this.connect();
    const longQueryTime = parseFloat(process.env.MYSQL_LONG_QUERY_TIME || '1');

    let serverStartTime = null;
    let timerFrequency = 1000000000000;

    try {
      const [uptimeResult] = await pool.execute('SHOW GLOBAL STATUS LIKE "Uptime"');
      if (uptimeResult.length > 0 && uptimeResult[0].Value) {
        const uptimeSeconds = parseInt(uptimeResult[0].Value) || 0;
        serverStartTime = Date.now() - (uptimeSeconds * 1000);
      }
    } catch (e) {
      try {
        const [uptimeResult2] = await pool.execute('SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = ?', ['UPTIME']);
        if (uptimeResult2.length > 0) {
          const uptimeSeconds = parseInt(uptimeResult2[0].VARIABLE_VALUE || '0');
          serverStartTime = Date.now() - (uptimeSeconds * 1000);
        }
      } catch (e2) {
        console.warn('无法获取 MySQL 启动时间:', e2.message);
      }
    }

    const query = `
      SELECT
        EVENT_ID,
        TRUNCATE(TIMER_WAIT / 1000000000000, 6) as query_time,
        TRUNCATE(LOCK_TIME / 1000000000000, 6) as lock_time,
        SQL_TEXT,
        CURRENT_SCHEMA as db,
        EVENT_NAME,
        TIMER_START,
        TIMER_END,
        USER,
        HOST,
        ROWS_SENT,
        ROWS_EXAMINED
      FROM performance_schema.events_statements_history_long
      WHERE TRUNCATE(TIMER_WAIT / 1000000000000, 6) >= ?
        AND SQL_TEXT IS NOT NULL
        AND SQL_TEXT != ''
    `;

    const [rows] = await pool.execute(query, [longQueryTime]);

    return rows.map(row => this.normalizePerformanceSchemaRow(row, serverStartTime, timerFrequency));
  }

  normalizePerformanceSchemaRow(row, serverStartTime, timerFrequency) {
    const sqlText = row.SQL_TEXT ? row.SQL_TEXT.toString() : '';
    const sqlType = this.determineSqlType(sqlText);

    let startTime;
    if (row.TIMER_START && serverStartTime && timerFrequency) {
      const timerStartMs = Math.floor(parseInt(row.TIMER_START) / timerFrequency * 1000);
      startTime = new Date(serverStartTime + timerStartMs).toISOString();
    } else {
      startTime = new Date().toISOString();
    }

    const checksum = this.generateChecksum(sqlText, startTime, row.db);

    return {
      id: checksum,
      db_type: 'mysql',
      database: row.db || 'unknown',
      sql_text: sqlText,
      sql_type: sqlType,
      execution_time: parseFloat(row.query_time) || 0,
      lock_wait_time: parseFloat(row.lock_time) || 0,
      rows_sent: parseInt(row.ROWS_SENT) || 0,
      rows_examined: parseInt(row.ROWS_EXAMINED) || 0,
      host: row.HOST || 'unknown',
      user: row.USER || 'unknown',
      start_time: startTime,
      end_time: null,
      created_at: new Date().toISOString(),
      checksum
    };
  }

  async explain(sqlText, database) {
    const pool = await this.connect();

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

    let connection;
    try {
      connection = await pool.getConnection();

      if (database && database !== 'unknown') {
        const escapedDb = connection.escapeId(database);
        await connection.execute(`USE ${escapedDb}`);
      }

      const escapedSql = connection.escape(sqlText);
      const [rows] = await connection.execute(`EXPLAIN ${escapedSql.slice(1, -1)}`);
      return {
        success: true,
        data: rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (connection) {
        connection.release();
      }
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
      /\bINTO\s+OUTFILE\b/i,
      /\bLOAD\s+DATA\b/i,
      /\bINFORMATION_SCHEMA/i,
      /\bSLEEP\s*\(/i,
      /\bBENCHMARK\s*\(/i,
      /\b(?:OR|AND)\s+['"\d]+\s*=\s*['"\d]+/i,
      /@/g,
      /@@/g
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

    if (database.length > 64) {
      return '数据库名过长';
    }

    if (!/^[a-zA-Z0-9_$]+$/.test(database)) {
      return '数据库名包含非法字符';
    }

    return null;
  }

  async enableSlowQueryLog() {
    const pool = await this.connect();
    await pool.execute('SET GLOBAL slow_query_log = "ON"');
    await pool.execute(`SET GLOBAL long_query_time = ${process.env.MYSQL_LONG_QUERY_TIME || 1}`);
    await pool.execute('SET GLOBAL log_output = "TABLE"');
  }

  async disableSlowQueryLog() {
    const pool = await this.connect();
    await pool.execute('SET GLOBAL slow_query_log = "OFF"');
  }

  async getStatus() {
    const pool = await this.connect();
    const [rows] = await pool.execute(`
      SHOW VARIABLES LIKE 'slow_query_log'
      UNION ALL
      SHOW VARIABLES LIKE 'long_query_time'
      UNION ALL
      SHOW VARIABLES LIKE 'log_output'
    `);
    return rows;
  }
}

module.exports = MySQLCollector;
