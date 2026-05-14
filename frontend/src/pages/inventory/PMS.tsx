import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LuWrench, LuSearch, LuTriangleAlert, LuCircleCheckBig, LuClock, LuLoaderCircle
} from 'react-icons/lu';
import { fleetApi } from '../../api/fleet';
import type { Bus } from '../../types/inventory';
import { format, isPast, parseISO } from 'date-fns';

export default function PMS() {
  const [search, setSearch] = useState('');

  // Fetch all buses to see overall PMS status, but we will mostly focus on overdue
  const { data, isLoading } = useQuery({
    queryKey: ['buses-pms', search],
    queryFn: () => fleetApi.list({ search: search || undefined }),
    staleTime: 30_000,
  });

  const buses = data?.data?.data ?? [];

  // Categorize buses for the dashboard
  const overdueBuses = buses.filter(b => b.is_service_overdue);
  const upcomingBuses = buses.filter(b => !b.is_service_overdue && b.next_service_due && new Date(b.next_service_due).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000);
  const healthyBuses = buses.filter(b => !overdueBuses.includes(b) && !upcomingBuses.includes(b));

  // Determine what to display in the main table (Overdue and Upcoming)
  const priorityBuses = [...overdueBuses, ...upcomingBuses].sort((a, b) => {
    if (!a.next_service_due) return 1;
    if (!b.next_service_due) return -1;
    return new Date(a.next_service_due).getTime() - new Date(b.next_service_due).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Preventive Maintenance Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track fleet health and service deadlines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <LuTriangleAlert size={24} />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{overdueBuses.length}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Overdue for Service</div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <LuClock size={24} />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{upcomingBuses.length}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Due within 7 Days</div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <LuCircleCheckBig size={24} />
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{healthyBuses.length}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Healthy Fleet</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Priority Maintenance Queue</h2>
          <div className="relative w-64">
            <LuSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plate or model..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Bus Details</th>
                <th className="px-6 py-4">Current Status</th>
                <th className="px-6 py-4">Last Serviced</th>
                <th className="px-6 py-4">Next Service Due</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2" />
                    Loading PMS data...
                  </td>
                </tr>
              ) : priorityBuses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <LuCircleCheckBig size={32} strokeWidth={1.5} className="mx-auto mb-3 text-emerald-300" />
                    No buses require immediate maintenance!
                  </td>
                </tr>
              ) : (
                priorityBuses.map(bus => (
                  <tr key={bus.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{bus.plate_number}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{bus.model}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        bus.status === 'in_service' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        bus.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      } border`}>
                        {bus.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-600">
                      {bus.last_service_date ? format(parseISO(bus.last_service_date), 'MMM dd, yyyy') : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      {bus.next_service_due ? (
                        <div className={`font-bold ${bus.is_service_overdue ? 'text-red-600' : 'text-amber-600'}`}>
                          {format(parseISO(bus.next_service_due), 'MMM dd, yyyy')}
                          <div className="text-xs font-medium opacity-70 mt-0.5">
                            {bus.is_service_overdue ? 'Overdue' : 'Upcoming'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition mx-auto border border-blue-100">
                        <LuWrench size={12} /> Log Maintenance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
