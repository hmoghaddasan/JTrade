// frontend/src/services/messageService.js
import apiService from './apiService';

/**
 * دریافت پیام‌های سیستم
 */
export const getSystemMessages = async () => {
  try {
    const response = await apiService.get('/system/messages/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در دریافت پیام‌های سیستم',
    };
  }
};

/**
 * دریافت پیام‌های کاربر
 */
export const getUserMessages = async () => {
  try {
    const response = await apiService.get('/messages/user/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در دریافت پیام‌ها',
    };
  }
};

/**
 * ارسال پیام جدید
 */
export const sendUserMessage = async (data) => {
  try {
    const response = await apiService.post('/messages/user/', {
      subject: data.subject,
      message: data.message,
    });
    return {
      success: true,
      data: response.data,
      message: 'پیام با موفقیت ارسال شد',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در ارسال پیام',
    };
  }
};

/**
 * علامت‌گذاری پیام به عنوان خوانده شده
 */
export const markMessageAsRead = async (id) => {
  try {
    await apiService.patch(`/messages/user/${id}/read/`);
    return {
      success: true,
      message: 'پیام خوانده شد',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در علامت‌گذاری پیام',
    };
  }
};

/**
 * دریافت اطلاعات پشتیبانی
 */
export const getSupportInfo = async () => {
  try {
    const response = await apiService.get('/messages/support/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در دریافت اطلاعات پشتیبانی',
    };
  }
};

/**
 * حذف پیام
 */
export const deleteUserMessage = async (id) => {
  try {
    await apiService.delete(`/messages/user/${id}/`);
    return {
      success: true,
      message: 'پیام با موفقیت حذف شد',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'خطا در حذف پیام',
    };
  }
};