import client from './client';

export const passportingApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/passporting', { params }),

  get: (id: number) =>
    client.get(`/passporting/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/passporting', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/passporting/${id}`, data),

  updateStatus: (id: number, status: string, notes?: string) =>
    client.patch(`/passporting/${id}/status`, { status, notes }),

  updateChecklist: (id: number, checklist: Record<string, boolean>) =>
    client.patch(`/passporting/${id}/checklist`, { checklist }),
};
