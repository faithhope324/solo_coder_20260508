import uuid
from django.utils import timezone
from .models import IPLimit, VoteRecord


class AntiCheatMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.session.get('session_id'):
            request.session['session_id'] = str(uuid.uuid4())
        
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        return None

    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @staticmethod
    def check_ip_limit(poll, request):
        ip = AntiCheatMiddleware.get_client_ip(request)
        if not ip:
            return False, '无法获取IP地址'
        
        ip_limit, created = IPLimit.objects.get_or_create(
            ip_address=ip,
            poll=poll
        )
        
        if not ip_limit.can_vote():
            return False, '您的IP已经投过票了，每人每天只能投一票'
        
        return True, ip_limit

    @staticmethod
    def check_session_limit(poll, request):
        session_id = request.session.get('session_id')
        if not session_id:
            return True
        
        has_voted = VoteRecord.objects.filter(
            question__poll=poll,
            session_id=session_id
        ).exists()
        
        if has_voted:
            return False, '您已经投过票了，不能重复投票'
        
        return True

    @staticmethod
    def check_user_limit(poll, request):
        if not poll.require_login:
            return True
        
        if not request.user.is_authenticated:
            return False, '需要登录才能投票'
        
        has_voted = VoteRecord.objects.filter(
            question__poll=poll,
            user=request.user
        ).exists()
        
        if has_voted:
            return False, '您已经投过票了，不能重复投票'
        
        return True

    @staticmethod
    def record_vote(poll, request, ip_limit):
        if ip_limit:
            ip_limit.vote_count += 1
            ip_limit.last_vote_at = timezone.now()
            ip_limit.save()
