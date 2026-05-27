from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from routers import surveys, responses, websocket, analytics

app = FastAPI(title="在线调查问卷系统")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

app.include_router(surveys.router, prefix="/api/surveys", tags=["问卷管理"])
app.include_router(responses.router, prefix="/api/responses", tags=["答卷管理"])
app.include_router(websocket.router, prefix="/api/ws", tags=["WebSocket"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["数据分析"])


@app.get("/")
async def root():
    return {"message": "在线调查问卷系统 API", "docs": "/docs"}


@app.get("/create-survey")
async def create_survey_page(request: Request):
    return templates.TemplateResponse("create_survey.html", {"request": request})


@app.get("/survey/{survey_id}")
async def survey_page(request: Request, survey_id: str):
    return templates.TemplateResponse("take_survey.html", {"request": request, "survey_id": survey_id})


@app.get("/survey/{survey_id}/results")
async def results_page(request: Request, survey_id: str):
    return templates.TemplateResponse("results.html", {"request": request, "survey_id": survey_id})


@app.get("/my-surveys/{creator_id}")
async def my_surveys_page(request: Request, creator_id: str):
    return templates.TemplateResponse("my_surveys.html", {"request": request, "creator_id": creator_id})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
