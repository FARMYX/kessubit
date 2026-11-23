# Capítulo 4. Resultados y discusión

## 4.1 Resultados del desarrollo de la aplicación

Se construyó KESUUBIT como una aplicación multiplataforma con **Expo SDK 58, React Native y TypeScript**, usando **Firebase Authentication** para el acceso y **Cloud Firestore** como base de datos. La aplicación cubre el flujo completo de compra y administración, y mantiene una identidad visual inspirada en *Bocchi the Rock!* y *K-On!*.

### 4.1.1 Módulos implementados

| N.º | Módulo | Funcionalidad principal | Estado |
| --- | --- | --- | --- |
| 1 | Autenticación y perfiles | Registro, inicio de sesión, recuperación de contraseña, edición de nombre y foto, favoritos | Implementado |
| 2 | Catálogo | 40 productos, búsqueda, filtros por categoría y fandom, productos destacados, aviso y filtro de últimas unidades | Implementado |
| 3 | Ficha de producto | Imágenes, especificaciones, disponibilidad con aviso de stock bajo, opiniones y valoración, favoritos | Implementado |
| 4 | Carrito | Cantidades, validación de stock, subtotal y persistencia local | Implementado |
| 5 | Checkout | Envío o retiro, métodos de pago visibles (efectivo, QR y transferencia), validación de datos y creación del pedido en una transacción de Firestore | Implementado |
| 6 | Pedidos | Lista, detalle, número único, estados, línea de tiempo y cancelación con reposición de stock en la misma transacción | Implementado |
| 7 | Notificaciones | Bandeja in-app, contador de no leídas, avisos locales, sonido temático y token push | Implementado |
| 8 | Pagos con QR y comprobante | El administrador publica la imagen del QR, el cliente paga desde su banca móvil y sube el comprobante con el monto; el administrador lo aprueba o lo rechaza con motivo | Implementado |
| 9 | Panel administrativo | Resumen con identidad KESUUBIT, cola de pendientes (pagos, pedidos, reposición y QR), métricas, productos, pedidos, usuarios y ajustes | Implementado |
| 10 | Configuración de la tienda | Costo de envío, umbral de envío gratis, retiro, dirección, horarios, QR de pago, titular e instrucciones | Implementado |
| 11 | Diseño responsive | Barra inferior flotante en móvil y barra lateral en escritorio | Implementado |
| 12 | Accesibilidad | Foco visible, contraste, objetivos táctiles, movimiento reducido y textos claros | Implementado |
| 13 | Seguridad | Reglas por rol, escrituras acotadas, transacción de checkout, idempotencia, comprobantes protegidos y contador de pedidos secuencial | Implementado |

### 4.1.2 Calidad técnica

| Verificación | Herramienta | Resultado |
| --- | --- | --- |
| Tipado estático | `tsc --noEmit` | 0 errores |
| Análisis estático | ESLint | 0 errores |
| Dependencias y configuración | Expo Doctor | 20/20 verificaciones aprobadas |
| Errores de consola en rutas principales | Navegador | 0 errores |
| Desbordamiento horizontal | Medición del DOM a 390 px y 1200 px | 0 en 9 rutas |
| Recursos de sonido | Solicitud HTTP | Archivos WAV presentes y servidos como `audio/wav` |
| Reglas de seguridad | Firebase CLI | Compiladas en el emulador y publicadas en el proyecto |
| Reglas Spark | Emulador de Firebase | 38/38 comprobaciones aprobadas |
| Ruta opcional de Cloud Functions | Emulador de Firebase | 27/27 comprobaciones aprobadas |
| Motor de recomendaciones | `node:test` con `tsx` | 33/33 comprobaciones aprobadas |
| Tipado de funciones | `tsc` en `functions/` | 0 errores |

Las rutas verificadas fueron: catálogo, ficha de producto, carrito, pedidos, avisos, perfil, local, inicio de sesión y checkout. En móvil se comprobó una barra inferior de cinco pestañas; en escritorio, una barra lateral de 248 px. Ninguna ruta presentó desbordamiento horizontal.

