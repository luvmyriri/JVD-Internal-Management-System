import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuMap, LuSearch, LuPlus, LuX, LuNavigation, LuUser, LuCoins } from 'react-icons/lu';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { tripTicketApi } from '../../api/operations';
import type { TripTicket } from '../../types';
import { Modal, Button } from '../../components/ui';
import { useBuses } from '../../hooks/useFleet';
import { useUsers } from '../../hooks/useUsers';

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

function TripTicketDetailModal({ ticket, onClose }: { ticket: TripTicket; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shadow-sm">
              <LuMap size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Ticket #{ticket.control_no}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 transition-all">
            <LuX size={20} />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.driver?.name || 'TBA'}</p>
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
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
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

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateTripTicketModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: busesData } = useBuses({ per_page: 999 });
  const { data: driversData } = useUsers({ role: 'driver', per_page: 999 });

  const buses = busesData?.data || [];
  const drivers = driversData?.data || [];

  const [form, setForm] = useState({
    control_no: '',
    issue_date: new Date().toISOString().split('T')[0],
    date_of_travel: new Date().toISOString().split('T')[0],
    duration: '',
    pick_up: '',
    drop_off: '',
    bus_id: '' as string | number,
    plate_no: '',
    no_of_passengers: 1,
    driver_id: '' as string | number,
    meal_allowance: 0,
    diesel: 0,
    sop: 0,
    easy_trip: 0,
    autosweep: 0,
    passenger_name: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => tripTicketApi.create(data),
    onSuccess: () => {
      toast.success('Trip Ticket created successfully');
      qc.invalidateQueries({ queryKey: ['trip-tickets'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create trip ticket');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare payload, casting optional and required numeric values
    const payload = {
      ...form,
      bus_id: form.bus_id ? Number(form.bus_id) : null,
      driver_id: form.driver_id ? Number(form.driver_id) : null,
      no_of_passengers: Number(form.no_of_passengers),
      meal_allowance: Number(form.meal_allowance),
      diesel: Number(form.diesel),
      sop: Number(form.sop),
      easy_trip: Number(form.easy_trip),
      autosweep: Number(form.autosweep),
    };

    // If bus is selected, sync plate_no with that bus's plate_number for safety
    if (payload.bus_id) {
      const selectedBus = buses.find(b => b.id === payload.bus_id);
      if (selectedBus) {
        payload.plate_no = selectedBus.plate_number;
      }
    }

    mutation.mutate(payload);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="New Trip Ticket" size="xl">
      <form onSubmit={handleSubmit} className="space-y-8 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {/* Section 1: Trip Identification */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black text-orange-600 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">
            <LuMap size={14} /> Trip Identification
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Control No.</label>
              <input
                type="text"
                required
                value={form.control_no}
                onChange={e => setForm(p => ({ ...p, control_no: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. TT-2026-0001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Issue Date</label>
              <input
                type="date"
                required
                value={form.issue_date}
                onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Travel</label>
              <input
                type="date"
                required
                value={form.date_of_travel}
                onChange={e => setForm(p => ({ ...p, date_of_travel: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Route & Passenger Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black text-orange-600 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">
            <LuNavigation size={14} /> Route & Passenger Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pick Up Location</label>
              <input
                type="text"
                required
                value={form.pick_up}
                onChange={e => setForm(p => ({ ...p, pick_up: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. JVD Terminal, Cubao"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Drop Off Location</label>
              <input
                type="text"
                required
                value={form.drop_off}
                onChange={e => setForm(p => ({ ...p, drop_off: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. Baguio City Terminal"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">No. of Passengers</label>
              <input
                type="number"
                required
                min="1"
                value={form.no_of_passengers}
                onChange={e => setForm(p => ({ ...p, no_of_passengers: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Passenger / Group Name</label>
              <input
                type="text"
                value={form.passenger_name}
                onChange={e => setForm(p => ({ ...p, passenger_name: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. Lakbay Aral Tour Group"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Duration / Notes</label>
              <input
                type="text"
                value={form.duration}
                onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. 3 Days Roundtrip"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Bus & Crew Assignment */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black text-orange-600 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">
            <LuUser size={14} /> Bus & Crew Assignment
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Driver</label>
              <select
                value={form.driver_id}
                onChange={e => setForm(p => ({ ...p, driver_id: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-transparent"
              >
                <option value="">Select a Driver (TBA)</option>
                {drivers.map((driver: any) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Vehicle (Fleet)</label>
              <select
                value={form.bus_id}
                onChange={e => setForm(p => ({ ...p, bus_id: e.target.value, plate_no: '' }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-transparent"
              >
                <option value="">Select a Fleet Bus (or type manual)</option>
                {buses.map((bus: any) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.plate_number} ({bus.model || 'Bus'})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plate Number (Manual Override)</label>
              <input
                type="text"
                disabled={!!form.bus_id}
                value={form.bus_id ? buses.find((b: any) => b.id === Number(form.bus_id))?.plate_number || '' : form.plate_no}
                onChange={e => setForm(p => ({ ...p, plate_no: e.target.value }))}
                placeholder={form.bus_id ? "Auto-synced with fleet" : "e.g. NDG-5818"}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Operational Allowances */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black text-orange-600 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">
            <LuCoins size={14} /> Operational Allowances (₱)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal</label>
              <input
                type="number"
                min="0"
                value={form.meal_allowance}
                onChange={e => setForm(p => ({ ...p, meal_allowance: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Diesel</label>
              <input
                type="number"
                min="0"
                value={form.diesel}
                onChange={e => setForm(p => ({ ...p, diesel: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SOP</label>
              <input
                type="number"
                min="0"
                value={form.sop}
                onChange={e => setForm(p => ({ ...p, sop: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">EasyTrip</label>
              <input
                type="number"
                min="0"
                value={form.easy_trip}
                onChange={e => setForm(p => ({ ...p, easy_trip: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">AutoSweep</label>
              <input
                type="number"
                min="0"
                value={form.autosweep}
                onChange={e => setForm(p => ({ ...p, autosweep: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Create Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TripTickets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TripTicket | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['trip-tickets'],
    queryFn: () => tripTicketApi.getAll(),
  });

  const tickets: TripTicket[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const filtered = tickets.filter((t) =>
    t.control_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.pick_up.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.drop_off.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-orange-600 dark:text-orange-500 mb-2 uppercase tracking-widest">
            <LuMap size={18} /> Operations Module
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Trip Tickets</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search route or control no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
            />
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-orange-600/20 active:scale-95 cursor-pointer">
            <LuPlus size={18} /> New Trip Ticket
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-6 rounded-tl-[2rem]">Control No.</th>
                <th className="px-8 py-6">Travel Date</th>
                <th className="px-8 py-6">Route</th>
                <th className="px-8 py-6">Bus/Driver</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right rounded-tr-[2rem]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-500">Loading trip tickets...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-500">No trip tickets found.</td></tr>
              ) : (
                filtered.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900 dark:text-white">{ticket.control_no}</td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">{ticket.date_of_travel}</td>
                    <td className="px-8 py-5">
                      <div className="text-gray-900 dark:text-gray-300 font-medium">{ticket.pick_up}</div>
                      <div className="text-gray-500 text-xs">to {ticket.drop_off}</div>
                    </td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">
                      <div>{ticket.bus?.plate_number || ticket.plate_no || 'TBA'}</div>
                      <div className="text-xs text-gray-500">{ticket.driver?.name || 'TBA'}</div>
                    </td>
                    <td className="px-8 py-5"><StatusBadge status={ticket.status} /></td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => setSelectedTicket(ticket)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
        <TripTicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {showCreate && (
        <CreateTripTicketModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
