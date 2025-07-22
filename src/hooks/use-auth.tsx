
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, deleteDoc, query, setDoc } from "firebase/firestore";

import type { User } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { FirestoreNetworkController, NetworkState } from '@/lib/network-controller';


interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  networkState: NetworkState;
  impersonatedUser: User | null;
  startImpersonation: (customer: User) => void;
  stopImpersonation: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, rut: string, nickname: string, password?: string) => Promise<void>;
  registerAdmin: (name: string, email: string, rut: string, nickname: string, password?: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  activeBatchId: string | null;
  startBatch: (batchId: string) => void;
  endBatch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let networkController: FirestoreNetworkController | null = null;
const BATCH_STORAGE_KEY = 'activeBatchId';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkState, setNetworkState] = useState<NetworkState>('online');
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    // This effect runs only once to initialize the network controller and load batch ID.
    // It's crucial to check for `window` to prevent server-side errors during build.
    if (typeof window !== 'undefined') {
      // Initialize network controller on the client
      if (!networkController) {
        networkController = new FirestoreNetworkController(db);
        networkController.onStateChange(setNetworkState);
      }
      // Load saved batch ID from local storage
      const savedBatchId = localStorage.getItem(BATCH_STORAGE_KEY);
      if (savedBatchId) {
        setActiveBatchId(savedBatchId);
      }
    }
  }, []);

  useEffect(() => {
    // This is the main authentication listener.
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);
            // Start monitoring network connection state once we have a user
            networkController?.monitorSDKConnectionState(firebaseUser.uid);
          } else {
            // This case handles a deleted user from Firestore but still authenticated in Firebase
            toast({
              variant: "destructive",
              title: "Error de Cuenta",
              description: "Tu usuario no fue encontrado en la base de datos. Cerrando sesión.",
            });
            await signOut(auth); // Log out the ghost user
            setUser(null);
          }
        } catch (error: any) {
           console.error("Error fetching user document:", error);
           if (error.code === 'unavailable' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
                 toast({
                    variant: "destructive",
                    title: "Error de Conexión",
                    description: "No se pudo verificar tu información de usuario. Estás desconectado.",
                });
           }
           // Log out if we can't fetch user data
           await signOut(auth);
           setUser(null);
        }
      } else {
        // No Firebase user is authenticated
        setUser(null);
        // Stop monitoring network connection when logged out
        networkController?.stopMonitoring();
      }
      setLoading(false);
    });

    // Cleanup the subscription on component unmount
    return () => unsubscribeAuth();
  }, [toast]);
  
  useEffect(() => {
    // This effect handles fetching the list of all users for the admin.
    let unsubscribeFirestore: (() => void) | undefined;
    
    if (user?.role === 'admin') {
      const usersQuery = query(collection(db, "users"));
      unsubscribeFirestore = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersData);
      }, (error) => {
        console.error("Error fetching users:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la lista de usuarios.' });
        setUsers([]); 
      });
    } else {
      // If the user is not an admin, ensure the users list is empty.
      setUsers([]);
    }

    // Cleanup the subscription on component unmount or when the user changes
    return () => {
        if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [user, toast]);
  
  const startImpersonation = useCallback((customer: User) => {
    if (user?.role === 'admin') {
      setImpersonatedUser(customer);
    }
  }, [user]);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUser(null);
    toast({
      title: "Vista de Administrador Restaurada",
      description: "Has vuelto a tu propia cuenta.",
    });
  }, [toast]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    // This function's only job is to sign in. `onAuthStateChanged` will handle the state update.
    await signInWithEmailAndPassword(auth, email, password);
  }, []);
  
  const performRegistration = useCallback(async (name: string, email: string, rut: string, nickname: string, role: 'admin' | 'user', password?: string): Promise<void> => {
    if (!password) throw new Error("La contraseña es requerida para el registro.");
    
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Create the user document in Firestore
    const newUser: Omit<User, 'id'> = { name, email, rut, nickname, role };
    await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    // The `onAuthStateChanged` listener will automatically update the user state.
  }, []);

  const register = useCallback((name: string, email: string, rut: string, nickname: string, password?: string) => {
    return performRegistration(name, email, rut, nickname, 'user', password);
  }, [performRegistration]);
  
  const registerAdmin = useCallback((name: string, email: string, rut: string, nickname: string, password?: string) => {
    return performRegistration(name, email, rut, nickname, 'admin', password);
  }, [performRegistration]);

  const deleteUser = useCallback(async (userId: string) => {
    if (user?.id === userId) throw new Error("No puedes eliminarte a ti mismo.");
    // This only deletes the Firestore document. Deleting the Auth user requires a backend function.
    await deleteDoc(doc(db, "users", userId));
  }, [user]);
  
  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setImpersonatedUser(null);
    // The `onAuthStateChanged` will set user to null, and the layout will redirect.
  }, []);

  const startBatch = useCallback((batchId: string) => {
    if (user?.role !== 'admin') return;
    localStorage.setItem(BATCH_STORAGE_KEY, batchId);
    setActiveBatchId(batchId);
    toast({ title: "Lote Iniciado", description: `Los pedidos ahora se registrarán bajo el lote: ${batchId}` });
  }, [user, toast]);

  const endBatch = useCallback(() => {
    if (user?.role !== 'admin') return;
    const endedBatchId = localStorage.getItem(BATCH_STORAGE_KEY);
    localStorage.removeItem(BATCH_STORAGE_KEY);
    setActiveBatchId(null);
    toast({ title: "Lote Finalizado", description: `El lote '${endedBatchId}' ha sido cerrado.` });
  }, [user, toast]);

  const value = useMemo(() => ({
      user, 
      users, 
      loading, 
      networkState, 
      impersonatedUser,
      startImpersonation,
      stopImpersonation,
      login, 
      logout, 
      register, 
      registerAdmin, 
      deleteUser, 
      resetPassword,
      activeBatchId,
      startBatch,
      endBatch,
  }), [user, users, loading, networkState, impersonatedUser, startImpersonation, stopImpersonation, login, logout, register, registerAdmin, deleteUser, resetPassword, activeBatchId, startBatch, endBatch]);


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

    