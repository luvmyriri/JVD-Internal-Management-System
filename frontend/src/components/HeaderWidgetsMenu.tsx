import { useState, type ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LuLayoutGrid, LuClipboardList, LuActivity, LuTrendingUp, LuBus, LuX, LuZap } from 'react-icons/lu';
import QuickActionsWidget from '../pages/dashboards/widgets/QuickActionsWidget';
import ApprovalsWidget from '../pages/dashboards/widgets/ApprovalsWidget';
import TasksWidget from '../pages/dashboards/widgets/TasksWidget';
import RevenueWidget from '../pages/dashboards/widgets/RevenueWidget';
import FleetWidget from '../pages/dashboards/widgets/FleetWidget';

type WidgetId = 'shortcuts' | 'approvals' | 'tasks' | 'revenue' | 'fleet';

const TABS: { id: WidgetId; label: string; icon: ReactNode }[] = [
  { id: 'shortcuts', label: 'Shortcuts', icon: <LuZap className="w-4 h-4" /> },
  { id: 'approvals', label: 'Approvals', icon: <LuClipboardList className="w-4 h-4" /> },
  { id: 'tasks', label: 'Tasks', icon: <LuActivity className="w-4 h-4" /> },
  { id: 'revenue', label: 'Revenue', icon: <LuTrendingUp className="w-4 h-4" /> },
  { id: 'fleet', label: 'Fleet', icon: <LuBus className="w-4 h-4" /> },
];

/**
 * Widgets menu that lives in the header beside Messages/Notifications. Opens a
 * dropdown with the Phase 3 dashboard widgets (Approvals / Tasks / Revenue / Fleet)
 * as tabs, so they're reachable without a floating dock obstructing the page.
 */
export default function HeaderWidgetsMenu() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<WidgetId>('shortcuts');

  const renderWidget = () => {
    switch (active) {
      case 'shortcuts': return <QuickActionsWidget onNavigate={() => setOpen(false)} />;
      case 'approvals': return <ApprovalsWidget />;
      case 'tasks': return <TasksWidget />;
      case 'revenue': return <RevenueWidget />;
      case 'fleet': return <FleetWidget />;
      default: return null;
    }
  };

  return (
    <div className="relative">
      <button
        id="header-widgets"
        onClick={() => setOpen((o) => !o)}
        className={`relative p-2 rounded-xl transition ${
          theme === 'dark'
            ? 'text-gray-400 hover:text-white hover:bg-gray-800'
            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
        } ${open ? (theme === 'dark' ? 'text-white bg-gray-800' : 'text-gray-700 bg-gray-100') : ''}`}
        title="Widgets"
      >
        <LuLayoutGrid className="w-5 h-5" />
      </button>

      {open && (
        <>
          {/* Overlay to dismiss on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown Card */}
          <div
            className={`fixed left-4 right-4 top-[72px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[380px] rounded-2xl border shadow-xl z-20 overflow-hidden ${
              theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-100 text-slate-800'
            }`}
          >
            {/* Header */}
            <div
              className={`px-4 pt-4 pb-3 border-b flex items-center justify-between ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
              }`}
            >
              <h3 className="text-xs font-black uppercase tracking-wider">Widgets</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Close"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex items-center gap-1 p-2 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition ${
                    active === t.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-800'
                        : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Active widget content */}
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
              {renderWidget()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
