# Capítulo 1. Planteamiento del problema

## 1.1 Formulación del problema

### 1.1.1 Contexto y antecedentes

La comercialización de instrumentos musicales y accesorios en Bolivia combina tiendas físicas con ventas apoyadas en redes sociales. En la ciudad de Oruro, los emprendimientos del rubro suelen operar con catálogos publicados en Instagram o WhatsApp, atención manual de cada consulta y un control de inventario llevado en cuadernos u hojas de cálculo. Este modelo funciona mientras el volumen de pedidos es bajo, pero se vuelve frágil cuando la tienda crece: la disponibilidad se consulta en el momento, los pedidos se confirman por mensaje y la información queda dispersa entre conversaciones.

**KESUUBIT** es un emprendimiento de instrumentos y accesorios musicales con una identidad visual inspirada en los anime *Bocchi the Rock!* y *K-On!*, dirigido a músicos jóvenes y aficionados al anime. Su operación actual depende de la atención por mensajería: el cliente pregunta por un producto, el vendedor verifica el stock, confirma el precio, coordina el pago y acuerda la entrega. No existe un catálogo centralizado, un historial de pedidos ni un mecanismo que avise automáticamente al cliente cuando su pedido cambia de estado.

> **Nota para la versión final:** completa este apartado con datos reales de la tienda (número de pedidos mensuales, cantidad de productos, personal involucrado y tiempo promedio de respuesta). Esos datos fortalecen el diagnóstico y evitan afirmaciones genéricas.

### 1.1.2 Planteamiento del problema

La gestión manual del proceso de venta produce los siguientes problemas:

- **Inventario desactualizado.** El stock se consulta de forma manual, por lo que dos clientes pueden recibir la confirmación del mismo producto y la tienda termina cancelando una venta o incumpliendo una entrega.
- **Pérdida de pedidos.** Las consultas y confirmaciones quedan repartidas entre chats, llamadas y notas; no existe un registro único que permita saber qué se vendió, a quién y en qué estado está.
- **Comunicación reactiva.** El cliente debe preguntar por el estado de su pedido. La tienda no dispone de avisos automáticos de confirmación, preparación, envío o cancelación.
- **Poca trazabilidad administrativa.** Al no contar con métricas de ventas, pedidos pendientes o productos con stock bajo, las decisiones de reposición se toman por intuición.
- **Experiencia de compra poco confiable.** El público objetivo está acostumbrado a experiencias móviles inmediatas: catálogo, carrito, total calculado y seguimiento del pedido. La atención por mensaje no cubre esa expectativa.
- **Identidad digital desaprovechada.** La tienda tiene una identidad temática clara (anime y música), pero no cuenta con un canal digital propio que la refleje y fidelice a su comunidad.

En síntesis, KESUUBIT no dispone de una herramienta que integre catálogo, control de stock, registro de pedidos, notificaciones y administración en una sola experiencia, lo que limita su crecimiento y afecta la confianza del cliente.

| Problema identificado | Respuesta en la aplicación |
| --- | --- |
| Stock desactualizado y sobreventa | Carrito y checkout con validación de stock y descuento transaccional |
| Pedidos dispersos | Pedidos con número único, estado e historial cronológico |
| Cliente sin información | Avisos in-app y notificaciones locales con sonido temático |
| Falta de control administrativo | Panel con métricas, productos, pedidos, usuarios y ajustes |
| Identidad poco aprovechada | Sistema de diseño inspirado en Bocchi the Rock! y K-On! |
| Uso solo desde el teléfono | Aplicación multiplataforma: Android, iOS y web responsive |

### 1.1.3 Pregunta de investigación

**Pregunta general**

¿De qué manera el desarrollo de una aplicación móvil multiplataforma puede mejorar la gestión de pedidos, el control de inventario y la comunicación con los clientes de KESUUBIT, una tienda de instrumentos musicales con temática anime de la ciudad de Oruro?

**Preguntas específicas**

1. ¿Qué procesos de venta, control de stock y atención al cliente realiza actualmente la tienda y cuáles son sus principales deficiencias?
2. ¿Qué arquitectura y tecnologías permiten construir una aplicación multiplataforma con datos en tiempo real, bajo costo de operación y seguridad básica?
3. ¿Cómo garantizar que un pedido descuente el stock de forma consistente y que una cancelación lo reponga?
4. ¿Cómo mantener informado al cliente sobre el estado de su pedido sin depender de la atención manual?
5. ¿Qué mecanismos de validación permiten comprobar la calidad, usabilidad y funcionamiento de la aplicación en móvil y web?

