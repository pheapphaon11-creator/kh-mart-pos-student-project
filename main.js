const { app, BrowserWindow } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'KH Mart POS',
    webPreferences: {
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('https://kh-mart-pos.vercel.app/');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
