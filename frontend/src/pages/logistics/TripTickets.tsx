import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { tripTicketApi } from '../../api/operations';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

import type { TripTicket } from '../../types';
import { Modal, Button } from '../../components/ui';
import { DataTable, TimeframeFilter, type Column, type DateRangeValue } from '../../components/ds';
import { useBuses } from '../../hooks/useFleet';
import { useUsers } from '../../hooks/useUsers';
import TripLocationMapPicker from '../../components/travel/TripLocationMapPicker';
import { printTripTicket } from './printTripTicket';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function TripTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  const isIntl = type === 'international';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
      isIntl
        ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/40'
        : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900/40'
    }`}>
      {isIntl ? 'International' : 'Domestic'}
    </span>
  );
}



import TripDrawer from '../../components/drawers/TripDrawer';

import TripTicketFormModal from './TripTicketFormModal';

export default function TripTickets() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [tripTypeFilter, setTripTypeFilter] = useState<'all' | 'domestic' | 'international'>('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [selectedTicket, setSelectedTicket] = useState<TripTicket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TripTicket | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['trip-tickets'],
    queryFn: () => tripTicketApi.getAll(),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const tickets: TripTicket[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.control_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.pick_up?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.drop_off?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tour_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tour_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.invoice?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.invoice?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sales_order_item?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = tripTypeFilter === 'all' || (t as any).trip_type === tripTypeFilter;
    const travel = (t.date_of_travel ?? '').slice(0, 10);
    const matchDate = (!dateRange.from || travel >= dateRange.from) && (!dateRange.to || travel <= dateRange.to);
    return matchSearch && matchType && matchDate;
  });

  const columns: Column<TripTicket>[] = [
    {
      key: 'control_no',
      header: 'Control No.',
      render: (ticket) => (
        <span className="font-bold text-gray-900 dark:text-white">{ticket.control_no}</span>
      ),
    },
    {
      key: 'date_of_travel',
      header: 'Travel Date',
      render: (ticket) => (
        <span className="text-gray-600 dark:text-gray-300">{ticket.date_of_travel}</span>
      ),
    },
    {
      key: 'origin',
      header: 'Origin',
      render: (ticket) => ticket.educational_tour_package_id ? (
        <div>
          <div className="font-bold text-blue-700 dark:text-blue-300">Educational Tour</div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">{ticket.tour_name}</div>
          <div className="text-xs text-gray-400">{ticket.tour_code}</div>
        </div>
      ) : ticket.sales_order_item ? (
        <div>
          <div className="font-bold text-blue-700 dark:text-blue-300">Sales handoff</div>
          <div className="text-xs text-gray-500">{ticket.invoice?.invoice_number || ticket.sales_order_item.order?.order_number}</div>
          <div className="max-w-48 truncate text-xs text-gray-400">{ticket.sales_order_item.title}</div>
        </div>
      ) : (
        <span className="text-xs font-semibold text-gray-500">Manual dispatch</span>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      render: (ticket) => (
        <>
          <div className="text-gray-900 dark:text-gray-300 font-medium">{ticket.pick_up}</div>
          <div className="text-gray-500 text-xs">to {ticket.drop_off}</div>
        </>
      ),
    },
    {
      key: 'bus_driver',
      header: 'Bus/Driver',
      render: (ticket) => (
        <div className="text-gray-600 dark:text-gray-300">
          <div>{ticket.bus?.plate_number || ticket.plate_no || 'TBA'}</div>
          <div className="text-xs text-gray-500">{ticket.driver?.name || 'TBA'}</div>
        </div>
      ),
    },
    {
      key: 'trip_type',
      header: 'Trip Type',
      render: (ticket) => <TripTypeBadge type={(ticket as any).trip_type} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (ticket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (ticket) => (
        <button onClick={() => setSelectedTicket(ticket)} className="px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer">
          Details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4 md:space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-blue-600 dark:text-blue-500 mb-2 uppercase tracking-widest">
            Logistics Module
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Trip Tickets</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="relative group w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search route or control no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-5 py-3 w-full sm:w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          {/* Trip Type Filter */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            {(['all', 'domestic', 'international'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setTripTypeFilter(t)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  tripTypeFilter === t
                    ? t === 'international'
                      ? 'bg-violet-600 text-white'
                      : t === 'domestic'
                        ? 'bg-teal-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'
                }`}>
                {t === 'international' ? 'International' : t === 'domestic' ? 'Domestic' : 'All'}
              </button>
            ))}
          </div>
          <TimeframeFilter value={dateRange} onChange={setDateRange} />
          {user?.role !== 'driver' && (
            <button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer">
              + New Trip Ticket
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <DataTable
          columns={columns}
          data={isLoading ? [] : filtered}
          rowKey={(ticket) => ticket.id}
          empty={
            isLoading ? (
              <div className="px-8 py-12 text-center text-gray-500">Loading trip tickets...</div>
            ) : (
              <div className="px-8 py-12 text-center text-gray-500">No trip tickets found.</div>
            )
          }
          className="border-0 rounded-none bg-transparent"
        />
      </div>

      {selectedTicket && (
        <TripDrawer
          ticket={selectedTicket}
          isOpen={true}
          onClose={() => setSelectedTicket(null)}
          onCustomizeApprove={setEditingTicket}
          onPrint={printTripTicket}
        />
      )}

      {showCreate && (
        <TripTicketFormModal onClose={() => setShowCreate(false)} />
      )}

      {editingTicket && (
        <TripTicketFormModal ticket={editingTicket} onClose={() => setEditingTicket(null)} />
      )}
    </div>
  );
}
