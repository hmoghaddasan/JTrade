# backend/apps/trading/comparison_serializers.py

from rest_framework import serializers


class PortfolioMetricsSerializer(serializers.Serializer):
    """
    سریالایزر شاخص‌های یک پورتفولیو برای مقایسه
    """
    id = serializers.IntegerField()
    name = serializers.CharField()
    icon = serializers.CharField()
    is_default = serializers.BooleanField()
    initial_balance = serializers.FloatField()
    current_balance = serializers.FloatField()
    total_trades = serializers.IntegerField()
    win_count = serializers.IntegerField()
    loss_count = serializers.IntegerField()
    breakeven_count = serializers.IntegerField()
    win_rate = serializers.FloatField()
    total_profit = serializers.FloatField()
    total_loss = serializers.FloatField()
    avg_profit = serializers.FloatField()
    avg_loss = serializers.FloatField()
    profit_factor = serializers.FloatField()
    avg_rr = serializers.FloatField()
    max_drawdown = serializers.FloatField()
    expectancy = serializers.FloatField()


class CombinedMetricsSerializer(serializers.Serializer):
    """
    سریالایزر شاخص‌های ترکیبی همه پورتفولیوها
    """
    total_portfolios = serializers.IntegerField()
    total_balance = serializers.FloatField()
    total_trades = serializers.IntegerField()
    win_count = serializers.IntegerField()
    loss_count = serializers.IntegerField()
    breakeven_count = serializers.IntegerField()
    win_rate = serializers.FloatField()
    total_profit = serializers.FloatField()
    total_loss = serializers.FloatField()
    avg_profit = serializers.FloatField()
    avg_loss = serializers.FloatField()
    profit_factor = serializers.FloatField()
    avg_rr = serializers.FloatField()
    max_drawdown = serializers.FloatField()
    expectancy = serializers.FloatField()


class BestWorstSerializer(serializers.Serializer):
    """
    سریالایزر بهترین و بدترین پورتفولیو
    """
    id = serializers.IntegerField()
    name = serializers.CharField()
    icon = serializers.CharField()
    total_profit = serializers.FloatField()
    win_rate = serializers.FloatField()
    total_trades = serializers.IntegerField()


class ComparisonSummarySerializer(serializers.Serializer):
    """
    سریالایزر خلاصه مقایسه پورتفولیوها
    """
    best = BestWorstSerializer(allow_null=True)
    worst = BestWorstSerializer(allow_null=True)
    most_active = BestWorstSerializer(allow_null=True)
    highest_win_rate = BestWorstSerializer(allow_null=True)


class ComparisonDataSerializer(serializers.Serializer):
    """
    سریالایزر داده‌های کامل مقایسه پورتفولیوها
    """
    portfolios = PortfolioMetricsSerializer(many=True)
    combined = CombinedMetricsSerializer()
    best = BestWorstSerializer(allow_null=True)
    worst = BestWorstSerializer(allow_null=True)
    most_active = BestWorstSerializer(allow_null=True)
    highest_win_rate = BestWorstSerializer(allow_null=True)


class CumulativePnLPointSerializer(serializers.Serializer):
    """
    سریالایزر نقطه نمودار سود تجمعی
    """
    date = serializers.CharField()
    profit = serializers.FloatField()


class CumulativePnLSeriesSerializer(serializers.Serializer):
    """
    سریالایزر سری نمودار سود تجمعی
    """
    portfolio_id = serializers.IntegerField()
    portfolio_name = serializers.CharField()
    portfolio_icon = serializers.CharField()
    data = CumulativePnLPointSerializer(many=True)


class RadarMetricsSerializer(serializers.Serializer):
    """
    سریالایزر داده‌های نمودار راداری
    """
    portfolio_id = serializers.IntegerField()
    portfolio_name = serializers.CharField()
    portfolio_icon = serializers.CharField()
    metrics = serializers.DictField()


class BarDataItemSerializer(serializers.Serializer):
    """
    سریالایزر آیتم نمودار میله‌ای
    """
    portfolio_id = serializers.IntegerField()
    portfolio_name = serializers.CharField()
    total_profit = serializers.FloatField()
    win_rate = serializers.FloatField()
    profit_factor = serializers.FloatField()
    avg_rr = serializers.FloatField()
    total_trades = serializers.IntegerField()
    max_drawdown = serializers.FloatField()