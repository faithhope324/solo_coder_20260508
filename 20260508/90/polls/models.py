import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.conf import settings


class Poll(models.Model):
    POLL_TYPE_CHOICES = [
        ('single', '单题投票'),
        ('multiple', '多题调查'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name='投票标题')
    description = models.TextField(blank=True, verbose_name='投票描述')
    poll_type = models.CharField(max_length=20, choices=POLL_TYPE_CHOICES, default='single', verbose_name='投票类型')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='polls', verbose_name='创建者')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    deadline = models.DateTimeField(null=True, blank=True, verbose_name='截止时间')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    require_login = models.BooleanField(default=False, verbose_name='需要登录')
    collect_location = models.BooleanField(default=False, verbose_name='收集地区信息')
    collect_age = models.BooleanField(default=False, verbose_name='收集年龄段')
    qr_code = models.ImageField(upload_to='qrcodes/', null=True, blank=True, verbose_name='二维码')

    class Meta:
        ordering = ['-created_at']
        verbose_name = '投票'
        verbose_name_plural = '投票'

    def __str__(self):
        return self.title

    def is_expired(self):
        if self.deadline:
            return timezone.now() > self.deadline
        return False

    def can_vote(self, user=None, ip=None):
        if not self.is_active:
            return False, '投票已关闭'
        if self.is_expired():
            return False, '投票已截止'
        if self.require_login and (user is None or not user.is_authenticated):
            return False, '需要登录才能投票'
        return True, '可以投票'

    def total_votes(self):
        return VoteRecord.objects.filter(question__poll=self).values('session_id').distinct().count()


class Question(models.Model):
    QUESTION_TYPE_CHOICES = [
        ('single_choice', '单选题'),
        ('multiple_choice', '多选题'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='questions', verbose_name='所属投票')
    text = models.CharField(max_length=500, verbose_name='问题内容')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default='single_choice', verbose_name='问题类型')
    order = models.IntegerField(default=0, verbose_name='排序')

    class Meta:
        ordering = ['order']
        verbose_name = '问题'
        verbose_name_plural = '问题'

    def __str__(self):
        return self.text

    def total_votes(self):
        return VoteRecord.objects.filter(question=self).count()


class Option(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options', verbose_name='所属问题')
    text = models.CharField(max_length=200, verbose_name='选项内容')
    order = models.IntegerField(default=0, verbose_name='排序')

    class Meta:
        ordering = ['order']
        verbose_name = '选项'
        verbose_name_plural = '选项'

    def __str__(self):
        return self.text

    def vote_count(self):
        return VoteRecord.objects.filter(selected_option=self).count()

    def percentage(self):
        total = self.question.total_votes()
        if total == 0:
            return 0
        return round((self.vote_count() / total) * 100, 1)


class VoteRecord(models.Model):
    AGE_GROUP_CHOICES = [
        ('under_18', '18岁以下'),
        ('18_25', '18-25岁'),
        ('26_35', '26-35岁'),
        ('36_45', '36-45岁'),
        ('46_55', '46-55岁'),
        ('over_55', '55岁以上'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='vote_records', verbose_name='问题')
    selected_option = models.ForeignKey(Option, on_delete=models.CASCADE, related_name='vote_records', verbose_name='选中选项')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='用户')
    session_id = models.CharField(max_length=100, verbose_name='会话ID')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP地址')
    location = models.CharField(max_length=100, null=True, blank=True, verbose_name='地区')
    age_group = models.CharField(max_length=20, choices=AGE_GROUP_CHOICES, null=True, blank=True, verbose_name='年龄段')
    voted_at = models.DateTimeField(auto_now_add=True, verbose_name='投票时间')

    class Meta:
        ordering = ['-voted_at']
        verbose_name = '投票记录'
        verbose_name_plural = '投票记录'

    def __str__(self):
        return f'{self.question.poll.title} - {self.selected_option.text}'


class IPLimit(models.Model):
    ip_address = models.GenericIPAddressField(verbose_name='IP地址')
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='ip_limits', verbose_name='投票')
    vote_count = models.IntegerField(default=0, verbose_name='投票次数')
    last_vote_at = models.DateTimeField(auto_now=True, verbose_name='最后投票时间')
    window_start = models.DateTimeField(auto_now_add=True, verbose_name='时间窗口开始')

    class Meta:
        unique_together = ['ip_address', 'poll']
        verbose_name = 'IP限制'
        verbose_name_plural = 'IP限制'

    def is_within_window(self):
        window_seconds = getattr(settings, 'ANTI_CHEAT_TIME_WINDOW', 86400)
        return (timezone.now() - self.window_start).total_seconds() < window_seconds

    def can_vote(self):
        limit = getattr(settings, 'ANTI_CHEAT_IP_LIMIT', 1)
        if self.is_within_window():
            return self.vote_count < limit
        self.vote_count = 0
        self.window_start = timezone.now()
        self.save()
        return True
