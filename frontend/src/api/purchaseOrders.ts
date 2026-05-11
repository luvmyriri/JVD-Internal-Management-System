import client from './client';
import type { PurchaseOrder, PurchaseOrderFormData, PaginatedResponse } from '../types/procurement';

export const purchaseOrderApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', { params }),

  get: (id: number) =>
    client.get<{ success: boolean; data: PurchaseOrder }>(`/purchase-orders/${id}`),

  create: (data: PurchaseOrderFormData) =>
    client.post<{ success: boolean; data: PurchaseOrder }>('/purchase-orders', data),

  update: (id: number, data: Partial<PurchaseOrderFormData>) =>
    client.put<{ success: boolean; data: PurchaseOrder }>(`/purchase-orders/${id}`, data),

  submit: (id: number) =>
    client.post(`/purchase-orders/${id}/submit`),

  verify: (id: number, data: { approved: boolean; notes?: string }) =>
    client.post(`/purchase-orders/${id}/verify`, data),

  approve: (id: number, data: { approved: boolean; notes?: string }) =>
    client.post(`/purchase-orders/${id}/approve`, data),
};
