import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AVAILABLE_WIDGETS, WIDGET_CATEGORIES } from '../../config/dashboardWidgets';
import { WidgetRenderer } from '../../components/dashboard/WidgetRenderer';
import { LuArrowLeft, LuPlus, LuX, LuArrowUp, LuArrowDown, LuRotateCcw, LuCheck, LuSparkles, LuLayoutGrid } from 'react-icons/lu';
import toast from 'react-hot-toast';

const DEFAULT_WIDGET_IDS = [
  'accounting_revenue',
  'fleet_status',
  'sales_bookings',
  'hr_headcount',
  'system_approvals',
  'system_quick_actions',
];

export default function DashboardCustomizerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeView, setActiveView] = useState<'default' | 'custom'>(() => {
    const saved = localStorage.getItem('jvd_active_dashboard_view');
    return saved === 'custom' ? 'custom' : 'default';
  });

  const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('jvd_custom_dashboard_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved custom layout', e);
      }
    }
    return DEFAULT_WIDGET_IDS;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);

  const handleToggleWidget = (id: string) => {
    if (activeWidgetIds.includes(id)) {
      if (activeWidgetIds.length <= 1) {
        toast.error('You must keep at least 1 card active.');
        return;
      }
      setActiveWidgetIds(prev => prev.filter(w => w !== id));
    } else {
      setActiveWidgetIds(prev => [...prev, id]);
    }
  };

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeWidgetIds.length) return;

    const updated = [...activeWidgetIds];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    setActiveWidgetIds(updated);
  };

  const handleResetDefaults = () => {
    setActiveWidgetIds(DEFAULT_WIDGET_IDS);
    setActiveView('default');
    toast.success('Reset layout to system default cards.');
  };

  const handleSaveAndApply = () => {
    localStorage.setItem('jvd_custom_dashboard_layout', JSON.stringify(activeWidgetIds));
    localStorage.setItem('jvd_active_dashboard_view', activeView);

    toast.success('Dashboard preferences saved & applied!');
    navigate('/dashboard');
  };

  const filteredCatalogWidgets = AVAILABLE_WIDGETS.filter(widget => {
    if (selectedCategory === 'all') return true;
    return widget.category === selectedCategory;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <LuArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <LuSparkles className="w-6 h-6 text-blue-500" />
              Dedicated Dashboard Customizer
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              Select, arrange, and customize module cards that reflect on your dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-200 transition flex items-center gap-2 cursor-pointer"
          >
            <LuRotateCcw size={14} /> Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSaveAndApply}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <LuCheck size={16} /> Save & Apply to Dashboard
          </button>
        </div>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setActiveView('default')}
          className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${
            activeView === 'default'
              ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-600 shadow-md shadow-blue-500/10'
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <LuLayoutGrid size={22} />
            </div>
            {activeView === 'default' && (
              <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                Active Mode
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Role System Dashboard (Default)</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Displays your role's standard operations metrics ({user?.role?.replace('_', ' ').toUpperCase()}). Clean, official, and pre-configured.
          </p>
        </div>

        <div
          onClick={() => setActiveView('custom')}
          className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${
            activeView === 'custom'
              ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-600 shadow-md shadow-purple-500/10'
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <LuSparkles size={22} />
            </div>
            {activeView === 'custom' && (
              <span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                Active Mode
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Personalized Custom Workspace</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Display your custom selected module cards below. Fully tailored to your daily workflow across all 8 system modules.
          </p>
        </div>
      </div>

      {/* Card Selection & Re-Ordering Section */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-tight">
              Active Cards Selection ({activeWidgetIds.length} Cards Selected)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Toggle cards to include or re-order cards using the controls below.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <LuPlus size={16} /> Browse Module Card Library
          </button>
        </div>

        {/* Selected Cards Manager Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeWidgetIds.map((id, index) => {
            const widgetDef = AVAILABLE_WIDGETS.find(w => w.id === id);
            return (
              <div
                key={id}
                className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                    {widgetDef?.category || 'Module'}
                  </span>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate mt-0.5">
                    {widgetDef?.title || id}
                  </h4>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{widgetDef?.description}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveWidget(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-200 cursor-pointer"
                    title="Move Up"
                  >
                    <LuArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveWidget(index, 'down')}
                    disabled={index === activeWidgetIds.length - 1}
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-200 cursor-pointer"
                    title="Move Down"
                  >
                    <LuArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleWidget(id)}
                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer"
                    title="Remove Card"
                  >
                    <LuX size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Preview Area */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">
          Live Card Layout Preview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeWidgetIds.map(id => (
            <div key={id} className="relative">
              <WidgetRenderer widgetId={id} />
            </div>
          ))}
        </div>
      </div>

      {/* Card Catalog Drawer / Modal */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  Module Card Library
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select cards across system modules to add to your custom workspace.
                </p>
              </div>
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 flex gap-2 overflow-x-auto custom-scrollbar">
              {WIDGET_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCatalogWidgets.map(widget => {
                const isSelected = activeWidgetIds.includes(widget.id);
                return (
                  <div
                    key={widget.id}
                    onClick={() => handleToggleWidget(widget.id)}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                        {widget.category}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{widget.title}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                        {widget.description}
                      </p>
                    </div>

                    <span
                      className={`p-2 rounded-xl text-xs font-bold transition ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {isSelected ? <LuCheck size={14} /> : <LuPlus size={14} />}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
