import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { PackageImageCarousel } from '../../../components/ui';

export interface PackageFact {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

interface PackageCatalogCardProps {
  image?: string | null;
  images?: (string | null | undefined)[];
  badge: string;
  eyebrow: string;
  title: string;
  description?: string | null;
  facts: PackageFact[];
  actionLabel: string;
  onAction: () => void;
  selected?: boolean;
  warning?: string;
  controls?: ReactNode;
}

export default function PackageCatalogCard({
  image,
  images,
  badge,
  eyebrow,
  title,
  description,
  facts,
  actionLabel,
  onAction,
  selected = false,
  warning,
  controls,
}: PackageCatalogCardProps) {
  const imagesList = images && images.length > 0 ? images : image ? [image] : [];

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-3xl border bg-surface transition duration-200 hover:-translate-y-1 hover:shadow-xl ${selected ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-border'}`}>
      <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <PackageImageCarousel
          images={imagesList}
          alt={title}
          badgeText={badge}
          className="h-full w-full"
        />
        {controls && <div className="absolute right-3 top-3 z-20 flex gap-1 rounded-xl bg-slate-950/75 p-1 text-white backdrop-blur-md">{controls}</div>}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-black leading-snug text-ink">{title}</h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted">{description || 'Package details are ready to configure.'}</p>

        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl bg-surface-alt px-2 py-3">
          {facts.slice(0, 3).map((fact) => (
            <div key={fact.label} className="min-w-0 px-2 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600">{fact.icon}</div>
              <span className="mt-1 block truncate text-[8px] font-black uppercase tracking-wider text-muted">{fact.label}</span>
              <strong className="mt-0.5 block truncate text-xs text-ink">{fact.value}</strong>
            </div>
          ))}
        </div>

        {warning && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-4 text-amber-800">{warning}</div>}

        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  );
}
