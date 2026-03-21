# OpenVSA — System Overview

A lightweight virtual antenna simulator with 3D visualization, GPredict integration, and SDR waterfall display. Loads plain IQ files directly — no decryption, no hardcoded satellites.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Electron App                                │
│                                                                     │
│  ┌──────────────┐    IPC     ┌──────────────────────────────────┐   │
│  │  Main Process │◄────────►│        Renderer (Browser)         │   │
│  │  electron/    │           │                                    │   │
│  │  main.js      │           │  ┌────────────┐  ┌─────────────┐  │   │
│  │  preload.js   │           │  │  Controls   │  │  3D Scene   │  │   │
│  └──────┬───────┘           │  │  Panel      │  │  + Waterfall│  │   │
│         │                    │  └──────┬─────┘  └──────┬──────┘  │   │
│         │                    │         └───────┬───────┘          │   │
│         │                    │                 │                   │   │
│         │                    │           ┌─────▼─────┐            │   │
│         │                    │           │   Store    │            │   │
│         │                    │           │  (state)   │            │   │
│         │                    │           └─────▲─────┘            │   │
│         │                    │                 │                   │   │
│         │                    │           ┌─────┴─────┐            │   │
│         │                    │           │  rotctld   │            │   │
│         │                    │           │  client    │            │   │
│         │                    │           │  (WS:4534) │            │   │
│         │                    │           └─────▲─────┘            │   │
│         │                    └─────────────────┼─────────────────┘   │
└─────────┼──────────────────────────────────────┼────────────────────┘
          │                                      │
          │ require()                    WebSocket│
          │                                      │
   ┌──────▼──────────────────────────────────────▼──┐
   │                  server.js                      │
   │                                                 │
   │   TCP :4533  ◄──────────►  WS :4534             │
   │   (rotctld)     bridge     (browser)            │
   └──────────────────▲─────────────────────────────┘
                      │
                      │ TCP (Hamlib rotctld protocol)
                      │
               ┌──────┴──────┐
               │  GPredict   │
               │  (external) │
               └─────────────┘
```

## Data Flow

```
                    ┌──────────┐
  .cf32 IQ file ──►│  Load IQ  │──► FFT ──► Spectrum + Waterfall
  (plain, on disk)  │  (main)   │          ▲
                    └──────────┘          │ gain
                                          │
  GPredict ──► TCP:4533 ──► WS:4534 ──► Store ──► 3D Scene
  (az/el)      rotctld       bridge     (state)    (canvas)
               protocol
                                        Store ──► Controls Panel
                                       (state)    (sliders, inputs)

  REC button ──► capture IQ + noise ──► .cf32 file + .sigmf-meta
```

## Directory Structure

```
openvsa/
├── package.json              # Dependencies: ws, electron
├── index.html                # Entry HTML (two-panel layout)
├── styles.css                # Full UI styling
├── server.js                 # TCP/WS bridge (rotctld protocol)
├── electron/
│   ├── main.js               # Electron main: file I/O, IPC, QTH reader
│   └── preload.js            # Context bridge: electronAPI
└── src/
    ├── app.js                # Entry: wires store, controls, scene, bridge
    ├── rotctld-client.js     # WebSocket client to bridge server
    ├── state/
    │   └── store.js          # Minimal reactive store (get/set/subscribe)
    ├── data/
    │   └── antennas.js       # Antenna definitions + 3D models
    ├── components/
    │   ├── controls.js       # Left panel UI (SDR, mount, recording)
    │   └── rotatorScene.js   # 3D scene, FFT, waterfall, spectrum, recording
    └── lib/
        └── simple3d.js       # Software 3D renderer (triangles, projection)
```

## Key Differences from Original VSA

| Feature | Original VSA | OpenVSA |
|---------|-------------|----------|
| IQ file loading | AES-256-GCM decryption | Plain file load |
| Satellite list | Hardcoded (DOLPHIN-1, etc.) | None — generic |
| Satellite tracking | SGP4/TLE via satellite.js | Not included |
| Signal model | EIRP, FSPL, beam attenuation, Doppler | Direct FFT + gain |
| Obfuscation | javascript-obfuscator + bytenode | None |
| Dependencies | ws, satellite.js | ws only |

## Antenna Types

| Type | Beamwidth | Gain (relative) | Status |
|------|-----------|-----------------|--------|
| Yagi | 25° | +6 dB | Active |
| Dish (75 cm) | 3° | +24 dB | Active |
| Dipole | 360° | -8 dB | Active |
| Helix | 40° | +5 dB | Disabled |

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 4533 | TCP | Hamlib rotctld (GPredict connects here) |
| 4534 | WebSocket | Browser bridge (renderer connects here) |