### 1.1.4 Delimitación

- **Espacial.** El proyecto se aplica a KESUUBIT, con retiro en tienda en la ciudad de Oruro (Bolivia) y cobertura de envíos coordinados dentro del departamento. La versión web puede consultarse desde cualquier ubicación.
- **Temporal.** El desarrollo se realiza durante el segundo semestre académico de 2026. *(Ajusta las fechas exactas según tu cronograma.)*
- **Temática.** Abarca catálogo, carrito, checkout, pedidos, inventario, notificaciones y administración. No incluye pasarela de pago en línea, facturación fiscal ni contabilidad.
- **Población.** Músicos jóvenes y aficionados al anime de entre 15 y 30 años interesados en instrumentos y accesorios. *(Ajusta el rango con tu población de estudio.)*

---

## 1.2 Objetivos

### 1.2.1 Objetivo general

Desarrollar una aplicación móvil multiplataforma para KESUUBIT que digitalice el catálogo, la gestión de pedidos y el control de inventario, e integre notificaciones y un panel administrativo, con una identidad visual inspirada en el anime y una experiencia de compra consistente en Android, iOS y web.

### 1.2.2 Objetivos específicos

1. Analizar el proceso actual de venta, control de stock y atención al cliente de la tienda para identificar requerimientos funcionales y no funcionales.
2. Diseñar la arquitectura de la información, el flujo de compra y un sistema de diseño con la identidad temática de KESUUBIT.
3. Implementar el catálogo con búsqueda, filtros, ficha de producto, favoritos y opiniones de usuarios.
4. Implementar el carrito y el checkout con cálculo de totales, validación de stock y creación transaccional del pedido.
5. Implementar la gestión de pedidos con numeración única, estados, historial cronológico y cancelación con reposición de stock.
6. Implementar notificaciones in-app y locales con sonido temático, dejando preparado el registro del token para notificaciones push futuras.
7. Implementar el panel administrativo con métricas, gestión de productos, pedidos, usuarios y configuración de la tienda.
8. Validar la aplicación mediante pruebas funcionales, de usabilidad y de calidad técnica en resoluciones móviles y de escritorio.

---

## 1.3 Justificación

### 1.3.1 Justificación social y práctica

La aplicación reduce la dependencia de la atención manual y ofrece al cliente información clara en todo momento: disponibilidad, precio, total, forma de entrega y estado del pedido. Esto disminuye cancelaciones, errores de coordinación y tiempos de respuesta, y permite que la tienda atienda más consultas sin aumentar su personal. Para un emprendimiento joven, contar con un canal digital propio también fortalece su imagen y su relación con la comunidad anime y musical.

### 1.3.2 Justificación técnica

El proyecto se construye con **Expo y React Native**, lo que permite mantener una sola base de código para Android, iOS y web. **Firebase Authentication** gestiona el acceso de clientes y administradores, mientras que **Cloud Firestore** almacena el catálogo, los pedidos y los avisos. La creación del pedido, el cálculo de precios y envío, y el descuento de stock se ejecutan en una **transacción de Firestore** que lee precios, stock y configuración directamente de la base de datos, de modo que el carrito no puede imponer importes ni cantidades. Las **reglas de seguridad** acotan cada escritura: un cliente solo crea pedidos coherentes a su nombre, mueve stock, incrementa el contador de uno en uno y genera sus propios avisos. El proyecto conserva además una implementación equivalente en **Cloud Functions** como ruta opcional para el plan Blaze, con validación del lado servidor. Las notificaciones combinan avisos dentro de la app con notificaciones locales y sonidos originales generados para la marca. El uso de **TypeScript**, un sistema de diseño propio y herramientas de validación (TypeScript, ESLint, Expo Doctor y pruebas automatizadas con el emulador de Firebase) aporta mantenibilidad y calidad.

### 1.3.3 Justificación económica

