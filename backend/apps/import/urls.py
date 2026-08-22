from django.urls import path
from . import views

app_name = 'import'

urlpatterns = [
    path('csv/preview/', views.CSVPreviewView.as_view(), name='csv_preview'),
    path('csv/', views.ImportCSVView.as_view(), name='import_csv'),
    path('mappings/', views.ImportMappingView.as_view(), name='import_mappings'),
    path('mappings/<int:pk>/', views.ImportMappingDetailView.as_view(), name='import_mapping_detail'),
    path('logs/', views.ImportLogsView.as_view(), name='import_logs'),
]