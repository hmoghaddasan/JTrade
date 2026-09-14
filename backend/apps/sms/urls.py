# backend/apps/sms/urls.py
"""
URLهای عمومی سیستم پیامک
"""

from django.urls import path
from . import views

app_name = 'sms'

urlpatterns = [
    path('my-messages/', views.MySmsListView.as_view(), name='my_messages'),
    path('my-messages/<int:pk>/', views.MySmsDetailView.as_view(), name='my_message_detail'),
    path('health/', views.SmsHealthView.as_view(), name='health'),
]