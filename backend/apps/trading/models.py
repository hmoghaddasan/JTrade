# backend/apps/trading/models.py

from django.db import models
from django.db.models import Sum
from django.utils import timezone
from django.conf import settings


def screenshot_upload_path(instance, filename):
    """مسیر ذخیره‌سازی تصویر چارت"""
    ext = filename.split('.')[-1] if '.' in filename else 'jpg'
    import time
    timestamp = int(time.time() * 1000)
    return f'trades/user_{instance.user.id}/{timestamp}.{ext}'


# ============================================
# ✅ مدل بروکر (کارگزار) - جدید
# ============================================
class Broker(models.Model):
    """مدل بروکر/کارگزار معاملاتی"""

    CATEGORY_CHOICES = [
        ('international_fx', 'بروکرهای بین‌المللی فارکس و CFD'),
        ('international_crypto', 'صرافی‌های ارز دیجیتال بین‌المللی'),
        ('iranian_crypto', 'صرافی‌های ارز دیجیتال داخلی'),
        ('iranian_stock', 'کارگزاری‌های بورس داخلی'),
    ]

    name = models.CharField('نام بروکر', max_length=100, unique=True)
    category = models.CharField('دسته‌بندی', max_length=30, choices=CATEGORY_CHOICES, default='international_fx')
    is_active = models.BooleanField('فعال', default=True)
    order_index = models.IntegerField('ترتیب نمایش', default=0)
    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'بروکر'
        verbose_name_plural = 'بروکرها'
        ordering = ['category', 'order_index', 'name']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name

    def get_category_label(self):
        return dict(self.CATEGORY_CHOICES).get(self.category, self.category)


# ============================================
# پورتفولیو (حساب‌های معاملاتی مستقل)
# ============================================
class Portfolio(models.Model):
    """پورتفولیو/حساب معاملاتی مستقل با قوانین و تنظیمات جداگانه"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='portfolios',
        verbose_name='کاربر'
    )
    name = models.CharField('نام پورتفولیو', max_length=100)
    description = models.TextField('توضیحات', blank=True)
    icon = models.CharField('آیکون', max_length=10, default='📊')
    initial_balance = models.DecimalField(
        'سرمایه اولیه',
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='سرمایه اولیه این پورتفولیو به دلار'
    )
    is_active = models.BooleanField('فعال', default=True)
    is_default = models.BooleanField('پیش‌فرض', default=False)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'پورتفولیو'
        verbose_name_plural = 'پورتفولیوها'
        ordering = ['-is_default', 'name']
        unique_together = [['user', 'name']]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'is_default']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.name}"

    def save(self, *args, **kwargs):
        if self.is_default:
            Portfolio.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)

    def get_total_trades(self):
        return self.trades.filter(is_deleted=False).count()

    def get_total_profit(self):
        result = self.trades.filter(is_deleted=False).aggregate(Sum('profit'))
        return result['profit__sum'] or 0

    def get_win_rate(self):
        trades = self.trades.filter(is_deleted=False)
        total = trades.count()
        if total == 0:
            return 0
        wins = trades.filter(profit__gt=0).count()
        return round((wins / total) * 100, 1)

    def get_current_balance(self):
        """محاسبه موجودی فعلی بر اساس سرمایه اولیه و سود/زیان"""
        return self.initial_balance + self.get_total_profit()


class CurrencyPair(models.Model):
    """جفت ارزها (فیات و کریپتو)"""
    PAIR_TYPES = [
        ('forex', 'فارکس'),
        ('crypto', 'کریپتو'),
        ('index', 'شاخص'),
        ('commodity', 'کالا'),
    ]

    symbol = models.CharField('نماد', max_length=20, unique=True)
    base_currency = models.CharField('ارز پایه', max_length=10)
    quote_currency = models.CharField('ارز متقابل', max_length=10)
    pair_type = models.CharField('نوع', max_length=20, choices=PAIR_TYPES, default='forex')
    description = models.CharField('توضیحات', max_length=100, blank=True)
    is_active = models.BooleanField('فعال', default=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'جفت ارز'
        verbose_name_plural = 'جفت ارزها'
        ordering = ['symbol']

    def __str__(self):
        return self.symbol


class TradeGroup(models.Model):
    """گروه‌های ترید (دسته‌بندی)"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trade_groups',
        verbose_name='کاربر'
    )
    group_name = models.CharField('نام گروه', max_length=100)
    icon = models.CharField('آیکون', max_length=10, default='📁')
    description = models.TextField('توضیحات', blank=True)
    is_active = models.BooleanField('فعال', default=True)
    is_default = models.BooleanField('پیش‌فرض', default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_groups',
        verbose_name='ایجاد کننده'
    )
    order_index = models.IntegerField('ترتیب نمایش', default=0)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'گروه ترید'
        verbose_name_plural = 'گروه‌های ترید'
        ordering = ['order_index', 'group_name']
        unique_together = [['user', 'group_name']]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'is_default']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.group_name}"

    def save(self, *args, **kwargs):
        if self.is_default:
            TradeGroup.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


