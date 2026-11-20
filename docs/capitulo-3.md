# Capítulo 3. Metodología

## 3.1 Tipo de investigación

El proyecto se desarrolla bajo un **enfoque mixto**, con predominio cuantitativo y complemento cualitativo. El enfoque cuantitativo permite medir indicadores objetivos —errores de stock, tiempos de gestión, porcentaje de pedidos trazables y puntaje de usabilidad—, mientras que el enfoque cualitativo recoge la percepción de clientes y del administrador sobre el proceso de compra y el uso de la aplicación.

Por su finalidad, es una **investigación aplicada**, porque no busca solo describir un fenómeno, sino resolver un problema concreto de KESUUBIT mediante un artefacto de software. Por su nivel, combina lo **descriptivo** (diagnóstico del proceso actual de venta, inventario y comunicación), lo **propositivo** (diseño y construcción de la aplicación) y lo **evaluativo** (medición de resultados antes y después de su uso).

El **diseño** es **pre-experimental, de pre-test y post-test con un solo grupo**. No se busca comparar la aplicación contra otra solución ni aislar todas las variables externas, sino observar si los indicadores del proceso mejoran después de implementar la aplicación. Este diseño es adecuado para un proyecto académico con recursos y tiempo limitados, y se complementa con el enfoque de **ciencia del diseño** (*design science*): se construye un artefacto, se valida con pruebas funcionales y se evalúa su aceptación.

Los métodos de apoyo son:

- **Analítico-sintético:** se descompone el proceso de venta en etapas (catálogo, carrito, checkout, pedido, entrega, cancelación) para analizarlas y luego integrarlas en un flujo único.
- **Deductivo:** a partir de los conceptos de comercio electrónico, inventario y usabilidad se derivan los requerimientos y las métricas de evaluación.
- **Prototipado iterativo:** se construyen versiones incrementales de la aplicación y se ajustan con base en la validación.

La **población** está conformada por los clientes de KESUUBIT y el administrador de la tienda. Se aplica un **muestreo no probabilístico por conveniencia** con al menos 15 clientes para las encuestas de usabilidad y satisfacción, y se trabaja con el administrador como informante clave. El tamaño y la selección se justifican por la accesibilidad de los participantes y por el carácter exploratorio del proyecto; los resultados no se generalizan a toda la población, sino que describen el caso estudiado.

## 3.2 Operacionalización de variables

La hipótesis general relaciona la aplicación (variable independiente) con la gestión de pedidos y la experiencia del cliente (variables dependientes). La siguiente tabla traduce cada variable a dimensiones, indicadores, instrumentos y escalas medibles.

| Variable | Definición conceptual | Definición operacional | Dimensión | Indicador | Instrumento | Escala |
| --- | --- | --- | --- | --- | --- | --- |
| **Independiente:** aplicación móvil multiplataforma KESUUBIT | Software que digitaliza catálogo, pedidos, inventario, notificaciones y administración para la tienda. | Artefacto funcional en Android, iOS y web, evaluado por su funcionalidad, calidad técnica y rendimiento. | Funcionalidad | Porcentaje de requerimientos implementados | Lista de verificación de requerimientos | Razón (%) |
|  |  |  | Calidad técnica | Número de errores de tipado y lint | TypeScript y ESLint | Razón (n.º) |
|  |  |  | Rendimiento | Tiempo de carga del catálogo y del checkout | Pruebas cronometradas | Razón (s) |
| **Dependiente 1:** gestión de pedidos e inventario | Conjunto de procesos para registrar pedidos, controlar existencias y dar seguimiento a cada compra. | Medición de la exactitud del stock, la eficiencia de confirmación, la trazabilidad y la sobreventa antes y después de usar la app. | Exactitud de stock | Diferencias entre stock del sistema y conteo físico | Auditoría de inventario | Razón (n.º y %) |
|  |  |  | Eficiencia | Tiempo medio de confirmación de un pedido | Registro de pedidos | Razón (min) |
|  |  |  | Trazabilidad | Porcentaje de pedidos con número, estado e historial completos | Firestore y panel administrativo | Razón (%) |
|  |  |  | Sobrevanta | Pedidos cancelados por falta de stock | Registro de pedidos | Razón (n.º) |
| **Dependiente 2:** experiencia del cliente | Percepción y facilidad de uso que experimenta el cliente durante la compra. | Medición de la usabilidad percibida, la satisfacción y la intención de recomendación después de usar la app. | Usabilidad | Puntaje del System Usability Scale (SUS) | Cuestionario SUS de 10 ítems | Intervalo (0–100) |
|  |  |  | Satisfacción | Media de valoración de la experiencia | Encuesta Likert de 5 ítems | Ordinal (1–5) |
|  |  |  | Intención de recomendación | Porcentaje de clientes que recomendaría la app | Encuesta | Razón (%) |
| **Intervinientes:** conectividad, dispositivo, alfabetización digital y tamaño de la tienda | Factores externos que pueden influir en los resultados y no se manipulan. | Registro de las condiciones de uso para interpretar los resultados con contexto. | Condiciones de uso | Tipo de dispositivo, calidad de conexión y experiencia previa | Ficha de registro del participante | Nominal |

