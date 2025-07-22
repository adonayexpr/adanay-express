
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase"; 
import type { Order, Product, ProductCategory } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy, getFirestore } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type AggregatedProduct = {
  productId: string;
  name: string;
  code?: string;
  totalQuantity: number;
  category: ProductCategory;
};

type CategorizedSummary = {
  [key in ProductCategory]?: AggregatedProduct[];
};

export default function AdminSummaryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [summary, setSummary] = useState<CategorizedSummary>({});
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
      const ordersData = snapshot.docs.map(doc => doc.data() as Order);
      
      const productMap: { [key: string]: AggregatedProduct } = {};

      ordersData.forEach(order => {
        // Only count orders that represent a confirmed sale
        if (order.status === 'Aceptado' || order.status === 'En Reparto' || order.status === 'Completado') {
            order.items.forEach(item => {
                const productId = item.product.id;
                if (productMap[productId]) {
                    productMap[productId].totalQuantity += item.quantity;
                } else {
                    productMap[productId] = {
                      productId: productId,
                      name: item.product.name,
                      code: item.product.code,
                      totalQuantity: item.quantity,
                      category: item.product.category,
                    };
                }
            });
        }
      });
      
      const categorized: CategorizedSummary = {};
      Object.values(productMap).forEach(product => {
        if (!categorized[product.category]) {
          categorized[product.category] = [];
        }
        categorized[product.category]!.push(product);
      });
      
      // Sort products within each category by quantity
      for (const category in categorized) {
        categorized[category as ProductCategory]?.sort((a, b) => b.totalQuantity - a.totalQuantity);
      }

      setSummary(categorized);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders for summary: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el resumen." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  const handleDownloadCsv = () => {
    if (Object.keys(summary).length === 0) {
      toast({ variant: "destructive", title: "No hay datos", description: "No hay datos para descargar." });
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU,Categoría,Producto,Unidades Vendidas\n";

    for (const category in summary) {
        summary[category as ProductCategory]?.forEach(product => {
            csvContent += `"${product.code || ''}","${category}","${product.name}",${product.totalQuantity}\n`;
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `resumen_ventas_para_proveedor_${timestamp}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Descarga Iniciada", description: "El archivo CSV se está descargando." });
  };

  if (authLoading || user?.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Cargando o redirigiendo...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
            <CardTitle className="font-headline">Resumen de Ventas por Producto</CardTitle>
            <CardDescription>
                Total de unidades vendidas para cada producto, agrupadas por categoría.
                <br/>
                <small>Solo se consideran los pedidos en estado "Aceptado", "En Reparto" o "Completado".</small>
            </CardDescription>
        </div>
        <Button onClick={handleDownloadCsv} disabled={loading || Object.keys(summary).length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Descargar CSV para Proveedor
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
             <Skeleton className="h-8 w-1/4" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-8 w-1/4 mt-6" />
             <Skeleton className="h-10 w-full" />
          </div>
        ) : Object.keys(summary).length > 0 ? (
          Object.entries(summary).map(([category, products]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-2 capitalize flex items-center gap-2">
                <Badge variant="secondary" className="text-base">{category}</Badge>
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Unidades Vendidas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell className="font-mono text-xs">{product.code || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right text-lg font-bold">{product.totalQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        ) : (
            <div className="h-24 text-center flex items-center justify-center">
                <p>No hay datos de ventas para mostrar todavía.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
