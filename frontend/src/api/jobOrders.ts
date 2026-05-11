import client from './client';
import type { JobOrder, JobOrderFormData, PaginatedResponse } from '../types/procurement';

export const jobOrderApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<JobOrder>>('/job-orders', { params }),

  get: (id: number) =>
    client.get<{ success: boolean; data: JobOrder }>(`/job-orders/${id}`),

  create: (data: JobOrderFormData) =>
    client.post<{ success: boolean; data: JobOrder }>('/job-orders', data),

  update: (id: number, data: Partial<JobOrderFormData>) =>
    client.put<{ success: boolean; data: JobOrder }>(`/job-orders/${id}`, data),

  confirm: (id: number) =>
    client.post(`/job-orders/${id}/confirm`),

  complete: (id: number) =>
    client.post(`/job-orders/${id}/complete`),
};
