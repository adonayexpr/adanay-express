
import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const statusStyles: Record<OrderStatus, string> = {
    "Pendiente": "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800",
    "Recibido": "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-900/50 dark:text-gray-200 dark:border-gray-800",
    "Aceptado": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800",
    "En Reparto": "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800",
    "Completado": "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-800",
    "Cancelado": "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800",
  };

  return <Badge className={statusStyles[status] || statusStyles["Pendiente"]}>{status}</Badge>;
}
