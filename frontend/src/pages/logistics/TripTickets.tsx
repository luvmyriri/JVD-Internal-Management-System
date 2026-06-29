import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { tripTicketApi } from '../../api/operations';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

import type { TripTicket } from '../../types';
import { Modal, Button, PipelineVisualizer } from '../../components/ui';
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

function TripTicketDetailModal({ ticket, onClose, onCustomizeApprove }: { ticket: TripTicket; onClose: () => void; onCustomizeApprove?: (ticket: TripTicket) => void }) {
  const { user } = useAuth();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Ticket #{ticket.control_no}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold text-sm">
            ✕
          </button>
        </div>

        <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
          {/* Pipeline Visualizer */}
          <PipelineVisualizer
            pipelineType="transaction"
            currentStatus={ticket.status === 'approved' ? (ticket.cash_budget_request?.status === 'disbursed' ? 'disbursed' : 'approved') : ticket.status}
            metadata={{
              approved_by: ticket.approvedBy?.name,
              bus_plate: ticket.bus?.plate_number || ticket.plate_no,
              driver_name: ticket.driver?.name,
              ticket_no: ticket.control_no,
              budget_status: ticket.cash_budget_request?.status,
            }}
          />



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
                {ticket.destination && ticket.destination !== 'TBD' && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-gray-900 shadow-sm z-10" />
                      <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Destination</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.destination}</p>
                    </div>
                  </div>
                )}
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
          <div className="flex gap-3">
            <button
              onClick={() => printTripTicket(ticket)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              Print DTT
            </button>
            {ticket.status === 'draft' && user?.role !== 'driver' && onCustomizeApprove && (
              <button
                onClick={() => {
                  onCustomizeApprove(ticket);
                  onClose();
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer`}
                title="Approve this trip ticket"
              >
                Customize & Approve
              </button>
            )}
            {ticket.status === 'approved' && user?.role === 'super_admin' && onCustomizeApprove && (
              <button
                onClick={() => {
                  onCustomizeApprove(ticket);
                  onClose();
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer`}
                title="Edit this customized trip ticket"
              >
                Edit Customized DTT
              </button>
            )}
          </div>
          <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TripTicketFormModal({ ticket, onClose }: { ticket?: TripTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: busesData } = useBuses({ per_page: 999 });
  const { data: driversData } = useUsers({ role: 'driver', per_page: 999 });

  const buses = busesData?.data || [];
  const drivers = driversData?.data || [];

  const [form, setForm] = useState({
    control_no: ticket?.control_no || '',
    issue_date: ticket?.issue_date ? ticket.issue_date.split('T')[0] : new Date().toISOString().split('T')[0],
    date_of_travel: ticket?.date_of_travel ? ticket.date_of_travel.split('T')[0] : new Date().toISOString().split('T')[0],
    duration: ticket?.duration || '',
    pick_up: ticket?.pick_up || '',
    drop_off: ticket?.drop_off || '',
    bus_id: ticket?.bus_id || '' as string | number,
    plate_no: ticket?.plate_no || '',
    no_of_passengers: (ticket?.no_of_passengers || 1).toString(),
    driver_id: ticket?.driver_id || '' as string | number,
    meal_allowance: formatMoneyInput(String(ticket?.meal_allowance || 0)),
    diesel: formatMoneyInput(String(ticket?.diesel || 0)),
    sop: formatMoneyInput(String(ticket?.sop || 0)),
    easy_trip: formatMoneyInput(String(ticket?.easy_trip || 0)),
    autosweep: formatMoneyInput(String(ticket?.autosweep || 0)),
    passenger_name: ticket?.passenger_name || '',
    trip_type: (ticket as any)?.trip_type || 'domestic' as 'domestic' | 'international',
  });

  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isCheckingConflict, setIsCheckingConflict] = useState<boolean>(false);
  const [overrideConflict, setOverrideConflict] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (!form.date_of_travel) {
      setConflicts([]);
      setOverrideConflict(false);
      return;
    }

    const check = async () => {
      setIsCheckingConflict(true);
      try {
        const driverVal = form.driver_id ? Number(form.driver_id) : null;
        const busVal = form.bus_id ? Number(form.bus_id) : null;

        if (!driverVal && !busVal) {
          setConflicts([]);
          setOverrideConflict(false);
          setIsCheckingConflict(false);
          return;
        }

        setOverrideConflict(false);

        const res = await tripTicketApi.checkConflict({
          date_of_travel: form.date_of_travel,
          duration: form.duration || null,
          driver_id: driverVal,
          bus_id: busVal,
          exclude_id: ticket?.id || null,
        });

        if (active) {
          setConflicts(res.conflicts || []);
        }
      } catch (err) {
        console.error('Error checking scheduling conflict:', err);
      } finally {
        if (active) {
          setIsCheckingConflict(false);
        }
      }
    };

    const timer = setTimeout(check, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.date_of_travel, form.duration, form.driver_id, form.bus_id, ticket?.id]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (ticket) {
        return tripTicketApi.update(ticket.id, { ...data, status: 'approved' });
      }
      return tripTicketApi.create(data);
    },
    onSuccess: () => {
      toast.success(ticket ? 'Trip Ticket approved successfully' : 'Trip Ticket created successfully');
      qc.invalidateQueries({ queryKey: ['trip-tickets'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${ticket ? 'approve' : 'create'} trip ticket`);
    },
  });

  const canOverride = user?.role === 'super_admin' || user?.role === 'executive_vice_president' || user?.role === 'operations_manager' || user?.tags?.includes('process:override_schedule');
  const isSubmitDisabled = mutation.isPending || isCheckingConflict || (conflicts.length > 0 && (!canOverride || !overrideConflict));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare payload, casting optional and required numeric values
    const payload = {
      ...form,
      bus_id: form.bus_id ? Number(form.bus_id) : null,
      driver_id: form.driver_id ? Number(form.driver_id) : null,
      no_of_passengers: Number(form.no_of_passengers),
      meal_allowance: Number(parseMoneyInput(String(form.meal_allowance || 0))),
      diesel: Number(parseMoneyInput(String(form.diesel || 0))),
      sop: Number(parseMoneyInput(String(form.sop || 0))),
      easy_trip: Number(parseMoneyInput(String(form.easy_trip || 0))),
      autosweep: Number(parseMoneyInput(String(form.autosweep || 0))),
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
    <Modal isOpen={true} onClose={onClose} title={ticket ? (ticket.status === 'draft' ? "Customize & Approve Trip Ticket" : "Edit Customized DTT") : "New Trip Ticket"} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {/* Section 1: Document Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Document Details</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Control Number</label>
                <input
                  type="text"
                  readOnly
                  value={form.control_no || 'Auto-generated'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  placeholder="Auto-generated"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Issue Date</label>
                <input
                  type="date"
                  required
                  value={form.issue_date}
                  onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Travel</label>
                <input
                  type="date"
                  required
                  value={form.date_of_travel}
                  onChange={e => setForm(p => ({ ...p, date_of_travel: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {/* Trip Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trip Type</label>
              <div className="flex gap-3">
                {(['domestic', 'international'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, trip_type: t }))}
                    className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest border-2 transition-all ${
                      form.trip_type === t
                        ? t === 'international'
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'bg-teal-600 border-teal-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {t === 'international' ? 'International' : 'Domestic'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* Section 2: Route & Passenger Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Route & Passenger Details</span>
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Baguio City Terminal"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">No. of Passengers</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.no_of_passengers}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(p => ({ ...p, no_of_passengers: val }));
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Passenger / Group Name</label>
                <input
                  type="text"
                  value={form.passenger_name}
                  onChange={e => setForm(p => ({ ...p, passenger_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Lakbay Aral Tour Group"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Duration / Notes</label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 3 Days Roundtrip"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Section 3: Bus & Crew Assignment */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Bus & Crew Assignment</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Driver</label>
                <select
                  value={form.driver_id}
                  onChange={e => setForm(p => ({ ...p, driver_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-transparent"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-transparent"
                >
                  <option value="">Select a Fleet Bus (or type manual)</option>
                  {buses.map((bus: any) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.plate_number} ({bus.model || 'Bus'}) {bus.bus_category ? `• ${bus.bus_category}` : ''}
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                />
              </div>
            </div>
            {conflicts.length > 0 && (() => {
              const canOverride = user?.role === 'super_admin' || user?.role === 'executive_vice_president' || user?.role === 'operations_manager' || user?.tags?.includes('process:override_schedule');
              return (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <span className="text-base">⚠️</span>
                    <span className="text-xs font-black uppercase tracking-widest">Schedule Conflict Detected</span>
                  </div>
                  <div className="space-y-1">
                    {conflicts.map((c, i) => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-400 font-semibold leading-relaxed">
                        {c.message}
                      </p>
                    ))}
                  </div>
                  {canOverride ? (
                    <label className="flex items-center gap-2 mt-3 p-2 bg-white/50 dark:bg-black/10 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideConflict}
                        onChange={(e) => setOverrideConflict(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-red-800 dark:text-red-300">
                        Override schedule conflict (Administrator bypass)
                      </span>
                    </label>
                  ) : (
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mt-2">
                      Submission blocked. Only administrators can override scheduling conflicts.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </details>

        {/* Section 4: Operational Allowances */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Operational Allowances (₱)</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.meal_allowance}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, meal_allowance: formatted }));
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Diesel</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.diesel}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, diesel: formatted }));
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SOP</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.sop}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, sop: formatted }));
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">EasyTrip</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.easy_trip}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, easy_trip: formatted }));
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">AutoSweep</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.autosweep}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, autosweep: formatted }));
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </details>

        {ticket && (
          <div className="mx-2 mb-2 px-5 py-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Auto-Budget Notice</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Upon approval, a <strong>Cash Budget Request</strong> will be automatically created in the Operations module based on the allowances entered above.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {ticket ? "Approve & Send to Cash Budgets" : "Create Ticket"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TripTickets() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [tripTypeFilter, setTripTypeFilter] = useState<'all' | 'domestic' | 'international'>('all');
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
      t.drop_off?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = tripTypeFilter === 'all' || (t as any).trip_type === tripTypeFilter;
    return matchSearch && matchType;
  });

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest rounded-tl-3xl">Control No.</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Travel Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Route</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Bus/Driver</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Trip Type</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right rounded-tr-3xl">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">Loading trip tickets...</td></tr>
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
                    <td className="px-8 py-5">
                      <TripTypeBadge type={(ticket as any).trip_type} />
                    </td>
                    <td className="px-8 py-5"><StatusBadge status={ticket.status} /></td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => setSelectedTicket(ticket)} className="px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer">
                        Details
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
        <TripTicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onCustomizeApprove={setEditingTicket} />
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
