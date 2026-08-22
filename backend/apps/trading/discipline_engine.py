# backend/apps/trading/discipline_engine.py

import logging
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.db.models import Sum, Q, Count, Avg, F, Value
from django.utils import timezone
from django.core.cache import cache
from django.db import transaction
from .models import (
    Trade, Portfolio, TradingRule, TradeRuleCheck,
    DisciplineSettings, DailyDisciplineState,
    DisciplineViolation, Reflection, DailyHabit
)

logger = logging.getLogger(__name__)


class DisciplineEngine:
    """
    موتور قوانین انضباطی – بررسی قوانین سخت و محاسبه شاخص‌ها
    """

    # کلیدهای کش
    CACHE_KEY_PREFIX = 'discipline_'
    CACHE_TTL = 300  # ۵ دقیقه

    def __init__(self, user):
        self.user = user
        self._settings = None
        self._today_state = None
        self._today = timezone.now().date()
        self._trades_today = None
        self._violations_today = None

    @property
    def settings(self):
        """دریافت تنظیمات کاربر با کش"""
        if self._settings is None:
            cache_key = f"{self.CACHE_KEY_PREFIX}settings_{self.user.id}"
            self._settings = cache.get(cache_key)
            if self._settings is None:
                try:
                    self._settings = DisciplineSettings.objects.get(user=self.user)
                except DisciplineSettings.DoesNotExist:
                    self._settings = self._create_default_settings()
                cache.set(cache_key, self._settings, self.CACHE_TTL)
        return self._settings

    def _create_default_settings(self):
        """ایجاد تنظیمات پیش‌فرض برای کاربر"""
        return DisciplineSettings.objects.create(user=self.user)

    @property
    def today_state(self):
        """دریافت وضعیت امروز با کش"""
        if self._today_state is None:
            cache_key = f"{self.CACHE_KEY_PREFIX}state_{self.user.id}_{self._today}"
            self._today_state = cache.get(cache_key)
            if self._today_state is None:
                self._today_state, created = DailyDisciplineState.objects.get_or_create(
                    user=self.user,
                    date=self._today,
                    defaults={
                        'trades_today': 0,
                        'daily_loss': 0,
                        'consecutive_losses': 0,
                        'is_locked_until_end_of_day': False,
                        'is_cooldown_active': False,
                        'tiltmeter_score': 0,
                        'compliance_rate': 0,
                    }
                )
                # به‌روزرسانی آمار از تریدهای امروز
                self._refresh_today_stats()
                cache.set(cache_key, self._today_state, self.CACHE_TTL)
        return self._today_state

    def _refresh_today_stats(self):
        """به‌روزرسانی آمار امروز از تریدها"""
        trades_today = Trade.objects.filter(
            user=self.user,
            trade_date=self._today,
            is_deleted=False
        )
        self._trades_today = trades_today

        # تعداد ترید
        self._today_state.trades_today = trades_today.count()

        # ضرر امروز (مجموع ضررها)
        total_loss = trades_today.filter(profit__lt=0).aggregate(
            total=Sum('profit')
        )['total'] or 0
        self._today_state.daily_loss = abs(total_loss)

        # ضرر متوالی
        self._today_state.consecutive_losses = self._calculate_consecutive_losses()

        # ذخیره موقت
        self._today_state.save(update_fields=['trades_today', 'daily_loss', 'consecutive_losses'])

    def _calculate_consecutive_losses(self):
        """محاسبه تعداد ضررهای متوالی امروز"""
        trades_today = Trade.objects.filter(
            user=self.user,
            trade_date=self._today,
            is_deleted=False
        ).order_by('created_at')

        consecutive = 0
        for trade in trades_today:
            if trade.profit is not None and trade.profit < 0:
                consecutive += 1
            elif trade.profit is not None and trade.profit >= 0:
                consecutive = 0
        return consecutive

    def check_can_trade(self, trade_data):
        """
        بررسی مجاز بودن ثبت ترید
        بازگشت: (مجاز, پیام خطا, هشدارها)
        """
        warnings = []
        violations = []

        # ===== ۱. محدودیت تعداد ترید روزانه =====
        if self.settings.max_trades_per_day > 0:
            if self.today_state.trades_today >= self.settings.max_trades_per_day:
                return False, f"❌ محدودیت ترید روزانه: حداکثر {self.settings.max_trades_per_day} ترید در روز مجاز است. امروز {self.today_state.trades_today} ترید ثبت کرده‌اید.", warnings

        # ===== ۲. سقف ضرر روزانه =====
        if self.settings.daily_loss_limit > 0:
            if self.today_state.daily_loss >= self.settings.daily_loss_limit:
                # فعال‌سازی کول‌داون تا پایان روز
                self._activate_cooldown('daily_loss', "سقف ضرر روزانه")
                return False, f"❌ سقف ضرر روزانه ({self.settings.daily_loss_limit}$) رسیده است. معاملات تا پایان روز قفل شد.", warnings

        # ===== ۳. کول‌داون پس از ضرر متوالی =====
        if self.settings.cooldown_consecutive_losses > 0:
            if self.today_state.consecutive_losses >= self.settings.cooldown_consecutive_losses:
                if not self._is_cooldown_active():
                    self._activate_cooldown(
                        'consecutive_loss',
                        f"{self.settings.cooldown_consecutive_losses} ضرر متوالی"
                    )
                return False, f"⛔ کول‌داون: پس از {self.settings.cooldown_consecutive_losses} ضرر متوالی، به مدت {self.settings.cooldown_duration_minutes} دقیقه معاملات قفل است.", warnings

        # ===== ۴. سقف ضرر هر ترید (هشدار) =====
        if self.settings.max_loss_per_trade > 0:
            expected_risk = Decimal(str(trade_data.get('risk_usd', 0))) if trade_data.get('risk_usd') else 0
            if expected_risk > self.settings.max_loss_per_trade:
                warnings.append(f"⚠️ هشدار: ریسک این ترید ({expected_risk}$) بیشتر از سقف تعیین‌شده ({self.settings.max_loss_per_trade}$) است. با احتیاط وارد شوید.")

        # ===== ۵. حداکثر حجم معامله (هشدار) =====
        if self.settings.max_contract_size > 0:
            volume = Decimal(str(trade_data.get('volume', 0))) if trade_data.get('volume') else 0
            if volume > self.settings.max_contract_size:
                warnings.append(f"⚠️ هشدار: حجم معامله ({volume} لات) بیشتر از سقف تعیین‌شده ({self.settings.max_contract_size} لات) است.")

        # ===== ۶. چک‌لیست پیش‌از معامله (اجباری) =====
        if self.settings.checklist_required:
            checklist_items = self.settings.pre_trade_checklist_items
            if checklist_items and isinstance(checklist_items, list):
                # بررسی اینکه آیا کاربر آیتم‌ها را تیک زده است (از داده‌های ورودی)
                checked_items = trade_data.get('checklist_checked', [])
                missing = [item for item in checklist_items if item not in checked_items]
                if missing:
                    return False, f"❌ چک‌لیست پیش‌از معامله کامل نیست. موارد زیر را بررسی کنید: {', '.join(missing)}", warnings

        # ===== ۷. کول‌داون اختیاری =====
        if self.settings.manual_cooldown_minutes > 0:
            if self._is_manual_cooldown_active():
                remaining = self._get_manual_cooldown_remaining()
                return False, f"⏳ کول‌داون اختیاری: {remaining} دقیقه باقیمانده", warnings

        # ثبت وضعیت روزانه
        self._update_state_after_check()

        return True, "✅ مجاز به ثبت ترید", warnings

    def _is_cooldown_active(self):
        """بررسی فعال بودن کول‌داون"""
        if self.today_state.is_cooldown_active:
            if self.today_state.cooldown_until and timezone.now() < self.today_state.cooldown_until:
                return True
            else:
                self.today_state.is_cooldown_active = False
                self.today_state.cooldown_until = None
                self.today_state.save(update_fields=['is_cooldown_active', 'cooldown_until'])
        return False

    def _is_manual_cooldown_active(self):
        """بررسی کول‌داون اختیاری (از تنظیمات)"""
        # در اینجا می‌توان از یک فیلد جداگانه در DailyDisciplineState استفاده کرد
        return False  # برای سادگی

    def _get_manual_cooldown_remaining(self):
        return 0

    def _activate_cooldown(self, reason, reason_detail):
        """فعال‌سازی کول‌داون"""
        duration = self.settings.cooldown_duration_minutes
        until = timezone.now() + timedelta(minutes=duration)

        self.today_state.is_cooldown_active = True
        self.today_state.cooldown_until = until
        self.today_state.cooldown_reason = f"{reason_detail} - {reason}"
        self.today_state.save(update_fields=['is_cooldown_active', 'cooldown_until', 'cooldown_reason'])

        # ثبت نقض
        DisciplineViolation.objects.create(
            user=self.user,
            violation_type=reason,
            description=f"کول‌داون فعال شد: {reason_detail}",
            severity=3,
        )

        logger.info(f"🔒 Cooldown activated for user {self.user.id}: {reason_detail}")

    def _update_state_after_check(self):
        """به‌روزرسانی وضعیت پس از بررسی"""
        cache_key = f"{self.CACHE_KEY_PREFIX}state_{self.user.id}_{self._today}"
        cache.delete(cache_key)
        self._today_state = None

    def record_trade(self, trade):
        """
        ثبت ترید و به‌روزرسانی آمار
        """
        with transaction.atomic():
            # به‌روزرسانی تعداد ترید و ضرر
            state = self.today_state
            state.trades_today = Trade.objects.filter(
                user=self.user,
                trade_date=self._today,
                is_deleted=False
            ).count()

            if trade.profit is not None and trade.profit < 0:
                total_loss = Trade.objects.filter(
                    user=self.user,
                    trade_date=self._today,
                    is_deleted=False,
                    profit__lt=0
                ).aggregate(total=Sum('profit'))['total'] or 0
                state.daily_loss = abs(total_loss)
                state.consecutive_losses = self._calculate_consecutive_losses()
            else:
                # اگر ترید سود بود، ضرر متوالی ریست می‌شود
                if trade.profit is not None and trade.profit >= 0:
                    state.consecutive_losses = 0

            # محاسبه Tiltmeter
            state.tiltmeter_score = self.calculate_tiltmeter()

            # محاسبه نرخ پایبندی
            state.compliance_rate = self.calculate_compliance_rate()

            state.save()

            # پاک کردن کش
            cache_key = f"{self.CACHE_KEY_PREFIX}state_{self.user.id}_{self._today}"
            cache.delete(cache_key)
            self._today_state = None

            # ثبت بازتاب خودکار (اختیاری)
            # برای بازتاب، کاربر باید به‌صورت دستی ثبت کند

    def calculate_tiltmeter(self):
        """
        محاسبه Tiltmeter (نرخ پایبندی ترکیبی)
        بازگشت: عدد ۰-۱۰۰
        """
        trades = Trade.objects.filter(user=self.user, is_deleted=False)
        total = trades.count()
        if total == 0:
            return 0

        # ===== ۱. پایبندی به قوانین (۶۰٪ وزن) =====
        rules = TradingRule.objects.filter(user=self.user, is_active=True)
        if rules.exists():
            checks = TradeRuleCheck.objects.filter(
                trade__user=self.user,
                trade__is_deleted=False
            )
            total_checks = checks.count()
            checked = checks.filter(is_checked=True).count()
            rule_compliance = (checked / total_checks * 100) if total_checks > 0 else 0
        else:
            rule_compliance = 0

        # ===== ۲. پایبندی به چک‌لیست (۲۰٪ وزن) =====
        # تعداد تریدهایی که چک‌لیست کامل داشته‌اند
        checklist_compliance = 0
        if self.settings.checklist_required:
            checklist_items = self.settings.pre_trade_checklist_items
            if checklist_items and isinstance(checklist_items, list):
                # محاسبه تریدهایی که همه آیتم‌های چک‌لیست را داشته‌اند
                # برای سادگی، میانگین کیفیت اجرا را به‌عنوان شاخص در نظر می‌گیریم
                avg_quality = trades.aggregate(Avg('execution_quality_score'))['execution_quality_score__avg'] or 0
                checklist_compliance = (avg_quality / 10) * 100

        # ===== ۳. نرخ برد (۲۰٪ وزن) =====
        wins = trades.filter(profit__gt=0).count()
        win_rate = (wins / total * 100) if total > 0 else 0

        # محاسبه نهایی با وزن‌ها
        weights = self.settings.tiltmeter_weights or {
            'rule': 0.6,
            'checklist': 0.2,
            'win_rate': 0.2,
        }
        score = (
            rule_compliance * weights.get('rule', 0.6) +
            checklist_compliance * weights.get('checklist', 0.2) +
            win_rate * weights.get('win_rate', 0.2)
        )

        return round(score, 2)

    def calculate_compliance_rate(self):
        """
        محاسبه نرخ پایبندی کلی
        (تعداد تریدهای با قانون / کل تریدها) × ۱۰۰
        """
        trades = Trade.objects.filter(user=self.user, is_deleted=False)
        total = trades.count()
        if total == 0:
            return 0

        # تریدهایی که حداقل یک قانون برایشان ثبت شده
        trades_with_rules = Trade.objects.filter(
            user=self.user,
            is_deleted=False,
            rule_checks__isnull=False
        ).distinct().count()

        return round((trades_with_rules / total * 100), 2)

    def get_discipline_report(self, days=30):
        """
        گزارش نشت انضباط (Leak Report)
        بازگشت: دیکشنری با جزئیات
        """
        start_date = timezone.now().date() - timedelta(days=days)

        trades = Trade.objects.filter(
            user=self.user,
            is_deleted=False,
            trade_date__gte=start_date
        )

        total = trades.count()
        if total == 0:
            return {
                'total_trades': 0,
                'disciplined_trades': 0,
                'undisciplined_trades': 0,
                'discipline_cost': 0,
                'violations_by_type': [],
                'compliance_rate': 0,
                'recommendations': [],
            }

        # شناسایی تریدهای بی‌انضباط (با نقض)
        violations = DisciplineViolation.objects.filter(
            user=self.user,
            created_at__date__gte=start_date
        )

        undisciplined_trade_ids = violations.values_list('trade_id', flat=True).distinct()
        disciplined_trades = trades.exclude(id__in=undisciplined_trade_ids)
        undisciplined_trades = trades.filter(id__in=undisciplined_trade_ids)

        # سود تریدهای باانضباط
        disciplined_profit = disciplined_trades.aggregate(total=Sum('profit'))['total'] or 0

        # سود تریدهای بی‌انضباط
        undisciplined_profit = undisciplined_trades.aggregate(total=Sum('profit'))['total'] or 0

        discipline_cost = disciplined_profit - undisciplined_profit

        # دسته‌بندی نقض‌ها
        violations_by_type = []
        for v_type, label in DisciplineViolation.VIOLATION_TYPES:
            count = violations.filter(violation_type=v_type).count()
            if count > 0:
                violations_by_type.append({
                    'type': v_type,
                    'label': label,
                    'count': count,
                })

        # پیشنهادات
        recommendations = []
        if discipline_cost > 0:
            recommendations.append(f"💰 هزینه بی‌انضباطی: {discipline_cost:.2f}$")
        if violations_by_type:
            max_violation = max(violations_by_type, key=lambda x: x['count'])
            recommendations.append(f"⚠️ بیشترین نقض: {max_violation['label']} ({max_violation['count']} بار)")

        if len(violations_by_type) > 3:
            recommendations.append("📈 روی کاهش نقض‌های اصلی تمرکز کنید.")

        compliance_rate = (disciplined_trades.count() / total * 100) if total > 0 else 0

        return {
            'total_trades': total,
            'disciplined_trades': disciplined_trades.count(),
            'undisciplined_trades': undisciplined_trades.count(),
            'discipline_cost': round(discipline_cost, 2),
            'disciplined_profit': round(disciplined_profit, 2),
            'undisciplined_profit': round(undisciplined_profit, 2),
            'violations_by_type': violations_by_type,
            'compliance_rate': round(compliance_rate, 2),
            'recommendations': recommendations,
        }

    def get_heatmap_data(self, days=90):
        """
        دریافت داده‌های گرمای پایبندی برای تقویم
        بازگشت: لیست روزها با وضعیت 🟢🟡🔴
        """
        start_date = timezone.now().date() - timedelta(days=days)
        states = DailyDisciplineState.objects.filter(
            user=self.user,
            date__gte=start_date
        ).order_by('date')

        result = []
        for state in states:
            # تعیین رنگ بر اساس نرخ پایبندی
            compliance = state.compliance_rate or 0
            if compliance >= 80:
                color = 'green'  # 🟢
                label = 'عالی'
            elif compliance >= 50:
                color = 'yellow'  # 🟡
                label = 'متوسط'
            else:
                color = 'red'  # 🔴
                label = 'ضعیف'

            # امتیاز Tiltmeter برای نمایش
            tiltmeter = state.tiltmeter_score or 0

            result.append({
                'date': state.date.isoformat(),
                'compliance': round(compliance, 2),
                'tiltmeter': round(tiltmeter, 2),
                'color': color,
                'label': label,
                'trades': state.trades_today,
                'daily_loss': float(state.daily_loss) if state.daily_loss else 0,
                'is_locked': state.is_locked_until_end_of_day,
            })

        return result

    def get_settings(self):
        """دریافت تنظیمات کامل کاربر"""
        return {
            'max_trades_per_day': self.settings.max_trades_per_day,
            'daily_loss_limit': float(self.settings.daily_loss_limit),
            'max_loss_per_trade': float(self.settings.max_loss_per_trade),
            'max_contract_size': float(self.settings.max_contract_size),
            'cooldown_consecutive_losses': self.settings.cooldown_consecutive_losses,
            'cooldown_duration_minutes': self.settings.cooldown_duration_minutes,
            'cooldown_after_daily_loss': self.settings.cooldown_after_daily_loss,
            'cooldown_after_max_trades': self.settings.cooldown_after_max_trades,
            'manual_cooldown_minutes': self.settings.manual_cooldown_minutes,
            'pre_trade_checklist_items': self.settings.pre_trade_checklist_items,
            'checklist_required': self.settings.checklist_required,
            'daily_habits': self.settings.daily_habits,
            'tiltmeter_weights': self.settings.tiltmeter_weights,
            'is_active': self.settings.is_active,
        }

    def update_settings(self, data):
        """به‌روزرسانی تنظیمات کاربر"""
        for key, value in data.items():
            if hasattr(self.settings, key):
                setattr(self.settings, key, value)
        self.settings.save()

        # پاک کردن کش
        cache_key = f"{self.CACHE_KEY_PREFIX}settings_{self.user.id}"
        cache.delete(cache_key)
        self._settings = None

        return self.get_settings()

    def get_today_status(self):
        """دریافت وضعیت امروز برای نمایش در ویجت"""
        state = self.today_state

        # محاسبه Tiltmeter و پایبندی در صورت نیاز
        tiltmeter = state.tiltmeter_score or self.calculate_tiltmeter()
        compliance = state.compliance_rate or self.calculate_compliance_rate()

        # وضعیت کول‌داون
        cooldown_active = self._is_cooldown_active()
        cooldown_remaining = 0
        if cooldown_active and state.cooldown_until:
            remaining = (state.cooldown_until - timezone.now()).total_seconds()
            cooldown_remaining = max(0, int(remaining // 60))

        return {
            'date': self._today.isoformat(),
            'trades_today': state.trades_today,
            'daily_loss': float(state.daily_loss) if state.daily_loss else 0,
            'consecutive_losses': state.consecutive_losses,
            'is_locked': state.is_locked_until_end_of_day,
            'is_cooldown_active': cooldown_active,
            'cooldown_remaining': cooldown_remaining,
            'cooldown_reason': state.cooldown_reason,
            'tiltmeter_score': round(tiltmeter, 2),
            'compliance_rate': round(compliance, 2),
            'max_trades_per_day': self.settings.max_trades_per_day,
            'daily_loss_limit': float(self.settings.daily_loss_limit),
            'max_loss_per_trade': float(self.settings.max_loss_per_trade),
            'max_contract_size': float(self.settings.max_contract_size),
            'cooldown_consecutive_losses': self.settings.cooldown_consecutive_losses,
            'cooldown_duration_minutes': self.settings.cooldown_duration_minutes,
            'checklist_items': self.settings.pre_trade_checklist_items,
            'habits': self.settings.daily_habits,
            'habits_completed': state.habits_completed or [],
        }

    def save_reflection(self, trade_id, data):
        """
        ثبت بازتاب پس از ترید
        """
        try:
            trade = Trade.objects.get(id=trade_id, user=self.user, is_deleted=False)
        except Trade.DoesNotExist:
            raise ValueError("ترید یافت نشد")

        reflection = Reflection.objects.create(
            user=self.user,
            trade=trade,
            followed_plan=data.get('followed_plan', True),
            learned_lesson=data.get('learned_lesson', ''),
            emotion_after=data.get('emotion_after', ''),
            improvement_note=data.get('improvement_note', ''),
            quality_score=data.get('quality_score', 3),
        )

        return reflection

    def get_reflections(self, limit=20):
        """دریافت بازتاب‌های کاربر"""
        return Reflection.objects.filter(user=self.user).order_by('-created_at')[:limit]

    def save_habit(self, habit_name, is_done=True):
        """ثبت وضعیت عادت روزانه"""
        habit, created = DailyHabit.objects.get_or_create(
            user=self.user,
            habit_name=habit_name,
            date=self._today,
            defaults={'is_done': is_done}
        )
        if not created:
            habit.is_done = is_done
            habit.save()

        # به‌روزرسانی state
        state = self.today_state
        habits_completed = state.habits_completed or []
        if is_done and habit_name not in habits_completed:
            habits_completed.append(habit_name)
        elif not is_done and habit_name in habits_completed:
            habits_completed.remove(habit_name)
        state.habits_completed = habits_completed
        state.save(update_fields=['habits_completed'])

        return habit

    def get_habits_status(self):
        """دریافت وضعیت عادات امروز"""
        habits = self.settings.daily_habits or []
        completed = self.today_state.habits_completed or []
        return {
            'habits': habits,
            'completed': completed,
            'progress': round((len(completed) / len(habits) * 100) if habits else 0, 2),
        }