import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { LuX, LuLoader, LuTruck, LuPackage, LuUser, LuBuilding2, LuPhone, LuMail, LuMapPin, LuHash } from 'react-icons/lu';
import { useEntityPreview } from '../../context/EntityPreviewContext';
import { supplierApi } from '../../api/suppliers';
import { inventoryApi } from '../../api/inventory';
import { userApi } from '../../api/users';

export default function EntityPreviewPanel() {
  const { isOpen, entityType, entityId, searchQuery, showPreview, closePreview } = useEntityPreview();

  // Fetch data based on entity type or search query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['preview', entityType, entityId, searchQuery],
    queryFn: async () => {
      if (entityType === 'search' && searchQuery) {
        const [suppliersRes, inventoryRes, usersRes] = await Promise.all([
          supplierApi.list({ search: searchQuery }).catch(() => ({ data: { data: [] } })),
          inventoryApi.list({ search: searchQuery }).catch(() => ({ data: { data: [] } })),
          userApi.list({ search: searchQuery }).catch(() => ({ data: { data: [] } })),
        ]);
        
        return {
          suppliers: suppliersRes.data?.data || [],
          inventory: inventoryRes.data?.data || [],
          users: usersRes.data?.data || [],
        };
      }

      if (!entityId) return null;
      if (entityType === 'supplier') return supplierApi.get(entityId).then(res => res.data.data);
      if (entityType === 'inventory') return inventoryApi.get(entityId).then(res => res.data.data);
      if (entityType === 'driver') return userApi.get(entityId).then(res => res.data.data);
      return null;
    },
    enabled: isOpen && (!!entityId || (entityType === 'search' && !!searchQuery)),
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <LuLoader className="w-8 h-8 animate-spin mb-4 text-blue-600" />
          <p>Loading details...</p>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <p>Failed to load entity details.</p>
        </div>
      );
    }

    if (entityType === 'supplier') {
      const supplier = data as any;
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
              <LuTruck size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{supplier.company_name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${supplier.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {supplier.is_verified ? 'Verified Partner' : 'Unverified'}
                </span>
                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700">
                  {supplier.accreditation_status}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Contact Information</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <LuUser className="text-gray-400 shrink-0" /> <span>{supplier.contact_person || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <LuPhone className="text-gray-400 shrink-0" /> <span>{supplier.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <LuMail className="text-gray-400 shrink-0" /> <span>{supplier.email || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <LuMapPin className="text-gray-400 shrink-0 mt-0.5" /> <span>{supplier.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Financial Details</h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">TIN Number</span>
                <span className="font-medium text-gray-900 dark:text-white">{supplier.tin_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bank</span>
                <span className="font-medium text-gray-900 dark:text-white">{supplier.bank_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Account</span>
                <span className="font-medium text-gray-900 dark:text-white">{supplier.bank_account_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Terms</span>
                <span className="font-medium text-gray-900 dark:text-white">{supplier.payment_terms || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (entityType === 'inventory') {
      const item = data as any;
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <LuPackage size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{item.item_name}</h2>
              <span className="inline-block mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700">
                {item.category}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Stock</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{item.quantity} <span className="text-sm font-medium text-gray-500">{item.unit}</span></p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unit Cost</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">₱{Number(item.unit_cost).toLocaleString()}</p>
            </div>
          </div>
        </div>
      );
    }

    if (entityType === 'driver') {
      const driver = data as any;
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 shrink-0 overflow-hidden">
              {driver.avatar_url ? (
                <img src={driver.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black">{driver.first_name[0]}{driver.last_name[0]}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{driver.first_name} {driver.last_name}</h2>
              <span className="inline-block mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-purple-50 text-purple-700">
                {driver.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Employee Details</h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between text-sm border-b border-gray-50 dark:border-gray-800 pb-2">
                <span className="text-gray-500 flex items-center gap-2"><LuHash size={16} /> Employee ID</span>
                <span className="font-medium text-gray-900 dark:text-white">{driver.employee_id}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-b border-gray-50 dark:border-gray-800 pb-2">
                <span className="text-gray-500 flex items-center gap-2"><LuBuilding2 size={16} /> Department</span>
                <span className="font-medium text-gray-900 dark:text-white">{driver.department}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><LuMail size={16} /> Email</span>
                <span className="font-medium text-gray-900 dark:text-white">{driver.email}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (entityType === 'search') {
      const results = data as { suppliers: any[]; inventory: any[]; users: any[] };
      const hasResults = results.suppliers.length > 0 || results.inventory.length > 0 || results.users.length > 0;

      return (
        <div className="space-y-6">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">🔍 Cross Check Connections</h2>
            <p className="text-xs text-gray-500 mt-1">Found connections matching: <span className="font-semibold text-blue-600">"{searchQuery}"</span></p>
          </div>

          {!hasResults ? (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <p className="text-sm">No connections found in database.</p>
              <p className="text-xs text-gray-400">Try selecting a different keyword, name, or code.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Suppliers */}
              {results.suppliers.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2"><LuTruck /> Suppliers ({results.suppliers.length})</h3>
                  <div className="grid gap-2">
                    {results.suppliers.map((s: any) => (
                      <button key={s.id} onClick={() => showPreview('supplier', s.id)} className="w-full text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 transition-all active:scale-[0.98]">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{s.company_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Contact: {s.contact_person || 'N/A'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory Items */}
              {results.inventory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2"><LuPackage /> Inventory Items ({results.inventory.length})</h3>
                  <div className="grid gap-2">
                    {results.inventory.map((i: any) => (
                      <button key={i.id} onClick={() => showPreview('inventory', i.id)} className="w-full text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 transition-all active:scale-[0.98]">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{i.item_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Stock: {i.quantity} {i.unit} | Category: {i.category}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Users/Drivers */}
              {results.users.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2"><LuUser /> Employees & Drivers ({results.users.length})</h3>
                  <div className="grid gap-2">
                    {results.users.map((u: any) => (
                      <button key={u.id} onClick={() => showPreview('driver', u.id)} className="w-full text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 transition-all active:scale-[0.98]">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Role: {u.role.replace('_', ' ')} | ID: {u.employee_id}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[100]"
            onClick={closePreview}
          />
          
          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-[110] flex flex-col border-l border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">
                Entity Profile Preview
              </h3>
              <button
                onClick={closePreview}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <LuX size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
