import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LuUsers,
  LuPlus,
  LuTrash2,
  LuX,
  LuCheck,
  LuSparkles,
  LuUserCheck,
  LuPrinter,
  LuBus,
  LuIdCard,
} from 'react-icons/lu';
import BusLayout from '../ui/BusLayout';
import type { PassengerInput } from '../../api/contracts';

export type PassengerRole = 'student' | 'adult' | 'child' | 'tour_guide';

export interface PassengerManifestRow extends PassengerInput {
  rowId: string;
  role: PassengerRole;
  seat_code?: string;
}

const escapePrintValue = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string
  ));

interface PassengerManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (passengers: PassengerManifestRow[]) => void;
  initialPassengers?: PassengerManifestRow[];
  totalSeats?: number;
  occupiedSeats?: string[];
  selectedSeats?: string[];
  leadCustomer?: { name?: string; email?: string; phone?: string };
  title?: string;
  packageName?: string;
}

export default function PassengerManifestModal({
  isOpen,
  onClose,
  onSave,
  initialPassengers = [],
  totalSeats = 49,
  occupiedSeats = [],
  selectedSeats = [],
  leadCustomer,
  title = 'Tour Passenger Manifest & Seat Assignments',
  packageName = 'Tour Package',
}: PassengerManifestModalProps) {
  const [passengers, setPassengers] = useState<PassengerManifestRow[]>([]);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialPassengers && initialPassengers.length > 0) {
        setPassengers(initialPassengers);
        setActiveRowId(initialPassengers[0]?.rowId || null);
      } else {
        const defaultRow: PassengerManifestRow = {
          rowId: `p-${Date.now()}-1`,
          role: 'adult',
          first_name: leadCustomer?.name ? leadCustomer.name.split(' ')[0] || '' : '',
          last_name: leadCustomer?.name ? leadCustomer.name.split(' ').slice(1).join(' ') || '' : '',
          emergency_contact: leadCustomer?.phone || '',
          seat_code: selectedSeats[0] || '1',
        };
        setPassengers([defaultRow]);
        setActiveRowId(defaultRow.rowId);
      }
    }
  }, [isOpen, initialPassengers, leadCustomer, selectedSeats]);

  const assignedSeatCodes = useMemo(() => {
    return passengers.map((p) => p.seat_code).filter(Boolean) as string[];
  }, [passengers]);

  const addPassenger = (role: PassengerRole = 'adult') => {
    const nextSeat = Array.from({ length: totalSeats }, (_, i) => String(i + 1))
      .find((code) => !assignedSeatCodes.includes(code) && !occupiedSeats.includes(code)) || '';

    const newRow: PassengerManifestRow = {
      rowId: `p-${Date.now()}-${Math.random()}`,
      role,
      first_name: '',
      last_name: '',
      seat_code: nextSeat,
    };
    setPassengers((prev) => [...prev, newRow]);
    setActiveRowId(newRow.rowId);
  };

  const removePassenger = (rowId: string) => {
    setPassengers((prev) => prev.filter((p) => p.rowId !== rowId));
  };

  const updatePassenger = (rowId: string, patch: Partial<PassengerManifestRow>) => {
    setPassengers((prev) =>
      prev.map((p) => (p.rowId === rowId ? { ...p, ...patch } : p))
    );
  };

  const handleAutoAssignSeats = () => {
    const availableCodes = Array.from({ length: totalSeats }, (_, i) => String(i + 1))
      .filter((code) => !occupiedSeats.includes(code));

    setPassengers((prev) =>
      prev.map((p, idx) => ({
        ...p,
        seat_code: availableCodes[idx] || p.seat_code || String(idx + 1),
      }))
    );
  };

  const handleFillLeadCustomer = () => {
    if (!leadCustomer?.name) return;
    const parts = leadCustomer.name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    setPassengers((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((p, i) =>
        i === 0
          ? {
              ...p,
              first_name: firstName,
              last_name: lastName,
              emergency_contact: leadCustomer.phone || p.emergency_contact,
            }
          : p
      );
    });
  };

  const handleSeatClickFromMap = (seatNumber: string) => {
    if (!activeRowId) return;
    updatePassenger(activeRowId, { seat_code: seatNumber });
  };

  const handleSave = () => {
    const invalid = passengers.find((p) => !p.first_name.trim() || !p.last_name.trim());
    if (invalid) {
      alert('Please fill in the First Name and Last Name for all passengers in the manifest.');
      return;
    }
    onSave(passengers);
    onClose();
  };

  const handlePrintManifest = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups to print the passenger manifest.');
      return;
    }
    const rows = passengers.map((passenger, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapePrintValue(passenger.seat_code || '-')}</td>
        <td><strong>${escapePrintValue(`${passenger.first_name} ${passenger.last_name}`.trim())}</strong></td>
        <td>${escapePrintValue(passenger.role.replace('_', ' '))}</td>
        <td>${escapePrintValue(passenger.date_of_birth || '-')}</td>
        <td>${escapePrintValue(passenger.emergency_contact || leadCustomer?.phone || '-')}</td>
        <td>${escapePrintValue(passenger.dietary_restrictions || passenger.special_needs || '-')}</td>
      </tr>
    `).join('');
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Passenger Manifest - ${escapePrintValue(packageName)}</title><style>
      @page{size:A4 landscape;margin:12mm 12mm 18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;font-size:10px}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid #b91c1c;padding-bottom:8px}.header img{width:76px}.contact{text-align:right;color:#174a8b;font-size:8px;line-height:1.5}.contact strong{color:#b91c1c;text-transform:uppercase}.heading{display:flex;justify-content:space-between;align-items:flex-end;margin:12px 0}.heading h1{margin:0;font-family:Georgia,serif;font-size:19px;text-transform:uppercase}.meta{text-align:right;color:#64748b;font-size:9px}table{width:100%;border-collapse:collapse}th{background:#174a8b;color:#fff;text-align:left;text-transform:uppercase;font-size:8px;padding:7px;border:1px solid #17365d}td{padding:7px;border:1px solid #cbd5e1;vertical-align:top}.summary{margin-top:10px;font-weight:bold}.signatures{display:flex;gap:40px;margin:42px 18px 0}.signature{flex:1;border-top:1px solid #1f2937;text-align:center;padding-top:5px;font-size:9px}.footer{margin-top:20px;border-top:5px solid #b91c1c;border-bottom:5px solid #1d4ed8;min-height:50px;padding:7px 75px 5px 4px;position:relative;color:#475569;font-size:8px}.footer img{position:absolute;right:8px;bottom:2px;width:54px}@media print{.no-print{display:none}}
    </style></head><body><div class="header"><img src="/JVDlogo-removebg-preview.png" alt="JVD"><div class="contact"><strong>Email:</strong> jvdtransport8@gmail.com<br><strong>Address:</strong> Unit 6 Aryanna Village Center, Susano Road, Camarin, Caloocan City<br><strong>Phone:</strong> 0954 396 0802 &nbsp; <strong>Tel:</strong> 02 8293 8068</div></div><div class="heading"><h1>Passenger Manifest</h1><div class="meta"><strong>${escapePrintValue(packageName)}</strong><br>Generated ${new Date().toLocaleString('en-PH')}</div></div><table><thead><tr><th>No.</th><th>Seat</th><th>Passenger Name</th><th>Role</th><th>Date of Birth</th><th>Emergency Contact</th><th>Medical / Special Notes</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center">No passengers recorded.</td></tr>'}</tbody></table><div class="summary">Manifest count: ${passengers.length} passenger(s)</div><div class="signatures"><div class="signature">Prepared by</div><div class="signature">Tour coordinator</div><div class="signature">Driver acknowledgement</div></div><div class="footer">JVD Event &amp; Travel Management Company<br>DOT Accreditation No. DOT-NCR-TTA-02903-2024<img src="/dot-quality-seal.png" alt="Department of Tourism Quality Seal"></div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 my-6">
        
        {/* Modal Header */}
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              <LuIdCard className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs font-semibold text-gray-500">{packageName} · Named Roster & Seat Assignments</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintManifest}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <LuPrinter className="h-4 w-4" /> Print Roster
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <LuX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50/60 p-3 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoAssignSeats}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700 shadow"
            >
              <LuSparkles className="h-3.5 w-3.5" /> Auto-Assign Seats
            </button>
            {leadCustomer?.name && (
              <button
                type="button"
                onClick={handleFillLeadCustomer}
                className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-300"
              >
                <LuUserCheck className="h-3.5 w-3.5 text-blue-600" /> Fill Customer Name
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addPassenger('student')}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              + Student
            </button>
            <button
              type="button"
              onClick={() => addPassenger('tour_guide')}
              className="rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
            >
              + Tour Guide
            </button>
            <button
              type="button"
              onClick={() => addPassenger('adult')}
              className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
            >
              + Adult
            </button>
            <button
              type="button"
              onClick={() => addPassenger('child')}
              className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            >
              + Child
            </button>
          </div>
        </div>

        {/* Main Content Grid (Roster Table vs Seat Map) */}
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px] items-stretch min-h-[460px]">
          
          {/* Passenger Roster List */}
          <div className="space-y-3 max-h-[480px] min-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {passengers.map((p, idx) => {
              const isActive = p.rowId === activeRowId;
              return (
                <div
                  key={p.rowId}
                  onClick={() => setActiveRowId(p.rowId)}
                  className={`relative rounded-2xl border p-4 transition-all cursor-pointer ${
                    isActive
                      ? 'border-blue-500 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20 dark:bg-blue-950/30'
                      : 'border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-2.5 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {idx + 1}
                      </span>
                      
                      {/* Role Selector Badge */}
                      <select
                        value={p.role}
                        onChange={(e) => updatePassenger(p.rowId, { role: e.target.value as PassengerRole })}
                        className="rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-xs font-black focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="student">Student</option>
                        <option value="tour_guide">Tour Guide</option>
                        <option value="adult">Adult</option>
                        <option value="child">Child</option>
                      </select>

                      {/* Assigned Seat Badge */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Seat:</span>
                        <select
                          value={p.seat_code || ''}
                          onChange={(e) => updatePassenger(p.rowId, { seat_code: e.target.value })}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 focus:outline-none dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        >
                          <option value="">No Seat</option>
                          {Array.from({ length: totalSeats }, (_, i) => String(i + 1)).map((num) => (
                            <option
                              key={num}
                              value={num}
                              disabled={assignedSeatCodes.includes(num) && p.seat_code !== num}
                            >
                              Seat {num} {assignedSeatCodes.includes(num) && p.seat_code !== num ? '(Taken)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePassenger(p.rowId);
                      }}
                      className="text-gray-300 hover:text-rose-500 transition-colors p-1"
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">First Name *</label>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={p.first_name}
                        onChange={(e) => updatePassenger(p.rowId, { first_name: e.target.value })}
                        className="mt-0.5 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Last Name *</label>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={p.last_name}
                        onChange={(e) => updatePassenger(p.rowId, { last_name: e.target.value })}
                        className="mt-0.5 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                          Date of Birth * (Insurance Policy)
                        </label>
                        <span className="text-[8px] font-extrabold uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded">
                          Required
                        </span>
                      </div>
                      <input
                        type="date"
                        required
                        value={p.date_of_birth || ''}
                        onChange={(e) => updatePassenger(p.rowId, { date_of_birth: e.target.value })}
                        className="mt-0.5 w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 px-3 py-2 text-xs font-bold text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Special Requests / Medical Notes</label>
                      <input
                        type="text"
                        placeholder="Dietary / Medical / Wheelchair"
                        value={p.dietary_restrictions || p.special_needs || ''}
                        onChange={(e) => updatePassenger(p.rowId, { dietary_restrictions: e.target.value, special_needs: e.target.value })}
                        className="mt-0.5 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-gray-400 font-medium border-t border-gray-50 dark:border-gray-800/60 pt-2">
                    <span>📞 Passenger contact details inherited from primary purchaser ({leadCustomer?.phone || leadCustomer?.name || 'Order Account'})</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Insured Passenger Record</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Seat Map Reference Panel */}
          <div className="flex flex-col min-h-[420px] rounded-3xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <div className="mb-3 flex items-center justify-between px-1 flex-shrink-0">
              <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Seat Selector Map
              </span>
              <span className="text-[10px] font-bold text-blue-600">
                Click seat to assign
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-center">
              <BusLayout
                totalSeats={totalSeats}
                selectedSeats={assignedSeatCodes}
                occupiedSeats={occupiedSeats}
                onSeatToggle={handleSeatClickFromMap}
                compact={true}
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <span className="text-xs font-bold text-gray-500">
            Total Manifest Count: {passengers.length} Passenger(s) ({passengers.filter((p) => p.role === 'tour_guide').length} Tour Guides)
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:bg-blue-700 shadow-blue-500/20"
            >
              <LuCheck className="h-4 w-4" /> Save Manifest & Seat Roster
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
