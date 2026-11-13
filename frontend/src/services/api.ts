import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('intellinet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to catch 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on a protected route, clear token
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('intellinet_token');
        localStorage.removeItem('intellinet_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
