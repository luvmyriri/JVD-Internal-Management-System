import client from './client';
import type { LoginRequest, LoginResponse, TwoFactorRequest, ConfirmTwoFactorRequest, SetupTwoFactorResponse } from '../types/auth';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/auth/login', data),

  verifyTwoFactor: (data: TwoFactorRequest) =>
    client.post<LoginResponse>('/auth/2fa/verify', data),

  confirmTwoFactorSetup: (data: ConfirmTwoFactorRequest) =>
    client.post<LoginResponse>('/auth/2fa/setup', data),

  setupTwoFactor: () =>
    client.get<SetupTwoFactorResponse>('/auth/2fa/setup'),

  logout: () =>
    client.post('/auth/logout'),

  me: () =>
    client.get('/auth/me'),
};
