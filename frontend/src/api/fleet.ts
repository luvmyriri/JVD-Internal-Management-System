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

  patch: (id: number, data: Partial<BusFormData & { assigned_driver: number | null }>) =>
    client.patch<{ success: boolean; data: Bus }>(`/buses/${id}`, data),

  delete: (id: number) =>
    client.delete(`/buses/${id}`),

  // NOTE: getMaintenanceHistory and getPmsStatus are intentionally removed.
  // Those backend routes (/buses/{id}/maintenance-history, /buses/{id}/pms-status)
  // do not exist in api.php or BusController. Implement backend routes before re-adding.

  getCalendar: (id: number, params?: { month?: number; year?: number }) =>
    client.get<{ success: boolean; data: any[]; bus: any }>(`/buses/${id}/calendar`, { params }),
};
