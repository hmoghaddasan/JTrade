# backend/apps/import/views.py
import base64
import csv
import io
import json
import logging
from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthenticatedWithSubscription
from apps.trading.models import Trade, TradeGroup, Portfolio, CurrencyPair
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

logger = logging.getLogger(__name__)


class CSVPreviewView(APIView):
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

            logger.info(f"📄 CSV Preview - Headers: {headers}")
            logger.info(f"📄 CSV Preview - Total rows: {parsed['total_rows']}")

            detected_broker = CSVParser.detect_broker(headers)
            suggested_mapping = CSVParser.build_suggested_mapping(headers)

            preview_rows = rows[:50]

            return Response({
                'headers': headers,
                'rows': preview_rows,
                'total_rows': parsed['total_rows'],
                'detected_broker': detected_broker,
                'suggested_mapping': suggested_mapping,
            })

        except Exception as e:
            logger.error(f"❌ CSV Preview error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ImportCSVView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedWithSubscription]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'فایل CSV ارسال نشده است'}, status=status.HTTP_400_BAD_REQUEST)

        # ============================================================
        # ✅ دریافت column_mapping از request.POST
        # ============================================================
        column_mapping_str = request.POST.get('column_mapping')
        logger.info(f"📥 Raw column_mapping_str: {column_mapping_str}")

        if column_mapping_str:
            try:
                column_mapping = json.loads(column_mapping_str)
                logger.info(f"✅ Parsed column_mapping: {column_mapping}")
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON decode error: {e}")
                return Response(
                    {'error': 'column_mapping معتبر نیست. فرمت JSON باید باشد.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            column_mapping = {}
            logger.warning("⚠️ column_mapping not found in request.POST")

        # ============================================================
        # دریافت سایر پارامترها
        # ============================================================
        broker_name = request.POST.get('broker_name', '')
        save_mapping = request.POST.get('save_mapping') == 'true'
        preview_only = request.POST.get('preview_only') == 'true'
        portfolio_id = request.POST.get('portfolio_id')
        group_id = request.POST.get('group_id')

        # تبدیل به عدد
        if portfolio_id:
            try:
                portfolio_id = int(portfolio_id)
            except ValueError:
                portfolio_id = None

        if group_id:
            try:
                group_id = int(group_id)
            except ValueError:
                group_id = None

        logger.info("=" * 60)
        logger.info("📥 ImportCSVView - Request received")
        logger.info(f"📥 Column Mapping: {column_mapping}")
        logger.info(f"📥 Portfolio ID: {portfolio_id}")
        logger.info(f"📥 Group ID: {group_id}")
        logger.info("=" * 60)

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

            logger.info(f"📄 Total rows in CSV: {len(rows)}")

            if not rows:
                import_log.mark_failed("فایل CSV خالی است")
                return Response({'error': 'فایل CSV خالی است'}, status=status.HTTP_400_BAD_REQUEST)

            if rows:
                logger.info(f"📄 First row raw data: {rows[0]}")

            trade_list = []
            skipped = 0
            errors = []
            warnings = []

            valid_symbols = list(CurrencyPair.objects.filter(is_active=True).values_list('symbol', flat=True))
            logger.info(f"📊 Valid symbols count: {len(valid_symbols)}")

            for idx, row in enumerate(rows):
                try:
                    raw_date = row.get('opening_time_utc') or row.get('trade_date') or row.get('date')
                    raw_symbol = row.get('symbol')

                    logger.info(f"🔍 Row {idx+2} - Raw date: '{raw_date}'")
                    logger.info(f"🔍 Row {idx+2} - Raw symbol: '{raw_symbol}'")

                    # نرمال‌سازی ردیف
                    normalized_row = CSVParser.normalize_row(row, column_mapping)

                    normalized_date = normalized_row.get('trade_date')
                    normalized_symbol = normalized_row.get('symbol')

                    logger.info(f"✅ Row {idx+2} - Normalized date: '{normalized_date}'")
                    logger.info(f"✅ Row {idx+2} - Normalized symbol: '{normalized_symbol}'")

                    trade_date = normalized_row.get('trade_date')
                    symbol = normalized_row.get('symbol')

                    if not trade_date:
                        warnings.append(f"ردیف {idx+2}: تاریخ نامعتبر - {raw_date}")
                        logger.warning(f"⚠️ Row {idx+2}: Invalid date - {raw_date}")
                        skipped += 1
                        continue

                    if not symbol:
                        warnings.append(f"ردیف {idx+2}: نماد نامعتبر - {raw_symbol}")
                        logger.warning(f"⚠️ Row {idx+2}: Invalid symbol - {raw_symbol}")
                        skipped += 1
                        continue

                    if symbol not in valid_symbols:
                        warnings.append(f"ردیف {idx+2}: نماد '{symbol}' در دیتابیس یافت نشد")
                        logger.warning(f"⚠️ Row {idx+2}: Symbol '{symbol}' not found in database")
                        skipped += 1
                        continue

                    # ============================================================
                    # ✅ افزودن فیلدهای اجباری و انتخابی
                    # ============================================================
                    normalized_row['user_id'] = request.user.id

                    # گروه (اجباری)
                    if group_id:
                        normalized_row['group'] = group_id
                    else:
                        warnings.append(f"ردیف {idx+2}: گروه انتخاب نشده است")
                        logger.warning(f"⚠️ Row {idx+2}: Group not selected")
                        skipped += 1
                        continue

                    # پورتفولیو (اختیاری)
                    if portfolio_id:
                        normalized_row['portfolio'] = portfolio_id

                    # ============================================================
                    # بررسی تکراری
                    # ============================================================
                    if DedupeEngine.is_duplicate(request.user, normalized_row):
                        warnings.append(f"ردیف {idx+2}: ترید تکراری - {symbol} در تاریخ {trade_date}")
                        logger.warning(f"⚠️ Row {idx+2}: Duplicate trade - {symbol} on {trade_date}")
                        skipped += 1
                        continue

                    trade_list.append(normalized_row)
                    logger.info(f"✅ Row {idx+2}: Added to import list")

                except Exception as e:
                    errors.append(f"ردیف {idx+2}: {str(e)}")
                    logger.error(f"❌ Row {idx+2}: Error - {str(e)}")
                    skipped += 1

            logger.info(f"📊 Summary - Valid trades: {len(trade_list)}, Skipped: {skipped}")

            if preview_only:
                return Response({
                    'total_rows': len(rows),
                    'valid_trades': len(trade_list),
                    'skipped': skipped,
                    'errors': errors,
                    'warnings': warnings,
                    'sample': trade_list[:5],
                })

            # ============================================================
            # ذخیره‌سازی تریدها
            # ============================================================
            imported = 0
            with transaction.atomic():
                for trade_data in trade_list:
                    # فیلدهای مدل را فیلتر کن
                    model_fields = [f.name for f in Trade._meta.get_fields()]
                    clean_data = {k: v for k, v in trade_data.items() if k in model_fields}

                    # ============================================================
                    # ✅ اطمینان از وجود group (اگر به هر دلیلی در clean_data نبود)
                    # ============================================================
                    if 'group' not in clean_data and 'group' in trade_data:
                        clean_data['group'] = trade_data['group']

                    if 'portfolio' not in clean_data and 'portfolio' in trade_data:
                        clean_data['portfolio'] = trade_data['portfolio']

                    logger.info(f"💾 Saving trade: {clean_data.get('symbol')} - {clean_data.get('trade_date')}")
                    logger.info(f"📦 Clean data: {clean_data}")

                    trade_serializer = TradeCreateSerializer(
                        data=clean_data,
                        context={'request': request}
                    )
                    if trade_serializer.is_valid():
                        trade_serializer.save(user=request.user)
                        imported += 1
                        logger.info(f"✅ Trade saved successfully")
                    else:
                        errors.append(f"خطا در ذخیره‌سازی: {trade_serializer.errors}")
                        logger.error(f"❌ Serializer error: {trade_serializer.errors}")
                        skipped += 1

            # ============================================================
            # ذخیره نگاشت اگر درخواست شده باشد
            # ============================================================
            if save_mapping and column_mapping:
                ImportMapping.objects.update_or_create(
                    user=request.user,
                    broker_name=broker_name or 'پیش‌فرض',
                    defaults={
                        'column_mapping': column_mapping,
                        'is_default': not ImportMapping.objects.filter(user=request.user, is_default=True).exists(),
                    }
                )
                logger.info(f"💾 Mapping saved for user {request.user.id}")

            import_log.mark_completed(imported, skipped, errors, warnings)

            logger.info(f"🎉 Import completed: {imported} imported, {skipped} skipped")
            logger.info("=" * 60)

            return Response({
                'status': 'completed',
                'imported': imported,
                'skipped': skipped,
                'errors': errors[:20],
                'warnings': warnings[:20],
                'log_id': import_log.id,
            })

        except Exception as e:
            logger.error(f"❌ Import failed: {str(e)}")
            import_log.mark_failed(str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImportMappingView(APIView):
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        logs = ImportLog.objects.filter(user=request.user).order_by('-started_at')[:50]
        serializer = ImportLogSerializer(logs, many=True)
        return Response(serializer.data)