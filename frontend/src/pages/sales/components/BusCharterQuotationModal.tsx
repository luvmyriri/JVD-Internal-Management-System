import { useState } from 'react';
import { LuPrinter, LuX, LuPlus, LuTrash2, LuFileText, LuMail } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { salesQuotationApi } from '../../../api/salesQuotations';
import type { BusCharterQuotationData } from '../busCharterQuotationTypes';

interface BusCharterQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<BusCharterQuotationData>;
}

export default function BusCharterQuotationModal({ isOpen, onClose, initialData }: BusCharterQuotationModalProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<BusCharterQuotationData>({
    ratePlanName: initialData?.ratePlanName,
    quotationNumber: initialData?.quotationNumber || 'Assigned when generated',
    quotationDate: initialData?.quotationDate || new Date().toISOString().split('T')[0],
    groupCompanyName: initialData?.groupCompanyName || '',
    contactPerson: initialData?.contactPerson || '',
    emailAddress: initialData?.emailAddress || '',
    contactNumber: initialData?.contactNumber || '',
    inclusions: initialData?.inclusions,
    exclusions: initialData?.exclusions,
    items: initialData?.items && initialData.items.length > 0 ? initialData.items : [{
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      pickupLocation: '',
      destination: '',
      duration: 'Daytour',
      quantityUnits: 1,
      unitPrice: 0,
      totalPrice: 0,
    }],
    grandTotal: initialData?.grandTotal ?? 0,
  });

  if (!isOpen) return null;

  const addItem = () => {
    setForm(prev => {
      const newItems = [...prev.items, {
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        pickupLocation: '',
        destination: '',
        duration: 'Daytour',
        quantityUnits: 1,
        unitPrice: 0,
        totalPrice: 0,
      }];
      const grand = newItems.reduce((acc, it) => acc + (it.quantityUnits * it.unitPrice), 0);
      return { ...prev, items: newItems, grandTotal: grand };
    });
  };

  const updateItem = (index: number, key: string, val: any) => {
    setForm(prev => {
      const newItems = [...prev.items];
      const cur = { ...newItems[index], [key]: val };
      if (key === 'quantityUnits' || key === 'unitPrice') {
        cur.totalPrice = (Number(cur.quantityUnits) || 0) * (Number(cur.unitPrice) || 0);
      }
      newItems[index] = cur;
      const grand = newItems.reduce((acc, it) => acc + (it.quantityUnits * it.unitPrice), 0);
      return { ...prev, items: newItems, grandTotal: grand };
    });
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const grand = newItems.reduce((acc, it) => acc + (it.quantityUnits * it.unitPrice), 0);
      return { ...prev, items: newItems, grandTotal: grand };
    });
  };

  const createQuotation = () => salesQuotationApi.create({
    client_name: form.contactPerson.trim() || form.groupCompanyName.trim(),
    client_company: form.groupCompanyName.trim() || undefined,
    client_contact: form.contactNumber.trim() || undefined,
    client_email: form.emailAddress.trim() || undefined,
    service_name: 'Bus charter',
    category: 'Transport',
    description: form.ratePlanName ? `Charter rate plan: ${form.ratePlanName}` : 'Bus charter transport as itemized below.',
    inclusions: form.inclusions?.join('\n'),
    exclusions: form.exclusions?.join('\n'),
    travel_date: form.items[0]?.startDate || null,
    line_items: form.items.map(item => ({
      description: `Bus charter - ${item.duration.trim() || 'Transport service'}`,
      quantity: item.quantityUnits,
      unit_price: item.unitPrice,
      travel_start_date: item.startDate,
      travel_end_date: item.endDate || undefined,
      pickup_location: item.pickupLocation.trim(),
      destination: item.destination.trim(),
      duration: item.duration.trim(),
    })),
  });

  const validateForm = (requireEmail: boolean): string | null => {
    if (!form.contactPerson.trim() && !form.groupCompanyName.trim()) return 'Enter the customer or company name.';
    if (requireEmail && !form.emailAddress.trim()) return 'Enter the customer email address.';
    if (form.emailAddress.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailAddress.trim())) return 'Enter a valid customer email address.';
    const invalidLine = form.items.findIndex(item => !item.startDate || !item.pickupLocation.trim() || !item.destination.trim() || !item.duration.trim() || item.quantityUnits < 1 || item.unitPrice <= 0);
    if (invalidLine >= 0) return `Complete the date, route, duration, quantity, and rate for line ${invalidLine + 1}.`;
    const invalidDateRange = form.items.findIndex(item => item.endDate && item.endDate < item.startDate);
    if (invalidDateRange >= 0) return `End date must be on or after the start date for line ${invalidDateRange + 1}.`;
    return null;
  };

  const handlePrint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const validationError = validateForm(false);
    if (validationError) { setFormError(validationError); return; }
    setIsWorking(true);
    try {
      const { data } = await createQuotation();
      const blob = await salesQuotationApi.pdf(data.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation_${data.quotation_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(`Quotation ${data.quotation_number} downloaded.`);
    } catch (error: any) {
      setFormError(error?.response?.data?.message || error?.message || 'Could not generate quotation.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleSend = async () => {
    setFormError('');
    const validationError = validateForm(true);
    if (validationError) { setFormError(validationError); return; }
    setIsWorking(true);
    try {
      const { data } = await createQuotation();
      const response = await salesQuotationApi.send(data.id, form.emailAddress.trim());
      toast.success(response.message);
      onClose();
    } catch (error: any) {
      setFormError(error?.response?.data?.message || error?.message || 'Could not queue the quotation email.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center font-black">
              <LuFileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Generate Bus Charter Quotation</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{form.ratePlanName ? `${form.ratePlanName} · ` : ''}Branded quotation with route, rates, and VAT</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <LuX size={20} />
          </button>
        </div>

        <form onSubmit={handlePrint} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 custom-scrollbar">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Company / Client Name</label>
              <input
                type="text"
                value={form.groupCompanyName}
                onChange={e => setForm({ ...form, groupCompanyName: e.target.value })}
                placeholder="e.g. Vanguard Transport Service"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="e.g. Kate Dela Cruz"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email Address</label>
              <input
                type="email"
                value={form.emailAddress}
                onChange={e => setForm({ ...form, emailAddress: e.target.value })}
                placeholder="client@email.com"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Contact Number</label>
              <input
                type="text"
                value={form.contactNumber}
                onChange={e => setForm({ ...form, contactNumber: e.target.value })}
                placeholder="0917-000-0000"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Quotation Meta */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">QTN #</span>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Assigned when generated</p>
            </div>
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Date</span>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Generated when saved</p>
            </div>
          </div>

          {/* Particulars & Units Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Arrangements / Particulars</span>
              <button type="button" onClick={addItem} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <LuPlus size={14} /> Add Particular Line
              </button>
            </div>

            {form.items.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">Line Item {idx + 1}</span>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500">
                      <LuTrash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={item.startDate}
                      onChange={e => updateItem(idx, 'startDate', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Duration Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. Daytour, Pick and Drop, 2 Days"
                      value={item.duration}
                      onChange={e => updateItem(idx, 'duration', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">End Date (if multi-day)</label>
                  <input type="date" value={item.endDate || ''} onChange={e => updateItem(idx, 'endDate', e.target.value)} className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold" />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Pick-up Location</label>
                  <input
                    type="text"
                    value={item.pickupLocation}
                    onChange={e => updateItem(idx, 'pickupLocation', e.target.value)}
                    placeholder="e.g. DICT Headquarters, EDSA, Quezon City"
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Destination Point</label>
                  <input
                    type="text"
                    value={item.destination}
                    onChange={e => updateItem(idx, 'destination', e.target.value)}
                    placeholder="e.g. Any point within Clark, Pampanga"
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">QTY (Units)</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantityUnits}
                      onChange={e => updateItem(idx, 'quantityUnits', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Rate Per Unit (₱)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-black text-blue-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40">
            <span className="text-xs font-black text-red-700 dark:text-red-300 uppercase tracking-widest">Subtotal before VAT</span>
            <span className="text-2xl font-black text-red-600 dark:text-red-400">₱{form.grandTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">The saved PDF and email add the configured VAT and show the final total.</p>

          </div>
          <div className="shrink-0 border-t border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          {formError && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition sm:w-auto"
            >
              Cancel
            </button>
            <button type="button" onClick={handleSend} disabled={isWorking} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-800 disabled:opacity-50 sm:w-auto"><LuMail size={16} /> Send quotation email</button>
            <button
              type="submit"
              disabled={isWorking}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 sm:w-auto"
            >
              <LuPrinter size={16} /> {isWorking ? 'Generating…' : 'Generate quotation PDF'}
            </button>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}
