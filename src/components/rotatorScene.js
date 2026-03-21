// Copyright (c) 2026 SunHyuk Hwang. All Rights Reserved.

import { createSceneRenderer } from "../lib/simple3d.js";

export function createRotatorScene({ container, store, antennaTypes }) {
  container.innerHTML = `
    <div class="scene-stage">
      <canvas
        class="scene-canvas"
        aria-label="3D antenna rotator visualisation"
      ></canvas>
      <div class="waterfall-overlay">
        <div class="waterfall-label">
          Spectrogram display
        </div>
        <canvas id="spectrum-canvas"></canvas>
        <canvas id="waterfall-canvas"></canvas>
      </div>
      <div class="gpredict-overlay">
        <div class="status-row">
          <div class="status-dot" id="dot-bridge"></div>
          <span id="lbl-bridge">Bridge: disconnected</span>
        </div>
        <div class="status-row">
          <div class="status-dot" id="dot-gpredict"></div>
          <span id="lbl-gpredict">GPredict: not connected</span>
        </div>
      </div>
      <div class="scene-info-overlay">
        <div class="scene-time-row">
          <span id="scene-lbl-time">--:--:-- UTC</span>
        </div>
        <div class="scene-loc-row">
          <input type="number" id="scene-ctrl-lat" class="scene-loc-input" step="0.0001" min="-90"  max="90"  readonly />
          <span class="scene-loc-sep" id="scene-lbl-lat-dir">N</span>
          <input type="number" id="scene-ctrl-lon" class="scene-loc-input" step="0.0001" min="-180" max="180" readonly />
          <span class="scene-loc-sep" id="scene-lbl-lon-dir">E</span>
        </div>
        <div class="scene-loc-refresh-row">
          <button id="btn-refresh-loc" class="btn-refresh-loc" title="Reload location from GPredict .qth">↺ Refresh location</button>
        </div>
        <div class="antenna-spec-overlay">
          <p class="antenna-spec-name" id="spec-name"></p>
          <p class="antenna-spec-desc" id="spec-desc"></p>
          <table class="antenna-spec-table">
            <tr><td>Beamwidth</td><td id="spec-beamwidth"></td></tr>
            <tr><td>Peak Gain</td><td id="spec-gain"></td></tr>
          </table>
        </div>
        <div class="sdr-spec-box">
          <p class="sdr-spec-title">Virtual SDR</p>
          <table class="antenna-spec-table">
            <tr><td>Frequency</td><td>1 MHz – 6 GHz</td></tr>
            <tr><td>Max Bandwidth</td><td>20 MHz</td></tr>
            <tr><td>Gain</td><td>0 – 50 dB</td></tr>
          </table>
        </div>
      </div>
    </div>
    <div class="scene-readout">
      <div class="readout-card">
        <span>Antenna</span>
        <strong id="ro-antenna"></strong>
        <p class="readout-note">Mounted payload</p>
      </div>
      <div class="readout-card">
        <span>Azimuth</span>
        <strong id="ro-az"></strong>
        <p class="readout-note">Base rotation</p>
      </div>
      <div class="readout-card">
        <span>Elevation</span>
        <strong id="ro-el"></strong>
        <p class="readout-note">Upward angle</p>
      </div>
    </div>
  `;

  const canvas       = container.querySelector(".scene-canvas");
  const stage        = container.querySelector(".scene-stage");
  const renderer     = createSceneRenderer({ canvas });
  const roAntenna    = container.querySelector("#ro-antenna");
  const roAz         = container.querySelector("#ro-az");
  const roEl         = container.querySelector("#ro-el");
  const lblSceneTime  = container.querySelector("#scene-lbl-time");
  const sceneLatEl    = container.querySelector("#scene-ctrl-lat");
  const sceneLonEl    = container.querySelector("#scene-ctrl-lon");
  const lblLatDir     = container.querySelector("#scene-lbl-lat-dir");
  const lblLonDir     = container.querySelector("#scene-lbl-lon-dir");
  const btnRefreshLoc = container.querySelector("#btn-refresh-loc");
  const specName      = container.querySelector("#spec-name");
  const specDesc      = container.querySelector("#spec-desc");
  const specBeamwidth = container.querySelector("#spec-beamwidth");
  const specGain      = container.querySelector("#spec-gain");
  const dotBridge     = container.querySelector("#dot-bridge");
  const dotGpredict   = container.querySelector("#dot-gpredict");
  const lblBridge     = container.querySelector("#lbl-bridge");
  const lblGpredict   = container.querySelector("#lbl-gpredict");

  // ── location refresh ──────────────────────────────────────────────────────
  if (btnRefreshLoc && window.electronAPI) {
    btnRefreshLoc.addEventListener("click", async () => {
      btnRefreshLoc.disabled = true;
      try {
        const stations = await window.electronAPI.getQTH();
        if (stations && stations.length > 0) {
          store.setState(s => ({ ...s, lat: stations[0].lat, lon: stations[0].lon }));
        }
      } finally {
        btnRefreshLoc.disabled = false;
      }
    });
  }

  // ── spectrum (FFT power plot) ──────────────────────────────────────────────
  const spCanvas = container.querySelector("#spectrum-canvas");
  const spCtx    = spCanvas.getContext("2d");
  const SP_W = 308, SP_H = 50;
  spCanvas.width  = SP_W;
  spCanvas.height = SP_H;

  // ── waterfall ─────────────────────────────────────────────────────────────
  const wfCanvas = container.querySelector("#waterfall-canvas");
  const wfCtx    = wfCanvas.getContext("2d");
  const WF_W = 308, WF_H = 300;
  wfCanvas.width  = WF_W;
  wfCanvas.height = WF_H;
  wfCtx.fillStyle = "#000";
  wfCtx.fillRect(0, 0, WF_W, WF_H);

  let wfRowHeight = 1;
  wfCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    wfRowHeight = Math.max(1, Math.min(8, wfRowHeight + (e.deltaY > 0 ? -1 : 1)));
  }, { passive: false });

  const WF_AXIS_H = 22;

  function drawFreqAxis() {
    const { frequency, bandwidth } = store.getState();
    const bw      = bandwidth || 0.001;
    const freqMin = frequency - bw / 2;
    const freqMax = frequency + bw / 2;

    wfCtx.fillStyle = "#070e1a";
    wfCtx.fillRect(0, 0, WF_W, WF_AXIS_H);

    wfCtx.strokeStyle = "#1e3048";
    wfCtx.lineWidth = 1;
    wfCtx.beginPath();
    wfCtx.moveTo(0, WF_AXIS_H - 1);
    wfCtx.lineTo(WF_W, WF_AXIS_H - 1);
    wfCtx.stroke();

    const ticks = [0, 0.25, 0.5, 0.75, 1.0];
    wfCtx.strokeStyle = "#2e4a62";
    for (const f of ticks) {
      const x = Math.round(f * (WF_W - 1));
      wfCtx.beginPath();
      wfCtx.moveTo(x, WF_AXIS_H - 6);
      wfCtx.lineTo(x, WF_AXIS_H - 1);
      wfCtx.stroke();
    }

    wfCtx.strokeStyle = "#d66a2d";
    wfCtx.beginPath();
    wfCtx.moveTo(WF_W / 2, WF_AXIS_H - 8);
    wfCtx.lineTo(WF_W / 2, WF_AXIS_H - 1);
    wfCtx.stroke();

    wfCtx.font = "bold 9px monospace";
    wfCtx.textBaseline = "top";
    wfCtx.fillStyle = "#4e6880";
    wfCtx.textAlign = "left";
    wfCtx.fillText(freqMin.toFixed(3), 3, 2);
    wfCtx.fillStyle = "#d66a2d";
    wfCtx.textAlign = "center";
    wfCtx.fillText(frequency.toFixed(3), WF_W / 2, 2);
    wfCtx.fillStyle = "#4e6880";
    wfCtx.textAlign = "right";
    wfCtx.fillText(freqMax.toFixed(3), WF_W - 3, 2);
  }

  // ── FFT engine ─────────────────────────────────────────────────────────────
  const FFT_SIZE = 512;
  const FFT_STEP = 128;
  const MIN_DB   = -65;
  const MAX_DB   = -5;
  const GAIN_MIN_DB = 0;
  const GAIN_MAX_DB = 50;

  const HANN = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++)
    HANN[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));

  const fftRe  = new Float32Array(FFT_SIZE);
  const fftIm  = new Float32Array(FFT_SIZE);
  const fftMag = new Float32Array(FFT_SIZE);

  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len;
      const wRe = Math.cos(ang), wIm = Math.sin(ang);
      const half = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cRe = 1, cIm = 0;
        for (let j = 0; j < half; j++) {
          const uRe = re[i + j], uIm = im[i + j];
          const vRe = re[i + j + half] * cRe - im[i + j + half] * cIm;
          const vIm = re[i + j + half] * cIm + im[i + j + half] * cRe;
          re[i + j]        = uRe + vRe;  im[i + j]        = uIm + vIm;
          re[i + j + half] = uRe - vRe;  im[i + j + half] = uIm - vIm;
          const nRe = cRe * wRe - cIm * wIm;
          cIm = cRe * wIm + cIm * wRe;
          cRe = nRe;
        }
      }
    }
  }

  let iqSamples    = null;   // Float32Array interleaved I,Q
  let iqPos        = 0;
  let iqSampleRate = 48_000;

  let gpredictTimeOffset = 0;

  function computeFFTRow() {
    const n = iqSamples.length >> 1;
    for (let k = 0; k < FFT_SIZE; k++) {
      const si = ((iqPos + k) % n) << 1;
      fftRe[k] = iqSamples[si]     * HANN[k];
      fftIm[k] = iqSamples[si + 1] * HANN[k];
    }
    fft(fftRe, fftIm);
    const norm = 1 / FFT_SIZE;
    for (let k = 0; k < FFT_SIZE; k++) {
      const sk = (k + (FFT_SIZE >> 1)) & (FFT_SIZE - 1);
      const r  = fftRe[sk] * norm, im = fftIm[sk] * norm;
      fftMag[k] = 20 * Math.log10(Math.sqrt(r * r + im * im) + 1e-10);
    }
    const rowStride = Math.max(FFT_STEP, Math.round(iqSampleRate * wfInterval / 1000));
    iqPos = (iqPos + rowStride) % n;
  }

  function dbToColor(db) {
    const val = Math.min(255, Math.max(0, ((db - MIN_DB) / (MAX_DB - MIN_DB)) * 255));
    if      (val < 60)  return [0,                          0,                          Math.round(val * 3)];
    else if (val < 120) return [0,                          Math.round((val - 60) * 4), 180];
    else if (val < 180) return [Math.round((val - 120) * 4), 255,                       Math.round(180 - (val - 120) * 3)];
    else                return [255,                         255,                        Math.round((val - 180) * 3)];
  }

  // Listen for IQ data events from controls.js
  window.addEventListener("iq-start", (e) => {
    let raw = e.detail.bytes;
    if (!(raw instanceof Uint8Array)) raw = new Uint8Array(Object.values(raw));
    const len = raw.byteLength - (raw.byteLength % 4);
    const ab  = raw.buffer.slice(raw.byteOffset, raw.byteOffset + len);
    iqSamples    = new Float32Array(ab);
    iqPos        = 0;
    // Use the user-configured sample rate (MSps → Hz)
    iqSampleRate = Math.round((store.getState().sampleRate || 0.048) * 1e6);
    wfCtx.fillStyle = "#000";
    wfCtx.fillRect(0, WF_AXIS_H, WF_W, WF_H - WF_AXIS_H);
  });

  window.addEventListener("iq-stop", () => {
    iqSamples = null;
    iqPos     = 0;
  });

  // ── IQ recording state ────────────────────────────────────────────────────
  function gaussRand() {
    return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  }

  const NOISE_SIGMA = 0.00316;
  let recBuffer     = null;
  let recTargetRate = 0;
  let recMeta       = null;

  window.addEventListener("recording-start", () => {
    const state   = store.getState();
    recTargetRate = Math.round((state.sampleRate || 0.048) * 1e6);
    recBuffer     = [];
    recMeta       = {
      centerFreqHz: state.frequency * 1e6,
      sampleRate:   recTargetRate,
      gainDb:       state.gain || 0,
      antennaType:  state.antennaType,
      antennaAz:    state.azimuth,
      antennaEl:    state.elevation,
      observerLat:  state.lat,
      observerLon:  state.lon,
      datetime:     new Date().toISOString(),
    };
  });

  window.addEventListener("recording-save", async ({ detail: { recDir } }) => {
    if (!window.electronAPI) return;

    const chunks = recBuffer;
    recBuffer    = null;

    if (!chunks || chunks.length === 0) {
      window.dispatchEvent(new CustomEvent("recording-saved", { detail: { error: "No data recorded" } }));
      return;
    }

    const totalComplex = chunks.reduce((sum, c) => sum + (c.length >> 1), 0);
    const out = new Float32Array(totalComplex * 2);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const freqMHz   = ((recMeta?.centerFreqHz ?? 0) / 1e6).toFixed(3).replace(".", "_");
    const filename  = `REC_${freqMHz}MHz_${timestamp}.cf32`;
    try {
      const savedPath = await window.electronAPI.saveRecording(new Uint8Array(out.buffer), filename, recMeta, recDir);
      window.dispatchEvent(new CustomEvent("recording-saved", { detail: { path: savedPath } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("recording-saved", { detail: { error: e.message } }));
    }
  });

  // ── Spectrum (FFT power plot) ─────────────────────────────────────────────
  const SP_DB_TICKS = [MIN_DB, -50, -35, -20, MAX_DB];

  function drawSpectrum(hasSig, gainDb) {
    const { frequency, bandwidth } = store.getState();
    const bw    = bandwidth || (iqSampleRate / 1e6);
    const binHz = iqSampleRate / FFT_SIZE;

    spCtx.fillStyle = "#070c14";
    spCtx.fillRect(0, 0, SP_W, SP_H);

    for (const db of SP_DB_TICKS) {
      const y = Math.round(SP_H * (1 - (db - MIN_DB) / (MAX_DB - MIN_DB)));
      spCtx.strokeStyle = "#1a2c3e";
      spCtx.lineWidth = 1;
      spCtx.beginPath();
      spCtx.moveTo(0, y);
      spCtx.lineTo(SP_W, y);
      spCtx.stroke();
    }

    spCtx.strokeStyle = "#d66a2d55";
    spCtx.lineWidth = 1;
    spCtx.beginPath();
    spCtx.moveTo(SP_W / 2, 0);
    spCtx.lineTo(SP_W / 2, SP_H);
    spCtx.stroke();

    spCtx.beginPath();
    for (let x = 0; x < SP_W; x++) {
      let db;
      if (hasSig) {
        const bin = Math.round((x / (SP_W - 1)) * (FFT_SIZE - 1));
        db = fftMag[bin] + gainDb;
        if (db <= MIN_DB) db = MIN_DB + Math.random() * 8;
      } else {
        db = MIN_DB + Math.random() * 8;
      }
      const clampedDb = Math.max(MIN_DB, Math.min(MAX_DB, db));
      const y = SP_H * (1 - (clampedDb - MIN_DB) / (MAX_DB - MIN_DB));
      if (x === 0) spCtx.moveTo(x, y);
      else         spCtx.lineTo(x, y);
    }
    spCtx.lineTo(SP_W - 1, SP_H);
    spCtx.lineTo(0, SP_H);
    spCtx.closePath();

    const grad = spCtx.createLinearGradient(0, 0, 0, SP_H);
    grad.addColorStop(0,   "#00d4ff88");
    grad.addColorStop(0.6, "#00d4ff22");
    grad.addColorStop(1,   "#00d4ff00");
    spCtx.fillStyle = grad;
    spCtx.fill();

    spCtx.strokeStyle = "#00d4ffcc";
    spCtx.lineWidth = 1.2;
    spCtx.beginPath();
    for (let x = 0; x < SP_W; x++) {
      let db;
      if (hasSig) {
        const bin = Math.round((x / (SP_W - 1)) * (FFT_SIZE - 1));
        db = fftMag[bin] + gainDb;
        if (db <= MIN_DB) db = MIN_DB + Math.random() * 8;
      } else {
        db = MIN_DB + Math.random() * 8;
      }
      const clampedDb = Math.max(MIN_DB, Math.min(MAX_DB, db));
      const y = SP_H * (1 - (clampedDb - MIN_DB) / (MAX_DB - MIN_DB));
      if (x === 0) spCtx.moveTo(x, y);
      else         spCtx.lineTo(x, y);
    }
    spCtx.stroke();
  }

  // ── Waterfall render loop ─────────────────────────────────────────────────
  function drawWaterfallRow() {
    const img = wfCtx.getImageData(0, WF_AXIS_H, WF_W, WF_H - WF_AXIS_H - wfRowHeight);
    wfCtx.putImageData(img, 0, WF_AXIS_H + wfRowHeight);
    const row = wfCtx.createImageData(WF_W, 1);

    const { gain } = store.getState();
    const gainDb   = Math.max(GAIN_MIN_DB, Math.min(GAIN_MAX_DB, gain || 0));
    const hasSig   = iqSamples !== null;

    if (hasSig) {
      computeFFTRow();
      for (let x = 0; x < WF_W; x++) {
        const bin = Math.round((x / (WF_W - 1)) * (FFT_SIZE - 1));
        const i   = x * 4;
        const db  = fftMag[bin] + gainDb;
        if (db <= MIN_DB) {
          const v = Math.random() * 40;
          row.data[i] = 0; row.data[i+1] = 0; row.data[i+2] = Math.round(v * 3); row.data[i+3] = 255;
        } else {
          const [r, g, b] = dbToColor(db);
          row.data[i] = r; row.data[i+1] = g; row.data[i+2] = b; row.data[i+3] = 255;
        }
      }
    } else {
      for (let x = 0; x < WF_W; x++) {
        const val = Math.random() * 40;
        const i = x * 4;
        row.data[i] = 0; row.data[i+1] = 0; row.data[i+2] = Math.round(val * 3); row.data[i+3] = 255;
      }
    }

    for (let r = 0; r < wfRowHeight; r++) wfCtx.putImageData(row, 0, WF_AXIS_H + r);
    drawFreqAxis();
    drawSpectrum(hasSig, gainDb);

    // ── Real-time recording chunk ───────────────────────────────────────────
    if (recBuffer !== null) {
      const state       = store.getState();
      const clampedGain = Math.max(GAIN_MIN_DB, Math.min(GAIN_MAX_DB, state.gain || 0));
      const gainAmp     = 10 ** (clampedGain / 20);
      const nSrc        = iqSamples ? (iqSamples.length >> 1) : 0;
      const chunkSamples = Math.round(recTargetRate * wfInterval / 1000);
      const chunk       = new Float32Array(chunkSamples * 2);

      for (let k = 0; k < chunkSamples; k++) {
        let iOut = gaussRand() * NOISE_SIGMA;
        let qOut = gaussRand() * NOISE_SIGMA;

        if (hasSig && nSrc > 0) {
          const si = Math.floor(iqPos + k) % nSrc;
          iOut += iqSamples[si * 2]     * gainAmp;
          qOut += iqSamples[si * 2 + 1] * gainAmp;
        }

        chunk[k * 2]     = Math.max(-1, Math.min(1, iOut));
        chunk[k * 2 + 1] = Math.max(-1, Math.min(1, qOut));
      }

      recBuffer.push(chunk);
    }
  }
  const wfInterval = 30;
  setInterval(drawWaterfallRow, wfInterval);

  // ── time overlay ──────────────────────────────────────────────────────────
  function formatUTC(ms) {
    const d = new Date(ms);
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const ss = String(d.getUTCSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss} UTC`;
  }

  setInterval(() => {
    const state = store.getState();
    if (state.gpredictTime != null) gpredictTimeOffset = state.gpredictTime - Date.now();
    lblSceneTime.textContent = formatUTC(Date.now() + gpredictTimeOffset);
  }, 1000);

  let prevTime = 0;
  let rafId    = null;

  function updateScene(state) {
    const antenna = antennaTypes[state.antennaType];
    renderer.render({
      azimuth:      state.azimuth,
      elevation:    state.elevation,
      antennaParts: antenna.buildModel(state),
    });
    roAntenna.textContent      = antenna.label;
    roAz.textContent           = `${Math.round(state.azimuth)}°`;
    roEl.textContent           = `${Math.round(state.elevation)}°`;
    specName.textContent       = antenna.label;
    specDesc.textContent       = antenna.description;
    specBeamwidth.textContent  = `${antenna.beamwidthDeg}°`;
    specGain.textContent       = antenna.peakGainDb > 0 ? `+${antenna.peakGainDb} dB` : `${antenna.peakGainDb} dB`;

    if (document.activeElement !== sceneLatEl) sceneLatEl.value = state.lat.toFixed(4);
    if (document.activeElement !== sceneLonEl) sceneLonEl.value = state.lon.toFixed(4);
    lblLatDir.textContent = state.lat >= 0 ? "N" : "S";
    lblLonDir.textContent = state.lon >= 0 ? "E" : "W";

    const bc = !!state.bridgeConnected;
    dotBridge.className   = `status-dot${bc ? " connected" : ""}`;
    lblBridge.textContent = bc ? "Bridge: connected" : "Bridge: disconnected";

    const gc = !!state.gpredictConnected;
    dotGpredict.className   = `status-dot${gc ? " active" : ""}`;
    lblGpredict.textContent = gc ? "GPredict: tracking" : "GPredict: not connected";
  }

  function tick(time) {
    const state = store.getState();

    if (state.autoRotate) {
      if (prevTime === 0) prevTime = time;
      const dt = (time - prevTime) / 1000;
      store.setState((s) => ({
        ...s,
        azimuth: (s.azimuth + s.rotationSpeed * dt) % 360,
      }));
    } else {
      updateScene(state);
    }
    prevTime = time;
    rafId = requestAnimationFrame(tick);
  }

  store.subscribe(updateScene);
  rafId = requestAnimationFrame(tick);

  const ro = new ResizeObserver(() => {
    canvas.width  = stage.clientWidth;
    canvas.height = stage.clientHeight;
    updateScene(store.getState());
  });
  ro.observe(stage);

  return () => { ro.disconnect(); if (rafId) cancelAnimationFrame(rafId); };
}
