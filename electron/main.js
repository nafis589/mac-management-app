/**
 * Electron Main Process — Friperie de Luxe
 *
 * Point d'entrée principal de l'application desktop.
 * - Initialise le backend (connexion DB)
 * - Enregistre les IPC handlers
 * - Crée la fenêtre principale et charge le frontend statique
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Référence à la fenêtre principale (évite le garbage collection)
let mainWindow = null;

const serve = require('electron-serve').default || require('electron-serve');
const loadURL = serve({ directory: path.join(__dirname, '..', 'frontend', 'out') });

/**
 * Crée la fenêtre principale de l'application
 */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'Friperie de Luxe',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false // requis pour que le preload accède à ipcRenderer
    }
  });

  // Afficher la fenêtre quand elle est prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Charger le frontend statique via electron-serve
  await loadURL(mainWindow);

  // Ouvrir DevTools en développement
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialisation de l'application
 */
app.whenReady().then(async () => {
  try {
    // 1. Initialiser le backend (connexion DB)
    const backendPath = 'file://' + path.join(__dirname, '../backend/dist/index.js').replace(/\\/g, '/');
    const backend = await import(backendPath);

    // Quand le backend est chargé via tsx/ESM, l'export default 
    // peut être sur .default
    const backendModule = backend.default || backend;
    await backendModule.init();
    console.log('✅ Backend initialisé avec succès');

    // 2. Enregistrer les IPC handlers
    const { registerHandlers } = require('./ipc-handlers.js');
    registerHandlers(backendModule);
    console.log('✅ IPC handlers enregistrés');

    // 3. Créer la fenêtre principale
    createWindow();
    console.log('✅ Fenêtre principale créée');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    app.quit();
  }
});

// macOS : recréer la fenêtre quand on clique sur l'icône du dock
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quitter quand toutes les fenêtres sont fermées (sauf macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Empêcher plusieurs instances de l'application
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Si une deuxième instance est lancée, focus sur la première
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
