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
  fixed_date?: string; // Pre-determined travel date
  fixed_departure_time?: string; // e.g. "08:00"
  fixed_arrival_datetime?: string; // e.g. "2026-07-30T18:00:00"
}

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

