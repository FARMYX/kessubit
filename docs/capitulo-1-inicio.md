# Capítulo 1. Introducción, descripción y alcance del proyecto

## Introducción

Comprar un instrumento musical en Bolivia todavía depende, en muchos casos, de escribir por WhatsApp, esperar una respuesta y preguntar si el producto sigue disponible. Ese modelo funciona mientras los pedidos son pocos, pero se vuelve frágil cuando el negocio crece: se pierde el historial de ventas, se duplican las confirmaciones de stock y el cliente no tiene una forma clara de saber en qué estado está su compra.

KESUUBIT nace para resolver esa situación en un emprendimiento de instrumentos y accesorios musicales de la ciudad de Oruro. La propuesta no es solo publicar un catálogo en internet, sino construir un canal propio donde convivan la identidad de la tienda, la disponibilidad real de los productos, el carrito, los pedidos y los avisos al cliente. El resultado es una aplicación móvil multiplataforma, con versión web, que mantiene una sola base de código y puede operar con el nivel gratuito de Firebase.

Este capítulo presenta el proyecto y delimita qué cubre la solución. La descripción explica el problema que se ataca, la propuesta de valor y las decisiones técnicas que la sostienen. El alcance precisa qué módulos quedan incluidos y cuáles se dejan para etapas posteriores, de modo que el lector sepa qué se evaluará en los capítulos siguientes.

---

## 1.1 Descripción del proyecto

### 1.1.1 Contexto y problema

La venta de instrumentos y accesorios en Oruro combina tiendas físicas con catálogos publicados en redes sociales. La atención se realiza mensaje por mensaje y el control de inventario se lleva en cuadernos u hojas de cálculo. Cuando una persona consulta por un producto, el vendedor debe revisar la disponibilidad, confirmar el precio, coordinar la forma de pago y acordar la entrega. Toda esa información queda repartida entre conversaciones, sin un registro único ni avisos automáticos.

De esta situación se derivan cuatro dificultades principales:

- **Sobreventa.** Dos clientes pueden recibir la confirmación del mismo artículo si el stock se consulta de forma manual.
- **Pérdida de información.** Los pedidos confirmados quedan en chats y notas, sin número, estado ni historial.
- **Comunicación reactiva.** El cliente debe preguntar por el estado de su pedido porque la tienda no envía avisos por defecto.
- **Decisiones sin datos.** Sin métricas de ventas ni alertas de stock bajo, la reposición se decide por intuición.

### 1.1.2 La propuesta KESUUBIT

KESUUBIT es una aplicación móvil y web para la tienda del mismo nombre, orientada a músicos jóvenes y aficionados a la música y la cultura anime. El propósito es digitalizar el ciclo completo de compra: descubrir un producto, ver su disponibilidad, agregarlo al carrito, confirmar el pedido, realizar el pago acordado y seguir el estado de la entrega.

La aplicación está construida con **Expo y React Native**, usa **TypeScript** y se apoya en **Firebase Authentication** y **Cloud Firestore**. La identidad visual es propia de la marca: paleta rosa KESUUBIT, ilustraciones vectoriales, tipografía editorial y sonidos originales generados para el proyecto. El catálogo admite etiquetas editables por el administrador para distinguir colecciones y fandoms, sin fijar nombres de franquicias en el código.

La experiencia incluye:

- Catálogo con búsqueda, filtros por categoría, ficha de producto, favoritos y opiniones.
- Recomendaciones basadas en afinidades del cliente y productos relacionados.
- Carrito con cálculo de totales, envío o retiro en tienda y validación de stock en el momento de la compra.
- Pedidos con número único, estados, historial cronológico, cancelación con reposición de stock y comprobante de pago verificable.
- Recibo de pedido imprimible o exportable a PDF; no es una factura fiscal.
- Panel administrativo para productos, pedidos, usuarios, colecciones, ajustes y configuración del banner.
- Avisos dentro de la aplicación y notificaciones locales, con opción de tema claro, oscuro o sistema.

### 1.1.3 Decisiones técnicas relevantes

La creación del pedido se ejecuta como una **transacción de Firestore**: el servidor vuelve a leer precios, stock y configuración, descuenta las unidades y registra el pedido con su número. De este modo, el carrito no puede imponer importes ni cantidades. Las **reglas de seguridad** complementan la transacción: un cliente solo puede crear pedidos coherentes a su nombre, mover stock dentro de límites y generar sus propios avisos; la escritura de catálogo y ajustes queda reservada al administrador.

