import client from './client';

export const fleetApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/fleet', { params }),

  get: (id: number) =>
    client.get(`/fleet/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/fleet', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/fleet/${id}`, data),

  delete: (id: number) =>
    client.delete(`/fleet/${id}`),

  getMaintenanceHistory: (id: number) =>
    client.get(`/fleet/${id}/maintenance-history`),

  getPmsStatus: (id: number) =>
    client.get(`/fleet/${id}/pms-status`),
};