## 4.2 Resultados de la validación funcional

Se ejecutaron pruebas de extremo a extremo con una cuenta de prueba y datos controlados. La siguiente tabla resume los casos ejecutados.

| Caso de prueba | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- |
| Registro e inicio de sesión | Crear cuenta y acceder al catálogo | Cuenta creada y sesión iniciada correctamente | Aprobado |
| Catálogo y filtros | Mostrar productos y filtrar por categoría | 40 productos visibles y filtros funcionales | Aprobado |
| Añadir al carrito | Actualizar contador y mostrar confirmación | Producto añadido, aviso emergente y contador actualizado sin recargar | Aprobado |
| Checkout con retiro en tienda | Crear pedido y descontar stock | Pedido `KG-0001` por Bs 15,00; stock 50 → 49; flujo replicado en la suite de reglas Spark | Aprobado |
| Cálculo de envío | Aplicar costo y umbral de envío gratis | Envío de Bs 25,00 y envío gratis desde Bs 500 validados en la transacción desde la configuración de la tienda | Aprobado |
| Cancelación del pedido | Cancelar y reponer stock | Estado `cancelado`, historial de 3 pasos y stock 49 → 50 | Aprobado |
| Cambio de estado desde admin | Actualizar estado y avisar al cliente | Estado `preparando`, historial actualizado y aviso creado | Aprobado |
| Acceso de invitado a `/admin` | Denegar el acceso | Redirección a la tienda | Aprobado |
| Acceso de cliente a acciones de admin | Ocultar acciones administrativas | Acciones no visibles para la cuenta de cliente | Aprobado |
| Notificaciones en web | Informar la denegación de permiso | Aviso con instrucciones del navegador, sin errores | Aprobado |
| Activación y desactivación de sonido | Cambiar la preferencia sin errores | Cambio aplicado y sin errores de consola | Aprobado |
| Compra con envío a domicilio | Crear pedido con dirección y costo | Total calculado por la transacción desde Firestore; envío gratis validado en la suite | Aprobado |
| Compra sin stock suficiente | Impedir la operación | Rechazada con error de precondición; stock y contador intactos | Aprobado |
| Reintento del mismo checkout | No duplicar pedido ni stock | Misma orden `KG-0001`; stock, contador y avisos sin cambios | Aprobado |
| Precio manipulado en el cliente | Usar el precio de Firestore | Subtotal Bs 15 con el precio real, no el falso enviado | Aprobado |
| Escritura directa indebida | Denegar por reglas | Precio, pedido ajeno y contador saltado rechazados con HTTP 403 | Aprobado |
| Cliente cambia estado o cancela pedido ajeno | Denegar por rol | Permiso denegado en ambos casos | Aprobado |
| Pago por QR con comprobante | Mostrar el QR, permitir subir el comprobante y verificar el pago | QR visible en el checkout, comprobante guardado en `paymentProofs`, estado `en_revision` y aprobación del administrador | Aprobado en emulador |
| Rechazo del comprobante | Exigir motivo y permitir reenviar | Estado `rechazado` con motivo visible y reenvío habilitado para el cliente | Aprobado en emulador |
| Stock bajo visible | Avisar sin abrir cada producto | Banner de últimas unidades en el catálogo, filtro “Reponer” en administración y aviso en la ficha | Aprobado |

### 4.2.1 Detalle de la prueba controlada de pedido

1. Se agregó al carrito una unidad de “Púa negra y dorada BTR!” (Bs 15,00, stock inicial 50).
2. Se completó el checkout con retiro en tienda y pago contra entrega.
3. La transacción del cliente leyó el precio y el stock desde Firestore, creó el pedido `KG-0001`, descontó una unidad (stock 49), incrementó el contador de pedidos a 1 y generó dos avisos: uno para el cliente y otro para la audiencia administrativa.
4. El administrador cambió el estado a `preparando`; se agregó una entrada al historial y se creó un aviso para el cliente.
5. El cliente canceló el pedido; la transacción de cancelación pasó el estado a `cancelado`, agregó una tercera entrada al historial, repuso la unidad (stock 50) y generó el aviso de cancelación.
6. Al finalizar, los datos de prueba se eliminaron para no alterar la información real de la tienda.
7. El flujo se validó además con una suite de 38 reglas Spark y con la suite de 27 comprobaciones de la ruta opcional de Cloud Functions, ambas sobre el emulador de Firebase.
8. La transacción se repitió contra el proyecto en vivo con una cuenta temporal: creación del pedido, descuento de stock, incremento del contador, aviso al cliente, reintento idempotente, cancelación con reposición y rechazo de tres escrituras prohibidas (estado, precio y salto del contador). Al final se eliminaron los documentos de prueba y el stock volvió a 50.

