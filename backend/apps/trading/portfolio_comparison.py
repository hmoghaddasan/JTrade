# backend/apps/trading/portfolio_comparison.py

import math
from decimal import Decimal
from datetime import datetime, timedelta
from django.db.models import Sum, Avg, Count, Q
from .models import Portfolio, Trade


class PortfolioComparisonEngine:
    """
    موتور محاسبه شاخص‌های مقایسه‌ای بین پورتفولیوها
    """

    def __init__(self, user, start_date=None, end_date=None):
        self.user = user
        self.start_date = start_date
        self.end_date = end_date
        self.portfolios = Portfolio.objects.filter(user=user, is_active=True)

    def _get_trades_for_portfolio(self, portfolio):
        """دریافت تریدهای یک پورتفولیو با فیلتر تاریخ"""
        trades = portfolio.trades.filter(is_deleted=False)
        if self.start_date:
            trades = trades.filter(trade_date__gte=self.start_date)
        if self.end_date:
            trades = trades.filter(trade_date__lte=self.end_date)
        return trades

    def _calculate_metrics_for_trades(self, trades):
        """محاسبه شاخص‌های یک مجموعه ترید"""
        total_trades = trades.count()
        if total_trades == 0:
            return self._empty_metrics()

        winning_trades = trades.filter(profit__gt=0)
        losing_trades = trades.filter(profit__lt=0)

        win_count = winning_trades.count()
        loss_count = losing_trades.count()
        breakeven_count = trades.filter(profit=0).count()

        total_profit = float(trades.aggregate(Sum('profit'))['profit__sum'] or 0)
        total_loss = float(abs(losing_trades.aggregate(Sum('profit'))['profit__sum'] or 0))

        avg_profit = float(winning_trades.aggregate(Avg('profit'))['profit__avg'] or 0)
        avg_loss = float(abs(losing_trades.aggregate(Avg('profit'))['profit__avg'] or 0))

        profit_factor = (total_profit / total_loss) if total_loss > 0 else (999 if total_profit > 0 else 0)

        win_rate = (win_count / total_trades * 100) if total_trades > 0 else 0

        avg_rr = float(trades.filter(risk_reward_ratio__isnull=False).aggregate(
            Avg('risk_reward_ratio')
        )['risk_reward_ratio__avg'] or 0)

        # محاسبه حداکثر افت
        cumulative = []
        running = 0
        for trade in trades.order_by('trade_date', 'created_at'):
            running += float(trade.profit or 0)
            cumulative.append(running)
        max_drawdown = 0
        if cumulative:
            peak = cumulative[0]
            for value in cumulative:
                if value > peak:
                    peak = value
                drawdown = ((peak - value) / abs(peak)) * 100 if peak != 0 else 0
                if drawdown > max_drawdown:
                    max_drawdown = drawdown

        # امید ریاضی (Expectancy)
        expectancy = 0
        if total_trades > 0:
            expectancy = (avg_profit * (win_count / total_trades)) - (
                        avg_loss * (loss_count / total_trades)) if loss_count > 0 and avg_loss > 0 else (
                        avg_profit * (win_count / total_trades))

        return {
            'total_trades': total_trades,
            'win_count': win_count,
            'loss_count': loss_count,
            'breakeven_count': breakeven_count,
            'win_rate': round(win_rate, 1),
            'total_profit': total_profit,
            'total_loss': total_loss,
            'avg_profit': avg_profit,
            'avg_loss': avg_loss,
            'profit_factor': round(profit_factor, 2),
            'avg_rr': round(avg_rr, 2),
            'max_drawdown': round(max_drawdown, 1),
            'expectancy': round(expectancy, 2),
        }

    def _empty_metrics(self):
        """شاخص‌های خالی برای پورتفولیوی بدون ترید"""
        return {
            'total_trades': 0,
            'win_count': 0,
            'loss_count': 0,
            'breakeven_count': 0,
            'win_rate': 0,
            'total_profit': 0,
            'total_loss': 0,
            'avg_profit': 0,
            'avg_loss': 0,
            'profit_factor': 0,
            'avg_rr': 0,
            'max_drawdown': 0,
            'expectancy': 0,
        }

    def get_portfolio_metrics(self, portfolio):
        """دریافت شاخص‌های یک پورتفولیو"""
        trades = self._get_trades_for_portfolio(portfolio)
        metrics = self._calculate_metrics_for_trades(trades)
        return {
            'id': portfolio.id,
            'name': portfolio.name,
            'icon': portfolio.icon,
            'is_default': portfolio.is_default,
            'initial_balance': float(portfolio.initial_balance),
            'current_balance': float(portfolio.get_current_balance()),
            **metrics
        }

    def get_all_portfolios_metrics(self):
        """دریافت شاخص‌های همه پورتفولیوها"""
        result = []
        for portfolio in self.portfolios:
            result.append(self.get_portfolio_metrics(portfolio))
        return result

    def get_combined_metrics(self):
        """دریافت شاخص‌های ترکیبی همه پورتفولیوها"""
        all_trades = Trade.objects.filter(
            user=self.user,
            is_deleted=False
        )
        if self.start_date:
            all_trades = all_trades.filter(trade_date__gte=self.start_date)
        if self.end_date:
            all_trades = all_trades.filter(trade_date__lte=self.end_date)

        metrics = self._calculate_metrics_for_trades(all_trades)
        total_balance = 0
        for p in self.portfolios:
            total_balance += float(p.get_current_balance())

        return {
            'total_portfolios': self.portfolios.count(),
            'total_balance': total_balance,
            **metrics
        }

    def get_ranking(self, sort_by='total_profit'):
        """رتبه‌بندی پورتفولیوها بر اساس شاخص مشخص"""
        metrics_list = self.get_all_portfolios_metrics()
        valid_metrics = [m for m in metrics_list if m['total_trades'] > 0]
        if not valid_metrics:
            return []

        sorted_metrics = sorted(valid_metrics, key=lambda x: x.get(sort_by, 0), reverse=True)
        for idx, item in enumerate(sorted_metrics):
            item['rank'] = idx + 1

        return sorted_metrics

    def get_best_and_worst(self):
        """دریافت بهترین و بدترین پورتفولیو از نظر سود"""
        metrics_list = self.get_all_portfolios_metrics()
        valid_metrics = [m for m in metrics_list if m['total_trades'] > 0]

        if not valid_metrics:
            return {'best': None, 'worst': None}

        best = max(valid_metrics, key=lambda x: x['total_profit'])
        worst = min(valid_metrics, key=lambda x: x['total_profit'])

        return {'best': best, 'worst': worst}

    def get_most_active(self):
        """دریافت پرتراکنش‌ترین پورتفولیو"""
        metrics_list = self.get_all_portfolios_metrics()
        valid_metrics = [m for m in metrics_list if m['total_trades'] > 0]

        if not valid_metrics:
            return None

        return max(valid_metrics, key=lambda x: x['total_trades'])

    def get_highest_win_rate(self):
        """دریافت پورتفولیو با بالاترین نرخ برد"""
        metrics_list = self.get_all_portfolios_metrics()
        valid_metrics = [m for m in metrics_list if m['total_trades'] > 5]

        if not valid_metrics:
            return None

        return max(valid_metrics, key=lambda x: x['win_rate'])

    def get_comparison_data(self):
        """دریافت داده‌های کامل مقایسه برای نمودارها و جدول"""
        all_metrics = self.get_all_portfolios_metrics()
        combined = self.get_combined_metrics()
        ranking = self.get_ranking()
        best_worst = self.get_best_and_worst()
        most_active = self.get_most_active()
        highest_win_rate = self.get_highest_win_rate()

        return {
            'portfolios': all_metrics,
            'combined': combined,
            'ranking': ranking,
            'best': best_worst.get('best'),
            'worst': best_worst.get('worst'),
            'most_active': most_active,
            'highest_win_rate': highest_win_rate,
        }

    def get_chart_data(self, chart_type='cumulative_pnl'):
        """دریافت داده‌های نمودار مقایسه‌ای"""
        if chart_type == 'cumulative_pnl':
            return self._get_cumulative_pnl_data()
        elif chart_type == 'radar':
            return self._get_radar_data()
        elif chart_type == 'bar':
            return self._get_bar_data()
        else:
            return []

    def _get_cumulative_pnl_data(self):
        """داده‌های نمودار سود تجمعی برای هر پورتفولیو"""
        result = []

        all_trades = Trade.objects.filter(
            user=self.user,
            is_deleted=False,
            portfolio__isnull=False
        ).select_related('portfolio')

        if self.start_date:
            all_trades = all_trades.filter(trade_date__gte=self.start_date)
        if self.end_date:
            all_trades = all_trades.filter(trade_date__lte=self.end_date)

        portfolio_trades = {}
        for trade in all_trades.order_by('trade_date', 'created_at'):
            p_id = trade.portfolio_id
            if p_id not in portfolio_trades:
                portfolio_trades[p_id] = []
            portfolio_trades[p_id].append(trade)

        for p in self.portfolios:
            trades = portfolio_trades.get(p.id, [])
            cumulative = []
            running = 0
            for trade in trades:
                running += float(trade.profit or 0)
                cumulative.append({
                    'date': trade.trade_date.isoformat(),
                    'profit': round(running, 2)
                })

            if cumulative:
                result.append({
                    'portfolio_id': p.id,
                    'portfolio_name': p.name,
                    'portfolio_icon': p.icon,
                    'data': cumulative
                })

        return result

    def _get_radar_data(self):
        """داده‌های نمودار راداری برای هر پورتفولیو"""
        result = []
        metrics_list = self.get_all_portfolios_metrics()

        for m in metrics_list:
            if m['total_trades'] == 0:
                continue

            max_profit = max([x['total_profit'] for x in metrics_list if x['total_trades'] > 0]) or 1
            max_win_rate = max([x['win_rate'] for x in metrics_list if x['total_trades'] > 0]) or 1
            max_profit_factor = max([x['profit_factor'] for x in metrics_list if x['total_trades'] > 0]) or 1
            max_avg_rr = max([x['avg_rr'] for x in metrics_list if x['total_trades'] > 0]) or 1

            normalized = {
                'سودآوری': min(100, (m['total_profit'] / max_profit) * 100) if max_profit > 0 else 0,
                'نرخ برد': m['win_rate'],
                'فاکتور سود': min(100, (m['profit_factor'] / max_profit_factor) * 100) if max_profit_factor > 0 else 0,
                'میانگین R:R': min(100, (m['avg_rr'] / max_avg_rr) * 100) if max_avg_rr > 0 else 0,
                'کاهش ریسک': max(0, 100 - (m['max_drawdown'] * 2)) if m['max_drawdown'] else 100,
            }

            result.append({
                'portfolio_id': m['id'],
                'portfolio_name': m['name'],
                'portfolio_icon': m['icon'],
                'metrics': normalized
            })

        return result

    def _get_bar_data(self):
        """داده‌های نمودار میله‌ای مقایسه شاخص‌ها"""
        metrics_list = self.get_all_portfolios_metrics()
        result = []

        for m in metrics_list:
            if m['total_trades'] == 0:
                continue

            result.append({
                'portfolio_id': m['id'],
                'portfolio_name': m['name'],
                'total_profit': m['total_profit'],
                'win_rate': m['win_rate'],
                'profit_factor': m['profit_factor'],
                'avg_rr': m['avg_rr'],
                'total_trades': m['total_trades'],
                'max_drawdown': m['max_drawdown'],
            })

        return result