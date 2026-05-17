const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let win = null;

// Leer configuración del widget desde el perfil de usuario
const configPath = path.join(app.getPath('userData'), 'window_config.json');
let isWidgetMode = true; // Modo Widget por defecto
try {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath));
    isWidgetMode = config.widgetMode;
  }
} catch (e) {}

function createWindow () {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 350,
    minHeight: 250,
    frame: !isWidgetMode, // Quita o pone los bordes según la configuración
    icon: path.join(__dirname, 'icon.ico'), // Ícono de la ventana y barra de tareas
    autoHideMenuBar: true, // Oculta el menú clásico de Archivo/Edición
    webPreferences: {
      nodeIntegration: true, // Habilita la comunicación con app.js
      contextIsolation: false
    }
  });

  win.loadFile('1.html');
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mostrar Dashboard', click: () => { win.show(); } },
    { type: 'separator' },
    { label: 'Cerrar Aplicación', click: () => { 
        app.isQuiting = true; 
        app.quit(); 
      } 
    }
  ]);
  
  tray.setToolTip('NASA Space Dashboard');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    win.isVisible() ? win.hide() : win.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Escuchar el evento de cambio de bordes desde la interfaz
ipcMain.on('set-widget-mode', (event, widgetMode) => {
  fs.writeFileSync(configPath, JSON.stringify({ widgetMode }));
  app.relaunch(); // Reinicia la app instantáneamente para aplicar los cambios de ventana
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
});