'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const WebSocket=require('ws');
const PORT=Number(process.env.PORT||3000), root=path.join(__dirname,'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('No encontrado')};res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data)});
});
const wss=new WebSocket.Server({server,maxPayload:2*1024*1024});
const rooms=new Map();
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))};
const broadcast=(r,obj,except)=>{for(const p of r.members.values())if(p.ws!==except)send(p.ws,obj)};
const clean=(s,n=24)=>String(s||'').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,n);
const avOk=s=>typeof s==='string' && (s==='' || (/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(s)&&s.length<110000));
const equal=(a,b)=>{let x=crypto.createHash('sha256').update(a).digest(),y=crypto.createHash('sha256').update(b).digest();return crypto.timingSafeEqual(x,y)};
const members=r=>[...r.members].map(([id,p])=>({id,name:p.name,avatar:p.avatar,muted:p.muted,host:id===r.hostId}));
const roomState=r=>({type:'room-state',peers:members(r),locked:r.locked,private:!!r.passwordHash,hostId:r.hostId});
function leave(ws){if(!ws.room)return;const r=rooms.get(ws.room),id=ws.uid;ws.room=null;if(!r)return;r.members.delete(id);broadcast(r,{type:'peer-left',id});if(r.hostId===id){r.hostId=r.members.keys().next().value||null}if(r.members.size)broadcast(r,roomState(r));else rooms.delete(r.name)}
wss.on('connection',ws=>{
 ws.uid=crypto.randomUUID();ws.room=null;ws.isAlive=true;
 ws.on('pong',()=>{ws.isAlive=true});
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString())}catch{return};if(!m||typeof m!=='object')return;
  if(m.type==='join'){
   if(ws.room)return;let name=clean(m.name)||'Invitado',roomName=String(m.room||'general').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)||'general';
   const avatar=avOk(m.avatar)?m.avatar:'';let r=rooms.get(roomName);
   if(!r){r={name:roomName,members:new Map(),hostId:ws.uid,passwordHash:clean(m.password,64)?crypto.createHash('sha256').update(clean(m.password,64)).digest('hex'):null,locked:false};rooms.set(roomName,r)}
   else if(r.locked){send(ws,{type:'error',message:'Esta sala está bloqueada por el anfitrión.'});return}
   else if(r.passwordHash&&!equal(clean(m.password,64),r.passwordHash)){send(ws,{type:'error',message:'Contraseña incorrecta.'});return}
   if(r.members.size>=10){send(ws,{type:'error',message:'Sala llena (máximo 10 personas).'});return}
   const peers=members(r);r.members.set(ws.uid,{ws,name,avatar,muted:false});ws.room=roomName;
   send(ws,{type:'joined',id:ws.uid,room:roomName,peers,locked:r.locked,private:!!r.passwordHash,hostId:r.hostId});broadcast(r,{type:'peer-joined',id:ws.uid,name,avatar,muted:false});broadcast(r,roomState(r));return;
  }
  if(!ws.room)return;const r=rooms.get(ws.room);if(!r||!r.members.has(ws.uid))return;
  if(m.type==='signal'&&typeof m.to==='string'&&r.members.has(m.to)&&['offer','answer','candidate'].includes(m.data?.type)){send(r.members.get(m.to).ws,{type:'signal',from:ws.uid,data:m.data});return}
  if(m.type==='chat'){const val=clean(m.text,1000);if(val)broadcast(r,{type:'chat',from:ws.uid,name:r.members.get(ws.uid).name,text:val});return}
  if(m.type==='attachment'){
   if(typeof m.data!=='string'||m.data.length>1400000||!/^data:(?:image\/(?:png|jpeg|webp|gif)|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=]+$/.test(m.data)){send(ws,{type:'error',message:'Solo imágenes, PDF o texto de hasta 1 MB.'});return}
   broadcast(r,{type:'attachment',from:ws.uid,name:r.members.get(ws.uid).name,fileName:clean(m.fileName,100)||'archivo',data:m.data});return;
  }
  if(m.type==='profile'){const p=r.members.get(ws.uid);p.name=clean(m.name)||p.name;if(avOk(m.avatar))p.avatar=m.avatar;broadcast(r,{type:'profile',id:ws.uid,name:p.name,avatar:p.avatar});return}
  if(m.type==='mute-state'){r.members.get(ws.uid).muted=!!m.muted;broadcast(r,{type:'mute-state',id:ws.uid,muted:!!m.muted});return}
  if(m.type==='sound'&&['beep','tada','boing','alert'].includes(m.sound)){broadcast(r,{type:'sound',id:ws.uid,sound:m.sound});return}
  if(m.type==='lock'&&r.hostId===ws.uid){r.locked=!!m.locked;broadcast(r,roomState(r));return}
  if(m.type==='kick'&&r.hostId===ws.uid&&m.target!==ws.uid&&r.members.has(m.target)){const target=r.members.get(m.target).ws;send(target,{type:'kicked'});leave(target);return}
 });
 ws.on('close',()=>leave(ws));ws.on('error',()=>leave(ws));
});
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue}ws.isAlive=false;ws.ping()}},30000);wss.on('close',()=>clearInterval(heartbeat));
server.listen(PORT,'0.0.0.0',()=>console.log('43 v3 listo en puerto '+PORT));
