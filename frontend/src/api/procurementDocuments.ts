import client from './client';

export interface ProcurementDocument {
  id: number;
  title: string;
  document_type: string;
  file_path: string;
  amount: number | null;
  supplier_id: number | null;
  inventory_item_id: number | null;
  driver_id: number | null;
  customer_id: number | null;
  job_order_id: number | null;
  work_order_id: number | null;
  trip_ticket_id: number | null;
  transaction_type: string | null;
  transaction_id: number | null;
  custom_metadata: Record<string, unknown>;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: number;
    company_name: string;
    contact_person: string | null;
    email: string | null;
  };
  inventory_item?: {
    id: number;
    item_name: string;
    category: string;
    unit: string;
  };
  driver?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  uploader?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  job_order?: any;
  work_order?: any;
  trip_ticket?: any;
}

export interface ProcurementDocumentFormData {
  title: string;
  document_type: string;
  file_base64?: string;
  amount?: number | null;
  supplier_id?: number | null;
  inventory_item_id?: number | null;
  driver_id?: number | null;
  customer_id?: number | null;
  job_order_id?: number | null;
  work_order_id?: number | null;
  trip_ticket_id?: number | null;
  transaction_type?: string | null;
  transaction_id?: number | null;
  custom_metadata?: Record<string, unknown>;
}

export const procurementDocumentApi = {
  list: (params?: Record<string, unknown>) =>
    client.get<{ success: boolean; data: ProcurementDocument[] }>('/procurement-documents', { params }),

  get: (id: number | string) =>
    client.get<{ success: boolean; data: ProcurementDocument }>(`/procurement-documents/${id}`),

  create: (data: ProcurementDocumentFormData) =>
    client.post<{ success: boolean; data: ProcurementDocument; message: string }>('/procurement-documents', data),

  update: (id: number | string, data: Partial<ProcurementDocumentFormData>) =>
    client.put<{ success: boolean; data: ProcurementDocument; message: string }>(`/procurement-documents/${id}`, data),

  delete: (id: number | string) =>
    client.delete<{ success: boolean; message: string }>(`/procurement-documents/${id}`),
};
