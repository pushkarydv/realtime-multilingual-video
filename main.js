const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let win;

async function handleFileOpen () {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [{
            name: 'videos',
            extensions: ["mp4"]
        }]
    })
    if (!canceled) {
      return filePaths[0]
    }
  }

function createWindow() {
    win = new BrowserWindow({
        width: 1300,
        height: 768,
        autoHideMenuBar: true,
        titleBarStyle: 'hiddenInset',
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: true
        }
    });
    win.loadFile('index.html');
}

// Window control handlers
ipcMain.handle('window-close', () => {
    win?.close();
});

ipcMain.handle('window-minimize', () => {
    win?.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (win?.isMaximized()) {
        win?.unmaximize();
    } else {
        win?.maximize();
    }
});

ipcMain.handle('dialog:openFile', handleFileOpen)

// ipcMain.handle('create-translation', async (filePath) => {
//     await 
// })


app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


