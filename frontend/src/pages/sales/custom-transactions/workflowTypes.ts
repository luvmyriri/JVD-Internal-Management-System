import type { Service } from '../../../api/billing';
import type {
  CustomTransactionDetailInput,
  ItineraryDayInput,
  PassengerInput,
} from '../../../api/contracts';
import type { CartItem, CheckoutCustomerPreset } from '../SalesCheckout';

export type CustomWorkflowType =
  | 'private_tour'
  | 'visa_assistance'
  | 'passport_assistance'
  | 'flight_booking'
  | 'accommodation_booking'
  | 'ticket_booking'
  | 'activity_booking'
  | 'transfer_service'
  | 'custom_arrangement';

export interface PreparedServiceLine {
  title: string;
  description: string;
  price: number;
  serviceType: CustomWorkflowType;
  metadata: Record<string, unknown>;
  catalogServiceId?: number;
  customerSnapshot?: CheckoutCustomerPreset;
  travelCaseId?: number;
  customDetail?: CustomTransactionDetailInput;
  itinerary?: ItineraryDayInput[];
  passengers?: PassengerInput[];
  serviceDate?: string;
  destination?: string;
  paxCount?: number;
  adultCount?: number;
  childCount?: number;
  adultUnitPrice?: number;
  childUnitPrice?: number;
  busId?: number;
  driverId?: number;
}

export interface ServiceWorkflowProps {
  onAdd: (line: PreparedServiceLine) => void;
  onBack: () => void;
}

export interface PrivateTourWorkflowProps extends ServiceWorkflowProps {
  catalogService?: Service | null;
}

export const splitLines = (value: string): string[] => value
  .split(/[\n,]+/)
  .map((line) => line.trim())
  .filter(Boolean);

export const toIsoDateTime = (value: string): string | undefined => (
  value ? new Date(value).toISOString() : undefined
);

export const preparedLineToCartItem = (line: PreparedServiceLine, sequence: number): CartItem => {
  const cartId = globalThis.crypto?.randomUUID?.()
    || `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const virtualId = -Math.abs(Date.now() + sequence);
  const service: Service = {
    id: virtualId,
    name: line.title,
    description: line.description,
    category: line.customDetail?.category || line.serviceType,
    service_type: line.serviceType,
    is_sales_catalog: false,
    price: line.price,
    is_active: true,
  };

  return {
    cartId,
    service,
    quantity: 1,
    quantityLocked: true,
    customPrice: line.price,
    isBespoke: true,
    catalogServiceId: line.catalogServiceId,
    lineName: line.title,
    serviceType: line.serviceType,
    lineDescription: line.description,
    lineMetadata: {
      ...line.metadata,
      source: 'custom_transactions',
      customer_id: line.customerSnapshot?.id,
      customer_snapshot: line.customerSnapshot,
    },
    travelCaseId: line.travelCaseId,
    customCategoryDetail: line.customDetail,
    itinerary: line.itinerary,
    passengers: line.passengers,
    serviceDate: line.serviceDate,
    destination: line.destination,
    paxCount: line.paxCount,
    adults: line.adultCount,
    childrenCount: line.childCount,
    adultUnitPrice: line.adultUnitPrice,
    childUnitPrice: line.childUnitPrice,
    busId: line.busId,
    driverId: line.driverId,
  };
};
