import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LuCalendarDays, LuMapPin, LuUsers, LuClock,
  LuChevronLeft, LuChevronRight, LuBus,
  LuCircleCheck, LuCircleDot, LuCircle,
} from 'react-icons/lu';
import { jobOrderApi } from '../../api/jobOrders';
import { fleetApi } from '../../api/fleet';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

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

function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon, end: sun };
}

function toYMD(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function DriverSchedule() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string>(toYMD(new Date()));

  const today = new Date();
  const anchorDate = new Date(today);
  anchorDate.setDate(today.getDate() + weekOffset * 7);
  const { start, end } = getWeekRange(anchorDate);

  // Fetch driver's assigned bus
  const { data: busRes } = useQuery({
    queryKey: ['driver-bus'],
    queryFn: async () => {
      const res = await fleetApi.list({ per_page: 999 });
      // find the bus where assigned_driver matches current user
      const buses = res.data?.data ?? [];
      return buses.find((b: any) => b.driver?.id === (user as any)?.id) ?? null;
    },
  });

  // Fetch job orders for the visible week
  const { data: joRes, isLoading, refetch } = useQuery({
    queryKey: ['driver-schedule', toYMD(start), toYMD(end)],
    queryFn: async () => {
      const res = await jobOrderApi.list({
        date_from: toYMD(start),
        date_to: toYMD(end),
        per_page: 100,
      });
      return res.data?.data ?? [];
    },
  });

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

  const trips: any[] = joRes ?? [];

  // Build day → trips map
  const dayMap: Record<string, any[]> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dayMap[toYMD(d)] = [];
  }
  trips.forEach(t => {
    if (t.service_date) {
      const d = new Date(t.service_date);
      const dateKey = toYMD(d);
      if (dayMap[dateKey]) {
        dayMap[dateKey].push(t);
      }
    }
  });

  const days = Object.entries(dayMap);
  const selectedTrips = dayMap[selectedDay] ?? [];
  const todayStr = toYMD(today);

  const isCurrentWeek = weekOffset === 0;
  const weekLabel = isCurrentWeek
    ? 'This Week'
    : weekOffset === 1
    ? 'Next Week'
    : weekOffset === -1
    ? 'Last Week'
    : `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">My Schedule</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">
            {today.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Bus badge */}
        {busRes && (
          <div className="flex items-center gap-3 px-5 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <LuBus size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Assigned Bus</p>
              <p className="font-black text-indigo-700 dark:text-indigo-300 text-sm">
                {(busRes as any).plate_number} · {(busRes as any).model}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Week navigator */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="w-9 h-9 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <LuChevronLeft size={18} />
          </button>
          <div className="text-center">
            <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{weekLabel}</span>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-0.5">
              {start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="w-9 h-9 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <LuChevronRight size={18} />
          </button>
        </div>

        {/* Day pills */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(([dateStr, dayTrips]) => {
            const d = new Date(dateStr + 'T00:00:00');
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDay(dateStr)}
                className={cn(
                  'flex flex-col items-center py-3 rounded-2xl transition-all font-medium relative',
                  isSelected
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-300/30'
                    : isToday
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {d.toLocaleDateString('en', { weekday: 'short' })}
                </span>
                <span className="text-lg font-black mt-0.5">{d.getDate()}</span>
                {dayTrips.length > 0 && (
                  <span className={cn(
                    'text-[10px] font-black mt-1 w-5 h-5 rounded-full flex items-center justify-center',
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'
                  )}>
                    {dayTrips.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day trips */}
      <div>
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
          {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          {selectedTrips.length > 0 && ` · ${selectedTrips.length} trip${selectedTrips.length > 1 ? 's' : ''}`}
        </h2>

        {isLoading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading schedule…</p>
          </div>
        ) : selectedTrips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] py-16 text-center"
          >
            <LuCalendarDays size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" strokeWidth={1.5} />
            <p className="text-sm font-bold text-gray-400">No trips scheduled for this day</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Check another day or wait for your dispatcher</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {selectedTrips.map((trip: any, idx: number) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.05 }}
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

                      <p className="font-black text-gray-900 dark:text-white text-base">
                        {trip.jo_number}
                      </p>

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
                        <LuClock size={13} />
                        <span>{trip.service_date}</span>
                      </div>
                      {trip.bus && (
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-widest">
                          {trip.bus.plate_number}
                        </span>
                      )}
                      {trip.status === 'confirmed' && (
                        <button
                          onClick={() => startMutation.mutate(trip.id)}
                          disabled={startMutation.isPending}
                          className="mt-2 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          Start Trip
                        </button>
                      )}
                      {trip.status === 'in_progress' && (
                        <button
                          onClick={() => completeMutation.mutate(trip.id)}
                          disabled={completeMutation.isPending}
                          className="mt-2 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          Complete Trip
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
