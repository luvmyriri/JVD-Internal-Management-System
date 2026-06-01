import client from './client';
import type { Commission, TripTicket, CashBudgetRequest } from '../types';

export const commissionApi = {
  getAll: () => client.get<Commission[]>('/commissions').then((res) => res.data),
  getById: (id: number) => client.get<Commission>(`/commissions/${id}`).then((res) => res.data),
  create: (data: Partial<Commission>) => client.post<Commission>('/commissions', data).then((res) => res.data),
  update: (id: number, data: Partial<Commission>) => client.put<Commission>(`/commissions/${id}`, data).then((res) => res.data),
  delete: (id: number) => client.delete(`/commissions/${id}`).then((res) => res.data),
};

export const tripTicketApi = {
  getAll: () => client.get<TripTicket[]>('/trip-tickets').then((res) => res.data),
  getById: (id: number) => client.get<TripTicket>(`/trip-tickets/${id}`).then((res) => res.data),
  create: (data: Partial<TripTicket>) => client.post<TripTicket>('/trip-tickets', data).then((res) => res.data),
  update: (id: number, data: Partial<TripTicket>) => client.put<TripTicket>(`/trip-tickets/${id}`, data).then((res) => res.data),
  delete: (id: number) => client.delete(`/trip-tickets/${id}`).then((res) => res.data),
};

export const cashBudgetApi = {
  getAll: () => client.get<CashBudgetRequest[]>('/cash-budgets').then((res) => res.data),
  getById: (id: number) => client.get<CashBudgetRequest>(`/cash-budgets/${id}`).then((res) => res.data),
  create: (data: Partial<CashBudgetRequest>) => client.post<CashBudgetRequest>('/cash-budgets', data).then((res) => res.data),
  update: (id: number, data: Partial<CashBudgetRequest>) => client.put<CashBudgetRequest>(`/cash-budgets/${id}`, data).then((res) => res.data),
  approve: (id: number) => client.put<CashBudgetRequest>(`/cash-budgets/${id}`, { status: 'approved' }).then((res) => res.data),
  decline: (id: number) => client.delete(`/cash-budgets/${id}`).then((res) => res.data),
  delete: (id: number) => client.delete(`/cash-budgets/${id}`).then((res) => res.data),
};
