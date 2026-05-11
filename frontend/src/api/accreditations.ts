import client from './client';

export const accreditationApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/accreditations', { params }),

  get: (id: number) =>
    client.get(`/accreditations/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/accreditations', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/accreditations/${id}`, data),

  getExpiring: (days?: number) =>
    client.get('/accreditations/expiring', { params: { days: days || 30 } }),
};
