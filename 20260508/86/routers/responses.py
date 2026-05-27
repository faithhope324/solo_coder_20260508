from fastapi import APIRouter, HTTPException
from typing import List
from models import SurveyResponse, SurveyResponseCreate
from database import save_response, get_survey, get_responses

router = APIRouter()


@router.post("/", response_model=SurveyResponse, summary="提交答卷")
async def submit_response(response_data: SurveyResponseCreate):
    survey = get_survey(response_data.survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    if not survey.is_active:
        raise HTTPException(status_code=400, detail="问卷已关闭")
    
    answers_dict = {}
    for answer in response_data.answers:
        question = next((q for q in survey.questions if q.id == answer.question_id), None)
        if not question:
            raise HTTPException(status_code=400, detail=f"题目不存在: {answer.question_id}")
        
        if question.required and len(answer.selected_options) == 0:
            raise HTTPException(status_code=400, detail=f"必答题未作答: {question.text}")
        
        if question.type == "single_choice" and len(answer.selected_options) > 1:
            raise HTTPException(status_code=400, detail="单选题只能选择一个选项")
        
        for option in answer.selected_options:
            if option not in question.options:
                raise HTTPException(status_code=400, detail=f"无效选项: {option}")
        
        answers_dict[answer.question_id] = answer.selected_options
    
    response = SurveyResponse(
        survey_id=response_data.survey_id,
        respondent_id=response_data.respondent_id,
        answers=answers_dict
    )
    
    saved_response = save_response(response)
    
    from routers.websocket import broadcast_stats
    await broadcast_stats(response_data.survey_id)
    
    return saved_response


@router.get("/survey/{survey_id}", response_model=List[SurveyResponse], summary="获取问卷的所有答卷")
async def get_survey_responses(survey_id: str):
    survey = get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    return get_responses(survey_id)


@router.get("/survey/{survey_id}/count", summary="获取问卷答卷数量")
async def get_response_count(survey_id: str):
    survey = get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    return {"survey_id": survey_id, "response_count": len(get_responses(survey_id))}
