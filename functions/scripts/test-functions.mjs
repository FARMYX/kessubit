/**
 * End-to-end checks for the order Cloud Functions and the hardened rules.
 * Runs against the Firebase Emulator Suite; never touches production.
 *
 *   npm run functions:test
 */
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-kesuubit';
if (!PROJECT.startsWith('demo-')) {
  throw new Error(`Refusing to run against non-emulator project "${PROJECT}".`);
}

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const FUNCTIONS_HOST = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';

const { default: admin } = await import('firebase-admin');
const app = admin.initializeApp({ projectId: PROJECT });
const db = admin.firestore(app);

let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

async function createUser(email, password) {
  const res = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Auth emulator signUp failed: ${JSON.stringify(json)}`);
  return { uid: json.localId, idToken: json.idToken, email };
}

async function call(name, data, idToken) {
  const res = await fetch(`http://${FUNCTIONS_HOST}/${PROJECT}/us-central1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function expectResult(response, label) {
  assert(
    response.json && response.json.result,
    `${label}: expected a result, got HTTP ${response.status} ${JSON.stringify(response.json)}`
  );
  return response.json.result;
}

function expectError(response, expected, label) {
  const actual = response.json?.error?.status;
  assert(
    actual === expected,
    `${label}: expected ${expected}, got ${actual || `HTTP ${response.status} ${JSON.stringify(response.json)}`}`
  );
}

