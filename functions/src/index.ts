import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { cleanItems, money, round2, shippingFor, type CleanItem, type StoreConfigLike } from './pricing';

initializeApp();

const REGION = 'us-central1';
const db = getFirestore();

setGlobalOptions({ region: REGION });

const DELIVERY_TYPES = ['delivery', 'pickup'] as const;
const PAYMENT_METHODS = ['efectivo', 'qr', 'transferencia', 'tarjeta'] as const;
const STATUSES = ['pendiente', 'preparando', 'enviado', 'entregado'] as const;
const IDEMPOTENCY_RE = /^[A-Za-z0-9_-]{8,64}$/;

type Status = (typeof STATUSES)[number];

const DEFAULT_STORE = {
  address: 'Oruro, Bolivia',
  shippingCost: 25,
  freeShippingThreshold: 500,
  deliveryEnabled: true,
  pickupEnabled: true,
};

const STATUS_COPY: Record<Status, { title: string; body: (code: string) => string }> = {
  pendiente: { title: 'Pedido recibido', body: (code) => `${code} está pendiente de confirmación.` },
  preparando: { title: 'Estamos preparando tu pedido', body: (code) => `${code} ya está en preparación.` },
  enviado: { title: 'Tu pedido va en camino', body: (code) => `${code} fue enviado.` },
  entregado: { title: 'Pedido entregado', body: (code) => `${code} llegó a su destino. ¡Gracias!` },
};

type CreateOrderData = {
  idempotencyKey?: unknown;
  customerName?: unknown;
  address?: unknown;
  phone?: unknown;
  notes?: unknown;
  deliveryType?: unknown;
  paymentMethod?: unknown;
  items?: unknown;
};

type OrderActionData = {
  orderId?: unknown;
  status?: unknown;
  note?: unknown;
};

type OrderItemRecord = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  imageUrl?: string;
};

function requireAuth(request: CallableRequest): NonNullable<CallableRequest['auth']> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Inicia sesión para continuar.');
  }
  return request.auth;
}

function tokenLabel(auth: NonNullable<CallableRequest['auth']>): string {
  const name = auth.token.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  const email = auth.token.email;
  if (typeof email === 'string' && email.trim()) return email.trim();
  return '';
}

