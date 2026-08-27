import { loadExcelJS } from './lazyExport';
import type { EducationalTourPackage, EducationalTourParticipantBooking, RegisterParticipantPayload } from '../api/educationalTours';

/**
 * Downloads a pre-formatted Excel template for bulk participant upload.
 */
export async function downloadEducationalRosterTemplate(pkg: EducationalTourPackage): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JVD Management System';
  workbook.lastModifiedBy = 'JVD Sales';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Participants Upload');

  // Title info block
  worksheet.addRow([`JVD EDUCATIONAL TOUR PARTICIPANT UPLOAD TEMPLATE`]);
  const studentRateStr = pkg.pricing?.rate_per_head ? `₱${pkg.pricing.rate_per_head.toLocaleString()}` : '₱0.00';
  const adultRateStr = pkg.pricing?.adult_rate_per_head ? `₱${pkg.pricing.adult_rate_per_head.toLocaleString()}` : studentRateStr;
  worksheet.addRow([`Package: ${pkg.name} (${pkg.tour_code}) | School: ${pkg.school_name} | Student Rate: ${studentRateStr} | Adult Rate: ${adultRateStr}`]);
  worksheet.addRow([]); // Blank row

  // Header row
  const headers = [
    'First Name *',
    'Middle Name',
    'Last Name *',
    'Passenger Type (student / adult / companion)',
    'Student ID / No.',
    'Grade Level',
    'Section',
    'Date of Birth (YYYY-MM-DD)',
    'Email Address',
    'Contact Phone',
    'Guardian / Emergency Name',
    'Guardian / Emergency Email',
    'Guardian / Emergency Phone',
    'Emergency Contact Name',
    'Emergency Contact Phone',
    'Payment Plan (full / down_payment / installment)',
    'Dietary Restrictions',
    'Medical Notes',
    'Coach # (e.g. 1 or 2)',
    'Seat # (e.g. 1 or Seat 1)',
  ];

  const headerRow = worksheet.addRow(headers);

  // Style header row
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A8A' }, // Navy blue
    };
    cell.font = {
      color: { argb: 'FFFFFF' },
      bold: true,
      size: 11,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    };
  });
  headerRow.height = 28;

  // Example rows
  const exampleRow1 = worksheet.addRow([
    'Juan',
    'Perez',
    'Dela Cruz',
    'student',
    '2026-STU-001',
    pkg.grade_level || 'Grade 10',
    'Rizal',
    '2009-05-15',
    'juan.delacruz@student.edu.ph',
    '09171234567',
    'Maria Dela Cruz',
    'maria.delacruz@gmail.com',
    '09181234567',
    'Maria Dela Cruz',
    '09181234567',
    'full',
    'None / Peanut Allergy',
    'Asthma (carries inhaler)',
    '1',
    '1',
  ]);

  const exampleRow2 = worksheet.addRow([
    'Maria',
    'Santos',
    'Garcia',
    'adult',
    '', // Adults do not require student ID
    '', // Adults do not require grade level
    '', // Adults do not require section
    '1985-08-22',
    'maria.garcia@gmail.com',
    '09191234568',
    'Roberto Garcia',
    'roberto.garcia@gmail.com',
    '09201234568',
    'Roberto Garcia',
    '09201234568',
    'down_payment',
    'Vegetarian',
    'None',
    '1',
    '2',
  ]);

  [exampleRow1, exampleRow2].forEach((row) => {
    row.eachCell((cell) => {
      cell.font = { size: 10, italic: true, color: { argb: '4B5563' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } },
      };
    });
  });

  // Adjust column widths
  worksheet.columns.forEach((column, index) => {
    const headerText = headers[index] || '';
    column.width = Math.max(headerText.length + 4, 18);
  });

  // Export buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `${(pkg.tour_code || 'JVD-EDT').replace(/[^a-zA-Z0-9-_]/g, '_')}_Participant_Template.xlsx`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

export interface ParsedParticipantRow {
  rowNumber: number;
  payload: RegisterParticipantPayload;
  displayName: string;
  studentNumber: string;
  gradeAndSection: string;
  guardianName: string;
  paymentPlan: string;
  seatInfo: string;
  errors: string[];
}

export interface ParseExcelResult {
  validParticipants: RegisterParticipantPayload[];
  rows: ParsedParticipantRow[];
  totalRows: number;
  errorCount: number;
}

/**
 * Parses an uploaded Excel workbook into structured participant payloads.
 */
