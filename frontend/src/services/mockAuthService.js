// frontend/src/services/mockAuthService.js

// ذخیره کدهای تایید به صورت موقت در حافظه
const verificationCodes = {};

// تولید کد ۶ رقمی تصادفی
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ارسال کد تایید (شبیه‌سازی شده)
export const sendVerificationCode = async (phoneNumber) => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const code = generateCode();

  verificationCodes[phoneNumber] = {
    code: code,
    expiry: Date.now() + 120000
  };

  console.log(`📱 کد تایید برای شماره ${phoneNumber}: ${code}`);
  console.log(`⏱️ این کد تا ۲ دقیقه اعتبار دارد`);

  return {
    success: true,
    message: 'کد تایید ارسال شد',
    phoneNumber: phoneNumber,
    testCode: code
  };
};

// تایید کد (شبیه‌سازی شده)
export const verifyCode = async (phoneNumber, code) => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const record = verificationCodes[phoneNumber];

  if (!record) {
    return {
      success: false,
      error: 'کد تایید برای این شماره ارسال نشده است'
    };
  }

  if (Date.now() > record.expiry) {
    delete verificationCodes[phoneNumber];
    return {
      success: false,
      error: 'کد تایید منقضی شده است. دوباره درخواست کنید.'
    };
  }

  if (record.code !== code) {
    return {
      success: false,
      error: 'کد تایید نامعتبر است'
    };
  }

  delete verificationCodes[phoneNumber];

  // ✅ بررسی وجود کاربر در localStorage - با کلید phone
  const savedUser = localStorage.getItem('userData');
  let user = savedUser ? JSON.parse(savedUser) : null;

  // ✅ همچنین بررسی کنید که آیا کاربر با این شماره در localStorage وجود دارد
  // ممکن است کاربر با شماره متفاوت ذخیره شده باشد
  const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
  const existingUser = allUsers.find(u => u.phone === phoneNumber);

  // اگر کاربر در allUsers وجود دارد، از آن استفاده کن
  if (existingUser && !user) {
    user = existingUser;
    localStorage.setItem('userData', JSON.stringify(user));
  }

  const mockToken = 'mock-jwt-token-' + Date.now();

  // ✅ بررسی دقیق‌تر برای تشخیص کاربر جدید یا موجود
  if (user && user.phone === phoneNumber) {
    // ✅ کاربر موجود است
    return {
      success: true,
      access: mockToken,
      refresh: 'mock-refresh-token-' + Date.now(),
      is_new_user: false,  // ✅ کاربر موجود است
      user: {
        id: 1,
        phone_number: phoneNumber,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        is_verified: true,
        is_admin: false,
        subscription_status: true,
        remaining_trades: 45,
        subscription_expiry: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      message: 'ورود با موفقیت انجام شد'
    };
  } else {
    // ✅ کاربر جدید است
    return {
      success: true,
      access: mockToken,
      refresh: 'mock-refresh-token-' + Date.now(),
      is_new_user: true,  // ✅ کاربر جدید است
      user: {
        id: 2,
        phone_number: phoneNumber,
        first_name: '',
        last_name: '',
        email: '',
        is_verified: true,
        is_admin: false,
        subscription_status: false,
        remaining_trades: 0,
        subscription_expiry: null
      },
      message: 'شماره تلفن تایید شد'
    };
  }
};

// ثبت نام کاربر جدید (شبیه‌سازی شده)
export const registerUser = async (userData) => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { phone_number, first_name, last_name, email } = userData;

  // ✅ ذخیره در localStorage با فرمت استاندارد
  const newUser = {
    phone: phone_number,
    first_name: first_name,
    last_name: last_name,
    email: email || '',
    registered_at: new Date().toISOString()
  };

  // ✅ ذخیره در userData برای کاربر فعلی
  localStorage.setItem('userData', JSON.stringify(newUser));

  // ✅ ذخیره در لیست همه کاربران برای شناسایی در دفعات بعد
  const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
  // بررسی اینکه کاربر قبلاً در لیست نباشد
  const existingIndex = allUsers.findIndex(u => u.phone === phone_number);
  if (existingIndex === -1) {
    allUsers.push(newUser);
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
  } else {
    // به‌روزرسانی اطلاعات کاربر موجود
    allUsers[existingIndex] = newUser;
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
  }

  const mockToken = 'mock-jwt-token-' + Date.now();

  return {
    success: true,
    access: mockToken,
    refresh: 'mock-refresh-token-' + Date.now(),
    user: {
      id: 2,
      phone_number: phone_number,
      first_name: first_name,
      last_name: last_name,
      email: email || '',
      is_verified: true,
      is_admin: false,
      subscription_status: true,
      remaining_trades: 50,
      subscription_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    message: 'ثبت نام با موفقیت تکمیل شد'
  };
};

// ارسال مجدد کد (شبیه‌سازی شده)
export const resendVerificationCode = async (phoneNumber) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return sendVerificationCode(phoneNumber);
};

// دریافت کاربر فعلی (برای AuthContext)
export const getCurrentUser = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));

  // ✅ ابتدا از userData دریافت کن
  const savedUser = localStorage.getItem('userData');
  const user = savedUser ? JSON.parse(savedUser) : null;

  if (user) {
    return {
      id: 1,
      phone_number: user.phone,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      is_verified: true,
      is_admin: false,
      subscription_status: true,
      remaining_trades: 45,
      subscription_expiry: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // ✅ اگر userData نبود، از allUsers بررسی کن
  const token = localStorage.getItem('accessToken');
  if (token) {
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    if (allUsers.length > 0) {
      // آخرین کاربر ثبت شده را برگردان
      const lastUser = allUsers[allUsers.length - 1];
      localStorage.setItem('userData', JSON.stringify(lastUser));
      return {
        id: 1,
        phone_number: lastUser.phone,
        first_name: lastUser.first_name || '',
        last_name: lastUser.last_name || '',
        email: lastUser.email || '',
        is_verified: true,
        is_admin: false,
        subscription_status: true,
        remaining_trades: 45,
        subscription_expiry: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
  }

  return null;
};