import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LuX, LuBanknote, LuPlus, LuTrash2 } from 'react-icons/lu';
import client from '../../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface CommissionItem {
  source_type: string;
  source_id?: number | '';
  description: string;
  travel_date: string;
  destination: string;
  quantity: number;
  amount: number;
}

export function RequestCommissionModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [commissionerName, setCommissionerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const defaultItem: CommissionItem = { source_type: 'trip_ticket', source_id: '', description: '', travel_date: '', destination: '', quantity: 1, amount: 0 };
  const [items, setItems] = useState<CommissionItem[]>([{ ...defaultItem }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => client.post('/commissions', data).then((r: any) => r.data),
    onSuccess: () => {
      setSuccess('Commission request submitted successfully as draft.');
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setTimeout(() => {
        setSuccess('');
        onClose();
        // Reset form
        setCommissionerName('');
        setItems([{ ...defaultItem }]);
      }, 2000);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to submit commission request.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!commissionerName.trim()) {
      setError('Please provide a commissioner name.');
      return;
    }
    
    for (const item of items) {
      if (item.quantity < 1 || item.amount < 0) {
        setError('Please fill out all item fields correctly.');
        return;
      }
      if (item.source_type === 'trip_ticket' && (!item.travel_date || !item.destination)) {
        setError('Please provide travel date and destination for trips.');
        return;
      }
      if (item.source_type !== 'trip_ticket' && !item.description) {
        setError('Please provide a description for the commission source.');
        return;
      }
    }

    mutation.mutate({
      commissioner_name: commissionerName,
      date,
      items,
    });
  };

  const addItem = () => setItems([...items, { ...defaultItem }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <LuBanknote className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">Request Commission</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <LuX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="commission-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-red-700 bg-red-50 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 text-emerald-700 bg-emerald-50 rounded-lg">
                <p className="text-sm">{success}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commissioner Name</label>
                <input
                  type="text"
                  value={commissionerName}
                  onChange={(e) => setCommissionerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={mutation.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={mutation.isPending}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Commission Items</label>
                <button type="button" onClick={addItem} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <LuPlus className="w-3 h-3" /> Add Item
                </button>
              </div>
              
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <select
                        value={item.source_type}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].source_type = e.target.value;
                          setItems(newItems);
                        }}
                        className="w-full sm:w-auto px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        disabled={mutation.isPending}
                      >
                        <option value="trip_ticket">Trip Ticket</option>
                        <option value="sales_invoice">Sales / Invoice</option>
                        <option value="referral">Referral / Other</option>
                      </select>
                      
                      {item.source_type === 'trip_ticket' ? (
                        <>
                          <input
                            type="date"
                            value={item.travel_date}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].travel_date = e.target.value;
                              setItems(newItems);
                            }}
                            className="w-full sm:w-32 px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            disabled={mutation.isPending}
                            required
                          />
                          <input
                            type="text"
                            placeholder="Destination"
                            value={item.destination}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].destination = e.target.value;
                              setItems(newItems);
                            }}
                            className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            disabled={mutation.isPending}
                            required
                          />
                        </>
                      ) : (
                        <input
                          type="text"
                          placeholder="Description (e.g. Sold Fixed Package ID-123)"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].description = e.target.value;
                            setItems(newItems);
                          }}
                          className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          disabled={mutation.isPending}
                          required
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <input
                        type="number"
                        min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].quantity = parseInt(e.target.value) || 1;
                        setItems(newItems);
                      }}
                      className="w-16 px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={mutation.isPending}
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].amount = parseFloat(e.target.value) || 0;
                        setItems(newItems);
                      }}
                      className="w-24 px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={mutation.isPending}
                      required
                    />
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="commission-form"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
