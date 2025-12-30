import { app as _, BrowserWindow as I, ipcMain as p, dialog as T } from "electron";
import m from "path";
import { fileURLToPath as z } from "url";
import { createRequire as q } from "module";
import d from "fs";
import F from "fluent-ffmpeg";
import K from "ffmpeg-static";
import G from "ffprobe-static";
import L from "os";
const B = q(import.meta.url), H = z(import.meta.url), M = m.dirname(H);
try {
  B("electron-squirrel-startup") && _.quit();
} catch {
}
let g = null;
const V = () => {
  const r = !!process.env.VITE_DEV_SERVER_URL;
  r && (process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true"), g = new I({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: m.join(M, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !1,
      webSecurity: !r
      // Enable in production, disable in dev for CORS
    },
    autoHideMenuBar: !0,
    backgroundColor: "#050506",
    title: "Audiobook Toolkit",
    frame: !1,
    // Frameless for custom titlebar
    minWidth: 900,
    minHeight: 600
  }), process.env.VITE_DEV_SERVER_URL ? (g.loadURL(process.env.VITE_DEV_SERVER_URL), g.webContents.openDevTools()) : g.loadFile(m.join(M, "../dist/index.html"));
};
_.on("ready", V);
_.on("window-all-closed", () => {
  process.platform !== "darwin" && _.quit();
});
_.on("activate", () => {
  I.getAllWindows().length === 0 && V();
});
p.on("window:minimize", () => g?.minimize());
p.on("window:maximize", () => {
  g?.isMaximized() ? g.unmaximize() : g?.maximize();
});
p.on("window:close", () => g?.close());
F.setFfmpegPath(K);
F.setFfprobePath(G.path);
p.handle("audio:read-metadata", async (r, n) => new Promise((e, s) => {
  F.ffprobe(n, (i, l) => {
    if (i) {
      console.error("Error reading metadata:", i), s(i);
      return;
    }
    const t = l.format, c = t.tags || {};
    e({
      path: n,
      duration: t.duration || 0,
      title: c.title || m.basename(n),
      artist: c.artist || "Unknown Artist",
      album: c.album || "Unknown Album"
    });
  });
}));
p.handle("dialog:open-files", async () => (await T.showOpenDialog({
  title: "Select Audio Files",
  properties: ["openFile", "multiSelections"],
  filters: [
    { name: "Audio Files", extensions: ["mp3", "m4a", "m4b", "aac", "wav", "flac", "ogg"] }
  ]
})).filePaths);
p.handle("audio:show-save-dialog", async () => (await T.showSaveDialog({
  title: "Save Audiobook",
  defaultPath: "audiobook.m4b",
  filters: [
    { name: "M4B Audiobook", extensions: ["m4b"] },
    { name: "AAC Audio", extensions: ["aac"] },
    { name: "MP3 Audio", extensions: ["mp3"] }
  ]
})).filePath);
p.handle("project:save", async (r, n) => {
  const e = await T.showSaveDialog({
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
    return d.writeFileSync(e.filePath, JSON.stringify(n, null, 2), "utf8"), console.log("[PROJECT] Saved to:", e.filePath), { success: !0, filePath: e.filePath };
  } catch (s) {
    return console.error("[PROJECT] Save error:", s), { success: !1, error: s.message };
  }
});
p.handle("project:load", async (r, n) => {
  let e = n;
  if (!e) {
    const s = await T.showOpenDialog({
      title: "Open Project",
      properties: ["openFile"],
      filters: [
        { name: "Audiobook Toolkit Project", extensions: ["adbp", "json"] }
      ]
    });
    if (!s.filePaths || s.filePaths.length === 0)
      return { success: !1, cancelled: !0 };
    e = s.filePaths[0];
  }
  try {
    const s = d.readFileSync(e, "utf8"), i = JSON.parse(s);
    return console.log("[PROJECT] Loaded from:", e), { success: !0, data: i, filePath: e };
  } catch (s) {
    return console.error("[PROJECT] Load error:", s), { success: !1, error: s.message };
  }
});
p.handle("audio:detect-artwork", async (r, n) => {
  if (!n || n.length === 0)
    return { found: !1 };
  console.log("[ARTWORK] Scanning for artwork from", n.length, "files");
  const e = n[0], s = m.dirname(e), i = [
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
  for (const l of i) {
    const t = m.join(s, l);
    if (d.existsSync(t)) {
      console.log("[ARTWORK] Found cover file:", t);
      try {
        const a = d.readFileSync(t).toString("base64");
        return {
          found: !0,
          source: "folder",
          data: `data:${m.extname(t).toLowerCase().slice(1) === "png" ? "image/png" : "image/jpeg"};base64,${a}`
        };
      } catch (c) {
        console.error("[ARTWORK] Error reading cover file:", c);
      }
    }
  }
  for (const l of n)
    try {
      const t = m.join(L.tmpdir(), `cover_${Date.now()}.jpg`);
      if (await new Promise((c, a) => {
        F(l).outputOptions(["-an", "-vcodec", "copy"]).output(t).on("end", () => c()).on("error", (o) => {
          c();
        }).run();
      }), d.existsSync(t)) {
        if (d.statSync(t).size > 0) {
          console.log("[ARTWORK] Extracted embedded artwork from:", l);
          const o = d.readFileSync(t).toString("base64");
          return d.unlinkSync(t), {
            found: !0,
            source: "embedded",
            data: `data:image/jpeg;base64,${o}`
          };
        }
        d.unlinkSync(t);
      }
    } catch {
    }
  return console.log("[ARTWORK] No artwork found"), { found: !1 };
});
p.handle("audio:process", async (r, n) => {
  const { files: e, bitrate: s, outputFormat: i, coverPath: l, bookMetadata: t, defaultOutputDirectory: c } = n;
  if (!e || e.length === 0)
    throw new Error("No files to process");
  console.log("[MERGE] Starting merge with", e.length, "files"), e.forEach((b, k) => console.log(`[MERGE] File ${k}:`, b.path, "duration:", b.duration));
  let o = `audiobook.${i === "mp3" ? "mp3" : i === "aac" ? "m4a" : "m4b"}`;
  c && (o = m.join(c, o));
  const f = await T.showSaveDialog({
    title: "Save Audiobook",
    defaultPath: o,
    filters: [
      { name: "M4B Audiobook", extensions: ["m4b"] },
      { name: "MP3 Audio", extensions: ["mp3"] },
      { name: "AAC Audio", extensions: ["m4a"] }
    ]
  });
  if (!f.filePath)
    return { success: !1, cancelled: !0 };
  const u = f.filePath;
  console.log("[MERGE] Output path:", u);
  const w = L.tmpdir(), S = m.join(w, `metadata_${Date.now()}.txt`);
  let E = `;FFMETADATA1
`, P = 0;
  const $ = i === "mp3" || u.endsWith(".mp3");
  return $ || e.forEach((b, k) => {
    const j = Math.floor(P * 1e3), D = Math.floor((P + b.duration) * 1e3);
    E += `[CHAPTER]
`, E += `TIMEBASE=1/1000
`, E += `START=${j}
`, E += `END=${D}
`, E += `title=${b.title || `Chapter ${k + 1}`}
`, P += b.duration;
  }), d.writeFileSync(S, E, "utf8"), console.log("[MERGE] Metadata written to:", S), new Promise((b, k) => {
    const j = $ ? "libmp3lame" : "aac", N = `${e.map((h, v) => `[${v}:a]`).join("")}concat=n=${e.length}:v=0:a=1[outa]`;
    console.log("[MERGE] Filter complex:", N), console.log("[MERGE] Using codec:", j, "bitrate:", s || "128k");
    let R = F();
    e.forEach((h) => {
      R = R.input(h.path);
    });
    const A = e.length;
    R = R.input(S);
    let C = -1;
    l && d.existsSync(l) && !$ && (C = A + 1, R = R.input(l), console.log("[MERGE] Cover image added at input", C, ":", l));
    const y = [
      "-filter_complex",
      N,
      "-map",
      "[outa]",
      "-c:a",
      j,
      "-b:a",
      s || "128k"
    ];
    C >= 0 && (y.push("-map", `${C}:v`), y.push("-c:v", "mjpeg"), y.push("-disposition:v", "attached_pic")), $ || (y.push("-map_metadata", String(A)), t && (t.title && y.push("-metadata", `title=${t.title}`), t.author && y.push("-metadata", `artist=${t.author}`), t.author && y.push("-metadata", `album_artist=${t.author}`), t.genre && y.push("-metadata", `genre=${t.genre}`), t.year && y.push("-metadata", `date=${t.year}`), t.narrator && y.push("-metadata", `composer=${t.narrator}`)), n.itunesCompatibility && (y.push("-movflags", "+faststart"), console.log("[MERGE] iTunes Compatibility mode enabled (faststart)"))), R.outputOptions(y).output(u).on("start", (h) => {
      console.log("[MERGE] FFmpeg command:", h);
    }).on("stderr", (h) => {
      (h.includes("Error") || h.includes("error") || h.includes("Opening") || h.includes("Output")) && console.log("[MERGE] FFmpeg:", h);
    }).on("progress", (h) => {
      const v = h.percent || 0;
      v > 0 && console.log("[MERGE] Progress:", v.toFixed(1) + "%"), g && g.webContents.send("audio:progress", {
        percent: v,
        timemark: h.timemark
      });
    }).on("end", () => {
      console.log("[MERGE] FFmpeg completed successfully!"), console.log("[MERGE] Output file:", u);
      try {
        d.unlinkSync(S);
      } catch {
      }
      b({ success: !0, outputPath: u });
    }).on("error", (h, v, U) => {
      console.error("[MERGE] FFmpeg error:", h.message), console.error("[MERGE] FFmpeg stderr:", U);
      try {
        d.unlinkSync(S);
      } catch {
      }
      k(h);
    }), R.run();
  });
});
const x = m.join(_.getPath("userData"), "settings.json");
p.handle("settings:read", async () => {
  try {
    if (d.existsSync(x)) {
      const r = d.readFileSync(x, "utf8");
      return JSON.parse(r);
    }
  } catch (r) {
    console.error("[SETTINGS] Failed to read settings:", r);
  }
  return {};
});
p.handle("settings:write", async (r, n) => {
  try {
    return d.writeFileSync(x, JSON.stringify(n, null, 2), "utf8"), { success: !0 };
  } catch (e) {
    return console.error("[SETTINGS] Failed to write settings:", e), { success: !1, error: e.message };
  }
});
p.handle("settings:select-directory", async () => {
  const r = await T.showOpenDialog({
    title: "Select Default Output Directory",
    properties: ["openDirectory", "createDirectory"]
  });
  return !r.canceled && r.filePaths.length > 0 ? r.filePaths[0] : null;
});
const O = m.join(_.getPath("userData"), "recent_projects.json"), J = () => {
  try {
    if (d.existsSync(O))
      return JSON.parse(d.readFileSync(O, "utf8"));
  } catch (r) {
    console.error("[RECENT] Failed to read recent projects:", r);
  }
  return [];
};
p.handle("recent:read", async () => J());
p.handle("recent:add", async (r, n) => {
  try {
    const e = J(), s = m.basename(n, m.extname(n)), i = e.filter((t) => t.path !== n);
    i.unshift({ path: n, name: s, lastOpened: Date.now() });
    const l = i.slice(0, 10);
    return d.writeFileSync(O, JSON.stringify(l, null, 2)), l;
  } catch (e) {
    return console.error("[RECENT] Failed to add recent project:", e), [];
  }
});
p.handle("recent:clear", async () => {
  try {
    return d.writeFileSync(O, "[]"), [];
  } catch (r) {
    return console.error("[RECENT] Failed to clear recent projects:", r), [];
  }
});
async function W(r, n, e = "128k", s) {
  try {
    if (!d.existsSync(r))
      throw new Error(`Input file not found: ${r}`);
    const i = m.parse(r);
    let l = m.join(i.dir, `${i.name}.${n}`);
    r === l && (l = m.join(i.dir, `${i.name}_converted.${n}`)), ["64k", "96k", "128k", "192k", "256k", "320k"].includes(e) || (console.warn(`[CONVERT] Invalid bitrate '${e}', defaulting to 128k`), e = "128k");
    let c, a;
    switch (n) {
      case "m4b":
        c = "aac", a = "ipod";
        break;
      case "m4a":
        c = "aac", a = "mp4";
        break;
      case "mp3":
        c = "libmp3lame", a = "mp3";
        break;
      case "aac":
        c = "aac", a = "adts";
        break;
      default:
        throw new Error(`Unsupported format: ${n}`);
    }
    return console.log(`[CONVERT] ${r} -> ${l} (${c})`), new Promise((o, f) => {
      F(r).audioCodec(c).audioBitrate(e).format(a).outputOptions(["-map_metadata", "0"]).on("start", (u) => {
        console.log("[CONVERT] FFmpeg command:", u);
      }).on("progress", (u) => {
        s && s(u.percent || 0, u.timemark);
      }).on("end", () => {
        console.log("[CONVERT] Conversion complete:", l), o({ success: !0, inputPath: r, outputPath: l });
      }).on("error", (u) => {
        console.error("[CONVERT] FFmpeg error:", u.message), f({ success: !1, inputPath: r, error: u.message });
      }).save(l);
    });
  } catch (i) {
    return console.error("[CONVERT] Error:", i), {
      success: !1,
      inputPath: r,
      error: i.message
    };
  }
}
p.handle("audio:convert", async (r, n) => {
  const { inputPath: e, outputFormat: s, bitrate: i } = n;
  return W(e, s, i, (l, t) => {
    r.sender && !r.sender.isDestroyed() && r.sender.send("audio:convertProgress", {
      inputPath: e,
      percent: l,
      currentTime: t
    });
  });
});
p.handle("audio:batchConvert", async (r, n) => {
  const e = [];
  for (const s of n) {
    const i = await W(s.inputPath, s.outputFormat, s.bitrate);
    e.push(i);
  }
  return e;
});
p.handle("audio:read-chapters", async (r, n) => {
  try {
    const { spawn: e } = B("child_process");
    return new Promise((s, i) => {
      const l = e(G.path, [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_chapters",
        "-show_format",
        n
      ]);
      let t = "", c = "";
      l.stdout.on("data", (a) => t += a), l.stderr.on("data", (a) => c += a), l.on("close", (a) => {
        if (a !== 0) {
          i(new Error(`ffprobe exited with code ${a}: ${c}`));
          return;
        }
        try {
          const o = JSON.parse(t), f = (o.chapters || []).map((u, w) => ({
            id: w + 1,
            title: u.tags?.title || `Chapter ${w + 1}`,
            start: parseFloat(u.start_time),
            end: parseFloat(u.end_time),
            duration: parseFloat(u.end_time) - parseFloat(u.start_time)
          }));
          s({
            chapters: f,
            duration: parseFloat(o.format?.duration || "0"),
            format: o.format?.format_name,
            bitrate: o.format?.bit_rate
          });
        } catch {
          i(new Error("Failed to parse ffprobe output"));
        }
      });
    });
  } catch (e) {
    throw console.error("[SPLIT] Error reading chapters:", e), e;
  }
});
p.handle("audio:split-by-chapters", async (r, n) => {
  const { inputPath: e, outputDirectory: s, chapters: i, outputFormat: l, fileNameTemplate: t } = n, c = [];
  d.existsSync(s) || d.mkdirSync(s, { recursive: !0 });
  for (let a = 0; a < i.length; a++) {
    const o = i[a], f = o.title.replace(/[^a-z0-9]/gi, "_");
    let u = t.replace("{index}", String(o.id).padStart(2, "0")).replace("{title}", f) + `.${l}`;
    const w = m.join(s, u), S = {
      message: `Splitting chapter ${a + 1}/${i.length}`,
      current: a + 1,
      total: i.length,
      chapter: o.title
    };
    g && g.webContents.send("audio:split-progress", S);
    try {
      await new Promise((E, P) => {
        F(e).setStartTime(o.start).setDuration(o.duration).output(w).outputOptions(["-c", "copy", "-map_metadata", "0"]).outputOptions([
          "-metadata",
          `track=${o.id}/${i.length}`,
          "-metadata",
          `title=${o.title}`
        ]).on("end", () => E()).on("error", (b) => P(b)).run();
      }), c.push({ success: !0, path: w, chapterId: o.id });
    } catch (E) {
      console.error(`[SPLIT] Failed chapter ${o.id}:`, E), c.push({ success: !1, error: E.message, chapterId: o.id });
    }
  }
  return { success: !0, results: c };
});
p.handle("audio:detect-silence", async (r, n) => {
  const { filePath: e, noiseThreshold: s = -50, minDuration: i = 1.5 } = n;
  if (console.log(`[SILENCE] Detecting silence in: ${e}`), console.log(`[SILENCE] Params: noise=${s}dB, minDuration=${i}s`), !d.existsSync(e))
    return { success: !1, silences: [], suggestedChapters: [], totalDuration: 0, error: "File not found" };
  const t = await new Promise((c) => {
    F.ffprobe(e, (a, o) => {
      c(a ? 0 : o.format?.duration || 0);
    });
  });
  return new Promise((c) => {
    const a = [];
    F(e).audioFilters(`silencedetect=noise=${s}dB:d=${i}`).format("null").output("-").on("start", (o) => {
      console.log("[SILENCE] FFmpeg command:", o);
    }).on("stderr", (o) => {
      const f = o.match(/silence_start:\s*([\d.]+)/);
      f && a.push({
        start: parseFloat(f[1]),
        end: 0,
        duration: 0
      });
      const u = o.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);
      if (u && a.length > 0) {
        const w = a[a.length - 1];
        w.end = parseFloat(u[1]), w.duration = parseFloat(u[2]);
      }
    }).on("progress", (o) => {
      g && o.percent && g.webContents.send("audio:silence-progress", {
        percent: o.percent,
        timemark: o.timemark
      });
    }).on("end", () => {
      console.log(`[SILENCE] Detected ${a.length} silence gaps`);
      const o = [];
      if (a.length === 0)
        o.push({
          start: 0,
          end: t,
          duration: t
        });
      else {
        a[0].start > 0.5 && o.push({
          start: 0,
          end: a[0].start,
          duration: a[0].start
        });
        for (let u = 0; u < a.length - 1; u++) {
          const w = a[u].end, S = a[u + 1].start, E = S - w;
          E >= 30 && o.push({
            start: w,
            end: S,
            duration: E
          });
        }
        const f = a[a.length - 1];
        t - f.end > 0.5 && o.push({
          start: f.end,
          end: t,
          duration: t - f.end
        });
      }
      console.log(`[SILENCE] Suggested ${o.length} chapters`), c({
        success: !0,
        silences: a,
        suggestedChapters: o,
        totalDuration: t
      });
    }).on("error", (o) => {
      console.error("[SILENCE] Error:", o.message), c({
        success: !1,
        silences: [],
        suggestedChapters: [],
        totalDuration: t,
        error: o.message
      });
    }).run();
  });
});
