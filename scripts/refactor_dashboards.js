const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'dashboards');

const replacements = [
  // Backgrounds
  { regex: /bg-white dark:bg-gray-900/g, replacement: 'bg-surface' },
  { regex: /bg-gray-50 dark:bg-gray-800/g, replacement: 'bg-surface-elevated' },
  { regex: /bg-gray-50\/50 dark:bg-gray-800\/40/g, replacement: 'bg-surface-elevated' },
  { regex: /bg-gray-100 dark:bg-gray-800/g, replacement: 'bg-surface-elevated' },
  { regex: /hover:bg-gray-50 dark:hover:bg-gray-800/g, replacement: 'hover:bg-surface-elevated' },
  // Borders
  { regex: /border-gray-100 dark:border-gray-800/g, replacement: 'border-border' },
  { regex: /border-gray-50 dark:border-gray-800/g, replacement: 'border-border' },
  { regex: /border-gray-100\/50 dark:border-gray-800\/50/g, replacement: 'border-border' },
  { regex: /border-gray-200 dark:border-gray-700/g, replacement: 'border-border' },
  // Text
  { regex: /text-gray-900 dark:text-white/g, replacement: 'text-ink' },
  { regex: /text-gray-950 dark:text-white/g, replacement: 'text-ink' },
  { regex: /text-gray-800 dark:text-gray-100/g, replacement: 'text-ink' },
  { regex: /text-gray-500 dark:text-gray-400/g, replacement: 'text-muted' },
  { regex: /text-gray-400 dark:text-gray-500/g, replacement: 'text-muted' },
  { regex: /text-gray-600 dark:text-gray-300/g, replacement: 'text-muted' },
  { regex: /text-gray-400/g, replacement: 'text-muted' },
];

const files = fs.readdirSync(dir).filter(f => f.endsWith('Dashboard.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
