// Referencias al DOM
const bgElement = document.getElementById('space-background');
const titleElement = document.getElementById('apod-title');
const explanationElement = document.getElementById('apod-explanation');
const modal = document.getElementById('api-key-modal');
const inputKey = document.getElementById('api-key-input');
const userNameInput = document.getElementById('user-name-input');
const saveBtn = document.getElementById('save-key-btn');
const resetBtn = document.getElementById('reset-key-btn');
const muteBtn = document.getElementById('mute-btn');
const toggleUiBtn = document.getElementById('toggle-ui-btn');
const dashboardPanel = document.querySelector('main.dashboard-panel');
const canvas = document.getElementById('stardust-canvas');
const datePicker = document.getElementById('apod-date-picker');
const downloadBtn = document.getElementById('download-btn');
const pinBtn = document.getElementById('pin-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');

// Elementos del Sistema de Favoritos
const saveFavBtn = document.getElementById('save-fav-btn');
const viewFavBtn = document.getElementById('view-fav-btn');
const favModal = document.getElementById('favorites-modal');
const closeFavBtn = document.getElementById('close-fav-btn');
const favGallery = document.getElementById('favorites-gallery');
const particleCanvas = document.getElementById('particle-canvas');
const exportFavBtn = document.getElementById('export-fav-btn');
const importFavBtn = document.getElementById('import-fav-btn');
const importFavInput = document.getElementById('import-fav-input');
const favSearchInput = document.getElementById('fav-search-input');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const factoryResetBtn = document.getElementById('factory-reset-btn');
const toggleParticlesChk = document.getElementById('toggle-particles-chk');
const toggleAudioChk = document.getElementById('toggle-audio-chk');
const toggleVhsChk = document.getElementById('toggle-vhs-chk');
const toggleCrtChk = document.getElementById('toggle-crt-chk');
const toggleThemeChk = document.getElementById('toggle-theme-chk');
const toggleFontChk = document.getElementById('toggle-font-chk');
const toggleSpeedChk = document.getElementById('toggle-speed-chk');
const toggleContainChk = document.getElementById('toggle-contain-chk');
const toggleWidgetChk = document.getElementById('toggle-widget-chk');
const secretBtn = document.getElementById('secret-btn');
const secretModal = document.getElementById('secret-modal');
const closeSecretBtn = document.getElementById('close-secret-btn');
const secretInput = document.getElementById('secret-input');
const secretSubmit = document.getElementById('secret-submit');
const secretMsg = document.getElementById('secret-msg');

// Variables de Web Audio API
let audioCtx;
let masterGain;
let oscAmbient, oscAudible, filterAmbient;
let ambientNodes = []; // Para rastrear y detener los osciladores
// Restaurar preferencia de mute desde localStorage (por defecto true para prevenir bloqueos)
let isMuted = localStorage.getItem('nasa_audio_muted') === 'false' ? false : true;

// Variable para almacenar los datos actuales de la imagen en pantalla
let currentApodData = null;
let currentDominantColor = { r: 100, g: 100, b: 150 };
let typewriterTimeoutId = null; // Para limpiar el efecto de texto anterior
let isUiHidden = false;         // Para saber si silenciar el tipeo
let meteors = [];               // Arreglo global para meteoritos
let hasGreeted = false;         // Para asegurar que la IA salude solo una vez

let ipcRenderer = null; // Puente de comunicación con Electron
if (typeof require !== 'undefined') {
    ipcRenderer = require('electron').ipcRenderer;
}

