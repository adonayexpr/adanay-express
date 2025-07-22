
"use client"

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Play, Square, Info } from "lucide-react";

export function BatchManager() {
  const { activeBatchId, startBatch, endBatch } = useAuth();
  const [newBatchId, setNewBatchId] = useState("");
  const [error, setError] = useState("");

  const handleStartBatch = () => {
    if (!newBatchId.trim()) {
      setError("El código de lote no puede estar vacío.");
      return;
    }
    setError("");
    startBatch(newBatchId.trim());
    setNewBatchId("");
  };

  if (activeBatchId) {
    return (
      <Alert className="mb-4 border-green-500/50">
        <Play className="h-4 w-4 !text-green-500" />
        <AlertTitle className="text-green-600 dark:text-green-400">Lote de Venta Activo</AlertTitle>
        <AlertDescription className="flex justify-between items-center">
          <div>
            Todos los pedidos se registrarán bajo el código: <strong className="font-mono">{activeBatchId}</strong>
          </div>
          <Button onClick={endBatch} size="sm">
            <Square className="mr-2 h-4 w-4" />
            Finalizar Lote
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-4">
        <CardTitle className="font-headline text-lg">Iniciar un Nuevo Lote de Venta</CardTitle>
        <CardDescription>
          Ingresa un código único para agrupar los próximos pedidos (ej: "Lunes-PM", "Caja-1", "Evento-Verano").
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2">
            <Input 
                type="text" 
                placeholder="Código de Lote"
                value={newBatchId}
                onChange={(e) => setNewBatchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartBatch()}
            />
            <Button onClick={handleStartBatch} className="bg-yellow-400 text-black hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600">
                <Play className="mr-2 h-4 w-4" />
                Iniciar Lote
            </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
