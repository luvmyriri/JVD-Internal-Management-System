const fs = require('fs');

const path = 'c:/Users/Val/Desktop/JVD-Internal-Management-System/frontend/src/components/layout/Header.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace react-icons/lu with lucide-react
content = content.replace(/from 'react-icons\/lu'/g, "from 'lucide-react'");
// Remove 'Lu' prefix from all icons
const iconRegex = /Lu([A-Z][a-zA-Z0-9]*)/g;
content = content.replace(iconRegex, (match, p1) => {
  return p1;
});

// 2. Replace Header background logic
// <header className={`h-16 border-b flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 md:left-64 z-40 transition-colors ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
const headerStart = /<header className=\{\`h-16 border-b flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 md:left-64 z-40 transition-colors \$\{[\s\S]*?\}\`\}>/;
content = content.replace(headerStart, "<header className=\"h-16 border-b border-border flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 md:left-64 z-40 transition-colors bg-surface\">");

// Optional: do some basic color replacements for the top-level items so it matches the theme.
content = content.replace(/bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800/g, "bg-surface border border-border");
content = content.replace(/bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/g, "bg-surface border border-border");
content = content.replace(/text-gray-900 dark:text-white/g, "text-ink");
content = content.replace(/text-gray-500 dark:text-gray-400/g, "text-muted");
content = content.replace(/text-gray-600 dark:text-gray-300/g, "text-muted");

fs.writeFileSync(path, content);
console.log('Header.tsx refactored');
