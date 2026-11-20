/**
 * Pruebas de las reglas de Firestore del plan Spark.
 *
 * Verifican que, sin Cloud Functions, un cliente solo pueda crear pedidos
 * coherentes, mover stock, incrementar el contador de uno en uno y generar sus
 * propios avisos. Nunca toca producción:
 *
 *   npm run rules:test
 */
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-kesuubit';
if (!PROJECT.startsWith('demo-')) {
  throw new Error(`Refusing to run against non-emulator project "${PROJECT}".`);
}

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;

const { initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const app = initializeApp({ projectId: PROJECT });
const db = getFirestore(app);

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

async function rest(path, { method = 'GET', idToken, body, masks = [] } = {}) {
  const query = masks.length
    ? `?${masks.map((mask) => `updateMask.fieldPaths=${encodeURIComponent(mask)}`).join('&')}`
    : '';
  const res = await fetch(
    `http://${FIRESTORE_HOST}/v1/projects/${PROJECT}/databases/(default)/documents/${path}${query}`,
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

function expectStatus(response, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert(
    allowed.includes(response.status),
    `${label}: expected HTTP ${allowed.join('/')}, got ${response.status} ${JSON.stringify(
      response.json
    )}`
  );
}

const s = (value) => ({ stringValue: value });
const n = (value) => ({ integerValue: String(value) });
const b = (value) => ({ booleanValue: value });
const nul = () => ({ nullValue: 'NULL_VALUE' });
const arr = (values) => ({ arrayValue: { values } });
const map = (fields) => ({ mapValue: { fields } });
const timestamp = () => ({ timestampValue: new Date().toISOString() });

const orderFields = (userId, overrides = {}) => ({
  userId: s(userId),
  userEmail: s('client@test.kesuubit'),
  userName: s('Cliente Prueba'),
  items: arr([map({ id: s('pua-btr'), qty: n(1) })]),
  subtotal: n(15),
  shipping: n(0),
  total: n(15),
  address: s('Oruro'),
  phone: s(''),
  notes: s(''),
  deliveryType: s('pickup'),
  paymentMethod: s('efectivo'),
  paymentStatus: s('no_requiere'),
  status: s('pendiente'),
  statusHistory: arr([map({ status: s('pendiente') })]),
  idempotencyKey: s('rule-order-1'),
  orderNumber: s('KG-9001'),
  ...overrides,
});

console.log(`\nKESUUBIT · pruebas de reglas Spark (${PROJECT})\n`);

// --- seed ------------------------------------------------------------------
const client = await createUser('reglas-cliente@test.kesuubit', 'clave1234');
const other = await createUser('reglas-otro@test.kesuubit', 'clave1234');
const adminUser = await createUser('reglas-admin@test.kesuubit', 'clave1234');

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
await db.doc('collections/rule-collection-public').set({
  name: 'Colección pública',
  active: true,
  createdAt: new Date(),
});
await db.doc('fandoms/rule-fandom-public').set({
  name: 'Fandom público',
  short: 'Público',
  color: '#C93A72',
  active: true,
  createdAt: new Date(),
});
await db.doc('counters/orders').set({ value: 0 });
await db.doc('storeConfig/settings').set({
  name: 'KESUUBIT',
  address: 'Oruro, Bolivia',
  shippingCost: 25,
  freeShippingThreshold: 500,
  deliveryEnabled: true,
  pickupEnabled: true,
});

// --- order creation --------------------------------------------------------
expectStatus(
  await rest('orders?documentId=rule-order-1', {
    method: 'POST',
    idToken: client.idToken,
    body: { fields: orderFields(client.uid) },
  }),
  200,
  'client creates a valid order'
);
ok('el cliente crea un pedido coherente');

expectStatus(
  await rest('orders?documentId=rule-order-2', {
    method: 'POST',
    idToken: other.idToken,
    body: { fields: orderFields(client.uid, { idempotencyKey: s('rule-order-2') }) },
  }),
  403,
  'client creates an order for another user'
);
ok('impide crear un pedido a nombre de otra cuenta');

expectStatus(
  await rest('orders?documentId=rule-order-bad-status', {
    method: 'POST',
    idToken: client.idToken,
    body: {
      fields: orderFields(client.uid, {
        idempotencyKey: s('rule-order-bad-status'),
        status: s('entregado'),
      }),
    },
  }),
  403,
  'client creates an already delivered order'
);
ok('exige que todo pedido nuevo nazca pendiente');

expectStatus(
  await rest('orders?documentId=rule-order-bad-key', {
    method: 'POST',
    idToken: client.idToken,
    body: {
      fields: orderFields(client.uid, {
        idempotencyKey: s('otra-clave'),
      }),
    },
  }),
  403,
  'idempotency key must match the document id'
);
ok('ata el identificador del documento a la clave de idempotencia');

// La transacción del cliente consulta el pedido por su clave antes de crearlo.
// Si esa lectura se deniega, el checkout nunca puede completarse.
expectStatus(
  await rest('orders/no-existe-todavia', { idToken: client.idToken }),
  404,
  'client reads a missing order before creating it'
);
ok('permite consultar un pedido inexistente para la idempotencia');

expectStatus(
  await rest('orders/rule-order-1', { idToken: other.idToken }),
  403,
  'another client reads an existing order'
);
ok('impide leer pedidos ajenos');

// --- product stock ---------------------------------------------------------
expectStatus(
  await rest('products/pua-btr', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['stock'],
    body: { fields: { stock: n(49) } },
  }),
  200,
  'client decrements stock'
);
ok('permite mover el stock dentro de la compra');

expectStatus(
  await rest('products/pua-btr', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['price'],
    body: { fields: { price: n(1) } },
  }),
  403,
  'client changes a price'
);
ok('impide que el cliente cambie precios');

expectStatus(
  await rest('products/pua-btr', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['stock'],
    body: { fields: { stock: n(-1) } },
  }),
  403,
  'client sets negative stock'
);
ok('impide dejar stock negativo');

