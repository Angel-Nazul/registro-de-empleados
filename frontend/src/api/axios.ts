import axios from 'axios';

// En desarrollo Vite proxea /api al backend (ver vite.config.ts).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el JWT guardado en localStorage a cada petición.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rrhh_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token deja de ser válido, limpiamos la sesión local.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rrhh_token');
      localStorage.removeItem('rrhh_user');
    }
    return Promise.reject(error);
  },
);

export default api;
