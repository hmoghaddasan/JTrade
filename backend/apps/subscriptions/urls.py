# backend/apps/subscriptions/urls.py

from django.urls import path
from django.http import JsonResponse
from . import views


# ============================================
# مسیر تست برای بررسی اتصال
# ============================================
def test_view(request):
    return JsonResponse({'message': 'Test endpoint is working!', 'status': 'ok'})


app_name = 'subscriptions'

urlpatterns = [
    # مسیر تست
    path('test/', test_view, name='test'),

    # پلن‌ها
    path('plans/', views.SubscriptionPlanListView.as_view(), name='plan_list'),
    path('plans/<int:pk>/', views.SubscriptionPlanDetailView.as_view(), name='plan_detail'),

    # اشتراک کاربر
    path('current/', views.CurrentSubscriptionView.as_view(), name='current_subscription'),
    path('history/', views.SubscriptionHistoryView.as_view(), name='subscription_history'),

    # خرید و تمدید
    path('purchase/', views.PurchaseSubscriptionView.as_view(), name='purchase'),
    path('verify-payment/', views.VerifyPaymentView.as_view(), name='verify_payment'),
    path('extend/', views.ExtendSubscriptionView.as_view(), name='extend_subscription'),

    # کد تخفیف
    path('discount/validate/', views.ValidateDiscountView.as_view(), name='validate_discount'),

    # وضعیت
    path('status/', views.SubscriptionStatusView.as_view(), name='subscription_status'),
]