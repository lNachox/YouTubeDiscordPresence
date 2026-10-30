# YouTubeDiscordPresence

<p align="left">
    <a href="https://chrome.google.com/webstore/detail/youtubediscordpresence/hnmeidgkfcbpjjjpmjmpehjdljlaeaaa" alt="Categoría: Social y comunicación">
        <img src="https://img.shields.io/badge/Category-Social%20%26%20Communication-blueviolet" /></a>
    <a href="https://github.com/XFG16/YouTubeDiscordPresence#license" alt="Licencia MIT">
        <img src="https://img.shields.io/badge/License-MIT-yellow" /></a>
</p>

**YouTubeDiscordPresence** (YTDP) es una extensión del navegador y un host complementario que crea una presencia enriquecida detallada para YouTube y YouTube Music en Discord. Linux es compatible de forma nativa mediante MPRIS/DBus en Fedora 44 y distribuciones compatibles; Windows continúa siendo compatible mediante el host nativo original.

<br>

<img height="300px" src="Screenshots/newUiExample.png">

---

## Instalación

<p align="left">
    <a href="https://chrome.google.com/webstore/detail/youtubediscordpresence/hnmeidgkfcbpjjjpmpehjdljlaeaaa" alt="Extensión de Chrome">
        <img src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" height=60px></img></a>
    <a href="https://addons.mozilla.org/en-US/firefox/addon/youtubediscordpresence/" alt="Extensión de Firefox">
        <img src="https://extensionworkshop.com/assets/img/documentation/publish-addon-178x60px.dad84b42.png" height=60px></img></a>
</p>

Si ya descargaste la extensión, **omite el primer paso**.

1. Agrega la extensión a tu navegador.
   - Más adelante puedes acceder a las opciones de personalización desde el botón de extensiones, en la esquina superior derecha del navegador.

<a href="https://chromewebstore.google.com/detail/youtubediscordpresence/hnmeidgkfcbpjjjpmjmpehjdljlaeaaa"><img alt="Descargar desde Chrome Web Store" src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" height=60px></img></a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/youtubediscordpresence/"><img alt="Descargar desde Firefox Add-ons" src="https://extensionworkshop.com/assets/img/documentation/publish-addon-178x60px.dad84b42.png" height=60px></img></a>

2. En Fedora 44, clona el repositorio e instala el host de Linux:

   ```bash
   git clone https://github.com/XFG16/YouTubeDiscordPresence.git
   cd YouTubeDiscordPresence
   sudo dnf install nodejs npm dbus-tools
   mkdir -p ~/.local/share/ytdiscord ~/.config/ytdiscord
   cp -a NodeHost ~/.local/share/ytdiscord/
   cp ~/.local/share/ytdiscord/NodeHost/.env.example ~/.config/ytdiscord/ytdiscord.env
   cd ~/.local/share/ytdiscord/NodeHost
   npm install --omit=dev
   ```

   Edita `~/.config/ytdiscord/ytdiscord.env` y establece
   `YTDP_YOUTUBE_CLIENT_ID` y `YTDP_YOUTUBE_MUSIC_CLIENT_ID`.
   Son identificadores públicos de aplicaciones de Discord, no contraseñas ni tokens.

   Instala y ejecuta el servicio del usuario actual:

   ```bash
   mkdir -p ~/.config/systemd/user
   cp ~/.local/share/ytdiscord/NodeHost/ytdiscord.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now ytdiscord.service
   ```

   El servicio lee sesiones MPRIS de Firefox, Chrome, Chromium, Brave y YouTube Music Desktop. Usa el socket IPC de Discord en `$XDG_RUNTIME_DIR`, incluyendo `/run/user/<uid>/app/com.discordapp.Discord/discord-ipc-0` cuando Discord está instalado mediante Flatpak.

¿Todavía tienes dudas? Mira el **tutorial de instalación** en YouTube desde [**este enlace**](https://www.youtube.com/watch?v=BWPNqPGFyL4).

---

## Solución de problemas/Problemas conocidos

- Los botones `Listen Along` y `View Channel` de la presencia enriquecida no aparecen al ver tu propio perfil, aunque sí aparecen para otras personas. Consulta el ejemplo anterior. Es una [**limitación**](https://github.com/discordjs/RPC/issues/180#issuecomment-2313232518) de Discord.

- YouTubeDiscordPresence solo funciona con la aplicación de escritorio de Discord, **no con la versión del navegador**.

- Comprueba que la opción `Share my activity`, dentro de `Activity Privacy`, esté **activada**.

Reiniciar el equipo suele resolver algunos problemas, especialmente durante la primera instalación.

---

## Errores, solicitudes de funciones o soporte

Visita [este enlace](https://github.com/XFG16/YouTubeDiscordPresence/issues/new/choose) y usa la plantilla correspondiente.

---

## Compilación

Host de Linux:

- El host de Fedora se ejecuta directamente desde `NodeHost/src/app.js`; no necesita un ejecutable de Windows ni una etapa de compilación nativa.
- Para probarlo en primer plano:

  ```bash
  cd NodeHost
  npm test
  YTDP_ENV_FILE="$HOME/.config/ytdiscord/ytdiscord.env" npm start
  ```

- Para inspeccionar el servicio del usuario:

  ```bash
  systemctl --user status ytdiscord.service
  journalctl --user -u ytdiscord.service -f
  ```

Aplicación de escritorio de Windows:

- `npm run compile`
- Reemplaza el `YTDPwin.exe` existente en `C:\Program Files\YouTubeDiscordPresence` por el nuevo ejecutable.

- Para compilar el `.msi`: instala **Visual Studio 2026** con la extensión **Microsoft Visual Studio Installer Project**. Abre `Host\YTDPsetup\YTDPsetup.vdproj` y genera `YTDPsetup`.

Extensión:

- Descarga la carpeta `Extension` y carga la extensión manualmente en tu navegador.
  - Chrome: añade el ID de la extensión local al arreglo `allowed_origins` en `C:\Program Files\YouTubeDiscordPresence\main.json`.

---

## Información adicional

**AVISO:** esto no es una copia no oficial de PreMiD. Técnicamente, funciona de forma similar a la presencia enriquecida de Spotify: solo aparece **cuando se está reproduciendo un video** y **desaparece cuando no hay video o está pausado**. Además, solo muestra la presencia para videos. No se muestran los estados de espera ni las búsquedas. Funciones como exclusiones, detalles totalmente personalizables y cobertura de miniaturas son **únicas y originales** de YouTubeDiscordPresence. YouTubeDiscordPresence no ha tomado referencias de PreMiD ni está afiliado a dicho proyecto.

---

## Licencia

Publicado bajo la licencia [MIT](https://github.com/XFG16/YouTubeDiscordPresence/blob/main/LICENSE.txt).
