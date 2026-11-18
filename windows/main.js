'use strict';
const {app,BrowserWindow,shell,session,ipcMain}=require('electron');
const fs=require('fs'),path=require('path');
let target='';let win;
const configPath=()=>path.join(app.getPath('userData'),'config.json');
function validURL(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname.endsWith('.onrender.com')}catch{return false}}
function load(){if(target)win.loadURL(target);else win.loadFile(path.join(__dirname,'setup.html'))}
app.whenReady().then(()=>{
 try{const cfg=JSON.parse(fs.readFileSync(configPath(),'utf8'));if(validURL(cfg.url))target=cfg.url}catch{}
 ipcMain.handle('save-url',async (_event,url)=>{if(!validURL(url))return 'Ingresa tu dirección HTTPS de Render, que termine en .onrender.com';target=url;fs.writeFileSync(configPath(),JSON.stringify({url},null,2));load();return ''});
 win=new BrowserWindow({width:1360,height:850,minWidth:900,minHeight:600,backgroundColor:'#101116',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,preload:path.join(__dirname,'preload.js')}});
 session.defaultSession.setPermissionCheckHandler((_contents,permission,origin)=>{try{return !!target && new URL(origin).origin===new URL(target).origin&&['media','display-capture'].includes(permission)}catch{return false}});
 session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>{try{callback(!!target&&new URL(contents.getURL()).origin===new URL(target).origin&&['media','display-capture'].includes(permission))}catch{callback(false)}});
 win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://'))shell.openExternal(url);return{action:'deny'}});
 load();
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
