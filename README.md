# MiniGlobal AI · A2 Space English Assessment Platform

> Plataforma interactiva de evaluación diagnóstica de inglés nivel A2 para niños con temática espacial y tutor inteligente **Cosmo**, desarrollada para **Global Certified English Center**.

© 2026 **Global Certified English Center**. Todos los derechos reservados.

---

## 🚀 Resumen del Proyecto

**MiniGlobal AI** es una solución EdTech diseñada para transformar la experiencia de evaluación de competencias del idioma inglés (MCER / CEFR Nivel A2) en una aventura espacial inmersiva. A través de la guía del tutor marciano **Cosmo**, los estudiantes resuelven 10 desafíos equilibrados entre **Grammar, Vocabulary, Reading, Listening y Speaking** con reconocimiento y síntesis de voz en tiempo real.

---

## 📋 Respuestas a Cuestiones Técnicas y de Arquitectura

### 1. Stack Elegido y Razones

| Capa / Módulo | Tecnología | Justificación Técnica y Pedagógica |
| :--- | :--- | :--- |
| **Frontend UI / PWA** | **Ionic 8 + Angular 17/18** (Standalone Components) | **Experiencia multiplataforma lista para producción (Web, PWA, iOS y Android con Capacitor)**. Para una institución como *Global Certified English Center*, los estudiantes acceden desde tablets, teléfonos móviles o laptops. Ionic ofrece componentes táctiles optimizados para niños (botones grandes, retroalimentación táctil, animaciones fluidas). Angular Standalone ofrece arquitectura modular moderna, tipado estricto con TypeScript, lazy loading nativo y compilación ultrarrápida con esbuild y Vite. |
| **Speech Engine** | **Web Speech API** (`SpeechRecognition` + `SpeechSynthesis`) | Permite evaluar la pronunciación en Speaking y reproducir transmisiones de listening en inglés y tips de Cosmo en español **directamente en el navegador del alumno**, con latencia cero y sin requerir dependencias externas pesadas ni costes de API por llamada durante el prototipo. |
| **Autenticación** | **Firebase Authentication** | Soporte integrado para **Google Sign-In**, correo/contraseña y sesiones anónimas. Permite emitir tokens JWT criptográficamente seguros y gestionar identidades sin infraestructura de servidores dedicados. |
| **Persistencia Reactiva** | **Firebase Realtime Database (RTDB) / Cloud Firestore** | Sincronización bidireccional reactiva por WebSockets. Permite que las calificaciones, intentos y expedientes de los estudiantes se actualicen instantáneamente en el dashboard del alumno y en la vista del profesor. |
| **Cómputo Serverless** | **Firebase Cloud Functions (Node.js)** | Ejecución aislada de la lógica de negocio y evaluación de exámenes en backend, eliminando cualquier posibilidad de que el alumno vea o manipule la clave de respuestas. |
| **CI/CD & Hosting** | **GitHub Actions + GitHub Pages** | Pipeline automatizado de integración continua que compila con optimizaciones de producción y despliega al Edge CDN global con alta disponibilidad y soporte de enrutamiento SPA mediante HashLocation y página de redirección 404. |

---

### 2. Arquitectura Propuesta

Se propone una **Arquitectura Serverless Orientada a Eventos con Enfoque Zero-Trust en el Cliente**, estructurada en cinco capas principales:

* **Capa de Cliente Multiplataforma**: La aplicación se ejecuta como Single Page Application (SPA) y Progressive Web App (PWA) empaquetable en Android e iOS. Implementa componentes autónomos de Angular y servicios desacoplados para la lógica de autenticación, voz y evaluación. Cuenta con resiliencia offline que guarda los progresos localmente si el estudiante pierde la conexión en el aula.
* **Capa de Distribución Perimetral (Edge CDN)**: Los activos estáticos de la aplicación se distribuyen a través de una red de entrega de contenido (CDN) global con compresión avanzada y tiempos de respuesta inferiores a un segundo.
* **Capa de Seguridad e Identidad**: Gestionada mediante Firebase Authentication, emitiendo credenciales criptográficas seguras (JWT) tanto para cuentas institucionales de Google Workspace como para usuarios con correo y contraseña.
* **Capa de Cómputo Serverless (Backend Evaluador)**: Microservicios en Cloud Functions aislados del cliente. El navegador envía exclusivamente las elecciones del alumno; la función recupera la clave de respuestas privada, ejecuta la calificación y almacena el resultado oficial.
* **Capa de Persistencia y Caché**: Almacenamiento reactivo estructurado en Realtime Database y Cloud Firestore, complementado con una capa de memoria caché para acelerar consultas frecuentes y metadatos curriculares.

