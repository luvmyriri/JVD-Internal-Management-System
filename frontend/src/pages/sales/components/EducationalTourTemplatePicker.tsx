import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Check, 
  GraduationCap, 
  Layers, 
  MapPin, 
  Plus, 
  Search, 
  Sparkles, 
  Users 
} from 'lucide-react';
import { educationalTourApi, type EducationalProgram } from '../../../api/educationalTours';
import { Button, Modal } from '../../../components/ds';
import { getStorageUrl } from '../../../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: EducationalProgram) => void;
  onStartFromScratch: () => void;
}

export default function EducationalTourTemplatePicker({
  isOpen,
  onClose,
  onSelectTemplate,
  onStartFromScratch,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['educational-programs'],
    queryFn: educationalTourApi.programs,
    enabled: isOpen,
  });

  const filteredPrograms = useMemo(() => {
    return programs.filter(program => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || [
        program.name,
        program.learning_objectives,
        ...(program.default_stops || []),
      ].some(field => String(field || '').toLowerCase().includes(q));

      const nameLower = program.name.toLowerCase();
      const matchesCategory = selectedCategory === 'All' || (
        selectedCategory === 'Science & Nature' ? (nameLower.includes('science') || nameLower.includes('eco') || nameLower.includes('nature') || nameLower.includes('subic') || nameLower.includes('clark')) :
        selectedCategory === 'History & Culture' ? (nameLower.includes('manila') || nameLower.includes('heritage') || nameLower.includes('historical') || nameLower.includes('museum')) : true
      );

      return matchesSearch && matchesCategory;
    });
  }, [programs, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Starting Point"
      size="lg"
      footer={null}
    >
      <div className="space-y-6 p-2">
        {/* Choice Option 1: Start From Scratch */}
        <div className="rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[9.5px] font-black uppercase tracking-widest">
                Blank Slate
              </span>
              <h3 className="text-base font-black text-ink">Start from Scratch</h3>
            </div>
            <p className="text-xs text-muted">
              Configure a fully customized tour with your own itinerary, custom school pricing, capacity, and fleet details.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              onStartFromScratch();
              onClose();
            }}
            className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider shrink-0"
          >
            <Plus className="h-4 w-4" /> Start Blank
          </Button>
        </div>

        {/* Choice Option 2: Choose from Tour Templates */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-base font-black text-ink">Use Existing Tour Template</h3>
              </div>
              <p className="text-xs text-muted">Pre-fills itinerary, recommended stops, learning objectives, and standard rates.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-bold text-ink placeholder:text-muted"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['All', 'Science & Nature', 'History & Culture'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-[11px] font-black tracking-wide transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-surface border border-border text-muted hover:border-blue-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="py-12 text-center text-xs font-bold text-muted">Loading tour templates...</div>
          ) : filteredPrograms.length === 0 ? (
            <div className="py-10 text-center rounded-2xl border border-dashed border-border p-6 text-muted">
              <GraduationCap className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-xs font-bold">No templates match your search</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredPrograms.map((program) => (
                <div
                  key={program.id}
                  className="rounded-2xl border border-border bg-surface p-4 space-y-3 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-12 w-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        {program.images?.[0] ? (
                          <img src={getStorageUrl(program.images[0])} alt={program.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center"><GraduationCap className="h-5 w-5 text-slate-400" /></div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                          ₱{Number(program.student_price).toLocaleString()}
                        </span>
                        <p className="text-[9px] font-bold text-muted uppercase">per student</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-black text-ink text-sm line-clamp-1">{program.name}</h4>
                      <p className="text-[11px] text-muted line-clamp-2 mt-0.5">{program.learning_objectives}</p>
                    </div>

                    {program.default_stops && program.default_stops.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {program.default_stops.slice(0, 3).map((stop, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-surface-alt border border-border text-[10px] font-semibold text-muted flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" /> {stop}
                          </span>
                        ))}
                        {program.default_stops.length > 3 && (
                          <span className="text-[10px] font-bold text-muted self-center">
                            +{program.default_stops.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted">
                      Min. {program.minimum_students || 20} pax
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onSelectTemplate(program);
                        onClose();
                      }}
                      className="!bg-amber-500 hover:!bg-amber-600 !text-white text-[10px] font-black uppercase tracking-wider"
                    >
                      <Check className="h-3.5 w-3.5" /> Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
