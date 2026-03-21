// Copyright (c) 2026 SunHyuk Hwang. All Rights Reserved.

"use strict";

const net = require("net");
const { WebSocketServer } = require("ws");

const ROTCTLD_PORT = 4533;
const WS_PORT      = 4534;

let currentAz = 0;
let currentEl = 0;

// ── WebSocket server for browser clients ─────────────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT });

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

wss.on("listening", () => {
  console.log(`[ws] WebSocket bridge listening on port ${WS_PORT}`);
});

// ── TCP server implementing Hamlib rotctld protocol for GPredict ─────────────
const tcpServer = net.createServer((socket) => {
  console.log("[rotctld] GPredict connected");
  broadcast({ type: "status", gpredictConnected: true });

  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    let lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      handleCommand(trimmed, socket);
    }
  });

  socket.on("close", () => {
    console.log("[rotctld] GPredict disconnected");
    broadcast({ type: "status", gpredictConnected: false });
  });

  socket.on("error", () => {});
});

function handleCommand(cmd, socket) {
  if (cmd === "p" || cmd === "\\get_pos") {
    socket.write(`${currentAz.toFixed(6)}\n${currentEl.toFixed(6)}\n`);
  } else if (cmd.startsWith("P ") || cmd.startsWith("\\set_pos ")) {
    const parts = cmd.replace(/^\\set_pos\s+|^P\s+/, "").trim().split(/\s+/);
    const az = parseFloat(parts[0]);
    const el = parseFloat(parts[1]);
    if (!isNaN(az) && !isNaN(el)) {
      currentAz = az;
      currentEl = el;
      broadcast({ type: "position", az, el, time: Date.now() });
    }
    socket.write("RPRT 0\n");
  } else if (cmd === "S" || cmd === "\\stop") {
    socket.write("RPRT 0\n");
  } else if (cmd === "_" || cmd === "\\dump_state") {
    // Minimal rotctld state dump for GPredict compatibility
    socket.write([
      "0",           // protocol version
      "2",           // rot_type: other
      "",
      "0.000000 360.000000",  // min/max azimuth
      "0.000000 90.000000",   // min/max elevation
      "",
      "0x0",
      "0x0",
      "",
    ].join("\n") + "\n");
  } else if (cmd === "q" || cmd === "\\quit") {
    socket.end();
  } else {
    socket.write("RPRT 0\n");
  }
}

tcpServer.listen(ROTCTLD_PORT, () => {
  console.log(`[rotctld] TCP bridge listening on port ${ROTCTLD_PORT}`);
});
