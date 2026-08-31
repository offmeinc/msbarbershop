const fs = require('fs');
let code = fs.readFileSync('src/server/pushNotificationService.ts', 'utf8');

const oldCheck = `          } else if (status === "cancelled") {
            if (clientTarget) {`;

const newCheck = `          } else if (status === "cancelled" && !data.cancellationPushSent) {
            try {
               const { updateDoc, doc } = require("firebase/firestore");
               await updateDoc(doc(db, "appointments", docId), { cancellationPushSent: true });
            } catch (e) {}
            if (clientTarget) {`;

code = code.replace(oldCheck, newCheck);
fs.writeFileSync('src/server/pushNotificationService.ts', code);
console.log('Fixed cancelled spam check');