**Formulas y criterios de medición**

- **Exactitud de stock (%)** = `(1 − diferencias / unidades auditadas) × 100`. Se audita una muestra de al menos 10 productos antes y después del uso.
- **Tiempo medio de confirmación** = suma de tiempos de confirmación / número de pedidos registrados.
- **Trazabilidad (%)** = `(pedidos con número, estado e historial / total de pedidos) × 100`.
- **SUS:** se puntúa cada ítem de 1 a 5; a los ítems impares se les resta 1, a los pares se les resta su valor de 5; se suman los resultados y se multiplica por 2,5. Un puntaje igual o superior a 70 se considera aceptable.
- **Satisfacción:** promedio de los ítems Likert (1 = muy insatisfecho, 5 = muy satisfecho).

La comparación antes/después se realiza con la **prueba de Wilcoxon para muestras relacionadas** (α = 0,05), adecuada para muestras pequeñas y datos que no siguen una distribución normal. Para los indicadores descriptivos se reportan medianas, promedios y porcentajes.

## 3.3 Técnicas de investigación

Se combinan técnicas documentales, de campo y de validación técnica para triangular los resultados.

| Técnica | Instrumento | A quién se aplica | Qué mide |
| --- | --- | --- | --- |
| **Observación directa** | Guía de observación del proceso de venta | Proceso actual de la tienda | Etapas, tiempos, errores y puntos de fricción |
| **Entrevista semiestructurada** | Guion de 10 preguntas | Administrador de KESUUBIT | Necesidades, problemas y expectativas del negocio |
| **Revisión documental** | Ficha de registro de ventas, stock y precios | Registros de la tienda | Línea base de pedidos, disponibilidad y tiempos |
| **Encuesta de usabilidad** | Cuestionario SUS (10 ítems) | Clientes participantes (n ≥ 15) | Usabilidad percibida (0–100) |
| **Encuesta de satisfacción** | Escala Likert de 5 ítems | Clientes participantes | Satisfacción e intención de recomendación |
| **Auditoría de inventario** | Planilla de conteo físico | Muestra de productos | Exactitud del stock antes y después |
| **Pruebas funcionales** | Matriz de casos de prueba | Aplicación en Android y web | Cumplimiento de flujos y manejo de errores |
| **Juicio de expertos** *(opcional)* | Rúbrica de evaluación | Docente o profesional invitado | Calidad de la interfaz y de la solución |

**Procedimiento**

