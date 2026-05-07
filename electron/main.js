/**
 * Electron Main Process — Friperie de Luxe
 *
 * Point d'entrée principal de l'application desktop.
 * - Initialise le backend (connexion DB)
 * - Enregistre les IPC handlers
 * - Crée la fenêtre principale et charge le frontend statique
 */

const { app, BrowserWindow, protocol, net, Menu } = require('electron');
const path = require('path');

// Enregistrer le schéma 'local' comme privilégié pour contourner CORS
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } }
]);

// Référence à la fenêtre principale (évite le garbage collection)
let mainWindow = null;

const serve = require('electron-serve').default || require('electron-serve');
const loadURL = serve({ directory: path.join(__dirname, '..', 'frontend', 'out') });

/**
 * Crée la fenêtre principale de l'application
 */
async function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
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
    // 0. Enregistrer le protocole local:// pour charger les images/fichiers depuis le disque
    protocol.handle('local', async (request) => {
      try {
        let filePath = request.url.replace('local://', '');
        filePath = decodeURIComponent(filePath);
        // Supprimer le slash initial sur Windows pour avoir un chemin valide (ex: /C:/... => C:/...)
        if (process.platform === 'win32' && filePath.startsWith('/')) {
          filePath = filePath.substring(1);
        }

        // En prod vs dev, le chemin racine du dossier uploads peut changer.
        // Par défaut (dev ou root), on prend le dossier parent du dossier electron
        let absolutePath = path.join(__dirname, '..', filePath);

        if (app.isPackaged) {
          absolutePath = path.join(process.resourcesPath, filePath);
        }

        const { pathToFileURL } = require('url');
        const fileUrl = pathToFileURL(absolutePath).toString();
        console.log('[PROTOCOL local] Request URL:', request.url, '-> resolving to:', fileUrl);
        return await net.fetch(fileUrl);
      } catch (err) {
        console.error('[PROTOCOL local] Error resolving file:', request.url, err);
        return new Response('Not Found', { status: 404 });
      }
    });

    // 1. Initialiser le backend (connexion DB)
    // On définit le chemin de la base de données dans le dossier utilisateur pour éviter les erreurs "read-only" de l'ASAR
    process.env.DB_PATH = path.join(app.getPath('userData'), 'friperie_luxe.db');
    console.log('[ELECTRON] Base de données SQLite sera stockée dans:', process.env.DB_PATH);
    
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