// --- collections -----------------------------------------------------------
expectStatus(await rest('collections/rule-collection-public'), 200, 'anonymous reads collections');
ok('permite leer colecciones sin iniciar sesión');

expectStatus(
  await rest('collections?documentId=rule-collection-1', {
    method: 'POST',
    idToken: client.idToken,
    body: { fields: { name: s('Bocchi'), active: b(true), createdAt: timestamp() } },
  }),
  403,
  'client creates a collection'
);
ok('impide que el cliente cree colecciones');

// --- fandoms ---------------------------------------------------------------
expectStatus(await rest('fandoms/rule-fandom-public'), 200, 'anonymous reads fandoms');
ok('permite leer etiquetas de fandom sin iniciar sesión');

expectStatus(
  await rest('fandoms?documentId=rule-fandom-1', {
    method: 'POST',
    idToken: client.idToken,
    body: { fields: { name: s('Metal'), short: s('Metal'), color: s('#7A4FD0'), active: b(true) } },
  }),
  403,
  'client creates a fandom'
);
ok('impide que el cliente cree etiquetas de fandom');

expectStatus(
  await rest('fandoms/rule-fandom-public', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['name'],
    body: { fields: { name: s('Fandom falso') } },
  }),
  403,
  'client renames a fandom'
);
ok('impide que el cliente renombre etiquetas de fandom');

// --- order counter ---------------------------------------------------------
expectStatus(
  await rest('counters/orders', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['value'],
    body: { fields: { value: n(1) } },
  }),
  200,
  'client increments the counter by one'
);
ok('permite subir el contador de uno en uno');

expectStatus(
  await rest('counters/orders', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['value'],
    body: { fields: { value: n(99) } },
  }),
  403,
  'client jumps the counter'
);
ok('impide saltar o reiniciar la numeración');

// --- notifications ---------------------------------------------------------
expectStatus(
  await rest('notifications?documentId=rule-notification-self', {
    method: 'POST',
    idToken: client.idToken,
    body: {
      fields: {
        userId: s(client.uid),
        type: s('order_created'),
        title: s('Pedido confirmado'),
        body: s('Aviso de prueba'),
        read: b(false),
      },
    },
  }),
  200,
  'client creates own notification'
);
ok('permite al cliente generar su propio aviso');

expectStatus(
  await rest('notifications?documentId=rule-notification-other', {
    method: 'POST',
    idToken: client.idToken,
    body: {
      fields: {
        userId: s(other.uid),
        type: s('order_status'),
        title: s('Aviso falso'),
        body: s('Aviso falso'),
        read: b(false),
      },
    },
  }),
  403,
  'client creates a notification for another user'
);
ok('impide fabricar avisos para otras cuentas');

