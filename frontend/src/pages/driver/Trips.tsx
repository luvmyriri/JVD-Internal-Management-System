import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuMapPin, LuUsers, LuSearch,
  LuCircleCheck, LuCircleDot, LuCircle,
  LuCalendar, LuTrendingUp, LuRoute,
} from 'react-icons/lu';
import { jobOrderApi } from '../../api/jobOrders';
import { cn } from '../../utils';

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
const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <LuCircle size={12} />, confirmed: <LuCircleDot size={12} />,
  in_progress: <LuCircleDot size={12} />, completed: <LuCircleCheck size={12} />,
  cancelled: <LuCircle size={12} />,
};
const STATUSES = ['all', 'confirmed', 'in_progress', 'completed', 'cancelled', 'draft'];

export default function DriverTrips() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params: Record<string, any> = { per_page: 15, page };
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['driver-trips', statusFilter, page],
    queryFn: async () => {
      const res = await jobOrderApi.list(params);
      return res.data;
    },
  });

  const trips: any[] = data?.data ?? [];
  const meta = data?.meta;

  // Client-side search on destination / jo_number / customer name
  const filtered = search.trim()
    ? trips.filter(t => {
        const q = search.toLowerCase();
        return (
          t.jo_number?.toLowerCase().includes(q) ||
          t.destination?.toLowerCase().includes(q) ||
          `${t.customer?.first_name} ${t.customer?.last_name}`.toLowerCase().includes(q)
        );
      })
    : trips;

  // Summary counts
  const completed = trips.filter(t => t.status === 'completed').length;
  const upcoming = trips.filter(t => ['confirmed', 'draft'].includes(t.status)).length;
  const inProgress = trips.filter(t => t.status === 'in_progress').length;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">My Trips</h1>
        <p className="text-gray-400 text-sm font-medium mt-1">Full history of your assigned trips</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completed', value: completed, icon: <LuCircleCheck size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Upcoming', value: upcoming, icon: <LuCalendar size={20} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'In Progress', value: inProgress, icon: <LuTrendingUp size={20} />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', s.bg, s.color)}>{s.icon}</div>
            <div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <LuSearch size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by JO#, destination, or customer…"
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Loading trips…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] py-16 text-center">
          <LuRoute size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" strokeWidth={1.5} />
          <p className="text-sm font-bold text-gray-400">No trips found</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Try a different filter or check back later</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((trip: any, idx: number) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest', STATUS_COLOR[trip.status])}>
                        {STATUS_ICON[trip.status]}
                        {trip.status.replace('_', ' ')}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-700">
                        {SERVICE_LABELS[trip.service_type] ?? trip.service_type}
                      </span>
                    </div>

                    <p className="font-black text-gray-900 dark:text-white text-base">{trip.jo_number}</p>

                    {trip.destination && (
                      <div className="flex items-center gap-1.5 mt-2 text-gray-500 dark:text-gray-400 text-sm">
                        <LuMapPin size={14} className="shrink-0 text-blue-400" />
                        <span className="font-medium">{trip.destination}</span>
                      </div>
                    )}
                    {trip.customer && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 dark:text-gray-400 text-sm">
                        <LuUsers size={14} className="shrink-0 text-emerald-400" />
                        <span className="font-medium">{trip.customer.first_name} {trip.customer.last_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                      <LuCalendar size={13} />
                      <span>{trip.service_date?.split('T')[0]}</span>
                    </div>
                    {trip.bus && (
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-widest">
                        {trip.bus.plate_number}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

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
    </div>
  );
}
