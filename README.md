# 43 — versión 3.0

Actualiza la versión 2.0 manteniendo la voz WebRTC, salas, chat, enlaces de invitación y pantalla compartida. Máximo **10 personas por sala**.

## Nuevas funciones
- Transmisión con pantalla completa y pantalla central más grande; opciones de 480p/720p/1080p solicitadas al navegador.
- Volumen individual de audio recibido (control de 0 a 100%; mover sobre 100 no amplifica). Estado de micrófono propio y de otras personas. No permite mutear remotamente el micrófono de otra persona.
- Foto y nombre de perfil local, compartidos en la sala. El perfil local se guarda en el navegador.
- Chat con emojis y adjuntos de imágenes, TXT o PDF de hasta 1 MB, **sin almacenamiento persistente**. Archivos y mensajes solo se envían en tiempo real a quienes estén conectados.
- Soundboard con cuatro efectos sintetizados originales.
- Salas opcionalmente protegidas por contraseña, cierre de sala y expulsar usuarios por el anfitrión. Contraseña introducida al entrar; no se guarda en el navegador.
- Aplicación para Windows con Electron en la carpeta `windows/`, que reutiliza el servidor de Render.

## Instalar y desplegar
1. Copia `public/`, `server.js`, `README.md`, `package.json` y `windows/` en tu repositorio GitHub 43, reemplazando los archivos viejos. Deja el `package-lock.json` anterior si no se actualizan las dependencias.
2. En GitHub Desktop verifica cambios, haz `Commit to main` y `Push origin`.
3. En Render usa el mismo Web Service: `Build Command: npm install` y `Start Command: npm start`. Si está habilitado Auto Deploy, Render hará el despliegue. Revisa que diga Live.
4. Recarga la página con Ctrl+F5 y prueba voz, pantalla y permisos con dos computadores.

## Aplicación Windows
Lee `windows/README.md`. No se instala a través de Render. Ejecuta `npm install` y `npm run dist` en tu computador dentro de `windows/`. La app te pedirá el enlace de tu propio Render la primera vez. No uses enlaces distintos al tuyo.

## Limitaciones importantes
- Los adjuntos y mensajes no se guardan en una base de datos: si alguien se conecta tarde no verá mensajes anteriores.
- Los controles de sala se guardan solo en memoria; una suspensión o reinicio de Render reinicia las salas.
- Para atravesar redes restrictivas puede hacer falta un servidor TURN; el STUN de Google no garantiza conectividad universal.
- El audio compartido de juegos/pestañas depende de las opciones del navegador y sistema operativo, y no está garantizado. El audio del micrófono no depende de esa opción.
- Diez participantes simultáneos por sala es un **límite**, no garantía de buen rendimiento con 10 streams P2P.
- Las contraseñas de sala no son equivalentes a autenticación segura: los anfitriones se asignan al primero que crea la sala, sin cuentas verificadas. No uses 43 para información sensible.
- La app Windows necesita pruebas en el equipo real; Electron puede requerir gestión especial de `desktopCapturer` para pantalla compartida. Para esa función usa Chrome o Edge hasta verificarlo.
