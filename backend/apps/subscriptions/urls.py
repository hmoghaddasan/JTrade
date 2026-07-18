# urls.py
from django.urls import path
from . import views

app_name = 'subscriptions'

urlpatterns = [
    # پلن‌ها
    path('plans/', views.SubscriptionPlanListView.as_view(), name='plan_list'),
    path('plans/<int:pk>/', views.SubscriptionPlanDetailView.as_view(), name='plan_detail'),

    # اشتراک کاربر
    path('current/', views.CurrentSubscriptionView.as_view(), name='current_subscription'),
    path('history/', views.SubscriptionHistoryView.as_view(), name='subscription_history'),

    # خرید و تمدید
    path('purchase/', views.PurchaseSubscriptionView.as_view(), name='purchase'),
    path('verify-payment/', views.VerifyPaymentView.as_view(), name='verify_payment'),

    # کد تخفیف
    path('discount/validate/', views.ValidateDiscountView.as_view(), name='validate_discount'),

    # وضعیت
    path('status/', views.SubscriptionStatusView.as_view(), name='subscription_status'),
    path('extend/', views.ExtendSubscriptionView.as_view(), name='extend_subscription'),
]