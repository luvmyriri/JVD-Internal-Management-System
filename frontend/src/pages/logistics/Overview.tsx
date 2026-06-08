import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { LuCalendar, LuChevronLeft, LuChevronRight, LuBus } from 'react-icons/lu';

import { useUsers } from '../../hooks/useUsers';
import { useBuses } from '../../hooks/useFleet';
import { tripTicketApi } from '../../api/operations';
import { fleetApi } from '../../api/fleet';
import BusLayout from '../../components/ui/BusLayout';
import type { TripTicket } from '../../types';
import { cn, fullName } from '../../utils';

// Status badge helper compatible with global styles
const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block shadow-sm",
      statusStyles[status] ?? 'bg-gray-100 text-gray-600'
    )}>
      {status}
    </span>
  );
}

// Print logic extracted and matched from TripTickets
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
    .dtt-grid { width: 100%; border-collapse: collapse; }
    .dtt-grid td, .dtt-grid th {
      border: 1px solid #000;
      padding: 5px 8px;
      vertical-align: top;
      font-size: 11px;
    }
    .dtt-grid td.label { font-weight: 700; white-space: nowrap; }
    .dtt-grid td.val { min-width: 140px; }
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
    <div class="dtt-header">
      <div class="dtt-logo-cell">
        <img src="/JVDlogo-removebg-preview.png" style="width: 64px; height: 64px; object-fit: contain;" alt="JVD Logo" />
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

    <div class="section-header">DRIVER'S TRAVEL COMPLETION REPORT</div>

    <div class="liq-wrap">
      <div class="liq-left">
        <div class="liq-title">Liquidation</div>
        <div class="liq-row">
          <span class="liq-label">Meal Allowance</span>
          <span class="liq-underline">${ticket.meal_allowance ? '₱ ' + Number(ticket.meal_allowance).toLocaleString() : '₱ 0.00'}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Diesel</span>
          <span class="liq-underline">${ticket.diesel ? '₱ ' + Number(ticket.diesel).toLocaleString() : '₱ 0.00'}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">SOP</span>
          <span class="liq-underline">${ticket.sop ? '₱ ' + Number(ticket.sop).toLocaleString() : '₱ 0.00'}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Easy Trip</span>
          <span class="liq-underline">${ticket.easy_trip ? '₱ ' + Number(ticket.easy_trip).toLocaleString() : '₱ 0.00'}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Autosweep</span>
          <span class="liq-underline">${ticket.autosweep ? '₱ ' + Number(ticket.autosweep).toLocaleString() : '₱ 0.00'}</span>
        </div>
        <div class="liq-sig">Signature</div>
      </div>

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

    <div class="certify-row">
      I hereby certify to the correctness of the above statement of the record travel
      <div class="certify-sig-line">Driver's Name in Print and Signature</div>
    </div>

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
</html>
`;
  win.document.write(html);
  win.document.close();
}

function TripTicketDetailModal({ ticket, onClose }: { ticket: TripTicket; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Ticket #{ticket.control_no}</h2>
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

function CalendarDayDetailModal({
  day,
  month,
  year,
  entries,
  bus,
  onClose,
}: {
  day: number;
  month: number;
  year: number;
  entries: any[];
  bus: any;
  onClose: () => void;
}) {
  const monthName = MONTH_NAMES[month - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-8 border-b border-gray-105 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              Assignments for {monthName} {day}, {year}
            </h2>
            <p className="text-[10px] text-gray-450 uppercase font-black tracking-widest mt-0.5">
              Bus: {bus?.plate_number} ({bus?.model})
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-gray-50 dark:bg-gray-850 rounded-2xl text-gray-450 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          {entries.map((entry, idx) => (
            <div 
              key={idx} 
              className="p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row gap-8"
            >
              <div className="flex-1 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block shadow-sm",
                      entry.type === 'invoice' 
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-450 border border-amber-200/50 dark:border-amber-850/30"
                    )}>
                      {entry.type === 'invoice' ? 'POS Invoice' : 'Trip Ticket'}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase mt-2 font-mono">
                      {entry.type === 'invoice' ? `INV-${entry.reference_no}` : `DTT-${entry.reference_no}`}
                    </h3>
                  </div>
                  {entry.type === 'invoice' && (
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Total Amount</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-450 mt-0.5">
                        ₱{Number(entry.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  {entry.type === 'invoice' ? (
                    <>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Customer Name</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{entry.customer_name || 'Walk-in'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Status</span>
                        <span className="font-bold uppercase text-gray-700 dark:text-gray-300">{entry.status}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Driver</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{bus?.driver ? `${bus.driver.first_name} ${bus.driver.last_name}` : 'TBA'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Passengers</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{entry.pax} pax</span>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Route</span>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="font-bold text-gray-600 dark:text-gray-350">{entry.pick_up}</span>
                            <span className="text-gray-400">→</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-black text-gray-800 dark:text-white">{entry.drop_off}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {entry.type === 'invoice' && entry.seat_map && entry.seat_map.length > 0 ? (
                <div className="lg:w-[320px] shrink-0 space-y-3">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selected Seating Chart</span>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex justify-center">
                    <BusLayout
                      totalSeats={bus?.seating_capacity || 49}
                      hasRestroom={bus?.model?.toLowerCase().includes('vip') || bus?.bus_category === 'VIP'}
                      selectedSeats={entry.seat_map || []}
                      viewOnly={true}
                      compact={true}
                    />
                  </div>
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider text-center">
                    Booked Seats ({entry.seat_map.length}): {entry.seat_map.join(', ')}
                  </p>
                </div>
              ) : entry.type === 'invoice' ? (
                <div className="lg:w-[320px] shrink-0 flex items-center justify-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-850 rounded-3xl text-gray-400 italic text-xs text-center font-bold">
                  No seats assigned for this invoice.
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-gray-105 dark:border-gray-850 bg-white dark:bg-gray-900 flex justify-end shrink-0">
          <button 
            onClick={onClose} 
            className="px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}

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

  // Fetch all trip tickets
  const { data: tripsData, isLoading: isTripsLoading } = useQuery<TripTicket[]>({
    queryKey: ['trip-tickets-all'],
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
                                <div className="relative">
                                  <img
                                    src={driver.avatar_url || `https://ui-avatars.com/api/?name=${driver.first_name}+${driver.last_name}&background=f8fafc&color=3b82f6&bold=true`}
                                    className="w-12 h-12 rounded-2xl border border-white dark:border-gray-800 shadow-sm object-cover bg-gray-50 dark:bg-gray-800"
                                    alt=""
                                    onError={(e) => {
                                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${driver.first_name}+${driver.last_name}&background=f8fafc&color=3b82f6&bold=true`;
                                    }}
                                  />
                                  {driver.is_online && (
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white text-base leading-snug">{fullName(driver)}</div>
                                  <div className="text-[10px] text-gray-400 font-bold tracking-wider mt-0.5">{driver.email}</div>
                                </div>
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
                {!selectedBusId ? (
                  /* BUSES GRID */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                    {filteredBuses.length === 0 ? (
                      <div className="col-span-full py-16 text-center text-gray-400">
                        <p className="text-sm font-bold text-gray-500">No buses matched the search criteria.</p>
                      </div>
                    ) : (
                      filteredBuses.map((bus: any) => (
                        <div 
                          key={bus.id} 
                          onClick={() => {
                            setSelectedBusId(bus.id);
                            setCalendarMonth(new Date().getMonth() + 1);
                            setCalendarYear(new Date().getFullYear());
                          }}
                          className="p-6 bg-gray-50/50 dark:bg-gray-800/25 border border-gray-100 dark:border-gray-800/80 rounded-[2.2rem] hover:border-blue-400/40 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <div className="px-3.5 py-1.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-150 dark:border-gray-700 flex items-center gap-2 shadow-sm">
                                <LuBus className="text-blue-600 dark:text-blue-400 w-4 h-4" />
                                <span className="font-mono font-black text-gray-900 dark:text-white text-xs uppercase">{bus.plate_number}</span>
                              </div>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block shadow-sm",
                                bus.status === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/20' :
                                bus.status === 'in_service' ? 'bg-blue-100 text-blue-700 dark:bg-blue-955/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/20' :
                                bus.status === 'under_maintenance' ? 'bg-amber-100 text-amber-700 dark:bg-amber-955/30 dark:text-amber-450 border border-amber-200/50 dark:border-amber-900/20' :
                                'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/50 dark:border-red-900/20'
                              )}>
                                {bus.status.replace('_', ' ')}
                              </span>
                            </div>
                            
                            <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1">{bus.model}</h4>
                            
                            <div className="mt-4 space-y-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                              <div className="flex justify-between">
                                <span className="uppercase text-[9px] tracking-wider font-black text-gray-400">Capacity</span>
                                <span className="text-gray-850 dark:text-gray-200">{bus.seating_capacity} seats</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="uppercase text-[9px] tracking-wider font-black text-gray-400">Class</span>
                                <span className="text-gray-850 dark:text-gray-200">{bus.bus_category || 'ECONOMY'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="uppercase text-[9px] tracking-wider font-black text-gray-400">Captain</span>
                                <span className="text-gray-850 dark:text-gray-200 font-black text-blue-600 dark:text-blue-450">
                                  {bus.driver ? `${bus.driver.first_name} ${bus.driver.last_name}` : 'TBA'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex justify-end">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                              View Schedule Calendar →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* BUS CALENDAR VIEW */
                  (() => {
                    const selectedBus = buses.find((b: any) => b.id === selectedBusId);
                    
                    // Calendar grid computation
                    const firstDayOfMonth = new Date(calendarYear, calendarMonth - 1, 1).getDay();
                    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
                    
                    const calendarCells = [];
                    for (let i = 0; i < firstDayOfMonth; i++) {
                      calendarCells.push(null);
                    }
                    for (let d = 1; d <= daysInMonth; d++) {
                      calendarCells.push(d);
                    }
                    
                    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                    return (
                      <div className="p-8 space-y-6">
                        {/* calendar header/info */}
                        <div className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800/80">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setSelectedBusId(null)}
                              className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 text-xs font-black text-gray-650 dark:text-gray-300 uppercase tracking-widest border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm transition-all"
                            >
                              ← Back to Fleet
                            </button>
                            <div>
                              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedBus?.model}</h3>
                              <p className="text-[10px] text-gray-450 font-black uppercase tracking-widest mt-0.5">
                                Plate: {selectedBus?.plate_number} • Capacity: {selectedBus?.seating_capacity} Seats • {selectedBus?.bus_category || 'ECONOMY'}
                              </p>
                            </div>
                          </div>
                          {selectedBus?.driver && (
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Assigned Captain</p>
                              <p className="text-sm font-black text-blue-600 dark:text-blue-450 uppercase mt-0.5">
                                {selectedBus.driver.first_name} {selectedBus.driver.last_name}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Calendar Grid */}
                        <div className="border border-gray-100 dark:border-gray-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                          <div className="grid grid-cols-7 border-b border-gray-150 dark:border-gray-850 bg-gray-50/30 dark:bg-gray-800/10">
                            {weekdays.map(d => (
                              <div key={d} className="py-4 text-center text-[10px] font-black text-gray-450 dark:text-gray-500 uppercase tracking-widest border-r border-gray-100 dark:border-gray-850 last:border-r-0">
                                {d}
                              </div>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-7 border-collapse">
                            {calendarCells.map((day, idx) => {
                              if (day === null) {
                                return (
                                  <div key={`empty-${idx}`} className="min-h-[120px] border-b border-r border-gray-100 dark:border-gray-805 bg-gray-50/20 dark:bg-gray-900/10 last:border-r-0" />
                                );
                              }
                              
                              const dayStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const dayEntries = calendarData.filter((e: any) => e.date === dayStr);
                              
                              return (
                                <div 
                                  key={`day-${day}`}
                                  onClick={() => {
                                    if (dayEntries.length > 0) {
                                      setSelectedCalendarDay({ day, entries: dayEntries });
                                    }
                                  }}
                                  className={cn(
                                    "min-h-[120px] p-3 border-b border-r border-gray-100 dark:border-gray-805 bg-white dark:bg-gray-900 flex flex-col justify-between last:border-r-0 transition-all select-none",
                                    dayEntries.length > 0 
                                      ? "cursor-pointer hover:bg-blue-50/20 dark:hover:bg-blue-950/10" 
                                      : "cursor-default"
                                  )}
                                >
                                  <span className={cn(
                                    "text-xs font-black text-gray-400",
                                    dayEntries.length > 0 && "text-blue-600 dark:text-blue-400 font-black"
                                  )}>
                                    {day}
                                  </span>
                                  
                                  <div className="space-y-1 mt-2 flex-1 flex flex-col justify-end overflow-hidden">
                                    {dayEntries.map((e: any, eIdx: number) => {
                                      if (e.type === 'invoice') {
                                        return (
                                          <div 
                                            key={`e-${eIdx}`} 
                                            className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[9px] font-black rounded-lg border border-blue-100/30 dark:border-blue-900/20 truncate leading-tight shadow-sm text-left"
                                            title={`Invoice #${e.reference_no} - ${e.customer_name}`}
                                          >
                                            🎫 INV-{e.reference_no}
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div 
                                            key={`e-${eIdx}`} 
                                            className="px-2 py-1 bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-450 text-[9px] font-black rounded-lg border border-amber-100/30 dark:border-amber-900/20 truncate leading-tight shadow-sm text-left"
                                            title={`Trip Ticket #${e.reference_no} - ${e.drop_off}`}
                                          >
                                            🚌 DTT-{e.reference_no}
                                          </div>
                                        );
                                      }
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
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
