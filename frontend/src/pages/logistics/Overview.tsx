import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { LuChevronLeft, LuChevronRight, LuBus } from 'react-icons/lu';

import { useUsers } from '../../hooks/useUsers';
import { useBuses } from '../../hooks/useFleet';
import { tripTicketApi } from '../../api/operations';
import { fleetApi } from '../../api/fleet';
import BusLayout from '../../components/ui/BusLayout';
import type { TripTicket } from '../../types';
import { cn, fullName } from '../../utils';
import { EmployeeName } from '../../components/ds';
import { StatusBadge } from './StatusBadge';
import { MONTH_NAMES } from './monthNames';
import { printTripTicket } from './printTripTicket';
import TripTicketDetailModal from './TripTicketDetailModal';
import CalendarDayDetailModal from './CalendarDayDetailModal';
import FleetCalendarView from './FleetCalendarView';

export default function LogisticsOverview() {
  const [activeTab, setActiveTab] = useState<'drivers' | 'trips' | 'fleet'>('drivers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TripTicket | null>(null);

  // Fleet & Calendar States
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{ day: number; entries: any[] } | null>(null);

  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  // Fetch all users with driver role
  const { data: usersData, isLoading: isDriversLoading } = useUsers({
    role: 'driver',
    per_page: 999,
  });
  const driversList = usersData?.data || [];

  // Fetch all fleet buses
  const { data: busesData } = useBuses({ per_page: 999 });
  const buses = busesData?.data || [];

  // Fetch calendar data for selected bus
  const { data: calendarRes } = useQuery({
    queryKey: ['bus-calendar', selectedBusId, calendarMonth, calendarYear],
    queryFn: () => fleetApi.getCalendar(selectedBusId!, { month: calendarMonth, year: calendarYear }),
    enabled: !!selectedBusId,
  });
  const calendarData = calendarRes?.data?.data || [];

  // Fetch all trip tickets — uses same queryKey as TripTickets.tsx for cross-page invalidation
  const { data: tripsData, isLoading: isTripsLoading } = useQuery<TripTicket[]>({
    queryKey: ['trip-tickets'],
    queryFn: () => tripTicketApi.getAll(),
    placeholderData: keepPreviousData,
  });
  const tripsList = tripsData || [];

  // Filtered lists
  const filteredDrivers = driversList.filter((driver: any) => {
    // Standard driver filter: check if they are under 'Logistics' department or role matches
    const name = `${driver.first_name} ${driver.last_name}`.toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || driver.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredTrips = tripsList.filter((trip) => {
    const search = searchQuery.toLowerCase();
    return (
      trip.control_no.toLowerCase().includes(search) ||
      trip.pick_up.toLowerCase().includes(search) ||
      trip.drop_off.toLowerCase().includes(search) ||
      (trip.driver?.name && trip.driver.name.toLowerCase().includes(search))
    );
  });

  const filteredBuses = buses.filter((bus: any) => {
    const search = searchQuery.toLowerCase();
    return (
      bus.plate_number.toLowerCase().includes(search) ||
      bus.model.toLowerCase().includes(search) ||
      (bus.driver ? `${bus.driver.first_name} ${bus.driver.last_name}`.toLowerCase().includes(search) : false)
    );
  });

  // Calculate statistics
  const totalDrivers = driversList.length;
  const activeBuses = buses.filter(b => b.status === 'available' || b.status === 'in_service').length;
  const ongoingTrips = tripsList.filter(t => t.status === 'approved').length;
  const completedTrips = tripsList.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
              Department Core
            </span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
              Fleet & Crew Operations
            </p>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mt-2">
            Logistics Control
          </h1>
        </div>
      </div>

      {/* KPI Cards section with Harmony HSL Glow Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Captains', value: totalDrivers, desc: 'Drivers under Logistics Dept', from: 'from-blue-500', to: 'to-blue-700', shadow: 'shadow-blue-500/10' },
          { label: 'Active Fleet', value: activeBuses, desc: 'Buses assigned & on duty', from: 'from-indigo-500', to: 'to-indigo-700', shadow: 'shadow-indigo-500/10' },
          { label: 'Ongoing Trips', value: ongoingTrips, desc: 'Trips currently dispatched', from: 'from-amber-500', to: 'to-amber-700', shadow: 'shadow-amber-500/10' },
          { label: 'Completed Jobs', value: completedTrips, desc: 'Successfully finalized trips', from: 'from-emerald-500', to: 'to-emerald-700', shadow: 'shadow-emerald-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn(
              "relative overflow-hidden rounded-[2.2rem] p-6 bg-gradient-to-br text-white shadow-xl flex flex-col justify-between group hover:scale-[1.02] hover:shadow-2xl transition-all duration-300",
              stat.from, stat.to, stat.shadow
            )}
          >
            {/* Background elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-md pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5 blur-md pointer-events-none" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black tracking-tight">{stat.value}</h3>
              <p className="text-[10px] opacity-80 mt-1.5 font-medium">{stat.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Tab Controller & Tables Card */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Custom styled tab switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700 p-1.5 rounded-[1.6rem] shadow-sm select-none">
            <button
              onClick={() => { setActiveTab('drivers'); setSearchQuery(''); setSelectedBusId(null); }}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                activeTab === 'drivers'
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-md shadow-gray-200/50 dark:shadow-black/20"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              Driver Directory
            </button>
            <button
              onClick={() => { setActiveTab('trips'); setSearchQuery(''); setSelectedBusId(null); }}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                activeTab === 'trips'
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-md shadow-gray-200/50 dark:shadow-black/20"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              Scheduled Trips
            </button>
            <button
              onClick={() => { setActiveTab('fleet'); setSearchQuery(''); setSelectedBusId(null); }}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                activeTab === 'fleet'
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-md shadow-gray-200/50 dark:shadow-black/20"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              Fleet Calendar
            </button>
          </div>

          {/* Search bar or Month navigation */}
          {activeTab === 'fleet' && selectedBusId ? (
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800/80 px-4 py-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 select-none">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl text-gray-500 dark:text-gray-450 transition-all font-bold"
              >
                <LuChevronLeft className="w-4.5 h-4.5" />
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-white px-2">
                {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl text-gray-500 dark:text-gray-450 transition-all font-bold"
              >
                <LuChevronRight className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => {
                  setCalendarMonth(new Date().getMonth() + 1);
                  setCalendarYear(new Date().getFullYear());
                }}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all ml-2"
              >
                Today
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800/80 px-6 py-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm flex-1">
              <input
                type="text"
                placeholder={
                  activeTab === 'drivers' 
                    ? "Search driver name or ID..." 
                    : activeTab === 'trips' 
                    ? "Search trip, route, driver..." 
                    : "Search bus plate or model..."
                }
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200 placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Tab display panels */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'drivers' ? (
              <motion.div
                key="drivers-panel"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Coach Captain</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Employee ID</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Department</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Assigned Vehicle</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-850">
                    {isDriversLoading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-24 text-center text-gray-400">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Syncing Driver Database...</p>
                        </td>
                      </tr>
                    ) : filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-24 text-center text-gray-400">
                          <p className="text-sm font-bold text-gray-500">No captain records matched the query.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDrivers.map((driver: any) => {
                        const driverBus = buses.find(b => b.driver?.id === driver.id);
                        return (
                          <tr key={driver.id} className="hover:bg-blue-50/20 dark:hover:bg-gray-800/30 transition-all border-b border-gray-50 dark:border-gray-800/40 last:border-0">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <EmployeeName 
                                  name={fullName(driver)} 
                                  src={driver.avatar_url} 
                                  subtitle={driver.email} 
                                  online={driver.is_online} 
                                  size="lg" 
                                />
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="font-mono font-bold text-gray-600 dark:text-gray-300 text-sm">
                                {driver.employee_id}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <span className="px-3 py-1.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-[10px] font-black tracking-widest uppercase border border-blue-100/30 dark:border-blue-900/30">
                                {driver.department || 'Logistics'}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              {driverBus ? (
                                <div className="space-y-0.5">
                                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                                    {driverBus.plate_number}
                                  </div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{driverBus.model}</div>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-gray-400 italic">No assigned bus</span>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block shadow-sm",
                                !driver.is_active
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/50 dark:border-red-900/20'
                                  : (driver.is_online
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/20'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700')
                              )}>
                                {!driver.is_active ? 'Suspended' : (driver.is_online ? 'Active' : 'Offline')}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </motion.div>
            ) : activeTab === 'trips' ? (
              <motion.div
                key="trips-panel"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Control No.</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Travel Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Route (Pick Up → Drop Off)</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Driver & Vehicle</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Passengers</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-850">
                    {isTripsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-24 text-center text-gray-400">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Syncing Trip Schedule...</p>
                        </td>
                      </tr>
                    ) : filteredTrips.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-24 text-center text-gray-400">
                          <p className="text-sm font-bold text-gray-500">No scheduled trips matched the search criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTrips.map((trip) => (
                        <tr key={trip.id} className="hover:bg-blue-50/20 dark:hover:bg-gray-800/30 transition-all border-b border-gray-50 dark:border-gray-800/40 last:border-0">
                          <td className="px-8 py-6">
                            <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
                              #{trip.control_no}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                              {trip.date_of_travel}
                            </span>
                            {trip.duration && <div className="text-[10px] text-gray-400 font-bold mt-0.5">{trip.duration}</div>}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1 max-w-xs">
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-350">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="font-semibold truncate">{trip.pick_up}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-800 dark:text-gray-100 font-black">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="truncate">{trip.drop_off}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-0.5">
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {trip.driver?.name || 'TBA'}
                              </div>
                              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                {trip.bus?.plate_number || trip.plate_no || 'TBA'}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-black text-gray-900 dark:text-white">
                              {trip.no_of_passengers} pax
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <StatusBadge status={trip.status} />
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedTicket(trip)}
                                className="px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer"
                                title="View Details"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => printTripTicket(trip)}
                                className="px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer"
                                title="Print DTT"
                              >
                                Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div
                key="fleet-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <FleetCalendarView
                  selectedBusId={selectedBusId}
                  setSelectedBusId={setSelectedBusId}
                  setCalendarMonth={setCalendarMonth}
                  setCalendarYear={setCalendarYear}
                  filteredBuses={filteredBuses}
                  buses={buses}
                  calendarMonth={calendarMonth}
                  calendarYear={calendarYear}
                  calendarData={calendarData}
                  setSelectedCalendarDay={setSelectedCalendarDay}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Info notice about departments */}
      <div className="p-5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl flex items-start gap-4">
        <span className="font-bold text-sm text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">INFO:</span>
        <div>
          <h4 className="text-sm font-black text-blue-900 dark:text-blue-300">Organizational Directive Adherence</h4>
          <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1 font-medium leading-relaxed">
            In compliance with operational mandates, all Coach Captains and Drivers are officially seeded and managed under the <strong>Logistics Department</strong>. Real-time updates, route assignments, and trip ticket processing are authorized for dispatcher and logistics-in-charge roles under dynamic token checking.
          </p>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTicket && (
        <TripTicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      {/* Calendar Day Detail Modal */}
      {selectedCalendarDay && (
        <CalendarDayDetailModal
          day={selectedCalendarDay.day}
          month={calendarMonth}
          year={calendarYear}
          entries={selectedCalendarDay.entries}
          bus={buses.find(b => b.id === selectedBusId)}
          onClose={() => setSelectedCalendarDay(null)}
        />
      )}
    </div>
  );
}
