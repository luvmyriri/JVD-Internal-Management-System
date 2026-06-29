import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuX, LuWrench } from 'react-icons/lu';
import { fleetApi } from '../../api/fleet';
import { workOrderApi } from '../../api/workOrders';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RequestMaintenanceModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [busId, setBusId] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'critical'>('routine');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch available buses
  const { data: busesRaw } = useQuery({
    queryKey: ['buses-for-maintenance'],
    queryFn: () => fleetApi.list({ per_page: 100 }).then(r => r.data),
    enabled: isOpen,
  });
  const buses = (busesRaw as any)?.data || [];

  const mutation = useMutation({
    mutationFn: (data: any) => workOrderApi.request(data),
    onSuccess: () => {
      setSuccess('Maintenance request submitted successfully! Pending validation.');
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setTimeout(() => {
        setSuccess('');
        onClose();
        // Reset form
        setBusId('');
        setPriority('routine');
        setDescription('');
      }, 2000);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to submit maintenance request.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!busId) {
      setError('Please select a bus.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description of the issue.');
      return;
    }

    mutation.mutate({
      bus_id: parseInt(busId),
      priority,
      description,
      type: 'maintenance',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <LuWrench className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Request Maintenance</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <LuX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Bus</label>
            <select
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={mutation.isPending}
            >
              <option value="">-- Choose a bus --</option>
              {buses.map((bus: any) => (
                <option key={bus.id} value={bus.id}>
                  {bus.plate_number} - {bus.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={mutation.isPending}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Issue Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue or requested maintenance..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={mutation.isPending}
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3">
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
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              {mutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
