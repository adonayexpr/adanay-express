
// Direct Firebase Imports
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

// La configuración de Firebase ahora lee la API key directamente desde las variables de entorno.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "gestor-de-pedidos-o4yes.firebaseapp.com",
  projectId: "gestor-de-pedidos-o4yes",
  storageBucket: "gestor-de-pedidos-o4yes.appspot.com",
  messagingSenderId: "7472541418",
  appId: "1:7472541418:web:7dcfc8b25489aaa5563193"
};

// Advertencia si la clave no está presente.
if (!firebaseConfig.apiKey) {
    console.error("CRITICAL ERROR: Firebase API Key is not configured in .env. Firebase connection will fail.");
}

// Initialize Firebase for SSR and client-side, guaranteeing a single instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore with default settings for robust persistence.
export const db = getFirestore(app);
