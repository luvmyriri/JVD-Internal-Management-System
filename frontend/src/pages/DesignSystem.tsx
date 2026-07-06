import { useState } from 'react';
import { LuInbox, LuHash, LuMail, LuBuilding2, LuUser } from 'react-icons/lu';
import { Button, StatusPill, Card, EmptyState, DataTable, CategoryDot, type Column } from '../components/ds';

type Emp = { id: string; dept: string; deptColor: string; email: string; years: number; first: string; status: string };
const EMPLOYEES: Emp[] = [
  { id: 'EMP001', dept: 'Finance', deptColor: '#16A34A', email: 'alfred.white@zipper.com', years: 3, first: 'Alfred', status: 'active' },
  { id: 'EMP002', dept: 'HR', deptColor: '#D97706', email: 'alex.reed@zipper.com', years: 7, first: 'Alex', status: 'active' },
  { id: 'EMP003', dept: 'Marketing', deptColor: '#7C3AED', email: 'blake.cole@zipper.com', years: 2, first: 'Blake', status: 'active' },
  { id: 'EMP008', dept: 'Sales', deptColor: '#1D4ED8', email: 'grace.kent@zipper.com', years: 1, first: 'Grace', status: 'inactive' },
  { id: 'EMP009', dept: 'Engineering', deptColor: '#0891B2', email: 'jack.nyberg@zipper.com', years: 10, first: 'Jack', status: 'active' },
  { id: 'EMP011', dept: 'HR', deptColor: '#D97706', email: 'norah.page@zipper.com', years: 7, first: 'Norah', status: 'inactive' },
];

const EMP_COLUMNS: Column<Emp>[] = [
  { key: 'id', header: 'Employees', icon: <LuUser size={13} />, sortable: true },
  { key: 'dept', header: 'Department', icon: <LuBuilding2 size={13} />, render: (r) => <CategoryDot color={r.deptColor} label={r.dept} /> },
  { key: 'email', header: 'Email', icon: <LuMail size={13} />, render: (r) => <span className="text-muted">{r.email}</span> },
  { key: 'status', header: 'Employment', render: (r) => <StatusPill status={r.status} /> },
  { key: 'years', header: 'Years', icon: <LuHash size={13} />, align: 'right', sortable: true },
  { key: 'first', header: 'First Name', icon: <LuUser size={13} />, sortable: true },
];

/**
 * Design-system showcase (roadmap 3.1). Renders every JVD design token so the
 * palette, radii, and status language can be verified at a glance in both light
 * and dark mode. This page seeds the component-library demo route for 3.2.
 * Public route: /design-system.
 */

const SURFACES: { name: string; cls: string; border?: boolean }[] = [
  { name: 'bg', cls: 'bg-bg', border: true },
  { name: 'surface', cls: 'bg-surface', border: true },
  { name: 'surface-muted', cls: 'bg-surface-muted', border: true },
  { name: 'border', cls: 'bg-border' },
  { name: 'ink', cls: 'bg-ink' },
  { name: 'muted', cls: 'bg-muted' },
  { name: 'primary', cls: 'bg-primary' },
];

const STATUS: { label: string; tint: string; text: string; meaning: string }[] = [
  { label: 'interactive', tint: 'bg-brand-tint', text: 'text-brand', meaning: 'brand / blue — links, active, focus, charts' },
  { label: 'approved', tint: 'bg-success-tint', text: 'text-success', meaning: 'success / green' },
  { label: 'pending', tint: 'bg-warning-tint', text: 'text-warning', meaning: 'warning / amber — status only' },
  { label: 'overdue', tint: 'bg-danger-tint', text: 'text-danger', meaning: 'danger / red — status only' },
];

function Swatch({ name, cls, border }: { name: string; cls: string; border?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`h-14 rounded-[var(--radius-control)] ${cls} ${border ? 'border border-border' : ''}`} />
      <span className="text-xs text-muted">{name}</span>
    </div>
  );
}

export default function DesignSystem() {
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setDark(document.documentElement.classList.contains('dark'));
  };

  return (
    <div className="jvd min-h-screen bg-bg text-ink font-sans">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">JVD Design System</h1>
            <p className="text-sm text-muted">Design tokens (3.1) — verify in light and dark mode.</p>
          </div>
          <button
            onClick={toggleDark}
            className="rounded-[var(--radius-pill)] border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
          >
            {dark ? 'Switch to light' : 'Switch to dark'}
          </button>
        </div>

        <section className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">Surfaces &amp; text</h2>
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-7">
            {SURFACES.map((s) => <Swatch key={s.name} {...s} />)}
          </div>
        </section>

        <section className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">Status language (pills)</h2>
          <div className="flex flex-wrap gap-3">
            {STATUS.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className={`rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium ${s.tint} ${s.text}`}>
                  {s.label}
                </span>
                <span className="text-xs text-muted">{s.meaning}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">Component library — Button (3.2)</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="brand">Brand action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="primary" isLoading>Saving</Button>
            <Button variant="secondary" size="sm">Small</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </div>
        </section>

        <section className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">StatusPill — resolves any status string</h2>
          <div className="flex flex-wrap items-center gap-2">
            {['approved', 'pending', 'overdue', 'rejected', 'draft', 'active', 'pending_ceo_approval', 'unknown_status'].map((s) => (
              <StatusPill key={s} status={s} />
            ))}
          </div>
        </section>

        <Card className="mb-10">
          <h2 className="mb-4 text-sm font-medium text-brand">Card + EmptyState</h2>
          <EmptyState
            icon={<LuInbox size={22} />}
            title="No applicants yet"
            description="Start posting job listings to begin receiving applications."
            action={<Button variant="primary">Create listing</Button>}
          />
        </Card>

        <section className="mb-10">
          <h2 className="mb-4 text-sm font-medium text-brand">DataTable (3.2) — the workhorse</h2>
          <DataTable
            columns={EMP_COLUMNS}
            data={EMPLOYEES}
            rowKey={(r) => r.id}
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            isRowMuted={(r) => r.status === 'inactive'}
            onRowClick={() => {}}
          />
        </section>

        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">Card &amp; row example</h2>
          <div className="rounded-[var(--radius-control)] border border-border bg-surface-muted p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink">INV-2026-0142 · Boracay package</span>
              <span className="rounded-[var(--radius-pill)] bg-success-tint px-2.5 py-0.5 text-xs font-medium text-success">approved</span>
              <span className="ml-auto text-sm font-medium text-brand">View</span>
            </div>
          </div>
        </section>

        <div className="mt-8 h-1 w-full overflow-hidden rounded-full">
          <div className="flex h-full">
            <div className="flex-1 bg-danger" />
            <div className="flex-1 bg-brand" />
            <div className="flex-1 bg-warning" />
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted">The tri-color line is the only place the full trademark triad appears.</p>
      </div>
    </div>
  );
}
