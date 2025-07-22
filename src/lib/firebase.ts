// Direct Firebase Imports
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

// La configuración de Firebase ahora lee la API key directamente desde aquí.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCf18x_pyokVl4eCdnuOb3hVbWCUIb9liE",
  authDomain: "gestor-de-pedidos-6d470.firebaseapp.com",
  projectId: "gestor-de-pedidos-6d470",
  storageBucket: "gestor-de-pedidos-6d470.appspot.com",
  messagingSenderId: "189239099092",
  appId: "1:189239099092:web:1b97d939bd1d6c455a0541",
  measurementId: "G-4G4T11GRRF"
};

// Advertencia si la clave no está presente.
if (!firebaseConfig.apiKey) {
    console.error("CRITICAL ERROR: Firebase API Key is not configured in src/lib/firebase.ts. Firebase connection will fail.");
}

// Initialize Firebase for SSR and client-side, guaranteeing a single instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore with default settings for robust persistence.
export const db = getFirestore(app);
