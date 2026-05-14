import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { LuUpload, LuCheck, LuLoaderCircle } from 'react-icons/lu';

export default function KycSubmission() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const ref = searchParams.get('ref');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // In a real app we'd upload files via FormData, but for simulation we just send mock URLs
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref) return;

    setIsSubmitting(true);
    try {
      // Simulate file upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update the accreditation record with dummy URLs for the documents
      // We use the new public endpoint to submit without authentication
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/accreditations/${ref}/submit-kyc`, {
        nda_document_url: 'https://storage.jvd.local/nda-signed.pdf',
        terms_document_url: 'https://storage.jvd.local/terms-signed.pdf',
        kyc_document_url: 'https://storage.jvd.local/kyc-packet.pdf',
      });

      setIsSuccess(true);
    } catch (error) {
      console.error('Failed to submit KYC', error);
      alert('Failed to submit. Please contact administration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-[2rem] shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LuCheck size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Submission Successful</h2>
          <p className="text-sm text-gray-500 mb-8">
            Thank you for completing your KYC requirements. Our procurement team will review your submission and contact you shortly.
          </p>
          <button 
            onClick={() => window.close()} 
            className="w-full bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!token || !ref) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-[2rem] shadow-xl border border-gray-100 p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Link</h2>
          <p className="text-sm text-gray-500">
            This submission link is invalid or has expired. Please request a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="bg-white max-w-xl w-full rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h1 className="text-2xl font-black mb-1">JVD Corporate Compliance</h1>
          <p className="text-blue-100 text-sm">KYC & Accreditation Submission Portal</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl p-4">
            Please upload the required signed compliance documents. Acceptable formats: PDF, JPG, PNG. Maximum file size: 10MB per document.
          </p>

          <div className="space-y-4">
            {/* Field 1: NDA */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">1. Signed Non-Disclosure Agreement (NDA)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer group">
                <LuUpload size={24} className="text-gray-400 group-hover:text-blue-500 mb-2" />
                <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600">Click to upload NDA</span>
              </div>
            </div>

            {/* Field 2: Terms of Service */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">2. Signed Terms & Conditions</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer group">
                <LuUpload size={24} className="text-gray-400 group-hover:text-blue-500 mb-2" />
                <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600">Click to upload Terms</span>
              </div>
            </div>

            {/* Field 3: KYC Packet */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">3. Business Registration / KYC Packet</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition cursor-pointer group">
                <LuUpload size={24} className="text-gray-400 group-hover:text-blue-500 mb-2" />
                <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600">Click to upload KYC Packet</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-70 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {isSubmitting ? (
                <>
                  <LuLoaderCircle size={20} className="animate-spin" />
                  Uploading Documents...
                </>
              ) : (
                'Submit All Documents'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
