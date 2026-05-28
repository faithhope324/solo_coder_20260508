from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum


class ShapeType(str, Enum):
    RECTANGLE = "rectangle"
    CIRCLE = "circle"


class Shape(BaseModel):
    type: ShapeType
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    radius: Optional[float] = None
    center_x: Optional[float] = None
    center_y: Optional[float] = None


class BoundaryConditionType(str, Enum):
    FIXED = "fixed"
    FORCE = "force"
    PRESSURE = "pressure"


class BoundaryCondition(BaseModel):
    type: BoundaryConditionType
    location: str
    value: float
    direction: Optional[str] = "x"


class MaterialProperties(BaseModel):
    young_modulus: float = 210e9
    poisson_ratio: float = 0.3
    density: float = 7850.0


class SimulationRequest(BaseModel):
    shapes: List[Shape]
    boundary_conditions: List[BoundaryCondition]
    material: MaterialProperties
    mesh_size: float = 0.1


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskResponse(BaseModel):
    task_id: str
    status: TaskStatus


class SimulationResult(BaseModel):
    task_id: str
    status: TaskStatus
    nodes: Optional[List[List[float]]] = None
    elements: Optional[List[List[int]]] = None
    stress: Optional[List[float]] = None
    displacement: Optional[List[List[float]]] = None
    error: Optional[str] = None
