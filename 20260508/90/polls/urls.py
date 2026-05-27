from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('create/', views.create_poll, name='create_poll'),
    path('poll/<uuid:poll_id>/', views.poll_detail, name='poll_detail'),
    path('poll/<uuid:poll_id>/results/', views.poll_results, name='poll_results'),
    path('poll/<uuid:poll_id>/api/', views.poll_results_api, name='poll_results_api'),
    path('poll/<uuid:poll_id>/qr/', views.generate_qr, name='generate_qr'),
    path('poll/<uuid:poll_id>/add-questions/', views.add_questions, name='add_questions'),
    path('my-polls/', views.my_polls, name='my_polls'),
    path('poll/<uuid:poll_id>/toggle/', views.toggle_poll, name='toggle_poll'),
    path('poll/<uuid:poll_id>/delete/', views.delete_poll, name='delete_poll'),
    path('login/', auth_views.LoginView.as_view(template_name='polls/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
]
