import sqlite3
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

import pandas as pd

DB_DIR = Path(__file__).resolve().parent / "databases"
DB_DIR.mkdir(exist_ok=True)


class TableCache:
    def __init__(self):
        self._tables: dict[str, dict[str, Any]] = {}

    def put(self, table_id: str, df: pd.DataFrame, table_name: str, db_path: Path):
        self._tables[table_id] = {
            "df": df,
            "table_name": table_name,
            "db_path": db_path,
            "columns": list(df.columns),
            "dtypes": {col: str(df[col].dtype) for col in df.columns},
            "row_count": len(df),
        }

    def get(self, table_id: str) -> Optional[dict[str, Any]]:
        return self._tables.get(table_id)

    def get_dataframe(self, table_id: str) -> Optional[pd.DataFrame]:
        entry = self._tables.get(table_id)
        return entry["df"] if entry else None

    def columns(self, table_id: str) -> list[str]:
        entry = self._tables.get(table_id)
        return entry["columns"] if entry else []

    def table_name(self, table_id: str) -> str:
        entry = self._tables.get(table_id)
        return entry["table_name"] if entry else ""

    def remove(self, table_id: str):
        entry = self._tables.pop(table_id, None)
        if entry and entry["db_path"].exists():
            entry["db_path"].unlink(missing_ok=True)


cache = TableCache()


def create_database(table_id: str, df: pd.DataFrame, table_name: str) -> Path:
    db_path = DB_DIR / f"{table_id}.db"
    conn = sqlite3.connect(str(db_path))
    df.to_sql(table_name, conn, if_exists="replace", index=False)
    conn.close()
    return db_path


def load_csv_or_excel(file_bytes: bytes, filename: str) -> tuple[str, str, pd.DataFrame]:
    suffix = Path(filename).suffix.lower()
    bio = BytesIO(file_bytes)
    if suffix in (".xlsx", ".xls"):
        df = pd.read_excel(bio)
    elif suffix == ".csv":
        for enc in ["utf-8-sig", "utf-8", "gbk", "gb2312", "gb18030", "latin1"]:
            try:
                bio.seek(0)
                df = pd.read_csv(bio, encoding=enc)
                if len(df.columns) > 1:
                    break
            except Exception:
                continue
        else:
            bio.seek(0)
            df = pd.read_csv(bio)
    else:
        raise ValueError(f"不支持的文件格式: {suffix}")
    df = df.dropna(axis=1, how="all")
    df.columns = [str(c).strip() for c in df.columns]
    table_id = str(uuid.uuid4())[:8]
    table_name = Path(filename).stem
    table_name = "".join(c if c.isalnum() or c == "_" else "_" for c in table_name)
    table_name = table_name or "t"
    return table_id, table_name, df


def store_table(file_bytes: bytes, filename: str) -> dict[str, Any]:
    table_id, table_name, df = load_csv_or_excel(file_bytes, filename)
    db_path = create_database(table_id, df, table_id)
    cache.put(table_id, df, table_id, db_path)
    return {
        "table_id": table_id,
        "table_name": table_name,
        "columns": list(df.columns),
        "dtypes": {col: str(df[col].dtype) for col in df.columns},
        "row_count": len(df),
        "preview": df.head(100).to_dict(orient="records"),
    }


def get_preview(table_id: str, offset: int = 0, limit: int = 100) -> list[dict]:
    df = cache.get_dataframe(table_id)
    if df is None:
        return []
    return df.iloc[offset : offset + limit].to_dict(orient="records")


def execute_query(table_id: str, sql: str) -> list[dict]:
    entry = cache.get(table_id)
    if not entry:
        return []
    conn = sqlite3.connect(str(entry["db_path"]))
    conn.row_factory = sqlite3.Row
    cur = conn.execute(sql)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows
