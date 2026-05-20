import client from './client';

export const userApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/users', { params }),

  get: (id: number) =>
    client.get(`/users/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/users', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/users/${id}`, data),

  deactivate: (id: number) =>
    client.patch(`/users/${id}/deactivate`),

  activate: (id: number) =>
    client.patch(`/users/${id}/activate`),

  resetPassword: (id: number) =>
    client.post(`/users/${id}/reset-password`),

  setPassword: (id: number, data: { new_password: string; new_password_confirmation: string }) =>
    client.patch(`/users/${id}/set-password`, data),
};
