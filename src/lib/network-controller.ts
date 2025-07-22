// 🧩 Módulo centralizado para manejo de red y sincronización
import { onSnapshot, doc, getFirestore, Firestore } from "firebase/firestore";

export type NetworkState = "online" | "offline" | "reconnecting";

/**
 * Clase para controlar y centralizar el estado de la conectividad
 * con el navegador y el SDK de Firestore.
 */
export class FirestoreNetworkController {
  private firestore: Firestore;
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private currentState: NetworkState = "online";
  private sdkConnectionUnsubscribe: (() => void) | null = null;

  constructor(firestoreInstance: Firestore) {
    this.firestore = firestoreInstance;
    this.attachNativeNetworkListeners();
  }

  /**
   * Adjunta listeners a los eventos 'online' y 'offline' del navegador.
   */
  private attachNativeNetworkListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  private handleOnline = () => {
    this.setState("reconnecting");
    // La monitorización del SDK la reinicia el hook `useAuth` cuando vuelve a tener un usuario.
  };

  private handleOffline = () => {
    this.setState("offline");
  };

  /**
   * Monitoriza la conectividad real con Firestore haciendo un onSnapshot
   * al documento del usuario.
   */
  public monitorSDKConnectionState(userId: string) {
    this.stopMonitoring(); // Ensure no multiple listeners are active.

    const userDocRef = doc(this.firestore, "users", userId);
    
    this.sdkConnectionUnsubscribe = onSnapshot(userDocRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Si el snapshot viene de la caché, estamos intentando reconectar.
        // Si el navegador ya dice que está offline, mantenemos ese estado.
        if (snapshot.metadata.fromCache) {
            if (this.currentState !== 'offline') {
                this.setState("reconnecting");
            }
        } else {
            // Si no viene de la caché, la conexión está activa.
            this.setState("online");
        }
      },
      (error) => {
        // El único error que nos interesa es 'unavailable'.
        if (error.code === 'unavailable') {
            this.setState("offline");
        } else {
            console.error("Firestore onSnapshot error (no-offline):", error);
        }
      }
    );
  }

  /**
   * Detiene el monitoreo activo del SDK de Firestore.
   */
  public stopMonitoring() {
    if (this.sdkConnectionUnsubscribe) {
      this.sdkConnectionUnsubscribe();
      this.sdkConnectionUnsubscribe = null;
    }
  }

  /**
   * Actualiza el estado de la red y notifica a los suscriptores.
   */
  private setState(state: NetworkState) {
    if (state !== this.currentState) {
      this.currentState = state;
      this.listeners.forEach((cb) => cb(state));
    }
  }

  /**
   * Permite que otros módulos se suscriban a los cambios de estado de la red.
   */
  public onStateChange(cb: (state: NetworkState) => void): () => void {
    this.listeners.add(cb);
    cb(this.currentState); 

    return () => {
        this.listeners.delete(cb);
    };
  }
  
  /**
   * Cancela todos los listeners para limpiar la instancia.
   */
  public cleanup() {
    this.stopMonitoring();
    this.listeners.clear();
    if (typeof window !== 'undefined') {
        window.removeEventListener("online", this.handleOnline);
        window.removeEventListener("offline", this.handleOffline);
    }
  }
}
