
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase"; // Corrected import
import type { Order, OrderStatus } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type GroupedOrders = {
    [key: string]: Order[];
};

const archivedStatuses: OrderStatus[] = ["Completado", "Cancelado"];

export default function AdminArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrders>({});
  const [loading, setLoading] = useState(true);

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
      
      // Filter for archived orders on the client
      const archivedOrders = allOrders.filter(order => archivedStatuses.includes(order.status));
      
      const grouped = archivedOrders.reduce((acc, order) => {
        // The date field can be a Timestamp object from Firestore.
        // We need to convert it to a JS Date object to work with it.
        const orderDate = (order.date as Timestamp)?.toDate ? (order.date as Timestamp).toDate() : new Date();
        const monthYear = orderDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
        const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

        if (!acc[capitalizedMonthYear]) {
          acc[capitalizedMonthYear] = [];
        }
        acc[capitalizedMonthYear].push(order);
        return acc;
      }, {} as GroupedOrders);

      setGroupedOrders(grouped);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching archived orders: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los pedidos archivados." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  };
  
  const formatDate = (dateValue: Order['date']) => {
    if (!dateValue) return 'Fecha no disponible';
    // Convert Firestore Timestamp to JS Date if necessary
    const date = (dateValue as Timestamp)?.toDate ? (dateValue as Timestamp).toDate() : new Date();
    return date.toLocaleDateString('es-CL', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  if (authLoading || user?.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Cargando o redirigiendo...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Pedidos Archivados</CardTitle>
        <CardDescription>
            Historial de todos los pedidos completados y cancelados, agrupados por mes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        ) : Object.keys(groupedOrders).length > 0 ? (
            <Accordion type="single" collapsible className="w-full" defaultValue={Object.keys(groupedOrders)[0]}>
                 {Object.entries(groupedOrders).map(([monthYear, orders]) => (
                    <AccordionItem value={monthYear} key={monthYear}>
                        <AccordionTrigger className="text-lg font-semibold">{monthYear} ({orders.length} pedidos)</AccordionTrigger>
                        <AccordionContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead className="w-[100px]">Pedido ID</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium font-mono text-xs">#{order.orderNumber.slice(-6).toUpperCase()}</TableCell>
                                            <TableCell>{order.userNickname}</TableCell>
                                            <TableCell>{formatDate(order.date)}</TableCell>
                                            <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                                            <TableCell className="text-right">{formatPrice(order.total)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                 ))}
            </Accordion>
        ) : (
            <div className="h-24 text-center flex items-center justify-center">
                <p>No hay pedidos archivados para mostrar.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
