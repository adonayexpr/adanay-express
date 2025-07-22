
"use client"

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase"; // Corrected import
import { useCart } from "@/hooks/use-cart";
import { ProductCard } from "@/components/product-card";
import { Cart } from "@/components/cart";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { generateImageForProduct } from "@/ai/flows/generate-image-flow";

export default function CategoryPage() {
  const { user, impersonatedUser } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const params = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);

  const categoryName = decodeURIComponent(Array.isArray(params.category) ? params.category[0] : params.category);
  
  const showCart = (user && user.role !== 'admin') || impersonatedUser;

  useEffect(() => {
    if (!categoryName) return;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsCollection = collection(db, "products");
        // Query only by category to avoid needing a composite index.
        const q = query(
            productsCollection, 
            where("category", "==", categoryName)
        );
        const productSnapshot = await getDocs(q);
        
        const productList = productSnapshot.docs
          .map(doc => {
              const data = doc.data();
              return {
                  id: doc.id,
                  name: data.name || "Producto sin nombre",
                  description: data.description || "Sin descripción.",
                  price: typeof data.price === 'number' ? data.price : 0,
                  imageUrl: data.imageUrl || "https://placehold.co/600x400",
                  stock: typeof data.stock === 'number' ? data.stock : 0,
                  category: data.category,
                  'data-ai-hint': data['data-ai-hint'] || "product",
                  isVisible: data.isVisible ?? true, // Default to true if not set
              } as Product;
          })
          .filter(product => product.isVisible); // Filter for visible products on the client

        // Sort on the client-side to avoid needing a composite index in Firestore
        productList.sort((a, b) => a.name.localeCompare(b.name));

        setProducts(productList);
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de la categoría." });
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [categoryName, toast]);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast({
      title: "Producto agregado",
      description: `${product.name} se ha añadido a tu pedido.`,
    });
  };

  const handleGenerateImage = async (product: Product) => {
    const hint = product['data-ai-hint'];
    if (!hint) {
      toast({ variant: "destructive", title: "Falta Pista de IA", description: "Añade una pista para la IA en la edición del producto (en Admin Catálogo)." });
      return;
    }
    setGeneratingImageId(product.id);
    try {
      const { imageUrl } = await generateImageForProduct({ prompt: hint, productName: product.name });
      if (imageUrl) {
        await updateDoc(doc(db, "products", product.id), { imageUrl });
        setProducts(prevProducts => prevProducts.map(p => p.id === product.id ? {...p, imageUrl} : p));
        toast({ title: "Imagen Generada" });
      } else { throw new Error("La IA no devolvió imagen."); }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ variant: "destructive", title: "Error de IA", description: "No se pudo generar la imagen." });
    } finally {
      setGeneratingImageId(null);
    }
  };

  return (
    <div className="container mx-auto pb-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <Link href="/dashboard">
                <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="text-lg font-semibold opacity-50">Categoría: {loading ? <Skeleton className="h-8 w-48 inline-block" /> : categoryName}</h1>
        </div>
        {showCart && (
            <div className="hidden md:block">
                <Cart />
            </div>
        )}
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {Array.from({ length: 8 }).map((_, i) => (
             <Card key={i} className="flex flex-col h-full">
                <CardHeader>
                    <div className="relative aspect-[4/3] w-full mb-4">
                        <Skeleton className="h-full w-full rounded-md" />
                    </div>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-2/3 mt-1" />
                </CardHeader>
                <CardContent className="flex-grow"></CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-10 w-1/2" />
                </CardFooter>
             </Card>
           ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToCart={handleAddToCart} 
              userRole={user?.role}
              isImpersonating={!!impersonatedUser}
              onGenerateImage={handleGenerateImage}
              isGeneratingImage={generatingImageId === product.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
            <p className="text-muted-foreground">No hay productos en esta categoría.</p>
            <p className="text-sm text-muted-foreground">Un administrador puede agregar productos a la categoría '{categoryName}' en la gestión de productos.</p>
        </div>
      )}
    </div>
  );
}
