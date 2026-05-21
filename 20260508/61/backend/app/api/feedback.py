from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.schemas import FeedbackRequest, FeedbackResponse
from app.db.database import get_db
from app.db.models import UserFeedback, GenerationTask

router = APIRouter()


@router.post("/", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest, db: Session = Depends(get_db)):
    try:
        task = db.query(GenerationTask).filter(
            GenerationTask.task_id == request.taskId
        ).first()

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if request.rating not in ['like', 'dislike']:
            raise HTTPException(status_code=400, detail="Invalid rating. Must be 'like' or 'dislike'")

        feedback = UserFeedback(
            task_id=request.taskId,
            rating=request.rating,
            comment=request.comment
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)

        return FeedbackResponse(
            success=True,
            message=f"Feedback '{request.rating}' recorded successfully",
            feedbackId=feedback.id
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}")
async def get_task_feedback(task_id: str, db: Session = Depends(get_db)):
    feedbacks = db.query(UserFeedback).filter(
        UserFeedback.task_id == task_id
    ).all()

    return {
        "task_id": task_id,
        "feedback_count": len(feedbacks),
        "likes": sum(1 for f in feedbacks if f.rating == 'like'),
        "dislikes": sum(1 for f in feedbacks if f.rating == 'dislike'),
        "feedbacks": [
            {
                "id": f.id,
                "rating": f.rating,
                "comment": f.comment,
                "created_at": f.created_at
            }
            for f in feedbacks
        ]
    }


@router.get("/stats")
async def get_feedback_stats(db: Session = Depends(get_db)):
    total_tasks = db.query(GenerationTask).count()
    total_feedback = db.query(UserFeedback).count()
    likes = db.query(UserFeedback).filter(UserFeedback.rating == 'like').count()
    dislikes = db.query(UserFeedback).filter(UserFeedback.rating == 'dislike').count()

    style_stats = db.query(
        GenerationTask.style,
        db.func.count(GenerationTask.task_id).label('count')
    ).group_by(GenerationTask.style).all()

    return {
        "total_tasks": total_tasks,
        "total_feedback": total_feedback,
        "likes": likes,
        "dislikes": dislikes,
        "style_distribution": {s: c for s, c in style_stats}
    }
