import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BedDouble,
  BusFront,
  CalendarCheck2,
  FileBadge,
  GraduationCap,
  Hotel,
  MapPinned,
  Plane,
  Route,
  Shapes,
  Ticket,
  TicketsPlane,
  UsersRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SalesCheckout, { type CartItem, type CheckoutCustomerPreset } from './SalesCheckout';
import AccommodationBookingWorkflow from './custom-transactions/AccommodationBookingWorkflow';
import ActivityBookingWorkflow from './custom-transactions/ActivityBookingWorkflow';
import CustomArrangementWorkflow from './custom-transactions/CustomArrangementWorkflow';
import FlightBookingWorkflow from './custom-transactions/FlightBookingWorkflow';
import PassportAssistanceWorkflow from './custom-transactions/PassportAssistanceWorkflow';
import PrivateTourWorkflow from './custom-transactions/PrivateTourWorkflow';
import ScheduledTicketWorkflow from './custom-transactions/ScheduledTicketWorkflow';
import TransferServiceWorkflow from './custom-transactions/TransferServiceWorkflow';
import VisaAssistanceWorkflow from './custom-transactions/VisaAssistanceWorkflow';
import {
  preparedLineToCartItem,
  type CustomWorkflowType,
  type PreparedServiceLine,
} from './custom-transactions/workflowTypes';

interface DeskDefinition {
  type: CustomWorkflowType;
  title: string;
  owner: string;
  description: string;
  icon: typeof Plane;
  color: string;
}

