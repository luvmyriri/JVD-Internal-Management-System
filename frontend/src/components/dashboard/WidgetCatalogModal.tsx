import { 
  AVAILABLE_WIDGETS, 
  WIDGET_CATEGORIES, 
  type DashboardWidgetDefinition 
} from '../../config/dashboardWidgets';
import { 
  LuSearch, 
  LuCheck, 
  LuPlus, 
  LuLayers, 
  LuBanknote, 
  LuUsers, 
  LuBus, 
  LuTicket, 
  LuShoppingBag, 
  LuGlobe, 
  LuBox, 
  LuShield, 
  LuUserCheck, 
  LuMapPin, 
  LuPercent, 
  LuWrench, 
  LuClock, 
  LuSparkles 
} from 'react-icons/lu';

const ICON_MAP: Record<string, React.FC<{ className?: string; size?: number }>> = {
  LuLayers,
  LuBanknote,
  LuUsers,
  LuBus,
  LuTicket,
  LuShoppingBag,
  LuGlobe,
  LuBox,
  LuShield,
  LuUserCheck,
  LuMapPin,
  LuPercent,
  LuWrench,
  LuClock,
  LuSparkles,
};

interface WidgetCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWidgetIds: string[];
  onSaveWidgets: (selectedIds: string[]) => void;
}

export const WidgetCatalogModal: React.FC<WidgetCatalogModalProps> = ({
  isOpen,
  onClose,
  activeWidgetIds,
  onSaveWidgets,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>(activeWidgetIds);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredWidgets = AVAILABLE_WIDGETS.filter((widget) => {
    const matchesCategory =
      selectedCategory === 'all' || widget.category === selectedCategory;
    const matchesSearch =
      widget.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSave = () => {
    onSaveWidgets(selectedIds);
    onClose();
  };

  const handleSelectAll = () => {
    setSelectedIds(AVAILABLE_WIDGETS.map((w) => w.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Dashboard Cards & Widgets"
      size="xl"
      noPadding
    >
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 space-y-4">
        {/* Search & Bulk Select Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <LuSearch className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards by keyword..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold rounded-xl border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 transition"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-200 transition"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {WIDGET_CATEGORIES.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || LuLayers;
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Widget Cards Grid */}
      <div className="p-6 max-h-[55vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWidgets.map((widget) => {
          const isSelected = selectedIds.includes(widget.id);
          const IconComponent = ICON_MAP[widget.iconName] || LuLayers;

          return (
            <div
              key={widget.id}
              onClick={() => handleToggle(widget.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/50 shadow-sm'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}
                    >
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                        {widget.title}
                      </h4>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {widget.category}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}
                  >
                    {isSelected ? <LuCheck size={14} /> : <LuPlus size={14} />}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-2">
                  {widget.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Controls */}
      <div className="p-4 px-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
        <span className="text-xs font-bold text-gray-500">
          {selectedIds.length} cards active on custom dashboard
        </span>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary">
            Apply Layout ({selectedIds.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
