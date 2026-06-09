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

      // Fix dangling pseudo-classes like 'hover: ' -> ' '
      content = content.replace(/(hover:|focus:|active:|disabled:|group-hover:) /g, ' ');

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Cleaned up pseudo-classes in ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));


