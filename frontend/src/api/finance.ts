import client from './client';
import type { Collection } from '../types';

export const collectionApi = {
  getAll: () => client.get<Collection[]>('/collections').then((res) => res.data),
  getById: (id: number) => client.get<Collection>(`/collections/${id}`).then((res) => res.data),
  create: (data: Partial<Collection>) => client.post<Collection>('/collections', data).then((res) => res.data),
  update: (id: number, data: Partial<Collection>) => client.put<Collection>(`/collections/${id}`, data).then((res) => res.data),
  delete: (id: number) => client.delete(`/collections/${id}`).then((res) => res.data),
};
