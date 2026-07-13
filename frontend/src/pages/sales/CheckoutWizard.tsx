import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogApi, type ServiceCategory } from '../../api/catalog';
import { Modal, Button } from '../../components/ds';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckoutWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (transactionId: number) => void;
}

export default function CheckoutWizard({ isOpen, onClose, onComplete }: CheckoutWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['sales_catalog'],
    queryFn: catalogApi.getCategories,
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const renderStep1 = () => (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted" /></div>
      ) : (
        categories.map(cat => (
          <div 
            key={cat.id}
            className={`p-4 border rounded-[var(--radius-card)] cursor-pointer transition-colors ${selectedCategory?.id === cat.id ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'}`}
            onClick={() => setSelectedCategory(cat)}
          >
            <h4 className="font-medium text-ink">{cat.name}</h4>
            <p className="text-sm text-muted">Pricing: {cat.pricing_model.replace(/_/g, ' ')}</p>
          </div>
        ))
      )}
    </div>
  );

  const renderStep2 = () => {
    if (!selectedCategory || !selectedCategory.field_schema) return <p>No fields defined.</p>;
    
    return (
      <div className="space-y-4">
        {selectedCategory.field_schema.map(field => (
          <div key={field.key} className="space-y-1.5">
            <label className="text-sm font-medium text-ink">
              {field.label} {field.required && <span className="text-danger">*</span>}
            </label>
            {field.type === 'select' ? (
              <select 
                className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-surface text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                value={(formData[field.key] as string) || ''}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                required={field.required}
              >
                <option value="">Select...</option>
                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : field.type === 'checkbox' ? (
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!!formData[field.key]} 
                  onChange={e => setFormData({ ...formData, [field.key]: e.target.checked })}
                  className="rounded border-border text-brand focus:ring-brand"
                />
                Yes
              </label>
            ) : (
              <input
                className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-surface text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                type={field.type}
                value={(formData[field.key] as string) || ''}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted">Enter passenger details here.</p>
      {/* Placeholder for passenger roster */}
      <div className="p-8 border border-dashed border-border rounded-[var(--radius-card)] text-center text-muted text-sm">
        Passenger roster table goes here
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h4 className="font-medium text-ink">Pricing Review</h4>
      <div className="p-4 bg-surface-alt rounded-[var(--radius-card)]">
        <div className="flex justify-between text-sm py-1">
          <span className="text-muted">Service Base</span>
          <span className="font-medium">₱0.00</span>
        </div>
        <div className="flex justify-between text-sm py-1 font-bold border-t border-border mt-2 pt-2">
          <span>Total</span>
          <span>₱0.00</span>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4 text-center py-4">
      <h4 className="font-medium text-ink">Ready to complete</h4>
      <p className="text-sm text-muted">A contract will be generated and a checkout link can be sent to the customer.</p>
    </div>
  );

  const handleSubmit = async () => {
    // Submit to backend
    toast.success('Transaction created successfully');
    onComplete(1); // Fake ID
  };

  const titles = ['Select Service', 'Service Details', 'Passengers', 'Review Pricing', 'Payment & Contract'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titles[step - 1]}
      size="md"
      dismissible={false}
      footer={
        <div className="flex justify-between w-full">
          <Button variant="ghost" onClick={step === 1 ? onClose : prevStep}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex gap-2">
            {step < 5 ? (
              <Button onClick={nextStep} disabled={step === 1 && !selectedCategory}>Next</Button>
            ) : (
              <Button onClick={handleSubmit}>Complete Transaction</Button>
            )}
          </div>
        </div>
      }
    >
      <div className="py-2">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>
    </Modal>
  );
}
