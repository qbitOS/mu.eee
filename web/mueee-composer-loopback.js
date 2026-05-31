/**
 * mueee-composer-loopback.js — parent-shell relay for fornevercollective/composer.
 *
 * BroadcastChannel is same-origin only. Composer (fornevercollective.github.io) runs on a
 * different origin than μ'search, so this hub:
 *   • composer popup → postMessage(opener) → rebroadcast on quantum-loopback / bloch-state
 *   • same-origin iframes (uvqbit, kbatch, …) → BC → forward to composer popup
 *
 * Open composer with window.open (named target, no noopener) so bridge-ugrad can use opener.
 */
(function () {
  'use strict';

  var RELAY = 'mueee-loopback-relay';
  var CHANNELS = ['quantum-loopback', 'bloch-state'];
  var COMPOSER_PUBLIC = 'https://fornevercollective.github.io/composer/';
  var COMPOSER_LOCAL = 'http://127.0.0.1:9470/';

  var composerWin = null;
  var bc = {};

  function composerBaseUrl() {
    try {
      var stored = localStorage.getItem('mueee.composer.base');
      if (stored) return stored.replace(/\/?$/, '/');
    } catch (e) {}
    var h = location.hostname;
    if (h === '127.0.0.1' || h === 'localhost') return COMPOSER_LOCAL;
    return COMPOSER_PUBLIC;
  }

  function trustedComposerOrigin(origin) {
    if (!origin || origin === 'null') return false;
    if (origin.indexOf('fornevercollective.github.io') !== -1) return true;
    if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return true;
    return false;
  }

  function isComposerPayload(d) {
    if (!d || typeof d !== 'object') return false;
    if (d.source === 'composerIBM') return true;
    if (d.type === RELAY && d.channel) return true;
    var t = d.type;
    return (
      t === 'composer-state' ||
      t === 'qpu-calibration' ||
      t === 'qpu-calibration-all' ||
      t === 'composerIBM-set-qasm'
    );
  }

  function postToComposer(channel, data) {
    if (!composerWin || composerWin.closed) return;
    try {
      composerWin.postMessage({ type: RELAY, channel: channel, data: data }, '*');
    } catch (e) {}
  }

  function rebroadcast(channel, data, skipComposer) {
    if (bc[channel]) {
      try {
        bc[channel].postMessage(data);
      } catch (e2) {}
    }
    if (!skipComposer) postToComposer(channel, data);
  }

  function onComposerDirectMessage(d) {
    if (d.type === 'composer-state' || d.type === 'qpu-calibration' || d.type === 'qpu-calibration-all') {
      rebroadcast('quantum-loopback', d, true);
      return;
    }
    if (d.type === 'bloch-state') {
      rebroadcast('bloch-state', d, true);
    }
  }

  CHANNELS.forEach(function (name) {
    try {
      bc[name] = new BroadcastChannel(name);
      bc[name].onmessage = function (ev) {
        var d = ev.data;
        if (!d) return;
        if (d.type === RELAY) return;
        postToComposer(name, d);
      };
    } catch (e) {}
  });

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || typeof d !== 'object') return;

    if (d.type === RELAY && d.channel && d.data) {
      if (ev.source === composerWin || trustedComposerOrigin(ev.origin)) {
        rebroadcast(d.channel, d.data, true);
      }
      return;
    }

    if (!trustedComposerOrigin(ev.origin) && ev.source !== composerWin) return;
    if (!isComposerPayload(d)) return;
    onComposerDirectMessage(d);
  });

  function openComposer(opts) {
    opts = opts || {};
    var base = (opts.base || composerBaseUrl()).replace(/\/?$/, '/');
    var u = new URL(base, location.href);
    u.searchParams.set('mueee', '1');
    if (opts.backend) u.searchParams.set('backend', opts.backend);
    var name = 'composerIBM';
    try {
      if (composerWin && !composerWin.closed) {
        composerWin.focus();
        composerWin.location.href = u.href;
        return composerWin;
      }
    } catch (e0) {}
    composerWin = window.open(u.href, name);
    return composerWin;
  }

  function requestCalibration(backend) {
    var msg = { type: 'qpu-calibration-request', source: 'mueee', backend: backend || null, ts: Date.now() };
    rebroadcast('quantum-loopback', msg, false);
  }

  function requestCalibrationAll() {
    var msg = { type: 'qpu-calibration-all-request', source: 'mueee', ts: Date.now() };
    rebroadcast('quantum-loopback', msg, false);
  }

  function pushQasm(qasm) {
    if (!qasm) return;
    rebroadcast('quantum-loopback', { type: 'composerIBM-set-qasm', qasm: qasm, source: 'mueee' }, false);
    if (composerWin && !composerWin.closed) {
      try {
        composerWin.postMessage({ type: 'composerIBM-set-qasm', qasm: qasm, source: 'mueee' }, '*');
      } catch (e1) {}
    }
  }

  window.MueeeComposerLoopback = {
    openComposer: openComposer,
    requestCalibration: requestCalibration,
    requestCalibrationAll: requestCalibrationAll,
    pushQasm: pushQasm,
    composerBaseUrl: composerBaseUrl,
    RELAY: RELAY
  };
})();
