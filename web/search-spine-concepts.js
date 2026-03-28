/**
 * search-spine-concepts.js — Tonnetz / spine-linked highlights for search.html doc viewer.
 * Longest-match terms first; click drills into Search; ⌘/Ctrl-click opens spine destination.
 * beyondBINARY quantum-prefixed | uvspeed
 */
(function () {
  'use strict';

  /** Maps spine ids (mueee-throughline-spine ORDER) to web entry pages. */
  var SPINE_PAGES = {
    search: 'search.html',
    history: 'history.html',
    pad: 'pad-datatable.html',
    kbatch: 'kbatch.html',
    hexcast: 'hexcast.html',
    jawta: 'jawta-audio.html',
    research: 'research-lab.html',
    throughline: 'throughline-lab.html',
    games: 'games-ugrad-hub.html',
    brothernumsy: 'brothernumsy.html',
    globe: 'qbit-globe.html',
    uvqbit: 'uvqbit.html',
    corerace: 'qbit-core-race.html',
    gridlock: 'gridlock.html',
    notes: 'notes.html'
  };

  /**
   * Regexes anchored at slice start (^); matched in array order — keep longer phrases first.
   * q = default follow-up search query; title = tooltip hint.
   */
  var TERMS = [
    { re: /^\bquantum chromodynamics\b/i, spine: 'uvqbit', q: 'quantum chromodynamics' },
    { re: /^\bquantum electrodynamics\b/i, spine: 'uvqbit', q: 'QED' },
    { re: /^\bquantum field theory\b/i, spine: 'uvqbit', q: 'quantum field theory' },
    { re: /^\bquantum information\b/i, spine: 'uvqbit', q: 'quantum information' },
    { re: /^\bquantum computing\b/i, spine: 'uvqbit', q: 'quantum computing' },
    { re: /^\bquantum mechanics\b/i, spine: 'uvqbit', q: 'quantum mechanics' },
    { re: /^\bquantum teleportation\b/i, spine: 'uvqbit', q: 'quantum teleportation' },
    { re: /^\bquantum gravity\b/i, spine: 'globe', q: 'quantum gravity' },
    { re: /^\bgeneral relativity\b/i, spine: 'globe', q: 'general relativity' },
    { re: /^\bspecial relativity\b/i, spine: 'globe', q: 'special relativity' },
    { re: /^\bHeisenberg uncertainty\b/i, spine: 'uvqbit', q: 'uncertainty principle' },
    { re: /^\buncertainty principle\b/i, spine: 'uvqbit', q: 'uncertainty principle' },
    { re: /^\bSchrödinger equation\b/i, spine: 'uvqbit', q: 'Schrödinger equation' },
    { re: /^\bwave function\b/i, spine: 'uvqbit', q: 'wave function' },
    { re: /^\bwavefunction\b/i, spine: 'uvqbit', q: 'wavefunction' },
    { re: /^\bquantum state\b/i, spine: 'uvqbit', q: 'quantum state' },
    { re: /^\bquantum entanglement\b/i, spine: 'uvqbit', q: 'quantum entanglement' },
    { re: /^\bquantum error\b/i, spine: 'uvqbit', q: 'quantum error correction' },
    { re: /^\bPlanck (?:constant|length|time)\b/i, spine: 'uvqbit', q: 'Planck units' },
    { re: /^\b(?:NISQ|noisy intermediate-scale quantum)\b/i, spine: 'uvqbit', q: 'NISQ quantum' },
    { re: /^\bQPU\b/i, spine: 'globe', q: 'quantum processing unit' },
    { re: /^\bquantum processor\b/i, spine: 'globe', q: 'quantum processor' },
    { re: /^\bqubit\b/i, spine: 'uvqbit', q: 'qubit' },
    { re: /^\bsuperposition\b/i, spine: 'uvqbit', q: 'quantum superposition' },
    { re: /^\bdecoherence\b/i, spine: 'uvqbit', q: 'quantum decoherence' },
    { re: /^\binterference\b/i, spine: 'uvqbit', q: 'wave interference' },
    { re: /^\bentanglement\b/i, spine: 'uvqbit', q: 'quantum entanglement' },
    { re: /^\bphoton\b/i, spine: 'uvqbit', q: 'photon' },
    { re: /^\belectron\b/i, spine: 'uvqbit', q: 'electron' },
    { re: /^\bparticle physics\b/i, spine: 'uvqbit', q: 'particle physics' },
    { re: /^\b(?:Higgs boson|Higgs field)\b/i, spine: 'uvqbit', q: 'Higgs boson' },
    { re: /^\b(?:metric tensor|Riemannian manifold)\b/i, spine: 'throughline', q: 'differential geometry' },
    { re: /^\b(?:graph theory|directed acyclic graph)\b/i, spine: 'throughline', q: 'graph theory' },
    { re: /^\b(?:timeline|chronology)\b/i, spine: 'history', q: 'historical timeline' },
    { re: /^\b(?:peer review|reproducib)\w*\b/i, spine: 'research', q: 'peer review' },
    { re: /^\b(?:hypothesis|experiment design)\b/i, spine: 'research', q: 'scientific method' },
    { re: /^\b(?:keyboard layout|ergonomics typing|Dvorak|Colemak|QWERTY)\b/i, spine: 'kbatch', q: 'keyboard layout' },
    { re: /^\b(?:broadcast|livestream|video codec)\b/i, spine: 'hexcast', q: 'video broadcast' },
    { re: /^\b(?:speech recognition|whisper|audio fingerprint)\b/i, spine: 'jawta', q: 'audio ML' },
    { re: /^\b(?:spreadsheet|datatable|tabular data)\b/i, spine: 'pad', q: 'data table' },
    { re: /^\b(?:game theory|video game)\b/i, spine: 'games', q: 'games' },
    { re: /^\b(?:neural network|machine learning|deep learning)\b/i, spine: 'throughline', q: 'machine learning' },
    { re: /^\b(?:entropy|thermodynamics)\b/i, spine: 'research', q: 'entropy physics' },
    { re: /^\b(?:MOPA laser|optical lattice)\b/i, spine: 'globe', q: 'optical physics' },
    { re: /^\blaser\b/i, spine: 'globe', q: 'laser physics' },
    { re: /^\b(?:Bloch sphere|quantum circuit|QASM)\b/i, spine: 'uvqbit', q: 'quantum circuit' },
    { re: /^\b(?:IBM Quantum|superconducting qubit)\b/i, spine: 'uvqbit', q: 'IBM quantum' },
    { re: /^\bquantum\b/i, spine: 'uvqbit', q: 'quantum' }
  ];

  function highlight(plainText, escFn) {
    if (!plainText || typeof plainText !== 'string') return '';
    var esc = escFn || function (s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    var s = plainText;
    var out = [];
    var i = 0;
    while (i < s.length) {
      var best = null;
      var bestLen = 0;
      var sub = s.slice(i);
      for (var k = 0; k < TERMS.length; k++) {
        var t = TERMS[k];
        var m = t.re.exec(sub);
        if (m && m.index === 0 && m[0].length > bestLen) {
          best = t;
          bestLen = m[0].length;
        }
      }
      if (best && bestLen > 0) {
        var slice = s.slice(i, i + bestLen);
        var q = best.q || slice;
        var title =
          'Spine: ' +
          (best.spine || '') +
          ' — click to search · ⌘/Ctrl-click opens app';
        out.push(
          '<span class="dv-spine-hit" data-spine="' +
            esc(best.spine || '') +
            '" data-q="' +
            esc(q) +
            '" title="' +
            esc(title) +
            '">' +
            esc(slice) +
            '</span>'
        );
        i += bestLen;
      } else {
        out.push(esc(s[i]));
        i++;
      }
    }
    return out.join('');
  }

  window.SearchSpineConcepts = {
    TERMS: TERMS,
    SPINE_PAGES: SPINE_PAGES,
    highlight: highlight
  };
})();
