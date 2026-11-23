import {
  arrayUnion,
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { STORE, money, paymentNeedsProof, paymentStatusOf } from './theme';
import type {
  CheckoutInput,
  Order,
  OrderItem,
  OrderStatus,
  StoreConfig,
} from './types';

export type CreateOrderResult = {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  shipping: number;
  total: number;
};

type StatusStep = Exclude<OrderStatus, 'cancelado'>;

const DELIVERY_TYPES: CheckoutInput['deliveryType'][] = ['delivery', 'pickup'];
const PAYMENT_METHODS: CheckoutInput['paymentMethod'][] = ['efectivo', 'qr', 'transferencia'];
const IDEMPOTENCY_RE = /^[A-Za-z0-9_-]{8,64}$/;
/** Firestore limita el documento a 1 MiB; dejamos margen para los metadatos. */
const PROOF_MAX_CHARS = 900_000;

const STATUS_COPY: Record<StatusStep, { title: string; body: (code: string) => string }> = {
  pendiente: { title: 'Pedido recibido', body: (code) => `${code} está pendiente de confirmación.` },
  preparando: { title: 'Estamos preparando tu pedido', body: (code) => `${code} ya está en preparación.` },
  enviado: { title: 'Tu pedido va en camino', body: (code) => `${code} fue enviado.` },
  entregado: { title: 'Pedido entregado', body: (code) => `${code} llegó a su destino. ¡Gracias!` },
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const cleanItems = (items: CheckoutInput['items']) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Tu carrito está vacío.');
  }
  if (items.length > 50) {
    throw new Error('El carrito tiene demasiadas líneas.');
  }

  const merged = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new Error('Hay un producto inválido en tu carrito.');
    }
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    if (
      !productId ||
      productId.length > 128 ||
      productId.includes('/') ||
      productId === '.' ||
      productId === '..'
    ) {
      throw new Error('Hay un producto inválido en tu carrito.');
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new Error('Revisa las cantidades de tu carrito.');
    }
    merged.set(productId, (merged.get(productId) || 0) + qty);
  }

  const cleaned = Array.from(merged, ([productId, qty]) => ({ productId, qty }));
  if (cleaned.some((item) => item.qty > 99)) {
    throw new Error('Revisa las cantidades de tu carrito.');
  }
  const totalQty = cleaned.reduce((sum, item) => sum + item.qty, 0);
  if (totalQty > 100) {
    throw new Error('El pedido supera el máximo de 100 unidades.');
  }
  return cleaned;
};

const shippingFor = (
  subtotal: number,
  config: StoreConfig,
  deliveryType: CheckoutInput['deliveryType']
) => {
  if (deliveryType !== 'delivery') return 0;
  const threshold = Number(config.freeShippingThreshold || 0);
  if (subtotal >= threshold) return 0;
  return Math.max(0, Number(config.shippingCost || 0));
};

const orderCode = (order: Order, orderId: string) => {
  if (order.orderNumber && order.orderNumber.trim()) return order.orderNumber;
  return `KG-${orderId.slice(0, 6).toUpperCase()}`;
};

/**
 * Stable per checkout attempt. Reusing it on a retry lets the transaction
 * return the original order instead of reserving stock twice.
 */
