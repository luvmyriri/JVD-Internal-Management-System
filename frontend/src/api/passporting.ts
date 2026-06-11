import client from './client';

export const passportingApi = {
  list: (params?: Record<string, unknown>) =>
    client.get('/passport-cases', { params }),

  get: (id: number) =>
    client.get(`/passport-cases/${id}`),

  create: (data: Record<string, unknown>) =>
    client.post('/passport-cases', data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/passport-cases/${id}`, data),

  updateStatus: (id: number, status: string, notes?: string) =>
    client.patch(`/passport-cases/${id}/status`, { status, notes }),

  updateChecklist: (id: number, checklist: Record<string, boolean>) =>
    client.patch(`/passport-cases/${id}/checklist`, { checklist }),
    
  getAuditLogs: (id: number) =>
    client.get(`/passport-cases/${id}/audit-logs`),

  getVisaRequirements: (destination: string, passport: string = 'PH') =>
    client.post<{ success: boolean; data: any }>('/visa/requirements', { passport, destination }),

  getDocuments: (caseId: number) =>
    client.get<{ success: boolean; data: any[] }>(`/passport-cases/${caseId}/documents`),

  uploadDocument: (caseId: number, data: FormData) =>
    client.post<{ success: boolean; data: any }>(`/passport-cases/${caseId}/documents`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  deleteDocument: (caseId: number, docId: number) =>
    client.delete<{ success: boolean; message: string }>(`/passport-cases/${caseId}/documents/${docId}`),

  requestDocuments: (caseId: number, requestedDocs: string[]) =>
    client.post<{ success: boolean; link: string; message: string; email_sent_to: string; mail_error?: string }>(
      `/passport-cases/${caseId}/request-documents`,
      { requested_docs: requestedDocs }
    ),

  getPublicVisaRequest: (token: string) =>
    client.get<{
      success: boolean;
      data: {
        id: number;
        customer_name: string;
        passenger_name: string;
        destination_country: string;
        visa_type: string;
        status: string;
        requested_docs: string[];
        uploaded_docs: string[];
        case_type?: string;
      };
    }>(`/public/visa-requests/${token}`),

  uploadPublicDocument: (token: string, data: FormData) =>
    client.post<{ success: boolean; message: string; data: any }>(
      `/public/visa-requests/${token}/upload`,
      data,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
};
