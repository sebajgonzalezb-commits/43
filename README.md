# 43 — Sala de voz y pantalla compartida

Prototipo web gratuito para hasta **10 personas por sala**, con micrófono, chat y pantalla compartida.

## Probar en tu computador

1. Instala **Node.js 18 o superior** desde https://nodejs.org/.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta `npm install` y luego `npm start`.
4. Abre **http://localhost:3000** en Chrome o Edge.
5. Escribe tu nombre y entra a una sala. Usa el botón «Copiar invitación» cuando publiques la web en un servidor.

## Publicar en internet

Necesitas alojar este proyecto Node.js en un servicio que permita conexiones **WebSocket** y activar **HTTPS**. El servidor gratuito, si lo hay, puede tener suspensión, límite de uso y tráfico. El enlace `localhost` solo funciona en tu propio computador; **no se puede enviar a amigos fuera de tu PC**.

## Importante

- El límite de 10 usuarios se aplica **en el servidor, por cada sala**.
- WebRTC usa malla entre participantes, por lo que 10 conexiones simultáneas con pantalla compartida pueden consumir mucho ancho de banda y causar retrasos.
- Incluye un servidor público STUN, pero **no TURN**. Algunas redes pueden impedir conexiones directas, por lo que podría requerirse un TURN propio o de pago.
- Para que funcione en otros computadores, necesitas HTTPS y un servidor accesible públicamente.
- Es un prototipo sin cuentas, autenticación, moderación, cifrado adicional de chat ni almacenamiento persistente. Usa nombres de sala difíciles de adivinar si quieres algo de privacidad, pero no lo consideres seguro para información sensible.
- Algunas capturas pueden requerir elegir una pestaña, ventana o pantalla en Chrome/Edge.
