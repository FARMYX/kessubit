# Capítulo 2. Marco teórico

## 2.1 Área de estudio y campo de investigación

### 2.1.1 Área de estudio

El proyecto se ubica en el área de las **Tecnologías de la Información y la Comunicación (TIC)**, específicamente en la **ingeniería de software aplicada al comercio electrónico móvil**. Su desarrollo articula tres campos complementarios: el desarrollo de aplicaciones multiplataforma, la gestión de datos en la nube y la experiencia de usuario.

| Elemento | Descripción |
| --- | --- |
| **Área** | Tecnologías de la Información y la Comunicación (TIC) |
| **Campo** | Ingeniería de software aplicada al comercio electrónico móvil (*m-commerce*) |
| **Subárea** | Aplicaciones móviles multiplataforma, bases de datos en la nube, experiencia de usuario y seguridad |
| **Línea de investigación** | Transformación digital de pequeñas y medianas empresas |
| **Contexto** | KESUUBIT, tienda de instrumentos musicales y accesorios con temática anime, Oruro (Bolivia) |
| **Población de estudio** | Jóvenes músicos y aficionados al anime que compran instrumentos y accesorios |

La elección del área responde a una necesidad concreta: una tienda pequeña que vende por redes sociales necesita un canal digital propio que ordene su operación sin exigir la inversión de una gran plataforma. El proyecto no se limita a “hacer una app”; integra procesos comerciales, reglas de negocio, seguridad, comunicación con el cliente y una identidad de marca.

### 2.1.2 Campo de investigación

El estudio se enmarca en la **investigación aplicada con enfoque de ciencia del diseño** (*design science*): el objeto de estudio es el proceso de venta, control de inventario y comunicación con el cliente, y el artefacto que se diseña, construye y evalúa es la aplicación KESUUBIT. El enfoque es **mixto**: se miden indicadores cuantitativos (errores de stock, tiempos de gestión, usabilidad) y se recogen valoraciones cualitativas de clientes y del administrador.

El campo es interdisciplinario porque combina:

- **Ingeniería de software:** arquitectura, modelado de datos, transacciones, pruebas y despliegue.
- **Gestión comercial:** inventario, pedidos, precios, entregas y atención al cliente.
- **Diseño y comunicación:** identidad visual, usabilidad, accesibilidad y contenido.
- **Marketing digital:** posicionamiento de nicho y fidelización de la comunidad anime.

---

## 2.2 Desarrollo del marco teórico

### 2.2.1 Antecedentes

El comercio electrónico dejó de ser exclusivo de las grandes empresas. Plataformas como Shopify, WooCommerce, Tiendanube o Mercado Libre permiten que pequeños negocios publiquen catálogos y reciban pedidos, pero suelen imponer costos mensuales, comisiones o plantillas poco flexibles. En paralelo, muchos emprendimientos de nicho gestionan sus ventas por Instagram y WhatsApp, con resultados limitados en control de stock y trazabilidad.

Diversos trabajos académicos sobre aplicaciones móviles para pequeñas empresas coinciden en que la digitalización mejora la organización de pedidos, la comunicación con el cliente y la capacidad de medir ventas; sin embargo, también señalan barreras como el costo, la falta de conocimientos técnicos y la resistencia al cambio. El proyecto retoma esas conclusiones y propone una solución acotada, de bajo costo y adaptada a una tienda con identidad propia.

> **Nota para la versión final:** incorpora aquí dos o tres antecedentes académicos (tesis o artículos) con autor, año y aporte, en el formato de citas que exija tu universidad. Los párrafos anteriores sirven como introducción, no sustituyen las referencias.

### 2.2.2 Aplicaciones móviles y desarrollo multiplataforma

Una **aplicación móvil** es un programa diseñado para ejecutarse en dispositivos portátiles, con acceso a capacidades como cámara, almacenamiento, sensores, notificaciones y conectividad. Según su construcción se clasifican en:

- **Nativas:** desarrolladas para un sistema operativo específico (Kotlin/Java en Android, Swift en iOS). Ofrecen el mejor rendimiento y acceso al hardware, pero requieren equipos y bases de código separadas.
- **Híbridas:** se ejecutan dentro de un contenedor web (por ejemplo, Cordova o Ionic). Reducen costos, pero pueden perder fluidez y acceso nativo.
- **Multiplataforma:** comparten lógica y, en distinto grado, interfaz entre sistemas. **React Native** permite construir interfaces con componentes nativos usando JavaScript o TypeScript; **Expo** añade un conjunto de módulos, herramientas y servicios que simplifican el desarrollo, las pruebas y la compilación.
- **Aplicaciones web progresivas (PWA):** se instalan desde el navegador y ofrecen cierta experiencia de app, aunque con límites en notificaciones y acceso al sistema.

