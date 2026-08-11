import { useState } from 'react';
import { LuPrinter, LuX, LuPlus, LuTrash2, LuFileText } from 'react-icons/lu';
import { openBusCharterQuotationPrintWindow, type BusCharterQuotationData } from '../busCharterQuotationPdf';

interface BusCharterQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<BusCharterQuotationData>;
}

export default function BusCharterQuotationModal({ isOpen, onClose, initialData }: BusCharterQuotationModalProps) {
  const [form, setForm] = useState<BusCharterQuotationData>({
    quotationNumber: initialData?.quotationNumber || `QTN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    quotationDate: initialData?.quotationDate || new Date().toISOString().split('T')[0],
    groupCompanyName: initialData?.groupCompanyName || '',
    contactPerson: initialData?.contactPerson || '',
    emailAddress: initialData?.emailAddress || '',
    contactNumber: initialData?.contactNumber || '',
    items: initialData?.items && initialData.items.length > 0 ? initialData.items : [{
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      pickupLocation: 'DICT Headquarters, Quezon City',
      destination: 'Any point within Clark, Pampanga',
      duration: 'Pick and Drop',
      quantityUnits: 1,
      unitPrice: 27000,
      totalPrice: 27000,
    }],
    grandTotal: initialData?.grandTotal || 27000,
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
        unitPrice: 27000,
        totalPrice: 27000,
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

  const handlePrint = (e: React.FormEvent) => {
    e.preventDefault();
    openBusCharterQuotationPrintWindow(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center font-black">
              <LuFileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Generate Bus Charter Quotation</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">JVD Official 2-Page Quotation PDF Blueprint</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <LuX size={20} />
          </button>
        </div>

        <form onSubmit={handlePrint} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Company / Client Name *</label>
              <input
                type="text"
                required
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
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">QTN #</label>
              <input
                type="text"
                value={form.quotationNumber}
                onChange={e => setForm({ ...form, quotationNumber: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Date</label>
              <input
                type="date"
                value={form.quotationDate}
                onChange={e => setForm({ ...form, quotationDate: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
              />
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
            <span className="text-xs font-black text-red-700 dark:text-red-300 uppercase tracking-widest">Grand Total Quotation Amount</span>
            <span className="text-2xl font-black text-red-600 dark:text-red-400">₱{form.grandTotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg shadow-red-600/30"
            >
              <LuPrinter size={16} /> Generate &amp; Print Quotation PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
