
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";

import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase"; 
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDescriptionComponent } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn, transformGoogleDriveUrl } from "@/lib/utils";

const productFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  code: z.string().optional(),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  price: z.coerce.number().min(0, "El precio no puede ser negativo."),
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo."),
  category: z.enum(["Individual", "Familiar"], { required_error: "Debes seleccionar una categoría." }),
  imageUrl: z.string().url("Debe ser una URL de imagen válida o un Data URI.").or(z.string().startsWith("data:image/")),
  'data-ai-hint': z.string().optional(),
  isVisible: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productFormSchema>;


export default function AdminCatalogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const productForm = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: "", code: "", description: "", price: 0, stock: 0, imageUrl: "https://placehold.co/600x400.png", "data-ai-hint": "", isVisible: true },
  });

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.push('/dashboard');
      toast({ variant: "destructive", title: "Acceso Denegado" });
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    const productsQuery = query(collection(db, "products"), orderBy("name"));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, isVisible: doc.data().isVisible ?? true } as Product));
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los productos." });
      setLoading(false);
    });

    return () => {
        unsubscribeProducts();
    };
  }, [user, toast]);

  const handleProductDialogOpen = (product: Product | null) => {
    setEditingProduct(product);
    if (product) {
      productForm.reset({ ...product, isVisible: product.isVisible ?? true });
    } else {
      productForm.reset({ name: "", code: "", description: "", price: 0, stock: 0, category: undefined, imageUrl: "https://placehold.co/600x400.png", "data-ai-hint": "", isVisible: true });
    }
    setIsProductDialogOpen(true);
  };
  
  const onProductSubmit = async (data: ProductFormData) => {
    try {
      const finalData = { ...data, imageUrl: transformGoogleDriveUrl(data.imageUrl) };

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), finalData);
        toast({ title: "Producto Actualizado" });
      } else {
        await addDoc(collection(db, "products"), finalData);
        toast({ title: "Producto Creado" });
      }
      setIsProductDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error saving product: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el producto." });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, "products", productId));
      toast({ title: "Producto Eliminado" });
    } catch (error) {
      console.error("Error deleting product: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el producto." });
    }
  };
  
  const handleVisibilityToggle = async (productId: string, currentVisibility: boolean) => {
    try {
      await updateDoc(doc(db, "products", productId), { isVisible: !currentVisibility });
      toast({ title: "Visibilidad actualizada" });
    } catch (error) {
      console.error("Error updating visibility: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar la visibilidad." });
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);

  if (authLoading || (!loading && user?.role !== 'admin')) {
    return <div className="flex h-full items-center justify-center"><p>Cargando o redirigiendo...</p></div>;
  }

  return (
    <>
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
          <div>
              <CardTitle className="font-headline">Catálogo de Productos</CardTitle>
              <CardDescription>Añade, edita o elimina productos de tu catálogo.</CardDescription>
          </div>
          <Button onClick={() => handleProductDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Producto
          </Button>
          </CardHeader>
          <CardContent>
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>Visible</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                  ))
              ) : products.length > 0 ? (
                  products.map((product) => (
                  <TableRow key={product.id}>
                      <TableCell>
                        <Switch
                          checked={product.isVisible}
                          onCheckedChange={() => handleVisibilityToggle(product.id, product.isVisible)}
                          aria-label="Visibilidad del producto"
                        />
                      </TableCell>
                      <TableCell><code className="text-xs">{product.code || 'N/A'}</code></TableCell>
                      <TableCell><Image src={transformGoogleDriveUrl(product.imageUrl)} alt={product.name} width={48} height={48} className="rounded-md object-cover" data-ai-hint={product['data-ai-hint']} /></TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleProductDialogOpen(product)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente el producto "{product.name}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteProduct(product.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                      </TableCell>
                  </TableRow>
                  ))
              ) : <TableRow><TableCell colSpan={8} className="h-24 text-center">No hay productos. Crea uno para empezar.</TableCell></TableRow>}
              </TableBody>
          </Table>
          </CardContent>
      </Card>
      
      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editingProduct ? "Editar Producto" : "Crear Producto"}</DialogTitle><DialogDescription>Completa los datos del producto.</DialogDescription></DialogHeader>
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={productForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Nombre del producto" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={productForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>SKU</FormLabel><FormControl><Input placeholder="SKU-12345" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              </div>
              <FormField control={productForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Describe el producto..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={productForm.control} name="price" render={({ field }) => (<FormItem><FormLabel>Precio</FormLabel><FormControl><Input type="number" placeholder="10000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={productForm.control} name="stock" render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" placeholder="50" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              </div>
              <FormField control={productForm.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Familiar">Familiar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={productForm.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>URL de la Imagen</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormDescriptionComponent>Puedes pegar un enlace de Google Drive o generar una con IA.</FormDescriptionComponent><FormMessage /></FormItem>)}/>
              <FormField control={productForm.control} name="data-ai-hint" render={({ field }) => (<FormItem><FormLabel>Pista para IA (Opcional)</FormLabel><FormControl><Input placeholder="ej: food pizza" {...field} /></FormControl><FormDescriptionComponent>Palabras clave para futura generación de imágenes.</FormDescriptionComponent><FormMessage /></FormItem>)}/>
              <FormField
                  control={productForm.control}
                  name="isVisible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Visible para usuarios</FormLabel>
                        <FormDescriptionComponent>
                          Si está activo, el producto se mostrará a los clientes.
                        </FormDescriptionComponent>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose><Button type="submit" disabled={productForm.formState.isSubmitting}>Guardar Producto</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
