export interface BusCharterQuotationItem {
  startDate: string;
  endDate?: string;
  pickupLocation: string;
  destination: string;
  duration: string;
  quantityUnits: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BusCharterQuotationData {
  ratePlanName?: string;
  quotationNumber: string;
  quotationDate: string;
  groupCompanyName: string;
  contactPerson: string;
  emailAddress: string;
  contactNumber: string;
  items: BusCharterQuotationItem[];
  grandTotal: number;
  inclusions?: string[];
  exclusions?: string[];
}