export async function parseEducationalRosterExcel(file: File): Promise<ParseExcelResult> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No valid worksheet found in the uploaded workbook.');
  }

  const rows: ParsedParticipantRow[] = [];
  const validParticipants: RegisterParticipantPayload[] = [];
  let errorCount = 0;

  // Find header row (usually row 4 if title block is present, or row 1)
  let headerRowIndex = 1;
  worksheet.eachRow((row, rowNumber) => {
    const textFirst = row.getCell(1).text?.trim().toLowerCase();
    if (textFirst.includes('first name') || textFirst.includes('firstname')) {
      headerRowIndex = rowNumber;
    }
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return; // Skip title and header

    const firstName = row.getCell(1).text?.trim() || '';
    const middleName = row.getCell(2).text?.trim() || '';
    const lastName = row.getCell(3).text?.trim() || '';
    const passengerTypeRaw = row.getCell(4).text?.trim().toLowerCase() || '';
    const isAdultPassenger = ['adult', 'companion', 'guardian', 'teacher', 'faculty', 'non_student'].some(k => passengerTypeRaw.includes(k));
    const participantType: 'student' | 'adult' = isAdultPassenger ? 'adult' : 'student';

    const studentNumber = row.getCell(5).text?.trim() || '';
    const gradeLevel = row.getCell(6).text?.trim() || '';
    const section = row.getCell(7).text?.trim() || '';
    const dobRaw = row.getCell(8).text?.trim() || '';
    const studentEmail = row.getCell(9).text?.trim() || '';
    const studentPhone = row.getCell(10).text?.trim() || '';
    const guardianName = row.getCell(11).text?.trim() || '';
    const guardianEmail = row.getCell(12).text?.trim() || '';
    const guardianPhone = row.getCell(13).text?.trim() || '';
    const emergencyName = row.getCell(14).text?.trim() || '';
    const emergencyPhone = row.getCell(15).text?.trim() || '';
    const paymentPlanRaw = row.getCell(16).text?.trim().toLowerCase() || 'full';
    const dietary = row.getCell(17).text?.trim() || '';
    const medical = row.getCell(18).text?.trim() || '';
    const coachSequenceRaw = row.getCell(19).text?.trim() || '';
    const seatNumberRaw = row.getCell(20).text?.trim() || '';

    // Ignore empty blank rows
    if (!firstName && !lastName && !studentNumber && !studentEmail) {
      return;
    }

    const rowErrors: string[] = [];

    if (!firstName) {
      rowErrors.push('First Name is required');
    }
    if (!lastName) {
      rowErrors.push('Last Name is required');
    }

    // Normalize payment plan
    let paymentPlan: 'full' | 'down_payment' | 'installment' = 'full';
    if (paymentPlanRaw.includes('down') || paymentPlanRaw === 'deposit') {
      paymentPlan = 'down_payment';
    } else if (paymentPlanRaw.includes('install') || paymentPlanRaw === 'partial') {
      paymentPlan = 'installment';
    }

    // Parse Date of Birth if provided
    let dateOfBirth: string | undefined = undefined;
    if (dobRaw) {
      const parsedDate = new Date(dobRaw);
      if (!isNaN(parsedDate.getTime())) {
        dateOfBirth = parsedDate.toISOString().slice(0, 10);
      }
    }

    // Parse Bus / Seat allocation
    let allocationMode: 'manual' | 'automatic' = 'automatic';
    let busSequence: number | undefined = undefined;
    let seatNumber: string | undefined = undefined;

    if (coachSequenceRaw || seatNumberRaw) {
      const parsedSeq = parseInt(coachSequenceRaw.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedSeq) && parsedSeq > 0) {
        busSequence = parsedSeq;
      }
      if (seatNumberRaw) {
        const cleanSeat = seatNumberRaw.replace(/^(?:Seat|S)\s*/i, '').trim();
        if (cleanSeat) {
          seatNumber = `Seat ${cleanSeat}`;
          allocationMode = 'manual';
        }
      }
    }

    const payload: RegisterParticipantPayload = {
      participant: {
        first_name: firstName,
        middle_name: middleName || undefined,
        last_name: lastName,
        type: participantType,
        participant_type: participantType,
        student_number: studentNumber || undefined,
        grade_level: gradeLevel || undefined,
        section: section || undefined,
        date_of_birth: dateOfBirth,
        email: studentEmail || undefined,
        phone: studentPhone || undefined,
        dietary_restrictions: dietary || undefined,
        medical_or_accessibility_notes: medical || undefined,
      },
      participant_type: participantType,
      type: participantType,
      guardian: (guardianName || guardianEmail || guardianPhone) ? {
        name: guardianName || undefined,
        email: guardianEmail || undefined,
        phone: guardianPhone || undefined,
      } : undefined,
      emergency_contact: (emergencyName || emergencyPhone) ? {
        name: emergencyName || undefined,
        phone: emergencyPhone || undefined,
      } : undefined,
      payment_plan: paymentPlan,
      allocation_mode: allocationMode,
      bus_sequence: busSequence,
      seat_number: seatNumber,
    };

    if (rowErrors.length > 0) {
      errorCount++;
    } else {
      validParticipants.push(payload);
    }

    rows.push({
      rowNumber,
      payload,
      displayName: `${lastName}, ${firstName} ${middleName}`.trim(),
      studentNumber: participantType === 'adult' ? 'Adult / Companion' : (studentNumber || '—'),
      gradeAndSection: participantType === 'adult' ? 'Non-Student' : ([gradeLevel, section].filter(Boolean).join(' - ') || '—'),
      guardianName: guardianName || emergencyName || '—',
      paymentPlan,
      seatInfo: seatNumber ? `Coach ${busSequence || 1} · ${seatNumber}` : 'Auto-Assign',
      errors: rowErrors,
    });
  });

  return {
    validParticipants,
    rows,
    totalRows: rows.length,
    errorCount,
  };
}

