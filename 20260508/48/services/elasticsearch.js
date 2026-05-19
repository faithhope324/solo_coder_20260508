const { Client } = require('@elastic/elasticsearch');
const crypto = require('crypto');
require('dotenv').config();

class ElasticsearchService {
  constructor() {
    this.client = new Client({
      node: process.env.ES_HOST || 'http://localhost:9200',
      auth: process.env.ES_USER ? {
        username: process.env.ES_USER,
        password: process.env.ES_PASSWORD
      } : undefined
    });
    this.index = process.env.ES_INDEX || 'slow_queries';
  }

  async init() {
    const exists = await this.client.indices.exists({ index: this.index });
    if (!exists) {
      await this.createIndex();
    }
  }

  async createIndex() {
    await this.client.indices.create({
      index: this.index,
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            db_type: { type: 'keyword' },
            database: { type: 'keyword' },
            sql_text: { type: 'text', analyzer: 'standard' },
            sql_type: { type: 'keyword' },
            execution_time: { type: 'float' },
            lock_wait_time: { type: 'float' },
            rows_sent: { type: 'integer' },
            rows_examined: { type: 'integer' },
            host: { type: 'keyword' },
            user: { type: 'keyword' },
            start_time: { type: 'date' },
            end_time: { type: 'date' },
            created_at: { type: 'date' },
            checksum: { type: 'keyword' }
          }
        }
      }
    });
  }

  generateChecksum(sqlText, startTime, dbType, database) {
    const hash = crypto.createHash('md5');
    hash.update(`${sqlText}-${startTime}-${dbType}-${database}`);
    return hash.digest('hex');
  }

  async bulkInsert(queries) {
    if (queries.length === 0) return 0;

    const operations = [];
    for (const doc of queries) {
      const checksum = doc.checksum || this.generateChecksum(doc.sql_text, doc.start_time, doc.db_type, doc.database);
      operations.push({ index: { _index: this.index, _id: checksum } });
      operations.push({ ...doc, checksum });
    }

    const result = await this.client.bulk({ operations });
    return result.items.filter(item => item.index && item.index.status < 400).length;
  }

  async search({ dbType, database, startTime, endTime, sqlType, page = 1, pageSize = 20 }) {
    const must = [];

    if (dbType) must.push({ term: { db_type: dbType } });
    if (database) must.push({ term: { database } });
    if (sqlType) must.push({ term: { sql_type: sqlType } });
    if (startTime || endTime) {
      must.push({
        range: {
          start_time: {
            ...(startTime ? { gte: startTime } : {}),
            ...(endTime ? { lte: endTime } : {})
          }
        }
      });
    }

    const result = await this.client.search({
      index: this.index,
      body: {
        query: { bool: { must } },
        sort: [{ start_time: { order: 'desc' } }],
        from: (page - 1) * pageSize,
        size: pageSize
      }
    });

    return {
      total: result.hits.total.value,
      data: result.hits.hits.map(hit => ({
        ...hit._source,
        es_id: hit._id
      }))
    };
  }

  async getStats({ dbType, database, startTime, endTime }) {
    const must = [];

    if (dbType) must.push({ term: { db_type: dbType } });
    if (database) must.push({ term: { database } });
    if (startTime || endTime) {
      must.push({
        range: {
          start_time: {
            ...(startTime ? { gte: startTime } : {}),
            ...(endTime ? { lte: endTime } : {})
          }
        }
      });
    }

    const result = await this.client.search({
      index: this.index,
      body: {
        query: { bool: { must } },
        size: 0,
        aggs: {
          sql_types: {
            terms: { field: 'sql_type', size: 10 }
          },
          avg_execution_time: {
            avg: { field: 'execution_time' }
          },
          max_execution_time: {
            max: { field: 'execution_time' }
          },
          total_queries: {
            value_count: { field: 'checksum' }
          }
        }
      }
    });

    return {
      sqlTypeStats: result.aggregations.sql_types.buckets.map(b => ({
        type: b.key,
        count: b.doc_count
      })),
      avgExecutionTime: result.aggregations.avg_execution_time.value,
      maxExecutionTime: result.aggregations.max_execution_time.value,
      totalQueries: result.aggregations.total_queries.value
    };
  }

  async getDatabases(dbType) {
    const must = [];
    if (dbType) must.push({ term: { db_type: dbType } });

    const result = await this.client.search({
      index: this.index,
      body: {
        query: { bool: { must } },
        size: 0,
        aggs: {
          databases: {
            terms: { field: 'database', size: 100 }
          }
        }
      }
    });

    return result.aggregations.databases.buckets.map(b => b.key);
  }

  async ping() {
    return this.client.ping();
  }
}

module.exports = ElasticsearchService;
