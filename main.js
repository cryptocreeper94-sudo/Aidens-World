const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "The Chronoverse",
    icon: path.join(__dirname, 'assets', 'ui', 'icon-512.png'),
    autoHideMenuBar: true, // Hides the classic Windows file menu
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true
    }
  });

  // Load the vanilla HTML app
  mainWindow.loadFile('index.html');

  // Intercept Wildcard Links for Multi-Tenant Testing
  // In a native app, subdomain routing like 'maya.tlid.io' doesn't apply inherently.
  // The app will load the generic landing page first. 
  // We allow Firebase to handle SSO as usual.
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
