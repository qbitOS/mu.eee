/**
 * mueee-throughline-spine.js — Tonnetz throughline backbone for mueee.html (parent shell only).
 * BroadcastChannel('mueee-throughline') + postMessage to child iframes for loopable spine sync.
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function () {
  'use strict';

  /** Spine order = gridlock-throughline-spine plan (loop closes Search ↔ Notes ↔ Search). */
  var ORDER = [
    'search',
    'history',
    'pad',
    'kbatch',
    'hexcast',
    'jawta',
    'research',
    'throughline',
    'games',
    'brothernumsy',
    'globe',
    'uvqbit',
    'corerace',
    'gridlock',
    'notes'
  ];

  var LABELS = {
    search: 'Search',
    history: 'History',
    pad: 'GridPad',
    kbatch: 'Kbatch',
    hexcast: 'Hexcast',
    jawta: 'Jawta',
    research: 'Research',
    throughline: 'Throughline',
    games: 'Games',
    brothernumsy: 'Brother Numsy',
    globe: 'QPU',
    uvqbit: 'uvQbit',
    corerace: 'Core Race',
    gridlock: 'Gridlock',
    notes: 'Notes'
  };

  var bc = null;
  try {
    bc = new BroadcastChannel('mueee-throughline');
  } catch (e) {}

  function postToAllFrames(framesMap, msg) {
    if (!framesMap) return;
    Object.keys(framesMap).forEach(function (k) {
      var fr = framesMap[k];
      if (!fr || !fr.contentWindow) return;
      if (fr.getAttribute('data-src') && fr.dataset.mueeeLoaded !== '1') return;
      try {
        fr.contentWindow.postMessage(msg, '*');
      } catch (e) {}
    });
  }

  function buildBar(wrapEl, switchToPane) {
    var bar = wrapEl.querySelector('#mueee-throughline-bar');
    if (!bar || bar.dataset.built === '1') return;
    bar.dataset.built = '1';
    bar.innerHTML = '';
    ORDER.forEach(function (pane, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mueee-tl-step';
      b.dataset.pane = pane;
      b.textContent = LABELS[pane] || pane;
      b.title = 'Tonnetz spine — open ' + (LABELS[pane] || pane);
      b.addEventListener('click', function () {
        switchToPane(pane);
      });
      bar.appendChild(b);
      if (i < ORDER.length - 1) {
        var sep = document.createElement('span');
        sep.className = 'mueee-tl-conn';
        sep.textContent = '\u2192';
        sep.setAttribute('aria-hidden', 'true');
        bar.appendChild(sep);
      }
    });
    var loopBtn = document.createElement('button');
    loopBtn.type = 'button';
    loopBtn.className = 'mueee-tl-loop';
    loopBtn.textContent = '\u21BB loop';
    loopBtn.title = 'Close loop — back to Search (throughline record seeds next retrieval)';
    loopBtn.addEventListener('click', function () {
      switchToPane('search');
    });
    bar.appendChild(loopBtn);
  }

  var _trail = [];
  var _maxTrail = 24;

  var SESSION_KEY = 'mueee-spine-session-v1';
  var SESSION_FACET = 'mueee-spine-session-v1';
  var MAX_BLOCKS = 32;

  function _genId(prefix) {
    return (prefix || 'blk') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || o.facetVersion !== 1 || o.facetLabel !== SESSION_FACET) return null;
      return o;
    } catch (e) {
      return null;
    }
  }

  function saveSession(sess) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    } catch (e2) {}
  }

  function ensureSession() {
    var s = loadSession();
    if (s) return s;
    s = {
      facetVersion: 1,
      facetLabel: SESSION_FACET,
      sessionId: _genId('mss'),
      spineOrder: ORDER.slice(),
      trail: [],
      blocks: [],
      learningLoop: {
        searchDrillClusterId: null,
        ugradTensorRef: null,
        transformerCheckpointRef: null
      }
    };
    saveSession(s);
    return s;
  }

  function trimBlocks(blocks) {
    if (!blocks || blocks.length <= MAX_BLOCKS) return blocks || [];
    return blocks.slice(-MAX_BLOCKS);
  }

  function ingestBlock(ev) {
    var d = ev && ev.data;
    if (!d || d.type !== 'mueee-spine-block') return;
    var pane = d.pane || '';
    var block = d.block || {};
    if (!pane || !block.kind) return;
    var s = ensureSession();
    var entry = {
      id: _genId('blk'),
      pane: pane,
      ts: Date.now(),
      kind: String(block.kind),
      payload: block.payload != null ? block.payload : {},
      provenance: { href: d.href || (typeof location !== 'undefined' ? location.href : '') }
    };
    s.blocks = trimBlocks((s.blocks || []).concat([entry]));
    saveSession(s);
    if (bc) {
      try {
        bc.postMessage({
          type: 'mueee-spine-session',
          sessionId: s.sessionId,
          lastBlock: entry,
          blockCount: s.blocks.length
        });
      } catch (e3) {}
    }
  }

  try {
    window.addEventListener('message', function (ev) {
      if (!ev || !ev.data) return;
      if (ev.data.type === 'mueee-spine-block') ingestBlock(ev);
    });
  } catch (eMsg) {}

  function sessionSummary() {
    var s = loadSession();
    if (!s) return null;
    return {
      facetVersion: s.facetVersion,
      facetLabel: s.facetLabel,
      sessionId: s.sessionId,
      blockCount: (s.blocks && s.blocks.length) || 0,
      learningLoop: s.learningLoop || {}
    };
  }

  function setActivePane(pane, framesMap) {
    document.querySelectorAll('.mueee-tl-step').forEach(function (el) {
      el.classList.toggle('on', el.dataset.pane === pane);
    });
    try {
      _trail.push({ pane: pane, ts: Date.now() });
      if (_trail.length > _maxTrail) _trail.shift();
      localStorage.setItem('mueee-throughline-trail', JSON.stringify(_trail.slice(-12)));
      localStorage.setItem('mueee-active-pane', pane);
    } catch (e) {}
    var sessSnap = sessionSummary();
    var msg = {
      type: 'mueee-throughline',
      pane: pane,
      trail: _trail.slice(-8),
      spineOrder: ORDER,
      session: sessSnap
    };
    if (bc) {
      try {
        bc.postMessage(msg);
      } catch (e2) {}
    }
    postToAllFrames(framesMap, msg);
  }

  /**
   * @param {Object} opts - wrapId, framesMap (pane key -> iframe el), switchToPane(pane)
   */
  function init(opts) {
    opts = opts || {};
    var wrap = document.getElementById(opts.wrapId || 'mueee-throughline-wrap');
    if (!wrap) return;
    buildBar(wrap, opts.switchToPane || function () {});
  }

  window.MueeeThroughlineSpine = {
    ORDER: ORDER,
    LABELS: LABELS,
    SESSION_KEY: SESSION_KEY,
    init: init,
    setActivePane: setActivePane,
    buildBar: buildBar,
    loadSession: loadSession,
    ensureSession: ensureSession,
    sessionSummary: sessionSummary,
    ingestBlock: function (data) {
      ingestBlock({ data: data });
    }
  };
})();
