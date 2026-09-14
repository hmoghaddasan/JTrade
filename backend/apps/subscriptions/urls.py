# backend/apps/subscriptions/urls.py

from django.urls import path
from django.http import JsonResponse
from . import views
from . import admin_views


def test_view(request):
    return JsonResponse({'message': 'Test endpoint is working!', 'status': 'ok'})


app_name = 'subscriptions'

urlpatterns = [
    # ===== تست =====
    path('test/', test_view, name='test'),

    # ===== پلن‌ها =====
    path('plans/', views.SubscriptionPlanListView.as_view(), name='plan_list'),
    path('plans/<int:pk>/', views.SubscriptionPlanDetailView.as_view(), name='plan_detail'),

    # ===== اشتراک کاربر =====
    path('current/', views.CurrentSubscriptionView.as_view(), name='current_subscription'),
    path('history/', views.SubscriptionHistoryView.as_view(), name='subscription_history'),

    # ===== خرید و تمدید (درگاه) =====
    path('purchase/', views.PurchaseSubscriptionView.as_view(), name='purchase'),
    path('verify-payment/', views.VerifyPaymentView.as_view(), name='verify_payment'),
    path('extend/', views.ExtendSubscriptionView.as_view(), name='extend_subscription'),

    # ===== کد تخفیف =====
    path('discount/validate/', views.ValidateDiscountView.as_view(), name='validate_discount'),

    # ===== وضعیت =====
    path('status/', views.SubscriptionStatusView.as_view(), name='subscription_status'),

    # ============================================
    # ✅ سیستم پرداخت کارت به کارت - کاربر
    # ============================================
    path('payment-cards/', views.PaymentCardListView.as_view(), name='payment_card_list'),
    path('payment-requests/create/', views.CreatePaymentRequestView.as_view(), name='payment_request_create'),
    path('payment-requests/', views.UserPaymentRequestListView.as_view(), name='payment_request_list'),
    path('payment-requests/active/', views.ActivePaymentRequestsView.as_view(), name='payment_request_active'),
    path('payment-requests/<int:pk>/', views.PaymentRequestDetailView.as_view(), name='payment_request_detail'),
    path('payment-requests/<int:pk>/submit-receipt/', views.SubmitPaymentReceiptView.as_view(), name='payment_request_submit_receipt'),
    path('payment-requests/<int:pk>/cancel/', views.CancelPaymentRequestView.as_view(), name='payment_request_cancel'),

    # ============================================
    # ✅ سیستم پرداخت کارت به کارت - ادمین
    # ============================================
    # کارت‌ها
    path('admin/payment-cards/', admin_views.AdminPaymentCardListView.as_view(), name='admin_payment_card_list'),
    path('admin/payment-cards/<int:pk>/', admin_views.AdminPaymentCardDetailView.as_view(), name='admin_payment_card_detail'),
    path('admin/payment-cards/<int:pk>/set-default/', admin_views.AdminPaymentCardSetDefaultView.as_view(), name='admin_payment_card_set_default'),
    path('admin/payment-cards/<int:pk>/toggle/', admin_views.AdminPaymentCardToggleView.as_view(), name='admin_payment_card_toggle'),

    # درخواست‌ها
    path('admin/payment-requests/', admin_views.AdminPaymentRequestListView.as_view(), name='admin_payment_request_list'),
    path('admin/payment-requests/<int:pk>/', admin_views.AdminPaymentRequestDetailView.as_view(), name='admin_payment_request_detail'),
    path('admin/payment-requests/<int:pk>/approve/', admin_views.AdminPaymentRequestApproveView.as_view(), name='admin_payment_request_approve'),
    path('admin/payment-requests/<int:pk>/reject/', admin_views.AdminPaymentRequestRejectView.as_view(), name='admin_payment_request_reject'),
    path('admin/payment-requests/stats/', admin_views.AdminPaymentRequestStatsView.as_view(), name='admin_payment_request_stats'),
]