expectStatus(
  await rest('notifications?documentId=rule-notification-admin', {
    method: 'POST',
    idToken: client.idToken,
    body: {
      fields: {
        userId: nul(),
        audience: s('admin'),
        type: s('order_created'),
        title: s('Nuevo pedido'),
        body: s('Aviso para la tienda'),
        readBy: arr([]),
      },
    },
  }),
  200,
  'client creates the shared admin notification'
);
ok('permite avisar a la tienda de un pedido nuevo');

// --- cancellation ----------------------------------------------------------
expectStatus(
  await rest('orders/rule-order-1', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['status', 'statusHistory', 'cancelledAt', 'updatedAt'],
    body: {
      fields: {
        status: s('cancelado'),
        statusHistory: arr([
          map({ status: s('pendiente') }),
          map({ status: s('cancelado') }),
        ]),
        cancelledAt: timestamp(),
        updatedAt: timestamp(),
      },
    },
  }),
  200,
  'owner cancels a pending order'
);
ok('permite al cliente cancelar su pedido pendiente');

await db.doc('orders/rule-order-3').set({
  userId: client.uid,
  userEmail: client.email,
  userName: 'Cliente Prueba',
  items: [{ id: 'pua-btr', name: 'Púa', price: 15, qty: 1 }],
  subtotal: 15,
  shipping: 0,
  total: 15,
  address: 'Oruro',
  phone: '',
  notes: '',
  deliveryType: 'pickup',
  paymentMethod: 'efectivo',
  status: 'pendiente',
  statusHistory: [{ status: 'pendiente' }],
  idempotencyKey: 'rule-order-3',
  orderNumber: 'KG-9003',
});

expectStatus(
  await rest('orders/rule-order-3', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['status'],
    body: { fields: { status: s('enviado') } },
  }),
  403,
  'client changes the fulfillment status'
);
ok('impide que el cliente avance el estado');

expectStatus(
  await rest('orders/rule-order-3', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['total'],
    body: { fields: { total: n(1) } },
  }),
  403,
  'client edits the order total'
);
ok('impide alterar el total de un pedido existente');

await db.doc('orders/rule-order-4').set({
  userId: client.uid,
  userEmail: client.email,
  userName: 'Cliente Prueba',
  items: [{ id: 'pua-btr', name: 'Púa', price: 15, qty: 1 }],
  subtotal: 15,
  shipping: 0,
  total: 15,
  address: 'Oruro',
  phone: '',
  notes: '',
  deliveryType: 'pickup',
  paymentMethod: 'efectivo',
  status: 'entregado',
  statusHistory: [{ status: 'entregado' }],
  idempotencyKey: 'rule-order-4',
  orderNumber: 'KG-9004',
});

expectStatus(
  await rest('orders/rule-order-4', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['status', 'statusHistory', 'cancelledAt', 'updatedAt'],
    body: {
      fields: {
        status: s('cancelado'),
        statusHistory: arr([
          map({ status: s('entregado') }),
          map({ status: s('cancelado') }),
        ]),
        cancelledAt: timestamp(),
        updatedAt: timestamp(),
      },
    },
  }),
  403,
  'owner cancels a delivered order'
);
ok('impide cancelar un pedido ya entregado');

expectStatus(
  await rest('orders/rule-order-3', {
    method: 'PATCH',
    idToken: other.idToken,
    masks: ['status', 'statusHistory', 'cancelledAt', 'updatedAt'],
    body: {
      fields: {
        status: s('cancelado'),
        statusHistory: arr([
          map({ status: s('pendiente') }),
          map({ status: s('cancelado') }),
        ]),
        cancelledAt: timestamp(),
        updatedAt: timestamp(),
      },
    },
  }),
  403,
  'another client cancels someone else order'
);
ok('impide cancelar pedidos ajenos');

// --- payment proof (QR) ----------------------------------------------------
await db.doc('orders/rule-order-qr').set({
  userId: client.uid,
  userEmail: client.email,
  userName: 'Cliente Prueba',
  items: [{ id: 'pua-btr', name: 'Púa', price: 15, qty: 1 }],
  subtotal: 15,
  shipping: 0,
  total: 15,
  address: 'Oruro',
  phone: '',
  notes: '',
  deliveryType: 'pickup',
  paymentMethod: 'qr',
  paymentStatus: 'sin_comprobante',
  status: 'pendiente',
  statusHistory: [{ status: 'pendiente' }],
  idempotencyKey: 'rule-order-qr',
  orderNumber: 'KG-9005',
});

const proofFields = (userId) => ({
  orderId: s('rule-order-qr'),
  userId: s(userId),
  image: s('data:image/jpeg;base64,AAAA'),
  amount: n(15),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});

