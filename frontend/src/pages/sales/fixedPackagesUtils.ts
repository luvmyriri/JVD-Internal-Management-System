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
}
