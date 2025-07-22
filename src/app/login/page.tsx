
"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { transformGoogleDriveUrl } from "@/lib/utils";

const loginFormSchema = z.object({
  email: z.string().email({ message: "El correo es requerido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

const resetPasswordSchema = z.object({
    email: z.string().email({ message: "Por favor, introduce un correo válido." }),
});

const logoUrl = "https://drive.google.com/file/d/1g9ODfGOAEhOH5UvRVPZTwFNL-MzoG263/view?usp=drive_link";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authIsLoading, login, resetPassword } = useAuth();
  const { toast } = useToast();
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  useEffect(() => {
    // La redirección ahora es manejada por el layout, que espera a que la carga termine.
    // Si la autenticación no está en curso y ya hay un usuario, redirigimos.
    if (!authIsLoading && user) {
        router.push('/dashboard');
    }
  }, [user, authIsLoading, router]);

  const loginForm = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const resetForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
        email: "",
    },
  });

  async function onLoginSubmit(values: z.infer<typeof loginFormSchema>) {
    setFormIsSubmitting(true);
    
    try {
      // La función login ahora solo inicia la sesión.
      // El listener en useAuth se encargará de actualizar el estado y el layout se encargará de la redirección.
      await login(values.email, values.password);

    } catch (error: any) {
        let errorMessage = "Ocurrió un error inesperado.";
        if (error.code) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/invalid-credential':
                    errorMessage = "Credenciales incorrectas. Por favor, revisa tu correo y contraseña.";
                    break;
                case 'auth/wrong-password':
                    errorMessage = "La contraseña es incorrecta. Por favor, inténtalo de nuevo.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Has intentado iniciar sesión demasiadas veces. Inténtalo de nuevo más tarde.";
                    break;
                default:
                    errorMessage = `Error: ${error.message} (${error.code})`;
                    break;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast({
            variant: "destructive",
            title: "Error de autenticación",
            description: errorMessage,
          });
    } finally {
        setFormIsSubmitting(false);
    }
  }

  async function onResetPasswordSubmit(values: z.infer<typeof resetPasswordSchema>) {
    try {
        await resetPassword(values.email);
        toast({
            title: "Correo enviado",
            description: "Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.",
        });
        setIsResetDialogOpen(false);
        resetForm.reset();
    } catch (error: any)        {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "No se pudo enviar el correo de restablecimiento.",
              });
        }
    }

    // El DashboardLayout se encargará de mostrar la pantalla de carga global.
    // Esta página solo debe mostrar el formulario de login.
    // Si el usuario ya está logueado, el useEffect de arriba y el layout se encargarán de la redirección.

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <Card className="mx-auto max-w-sm w-full bg-card overflow-hidden shadow-xl border-border">
                <CardHeader className="text-center p-6 bg-card">
                    <div className="flex justify-center items-center">
                        <Image 
                          src={transformGoogleDriveUrl(logoUrl)}
                          alt="Adonay Express Logo"
                          width={180}
                          height={60}
                          className="h-auto drop-shadow-xl"
                          priority
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                     <CardDescription className="text-center mb-4 text-card-foreground/80">
                        Inicia sesión para acceder a tu cuenta
                    </CardDescription>
                    <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                            <FormField
                            control={loginForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-card-foreground/90">Correo Electrónico</FormLabel>
                                <FormControl>
                                    <Input placeholder="usuario@example.com" {...field} className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:bg-background/80" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-card-foreground/90">Contraseña</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:bg-background/80" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={formIsSubmitting || authIsLoading}>
                            {formIsSubmitting || authIsLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                            </Button>
                        </form>
                    </Form>
                    <div className="mt-4 text-center text-sm text-card-foreground/70">
                        ¿No tienes una cuenta?{" "}
                        <Link href="/register" className="underline text-primary hover:text-primary/80 font-bold">
                            Regístrate
                        </Link>
                    </div>
                    <div className="mt-2 text-center text-sm">
                        <Dialog open={isResetDialogOpen} onOpenChange={(isOpen) => {
                            setIsResetDialogOpen(isOpen);
                            if (!isOpen) {
                                resetForm.reset();
                            }
                        }}>
                            <DialogTrigger asChild>
                                <button className="underline text-sm text-muted-foreground hover:text-foreground">
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <Form {...resetForm}>
                                    <form onSubmit={resetForm.handleSubmit(onResetPasswordSubmit)}>
                                        <DialogHeader>
                                            <DialogTitle>Restablecer Contraseña</DialogTitle>
                                            <DialogDescription>
                                              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                                            </DialogDescription>
                                        </DialogHeader>
                                        
                                        <div className="py-4 space-y-4">
                                            <FormField
                                                control={resetForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Correo Electrónico</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="usuario@example.com" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" variant="secondary">Cancelar</Button>
                                            </DialogClose>
                                            <Button type="submit" disabled={resetForm.formState.isSubmitting}>
                                                {resetForm.formState.isSubmitting ? "Enviando..." : "Enviar Correo"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
      );
}