class Trade(models.Model):
    """مدل اصلی ترید"""
    TRADE_TYPES = [('Buy', 'خرید'), ('Sell', 'فروش')]
    SESSION_TYPES = [('High Pro', 'حرفه‌ای'), ('Low Pro', 'مبتدی')]
    SLEEP_QUALITY = [('خوب', 'خوب'), ('متوسط', 'متوسط'), ('بد', 'بد')]
    BIAS_TYPES = [('Bullish', 'صعودی'), ('Bearish', 'نزولی'), ('Neutral', 'خنثی')]
    STRATEGY_TYPES = [('LTP', 'LTP'), ('ITP', 'ITP'), ('STP', 'STP')]
    STRESS_LEVELS = [('کم', 'کم'), ('متوسط', 'متوسط'), ('زیاد', 'زیاد')]
    EMOTION_CONTROL = [('بله', 'بله'), ('خیر', 'خیر'), ('متوسط', 'متوسط')]
    EXPECTATION_MANAGEMENT = [('ضعیف', 'ضعیف'), ('متوسط', 'متوسط'), ('خوب', 'خوب')]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trades',
        verbose_name='کاربر'
    )
    group = models.ForeignKey(
        TradeGroup,
        on_delete=models.PROTECT,
        related_name='trades',
        verbose_name='گروه'
    )
    portfolio = models.ForeignKey(
        'Portfolio',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trades',
        verbose_name='پورتفولیو'
    )

    # ===== فیلد جدید بروکر =====
    broker = models.ForeignKey(
        'Broker',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trades',
        verbose_name='بروکر/کارگزار'
    )

    trade_date = models.DateField('تاریخ معامله')
    day_of_week = models.CharField('روز هفته', max_length=20, blank=True)
    month = models.IntegerField('ماه میلادی', null=True, blank=True)
    time_ny = models.TimeField('ساعت به وقت نیویورک', null=True, blank=True)

    symbol = models.CharField('نماد', max_length=20)
    trade_type = models.CharField('نوع ترید', max_length=10, choices=TRADE_TYPES)
    session_type = models.CharField('نوع جلسه', max_length=20, choices=SESSION_TYPES, blank=True, null=True)
    weekly_profile_note = models.TextField('یادداشت پروفایل هفتگی', blank=True)

    sleep_quality = models.CharField('کیفیت خواب', max_length=10, choices=SLEEP_QUALITY, blank=True, null=True)
    food_status = models.BooleanField('تغذیه مناسب', default=False)
    focus = models.BooleanField('تمرکز', default=False)
    calm = models.BooleanField('آرامش', default=False)
    excited = models.BooleanField('هیجان', default=False)
    fear = models.BooleanField('ترس', default=False)
    greed = models.BooleanField('طمع', default=False)
    relaxed = models.BooleanField('ریلکس', default=False)
    happy = models.BooleanField('خوشحال', default=False)
    sad = models.BooleanField('غمگین', default=False)
    energetic = models.BooleanField('پرانرژی', default=False)
    tired = models.BooleanField('خسته', default=False)
    fomo = models.BooleanField('FOMO', default=False)
    patience = models.BooleanField('صبر', default=False)
    contentment = models.BooleanField('قناعت', default=False)
    dominant_feeling = models.CharField('احساس غالب', max_length=50, blank=True)

    bias = models.CharField('بایاس', max_length=10, choices=BIAS_TYPES, blank=True, null=True)
    strategy_type = models.CharField('نوع استراتژی', max_length=10, choices=STRATEGY_TYPES, blank=True, null=True)

    timeframe_d = models.BooleanField('D1', default=False)
    timeframe_h4 = models.BooleanField('H4', default=False)
    timeframe_h1 = models.BooleanField('H1', default=False)
    timeframe_m15 = models.BooleanField('M15', default=False)
    timeframe_m5 = models.BooleanField('M5', default=False)
    timeframe_m1 = models.BooleanField('M1', default=False)

    retirement_model = models.CharField('مدل ورودی', max_length=100, blank=True)
    weekly_news_printed = models.BooleanField('اخبار هفتگی چاپ شد', default=False)
    zero_hour_identified = models.BooleanField('ساعت صفر مشخص شد', default=False)
    asian_range_identified = models.BooleanField('رنج آسیا مشخص شد', default=False)
    london_range_identified = models.BooleanField('رنج لندن مشخص شد', default=False)
    judas_lo_identified = models.BooleanField('Judas LO مشخص شد', default=False)
    key_levels_reviewed = models.BooleanField('سطوح کلیدی بررسی شد', default=False)
    smt_confirmed = models.BooleanField('SMT تایید شد', default=False)
    bond_dxy_support = models.BooleanField('حمایت BOND/DXY', default=False)
    checklist_extra = models.TextField('توضیحات تکمیلی چک‌لیست', blank=True)

    entry_price = models.DecimalField('قیمت ورود', max_digits=15, decimal_places=5, null=True, blank=True)
    stop_loss = models.DecimalField('حد ضرر', max_digits=15, decimal_places=5, null=True, blank=True)
    take_profit_1 = models.DecimalField('حد سود ۱', max_digits=15, decimal_places=5, null=True, blank=True)
    take_profit_2 = models.DecimalField('حد سود ۲', max_digits=15, decimal_places=5, null=True, blank=True)
    take_profit_3 = models.DecimalField('حد سود ۳', max_digits=15, decimal_places=5, null=True, blank=True)
    risk_usd = models.DecimalField('ریسک به دلار', max_digits=10, decimal_places=2, null=True, blank=True)
    risk_percent = models.DecimalField('درصد ریسک', max_digits=5, decimal_places=2, null=True, blank=True)
    risk_reward_ratio = models.DecimalField('نسبت ریسک به ریوارد', max_digits=5, decimal_places=2, null=True,
                                            blank=True)

    close_price = models.DecimalField('قیمت بسته شدن', max_digits=15, decimal_places=5, null=True, blank=True)
    tp_sl_hit = models.CharField('حد خورده شده', max_length=20, blank=True)
    profit = models.DecimalField('سود/زیان', max_digits=15, decimal_places=2, null=True, blank=True)

    pre_trade_stress = models.CharField('استرس قبل معامله', max_length=10, choices=STRESS_LEVELS, blank=True, null=True)
    entry_emotion_control = models.CharField('کنترل هیجان هنگام ورود', max_length=10, choices=EMOTION_CONTROL,
                                             blank=True, null=True)
    reaction_to_profit = models.CharField('واکنش به سود', max_length=50, blank=True)
    stop_loss_adherence = models.BooleanField('پایبندی به حد ضرر', default=False)
    expectation_management = models.CharField('مدیریت انتظار', max_length=10, choices=EXPECTATION_MANAGEMENT,
                                              blank=True, null=True)
    strategy_adherence = models.BooleanField('پایبندی به استراتژی', default=False)
    capital_management_adherence = models.BooleanField('پایبندی به مدیریت سرمایه', default=False)
    over_trade = models.BooleanField('اورترید', default=False)
    emotion_after_losses = models.TextField('کنترل احساسات پس از ضرر', blank=True)

    mistake_code = models.CharField('کد اشتباه', max_length=50, blank=True)
    mistake_weight = models.DecimalField('وزن اشتباه', max_digits=3, decimal_places=2, null=True, blank=True)
    post_trade_scan = models.BooleanField('اسکن پس از معامله', default=False)
    entry_reason_written = models.BooleanField('دلیل ورود ثبت شد', default=False)
    exit_reason_written = models.BooleanField('دلیل خروج ثبت شد', default=False)
    mistakes_recorded = models.BooleanField('اشتباهات ثبت شد', default=False)
    execution_quality_score = models.IntegerField('امتیاز کیفیت اجرا', null=True, blank=True)

    fvg = models.CharField('FVG', max_length=50, blank=True, null=True)
    order_block = models.CharField('Order Block', max_length=50, blank=True, null=True)
    bos = models.CharField('BOS', max_length=50, blank=True, null=True)
    choch = models.CharField('CHOCH', max_length=50, blank=True, null=True)
    mss = models.CharField('MSS', max_length=50, blank=True, null=True)
    liquidity_sweep = models.CharField('Liquidity Sweep', max_length=50, blank=True, null=True)
    poi = models.CharField('POI', max_length=50, blank=True, null=True)
    demand_zone = models.CharField('Demand Zone', max_length=50, blank=True, null=True)
    supply_zone = models.CharField('Supply Zone', max_length=50, blank=True, null=True)

    screenshot = models.ImageField(
        'تصویر چارت',
        upload_to=screenshot_upload_path,
        blank=True,
        null=True,
        max_length=500,
        help_text='تصویر چارت معامله (حداکثر ۵ مگابایت)'
    )

    is_deleted = models.BooleanField('حذف شده', default=False)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'ترید'
        verbose_name_plural = 'تریدها'
        ordering = ['-trade_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'trade_date']),
            models.Index(fields=['symbol']),
            models.Index(fields=['group']),
            models.Index(fields=['user', 'group', 'is_deleted']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.symbol} - {self.trade_date}"

    def get_timeframes_used(self):
        timeframes = []
        if self.timeframe_d: timeframes.append('D1')
        if self.timeframe_h4: timeframes.append('H4')
        if self.timeframe_h1: timeframes.append('H1')
        if self.timeframe_m15: timeframes.append('M15')
        if self.timeframe_m5: timeframes.append('M5')
        if self.timeframe_m1: timeframes.append('M1')
        return timeframes

    def get_emotions(self):
        emotions = []
        if self.focus: emotions.append('تمرکز')
        if self.calm: emotions.append('آرامش')
        if self.excited: emotions.append('هیجان')
        if self.fear: emotions.append('ترس')
        if self.greed: emotions.append('طمع')
        if self.relaxed: emotions.append('ریلکس')
        if self.happy: emotions.append('خوشحال')
        if self.sad: emotions.append('غمگین')
        if self.energetic: emotions.append('پرانرژی')
        if self.tired: emotions.append('خسته')
        if self.fomo: emotions.append('FOMO')
        if self.patience: emotions.append('صبر')
        if self.contentment: emotions.append('قناعت')
        return emotions

    def get_checklist_items(self):
        items = []
        if self.smt_confirmed: items.append('SMT تایید شد')
        if self.key_levels_reviewed: items.append('سطوح کلیدی بررسی شد')
        if self.bond_dxy_support: items.append('حمایت BOND/DXY')
        if self.weekly_news_printed: items.append('اخبار هفتگی چاپ شد')
        if self.zero_hour_identified: items.append('ساعت صفر مشخص شد')
        if self.asian_range_identified: items.append('رنج آسیا مشخص شد')
        if self.london_range_identified: items.append('رنج لندن مشخص شد')
        if self.judas_lo_identified: items.append('Judas LO مشخص شد')
        return items


class TradeAnalytics(models.Model):
    trade = models.OneToOneField(
        Trade,
        on_delete=models.CASCADE,
        related_name='analytics',
        verbose_name='ترید'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trade_analytics',
        verbose_name='کاربر'
    )
    analysis_date = models.DateField('تاریخ تحلیل')
    actual_rr_ratio = models.DecimalField('نسبت RR واقعی', max_digits=5, decimal_places=2, null=True, blank=True)
    expected_rr_ratio = models.DecimalField('نسبت RR مورد انتظار', max_digits=5, decimal_places=2, null=True,
                                            blank=True)
    setup_quality_score = models.IntegerField('امتیاز کیفیت ستاپ', null=True, blank=True)
    execution_score = models.IntegerField('امتیاز اجرا', null=True, blank=True)
    psychology_score = models.IntegerField('امتیاز روانشناسی', null=True, blank=True)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)

    class Meta:
        verbose_name = 'تحلیل ترید'
        verbose_name_plural = 'تحلیل‌های ترید'
        ordering = ['-analysis_date']


