# 43 · Versión 4.0 — servidores y canales

Esta actualización parte de la versión 3.0 y mantiene chat con archivos efímeros (hasta 1 MB), perfiles locales, sonidos, salas de voz WebRTC y pantalla compartida.

## Lo nuevo
- **Servidores:** existe por defecto `Comunidad 43`. Desde dentro de un canal de voz se pueden crear servidores nuevos, públicos o con contraseña.
- **Canales de voz:** `General`, `Gaming`, `Charlas`; puedes cambiar de canal haciendo clic. Cada canal de voz tiene hasta 10 personas; los participantes de canales distintos **no** se escuchan.
- **Canales de texto:** `Chat general` y otros creados desde el botón +. El chat se comparte entre las personas que tengan seleccionado el mismo canal de texto del mismo servidor, aunque estén en canales de voz distintos.
- **Crear canales:** pulsa + en la barra lateral mientras estás dentro de un canal de voz. Por simplicidad, solo el anfitrión del **canal de voz actual** puede crear canales de ese servidor (no hay aún roles permanentes).
- El enlace «Invitar» incluye el servidor y canal de voz actual. Los servidores privados siguen requiriendo contraseña.

## Instalar localmente
1. Descomprime el proyecto.
2. Instala Node.js 18 o superior.
3. En una terminal abierta en la carpeta `43`, ejecuta `npm install` y `npm start`.
4. Abre http://localhost:3000.

## Actualizar la web existente (GitHub Desktop + Render)
1. Antes de reemplazar nada, guarda una copia de la carpeta actual del repositorio.
2. Copia `server.js`, `public/`, `package.json` y `README.md` **dentro del repositorio clonado**; reemplaza los archivos cuando Windows pregunte. Mantén tu `package-lock.json` actual, ya que las dependencias del servidor no cambiaron.
3. Abre GitHub Desktop, comprueba qué archivos cambiaron, escribe `43 v4.0: servidores y canales`, `Commit to main` y `Push origin`.
4. En Render abre el servicio existente. Si Auto Deploy está activado, espera a que muestre `Live`; si no, `Manual Deploy > Deploy latest commit`.
5. Abre el MISMO enlace de Render con recarga forzada (Ctrl+F5) y prueba con dos computadores, dos canales de voz y un canal de texto.

## Limitaciones importantes
- **Render Free usa almacenamiento efímero:** los servidores y canales creados desde la interfaz viven en memoria RAM y **desaparecen al reiniciarse o redeplegarse** el proceso. El servidor predeterminado `Comunidad 43` y sus canales definidos en `server.js` reaparecen al iniciar. Para que los servidores personalizados duren se necesita una base de datos externa (por ejemplo, PostgreSQL).
- Los mensajes del chat y los adjuntos son efímeros. No hay historial guardado ni una gestión de cuentas real.
- El límite es **10 personas por canal de voz**, no 10 en toda la plataforma. El uso real depende del plan de Render y de la conectividad de WebRTC.
- La contraseña de servidor controla el acceso por servidor, pero faltan cuentas, identidad verificada, roles permanentes y moderación avanzada. No uses contraseñas sensibles.
- WebRTC usa STUN público sin TURN: algunas redes pueden impedir las conexiones o limitar la transmisión.
- La carpeta `windows/` contiene el proyecto Electron heredado de v3; el instalador no viene compilado, y la captura de pantalla debe verificarse específicamente en Windows.
- No publiques archivos privados en GitHub. Usa repositorios privados si prefieres no mostrar el código.

## Estructura
- `server.js` — HTTP, WebSocket, directorio de servidores, canales y señales WebRTC.
- `public/index.html`, `public/app.js`, `public/style.css` — interfaz web.
- `windows/` — proyecto Electron experimental.
