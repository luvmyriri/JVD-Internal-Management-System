import client from './client';

export const passengerApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/passengers', { params }),

  get: (id: number) =>
    client.get(`/passengers/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/passengers', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/passengers/${id}`, data),

  delete: (id: number) =>
    client.delete(`/passengers/${id}`),

  updateChecklist: (id: number, checklist: Record<string, boolean>) =>
    client.patch(`/passengers/${id}/checklist`, { checklist }),
};