expectStatus(
  await rest('paymentProofs/rule-order-qr', {
    method: 'PATCH',
    idToken: other.idToken,
    masks: ['orderId', 'userId', 'image', 'amount', 'createdAt', 'updatedAt'],
    body: { fields: proofFields(other.uid) },
  }),
  [403],
  'another client uploads a proof for this order'
);
ok('impide subir comprobantes a pedidos ajenos');

expectStatus(
  await rest('paymentProofs?documentId=rule-order-qr', {
    method: 'POST',
    idToken: client.idToken,
    body: { fields: proofFields(client.uid) },
  }),
  200,
  'owner uploads the payment proof'
);
ok('permite al cliente subir el comprobante de su pedido QR');

expectStatus(
  await rest('paymentProofs/rule-order-qr', { idToken: other.idToken }),
  403,
  'another client reads the proof'
);
ok('impide leer comprobantes ajenos');

expectStatus(
  await rest('paymentProofs/rule-order-qr', { idToken: client.idToken }),
  200,
  'owner reads the proof'
);
ok('permite al cliente ver su propio comprobante');

expectStatus(
  await rest('paymentProofs/rule-order-qr', { idToken: adminUser.idToken }),
  200,
  'admin reads the proof'
);
ok('permite al administrador revisar el comprobante');

expectStatus(
  await rest('orders/rule-order-qr', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['paymentStatus'],
    body: { fields: { paymentStatus: s('verificado') } },
  }),
  403,
  'client marks its own payment as verified'
);
ok('impide que el cliente verifique su propio pago');

expectStatus(
  await rest('orders/rule-order-qr', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['paymentStatus', 'paymentAmount', 'proofUploadedAt', 'paymentRejectedReason', 'updatedAt'],
    body: {
      fields: {
        paymentStatus: s('en_revision'),
        paymentAmount: n(15),
        proofUploadedAt: timestamp(),
        paymentRejectedReason: s(''),
        updatedAt: timestamp(),
      },
    },
  }),
  200,
  'owner sends the payment to review'
);
ok('permite al cliente enviar el pago a revisión');

expectStatus(
  await rest('paymentProofs/rule-order-qr', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['orderId', 'userId', 'image', 'amount', 'createdAt', 'updatedAt'],
    body: {
      fields: {
        ...proofFields(client.uid),
        amount: n(15),
        updatedAt: timestamp(),
      },
    },
  }),
  200,
  'owner resubmits the proof before verification'
);
ok('permite reenviar el comprobante mientras no esté verificado');

expectStatus(
  await rest('orders/rule-order-qr', {
    method: 'PATCH',
    idToken: adminUser.idToken,
    masks: ['paymentStatus', 'verifiedBy', 'verifiedByName', 'verifiedAt', 'updatedAt'],
    body: {
      fields: {
        paymentStatus: s('verificado'),
        verifiedBy: s(adminUser.uid),
        verifiedByName: s('Admin Prueba'),
        verifiedAt: timestamp(),
        updatedAt: timestamp(),
      },
    },
  }),
  200,
  'admin verifies the payment'
);
ok('permite al administrador verificar el pago');

expectStatus(
  await rest('paymentProofs/rule-order-qr', {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['orderId', 'userId', 'image', 'amount', 'createdAt', 'updatedAt'],
    body: { fields: proofFields(client.uid) },
  }),
  403,
  'owner resubmits after the payment was verified'
);
ok('cierra el comprobante cuando el pago ya está verificado');

await db.doc('orders/rule-order-cash').set({
  userId: client.uid,
  userEmail: client.email,
  userName: 'Cliente Prueba',
  items: [{ id: 'pua-btr', name: 'Púa', price: 15, qty: 1 }],
  subtotal: 15,
  shipping: 0,
  total: 15,
  address: 'Oruro',
  phone: '',
  notes: '',
  deliveryType: 'pickup',
  paymentMethod: 'efectivo',
  paymentStatus: 'no_requiere',
  status: 'pendiente',
  statusHistory: [{ status: 'pendiente' }],
  idempotencyKey: 'rule-order-cash',
  orderNumber: 'KG-9006',
});

expectStatus(
  await rest('paymentProofs?documentId=rule-order-cash', {
    method: 'POST',
    idToken: client.idToken,
    body: {
      fields: {
        orderId: s('rule-order-cash'),
        userId: s(client.uid),
        image: s('data:image/jpeg;base64,AAAA'),
        amount: n(15),
        createdAt: timestamp(),
        updatedAt: timestamp(),
      },
    },
  }),
  403,
  'client uploads a proof for a cash order'
);
ok('impide subir comprobantes a pedidos que no los requieren');

