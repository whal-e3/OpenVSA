// Copyright (c) 2026 SunHyuk Hwang. All Rights Reserved.

export function createControls({ container, store, antennaTypes }) {
  const disabledAntennas = new Set(["helix"]);
  const typeOptions = Object.entries(antennaTypes)
    .map(([k, v]) => {
      const disabled = disabledAntennas.has(k);
      return `<option value="${k}"${disabled ? ' disabled style="color:#666"' : ''}>${v.label}${disabled ? ' (coming soon)' : ''}</option>`;
    })
    .join("");

  container.innerHTML = `
    <div class="controls-header">OPENVSA</div>

    <div class="control-section">
      <div class="section-title-row">
        <p class="section-title">Readme</p>
        <button id="btn-readme-toggle" class="btn-collapse" title="Collapse">▲</button>
      </div>
      <ol id="readme-content" class="readme-list">
        <li>Set the SDR settings (frequency, sample rate, gain) to match your IQ file, then load the file.</li>
        <li>GPredict — Add new rotator, set port to <strong>4533</strong>.</li>
        <li>GPredict — Set ground station location wherever you want.</li>
        <li>Check that the location settings in OpenVSA match the GPredict settings.</li>
        <li>GPredict — Use Antenna control menu to connect with the app.</li>
        <li>Hit REC to capture an IQ recording with the current SDR settings.</li>
      </ol>
    </div>

    <hr class="divider" />

    <div class="control-section">
      <p class="section-title">IQ Signal</p>
      <button id="btn-load-iq" class="btn-load-iq">Load IQ File</button>
      <p id="iq-load-status" class="iq-load-status"></p>
    </div>

    <hr class="divider" />

    <div class="control-section">
      <div class="section-title-row">
        <p class="section-title">Virtual SDR</p>
        <div class="record-btn-group">
          <button id="btn-record-iq" class="btn-record" title="Save IQ recording"></button>
          <span class="record-label">REC</span>
        </div>
      </div>
      <p id="rec-status" class="rec-status"></p>

      <div class="control-row control-row--inline rec-dir-row">
        <label>Save folder</label>
        <div class="rec-dir-group">
          <span id="rec-dir-label" class="rec-dir-label" title="">~/recordings</span>
          <button id="btn-rec-dir" class="btn-step" title="Choose folder">…</button>
        </div>
      </div>

      <div class="control-row control-row--inline">
        <label for="ctrl-freq">Frequency (MHz)</label>
        <input type="number" id="ctrl-freq" min="1" max="6000" step="0.1" />
      </div>

      <div class="control-row control-row--inline">
        <label for="ctrl-samplerate">Sample Rate (MSps)</label>
        <input type="number" id="ctrl-samplerate" min="0" max="20" step="0.1" />
      </div>

      <div class="control-row control-row--inline">
        <label for="ctrl-bandwidth">Bandwidth (MHz)</label>
        <input type="number" id="ctrl-bandwidth" min="0" step="0.001" disabled />
      </div>

      <div class="control-row control-row--inline">
        <label for="ctrl-gain">Gain (0 – 50 dB)</label>
        <div class="input-btn-group">
          <button id="btn-gain-down" class="btn-step">−</button>
          <input type="number" id="ctrl-gain" step="1" min="0" max="50" />
          <button id="btn-gain-up" class="btn-step">+</button>
        </div>
      </div>
    </div>

    <hr class="divider" id="lnb-divider" />

    <div class="control-section" id="lnb-section">
      <div class="section-title-row">
        <p class="section-title">Down Converter (LNB)</p>
        <label class="toggle-switch">
          <input type="checkbox" id="ctrl-downconv" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="control-row control-row--inline">
        <label for="ctrl-downconv-lo">LNB Preset</label>
        <select id="ctrl-downconv-lo">
          <option value="9750">Ku-band low — 9750 MHz</option>
          <option value="10600">Ku-band high — 10600 MHz</option>
          <option value="5150">C-band — 5150 MHz</option>
        </select>
      </div>
    </div>

    <hr class="divider" />

    <div class="control-section">
      <p class="section-title">Mount</p>

      <div class="control-row">
        <label>Antenna type</label>
        <select id="ctrl-type">${typeOptions}</select>
      </div>

      <div class="control-row">
        <label>Azimuth <span id="lbl-az">0°</span></label>
        <input type="range" id="ctrl-az" min="0" max="360" step="0.1" value="131" />
      </div>

      <div class="control-row">
        <label>Elevation <span id="lbl-el">0°</span></label>
        <input type="range" id="ctrl-el" min="0" max="90" step="0.1" value="47" />
      </div>
    </div>

    <hr class="divider" />

    <div class="control-section">
      <p class="section-title">Motion</p>

      <div class="checkbox-row">
        <input type="checkbox" id="ctrl-auto" />
        <label for="ctrl-auto">Auto-rotate azimuth</label>
      </div>

      <div class="control-row">
        <label>Speed <span id="lbl-speed">12°/s</span></label>
        <input type="range" id="ctrl-speed" min="2" max="60" step="1" value="12" />
      </div>
    </div>

    <p class="credit">© 2026 SunHyuk Hwang</p>
  `;

  // ── readme collapse ───────────────────────────────────────────────────────
  const readmeToggle  = container.querySelector("#btn-readme-toggle");
  const readmeContent = container.querySelector("#readme-content");
  readmeToggle.addEventListener("click", () => {
    const collapsed = readmeContent.style.display === "none";
    readmeContent.style.display = collapsed ? "" : "none";
    readmeToggle.textContent    = collapsed ? "▲" : "▼";
    readmeToggle.title          = collapsed ? "Collapse" : "Expand";
  });

  // ── element refs ──────────────────────────────────────────────────────────
  const typeEl        = container.querySelector("#ctrl-type");
  const azEl          = container.querySelector("#ctrl-az");
  const elEl          = container.querySelector("#ctrl-el");
  const autoEl        = container.querySelector("#ctrl-auto");
  const speedEl       = container.querySelector("#ctrl-speed");
  const lblAz         = container.querySelector("#lbl-az");
  const lblEl         = container.querySelector("#lbl-el");
  const lblSpeed      = container.querySelector("#lbl-speed");
  const freqEl        = container.querySelector("#ctrl-freq");
  const sampleRateEl  = container.querySelector("#ctrl-samplerate");
  const bandwidthEl   = container.querySelector("#ctrl-bandwidth");
  const gainEl        = container.querySelector("#ctrl-gain");
  const btnGainUp     = container.querySelector("#btn-gain-up");
  const btnGainDown   = container.querySelector("#btn-gain-down");
  const downconvEl    = container.querySelector("#ctrl-downconv");
  const downconvLOEl  = container.querySelector("#ctrl-downconv-lo");
  const lnbSection    = container.querySelector("#lnb-section");
  const lnbDivider    = container.querySelector("#lnb-divider");

  // ── events → store ────────────────────────────────────────────────────────
  typeEl.addEventListener("change", () =>
    store.setState((s) => ({ ...s, antennaType: typeEl.value })));

  azEl.addEventListener("input", () =>
    store.setState((s) => ({ ...s, azimuth: parseFloat(azEl.value) })));

  elEl.addEventListener("input", () =>
    store.setState((s) => ({ ...s, elevation: parseFloat(elEl.value) })));

  autoEl.addEventListener("change", () =>
    store.setState((s) => ({ ...s, autoRotate: autoEl.checked })));

  speedEl.addEventListener("input", () =>
    store.setState((s) => ({ ...s, rotationSpeed: parseFloat(speedEl.value) })));

  const iqLoadStatus = container.querySelector("#iq-load-status");
  let iqStatusTimer = null;

  function showIQStatus(msg, ok) {
    clearTimeout(iqStatusTimer);
    iqLoadStatus.textContent = msg;
    iqLoadStatus.className = `iq-load-status ${ok ? "iq-load-ok" : "iq-load-err"}`;
    iqStatusTimer = setTimeout(() => { iqLoadStatus.textContent = ""; }, 4000);
  }

  // ── Load plain IQ file ────────────────────────────────────────────────────
  const btnLoadIQ = container.querySelector("#btn-load-iq");

  btnLoadIQ.addEventListener("click", async () => {
    window.dispatchEvent(new CustomEvent("iq-stop"));
    if (!window.electronAPI) {
      showIQStatus("Electron API not available", false);
      return;
    }
    try {
      const { bytes, path: filePath } = await window.electronAPI.loadIQFile();
      window.dispatchEvent(new CustomEvent("iq-start", { detail: { bytes } }));
      showIQStatus(filePath, true);
    } catch (err) {
      if (err?.message !== "No file selected") {
        showIQStatus(err?.message || "Failed to load IQ file", false);
      }
    }
  });

  freqEl.addEventListener("change", () =>
    store.setState((s) => ({ ...s, frequency: parseFloat(freqEl.value) || s.frequency })));

  sampleRateEl.addEventListener("change", () => {
    const v = parseFloat(sampleRateEl.value) || null;
    if (v) store.setState((s) => ({ ...s, sampleRate: v, bandwidth: v }));
  });

  gainEl.addEventListener("change", () =>
    store.setState((s) => ({ ...s, gain: Math.max(0, Math.min(50, parseFloat(gainEl.value) || s.gain)) })));

  btnGainUp.addEventListener("click", () =>
    store.setState((s) => ({ ...s, gain: Math.min(50, s.gain + 1) })));

  btnGainDown.addEventListener("click", () =>
    store.setState((s) => ({ ...s, gain: Math.max(0, s.gain - 1) })));

  downconvEl.addEventListener("change", () =>
    store.setState((s) => ({ ...s, downconvEnabled: downconvEl.checked })));

  downconvLOEl.addEventListener("change", () =>
    store.setState((s) => ({ ...s, downconvLO: parseFloat(downconvLOEl.value) })));

  window.addEventListener("recording-saved", ({ detail }) => {
    if (detail.error) {
      setStatus(detail.error, true);
    } else {
      setStatus(`Saved: ${detail.path}`);
    }
  });

  // ── recording save folder ──────────────────────────────────────────────
  const recDirLabel = container.querySelector("#rec-dir-label");
  const btnRecDir   = container.querySelector("#btn-rec-dir");
  let   recDir      = null;

  btnRecDir.addEventListener("click", async () => {
    if (!window.electronAPI) return;
    const chosen = await window.electronAPI.chooseRecDir();
    if (chosen) {
      recDir = chosen;
      recDirLabel.textContent = chosen;
      recDirLabel.title       = chosen;
    }
  });

  const btnRecord   = container.querySelector("#btn-record-iq");
  const recLabel    = container.querySelector(".record-label");
  const recStatus   = container.querySelector("#rec-status");
  let   isRecording = false;

  let statusTimer = null;
  function setStatus(msg, isError = false) {
    recStatus.textContent = msg;
    recStatus.style.color = isError ? "#cc4444" : "#44994a";
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { recStatus.textContent = ""; }, 10_000);
  }

  btnRecord.addEventListener("click", async () => {
    if (!isRecording) {
      isRecording = true;
      btnRecord.classList.add("recording");
      recLabel.classList.add("recording");
      btnRecord.title = "Recording — click to stop";
      window.dispatchEvent(new CustomEvent("recording-start"));
    } else {
      isRecording = false;
      btnRecord.classList.remove("recording");
      recLabel.classList.remove("recording");
      btnRecord.title = "Save IQ recording";
      setStatus("Saving…");
      window.dispatchEvent(new CustomEvent("recording-save", {
        detail: { recDir },
      }));
    }
  });

  // ── store → UI ────────────────────────────────────────────────────────────
  store.subscribe((state) => {
    typeEl.value   = state.antennaType;
    azEl.value     = state.azimuth;
    elEl.value     = state.elevation;
    autoEl.checked = state.autoRotate;
    speedEl.value  = state.rotationSpeed;

    if (document.activeElement !== freqEl)       freqEl.value       = state.frequency;
    if (document.activeElement !== sampleRateEl) sampleRateEl.value = state.sampleRate;
    if (document.activeElement !== bandwidthEl)  bandwidthEl.value  = state.bandwidth;
    if (document.activeElement !== gainEl)       gainEl.value       = state.gain;
    const isDish = state.antennaType === "dish";
    lnbSection.style.display = isDish ? "" : "none";
    lnbDivider.style.display = isDish ? "" : "none";
    downconvEl.checked = state.downconvEnabled;
    if (document.activeElement !== downconvLOEl) downconvLOEl.value = state.downconvLO;

    lblAz.textContent    = `${Math.round(state.azimuth)}°`;
    lblEl.textContent    = `${Math.round(state.elevation)}°`;
    lblSpeed.textContent = `${state.rotationSpeed}°/s`;
  });
}
