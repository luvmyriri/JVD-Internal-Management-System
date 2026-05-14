import client from './client';
import type { PaginatedResponse } from '../types/procurement';

export interface Supplier {
  id: number;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: number | null;
  accreditation_status: 'pending' | 'accredited' | 'suspended' | 'blacklisted';
  payment_terms: string | null;
  is_consignment: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  tin_number: string | null;
  purchase_orders_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
  is_consignment?: boolean;
  bank_name?: string;
  bank_account_number?: string;
  tin_number?: string;
}

export const supplierApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Supplier>>('/suppliers', { params }),

  get: (id: number) =>
    client.get<{ success: boolean; data: Supplier }>(`/suppliers/${id}`),

  create: (data: SupplierFormData) =>
    client.post<{ success: boolean; data: Supplier }>('/suppliers', data),

  update: (id: number, data: Partial<SupplierFormData>) =>
    client.put<{ success: boolean; data: Supplier }>(`/suppliers/${id}`, data),

  /** Accounting cross-checks and accredits a supplier (boss-mandated) */
  verify: (id: number) =>
    client.post<{ success: boolean; data: Supplier; message: string }>(`/suppliers/${id}/verify`),

  /** Blacklist a supplier — blocks future POs */
  blacklist: (id: number, reason: string) =>
    client.post<{ success: boolean; data: Supplier; message: string }>(`/suppliers/${id}/blacklist`, { reason }),
};
