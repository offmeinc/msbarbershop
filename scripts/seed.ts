import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedServices = async () => {
  const servicesCollection = collection(db, "services");
  const snapshot = await getDocs(servicesCollection);
  
  if (snapshot.empty) {
    const defaultServices = [
      { name: "Corte na Tesoura", price: 60, duration: 45, active: true },
      { name: "Degradê Moderno", price: 50, duration: 40, active: true },
      { name: "Barba e Toalha Quente", price: 40, duration: 30, active: true },
      { name: "Combo (Corte + Barba)", price: 80, duration: 75, active: true },
      { name: "Corte Infantil", price: 45, duration: 30, active: true },
      { name: "Sobrancelha (Navalha)", price: 15, duration: 10, active: true },
      { name: "Pigmentação de Barba", price: 20, duration: 15, active: true },
    ];
    
    console.log("Seeding services...");
    for (const service of defaultServices) {
      await addDoc(servicesCollection, service);
    }
    console.log("Services seeded successfully.");
  } else {
    console.log("Services already exist. Skipping seed.");
  }
};

seedServices().catch(console.error);
