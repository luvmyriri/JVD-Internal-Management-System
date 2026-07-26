import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LuBanknote,
  LuGlobe,
  LuBus,
  LuTicket,
  LuWrench,
} from 'react-icons/lu';

import { tripTicketApi } from '../../api/operations';
import { fleetApi } from '../../api/fleet';
import { LoadingScreen, RequestMaintenanceModal, RequestCommissionModal } from '../../components/ui';
import { DataTable, type Column } from '../../components/ds';

export default function LogisticsDashboard() {
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // ── Live API Queries ──────────────────────────────────────────────────────

  const { data: ticketsRaw } = useQuery({
    queryKey: ['trip-tickets-logistics'],
    queryFn: tripTicketApi.getAll,
    staleTime: 1000 * 60 * 2,
  });

  const { data: busesRaw } = useQuery({
    queryKey: ['buses-logistics'],
    queryFn: () => fleetApi.list({ per_page: 100 }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const tickets = (ticketsRaw as any[]) ?? [];
  const buses   = (busesRaw as any)?.data ?? [];

  const activeTickets = tickets.filter(t => t.status === 'in_progress');
  const upcomingTickets = tickets.filter(t => t.status === 'confirmed');

  const busesUnderMaintenance = useMemo(() => {
    return buses.filter((b: any) => b.status === 'under_maintenance');
  }, [buses]);

  const [activeTab, setActiveTab] = useState('active'); // active, upcoming

  if (!ticketsRaw || !busesRaw) return <LoadingScreen />;

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
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          ticket?.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
          ticket?.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }`}>
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
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Logistics & Dispatch</h1>
          <p className="text-slate-500 mt-1">Manage fleet dispatching, trip tickets, and maintenance.</p>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => setShowMaintenanceModal(true)}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <LuWrench className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Request Maintenance</h3>
          <p className="text-sm text-slate-500 text-center mt-1">Report a bus issue or request routine checkup.</p>
        </button>

        <button 
          onClick={() => setShowCommissionModal(true)}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group"
        >
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <LuBanknote className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Request Commission</h3>
          <p className="text-sm text-slate-500 text-center mt-1">Submit a draft commission request.</p>
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Under Maintenance</p>
              <h3 className="text-3xl font-bold text-slate-800">{busesUnderMaintenance.length}</h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl">
              <LuWrench className="w-6 h-6 text-rose-600" />
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
              <LuTicket className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Trip Tickets ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <LuGlobe className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Trip Tickets Dashboard</h2>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'active' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Active Trips
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'upcoming' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Upcoming Trips
            </button>
          </div>
        </div>
        
        <div className="p-0 flex-1">
          <DataTable
            columns={columns}
            data={activeTab === 'active' ? activeTickets : upcomingTickets}
            rowKey={(ticket) => ticket.id}
            empty={<div className="p-8 text-center text-slate-500">No {activeTab} tickets found.</div>}
            className="border-0 rounded-none bg-transparent [&_table]:min-w-[800px]"
          />
        </div>
      </div>

      <RequestMaintenanceModal isOpen={showMaintenanceModal} onClose={() => setShowMaintenanceModal(false)} />
      <RequestCommissionModal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} />
    </div>
  );
}
