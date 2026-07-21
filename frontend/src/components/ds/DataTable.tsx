import { useMemo, useState, type ReactNode } from 'react';
import { ChevronsUpDown, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../utils';

/**
 * The workhorse table (roadmap 3.2), built to DESIGN_DIRECTION / the Attio-style Figma:
 * typed column headers with icons, click-to-sort, optional row selection, muted
 * (inactive) rows, hover affordance, hairline borders. Client-side sort by default.
 * Render cells with column.render (use StatusPill / CategoryDot there). Under `.jvd`.
 *
 * Filtering (opt-in, all client-side): pass `searchable` for a global search box,
 * mark a column `filter: 'select'` for an auto-populated dropdown of its distinct
 * values, and pass `dateField` (a column key holding a date) for This Week / Month /
 * Year / custom-range presets. All of it is off unless you opt in, so existing tables
 * are unchanged. Search/filter/date read a cell's value via
 * `filterValue ?? sortValue ?? row[key]` — supply `filterValue`/`sortValue` when the
 * cell's `render` output isn't plain text.
 */
export interface Column<T> {
  key: string;
  header: string;
  icon?: ReactNode;
  render?: (row: T) => ReactNode;
  /** value used for sorting; defaults to row[key] */
  sortValue?: (row: T) => string | number;
  /** value used for search / filtering; defaults to sortValue, then row[key] */
  filterValue?: (row: T) => string | number;
  sortable?: boolean;
  /** 'select' renders a dropdown of this column's distinct values in the toolbar */
  filter?: 'select';
  align?: 'left' | 'right' | 'center';
  width?: string;
}

/**
 * Server-driven toolbar: for tables that paginate/filter on the backend. The same
 * toolbar UI is rendered, but every control is controlled by the parent and the
 * component does NOT filter `data` itself (the server already returned filtered rows).
 * Date presets are computed here and emitted as inclusive yyyy-mm-dd strings.
 */
export interface DataTableServerToolbar {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  selects?: Array<{
    key: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
  }>;
  date?: { from: string; to: string; onChange: (range: { from: string; to: string }) => void };
  /** Total result count from the server (e.g. meta.total). */
  total?: number;
  onClear?: () => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  selectable?: boolean;
  selected?: Set<string | number>;
  onSelectedChange?: (next: Set<string | number>) => void;
  isRowMuted?: (row: T) => boolean;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
  /** Show a global text search box in the toolbar. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Column key holding a date value; enables This Week/Month/Year + custom range presets. */
  dateField?: string;
  /** Extra content rendered on the right of the toolbar (e.g. export / new-row buttons). */
  toolbarRight?: ReactNode;
  /** Enable the server-driven toolbar (parent controls state; no client-side filtering). */
  serverToolbar?: DataTableServerToolbar;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;
type DatePreset = 'all' | 'week' | 'month' | 'year' | 'custom';

const startOfWeek = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  selectable = false,
  selected,
  onSelectedChange,
  isRowMuted,
  onRowClick,
  empty,
  className,
  searchable = false,
  searchPlaceholder = 'Search…',
  dateField,
  toolbarRight,
  serverToolbar,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [query, setQuery] = useState('');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [serverPreset, setServerPreset] = useState<DatePreset>('all');
  const isServer = !!serverToolbar;

  const cellValue = (col: Column<T>, row: T): string | number => {
    if (col.filterValue) return col.filterValue(row);
    if (col.sortValue) return col.sortValue(row);
    return (row as Record<string, unknown>)[col.key] as string | number;
  };

  const selectColumns = columns.filter((c) => c.filter === 'select');

  // Distinct values for each select-filter column, derived from the full dataset.
  const distinctValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of selectColumns) {
      const set = new Set<string>();
      for (const row of data) {
        const v = cellValue(col, row);
        if (v !== undefined && v !== null && String(v) !== '') set.add(String(v));
      }
      map[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, columns]);

  // Active date window [start, end) from the preset.
  const dateWindow = useMemo((): { start?: Date; end?: Date } => {
    if (!dateField || datePreset === 'all') return {};
    const now = new Date();
    if (datePreset === 'week') {
      const s = startOfWeek(now);
      return { start: s, end: addDays(s, 7) };
    }
    if (datePreset === 'month') {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
    }
    if (datePreset === 'year') {
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
    }
    // custom
    const start = customStart ? new Date(customStart + 'T00:00:00') : undefined;
    const end = customEnd ? addDays(new Date(customEnd + 'T00:00:00'), 1) : undefined;
    return { start, end };
  }, [dateField, datePreset, customStart, customEnd]);

  const filtered = useMemo(() => {
    if (isServer) return data; // parent already filtered server-side
    const q = query.trim().toLowerCase();
    const activeColFilters = Object.entries(colFilters).filter(([, v]) => v !== '');
    const dateCol = dateField ? columns.find((c) => c.key === dateField) : undefined;
    const hasDate = !!dateCol && (!!dateWindow.start || !!dateWindow.end);

    if (!q && activeColFilters.length === 0 && !hasDate) return data;

    return data.filter((row) => {
      // Global search across every column's value.
      if (q) {
        const hit = columns.some((col) => String(cellValue(col, row) ?? '').toLowerCase().includes(q));
        if (!hit) return false;
      }
      // Per-column select filters (exact match).
      for (const [key, val] of activeColFilters) {
        const col = columns.find((c) => c.key === key);
        if (col && String(cellValue(col, row) ?? '') !== val) return false;
      }
      // Date window.
      if (hasDate && dateCol) {
        const raw = cellValue(dateCol, row);
        const t = raw ? new Date(raw as string).getTime() : NaN;
        if (Number.isNaN(t)) return false;
        if (dateWindow.start && t < dateWindow.start.getTime()) return false;
        if (dateWindow.end && t >= dateWindow.end.getTime()) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, columns, query, colFilters, dateField, dateWindow, isServer]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const val = (row: T) => (col.sortValue ? col.sortValue(row) : (row as Record<string, unknown>)[col.key]);
    return [...filtered].sort((a, b) => {
      const av = val(a) as string | number;
      const bv = val(b) as string | number;
      if (av === bv) return 0;
      const r = av > bv ? 1 : -1;
      return sort.dir === 'asc' ? r : -r;
    });
  }, [filtered, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  const allSelected = selectable && sorted.length > 0 && sorted.every((r) => selected?.has(rowKey(r)));
  const toggleAll = () => {
    if (!onSelectedChange) return;
    onSelectedChange(allSelected ? new Set() : new Set(sorted.map(rowKey)));
  };
  const toggleOne = (id: string | number) => {
    if (!onSelectedChange || !selected) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectedChange(next);
  };

  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  const hasToolbar = searchable || !!dateField || selectColumns.length > 0 || !!toolbarRight;
  const filtersActive =
    query.trim() !== '' || Object.values(colFilters).some((v) => v !== '') || datePreset !== 'all';
  const clearAll = () => {
    setQuery('');
    setColFilters({});
    setDatePreset('all');
    setCustomStart('');
    setCustomEnd('');
  };

  const presetBtn = (key: DatePreset, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setDatePreset(key)}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
        datePreset === key
          ? 'bg-brand text-white'
          : 'bg-surface-muted text-muted hover:text-ink',
      )}
    >
      {label}
    </button>
  );

  const applyServerPreset = (p: DatePreset) => {
    setServerPreset(p);
    if (!serverToolbar?.date) return;
    if (p === 'all') return serverToolbar.date.onChange({ from: '', to: '' });
    const now = new Date();
    let from = '';
    let to = '';
    if (p === 'week') { const s = startOfWeek(now); from = isoDate(s); to = isoDate(addDays(s, 6)); }
    else if (p === 'month') { from = isoDate(new Date(now.getFullYear(), now.getMonth(), 1)); to = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)); }
    else if (p === 'year') { from = isoDate(new Date(now.getFullYear(), 0, 1)); to = isoDate(new Date(now.getFullYear(), 11, 31)); }
    serverToolbar.date.onChange({ from, to });
  };

  const serverPresetBtn = (key: DatePreset, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => applyServerPreset(key)}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
        serverPreset === key ? 'bg-brand text-white' : 'bg-surface-muted text-muted hover:text-ink',
      )}
    >
      {label}
    </button>
  );

  const serverActive =
    !!serverToolbar &&
    ((serverToolbar.search?.value ?? '') !== '' ||
      (serverToolbar.selects ?? []).some((s) => s.value !== '') ||
      !!serverToolbar.date?.from ||
      !!serverToolbar.date?.to);

  const clearServer = () => {
    setServerPreset('all');
    serverToolbar?.onClear?.();
  };

  return (
    <div className={cn('rounded-[var(--radius-card)] border border-border bg-surface', className)}>
      {isServer && serverToolbar && (
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-wrap items-center gap-3">
            {serverToolbar.search && (
              <div className="relative min-w-[200px] flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={serverToolbar.search.value}
                  onChange={(e) => serverToolbar.search!.onChange(e.target.value)}
                  placeholder={serverToolbar.search.placeholder ?? 'Search…'}
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand"
                />
              </div>
            )}
            {(serverToolbar.selects ?? []).map((sel) => (
              <select
                key={sel.key}
                value={sel.value}
                onChange={(e) => sel.onChange(e.target.value)}
                className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">All {sel.label}</option>
                {sel.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ))}
          </div>

          {serverToolbar.date && (
            <div className="flex flex-wrap items-center gap-2">
              {serverPresetBtn('all', 'All time')}
              {serverPresetBtn('week', 'This Week')}
              {serverPresetBtn('month', 'This Month')}
              {serverPresetBtn('year', 'This Year')}
              <div className="mx-1 h-5 w-px bg-border" />
              <input
                type="date"
                value={serverToolbar.date.from}
                onChange={(e) => { setServerPreset('custom'); serverToolbar.date!.onChange({ from: e.target.value, to: serverToolbar.date!.to }); }}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-brand"
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={serverToolbar.date.to}
                onChange={(e) => { setServerPreset('custom'); serverToolbar.date!.onChange({ from: serverToolbar.date!.from, to: e.target.value }); }}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-brand"
              />
            </div>
          )}

          {serverActive && (
            <div className="flex items-center gap-3 text-xs text-muted">
              {typeof serverToolbar.total === 'number' && <span>{serverToolbar.total} results</span>}
              <button
                type="button"
                onClick={clearServer}
                className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                <X size={12} /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}
      {!isServer && hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-border p-3">
          <div className="flex flex-wrap items-center gap-3">
            {searchable && (
              <div className="relative min-w-[200px] flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand"
                />
              </div>
            )}

            {selectColumns.map((col) => (
              <select
                key={col.key}
                value={colFilters[col.key] ?? ''}
                onChange={(e) => setColFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                className="rounded-lg border border-border bg-surface py-2 pl-3 pr-8 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">All {col.header}</option>
                {(distinctValues[col.key] ?? []).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ))}

            {toolbarRight && <div className="ml-auto flex items-center gap-2">{toolbarRight}</div>}
          </div>

          {dateField && (
            <div className="flex flex-wrap items-center gap-2">
              {presetBtn('all', 'All time')}
              {presetBtn('week', 'This Week')}
              {presetBtn('month', 'This Month')}
              {presetBtn('year', 'This Year')}
              <div className="mx-1 h-5 w-px bg-border" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setDatePreset('custom'); }}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-brand"
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setDatePreset('custom'); }}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-brand"
              />
            </div>
          )}

          {filtersActive && (
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>Showing {sorted.length} of {data.length}</span>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
              >
                <X size={12} /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={!!allSelected} onChange={toggleAll} className="accent-brand" aria-label="Select all" />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn('px-4 py-2.5 font-medium text-muted whitespace-nowrap', alignCls(col.align))}
                >
                  <button
                    type="button"
                    disabled={!col.sortable}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.sortable && 'cursor-pointer hover:text-ink',
                      col.align === 'right' && 'flex-row-reverse',
                    )}
                  >
                    {col.icon && <span className="text-muted/80">{col.icon}</span>}
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-muted/60">
                        {sort?.key === col.key ? (
                          sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                        ) : (
                          <ChevronsUpDown size={13} />
                        )}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>{empty}</td>
              </tr>
            )}
            {sorted.map((row) => {
              const id = rowKey(row);
              const muted = isRowMuted?.(row);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer',
                    'hover:bg-surface-muted',
                    muted && 'text-muted [&_td]:line-through decoration-muted/40',
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-2.5 no-underline" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!selected?.has(id)}
                        onChange={() => toggleOne(id)}
                        className="accent-brand"
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-4 py-2.5 whitespace-nowrap', !muted && 'text-ink', alignCls(col.align))}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Colored category dot + label (Department/Category cells in the Figma). */
export function CategoryDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  );
}
