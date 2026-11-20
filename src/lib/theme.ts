import type { DeliveryType, Order, PaymentMethod, PaymentStatus, StoreConfig } from './types';

export const C = {
  // Surfaces
  bg: '#FBF7F9',
  bgAlt: '#F6EFF3',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF8FB',
  overlay: 'rgba(33, 26, 43, 0.45)',

  // Text
  ink: '#211A2B',
  inkSoft: '#4A4058',
  muted: '#7A6E88',

  // Lines
  border: '#EADCE4',
  borderStrong: '#D8C3D0',

  // Brand
  pink: '#C93A72', // primary action + text on light (4.8:1 on white)
  pinkBright: '#E5568F', // decorative only
  pinkSoft: '#FBE0EC',
  pinkWash: '#FFF1F7',

  // Secondary / fandom
  yellow: '#F2C230',
  yellowDeep: '#A96B00',
  yellowSoft: '#FFF6D9',
  blue: '#3F6FE0',
  blueSoft: '#E8EFFF',
  purple: '#7A4FD0',
  purpleSoft: '#F1EBFF',

  // Semantic
  red: '#C93B44',
  redSoft: '#FDEBEC',
  green: '#247A50',
  greenSoft: '#E7F6EE',
} as const;

export const CURRENCY = 'Bs';

export const money = (n: number) => {
  const [int, dec] = Number(n || 0).toFixed(2).split('.');
  return `${CURRENCY} ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
};

export const CATEGORIES = [
  'Guitarras',
  'Bajos',
  'Baterías',
  'Teclados',
  'Amplificadores',
  'Accesorios',
];

export const FANDOM: Record<string, { label: string; short: string; color: string }> = {
  bocchi: { label: 'Bocchi the Rock!', short: 'Bocchi', color: C.pink },
  kon: { label: 'K-On!', short: 'K-On!', color: C.blue },
  both: { label: 'Bocchi × K-On!', short: 'Crossover', color: C.yellowDeep },
};

/** Paleta corta para elegir el color de una etiqueta de fandom en Ajustes. */
export const FANDOM_PALETTE = [
  { label: 'Rosa', color: C.pink },
  { label: 'Azul', color: C.blue },
  { label: 'Morado', color: C.purple },
  { label: 'Dorado', color: C.yellowDeep },
  { label: 'Verde', color: C.green },
  { label: 'Rojo', color: C.red },
];

export const STATUS_COLOR: Record<string, string> = {
  pendiente: C.yellowDeep,
  preparando: C.blue,
  enviado: C.pink,
  entregado: C.green,
  cancelado: C.red,
};

export const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const STATUS_ORDER: { key: keyof typeof STATUS_LABEL; label: string; icon: string }[] = [
  { key: 'pendiente', label: 'Pendiente', icon: 'receipt-outline' },
  { key: 'preparando', label: 'Preparando', icon: 'construct-outline' },
  { key: 'enviado', label: 'Enviado', icon: 'bicycle-outline' },
  { key: 'entregado', label: 'Entregado', icon: 'checkmark-circle-outline' },
];

export const DELIVERY_LABEL: Record<DeliveryType, string> = {
  delivery: 'Envío a domicilio',
  pickup: 'Recoger en tienda',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  qr: 'Pago con QR',
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo contra entrega',
  tarjeta: 'Tarjeta (coordinar)',
};

/** Orden en el que se muestran los métodos: QR primero para que se vea. */
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  'qr',
  'transferencia',
  'efectivo',
  'tarjeta',
];

export const PAYMENT_DESCRIPTION: Record<PaymentMethod, string> = {
  qr: 'Escanea el QR de la tienda desde tu banca móvil y sube el comprobante.',
  transferencia: 'Transfiere a la cuenta de la tienda y sube el comprobante.',
  efectivo: 'Pagas al recibir el pedido o al recogerlo en la tienda.',
  tarjeta: 'Coordinamos el cobro contigo al confirmar el pedido.',
};

export const PAYMENT_ICON: Record<PaymentMethod, string> = {
  qr: 'qr-code-outline',
  transferencia: 'swap-horizontal-outline',
  efectivo: 'cash-outline',
  tarjeta: 'card-outline',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  no_requiere: 'Sin comprobante',
  sin_comprobante: 'Falta comprobante',
  en_revision: 'En revisión',
  verificado: 'Pago verificado',
  rechazado: 'Comprobante rechazado',
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  no_requiere: C.muted,
  sin_comprobante: C.yellowDeep,
  en_revision: C.blue,
  verificado: C.green,
  rechazado: C.red,
};

export const paymentNeedsProof = (method?: PaymentMethod | string | null) =>
  method === 'qr' || method === 'transferencia';

/** Compatibilidad con pedidos antiguos que no guardaban `paymentStatus`. */
export const paymentStatusOf = (order: Pick<Order, 'paymentMethod' | 'paymentStatus'>): PaymentStatus => {
  if (order.paymentStatus) return order.paymentStatus;
  return paymentNeedsProof(order.paymentMethod) ? 'sin_comprobante' : 'no_requiere';
};

// Cambia estos valores desde el panel de administración → Ajustes.
export const STORE: StoreConfig = {
  name: 'KESUUBIT',
  address: 'Oruro, Bolivia',
  lat: -17.9647,
  lng: -67.106,
  hours: 'Lun–Sáb 10:00–20:00',
  phone: '',
  whatsapp: '',
  email: '',
  shippingCost: 25,
  freeShippingThreshold: 500,
  announcement: 'Envío gratis en pedidos desde Bs 500 · Instrumentos con actitud de banda.',
  deliveryEnabled: true,
  pickupEnabled: true,
  qrImage: '',
  paymentHolder: '',
  paymentInstructions: '',
};
