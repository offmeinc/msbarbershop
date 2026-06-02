import fs from "fs";
import path from "path";

function searchDir(dir: string) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      // Skip node_modules and known systemic paths to save time
      if (file === "node_modules" || file === "dist" || file === "proc" || file === "sys" || file === "dev") {
        continue;
      }
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          searchDir(fullPath);
        } else if (file === "BookingScreen.tsx") {
          console.log("FOUND original BookingScreen.tsx here:", fullPath, stat.size, "bytes");
        } else if (file === "server.ts") {
          console.log("FOUND server.ts here:", fullPath, stat.size, "bytes");
        }
      } catch (err) {}
    }
  } catch (err) {}
}

console.log("Searching disk...");
// search / app root first
searchDir(process.cwd());
console.log("Done checking workspace.");
// search other parent paths
searchDir("/opt");
searchDir("/home");
searchDir("/var");
searchDir("/tmp");
console.log("Disk search complete.");
