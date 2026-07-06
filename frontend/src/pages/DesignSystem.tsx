import { useState } from 'react';
import { Inbox, Hash, Mail, Building2, User, Users, FileText, DollarSign, Plus, Settings } from 'lucide-react';
import {
  Button, StatusPill, Card, EmptyState, DataTable, CategoryDot, Modal, Drawer,
  ConfirmDialog, StatCard, Chart, OnboardingChecklist, SharePopover, CommandPalette, useCommandPalette,
  notify, type Column, type Command, type ChecklistItem, type ShareMember,
} from '../components/ds';

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
  { key: 'id', header: 'Employees', icon: <User size={13} />, sortable: true },
  { key: 'dept', header: 'Department', icon: <Building2 size={13} />, render: (r) => <CategoryDot color={r.deptColor} label={r.dept} /> },
  { key: 'email', header: 'Email', icon: <Mail size={13} />, render: (r) => <span className="text-muted">{r.email}</span> },
  { key: 'status', header: 'Employment', render: (r) => <StatusPill status={r.status} /> },
  { key: 'years', header: 'Years', icon: <Hash size={13} />, align: 'right', sortable: true },
  { key: 'first', header: 'First Name', icon: <User size={13} />, sortable: true },
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

const CHART_DATA = [
  { label: 'Jan', value: 42 }, { label: 'Feb', value: 58 }, { label: 'Mar', value: 35 },
  { label: 'Apr', value: 71 }, { label: 'May', value: 64 }, { label: 'Jun', value: 88 },
];

const SHARE_MEMBERS: ShareMember[] = [
  { id: '1', name: 'Andy Smith', email: 'andy@jvd.com', role: 'Admin' },
  { id: '2', name: 'Maya Cruz', email: 'maya@jvd.com', role: 'Editor' },
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
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [access, setAccess] = useState<'restricted' | 'anyone'>('restricted');
  const [paletteOpen, openPalette, closePalette] = useCommandPalette();
  const [steps, setSteps] = useState<ChecklistItem[]>([
    { id: '1', label: 'Complete your profile', done: true },
    { id: '2', label: 'Invite a teammate', done: true },
    { id: '3', label: 'Create your first invoice', done: false },
    { id: '4', label: 'Set up a workflow', done: false },
  ]);
  const toggleStep = (id: string) =>
    setSteps((s) => s.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));

  const COMMANDS: Command[] = [
    { id: 'nav-dash', group: 'Navigation', label: 'Go to Dashboard', icon: <User size={15} />, onSelect: () => notify.info('Would navigate to Dashboard') },
    { id: 'nav-emp', group: 'Navigation', label: 'Go to Employees', icon: <Users size={15} />, onSelect: () => notify.info('Would navigate to Employees') },
    { id: 'nav-inv', group: 'Navigation', label: 'Go to Invoices', icon: <FileText size={15} />, onSelect: () => notify.info('Would navigate to Invoices') },
    { id: 'act-add', group: 'Actions', label: 'Create new invoice', icon: <Plus size={15} />, keywords: 'new billing', onSelect: () => notify.success('New invoice action') },
    { id: 'act-set', group: 'Actions', label: 'Open settings', icon: <Settings size={15} />, onSelect: () => notify.info('Would open settings') },
  ];

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
            icon={<Inbox size={22} />}
            title="No applicants yet"
            description="Start posting job listings to begin receiving applications."
            action={<Button variant="primary">Create listing</Button>}
          />
        </Card>

        <section className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">Overlays — Modal &amp; Drawer</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
          </div>
        </section>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create new listing"
          footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setModalOpen(false)}>Create</Button></>}
        >
          <div className="space-y-3 text-sm text-ink">
            <p className="text-muted">A compact centered modal for creating one small thing or a wizard step.</p>
            <input className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm" placeholder="Listing title" />
          </div>
        </Modal>

        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Proposal Activity">
          <div className="rounded-[var(--radius-control)] bg-brand-tint px-3 py-2 text-xs text-brand">
            This proposal is pending review. All changes are prepared and ready to be implemented upon approval.
          </div>
          <div className="mt-4 space-y-4">
            {[
              { t: 'Proposal submitted to update contract info', who: 'Andy Smith', when: '4 hours ago' },
              { t: 'Data accuracy review', who: 'Andy, Maya', when: '2 days ago' },
              { t: 'Security audit finalized', who: 'Andy, Maya', when: '7 days ago' },
            ].map((e, i) => (
              <div key={i} className="border-l-2 border-border pl-4">
                <p className="text-sm font-medium text-ink">{e.t}</p>
                <p className="text-xs text-muted">{e.when}</p>
                <div className="mt-2 rounded-[var(--radius-control)] border border-border p-3 text-xs">
                  <span className="text-muted">Contributors </span><span className="text-ink">{e.who}</span>
                </div>
              </div>
            ))}
          </div>
        </Drawer>

        <section className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">Toasts (3.2) — outcomes only, no decisions</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => notify.success('Invoice INV-2026-0142 saved')}>Success toast</Button>
            <Button variant="secondary" onClick={() => notify.error('Could not reach the server')}>Error toast</Button>
            <Button variant="secondary" onClick={() => notify.warning('This contract expires in 3 days')}>Warning toast</Button>
            <Button variant="secondary" onClick={() => notify.info('Draft autosaved')}>Info toast</Button>
          </div>
        </section>

        <section className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">ConfirmDialog (3.2) — one irreversible yes/no</h2>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete supplier…</Button>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-sm font-medium text-brand">StatCard + Chart (3.2) — dashboard widgets</h2>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total employees" value="214" unit="Total" icon={<Users size={16} />} delta={12} onViewAll={() => notify.info('View employees')} />
            <StatCard label="Open invoices" value="38" icon={<FileText size={16} />} delta={-4} />
            <StatCard label="Revenue (MTD)" value="₱1.2M" icon={<DollarSign size={16} />} delta={8} />
            <StatCard label="Pending approvals" value="7" icon={<Inbox size={16} />} />
          </div>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Bookings by month</p>
                <p className="text-xs text-muted">Last 6 months</p>
              </div>
              <span className="text-xs font-medium text-brand">View all ›</span>
            </div>
            <Chart data={CHART_DATA} />
          </Card>
        </section>

        <section className="mb-10 rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-brand">OnboardingChecklist + SharePopover + ⌘K (3.2)</h2>
          <div className="flex flex-wrap items-start gap-6">
            <OnboardingChecklist
              items={steps.map((s) => ({ ...s, onClick: () => toggleStep(s.id) }))}
              onWatchTutorial={() => notify.info('Play tutorial')}
            />
            <div className="relative">
              <Button variant="secondary" onClick={() => setShareOpen((o) => !o)}>Share…</Button>
              <SharePopover
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                className="absolute left-0 top-full mt-2"
                members={SHARE_MEMBERS}
                generalAccess={access}
                onGeneralAccessChange={setAccess}
                onInvite={(email) => notify.success(`Invited ${email}`)}
                onCopyLink={() => notify.success('Link copied')}
              />
            </div>
            <Button variant="secondary" onClick={openPalette}>Open ⌘K palette</Button>
          </div>
          <p className="mt-3 text-xs text-muted">Tip: press ⌘K (or Ctrl+K) anywhere on this page. Click a checklist row to toggle it.</p>
        </section>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); notify.success('Supplier deleted'); }}
          destructive
          title="Delete this supplier?"
          description="This removes the supplier and its contact details. This action cannot be undone."
          confirmLabel="Delete"
        />

        <CommandPalette isOpen={paletteOpen} onClose={closePalette} commands={COMMANDS} />

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
