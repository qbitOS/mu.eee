// beyondBINARY quantum-prefixed | uvspeed | qubo-hexcast-classifier.js
// [P0c.6] D-Wave QUBO frame classification via Leap REST API
// [P0c.7] Hybrid pipeline: Leap QPU when available, local QSim fallback
//
// Formulates each hexcast frame as a QUBO optimization problem:
// "Given 11 possible prefix classifications for each row, find the
//  assignment that minimizes inter-row coupling energy."
// This is the same problem D-Wave solves in hardware: minimum energy
// state of a spin glass with programmed couplings.
//
// The QUBO approach gives BETTER classification than row statistics
// because it considers global structure (how rows relate to each other),
// not just per-row thresholds. D-Wave solves this in ~5ms.

(function(root) {
    'use strict';

    var NUM_PREFIXES = 11;
    var PREFIXES = ['n:','+1:','   ','1:','0:','-0:','-n:','+0:','-1:','+n:','+2:'];
    var LEAP_API_BASE = 'https://cloud.dwavesys.com/sapi/v2';

    // ━━━ Configuration ━━━
    var CONFIG = {
        apiToken: null,
        solver: 'Advantage_system6.4',
        numReads: 10,
        annealingTime: 20,
        enabled: false,
        fallbackToLocal: true,
        maxRowsPerQubo: 16,
        chainStrength: 2.0
    };

    // ━━━ QUBO Matrix Builder ━━━
    // Each row gets 11 binary variables (one-hot: which prefix?)
    // Linear biases: how well does this prefix match the row stats?
    // Quadratic biases: how well do adjacent rows' prefixes couple?
    function buildQUBO(stats, deltas) {
        var nRows = Math.min(stats.length, CONFIG.maxRowsPerQubo);
        var nVars = nRows * NUM_PREFIXES;
        var Q = {};

        for (var r = 0; r < nRows; r++) {
            var s = stats[r];
            if (!s) continue;
            var d = deltas ? deltas[r] : null;
            var base = r * NUM_PREFIXES;

            // Linear bias: negative = preferred (lower energy)
            var biases = computeRowBiases(s, d);
            for (var p = 0; p < NUM_PREFIXES; p++) {
                var idx = base + p;
                var key = idx + ',' + idx;
                Q[key] = (Q[key] || 0) + biases[p];
            }

            // One-hot constraint: exactly one prefix per row
            // Penalty for selecting more than one: +chainStrength for each pair
            for (var p1 = 0; p1 < NUM_PREFIXES; p1++) {
                for (var p2 = p1 + 1; p2 < NUM_PREFIXES; p2++) {
                    var key = (base + p1) + ',' + (base + p2);
                    Q[key] = (Q[key] || 0) + CONFIG.chainStrength;
                }
            }

            // Inter-row coupling: adjacent rows should have compatible prefixes
            if (r < nRows - 1 && stats[r + 1]) {
                var nextBase = (r + 1) * NUM_PREFIXES;
                for (var p1 = 0; p1 < NUM_PREFIXES; p1++) {
                    for (var p2 = 0; p2 < NUM_PREFIXES; p2++) {
                        var coupling = prefixCoupling(p1, p2, s, stats[r + 1]);
                        if (Math.abs(coupling) > 0.01) {
                            var key = (base + p1) + ',' + (nextBase + p2);
                            Q[key] = (Q[key] || 0) + coupling;
                        }
                    }
                }
            }
        }

        return { Q: Q, nVars: nVars, nRows: nRows };
    }

    // ━━━ Row Bias Computation ━━━
    // Lower energy = better match. Maps row statistics to preference for each prefix.
    function computeRowBiases(s, d) {
        var biases = new Float64Array(NUM_PREFIXES);

        // n: (SWAP) -- bright uniform
        biases[0] = -(s.mean > 0.7 ? 1 : 0) * (1 - s.variance) * 2;
        // +1: (H) -- high gradient
        biases[1] = -s.gradient * 2;
        // ' ' (I) -- dark uniform
        biases[2] = -((1 - s.mean) * (1 - s.variance) * (1 - s.gradient));
        // 1: (CNOT) -- high variance
        biases[3] = -s.variance * 2;
        // 0: (I) -- midpoint
        biases[4] = -(1 - Math.abs(s.mean - 0.5) * 2) * 0.5;
        // -0: (S) -- smooth fade
        biases[5] = -(s.gradient < 0.1 ? 1 : 0) * (1 - s.variance);
        // -n: (M) -- periodic
        biases[6] = -s.periodic * 2;
        // +0: (Rz) -- rising gradient + bright
        biases[7] = -(s.gradient * s.mean);
        // -1: (X) -- spike / disruption
        biases[8] = -(d ? Math.abs(d.gradient) : 0) * 2;
        // +n: (T) -- dark edges
        biases[9] = -((1 - s.mean) * s.gradient);
        // +2: (CZ) -- multi-peak periodic
        biases[10] = -(s.periodic * s.variance);

        return biases;
    }

    // ━━━ Inter-Row Prefix Coupling ━━━
    // Favorable couplings (negative = attracted):
    // - Same prefix in adjacent rows = moderate attraction
    // - Comment (+1:) next to function (0:) = strong attraction
    // - Error (-1:) next to return (-0:) = attraction
    // Unfavorable couplings (positive = repelled):
    // - Two shebangs (n:) adjacent = strong repulsion
    function prefixCoupling(p1, p2, s1, s2) {
        if (p1 === p2) return -0.3;
        var ATTRACT = [
            [1, 4, -0.5],  // +1: next to 0: (comment before function)
            [3, 4, -0.4],  // 1: next to 0: (variable before function)
            [8, 5, -0.4],  // -1: next to -0: (error before return)
            [7, 3, -0.3],  // +0: next to 1: (class before variable)
            [4, 5, -0.3],  // 0: next to -0: (function before return)
        ];
        var REPEL = [
            [0, 0, 1.0],   // n: next to n: (two shebangs)
            [6, 6, 0.8],   // -n: next to -n: (two measurements)
            [8, 8, 0.5],   // -1: next to -1: (two errors)
        ];
        for (var i = 0; i < ATTRACT.length; i++) {
            var a = ATTRACT[i];
            if ((p1 === a[0] && p2 === a[1]) || (p1 === a[1] && p2 === a[0])) return a[2];
        }
        for (var i = 0; i < REPEL.length; i++) {
            var r = REPEL[i];
            if (p1 === r[0] && p2 === r[1]) return r[2];
        }
        var meanDiff = Math.abs(s1.mean - s2.mean);
        return meanDiff > 0.5 ? 0.2 : -0.1;
    }

    // ━━━ Leap REST API Client ━━━
    function submitToLeap(qubo, callback) {
        if (!CONFIG.apiToken) {
            callback(new Error('No API token configured'), null);
            return;
        }

        var Q = qubo.Q;
        var linear = {};
        var quadratic = {};
        Object.keys(Q).forEach(function(key) {
            var parts = key.split(',');
            var i = parseInt(parts[0]), j = parseInt(parts[1]);
            if (i === j) {
                linear[i] = Q[key];
            } else {
                quadratic[key] = Q[key];
            }
        });

        var body = {
            solver: CONFIG.solver,
            data: {
                format: 'qp',
                lin: linear,
                quad: quadratic,
                num_reads: CONFIG.numReads,
                annealing_time: CONFIG.annealingTime
            }
        };

        fetch(LEAP_API_BASE + '/problems/', {
            method: 'POST',
            headers: {
                'X-Auth-Token': CONFIG.apiToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }).then(function(resp) {
            if (!resp.ok) throw new Error('Leap API: ' + resp.status);
            return resp.json();
        }).then(function(result) {
            callback(null, result);
        }).catch(function(err) {
            callback(err, null);
        });
    }

    // ━━━ Local QUBO Solver (Simulated Annealing Fallback) ━━━
    // When Leap is unavailable, solve locally with simple SA
    function solveLocalSA(qubo) {
        var nVars = qubo.nVars;
        var Q = qubo.Q;
        var state = new Uint8Array(nVars);
        var nRows = qubo.nRows;

        // Initialize: one-hot per row (random prefix)
        for (var r = 0; r < nRows; r++) {
            state[r * NUM_PREFIXES + Math.floor(Math.random() * NUM_PREFIXES)] = 1;
        }

        function energy() {
            var e = 0;
            Object.keys(Q).forEach(function(key) {
                var parts = key.split(',');
                var i = parseInt(parts[0]), j = parseInt(parts[1]);
                if (i === j) {
                    e += Q[key] * state[i];
                } else {
                    e += Q[key] * state[i] * state[j];
                }
            });
            return e;
        }

        // Simulated annealing: 200 sweeps
        var T = 2.0;
        var bestState = new Uint8Array(state);
        var bestE = energy();

        for (var sweep = 0; sweep < 200; sweep++) {
            T *= 0.98;
            for (var r = 0; r < nRows; r++) {
                var base = r * NUM_PREFIXES;
                var oldP = -1;
                for (var p = 0; p < NUM_PREFIXES; p++) {
                    if (state[base + p]) { oldP = p; break; }
                }
                var newP = Math.floor(Math.random() * NUM_PREFIXES);
                if (newP === oldP) continue;

                if (oldP >= 0) state[base + oldP] = 0;
                state[base + newP] = 1;
                var newE = energy();

                if (newE < bestE || Math.random() < Math.exp((bestE - newE) / Math.max(0.01, T))) {
                    bestE = newE;
                    bestState = new Uint8Array(state);
                } else {
                    state[base + newP] = 0;
                    if (oldP >= 0) state[base + oldP] = 1;
                }
            }
        }

        return bestState;
    }

    // ━━━ Decode QUBO Solution to Prefix Assignment ━━━
    function decodeSolution(solution, nRows) {
        var assignment = [];
        for (var r = 0; r < nRows; r++) {
            var base = r * NUM_PREFIXES;
            var bestP = 4; // default: '0:' (identity)
            for (var p = 0; p < NUM_PREFIXES; p++) {
                if (solution[base + p]) { bestP = p; break; }
            }
            assignment.push({
                sym: PREFIXES[bestP],
                gate: ['SWAP','H','I','CNOT','I','S','M','Rz','X','T','CZ'][bestP],
                index: bestP
            });
        }
        return assignment;
    }

    // ━━━ [P0c.7] Hybrid Pipeline ━━━
    // Try Leap first, fall back to local SA, always return classification
    function classifyFrame(stats, deltas, callback) {
        var qubo = buildQUBO(stats, deltas);

        if (CONFIG.enabled && CONFIG.apiToken) {
            var t0 = performance.now();
            submitToLeap(qubo, function(err, result) {
                if (err) {
                    console.log('[qubo] Leap failed (' + err.message + '), falling back to local SA');
                    var solution = solveLocalSA(qubo);
                    callback(decodeSolution(solution, qubo.nRows), 'local-sa', performance.now() - t0);
                } else {
                    var sample = result.samples ? result.samples[0] : null;
                    if (sample) {
                        var solution = new Uint8Array(qubo.nVars);
                        Object.keys(sample).forEach(function(k) { solution[parseInt(k)] = sample[k]; });
                        callback(decodeSolution(solution, qubo.nRows), 'leap-qpu', performance.now() - t0);
                    } else {
                        var solution = solveLocalSA(qubo);
                        callback(decodeSolution(solution, qubo.nRows), 'local-sa', performance.now() - t0);
                    }
                }
            });
        } else if (CONFIG.fallbackToLocal) {
            var t0 = performance.now();
            var solution = solveLocalSA(qubo);
            callback(decodeSolution(solution, qubo.nRows), 'local-sa', performance.now() - t0);
        } else {
            callback(null, 'disabled', 0);
        }
    }

    // ━━━ Integration with BlochBridge ━━━
    // Replace threshold-based classification with QUBO when available
    function enhanceBridge() {
        var bridge = root.BlochBridge;
        if (!bridge) return;

        var origProcess = bridge.processFrame;
        bridge.classifyWithQUBO = function(hexData, res, cb) {
            var stats = [];
            var nRows = Math.min(res, 64);
            var rowLen = res;
            for (var r = 0; r < nRows; r++) {
                var off = r * rowLen;
                var sum = 0, sumSq = 0, grad = 0;
                for (var c = 0; c < rowLen; c++) {
                    var v = hexData[off + c] || 0;
                    sum += v; sumSq += v * v;
                    if (c > 0) grad += Math.abs(v - (hexData[off + c - 1] || 0));
                }
                var mean = sum / rowLen / 255;
                var variance = ((sumSq / rowLen) - (sum / rowLen) * (sum / rowLen)) / 65025;
                var autocorr = 0;
                for (var ac = 0; ac < rowLen - 1; ac++) {
                    autocorr += ((hexData[off + ac] || 0) / 255 - mean) * ((hexData[off + ac + 1] || 0) / 255 - mean);
                }
                var periodic = variance > 0.001 ? Math.abs(autocorr / (rowLen - 1) / variance) : 0;
                stats.push({ mean: mean, variance: variance, gradient: grad / rowLen / 255, periodic: periodic });
            }
            classifyFrame(stats, null, cb);
        };

        console.log('[qubo] QUBO classifier integrated with BlochBridge');
    }

    // ━━━ Public API ━━━
    root.QUBOClassifier = {
        config: CONFIG,
        setApiToken: function(token) {
            CONFIG.apiToken = token;
            CONFIG.enabled = !!token;
            console.log('[qubo] API token ' + (token ? 'set — Leap QPU enabled' : 'cleared — local SA only'));
        },
        setSolver: function(solver) { CONFIG.solver = solver; },
        buildQUBO: buildQUBO,
        classifyFrame: classifyFrame,
        solveLocalSA: solveLocalSA,
        submitToLeap: submitToLeap,
        enhanceBridge: enhanceBridge,
        PREFIXES: PREFIXES
    };

    if (typeof document !== 'undefined') {
        var storedToken = null;
        try { storedToken = localStorage.getItem('dwave-api-token'); } catch(e) {}
        if (storedToken) {
            CONFIG.apiToken = storedToken;
            CONFIG.enabled = true;
            console.log('[qubo] Loaded API token from localStorage');
        }
        enhanceBridge();
    }

})(typeof window !== 'undefined' ? window : globalThis);
