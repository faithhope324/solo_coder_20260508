import uuid
from typing import Dict, Any, List


class FeedbackService:
    def __init__(self):
        self.feedback_store: Dict[str, List[Dict[str, Any]]] = {}

    async def submit(
        self,
        generation_id: str,
        rating: int,
        comment: str = ""
    ) -> Dict[str, Any]:
        feedback_id = str(uuid.uuid4())
        feedback_data = {
            "feedback_id": feedback_id,
            "generation_id": generation_id,
            "rating": rating,
            "comment": comment
        }

        if generation_id not in self.feedback_store:
            self.feedback_store[generation_id] = []
        self.feedback_store[generation_id].append(feedback_data)

        return {
            "feedback_id": feedback_id,
            "success": True
        }

    async def get_by_generation(self, generation_id: str) -> List[Dict[str, Any]]:
        return self.feedback_store.get(generation_id, [])
