
"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutGrid, ClipboardList, Shield, LogOut, Users, Package, PieChart, Archive, Database, WifiOff, Wifi, LogIn, UserX, PackageSearch } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { CartProvider } from '@/hooks/use-cart';
import { Cart } from '@/components/cart';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { transformGoogleDriveUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { NetworkState } from '@/lib/network-controller';
import { BatchManager } from '@/components/batch-manager';

const logoUrl = "https://drive.google.com/file/d/1g9ODfGOAEhOH5UvRVPZTwFNL-MzoG263/view?usp=drive_link";

function ImpersonationBanner() {
    const { impersonatedUser, stopImpersonation } = useAuth();

    if (!impersonatedUser) return null;

    return (
        <div className="bg-yellow-500 text-black p-2 text-center text-sm flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>Estás actuando como <strong>{impersonatedUser.name}</strong> ({impersonatedUser.nickname})</span>
            </div>
            <Button size="sm" variant="secondary" className="h-7" onClick={stopImpersonation}>
                <UserX className="mr-2 h-4 w-4" />
                Volver a mi cuenta
            </Button>
        </div>
    )
}

function OfflineBanner() {
  const { networkState } = useAuth();

  const bannerContent: Record<NetworkState, { text: string; icon: React.ReactNode; className: string } | null> = {
    online: null,
    offline: {
      text: "Estás desconectado. Algunas funciones pueden no estar disponibles.",
      icon: <WifiOff className="h-4 w-4" />,
      className: "bg-destructive text-destructive-foreground",
    },
    reconnecting: {
      text: "Conexión inestable. Intentando reconectar...",
      icon: <Wifi className="h-4 w-4 animate-pulse" />,
      className: "bg-yellow-500 text-black",
    },
  };

  const content = bannerContent[networkState];

  return (
    <div className={cn(
      "py-2 text-center text-sm transition-all duration-300 ease-in-out",
      "flex items-center justify-center gap-2",
      !content ? "max-h-0 py-0 opacity-0" : "max-h-10 opacity-100",
      content?.className
    )}>
      {content?.icon}
      <span>{content?.text}</span>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout, impersonatedUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
            <Image 
                src={transformGoogleDriveUrl(logoUrl)}
                alt="Adonay Express Logo"
                width={80}
                height={27}
                className="h-auto animate-pulse drop-shadow-xl"
                priority
            />
          <p className="mt-4 text-lg font-semibold text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
      return (
         <div className="flex h-screen items-center justify-center bg-background">
             <p className="text-muted-foreground">Redirigiendo a la página de inicio...</p>
         </div>
      );
  }


  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const isCatalogActive = pathname.startsWith('/dashboard/category') || pathname === '/dashboard';
  const showCart = (user && user.role !== 'admin') || impersonatedUser;

  return (
    <CartProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader>
              <div className="flex items-center justify-center p-4">
                  <Image 
                      src={transformGoogleDriveUrl(logoUrl)}
                      alt="Adonay Express Logo"
                      width={100}
                      height={33}
                      className="h-auto"
                  />
              </div>
            </SidebarHeader>
            <SidebarContent className="flex-grow">
                <div className="flex items-center gap-3 p-3 border-y border-sidebar-border mb-2">
                  {user.name && user.email ? (
                    <>
                      <Avatar>
                          <AvatarImage src={`https://i.pravatar.cc/150?u=${user.email}`} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow overflow-hidden">
                        <p className="font-semibold truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </>
                  ) : (
                      <>
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-grow space-y-2">
                              <Skeleton className="h-4 w-4/5" />
                              <Skeleton className="h-3 w-3/5" />
                          </div>
                      </>
                  )}
                </div>
              <SidebarMenu>
                  <SidebarGroup>
                      <SidebarGroupLabel>Usuario</SidebarGroupLabel>
                      <SidebarMenuItem>
                          <Link href="/dashboard">
                          <SidebarMenuButton isActive={isCatalogActive}><LayoutGrid/> Catálogo</SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                          <Link href="/dashboard/orders">
                          <SidebarMenuButton isActive={pathname === '/dashboard/orders'}><ClipboardList/> Mis Pedidos</SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                  </SidebarGroup>

                {user.role === 'admin' && (
                  <>
                    <Separator className="my-2" />
                    <SidebarGroup>
                      <SidebarGroupLabel>Administración</SidebarGroupLabel>
                       <SidebarMenuItem>
                          <Link href="/dashboard/admin/orders">
                          <SidebarMenuButton isActive={pathname === '/dashboard/admin/orders'}><Shield/> Pedidos Activos</SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                          <Link href="/dashboard/admin/archive">
                          <SidebarMenuButton isActive={pathname === '/dashboard/admin/archive'}><Archive/> Pedidos Archivados</SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <Link href="/dashboard/admin/summary">
                          <SidebarMenuButton isActive={pathname === '/dashboard/admin/summary'}><PieChart/> Resumen de Ventas</SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <Link href="/dashboard/admin/batches">
                          <SidebarMenuButton isActive={pathname === '/dashboard/admin/batches'}><PackageSearch/> Resumen por Lote</SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                          <Link href="/dashboard/admin/products">
                            <SidebarMenuButton isActive={pathname.startsWith('/dashboard/admin/products')}><Package/> Catálogo</SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                          <Link href="/dashboard/admin/users">
                          <SidebarMenuButton isActive={pathname === '/dashboard/admin/users'}><Users/> Usuarios</SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                       <SidebarMenuItem>
                          <Link href="/dashboard/admin/backup">
                          <SidebarMenuButton isActive={pathname === '/dashboard/admin/backup'}><Database/> Respaldos</SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                    </SidebarGroup>
                  </>
                )}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <Button variant="ghost" className="w-full justify-start p-3 border-t border-sidebar-border rounded-none" onClick={logout}>
                  <LogOut className="h-5 w-5 mr-2"/>
                  <span>Cerrar Sesión</span>
              </Button>
            </SidebarFooter>
          </Sidebar>
          <main className="flex-1 flex flex-col h-screen">
            <header className="flex h-14 items-center gap-4 border-b bg-sidebar-background px-4 md:hidden shrink-0 justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger/>
                <h1 className="text-lg font-semibold font-headline">Adonay Exp.</h1>
              </div>
              {showCart && <Cart />}
            </header>
            <div className="w-full h-8 flex-shrink-0">
              <div className="w-1/2 bg-brand-purple h-full float-left"></div>
              <div className="w-1/2 bg-yellow-400 h-full float-right"></div>
            </div>
            <div className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto bg-accent">
              <OfflineBanner />
              <ImpersonationBanner />
              {user.role === 'admin' && <BatchManager />}
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </CartProvider>
  );
}
