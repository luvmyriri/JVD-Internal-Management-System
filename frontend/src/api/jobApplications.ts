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
  created_at: string;
  updated_at: string;
}

export const jobApplicationsApi = {
  getAll: () => client.get<{ data: JobApplication[] }>('/job-applications').then(res => res.data),
  create: (data: Partial<JobApplication>) => client.post<{ data: JobApplication }>('/job-applications', data).then(res => res.data),
  update: (id: number, data: Partial<JobApplication>) => client.put<{ data: JobApplication }>(`/job-applications/${id}`, data).then(res => res.data),
  delete: (id: number) => client.delete(`/job-applications/${id}`).then(res => res.data),
};
