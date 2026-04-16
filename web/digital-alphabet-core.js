(function () {
  'use strict';
  var ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  /** 6×6 grids — '1' = on; maps by Unicode key in BRITE_MAP */
  var BRITE6 = [
    ['001100', '010010', '010010', '011110', '010010', '010010'],
    ['111100', '100010', '111100', '100010', '100010', '111100'],
    ['011110', '100000', '100000', '100000', '100000', '011110'],
    ['111100', '100010', '100010', '100010', '100010', '111100'],
    ['111110', '100000', '111100', '100000', '100000', '111110'],
    ['111110', '100000', '111100', '100000', '100000', '100000'],
    ['011110', '100000', '100110', '100010', '100010', '011100'],
    ['100010', '100010', '111110', '100010', '100010', '100010'],
    ['011100', '001000', '001000', '001000', '001000', '011100'],
    ['001110', '000100', '000100', '000100', '100100', '011000'],
    ['100010', '100100', '101000', '110000', '101000', '100010'],
    ['100000', '100000', '100000', '100000', '100000', '111110'],
    ['100010', '110110', '101010', '101010', '100010', '100010'],
    ['100010', '110010', '101010', '100110', '100010', '100010'],
    ['011100', '100010', '100010', '100010', '100010', '011100'],
    ['111100', '100010', '100010', '111100', '100000', '100000'],
    ['011100', '100010', '100010', '100010', '100100', '011010'],
    ['111100', '100010', '111100', '101000', '100100', '100010'],
    ['011110', '100000', '011100', '000010', '000010', '111100'],
    ['111110', '001000', '001000', '001000', '001000', '001000'],
    ['100010', '100010', '100010', '100010', '100010', '011100'],
    ['100010', '100010', '100010', '100010', '010100', '001000'],
    ['100010', '100010', '100010', '101010', '101010', '010100'],
    ['100010', '100010', '010100', '001000', '010100', '100010'],
    ['100010', '100010', '010100', '001000', '001000', '001000'],
    ['111110', '000010', '000100', '001000', '010000', '111110']
  ];
  var PLACEHOLDER = ['011110', '100001', '100010', '000100', '000010', '111110'];
  function glyphRowsArePlaceholder(rows) {
    if (!rows || rows.length !== 6) return true;
    var gpr;
    for (gpr = 0; gpr < 6; gpr++) if (rows[gpr] !== PLACEHOLDER[gpr]) return false;
    return true;
  }
  function cloneBrite(rows) {
    var out = [], zi;
    for (zi = 0; zi < rows.length; zi++) out[zi] = rows[zi];
    return out;
  }
  /** Stable unique 6×6 when no Latin/Greek digit proxy exists (kana, Hangul, Arabic, …). */
  function syntheticBrite6FromCp(cp) {
    var h = ((cp | 0) * 397 ^ 993733) >>> 0;
    var rows = [], r, bits, c, rowStr;
    for (r = 0; r < 6; r++) {
      bits = ((h >>> (r * 4)) ^ (r * 17) ^ ((cp * (r + 1) | 0) & 0xffff)) & 0x3f;
      if (!bits) bits = ((1 << (r % 6)) | (1 << ((r + 3) % 6))) & 0x3f;
      rowStr = '';
      for (c = 0; c < 6; c++) rowStr += (bits >> c) & 1 ? '1' : '0';
      rows[r] = rowStr;
    }
    if (glyphRowsArePlaceholder(rows)) rows[4] = '100000';
    return rows;
  }
  var BRITE_MAP = Object.create(null);
  var GREEK_LOWER = 'αβγδεζηθικλμνξοπρστυφχψω';
  var GREEK_UPPER = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
  var ASCII_PUNCT = ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
  var j, ch;
  for (j = 0; j < 26; j++) {
    BRITE_MAP[ALPHA[j]] = BRITE6[j];
    BRITE_MAP[ALPHA[j].toUpperCase()] = BRITE6[j];
  }
  BRITE_MAP.I = ['111110', '001000', '001000', '001000', '001000', '111110'];
  BRITE_MAP[' '] = ['000000', '000000', '000000', '000000', '000000', '000000'];
  BRITE_MAP['0'] = ['011100', '100010', '100010', '100010', '100010', '011100'];
  BRITE_MAP['1'] = ['001000', '011000', '001000', '001000', '001000', '011100'];
  BRITE_MAP['2'] = ['011100', '000010', '001100', '010000', '010000', '011110'];
  BRITE_MAP['3'] = ['011100', '000010', '001100', '000010', '000010', '011100'];
  BRITE_MAP['4'] = ['010010', '010010', '011110', '000010', '000010', '000010'];
  BRITE_MAP['5'] = ['011110', '010000', '011100', '000010', '000010', '011100'];
  BRITE_MAP['6'] = ['001100', '010000', '011100', '010010', '010010', '011100'];
  BRITE_MAP['7'] = ['011110', '000010', '000100', '001000', '001000', '001000'];
  BRITE_MAP['8'] = ['011100', '100010', '011100', '100010', '100010', '011100'];
  BRITE_MAP['9'] = ['011100', '100010', '100010', '011110', '000010', '011100'];
  BRITE_MAP['.'] = ['000000', '000000', '000000', '000000', '000000', '000100'];
  BRITE_MAP[','] = ['000000', '000000', '000000', '000000', '000100', '001000'];
  BRITE_MAP[':'] = ['000000', '001000', '000000', '001000', '000000', '000000'];
  BRITE_MAP[';'] = ['000000', '001000', '000000', '001000', '001000', '010000'];
  BRITE_MAP['!'] = ['001000', '001000', '001000', '001000', '000000', '001000'];
  BRITE_MAP['?'] = ['011100', '100010', '000100', '001000', '000000', '001000'];
  BRITE_MAP['\''] = ['001000', '001000', '000000', '000000', '000000', '000000'];
  BRITE_MAP['"'] = ['010100', '010100', '000000', '000000', '000000', '000000'];
  BRITE_MAP['-'] = ['000000', '000000', '111111', '000000', '000000', '000000'];
  BRITE_MAP['_'] = ['000000', '000000', '000000', '000000', '000000', '111111'];
  BRITE_MAP['='] = ['000000', '000000', '111111', '000000', '111111', '000000'];
  BRITE_MAP['+'] = ['000000', '001000', '001000', '111111', '001000', '001000'];
  BRITE_MAP['*'] = ['000000', '010101', '001110', '011111', '001110', '010101'];
  BRITE_MAP['/'] = ['000001', '000010', '000100', '001000', '010000', '100000'];
  BRITE_MAP['\\'] = ['100000', '010000', '001000', '000100', '000010', '000001'];
  BRITE_MAP['|'] = ['001000', '001000', '001000', '001000', '001000', '001000'];
  BRITE_MAP['('] = ['000010', '000100', '001000', '001000', '000100', '000010'];
  BRITE_MAP[')'] = ['010000', '001000', '000100', '000100', '001000', '010000'];
  BRITE_MAP['['] = ['011110', '010000', '010000', '010000', '010000', '011110'];
  BRITE_MAP[']'] = ['011110', '000010', '000010', '000010', '000010', '011110'];
  BRITE_MAP['{'] = ['000110', '000100', '000100', '001100', '000100', '000110'];
  BRITE_MAP['}'] = ['011000', '000100', '000100', '001100', '000100', '011000'];
  BRITE_MAP['<'] = ['000010', '000100', '001000', '010000', '001000', '000100'];
  BRITE_MAP['>'] = ['010000', '001000', '000100', '000010', '000100', '001000'];
  BRITE_MAP['@'] = ['011100', '100001', '101001', '101011', '100000', '011100'];
  BRITE_MAP['#'] = ['010100', '010100', '111111', '010100', '111111', '010100'];
  BRITE_MAP['$'] = ['001000', '011110', '101000', '011100', '001010', '111100'];
  BRITE_MAP['%'] = ['110000', '110010', '000100', '001000', '010011', '000011'];
  BRITE_MAP['&'] = ['001000', '010100', '101000', '101000', '010100', '001010'];
  BRITE_MAP['~'] = ['000000', '000000', '001100', '110010', '000000', '000000'];
  BRITE_MAP['`'] = ['001000', '000100', '000000', '000000', '000000', '000000'];
  BRITE_MAP['^'] = ['001000', '010100', '000000', '000000', '000000', '000000'];
  BRITE_MAP['α'] = ['001110', '010001', '010001', '010010', '010010', '001110'];
  BRITE_MAP['β'] = BRITE_MAP['b'];
  BRITE_MAP['γ'] = ['000000', '101010', '010100', '001000', '001000', '001000'];
  BRITE_MAP['δ'] = ['001110', '010001', '000001', '011111', '010000', '001110'];
  BRITE_MAP['ε'] = BRITE_MAP['e'];
  BRITE_MAP['ζ'] = ['011110', '000010', '001100', '000010', '000010', '000010'];
  BRITE_MAP['η'] = ['000000', '101010', '101010', '101010', '101010', '000001'];
  BRITE_MAP['θ'] = ['011100', '100010', '111110', '100010', '100010', '011100'];
  BRITE_MAP['ι'] = BRITE_MAP['i'];
  BRITE_MAP['κ'] = BRITE_MAP['k'];
  BRITE_MAP['λ'] = ['000100', '000100', '001010', '010001', '010001', '010001'];
  BRITE_MAP['μ'] = ['000000', '100010', '100010', '100010', '110100', '101001'];
  BRITE_MAP['ν'] = ['000000', '100010', '100010', '010100', '010100', '001000'];
  BRITE_MAP['ξ'] = ['011110', '000010', '001100', '000010', '000110', '111000'];
  BRITE_MAP['ο'] = BRITE_MAP['o'];
  BRITE_MAP['π'] = ['111110', '001000', '001000', '001000', '001000', '001000'];
  BRITE_MAP['ρ'] = BRITE_MAP['p'];
  BRITE_MAP['σ'] = ['011110', '100010', '100010', '100010', '010010', '001100'];
  BRITE_MAP['τ'] = BRITE_MAP['t'];
  BRITE_MAP['υ'] = BRITE_MAP['u'];
  BRITE_MAP['φ'] = ['000100', '001110', '010101', '001110', '000100', '000100'];
  BRITE_MAP['χ'] = BRITE_MAP['x'];
  BRITE_MAP['ψ'] = ['101010', '101010', '101010', '011100', '001000', '001000'];
  BRITE_MAP['ω'] = ['000000', '010100', '101010', '101010', '101010', '101010'];
  BRITE_MAP['Α'] = ['011110', '100010', '111110', '100010', '100010', '100010'];
  BRITE_MAP['Β'] = BRITE_MAP['B'];
  BRITE_MAP['Γ'] = ['111110', '100000', '100000', '100000', '100000', '100000'];
  BRITE_MAP['Δ'] = ['001000', '010100', '100010', '100010', '100010', '100010'];
  BRITE_MAP['Ε'] = BRITE_MAP['E'];
  BRITE_MAP['Ζ'] = BRITE_MAP['Z'];
  BRITE_MAP['Η'] = BRITE_MAP['H'];
  BRITE_MAP['Θ'] = ['011100', '100010', '111110', '100010', '100010', '011100'];
  BRITE_MAP['Ι'] = BRITE_MAP['I'];
  BRITE_MAP['Κ'] = BRITE_MAP['K'];
  BRITE_MAP['Λ'] = ['001000', '010100', '010100', '100010', '100010', '100010'];
  BRITE_MAP['Μ'] = BRITE_MAP['M'];
  BRITE_MAP['Ν'] = BRITE_MAP['N'];
  BRITE_MAP['Ξ'] = ['011110', '000010', '001100', '000010', '000110', '111100'];
  BRITE_MAP['Ο'] = BRITE_MAP['O'];
  BRITE_MAP['Π'] = ['111110', '100010', '100010', '100010', '100010', '100010'];
  BRITE_MAP['Ρ'] = BRITE_MAP['P'];
  BRITE_MAP['Σ'] = ['011110', '010000', '001000', '000100', '000010', '011110'];
  BRITE_MAP['Τ'] = BRITE_MAP['T'];
  BRITE_MAP['Υ'] = ['101010', '010100', '001000', '001000', '001000', '001000'];
  BRITE_MAP['Φ'] = ['011100', '101010', '101010', '011100', '001000', '001000'];
  BRITE_MAP['Χ'] = BRITE_MAP['X'];
  BRITE_MAP['Ψ'] = ['101010', '101010', '111110', '011100', '001000', '001000'];
  BRITE_MAP['Ω'] = ['001110', '010001', '000010', '001100', '010001', '001110'];
  var GLYPH_ORDER = [];
  for (j = 0; j < 26; j++) GLYPH_ORDER.push(ALPHA[j]);
  for (j = 0; j < 26; j++) GLYPH_ORDER.push(ALPHA[j].toUpperCase());
  for (j = 0; j < 10; j++) GLYPH_ORDER.push(String(j));
  for (j = 0; j < ASCII_PUNCT.length; j++) {
    ch = ASCII_PUNCT.charAt(j);
    if (ch === '\n') continue;
    GLYPH_ORDER.push(ch);
  }
  for (j = 0; j < GREEK_LOWER.length; j++) GLYPH_ORDER.push(GREEK_LOWER.charAt(j));
  for (j = 0; j < GREEK_UPPER.length; j++) GLYPH_ORDER.push(GREEK_UPPER.charAt(j));
  var _seen = Object.create(null);
  GLYPH_ORDER = GLYPH_ORDER.filter(function (g) {
    if (_seen[g]) return false;
    _seen[g] = 1;
    return true;
  });
  /** Append every char from manifest <code>letters</code> (written alphabets) into picker; filled via proxy / synth (see <code>materializeScriptBriteMaps</code>). */
  function mergeManifestLettersIntoGlyphOrder() {
    var M = (typeof DA_ALPHABET_TAB_MANIFEST !== 'undefined' && DA_ALPHABET_TAB_MANIFEST) ? DA_ALPHABET_TAB_MANIFEST : null;
    if (!M || !M.tabs) return;
    var seen = Object.create(null);
    var gi, ti, t, s, pos, cp, chStr;
    for (gi = 0; gi < GLYPH_ORDER.length; gi++) seen[GLYPH_ORDER[gi]] = 1;
    for (ti = 0; ti < M.tabs.length; ti++) {
      t = M.tabs[ti];
      if (!t.letters) continue;
      s = t.letters;
      pos = 0;
      while (pos < s.length) {
        cp = s.codePointAt(pos);
        pos += cp > 0xffff ? 2 : 1;
        chStr = String.fromCodePoint(cp);
        if (!seen[chStr]) {
          seen[chStr] = 1;
          GLYPH_ORDER.push(chStr);
        }
      }
    }
  }
  mergeManifestLettersIntoGlyphOrder();
  var GORDER_LEN = GLYPH_ORDER.length;
  for (j = 0; j < GORDER_LEN; j++) {
    ch = GLYPH_ORDER[j];
    if (!BRITE_MAP[ch]) BRITE_MAP[ch] = PLACEHOLDER;
  }
  var DA_SYNTH_BRITE = Object.create(null);
  /** Latin extended (more tab) + Cyrillic → existing BRITE_MAP targets; then synthetic for the rest. */
  (function materializeScriptBriteMaps() {
    var SCRIPT_PROXY = Object.create(null);
    var _lep = 'ñnÑNßBäaöoüuÄAÖOÜUąaćcęełlńnśsźzżzĄAĆCĘEŁLŃNŚSŹZŻZøoØOæaÆAœoŒOçcÇCðdÐDþpÞPıiİIşsŞSğgĞG';
    for (j = 0; j < _lep.length; j += 2) SCRIPT_PROXY[_lep.charAt(j)] = _lep.charAt(j + 1);
    var _cyrOrder = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    var _cyrProxStr = "A6BΓDEEX3NNKΛMHOΠPCTYΦXU4WW`M'EORa6bγdeex3nnkλmhnopctyφxu4ww`e'eor";
    for (j = 0; j < _cyrOrder.length; j++) SCRIPT_PROXY[_cyrOrder.charAt(j)] = _cyrProxStr.charAt(j);
    var _matPass, _changedP, _p0, _ch0;
    for (_matPass = 0; _matPass < 8; _matPass++) {
      _changedP = false;
      for (j = 0; j < GORDER_LEN; j++) {
        _ch0 = GLYPH_ORDER[j];
        if (!glyphRowsArePlaceholder(BRITE_MAP[_ch0])) continue;
        _p0 = SCRIPT_PROXY[_ch0];
        if (_p0 && BRITE_MAP[_p0] && !glyphRowsArePlaceholder(BRITE_MAP[_p0])) {
          BRITE_MAP[_ch0] = cloneBrite(BRITE_MAP[_p0]);
          _changedP = true;
        }
      }
      if (!_changedP) break;
    }
    for (j = 0; j < GORDER_LEN; j++) {
      _ch0 = GLYPH_ORDER[j];
      if (glyphRowsArePlaceholder(BRITE_MAP[_ch0])) {
        BRITE_MAP[_ch0] = syntheticBrite6FromCp(_ch0.codePointAt(0));
        DA_SYNTH_BRITE[_ch0] = 1;
      }
    }
  })();
  /** Browser-local BRITE_MAP overrides (survives refresh); merge into repo via Download saves (.js). */
  var DA_BRITE_LS_KEY = 'digital-alphabet-brite-overrides-v1';
  function readRawBriteLocalStore() {
    try {
      var raw = localStorage.getItem(DA_BRITE_LS_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return null;
      if (o.map && typeof o.map === 'object') return o;
      if (!o.v && o.map === undefined) return { v: 1, map: o };
      return null;
    } catch (eR) {
      return null;
    }
  }
  function applyBriteLocalOverridesFromStorage() {
    var wrap = readRawBriteLocalStore();
    if (!wrap || !wrap.map) return 0;
    var map = wrap.map;
    var k, rows, n = 0, vi;
    for (k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      rows = map[k];
      if (!Array.isArray(rows) || rows.length !== 6) continue;
      var ok = true;
      for (vi = 0; vi < 6; vi++) {
        if (typeof rows[vi] !== 'string' || !/^[01]{6}$/.test(rows[vi])) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      BRITE_MAP[k] = cloneBrite(rows);
      delete DA_SYNTH_BRITE[k];
      n++;
    }
    return n;
  }
  applyBriteLocalOverridesFromStorage();
  function persistBriteOverrideToLocalStorage(ch, rows) {
    if (ch == null || !rows) return;
    var wrap = readRawBriteLocalStore() || { v: 1, map: {} };
    if (!wrap.map) wrap.map = {};
    wrap.v = 1;
    wrap.map[ch] = cloneBrite(rows);
    wrap.updatedAt = Date.now();
    try {
      localStorage.setItem(DA_BRITE_LS_KEY, JSON.stringify(wrap));
    } catch (eLs) {}
  }
  function getBriteLocalOverrideCount() {
    var wrap = readRawBriteLocalStore();
    if (!wrap || !wrap.map) return 0;
    return Object.keys(wrap.map).length;
  }
  function briteLocalOverridesToJsPatch() {
    var wrap = readRawBriteLocalStore();
    if (!wrap || !wrap.map) return '// (no saved overrides)\n';
    var keys = Object.keys(wrap.map).sort();
    var lines = [
      '// digital_alphabet.html — pasted BRITE_MAP overrides (browser export)',
      '// Merge these lines into the BRITE_MAP block or run after BRITE_MAP init.',
      ''
    ];
    var ki, chK, rows, rs;
    for (ki = 0; ki < keys.length; ki++) {
      chK = keys[ki];
      rows = wrap.map[chK];
      if (!Array.isArray(rows) || rows.length !== 6) continue;
      rs = rows.map(function (row) { return "'" + row + "'"; }).join(', ');
      lines.push('BRITE_MAP[' + JSON.stringify(chK) + '] = [' + rs + '];');
    }
    lines.push('');
    return lines.join('\n');
  }
  function downloadTextAsFile(filename, text, mime) {
    mime = mime || 'text/plain;charset=utf-8';
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function refreshBriteLsUi() {
    var el = document.getElementById('da-brite-ls-meta');
    if (!el) return;
    var n = getBriteLocalOverrideCount();
    el.textContent =
      n === 0
        ? 'Browser saves: none (Apply → auto-saves here; refresh keeps edits)'
        : 'Browser saves: ' + n + ' glyph(s) — use Download to merge into digital_alphabet.html';
  }
  var DA_TAB_MAN = (typeof DA_ALPHABET_TAB_MANIFEST !== 'undefined' && DA_ALPHABET_TAB_MANIFEST) ? DA_ALPHABET_TAB_MANIFEST : { version: '0', tabs: [{ id: 'all', label: 'All' }] };
  var daVisibleSlots = [];
  var daActiveTabId = 'all';
  var refPos = 0;
  var refDir = 1;
  var refLoopTimer = null;
  function buildRefStripIndices() {
    var out = [];
    var seq = [];
    var k, xi, chStr, ix;
    for (k = 0; k < 26; k++) seq.push(ALPHA.charAt(k));
    for (k = 0; k < 26; k++) seq.push(ALPHA.charAt(k).toUpperCase());
    for (k = 0; k < 10; k++) seq.push(String(k));
    var extra = ' !?#@πλψΦ';
    for (xi = 0; xi < extra.length; xi++) {
      chStr = extra.charAt(xi);
      if (seq.indexOf(chStr) < 0) seq.push(chStr);
    }
    for (k = 0; k < seq.length; k++) {
      ix = GLYPH_ORDER.indexOf(seq[k]);
      if (ix >= 0) out.push(ix);
    }
    return out;
  }
  var refStrip = buildRefStripIndices();
  var briteEditorRows = ['000000', '000000', '000000', '000000', '000000', '000000'];
  var briteEditorDirty = false;
  var briteEditorLastKey = null;
  var britePaintTarget = null;
  var briteEditorPaintGlobBound = false;
  function cpClassGlyph(g) {
    var cp = g.codePointAt(0);
    return {
      isL: (cp >= 97 && cp <= 122) || (cp >= 65 && cp <= 90),
      isD: cp >= 48 && cp <= 57,
      isGr: cp >= 0x370 && cp <= 0x03FF
    };
  }
  function indicesForTabId(tid) {
    var tab = null;
    var ti, TABS = DA_TAB_MAN.tabs || [];
    for (ti = 0; ti < TABS.length; ti++) {
      if (TABS[ti].id === tid) { tab = TABS[ti]; break; }
    }
    if (!tab || tid === 'all') {
      var all = [];
      for (ti = 0; ti < GORDER_LEN; ti++) all.push(ti);
      return all;
    }
    var f = tab.f || '';
    var want = Object.create(null);
    if (f.indexOf('L') >= 0) {
      for (ti = 0; ti < 26; ti++) {
        want[ALPHA[ti]] = 1;
        want[ALPHA[ti].toUpperCase()] = 1;
      }
    }
    if (f.indexOf('D') >= 0) for (ti = 0; ti < 10; ti++) want[String(ti)] = 1;
    if (f.indexOf('G') >= 0) {
      for (ti = 0; ti < GREEK_LOWER.length; ti++) want[GREEK_LOWER.charAt(ti)] = 1;
      for (ti = 0; ti < GREEK_UPPER.length; ti++) want[GREEK_UPPER.charAt(ti)] = 1;
    }
    if (tab.x) for (ti = 0; ti < tab.x.length; ti++) want[tab.x.charAt(ti)] = 1;
    if (tab.letters) {
      var ls = tab.letters;
      var lp = 0;
      var lcp;
      while (lp < ls.length) {
        lcp = ls.codePointAt(lp);
        lp += lcp > 0xffff ? 2 : 1;
        want[String.fromCodePoint(lcp)] = 1;
      }
    }
    var symOnly = f === 'S' || (f.indexOf('S') >= 0 && f.indexOf('L') < 0 && f.indexOf('D') < 0 && f.indexOf('G') < 0);
    var out = [];
    for (ti = 0; ti < GORDER_LEN; ti++) {
      var gx = GLYPH_ORDER[ti];
      var cl = cpClassGlyph(gx);
      if (symOnly) {
        if (!cl.isL && !cl.isD && !cl.isGr) out.push(ti);
        continue;
      }
      if (want[gx]) out.push(ti);
    }
    return out.length ? out : [0];
  }
  function rebuildVisibleSlots() {
    daVisibleSlots = indicesForTabId(daActiveTabId);
  }
  function ensureIdxInVisible() {
    if (daVisibleSlots.indexOf(idx) >= 0) return;
    idx = daVisibleSlots[0] || 0;
  }
  function nextInVisible(fromG, delta) {
    if (!daVisibleSlots.length) return fromG;
    var fi = daVisibleSlots.indexOf(fromG);
    if (fi < 0) return daVisibleSlots[0];
    var Ln = daVisibleSlots.length;
    return daVisibleSlots[(fi + delta + Ln * 16) % Ln];
  }
  function stepTowardInVisible(fromG, toG) {
    if (!daVisibleSlots.length || daVisibleSlots.length >= GORDER_LEN) {
      return stepTowardSlot(fromG, toG);
    }
    var vis = daVisibleSlots;
    var fi = vis.indexOf(fromG);
    var ti = vis.indexOf(toG);
    if (fi < 0) return vis[0];
    if (ti < 0) return toG;
    var Ln = vis.length;
    var d = (ti - fi + Ln) % Ln;
    if (d <= Ln / 2) return vis[(fi + 1) % Ln];
    return vis[(fi - 1 + Ln) % Ln];
  }
  var idx = 0;
  var timer = null;
  function nibbleFromCodePoint(cp) {
    var x = cp | 0;
    return (x ^ (x << 2) ^ (x >>> 1)) & 15;
  }
  /** Abacus / stack nibble (4 beads): . = 0, : = 1 — not peg shape, not full Braille glyph. */
  function bracketPatForChar(c) {
    if (!c) return '[....]';
    var b = nibbleFromCodePoint(c.codePointAt(0));
    return '[' + b.toString(2).padStart(4, '0').replace(/0/g, '.').replace(/1/g, ':') + ']';
  }
  /** Unicode Braille patterns U+2800–U+28FF; nibble → dots 1–4 (ISO/TR 11548-1 low 4 bits). */
  function braillePatForChar(c) {
    if (!c) return '\u2800';
    var b = nibbleFromCodePoint(c.codePointAt(0)) & 15;
    return String.fromCharCode(0x2800 + b);
  }
  function heroReadoutForChar(c) {
    return bracketPatForChar(c) + '\u2003' + braillePatForChar(c);
  }
  /** ASCII “hole punch” — same 6×6 rows as hero / picker (· off, ● on). */
  function pegAsciiBlockFromRows(rows) {
    var r, line, c0, bits = [];
    for (r = 0; r < 6; r++) {
      line = '';
      for (c0 = 0; c0 < 6; c0++) {
        line += rows[r].charAt(c0) === '1' ? '\u25CF' : '\u00B7';
      }
      bits.push(line);
    }
    return bits.join('\n');
  }
  function pegStreamSectionForChars(chars) {
    var out = [];
    var k, c0, rows, cp, lab;
    for (k = 0; k < chars.length; k++) {
      c0 = chars[k];
      if (c0 === '\r') continue;
      if (c0 === '\n') {
        out.push('');
        continue;
      }
      rows = getRows(c0);
      cp = c0.codePointAt(0);
      lab = c0 === ' ' ? 'space' : c0;
      out.push(
        '\u2500\u2500 ' +
          lab +
          '  U+' +
          cp.toString(16).toUpperCase().padStart(4, '0') +
          (isSyntheticGlyph(c0) ? '  [SYNTH peg — optional BRITE_MAP]' : '') +
          ' \u2500\u2500'
      );
      out.push(pegAsciiBlockFromRows(rows));
      out.push('');
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function getRows(c) {
    return (c && BRITE_MAP[c]) ? BRITE_MAP[c] : PLACEHOLDER;
  }
  function rowsMatchPlaceholder(rows) {
    if (!rows || rows.length !== 6) return false;
    var pr;
    for (pr = 0; pr < 6; pr++) {
      if (rows[pr] !== PLACEHOLDER[pr]) return false;
    }
    return true;
  }
  function isPlaceholderGlyph(c) {
    return rowsMatchPlaceholder(getRows(c));
  }
  /** Cache: codepoint → synthetic rows (deterministic; safe to retain for session). */
  var _daSynthRowsByCp = Object.create(null);
  function rowsMatchSynthPattern(rows, cp) {
    if (!rows || rows.length !== 6) return false;
    var synth = _daSynthRowsByCp[cp];
    if (!synth) {
      synth = syntheticBrite6FromCp(cp);
      _daSynthRowsByCp[cp] = synth;
    }
    var r;
    for (r = 0; r < 6; r++) if (rows[r] !== synth[r]) return false;
    return true;
  }
  /** True if pegs are still the codepoint-derived SYNTH fill (init flag or row match). Hand BRITE_MAP edits that diverge clear this. */
  function isSyntheticGlyph(c) {
    if (!c) return false;
    if (DA_SYNTH_BRITE[c]) return true;
    var rows = getRows(c);
    if (rowsMatchPlaceholder(rows)) return false;
    return rowsMatchSynthPattern(rows, c.codePointAt(0));
  }
  function pegArtLabel(ch) {
    if (isPlaceholderGlyph(ch)) return 'PLACEHOLDER';
    if (isSyntheticGlyph(ch)) return 'SYNTH';
    return 'mapped';
  }
  function briteEditorTargetsRef() {
    var el = document.getElementById('da-brite-edit-ref');
    return !!(el && el.checked);
  }
  function getBriteEditorGlyphKey() {
    if (briteEditorTargetsRef()) {
      if (!refStrip.length) return null;
      var rp = refPos;
      if (rp < 0 || rp >= refStrip.length) rp = 0;
      return GLYPH_ORDER[refStrip[rp]];
    }
    return GLYPH_ORDER[((idx % GORDER_LEN) + GORDER_LEN) % GORDER_LEN];
  }
  function syncBriteEditorFromMap(force) {
    var host = document.getElementById('da-brite-edit-host');
    if (!host || !host.querySelector) return;
    var ch = getBriteEditorGlyphKey();
    if (!ch) return;
    if (!force && briteEditorDirty && ch === briteEditorLastKey) return;
    briteEditorLastKey = ch;
    briteEditorDirty = false;
    briteEditorRows = cloneBrite(getRows(ch));
    paintBriteEditorGrid();
    updateBriteEditorLabels();
  }
  function paintBriteEditorGrid() {
    var host = document.getElementById('da-brite-edit-host');
    if (!host) return;
    var btns = host.querySelectorAll('button.da-peg-edit');
    var pegI = 0, r, c, row, bit, b, on;
    for (r = 0; r < 6; r++) {
      row = briteEditorRows[r] || '000000';
      for (c = 0; c < 6; c++) {
        bit = row.charAt(c);
        b = btns[pegI++];
        if (!b) continue;
        on = bit === '1';
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
  }
  function setBriteEditorCell(r, c, on) {
    var row = briteEditorRows[r] || '000000';
    var arr = row.split('');
    arr[c] = on ? '1' : '0';
    briteEditorRows[r] = arr.join('');
  }
  function updateBriteEditorLabels() {
    var ch = getBriteEditorGlyphKey();
    var lab = document.getElementById('da-brite-edit-char');
    var meta = document.getElementById('da-brite-edit-meta');
    var dump = document.getElementById('da-brite-edit-dump');
    if (lab) lab.textContent = ch ? displayChar(ch) : '—';
    if (meta) {
      if (!ch) meta.textContent = '';
      else {
        var cp = ch.codePointAt(0);
        var slot = GLYPH_ORDER.indexOf(ch);
        meta.textContent =
          'U+' +
          cp.toString(16).toUpperCase().padStart(4, '0') +
          ' · ' +
          (briteEditorTargetsRef() ? 'ref strip' : 'hero slot') +
          (slot >= 0 ? ' · #' + slot : '') +
          (briteEditorDirty ? ' · edited' : '');
      }
    }
    if (dump) dump.textContent = briteEditorRows.join('\n');
  }
  function onBriteEditPegDown(ev) {
    ev.preventDefault();
    var btn = ev.currentTarget;
    var r = +btn.dataset.r;
    var c = +btn.dataset.c;
    var curOn = (briteEditorRows[r] || '000000').charAt(c) === '1';
    britePaintTarget = curOn ? '0' : '1';
    setBriteEditorCell(r, c, britePaintTarget === '1');
    briteEditorDirty = true;
    paintBriteEditorGrid();
    updateBriteEditorLabels();
  }
  function onBriteEditPegEnter(ev) {
    if (britePaintTarget == null) return;
    var btn = ev.currentTarget;
    var r = +btn.dataset.r;
    var c = +btn.dataset.c;
    setBriteEditorCell(r, c, britePaintTarget === '1');
    briteEditorDirty = true;
    paintBriteEditorGrid();
    updateBriteEditorLabels();
  }
  function endBritePaint() {
    britePaintTarget = null;
  }
  function validateBriteRows(rows) {
    if (!Array.isArray(rows) || rows.length !== 6) return { err: 'Need exactly 6 row strings' };
    var i;
    for (i = 0; i < 6; i++) {
      if (typeof rows[i] !== 'string' || !/^[01]{6}$/.test(rows[i])) {
        return { err: 'Row ' + (i + 1) + ' must be six 0/1 characters' };
      }
    }
    return { rows: rows };
  }
  /** Parse Copy JS output, or raw JSON array of 6 binary strings. */
  function parseBriteMapSnippet(text) {
    if (!text || typeof text !== 'string') return { err: 'Empty' };
    var t = text.trim();
    if (t.charAt(0) === '[') {
      var rows0;
      try {
        rows0 = JSON.parse(t.replace(/'/g, '"'));
      } catch (ej) {
        return { err: 'Invalid array JSON' };
      }
      return validateBriteRows(rows0);
    }
    var eq = t.indexOf('=');
    if (eq < 0) return { err: 'Need BRITE_MAP[key] = [...] or a JSON array' };
    var head = t.slice(0, eq).trim();
    var hm = head.match(/^BRITE_MAP\s*\[\s*([\s\S]*)\s*\]\s*$/i);
    if (!hm) return { err: 'Left side must be BRITE_MAP[key]' };
    var keyPart = hm[1].trim();
    var key;
    try {
      key = JSON.parse(keyPart);
    } catch (ek) {
      try {
        key = JSON.parse(keyPart.replace(/'/g, '"'));
      } catch (ek2) {
        if ((keyPart.charAt(0) === '"' || keyPart.charAt(0) === "'") && keyPart.length >= 2) {
          key = keyPart.slice(1, -1);
        } else return { err: 'Could not parse key' };
      }
    }
    var rhs = t.slice(eq + 1).trim().replace(/;\s*$/, '');
    if (rhs.charAt(0) !== '[') return { err: 'Right side must start with [' };
    var rows;
    try {
      rows = JSON.parse(rhs.replace(/'/g, '"'));
    } catch (ea) {
      return { err: 'Could not parse row array' };
    }
    var vr = validateBriteRows(rows);
    if (vr.err) return vr;
    return { key: key, rows: vr.rows };
  }
  function applyBritePasteResult(res) {
    if (res.err) {
      updateBriteEditorLabels();
      var me = document.getElementById('da-brite-edit-meta');
      if (me) me.textContent += ' · ⚠ ' + res.err;
      return;
    }
    briteEditorRows = cloneBrite(res.rows);
    briteEditorDirty = true;
    paintBriteEditorGrid();
    updateBriteEditorLabels();
    var meta = document.getElementById('da-brite-edit-meta');
    if (meta && res.key != null) {
      var cur = getBriteEditorGlyphKey();
      if (cur !== res.key) {
        meta.textContent +=
          ' · pasted key ' + displayChar(res.key) + ' (Apply still uses **target** glyph)';
      } else {
        meta.textContent += ' · pasted key ✓';
      }
    }
  }
  function initBriteEditorUi() {
    var host = document.getElementById('da-brite-edit-host');
    if (!host) return;
    host.innerHTML = '';
    var r, c, btn;
    for (r = 0; r < 6; r++) {
      for (c = 0; c < 6; c++) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'da-peg da-peg-edit';
        btn.dataset.r = String(r);
        btn.dataset.c = String(c);
        btn.setAttribute('aria-pressed', 'false');
        btn.title = 'R' + (r + 1) + ' C' + (c + 1);
        btn.addEventListener('pointerdown', onBriteEditPegDown);
        btn.addEventListener('pointerenter', onBriteEditPegEnter);
        host.appendChild(btn);
      }
    }
    if (!briteEditorPaintGlobBound) {
      briteEditorPaintGlobBound = true;
      document.addEventListener('pointerup', endBritePaint);
      document.addEventListener('pointercancel', endBritePaint);
    }
    var ap = document.getElementById('da-brite-apply');
    var rv = document.getElementById('da-brite-revert');
    var cl = document.getElementById('da-brite-clear');
    var cp = document.getElementById('da-brite-copy-snippet');
    var tr = document.getElementById('da-brite-edit-ref');
    if (ap) {
      ap.addEventListener('click', function () {
        var ch2 = getBriteEditorGlyphKey();
        if (!ch2) return;
        BRITE_MAP[ch2] = cloneBrite(briteEditorRows);
        delete DA_SYNTH_BRITE[ch2];
        briteEditorDirty = false;
        briteEditorLastKey = ch2;
        buildGrid();
        if (briteEditorTargetsRef()) {
          paintRefCard();
        } else {
          syncHero();
        }
        encodePhrase();
        persistBriteOverrideToLocalStorage(ch2, briteEditorRows);
        refreshBriteLsUi();
        updateBriteEditorLabels();
      });
    }
    if (rv) rv.addEventListener('click', function () { syncBriteEditorFromMap(true); });
    if (cl) {
      cl.addEventListener('click', function () {
        briteEditorRows = ['000000', '000000', '000000', '000000', '000000', '000000'];
        briteEditorDirty = true;
        paintBriteEditorGrid();
        updateBriteEditorLabels();
      });
    }
    if (cp) {
      cp.addEventListener('click', function () {
        var ch2 = getBriteEditorGlyphKey();
        if (!ch2) return;
        var rowsStr = briteEditorRows.map(function (row) { return "'" + row + "'"; }).join(', ');
        var snippet = 'BRITE_MAP[' + JSON.stringify(ch2) + '] = [' + rowsStr + '];';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(snippet);
          else {
            var ta = document.createElement('textarea');
            ta.value = snippet;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
        } catch (eCp) {}
      });
    }
    var pcl = document.getElementById('da-brite-paste-clip');
    var pap = document.getElementById('da-brite-paste-apply');
    var pta = document.getElementById('da-brite-paste-ta');
    if (pap) {
      pap.addEventListener('click', function () {
        var raw = pta ? pta.value : '';
        if (!raw || !String(raw).trim()) return;
        applyBritePasteResult(parseBriteMapSnippet(raw));
      });
    }
    if (pcl) {
      pcl.addEventListener('click', function () {
        function go(txt) {
          if (!txt || !String(txt).trim()) {
            if (pta) pta.focus();
            return;
          }
          applyBritePasteResult(parseBriteMapSnippet(String(txt)));
          if (pta) pta.value = '';
        }
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(go).catch(function () {
            if (pta) pta.focus();
          });
        } else if (pta) {
          pta.focus();
        }
      });
    }
    if (tr) tr.addEventListener('change', function () { syncBriteEditorFromMap(true); });
    var exLs = document.getElementById('da-brite-export-ls');
    var clLs = document.getElementById('da-brite-clear-ls');
    if (exLs) {
      exLs.addEventListener('click', function () {
        var js = briteLocalOverridesToJsPatch();
        var stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadTextAsFile('digital-alphabet-brite-overrides-' + stamp + '.js', js, 'text/javascript;charset=utf-8');
      });
    }
    if (clLs) {
      clLs.addEventListener('click', function () {
        if (!getBriteLocalOverrideCount()) return;
        if (!confirm('Clear all browser-saved BRITE_MAP overrides? Page will reload.')) return;
        try {
          localStorage.removeItem(DA_BRITE_LS_KEY);
        } catch (eCl) {}
        location.reload();
      });
    }
    refreshBriteLsUi();
    syncBriteEditorFromMap(true);
  }
  function displayChar(c) {
    if (c === ' ') return '\u2423';
    return c;
  }
  var anim = { lastSlot: null, busy: false, slotCb: [], flipEndCb: [], pausedAuto: true };
  function readUiAnim() {
    function $(id) { return document.getElementById(id); }
    return {
      flip: $('da-flip-en') ? $('da-flip-en').checked : true,
      flipMs: parseInt($('da-flip-ms') ? $('da-flip-ms').value : '280', 10) || 280,
      rollN: parseInt($('da-roll-n') ? $('da-roll-n').value : '3', 10) || 0,
      rollMode: $('da-roll-mode') ? $('da-roll-mode').value : 'walk',
      pegTick: $('da-peg-tick') ? $('da-peg-tick').checked : true
    };
  }
  function pushFlipCss() {
    var u = readUiAnim();
    var h = document.querySelector('.da-hero');
    if (h) h.style.setProperty('--da-flip-ms', u.flipMs + 'ms');
  }
  function reducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (eRm) {
      return false;
    }
  }
  function stepTowardSlot(from, to) {
    var d = (to - from + GORDER_LEN) % GORDER_LEN;
    if (d <= GORDER_LEN / 2) return (from + 1) % GORDER_LEN;
    return (from - 1 + GORDER_LEN) % GORDER_LEN;
  }
  function emitSlot(i) {
    var c = GLYPH_ORDER[i];
    anim.slotCb.forEach(function (fn) {
      try { fn(i, c); } catch (eS) {}
    });
  }
  function emitFlipEnd() {
    anim.flipEndCb.forEach(function (fn) {
      try { fn(); } catch (eF) {}
    });
  }
  function paintBriteRows(el, rows, opts) {
    opts = opts || {};
    var mini = !!opts.mini;
    var tick = !!opts.tick && !mini;
    var syn = !!opts.synthetic;
    if (!el || !rows) return;
    el.classList.remove('da-pegs-tick');
    var phCls = rowsMatchPlaceholder(rows) || syn ? ' da-brite--ph' : '';
    el.className = (mini ? 'da-brite da-brite--mini' : 'da-brite') + phCls;
    el.innerHTML = '';
    var r, c0, ch0, peg, pegI;
    pegI = 0;
    for (r = 0; r < 6; r++) {
      for (c0 = 0; c0 < 6; c0++) {
        ch0 = rows[r].charAt(c0);
        peg = document.createElement('span');
        peg.className = 'da-peg' + (ch0 === '1' ? ' is-on' : '');
        peg.setAttribute('aria-hidden', 'true');
        peg.style.setProperty('--peg-i', String(pegI++));
        el.appendChild(peg);
      }
    }
    if (tick && readUiAnim().pegTick && !reducedMotion()) {
      el.classList.add('da-pegs-tick');
      var ms = readUiAnim().flipMs;
      setTimeout(function () { el.classList.remove('da-pegs-tick'); }, ms + 6 * 14 + 60);
    }
  }
  function paintRefCard() {
    var brR = document.getElementById('da-ref-brite');
    var chFilm = document.getElementById('da-ref-ch');
    var chCenter = document.getElementById('da-ref-center');
    var Ln = refStrip.length;
    if (!Ln) {
      if (chFilm) chFilm.textContent = '—';
      if (chCenter) chCenter.textContent = '—';
      if (brR) paintBriteRows(brR, PLACEHOLDER, { mini: true });
      syncBriteEditorFromMap(false);
      return;
    }
    if (refPos < 0 || refPos >= Ln) refPos = 0;
    var gIx = refStrip[refPos];
    var g = GLYPH_ORDER[gIx];
    var disp = displayChar(g);
    if (chFilm) chFilm.textContent = disp;
    if (chCenter) chCenter.textContent = disp;
    if (brR) paintBriteRows(brR, getRows(g), { mini: true, synthetic: isSyntheticGlyph(g) });
    syncBriteEditorFromMap(false);
  }
  function tickRefPingPong() {
    var Ln = refStrip.length;
    if (Ln <= 1) return;
    var np = refPos + refDir;
    if (np >= Ln || np < 0) refDir = -refDir;
    refPos += refDir;
    paintRefCard();
  }
  function refLoopMs() {
    var elMs = document.getElementById('da-ref-ms');
    var n = elMs ? parseInt(elMs.value, 10) : 380;
    if (isNaN(n)) n = 380;
    return Math.max(80, Math.min(2400, n));
  }
  function scheduleRefLoop() {
    if (refLoopTimer) {
      clearInterval(refLoopTimer);
      refLoopTimer = null;
    }
    var chk = document.getElementById('da-ref-loop');
    if (!chk || !chk.checked) return;
    if (reducedMotion()) {
      paintRefCard();
      return;
    }
    refLoopTimer = setInterval(tickRefPingPong, refLoopMs());
  }
  function runHeroFlip(readout) {
    var boxP = document.getElementById('da-hero-pat-box');
    var frontP = document.getElementById('da-hero-pat');
    var backP = document.getElementById('da-hero-pat-next');
    if (!boxP || !frontP) {
      if (frontP) frontP.textContent = readout;
      emitFlipEnd();
      return;
    }
    if (backP) backP.textContent = readout;
    var done = false;
    function settle() {
      if (done) return;
      done = true;
      frontP.textContent = readout;
      boxP.classList.remove('is-open');
      boxP.removeEventListener('transitionend', onE);
      emitFlipEnd();
    }
    function onE(e) {
      if (e.propertyName !== 'transform') return;
      settle();
    }
    boxP.addEventListener('transitionend', onE);
    var ms = readUiAnim().flipMs;
    setTimeout(settle, ms + 100);
    requestAnimationFrame(function () {
      boxP.classList.add('is-open');
    });
  }
  function transitionSlot(i, u, useMotion) {
    var c = GLYPH_ORDER[i];
    var cp = c.codePointAt(0);
    var readout = heroReadoutForChar(c);
    var nb = nibbleFromCodePoint(cp);
    var brEl = document.getElementById('da-brite');
    var doFlip = !!(useMotion && u.flip && !reducedMotion());
    var rowC = getRows(c);
    if (brEl) paintBriteRows(brEl, rowC, { mini: false, tick: doFlip, synthetic: isSyntheticGlyph(c) });
    var shellEl = document.querySelector('.da-brite-shell');
    if (shellEl) shellEl.classList.toggle('da-brite-shell--ph', isSyntheticGlyph(c));
    document.getElementById('da-metrics').innerHTML =
      'slot <strong>' + i + '</strong> · <strong>' + GORDER_LEN + '</strong> glyphs · 6×6 <strong>' + pegArtLabel(c) + '</strong> · nibble <strong>0b' + nb.toString(2).padStart(4, '0') +
      '</strong> · <strong>U+' + cp.toString(16).toUpperCase().padStart(4, '0') + '</strong>';
    document.querySelectorAll('.da-cell').forEach(function (el2) {
      var gi = parseInt(el2.dataset.i, 10);
      el2.classList.toggle('is-on', gi === i);
    });
    var disp = displayChar(c);
    var heroCh = document.getElementById('da-hero-ch');
    if (heroCh) heroCh.textContent = disp;
    var grid = document.getElementById('da-grid');
    if (grid && doFlip) {
      grid.classList.remove('da-grid-tick');
      void grid.offsetWidth;
      grid.classList.add('da-grid-tick');
    }
    var live = document.getElementById('da-hero-aria');
    if (live) live.textContent = 'Slot ' + i + ' · ' + disp + ' · ' + readout;
    if (doFlip) runHeroFlip(readout);
    else {
      document.getElementById('da-hero-pat').textContent = readout;
      emitFlipEnd();
    }
    syncBriteEditorFromMap(false);
  }
  function syncHero() {
    pushFlipCss();
    var i = ((idx % GORDER_LEN) + GORDER_LEN) % GORDER_LEN;
    if (anim.busy) {
      transitionSlot(i, readUiAnim(), false);
      anim.lastSlot = i;
      emitSlot(i);
      return;
    }
    var prev = anim.lastSlot;
    var u = readUiAnim();
    if (prev === null || prev === i) {
      anim.lastSlot = i;
      transitionSlot(i, u, false);
      emitSlot(i);
      return;
    }
    if (!u.flip || u.rollN <= 0) {
      anim.lastSlot = i;
      transitionSlot(i, u, true);
      emitSlot(i);
      return;
    }
    anim.busy = true;
    var path = [];
    var cur = prev;
    var t, target = i;
    for (t = 0; t < u.rollN && cur !== target; t++) {
      if (u.rollMode === 'random') {
        cur = daVisibleSlots[Math.floor(Math.random() * Math.max(1, daVisibleSlots.length))];
      } else cur = stepTowardInVisible(cur, target);
      path.push(cur);
    }
    var pi = 0;
    function tickRoll() {
      if (pi < path.length) {
        transitionSlot(path[pi], u, true);
        pi++;
        setTimeout(tickRoll, Math.max(50, u.flipMs * 0.4));
      } else {
        anim.lastSlot = target;
        transitionSlot(target, u, true);
        anim.busy = false;
        emitSlot(target);
      }
    }
    tickRoll();
  }
  function renderLangTabs() {
    var host = document.getElementById('da-lang-tabs');
    if (!host) return;
    host.innerHTML = '';
    var TABS = DA_TAB_MAN.tabs || [];
    var ti, tb, tdef;
    for (ti = 0; ti < TABS.length; ti++) {
      tdef = TABS[ti];
      tb = document.createElement('button');
      tb.type = 'button';
      tb.className = 'da-lang-tab';
      tb.setAttribute('role', 'tab');
      tb.setAttribute('aria-selected', tdef.id === daActiveTabId ? 'true' : 'false');
      tb.textContent = tdef.label;
      tb.dataset.tabId = tdef.id;
      tb.title = (function () {
        var tip = tdef.id + (tdef.f ? ' · flags ' + tdef.f : '');
        if (tdef.qpLangs && tdef.qpLangs.length) tip += ' · qp: ' + tdef.qpLangs.join(', ');
        if (tdef.kbd && tdef.kbd.length) tip += ' · kbd: ' + tdef.kbd.join(', ');
        if (tdef.letters) {
          var lc = 0;
          var lj;
          var ls = tdef.letters;
          for (lj = 0; lj < ls.length; ) {
            lj += ls.codePointAt(lj) > 0xffff ? 2 : 1;
            lc++;
          }
          tip += ' · script letters: ' + lc;
        }
        return tip;
      })();
      tb.addEventListener('click', function () {
        daActiveTabId = this.dataset.tabId;
        rebuildVisibleSlots();
        ensureIdxInVisible();
        renderLangTabs();
        buildGrid();
        anim.lastSlot = null;
        syncHero();
        encodePhrase();
      });
      host.appendChild(tb);
    }
    var cnt = document.getElementById('da-tab-count');
    if (cnt) cnt.textContent = String(daVisibleSlots.length);
    var mv = document.getElementById('da-manifest-ver');
    if (mv) mv.textContent = String(DA_TAB_MAN.version || '0');
  }
  function buildGrid() {
    var g = document.getElementById('da-grid');
    g.innerHTML = '';
    var b, p, t2, miniB, lab, visI, globalIdx;
    for (visI = 0; visI < daVisibleSlots.length; visI++) {
      globalIdx = daVisibleSlots[visI];
      ch = GLYPH_ORDER[globalIdx];
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'da-cell';
      b.setAttribute('role', 'listitem');
      b.dataset.i = String(globalIdx);
      b.classList.toggle('da-cell--ph', isSyntheticGlyph(ch));
      p = braillePatForChar(ch);
      b.title = bracketPatForChar(ch) + ' ' + p + ' · U+' + ch.codePointAt(0).toString(16).toUpperCase() + (isSyntheticGlyph(ch) ? ' · SYNTH peg' : '');
      miniB = document.createElement('div');
      paintBriteRows(miniB, getRows(ch), { mini: true, synthetic: isSyntheticGlyph(ch) });
      lab = document.createElement('span');
      lab.className = 'da-cell-ch';
      lab.textContent = displayChar(ch);
      t2 = document.createElement('span');
      t2.className = 'da-cell-pat';
      t2.textContent = p;
      t2.setAttribute('lang', 'und-Brai');
      b.appendChild(miniB);
      b.appendChild(lab);
      b.appendChild(t2);
      b.addEventListener('click', function () {
        idx = parseInt(this.dataset.i, 10) || 0;
        syncHero();
        encodePhrase();
      });
      g.appendChild(b);
    }
  }
  function schedule() {
    if (timer) clearInterval(timer);
    timer = null;
    var autoplay = document.getElementById('da-autoplay').checked;
    if (!autoplay || anim.pausedAuto) return;
    var ms = parseInt(document.getElementById('da-delay').value, 10) || 480;
    timer = setInterval(function () {
      if (anim.busy) return;
      idx = nextInVisible(idx, 1);
      syncHero();
    }, Math.max(80, ms));
  }
  function encodePhrase() {
    var raw = document.getElementById('da-phrase').value || '';
    var secBr = [];
    var secFlip = [];
    var secPlain = [];
    var chars = [];
    var it, st, k, c0, Lm;
    for (it = raw[Symbol.iterator](); !(st = it.next()).done;) chars.push(st.value);
    Lm = chars.length;
    for (k = 0; k < Lm; k++) {
      c0 = chars[k];
      if (c0 === '\n') {
        secBr.push('\n');
        secFlip.push('\n');
        secPlain.push('\n');
        continue;
      }
      if (c0 === '\r') continue;
      secBr.push(braillePatForChar(c0));
      secFlip.push(bracketPatForChar(c0));
      secPlain.push(c0);
      if (k < Lm - 1 && chars[k + 1] !== '\n' && chars[k + 1] !== '\r') {
        secBr.push(' ');
        secFlip.push(' ');
        secPlain.push(' ');
      }
    }
    var trail = /\s+$/;
    var bLine = secBr.join('').replace(trail, '');
    var fLine = secFlip.join('').replace(trail, '');
    var pLine = secPlain.join('').replace(trail, '');
    var pegBlock = pegStreamSectionForChars(chars);
    var block =
      '\u2550\u2550 Braille (Unicode U+2800+ · same nibble, only dots 1–4) \u2550\u2550\n' +
      (bLine || '\u2014') +
      '\n\n\u2550\u2550 6\u00D76 hole punch / peg (\u00B7 off, \u25CF on; dashed cells = SYNTH) \u2550\u2550\n' +
      (pegBlock || '\u2014') +
      '\n\n\u2550\u2550 Nibble hash stream [. = 0, : = 1] — not Unicode Braille \u2550\u2550\n' +
      (fLine || '\u2014') +
      '\n\n\u2550\u2550 Plain codepoints \u2550\u2550\n' +
      (pLine || '\u2014');
    document.getElementById('da-stream').textContent = block;
  }
  function syncMetaTheme() {
    var m = document.getElementById('da-meta-theme');
    if (!m) return;
    m.setAttribute('content', document.documentElement.getAttribute('data-theme') === 'light' ? '#fafafa' : '#0a0a0b');
  }
  function copyPat() {
    var i = ((idx % GORDER_LEN) + GORDER_LEN) % GORDER_LEN;
    var c0 = GLYPH_ORDER[i];
    var line = (c0 === ' ' ? 'space' : c0) + '\t' + bracketPatForChar(c0) + '\t' + braillePatForChar(c0);
    try {
      navigator.clipboard.writeText(line).catch(function () {});
    } catch (e) {}
  }

  function parseUrlAnim() {
    var p;
    try { p = new URLSearchParams(location.search); } catch (eU) { return; }
    function on(id, key) {
      var el = document.getElementById(id);
      if (!el || !p.has(key)) return;
      el.checked = p.get(key) !== '0' && p.get(key) !== 'false';
    }
    function num(id, key, def) {
      var el = document.getElementById(id);
      if (!el || !p.has(key)) return;
      el.value = p.get(key) || String(def);
    }
    on('da-flip-en', 'daFlip');
    on('da-peg-tick', 'daPeg');
    on('da-autoplay', 'daAuto');
    num('da-flip-ms', 'daFlipMs', 280);
    num('da-roll-n', 'daRoll', 3);
    num('da-delay', 'daDelay', 480);
    if (p.has('daRollMode')) {
      var m = document.getElementById('da-roll-mode');
      if (m && (p.get('daRollMode') === 'random' || p.get('daRollMode') === 'walk')) m.value = p.get('daRollMode');
    }
    if (p.has('daSlot')) {
      var si = parseInt(p.get('daSlot'), 10);
      if (!isNaN(si)) idx = ((si % GORDER_LEN) + GORDER_LEN) % GORDER_LEN;
    }
    if (p.has('daTab')) {
      var tUrl = p.get('daTab');
      if (tUrl) {
        var okT = false, zi, TZ = DA_TAB_MAN.tabs || [];
        for (zi = 0; zi < TZ.length; zi++) {
          if (TZ[zi].id === tUrl) { okT = true; break; }
        }
        if (okT) daActiveTabId = tUrl;
      }
    }
  }
  parseUrlAnim();
  (function syncBootStoppedWithAutoplayUi() {
    var ap0 = document.getElementById('da-autoplay');
    anim.pausedAuto = !(ap0 && ap0.checked);
  })();
  rebuildVisibleSlots();
  ensureIdxInVisible();
  renderLangTabs();

  buildGrid();
  pushFlipCss();
  anim.lastSlot = null;
  syncHero();
  schedule();
  encodePhrase();
  paintRefCard();
  initBriteEditorUi();
  scheduleRefLoop();

  document.getElementById('da-step').addEventListener('click', function () {
    if (anim.busy) return;
    idx = nextInVisible(idx, 1);
    syncHero();
  });
  document.getElementById('da-reset').addEventListener('click', function () {
    idx = daVisibleSlots[0] || 0;
    syncHero();
  });
  document.getElementById('da-copy').addEventListener('click', copyPat);
  document.getElementById('da-play').addEventListener('click', function () {
    var ap = document.getElementById('da-autoplay');
    if (ap) ap.checked = true;
    anim.pausedAuto = false;
    schedule();
    var rl = document.getElementById('da-ref-loop');
    if (rl) rl.checked = true;
    scheduleRefLoop();
  });
  document.getElementById('da-stop').addEventListener('click', function () {
    anim.pausedAuto = true;
    if (timer) clearInterval(timer);
    timer = null;
    var rl2 = document.getElementById('da-ref-loop');
    if (rl2) rl2.checked = false;
    if (refLoopTimer) {
      clearInterval(refLoopTimer);
      refLoopTimer = null;
    }
  });
  document.getElementById('da-autoplay').addEventListener('change', function () {
    if (this.checked) anim.pausedAuto = false;
    schedule();
  });
  document.getElementById('da-delay').addEventListener('change', schedule);
  document.getElementById('da-flip-en').addEventListener('change', function () { pushFlipCss(); });
  document.getElementById('da-flip-ms').addEventListener('change', pushFlipCss);
  document.getElementById('da-roll-n').addEventListener('change', function () {});
  document.getElementById('da-roll-mode').addEventListener('change', function () {});
  (function wireRefCardUi() {
    var btnL = document.getElementById('da-ref-left');
    var btnR = document.getElementById('da-ref-right');
    var chkLoop = document.getElementById('da-ref-loop');
    var msIn = document.getElementById('da-ref-ms');
    if (btnL) {
      btnL.addEventListener('click', function () {
        var Ln = refStrip.length;
        if (!Ln) return;
        refPos = (refPos - 1 + Ln) % Ln;
        refDir = -1;
        paintRefCard();
      });
    }
    if (btnR) {
      btnR.addEventListener('click', function () {
        var Ln2 = refStrip.length;
        if (!Ln2) return;
        refPos = (refPos + 1) % Ln2;
        refDir = 1;
        paintRefCard();
      });
    }
    if (chkLoop) chkLoop.addEventListener('change', scheduleRefLoop);
    if (msIn) {
      msIn.addEventListener('change', scheduleRefLoop);
      msIn.addEventListener('input', scheduleRefLoop);
    }
  })();
 
  document.getElementById('da-phrase').addEventListener('input', encodePhrase);
  document.getElementById('da-bench').addEventListener('click', function () {
    var rep = runDaBenchmark({ rounds: 8, phraseLen: 640 });
    var el = document.getElementById('da-metrics');
    var extra =
      ' · bench <strong>' + rep.codepointsPerSec + '</strong> cp/s (avg ' + rep.avgMs + 'ms / ' + rep.phraseLen + ' cp × ' + rep.rounds + ')';
    if (el) {
      var i = ((idx % GORDER_LEN) + GORDER_LEN) % GORDER_LEN;
      var c = GLYPH_ORDER[i];
      var cp = c.codePointAt(0);
      var nb = nibbleFromCodePoint(cp);
      var rCur = getRows(c);
      el.innerHTML =
        'slot <strong>' + i + '</strong> · <strong>' + GORDER_LEN + '</strong> glyphs · 6×6 <strong>' + pegArtLabel(c) + '</strong> · nibble <strong>0b' + nb.toString(2).padStart(4, '0') +
        '</strong> · <strong>U+' + cp.toString(16).toUpperCase().padStart(4, '0') + '</strong>' + extra;
    }
    try {
      console.table(rep);
    } catch (eTb) {
      console.log('[digital-alphabet bench]', rep);
    }
  });

  try {
    if (window.QuantumPrefixes && QuantumPrefixes.onThemeChange) {
      QuantumPrefixes.onThemeChange(function () { syncMetaTheme(); });
    }
  } catch (eT) {}
  syncMetaTheme();

  function unsub(arr, fn) {
    var i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  /** Pure CPU: nibble→Braille + bracket triple pass (no DOM). Returns timing stats. */
  function runDaBenchmark(opts) {
    opts = opts || {};
    var rounds = Math.max(1, parseInt(opts.rounds, 10) || 5);
    var phraseLen = Math.max(32, parseInt(opts.phraseLen, 10) || 512);
    var phrase = '';
    var gi = 0;
    while (phrase.length < phraseLen) {
      phrase += GLYPH_ORDER[gi % GORDER_LEN];
      gi++;
    }
    var t0, t1, r, k, c0, sumMs = 0, minMs = 1e12, maxMs = 0;
    var cp, bAccum = '', fAccum = '';
    for (r = 0; r < rounds; r++) {
      t0 = performance.now();
      bAccum = '';
      fAccum = '';
      for (k = 0; k < phrase.length; k++) {
        c0 = phrase[k];
        bAccum += braillePatForChar(c0);
        fAccum += bracketPatForChar(c0);
        cp = c0.codePointAt(0);
        nibbleFromCodePoint(cp);
      }
      t1 = performance.now();
      var dt = t1 - t0;
      sumMs += dt;
      if (dt < minMs) minMs = dt;
      if (dt > maxMs) maxMs = dt;
    }
    var avg = sumMs / rounds;
    var cps = phrase.length / (avg / 1000);
    void bAccum;
    void fAccum;
    return {
      rounds: rounds,
      phraseLen: phrase.length,
      avgMs: +avg.toFixed(4),
      minMs: +minMs.toFixed(4),
      maxMs: +maxMs.toFixed(4),
      codepointsPerSec: Math.round(cps)
    };
  }
  var animApi = {
    setConfig: function (o) {
      o = o || {};
      function $(id) { return document.getElementById(id); }
      if ('flip' in o && $('da-flip-en')) $('da-flip-en').checked = !!o.flip;
      if ('flipMs' in o && $('da-flip-ms')) $('da-flip-ms').value = String(Math.max(80, o.flipMs | 0));
      if ('rollSteps' in o && $('da-roll-n')) $('da-roll-n').value = String(Math.max(0, Math.min(14, o.rollSteps | 0)));
      if ('rollMode' in o && $('da-roll-mode')) $('da-roll-mode').value = o.rollMode === 'random' ? 'random' : 'walk';
      if ('pegStagger' in o && $('da-peg-tick')) $('da-peg-tick').checked = !!o.pegStagger;
      if ('autoplay' in o && $('da-autoplay')) {
        $('da-autoplay').checked = !!o.autoplay;
        anim.pausedAuto = !o.autoplay;
      }
      if ('autoplayMs' in o && $('da-delay')) $('da-delay').value = String(Math.max(80, o.autoplayMs | 0));
      if ('glyphTab' in o && o.glyphTab) {
        daActiveTabId = String(o.glyphTab);
        rebuildVisibleSlots();
        ensureIdxInVisible();
        renderLangTabs();
        buildGrid();
        anim.lastSlot = null;
        syncHero();
        encodePhrase();
      }
      pushFlipCss();
      schedule();
    },
    getConfig: readUiAnim,
    getState: function () {
      var i = ((idx % GORDER_LEN) + GORDER_LEN) % GORDER_LEN;
      return {
        slot: i,
        char: GLYPH_ORDER[i],
        busy: anim.busy,
        paused: anim.pausedAuto,
        glyphCount: GORDER_LEN,
        glyphTab: daActiveTabId,
        visibleGlyphCount: daVisibleSlots.length
      };
    },
    gotoSlot: function (n) {
      idx = ((parseInt(n, 10) | 0) % GORDER_LEN + GORDER_LEN) % GORDER_LEN;
      ensureIdxInVisible();
      syncHero();
    },
    gotoChar: function (symbol) {
      if (symbol == null) return false;
      var s = typeof symbol === 'string' ? symbol : String(symbol);
      var ix = GLYPH_ORDER.indexOf(s);
      if (ix < 0) return false;
      idx = ix;
      ensureIdxInVisible();
      syncHero();
      return true;
    },
    pauseAutoplay: function () {
      anim.pausedAuto = true;
      if (timer) clearInterval(timer);
      timer = null;
      var rlP = document.getElementById('da-ref-loop');
      if (rlP) rlP.checked = false;
      if (refLoopTimer) {
        clearInterval(refLoopTimer);
        refLoopTimer = null;
      }
    },
    resumeAutoplay: function () {
      anim.pausedAuto = false;
      schedule();
      var rlR = document.getElementById('da-ref-loop');
      if (rlR) rlR.checked = true;
      scheduleRefLoop();
    },
    onSlot: function (fn) {
      if (typeof fn !== 'function') return function () {};
      anim.slotCb.push(fn);
      return function () { unsub(anim.slotCb, fn); };
    },
    onFlipEnd: function (fn) {
      if (typeof fn !== 'function') return function () {};
      anim.flipEndCb.push(fn);
      return function () { unsub(anim.flipEndCb, fn); };
    }
  };

  window.DigitalAlphabet = {
    VERSION: '0.5.13',
    BRITE6: BRITE6,
    BRITE_MAP: BRITE_MAP,
    GLYPH_ORDER: GLYPH_ORDER,
    PLACEHOLDER: PLACEHOLDER,
    nibbleFromCodePoint: nibbleFromCodePoint,
    bracketPatForChar: bracketPatForChar,
    braillePatForChar: braillePatForChar,
    heroReadoutForChar: heroReadoutForChar,
    benchmark: runDaBenchmark,
    getRows: getRows,
    paintBriteRows: paintBriteRows,
    getSlot: function () { return ((idx % GORDER_LEN) + GORDER_LEN) % GORDER_LEN; },
    getChar: function () { return GLYPH_ORDER[((idx % GORDER_LEN) + GORDER_LEN) % GORDER_LEN]; },
    listGlyphTabs: function () {
      return (DA_TAB_MAN.tabs || []).map(function (t) {
        return {
          id: t.id,
          label: t.label,
          flags: t.f || '',
          extra: t.x || '',
          letters: t.letters || '',
          qpLangs: t.qpLangs || [],
          kbd: t.kbd || []
        };
      });
    },
    getGlyphTab: function () { return daActiveTabId; },
    setGlyphTab: function (id) {
      daActiveTabId = id || 'all';
      rebuildVisibleSlots();
      ensureIdxInVisible();
      renderLangTabs();
      buildGrid();
      anim.lastSlot = null;
      syncHero();
      encodePhrase();
    },
    glyphTabManifestVersion: function () { return DA_TAB_MAN.version; },
    isPlaceholderGlyph: isPlaceholderGlyph,
    isSyntheticGlyph: isSyntheticGlyph,
    rowsMatchPlaceholder: rowsMatchPlaceholder,
    PLACEHOLDER_ROWS: PLACEHOLDER,
    getRefStrip: function () { return refStrip.slice(); },
    getRefSlot: function () { return refPos; },
    setRefSlot: function (p) {
      var Ln = refStrip.length;
      if (!Ln) return;
      refPos = (((parseInt(p, 10) || 0) % Ln) + Ln) % Ln;
      paintRefCard();
    },
    getRefChar: function () {
      if (!refStrip.length) return '';
      return GLYPH_ORDER[refStrip[refPos]];
    },
    paintRefCard: paintRefCard,
    scheduleRefLoop: scheduleRefLoop,
    syncBriteEditor: function (force) { syncBriteEditorFromMap(!!force); },
    parseBriteMapSnippet: parseBriteMapSnippet,
    getBriteLocalOverrideCount: getBriteLocalOverrideCount,
    exportBriteLocalPatchJs: briteLocalOverridesToJsPatch,
    anim: animApi
  };

  function _daHandleAnimMessage(d, ev) {
    var api = window.DigitalAlphabet.anim;
    if (!api) return;
    if (d.action === 'config') api.setConfig(d.payload || d.config || {});
    else if (d.action === 'gotoSlot') api.gotoSlot(d.slot);
    else if (d.action === 'gotoChar') api.gotoChar(d.char || d.ch);
    else if (d.action === 'pause' || d.action === 'stop') api.pauseAutoplay();
    else if (d.action === 'resume' || d.action === 'play') {
      var apEl = document.getElementById('da-autoplay');
      if (apEl) apEl.checked = true;
      api.resumeAutoplay();
    }
    else if (d.action === 'step') {
      if (!anim.busy) {
        idx = nextInVisible(idx, 1);
        syncHero();
      }
    } else if (d.action === 'glyphTab' && window.DigitalAlphabet.setGlyphTab) {
      window.DigitalAlphabet.setGlyphTab(d.tab || d.id);
    }
    try {
      if (ev && ev.source && ev.source.postMessage) {
        ev.source.postMessage({ type: 'da-anim-ack', action: d.action, ok: true, ts: Date.now() }, ev.origin || '*');
      }
    } catch (ePm) {}
  }
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.type !== 'da-anim') return;
    _daHandleAnimMessage(d, ev);
  });
  try {
    var _daBc = new BroadcastChannel('digital-alphabet-anim');
    _daBc.onmessage = function (ev) {
      var d = ev.data;
      if (!d || d.type !== 'da-anim') return;
      _daHandleAnimMessage(d, null);
    };
  } catch (eBc) {}
})();