// 1. Lógica de Arranque
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar preferencia de partículas guardada
    const particlesEnabled = localStorage.getItem('nasa_particles_enabled') !== 'false';
    toggleParticlesChk.checked = particlesEnabled;
    canvas.style.display = particlesEnabled ? 'block' : 'none';
    particleCanvas.style.display = particlesEnabled ? 'block' : 'none';

    // Aplicar preferencias del resto de efectos
    const themeAmberEnabled = localStorage.getItem('nasa_theme_amber') === 'true';
    const audioEnabled = localStorage.getItem('nasa_audio_ambient') !== 'false';
    const vhsEnabled = localStorage.getItem('nasa_vhs_enabled') !== 'false';
    const crtEnabled = localStorage.getItem('nasa_crt_enabled') !== 'false';
    const fontPixelEnabled = localStorage.getItem('nasa_pixel_font') === 'true';
    const containImageEnabled = localStorage.getItem('nasa_image_contain') === 'true';
    const humanSpeedEnabled = localStorage.getItem('nasa_human_typing') !== 'false'; // true por defecto
    const widgetModeEnabled = localStorage.getItem('nasa_widget_mode') !== 'false';

    toggleThemeChk.checked = themeAmberEnabled;
    toggleAudioChk.checked = audioEnabled;
    toggleVhsChk.checked = vhsEnabled;
    toggleCrtChk.checked = crtEnabled;
    toggleFontChk.checked = fontPixelEnabled;
    toggleSpeedChk.checked = humanSpeedEnabled;
    toggleContainChk.checked = containImageEnabled;
    toggleWidgetChk.checked = widgetModeEnabled;

    if (!ipcRenderer) {
        toggleWidgetChk.parentElement.style.display = 'none'; // Ocultar opción si estamos en un navegador web y no en Electron
    }
    
    if (crtEnabled) document.body.classList.add('crt-enabled');
    if (themeAmberEnabled) document.body.classList.add('amber-theme');
    if (fontPixelEnabled) document.body.classList.add('pixel-font');
    if (containImageEnabled) document.body.classList.add('contain-image');

    // Configurar fechas límites de la Máquina del Tiempo
    const today = new Date().toISOString().split('T')[0];
    datePicker.max = today;
    datePicker.min = "1995-06-16"; // Inicio del APOD

    initStardust(); // Iniciar animación de polvo estelar
    initMouseTrail(); // Iniciar estela del mouse

    // Actualizar botón según preferencia guardada
    muteBtn.textContent = isMuted ? 'Audio: Off' : 'Audio: On';
    
    if (!isMuted) {
        initAudio();
        masterGain.gain.value = 0.5;
        // Intentar reanudar el contexto de audio tras la primera interacción del usuario
        // (necesario para burlar gentilmente las políticas de autoplay del navegador)
        document.body.addEventListener('click', () => {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
                greetUser(); // Saludar en la primera interacción (Click en pantalla)
        }, { once: true });
    }

    const savedKey = localStorage.getItem('nasa_api_key');
    const pinnedDate = localStorage.getItem('nasa_pinned_date');
    if (savedKey) {
        // 3. Ejecución Normal (SÍ hay llave)
        modal.classList.add('hidden');
        // Proteger el código contra fechas corruptas en el caché
        const safeDate = (pinnedDate && pinnedDate !== 'undefined' && pinnedDate !== 'null') ? pinnedDate : null;
        initSpaceWidget(savedKey, safeDate); // Cargar fecha fijada si existe
    } else {
        // 2. Interfaz de Registro (NO hay llave)
        modal.classList.remove('hidden');
    }
});

// Evento para Guardar API Key y lanzar
saveBtn.addEventListener('click', () => {
    const key = inputKey.value.trim();
    const name = userNameInput.value.trim() || 'Comandante';
    if (key) {
        localStorage.setItem('nasa_api_key', key);
        localStorage.setItem('nasa_user_name', name);
        modal.classList.add('hidden');
        
        // Auto-iniciar audio tras la interacción del usuario
        if (!audioCtx) initAudio();
        isMuted = false;
        localStorage.setItem('nasa_audio_muted', 'false'); // Guardar preferencia
        masterGain.gain.setTargetAtTime(0.5, audioCtx.currentTime, 0.1);
        muteBtn.textContent = 'Audio: On';

        greetUser(); // Saludar inmediatamente al iniciar sesión
        initSpaceWidget(key);
    }
});

// Control de Volumen Máster
muteBtn.addEventListener('click', () => {
    if (!audioCtx) initAudio();
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    isMuted = !isMuted;
    localStorage.setItem('nasa_audio_muted', isMuted); // Guardar preferencia
    masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.5, audioCtx.currentTime, 0.1);
    muteBtn.textContent = isMuted ? 'Audio: Off' : 'Audio: On';
});

// Alternar Visibilidad del Panel
toggleUiBtn.addEventListener('click', () => {
    dashboardPanel.classList.toggle('hidden-ui');
    isUiHidden = dashboardPanel.classList.contains('hidden-ui');
    
    if (isUiHidden) {
        toggleUiBtn.textContent = 'Mostrar Panel';
    } else {
        toggleUiBtn.textContent = 'Ocultar Panel';
    }
});

// --- Menú de Configuración ---
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

factoryResetBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos, configuraciones y favoritos? La aplicación quedará como recién instalada.')) {
        localStorage.clear();
        location.reload();
    }
});

toggleParticlesChk.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    localStorage.setItem('nasa_particles_enabled', isEnabled);
    canvas.style.display = isEnabled ? 'block' : 'none';
    particleCanvas.style.display = isEnabled ? 'block' : 'none';
});

toggleAudioChk.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    localStorage.setItem('nasa_audio_ambient', isEnabled);
    if (isEnabled && audioCtx && !isMuted) {
        startSpaceAmbient();
    } else {
        stopSpaceAmbient();
    }
});

toggleVhsChk.addEventListener('change', (e) => {
    localStorage.setItem('nasa_vhs_enabled', e.target.checked);
});

