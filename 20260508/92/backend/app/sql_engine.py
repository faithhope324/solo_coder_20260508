import re
from dataclasses import dataclass, field

AGG_KEYWORDS = {
    "总和": "SUM", "合计": "SUM", "总计": "SUM", "sum": "SUM", "total": "SUM",
    "平均": "AVG", "平均值": "AVG", "avg": "AVG", "mean": "AVG",
    "最大的": "MAX", "最小的": "MIN", "max": "MAX", "maximum": "MAX",
    "min": "MIN", "minimum": "MIN",
    "计数": "COUNT", "数量": "COUNT", "多少个": "COUNT", "多少条": "COUNT",
    "几个": "COUNT", "count": "COUNT",
}

SORT_KEYWORDS = {
    "最高": "DESC", "最大": "DESC", "最低": "ASC", "最小": "ASC",
    "从高到低": "DESC", "从大到小": "DESC", "降序": "DESC", "desc": "DESC",
    "从低到高": "ASC", "从小到大": "ASC", "升序": "ASC", "asc": "ASC",
}

OPERATORS = [
    (">=", ">="), ("<=", "<="), ("<>", "<>"), ("!=", "<>"),
    (">", ">"), ("<", "<"), ("=", "="),
]

CONNECTORS = {
    "且": "AND", "并且": "AND", "而且": "AND", "和": "AND", "与": "AND", "同时": "AND", "and": "AND",
    "或": "OR", "或者": "OR", "还是": "OR", "or": "OR",
}


@dataclass
class QueryContext:
    columns: list[str] = field(default_factory=list)
    last_sql: str = ""
    last_where: str = ""
    last_order: str = ""
    last_limit: str = ""
    last_result_filters: dict[str, str] = field(default_factory=dict)


def _normalize(text: str) -> str:
    return text.replace("，", ",").replace("：", ":").replace("；", ";").strip()


def _match_column(question: str, columns: list[str]) -> list[str]:
    found = []
    for col in columns:
        if col in question:
            found.append(col)
    if not found:
        for col in columns:
            pattern = re.escape(col)
            if re.search(pattern, question):
                found.append(col)
    return found


def _match_agg(question: str) -> tuple[str, str]:
    for kw, func in AGG_KEYWORDS.items():
        if kw in question:
            return func, kw
    return "", ""


def _match_sort(question: str, columns: list[str]) -> tuple[str, str, str]:
    for kw, direction in SORT_KEYWORDS.items():
        if kw in question:
            sort_col = _find_sort_column(question, kw, columns)
            return direction, kw, sort_col
    return "", "", ""


def _find_sort_column(question: str, sort_kw: str, columns: list[str]) -> str:
    kw_idx = question.find(sort_kw)
    if kw_idx == -1:
        return columns[0] if columns else ""
    before = question[:kw_idx]
    after = question[kw_idx + len(sort_kw):]
    for col in columns:
        if before.rstrip().endswith(col):
            return col
    for col in columns:
        if after.lstrip().startswith(col):
            return col
    for col in columns:
        if after.lstrip().startswith("的" + col):
            return col
    numeric_cols = [c for c in columns if c in question]
    if numeric_cols:
        return numeric_cols[0]
    return columns[0] if columns else ""


def _find_rank_column(question: str, columns: list[str]) -> str:
    for kw in ["前", "top", "TOP", "Top"]:
        idx = question.find(kw)
        if idx != -1:
            before = question[:idx]
            for col in sorted(columns, key=len, reverse=True):
                if before.rstrip().endswith(col):
                    return col
    return columns[0] if columns else ""


QUESTION_WORDS = {"多少", "几", "哪个", "什么", "哪", "谁", "为何", "怎么", "多少个", "多少条"}


def _match_filter(question: str, columns: list[str], df=None) -> list[tuple[str, str, str]]:
    filters = []
    q_lower = question.lower()
    for col in columns:
        col_idx = q_lower.find(col.lower())
        if col_idx == -1:
            continue
        after = question[col_idx + len(col):]
        found = False
        for op_sym, op_sql in OPERATORS:
            idx = after.find(op_sym)
            if idx != -1:
                val = after[idx + len(op_sym):].strip()
                val = val.split(" ")[0].split("，")[0].split(",")[0]
                val = val.rstrip("。.？?；;")
                if val in QUESTION_WORDS:
                    found = True
                    break
                try:
                    float_val = float(val)
                    filters.append((col, op_sql, str(float_val)))
                except ValueError:
                    filters.append((col, op_sql, f"'{val}'"))
                found = True
                break
        if found:
            continue
        for kw in ["是", "为", "等于", "="]:
            idx = after.find(kw)
            if idx != -1:
                val = after[idx + len(kw):].strip()
                val = val.split(" ")[0].split("，")[0].split(",")[0]
                val = val.rstrip("。.？?；;")
                if not val or val in QUESTION_WORDS:
                    found = True
                    break
                try:
                    float_val = float(val)
                    filters.append((col, "=", str(float_val)))
                except ValueError:
                    filters.append((col, "=", f"'{val}'"))
                found = True
                break
        if found:
            continue
        for kw in ["大于", "高于", "超过"]:
            idx = after.find(kw)
            if idx != -1:
                val = after[idx + len(kw):].strip()
                val = val.split(" ")[0].split("，")[0].split(",")[0]
                val = val.rstrip("。.？?；;")
                if val and val not in QUESTION_WORDS:
                    filters.append((col, ">", val))
                found = True
                break
        if found:
            continue
        for kw in ["小于", "低于", "不足"]:
            idx = after.find(kw)
            if idx != -1:
                val = after[idx + len(kw):].strip()
                val = val.split(" ")[0].split("，")[0].split(",")[0]
                val = val.rstrip("。.？?；;")
                if val and val not in QUESTION_WORDS:
                    filters.append((col, "<", val))
                found = True
                break
    if df is not None:
        for col in columns:
            if any(col in f for f in filters):
                continue
            try:
                unique_vals = df[col].dropna().unique().tolist()
            except Exception:
                continue
            for val in unique_vals:
                val_str = str(val)
                if len(val_str) < 2:
                    continue
                if val_str in question and val_str not in QUESTION_WORDS:
                    if val_str.replace('.', '').replace('-', '').lstrip('-').isdigit():
                        quoted = val_str
                    else:
                        quoted = f"'{val_str}'"
                    filters.append((col, "=", quoted))
                    break
    return filters


