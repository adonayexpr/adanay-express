
"use client";

import Link from "next/link";
import Image from "next/image";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { transformGoogleDriveUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IceCream2 } from "lucide-react";

type StaticCategory = {
    id: string;
    name: string;
    imageUrl: string;
    'data-ai-hint': string;
};

const staticCategories: StaticCategory[] = [
    { id: '1', name: 'Individual', imageUrl: 'https://drive.google.com/file/d/1NneqJYwIa2gk2ulhwC7K7lNtPx1gBrkw/view?usp=drive_link', 'data-ai-hint': 'ice cream cone' },
    { id: '2', name: 'Familiar', imageUrl: 'https://drive.google.com/file/d/19XJ1cui5VYpbhk7tEx8ltbGyT3rY5jCV/view?usp=drive_link', 'data-ai-hint': 'ice cream tub' },
];

export default function DashboardPage() {
  const { loading } = useAuth();

  if (loading) {
      return (
        <div className="container mx-auto">
            <div className="text-center mb-8">
                <Skeleton className="h-10 w-48 mx-auto" />
                 <div className="max-w-sm mx-auto mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="aspect-[9/16] w-full rounded-lg" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>
        </div>
      )
  }

  return (
    <div className="container mx-auto">
       <div className="text-center mb-8">
        <div className="relative inline-block z-10">
            <div className="bg-primary text-primary-foreground font-bold tracking-wider py-4 px-8 text-lg rounded-full">
                Productos
            </div>
        </div>
        <div className="max-w-sm mx-auto bg-brand-purple text-primary-foreground p-4 pt-8 -mt-7 rounded-2xl">
            <p className="text-sm">
            ¿Se te antoja un helado? tenemos una deliciosa variedad esperándote. encuentra tu bresler favorito en distintos puntos de venta a lo largo de chile y date un gusto refrescante en cualquier momento.
            </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {staticCategories.map((category) => (
            <Card key={category.id} className="flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 group">
                <Link href={`/dashboard/category/${encodeURIComponent(category.name)}`} className="block">
                    <div className="relative aspect-[9/16] w-full bg-muted">
                        <Image
                        src={transformGoogleDriveUrl(category.imageUrl)}
                        alt={`Categoría ${category.name}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        data-ai-hint={category['data-ai-hint']}
                        priority={true}
                        />
                    </div>
                </Link>
                <CardHeader className="flex-grow">
                    <CardTitle className="font-headline text-xl text-center">{category.name}</CardTitle>
                </CardHeader>
                <CardFooter>
                    <Link href={`/dashboard/category/${encodeURIComponent(category.name)}`} className="w-full">
                        <Button className="w-full">
                            <IceCream2 className="mr-2 h-4 w-4" />
                            Ver Productos
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
          ))}
      </div>
      <div className="mt-12 text-center">
        <Link href="https://wa.me/56976041965" target="_blank" rel="noopener noreferrer">
            <Image
                src={transformGoogleDriveUrl("https://drive.google.com/file/d/1OiomBuwfFAuqXmNhFAACLDeyisXnURXP/view?usp=drive_link")}
                alt="Botón de WhatsApp"
                width={200}
                height={58}
                className="h-auto inline-block transition-transform hover:scale-105"
            />
        </Link>
      </div>
    </div>
  );
}
