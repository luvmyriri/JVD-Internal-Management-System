import client from './client';
import type { LoginRequest, LoginResponse, TwoFactorRequest, ConfirmTwoFactorRequest, SetupTwoFactorResponse } from '../types/auth';

export const authApi = {
  // Initialize CSRF protection for Sanctum
  getCsrfCookie: () => client.get('/sanctum/csrf-cookie', { baseURL: window.location.origin }),

  login: async (data: LoginRequest) => {
    await authApi.getCsrfCookie();
    return client.post<LoginResponse>('/auth/login', data);
  },

  verifyTwoFactor: (data: TwoFactorRequest) =>
    client.post<LoginResponse>('/auth/2fa/verify', data),

  confirmSetup: (data: ConfirmTwoFactorRequest) =>
    client.post<LoginResponse>('/auth/2fa/setup', data),

  setupTwoFactor: () =>
    client.get<SetupTwoFactorResponse>('/auth/2fa/setup'),

  logout: () =>
    client.post('/auth/logout'),

  me: () =>
    client.get('/auth/me'),

  setPassword: (data: any) =>
    client.post('/auth/set-password', data),

  changePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    client.post('/auth/change-password', data),
};
