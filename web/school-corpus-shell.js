/* beyondBINARY quantum-prefixed | uvspeed | school-corpus tab shell + native kbatch */
(function () {
  'use strict';

  var KBATCH_TITLE = {
    analyzer: 'Analyzer',
    layouts: 'Layouts',
    dictionary: 'Dictionary',
    quantum: 'Quantum',
    training: 'Training',
    capsules: 'Capsules',
    contrails: 'Contrails',
    musica: 'Musica',
    symbollab: 'Symbol lab',
    lattice: 'Lattice'
  };

  var DOC_TITLE_BASE = 'School corpus';

  var panels = {
    overview: document.getElementById('sch-panel-overview'),
    glyph: document.getElementById('sch-panel-glyph'),
    kbatch: document.getElementById('sch-panel-kbatch')
  };

  function highlightNav(state) {
    document.querySelectorAll('.sch-nav-btn').forEach(function (b) {
      var p = b.getAttribute('data-sch-panel');
      var kt = b.getAttribute('data-kbatch-tab');
      var on = false;
      if (state.panel === 'overview' && p === 'overview') on = true;
      if (state.panel === 'glyph' && p === 'glyph') on = true;
      if (state.panel === 'kbatch' && p === 'kbatch' && String(kt || '') === String(state.tab || 'analyzer')) on = true;
      b.classList.toggle('sch-nav-btn--on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function ensureKbatchTab(tab) {
    if (typeof window.schKbatchApplyTab === 'function') {
      window.schKbatchApplyTab(tab || 'analyzer');
    }
  }

  function setDocumentTitle(state) {
    var panel = state.panel || 'overview';
    try {
      if (panel === 'overview') document.title = DOC_TITLE_BASE;
      else if (panel === 'glyph') document.title = DOC_TITLE_BASE + ' · Glyph lab';
      else if (panel === 'kbatch') {
        var t = String(state.tab || 'analyzer');
        var label = KBATCH_TITLE[t] || t;
        document.title = DOC_TITLE_BASE + ' · ' + label;
        var h2 = document.getElementById('sch-kbatch-page-title');
        if (h2) h2.textContent = label;
      }
    } catch (e) {}
  }

  function wireKbatchFullscreen() {
    var btn = document.getElementById('sch-kbatch-fs');
    var inner = document.getElementById('btn-fullscreen');
    if (!btn || !inner || btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', function () {
      inner.click();
    });
  }

  function showPanel(state) {
    var id = state.panel || 'overview';
    if (!panels[id]) id = 'overview';
    Object.keys(panels).forEach(function (k) {
      var p = panels[k];
      if (!p) return;
      if (k === id) {
        p.removeAttribute('hidden');
        p.classList.add('sch-panel--on');
      } else {
        p.setAttribute('hidden', 'hidden');
        p.classList.remove('sch-panel--on');
      }
    });
    if (id === 'kbatch') {
      ensureKbatchTab(state.tab || 'analyzer');
      wireKbatchFullscreen();
    }
    setDocumentTitle({ panel: id, tab: state.tab || 'analyzer' });
    highlightNav({ panel: id, tab: state.tab || 'analyzer' });
    try {
      var hash = '#';
      if (id === 'overview') hash += 'overview';
      else if (id === 'glyph') hash += 'glyph';
      else hash += 'kbatch-' + (state.tab || 'analyzer');
      history.replaceState(null, '', location.pathname + location.search + hash);
    } catch (e) {}
  }

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '').trim();
    if (!h || h === 'overview') return { panel: 'overview' };
    if (h === 'glyph') return { panel: 'glyph' };
    if (h === 'kbatch') return { panel: 'kbatch', tab: 'analyzer' };
    if (h === 'capsules') return { panel: 'kbatch', tab: 'capsules' };
    if (h.indexOf('kbatch-') === 0) {
      var tab = h.slice(7);
      return { panel: 'kbatch', tab: tab || 'analyzer' };
    }
    return { panel: 'overview' };
  }

  document.querySelectorAll('.sch-nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var p = btn.getAttribute('data-sch-panel') || 'overview';
      var kt = btn.getAttribute('data-kbatch-tab');
      if (p === 'kbatch') {
        showPanel({ panel: 'kbatch', tab: kt || 'analyzer' });
      } else {
        showPanel({ panel: p });
      }
    });
  });

  showPanel(parseHash());
  window.addEventListener('hashchange', function () {
    showPanel(parseHash());
  });

})();