Para este proyecto se eligió **Expo sobre React Native con TypeScript**, porque permite mantener una sola base de código para Android, iOS y web, reutilizar componentes y tipar los datos del catálogo, los pedidos y los avisos. **Expo Router** organiza la navegación por archivos y **EAS** queda disponible para compilar y distribuir la aplicación.

### 2.2.3 Comercio electrónico y comercio móvil

El **comercio electrónico** es la compra y venta de bienes o servicios mediante canales digitales. Cuando la transacción se realiza desde un dispositivo móvil se denomina **comercio móvil** (*m-commerce*). Su adopción depende de factores como la confianza en la tienda, la claridad del precio, la facilidad del checkout, la disponibilidad de medios de pago locales y la comunicación sobre la entrega.

El proceso de compra suele describirse en etapas: **descubrimiento** del producto, **consideración** (comparación, dudas), **compra** y **retención** (seguimiento, recompra). Dos problemas frecuentes son el **abandono del carrito**, asociado a costos ocultos, formularios largos o falta de confianza, y la **sobreventa**, que ocurre cuando se confirma un producto que ya no está disponible.

En el contexto boliviano conviven el pago contra entrega, la transferencia bancaria, el QR y la coordinación directa con la tienda. KESUUBIT adopta un modelo mixto: **retiro en tienda** o **envío a domicilio**, con costo de envío y umbral de envío gratuito configurables. El checkout ofrece efectivo, transferencia y QR; en los dos últimos el cliente paga desde su banca móvil y sube un comprobante con el monto, que el administrador verifica manualmente. La aplicación no cobra en línea, pero deja el flujo preparado para incorporar una pasarela en el futuro.

### 2.2.4 Gestión de inventario y pedidos

El **inventario** es el conjunto de bienes disponibles para la venta. Su gestión busca mantener el equilibrio entre **desabastecimiento** (stock insuficiente, ventas perdidas) y **sobrestock** (capital inmovilizado). Conceptos habituales son el **SKU** (identificador único de producto), el **stock mínimo o de seguridad**, el **punto de reposición** y la **merma** (pérdidas por daño, robo o error).

Un **pedido** es la solicitud formal de uno o más productos por parte de un cliente. Su ciclo de vida incluye la creación, confirmación, preparación, envío, entrega y, eventualmente, cancelación o devolución. La **trazabilidad** consiste en registrar cada cambio de estado con fecha, responsable y motivo, de modo que cliente y administrador puedan reconstruir la historia.

La **consistencia** es crítica: si dos clientes compran la última unidad al mismo tiempo, el sistema debe impedir que ambos pedidos se confirmen. Para lograrlo se utilizan **transacciones** y control de concurrencia. En el modelo **ACID**, una transacción es atómica (todo o nada), consistente, aislada y duradera. Las bases NoSQL suelen adoptar garantías más flexibles, pero ofrecen transacciones para operaciones críticas. KESUUBIT ejecuta la transacción desde la app: lee el stock, valida la cantidad, recalcula precios y envío con los datos de Firestore, crea el pedido, descuenta las unidades y genera los avisos; si algo falla, no se escribe nada. La cancelación ejecuta la operación inversa y repone el stock. La misma lógica existe como Cloud Function para la ruta opcional con Blaze, donde la transacción corre con privilegios de servidor.

### 2.2.5 Bases de datos NoSQL, Firestore y seguridad

Las bases de datos **NoSQL** surgieron para escenarios de gran volumen, esquemas flexibles y datos distribuidos. Se clasifican en documentales, clave-valor, columnares y de grafos. **Cloud Firestore** es una base documental de Google: organiza la información en **colecciones** y **documentos** (similares a JSON), permite consultas en tiempo real, funcionamiento sin conexión y escalabilidad administrada.

Sus características principales son:

- **Escucha en tiempo real:** los clientes reciben cambios mediante *listeners*, sin refrescar la pantalla.
- **Transacciones y escrituras por lotes:** garantizan atomicidad en operaciones relacionadas.
- **Reglas de seguridad:** se evalúan en el servidor y definen quién puede leer o escribir cada documento.
- **Índices:** aceleran consultas; los compuestos se declaran cuando se combinan filtros y ordenamientos.
- **Modelo de costos:** se cobra por lecturas, escrituras y almacenamiento, lo que exige diseñar consultas eficientes.

