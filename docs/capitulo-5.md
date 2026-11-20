# Capítulo 5. Conclusiones

## 5.1 Conclusiones

El desarrollo de KESUUBIT permitió comprobar que una aplicación móvil multiplataforma puede ordenar el proceso comercial de una tienda pequeña sin exigir la inversión de una gran plataforma. A continuación se presentan las conclusiones por objetivo.

1. **Diagnóstico del proceso actual.** Se identificó que la venta por mensajería, el control manual del stock y la comunicación reactiva generan sobreventa, pedidos dispersos y poca trazabilidad. Estas deficiencias justificaron el diseño de un flujo digital integrado.

2. **Arquitectura y sistema de diseño.** La combinación de Expo, React Native, TypeScript y Firebase permitió construir una sola base de código para Android, iOS y web, con una arquitectura clara y un sistema de diseño coherente con la identidad de la tienda. La separación entre catálogo, pedidos, avisos, usuarios y configuración facilitó el mantenimiento y las pruebas.

3. **Catálogo y ficha de producto.** El catálogo con 40 productos, búsqueda, filtros, favoritos, especificaciones y opiniones ofrece al cliente la información necesaria para decidir sin depender de una conversación. La disponibilidad visible reduce la incertidumbre sobre el stock.

4. **Carrito y checkout.** El checkout calcula la vista previa de totales, valida los datos, permite retiro o envío y crea el pedido en una transacción de Firestore. La prueba controlada y las suites automatizadas confirmaron que la transacción recalcula precios y envío desde la base de datos, valida el stock y escribe pedido, inventario, contador y avisos de forma atómica: si una parte falla, no queda un estado inconsistente. La variante con Cloud Functions queda implementada y probada para cuando se habilite el plan Blaze.

5. **Gestión de pedidos y pagos.** La numeración única, los estados, la línea de tiempo y la cancelación con reposición de stock permiten reconstruir la historia de cada compra. El flujo de QR y transferencia se reforzó con visor ampliado del comprobante, alerta de monto discrepante, cola de pedidos “sin comprobante”, verificación y rechazo inline con motivo, y un recordatorio visible y no bloqueante que acompaña al cliente hasta que envía la captura. Un pago verificado ya no puede rechazarse ni reemplazarse.

6. **Ofertas y colecciones.** El administrador puede registrar un precio anterior y la tarjeta muestra la bajada con el importe tachado y el porcentaje de descuento. El catálogo incorpora una sección “Bajaron de precio”, chip de ofertas y filtro por colecciones. Las colecciones se crean, renombran, ocultan y eliminan desde Ajustes; no se pueden borrar mientras tengan productos asignados. Cada producto define además su propio umbral de stock bajo, con respaldo en el valor global.

7. **Notificaciones.** La bandeja in-app, los avisos locales con sonido temático y el registro del token push mejoran la comunicación y dejan preparada la siguiente etapa. La aplicación respeta la decisión del usuario y explica cómo habilitar los avisos cuando el permiso se deniega. El conjunto sonoro se amplió con tres piezas propias para verificación, oferta y recibo, además de los avisos de carrito y confirmación.

8. **Panel administrativo y recibo.** El resumen con métricas, la gestión de productos, pedidos, usuarios, colecciones, etiquetas de fandom y configuración centralizan la operación. Desde la lista de pedidos se puede verificar o rechazar un comprobante sin salir de la pantalla e imprimir un recibo de pedido profesional desde el navegador. El cliente accede al mismo documento en formato digital desde el detalle de cada pedido, con opción de imprimirlo o guardarlo como PDF. El recibo incluye marca, número de pedido, fecha, cliente, entrega, productos, totales y estado de pago; no es una factura fiscal boliviana.

9. **Validación.** La aplicación superó las verificaciones de tipado, análisis estático y configuración (0 errores y 20/20 en Expo Doctor), sin errores de consola ni desbordamiento horizontal en la ruta principal revisada en resolución de escritorio. Una suite sobre el emulador de Firebase aprobó 47 comprobaciones de las reglas Spark que sostienen el checkout gratuito —incluidas las colecciones y etiquetas de fandom de lectura pública y escritura administrativa—, otra aprobó 27 comprobaciones de la ruta opcional de Cloud Functions y la suite unitaria aprobó 41 comprobaciones —33 del motor de recomendaciones, 3 de ofertas, 3 de stock por producto y 2 del recibo imprimible—. El export web de producción compila correctamente. La comprobación manual con cuenta administradora real (subida del QR, aprobación/rechazo de comprobante e impresión del recibo) queda como paso de acceptance previo a la entrega.

**Conclusión general**

KESUUBIT responde al problema planteado: integra catálogo, ofertas, colecciones, inventario, pedidos, pagos verificables, notificaciones, recibo y administración en una experiencia multiplataforma con identidad propia. El resultado es un producto mínimo viable sólido, con una base técnica preparada para crecer. La evidencia funcional respalda las hipótesis H1, H2, H3 y H4; la hipótesis H5 y la comparación cuantitativa con la línea base de la tienda quedan pendientes de la medición con usuarios. Por tanto, la conclusión se formula con honestidad: **la solución funciona y mejora el proceso, pero su impacto debe confirmarse con una evaluación empírica más amplia**.

## 5.2 Recomendaciones

**Para la tienda**

- Consolidar los registros de ventas y stock para construir una línea base y medir la mejora con datos.
- Aplicar la encuesta SUS y de satisfacción a al menos 15 clientes, y repetirla después de un periodo de uso.
- Definir una política de privacidad y un protocolo de atención para pedidos, cancelaciones y entregas.

**Para la aplicación**

- Configurar **App Check** y alertas de monitoreo para proteger y observar Firestore y, cuando se habilite el plan Blaze, las Cloud Functions en producción.
- Implementar el envío de **notificaciones push** con un backend y programar recordatorios de estado.
- Integrar una **pasarela de pago** en línea para confirmar los pagos automáticamente; el flujo de QR y transferencia con comprobante ya está implementado con verificación manual.
- Incorporar **combos multi-producto** en una fase posterior: primero hay que definir reglas de precio, inventario y devoluciones para paquetes; por ahora las ofertas operan como descuentos por producto.
- Ampliar la **suite de pruebas automatizadas** a la interfaz y a los flujos de extremo a extremo, e incorporar integración continua.
- Incorporar **métricas de producto** (ventas, conversión, abandono del carrito, productos más vistos) para apoyar las decisiones de la tienda.
- Evaluar el uso de **índices compuestos** y monitorear el costo de lecturas y escrituras de Firestore a medida que crezca el catálogo.
- Ampliar la accesibilidad con pruebas en lectores de pantalla y dispositivos de gama baja.

**Para futuras investigaciones**

- Repetir el estudio con una muestra más amplia y un diseño cuasiexperimental con grupo de control.
- Comparar el uso de la aplicación con el proceso manual en periodos equivalentes.
- Medir el impacto en ventas, cancelaciones y tiempo de atención con datos de la tienda.
- Explorar la fidelización de la comunidad anime mediante contenido, recompensas y eventos.

## 5.3 Cierre

El proyecto demuestra que la tecnología, cuando se diseña alrededor de un problema real y de una identidad concreta, puede transformar la operación de un pequeño negocio. KESUUBIT no es solo un catálogo: es una forma de ordenar el trabajo de la tienda, informar al cliente y representar a una comunidad que vive la música y el anime como parte de su identidad.
