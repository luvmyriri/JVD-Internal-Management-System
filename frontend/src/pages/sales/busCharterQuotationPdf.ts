import { getStorageUrl } from '../../utils';

export interface BusCharterQuotationData {
  quotationNumber: string;
  quotationDate: string;
  groupCompanyName: string;
  contactPerson: string;
  emailAddress: string;
  contactNumber: string;
  cutOffDate?: string;
  items: Array<{
    startDate: string;
    endDate?: string;
    pickupLocation: string;
    destination: string;
    duration: string; // e.g. "Daytour", "Pick and Drop", "2 Days 1 Night"
    quantityUnits: number; // e.g. 5
    unitPrice: number; // e.g. 27000
    totalPrice: number; // e.g. 135000
  }>;
  grandTotal: number;
  inclusions?: string[];
  exclusions?: string[];
  depositReceived?: number;
  totalBalance?: number;
}

export function generateBusCharterQuotationHtml(data: BusCharterQuotationData): string {
  const defaultInclusions = [
    '49 - Seating Capacity / Tourist Bus',
    'Diesel, Toll fee, Driver & Driver\'s meal',
    'PAMI INSURANCE / COMPREHENSIVE with 49 unnamed passengers',
  ];

  const defaultExclusions = [
    'Permit',
    'Parking Fee',
  ];

  const inclusions = data.inclusions && data.inclusions.length > 0 ? data.inclusions : defaultInclusions;
  const exclusions = data.exclusions && data.exclusions.length > 0 ? data.exclusions : defaultExclusions;

  const rowsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px 10px; border: 1px solid #000; font-size: 11px; font-weight: bold; text-align: center; vertical-align: middle;">
        ${item.startDate}${item.endDate ? `<br/>to<br/>${item.endDate}` : ''}
      </td>
      <td style="padding: 12px 12px; border: 1px solid #000; font-size: 11px; vertical-align: top;">
        <strong style="display: block; margin-bottom: 4px;">Pick-up Location:</strong>
        <span style="display: block; margin-bottom: 8px; color: #1e293b;">${item.pickupLocation}</span>
        <strong style="display: block; margin-bottom: 4px;">Destination:</strong>
        <span style="display: block; color: #1e293b;">${item.destination}</span>
      </td>
      <td style="padding: 12px 10px; border: 1px solid #000; font-size: 11px; font-weight: bold; text-align: center; vertical-align: middle;">
        ${item.duration}
      </td>
      <td style="padding: 12px 10px; border: 1px solid #000; font-size: 11px; font-weight: bold; text-align: center; vertical-align: middle;">
        ${item.quantityUnits} ${item.quantityUnits === 1 ? 'unit' : 'units'}
      </td>
      <td style="padding: 12px 10px; border: 1px solid #000; font-size: 12px; font-weight: 900; text-align: right; vertical-align: middle;">
        ₱ ${item.unitPrice.toLocaleString()}<br/>
        <span style="font-size: 9px; font-weight: normal; color: #64748b;">per unit</span>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Quotation #${data.quotationNumber} - JVD Event & Travel</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; background: #fff; line-height: 1.4; }
        .page { page-break-after: always; padding: 15px 20px; box-sizing: border-box; position: relative; min-height: 98vh; }
        .page:last-child { page-break-after: avoid; }
        
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .logo-img { height: 65px; width: auto; }
        .header-contact { text-align: right; font-size: 10px; line-height: 1.5; font-weight: bold; }
        .header-contact a { color: #0044cc; text-decoration: none; }
        .header-contact strong { color: #e11d48; }

        .red-bar { height: 4px; background: #e11d48; margin-bottom: 15px; }
        
        .greeting { font-size: 12px; font-weight: bold; margin-bottom: 8px; }
        .intro-text { font-size: 11px; margin-bottom: 15px; color: #1e293b; }

        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000; }
        .meta-table td { padding: 6px 10px; border: 1px solid #000; font-size: 10px; }
        .meta-table .label { font-weight: bold; background: #f8fafc; }

        .arr-title { font-size: 10px; font-weight: 900; letter-spacing: 1px; margin-bottom: 6px; text-transform: uppercase; }

        .main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 2px solid #000; }
        .main-table th { border: 1px solid #000; padding: 8px; font-size: 14px; font-weight: 900; font-style: italic; background: #fff; text-align: center; }
        .total-row td { padding: 10px 15px; font-size: 14px; font-weight: 900; text-align: right; border: 1px solid #000; background: #fff; }

        .inc-exc-grid { display: table; width: 100%; margin-top: 15px; }
        .inc-col { display: table-cell; width: 60%; vertical-align: top; padding-right: 15px; }
        .exc-col { display: table-cell; width: 40%; vertical-align: top; }

        .sec-header { font-size: 16px; font-weight: 900; font-family: 'Times New Roman', serif; letter-spacing: 1px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 2px; }
        .inc-list, .exc-list { margin: 0; padding-left: 18px; font-size: 11px; font-weight: bold; }
        .inc-list li, .exc-list li { margin-bottom: 4px; }

        .dot-seal { position: absolute; bottom: 45px; right: 25px; text-align: center; }
        .dot-seal img { width: 75px; height: auto; }
        .dot-label { font-size: 9px; font-weight: bold; margin-top: 2px; }

        .bottom-bar { position: absolute; bottom: 10px; left: 0; right: 0; background: #b91c1c; color: #fff; text-align: center; padding: 6px; font-size: 9px; font-weight: bold; }

        /* Page 2 Terms Table */
        .terms-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; border: 2px solid #000; }
        .terms-table th { border: 1px solid #000; padding: 8px; font-size: 12px; font-weight: 900; text-transform: uppercase; background: #fff; text-align: left; }
        .terms-table td { border: 1px solid #000; padding: 8px 10px; font-size: 11px; font-weight: bold; }
        .terms-table .num-col { width: 40px; text-align: center; font-weight: 900; }

        .bank-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; border: 2px solid #000; }
        .bank-table td { border: 1px solid #000; padding: 8px 12px; font-size: 11px; font-weight: bold; }
        .bank-table .b-label { width: 160px; background: #f8fafc; text-transform: uppercase; }

        .sig-container { width: 100%; margin-top: 40px; text-align: center; display: table; }
        .sig-col { display: table-cell; width: 50%; vertical-align: top; text-align: center; }
        .sig-line { width: 200px; margin: 0 auto 4px auto; border-bottom: 1px solid #000; }
        .sig-name { font-size: 12px; font-weight: 900; }
        .sig-title { font-size: 11px; color: #334155; font-weight: bold; }
      </style>
    </head>
    <body>
      
      <!-- PAGE 1: QUOTATION PARTICULARS -->
      <div class="page">
        <table class="header-table">
          <tr>
            <td style="vertical-align: middle;">
              <img src="/JVDlogo-removebg-preview.png" class="logo-img" alt="JVD Logo" />
            </td>
            <td class="header-contact">
              <div><strong>EMAIL:</strong> <a href="mailto:jvdtransport8@gmail.com">jvdtransport8@gmail.com</a></div>
              <div><strong>WEB PAGE:</strong> share.paybiz.ph/items/webstore/jvdetmc</div>
              <div><strong>ADDRESS:</strong> UNIT-6 Aryanna Village Center, Susano Rd, Brgy 175. Camarin Caloocan City</div>
              <div><strong>PHONE:</strong> 0954-3960802</div>
              <div><strong>TEL:</strong> 02-82938068</div>
            </td>
          </tr>
        </table>

        <div class="red-bar"></div>

        <div class="greeting">Good day! Travel Partner,</div>
        <div class="intro-text">
          Thank you for considering <strong>JVD EVENT AND TRAVEL MANAGEMENT COMPANY</strong> as your service provider for your upcoming event.<br/>
          Based on your requirements, please see quotation for your perusal.
        </div>

        <table class="meta-table">
          <tr>
            <td class="label" style="width: 140px;">Group/Company Name</td>
            <td><strong>${data.groupCompanyName || '—'}</strong></td>
            <td class="label" style="width: 80px;">QTN</td>
            <td style="width: 140px;"><strong>${data.quotationNumber}</strong></td>
          </tr>
          <tr>
            <td class="label">Contact Person</td>
            <td>${data.contactPerson || '—'}</td>
            <td class="label">Date</td>
            <td>${data.quotationDate}</td>
          </tr>
          <tr>
            <td class="label">Email Address</td>
            <td>${data.emailAddress || '—'}</td>
            <td class="label">Contact No.</td>
            <td>${data.contactNumber || '—'}</td>
          </tr>
        </table>

        <div class="arr-title">Travel Arrangement:</div>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 15%;">Travel Dates</th>
              <th style="width: 45%;">Particular</th>
              <th style="width: 15%;">Duration</th>
              <th style="width: 10%;">QTY</th>
              <th style="width: 15%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colSpan="4" style="text-transform: uppercase;">TOTAL</td>
              <td>₱ ${data.grandTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="inc-exc-grid">
          <div class="inc-col">
            <div class="sec-header">Inclusions</div>
            <ul class="inc-list">
              ${inclusions.map(inc => `<li>${inc}</li>`).join('')}
            </ul>
          </div>
          <div class="exc-col">
            <div class="sec-header">Exclusions</div>
            <ul class="exc-list">
              ${exclusions.map(exc => `<li>${exc}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="dot-seal">
          <div style="font-size: 8px; font-weight: bold; border: 1px solid #b91c1c; color: #b91c1c; padding: 2px 6px; border-radius: 50px; margin-bottom: 2px;">DOT Quality Seal</div>
          <div class="dot-label">Accredited Agency</div>
        </div>

        <div class="bottom-bar">
          UNIT-6 Aryanna Village Center, Susano Rd, Brgy 175. Camarin Caloocan City &nbsp;•&nbsp; Accreditation No. DOT-NCR-TTA-02903-2024
        </div>
      </div>

      <!-- PAGE 2: TERMS AND CONDITIONS -->
      <div class="page">
        <table class="header-table">
          <tr>
            <td style="vertical-align: middle;">
              <img src="/JVDlogo-removebg-preview.png" class="logo-img" alt="JVD Logo" />
            </td>
            <td class="header-contact">
              <div><strong>EMAIL:</strong> <a href="mailto:jvdtransport8@gmail.com">jvdtransport8@gmail.com</a></div>
              <div><strong>WEB PAGE:</strong> share.paybiz.ph/items/webstore/jvdetmc</div>
              <div><strong>ADDRESS:</strong> UNIT-6 Aryanna Village Center, Susano Rd, Brgy 175. Camarin Caloocan City</div>
              <div><strong>PHONE:</strong> 0954-3960802</div>
              <div><strong>TEL:</strong> 02-82938068</div>
            </td>
          </tr>
        </table>

        <div class="red-bar"></div>

        <table class="terms-table">
          <thead>
            <tr>
              <th class="num-col">NO</th>
              <th>TERMS AND CONDITIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num-col">1</td>
              <td>Air-conditioned Tourist Bus 49 seating capacity and coaster 24 seating capacity</td>
            </tr>
            <tr>
              <td class="num-col">2</td>
              <td>Rate inclusive Diesel, Toll Fee, Driver and Driver’s meal</td>
            </tr>
            <tr>
              <td class="num-col">3</td>
              <td>50 % Down payment upon confirming this booking</td>
            </tr>
            <tr>
              <td class="num-col">4</td>
              <td>50 % The remaining balance must be settled on or before the schedule</td>
            </tr>
            <tr>
              <td class="num-col">5</td>
              <td>Cash payments must be settled exclusively at our office</td>
            </tr>
            <tr>
              <td class="num-col">6</td>
              <td>Gcash/Bank transfer must sent through our account</td>
            </tr>
            <tr>
              <td class="num-col">7</td>
              <td>Passengers must not be allowed to drop off anywhere</td>
            </tr>
            <tr>
              <td class="num-col">8</td>
              <td>Prices may be subject to change without prior notice due to oil price hike</td>
            </tr>
          </tbody>
        </table>

        <table class="bank-table">
          <tr>
            <td colSpan="2" style="background: #f1f5f9; text-transform: uppercase; font-size: 11px;">BANK DETAILS</td>
          </tr>
          <tr>
            <td class="b-label">BANK</td>
            <td>BPI</td>
          </tr>
          <tr>
            <td class="b-label">ACCOUNT NAME</td>
            <td>RHEAN UMALI</td>
          </tr>
          <tr>
            <td class="b-label">ACCOUNT NUMBER</td>
            <td>0889924094</td>
          </tr>
        </table>

        <div style="text-align: center; font-size: 11px; font-weight: 900; margin-top: 30px; margin-bottom: 40px; letter-spacing: 1px;">
          THANK YOU FOR TRUSTING! WE ARE HAPPY TO SERVE YOU!
        </div>

        <div class="sig-container">
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-name">Lily Jane R. Reciproco</div>
            <div class="sig-title">Sales and Marketing Officer</div>
          </div>
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-name">Ms. Rhean Umali</div>
            <div class="sig-title">Executive Vice President</div>
          </div>
        </div>

        <div class="bottom-bar">
          UNIT-6 Aryanna Village Center, Susano Rd, Brgy 175. Camarin Caloocan City &nbsp;•&nbsp; Accreditation No. DOT-NCR-TTA-02903-2024
        </div>
      </div>

    </body>
    </html>
  `;
}

export function openBusCharterQuotationPrintWindow(data: BusCharterQuotationData) {
  const html = generateBusCharterQuotationHtml(data);
  const win = window.open('', '_blank');
  if (!win) return alert('Popup blocked! Please allow popups to view the quotation PDF.');
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.print();
  }, 600);
}
