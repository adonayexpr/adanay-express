
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import type { Order, OrderItem, ProductCategory, OrderStatus } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AggregatedProduct = {
  productId: string;
  name: string;
  totalQuantity: number;
  category: ProductCategory;
  totalRevenue: number;
};

type BatchSummary = {
  totalRevenue: number;
  orderCount: number;
  products: AggregatedProduct[];
  firstOrderDate: Date | null;
  lastOrderDate: Date | null;
};

type GroupedBatches = {
  [batchId: string]: BatchSummary;
};

const countedStatuses: OrderStatus[] = ["Aceptado", "En Reparto", "Completado"];

export default function AdminBatchesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [groupedBatches, setGroupedBatches] = useState<GroupedBatches>({});
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

    const ordersQuery = query(collection(db, "orders"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
      
      const batches: GroupedBatches = allOrders.reduce((acc, order) => {
        const batchId = order.batchId || "Sin Lote";
        
        if (!acc[batchId]) {
          acc[batchId] = {
            totalRevenue: 0,
            orderCount: 0,
            products: [],
            firstOrderDate: null,
            lastOrderDate: null,
          };
        }

        const orderDate = (order.date as Timestamp)?.toDate ? (order.date as Timestamp).toDate() : new Date();

        // Update dates regardless of status
        if (!acc[batchId].firstOrderDate || orderDate > acc[batchId].firstOrderDate!) {
            acc[batchId].firstOrderDate = orderDate;
        }
        if (!acc[batchId].lastOrderDate || orderDate < acc[batchId].lastOrderDate!) {
            acc[batchId].lastOrderDate = orderDate;
        }

        // Only add to totals and product counts if the order status is a "counted" one
        if (countedStatuses.includes(order.status)) {
            acc[batchId].totalRevenue += order.total;
            acc[batchId].orderCount += 1;

            const productMap: { [key: string]: AggregatedProduct } = acc[batchId].products.reduce((map, p) => {
                map[p.productId] = p;
                return map;
            }, {} as { [key: string]: AggregatedProduct });

            order.items.forEach((item: OrderItem) => {
            const productId = item.product.id;
            if (productMap[productId]) {
                productMap[productId].totalQuantity += item.quantity;
                productMap[productId].totalRevenue += item.quantity * item.product.price;
            } else {
                productMap[productId] = {
                productId,
                name: item.product.name,
                totalQuantity: item.quantity,
                category: item.product.category,
                totalRevenue: item.quantity * item.product.price,
                };
            }
            });

            acc[batchId].products = Object.values(productMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
        }
        
        return acc;
      }, {} as GroupedBatches);

      setGroupedBatches(batches);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders for batch summary: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los resúmenes de lote." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const formatPrice = (price: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  
  const formatDate = (date: Date | null) => date ? date.toLocaleString('es-CL') : 'N/A';

  const handleDownloadCsv = (batchId: string, summary: BatchSummary) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Resumen de Lote:,"${batchId}"\n`;
    csvContent += `Total de Pedidos Contabilizados:,"${summary.orderCount}"\n`;
    csvContent += `Ingresos Totales (Solo Contabilizados):,"${formatPrice(summary.totalRevenue)}"\n`;
    csvContent += `Periodo del Lote (Primer Pedido):,"${formatDate(summary.firstOrderDate)}"\n`;
    csvContent += `Periodo del Lote (Último Pedido):,"${formatDate(summary.lastOrderDate)}"\n`;
    csvContent += "\n";
    csvContent += "Producto,Categoría,Unidades Vendidas,Ingresos por Producto\n";

    summary.products.forEach(product => {
        csvContent += `"${product.name}","${product.category}",${product.totalQuantity},"${formatPrice(product.totalRevenue)}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `resumen_lote_${batchId.replace(/ /g, '_')}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Descarga Iniciada", description: `El resumen para el lote '${batchId}' se está descargando.` });
  };

  if (authLoading || user?.role !== 'admin') {
    return <div className="flex h-full items-center justify-center"><p>Cargando o redirigiendo...</p></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Resumen por Lote</CardTitle>
        <CardDescription>
            Historial de pedidos agrupados por lote. Solo se contabilizan los pedidos aceptados, en reparto o completados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        ) : Object.keys(groupedBatches).length > 0 ? (
            <Accordion type="single" collapsible className="w-full" defaultValue={Object.keys(groupedBatches)[0]}>
                 {Object.entries(groupedBatches).map(([batchId, summary]) => (
                    <AccordionItem value={batchId} key={batchId}>
                        <AccordionTrigger className="text-lg font-semibold flex justify-between items-center gap-4">
                            <span className="truncate">Lote: <Badge variant="secondary" className="text-base">{batchId}</Badge></span>
                            <div className="flex gap-4 text-sm text-muted-foreground font-normal">
                                <span>Pedidos: {summary.orderCount}</span>
                                <span>Total: {formatPrice(summary.totalRevenue)}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             <div className="flex justify-end mb-4">
                                <Button onClick={() => handleDownloadCsv(batchId, summary)}>
                                    <Download className="mr-2 h-4 w-4"/>
                                    Descargar Resumen del Lote
                                </Button>
                             </div>
                             <h4 className="font-semibold mb-2">Productos Vendidos en este Lote</h4>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-right">Unidades</TableHead>
                                    <TableHead className="text-right">Total Producto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.products.length > 0 ? summary.products.map((product) => (
                                        <TableRow key={product.productId}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>{product.category}</TableCell>
                                            <TableCell className="text-right">{product.totalQuantity}</TableCell>
                                            <TableCell className="text-right">{formatPrice(product.totalRevenue)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">No hay productos vendidos (o contabilizados) en este lote.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                 ))}
            </Accordion>
        ) : (
            <div className="h-24 text-center flex items-center justify-center">
                <p>No hay pedidos con lote para mostrar.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
