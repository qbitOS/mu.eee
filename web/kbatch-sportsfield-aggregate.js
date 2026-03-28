(function () {
    'use strict';
    var STORE = 'kbatch-sportsfield-aggregate-v1';
    var MAX = 2500;
    var lastTrain = 0;
    var replayTimer = null;

    function $(id) { return document.getElementById(id); }

    function loadStore() {
        try {
            var raw = localStorage.getItem(STORE);
            if (!raw) return { events: [] };
            var o = JSON.parse(raw);
            return o && Array.isArray(o.events) ? o : { events: [] };
        } catch (e) {
            return { events: [] };
        }
    }

    function saveStore(o) {
        try {
            localStorage.setItem(STORE, JSON.stringify(o));
        } catch (e) {}
    }

    function pushTranscriptLine(html) {
        var el = $('kb-sf-transcript');
        if (!el || !$('kb-sf-log') || !$('kb-sf-log').checked) return;
        var row = document.createElement('div');
        row.innerHTML = html;
        el.insertBefore(row, el.firstChild);
        while (el.children.length > 120) el.removeChild(el.lastChild);
    }

    function formatTeleLine(d) {
        var m = d.meters || {};
        var vx = (d.velocityMs && d.velocityMs.vx) || 0;
        var vy = (d.velocityMs && d.velocityMs.vy) || 0;
        var sp = Math.sqrt(vx * vx + vy * vy);
        var sa = d.shotAnalysis;
        if (!sa && window.SportsfieldShot && typeof m.x === 'number' && typeof m.y === 'number') {
            try {
                sa = window.SportsfieldShot.analyze({ x: m.x, y: m.y, vx: vx, vy: vy });
            } catch (e) {
                sa = null;
            }
        }
        var xg = sa && typeof sa.xG === 'number' ? sa.xG.toFixed(2) : '\u2014';
        var mouth = sa ? (sa.intersectsGoalMouth ? 'mouth\u2713' : 'mouth\u2717') : '\u2014';
        var kind = d.shot && d.shot.kind ? String(d.shot.kind) : '';
        return (
            '\u26BD ' +
            (typeof m.x === 'number' ? m.x.toFixed(1) : '?') +
            'm,' +
            (typeof m.y === 'number' ? m.y.toFixed(1) : '?') +
            'm \u00b7 v ' +
            sp.toFixed(1) +
            'm/s \u00b7 xG ' +
            xg +
            ' \u00b7 ' +
            mouth +
            (kind ? ' \u00b7 ' + kind : '')
        );
    }

    function plainTrainingLine(d) {
        return formatTeleLine(d).replace(/\u26BD/g, 'ball').replace(/\u00b7/g, '|');
    }

    function publishKbTranscript(line, payload) {
        try {
            var bc = new BroadcastChannel('kbatch-transcript');
            bc.postMessage({
                type: 'sportsfield-teleprompter',
                source: 'kbatch',
                line: line,
                payload: payload || null,
                ts: Date.now()
            });
            bc.close();
        } catch (e) {}
    }

    function publishTrainingPacket(text, meta) {
        try {
            var bc = new BroadcastChannel('kbatch-training');
            bc.postMessage({
                type: 'sportsfield-training-line',
                source: 'kbatch',
                text: text,
                meta: meta || {},
                ts: Date.now()
            });
            bc.close();
        } catch (e) {}
    }

    function maybeTrainKbatch(d) {
        if (!$('kb-sf-train') || !$('kb-sf-train').checked) return;
        var t = Date.now();
        if (t - lastTrain < 380) return;
        lastTrain = t;
        var line = plainTrainingLine(d) + ' ';
        if (window.kbatch && typeof window.kbatch.processText === 'function') {
            try {
                window.kbatch.processText(line);
            } catch (e) {}
        }
        publishTrainingPacket(line.trim(), { shotAnalysis: d.shotAnalysis || null });
    }

    function handleHexcast(ev) {
        if (!$('kb-sf-enable') || !$('kb-sf-enable').checked) return;
        var d = ev.data;
        if (!d) return;
        if (d.type !== 'sportsfield-ball' && d.type !== 'sportsfield-telemetry') return;

        var tele = $('kb-sf-tele');
        if (tele) tele.textContent = formatTeleLine(d);

        var ts = new Date().toISOString().slice(11, 19);
        pushTranscriptLine('<span style="color:#484f58;">' + ts + '</span> ' + formatTeleLine(d));

        publishKbTranscript(formatTeleLine(d), d);

        if (!d._kbReplay) {
            var st = loadStore();
            st.events.push({ ts: Date.now(), type: d.type, payload: d });
            if (st.events.length > MAX) st.events = st.events.slice(-MAX);
            saveStore(st);
            var cnt = $('kb-sf-count');
            if (cnt) cnt.textContent = st.events.length + ' saved';
        }

        maybeTrainKbatch(d);
    }

    function wire() {
        var en = $('kb-sf-enable');
        var tr = $('kb-sf-train');
        var lg = $('kb-sf-log');
        if (!en) return;
        try {
            var hc = new BroadcastChannel('hexcast-stream');
            hc.onmessage = handleHexcast;
            window.__kbatchHexcastStream = hc;
        } catch (e) {}

        if ($('kb-sf-clear')) $('kb-sf-clear').onclick = function () {
            saveStore({ events: [] });
            var el = $('kb-sf-transcript');
            if (el) el.innerHTML = '';
            var cnt = $('kb-sf-count');
            if (cnt) cnt.textContent = '0 saved';
        };

        if ($('kb-sf-export')) $('kb-sf-export').onclick = function () {
            var st = loadStore();
            var blob = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'kbatch-sportsfield-aggregate.json';
            a.click();
            URL.revokeObjectURL(a.href);
        };

        if ($('kb-sf-replay')) $('kb-sf-replay').onclick = function () {
            if (replayTimer) {
                clearInterval(replayTimer);
                replayTimer = null;
                return;
            }
            var st = loadStore();
            var evs = st.events || [];
            if (!evs.length) return;
            var i = 0;
            replayTimer = setInterval(function () {
                if (i >= evs.length) {
                    clearInterval(replayTimer);
                    replayTimer = null;
                    return;
                }
                var item = evs[i++];
                var raw = item.payload || item;
                var p = Object.assign({}, raw, { _kbReplay: true });
                try {
                    var ch = new BroadcastChannel('hexcast-stream');
                    ch.postMessage(p);
                    ch.close();
                } catch (e) {}
            }, 90);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wire);
    } else {
        wire();
    }
})();
