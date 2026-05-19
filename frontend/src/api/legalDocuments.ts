import client from './client';

export const legalDocumentApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/legal-documents', { params }),

  get: (id: number) =>
    client.get(`/legal-documents/${id}`),

  create: (data: FormData) =>
    client.post('/legal-documents', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: number) =>
    client.delete(`/legal-documents/${id}`),
};
