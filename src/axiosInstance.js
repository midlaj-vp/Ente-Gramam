import axios from 'axios';

// 🟢 1. Common Axios Instance ഉണ്ടാക്കുന്നു
const api = axios.create({
  baseURL:"https://entegra.in/api/",
  withCredentials: true,
});

// 🟢 2. Response Interceptor (Auto Refresh ചെയ്യാൻ)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized വരുമ്പോൾ ഓട്ടോമാറ്റിക്കായി Refresh ചെയ്യും
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Refresh token കുക്കിയിൽ ഉള്ളതിനാൽ backend പുതുക്കി നൽകും
        await api.post('token/refresh/'); 
        return api(originalRequest); // പഴയ API request വീണ്ടും ടൈപ്പ് ചെയ്യും
      } catch (refreshError) {
        // Refresh Token-ന്റെ കാലാവധിയും കഴിഞ്ഞാൽ മാത്രം Logout ചെയ്യുക
        localStorage.removeItem('user');
        localStorage.removeItem('loggedInUser');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;