// beyondBINARY quantum-prefixed | uvspeed | {+1, 1, -1, +0, 0, -0, +n, n, -n}
// qvid-wavelength-map.js — 8-wavelength to 11-prefix DCA mapping module
// Maps NVIDIA NVLink CPO micro-ring resonator wavelengths to DCA prefix categories
'use strict';

(function (root) {
  const WAVELENGTH_CHANNELS = Object.freeze([
    { channel: 1, lambda: 1310, prefix: 'n:',  gate: 'SWAP', category: 'shebang',   color: '#f0883e', role: 'Scene boundaries, entry points' },
    { channel: 2, lambda: 1300, prefix: '+1:', gate: 'H',    category: 'comment',   color: '#d2a8ff', role: 'Background, static context' },
    { channel: 3, lambda: 1290, prefix: '-n:', gate: 'M',    category: 'import',    color: '#79c0ff', role: 'External references, depth cues' },
    { channel: 4, lambda: 1280, prefix: '+0:', gate: 'Rz',   category: 'class',     color: '#ff7b72', role: 'Object categories, semantic groups' },
    { channel: 5, lambda: 1270, prefix: '0:',  gate: 'I',    category: 'function',  color: '#7ee787', role: 'Core structure, geometry' },
    { channel: 6, lambda: 1260, prefix: '-1:', gate: 'X',    category: 'error',     color: '#f85149', role: 'Anomalies, motion discontinuities' },
    { channel: 7, lambda: 1250, prefix: '+n:', gate: 'T',    category: 'condition', color: '#ffa657', role: 'Decision boundaries, edges' },
    { channel: 8, lambda: 1240, prefix: '1:',  gate: 'CNOT', category: 'variable',  color: '#c9d1d9', role: 'Variables, loops, output, returns',
      extended: [
        { prefix: '+2:', gate: 'CZ', category: 'loop' },
        { prefix: '+3:', gate: 'Y',  category: 'output' },
        { prefix: '-0:', gate: 'S',  category: 'return' }
      ]
    }
  ]);

  const SPEC = Object.freeze({
    process: 'TSMC COUPE (same as NVIDIA NVLink CPO)',
    sensorType: 'Micro-ring resonator array',
    bandCenter: 1275,
    bandWidth: 70,
    channelSpacing: 10,
    ringsPerNVLinkEngine: 8,
    enginesPerSwitchTray: 144,
    switchTraysPerRack: 9,
    totalRingsPerRack: 1296,
    simultaneousSystems: 162,
    pointsPerSystemAt30fps: 50e6,
    dataRatePerRing: '200 Gbps'
  });

  const FORM_FACTORS = Object.freeze([
    { name: 'NVL72 Rack',      rings: 1296, pointsPerFrame: 2.2e9,  qpuLink: 'Photonic tether',  latency: '~5ms',   status: 'Shipping 2025' },
    { name: 'RED Cinema',       rings: null, pointsPerFrame: 500e6,  qpuLink: 'Holoscan → NVLink', latency: '~8ms',   status: 'Shipping' },
    { name: 'Workstation',      rings: 72,   pointsPerFrame: 120e6,  qpuLink: 'Leap API',         latency: '~200ms', status: 'Available' },
    { name: 'Phone (Snapdragon)', rings: 8,  pointsPerFrame: 13.5e6, qpuLink: '5G → edge QPU',    latency: '~50ms',  status: '2027' },
    { name: 'Meta Glasses',     rings: 4,    pointsPerFrame: 6.7e6,  qpuLink: 'WiFi → edge',      latency: '~30ms',  status: '2028' },
    { name: 'Anduril EagleEye', rings: 8,    pointsPerFrame: 13.5e6, qpuLink: 'SATCOM → QPU',     latency: '~100ms', status: 'Launched Oct 2025' },
    { name: 'EMOTIV EPOC X',    rings: null, pointsPerFrame: 3.5e3,  qpuLink: 'BLE → phone',      latency: '~80ms',  status: 'Shipping' },
    { name: 'Neuralink N1',     rings: null, pointsPerFrame: 1.93e6, qpuLink: 'Wireless → edge',  latency: '~20ms',  status: 'Clinical trial' }
  ]);

  function mapWavelengthToPrefix(lambda_nm) {
    let best = null, bestDist = Infinity;
    for (const ch of WAVELENGTH_CHANNELS) {
      const dist = Math.abs(ch.lambda - lambda_nm);
      if (dist < bestDist) { bestDist = dist; best = ch; }
    }
    if (!best || bestDist > SPEC.channelSpacing / 2) return null;
    return { prefix: best.prefix, gate: best.gate, category: best.category, channel: best.channel, lambda: best.lambda };
  }

  function mapPrefixToWavelength(symbol) {
    const clean = symbol.trim().replace(/:$/, '') + ':';
    for (const ch of WAVELENGTH_CHANNELS) {
      if (ch.prefix === clean) return ch.lambda;
      if (ch.extended) {
        for (const ext of ch.extended) {
          if (ext.prefix === clean) return ch.lambda;
        }
      }
    }
    return null;
  }

  function classifyPhoton(lambda_nm, intensity) {
    const mapping = mapWavelengthToPrefix(lambda_nm);
    if (!mapping) return null;
    return {
      ...mapping,
      intensity: intensity || 1.0,
      qvid: true,
      timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now()
    };
  }

  function createPointCloud(photonArray, fps) {
    fps = fps || 30;
    const frame = { points: [], prefixCounts: {}, totalPoints: 0, fps };
    for (const p of photonArray) {
      const classified = classifyPhoton(p.lambda, p.intensity);
      if (classified) {
        frame.points.push(classified);
        frame.prefixCounts[classified.prefix] = (frame.prefixCounts[classified.prefix] || 0) + 1;
      }
    }
    frame.totalPoints = frame.points.length;
    frame.coverage = frame.totalPoints > 0
      ? Object.keys(frame.prefixCounts).length / 11 * 100
      : 0;
    return frame;
  }

  const QvidWavelengthMap = {
    WAVELENGTH_CHANNELS,
    SPEC,
    FORM_FACTORS,
    mapWavelengthToPrefix,
    mapPrefixToWavelength,
    classifyPhoton,
    createPointCloud
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QvidWavelengthMap;
  } else {
    root.QvidWavelengthMap = QvidWavelengthMap;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
