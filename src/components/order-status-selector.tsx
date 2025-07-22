
"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus } from "@/lib/types";

interface OrderStatusSelectorProps {
  currentStatus: OrderStatus;
  onStatusChange: (newStatus: OrderStatus) => void;
  disabled?: boolean;
}

const statuses: OrderStatus[] = [
  "Pendiente",
  "Recibido",
  "Aceptado",
  "En Reparto",
  "Completado",
  "Cancelado",
];

export function OrderStatusSelector({ currentStatus, onStatusChange, disabled = false }: OrderStatusSelectorProps) {
  return (
    <Select value={currentStatus} onValueChange={onStatusChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Cambiar estado" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
