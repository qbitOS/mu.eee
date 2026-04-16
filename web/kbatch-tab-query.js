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
  function go() {
    try {
      var t = new URLSearchParams(window.location.search || '').get('tab');
      if (!t || !ALLOW[t]) return;
      var btn = document.querySelector('.tab-btn[data-tab="' + t + '"]');
      if (btn) btn.click();
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
