// beyondBINARY quantum-prefixed | uvspeed | bloch-video-renderer.js
// Multi-mode .qvid renderer: Bloch sphere array, spin ring, magnetization heatmap,
// point cloud, entanglement topology. Canvas 2D (no Three.js dependency).
// Renders from live BroadcastChannel or decoded .qvid frames.

(function(root) {
    'use strict';

    var PI = Math.PI;
    var TAU = 2 * PI;

    // ━━━ Bloch Sphere (single) ━━━
    function drawBloch(ctx, cx, cy, r, theta, phi, color, predicted) {
        ctx.save();
        // Sphere outline
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        // Equator
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.28, 0, 0, TAU); ctx.stroke();
        // Meridian
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.28, r, 0, 0, TAU); ctx.stroke();
        // Axes
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();

        // State vector
        var bx = Math.sin(theta) * Math.cos(phi);
        var by = Math.sin(theta) * Math.sin(phi);
        var bz = Math.cos(theta);
        var px = cx + r * (bx + by * 0.28) * 0.82;
        var py = cy - r * (bz + by * 0.14) * 0.82;

        ctx.strokeStyle = color || '#58a6ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
        ctx.fillStyle = color || '#58a6ff';
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, TAU); ctx.fill();

        // Predicted ghost
        if (predicted) {
            var pbx = Math.sin(predicted.theta) * Math.cos(predicted.phi);
            var pby = Math.sin(predicted.theta) * Math.sin(predicted.phi);
            var pbz = Math.cos(predicted.theta);
            var ppx = cx + r * (pbx + pby * 0.28) * 0.82;
            var ppy = cy - r * (pbz + pby * 0.14) * 0.82;
            ctx.strokeStyle = 'rgba(88,166,255,0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ppx, ppy); ctx.stroke();
            ctx.setLineDash([]);
        }

        // Pole labels
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = (r > 20 ? 7 : 5) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('|0\u27E9', cx, cy - r - 2);
        ctx.fillText('|1\u27E9', cx, cy + r + (r > 20 ? 8 : 6));
        ctx.restore();
    }

    // ━━━ Bloch Strip (array of spheres) ━━━
    function drawBlochStrip(canvas, qubits, predictions) {
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        var nq = qubits.length;
        var sz = Math.min(h - 4, Math.floor(w / nq) - 4);
        var r = sz / 2 - 2;
        var colors = ['#58a6ff','#f778ba','#7ee787','#d2a8ff','#ffa657','#79c0ff','#ff7b72','#e3b341'];
        for (var q = 0; q < nq; q++) {
            var cx = (q + 0.5) * (w / nq);
            var cy = h / 2;
            var pred = predictions ? predictions[q] : null;
            drawBloch(ctx, cx, cy, r, qubits[q].theta, qubits[q].phi, colors[q % 8], pred);
        }
    }

    // ━━━ Spin Ring (circular) ━━━
    function drawSpinRing(canvas, ring, coneRadius) {
        var ctx = canvas.getContext('2d');
        var sz = canvas.width;
        var cx = sz / 2, cy = sz / 2, R = sz / 2 - 6;
        ctx.clearRect(0, 0, sz, sz);
        if (!ring || ring.length === 0) return;
        var n = ring.length;
        var step = TAU / n;

        // Light cone arc
        if (coneRadius > 0) {
            var coneAngle = (coneRadius / n) * TAU;
            ctx.strokeStyle = 'rgba(88,166,255,0.15)';
            ctx.lineWidth = R * 0.3;
            ctx.beginPath();
            ctx.arc(cx, cy, R * 0.7, -PI / 2 - coneAngle, -PI / 2 + coneAngle);
            ctx.stroke();
        }

        // Ring connections
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        for (var i = 0; i < n; i++) {
            var a1 = i * step - PI / 2;
            var a2 = ((i + 1) % n) * step - PI / 2;
            ctx.beginPath();
            ctx.moveTo(cx + R * Math.cos(a1), cy + R * Math.sin(a1));
            ctx.lineTo(cx + R * Math.cos(a2), cy + R * Math.sin(a2));
            ctx.stroke();
        }

        // Spin nodes
        for (var i = 0; i < n; i++) {
            var a = i * step - PI / 2;
            var x = cx + R * Math.cos(a);
            var y = cy + R * Math.sin(a);
            var v = ring[i] || 0;
            var rr = Math.max(0, Math.min(255, Math.round(128 + v * 127)));
            var bb = Math.max(0, Math.min(255, Math.round(128 - v * 127)));
            ctx.fillStyle = 'rgb(' + rr + ',100,' + bb + ')';
            var nr = Math.max(1, 1.5 + Math.abs(v) * 2);
            ctx.beginPath(); ctx.arc(x, y, nr, 0, TAU); ctx.fill();
        }
    }

    // ━━━ Magnetization Heatmap ━━━
    function drawHeatmap(canvas, history) {
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        if (!history || history.length === 0) return;
        var ringSize = history[0].length || 120;
        var frames = history.length;
        var cellW = w / ringSize;
        var cellH = h / frames;

        for (var t = 0; t < frames; t++) {
            var row = history[t];
            for (var i = 0; i < ringSize; i++) {
                var v = row[i] || 0;
                var rr = Math.max(0, Math.min(255, Math.round(128 + v * 127)));
                var bb = Math.max(0, Math.min(255, Math.round(128 - v * 127)));
                ctx.fillStyle = 'rgb(' + rr + ',100,' + bb + ')';
                ctx.fillRect(Math.floor(i * cellW), Math.floor(t * cellH),
                    Math.ceil(cellW) + 1, Math.ceil(cellH) + 1);
            }
        }
    }

    // ━━━ Fidelity / Convergence Gauge ━━━
    function drawGauge(canvas, fidelity, kzConvergence, mode) {
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Fidelity bar
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h / 2 - 1);
        var fW = Math.max(0, Math.min(1, fidelity)) * w;
        ctx.fillStyle = fidelity > 0.7 ? '#7ee787' : fidelity > 0.4 ? '#ffa657' : '#ff7b72';
        ctx.fillRect(0, 0, fW, h / 2 - 1);
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.fillText('F:' + (fidelity * 100).toFixed(0) + '%', 3, h / 2 - 4);

        // KZ bar
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, h / 2 + 1, w, h / 2 - 1);
        var kW = Math.max(0, Math.min(1, kzConvergence)) * w;
        ctx.fillStyle = kzConvergence > 0.7 ? '#58a6ff' : '#d2a8ff';
        ctx.fillRect(0, h / 2 + 1, kW, h / 2 - 1);
        ctx.fillStyle = '#fff';
        ctx.fillText('KZ:' + (kzConvergence * 100).toFixed(0) + '% ' + (mode || ''), 3, h - 3);
    }

    // ━━━ Prefix Distribution Bar ━━━
    function drawPrefixBars(canvas, dist) {
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        var syms = ['n:','+1:','1:','+0:','0:','-0:','-1:','+n:','-n:','+2:','+3:'];
        var colors = ['#79c0ff','#58a6ff','#d2a8ff','#ffa657','#8b949e','#7ee787','#ff7b72','#f0883e','#388bfd','#e3b341','#f778ba'];
        var total = 0;
        syms.forEach(function(s) { total += (dist[s] || 0); });
        if (total === 0) return;
        var x = 0;
        for (var i = 0; i < syms.length; i++) {
            var count = dist[syms[i]] || 0;
            var bw = (count / total) * w;
            if (bw > 0.5) {
                ctx.fillStyle = colors[i];
                ctx.fillRect(x, 0, bw, h);
            }
            x += bw;
        }
    }

    // ━━━ Composite Renderer ━━━
    function QvidRenderer(opts) {
        this.blochCanvas = opts.blochCanvas || null;
        this.ringCanvas = opts.ringCanvas || null;
        this.heatmapCanvas = opts.heatmapCanvas || null;
        this.gaugeCanvas = opts.gaugeCanvas || null;
        this.prefixCanvas = opts.prefixCanvas || null;
        this.history = [];
        this.maxHistory = 150;
    }

    QvidRenderer.prototype.render = function(state) {
        if (!state) return;
        if (state.qubits && this.blochCanvas) {
            var preds = state.qubits.map(function(q) {
                return { theta: q.predicted_theta || q.theta, phi: q.predicted_phi || q.phi };
            });
            drawBlochStrip(this.blochCanvas, state.qubits, preds);
        }
        if (state.spinRing && this.ringCanvas) {
            drawSpinRing(this.ringCanvas, state.spinRing, state.lightConeRadius || 0);
        }
        if (state.spinRing) {
            this.history.push(Array.isArray(state.spinRing) ? state.spinRing : Array.from(state.spinRing));
            if (this.history.length > this.maxHistory) this.history.shift();
        }
        if (this.heatmapCanvas) {
            drawHeatmap(this.heatmapCanvas, this.history);
        }
        if (this.gaugeCanvas) {
            drawGauge(this.gaugeCanvas, state.fidelity || 0, state.kzConvergence || 0, state.mode);
        }
        if (state.prefixDistribution && this.prefixCanvas) {
            drawPrefixBars(this.prefixCanvas, state.prefixDistribution);
        }
    };

    // ━━━ Playback from .qvid ━━━
    QvidRenderer.prototype.playQvid = function(qvidData, onComplete) {
        var decoded = root.QvidCodec ? root.QvidCodec.decode(qvidData) : null;
        if (!decoded) return;
        var self = this;
        var idx = 0;
        var interval = 1000 / (decoded.header.fps || 30);
        var timer = setInterval(function() {
            if (idx >= decoded.frames.length) {
                clearInterval(timer);
                if (onComplete) onComplete();
                return;
            }
            self.render(decoded.frames[idx]);
            idx++;
        }, interval);
        return { stop: function() { clearInterval(timer); } };
    };

    root.QvidRenderer = QvidRenderer;
    root.QvidDraw = {
        drawBloch: drawBloch,
        drawBlochStrip: drawBlochStrip,
        drawSpinRing: drawSpinRing,
        drawHeatmap: drawHeatmap,
        drawGauge: drawGauge,
        drawPrefixBars: drawPrefixBars
    };

})(typeof window !== 'undefined' ? window : globalThis);
