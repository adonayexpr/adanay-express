
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useAuth } from "@/hooks/use-auth";
import { auth, db } from "@/lib/firebase"; 
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, ShoppingCart, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Import firestore functions directly for user creation
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const rutRegex = /^(\d{1,2})\.?(\d{3})\.?(\d{3})-?([\dkK])$/;

const userFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, introduce un correo válido." }),
  rut: z.string().regex(rutRegex, { message: "RUT inválido. Formato: 12345678-9" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  role: z.enum(["admin", "user"], { required_error: "Debes seleccionar un rol." }),
});

export default function AdminUsersPage() {
  const { user, users: allUsers, loading: authLoading, deleteUser, startImpersonation } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);


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
    // This effect manages the loading state of the user list
    if (authLoading) {
      setIsListLoading(true); // Still waiting for auth to resolve
      return;
    }
    if (user?.role !== 'admin') {
      setIsListLoading(false); // Not an admin, stop loading
      return;
    }
    // If auth is done and user is admin, we check the user list
    if (allUsers.length > 0) {
      setIsListLoading(false);
    } else {
      // If the list is empty, it might be loading or truly empty.
      // We give it a moment to populate.
       const timer = setTimeout(() => {
          if (allUsers.length === 0) setIsListLoading(false);
       }, 1500); // Wait 1.5s before showing "no users"
       return () => clearTimeout(timer);
    }
  }, [allUsers, authLoading, user]);


  const userForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      rut: "",
      password: "",
      role: "user",
    },
  });
  
  const handleStartImpersonation = (customer: User) => {
    startImpersonation(customer);
    router.push('/dashboard');
    toast({
      title: `Suplantando a ${customer.name}`,
      description: "Ahora estás navegando como este usuario. El carrito de compras ha sido limpiado para este pedido.",
    });
  }


  async function onCreateUserSubmit(values: z.infer<typeof userFormSchema>) {
    // This function creates a user from the admin panel.
    // It's separate from the useAuth hook to keep concerns separate.
    try {
        // NOTE: Firebase does not allow creating users with email/password
        // from the client if you are already logged in. This is a security measure.
        // A proper implementation requires a backend function (e.g., Cloud Function).
        // For this project, we will show a toast message explaining this limitation.
        toast({
            variant: "destructive",
            title: "Función de Administrador Requerida",
            description: "Crear usuarios desde el panel de admin requiere un backend seguro. Por favor, crea usuarios a través de la página de registro pública.",
        });
        
    } catch (error: any) {
        console.error("Error creating user from admin panel:", error);
        toast({
            variant: "destructive",
            title: "Error al crear usuario",
            description: "Esta función está deshabilitada por seguridad en el cliente. Use la página de registro.",
        });
    }
  }

  async function handleDeleteUser(userId: string) {
    try {
        await deleteUser(userId);
        toast({
        title: "Usuario Eliminado",
        description: "El usuario ha sido eliminado de la base de datos de Firestore.",
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "No se pudo eliminar el usuario.",
          });
    }
  }

  if (authLoading || user?.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Cargando o redirigiendo...</p>
      </div>
    );
  }

  const roleStyles: Record<User['role'], string> = {
    admin: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800",
    user: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/50 dark:text-gray-200 dark:border-gray-800",
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
              <CardTitle className="font-headline text-foreground">Gestión de Usuarios</CardTitle>
              <CardDescription>Visualiza, administra y crea pedidos para los usuarios registrados.</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                  <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Crear Usuario
                  </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                      <DialogDescription>
                         Por motivos de seguridad, la creación de usuarios desde este panel está deshabilitada. Por favor, utiliza la página de registro pública o la consola de Firebase.
                      </DialogDescription>
                  </DialogHeader>
                   <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="secondary">
                              Cerrar
                          </Button>
                      </DialogClose>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Nombre</TableHead>
                <TableHead className="text-foreground">Email</TableHead>
                <TableHead className="text-foreground">Nickname</TableHead>
                <TableHead className="text-foreground">Rol</TableHead>
                <TableHead className="text-right text-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isListLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8 rounded-md float-right" />
                    </TableCell>
                  </TableRow>
                ))
              ) : allUsers.length > 0 ? (
                allUsers.map((registeredUser) => (
                  <TableRow key={registeredUser.id}>
                    <TableCell className="font-medium text-foreground">{registeredUser.name}</TableCell>
                    <TableCell className="text-foreground">{registeredUser.email}</TableCell>
                    <TableCell className="text-foreground">{registeredUser.nickname}</TableCell>
                    <TableCell>
                      <Badge className={roleStyles[registeredUser.role]} variant="outline">{registeredUser.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       {user?.id !== registeredUser.id && registeredUser.role === 'user' && (
                         <Button variant="outline" size="sm" onClick={() => handleStartImpersonation(registeredUser)}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Crear Pedido
                         </Button>
                       )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={user?.id === registeredUser.id}
                            aria-label="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esto eliminará permanentemente al usuario <span className="font-bold">{registeredUser.name}</span> de la base de datos de la aplicación. Esta acción no elimina al usuario del sistema de autenticación de Firebase por motivos de seguridad.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(registeredUser.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Eliminar de la Base de Datos
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-foreground">
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
    

    