const desks: DeskDefinition[] = [
  { type: 'private_tour', title: 'Private tour', owner: 'Party itinerary & logistics', description: 'Named adults and children, package rules, daily itinerary, dates, vehicle and driver.', icon: MapPinned, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200' },
  { type: 'visa_assistance', title: 'Visa assistance', owner: 'Travel Assistance case', description: 'Bill an existing applicant case with country, visa type, purpose, appointment and requirements.', icon: FileBadge, color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200' },
  { type: 'passport_assistance', title: 'Passport assistance', owner: 'Passporting case', description: 'Application type, appointment site, target release, requirements and the exact applicant record.', icon: TicketsPlane, color: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-200' },
  { type: 'flight_booking', title: 'Flight booking', owner: 'Air fulfillment', description: 'One-way, round-trip or multi-city segments, named passengers, PNR, fare rules and ticketing deadline.', icon: Plane, color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200' },
  { type: 'accommodation_booking', title: 'Accommodation', owner: 'Rooming & stay', description: 'Property, room type, occupancy, exact guest list, confirmation and cancellation deadline.', icon: Hotel, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200' },
  { type: 'ticket_booking', title: 'Scheduled ticket', owner: 'Ferry, bus or rail', description: 'Operator schedule, route, named passengers, supplier reference and one seat per passenger.', icon: Ticket, color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200' },
  { type: 'activity_booking', title: 'Activity', owner: 'Dated session capacity', description: 'Session window, supplier reference, finite capacity, named participants and requirements.', icon: CalendarCheck2, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' },
  { type: 'transfer_service', title: 'Transfer', owner: 'Pickup & dispatch', description: 'Exact pickup/drop-off window, named passengers, luggage and available vehicle/driver.', icon: Route, color: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200' },
  { type: 'custom_arrangement', title: 'Custom arrangement', owner: 'Scoped deliverables', description: 'A priced scope with concrete deliverables, supplier reference, target window and margin.', icon: Shapes, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
];

const typeFromQuery = (value: string | null): CustomWorkflowType | null => (
  desks.some((desk) => desk.type === value) ? value as CustomWorkflowType : null
);

export default function CustomTransactions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = typeFromQuery(searchParams.get('type'));
  const [cart, setCart] = useState<CartItem[]>([]);

  const customerPreset = useMemo<CheckoutCustomerPreset | null>(() => cart
    .map((item) => item.lineMetadata?.customer_snapshot as CheckoutCustomerPreset | undefined)
    .find(Boolean) ?? null, [cart]);

  const selectDesk = (type: CustomWorkflowType) => setSearchParams({ type });
  const backToDesks = () => setSearchParams({});

  const addLine = (line: PreparedServiceLine) => {
    const existingCustomerId = cart
      .map((item) => item.lineMetadata?.customer_id)
      .find((id): id is number => typeof id === 'number');
    if (existingCustomerId && line.customerSnapshot && existingCustomerId !== line.customerSnapshot.id) {
      toast.error('This order already belongs to another customer. Finish it or start a separate order.');
      return;
    }

    setCart((current) => [...current, preparedLineToCartItem(line, current.length)]);
    toast.success(`${line.title} added. Complete the customer and payment checkout on the right.`);
  };

  const removeFromCart = (serviceId: number, _adults?: number, _children?: number, _vehicle?: 'Bus' | 'Coaster', _busId?: number, cartId?: string) => {
    setCart((current) => current.filter((item) => cartId ? item.cartId !== cartId : item.service.id !== serviceId));
  };

  const updateQuantity = (serviceId: number, quantity: number, _adults?: number, _children?: number, _vehicle?: 'Bus' | 'Coaster', _busId?: number, cartId?: string) => {
    if (quantity < 1) return removeFromCart(serviceId, undefined, undefined, undefined, undefined, cartId);
    setCart((current) => current.map((item) => {
      const matches = cartId ? item.cartId === cartId : item.service.id === serviceId;
      return matches && !item.quantityLocked ? { ...item, quantity } : item;
    }));
  };

  const workflow = () => {
    if (!activeType) return null;
    if (activeType === 'private_tour') {
      return <PrivateTourWorkflow catalogService={null} onAdd={addLine} onBack={backToDesks} />;
    }
    if (activeType === 'visa_assistance') return <VisaAssistanceWorkflow onAdd={addLine} onBack={backToDesks} />;
    if (activeType === 'passport_assistance') return <PassportAssistanceWorkflow onAdd={addLine} onBack={backToDesks} />;
    if (activeType === 'flight_booking') return <FlightBookingWorkflow onAdd={addLine} onBack={backToDesks} />;
    if (activeType === 'accommodation_booking') return <AccommodationBookingWorkflow onAdd={addLine} onBack={backToDesks} />;
    if (activeType === 'ticket_booking') return <ScheduledTicketWorkflow onAdd={addLine} onBack={backToDesks} />;
    if (activeType === 'activity_booking') return <ActivityBookingWorkflow onAdd={addLine} onBack={backToDesks} />;
    if (activeType === 'transfer_service') return <TransferServiceWorkflow onAdd={addLine} onBack={backToDesks} />;
    return <CustomArrangementWorkflow onAdd={addLine} onBack={backToDesks} />;
  };

  return (
    <div className="w-full space-y-5 pb-12">
      <header className="rounded-3xl bg-[#071b33] p-7 text-white">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#75b8ff]">Agent-assisted sales</p><h1 className="mt-2 text-3xl font-black">Service booking desks</h1><p className="mt-2 text-sm leading-6 text-slate-300">Open the desk that owns the service. Each desk writes its own fulfillment record and rules; only customer payment and accounting finalization are shared.</p></div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider sm:grid-cols-4"><button onClick={() => navigate('/sales/departures')} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left hover:bg-white/15"><UsersRound className="mb-2 h-4 w-4 text-emerald-300" />Joiners</button><button onClick={() => navigate('/sales/charters')} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left hover:bg-white/15"><BusFront className="mb-2 h-4 w-4 text-blue-300" />Charters</button><button onClick={() => navigate('/sales/educational-tours')} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left hover:bg-white/15"><GraduationCap className="mb-2 h-4 w-4 text-amber-300" />Education</button><button onClick={() => navigate('/sales/orders')} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left hover:bg-white/15"><FileBadge className="mb-2 h-4 w-4 text-sky-300" />Details</button></div>
        </div>
      </header>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <main>
          {activeType ? workflow() : <section className="rounded-3xl border border-border bg-surface p-6">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Choose an owned workflow</p><h2 className="mt-1 text-2xl font-black text-ink">What is the customer buying?</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">These are separate booking records, not one catalog template with renamed fields.</p></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {desks.map((desk) => <button key={desk.type} onClick={() => selectDesk(desk.type)} className="group rounded-2xl border border-border bg-surface-alt p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"><div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${desk.color}`}><desk.icon className="h-5 w-5" /></span><span className="text-[9px] font-black uppercase tracking-widest text-muted group-hover:text-brand">Open desk →</span></div><p className="mt-4 text-[9px] font-black uppercase tracking-widest text-brand">{desk.owner}</p><h3 className="mt-1 text-base font-black text-ink">{desk.title}</h3><p className="mt-2 text-xs leading-5 text-muted">{desk.description}</p></button>)}
            </div>
          </section>}
        </main>

        <aside className="2xl:sticky 2xl:top-4 2xl:h-[calc(100vh-110px)] 2xl:min-h-[720px]">
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-bold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><BedDouble className="h-4 w-4" /> Completing the transaction creates the invoice, accounting handoff, and the selected service’s fulfillment record together.</div>
          <SalesCheckout cart={cart} removeFromCart={removeFromCart} updateQuantity={updateQuantity} clearCart={() => setCart([])} customerPreset={customerPreset} />
        </aside>
      </div>
    </div>
  );
}
