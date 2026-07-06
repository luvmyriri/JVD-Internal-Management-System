/**
 * Lazy loaders for the heavy PDF/Excel export libraries (roadmap 3.4).
 *
 * jspdf (+ jspdf-autotable, which pulls html2canvas) and exceljs are ~150 KB gzipped
 * combined. They were statically imported at the top of ~13 pages/dashboards, so with
 * route-level code splitting they loaded with each of those page chunks on *view* — even
 * though they're only needed when the user clicks Export. These helpers defer the import to
 * export time via dynamic import(), and the module cache means the second export is instant.
 *
 * Usage inside an async export handler:
 *   const { jsPDF, autoTable } = await loadJsPDF();
 *   const ExcelJS = await loadExcelJS();  // or inline: new (await loadExcelJS()).Workbook()
 */

/** jsPDF constructor + the autoTable plugin function, loaded on demand. */
export async function loadJsPDF() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

/** The ExcelJS module (has `.Workbook`), loaded on demand. */
export async function loadExcelJS() {
  return (await import('exceljs')).default;
}
