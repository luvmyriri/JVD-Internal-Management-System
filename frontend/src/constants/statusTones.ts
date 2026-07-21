/**
 * The single source of truth mapping any status string in the system to one of the
 * five semantic tones (roadmap 3.2 / DESIGN_DIRECTION §1). Every StatusPill routes
 * through here so status colors are consistent app-wide — blue=info, green=success,
 * amber=warning, red=danger, gray=neutral. Add new strings here, never per-page.
 */
export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const MAP: Record<string, Tone> = {
  // success / approved / active / paid / completed
  approved: 'success', active: 'success', paid: 'success', completed: 'success',
  accredited: 'success', confirmed: 'success', settled: 'success', disbursed: 'success',
  received: 'success', signed: 'success', new: 'success', hired: 'success',
  // warning / pending / in-progress / partial
  pending: 'warning', partial: 'warning', draft: 'warning', processing: 'warning',
  interviewing: 'warning', pending_payment: 'warning', pending_accounting: 'warning',
  pending_super_admin: 'warning', pending_ceo_approval: 'warning', pending_approval: 'warning',
  expiring: 'warning', reserved: 'warning', 'in progress': 'warning',
  // danger / rejected / cancelled / overdue / inactive
  rejected: 'danger', cancelled: 'danger', canceled: 'danger', overdue: 'danger',
  inactive: 'danger', void: 'danger', blacklisted: 'danger', suspended: 'danger',
  failed: 'danger', expired: 'danger', deactivated: 'danger',
  // neutral / idle
  offline: 'neutral',
  // info / interactive
  info: 'info', open: 'info', sent: 'info', submitted: 'info',
  reviewed: 'info', interviewed: 'info',
};

/** Resolve a raw status string to its semantic tone (defaults to neutral). */
export function statusTone(status?: string | null): Tone {
  if (!status) return 'neutral';
  return MAP[status.toLowerCase().trim()] ?? 'neutral';
}