class TradingRule(models.Model):
    RULE_CATEGORIES = [
        ('entry', 'قوانین ورود'),
        ('exit', 'قوانین خروج'),
        ('risk', 'مدیریت ریسک'),
        ('psychology', 'روانشناختی'),
        ('time', 'قوانین زمانی'),
        ('general', 'متفرقه'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trading_rules',
        verbose_name='کاربر'
    )
    portfolio = models.ForeignKey(
        'Portfolio',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rules',
        verbose_name='پورتفولیو'
    )
    rule_text = models.TextField('متن قانون')
    category = models.CharField('دسته‌بندی', max_length=20, choices=RULE_CATEGORIES, default='general')
    is_active = models.BooleanField('فعال', default=True)
    is_required = models.BooleanField('اجباری', default=True, help_text='آیا این قانون برای ثبت ترید اجباری است؟')
    order_index = models.IntegerField('ترتیب نمایش', default=0)
    created_at = models.DateTimeField('تاریخ ثبت', default=timezone.now)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'قانون معاملاتی'
        verbose_name_plural = 'قوانین معاملاتی'
        ordering = ['category', 'order_index']
        unique_together = [['user', 'rule_text']]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'category']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.rule_text[:30]}..."

    def get_category_label(self):
        return dict(self.RULE_CATEGORIES).get(self.category, self.category)