La solución aprovecha el nivel gratuito de Firebase y una única base de código, por lo que evita el costo de desarrollar y mantener aplicaciones nativas separadas. Al reducir sobreventas, pedidos perdidos y tiempo de atención, la tienda puede aumentar sus ventas sin invertir en infraestructura adicional. La arquitectura permite crecer por etapas: primero catálogo y pedidos, después notificaciones push y, más adelante, una pasarela de pago.

### 1.3.4 Justificación académica

El desarrollo integra competencias de ingeniería de software: levantamiento de requerimientos, diseño de arquitectura, modelado de datos, seguridad, experiencia de usuario, accesibilidad, pruebas y despliegue multiplataforma. Además, documenta decisiones técnicas con impacto real —como la transacción de Firestore para el stock, la comparación entre la ruta gratuita y la ruta con Cloud Functions, o la preparación para notificaciones push—, lo que convierte al proyecto en un caso de estudio completo para la asignatura.

### 1.3.5 Justificación de identidad y mercado

KESUUBIT se diferencia de otras tiendas por su vínculo con el anime y la música. La aplicación traduce esa identidad en colores, tipografía, ilustraciones y sonidos propios, y ofrece una experiencia que la comunidad reconoce. Esa coherencia no solo mejora la percepción de marca, sino que también favorece la fidelización y la recomendación entre fans.

---

## 1.4 Hipótesis

### 1.4.1 Hipótesis general

La implementación de una aplicación móvil multiplataforma que integre catálogo digital, checkout con control transaccional de stock, gestión de pedidos y notificaciones automáticas mejorará la gestión comercial y la experiencia de compra de KESUUBIT frente al proceso manual basado en mensajería.

### 1.4.2 Hipótesis específicas

- **H1.** El catálogo digital con disponibilidad actualizada reduce los errores de stock (sobreventa y cancelaciones por falta de producto) en comparación con la consulta manual.
- **H2.** El checkout con validación y descuento transaccional de stock garantiza la correspondencia entre el pedido registrado y las unidades disponibles, evitando pedidos sin existencias.
- **H3.** Las notificaciones automáticas del estado del pedido reducen el tiempo de comunicación con el cliente y la cantidad de consultas manuales por el estado de una compra.
- **H4.** El panel administrativo centraliza la información y reduce el tiempo de gestión de pedidos, productos y usuarios, además de facilitar la identificación de productos con stock bajo.
- **H5.** La experiencia multiplataforma con identidad temática alcanza un nivel de usabilidad aceptable y una valoración favorable por parte de los clientes que la utilizan.

### 1.4.3 Hipótesis nula

- **H0 general.** La aplicación móvil multiplataforma no produce diferencias significativas en la gestión de pedidos, el control de inventario ni la experiencia de compra respecto al proceso manual.
- **H0 específica (ejemplo para H1).** La disponibilidad mostrada por la aplicación no reduce la cantidad de errores de stock respecto a la consulta manual.

Las hipótesis nulas se contrastan con los indicadores de la sección 1.4.4; si el análisis no encuentra diferencias significativas, se conserva H0 y se reporta como resultado, sin ocultarlo.

### 1.4.4 Variables e indicadores

| Variable | Dimensión | Indicador | Instrumento | Escala |
| --- | --- | --- | --- | --- |
| **Independiente:** aplicación móvil multiplataforma KESUUBIT | Funcionalidad | Porcentaje de requerimientos implementados | Lista de verificación | Razón (%) |
|  | Calidad técnica | Errores de compilación, tipado y lint | TypeScript, ESLint, Expo Doctor | Razón (n.º) |
|  | Rendimiento | Tiempo de carga de catálogo y checkout | Pruebas cronometradas | Razón (s) |
| **Dependiente:** gestión de pedidos e inventario | Exactitud de stock | Diferencias entre stock del sistema y conteo físico | Auditoría de inventario | Razón (n.º) |
|  | Eficiencia | Tiempo medio de confirmación de un pedido | Registro de pedidos | Razón (min) |
|  | Trazabilidad | Porcentaje de pedidos con número, estado e historial completos | Firestore / panel admin | Razón (%) |
|  | Sobrevanta | Pedidos cancelados por falta de stock | Registro de pedidos | Razón (n.º) |
| **Dependiente:** experiencia del cliente | Usabilidad | Puntaje del System Usability Scale (SUS) | Cuestionario SUS | Intervalo (0–100) |
|  | Satisfacción | Media de valoración de la experiencia | Encuesta Likert | Ordinal (1–5) |
|  | Intención de recomendación | Porcentaje que recomendaría la app | Encuesta | Ordinal (%) |
| **Intervinientes** | Conectividad, dispositivo, alfabetización digital, tamaño de la tienda | — | Registro / observación | — |

