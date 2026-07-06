import { useState } from 'react';
import { cn } from '../utils';
import { Activity, ClipboardList, TrendingUp, Bus, X, LayoutDashboard } from 'lucide-react';
import ApprovalsWidget from '../pages/dashboards/widgets/ApprovalsWidget';
import TasksWidget from '../pages/dashboards/widgets/TasksWidget';
import RevenueWidget from '../pages/dashboards/widgets/RevenueWidget';
import FleetWidget from '../pages/dashboards/widgets/FleetWidget';
import { useAuth } from '../context/AuthContext';

type WidgetId = 'approvals' | 'tasks' | 'revenue' | 'fleet' | null;

export default function FloatingWidgetDock() {
  const [activeWidget, setActiveWidget] = useState<WidgetId>(null);
  const { user } = useAuth();

  // Only show dock if user is logged in
  if (!user) return null;

  const toggleWidget = (id: WidgetId) => {
    setActiveWidget(prev => prev === id ? null : id);
  };

  const WidgetContent = () => {
    switch (activeWidget) {
      case 'approvals': return <ApprovalsWidget />;
      case 'tasks': return <TasksWidget />;
      case 'revenue': return <RevenueWidget />;
      case 'fleet': return <FleetWidget />;
      default: return null;
    }
  };

  return (
    <>
      {/* Dock (Icons) */}
      <div className="fixed top-1/4 left-0 z-[100] bg-white dark:bg-gray-900 border border-l-0 border-gray-200 dark:border-gray-800 shadow-xl rounded-r-2xl py-3 px-1.5 flex flex-col gap-3 transition-transform hover:translate-x-0 -translate-x-1 hover:pr-2">
        <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center mb-1 -rotate-90 origin-center whitespace-nowrap opacity-50 py-4">Widgets</div>
        
        <button 
          onClick={() => toggleWidget('approvals')}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 group relative",
            activeWidget === 'approvals' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
          )}
          title="Pending Approvals"
        >
          <ClipboardList className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute left-full ml-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap transition-opacity">Approvals</span>
        </button>

        <button 
          onClick={() => toggleWidget('tasks')}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 group relative",
            activeWidget === 'tasks' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"
          )}
          title="My Tasks"
        >
          <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute left-full ml-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap transition-opacity">Tasks</span>
        </button>

        <button 
          onClick={() => toggleWidget('revenue')}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 group relative",
            activeWidget === 'revenue' ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400" : "text-gray-500 dark:text-gray-400"
          )}
          title="Revenue Metrics"
        >
          <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute left-full ml-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap transition-opacity">Revenue</span>
        </button>

        <button 
          onClick={() => toggleWidget('fleet')}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group relative",
            activeWidget === 'fleet' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"
          )}
          title="Fleet Status"
        >
          <Bus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute left-full ml-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap transition-opacity">Fleet</span>
        </button>
      </div>

      {/* Widget Panel Overlay */}
      {activeWidget && (
        <div className="fixed top-1/4 left-16 z-[90] w-[350px] bg-transparent animate-in slide-in-from-left-4 fade-in duration-200">
          <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
            <div className="absolute top-2 right-2 z-10">
              <button 
                onClick={() => setActiveWidget(null)}
                className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
              <WidgetContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
