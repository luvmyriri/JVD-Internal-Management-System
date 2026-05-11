import client from './client';
import type { WorkOrder, WorkOrderFormData, PaginatedResponse } from '../types/procurement';

export const workOrderApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<WorkOrder>>('/work-orders', { params }),

  get: (id: number) =>
    client.get<{ success: boolean; data: WorkOrder }>(`/work-orders/${id}`),

  create: (data: WorkOrderFormData) =>
    client.post<{ success: boolean; data: WorkOrder }>('/work-orders', data),

  update: (id: number, data: Partial<WorkOrderFormData>) =>
    client.put<{ success: boolean; data: WorkOrder }>(`/work-orders/${id}`, data),

  complete: (id: number, data: { parts_used?: string; cost?: number }) =>
    client.post(`/work-orders/${id}/complete`, data),
};
