import 'dotenv/config';
import { adminMessaging } from './src/server/firebaseAdmin';

async function test() {
  console.log("Checking FIREBASE_SERVICE_ACCOUNT: ", !!process.env.FIREBASE_SERVICE_ACCOUNT);
  try {
    await adminMessaging.send({
      token: "dummy-token-to-test-auth",
      notification: { title: "Test" }
    });
  } catch (e: any) {
    console.error("Error from FCM:", e.code, e.message);
  }
}
test();
