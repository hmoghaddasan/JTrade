import base64
import csv
import io
import json
from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthenticatedWithSubscription
from apps.trading.models import Trade, TradeGroup, Portfolio
from apps.trading.serializers import TradeCreateSerializer

from .models import ImportMapping, ImportLog
from .serializers import (
    ImportMappingSerializer,
    ImportLogSerializer,
    CSVPreviewSerializer,
    ImportRequestSerializer,
)
from .services.csv_parser import CSVParser
from .services.dedupe_engine import DedupeEngine


class CSVPreviewView(APIView):
    """
    دریافت پیش‌نمایش داده‌های CSV بدون ذخیره‌سازی
    POST /api/import/csv/preview/
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'فایل CSV ارسال نشده است'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = file.read().decode('utf-8-sig')
            parsed = CSVParser.parse_csv_content(content)
            headers = parsed['headers']
            rows = parsed['rows']

            # تشخیص کارگزار
            detected_broker = CSVParser.detect_broker(headers)

            # ساخت نگاشت پیشنهادی
            suggested_mapping = CSVParser.build_suggested_mapping(headers)

            # نمایش حداکثر ۵۰ ردیف برای پیش‌نمایش
            preview_rows = rows[:50]

            return Response({
                'headers': headers,
                'rows': preview_rows,
                'total_rows': parsed['total_rows'],
                'detected_broker': detected_broker,
                'suggested_mapping': suggested_mapping,
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ImportCSVView(APIView):
    """
    وارد کردن داده‌ها از فایل CSV
    POST /api/import/csv/
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'فایل CSV ارسال نشده است'}, status=status.HTTP_400_BAD_REQUEST)

        # اعتبارسنجی داده‌های ورودی
        serializer = ImportRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        column_mapping = serializer.validated_data['column_mapping']
        broker_name = serializer.validated_data.get('broker_name', '')
        save_mapping = serializer.validated_data.get('save_mapping', False)
        preview_only = serializer.validated_data.get('preview_only', False)
        portfolio_id = serializer.validated_data.get('portfolio_id')
        group_id = serializer.validated_data.get('group_id')

        # ایجاد لاگ
        import_log = ImportLog.objects.create(
            user=request.user,
            source='csv',
            file_name=file.name,
            file_size=file.size,
            status='processing',
        )

        try:
            content = file.read().decode('utf-8-sig')
            parsed = CSVParser.parse_csv_content(content)
            rows = parsed['rows']

            if not rows:
                import_log.mark_failed("فایل CSV خالی است")
                return Response({'error': 'فایل CSV خالی است'}, status=status.HTTP_400_BAD_REQUEST)

            # ساخت لیست تریدها بر اساس mapping
            trade_list = []
            skipped = 0
            errors = []
            warnings = []

            for idx, row in enumerate(rows):
                try:
                    trade_data = {}
                    for model_field, csv_column in column_mapping.items():
                        if csv_column in row:
                            value = row[csv_column]
                            # تبدیل نوع بر اساس فیلد
                            field_type = model_field
                            normalized = CSVParser.normalize_value(value, field_type)
                            if normalized is not None:
                                trade_data[model_field] = normalized

                    # فیلدهای ضروری
                    if 'trade_date' not in trade_data or 'symbol' not in trade_data:
                        warnings.append(f"ردیف {idx+2}: تاریخ یا نماد نامعتبر")
                        skipped += 1
                        continue

                    # اختصاص کاربر
                    trade_data['user_id'] = request.user.id

                    # پورتفولیو
                    if portfolio_id:
                        trade_data['portfolio_id'] = portfolio_id

                    # گروه (اگر مشخص شده)
                    if group_id:
                        trade_data['group_id'] = group_id

                    # بررسی تکراری
                    if DedupeEngine.is_duplicate(request.user, trade_data):
                        warnings.append(f"ردیف {idx+2}: ترید تکراری - {trade_data.get('symbol')} در تاریخ {trade_data.get('trade_date')}")
                        skipped += 1
                        continue

                    trade_list.append(trade_data)

                except Exception as e:
                    errors.append(f"ردیف {idx+2}: {str(e)}")
                    skipped += 1

            # اگر فقط پیش‌نمایش باشد
            if preview_only:
                return Response({
                    'total_rows': len(rows),
                    'valid_trades': len(trade_list),
                    'skipped': skipped,
                    'errors': errors,
                    'warnings': warnings,
                    'sample': trade_list[:5],
                })

            # ذخیره‌سازی تریدها
            imported = 0
            with transaction.atomic():
                for trade_data in trade_list:
                    # حذف فیلدهای اضافی که در مدل نیستند
                    model_fields = [f.name for f in Trade._meta.get_fields()]
                    clean_data = {k: v for k, v in trade_data.items() if k in model_fields}

                    # ایجاد ترید با استفاده از TradeCreateSerializer
                    trade_serializer = TradeCreateSerializer(
                        data=clean_data,
                        context={'request': request}
                    )
                    if trade_serializer.is_valid():
                        trade_serializer.save(user=request.user)
                        imported += 1
                    else:
                        errors.append(f"خطا در ذخیره‌سازی: {trade_serializer.errors}")
                        skipped += 1

            # ذخیره mapping اگر درخواست شده باشد
            if save_mapping and column_mapping:
                ImportMapping.objects.update_or_create(
                    user=request.user,
                    broker_name=broker_name or 'پیش‌فرض',
                    defaults={
                        'column_mapping': column_mapping,
                        'is_default': not ImportMapping.objects.filter(user=request.user, is_default=True).exists(),
                    }
                )

            import_log.mark_completed(imported, skipped, errors, warnings)

            return Response({
                'status': 'completed',
                'imported': imported,
                'skipped': skipped,
                'errors': errors,
                'warnings': warnings,
                'log_id': import_log.id,
            })

        except Exception as e:
            import_log.mark_failed(str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImportMappingView(APIView):
    """
    مدیریت نگاشت‌های ذخیره‌شده
    GET /api/import/mappings/
    POST /api/import/mappings/
    PUT /api/import/mappings/<id>/
    DELETE /api/import/mappings/<id>/
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def get(self, request):
        mappings = ImportMapping.objects.filter(user=request.user)
        serializer = ImportMappingSerializer(mappings, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ImportMappingSerializer(data=request.data)
        if serializer.is_valid():
            if serializer.validated_data.get('is_default', False):
                ImportMapping.objects.filter(user=request.user, is_default=True).update(is_default=False)
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ImportMappingDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def get_object(self, pk, user):
        try:
            return ImportMapping.objects.get(id=pk, user=user)
        except ImportMapping.DoesNotExist:
            return None

    def put(self, request, pk):
        mapping = self.get_object(pk, request.user)
        if not mapping:
            return Response({'error': 'نگاشت یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ImportMappingSerializer(mapping, data=request.data, partial=True)
        if serializer.is_valid():
            if serializer.validated_data.get('is_default', False):
                ImportMapping.objects.filter(user=request.user, is_default=True).exclude(id=pk).update(is_default=False)
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        mapping = self.get_object(pk, request.user)
        if not mapping:
            return Response({'error': 'نگاشت یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        mapping.delete()
        return Response({'message': 'نگاشت با موفقیت حذف شد'})


class ImportLogsView(APIView):
    """
    دریافت تاریخچه واردات
    GET /api/import/logs/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        logs = ImportLog.objects.filter(user=request.user).order_by('-started_at')[:50]
        serializer = ImportLogSerializer(logs, many=True)
        return Response(serializer.data)