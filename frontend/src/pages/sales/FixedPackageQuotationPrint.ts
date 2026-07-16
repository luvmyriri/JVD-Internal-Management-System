import type { Service } from '../../api/billing';

// Escape user-controlled values before interpolating into the print HTML (prevents XSS in the print window).
const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

const formatPrice = (amount: number) => {
  return '₱' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export interface ServiceQuotationParams {
  service: Service;
  bookingTourVehicle: 'Bus' | 'Coaster';
  bookingTourExtraDays: number;
  bookingTourExtraHours: number;
  bookingAdults: number;
  bookingChildren: number;
  selectedDetailAdultPrice: number;
  selectedDetailChildPrice: number;
  selectedDetailChildDiscount: number;
  agentName: string;
}

// Builds the full printable quotation/brochure HTML document for a service.
// Pure function: takes the current booking selections as explicit params and returns an HTML string.
export function buildServiceQuotationHtml(params: ServiceQuotationParams): string {
  const {
    service,
    bookingTourVehicle,
    bookingTourExtraDays,
    bookingTourExtraHours,
    bookingAdults,
    bookingChildren,
    selectedDetailAdultPrice,
    selectedDetailChildPrice,
    selectedDetailChildDiscount,
    agentName,
  } = params;

  // Determine current selections and compute total price
  let pricingRowsHTML = '';
  let totalPrice = 0;

  if (service.is_tour) {
    const basePrice = bookingTourVehicle === 'Bus' ? (service.bus_price || 0) : (service.coaster_price || 0);
    const extraDaysPrice = bookingTourExtraDays * (bookingTourVehicle === 'Bus' ? 22010 : 16780);
    const extraHoursPrice = bookingTourExtraHours * (bookingTourVehicle === 'Bus' ? 1950 : 1680);
    totalPrice = basePrice + extraDaysPrice + extraHoursPrice;

    pricingRowsHTML = `
      <tr>
        <td style="font-weight: 600; color: #0f172a;">Vehicle Rental (${bookingTourVehicle})</td>
        <td class="text-right">${formatPrice(basePrice)}</td>
        <td class="text-center font-semibold">1</td>
        <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(basePrice)}</td>
      </tr>
    `;
    if (bookingTourExtraDays > 0) {
      pricingRowsHTML += `
        <tr>
          <td style="font-weight: 600; color: #0f172a;">Extra Rental Days</td>
          <td class="text-right">${formatPrice(bookingTourVehicle === 'Bus' ? 22010 : 16780)}</td>
          <td class="text-center font-semibold">${bookingTourExtraDays}</td>
          <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(extraDaysPrice)}</td>
        </tr>
      `;
    }
    if (bookingTourExtraHours > 0) {
      pricingRowsHTML += `
        <tr>
          <td style="font-weight: 600; color: #0f172a;">Extra Rental Hours</td>
          <td class="text-right">${formatPrice(bookingTourVehicle === 'Bus' ? 1950 : 1680)}</td>
          <td class="text-center font-semibold">${bookingTourExtraHours}</td>
          <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(extraHoursPrice)}</td>
        </tr>
      `;
    }
  } else if (service.has_booking_fields) {
    const adultTotal = bookingAdults * selectedDetailAdultPrice;
    const childTotal = bookingChildren * selectedDetailChildPrice;
    totalPrice = adultTotal + childTotal;

    pricingRowsHTML = `
      <tr>
        <td style="font-weight: 600; color: #0f172a;">Adult Guest Tickets</td>
        <td class="text-right">${formatPrice(selectedDetailAdultPrice)}</td>
        <td class="text-center font-semibold">${bookingAdults}</td>
        <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(adultTotal)}</td>
      </tr>
    `;
    if (bookingChildren > 0) {
      pricingRowsHTML += `
        <tr>
          <td style="font-weight: 600; color: #0f172a;">Child Guest Tickets (${selectedDetailChildDiscount}% Off)</td>
          <td class="text-right">${formatPrice(selectedDetailChildPrice)}</td>
          <td class="text-center font-semibold">${bookingChildren}</td>
          <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(childTotal)}</td>
        </tr>
      `;
    }
  } else {
    totalPrice = service.price || 0;
    pricingRowsHTML = `
      <tr>
        <td style="font-weight: 600; color: #0f172a;">Standard Base Rate</td>
        <td class="text-right">${formatPrice(totalPrice)}</td>
        <td class="text-center font-semibold">1</td>
        <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(totalPrice)}</td>
      </tr>
    `;
  }

  let inclusionsExclusionsHTML = '';
  const formatListHTML = (text: string, isExclusion = false) => {
    if (!text) return '';
    const items = text.split('\n').map(i => i.trim()).filter(Boolean);
    if (items.length === 0) return '';
    const listItems = items.map(item => `
      <li style="margin-bottom: 6px; display: flex; align-items: flex-start; gap: 8px;">
        <span style="color: ${isExclusion ? '#e11d48' : '#16a34a'}; font-weight: bold; font-size: 12px; line-height: 1.2;">${isExclusion ? '✕' : '✓'}</span>
        <span style="font-size: 12px;">${esc(item)}</span>
      </li>
    `).join('');
    return `
      <div style="flex: 1; min-width: 220px;">
        <div style="font-size: 11px; font-weight: 800; color: ${isExclusion ? '#e11d48' : '#16a34a'}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; border-bottom: 1.5px solid ${isExclusion ? '#ffe4e6' : '#dcfce7'}; padding-bottom: 6px;">
          ${isExclusion ? 'Exclusions' : 'Inclusions'}
        </div>
        <ul style="list-style: none; padding: 0; margin: 0; color: #475569; line-height: 1.5;">
          ${listItems}
        </ul>
      </div>
    `;
  };

  const inclHTML = formatListHTML(service.inclusions || '');
  const exclHTML = formatListHTML(service.exclusions || '', true);
  if (inclHTML || exclHTML) {
    inclusionsExclusionsHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 32px; margin-bottom: 25px; margin-top: 15px;">
        ${inclHTML}
        ${exclHTML}
      </div>
    `;
  }

  const firstImage = service.images && service.images.length > 0
    ? (service.images[0].startsWith('http') ? service.images[0] : `${window.location.origin}/storage/${service.images[0]}`)
    : `${window.location.origin}/JVD 3D.png`;

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const refNo = `JVD-QT-${Math.floor(100000 + Math.random() * 900000)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quotation - ${esc(service.name)}</title>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        @page {
          size: A4 portrait;
          margin: 15mm;
        }

        body {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          color: #334155;
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          min-height: 94vh;
          justify-content: space-between;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 18px;
          margin-bottom: 22px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo {
          height: 52px;
          width: auto;
        }

        .brand-text h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: #1e3a8a;
          letter-spacing: -0.03em;
        }

        .brand-text p {
          font-size: 10px;
          color: #3b82f6;
          margin: 3px 0 0 0;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        .meta-info {
          text-align: right;
          font-size: 11px;
          color: #475569;
          line-height: 1.5;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 10px 14px;
          border-radius: 12px;
        }

        .meta-title {
          font-size: 13px;
          font-weight: 800;
          color: #1e3a8a;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .service-section {
          margin-bottom: 24px;
        }

        .service-category {
          display: inline-block;
          background: #eff6ff;
          color: #2563eb;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 4px 10px;
          border-radius: 6px;
          margin-bottom: 10px;
        }

        .service-title {
          font-size: 26px;
          font-weight: 850;
          color: #0f172a;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .layout-grid {
          display: flex;
          gap: 24px;
          margin-bottom: 25px;
        }

        .image-col {
          flex: 1;
          max-width: 45%;
        }

        .service-image {
          width: 100%;
          height: 190px;
          object-fit: cover;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .desc-col {
          flex: 1.2;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }

        .desc-label {
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .desc-text {
          font-size: 13px;
          line-height: 1.6;
          color: #334155;
          margin: 0;
        }

        .table-section {
          margin-bottom: 25px;
        }

        .table-title {
          font-size: 11px;
          font-weight: 800;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
          border-left: 4px solid #2563eb;
          padding-left: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          border: 1px solid #e2e8f0;
        }

        th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 14px;
          border-bottom: 2px solid #e2e8f0;
          font-size: 10px;
        }

        td {
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .text-right {
          text-align: right;
        }

        .text-center {
          text-align: center;
        }

        .total-box {
          background: #f8fafc;
          border-left: 6px solid #2563eb;
          border-top: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px 24px;
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .total-label {
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .total-amount {
          font-size: 26px;
          font-weight: 900;
          color: #1e3a8a;
          letter-spacing: -0.02em;
        }

        .disclaimer {
          font-size: 9px;
          color: #64748b;
          margin-top: 8px;
          line-height: 1.4;
        }

        .footer-section {
          border-top: 1px solid #e2e8f0;
          padding-top: 25px;
          margin-top: auto;
        }

        .sign-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
        }

        .sign-col {
          width: 45%;
        }

        .sign-line {
          border-bottom: 1.5px solid #cbd5e1;
          margin-top: 45px;
          margin-bottom: 6px;
        }

        .sign-title {
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sign-name {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }

        .company-info {
          text-align: center;
          font-size: 9px;
          color: #94a3b8;
          line-height: 1.4;
          letter-spacing: 0.02em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div>
          <!-- Header -->
          <div class="header">
            <div class="brand">
              <img class="logo" src="${window.location.origin}/JVD 3D.png" alt="JVD Logo" onerror="this.style.display='none'">
              <div class="brand-text">
                <h1>JVD Event & Travel</h1>
                <p>Management Co.</p>
              </div>
            </div>
            <div class="meta-info">
              <div class="meta-title">Official Quotation</div>
              <div><strong>Ref No:</strong> ${refNo}</div>
              <div><strong>Date:</strong> ${currentDate}</div>
            </div>
          </div>

          <!-- Service Details -->
          <div class="service-section">
            <span class="service-category">${esc(service.category)}</span>
            <h2 class="service-title">${esc(service.name)}</h2>

            <div class="layout-grid">
              <div class="image-col">
                <img class="service-image" src="${esc(firstImage)}" alt="${esc(service.name)}">
              </div>
              <div class="desc-col">
                <div class="desc-label">Package Inclusions & Description</div>
                <p class="desc-text">${esc(service.description)}</p>
              </div>
            </div>
          </div>

          <!-- Inclusions & Exclusions -->
          ${inclusionsExclusionsHTML}

          <!-- Pricing Breakdown -->
          <div class="table-section">
            <div class="table-title">Pricing & Configuration Summary</div>
            <table>
              <thead>
                <tr>
                  <th class="text-left">Details</th>
                  <th class="text-right" style="width: 130px;">Unit Rate</th>
                  <th class="text-center" style="width: 100px;">Quantity</th>
                  <th class="text-right" style="width: 130px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${pricingRowsHTML}
              </tbody>
            </table>

            <div class="total-box">
              <span class="total-label">Total Amount</span>
              <span class="total-amount">${formatPrice(totalPrice)}</span>
            </div>
            <p class="disclaimer">* Pricing listed is VAT-inclusive and valid for 15 days from the date of quotation generation.</p>
          </div>
        </div>

        <!-- Print Footer -->
        <div class="footer-section">
          <div class="sign-grid">
            <div class="sign-col">
              <div class="sign-title">Prepared By</div>
              <div class="sign-line"></div>
              <div class="sign-name">${esc(agentName)}</div>
              <div style="font-size: 9px; color: #64748b; font-weight: 500;">Travel Agent / Coordinator</div>
            </div>
            <div class="sign-col">
              <div class="sign-title">Customer Acceptance</div>
              <div class="sign-line"></div>
              <div style="font-size: 9px; color: #64748b; font-weight: 500;">Signature Over Printed Name</div>
            </div>
          </div>

          <div class="company-info">
            JVD Event & Travel Management Co. • jvdmarketing8@gmail.com • (02) 8652 7325
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        }
      </script>
    </body>
    </html>
  `;
}
