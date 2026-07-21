const fs = require('fs');

const reportsPath = 'c:/Users/Val/Desktop/JVD-Internal-Management-System/frontend/src/pages/accounting/Reports.tsx';
let content = fs.readFileSync(reportsPath, 'utf8');

if (!content.includes("import { EmployeeName } from '../../components/ds'")) {
  content = content.replace(
    "import { useAuth } from '../../context/AuthContext';",
    "import { useAuth } from '../../context/AuthContext';\nimport { EmployeeName } from '../../components/ds';"
  );
}

// 1. Line 595-601: Table Avatar
const tableRegex = /<div className="flex items-center gap-2">\s*<img src=\{getAvatarUrl\(txn\.agentName, txn\.agentEmail\)\} alt=\{txn\.agentName\} className="w-5\.5 h-5\.5 rounded-full border border-gray-100 dark:border-gray-700\/50 object-cover shadow-sm group-hover:scale-105 transition-transform" \/>\s*<div className="leading-tight">\s*<p className="text-\[10px\] font-bold text-gray-800 dark:text-gray-200">\{txn\.agentName\}<\/p>\s*<p className="text-\[7\.5px\] text-gray-400 tracking-wider">\{txn\.agentEmail\}<\/p>\s*<\/div>\s*<\/div>/g;
content = content.replace(tableRegex, '<EmployeeName name={txn.agentName} subtitle={txn.agentEmail} size="xs" />');

// 2. Line 652-658: Mobile Card
const mobileRegex = /<div className="flex items-center gap-2 mt-1 overflow-hidden">\s*<img src=\{getAvatarUrl\(txn\.agentName, txn\.agentEmail\)\} alt=\{txn\.agentName\} className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 object-cover shrink-0" \/>\s*<div className="overflow-hidden">\s*<p className="text-\[11px\] font-bold text-gray-900 dark:text-white leading-tight truncate">\{txn\.agentName\}<\/p>\s*<p className="text-\[9px\] text-gray-500 truncate">\{txn\.serviceType\}<\/p>\s*<\/div>\s*<\/div>/g;
content = content.replace(mobileRegex, '<EmployeeName name={txn.agentName} subtitle={txn.serviceType} size="xs" />');

// 3. Line 736-744: Agent Performance List
const agentPerfRegex = /<div className="flex items-center gap-3">\s*<img\s*src=\{getAvatarUrl\(agent\.name, agent\.email\)\}\s*alt=\{agent\.name\}\s*className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shrink-0"\s*\/>\s*<div>\s*<p className="text-\[11px\] font-bold text-gray-900 dark:text-white leading-tight">\{agent\.name\}<\/p>\s*<p className="text-\[9px\] text-gray-500 dark:text-gray-400 mt-0\.5">\{agent\.email\}<\/p>\s*<\/div>\s*<\/div>/g;
content = content.replace(agentPerfRegex, '<EmployeeName name={agent.name} subtitle={agent.email} size="lg" />');

// 4. Line 821-829: Selected Txn Details
const selectedTxnRegex = /<div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800\/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">\s*<img\s*src=\{getAvatarUrl\(selectedTxn\.agentName, selectedTxn\.agentEmail\)\}\s*alt=\{selectedTxn\.agentName\}\s*className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover"\s*\/>\s*<div>\s*<p className="text-\[12px\] font-bold text-gray-900 dark:text-white leading-tight">\{selectedTxn\.agentName\}<\/p>\s*<p className="text-\[10px\] text-gray-500 mt-0\.5">\{selectedTxn\.agentEmail\}<\/p>\s*<\/div>\s*<\/div>/g;
content = content.replace(selectedTxnRegex, '<div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700"><EmployeeName name={selectedTxn.agentName} subtitle={selectedTxn.agentEmail} size="lg" /></div>');

fs.writeFileSync(reportsPath, content);
console.log('Reports.tsx refactored');
