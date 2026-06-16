import { useState, useRef, useEffect } from 'react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuBus, LuPlus, LuSearch, LuSettings, LuTriangleAlert, LuLoaderCircle, LuUser,
  LuFileDown, LuFileUp, LuEye, LuChevronRight, LuLayoutGrid
} from 'react-icons/lu';
import { fleetApi } from '../../api/fleet';
import { Pagination, Modal, Button, StatusBadge } from '../../components/ui';
import BusLayout from '../../components/ui/BusLayout';
import type { Bus, BusFormData } from '../../types/inventory';
import { userApi } from '../../api/users';

const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' => {
  switch (status) {
    case 'available': return 'success';
    case 'in_service': return 'info';
    case 'under_maintenance': return 'warning';
    case 'decommissioned': return 'danger';
    default: return 'neutral';
  }
};

const HIGER_PRESETS = [
  { name: 'Custom Seating', model: '', capacity: 49, category: 'ECONOMY', hasRestroom: false },
  { name: 'Higer H92 (49 seats)', model: 'Higer H92', capacity: 49, category: 'ECONOMY', hasRestroom: false },
  { name: 'Higer H93 VIP (49 seats, restroom)', model: 'Higer H93 VIP', capacity: 49, category: 'VIP', hasRestroom: true },
  { name: 'Higer A87 (41 seats)', model: 'Higer A87', capacity: 41, category: 'ECONOMY', hasRestroom: false },
  { name: 'Higer KLQ6122GQ3 (55 seats)', model: 'Higer KLQ6122GQ3', capacity: 55, category: 'ECONOMY', hasRestroom: false },
];

// ── Add/Edit Bus Modal ────────────────────────────────────────────────────────
interface BusModalProps {
  bus?: Bus;
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
}

