
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase"; 
import type { Order, OrderStatus, User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OrderStatusSelector } from "@/components/order-status-selector";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, doc, updateDoc, query, getDoc, orderBy, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { generateOrderUpdateEmail } from "@/ai/flows/generate-email-flow";
import { EditOrderDialog } from "@/components/edit-order-dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const activeStatuses: OrderStatus[] = ["Pendiente", "Recibido", "Aceptado", "En Reparto"];

export default function AdminOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.push('/dashboard');
      toast({
        variant: "destructive",
        title: "Acceso Denegado",
        description: "No tienes permisos para acceder a esta página.",
      });
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    // We will query all orders and then filter on the client-side
    // to avoid needing a composite index in Firestore.
    const ordersQuery = query(
        collection(db, "orders"), 
        orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, orderNumber: doc.id } as Order));
      // Filter the orders on the client
      const activeOrders = allOrders.filter(order => activeStatuses.includes(order.status));
      setOrders(activeOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los pedidos." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  const handleSaveOrder = async (updatedOrder: Order) => {
    try {
      const orderRef = doc(db, "orders", updatedOrder.id);
      // We only update the items and total, not the whole order object
      await updateDoc(orderRef, {
        items: updatedOrder.items,
        total: updatedOrder.total,
      });
      toast({
        title: "Pedido Actualizado",
        description: `El pedido #${updatedOrder.orderNumber.slice(-6)} ha sido modificado.`,
      });
      setEditingOrder(null);
    } catch (error) {
      console.error("Error updating order:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el pedido." });
    }
  };

  const handleFinalizeOrder = async (finalizedOrder: Order) => {
     try {
      const orderRef = doc(db, "orders", finalizedOrder.id);
      await updateDoc(orderRef, {
        items: finalizedOrder.items,
        total: finalizedOrder.total,
        status: "Completado",
      });
      toast({
        title: "Pedido Finalizado",
        description: `El pedido #${finalizedOrder.orderNumber.slice(-6)} ha sido marcado como Completado y archivado.`,
      });
      // Send notification email
      await handleStatusChange(finalizedOrder.id, 'Completado', true); // Force email send
      setEditingOrder(null);
    } catch (error) {
      console.error("Error finalizing order:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo finalizar el pedido." });
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, forceEmail: boolean = false) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (orderToUpdate && orderToUpdate.status === newStatus && !forceEmail) return;

    setIsUpdating(orderId);
    const orderRef = doc(db, "orders", orderId);
    
    try {
      // 1. Get the most up-to-date order details from Firestore
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) {
        throw new Error("Order not found");
      }
      const orderData = { ...orderDoc.data(), id: orderDoc.id, orderNumber: orderDoc.id } as Order;

      // 2. Get customer's email from the users collection
      const userDocRef = doc(db, "users", orderData.userId);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("Customer not found for this order");
      }
      const customerData = userDoc.data() as User;
      const customerEmail = customerData.email;

      // 3. Update the document in Firestore
      await updateDoc(orderRef, { status: newStatus });
      
      toast({
        title: "Estado Actualizado",
        description: `El pedido #${orderData.orderNumber.slice(-6)} ahora está "${newStatus}".`
      });

      // 4. Generate and send the email notification if status is one that needs it
      if (['Aceptado', 'En Reparto', 'Completado', 'Recibido'].includes(newStatus)) {
        try {
          const emailInputItems = orderData.items.map(item => ({
              name: item.product.name,
              price: item.product.price,
              quantity: item.quantity,
          }));

          const result = await generateOrderUpdateEmail({
            orderNumber: orderData.orderNumber.slice(-6).toUpperCase(),
            newStatus,
            items: emailInputItems,
            total: orderData.total,
            customerEmail,
            date: formatDate(orderData.date, { month: 'long', day: 'numeric' }),
          });
          
          if (result.emailSent) {
            toast({
                title: "Correo de Notificación Enviado",
                description: `Se ha enviado un correo a ${customerEmail}.`,
            });
          } else {
               const errorMessage = result.error ? `Error de Resend: ${JSON.stringify(result.error)}` : "La IA no pudo enviar el correo.";
               throw new Error(errorMessage);
          }

        } catch (emailError: any) {
          console.error("Error generating/sending notification email:", emailError);
          toast({ variant: "destructive", title: "Error de Notificación", description: emailError.message || "No se pudo enviar el correo de notificación." });
        }
      }

    } catch (error) {
      console.error("Error updating order status: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado del pedido." });
    } finally {
        setIsUpdating(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  };
  
  const formatDate = (dateValue: Order['date'], options?: Intl.DateTimeFormatOptions) => {
    if (!dateValue) return 'Fecha no disponible';
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: 'long', day: 'numeric'
    };
    // Convert Firestore Timestamp to JS Date if necessary
    const date = (dateValue as Timestamp)?.toDate ? (dateValue as Timestamp).toDate() : new Date();
    return date.toLocaleDateString('es-CL', { ...defaultOptions, ...options });
  }

  if (authLoading || user?.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Cargando o redirigiendo...</p>
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Gestión de Pedidos Activos</CardTitle>
        <CardDescription>Visualiza y administra los pedidos que están actualmente en proceso.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Pedido ID</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Estado Actual</TableHead>
              <TableHead>Cambiar Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-[180px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-[80px] float-right" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-8 w-16 rounded-md mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id} className={isUpdating === order.id ? 'opacity-50' : ''}>
                  <TableCell className="font-medium font-mono text-xs">#{order.orderNumber.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>{order.userNickname}</TableCell>
                  <TableCell>{formatDate(order.date)}</TableCell>
                  <TableCell>
                    {order.batchId ? <Badge variant="secondary">{order.batchId}</Badge> : '-'}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <OrderStatusSelector 
                      currentStatus={order.status} 
                      onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                      disabled={isUpdating === order.id || order.status === 'Completado' || order.status === 'Cancelado'}
                    />
                  </TableCell>
                  <TableCell className="text-right">{formatPrice(order.total)}</TableCell>
                  <TableCell className="text-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setEditingOrder(order)}
                      disabled={isUpdating === order.id || order.status === 'Completado'}
                      aria-label="Editar Pedido"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No hay pedidos activos para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    
    {editingOrder && (
        <EditOrderDialog
            order={editingOrder}
            isOpen={!!editingOrder}
            onClose={() => setEditingOrder(null)}
            onSave={handleSaveOrder}
            onFinalize={handleFinalizeOrder}
        />
    )}
    </>
  );
}
