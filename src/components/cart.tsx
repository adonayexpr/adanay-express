
"use client"

import { ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { transformGoogleDriveUrl } from "@/lib/utils";

export function Cart() {
  const { cart, updateQuantity, removeFromCart, submitOrder, isSubmitting, clearCart } = useCart();
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const formatPrice = (price: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Mi Pedido
          {totalItems > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center"
            >
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline">Tu Pedido</SheetTitle>
          <SheetDescription>
            Revisa los productos en tu pedido antes de enviarlo.
          </SheetDescription>
        </SheetHeader>
        <Separator />
        {cart.length > 0 ? (
          <>
            <ScrollArea className="flex-grow my-4">
              <div className="flex flex-col gap-4 pr-6">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-start gap-4">
                    <Image
                      src={transformGoogleDriveUrl(item.imageUrl)}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="rounded-md object-cover"
                      data-ai-hint="product image"
                    />
                    <div className="flex-grow">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{formatPrice(item.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span>{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto">
              <div className="w-full space-y-4">
                <Separator />
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <Button onClick={submitOrder} className="w-full" disabled={isSubmitting || cart.length === 0}>
                  {isSubmitting ? "Enviando Pedido..." : "Enviar Pedido"}
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">Tu pedido está vacío</p>
            <p className="text-muted-foreground">Agrega productos del catálogo para comenzar.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