---

### 3. Modelo de Datos

Estructura de datos NoSQL organizada en entidades modulares:

* **users (Expediente de Usuario)**: Almacena la identidad del estudiante o profesor. Contiene el identificador único (UID), nombre visible, correo electrónico, rol institucional (estudiante, profesor o administrador), avatar cósmico seleccionado, rango o título de cadete, puntos de experiencia acumulados (XP), racha de días consecutivos, identificador de aula asignada, fecha de registro y última conexión.
* **questions_public (Banco de Preguntas Público)**: Colección de desafíos visible para los estudiantes durante la prueba. Cada elemento incluye el identificador de la pregunta, tipo de interacción (opción múltiple, completar espacios, lectura, audio o voz), habilidad evaluada (Grammar, Vocabulary, Reading, Listening o Speaking), enunciado en inglés, contexto de lectura o escucha, opciones de respuesta mezcladas y consejo pedagógico de Cosmo. **No contiene en ningún caso la respuesta correcta.**
* **questions_answer_key (Clave Maestra Privada)**: Almacén protegido de soluciones custodiado en el servidor. Incluye el identificador de pregunta, respuesta correcta oficial, variantes ortográficas o sinónimos aceptados, transcripción fonética objetivo para preguntas de speaking, nivel de tolerancia fonética y ponderación de puntuación.
* **attempts (Historial de Evaluaciones e Intentos)**: Registro inmutable de cada prueba completada. Cada intento incluye su identificador único, referencia al alumno, fecha y hora exacta, puntuación global porcentual (de 0 a 100), desglose de aciertos por habilidad lingüística, nivel de competencia alcanzado (A2 Star Explorer) y la retroalimentación cualitativa generada por Cosmo.

---

### 4. Cómo Protegería las Respuestas Correctas

Para garantizar la máxima integridad académica para **Global Certified English Center**, se aplica el principio de **Confianza Cero en el Cliente (Zero-Trust Security)**:

* **Ocultamiento Total en el Cliente**: La clave de respuestas jamás se incluye en el código fuente, en los paquetes de JavaScript compilados, ni en las variables de almacenamiento local o de sesión del navegador. El estudiante solo tiene acceso visual a las preguntas públicas.
* **Calificación Exclusivamente en Servidor**: El dispositivo del alumno solo transmite un mapa con sus elecciones (por ejemplo, pregunta 1: opción seleccionada). El servidor recupera la clave privada de respuestas, realiza la comparación normalizada (omitiendo mayúsculas, tildes y signos de puntuación) y asigna el puntaje de manera neutral.
* **Reglas de Seguridad Inmutables en Base de Datos**: Las políticas de acceso establecen que el catálogo privado de soluciones tiene denegada toda lectura y escritura para clientes. De igual manera, el nodo de intentos históricos tiene la escritura deshabilitada para usuarios normales, siendo únicamente editable por el backend autenticado con privilegios administrativos.
* **Mecanismos Anti-Fraude**:
  * **Sesiones con Expiración**: Cada evaluación cuenta con un token de sesión temporal con un límite de tiempo razonable para evitar pausas no supervisadas.
  * **Limitación de Frecuencia (Rate Limiting)**: Se restringe el número máximo de intentos permitidos por estudiante en un intervalo de 24 horas para evitar adivinanza por fuerza bruta.
  * **Orden Aleatorio de Preguntas**: Implementación del algoritmo Fisher-Yates para barajar las preguntas al iniciar la prueba, impidiendo que dos estudiantes contiguos resuelvan las preguntas en el mismo orden.

