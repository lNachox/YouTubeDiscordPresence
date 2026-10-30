"use strict";

const net = require("net");
const os = require("os");
const path = require("path");
const dbus = require("dbus-next");
const dotenv = require("dotenv");

dotenv.config({
    path: process.env.YTDP_ENV_FILE || path.join(__dirname, "..", ".env")
});

const YOUTUBE_APP_ID = process.env.YTDP_YOUTUBE_CLIENT_ID;
const YOUTUBE_MUSIC_APP_ID = process.env.YTDP_YOUTUBE_MUSIC_CLIENT_ID;
const DBUS_PROPERTIES_XML = `<!DOCTYPE node>
<node>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="GetAll">
      <arg direction="in" type="s"/>
      <arg direction="out" type="a{sv}"/>
    </method>
  </interface>
</node>`;

function log(message, error = null) {
    process.stderr.write(`[ytdiscord] ${message}${error ? `: ${error.message || error}` : ""}\n`);
}

function requiredEnvironment(name) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`falta la variable de entorno ${name}; consulta .env.example`);
    return value;
}

function valueOf(value, fallback = null) {
    return value && Object.prototype.hasOwnProperty.call(value, "value") ? value.value : (value ?? fallback);
}

function stringOf(value) {
    if (Array.isArray(value)) return value.find(item => typeof item === "string") || "";
    return typeof value === "string" ? value : "";
}

function youtubeUrl(value) {
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "https:") return "";
        return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(parsed.hostname) ? parsed.href : "";
    } catch (_) {
        return "";
    }
}

function socketCandidates() {
    const uid = typeof process.getuid === "function" ? process.getuid() : null;
    const runtime = process.env.XDG_RUNTIME_DIR || (uid === null ? null : `/run/user/${uid}`);
    if (process.env.DISCORD_IPC_PATH) return [process.env.DISCORD_IPC_PATH];
    const candidates = [
        ...(runtime ? Array.from({ length: 10 }, (_, i) => path.join(runtime, `discord-ipc-${i}`)) : []),
        ...(runtime ? Array.from({ length: 10 }, (_, i) => path.join(runtime, "app/com.discordapp.Discord", `discord-ipc-${i}`)) : []),
        ...Array.from({ length: 10 }, (_, i) => path.join(os.homedir(), ".var/app/com.discordapp.Discord/.config/discord", `discord-ipc-${i}`))
    ];
    return [...new Set(candidates)];
}

class DiscordRpc {
    constructor() {
        this.socket = null;
        this.buffer = Buffer.alloc(0);
        this.pending = new Map();
        this.sequence = 0;
        this.clientId = YOUTUBE_APP_ID;
        this.ready = null;
    }

    async connect() {
        if (this.socket && !this.socket.destroyed) return;
        let lastError;
        for (const socketPath of socketCandidates()) {
            try {
                await this.open(socketPath);
                log(`conectado a Discord mediante ${socketPath}`);
                return;
            } catch (error) {
                lastError = error;
            }
        }
        throw new Error(`no se encontró el socket IPC de Discord (${lastError?.message || "sin rutas disponibles"})`);
    }

    open(socketPath) {
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(socketPath);
            const fail = error => {
                socket.destroy();
                reject(error);
            };
            socket.once("connect", () => {
                this.socket = socket;
                socket.on("data", data => this.onData(data));
                socket.on("close", () => this.reset());
                socket.on("error", error => log("error del socket Discord", error));
                this.ready = new Promise((readyResolve, readyReject) => {
                    this.readyResolve = readyResolve;
                    this.readyReject = readyReject;
                });
                this.send(0, { v: 1, client_id: this.clientId })
                    .then(() => this.ready)
                    .then(resolve)
                    .catch(fail);
            });
            socket.once("error", fail);
        });
    }

    async send(opcode, payload) {
        if (!this.socket || this.socket.destroyed) throw new Error("Discord IPC no está conectado");
        const body = Buffer.from(JSON.stringify(payload));
        const packet = Buffer.alloc(8 + body.length);
        packet.writeUInt32LE(opcode, 0);
        packet.writeUInt32LE(body.length, 4);
        body.copy(packet, 8);
        await new Promise((resolve, reject) => this.socket.write(packet, error => error ? reject(error) : resolve()));
    }

    request(command, args) {
        const nonce = `${process.pid}-${++this.sequence}`;
        return new Promise((resolve, reject) => {
            this.pending.set(nonce, { resolve, reject });
            this.send(1, { cmd: command, args, nonce }).catch(error => {
                this.pending.delete(nonce);
                reject(error);
            });
        });
    }

    onData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        while (this.buffer.length >= 8) {
            const size = this.buffer.readUInt32LE(4);
            if (this.buffer.length < size + 8) return;
            const message = JSON.parse(this.buffer.subarray(8, size + 8).toString());
            this.buffer = this.buffer.subarray(size + 8);
            if (message.evt === "READY" && this.readyResolve) {
                this.readyResolve(message);
                this.readyResolve = null;
                this.readyReject = null;
            }
            if (message.nonce && this.pending.has(message.nonce)) {
                const request = this.pending.get(message.nonce);
                this.pending.delete(message.nonce);
                message.evt === "ERROR" ? request.reject(new Error(message.data?.message || "Discord RPC error")) : request.resolve(message);
            }
        }
    }

    reset() {
        if (this.readyReject) this.readyReject(new Error("Discord IPC desconectado"));
        this.ready = null;
        this.readyResolve = null;
        this.readyReject = null;
        for (const request of this.pending.values()) request.reject(new Error("Discord IPC desconectado"));
        this.pending.clear();
        this.socket = null;
    }

    async setActivity(activity, clientId = this.clientId) {
        if (clientId !== this.clientId) {
            this.clientId = clientId;
            if (this.socket) this.socket.destroy();
            this.reset();
        }
        await this.connect();
        await this.request("SET_ACTIVITY", { pid: process.pid, activity });
    }

    async clear() {
        if (this.socket && !this.socket.destroyed) await this.request("SET_ACTIVITY", { pid: process.pid, activity: null });
    }
}

