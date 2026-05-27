from typing import Dict, List
from models import Survey, SurveyResponse, QuestionStats, SurveyStats


surveys: Dict[str, Survey] = {}
responses: Dict[str, List[SurveyResponse]] = {}
survey_creators: Dict[str, List[str]] = {}


def save_survey(survey: Survey) -> Survey:
    surveys[survey.id] = survey
    responses[survey.id] = []
    if survey.creator_id not in survey_creators:
        survey_creators[survey.creator_id] = []
    survey_creators[survey.creator_id].append(survey.id)
    return survey


def get_survey(survey_id: str) -> Survey:
    return surveys.get(survey_id)


def get_surveys_by_creator(creator_id: str) -> List[Survey]:
    survey_ids = survey_creators.get(creator_id, [])
    return [surveys[sid] for sid in survey_ids if sid in surveys]


def save_response(response: SurveyResponse) -> SurveyResponse:
    if response.survey_id not in responses:
        responses[response.survey_id] = []
    responses[response.survey_id].append(response)
    return response


def get_responses(survey_id: str) -> List[SurveyResponse]:
    return responses.get(survey_id, [])


def calculate_survey_stats(survey_id: str) -> SurveyStats:
    survey = get_survey(survey_id)
    if not survey:
        return None
    
    all_responses = get_responses(survey_id)
    total_responses = len(all_responses)
    
    question_stats_list = []
    for question in survey.questions:
        option_counts = {option: 0 for option in question.options}
        
        for resp in all_responses:
            if question.id in resp.answers:
                for selected in resp.answers[question.id]:
                    if selected in option_counts:
                        option_counts[selected] += 1
        
        option_percentages = {}
        for option, count in option_counts.items():
            if total_responses > 0:
                option_percentages[option] = round((count / total_responses) * 100, 2)
            else:
                option_percentages[option] = 0.0
        
        question_stats = QuestionStats(
            question_id=question.id,
            question_text=question.text,
            question_type=question.type,
            total_responses=total_responses,
            option_counts=option_counts,
            option_percentages=option_percentages
        )
        question_stats_list.append(question_stats)
    
    return SurveyStats(
        survey_id=survey_id,
        survey_title=survey.title,
        total_responses=total_responses,
        question_stats=question_stats_list
    )
