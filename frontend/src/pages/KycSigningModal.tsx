import { useState } from 'react';
import { LuLock } from 'react-icons/lu';
import KycSignaturePad from './KycSignaturePad';

// ==========================================
// ULTRA-PREMIUM INTERACTIVE SIGNING MODAL
// ==========================================
interface SigningModalProps {
  type: 'nda' | 'terms' | 'kyc';
  onClose: () => void;
  onSign: (type: 'nda' | 'terms' | 'kyc', sigCanvas: HTMLCanvasElement | null) => void;
  ndaFields: any;
  termsFields: any;
  kycFields: any;
}

export default function KycSigningModal({ type, onClose, onSign, ndaFields, termsFields, kycFields }: SigningModalProps) {
  const [sigCanvas, setSigCanvas] = useState<HTMLCanvasElement | null>(null);

  const getDocTitle = () => {
    if (type === 'nda') return 'Mutual Non-Disclosure Agreement (NDA)';
    if (type === 'terms') return 'Platform Service Terms & Policies';
    return 'KYC Partner Registration Form';
  };

  const handleComplete = () => {
    if (type === 'terms' && !termsFields.accepted) {
      alert('Please check the acknowledgement and accept the Terms and Conditions before signing.');
      return;
    }
    onSign(type, sigCanvas);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl rounded-[2.5rem] overflow-hidden flex flex-col md:grid md:grid-cols-12 h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* LEFT COMPONENT: The Interactive Field Form (Grid Columns: 5) */}
        <div className="col-span-5 border-b md:border-b-0 md:border-r border-slate-800/80 p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-slate-900/60">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest font-black text-blue-500">Interactive Sign & Fill</span>
              <h3 className="text-lg font-black text-slate-100">{getDocTitle()}</h3>
            </div>

            {/* NDA Form Fields */}
            {type === 'nda' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Receiving Party (Company Name)</label>
                  <input
                    type="text"
                    value={ndaFields.receivingParty}
                    onChange={(e) => ndaFields.setReceivingParty(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                    placeholder="e.g. Supplier Company Ltd"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Registered Corporate Address</label>
                  <textarea
                    rows={2}
                    value={ndaFields.address}
                    onChange={(e) => ndaFields.setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                    placeholder="Representative office address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Authorized Representative</label>
                    <input
                      type="text"
                      value={ndaFields.representative}
                      onChange={(e) => ndaFields.setRepresentative(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                      placeholder="Representative full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Designation</label>
                    <input
                      type="text"
                      value={ndaFields.designation}
                      onChange={(e) => ndaFields.setDesignation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                      placeholder="e.g. Managing Director"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Terms Form Fields */}
            {type === 'terms' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Representative Name</label>
                  <input
                    type="text"
                    value={termsFields.representative}
                    onChange={(e) => termsFields.setRepresentative(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Designation / Role</label>
                  <input
                    type="text"
                    value={termsFields.designation}
                    onChange={(e) => termsFields.setDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200"
                    placeholder="e.g. Operations Manager"
                  />
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">📢 Key Policy Summary</p>
                  <ul className="text-[10px] text-slate-450 list-disc list-inside space-y-1 font-medium">
                    <li><strong className="text-blue-400">20% Commission structure</strong> deducted on travel routines.</li>
                    <li><strong className="text-blue-400">UnionBank & GCash channels</strong> for bi-weekly disbursements.</li>
                    <li><strong className="text-blue-400">Priority allocation</strong> for fully verified fleet suppliers.</li>
                  </ul>
                </div>

                <label className="flex items-start gap-3 bg-slate-950 border border-slate-800/80 p-4 rounded-2xl cursor-pointer hover:bg-slate-950/80 transition-all select-none">
                  <input
                    type="checkbox"
                    checked={termsFields.accepted}
                    onChange={(e) => termsFields.setAccepted(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-1 focus:ring-blue-500 shrink-0 mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-200">I Agree & Accept Terms</p>
                    <p className="text-[10px] text-slate-500 leading-normal">Under R.A. 10173, I certify that I accept JVD commission structures and payment policies.</p>
                  </div>
                </label>
              </div>
            )}

            {/* KYC Form Fields */}
            {type === 'kyc' && (
              <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Company Registry</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold">Company Name</label>
                      <input
                        type="text"
                        value={kycFields.companyName}
                        onChange={(e) => kycFields.setCompanyName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold">Business Name</label>
                      <input
                        type="text"
                        value={kycFields.businessName}
                        onChange={(e) => kycFields.setBusinessName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold">Established</label>
                      <input
                        type="text"
                        placeholder="e.g. 2018"
                        value={kycFields.year}
                        onChange={(e) => kycFields.setYear(e.target.value)}
                        className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold">Industry</label>
                      <input
                        type="text"
                        placeholder="Travel"
                        value={kycFields.industry}
                        onChange={(e) => kycFields.setIndustry(e.target.value)}
                        className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold">TIN#</label>
                      <input
                        type="text"
                        placeholder="Tax TIN"
                        value={kycFields.tin}
                        onChange={(e) => kycFields.setTin(e.target.value)}
                        className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-slate-400 font-bold">Office Address Details</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Floor/Bldg"
                        value={kycFields.addressBldg}
                        onChange={(e) => kycFields.setAddressBldg(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Street"
                        value={kycFields.addressStreet}
                        onChange={(e) => kycFields.setAddressStreet(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Brgy"
                        value={kycFields.addressBrgy}
                        onChange={(e) => kycFields.setAddressBrgy(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={kycFields.addressCity}
                        onChange={(e) => kycFields.setAddressCity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold">Mobile No.</label>
                      <input
                        type="text"
                        value={kycFields.mobile}
                        onChange={(e) => kycFields.setMobile(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400 font-bold">Website</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={kycFields.website}
                        onChange={(e) => kycFields.setWebsite(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Bank Details (Disbursements)</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Bank Name (e.g. UnionBank)"
                      value={kycFields.bankName}
                      onChange={(e) => kycFields.setBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none animate-none"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={kycFields.bankNo}
                      onChange={(e) => kycFields.setBankNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Bank Branch Address"
                      value={kycFields.bankAddress}
                      onChange={(e) => kycFields.setBankAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Signature Draw Canvas Pad */}
            <div className="pt-4 border-t border-slate-800/80">
              <KycSignaturePad onCanvasRef={setSigCanvas} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6 shrink-0">
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/10 text-center"
            >
              Sign & Attach Electronically
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white px-5 py-4 rounded-2xl text-xs font-black transition-all"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* RIGHT COMPONENT: Interactive Live Contract Preview (Grid Columns: 7) */}
        <div className="col-span-7 bg-slate-950 p-6 md:p-8 flex flex-col justify-between overflow-y-auto select-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1.5">
                <LuLock className="w-3.5 h-3.5 text-slate-600" /> Interactive Contract Preview
              </span>
              <span className="text-[9px] uppercase font-black tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">High Fidelity</span>
            </div>

            {/* Premium physical page background overlay */}
            <div className="w-full bg-white text-slate-900 rounded-[1.5rem] shadow-xl p-8 min-h-[60vh] font-serif border border-slate-200/50 flex flex-col justify-between select-none">

              {/* Paper Content Wrapper */}
              <div className="space-y-6">

                {/* Paper Header */}
                <div className="text-center pb-4 border-b border-slate-200/80">
                  <h4 className="font-sans font-black text-sm tracking-tight text-slate-800">JVD EVENT AND TRAVEL MANAGEMENT COMPANY</h4>
                  <p className="font-sans text-[8px] text-slate-500 uppercase tracking-wider font-bold">Unit 6 - Aryanna Village Center, Susano Road, Camarin, Caloocan City</p>
                  <p className="font-sans text-[8px] text-slate-400">Phone: 0976 471 1294 | Tel: 02 8293 8068 | Email: compliance@jvd-travel.com</p>
                </div>

                {/* NDA Preview */}
                {type === 'nda' && (
                  <div className="space-y-4 text-[9px] leading-relaxed text-slate-700">
                    <h5 className="font-sans font-black text-xs text-center text-slate-850 uppercase tracking-wider">MUTUAL NON-DISCLOSURE AGREEMENT (NDA)</h5>
                    <p>This Mutual Non-Disclosure Agreement ("Agreement") is made effective on <strong>{ndaFields.date}</strong>, by and between:</p>
                    <p><strong>Disclosing Party:</strong> JVD Event and Travel Management Company (referred to as "Disclosing Party")</p>
                    <p><strong>Receiving Party:</strong> <span className="underline font-bold text-slate-900">{ndaFields.receivingParty || '____________________'}</span>, located at <span className="underline font-medium text-slate-850">{ndaFields.address || '________________________________________'}</span> (referred to as "Receiving Party").</p>
                    <p className="font-bold text-slate-850 mt-2 font-sans text-[9px] uppercase tracking-wider text-blue-700">1. Definition of Confidential Information</p>
                    <p>For purposes of this Agreement, "Confidential Information" shall include all information, trade secrets, databases, pricing models, operations, driver scheduling algorithms, and customer data which has or could have commercial value or other utility in the business in which Disclosing Party is engaged.</p>
                    <p className="font-bold text-slate-850 mt-2 font-sans text-[9px] uppercase tracking-wider text-blue-700">2. Obligations of Receiving Party</p>
                    <p>Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party. Receiving Party shall restrict access to Confidential Information to employees, contractors, and verified drivers who are reasonably required to know, and shall require those persons to sign non-disclosure covenants.</p>
                  </div>
                )}

                {/* Terms Preview */}
                {type === 'terms' && (
                  <div className="space-y-4 text-[9px] leading-relaxed text-slate-700">
                    <h5 className="font-sans font-black text-xs text-center text-slate-850 uppercase tracking-wider">PARTNER SERVICE TERMS & POLICIES</h5>
                    <p>This document establishes operational compliance policies issued on <strong>{termsFields.date}</strong> by JVD Event and Travel Management Company.</p>

                    <p><strong>1. Privacy & Data Protection Directive:</strong> Under the Data Privacy Act of 2012 (Republic Act No. 10173), JVD is committed to protecting the confidentiality and security of partner details, banking data, and trip allocations. We employ robust administrative, technical, and physical security procedures.</p>

                    <p><strong>2. Booking & Service Privileges:</strong> Verified partners are granted booking privileges on JVD's internal routing network. This includes first-priority queueing for major corporate outings and group travel deployments.</p>

                    <p><strong>3. Standard Platform Service Commission:</strong> The partner hereby agrees that a standard platform service commission of <strong className="text-slate-900 underline">20.00% (twenty percent)</strong> will be automatically deducted from the gross value of all travel itineraries, logistics transactions, trip tickets, and client bookings completed through the JVD platform.</p>

                    <p><strong>4. Payment Schemes:</strong> All completed logistics and trip ticket accounts are processed bi-weekly. Payments are settled on the 15th and 30th of each month directly to the partner's verified UnionBank or corporate GCash channel.</p>
                  </div>
                )}

                {/* KYC Preview */}
                {type === 'kyc' && (
                  <div className="space-y-3 text-[9px] leading-relaxed text-slate-700">
                    <h5 className="font-sans font-black text-xs text-center text-slate-850 uppercase tracking-wider">CLIENT & PARTNER REGISTRATION FORM</h5>

                    <div className="border border-slate-300 rounded-lg p-3 space-y-1 bg-slate-50/50">
                      <p className="font-sans font-bold text-[8px] text-blue-750 uppercase tracking-wider">COMPANY DETAILS</p>
                      <p><strong>Company Name:</strong> <span className="underline font-bold text-slate-900">{kycFields.companyName || '____________________'}</span></p>
                      <p><strong>Business Name:</strong> <span className="underline font-bold text-slate-900">{kycFields.businessName || '____________________'}</span></p>
                      <p><strong>Office Address:</strong> <span className="underline font-medium text-slate-850">{`${kycFields.addressBldg || ''} ${kycFields.addressStreet || ''}, ${kycFields.addressBrgy || ''}, ${kycFields.addressCity || ''}`.trim() || '____________________'}</span></p>
                      <p><strong>Company Email:</strong> <span className="underline font-bold text-slate-900">{kycFields.email || '____________________'}</span> | <strong>TIN#:</strong> <span className="underline font-bold text-slate-900">{kycFields.tin || '____________________'}</span></p>
                      <p><strong>Mobile No:</strong> <span className="underline font-bold text-slate-900">{kycFields.mobile || '____________________'}</span></p>
                    </div>

                    <div className="border border-slate-300 rounded-lg p-3 space-y-1 bg-slate-50/50">
                      <p className="font-sans font-bold text-[8px] text-blue-750 uppercase tracking-wider">BANK DETAILS</p>
                      <p><strong>Bank:</strong> <span className="underline font-bold text-slate-900">{kycFields.bankName || '____________________'}</span> | <strong>Account No:</strong> <span className="underline font-bold text-slate-900">{kycFields.bankNo || '____________________'}</span></p>
                      <p><strong>Branch:</strong> <span className="underline font-medium text-slate-850">{kycFields.bankAddress || '____________________'}</span></p>
                    </div>

                    <p className="italic text-[8px] text-slate-500 leading-normal text-justify">
                      I have been authorized to sign this application on behalf of the company, and I acknowledge and undertake that all information mentioned and the documents submitted are true copies. We are aware that our company will initially undergo a screening process by JVD Event and Travel Management Company in order to ensure compliance with their requirements.
                    </p>
                  </div>
                )}

              </div>

              {/* Paper Signatures Footer Block */}
              <div className="pt-6 border-t border-slate-200/80 flex justify-between items-end text-slate-700">
                {type === 'nda' && (
                  <>
                    <div className="space-y-1">
                      <span className="text-[7px] uppercase font-bold text-slate-400 block">JVD COMPLIANCE SEAL</span>
                      <div className="h-6 w-16 bg-blue-50/50 border border-blue-200/80 rounded flex items-center justify-center text-[6px] text-blue-500 tracking-wider uppercase font-black">✔ VERIFIED</div>
                      <p className="text-[8px] font-bold text-slate-850">By: Compliance Director</p>
                      <p className="text-[7px] text-slate-450">JVD Event & Travel Co.</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[7px] uppercase font-bold text-slate-400 block">RECEIVING PARTY SIGNATURE</span>
                      {sigCanvas && (
                        <div className="inline-flex h-8 w-24 border border-slate-100 bg-slate-50 rounded items-center justify-center overflow-hidden">
                          <img src={sigCanvas.toDataURL()} alt="User Sig" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      <p className="text-[8px] font-bold text-slate-990">By: {ndaFields.representative || '________________'}</p>
                      <p className="text-[7px] text-slate-450">Designation: {ndaFields.designation || '________'}</p>
                    </div>
                  </>
                )}

                {type === 'terms' && (
                  <>
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold text-slate-850">JVD Event and Travel Management Co.</p>
                      <p className="text-[7px] text-slate-450">Platform Director Signature Verified</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[7px] uppercase font-bold text-slate-400 block">AGREED AND ACCEPTED</span>
                      {sigCanvas && (
                        <div className="inline-flex h-8 w-24 border border-slate-100 bg-slate-50 rounded items-center justify-center overflow-hidden">
                          <img src={sigCanvas.toDataURL()} alt="User Sig" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      <p className="text-[8px] font-bold text-slate-990">By: {termsFields.representative || '________________'}</p>
                      <p className="text-[7px] text-slate-450">Designation: {termsFields.designation || '________'}</p>
                    </div>
                  </>
                )}

                {type === 'kyc' && (
                  <>
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold text-slate-850">JVD Event and Travel Management Co.</p>
                      <p className="text-[7px] text-slate-450">Authorized KYC Representative</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[7px] uppercase font-bold text-slate-400 block">AUTHORIZED REPRESENTATIVE</span>
                      {sigCanvas && (
                        <div className="inline-flex h-8 w-24 border border-slate-100 bg-slate-50 rounded items-center justify-center overflow-hidden">
                          <img src={sigCanvas.toDataURL()} alt="User Sig" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      <p className="text-[8px] font-bold text-slate-990">By: {kycFields.repName || '________________'}</p>
                      <p className="text-[7px] text-slate-450">Designation: {kycFields.repDesignation || '________'}</p>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
