import axios from 'axios';

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
}

export const accreditationsApi = {
  getAll: async () => {
    const response = await axios.get('/api/accreditations');
    return response.data.data as Accreditation[];
  },

  create: async (data: Partial<Accreditation>) => {
    const response = await axios.post('/api/accreditations', data);
    return response.data as Accreditation;
  },

  update: async (id: number, data: Partial<Accreditation>) => {
    const response = await axios.put(`/api/accreditations/${id}`, data);
    return response.data as Accreditation;
  },

  generateKycLink: async (id: number) => {
    const response = await axios.post(`/api/accreditations/${id}/generate-kyc`);
    return response.data as { message: string, link: string, email_sent_to: string };
  }
};
