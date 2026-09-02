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
  images?: string[];
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
  images?: string[];
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

export interface EducationalTourBusAssignment {
  id: number;
  sequence_number: number;
  bus_id: number;
  bus_plate?: string;
  bus_model?: string;
  driver_id?: number;
  driver_name?: string;
  capacity: number;
  occupied: number;
  available: number;
  status: string;
}

export interface EducationalTourPackage {
  id: number;
  public_id: string;
  tour_code: string;
  name: string;
  school_name: string;
  grade_level?: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pickup_location?: string;
  images?: string[];
  pricing: {
    rate_per_head: number;
    adult_rate_per_head?: number;
    currency: string;
    payment_policy: string;
    down_payment_amount?: number | null;
    installment_count?: number | null;
  };
  capacity: {
    maximum: number;
    reserved: number;
    confirmed: number;
    available: number;
    students_count?: number;
    adults_count?: number;
  };
  sales: {
    booking_count: number;
    gross_billed: number;
    collected: number;
    outstanding: number;
  };
  fleet: {
    planned_bus_capacity: number;
    allocated_participants: number;
    waiting_for_allocation: number;
    assignments_count: number;
  };
  bus_assignments?: EducationalTourBusAssignment[];
}

export interface EducationalTourParticipantBooking {
  id: number;
  public_id: string;
  reference: string;
  package_id: number;
  customer_id?: number;
  invoice_id: number;
  participant_first_name: string;
  participant_middle_name?: string;
  participant_last_name: string;
  participant_type?: 'student' | 'adult' | 'companion' | 'child' | 'guardian' | 'teacher';
  full_name?: string;
  student_number?: string;
  grade_level?: string;
  section?: string;
  date_of_birth?: string;
  participant_email?: string;
  participant_phone?: string;
  guardian_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  dietary_restrictions?: string;
  medical_or_accessibility_notes?: string;
  rate_snapshot: number;
  subtotal: number;
  tax_amount: number;
  amount_due: number;
  currency: string;
  payment_plan: string;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'refunded';
  document_delivery_status?: 'queued' | 'sending' | 'sent' | 'failed' | null;
  document_delivery_recipient?: string | null;
  document_delivery_queued_at?: string | null;
  document_delivery_sent_at?: string | null;
  document_delivery_failed_at?: string | null;
  document_delivery_error?: string | null;
  status: 'pending_payment' | 'partially_paid' | 'confirmed' | 'cancelled' | 'expired' | 'completed';
  bus_assignment_id?: number;
  seat_number?: string;
  booked_at: string;
  slot_expires_at?: string;
  package?: {
    id: number;
    tour_code: string;
    name: string;
    school_name: string;
    starts_at: string;
    ends_at: string;
  };
  invoice?: {
    id: number;
    invoice_number: string;
    total_amount: number;
    amount_received: number;
    balance: number;
    status: string;
  };
  bus_assignment?: EducationalTourBusAssignment;
  payments?: EducationalTourBookingPayment[];
}

export interface EducationalTourBookingPayment {
  id: number;
  reference: string;
  booking_id: number;
  collection_payment_id?: number;
  installment_number?: number;
  payment_kind: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  provider_reference?: string;
  idempotency_key: string;
  paid_at?: string;
  posted_at?: string;
  notes?: string;
}

export interface CreateEducationalPackagePayload {
  program_id?: number;
  tour_code?: string;
  name: string;
  school_name: string;
  grade_level?: string;
  description?: string;
  learning_objectives?: string;
  starts_at: string;
  ends_at: string;
  registration_opens_at?: string;
  registration_closes_at?: string;
  pickup_location: string;
  itinerary?: Array<{ day_number?: number; sequence?: number; starts_at?: string; location: string; activity: string }>;
  inclusions?: string[];
  exclusions?: string[];
  images?: string[];
  maximum_capacity: number;
  rate_per_head: number;
  adult_rate_per_head?: number;
  currency?: string;
  payment_policy?: 'full_only' | 'down_payment' | 'installment' | 'flexible';
  down_payment_amount?: number;
  installment_count?: number;
  balance_due_at?: string;
  status?: string;
  operations_notes?: string;
  bus_assignments?: Array<{
    id?: number;
    bus_id: number;
    driver_id?: number | null;
    sequence_number?: number;
  }>;
}

