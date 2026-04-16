// beyondBINARY quantum-prefixed | uvspeed | {+1, 1, -1, +0, 0, -0, +n, n, -n}
// qvid-neural-epoc.js — EMOTIV EPOC X 14-channel EEG to DCA classification stub
// Web Bluetooth connection + band power → prefix mapping
'use strict';

(function (root) {
  const EPOC_SPEC = Object.freeze({
    name: 'EMOTIV EPOC X',
    channels: 14,
    sampleRate: 256,
    resolution: '14-bit',
    connectivity: 'BLE 5.0',
    price: 849,
    electrodes: ['AF3', 'F7', 'F3', 'FC5', 'T7', 'P7', 'O1', 'O2', 'P8', 'T8', 'FC6', 'F4', 'F8', 'AF4'],
    bands: {
      delta: { min: 0.5, max: 4, role: 'Deep processing' },
      theta: { min: 4,   max: 8, role: 'Creative ideation' },
      alpha: { min: 8,   max: 13, role: 'Relaxed awareness' },
      beta:  { min: 13,  max: 30, role: 'Active focus' },
      gamma: { min: 30,  max: 100, role: 'High-level cognition' }
    },
    prefixesPerSecond: 3584,
    pointsPerFrameAt30fps: 117
  });

  const CHANNEL_TO_DCA = Object.freeze({
    AF3:  { prefix: '+0:', gate: 'Rz', region: 'Prefrontal left',   role: 'Decision/planning → class definition' },
    AF4:  { prefix: '+0:', gate: 'Rz', region: 'Prefrontal right',  role: 'Decision/planning → class definition' },
    F3:   { prefix: '+n:', gate: 'T',  region: 'Frontal left',      role: 'Motor planning → conditionals' },
    F4:   { prefix: '+n:', gate: 'T',  region: 'Frontal right',     role: 'Motor planning → conditionals' },
    F7:   { prefix: '+1:', gate: 'H',  region: 'Temporal-frontal L', role: 'Language/context → comments' },
    F8:   { prefix: '+1:', gate: 'H',  region: 'Temporal-frontal R', role: 'Language/context → comments' },
    FC5:  { prefix: '0:',  gate: 'I',  region: 'Frontocentral left', role: 'Motor execution → function calls' },
    FC6:  { prefix: '0:',  gate: 'I',  region: 'Frontocentral right',role: 'Motor execution → function calls' },
    T7:   { prefix: '-n:', gate: 'M',  region: 'Temporal left',     role: 'Auditory/memory → imports' },
    T8:   { prefix: '-n:', gate: 'M',  region: 'Temporal right',    role: 'Auditory/memory → imports' },
    P7:   { prefix: '-1:', gate: 'X',  region: 'Parietal left',     role: 'Error detection → error handling' },
    P8:   { prefix: '-1:', gate: 'X',  region: 'Parietal right',    role: 'Error detection → error handling' },
    O1:   { prefix: '-0:', gate: 'S',  region: 'Occipital left',    role: 'Visual processing → return/output' },
    O2:   { prefix: '+3:', gate: 'Y',  region: 'Occipital right',   role: 'Visual processing → output/render' }
  });

  const BAND_TO_PREFIX = Object.freeze({
    delta: { prefix: 'n:',  gate: 'SWAP', reason: 'Deep slow waves → entry points, resets' },
    theta: { prefix: '+1:', gate: 'H',    reason: 'Creative ideation → comments, documentation' },
    alpha: { prefix: '1:',  gate: 'CNOT', reason: 'Relaxed awareness → variable assignment' },
    beta:  { prefix: '+n:', gate: 'T',    reason: 'Active focus → conditionals, decisions' },
    gamma: { prefix: '-n:', gate: 'M',    reason: 'High cognition → imports, external references' }
  });

  function classifyEEGSample(channelValues, channelNames) {
    channelNames = channelNames || EPOC_SPEC.electrodes;
    const results = [];
    for (let i = 0; i < channelNames.length; i++) {
      const name = channelNames[i];
      const mapping = CHANNEL_TO_DCA[name];
      if (!mapping) continue;
      results.push({
        electrode: name,
        value: channelValues[i] || 0,
        prefix: mapping.prefix,
        gate: mapping.gate,
        region: mapping.region,
        timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now()
      });
    }
    return results;
  }

  function mapBandPowerToPrefix(delta, theta, alpha, beta, gamma) {
    const bands = { delta, theta, alpha, beta, gamma };
    let dominant = 'alpha', maxPower = -Infinity;
    for (const [band, power] of Object.entries(bands)) {
      if (power > maxPower) { maxPower = power; dominant = band; }
    }
    return {
      dominantBand: dominant,
      ...BAND_TO_PREFIX[dominant],
      bandPowers: bands,
      confidence: maxPower / Object.values(bands).reduce((s, v) => s + v, 0)
    };
  }

  function classifyEEGFrame(channelMatrix, sampleRate) {
    sampleRate = sampleRate || EPOC_SPEC.sampleRate;
    const prefixCounts = {};
    const classifications = [];
    for (const sample of channelMatrix) {
      const results = classifyEEGSample(sample);
      for (const r of results) {
        prefixCounts[r.prefix] = (prefixCounts[r.prefix] || 0) + 1;
        classifications.push(r);
      }
    }
    return {
      totalSamples: channelMatrix.length,
      totalClassifications: classifications.length,
      prefixCounts,
      prefixesPerSecond: classifications.length * (sampleRate / channelMatrix.length),
      coverage: Object.keys(prefixCounts).length / 11 * 100,
      classifications
    };
  }

  let _bleDevice = null;
  let _onSample = null;

  async function connectBLE(onSample) {
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      throw new Error('Web Bluetooth API not available');
    }
    _onSample = onSample;
    _bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'EPOC' }],
      optionalServices: ['battery_service']
    });
    const server = await _bleDevice.gatt.connect();
    return {
      device: _bleDevice.name,
      connected: server.connected,
      note: 'Full EMOTIV data stream requires EMOTIV Cortex API (OAuth2). BLE stub provides connection verification only.'
    };
  }

  function disconnect() {
    if (_bleDevice && _bleDevice.gatt.connected) {
      _bleDevice.gatt.disconnect();
    }
    _bleDevice = null;
    _onSample = null;
  }

  const QvidNeuralEpoc = {
    EPOC_SPEC,
    CHANNEL_TO_DCA,
    BAND_TO_PREFIX,
    classifyEEGSample,
    mapBandPowerToPrefix,
    classifyEEGFrame,
    connectBLE,
    disconnect
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QvidNeuralEpoc;
  } else {
    root.QvidNeuralEpoc = QvidNeuralEpoc;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
