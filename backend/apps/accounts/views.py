# backend/apps/accounts/views.py

from django.conf import settings
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
import random
import logging

from .models import User, SystemMessage, AppVersion, SystemSetting
from .serializers import (
    UserSerializer,
    UserRegisterSerializer,
    UserLoginSerializer,
    VerifyCodeSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    SubscriptionStatusSerializer,
    SystemMessageSerializer,
    AppVersionSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    PhoneNumberSerializer,
)
from .permissions import IsAdminUser, IsVerifiedUser
from apps.subscriptions.models import SubscriptionPlan, UserSubscription
from apps.subscriptions.sms import send_verification_sms

logger = logging.getLogger(__name__)


# ============================================
# ارسال کد تایید (مرحله اول)
# ============================================
class SendVerificationCodeView(APIView):
    """ارسال کد تایید به شماره تلفن"""
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number = request.data.get('phone_number')

        if not phone_number:
            return Response(
                {'error': 'شماره تلفن الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # تولید کد ۶ رقمی
        verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        expiry = timezone.now() + timezone.timedelta(minutes=2)

        # ذخیره یا به‌روزرسانی کاربر
        user, created = User.objects.get_or_create(
            phone_number=phone_number,
            defaults={
                'verification_code': verification_code,
                'verification_expiry': expiry,
                'is_verified': False
            }
        )

        if not created:
            user.verification_code = verification_code
            user.verification_expiry = expiry
            user.is_verified = False
            user.save()

        # ارسال پیامک از طریق قاصدک
        sms_enabled = getattr(settings, 'SMS_ENABLED', False) and getattr(settings, 'SMS_API_KEY', '')
        sms_result = None

        if sms_enabled:
            try:
                sms_result = send_verification_sms(phone_number, verification_code)
                logger.info(f"SMS sent to {phone_number}: {sms_result}")

                if sms_result and sms_result.get('status') == 'success':
                    print("✅ پیامک با موفقیت ارسال شد")
                else:
                    print(f"⚠️ خطا در ارسال پیامک: {sms_result}")
            except Exception as e:
                logger.error(f"Error sending SMS: {str(e)}")
                print(f"❌ خطا در ارسال پیامک: {str(e)}")

        # نمایش کد در کنسول برای دیباگ
        print("=" * 60)
        print(f"📱 کد تایید برای شماره {phone_number}:")
        print(f"🔑 {verification_code}")
        print(f"⏱️ این کد تا ۲ دقیقه اعتبار دارد")
        print("=" * 60)

        # همیشه پیام موفقیت برگردان (حتی اگر پیامک ارسال نشد)
        return Response({
            'message': 'کد تایید به شماره شما ارسال شد',
            'phone_number': phone_number,
            'test_code': verification_code
        }, status=status.HTTP_200_OK)


# ============================================
# تایید کد (مرحله دوم)
# ============================================
class VerifyCodeView(APIView):
    """تایید کد ارسال شده"""
    permission_classes = [AllowAny]

    def post(self, request):
        phone_number = request.data.get('phone_number')
        code = request.data.get('code')

        if not phone_number or not code:
            return Response(
                {'error': 'شماره تلفن و کد تایید الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                phone_number=phone_number,
                verification_code=code,
                verification_expiry__gt=timezone.now()
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'کد تایید نامعتبر یا منقضی شده است'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # تایید کاربر
        user.is_verified = True
        user.verification_code = None
        user.verification_expiry = None
        user.last_login = timezone.now()
        user.save()

        # تولید توکن
        refresh = RefreshToken.for_user(user)

        is_new_user = not user.first_name and not user.last_name

        logger.info(f"User verified: {phone_number}")

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'phone_number': user.phone_number,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_verified': user.is_verified,
                'is_admin': user.is_admin,
            },
            'is_new_user': is_new_user,
            'message': 'شماره تلفن با موفقیت تایید شد'
        })


# ============================================
# تکمیل ثبت نام
# ============================================
class RegisterUserView(APIView):
    """تکمیل ثبت نام کاربر جدید"""
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        phone_number = request.data.get('phone_number')
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip()

        if not phone_number:
            return Response(
                {'error': 'شماره تلفن الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not first_name or not last_name:
            return Response(
                {'error': 'نام و نام خانوادگی الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(phone_number=phone_number)

            if not user.is_verified:
                return Response(
                    {'error': 'شماره تلفن تایید نشده است'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.first_name = first_name
            user.last_name = last_name
            if email:
                user.email = email
            user.save()

            # ============================================
            # ✅ ایجاد اشتراک آزمایشی
            # ============================================
            trial_days = SystemSetting.get_setting('trial_days', 7)
            try:
                trial_days = int(trial_days)
            except (ValueError, TypeError):
                trial_days = 7

            # ابتدا پلن حرفه‌ای با مدت زمان مشخص را بررسی کن
            trial_plan = SubscriptionPlan.objects.filter(
                plan_type='professional',
                duration_days=trial_days,
                is_active=True
            ).first()

            # اگر پلن حرفه‌ای با مدت مشخص وجود نداشت، از پلن پایه استفاده کن
            if not trial_plan:
                trial_plan = SubscriptionPlan.objects.filter(
                    plan_type='basic',
                    is_active=True
                ).first()

            # اگر هیچ پلنی وجود نداشت، اولین پلن فعال را بگیر
            if not trial_plan:
                trial_plan = SubscriptionPlan.objects.filter(is_active=True).first()

            if trial_plan:
                existing_trial = UserSubscription.objects.filter(
                    user=user,
                    is_trial=True,
                    is_active=True
                ).exists()

                if not existing_trial:
                    UserSubscription.objects.create(
                        user=user,
                        plan=trial_plan,
                        start_date=timezone.now(),
                        end_date=timezone.now() + timezone.timedelta(days=trial_days),
                        is_active=True,
                        trades_used=0,
                        trades_limit=trial_plan.monthly_trades_limit,
                        ai_consultations_limit=trial_plan.monthly_ai_consultations_limit,  # ✅ اضافه شد
                        is_trial=True,
                        payment_status='paid',
                        amount_paid=0
                    )
                    logger.info(f"✅ Trial subscription created for user {user.phone_number} in RegisterUserView")

            # تولید توکن
            refresh = RefreshToken.for_user(user)

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'phone_number': user.phone_number,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'is_verified': user.is_verified,
                    'is_admin': user.is_admin,
                },
                'message': 'ثبت نام با موفقیت تکمیل شد'
            })

        except User.DoesNotExist:
            return Response(
                {'error': 'کاربر یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# ورود کاربر
# ============================================
class LoginView(APIView):
    """ورود کاربر"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            password = serializer.validated_data['password']

            user = authenticate(phone_number=phone_number, password=password)

            if user:
                if not user.is_active:
                    return Response(
                        {'error': 'حساب کاربری شما غیرفعال است'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                if not user.is_verified:
                    return Response(
                        {'error': 'شماره تلفن شما تایید نشده است'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)

                user.login_token = access_token
                user.login_token_expiry = timezone.now() + timezone.timedelta(hours=24)
                user.last_login = timezone.now()
                user.save()

                return Response({
                    'access': access_token,
                    'refresh': str(refresh),
                    'user': UserSerializer(user).data
                })
            else:
                return Response(
                    {'error': 'شماره تلفن یا رمز عبور اشتباه است'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# خروج کاربر
# ============================================
class LogoutView(APIView):
    """خروج کاربر"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            if request.user.is_authenticated:
                request.user.login_token = None
                request.user.login_token_expiry = None
                request.user.save()

            return Response({'message': 'خروج با موفقیت انجام شد'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ============================================
# Refresh Token
# ============================================
class TokenRefreshView(TokenRefreshView):
    """Refresh token"""
    pass


# ============================================
# پروفایل کاربر – با PUT و PATCH
# ============================================
class ProfileView(APIView):
    """مشاهده و ویرایش پروفایل کاربر"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        """به‌روزرسانی کامل پروفایل"""
        return self._update_profile(request, partial=False)

    def patch(self, request):
        """به‌روزرسانی جزئی پروفایل"""
        return self._update_profile(request, partial=True)

    def _update_profile(self, request, partial=False):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=partial
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'پروفایل با موفقیت به‌روزرسانی شد',
                'user': UserProfileSerializer(request.user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# تغییر رمز عبور
# ============================================
class ChangePasswordView(APIView):
    """تغییر رمز عبور"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'user': request.user}
        )
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()

            try:
                refresh_token = request.data.get('refresh')
                if refresh_token:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
            except:
                pass

            return Response({
                'message': 'رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید.'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# فراموشی رمز عبور
# ============================================
class ForgotPasswordView(APIView):
    """فراموشی رمز عبور - ارسال کد"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']

            try:
                user = User.objects.get(phone_number=phone_number)

                verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
                expiry = timezone.now() + timezone.timedelta(minutes=5)

                user.verification_code = verification_code
                user.verification_expiry = expiry
                user.save()

                sms_enabled = SystemSetting.get_setting('enable_sms', True)
                if sms_enabled:
                    try:
                        send_verification_sms(phone_number, verification_code)
                    except Exception as e:
                        logger.error(f"Error sending SMS: {str(e)}")
                        if SystemSetting.get_setting('debug_mode', False):
                            return Response({
                                'message': 'کد بازیابی ایجاد شد (حالت تست)',
                                'test_code': verification_code
                            }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'message': 'کد بازیابی ایجاد شد (ارسال پیامک غیرفعال)',
                        'test_code': verification_code
                    }, status=status.HTTP_200_OK)

                return Response({
                    'message': 'کد بازیابی به شماره شما ارسال شد'
                })

            except User.DoesNotExist:
                return Response(
                    {'error': 'کاربری با این شماره تلفن یافت نشد'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# بازنشانی رمز عبور
# ============================================
class ResetPasswordView(APIView):
    """بازنشانی رمز عبور"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            code = serializer.validated_data['code']
            new_password = serializer.validated_data['new_password']

            try:
                user = User.objects.get(
                    phone_number=phone_number,
                    verification_code=code,
                    verification_expiry__gt=timezone.now()
                )

                user.set_password(new_password)
                user.verification_code = None
                user.verification_expiry = None
                user.login_token = None
                user.login_token_expiry = None
                user.save()

                return Response({
                    'message': 'رمز عبور با موفقیت بازنشانی شد. لطفاً وارد شوید.'
                })

            except User.DoesNotExist:
                return Response(
                    {'error': 'کد تایید نامعتبر یا منقضی شده است'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# وضعیت اشتراک
# ============================================
class SubscriptionStatusView(APIView):
    """دریافت وضعیت اشتراک کاربر"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # اگر کاربر ادمین است
        if user.is_admin:
            return Response({
                'has_subscription': True,
                'is_active': True,
                'is_expired': False,
                'is_near_expiry': False,
                'remaining_days': 36500,
                'remaining_trades': 99999,
                'remaining_ai_consultations': 99999,
                'plan_name': 'ادمین',
                'plan_type': 'admin',
                'start_date': timezone.now(),
                'end_date': timezone.now() + timezone.timedelta(days=36500),
                'trades_limit': 99999,
                'trades_used': 0,
                'ai_consultations_limit': 99999,
                'ai_consultations_used': 0,
                'is_trial': False,
                'payment_status': 'paid',
                'is_admin': True,
                'message': 'کاربر ادمین - دسترسی نامحدود'
            })

        subscription = UserSubscription.objects.filter(
            user=user,
            is_active=True
        ).first()

        if not subscription:
            return Response({
                'has_subscription': False,
                'is_active': False,
                'message': 'هیچ اشتراک فعالی یافت نشد'
            })

        remaining_days = subscription.get_remaining_days()
        remaining_trades = subscription.get_remaining_trades()
        remaining_ai = subscription.get_remaining_ai_consultations()

        is_expired = subscription.end_date < timezone.now()
        is_active = subscription.is_active and not is_expired

        warning_days = 3
        is_near_expiry = remaining_days <= warning_days and remaining_days > 0

        return Response({
            'has_subscription': True,
            'is_active': is_active,
            'is_expired': is_expired,
            'is_near_expiry': is_near_expiry,
            'remaining_days': remaining_days,
            'remaining_trades': remaining_trades,
            'remaining_ai_consultations': remaining_ai,
            'plan_name': subscription.plan.plan_name,
            'plan_type': subscription.plan.plan_type,
            'start_date': subscription.start_date,
            'end_date': subscription.end_date,
            'trades_limit': subscription.trades_limit,
            'trades_used': subscription.trades_used,
            'ai_consultations_limit': subscription.ai_consultations_limit,
            'ai_consultations_used': subscription.ai_consultations_used,
            'is_trial': subscription.is_trial,
            'payment_status': subscription.payment_status,
            'is_admin': False
        })


# ============================================
# بررسی اشتراک برای ترید
# ============================================
class SubscriptionCheckView(APIView):
    """بررسی وضعیت اشتراک برای مسیریابی"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        has_subscription = request.user.has_active_subscription()
        remaining_trades = request.user.get_remaining_trades()
        expiry = request.user.get_subscription_expiry()

        return Response({
            'has_subscription': has_subscription,
            'remaining_trades': remaining_trades,
            'can_trade': request.user.can_trade(),
            'expiry_date': expiry.isoformat() if expiry else None,
            'is_expired': expiry < timezone.now() if expiry else True
        })


# ============================================
# پیام‌های سیستم
# ============================================
class SystemMessagesView(APIView):
    """دریافت پیام‌های فعال سیستم"""
    permission_classes = [AllowAny]

    def get(self, request):
        messages = SystemMessage.get_active_messages()
        serializer = SystemMessageSerializer(messages, many=True)
        return Response(serializer.data)


# ============================================
# نسخه‌های نرم‌افزار
# ============================================
class AppVersionsView(APIView):
    """دریافت تاریخچه نسخه‌های نرم‌افزار"""
    permission_classes = [AllowAny]

    def get(self, request):
        versions = AppVersion.get_recent_versions(15)
        serializer = AppVersionSerializer(versions, many=True)
        return Response(serializer.data)


class CurrentAppVersionView(APIView):
    """دریافت نسخه فعلی نرم‌افزار"""
    permission_classes = [AllowAny]

    def get(self, request):
        version = AppVersion.get_current_version()
        if version:
            serializer = AppVersionSerializer(version)
            return Response(serializer.data)
        return Response({
            'version_number': '1.0.0',
            'release_date': timezone.now(),
            'release_notes': 'نسخه اولیه',
            'is_current': True
        })


# ============================================
# تنظیمات سیستم (فقط ادمین)
# ============================================
class SystemSettingsView(APIView):
    """دریافت و ویرایش تنظیمات سیستم (فقط برای ادمین)"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        settings_list = SystemSetting.objects.all()
        data = [{
            'key': s.setting_key,
            'value': s.setting_value,
            'type': s.setting_type,
            'description': s.description,
            'is_editable': s.is_editable
        } for s in settings_list]
        return Response(data)

    def put(self, request):
        data = request.data
        updated = []

        for key, value in data.items():
            try:
                setting = SystemSetting.objects.get(setting_key=key)
                if setting.is_editable:
                    setting.setting_value = str(value)
                    setting.save()
                    updated.append(key)
            except SystemSetting.DoesNotExist:
                pass

        return Response({
            'message': f'{len(updated)} تنظیم با موفقیت به‌روزرسانی شد',
            'updated': updated
        })