toggleCrtChk.addEventListener('change', (e) => {
    localStorage.setItem('nasa_crt_enabled', e.target.checked);
    if (e.target.checked) document.body.classList.add('crt-enabled');
    else document.body.classList.remove('crt-enabled');
});

toggleThemeChk.addEventListener('change', (e) => {
    localStorage.setItem('nasa_theme_amber', e.target.checked);
    if (e.target.checked) document.body.classList.add('amber-theme');
    else document.body.classList.remove('amber-theme');
});

toggleFontChk.addEventListener('change', (e) => {
    localStorage.setItem('nasa_pixel_font', e.target.checked);
    if (e.target.checked) document.body.classList.add('pixel-font');
    else document.body.classList.remove('pixel-font');
});

toggleSpeedChk.addEventListener('change', (e) => {
    localStorage.setItem('nasa_human_typing', e.target.checked);
});

toggleContainChk.addEventListener('change', (e) => {
    localStorage.setItem('nasa_image_contain', e.target.checked);
    if (e.target.checked) document.body.classList.add('contain-image');
    else document.body.classList.remove('contain-image');
});

toggleWidgetChk.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    localStorage.setItem('nasa_widget_mode', isEnabled);
    if (ipcRenderer) {
        ipcRenderer.send('set-widget-mode', isEnabled); // Ordenar al sistema que reinicie la ventana
    }
});

// --- Atajos de Teclado y Easter Eggs (Comandos Secretos) ---
let secretBuffer = '';

document.addEventListener('keydown', (e) => {
    // Ignorar si el usuario está escribiendo en el buscador de la API Key o en otro input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Registro de pulsaciones para Easter Eggs
    if (e.key.length === 1) {
        secretBuffer += e.key.toLowerCase();
        if (secretBuffer.length > 20) secretBuffer = secretBuffer.slice(-20); // Limitar memoria a 20 letras
        
        if (secretBuffer.endsWith('matrix')) {
            document.body.classList.toggle('matrix-theme');
            secretBuffer = ''; // Limpiar tras activarlo
        } else if (secretBuffer.endsWith('spin')) {
            document.body.classList.remove('spin-anim');
            void document.body.offsetWidth; // Forzar reinicio de animación
            document.body.classList.add('spin-anim');
            secretBuffer = '';
        } else if (secretBuffer.endsWith('meteor')) {
            triggerMeteorShower();
            secretBuffer = '';
        }
    }

    // Atajos de utilidad general
    if (e.key.toLowerCase() === 'm') muteBtn.click();
    else if (e.key === 'Escape') {
        if (!settingsModal.classList.contains('hidden')) closeSettingsBtn.click();
        else if (!favModal.classList.contains('hidden')) closeFavBtn.click();
        else if (modal.classList.contains('hidden')) toggleUiBtn.click();
        else if (!secretModal.classList.contains('hidden')) closeSecretBtn.click();
    }
});

// --- Terminal Clasificada (Juego de Secretos) ---
const secretDictionary = {
    'ovni': '2004-08-01',     // Nube lenticular que parece platillo volador
    'agujero': '2019-04-11',  // Primera imagen de un agujero negro
    'marte': '2021-02-24',    // Descenso del rover Perseverance
    'tierra': '2014-12-23',   // La Tierra de noche
    'gato': '2015-05-13',     // Nebulosa Ojo de Gato
    'pilar': '2015-01-07',    // Pilares de la Creación
    'jupiter': '2020-08-28',  // Júpiter de alta resolución
    'luna': '2019-07-20',     // Apolo 11
    'saturno': '2019-07-26',  // Saturno
    'hubble': '2020-04-24',   // 30 años del Hubble
    'webb': '2022-07-12',     // Primera imagen del James Webb
    'eclipse': '2024-04-08'   // Eclipse solar total
};

const funnyErrors = [
    "Intento registrado. La policía espacial va en camino...",
    "Error 404: Conocimiento cósmico no encontrado.",
    "Buen intento, terrícola. Pero no.",
    "Esa palabra no está en los registros clasificados. Sigue intentando."
];

// --- Utilidades de Voz y Video ---
function greetUser() {
    if (hasGreeted || isMuted) return;
    const name = localStorage.getItem('nasa_user_name') || 'Comandante';
    const hour = new Date().getHours();
    let greeting = 'Buen día';
    if (hour >= 12 && hour < 19) greeting = 'Buenas tardes';
    else if (hour >= 19 || hour < 5) greeting = 'Buenas noches';
    
    speakVoice(`Sistemas en línea. ${greeting}, ${name}.`);
    hasGreeted = true;
}

