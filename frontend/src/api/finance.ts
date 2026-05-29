import client from './client';
import type { Collection } from '../types';

export const collectionApi = {
  getAll: (params?: { search?: string; status?: string }) => client.get<{data: Collection[], stats: any}>('/collections', { params }).then((res) => res.data),
  getById: (id: number) => client.get<Collection>(`/collections/${id}`).then((res) => res.data),
  create: (data: Partial<Collection>) => client.post<Collection>('/collections', data).then((res) => res.data),
  update: (id: number, data: Partial<Collection>) => client.put<Collection>(`/collections/${id}`, data).then((res) => res.data),
  delete: (id: number) => client.delete(`/collections/${id}`).then((res) => res.data),
  addPayment: (id: number, data: any) => client.post(`/collections/${id}/add-payment`, data).then((res) => res.data),
  updateRemarks: (id: number, remarks: string) => client.patch(`/collections/${id}/remarks`, { remarks }).then((res) => res.data),
  confirm: (id: number) => client.post(`/collections/${id}/confirm`).then((res) => res.data),
};
