import { useState } from 'react';
import { Button, StatCard } from '../../components/ds';
import { PlusCircle, FileText, CheckCircle } from 'lucide-react';
import CheckoutWizard from './CheckoutWizard';

export default function Sales() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Sales & Transactions</h1>
          <p className="text-sm text-muted">Manage service bookings, bus rentals, and packages.</p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          New Transaction
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Transactions" value="12" icon={<FileText className="text-brand w-5 h-5" />} />
        <StatCard label="Pending Payments" value="₱45,000" icon={<FileText className="text-warning w-5 h-5" />} />
        <StatCard label="Completed Today" value="3" icon={<CheckCircle className="text-success w-5 h-5" />} />
      </div>

      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-8 text-center text-muted">
        <p>No recent transactions.</p>
      </div>

      <CheckoutWizard 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        onComplete={() => {
          setIsWizardOpen(false);
        }}
      />
    </div>
  );
}
