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
// Community definitions are held in RAM on purpose: Render Free has ephemeral storage.
const servers=new Map([['43',{id:'43',name:'Comunidad 43',passwordHash:null,channels:[{id:'general',name:'General',kind:'voice'},{id:'gaming',name:'Gaming',kind:'voice'},{id:'charlas',name:'Charlas',kind:'voice'},{id:'chat',name:'Chat general',kind:'text'}]}]]);
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))};
const broadcast=(r,obj,except)=>{for(const p of r.members.values())if(p.ws!==except)send(p.ws,obj)};
const clean=(s,n=24)=>String(s||'').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,n);
const slug=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').slice(0,32).replace(/^-|-$/g,'');
const hash=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const equal=(a,b)=>crypto.timingSafeEqual(Buffer.from(hash(a)),Buffer.from(b));
const avOk=s=>typeof s==='string' && (s==='' || (/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(s)&&s.length<110000));
const members=r=>[...r.members].map(([id,p])=>({id,name:p.name,avatar:p.avatar,muted:p.muted,host:id===r.hostId}));
const roomState=r=>({type:'room-state',peers:members(r),locked:r.locked,private:!!r.passwordHash,hostId:r.hostId});
const key=(s,c)=>s+':'+c;
const textRecipients=(ws)=>[...wss.clients].filter(x=>x.room&&x.room.split(':')[0]===ws.room.split(':')[0]&&x.textChannel===ws.textChannel);
const sendText=(ws,obj)=>{for(const p of textRecipients(ws))send(p,obj)};
const serverList=()=>[...servers.values()].map(s=>({id:s.id,name:s.name,private:!!s.passwordHash,channels:s.channels.map(c=>({...c,count:rooms.get(key(s.id,c.id))?.members.size||0}))}));
const updateDirectory=()=>{const data={type:'directory',servers:serverList()};for(const ws of wss.clients)send(ws,data)};
function leave(ws){if(!ws.room)return;const r=rooms.get(ws.room),id=ws.uid;ws.room=null;ws.textChannel=null;if(!r)return;r.members.delete(id);broadcast(r,{type:'peer-left',id});if(r.hostId===id)r.hostId=r.members.keys().next().value||null;if(r.members.size)broadcast(r,roomState(r));else rooms.delete(r.name);updateDirectory()}
wss.on('connection',ws=>{
 ws.uid=crypto.randomUUID();ws.room=null;ws.textChannel=null;ws.isAlive=true;send(ws,{type:'directory',servers:serverList()});
 ws.on('pong',()=>{ws.isAlive=true});
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString())}catch{return};if(!m||typeof m!=='object')return;
  if(m.type==='create-server'){
   const name=clean(m.name,36),id=slug(name),pass=String(m.password||'').slice(0,64);
   if(!name||id.length<2||servers.has(id)||servers.size>=12){send(ws,{type:'error',message:'Nombre no válido, repetido o máximo de 12 servidores.'});return}
   servers.set(id,{id,name,passwordHash:pass?hash(pass):null,channels:[{id:'general',name:'General',kind:'voice'},{id:'chat',name:'Chat general',kind:'text'}]});updateDirectory();send(ws,{type:'server-created',serverId:id});return;
  }
  if(m.type==='join'){
   const name=clean(m.name)||'Invitado',serverId=slug(m.server||'43'),channelId=slug(m.channel||'general');
   const s=servers.get(serverId),c=s?.channels.find(c=>c.id===channelId);
   if(!s||!c){send(ws,{type:'error',message:'Servidor o canal no disponible.'});return}
   if(s.passwordHash&&!equal(String(m.serverPassword||'').slice(0,64),s.passwordHash)){send(ws,{type:'error',message:'Contraseña del servidor incorrecta.'});return}
   if(c.kind!=='voice'){send(ws,{type:'error',message:'Elige un canal de voz para entrar.'});return}
   const roomName=key(serverId,channelId),avatar=avOk(m.avatar)?m.avatar:'';
   if(ws.room===roomName)return;
   let r=rooms.get(roomName);
   if(r?.locked){send(ws,{type:'error',message:'Este canal está bloqueado.'});return}
   if((r?.members.size||0)>=10){send(ws,{type:'error',message:'Canal lleno (máximo 10 personas).'});return}
   leave(ws);
   if(!r){r={name:roomName,members:new Map(),hostId:ws.uid,locked:false,passwordHash:null};rooms.set(roomName,r)}
   const peers=members(r);r.members.set(ws.uid,{ws,name,avatar,muted:false});ws.room=roomName;ws.textChannel=s.channels.find(x=>x.kind==='text')?.id||null;
   send(ws,{type:'joined',id:ws.uid,serverId,serverName:s.name,channelId,channelName:c.name,peers,locked:r.locked,private:!!s.passwordHash,hostId:r.hostId});
   broadcast(r,{type:'peer-joined',id:ws.uid,name,avatar,muted:false});broadcast(r,roomState(r));updateDirectory();return;
  }
  if(m.type==='create-channel'){
   if(!ws.room){send(ws,{type:'error',message:'Entra primero a un servidor.'});return}
   const serverId=ws.room.split(':')[0],s=servers.get(serverId),r=rooms.get(ws.room);
   if(!r||r.hostId!==ws.uid){send(ws,{type:'error',message:'Solo el anfitrión del canal puede crear canales.'});return}
   const name=clean(m.name,30),id=slug(name),kind=m.kind==='text'?'text':'voice';
   if(id.length<2||s.channels.some(c=>c.id===id)||s.channels.length>=20){send(ws,{type:'error',message:'Nombre repetido o máximo de 20 canales.'});return}
   s.channels.push({id,name,kind});updateDirectory();return;
  }
  if(!ws.room)return;const r=rooms.get(ws.room);if(!r||!r.members.has(ws.uid))return;
  if(m.type==='signal'&&typeof m.to==='string'&&r.members.has(m.to)&&['offer','answer','candidate'].includes(m.data?.type)){send(r.members.get(m.to).ws,{type:'signal',from:ws.uid,data:m.data});return}
  if(m.type==='select-chat'){const s=servers.get(ws.room.split(':')[0]);if(s?.channels.some(c=>c.id===m.channel&&c.kind==='text'))ws.textChannel=m.channel;return}
  if(m.type==='chat'){const val=clean(m.text,1000);if(val&&ws.textChannel)sendText(ws,{type:'chat',from:ws.uid,name:r.members.get(ws.uid).name,text:val});return}
  if(m.type==='attachment'){
   if(typeof m.data!=='string'||m.data.length>1400000||!/^data:(?:image\/(?:png|jpeg|webp|gif)|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=]+$/.test(m.data)){send(ws,{type:'error',message:'Solo imágenes, PDF o texto de hasta 1 MB.'});return}
   if(ws.textChannel)sendText(ws,{type:'attachment',from:ws.uid,name:r.members.get(ws.uid).name,fileName:clean(m.fileName,100)||'archivo',data:m.data});return;
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
server.listen(PORT,'0.0.0.0',()=>console.log('43 v4 listo en puerto '+PORT));
