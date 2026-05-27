import os
import django
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'poll_platform.settings')
django.setup()

from django.contrib.auth.models import User
from polls.models import Poll, Question, Option


def create_sample_data():
    print("正在创建示例数据...")
    
    user, created = User.objects.get_or_create(
        username='admin',
        defaults={'email': 'admin@example.com', 'is_staff': True, 'is_superuser': True}
    )
    if created:
        user.set_password('admin123456')
        user.save()
        print("创建超级用户: admin / admin123456")
    else:
        print("超级用户已存在")
    
    Poll.objects.filter(creator=user).delete()
    
    poll1 = Poll.objects.create(
        title='您最喜欢的编程语言是？',
        description='请选择您日常开发中最常用的编程语言',
        poll_type='single',
        creator=user,
        deadline=timezone.now() + timedelta(days=30),
        collect_location=True,
        collect_age=True
    )
    q1 = Question.objects.create(
        poll=poll1,
        text='您最喜欢的编程语言是？',
        question_type='single_choice',
        order=0
    )
    languages = ['Python', 'Java', 'JavaScript', 'Go', 'Rust', 'C++', '其他']
    for i, lang in enumerate(languages):
        Option.objects.create(question=q1, text=lang, order=i)
    print(f"创建投票: {poll1.title}")
    
    poll2 = Poll.objects.create(
        title='员工满意度调查',
        description='请根据您的真实感受填写以下问卷，您的反馈对我们非常重要',
        poll_type='multiple',
        creator=user,
        deadline=timezone.now() + timedelta(days=15),
        require_login=False,
        collect_location=True,
        collect_age=True
    )
    
    q2_1 = Question.objects.create(
        poll=poll2,
        text='您对当前工作环境满意吗？',
        question_type='single_choice',
        order=0
    )
    for i, opt in enumerate(['非常满意', '满意', '一般', '不满意', '非常不满意']):
        Option.objects.create(question=q2_1, text=opt, order=i)
    
    q2_2 = Question.objects.create(
        poll=poll2,
        text='您认为公司哪些方面需要改进？（可多选）',
        question_type='multiple_choice',
        order=1
    )
    for i, opt in enumerate(['薪资福利', '工作氛围', '晋升机会', '培训发展', '工作环境', '其他']):
        Option.objects.create(question=q2_2, text=opt, order=i)
    
    q2_3 = Question.objects.create(
        poll=poll2,
        text='您是否愿意推荐朋友来本公司工作？',
        question_type='single_choice',
        order=2
    )
    for i, opt in enumerate(['非常愿意', '愿意', '不确定', '不愿意', '非常不愿意']):
        Option.objects.create(question=q2_3, text=opt, order=i)
    
    print(f"创建投票: {poll2.title}")
    print("\n示例数据创建完成！")
    print("请访问 http://127.0.0.1:8000/ 查看效果")
    print("后台管理: http://127.0.0.1:8000/admin/ (admin / admin123456)")


if __name__ == '__main__':
    create_sample_data()
