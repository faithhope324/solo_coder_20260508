from django import forms
from .models import Poll, Question, Option, VoteRecord


class PollForm(forms.ModelForm):
    deadline = forms.DateTimeField(
        required=False,
        widget=forms.DateTimeInput(
            attrs={'type': 'datetime-local', 'class': 'form-control'}
        ),
        label='截止时间'
    )

    class Meta:
        model = Poll
        fields = ['title', 'description', 'poll_type', 'deadline', 'require_login', 'collect_location', 'collect_age']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'poll_type': forms.Select(attrs={'class': 'form-control'}),
            'require_login': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'collect_location': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'collect_age': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
        labels = {
            'title': '投票标题',
            'description': '投票描述',
            'poll_type': '投票类型',
            'require_login': '需要登录',
            'collect_location': '收集地区信息',
            'collect_age': '收集年龄段',
        }


class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ['text', 'question_type', 'order']
        widgets = {
            'text': forms.TextInput(attrs={'class': 'form-control'}),
            'question_type': forms.Select(attrs={'class': 'form-control'}),
            'order': forms.NumberInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'text': '问题内容',
            'question_type': '问题类型',
            'order': '排序',
        }


class OptionForm(forms.ModelForm):
    class Meta:
        model = Option
        fields = ['text', 'order']
        widgets = {
            'text': forms.TextInput(attrs={'class': 'form-control'}),
            'order': forms.NumberInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'text': '选项内容',
            'order': '排序',
        }


class VoteForm(forms.Form):
    def __init__(self, *args, poll=None, **kwargs):
        super().__init__(*args, **kwargs)
        if poll:
            self.poll = poll
            for question in poll.questions.all():
                if question.question_type == 'single_choice':
                    choices = [(opt.id, opt.text) for opt in question.options.all()]
                    self.fields[f'question_{question.id}'] = forms.ChoiceField(
                        choices=choices,
                        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
                        label=question.text,
                        required=True
                    )
                else:
                    choices = [(opt.id, opt.text) for opt in question.options.all()]
                    self.fields[f'question_{question.id}'] = forms.MultipleChoiceField(
                        choices=choices,
                        widget=forms.CheckboxSelectMultiple(attrs={'class': 'form-check-input'}),
                        label=question.text,
                        required=True
                    )
            
            if poll.collect_location:
                self.fields['location'] = forms.CharField(
                    max_length=100,
                    widget=forms.TextInput(attrs={'class': 'form-control'}),
                    label='所在地区',
                    required=True
                )
            
            if poll.collect_age:
                self.fields['age_group'] = forms.ChoiceField(
                    choices=VoteRecord.AGE_GROUP_CHOICES,
                    widget=forms.Select(attrs={'class': 'form-control'}),
                    label='年龄段',
                    required=True
                )
