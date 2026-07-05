import { useMemo, useState, type ReactNode } from 'react';
import { LuChevronsUpDown, LuChevronUp, LuChevronDown } from 'react-icons/lu';
import { cn } from '../../utils';

/**
 * The workhorse table (roadmap 3.2), built to DESIGN_DIRECTION / the Attio-style Figma:
 * typed column headers with icons, click-to-sort, optional row selection, muted
 * (inactive) rows, hover affordance, hairline borders. Client-side sort by default.
 * Render cells with column.render (use StatusPill / CategoryDot there). Under `.jvd`.
 */
export interface Column<T> {
  key: string;
  header: string;
  icon?: ReactNode;
  render?: (row: T) => ReactNode;
  /** value used for sorting; defaults to row[key] */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
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
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

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
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const val = (row: T) => (col.sortValue ? col.sortValue(row) : (row as Record<string, unknown>)[col.key]);
    return [...data].sort((a, b) => {
      const av = val(a) as string | number;
      const bv = val(b) as string | number;
      if (av === bv) return 0;
      const r = av > bv ? 1 : -1;
      return sort.dir === 'asc' ? r : -r;
    });
  }, [data, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  const allSelected = selectable && data.length > 0 && selected?.size === data.length;
  const toggleAll = () => {
    if (!onSelectedChange) return;
    onSelectedChange(allSelected ? new Set() : new Set(data.map(rowKey)));
  };
  const toggleOne = (id: string | number) => {
    if (!onSelectedChange || !selected) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectedChange(next);
  };

  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className={cn('overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface', className)}>
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
                        sort.dir === 'asc' ? <LuChevronUp size={13} /> : <LuChevronDown size={13} />
                      ) : (
                        <LuChevronsUpDown size={13} />
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