class TradeRuleCheck(models.Model):
    trade = models.ForeignKey(
        Trade,
        on_delete=models.CASCADE,
        related_name='rule_checks',
        verbose_name='ترید'
    )
    rule = models.ForeignKey(
        TradingRule,
        on_delete=models.CASCADE,
        related_name='rule_checks',
        verbose_name='قانون'
    )
    is_checked = models.BooleanField('رعایت شده', default=False)
    checked_at = models.DateTimeField('زمان بررسی', auto_now_add=True)

    class Meta:
        verbose_name = 'بررسی قانون'
        verbose_name_plural = 'بررسی‌های قوانین'
        unique_together = [['trade', 'rule']]
        indexes = [
            models.Index(fields=['trade', 'rule']),
        ]

    def __str__(self):
        return f"{self.trade.id} - {self.rule.rule_text[:20]}... - {'✅' if self.is_checked else '❌'}"


class AIConsultation(models.Model):
    DIRECTION_CHOICES = [('Buy', 'خرید'), ('Sell', 'فروش')]
    MARKET_CONDITION_CHOICES = [
        ('trending', 'رونددار'),
        ('ranging', 'رنج'),
        ('neutral', 'خنثی'),
        ('volatile', 'پرنوسان'),
    ]
    EMOTION_CHOICES = [
        ('calm', 'آرام'),
        ('excited', 'هیجان'),
        ('fear', 'ترس'),
        ('greed', 'طمع'),
        ('patient', 'صبر'),
        ('stress', 'استرس'),
        ('confident', 'بااعتمادبه‌نفس'),
        ('uncertain', 'مردد'),
    ]
    TRADE_RESULT_CHOICES = [
        ('win', 'سود'),
        ('loss', 'زیان'),
        ('breakeven', 'مساوی'),
        ('open', 'باز'),
    ]
    FOLLOW_STATUS_CHOICES = [
        ('full', 'کاملاً'),
        ('partial', 'تا حدی'),
        ('none', 'خیر'),
    ]
    HELPFULNESS_CHOICES = [
        ('very_helpful', 'بسیار مفید'),
        ('somewhat_helpful', 'نسبتاً مفید'),
        ('little_helpful', 'کم‌فایده'),
        ('not_helpful', 'بی‌فایده'),
    ]

    # ===== وضعیت پردازش =====
    STATUS_CHOICES = [
        ('pending', 'در انتظار'),
        ('processing', 'در حال پردازش'),
        ('completed', 'تکمیل شده'),
        ('failed', 'خطا'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='وضعیت پردازش مشاوره'
    )

    # ===== ارتباطات =====
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_consultations')
    trade = models.ForeignKey('Trade', on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='ai_consultations')

    # ===== ورودی کاربر =====
    symbol = models.CharField(max_length=20, db_index=True)
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    entry_price = models.DecimalField(max_digits=15, decimal_places=5)
    stop_loss = models.DecimalField(max_digits=15, decimal_places=5, null=True, blank=True)
    take_profit = models.DecimalField(max_digits=15, decimal_places=5, null=True, blank=True)
    market_condition = models.CharField(max_length=20, choices=MARKET_CONDITION_CHOICES, null=True, blank=True)
    emotion = models.CharField(max_length=20, choices=EMOTION_CHOICES, null=True, blank=True)
    time_ny = models.TimeField(null=True, blank=True, help_text="ساعت به وقت نیویورک")
    user_question = models.TextField(null=True, blank=True)

    session_type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=[('High Pro', 'حرفه‌ای'), ('Low Pro', 'مبتدی')],
        help_text="نوع جلسه معاملاتی"
    )
    strategy_type = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        choices=[('LTP', 'LTP'), ('ITP', 'ITP'), ('STP', 'STP')],
        help_text="نوع استراتژی"
    )
    timeframes = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="تایم‌فریم‌های استفاده‌شده (مثلاً: D1, H4, H1)"
    )
    risk_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="درصد ریسک از کل سرمایه"
    )
    volume = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="حجم معامله (لات)"
    )
    comparison_stats = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="آمار مقایسه با تریدهای مشابه"
    )

    # ===== فیلدهای جدید برای قیمت لحظه‌ای =====
    live_price = models.DecimalField(
        max_digits=15,
        decimal_places=5,
        null=True,
        blank=True,
        help_text="قیمت لحظه‌ای هنگام مشاوره"
    )
    price_warning = models.TextField(
        null=True,
        blank=True,
        help_text="هشدار تفاوت قیمت ورود با قیمت لحظه‌ای"
    )
    price_diff_percent = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="درصد تفاوت قیمت ورود با قیمت لحظه‌ای"
    )

    # ===== فیلد جدید برای تحلیل داخلی =====
    internal_analytics = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="تحلیل داخلی تاریخچه کاربر (نرخ برد، سود کل، بهترین استراتژی و ...)"
    )

    # ===== خروجی AI =====
    ai_score = models.IntegerField(help_text="امتیاز اعتبار ۰-۱۰۰")
    ai_response = models.JSONField(default=dict, help_text="تحلیل کامل AI")
    prompt_used = models.TextField(null=True, blank=True, help_text="پرامپت ارسال‌شده به AI")
    model_used = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="نام مدل هوش مصنوعی استفاده‌شده (مثلاً llama3.1:8b)"
    )

    # ===== وضعیت و پیگیری =====
    is_followed = models.CharField(max_length=10, choices=FOLLOW_STATUS_CHOICES, null=True, blank=True)
    trade_result = models.CharField(max_length=10, choices=TRADE_RESULT_CHOICES, null=True, blank=True)

    # ===== بازخورد =====
    feedback_score = models.IntegerField(null=True, blank=True, help_text="امتیاز ۱-۵")
    feedback_helpfulness = models.CharField(max_length=20, choices=HELPFULNESS_CHOICES, null=True, blank=True)
    feedback_comment = models.TextField(null=True, blank=True)
    feedback_given_at = models.DateTimeField(null=True, blank=True)

    # ===== زمان‌ها =====
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trading_ai_consultation'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'symbol']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ai_score']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.symbol} - {self.direction} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    def get_ai_summary(self):
        if not self.ai_response:
            return None
        return {
            'score': self.ai_score,
            'strengths': self.ai_response.get('strengths', []),
            'warnings': self.ai_response.get('warnings', []),
            'suggestion': self.ai_response.get('suggestion', ''),
            'tip': self.ai_response.get('tip', ''),
            'psychology': self.ai_response.get('psychology', ''),
            'suggested_sl': self.ai_response.get('suggested_sl', None),
            'suggested_tp': self.ai_response.get('suggested_tp', None),
            'suggested_position': self.ai_response.get('suggested_position', None),
            'suggested_timing': self.ai_response.get('suggested_timing', None),
        }

    def get_feedback_display(self):
        if self.feedback_score is None:
            return None
        return {
            'score': self.feedback_score,
            'helpfulness': dict(self.HELPFULNESS_CHOICES).get(self.feedback_helpfulness, ''),
            'comment': self.feedback_comment,
        }


