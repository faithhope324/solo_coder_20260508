import uuid
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.http import JsonResponse
from .models import Poll, Question, Option, VoteRecord
from .forms import PollForm, QuestionForm, OptionForm, VoteForm
from .statistics import get_poll_statistics
from .qr_generator import generate_qr_code
from .middleware import AntiCheatMiddleware


def index(request):
    polls = Poll.objects.filter(is_active=True).order_by('-created_at')[:10]
    return render(request, 'polls/index.html', {'polls': polls})


@login_required
def create_poll(request):
    if request.method == 'POST':
        form = PollForm(request.POST)
        if form.is_valid():
            poll = form.save(commit=False)
            poll.creator = request.user
            poll.save()
            return redirect('add_questions', poll_id=poll.id)
    else:
        form = PollForm()
    return render(request, 'polls/create_poll.html', {'form': form})


@login_required
def add_questions(request, poll_id):
    poll = get_object_or_404(Poll, id=poll_id, creator=request.user)
    
    if request.method == 'POST':
        question_text = request.POST.get('question_text')
        question_type = request.POST.get('question_type', 'single_choice')
        options = request.POST.getlist('options[]')
        
        if question_text and options:
            question = Question.objects.create(
                poll=poll,
                text=question_text,
                question_type=question_type,
                order=poll.questions.count()
            )
            
            for i, opt_text in enumerate(options):
                if opt_text.strip():
                    Option.objects.create(
                        question=question,
                        text=opt_text.strip(),
                        order=i
                    )
            
            messages.success(request, '问题添加成功！')
            return redirect('add_questions', poll_id=poll.id)
    
    return render(request, 'polls/add_questions.html', {'poll': poll})


@login_required
def generate_qr(request, poll_id):
    poll = get_object_or_404(Poll, id=poll_id, creator=request.user)
    qr_url = generate_qr_code(poll, request)
    return JsonResponse({'qr_url': qr_url})


def poll_detail(request, poll_id):
    poll = get_object_or_404(Poll, id=poll_id)
    can_vote, message = poll.can_vote(request.user)
    
    if request.method == 'POST':
        if not can_vote:
            messages.error(request, message)
            return redirect('poll_detail', poll_id=poll.id)
        
        check_result, ip_limit = AntiCheatMiddleware.check_ip_limit(poll, request)
        if not check_result:
            messages.error(request, ip_limit)
            return redirect('poll_detail', poll_id=poll.id)
        
        session_check = AntiCheatMiddleware.check_session_limit(poll, request)
        if session_check is not True:
            messages.error(request, session_check)
            return redirect('poll_detail', poll_id=poll.id)
        
        user_check = AntiCheatMiddleware.check_user_limit(poll, request)
        if user_check is not True:
            messages.error(request, user_check)
            return redirect('poll_detail', poll_id=poll.id)
        
        form = VoteForm(request.POST, poll=poll)
        if form.is_valid():
            session_id = request.session.get('session_id', str(uuid.uuid4()))
            ip_address = AntiCheatMiddleware.get_client_ip(request)
            location = form.cleaned_data.get('location')
            age_group = form.cleaned_data.get('age_group')
            
            for question in poll.questions.all():
                field_name = f'question_{question.id}'
                if field_name in form.cleaned_data:
                    selected = form.cleaned_data[field_name]
                    if isinstance(selected, list):
                        for opt_id in selected:
                            option = get_object_or_404(Option, id=opt_id, question=question)
                            VoteRecord.objects.create(
                                question=question,
                                selected_option=option,
                                user=request.user if request.user.is_authenticated else None,
                                session_id=session_id,
                                ip_address=ip_address,
                                location=location,
                                age_group=age_group
                            )
                    else:
                        option = get_object_or_404(Option, id=selected, question=question)
                        VoteRecord.objects.create(
                            question=question,
                            selected_option=option,
                            user=request.user if request.user.is_authenticated else None,
                            session_id=session_id,
                            ip_address=ip_address,
                            location=location,
                            age_group=age_group
                        )
            
            AntiCheatMiddleware.record_vote(poll, request, ip_limit)
            messages.success(request, '投票成功！')
            return redirect('poll_results', poll_id=poll.id)
    else:
        form = VoteForm(poll=poll)
    
    return render(request, 'polls/poll_detail.html', {
        'poll': poll,
        'form': form,
        'can_vote': can_vote,
        'vote_message': message
    })


def poll_results(request, poll_id):
    poll = get_object_or_404(Poll, id=poll_id)
    stats = get_poll_statistics(poll)
    
    return render(request, 'polls/poll_results.html', {
        'poll': poll,
        'stats': stats
    })


def poll_results_api(request, poll_id):
    poll = get_object_or_404(Poll, id=poll_id)
    stats = get_poll_statistics(poll)
    return JsonResponse(stats)


@login_required
def my_polls(request):
    polls = Poll.objects.filter(creator=request.user).order_by('-created_at')
    return render(request, 'polls/my_polls.html', {'polls': polls})


@login_required
def toggle_poll(request, poll_id):
    poll = get_object_or_404(Poll, id=poll_id, creator=request.user)
    poll.is_active = not poll.is_active
    poll.save()
    return redirect('my_polls')


@login_required
def delete_poll(request, poll_id):
    poll = get_object_or_404(Poll, id=poll_id, creator=request.user)
    poll.delete()
    messages.success(request, '投票已删除')
    return redirect('my_polls')
