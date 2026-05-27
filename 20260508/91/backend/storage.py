"""
电路存储模块
提供保存和加载电路 JSON 文件的功能
"""
import json
import os
import uuid
from pathlib import Path


STORAGE_DIR = Path(__file__).parent / "circuits"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def save_circuit(circuit_data: dict, circuit_id: str = None) -> str:
    if circuit_id is None:
        circuit_id = str(uuid.uuid4())

    filepath = STORAGE_DIR / f"{circuit_id}.json"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(circuit_data, f, indent=2, ensure_ascii=False)

    return circuit_id


def load_circuit(circuit_id: str) -> dict | None:
    filepath = STORAGE_DIR / f"{circuit_id}.json"
    if not filepath.exists():
        return None

    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def list_circuits() -> list:
    circuits = []
    for filepath in sorted(STORAGE_DIR.glob("*.json")):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        circuits.append({
            "id": filepath.stem,
            "name": data.get("name", "未命名电路"),
            "num_qubits": data.get("num_qubits", 2),
            "gate_count": len(data.get("gates", [])),
        })
    return circuits


def delete_circuit(circuit_id: str) -> bool:
    filepath = STORAGE_DIR / f"{circuit_id}.json"
    if filepath.exists():
        filepath.unlink()
        return True
    return False