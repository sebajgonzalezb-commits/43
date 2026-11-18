const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('setup43',{saveURL:(url)=>ipcRenderer.invoke('save-url',url)});