expectStatus(
  await rest('notifications?documentId=rule-notification-proof', {
    method: 'POST',
    idToken: client.idToken,
    body: {
      fields: {
        userId: nul(),
        audience: s('admin'),
        type: s('payment_proof'),
        title: s('Comprobante por verificar'),
        body: s('Pago de prueba'),
        orderId: s('rule-order-qr'),
        readBy: arr([]),
      },
    },
  }),
  200,
  'client notifies the store about a payment proof'
);
ok('permite avisar a la tienda que hay un comprobante nuevo');

// --- admin -----------------------------------------------------------------
expectStatus(
  await rest('orders/rule-order-3', {
    method: 'PATCH',
    idToken: adminUser.idToken,
    masks: ['status'],
    body: { fields: { status: s('preparando') } },
  }),
  200,
  'admin changes the status'
);
ok('permite al administrador cambiar el estado');

expectStatus(
  await rest('products/pua-btr', {
    method: 'PATCH',
    idToken: adminUser.idToken,
    masks: ['price'],
    body: { fields: { price: n(99) } },
  }),
  200,
  'admin changes a price'
);
ok('permite al administrador editar el catálogo');

expectStatus(
  await rest('notifications?documentId=rule-notification-admin-created', {
    method: 'POST',
    idToken: adminUser.idToken,
    body: {
      fields: {
        userId: s(client.uid),
        type: s('order_status'),
        title: s('Tu pedido va en camino'),
        body: s('Aviso del administrador'),
        read: b(false),
      },
    },
  }),
  200,
  'admin notifies a customer'
);
ok('permite al administrador avisar al cliente');

expectStatus(
  await rest('collections?documentId=rule-collection-1', {
    method: 'POST',
    idToken: adminUser.idToken,
    body: {
      fields: {
        name: s('Bocchi'),
        description: s('Riffs de Kessoku Band'),
        color: s('#C93A72'),
        active: b(true),
        createdAt: timestamp(),
        updatedAt: timestamp(),
      },
    },
  }),
  200,
  'admin creates a collection'
);
ok('permite al administrador crear colecciones');

expectStatus(
  await rest('collections/rule-collection-1', {
    method: 'PATCH',
    idToken: adminUser.idToken,
    masks: ['name'],
    body: { fields: { name: s('Bocchi the Rock!') } },
  }),
  200,
  'admin renames a collection'
);
ok('permite al administrador renombrar colecciones');

expectStatus(
  await rest('fandoms?documentId=rule-fandom-1', {
    method: 'POST',
    idToken: adminUser.idToken,
    body: {
      fields: {
        name: s('Metal'),
        short: s('Metal'),
        color: s('#7A4FD0'),
        active: b(true),
        createdAt: timestamp(),
        updatedAt: timestamp(),
      },
    },
  }),
  200,
  'admin creates a fandom'
);
ok('permite al administrador crear etiquetas de fandom');

expectStatus(
  await rest('fandoms/rule-fandom-1', {
    method: 'PATCH',
    idToken: adminUser.idToken,
    masks: ['name'],
    body: { fields: { name: s('Metal extremo') } },
  }),
  200,
  'admin renames a fandom'
);
ok('permite al administrador renombrar etiquetas de fandom');

// --- profile ---------------------------------------------------------------
expectStatus(
  await rest(`users/${client.uid}`, {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['name'],
    body: { fields: { name: s('Cliente Actualizado') } },
  }),
  200,
  'client updates own profile'
);
ok('permite al cliente editar su perfil');

expectStatus(
  await rest(`users/${client.uid}`, {
    method: 'PATCH',
    idToken: client.idToken,
    masks: ['role'],
    body: { fields: { role: s('admin') } },
  }),
  403,
  'client promotes itself to admin'
);
ok('impide que el cliente se haga administrador');

// --- anonymous -------------------------------------------------------------
expectStatus(await rest('products/pua-btr'), 200, 'anonymous reads the catalog');
ok('permite leer el catálogo sin sesión');

expectStatus(
  await rest('products/pua-btr', {
    method: 'PATCH',
    masks: ['price'],
    body: { fields: { price: n(1) } },
  }),
  [401, 403],
  'anonymous writes a product'
);
ok('impide escribir sin sesión');

console.log(`\n${passed} comprobaciones aprobadas.\n`);
