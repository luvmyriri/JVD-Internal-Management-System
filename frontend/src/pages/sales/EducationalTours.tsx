import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Edit2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';
import { educationalTourApi, type EducationalTourPackage } from '../../api/educationalTours';
import { Button } from '../../components/ds';
import { exportEducationalPackagesListToExcel } from '../../utils/educationalTourExcel';
import EducationalPackageDashboard from './components/EducationalPackageDashboard';
import EducationalTourBuilder from './components/EducationalTourBuilder';
import EditEducationalTourDrawer from './components/EditEducationalTourDrawer';

// ─── Helpers ────────────────────────────────────────────────────────────────

const packageImageUrl = (path?: string): string | null => {
  if (!path) return null;
  if (path.startsWith('data:')) return path;

  let normalized = path
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/storage\/public\//, '/storage/')
    .replace(/^\/public\//, '/')
    .replace(/^\/+/, '/');

  if (normalized.startsWith('/storage/uploads/')) {
    normalized = normalized.replace('/storage/uploads/', '/uploads/');
  }

  if (normalized.startsWith('/storage/') || normalized.startsWith('/uploads/')) {
    return normalized;
  }

  return `/storage/${normalized.replace(/^\/?(storage|uploads)\//, '')}`;
};

const PackageCardImage = ({ src, name }: { src: string | null; name: string }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return <PackageImagePlaceholder name={name} />;
  }
  return (
    <img
      src={src}
      alt={name}
      className="h-44 w-full object-cover"
      onError={() => setError(true)}
    />
  );
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  published: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

// ─── Delete Confirmation Dialog ─────────────────────────────────────────────

interface DeleteDialogProps {
  pkg: EducationalTourPackage;
  onClose: () => void;
  onDeleted: () => void;
}

function DeletePackageDialog({ pkg, onClose, onDeleted }: DeleteDialogProps) {
  const mutation = useMutation({
    mutationFn: () => educationalTourApi.deletePackage(pkg.id),
    onSuccess: () => {
      toast.success('Package deleted.');
      onDeleted();
      onClose();
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || 'Failed to delete package.';
      toast.error(message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-full bg-red-100 dark:bg-red-900/40 p-2.5">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-ink">Delete Tour Package?</h3>
              <p className="text-xs text-muted mt-1 leading-5">
                This will permanently delete <strong>{pkg.name}</strong> ({pkg.tour_code}) along with all participant
                bookings. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted border border-border hover:bg-surface-alt transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
            >
              {mutation.isPending ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Placeholder Image ───────────────────────────────────────────────────────

function PackageImagePlaceholder({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return (
    <div className="h-44 w-full bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center gap-1.5">
      <ImageIcon className="h-7 w-7 text-white/40" />
      <span className="text-2xl font-black text-white/60">{initials}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function EducationalTours() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<'landing' | 'builder'>('landing');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(() => {
    const pkgParam = searchParams.get('package_id');
    return pkgParam ? Number(pkgParam) : null;
  });
  const [editingPackage, setEditingPackage] = useState<EducationalTourPackage | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<EducationalTourPackage | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: packages = [], isLoading, refetch } = useQuery({
    queryKey: ['educational-tour-packages'],
    queryFn: () => educationalTourApi.packages(),
  });

  // Manifest download
  const manifestMutation = useMutation({
    mutationFn: (packageId: number) => educationalTourApi.packageManifest(packageId),
    onSuccess: (blob, packageId) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `educational-tour-${packageId}-manifest.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Tour manifest downloaded.');
    },
    onError: () => toast.error('Could not generate tour manifest.'),
  });

  // Quotation download
  const quotationMutation = useMutation({
    mutationFn: (packageId: number) => educationalTourApi.packageQuotation(packageId),
    onSuccess: (blob, packageId) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation-${packageId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Quotation PDF downloaded.');
    },
    onError: () => toast.error('Could not generate quotation.'),
  });

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [pkg.tour_code, pkg.name, pkg.school_name, pkg.grade_level, (pkg as any).pickup_location].some(v =>
          String(v || '').toLowerCase().includes(q),
        );
      const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [packages, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    let totalMaxCapacity = 0;
    let totalEnrolledPax = 0;
    let totalGrossCollected = 0;
    let totalOutstanding = 0;
    for (const p of packages) {
      totalMaxCapacity += p.capacity.maximum || 0;
      totalEnrolledPax += p.capacity.confirmed || 0;
      totalGrossCollected += p.sales.collected || 0;
      totalOutstanding += p.sales.outstanding || 0;
    }
    return { totalTours: packages.length, totalMaxCapacity, totalEnrolledPax, totalGrossCollected, totalOutstanding };
  }, [packages]);

  // ── Route: package dashboard ──
  if (selectedPackageId) {
    return (
      <EducationalPackageDashboard
        packageId={selectedPackageId}
        onBack={() => {
          setSelectedPackageId(null);
          refetch();
        }}
      />
    );
  }

  // ── Route: builder ──
  if (view === 'builder') {
    return (
      <EducationalTourBuilder
        onBack={() => setView('landing')}
        onCreated={newPackageId => {
          setSelectedPackageId(newPackageId);
          setView('landing');
        }}
      />
    );
  }

  // ── Main landing ──
  return (
    <div className="space-y-6 pb-12">
      {/* Edit Drawer */}
      {editingPackage && (
        <EditEducationalTourDrawer
          pkg={editingPackage}
          onClose={() => setEditingPackage(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] })}
        />
      )}

      {/* Delete Dialog */}
      {deletingPackage && (
        <DeletePackageDialog
          pkg={deletingPackage}
          onClose={() => setDeletingPackage(null)}
          onDeleted={() => queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] })}
        />
      )}

      {/* Header Banner */}
      <header className="flex flex-col gap-5 rounded-3xl bg-[#071b33] p-7 text-white lg:flex-row lg:items-end lg:justify-between shadow-xl">
        <div>
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sales
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Institutional Tour Operations</p>
          <h1 className="mt-1 text-3xl font-black">Educational Tour</h1>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-6 text-slate-300">
            Manage scheduled school packages, per-head desk registrations, individual participant billing, cash
            collections, and 49-seater fleet dispatch.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              try {
                toast.loading('Preparing Excel summary...', { id: 'export-tours' });
                await exportEducationalPackagesListToExcel(packages);
                toast.success('Educational tours exported to Excel.', { id: 'export-tours' });
              } catch (e: any) {
                toast.error(e?.message || 'Failed to export to Excel.', { id: 'export-tours' });
              }
            }}
            disabled={packages.length === 0}
            className="!border !border-white/20 !bg-white/10 !text-white hover:!bg-white/20 text-xs font-bold"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
          <Button
            type="button"
            onClick={() => setView('builder')}
            className="!bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg"
          >
            <Plus className="h-4 w-4" /> Create Tour
          </Button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-black uppercase tracking-wider">Active Tours</span>
            <GraduationCap className="h-4 w-4 text-brand" />
          </div>
          <div className="text-2xl font-black text-ink">{stats.totalTours}</div>
          <p className="text-[11px] text-muted font-medium">Scheduled institutional trips</p>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-black uppercase tracking-wider">Enrolled Travelers</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-ink">
            {stats.totalEnrolledPax}{' '}
            <span className="text-xs text-muted font-normal">/ {stats.totalMaxCapacity} capacity</span>
          </div>
          <p className="text-[11px] text-muted font-medium">Confirmed student bookings</p>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Collections</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">₱{stats.totalGrossCollected.toLocaleString()}</div>
          <p className="text-[11px] text-muted font-medium">Synced with Accounting</p>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-black uppercase tracking-wider">Outstanding Balance</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">₱{stats.totalOutstanding.toLocaleString()}</div>
          <p className="text-[11px] text-muted font-medium">From individual student invoices</p>
        </div>
      </div>

      {/* Tours List */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search tour code, school, title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-ink placeholder:text-muted focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['all', 'published', 'in_progress', 'completed', 'draft'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition shrink-0 ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-surface-alt border border-border text-muted hover:border-blue-300'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="py-16 text-center text-muted flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading educational tours...
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-3xl space-y-3">
            <GraduationCap className="mx-auto h-12 w-12 text-muted opacity-40" />
            <h3 className="text-base font-black text-ink">No educational tours found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {searchQuery
                ? 'No tours match your current filter criteria.'
                : 'Create an educational tour package to start enrolling students and managing fleet allocations.'}
            </p>
            <Button
              type="button"
              onClick={() => setView('builder')}
              className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider mt-2"
            >
              <Plus className="h-4 w-4" /> Create Tour Now
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPackages.map(pkg => {
              const capacityPct = Math.min(
                100,
                Math.round(
                  ((pkg.capacity.confirmed + pkg.capacity.reserved) / Math.max(1, pkg.capacity.maximum)) * 100,
                ),
              );
              const heroUrl = packageImageUrl((pkg as any).images?.[0]);

              return (
                <div
                  key={pkg.id}
                  className="rounded-3xl border border-border bg-surface-alt overflow-hidden shadow-sm hover:shadow-xl transition-shadow flex flex-col"
                >
                  {/* Hero image */}
                  <div className="relative">
                    <PackageCardImage src={heroUrl} name={pkg.name} />

                    {/* Status badge */}
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${
                        STATUS_COLORS[pkg.status] ?? 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pkg.status.replace('_', ' ')}
                    </span>

                    {/* Edit / Delete overlays */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingPackage(pkg)}
                        className="rounded-lg bg-black/40 backdrop-blur-sm p-1.5 text-white hover:bg-black/70 transition"
                        title="Edit package"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPackage(pkg)}
                        className="rounded-lg bg-black/40 backdrop-blur-sm p-1.5 text-white hover:bg-red-600/80 transition"
                        title="Delete package"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        {pkg.tour_code}
                      </span>
                      <h3 className="mt-2 text-base font-black text-ink line-clamp-1">{pkg.name}</h3>
                      <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5 font-medium">
                        <GraduationCap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="line-clamp-1">
                          {pkg.school_name} {pkg.grade_level ? `(${pkg.grade_level})` : ''}
                        </span>
                      </p>
                      <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span>
                          {new Date(pkg.starts_at).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                    </div>

                    {/* Capacity bar */}
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <div className="flex justify-between text-xs font-bold text-ink">
                        <span>{pkg.capacity.confirmed} Confirmed Pax</span>
                        <span className="text-muted">/ {pkg.capacity.maximum} Max</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${capacityPct}%` }} />
                      </div>
                    </div>

                    {/* Financial row */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-1 border-t border-border">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted block">Student Rate</span>
                        <strong className="text-ink">₱{pkg.pricing.rate_per_head.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted block">Collected</span>
                        <strong className="text-emerald-600">₱{pkg.sales.collected.toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-border flex items-center gap-2 flex-wrap mt-auto">
                      <button
                        type="button"
                        onClick={() => manifestMutation.mutate(pkg.id)}
                        disabled={manifestMutation.isPending}
                        className="px-2.5 py-1.5 rounded-xl bg-surface border border-border hover:bg-surface-alt text-ink text-xs font-bold flex items-center gap-1 transition"
                        title="Download PDF Manifest"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => quotationMutation.mutate(pkg.id)}
                        disabled={quotationMutation.isPending}
                        className="px-2.5 py-1.5 rounded-xl bg-surface border border-border hover:bg-surface-alt text-ink text-xs font-bold flex items-center gap-1 transition"
                        title="Download Quotation PDF"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <Button
                        type="button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider ml-auto"
                      >
                        Open Tour →
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
