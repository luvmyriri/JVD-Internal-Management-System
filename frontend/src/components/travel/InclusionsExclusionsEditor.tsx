import { useState } from 'react';
import { LuPlus, LuX, LuCheck, LuSparkles } from 'react-icons/lu';

interface InclusionsExclusionsEditorProps {
  inclusions: string[];
  exclusions: string[];
  onChange: (inclusions: string[], exclusions: string[]) => void;
  readOnly?: boolean;
}

const DEFAULT_INCLUSION_PRESETS = [
  'Roundtrip Airconditioned Tourist Bus Transport',
  'Driver Fee, Fuel, Toll & Parking Fees',
  'Hotel Accommodation (Aircon Room)',
  'Daily Hotel Breakfast',
  'Licensed Tour Guide & Local Coordinators',
  'All Entrance & Environmental Permits',
  'Student / Passenger Travel Insurance',
];

const DEFAULT_EXCLUSION_PRESETS = [
  'Personal Souvenir Expenses',
  'Breakfast, Lunch & Dinner Meals not specified',
  'Tour Guide & Driver Gratuity / Tipping',
  'Optional Water Sports & Activity Upgrades',
  'Single Room Supplement Charges',
];

export default function InclusionsExclusionsEditor({
  inclusions = [],
  exclusions = [],
  onChange,
  readOnly = false,
}: InclusionsExclusionsEditorProps) {
  const [customInclusion, setCustomInclusion] = useState('');
  const [customExclusion, setCustomExclusion] = useState('');

  const addInclusion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || inclusions.includes(trimmed)) return;
    onChange([...inclusions, trimmed], exclusions);
    setCustomInclusion('');
  };

  const removeInclusion = (index: number) => {
    const next = inclusions.filter((_, i) => i !== index);
    onChange(next, exclusions);
  };

  const addExclusion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || exclusions.includes(trimmed)) return;
    onChange(inclusions, [...exclusions, trimmed]);
    setCustomExclusion('');
  };

  const removeExclusion = (index: number) => {
    const next = exclusions.filter((_, i) => i !== index);
    onChange(inclusions, next);
  };

  return (
    <div className="space-y-6">
      {/* ── Inclusions Section ── */}
      <div className="space-y-3 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white font-black text-xs">✓</span>
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-300">
              Package Inclusions ({inclusions.length})
            </h4>
          </div>
          {!readOnly && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Add items included in this price
            </span>
          )}
        </div>

        {/* Inclusions List */}
        <div className="flex flex-wrap gap-2">
          {inclusions.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-gray-800 dark:text-emerald-200"
            >
              <LuCheck className="h-3.5 w-3.5 text-emerald-600" />
              {item}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeInclusion(idx)}
                  className="ml-1 text-emerald-400 hover:text-rose-600 transition-colors"
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
          {inclusions.length === 0 && (
            <p className="text-xs font-medium text-gray-400 italic">No inclusions added yet.</p>
          )}
        </div>

        {/* Preset chips & Custom input */}
        {!readOnly && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                <LuSparkles className="h-3 w-3 text-amber-500" /> Quick Add:
              </span>
              {DEFAULT_INCLUSION_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addInclusion(preset)}
                  disabled={inclusions.includes(preset)}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold transition-all ${
                    inclusions.includes(preset)
                      ? 'border-gray-200 bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
                      : 'border-emerald-200 bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  }`}
                >
                  + {preset}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type custom inclusion..."
                value={customInclusion}
                onChange={(e) => setCustomInclusion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInclusion(customInclusion);
                  }
                }}
                className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none dark:border-emerald-800 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => addInclusion(customInclusion)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-emerald-700"
              >
                <LuPlus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Exclusions Section ── */}
      <div className="space-y-3 rounded-3xl border border-rose-100 bg-rose-50/40 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500 text-white font-black text-xs">✕</span>
            <h4 className="text-xs font-black uppercase tracking-widest text-rose-900 dark:text-rose-300">
              Package Exclusions ({exclusions.length})
            </h4>
          </div>
          {!readOnly && (
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
              Add items NOT included in this price
            </span>
          )}
        </div>

        {/* Exclusions List */}
        <div className="flex flex-wrap gap-2">
          {exclusions.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-800 shadow-sm dark:border-rose-800 dark:bg-gray-800 dark:text-rose-200"
            >
              <LuX className="h-3.5 w-3.5 text-rose-500" />
              {item}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeExclusion(idx)}
                  className="ml-1 text-rose-400 hover:text-rose-700 transition-colors"
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
          {exclusions.length === 0 && (
            <p className="text-xs font-medium text-gray-400 italic">No exclusions added yet.</p>
          )}
        </div>

        {/* Preset chips & Custom input */}
        {!readOnly && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                <LuSparkles className="h-3 w-3 text-amber-500" /> Quick Add:
              </span>
              {DEFAULT_EXCLUSION_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addExclusion(preset)}
                  disabled={exclusions.includes(preset)}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold transition-all ${
                    exclusions.includes(preset)
                      ? 'border-gray-200 bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
                      : 'border-rose-200 bg-rose-100/50 text-rose-700 hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                  }`}
                >
                  + {preset}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type custom exclusion..."
                value={customExclusion}
                onChange={(e) => setCustomExclusion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addExclusion(customExclusion);
                  }
                }}
                className="flex-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => addExclusion(customExclusion)}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-rose-700"
              >
                <LuPlus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
