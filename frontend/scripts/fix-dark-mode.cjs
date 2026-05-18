
const fs = require('fs');
const path = require('path');

const files = [
  // HR
  'src/pages/hr/Employees.tsx',
  'src/pages/hr/ActivityLogs.tsx',
  // Travel
  'src/pages/travel/Customers.tsx',
  'src/pages/travel/Documents.tsx',
  'src/pages/travel/Passporting.tsx',
  'src/pages/travel/VisaProcessing.tsx',
  // Admin
  'src/pages/admin/AuditLogs.tsx',
  'src/pages/admin/Settings.tsx',
  'src/pages/admin/Users.tsx',
  // Accounting (remaining fixes)
  'src/pages/accounting/Reports.tsx',
  // Dashboard
  'src/pages/Dashboard.tsx',
  // POS
  'src/pages/accounting/POS.tsx',
];

const rules = [
  // ── bg-white with border-gray-100 ───────────────────────────
  [/\bbg-white\b(?!\s+dark:bg)/g, 'bg-white dark:bg-gray-900'],

  // ── Search bar / input panels ───────────────────────────────
  // Fix over-aggressive gray-900 on inputs to gray-800
  [/\bbg-white dark:bg-gray-900\b((?:[^"]*?))\s+(?:rounded-2xl|rounded-xl|rounded-lg)\b((?:[^"]*?))\s+(?:border|focus:)/g,
   (m, a, b) => m.replace('dark:bg-gray-900', 'dark:bg-gray-800')],

  // ── bg-gray-50 (table headers, row highlights) ──────────────
  [/\bbg-gray-50(?!\/|[\w-])(?![^"]*dark:bg)/g, 'bg-gray-50 dark:bg-gray-800/60'],

  // ── bg-gray-100 (subtle fills) ──────────────────────────────
  [/\bbg-gray-100\b(?![^"]*dark:bg)/g, 'bg-gray-100 dark:bg-gray-800'],

  // ── Borders ─────────────────────────────────────────────────
  [/\bborder-gray-100\b(?![^"]*dark:border)/g, 'border-gray-100 dark:border-gray-800'],
  [/\bborder-gray-200\b(?![^"]*dark:border)/g, 'border-gray-200 dark:border-gray-700'],

  // ── Text ────────────────────────────────────────────────────
  [/\btext-gray-900\b(?![^"]*dark:text)/g,  'text-gray-900 dark:text-white'],
  [/\btext-gray-800\b(?![^"]*dark:text)/g,  'text-gray-800 dark:text-gray-100'],
  [/\btext-gray-700\b(?![^"]*dark:text)/g,  'text-gray-700 dark:text-gray-200'],
  [/\btext-gray-600\b(?![^"]*dark:text)/g,  'text-gray-600 dark:text-gray-300'],
  [/\btext-gray-500\b(?![^"]*dark:text)/g,  'text-gray-500 dark:text-gray-400'],

  // ── Divide lines ─────────────────────────────────────────────
  [/\bdivide-gray-100\b(?![^"]*dark:divide)/g, 'divide-gray-100 dark:divide-gray-800'],
  [/\bdivide-gray-50\b(?![^"]*dark:divide)/g,  'divide-gray-50 dark:divide-gray-800'],
  [/\bdivide-gray-200\b(?![^"]*dark:divide)/g, 'divide-gray-200 dark:divide-gray-700'],

  // ── Hover rows ───────────────────────────────────────────────
  [/\bhover:bg-gray-50\b(?![^"]*dark:hover:bg)/g,       'hover:bg-gray-50 dark:hover:bg-gray-800'],
  [/\bhover:bg-gray-100\b(?![^"]*dark:hover:bg)/g,      'hover:bg-gray-100 dark:hover:bg-gray-800'],
  [/\bgroup-hover:bg-gray-50\b(?![^"]*dark:group-hover)/g, 'group-hover:bg-gray-50 dark:group-hover:bg-gray-800'],

  // ── Ring / shadow colors ─────────────────────────────────────
  [/\bfocus-within:ring-blue-600\/10\b/g, 'focus-within:ring-blue-600/10 dark:focus-within:ring-blue-400/10'],
];

let totalFiles = 0;

files.forEach(filePath => {
  const absPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) { console.log(`MISSING: ${filePath}`); return; }

  let content = fs.readFileSync(absPath, 'utf8');
  const original = content;

  // Only operate inside JSX className strings
  content = content.replace(/className="([^"]+)"/g, (match, cls) => {
    let updated = cls;
    rules.forEach(([re, rep]) => {
      if (typeof rep === 'string') {
        updated = updated.replace(re, rep);
      } else {
        updated = updated.replace(re, rep);
      }
    });
    // Post-process: inputs/selects with rounded-* should use gray-800 not gray-900
    updated = updated.replace(
      /\bbg-white dark:bg-gray-900\b((?:\s+[\w[\]/:.-]+)*?\s+(?:rounded-(?:xl|2xl|3xl|full|lg)))/g,
      'bg-white dark:bg-gray-800$1'
    );
    // Search wrapper bars should be gray-800
    updated = updated.replace(
      /\bbg-white dark:bg-gray-900\b((?:\s+[\w[\]/:.-]+)*?\s+p-2(?:\.5)?(?:\s|"))/g,
      'bg-white dark:bg-gray-800$1'
    );
    return `className="${updated}"`;
  });

  if (content !== original) {
    fs.writeFileSync(absPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    totalFiles++;
  } else {
    console.log(`— No changes: ${filePath}`);
  }
});

console.log(`\nDone! ${totalFiles} file(s) updated.`);
