const fs = require('fs');

const files = [
  'src/pages/procurement/Overview.tsx',
  'src/pages/Profile.tsx',
];

const rules = [
  [/\bbg-white\b(?!\s+dark:bg)/g, 'bg-white dark:bg-gray-900'],
  [/\bbg-gray-50(?!\/|[\w-])(?![^"]*dark:bg)/g, 'bg-gray-50 dark:bg-gray-800/60'],
  [/\bborder-gray-100\b(?![^"]*dark:border)/g, 'border-gray-100 dark:border-gray-800'],
  [/\bborder-gray-200\b(?![^"]*dark:border)/g, 'border-gray-200 dark:border-gray-700'],
  [/\btext-gray-900\b(?![^"]*dark:text)/g, 'text-gray-900 dark:text-white'],
  [/\btext-gray-700\b(?![^"]*dark:text)/g, 'text-gray-700 dark:text-gray-200'],
  [/\btext-gray-600\b(?![^"]*dark:text)/g, 'text-gray-600 dark:text-gray-300'],
  [/\btext-gray-500\b(?![^"]*dark:text)/g, 'text-gray-500 dark:text-gray-400'],
  [/\bdivide-gray-100\b(?![^"]*dark:divide)/g, 'divide-gray-100 dark:divide-gray-800'],
  [/\bhover:bg-gray-50\b(?![^"]*dark:hover:bg)/g, 'hover:bg-gray-50 dark:hover:bg-gray-800'],
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) { console.log('MISSING: ' + filePath); return; }
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  content = content.replace(/className="([^"]+)"/g, (match, cls) => {
    let updated = cls;
    rules.forEach(([re, rep]) => { updated = updated.replace(re, rep); });
    updated = updated.replace(/\bbg-white dark:bg-gray-900\b((?:\s+[\w[\]/:.,-]+)*\s+(?:rounded-(?:xl|2xl|3xl|full|lg)))/g, 'bg-white dark:bg-gray-800$1');
    return 'className="' + updated + '"';
  });
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated: ' + filePath);
  } else {
    console.log('No changes: ' + filePath);
  }
});
