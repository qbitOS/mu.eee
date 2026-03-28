/* beyondBINARY quantum-prefixed | uvspeed | school-corpus hash → kbatch tab (static embed) */
(function () {
  'use strict';
  var ALLOW = {
    analyzer: 1,
    layouts: 1,
    dictionary: 1,
    quantum: 1,
    training: 1,
    capsules: 1,
    contrails: 1,
    musica: 1,
    symbollab: 1,
    lattice: 1
  };

  function tabFromHash() {
    var h = (location.hash || '').replace(/^#/, '').trim();
    if (h === 'capsules') return 'capsules';
    if (h.indexOf('kbatch-') === 0) return h.slice(7) || 'analyzer';
    return 'analyzer';
  }

  function apply() {
    var panel = document.getElementById('sch-panel-kbatch');
    if (!panel || panel.hasAttribute('hidden')) return;
    var t = tabFromHash();
    if (!ALLOW[t]) t = 'analyzer';
    var btn = document.querySelector('.tab-btn[data-tab="' + t + '"]');
    if (btn) btn.click();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
  window.addEventListener('hashchange', apply);

  window.schKbatchApplyTab = function (tab) {
    var t = String(tab || 'analyzer');
    if (!ALLOW[t]) return;
    var b = document.querySelector('.tab-btn[data-tab="' + t + '"]');
    if (b) b.click();
  };
})();
