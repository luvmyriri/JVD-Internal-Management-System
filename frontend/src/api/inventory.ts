import client from './client';
import type { InventoryItem, InventoryItemFormData } from '../types/inventory';
import type { PaginatedResponse } from '../types/procurement';

export const inventoryApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<InventoryItem>>('/inventory', { params }),

  get: (id: number) =>
    client.get<{ success: boolean; data: InventoryItem }>(`/inventory/${id}`),

  create: (data: InventoryItemFormData) =>
    client.post<{ success: boolean; data: InventoryItem }>('/inventory', data),

  update: (id: number, data: Partial<InventoryItemFormData>) =>
    client.put<{ success: boolean; data: InventoryItem }>(`/inventory/${id}`, data),

  delete: (id: number) =>
    client.delete(`/inventory/${id}`),

  getLowStock: () =>
    client.get<PaginatedResponse<InventoryItem>>('/inventory', { params: { low_stock: true } }),
};