export interface RegisterParticipantPayload {
  participant: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    type?: 'student' | 'adult' | 'companion' | 'child' | 'guardian' | 'teacher';
    participant_type?: 'student' | 'adult' | 'companion' | 'child' | 'guardian' | 'teacher';
    student_number?: string;
    grade_level?: string;
    section?: string;
    date_of_birth?: string;
    email?: string;
    phone?: string;
    dietary_restrictions?: string;
    medical_or_accessibility_notes?: string;
  };
  participant_type?: 'student' | 'adult' | 'companion' | 'child' | 'guardian' | 'teacher';
  type?: 'student' | 'adult' | 'companion' | 'child' | 'guardian' | 'teacher';
  guardian?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  emergency_contact?: {
    name?: string;
    phone?: string;
  };
  payment_plan?: 'full' | 'down_payment' | 'installment';
  allocation_mode?: 'manual' | 'automatic';
  bus_assignment_id?: number;
  bus_sequence?: number;
  seat_number?: string;
}

export interface BulkRegistrationError {
  index: number;
  participant: string;
  error: string;
}

export interface BulkRegistrationResult {
  total: number;
  created: number;
  duplicates: number;
  failed: number;
  errors: BulkRegistrationError[];
  data: DeskParticipantBookingResult[];
}

export interface DeskParticipantBookingResult {
  booking_reference: string;
  public_id: string;
  duplicate: boolean;
  status: string;
  participant: {
    display_name: string;
    participant_type?: string;
    student_number?: string;
    grade_level?: string;
    section?: string;
  };
  billing: {
    invoice_id: number;
    invoice_number: string;
    total: number;
    paid: number;
    balance: number;
    currency: string;
    payment_plan: string;
    payment_status: string;
  };
  allocation: {
    status: 'allocated' | 'pending';
    bus_number?: number;
    bus_plate?: string;
    seat_number?: string;
  };
}

export interface RecordPaymentPayload {
  payment_kind: 'full' | 'down_payment' | 'installment' | 'balance';
  payment_method: string;
  amount: number;
  paid_at?: string;
  idempotency_key?: string;
  installment_number?: number;
  provider_reference?: string;
  notes?: string;
}

export interface EducationalBooking {
  id: number;
  reference: string;
  school_name: string;
  grade_level: string;
  contact_person: string;
  contact_email?: string | null;
  contact_number?: string | null;
  starts_at: string;
  ends_at: string;
  pickup_location: string;
  stops_snapshot?: string[];
  student_count: number;
  tour_guide_count?: number;
  adult_count?: number;
  chaperone_count: number;
  status: string;
  booking_mode?: 'entire_vehicle' | 'selected_seats';
  selected_seats?: string[];
  passengers?: Array<Record<string, unknown>>;
  operations_notes?: string | null;
  program: EducationalProgram;
  vehicles: Array<{ id: number; planned_passengers: number; bus: EducationalResources['buses'][number]; driver: EducationalResources['drivers'][number] }>;
  invoice: { id: number; invoice_number: string; status: string; balance: number };
}

