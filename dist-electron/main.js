import { app as y, BrowserWindow as N, ipcMain as l, dialog as R } from "electron";
import u from "path";
import { fileURLToPath as L } from "url";
import { createRequire as U } from "module";
import i from "fs";
import v from "fluent-ffmpeg";
import z from "ffmpeg-static";
import q from "ffprobe-static";
import I from "os";
const K = U(import.meta.url), H = L(import.meta.url), D = u.dirname(H);
try {
  K("electron-squirrel-startup") && y.quit();
} catch {
}
let f = null;
const G = () => {
  const t = !!process.env.VITE_DEV_SERVER_URL;
  t && (process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true"), f = new N({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: u.join(D, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !1,
      webSecurity: !t
      // Enable in production, disable in dev for CORS
    },
    autoHideMenuBar: !0,
    backgroundColor: "#050506",
    title: "Audiobook Toolkit",
    frame: !1,
    // Frameless for custom titlebar
    minWidth: 900,
    minHeight: 600
  }), process.env.VITE_DEV_SERVER_URL ? (f.loadURL(process.env.VITE_DEV_SERVER_URL), f.webContents.openDevTools()) : f.loadFile(u.join(D, "../dist/index.html"));
};
y.on("ready", G);
y.on("window-all-closed", () => {
  process.platform !== "darwin" && y.quit();
});
y.on("activate", () => {
  N.getAllWindows().length === 0 && G();
});
l.on("window:minimize", () => f?.minimize());
l.on("window:maximize", () => {
  f?.isMaximized() ? f.unmaximize() : f?.maximize();
});
l.on("window:close", () => f?.close());
v.setFfmpegPath(z);
v.setFfprobePath(q.path);
l.handle("audio:read-metadata", async (t, r) => new Promise((e, n) => {
  v.ffprobe(r, (a, s) => {
    if (a) {
      console.error("Error reading metadata:", a), n(a);
      return;
    }
    const o = s.format, c = o.tags || {};
    e({
      path: r,
      duration: o.duration || 0,
      title: c.title || u.basename(r),
      artist: c.artist || "Unknown Artist",
      album: c.album || "Unknown Album"
    });
  });
}));
l.handle("dialog:open-files", async () => (await R.showOpenDialog({
  title: "Select Audio Files",
  properties: ["openFile", "multiSelections"],
  filters: [
    { name: "Audio Files", extensions: ["mp3", "m4a", "m4b", "aac", "wav", "flac", "ogg"] }
  ]
})).filePaths);
l.handle("audio:show-save-dialog", async () => (await R.showSaveDialog({
  title: "Save Audiobook",
  defaultPath: "audiobook.m4b",
  filters: [
    { name: "M4B Audiobook", extensions: ["m4b"] },
    { name: "AAC Audio", extensions: ["aac"] },
    { name: "MP3 Audio", extensions: ["mp3"] }
  ]
})).filePath);
l.handle("project:save", async (t, r) => {
  const e = await R.showSaveDialog({
    title: "Save Project",
    defaultPath: "audiobook-project.adbp",
    filters: [
      { name: "Audiobook Toolkit Project", extensions: ["adbp"] },
      { name: "JSON Files", extensions: ["json"] }
    ]
  });
  if (!e.filePath)
    return { success: !1, cancelled: !0 };
  try {
    return i.writeFileSync(e.filePath, JSON.stringify(r, null, 2), "utf8"), console.log("[PROJECT] Saved to:", e.filePath), { success: !0, filePath: e.filePath };
  } catch (n) {
    return console.error("[PROJECT] Save error:", n), { success: !1, error: n.message };
  }
});
l.handle("project:load", async (t, r) => {
  let e = r;
  if (!e) {
    const n = await R.showOpenDialog({
      title: "Open Project",
      properties: ["openFile"],
      filters: [
        { name: "Audiobook Toolkit Project", extensions: ["adbp", "json"] }
      ]
    });
    if (!n.filePaths || n.filePaths.length === 0)
      return { success: !1, cancelled: !0 };
    e = n.filePaths[0];
  }
  try {
    const n = i.readFileSync(e, "utf8"), a = JSON.parse(n);
    return console.log("[PROJECT] Loaded from:", e), { success: !0, data: a, filePath: e };
  } catch (n) {
    return console.error("[PROJECT] Load error:", n), { success: !1, error: n.message };
  }
});
l.handle("audio:detect-artwork", async (t, r) => {
  if (!r || r.length === 0)
    return { found: !1 };
  console.log("[ARTWORK] Scanning for artwork from", r.length, "files");
  const e = r[0], n = u.dirname(e), a = [
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
  for (const s of a) {
    const o = u.join(n, s);
    if (i.existsSync(o)) {
      console.log("[ARTWORK] Found cover file:", o);
      try {
        const g = i.readFileSync(o).toString("base64");
        return {
          found: !0,
          source: "folder",
          data: `data:${u.extname(o).toLowerCase().slice(1) === "png" ? "image/png" : "image/jpeg"};base64,${g}`
        };
      } catch (c) {
        console.error("[ARTWORK] Error reading cover file:", c);
      }
    }
  }
  for (const s of r)
    try {
      const o = u.join(I.tmpdir(), `cover_${Date.now()}.jpg`);
      if (await new Promise((c, g) => {
        v(s).outputOptions(["-an", "-vcodec", "copy"]).output(o).on("end", () => c()).on("error", (h) => {
          c();
        }).run();
      }), i.existsSync(o)) {
        if (i.statSync(o).size > 0) {
          console.log("[ARTWORK] Extracted embedded artwork from:", s);
          const h = i.readFileSync(o).toString("base64");
          return i.unlinkSync(o), {
            found: !0,
            source: "embedded",
            data: `data:image/jpeg;base64,${h}`
          };
        }
        i.unlinkSync(o);
      }
    } catch {
    }
  return console.log("[ARTWORK] No artwork found"), { found: !1 };
});
l.handle("audio:process", async (t, r) => {
  const { files: e, bitrate: n, outputFormat: a, coverPath: s, bookMetadata: o, defaultOutputDirectory: c } = r;
  if (!e || e.length === 0)
    throw new Error("No files to process");
  console.log("[MERGE] Starting merge with", e.length, "files"), e.forEach((E, k) => console.log(`[MERGE] File ${k}:`, E.path, "duration:", E.duration));
  let h = `audiobook.${a === "mp3" ? "mp3" : a === "aac" ? "m4a" : "m4b"}`;
  c && (h = u.join(c, h));
  const F = await R.showSaveDialog({
    title: "Save Audiobook",
    defaultPath: h,
    filters: [
      { name: "M4B Audiobook", extensions: ["m4b"] },
      { name: "MP3 Audio", extensions: ["mp3"] },
      { name: "AAC Audio", extensions: ["m4a"] }
    ]
  });
  if (!F.filePath)
    return { success: !1, cancelled: !0 };
  const m = F.filePath;
  console.log("[MERGE] Output path:", m);
  const J = I.tmpdir(), j = u.join(J, `metadata_${Date.now()}.txt`);
  let S = `;FFMETADATA1
`, x = 0;
  const T = a === "mp3" || m.endsWith(".mp3");
  return T || e.forEach((E, k) => {
    const P = Math.floor(x * 1e3), $ = Math.floor((x + E.duration) * 1e3);
    S += `[CHAPTER]
`, S += `TIMEBASE=1/1000
`, S += `START=${P}
`, S += `END=${$}
`, S += `title=${E.title || `Chapter ${k + 1}`}
`, x += E.duration;
  }), i.writeFileSync(j, S, "utf8"), console.log("[MERGE] Metadata written to:", j), new Promise((E, k) => {
    const P = T ? "libmp3lame" : "aac", C = `${e.map((d, b) => `[${b}:a]`).join("")}concat=n=${e.length}:v=0:a=1[outa]`;
    console.log("[MERGE] Filter complex:", C), console.log("[MERGE] Using codec:", P, "bitrate:", n || "128k");
    let w = v();
    e.forEach((d) => {
      w = w.input(d.path);
    });
    const M = e.length;
    w = w.input(j);
    let O = -1;
    s && i.existsSync(s) && !T && (O = M + 1, w = w.input(s), console.log("[MERGE] Cover image added at input", O, ":", s));
    const p = [
      "-filter_complex",
      C,
      "-map",
      "[outa]",
      "-c:a",
      P,
      "-b:a",
      n || "128k"
    ];
    O >= 0 && (p.push("-map", `${O}:v`), p.push("-c:v", "mjpeg"), p.push("-disposition:v", "attached_pic")), T || (p.push("-map_metadata", String(M)), o && (o.title && p.push("-metadata", `title=${o.title}`), o.author && p.push("-metadata", `artist=${o.author}`), o.author && p.push("-metadata", `album_artist=${o.author}`), o.genre && p.push("-metadata", `genre=${o.genre}`), o.year && p.push("-metadata", `date=${o.year}`), o.narrator && p.push("-metadata", `composer=${o.narrator}`))), w.outputOptions(p).output(m).on("start", (d) => {
      console.log("[MERGE] FFmpeg command:", d);
    }).on("stderr", (d) => {
      (d.includes("Error") || d.includes("error") || d.includes("Opening") || d.includes("Output")) && console.log("[MERGE] FFmpeg:", d);
    }).on("progress", (d) => {
      const b = d.percent || 0;
      b > 0 && console.log("[MERGE] Progress:", b.toFixed(1) + "%"), f && f.webContents.send("audio:progress", {
        percent: b,
        timemark: d.timemark
      });
    }).on("end", () => {
      console.log("[MERGE] FFmpeg completed successfully!"), console.log("[MERGE] Output file:", m);
      try {
        i.unlinkSync(j);
      } catch {
      }
      E({ success: !0, outputPath: m });
    }).on("error", (d, b, W) => {
      console.error("[MERGE] FFmpeg error:", d.message), console.error("[MERGE] FFmpeg stderr:", W);
      try {
        i.unlinkSync(j);
      } catch {
      }
      k(d);
    }), w.run();
  });
});
const A = u.join(y.getPath("userData"), "settings.json");
l.handle("settings:read", async () => {
  try {
    if (i.existsSync(A)) {
      const t = i.readFileSync(A, "utf8");
      return JSON.parse(t);
    }
  } catch (t) {
    console.error("[SETTINGS] Failed to read settings:", t);
  }
  return {};
});
l.handle("settings:write", async (t, r) => {
  try {
    return i.writeFileSync(A, JSON.stringify(r, null, 2), "utf8"), { success: !0 };
  } catch (e) {
    return console.error("[SETTINGS] Failed to write settings:", e), { success: !1, error: e.message };
  }
});
l.handle("settings:select-directory", async () => {
  const t = await R.showOpenDialog({
    title: "Select Default Output Directory",
    properties: ["openDirectory", "createDirectory"]
  });
  return !t.canceled && t.filePaths.length > 0 ? t.filePaths[0] : null;
});
const _ = u.join(y.getPath("userData"), "recent_projects.json"), V = () => {
  try {
    if (i.existsSync(_))
      return JSON.parse(i.readFileSync(_, "utf8"));
  } catch (t) {
    console.error("[RECENT] Failed to read recent projects:", t);
  }
  return [];
};
l.handle("recent:read", async () => V());
l.handle("recent:add", async (t, r) => {
  try {
    const e = V(), n = u.basename(r, u.extname(r)), a = e.filter((o) => o.path !== r);
    a.unshift({ path: r, name: n, lastOpened: Date.now() });
    const s = a.slice(0, 10);
    return i.writeFileSync(_, JSON.stringify(s, null, 2)), s;
  } catch (e) {
    return console.error("[RECENT] Failed to add recent project:", e), [];
  }
});
l.handle("recent:clear", async () => {
  try {
    return i.writeFileSync(_, "[]"), [];
  } catch (t) {
    return console.error("[RECENT] Failed to clear recent projects:", t), [];
  }
});
async function B(t, r, e = "128k", n) {
  try {
    if (!i.existsSync(t))
      throw new Error(`Input file not found: ${t}`);
    const a = u.parse(t);
    let s = u.join(a.dir, `${a.name}.${r}`);
    t === s && (s = u.join(a.dir, `${a.name}_converted.${r}`)), ["64k", "96k", "128k", "192k", "256k", "320k"].includes(e) || (console.warn(`[CONVERT] Invalid bitrate '${e}', defaulting to 128k`), e = "128k");
    let c, g;
    switch (r) {
      case "m4b":
        c = "aac", g = "ipod";
        break;
      case "m4a":
        c = "aac", g = "mp4";
        break;
      case "mp3":
        c = "libmp3lame", g = "mp3";
        break;
      case "aac":
        c = "aac", g = "adts";
        break;
      default:
        throw new Error(`Unsupported format: ${r}`);
    }
    return console.log(`[CONVERT] ${t} -> ${s} (${c})`), new Promise((h, F) => {
      v(t).audioCodec(c).audioBitrate(e).format(g).outputOptions(["-map_metadata", "0"]).on("start", (m) => {
        console.log("[CONVERT] FFmpeg command:", m);
      }).on("progress", (m) => {
        n && n(m.percent || 0, m.timemark);
      }).on("end", () => {
        console.log("[CONVERT] Conversion complete:", s), h({ success: !0, inputPath: t, outputPath: s });
      }).on("error", (m) => {
        console.error("[CONVERT] FFmpeg error:", m.message), F({ success: !1, inputPath: t, error: m.message });
      }).save(s);
    });
  } catch (a) {
    return console.error("[CONVERT] Error:", a), {
      success: !1,
      inputPath: t,
      error: a.message
    };
  }
}
l.handle("audio:convert", async (t, r) => {
  const { inputPath: e, outputFormat: n, bitrate: a } = r;
  return B(e, n, a, (s, o) => {
    t.sender && !t.sender.isDestroyed() && t.sender.send("audio:convertProgress", {
      inputPath: e,
      percent: s,
      currentTime: o
    });
  });
});
l.handle("audio:batchConvert", async (t, r) => {
  const e = [];
  for (const n of r) {
    const a = await B(n.inputPath, n.outputFormat, n.bitrate);
    e.push(a);
  }
  return e;
});