/**
 * Exports the complete participant roster of an Educational Tour package to styled Excel.
 */
export async function exportEducationalRosterToExcel(
  pkg: EducationalTourPackage,
  bookings: EducationalTourParticipantBooking[]
): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JVD Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Participant Roster');

  // Title Header
  worksheet.mergeCells('A1:O1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'JVD TRAVEL & TOURS MANAGEMENT CO. — EDUCATIONAL TOUR ROSTER';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  // Package Information Summary Cards
  worksheet.addRow([]);
  worksheet.addRow(['Tour Code:', pkg.tour_code, '', 'School Name:', pkg.school_name, '', 'Starts At:', pkg.starts_at ? new Date(pkg.starts_at).toLocaleDateString() : 'TBD']);
  worksheet.addRow(['Tour Name:', pkg.name, '', 'Grade Level:', pkg.grade_level || 'N/A', '', 'Ends At:', pkg.ends_at ? new Date(pkg.ends_at).toLocaleDateString() : 'TBD']);
  const studentRateFormatted = `₱${Number(pkg.pricing?.rate_per_head || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const adultRateFormatted = `₱${Number(pkg.pricing?.adult_rate_per_head ?? pkg.pricing?.rate_per_head ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  worksheet.addRow(['Student Rate:', studentRateFormatted, '', 'Adult Rate:', adultRateFormatted, '', 'Total Pax Booked:', bookings.length, '', 'Pickup Location:', pkg.pickup_location || 'N/A']);
  worksheet.addRow([]);

  // Style metadata rows (rows 3 to 5)
  for (let r = 3; r <= 5; r++) {
    const row = worksheet.getRow(r);
    row.font = { size: 10, bold: false };
    [1, 4, 7].forEach((colIdx) => {
      const labelCell = row.getCell(colIdx);
      labelCell.font = { bold: true, color: { argb: '1E3A8A' }, size: 10 };
    });
  }

  // Table Headers
  const tableHeaders = [
    '#',
    'Booking Ref',
    'Type',
    'Invoice #',
    'Participant Name',
    'Student ID',
    'Grade & Section',
    'Date of Birth',
    'Contact Info',
    'Guardian / Emergency',
    'Dietary / Medical',
    'Assigned Coach',
    'Seat Number',
    'Payment Plan',
    'Amount Due (₱)',
    'Paid (₱)',
    'Balance (₱)',
    'Status',
  ];

  const tableHeaderRow = worksheet.addRow(tableHeaders);
  tableHeaderRow.height = 26;
  tableHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  let totalAmountDue = 0;
  let totalAmountPaid = 0;
  let totalBalance = 0;

  // Data rows
  bookings.forEach((booking, idx) => {
    const amountDue = Number(booking.invoice?.total_amount ?? booking.amount_due ?? 0);
    const amountPaid = Number(booking.invoice?.amount_received ?? 0);
    const balance = Number(booking.invoice?.balance ?? (amountDue - amountPaid));

    totalAmountDue += amountDue;
    totalAmountPaid += amountPaid;
    totalBalance += balance;

    const assignedBus = (booking.bus_assignment as any)?.bus?.plate_number
      ? `Coach #${(booking.bus_assignment as any)?.sequence_number || 1} (${(booking.bus_assignment as any).bus.plate_number})`
      : (booking.bus_assignment_id ? `Coach #${booking.bus_assignment_id}` : 'Unassigned');

    const isAdult = ['adult', 'companion', 'guardian', 'teacher'].includes(String(booking.participant_type).toLowerCase());
    const typeLabel = isAdult ? 'Adult / Companion' : 'Student';

    const dataRow = worksheet.addRow([
      idx + 1,
      booking.reference || '—',
      typeLabel,
      booking.invoice?.invoice_number || '—',
      booking.full_name || `${booking.participant_last_name}, ${booking.participant_first_name}`,
      isAdult ? '—' : (booking.student_number || '—'),
      isAdult ? 'Non-Student' : ([booking.grade_level, booking.section].filter(Boolean).join(' - ') || '—'),
      booking.date_of_birth || '—',
      booking.participant_email || booking.participant_phone || '—',
      [booking.guardian_name || booking.emergency_contact_name, booking.guardian_phone || booking.emergency_contact_phone].filter(Boolean).join(' | ') || '—',
      [booking.dietary_restrictions, booking.medical_or_accessibility_notes].filter(Boolean).join('; ') || 'None',
      assignedBus,
      booking.seat_number || 'Unallocated',
      booking.payment_plan ? booking.payment_plan.replace('_', ' ').toUpperCase() : 'FULL',
      amountDue,
      amountPaid,
      balance,
      booking.status ? booking.status.replace('_', ' ').toUpperCase() : 'CONFIRMED',
    ]);

    dataRow.eachCell((cell, colNumber) => {
      cell.font = { size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } },
      };

      // Currency columns
      if ([14, 15, 16].includes(colNumber)) {
        cell.numFmt = '₱#,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else if ([1, 7, 12, 13, 17].includes(colNumber)) {
        cell.alignment = { horizontal: 'center' };
      }
    });

    // Zebra stripe
    if (idx % 2 === 1) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
      });
    }
  });

  // Summary totals row
  const totalsRow = worksheet.addRow([
    'TOTALS',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `${bookings.length} Participants`,
    totalAmountDue,
    totalAmountPaid,
    totalBalance,
    '',
  ]);

  totalsRow.height = 24;
  totalsRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5E7EB' } };
    cell.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    if ([14, 15, 16].includes(colNumber)) {
      cell.numFmt = '₱#,##0.00';
      cell.alignment = { horizontal: 'right' };
    }
  });

  // Adjust column widths
  worksheet.columns.forEach((column, index) => {
    const headerText = tableHeaders[index] || '';
    column.width = Math.max(headerText.length + 3, 14);
  });

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `${(pkg.tour_code || 'JVD-EDT').replace(/[^a-zA-Z0-9-_]/g, '_')}_Participant_Roster.xlsx`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