export const educationalTourApi = {
  // Catalog Programs
  programs: () => client.get('/sales/educational-programs').then(res => res.data.data as EducationalProgram[]),
  programDetails: (id: number) => client.get(`/sales/educational-programs/${id}/details`).then(res => res.data.data as { program: EducationalProgram; bookings: EducationalBooking[] }),
  createProgram: (data: CreateEducationalProgramPayload) => client.post('/sales/educational-programs', data).then(res => res.data.data as EducationalProgram),
  updateProgram: (id: number, data: CreateEducationalProgramPayload) => client.put(`/sales/educational-programs/${id}`, data).then(res => res.data.data as EducationalProgram),
  deleteProgram: (id: number) => client.delete(`/sales/educational-programs/${id}`).then(res => res.data),

  // Scheduled Packages
  packages: (params?: { status?: string; search?: string }) => client.get('/sales/educational-tour-packages', { params }).then(res => res.data.data as EducationalTourPackage[]),
  packageDetails: (id: number) => client.get(`/sales/educational-tour-packages/${id}`).then(res => res.data.data as EducationalTourPackage),
  packageManifest: (id: number) => client.get(`/sales/educational-tour-packages/${id}/manifest`, {
    responseType: 'blob',
    timeout: 120_000,
  }).then(res => res.data as Blob),
  createPackage: (data: CreateEducationalPackagePayload) => client.post('/sales/educational-tour-packages', data).then(res => res.data.data as EducationalTourPackage),
  updatePackage: (id: number, data: Partial<CreateEducationalPackagePayload>) => client.put(`/sales/educational-tour-packages/${id}`, data).then(res => res.data.data as EducationalTourPackage),
  publishPackage: (id: number) => client.post(`/sales/educational-tour-packages/${id}/publish`).then(res => res.data.data as EducationalTourPackage),
  uploadImageBase64: (packageId: number, base64: string): Promise<string> => {
    // Convert base64 data URL → Blob → FormData and POST to the image upload endpoint
    const [header, data] = base64.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const form = new FormData();
    form.append('image', blob, `upload.${ext}`);
    return client
      // Let the browser/Axios set the multipart boundary. Supplying the bare
      // content type manually can make Laravel receive an empty upload.
      .post(`/sales/educational-tour-packages/${packageId}/image`, form)
      .then(res => res.data.image_url as string);
  },
  deletePackage: (id: number) => client.delete(`/sales/educational-tour-packages/${id}`).then(res => res.data),
  packageQuotation: (id: number) => client.get(`/sales/educational-tour-packages/${id}/quotation`, { responseType: 'blob' }).then(res => res.data as Blob),
  packageContract: (id: number) => client.get(`/sales/educational-tour-packages/${id}/contract`, { responseType: 'blob' }).then(res => res.data as Blob),
  registerParticipantAtDesk: (packageId: number, data: RegisterParticipantPayload) => client.post(
    `/sales/educational-tour-packages/${packageId}/participant-bookings`,
    data,
  ).then(res => res.data.data as DeskParticipantBookingResult),
  bulkRegisterParticipants: (packageId: number, participants: RegisterParticipantPayload[]) => client.post(
    `/sales/educational-tour-packages/${packageId}/participant-bookings/bulk`,
    { participants },
  ).then(res => res.data.data as BulkRegistrationResult),
  assignBus: (packageId: number, data: { bus_id: number; driver_id?: number; sequence_number?: number }) => client.post(`/sales/educational-tour-packages/${packageId}/bus-assignments`, data).then(res => res.data.data),
  updateBusAssignment: (packageId: number, assignmentId: number, data: { bus_id?: number; driver_id?: number | null; sequence_number?: number }) => client.put(`/sales/educational-tour-packages/${packageId}/bus-assignments/${assignmentId}`, data).then(res => res.data.data),
  removeBus: (packageId: number, assignmentId: number) => client.delete(`/sales/educational-tour-packages/${packageId}/bus-assignments/${assignmentId}`).then(res => res.data),
  allocateBuses: (packageId: number, options?: { strategy?: string; include_statuses?: string[]; rebalance_existing?: boolean }) => client.post(`/sales/educational-tour-packages/${packageId}/allocate-buses`, options).then(res => res.data.data),

  // Participant Bookings & Payments
  participantBookings: (params?: { package_id?: number; status?: string; search?: string }) => client.get('/sales/educational-tour-participant-bookings', { params }).then(res => res.data.data as EducationalTourParticipantBooking[]),
  participantBookingDetails: (id: number) => client.get(`/sales/educational-tour-participant-bookings/${id}`).then(res => res.data.data as EducationalTourParticipantBooking),
  participantInvoice: (id: number) => client.get(`/sales/educational-tour-participant-bookings/${id}/invoice`, {
    responseType: 'blob',
    timeout: 120_000,
  }).then(res => res.data as Blob),
  participantStatement: (id: number) => client.get(`/sales/educational-tour-participant-bookings/${id}/statement`, {
    responseType: 'blob',
    timeout: 120_000,
  }).then(res => res.data as Blob),
  sendParticipantDocuments: (id: number, email?: string) => client.post(
    `/sales/educational-tour-participant-bookings/${id}/send-documents`,
    email ? { email } : {},
  ).then(res => res.data),
  recordPayment: (bookingId: number, data: RecordPaymentPayload) => client.post(`/sales/educational-tour-participant-bookings/${bookingId}/payments`, data).then(res => res.data),
  cancelParticipantBooking: (bookingId: number, reason?: string) => client.post(`/sales/educational-tour-participant-bookings/${bookingId}/cancel`, { reason }).then(res => res.data),
  moveSeat: (bookingId: number, busAssignmentId: number, seatNumber: string) => client.post(`/sales/educational-tour-participant-bookings/${bookingId}/move-seat`, { bus_assignment_id: busAssignmentId, seat_number: seatNumber }).then(res => res.data),

  // Legacy bookings & quotes
  bookings: () => client.get('/sales/educational-bookings').then(res => res.data.data as EducationalBooking[]),
  resources: (startsAt: string, endsAt: string) => client.get('/sales/educational-resources', { params: { starts_at: startsAt, ends_at: endsAt } }).then(res => res.data.data as EducationalResources),
  quote: (programId: number, students: number, tourGuides: number) => client.post('/sales/educational-quote', { program_id: programId, student_count: students, tour_guide_count: tourGuides, chaperone_count: tourGuides }).then(res => res.data.data as EducationalPricing),
  createBooking: (data: Record<string, unknown>) => client.post('/sales/educational-bookings', data).then(res => res.data.data as EducationalBooking),
  updateBooking: (id: number, data: Record<string, unknown>) => client.put(`/sales/educational-bookings/${id}`, data).then(res => res.data.data as EducationalBooking),
  cancelBooking: (id: number, reason: string) => client.post(`/sales/educational-bookings/${id}/cancel`, { reason }).then(res => res.data),
};
