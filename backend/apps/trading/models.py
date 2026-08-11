# backend/apps/trading/models.py

from django.db import models
from django.utils import timezone
from django.conf import settings


def screenshot_upload_path(instance, filename):
    """مسیر ذخیره‌سازی تصویر چارت"""
    # استخراج پسوند فایل
    ext = filename.split('.')[-1] if '.' in filename else 'jpg'
    # ایجاد نام یکتا با استفاده از timestamp
    import time
    timestamp = int(time.time() * 1000)
    return f'trades/user_{instance.user.id}/{timestamp}.{ext}'


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
    """گروه‌های ترید (دسته‌بندی) - اصلاح شده با فیلدهای جدید"""

    # ============================================
    # فیلدهای اصلی
    # ============================================
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trade_groups',
        verbose_name='کاربر'
    )
    group_name = models.CharField('نام گروه', max_length=100)
    icon = models.CharField('آیکون', max_length=10, default='📁')
    description = models.TextField('توضیحات', blank=True)

    # ============================================
    # فیلدهای وضعیت
    # ============================================
    is_active = models.BooleanField('فعال', default=True)
    is_default = models.BooleanField('پیش‌فرض', default=False)

    # ============================================
    # فیلدهای سیستمی
    # ============================================
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
    """مدل اصلی ترید - اصلاح شده با group_id اجباری و فیلد screenshot"""

    TRADE_TYPES = [
        ('Buy', 'خرید'),
        ('Sell', 'فروش'),
    ]

    SESSION_TYPES = [
        ('High Pro', 'حرفه‌ای'),
        ('Low Pro', 'مبتدی'),
    ]

    SLEEP_QUALITY = [
        ('خوب', 'خوب'),
        ('متوسط', 'متوسط'),
        ('بد', 'بد'),
    ]

    BIAS_TYPES = [
        ('Bullish', 'صعودی'),
        ('Bearish', 'نزولی'),
        ('Neutral', 'خنثی'),
    ]

    STRATEGY_TYPES = [
        ('LTP', 'LTP'),
        ('ITP', 'ITP'),
        ('STP', 'STP'),
    ]

    STRESS_LEVELS = [
        ('کم', 'کم'),
        ('متوسط', 'متوسط'),
        ('زیاد', 'زیاد'),
    ]

    EMOTION_CONTROL = [
        ('بله', 'بله'),
        ('خیر', 'خیر'),
        ('متوسط', 'متوسط'),
    ]

    EXPECTATION_MANAGEMENT = [
        ('ضعیف', 'ضعیف'),
        ('متوسط', 'متوسط'),
        ('خوب', 'خوب'),
    ]

    # ============================================
    # ارتباط با کاربر و گروه (group_id اجباری)
    # ============================================
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

    # ============================================
    # شناسه و تاریخ
    # ============================================
    trade_date = models.DateField('تاریخ معامله')
    day_of_week = models.CharField('روز هفته', max_length=20, blank=True)
    month = models.IntegerField('ماه میلادی', null=True, blank=True)
    time_ny = models.TimeField('ساعت به وقت نیویورک', null=True, blank=True)

    # ============================================
    # جلسه و نماد
    # ============================================
    symbol = models.CharField('نماد', max_length=20)
    trade_type = models.CharField('نوع ترید', max_length=10, choices=TRADE_TYPES)
    session_type = models.CharField('نوع جلسه', max_length=20, choices=SESSION_TYPES, blank=True, null=True)
    weekly_profile_note = models.TextField('یادداشت پروفایل هفتگی', blank=True)

    # ============================================
    # وضعیت روحی و ذهنی
    # ============================================
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

    # ============================================
    # برنامه و بایاس روزانه
    # ============================================
    bias = models.CharField('بایاس', max_length=10, choices=BIAS_TYPES, blank=True, null=True)
    strategy_type = models.CharField('نوع استراتژی', max_length=10, choices=STRATEGY_TYPES, blank=True, null=True)

    # ============================================
    # تایم‌فریم‌ها
    # ============================================
    timeframe_d = models.BooleanField('D1', default=False)
    timeframe_h4 = models.BooleanField('H4', default=False)
    timeframe_h1 = models.BooleanField('H1', default=False)
    timeframe_m15 = models.BooleanField('M15', default=False)
    timeframe_m5 = models.BooleanField('M5', default=False)
    timeframe_m1 = models.BooleanField('M1', default=False)

    # ============================================
    # مدل ورودی و چک‌لیست
    # ============================================
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

    # ============================================
    # جزئیات اجرا
    # ============================================
    entry_price = models.DecimalField('قیمت ورود', max_digits=15, decimal_places=5, null=True, blank=True)
    stop_loss = models.DecimalField('حد ضرر', max_digits=15, decimal_places=5, null=True, blank=True)
    take_profit_1 = models.DecimalField('حد سود ۱', max_digits=15, decimal_places=5, null=True, blank=True)
    take_profit_2 = models.DecimalField('حد سود ۲', max_digits=15, decimal_places=5, null=True, blank=True)
    take_profit_3 = models.DecimalField('حد سود ۳', max_digits=15, decimal_places=5, null=True, blank=True)
    risk_usd = models.DecimalField('ریسک به دلار', max_digits=10, decimal_places=2, null=True, blank=True)
    risk_percent = models.DecimalField('درصد ریسک', max_digits=5, decimal_places=2, null=True, blank=True)
    risk_reward_ratio = models.DecimalField('نسبت ریسک به ریوارد', max_digits=5, decimal_places=2, null=True,
                                            blank=True)

    # ============================================
    # نتیجه
    # ============================================
    close_price = models.DecimalField('قیمت بسته شدن', max_digits=15, decimal_places=5, null=True, blank=True)
    tp_sl_hit = models.CharField('حد خورده شده', max_length=20, blank=True)
    profit = models.DecimalField('سود/زیان', max_digits=15, decimal_places=2, null=True, blank=True)

    # ============================================
    # احساسات حین و پس از معامله
    # ============================================
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

    # ============================================
    # بازبینی و اشتباهات
    # ============================================
    mistake_code = models.CharField('کد اشتباه', max_length=50, blank=True)
    mistake_weight = models.DecimalField('وزن اشتباه', max_digits=3, decimal_places=2, null=True, blank=True)
    post_trade_scan = models.BooleanField('اسکن پس از معامله', default=False)
    entry_reason_written = models.BooleanField('دلیل ورود ثبت شد', default=False)
    exit_reason_written = models.BooleanField('دلیل خروج ثبت شد', default=False)
    mistakes_recorded = models.BooleanField('اشتباهات ثبت شد', default=False)
    execution_quality_score = models.IntegerField('امتیاز کیفیت اجرا', null=True, blank=True)

    # ============================================
    # فیلدهای ICT
    # ============================================
    fvg = models.CharField('FVG', max_length=50, blank=True, null=True)
    order_block = models.CharField('Order Block', max_length=50, blank=True, null=True)
    bos = models.CharField('BOS', max_length=50, blank=True, null=True)
    choch = models.CharField('CHOCH', max_length=50, blank=True, null=True)
    mss = models.CharField('MSS', max_length=50, blank=True, null=True)
    liquidity_sweep = models.CharField('Liquidity Sweep', max_length=50, blank=True, null=True)
    poi = models.CharField('POI', max_length=50, blank=True, null=True)
    demand_zone = models.CharField('Demand Zone', max_length=50, blank=True, null=True)
    supply_zone = models.CharField('Supply Zone', max_length=50, blank=True, null=True)

    # ============================================
    # ✅ فیلد جدید: تصویر چارت (تغییر به ImageField)
    # ============================================
    screenshot = models.ImageField(
        'تصویر چارت',
        upload_to=screenshot_upload_path,
        blank=True,
        null=True,
        max_length=500,
        help_text='تصویر چارت معامله (حداکثر ۵ مگابایت)'
    )

    # ============================================
    # فیلدهای سیستمی
    # ============================================
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
        """دریافت لیست تایم‌فریم‌های استفاده شده"""
        timeframes = []
        if self.timeframe_d: timeframes.append('D1')
        if self.timeframe_h4: timeframes.append('H4')
        if self.timeframe_h1: timeframes.append('H1')
        if self.timeframe_m15: timeframes.append('M15')
        if self.timeframe_m5: timeframes.append('M5')
        if self.timeframe_m1: timeframes.append('M1')
        return timeframes

    def get_emotions(self):
        """دریافت لیست احساسات فعال"""
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
        """دریافت لیست آیتم‌های چک‌لیست رعایت شده"""
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
    """تحلیل تریدها برای گزارشات پیشرفته"""
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


