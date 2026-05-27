from fastapi import APIRouter, HTTPException
from typing import List
from models import Survey, SurveyCreate, Question, QuestionCreate
from database import save_survey, get_survey, get_surveys_by_creator

router = APIRouter()


@router.post("/", response_model=Survey, summary="创建问卷")
async def create_survey(survey_data: SurveyCreate):
    questions = [
        Question(
            text=q.text,
            type=q.type,
            options=q.options,
            required=q.required
        )
        for q in survey_data.questions
    ]
    
    survey = Survey(
        title=survey_data.title,
        description=survey_data.description,
        creator_id=survey_data.creator_id,
        questions=questions
    )
    
    save_survey(survey)
    return survey


@router.get("/{survey_id}", response_model=Survey, summary="获取问卷详情")
async def get_survey_detail(survey_id: str):
    survey = get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    return survey


@router.get("/creator/{creator_id}", response_model=List[Survey], summary="获取创建者的所有问卷")
async def get_creator_surveys(creator_id: str):
    return get_surveys_by_creator(creator_id)


@router.get("/{survey_id}/share-link", summary="生成问卷分享链接")
async def get_share_link(survey_id: str):
    survey = get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    return {
        "survey_id": survey_id,
        "share_url": f"/survey/{survey_id}",
        "full_url": f"http://localhost:8000/survey/{survey_id}"
    }


@router.put("/{survey_id}/toggle", response_model=Survey, summary="启用/禁用问卷")
async def toggle_survey(survey_id: str):
    survey = get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    survey.is_active = not survey.is_active
    return survey


@router.delete("/{survey_id}", summary="删除问卷")
async def delete_survey(survey_id: str):
    from database import surveys, responses
    if survey_id not in surveys:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    del surveys[survey_id]
    if survey_id in responses:
        del responses[survey_id]
    
    return {"message": "问卷已删除"}
