// Copyright (c) 2026 SunHyuk Hwang. All Rights Reserved.

import { ANTENNA_TYPES }      from "./data/antennas.js";
import { createControls }      from "./components/controls.js";
import { createRotatorScene }  from "./components/rotatorScene.js";
import { createStore }         from "./state/store.js";
import { connectRotctld }      from "./rotctld-client.js";

const store = createStore({
  antennaType:       "yagi",
  azimuth:           131,
  elevation:         47,
  autoRotate:        false,
  rotationSpeed:     12,
  bridgeConnected:   false,
  gpredictConnected: false,
  gpredictTime:      null,
  lat:               37.241917,
  lon:               127.081127,
  targetName:        "",
  frequency:         0,
  sampleRate:        0,
  bandwidth:         0,
  gain:              0,
  downconvEnabled:   false,
  downconvLO:        9750,
});

createControls({
  container:    document.querySelector("#controls-root"),
  store,
  antennaTypes: ANTENNA_TYPES,
});

createRotatorScene({
  container:    document.querySelector("#scene-root"),
  store,
  antennaTypes: ANTENNA_TYPES,
});

connectRotctld(store);
