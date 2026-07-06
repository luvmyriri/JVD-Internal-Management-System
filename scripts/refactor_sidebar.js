const fs = require('fs');

const path = 'c:/Users/Val/Desktop/JVD-Internal-Management-System/frontend/src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace react-icons/lu with lucide-react
content = content.replace(/from 'react-icons\/lu'/g, "from 'lucide-react'");
// Remove 'Lu' prefix from all icons
const iconRegex = /Lu([A-Z][a-zA-Z0-9]*)/g;
content = content.replace(iconRegex, (match, p1) => {
  return p1;
});
// Ensure Search is imported
if (!content.includes('Search,')) {
  content = content.replace("import {\n", "import {\n  Search,\n");
}

// 2. Replace Sidebar background
content = content.replace(
  /bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800/g,
  "bg-surface-muted border-r border-border"
);

// 3. Replace NavLink active styles
content = content.replace(
  /className=\{\(\{ isActive \}\) =>\s*`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden \$\{\s*isActive\s*\?\s*'bg-blue-50 text-blue-700 dark:bg-blue-500\/10 dark:text-blue-400 font-bold'\s*:\s*'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'\s*\}`\s*\}/g,
  "className={({ isActive }) =>\n      `flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-control)] text-sm font-medium transition-colors duration-200 group relative ${isActive ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted hover:text-ink'}`\n    }"
);

// 4. Update section titles
content = content.replace(
  /className="px-3 mb-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"/g,
  "className=\"px-3 mb-2 text-xs font-bold text-muted uppercase tracking-widest\""
);

// 5. Update workspace block / Brand to add Quick Actions ⌘K
// I'll use simple string replace
const workspaceBlock = `{/* Workspace block / Brand */}
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 shrink-0">
            JVD
          </div>
          <div className="overflow-hidden">
            <h1 className="font-black text-gray-900 dark:text-white leading-tight truncate">{systemName}</h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-wider uppercase">Internal System</p>
          </div>
        </div>`;

const newWorkspaceBlock = `{/* Workspace block / Brand */}
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 shrink-0">
            JVD
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-ink leading-tight truncate">{systemName}</h1>
            <p className="text-[10px] text-muted font-bold tracking-wider uppercase">Internal System</p>
          </div>
        </div>

        {/* Quick actions ⌘K row */}
        <div className="px-5 mb-4">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--radius-control)] text-sm font-medium text-muted hover:text-ink transition-colors group border border-border/50 bg-bg/50 hover:bg-surface shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Quick actions</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-surface border border-border rounded text-muted">
              ⌘K
            </kbd>
          </button>
        </div>`;

content = content.replace(workspaceBlock, newWorkspaceBlock);

fs.writeFileSync(path, content);
console.log('Sidebar.tsx refactored');