### 4.2.2 Pruebas automatizadas de reglas Spark y de la ruta opcional de Cloud Functions

Se implementaron dos suites ejecutadas con `firebase emulators:exec` sobre un proyecto demo aislado. Ninguna usa credenciales de producción.

La **suite Spark** valida las reglas que sostienen el checkout gratuito y aprobó 38 comprobaciones:

- Creación de un pedido coherente por su dueño; rechazo a nombre de otra cuenta, con estado distinto de `pendiente` o con una clave de idempotencia distinta al ID del documento.
- Lectura: el dueño consulta su pedido y un documento inexistente (necesario para la idempotencia); otro cliente no puede leerlo.
- Stock: el cliente puede moverlo dentro de la compra, pero no cambiar precios ni dejarlo negativo.
- Contador: solo se permite sumar uno; no se puede saltar ni reiniciar la numeración.
- Avisos: el cliente crea los propios y el dirigido a la tienda, pero no los de otras cuentas.
- Comprobantes: el cliente sube, consulta y reenvía el comprobante de su pedido QR o transferencia mientras el pago no esté verificado; no puede subirlo a pedidos ajenos ni a métodos que no lo requieren.
- Verificación de pagos: solo el administrador marca el pago como verificado o rechazado; el cliente no puede aprobar su propio pago y un pago verificado ya no se puede rechazar ni reemplazar.
- Cancelación: el dueño cancela mientras está `pendiente` o `preparando`; no puede cancelar un pedido entregado ni ajeno.
- Administración: el administrador cambia estados, edita el catálogo y avisa al cliente.
- Perfil: el cliente edita lo propio y no puede autopromoverse a administrador.
- Catálogo público de lectura y escrituras anónimas denegadas.

La **suite de Cloud Functions** valida la ruta opcional para Blaze con reglas endurecidas y aprobó 27 comprobaciones:

- Autenticación obligatoria en las tres callables (`createOrder`, `cancelOrder`, `updateOrderStatus`).
- Creación del pedido con precios, envío y total calculados desde Firestore.
- Descuento de stock, incremento del contador y avisos escritos en la misma transacción.
- Idempotencia: reintentar con la misma clave devuelve la orden original sin descontar stock ni duplicar avisos.
- Rechazo de claves usadas por otro usuario, cantidades inválidas, dirección faltante y stock insuficiente.
- Ignorar precios y nombres manipulados por el cliente.
- Envío gratis desde el umbral configurado y respeto a la configuración de entrega de la tienda.
- Permisos: un cliente no cambia estados ni cancela pedidos ajenos; el administrador sí.
- Cancelación con reposición de stock e historial, y rechazo de doble cancelación.
- Reglas endurecidas: el cliente no crea pedidos ni avisos, no modifica stock ni contador, y ni siquiera el administrador edita pedidos directamente.

Las suites se ejecutan con `npm run rules:test` (Spark) y `npm run functions:test` (ruta Blaze).

### 4.2.3 Pruebas automatizadas del motor de recomendaciones

El motor híbrido de recomendaciones se cubrió con una suite unitaria ejecutada con `node:test` y `tsx`. A diferencia de las suites con emulador, no necesita Firebase: evalúa funciones puras con catálogos y perfiles controlados. La suite aprobó 33 comprobaciones:

