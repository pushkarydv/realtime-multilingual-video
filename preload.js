const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    close: () => ipcRenderer.invoke('window-close'),
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    generateTranslation: (filePath) => ipcRenderer.invoke('create-translation', filePath)
});