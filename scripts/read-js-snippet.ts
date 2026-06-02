import fs from "fs";

const filePath = "./dist/assets/BookingScreen-Bt_tlf_I.js";
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, "utf8");
  console.log("Characters 16000 to 21000:");
  console.log(content.slice(16000, 21000));
} else {
  console.log("File not found");
}
