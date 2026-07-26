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
import { DataTable, type Column } from '../../components/ds';

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

  const columns: Column<any>[] = [
    {
      key: 'control_no',
      header: 'Control No.',
      render: (ticket) => <span className="font-medium text-slate-800">{ticket.control_no}</span>,
    },
    {
      key: 'date_of_travel',
      header: 'Travel Date',
      render: (ticket) => <span className="text-slate-600">{ticket.date_of_travel}</span>,
    },
    {
      key: 'drop_off',
      header: 'Destination',
      render: (ticket) => <span className="block text-slate-600 truncate max-w-[200px]">{ticket.drop_off}</span>,
    },
    {
      key: 'bus',
      header: 'Bus',
      render: (ticket) => <span className="text-slate-600">{ticket.bus?.plate_number || 'TBD'}</span>,
    },
    {
      key: 'driver',
      header: 'Driver',
      render: (ticket) => (
        <span className="text-slate-600">
          {ticket.driver ? `${ticket.driver.first_name} ${ticket.driver.last_name}` : 'TBD'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (ticket) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          {ticket?.status ? ticket.status.replace('_', ' ').toUpperCase() : 'N/A'}
        </span>
      ),
    },
  ];

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

      {/* ── Active Trips Table ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <LuGlobe className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Active Trips Overview</h2>
          </div>
        </div>
        
        <div className="p-0">
          <DataTable
            columns={columns}
            data={activeTickets}
            rowKey={(ticket) => ticket.id}
            empty={<div className="p-8 text-center text-slate-500">No active trips at the moment.</div>}
            className="border-0 rounded-none bg-transparent [&_table]:min-w-[800px]"
          />
        </div>
      </div>

      <RequestCommissionModal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} />
    </div>
  );
}
