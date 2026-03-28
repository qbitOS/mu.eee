/**
 * Isomorphic export facet v1 — Phase 1 helper
 * Spec: docs/isomorphic-export-facet-v1.md
 * Requires: quantum-prefixes.js, qbit-dac.js (optional qbit-steno for steno hints)
 */
(function (global) {
  'use strict';

  function buildBlockizedRuntime(bench) {
    bench = bench || {};
    return {
      dac: !!(global.prefixDAC || global.qbitCodec),
      ironLine: true,
      quantumGutterCoverage: typeof bench.quantumGutterCoverage === 'number'
        ? Number(bench.quantumGutterCoverage.toFixed(2))
        : 0,
      prefixes: !!global.QuantumPrefixes,
      preflight: !!global.QbitPreflight,
      t5Lane: String(bench.t5 || bench.t5Lane || 'unknown'),
      stenoRoundTrip: !!bench.stenoRoundTrip,
      codecRoundTrip: !!bench.codecRoundTrip
    };
  }

  /**
   * Merge Phase 0 facet fields into a JSON-serializable export payload.
   * @param {object} base - e.g. { version, layoutMode, blocks } or { results, heatmap }
   * @param {string} plainText - concatenated text to classify
   * @param {string} appId - e.g. pad-datatable, history, search
   * @param {object} [opts] - { bench, language, stenoPresent, stenoOk, capacityBits }
   */
  function attach(base, plainText, appId, opts) {
    opts = opts || {};
    var QP = global.QuantumPrefixes;
    var out = Object.assign({}, base);
    out.facetVersion = 1;
    out.facetLabel = 'isomorphic-export-facet-v1';
    out.exportedAt = new Date().toISOString();
    out.app = appId || 'unknown';
    var lang =
      opts.language ||
      (QP && QP.detectLanguage ? QP.detectLanguage(plainText || '') : null) ||
      'javascript';
    if (QP && typeof QP.wrapJsonExport === 'function') {
      out = QP.wrapJsonExport(out, plainText || '', appId);
    }
    var stenoOk = false;
    var capBits = null;
    if (global.QbitSteno && typeof global.QbitSteno.stenoAnalyze === 'function' && plainText) {
      try {
        var an = global.QbitSteno.stenoAnalyze(plainText);
        capBits = an && typeof an.capacityBits === 'number' ? an.capacityBits : null;
      } catch (e1) {}
    }
    out.steno = {
      present: !!opts.stenoPresent,
      roundTripVerified: !!opts.stenoOk || stenoOk,
      capacityBits: opts.capacityBits != null ? opts.capacityBits : capBits
    };
    if (global.prefixDAC && typeof global.prefixDAC.dacComplexity === 'function' && plainText) {
      try {
        var dc = global.prefixDAC.dacComplexity(plainText, lang);
        out.dacSummary = {
          tracksComputed: true,
          maxDepth: typeof dc.maxDepth === 'number' ? dc.maxDepth : 0,
          score: typeof dc.score === 'number' ? dc.score : null
        };
      } catch (e2) {
        out.dacSummary = { tracksComputed: false, maxDepth: 0, score: null };
      }
    } else {
      out.dacSummary = { tracksComputed: false, maxDepth: 0, score: null };
    }
    var qasm = false;
    try {
      qasm = !!(plainText && /OPENQASM|qasm/i.test(plainText));
    } catch (e3) {}
    out.preflight = {
      applicable: qasm,
      verdict: null,
      backend: null
    };
    out.blockizedRuntime = buildBlockizedRuntime(opts.bench);
    return out;
  }

  global.IsomorphicExportFacet = {
    attach: attach,
    buildBlockizedRuntime: buildBlockizedRuntime
  };
})(typeof window !== 'undefined' ? window : global);
