const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    close: () => ipcRenderer.invoke('window-close'),
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    generateTranslation: (filePath) => ipcRenderer.invoke('create-translation', filePath),
    saveTranslation: (checksum, translation) => ipcRenderer.invoke('save-translation', checksum, translation),
    getTranslation: (checksum) => ipcRenderer.invoke('get-translation', checksum),
    generateAudioSegments: (data) => ipcRenderer.invoke('generate-audio-segments', data),
});