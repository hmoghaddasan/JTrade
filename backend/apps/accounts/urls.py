# backend/apps/accounts/urls.py

from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # ============================================
    # مسیرهای احراز هویت (Authentication)
    # ============================================

    # ثبت‌نام مرحله ۱ - ارسال کد تایید
    path('send-code/', views.SendVerificationCodeView.as_view(), name='send_code'),

    # تایید کد ارسال شده
    path('verify-code/', views.VerifyCodeView.as_view(), name='verify_code'),

    # تکمیل ثبت‌نام کاربر جدید
    path('register/', views.RegisterUserView.as_view(), name='register'),

    # ورود با شماره تلفن و رمز عبور
    path('login/', views.LoginView.as_view(), name='login'),

    # خروج از حساب کاربری
    path('logout/', views.LogoutView.as_view(), name='logout'),

    # Refresh Token
    path('token/refresh/', views.TokenRefreshView.as_view(), name='token_refresh'),

    # ============================================
    # مسیرهای پروفایل کاربر (Profile)
    # ============================================

    # دریافت و ویرایش پروفایل (GET, PUT, PATCH)
    path('profile/', views.ProfileView.as_view(), name='profile'),

    # تغییر رمز عبور
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),

    # ============================================
    # مسیرهای فراموشی رمز عبور (Forgot Password)
    # ============================================

    # درخواست بازیابی رمز عبور
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),

    # بازنشانی رمز عبور با کد
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),

    # ============================================
    # مسیرهای اشتراک (Subscription)
    # ============================================

    # دریافت وضعیت اشتراک
    path('subscription-status/', views.SubscriptionStatusView.as_view(), name='subscription_status'),

    # بررسی اشتراک برای انجام ترید
    path('subscription-check/', views.SubscriptionCheckView.as_view(), name='subscription_check'),

    # ============================================
    # مسیرهای سیستم (System) - مسیرهای اضافی
    # ============================================

    # دریافت پیام‌های سیستم
    path('system/messages/', views.SystemMessagesView.as_view(), name='system_messages'),

    # دریافت نسخه فعلی نرم‌افزار
    path('system/version/', views.CurrentAppVersionView.as_view(), name='current_version'),

    # دریافت تاریخچه نسخه‌ها
    path('system/versions/', views.AppVersionsView.as_view(), name='app_versions'),

    # دریافت تنظیمات سیستم (فقط ادمین)
    path('system/settings/', views.SystemSettingsView.as_view(), name='system_settings'),
]