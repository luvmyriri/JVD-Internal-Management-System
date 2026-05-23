import client from './client';

export const passportingApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/passport-cases', { params }),

  get: (id: number) =>
    client.get(`/passport-cases/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/passport-cases', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/passport-cases/${id}`, data),

  updateStatus: (id: number, status: string, notes?: string) =>
    client.patch(`/passport-cases/${id}/status`, { status, notes }),

  updateChecklist: (id: number, checklist: Record<string, boolean>) =>
    client.patch(`/passport-cases/${id}/checklist`, { checklist }),
    
  getAuditLogs: (id: number) =>
    client.get(`/passport-cases/${id}/audit-logs`),
};