class MprisMonitor {
    constructor(onActivity) {
        this.onActivity = onActivity;
        this.bus = null;
        this.timer = null;
    }

    async start() {
        this.bus = dbus.sessionBus();
        await new Promise((resolve, reject) => {
            this.bus.once("connect", resolve);
            this.bus.once("error", reject);
        });
        this.bus.on("error", error => log("error de la sesión DBus", error));
        await this.refresh();
        this.timer = setInterval(() => this.refresh().catch(error => log("no se pudo actualizar MPRIS", error)), 3000);
        log("monitor MPRIS activo");
    }

    isCandidate(name) {
        return /^org\.mpris\.MediaPlayer2\./.test(name) && /firefox|chrome|chromium|brave|youtube.?music|ytmd/i.test(name);
    }

    async refresh() {
        const object = await this.bus.getProxyObject("org.freedesktop.DBus", "/org/freedesktop/DBus");
        const names = await object.getInterface("org.freedesktop.DBus").ListNames();
        const activities = [];
        for (const name of names.filter(item => this.isCandidate(item))) {
            try {
                const activity = await this.readPlayer(name);
                if (activity) activities.push(activity);
            } catch (error) {
                log(`no se pudo leer el reproductor MPRIS ${name}`, error);
            }
        }
        await this.onActivity(activities.find(item => item.playbackStatus === "Playing") || null);
    }

    async readPlayer(name) {
        // Chromium-based browsers sometimes implement MPRIS correctly but
        // return an empty introspection document.
        const object = await this.bus.getProxyObject(name, "/org/mpris/MediaPlayer2", DBUS_PROPERTIES_XML);
        const properties = object.getInterface("org.freedesktop.DBus.Properties");
        const values = await properties.GetAll("org.mpris.MediaPlayer2.Player");
        const metadata = valueOf(values.Metadata, {});
        const url = stringOf(valueOf(metadata["xesam:url"], ""));
        const artUrl = stringOf(valueOf(metadata["mpris:artUrl"], ""));
        const identity = String(valueOf(values.Identity, name));
        const title = stringOf(valueOf(metadata["xesam:title"], ""));
        const artist = stringOf(valueOf(metadata["xesam:artist"], ""));
        const status = String(valueOf(values.PlaybackStatus, "Stopped"));
        const youtubeApp = /youtube.?music|ytmd|ytmdesktop|app\.ytmdesktop/i.test(`${name} ${identity} ${artUrl}`);
        const browserPlayer = /firefox|chrome|chromium|brave/i.test(`${name} ${identity}`);
        let hostname = "";
        try { hostname = new URL(url).hostname; } catch (_) { /* Some players omit xesam:url. */ }
        const safeUrl = youtubeUrl(url);
        const isYouTube = Boolean(safeUrl);
        // Chromium-based browsers frequently omit xesam:url. In that case,
        // an active browser MPRIS session is the only available media source.
        if (!title || (!isYouTube && !youtubeApp && !(browserPlayer && status === "Playing"))) return null;
        const length = Number(valueOf(metadata["mpris:length"], 0)) / 1000000;
        const position = Number(valueOf(values.Position, 0)) / 1000000;
        return { title: title.substring(0, 128), artist: artist.substring(0, 128), url: safeUrl, status, playbackStatus: status, music: youtubeApp || /music\.youtube\.com/i.test(hostname), length, position };
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
        if (this.bus) this.bus.disconnect();
    }
}

function makeActivity(media) {
    const activity = {
        type: media.music ? 2 : 3,
        details: media.title,
        state: media.artist || (media.music ? "YouTube Music" : "YouTube"),
        assets: { large_image: media.music ? "youtube-music" : "youtube3", large_text: media.title }
    };
    if (media.length > 0) {
        const start = Date.now() - Math.max(0, media.position) * 1000;
        activity.timestamps = { start, end: start + media.length * 1000 };
    }
    if (media.music) activity.status_display_type = 2;
    if (media.url) activity.buttons = [{ label: media.music ? "Listen Along" : "Watch Video", url: media.url }];
    return activity;
}

async function main() {
    requiredEnvironment("YTDP_YOUTUBE_CLIENT_ID");
    requiredEnvironment("YTDP_YOUTUBE_MUSIC_CLIENT_ID");
    const rpc = new DiscordRpc();
    let active = false;
    let lastActivityKey = "";
    const monitor = new MprisMonitor(async media => {
        try {
            if (!media) {
                if (active) await rpc.clear();
                active = false;
                lastActivityKey = "";
                return;
            }
            const clientId = media.music ? YOUTUBE_MUSIC_APP_ID : YOUTUBE_APP_ID;
            const activityKey = `${clientId}:${media.title}:${media.artist}`;
            if (activityKey !== lastActivityKey) {
                log(`actividad detectada: ${media.music ? "YouTube Music" : "YouTube"} - ${media.title} - ${media.artist || "sin artista"}`);
                lastActivityKey = activityKey;
            }
            await rpc.setActivity(makeActivity(media), clientId);
            active = true;
        } catch (error) {
            active = false;
            log("no se pudo actualizar Discord; se reintentará", error);
        }
    });
    await monitor.start();
    const shutdown = async () => {
        monitor.stop();
        try { await rpc.clear(); } catch (_) { /* Discord puede haberse cerrado. */ }
        process.exit(0);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
}

main().catch(error => {
    log("error fatal", error);
    process.exitCode = 1;
});
