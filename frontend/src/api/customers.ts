import client from './client';

export const customerApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/customers', { params }),

  get: (id: number) =>
    client.get(`/customers/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/customers', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/customers/${id}`, data),

  delete: (id: number) =>
    client.delete(`/customers/${id}`),
};
