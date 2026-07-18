from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
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
    ResetPasswordSerializer
)
from .permissions import IsAdminUser, IsVerifiedUser

logger = logging.getLogger(__name__)

# apps/accounts/views.py

import random
from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer
from apps.subscriptions.models import SubscriptionPlan, UserSubscription
from apps.subscriptions.sms import send_verification_sms


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

        # ارسال پیامک
        try:
            send_verification_sms(phone_number, verification_code)
        except Exception as e:
            # در محیط تست، کد را در پاسخ برمی‌گردانیم
            if request.META.get('DEBUG', False):
                return Response({
                    'message': 'کد تایید ایجاد شد (حالت تست)',
                    'test_code': verification_code,
                    'phone_number': phone_number
                }, status=status.HTTP_200_OK)

        return Response({
            'message': 'کد تایید به شماره شما ارسال شد',
            'phone_number': phone_number
        }, status=status.HTTP_200_OK)


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

        # بررسی اینکه کاربر جدید است یا وجود دارد
        is_new_user = not user.first_name and not user.last_name

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'is_new_user': is_new_user,
            'message': 'شماره تلفن با موفقیت تایید شد'
        })


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

            # بررسی اینکه کاربر تایید شده باشد
            if not user.is_verified:
                return Response(
                    {'error': 'شماره تلفن تایید نشده است'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # به‌روزرسانی اطلاعات
            user.first_name = first_name
            user.last_name = last_name
            if email:
                user.email = email
            user.save()

            # ایجاد اشتراک آزمایشی
            trial_days = 7
            trial_plan = SubscriptionPlan.objects.filter(
                plan_type='professional',
                duration_days=trial_days,
                is_active=True
            ).first()

            if trial_plan:
                UserSubscription.objects.create(
                    user=user,
                    plan=trial_plan,
                    start_date=timezone.now(),
                    end_date=timezone.now() + timezone.timedelta(days=trial_days),
                    is_active=True,
                    trades_used=0,
                    trades_limit=trial_plan.monthly_trades_limit,
                    is_trial=True,
                    payment_status='paid',
                    amount_paid=0
                )

            # تولید توکن
            refresh = RefreshToken.for_user(user)

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'message': 'ثبت نام با موفقیت تکمیل شد'
            })

        except User.DoesNotExist:
            return Response(
                {'error': 'کاربر یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )


        
class RegisterView(APIView):
    """ثبت نام کاربر جدید"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']

            # بررسی وجود کاربر
            if User.objects.filter(phone_number=phone_number).exists():
                return Response(
                    {'error': 'این شماره تلفن قبلاً ثبت شده است'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # ایجاد کد تایید
            verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            expiry = timezone.now() + timezone.timedelta(minutes=5)

            # ذخیره موقت کاربر
            user = User.objects.create_user(
                phone_number=phone_number,
                password=serializer.validated_data.get('password'),
                first_name=serializer.validated_data.get('first_name', ''),
                last_name=serializer.validated_data.get('last_name', ''),
                email=serializer.validated_data.get('email', ''),
                verification_code=verification_code,
                verification_expiry=expiry
            )

            # ارسال پیامک
            sms_enabled = SystemSetting.get_setting('enable_sms', True)
            if sms_enabled:
                try:
                    from ..subscriptions.sms import send_verification_sms
                    send_verification_sms(phone_number, verification_code)
                except Exception as e:
                    logger.error(f"Error sending SMS: {str(e)}")
                    # در محیط تست، کد را در پاسخ برمی‌گردانیم
                    if SystemSetting.get_setting('debug_mode', False):
                        return Response({
                            'message': 'کد تایید ایجاد شد (حالت تست)',
                            'phone_number': phone_number,
                            'test_code': verification_code
                        }, status=status.HTTP_201_CREATED)
            else:
                logger.info(f"Verification code for {phone_number}: {verification_code}")
                # اگر پیامک غیرفعال است، کد را برمی‌گردانیم
                return Response({
                    'message': 'کد تایید ایجاد شد (ارسال پیامک غیرفعال)',
                    'phone_number': phone_number,
                    'test_code': verification_code
                }, status=status.HTTP_201_CREATED)

            return Response({
                'message': 'کد تایید به شماره شما ارسال شد',
                'phone_number': phone_number
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyCodeView(APIView):
    """تایید کد ارسال شده"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            code = serializer.validated_data['code']

            try:
                user = User.objects.get(
                    phone_number=phone_number,
                    verification_code=code,
                    verification_expiry__gt=timezone.now()
                )

                # تایید کاربر
                user.is_verified = True
                user.verification_code = None
                user.verification_expiry = None
                user.save()

                # ایجاد اشتراک آزمایشی
                from ..subscriptions.models import SubscriptionPlan, UserSubscription

                trial_days = SystemSetting.get_setting('trial_days', 7)
                trial_plan = SubscriptionPlan.objects.filter(
                    plan_type='professional',
                    duration_days=trial_days,
                    is_active=True
                ).first()

                if trial_plan:
                    # بررسی اینکه کاربر قبلاً اشتراک آزمایشی نداشته باشد
                    existing_trial = UserSubscription.objects.filter(
                        user=user,
                        is_trial=True,
                        is_active=True
                    ).exists()

                    if not existing_trial:
                        subscription = UserSubscription.objects.create(
                            user=user,
                            plan=trial_plan,
                            start_date=timezone.now(),
                            end_date=timezone.now() + timezone.timedelta(days=trial_days),
                            is_active=True,
                            trades_used=0,
                            trades_limit=trial_plan.monthly_trades_limit,
                            is_trial=True,
                            payment_status='paid',
                            amount_paid=0
                        )

                # تولید توکن
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)

                # ذخیره توکن برای مدیریت تک‌جلسه‌ای
                user.login_token = access_token
                user.login_token_expiry = timezone.now() + timezone.timedelta(hours=24)
                user.last_login = timezone.now()
                user.save()

                return Response({
                    'access': access_token,
                    'refresh': str(refresh),
                    'user': UserSerializer(user).data,
                    'message': 'ثبت نام با موفقیت انجام شد'
                })

            except User.DoesNotExist:
                return Response(
                    {'error': 'کد تایید نامعتبر یا منقضی شده است'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """ورود کاربر"""
    permission_classes = [permissions.AllowAny]

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

                # ایجاد توکن جدید و باطل کردن جلسات قبلی
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)

                # ذخیره توکن برای مدیریت تک‌جلسه‌ای
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


class LogoutView(APIView):
    """خروج کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            # پاک کردن توکن ورود
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


class TokenRefreshView(TokenRefreshView):
    """Refresh token"""
    pass


class ProfileView(APIView):
    """مشاهده پروفایل کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class ProfileUpdateView(APIView):
    """ویرایش پروفایل کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'پروفایل با موفقیت به‌روزرسانی شد',
                'user': UserProfileSerializer(request.user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """تغییر رمز عبور"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'user': request.user}
        )
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()

            # باطل کردن تمام توکن‌ها
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


class ForgotPasswordView(APIView):
    """فراموشی رمز عبور - ارسال کد"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']

            try:
                user = User.objects.get(phone_number=phone_number)

                # ایجاد کد جدید
                verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
                expiry = timezone.now() + timezone.timedelta(minutes=5)

                user.verification_code = verification_code
                user.verification_expiry = expiry
                user.save()

                # ارسال پیامک
                sms_enabled = SystemSetting.get_setting('enable_sms', True)
                if sms_enabled:
                    try:
                        from ..subscriptions.sms import send_verification_sms
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


class ResetPasswordView(APIView):
    """بازنشانی رمز عبور"""
    permission_classes = [permissions.AllowAny]

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


class SubscriptionStatusView(APIView):
    """دریافت وضعیت اشتراک کاربر"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscription = request.user.get_active_subscription()

        if subscription:
            return Response({
                'has_subscription': True,
                'plan_name': subscription.plan.plan_name,
                'plan_type': subscription.plan.plan_type,
                'start_date': subscription.start_date,
                'end_date': subscription.end_date,
                'remaining_days': subscription.get_remaining_days(),
                'remaining_trades': request.user.get_remaining_trades(),
                'trades_limit': subscription.trades_limit,
                'trades_used': subscription.trades_used,
                'is_trial': subscription.is_trial,
                'expired': False
            })
        else:
            # بررسی اشتراک منقضی شده
            expired = request.user.user_subscriptions.filter(
                is_active=True,
                end_date__lte=timezone.now()
            ).order_by('-end_date').first()

            return Response({
                'has_subscription': False,
                'expired': expired is not None,
                'message': 'اشتراک فعالی ندارید',
                'expired_date': expired.end_date if expired else None
            })


class SubscriptionCheckView(APIView):
    """بررسی وضعیت اشتراک برای مسیریابی"""
    permission_classes = [permissions.IsAuthenticated]

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


class SystemMessagesView(APIView):
    """دریافت پیام‌های فعال سیستم"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        messages = SystemMessage.get_active_messages()
        serializer = SystemMessageSerializer(messages, many=True)
        return Response(serializer.data)


class AppVersionsView(APIView):
    """دریافت تاریخچه نسخه‌های نرم‌افزار"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        versions = AppVersion.get_recent_versions(15)
        serializer = AppVersionSerializer(versions, many=True)
        return Response(serializer.data)


class CurrentAppVersionView(APIView):
    """دریافت نسخه فعلی نرم‌افزار"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        version = AppVersion.get_current_version()
        if version:
            serializer = AppVersionSerializer(version)
            return Response(serializer.data)
        return Response({
            'version': '1.0.0',
            'release_date': timezone.now(),
            'release_notes': 'نسخه اولیه',
            'is_current': True
        })


class SystemSettingsView(APIView):
    """دریافت و ویرایش تنظیمات سیستم (فقط برای ادمین)"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        settings = SystemSetting.objects.all()
        data = [{
            'key': s.setting_key,
            'value': s.setting_value,
            'type': s.setting_type,
            'description': s.description,
            'is_editable': s.is_editable
        } for s in settings]
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