class AIPromptVersion(models.Model):
    VERSION_STATUS = [
        ('draft', 'پیش‌نویس'),
        ('active', 'فعال'),
        ('archived', 'بایگانی'),
    ]

    version = models.CharField(max_length=20, unique=True)
    prompt_template = models.TextField()
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=VERSION_STATUS, default='draft')
    performance_score = models.FloatField(default=0)
    usage_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trading_ai_prompt_versions'
        ordering = ['-performance_score']

    def __str__(self):
        return f"v{self.version} - {self.status} - {self.performance_score}%"


class AIConsultationAnalytics(models.Model):
    date = models.DateField(auto_now_add=True)
    total_consultations = models.IntegerField(default=0)
    total_feedback = models.IntegerField(default=0)
    avg_score = models.FloatField(default=0)
    avg_feedback_score = models.FloatField(default=0)
    success_rate = models.FloatField(default=0)
    most_consulted_symbol = models.CharField(max_length=20, blank=True)
    most_effective_prompt = models.CharField(max_length=20, blank=True)
    details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trading_ai_analytics'
        ordering = ['-date']


# ============================================
# مدل‌های ابزارهای انضباطی (Discipline Tools)
# ============================================

class DisciplineSettings(models.Model):
    """
    تنظیمات قوانین انضباطی هر کاربر
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discipline_settings',
        verbose_name='کاربر'
    )

    # محدودیت‌های روزانه (Guardrails)
    max_trades_per_day = models.IntegerField(
        'حداکثر ترید در روز',
        default=5,
        help_text='تعداد تریدهای مجاز در هر روز'
    )
    daily_loss_limit = models.DecimalField(
        'سقف ضرر روزانه (دلار)',
        max_digits=10,
        decimal_places=2,
        default=500.00,
        help_text='حداکثر ضرر مجاز در روز'
    )
    max_loss_per_trade = models.DecimalField(
        'سقف ضرر هر ترید (دلار)',
        max_digits=10,
        decimal_places=2,
        default=100.00,
        help_text='حداکثر ضرر مجاز برای هر ترید (هشدار)'
    )
    max_contract_size = models.DecimalField(
        'حداکثر حجم هر ترید (لات)',
        max_digits=10,
        decimal_places=2,
        default=2.00,
        help_text='حداکثر حجم مجاز برای هر ترید (هشدار)'
    )

    # کول‌داون
    cooldown_consecutive_losses = models.IntegerField(
        'تعداد ضرر متوالی برای کول‌داون',
        default=2,
        help_text='پس از چند ضرر متوالی، کول‌داون فعال شود'
    )
    cooldown_duration_minutes = models.IntegerField(
        'مدت کول‌داون (دقیقه)',
        default=15,
        help_text='مدت زمان قفل شدن معاملات'
    )
    cooldown_after_daily_loss = models.BooleanField(
        'کول‌داون پس از سقف ضرر روزانه',
        default=True,
        help_text='آیا پس از رسیدن به سقف ضرر روزانه، تا پایان روز قفل شود؟'
    )
    cooldown_after_max_trades = models.BooleanField(
        'کول‌داون پس از سقف ترید',
        default=True,
        help_text='آیا پس از رسیدن به سقف ترید روزانه، تا پایان روز قفل شود؟'
    )
    manual_cooldown_minutes = models.IntegerField(
        'کول‌داون اختیاری (دقیقه)',
        default=0,
        help_text='مدت زمان کول‌داون دستی (۰ = غیرفعال)'
    )

    # چک‌لیست پیش‌از معامله (اجباری)
    pre_trade_checklist_items = models.JSONField(
        'آیتم‌های چک‌لیست',
        default=list,
        help_text='لیست آیتم‌هایی که کاربر باید قبل از ورود تیک بزند'
    )
    checklist_required = models.BooleanField(
        'چک‌لیست اجباری',
        default=True,
        help_text='آیا تکمیل چک‌لیست برای ثبت ترید الزامی است؟'
    )

    # عادات روزانه
    daily_habits = models.JSONField(
        'عادات روزانه',
        default=list,
        help_text='لیست عادت‌هایی که کاربر باید روزانه تکمیل کند'
    )

    # تنظیمات پیشرفته
    tiltmeter_weights = models.JSONField(
        'وزن‌های Tiltmeter',
        default=dict,
        help_text='وزن‌های هر بخش برای محاسبه Tiltmeter'
    )
    is_active = models.BooleanField('فعال', default=True)

    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'تنظیمات انضباطی'
        verbose_name_plural = 'تنظیمات انضباطی'
        db_table = 'trading_discipline_settings'

    def __str__(self):
        return f"تنظیمات انضباطی - {self.user.phone_number}"


class DailyDisciplineState(models.Model):
    """
    وضعیت روزانه انضباط کاربر (ذخیره در کش و دیتابیس)
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_discipline_states',
        verbose_name='کاربر'
    )
    date = models.DateField('تاریخ', auto_now_add=True)

    # آمار روزانه
    trades_today = models.IntegerField('تعداد ترید امروز', default=0)
    daily_loss = models.DecimalField('ضرر امروز', max_digits=10, decimal_places=2, default=0)
    consecutive_losses = models.IntegerField('ضرر متوالی', default=0)

    # وضعیت قفل‌ها
    is_locked_until_end_of_day = models.BooleanField('قفل تا پایان روز', default=False)
    is_cooldown_active = models.BooleanField('کول‌داون فعال', default=False)
    cooldown_until = models.DateTimeField('زمان پایان کول‌داون', null=True, blank=True)
    cooldown_reason = models.CharField('دلیل کول‌داون', max_length=100, blank=True)

    # امتیازات
    tiltmeter_score = models.DecimalField('امتیاز Tiltmeter', max_digits=5, decimal_places=2, default=0)
    compliance_rate = models.DecimalField('نرخ پایبندی', max_digits=5, decimal_places=2, default=0)

    # وضعیت عادات روزانه
    habits_completed = models.JSONField('عادات تکمیل‌شده', default=list)

    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)
    updated_at = models.DateTimeField('آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name = 'وضعیت روزانه انضباط'
        verbose_name_plural = 'وضعیت‌های روزانه انضباط'
        unique_together = [['user', 'date']]
        db_table = 'trading_daily_discipline_state'
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'is_cooldown_active']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.date}"


