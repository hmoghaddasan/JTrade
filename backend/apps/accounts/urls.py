# urls.py

from django.urls import path
from . import views

app_name = 'accounts'
urlpatterns = [
    # Authentication - جدید
    path('send-verification/', views.SendVerificationCodeView.as_view(), name='send_verification'),
    path('verify-code/', views.VerifyCodeView.as_view(), name='verify_code'),
    path('register/', views.RegisterUserView.as_view(), name='register'),
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('verify/', views.VerifyCodeView.as_view(), name='verify'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.TokenRefreshView.as_view(), name='token_refresh'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('profile/update/', views.ProfileUpdateView.as_view(), name='profile_update'),

    # Subscription Status
    path('subscription/status/', views.SubscriptionStatusView.as_view(), name='subscription_status'),
    path('subscription/check/', views.SubscriptionCheckView.as_view(), name='subscription_check'),

    # System
    path('system/messages/', views.SystemMessagesView.as_view(), name='system_messages'),
    path('system/version/', views.CurrentAppVersionView.as_view(), name='current_version'),
    path('system/versions/', views.AppVersionsView.as_view(), name='versions_history'),
]