En KESUUBIT, Firestore almacena `products`, `orders`, `notifications`, `users`, `storeConfig`, `counters` y `reviews`. El catálogo se actualiza en vivo, los pedidos se crean en una **transacción del cliente** que lee precios, stock y configuración directamente de Firestore, el contador de números de pedido se incrementa dentro de la misma transacción y las reglas limitan las operaciones por rol. La **seguridad** se apoya en autenticación (identificar al usuario) y autorización (decidir qué puede hacer). Se aplica el **principio de mínimo privilegio**: el cliente solo lee sus pedidos y avisos, puede marcarlos como leídos y editar su perfil; durante el checkout puede crear un pedido coherente a su nombre, mover stock, incrementar el contador de uno en uno y generar avisos propios o dirigidos a la tienda. No puede cambiar precios, saltar la numeración, fabricar avisos para otras cuentas ni avanzar el estado de un pedido. El administrador gestiona el catálogo, los usuarios y los estados. La variante con **Cloud Functions y Admin SDK** se conserva como ruta opcional para el plan Blaze: allí la validación, el stock y los avisos se ejecutan con privilegios de servidor y las reglas pueden negar toda escritura directa.

### 2.2.6 Notificaciones y comunicación con el cliente

Las notificaciones son mensajes que informan un evento. Se clasifican en:

- **Push:** enviadas desde un servidor a través de servicios como Firebase Cloud Messaging (FCM) o Apple Push Notification service (APNs). Requieren token del dispositivo y, en Android, un **canal** con importancia y sonido definidos.
- **Locales:** programadas por la propia aplicación en el dispositivo, sin servidor.
- **In-app:** se muestran dentro de la interfaz (bandeja, banner o *toast*).

En Android, el **canal de notificación** agrupa avisos con el mismo comportamiento; su sonido e importancia se fijan al crearlo y no siempre pueden modificarse después. En iOS, el usuario debe autorizar las notificaciones y los sonidos personalizados se incluyen en el paquete de la aplicación. En web, la **Notification API** depende del permiso del navegador y no permite sonidos personalizados del sistema.

KESUUBIT combina una **bandeja in-app** con notificaciones **locales** que usan un sonido original de la marca y un canal propio (`kessoku-orders-v1`). Además, guarda el token de Expo para habilitar push en el futuro. La aplicación respeta la decisión del usuario: no solicita permiso al iniciar sesión, sino cuando la persona activa los avisos, y explica cómo habilitarlos si los rechazó. En web, el sonido se reproduce dentro de la aplicación; el sonido del sistema requiere una compilación de desarrollo en Android.

### 2.2.7 Experiencia de usuario, accesibilidad y diseño responsive

La **experiencia de usuario (UX)** abarca lo que una persona siente y logra al interactuar con un producto. La **usabilidad** se refiere a la eficacia, eficiencia y satisfacción con que se alcanzan los objetivos. Las **heurísticas de Nielsen** (visibilidad del estado, lenguaje del usuario, control y libertad, consistencia, prevención de errores, reconocimiento, flexibilidad, diseño minimalista, recuperación de errores y ayuda) siguen siendo un marco útil para evaluar interfaces.

La **accesibilidad** busca que el producto pueda usarse en distintas condiciones: contraste suficiente, textos alternativos, objetivos táctiles amplios, navegación por teclado, foco visible y respeto por la preferencia de **movimiento reducido**. Las pautas **WCAG** organizan estos criterios en perceptible, operable, comprensible y robusto.

El **diseño responsive** adapta la interfaz al tamaño de pantalla. En móvil conviene priorizar una navegación inferior y acciones al alcance del pulgar; en escritorio, una barra lateral y mayor densidad de información. Un **sistema de diseño** con *tokens* de color, espaciado, tipografía y radios mantiene la coherencia y acelera el desarrollo.

KESUUBIT aplica estos principios con una barra inferior flotante en móvil y una barra lateral en escritorio, estados de carga con *skeletons*, mensajes vacíos y de error claros, confirmaciones antes de acciones destructivas, *feedback* táctil y sonoro, foco visible y soporte de movimiento reducido. La interfaz mantiene la identidad de la tienda sin sacrificar legibilidad.

### 2.2.8 Identidad de marca y cultura anime

La **identidad de marca** es el conjunto de elementos que permiten reconocer y diferenciar una organización: nombre, símbolos, colores, tipografía, tono de comunicación y experiencias. El **diseño emocional** busca generar vínculos mediante estímulos visuales, sonoros y narrativos.

La **cultura anime** (*otaku*) es una comunidad con códigos, referencias y consumo intensivo de contenido. Las marcas que la comprenden construyen mensajes auténticos y evitan el uso superficial de estética. KESUUBIT se inspira en *Bocchi the Rock!* y *K-On!*: dos obras centradas en bandas escolares, amistad y aprendizaje musical. Esa referencia no es decorativa; conecta la tienda con el imaginario de sus clientes.

