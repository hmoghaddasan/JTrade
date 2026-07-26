# backend/apps/accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import (
    User,
    SystemSetting,
    SystemMessage,
    AppVersion,
    UserLoginLog,
    UserActivityLog
)


# ============================================
# ادمین کاربران - اصلاح شده برای مدل سفارشی
# ============================================
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = [
        'phone_number',
        'first_name',
        'last_name',
        'is_verified',
        'is_active',
        'is_admin',
        'created_at'
    ]
    list_filter = ['is_active', 'is_admin', 'is_verified']
    search_fields = ['phone_number', 'first_name', 'last_name', 'email']
    ordering = ['-created_at']

    # ✅ حذف filter_horizontal چون این فیلدها در مدل User وجود ندارند
    filter_horizontal = []

    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        ('اطلاعات شخصی', {'fields': ('first_name', 'last_name', 'email')}),
        ('دسترسی‌ها', {'fields': ('is_active', 'is_admin', 'is_verified')}),
        ('کد تایید', {'fields': ('verification_code', 'verification_expiry')}),
        ('توکن ورود', {'fields': ('login_token', 'login_token_expiry')}),
        ('تاریخ‌ها', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )

    readonly_fields = ['created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'نام کامل'


# ============================================
# ادمین تنظیمات سیستم
# ============================================
@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = [
        'setting_key',
        'setting_value_preview',
        'setting_type',
        'is_editable',
        'created_at'
    ]
    list_filter = ['setting_type', 'is_editable']
    search_fields = ['setting_key', 'description']
    ordering = ['setting_key']

    def setting_value_preview(self, obj):
        return obj.setting_value[:50] + '...' if len(obj.setting_value or '') > 50 else obj.setting_value
    setting_value_preview.short_description = 'مقدار'

    fieldsets = (
        (None, {'fields': ('setting_key', 'setting_value', 'setting_type')}),
        ('توضیحات', {'fields': ('description', 'is_editable')}),
        ('تاریخ‌ها', {'fields': ('created_at', 'updated_at')}),
    )

    readonly_fields = ['created_at', 'updated_at']


# ============================================
# ادمین پیام‌های سیستم
# ============================================
@admin.register(SystemMessage)
class SystemMessageAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'message_key',
        'is_active',
        'start_date',
        'end_date',
        'created_at'
    ]
    list_filter = ['is_active']
    search_fields = ['title', 'message', 'message_key']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('message_key', 'title', 'message')}),
        ('وضعیت', {'fields': ('is_active', 'start_date', 'end_date')}),
        ('تاریخ‌ها', {'fields': ('created_at', 'updated_at')}),
    )

    readonly_fields = ['created_at', 'updated_at']


# ============================================
# ادمین نسخه‌های نرم‌افزار
# ============================================
@admin.register(AppVersion)
class AppVersionAdmin(admin.ModelAdmin):
    list_display = [
        'version_number',
        'release_date',
        'is_current',
        'release_notes_preview',
        'created_at'
    ]
    list_filter = ['is_current']
    search_fields = ['version_number', 'release_notes']
    ordering = ['-release_date']

    def release_notes_preview(self, obj):
        return obj.release_notes[:50] + '...' if len(obj.release_notes) > 50 else obj.release_notes
    release_notes_preview.short_description = 'تغییرات'

    fieldsets = (
        (None, {'fields': ('version_number', 'release_date', 'release_notes', 'is_current')}),
        ('تاریخ‌ها', {'fields': ('created_at', 'updated_at')}),
    )

    readonly_fields = ['created_at', 'updated_at']


# ============================================
# ادمین لاگ ورود کاربران
# ============================================
@admin.register(UserLoginLog)
class UserLoginLogAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'login_time',
        'logout_time',
        'session_duration_formatted',
        'ip_address',
        'is_successful'
    ]
    list_filter = ['is_successful']
    search_fields = ['user__phone_number', 'ip_address']
    ordering = ['-login_time']
    raw_id_fields = ['user']

    def session_duration_formatted(self, obj):
        if obj.session_duration > 0:
            minutes = obj.session_duration // 60
            seconds = obj.session_duration % 60
            return f"{minutes} دقیقه {seconds} ثانیه"
        return '-'
    session_duration_formatted.short_description = 'مدت جلسه'

    fieldsets = (
        (None, {'fields': ('user', 'login_time', 'logout_time', 'session_duration')}),
        ('اطلاعات', {'fields': ('ip_address', 'user_agent', 'is_successful', 'error_message')}),
    )

    readonly_fields = ['login_time', 'logout_time', 'session_duration']


# ============================================
# ادمین لاگ فعالیت‌های کاربران
# ============================================
@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'action_type',
        'action_type_label',
        'description_preview',
        'created_at',
        'ip_address'
    ]
    list_filter = ['action_type']
    search_fields = ['user__phone_number', 'description']
    ordering = ['-created_at']
    raw_id_fields = ['user']

    def action_type_label(self, obj):
        labels = dict(obj.ACTION_TYPES)
        return labels.get(obj.action_type, obj.action_type)
    action_type_label.short_description = 'نوع اقدام'

    def description_preview(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_preview.short_description = 'توضیحات'

    fieldsets = (
        (None, {'fields': ('user', 'action_type', 'description')}),
        ('اطلاعات', {'fields': ('ip_address', 'user_agent', 'created_at')}),
    )

    readonly_fields = ['created_at']


# ============================================
# تنظیمات نمایش در پنل ادمین
# ============================================
admin.site.site_header = 'پنل مدیریت ژورنال حرفه‌ای ترید'
admin.site.site_title = 'مدیریت ژورنال ترید'
admin.site.index_title = 'داشبورد مدیریت'