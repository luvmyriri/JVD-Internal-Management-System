import type { TripTicket } from '../../types';

const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string
  ));

const peso = (value: unknown): string => `&#8369; ${Number(value || 0).toLocaleString('en-PH')}`;

// Print logic extracted and matched from TripTickets
export function printTripTicket(ticket: TripTicket) {
  const win = window.open('', '_blank', 'width=800,height=1100');
  if (!win) return;

  const driverName = ticket.driver?.name
    || [ticket.driver?.first_name, ticket.driver?.last_name].filter(Boolean).join(' ')
    || 'TBA';
  const plateNo = ticket.bus?.plate_number || ticket.plate_no || 'TBA';
  const unitBus = ticket.bus?.plate_number || plateNo;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Driver's Trip Ticket - ${esc(ticket.control_no)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm 18mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      padding: 18px 24px 54px;
    }
    .dtt-wrap {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      border: 1.5px solid #172554;
      position: relative;
    }
    .dtt-header {
      display: flex;
      align-items: stretch;
      border-bottom: 4px solid #b91c1c;
    }
    .dtt-logo-cell {
      padding: 8px 12px;
      border-right: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 80px;
    }
    .dtt-logo-box {
      width: 52px; height: 52px;
      border: 3px solid #1a56db;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
      color: #1a56db;
      letter-spacing: -1px;
    }
    .dtt-title-cell {
      flex: 1;
      padding: 8px 14px;
      border-right: 2px solid #000;
      text-align: center;
    }
    .dtt-title-cell h1 {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .dtt-title-cell p {
      font-size: 13px;
      font-weight: 700;
    }
    .dtt-control-cell {
      padding: 8px 12px;
      min-width: 160px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .dtt-control-cell span { font-weight: 700; }
    .dtt-grid { width: 100%; border-collapse: collapse; }
    .dtt-grid td, .dtt-grid th {
      border: 1px solid #000;
      padding: 5px 8px;
      vertical-align: top;
      font-size: 11px;
    }
    .dtt-grid td.label { font-weight: 700; white-space: nowrap; }
    .dtt-grid td.val { min-width: 140px; }
    .sig-section {
      display: flex;
      border-top: 2px solid #000;
    }
    .sig-half {
      flex: 1;
      padding: 10px 14px;
      min-height: 80px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 4px;
      font-size: 10px;
    }
    .sig-half:first-child { border-right: 1px solid #000; }
    .sig-half .sig-line { border-top: 1px solid #000; margin-top: 20px; padding-top: 3px; text-align: center; }
    .sig-half .title-bold { font-weight: 900; font-size: 11px; text-align: center; margin-bottom: 2px; }
    .sig-half .approver-name { font-weight: 700; font-size: 11px; }
    .sig-half .approver-role { font-size: 10px; }
    .section-header {
      background: #e8e8e8;
      text-align: center;
      font-weight: 900;
      font-size: 11.5px;
      padding: 5px;
      border-top: 2px solid #000;
      border-bottom: 1px solid #000;
      letter-spacing: 0.5px;
    }
    .liq-wrap {
      display: flex;
      border-top: 1px solid #000;
    }
    .liq-left {
      flex: 1;
      border-right: 1px solid #000;
      padding: 8px 12px;
    }
    .liq-left .liq-title { font-weight: 900; font-size: 12px; margin-bottom: 6px; }
    .liq-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .liq-row .liq-label { min-width: 110px; }
    .liq-row .liq-underline {
      flex: 1;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      text-align: right;
      font-weight: 700;
    }
    .liq-sig { margin-top: 14px; border-top: 1px solid #000; padding-top: 4px; text-align: center; font-size: 10px; }
    .liq-right {
      flex: 1;
      padding: 8px 12px;
    }
    .liq-right .fuel-title { font-weight: 900; font-size: 12px; margin-bottom: 6px; }
    .gauge-row {
      display: flex;
      gap: 20px;
      align-items: flex-end;
      margin: 8px 0;
      font-size: 10.5px;
    }
    .gauge-item { text-align: center; }
    .gauge-label { font-weight: 700; margin-bottom: 4px; font-size: 10.5px; }
    .gauge-svg { display: block; margin: 0 auto; }
    .odometer-row { margin-top: 10px; }
    .odometer-row .od-label { font-weight: 700; font-size: 11px; margin-bottom: 4px; }
    .od-line { border-bottom: 1px solid #000; min-height: 18px; margin-bottom: 3px; }
    .certify-row {
      border-top: 1px solid #000;
      padding: 8px 12px;
      font-size: 10.5px;
      font-style: italic;
      text-align: center;
    }
    .certify-sig-line {
      border-top: 1px solid #000;
      margin-top: 18px;
      padding-top: 3px;
      text-align: center;
      font-size: 10px;
      font-style: normal;
    }
    .pax-header {
      background: #e8e8e8;
      text-align: center;
      font-weight: 900;
      font-size: 11.5px;
      padding: 5px;
      border-top: 2px solid #000;
      border-bottom: 1px solid #000;
      letter-spacing: 0.5px;
    }
    .pax-body { padding: 10px 16px; }
    .pax-body p { font-size: 11px; margin-bottom: 10px; }
    .pax-ratings { display: flex; gap: 18px; margin-bottom: 10px; font-size: 11px; }
    .pax-ratings span { display: flex; align-items: center; gap: 5px; }
    .pax-box { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #000; vertical-align: middle; }
    .pax-sig-line { border-top: 1px solid #000; padding-top: 3px; text-align: center; font-size: 10px; margin-top: 10px; }
    .dtt-footer { margin-top: 12px; border-top: 5px solid #b91c1c; border-bottom: 5px solid #1d4ed8; min-height: 46px; padding: 5px 76px 5px 8px; position: relative; font-size: 8px; line-height: 1.4; color: #334155; }
    .dtt-footer img { position: absolute; right: 8px; bottom: 2px; width: 54px; height: auto; }
    @media print {
      body { padding: 0; }
      .dtt-wrap { border: 2px solid #000; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <div class="no-print" style="text-align:right; margin-bottom:10px;">
    <button onclick="window.print()" style="padding:8px 20px; background:#1a56db; color:white; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">Print</button>
    <button onclick="window.close()" style="margin-left:10px; padding:8px 20px; background:#6b7280; color:white; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:13px;">Close</button>
  </div>

  <div class="dtt-wrap">
    <div class="dtt-header">
      <div class="dtt-logo-cell">
        <img src="/JVDlogo-removebg-preview.png" style="width: 64px; height: 64px; object-fit: contain;" alt="JVD Logo" />
      </div>
      <div class="dtt-title-cell">
        <h1>DRIVER'S TRIP TICKET</h1>
        <p>(DTT)</p>
      </div>
      <div class="dtt-control-cell">
        <div><span>Control No.:</span> ${esc(ticket.control_no)}</div>
        <div><span>Issue Date:</span> ${esc(ticket.issue_date || '')}</div>
      </div>
    </div>

    <table class="dtt-grid">
      <tr>
        <td class="label">Date of Travel:</td>
        <td class="val">${esc(ticket.date_of_travel)}</td>
        <td class="label">Duration:</td>
        <td class="val">${esc(ticket.duration || '')}</td>
      </tr>
      <tr>
        <td class="label">Pick Up:</td>
        <td class="val">${esc(ticket.pick_up)}</td>
        <td class="label">Drop Off:</td>
        <td class="val">${esc(ticket.drop_off)}</td>
      </tr>
      <tr>
        <td class="label">Unit/Bus:</td>
        <td class="val">${esc(unitBus)}</td>
        <td class="label">Plate No.:</td>
        <td class="val">${esc(plateNo)}</td>
      </tr>
      <tr>
        <td class="label">No of Passengers:</td>
        <td class="val">${esc(ticket.no_of_passengers)}${ticket.passenger_name ? ' - ' + esc(ticket.passenger_name) : ''}</td>
        <td class="label">Driver:</td>
        <td class="val">${esc(driverName)}</td>
      </tr>
    </table>

    <div class="sig-section">
      <div class="sig-half">
        <div class="title-bold">Requested By:</div>
        <div class="sig-line">Name in Print/Signature</div>
      </div>
      <div class="sig-half">
        <div class="title-bold">Approved By:</div>
        <div style="text-align:center; margin-top:24px;">
          <div class="approver-name">Rhean O. Umali</div>
          <div class="approver-role">Executive Vice President</div>
        </div>
      </div>
    </div>

    <div class="section-header">DRIVER'S TRAVEL COMPLETION REPORT</div>

    <div class="liq-wrap">
      <div class="liq-left">
        <div class="liq-title">Liquidation</div>
        <div class="liq-row">
          <span class="liq-label">Meal Allowance</span>
          <span class="liq-underline">${peso(ticket.meal_allowance)}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Diesel</span>
          <span class="liq-underline">${peso(ticket.diesel)}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">SOP</span>
          <span class="liq-underline">${peso(ticket.sop)}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Easy Trip</span>
          <span class="liq-underline">${peso(ticket.easy_trip)}</span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Autosweep</span>
          <span class="liq-underline">${peso(ticket.autosweep)}</span>
        </div>
        <div class="liq-sig">Signature</div>
      </div>

      <div class="liq-right">
        <div class="fuel-title">Fuel Consumed for the Trip</div>
        <div style="font-size:10.5px; margin-bottom:6px;">Fuel Gauge Reading</div>
        <div class="gauge-row">
          <div class="gauge-item">
            <div class="gauge-label">Before</div>
            <svg class="gauge-svg" width="80" height="48" viewBox="0 0 80 48">
              <path d="M4 44 A36 36 0 0 1 76 44" fill="none" stroke="#ccc" stroke-width="8" stroke-linecap="round"/>
              <line x1="40" y1="44" x2="10" y2="20" stroke="#000" stroke-width="2" stroke-linecap="round"/>
              <text x="2" y="47" font-size="9" font-weight="700">E</text>
              <text x="70" y="47" font-size="9" font-weight="700">F</text>
            </svg>
          </div>
          <div class="gauge-item">
            <div class="gauge-label">After</div>
            <svg class="gauge-svg" width="80" height="48" viewBox="0 0 80 48">
              <path d="M4 44 A36 36 0 0 1 76 44" fill="none" stroke="#ccc" stroke-width="8" stroke-linecap="round"/>
              <line x1="40" y1="44" x2="10" y2="20" stroke="#000" stroke-width="2" stroke-linecap="round"/>
              <text x="2" y="47" font-size="9" font-weight="700">E</text>
              <text x="70" y="47" font-size="9" font-weight="700">F</text>
            </svg>
          </div>
        </div>
        <div class="odometer-row">
          <div class="od-label">Odometer (Km) Reading</div>
          <div style="display:flex; gap:14px;">
            <div style="flex:1;">
              <div style="font-size:9.5px;">Before</div>
              <div class="od-line"></div>
            </div>
            <div style="flex:1;">
              <div style="font-size:9.5px;">After</div>
              <div class="od-line"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="certify-row">
      I hereby certify to the correctness of the above statement of the record travel
      <div class="certify-sig-line">Driver's Name in Print and Signature</div>
    </div>

    <div class="pax-header">PASSENGER CERTIFICATION</div>
    <div class="pax-body">
      <p>
        I hereby certify that I used this vehicle on _______________ from _____________ to _____________ I also rate the service provided as:
      </p>
      <div class="pax-ratings">
        <span><span class="pax-box"></span> Outstanding</span>
        <span><span class="pax-box"></span> Satisfactory</span>
        <span><span class="pax-box"></span> Needs Improvement</span>
        <span><span class="pax-box"></span> Poor</span>
      </div>
      <div class="pax-sig-line">Passenger's Name in Print and Signature</div>
    </div>
  </div>
  <div class="dtt-footer">
    JVD Event &amp; Travel Management Company<br>
    Unit 6 Aryanna Village Center, Susano Road, Brgy. 175, Camarin, Caloocan City &nbsp; | &nbsp; DOT-NCR-TTA-02903-2024
    <img src="/dot-quality-seal.png" alt="Department of Tourism Quality Seal">
  </div>
</body>
</html>
`;
  win.document.write(html);
  win.document.close();
}
