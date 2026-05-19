const SqlFormatter = (function () {
  const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
    'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
    'OUTER', 'ON', 'AS', 'DISTINCT', 'UNION', 'ALL', 'EXISTS', 'LIMIT', 'OFFSET',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER',
    'DROP', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'DEFAULT', 'AUTO_INCREMENT',
    'SERIAL', 'UNIQUE', 'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION', 'RETURNS',
    'BEGIN', 'END', 'IF', 'ELSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WHILE',
    'FOR', 'LOOP', 'RETURN', 'DECLARE', 'CURSOR', 'OPEN', 'FETCH', 'CLOSE',
    'COMMIT', 'ROLLBACK', 'TRANSACTION', 'GRANT', 'REVOKE', 'USE', 'SHOW',
    'EXPLAIN', 'DESCRIBE', 'DESC', 'ANALYZE', 'VACUUM', 'EXPLAIN', 'ANALYSE',
    'WITH', 'RECURSIVE', 'UNION', 'INTERSECT', 'EXCEPT', 'MINUS',
    'FULL', 'CROSS', 'NATURAL', 'USING', 'INNER', 'OUTER', 'SEMI', 'ANTI',
    'OVER', 'PARTITION', 'RANK', 'DENSE_RANK', 'ROW_NUMBER', 'LAG', 'LEAD',
    'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'PERCENT_RANK', 'CUME_DIST',
    'NTILE', 'PERCENTILE_CONT', 'PERCENTILE_DISC', 'WITHIN', 'GROUP', 'FILTER',
    'TRUE', 'FALSE', 'BOOLEAN', 'INTEGER', 'VARCHAR', 'CHAR', 'TEXT', 'DATE',
    'TIME', 'DATETIME', 'TIMESTAMP', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC',
    'BLOB', 'CLOB', 'JSON', 'JSONB', 'XML', 'ARRAY', 'ENUM', 'SET',
    'DISTINCT', 'ALL', 'ANY', 'SOME', 'CURRENT_DATE', 'CURRENT_TIME',
    'CURRENT_TIMESTAMP', 'CURRENT_USER', 'SESSION_USER', 'SYSTEM_USER'
  ];

  const MYSQL_KEYWORDS = [
    'LIMIT', 'OFFSET', 'AUTO_INCREMENT', 'ENGINE', 'CHARSET', 'COLLATE',
    'REPLACE', 'IGNORE', 'FORCE', 'USE', 'IGNORE', 'FOR UPDATE', 'LOCK IN SHARE MODE',
    'CONVERT_TZ', 'DATE_FORMAT', 'STR_TO_DATE', 'NOW', 'CURDATE', 'CURTIME',
    'UNIX_TIMESTAMP', 'FROM_UNIXTIME', 'DATEDIFF', 'TIMESTAMPDIFF',
    'MD5', 'SHA1', 'SHA2', 'PASSWORD', 'OLD_PASSWORD',
    'IFNULL', 'IF', 'ELT', 'FIELD', 'FIND_IN_SET',
    'GROUP_CONCAT', 'CONCAT_WS', 'CONCAT', 'SUBSTRING_INDEX',
    'INNER', 'LEFT', 'RIGHT', 'CROSS', 'STRAIGHT_JOIN',
    'MATCH', 'AGAINST', 'WITH ROLLUP', 'PROCEDURE ANALYSE',
    'DUAL', 'DELAYED', 'LOW_PRIORITY', 'HIGH_PRIORITY',
    'OPTIMIZE', 'REPAIR', 'ANALYZE', 'CHECK', 'CHECKSUM',
    'BACKUP', 'RESTORE', 'FLUSH', 'RESET', 'PURGE'
  ];

  const POSTGRESQL_KEYWORDS = [
    'SERIAL', 'BIGSERIAL', 'SMALLSERIAL',
    'JSONB', 'UUID', 'INET', 'CIDR', 'MACADDR', 'TSVECTOR', 'TSQUERY',
    'INTERVAL', 'POINT', 'LINE', 'LSEG', 'BOX', 'PATH', 'POLYGON', 'CIRCLE',
    'RETURNING', 'ILIKE', 'SIMILAR', 'TO', 'REGEXP', '~', '!~', '~*', '!~*',
    'LATERAL', 'WITH ORDINALITY', 'UNNEST', 'GENERATE_SERIES',
    'COALESCE', 'NULLIF', 'GREATEST', 'LEAST',
    'ARRAY_AGG', 'STRING_AGG', 'JSON_AGG', 'JSONB_AGG',
    'ROW_TO_JSON', 'TO_JSON', 'JSON_BUILD_OBJECT', 'JSONB_BUILD_OBJECT',
    'JSON_BUILD_ARRAY', 'JSONB_BUILD_ARRAY',
    'EXTRACT', 'DATE_PART', 'AGE', 'NOW', 'CURRENT_TIMESTAMP',
    'OVERLAPS', 'IS DISTINCT FROM', 'IS NOT DISTINCT FROM',
    'TABLESAMPLE', 'BERNOULLI', 'SYSTEM',
    'FOR UPDATE', 'FOR NO KEY UPDATE', 'FOR SHARE', 'FOR KEY SHARE',
    'SKIP LOCKED', 'NOWAIT',
    'MATERIALIZED', 'REFRESH', 'CLUSTER', 'VACUUM', 'ANALYZE',
    'REINDEX', 'VACUUM', 'ANALYZE', 'EXPLAIN', 'ANALYZE',
    'LANGUAGE', 'PLPGSQL', 'IMMUTABLE', 'STABLE', 'VOLATILE',
    'SECURITY', 'DEFINER', 'INVOKER', 'SEARCH_PATH', 'SCHEMA'
  ];

  function getKeywords(dialect) {
    let keywords = [...SQL_KEYWORDS];
    if (dialect === 'mysql') {
      keywords = [...keywords, ...MYSQL_KEYWORDS];
    } else if (dialect === 'postgresql') {
      keywords = [...keywords, ...POSTGRESQL_KEYWORDS];
    }
    return new Set(keywords.map(k => k.toUpperCase()));
  }

  function tokenize(sql) {
    const tokens = [];
    let i = 0;
    const n = sql.length;

    while (i < n) {
      let char = sql[i];

      if (char === '-' && sql[i + 1] === '-') {
        let comment = '';
        while (i < n && sql[i] !== '\n') {
          comment += sql[i++];
        }
        tokens.push({ type: 'comment', value: comment });
        continue;
      }

      if (char === '/' && sql[i + 1] === '*') {
        let comment = '/*';
        i += 2;
        while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) {
          comment += sql[i++];
        }
        if (i < n) {
          comment += '*/';
          i += 2;
        }
        tokens.push({ type: 'comment', value: comment });
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        const quote = char;
        let string = quote;
        i++;
        while (i < n) {
          if (sql[i] === quote) {
            string += quote;
            i++;
            if (sql[i] !== quote) break;
          } else {
            string += sql[i++];
          }
        }
        tokens.push({ type: 'string', value: string, quote: quote });
        continue;
      }

      if (/\d/.test(char)) {
        let number = '';
        while (i < n && /[\d.]/.test(sql[i])) {
          number += sql[i++];
        }
        tokens.push({ type: 'number', value: number });
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        let identifier = '';
        while (i < n && /[a-zA-Z0-9_]/.test(sql[i])) {
          identifier += sql[i++];
        }
        tokens.push({ type: 'identifier', value: identifier });
        continue;
      }

      if (['(', ')', ',', ';', '=', '<', '>', '!', '+', '-', '*', '/', '%', '&', '|', '^', '~'].includes(char)) {
        let operator = char;
        i++;
        if ((char === '<' || char === '>' || char === '!' || char === '+' || char === '-') && sql[i] === '=') {
          operator += '=';
          i++;
        } else if (char === '<' && sql[i] === '>') {
          operator += '>';
          i++;
        }
        tokens.push({ type: 'operator', value: operator });
        continue;
      }

      if (/\s/.test(char)) {
        let whitespace = '';
        while (i < n && /\s/.test(sql[i])) {
          whitespace += sql[i++];
        }
        tokens.push({ type: 'whitespace', value: whitespace });
        continue;
      }

      tokens.push({ type: 'unknown', value: char });
      i++;
    }

    return tokens;
  }

  function format(sql, dialect = 'mysql', options = {}) {
    if (!sql || !sql.trim()) return '';

    const keywords = getKeywords(dialect);
    const tokens = tokenize(sql);
    let output = '';
    let indentLevel = 0;
    const indentSize = options.indentSize || 2;
    const indentChar = options.useTabs ? '\t' : ' ';

    const newlineKeywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER', 'GROUP', 'HAVING',
      'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT', 'INSERT', 'UPDATE',
      'DELETE', 'CREATE', 'ALTER', 'DROP', 'WITH', 'LEFT', 'RIGHT', 'INNER',
      'OUTER', 'FULL', 'CROSS', 'JOIN', 'ON', 'SET', 'VALUES', 'RETURNING'
    ]);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'whitespace') {
        if (token.value.includes('\n')) {
        } else if (i > 0 && tokens[i - 1].type !== 'whitespace' && i < tokens.length - 1 && tokens[i + 1].type !== 'whitespace') {
          output += ' ';
        }
        continue;
      }

      if (token.type === 'comment') {
        output += token.value;
        if (token.value.startsWith('--')) {
          output += '\n';
          output += indentChar.repeat(indentLevel * indentSize);
        }
        continue;
      }

      if (token.type === 'identifier') {
        const upperValue = token.value.toUpperCase();
        if (keywords.has(upperValue)) {
          if (newlineKeywords.has(upperValue) && output.length > 0 && !output.endsWith('\n')) {
            output = output.trimEnd();
            output += '\n';
            output += indentChar.repeat(indentLevel * indentSize);
          }
          output += upperValue;

          if (['SELECT', 'WHERE', 'HAVING', 'SET', 'ON'].includes(upperValue)) {
            indentLevel++;
            output += '\n';
            output += indentChar.repeat(indentLevel * indentSize);
          } else if (['FROM', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'GROUP', 'ORDER', 'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT'].includes(upperValue)) {
            output += ' ';
          }

          if (upperValue === 'BY' && tokens[i - 1] && ['ORDER', 'GROUP'].includes(tokens[i - 1].value.toUpperCase())) {
            output += ' ';
          }
        } else {
          output += token.value;
        }
        continue;
      }

      if (token.type === 'operator') {
        if (token.value === '(') {
          let isFunctionCall = false;
          for (let j = i - 1; j >= 0; j--) {
            const prevToken = tokens[j];
            if (prevToken.type !== 'whitespace' && prevToken.type !== 'comment') {
              if (prevToken.type === 'identifier' && !keywords.has(prevToken.value.toUpperCase())) {
                isFunctionCall = true;
              }
              break;
            }
          }
          
          if (isFunctionCall) {
            output += '(';
          } else {
            output += ' (';
            indentLevel++;
          }
        } else if (token.value === ')') {
          indentLevel = Math.max(0, indentLevel - 1);
          const lastLine = output.split('\n').pop();
          const hasContentOnLine = lastLine && lastLine.trim().length > 0;
          if (hasContentOnLine) {
            output = output.trimEnd();
            output += ')';
          } else {
            output = output.trimEnd();
            output += '\n';
            output += indentChar.repeat(indentLevel * indentSize);
            output += ')';
          }
        } else if (token.value === ',') {
          output += ',\n';
          output += indentChar.repeat(indentLevel * indentSize);
        } else if (token.value === ';') {
          output += ';';
          indentLevel = 0;
          if (i < tokens.length - 1) {
            output += '\n\n';
          }
        } else {
          output += ' ' + token.value + ' ';
        }
        continue;
      }

      if (token.type === 'string' || token.type === 'number') {
        output += token.value;
        continue;
      }

      output += token.value;
    }

    output = output
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();

    return output;
  }

  function minify(sql) {
    if (!sql || !sql.trim()) return '';

    const tokens = tokenize(sql);
    let output = '';
    let inValues = false;
    let valueCount = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'comment') {
        continue;
      }

      if (token.type === 'whitespace') {
        if (output.length > 0 && !/\s$/.test(output) && i < tokens.length - 1) {
          const nextToken = tokens[i + 1];
          if (nextToken && nextToken.type !== 'operator' && nextToken.value !== ',' && nextToken.value !== ')') {
            output += ' ';
          }
        }
        continue;
      }

      if (token.type === 'identifier') {
        const upperValue = token.value.toUpperCase();
        if (upperValue === 'VALUES') {
          inValues = true;
          valueCount = 0;
        }
        output += upperValue;
        continue;
      }

      if (token.type === 'operator') {
        if (token.value === '(' && inValues) {
          valueCount++;
        } else if (token.value === ')' && inValues) {
          valueCount--;
          if (valueCount === 0 && i < tokens.length - 1) {
            const nextToken = tokens.find((t, idx) => idx > i && t.type !== 'whitespace' && t.type !== 'comment');
            if (nextToken && nextToken.value === ',') {
              output += ')';
              i++;
              while (i < tokens.length && tokens[i].type === 'whitespace') i++;
              if (i < tokens.length && tokens[i].value === ',') {
                output += ',';
              }
              continue;
            }
          }
        }

        if (token.value === ';') {
          inValues = false;
          valueCount = 0;
        }

        if (['=', '<', '>', '!', '+', '-', '*', '/', '%', '<=', '>=', '!=', '<>'].includes(token.value)) {
          output += ' ' + token.value + ' ';
        } else if (token.value === ',') {
          output += ',';
        } else {
          output += token.value;
        }
        continue;
      }

      output += token.value;
    }

    return output.replace(/\s+/g, ' ').trim();
  }

  function uppercaseKeywords(sql, dialect = 'mysql') {
    const keywords = getKeywords(dialect);
    const tokens = tokenize(sql);

    return tokens.map(token => {
      if (token.type === 'identifier' && keywords.has(token.value.toUpperCase())) {
        return token.value.toUpperCase();
      }
      return token.value;
    }).join('');
  }

  return {
    format,
    minify,
    uppercaseKeywords,
    tokenize,
    getKeywords
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SqlFormatter;
}
