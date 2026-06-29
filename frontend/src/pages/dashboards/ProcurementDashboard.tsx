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

      <RequestCommissionModal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} />
    </div>
  );
}
