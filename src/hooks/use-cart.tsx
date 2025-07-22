
"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { Product, CartItem, Order, OrderItem } from "@/lib/types";

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  submitOrder: () => Promise<void>;
  isSubmitting: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, networkState, impersonatedUser, activeBatchId } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const getCartStorageKey = useCallback(() => {
    if (impersonatedUser) {
        return `cart_impersonated_${impersonatedUser.id}`;
    }
    if (user) {
        return `cart_${user.id}`;
    }
    return 'cart_anonymous';
  }, [user, impersonatedUser]);


  // Load cart from localStorage when the component mounts or the user/impersonation changes
  useEffect(() => {
    const key = getCartStorageKey();
    try {
      const savedCart = localStorage.getItem(key);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      } else {
        setCart([]); // Clear cart when switching user/mode
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage", error);
      localStorage.removeItem(key);
      setCart([]);
    }
  }, [getCartStorageKey]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const key = getCartStorageKey();
    try {
      localStorage.setItem(key, JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, [cart, getCartStorageKey]);


  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        const newItem: CartItem = {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          imageUrl: product.imageUrl,
          product: product,
        };
        return [...prevCart, newItem];
      }
    });
    toast({
        title: "Producto Agregado",
        description: `${product.name} se ha añadido al pedido.`,
    });
  }, [toast]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    toast({
        variant: 'destructive',
        title: "Producto Eliminado",
        description: "El producto ha sido eliminado del pedido.",
    });
  }, [toast]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    const key = getCartStorageKey();
    localStorage.removeItem(key);
    toast({
        title: "Pedido Vacío",
        description: "Todos los productos han sido eliminados del pedido.",
    });
  }, [toast, getCartStorageKey]);

  const submitOrder = async () => {
    const currentUser = impersonatedUser || user;

    if (networkState !== 'online') {
      toast({
        variant: "destructive",
        title: "Estás desconectado",
        description: "No se puede enviar el pedido. Por favor, revisa tu conexión a internet.",
      });
      return;
    }
    
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para realizar un pedido.",
      });
      return;
    }
    
    if (cart.length === 0) {
        toast({
            variant: "destructive",
            title: "El pedido está vacío",
            description: "Agrega productos antes de enviar.",
          });
        return;
    }

    setIsSubmitting(true);
    
    const orderItems: OrderItem[] = cart.map(item => ({
        product: item.product,
        quantity: item.quantity,
    }));
    
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderData: any = {
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      items: orderItems,
      status: "Recibido",
      date: serverTimestamp(),
      total: total,
      createdByAdmin: !!impersonatedUser
    };
    
    if (activeBatchId) {
        orderData.batchId = activeBatchId;
    }

    try {
        await addDoc(collection(db, "orders"), orderData);
        
        clearCart();
        toast({
            title: "¡Pedido Enviado!",
            description: "Hemos recibido el pedido. Puedes ver su estado en la sección de administración.",
        });

    } catch (error) {
        console.error("Error submitting order: ", error);
        toast({
            variant: "destructive",
            title: "Error al Enviar",
            description: "No se pudo enviar el pedido. Por favor, inténtalo de nuevo.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    submitOrder,
    isSubmitting,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