# ============================================
# مدل‌های جدید برای قوانین معاملاتی (Trading Rules)
# ============================================

class TradingRule(models.Model):
    """قوانین معاملاتی کاربر"""
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
    rule_text = models.TextField('متن قانون')
    category = models.CharField('دسته‌بندی', max_length=20, choices=RULE_CATEGORIES, default='general')
    is_active = models.BooleanField('فعال', default=True)
    is_required = models.BooleanField('اجباری', default=True,
                                       help_text='آیا این قانون برای ثبت ترید اجباری است؟')
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
    """بررسی رعایت قوانین در هر ترید"""
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


# ============================================
# مدل‌های موجود برای AI Validator
# ============================================

class AIConsultation(models.Model):
    """
    مدل ذخیره‌سازی مشاوره‌های AI
    """
    DIRECTION_CHOICES = [
        ('Buy', 'خرید'),
        ('Sell', 'فروش'),
    ]

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

    # ===== فیلدهای جدید (اضافه شده برای مشاوره پیشرفته) =====
    session_type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=[
            ('High Pro', 'حرفه‌ای'),
            ('Low Pro', 'مبتدی'),
        ],
        help_text="نوع جلسه معاملاتی"
    )
    strategy_type = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        choices=[
            ('LTP', 'LTP'),
            ('ITP', 'ITP'),
            ('STP', 'STP'),
        ],
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

    # ===== خروجی AI =====
    ai_score = models.IntegerField(help_text="امتیاز اعتبار ۰-۱۰۰")
    ai_response = models.JSONField(default=dict, help_text="تحلیل کامل AI شامل strengths, warnings, suggestion, tip, psychology")
    prompt_used = models.TextField(null=True, blank=True, help_text="پرامپت ارسال‌شده به AI")

    # ===== ✅ فیلد جدید: مدل AI استفاده‌شده =====
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