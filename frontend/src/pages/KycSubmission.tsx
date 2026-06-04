import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  LuUpload,
  LuCheck,
  LuLoaderCircle,
  LuBuilding2,
  LuUser,
  LuMail,
  LuFileCheck,
  LuTriangleAlert,
  LuLock,
  LuShieldCheck,
  LuFileText,
  LuEye,
  LuPrinter
} from 'react-icons/lu';

const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  return window.location.origin;
};

const formatDocUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  let normalizedUrl = url;
  
  // 1. If it's an example domain placeholder, point it to our local mock directory
  if (normalizedUrl.includes('example.com')) {
    const filename = normalizedUrl.split('/').pop() || 'document.pdf';
    normalizedUrl = `/uploads/accreditations/${filename}`;
  }
  
  // 2. Replace /storage/accreditations/ with /uploads/accreditations/
  if (normalizedUrl.includes('/storage/accreditations/')) {
    normalizedUrl = normalizedUrl.replace('/storage/accreditations/', '/uploads/accreditations/');
  }
  
  // 3. If it's a full URL containing a local address, strip host/port to use proxy
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    try {
      const urlObj = new URL(normalizedUrl);
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        normalizedUrl = urlObj.pathname + urlObj.search;
      } else {
        return normalizedUrl;
      }
    } catch (e) {
      // Fallback if URL parsing fails
    }
  }
  
  const baseUrl = getApiUrl();
  const slash = normalizedUrl.startsWith('/') ? '' : '/';
  return `${baseUrl}${slash}${normalizedUrl}`;
};