class DisciplineViolation(models.Model):
    """
    ثبت نقض قوانین انضباطی
    """
    VIOLATION_TYPES = [
        ('max_trades', 'بیش‌ترید'),
        ('daily_loss', 'سقف ضرر روزانه'),
        ('consecutive_loss', 'ضرر متوالی'),
        ('max_loss_per_trade', 'سقف ضرر هر ترید'),
        ('max_contract_size', 'حجم بیش از حد'),
        ('checklist_missing', 'چک‌لیست تکمیل نشده'),
        ('over_trade', 'اورترید'),
        ('emotional_trade', 'معامله احساسی'),
        ('other', 'سایر'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discipline_violations',
        verbose_name='کاربر'
    )
    trade = models.ForeignKey(
        'Trade',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='discipline_violations',
        verbose_name='ترید مرتبط'
    )
    violation_type = models.CharField('نوع نقض', max_length=30, choices=VIOLATION_TYPES)
    description = models.TextField('توضیحات', blank=True)
    severity = models.IntegerField('شدت (۱-۵)', default=1, help_text='شدت نقض')
    is_resolved = models.BooleanField('برطرف شده', default=False)

    created_at = models.DateTimeField('زمان نقض', auto_now_add=True)
    resolved_at = models.DateTimeField('زمان برطرف‌سازی', null=True, blank=True)

    class Meta:
        verbose_name = 'نقض انضباطی'
        verbose_name_plural = 'نقض‌های انضباطی'
        ordering = ['-created_at']
        db_table = 'trading_discipline_violation'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['user', 'violation_type']),
        ]

    def __str__(self):
        return f"{self.user.phone_number} - {self.get_violation_type_display()} - {self.created_at}"


