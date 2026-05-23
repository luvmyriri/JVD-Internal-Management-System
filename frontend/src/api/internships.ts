import client from './client';

export interface Internship {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  school: string;
  course: string;
  hours_required: number;
  status: 'pending' | 'active' | 'completed' | 'rejected';
  documents_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const internshipsApi = {
  getAll: () => client.get<{ data: Internship[] }>('/internships').then(res => res.data),
  create: (data: Partial<Internship>) => client.post<{ data: Internship }>('/internships', data).then(res => res.data),
  update: (id: number, data: Partial<Internship>) => client.put<{ data: Internship }>(`/internships/${id}`, data).then(res => res.data),
  delete: (id: number) => client.delete(`/internships/${id}`).then(res => res.data),
};
