import client from './client';

export interface EducationalProgram {
  id: number;
  name: string;
  learning_objectives?: string | null;
  default_stops: string[];
  minimum_students: number;
  students_per_chaperone: number;
  students_per_tour_guide?: number;
  students_per_free_chaperone: number;
  student_price: number;
  additional_chaperone_price: number;
  additional_tour_guide_price?: number;
  includes_meals: boolean;
  includes_coordinator: boolean;
  includes_insurance: boolean;
  includes_shirt: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEducationalProgramPayload {
  name: string;
  learning_objectives?: string;
  default_stops: string[];
  minimum_students: number;
  students_per_chaperone: number;
  students_per_free_chaperone: number;
  student_price: number;
  additional_chaperone_price: number;
  includes_meals: boolean;
  includes_coordinator: boolean;
  includes_insurance: boolean;
  includes_shirt: boolean;
}

export interface EducationalPricing {
  student_count: number;
  tour_guide_count?: number;
  chaperone_count: number;
  required_tour_guides?: number;
  required_chaperones: number;
  free_tour_guide_count?: number;
  free_chaperone_count: number;
  chargeable_tour_guide_count?: number;
  chargeable_chaperone_count: number;
  student_amount: number;
  tour_guide_amount?: number;
  chaperone_amount: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface EducationalResources {
  buses: Array<{ id: number; plate_number: string; model: string; vehicle_type: string; seating_capacity: number; status: string; available: boolean }>;
  drivers: Array<{ id: number; first_name: string; last_name: string; available: boolean }>;
}

export interface EducationalBooking {
  id: number;
  reference: string;
  school_name: string;
  grade_level: string;
  starts_at: string;
  ends_at: string;
  student_count: number;
  tour_guide_count?: number;
  chaperone_count: number;
  status: string;
  program: EducationalProgram;
  vehicles: Array<{ id: number; planned_passengers: number; bus: EducationalResources['buses'][number]; driver: EducationalResources['drivers'][number] }>;
  invoice: { id: number; invoice_number: string; status: string; balance: number };
}

export const educationalTourApi = {
  programs: () => client.get('/sales/educational-programs').then(res => res.data.data as EducationalProgram[]),
  bookings: () => client.get('/sales/educational-bookings').then(res => res.data.data as EducationalBooking[]),
  resources: (startsAt: string, endsAt: string) => client.get('/sales/educational-resources', { params: { starts_at: startsAt, ends_at: endsAt } }).then(res => res.data.data as EducationalResources),
  quote: (programId: number, students: number, tourGuides: number) => client.post('/sales/educational-quote', { program_id: programId, student_count: students, tour_guide_count: tourGuides, chaperone_count: tourGuides }).then(res => res.data.data as EducationalPricing),
  createProgram: (data: CreateEducationalProgramPayload) => client.post('/sales/educational-programs', data).then(res => res.data.data as EducationalProgram),
  updateProgram: (id: number, data: CreateEducationalProgramPayload) => client.put(`/sales/educational-programs/${id}`, data).then(res => res.data.data as EducationalProgram),
  createBooking: (data: Record<string, unknown>) => client.post('/sales/educational-bookings', data).then(res => res.data.data as EducationalBooking),
};