class Reflection(models.Model):
    """
    بازتاب پس از ترید (Post-Trade Reflection)
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reflections',
        verbose_name='کاربر'
    )
    trade = models.ForeignKey(
        'Trade',
        on_delete=models.CASCADE,
        related_name='reflections',
        verbose_name='ترید'
    )
    followed_plan = models.BooleanField('از برنامه پیروی کردی؟', default=True)
    learned_lesson = models.TextField('چه آموختی؟', blank=True)
    emotion_after = models.CharField('احساس پس از معامله', max_length=50, blank=True)
    improvement_note = models.TextField('نکته بهبود', blank=True)
    quality_score = models.IntegerField('امتیاز کیفیت بازتاب (۱-۵)', default=3)

    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)

    class Meta:
        verbose_name = 'بازتاب'
        verbose_name_plural = 'بازتاب‌ها'
        ordering = ['-created_at']
        db_table = 'trading_reflection'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['trade']),
        ]

    def __str__(self):
        return f"بازتاب - {self.user.phone_number} - {self.trade.symbol}"


class DailyHabit(models.Model):
    """
    ردیابی عادات روزانه
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_habits',
        verbose_name='کاربر'
    )
    habit_name = models.CharField('نام عادت', max_length=100)
    habit_description = models.TextField('توضیحات', blank=True)
    is_done = models.BooleanField('انجام شد', default=False)
    date = models.DateField('تاریخ', auto_now_add=True)

    created_at = models.DateTimeField('تاریخ ثبت', auto_now_add=True)

    class Meta:
        verbose_name = 'عادت روزانه'
        verbose_name_plural = 'عادات روزانه'
        unique_together = [['user', 'habit_name', 'date']]
        db_table = 'trading_daily_habit'
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        status = '✅' if self.is_done else '❌'
        return f"{status} {self.user.phone_number} - {self.habit_name} - {self.date}"