def _match_limit(question: str) -> int:
    match = re.search(r"前\s*(\d+)", question)
    if match:
        return int(match.group(1))
    match = re.search(r"top\s*(\d+)", question, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r"(\d+)\s*条", question)
    if match:
        return int(match.group(1))
    if any(w in question for w in ["最高", "最大", "最低", "最小"]):
        return 1
    return 0


def _match_connector(question: str) -> str:
    for kw, op in CONNECTORS.items():
        if kw in question:
            return op
    return "AND"


def generate_sql(question: str, table_name: str, columns: list[str],
                 context: QueryContext | None = None, df=None) -> tuple[str, str]:
    context = context or QueryContext(columns=columns)
    q = _normalize(question)
    agg_func, agg_kw = _match_agg(q)
    sort_dir, sort_kw, sort_col = _match_sort(q, columns)
    filters = _match_filter(q, columns, df)
    limit_num = _match_limit(q)
    mentioned_cols = _match_column(q, columns)
    connector = _match_connector(q)

    select_cols = []
    where_clauses = []
    order_by = ""
    limit_clause = ""

    has_filter_ref = "它" in q or "它们" in q or "这个" in q or "这些" in q
    if has_filter_ref:
        if context.last_where and not context.last_result_filters:
            where_clauses.append(context.last_where)
        if context.last_result_filters:
            for col, val in context.last_result_filters.items():
                clause = f'"{col}" = {val}'
                if clause not in where_clauses:
                    where_clauses.append(clause)

    if agg_func and agg_kw in q:
        agg_cols = [c for c in mentioned_cols if c not in "".join(str(f) for f in filters)]
        if not agg_cols:
            agg_cols = mentioned_cols
        if agg_cols:
            select_cols.append(f"{agg_func}(\"{agg_cols[0]}\") AS {agg_func}_{agg_cols[0]}")
            remaining = [c for c in mentioned_cols if c != agg_cols[0]]
            for c in remaining:
                select_cols.append(f"\"{c}\"")
        else:
            select_cols = [f"{agg_func}(*) AS {agg_func}_all"]
        if sort_kw and agg_kw and (sort_kw in agg_kw or agg_kw in sort_kw):
            sort_dir = ""
            sort_col = ""
    elif sort_dir and sort_col:
        if mentioned_cols:
            select_cols = [f"\"{c}\"" for c in mentioned_cols]
        else:
            select_cols = ["*"]
        order_by = f'ORDER BY "{sort_col}" {sort_dir}'
    else:
        if mentioned_cols:
            select_cols = [f"\"{c}\"" for c in mentioned_cols]
        else:
            select_cols = ["*"]

    for col, op, val in filters:
        where_clauses.append(f'"{col}" {op} {val}')

    if not order_by and sort_dir and sort_col:
        order_by = f'ORDER BY "{sort_col}" {sort_dir}'
    elif not order_by and limit_num > 0 and ("前" in q or "top" in q.lower()):
        rank_col = _find_rank_column(q, mentioned_cols or columns)
        if rank_col:
            order_by = f'ORDER BY "{rank_col}" DESC'
        elif mentioned_cols:
            order_by = f'ORDER BY "{mentioned_cols[0]}" DESC'
        elif columns:
            order_by = f'ORDER BY "{columns[0]}" DESC'

    if limit_num > 0:
        limit_clause = f"LIMIT {limit_num}"

    select_part = ", ".join(select_cols) if select_cols else "*"
    if where_clauses:
        joined = f" {connector} ".join(where_clauses)
        where_part = f" WHERE {joined}"
    else:
        where_part = ""
    sql = f"SELECT {select_part} FROM \"{table_name}\"{where_part}"
    if order_by:
        sql += " " + order_by
    if limit_clause:
        sql += " " + limit_clause
    sql = sql.replace("  ", " ").strip()

    context.last_where = " AND ".join(where_clauses) if where_clauses else ""
    context.last_order = order_by
    context.last_limit = limit_clause
    context.last_sql = sql

    return sql, context


def format_answer(question: str, sql: str, rows: list[dict], columns: list[str]) -> str:
    if not rows:
        return "查询结果为空，没有找到匹配的数据。"
    if len(rows) == 1:
        row = rows[0]
        parts = []
        for k, v in row.items():
            parts.append(f"{k} = {v}")
        return "查询结果：" + "，".join(parts)
    else:
        return f"查询结果共 {len(rows)} 行，前几条为：\n" + "\n".join(
            "、".join(f"{k}={v}" for k, v in row.items()) for row in rows[:5]
        )


def find_row_ids(rows: list[dict], df) -> list[int]:
    if not rows:
        return []
    ids = []
    for row in rows:
        for idx, df_row in df.iterrows():
            match = True
            for k, v in row.items():
                if k in df.columns:
                    try:
                        if str(df_row[k]) != str(v):
                            match = False
                            break
                    except Exception:
                        match = False
                        break
            if match:
                ids.append(idx)
                break
    return ids
