const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const PORT = Number(process.env.PORT || 3000);
const root = path.join(__dirname, 'public');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root + path.sep) && file !== path.join(root,'index.html')){res.writeHead(403); return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404); return res.end('No encontrado');} res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});res.end(data);});
});
const wss = new WebSocket.Server({server, maxPayload:64*1024});
const rooms = new Map();
const send = (ws, obj)=>{if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(obj));};
const broadcast=(room,obj,except)=>{for(const p of room.values())if(p.ws!==except)send(p.ws,obj);};
const cleanName = str=>String(str||'Invitado').trim().replace(/[<>]/g,'').slice(0,24)||'Invitado';
wss.on('connection',ws=>{
  const id=crypto.randomUUID(); let currentRoom=null;
  ws.on('message',raw=>{
    let m; try{m=JSON.parse(raw.toString());}catch{return;}
    if(m.type==='join'){
      if(currentRoom)return;
      const roomName=String(m.room||'general').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)||'general';
      let room=rooms.get(roomName);
      if(!room){room=new Map();rooms.set(roomName,room);}
      if(room.size>=10){send(ws,{type:'error',message:'Sala llena: máximo 10 personas.'});return;}
      const name=cleanName(m.name);
      const peers=[...room].map(([pid,p])=>({id:pid,name:p.name}));
      room.set(id,{ws,name});currentRoom=roomName;
      send(ws,{type:'joined',id,room:roomName,peers});
      broadcast(room,{type:'peer-joined',id,name},ws);
      return;
    }
    if(!currentRoom)return;
    const room=rooms.get(currentRoom);if(!room)return;
    if(m.type==='signal' && typeof m.to==='string'){
      const recipient=room.get(m.to);
      if(recipient && ['offer','answer','candidate'].includes(m.data?.type))send(recipient.ws,{type:'signal',from:id,data:m.data});
    }else if(m.type==='chat'){
      const text=String(m.text||'').trim().slice(0,1000); if(text)broadcast(room,{type:'chat',from:id,name:room.get(id)?.name,text},null);
    }
  });
  ws.on('close',()=>{
    if(!currentRoom)return;const room=rooms.get(currentRoom);if(!room)return;
    room.delete(id);broadcast(room,{type:'peer-left',id});if(!room.size)rooms.delete(currentRoom);
  });
});
server.listen(PORT,()=>console.log(`43 listo en http://localhost:${PORT}`));