function speakVoice(text) {
    if (!('speechSynthesis' in window)) {
        console.warn('API de voz no soportada en este navegador');
        return;
    }
    
    // Respetar si el usuario tiene la aplicación silenciada (Botón de la esquina)
    if (isMuted) return;

    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'es-ES'; // Acento en español
    msg.pitch = 0.8;    // Tono un poco más natural
    msg.rate = 1.0;     // Velocidad normal
    
    // Workaround para un bug de Chrome donde la voz se detiene
    window.speechUtteranceChunk = msg; 

    window.speechSynthesis.speak(msg);
}

secretBtn.addEventListener('click', () => {
    secretModal.classList.remove('hidden');
    secretMsg.textContent = '';
    secretInput.value = '';
});

closeSecretBtn.addEventListener('click', () => secretModal.classList.add('hidden'));

secretInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') secretSubmit.click(); });

secretSubmit.addEventListener('click', () => {
    const word = secretInput.value.trim().toLowerCase();
    
    if (word === 'clear' || word === 'reset') {
        secretMsg.style.color = 'var(--theme-color)';
        secretMsg.textContent = 'Borrando memoria del sistema...';
        speakVoice('Borrando memoria del sistema. Reiniciando.');
        setTimeout(() => {
            localStorage.clear();
            location.reload();
        }, 2000);
    } else if (secretDictionary[word]) {
        secretMsg.style.color = 'var(--theme-color)';
        secretMsg.textContent = 'Acceso concedido. Decodificando coordenadas...';
        speakVoice('Acceso concedido. Decodificando coordenadas.');
        setTimeout(() => {
            secretModal.classList.add('hidden');
            const savedKey = localStorage.getItem('nasa_api_key');
            if (savedKey) initSpaceWidget(savedKey, secretDictionary[word]);
        }, 1500);
    } else {
        secretMsg.style.color = '#ff5555';
        secretMsg.textContent = funnyErrors[Math.floor(Math.random() * funnyErrors.length)];
        speakVoice('Acceso denegado. Intento registrado.');
    }
});

// Mecánica de Fijar Imagen
pinBtn.addEventListener('click', () => {
    if (!currentApodData) return;
    const pinnedDate = localStorage.getItem('nasa_pinned_date');
    
    if (pinnedDate === currentApodData.date) {
        localStorage.removeItem('nasa_pinned_date');
    } else {
        localStorage.setItem('nasa_pinned_date', currentApodData.date);
    }
    updatePinButtonState();
});

// Máquina del Tiempo (Buscar por fecha)
datePicker.addEventListener('change', (e) => {
    const savedKey = localStorage.getItem('nasa_api_key');
    if (savedKey && e.target.value) {
        initSpaceWidget(savedKey, e.target.value);
    }
});

