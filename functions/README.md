# Cloud Functions de KESUUBIT (ruta opcional para Blaze)

> **Estado actual:** la aplicación se ejecuta en el plan gratuito **Spark**, así que
> los pedidos se crean con la transacción del cliente en `src/lib/orders.ts` y las
> reglas de `firestore.rules`. Este directorio conserva la ruta equivalente con
> validación de servidor para cuando se habilite **Blaze**. No forma parte del
> despliegue Spark: `firebase.json` no incluye funciones.

Funciones callable que concentran la creación, cancelación y cambio de estado de
pedidos. El servidor valida la sesión, recalcula precios y envío desde Firestore,
descuenta o repone stock y genera los avisos dentro de la misma transacción.

## Funciones

| Función | Quién puede llamarla | Qué hace |
| --- | --- | --- |
| `createOrder` | Usuario autenticado | Crea el pedido, descuenta stock, incrementa el contador y genera avisos |
| `cancelOrder` | Dueño del pedido o administrador | Cancela, repone stock y notifica al cliente |
| `updateOrderStatus` | Administrador | Avanza el estado y registra el historial |

Región: `us-central1`. Al activar esta ruta, el cliente debe inicializar
`getFunctions(app, 'us-central1')` y volver a llamar a las tres funciones.

## Idempotencia

El cliente genera una clave por intento de checkout y la envía como
`idempotencyKey`. La función usa esa clave como ID del documento de pedido. Si la
respuesta se pierde y el usuario reintenta, el servidor devuelve el pedido
original sin volver a descontar stock ni duplicar avisos.

## Requisitos

- Node.js 22 para el runtime (el emulador puede usar la versión local).
- Firebase CLI.
- Plan **Blaze** en el proyecto para desplegar funciones.

## Instalación

```bash
npm --prefix functions install
```

## Pruebas

La suite usa el emulador de Firebase, el archivo `firebase.blaze.json` y un
proyecto demo aislado. No requiere credenciales ni toca producción:

```bash
npm run functions:test
```

Cubre creación, precios, stock, contador, avisos, idempotencia, permisos,
cancelación y las reglas endurecidas. Son 27 comprobaciones.

La ruta gratuita tiene su propia suite de reglas:

```bash
npm run rules:test
```

## Despliegue (solo con Blaze)

El orden importa: primero las funciones y después las reglas endurecidas. Si se
publican las reglas antes que las funciones, el checkout deja de funcionar porque
el cliente ya no puede crear pedidos directamente.

```bash
npm run blaze:deploy
```

Ese script compila y despliega las funciones con `firebase.blaze.json` y luego
publica `firestore.blaze.rules`. También se pueden ejecutar por separado:

```bash
npm run functions:deploy
npm run rules:deploy:blaze
```

> **Nunca publiques `firestore.blaze.rules` en Spark.** La app gratuita necesita
> crear pedidos, mover stock, incrementar el contador y generar avisos; esas
> reglas lo impiden y el checkout quedaría bloqueado.

## Cómo volver a la ruta de servidor

1. Cambiar el proyecto a Blaze y confirmar que la facturación está activa.
2. Sustituir la transacción de `src/lib/orders.ts` por llamadas `httpsCallable` a
   `createOrder`, `cancelOrder` y `updateOrderStatus`, y exportar
   `getFunctions(app, 'us-central1')` desde `src/lib/firebase.ts`.
3. Ejecutar `npm run blaze:deploy`.
4. Repetir la verificación de checkout: pedido nuevo, stock, contador, avisos,
   cambio de estado, cancelación y escrituras directas denegadas.
5. Volver a `npm run rules:test` solo si se regresa a Spark; con las reglas
   endurecidas esa suite debe fallar a propósito en las escrituras del cliente.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run functions:build` | Compila TypeScript de `functions/` |
| `npm run functions:test` | Suite de 27 comprobaciones con `firebase.blaze.json` |
| `npm run functions:deploy` | Despliega solo las funciones (requiere Blaze) |
| `npm run rules:test` | Suite de 26 reglas Spark |
| `npm run rules:deploy` | Publica `firestore.rules` en el proyecto actual |
| `npm run rules:deploy:blaze` | Publica `firestore.blaze.rules` (requiere Blaze) |
| `npm run blaze:deploy` | Funciones y reglas endurecidas, en ese orden |
