import { app as F, BrowserWindow as _, ipcMain as u, dialog as S } from "electron";
import p from "path";
import { fileURLToPath as N } from "url";
import { createRequire as V } from "module";
import l from "fs";
import y from "fluent-ffmpeg";
import W from "ffmpeg-static";
import I from "ffprobe-static";
import C from "os";
const U = V(import.meta.url), z = N(import.meta.url), T = p.dirname(z);
try {
  U("electron-squirrel-startup") && F.quit();
} catch {
}
let f = null;
const D = () => {
  f = new _({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: p.join(T, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !1,
      webSecurity: !1
    },
    autoHideMenuBar: !0,
    backgroundColor: "#050506",
    title: "Audiobook Toolkit",
    frame: !1,
    // Frameless for custom titlebar
    minWidth: 900,
    minHeight: 600
  }), process.env.VITE_DEV_SERVER_URL ? (f.loadURL(process.env.VITE_DEV_SERVER_URL), f.webContents.openDevTools()) : f.loadFile(p.join(T, "../dist/index.html"));
};
F.on("ready", D);
F.on("window-all-closed", () => {
  process.platform !== "darwin" && F.quit();
});
F.on("activate", () => {
  _.getAllWindows().length === 0 && D();
});
u.on("window:minimize", () => f?.minimize());
u.on("window:maximize", () => {
  f?.isMaximized() ? f.unmaximize() : f?.maximize();
});
u.on("window:close", () => f?.close());
y.setFfmpegPath(W);
y.setFfprobePath(I.path);
u.handle("audio:read-metadata", async (a, t) => new Promise((o, r) => {
  y.ffprobe(t, (n, s) => {
    if (n) {
      console.error("Error reading metadata:", n), r(n);
      return;
    }
    const e = s.format, i = e.tags || {};
    o({
      path: t,
      duration: e.duration || 0,
      title: i.title || p.basename(t),
      artist: i.artist || "Unknown Artist",
      album: i.album || "Unknown Album"
    });
  });
}));
u.handle("dialog:open-files", async () => (await S.showOpenDialog({
  title: "Select Audio Files",
  properties: ["openFile", "multiSelections"],
  filters: [
    { name: "Audio Files", extensions: ["mp3", "m4a", "m4b", "aac", "wav", "flac", "ogg"] }
  ]
})).filePaths);
u.handle("audio:show-save-dialog", async () => (await S.showSaveDialog({
  title: "Save Audiobook",
  defaultPath: "audiobook.m4b",
  filters: [
    { name: "M4B Audiobook", extensions: ["m4b"] },
    { name: "AAC Audio", extensions: ["aac"] },
    { name: "MP3 Audio", extensions: ["mp3"] }
  ]
})).filePath);
u.handle("project:save", async (a, t) => {
  const o = await S.showSaveDialog({
    title: "Save Project",
    defaultPath: "audiobook-project.adbp",
    filters: [
      { name: "ADB Binder Project", extensions: ["adbp"] },
      { name: "JSON Files", extensions: ["json"] }
    ]
  });
  if (!o.filePath)
    return { success: !1, cancelled: !0 };
  try {
    return l.writeFileSync(o.filePath, JSON.stringify(t, null, 2), "utf8"), console.log("[PROJECT] Saved to:", o.filePath), { success: !0, filePath: o.filePath };
  } catch (r) {
    return console.error("[PROJECT] Save error:", r), { success: !1, error: r.message };
  }
});
u.handle("project:load", async () => {
  const a = await S.showOpenDialog({
    title: "Open Project",
    properties: ["openFile"],
    filters: [
      { name: "ADB Binder Project", extensions: ["adbp", "json"] }
    ]
  });
  if (!a.filePaths || a.filePaths.length === 0)
    return { success: !1, cancelled: !0 };
  try {
    const t = a.filePaths[0], o = l.readFileSync(t, "utf8"), r = JSON.parse(o);
    return console.log("[PROJECT] Loaded from:", t), { success: !0, data: r, filePath: t };
  } catch (t) {
    return console.error("[PROJECT] Load error:", t), { success: !1, error: t.message };
  }
});
u.handle("audio:detect-artwork", async (a, t) => {
  if (!t || t.length === 0)
    return { found: !1 };
  console.log("[ARTWORK] Scanning for artwork from", t.length, "files");
  const o = t[0], r = p.dirname(o), n = [
    "cover.jpg",
    "cover.jpeg",
    "cover.png",
    "folder.jpg",
    "folder.jpeg",
    "folder.png",
    "album.jpg",
    "album.jpeg",
    "album.png",
    "front.jpg",
    "front.jpeg",
    "front.png",
    "artwork.jpg",
    "artwork.jpeg",
    "artwork.png"
  ];
  for (const s of n) {
    const e = p.join(r, s);
    if (l.existsSync(e)) {
      console.log("[ARTWORK] Found cover file:", e);
      try {
        const h = l.readFileSync(e).toString("base64");
        return {
          found: !0,
          source: "folder",
          data: `data:${p.extname(e).toLowerCase().slice(1) === "png" ? "image/png" : "image/jpeg"};base64,${h}`
        };
      } catch (i) {
        console.error("[ARTWORK] Error reading cover file:", i);
      }
    }
  }
  for (const s of t)
    try {
      const e = p.join(C.tmpdir(), `cover_${Date.now()}.jpg`);
      if (await new Promise((i, h) => {
        y(s).outputOptions(["-an", "-vcodec", "copy"]).output(e).on("end", () => i()).on("error", (m) => {
          i();
        }).run();
      }), l.existsSync(e)) {
        if (l.statSync(e).size > 0) {
          console.log("[ARTWORK] Extracted embedded artwork from:", s);
          const m = l.readFileSync(e).toString("base64");
          return l.unlinkSync(e), {
            found: !0,
            source: "embedded",
            data: `data:image/jpeg;base64,${m}`
          };
        }
        l.unlinkSync(e);
      }
    } catch {
    }
  return console.log("[ARTWORK] No artwork found"), { found: !1 };
});
u.handle("audio:process", async (a, t) => {
  const { files: o, bitrate: r, outputFormat: n, coverPath: s, bookMetadata: e } = t;
  if (!o || o.length === 0)
    throw new Error("No files to process");
  console.log("[MERGE] Starting merge with", o.length, "files"), o.forEach((E, P) => console.log(`[MERGE] File ${P}:`, E.path, "duration:", E.duration));
  const i = n === "mp3" ? "mp3" : n === "aac" ? "m4a" : "m4b", h = await S.showSaveDialog({
    title: "Save Audiobook",
    defaultPath: `audiobook.${i}`,
    filters: [
      { name: "M4B Audiobook", extensions: ["m4b"] },
      { name: "MP3 Audio", extensions: ["mp3"] },
      { name: "AAC Audio", extensions: ["m4a"] }
    ]
  });
  if (!h.filePath)
    return { success: !1, cancelled: !0 };
  const m = h.filePath;
  console.log("[MERGE] Output path:", m);
  const g = C.tmpdir(), v = p.join(g, `metadata_${Date.now()}.txt`);
  let b = `;FFMETADATA1
`, A = 0;
  const j = n === "mp3" || m.endsWith(".mp3");
  return j || o.forEach((E, P) => {
    const k = Math.floor(A * 1e3), $ = Math.floor((A + E.duration) * 1e3);
    b += `[CHAPTER]
`, b += `TIMEBASE=1/1000
`, b += `START=${k}
`, b += `END=${$}
`, b += `title=${E.title || `Chapter ${P + 1}`}
`, A += E.duration;
  }), l.writeFileSync(v, b, "utf8"), console.log("[MERGE] Metadata written to:", v), new Promise((E, P) => {
    const k = j ? "libmp3lame" : "aac", M = `${o.map((c, R) => `[${R}:a]`).join("")}concat=n=${o.length}:v=0:a=1[outa]`;
    console.log("[MERGE] Filter complex:", M), console.log("[MERGE] Using codec:", k, "bitrate:", r || "128k");
    let w = y();
    o.forEach((c) => {
      w = w.input(c.path);
    });
    const O = o.length;
    w = w.input(v);
    let x = -1;
    s && l.existsSync(s) && !j && (x = O + 1, w = w.input(s), console.log("[MERGE] Cover image added at input", x, ":", s));
    const d = [
      "-filter_complex",
      M,
      "-map",
      "[outa]",
      "-c:a",
      k,
      "-b:a",
      r || "128k"
    ];
    x >= 0 && (d.push("-map", `${x}:v`), d.push("-c:v", "mjpeg"), d.push("-disposition:v", "attached_pic")), j || (d.push("-map_metadata", String(O)), e && (e.title && d.push("-metadata", `title=${e.title}`), e.author && d.push("-metadata", `artist=${e.author}`), e.author && d.push("-metadata", `album_artist=${e.author}`), e.genre && d.push("-metadata", `genre=${e.genre}`), e.year && d.push("-metadata", `date=${e.year}`), e.narrator && d.push("-metadata", `composer=${e.narrator}`))), w.outputOptions(d).output(m).on("start", (c) => {
      console.log("[MERGE] FFmpeg command:", c);
    }).on("stderr", (c) => {
      (c.includes("Error") || c.includes("error") || c.includes("Opening") || c.includes("Output")) && console.log("[MERGE] FFmpeg:", c);
    }).on("progress", (c) => {
      const R = c.percent || 0;
      R > 0 && console.log("[MERGE] Progress:", R.toFixed(1) + "%"), f && f.webContents.send("audio:progress", {
        percent: R,
        timemark: c.timemark
      });
    }).on("end", () => {
      console.log("[MERGE] FFmpeg completed successfully!"), console.log("[MERGE] Output file:", m);
      try {
        l.unlinkSync(v);
      } catch {
      }
      E({ success: !0, outputPath: m });
    }).on("error", (c, R, G) => {
      console.error("[MERGE] FFmpeg error:", c.message), console.error("[MERGE] FFmpeg stderr:", G);
      try {
        l.unlinkSync(v);
      } catch {
      }
      P(c);
    }), w.run();
  });
});
async function B(a, t, o = "128k", r) {
  try {
    if (!l.existsSync(a))
      throw new Error(`Input file not found: ${a}`);
    const n = p.parse(a), s = p.join(n.dir, `${n.name}.${t}`);
    let e, i;
    switch (t) {
      case "m4b":
        e = "aac", i = "ipod";
        break;
      case "m4a":
        e = "aac", i = "mp4";
        break;
      case "mp3":
        e = "libmp3lame", i = "mp3";
        break;
      case "aac":
        e = "aac", i = "adts";
        break;
      default:
        throw new Error(`Unsupported format: ${t}`);
    }
    return console.log(`[CONVERT] ${a} -> ${s} (${e})`), new Promise((h, m) => {
      y(a).audioCodec(e).audioBitrate(o).format(i).outputOptions(["-map_metadata", "0"]).on("start", (g) => {
        console.log("[CONVERT] FFmpeg command:", g);
      }).on("progress", (g) => {
        r && r(g.percent || 0, g.timemark);
      }).on("end", () => {
        console.log("[CONVERT] Conversion complete:", s), h({ success: !0, inputPath: a, outputPath: s });
      }).on("error", (g) => {
        console.error("[CONVERT] FFmpeg error:", g.message), m({ success: !1, inputPath: a, error: g.message });
      }).save(s);
    });
  } catch (n) {
    return console.error("[CONVERT] Error:", n), {
      success: !1,
      inputPath: a,
      error: n.message
    };
  }
}
u.handle("audio:convert", async (a, t) => {
  const { inputPath: o, outputFormat: r, bitrate: n } = t;
  return B(o, r, n, (s, e) => {
    a.sender && !a.sender.isDestroyed() && a.sender.send("audio:convertProgress", {
      inputPath: o,
      percent: s,
      currentTime: e
    });
  });
});
u.handle("audio:batchConvert", async (a, t) => {
  const o = [];
  for (const r of t) {
    const n = await B(r.inputPath, r.outputFormat, r.bitrate);
    o.push(n);
  }
  return o;
});
