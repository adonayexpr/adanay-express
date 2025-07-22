
"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, redirect } from "next/navigation";
import Link from "next/link";
import { UserPlus, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase"; 
import { useToast } from "@/hooks/use-toast";

import { collection, getDocs, limit, query } from "firebase/firestore";

const rutRegex = /^(\d{1,2})\.?(\d{3})\.?(\d{3})-?([\dkK])$/;

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, introduce un correo válido." }),
  rut: z.string().regex(rutRegex, { message: "RUT inválido. Formato: 12345678-9" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

export default function AdminAccessPage() {
  const router = useRouter();
  const { user, loading, registerAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [nickname, setNickname] = useState("");
  const [isSetupAllowed, setIsSetupAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Redirect if user is already logged in and auth is no longer loading.
    if (!loading && user) {
        redirect('/dashboard');
    }
    
    // Check if any user exists to determine if admin setup is allowed.
    // This check only runs once when the component mounts.
    const checkForUsers = async () => {
        try {
            const usersCollection = collection(db, "users");
            const q = query(usersCollection, limit(1));
            const querySnapshot = await getDocs(q);
            setIsSetupAllowed(querySnapshot.empty);
        } catch (e) {
            console.error("Error checking for users:", e);
            toast({
                variant: "destructive",
                title: "Error de Base de Datos",
                description: "No se pudo verificar la existencia de usuarios. Intenta recargar la página."
            });
            // Default to false on error to be safe
            setIsSetupAllowed(false);
        }
    };
    if (isSetupAllowed === null) {
      checkForUsers();
    }
  }, [user, loading, toast, isSetupAllowed]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      rut: "",
      password: "",
    },
  });

  const rutValue = form.watch("rut");
  const nameValue = form.watch("name");

  useEffect(() => {
    const match = rutValue.match(rutRegex);
    if (match) {
        const firstFour = `${match[1]}${match[2]}`.slice(0, 4);
        const namePart = nameValue.split(" ")[0].replace(/[^a-zA-Z]/g, '');
        setNickname(`${namePart}${firstFour}`);
    } else {
        setNickname("");
    }
  }, [rutValue, nameValue]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isSetupAllowed) {
        toast({
            variant: "destructive",
            title: "Acción no permitida",
            description: "Ya existe un usuario administrador.",
        });
        return;
    }

    setIsLoading(true);
    try {
      await registerAdmin(values.name, values.email, values.rut, nickname, values.password);
      toast({
        title: "Administrador Creado",
        description: `¡Bienvenido, ${values.name}! Serás redirigido en breve.`,
      });
      // The onAuthStateChanged listener in useAuth will handle the redirect via the layout component.
      // We no longer need to manually push to router here.
    } catch (error: any) {
        let errorMessage = "Ocurrió un error inesperado.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "El correo electrónico ya está en uso.";
        } else if (error.code === 'permission-denied') {
            errorMessage = "Permiso denegado por las reglas de Firestore. Asegúrate de que las reglas permitan la creación de usuarios.";
        }
        else {
            errorMessage = error.message;
        }
        toast({
            variant: "destructive",
            title: "Error en el registro",
            description: errorMessage,
          });
    } finally {
        setIsLoading(false);
    }
  }
  
  if (isSetupAllowed === null) {
      return (
          <div className="flex min-h-screen items-center justify-center p-4 bg-accent dark:bg-background">
              <p>Verificando sistema...</p>
          </div>
      )
  }

  if (!isSetupAllowed) {
       return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-accent dark:bg-background">
            <Card className="mx-auto max-w-sm w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center mb-4">
                        <ShieldAlert className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-headline">Configuración Bloqueada</CardTitle>
                    <CardDescription>
                        El sistema ya tiene usuarios registrados. La creación de un nuevo administrador desde esta página no está permitida por seguridad.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/login" className="w-full">
                         <Button className="w-full">Ir a Inicio de Sesión</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      );
  }


  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-accent dark:bg-background">
        <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
                <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline">Crear Cuenta de Administrador</CardTitle>
            <CardDescription>
            Esta página es para la configuración inicial. La primera cuenta creada será la del administrador principal del sistema.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre Completo del Admin</FormLabel>
                    <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                        <Input placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="rut"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>RUT</FormLabel>
                    <FormControl>
                        <Input placeholder="12345678-9" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {nickname && (
                    <div className="text-sm p-2 bg-muted rounded-md">
                        Tu nickname será: <span className="font-bold text-primary">{nickname}</span>
                    </div>
                )}
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contraseña Segura</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full" disabled={isLoading || !nickname}>
                    {isLoading ? "Creando cuenta..." : "Crear Administrador"}
                </Button>
            </form>
            </Form>
            <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="underline text-primary">
                Inicia sesión
            </Link>
            </div>
        </CardContent>
        </Card>
    </div>
  );
}