1. **Diagnóstico:** observación del proceso, entrevista al administrador y revisión de registros para construir la línea base.
2. **Diseño y construcción:** definición de requerimientos, arquitectura, modelo de datos y sistema de diseño; implementación por fases.
3. **Pre-test:** medición de los indicadores de gestión y aplicación de la encuesta inicial a los participantes.
4. **Uso de la aplicación:** los participantes recorren el flujo completo (catálogo, carrito, checkout, pedido y aviso) y el administrador gestiona un pedido.
5. **Post-test:** repetición de la encuesta, auditoría de stock y registro de tiempos.
6. **Análisis y triangulación:** comparación de indicadores, interpretación del SUS y contraste con las observaciones cualitativas.

**Casos de prueba funcionales**

- Compra completa con retiro en tienda y con envío a domicilio.
- Intento de compra sin stock suficiente.
- Cancelación de un pedido pendiente y reposición del stock.
- Pago por QR o transferencia: el cliente sube el comprobante y el administrador verifica o rechaza el pago con motivo.
- Cambio de estado desde el panel administrativo y aviso al cliente.
- Acceso a rutas administrativas con cuenta de cliente (debe denegarse).
- Visualización en móvil (390 px) y escritorio (1200 px), sin desbordamiento horizontal.
- Activación y desactivación de notificaciones y sonido.

**Consideraciones éticas**

La participación es voluntaria y con consentimiento informado. No se recogen datos sensibles; los correos y teléfonos se usan solo para la operación de la tienda y se presentan de forma agregada en el documento. Las notificaciones se activan únicamente con autorización del usuario y pueden desactivarse en cualquier momento.

## 3.4 Cronograma de actividades por realizar

El cronograma se organiza en 16 semanas. La semana 1 corresponde al inicio del semestre; ajusta las fechas a tu calendario académico.

| N.º | Actividad | Semanas | Entregable | Estado |
| --- | --- | --- | --- | --- |
| 1 | Diagnóstico y levantamiento de requerimientos | 1–2 | Informe de requerimientos y línea base | Completado |
| 2 | Revisión bibliográfica y marco teórico | 1–3 | Capítulos 1 y 2 | Completado |
| 3 | Diseño de arquitectura, modelo de datos y sistema de diseño | 3–5 | Esquema de Firestore y prototipo visual | Completado |
| 4 | Configuración del entorno, autenticación y perfiles | 5–6 | Registro e inicio de sesión funcionales | Completado |
| 5 | Catálogo, búsqueda, filtros y ficha de producto | 6–8 | Catálogo navegable con opiniones | Completado |
| 6 | Carrito y checkout con validación de stock | 8–10 | Pedido transaccional con totales | Completado |
| 7 | Historial, detalle y cancelación de pedidos | 10–11 | Línea de tiempo y reposición de stock | Completado |
| 8 | Notificaciones, sonidos y token push | 11–12 | Bandeja de avisos y notificaciones locales | Completado |
| 9 | Panel administrativo y configuración de la tienda | 12–13 | Métricas, productos, pedidos y usuarios | Completado |
| 10 | Reglas de seguridad, índices y despliegue | 13–14 | Reglas publicadas y pruebas de permisos | Completado |
| 11 | Pruebas funcionales, de usabilidad y accesibilidad | 14–15 | Informe de pruebas y resultados | En curso |
| 12 | Documentación final y preparación de la defensa | 15–16 | Documento final y presentación | En curso |

**Hitos principales**

- **Semana 8:** producto mínimo viable con catálogo, carrito y checkout.
- **Semana 12:** versión beta con pedidos, notificaciones y panel administrativo.
- **Semana 16:** versión final validada y documentación completa.

**Recursos previstos**

- **Humanos:** estudiante responsable del proyecto, administrador de la tienda y clientes participantes.
- **Técnicos:** equipo de desarrollo, navegador, emulador o dispositivo Android, conexión a internet y cuenta de Firebase.
- **Materiales:** documentos de la tienda, planillas de auditoría, cuestionarios digitales y guía de pruebas.

> **Nota:** si tu docente exige un cronograma en formato Gantt, se puede convertir esta tabla a un diagrama por semanas; también se pueden reemplazar las semanas relativas por fechas exactas.
