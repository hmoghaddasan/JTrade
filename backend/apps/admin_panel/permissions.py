# backend/apps/admin_panel/permissions.py

from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    فقط کاربران ادمین اجازه دسترسی دارند
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin

    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and request.user.is_admin