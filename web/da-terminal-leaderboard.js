/**
 * da-terminal-leaderboard.js — shared Digital alphabet ↔ HexTerm text leaderboard (localStorage + BC).
 */
(function (g) {
  'use strict';
  var KEY = 'ugrad-digital-alphabet-lb-v1';
  var MAX = 500;

  function load() {
    try {
      var r = localStorage.getItem(KEY);
      var a = r ? JSON.parse(r) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function save(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
    } catch (e2) {}
  }

  g.DATerminalLB = {
    KEY: KEY,
    append: function (row) {
      var a = load();
      var rec = Object.assign({ ts: Date.now(), v: 1 }, row || {});
      a.push(rec);
      save(a);
      try {
        var bc = new BroadcastChannel('digital-alphabet-lb');
        bc.postMessage({ type: 'lb-append', row: rec });
        bc.close();
      } catch (e3) {}
      return rec;
    },
    getAll: load,
    clear: function () {
      save([]);
      try {
        var bc = new BroadcastChannel('digital-alphabet-lb');
        bc.postMessage({ type: 'lb-clear' });
        bc.close();
      } catch (e4) {}
    },
    asciiTable: function (rows, limit) {
      rows = rows || load();
      var L = limit == null ? 24 : Math.min(limit, rows.length);
      var start = Math.max(0, rows.length - L);
      var lines = ['  glyph    tab           score    time(UTC)'];
      var i,
        r,
        glph,
        tab,
        sc;
      for (i = start; i < rows.length; i++) {
        r = rows[i];
        glph = String(r.glyph != null ? r.glyph : '?').replace(/\s+/g, ' ');
        tab = String(r.tab || '—').slice(0, 14);
        sc = r.score != null ? String(r.score).slice(0, 8) : '—';
        lines.push(
          '  ' + glph.slice(0, 8).padEnd(8) + ' ' + tab.padEnd(14) + ' ' + sc.padEnd(8) + ' ' + new Date(r.ts).toISOString().slice(11, 19) + 'Z'
        );
      }
      if (!rows.length) lines.push('  (empty — use Digital alphabet “HexTerm LB”)');
      return lines.join('\n');
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
