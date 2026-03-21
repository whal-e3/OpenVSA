// Copyright (c) 2026 SunHyuk Hwang. All Rights Reserved.

"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  loadIQFile:    ()                            => ipcRenderer.invoke("load-iq"),
  getQTH:        ()                            => ipcRenderer.invoke("get-qth"),
  chooseRecDir:  ()                            => ipcRenderer.invoke("choose-rec-dir"),
  saveRecording: (bytes, filename, meta, dir)  => ipcRenderer.invoke("save-recording", { bytes, filename, meta, dir }),
});
