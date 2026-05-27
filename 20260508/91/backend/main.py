"""
量子电路模拟器 FastAPI 主应用
提供电路运行、任务轮询、保存/加载等 REST API
"""
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from quantum_simulator import run_circuit, get_bloch_coordinates, get_all_qubit_bloch_coords
from storage import save_circuit, load_circuit, list_circuits, delete_circuit
from task_manager import task_manager


app = FastAPI(title="量子电路模拟器 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Gate(BaseModel):
    type: str
    targets: list[int] = []
    controls: list[int] = []


class CircuitData(BaseModel):
    name: str = "未命名电路"
    num_qubits: int = 2
    num_clbits: int | None = None
    gates: list[Gate] = []


class RunCircuitRequest(BaseModel):
    circuit: CircuitData
    shots: int = 1024


class SaveCircuitRequest(BaseModel):
    circuit: CircuitData
    circuit_id: str | None = None


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/api/circuits/run")
async def run_circuit_endpoint(request: RunCircuitRequest):
    circuit_dict = request.circuit.model_dump()
    if circuit_dict.get("num_clbits") is None:
        circuit_dict["num_clbits"] = circuit_dict["num_qubits"]

    task_id = task_manager.create_task(
        run_circuit, circuit_dict, shots=request.shots
    )
    return {"task_id": task_id, "status": "pending"}


@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "task_id": task.id,
        "status": task.status,
        "result": task.result,
        "error": task.error,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
    }


@app.post("/api/circuits/save")
async def save_circuit_endpoint(request: SaveCircuitRequest):
    circuit_dict = request.circuit.model_dump()
    if circuit_dict.get("num_clbits") is None:
        circuit_dict["num_clbits"] = circuit_dict["num_qubits"]

    circuit_id = save_circuit(circuit_dict, request.circuit_id)
    return {"circuit_id": circuit_id, "status": "saved"}


@app.get("/api/circuits/{circuit_id}")
async def load_circuit_endpoint(circuit_id: str):
    circuit = load_circuit(circuit_id)
    if circuit is None:
        raise HTTPException(status_code=404, detail="电路不存在")
    return circuit


@app.get("/api/circuits")
async def list_circuits_endpoint():
    return {"circuits": list_circuits()}


@app.delete("/api/circuits/{circuit_id}")
async def delete_circuit_endpoint(circuit_id: str):
    success = delete_circuit(circuit_id)
    if not success:
        raise HTTPException(status_code=404, detail="电路不存在")
    return {"status": "deleted"}


@app.post("/api/bloch")
async def get_bloch_endpoint(request: dict):
    statevector = request.get("statevector")
    if statevector is None:
        raise HTTPException(status_code=400, detail="缺少 statevector 参数")
    coords = get_bloch_coordinates(statevector)
    return {"bloch": coords}


@app.post("/api/bloch/all")
async def get_all_bloch_endpoint(request: dict):
    statevector = request.get("statevector")
    num_qubits = request.get("num_qubits")
    if statevector is None or num_qubits is None:
        raise HTTPException(status_code=400, detail="缺少 statevector 或 num_qubits 参数")
    coords_list = get_all_qubit_bloch_coords(statevector, num_qubits)
    return {"bloch_list": coords_list}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)