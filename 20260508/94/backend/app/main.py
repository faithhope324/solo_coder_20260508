from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from celery import Celery
from .models import (
    SimulationRequest, TaskResponse, SimulationResult, TaskStatus
)
import uuid
import json

app = FastAPI(title="FEM Simulation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

celery = Celery(
    "fem_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
)

results_store = {}


@celery.task(bind=True, name="run_fem_simulation")
def run_fem_simulation(self, request_data):
    try:
        from .solver import FEMSolver
        self.update_state(state='PROCESSING', meta={'progress': 0.1})
        solver = FEMSolver()
        result = solver.solve(request_data)
        self.update_state(state='PROCESSING', meta={'progress': 0.9})
        return {
            'status': 'completed',
            'result': result
        }
    except Exception as e:
        return {
            'status': 'failed',
            'error': str(e)
        }


@app.post("/api/simulate", response_model=TaskResponse)
async def start_simulation(request: SimulationRequest):
    task_id = str(uuid.uuid4())
    task = run_fem_simulation.delay(request.dict())
    results_store[task_id] = task.id
    return TaskResponse(task_id=task_id, status=TaskStatus.PENDING)


@app.get("/api/status/{task_id}", response_model=SimulationResult)
async def get_simulation_status(task_id: str):
    if task_id not in results_store:
        raise HTTPException(status_code=404, detail="Task not found")
    
    celery_task_id = results_store[task_id]
    task = run_fem_simulation.AsyncResult(celery_task_id)
    
    if task.state == 'PENDING':
        return SimulationResult(task_id=task_id, status=TaskStatus.PENDING)
    elif task.state == 'PROCESSING':
        return SimulationResult(task_id=task_id, status=TaskStatus.PROCESSING)
    elif task.state == 'SUCCESS':
        result_data = task.result
        if result_data['status'] == 'completed':
            r = result_data['result']
            return SimulationResult(
                task_id=task_id,
                status=TaskStatus.COMPLETED,
                nodes=r['nodes'],
                elements=r['elements'],
                stress=r['stress'],
                displacement=r['displacement']
            )
        else:
            return SimulationResult(
                task_id=task_id,
                status=TaskStatus.FAILED,
                error=result_data.get('error', 'Unknown error')
            )
    elif task.state == 'FAILURE':
        return SimulationResult(
            task_id=task_id,
            status=TaskStatus.FAILED,
            error=str(task.info)
        )
    else:
        return SimulationResult(task_id=task_id, status=TaskStatus.PENDING)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
