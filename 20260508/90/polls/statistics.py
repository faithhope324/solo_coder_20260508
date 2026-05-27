from collections import defaultdict
from .models import Poll, Option, VoteRecord


def get_poll_statistics(poll):
    stats = {
        'total_votes': poll.total_votes(),
        'questions': [],
        'by_location': defaultdict(lambda: {'count': 0, 'options': defaultdict(int)}),
        'by_age_group': defaultdict(lambda: {'count': 0, 'options': defaultdict(int)}),
    }
    
    for question in poll.questions.all():
        question_stats = {
            'id': question.id,
            'text': question.text,
            'type': question.question_type,
            'total_votes': question.total_votes(),
            'options': []
        }
        
        for option in question.options.all():
            option_stats = {
                'id': option.id,
                'text': option.text,
                'count': option.vote_count(),
                'percentage': option.percentage()
            }
            question_stats['options'].append(option_stats)
        
        stats['questions'].append(question_stats)
    
    records = VoteRecord.objects.filter(question__poll=poll)
    
    for record in records:
        session_id = record.session_id
        
        if record.location:
            stats['by_location'][record.location]['count'] = records.filter(
                session_id=session_id
            ).values('session_id').distinct().count()
            stats['by_location'][record.location]['options'][record.selected_option.text] += 1
        
        if record.age_group:
            age_display = record.get_age_group_display()
            stats['by_age_group'][age_display]['count'] = records.filter(
                session_id=session_id
            ).values('session_id').distinct().count()
            stats['by_age_group'][age_display]['options'][record.selected_option.text] += 1
    
    stats['by_location'] = dict(stats['by_location'])
    stats['by_age_group'] = dict(stats['by_age_group'])
    
    for loc, data in stats['by_location'].items():
        data['count'] = VoteRecord.objects.filter(
            question__poll=poll, location=loc
        ).values('session_id').distinct().count()
    
    for age, data in stats['by_age_group'].items():
        data['count'] = VoteRecord.objects.filter(
            question__poll=poll, age_group=dict(VoteRecord.AGE_GROUP_CHOICES).get(age)
        ).values('session_id').distinct().count()
    
    return stats
