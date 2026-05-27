from django.contrib import admin
from .models import Poll, Question, Option, VoteRecord, IPLimit


class OptionInline(admin.TabularInline):
    model = Option
    extra = 3


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1


class QuestionAdmin(admin.ModelAdmin):
    inlines = [OptionInline]
    list_display = ['text', 'poll', 'question_type']
    list_filter = ['poll', 'question_type']
    search_fields = ['text']


class PollAdmin(admin.ModelAdmin):
    inlines = [QuestionInline]
    list_display = ['title', 'creator', 'poll_type', 'created_at', 'deadline', 'is_active', 'total_votes']
    list_filter = ['poll_type', 'is_active', 'created_at', 'deadline']
    search_fields = ['title', 'description']
    readonly_fields = ['qr_code']


class VoteRecordAdmin(admin.ModelAdmin):
    list_display = ['question', 'selected_option', 'user', 'ip_address', 'location', 'age_group', 'voted_at']
    list_filter = ['question__poll', 'voted_at', 'location', 'age_group']
    search_fields = ['ip_address', 'session_id']


class IPLimitAdmin(admin.ModelAdmin):
    list_display = ['ip_address', 'poll', 'vote_count', 'last_vote_at', 'window_start']
    list_filter = ['poll', 'last_vote_at']
    search_fields = ['ip_address']


admin.site.register(Poll, PollAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Option)
admin.site.register(VoteRecord, VoteRecordAdmin)
admin.site.register(IPLimit, IPLimitAdmin)
