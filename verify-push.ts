import axios from 'axios';
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
async function test() {
  const resp = await axios.get('http://localhost:3000/api/push-config');
  console.log(resp.data);
  const arr = urlBase64ToUint8Array(resp.data.publicKey);
  console.log(arr.length);
}
test();
