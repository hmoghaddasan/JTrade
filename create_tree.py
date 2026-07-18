# create_tree.py
import os

root = "trade_journal"

# ساختار پوشه‌ها
folders = [
    # Backend folders
    "backend/trading_journal",
    "backend/apps/accounts",
    "backend/apps/subscriptions",
    "backend/apps/trading",
    "backend/apps/messaging",
    "backend/apps/admin_panel",
    "backend/media",
    "backend/static/admin",

    # Frontend folders
    "frontend/public",
    "frontend/src/config",
    "frontend/src/components/common",
    "frontend/src/components/auth",
    "frontend/src/components/dashboard",
    "frontend/src/components/trading",
    "frontend/src/components/reports",
    "frontend/src/components/messaging",
    "frontend/src/components/admin",
    "frontend/src/contexts",
    "frontend/src/hooks",
    "frontend/src/services",
    "frontend/src/styles/themes",
    "frontend/src/styles/components",
    "frontend/src/utils",
    "frontend/src/assets/images",
    "frontend/src/assets/fonts/Vazir",

    # Docker, docs and others
    "docker",
    "docs"
]

# ساختار فایل‌ها
files = [
    # Backend root files
    "backend/manage.py",
    "backend/requirements.txt",

    # Backend trading_journal config
    "backend/trading_journal/__init__.py",
    "backend/trading_journal/settings.py",
    "backend/trading_journal/urls.py",
    "backend/trading_journal/wsgi.py",
    "backend/trading_journal/asgi.py",

    # Backend apps - accounts
    "backend/apps/accounts/__init__.py",
    "backend/apps/accounts/admin.py",
    "backend/apps/accounts/apps.py",
    "backend/apps/accounts/models.py",
    "backend/apps/accounts/serializers.py",
    "backend/apps/accounts/urls.py",
    "backend/apps/accounts/views.py",
    "backend/apps/accounts/permissions.py",
    "backend/apps/accounts/authentication.py",
    "backend/apps/accounts/validators.py",
    "backend/apps/accounts/utils.py",
    "backend/apps/accounts/tasks.py",
    "backend/apps/accounts/tests.py",

    # Backend apps - subscriptions
    "backend/apps/subscriptions/__init__.py",
    "backend/apps/subscriptions/admin.py",
    "backend/apps/subscriptions/apps.py",
    "backend/apps/subscriptions/models.py",
    "backend/apps/subscriptions/serializers.py",
    "backend/apps/subscriptions/urls.py",
    "backend/apps/subscriptions/views.py",
    "backend/apps/subscriptions/payments.py",
    "backend/apps/subscriptions/sms.py",
    "backend/apps/subscriptions/tasks.py",

    # Backend apps - trading
    "backend/apps/trading/__init__.py",
    "backend/apps/trading/admin.py",
    "backend/apps/trading/apps.py",
    "backend/apps/trading/models.py",
    "backend/apps/trading/serializers.py",
    "backend/apps/trading/urls.py",
    "backend/apps/trading/views.py",
    "backend/apps/trading/analytics.py",
    "backend/apps/trading/tasks.py",

    # Backend apps - messaging
    "backend/apps/messaging/__init__.py",
    "backend/apps/messaging/admin.py",
    "backend/apps/messaging/apps.py",
    "backend/apps/messaging/models.py",
    "backend/apps/messaging/serializers.py",
    "backend/apps/messaging/urls.py",
    "backend/apps/messaging/views.py",

    # Backend apps - admin_panel
    "backend/apps/admin_panel/__init__.py",
    "backend/apps/admin_panel/admin.py",
    "backend/apps/admin_panel/apps.py",
    "backend/apps/admin_panel/models.py",
    "backend/apps/admin_panel/serializers.py",
    "backend/apps/admin_panel/urls.py",
    "backend/apps/admin_panel/views.py",
    "backend/apps/admin_panel/dashboard.py",

    # Frontend public files
    "frontend/public/index.html",
    "frontend/public/manifest.json",
    "frontend/public/robots.txt",

    # Frontend src root files
    "frontend/src/index.js",
    "frontend/src/index.css",
    "frontend/src/App.js",
    "frontend/src/App.css",

    # Frontend config
    "frontend/src/config/api.js",
    "frontend/src/config/routes.js",
    "frontend/src/config/themes.js",
    "frontend/src/config/constants.js",

    # Frontend components - common
    "frontend/src/components/common/Button.js",
    "frontend/src/components/common/Input.js",
    "frontend/src/components/common/Card.js",
    "frontend/src/components/common/Modal.js",
    "frontend/src/components/common/Toast.js",
    "frontend/src/components/common/Loading.js",
    "frontend/src/components/common/Layout.js",
    "frontend/src/components/common/Navbar.js",
    "frontend/src/components/common/Sidebar.js",
    "frontend/src/components/common/Footer.js",

    # Frontend components - auth
    "frontend/src/components/auth/Login.js",
    "frontend/src/components/auth/Register.js",
    "frontend/src/components/auth/VerifyPhone.js",
    "frontend/src/components/auth/Profile.js",
    "frontend/src/components/auth/SubscriptionRenewal.js",

    # Frontend components - dashboard
    "frontend/src/components/dashboard/Dashboard.js",
    "frontend/src/components/dashboard/UserInfo.js",
    "frontend/src/components/dashboard/SystemMessages.js",
    "frontend/src/components/dashboard/VersionInfo.js",

    # Frontend components - trading
    "frontend/src/components/trading/TradeList.js",
    "frontend/src/components/trading/TradeForm.js",
    "frontend/src/components/trading/TradeDetail.js",
    "frontend/src/components/trading/TradeAnalysis.js",
    "frontend/src/components/trading/TradeGroupManager.js",
    "frontend/src/components/trading/TradeFilters.js",
    "frontend/src/components/trading/TradePrintView.js",

    # Frontend components - reports
    "frontend/src/components/reports/ReportDashboard.js",
    "frontend/src/components/reports/PnLReport.js",
    "frontend/src/components/reports/RiskRewardReport.js",
    "frontend/src/components/reports/WeeklyPerformanceReport.js",
    "frontend/src/components/reports/ChecklistReport.js",
    "frontend/src/components/reports/PsychologyReport.js",
    "frontend/src/components/reports/MistakesReport.js",
    "frontend/src/components/reports/BiasReport.js",
    "frontend/src/components/reports/ChartComponents.js",

    # Frontend components - messaging
    "frontend/src/components/messaging/MessageList.js",
    "frontend/src/components/messaging/MessageForm.js",
    "frontend/src/components/messaging/MessageDetail.js",
    "frontend/src/components/messaging/SupportInfo.js",

    # Frontend components - admin
    "frontend/src/components/admin/AdminDashboard.js",
    "frontend/src/components/admin/UserManagement.js",
    "frontend/src/components/admin/PlanManagement.js",
    "frontend/src/components/admin/DiscountManagement.js",
    "frontend/src/components/admin/SystemMessagesManagement.js",
    "frontend/src/components/admin/MessageReplyManagement.js",
    "frontend/src/components/admin/SystemSettings.js",
    "frontend/src/components/admin/SalesReport.js",

    # Frontend contexts
    "frontend/src/contexts/AuthContext.js",
    "frontend/src/contexts/ThemeContext.js",
    "frontend/src/contexts/SubscriptionContext.js",
    "frontend/src/contexts/ToastContext.js",

    # Frontend hooks
    "frontend/src/hooks/useAuth.js",
    "frontend/src/hooks/useTheme.js",
    "frontend/src/hooks/useSubscription.js",
    "frontend/src/hooks/useTrades.js",
    "frontend/src/hooks/useReports.js",

    # Frontend services
    "frontend/src/services/apiService.js",
    "frontend/src/services/authService.js",
    "frontend/src/services/subscriptionService.js",
    "frontend/src/services/tradeService.js",
    "frontend/src/services/reportService.js",
    "frontend/src/services/messageService.js",
    "frontend/src/services/adminService.js",

    # Frontend styles
    "frontend/src/styles/global.css",
    "frontend/src/styles/themes/lightTheme.js",
    "frontend/src/styles/themes/darkTheme.js",
    "frontend/src/styles/components/buttons.css",
    "frontend/src/styles/components/forms.css",
    "frontend/src/styles/components/cards.css",
    "frontend/src/styles/components/charts.css",

    # Frontend utils
    "frontend/src/utils/validators.js",
    "frontend/src/utils/formatters.js",
    "frontend/src/utils/helpers.js",
    "frontend/src/utils/constants.js",
    "frontend/src/utils/exportHelpers.js",

    # Frontend assets - images
    "frontend/src/assets/images/logo.png",
    "frontend/src/assets/images/logo-dark.png",
    "frontend/src/assets/images/favicon.ico",
    "frontend/src/assets/images/background.jpg",
    "frontend/src/assets/images/background-mobile.jpg",
    "frontend/src/assets/images/trading-banner.jpg",
    "frontend/src/assets/images/success-icon.png",
    "frontend/src/assets/images/warning-icon.png",
    "frontend/src/assets/images/error-icon.png",
    "frontend/src/assets/images/chart-icon.png",
    "frontend/src/assets/images/report-icon.png",
    "frontend/src/assets/images/trade-icon.png",
    "frontend/src/assets/images/user-icon.png",

    # Frontend assets - fonts
    "frontend/src/assets/fonts/Vazir/Vazir-Regular.woff",
    "frontend/src/assets/fonts/Vazir/Vazir-Bold.woff",
    "frontend/src/assets/fonts/Vazir/Vazir-Light.woff",

    # Frontend package files
    "frontend/package.json",
    "frontend/package-lock.json",
    "frontend/README.md",

    # Docker files
    "docker/Dockerfile.backend",
    "docker/Dockerfile.frontend",
    "docker/docker-compose.yml",

    # Docs
    "docs/API.md",
    "docs/DATABASE.md",
    "docs/DEPLOYMENT.md",
    "docs/USER_GUIDE.md",

    # Root files
    ".env",
    ".gitignore",
    "README.md"
]


