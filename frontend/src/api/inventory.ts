import client from './client';

export const inventoryApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/inventory', { params }),

  get: (id: number) =>
    client.get(`/inventory/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/inventory', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/inventory/${id}`, data),

  delete: (id: number) =>
    client.delete(`/inventory/${id}`),

  getLowStock: () =>
    client.get('/inventory/low-stock'),
};
