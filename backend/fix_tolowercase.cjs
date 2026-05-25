const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let updated = content.replace(/(\w+\.\w+)\.toLowerCase\(\)/g, '$1?.toLowerCase()');
      updated = updated.replace(/(\w+\.\w+\?\.\w+)\.toLowerCase\(\)/g, '$1?.toLowerCase()');
      
      if (updated !== content) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, '..', 'frontend', 'src', 'pages'));
