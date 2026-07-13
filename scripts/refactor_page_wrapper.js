const fs = require('fs');

const path = 'c:/Users/Val/Desktop/JVD-Internal-Management-System/frontend/src/components/layout/PageWrapper.tsx';
let content = fs.readFileSync(path, 'utf8');

// Imports
content = content.replace(
  "import { Outlet, NavLink, useLocation } from 'react-router-dom';",
  "import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';"
);
content = content.replace(
  "import { useAuth } from '../../context/AuthContext';",
  "import { useAuth } from '../../context/AuthContext';\nimport { CommandPalette, useCommandPalette, type Command } from '../ds';"
);

// Body
content = content.replace(
  "const [isSidebarOpen, setIsSidebarOpen] = useState(false);",
  "const [isSidebarOpen, setIsSidebarOpen] = useState(false);\n  const navigate = useNavigate();\n  const [paletteOpen, openPalette, closePalette] = useCommandPalette();"
);

// Navigation commands
const commandsLogic = `
  // Filter navigation sections based on permission & role (mirroring Sidebar logic)
`;
const newCommandsLogic = `
  // Filter navigation sections based on permission & role (mirroring Sidebar logic)
`;
// I will just put commands after filteredNavigation so it has access to it.
const afterFilteredNav = `    : [];`;
const replaceAfterFilteredNav = `    : [];

  const commands: Command[] = filteredNavigation.flatMap(section => 
    section.items.map(item => ({
      id: \`nav-\${item.path}\`,
      group: 'Navigation',
      label: \`Go to \${item.label}\`,
      icon: item.icon as any,
      onSelect: () => {
        navigate(item.path);
        closePalette();
      }
    }))
  );`;

content = content.replace(afterFilteredNav, replaceAfterFilteredNav);

// Render
content = content.replace(
  "className={`h-screen overflow-hidden transition-colors duration-300 ${\n      theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'\n    }`}",
  "className=\"jvd h-screen overflow-hidden transition-colors duration-300 bg-bg text-ink\""
);

content = content.replace(
  "<Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />",
  "<CommandPalette isOpen={paletteOpen} onClose={closePalette} commands={commands} />\n      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />"
);

// Mobile Nav tokens
content = content.replace(
  "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800",
  "bg-surface border-t border-border"
);

fs.writeFileSync(path, content);
console.log('PageWrapper.tsx refactored');
