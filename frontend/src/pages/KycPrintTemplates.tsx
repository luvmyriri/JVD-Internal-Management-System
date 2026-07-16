// ==========================================
// KYC BLANK PRINT TEMPLATES
// ==========================================
// Pure HTML-string builders for the printable blank NDA / Terms / KYC forms
// used by the public KYC submission portal (KycSubmission.tsx). These take no
// closure state — only the document `type` — and open a new print window.

export function printBlankKycForm(type: 'nda' | 'terms' | 'kyc') {
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
}
