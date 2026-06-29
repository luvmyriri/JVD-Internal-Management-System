import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LuGlobe,
  LuBus,
  LuBanknote,
} from 'react-icons/lu';

import { dashboardApi } from '../../api/dashboards';
import { tripTicketApi } from '../../api/operations';
import { fleetApi } from '../../api/fleet';
import { LoadingScreen, RequestCommissionModal } from '../../components/ui';

export default function OperationsDashboard() {
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // ── Live API Queries ──────────────────────────────────────────────────────
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: dashboardApi.getAdmin,
    staleTime: 1000 * 60 * 2,
  });

  const { data: ticketsRaw } = useQuery({
    queryKey: ['trip-tickets-ops'],
    queryFn: tripTicketApi.getAll,
    staleTime: 1000 * 60 * 2,
  });

  const { data: busesRaw } = useQuery({
    queryKey: ['buses-ops'],
    queryFn: () => fleetApi.list({ per_page: 100 }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const tickets = (ticketsRaw as any[]) ?? [];
  const buses   = (busesRaw as any)?.data ?? [];
  const kpis    = dashboardData?.kpis ?? {};

  const activeTickets = tickets.filter(t => t.status === 'in_progress');
  
  if (isLoading) return <LoadingScreen />;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Operations Overview</h1>
          <p className="text-slate-500 mt-1">High-level view of active trips, fleet status, and business performance.</p>
        </div>
        <button 
          onClick={() => setShowCommissionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors"
        >
          <LuBanknote className="w-5 h-5" />
          Request Commission
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Fleet</p>
              <h3 className="text-3xl font-bold text-slate-800">{buses.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <LuBus className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Trips</p>
              <h3 className="text-3xl font-bold text-slate-800">{activeTickets.length}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <LuGlobe className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Monthly Revenue</p>
              <h3 className="text-3xl font-bold text-slate-800">{kpis.monthly_revenue || '₱0'}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl">
              <LuBanknote className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      <RequestCommissionModal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} />
    </div>
  );
}
