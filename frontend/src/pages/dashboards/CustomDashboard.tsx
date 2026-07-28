import { useState, useEffect } from 'react';
import { WidgetRenderer } from '../../components/dashboard/WidgetRenderer';
import { WidgetCatalogModal } from '../../components/dashboard/WidgetCatalogModal';
import { AVAILABLE_WIDGETS } from '../../config/dashboardWidgets';
import { LuPlus, LuX, LuArrowLeft, LuArrowRight, LuRotateCcw, LuSparkles } from 'react-icons/lu';
import toast from 'react-hot-toast';

const DEFAULT_WIDGET_IDS = [
  'accounting_revenue',
  'fleet_status',
  'sales_bookings',
  'hr_headcount',
  'system_approvals',
  'system_quick_actions',
];

export default function CustomDashboard() {
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

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('jvd_custom_dashboard_layout', JSON.stringify(activeWidgetIds));
  }, [activeWidgetIds]);

  const handleSaveWidgets = (newWidgetIds: string[]) => {
    setActiveWidgetIds(newWidgetIds);
    toast.success('Custom dashboard layout saved!');
  };

  const handleRemoveWidget = (id: string) => {
    setActiveWidgetIds((prev) => prev.filter((item) => item !== id));
  };

  const handleMoveWidget = (index: number, direction: 'left' | 'right') => {
    const newArr = [...activeWidgetIds];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newArr.length) return;

    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;

    setActiveWidgetIds(newArr);
  };

  const handleResetLayout = () => {
    setActiveWidgetIds(DEFAULT_WIDGET_IDS);
    toast.success('Reset to default card layout');
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <LuSparkles className="w-5 h-5 text-blue-500" />
            My Personal Customized Dashboard
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            Your personalized card workspace with cards pulled across system modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isEditMode
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {isEditMode ? 'Done Editing' : 'Arrange Cards'}
          </button>

          <button
            onClick={() => setIsCatalogOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
          >
            <LuPlus size={16} /> Add / Remove Cards
          </button>

          {isEditMode && (
            <button
              onClick={handleResetLayout}
              title="Reset layout to default"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <LuRotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      {activeWidgetIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
          <LuSparkles className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight">
            Your Dashboard is Empty
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            You have not pulled any cards to your custom layout yet. Click below to add cards from Accounting, HR, Fleet, Sales, Procurement, Travel, or Inventory.
          </p>
          <button
            onClick={() => setIsCatalogOpen(true)}
            className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <LuPlus size={16} /> Browse & Add Cards
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeWidgetIds.map((id, index) => {
            const def = AVAILABLE_WIDGETS.find((w) => w.id === id);
            const colSpanClass = def?.defaultColSpan || 'col-span-1';

            return (
              <div key={id} className={`relative group ${colSpanClass}`}>
                {isEditMode && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md backdrop-blur-sm">
                    {index > 0 && (
                      <button
                        onClick={() => handleMoveWidget(index, 'left')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
                        title="Move left/up"
                      >
                        <LuArrowLeft size={14} />
                      </button>
                    )}
                    {index < activeWidgetIds.length - 1 && (
                      <button
                        onClick={() => handleMoveWidget(index, 'right')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
                        title="Move right/down"
                      >
                        <LuArrowRight size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveWidget(id)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded-lg"
                      title="Remove card"
                    >
                      <LuX size={14} />
                    </button>
                  </div>
                )}

                <WidgetRenderer widgetId={id} />
              </div>
            );
          })}
        </div>
      )}

      {/* Catalog Picker Modal */}
      <WidgetCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        activeWidgetIds={activeWidgetIds}
        onSaveWidgets={handleSaveWidgets}
      />
    </div>
  );
}
