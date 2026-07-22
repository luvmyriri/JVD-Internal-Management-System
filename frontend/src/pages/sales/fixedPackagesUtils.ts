// Shared helpers/types for the FixedPackages page and its extracted sibling components.

export const getBreakdownSum = (breakdownText: string) => {
  if (!breakdownText) return 0;
  const lines = breakdownText.split(/[\n|;]+/);
  let sum = 0;
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const numRegex = /(?:₱|PHP|Php)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/gi;
    const matches = Array.from(line.matchAll(numRegex));
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const numStr = lastMatch[1].replace(/,/g, '');
      const amount = parseFloat(numStr);
      if (!isNaN(amount)) {
        sum += amount;
      }
    }
  }
  return sum;
};

export interface NewServiceForm {
  name: string;
  category: string;
  service_type: string;
  is_sales_catalog: boolean;
  description: string;
  price: string;
  image_url: string;
  child_discount: string;
  has_booking_fields: boolean;
  adult_price: string;
  child_price: string;
  is_tour: boolean;
  bus_price: string;
  coaster_price: string;
  tour_kms: string;
  tour_hours: string;
  cost_breakdown: string;
  inclusions: string;
  exclusions: string;
  // Legacy values are retained while editing old records, but are no longer
  // exposed by the reusable catalog form. Live allocations own these fields.
  fixed_date?: string;
  fixed_departure_time?: string;
  fixed_arrival_datetime?: string;
  bus_id?: number | null;
  driver_id?: number | null;
}

export const SALES_SERVICE_TYPES = [
  { value: 'private_tour', label: 'Fixed / Private Tour', category: 'Package', owner: 'Fixed Packages checkout' },
  { value: 'joiner_tour', label: 'Joiner Tour', category: 'Joiners', owner: 'Joiner Departures' },
  { value: 'bus_rental', label: 'Bus or Van Charter', category: 'Transport', owner: 'Charter Sales' },
  { value: 'educational_tour', label: 'Educational Tour', category: 'Package', owner: 'Educational Tours' },
  { value: 'visa_assistance', label: 'Visa Assistance', category: 'Documentation', owner: 'Visa Processing' },
  { value: 'passport_assistance', label: 'Passport Assistance', category: 'Documentation', owner: 'Passporting' },
  { value: 'flight_booking', label: 'Flight Booking', category: 'Flights', owner: 'Custom Transactions' },
  { value: 'accommodation_booking', label: 'Accommodation', category: 'Accommodation', owner: 'Custom Transactions' },
  { value: 'ticket_booking', label: 'Ticket Booking', category: 'Tickets', owner: 'Custom Transactions' },
  { value: 'activity_booking', label: 'Activity Booking', category: 'Activities', owner: 'Custom Transactions' },
  { value: 'transfer_service', label: 'Transfer Service', category: 'Transport', owner: 'Custom Transactions' },
  { value: 'custom_arrangement', label: 'Custom Arrangement', category: 'Other', owner: 'Custom Transactions' },
] as const;

type ServiceClassification = {
  service_type?: string | null;
  category?: string | null;
  name?: string | null;
};

export const resolveServiceType = (service?: ServiceClassification | null): string => {
  if (!service) return 'custom_arrangement';
  if (service.service_type) return service.service_type;

  const category = (service.category || '').trim().toLowerCase();
  const name = (service.name || '').trim().toLowerCase();
  if (category === 'joiners' || category === 'joiner') return 'joiner_tour';
  if (category === 'transport' || category === 'bus rental') return name.includes('transfer') ? 'transfer_service' : 'bus_rental';
  if (name.includes('educational') || name.includes('field trip')) return 'educational_tour';
  if (name.includes('passport')) return 'passport_assistance';
  if (name.includes('visa')) return 'visa_assistance';
  if (category === 'package') return 'private_tour';
  return 'custom_arrangement';
};

export const getServiceTypeDefinition = (serviceType?: string | null) =>
  SALES_SERVICE_TYPES.find(option => option.value === serviceType) ?? SALES_SERVICE_TYPES[SALES_SERVICE_TYPES.length - 1];

export const getOperationalSalesRoute = (service: ServiceClassification): string | null => {
  const serviceType = resolveServiceType(service);
  switch (serviceType) {
    case 'joiner_tour':
      return '/sales/departures';
    case 'bus_rental':
      return '/sales/charters';
    case 'educational_tour':
      return '/sales/educational-tours';
    case 'visa_assistance':
      return '/travel/visa-processing';
    case 'passport_assistance':
      return '/travel/passporting';
    case 'private_tour':
      return null;
    default:
      return `/sales/custom-transactions?type=${encodeURIComponent(serviceType)}`;
  }
};

export const getCleanDateYMD = (rawDate?: string | null): string => {
  if (!rawDate) return '';
  return String(rawDate).split('T')[0].split(' ')[0];
};

export const formatFixedDateDisplay = (rawDate?: string | null): string => {
  if (!rawDate) return '';
  const dateOnly = getCleanDateYMD(rawDate);
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  return dateOnly;
};

