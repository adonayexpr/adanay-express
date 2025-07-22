
"use client"

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth"; 
import { db } from "@/lib/firebase"; // Corrected import
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { saveAs } from "file-saver";
import { Download, Upload, Loader2, AlertTriangle, Eraser, Trash2 } from "lucide-react";

export default function BackupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isDeletingProducts, setIsDeletingProducts] = useState(false);
  const [isDeletingOrders, setIsDeletingOrders] = useState(false);

  if (!authLoading && user?.role !== 'admin') {
    router.push('/dashboard');
    toast({
      variant: "destructive",
      title: "Acceso Denegado",
      description: "No tienes permisos para acceder a esta página.",
    });
    return null;
  }

  const collectionsToBackup = ['users', 'products', 'orders'];

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    toast({ title: "Iniciando respaldo...", description: "Recolectando datos de la base de datos." });

    try {
      const backupData: { [key: string]: any[] } = {};
      for (const collectionName of collectionsToBackup) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        backupData[collectionName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json;charset=utf-8" });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(blob, `adonay-express-backup-de-datos-${timestamp}.json`);

      toast({ title: "Respaldo de Datos Creado", description: "El archivo de respaldo se ha descargado exitosamente." });
    } catch (error) {
      console.error("Error creating backup:", error);
      toast({ variant: "destructive", title: "Error en el Respaldo", description: "No se pudo crear el archivo de respaldo." });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo de respaldo." });
      return;
    }

    setIsRestoring(true);
    toast({ title: "Iniciando restauración...", description: "Por favor, no cierres esta ventana." });

    try {
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);

      for (const collectionName of collectionsToBackup) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const deleteBatch = writeBatch(db);
        querySnapshot.docs.forEach(docSnapshot => {
          deleteBatch.delete(doc(db, collectionName, docSnapshot.id));
        });
        await deleteBatch.commit();
      }
      toast({ title: "Datos antiguos eliminados", description: "Preparando para escribir nuevos datos." });

      const writeBatchOp = writeBatch(db);
      for (const collectionName of collectionsToBackup) {
        if (backupData[collectionName]) {
          backupData[collectionName].forEach((item: any) => {
            const { id, ...data } = item;
            const docRef = doc(db, collectionName, id);
            writeBatchOp.set(docRef, data);
          });
        }
      }
      await writeBatchOp.commit();

      toast({ title: "Restauración de Datos Completada", description: "Los datos de la aplicación han sido restaurados. Se recomienda recargar la página." });
      setRestoreFile(null);
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast({ variant: "destructive", title: "Error en la Restauración", description: "El archivo podría estar corrupto o no tener el formato correcto." });
    } finally {
      setIsRestoring(false);
    }
  };
  
  const handleDeleteCollection = async (collectionName: 'products' | 'orders') => {
    const setLoading = collectionName === 'products' ? setIsDeletingProducts : setIsDeletingOrders;
    const collectionLabel = collectionName === 'products' ? 'productos' : 'pedidos';

    setLoading(true);
    toast({ title: `Eliminando todos los ${collectionLabel}...`, description: "Esta operación puede tardar unos segundos." });

    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        if (querySnapshot.empty) {
            toast({ title: "No hay datos que eliminar", description: `La colección de ${collectionLabel} ya está vacía.` });
            setLoading(false);
            return;
        }

        const batch = writeBatch(db);
        querySnapshot.docs.forEach(docSnapshot => {
            batch.delete(doc(db, collectionName, docSnapshot.id));
        });
        await batch.commit();

        toast({ title: `${collectionLabel.charAt(0).toUpperCase() + collectionLabel.slice(1)} eliminados`, description: `Todos los ${collectionLabel} han sido borrados de la base de datos.` });
    } catch (error) {
        console.error(`Error deleting ${collectionName}:`, error);
        toast({ variant: "destructive", title: `Error al eliminar ${collectionLabel}`, description: "No se pudieron eliminar los datos. Inténtalo de nuevo." });
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Download /> Respaldo y Restauración de Datos</CardTitle>
          <CardDescription>
            Genera una copia de seguridad de los **datos** de la aplicación (usuarios, productos y pedidos). 
            Esto NO respalda el código ni el diseño de la app. Se descargará un archivo JSON a tu computador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateBackup} disabled={isBackingUp}>
            {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isBackingUp ? "Creando Respaldo..." : "Crear y Descargar Respaldo de Datos"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-orange-500/50">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2 text-orange-600 dark:text-orange-500"><Upload /> Restaurar Datos desde Respaldo</CardTitle>
          <CardDescription className="flex items-start gap-2 text-orange-600/80 dark:text-orange-500/80">
            <AlertTriangle className="h-4 w-4 mt-1 shrink-0" />
            <span>
              <strong>¡Acción peligrosa!</strong> Restaurar un respaldo primero borrará TODOS los datos actuales
              (usuarios, productos, pedidos) y los reemplazará con los datos del archivo. Esta acción no afecta el código de la aplicación.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="restore-file" className="text-sm font-medium">Seleccionar archivo de respaldo (.json)</label>
            <Input
              id="restore-file"
              type="file"
              accept=".json"
              onChange={(e) => setRestoreFile(e.target.files ? e.target.files[0] : null)}
              className="mt-1"
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" className="border-orange-500/50" disabled={isRestoring || !restoreFile}>
                {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-4 w-4" />}
                {isRestoring ? "Restaurando Datos..." : "Borrar y Restaurar Datos"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto borrará permanentemente todos los datos actuales de la aplicación y los
                  reemplazará con el contenido del archivo <strong>{restoreFile?.name}</strong>.
                  No podrás recuperar los datos actuales después de esto.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestoreBackup}>
                  Sí, borrar y restaurar datos
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      
      <Card className="border-destructive">
         <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2 text-destructive"><AlertTriangle/> Zona de Peligro</CardTitle>
            <CardDescription className="text-destructive/80">
                Estas acciones son irreversibles y eliminarán datos de forma masiva de la base de datos.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
            {/* Delete Products */}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive" disabled={isDeletingProducts}>
                        {isDeletingProducts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {isDeletingProducts ? 'Eliminando...' : 'Eliminar TODOS los Productos'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmas la eliminación de TODOS los productos?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Esta acción borrará permanentemente todo el catálogo de productos. Es irreversible.
                           Los pedidos existentes que contengan estos productos no se verán afectados, pero los productos ya no existirán para futuros pedidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>No, cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCollection('products')} className="bg-destructive hover:bg-destructive/90">
                           Sí, eliminar todos los productos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Orders */}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeletingOrders}>
                        {isDeletingOrders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {isDeletingOrders ? 'Eliminando...' : 'Eliminar TODOS los Pedidos'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmas la eliminación de TODOS los pedidos?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Esta acción borrará permanentemente todos los pedidos del sistema (activos y archivados). Es completamente irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>No, cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCollection('orders')} className="bg-destructive hover:bg-destructive/90">
                           Sí, eliminar todos los pedidos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
    
