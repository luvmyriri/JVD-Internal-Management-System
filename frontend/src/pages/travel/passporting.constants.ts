// ── Types ─────────────────────────────────────────────────────────────────────
export interface PassportCase {
  id: number;
  reference_number?: string;
  case_type: 'passport' | 'visa';
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
}

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

export const PASSPORT_CHECKLIST = [
  'Birth Certificate (PSA)',
  'Valid Government ID',
  'Accomplished DFA Form',
  'Passport Photo',
  'Payment Receipt',
];

export const VISA_CHECKLIST = [
  'Valid Passport',
  'Visa Application Form',
  'Proof of Accommodation',
  'Flight Itinerary',
  'Bank Statement (3 months)',
  'Travel Insurance',
];

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  requirements_gathering: ['documents_complete'],
  documents_complete: ['submitted_for_processing', 'requirements_gathering'],
  submitted_for_processing: ['processing'],
  processing: ['denied', 'ready_for_release'],
  ready_for_release: ['released'],
  denied: ['requirements_gathering'],
};