function BusModal({ bus, isOpen, onClose, mode }: BusModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<BusFormData>>(
    bus ? {
      plate_number: bus.plate_number,
      model: bus.model,
      bus_category: bus.bus_category,
      seating_capacity: bus.seating_capacity,
      status: bus.status,
      total_mileage: bus.total_mileage,
      last_service_date: bus.last_service_date ?? '',
      next_service_due: bus.next_service_due ?? '',
      assigned_driver: bus.driver?.id ?? null,
      custom_seats: bus.custom_seats ?? null,
    } : {
      status: 'available', seating_capacity: 49, total_mileage: 0, bus_category: 'ECONOMY', custom_seats: null
    }
  );

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedSeatToEdit, setSelectedSeatToEdit] = useState<any | null>(null);

  const default49Seats = Array.from({ length: 49 }, (_, idx) => ({
    id: `seat-${idx + 1}`,
    number: String(idx + 1),
    status: 'available' as const,
    active: true,
  }));
  const currentSeats = form.custom_seats || bus?.custom_seats || default49Seats;

  const { data: usersRes } = useQuery({ queryKey: ['users', 'drivers'], queryFn: () => userApi.list({ role: 'driver', per_page: 999 }) });
  const drivers = usersRes?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        seating_capacity: Number(form.seating_capacity || 0),
        total_mileage: Number(form.total_mileage || 0),
      };
      return bus ? fleetApi.update(bus.id, payload) : fleetApi.create(payload as BusFormData);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buses'] }); onClose(); },
  });

  const formatPlateNumber = (val: string) => val.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
  const formatMileage = (val: string) => val.replace(/\D/g, '');

  const field = (label: string, key: keyof BusFormData, type = 'text', placeholder = '', customOnChange?: (val: string) => void) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => {
          if (customOnChange) customOnChange(e.target.value);
          else setForm(p => ({ ...p, [key]: e.target.value }));
        }}
        placeholder={placeholder}
        disabled={mode === 'view'}
        className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
          mode === 'view' 
            ? 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400' 
            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800'
        }`}
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bus ? 'Refine Vehicle Specs' : 'Fleet Registration'}
      size="lg"
    >
      <div className="space-y-8 p-2 overflow-y-auto custom-scrollbar max-h-[75vh]">
        <form id="bus-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span>Vehicle Specifications</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mode !== 'view' && (
                  <div className="space-y-2 col-span-2">
                    <label className="block text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em] ml-1">Quick Select Higer Model Preset</label>
                    <select 
                      onChange={e => {
                        const idx = parseInt(e.target.value);
                        if (!isNaN(idx) && idx > 0) {
                          const preset = HIGER_PRESETS[idx];
                          setForm(p => ({
                            ...p,
                            model: preset.model,
                            seating_capacity: preset.capacity,
                            bus_category: preset.category as any,
                          }));
                        }
                      }}
                      className="w-full px-4 py-3 rounded-2xl border border-blue-200 dark:border-blue-800 text-sm font-semibold transition-all appearance-none text-blue-700 bg-blue-50/50 dark:bg-blue-900/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {HIGER_PRESETS.map((p, i) => (
                        <option key={i} value={i}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {field('Plate Number *', 'plate_number', 'text', 'ABC-1234', val => setForm(p => ({ ...p, plate_number: formatPlateNumber(val) })))}
                {field('Bus Model *', 'model', 'text', 'e.g. Yutong ZK6122H')}
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Category</label>
                  <select value={form.bus_category || 'ECONOMY'} onChange={e => setForm(p => ({ ...p, bus_category: e.target.value as any }))}
                    disabled={mode === 'view'}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all appearance-none ${
                      mode === 'view' 
                        ? 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-900'
                    }`}>
                    <option value="LUXURY">LUXURY</option>
                    <option value="VIP">VIP</option>
                    <option value="ECONOMY">ECONOMY</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Capacity</label>
                  <input type="number" min="1" max="120" value={form.seating_capacity ?? ''} onChange={e => setForm(p => ({ ...p, seating_capacity: e.target.value === '' ? '' : parseInt(e.target.value) as any }))}
                    disabled={mode === 'view'}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
                      mode === 'view' 
                        ? 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800'
                    }`} />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                    disabled={mode === 'view'}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all appearance-none ${
                      mode === 'view' 
                        ? 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-900'
                    }`}>
                    <option value="available">Available</option>
                    <option value="in_service">In Service</option>
                    <option value="under_maintenance">Under Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>
            </div>
          </details>

          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
              <span>Operations & Maintenance</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {field('Total Mileage (km)', 'total_mileage', 'text', '0', val => setForm(p => ({ ...p, total_mileage: val === '' ? '' : (parseInt(formatMileage(val)) || 0) as any })))}
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Assigned Driver</label>
                  <select value={form.assigned_driver || ''} onChange={e => setForm(p => ({ ...p, assigned_driver: e.target.value ? parseInt(e.target.value) : null }))}
                    disabled={mode === 'view'}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all appearance-none ${
                      mode === 'view' 
                        ? 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-900'
                    }`}>
                    <option value="">-- No Driver Assigned --</option>
                    {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
                  </select>
                </div>

                {field('Last Service Date', 'last_service_date', 'date')}
                {field('Next Service Due', 'next_service_due', 'date')}
              </div>
            </div>
          </details>

          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
              <span>Seating Layout</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-6 px-1 flex flex-col items-center justify-center pb-4 space-y-4">
              
              {mode !== 'view' && (
                <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {isCustomizing ? '🔧 Click any seat in the layout to edit its label or presence.' : 'Configure custom seat names, types, or gaps for this bus.'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {isCustomizing ? 'Your edits will be saved locally. Apply them to save.' : 'Standard layout uses 1 to 49 seats.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.custom_seats && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm(p => ({ ...p, custom_seats: null }));
                          setIsCustomizing(false);
                          setSelectedSeatToEdit(null);
                          toast.success('Reset to standard layout.');
                        }}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900 text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Reset Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomizing(!isCustomizing);
                        setSelectedSeatToEdit(null);
                      }}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                        isCustomizing
                          ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400'
                          : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400'
                      }`}
                    >
                      {isCustomizing ? 'Done Customizing' : 'Customize Seats'}
                    </button>
                  </div>
                </div>
              )}

              <div className="w-full flex justify-center overflow-x-auto">
                <BusLayout 
                  seats={currentSeats}
                  totalSeats={form.seating_capacity}
                  isCustomizing={isCustomizing}
                  onSeatClick={(seat) => {
                    if (mode !== 'view' && isCustomizing) {
                      setSelectedSeatToEdit(seat);
                    }
                  }}
                  hasRestroom={(bus?.bus_category ?? form.bus_category) === 'VIP'}
                  className="transform scale-90 sm:scale-100 origin-top"
                />
              </div>

              {/* Edit seat card */}
              {selectedSeatToEdit && isCustomizing && (
                <div className="w-full max-w-xl p-5 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950 rounded-3xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-blue-100/50 dark:border-blue-950/50 pb-2.5">
                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                      Edit Seat Configuration (ID: {selectedSeatToEdit.id})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSeatToEdit(null)}
                      className="text-[10px] font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 uppercase tracking-wider"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Seat Number / Label</label>
                      <input
                        type="text"
                        value={selectedSeatToEdit.number}
                        onChange={(e) => setSelectedSeatToEdit((p: any) => ({ ...p, number: e.target.value.toUpperCase().slice(0, 8) }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                        placeholder="e.g. 1, A1, VIP"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                      <select
                        value={selectedSeatToEdit.status}
                        onChange={(e) => setSelectedSeatToEdit((p: any) => ({ ...p, status: e.target.value as any }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                      >
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="occupied">Occupied</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={selectedSeatToEdit.active !== false}
                        onChange={(e) => setSelectedSeatToEdit((p: any) => ({ ...p, active: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Seat is present on this vehicle</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSeatToEdit(null)}
                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentSeats.map((s: any) =>
                            s.id === selectedSeatToEdit.id ? selectedSeatToEdit : s
                          );
                          setForm(p => ({ ...p, custom_seats: updated }));
                          setSelectedSeatToEdit(null);
                          toast.success(`Seat layout updated locally!`);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                      >
                        Apply Config
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </details>

          {mutation.isError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
              <LuTriangleAlert size={18} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-700 font-medium leading-relaxed">
                Failed to commit vehicle data. Ensure the plate number is unique and all required metrics are provided.
              </p>
            </div>
          )}
        </form>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          {mode === 'view' ? (
            <Button onClick={onClose} className="px-8">
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} className="px-8">
                Cancel
              </Button>
              <Button 
                form="bus-form" 
                type="submit" 
                isLoading={mutation.isPending}
                disabled={!form.plate_number || !form.model}
                className="px-8"
              >
                {mode === 'edit' ? 'Commit Updates' : 'Register Vehicle'}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Fleet() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create'|'edit'|'view'>('create');
  const [editingBus, setEditingBus] = useState<Bus | undefined>();
  const [page, setPage] = useState(1);
  const [pendingUploads, setPendingUploads] = useState<any[] | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [layoutEditingBus, setLayoutEditingBus] = useState<Bus | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Buses');
    const dataSheet = workbook.addWorksheet('Data', { state: 'hidden' });

    dataSheet.getColumn(1).values = ['STATUS', 'available', 'in_service', 'under_maintenance', 'decommissioned'];

    // Set columns with widths + headers first
    worksheet.columns = [
      { header: 'Plate Number', key: 'plate_number', width: 20 },
      { header: 'Bus Model', key: 'model', width: 25 },
      { header: 'Seating Capacity', key: 'seating_capacity', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Total Mileage', key: 'total_mileage', width: 20 },
    ];

    // Style the header row (row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.commit();

    for (let i = 2; i <= 500; i++) {
      worksheet.getCell(`D${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Data!$A$2:$A$5`],
        showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select a status from the dropdown menu.'
      };
    }

    const helpSheet = workbook.addWorksheet('Instructions');
    helpSheet.mergeCells('A1:B1');
    const brandCell = helpSheet.getCell('A1');
    brandCell.value = 'JVD INTERNAL MANAGEMENT SYSTEM';
    brandCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FF1E293B' } };
    brandCell.alignment = { horizontal: 'center' };

    helpSheet.addRow(['BULK FLEET REGISTRATION GUIDE']);
    helpSheet.getRow(2).font = { bold: true, size: 12, color: { argb: 'FF3B82F6' } };
    helpSheet.addRow(['']);
    helpSheet.addRow(['1. Fill in the "Buses" sheet starting from row 2.']);
    helpSheet.addRow(['2. Do not modify or delete the header row (Row 1).']);
    helpSheet.addRow(['3. Use the dropdown menus for Status.']);
    
    helpSheet.getColumn(1).width = 40;
    helpSheet.getColumn(2).width = 60;

    // Add example row at row 2 (must use getRow(2) explicitly — addRow goes to row 501
    // because the validation loop already touches rows 2-500 via getCell())
    const exampleRow = worksheet.getRow(2);
    exampleRow.getCell('plate_number').value = 'ABC-1234';
    exampleRow.getCell('model').value = 'Yutong ZK6122H';
    exampleRow.getCell('seating_capacity').value = 45;
    exampleRow.getCell('status').value = 'available';
    exampleRow.getCell('total_mileage').value = 0;
    exampleRow.font = { italic: true, color: { argb: 'FF9CA3AF' } };
    exampleRow.commit();

    workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'JVD_Fleet_Bulk_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Branded template with dropdowns downloaded!');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    try {
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      const busesToUpload: any[] = [];
      const errors_list: string[] = [];

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const plate_number = row.getCell(1).text?.trim();
        const model = row.getCell(2).text?.trim();
        const seating_capacity = parseInt(row.getCell(3).text?.trim() || '0');
        const status = row.getCell(4).text?.trim();
        const total_mileage = parseInt(row.getCell(5).text?.trim() || '0');

        if (!plate_number && !model) return;

        if (!plate_number || !model || !status) {
          errors_list.push(`Row ${rowNumber}: Incomplete data (Plate, Model, Status are required).`);
          return;
        }

        busesToUpload.push({
          plate_number: plate_number.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10),
          model,
          seating_capacity: isNaN(seating_capacity) ? 45 : seating_capacity,
          status: status,
          total_mileage: isNaN(total_mileage) ? 0 : total_mileage,
        });
      });

      if (errors_list.length > 0) {
        const displayErrors = errors_list.slice(0, 3);
        const remaining = errors_list.length - 3;
        displayErrors.forEach(err => toast.error(err, { duration: 4000 }));
        if (remaining > 0) toast.error(`...and ${remaining} more errors found.`, { duration: 5000 });
        e.target.value = '';
        return;
      }

      if (busesToUpload.length === 0) {
        toast.error('No data found in the Excel file.');
        e.target.value = '';
        return;
      }

      setPendingUploads(busesToUpload);
      setIsPreviewModalOpen(true);
      e.target.value = '';
    } catch (err) {
      toast.error('Failed to parse Excel file. Please use the provided template.');
      console.error(err);
      e.target.value = '';
    }
  };

  const createBusMutation = useMutation({
    mutationFn: (data: any) => fleetApi.create(data as BusFormData),
  });

  const handleBulkUploadConfirm = async () => {
    if (!pendingUploads || pendingUploads.length === 0) return;

    const busesToUpload = [...pendingUploads];
    setPendingUploads(null);
    setIsPreviewModalOpen(false);

    const uploadToast = toast.loading(`Registering ${busesToUpload.length} vehicles...`);
    let successCount = 0;
    
    for (const bus of busesToUpload) {
      try {
        await createBusMutation.mutateAsync(bus);
        successCount++;
      } catch (err: any) {
        console.error(`Upload error for ${bus.plate_number}:`, err);
      }
    }

    toast.dismiss(uploadToast);
    qc.invalidateQueries({ queryKey: ['buses'] });
    if (successCount === busesToUpload.length) {
      toast.success(`Successfully registered ${successCount} vehicles!`);
    } else {
      toast.success(`Completed with partial success: ${successCount}/${busesToUpload.length} registered.`);
    }
  };

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['buses', search, statusFilter, page],
    queryFn: () => fleetApi.list({ 
      search: search || undefined, 
      status: statusFilter || undefined,
      page,
      per_page: 10
    }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const buses = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleView = (bus: Bus) => {
    setEditingBus(bus);
    setModalMode('view');
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingBus(undefined);
    setModalMode('create');
    setShowModal(true);
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Vehicles
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Company Fleet Registry
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <LuPlus size={16} /> Register Bus
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center flex-1">
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 dark:border-gray-800 max-w-md flex-1 min-w-[250px]">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <LuSearch size={18} />
            </div>
            <input
              type="text"
              placeholder="Search plate or model..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-900 font-medium text-gray-600 dark:text-gray-300 appearance-none min-w-[150px]">
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="in_service">In Service</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="decommissioned">Decommissioned</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
            <LuFileDown className="w-4 h-4" /> Format
          </button>
          <label className="cursor-pointer flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
            <LuFileUp className="w-4 h-4" /> Bulk Upload
            <input type="file" multiple className="hidden" accept=".csv,.xlsx" onChange={handleFileChange} ref={fileInputRef} />
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Plate & Model</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Capacity</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Driver</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Mileage</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-50 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400">
                    <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium">Retrieving fleet data...</p>
                  </td>
                </tr>
              ) : buses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400">
                    <LuBus size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No vehicles found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                buses.map(bus => (
                  <tr key={bus.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group border-b border-gray-50 last:border-0">
                    <td className="px-8 py-6">
                      <div className="font-bold text-gray-900 dark:text-white text-base leading-tight">{bus.plate_number}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {bus.model} {bus.bus_category ? `• ${bus.bus_category}` : ''}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-block whitespace-nowrap px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black tracking-widest uppercase border border-gray-100 dark:border-gray-800">
                        {bus.seating_capacity} pax
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <StatusBadge 
                          status={bus.status.replace('_', ' ')} 
                          variant={getStatusVariant(bus.status)} 
                        />
                        {bus.is_service_overdue && (
                          <div className="flex items-center gap-1.5 text-[9px] text-red-500 font-black uppercase tracking-widest mt-1">
                            <LuTriangleAlert size={12} /> Overdue PMS
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {bus.driver ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                            <LuUser size={14} />
                          </div>
                          <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            {bus.driver.first_name} {bus.driver.last_name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-gray-900 dark:text-white font-black text-base">{bus.total_mileage.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Kilometers</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(bus)}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="View Details"
                        >
                          <LuEye size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setLayoutEditingBus(bus);
                            setIsLayoutModalOpen(true);
                          }}
                          className="p-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Custom Seat Layout"
                        >
                          <LuLayoutGrid size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(bus)}
                          className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit Fleet"
                        >
                          <LuSettings size={18} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BusModal 
        key={editingBus ? editingBus.id : 'new'}
        bus={editingBus} 
        mode={modalMode}
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />

      <LayoutModal
        isOpen={isLayoutModalOpen}
        bus={layoutEditingBus}
        onClose={() => {
          setIsLayoutModalOpen(false);
          setLayoutEditingBus(undefined);
        }}
      />

      {/* Preview Modal for Bulk Upload */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => { setIsPreviewModalOpen(false); setPendingUploads(null); }}
        title="Confirm Bulk Upload"
        size="lg"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You are about to register <strong>{pendingUploads?.length}</strong> vehicles. Please confirm the details below.
          </p>
          <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              {pendingUploads?.slice(0, 10).map((bus, i) => (
                <li key={i} className="flex justify-between border-b border-gray-200 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
                  <span className="font-bold">{bus.plate_number}</span>
                  <span>{bus.model}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">{bus.status}</span>
                </li>
              ))}
              {pendingUploads && pendingUploads.length > 10 && (
                <li className="text-center text-gray-400 text-xs italic pt-2">...and {pendingUploads.length - 10} more</li>
              )}
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => { setIsPreviewModalOpen(false); setPendingUploads(null); }}>
              Cancel
            </Button>
            <Button onClick={handleBulkUploadConfirm}>
              Confirm Upload
            </Button>
          </div>
        </div>
      </Modal>

      {meta && meta.last_page > 1 && (
        <Pagination
          currentPage={page}
          lastPage={meta.last_page}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// ── Custom Seating Layout Modal ──────────────────────────────────────────────
interface LayoutModalProps {
  bus?: Bus;
  isOpen: boolean;
  onClose: () => void;
}

function LayoutModal({ bus, isOpen, onClose }: LayoutModalProps) {
  const qc = useQueryClient();
  const [customSeats, setCustomSeats] = useState<any[] | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);

  // Sync state when bus changes or modal opens
  useEffect(() => {
    if (bus) {
      setCustomSeats(bus.custom_seats || null);
    } else {
      setCustomSeats(null);
    }
    setSelectedSeat(null);
  }, [bus, isOpen]);

  const mutation = useMutation({
    mutationFn: (seatsData: any[] | null) => 
      fleetApi.update(bus!.id, { custom_seats: seatsData }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buses'] });
      toast.success('Seating layout saved successfully!');
      onClose();
    },
  });

  if (!bus) return null;

  const default49Seats = Array.from({ length: 49 }, (_, idx) => ({
    id: `seat-${idx + 1}`,
    number: String(idx + 1),
    status: 'available' as const,
    active: true,
  }));

  const currentSeats = customSeats || default49Seats;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Custom Seating Layout – ${bus.plate_number}`}
      size="lg"
    >
      <div className="space-y-6 p-2 overflow-y-auto custom-scrollbar max-h-[75vh]">
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-bold">🔧 Custom Seat Editor Mode</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Click on any seat below to change its label/number, default status, or remove it from the layout.
          </p>
        </div>

        <div className="flex justify-center overflow-x-auto py-2">
          <BusLayout
            seats={currentSeats}
            isCustomizing={true}
            onSeatClick={(seat) => setSelectedSeat(seat)}
            hasRestroom={bus.bus_category === 'VIP'}
            className="transform scale-90 sm:scale-100 origin-top"
          />
        </div>

        {selectedSeat && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-700 pb-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Configure Seat (ID: {selectedSeat.id})
              </span>
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Seat Number / Label</label>
                <input
                  type="text"
                  value={selectedSeat.number}
                  onChange={(e) => setSelectedSeat((p: any) => ({ ...p, number: e.target.value.toUpperCase().slice(0, 8) }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                  placeholder="e.g. 1, A1, VIP"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                <select
                  value={selectedSeat.status}
                  onChange={(e) => setSelectedSeat((p: any) => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="occupied">Occupied</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedSeat.active !== false}
                  onChange={(e) => setSelectedSeat((p: any) => ({ ...p, active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Seat is present on this vehicle</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSeat(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = currentSeats.map((s: any) =>
                      s.id === selectedSeat.id ? selectedSeat : s
                    );
                    setCustomSeats(updated);
                    setSelectedSeat(null);
                    toast.success(`Seat ${selectedSeat.number} updated locally!`);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                >
                  Apply Config
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-6 border-t border-gray-150 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              setCustomSeats(null);
              setSelectedSeat(null);
              toast.success('Reset to standard 49-seat layout.');
            }}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900 text-xs font-black uppercase tracking-wider transition-all"
          >
            Reset to Standard
          </button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="px-8">
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate(customSeats)}
              isLoading={mutation.isPending}
              className="px-8"
            >
              Commit Layout
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
