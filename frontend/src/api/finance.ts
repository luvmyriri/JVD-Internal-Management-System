import client from './client';
import type { Collection } from '../types';

export const collectionApi = {
  getAll: (params?: { search?: string; status?: string; date_from?: string; date_to?: string }) => client.get<{data: Collection[], stats: any}>('/collections', { params }).then((res) => res.data),
  getById: (id: number) => client.get<Collection>(`/collections/${id}`).then((res) => res.data),
  create: (data: Partial<Collection>) => client.post<Collection>('/collections', data).then((res) => res.data),
  update: (id: number, data: Partial<Collection>) => client.put<Collection>(`/collections/${id}`, data).then((res) => res.data),
  delete: (id: number) => client.delete(`/collections/${id}`).then((res) => res.data),
  addPayment: (id: number, data: any) => client.post(`/collections/${id}/add-payment`, data).then((res) => res.data),
  updateRemarks: (id: number, remarks: string) => client.patch(`/collections/${id}/remarks`, { remarks }).then((res) => res.data),
  confirm: (id: number) => client.post(`/collections/${id}/confirm`).then((res) => res.data),
  cancelAndRefund: (id: number, reason?: string) => client.post(`/collections/${id}/cancel-refund`, { reason }).then((res) => res.data),
  approveAdjustment: (id: number) => client.post(`/sales/order-adjustments/${id}/approve`).then((res) => res.data),
  requestRefund: (creditNoteId: number, data: { amount: number; refund_method: string; reason: string }) => client.post(`/sales/credit-notes/${creditNoteId}/refunds`, data).then((res) => res.data),
  approveRefund: (id: number) => client.post(`/sales/refunds/${id}/approve`).then((res) => res.data),
  processApprovedRefund: (id: number, destination_reference?: string) => client.post(`/sales/refunds/${id}/process`, { destination_reference }).then((res) => res.data),
  sendSoa: (id: number) => client.post(`/collections/${id}/send-soa`).then((res) => res.data),
  /** Opens the SOA inline in a new browser tab — returns the full backend URL to open directly */
  getSoaViewUrl: (id: number): string => `${client.defaults.baseURL}/collections/${id}/view-soa`,
  /** Force-downloads the SOA PDF as a file attachment */
  downloadSoa: (id: number) => client.get(`/collections/${id}/download-soa`, { responseType: 'blob' }).then((res) => res.data),
};