- Construcción de la señal de gusto desde favoritos, compras, opiniones y carrito, con sus pesos acumulados.
- Exclusión de pedidos cancelados y de identificadores que no existen en el catálogo.
- Refuerzo del gusto con opiniones positivas y penalización con opiniones negativas.
- Cálculo de la valoración media y del número de opiniones por producto.
- Estabilidad de la semilla diaria y rotación del orden sin alterar el puntaje.
- Prioridad de los favoritos y de los productos afines al cliente.
- Penalización de productos agotados y preferencia por destacados y mejor valorados.
- Motivos legibles: favorito, carrito, compra, categoría, fandom, marca, destacado, valoración y caso neutro.
- Exclusión de agotados y de identificadores indicados, respeto del límite y determinismo.
- Productos relacionados: exclusión del producto de referencia, prioridad de la misma categoría y límite.

La suite se ejecuta con `npm test` y forma parte de las verificaciones previas a cada entrega.

## 4.3 Resultados en la gestión de pedidos e inventario

| Indicador | Antes del uso de la app | Después de la prueba controlada | Observación |
| --- | --- | --- | --- |
| Exactitud de stock | *[Completar con el registro de la tienda]* | 100 % en la prueba (50 → 49 → 50) | El stock se descontó y repuso sin diferencias |
| Trazabilidad de pedidos | *[Completar]* | 100 % en la prueba | Pedido con número, estado e historial de 3 entradas |
| Sobrevanta | *[Completar]* | 0 en la prueba | La transacción valida el stock antes de confirmar |
| Tiempo de confirmación | *[Completar]* | Confirmación inmediata en la prueba | No se cronometró con precisión |
| Avisos generados | *[Completar]* | 4 avisos (2 al crear, 1 por estado, 1 por cancelación) | Cliente y administrador informados |

**Lectura de los resultados**

La prueba demuestra que el flujo crítico funciona de forma consistente: la transacción escribe el pedido, el stock, el contador y los avisos en una sola operación atómica, y la cancelación revierte el stock. La numeración única (`KG-0001`) y el historial permiten reconstruir la operación, lo que responde al problema de trazabilidad identificado en el diagnóstico. La columna “Antes” debe completarse con los registros de la tienda para cuantificar la mejora; sin esa línea base, los resultados deben interpretarse como una validación funcional y no como una comparación estadística.

## 4.4 Resultados de usabilidad y satisfacción

Esta sección presenta los indicadores definidos en el Capítulo 3. Los valores entre corchetes deben completarse con la encuesta aplicada a los clientes; **no se reportan cifras inventadas**.

| Indicador | Instrumento | Resultado | Interpretación |
| --- | --- | --- | --- |
| Usabilidad | SUS (10 ítems) | *[x] / 100* | ≥ 70: aceptable; ≥ 85: excelente |
| Satisfacción general | Likert (1–5) | *[x] / 5* | Valores altos indican mejor percepción |
| Intención de recomendación | Encuesta | *[x] %* | Porcentaje de clientes que recomendaría la app |
| Participantes | Encuesta | *[n]* | Se recomienda n ≥ 15 |

**Interpretación del SUS:** los ítems impares se puntúan como `respuesta − 1` y los pares como `5 − respuesta`; la suma se multiplica por 2,5. Un puntaje menor a 50 se considera inaceptable, entre 50 y 70 marginal, y superior a 70 aceptable.

Además de las encuestas, se observó que la navegación no presentó errores de consola, que las acciones destructivas piden confirmación, que el carrito y el checkout comunican el estado de la operación y que la interfaz se adapta sin desbordamiento a móvil y escritorio. Estas observaciones son cualitativas y complementan, pero no sustituyen, la medición con usuarios.

## 4.5 Discusión

### 4.5.1 Respuesta a la pregunta de investigación

La pregunta general planteaba de qué manera una aplicación móvil multiplataforma podía mejorar la gestión de pedidos, el control de inventario y la comunicación con los clientes de KESUUBIT. Los resultados muestran que la aplicación **integra esos tres procesos en un solo flujo**: el catálogo informa la disponibilidad, el checkout descuenta el stock mediante una transacción de Firestore y las notificaciones comunican cada cambio de estado. La evidencia funcional respalda la respuesta; la confirmación estadística de la mejora queda sujeta a la medición con los registros de la tienda y la encuesta de usuarios.

