import { db } from "./firebase";
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  collection, 
  Timestamp, 
  getFirestore 
} from "firebase/firestore";
import { toast } from "../components/ui/Toast";

export interface OfflineAction {
  id: string;
  type: 'update_status' | 'delete_appointment' | 'create_appointment';
  payload: {
    appointmentId?: string;
    newStatus?: string;
    extraData?: any;
    appointmentData?: any;
    notifications?: any[];
  };
  timestamp: number;
  description: string;
}

// Helper to deep sanitize objects from circular references and non-serializable elements before storing
function deepSanitize(obj: any, visited = new WeakSet<any>()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (visited.has(obj)) {
    return undefined; // Drop circular references safely
  }
  
  // Handle Dates
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Handle Firestore Timestamps
  if (obj.constructor && (obj.constructor.name === 'Timestamp' || (obj.seconds !== undefined && obj.nanoseconds !== undefined))) {
    return { seconds: obj.seconds, nanoseconds: obj.nanoseconds };
  }
  
  // Exclude DOM elements and React components if any got leaked
  if (typeof window !== "undefined" && (obj instanceof Node || (obj.$$typeof && typeof obj.$$typeof === 'symbol'))) {
    return undefined;
  }
  
  // Prevent traversing complex class instances (e.g., Firestore reference/SDK objects like 'Y2' or 'Ka')
  // We only want to traverse plain objects and arrays.
  let isPlain = false;
  const isArray = Array.isArray(obj);
  try {
    const proto = Object.getPrototypeOf(obj);
    isPlain = proto === Object.prototype || proto === null || isArray;
    
    // Explicitly check for suspicious internal minified names from stack trace
    if (obj.constructor && obj.constructor.name) {
      const name = obj.constructor.name;
      if (name === 'Y2' || name === 'Ka' || name.startsWith('Firestore') || name === 'FirebaseAppImpl') {
        isPlain = false;
      }
    }
  } catch (e) {
    // If getting prototype fails, assume it's complex and unsafe to traverse
  }
  
  if (!isPlain) {
    return undefined;
  }
  
  visited.add(obj);
  
  if (isArray) {
    const res = obj.map(item => deepSanitize(item, visited)).filter(val => val !== undefined);
    return res;
  }
  
  const sanitizedObj: any = {};
  for (const key of Object.keys(obj)) {
    try {
      const sanitizedVal = deepSanitize(obj[key], visited);
      if (sanitizedVal !== undefined) {
        sanitizedObj[key] = sanitizedVal;
      }
    } catch (e) {
      // Ignore keys that cannot be structuralized
    }
  }
  return sanitizedObj;
}

const STORAGE_KEY = "ms_barber_offline_actions_queue";

// Helper to get queue
export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Helper to save queue
export function saveOfflineQueue(queue: OfflineAction[]) {
  if (typeof window === "undefined") return;
  const sanitized = deepSanitize(queue);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  // Dispatch a custom event so UI components can subscribe & update immediately
  window.dispatchEvent(new CustomEvent("ms-offline-queue-changed", { detail: sanitized }));
}

// Register a pending action offline
export function addToOfflineQueue(
  type: OfflineAction['type'], 
  payload: any, 
  description: string
) {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: Date.now(),
    description,
  };
  queue.push(newAction);
  saveOfflineQueue(queue);
  
  toast.info(`Offline: "${description}" registrado. Será sincronizado ao obter conexão! 📶`);
}

// Remove an action
export function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue();
  const filtered = queue.filter(a => a.id !== id);
  saveOfflineQueue(filtered);
}

// Sync execution lock
let isSyncing = false;

// Process and upload queued actions to Firestore
export async function syncOfflineQueue() {
  if (isSyncing) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return; // Don't run if still physically offline
  }

  isSyncing = true;
  toast.info(`Restabelecido! Sincronizando ${queue.length} atualizações com a nuvem... 🔄`);

  const firestore = db || getFirestore();
  const failedActions: OfflineAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === 'update_status') {
        const { appointmentId, newStatus, extraData, notifications } = action.payload;
        if (appointmentId) {
          const appRef = doc(firestore, "appointments", appointmentId);
          await updateDoc(appRef, {
            status: newStatus,
            ...extraData,
            syncedAt: Timestamp.now()
          });

          // Add notifications if any
          if (notifications && notifications.length > 0) {
            for (const notif of notifications) {
              const { collectionName, ...notifData } = notif;
              const collRef = collection(firestore, collectionName || "notifications");
              // Convert placeholder string clientTimestamp or standard to proper timestamp
              notifData.timestamp = Timestamp.now();
              await addDoc(collRef, notifData);
            }
          }
        }
      } else if (action.type === 'delete_appointment') {
        const { appointmentId } = action.payload;
        if (appointmentId) {
          await deleteDoc(doc(firestore, "appointments", appointmentId));
        }
      } else if (action.type === 'create_appointment') {
        const { appointmentData } = action.payload;
        if (appointmentData) {
          await addDoc(collection(firestore, "appointments"), {
            ...appointmentData,
            syncedAt: Timestamp.now()
          });
        }
      }
      
      console.log(`Action ${action.id} synced successfully!`);
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error);
      failedActions.push(action);
    }
  }

  saveOfflineQueue(failedActions);
  isSyncing = false;

  if (failedActions.length === 0) {
    toast.success("Sincronização offline concluída com sucesso! Agenda atualizada. ✨");
  } else {
    toast.error(`Falha ao sincronizar ${failedActions.length} atualizações. Tentaremos mais tarde.`);
  }
}

// Automatically listen to reconnection
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Wait slightly for DNS/Sockets to connect fully
    setTimeout(() => {
      syncOfflineQueue();
    }, 1500);
  });
}