def create_structure():
    """ایجاد ساختار کامل پروژه"""

    print("🚀 شروع ایجاد ساختار پروژه...\n")

    # ایجاد پوشه root
    try:
        os.makedirs(root, exist_ok=True)
        print(f"✅ ایجاد پوشه اصلی: {root}")
    except Exception as e:
        print(f"❌ خطا در ایجاد پوشه اصلی: {e}")
        return

    # ایجاد پوشه‌ها
    print("\n📁 ایجاد پوشه‌ها:")
    for folder in folders:
        try:
            path = os.path.join(root, folder)
            os.makedirs(path, exist_ok=True)
            print(f"  ✅ {folder}")
        except Exception as e:
            print(f"  ❌ خطا در ایجاد {folder}: {e}")

    # ایجاد فایل‌ها
    print("\n📄 ایجاد فایل‌ها:")
    for file in files:
        try:
            path = os.path.join(root, file)
            # اطمینان از وجود پوشه والد
            os.makedirs(os.path.dirname(path), exist_ok=True)
            # ایجاد فایل خالی
            with open(path, 'w', encoding='utf-8') as f:
                # افزودن کامنت مناسب برای فایل‌های پایتون
                if file.endswith('.py'):
                    f.write(f'# {os.path.basename(file)}\n')
            print(f"  ✅ {file}")
        except Exception as e:
            print(f"  ❌ خطا در ایجاد {file}: {e}")

    print("\n" + "=" * 50)
    print("✅ ساختار پروژه با موفقیت ایجاد شد!")
    print(f"📍 مسیر: {os.path.abspath(root)}")
    print("=" * 50)

    # نمایش آمار
    total_folders = len(folders)
    total_files = len(files)
    print(f"\n📊 آمار:")
    print(f"  📁 تعداد پوشه‌ها: {total_folders}")
    print(f"  📄 تعداد فایل‌ها: {total_files}")
    print(f"  📦 مجموع آیتم‌ها: {total_folders + total_files}")


