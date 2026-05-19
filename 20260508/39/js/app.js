class SqlFormatterApp {
  constructor() {
    this.editor = null;
    this.dialect = 'mysql';
    this.currentMode = 'formatted';
    this._init();
  }

  _init() {
    const inputTextarea = document.getElementById('sql-input');
    const outputPre = document.getElementById('sql-output');

    this.editor = new SqlEditor({
      inputElement: inputTextarea,
      outputElement: outputPre,
      dialect: this.dialect,
      hljs: window.hljs,
      onInput: (value) => this._handleInput(value),
      debounceDelay: 200
    });

    this._bindEvents();
    this._loadSample();
  }

  _bindEvents() {
    document.getElementById('btn-format').addEventListener('click', () => this.format());
    document.getElementById('btn-minify').addEventListener('click', () => this.minify());
    document.getElementById('btn-copy').addEventListener('click', () => this.copy());
    document.getElementById('btn-clear').addEventListener('click', () => this.clear());

    document.getElementById('dialect-select').addEventListener('change', (e) => {
      this.setDialect(e.target.value);
    });

    document.getElementById('indent-size').addEventListener('change', (e) => {
      this.format();
    });

    document.getElementById('example-select').addEventListener('change', (e) => {
      this._loadExample(e.target.value);
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.format();
        } else if (e.key === 'c' && e.shiftKey) {
          e.preventDefault();
          this.copy();
        }
      }
    });
  }

  _handleInput(value) {
    if (this.currentMode === 'formatted') {
      this._formatSql(value);
    } else {
      this._minifySql(value);
    }
  }

  _formatSql(sql) {
    const indentSize = parseInt(document.getElementById('indent-size').value) || 2;
    const formatted = SqlFormatter.format(sql, this.dialect, { indentSize });
    this.editor.setOutput(formatted, true);
    this._updateStats(formatted);
  }

  _minifySql(sql) {
    const minified = SqlFormatter.minify(sql);
    this.editor.setOutput(minified, false);
    this._updateStats(minified);
  }

  format() {
    this.currentMode = 'formatted';
    const sql = this.editor.getValue();
    const indentSize = parseInt(document.getElementById('indent-size').value) || 2;
    const formatted = SqlFormatter.format(sql, this.dialect, { indentSize });
    this.editor.setValue(formatted);
    this.editor.setOutput(formatted, true);
    this._updateStats(formatted);
    this._showToast('格式化成功！');
  }

  minify() {
    this.currentMode = 'minified';
    const sql = this.editor.getValue();
    const minified = SqlFormatter.minify(sql);
    this.editor.setValue(minified);
    this.editor.setOutput(minified, false);
    this._updateStats(minified);
    this._showToast('压缩成功！');
  }

  copy() {
    this.editor.copy()
      .then(() => this._showToast('已复制到剪贴板！'))
      .catch(() => this._showToast('复制失败，请手动复制', 'error'));
  }

  clear() {
    this.editor.clear();
    document.getElementById('stats').textContent = '';
    this.currentMode = 'formatted';
  }

  setDialect(dialect) {
    this.dialect = dialect;
    this.editor.setDialect(dialect);
    this._showToast(`已切换到 ${dialect === 'mysql' ? 'MySQL' : 'PostgreSQL'} 方言`);
  }

  _updateStats(sql) {
    const lines = sql.split('\n').length;
    const chars = sql.length;
    const words = sql.trim() ? sql.trim().split(/\s+/).length : 0;
    document.getElementById('stats').textContent = `行: ${lines} | 字符: ${chars} | 词: ${words}`;
  }

  _loadSample() {
    const sample = `select u.id, u.name, u.email, count(o.id) as order_count
from users u
left join orders o on u.id = o.user_id
where u.created_at >= '2024-01-01'
and u.status = 'active'
group by u.id, u.name, u.email
having count(o.id) > 5
order by order_count desc
limit 10;`;
    this.editor.setValue(sample);
  }

  _loadExample(type) {
    const examples = {
      'simple': `select * from users where id = 1;`,
      'complex': `select 
    c.category_name,
    count(p.id) as product_count,
    avg(p.price) as avg_price,
    max(p.price) as max_price
from categories c
left join products p on c.id = p.category_id
where p.created_at between '2024-01-01' and '2024-12-31'
and p.is_active = true
group by c.id, c.category_name
having count(p.id) > 0
order by product_count desc
limit 20;`,
      'join': `select 
    u.username,
    o.order_date,
    sum(oi.quantity * oi.unit_price) as total_amount
from users u
inner join orders o on u.id = o.user_id
inner join order_items oi on o.id = oi.order_id
where o.status = 'completed'
and o.order_date >= date_sub(now(), interval 30 day)
group by u.id, u.username, o.order_date
order by total_amount desc;`,
      'insert': `insert into products (name, description, price, category_id, stock_quantity, is_active)
values 
    ('Product 1', 'Description for product 1', 29.99, 1, 100, true),
    ('Product 2', 'Description for product 2', 49.99, 2, 50, true),
    ('Product 3', 'Description for product 3', 19.99, 1, 200, false);`,
      'update': `update users 
set 
    status = 'inactive',
    updated_at = now()
where last_login < date_sub(now(), interval 1 year)
and status = 'active';`,
      'create': `create table if not exists products (
    id serial primary key,
    name varchar(255) not null,
    description text,
    price decimal(10, 2) not null default 0.00,
    category_id integer references categories(id),
    stock_quantity integer not null default 0,
    is_active boolean not null default true,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);

create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_products_is_active on products(is_active);`
    };

    if (examples[type]) {
      this.editor.setValue(examples[type]);
    }
  }

  _showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.sqlFormatterApp = new SqlFormatterApp();
});