// Descargar Wallpaper
downloadBtn.addEventListener('click', async () => {
    if (!currentApodData || !currentApodData.url) return;
    
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'Descargando...';
    
    try {
        // Usamos fetch para obtener el blob y saltarnos políticas de CORS/nueva pestaña
        const response = await fetch(currentApodData.url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `NASA_APOD_${currentApodData.date}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        downloadBtn.textContent = 'Completado';
    } catch (error) {
        // FALLBACK INFALIBLE: Si falla por CORS, abrir la imagen en nueva pestaña para guardar
        window.open(currentApodData.url, '_blank');
        downloadBtn.textContent = 'Abierto en pestaña';
    }
    
    setTimeout(() => { downloadBtn.textContent = originalText; }, 3000);
});

// --- Copiar Enlace ---
copyLinkBtn.addEventListener('click', () => {
    if (!currentApodData) return;
    navigator.clipboard.writeText(currentApodData.url).then(() => {
        const originalText = copyLinkBtn.textContent;
        copyLinkBtn.textContent = 'Copiado';
        setTimeout(() => { copyLinkBtn.textContent = originalText; }, 2000);
    });
});

// --- Sistema de Favoritos ---

// Guardar en Favoritos
saveFavBtn.addEventListener('click', () => {
    if (!currentApodData) return;
    
    const favs = JSON.parse(localStorage.getItem('nasa_favorites') || '[]');
    const alreadyExists = favs.some(f => f.date === currentApodData.date);
    
    if (!alreadyExists) {
        favs.push(currentApodData);
        localStorage.setItem('nasa_favorites', JSON.stringify(favs));
        saveFavBtn.textContent = 'Guardado';
    } else {
        saveFavBtn.textContent = 'Ya está en Favoritos';
    }
    
    setTimeout(() => {
        saveFavBtn.textContent = 'Guardar en Favoritos';
    }, 2000);
});

function updateFavoriteButtonState() {
    if (!currentApodData) return;
    const favs = JSON.parse(localStorage.getItem('nasa_favorites') || '[]');
    const exists = favs.some(f => f.date === currentApodData.date);
    saveFavBtn.textContent = exists ? 'Guardado' : 'Guardar en Favoritos';
}

function updatePinButtonState() {
    if (!currentApodData) return;
    const pinnedDate = localStorage.getItem('nasa_pinned_date');
    pinBtn.textContent = (pinnedDate === currentApodData.date) ? 'Desfijar' : 'Fijar como Inicio';
}

// Exportar e Importar JSON de Favoritos
exportFavBtn.addEventListener('click', () => {
    const favs = localStorage.getItem('nasa_favorites') || '[]';
    const blob = new Blob([favs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archivos_espaciales.json';
    a.click();
    URL.revokeObjectURL(url);
});

importFavBtn.addEventListener('click', () => {
    importFavInput.click();
});

importFavInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedFavs = JSON.parse(event.target.result);
            if (Array.isArray(importedFavs)) {
                localStorage.setItem('nasa_favorites', JSON.stringify(importedFavs));
                renderFavorites();
                updateFavoriteButtonState();
            alert('Base de datos importada con éxito.');
            }
        } catch (err) {
        alert('Archivo corrupto o inválido.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Limpiar input para permitir importar el mismo archivo
});

// Mostrar Modal de Favoritos
viewFavBtn.addEventListener('click', () => {
    favModal.classList.remove('hidden');
    favSearchInput.value = ''; // Limpiar búsqueda al abrir
    renderFavorites();
});

// Cerrar Modal de Favoritos
closeFavBtn.addEventListener('click', () => {
    favModal.classList.add('hidden');
});

favSearchInput.addEventListener('input', (e) => {
    renderFavorites(e.target.value);
});

// Renderizar Galería
function renderFavorites(searchTerm = '') {
    const favs = JSON.parse(localStorage.getItem('nasa_favorites') || '[]');
    favGallery.innerHTML = '';
    
    const filteredFavs = favs.filter(fav => fav.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filteredFavs.length === 0) {
        favGallery.innerHTML = '<p>No se encontraron archivos.</p>';
        return;
    }
    
    filteredFavs.forEach(fav => {
        const card = document.createElement('div');
        card.className = 'fav-card';
        card.innerHTML = `
            <img src="${fav.url}" alt="Thumbnail">
            <div class="fav-info">
                <h3>${fav.title}</h3>
                <p style="font-size: 0.75rem; color: #00ffcc; opacity: 0.7;">${fav.date}</p>
            </div>
            <button class="delete-fav-btn" data-date="${fav.date}">Eliminar</button>
        `;
        
        // Evento para cargar el favorito al hacer clic en la tarjeta
        card.addEventListener('click', (e) => {
            // Evitar cargar si se hizo clic en el botón de eliminar
            if (!e.target.classList.contains('delete-fav-btn')) {
                loadFavorite(fav);
            }
        });

        favGallery.appendChild(card);
    });
    
    // Asignar eventos de eliminación
    document.querySelectorAll('.delete-fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dateToDelete = e.target.getAttribute('data-date');
            let currentFavs = JSON.parse(localStorage.getItem('nasa_favorites') || '[]');
            currentFavs = currentFavs.filter(f => f.date !== dateToDelete);
            localStorage.setItem('nasa_favorites', JSON.stringify(currentFavs));
            renderFavorites(); // Volver a renderizar
        });
    });
}

// Cargar un archivo favorito en el panel principal
async function loadFavorite(fav) {
    // Ocultar el modal de favoritos
    favModal.classList.add('hidden');
    
    speakVoice('Viajando.');

    // 1. Mostrar estado de carga
    titleElement.textContent = "Accediendo a archivo clasificado...";
    explanationElement.textContent = "Recuperando datos de la memoria local...";

    // 2. Actualizar variable global para evitar bugs si intentan guardar de nuevo
    currentApodData = fav;

    bgElement.classList.remove('hidden');

    // 3. Pre-cargar imagen
    const imageLoadPromise = new Promise((resolve) => {
        const img = new Image();
        img.src = fav.url;
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });

    await imageLoadPromise;

    bgElement.style.backgroundImage = `url('${fav.url}')`;
    playWarpSound();

    // Inyectar título y texto guardado
    titleElement.textContent = fav.title;
    typeWriterEffect(fav.explanation, explanationElement);
}

// Inicializar Audio Procedural
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0; // Inicia silenciado por defecto
    masterGain.connect(audioCtx.destination);
    startSpaceAmbient();
}

function stopSpaceAmbient() {
    ambientNodes.forEach(node => {
        try { node.stop(); } catch(e){}
        try { node.disconnect(); } catch(e){}
    });
    ambientNodes = [];
    if (filterAmbient) {
        try { filterAmbient.disconnect(); } catch(e){}
        filterAmbient = null;
    }
}

// Audio Ambiental Generativo (Drone Espacial)
function startSpaceAmbient() {
    const audioEnabled = localStorage.getItem('nasa_audio_ambient') !== 'false';
    if (!audioEnabled || !audioCtx) return;
    
    stopSpaceAmbient(); // Detener el audio de la imagen anterior

    oscAmbient = audioCtx.createOscillator();
    oscAmbient.type = 'triangle';
    oscAmbient.frequency.setValueAtTime(45, audioCtx.currentTime); // Frecuencia baja resonante
    
    // Oscilador audible en altavoces pequeños (Sci-Fi Hum)
    oscAudible = audioCtx.createOscillator();
    oscAudible.type = 'sine';
    oscAudible.frequency.setValueAtTime(120, audioCtx.currentTime);

    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.15, audioCtx.currentTime); // Modulación lenta
    
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(10, audioCtx.currentTime);

    // LFO para el volumen (Efecto "Respiración")
    const lfoVolume = audioCtx.createOscillator();
    lfoVolume.type = 'sine';
    lfoVolume.frequency.setValueAtTime(0.1, audioCtx.currentTime); // 0.1Hz = Ciclo de 10 segundos
    
    const lfoVolumeGain = audioCtx.createGain();
    lfoVolumeGain.gain.setValueAtTime(0.15, audioCtx.currentTime); // Profundidad de la pulsación
    
    lfoVolume.connect(lfoVolumeGain);
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscAmbient.frequency);
    lfoGain.connect(oscAudible.frequency);
    
    filterAmbient = audioCtx.createBiquadFilter();
    filterAmbient.type = 'lowpass';
    filterAmbient.frequency.setValueAtTime(150, audioCtx.currentTime);
    
    const droneGain = audioCtx.createGain();
    droneGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    lfoVolumeGain.connect(droneGain.gain); // Modular el volumen principal
    
    oscAmbient.connect(filterAmbient);
    oscAudible.connect(filterAmbient);
    filterAmbient.connect(droneGain);
    droneGain.connect(masterGain);
    
    oscAmbient.start();
    oscAudible.start();
    lfo.start();
    lfoVolume.start();
    
    ambientNodes.push(oscAmbient, oscAudible, lfo, lfoVolume);
    if (currentDominantColor) updateSpaceAmbient(currentDominantColor);
}

// Audio Estilo Máquina de Escribir (Sci-Fi Blip)
function playBlip() {
    if (!audioCtx || isMuted || isUiHidden) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(600 + Math.random() * 300, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
    
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
}

// Efecto de Transición Warp
function playWarpSound() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Hacer el sonido de transición completamente dinámico y aleatorio
    const isAmber = document.body.classList.contains('amber-theme');
    const startFreq = 600 + Math.random() * 400; // Entre 600Hz y 1000Hz
    const endFreq = 40 + Math.random() * 60;     // Entre 40Hz y 100Hz

    osc.type = isAmber ? 'square' : (Math.random() > 0.5 ? 'sine' : 'triangle');
    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.5); // Descenso brusco
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// Animación Estela del Mouse (Canvas 2)
function initMouseTrail() {
    const pCtx = particleCanvas.getContext('2d');
    let trailParticles = [];
    
    function resize() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2;
            this.life = 1.0;
            this.color = Math.random() > 0.5 ? '#ffffff' : (document.body.classList.contains('amber-theme') ? '#ff9900' : '#00ffcc');
            this.size = Math.random() * 3 + 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= 0.02; // Desvanecimiento progresivo
        }
        draw(ctx) {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    document.addEventListener('mousemove', (e) => {
        for (let i = 0; i < 3; i++) {
            trailParticles.push(new Particle(e.clientX, e.clientY));
        }
    });

    function draw() {
        pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        for (let i = trailParticles.length - 1; i >= 0; i--) {
            let p = trailParticles[i];
            p.update();
            if (p.life <= 0) {
                trailParticles.splice(i, 1);
            } else {
                p.draw(pCtx);
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
}

function triggerMeteorShower() {
    for (let i = 0; i < 40; i++) {
        meteors.push({
            x: Math.random() * window.innerWidth * 1.5,
            y: -100 - Math.random() * 800, // Comienzan arriba, fuera de pantalla
            length: 40 + Math.random() * 80,
            speed: 15 + Math.random() * 20,
            thickness: 1 + Math.random() * 2,
            color: Math.random() > 0.5 ? '#ffffff' : (document.body.classList.contains('amber-theme') ? '#ff9900' : '#00ffcc')
        });
    }
}

// Animación Polvo Estelar (Canvas)
function initStardust() {
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Generar partículas
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.5, // Velocidad X
            vy: (Math.random() - 0.5) * 0.5, // Velocidad Y
            alpha: Math.random()
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            // Rebote contínuo (Wrap-around)
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            const rgbStr = document.body.classList.contains('amber-theme') ? '255, 153, 0' : '0, 255, 204';
            ctx.fillStyle = `rgba(${rgbStr}, ${p.alpha * 0.8})`;
            ctx.fill();
        });

        // Dibujar lluvia de meteoritos
        for (let i = meteors.length - 1; i >= 0; i--) {
            let m = meteors[i];
            m.x -= m.speed * 0.5; // Ángulo hacia la izquierda
            m.y += m.speed;       // Cae hacia abajo
            
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x + m.length * 0.5, m.y - m.length);
            ctx.strokeStyle = m.color;
            ctx.lineWidth = m.thickness;
            ctx.stroke();
            
            // Eliminar de memoria cuando salen de pantalla
            if (m.y > canvas.height + 200 || m.x < -200) {
                meteors.splice(i, 1);
            }
        }

        requestAnimationFrame(draw);
    }
    draw();
}

// 4. Botón de Reinicio
resetBtn.addEventListener('click', () => {
    localStorage.removeItem('nasa_api_key');
    location.reload();
});

async function initSpaceWidget(apiKey, date = null) {
    let API_URL = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
    if (date) {
        API_URL += `&date=${date}`;
    }
    try {
        // Petición fetch a la NASA
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            if (response.status === 403) {
                localStorage.removeItem('nasa_api_key');
                modal.classList.remove('hidden'); // Vuelve a pedir la llave
                throw new Error("HTTP 403: Llave de API inválida o caducada.");
            } else if (response.status === 429) {
                throw new Error("HTTP 429: Límite de peticiones a la NASA excedido. Intenta en una hora.");
            } else if (response.status === 400) {
                localStorage.removeItem('nasa_pinned_date'); // Limpiar caché corrupta
                throw new Error("HTTP 400: La fecha solicitada es inválida.");
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();

        // 1. Imprimir los datos en consola para confirmar
        console.log("=== Datos de Transmisión (NASA APOD) ===");
        console.log(data);

        // 2. Montar la información en el DOM
        await mountDashboard(data);

    } catch (error) {
        console.error("Error de comunicación con la API de la NASA:", error);
        titleElement.textContent = "Error de enlace satelital";
        explanationElement.textContent = `Falla detectada: ${error.message} - Verifica tu conexión, o intenta más tarde si superaste el límite de la NASA.`;
    }
}

async function translateText(text) {
    if (!text) return { text, hasError: false };

    const sentences = text.split('. ');
    const chunks = [];
    let currentChunk = '';

    for (let i = 0; i < sentences.length; i++) {
        let sentence = sentences[i];
        if (i < sentences.length - 1) {
            sentence += '. ';
        }
        
        if ((currentChunk + sentence).length > 450) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk);

    let hasError = false;
    let translatedFullText = '';

    for (const chunk of chunks) {
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|es&de=tu_correo@example.com`;
            const res = await fetch(url);
            const data = await res.json();
            let tText = data.responseData?.translatedText || '';
            
            // MyMemory suele esconder el error de cuota inyectando un warning dentro del texto traducido
            if (data.responseStatus == 429 || tText.includes("MYMEMORY WARNING")) { 
                hasError = true;
                translatedFullText += chunk + ' ';
            } else if (tText) {
                translatedFullText += tText + ' ';
            } else {
                hasError = true;
                translatedFullText += chunk + ' ';
            }
        } catch (e) {
            hasError = true;
            console.error("Error en traducción:", e);
            translatedFullText += chunk + ' ';
        }
    }

    return { text: translatedFullText.trim(), hasError };
}

async function mountDashboard(data) {
    // A veces la NASA devuelve videos en vez de imágenes. 
    // Usamos hdurl si existe, de lo contrario url. Si es un video, esto se puede expandir luego.
    const imageUrl = data.hdurl || data.url;
    const isVideo = data.media_type === 'video';
    
    // 1. Mostrar estado de carga inicial en la interfaz
    titleElement.textContent = "Recibiendo señal...";
    explanationElement.textContent = "Estableciendo conexión visual y decodificando transmisión...";

    // 3. Iniciar la traducción en paralelo para ahorrar tiempo
    const translationPromise = translateText(data.explanation);

    bgElement.classList.remove('hidden');

    // 2. Pre-cargar la imagen en memoria para evitar que aparezca a trozos
    const imageLoadPromise = new Promise((resolve) => {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });

    await imageLoadPromise;

    bgElement.style.opacity = '0';
    await new Promise(r => setTimeout(r, 500));

    bgElement.classList.remove('glitch-anim');
    void bgElement.offsetWidth;

    bgElement.style.backgroundImage = `url('${imageUrl}')`;
    playWarpSound();
    bgElement.style.opacity = '0.7';
        
    // Inyectar título definitivo
    titleElement.textContent = data.title;
    
    // Esperar a la traducción (por si la imagen cargó más rápido) e iniciar efecto
    const translationResult = await translationPromise;
    const translatedText = translationResult.text;
    
    // Actualizar variable global con datos actuales (para favoritos)
    currentApodData = {
        date: data.date,
        title: data.title,
        url: imageUrl,
        explanation: translatedText,
        media_type: data.media_type || 'image'
    };
    updateFavoriteButtonState();
    updatePinButtonState();

    getDominantColor(imageUrl).then(color => {
        currentDominantColor = color;
        // Reiniciar los osciladores con el nuevo color extraído
        if (audioCtx) startSpaceAmbient();
    });

    typeWriterEffect(translatedText, explanationElement);
}

// --- Audio Reactivo y Color ---
function getFallbackColor(urlStr) {
    let hash = 0;
    for (let i = 0; i < urlStr.length; i++) {
        hash = urlStr.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit int
    }
    return {
        r: Math.floor(Math.abs(Math.sin(hash) * 255)),
        g: Math.floor(Math.abs(Math.cos(hash) * 255)),
        b: Math.floor(Math.abs(Math.sin(hash * 2) * 255))
    };
}

async function getDominantColor(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Requerido para leer píxeles
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                const data = ctx.getImageData(0, 0, c.width, c.height).data;
                let r = 0, g = 0, b = 0, count = 0;
                const step = 4 * 10; // Muestrear por rendimiento
                for (let i = 0; i < data.length; i += step) {
                    r += data[i]; g += data[i+1]; b += data[i+2]; count++;
                }
                resolve({ r: Math.floor(r/count), g: Math.floor(g/count), b: Math.floor(b/count) });
            } catch (e) {
                resolve(getFallbackColor(imageUrl)); // Fallback criptográfico a base del URL
            }
        };
        img.onerror = () => resolve(getFallbackColor(imageUrl));
        img.src = imageUrl;
    });
}