function optionalString(value: unknown, field: string, max: number): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `El campo ${field} no es válido.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new HttpsError('invalid-argument', `El campo ${field} es demasiado largo.`);
  }
  return trimmed;
}

function requiredString(value: unknown, field: string, min: number, max: number): string {
  const trimmed = optionalString(value, field, max);
  if (trimmed.length < min) {
    throw new HttpsError('invalid-argument', `El campo ${field} es obligatorio.`);
  }
  return trimmed;
}

/** Firestore document ids cannot contain `/` and reserve `.` / `..`. */
function documentId(value: unknown, field: string): string {
  const id = requiredString(value, field, 1, 128);
  if (id.includes('/') || id === '.' || id === '..') {
    throw new HttpsError('invalid-argument', `El campo ${field} no es válido.`);
  }
  return id;
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new HttpsError('invalid-argument', `El campo ${field} no es válido.`);
  }
  return value as T[number];
}

function idempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !IDEMPOTENCY_RE.test(value)) {
    throw new HttpsError(
      'invalid-argument',
      'No pudimos identificar este intento de compra. Recarga la pantalla e inténtalo otra vez.'
    );
  }
  return value;
}

function validateItems(raw: unknown): CleanItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpsError('invalid-argument', 'Tu carrito está vacío.');
  }
  if (raw.length > 50) {
    throw new HttpsError('invalid-argument', 'El carrito tiene demasiadas líneas.');
  }

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      throw new HttpsError('invalid-argument', 'Hay un producto inválido en tu carrito.');
    }
    const item = entry as Record<string, unknown>;
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    if (!productId || productId.length > 128 || productId.includes('/') || productId === '.' || productId === '..') {
      throw new HttpsError('invalid-argument', 'Hay un producto inválido en tu carrito.');
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new HttpsError('invalid-argument', 'Revisa las cantidades de tu carrito.');
    }
  }

  const items = cleanItems(raw);
  if (!items.length) {
    throw new HttpsError('invalid-argument', 'Tu carrito está vacío.');
  }
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  if (totalQty > 100) {
    throw new HttpsError('invalid-argument', 'El pedido supera el máximo de 100 unidades.');
  }
  return items;
}

async function actorFor(uid: string): Promise<{ admin: boolean; name: string }> {
  const snap = await db.doc(`users/${uid}`).get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
  return {
    admin: data.role === 'admin',
    name: typeof data.name === 'string' ? data.name.trim() : '',
  };
}

function orderCode(order: Record<string, unknown>, orderId: string): string {
  const number = order.orderNumber;
  if (typeof number === 'string' && number.trim()) return number;
  return `KG-${orderId.slice(0, 6).toUpperCase()}`;
}

/**
 * Creates an order with prices, shipping, stock and order number computed on
 * the server. The client only sends product ids and quantities.
 *
 * The client-generated idempotency key doubles as the order document id, so a
 * retry after a lost response returns the same order instead of duplicating it.
 */
export const createOrder = onCall<CreateOrderData>({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const data = (request.data || {}) as CreateOrderData;

  const key = idempotencyKey(data.idempotencyKey);
  const customerName = requiredString(data.customerName, 'nombre', 2, 80);
  const deliveryType = oneOf<typeof DELIVERY_TYPES>(data.deliveryType, DELIVERY_TYPES, 'entrega');
  const paymentMethod = oneOf<typeof PAYMENT_METHODS>(data.paymentMethod, PAYMENT_METHODS, 'pago');
  const address = optionalString(data.address, 'dirección', 200);
  const phone = optionalString(data.phone, 'teléfono', 30);
  const notes = optionalString(data.notes, 'notas', 500);
  const items = validateItems(data.items);

  if (deliveryType === 'delivery' && address.length < 5) {
    throw new HttpsError('invalid-argument', 'Escribe una dirección de entrega.');
  }

  const orderRef = db.collection('orders').doc(key);
  const counterRef = db.doc('counters/orders');
  const configRef = db.doc('storeConfig/settings');
  const productRefs = items.map((item) => db.doc(`products/${item.productId}`));
  const userNotificationRef = db.collection('notifications').doc();
  const adminNotificationRef = db.collection('notifications').doc();

  return db.runTransaction(async (tx) => {
    // Idempotent replay: same key + same user returns the original order.
    const existingSnap = await tx.get(orderRef);
    if (existingSnap.exists) {
      const existing = existingSnap.data() as Record<string, unknown>;
      if (existing.userId !== auth.uid) {
        throw new HttpsError('already-exists', 'Ese identificador de pedido ya está en uso.');
      }
      return {
        orderId: orderRef.id,
        orderNumber: String(existing.orderNumber || ''),
        subtotal: Number(existing.subtotal || 0),
        shipping: Number(existing.shipping || 0),
        total: Number(existing.total || 0),
        replayed: true,
      };
    }

    // --- reads (all reads happen before any write) ---
    const [counterSnap, configSnap, ...productSnaps] = await Promise.all([
      tx.get(counterRef),
      tx.get(configRef),
      ...productRefs.map((ref) => tx.get(ref)),
    ]);

    const config = {
      ...DEFAULT_STORE,
      ...((configSnap.exists ? configSnap.data() : {}) as StoreConfigLike),
    };

    if (deliveryType === 'delivery' && config.deliveryEnabled === false) {
      throw new HttpsError('failed-precondition', 'El envío a domicilio no está disponible ahora mismo.');
    }
    if (deliveryType === 'pickup' && config.pickupEnabled === false) {
      throw new HttpsError('failed-precondition', 'El retiro en tienda no está disponible ahora mismo.');
    }

    const orderItems: OrderItemRecord[] = [];
    let subtotal = 0;

    for (let index = 0; index < productSnaps.length; index += 1) {
      const snap = productSnaps[index];
      const requested = items[index];
      if (!snap.exists) {
        throw new HttpsError('not-found', 'Un producto de tu carrito ya no está disponible.');
      }

      const product = snap.data() as Record<string, unknown>;
      const stock = Math.max(0, Math.floor(Number(product.stock || 0)));
      if (!Number.isFinite(stock) || stock < requested.qty) {
        throw new HttpsError(
          'failed-precondition',
          `Solo quedan ${stock} de ${String(product.name || 'un producto')}.`
        );
      }

      const price = Number(product.price || 0);
      if (!Number.isFinite(price) || price < 0) {
        throw new HttpsError('failed-precondition', 'Un producto tiene un precio inválido.');
      }

      subtotal += price * requested.qty;
      orderItems.push({
        id: snap.id,
        name: String(product.name || 'Producto'),
        price,
        qty: requested.qty,
        // Firestore rejects `undefined`; only include optional images when set.
        ...(typeof product.image === 'string' && product.image ? { image: product.image } : {}),
        ...(typeof product.imageUrl === 'string' && product.imageUrl ? { imageUrl: product.imageUrl } : {}),
      });
    }

    subtotal = round2(subtotal);
    const shipping = round2(shippingFor(subtotal, config, deliveryType));
    const total = round2(subtotal + shipping);
    const nextValue = Number(counterSnap.exists ? counterSnap.data()?.value || 0 : 0);
    const nextNumber = Number.isFinite(nextValue) && nextValue >= 0 ? Math.floor(nextValue) + 1 : 1;
    const orderNumber = `KG-${String(nextNumber).padStart(4, '0')}`;
    const now = Timestamp.now();
    const userEmail = typeof auth.token.email === 'string' ? auth.token.email : '';
    const deliveryAddress = deliveryType === 'pickup' ? String(config.address || '') : address;
    const paymentStatus =
      paymentMethod === 'qr' || paymentMethod === 'transferencia'
        ? 'sin_comprobante'
        : 'no_requiere';

    // --- writes ---
    tx.set(
      counterRef,
      { value: nextNumber, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    tx.set(orderRef, {
      orderNumber,
      idempotencyKey: key,
      userId: auth.uid,
      userEmail,
      userName: customerName,
      items: orderItems,
      subtotal,
      shipping,
      total,
      address: deliveryAddress,
      phone,
      notes,
      deliveryType,
      paymentMethod,
      paymentStatus,
      status: 'pendiente',
      statusHistory: [
        { status: 'pendiente', at: now, by: auth.uid, byName: customerName },
      ],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    productSnaps.forEach((snap, index) => {
      tx.update(snap.ref, { stock: FieldValue.increment(-items[index].qty) });
    });

    tx.set(userNotificationRef, {
      userId: auth.uid,
      audience: null,
      type: 'order_created',
      title: 'Pedido confirmado',
      body: `${orderNumber} · ${orderItems.length} producto(s) · ${money(total)}`,
      orderId: orderRef.id,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(adminNotificationRef, {
      userId: null,
      audience: 'admin',
      type: 'order_created',
      title: 'Nuevo pedido',
      body: `${customerName} · ${orderNumber} · ${money(total)}`,
      orderId: orderRef.id,
      readBy: [],
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId: orderRef.id, orderNumber, subtotal, shipping, total, replayed: false };
  });
});

/**
 * Cancels an order and returns its units to stock. Customers may cancel while
 * the order is pending or being prepared; administrators may cancel until it
 * is delivered.
 */
export const cancelOrder = onCall<OrderActionData>({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const data = (request.data || {}) as OrderActionData;
  const orderId = documentId(data.orderId, 'pedido');
  const actor = await actorFor(auth.uid);

  const orderRef = db.doc(`orders/${orderId}`);
  const notificationRef = db.collection('notifications').doc();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Pedido no encontrado.');
    }

    const order = snap.data() as Record<string, unknown>;
    const owner = order.userId === auth.uid;
    if (!owner && !actor.admin) {
      throw new HttpsError('permission-denied', 'No puedes cancelar este pedido.');
    }

    const current = String(order.status || '');
    if (current === 'cancelado') {
      throw new HttpsError('failed-precondition', 'Ese pedido ya está cancelado.');
    }
    if (current === 'entregado') {
      throw new HttpsError('failed-precondition', 'Un pedido entregado no se puede cancelar.');
    }
    if (!actor.admin && current !== 'pendiente' && current !== 'preparando') {
      throw new HttpsError('failed-precondition', 'Ya no se puede cancelar: el pedido salió del local.');
    }

    const rawItems = Array.isArray(order.items) ? order.items : [];
    const items = rawItems.filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== 'object') return false;
      const id = (item as Record<string, unknown>).id;
      return typeof id === 'string' && !!id.trim() && !id.includes('/');
    });
    const productRefs = items.map((item) => db.doc(`products/${String(item.id)}`));
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    const byName = actor.name || tokenLabel(auth) || String(order.userName || '') || 'Usuario';
    const now = Timestamp.now();

    tx.update(orderRef, {
      status: 'cancelado',
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      statusHistory: FieldValue.arrayUnion({
        status: 'cancelado',
        at: now,
        by: auth.uid,
        byName,
      }),
    });

    productSnaps.forEach((product, index) => {
      if (!product.exists) return;
      const qty = Number(items[index]?.qty || 0);
      if (Number.isFinite(qty) && qty > 0) {
        tx.update(product.ref, { stock: FieldValue.increment(qty) });
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
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId, status: 'cancelado' as const };
  });
});

/**
 * Moves an order through the fulfillment steps. Cancellation has its own
 * function because it restores stock and is allowed for customers too.
 */
export const updateOrderStatus = onCall<OrderActionData>({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const data = (request.data || {}) as OrderActionData;
  const orderId = documentId(data.orderId, 'pedido');
  const status = oneOf<typeof STATUSES>(data.status, STATUSES, 'estado');
  const note = optionalString(data.note, 'nota', 300);

  const actor = await actorFor(auth.uid);
  if (!actor.admin) {
    throw new HttpsError('permission-denied', 'Solo la tienda puede cambiar el estado de un pedido.');
  }
  const byName = actor.name || tokenLabel(auth) || 'Admin';

  const orderRef = db.doc(`orders/${orderId}`);
  const notificationRef = db.collection('notifications').doc();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Pedido no encontrado.');
    }

    const order = snap.data() as Record<string, unknown>;
    const current = String(order.status || '');
    if (current === 'cancelado') {
      throw new HttpsError('failed-precondition', 'Un pedido cancelado no se puede modificar.');
    }
    if (current === status) {
      return { orderId, status, unchanged: true };
    }

    tx.update(orderRef, {
      status,
      statusHistory: FieldValue.arrayUnion({
        status,
        at: Timestamp.now(),
        by: auth.uid,
        byName,
        ...(note ? { note } : {}),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const copy = STATUS_COPY[status];
    tx.set(notificationRef, {
      userId: String(order.userId || ''),
      audience: null,
      type: 'order_status',
      title: copy.title,
      body: copy.body(orderCode(order, orderId)),
      orderId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId, status, unchanged: false };
  });
});
