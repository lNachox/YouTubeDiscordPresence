# YouTubeDiscordPresence

<p align="left">
    <a href="https://chrome.google.com/webstore/detail/youtubediscordpresence/hnmeidgkfcbpjjjpmjmpehjdljlaeaaa" alt="Category: Social & Communication">
        <img src="https://img.shields.io/badge/Category-Social%20%26%20Communication-blueviolet" /></a>
    <a href="https://github.com/XFG16/YouTubeDiscordPresence#license" alt="MIT License">
        <img src="https://img.shields.io/badge/License-MIT-yellow" /></a>
</p>

**YouTubeDiscordPresence** (YTDP) is a browser extension and companion host that creates a detailed rich presence for YouTube and YouTube Music on Discord. Linux is supported natively through MPRIS/DBus on Fedora 44 and compatible distributions; Windows remains supported through the original native host.

For the Spanish documentation, see [README_ES.md](README_ES.md). The complete
portability and migration notes are available in
[English](PORTABILITY_AND_MIGRATION_NOTES.txt) and
[Spanish](NOTAS_DE_PORTABILIDAD_Y_MIGRACION.txt).

<br>

<img height="300px" src="Screenshots/newUiExample.png">

---

## Installation

<p align="left">
    <a href="https://chrome.google.com/webstore/detail/youtubediscordpresence/hnmeidgkfcbpjjjpmjmpehjdljlaeaaa" alt="Chrome Extension">
        <img src="https://img.shields.io/badge/Chrome%20Web%20Store-21%2C000%2B%20Users-critical" /></a>
    <a href="https://chrome.google.com/webstore/detail/youtubediscordpresence/hnmeidgkfcbpjjjpmjmpehjdljlaeaaa" alt="Category: Social & Communication">
        <img src="https://img.shields.io/badge/Total%20Installs-71%2C000%2B-blue" /></a>
</p>

If you've already downloaded the extension, **skip the first step!**

1. Add the extension to your browser. 
    - Access personalization settings later by clicking on the extension (puzzle piece) button at the top right corner of your browser.

<a href="https://chromewebstore.google.com/detail/youtubediscordpresence/hnmeidgkfcbpjjjpmjmpehjdljlaeaaa"><img alt="Download on the Chrome Web Store" src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" height=60px></img></a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/youtubediscordpresence/"><img alt="Download on the Firefox Addon Store" src="https://extensionworkshop.com/assets/img/documentation/publish/get-the-addon-178x60px.dad84b42.png" height=60px></img></a>

2. On Fedora 44, clone the repository and install the Linux host:

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

   Edit `~/.config/ytdiscord/ytdiscord.env` and set
   `YTDP_YOUTUBE_CLIENT_ID` and `YTDP_YOUTUBE_MUSIC_CLIENT_ID`.
   These are public Discord application identifiers, not passwords or tokens.

   Install the service for the current user and start it:

   ```bash
   mkdir -p ~/.config/systemd/user
   cp ~/.local/share/ytdiscord/NodeHost/ytdiscord.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now ytdiscord.service
   ```

   The service reads MPRIS sessions from Firefox, Chrome, Chromium, Brave,
   and YouTube Music Desktop. It uses the Discord IPC socket in
   `$XDG_RUNTIME_DIR`, including `/run/user/<uid>/app/com.discordapp.Discord/discord-ipc-0`
   for Flatpak Discord.

Still confused? Watch the **installation tutorial** on YouTube using [**<ins>this link</ins>**](https://www.youtube.com/watch?v=BWPNqPGFyL4).

---

## Troubleshooting/Known Issues

- The `Listen Along` and `View Channel` buttons in the rich presence don't show when looking at your own profile, but it will show for others. See the example image above. This is a Discord [**<ins>limitation</ins>**](https://github.com/discordjs/RPC/issues/180#issuecomment-2313232518).

- YouTubeDiscordPresence only works with the desktop application of Discord, **not the browser version.**

- Ensure that the `Share my activity` setting under `Activity Privacy` is **turned on**.

Restarting your PC usually resolves any issues, especially on first install.

---

## Bugs, Feature Requests, or Support

Go [here](https://github.com/XFG16/YouTubeDiscordPresence/issues/new/choose) and follow the template!

---

## Building

Linux host:

- The Fedora host runs directly from `NodeHost/src/app.js`; no Windows executable or
  native build step is required.
- To test the host in the foreground:

  ```bash
  cd NodeHost
  npm test
  YTDP_ENV_FILE="$HOME/.config/ytdiscord/ytdiscord.env" npm start
  ```

- To inspect the user service:

  ```bash
  systemctl --user status ytdiscord.service
  journalctl --user -u ytdiscord.service -f
  ```

Windows desktop application:

- `npm run compile`
- Replace the existing `YTDPwin.exe` in `C:\Program Files\YouTubeDiscordPresence` with the newly compiled one.

- Building the `.msi`: Download **Visual Studio 2026** with the **Microsoft Visual Studio Installer Project** extension. Open `Host\YTDPsetup\YTDPsetup.vdproj` and build `YTDPsetup`.

Extension:

- Download the `Extension` directory and load the extension into your browser manually.
  - Chrome: add the local extension's ID to the `allowed_origins` array at `C:\Program Files\YouTubeDiscordPresence\main.json`.

---

## Miscellaneous

**DISCLAIMER:** this is not a bootleg copy of PreMiD. On a more technical note, it works similar to the Spotify rich presence—it only appears **when a video is playing** and **disappears when there is no video or the video is paused**. In addition, it only displays the presence for videos. Idling and searching are **not displayed**. Features such as exclusions, fully customizable details, and thumbnail coverage are **unique and original** to YouTubeDiscordPresence. YouTubeDiscordPresence has not referenced nor is affiliated with PreMiD in any way whatsoever.

---

## License

Licensed under the [MIT](https://github.com/XFG16/YouTubeDiscordPresence/blob/main/LICENSE.txt) license.
