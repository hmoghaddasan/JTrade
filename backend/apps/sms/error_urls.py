# backend/apps/sms/error_urls.py
"""
URLهای مدیریت خطاهای پیامک
مسیر پایه: /api/admin/sms/errors/
"""

from django.urls import path
from . import error_views as views

app_name = 'sms_errors'

urlpatterns = [
    # لیست خطاها
    path('', views.AdminErrorLogListView.as_view(), name='error_list'),

    # آمار خطاها
    path('stats/', views.AdminErrorStatsView.as_view(), name='error_stats'),

    # جزئیات خطا
    path('<int:pk>/', views.AdminErrorLogDetailView.as_view(), name='error_detail'),

    # برطرف کردن خطا
    path('<int:pk>/resolve/', views.AdminErrorResolveView.as_view(), name='error_resolve'),
]