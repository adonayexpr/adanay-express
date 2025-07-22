
"use client"

import { useState, useEffect } from "react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase"; 
import type { Order } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { transformGoogleDriveUrl } from "@/lib/utils";


export default function UserOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    };

    setLoading(true);
    // Query only by userId. We will sort on the client.
    const ordersQuery = query(
        collection(db, "orders"), 
        where("userId", "==", user.id)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, orderNumber: doc.id } as Order));
        
        // Sort the orders by date on the client-side (newest first)
        ordersData.sort((a, b) => {
          const dateA = (a.date as Timestamp)?.toDate ? (a.date as Timestamp).toDate() : new Date(0);
          const dateB = (b.date as Timestamp)?.toDate ? (b.date as Timestamp).toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setUserOrders(ordersData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching orders: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar tus pedidos."});
        setLoading(false);
    });

    return () => unsubscribe();

  }, [user, authLoading, toast]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  };
   const formatPriceNumber = (price: number) => {
    return new Intl.NumberFormat('es-CL', { currency: 'CLP' }).format(price);
  }
  
  const formatDate = (dateValue: Order['date']) => {
    if (!dateValue) return 'Fecha no disponible';
    // Convert Firestore Timestamp to JS Date if necessary
    const date = (dateValue as Timestamp)?.toDate ? (dateValue as Timestamp).toDate() : new Date();
    return date.toLocaleDateString('es-CL', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  const handleDownloadPdf = (order: Order) => {
    if (!user) return;
    toast({ title: "Generando PDF...", description: "Tu resumen se descargará en breve." });

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Adonay Express", 14, 22);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Resumen de Pedido", 14, 30);
    
    // Order Details
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Pedido ID:`, 14, 40);
    doc.text(`Cliente:`, 14, 45);
    doc.text(`Fecha:`, 14, 50);

    doc.setFont("helvetica", "normal");
    doc.text(`#${order.orderNumber.slice(-6).toUpperCase()}`, 40, 40);
    doc.text(`${user.name} (${user.nickname})`, 40, 45);
    doc.text(`${formatDate(order.date)}`, 40, 50);

    const tableColumn = ["Producto", "Cantidad", { content: "P. Unitario", styles: { halign: 'right' } }, { content: "Subtotal", styles: { halign: 'right' } } ];
    const tableRows: any[][] = [];

    order.items.forEach(item => {
        const subtotal = item.product.price * item.quantity;
        const itemData = [
            item.product.name,
            item.quantity,
            { content: formatPrice(item.product.price), styles: { halign: 'right' } },
            { content: formatPrice(subtotal), styles: { halign: 'right' } }
        ];
        tableRows.push(itemData);
    });
    
    autoTable(doc, {
        startY: 60,
        head: [tableColumn],
        body: tableRows,
        foot: [['', '', { content: 'Total:', styles: { halign: 'right' } }, { content: formatPrice(order.total), styles: { halign: 'right' } }]],
        headStyles: {
            fillColor: [229, 231, 235], // gray-200
            textColor: [17, 24, 39], // gray-800
            fontStyle: 'bold'
        },
        footStyles: {
            fontStyle: 'bold',
            fontSize: 12,
            halign: 'right'
        },
        didDrawCell: (data) => {
            if (data.section === 'foot' && data.column.index >= 2) {
                 doc.setFont(doc.getFont().fontName, 'bold');
            }
        },
        showFoot: 'lastPage',
    });

    const dateForFile = new Date().toISOString().slice(0, 10);
    doc.save(`pedido_${order.orderNumber.slice(-6).toUpperCase()}_${dateForFile}.pdf`);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Mis Pedidos</CardTitle>
        <CardDescription>Aquí puedes ver el historial de todos tus pedidos y descargar un resumen.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Pedido ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Resumen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[80px] float-right" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                    </TableRow>
                  ))
            ) : userOrders.length > 0 ? (
              userOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium font-mono text-xs">#{order.orderNumber.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>{formatDate(order.date)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      {order.items.map(item => <li key={item.product.id}>{item.product.name} (x{item.quantity})</li>)}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right">{formatPrice(order.total)}</TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDownloadPdf(order)}
                      aria-label="Descargar resumen del pedido en PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Aún no has realizado ningún pedido.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
