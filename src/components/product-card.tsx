
"use client"

import Image from "next/image";
import { PlusCircle, Wand2, Loader2 } from "lucide-react";
import type { Product } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, transformGoogleDriveUrl } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  userRole?: 'admin' | 'user';
  isImpersonating?: boolean;
  onGenerateImage?: (product: Product) => void;
  isGeneratingImage?: boolean;
}

export function ProductCard({ product, onAddToCart, userRole, isImpersonating, onGenerateImage, isGeneratingImage }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  };
  
  const badgeStyle = "bg-white/50 text-slate-800 border-white/20 backdrop-blur-sm";
  const canAddToCart = (userRole !== 'admin') || isImpersonating;

  return (
    <Card className="flex flex-col h-full overflow-hidden">
        <div className="relative aspect-[4/3] w-full">
            <Image
            src={transformGoogleDriveUrl(product.imageUrl)}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={product['data-ai-hint']}
            />
            <Badge 
              variant="outline" 
              className={cn(
                "absolute top-2 right-2 capitalize", 
                badgeStyle
              )}>
              {product.category}
            </Badge>
        </div>
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="font-headline text-xl">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-2">
      {userRole === 'admin' && onGenerateImage && (
        <Button 
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onGenerateImage(product)} 
          disabled={isGeneratingImage} 
          title="Generar Imagen con IA"
        >
          {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4 text-purple-500" />}
          {isGeneratingImage ? 'Generando...' : 'Generar Imagen'}
        </Button>
      )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <p className="text-lg font-semibold">{formatPrice(product.price)}</p>
        {canAddToCart && (
            <Button onClick={() => onAddToCart(product)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
