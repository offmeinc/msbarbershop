const fs = require('fs');
let code = fs.readFileSync('src/server/pushNotificationService.ts', 'utf8');

const oldCheck = `          if (status === "confirmed" && clientTarget) {
            await sendPushNotification(clientTarget, {`;

const newCheck = `          if (status === "confirmed" && clientTarget && !data.confirmationPushSent) {
            // Mark it so we don't send duplicate confirmation pushes
            try {
               const { updateDoc, doc } = require("firebase/firestore");
               await updateDoc(doc(db, "appointments", docId), { confirmationPushSent: true });
            } catch (e) {}

            await sendPushNotification(clientTarget, {`;

code = code.replace(oldCheck, newCheck);
fs.writeFileSync('src/server/pushNotificationService.ts', code);
console.log('Fixed confirmed spam check');
