const fs = require('fs');
let code = fs.readFileSync('src/server/pushNotificationService.ts', 'utf8');

const oldMessageBlock = `      const message: Message = {
        token: token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          url: ensureProductionUrl(payload.url || "/"),
        },
        webpush: {
          fcmOptions: {
            link: ensureProductionUrl(payload.url || "/"),
          }
        }
      };`;

const newMessageBlock = `      const message: Message = {
        token: token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          title: payload.title,
          body: payload.body,
          url: ensureProductionUrl(payload.url || "/"),
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: "https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg",
            badge: "https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg",
            vibrate: [200, 100, 200]
          },
          fcmOptions: {
            link: ensureProductionUrl(payload.url || "/"),
          }
        }
      };`;

code = code.replace(oldMessageBlock, newMessageBlock);
fs.writeFileSync('src/server/pushNotificationService.ts', code);
console.log('Fixed push notification payload structure');
