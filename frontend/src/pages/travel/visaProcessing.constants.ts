export interface VisaCase {
  id: number;
  reference_number?: string;
  case_type: string;
  status: string;
  checklist: Record<string, boolean>;
  submitted_date?: string;
  release_date?: string;
  customer?: {
    id: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  passenger?: {
    id: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    birth_date?: string;
    contact_no?: string;
  };
  handler?: { id: number; first_name?: string; last_name?: string; full_name?: string };
  destination_country?: string;
  visa_type?: string;
}

export const STATUS_FLOW = [
  'requirements_gathering',
  'documents_complete',
  'submitted_for_processing',
  'processing',
  'ready_for_release',
  'released',
];

export const STATUS_LABELS: Record<string, string> = {
  requirements_gathering: 'Requirements',
  documents_complete: 'Docs Complete',
  submitted_for_processing: 'Submitted',
  processing: 'Processing',
  ready_for_release: 'Ready',
  released: 'Released',
  denied: 'Denied',
};

export const STATUS_COLORS: Record<string, string> = {
  requirements_gathering: 'bg-amber-50 text-amber-700 border-amber-200',
  documents_complete: 'bg-blue-50 text-blue-700 border-blue-200',
  submitted_for_processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  ready_for_release: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  released: 'bg-gray-50 text-gray-600 border-gray-200',
  denied: 'bg-red-50 text-red-700 border-red-200',
};

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  requirements_gathering: ['documents_complete'],
  documents_complete: ['submitted_for_processing', 'requirements_gathering'],
  submitted_for_processing: ['processing'],
  processing: ['denied', 'ready_for_release'],
  ready_for_release: ['released'],
  denied: ['requirements_gathering'],
};

export const VISA_CHECKLIST = [
  'Valid Passport',
  'Visa Application Form',
  'Proof of Accommodation',
  'Flight Itinerary',
  'Bank Statement (3 months)',
  'Travel Insurance',
  'Employer Certificate / ITR',
];

export const COUNTRY_SPECIFIC_CHECKLISTS: Record<string, string[]> = {
  'US': ['Valid Passport', 'DS-160 Confirmation Page', 'MRV Fee Receipt', 'Interview Appointment Confirmation', '2x2 Photo (White Background)', 'Bank Statement', 'Proof of Ties to Home Country'],
  'JP': ['Valid Passport', 'Visa Application Form (Japan)', '2x2 Photo (White Background)', 'Birth Certificate (PSA)', 'Marriage Certificate (PSA, if applicable)', 'Itinerary in Japan', 'Bank Certificate', 'ITR (Form 2316)'],
  'KR': ['Valid Passport', 'Visa Application Form (South Korea)', '1.5x2 Photo (White Background)', 'Original Bank Certificate', 'Bank Statement (Last 3 months)', 'ITR (Form 2316)', 'Certificate of Employment'],
  'GB': ['Valid Passport', 'Online Application Form (UK)', 'Biometrics Confirmation', 'Proof of Financial Means (Bank Statements)', 'Accommodation Details', 'Travel Itinerary', 'Certificate of Employment'],
  'CA': ['Valid Passport', 'IMM 5257 Form', 'Family Information Form (IMM 5645)', 'Digital Photo', 'Proof of Financial Support', 'Purpose of Travel (Itinerary)', 'Travel History'],
  'AU': ['Valid Passport', 'Form 1419', 'Recent Passport-sized Photo', 'Bank Statement (Last 3 months)', 'Payslips', 'Certificate of Employment', 'Evidence of Travel History'],
  'CN': ['Valid Passport (with at least 6 months validity)', 'Visa Application Form', 'Recent Passport-sized Photo', 'Round-trip Flight Tickets', 'Hotel Reservation', 'Previous Chinese Visas (if applicable)'],
  'AE': ['Valid Passport (with at least 6 months validity)', 'Recent Colored Photograph', 'Confirmed Flight Ticket', 'National ID (if applicable)'],
  // Schengen countries
  'FR': ['Valid Passport', 'Schengen Application Form', 'Travel Health Insurance (Min €30,000)', 'Flight Reservation', 'Proof of Accommodation', 'Bank Statement (3 months)', 'Certificate of Employment'],
  'IT': ['Valid Passport', 'Schengen Application Form', 'Travel Health Insurance (Min €30,000)', 'Flight Reservation', 'Proof of Accommodation', 'Bank Statement (3 months)', 'Certificate of Employment'],
  'ES': ['Valid Passport', 'Schengen Application Form', 'Travel Health Insurance (Min €30,000)', 'Flight Reservation', 'Proof of Accommodation', 'Bank Statement (3 months)', 'Certificate of Employment'],
  'DE': ['Valid Passport', 'Schengen Application Form', 'Travel Health Insurance (Min €30,000)', 'Flight Reservation', 'Proof of Accommodation', 'Bank Statement (3 months)', 'Certificate of Employment'],
  // Visa-free / VoA for PH
  'SG': ['Valid Passport', 'SG Arrival Card', 'Return Flight Ticket', 'Proof of Accommodation'],
  'TH': ['Valid Passport', 'Return Flight Ticket', 'Proof of Accommodation', 'Sufficient Funds'],
  'TW': ['Valid Passport', 'Return Flight Ticket', 'Proof of Accommodation', 'e-Gate Registration (Optional)'],
};

export const VISA_TYPE_EXTRAS: Record<string, string[]> = {
  'Business': ['Letter of Invitation (from Host Company)', 'Business Registration of Host Company', 'Guarantee Letter (if applicable)'],
  'Student': ['Acceptance Letter from School', 'Proof of Tuition Payment', 'Academic Transcripts/Records'],
  'Transit': ['Visa for Final Destination', 'Confirmed Forward Flight Ticket'],
  'Tourist': ['Detailed Travel Itinerary'],
  'Other': ['Additional Supporting Documents as requested'],
};

export const COUNTRIES = [
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'FR', name: 'France (Schengen)' },
  { code: 'IT', name: 'Italy (Schengen)' },
  { code: 'ES', name: 'Spain (Schengen)' },
  { code: 'DE', name: 'Germany (Schengen)' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'CN', name: 'China' },
];

export const calculateAge = (dobString: string) => {
  if (!dobString) return '';
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} years old` : '';
};