La aplicación traduce la identidad en una paleta rosa y crema, tipografía clara, ilustraciones de producto, textos con actitud de banda y sonidos propios (chime, pop y confirmación). La coherencia entre catálogo, checkout, avisos y panel administrativo refuerza la confianza y la recordación de marca.

### 2.2.9 Metodología de desarrollo, tecnologías y calidad

El proyecto se desarrolló con un **enfoque iterativo incremental**: se construyó un producto mínimo viable y se amplió por fases, con validación al final de cada una. Las fases fueron: (1) fundamentos de diseño y estructura responsive; (2) catálogo, producto, carrito, checkout, pedidos y administración; (3) transacción de pedidos, historial, notificaciones, reglas e índices, con una variante de Cloud Functions conservada para el plan Blaze; y (4) movimiento, accesibilidad y rendimiento.

La **calidad** se trabajó en varios niveles: tipado estático con **TypeScript**, análisis con **ESLint**, diagnóstico de dependencias y configuración con **Expo Doctor**, pruebas funcionales de extremo a extremo en móvil y escritorio, una suite de reglas Spark sobre el emulador de Firebase, una suite de la ruta opcional de Cloud Functions, una suite unitaria del motor de recomendaciones, y revisión de accesibilidad (foco, contraste, movimiento reducido). La suite Spark cubre creación de pedidos, stock, contador, avisos, cancelación, lectura de pedidos propios e inexistentes, permisos, escrituras denegadas, comprobantes de pago y verificación administrativa (38 comprobaciones); la de Cloud Functions cubre la misma lógica con validación de servidor (27 comprobaciones); la unitaria valida señales de gusto, ranking, motivos, exclusiones y productos relacionados (33 comprobaciones). Queda pendiente ampliar la cobertura a la interfaz.

| Tecnología | Uso en el proyecto |
| --- | --- |
| Expo SDK 58 y React Native | Base multiplataforma para Android, iOS y web |
| TypeScript | Tipado del catálogo, pedidos, avisos y componentes |
| Expo Router | Navegación por archivos y rutas web |
| Firebase Authentication | Registro, inicio de sesión y perfiles |
| Cloud Firestore | Catálogo, pedidos, avisos, configuración, contadores y transacción de checkout |
| Cloud Functions y Admin SDK | Ruta opcional para Blaze: creación, cancelación y cambio de estado con validación y stock del lado servidor |
| Reglas de seguridad e índices | Autorización por rol, escrituras acotadas y consultas eficientes |
| expo-notifications | Notificaciones locales, canales y token push |
| expo-audio y expo-haptics | Sonidos originales y respuesta táctil |
| expo-image y Reanimated | Imágenes optimizadas y animaciones |
| Git y Firebase CLI | Control de versiones y despliegue de reglas (y de funciones en la ruta Blaze) |

### 2.2.10 Marco normativo aplicable

En Bolivia, el uso de tecnologías de la información se enmarca en la **Ley N.º 164 de 2011 (Ley General de Telecomunicaciones, Tecnologías de Información y Comunicación)**, que reconoce el acceso a las TIC y regula los servicios de telecomunicaciones. La protección de los derechos del consumidor se apoya en la **Ley N.º 453 de 2013 (Ley General de los Derechos de las Usuarias y los Usuarios y de las Consumidoras y los Consumidores)**, que establece el derecho a la información veraz, a la seguridad y a un trato equitativo.

Para el proyecto se aplican además principios de **privacidad desde el diseño**: solicitar solo los datos necesarios (nombre, teléfono, correo y dirección de entrega), informar para qué se usan, pedir consentimiento antes de enviar notificaciones y permitir desactivarlas. La aplicación no almacena datos de pago ni procesa cobros en línea. Se recomienda revisar la normativa vigente y las políticas de Firebase/Google al momento de publicar, e incluir una política de privacidad accesible desde la aplicación.

> **Nota:** si tu universidad exige un marco legal más amplio, se pueden añadir normas sobre comercio electrónico, firmas digitales y protección de datos personales, verificando siempre su vigencia.

### 2.2.11 Síntesis del marco teórico

El marco teórico permite sostener tres decisiones centrales del proyecto. Primero, el uso de **tecnología multiplataforma** reduce costos y mantiene una experiencia consistente en móvil y web. Segundo, una base **NoSQL con transacciones y reglas de seguridad** ofrece la agilidad que necesita una tienda pequeña sin renunciar a la consistencia del inventario. Tercero, la **experiencia de usuario, las notificaciones y la identidad de marca** convierten una herramienta de gestión en un canal de venta que genera confianza y pertenencia.

En conjunto, estos conceptos explican por qué la aplicación no es solo un catálogo digital: es un sistema que ordena el proceso comercial, informa al cliente, protege la información y representa la identidad de KESUUBIT.
