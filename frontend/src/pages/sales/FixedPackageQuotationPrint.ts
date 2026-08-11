import type { Service } from '../../api/billing';

// Escape user-controlled values before interpolating into the print HTML (prevents XSS in the print window).
const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

const formatPrice = (amount: number) => {
  return '&#8369; ' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/** Booking selections needed to derive the priced line items. */
export interface QuotationPricingInput {
  service: Service;
  bookingTourVehicle: 'Bus' | 'Coaster';
  bookingTourExtraDays: number;
  bookingTourExtraHours: number;
  bookingAdults: number;
  bookingChildren: number;
  selectedDetailAdultPrice: number;
  selectedDetailChildPrice: number;
  selectedDetailChildDiscount: number;
}

export interface QuotationLineItem {
  description: string;
  unit_price: number;
  quantity: number;
  amount: number;
}

/**
 * Derive the priced line items from the current booking selections.
 * Shared by the API payload and the printed table so both stay in sync.
 * Prices are VAT-inclusive (as stored on the service).
 */
export function computeQuotationLineItems(p: QuotationPricingInput): QuotationLineItem[] {
  const { service } = p;
  const rows: QuotationLineItem[] = [];
  const row = (description: string, unit_price: number, quantity: number) =>
    rows.push({ description, unit_price, quantity, amount: Math.round(unit_price * quantity * 100) / 100 });

  if (service.is_tour) {
    const base = p.bookingTourVehicle === 'Bus' ? (service.bus_price || 0) : (service.coaster_price || 0);
    row(`Vehicle Rental (${p.bookingTourVehicle})`, base, 1);
    if (p.bookingTourExtraDays > 0) {
      row('Extra Rental Days', p.bookingTourVehicle === 'Bus' ? 22010 : 16780, p.bookingTourExtraDays);
    }
    if (p.bookingTourExtraHours > 0) {
      row('Extra Rental Hours', p.bookingTourVehicle === 'Bus' ? 1950 : 1680, p.bookingTourExtraHours);
    }
  } else if (service.has_booking_fields) {
    row('Adult Guest Tickets', p.selectedDetailAdultPrice, p.bookingAdults);
    if (p.bookingChildren > 0) {
      row(`Child Guest Tickets (${p.selectedDetailChildDiscount}% off)`, p.selectedDetailChildPrice, p.bookingChildren);
    }
  } else {
    row('Standard Base Rate', service.price || 0, 1);
  }
  return rows;
}

export interface QuotationRecipient {
  client_name: string;
  client_company?: string;
  client_address?: string;
  client_contact?: string;
  client_email?: string;
  client_tin?: string;
}

export interface QuotationMeta {
  quotationNumber: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  validUntil: string;  // yyyy-mm-dd
  travelDate?: string; // yyyy-mm-dd
}

export interface ServiceQuotationParams extends QuotationPricingInput {
  agentName: string;
  recipient: QuotationRecipient;
  meta: QuotationMeta;
}

// Builds the full printable, business-standard quotation HTML document.
export function buildServiceQuotationHtml(params: ServiceQuotationParams): string {
  const { service, agentName, recipient, meta } = params;

  const lineItems = computeQuotationLineItems(params);
  const pricingRowsHTML = lineItems.map((li) => `
    <tr>
      <td style="font-weight: 600; color: #0f172a;">${esc(li.description)}</td>
      <td class="text-right">${formatPrice(li.unit_price)}</td>
      <td class="text-center font-semibold">${li.quantity}</td>
      <td class="text-right font-bold" style="color: #0f172a;">${formatPrice(li.amount)}</td>
    </tr>
  `).join('');

  // Inclusions / exclusions (only render when present).
  const formatListHTML = (text: string, isExclusion = false) => {
    if (!text) return '';
    const items = text.split('\n').map((i) => i.trim()).filter(Boolean);
    if (items.length === 0) return '';
    const listItems = items.map((item) => `
      <li style="margin-bottom: 6px; display: flex; align-items: flex-start; gap: 8px;">
        <span style="color: ${isExclusion ? '#b91c1c' : '#166534'}; font-weight: bold; font-size: 12px; line-height: 1.2;">${isExclusion ? 'X' : '+'}</span>
        <span style="font-size: 12px;">${esc(item)}</span>
      </li>
    `).join('');
    return `
      <div style="flex: 1; min-width: 220px;">
        <div style="font-size: 11px; font-weight: 800; color: ${isExclusion ? '#e11d48' : '#16a34a'}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; border-bottom: 1.5px solid ${isExclusion ? '#ffe4e6' : '#dcfce7'}; padding-bottom: 6px;">
          ${isExclusion ? 'Exclusions' : 'Inclusions'}
        </div>
        <ul style="list-style: none; padding: 0; margin: 0; color: #475569; line-height: 1.5;">${listItems}</ul>
      </div>
    `;
  };
  const inclHTML = formatListHTML(service.inclusions || '');
  const exclHTML = formatListHTML(service.exclusions || '', true);
  const inclusionsExclusionsHTML = (inclHTML || exclHTML)
    ? `<div style="display: flex; flex-wrap: wrap; gap: 32px; margin-bottom: 22px; margin-top: 4px;">${inclHTML}${exclHTML}</div>`
    : '';

  // Only show the image column when the service actually has an image.
  const hasImage = !!(service.images && service.images.length > 0);
  const firstImage = hasImage
    ? (service.images![0].startsWith('http') ? service.images![0] : `${window.location.origin}/storage/${service.images![0]}`)
    : '';
  const descText = (service.description || '').trim();

  const detailsBlock = (hasImage || descText) ? `
    <div class="layout-grid">
      ${hasImage ? `<div class="image-col"><img class="service-image" src="${esc(firstImage)}" alt="${esc(service.name)}"></div>` : ''}
      <div class="desc-col" style="${hasImage ? '' : 'max-width:100%;'}">
        <div class="desc-label">Package Description</div>
        <p class="desc-text">${descText ? esc(descText) : 'Please see the itemized pricing and inclusions below.'}</p>
      </div>
    </div>
  ` : '';

  // Recipient rows (only lines that have a value).
  const recipientLine = (label: string, value?: string) =>
    value && value.trim() ? `<div><span style="color:#94a3b8;">${label}:</span> <strong style="color:#0f172a;">${esc(value)}</strong></div>` : '';
  const recipientHTML = `
    ${recipientLine('Company', recipient.client_company)}
    ${recipientLine('Address', recipient.client_address)}
    ${recipientLine('Contact', recipient.client_contact)}
    ${recipientLine('Email', recipient.client_email)}
    ${recipientLine('TIN', recipient.client_tin)}
  `;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quotation ${esc(meta.quotationNumber)}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4 portrait; margin: 12mm 14mm 18mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #334155; margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; min-height: 260mm; justify-content: space-between; position: relative; overflow: hidden; }
        .content { position: relative; z-index: 1; }
        .watermark { position: absolute; width: 330px; left: 50%; top: 32%; transform: translateX(-50%); opacity: .035; z-index: 0; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #b91c1c; padding-bottom: 12px; margin-bottom: 18px; }
        .brand { display: flex; align-items: center; gap: 14px; }
        .logo { height: 50px; width: auto; }
        .brand-text h1 { font-size: 19px; font-weight: 800; margin: 0; color: #172554; letter-spacing: -0.03em; }
        .brand-text p { font-size: 9px; color: #b91c1c; margin: 3px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
        .brand-contact { font-size: 8.5px; color: #94a3b8; margin-top: 5px; line-height: 1.4; }
        .meta-info { text-align: right; font-size: 11px; color: #475569; line-height: 1.6; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 12px; min-width: 190px; }
        .meta-title { font-size: 13px; font-weight: 800; color: #1e3a8a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
        .parties { display: flex; gap: 20px; margin-bottom: 20px; }
        .party-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; }
        .party-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
        .party-name { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .party-lines { font-size: 10.5px; color: #475569; line-height: 1.7; }
        .service-category { display: inline-block; background: #eff6ff; color: #2563eb; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 6px; margin-bottom: 8px; }
        .service-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.02em; line-height: 1.15; }
        .layout-grid { display: flex; gap: 22px; margin-bottom: 20px; }
        .image-col { flex: 1; max-width: 42%; }
        .service-image { width: 100%; height: 170px; object-fit: cover; border-radius: 16px; border: 1px solid #e2e8f0; }
        .desc-col { flex: 1.3; }
        .desc-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .desc-text { font-size: 12.5px; line-height: 1.6; color: #334155; margin: 0; }
        .table-title { font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; border-left: 4px solid #2563eb; padding-left: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e2e8f0; }
        th { background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 11px 14px; border-bottom: 2px solid #e2e8f0; font-size: 10px; }
        td { padding: 11px 14px; border-bottom: 1px solid #e2e8f0; color: #475569; }
        tbody tr:last-child td { border-bottom: none; }
        .text-right { text-align: right; } .text-center { text-align: center; }
        .totals { margin-top: 16px; margin-left: auto; width: 300px; font-size: 12px; }
        .totals .row { display: flex; justify-content: space-between; padding: 7px 4px; color: #475569; }
        .totals .row.grand { border-top: 2px solid #1e3a8a; margin-top: 4px; padding-top: 12px; font-size: 15px; font-weight: 900; color: #1e3a8a; }
        .disclaimer { font-size: 9px; color: #64748b; margin-top: 14px; line-height: 1.5; }
        .terms { margin-top: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; }
        .terms-title { font-size: 10px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .terms ul { margin: 0; padding-left: 16px; font-size: 10px; color: #475569; line-height: 1.7; }
        .footer-section { border-top: 1px solid #e2e8f0; padding-top: 22px; margin-top: 24px; position: relative; z-index: 1; padding-bottom: 28px; }
        .sign-grid { display: flex; justify-content: space-between; margin-bottom: 22px; }
        .sign-col { width: 45%; }
        .sign-line { border-bottom: 1.5px solid #cbd5e1; margin-top: 42px; margin-bottom: 6px; }
        .sign-title { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .sign-name { font-size: 12px; font-weight: 700; color: #0f172a; }
        .company-info { text-align: center; font-size: 8px; color: #64748b; line-height: 1.4; letter-spacing: 0.02em; border-top: 5px solid #b91c1c; border-bottom: 5px solid #1d4ed8; padding: 5px 74px 5px 4px; min-height: 23px; }
        .dot-seal { position: absolute; right: 5px; bottom: 3px; width: 62px; height: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <img class="watermark" src="${window.location.origin}/JVDlogo-removebg-preview.png" alt="">
        <div class="content">
          <div class="header">
            <div class="brand">
              <img class="logo" src="${window.location.origin}/JVDlogo-removebg-preview.png" alt="JVD Logo" onerror="this.style.display='none'">
              <div class="brand-text">
                <h1>JVD Event &amp; Travel</h1>
                <p>Management Co.</p>
                <div class="brand-contact">jvdtransport8@gmail.com &bull; 0954 396 0802 &bull; (02) 8293 8068</div>
              </div>
            </div>
            <div class="meta-info">
              <div class="meta-title">Quotation</div>
              <div><strong>No:</strong> ${esc(meta.quotationNumber)}</div>
              <div><strong>Date:</strong> ${today}</div>
              <div><strong>Valid Until:</strong> ${formatDate(meta.validUntil)}</div>
              ${meta.travelDate ? `<div><strong>Travel Date:</strong> ${formatDate(meta.travelDate)}</div>` : ''}
            </div>
          </div>

          <!-- Parties -->
          <div class="parties">
            <div class="party-box">
              <div class="party-label">Quotation To</div>
              <div class="party-name">${esc(recipient.client_name)}</div>
              <div class="party-lines">${recipientHTML || '<span style="color:#94a3b8;">-</span>'}</div>
            </div>
            <div class="party-box">
              <div class="party-label">Prepared By</div>
              <div class="party-name">${esc(agentName)}</div>
              <div class="party-lines">
                <div>Travel Agent / Coordinator</div>
                <div>JVD Event &amp; Travel Management Co.</div>
              </div>
            </div>
          </div>

          <!-- Service -->
          <div style="margin-bottom: 14px;">
            ${service.category ? `<span class="service-category">${esc(service.category)}</span>` : ''}
            <h2 class="service-title">${esc(service.name)}</h2>
          </div>
          ${detailsBlock}
          ${inclusionsExclusionsHTML}

          <!-- Pricing -->
          <div class="table-title">Pricing Breakdown</div>
          <table>
            <thead>
              <tr>
                <th class="text-left">Description</th>
                <th class="text-right" style="width: 130px;">Unit Rate</th>
                <th class="text-center" style="width: 90px;">Qty</th>
                <th class="text-right" style="width: 130px;">Amount</th>
              </tr>
            </thead>
            <tbody>${pricingRowsHTML}</tbody>
          </table>

          <div class="totals">
            <div class="row"><span>Subtotal (VAT-exclusive)</span><span>${formatPrice(meta.subtotal)}</span></div>
            <div class="row"><span>VAT (${meta.vatRate}%)</span><span>${formatPrice(meta.vatAmount)}</span></div>
            <div class="row grand"><span>Total Amount</span><span>${formatPrice(meta.total)}</span></div>
          </div>
          <p class="disclaimer">* All figures are in Philippine Peso and VAT-inclusive. This quotation is valid until ${formatDate(meta.validUntil)}.</p>

          <div class="terms">
            <div class="terms-title">Terms &amp; Conditions</div>
            <ul>
              <li>Prices are subject to change without prior notice after the validity date.</li>
              <li>A reservation is confirmed only upon receipt of the required deposit.</li>
              <li>Rates are inclusive of 12% VAT unless otherwise stated.</li>
              <li>Inclusions and exclusions are as listed above; additional requests may incur extra charges.</li>
            </ul>
          </div>
        </div>

        <div class="footer-section">
          <div class="sign-grid">
            <div class="sign-col">
              <div class="sign-title">Prepared By</div>
              <div class="sign-line"></div>
              <div class="sign-name">${esc(agentName)}</div>
              <div style="font-size: 9px; color: #64748b; font-weight: 500;">Travel Agent / Coordinator</div>
            </div>
            <div class="sign-col">
              <div class="sign-title">Conforme (Customer)</div>
              <div class="sign-line"></div>
              <div style="font-size: 9px; color: #64748b; font-weight: 500;">Signature Over Printed Name &amp; Date</div>
            </div>
          </div>
          <div class="company-info">
            Unit 6 Aryanna Village Center, Susano Road, Brgy. 175, Camarin, Caloocan City<br>
            DOT Accreditation No. DOT-NCR-TTA-02903-2024
          </div>
          <img class="dot-seal" src="${window.location.origin}/dot-quality-seal.png" alt="Department of Tourism Quality Seal">
        </div>
      </div>

      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); }
      </script>
    </body>
    </html>
  `;
}
