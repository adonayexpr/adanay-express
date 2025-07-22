
"use client"

import { useState, useEffect } from "react";
import Image from "next/image";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { transformGoogleDriveUrl } from "@/lib/utils";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


interface EditOrderDialogProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
  onFinalize: (updatedOrder: Order) => void;
}

export function EditOrderDialog({ order, isOpen, onClose, onSave, onFinalize }: EditOrderDialogProps) {
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Deep copy to prevent modifying the original order object directly
    if (order) {
        const deepCopiedItems = order.items.map(item => ({
            ...item,
            product: { ...item.product }
        }));
        setCurrentItems(deepCopiedItems);
        setTotal(order.total);
    }
  }, [order, isOpen]);

  useEffect(() => {
    const newTotal = currentItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    setTotal(newTotal);
  }, [currentItems]);
  
  const handleQuantityChange = (productId: string, change: number) => {
    setCurrentItems(prevItems => {
        const newItems = prevItems.map(item => {
            if (item.product.id === productId) {
                const newQuantity = Math.max(0, item.quantity + change);
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        // Filter out items with quantity 0
        return newItems.filter(item => item.quantity > 0);
    });
  };

  const handleSave = () => {
    const updatedOrder = { ...order, items: currentItems, total };
    onSave(updatedOrder);
  };
  
  const handleFinalizeAndDownload = () => {
    const updatedOrder = { ...order, items: currentItems, total, status: 'Completado' as OrderStatus };
    toast({ title: "Generando PDF...", description: "El resumen del pedido se descargará en breve." });
    
    // 1. Create PDF content
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
    
    doc.setFont("helvetica", "normal");
    doc.text(`#${order.orderNumber.slice(-6).toUpperCase()}`, 40, 40);
    doc.text(`${order.userNickname}`, 40, 45);
    
    const tableColumn = ["Producto", "Cantidad", { content: "P. Unitario", styles: { halign: 'right' } }, { content: "Subtotal", styles: { halign: 'right' } } ];
    const tableRows: any[][] = [];

    currentItems.forEach(item => {
      const subtotal = item.product.price * item.quantity;
      tableRows.push([
        item.product.name,
        item.quantity,
        { content: formatPrice(item.product.price), styles: { halign: 'right' } },
        { content: formatPrice(subtotal), styles: { halign: 'right' } }
      ]);
    });

    autoTable(doc, {
        startY: 55,
        head: [tableColumn],
        body: tableRows,
        foot: [['', '', { content: 'Total:', styles: { halign: 'right' } }, { content: formatPrice(total), styles: { halign: 'right' } }]],
        headStyles: {
            fillColor: [229, 231, 235], // gray-200
            textColor: [17, 24, 39], // gray-800
            fontStyle: 'bold'
        },
        footStyles: {
            fontStyle: 'bold',
            fontSize: 12,
        },
        didDrawCell: (data) => {
            if (data.section === 'foot' && data.column.index >= 2) {
                doc.setFont(doc.getFont().fontName, 'bold');
            }
        },
        showFoot: 'lastPage',
    });

    // 2. Trigger download
    doc.save(`pedido_finalizado_${order.orderNumber.slice(-6).toUpperCase()}.pdf`);

    // 3. Call the finalize function to update Firestore
    onFinalize(updatedOrder);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  };

  if (!order) return null;

  const isCompleted = order.status === 'Completado';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar Pedido #{order.orderNumber.slice(-6).toUpperCase()}</DialogTitle>
          <DialogDescription>
            Ajusta las cantidades o elimina productos. El total se actualizará automáticamente.
            {isCompleted && <span className="font-bold text-destructive"> Este pedido ya está completado y no puede ser modificado.</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center w-40">Cantidad</TableHead>
                <TableHead className="w-32 text-right">Precio Unit.</TableHead>
                <TableHead className="text-right w-32">Subtotal</TableHead>
                <TableHead className="text-center w-16">Quitar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map(item => (
                <TableRow key={item.product.id}>
                  <TableCell className="flex items-center gap-2">
                    <Image 
                      src={transformGoogleDriveUrl(item.product.imageUrl)} 
                      alt={item.product.name}
                      width={40}
                      height={40}
                      className="rounded-md object-cover"
                    />
                    <span className="font-medium">{item.product.name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleQuantityChange(item.product.id, -1)}
                          disabled={isCompleted}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-mono">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleQuantityChange(item.product.id, 1)}
                          disabled={isCompleted}
                        >
                          +
                        </Button>
                      </div>
                  </TableCell>
                  <TableCell className="text-right">{formatPrice(item.product.price)}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.product.price * item.quantity)}</TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleQuantityChange(item.product.id, -Infinity)}
                      disabled={isCompleted}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {currentItems.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      El pedido está vacío. Al guardar, se quedará sin productos.
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-4 text-right text-xl font-bold">
            Total Actualizado: {formatPrice(total)}
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="success" onClick={handleFinalizeAndDownload} disabled={isCompleted || currentItems.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Finalizar y Descargar PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isCompleted}>Guardar Cambios</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
