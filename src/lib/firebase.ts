import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

async function testConnection() {
  try {
    // Attempt to fetch a non-existent document to trigger a server round-trip
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firebase Connection: OK");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase Error: The client is offline. Please check your Firebase configuration or network.");
    } else {
      console.warn("Firebase Connection Test Note:", error instanceof Error ? error.message : "Unknown state");
    }
  }
}

testConnection();

export default app;