function updateSpaceAmbient(rgb) {
    console.log(`=== Color predominante detectado: rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) ===`);
    if (!oscAmbient || !oscAudible || !filterAmbient) return;
    
    // Cambios radicales de sonido dependiendo de la paleta de color
    if (rgb.r > rgb.b + 20) { 
        // Imagen rojiza/cálida = Sonido industrial, grave y rasposo
        oscAmbient.type = 'sawtooth';
        oscAmbient.frequency.setTargetAtTime(30 + (rgb.r * 0.2), audioCtx.currentTime, 1);
        oscAudible.type = 'square';
        oscAudible.frequency.setTargetAtTime(80 + rgb.r, audioCtx.currentTime, 1);
        filterAmbient.frequency.setTargetAtTime(200 + (rgb.r * 3), audioCtx.currentTime, 1);
    } else if (rgb.b > rgb.r + 20) { 
        // Imagen azulada/fría = Sonido cristalino, agudo y espacial
        oscAmbient.type = 'sine';
        oscAmbient.frequency.setTargetAtTime(120 + (rgb.b * 0.2), audioCtx.currentTime, 1);
        oscAudible.type = 'triangle';
        oscAudible.frequency.setTargetAtTime(250 + rgb.b, audioCtx.currentTime, 1);
        filterAmbient.frequency.setTargetAtTime(600 + (rgb.b * 4), audioCtx.currentTime, 1);
    } else { 
        // Imagen neutra o gris = Zumbido balanceado tipo nave
        oscAmbient.type = 'triangle';
        oscAmbient.frequency.setTargetAtTime(60, audioCtx.currentTime, 1);
        oscAudible.type = 'sine';
        oscAudible.frequency.setTargetAtTime(150 + rgb.g, audioCtx.currentTime, 1);
        filterAmbient.frequency.setTargetAtTime(400 + (rgb.g * 2), audioCtx.currentTime, 1);
    }
}

// Efecto de Máquina de Escribir Fluido
function typeWriterEffect(text, element, speed = 25) {
    if (typewriterTimeoutId) {
        clearTimeout(typewriterTimeoutId); // Detener tipeo anterior (evita sobreposición de textos)
    }

    element.textContent = ''; // Limpiar el contenido previo
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            playBlip(); // Disparar audio procedural
            i++;
            
            let currentSpeed = speed; // Velocidad constante original
            
            // Si el usuario activó la escritura humana:
            if (localStorage.getItem('nasa_human_typing') !== 'false') {
                currentSpeed += (Math.random() * 40 - 20); 
                // Pausas ocasionales (3% de probabilidad)
                if (Math.random() < 0.03) {
                    currentSpeed += 150 + Math.random() * 150;
                }
            }

            // Llama a la misma función después de los milisegundos
            typewriterTimeoutId = setTimeout(type, currentSpeed);
        }
    }
    
    type();
}
