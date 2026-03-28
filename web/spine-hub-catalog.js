/**
 * spine-hub-catalog.js — canonical UVspeed spine / I/O map (single source of truth).
 * Used by search.html (Hub tab), kbatch.html (Spine tab), hexcast.html (Spine section).
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function () {
  'use strict';

  var ROWS = [
    ['Retrieval & spine', 'search.html, history.html, pad-datatable.html, gridlock.html, notes.html, throughline-lab.html, iron-browser.html', 'Weighted JSON + facet (Phase1); BC history-search, hexterm, quantum-prefixes; History AI export; Notes funnel localStorage', 'HTTP ~200–800ms per connector; history↔search one packet still open; offline OK via sw.js'],
    ['Kbatch lane', 'kbatch.html, kbatch-panel-body.html', 'hexterm, kbatch-training, quantum-loopback; capsules JSON; jawta bridge', 'Large capsule graph parse; rhythm RSIs CPU; live JSON fetch if remote'],
    ['Hexcast / video', 'hexcast.html, hexcast-send.html, questcast.html', 'hexcast-stream BC; MediaDevices; no server transcode in PWA', '16ms frame budget; encode + WebRTC latency; permission gates'],
    ['QPU / quantum', 'uvqbit.html, qbit-globe.html, qpu-goldie-results.html, qpu-pointcloud.html, qpu-depth-workbench.html, qpu-interactive-field.html', 'Preflight + IBM calib CSV; bloch-state BC; QASM export', 'Network to IBM; WASM path optional; preflight ABORT until gates pass'],
    ['Core Race / sim', 'qbit-core-race.html, interactive-pattern.html', 'iron-line telemetry; local sim', 'CPU canvas; not same as QPU submit path'],
    ['Terminals', 'terminal.html (HexTerm), uterm.html, qbit-raw.html, qbit-steno-term.html, games-ugrad-terminal.html', 'hexterm BC; xterm; paste-classify; T5 binary optional via bridge', 'Heavy xterm bundle; native T5 binary not in browser by default'],
    ['Notepad / studio', 'quantum-notepad.html, qbit-studio.html, research-lab.html, archflow.html, plan-viewer.html', 'Cells + export w/ quantumGutter; plan corpus index', 'Large single-file DOM; export size'],
    ['μgrad core', 'ugrad-r0.html, micrograd-steno.html, ugrad-pad-lab.html, ugrad-model-lab.html', 'WASM worker; BroadcastChannel; export checkpoints', 'Training loops block main thread if not worker-bound'],
    ['μgrad games (~35)', '*-ugrad.html, games-ugrad-hub.html, raw-games-ugrad.html, webgrid-ugrad.html, arena-ugrad.html, …', 'hexterm; ugrad-game-presence; localStorage; BC rooms', 'Canvas/WebGL per tab; embedding doubles memory if iframed'],
    ['Pad / grid', 'pad-grid.html, pad-datatable.html', 'layout JSON; isomorphic facet; HTML infer', 'Infer heuristics not AST-perfect'],
    ['Freya', 'freya.html, freya-landing.html', 'local convert; optional fetch for rates', 'Pure client math — fast'],
    ['Dashboard / ops', 'github-dashboard.html, blackwell.html, qa.html, progress.html', 'GitHub API token optional; JSON export', 'Rate limits; network'],
    ['Audio / media', 'jawta-audio.html, numsy.html, brothernumsy.html', 'Web Audio; whisper path to kbatch bridge', 'Decode latency; mic permission'],
    ['Medical / DICOM', 'qbit-medical.html', 'cornerstone; large arrays', 'Memory for volumes'],
    ['Launcher / hub shell', 'index.html → mueee.html (landing); launcher.html; full app iframes + postMessage theme sync', 'Mμ spine; Freya/Kbatch/HexCast panes ?mueee=1', 'Many iframes = RAM; cold start'],
    ['Sponsor / misc', 'sponsor.html, feed.html, grid.html, glyph.html, digital_alphabet.html', 'static + BC optional', 'Mostly static'],
    ['Iron / dispatch', 'iron-dispatch.html, iron-dispatch-v2-snapshot.html, astral-fast-toolbench.html', 'pipeline messages', 'Experimental'],
    ['qbit search / raw family', 'qbit-search.html, qbit-raw-v1/2/3.html, qbit-uv-shell.html', 'Iron Line; quantum bridge', 'Parity with uterm commands'],
    ['Steno pads', 'qbit-steno-pad.html', 'dual channel steno', '—'],
    ['Go / monitors', 'go-ugrad.html, go-ugrad-monitor.html, hub-ugrad-monitor.html', 'leaderboard JSON', 'fetch optional'],
    ['Extensions of ugrad', 'ugrad-quantum.html, ugrad-sentence.html, ugrad-contrail.html, ugrad-scout-chat.html, …', 'varies', '—'],
    ['Tests / QA', 'qa.html', 'export change order', '—'],
    ['dither / landing', 'dither-landing.html, dither-landing-scroll-lab-saved.html', 'scroll labs', '—'],
    ['Remaining HTML', '~30 more (fontlab, rubiks, typing-ugrad, …)', 'check sw.js OFFLINE_URLS', 'Same patterns: localStorage + BC + fetch']
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function filterRows(opts) {
    var rows = ROWS.slice();
    if (!opts) return rows;
    if (opts.groupsOnly && opts.groupsOnly.length) {
      rows = rows.filter(function (r) {
        return opts.groupsOnly.indexOf(r[0]) >= 0;
      });
    }
    return rows;
  }

  function renderIntoTbody(tbody, rows, opts) {
    tbody.innerHTML = '';
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      if (opts && opts.highlightGroup && r[0] === opts.highlightGroup) tr.className = 'spine-row-highlight';
      ['hub-cat', 'hub-pages', 'hub-io', 'hub-sp'].forEach(function (cls, i) {
        var td = document.createElement('td');
        td.className = cls;
        td.textContent = r[i];
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  /**
   * @param {HTMLElement} el - tbody (Search hub) or div (kbatch/hexcast full table)
   * @param {object} [opts] - highlightGroup, groupsOnly: string[]
   */
  function render(el, opts) {
    opts = opts || {};
    if (!el) return;
    var rows = filterRows(opts);
    if (el.tagName === 'TBODY') {
      renderIntoTbody(el, rows, opts);
      return;
    }
    var tableClass = opts.tableClass || 'spine-hub-table';
    var intro = opts.introHtml || '';
    el.innerHTML =
      (intro ? '<div class="spine-hub-intro">' + intro + '</div>' : '') +
      '<table class="' +
      esc(tableClass) +
      '"><thead><tr>' +
      '<th class="hub-cat">Group</th><th class="hub-pages">Pages</th><th class="hub-io">Data in / out</th><th class="hub-sp">Speed / blocker</th>' +
      '</tr></thead><tbody></tbody></table>';
    var tb = el.querySelector('tbody');
    if (tb) renderIntoTbody(tb, rows, opts);
  }

  window.SpineHubCatalog = {
    ROWS: ROWS,
    render: render
  };
})();