export function newIdempotencyKey(): string {
  const random = () => Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${random()}${random()}`;
}

/**
 * Creates an order in a client-side Firestore transaction because the project
 * runs on the free Spark plan. Prices, shipping and stock are read from
 * Firestore, never from the cart, and the whole operation is atomic.
 *
 * The idempotency key doubles as the order document id, so a retry after a
 * lost response returns the same order instead of duplicating stock.
 *
 * The hardened Cloud Functions path lives in `functions/` and can replace this
 * transaction when the project moves to Blaze.
 */
export async function createOrder(
  input: CheckoutInput,
  idempotencyKey: string
): Promise<CreateOrderResult> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Inicia sesión para confirmar el pedido.');
  }
  if (current.uid !== input.userId) {
    throw new Error('La sesión cambió. Recarga la pantalla e inténtalo otra vez.');
  }
  if (!IDEMPOTENCY_RE.test(idempotencyKey)) {
    throw new Error(
      'No pudimos identificar este intento de compra. Recarga la pantalla e inténtalo otra vez.'
    );
  }

  const customerName = String(input.customerName || '').trim();
  if (customerName.length < 2 || customerName.length > 80) {
    throw new Error('Escribe el nombre de quien recibe.');
  }
  if (!DELIVERY_TYPES.includes(input.deliveryType)) {
    throw new Error('Elige cómo quieres recibir tu pedido.');
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    throw new Error('Elige un método de pago.');
  }

  const address = String(input.address || '').trim();
  const phone = String(input.phone || '').trim().slice(0, 30);
  const notes = String(input.notes || '').trim().slice(0, 500);
  if (address.length > 200) {
    throw new Error('La dirección es demasiado larga.');
  }
  if (input.deliveryType === 'delivery' && address.length < 5) {
    throw new Error('Escribe una dirección de entrega.');
  }

  const items = cleanItems(input.items);
  const orderRef = doc(db, 'orders', idempotencyKey);
  const counterRef = doc(db, 'counters', 'orders');
  const configRef = doc(db, 'storeConfig', 'settings');
  const productRefs = items.map((item) => doc(db, 'products', item.productId));
  const userNotificationRef = doc(collection(db, 'notifications'));
  const adminNotificationRef = doc(collection(db, 'notifications'));

  return runTransaction(db, async (tx) => {
    // Idempotent replay: same key + same user returns the original order.
    const existingSnap = await tx.get(orderRef);
    if (existingSnap.exists()) {
      const existing = existingSnap.data() as Order;
      if (existing.userId !== current.uid) {
        throw new Error('Ese identificador de pedido ya está en uso.');
      }
      return {
        orderId: orderRef.id,
        orderNumber: String(existing.orderNumber || ''),
        subtotal: Number(existing.subtotal || 0),
        shipping: Number(existing.shipping || 0),
        total: Number(existing.total || 0),
      };
    }

    // --- reads (all reads happen before any write) ---
    const [counterSnap, configSnap, ...productSnaps] = await Promise.all([
      tx.get(counterRef),
      tx.get(configRef),
      ...productRefs.map((ref) => tx.get(ref)),
    ]);

    const config: StoreConfig = {
      ...STORE,
      ...((configSnap.exists() ? configSnap.data() : {}) as Partial<StoreConfig>),
    };

    if (input.deliveryType === 'delivery' && config.deliveryEnabled === false) {
      throw new Error('El envío a domicilio no está disponible ahora mismo.');
    }
    if (input.deliveryType === 'pickup' && config.pickupEnabled === false) {
      throw new Error('El retiro en tienda no está disponible ahora mismo.');
    }

    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (let index = 0; index < productSnaps.length; index += 1) {
      const snap = productSnaps[index];
      const requested = items[index];
      if (!snap.exists()) {
        throw new Error('Un producto de tu carrito ya no está disponible.');
      }

      const product = snap.data() as Record<string, unknown>;
      const stock = Math.max(0, Math.floor(Number(product.stock || 0)));
      if (!Number.isFinite(stock) || stock < requested.qty) {
        throw new Error(
          `Solo quedan ${stock} de ${String(product.name || 'un producto')}.`
        );
      }

      const price = Number(product.price || 0);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Un producto tiene un precio inválido.');
      }

      subtotal += price * requested.qty;
      const orderItem: OrderItem = {
        id: snap.id,
        name: String(product.name || 'Producto'),
        price,
        qty: requested.qty,
      };
      // Firestore rejects `undefined`; only include optional images when set.
      if (typeof product.image === 'string' && product.image) orderItem.image = product.image;
      if (typeof product.imageUrl === 'string' && product.imageUrl) {
        orderItem.imageUrl = product.imageUrl;
      }
      orderItems.push(orderItem);
    }

    subtotal = round2(subtotal);
    const shipping = round2(shippingFor(subtotal, config, input.deliveryType));
    const total = round2(subtotal + shipping);
    const counterValue = Number(counterSnap.exists() ? counterSnap.data()?.value || 0 : 0);
    const nextNumber =
      Number.isFinite(counterValue) && counterValue >= 0 ? Math.floor(counterValue) + 1 : 1;
    const orderNumber = `KG-${String(nextNumber).padStart(4, '0')}`;
    const now = Timestamp.now();
    const deliveryAddress =
      input.deliveryType === 'pickup' ? String(config.address || '') : address;
    const paymentStatus = paymentNeedsProof(input.paymentMethod)
      ? 'sin_comprobante'
      : 'no_requiere';

    // --- writes ---
    tx.set(
      counterRef,
      { value: nextNumber, updatedAt: serverTimestamp() },
      { merge: true }
    );

    tx.set(orderRef, {
      orderNumber,
      idempotencyKey,
      userId: current.uid,
      userEmail: current.email || input.userEmail || '',
      userName: customerName,
      items: orderItems,
      subtotal,
      shipping,
      total,
      address: deliveryAddress,
      phone,
      notes,
      deliveryType: input.deliveryType,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      status: 'pendiente',
      statusHistory: [
        { status: 'pendiente', at: now, by: current.uid, byName: customerName },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    productSnaps.forEach((snap, index) => {
      tx.update(snap.ref, { stock: increment(-items[index].qty) });
    });

    tx.set(userNotificationRef, {
      userId: current.uid,
      audience: null,
      type: 'order_created',
      title: 'Pedido confirmado',
      body: `${orderNumber} · ${orderItems.length} producto(s) · ${money(total)}`,
      orderId: orderRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    tx.set(adminNotificationRef, {
      userId: null,
      audience: 'admin',
      type: 'order_created',
      title: 'Nuevo pedido',
      body: `${customerName} · ${orderNumber} · ${money(total)}`,
      orderId: orderRef.id,
      readBy: [],
      createdAt: serverTimestamp(),
    });

    return { orderId: orderRef.id, orderNumber, subtotal, shipping, total };
  });
}

export type PaymentDecision = 'verificado' | 'rechazado';

function cleanProofImage(image: string): string {
  const value = String(image || '');
  if (!value.startsWith('data:image/')) {
    throw new Error('El comprobante debe ser una imagen.');
  }
  if (value.length > PROOF_MAX_CHARS) {
    throw new Error('La imagen es demasiado grande. Prueba con otra captura.');
  }
  return value;
}

/**
 * El cliente sube la captura de su banca móvil después de confirmar el pedido.
 * La imagen vive en `paymentProofs/{orderId}` para no inflar la lista de pedidos
 * que leen el panel y el dashboard. El pedido solo guarda los metadatos.
 */
export async function submitPaymentProof(
  orderId: string,
  image: string,
  amount: number
): Promise<{ orderId: string; paymentStatus: 'en_revision' }> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Inicia sesión para subir el comprobante.');
  }
  const cleanImage = cleanProofImage(image);
  const value = round2(Number(amount));
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
    throw new Error('Escribe el monto que pagaste.');
  }

  const orderRef = doc(db, 'orders', orderId);
  const proofRef = doc(db, 'paymentProofs', orderId);
  const notificationRef = doc(collection(db, 'notifications'));

  return runTransaction(db, async (tx) => {
    const [orderSnap, proofSnap] = await Promise.all([tx.get(orderRef), tx.get(proofRef)]);
    if (!orderSnap.exists()) {
      throw new Error('Pedido no encontrado.');
    }
    const order = orderSnap.data() as Order;
    if (order.userId !== current.uid) {
      throw new Error('No puedes subir un comprobante para este pedido.');
    }
    if (order.status === 'cancelado') {
      throw new Error('Este pedido está cancelado.');
    }
    if (!paymentNeedsProof(order.paymentMethod)) {
      throw new Error('Este pedido no requiere comprobante.');
    }
    if (paymentStatusOf(order) === 'verificado') {
      throw new Error('Este pago ya fue verificado por la tienda.');
    }

    tx.set(
      proofRef,
      {
        orderId,
        userId: current.uid,
        image: cleanImage,
        amount: value,
        createdAt: proofSnap.exists()
          ? proofSnap.data()?.createdAt ?? serverTimestamp()
          : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.update(orderRef, {
      paymentStatus: 'en_revision',
      paymentAmount: value,
      proofUploadedAt: serverTimestamp(),
      paymentRejectedReason: '',
      updatedAt: serverTimestamp(),
    });

    tx.set(notificationRef, {
      userId: null,
      audience: 'admin',
      type: 'payment_proof',
      title: 'Comprobante por verificar',
      body: `${orderCode(order, orderId)} · ${money(value)} · ${order.userName || 'Cliente'}`,
      orderId,
      readBy: [],
      createdAt: serverTimestamp(),
    });

    return { orderId, paymentStatus: 'en_revision' as const };
  });
}

/**
 * Solo el administrador decide si el pago llegó. El cliente recibe un aviso con
 * el resultado y, si se rechaza, puede volver a subir el comprobante.
 */
export async function verifyPayment(
  orderId: string,
  decision: PaymentDecision,
  reason?: string
): Promise<{ orderId: string; paymentStatus: PaymentDecision; unchanged: boolean }> {
  if (decision !== 'verificado' && decision !== 'rechazado') {
    throw new Error('Decisión de pago inválida.');
  }
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Inicia sesión para verificar el pago.');
  }

  const orderRef = doc(db, 'orders', orderId);
  const proofRef = doc(db, 'paymentProofs', orderId);
  const profileRef = doc(db, 'users', current.uid);
  const notificationRef = doc(collection(db, 'notifications'));

  return runTransaction(db, async (tx) => {
    const [orderSnap, proofSnap, profileSnap] = await Promise.all([
      tx.get(orderRef),
      tx.get(proofRef),
      tx.get(profileRef),
    ]);
    if (!orderSnap.exists()) {
      throw new Error('Pedido no encontrado.');
    }
    const profile = profileSnap.exists()
      ? (profileSnap.data() as Record<string, unknown>)
      : {};
    if (profile.role !== 'admin') {
      throw new Error('Solo la tienda puede verificar pagos.');
    }

    const order = orderSnap.data() as Order;
    if (!paymentNeedsProof(order.paymentMethod)) {
      throw new Error('Este pedido no requiere comprobante.');
    }
    if (order.status === 'cancelado') {
      throw new Error('Un pedido cancelado no se puede verificar.');
    }
    if (!proofSnap.exists()) {
      throw new Error('El cliente todavía no subió el comprobante.');
    }

    const currentStatus = paymentStatusOf(order);
    if (currentStatus === 'verificado') {
      if (decision === 'verificado') {
        return { orderId, paymentStatus: decision, unchanged: true };
      }
      throw new Error('Un pago ya verificado no se puede rechazar.');
    }

    const trimmedReason = String(reason || '').trim().slice(0, 300);
    if (decision === 'rechazado' && !trimmedReason) {
      throw new Error('Escribe el motivo del rechazo.');
    }

    const byName = String(profile.name || current.displayName || current.email || 'Admin');

    tx.update(orderRef, {
      paymentStatus: decision,
      verifiedBy: current.uid,
      verifiedByName: byName,
      verifiedAt: serverTimestamp(),
      paymentRejectedReason: decision === 'rechazado' ? trimmedReason : '',
      updatedAt: serverTimestamp(),
    });

    tx.set(notificationRef, {
      userId: String(order.userId || ''),
      audience: null,
      type: decision === 'verificado' ? 'payment_verified' : 'payment_rejected',
      title: decision === 'verificado' ? 'Pago verificado' : 'Comprobante rechazado',
      body:
        decision === 'verificado'
          ? `${orderCode(order, orderId)} · ${money(Number(order.paymentAmount || order.total))} confirmado.`
          : `${orderCode(order, orderId)} · ${trimmedReason}`,
      orderId,
      read: false,
      createdAt: serverTimestamp(),
    });

    return { orderId, paymentStatus: decision, unchanged: false };
  });
}

/**
 * Cancels an order and returns its units to stock. Customers may cancel while
 * the order is pending or being prepared; administrators may cancel until it
 * is delivered.
 */
export async function cancelOrder(orderId: string): Promise<{ orderId: string; status: 'cancelado' }> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Inicia sesión para cancelar el pedido.');
  }

  const orderRef = doc(db, 'orders', orderId);
  const profileRef = doc(db, 'users', current.uid);
  const notificationRef = doc(collection(db, 'notifications'));

  return runTransaction(db, async (tx) => {
    const [snap, profileSnap] = await Promise.all([tx.get(orderRef), tx.get(profileRef)]);
    if (!snap.exists()) {
      throw new Error('Pedido no encontrado.');
    }

    const order = snap.data() as Order;
    const profile = profileSnap.exists() ? (profileSnap.data() as Record<string, unknown>) : {};
    const admin = profile.role === 'admin';
    const owner = order.userId === current.uid;
    if (!owner && !admin) {
      throw new Error('No puedes cancelar este pedido.');
    }

    const currentStatus = String(order.status || '');
    if (currentStatus === 'cancelado') {
      throw new Error('Ese pedido ya está cancelado.');
    }
    if (currentStatus === 'entregado') {
      throw new Error('Un pedido entregado no se puede cancelar.');
    }
    if (!admin && currentStatus !== 'pendiente' && currentStatus !== 'preparando') {
      throw new Error('Ya no se puede cancelar: el pedido salió del local.');
    }

    const rawItems = Array.isArray(order.items) ? order.items : [];
    const items = rawItems.filter((item): item is OrderItem => {
      if (!item || typeof item !== 'object') return false;
      const id = (item as OrderItem).id;
      return typeof id === 'string' && !!id.trim() && !id.includes('/');
    });
    const productRefs = items.map((item) => doc(db, 'products', String(item.id)));
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    const byName = String(
      profile.name || current.displayName || current.email || order.userName || 'Usuario'
    );

    tx.update(orderRef, {
      status: 'cancelado',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion({
        status: 'cancelado',
        at: Timestamp.now(),
        by: current.uid,
        byName,
      }),
    });

    productSnaps.forEach((product, index) => {
      if (!product.exists()) return;
      const qty = Number(items[index]?.qty || 0);
      if (Number.isFinite(qty) && qty > 0) {
        tx.update(product.ref, { stock: increment(qty) });
      }
    });

    tx.set(notificationRef, {
      userId: String(order.userId || ''),
      audience: null,
      type: 'order_cancelled',
      title: 'Pedido cancelado',
      body: `${orderCode(order, orderId)} fue cancelado y el stock volvió a la tienda.`,
      orderId,
      read: false,
      createdAt: serverTimestamp(),
    });

    return { orderId, status: 'cancelado' as const };
  });
}

/**
 * Moves an order through the fulfillment steps. Cancellation has its own
 * function because it restores stock and is allowed for customers too.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<{ orderId: string; status: OrderStatus; unchanged: boolean }> {
  if (status === 'cancelado') {
    throw new Error('Usa la cancelación para devolver el stock de un pedido.');
  }
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Inicia sesión para actualizar el pedido.');
  }

  const orderRef = doc(db, 'orders', orderId);
  const profileRef = doc(db, 'users', current.uid);
  const notificationRef = doc(collection(db, 'notifications'));

  return runTransaction(db, async (tx) => {
    const [snap, profileSnap] = await Promise.all([tx.get(orderRef), tx.get(profileRef)]);
    if (!snap.exists()) {
      throw new Error('Pedido no encontrado.');
    }

    const profile = profileSnap.exists() ? (profileSnap.data() as Record<string, unknown>) : {};
    if (profile.role !== 'admin') {
      throw new Error('Solo la tienda puede cambiar el estado de un pedido.');
    }

    const order = snap.data() as Order;
    const currentStatus = String(order.status || '');
    if (currentStatus === 'cancelado') {
      throw new Error('Un pedido cancelado no se puede modificar.');
    }
    if (currentStatus === status) {
      return { orderId, status, unchanged: true };
    }

    const byName = String(profile.name || current.displayName || current.email || 'Admin');
    const trimmedNote = String(note || '').trim().slice(0, 300);

    tx.update(orderRef, {
      status,
      statusHistory: arrayUnion({
        status,
        at: Timestamp.now(),
        by: current.uid,
        byName,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      }),
      updatedAt: serverTimestamp(),
    });

    const copy = STATUS_COPY[status as StatusStep];
    tx.set(notificationRef, {
      userId: String(order.userId || ''),
      audience: null,
      type: 'order_status',
      title: copy.title,
      body: copy.body(orderCode(order, orderId)),
      orderId,
      read: false,
      createdAt: serverTimestamp(),
    });

    return { orderId, status, unchanged: false };
  });
}
