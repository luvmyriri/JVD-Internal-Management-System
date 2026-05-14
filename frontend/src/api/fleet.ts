import client from './client';
import type { Bus, BusFormData } from '../types/inventory';
import type { PaginatedResponse } from '../types/procurement';

export const fleetApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Bus>>('/buses', { params }),

  get: (id: number) =>
    client.get<{ success: boolean; data: Bus }>(`/buses/${id}`),

  create: (data: BusFormData) =>
    client.post<{ success: boolean; data: Bus }>('/buses', data),

  update: (id: number, data: Partial<BusFormData>) =>
    client.put<{ success: boolean; data: Bus }>(`/buses/${id}`, data),

  delete: (id: number) =>
    client.delete(`/buses/${id}`),

  getMaintenanceHistory: (id: number) =>
    client.get(`/buses/${id}/maintenance-history`),

  getPmsStatus: (id: number) =>
    client.get(`/buses/${id}/pms-status`),
};