El proyecto mantiene además una implementación equivalente en **Cloud Functions** como ruta opcional para el plan Blaze. En la versión gratuita (Spark) no se activa: la transacción del cliente y las reglas son la fuente de verdad. Esta decisión evita costos recurrentes y deja una ruta de migración documentada si en el futuro se requiere validación estrictamente servidora.

Los pagos se coordinan con la tienda en tres modalidades: **QR**, **transferencia bancaria** y **efectivo contra entrega**. Las dos primeras requieren que el cliente suba un comprobante y que el administrador lo verifique; la última no requiere comprobante. No se integra una pasarela de pago ni se acepta tarjeta de crédito, de acuerdo con la operación real del emprendimiento y el objetivo de mantener el plan gratuito.

La interfaz respeta la decisión del sistema sobre tema claro u oscuro y permite al usuario fijarlo manualmente. El tema oscuro emplea fondos ciruela profunda y textos cálidos, evita el blanco puro y mantiene contraste suficiente en acciones y estados. Las animaciones se limitan a microinteracciones y respetan la preferencia de movimiento reducido.

---

## 1.2 Alcance del proyecto / producto

### 1.2.1 Alcance funcional

| Módulo | Qué incluye |
| --- | --- |
| Catálogo | Listado, búsqueda, filtros por categoría, etiquetas de colección/fandom, ficha de producto, imágenes y especificaciones. |
| Descubrimiento | Recomendaciones para el cliente, productos relacionados y favoritos. |
| Carrito y checkout | Suma de totales, cálculo de envío o retiro, validación de stock, creación transaccional del pedido y número único. |
| Pagos | QR y transferencia con comprobante, efectivo contra entrega, verificación manual del administrador y registro del estado de pago. |
| Pedidos | Historial, detalle, estados (pendiente, preparando, enviado, entregado, cancelado) y reposición de stock al cancelar. |
| Recibo | Documento de pedido con datos del cliente, productos, totales y estado de pago; impresión y PDF; aviso explícito de que no es factura fiscal. |
| Notificaciones | Avisos in-app, notificaciones locales, sonido temático y registro del token para push futuro. |
| Administración | Métricas, productos, pedidos, usuarios, colecciones, fandoms, ofertas, ajustes de la tienda, QR y banner del catálogo. |
| Personalización | Tema claro, oscuro o sistema; texto del banner editable; anuncio y datos de contacto configurables. |

### 1.2.2 Alcance técnico

- Una sola base de código para Android, iOS y web mediante Expo Router.
- Firebase Authentication y Cloud Firestore en el plan Spark, sin funciones activas en producción.
- Reglas de seguridad probadas con el emulador de Firestore y transacción de pedidos validada en cliente.
- Sistema de diseño propio con tokens de color, tipografía, espaciado y radii; soporte de tema oscuro.
- Pruebas automatizadas unitarias, de reglas y de Cloud Functions, además de verificación de tipos, lint y exportación web.
- Imágenes y comprobantes almacenados como datos JPEG dentro de Firestore, sin depender de almacenamiento de pago.

### 1.2.3 Fuera de alcance

- Pasarelas de pago en línea, cobro con tarjeta y facturación fiscal.
- Múltiples sucursales, multi-tienda o logística de envíos propia.
- Notificaciones push activas: solo se registra el token y queda preparada la ruta para habilitarlas con un plan de pago.
- Combos multi-producto y descuentos automáticos por volumen; las ofertas actuales son bajadas de precio por producto activadas manualmente desde administración.
- Sincronización offline: la confirmación de compras requiere conexión a internet porque la transacción se ejecuta contra Firestore.
- Auditoría contable, reportes fiscales ni integración con sistemas externos de inventario.

### 1.2.4 Limitaciones conocidas

- La verificación de comprobantes es manual y depende de que el administrador revise cada pago por QR o transferencia.
- Los comprobantes se guardan como datos en Firestore; con muchas imágenes grandes pueden acercarse al límite de tamaño del documento.
- El sonido personalizado de notificaciones del sistema requiere una compilación de desarrollo en Android; en web se reproduce solo dentro de la aplicación.
- La validación principal vive en la transacción del cliente y en las reglas; la ruta con Cloud Functions queda lista para eliminar esa confianza cuando exista presupuesto para el plan Blaze.

---

## Notas para la versión final

- Sustituir los ejemplos descriptivos por datos reales de la tienda (pedidos por mes, catálogo actual, tiempo de respuesta).
- Confirmar con la universidad si el capítulo debe denominarse «Planteamiento del problema» o «Descripción del proyecto» y ajustar la numeración del índice.
- Si se exige marco teórico, este capítulo debe enlazarse con el Capítulo 2 sin repetir la definición de tecnologías.
