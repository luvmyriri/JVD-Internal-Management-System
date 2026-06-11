import client from './client';

export interface JobApplication {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position_applied: string;
  status: 'pending' | 'interviewing' | 'hired' | 'rejected';
  resume_url: string | null;
  cover_letter_url: string | null;
  notes: string | null;
  checklist?: Record<string, boolean> | null;
  converted_user_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConvertToEmployeePayload {
  employee_id: string;
  role: string;
  department: string;
  send_invitation: boolean;
}

export const jobApplicationsApi = {
  getAll: () => client.get<{ data: JobApplication[] }>('/job-applications').then(res => res.data),
  create: (data: Partial<JobApplication>) => client.post<{ data: JobApplication }>('/job-applications', data).then(res => res.data),
  update: (id: number, data: Partial<JobApplication>) => client.put<{ data: JobApplication }>(`/job-applications/${id}`, data).then(res => res.data),
  delete: (id: number) => client.delete(`/job-applications/${id}`).then(res => res.data),
  updateChecklist: (id: number, checklist: Record<string, boolean>) => client.patch(`/job-applications/${id}/checklist`, { checklist }).then(res => res.data),
  getDocuments: (id: number) => client.get<{ data: any[] }>(`/job-applications/${id}/documents`).then(res => res.data),
  uploadDocument: (id: number, data: FormData) => client.post(`/job-applications/${id}/documents`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  deleteDocument: (id: number, documentId: number) => client.delete(`/job-applications/${id}/documents/${documentId}`).then(res => res.data),
  convertToEmployee: (id: number, data: ConvertToEmployeePayload) => client.post(`/job-applications/${id}/convert-to-employee`, data).then(res => res.data),
};
