import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuBus, LuPlus, LuSearch, LuSettings, LuTriangleAlert, LuLoaderCircle, LuUser,
  LuFileDown, LuFileUp, LuEye, LuChevronRight
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
    } : {
      status: 'available', seating_capacity: 49, total_mileage: 0, bus_category: 'ECONOMY'
    }
  );

  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => userApi.list() });
  const drivers = usersRes?.data?.data?.filter((u: any) => u.role === 'driver' || u.department === 'fleet') ?? [];

  const mutation = useMutation({
    mutationFn: () => bus ? fleetApi.update(bus.id, form) : fleetApi.create(form as BusFormData),
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
                  <input type="number" min="1" max="120" value={form.seating_capacity ?? ''} onChange={e => setForm(p => ({ ...p, seating_capacity: parseInt(e.target.value) || 0 }))}
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
                {field('Total Mileage (km)', 'total_mileage', 'text', '0', val => setForm(p => ({ ...p, total_mileage: parseInt(formatMileage(val)) || 0 })))}
                
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
            <div className="pt-6 px-1 flex justify-center overflow-x-auto pb-4">
              <BusLayout 
                hasRestroom={(bus?.bus_category ?? form.bus_category) === 'VIP'}
                className="transform scale-90 sm:scale-100 origin-top"
              />
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
