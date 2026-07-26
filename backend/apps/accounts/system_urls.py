# backend/apps/accounts/system_urls.py

from django.urls import path
from . import views

app_name = 'system'

urlpatterns = [
    path('messages/', views.SystemMessagesView.as_view(), name='system_messages'),
    path('version/', views.CurrentAppVersionView.as_view(), name='current_version'),
    path('versions/', views.AppVersionsView.as_view(), name='versions_history'),
    path('settings/', views.SystemSettingsView.as_view(), name='system_settings'),
]