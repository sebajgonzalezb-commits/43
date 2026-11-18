const $=id=>document.getElementById(id);
let ws=null, myId=null, myName='', roomName='', localStream=null, screenStream=null;
const peers=new Map(); // peerId => {pc,name,senders}
const pendingCandidates=new Map();
const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
const send=m=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));};
const status=s=>$('connectionStatus').textContent=s;
const addMessage=(name,text,system=false)=>{const div=document.createElement('div');div.className=system?'system':'message';if(system){div.textContent=text;}else{const b=document.createElement('b');b.textContent=name;const p=document.createElement('p');p.textContent=text;div.append(b,p);}$('messages').append(div);$('messages').scrollTop=$('messages').scrollHeight;};
const updateMembers=()=>{const el=$('members');el.replaceChildren();const all=[{name:myName+' (tú)'}, ...[...peers.values()].map(p=>({name:p.name}))];for(const p of all){const d=document.createElement('div');d.className='member';d.textContent='🟢  '+p.name;el.append(d);}};
function screenTile(id,label,stream){let tile=$('tile-'+id);if(!tile){tile=document.createElement('div');tile.className='screenTile';tile.id='tile-'+id;const vid=document.createElement('video');vid.autoplay=true;vid.playsInline=true;vid.muted=id==='local';tile.append(vid);const span=document.createElement('span');span.textContent=label;tile.append(span);$('screens').append(tile);}tile.querySelector('video').srcObject=stream;$('emptyScreen').classList.add('hidden');}
function removeScreen(id){$('tile-'+id)?.remove();if(!$('screens').querySelector('.screenTile'))$('emptyScreen').classList.remove('hidden');}
async function addPeer(id,name,initiator){if(peers.has(id))return;const pc=new RTCPeerConnection(rtcConfig);const record={pc,name,senders:[]};peers.set(id,record);updateMembers();
  pc.onicecandidate=e=>{if(e.candidate)send({type:'signal',to:id,data:{type:'candidate',candidate:e.candidate}});};
  pc.ontrack=e=>{const stream=e.streams[0];if(e.track.kind==='audio'){let audio=$('audio-'+id);if(!audio){audio=document.createElement('audio');audio.id='audio-'+id;audio.autoplay=true;audio.className='audioBin';document.body.append(audio);}audio.srcObject=stream;}else if(e.track.kind==='video'){screenTile(id,name+' está compartiendo',stream);e.track.onended=()=>removeScreen(id);}};
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState))addMessage('','Conexión perdida con '+name,true);};
  for(const track of localStream.getTracks())record.senders.push(pc.addTrack(track,localStream));
  if(screenStream)for(const track of screenStream.getVideoTracks())pc.addTrack(track,screenStream);
  if(initiator){const offer=await pc.createOffer();await pc.setLocalDescription(offer);send({type:'signal',to:id,data:{type:'offer',sdp:pc.localDescription}});}
}
async function signal(from,data){if(!peers.has(from))await addPeer(from,'Participante',false);const pc=peers.get(from).pc;
  try{if(data.type==='offer'){
    await pc.setRemoteDescription(data.sdp);for(const c of pendingCandidates.get(from)||[])await pc.addIceCandidate(c);pendingCandidates.delete(from);
    const answer=await pc.createAnswer();await pc.setLocalDescription(answer);send({type:'signal',to:from,data:{type:'answer',sdp:pc.localDescription}});
  }else if(data.type==='answer'){await pc.setRemoteDescription(data.sdp);for(const c of pendingCandidates.get(from)||[])await pc.addIceCandidate(c);pendingCandidates.delete(from);
  }else if(data.type==='candidate'){if(pc.remoteDescription)await pc.addIceCandidate(data.candidate);else{const q=pendingCandidates.get(from)||[];q.push(data.candidate);pendingCandidates.set(from,q);}}
  }catch(err){console.error('WebRTC',err);addMessage('','Error conectando audio/video con un participante.',true);}
}
async function shareScreen(){if(screenStream){stopScreen();return;}try{screenStream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});const track=screenStream.getVideoTracks()[0];track.onended=stopScreen;screenTile('local','Tu pantalla',screenStream);for(const [id,p] of peers){p.pc.addTrack(track,screenStream);await renegotiate(id,p.pc);}$('screenBtn').textContent='⏹️ Dejar de compartir';}catch(e){addMessage('', 'No se pudo compartir pantalla: '+e.message,true);}}
async function renegotiate(id,pc){try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);send({type:'signal',to:id,data:{type:'offer',sdp:pc.localDescription}});}catch(e){console.error(e);}}
function stopScreen(){if(!screenStream)return;for(const track of screenStream.getTracks())track.stop();screenStream=null;removeScreen('local');for(const [id,p] of peers){for(const sender of p.pc.getSenders()){if(sender.track?.kind==='video'){p.pc.removeTrack(sender);}}renegotiate(id,p.pc);}$('screenBtn').textContent='🖥️ Compartir pantalla';}
function cleanup(){stopScreen();for(const [id,p] of peers){p.pc.close();$('audio-'+id)?.remove();removeScreen(id);}peers.clear();localStream?.getTracks().forEach(t=>t.stop());localStream=null;ws?.close();ws=null;myId=null;$('roomView').classList.add('hidden');$('joinView').classList.remove('hidden');$('chatInput').disabled=true;$('sendBtn').disabled=true;$('members').textContent='Entra a la sala para verlos';status('Sin conectar');}
$('joinForm').addEventListener('submit',async e=>{e.preventDefault();$('joinError').textContent='';myName=$('name').value.trim();roomName=$('room').value.trim().toLowerCase();if(!myName||!roomName)return;try{localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});}catch(err){$('joinError').textContent='Necesitas permitir el micrófono para entrar: '+err.message;return;}
  ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
  ws.onopen=()=>send({type:'join',room:roomName,name:myName});
  ws.onmessage=async e=>{const m=JSON.parse(e.data);if(m.type==='error'){$('joinError').textContent=m.message;cleanup();$('joinError').textContent=m.message;}else if(m.type==='joined'){myId=m.id;$('channelName').textContent=m.room;$('mainTitle').textContent='# '+m.room;history.replaceState(null,'',location.pathname+'?room='+encodeURIComponent(m.room));$('joinView').classList.add('hidden');$('roomView').classList.remove('hidden');$('chatInput').disabled=false;$('sendBtn').disabled=false;status('Conectado');addMessage('','Entraste a #'+m.room,true);for(const p of m.peers)await addPeer(p.id,p.name,true);updateMembers();}else if(m.type==='peer-joined'){await addPeer(m.id,m.name,false);addMessage('',m.name+' entró a la sala.',true);}else if(m.type==='peer-left'){const p=peers.get(m.id);if(p){p.pc.close();$('audio-'+m.id)?.remove();removeScreen(m.id);peers.delete(m.id);updateMembers();addMessage('',p.name+' salió.',true);}}else if(m.type==='signal')await signal(m.from,m.data);else if(m.type==='chat')addMessage(m.name,m.text);};
  ws.onerror=()=>{$('joinError').textContent='No se pudo conectar al servidor.';};ws.onclose=()=>{if(myId){addMessage('','Se desconectó el servidor.',true);cleanup();}else localStream?.getTracks().forEach(t=>t.stop());};
});
$('chatForm').addEventListener('submit',e=>{e.preventDefault();const text=$('chatInput').value.trim();if(!text)return;send({type:'chat',text});$('chatInput').value='';});
$('micBtn').addEventListener('click',()=>{if(!localStream)return;const track=localStream.getAudioTracks()[0];track.enabled=!track.enabled;$('micBtn').textContent=track.enabled?'🎙️ Silenciar':'🔇 Activar micrófono';});
$('screenBtn').addEventListener('click',shareScreen);
$('inviteBtn').addEventListener('click',async()=>{const url=location.origin+'/?room='+encodeURIComponent(roomName);try{await navigator.clipboard.writeText(url);addMessage('','Enlace de invitación copiado.',true);}catch{addMessage('','Invita con este enlace: '+url,true);}});
$('leaveBtn').addEventListener('click',cleanup);
const params=new URLSearchParams(location.search);if(params.get('room'))$('room').value=params.get('room');
