// Copyright (c) 2026 SunHyuk Hwang. All Rights Reserved.

"use strict";

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs   = require("fs");
const os   = require("os");

// ── Load plain IQ file ───────────────────────────────────────────────────────
ipcMain.handle("load-iq", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title:      "Load IQ file",
    filters:    [{ name: "IQ Files", extensions: ["cf32", "raw", "iq"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths.length) throw new Error("No file selected");
  const filePath = filePaths[0];
  const bytes = fs.readFileSync(filePath);
  return { bytes, path: filePath };
});

// ── Let the user pick a save directory ───────────────────────────────────────
ipcMain.handle("choose-rec-dir", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title:      "Choose recording save folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (canceled || !filePaths.length) return null;
  return filePaths[0];
});

// ── Save processed IQ recording ──────────────────────────────────────────────
ipcMain.handle("save-recording", (_event, { bytes, filename, meta, dir: customDir }) => {
  const dir = customDir || path.join(os.homedir(), "recordings");
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, filename);
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(Object.values(bytes));
  fs.writeFileSync(outPath, buf);

  if (meta) {
    const ANT_INFO = {
      dish:   { beamwidthDeg: 3,   peakGainDb: 24 },
      yagi:   { beamwidthDeg: 25,  peakGainDb: 6  },
      helix:  { beamwidthDeg: 40,  peakGainDb: 5  },
      dipole: { beamwidthDeg: 360, peakGainDb: -8 },
    };
    const ant = ANT_INFO[meta.antennaType] ?? {};
    const sigmf = {
      "global": {
        "core:datatype":    "cf32_le",
        "core:sample_rate": meta.sampleRate,
        "core:version":     "1.0.0",
        "core:hw":          `OpenVSA / ${meta.antennaType}`,
      },
      "captures": [{
        "core:sample_start": 0,
        "core:frequency":    meta.centerFreqHz,
        "core:datetime":     meta.datetime,
      }],
      "annotations": [{
        "core:sample_start":                    0,
        "virtual_antenna:antenna_type":         meta.antennaType,
        "virtual_antenna:antenna_az_deg":       meta.antennaAz,
        "virtual_antenna:antenna_el_deg":       meta.antennaEl,
        "virtual_antenna:antenna_beamwidth_deg":ant.beamwidthDeg,
        "virtual_antenna:antenna_peak_gain_db": ant.peakGainDb,
        "virtual_antenna:gain_db":              meta.gainDb,
        "virtual_antenna:observer_lat":         meta.observerLat,
        "virtual_antenna:observer_lon":         meta.observerLon,
      }],
    };
    fs.writeFileSync(outPath.replace(/\.cf32$/, ".sigmf-meta"),
                     JSON.stringify(sigmf, null, 2));
  }

  return outPath;
});

// ── GPredict ground station reader ───────────────────────────────────────────
ipcMain.handle("get-qth", async () => {
  const dir = path.join(os.homedir(), ".config", "Gpredict");
  let files;
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith(".qth"));
  } catch {
    return [];
  }
  const stations = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      let lat = null, lon = null, name = null;
      for (const line of content.split("\n")) {
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (key === "LAT")      lat  = parseFloat(val);
        if (key === "LON")      lon  = parseFloat(val);
        if (key === "LOCATION") name = val;
      }
      if (lat !== null && lon !== null) stations.push({ name: name || file, lat, lon });
    } catch { /* skip */ }
  }
  return stations;
});

// Start the TCP/WebSocket bridge
require("../server.js");

function createWindow() {
  const win = new BrowserWindow({
    width:  1280,
    height: 740,
    title:  "OpenVSA",
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