async function firestoreRest(path, { method = 'GET', idToken, body } = {}) {
  const res = await fetch(
    `http://${FIRESTORE_HOST}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );
  let json = null;
  try {
    json = await res.json();
  } catch {
    // Firestore errors can have an empty body.
  }
  return { status: res.status, json };
}

async function stockOf(productId) {
  const snap = await db.doc(`products/${productId}`).get();
  return Number(snap.data()?.stock || 0);
}

async function counterValue() {
  const snap = await db.doc('counters/orders').get();
  return Number(snap.data()?.value || 0);
}

async function notificationCount(field, value) {
  const snap = await db.collection('notifications').where(field, '==', value).get();
  return snap.size;
}

console.log(`\nKESUUBIT · pruebas de Cloud Functions (${PROJECT})\n`);

// --- seed ------------------------------------------------------------------
const client = await createUser('cliente@test.kesuubit', 'clave1234');
const other = await createUser('otro@test.kesuubit', 'clave1234');
const adminUser = await createUser('admin@test.kesuubit', 'clave1234');

await db.doc(`users/${client.uid}`).set({
  uid: client.uid,
  email: client.email,
  name: 'Cliente Prueba',
  role: 'client',
  favorites: [],
});
await db.doc(`users/${other.uid}`).set({
  uid: other.uid,
  email: other.email,
  name: 'Otro Cliente',
  role: 'client',
  favorites: [],
});
await db.doc(`users/${adminUser.uid}`).set({
  uid: adminUser.uid,
  email: adminUser.email,
  name: 'Admin Prueba',
  role: 'admin',
  favorites: [],
});

await db.doc('products/pua-btr').set({
  name: 'Púa negra y dorada BTR!',
  brand: 'Bocchi',
  category: 'Accesorios',
  fandom: 'bocchi',
  price: 15,
  stock: 50,
  description: 'Púa de prueba',
  specs: [],
  featured: true,
});
await db.doc('products/guitarra-test').set({
  name: 'Guitarra de prueba',
  brand: 'K-On!',
  category: 'Guitarras',
  fandom: 'kon',
  price: 100,
  stock: 2,
  description: 'Producto con stock bajo',
  specs: [],
});
await db.doc('products/producto-caro').set({
  name: 'Producto caro',
  brand: 'KESUUBIT',
  category: 'Accesorios',
  fandom: 'both',
  price: 600,
  stock: 2,
  description: 'Producto para envío gratis',
  specs: [],
});
await db.doc('storeConfig/settings').set({
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
  announcement: '',
  deliveryEnabled: true,
  pickupEnabled: true,
});
await db.doc('counters/orders').set({ value: 0 });

const baseOrder = {
  idempotencyKey: 'test-order-0001',
  customerName: 'Cliente Prueba',
  address: 'Calle 1 #123, Oruro',
  phone: '70000000',
  notes: 'Prueba automatizada',
  deliveryType: 'delivery',
  paymentMethod: 'efectivo',
  items: [{ productId: 'pua-btr', qty: 2 }],
};

// --- authentication --------------------------------------------------------
expectError(await call('createOrder', baseOrder), 'UNAUTHENTICATED', 'createOrder requires auth');
ok('rechaza pedidos sin sesión');

// --- create ----------------------------------------------------------------
const created = expectResult(await call('createOrder', baseOrder, client.idToken), 'create order');
assert(created.orderId === 'test-order-0001', 'order id should be the idempotency key');
assert(created.orderNumber === 'KG-0001', `expected KG-0001, got ${created.orderNumber}`);
assert(created.subtotal === 30, `expected subtotal 30, got ${created.subtotal}`);
assert(created.shipping === 25, `expected shipping 25, got ${created.shipping}`);
assert(created.total === 55, `expected total 55, got ${created.total}`);
ok('crea el pedido con precios y envío del servidor');

assert((await stockOf('pua-btr')) === 48, 'stock should go from 50 to 48');
ok('descuenta el stock en la misma transacción');

assert((await counterValue()) === 1, 'counter should be 1');
ok('incrementa el contador de pedidos');

assert((await notificationCount('userId', client.uid)) === 1, 'customer should get one notification');
assert((await notificationCount('audience', 'admin')) === 1, 'admins should get one notification');
ok('genera avisos para el cliente y la tienda');

const savedOrder = (await db.doc('orders/test-order-0001').get()).data();
assert(savedOrder.userId === client.uid, 'order must belong to the authenticated user');
assert(savedOrder.status === 'pendiente', 'new order must be pending');
assert(savedOrder.items.length === 1 && savedOrder.items[0].qty === 2, 'order items must match');
assert(savedOrder.idempotencyKey === 'test-order-0001', 'idempotency key must be stored');
ok('guarda el pedido con el usuario autenticado');

// --- idempotency -----------------------------------------------------------
const replay = expectResult(await call('createOrder', baseOrder, client.idToken), 'replay order');
assert(replay.orderId === created.orderId, 'replay must return the same order');
assert(replay.orderNumber === created.orderNumber, 'replay must keep the order number');
assert((await stockOf('pua-btr')) === 48, 'replay must not decrement stock again');
assert((await counterValue()) === 1, 'replay must not increment the counter');
assert((await notificationCount('userId', client.uid)) === 1, 'replay must not duplicate notifications');
ok('reintentar con la misma clave no duplica pedido, stock ni avisos');

expectError(
  await call('createOrder', { ...baseOrder, customerName: 'Otro Cliente' }, other.idToken),
  'ALREADY_EXISTS',
  'cross-user idempotency key'
);
ok('impide reutilizar la clave de otro usuario');

// --- validation ------------------------------------------------------------
expectError(
  await call(
    'createOrder',
    { ...baseOrder, idempotencyKey: 'test-order-low', items: [{ productId: 'guitarra-test', qty: 3 }] },
    client.idToken
  ),
  'FAILED_PRECONDITION',
  'insufficient stock'
);
assert((await stockOf('guitarra-test')) === 2, 'failed order must not change stock');
assert((await counterValue()) === 1, 'failed order must not change the counter');
ok('rechaza compras sin stock suficiente');

expectError(
  await call(
    'createOrder',
    { ...baseOrder, idempotencyKey: 'test-order-zero', items: [{ productId: 'pua-btr', qty: 0 }] },
    client.idToken
  ),
  'INVALID_ARGUMENT',
  'zero quantity'
);
ok('rechaza cantidades inválidas');

expectError(
  await call('createOrder', { ...baseOrder, idempotencyKey: 'test-order-noaddr', address: '' }, client.idToken),
  'INVALID_ARGUMENT',
  'delivery without address'
);
ok('exige dirección para envío a domicilio');

const tampered = expectResult(
  await call(
    'createOrder',
    {
      ...baseOrder,
      idempotencyKey: 'test-order-tampered',
      items: [{ productId: 'guitarra-test', qty: 1, price: 0.01, name: 'Precio falso' }],
    },
    client.idToken
  ),
  'price tampering'
);
assert(tampered.subtotal === 100, `server must ignore client price, got ${tampered.subtotal}`);
assert(tampered.total === 125, `expected total 125, got ${tampered.total}`);
assert((await stockOf('guitarra-test')) === 1, 'tampered order should decrement one unit');
ok('ignora precios y nombres enviados por el cliente');

// --- free shipping ---------------------------------------------------------
const freeShipping = expectResult(
  await call(
    'createOrder',
    {
      ...baseOrder,
      idempotencyKey: 'test-order-free-shipping',
      customerName: 'Cliente Prueba',
      items: [{ productId: 'producto-caro', qty: 1 }],
    },
    client.idToken
  ),
  'free shipping'
);
assert(freeShipping.shipping === 0, `expected free shipping, got ${freeShipping.shipping}`);
assert(freeShipping.total === 600, `expected total 600, got ${freeShipping.total}`);
ok('aplica envío gratis desde el umbral configurado');

// --- status changes --------------------------------------------------------
expectError(
  await call('updateOrderStatus', { orderId: 'test-order-0001', status: 'preparando' }, client.idToken),
  'PERMISSION_DENIED',
  'non-admin status change'
);
ok('impide que un cliente cambie el estado');

const preparing = expectResult(
  await call('updateOrderStatus', { orderId: 'test-order-0001', status: 'preparando' }, adminUser.idToken),
  'admin status change'
);
assert(preparing.status === 'preparando', 'status should be preparando');
const afterPreparing = (await db.doc('orders/test-order-0001').get()).data();
assert(afterPreparing.status === 'preparando', 'stored status should be preparando');
assert(afterPreparing.statusHistory.length === 2, 'history should have two entries');
ok('permite al administrador avanzar el estado y deja historial');

assert(
  (await notificationCount('orderId', 'test-order-0001')) === 3,
  'order should have created + admin + status notifications'
);
ok('notifica cada cambio de estado');

expectError(
  await call('updateOrderStatus', { orderId: 'test-order-0001', status: 'cancelado' }, adminUser.idToken),
  'INVALID_ARGUMENT',
  'cancel via status function'
);
ok('obliga a cancelar por la función de cancelación');

// --- cancellation ----------------------------------------------------------
const cancelled = expectResult(
  await call('cancelOrder', { orderId: 'test-order-0001' }, client.idToken),
  'customer cancel'
);
assert(cancelled.status === 'cancelado', 'order should be cancelled');
assert((await stockOf('pua-btr')) === 50, 'cancelling should restore stock to 50');
const afterCancel = (await db.doc('orders/test-order-0001').get()).data();
assert(afterCancel.status === 'cancelado', 'stored status should be cancelado');
assert(afterCancel.statusHistory.length === 3, 'history should have three entries');
assert(
  (await notificationCount('orderId', 'test-order-0001')) === 4,
  'cancellation should add one notification'
);
ok('el cliente cancela y el stock vuelve a la tienda');

expectError(
  await call('cancelOrder', { orderId: 'test-order-0001' }, client.idToken),
  'FAILED_PRECONDITION',
  'double cancellation'
);
ok('rechaza cancelar dos veces');

// Admin-created order: a customer cannot cancel it, an admin can.
const adminOrder = expectResult(
  await call(
    'createOrder',
    {
      ...baseOrder,
      idempotencyKey: 'test-order-admin',
      customerName: 'Admin Prueba',
      deliveryType: 'pickup',
      address: '',
      items: [{ productId: 'pua-btr', qty: 1 }],
    },
    adminUser.idToken
  ),
  'admin create'
);
assert(adminOrder.shipping === 0, 'pickup should not charge shipping');
assert((await stockOf('pua-btr')) === 49, 'admin order should decrement stock');

expectError(
  await call('cancelOrder', { orderId: adminOrder.orderId }, client.idToken),
  'PERMISSION_DENIED',
  'customer cancels another order'
);
ok('impide cancelar el pedido de otra persona');

const adminCancel = expectResult(
  await call('cancelOrder', { orderId: adminOrder.orderId }, adminUser.idToken),
  'admin cancel'
);
assert(adminCancel.status === 'cancelado', 'admin cancellation should succeed');
assert((await stockOf('pua-btr')) === 50, 'admin cancellation should restore stock');
ok('permite al administrador cancelar un pedido');

// Restore the products used by the remaining checks.
expectResult(await call('cancelOrder', { orderId: 'test-order-tampered' }, client.idToken), 'cancel tampered');
expectResult(
  await call('cancelOrder', { orderId: 'test-order-free-shipping' }, client.idToken),
  'cancel free shipping'
);
assert((await stockOf('guitarra-test')) === 2, 'guitarra stock should be restored');
assert((await stockOf('producto-caro')) === 2, 'producto caro stock should be restored');

// --- store configuration ---------------------------------------------------
await db.doc('storeConfig/settings').set({ deliveryEnabled: false }, { merge: true });
expectError(
  await call(
    'createOrder',
    { ...baseOrder, idempotencyKey: 'test-order-closed', items: [{ productId: 'pua-btr', qty: 1 }] },
    client.idToken
  ),
  'FAILED_PRECONDITION',
  'delivery disabled'
);
await db.doc('storeConfig/settings').set({ deliveryEnabled: true }, { merge: true });
assert((await stockOf('pua-btr')) === 50, 'rejected delivery must not change stock');
ok('respeta la configuración de entrega de la tienda');

// --- Firestore rules -------------------------------------------------------
const hackedOrder = await firestoreRest('orders?documentId=hack-order', {
  method: 'POST',
  idToken: client.idToken,
  body: {
    fields: {
      userId: { stringValue: client.uid },
      status: { stringValue: 'pendiente' },
      total: { integerValue: '1' },
      items: {
        arrayValue: {
          values: [
            {
              mapValue: {
                fields: {
                  id: { stringValue: 'pua-btr' },
                  qty: { integerValue: '1' },
                },
              },
            },
          ],
        },
      },
    },
  },
});
assert(hackedOrder.status === 403, `client order create should be denied, got ${hackedOrder.status}`);
ok('reglas: el cliente no puede crear pedidos directamente');

const hackedStock = await firestoreRest('products/pua-btr?updateMask.fieldPaths=stock', {
  method: 'PATCH',
  idToken: client.idToken,
  body: { fields: { stock: { integerValue: '999' } } },
});
assert(hackedStock.status === 403, `client stock update should be denied, got ${hackedStock.status}`);
assert((await stockOf('pua-btr')) === 50, 'denied stock update must not change stock');
ok('reglas: el cliente no puede modificar el stock');

const hackedCounter = await firestoreRest('counters/orders?updateMask.fieldPaths=value', {
  method: 'PATCH',
  idToken: client.idToken,
  body: { fields: { value: { integerValue: '99' } } },
});
assert(hackedCounter.status === 403, `client counter update should be denied, got ${hackedCounter.status}`);
assert((await counterValue()) === 4, 'counter must keep the server value');
ok('reglas: el cliente no puede alterar el contador');

const hackedNotification = await firestoreRest('notifications?documentId=hack-notification', {
  method: 'POST',
  idToken: client.idToken,
  body: {
    fields: {
      userId: { stringValue: client.uid },
      type: { stringValue: 'order_created' },
      title: { stringValue: 'Aviso falso' },
      body: { stringValue: 'Aviso falso' },
      read: { booleanValue: false },
    },
  },
});
assert(
  hackedNotification.status === 403,
  `client notification create should be denied, got ${hackedNotification.status}`
);
ok('reglas: el cliente no puede crear avisos');

const adminOrderUpdate = await firestoreRest('orders/test-order-0001?updateMask.fieldPaths=status', {
  method: 'PATCH',
  idToken: adminUser.idToken,
  body: { fields: { status: { stringValue: 'entregado' } } },
});
assert(adminOrderUpdate.status === 403, `direct order update should be denied, got ${adminOrderUpdate.status}`);
ok('reglas: ni el administrador edita pedidos directamente');

console.log(`\n${passed} comprobaciones aprobadas.\n`);
