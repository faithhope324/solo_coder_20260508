from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
from models import SurveyStats
from database import calculate_survey_stats, get_survey, get_responses
import io
import csv

router = APIRouter()


@router.get("/{survey_id}", response_model=SurveyStats, summary="获取问卷统计数据")
async def get_survey_analytics(survey_id: str):
    survey = get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    stats = calculate_survey_stats(survey_id)
    return stats


@router.get("/{survey_id}/export/csv", summary="导出答卷数据为 CSV")
async def export_survey_csv(survey_id: str):
    survey = get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    all_responses = get_responses(survey_id)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = ["答卷ID", "提交时间", "受访者ID"]
    for question in survey.questions:
        headers.append(f"{question.text} ({question.id})")
    writer.writerow(headers)
    
    for resp in all_responses:
        row = [
            resp.id,
            resp.submitted_at.strftime("%Y-%m-%d %H:%M:%S"),
            resp.respondent_id or ""
        ]
        for question in survey.questions:
            answers = resp.answers.get(question.id, [])
            row.append("; ".join(answers))
        writer.writerow(row)
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue().encode('utf-8-sig')]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=survey_{survey_id}_results.csv"
        }
    )


@router.get("/{survey_id}/question/{question_id}/stats", summary="获取单个题目的统计数据")
async def get_question_stats(survey_id: str, question_id: str):
    survey = get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在")
    
    question = next((q for q in survey.questions if q.id == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    stats = calculate_survey_stats(survey_id)
    question_stat = next((q for q in stats.question_stats if q.question_id == question_id), None)
    
    return question_stat
