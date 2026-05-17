# NASA Space Dashboard

## Descripción del Proyecto
Aplicación de escritorio que consume la API Astronomy Picture of the Day (APOD) de la NASA para visualizar imágenes espaciales. Incluye efectos visuales y síntesis de audio generativo.

---

## Instalación y Compilación

Este proyecto fue transformado en una aplicación de escritorio nativa utilizando **Electron.js**. Para correrlo o compilarlo en tu máquina local:

1. Asegúrate de tener [Node.js](https://nodejs.org/) instalado.
2. Clona este repositorio y navega a la carpeta del proyecto.
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Para iniciar la aplicación en modo desarrollo:
   ```bash
   npm start
   ```
5. Para compilar el instalador `.exe` de Windows:
   ```bash
   npm run build
   ```
   *(El instalador final se generará dentro de la carpeta `dist/`).*

---

## Características Principales

### 1. Integración con API y Traducción
- **NASA APOD API:** Obtención diaria de fotografías y videos espaciales de alta resolución.
- **Máquina del Tiempo:** Búsqueda histórica de registros visuales desde 1995 hasta la actualidad.
- **Traducción:** Consumo de la API *MyMemory* para traducir las explicaciones del inglés al español mediante un sistema de división por oraciones.

### 2. Audio Procedural Reactivo (Web Audio API)
- **Audio Ambiental:** Sonido de fondo continuo. Su tipo de onda y frecuencias mutan leyendo los valores RGB de la imagen actual en pantalla.
- **Typewriter Effect (Sci-Fi Blip):** Síntesis de sonido de onda cuadrada (`square`) generada intermitentemente de forma sincronizada con la aparición de las letras.
- **Warp Sound:** Transición sonora aleatoria con caída de frecuencia pronunciada al cambiar de imagen.

### 3. Efectos Visuales y Canvas (HTML5 & CSS3)
- **Partículas Generativas:** Sistema de partículas de fondo y estela que sigue al cursor, renderizados vía `requestAnimationFrame` en `<canvas>`.
- **Efecto Monitor CRT:** Sombras internas (`box-shadow`) y viñetas dinámicas que simulan el cristal curvo de un monitor antiguo.
- **Interferencia VHS:** Líneas de escaneo semitransparentes en bucle vertical (`@keyframes`) combinadas con un filtro degradante (sepia y contraste alterado) para la imagen.
- **Punteros Personalizados:** Cursores en formato SVG que cambian de color al interactuar con los controles.

### 4. Sistema de Archivos y Personalización
- **Memoria Local (`localStorage`):** Guarda la API Key, el estado del sonido, el tema elegido, la imagen fijada al inicio y la biblioteca de archivos clasificados.
- **Gestor de Favoritos:** Posibilidad de guardar vistas, visualizarlas en una galería interactiva, exportarlas como un archivo `.json` a la computadora y volver a importarlas.
- **Configuración Dinámica:** Panel que permite alterar la estética (modo Cyan vs Ámbar), la fuente (Pixel Art vs Monospace), desactivar efectos, y cambiar el comportamiento de la máquina de escribir.
- **Descarga de Imágenes:** Opción para descargar la imagen en alta resolución mediante Blob o abriéndola en una nueva pestaña.

---

## Estructura del Proyecto

El proyecto se compone de tecnologías web estándar sin frameworks de terceros:

### `1.html` (La Estructura)
Define las capas de la aplicación:
1. Los `<canvas>` superpuestos.
2. El `#space-background` para fotos.
3. El panel principal `.dashboard-panel` con controles.
4. Tres modales ocultos: Inicio de Sesión, Galería de Favoritos y Configuración.

### `style.css` (Estilos)
Maneja toda la estética interactiva:
- Uso de Variables CSS (`:root`) para permitir la mutación de colores en vivo (Modo Ámbar).
- Estilos *glassmorphism* (cristal esmerilado con `backdrop-filter: blur`).
- Clases conmutables para encender/apagar características retro (`.crt-enabled`, `.vhs-enabled`, `.pixel-font`).

### `app.js` (Lógica Principal)
Controla la funcionalidad de la aplicación:
- **Arranque:** Verificación de variables almacenadas y auto-recuperación de caché dañada.
- **Manejo de Errores Estricto:** Interceptores para límites de cuota (HTTP 429) y llaves inválidas (HTTP 403).
- **Web Audio Engine:** Control maestro de ganancias, LFOs (osciladores de baja frecuencia para simular "respiración") y limpiadores de nodos de audio obsoletos (`stopSpaceAmbient`).
- **Físicas 2D:** Clases orientadas a objetos (`class Particle`) con vectores de velocidad (`vx, vy`), desvanecimiento de ciclo de vida (`life`) y rebote en los márgenes de la pantalla.

---

## Controles de Usuario
- **Botón Ocultar Panel:** Revela la imagen a pantalla completa.
- **Tecla `M`:** Silencia o reactiva globalmente los generadores de audio.
- **Tecla `Escape`:** Cierra rápidamente cualquier ventana modal de configuración, favoritos, o la interfaz principal.

### Comandos Adicionales
El sistema reacciona a códigos tecleados en cualquier momento:
- **`matrix`**: Cambia el tema de color a verde.
- **`spin`**: Realiza una rotación de la interfaz.
- **`meteor`**: Inicia una animación de meteoros en el canvas.

### Búsqueda por Palabras Clave
Mediante el botón de "Archivos Secretos", se pueden usar palabras clave predefinidas:
- Palabras conocidas: `ovni`, `agujero`, `marte`, `tierra`, `gato`, `pilar`, `jupiter`, `luna`, `saturno`, `hubble`, `webb`, `eclipse`.

---

## Roadmap (Completado)
- [x] **Empaquetado de Escritorio:** Migración del entorno web a un ejecutable nativo multiplataforma (`.exe`, `.dmg`) utilizando **Electron.js**.
- [x] **Modo Widget y System Tray:** Configuración de la ventana principal como *Frameless* (sin bordes), adaptable a tamaños mini, y soporte para ejecutarse de fondo en la bandeja del sistema.