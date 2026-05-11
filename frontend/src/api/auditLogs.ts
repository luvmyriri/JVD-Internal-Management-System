import client from './client';

export const auditLogApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/audit-logs', { params }),

  get: (id: number) =>
    client.get(`/audit-logs/${id}`),
};
