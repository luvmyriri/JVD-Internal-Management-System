const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'dashboards');

const files = fs.readdirSync(dir).filter(f => f.endsWith('Dashboard.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/\(item, idx\)/g, '(item: any, idx: number)');
  content = content.replace(/\(agent\)/g, '(agent: any)');
  content = content.replace(/\(item\)/g, '(item: any)');
  content = content.replace(/\(row, idx\)/g, '(row: any, idx: number)');
  content = content.replace(/\(row\)/g, '(row: any)');
  
  // also handle `agent =>` -> `(agent: any) =>`
  content = content.replace(/ agent =>/g, ' (agent: any) =>');
  content = content.replace(/ item =>/g, ' (item: any) =>');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated types in ${file}`);
});
