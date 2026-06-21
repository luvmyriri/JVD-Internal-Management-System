import { useState } from 'react';
import { LuMail, LuPenLine, LuCopy, LuCheck, LuX } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { contractsApi } from '../../../api/contracts';
import Modal from '../../../components/ui/Modal';
import ContractSignatureView from '../../portal/components/ContractSignatureView';

interface ContractReviewPanelProps {
  contract: any;
  onClose: () => void;
}

/**
 * Shown right after a Custom Transaction checkout creates a draft Contract (see
 * SalesCheckout::handleCheckout's evaluateContractGate). Lets staff either email the customer
 * a remote signing link, or have the customer sign immediately on this device at the counter.
 */
export default function ContractReviewPanel({ contract, onClose }: ContractReviewPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const [signingLink, setSigningLink] = useState<string | null>(null);
  const [showCounterSign, setShowCounterSign] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  const invoice = contract.invoice;

  const handleSendForSignature = async () => {
    setIsSending(true);
    try {
      const res = await contractsApi.sendForSignature(contract.id);
      setSigningLink(res.data.link);
      if (res.data.mail_error) {
        toast.error(`Link generated, but the email failed to send: ${res.data.mail_error}`);
      } else {
        toast.success('Signing link emailed to the customer.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send signing link.');
    } finally {
      setIsSending(false);
    }
  };

  const copyLink = () => {
    if (signingLink) {
      navigator.clipboard.writeText(signingLink);
      toast.success('Link copied to clipboard.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Contract Required</h3>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{contract.contract_number}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all text-gray-400">
            <LuX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            This Custom Transaction requires a signed service contract before the invoice is finalized.
            Invoice <span className="font-bold text-gray-900 dark:text-white">#{invoice.invoice_number}</span> is held
            pending signature.
          </p>

          {isSigned ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                <LuCheck className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Contract signed — booking confirmed!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowCounterSign(true)}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-all"
                >
                  <LuPenLine className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sign Now At Counter</span>
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendForSignature}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  <LuMail className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Send for E-Signature</span>
                </button>
              </div>

              {signingLink && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center gap-2">
                  <input readOnly value={signingLink} className="flex-1 bg-transparent text-[11px] font-mono text-gray-600 dark:text-gray-300 truncate" />
                  <button onClick={copyLink} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-500">
                    <LuCopy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
          >
            {isSigned ? 'Done' : 'Close (Contract Stays Pending)'}
          </button>
        </div>
      </div>

      <Modal isOpen={showCounterSign} onClose={() => setShowCounterSign(false)} title="Sign Contract At Counter" size="lg">
        <ContractSignatureView
          contractNumber={contract.contract_number}
          termsSnapshot={contract.terms_snapshot}
          invoiceSummary={{ invoice_number: invoice.invoice_number, total_amount: invoice.total_amount, customer_name: invoice.customer_name }}
          itinerary={invoice.itineraries}
          passengers={invoice.passengers}
          submitLabel="Sign & Confirm Booking"
          onSubmit={async (data) => {
            await contractsApi.signAtCounter(contract.id, data);
            setShowCounterSign(false);
            setIsSigned(true);
            toast.success('Contract signed — booking confirmed!');
          }}
        />
      </Modal>
    </div>
  );
}
