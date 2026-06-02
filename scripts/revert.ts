import { execSync } from "child_process";

try {
  console.log("Reverting files through git...");
  execSync("git checkout -- server.ts src/components/client/BookingScreen.tsx src/components/client/ClientDashboardScreen.tsx");
  console.log("Revert complete!");
} catch (e: any) {
  console.error("Revert failed:", e.message || e);
}
