/**
 * search-drill-cluster.js — Interest cluster / drill session for μ'search doc viewer.
 * Persists pivots, BroadcastChannel (in + out), localStorage. Bridges μgrad R0 tensor / checkpoint → cluster.
 * buildPromptPack / export → transformer & LLM prompt pipeline (slice → product).
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function () {
    'use strict';

    var VERSION = 1;
    var LS_KEY = 'search-drill-cluster-v1';
    var CH = 'search-drill-cluster';
    var PROMPT_SCHEMA = 'uvspeed-search-drill-prompt-v1';
    var bc = null;
    try {
        bc = new BroadcastChannel(CH);
    } catch (e) {}

    var _current = null;

    function ts() {
        return Date.now();
    }

    function createCluster(seedQuery, doc) {
        return {
            v: VERSION,
            id: 'c_' + ts() + '_' + Math.random().toString(36).slice(2, 10),
            seedQuery: (seedQuery || '').trim(),
            createdAt: ts(),
            updatedAt: ts(),
            docAnchor: doc
                ? {
                      url: doc.url || '',
                      title: doc.title || '',
                      source: doc.source || ''
                  }
                : null,
            pivots: [],
            model: {
                embeddingSchema: 'none',
                tensorSliceRef: null,
                lastTensorMeta: null,
                ugradCheckpointRef: null,
                promptPackVersion: '1'
            }
        };
    }

    function ensureModel(c) {
        if (!c.model) c.model = {};
        if (c.model.embeddingSchema == null) c.model.embeddingSchema = 'none';
        if (c.model.promptPackVersion == null) c.model.promptPackVersion = '1';
        return c.model;
    }

    function save(c) {
        if (!c) return;
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(c));
        } catch (e) {}
    }

    function load() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            var o = JSON.parse(raw);
            if (!o || o.v !== VERSION) return null;
            return o;
        } catch (e) {
            return null;
        }
    }

    function emit(msg) {
        var payload = Object.assign({ ts: ts() }, msg);
        if (bc) {
            try {
                bc.postMessage(payload);
            } catch (e1) {}
        }
        try {
            window.dispatchEvent(new CustomEvent('search-drill-cluster', { detail: payload }));
        } catch (e2) {}
    }

    function getCurrent() {
        if (_current) return _current;
        return load();
    }

    function attachViewer(seedQuery, doc) {
        var existing = load();
        if (existing && doc && existing.docAnchor && existing.docAnchor.url === (doc.url || '')) {
            _current = existing;
            _current.updatedAt = ts();
            if (seedQuery && !_current.seedQuery) _current.seedQuery = seedQuery.trim();
            save(_current);
            emit({ type: 'attach', cluster: _current });
            return _current;
        }
        _current = createCluster(seedQuery, doc);
        save(_current);
        emit({ type: 'session', cluster: _current });
        return _current;
    }

    function appendPivot(p) {
        var c = getCurrent();
        if (!c) {
            c = createCluster(p.seedQuery || p.q || '', null);
            _current = c;
            save(c);
        }
        c.pivots.push({
            q: (p.q || '').trim(),
            spine: p.spine || '',
            kind: p.kind || 'highlight',
            ts: ts()
        });
        c.updatedAt = ts();
        save(c);
        emit({ type: 'pivot', cluster: c, pivot: c.pivots[c.pivots.length - 1] });
    }

    function setTensorRef(ref, meta) {
        var c = getCurrent();
        if (!c) return;
        ensureModel(c);
        c.model.tensorSliceRef = ref || null;
        c.model.lastTensorMeta = meta || null;
        c.updatedAt = ts();
        save(c);
        emit({ type: 'model', cluster: c, field: 'tensorSliceRef' });
    }

    function setUgradCheckpoint(ref) {
        var c = getCurrent();
        if (!c) return;
        ensureModel(c);
        c.model.ugradCheckpointRef = ref || null;
        c.updatedAt = ts();
        save(c);
        emit({ type: 'model', cluster: c, field: 'ugradCheckpointRef' });
    }

    function setEmbeddingSchema(schema) {
        var c = getCurrent();
        if (!c) return;
        ensureModel(c);
        c.model.embeddingSchema = schema || 'none';
        c.updatedAt = ts();
        save(c);
        emit({ type: 'model', cluster: c, field: 'embeddingSchema' });
    }

    function setPromptPackVersion(v) {
        var c = getCurrent();
        if (!c) return;
        ensureModel(c);
        c.model.promptPackVersion = String(v != null ? v : '1');
        c.updatedAt = ts();
        save(c);
        emit({ type: 'model', cluster: c, field: 'promptPackVersion' });
    }

    function buildPromptPack() {
        var c = getCurrent();
        if (!c) return null;
        var m = ensureModel(c);
        var lines = [];
        lines.push('Research context (uvspeed drill cluster)');
        lines.push('Seed query: ' + (c.seedQuery || ''));
        if (c.docAnchor && c.docAnchor.title) lines.push('Open document: ' + c.docAnchor.title);
        if (c.pivots && c.pivots.length) {
            lines.push('Pivots (newest last):');
            c.pivots.forEach(function (p, i) {
                lines.push('  ' + (i + 1) + '. ' + p.q + (p.spine ? ' [spine:' + p.spine + ']' : ''));
            });
        }
        if (m.tensorSliceRef) lines.push('Tensor slice ref: ' + m.tensorSliceRef);
        if (m.ugradCheckpointRef) lines.push('μgrad checkpoint ref: ' + m.ugradCheckpointRef);
        lines.push('Embedding schema: ' + (m.embeddingSchema || 'none'));
        return {
            schema: PROMPT_SCHEMA,
            promptPackVersion: m.promptPackVersion || '1',
            exportedAt: ts(),
            producer: 'search.html + SearchDrillCluster',
            cluster: c,
            suggestedUserPrompt: lines.join('\n'),
            suggestedSystemPrompt:
                'You are a research assistant. Use the structured cluster (seed, document anchor, pivots, tensor/checkpoint refs) to answer precisely and cite uncertainty. Prefer primary sources when the user asks for verification.'
        };
    }

    function exportJSON() {
        var c = getCurrent();
        return c ? JSON.stringify(c) : '{}';
    }

    function exportPromptPackJSON() {
        var p = buildPromptPack();
        return p ? JSON.stringify(p, null, 2) : '{}';
    }

    function downloadPromptPack(filename) {
        var p = buildPromptPack();
        if (!p) return;
        var blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename || 'search-drill-prompt-pack.json';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    function clear() {
        _current = null;
        try {
            localStorage.removeItem(LS_KEY);
        } catch (e) {}
        emit({ type: 'clear' });
    }

    /** Inbound: μgrad-r0, tests, or parent window.postMessage */
    if (bc) {
        bc.onmessage = function (ev) {
            var d = ev.data;
            if (!d || !d.type) return;
            if (d.type === 'tensor-ref') setTensorRef(d.ref, d.meta);
            else if (d.type === 'ugrad-checkpoint') setUgradCheckpoint(d.ref);
            else if (d.type === 'embedding-schema') setEmbeddingSchema(d.schema);
            else if (d.type === 'prompt-pack-version') setPromptPackVersion(d.version);
        };
    }

    try {
        window.addEventListener('message', function (ev) {
            var d = ev.data;
            if (!d || d.source !== 'uvspeed-search-drill') return;
            if (d.type === 'tensor-ref') setTensorRef(d.ref, d.meta);
            else if (d.type === 'ugrad-checkpoint') setUgradCheckpoint(d.ref);
            else if (d.type === 'embedding-schema') setEmbeddingSchema(d.schema);
            else if (d.type === 'prompt-pack-version') setPromptPackVersion(d.version);
        });
    } catch (e3) {}

    window.SearchDrillCluster = {
        VERSION: VERSION,
        PROMPT_SCHEMA: PROMPT_SCHEMA,
        CHANNEL: CH,
        attachViewer: attachViewer,
        appendPivot: appendPivot,
        setTensorRef: setTensorRef,
        setUgradCheckpoint: setUgradCheckpoint,
        setEmbeddingSchema: setEmbeddingSchema,
        setPromptPackVersion: setPromptPackVersion,
        buildPromptPack: buildPromptPack,
        getCurrent: getCurrent,
        clear: clear,
        exportJSON: exportJSON,
        exportPromptPackJSON: exportPromptPackJSON,
        downloadPromptPack: downloadPromptPack
    };
})();