/**
 * Exports all educational tour packages to a summary Excel workbook.
 */
export async function exportEducationalPackagesListToExcel(
  packages: EducationalTourPackage[]
): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JVD Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Educational Tours Overview');

  // Title Header
  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'JVD TRAVEL & TOURS MANAGEMENT CO. — EDUCATIONAL TOUR PACKAGES SUMMARY';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  worksheet.addRow([]); // Blank row

  const headers = [
    '#',
    'Tour Code',
    'Tour Name',
    'School Name',
    'Grade Level',
    'Travel Date',
    'Rate / Head (₱)',
    'Capacity (Max)',
    'Booked Pax',
    'Gross Billed (₱)',
    'Collected (₱)',
    'Outstanding (₱)',
    'Status',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  packages.forEach((pkg, idx) => {
    const rate = Number(pkg.pricing?.rate_per_head || 0);
    const booked = Number(pkg.capacity?.confirmed || pkg.sales?.booking_count || 0);
    const billed = Number(pkg.sales?.gross_billed || 0);
    const collected = Number(pkg.sales?.collected || 0);
    const outstanding = Number(pkg.sales?.outstanding || 0);

    totalBilled += billed;
    totalCollected += collected;
    totalOutstanding += outstanding;

    const row = worksheet.addRow([
      idx + 1,
      pkg.tour_code || '—',
      pkg.name || '—',
      pkg.school_name || '—',
      pkg.grade_level || '—',
      pkg.starts_at ? new Date(pkg.starts_at).toLocaleDateString() : 'TBD',
      rate,
      pkg.capacity?.maximum || 0,
      booked,
      billed,
      collected,
      outstanding,
      pkg.status ? pkg.status.toUpperCase() : 'PUBLISHED',
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = { size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } },
      };

      if ([7, 10, 11, 12].includes(colNumber)) {
        cell.numFmt = '₱#,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else if ([1, 6, 8, 9, 13].includes(colNumber)) {
        cell.alignment = { horizontal: 'center' };
      }
    });

    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
      });
    }
  });

  // Totals summary
  const totalsRow = worksheet.addRow([
    'TOTALS',
    '',
    '',
    '',
    '',
    `${packages.length} Tours`,
    '',
    '',
    '',
    totalBilled,
    totalCollected,
    totalOutstanding,
    '',
  ]);

  totalsRow.height = 24;
  totalsRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5E7EB' } };
    cell.border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    if ([10, 11, 12].includes(colNumber)) {
      cell.numFmt = '₱#,##0.00';
      cell.alignment = { horizontal: 'right' };
    }
  });

  worksheet.columns.forEach((column, index) => {
    const headerText = headers[index] || '';
    column.width = Math.max(headerText.length + 3, 15);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `JVD_Educational_Tours_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}
