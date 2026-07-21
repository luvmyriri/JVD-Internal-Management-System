import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, MapPin, User, Plane, FileText, FolderOpen } from 'lucide-react';
import { customerApi } from '../../api/customers';
import AgentTaskManager from '../travel/AgentTaskManager';
import CustomerEmailModal from '../travel/CustomerEmailModal';
import KycManager from '../travel/KycManager';
import PassportManager from '../travel/PassportManager';
import VisaManager from '../travel/VisaManager';
import { Drawer, Button } from '../ds';

interface CustomerDrawerProps {
  customerId: number;
  isOpen: boolean;
  onClose: () => void;
}

const SectionCard = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ElementType }) => (
  <div className="bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden mb-6">
    <div className="px-4 py-3 border-b border-border bg-surface-alt flex items-center gap-2">
      {Icon && <Icon className="text-muted" size={16} />}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
    </div>
    <div className="p-4 flex flex-col space-y-4">
      {children}
    </div>
  </div>
);

export default function CustomerDrawer({ customerId, isOpen, onClose }: CustomerDrawerProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => customerApi.get(customerId),
    enabled: isOpen && !!customerId,
  });

  const customer = response?.data?.data;

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <User className="text-brand w-5 h-5" />
            <span className="font-semibold">{customer ? `${customer.first_name} ${customer.last_name}` : 'Customer Profile'}</span>
          </div>
        }
        width={600}
      >
        {isLoading ? (
          <div className="p-8 text-center text-muted animate-pulse">Loading Profile...</div>
        ) : !customer ? (
          <div className="p-8 text-center text-danger">Customer not found.</div>
        ) : (
          <div className="p-6">
            <div className="flex gap-2 mb-6">
               <Button variant="secondary" size="sm" onClick={() => setShowEmailModal(true)} className="flex items-center gap-2">
                 <Mail size={16} /> Send Email
               </Button>
            </div>

            <SectionCard title="Contact Info" icon={User}>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-ink">
                  <Mail size={14} className="text-muted" />
                  <span>{customer.email || <span className="text-muted italic">No email</span>}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-ink">
                  <Phone size={14} className="text-muted" />
                  <span>{customer.phone || <span className="text-muted italic">No phone</span>}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-ink">
                  <MapPin size={14} className="text-muted" />
                  <span>{customer.address || <span className="text-muted italic">No address</span>}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Linked Passengers" icon={Plane}>
              {!customer.passengers || customer.passengers.length === 0 ? (
                <div className="text-sm text-muted italic">No passengers linked.</div>
              ) : (
                <div className="space-y-2">
                  {customer.passengers.map((p: { id: number; first_name: string; last_name: string; passport_number?: string }) => (
                    <div key={p.id} className="p-2 border border-border rounded flex justify-between">
                      <span className="text-sm font-medium">{p.first_name} {p.last_name}</span>
                      {p.passport_number && <span className="text-xs text-muted">Passport: {p.passport_number}</span>}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Travel Documents" icon={FileText}>
              <div className="space-y-8">
                <PassportManager customerId={customerId} passports={customer.passports || []} />
                <VisaManager customerId={customerId} visas={customer.visas || []} />
                <KycManager customerId={customerId} kycs={customer.kycs || []} />
              </div>
            </SectionCard>

            <SectionCard title="Agent Tasks" icon={FolderOpen}>
               <AgentTaskManager customerId={customerId} />
            </SectionCard>
          </div>
        )}
      </Drawer>

      <CustomerEmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} customerId={customerId} />
    </>
  );
}
