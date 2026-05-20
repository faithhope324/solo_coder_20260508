from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Set
from collections import deque
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import SessionLocal, Table, TableColumn, ETLPipeline, LineageRelationship, DataQualityCheck

app = FastAPI(title="数据管道血缘关系系统")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "数据管道血缘关系系统 API"}


@app.get("/api/lineage/full")
def get_full_lineage(db: Session = Depends(get_db)):
    tables = db.query(Table).all()
    pipelines = db.query(ETLPipeline).all()
    relationships = db.query(LineageRelationship).all()

    nodes = []
    edges = []

    for table in tables:
        nodes.append({
            "id": f"table_{table.id}",
            "type": "table",
            "name": table.name,
            "label": table.name,
            "database": table.database,
            "description": table.description,
            "collapsed": False,
        })

    for pipeline in pipelines:
        nodes.append({
            "id": f"pipeline_{pipeline.id}",
            "type": "pipeline",
            "name": pipeline.name,
            "label": pipeline.name,
            "taskType": pipeline.task_type,
            "description": pipeline.description,
            "status": pipeline.status,
            "collapsed": False,
        })

    for rel in relationships:
        source_key = f"{rel.source_type}_{rel.source_id}"
        target_key = f"{rel.target_type}_{rel.target_id}"
        edges.append({
            "id": f"edge_{rel.id}",
            "source": source_key,
            "target": target_key,
            "type": rel.relationship_type,
        })

    return {"nodes": nodes, "edges": edges}


@app.get("/api/lineage/subgraph")
def get_subgraph(node_id: str, db: Session = Depends(get_db)):
    parts = node_id.split("_")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid node_id format")
    node_type = parts[0]
    actual_id = int(parts[1])

    nodes_map: Dict[str, Any] = {}
    edges_map: Dict[str, Any] = {}

    def add_node(nid, ntype):
        if nid in nodes_map:
            return
        if ntype == "table":
            table = db.query(Table).filter(Table.id == int(nid.split("_")[1])).first()
            if table:
                nodes_map[nid] = {
                    "id": nid,
                    "type": "table",
                    "name": table.name,
                    "label": table.name,
                    "database": table.database,
                    "description": table.description,
                }
        elif ntype == "pipeline":
            pipeline = db.query(ETLPipeline).filter(ETLPipeline.id == int(nid.split("_")[1])).first()
            if pipeline:
                nodes_map[nid] = {
                    "id": nid,
                    "type": "pipeline",
                    "name": pipeline.name,
                    "label": pipeline.name,
                    "taskType": pipeline.task_type,
                    "description": pipeline.description,
                }

    add_node(node_id, node_type)

    out_edges = db.query(LineageRelationship).filter(
        LineageRelationship.source_type == node_type,
        LineageRelationship.source_id == actual_id
    ).all()

    for edge in out_edges:
        target_id = f"{edge.target_type}_{edge.target_id}"
        add_node(target_id, edge.target_type)
        edge_id = f"edge_{edge.id}"
        edges_map[edge_id] = {
            "id": edge_id,
            "source": node_id,
            "target": target_id,
            "type": edge.relationship_type,
        }

    in_edges = db.query(LineageRelationship).filter(
        LineageRelationship.target_type == node_type,
        LineageRelationship.target_id == actual_id
    ).all()

    for edge in in_edges:
        source_id = f"{edge.source_type}_{edge.source_id}"
        add_node(source_id, edge.source_type)
        edge_id = f"edge_{edge.id}"
        edges_map[edge_id] = {
            "id": edge_id,
            "source": source_id,
            "target": node_id,
            "type": edge.relationship_type,
        }

    return {"nodes": list(nodes_map.values()), "edges": list(edges_map.values())}


