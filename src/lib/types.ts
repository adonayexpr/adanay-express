
import type { FieldValue, Timestamp } from 'firebase/firestore';

export type ProductCategory = 'Individual' | 'Familiar';

export type Product = {
  id: string;
  name: string;
  code?: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  category: ProductCategory;
  'data-ai-hint'?: string;
  isVisible: boolean;
};

export type OrderItem = {
  product: Product; // Store the full product object
  quantity: number;
};

export type OrderStatus = 'Pendiente' | 'Recibido' | 'Aceptado' | 'En Reparto' | 'Completado' | 'Cancelado';

export type Order = {
  id: string;
  orderNumber: string; // The user-facing order ID is now the document ID (string)
  userId: string;
  userNickname: string;
  items: OrderItem[];
  status: OrderStatus;
  date: Timestamp | FieldValue;
  total: number;
  createdByAdmin?: boolean;
  batchId?: string; // New optional field for batch/shift tracking
};

export type User = {
  id: string;
  name: string;
  email: string;
  rut: string;
  nickname: string;
  role: 'admin' | 'user';
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  product: Product; // Also store the full product object here for convenience
}
