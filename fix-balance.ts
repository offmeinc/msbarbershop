import { db } from "./src/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

async function run() {
  const usersRef = collection(db, "users");
  const snap = await getDocs(usersRef);
  let found: any = null;
  snap.forEach(d => {
    const data = d.data();
    if (data.name && data.name.toLowerCase().includes("rulio")) {
      found = { id: d.id, ...data };
    }
  });
  
  if (found) {
    if (found.walletBalance === 0.02) {
      await updateDoc(doc(db, "users", found.id), {
         walletBalance: 0.01
      });
      console.log(`Updated wallet to 0.01`);
    } else {
       console.log("Balance is not 0.02", found.walletBalance);
    }
  }
  process.exit(0);
}
run();
