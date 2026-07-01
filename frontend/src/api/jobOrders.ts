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
    client.put(`/job-orders/${id}`, { status: 'confirmed' }),

  start: (id: number) =>
    client.put(`/job-orders/${id}`, { status: 'in_progress' }),

  complete: (id: number) =>
    client.put(`/job-orders/${id}`, { status: 'completed' }),

  /** Generate a Purchase Order from a Job Order */
  generatePurchaseOrder: (id: number, data: { supplier_id: number; items: { item_name: string; quantity: number; unit_price: number }[] }) =>
    client.post<{ success: boolean; data: any; message: string }>(`/job-orders/${id}/generate-purchase-order`, data),

  getAvailableSupplies: (search?: string) =>
    client.get<{ success: boolean; data: any[] }>('/job-orders/available-supplies', { params: { search } }),
};