---

### 5. Cómo Escalaría de 100 a 50.000 o 100.000 Estudiantes

Estrategia de escalabilidad horizontal para soportar picos masivos de uso durante semanas de exámenes institucionales:

* **Distribución de Contenido Estático en el Edge**: Todo el código de la interfaz, estilos, archivos de audio y recursos gráficos se distribuyen a través de redes CDN globales con almacenamiento en caché perimetral, descargando la infraestructura central en más de un 95%.
* **Migración a Cloud Firestore con Particionamiento (Sharding)**: Para cargas de 100.000 alumnos concurrentes se emplea Cloud Firestore con particionamiento horizontal automático por centros de enseñanza, niveles y aulas escolares, garantizando lecturas y escrituras atómicas sin cuellos de botella.
* **Cómputo Serverless Autoescalable**: La lógica de evaluación y servicios backend se ejecutan sobre Google Cloud Run y Cloud Functions de segunda generación, capaces de escalar automáticamente desde cero hasta miles de contenedores simultáneos en pocos segundos.
* **Desacoplamiento con Colas Asíncronas**: El estudiante recibe su nota preliminar de forma instantánea; las operaciones con mayor consumo de cómputo (evaluación fonética avanzada, generación de certificados en formato PDF y envío de reportes a padres) se delegan a sistemas de mensajería como Google Cloud Pub/Sub y Cloud Tasks para procesamiento diferido sin bloquear la experiencia del usuario.
* **Caché en Memoria**: Implementación de Redis para almacenar en memoria las configuraciones académicas y preguntas frecuentes, evitando lecturas reiterativas a la base de datos principal.

---

### 6. Cómo Manejaría Roles de Estudiante, Profesor y Administrador

Implementación de un sistema de **Control de Acceso Basado en Roles (RBAC)** respaldado por notaciones criptográficas en el token de autenticación (Custom Claims):

* **Atribución Segura de Roles**: Los permisos no dependen de campos manipulables en el navegador, sino de atributos sellados criptográficamente en el token JWT del usuario, asignados únicamente por procesos autorizados en el servidor.
* **Privilegios por Perfil**:
  * **Estudiante**: Acceso exclusivo a rendir evaluaciones, consultar su propia bitácora de resultados, revisar sus medallas y personalizar su avatar.
  * **Profesor**: Vista de consola docente para monitorear el desempeño de sus grupos asignados, visualizar fortalezas y debilidades del aula, registrar observaciones pedagógicas y exportar sábanas de calificaciones.
  * **Administrador**: Gestión integral de la sede académica, creación y asignación de profesores, configuración del banco curricular de preguntas, parametrización de umbrales de aprobación y auditoría de seguridad.
* **Control de Navegación y Reglas de Base de Datos**: Guardianes de ruta en Angular que dirigen a cada usuario a su portal correspondiente, respaldados por reglas en la base de datos que validan el rol institucional antes de autorizar cualquier lectura o escritura.

---

### 7. Cómo Integraría IA sin Acoplar toda la Plataforma a un Único Proveedor

Para proteger a la institución del riesgo de dependencia exclusiva de un proveedor tecnológico (Vendor Lock-In), se adopta el **Patrón de Arquitectura Adaptador (Agnostic AI Gateway)**:

* **Interfaz Agnóstica Común**: Se define un contrato genérico de evaluación de voz y generación de retroalimentación pedagógica independiente de cualquier empresa comercial. Los componentes de la plataforma únicamente dialogan con esta interfaz abstracta.
* **Adaptadores Intercambiables**:
  * Conector para **Google Gemini** optimizado para respuestas rápidas y análisis multimodal.
  * Conector para **OpenAI** con modelos especializados en transcripción fonética (Whisper) y lenguaje natural.
  * Conector para **Anthropic Claude** enfocado en retroalimentación formativa y redacción pedagógica adaptada a niños.
  * Conector para **Modelos Locales de Código Abierto (Ollama / Llama 3 / Whisper Local)**, permitiendo desplegar la inferencia en servidores institucionales propios para garantizar la privacidad y soberanía total de datos de los menores.
