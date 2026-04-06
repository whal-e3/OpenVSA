#!/usr/bin/env python3
"""
DEMOSAT Uplink Command Decoder

Demodulates and validates an OOK-modulated uplink command IQ file.
Called by VSA's Electron main process. Outputs JSON to stdout.

Usage: python3 demosat.py <input.cf32> [sample_rate]
"""

import sys
import json
import numpy as np

BAUD_RATE = 100
PREAMBLE = [1,0,1,0,1,0,1,0, 1,0,1,0,1,0,1,0]  # 0xAA 0xAA

VALID_OPCODES = {
    0x10: "solar_panel",
    0x20: "antenna_gimbal",
    0x30: "subsystem_ctrl",
    0x40: "transponder_ctrl",
    0xE0: "auth_change",
    0xF0: "firmware_upload",
    0xF1: "firmware_activate",
    0xFF: "obc_reboot",
}

def crc8(data):
    crc = 0x00
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = ((crc << 1) ^ 0x07) if crc & 0x80 else (crc << 1)
            crc &= 0xFF
    return crc

def result(success, **kwargs):
    print(json.dumps({"success": success, **kwargs}))
    sys.exit(0)

def decode(filepath, samp_rate=24000):
    try:
        data = np.fromfile(filepath, dtype=np.float32)
    except Exception as e:
        result(False, error=f"Failed to read file: {e}")

    if len(data) < 100:
        result(False, error="File too short — not enough samples")

    iq = data[0::2] + 1j * data[1::2]
    samples_per_bit = samp_rate // BAUD_RATE

    # Envelope detection
    envelope = np.abs(iq)
    max_env = np.max(envelope)

    if max_env < 0.01:
        result(False, error="No signal detected — file appears to be silence")

    # Threshold + bit sampling
    threshold = max_env * 0.3
    bits_raw = (envelope > threshold).astype(int)

    num_bits = len(bits_raw) // samples_per_bit
    bits = []
    for i in range(num_bits):
        start = i * samples_per_bit + samples_per_bit // 4
        end = i * samples_per_bit + 3 * samples_per_bit // 4
        bits.append(1 if np.mean(bits_raw[start:end]) > 0.5 else 0)

    # Find preamble
    for i in range(len(bits) - len(PREAMBLE)):
        if bits[i:i+len(PREAMBLE)] == PREAMBLE:
            packet_bits = bits[i:]
            packet_bytes = []
            for j in range(0, len(packet_bits) - 7, 8):
                byte = 0
                for k in range(8):
                    byte = (byte << 1) | packet_bits[j + k]
                packet_bytes.append(byte)

            if len(packet_bytes) < 4:
                continue

            # Preamble (2) + length (1) + payload (length) + CRC (1)
            length = packet_bytes[2]
            if 3 + length + 1 > len(packet_bytes):
                result(False, error=f"Packet truncated — expected {3+length+1} bytes, got {len(packet_bytes)}")

            payload = packet_bytes[3:3+length]
            received_crc = packet_bytes[3+length]
            expected_crc = crc8(packet_bytes[0:3+length])

            if received_crc != expected_crc:
                result(False, error=f"CRC mismatch — received 0x{received_crc:02x}, expected 0x{expected_crc:02x}")

            # Valid packet — extract command
            if length < 1:
                result(False, error="Empty payload — no command opcode")

            opcode = payload[0]
            cmd_data = payload[1:]

            if opcode not in VALID_OPCODES:
                result(False, error=f"Unknown opcode 0x{opcode:02x}")

            command = VALID_OPCODES[opcode]
            result(True,
                   command=command,
                   opcode=f"0x{opcode:02x}",
                   payload=[f"0x{b:02x}" for b in cmd_data],
                   message=f"Command accepted: {command}")

    result(False, error="No valid packet found — check modulation (OOK, 100 baud) and packet format")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python3 demosat.py <input.cf32> [sample_rate]"}))
        sys.exit(1)

    filepath = sys.argv[1]
    samp_rate = int(sys.argv[2]) if len(sys.argv) > 2 else 24000
    decode(filepath, samp_rate)
