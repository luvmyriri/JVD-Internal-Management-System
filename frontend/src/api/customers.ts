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

  // Passports
  getPassports: (id: number) => client.get(`/customers/${id}/passports`),
  addPassport: (id: number, data: Record<string, unknown>) => client.post(`/customers/${id}/passports`, data),
  deletePassport: (id: number, passportId: number) => client.delete(`/customers/${id}/passports/${passportId}`),

  // Visas
  getVisas: (id: number) => client.get(`/customers/${id}/visas`),
  addVisa: (id: number, data: Record<string, unknown>) => client.post(`/customers/${id}/visas`, data),
  deleteVisa: (id: number, visaId: number) => client.delete(`/customers/${id}/visas/${visaId}`),

  // KYCs
  getKycs: (id: number) => client.get(`/customers/${id}/kycs`),
  addKyc: (id: number, data: Record<string, unknown>) => client.post(`/customers/${id}/kycs`, data),
  deleteKyc: (id: number, kycId: number) => client.delete(`/customers/${id}/kycs/${kycId}`),

  // Tasks
  getTasks: (id: number) => client.get(`/customers/${id}/tasks`),
  addTask: (id: number, data: Record<string, unknown>) => client.post(`/customers/${id}/tasks`, data),
  updateTask: (id: number, taskId: number, data: Record<string, unknown>) => client.put(`/customers/${id}/tasks/${taskId}`, data),
  deleteTask: (id: number, taskId: number) => client.delete(`/customers/${id}/tasks/${taskId}`),

  // Emails
  sendEmail: (id: number, data: { subject: string; message: string }) => client.post(`/customers/${id}/send-email`, data),
};
