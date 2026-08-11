const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string
  ));

const peso = (amount: number): string => `&#8369; ${Number(amount).toLocaleString('en-PH')}`;

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
        ${esc(item.startDate)}${item.endDate ? `<br/>to<br/>${esc(item.endDate)}` : ''}
      </td>
      <td style="padding: 12px 12px; border: 1px solid #000; font-size: 11px; vertical-align: top;">
        <strong style="display: block; margin-bottom: 4px;">Pick-up Location:</strong>
        <span style="display: block; margin-bottom: 8px; color: #1e293b;">${esc(item.pickupLocation)}</span>
        <strong style="display: block; margin-bottom: 4px;">Destination:</strong>
        <span style="display: block; color: #1e293b;">${esc(item.destination)}</span>
      </td>
      <td style="padding: 12px 10px; border: 1px solid #000; font-size: 11px; font-weight: bold; text-align: center; vertical-align: middle;">
        ${esc(item.duration)}
      </td>
      <td style="padding: 12px 10px; border: 1px solid #000; font-size: 11px; font-weight: bold; text-align: center; vertical-align: middle;">
        ${item.quantityUnits} ${item.quantityUnits === 1 ? 'unit' : 'units'}
      </td>
      <td style="padding: 12px 10px; border: 1px solid #000; font-size: 12px; font-weight: 900; text-align: right; vertical-align: middle;">
        ${peso(item.unitPrice)}<br/>
        <span style="font-size: 9px; font-weight: normal; color: #64748b;">per unit</span>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Quotation #${esc(data.quotationNumber)} - JVD Event &amp; Travel</title>
      <style>
        @page { size: A4; margin: 10mm 10mm 18mm; }
        body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; background: #fff; line-height: 1.4; }
        .page { page-break-after: always; padding: 15px 20px 54px; box-sizing: border-box; position: relative; min-height: 267mm; overflow: hidden; }
        .page:last-child { page-break-after: avoid; }
        
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .logo-img { height: 65px; width: auto; }
        .header-contact { text-align: right; font-size: 10px; line-height: 1.5; font-weight: bold; }
        .header-contact a { color: #0044cc; text-decoration: none; }
        .header-contact strong { color: #e11d48; }

        .red-bar { height: 4px; background: #b91c1c; margin-bottom: 15px; }
        .watermark { position: absolute; top: 31%; left: 50%; width: 330px; opacity: .035; transform: translateX(-50%); z-index: 0; }
        .page-content { position: relative; z-index: 1; }
        
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

        .dot-seal { position: absolute; bottom: 32px; right: 25px; text-align: center; z-index: 2; }
        .dot-seal img { width: 62px; height: auto; }
        .dot-label { font-size: 9px; font-weight: bold; margin-top: 2px; }

        .bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; border-top: 5px solid #b91c1c; border-bottom: 5px solid #1d4ed8; color: #334155; text-align: center; padding: 5px; font-size: 8px; font-weight: bold; z-index: 2; }

        /* Page 2 Terms Table */
        .terms-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; border: 2px solid #000; }
        .terms-table th { border: 1px solid #000; padding: 8px; font-size: 12px; font-weight: 900; text-transform: uppercase; background: #fff; text-align: left; }
        .terms-table td { border: 1px solid #000; padding: 8px 10px; font-size: 11px; font-weight: bold; }
        .terms-table .num-col { width: 40px; text-align: center; font-weight: 900; }

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
        <img class="watermark" src="/JVDlogo-removebg-preview.png" alt="" />
        <div class="page-content">
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
            <td><strong>${esc(data.groupCompanyName || '-')}</strong></td>
            <td class="label" style="width: 80px;">QTN</td>
            <td style="width: 140px;"><strong>${esc(data.quotationNumber)}</strong></td>
          </tr>
          <tr>
            <td class="label">Contact Person</td>
            <td>${esc(data.contactPerson || '-')}</td>
            <td class="label">Date</td>
            <td>${esc(data.quotationDate)}</td>
          </tr>
          <tr>
            <td class="label">Email Address</td>
            <td>${esc(data.emailAddress || '-')}</td>
            <td class="label">Contact No.</td>
            <td>${esc(data.contactNumber || '-')}</td>
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
              <td>${peso(data.grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div class="inc-exc-grid">
          <div class="inc-col">
            <div class="sec-header">Inclusions</div>
            <ul class="inc-list">
              ${inclusions.map(inc => `<li>${esc(inc)}</li>`).join('')}
            </ul>
          </div>
          <div class="exc-col">
            <div class="sec-header">Exclusions</div>
            <ul class="exc-list">
              ${exclusions.map(exc => `<li>${esc(exc)}</li>`).join('')}
            </ul>
          </div>
        </div>

        </div>
        <div class="dot-seal">
          <img src="/dot-quality-seal.png" alt="Department of Tourism Quality Seal" />
          <div class="dot-label">Accredited Agency</div>
        </div>

        <div class="bottom-bar">
          UNIT 6 Aryanna Village Center, Susano Road, Brgy. 175, Camarin, Caloocan City &nbsp;&bull;&nbsp; DOT-NCR-TTA-02903-2024
        </div>
      </div>

      <!-- PAGE 2: TERMS AND CONDITIONS -->
      <div class="page">
        <img class="watermark" src="/JVDlogo-removebg-preview.png" alt="" />
        <div class="page-content">
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
              <td>Rate includes diesel, toll fees, driver, and driver's meal.</td>
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
        </div>

        <div class="dot-seal">
          <img src="/dot-quality-seal.png" alt="Department of Tourism Quality Seal" />
          <div class="dot-label">Accredited Agency</div>
        </div>

        <div class="bottom-bar">
          UNIT 6 Aryanna Village Center, Susano Road, Brgy. 175, Camarin, Caloocan City &nbsp;&bull;&nbsp; DOT-NCR-TTA-02903-2024
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
