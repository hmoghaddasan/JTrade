# permissions.py
from rest_framework import permissions
from django.utils import timezone


class IsAuthenticatedWithSubscription(permissions.BasePermission):
    """بررسی احراز هویت و اشتراک فعال"""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active:
            return False

        # ادمین‌ها نیاز به اشتراک ندارند
        if request.user.is_admin:
            return True

        # بررسی اشتراک فعال
        return request.user.has_active_subscription()


class IsAdminUser(permissions.BasePermission):
    """بررسی ادمین بودن کاربر"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsVerifiedUser(permissions.BasePermission):
    """بررسی تایید شدن کاربر"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_verified


class CanTrade(permissions.BasePermission):
    """بررسی امکان انجام ترید"""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active:
            return False

        if request.user.is_admin:
            return True

        return request.user.can_trade()