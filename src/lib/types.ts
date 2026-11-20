export type Fandom = 'bocchi' | 'kon' | 'both';

/** Colección temática gestionable desde administración. */
export type Collection = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  fandom: Fandom;
  price: number;
  /** Precio anterior. Si es mayor que `price`, la tarjeta muestra la bajada. */
  previousPrice?: number | null;
  /** Umbral propio de "últimas unidades". Si falta, se usa LOW_STOCK_THRESHOLD. */
  lowStockThreshold?: number | null;
  /** Colección a la que pertenece el producto. */
  collectionId?: string | null;
  stock: number;
  description: string;
  specs: { k: string; v: string }[];
  image?: string;
  imageUrl?: string;
  featured?: boolean;
};

export type OrderStatus = 'pendiente' | 'preparando' | 'enviado' | 'entregado' | 'cancelado';

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  imageUrl?: string;
};

export type OrderStatusEntry = {
  status: OrderStatus;
  at?: any;
  by?: string;
  byName?: string;
  note?: string;
};

export type DeliveryType = 'delivery' | 'pickup';
export type PaymentMethod = 'efectivo' | 'qr' | 'transferencia' | 'tarjeta';

/**
 * Estado del comprobante de pago. `no_requiere` se usa en efectivo/tarjeta;
 * `sin_comprobante` en QR/transferencia hasta que el cliente sube la captura.
 */
export type PaymentStatus =
  | 'no_requiere'
  | 'sin_comprobante'
  | 'en_revision'
  | 'verificado'
  | 'rechazado';

export type PaymentProof = {
  orderId: string;
  userId: string;
  image: string;
  amount: number;
  createdAt?: any;
  updatedAt?: any;
};

export type Order = {
  id: string;
  orderNumber?: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  subtotal?: number;
  shipping?: number;
  total: number;
  address: string;
  phone?: string;
  notes?: string;
  deliveryType?: DeliveryType;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  proofUploadedAt?: any;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: any;
  paymentRejectedReason?: string;
  status: OrderStatus;
  statusHistory?: OrderStatusEntry[];
  createdAt?: any;
  updatedAt?: any;
  cancelledAt?: any;
};

export type Profile = {
  uid: string;
  email: string;
  name: string;
  role: 'client' | 'admin';
  favorites: string[];
  photo?: string;
  pushToken?: string;
  pushTokenUpdatedAt?: any;
  createdAt?: any;
};

export type Review = {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  text: string;
  createdAt?: any;
  updatedAt?: any;
};

export type NotificationType =
  | 'order_created'
  | 'order_status'
  | 'order_cancelled'
  | 'payment_proof'
  | 'payment_verified'
  | 'payment_rejected'
  | 'welcome'
  | 'test';

export type AppNotification = {
  id: string;
  userId?: string | null;
  audience?: 'admin' | null;
  type: NotificationType;
  title: string;
  body: string;
  orderId?: string;
  read?: boolean;
  readAt?: any;
  readBy?: string[];
  createdAt?: any;
};

export type StoreConfig = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  phone: string;
  whatsapp: string;
  email: string;
  shippingCost: number;
  freeShippingThreshold: number;
  announcement: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  /** Imagen del QR de la banca móvil, guardada como data URL JPEG. */
  qrImage?: string;
  /** Titular de la cuenta que recibe el pago. */
  paymentHolder?: string;
  /** Instrucciones extra para pagar por QR o transferencia. */
  paymentInstructions?: string;
};

export type CheckoutInput = {
  userId: string;
  userEmail: string;
  customerName: string;
  address: string;
  phone?: string;
  notes?: string;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  items: { productId: string; qty: number }[];
};