def show_tree():
    """نمایش ساختار درختی پروژه"""
    print("\n🌳 ساختار درختی پروژه:")
    print("trading_journal_project/")

    def print_tree(dir_path, prefix=""):
        try:
            items = sorted(os.listdir(dir_path))
            for i, item in enumerate(items):
                is_last = i == len(items) - 1
                current_prefix = "└── " if is_last else "├── "
                next_prefix = "    " if is_last else "│   "

                full_path = os.path.join(dir_path, item)
                if os.path.isdir(full_path):
                    print(f"{prefix}{current_prefix}{item}/")
                    print_tree(full_path, prefix + next_prefix)
                else:
                    print(f"{prefix}{current_prefix}{item}")
        except PermissionError:
            pass
        except Exception as e:
            print(f"{prefix}└── (خطا: {e})")

    print_tree(root)
    print()


if __name__ == "__main__":
    import sys

    # بررسی وجود پوشه
    if os.path.exists(root):
        response = input(f"⚠️  پوشه '{root}' از قبل وجود دارد. آیا می‌خواهید ادامه دهید؟ (y/n): ")
        if response.lower() != 'y':
            print("❌ عملیات لغو شد.")
            sys.exit(0)

    # ایجاد ساختار
    create_structure()

    # نمایش ساختار درختی
    show_tree()

    print("\n💡 نکات:")
    print("  - تمام فایل‌های ایجاد شده خالی هستند")
    print("  - برای فایل‌های پایتون، یک کامنت ابتدایی اضافه شده است")
    print("  - می‌توانید محتوای فایل‌ها را بر اساس نیاز خود تکمیل کنید")
    print("  - برای نصب وابستگی‌های پایتون: pip install -r backend/requirements.txt")
    print("  - برای نصب وابستگی‌های ری‌اکت: cd frontend && npm install")