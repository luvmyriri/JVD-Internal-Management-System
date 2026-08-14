import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LuX, LuSearch, LuUser, LuLoaderCircle } from 'react-icons/lu';
import type { Service } from '../../api/billing';
import { customerApi } from '../../api/customers';
import { salesQuotationApi } from '../../api/salesQuotations';
import {
  buildServiceQuotationHtml,
  type QuotationPricingInput,
} from './FixedPackageQuotationPrint';

interface Props {
  service: Service;
  pricing: QuotationPricingInput;
  agentName: string;
  onClose: () => void;
}

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

export default function QuotationRecipientModal({ service, pricing, agentName, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [tin, setTin] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [validDays, setValidDays] = useState(15);

  const { data: customerRes, isFetching } = useQuery({
    queryKey: ['customers-quote-search', search],
    queryFn: () => customerApi.list({ search, per_page: 6 }),
    enabled: search.trim().length >= 2,
    staleTime: 10_000,
  });
  const customers: any[] = (customerRes as any)?.data?.data ?? (customerRes as any)?.data ?? [];

  const pickCustomer = (c: any) => {
    setCustomerId(c.id);
    setName([c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' '));
    setEmail(c.email ?? '');
    setContact(c.phone ?? '');
    setAddress(c.address ?? '');
    setSearch('');
  };

  const mutation = useMutation({
    mutationFn: () => {
      const pricingContext = service.is_tour
        ? {
            vehicle: pricing.bookingTourVehicle.toLowerCase() as 'bus' | 'coaster',
            extra_days: pricing.bookingTourExtraDays,
            extra_hours: pricing.bookingTourExtraHours,
          }
        : service.has_booking_fields
          ? {
              adults: pricing.bookingAdults,
              children: pricing.bookingChildren,
            }
          : undefined;

      return salesQuotationApi.create({
        customer_id: customerId,
        client_name: name.trim(),
        client_company: company.trim() || undefined,
        client_address: address.trim() || undefined,
        client_contact: contact.trim() || undefined,
        client_email: email.trim() || undefined,
        client_tin: tin.trim() || undefined,
        service_id: service.id,
        service_name: service.name,
        category: service.category,
        pricing_context: pricingContext,
        description: service.description || undefined,
        inclusions: service.inclusions || undefined,
        exclusions: service.exclusions || undefined,
        travel_date: travelDate || null,
        valid_days: validDays,
      });
    },
  });

  const handleGenerate = async () => {
    if (!name.trim()) { toast.error('Client name is required.'); return; }

    // Open the print window synchronously (inside the click) so popup blockers allow it.
    const w = window.open('', '_blank');
    if (!w) { toast.error('Please allow popups to generate the quotation.'); return; }
    w.document.write('<!doctype html><title>Generating…</title><body style="font-family:sans-serif;padding:40px;color:#475569">Generating quotation…</body>');

    try {
      const res = await mutation.mutateAsync();
      const q = res.data;
      w.document.open();
      w.document.write(
        buildServiceQuotationHtml({
          ...pricing,
          agentName,
          lineItems: q.line_items,
          recipient: {
            client_name: name.trim(),
            client_company: company.trim(),
            client_address: address.trim(),
            client_contact: contact.trim(),
            client_email: email.trim(),
            client_tin: tin.trim(),
          },
          meta: {
            quotationNumber: q.quotation_number,
            subtotal: Number(q.subtotal),
            vatAmount: Number(q.vat_amount),
            total: Number(q.total),
            vatRate: Number(q.vat_rate),
            validUntil: q.valid_until,
            travelDate: q.travel_date || travelDate || undefined,
          },
        }),
      );
      w.document.close();
      toast.success(`Quotation ${q.quotation_number} created`);
      onClose();
    } catch (err: any) {
      w.close();
      toast.error(err?.response?.data?.message || 'Failed to create quotation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-7 pb-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Prepare Quotation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Who is this quotation for?</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><LuX size={20} /></button>
        </div>

        <div className="p-7 overflow-y-auto space-y-5">
          {/* Customer search */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Find existing customer (optional)</label>
            <div className="relative">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" className={`${inputCls} pl-11`} />
              {isFetching && <LuLoaderCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />}
            </div>
            {search.trim().length >= 2 && customers.length > 0 && (
              <div className="mt-2 border border-gray-100 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 max-h-40 overflow-y-auto">
                {customers.map((c) => (
                  <button key={c.id} onClick={() => pickCustomer(c)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><LuUser size={15} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{[c.first_name, c.last_name].filter(Boolean).join(' ')}</span>
                      <span className="block text-[11px] text-gray-400 truncate">{c.email || c.phone || 'No contact on file'}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Client Name *</label>
              <input value={name} onChange={(e) => { setName(e.target.value); setCustomerId(null); }} placeholder="e.g. Juan Dela Cruz" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Company</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">TIN</label>
              <input value={tin} onChange={(e) => setTin(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contact No.</label>
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Travel Date</label>
              <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Valid For (days)</label>
              <input type="number" min={1} max={365} value={validDays} onChange={(e) => setValidDays(parseInt(e.target.value) || 15)} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="p-6 px-7 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">Cancel</button>
          <button
            onClick={handleGenerate}
            disabled={!name.trim() || mutation.isPending}
            className="px-7 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20"
          >
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />}
            Generate &amp; Print
          </button>
        </div>
      </div>
    </div>
  );
}
