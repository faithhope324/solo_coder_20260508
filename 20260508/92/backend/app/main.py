from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .conversation import manager as conv_manager
from .db import cache, execute_query, get_preview, store_table
from .sql_engine import QueryContext, find_row_ids, format_answer, generate_sql

app = FastAPI(title="表格问答系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    table_id: str
    question: str
    conv_id: str = ""


class AskResponse(BaseModel):
    answer: str
    sql: str
    row_ids: list[int]
    conv_id: str
    rows: list[dict]


@app.post("/api/upload")
async def upload_table(file: UploadFile = File(...)):
    content = await file.read()
    try:
        result = store_table(content, file.filename)
        conv_id = conv_manager.create(result["table_id"])
        return {**result, "conv_id": conv_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {e}")


@app.get("/api/tables/{table_id}")
async def get_table_info(table_id: str):
    entry = cache.get(table_id)
    if not entry:
        raise HTTPException(status_code=404, detail="表格不存在")
    return {
        "table_id": table_id,
        "columns": entry["columns"],
        "dtypes": entry["dtypes"],
        "row_count": entry["row_count"],
    }


@app.get("/api/tables/{table_id}/preview")
async def preview_table(table_id: str, offset: int = 0, limit: int = 100):
    entry = cache.get(table_id)
    if not entry:
        raise HTTPException(status_code=404, detail="表格不存在")
    return {"data": get_preview(table_id, offset, limit), "total": entry["row_count"]}


@app.post("/api/ask", response_model=AskResponse)
async def ask_question(req: AskRequest):
    entry = cache.get(req.table_id)
    if not entry:
        raise HTTPException(status_code=404, detail="表格不存在")
    table_name = entry["table_name"]
    columns = entry["columns"]
    df = cache.get_dataframe(req.table_id)

    conv = conv_manager.get(req.conv_id) if req.conv_id else None
    if not conv:
        conv_id = conv_manager.create(req.table_id)
        conv = conv_manager.get(conv_id)
    else:
        conv_id = conv.conv_id

    context = conv.query_context
    context.columns = columns

    try:
        sql, context = generate_sql(req.question, table_name, columns, context, df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQL生成失败: {e}")

    try:
        rows = execute_query(req.table_id, sql)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQL执行失败: {e}")

    answer = format_answer(req.question, sql, rows, columns)
    row_ids = find_row_ids(rows, df) if df is not None else []

    if rows:
        first_row = rows[0]
        result_filters = {}
        if columns:
            key_col = columns[0]
            if key_col in first_row:
                val = first_row[key_col]
                try:
                    float_val = float(val)
                    result_filters[key_col] = str(float_val)
                except (ValueError, TypeError):
                    result_filters[key_col] = f"'{val}'"
        context.last_result_filters = result_filters
    else:
        context.last_result_filters = {}

    conv.add_user(req.question)
    conv.add_assistant(answer, sql)
    conv.query_context = context

    return AskResponse(
        answer=answer,
        sql=sql,
        row_ids=row_ids,
        conv_id=conv_id,
        rows=rows,
    )


@app.get("/api/conversations/{table_id}")
async def list_conversations(table_id: str):
    return {"conversations": conv_manager.list_by_table(table_id)}


@app.delete("/api/tables/{table_id}")
async def delete_table(table_id: str):
    cache.remove(table_id)
    for c in list(conv_manager._convs.values()):
        if c.table_id == table_id:
            conv_manager.remove(c.conv_id)
    return {"ok": True}