* **Disyuntor y Tolerancia a Fallos (Circuit Breaker & Failover)**: Si el servicio de inteligencia artificial primario presenta lentitud superior a tres segundos o alcanza límites de cuota, el pasarela conmuta automáticamente al proveedor de respaldo de forma transparente para el estudiante.
* **Caché Semántica**: Registro de respuestas y explicaciones didácticas estándar para evitar consultas redundantes a los modelos de lenguaje, reduciendo drásticamente los costes operativos.

---

### 8. Qué Cambiaría si Tuviera Tres Meses para Convertir el Prototipo en Producto

Plan estratégico de desarrollo en 90 días para transformar la solución en un producto insignia de **Global Certified English Center**:

* **Mes 1: Robustez, Infraestructura Empresarial y Evaluación Fonética con IA**:
  * Migración definitiva de la persistencia a Cloud Firestore con particionamiento institucional.
  * Despliegue del motor evaluador serverless con análisis fonético real de Speaking, evaluando pronunciación, entonación y fluidez.
  * Integración de inicio de sesión único institucional (SSO) con Google Workspace for Education y Microsoft 365.
  * Activación del módulo de roles y permisos con paneles especializados para docentes.
* **Mes 2: Pedagogía Adaptativa, Gestión Curricular y Certificados**:
  * Módulo administrativo de gestión curricular (CMS) para que los coordinadores académicos diseñen, editen y publiquen reactivos clasificados por competencias del marco MCER (niveles A1 a B2).
  * Implementación de Test Adaptativo por Computadora (CAT), donde la dificultad de las preguntas evoluciona en tiempo real según el rendimiento demostrado por el alumno.
  * Emisión automática de diplomas de certificación con código QR y sello criptográfico de verificación institucional.
* **Mes 3: Publicación Móvil Nativa, Analíticas Predictivas y Lanzamiento**:
  * Empaquetado y publicación oficial como aplicación móvil nativa en Google Play Store y Apple App Store con soporte para trabajo desconectado en laboratorios escolares.
  * Panel de analíticas predictivas para docentes que detecte tempranamente vacíos de aprendizaje en habilidades específicas.
  * Notificaciones automáticas de progreso a representantes y padres de familia a través de mensajería instantánea y correo electrónico.
  * Auditoría de cumplimiento de estándares internacionales de privacidad infantil (COPPA y GDPR-K) y pruebas de estrés para certificar alta concurrencia con 100.000 estudiantes simultáneos.

---

## 🛠️ Instalación y Ejecución Local

Para ejecutar el proyecto en un entorno de desarrollo local:

1. Clonar el repositorio desde GitHub mediante la URL oficial del proyecto.
2. Instalar las dependencias del proyecto ejecutando el comando de instalación de paquetes `npm install`.
3. Iniciar el servidor de desarrollo local ejecutando `npm start` o `npx ng serve`.
4. Abrir el navegador en la dirección local por defecto `http://localhost:4200/`.

---

## 🌐 Despliegue en GitHub Pages

El proyecto cuenta con integración continua automatizada con **GitHub Actions**. Cada cambio integrado a la rama principal compila la aplicación con optimización de producción y publica la versión más reciente en:

**Sitio Oficial en Vivo**: https://katthon.github.io/MiniglobalAI/

Para compilar manualmente la versión de distribución:
* Compilación para producción con subdirectorio institucional: `npm run build:gh-pages`
* Despliegue directo a la rama de publicación: `npm run deploy:gh-pages`

---

## 📄 Derechos Reservados y Propiedad Intelectual

Todo el contenido curricular, marca, personajes y diseño formativo pertenecen a:

**Global Certified English Center**  
*Plataforma de Evaluación y Diagnóstico Espacial MiniGlobal AI*  
© 2026 Todos los derechos reservados.
