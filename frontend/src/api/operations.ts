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
  checkConflict: (params: { date_of_travel: string; duration?: string | null; driver_id?: number | null; bus_id?: number | null; exclude_id?: number | null }) =>
    client.get<{ has_conflict: boolean; conflicts: Array<{ type: string; message: string; conflicting_ticket: any }> }>('/trip-tickets/check-conflict', { params }).then((res) => res.data),
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

export interface JournalEntryLineInput {
  account_id: number | '';
  debit: number | string;
  credit: number | string;
  description?: string;
}

export interface JournalImportResult {
  posted_count: number;
  failed_count: number;
  posted: Array<{ entry_ref: string; id: number }>;
  failed: Array<{ entry_ref: string; error: string }>;
}

export const ledgerApi = {
  getJournalEntries: (params?: any) => client.get('/accounting/journal-entries', { params }).then((res) => res.data),
  getJournalEntry: (id: number) => client.get(`/accounting/journal-entries/${id}`).then((res) => res.data),
  createJournalEntry: (payload: { date: string; notes: string; lines: JournalEntryLineInput[] }) =>
    client.post('/accounting/journal-entries', payload).then((res) => res.data),
  importJournalEntries: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client
      .post<{ success: boolean; message: string; data: JournalImportResult }>('/accounting/journal-entries/import', form)
      .then((res) => res.data);
  },
};
