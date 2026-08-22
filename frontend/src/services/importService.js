// frontend/src/services/importService.js
import apiClient from './apiService';

const importService = {
  // ===== پیش‌نمایش CSV =====
  previewCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('import/csv/preview/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ===== اجرای Import =====
  importCSV: (file, columnMapping, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('column_mapping', JSON.stringify(columnMapping));
    if (options.broker_name) formData.append('broker_name', options.broker_name);
    if (options.save_mapping) formData.append('save_mapping', 'true');
    if (options.preview_only) formData.append('preview_only', 'true');
    if (options.portfolio_id) formData.append('portfolio_id', options.portfolio_id);
    if (options.group_id) formData.append('group_id', options.group_id);

    return apiClient.post('import/csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ===== دریافت نگاشت‌های ذخیره‌شده =====
  getMappings: () => apiClient.get('import/mappings/'),

  // ===== ذخیره نگاشت جدید =====
  saveMapping: (data) => apiClient.post('import/mappings/', data),

  // ===== حذف نگاشت =====
  deleteMapping: (id) => apiClient.delete(`import/mappings/${id}/`),

  // ===== دریافت تاریخچه واردات =====
  getLogs: () => apiClient.get('import/logs/'),
};

export default importService;