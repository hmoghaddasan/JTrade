# backend/apps/import/admin.py

from django.contrib import admin
from .models import ImportLog, ImportMapping


@admin.register(ImportLog)
class ImportLogAdmin(admin.ModelAdmin):
    """مدیریت لاگ‌های واردات در پنل ادمین"""
    list_display = [
        'id', 'user', 'source', 'file_name', 'status',
        'trades_imported', 'trades_skipped', 'started_at', 'completed_at'
    ]
    list_filter = [
        'status', 'source', 'started_at'
    ]
    search_fields = [
        'user__phone_number', 'file_name', 'errors'
    ]
    readonly_fields = [
        'user', 'source', 'file_name', 'file_size', 'status',
        'trades_imported', 'trades_skipped', 'errors', 'warnings',
        'started_at', 'completed_at'
    ]
    ordering = ['-started_at']

    def get_readonly_fields(self, request, obj=None):
        """همه فیلدها فقط خواندنی هستند"""
        return self.readonly_fields


@admin.register(ImportMapping)
class ImportMappingAdmin(admin.ModelAdmin):
    """مدیریت نگاشت‌های CSV در پنل ادمین"""
    list_display = [
        'id', 'user', 'broker_name', 'is_default', 'created_at'
    ]
    list_filter = [
        'is_default', 'created_at'
    ]
    search_fields = [
        'user__phone_number', 'broker_name'
    ]
    ordering = ['-is_default', 'broker_name']
    fields = [
        'user', 'broker_name', 'column_mapping', 'is_default',
        'created_at', 'updated_at'
    ]
    readonly_fields = [
        'created_at', 'updated_at'
    ]