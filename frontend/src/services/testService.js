// frontend/src/services/testService.js
console.log('✅ testService loaded!');

export const testApi = () => {
  console.log('✅ testApi called!');
  return fetch('http://localhost:8000/api/admin/dashboard/', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  .then(res => res.json())
  .then(data => console.log('✅ Dashboard data:', data))
  .catch(err => console.error('❌ Error:', err));
};

// برای دسترسی در کنسول
window.testApi = testApi;