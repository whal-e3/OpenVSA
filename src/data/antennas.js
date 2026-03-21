// Copyright (c) 2026 SunHyuk Hwang. All Rights Reserved.

import { boxPart, dishPart, transformPartTriangles } from "../lib/simple3d.js";

function rod(center, size, color = "#d7e1e8") {
  return boxPart(center, size, color);
}

export const ANTENNA_TYPES = {
  yagi: {
    label: "Yagi Antenna",
    description: "",
    beamwidthDeg: 25,
    peakGainDb: 6,
    buildModel: () => {
      const directors = [6, 24, 42, 60, 78].flatMap((offset, i) =>
        rod({ x: offset, y: 0, z: 0 }, { x: 3, y: 39 - i * 3, z: 3 }),
      );
      return [
        ...rod({ x: 39, y: 0, z: 0 }, { x: 87, y: 5, z: 5 }, "#5f7385"),
        ...directors,
        ...rod({ x: -6, y: 0, z: 0 }, { x: 3, y: 48, z: 3 }, "#c8d4dc"),
      ];
    },
  },

  dish: {
    label: "Dish Antenna",
    description: "75 cm parabolic dish.",
    beamwidthDeg: 3,
    peakGainDb: 24,
    buildModel: (state = {}) => {
      const tiltPivot = { x: 18, y: 6, z: 0 };
      const lnbParts = state.downconvEnabled ? [
        ...boxPart({ x: 50, y: 12, z: 0 }, { x: 16, y: 12, z: 10 }, "#7fa8c8"),
        ...boxPart({ x: 58, y: 12, z: 0 }, { x:  6, y:  8, z:  8 }, "#1a4a4a"),
        ...rod(    { x: 42, y: 12, z: 0 }, { x:  4, y:  4, z:  4 }, "#b87333"),
      ] : [
        ...boxPart({ x: 54, y: 12, z: 0 }, { x: 8, y: 8, z: 8 }, "#d66a2d"),
      ];
      const bowlAssembly = transformPartTriangles(
        [
          ...dishPart({ x: 60, y: 15, z: 0 }, 39, 24, "#dfe6ec", "#8d9da8"),
          ...rod({ x: 36, y: 9,  z: 0 }, { x: 42, y: 5,  z: 5  }, "#74889a"),
          ...rod({ x: 44, y: 3,  z: 0 }, { x: 18, y: 5,  z: 15 }, "#8798a7"),
          ...lnbParts,
        ],
        { rotateZ: 0, pivot: tiltPivot },
      );
      return [
        ...rod({ x: 9, y: 6, z: 0 }, { x: 24, y: 6, z: 6 }, "#5d7181"),
        ...bowlAssembly,
      ];
    },
  },

  dipole: {
    label: "Dipole Antenna",
    description: "",
    beamwidthDeg: 360,
    peakGainDb: -8,
    buildModel: () => [
      ...rod({ x: 18, y: 0, z: 0 }, { x: 36, y: 5, z: 5 }, "#5d7181"),
      ...boxPart({ x: 36, y: 0, z: 0 }, { x: 8, y: 8, z: 8 }, "#d66a2d"),
      ...rod({ x: 36, y: 24, z: 0 }, { x: 4, y: 40, z: 4 }, "#c8d4dc"),
      ...rod({ x: 36, y: -24, z: 0 }, { x: 4, y: 40, z: 4 }, "#c8d4dc"),
    ],
  },

  helix: {
    label: "Helix Antenna",
    description: "",
    beamwidthDeg: 40,
    peakGainDb: 5,
    buildModel: () => {
      const ground = boxPart({ x: 4, y: 0, z: 0 }, { x: 8, y: 56, z: 56 }, "#4d6070");
      const mast = rod({ x: 35, y: 0, z: 0 }, { x: 70, y: 4, z: 4 }, "#8798a7");
      const turns = 4, stepsPerTurn = 8;
      const helixRadius = 14, helixLen = 52;
      const totalSteps = turns * stepsPerTurn;
      const coils = Array.from({ length: totalSteps }, (_, i) => {
        const angle = (i / stepsPerTurn) * Math.PI * 2;
        const xPos  = 10 + (i / totalSteps) * helixLen;
        return transformPartTriangles(
          boxPart({ x: xPos, y: helixRadius, z: 0 }, { x: 5, y: 4, z: 4 }, "#c8d4dc"),
          { rotateX: angle, pivot: { x: xPos, y: 0, z: 0 } },
        );
      }).flat();
      return [...ground, ...mast, ...coils];
    },
  },
};
