import client from './client';

export interface ItineraryDayInput {
  day_number: number;
  date?: string;
  location?: string;
  activity_description?: string;
  meal_plan?: string;
  accommodation_name?: string;
  check_in_time?: string;
  check_out_time?: string;
}

export interface PassengerInput {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  passport_number?: string;
  dietary_restrictions?: string;
  emergency_contact?: string;
  special_needs?: string;
}

export interface CustomTransactionDetailInput {
  category: string;
  passport_case_id?: number;
  vehicle_type?: string;
  route?: string;
  rental_days?: number;
  plate_number?: string;
  inclusion_driver?: boolean;
  inclusion_fuel?: boolean;
  inclusion_toll?: boolean;
  inclusion_insurance?: boolean;
  school_name?: string;
  grade_level?: string;
  expected_pax?: number;
  itinerary_stops?: string;
  edu_inclusion_meals?: boolean;
  edu_inclusion_coordinator?: boolean;
  edu_inclusion_insurance?: boolean;
  edu_inclusion_tshirt?: boolean;
  destination?: string;
  accommodation_type?: string;
  visa_country?: string;
  visa_type?: string;
  visa_req_passport?: boolean;
  visa_req_photo?: boolean;
  visa_req_bank_cert?: boolean;
  visa_req_itr?: boolean;
  visa_req_birth_cert?: boolean;
  joiner_tour_code?: string;
  booking_type?: string;
  booking_reference_code?: string;
  booking_details?: string;
  category_meta?: Record<string, any>;
  additional_remarks?: string;
}

export interface ContractDraftPayload {
  customer_id?: number | null;
  customer_name?: string;
  customer_address?: string;
  customer_email?: string;
  customer_contact?: string;
  payment_method: string;
  payment_type?: string;
  amount_received?: number;
  tax_rate?: number;
  due_date?: string;
  travel_date?: string;
  arrival_datetime?: string;
  departure_datetime?: string;
  pickup_location?: string;
  tour_code?: string;
  pax_count?: number;
  bus_id?: number | null;
  driver_id?: number | null;
  seat_map?: any;
  notes?: string;
  items: { service_id?: number | null; passport_case_id?: number; item_name?: string; service_type?: string; item_description?: string; item_metadata?: Record<string, unknown>; quantity: number; unit_price?: number; adults?: number; children?: number; adult_price?: number; child_price?: number; service_date?: string; destination?: string }[];
  custom_transaction_detail: CustomTransactionDetailInput;
  itinerary?: ItineraryDayInput[];
  passengers?: PassengerInput[];
}

export const contractsApi = {
  list: (params?: { status?: string; invoice_id?: number; per_page?: number }) => client.get('/contracts', { params }),
  get: (id: number) => client.get(`/contracts/${id}`),
  draft: (data: ContractDraftPayload) => client.post('/contracts/draft', data),
  updateDraft: (id: number, data: { terms_snapshot?: string; deposit_required_percent?: number; deposit_required_amount?: number; cancellation_policy_key?: string }) =>
    client.patch(`/contracts/${id}`, data),
  attachPaymentSchedule: (id: number, data: { mode: 'auto' | 'manual'; count?: number; first_due_date?: string; interval_days?: number; rows?: { due_date: string; amount_due: number }[] }) =>
    client.post(`/contracts/${id}/payment-schedule`, data),
  sendForSignature: (id: number) => client.post(`/contracts/${id}/send`),
  signAtCounter: (id: number, data: { signature_image: string; signature_typed_name: string }) =>
    client.post(`/contracts/${id}/sign`, data),
  void: (id: number) => client.post(`/contracts/${id}/void`),
  pdfUrl: (id: number) => `${client.defaults.baseURL ?? ''}/contracts/${id}/pdf`,
};

export const customerPortalApi = {
  verify: (token: string) => client.get(`/public/portal/${token}`),
  uploadDocument: (token: string, title: string, file: File) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);
    return client.post(`/public/portal/${token}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  signContract: (token: string, data: { signature_image: string; signature_typed_name: string }) =>
    client.post(`/public/portal/${token}/sign`, data),
};
