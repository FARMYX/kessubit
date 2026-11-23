import type { DeliveryType, Order, PaymentMethod, PaymentStatus, StoreConfig } from './types';

export type Palette = {
  bg: string;
  bgAlt: string;
  card: string;
  surface: string;
  surfaceAlt: string;
  overlay: string;
  glass: string;
  glassBorder: string;
  ink: string;
  inkSoft: string;
  muted: string;
  border: string;
  borderStrong: string;
  pink: string;
  pinkBright: string;
  pinkSoft: string;
  pinkWash: string;
  onPink: string;
  yellow: string;
  yellowDeep: string;
  yellowSoft: string;
  blue: string;
  blueSoft: string;
  purple: string;
  purpleSoft: string;
  red: string;
  redSoft: string;
  green: string;
  greenSoft: string;
};

export const LIGHT_PALETTE: Palette = {
  bg: '#FBF7F9',
  bgAlt: '#F6EFF3',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF8FB',
  overlay: 'rgba(33, 26, 43, 0.45)',
  glass: 'rgba(255,255,255,0.78)',
  glassBorder: 'rgba(255,255,255,0.95)',
  ink: '#211A2B',
  inkSoft: '#4A4058',
  muted: '#7A6E88',
  border: '#EADCE4',
  borderStrong: '#D8C3D0',
  pink: '#C93A72', // primary action + text on light (4.8:1 on white)
  pinkBright: '#E5568F', // decorative only
  pinkSoft: '#FBE0EC',
  pinkWash: '#FFF1F7',
  onPink: '#FFFFFF',
  yellow: '#F2C230',
  yellowDeep: '#A96B00',
  yellowSoft: '#FFF6D9',
  blue: '#3F6FE0',
  blueSoft: '#E8EFFF',
  purple: '#7A4FD0',
  purpleSoft: '#F1EBFF',
  red: '#C93B44',
  redSoft: '#FDEBEC',
  green: '#247A50',
  greenSoft: '#E7F6EE',
};

/** Tema oscuro: fondos ciruela profunda y textos cálidos, sin blanco puro. */
export const DARK_PALETTE: Palette = {
  bg: '#14101A',
  bgAlt: '#1C1524',
  card: '#221A2D',
  surface: '#1B1524',
  surfaceAlt: '#2A2036',
  overlay: 'rgba(8, 5, 12, 0.68)',
  glass: 'rgba(34,26,45,0.86)',
  glassBorder: 'rgba(82,67,95,0.9)',
  ink: '#F7F1F6',
  inkSoft: '#D8CEDF',
  muted: '#A99AB5',
  border: '#3A3046',
  borderStrong: '#52435F',
  pink: '#E85C90',
  pinkBright: '#FF8DBA',
  pinkSoft: '#482437',
  pinkWash: '#2E1D2A',
  onPink: '#1A1220',
  yellow: '#F5C94A',
  yellowDeep: '#E0A93A',
  yellowSoft: '#3A301A',
  blue: '#7EA2FF',
  blueSoft: '#222E4A',
  purple: '#B792F5',
  purpleSoft: '#2E2445',
  red: '#FF7B83',
  redSoft: '#422126',
  green: '#5BD39B',
  greenSoft: '#1B3A2C',
};

/**
 * Paleta activa. Se muta en `applyPalette` para que cada pantalla, que ya lee
 * `C.*` al renderizar, adopte el tema sin replicar el color en cada archivo.
 */
export const C: Palette = { ...LIGHT_PALETTE };

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
  bocchi: { label: 'Bocchi the Rock!', short: 'Bocchi', get color() { return C.pink; } },
  kon: { label: 'K-On!', short: 'K-On!', get color() { return C.blue; } },
  both: { label: 'Bocchi × K-On!', short: 'Crossover', get color() { return C.yellowDeep; } },
};

/** Paleta corta para elegir el color de una etiqueta de fandom en Ajustes. */
export const FANDOM_PALETTE = [
  { label: 'Rosa', get color() { return C.pink; } },
  { label: 'Azul', get color() { return C.blue; } },
  { label: 'Morado', get color() { return C.purple; } },
  { label: 'Dorado', get color() { return C.yellowDeep; } },
  { label: 'Verde', get color() { return C.green; } },
  { label: 'Rojo', get color() { return C.red; } },
];

export const STATUS_COLOR: Record<string, string> = {
  get pendiente() { return C.yellowDeep; },
  get preparando() { return C.blue; },
  get enviado() { return C.pink; },
  get entregado() { return C.green; },
  get cancelado() { return C.red; },
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
};

/** Pedidos antiguos podían guardar métodos que ya no se ofrecen. */
export const paymentLabel = (method?: PaymentMethod | string | null) =>
  (method && PAYMENT_LABEL[method as PaymentMethod]) || 'Pago coordinado';

/** Orden en el que se muestran los métodos: QR primero para que se vea. */
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ['qr', 'transferencia', 'efectivo'];

export const PAYMENT_DESCRIPTION: Record<PaymentMethod, string> = {
  qr: 'Escanea el QR de la tienda desde tu banca móvil y sube el comprobante.',
  transferencia: 'Transfiere a la cuenta de la tienda y sube el comprobante.',
  efectivo: 'Pagas al recibir el pedido o al recogerlo en la tienda.',
};

export const PAYMENT_ICON: Record<PaymentMethod, string> = {
  qr: 'qr-code-outline',
  transferencia: 'swap-horizontal-outline',
  efectivo: 'cash-outline',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  no_requiere: 'Sin comprobante',
  sin_comprobante: 'Falta comprobante',
  en_revision: 'En revisión',
  verificado: 'Pago verificado',
  rechazado: 'Comprobante rechazado',
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  get no_requiere() { return C.muted; },
  get sin_comprobante() { return C.yellowDeep; },
  get en_revision() { return C.blue; },
  get verificado() { return C.green; },
  get rechazado() { return C.red; },
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
  heroImage: '',
  heroTitle: '',
  heroSubtitle: '',
  paymentHolder: '',
  paymentInstructions: '',
  bankName: '',
  bankAccountNumber: '',
  bankDocument: '',
};

/** Aplica la paleta activa; los mapas derivados leen `C` mediante getters. */
export function applyPalette(palette: Palette) {
  Object.assign(C, palette);
}
