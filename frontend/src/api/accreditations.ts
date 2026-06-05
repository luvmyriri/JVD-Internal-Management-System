import client from './client';
import type { PaginatedResponse } from '../types/procurement';

export interface Accreditation {
  id: number;
  entity_type: string;
  entity_id: number;
  entity_name: string;
  accreditation_type: string;
  issuing_body: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: 'active' | 'expired' | 'pending_renewal';
  document_url: string | null;
  nda_document_url: string | null;
  terms_document_url: string | null;
  kyc_document_url: string | null;
  contact_person: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
  custom_documents?: { name: string; key: string; url: string | null; status: string }[];
}

export const accreditationsApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<PaginatedResponse<Accreditation>>('/accreditations', { params }),

  create: (data: Partial<Accreditation>) =>
    client.post<{ success: boolean; data: Accreditation }>('/accreditations', data),

  update: (id: number, data: Partial<Accreditation>) =>
    client.put<{ success: boolean; data: Accreditation }>(`/accreditations/${id}`, data),

  generateKycLink: (id: number) =>
    client.post<{ message: string, link: string, email_sent_to: string }>(`/accreditations/${id}/generate-kyc`),

  uploadDocument: (id: number, type: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<{ success: boolean, url: string, message: string }>(
      `/accreditations/${id}/documents/${type}`, 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  }
};
