import client from './client';
import type { LoginRequest, LoginResponse, TwoFactorRequest, SetupTwoFactorResponse } from '../types/auth';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/auth/login', data),

  verifyTwoFactor: (data: TwoFactorRequest) =>
    client.post<LoginResponse>('/auth/2fa/verify', data),

  setupTwoFactor: () =>
    client.get<SetupTwoFactorResponse>('/auth/2fa/setup'),

  logout: () =>
    client.post('/auth/logout'),

  me: () =>
    client.get('/auth/me'),
};
