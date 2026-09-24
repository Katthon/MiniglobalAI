# MiniGlobalAI · A2 Space English Assessment

Prototipo de evaluación de inglés interactivo para niños con temática espacial, desarrollado con **Ionic 8 + Angular 17/18 (Standalone Components)** y **Web Speech API**. Acompañado por el tutor marciano **Cosmo**.

## 🚀 Características
- **Público Infantil**: Botones grandes, contrastes accesibles y animaciones lúdicas espaciales.
- **10 Preguntas A2**: Balanceadas entre Grammar, Vocabulary, Reading, Listening y Speaking.
- **Web Speech API**:
  - *Reconocimiento de voz*: Permite evaluar la pronunciación y capturar respuestas de Speaking en inglés.
  - *Síntesis de voz (Text-to-Speech)*:
    - **Listening**: Reproduce transmisiones de audio espacial en inglés con tono claro para niños.
    - **Cosmo**: Lee tips educativos y feedback estelar en español.
- **Persistencia Flexible**:
  - *Modo Local Autónomo*: Guarda intentos en `localStorage` sin requerir conexión a la nube ni arrojar errores de red.
  - *Modo Firebase Cloud*: Conexión opcional a Firebase RTDB / Cloud Functions para enviar intentos a Google Firebase Console.
- **Mascota Cosmo**: Componente visual interactivo y tutor marciano.
- **Exportable a GitHub Pages**: Enrutamiento sin errores 404 (`withHashLocation`).

## 🛠️ Instalación y Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm start
# o
npx ng serve
```

Navega a `http://localhost:4200/`.

## 🌐 Compilación y Despliegue en GitHub Pages

```bash
# Compilar para producción con el subdirectorio de GitHub Pages
npm run build:gh-pages

# Desplegar usando angular-cli-ghpages
npm run deploy:gh-pages
```

## 🔥 Configuración de Firebase (Opcional)

Por defecto, la aplicación opera en **Modo Local Autónomo**: evalúa los intentos y los almacena de forma persistente en `localStorage` sin arrojar errores en la consola de Google.

Para enviar y sincronizar los datos en vivo con tu consola de **Google Firebase**:
1. Entra a [Firebase Console](https://console.firebase.google.com/) y crea o selecciona tu proyecto.
2. En **Authentication > Método de inicio de sesión**, habilita el proveedor **Anónimo**.
3. En **Realtime Database**, crea la base de datos (puedes importar el archivo `firebase-rtdb-seed.json`).
4. Reemplaza las claves en `src/environments/environment.ts` y `src/environments/environment.prod.ts` con las credenciales de tu proyecto Web.

