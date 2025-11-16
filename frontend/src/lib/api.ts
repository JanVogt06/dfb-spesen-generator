import axios from 'axios';

// Axios-Instanz mit Defaults
export const api = axios.create({
  baseURL: '',  // Leer = nutzt Vite Proxy
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request-Interceptor: Fügt JWT-Token zu jedem Request hinzu
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response-Interceptor: Behandelt Fehler global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