### 1.4.5 Diseño de contrastación

- **Tipo de investigación:** aplicada, con enfoque mixto (cuantitativo y cualitativo) y diseño pre-experimental de pre-test y post-test con un solo grupo.
- **Población y muestra:** clientes de KESUUBIT y el administrador de la tienda. Se propone un muestreo no probabilístico por conveniencia con al menos 15 participantes para la encuesta de usabilidad y satisfacción. *(Ajusta según tu población real.)*
- **Técnicas e instrumentos:** observación del proceso de venta, revisión de registros de pedidos, encuesta SUS + Likert, pruebas funcionales y auditoría de stock antes y después del uso de la aplicación.
- **Procesamiento:** comparación de medianas antes/después de los indicadores de gestión y prueba de **Wilcoxon para muestras relacionadas** (α = 0,05), adecuada para muestras pequeñas y datos no paramétricos. Para usabilidad se interpreta el puntaje SUS; para satisfacción se reportan medias y porcentajes.
- **Criterio de aceptación:** se acepta una hipótesis específica cuando el indicador mejora y la prueba estadística arroja p < 0,05; en usabilidad, cuando el SUS es igual o superior a 70 (nivel “aceptable”). Si no se alcanza, se reporta el resultado y se explica la causa.

> **Nota según el tipo de proyecto:** si tu universidad clasifica el trabajo como *proyecto factible* o *descriptivo-propositivo*, las hipótesis pueden presentarse como **hipótesis de trabajo** y validarse con juicio de expertos, pruebas funcionales y la encuesta de aceptación, sin exigir contraste estadístico. Si se exige contraste, usa el diseño de 1.4.5.

---

## 1.5 Alcances y limitaciones *(opcional)*

**Alcances**

- Catálogo, búsqueda, filtros, favoritos, opiniones y ficha de producto.
- Carrito, checkout con retiro o envío, cálculo de totales y numeración de pedidos.
- Historial y detalle de pedidos con estados, cancelación y reposición de stock.
- Notificaciones in-app y locales con sonido temático, más registro del token para push.
- Panel administrativo con métricas, productos, pedidos, usuarios y ajustes de la tienda.
- Aplicación web responsive y aplicación móvil para Android e iOS.

**Limitaciones**

- El pago se coordina con la tienda: efectivo o tarjeta al confirmar, o QR/transferencia con comprobante y verificación manual del administrador. No se integra una pasarela de pago en línea.
- La confirmación de compras requiere conexión a internet, porque la transacción de Firestore se ejecuta contra la nube.
- La validación principal ocurre en la transacción del cliente y en las reglas de seguridad. La ruta con Cloud Functions queda implementada y probada, pero requiere el plan Blaze de Firebase; por eso no está activa en la versión gratuita. Mientras se use Spark, el riesgo residual es que una cuenta con conocimientos técnicos intente manipulaciones; las reglas limitan el daño a pedidos coherentes y movimientos de stock acotados, y la ruta de servidor queda lista para eliminar esa confianza cuando exista presupuesto.
- El sonido personalizado de las notificaciones del sistema requiere una compilación de desarrollo en Android; en web solo se reproduce el sonido dentro de la aplicación.
- Las notificaciones web dependen del permiso del navegador.
- El proyecto corresponde a una sola tienda; no contempla múltiples sucursales ni facturación fiscal.

---

### Recomendaciones para la versión final

1. Reemplaza los datos entre corchetes y la nota de 1.1.1 con información real de la tienda.
2. Añade citas y referencias (APA u otro formato solicitado) para el contexto de comercio electrónico y adopción móvil.
3. Mantén los objetivos específicos en infinitivo y alineados uno a uno con los resultados que presentarás en los capítulos siguientes.
4. Si tu universidad exige "Hipótesis" o "Variables", se pueden derivar de la pregunta general; avísame y las redacto.