export default function KycSubmission() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const ref = searchParams.get('ref');

  // Page loading & authentication states
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // Input states
  const [entityName, setEntityName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Uploaded file path states
  const [ndaUrl, setNdaUrl] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [kycUrl, setKycUrl] = useState('');

  // Local file name references for UI
  const [ndaFileName, setNdaFileName] = useState('');
  const [termsFileName, setTermsFileName] = useState('');
  const [kycFileName, setKycFileName] = useState('');

  // Drag over state per document slot
  const [dragOverState, setDragOverState] = useState<Record<string, boolean>>({
    nda: false,
    terms: false,
    kyc: false,
  });

  // Real-time upload percentage tracking per slot
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({
    nda: 0,
    terms: 0,
    kyc: 0,
  });

  // Lightbox preview states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Interactive signing states
  const [activeDocSignType, setActiveDocSignType] = useState<'nda' | 'terms' | 'kyc' | null>(null);

  // NDA form fields
  const [ndaReceivingParty, setNdaReceivingParty] = useState('');
  const [ndaAddress, setNdaAddress] = useState('');
  const [ndaRepresentative, setNdaRepresentative] = useState('');
  const [ndaDesignation, setNdaDesignation] = useState('');
  const [ndaDate, setNdaDate] = useState(new Date().toISOString().split('T')[0]);

  // Terms form fields
  const [termsRepresentative, setTermsRepresentative] = useState('');
  const [termsDesignation, setTermsDesignation] = useState('');
  const [termsDate, setTermsDate] = useState(new Date().toISOString().split('T')[0]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // KYC form fields
  const [kycDate, setKycDate] = useState(new Date().toISOString().split('T')[0]);
  const [kycCompanyName, setKycCompanyName] = useState('');
  const [kycBusinessName, setKycBusinessName] = useState('');
  const [kycYear, setKycYear] = useState('');
  const [kycIndustry, setKycIndustry] = useState('');
  const [kycWebsite, setKycWebsite] = useState('');
  const [kycAddressBldg, setKycAddressBldg] = useState('');
  const [kycAddressStreet, setKycAddressStreet] = useState('');
  const [kycAddressBrgy, setKycAddressBrgy] = useState('');
  const [kycAddressCity, setKycAddressCity] = useState('');
  const [kycEmail, setKycEmail] = useState('');
  const [kycTel, setKycTel] = useState('');
  const [kycMobile, setKycMobile] = useState('');
  const [kycTin, setKycTin] = useState('');
  const [kycBankName, setKycBankName] = useState('');
  const [kycBankNo, setKycBankNo] = useState('');
  const [kycBankAddress, setKycBankAddress] = useState('');
  const [kycRepName, setKycRepName] = useState('');
  const [kycRepDesignation, setKycRepDesignation] = useState('');
  const [kycRepEmail, setKycRepEmail] = useState('');

  // 1. Verify token on component mount
  useEffect(() => {
    const verifySession = async () => {
      if (!token || !ref) {
        setIsTokenValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const apiUrl = getApiUrl();
        const response = await axios.get(`${apiUrl}/api/accreditations/${ref}/verify-token`, {
          params: { token }
        });

        if (response.data.success) {
          setIsTokenValid(true);
          // Pre-populate fields with existing database record details if present
          if (response.data.data) {
            const name = response.data.data.entity_name || '';
            const rep = response.data.data.contact_person || '';
            const email = response.data.data.contact_email || '';

            setEntityName(name);
            setContactPerson(rep);
            setContactEmail(email);

            // Pre-populate interactive document workshop fields
            setNdaReceivingParty(name);
            setNdaRepresentative(rep);
            setTermsRepresentative(rep);
            setKycCompanyName(name);
            setKycBusinessName(name);
            setKycEmail(email);
            setKycRepName(rep);
            setKycRepEmail(email);
          }
        }
      } catch (err) {
        console.error('Compliance session verification failed:', err);
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    verifySession();
  }, [token, ref]);

  // Reusable core file uploader function
  const uploadFile = async (file: File, type: 'nda' | 'terms' | 'kyc') => {
    if (!ref || !token) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10MB limit.');
      return;
    }

    // Validate mime types
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(fileExtension)) {
      setErrorMsg('Invalid file format. Only PDF, JPG, and PNG files are allowed.');
      return;
    }

    setUploadProgress(prev => ({ ...prev, [type]: 1 })); // start progress indicator
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('token', token);

    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(
        `${apiUrl}/api/accreditations/${ref}/submit-kyc/upload/${type}?token=${token}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          // Track uploading progress in real-time
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(prev => ({ ...prev, [type]: Math.max(percentCompleted, 1) }));
          }
        }
      );

      if (response.data.success) {
        const fileUrl = response.data.url;
        if (type === 'nda') {
          setNdaUrl(fileUrl);
          setNdaFileName(file.name);
        } else if (type === 'terms') {
          setTermsUrl(fileUrl);
          setTermsFileName(file.name);
        } else if (type === 'kyc') {
          setKycUrl(fileUrl);
          setKycFileName(file.name);
        }
      }
    } catch (err: any) {
      console.error(`Failed to upload ${type} file:`, err);
      setErrorMsg(err.response?.data?.message || `Failed to upload ${type.toUpperCase()} document securely.`);
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    } finally {
      // Clear progress bar state after tiny delay so user sees 100% completion
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [type]: 0 }));
      }, 800);
    }
  };

  const printBlankForm = (type: 'nda' | 'terms' | 'kyc') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let content = '';

    if (type === 'nda') {
      content = `
        <html>
        <head>
          <title>MUTUAL NON-DISCLOSURE AGREEMENT (NDA) - JVD</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111827; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; }
            .company { font-size: 24px; font-weight: 900; color: #1e3a8a; }
            .subtitle { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
            .title { text-align: center; font-size: 18px; font-weight: 800; margin: 30px 0; text-transform: uppercase; color: #111827; }
            p { font-size: 12px; margin-bottom: 15px; text-align: justify; }
            .section-title { font-size: 13px; font-weight: 800; margin-top: 20px; color: #1e3a8a; }
            .field-row { margin: 15px 0; font-size: 12px; }
            .line { border-bottom: 1px solid #9ca3af; display: inline-block; width: 300px; height: 15px; }
            .sig-table { width: 100%; margin-top: 55px; font-size: 12px; }
            .sig-col { width: 50%; vertical-align: top; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="company">JVD EVENT AND TRAVEL MANAGEMENT COMPANY</div>
            <div class="subtitle">Unit 6 - Aryanna Village Center Brgy 175 Susano Road, Camarin, Caloocan City</div>
            <div class="subtitle">Phone: 0976 471 1294 | Tel: 02 8293 8068</div>
          </div>
          
          <div class="title">MUTUAL NON-DISCLOSURE AGREEMENT (NDA)</div>
          
          <p>This Mutual Non-Disclosure Agreement ("Agreement") is entered into on this <span class="line" style="width:120px"></span> by and between:</p>
          
          <p><strong>Disclosing Party:</strong> <strong>JVD Event and Travel Management Company</strong>, with principal business office located at Unit 6 - Aryanna Village Center Brgy 175 Susano Road, Camarin, Caloocan City.</p>
          <p><strong>Receiving Party:</strong> <span class="line" style="width:300px"></span>, with registered corporate address at <span class="line" style="width:400px"></span>.</p>
          
          <div class="section-title">1. Definition of Confidential Information</div>
          <p>For purposes of this Agreement, "Confidential Information" shall include all information, trade secrets, databases, pricing models, operations, driver scheduling algorithms, and customer data which has or could have commercial value or other utility in the business in which Disclosing Party is engaged. If in written form, the Disclosing Party shall label or stamp with the word "Confidential" or some similar warning.</p>
          
          <div class="section-title">2. Exclusions from Confidential Information</div>
          <p>Receiving Party's obligations under this Agreement do not extend to information that is: (a) publicly known at the time of disclosure, (b) discovered or created by the Receiving Party before disclosure, (c) learned by Receiving Party through legitimate means other than Disclosing Party, or (d) disclosed with prior written approval.</p>
          
          <div class="section-title">3. Obligations of Receiving Party</div>
          <p>Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party. Receiving Party shall restrict access to Confidential Information to employees, contractors, and verified drivers who are reasonably required to know, and shall require those persons to sign non-disclosure covenants. Receiving Party shall not, without prior written approval of Disclosing Party, use for Receiving Party's benefit, publish, or copy the Confidential Information.</p>
          
          <div class="section-title">4. Term and Termination</div>
          <p>The non-disclosure provisions of this Agreement shall survive the termination of this Agreement and Receiving Party's duty to hold Confidential Information in confidence shall remain in effect indefinitely or until Disclosing Party sends written notice releasing the Receiving Party.</p>
          
          <table class="sig-table">
            <tr>
              <td class="sig-col">
                <strong>DISCLOSING PARTY:</strong><br>
                JVD Event and Travel Management Company<br><br><br>
                Signature: __________________________<br><br>
                Name: Compliance Director<br>
                Date: __________________________
              </td>
              <td class="sig-col">
                <strong>RECEIVING PARTY:</strong><br>
                ___________________________________<br><br><br>
                Signature: __________________________<br><br>
                Name: _____________________________<br>
                Designation: _______________________<br>
                Date: __________________________
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    } else if (type === 'terms') {
      content = `
        <html>
        <head>
          <title>PARTNER TERMS AND CONDITIONS - JVD</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111827; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; }
            .company { font-size: 24px; font-weight: 900; color: #1e3a8a; }
            .subtitle { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
            .title { text-align: center; font-size: 18px; font-weight: 800; margin: 30px 0; text-transform: uppercase; color: #111827; }
            p { font-size: 12px; margin-bottom: 15px; text-align: justify; }
            .section-title { font-size: 13px; font-weight: 800; margin-top: 20px; color: #1e3a8a; }
            .sig-table { width: 100%; margin-top: 55px; font-size: 12px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="company">JVD EVENT AND TRAVEL MANAGEMENT COMPANY</div>
            <div class="subtitle">Unit 6 - Aryanna Village Center Brgy 175 Susano Road, Camarin, Caloocan City</div>
            <div class="subtitle">Phone: 0976 471 1294 | Tel: 02 8293 8068</div>
          </div>
          
          <div class="title">PARTNER SERVICE TERMS & POLICIES</div>
          
          <div class="section-title">1. Privacy & Data Protection Directive</div>
          <p>Under the Data Privacy Act of 2012 (Republic Act No. 10173), JVD Event and Travel Management Company is committed to protecting the confidentiality and security of personal and business information. We implement robust physical, technical, and administrative safeguards to protect your registered company details, banking routes, and driver details from unauthorized access, loss, or disclosure.</p>
          
          <div class="section-title">2. Booking Privileges</div>
          <p>Verified, fully-accredited suppliers and fleet partners gain direct booking privileges. This includes first-priority routing on corporate accounts, VIP itineraries, group tours, and long-term shuttle service deployments managed by JVD.</p>
          
          <div class="section-title">3. Standard Platform Service Commission (20%)</div>
          <p>The partner hereby acknowledges, agrees, and undertakes that a standard platform service commission of <strong>20.00% (twenty percent)</strong> will be automatically deducted from the gross value of all travel itineraries, logistics transactions, trip tickets, and client bookings completed through the JVD Event and Travel Management Company platform.</p>
          
          <div class="section-title">4. Payment Schemes & Settlement</div>
          <p>All completed logistics and trip ticket accounts are processed bi-weekly. Invoices, along with approved trip tickets and safety work orders, must be submitted by the 1st and 16th of each month. Disbursements are settled on the 15th and 30th of each month directly to the partner's verified UnionBank or corporate GCash channel.</p>
          
          <div class="section-title">5. Consent & Undertaking</div>
          <p>By signing below, the partner consents to JVD storing and sharing booking details with verified drivers, travel coordinators, and end clients to ensure operational continuity.</p>
          
          <table class="sig-table">
            <tr>
              <td>
                <strong>ACKNOWLEDGED AND AGREED BY:</strong><br><br>
                Company Name: ___________________________________<br><br>
                Signature: __________________________<br><br>
                Name of Representative: _____________________________<br>
                Designation: _______________________<br>
                Date: __________________________
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    } else if (type === 'kyc') {
      content = `
        <html>
        <head>
          <title>CLIENT & PARTNER KYC REGISTRATION FORM - JVD</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111827; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
            .company { font-size: 22px; font-weight: 900; color: #1e3a8a; }
            .subtitle { font-size: 10px; color: #6b7280; text-transform: uppercase; }
            .title { text-align: center; font-size: 16px; font-weight: 800; margin: 15px 0; text-transform: uppercase; }
            .section-header { background: #f1f5f9; padding: 6px 12px; font-size: 12px; font-weight: 800; color: #1e3a8a; margin: 20px 0 10px 0; border: 1px solid #cbd5e1; border-radius: 4px; text-transform: uppercase; }
            .form-grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .form-grid td { padding: 8px; border: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; }
            .label { font-weight: 800; color: #475569; text-transform: uppercase; font-size: 9px; }
            .line-input { border-bottom: 1px dashed #94a3b8; display: inline-block; width: 90%; height: 14px; }
            .undertaking { font-size: 10px; line-height: 1.5; text-align: justify; margin: 20px 0; }
            .sig-table { width: 100%; margin-top: 30px; font-size: 11px; }
            .sig-col { width: 50%; vertical-align: top; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="company">JVD EVENT AND TRAVEL MANAGEMENT COMPANY</div>
            <div class="subtitle">Unit 6 - Aryanna Village Center Brgy 175 Susano Road, Camarin, Caloocan City</div>
            <div class="subtitle">Phone: 0976 471 1294 | Tel: 02 8293 8068</div>
          </div>
          
          <div class="title">CLIENT & PARTNER REGISTRATION FORM</div>
          
          <div class="section-header">Company Details</div>
          <table class="form-grid">
            <tr>
              <td colspan="2"><span class="label">Company Name:</span><div class="line-input"></div></td>
              <td colspan="2"><span class="label">Business Name:</span><div class="line-input"></div></td>
            </tr>
            <tr>
              <td style="width:25%"><span class="label">Year Established:</span><div class="line-input"></div></td>
              <td style="width:25%"><span class="label">Industry:</span><div class="line-input"></div></td>
              <td colspan="2"><span class="label">Website:</span><div class="line-input"></div></td>
            </tr>
            <tr>
              <td colspan="4"><span class="label">Office Address (Floor/Bldg/Street/Brgy/City/Province):</span><div class="line-input" style="width:95%"></div></td>
            </tr>
            <tr>
              <td colspan="2"><span class="label">Company Email:</span><div class="line-input"></div></td>
              <td style="width:25%"><span class="label">Telephone No:</span><div class="line-input"></div></td>
              <td style="width:25%"><span class="label">Mobile No:</span><div class="line-input"></div></td>
            </tr>
            <tr>
              <td colspan="4"><span class="label">Tax Identification Number (TIN#):</span><div class="line-input"></div></td>
            </tr>
          </table>
          
          <div class="section-header">Bank Account Details</div>
          <table class="form-grid">
            <tr>
              <th style="width:33%; font-size:10px; font-weight:800; background:#f8fafc; padding:6px; text-align:left; border:1px solid #e2e8f0;">ACCOUNT NAME</th>
              <th style="width:33%; font-size:10px; font-weight:800; background:#f8fafc; padding:6px; text-align:left; border:1px solid #e2e8f0;">ACCOUNT NO.</th>
              <th style="width:34%; font-size:10px; font-weight:800; background:#f8fafc; padding:6px; text-align:left; border:1px solid #e2e8f0;">BANK NAME & BRANCH ADDRESS</th>
            </tr>
            <tr>
              <td style="height:25px"><div class="line-input" style="width:95%"></div></td>
              <td style="height:25px"><div class="line-input" style="width:95%"></div></td>
              <td style="height:25px"><div class="line-input" style="width:95%"></div></td>
            </tr>
            <tr>
              <td style="height:25px"><div class="line-input" style="width:95%"></div></td>
              <td style="height:25px"><div class="line-input" style="width:95%"></div></td>
              <td style="height:25px"><div class="line-input" style="width:95%"></div></td>
            </tr>
          </table>
          
          <p class="undertaking">
            I have been authorized to sign this application on behalf of the company, and I acknowledge and undertake that all information mentioned and the documents submitted are true copies. We are aware that our company will initially undergo a screening process by JVD Event and Travel Management Company in order to ensure compliance with their requirements.
          </p>
          
          <table class="sig-table">
            <tr>
              <td class="sig-col">
                <span class="label">Complete Name:</span><div class="line-input" style="width:80%"></div><br><br>
                <span class="label">Signature:</span><div class="line-input" style="width:80%"></div>
              </td>
              <td class="sig-col">
                <span class="label">Designation:</span><div class="line-input" style="width:80%"></div><br><br>
                <span class="label">Email Address:</span><div class="line-input" style="width:80%"></div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
    }

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const generateDocumentPNG = (type: 'nda' | 'terms' | 'kyc', sigCanvas: HTMLCanvasElement | null) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Helper wrapText function
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      return currentY + lineHeight;
    };

    // Draw Blue Letterhead
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('JVD EVENT AND TRAVEL MANAGEMENT COMPANY', 80, 100);

    ctx.fillStyle = '#475569';
    ctx.font = '16px sans-serif';
    ctx.fillText('UNIT 6 - ARYANNA VILLAGE CENTER BRGY 175 SUSANO ROAD, CAMARIN, CALOOCAN CITY', 80, 135);
    ctx.fillText('Phone: 0976 471 1294 | Tel: 02 8293 8068 | Email: compliance@jvd-travel.com', 80, 165);

    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, 190);
    ctx.lineTo(1120, 190);
    ctx.stroke();

    if (type === 'nda') {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('MUTUAL NON-DISCLOSURE AGREEMENT (NDA)', 80, 240);

      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      let y = 290;
      y = wrapText(`This Mutual Non-Disclosure Agreement ("Agreement") is entered into on this ${ndaDate} by and between the following parties:`, 80, y, 1040, 26);
      y += 15;

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('DISCLOSING PARTY:', 80, y);
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('JVD Event and Travel Management Company, located at Unit 6 - Aryanna Village Center Brgy 175 Susano Road, Camarin, Caloocan City.', 270, y, 850, 26);
      y += 15;

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('RECEIVING PARTY:', 80, y);
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText(`${ndaReceivingParty}, with corporate office address located at ${ndaAddress || 'N/A'}.`, 270, y, 850, 26);
      y += 30;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('1. DEFINITION OF CONFIDENTIAL INFORMATION', 80, y);
      y += 28;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('For purposes of this Agreement, "Confidential Information" shall include all information or material that has or could have commercial value or other utility in the business in which Disclosing Party is engaged. If in written form, the Disclosing Party shall label or stamp with the word "Confidential" or some similar warning. If transmitted orally, the Disclosing Party shall promptly provide writing indicating that such oral communication constituted Confidential Information.', 80, y, 1040, 26);
      y += 25;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('2. EXCLUSIONS FROM CONFIDENTIAL INFORMATION', 80, y);
      y += 28;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('Receiving Party\'s obligations under this Agreement do not extend to information that is: (a) publicly known at the time of disclosure, (b) discovered or created by the Receiving Party before disclosure, (c) learned by Receiving Party through legitimate means other than Disclosing Party, or (d) disclosed with Disclosing Party\'s prior written approval.', 80, y, 1040, 26);
      y += 25;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('3. OBLIGATIONS OF RECEIVING PARTY', 80, y);
      y += 28;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party. Receiving Party shall restrict access to Confidential Information to employees, contractors, and third parties who are reasonably required to know, and shall require those persons to sign non-disclosure restrictions at least as protective as those in this Agreement. Receiving Party shall not, without prior written approval of Disclosing Party, use for Receiving Party\'s benefit, publish, copy, or otherwise disclose to others the Confidential Information.', 80, y, 1040, 26);
      y += 25;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('4. SURVIVAL & GOVERNING LAW', 80, y);
      y += 28;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('The nondisclosure provisions of this Agreement shall survive the termination of this Agreement and Receiving Party\'s duty to hold Confidential Information in confidence shall remain in effect indefinitely or until Disclosing Party sends Receiving Party written notice releasing Receiving Party from this Agreement, whichever occurs first.', 80, y, 1040, 26);
      y += 50;

      // Signatures
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('DISCLOSING PARTY REPRESENTATIVE:', 80, y);
      ctx.fillText('RECEIVING PARTY REPRESENTATIVE:', 640, y);
      
      y += 40;
      ctx.font = 'italic 16px sans-serif';
      ctx.fillText('[Authorized JVD Compliance Electronic Seal]', 80, y);
      
      // Draw signature canvas if provided
      if (sigCanvas) {
        ctx.drawImage(sigCanvas, 640, y - 30, 280, 100);
      }
      
      y += 110;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('By: Compliance Director', 80, y);
      ctx.fillText(`By: ${ndaRepresentative}`, 640, y);
      y += 26;
      ctx.font = '16px sans-serif';
      ctx.fillText('JVD Event and Travel Management Co.', 80, y);
      ctx.fillText(`Designation: ${ndaDesignation}`, 640, y);

    } else if (type === 'terms') {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('PARTNER TERMS AND CONDITIONS & POLICIES', 80, 240);

      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      let y = 290;
      y = wrapText(`Issued on: ${termsDate} | Rebranding Reference: JVD Event and Travel Management Company`, 80, y, 1040, 26);
      y += 25;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('1. PRIVACY AND DATA PROTECTION POLICY', 80, y);
      y += 28;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('Under the Data Privacy Act of 2012 (Republic Act No. 10173), JVD Event and Travel Management Company is committed to protecting the confidentiality and security of partner details, banking data, and trip allocations. We employ appropriate administrative, technical, and physical security procedures to prevent unauthorized access, loss, or intrusion.', 80, y, 1040, 26);
      y += 25;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('2. BOOKING AND SERVICE PRIVILEGES', 80, y);
      y += 28;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('Fully accredited and verified partners are granted booking privileges on JVD\'s internal routing network. This includes first-priority queueing for major corporate outings, priority logistics shuttle allocations, and group travel deployments.', 80, y, 1040, 26);
      y += 25;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('3. STANDARD SERVICE COMMISSION (20%)', 80, y);
      y += 28;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('The partner hereby acknowledges, agrees, and undertakes that a standard service commission of 20.00% (twenty percent) will be automatically deducted from the gross value of all service transactions, booking itineraries, trip tickets, and client allocations completed through the JVD Event and Travel Management Company platform.', 80, y, 1040, 26);
      y += 25;

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('4. PAYMENT SCHEMES AND BI-WEEKLY SETTLEMENTS', 80, y);
      y += 28;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText('All completed logistics and trip ticket accounts are processed bi-weekly. Invoices, along with approved trip tickets and safety work orders, must be submitted by the 1st and 16th of each month. Verified accounts are settled on the 15th and 30th of each month directly to the partner\'s nominated bank channel (UnionBank) or verified GCash account.', 80, y, 1040, 26);
      y += 40;

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px sans-serif';
      y = wrapText('ACKNOWLEDGEMENT AND CONSENT:', 80, y, 1040, 26);
      y += 10;
      ctx.fillStyle = '#334155';
      ctx.font = '16px sans-serif';
      y = wrapText(`I hereby acknowledge and agree to abide by JVD\'s operational terms, standard 20% platform commission rates, bi-weekly payment schemes, and data protection policies.`, 80, y, 1040, 26);
      y += 50;

      // Draw signature canvas if provided
      if (sigCanvas) {
        ctx.drawImage(sigCanvas, 80, y - 30, 280, 100);
      }
      
      y += 110;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Authorized Representative: ${termsRepresentative}`, 80, y);
      y += 26;
      ctx.fillText(`Designation: ${termsDesignation}`, 80, y);
      y += 26;
      ctx.font = '16px sans-serif';
      ctx.fillText(`Date Signed: ${termsDate}`, 80, y);

    } else if (type === 'kyc') {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('CLIENT & PARTNER KYC REGISTRATION FORM', 80, 230);
      
      let y = 265;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('COMPANY DETAILS', 80, y);
      y += 15;

      // Draw Company Box
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(80, y, 1040, 320);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px sans-serif';
      
      // Fields inside box
      ctx.fillText(`Company Name:   ${kycCompanyName}`, 100, y + 40);
      ctx.fillText(`Business Name:  ${kycBusinessName}`, 600, y + 40);
      
      ctx.fillText(`Established:    ${kycYear}`, 100, y + 90);
      ctx.fillText(`Industry:       ${kycIndustry}`, 400, y + 90);
      ctx.fillText(`Website:        ${kycWebsite || 'N/A'}`, 700, y + 90);

      ctx.fillText(`Office Address: ${kycAddressBldg} ${kycAddressStreet}, ${kycAddressBrgy}, ${kycAddressCity}`, 100, y + 140);
      
      ctx.fillText(`Company Email:  ${kycEmail}`, 100, y + 190);
      ctx.fillText(`TIN#:           ${kycTin}`, 600, y + 190);

      ctx.fillText(`Telephone No:   ${kycTel || 'N/A'}`, 100, y + 240);
      ctx.fillText(`Mobile No:      ${kycMobile}`, 600, y + 240);

      y += 360;
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('BANK ACCOUNT DETAILS', 80, y);
      y += 15;

      // Bank Details Box
      ctx.strokeRect(80, y, 1040, 160);
      ctx.fillText(`Bank Name:      ${kycBankName}`, 100, y + 40);
      ctx.fillText(`Account Number: ${kycBankNo}`, 100, y + 90);
      ctx.fillText(`Branch Address: ${kycBankAddress}`, 100, y + 130);

      y += 210;
      ctx.fillStyle = '#334155';
      ctx.font = '14px sans-serif';
      y = wrapText('I have been authorized to sign this application on behalf of the company, and I acknowledge and undertake that all information mentioned and the documents submitted are true copies. We are aware that our company will initially undergo a screening process by JVD Event and Travel Management Company in order to ensure compliance with their requirements.', 80, y, 1040, 22);
      y += 40;

      // Draw signature canvas if provided
      if (sigCanvas) {
        ctx.drawImage(sigCanvas, 80, y - 30, 280, 100);
      }
      
      y += 110;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`Complete Name:   ${kycRepName}`, 80, y);
      ctx.fillText(`Designation:     ${kycRepDesignation}`, 600, y);
      y += 30;
      ctx.fillText(`Email Address:   ${kycRepEmail}`, 80, y);
      ctx.fillText(`Date Processed:  ${kycDate}`, 600, y);
    }

    // Convert Canvas to Blob and upload
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${type}_signed_online.png`, { type: 'image/png' });
        uploadFile(file, type);
        setActiveDocSignType(null); // Close modal
      }
    }, 'image/png');
  };

  // 2. Handle file inputs onChange event
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'nda' | 'terms' | 'kyc') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, type);
    }
  };

  // 3. Handle drag and drop handlers
  const handleDragOver = (e: React.DragEvent, type: 'nda' | 'terms' | 'kyc') => {
    e.preventDefault();
    setDragOverState(prev => ({ ...prev, [type]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, type: 'nda' | 'terms' | 'kyc') => {
    e.preventDefault();
    setDragOverState(prev => ({ ...prev, [type]: false }));
  };

  const handleDrop = (e: React.DragEvent, type: 'nda' | 'terms' | 'kyc') => {
    e.preventDefault();
    setDragOverState(prev => ({ ...prev, [type]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file, type);
    }
  };

  // 4. Handle final secure compliance package submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref || !token) return;

    if (!ndaUrl || !termsUrl || !kycUrl) {
      setErrorMsg('Please upload all three required compliance documents before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const apiUrl = getApiUrl();
      await axios.post(`${apiUrl}/api/accreditations/${ref}/submit-kyc`, {
        token: token,
        nda_document_url: ndaUrl,
        terms_document_url: termsUrl,
        kyc_document_url: kycUrl,
        entity_name: entityName || undefined,
        contact_person: contactPerson || undefined,
        contact_email: contactEmail || undefined,
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit KYC compliance details', err);
      setErrorMsg(err.response?.data?.message || 'Failed to complete submission. Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Triggers file input click
  const triggerFileInput = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.click();
  };

  // Render Loader during session validation
  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <LuLoaderCircle className="animate-spin text-blue-500 w-12 h-12 mx-auto" />
          <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  // Render Premium "Access Denied" screen if token or reference is invalid
  if (!isTokenValid || !token || !ref) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-600" />
          <div className="w-20 h-20 bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-900/30">
            <LuLock size={36} />
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-4 text-slate-100">Access Denied</h2>
          <p className="text-slate-400 leading-relaxed text-sm mb-8">
            This compliance portal session is invalid, expired, or unauthorized. To protect organization confidentiality, public access is barred without a current secure invitation link.
          </p>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-500 text-left space-y-1">
            <p className="font-bold text-slate-400">🔒 Security Notice</p>
            <p>Documents and credentials submitted to JVD Event & Travel Co. are processed through automated pipelines and archived under encrypted storage layers.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render Premium animated "Success" Splash Page
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="bg-slate-900 max-w-2xl w-full rounded-[3rem] shadow-2xl border border-slate-800/80 p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />

          <div className="w-24 h-24 bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-900/30 shadow-inner">
            <LuCheck size={48} className="stroke-[3]" />
          </div>

          <h2 className="text-4xl font-black tracking-tight mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Compliance Completed</h2>
          <p className="text-slate-400 leading-relaxed max-w-lg mx-auto mb-10 text-sm">
            Thank you! Your verified business details and signed compliance files have been securely updated. The JVD Procurement team will examine your accreditation status immediately.
          </p>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 mb-10 text-left grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Accredited Entity</span>
              <p className="text-sm font-black text-slate-200">{entityName || 'Logged Representative'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Record Ref</span>
              <p className="text-sm font-black text-slate-200">#AC-{ref}</p>
            </div>
            <div className="space-y-1 col-span-2 border-t border-slate-800/80 pt-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Session Security</span>
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
                <LuShieldCheck className="w-4 h-4" /> End-to-End Encrypted Handshake Active
              </p>
            </div>
          </div>

          <button
            onClick={() => window.close()}
            className="bg-white text-slate-950 font-black py-4 px-8 rounded-2xl hover:bg-slate-100 transition-all shadow-lg text-sm"
          >
            Close Session Window
          </button>
        </div>
      </div>
    );
  }

  // Render Full Screen split-pane layout
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-white font-sans overflow-x-hidden relative">

      {/* LEFT COLUMN: Sidebar with JVD branding and guidelines */}
      <div className="w-full md:w-[38%] bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800/80 p-8 md:p-12 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Logo & Header */}
          <div className="flex items-center gap-3">
            <img
              src="/JVD 3D.png"
              alt="JVD Logo"
              className="h-10 w-auto"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">JVD</span>
          </div>

          {/* Titles */}
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
              Secure Compliance Portal
            </span>
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-white">
              Compliance & Accreditation
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              JVD Events and Travel Management, Co. requires all suppliers, drivers, and fleet partners to complete compliance checkouts before formal contract sign-off.
            </p>
          </div>

          {/* Step checklist - Interactive progression access point */}
          <div className="space-y-6 pt-4">
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${entityName && contactPerson && contactEmail
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}>
                <LuUser size={16} />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">1. Partner Contact Details</h3>
                <p className="text-[11px] text-slate-500">Provide official registered representative contact info.</p>
              </div>
            </div>

            {/* NDA Sidebar item (Clickable if uploaded) */}
            <div
              onClick={() => {
                if (ndaUrl) {
                  setPreviewUrl(ndaUrl);
                  setPreviewTitle('Signed NDA Agreement');
                }
              }}
              className={`flex items-start gap-4 ${ndaUrl ? 'cursor-pointer hover:bg-slate-800/40 p-1.5 -m-1.5 rounded-xl transition-all' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${ndaUrl
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}>
                {ndaUrl ? <LuEye size={14} /> : <LuFileText size={16} />}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  2. NDA Signature
                  {ndaUrl && <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black">Uploaded</span>}
                </h3>
                <p className="text-[11px] text-slate-500">{ndaUrl ? 'Click to view NDA preview.' : 'Upload signed Non-Disclosure Agreement document.'}</p>
              </div>
            </div>

            {/* Terms Sidebar item (Clickable if uploaded) */}
            <div
              onClick={() => {
                if (termsUrl) {
                  setPreviewUrl(termsUrl);
                  setPreviewTitle('Signed Terms & Conditions');
                }
              }}
              className={`flex items-start gap-4 ${termsUrl ? 'cursor-pointer hover:bg-slate-800/40 p-1.5 -m-1.5 rounded-xl transition-all' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${termsUrl
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}>
                {termsUrl ? <LuEye size={14} /> : <LuFileCheck size={16} />}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  3. Terms Signature
                  {termsUrl && <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black">Uploaded</span>}
                </h3>
                <p className="text-[11px] text-slate-500">{termsUrl ? 'Click to view terms preview.' : 'Agree and upload signed terms and conditions.'}</p>
              </div>
            </div>

            {/* KYC Sidebar item (Clickable if uploaded) */}
            <div
              onClick={() => {
                if (kycUrl) {
                  setPreviewUrl(kycUrl);
                  setPreviewTitle('KYC Packet / Business License');
                }
              }}
              className={`flex items-start gap-4 ${kycUrl ? 'cursor-pointer hover:bg-slate-800/40 p-1.5 -m-1.5 rounded-xl transition-all' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${kycUrl
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}>
                {kycUrl ? <LuEye size={14} /> : <LuShieldCheck size={16} />}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  4. Business KYC Packet
                  {kycUrl && <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black">Uploaded</span>}
                </h3>
                <p className="text-[11px] text-slate-500">{kycUrl ? 'Click to view KYC packet.' : 'Upload official business registration documents.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Confidentiality badges */}
        <div className="pt-10 border-t border-slate-800/80 mt-10 space-y-4">
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-850 px-4 py-3 rounded-xl">
            <LuLock size={20} className="text-emerald-500 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">End-to-End Cryptography</p>
              <p className="text-[10px] text-slate-550">Your session token is active and fully secure.</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-550 text-center leading-relaxed">
            &copy; {new Date().getFullYear()} JVD Events & Travels Management Co. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: The spacious Main Form Page */}
      <div className="flex-1 bg-slate-950 p-8 md:p-16 flex flex-col justify-start overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto space-y-10">

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">Accreditation Registration</h2>
            <p className="text-xs text-slate-500">Please review the instructions, fill out contact profiles, and upload verified credentials.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-950/20 border border-red-900/30 text-red-400 rounded-2xl p-5 flex items-start gap-3.5 text-sm font-semibold shadow-sm animate-in slide-in-from-top duration-300">
              <LuTriangleAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Section 1: Business Profile */}
            <div className="space-y-6">
              <div className="border-b border-slate-800/85 pb-3">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  1. Business Profile Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Name */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Business Name</label>
                  <div className="relative">
                    <LuBuilding2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-550 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACME Corp"
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-200"
                    />
                  </div>
                </div>

                {/* Contact Representative */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Representative</label>
                  <div className="relative">
                    <LuUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-550 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="Representative full name"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-200"
                    />
                  </div>
                </div>

                {/* Official Email */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Official Email Address</label>
                  <div className="relative">
                    <LuMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-550 w-4 h-4" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. accounts@acmecorp.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Document Workshop & Interactive Signing */}
            <div className="space-y-6">
              <div className="border-b border-slate-800/85 pb-3">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  2. Document Workshop & Interactive Signing
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                You can download blank forms to print and manually fill up, or edit and sign online electronically using our premium interactive workshop below.
              </p>

              <div className="grid grid-cols-1 gap-6">
                
                {/* NDA Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-slate-750 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-950/40 text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-900/30">
                      <LuFileText size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-200 flex items-center gap-2">
                        Mutual Non-Disclosure Agreement (NDA)
                        {ndaUrl && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><LuCheck size={10} /> Signed</span>}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                        Personalized mutual NDA protecting organizational databases, travel schemes, and logistics routing parameters. Ready for signing.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDocSignType('nda');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <LuFileText size={14} /> {ndaUrl ? 'Re-sign Online' : 'Sign Online'}
                    </button>
                    <button
                      type="button"
                      onClick={() => printBlankForm('nda')}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                    >
                      <LuPrinter size={14} /> Print Blank
                    </button>
                  </div>
                </div>

                {/* Terms Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-slate-750 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-950/40 text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-900/30">
                      <LuFileCheck size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-200 flex items-center gap-2">
                        Platform Service Terms & Policies
                        {termsUrl && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><LuCheck size={10} /> Signed</span>}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                        Acceptance of JVD's standard policies, emphasizing VIP travel privileges, the platform standard 20% commission structure, and bi-weekly UnionBank/GCash payment schemes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDocSignType('terms');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <LuFileText size={14} /> {termsUrl ? 'Re-sign Online' : 'Sign Online'}
                    </button>
                    <button
                      type="button"
                      onClick={() => printBlankForm('terms')}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                    >
                      <LuPrinter size={14} /> Print Blank
                    </button>
                  </div>
                </div>

                {/* KYC Form Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-slate-750 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-950/40 text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-900/30">
                      <LuShieldCheck size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-200 flex items-center gap-2">
                        Partner KYC & Bank Registration Form
                        {kycUrl && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><LuCheck size={10} /> Signed</span>}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                        Official Partner Profile. Contains detailed company profile information, office addresses, Tax Identification Number (TIN#), and validated bank account details for operational clearance.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDocSignType('kyc');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <LuFileText size={14} /> {kycUrl ? 'Re-fill & Sign' : 'Fill & Sign Online'}
                    </button>
                    <button
                      type="button"
                      onClick={() => printBlankForm('kyc')}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                    >
                      <LuPrinter size={14} /> Print Blank
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Section 3: Upload / Attached Verification Documents */}
            <div className="space-y-6">
              <div className="border-b border-slate-800/85 pb-3">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  3. Upload / Attached Verification Documents
                </h3>
              </div>

              <div className="space-y-6">

                {/* Doc 1: NDA */}
                <div className="relative w-full">
                  <input
                    type="file"
                    id="nda-upload-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'nda')}
                    className="hidden"
                    disabled={uploadProgress.nda > 0}
                  />

                  {ndaUrl ? (
                    /* STATE: UPLOADED */
                    <div className="bg-slate-900 border border-emerald-900/40 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-emerald-800">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-950/40 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-900/30 shadow-inner">
                          <LuFileText size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-200">Signed NDA Agreement</h4>
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><LuShieldCheck size={10} /> Valid Uploaded</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-[340px] font-mono">{ndaFileName || 'nda_signed_document.pdf'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => { setPreviewUrl(ndaUrl); setPreviewTitle('Signed NDA Agreement'); }}
                          className="bg-blue-600/15 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          <LuEye size={14} /> View File
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileInput('nda-upload-input')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all"
                        >
                          Change File
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STATE: UNUPLOADED - Drag & Drop Enabled + Axios real-time progress bar */
                    <div
                      onClick={() => triggerFileInput('nda-upload-input')}
                      onDragOver={(e) => handleDragOver(e, 'nda')}
                      onDragLeave={(e) => handleDragLeave(e, 'nda')}
                      onDrop={(e) => handleDrop(e, 'nda')}
                      className={`border-2 border-dashed p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden ${dragOverState.nda
                          ? 'border-blue-500 bg-blue-950/20 scale-[1.01]'
                          : 'border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 hover:border-blue-500/50'
                        }`}
                    >
                      {uploadProgress.nda > 0 ? (
                        <div className="py-4 space-y-4 w-full max-w-xs mx-auto">
                          <LuLoaderCircle className="animate-spin text-blue-500 w-8 h-8 mx-auto" />
                          <div className="space-y-1.5 text-center">
                            <p className="text-xs font-bold text-slate-300 tracking-wide uppercase">Uploading NDA File...</p>
                            <p className="text-[10px] text-slate-500 font-bold">{uploadProgress.nda}% completed</p>
                          </div>
                          {/* Premium Progress Bar Track */}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.nda}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-950/60 text-slate-450 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
                            <LuUpload size={22} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-200">Upload Signed NDA Agreement <span className="text-red-500">*</span></h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Drag & drop your signed NDA document here, or click to browse files. PDF, JPG, and PNG files up to 10MB are permitted.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Doc 2: Terms */}
                <div className="relative w-full">
                  <input
                    type="file"
                    id="terms-upload-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'terms')}
                    className="hidden"
                    disabled={uploadProgress.terms > 0}
                  />

                  {termsUrl ? (
                    /* STATE: UPLOADED */
                    <div className="bg-slate-900 border border-emerald-900/40 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-emerald-800">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-950/40 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-900/30 shadow-inner">
                          <LuFileCheck size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-200">Signed Terms & Conditions</h4>
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><LuShieldCheck size={10} /> Valid Uploaded</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-[340px] font-mono">{termsFileName || 'terms_signed_document.pdf'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => { setPreviewUrl(termsUrl); setPreviewTitle('Signed Terms & Conditions'); }}
                          className="bg-blue-600/15 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          <LuEye size={14} /> View File
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileInput('terms-upload-input')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all"
                        >
                          Change File
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STATE: UNUPLOADED - Drag & Drop Enabled + Axios real-time progress bar */
                    <div
                      onClick={() => triggerFileInput('terms-upload-input')}
                      onDragOver={(e) => handleDragOver(e, 'terms')}
                      onDragLeave={(e) => handleDragLeave(e, 'terms')}
                      onDrop={(e) => handleDrop(e, 'terms')}
                      className={`border-2 border-dashed p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden ${dragOverState.terms
                          ? 'border-blue-500 bg-blue-950/20 scale-[1.01]'
                          : 'border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 hover:border-blue-500/50'
                        }`}
                    >
                      {uploadProgress.terms > 0 ? (
                        <div className="py-4 space-y-4 w-full max-w-xs mx-auto">
                          <LuLoaderCircle className="animate-spin text-blue-500 w-8 h-8 mx-auto" />
                          <div className="space-y-1.5 text-center">
                            <p className="text-xs font-bold text-slate-300 tracking-wide uppercase">Uploading Terms File...</p>
                            <p className="text-[10px] text-slate-550 font-bold">{uploadProgress.terms}% completed</p>
                          </div>
                          {/* Premium Progress Bar Track */}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.terms}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-950/60 text-slate-450 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
                            <LuUpload size={22} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-200">Upload Signed Terms & Conditions <span className="text-red-500">*</span></h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Drag & drop your signed terms and conditions document here, or click to browse files. PDF, JPG, and PNG files up to 10MB are permitted.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Doc 3: KYC Packet */}
                <div className="relative w-full">
                  <input
                    type="file"
                    id="kyc-upload-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'kyc')}
                    className="hidden"
                    disabled={uploadProgress.kyc > 0}
                  />

                  {kycUrl ? (
                    /* STATE: UPLOADED */
                    <div className="bg-slate-900 border border-emerald-900/40 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-emerald-800">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-950/40 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-900/30 shadow-inner">
                          <LuShieldCheck size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-200">KYC Packet / Business License</h4>
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><LuShieldCheck size={10} /> Valid Uploaded</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-[340px] font-mono">{kycFileName || 'kyc_accreditation_documents.pdf'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => { setPreviewUrl(kycUrl); setPreviewTitle('KYC Packet / Business License'); }}
                          className="bg-blue-600/15 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          <LuEye size={14} /> View File
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileInput('kyc-upload-input')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all"
                        >
                          Change File
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STATE: UNUPLOADED - Drag & Drop Enabled + Axios real-time progress bar */
                    <div
                      onClick={() => triggerFileInput('kyc-upload-input')}
                      onDragOver={(e) => handleDragOver(e, 'kyc')}
                      onDragLeave={(e) => handleDragLeave(e, 'kyc')}
                      onDrop={(e) => handleDrop(e, 'kyc')}
                      className={`border-2 border-dashed p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden ${dragOverState.kyc
                          ? 'border-blue-500 bg-blue-950/20 scale-[1.01]'
                          : 'border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 hover:border-blue-500/50'
                        }`}
                    >
                      {uploadProgress.kyc > 0 ? (
                        <div className="py-4 space-y-4 w-full max-w-xs mx-auto">
                          <LuLoaderCircle className="animate-spin text-blue-500 w-8 h-8 mx-auto" />
                          <div className="space-y-1.5 text-center">
                            <p className="text-xs font-bold text-slate-300 tracking-wide uppercase">Uploading KYC File...</p>
                            <p className="text-[10px] text-slate-500 font-bold">{uploadProgress.kyc}% completed</p>
                          </div>
                          {/* Premium Progress Bar Track */}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.kyc}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-950/60 text-slate-455 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
                            <LuUpload size={22} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-200">Upload KYC Packet / Business License <span className="text-red-500">*</span></h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Drag & drop your certified license and accreditation packet here, or click to browse files. PDF, JPG, and PNG files up to 10MB are permitted.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-slate-850 flex items-center justify-between gap-6">
              <p className="text-[11px] text-slate-550 flex items-center gap-1.5">
                <LuLock size={12} className="text-blue-500" /> Transmitted securely under automated 256-bit TLS pipelines.
              </p>

              <button
                type="submit"
                disabled={isSubmitting || Object.values(uploadProgress).some(val => val > 0)}
                className="bg-blue-600 text-white font-black py-4 px-8 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 shrink-0 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <LuLoaderCircle size={18} className="animate-spin" />
                    Completing accreditation...
                  </>
                ) : (
                  'Complete & Submit Package'
                )}
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* ULTRA-PREMIUM LIGHTBOX DOCUMENT VIEWING MODAL */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800/80 w-full max-w-5xl h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/40">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 flex items-center gap-1.5">
                  <LuLock className="w-3.5 h-3.5 text-blue-400" /> Secure Document Vault
                </span>
                <h3 className="text-sm font-black text-slate-200">{previewTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all"
              >
                Close Viewer
              </button>
            </div>

            {/* Document Preview Frame */}
            <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto">
              {previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={`${formatDocUrl(previewUrl)}#toolbar=0`}
                  className="w-full h-full rounded-xl border border-slate-850"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={formatDocUrl(previewUrl)}
                  alt="Document Preview"
                  className="max-w-full max-h-full object-contain rounded-xl border border-slate-850 shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {activeDocSignType && (
        <InteractiveSigningModal
          type={activeDocSignType}
          onClose={() => setActiveDocSignType(null)}
          onSign={generateDocumentPNG}
          ndaFields={{
            receivingParty: ndaReceivingParty,
            setReceivingParty: setNdaReceivingParty,
            address: ndaAddress,
            setAddress: setNdaAddress,
            representative: ndaRepresentative,
            setRepresentative: setNdaRepresentative,
            designation: ndaDesignation,
            setDesignation: setNdaDesignation,
            date: ndaDate,
            setDate: setNdaDate
          }}
          termsFields={{
            representative: termsRepresentative,
            setRepresentative: setTermsRepresentative,
            designation: termsDesignation,
            setDesignation: setTermsDesignation,
            date: termsDate,
            setDate: setTermsDate,
            accepted: termsAccepted,
            setAccepted: setTermsAccepted
          }}
          kycFields={{
            date: kycDate,
            setDate: setKycDate,
            companyName: kycCompanyName,
            setCompanyName: setKycCompanyName,
            businessName: kycBusinessName,
            setBusinessName: setKycBusinessName,
            year: kycYear,
            setYear: setKycYear,
            industry: kycIndustry,
            setIndustry: setKycIndustry,
            website: kycWebsite,
            setWebsite: setKycWebsite,
            addressBldg: kycAddressBldg,
            setAddressBldg: setKycAddressBldg,
            addressStreet: kycAddressStreet,
            setAddressStreet: setKycAddressStreet,
            addressBrgy: kycAddressBrgy,
            setAddressBrgy: setKycAddressBrgy,
            addressCity: kycAddressCity,
            setAddressCity: setKycAddressCity,
            email: kycEmail,
            setEmail: setKycEmail,
            tel: kycTel,
            setTel: setKycTel,
            mobile: kycMobile,
            setMobile: setKycMobile,
            tin: kycTin,
            setTin: setKycTin,
            bankName: kycBankName,
            setBankName: setKycBankName,
            bankNo: kycBankNo,
            setBankNo: setKycBankNo,
            bankAddress: kycBankAddress,
            setBankAddress: setKycBankAddress,
            repName: kycRepName,
            setRepName: setKycRepName,
            repDesignation: kycRepDesignation,
            setRepDesignation: setKycRepDesignation,
            repEmail: kycRepEmail,
            setRepEmail: setKycRepEmail
          }}
        />
      )}

    </div>
  );
}

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

function InteractiveSigningModal({ type, onClose, onSign, ndaFields, termsFields, kycFields }: SigningModalProps) {
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
              <SignaturePad onCanvasRef={setSigCanvas} />
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

// ==========================================
// DETACHED SIGNATURE CANVAS COMPONENT
// ==========================================
function SignaturePad({ onCanvasRef }: { onCanvasRef: (canvas: HTMLCanvasElement | null) => void }) {
  const [isDrawing, setIsDrawing] = useState(false);

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // dark slate pen
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = document.querySelector('canvas.cursor-crosshair') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Draw Electronic Signature Below</label>
      <div className="relative border border-slate-800 bg-white rounded-xl overflow-hidden shadow-inner h-28">
        <canvas
          ref={(el) => {
            onCanvasRef(el);
            if (el) {
              const ctx = el.getContext('2d');
              if (ctx && ctx.fillStyle !== '#ffffff') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, el.width, el.height);
              }
            }
          }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="w-full h-full cursor-crosshair block"
          width="480"
          height="112"
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-[10px] text-slate-500">Sign inside the boundary with mouse, stylus, or touch.</p>
        <button
          type="button"
          onClick={handleClear}
          className="text-[10px] text-red-400 hover:text-red-300 font-bold tracking-wide uppercase transition"
        >
          Reset Pen Signature
        </button>
      </div>
    </div>
  );
}
