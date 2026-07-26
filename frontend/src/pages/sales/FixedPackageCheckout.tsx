import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { billingApi, type Service } from '../../api/billing';
import PrivateTourWorkflow from './custom-transactions/PrivateTourWorkflow';
import { preparedLineToCartItem, type PreparedServiceLine } from './custom-transactions/workflowTypes';
import { resolveServiceType } from './fixedPackagesUtils';
import SalesCheckout, { type CartItem } from './SalesCheckout';

export default function FixedPackageCheckout() {
  const navigate = useNavigate();
  const serviceId = Number(useParams().serviceId);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { data: response, isLoading } = useQuery({ queryKey: ['billing-services'], queryFn: billingApi.getServices });
  const service = ((response?.data?.data ?? []) as Service[]).find((item) => item.id === serviceId) ?? null;

  const addLine = (line: PreparedServiceLine) => {
    setCart([preparedLineToCartItem(line, 0)]);
  };
  const removeFromCart = () => setCart([]);
  const updateQuantity = () => undefined;

  if (isLoading) return <div className="grid min-h-96 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>;
  if (!service || service.is_sales_catalog === false || resolveServiceType(service) !== 'private_tour') return <div className="w-full rounded-3xl border border-red-200 bg-red-50 p-8"><h1 className="text-xl font-black text-red-900">Private package unavailable</h1><p className="mt-2 text-sm text-red-700">This record is missing or does not belong to the private-tour package library.</p><button onClick={() => navigate('/sales/fixed-packages')} className="mt-5 rounded-xl bg-red-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">Return to packages</button></div>;

  return <div className="w-full space-y-5 pb-12">
    <header className="flex flex-col gap-5 rounded-3xl bg-[#071b33] p-6 text-white lg:flex-row lg:items-end lg:justify-between">
      <div><button onClick={() => navigate('/sales/fixed-packages')} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Fixed Packages</button><p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Agent checkout · Private tour</p><h1 className="mt-2 text-2xl font-black">{service.name}</h1><p className="mt-2 text-sm text-slate-300">Build this customer’s named party and itinerary, then complete the invoice and payment beside it.</p></div>
      <div className="flex max-w-md gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 text-xs text-slate-200"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /><span>Checkout finalization writes the invoice, accounting entry, private-tour fulfillment, and any bus/driver allocation in one transaction.</span></div>
    </header>
    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <PrivateTourWorkflow catalogService={service} onAdd={addLine} onBack={() => navigate('/sales/fixed-packages')} hideHeader={true} />
      <aside className="2xl:sticky 2xl:top-4 2xl:h-[calc(100vh-110px)] 2xl:min-h-[720px]"><SalesCheckout cart={cart} removeFromCart={removeFromCart} updateQuantity={updateQuantity} clearCart={() => setCart([])} /></aside>
    </div>
  </div>;
}