### 4.5.2 Contrastación de hipótesis

| Hipótesis | Evidencia obtenida | Estado |
| --- | --- | --- |
| **H1.** El catálogo digital reduce errores de stock | El stock se descontó y repuso sin diferencias en la prueba controlada | Se apoya funcionalmente; falta contrastación estadística |
| **H2.** El checkout transaccional evita pedidos sin existencias | La transacción escribió pedido, stock, contador y avisos de forma atómica | Se apoya funcionalmente |
| **H3.** Las notificaciones reducen la comunicación manual | Se generaron avisos al crear, cambiar de estado y cancelar; el cliente los vio en la bandeja | Se apoya parcialmente; falta medir tiempos |
| **H4.** El panel administrativo mejora la trazabilidad | El administrador consultó el pedido, cambió el estado y generó el aviso correspondiente | Se apoya parcialmente; falta medir tiempos de gestión |
| **H5.** La experiencia multiplataforma es usable | Interfaz responsive sin desbordamiento y sin errores de consola; falta el SUS | Pendiente de contraste con usuarios |

La hipótesis general se apoya en la evidencia funcional, pero no se declara aceptada estadísticamente hasta completar la medición con usuarios y la línea base de la tienda.

### 4.5.3 Relación con el marco teórico

Los resultados son coherentes con los conceptos desarrollados en el Capítulo 2:

- **Desarrollo multiplataforma:** una sola base de código permitió cubrir Android, iOS y web, reducir el esfuerzo de mantenimiento y mantener una experiencia consistente.
- **Transacciones y consistencia:** la creación del pedido y el descuento de stock en una transacción de Firestore confirman que las operaciones atómicas evitan estados inconsistentes, tal como plantea el modelo ACID.
- **Base NoSQL en tiempo real:** Firestore permitió reflejar cambios de stock, estados y avisos sin recargar la pantalla.
- **Notificaciones:** la combinación de bandeja in-app, avisos locales y sonido propio mejora la comunicación, aunque las limitaciones de Android y web obligan a documentar su alcance.
- **Experiencia de usuario e identidad:** la navegación adaptativa, los estados de carga y la estética anime convierten la herramienta en un canal coherente con la comunidad de la tienda.

### 4.5.4 Limitaciones y amenazas a la validez

- **Muestra pequeña y por conveniencia:** los resultados no se generalizan a todos los clientes de la tienda.
- **Diseño pre-experimental:** no hay grupo de control; factores externos como la novedad o la temporada pueden influir.
- **Línea base incompleta:** falta consolidar los registros previos de la tienda para comparar indicadores.
- **Pruebas funcionales y automatizadas:** se ejecutaron los casos críticos, una suite de 38 reglas Spark, una suite de 27 comprobaciones de la ruta opcional de Cloud Functions y 33 pruebas unitarias del motor de recomendaciones; queda pendiente ampliar la cobertura a la interfaz.
- **Dependencia de la nube:** la creación y cancelación de pedidos requiere conexión a Firestore. La ruta con Cloud Functions, que añadiría validación del lado servidor, requiere el plan Blaze y no está activa en la versión gratuita.
- **Notificaciones:** el sonido personalizado del sistema requiere una compilación de desarrollo en Android y no está disponible en web; el envío push queda preparado, no implementado.
- **Pagos:** no se integra una pasarela en línea. El flujo de QR y transferencia funciona con comprobante y verificación manual del administrador, de modo que la confirmación del pago depende de la revisión humana.

## 4.6 Síntesis de resultados

La aplicación cumple los módulos priorizados y supera las verificaciones técnicas de tipado, lint y configuración. La prueba controlada y las suites automatizadas demuestran que el flujo de compra, el control de stock, la trazabilidad, los permisos y las notificaciones funcionan de extremo a extremo, tanto en la ruta gratuita como en la variante opcional con Cloud Functions. La evaluación con usuarios y la comparación cuantitativa con la línea base de la tienda son las tareas que completan la validación de las hipótesis.
