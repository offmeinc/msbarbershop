const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // The previous regex /(hover:|focus:|active:|disabled:|group-hover:) /g indiscriminately replaced things outside of strings!
      // Here are some common javascript object fields that got replaced with ' ':
      // active: true
      // active: false
      // disabled: true
      // disabled: false
      // We can safely try to fix the obvious ones.
      
      content = content.replace(/^(\s+) true(,?)$/gm, '$1active: true$2');
      content = content.replace(/^(\s+) false(,?)$/gm, '$1active: false$2');
      // Wait, could be disabled: true? Yes, but active: is more common for objects. Let's see if disabled: got hit.
      // We can check if it makes sense contextually, but mostly 'active: true|false' is what was in Firebase data structures here.

      // Is there any other object property? 
      // focus: ? group-hover: ? hover: ? Unlikely inside JS objects, but 'active' and 'disabled' are very common.

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed objects in ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