@app.get("/api/impact/{node_id}")
def get_impact_analysis(node_id: str, db: Session = Depends(get_db)):
    parts = node_id.split("_")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid node_id format")
    node_type = parts[0]
    actual_id = int(parts[1])

    all_relationships = db.query(LineageRelationship).all()

    adjacency: Dict[str, List[str]] = {}
    for rel in all_relationships:
        source_key = f"{rel.source_type}_{rel.source_id}"
        target_key = f"{rel.target_type}_{rel.target_id}"
        if source_key not in adjacency:
            adjacency[source_key] = []
        adjacency[source_key].append(target_key)

    visited: Set[str] = set()
    queue = deque([node_id])
    visited.add(node_id)
    impacted_nodes = []

    while queue:
        current = queue.popleft()
        if current != node_id:
            impacted_nodes.append(current)
        if current in adjacency:
            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

    nodes_detail = []
    for nid in impacted_nodes:
        parts_n = nid.split("_")
        ntype = parts_n[0]
        nid_num = int(parts_n[1])
        if ntype == "table":
            table = db.query(Table).filter(Table.id == nid_num).first()
            if table:
                nodes_detail.append({
                    "id": nid,
                    "type": "table",
                    "name": table.name,
                    "description": table.description,
                })
        elif ntype == "pipeline":
            pipeline = db.query(ETLPipeline).filter(ETLPipeline.id == nid_num).first()
            if pipeline:
                nodes_detail.append({
                    "id": nid,
                    "type": "pipeline",
                    "name": pipeline.name,
                    "taskType": pipeline.task_type,
                    "description": pipeline.description,
                })

    return {
        "source_node": node_id,
        "impacted_count": len(impacted_nodes),
        "impacted_nodes": nodes_detail,
        "all_impacted_ids": impacted_nodes,
    }


@app.get("/api/search")
def search_nodes(keyword: str, db: Session = Depends(get_db)):
    keyword = keyword.lower()
    results = []

    tables = db.query(Table).filter(
        (Table.name.ilike(f"%{keyword}%")) |
        (Table.description.ilike(f"%{keyword}%"))
    ).all()

    for table in tables:
        results.append({
            "id": f"table_{table.id}",
            "type": "table",
            "name": table.name,
            "label": table.name,
            "description": table.description,
            "database": table.database,
        })

    pipelines = db.query(ETLPipeline).filter(
        (ETLPipeline.name.ilike(f"%{keyword}%")) |
        (ETLPipeline.description.ilike(f"%{keyword}%"))
    ).all()

    for pipeline in pipelines:
        results.append({
            "id": f"pipeline_{pipeline.id}",
            "type": "pipeline",
            "name": pipeline.name,
            "label": pipeline.name,
            "description": pipeline.description,
            "taskType": pipeline.task_type,
        })

    return {"results": results}


@app.get("/api/table/{table_id}")
def get_table_detail(table_id: int, db: Session = Depends(get_db)):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    columns = db.query(TableColumn).filter(TableColumn.table_id == table_id).all()
    quality_checks = db.query(DataQualityCheck).filter(DataQualityCheck.table_id == table_id).order_by(DataQualityCheck.checked_at.desc()).all()

    return {
        "id": table.id,
        "name": table.name,
        "database": table.database,
        "schema": table.schema,
        "description": table.description,
        "columns": [
            {
                "name": col.name,
                "data_type": col.data_type,
                "is_nullable": col.is_nullable,
                "description": col.description,
            } for col in columns
        ],
        "quality_checks": [
            {
                "check_type": qc.check_type,
                "check_name": qc.check_name,
                "result": qc.result,
                "score": qc.score,
                "details": qc.details,
                "checked_at": qc.checked_at.isoformat() if qc.checked_at else None,
            } for qc in quality_checks
        ],
    }


@app.get("/api/pipeline/{pipeline_id}")
def get_pipeline_detail(pipeline_id: int, db: Session = Depends(get_db)):
    pipeline = db.query(ETLPipeline).filter(ETLPipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    return {
        "id": pipeline.id,
        "name": pipeline.name,
        "task_type": pipeline.task_type,
        "description": pipeline.description,
        "status": pipeline.status,
        "last_run": pipeline.last_run.isoformat() if pipeline.last_run else None,
        "created_at": pipeline.created_at.isoformat() if pipeline.created_at else None,
    }


@app.get("/api/tables")
def list_tables(db: Session = Depends(get_db)):
    tables = db.query(Table).all()
    return [
        {
            "id": table.id,
            "name": table.name,
            "database": table.database,
            "description": table.description,
        } for table in tables
    ]


@app.get("/api/pipelines")
def list_pipelines(db: Session = Depends(get_db)):
    pipelines = db.query(ETLPipeline).all()
    return [
        {
            "id": pipeline.id,
            "name": pipeline.name,
            "task_type": pipeline.task_type,
            "description": pipeline.description,
            "status": pipeline.status,
        } for pipeline in pipelines
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
