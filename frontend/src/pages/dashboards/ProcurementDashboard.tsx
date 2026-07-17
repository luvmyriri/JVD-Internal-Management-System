import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LuShoppingCart,
  LuBuilding2,
  LuBanknote,
} from 'react-icons/lu';

import { supplierApi } from '../../api/suppliers';
import { purchaseOrderApi } from '../../api/purchaseOrders';
import { LoadingScreen, RequestCommissionModal } from '../../components/ui';
import { DataTable, type Column } from '../../components/ds';

export default function ProcurementDashboard() {
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // ── Live API Queries ──────────────────────────────────────────────────────
  const { data: suppliersRaw, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => supplierApi.list({ per_page: 100 }).then(r => r.data),
  });

  const { data: posRaw, isLoading: loadingPos } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrderApi.list({ per_page: 100 }).then(r => r.data),
  });

  const suppliers = suppliersRaw?.data ?? [];
  const purchaseOrders = posRaw?.data ?? [];

  const pendingPos = purchaseOrders.filter((po: any) => po.status === 'pending');
  
  if (loadingSuppliers || loadingPos) return <LoadingScreen />;

  const columns: Column<any>[] = [
    {
      key: 'po_number',
      header: 'PO Number',
      render: (po) => <span className="font-medium text-slate-800">{po.po_number}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (po) => <span className="text-slate-600">{po.supplier?.company_name || po.supplier?.name || 'TBD'}</span>,
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (po) => <span className="text-slate-600">{po.created_at ? po.created_at.split('T')[0] : ''}</span>,
    },
    {
      key: 'total_amount',
      header: 'Amount',
      render: (po) => (
        <span className="text-slate-600">
          ₱{parseFloat(po.total_amount).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          PENDING
        </span>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Procurement Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage purchase orders and supplier relationships.</p>
        </div>
        <button 
          onClick={() => setShowCommissionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors"
        >
          <LuBanknote className="w-5 h-5" />
          Request Commission
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Suppliers</p>
              <h3 className="text-3xl font-bold text-slate-800">{suppliers.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <LuBuilding2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending Purchase Orders</p>
              <h3 className="text-3xl font-bold text-slate-800">{pendingPos.length}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <LuShoppingCart className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Purchase Orders</p>
              <h3 className="text-3xl font-bold text-slate-800">{purchaseOrders.length}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl">
              <LuShoppingCart className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Pending Purchase Orders Table ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <span className="w-5 h-5 block rounded-full border-2 border-amber-600"></span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Pending Purchase Orders</h2>
          </div>
        </div>
        
        <div className="p-0">
          <DataTable
            columns={columns}
            data={pendingPos}
            rowKey={(po) => po.id}
            empty={<div className="p-8 text-center text-slate-500">No pending purchase orders at the moment.</div>}
            className="border-0 rounded-none bg-transparent [&_table]:min-w-[800px]"
          />
        </div>
      </div>

      <RequestCommissionModal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} />
    </div>
  );
}
