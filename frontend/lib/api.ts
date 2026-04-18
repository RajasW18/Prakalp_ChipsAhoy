import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL        : API_URL,
  withCredentials: true,          // Send HttpOnly JWT cookies
  timeout        : 10_000,
});

// ── Persist token to localStorage for cross-domain auth ──────────────────────
export function storeToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem('ppg_token', token);
}
export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('ppg_token');
}
export function getStoredToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('ppg_token');
  return null;
}

// ── Attach Authorization header on every request ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 &&
        err.response?.data?.code === 'TOKEN_EXPIRED' &&
        !original._retry) {
      original._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(original);
      } catch {
        clearToken();
        window.location.href = '/';  // Force re-login
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  me      : () => api.get('/auth/me'),
  logout  : () => api.post('/auth/logout'),
  setup2fa: () => api.post('/auth/2fa/setup'),
  verify2fa: (token: string) => api.post('/auth/2fa/verify', { token }),
  loginUrl: () => `${API_URL}/auth/google`,
  
  requestOtp: (email: string) => api.post('/auth/email/request-otp', { email }),
  verifyOtp : (email: string, code: string) => api.post('/auth/email/verify-otp', { email, code }),
  registerEmail: (regToken: string, name: string, phoneNumber: string) => 
                   api.post('/auth/email/register', { regToken, name, phoneNumber }),
  updateProfile: (data: any) => api.patch('/auth/profile', data),
};

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientsApi = {
  list   : ()         => api.get('/api/patients'),
  get    : (id: string) => api.get(`/api/patients/${id}`),
  create : (data: any) => api.post('/api/patients', data),
  sessions: (id: string) => api.get(`/api/patients/${id}/sessions`),
};

// ── Sessions ─────────────────────────────────────────────────────────────────
export const sessionsApi = {
  list   : ()         => api.get('/api/sessions'),
  get    : (id: string) => api.get(`/api/sessions/${id}`),
  data   : (id: string, limit = 500, cursor?: string) =>
             api.get(`/api/sessions/${id}/data`, { params: { limit, cursor } }),
  end    : (id: string) => api.patch(`/api/sessions/${id}/end`),
  exportUrl: (id: string) => `${API_URL}/api/sessions/${id}/export`,
};

// ── Devices ───────────────────────────────────────────────────────────────────
export const devicesApi = {
  list  : ()         => api.get('/api/devices'),
  link  : (data: any) => api.post('/api/devices', data),
  status: (id: string) => api.get(`/api/devices/${id}/status`),
};

// ── Consultations ─────────────────────────────────────────────────────────────
export const consultApi = {
  forSession: (sid: string)  => api.get(`/api/consult/session/${sid}`),
  forPatient: (pid: string)  => api.get(`/api/consult/patient/${pid}`),
  create    : (sid: string, data: any) => api.post(`/api/consult/${sid}`, data),
};

export default api;
