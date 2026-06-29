import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuWrench,
  LuBanknote,
  LuBus
} from 'react-icons/lu';

import { workOrderApi } from '../../api/workOrders';
import { fleetApi } from '../../api/fleet';
import { LoadingScreen, RequestCommissionModal } from '../../components/ui';

export default function MaintenanceDashboard() {
  const queryClient = useQueryClient();
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [actionError, setActionError] = useState('');

  // ── Live API Queries ──────────────────────────────────────────────────────

  const { data: workOrdersRaw } = useQuery({
    queryKey: ['work-orders-maintenance'],
    queryFn: () => workOrderApi.list({ per_page: 100 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  });

  const { data: busesRaw } = useQuery({
    queryKey: ['buses-maintenance'],
    queryFn: () => fleetApi.list({ per_page: 100 }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const workOrders = (workOrdersRaw as any)?.data ?? [];
  const buses   = (busesRaw as any)?.data ?? [];

  const pendingValidations = workOrders.filter((wo: any) => wo.status === 'pending_validation' || wo.status === 'pending_approval');
  const activeWorkOrders = workOrders.filter((wo: any) => wo.status === 'open' || wo.status === 'in_progress');
  
  const busesUnderMaintenance = useMemo(() => {
    return buses.filter((b: any) => b.status === 'under_maintenance');
  }, [buses]);

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: (id: number) => workOrderApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders-maintenance'] });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message || 'Failed to validate request.');
      setTimeout(() => setActionError(''), 3000);
    }
  });

  if (!workOrdersRaw || !busesRaw) return <LoadingScreen />;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Maintenance & Service</h1>
          <p className="text-slate-500 mt-1">Validate maintenance requests and track active work orders.</p>
        </div>
        <button 
          onClick={() => setShowCommissionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors"
        >
          <LuBanknote className="w-5 h-5" />
          Request Commission
        </button>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-4 text-red-700 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm font-medium">{actionError}</p>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending Validations</p>
              <h3 className="text-3xl font-bold text-slate-800">{pendingValidations.length}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <span className="w-6 h-6 text-amber-600 block rounded-full border-2 border-amber-600"></span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Work Orders</p>
              <h3 className="text-3xl font-bold text-slate-800">{activeWorkOrders.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <LuWrench className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Buses Offline</p>
              <h3 className="text-3xl font-bold text-slate-800">{busesUnderMaintenance.length}</h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl">
              <LuBus className="w-6 h-6 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Pending Validations ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <span className="w-5 h-5 block rounded-full border-2 border-amber-600"></span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Pending Maintenance Requests</h2>
          </div>
        </div>
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 pl-6">WO Number</th>
                <th className="p-4">Bus</th>
                <th className="p-4">Description</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {pendingValidations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No pending validations at the moment.</td>
                </tr>
              ) : (
                pendingValidations.map((wo: any) => (
                  <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-medium text-slate-800">{wo.wo_number}</td>
                    <td className="p-4 text-slate-600">{wo.bus?.plate_number}</td>
                    <td className="p-4 text-slate-600 truncate max-w-[300px]">{wo.description}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        wo.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        wo.priority === 'urgent' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {wo.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{wo.status.replace('_', ' ')}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => validateMutation.mutate(wo.id)}
                        disabled={validateMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {validateMutation.isPending ? 'Validating...' : 'Validate & Request'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RequestCommissionModal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} />
    </div>
  );
}
