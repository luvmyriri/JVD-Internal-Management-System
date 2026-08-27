import { useState } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import { jobOrderApi } from '../../api/jobOrders';
import { tripTicketApi } from '../../api/operations';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils';
import toast from 'react-hot-toast';
import { printTripTicket } from '../logistics/printTripTicket';

const SERVICE_LABELS: Record<string, string> = {
  bus_rental: 'Bus Rental', field_trip: 'Field Trip',
  corporate_transport: 'Corporate Transport', travel_package: 'Travel Package',
  event: 'Event', maintenance: 'Maintenance',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  confirmed: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  in_progress: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
};



const STATUSES = ['all', 'confirmed', 'in_progress', 'completed', 'cancelled', 'draft'];

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



function TripTicketDetailModal({ ticket, onClose }: { ticket: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Ticket #{ticket.control_no}</h2>
            {ticket.tour_name && (
              <p className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                {ticket.tour_name}{ticket.tour_code ? ` · ${ticket.tour_code}` : ''}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={ticket.status} />
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold text-sm">
            ✕
          </button>
        </div>

        <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Date</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ticket.date_of_travel}</h3>
              {ticket.duration && <p className="text-xs text-gray-500 mt-1">{ticket.duration}</p>}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passengers</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ticket.no_of_passengers} pax</h3>
              {ticket.passenger_name && <p className="text-xs text-gray-500 mt-1">{ticket.passenger_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Route</p>
              <div className="mt-2 space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 shadow-sm z-10" />
                    <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-800" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Pick Up</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.pick_up}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 shadow-sm" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Drop Off</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.drop_off}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle & Driver</p>
              <div className="mt-2 space-y-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.bus?.plate_number || ticket.plate_no || 'TBA'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.driver?.name || (ticket.driver ? `${ticket.driver.first_name} ${ticket.driver.last_name}` : 'TBA')}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Allowances</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-sm text-gray-500">Meal</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.meal_allowance?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-sm text-gray-500">Diesel</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.diesel?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-250 dark:border-gray-700 pb-2">
                <span className="text-sm text-gray-500">SOP</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.sop?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-sm text-gray-500">Tolls</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {((ticket.easy_trip || 0) + (ticket.autosweep || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
          <button
            onClick={() => printTripTicket(ticket)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 border border-blue-500/20"
          >
            Print DTT
          </button>
          <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriverTrips() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const params: Record<string, any> = { per_page: 15, page };
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data, isLoading, isPlaceholderData, refetch } = useQuery({
    queryKey: ['driver-trips', statusFilter, page],
    queryFn: async () => {
      const res = await jobOrderApi.list(params);
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const { data: ticketsRes, refetch: refetchTickets } = useQuery({
    queryKey: ['trip-tickets-driver-all'],
    queryFn: () => tripTicketApi.getAll(),
    staleTime: 10_000,
  });

  const tickets = (ticketsRes as any) ?? [];

  const startMutation = useMutation({
    mutationFn: (id: number) => jobOrderApi.start(id),
    onSuccess: () => {
      toast.success('Trip started!');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to start trip.');
    }
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => jobOrderApi.complete(id),
    onSuccess: () => {
      toast.success('Trip completed!');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to complete trip.');
    }
  });

  const requestDttMutation = useMutation({
    mutationFn: async (trip: any) => {
      const payload = {
        control_no: '',
        issue_date: new Date().toISOString().split('T')[0],
        date_of_travel: trip.service_date?.split('T')[0],
        pick_up: 'TBA',
        drop_off: trip.destination || 'TBA',
        bus_id: trip.bus_id,
        plate_no: trip.bus?.plate_number || '',
        no_of_passengers: trip.passengers?.length || 1,
        driver_id: user?.id,
        meal_allowance: 0,
        diesel: 0,
        sop: 0,
        easy_trip: 0,
        autosweep: 0,
        trip_type: 'domestic',
      };
      return tripTicketApi.create(payload);
    },
    onSuccess: () => {
      toast.success('DTT requested successfully!');
      refetchTickets();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to request DTT.');
    }
  });

  const allJos = data?.data ?? [];
  const meta = data?.meta ?? null;

  const combinedTrips: any[] = [
    ...allJos.map((jo: any) => ({ ...jo, _is_jo: true, sortDate: new Date(jo.service_date).getTime() })),
    ...tickets.map((t: any) => ({ ...t, _is_ticket: true, sortDate: new Date(t.date_of_travel).getTime() }))
  ].sort((a, b) => b.sortDate - a.sortDate);

  // Client-side search on destination / jo_number / control_no / customer name
  const filtered = search.trim()
    ? combinedTrips.filter(t => {
        const q = search.toLowerCase();
        return (
          t.jo_number?.toLowerCase().includes(q) ||
          t.control_no?.toLowerCase().includes(q) ||
          t.tour_name?.toLowerCase().includes(q) ||
          t.tour_code?.toLowerCase().includes(q) ||
          t.destination?.toLowerCase().includes(q) ||
          t.pick_up?.toLowerCase().includes(q) ||
          t.drop_off?.toLowerCase().includes(q) ||
          `${t.customer?.first_name || ''} ${t.customer?.last_name || ''}`.toLowerCase().includes(q)
        );
      })
    : combinedTrips;

  // Filter by status if not "all"
  const finallyFiltered = statusFilter !== 'all' 
    ? filtered.filter(t => (t.status || 'draft') === statusFilter)
    : filtered;

  // Summary counts (use finallyFiltered or combinedTrips? typically all trips for summary)
  const completedCount = combinedTrips.filter(t => t.status === 'completed').length;
  const upcoming = combinedTrips.filter(t => ['confirmed', 'draft'].includes(t.status || 'draft')).length;
  const inProgress = combinedTrips.filter(t => t.status === 'in_progress').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">My Trips</h1>
        <p className="text-gray-400 text-sm font-medium mt-1">Full history of your assigned trips and Driver's Trip Tickets (DTT)</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completed', value: completedCount, from: 'from-emerald-400', to: 'to-emerald-600', shadow: 'shadow-emerald-300/30 dark:shadow-emerald-900/30' },
          { label: 'Upcoming', value: upcoming, from: 'from-blue-500', to: 'to-blue-700', shadow: 'shadow-blue-300/30 dark:shadow-blue-900/30' },
          { label: 'In Progress', value: inProgress, from: 'from-amber-400', to: 'to-orange-600', shadow: 'shadow-amber-300/30 dark:shadow-amber-900/30' },
        ].map(s => (
          <div key={s.label} className={`relative overflow-hidden bg-gradient-to-br ${s.from} ${s.to} text-white rounded-[2rem] p-5 flex flex-col justify-center shadow-lg ${s.shadow} hover:scale-[1.02] transition-all`}>
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by JO#, destination, or customer…"
            className="w-full px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                'px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                statusFilter === s
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-300/30'
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50'
              )}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Trip list */}
      <div className="relative min-h-[200px]">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <div className={`transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
          {isLoading || (ticketsRes === undefined) ? (
            <div className="py-16 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Loading trips…</p>
            </div>
          ) : finallyFiltered.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] py-16 text-center">
              <p className="text-sm font-bold text-gray-400">No trips found</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Try a different filter or check back later</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {finallyFiltered.map((trip: any, idx: number) => {
                  const ticket = trip._is_ticket ? trip : (tickets.find((t: any) => {
                    const tDate = t.date_of_travel?.split('T')[0];
                    return tDate === trip.service_date?.split('T')[0] && (t.bus_id === trip.bus_id || t.driver_id === user?.id);
                  }));

                  return (
                    <motion.div
                      key={`${trip._is_jo ? 'jo' : 't'}-${trip.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all select-none relative overflow-hidden",
                        ticket 
                          ? "cursor-pointer hover:border-blue-500/30 hover:bg-blue-50/5 dark:hover:bg-blue-500/5" 
                          : ""
                      )}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        if (ticket) setSelectedTicket(ticket);
                      }}
                      title={ticket ? "Click to view DTT" : undefined}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className={cn('px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest', STATUS_COLOR[trip.status] ?? STATUS_COLOR['draft'])}>
                              {(trip.status || 'draft').replace('_', ' ')}
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-700">
                              {trip._is_jo ? (SERVICE_LABELS[trip.service_type] ?? trip.service_type) : 'Travel Trip'}
                            </span>
                            
                            {ticket ? (
                              <span className="inline-flex px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">
                                DTT: {ticket.control_no}
                              </span>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest border border-dashed border-gray-200 dark:border-gray-700">
                                No DTT (Click Request below)
                              </span>
                            )}
                          </div>

                          <p className="font-black text-gray-900 dark:text-white text-base">
                            {trip._is_jo ? trip.jo_number : trip.control_no}
                          </p>
                          {trip._is_ticket && trip.tour_name && (
                            <p className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                              {trip.tour_name}{trip.tour_code ? ` · ${trip.tour_code}` : ''}
                            </p>
                          )}

                          <div className="flex items-center mt-2 text-gray-500 dark:text-gray-400 text-sm">
                            <span className="font-bold text-xs uppercase tracking-wider text-blue-500 mr-2">Route:</span>
                            <span className="font-medium">
                              {trip._is_jo ? trip.destination : `${trip.pick_up} → ${trip.destination && trip.destination !== 'TBD' ? trip.destination : trip.drop_off}`}
                            </span>
                          </div>
                          {trip.customer && (
                            <div className="flex items-center mt-1.5 text-gray-500 dark:text-gray-400 text-sm">
                              <span className="font-bold text-xs uppercase tracking-wider text-emerald-500 mr-2">Client:</span>
                              <span className="font-medium">{trip.customer.first_name} {trip.customer.last_name}</span>
                            </div>
                          )}
                          {trip._is_ticket && trip.passenger_name && (
                            <div className="flex items-center mt-1.5 text-gray-500 dark:text-gray-400 text-sm">
                              <span className="font-bold text-xs uppercase tracking-wider text-emerald-500 mr-2">Pax:</span>
                              <span className="font-medium">{trip.no_of_passengers} pax - {trip.passenger_name}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col justify-between items-end gap-4 shrink-0 min-w-[125px]">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="text-gray-500 dark:text-gray-400 text-xs font-bold">
                              Date: {trip._is_jo ? trip.service_date?.split('T')[0] : trip.date_of_travel?.split('T')[0]}
                            </div>
                            {(trip.bus || ticket?.bus) && (
                              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-wider border border-indigo-100/10">
                                {trip.bus?.plate_number || ticket?.bus?.plate_number || ticket?.plate_no}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2 w-full">
                            {ticket ? (
                              <button
                                onClick={() => setSelectedTicket(ticket)}
                                className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-650 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/15 active:scale-95 flex items-center justify-center cursor-pointer font-bold"
                              >
                                View DTT
                              </button>
                            ) : (
                              <button
                                onClick={() => requestDttMutation.mutate(trip)}
                                disabled={requestDttMutation.isPending}
                                className="w-full py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer font-bold"
                              >
                                {requestDttMutation.isPending ? 'Requesting...' : 'Request DTT'}
                              </button>
                            )}

                            {['confirmed', 'draft'].includes(trip.status || 'draft') && (
                              <button
                                onClick={() => {
                                  if (trip._is_jo) startMutation.mutate(trip.id);
                                  else {
                                    tripTicketApi.update(trip.id, { status: 'in_progress' as any }).then(() => {
                                      toast.success('Trip started!');
                                      refetchTickets();
                                    });
                                  }
                                }}
                                disabled={trip._is_jo ? startMutation.isPending : false}
                                className="w-full py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-blue-500/15 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                Start Trip
                              </button>
                            )}
                            
                            {trip.status === 'in_progress' && (
                              <button
                                onClick={() => {
                                  if (trip._is_jo) completeMutation.mutate(trip.id);
                                  else {
                                    tripTicketApi.update(trip.id, { status: 'completed' }).then(() => {
                                      toast.success('Trip completed!');
                                      refetchTickets();
                                    });
                                  }
                                }}
                                disabled={trip._is_jo ? completeMutation.isPending : false}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-emerald-500/15 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                Complete Trip
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-bold disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm font-bold text-gray-500">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <button
            onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
            disabled={page === meta.last_page}
            className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-bold disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {selectedTicket && (
        <TripTicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}
