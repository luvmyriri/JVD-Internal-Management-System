import type { TripTicket } from '../../types';

const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, character => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string
  ));

const peso = (value: unknown): string => `&#8369; ${Number(value || 0).toLocaleString('en-PH')}`;

// Print & Editable DTT Viewer
export function printTripTicket(ticket: TripTicket) {
  const win = window.open('', '_blank', 'width=860,height=1100');
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
    @page { size: A4 portrait; margin: 8mm 12mm 16mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #000;
      background: #f1f5f9;
      padding: 18px 24px 54px;
    }
    .dtt-wrap {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      border: 1.5px solid #172554;
      background: #fff;
      position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
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
    .dtt-title-cell {
      flex: 1;
      padding: 8px 12px;
      text-align: center;
      border-right: 2px solid #000;
    }
    .dtt-title-cell h1 {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .dtt-title-cell p { font-size: 11px; font-weight: 700; margin-top: 2px; }
    .dtt-control-cell {
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      min-width: 170px;
      font-size: 10.5px;
    }
    .dtt-control-cell span { font-weight: 700; }
    .dtt-grid { width: 100%; border-collapse: collapse; }
    .dtt-grid td, .dtt-grid th {
      border: 1px solid #000;
      padding: 5px 8px;
      font-size: 10.5px;
      vertical-align: middle;
    }
    .dtt-grid td.label { font-weight: 700; white-space: nowrap; width: 1%; }
    .dtt-grid td.val { min-width: 140px; }
    .sig-section {
      display: flex;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .sig-half {
      flex: 1;
      padding: 8px 14px 10px;
    }
    .sig-half:first-child { border-right: 2px solid #000; }
    .sig-half .title-bold { font-weight: 700; font-size: 10.5px; margin-bottom: 28px; }
    .sig-half .sig-line {
      border-top: 1px solid #000;
      text-align: center;
      font-size: 10px;
      padding-top: 3px;
    }
    .approver-name { font-weight: 700; font-size: 12px; }
    .approver-role { font-size: 10px; color: #333; }
    .section-header {
      background: #e8e8e8;
      text-align: center;
      font-weight: 900;
      font-size: 11.5px;
      padding: 5px;
      border-bottom: 2px solid #000;
      letter-spacing: 0.5px;
    }
    .liq-wrap {
      display: flex;
      border-bottom: 2px solid #000;
    }
    .liq-left {
      width: 250px;
      border-right: 2px solid #000;
      padding: 8px 12px;
    }
    .liq-left .liq-title { font-weight: 900; font-size: 12px; margin-bottom: 6px; }
    .liq-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 10.5px;
    }
    .liq-label { font-weight: 700; }
    .liq-underline {
      display: inline-block;
      min-width: 80px;
      border-bottom: 1px solid #000;
      padding-bottom: 1px;
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
    .pax-body p { font-size: 11px; margin-bottom: 10px; line-height: 1.5; }
    .pax-ratings { display: flex; gap: 18px; margin-bottom: 10px; font-size: 11px; }
    .pax-ratings span { display: flex; align-items: center; gap: 5px; }
    .pax-box { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #000; vertical-align: middle; }
    .pax-sig-line { border-top: 1px solid #000; padding-top: 3px; text-align: center; font-size: 10px; margin-top: 10px; }
    .dtt-footer {
      width: 100%;
      max-width: 680px;
      margin: 12px auto 0;
      border-top: 5px solid #b91c1c;
      border-bottom: 5px solid #1d4ed8;
      min-height: 46px;
      padding: 5px 76px 5px 8px;
      position: relative;
      font-size: 8px;
      line-height: 1.4;
      color: #334155;
      background: #fff;
    }
    .dtt-footer img { position: absolute; right: 8px; bottom: 2px; width: 54px; height: auto; }

    /* Interactive Editable Mode Styling */
    .dtt-editable {
      display: inline-block;
      min-width: 24px;
      padding: 1px 4px;
      border-radius: 3px;
      transition: all 0.15s ease-in-out;
      cursor: text;
      background: rgba(238, 242, 255, 0.65);
      border-bottom: 1.5px dashed #6366f1;
    }
    .dtt-editable:hover {
      background: #e0f2fe;
      outline: 1px dashed #0284c7;
    }
    .dtt-editable:focus {
      background: #fff;
      outline: 2px solid #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.25);
    }
    .edit-locked .dtt-editable {
      cursor: default !important;
      outline: none !important;
      background: transparent !important;
      border-bottom: none !important;
    }

    /* Print Preview Action Toolbar */
    .toolbar-banner {
      width: 100%;
      max-width: 680px;
      margin: 0 auto 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 12px 18px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .toolbar-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .toolbar-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .toolbar-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 1px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-action {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-print { background: #2563eb; color: #fff; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
    .btn-print:hover { background: #1d4ed8; }
    .btn-toggle { background: #f8fafc; color: #334155; border: 1px solid #cbd5e1; }
    .btn-toggle:hover { background: #f1f5f9; }
    .btn-close { background: #64748b; color: #fff; }
    .btn-close:hover { background: #475569; }

    @media print {
      body {
        padding: 0 !important;
        background: #fff !important;
      }
      .no-print { display: none !important; }
      .dtt-wrap {
        border: 2px solid #000 !important;
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .dtt-footer {
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .dtt-editable {
        outline: none !important;
        background: transparent !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- Printable Action Toolbar -->
  <div class="no-print toolbar-banner">
    <div class="toolbar-info">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="toolbar-badge">✏️ Editable DTT</span>
          <span class="toolbar-title">Ticket #${esc(ticket.control_no)}</span>
        </div>
        <div class="toolbar-sub">Click on any text or number below to edit before printing. Changes apply to this printout.</div>
      </div>
    </div>
    <div class="toolbar-actions">
      <button class="btn-action btn-toggle" id="toggleEditBtn" onclick="toggleEditMode()" title="Toggle in-place editing on/off">
        🔒 Lock Editing
      </button>
      <button class="btn-action btn-print" onclick="triggerPrint()" title="Print this trip ticket">
        🖨️ Print DTT
      </button>
      <button class="btn-action btn-close" onclick="window.close()" title="Close this window">
        ✕ Close
      </button>
    </div>
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
        <div><span>Control No.:</span> <span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(ticket.control_no)}</span></div>
        <div><span>Issue Date:</span> <span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(ticket.issue_date || '')}</span></div>
      </div>
    </div>

    <table class="dtt-grid">
      <tr>
        <td class="label">Date of Travel:</td>
        <td class="val"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(ticket.date_of_travel)}</span></td>
        <td class="label">Duration:</td>
        <td class="val"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(ticket.duration || '')}</span></td>
      </tr>
      <tr>
        <td class="label">Pick Up:</td>
        <td class="val"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(ticket.pick_up)}</span></td>
        <td class="label">Drop Off:</td>
        <td class="val"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(ticket.drop_off)}</span></td>
      </tr>
      <tr>
        <td class="label">Unit/Bus:</td>
        <td class="val"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(unitBus)}</span></td>
        <td class="label">Plate No.:</td>
        <td class="val"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(plateNo)}</span></td>
      </tr>
      <tr>
        <td class="label">Tour / Service:</td>
        <td class="val" colspan="3"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(ticket.tour_name || ticket.sales_order_item?.title || ticket.passenger_name || '—')}${ticket.tour_code ? ' (' + esc(ticket.tour_code) + ')' : ''}</span></td>
      </tr>
      <tr>
        <td class="label">No of Passengers:</td>
        <td class="val"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(ticket.no_of_passengers)}${ticket.passenger_name ? ' - ' + esc(ticket.passenger_name) : ''}</span></td>
        <td class="label">Driver:</td>
        <td class="val"><span class="dtt-editable" contenteditable="true" spellcheck="false">${esc(driverName)}</span></td>
      </tr>
    </table>

    <div class="sig-section">
      <div class="sig-half">
        <div class="title-bold">Requested By:</div>
        <div class="sig-line dtt-editable" contenteditable="true" spellcheck="false">Name in Print/Signature</div>
      </div>
      <div class="sig-half">
        <div class="title-bold">Approved By:</div>
        <div style="text-align:center; margin-top:24px;">
          <div class="approver-name dtt-editable" contenteditable="true" spellcheck="false">Rhean O. Umali</div>
          <div class="approver-role dtt-editable" contenteditable="true" spellcheck="false">Executive Vice President</div>
        </div>
      </div>
    </div>

    <div class="section-header">DRIVER'S TRAVEL COMPLETION REPORT</div>

    <div class="liq-wrap">
      <div class="liq-left">
        <div class="liq-title">Liquidation</div>
        <div class="liq-row">
          <span class="liq-label">Meal Allowance</span>
          <span class="liq-underline"><span class="dtt-editable" contenteditable="true" spellcheck="false">${peso(ticket.meal_allowance)}</span></span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Diesel</span>
          <span class="liq-underline"><span class="dtt-editable" contenteditable="true" spellcheck="false">${peso(ticket.diesel)}</span></span>
        </div>
        <div class="liq-row">
          <span class="liq-label">SOP</span>
          <span class="liq-underline"><span class="dtt-editable" contenteditable="true" spellcheck="false">${peso(ticket.sop)}</span></span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Easy Trip</span>
          <span class="liq-underline"><span class="dtt-editable" contenteditable="true" spellcheck="false">${peso(ticket.easy_trip)}</span></span>
        </div>
        <div class="liq-row">
          <span class="liq-label">Autosweep</span>
          <span class="liq-underline"><span class="dtt-editable" contenteditable="true" spellcheck="false">${peso(ticket.autosweep)}</span></span>
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
              <text x="2" y="47" font-size="9" font-weight="700">E</text>
              <text x="70" y="47" font-size="9" font-weight="700">F</text>
            </svg>
          </div>
          <div class="gauge-item">
            <div class="gauge-label">After</div>
            <svg class="gauge-svg" width="80" height="48" viewBox="0 0 80 48">
              <path d="M4 44 A36 36 0 0 1 76 44" fill="none" stroke="#ccc" stroke-width="8" stroke-linecap="round"/>
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
              <div class="od-line dtt-editable" contenteditable="true" spellcheck="false"></div>
            </div>
            <div style="flex:1;">
              <div style="font-size:9.5px;">After</div>
              <div class="od-line dtt-editable" contenteditable="true" spellcheck="false"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="certify-row">
      I hereby certify to the correctness of the above statement of the record travel
      <div class="certify-sig-line dtt-editable" contenteditable="true" spellcheck="false">Driver's Name in Print and Signature</div>
    </div>

    <div class="pax-header">PASSENGER CERTIFICATION</div>
    <div class="pax-body">
      <p class="dtt-editable" contenteditable="true" spellcheck="false">
        I hereby certify that I used this vehicle on <u>${esc(ticket.date_of_travel || '_______________')}</u> from <u>${esc(ticket.pick_up || '_____________')}</u> to <u>${esc(ticket.drop_off || '_____________')}</u>. I also rate the service provided as:
      </p>
      <div class="pax-ratings">
        <span><span class="pax-box"></span> Outstanding</span>
        <span><span class="pax-box"></span> Satisfactory</span>
        <span><span class="pax-box"></span> Needs Improvement</span>
        <span><span class="pax-box"></span> Poor</span>
      </div>
      <div class="pax-sig-line dtt-editable" contenteditable="true" spellcheck="false">Passenger's Name in Print and Signature</div>
    </div>
  </div>

  <div class="dtt-footer">
    JVD Event &amp; Travel Management Company<br>
    Unit 6 Aryanna Village Center, Susano Road, Brgy. 175, Camarin, Caloocan City &nbsp; | &nbsp; DOT-NCR-TTA-02903-2024
    <img src="/dot-quality-seal.png" alt="Department of Tourism Quality Seal">
  </div>

  <script>
    let isEditingEnabled = true;

    function lockEditing() {
      isEditingEnabled = false;
      var body = document.body;
      var btn = document.getElementById('toggleEditBtn');
      var editables = document.querySelectorAll('.dtt-editable');
      if (body) body.classList.add('edit-locked');
      if (btn) btn.innerHTML = '✏️ Enable Editing';
      editables.forEach(function(el) {
        el.setAttribute('contenteditable', 'false');
      });
    }

    function unlockEditing() {
      isEditingEnabled = true;
      var body = document.body;
      var btn = document.getElementById('toggleEditBtn');
      var editables = document.querySelectorAll('.dtt-editable');
      if (body) body.classList.remove('edit-locked');
      if (btn) btn.innerHTML = '🔒 Lock Editing';
      editables.forEach(function(el) {
        el.setAttribute('contenteditable', 'true');
      });
    }

    function toggleEditMode() {
      if (isEditingEnabled) {
        lockEditing();
      } else {
        unlockEditing();
      }
    }

    function triggerPrint() {
      if (document.activeElement) {
        document.activeElement.blur();
      }
      // Explicitly lock editing before printing as requested:
      // "i want it if i click the print i can't edit the file"
      lockEditing();
      setTimeout(function() {
        window.print();
      }, 100);
    }

    window.addEventListener('beforeprint', function() {
      lockEditing();
    });
  </script>
</body>
</html>
`;
  win.document.write(html);
  win.document.close();
}
