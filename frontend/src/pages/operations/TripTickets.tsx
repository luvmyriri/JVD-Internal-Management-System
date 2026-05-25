import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuMap, LuSearch, LuPlus, LuX, LuNavigation, LuUser, LuCoins, LuPrinter, LuCalendar, LuChevronRight } from 'react-icons/lu';
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

function printTripTicket(ticket: TripTicket) {
  const win = window.open('', '_blank', 'width=800,height=1100');
  if (!win) return;

  const driverName = ticket.driver?.name || 'TBA';
  const plateNo = ticket.bus?.plate_number || ticket.plate_no || 'TBA';
  const unitBus = ticket.bus?.plate_number || plateNo;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Driver's Trip Ticket - ${ticket.control_no}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      padding: 18px 24px;
    }
    .dtt-wrap {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      border: 2px solid #000;
    }
    /* ── HEADER ── */
    .dtt-header {
      display: flex;
      align-items: stretch;
      border-bottom: 2px solid #000;
    }
    .dtt-logo-cell {
      padding: 8px 12px;
      border-right: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 80px;
    }
    .dtt-logo-box {
      width: 52px; height: 52px;
      border: 3px solid #1a56db;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
      color: #1a56db;
      letter-spacing: -1px;
    }
    .dtt-title-cell {
      flex: 1;
      padding: 8px 14px;
      border-right: 2px solid #000;
      text-align: center;
    }
    .dtt-title-cell h1 {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .dtt-title-cell p {
      font-size: 13px;
      font-weight: 700;
    }
    .dtt-control-cell {
      padding: 8px 12px;
      min-width: 160px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .dtt-control-cell span { font-weight: 700; }
    /* ── GRID ROWS ── */
    .dtt-grid { width: 100%; border-collapse: collapse; }
    .dtt-grid td, .dtt-grid th {
      border: 1px solid #000;
      padding: 5px 8px;
      vertical-align: top;
      font-size: 11px;
    }
    .dtt-grid td.label { font-weight: 700; white-space: nowrap; }
    .dtt-grid td.val { min-width: 140px; }
    /* ── SIGNATURE SECTION ── */
    .sig-section {
      display: flex;
      border-top: 2px solid #000;
    }
    .sig-half {
      flex: 1;
      padding: 10px 14px;
      min-height: 80px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 4px;
      font-size: 10px;
    }
    .sig-half:first-child { border-right: 1px solid #000; }
    .sig-half .sig-line { border-top: 1px solid #000; margin-top: 20px; padding-top: 3px; text-align: center; }
    .sig-half .title-bold { font-weight: 900; font-size: 11px; text-align: center; margin-bottom: 2px; }
    .sig-half .approver-name { font-weight: 700; font-size: 11px; }
    .sig-half .approver-role { font-size: 10px; }
    /* ── SECTION HEADERS ── */
    .section-header {
      background: #e8e8e8;
      text-align: center;
      font-weight: 900;
      font-size: 11.5px;
      padding: 5px;
      border-top: 2px solid #000;
      border-bottom: 1px solid #000;
      letter-spacing: 0.5px;
    }
    /* ── LIQUIDATION ── */
    .liq-wrap {
      display: flex;
      border-top: 1px solid #000;
    }
    .liq-left {
      flex: 1;
      border-right: 1px solid #000;
      padding: 8px 12px;
    }
    .liq-left .liq-title { font-weight: 900; font-size: 12px; margin-bottom: 6px; }
    .liq-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .liq-row .liq-label { min-width: 110px; }
    .liq-row .liq-underline {
      flex: 1;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      text-align: right;
      font-weight: 700;
    }
    .liq-sig { margin-top: 14px; border-top: 1px solid #000; padding-top: 4px; text-align: center; font-size: 10px; }
    .liq-right {
      flex: 1;
      padding: 8px 12px;
    }
    .liq-right .fuel-title { font-weight: 900; font-size: 12px; margin-bottom: 6px; }
    .gauge-row {
      display: flex;
      gap: 20px;
      align-items: flex-end;
      margin: 8px 0;
      font-size: 10.5px;
    }
    .gauge-item { text-align: center; }
    .gauge-label { font-weight: 700; margin-bottom: 4px; font-size: 10.5px; }
    .gauge-svg { display: block; margin: 0 auto; }
    .odometer-row { margin-top: 10px; }
    .odometer-row .od-label { font-weight: 700; font-size: 11px; margin-bottom: 4px; }
    .od-line { border-bottom: 1px solid #000; min-height: 18px; margin-bottom: 3px; }
    /* ── CERTIFY ROW ── */
    .certify-row {
      border-top: 1px solid #000;
      padding: 8px 12px;
      font-size: 10.5px;
      font-style: italic;
      text-align: center;
    }
    .certify-sig-line {
      border-top: 1px solid #000;
      margin-top: 18px;
      padding-top: 3px;
      text-align: center;
      font-size: 10px;
      font-style: normal;
    }
    /* ── PASSENGER CERT ── */
    .pax-header {
      background: #e8e8e8;
      text-align: center;
      font-weight: 900;
      font-size: 11.5px;
      padding: 5px;
      border-top: 2px solid #000;
      border-bottom: 1px solid #000;
      letter-spacing: 0.5px;
    }
    .pax-body { padding: 10px 16px; }
    .pax-body p { font-size: 11px; margin-bottom: 10px; }
    .pax-ratings { display: flex; gap: 18px; margin-bottom: 10px; font-size: 11px; }
    .pax-ratings span { display: flex; align-items: center; gap: 5px; }
    .pax-box { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #000; vertical-align: middle; }
    .pax-sig-line { border-top: 1px solid #000; padding-top: 3px; text-align: center; font-size: 10px; margin-top: 10px; }
    @media print {
      body { padding: 0; }
      .dtt-wrap { border: 2px solid #000; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <div class="no-print" style="text-align:right; margin-bottom:10px;">
    <button onclick="window.print()" style="padding:8px 20px; background:#1a56db; color:white; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">🖨️ Print</button>
    <button onclick="window.close()" style="margin-left:10px; padding:8px 20px; background:#6b7280; color:white; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">✕ Close</button>
  </div>

  <div class="dtt-wrap">

    <!-- HEADER -->
    <div class="dtt-header">
      <div class="dtt-logo-cell">
        <div class="dtt-logo-box">JVD</div>
      </div>
      <div class="dtt-title-cell">
        <h1>DRIVER'S TRIP TICKET</h1>
        <p>(DTT)</p>
      </div>
      <div class="dtt-control-cell">
        <div><span>Control No.:</span> ${ticket.control_no}</div>
        <div><span>Issue Date:</span> ${ticket.issue_date || ''}</div>
      </div>
    </div>

    <!-- TRAVEL INFO GRID -->
    <table class="dtt-grid">
      <tr>
        <td class="label">Date of Travel:</td>
        <td class="val">${ticket.date_of_travel}</td>
        <td class="label">Duration:</td>
        <td class="val">${ticket.duration || ''}</td>
      </tr>
      <tr>
        <td class="label">Pick Up:</td>
        <td class="val">${ticket.pick_up}</td>
        <td class="label">Drop Off:</td>
        <td class="val">${ticket.drop_off}</td>
      </tr>
      <tr>
        <td class="label">Unit/Bus:</td>
        <td class="val">${unitBus}</td>
        <td class="label">Plate No.:</td>
        <td class="val">${plateNo}</td>
      </tr>
      <tr>
        <td class="label">No of Passengers:</td>
        <td class="val">${ticket.no_of_passengers}${ticket.passenger_name ? ' — ' + ticket.passenger_name : ''}</td>
        <td class="label">Driver:</td>
        <td class="val">${driverName}</td>
      </tr>
    </table>

    <!-- REQUESTED / APPROVED BY -->
    <div class="sig-section">
      <div class="sig-half">
        <div class="title-bold">Requested By:</div>
        <div class="sig-line">Name in Print/Signature</div>
      </div>
      <div class="sig-half">
        <div class="title-bold">Approved By:</div>
        <div style="text-align:center; margin-top:24px;">
          <div class="approver-name">Rhean O. Umali</div>
          <div class="approver-role">Executive Vice President</div>
        </div>
      </div>
    </div>

    <!-- DRIVER'S TRAVEL COMPLETION REPORT -->
    <div class="section-header">DRIVER'S TRAVEL COMPLETION REPORT</div>

    <div class="liq-wrap">
      <!-- LEFT: Liquidation -->
      <div class="liq-left">
        <div class="liq-title">Liquidation</div>
        <div class="liq-row">
          <span class="liq-label">Meal Allowance</span>
          <span class="liq-underline">${ticket.meal_allowance ? '₱ ' + Number(ticket.meal_allowance).toLocaleString() : ''}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Diesel</span>
          <span class="liq-underline">${ticket.diesel ? '₱ ' + Number(ticket.diesel).toLocaleString() : ''}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">SOP</span>
          <span class="liq-underline">${ticket.sop ? '₱ ' + Number(ticket.sop).toLocaleString() : ''}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Easy Trip</span>
          <span class="liq-underline">${ticket.easy_trip ? '₱ ' + Number(ticket.easy_trip).toLocaleString() : ''}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Autosweep</span>
          <span class="liq-underline">${ticket.autosweep ? '₱ ' + Number(ticket.autosweep).toLocaleString() : ''}</span>
        </div>
        <div class="liq-sig">Signature</div>
      </div>

      <!-- RIGHT: Fuel Gauge -->
      <div class="liq-right">
        <div class="fuel-title">Fuel Consumed for the Trip</div>
        <div style="font-size:10.5px; margin-bottom:6px;">Fuel Gauge Reading</div>
        <div class="gauge-row">
          <div class="gauge-item">
            <div class="gauge-label">Before</div>
            <svg class="gauge-svg" width="80" height="48" viewBox="0 0 80 48">
              <path d="M4 44 A36 36 0 0 1 76 44" fill="none" stroke="#ccc" stroke-width="8" stroke-linecap="round"/>
              <line x1="40" y1="44" x2="10" y2="20" stroke="#000" stroke-width="2" stroke-linecap="round"/>
              <text x="2" y="47" font-size="9" font-weight="700">E</text>
              <text x="70" y="47" font-size="9" font-weight="700">F</text>
            </svg>
          </div>
          <div class="gauge-item">
            <div class="gauge-label">After</div>
            <svg class="gauge-svg" width="80" height="48" viewBox="0 0 80 48">
              <path d="M4 44 A36 36 0 0 1 76 44" fill="none" stroke="#ccc" stroke-width="8" stroke-linecap="round"/>
              <line x1="40" y1="44" x2="10" y2="20" stroke="#000" stroke-width="2" stroke-linecap="round"/>
              <text x="2" y="47" font-size="9" font-weight="700">E</text>
              <text x="70" y="47" font-size="9" font-weight="700">F</text>
            </svg>
          </div>
        </div>
        <div class="odometer-row">
          <div class="od-label">Odometer (Km) Reading</div>
          <div style="display:flex; gap:14px;">
            <div style="flex:1;">
              <div style="font-size:9.5px;">Before</div>
              <div class="od-line"></div>
            </div>
            <div style="flex:1;">
              <div style="font-size:9.5px;">After</div>
              <div class="od-line"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CERTIFY ROW -->
    <div class="certify-row">
      I hereby certify to the correctness of the above statement of the record travel
      <div class="certify-sig-line">Driver's Name in Print and Signature</div>
    </div>

    <!-- PASSENGER CERTIFICATION -->
    <div class="pax-header">PASSENGER CERTIFICATION</div>
    <div class="pax-body">
      <p>
        I hereby certify that I used this vehicle on _______________ from _____________ to _____________ I also rate the service provided as:
      </p>
      <div class="pax-ratings">
        <span><span class="pax-box"></span> Outstanding</span>
        <span><span class="pax-box"></span> Satisfactory</span>
        <span><span class="pax-box"></span> Needs Improvement</span>
        <span><span class="pax-box"></span> Poor</span>
      </div>
      <div class="pax-sig-line">Passenger's Name in Print and Signature</div>
    </div>

  </div>

</body>
</html>`;

  win.document.write(html);
  win.document.close();
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

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
          <button
            onClick={() => printTripTicket(ticket)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20 active:scale-95"
          >
            <LuPrinter size={16} /> Print DTT
          </button>
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
      <form onSubmit={handleSubmit} className="space-y-4 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {/* Section 1: Document Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-orange-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuCalendar size={14} /> Document Details</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Control Number</label>
                <input
                  type="text"
                  required
                  value={form.control_no}
                  onChange={e => setForm(p => ({ ...p, control_no: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. DTT-2024-001"
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
        </details>

        {/* Section 2: Route & Passenger Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-orange-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuNavigation size={14} /> Route & Passenger Details</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          <div className="p-4 pt-0 space-y-4">
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
        </details>

        {/* Section 3: Bus & Crew Assignment */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-orange-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuUser size={14} /> Bus & Crew Assignment</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          <div className="p-4 pt-0 space-y-4">
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
        </details>

        {/* Section 4: Operational Allowances */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-orange-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuCoins size={14} /> Operational Allowances (₱)</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          <div className="p-4 pt-0 space-y-4">
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
        </details>

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
    t.control_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.pick_up?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.drop_off?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-orange-600 dark:text-orange-500 mb-2 uppercase tracking-widest">
            <LuMap size={18} /> Operations Module
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Trip Tickets</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="relative group w-full sm:w-auto">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search route or control no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-full sm:w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
            />
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-orange-600/20 active:scale-95 cursor-pointer">
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
