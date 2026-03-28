    // ================================================================
    //  kbatch — World Keyboard & Quantum Analyzer
    //  15 layouts · IBM Quantum bridge · local simulator
    //  Dictionary · Training drills · Thermal/Contrail viz
    // ================================================================

    // Shared stack envelope + bus publisher for ecosystem-native routing.
    function buildStackEnvelope(content, language, source) {
        var text = String(content || '');
        var lang = language || 'text';
        var src = source || 'kbatch';
        var QP = window.QuantumPrefixes;
        var QC = window.qbitCodec;
        var prefixMeta = null;
        var codecMeta = null;
        if (QP && QP.prefixMetadata) {
            try { prefixMeta = QP.prefixMetadata(text, lang); } catch (_) {}
        }
        if (QC && QC.encode) {
            try {
                var encoded = QC.encode(text, lang, src);
                codecMeta = {
                    encodedBytes: ((encoded && (encoded.code || encoded.text)) || '').length,
                    t5: (typeof QC.t5Available === 'function') ? (QC.t5Available() ? 'native' : 'browser') : 'browser'
                };
            } catch (_) {}
        }
        return {
            source: src,
            language: lang,
            content: text,
            quantumGutter: prefixMeta || { coverage: 0, totalLines: 0, classifiedLines: 0, prefixCounts: {} },
            codec: codecMeta || { encodedBytes: 0, t5: 'browser' },
            timestamp: Date.now()
        };
    }

    function publishToEcosystem(type, payload, channels) {
        var list = channels || ['iron-line', 'uterm-notes', 'kbatch-training'];
        if (typeof BroadcastChannel === 'undefined') return;
        list.forEach(function(chName) {
            try {
                var bc = new BroadcastChannel(chName);
                bc.postMessage({ type: type, source: 'kbatch', payload: payload, ts: Date.now() });
                bc.close();
            } catch (_) {}
        });
    }

    function buildPrefixBlocks(text, language) {
        var QP = window.QuantumPrefixes;
        var gateMap = (window.GATE_MAP || { '+1:':'H','1:':'CNOT','-1:':'X','+0:':'Rz','0:':'I','-0:':'S','+n:':'T','n:':'SWAP','-n:':'M','+2:':'CZ','+3:':'Y',' ':'·' });
        var tokens = String(text || '').split(/\s+/).filter(Boolean).slice(0, 256);
        return tokens.map(function(tok, idx) {
            var res = QP && QP.classifyLine ? QP.classifyLine(tok, language || 'text') : { sym: ' ' };
            var sym = (res && res.sym) ? res.sym : ' ';
            return {
                id: 'blk-' + idx,
                token: tok,
                prefix: sym,
                gate: gateMap[sym] || '·',
                category: (res && res.category) ? res.category : 'token',
                order: idx
            };
        });
    }

    async function loadCorpusSignals() {
        if (window._kbatchCorpusLoaded) return window._kbatchCorpus;
        var corpus = {
            chat: { sessions: 0, decisions: 0, loaded: false },
            progress: { decisions: 0, timelineEntries: 0, loaded: false },
            loadedAt: Date.now()
        };
        try {
            var res = await fetch('../chat-corpus.json', { cache: 'no-cache' });
            if (res.ok) {
                var json = await res.json();
                var sessions = Array.isArray(json) ? json : (Array.isArray(json.sessions) ? json.sessions : []);
                corpus.chat.sessions = sessions.length;
                corpus.chat.decisions = sessions.reduce(function(n, s) {
                    var d = s && (s.decisions || s.decisionLog || s.keyDecisions);
                    return n + (Array.isArray(d) ? d.length : 0);
                }, 0);
                corpus.chat.loaded = true;
            }
        } catch (_) {}
        try {
            var mdRes = await fetch('../PROGRESS.md', { cache: 'no-cache' });
            if (mdRes.ok) {
                var md = await mdRes.text();
                var dec = md.match(/Architectural Decisions[^\n]*?(\d+)/i);
                var tl = md.match(/Session Timeline/gi);
                corpus.progress.decisions = dec ? parseInt(dec[1], 10) : 0;
                corpus.progress.timelineEntries = tl ? tl.length : 0;
                corpus.progress.loaded = true;
            }
        } catch (_) {}
        window._kbatchCorpus = corpus;
        window._kbatchCorpusLoaded = true;
        return corpus;
    }

    // ══════════════════ WORLD KEYBOARD LAYOUTS ══════════════════
    const LAYOUTS = {
        qwerty: {
            name:'QWERTY', region:'US/International', script:'Latin', dir:'ltr',
            rows:[['q','w','e','r','t','y','u','i','o','p'],
                  ['a','s','d','f','g','h','j','k','l',';'],
                  ['z','x','c','v','b','n','m',',','.','/']],
            homeRow:'asdfghjkl;'
        },
        dvorak: {
            name:'Dvorak', region:'US', script:'Latin', dir:'ltr',
            rows:[[`'`,',','.','p','y','f','g','c','r','l'],
                  ['a','o','e','u','i','d','h','t','n','s'],
                  [';','q','j','k','x','b','m','w','v','z']],
            homeRow:'aoeuidhtns'
        },
        colemak: {
            name:'Colemak', region:'US', script:'Latin', dir:'ltr',
            rows:[['q','w','f','p','g','j','l','u','y',';'],
                  ['a','r','s','t','d','h','n','e','i','o'],
                  ['z','x','c','v','b','k','m',',','.','/']],
            homeRow:'arstdhneio'
        },
        azerty: {
            name:'AZERTY', region:'France', script:'Latin', dir:'ltr',
            rows:[['a','z','e','r','t','y','u','i','o','p'],
                  ['q','s','d','f','g','h','j','k','l','m'],
                  ['w','x','c','v','b','n',',',';',':','!']],
            homeRow:'qsdfghjklm'
        },
        qwertz: {
            name:'QWERTZ', region:'Germany/Austria', script:'Latin', dir:'ltr',
            rows:[['q','w','e','r','t','z','u','i','o','p'],
                  ['a','s','d','f','g','h','j','k','l','\u00f6'],
                  ['y','x','c','v','b','n','m',',','.','-']],
            homeRow:'asdfghjkl\u00f6'
        },
        jcuken: {
            name:'\u0419\u0426\u0423\u041a\u0415\u041d (JCUKEN)', region:'Russia', script:'Cyrillic', dir:'ltr',
            rows:[['\u0439','\u0446','\u0443','\u043a','\u0435','\u043d','\u0433','\u0448','\u0449','\u0437'],
                  ['\u0444','\u044b','\u0432','\u0430','\u043f','\u0440','\u043e','\u043b','\u0434','\u0436'],
                  ['\u044f','\u0447','\u0441','\u043c','\u0438','\u0442','\u044c','\u0431','\u044e','.']],
            homeRow:'\u0444\u044b\u0432\u0430\u043f\u0440\u043e\u043b\u0434\u0436'
        },
        korean: {
            name:'2-Set Hangul', region:'Korea', script:'Hangul', dir:'ltr',
            rows:[['\u3142','\u3148','\u3137','\u3131','\u3145','\u315b','\u3155','\u3151','\u3150','\u3154'],
                  ['\u3141','\u3134','\u3147','\u3139','\u314e','\u3157','\u3153','\u314f','\u3163','\u3161'],
                  ['\u314b','\u314c','\u314a','\u314d','\u3160','\u315c','\u3159','\u3158','\u315e','\u315d']],
            homeRow:'\u3141\u3134\u3147\u3139\u314e\u3157\u3153\u314f\u3163\u3161'
        },
        japanese: {
            name:'Romaji (JIS)', region:'Japan', script:'Latin/Kana', dir:'ltr',
            rows:[['q','w','e','r','t','y','u','i','o','p'],
                  ['a','s','d','f','g','h','j','k','l',';'],
                  ['z','x','c','v','b','n','m',',','.','/']],
            homeRow:'asdfghjkl;',
            note:'Standard QWERTY for romaji input'
        },
        arabic: {
            name:'Arabic', region:'Middle East/North Africa', script:'Arabic', dir:'rtl',
            rows:[['\u0636','\u0635','\u062b','\u0642','\u0641','\u063a','\u0639','\u0647','\u062e','\u062d'],
                  ['\u0634','\u0633','\u064a','\u0628','\u0644','\u0627','\u062a','\u0646','\u0645','\u0643'],
                  ['\u0626','\u0621','\u0624','\u0631','\u0644','\u0649','\u0629','\u0648','\u0632','\u0638']],
            homeRow:'\u0634\u0633\u064a\u0628\u0644\u0627\u062a\u0646\u0645\u0643'
        },
        hindi: {
            name:'Hindi InScript', region:'India', script:'Devanagari', dir:'ltr',
            rows:[['\u094c','\u0948','\u093e','\u0940','\u0942','\u092c','\u0939','\u0917','\u0926','\u091c'],
                  ['\u094b','\u0947','\u094d','\u093f','\u0941','\u092a','\u0930','\u0915','\u0924','\u091a'],
                  ['\u0949','\u0945','\u0943','\u0928','\u0935','\u0932','\u0938',',','.','?']],
            homeRow:'\u094b\u0947\u094d\u093f\u0941\u092a\u0930\u0915\u0924\u091a'
        },
        hebrew: {
            name:'Hebrew', region:'Israel', script:'Hebrew', dir:'rtl',
            rows:[['\u002f','\u0027','\u05e7','\u05e8','\u05d0','\u05d8','\u05d5','\u05df','\u05dd','\u05e4'],
                  ['\u05e9','\u05d3','\u05d2','\u05db','\u05e2','\u05d9','\u05d7','\u05dc','\u05da','\u05e3'],
                  ['\u05d6','\u05e1','\u05d1','\u05d4','\u05e0','\u05de','\u05e6','\u05ea','\u05e5','.']],
            homeRow:'\u05e9\u05d3\u05d2\u05db\u05e2\u05d9\u05d7\u05dc\u05da\u05e3'
        },
        greek: {
            name:'Greek', region:'Greece/Cyprus', script:'Greek', dir:'ltr',
            rows:[[';','\u03c2','\u03b5','\u03c1','\u03c4','\u03c5','\u03b8','\u03b9','\u03bf','\u03c0'],
                  ['\u03b1','\u03c3','\u03b4','\u03c6','\u03b3','\u03b7','\u03be','\u03ba','\u03bb','\u0384'],
                  ['\u03b6','\u03c7','\u03c8','\u03c9','\u03b2','\u03bd','\u03bc',',','.','/']],
            homeRow:'\u03b1\u03c3\u03b4\u03c6\u03b3\u03b7\u03be\u03ba\u03bb\u0384'
        },
        thai: {
            name:'Kedmanee', region:'Thailand', script:'Thai', dir:'ltr',
            rows:[['\u0e46','\u0e44','\u0e33','\u0e1e','\u0e30','\u0e31','\u0e35','\u0e23','\u0e19','\u0e22'],
                  ['\u0e1f','\u0e2b','\u0e01','\u0e14','\u0e40','\u0e49','\u0e48','\u0e32','\u0e2a','\u0e27'],
                  ['\u0e1c','\u0e1b','\u0e41','\u0e2d','\u0e34','\u0e37','\u0e17','\u0e21','\u0e43','\u0e1d']],
            homeRow:'\u0e1f\u0e2b\u0e01\u0e14\u0e40\u0e49\u0e48\u0e32\u0e2a\u0e27'
        },
        turkish_f: {
            name:'Turkish F', region:'Turkey', script:'Latin', dir:'ltr',
            rows:[['f','g','\u011f','\u0131','o','d','r','n','h','p'],
                  ['u','i','e','a','\u00fc','t','k','m','l','y'],
                  ['j','\u00f6','v','c','\u00e7','z','s','b','.',',']],
            homeRow:'uiea\u00fctkmly'
        },
        vietnamese: {
            name:'Vietnamese Telex', region:'Vietnam', script:'Latin', dir:'ltr',
            rows:[['q','w','e','r','t','y','u','i','o','p'],
                  ['a','s','d','f','g','h','j','k','l',';'],
                  ['z','x','c','v','b','n','m',',','.','/']],
            homeRow:'asdfghjkl;',
            note:'QWERTY base + Telex diacritics (aa=\u00e2, ee=\u00ea, oo=\u00f4, dd=\u0111)'
        },
        contrail: {
            name:'Contrail ⊞', region:'μgrad/qbitOS', script:'Unicode Concept', dir:'ltr',
            rows:[['→','←','↔','⇒','⊞','⊟','∀','∃','⊤','⊥'],
                  ['⊢','∘','⊕','⊗','□','◇','○','●','▶','■'],
                  ['∩','∪','⊂','⊃','∈','≡','τ','σ','π','⊙']],
            homeRow:'⊢∘⊕⊗□◇○●▶■',
            shift:[['⟶','⟵','↕','⇔','⊠','⊡','∄','⊦','⊧','⊨'],
                   ['⊣','⫽','∥','⊲','⊳','◎','◉','▲','▼','⇝'],
                   ['⊆','⊇','≪','≫','∉','≢','ℕ','ℤ','ℝ','ℂ']],
            note:'Contrail shorthand — each key is a compressed code concept. Home row: structural operators. Top: flow/logic. Bottom: types/sets. μgrad learns these as block-level concepts via kBatch capsules. Shift layer adds extended symbols. Designed for code generation, not prose.'
        }
    };

    // ──────────────────── LAYOUT UTILITIES ────────────────────
    let activeLayoutId = 'qwerty';

    function getLayout(id) { return LAYOUTS[id || activeLayoutId]; }

    function buildKeyPos(layout) {
        const pos = {};
        layout.rows.forEach((row, r) => {
            row.forEach((key, c) => {
                pos[key] = { x: c + r * 0.25, y: r };
            });
        });
        pos[' '] = { x: 4.5, y: 3.2 };
        return pos;
    }

    function buildFingerMap(layout) {
        const fm = {};
        layout.rows.forEach((row) => {
            row.forEach((key, c) => {
                if (c <= 1) fm[key] = c;
                else if (c <= 3) fm[key] = 2 + (c - 2);
                else if (c <= 4) fm[key] = 3;
                else if (c <= 5) fm[key] = 5;
                else if (c <= 7) fm[key] = 5 + (c - 5);
                else fm[key] = 7 + (c - 8);
            });
        });
        return fm;
    }

    function getActiveRows() { return getLayout().rows; }
    function getActiveKeyPos() { return buildKeyPos(getLayout()); }

    function setActiveLayout(id) {
        if (!LAYOUTS[id]) return;
        activeLayoutId = id;
        document.getElementById('s-layout').textContent = LAYOUTS[id].name;
        document.getElementById('active-layout-badge').textContent = LAYOUTS[id].name;
        renderAll();
        renderLayoutPreview();
    }

    // ─── Auto-detect keyboard layout from typed text ───
    function detectLayout(text) {
        if (!text || text.length < 10) return null;
        var chars = text.toLowerCase().split('').filter(function(c) { return c.length === 1 && c !== ' '; });
        var scores = {};
        Object.entries(LAYOUTS).forEach(function(e) {
            var id = e[0], layout = e[1];
            var allKeys = layout.rows.flat().join('');
            var matched = chars.filter(function(c) { return allKeys.indexOf(c) !== -1; }).length;
            scores[id] = matched / Math.max(chars.length, 1);
        });
        // Script detection for non-Latin
        var hasArabic = /[\u0600-\u06FF]/.test(text);
        var hasCyrillic = /[\u0400-\u04FF]/.test(text);
        var hasHangul = /[\uAC00-\uD7AF\u3130-\u318F]/.test(text);
        var hasDevanagari = /[\u0900-\u097F]/.test(text);
        var hasHebrew = /[\u0590-\u05FF]/.test(text);
        var hasGreek = /[\u0370-\u03FF]/.test(text);
        var hasThai = /[\u0E00-\u0E7F]/.test(text);
        if (hasArabic) return 'arabic';
        if (hasCyrillic) return 'jcuken';
        if (hasHangul) return 'korean';
        if (hasDevanagari) return 'hindi';
        if (hasHebrew) return 'hebrew';
        if (hasGreek) return 'greek';
        if (hasThai) return 'thai';
        // For Latin scripts, check layout-specific keys
        if (text.indexOf('\u00f6') !== -1 || text.indexOf('\u00fc') !== -1 || text.indexOf('\u00e4') !== -1) {
            return scores.qwertz > scores.turkish_f ? 'qwertz' : 'turkish_f';
        }
        // Sort by match score
        var sorted = Object.entries(scores).sort(function(a,b) { return b[1] - a[1]; });
        return sorted[0] ? sorted[0][0] : 'qwerty';
    }

    function autoDetectAndSwap(text) {
        var detected = detectLayout(text);
        if (detected && detected !== activeLayoutId) {
            setActiveLayout(detected);
            return detected;
        }
        return activeLayoutId;
    }

    // Quick swap: cycle through layouts or jump to specific one
    function quickSwapLayout(direction) {
        var ids = Object.keys(LAYOUTS);
        var idx = ids.indexOf(activeLayoutId);
        if (direction === 'next') idx = (idx + 1) % ids.length;
        else if (direction === 'prev') idx = (idx - 1 + ids.length) % ids.length;
        else if (LAYOUTS[direction]) { setActiveLayout(direction); return direction; }
        setActiveLayout(ids[idx]);
        return ids[idx];
    }

    // Direction symbols
    function dirSymbol(dx, dy) {
        if (dx > 0.3 && dy < -0.3) return '\u2197';
        if (dx > 0.3 && dy > 0.3) return '\u2198';
        if (dx < -0.3 && dy < -0.3) return '\u2196';
        if (dx < -0.3 && dy > 0.3) return '\u2199';
        if (dx > 0.3) return '\u2192';
        if (dx < -0.3) return '\u2190';
        if (dy < -0.3) return '\u2191';
        if (dy > 0.3) return '\u2193';
        return '\u00b7';
    }

    // ══════════════════ ANALYSIS ENGINE ══════════════════
    class KBatchAnalyzer {
        constructor() { this.reset(); }

        reset() {
            this.heatmap = {};
            this.transitions = [];
            this.words = 0;
            this.totalDist = 0;
            this.totalKeys = 0;
            this.startTime = Date.now();
            this.lastKey = null;
            this.wordFreq = {};
            this.buffer = '';
            this.history = [];
        }

        processKey(key) {
            const k = key.toLowerCase();
            const KEY_POS = getActiveKeyPos();
            if (!KEY_POS[k] && k !== ' ') return;

            this.totalKeys++;
            this.heatmap[k] = (this.heatmap[k] || 0) + 1;

            if (this.lastKey && KEY_POS[k] && KEY_POS[this.lastKey]) {
                const from = KEY_POS[this.lastKey];
                const to = KEY_POS[k];
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                this.totalDist += dist;
                this.transitions.push({ from: this.lastKey, to: k, dx, dy, dist });
                if (this.transitions.length > 500) this.transitions.shift();
            }
            this.lastKey = k;

            if (k === ' ') {
                const word = this.buffer.trim();
                if (word.length > 0) {
                    this.words++;
                    this.wordFreq[word] = (this.wordFreq[word] || 0) + 1;
                }
                this.buffer = '';
            } else {
                this.buffer += k;
            }
        }

        analyzeWord(word) {
            let dist = 0, path = '', complexity = 0;
            const chars = word.toLowerCase().split('');
            const KEY_POS = getActiveKeyPos();
            for (let i = 1; i < chars.length; i++) {
                const a = KEY_POS[chars[i-1]], b = KEY_POS[chars[i]];
                if (a && b) {
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    dist += d;
                    path += dirSymbol(dx, dy);
                    if (Math.abs(dy) > 0.3) complexity += 15;
                    if (Math.abs(dx) > 2) complexity += 10;
                }
            }
            const maxDist = (chars.length - 1) * 3;
            const efficiency = maxDist > 0 ? Math.max(0, 100 - (dist / maxDist) * 100) : 100;
            complexity = Math.min(100, complexity);
            return { word, efficiency, complexity, distance: dist, path, length: word.length };
        }

        get state() {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const wpm = elapsed > 0 ? (this.words / elapsed) * 60 : 0;
            const avgDist = this.totalKeys > 1 ? this.totalDist / (this.totalKeys - 1) : 0;
            const efficiency = avgDist > 0 ? Math.max(0, 100 - avgDist * 30) : 100;
            const strain = Math.min(100, avgDist * 25);
            const hapax = Object.values(this.wordFreq).filter(c => c === 1).length;
            const rowChanges = this.transitions.filter(t => Math.abs(t.dy) > 0.3).length;
            const complexity = this.transitions.length > 0
                ? Math.min(100, (rowChanges / this.transitions.length) * 100 * 1.5) : 0;
            return {
                wpm, efficiency, complexity, strain,
                totalKeys: this.totalKeys, totalDist: this.totalDist,
                words: this.words, hapax, avgDist, elapsed,
                layout: activeLayoutId,
                heatmap: { ...this.heatmap },
                transitions: [...this.transitions],
                wordFreq: { ...this.wordFreq },
            };
        }

        topKeys(n = 10) {
            return Object.entries(this.heatmap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, n)
                .map(([key, count]) => ({ key: key === ' ' ? 'SPC' : key, count }));
        }
    }

    const analyzer = new KBatchAnalyzer();

    // ══════════════════ VIZ RENDERERS ══════════════════
    function thermalColor(intensity) {
        const i = Math.min(1, Math.max(0, intensity));
        if (i < 0.2) return `rgb(${Math.floor(i*5*80)},${Math.floor(i*5*120)},${Math.floor(180+i*5*75)})`;
        if (i < 0.4) return `rgb(${Math.floor(40+(i-0.2)*5*100)},${Math.floor(180-(i-0.2)*5*40)},${Math.floor(100-(i-0.2)*5*100)})`;
        if (i < 0.6) return `rgb(${Math.floor(200+(i-0.4)*5*55)},${Math.floor(200-(i-0.4)*5*80)},0)`;
        if (i < 0.8) return `rgb(255,${Math.floor(120-(i-0.6)*5*80)},0)`;
        return `rgb(255,${Math.floor(40+(i-0.8)*5*200)},${Math.floor((i-0.8)*5*200)})`;
    }

    function renderThermal(canvas) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width = canvas.parentElement.clientWidth;
        const H = canvas.height = canvas.parentElement.clientHeight;
        ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
        const ROWS = getActiveRows();
        const hm = analyzer.heatmap;
        const maxCount = Math.max(1, ...Object.values(hm));
        const keyW = W / 11.5, keyH = H / 4.5;
        const padL = (W - 10 * keyW) / 2;

        ROWS.forEach((row, r) => {
            const offset = r * 0.4 * keyW;
            row.forEach((key, c) => {
                const x = padL + offset + c * keyW;
                const y = 10 + r * (keyH + 4);
                const count = hm[key] || 0;
                const intensity = count / maxCount;
                if (count > 0) {
                    ctx.fillStyle = thermalColor(intensity);
                    ctx.globalAlpha = 0.15 + intensity * 0.4;
                    ctx.beginPath();
                    ctx.arc(x + keyW/2, y + keyH/2, keyW * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
                ctx.fillStyle = count > 0 ? thermalColor(intensity) : '#21262d';
                ctx.fillRect(x + 2, y + 2, keyW - 4, keyH - 4);
                ctx.strokeStyle = count > 0 ? thermalColor(Math.min(1, intensity + 0.2)) : '#30363d';
                ctx.lineWidth = count > 0 ? 1.5 : 0.5;
                ctx.strokeRect(x + 2, y + 2, keyW - 4, keyH - 4);
                ctx.fillStyle = intensity > 0.5 ? '#0d1117' : '#8b949e';
                ctx.font = `${Math.max(9, keyH * 0.35)}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(key.toUpperCase(), x + keyW/2, y + keyH * 0.55);
                if (count > 0) {
                    ctx.fillStyle = intensity > 0.5 ? '#0d1117' : '#58a6ff';
                    ctx.font = `${Math.max(7, keyH * 0.22)}px monospace`;
                    ctx.fillText(String(count), x + keyW/2, y + keyH * 0.82);
                }
                ctx.textAlign = 'start';
            });
        });
    }

    function renderContrails(canvas) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width = canvas.parentElement.clientWidth;
        const H = canvas.height = canvas.parentElement.clientHeight;
        ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
        const KEY_POS = getActiveKeyPos();
        const trans = analyzer.transitions;
        if (trans.length < 2) {
            ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
            ctx.fillText('Type to see contrails...', W/2, H/2);
            ctx.textAlign = 'start'; return;
        }
        function kx(key) { const p = KEY_POS[key]; return p ? (p.x / 10) * (W - 40) + 20 : W/2; }
        function ky(key) { const p = KEY_POS[key]; return p ? (p.y / 3.5) * (H - 40) + 20 : H/2; }
        const len = trans.length;
        for (let i = Math.max(0, len - 200); i < len; i++) {
            const t = trans[i];
            const age = (len - i) / 200;
            const alpha = 0.05 + (1 - age) * 0.6;
            const fx = kx(t.from), fy = ky(t.from);
            const tx = kx(t.to), ty = ky(t.to);
            ctx.strokeStyle = `rgba(240,136,62,${alpha})`;
            ctx.lineWidth = 1 + (1 - age) * 2;
            ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
            if (i > len - 20) {
                ctx.fillStyle = `rgba(240,136,62,${alpha * 0.4})`;
                ctx.beginPath(); ctx.arc(tx, ty, 4 + (1 - age) * 6, 0, Math.PI * 2); ctx.fill();
            }
        }
        if (analyzer.lastKey && KEY_POS[analyzer.lastKey]) {
            const cx = kx(analyzer.lastKey), cy = ky(analyzer.lastKey);
            ctx.fillStyle = '#f0883e';
            ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(240,136,62,0.2)';
            ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
        }
        for (const key in KEY_POS) {
            if (key === ' ') continue;
            const x = kx(key), y = ky(key);
            ctx.fillStyle = '#30363d';
            ctx.fillRect(x - 1, y - 1, 3, 3);
        }
    }

    function renderGeometric(canvas) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width = canvas.parentElement.clientWidth;
        const H = canvas.height = canvas.parentElement.clientHeight;
        ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        const radius = Math.min(W, H) * 0.4;
        const hm = analyzer.heatmap;
        const maxCount = Math.max(1, ...Object.values(hm));
        const allKeys = getActiveRows().flat();
        const n = allKeys.length;
        allKeys.forEach((key, i) => {
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
            const count = hm[key] || 0;
            const intensity = count / maxCount;
            const r = radius * (0.6 + intensity * 0.4);
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i > 0) {
                const prevAngle = ((i - 1) / n) * Math.PI * 2 - Math.PI / 2;
                const prevCount = hm[allKeys[i-1]] || 0;
                const prevInt = prevCount / maxCount;
                const pr = radius * (0.6 + prevInt * 0.4);
                const px = cx + Math.cos(prevAngle) * pr;
                const py = cy + Math.sin(prevAngle) * pr;
                ctx.strokeStyle = `rgba(210,168,255,${0.1 + intensity * 0.3})`;
                ctx.lineWidth = 0.5 + intensity * 1.5;
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
            }
            ctx.strokeStyle = `rgba(210,168,255,${0.03 + intensity * 0.1})`;
            ctx.lineWidth = 0.3;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
            const nodeR = 3 + intensity * 8;
            if (count > 0) {
                ctx.fillStyle = `rgba(210,168,255,${0.1 + intensity * 0.3})`;
                ctx.beginPath(); ctx.arc(x, y, nodeR + 6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = count > 0 ? thermalColor(intensity) : '#30363d';
            ctx.beginPath(); ctx.arc(x, y, nodeR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#c9d1d9'; ctx.font = `${Math.max(8, nodeR)}px monospace`;
            ctx.textAlign = 'center'; ctx.fillText(key.toUpperCase(), x, y + nodeR + 12);
            ctx.textAlign = 'start';
        });
        if (allKeys.length > 1) {
            const a1 = 0, a2 = (allKeys.length - 1) / n * Math.PI * 2 - Math.PI / 2;
            const a1a = -Math.PI / 2;
            const c1 = hm[allKeys[0]] || 0, c2 = hm[allKeys[allKeys.length-1]] || 0;
            const r1 = radius * (0.6 + (c1/maxCount)*0.4);
            const r2 = radius * (0.6 + (c2/maxCount)*0.4);
            ctx.strokeStyle = 'rgba(210,168,255,0.1)'; ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
            ctx.lineTo(cx + Math.cos(a1a) * r1, cy + Math.sin(a1a) * r1);
            ctx.stroke();
        }
    }

    function render3D(canvas) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width = canvas.parentElement.clientWidth;
        const H = canvas.height = canvas.parentElement.clientHeight;
        ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
        const wf = analyzer.wordFreq;
        const words = Object.entries(wf).sort((a, b) => b[1] - a[1]);
        if (words.length === 0) {
            ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
            ctx.fillText('Type words to see 3D language model...', W/2, H/2);
            ctx.textAlign = 'start'; return;
        }
        const maxFreq = Math.max(1, words[0][1]);
        const cols = Math.ceil(Math.sqrt(words.length));
        const cellW = W / (cols + 1), cellH = H / (Math.ceil(words.length / cols) + 1);
        words.forEach(([word, freq], i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const x = cellW * (col + 0.5), y = cellH * (row + 0.5);
            const analysis = analyzer.analyzeWord(word);
            const eff = analysis.efficiency / 100;
            const size = Math.max(8, 10 + (freq / maxFreq) * 14);
            ctx.fillStyle = `rgba(${Math.floor(120-eff*120)},${Math.floor(eff*200)},${Math.floor(100+eff*100)},0.15)`;
            ctx.fillRect(x - size * word.length * 0.15, y + 2, size * word.length * 0.35, size * 0.6);
            const barW = Math.min(cellW * 0.8, size * word.length * 0.35);
            ctx.fillStyle = '#21262d'; ctx.fillRect(x - barW/2, y + size * 0.6, barW, 3);
            ctx.fillStyle = eff > 0.6 ? '#7ee787' : eff > 0.3 ? '#e6b422' : '#f97583';
            ctx.fillRect(x - barW/2, y + size * 0.6, barW * eff, 3);
            ctx.font = `${size}px monospace`; ctx.textAlign = 'center';
            ctx.fillText(word, x, y);
            if (freq > 1) {
                ctx.fillStyle = '#484f58'; ctx.font = `${Math.max(7, size * 0.5)}px monospace`;
                ctx.fillText('\u00d7' + freq, x, y - size * 0.5);
            }
            ctx.textAlign = 'start';
        });
    }

    function renderAll() {
        renderThermal(document.getElementById('cv-thermal'));
        renderContrails(document.getElementById('cv-contrails'));
        renderGeometric(document.getElementById('cv-geometric'));
        render3D(document.getElementById('cv-3d'));
    }

    const STACK_BENCH = { last: null, updatedAt: 0 };

    function runStackBenchmark(sampleText) {
        const text = (sampleText && sampleText.trim()) || 'kbatch gluelam iron-line steno t5 quantum gutter prefixes benchmark contrail musica';
        const started = performance.now();
        const QP = window.QuantumPrefixes;
        const QC = window.qbitCodec;
        const QS = window.QbitSteno;
        const Enc = window.Encoder;
        const timings = {};

        const dependencies = {
            quantumPrefixes: !!window.QuantumPrefixes,
            classifyConfidence: !!window.ClassifyConfidence,
            classifyTensor: !!window.ClassifyTensor,
            classifyAdam: !!window.ClassifyAdam,
            qbitDAC: !!window.prefixDAC,
            qbitCodec: !!window.qbitCodec,
            qbitSteno: !!window.QbitSteno,
            qbitPreflight: !!window.QbitPreflight,
            contrails: !!window.Contrails,
            encoder: !!window.Encoder,
            capsuleAnalyzer: !!window.CapsuleAnalyzer,
            corpusProgress: !!(window._kbatchCorpus && window._kbatchCorpus.progress && window._kbatchCorpus.progress.loaded),
            corpusChat: !!(window._kbatchCorpus && window._kbatchCorpus.chat && window._kbatchCorpus.chat.loaded)
        };
        const hasGluelam = !!(dependencies.quantumPrefixes && dependencies.qbitDAC && dependencies.qbitSteno && dependencies.qbitCodec);

        let prefixMeta = null;
        let languages = [];
        if (QP && QP.prefixMetadata) {
            const t0 = performance.now();
            prefixMeta = QP.prefixMetadata(text, 'text');
            timings.prefixMs = performance.now() - t0;
            languages = Object.keys((QP.LANG_PATTERNS || QP.LANGUAGE_PATTERNS || {}));
        }

        let stenoRoundTrip = false;
        if (QS && QS.stenoEncode && QS.stenoDecode) {
            const t0 = performance.now();
            try {
                const encoded = QS.stenoEncode(text, 'text');
                const decoded = QS.stenoDecode((encoded && encoded.code) || '');
                stenoRoundTrip = ((decoded && decoded.code) || '') === text;
            } catch (_) { stenoRoundTrip = false; }
            timings.stenoMs = performance.now() - t0;
        }

        let codecRoundTrip = false;
        let t5Mode = 'browser';
        if (QC && QC.encode && QC.decode) {
            const t0 = performance.now();
            try {
                const encoded = QC.encode(text, 'text', 'kbatch-bench');
                const encodedText = (encoded && (encoded.code || encoded.text)) || '';
                const decoded = QC.decode(encodedText);
                codecRoundTrip = ((decoded && decoded.code) || '') === text;
            } catch (_) { codecRoundTrip = false; }
            timings.codecMs = performance.now() - t0;
            if (typeof QC.t5Available === 'function') {
                try { t5Mode = QC.t5Available() ? 'native' : 'browser'; }
                catch (_) { t5Mode = 'browser'; }
            }
        }

        const tPattern0 = performance.now();
        const tokens = (text.toLowerCase().match(/[a-z0-9_\-\+\#\.]+/g) || []).slice(0, 200);
        let patternSummary = { words: 0, avgEfficiency: 0, avgComplexity: 0, avgDistance: 0, avgRsiRisk: 0 };
        if (tokens.length) {
            const metrics = tokens.map(function(w) { return analyzer.analyzeWord(w); });
            const sum = metrics.reduce(function(acc, m) {
                acc.e += m.efficiency || 0;
                acc.c += m.complexity || 0;
                acc.d += m.distance || 0;
                acc.r += m.rsiRisk || 0;
                return acc;
            }, { e: 0, c: 0, d: 0, r: 0 });
            patternSummary = {
                words: metrics.length,
                avgEfficiency: Number((sum.e / metrics.length).toFixed(2)),
                avgComplexity: Number((sum.c / metrics.length).toFixed(2)),
                avgDistance: Number((sum.d / metrics.length).toFixed(3)),
                avgRsiRisk: Number((sum.r / metrics.length).toFixed(2))
            };
        }
        timings.patternMs = performance.now() - tPattern0;

        const tCaps0 = performance.now();
        const capsuleList = (window.kbatchCapsules || (typeof CAPSULES !== 'undefined' ? CAPSULES : [])) || [];
        const tokenSet = new Set(tokens);
        const capsuleHits = [];
        let capsuleWordHits = 0;
        capsuleList.forEach(function(cap) {
            const words = Array.isArray(cap.words) ? cap.words : [];
            let localHits = 0;
            words.forEach(function(w) {
                const ww = String(w || '').toLowerCase();
                if (tokenSet.has(ww)) {
                    localHits++;
                    capsuleWordHits++;
                }
            });
            if (localHits > 0) {
                capsuleHits.push({ id: cap.id, name: cap.name, hits: localHits, cat: cap.cat || 'misc' });
            }
        });
        capsuleHits.sort(function(a, b) { return b.hits - a.hits; });
        timings.capsulesMs = performance.now() - tCaps0;

        const flow = Enc && Enc.toKeyboardFlow ? Enc.toKeyboardFlow(text) : null;
        const rhythm = Enc && Enc.toRhythm ? Enc.toRhythm(text) : null;
        const musica = Enc && Enc.toMusicNotation ? Enc.toMusicNotation(text) : '';
        const codecMusica = (QC && QC.musicaDawPayload) ? QC.musicaDawPayload(text, 'text', 'kbatch-musica', {}) : null;

        const styleToNote = { 'n:':'C2', '+1:':'C4', '-n:':'D4', '+0:':'E4', '0:':'F4', '-1:':'G4', '+n:':'A4', '+2:':'B4', '-0:':'C5', '+3:':'D5', '1:':'E5' };
        const prefixCounts = (prefixMeta && prefixMeta.prefixCounts) ? prefixMeta.prefixCounts : {};
        const codeStyleAsMusic = Object.entries(prefixCounts)
            .sort(function(a, b) { return (b[1] || 0) - (a[1] || 0); })
            .slice(0, 16)
            .map(function(entry) { return (styleToNote[entry[0]] || 'R') + 'x' + entry[1]; })
            .join(' ');

        var corpusCats = (window._planCorpusIndex && window._planCorpusIndex.categories)
            ? Object.keys(window._planCorpusIndex.categories).length
            : 0;
        var corpus = window._kbatchCorpus || { chat: { sessions: 0, decisions: 0 }, progress: { decisions: 0, timelineEntries: 0 } };
        var corpusSignal = (corpus.chat.sessions || 0) + (corpus.chat.decisions || 0) + (corpus.progress.decisions || 0);
        var musicaBpm = Math.max(72, Math.min(240, 108 + (patternSummary.avgEfficiency / 2) + Math.min(36, capsuleHits.length) + Math.min(24, corpusCats) + Math.min(32, corpusSignal / 20)));
        var lineCount = Math.max(1, String(text || '').split('\n').length);
        var nsPerLine = (codecMusica && codecMusica.nsPerLine) ? Number(codecMusica.nsPerLine) : Number((((timings.codecMs || 0) * 1e6) / lineCount).toFixed(3));
        var qHz = (codecMusica && codecMusica.qHz) ? Number(codecMusica.qHz) : Number((1e9 / Math.max(0.001, nsPerLine)).toFixed(2));
        var qBPM = (codecMusica && codecMusica.qBPM) ? Number(codecMusica.qBPM) : Number((qHz * 60).toFixed(2));
        var calibrationLane = (codecMusica && codecMusica.calibrationLane) ? codecMusica.calibrationLane : (qBPM >= 1e8 ? 'beyond-bpm' : 'linear-bpm');
        var dawSupport = {
            webMIDI: !!(navigator && navigator.requestMIDIAccess),
            webAudio: !!(window.AudioContext || window.webkitAudioContext),
            abletonLinkBridge: true,
            midiClockBridge: true,
            oscBridge: true,
            pluginSurface: ['vst3-bridge', 'au-bridge', 'aax-bridge']
        };

        publishToEcosystem('kbatch-bench', {
            layer: 'L4',
            sampleLen: text.length,
            pattern: patternSummary,
            capsules: { matched: capsuleHits.length, wordHits: capsuleWordHits },
            langSupport: languages.length,
            musica: {
                bpm: Number(musicaBpm.toFixed(2)),
                qBPM: qBPM,
                qHz: qHz,
                nsPerLine: nsPerLine,
                calibrationLane: calibrationLane,
                notation: musica || '',
                codeStyleAsMusic: codeStyleAsMusic
            }
        }, ['iron-line', 'uterm-notes']);
        timings.ironLineMs = performance.now() - started;

        const result = {
            totalMs: Number((performance.now() - started).toFixed(3)),
            timings: {
                prefixMs: Number((timings.prefixMs || 0).toFixed(3)),
                stenoMs: Number((timings.stenoMs || 0).toFixed(3)),
                codecMs: Number((timings.codecMs || 0).toFixed(3)),
                patternMs: Number((timings.patternMs || 0).toFixed(3)),
                capsulesMs: Number((timings.capsulesMs || 0).toFixed(3)),
                ironLineMs: Number((timings.ironLineMs || 0).toFixed(3))
            },
            gluelam: hasGluelam,
            dependencies: dependencies,
            stenoRoundTrip: stenoRoundTrip,
            codecRoundTrip: codecRoundTrip,
            t5: t5Mode,
            languageSupport: {
                total: languages.length,
                target: 59,
                ready: languages.length >= 59,
                sample: languages.slice(0, 12)
            },
            quantumGutterCoverage: prefixMeta && typeof prefixMeta.coverage === 'number' ? Number(prefixMeta.coverage.toFixed(1)) : 0,
            prefixCounts: prefixCounts,
            patternAnalysis: patternSummary,
            capsules: {
                total: capsuleList.length,
                matched: capsuleHits.length,
                wordHits: capsuleWordHits,
                topMatches: capsuleHits.slice(0, 5)
            },
            contrail: {
                flow: flow && flow.arrows ? flow.arrows : '',
                rhythm: rhythm && rhythm.beats ? rhythm.beats : '',
                musica: (codecMusica && codecMusica.notation) || musica || ''
            },
            codeStyleAsMusic: codeStyleAsMusic,
            musicaEngine: {
                bpm: Number(((codecMusica && codecMusica.bpm) || musicaBpm).toFixed(2)),
                qBPM: qBPM,
                qHz: qHz,
                nsPerLine: nsPerLine,
                calibrationLane: calibrationLane,
                corpusCategories: corpusCats,
                corpusSignal: corpusSignal,
                profile: (codecMusica && codecMusica.profile) || (musicaBpm >= 180 ? 'lightspeed' : (musicaBpm >= 130 ? 'fast' : 'steady')),
                dawSupport: (codecMusica && codecMusica.daw) || dawSupport,
                codecBacked: !!codecMusica
            }
        };

        STACK_BENCH.last = result;
        STACK_BENCH.updatedAt = Date.now();
        window.__kbatchBench = result;
        return result;
    }

    function refreshStackIndicators() {
        const bench = STACK_BENCH.last;
        if (!bench) return;
        const stackEl = document.getElementById('s-stack');
        const benchEl = document.getElementById('s-bench');
        const t5El = document.getElementById('s-t5');
        if (stackEl) stackEl.textContent = bench.gluelam ? 'gluelam:ok' : 'gluelam:degraded';
        if (benchEl) benchEl.textContent = `${bench.totalMs.toFixed(2)}ms`;
        if (t5El) t5El.textContent = bench.t5;
    }

    function refreshStreamIndicators() {
        const streamEl = document.getElementById('s-stream');
        if (!streamEl) return;
        var status = window.__kbatchStreamStatus || null;
        var exportIndex = status && status.exportIndex ? status.exportIndex : null;
        var counts = exportIndex && exportIndex.counts ? exportIndex.counts : null;
        if (!counts) {
            streamEl.textContent = 'warming';
            streamEl.style.color = '#8b949e';
            return;
        }
        var assets = Number(counts.stream_assets_scanned || 0);
        var snaps = Number(counts.stream_snapshots_scanned || 0);
        streamEl.textContent = assets + 'a/' + snaps + 's';
        streamEl.style.color = snaps > 0 ? '#22a06b' : '#f59e0b';
    }

    function refreshMusicaPanel() {
        var bench = STACK_BENCH.last;
        if (!bench) return;
        var bpmEl = document.getElementById('musica-bpm');
        var qbpmEl = document.getElementById('musica-qbpm');
        var qhznsEl = document.getElementById('musica-qhzns');
        var notesEl = document.getElementById('musica-notes');
        var flowEl = document.getElementById('musica-flow');
        var styleEl = document.getElementById('musica-style');
        var profEl = document.getElementById('musica-profile');
        var dawEl = document.getElementById('musica-daw');
        if (bpmEl) bpmEl.textContent = String(bench.musicaEngine ? bench.musicaEngine.bpm : 0);
        if (qbpmEl) qbpmEl.textContent = String(bench.musicaEngine ? bench.musicaEngine.qBPM : 0);
        if (qhznsEl && bench.musicaEngine) qhznsEl.textContent = (bench.musicaEngine.qHz || 0) + ' QHz · ' + (bench.musicaEngine.nsPerLine || 0) + ' ns/line';
        if (notesEl) notesEl.textContent = (bench.contrail && bench.contrail.musica ? bench.contrail.musica : '—').slice(0, 120);
        if (flowEl) flowEl.textContent = (bench.contrail && bench.contrail.flow ? bench.contrail.flow : '—').slice(0, 64);
        if (styleEl) styleEl.textContent = (bench.codeStyleAsMusic || '—').slice(0, 240);
        if (profEl) profEl.textContent = 'profile: ' + (bench.musicaEngine ? bench.musicaEngine.profile : 'warming') + ' · lane: ' + (bench.musicaEngine ? bench.musicaEngine.calibrationLane : 'linear-bpm');
        if (dawEl && bench.musicaEngine && bench.musicaEngine.dawSupport) {
            var d = bench.musicaEngine.dawSupport;
            dawEl.textContent = (d.webMIDI ? 'MIDI ' : 'no-MIDI ') + '· ' + (d.webAudio ? 'Audio ' : 'no-Audio ') + '· OSC · Link · VST3/AU/AAX';
        }
    }

    function updateStats() {
        const s = analyzer.state;
        document.getElementById('s-wpm').textContent = s.wpm.toFixed(1);
        document.getElementById('s-eff').textContent = s.efficiency.toFixed(1) + '%';
        document.getElementById('s-cpx').textContent = s.complexity.toFixed(1) + '%';
        document.getElementById('s-strain').textContent = s.strain.toFixed(1) + '%';
        document.getElementById('s-keys').textContent = s.totalKeys;
        document.getElementById('s-dist').textContent = s.totalDist.toFixed(1);
        document.getElementById('s-words').textContent = s.words;
        document.getElementById('s-hapax').textContent = s.hapax;
        refreshStackIndicators();
        refreshStreamIndicators();
        refreshMusicaPanel();

        // ── Live pattern direction + encoder + ML benchmark overlay ──
        var liveEl = document.getElementById('s-live-intel');
        if (liveEl && s.totalKeys > 5) {
            var text = document.getElementById('typing-input') ? document.getElementById('typing-input').value : '';
            var parts = [];
            // Keyboard flow direction for recent typing
            if (window.Encoder && text.length > 3) {
                var lastChunk = text.slice(-20);
                var flow = window.Encoder.toKeyboardFlow(lastChunk);
                if (flow && flow.arrows) parts.push('<span style="color:#58a6ff;" title="Flow">' + flow.arrows.slice(-12) + '</span>');
                var rhythm = window.Encoder.toRhythm(lastChunk);
                if (rhythm) parts.push('<span style="color:#3fb950;" title="Rhythm">' + rhythm.beats.slice(-10) + '</span>');
                if (rhythm && rhythm.timeSig) parts.push('<span style="color:#484f58;">' + rhythm.timeSig + '</span>');
            }
            // StenoEngine concept compression
            if (window.StenoEngine && text.length > 10) {
                var comp = window.StenoEngine.compressSentence(text);
                if (comp) parts.push('<span style="color:#c084fc;" title="Concept stream">' + comp.compressed.slice(-10) + '</span> <span style="color:#484f58;">' + comp.ratio + 'x</span>');
            }
            // CapsuleAnalyzer ML benchmark for last word
            if (window.CapsuleAnalyzer && text.length > 3) {
                var lastWord = text.trim().split(/\s+/).pop() || '';
                if (lastWord.length > 2) {
                    var wa = window.CapsuleAnalyzer.lookupWord(lastWord);
                    if (wa && wa.analysis) {
                        parts.push('<span style="color:#fbbf24;" title="ML: eff/rsi/travel">' + wa.analysis.efficiency + '% ' + wa.analysis.rsiRisk + 'r ' + wa.analysis.travelMM + 'mm</span>');
                    }
                }
            }
            // Layout auto-detect indicator
            parts.push('<span style="color:#8b949e;">' + (LAYOUTS[activeLayoutId] ? LAYOUTS[activeLayoutId].name : activeLayoutId) + '</span>');
            if (STACK_BENCH.last) {
                parts.push('<span class="stack-chip">stack ' + (STACK_BENCH.last.gluelam ? 'ok' : 'warn') + '</span>');
                parts.push('<span class="stack-chip">bench ' + STACK_BENCH.last.totalMs.toFixed(2) + 'ms</span>');
                parts.push('<span class="stack-chip">t5 ' + STACK_BENCH.last.t5 + '</span>');
                parts.push('<span class="stack-chip">gutter ' + STACK_BENCH.last.quantumGutterCoverage.toFixed(1) + '%</span>');
            }
            var ss = window.__kbatchStreamStatus || null;
            var sc = ss && ss.exportIndex && ss.exportIndex.counts ? ss.exportIndex.counts : null;
            if (sc) {
                parts.push('<span class="stack-chip">stream ' + (sc.stream_assets_scanned || 0) + 'a/' + (sc.stream_snapshots_scanned || 0) + 's</span>');
            }
            var sp = ss && ss.preflight ? ss.preflight : null;
            if (sp && sp.mistral_vibe_ready) {
                parts.push('<span class="stack-chip">stream-preflight ready</span>');
            } else if (sp) {
                parts.push('<span class="stack-chip">stream-preflight pending</span>');
            }
            liveEl.innerHTML = parts.join(' \u00b7 ');
        }
    }

    // ══════════════════ LAYOUT PREVIEW RENDERER ══════════════════
    function renderLayoutPreview(compareId) {
        const canvas = document.getElementById('cv-layout');
        if (!canvas || !canvas.parentElement) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width = canvas.parentElement.clientWidth;
        const H = canvas.height = canvas.parentElement.clientHeight;
        ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
        const layout = getLayout();
        const compare = compareId ? LAYOUTS[compareId] : null;

        function drawKeyboard(rows, homeRow, offsetX, totalW, label, color) {
            const keyW = totalW / 11.5, keyH = (H - 80) / 4;
            const padL = offsetX + (totalW - 10 * keyW) / 2;
            // Label
            ctx.fillStyle = color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText(label, offsetX + totalW / 2, 18); ctx.textAlign = 'start';
            rows.forEach((row, r) => {
                const off = r * 0.4 * keyW;
                row.forEach((key, c) => {
                    const x = padL + off + c * keyW;
                    const y = 28 + r * (keyH + 4);
                    const isHome = homeRow && homeRow.includes(key);
                    ctx.fillStyle = isHome ? '#1c3a2a' : '#161b22';
                    ctx.fillRect(x + 2, y + 2, keyW - 4, keyH - 4);
                    ctx.strokeStyle = isHome ? '#2ea043' : '#30363d';
                    ctx.lineWidth = isHome ? 1.5 : 0.5;
                    ctx.strokeRect(x + 2, y + 2, keyW - 4, keyH - 4);
                    ctx.fillStyle = isHome ? '#7ee787' : '#c9d1d9';
                    ctx.font = `${Math.max(10, keyH * 0.4)}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText(key.toUpperCase(), x + keyW / 2, y + keyH * 0.6);
                    ctx.textAlign = 'start';
                });
            });
        }

        if (compare) {
            drawKeyboard(layout.rows, layout.homeRow, 0, W / 2 - 2, layout.name, '#f0883e');
            drawKeyboard(compare.rows, compare.homeRow, W / 2 + 2, W / 2 - 2, compare.name, '#58a6ff');
            // Comparison stats
            const words = ['the','and','that','have','with','this','from','they','been','said'];
            let totalA = 0, totalB = 0;
            const posA = buildKeyPos(layout), posB = buildKeyPos(compare);
            words.forEach(w => {
                let dA = 0, dB = 0;
                for (let i = 1; i < w.length; i++) {
                    const a1 = posA[w[i-1]], a2 = posA[w[i]];
                    const b1 = posB[w[i-1]], b2 = posB[w[i]];
                    if (a1 && a2) dA += Math.sqrt((a2.x-a1.x)**2 + (a2.y-a1.y)**2);
                    if (b1 && b2) dB += Math.sqrt((b2.x-b1.x)**2 + (b2.y-b1.y)**2);
                }
                totalA += dA; totalB += dB;
            });
            const pct = totalA > 0 ? ((totalA - totalB) / totalA * 100) : 0;
            const resultEl = document.getElementById('compare-result');
            if (resultEl) {
                if (Math.abs(pct) < 1) resultEl.textContent = 'Similar efficiency for common English words';
                else if (pct > 0) resultEl.textContent = `${compare.name} is ${pct.toFixed(1)}% shorter travel for common words`;
                else resultEl.textContent = `${layout.name} is ${(-pct).toFixed(1)}% shorter travel for common words`;
                resultEl.style.color = pct > 0 ? '#58a6ff' : '#f0883e';
            }
        } else {
            drawKeyboard(layout.rows, layout.homeRow, 0, W, layout.name, '#f0883e');
        }
    }

    // ══════════════════ DICTIONARY ENGINE ══════════════════
    const DictEngine = {
        cache: {},

        async lookup(word) {
            if (this.cache[word]) return this.cache[word];
            const results = { word, entries: [], synonyms: [], error: null };
            try {
                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
                if (res.ok) {
                    const data = await res.json();
                    results.entries = data;
                }
            } catch (e) { /* offline fallback */ }
            try {
                const res = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=12`);
                if (res.ok) {
                    const data = await res.json();
                    results.synonyms = data.map(d => d.word);
                }
            } catch (e) { /* offline fallback */ }
            if (results.entries.length === 0 && results.synonyms.length === 0) {
                results.error = 'No results found. Try a different word.';
            }
            this.cache[word] = results;
            return results;
        },

        renderResults(data, container) {
            container.innerHTML = '';
            if (data.error) {
                container.innerHTML = `<div style="text-align:center;padding:40px;color:#f97583;">${data.error}</div>`;
                return;
            }
            if (data.entries && data.entries.length) {
                data.entries.forEach(entry => {
                    const div = document.createElement('div');
                    div.className = 'dict-entry';
                    let html = `<span class="dict-word">${entry.word || data.word}</span>`;
                    if (entry.phonetic) html += `<span class="dict-phonetic">${entry.phonetic}</span>`;
                    if (entry.meanings) {
                        entry.meanings.forEach(m => {
                            html += `<div class="dict-pos">${m.partOfSpeech}</div>`;
                            m.definitions.slice(0, 3).forEach(d => {
                                html += `<div class="dict-def">\u2022 ${d.definition}</div>`;
                                if (d.example) html += `<div class="dict-example">"${d.example}"</div>`;
                            });
                        });
                    }
                    div.innerHTML = html;
                    container.appendChild(div);
                });
            }
            if (data.synonyms && data.synonyms.length) {
                const div = document.createElement('div');
                div.className = 'dict-entry';
                div.innerHTML = `<div class="dict-pos">Synonyms</div><div class="dict-syn">${data.synonyms.join(', ')}</div>`;
                container.appendChild(div);
            }
            // Keyboard analysis
            const analysis = analyzer.analyzeWord(data.word);
            const aDiv = document.createElement('div');
            aDiv.className = 'dict-entry';
            aDiv.innerHTML = `<div class="dict-pos">Keyboard Analysis (${LAYOUTS[activeLayoutId].name})</div>
                <div class="dict-def">\u2022 Efficiency: <span style="color:#7ee787;">${analysis.efficiency.toFixed(1)}%</span></div>
                <div class="dict-def">\u2022 Complexity: <span style="color:#f97583;">${analysis.complexity.toFixed(1)}%</span></div>
                <div class="dict-def">\u2022 Path: ${analysis.path || '(single char)'}</div>
                <div class="dict-def">\u2022 Distance: ${analysis.distance.toFixed(2)} units</div>`;
            container.appendChild(aDiv);
        }
    };

    // ══════════════════ QUANTUM (shared from quantum-prefixes.js) ══════════════════
    // QSim, QGATES, rxGate, ryGate, rzGate, submitToIBM, hellingerFidelity
    // are now provided by QuantumPrefixes shared module.
    const QP_Q = window.QuantumPrefixes || {};
    const QSim = QP_Q.QSim || function(){};
    const QGATES = QP_Q.QGATES || {};
    const rxGate = QP_Q.rxGate || function(t){ return [[1,0],[0,0],[0,0],[1,0]]; };
    const ryGate = QP_Q.ryGate || function(t){ return [[1,0],[0,0],[0,0],[1,0]]; };
    const rzGate = QP_Q.rzGate || function(t){ return [[1,0],[0,0],[0,0],[1,0]]; };

    const PREFIX_GATE = {
        '+1':'h', '1':'cnot', '-1':'x', '+0':'rz', '0':'id',
        '-0':'s', '+n':'t', 'n':'swap', '-n':'id', '+2':'cz', '+3':'y'
    };

    // ══════════════════ QUANTUM BRIDGE ══════════════════
    const QuantumBridge = {
        lastCircuit: null,
        lastResult: null,

        buildFromPrefix(text) {
            const QP = window.QuantumPrefixes;
            if (!QP) return this.buildFromTyping();
            const lang = QP.detectLanguage ? QP.detectLanguage(text, 'javascript') : 'javascript';
            const meta = QP.prefixMetadata(text, lang);
            if (!meta || !meta.lines || meta.lines.length === 0) return this.buildFromTyping();
            const numQ = Math.min(meta.lines.filter(l => l.sym && l.sym !== ' ').length, 12);
            if (numQ < 2) return this.buildFromTyping();
            const ops = [];
            let qi = 0;
            meta.lines.forEach(line => {
                if (qi >= numQ || !line.sym || line.sym === ' ') return;
                const gate = PREFIX_GATE[line.sym];
                if (!gate) { qi++; return; }
                if (gate === 'cnot' && qi < numQ - 1) ops.push({ type: 'cnot', q1: qi, q2: qi + 1 });
                else if (gate === 'cz' && qi < numQ - 1) ops.push({ type: 'cz', q1: qi, q2: qi + 1 });
                else if (gate === 'swap' && qi < numQ - 1) ops.push({ type: 'swap', q1: qi, q2: qi + 1 });
                else if (gate === 'rz') ops.push({ type: 'rz', q: qi, param: Math.PI / 4 });
                else ops.push({ type: gate, q: qi });
                qi++;
            });
            return this.toQASM(numQ, ops);
        },

        buildFromTyping() {
            const trans = analyzer.transitions.slice(-30);
            const numQ = Math.min(Math.max(trans.length, 2), 10);
            const ops = [];
            // Initial superposition
            for (let i = 0; i < numQ; i++) ops.push({ type: 'h', q: i });
            trans.forEach((t, idx) => {
                const qi = idx % numQ;
                const angle = (t.dist / 5) * Math.PI;
                if (Math.abs(t.dy) > 0.3) ops.push({ type: 'ry', q: qi, param: angle });
                else if (Math.abs(t.dx) > 1) ops.push({ type: 'rx', q: qi, param: angle });
                else ops.push({ type: 'rz', q: qi, param: angle });
                if (qi < numQ - 1) ops.push({ type: 'cnot', q1: qi, q2: qi + 1 });
            });
            return this.toQASM(numQ, ops);
        },

        toQASM(n, ops) {
            let q = `OPENQASM 2.0;\ninclude "qelib1.inc";\n\n// kbatch quantum circuit — ${n} qubits\n// Layout: ${LAYOUTS[activeLayoutId].name}\n// Generated: ${new Date().toISOString()}\n\nqreg q[${n}];\ncreg c[${n}];\n\n`;
            ops.forEach(op => {
                if (op.type === 'cnot') q += `cx q[${op.q1}],q[${op.q2}];\n`;
                else if (op.type === 'cz') q += `cz q[${op.q1}],q[${op.q2}];\n`;
                else if (op.type === 'swap') q += `swap q[${op.q1}],q[${op.q2}];\n`;
                else if (op.param !== undefined) q += `${op.type}(${op.param.toFixed(4)}) q[${op.q}];\n`;
                else if (op.type !== 'id') q += `${op.type} q[${op.q}];\n`;
            });
            q += `\nmeasure q -> c;\n`;
            this.lastCircuit = { qasm: q, numQubits: n, ops };
            return q;
        },

        simulateLocal(shots) {
            if (!this.lastCircuit) return null;
            const { numQubits: n, ops } = this.lastCircuit;
            const sim = new QSim(n);
            ops.forEach(op => {
                if (op.type === 'cnot') sim.cnot(op.q1, op.q2);
                else if (op.type === 'cz') sim.cz(op.q1, op.q2);
                else if (op.type === 'swap') sim.swap(op.q1, op.q2);
                else if (op.type === 'rx') sim.gate1(op.q, rxGate(op.param));
                else if (op.type === 'ry') sim.gate1(op.q, ryGate(op.param));
                else if (op.type === 'rz') sim.gate1(op.q, rzGate(op.param));
                else if (QGATES[op.type]) sim.gate1(op.q, QGATES[op.type]);
            });
            this.lastResult = sim.measure(shots);
            return this.lastResult;
        },

        async submitIBM(shots) {
            const token = document.getElementById('qp-token').value.trim();
            if (!token) throw new Error('No IBM Quantum API token. Get one at quantum.ibm.com');
            if (!this.lastCircuit) throw new Error('Build a circuit first');
            localStorage.setItem('ibm-quantum-token', token);
            const backend = document.getElementById('qp-backend').value;
            if (backend === 'local') return this.simulateLocal(shots);

            const status = document.getElementById('qp-status');
            status.textContent = 'Authenticating with IBM Quantum...';

            // Step 1: Create session / submit job via Qiskit Runtime REST API
            const baseUrl = 'https://api.quantum-computing.ibm.com';
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

            status.textContent = `Submitting to ${backend}...`;
            const jobRes = await fetch(`${baseUrl}/api/v1/jobs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    program_id: 'sampler',
                    backend: backend,
                    params: { circuits: [this.lastCircuit.qasm], shots }
                })
            });
            if (!jobRes.ok) {
                const err = await jobRes.text();
                throw new Error(`IBM Quantum API error: ${jobRes.status} — ${err}`);
            }
            const job = await jobRes.json();
            const jobId = job.id || job.job_id;
            status.textContent = `Job ${jobId} queued on ${backend}...`;

            // Step 2: Poll for results (max 10 min for free tier)
            for (let i = 0; i < 120; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const pollRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`, { headers });
                if (!pollRes.ok) continue;
                const pollData = await pollRes.json();
                const st = pollData.status || pollData.state;
                status.textContent = `Job ${jobId}: ${st}`;
                if (st === 'COMPLETED' || st === 'completed') {
                    const resultRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}/results`, { headers });
                    if (resultRes.ok) {
                        const resultData = await resultRes.json();
                        this.lastResult = resultData.results?.[0]?.data?.counts || resultData;
                        return this.lastResult;
                    }
                }
                if (st === 'FAILED' || st === 'failed' || st === 'CANCELLED') {
                    throw new Error(`Job ${st}: ${pollData.error || 'unknown error'}`);
                }
            }
            throw new Error('Job timed out after 10 minutes');
        },

        renderHistogram(canvas, counts) {
            if (!canvas || !canvas.parentElement) return;
            const ctx = canvas.getContext('2d');
            const W = canvas.width = canvas.parentElement.clientWidth;
            const H = canvas.height = canvas.parentElement.clientHeight;
            ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

            if (!counts || Object.keys(counts).length === 0) {
                ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
                ctx.fillText('Run a circuit to see measurement histogram', W/2, H/2);
                ctx.textAlign = 'start'; return;
            }

            const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
            const top = sorted.slice(0, Math.min(sorted.length, 32));
            const maxVal = Math.max(1, top[0][1]);
            const totalShots = Object.values(counts).reduce((a,b) => a+b, 0);
            const barW = Math.max(8, (W - 60) / top.length - 4);
            const maxH = H - 60;
            const startX = 40;

            // Bars
            top.forEach(([state, count], i) => {
                const x = startX + i * (barW + 4);
                const h = (count / maxVal) * maxH;
                const y = H - 30 - h;
                const prob = (count / totalShots);
                const hue = 270 - prob * 200; // purple → green
                ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
                ctx.fillRect(x, y, barW, h);
                // Probability label
                ctx.fillStyle = '#c9d1d9'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
                ctx.fillText((prob * 100).toFixed(1) + '%', x + barW/2, y - 4);
                // State label (rotated)
                ctx.save(); ctx.translate(x + barW/2, H - 26);
                ctx.rotate(-Math.PI / 4);
                ctx.fillStyle = '#8b949e'; ctx.font = `${Math.min(10, barW)}px monospace`;
                ctx.textAlign = 'right';
                ctx.fillText('|' + state + '\u27E9', 0, 0);
                ctx.restore();
            });

            // Title
            ctx.fillStyle = '#d2a8ff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
            ctx.fillText(`${Object.keys(counts).length} states | ${totalShots} shots`, 8, 14);
        }
    };

    // ══════════════════ TRAINING ENGINE ══════════════════
    const Training = {
        prompt: '', pos: 0, errors: 0, startTime: 0, bestWpm: 0, active: false,
        sessions: JSON.parse(localStorage.getItem('kbatch-train-sessions') || '[]'),
        keyTimings: [], lastKeyTime: 0,

        drills: {
            home: { qwerty:'asdf jkl; asdf jkl; fjdk slfa', dvorak:'aoeu htns aoeu htns', colemak:'arst neio arst neio', _default:'asdf jkl; asdf jkl;' },
            common: { _default:'the quick brown fox jumps over the lazy dog and types every letter known to humankind with great efficiency' },
            pangram: { _default:'pack my box with five dozen liquor jugs the five boxing wizards jump quickly how vexingly quick daft zebras jump' },
            code: { _default:'function init() { const data = []; for (let i = 0; i < n; i++) { data.push(process(i)); } return data; }' },
            shakespeare: { _default:'to be or not to be that is the question whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune or to take arms against a sea of troubles and by opposing end them to die to sleep no more' },
            rhythm: { _default:'allegro andante crescendo diminuendo forte piano staccato legato fortissimo pianissimo rubato fermata glissando arpeggio tremolo vibrato syncopation polyrhythm ostinato groove cadence resolution' },
            dance: { _default:'pirouette plié relevé tendu fondu jeté arabesque chassé promenade fouetté attitude développé glissade assemblé moonwalk breakdance toprock footwork popping locking waving tutting krumping freestyle' },
            literature: { _default:'it was the best of times it was the worst of times it was the age of wisdom it was the age of foolishness it was the epoch of belief it was the epoch of incredulity' },
            bulk: { _default:'' },
        },

        newDrill() {
            const drill = document.getElementById('train-drill').value;
            if (drill === 'bulk') {
                // Generate a random 50-word bulk from all capsule data
                const allWords = [];
                document.querySelectorAll('#panel-capsules [data-capsule-id]')
                try { const cs = document.querySelectorAll('.capsule-card'); } catch(e){}
                // Pull from all known word lists
                const sources = ['the','quick','brown','fox','jumps','over','lazy','dog','quantum','prefix','gutter','beyond','binary','pattern','contrail','rhythm','dance','melody','harmony','cadence','pirouette','arabesque','allegro','presto','vivace','sonata','fugue','fortissimo','staccato','legato','crescendo','diminuendo','shakespeare','hamlet','othello','macbeth','tempest','forsooth','wherefore','methinks','perchance','conscience','honour','patience','mercy','wisdom','soliloquy','brevity','fortune','valour'];
                for (let i = sources.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1)); [sources[i],sources[j]] = [sources[j],sources[i]]; }
                this.prompt = sources.slice(0, 50).join(' ');
            } else {
                const drillSet = this.drills[drill] || this.drills.home;
                this.prompt = drillSet[activeLayoutId] || drillSet._default || drillSet[Object.keys(drillSet)[0]];
            }
            this.pos = 0; this.errors = 0; this.startTime = 0; this.active = true;
            this.keyTimings = []; this.lastKeyTime = 0;
            document.getElementById('train-input').value = '';
            document.getElementById('train-input').focus();
            this.render();
            this.updateStats();
        },

        render() {
            const el = document.getElementById('train-prompt');
            let html = '';
            for (let i = 0; i < this.prompt.length; i++) {
                const ch = this.prompt[i] === ' ' ? '&nbsp;' : this.prompt[i];
                if (i < this.pos) html += `<span class="char done">${ch}</span>`;
                else if (i === this.pos) html += `<span class="char current">${ch}</span>`;
                else html += `<span class="char pending">${ch}</span>`;
            }
            el.innerHTML = html || '<span style="color:#484f58;">Select a drill and press "New Drill"</span>';
        },

        processInput(val) {
            if (!this.active) return;
            const now = Date.now();
            if (this.pos === 0 && val.length === 1) this.startTime = now;
            if (this.lastKeyTime > 0) this.keyTimings.push(now - this.lastKeyTime);
            this.lastKeyTime = now;
            const expected = this.prompt[this.pos];
            const typed = val[val.length - 1];
            if (typed === expected) {
                this.pos++;
                if (this.pos >= this.prompt.length) {
                    this.active = false;
                    const elapsed = (Date.now() - this.startTime) / 1000;
                    const words = this.prompt.split(' ').length;
                    const wpm = elapsed > 0 ? (words / elapsed) * 60 : 0;
                    if (wpm > this.bestWpm) this.bestWpm = wpm;
                    document.getElementById('train-best').textContent = this.bestWpm.toFixed(0);
                    this.recordSession(wpm, elapsed);
                }
            } else {
                this.errors++;
            }
            this.render();
            this.updateStats();
            document.getElementById('train-input').value = '';
            // Feed contrails if active
            if (window.Contrails && window.Contrails.active) {
                window.Contrails.feedKey(typed, expected === typed);
            }
        },

        recordSession(wpm, elapsed) {
            const drill = document.getElementById('train-drill').value;
            const avgTiming = this.keyTimings.length > 0 ? this.keyTimings.reduce((a,b)=>a+b,0)/this.keyTimings.length : 0;
            const rhythmVar = this.keyTimings.length > 1 ? Math.sqrt(this.keyTimings.reduce((s,t)=>s+Math.pow(t-avgTiming,2),0)/this.keyTimings.length) : 0;
            // Biometric snapshot (from Cisponju engine)
            const bio = window.Contrails && window.Contrails.getBiometrics ? window.Contrails.getBiometrics() : null;
            const session = {
                id: Date.now(),
                drill: drill,
                layout: activeLayoutId,
                wpm: Math.round(wpm),
                accuracy: Math.round((this.pos / (this.pos + this.errors)) * 100),
                elapsed: elapsed.toFixed(1),
                errors: this.errors,
                words: this.prompt.split(' ').length,
                avgKeyInterval: Math.round(avgTiming),
                rhythmVariance: Math.round(rhythmVar),
                timestamp: new Date().toISOString(),
                // Pattern signature from key timings
                rhythmSignature: this.keyTimings.slice(0, 20).map(t => t < 80 ? 'F' : t < 150 ? 'M' : t < 300 ? 'S' : 'P').join(''),
                // Cisponju biometric snapshot
                travelMM: bio ? bio.totalDistMM : 0,
                homeRowPct: bio ? bio.homeRowPct : 0,
                calories: bio ? bio.calories : 0,
                rsiRisk: bio ? bio.rsiRisk : 0,
                flowPath: bio ? bio.flowPath.slice(-30) : '',
            };
            this.sessions.unshift(session);
            if (this.sessions.length > 100) this.sessions = this.sessions.slice(0, 100);
            try { localStorage.setItem('kbatch-train-sessions', JSON.stringify(this.sessions)); } catch(e){}
            this.renderHistory();
        },

        renderHistory() {
            const el = document.getElementById('train-history');
            const count = document.getElementById('train-session-count');
            if (!el) return;
            count.textContent = this.sessions.length + ' drills completed';
            el.innerHTML = '';
            this.sessions.slice(0, 20).forEach(s => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;gap:8px;padding:4px 6px;background:#161b22;border-radius:4px;align-items:center;';
                const wpmColor = s.wpm > 60 ? '#3fb950' : s.wpm > 30 ? '#d4a017' : '#f85149';
                row.innerHTML = '<span style="color:' + wpmColor + ';font-weight:700;min-width:40px;">' + s.wpm + ' wpm</span>' +
                    '<span style="color:#58a6ff;">' + s.drill + '</span>' +
                    '<span style="color:#484f58;">' + s.layout + '</span>' +
                    '<span style="color:#8b949e;">acc:' + s.accuracy + '% err:' + s.errors + '</span>' +
                    '<span style="color:#a78bfa;letter-spacing:1px;" title="Rhythm: F=fast M=med S=slow P=pause">' + (s.rhythmSignature || '').slice(0,12) + '</span>' +
                    '<span style="flex:1;"></span>' +
                    '<span style="color:#484f58;font-size:.5rem;">' + new Date(s.timestamp).toLocaleTimeString() + '</span>';
                el.appendChild(row);
            });
        },

        exportForAI() {
            const data = {
                version: '1.0',
                source: 'uvspeed-kbatch',
                exportedAt: new Date().toISOString(),
                layout: activeLayoutId,
                totalSessions: this.sessions.length,
                sessions: this.sessions.map(s => ({
                    drill: s.drill, layout: s.layout, wpm: s.wpm, accuracy: s.accuracy,
                    errors: s.errors, words: s.words, avgKeyInterval: s.avgKeyInterval,
                    rhythmVariance: s.rhythmVariance, rhythmSignature: s.rhythmSignature, timestamp: s.timestamp,
                })),
                aggregates: {
                    avgWpm: this.sessions.length ? Math.round(this.sessions.reduce((s,x)=>s+x.wpm,0)/this.sessions.length) : 0,
                    avgAccuracy: this.sessions.length ? Math.round(this.sessions.reduce((s,x)=>s+x.accuracy,0)/this.sessions.length) : 0,
                    bestWpm: this.bestWpm,
                    drillDistribution: this.sessions.reduce((acc,s) => { acc[s.drill]=(acc[s.drill]||0)+1; return acc; }, {}),
                    rhythmProfile: this.sessions.length > 3 ? {
                        avgInterval: Math.round(this.sessions.reduce((s,x)=>s+(x.avgKeyInterval||0),0)/this.sessions.length),
                        avgVariance: Math.round(this.sessions.reduce((s,x)=>s+(x.rhythmVariance||0),0)/this.sessions.length),
                    } : null,
                },
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'kbatch-training-' + Date.now() + '.json'; a.click();
            URL.revokeObjectURL(url);
        },

        exportJSON() {
            const blob = new Blob([JSON.stringify(this.sessions, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'kbatch-sessions-' + Date.now() + '.json'; a.click();
            URL.revokeObjectURL(url);
        },

        pushToSearch() {
            // Push training patterns + biometric data to HistorySearch AI Lens
            const HS = window.HistorySearch;
            if (!HS) { alert('HistorySearch not loaded'); return; }
            const bio = window.Contrails && window.Contrails.getBiometrics ? window.Contrails.getBiometrics() : null;
            var payload = {
                type: 'training-data',
                source: 'kbatch',
                sessions: this.sessions.slice(0, 50),
                biometrics: bio,
                aggregates: {
                    avgWpm: this.sessions.length ? Math.round(this.sessions.reduce((s,x)=>s+x.wpm,0)/this.sessions.length) : 0,
                    bestWpm: this.bestWpm,
                    totalDrills: this.sessions.length,
                    layouts: [...new Set(this.sessions.map(s => s.layout))],
                },
                stack: buildStackEnvelope(
                    this.sessions.map(function(s) { return (s.drill || '').trim(); }).join('\n'),
                    'text',
                    'kbatch-training'
                )
            };
            publishToEcosystem('training-data', payload, ['kbatch-training', 'iron-line', 'uterm-notes']);
            alert('Training + biometric data pushed to shared stack channels (kbatch-training + iron-line + uterm-notes)');
        },

        // ─── [P0e.2] Quantum Training Loopback — contrail → spin chain → .qvid ───
        pushQuantumLoopback() {
            var bio = window.Contrails && window.Contrails.getBiometrics ? window.Contrails.getBiometrics() : null;
            var contrailState = window.Contrails ? {
                flowPath: window.Contrails.flowPath || [],
                heatmap: window.Contrails.heatmap || {},
                lastDirections: (window.Contrails.flowPath || []).slice(-20)
            } : null;

            // Compute RSI from typing rhythm (financial signal → quantum weight)
            var gains = [], losses = [];
            for (var i = 1; i < this.sessions.length; i++) {
                var delta = this.sessions[i].wpm - this.sessions[i-1].wpm;
                if (delta > 0) { gains.push(delta); losses.push(0); }
                else { gains.push(0); losses.push(Math.abs(delta)); }
            }
            var avgGain = gains.length ? gains.reduce(function(a,b){return a+b},0) / gains.length : 1;
            var avgLoss = losses.length ? losses.reduce(function(a,b){return a+b},0) / losses.length : 1;
            var rsi = 100 - (100 / (1 + avgGain / Math.max(avgLoss, 0.001)));

            // Compute MACD from session WPM (fast EMA 12, slow EMA 26)
            function ema(arr, period) {
                if (!arr.length) return 0;
                var k = 2 / (period + 1), val = arr[0];
                for (var j = 1; j < arr.length; j++) val = arr[j] * k + val * (1 - k);
                return val;
            }
            var wpmSeries = this.sessions.map(function(s){return s.wpm});
            var fastEma = ema(wpmSeries, 12);
            var slowEma = ema(wpmSeries, 26);
            var macdVal = fastEma - slowEma;
            var signalVal = ema(wpmSeries.map(function(){return macdVal}), 9);
            var macdHistogram = macdVal - signalVal;

            // Iron Condor readout window (confidence bounds from session accuracy)
            var accArr = this.sessions.map(function(s){return s.accuracy / 100});
            var accMean = accArr.length ? accArr.reduce(function(a,b){return a+b},0) / accArr.length : 0.5;
            var accStd = Math.sqrt(accArr.length > 1 ?
                accArr.reduce(function(s,v){return s + (v-accMean)*(v-accMean)},0) / (accArr.length-1) : 0.01);

            // Map contrail directions to spin chain excitation
            var directions = contrailState ? contrailState.lastDirections : [];
            var RING_SIZE = 120;
            var DIR_TO_SPIN = { '\u2192':1, '\u2190':-1, '\u2191':10, '\u2193':-10, '\u2197':11, '\u2198':-9, '\u2196':9, '\u2199':-11, '\u00B7':0 };
            var spinIndex = 0;
            var propagationCone = [spinIndex];
            for (var d = 0; d < directions.length; d++) {
                spinIndex = ((spinIndex + (DIR_TO_SPIN[directions[d]] || 0)) % RING_SIZE + RING_SIZE) % RING_SIZE;
                propagationCone.push(spinIndex);
            }

            // DCA prefix distribution from session content
            var QP = window.QuantumPrefixes;
            var prefixDist = {};
            if (QP && QP.prefixMetadata && this.sessions.length) {
                var lastContent = this.sessions[this.sessions.length - 1].drill || '';
                var meta = QP.prefixMetadata(lastContent, 'text');
                prefixDist = meta.prefixCounts || {};
            }

            // Broadcast quantum loopback state via ecosystem channels
            var loopbackPayload = {
                type: 'contrail-quantum-state',
                source: 'kbatch',
                contrailPath: directions,
                prefixDistribution: prefixDist,
                spinMapping: {
                    ringSize: RING_SIZE,
                    excitationIndex: spinIndex,
                    propagationCone: propagationCone,
                    interferencePattern: propagationCone.filter(function(v,i,a){
                        return a.indexOf(v) !== i;
                    })
                },
                financialWeight: {
                    rsi: Math.round(rsi * 100) / 100,
                    macd: { signal: Math.round(signalVal*100)/100, histogram: Math.round(macdHistogram*100)/100 },
                    ironCondor: {
                        lower: Math.max(0, Math.round((accMean - 2*accStd)*1000)/1000),
                        upper: Math.min(1, Math.round((accMean + 2*accStd)*1000)/1000),
                        maxProfit: Math.round(accMean * 1000) / 1000,
                        maxLoss: Math.round(accStd * 1000) / 1000
                    }
                },
                biometrics: bio,
                readoutGates: [0, Math.PI/4, Math.PI/2],
                trainLabel: rsi > 70 ? 'flow' : rsi < 30 ? 'debug' : 'steady',
                timestamp_us: Date.now() * 1000,
                stack: buildStackEnvelope(directions.join(' '), 'transcript', 'kbatch-contrail-loopback')
            };
            publishToEcosystem('contrail-quantum-state', loopbackPayload, ['quantum-loopback', 'iron-line', 'uterm-notes']);
            alert('Quantum loopback pushed to ecosystem channels (quantum-loopback + iron-line + uterm-notes)');
        },

        // ─── Cisponju: Sentence-level analysis ───
        analyzeSentence(sentence) {
            const words = sentence.split(/\s+/).filter(w => w);
            const HOME_ROW = new Set('asdfghjkl;'.split(''));
            const results = words.map(w => {
                const lw = w.toLowerCase();
                const homeRowPct = lw.split('').filter(c => HOME_ROW.has(c)).length / Math.max(lw.length, 1);
                const uniqueKeys = new Set(lw.split('')).size;
                const diversity = uniqueKeys / Math.max(lw.length, 1);
                const eff = Math.min(100, 50 + homeRowPct * 25 + diversity * 20 + (lw.length <= 6 ? 10 : 0));
                const cpx = lw.length * 10 + (1 - homeRowPct) * 30;
                return { word: w, efficiency: eff, complexity: Math.min(100, cpx), homeRowPct: homeRowPct * 100, keyCount: lw.length };
            });
            const avgEff = results.reduce((s,r) => s + r.efficiency, 0) / Math.max(results.length, 1);
            const avgCpx = results.reduce((s,r) => s + r.complexity, 0) / Math.max(results.length, 1);
            const totalKeys = results.reduce((s,r) => s + r.keyCount, 0);
            // Musical notation (from Cisponju SentenceConstructor)
            const notation = results.map(r => r.keyCount <= 3 ? '\u266A' : r.keyCount <= 6 ? '\u2669' : r.keyCount <= 10 ? '\uD834\uDD57' : '\uD834\uDD5D').join(' ');
            // Rhythm pattern
            const rhythm = results.map(r => r.efficiency > 70 ? '\u25CF' : r.efficiency > 40 ? '\u25D0' : '\u25D2').join('');
            // Cross-cultural score (from Cisponju SentenceConstructor)
            const crossCultural = Math.max(0, Math.min(100, 100 - avgCpx * 0.5 + avgEff * 0.3));
            return { words: results, avgEfficiency: avgEff, avgComplexity: avgCpx, totalKeystrokes: totalKeys, notation, rhythm, crossCulturalScore: crossCultural };
        },

        // ─── ML Training Data Export (from Cisponju TrainingDataCompiler) ───
        exportMLTrainingData() {
            const bio = window.Contrails && window.Contrails.getBiometrics ? window.Contrails.getBiometrics() : null;
            const data = {
                version: '2.0',
                source: 'uvspeed-kbatch-cisponju',
                exportedAt: new Date().toISOString(),
                layout: activeLayoutId,
                totalSessions: this.sessions.length,
                sessions: this.sessions.map(s => ({
                    drill: s.drill, layout: s.layout, wpm: s.wpm, accuracy: s.accuracy,
                    errors: s.errors, words: s.words, avgKeyInterval: s.avgKeyInterval,
                    rhythmVariance: s.rhythmVariance, rhythmSignature: s.rhythmSignature, timestamp: s.timestamp,
                })),
                biometrics: bio,
                mlFeatures: {
                    // Feature vectors for ML training (from Cisponju TrainingDataCompiler)
                    sessionFeatures: this.sessions.map(s => [
                        s.wpm / 200, // normalized WPM
                        s.accuracy / 100,
                        s.errors / Math.max(s.words, 1),
                        (s.avgKeyInterval || 150) / 500,
                        (s.rhythmVariance || 50) / 200,
                    ]),
                    labels: this.sessions.map(s => s.wpm > 60 ? 2 : s.wpm > 30 ? 1 : 0), // fast/medium/slow
                },
                aggregates: {
                    avgWpm: this.sessions.length ? Math.round(this.sessions.reduce((s,x)=>s+x.wpm,0)/this.sessions.length) : 0,
                    avgAccuracy: this.sessions.length ? Math.round(this.sessions.reduce((s,x)=>s+x.accuracy,0)/this.sessions.length) : 0,
                    bestWpm: this.bestWpm,
                    drillDistribution: this.sessions.reduce((acc,s) => { acc[s.drill]=(acc[s.drill]||0)+1; return acc; }, {}),
                },
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'kbatch-ml-training-' + Date.now() + '.json'; a.click();
            URL.revokeObjectURL(url);
        },

        updateStats() {
            const elapsed = this.startTime > 0 ? (Date.now() - this.startTime) / 1000 : 0;
            const words = this.prompt.substring(0, this.pos).split(' ').filter(w => w).length;
            const wpm = elapsed > 0 ? (words / elapsed) * 60 : 0;
            const acc = this.pos + this.errors > 0 ? (this.pos / (this.pos + this.errors)) * 100 : 100;
            const prog = this.prompt.length > 0 ? (this.pos / this.prompt.length) * 100 : 0;
            document.getElementById('train-wpm').textContent = wpm.toFixed(0);
            document.getElementById('train-acc').textContent = acc.toFixed(0) + '%';
            document.getElementById('train-prog').textContent = prog.toFixed(0) + '%';
            document.getElementById('train-err').textContent = this.errors;
        }
    };

    // ══════════════════ TAB SYSTEM ══════════════════
    (function() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.getElementById('panel-' + btn.dataset.tab);
                if (panel) panel.classList.add('active');
                if (btn.dataset.tab === 'layouts') renderLayoutPreview();
                if (btn.dataset.tab === 'analyzer') renderAll();
                if (btn.dataset.tab === 'quantum') QuantumBridge.renderHistogram(document.getElementById('cv-quantum'), QuantumBridge.lastResult);
            });
        });
    })();

    // ══════════════════ INIT LAYOUTS TAB ══════════════════
    (function() {
        const list = document.getElementById('layout-list');
        const compareSelect = document.getElementById('layout-compare-select');
        const trainSelect = document.getElementById('train-layout');
        Object.entries(LAYOUTS).forEach(([id, lay]) => {
            // Sidebar item
            const div = document.createElement('div');
            div.className = 'layout-item' + (id === activeLayoutId ? ' active' : '');
            div.dataset.id = id;
            div.innerHTML = `<span>${lay.name}</span><span class="region">${lay.script}</span>`;
            div.addEventListener('click', () => {
                list.querySelectorAll('.layout-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
                setActiveLayout(id);
                document.getElementById('li-name').textContent = lay.name;
                document.getElementById('li-script').textContent = lay.script;
                document.getElementById('li-region').textContent = lay.region;
                document.getElementById('li-dir').textContent = lay.dir.toUpperCase();
            });
            list.appendChild(div);
            // Compare dropdown
            const opt = document.createElement('option');
            opt.value = id; opt.textContent = lay.name;
            compareSelect.appendChild(opt);
            // Training layout dropdown
            const topt = document.createElement('option');
            topt.value = id; topt.textContent = lay.name;
            if (id === activeLayoutId) topt.selected = true;
            trainSelect.appendChild(topt);
        });

        compareSelect.addEventListener('change', () => {
            renderLayoutPreview(compareSelect.value || null);
        });

        trainSelect.addEventListener('change', () => {
            setActiveLayout(trainSelect.value);
        });
    })();

    // ══════════════════ INPUT HANDLING ══════════════════
    const typingInput = document.getElementById('typing-input');
    let renderTimer = null;

    typingInput.addEventListener('input', () => {
        const val = typingInput.value;
        if (val.length > 0) analyzer.processKey(val[val.length - 1]);
        // Auto-detect keyboard layout every 30 chars
        if (val.length > 0 && val.length % 30 === 0) {
            var detected = detectLayout(val);
            if (detected && detected !== activeLayoutId) {
                autoDetectAndSwap(val);
            }
        }
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
            renderAll();
            updateStats();
            var Enc = window.Encoder;
            var flow = Enc && Enc.toKeyboardFlow ? Enc.toKeyboardFlow(val) : null;
            var musica = Enc && Enc.toMusicNotation ? Enc.toMusicNotation(val) : '';
            var rhythm = Enc && Enc.toRhythm ? Enc.toRhythm(val) : null;
            var blocks = buildPrefixBlocks(val, 'text');
            publishToEcosystem('kbatch-live-input', {
                text: val,
                flow: flow && flow.arrows ? flow.arrows : '',
                musica: musica,
                bpm: rhythm && rhythm.bpm ? rhythm.bpm : 0,
                blocks: blocks,
                stack: buildStackEnvelope(val, 'text', 'kbatch-live-input')
            }, ['iron-line', 'uterm-notes']);
            publishToEcosystem('kbatch-blocks', {
                source: 'kbatch-live-input',
                text: val,
                blocks: blocks,
                musica: musica,
                bpm: rhythm && rhythm.bpm ? rhythm.bpm : 0
            }, ['quantum-prefixes', 'kbatch-training']);
        }, 30);
    });

    typingInput.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            if (analyzer.buffer.trim()) {
                analyzer.words++;
                const word = analyzer.buffer.trim();
                analyzer.wordFreq[word] = (analyzer.wordFreq[word] || 0) + 1;
                // Train cache intelligence on typed word
                if (window.CacheIntel) {
                    var bio = window.Contrails && window.Contrails.getBiometrics ? window.Contrails.getBiometrics() : null;
                    window.CacheIntel.recordInteraction(word, {
                        capsule: 'typed',
                        language: 'text',
                        biometrics: bio ? { homeRowPct: bio.homeRowPct, travelMM: bio.totalDistMM, avgTypingMs: bio.wpm > 0 ? 12000 / bio.wpm : 0 } : null
                    });
                }
                analyzer.buffer = '';
            }
            renderAll(); updateStats();
        }
    });

    // Dictionary input
    document.getElementById('dict-input').addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') document.getElementById('dict-search-btn').click();
    });
    document.getElementById('dict-search-btn').addEventListener('click', async () => {
        const word = document.getElementById('dict-input').value.trim();
        if (!word) return;
        const results = document.getElementById('dict-results');
        results.innerHTML = '<div style="text-align:center;padding:40px;color:#484f58;">Looking up...</div>';
        const data = await DictEngine.lookup(word);
        DictEngine.renderResults(data, results);
    });

    // Quantum controls
    document.getElementById('qp-build').addEventListener('click', () => {
        const source = document.getElementById('qp-source').value;
        const circuitEl = document.getElementById('qp-circuit');
        const text = typingInput.value || '// Sample code for quantum prefix analysis\nconst x = 42;\nif (x > 0) {\n  console.log("positive");\n}\nreturn x;';
        let qasm;
        if (source === 'prefix') qasm = QuantumBridge.buildFromPrefix(text);
        else if (source === 'typing') qasm = QuantumBridge.buildFromTyping();
        else qasm = circuitEl.textContent;
        circuitEl.textContent = qasm;
        document.getElementById('qp-status').textContent = `Circuit built: ${QuantumBridge.lastCircuit?.numQubits || '?'} qubits, ${QuantumBridge.lastCircuit?.ops?.length || '?'} gates`;
        if (window.qbitCodec && window.qbitCodec.musicaDawPayload) {
            var buildDaw = window.qbitCodec.musicaDawPayload(qasm, 'qasm', 'kbatch-circuit-builder', {});
            publishToEcosystem('quantum-music-pipeline', {
                phase: 'build',
                qasm: qasm,
                daw: buildDaw
            }, ['iron-line', 'uterm-notes', 'kbatch-training']);
        }
    });

    document.getElementById('qp-run').addEventListener('click', async () => {
        const status = document.getElementById('qp-status');
        const shots = parseInt(document.getElementById('qp-shots').value) || 1024;
        const backend = document.getElementById('qp-backend').value;
        if (!QuantumBridge.lastCircuit) {
            document.getElementById('qp-build').click();
        }
        try {
            status.textContent = 'Running...';
            let result;
            if (backend === 'local') {
                result = QuantumBridge.simulateLocal(shots);
                status.textContent = `Local simulation complete: ${Object.keys(result).length} states, ${shots} shots`;
            } else {
                result = await QuantumBridge.submitIBM(shots);
                status.textContent = `IBM ${backend} complete: ${Object.keys(result).length} states`;
            }
            QuantumBridge.renderHistogram(document.getElementById('cv-quantum'), result);
            if (window.qbitCodec && window.qbitCodec.musicaDawPayload) {
                var runQasm = (QuantumBridge.lastCircuit && QuantumBridge.lastCircuit.qasm) || '';
                var runDaw = window.qbitCodec.musicaDawPayload(runQasm, 'qasm', 'kbatch-quantum-run', {});
                publishToEcosystem('quantum-music-pipeline', {
                    phase: 'run',
                    backend: backend,
                    shots: shots,
                    states: Object.keys(result || {}).length,
                    daw: runDaw
                }, ['iron-line', 'uterm-notes', 'kbatch-training']);
            }
        } catch (e) {
            status.textContent = 'Error: ' + e.message;
        }
    });

    document.getElementById('qp-export').addEventListener('click', () => {
        if (!QuantumBridge.lastCircuit) return;
        const blob = new Blob([QuantumBridge.lastCircuit.qasm], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `kbatch-circuit-${Date.now()}.qasm`; a.click();
    });

    // Load saved IBM token
    const savedToken = localStorage.getItem('ibm-quantum-token');
    if (savedToken) document.getElementById('qp-token').value = savedToken;

    // Training controls
    document.getElementById('train-new').addEventListener('click', () => Training.newDrill());
    document.getElementById('train-input').addEventListener('input', e => {
        Training.processInput(e.target.value);
    });
    document.getElementById('train-input').addEventListener('keydown', e => e.stopPropagation());
    document.getElementById('train-export-ai').addEventListener('click', () => Training.exportMLTrainingData());
    document.getElementById('train-export-json').addEventListener('click', () => Training.exportJSON());
    document.getElementById('train-search-push').addEventListener('click', () => Training.pushToSearch());
    document.getElementById('train-quantum-loopback').addEventListener('click', () => Training.pushQuantumLoopback());
    Training.renderHistory(); // restore previous sessions

    // ══════════════════ GLOBAL API ══════════════════
    window.kbatch = {
        get state() { return analyzer.state; },
        get activeLayout() { return activeLayoutId; },
        get layouts() { return LAYOUTS; },
        analyze: (word) => analyzer.analyzeWord(word),
        topKeys: (n) => analyzer.topKeys(n),
        reset: () => { analyzer.reset(); renderAll(); updateStats(); },
        setLayout: (id) => setActiveLayout(id),
        processText: (text) => {
            for (const ch of text) analyzer.processKey(ch);
            renderAll();
            updateStats();
            var Enc = window.Encoder;
            var musica = Enc && Enc.toMusicNotation ? Enc.toMusicNotation(text || '') : '';
            var flow = Enc && Enc.toKeyboardFlow ? Enc.toKeyboardFlow(text || '') : null;
            var rhythm = Enc && Enc.toRhythm ? Enc.toRhythm(text || '') : null;
            var blocks = buildPrefixBlocks(text || '', 'text');
            publishToEcosystem('kbatch-keyboard-data', {
                text: text || '',
                flow: flow && flow.arrows ? flow.arrows : '',
                musica: musica,
                bpm: rhythm && rhythm.bpm ? rhythm.bpm : 0,
                blocks: blocks,
                stack: buildStackEnvelope(text || '', 'text', 'kbatch-process')
            }, ['iron-line', 'uterm-notes', 'kbatch-training']);
            publishToEcosystem('kbatch-blocks', {
                text: text || '',
                blocks: blocks,
                musica: musica,
                bpm: rhythm && rhythm.bpm ? rhythm.bpm : 0
            }, ['iron-line', 'uterm-notes', 'kbatch-training', 'quantum-prefixes']);
        },
        heatmap: () => ({ ...analyzer.heatmap }),
        transitions: () => [...analyzer.transitions],
        wordFreq: () => ({ ...analyzer.wordFreq }),
        exportJSON: () => {
            var stateJson = JSON.stringify(analyzer.state, null, 2);
            var QP = window.QuantumPrefixes;
            if (QP && QP.wrapJsonExport) {
                try {
                    return JSON.stringify(QP.wrapJsonExport(analyzer.state, stateJson, 'kbatch'), null, 2);
                } catch (_) {}
            }
            return stateJson;
        },
        stack: {
            benchmark: (text) => runStackBenchmark(text),
            status: () => STACK_BENCH.last || runStackBenchmark((document.getElementById('typing-input') || {}).value || ''),
            t5: () => (STACK_BENCH.last ? STACK_BENCH.last.t5 : 'browser'),
            musica: () => (STACK_BENCH.last ? STACK_BENCH.last.musicaEngine : null),
            daw: () => (STACK_BENCH.last && STACK_BENCH.last.musicaEngine ? STACK_BENCH.last.musicaEngine.dawSupport : null),
            corpus: () => (window._kbatchCorpus || null),
            blocks: (text, language) => buildPrefixBlocks(text || ((document.getElementById('typing-input') || {}).value || ''), language || 'text'),
            emitBlocks: (text, language) => {
                var src = text || ((document.getElementById('typing-input') || {}).value || '');
                var blocks = buildPrefixBlocks(src, language || 'text');
                publishToEcosystem('kbatch-blocks', {
                    source: 'kbatch-api',
                    text: src,
                    blocks: blocks,
                    stack: buildStackEnvelope(src, language || 'text', 'kbatch-stack-emit')
                }, ['quantum-prefixes', 'iron-line', 'uterm-notes', 'kbatch-training']);
                return blocks;
            }
        },
        fontlab: {
            _strokesForLayout: (text, layoutId) => {
                var srcText = String(text || '');
                var layout = LAYOUTS[layoutId] || getLayout();
                var pos = buildKeyPos(layout);
                var strokes = [];
                var stroke = [];
                var t = 0;
                for (var i = 0; i < srcText.length; i++) {
                    var raw = srcText[i];
                    var ch = String(raw || '').toLowerCase();
                    if (ch === '\n' || ch === '\r') {
                        if (stroke.length > 1) strokes.push(stroke);
                        stroke = [];
                        t += 24;
                        continue;
                    }
                    if (ch === ' ') {
                        if (stroke.length > 1) strokes.push(stroke);
                        stroke = [];
                        t += 16;
                        continue;
                    }
                    var p = pos[ch];
                    if (!p) continue;
                    var pressure = 0.42 + ((i % 7) * 0.06);
                    stroke.push({
                        x: p.x * 14,
                        y: p.y * 14,
                        t: t,
                        pressure: Math.min(0.98, pressure),
                        tiltX: (i % 5) * 3,
                        tiltY: (i % 4) * 2,
                        char: ch
                    });
                    t += 12;
                }
                if (stroke.length > 1) strokes.push(stroke);
                return strokes;
            },
            analyze: (text, opts) => {
                var QC = window.qbitCodec;
                if (!QC || !QC.liveFontFaceAnalyze) return null;
                var srcText = String(text || '');
                var localOpts = opts || {};
                var strokes = window.kbatch.fontlab._strokesForLayout(srcText, activeLayoutId);
                var packet = QC.liveFontFaceAnalyze(
                    {
                        source: localOpts.source || 'kbatch-fontlab',
                        text: srcText,
                        fontRef: localOpts.target || localOpts.fontRef || 'qbit_roman_math_core',
                        strokes: strokes
                    },
                    {
                        source: localOpts.source || 'kbatch-fontlab',
                        language: localOpts.language || 'text',
                        target: localOpts.target || localOpts.fontRef || 'qbit_roman_math_core',
                        fabricate: !!localOpts.fabricate,
                        devices: localOpts.devices || ['plotter', 'printer3d'],
                        broadcast: localOpts.broadcast !== false
                    }
                );
                window._kbatchFontLabLast = packet;
                return packet;
            },
            compile: (text, opts) => {
                var QC = window.qbitCodec;
                if (!QC || !QC.compileFontPack) return null;
                var localOpts = opts || {};
                var srcText = String(text || '');
                var layoutIds = Object.keys(LAYOUTS);
                var layoutStrokeMap = {};
                for (var i = 0; i < layoutIds.length; i++) {
                    var lid = layoutIds[i];
                    layoutStrokeMap[lid] = window.kbatch.fontlab._strokesForLayout(srcText, lid);
                }
                var pack = QC.compileFontPack(
                    {
                        id: localOpts.id || ('kbatch-font-pack-' + Date.now()),
                        name: localOpts.name || 'kbatch-layout-font-pack',
                        source: localOpts.source || 'kbatch-fontlab',
                        text: srcText,
                        language: localOpts.language || 'text',
                        fontRef: localOpts.target || 'qbit_roman_math_core',
                        layouts: layoutIds,
                        layoutStrokeMap: layoutStrokeMap
                    },
                    {
                        source: localOpts.source || 'kbatch-fontlab',
                        language: localOpts.language || 'text',
                        target: localOpts.target || 'qbit_roman_math_core',
                        channels: localOpts.channels || ['iron-line', 'quantum-prefixes', 'kbatch-training', 'hexterm'],
                        broadcast: localOpts.broadcast !== false
                    }
                );
                if (!pack) return null;
                var blocks = (((pack || {}).font || {}).manifest || {}).requiredBlocks || [];
                var seedTokens = blocks.map(function (b) { return String(b || '').toLowerCase().replace(/[_\-]+/g, ' '); }).join(' ').split(/\s+/).filter(function (w) { return w && w.length >= 4; });
                var uniq = Object.create(null);
                var tokens = [];
                for (var t = 0; t < seedTokens.length; t++) {
                    var tok = seedTokens[t];
                    if (!uniq[tok]) { uniq[tok] = 1; tokens.push(tok); }
                }
                var xrefCount = 0;
                for (var c = 0; c < CAPSULES.length; c++) {
                    var cap = CAPSULES[c];
                    if (!cap) continue;
                    var textBlob = [
                        cap.id || '',
                        cap.name || '',
                        cap.desc || '',
                        (cap.words || []).join(' ')
                    ].join(' ').toLowerCase();
                    var matched = [];
                    for (var k = 0; k < tokens.length; k++) {
                        if (textBlob.indexOf(tokens[k]) >= 0) matched.push(tokens[k]);
                    }
                    cap.meta = Object.assign({}, cap.meta || {}, {
                        fontlab: {
                            packId: pack.id,
                            ts: Date.now(),
                            hits: matched.length,
                            matched: matched.slice(0, 16)
                        }
                    });
                    if (matched.length) xrefCount++;
                }
                window._kbatchFontLabXrefCount = xrefCount;
                window._kbatchFontLabPack = pack;
                window.kbatchCapsules = CAPSULES;
                publishToEcosystem(
                    'capsule-knowledge',
                    CAPSULES.map(function(c) {
                        return { id: c.id, name: c.name, cat: c.cat, age: c.age, words: c.words, meta: c.meta || {} };
                    }),
                    ['kbatch-training', 'iron-line', 'uterm-notes']
                );
                return pack;
            },
            last: () => window._kbatchFontLabLast || null,
            lastPack: () => window._kbatchFontLabPack || null
        },
        quantum: {
            buildFromPrefix: (text) => QuantumBridge.buildFromPrefix(text),
            buildFromTyping: () => QuantumBridge.buildFromTyping(),
            simulate: (shots) => QuantumBridge.simulateLocal(shots || 1024),
            submitIBM: (shots) => QuantumBridge.submitIBM(shots || 4096),
            get lastCircuit() { return QuantumBridge.lastCircuit; },
            get lastResult() { return QuantumBridge.lastResult; },
            pushLoopback: () => Training.pushQuantumLoopback(),
        },
        dict: { lookup: (w) => DictEngine.lookup(w) },
        contrails: {
            feed: (text) => { if (window.Contrails) window.Contrails.feedText(text); },
            clear: () => { if (window.Contrails) window.Contrails.clear(); },
            biometrics: () => window.Contrails && window.Contrails.getBiometrics ? window.Contrails.getBiometrics() : null,
            searchByGesture: (seq) => window.Contrails && window.Contrails.searchByGesture ? window.Contrails.searchByGesture(seq) : [],
            gestureToSymbol: (g) => window.Contrails && window.Contrails.gestureToSymbol ? window.Contrails.gestureToSymbol(g) : null,
            vrKeyboard: () => window.Contrails ? window.Contrails.VR_KEYBOARD : null,
            // Universal Stroke Adapter — converts any movement path to contrail phonemes
            stroke: () => window.Contrails ? window.Contrails.UniversalStroke : null,
            fromPen: (pts, opts) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.fromBrushStroke(pts, opts) : null,
            fromPose: (frames, opts) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.fromPoseFrames(frames, opts) : null,
            fromGlyph: (path, opts) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.fromGlyphPath(path, opts) : null,
            fromSewing: (pat, opts) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.fromSewingPattern(pat, opts) : null,
            fromAir: (pts, opts) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.fromAirWriting(pts, opts) : null,
            fromTouch: (evts, opts) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.fromTouchEvents(evts, opts) : null,
            compare: (a, b) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.compareStrokes(a, b) : null,
            registerPattern: (name, cat, stroke) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.registerPattern(name, cat, stroke) : null,
            searchPatterns: (query, opts) => window.Contrails && window.Contrails.UniversalStroke ? window.Contrails.UniversalStroke.searchPatterns(query, opts) : [],
            xref: (capsuleId, limit) => crossReferenceCapsuleContrails(capsuleId, limit || 12),
            getPromptLanguage: () => getContrailPromptLanguage(),
            setPromptLanguage: (text) => setContrailPromptLanguage(text),
        },
        layout: {
            active: () => activeLayoutId,
            set: (id) => setActiveLayout(id),
            detect: (text) => detectLayout(text),
            autoSwap: (text) => autoDetectAndSwap(text),
            quickSwap: (dir) => quickSwapLayout(dir),
            all: () => Object.entries(LAYOUTS).map(function(e) { return { id: e[0], name: e[1].name, region: e[1].region, script: e[1].script }; }),
        },
        encoder: {
            encode: (text) => window.Encoder ? window.Encoder.encodeAll(text) : null,
            braille: (text) => window.Encoder ? window.Encoder.toBraille(text) : '',
            morse: (text) => window.Encoder ? window.Encoder.toMorse(text) : '',
            asl: (text) => window.Encoder ? window.Encoder.toASL(text) : '',
            bsl: (text) => window.Encoder ? window.Encoder.toBSL(text) : '',
            hex: (text) => window.Encoder ? window.Encoder.toHex(text) : '',
            binary: (text) => window.Encoder ? window.Encoder.toBinary(text) : '',
            nato: (text) => window.Encoder ? window.Encoder.toNATO(text) : '',
            latin: (text) => window.Encoder ? window.Encoder.toLatinRoot(text) : '',
            flow: (text) => window.Encoder ? window.Encoder.toKeyboardFlow(text) : null,
            dance: (text) => window.Encoder ? window.Encoder.toDanceMoves(text) : '',
            wand: (text) => window.Encoder ? window.Encoder.toWandMoves(text) : '',
            music: (text) => window.Encoder ? window.Encoder.toMusicNotation(text) : '',
            rhythm: (text) => window.Encoder ? window.Encoder.toRhythm(text) : null,
            intonation: (text) => window.Encoder ? window.Encoder.toIntonation(text) : null,
        },
        liveDict: {
            lookup: (word) => window.LiveDict ? window.LiveDict.fullLookup(word) : Promise.resolve(null),
            wiktionary: (word, lang) => window.LiveDict ? window.LiveDict.wiktionaryLookup(word, lang) : Promise.resolve(null),
            etymology: (word) => window.LiveDict ? window.LiveDict.wiktionaryEtymology(word) : Promise.resolve(null),
            similar: (word) => window.LiveDict ? window.LiveDict.datamuseLookup(word, 'ml') : Promise.resolve(null),
            rhymes: (word) => window.LiveDict ? window.LiveDict.datamuseLookup(word, 'rhymes') : Promise.resolve(null),
            cacheSize: () => window.LiveDict ? window.LiveDict.getCacheSize() : 0,
            clearCache: () => { if (window.LiveDict) window.LiveDict.clearCache(); },
        },
        compliance: {
            home: (text) => {
                var src = String(text || ((document.getElementById('typing-input') || {}).value || ""));
                return {
                    provenance: buildHomeProvenance("api.compliance.home", src),
                    languageSupport: languageSupportSnapshot()
                };
            },
            bundle: async (force) => {
                var manifest = await loadComplianceDoc("manifest", !!force);
                var ledger = await loadComplianceDoc("ledger", !!force);
                return { manifest: manifest, ledger: ledger };
            },
            partner: async (force) => loadComplianceDoc("policy", !!force)
        },
        xref: {
            dictionary: async () => {
                var eps = [
                    "school/corpus/exports/dictionary-crossref-index.json",
                    "../school/corpus/exports/dictionary-crossref-index.json",
                    "/school/corpus/exports/dictionary-crossref-index.json"
                ];
                for (var i = 0; i < eps.length; i++) {
                    try {
                        var res = await fetch(eps[i], { cache: "no-cache" });
                        if (res.ok) return await res.json();
                    } catch (_) {}
                }
                return null;
            },
            bridgeGraph: async () => {
                var eps = [
                    "school/corpus/exports/bridge-graph.json",
                    "../school/corpus/exports/bridge-graph.json",
                    "/school/corpus/exports/bridge-graph.json"
                ];
                for (var i = 0; i < eps.length; i++) {
                    try {
                        var res = await fetch(eps[i], { cache: "no-cache" });
                        if (res.ok) return await res.json();
                    } catch (_) {}
                }
                return null;
            },
            lang: async (code) => {
                var doc = await window.kbatch.xref.dictionary();
                var lang = String(code || '').toLowerCase();
                return (doc && doc.language_crossref || []).filter(function(r) {
                    return String(r.language || '').toLowerCase() === lang;
                });
            },
            country: async (name) => {
                var doc = await window.kbatch.xref.dictionary();
                var country = String(name || '').toLowerCase();
                return (doc && doc.country_crossref || []).filter(function(r) {
                    return String(r.country || '').toLowerCase() === country;
                });
            },
            capsule: async (id) => {
                var doc = await window.kbatch.xref.dictionary();
                var cid = String(id || '');
                return (doc && doc.capsule_bridge || []).filter(function(r) {
                    return String(r.capsule_id || '') === cid;
                });
            },
        },
        stream: {
            index: (force) => loadStreamDoc("index", !!force),
            ingest: (force) => loadStreamDoc("ingest", !!force),
            capsules: (force) => loadStreamDoc("capsules", !!force),
            preflight: (force) => loadStreamDoc("preflight", !!force),
            pulse: () => refreshStreamHeartbeatUI(),
            status: async () => {
                var doc = await loadStreamDoc("index", false);
                return doc && doc.counts ? doc.counts : null;
            },
            xref: async (assetId) => {
                var doc = await loadStreamDoc("capsules", false);
                var target = (doc || []).find(function(c) {
                    var entityId = ((c.meta || {}).entity_id || "");
                    return entityId === assetId || String(c.id || "") === assetId;
                });
                return target || null;
            },
        },
        booklane: {
            registry: (force) => loadBooklaneDoc("registry", !!force),
            history: (force) => loadBooklaneDoc("history", !!force),
            index: (force) => loadBooklaneDoc("index", !!force),
            analyze: (assetId) => buildBooklaneAssetReport(assetId),
            xref: async (assetId) => {
                var doc = await loadXrefDoc("dictionary");
                var capId = makeBookCapsuleId(assetId);
                return (doc && doc.capsule_bridge || []).filter(function(r) { return String(r.capsule_id || "") === capId; });
            },
            persona: (assetId, profile) => applyBooklanePersonaProfile(assetId, profile),
            preflight: (assetId) => buildBooklanePreflight(assetId),
            pullCommand: (assetId, execute) => {
                var cmd = "uv run python school/corpus/pull_public_domain_sources.py --asset-id " + String(assetId || "<asset-id>");
                return execute ? (cmd + " --execute") : cmd;
            },
            run: async (assetId, profile) => {
                var id = String(assetId || "").trim();
                var before = await buildBooklaneAssetReport(id);
                var persona = profile ? applyBooklanePersonaProfile(id, profile) : null;
                var xref = await (window.kbatch && window.kbatch.booklane ? window.kbatch.booklane.xref(id) : Promise.resolve([]));
                var preflight = await buildBooklanePreflight(id);
                return {
                    asset_id: id,
                    before: before,
                    persona: persona,
                    xref: xref,
                    preflight: preflight
                };
            }
        },
        ugrad: {
            tensor: (text) => buildUgradTensorEvolutionPacket(text || ((document.getElementById('typing-input') || {}).value || "")),
            pathlanes: (text) => {
                var src = String(text || ((document.getElementById('typing-input') || {}).value || ""));
                var caps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(src, 12) : [];
                return matchGamificationPathlanes(src, caps);
            },
            preflight: (text) => buildUgradTensorEvolutionPacket(text || ((document.getElementById('typing-input') || {}).value || ""))
        },
        steno: {
            encode: (text) => window.StenoEngine ? window.StenoEngine.encode(text) : null,
            decode: (syms) => window.StenoEngine ? window.StenoEngine.decode(syms) : null,
            compress: (text) => window.StenoEngine ? window.StenoEngine.compressSentence(text) : null,
            freq: (text) => window.StenoEngine ? window.StenoEngine.frequencySignature(text) : null,
            density: (text) => window.StenoEngine ? window.StenoEngine.conceptDensity(text) : null,
            flow: (text) => window.StenoEngine ? window.StenoEngine.conceptFlow(text) : null,
            enrich: (word) => window.StenoEngine ? window.StenoEngine.enrichWord(word) : null,
            bridge: (atom) => window.StenoEngine ? window.StenoEngine.findConceptAcrossLanguages(atom) : null,
            atoms: () => window.StenoEngine ? window.StenoEngine.ATOMS : {},
            // Periodic Table & Physics Bridge
            periodicTable: () => window.StenoEngine ? window.StenoEngine.PERIODIC_TABLE : [],
            getElement: (q) => window.StenoEngine ? window.StenoEngine.getElement(q) : null,
            elementPrefix: (q) => {
                if (!window.StenoEngine) return null;
                var el = window.StenoEngine.getElement(q);
                return el ? { element: el, prefix: window.StenoEngine.elementToPrefix(el), gates: window.StenoEngine.elementToGates(el) } : null;
            },
            matchPhysics: (prefixCounts) => window.StenoEngine ? window.StenoEngine.matchPhysics(prefixCounts) : [],
            allElementPrefixes: () => window.StenoEngine ? window.StenoEngine.allElementsWithPrefixes() : [],
            freqRegistry: () => window.StenoEngine ? window.StenoEngine.FREQ_REGISTRY : null,
            contrailLang: {
                word: (w, layout) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.wordToContrail(w, layout) : null,
                sentence: (s, layout) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.encodeSentence(s, layout) : null,
                reverse: (arrows, layout) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.contrailToWords(arrows, layout) : [],
                homophones: (layout) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.findHomophones(layout) : {},
                translate: (w, from, to) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.translateWord(w, from, to) : null,
                grammar: (layout) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.analyzeGrammar(layout) : null,
                dialects: (l1, l2) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.compareDialects(l1, l2) : null,
                melody: (w, layout) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.wordMelody(w, layout) : null,
                vocab: (layout) => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.buildVocabulary(layout) : {},
                phonemes: () => window.StenoEngine && window.StenoEngine.ContrailLang ? window.StenoEngine.ContrailLang.PHONEMES : {},
            },
        },
        capsuleAnalyzer: {
            library: () => window.CapsuleAnalyzer ? window.CapsuleAnalyzer.getLibrary() : null,
            lookup: (word) => window.CapsuleAnalyzer ? window.CapsuleAnalyzer.lookupWord(word) : null,
            compare: (a, b) => window.CapsuleAnalyzer ? window.CapsuleAnalyzer.compareCapsules(a, b) : null,
            vectors: () => window.CapsuleAnalyzer ? window.CapsuleAnalyzer.exportTrainingVectors() : [],
            csv: () => window.CapsuleAnalyzer ? window.CapsuleAnalyzer.exportCSV() : '',
        },
        capsules: {
            all: () => CAPSULES.slice(),
            byId: (id) => getCapsuleById(id),
            entity: (type) => CAPSULES.filter(function(c) {
                var t = String(type || '').trim().toLowerCase();
                return c && c.meta && String(c.meta.entity_type || '').toLowerCase() === t;
            }),
            search: (query, limit) => {
                return capsuleSearchFallback(query, limit);
            },
            searchAsync: (query, limit) => capsuleSearchAsync(query, limit),
            packet: (id) => {
                var cap = getCapsuleById(id);
                return cap ? buildCapsuleStackPacket(cap) : null;
            },
            emit: (id) => {
                var cap = getCapsuleById(id);
                return cap ? emitCapsulePacket(cap) : null;
            },
            export: (id) => {
                var cap = getCapsuleById(id);
                return cap ? exportCapsulePacket(cap) : null;
            },
            sync: (opts, onProgress) => syncCapsulePackets(opts || {}, onProgress),
            openSearch: (id, opts) => {
                var cap = getCapsuleById(id);
                return cap ? runCapsuleOpenSearch(cap, opts || {}) : Promise.resolve({ error: 'capsule not found' });
            },
            preservation: (id) => {
                var cap = getCapsuleById(id);
                return cap ? languagePreservationProfile(cap) : null;
            },
            syncLanguage: (id) => {
                var cap = getCapsuleById(id);
                return cap ? emitLanguagePreservationSync(cap) : null;
            },
            upsert: (payload, opts) => upsertCapsuleFromCli(payload, opts || {}),
            appendWords: (id, words, opts) => appendCapsuleWordsFromCli(id, words, opts || {}),
            localOverrides: () => LOCAL_CAPSULE_OVERRIDES.slice(),
        },
        persona: {
            analyze: (text) => window.PersonaContext ? window.PersonaContext.analyzeFullContext(text) : null,
            financial: (text) => window.PersonaContext ? window.PersonaContext.analyzeFinancialContext(text) : null,
            therapeutic: (text) => window.PersonaContext ? window.PersonaContext.analyzeTherapeuticContext(text) : null,
            summary: () => window.PersonaContext ? window.PersonaContext.getPersonaSummary() : null,
            layer: (l) => window.PersonaContext ? window.PersonaContext.getLayer(l) : null,
            addGoal: (l, g) => { if (window.PersonaContext) window.PersonaContext.addGoal(l, g); },
            addConcern: (l, c) => { if (window.PersonaContext) window.PersonaContext.addConcern(l, c); },
            setNote: (l, n) => { if (window.PersonaContext) window.PersonaContext.setLayerNote(l, n); },
            getPromptLanguage: () => getPersonaPromptLanguage(),
            setPromptLanguage: (text) => setPersonaPromptLanguage(text),
            outline: (text) => {
                var src = String(text || ((document.getElementById('typing-input') || {}).value || ""));
                var bench = window.kbatch && window.kbatch.stack ? window.kbatch.stack.benchmark(src) : null;
                var caps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(src, 8) : [];
                var capsuleCtx = (caps || []).slice(0, 5).map(function(c) {
                    return { id: c.id, name: c.name, category: c.cat, words: (c.words || []).slice(0, 12) };
                });
                var contrail = buildContrailInjection(src, capsuleCtx, bench);
                return buildPersonaOutlineContext(src, capsuleCtx, bench, contrail);
            },
            models: (text) => {
                var src = String(text || ((document.getElementById('typing-input') || {}).value || ""));
                var caps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(src, 8) : [];
                var ctx = (caps || []).slice(0, 6).map(function(c) { return { words: (c.words || []).slice(0, 8) }; });
                return {
                    frameworks: PERSONA_FRAMEWORKS.slice(),
                    psychologicalGroundTruth: PERSONA_PSYCHOLOGICAL_FRAMEWORKS,
                    dataSourceTypes: PERSONA_DATA_SOURCE_TYPES.slice(),
                    methodologies: PERSONA_METHODS.slice(),
                    behavioralPolicies: PERSONA_BEHAVIOR_POLICIES,
                    archetypes: inferPersonaArchetypes(src, ctx),
                    modelFamilies: ["text-foundation", "multimodal-foundation", "retrieval-augmented", "governance-aware", "persona-adaptive"]
                };
            },
            ik: () => buildMultimodalComponentStatus().ikPose,
            media: () => buildMultimodalComponentStatus(),
            rndr: (action, value) => {
                var a = String(action || "status").toLowerCase();
                if (a === "token") return setRndrConfig({ token: String(value || "") });
                if (a === "endpoint") return setRndrConfig({ endpoint: String(value || "") });
                return rndrStatusPayload();
            },
            chain: (text) => buildPersonaChainReport(text || ((document.getElementById('typing-input') || {}).value || "")),
            clear: () => { if (window.PersonaContext) window.PersonaContext.clear(); },
        },
        cacheIntel: {
            record: (word, ctx) => window.CacheIntel ? window.CacheIntel.recordInteraction(word, ctx) : null,
            trainBatch: (words, ctx) => { if (window.CacheIntel) window.CacheIntel.trainBatch(words, ctx); },
            getEntry: (word) => window.CacheIntel ? window.CacheIntel.getEntry(word) : null,
            topWords: (dim, n) => window.CacheIntel ? window.CacheIntel.getTopWords(dim, n) : [],
            trainingTargets: (n) => window.CacheIntel ? window.CacheIntel.getTrainingTargets(n) : [],
            byGate: (gate) => window.CacheIntel ? window.CacheIntel.getByQuantumGate(gate) : [],
            byCapsule: (cat) => window.CacheIntel ? window.CacheIntel.getByCapsule(cat) : [],
            exportML: () => window.CacheIntel ? window.CacheIntel.exportTrainingData() : null,
            summary: () => window.CacheIntel ? window.CacheIntel.getSummary() : null,
            prune: (min) => window.CacheIntel ? window.CacheIntel.prune(min) : 0,
            size: () => window.CacheIntel ? window.CacheIntel.getSize() : 0,
            clear: () => { if (window.CacheIntel) window.CacheIntel.clear(); },
        },
        training: {
            get sessions() { return Training.sessions; },
            get bestWpm() { return Training.bestWpm; },
            exportForAI: () => Training.exportForAI(),
            exportJSON: () => Training.exportJSON(),
            pushToSearch: () => Training.pushToSearch(),
        },
    };

    // ══════════════════ SESSION VOCABULARY + TONE METER ══════════════════
    (function(){
        const HS = window.HistorySearch;
        if (!HS || !HS.analyzeContext) return;
        let sessionText = '';
        let toneTimer = null;
        const toneEl = document.getElementById('s-tone');
        const hbEl = document.getElementById('s-heartbeat');
        const TC = { academic:'#3b82f6', marketing:'#f97316', educational:'#34d399', narrative:'#a78bfa', legal:'#fbbf24', crisis:'#ef4444' };

        function updateLiveTone() {
            if (sessionText.length < 20) return;
            const a = HS.analyzeContext({ content: sessionText });
            if (a.tone && a.tone.dominant) {
                toneEl.textContent = a.tone.dominant;
                toneEl.style.color = TC[a.tone.dominant] || '#c9d1d9';
            }
            const hb = Math.round((a.heartbeat || 0.5) * 100);
            hbEl.textContent = hb + '%';
            hbEl.style.color = hb >= 50 ? '#8b5cf6' : '#f97316';
            // Feed persona context engine with session text
            if (window.PersonaContext && sessionText.length > 50) {
                window.PersonaContext.analyzeFullContext(sessionText);
            }
        }

        // Hook into typing input
        const typInput = document.getElementById('typing-input');
        if (typInput) {
            typInput.addEventListener('input', () => {
                sessionText = typInput.value;
                clearTimeout(toneTimer);
                toneTimer = setTimeout(updateLiveTone, 500);
            });
        }

        // Also track processText calls
        const origProcess = window.kbatch.processText;
        window.kbatch.processText = (text) => {
            sessionText += ' ' + text;
            origProcess(text);
            clearTimeout(toneTimer);
            toneTimer = setTimeout(updateLiveTone, 500);
        };

        // Expose session analysis
        window.kbatch.sessionAnalysis = () => HS.analyzeContext({ content: sessionText });
        window.kbatch.sessionText = () => sessionText;
    })();

    // ══════════════════ UNIVERSAL ENCODER / CONVERTER ══════════════════
    window.Encoder = (function() {
        'use strict';
        // Braille Grade 1 mapping
        var BRAILLE = {' ':'\u2800','a':'\u2801','b':'\u2803','c':'\u2809','d':'\u2819','e':'\u2811','f':'\u280B','g':'\u281B','h':'\u2813','i':'\u280A','j':'\u281A','k':'\u2805','l':'\u2807','m':'\u280D','n':'\u281D','o':'\u2815','p':'\u280F','q':'\u281F','r':'\u2817','s':'\u280E','t':'\u281E','u':'\u2825','v':'\u2827','w':'\u283A','x':'\u282D','y':'\u283D','z':'\u2835','1':'\u2801','2':'\u2803','3':'\u2809','4':'\u2819','5':'\u2811','6':'\u280B','7':'\u281B','8':'\u2813','9':'\u280A','0':'\u281A','.':'\u2832',',':'\u2802','?':'\u2826','!':'\u2816',';':'\u2812',':':'\u2814'};
        // Morse code mapping
        var MORSE = {'a':'.-','b':'-...','c':'-.-.','d':'-..','e':'.','f':'..-.','g':'--.','h':'....','i':'..','j':'.---','k':'-.-','l':'.-..','m':'--','n':'-.','o':'---','p':'.--.','q':'--.-','r':'.-.','s':'...','t':'-','u':'..-','v':'...-','w':'.--','x':'-..-','y':'-.--','z':'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.','SOS':'...---...'};
        // ASL fingerspelling (American Sign Language)
        var ASL = {'a':'fist,thumb-side','b':'flat hand up','c':'curved hand','d':'index up,circle','e':'curled fingers','f':'OK sign inverted','g':'point sideways','h':'2 fingers side','i':'pinky up','j':'pinky+arc','k':'2 fingers+thumb','l':'L-shape','m':'3 over thumb','n':'2 over thumb','o':'fingertips touch','p':'K-inverted down','q':'G-down','r':'crossed fingers','s':'fist,thumb-front','t':'thumb through','u':'2 fingers up','v':'peace sign','w':'3 fingers up','x':'hooked index','y':'hang loose','z':'index draws Z'};
        // BSL fingerspelling (British Sign Language — two-handed)
        var BSL = {'a':'flat palm out,thumb up','b':'flat palm out,4 fingers','c':'curved palm left','d':'index up,palm out','e':'palm out,fingers bent','f':'index+thumb circle,3 up','g':'point right,thumb across','h':'2 fingers point right','i':'pinky up,fist','j':'pinky arc forward','k':'index+middle up,thumb between','l':'L-shape,palm out','m':'3 fingertips down on thumb','n':'2 fingertips down on thumb','o':'fingertips circle,palm out','p':'index down,thumb out','q':'flat hand down,thumb out','r':'crossed index+middle','s':'fist,palm out','t':'thumb between index+middle','u':'2 fingers up,palm out','v':'peace sign,palm out','w':'3 fingers up,palm out','x':'hooked index,palm left','y':'thumb+pinky out,palm out','z':'index draws Z,palm out'};
        // Latin transliteration (English → closest Latin equivalent)
        var LATIN_ROOTS = {'water':'aqua','fire':'ignis','earth':'terra','air':'aer','light':'lux','life':'vita','death':'mors','love':'amor','war':'bellum','peace':'pax','king':'rex','law':'lex','voice':'vox','road':'via','truth':'veritas','courage':'virtus','body':'corpus','soul':'animus','time':'tempus','work':'opus','human':'homo','god':'deus','world':'mundus','sky':'caelum','star':'stella','moon':'luna','sun':'sol','forest':'silva','sea':'mare','mountain':'mons','river':'flumen','city':'urbs','people':'populus','freedom':'libertas','justice':'iustitia','wisdom':'sapientia','glory':'gloria','faith':'fides','hope':'spes','nature':'natura','reason':'ratio','science':'scientia','art':'ars','memory':'memoria','book':'liber','friend':'amicus','enemy':'hostis','teacher':'magister','student':'discipulus','father':'pater','mother':'mater','brother':'frater','sister':'soror','son':'filius','daughter':'filia','heart':'cor','mind':'mens','eye':'oculus','hand':'manus','foot':'pes','blood':'sanguis','bone':'os','stone':'lapis','iron':'ferrum','gold':'aurum','silver':'argentum','wood':'lignum'};

        function toBraille(text) {
            return text.toLowerCase().split('').map(function(c) { return BRAILLE[c] || c; }).join('');
        }
        function toMorse(text) {
            return text.toLowerCase().split('').map(function(c) { return MORSE[c] || (c === ' ' ? '/' : c); }).join(' ');
        }
        function toASL(text) {
            return text.toLowerCase().split('').filter(function(c) { return /[a-z]/.test(c); }).map(function(c) { return c.toUpperCase() + ':' + (ASL[c] || '?'); }).join(' | ');
        }
        function toBSL(text) {
            return text.toLowerCase().split('').filter(function(c) { return /[a-z]/.test(c); }).map(function(c) { return c.toUpperCase() + ':' + (BSL[c] || '?'); }).join(' | ');
        }
        function toHex(text) {
            return text.split('').map(function(c) { return '0x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0'); }).join(' ');
        }
        function toBinary(text) {
            return text.split('').map(function(c) { return c.charCodeAt(0).toString(2).padStart(8,'0'); }).join(' ');
        }
        function toBase64(text) {
            try { return btoa(unescape(encodeURIComponent(text))); } catch(e) { return '(encoding error)'; }
        }
        function toOctal(text) {
            return text.split('').map(function(c) { return '0o' + c.charCodeAt(0).toString(8).padStart(3,'0'); }).join(' ');
        }
        function toUnicode(text) {
            var out = [];
            for (var i = 0; i < text.length; i++) {
                var cp = text.codePointAt(i);
                out.push('U+' + cp.toString(16).toUpperCase().padStart(4,'0'));
                if (cp > 0xFFFF) i++; // surrogate pair
            }
            return out.join(' ');
        }
        function toLatinRoot(text) {
            var words = text.toLowerCase().split(/\s+/);
            return words.map(function(w) { return LATIN_ROOTS[w] ? w + '\u2192' + LATIN_ROOTS[w] : w; }).join(' ');
        }
        function toNATO(text) {
            var NATO = {'a':'Alpha','b':'Bravo','c':'Charlie','d':'Delta','e':'Echo','f':'Foxtrot','g':'Golf','h':'Hotel','i':'India','j':'Juliet','k':'Kilo','l':'Lima','m':'Mike','n':'November','o':'Oscar','p':'Papa','q':'Quebec','r':'Romeo','s':'Sierra','t':'Tango','u':'Uniform','v':'Victor','w':'Whiskey','x':'X-ray','y':'Yankee','z':'Zulu'};
            return text.toLowerCase().split('').filter(function(c) { return /[a-z]/.test(c); }).map(function(c) { return NATO[c] || c; }).join(' ');
        }
        // ─── Keyboard Flow Notation ───
        // Maps key transitions to directional combos like game controller inputs
        // QWERTY layout positions for flow calculation
        var FLOW_POS = {};
        ['qwertyuiop','asdfghjkl;','zxcvbnm,./'].forEach(function(row, r) {
            row.split('').forEach(function(k, c) { FLOW_POS[k] = { x: c + r * 0.25, y: r }; });
        });
        FLOW_POS[' '] = { x: 4.5, y: 3.2 };

        var FLOW_DIRS = {
            'U': '\u2191', 'D': '\u2193', 'L': '\u2190', 'R': '\u2192',
            'UL': '\u2196', 'UR': '\u2197', 'DL': '\u2199', 'DR': '\u2198',
            'S': '\u25CF',  // same position / tap
        };

        function flowDir(dx, dy) {
            var adx = Math.abs(dx), ady = Math.abs(dy);
            if (adx < 0.3 && ady < 0.3) return 'S';
            if (ady < 0.3) return dx > 0 ? 'R' : 'L';
            if (adx < 0.3) return dy < 0 ? 'U' : 'D';
            if (dy < 0) return dx > 0 ? 'UR' : 'UL';
            return dx > 0 ? 'DR' : 'DL';
        }

        function toKeyboardFlow(text) {
            var chars = text.toLowerCase().split('').filter(function(c) { return FLOW_POS[c]; });
            if (chars.length < 2) return { combo: '', arrows: '', directions: [], pattern: '' };
            var dirs = [];
            for (var i = 1; i < chars.length; i++) {
                var a = FLOW_POS[chars[i-1]], b = FLOW_POS[chars[i]];
                if (a && b) dirs.push(flowDir(b.x - a.x, b.y - a.y));
            }
            return {
                combo: dirs.join('-'),
                arrows: dirs.map(function(d) { return FLOW_DIRS[d] || '?'; }).join(''),
                directions: dirs,
                pattern: compressFlow(dirs),
            };
        }

        // Compress repeated flow patterns: R-R-R → R×3
        function compressFlow(dirs) {
            if (dirs.length === 0) return '';
            var out = [], prev = dirs[0], count = 1;
            for (var i = 1; i < dirs.length; i++) {
                if (dirs[i] === prev) { count++; }
                else {
                    out.push(count > 1 ? prev + '\u00d7' + count : prev);
                    prev = dirs[i]; count = 1;
                }
            }
            out.push(count > 1 ? prev + '\u00d7' + count : prev);
            return out.join(' ');
        }

        // ─── Dance Move / Gesture Notation ───
        // Maps flow patterns to physical movement vocabulary
        var GESTURE_MAP = {
            'U':   { gesture: 'lift',       dance: 'rise',        wand: 'flick up' },
            'D':   { gesture: 'press',      dance: 'dip',         wand: 'swish down' },
            'L':   { gesture: 'sweep left', dance: 'slide left',  wand: 'wave left' },
            'R':   { gesture: 'sweep right', dance: 'slide right', wand: 'wave right' },
            'UL':  { gesture: 'arc upper-left', dance: 'spiral up', wand: 'counter-clock' },
            'UR':  { gesture: 'arc upper-right', dance: 'grand jete', wand: 'clockwise' },
            'DL':  { gesture: 'scoop left', dance: 'moonwalk',    wand: 'dig left' },
            'DR':  { gesture: 'scoop right', dance: 'chassé',     wand: 'dig right' },
            'S':   { gesture: 'tap',        dance: 'hold',        wand: 'point' },
        };

        function toGesture(text) {
            var flow = toKeyboardFlow(text);
            return flow.directions.map(function(d) { return GESTURE_MAP[d] || GESTURE_MAP['S']; });
        }

        function toDanceMoves(text) {
            var gestures = toGesture(text);
            return gestures.map(function(g) { return g.dance; }).join(' \u2192 ');
        }

        function toWandMoves(text) {
            var gestures = toGesture(text);
            return gestures.map(function(g) { return g.wand; }).join(' \u2192 ');
        }

        // ─── Musical Notation ───
        // Map QWERTY rows to octaves, columns to chromatic scale
        // Row 0 (qwerty) = octave 5, Row 1 (asdf) = octave 4, Row 2 (zxcv) = octave 3
        var NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        var MIDI_BASE = { 0: 60, 1: 48, 2: 36 }; // octave bases

        function keyToNote(ch) {
            var pos = FLOW_POS[ch.toLowerCase()];
            if (!pos) return null;
            var row = Math.round(pos.y);
            var col = Math.round(pos.x);
            var midiBase = MIDI_BASE[row] || 48;
            var midi = midiBase + Math.min(col, 11);
            var noteName = NOTE_NAMES[midi % 12];
            var octave = Math.floor(midi / 12) - 1;
            // Duration estimate from position: home row = quarter, outer rows = eighth
            var duration = row === 1 ? 'q' : row === 0 ? 'e' : 's'; // quarter, eighth, sixteenth
            return { note: noteName, octave: octave, midi: midi, duration: duration, full: noteName + octave };
        }

        function toMusicalNotes(text) {
            var chars = text.toLowerCase().split('').filter(function(c) { return /[a-z,\.;\/]/.test(c); });
            return chars.map(keyToNote).filter(function(n) { return n; });
        }

        function toMusicNotation(text) {
            var notes = toMusicalNotes(text);
            return notes.map(function(n) { return n.full; }).join(' ');
        }

        // ─── Rhythm / Cadence Pattern ───
        // Uses CapsuleAnalyzer rhythm data if available, otherwise estimates
        var HOME_SET = new Set('asdfghjkl;'.split(''));
        var FINGER_TIME = { 0:145, 1:125, 2:105, 3:95, 4:95, 5:105, 6:125, 7:145, 8:80 };
        var FINGER_IDX = {};
        'qaz'.split('').forEach(function(k) { FINGER_IDX[k] = 0; });
        'wsx'.split('').forEach(function(k) { FINGER_IDX[k] = 1; });
        'edc'.split('').forEach(function(k) { FINGER_IDX[k] = 2; });
        'rfvtgb'.split('').forEach(function(k) { FINGER_IDX[k] = 3; });
        'yhnujm'.split('').forEach(function(k) { FINGER_IDX[k] = 4; });
        'ik,'.split('').forEach(function(k) { FINGER_IDX[k] = 5; });
        'ol.'.split('').forEach(function(k) { FINGER_IDX[k] = 6; });
        'p;/'.split('').forEach(function(k) { FINGER_IDX[k] = 7; });

        function toRhythm(text) {
            var chars = text.toLowerCase().split('').filter(function(c) { return FLOW_POS[c]; });
            var timings = [];
            for (var i = 0; i < chars.length; i++) {
                var fi = FINGER_IDX[chars[i]];
                var baseMs = FINGER_TIME[fi !== undefined ? fi : 4] || 110;
                // Add travel time between consecutive keys
                if (i > 0) {
                    var a = FLOW_POS[chars[i-1]], b = FLOW_POS[chars[i]];
                    if (a && b) baseMs += Math.sqrt(Math.pow(b.x-a.x,2) + Math.pow(b.y-a.y,2)) * 12;
                }
                timings.push(Math.round(baseMs));
            }
            // Convert to beat notation (● = strong, ○ = weak, based on timing)
            var avgMs = timings.length > 0 ? timings.reduce(function(s,v){return s+v;},0) / timings.length : 100;
            var beats = timings.map(function(t) { return t < avgMs * 0.85 ? '\u25CF' : t > avgMs * 1.15 ? '\u25CB' : '\u25D0'; });
            // Detect time signature approximation
            var strongBeats = beats.filter(function(b) { return b === '\u25CF'; }).length;
            var ratio = strongBeats / Math.max(beats.length, 1);
            var timeSig = ratio > 0.6 ? '6/8' : ratio > 0.4 ? '4/4' : ratio > 0.25 ? '3/4' : '2/4';
            return {
                timings: timings,
                beats: beats.join(''),
                timeSig: timeSig,
                avgMs: Math.round(avgMs),
                bpm: Math.round(60000 / avgMs),
                pattern: compressBeats(beats),
            };
        }

        function compressBeats(beats) {
            if (beats.length === 0) return '';
            var out = [], prev = beats[0], count = 1;
            for (var i = 1; i < beats.length; i++) {
                if (beats[i] === prev) { count++; }
                else {
                    out.push(count > 1 ? prev + count : prev);
                    prev = beats[i]; count = 1;
                }
            }
            out.push(count > 1 ? prev + count : prev);
            return out.join('');
        }

        // ─── Intonation / Chant / Spoken Word Cadence ───
        // Maps words to prosodic contour (rising, falling, level, dipping)
        // Based on syllable stress patterns common in spoken language
        var VOWELS = new Set('aeiou'.split(''));
        function countSyllables(word) {
            var w = word.toLowerCase().replace(/[^a-z]/g, '');
            if (w.length <= 2) return 1;
            var count = 0, prev = false;
            for (var i = 0; i < w.length; i++) {
                var isV = VOWELS.has(w[i]);
                if (isV && !prev) count++;
                prev = isV;
            }
            if (w.endsWith('e') && count > 1) count--;
            return Math.max(1, count);
        }

        // Prosodic contour symbols
        var CONTOURS = { rise: '\u02E4', fall: '\u02E5', level: '\u02E9', dip: '\u02E8\u02E7' };

        function toIntonation(text) {
            var words = text.split(/\s+/).filter(function(w) { return w.length > 0; });
            var contours = [];
            words.forEach(function(w, i) {
                var sylls = countSyllables(w);
                var len = w.length;
                var isQuestion = /\?$/.test(w);
                var isExclaim = /!$/.test(w);
                var isEnd = i === words.length - 1;
                // Determine contour
                if (isQuestion) contours.push({ word: w, contour: 'rise', symbol: CONTOURS.rise, syllables: sylls });
                else if (isExclaim) contours.push({ word: w, contour: 'fall', symbol: CONTOURS.fall, syllables: sylls });
                else if (isEnd) contours.push({ word: w, contour: 'fall', symbol: CONTOURS.fall, syllables: sylls });
                else if (sylls >= 3) contours.push({ word: w, contour: 'dip', symbol: CONTOURS.dip, syllables: sylls });
                else contours.push({ word: w, contour: 'level', symbol: CONTOURS.level, syllables: sylls });
            });
            // Detect chant pattern (repeating stress)
            var contourSeq = contours.map(function(c) { return c.contour; });
            var isChant = false;
            if (contourSeq.length >= 4) {
                var pair = contourSeq[0] + contourSeq[1];
                isChant = contourSeq.slice(2).every(function(c, i) { return c === contourSeq[i % 2]; });
            }
            // Musical reference: map intonation to scales
            var scaleMap = { rise: 'major ascending', fall: 'minor descending', level: 'drone/pedal', dip: 'pentatonic arc' };
            return {
                contours: contours,
                pattern: contours.map(function(c) { return c.symbol; }).join(' '),
                isChant: isChant,
                totalSyllables: contours.reduce(function(s,c) { return s + c.syllables; }, 0),
                musicalScale: scaleMap[contours.length > 0 ? contours[0].contour : 'level'],
                cadence: contours.length > 1 ? (contours[contours.length-1].contour === 'fall' ? 'authentic' : contours[contours.length-1].contour === 'rise' ? 'half' : 'plagal') : 'single',
            };
        }

        // Convert all encodings at once
        function encodeAll(text) {
            if (!text || text.length === 0) return null;
            var flow = toKeyboardFlow(text);
            var rhythm = toRhythm(text);
            var intonation = toIntonation(text);
            return {
                original: text,
                braille: toBraille(text),
                morse: toMorse(text),
                asl: toASL(text),
                bsl: toBSL(text),
                hex: toHex(text),
                binary: toBinary(text),
                base64: toBase64(text),
                octal: toOctal(text),
                unicode: toUnicode(text),
                latin: toLatinRoot(text),
                nato: toNATO(text),
                // New: flow, music, rhythm, dance, intonation
                keyFlow: flow,
                danceNotation: toDanceMoves(text),
                wandNotation: toWandMoves(text),
                musicalNotes: toMusicNotation(text),
                rhythm: rhythm,
                intonation: intonation,
                charCount: text.length,
                byteCount: new Blob([text]).size,
                bitCount: new Blob([text]).size * 8,
            };
        }
        // Render a compact encoding card
        function renderCard(text) {
            var enc = encodeAll(text);
            if (!enc) return '';
            var rows = [
                ['\u2800 Braille', enc.braille, '#e5e7eb'],
                ['\u00B7\u2013 Morse', enc.morse, '#22d3ee'],
                ['\u{1F91F} ASL', enc.asl, '#f472b6'],
                ['\uD83C\uDDEC\uD83C\uDDE7 BSL', enc.bsl, '#6366f1'],
                ['0x Hex', enc.hex, '#fb923c'],
                ['01 Binary', enc.binary.split(' ').slice(0,4).join(' ') + (text.length > 4 ? '...' : ''), '#16a34a'],
                ['B64', enc.base64, '#a78bfa'],
                ['U+ Unicode', enc.unicode, '#3b82f6'],
                ['\uD83C\uDFDB Latin', enc.latin, '#d4a017'],
                ['\uD83D\uDEA9 NATO', enc.nato, '#f97316'],
            ];
            var html = '<div style="border:1px solid #30363d;border-radius:6px;padding:8px;margin-top:8px;background:#0d1117;">';
            html += '<div style="font-weight:700;color:#58a6ff;margin-bottom:6px;font-size:.6875rem;">\u26A1 Universal Encoder: "' + text.substring(0,30) + '"</div>';
            html += '<div style="font-size:.5rem;color:#484f58;margin-bottom:4px;">' + enc.charCount + ' chars | ' + enc.byteCount + ' bytes | ' + enc.bitCount + ' bits</div>';
            rows.forEach(function(r) {
                html += '<div style="display:flex;gap:6px;padding:2px 0;border-bottom:1px solid #161b22;"><span style="min-width:60px;color:' + r[2] + ';font-size:.5625rem;font-weight:600;">' + r[0] + '</span><span style="font-family:\'SF Mono\',monospace;font-size:.5625rem;color:#8b949e;word-break:break-all;flex:1;">' + r[1] + '</span></div>';
            });
            // ── Flow / Music / Rhythm section ──
            html += '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #30363d;">';
            html += '<div style="font-weight:700;color:#c084fc;margin-bottom:4px;font-size:.6875rem;">\uD83C\uDFB5 Flow \u00B7 Music \u00B7 Rhythm</div>';
            // Keyboard flow
            html += '<div style="display:flex;gap:6px;padding:2px 0;border-bottom:1px solid #161b22;"><span style="min-width:60px;color:#58a6ff;font-size:.5625rem;font-weight:600;">\u2B05 Flow</span><span style="font-size:.75rem;letter-spacing:1px;">' + enc.keyFlow.arrows + '</span><span style="font-size:.5rem;color:#484f58;margin-left:4px;">' + enc.keyFlow.pattern + '</span></div>';
            // Dance moves
            html += '<div style="display:flex;gap:6px;padding:2px 0;border-bottom:1px solid #161b22;"><span style="min-width:60px;color:#f472b6;font-size:.5625rem;font-weight:600;">\uD83D\uDC83 Dance</span><span style="font-family:\'SF Mono\',monospace;font-size:.5625rem;color:#8b949e;flex:1;">' + enc.danceNotation + '</span></div>';
            // Wand/gesture
            html += '<div style="display:flex;gap:6px;padding:2px 0;border-bottom:1px solid #161b22;"><span style="min-width:60px;color:#a78bfa;font-size:.5625rem;font-weight:600;">\u2728 Wand</span><span style="font-family:\'SF Mono\',monospace;font-size:.5625rem;color:#8b949e;flex:1;">' + enc.wandNotation + '</span></div>';
            // Musical notes
            html += '<div style="display:flex;gap:6px;padding:2px 0;border-bottom:1px solid #161b22;"><span style="min-width:60px;color:#fbbf24;font-size:.5625rem;font-weight:600;">\uD83C\uDFB9 Notes</span><span style="font-family:\'SF Mono\',monospace;font-size:.5625rem;color:#8b949e;flex:1;">' + enc.musicalNotes + '</span></div>';
            // Rhythm
            html += '<div style="display:flex;gap:6px;padding:2px 0;border-bottom:1px solid #161b22;"><span style="min-width:60px;color:#3fb950;font-size:.5625rem;font-weight:600;">\uD83E\uDD41 Rhythm</span><span style="font-size:.75rem;letter-spacing:1px;">' + enc.rhythm.beats + '</span><span style="font-size:.5rem;color:#484f58;margin-left:4px;">' + enc.rhythm.timeSig + ' | ' + enc.rhythm.bpm + ' BPM</span></div>';
            // Intonation
            html += '<div style="display:flex;gap:6px;padding:2px 0;"><span style="min-width:60px;color:#fb923c;font-size:.5625rem;font-weight:600;">\uD83D\uDDE3 Cadence</span><span style="font-size:.75rem;letter-spacing:2px;">' + enc.intonation.pattern + '</span><span style="font-size:.5rem;color:#484f58;margin-left:4px;">' + enc.intonation.cadence + ' | ' + enc.intonation.totalSyllables + ' syll' + (enc.intonation.isChant ? ' | chant' : '') + '</span></div>';
            html += '</div>';
            html += '</div>';
            return html;
        }
        return { toBraille:toBraille, toMorse:toMorse, toASL:toASL, toBSL:toBSL, toHex:toHex, toBinary:toBinary, toBase64:toBase64, toOctal:toOctal, toUnicode:toUnicode, toLatinRoot:toLatinRoot, toNATO:toNATO, toKeyboardFlow:toKeyboardFlow, toGesture:toGesture, toDanceMoves:toDanceMoves, toWandMoves:toWandMoves, toMusicalNotes:toMusicalNotes, toMusicNotation:toMusicNotation, toRhythm:toRhythm, toIntonation:toIntonation, encodeAll:encodeAll, renderCard:renderCard, keyToNote:keyToNote, BSL:BSL, ASL:ASL, BRAILLE:BRAILLE, MORSE:MORSE };
    })();

    // ══════════════════ LIVE API CONNECTORS (Wiktionary + Datamuse) ══════════════════
    window.LiveDict = (function() {
        'use strict';
        var CACHE_KEY = 'uvspeed-livedict-cache';
        var cache = {};
        try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch(e) { cache = {}; }
        function saveCache() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch(e) {} }
        // Trim cache if > 2000 entries
        function trimCache() {
            var keys = Object.keys(cache);
            if (keys.length > 2000) {
                keys.sort(function(a,b) { return (cache[a]._ts || 0) - (cache[b]._ts || 0); });
                keys.slice(0, keys.length - 1500).forEach(function(k) { delete cache[k]; });
                saveCache();
            }
        }

        // ─── Wiktionary REST API v1 ───
        // Returns structured definitions for a word in a given language
        function wiktionaryLookup(word, lang) {
            lang = lang || 'en';
            var ckey = 'wk:' + lang + ':' + word.toLowerCase();
            if (cache[ckey]) return Promise.resolve(cache[ckey]);
            var url = 'https://' + lang + '.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word);
            return fetch(url).then(function(r) {
                if (!r.ok) throw new Error(r.status);
                return r.json();
            }).then(function(data) {
                // Parse structured response
                var result = { word: word, lang: lang, definitions: [], etymology: '', translations: [], partOfSpeech: [], _ts: Date.now() };
                if (data && Array.isArray(data)) {
                    data.forEach(function(langEntry) {
                        if (langEntry.definitions) {
                            langEntry.definitions.forEach(function(def) {
                                if (def.partOfSpeech) result.partOfSpeech.push(def.partOfSpeech);
                                if (def.definitions) {
                                    def.definitions.forEach(function(d) {
                                        var text = (d.definition || '').replace(/<[^>]*>/g, '');
                                        if (text) result.definitions.push({ pos: def.partOfSpeech || '', text: text, examples: (d.examples || []).map(function(e) { return e.replace(/<[^>]*>/g, ''); }) });
                                    });
                                }
                            });
                        }
                    });
                }
                cache[ckey] = result;
                trimCache(); saveCache();
                return result;
            }).catch(function(err) {
                return { word: word, lang: lang, definitions: [], error: err.message, _ts: Date.now() };
            });
        }

        // ─── Wiktionary MediaWiki API for etymology ───
        function wiktionaryEtymology(word, lang) {
            lang = lang || 'en';
            var ckey = 'wk-etym:' + lang + ':' + word.toLowerCase();
            if (cache[ckey]) return Promise.resolve(cache[ckey]);
            var url = 'https://' + lang + '.wiktionary.org/w/api.php?action=parse&page=' + encodeURIComponent(word) + '&prop=wikitext&format=json&origin=*';
            return fetch(url).then(function(r) { return r.json(); }).then(function(data) {
                var result = { word: word, etymology: '', relatedTerms: [], translations: [], _ts: Date.now() };
                var wikitext = (data.parse && data.parse.wikitext && data.parse.wikitext['*']) || '';
                // Extract etymology section
                var etymMatch = wikitext.match(/===\s*Etymology\s*===\s*\n([\s\S]*?)(?=\n===|\n\[\[Category|$)/i);
                if (etymMatch) {
                    result.etymology = etymMatch[1].replace(/\{\{[^}]*\}\}/g, '').replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2').replace(/'{2,}/g, '').trim().substring(0, 500);
                }
                // Extract translations if available
                var transMatch = wikitext.match(/====\s*Translations\s*====\s*\n([\s\S]*?)(?=\n====|\n===|\n\[\[Category|$)/i);
                if (transMatch) {
                    var transLines = transMatch[1].match(/\{\{t[\+\-]?\|([^|]*)\|([^}]*)\}\}/g) || [];
                    transLines.slice(0, 30).forEach(function(t) {
                        var m = t.match(/\{\{t[\+\-]?\|([^|]*)\|([^|}]*)/);
                        if (m) result.translations.push({ lang: m[1], word: m[2] });
                    });
                }
                // Extract related terms
                var relMatch = wikitext.match(/====\s*Related terms\s*====\s*\n([\s\S]*?)(?=\n====|\n===|$)/i);
                if (relMatch) {
                    var rels = relMatch[1].match(/\[\[([^\]]*)\]\]/g) || [];
                    result.relatedTerms = rels.slice(0, 20).map(function(r) { return r.replace(/[\[\]]/g, '').split('|').pop(); });
                }
                cache[ckey] = result;
                trimCache(); saveCache();
                return result;
            }).catch(function(err) {
                return { word: word, etymology: '', error: err.message, _ts: Date.now() };
            });
        }

        // ─── Datamuse API — synonyms, rhymes, related ───
        function datamuseLookup(word, type) {
            type = type || 'ml'; // ml=meaning-like, sl=sounds-like, rel_rhy=rhymes, rel_syn=synonyms
            var ckey = 'dm:' + type + ':' + word.toLowerCase();
            if (cache[ckey]) return Promise.resolve(cache[ckey]);
            var param = type === 'rhymes' ? 'rel_rhy' : type === 'sounds' ? 'sl' : type === 'syn' ? 'rel_syn' : type === 'trigger' ? 'rel_trg' : 'ml';
            var url = 'https://api.datamuse.com/words?' + param + '=' + encodeURIComponent(word) + '&max=20';
            return fetch(url).then(function(r) { return r.json(); }).then(function(data) {
                var result = { word: word, type: type, results: data.map(function(d) { return { word: d.word, score: d.score || 0, tags: d.tags || [] }; }), _ts: Date.now() };
                cache[ckey] = result;
                trimCache(); saveCache();
                return result;
            }).catch(function(err) {
                return { word: word, type: type, results: [], error: err.message, _ts: Date.now() };
            });
        }

        // ─── Free Dictionary API ───
        function freeDictLookup(word) {
            var ckey = 'fd:' + word.toLowerCase();
            if (cache[ckey]) return Promise.resolve(cache[ckey]);
            var url = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word);
            return fetch(url).then(function(r) { return r.json(); }).then(function(data) {
                var result = { word: word, phonetic: '', audio: '', meanings: [], origin: '', _ts: Date.now() };
                if (Array.isArray(data) && data[0]) {
                    var entry = data[0];
                    result.phonetic = entry.phonetic || (entry.phonetics && entry.phonetics[0] && entry.phonetics[0].text) || '';
                    result.audio = (entry.phonetics || []).map(function(p) { return p.audio; }).filter(Boolean)[0] || '';
                    result.origin = entry.origin || '';
                    (entry.meanings || []).forEach(function(m) {
                        result.meanings.push({
                            pos: m.partOfSpeech || '',
                            defs: (m.definitions || []).slice(0, 3).map(function(d) { return { def: d.definition, example: d.example || '', synonyms: (d.synonyms || []).slice(0, 5) }; })
                        });
                    });
                }
                cache[ckey] = result;
                trimCache(); saveCache();
                return result;
            }).catch(function(err) {
                return { word: word, meanings: [], error: err.message, _ts: Date.now() };
            });
        }

        // ─── Combined lookup — all sources at once ───
        function fullLookup(word) {
            return Promise.all([
                wiktionaryLookup(word, 'en'),
                wiktionaryEtymology(word, 'en'),
                datamuseLookup(word, 'ml'),
                datamuseLookup(word, 'rhymes'),
                freeDictLookup(word),
            ]).then(function(results) {
                return {
                    word: word,
                    wiktionary: results[0],
                    etymology: results[1],
                    related: results[2],
                    rhymes: results[3],
                    freeDict: results[4],
                    timestamp: Date.now(),
                };
            });
        }

        // ─── Render a compact enrichment card ───
        function renderEnrichment(data) {
            if (!data) return '';
            var html = '<div style="border:1px solid #30363d;border-radius:6px;padding:8px;margin-top:8px;background:#0d1117;">';
            html += '<div style="font-weight:700;color:#58a6ff;margin-bottom:6px;font-size:.6875rem;">\uD83C\uDF10 Live: "' + data.word + '"</div>';
            // Free Dict: phonetic + audio
            var fd = data.freeDict;
            if (fd && fd.phonetic) {
                html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
                html += '<span style="color:#a78bfa;font-style:italic;">' + fd.phonetic + '</span>';
                if (fd.audio) html += '<button onclick="new Audio(\'' + fd.audio + '\').play()" style="background:none;border:1px solid #30363d;color:#58a6ff;padding:1px 6px;border-radius:4px;cursor:pointer;font-size:.5rem;">\uD83D\uDD0A Play</button>';
                html += '</div>';
            }
            // Definitions (Free Dict)
            if (fd && fd.meanings && fd.meanings.length > 0) {
                fd.meanings.slice(0, 3).forEach(function(m) {
                    html += '<div style="margin-bottom:4px;"><span style="color:#fb923c;font-size:.5625rem;font-weight:600;">' + m.pos + '</span>';
                    m.defs.slice(0, 2).forEach(function(d) {
                        html += '<div style="color:#8b949e;font-size:.5625rem;padding-left:8px;">\u2022 ' + d.def + '</div>';
                        if (d.example) html += '<div style="color:#484f58;font-size:.5rem;padding-left:16px;font-style:italic;">"' + d.example + '"</div>';
                    });
                    html += '</div>';
                });
            }
            // Etymology
            var etym = data.etymology;
            if (etym && etym.etymology) {
                html += '<div style="margin-top:4px;padding:4px 6px;background:#161b22;border:1px solid #21262d;border-radius:4px;"><span style="color:#c084fc;font-size:.5625rem;font-weight:700;">Etymology:</span> <span style="color:#8b949e;font-size:.5625rem;">' + etym.etymology.substring(0, 300) + '</span></div>';
            } else if (fd && fd.origin) {
                html += '<div style="margin-top:4px;padding:4px 6px;background:#161b22;border:1px solid #21262d;border-radius:4px;"><span style="color:#c084fc;font-size:.5625rem;font-weight:700;">Origin:</span> <span style="color:#8b949e;font-size:.5625rem;">' + fd.origin + '</span></div>';
            }
            // Translations (Wiktionary)
            if (etym && etym.translations && etym.translations.length > 0) {
                html += '<div style="margin-top:4px;"><span style="color:#22d3ee;font-size:.5625rem;font-weight:700;">Translations:</span> ';
                html += etym.translations.slice(0, 12).map(function(t) {
                    return '<span style="color:#8b949e;font-size:.5rem;padding:1px 4px;background:#161b22;border:1px solid #21262d;border-radius:3px;" title="' + t.lang + '">' + t.lang + ':' + t.word + '</span>';
                }).join(' ');
                html += '</div>';
            }
            // Related terms
            if (etym && etym.relatedTerms && etym.relatedTerms.length > 0) {
                html += '<div style="margin-top:4px;"><span style="color:#3fb950;font-size:.5625rem;font-weight:700;">Related:</span> ';
                html += etym.relatedTerms.slice(0, 10).map(function(r) {
                    return '<span style="color:#8b949e;font-size:.5rem;cursor:pointer;text-decoration:underline;" onclick="LiveDict.lookupAndRender(\'' + r.replace(/'/g, "\\'") + '\')">' + r + '</span>';
                }).join(', ');
                html += '</div>';
            }
            // Datamuse: related words
            var rel = data.related;
            if (rel && rel.results && rel.results.length > 0) {
                html += '<div style="margin-top:4px;"><span style="color:#f472b6;font-size:.5625rem;font-weight:700;">Similar:</span> ';
                html += rel.results.slice(0, 10).map(function(r) {
                    return '<span style="color:#8b949e;font-size:.5rem;cursor:pointer;" onclick="LiveDict.lookupAndRender(\'' + r.word.replace(/'/g, "\\'") + '\')">' + r.word + '</span>';
                }).join(', ');
                html += '</div>';
            }
            // Datamuse: rhymes
            var rhy = data.rhymes;
            if (rhy && rhy.results && rhy.results.length > 0) {
                html += '<div style="margin-top:4px;"><span style="color:#fbbf24;font-size:.5625rem;font-weight:700;">Rhymes:</span> ';
                html += rhy.results.slice(0, 10).map(function(r) { return '<span style="color:#8b949e;font-size:.5rem;">' + r.word + '</span>'; }).join(', ');
                html += '</div>';
            }
            // Cache indicator
            var cached = (fd && fd._ts) ? 'cached ' + new Date(fd._ts).toLocaleTimeString() : 'live';
            html += '<div style="margin-top:6px;font-size:.5rem;color:#484f58;text-align:right;">Wiktionary + Datamuse + Free Dictionary | ' + cached + '</div>';
            html += '</div>';
            return html;
        }

        // Lookup and render to a target element
        function lookupAndRender(word, targetId) {
            targetId = targetId || 'capsule-livedict';
            var el = document.getElementById(targetId);
            if (el) el.innerHTML = '<div style="text-align:center;padding:12px;color:#484f58;font-size:.625rem;">Looking up "' + word + '"...</div>';
            return fullLookup(word).then(function(data) {
                if (el) el.innerHTML = renderEnrichment(data);
                return data;
            });
        }

        return {
            wiktionaryLookup: wiktionaryLookup,
            wiktionaryEtymology: wiktionaryEtymology,
            datamuseLookup: datamuseLookup,
            freeDictLookup: freeDictLookup,
            fullLookup: fullLookup,
            renderEnrichment: renderEnrichment,
            lookupAndRender: lookupAndRender,
            getCache: function() { return cache; },
            getCacheSize: function() { return Object.keys(cache).length; },
            clearCache: function() { cache = {}; saveCache(); },
        };
    })();

    // ══════════════════ STENOGRAPHY ENGINE ══════════════════
    // Universal concept compression codec. Language → concepts → symbols → frequency.
    // Sits between human and AI: reduces token cost, creates universal meaning layer.
    // Maps to fundamental patterns (vibration/frequency → meaning → context → results).
    // Concepts are atoms, not word chains. Symbols speak what words approximate.
    window.StenoEngine = (function() {
        'use strict';

        // ─── Concept Atoms: the periodic table of meaning ───
        // Each concept atom has: symbol, category, frequency (Hz mapped from rhythm),
        // valence (how many bonds it can form), charge (emotional polarity)
        var ATOMS = {
            // ── Entities (what exists) ──
            'Ξ':  { cat: 'entity',   name: 'self',       freq: 432.0,  valence: 4, charge: 0,   desc: 'the observer, I, consciousness' },
            'Ω':  { cat: 'entity',   name: 'other',      freq: 528.0,  valence: 4, charge: 0,   desc: 'another being, you, they' },
            'Θ':  { cat: 'entity',   name: 'place',      freq: 396.0,  valence: 3, charge: 0,   desc: 'location, space, where' },
            'Φ':  { cat: 'entity',   name: 'thing',      freq: 417.0,  valence: 2, charge: 0,   desc: 'object, item, matter' },
            'Ψ':  { cat: 'entity',   name: 'idea',       freq: 639.0,  valence: 6, charge: 0,   desc: 'thought, concept, abstraction' },
            'Σ':  { cat: 'entity',   name: 'group',      freq: 741.0,  valence: 8, charge: 0,   desc: 'collection, many, community' },
            'Λ':  { cat: 'entity',   name: 'system',     freq: 852.0,  valence: 10, charge: 0,  desc: 'structure, machine, organism' },

            // ── Actions (what happens) ──
            '→':  { cat: 'action',   name: 'move',       freq: 174.0,  valence: 2, charge: 0,   desc: 'go, travel, flow, change position' },
            '⊕':  { cat: 'action',   name: 'create',     freq: 285.0,  valence: 3, charge: 1,   desc: 'make, build, generate, birth' },
            '⊖':  { cat: 'action',   name: 'destroy',    freq: 963.0,  valence: 3, charge: -1,  desc: 'break, end, dissolve, death' },
            '⟲':  { cat: 'action',   name: 'transform',  freq: 528.0,  valence: 4, charge: 0,   desc: 'change, evolve, become' },
            '⊗':  { cat: 'action',   name: 'connect',    freq: 639.0,  valence: 2, charge: 1,   desc: 'link, bond, join, merge' },
            '⊘':  { cat: 'action',   name: 'separate',   freq: 741.0,  valence: 2, charge: -1,  desc: 'split, divide, cut, isolate' },
            '◎':  { cat: 'action',   name: 'observe',    freq: 852.0,  valence: 2, charge: 0,   desc: 'see, measure, know, sense' },
            '⊞':  { cat: 'action',   name: 'give',       freq: 396.0,  valence: 3, charge: 1,   desc: 'share, provide, emit' },
            '⊟':  { cat: 'action',   name: 'take',       freq: 417.0,  valence: 3, charge: -1,  desc: 'receive, absorb, consume' },

            // ── Qualities (what describes) ──
            '△':  { cat: 'quality',  name: 'large',      freq: 174.0,  valence: 1, charge: 0,   desc: 'big, much, many, intense' },
            '▽':  { cat: 'quality',  name: 'small',      freq: 963.0,  valence: 1, charge: 0,   desc: 'little, few, subtle, faint' },
            '⚡':  { cat: 'quality',  name: 'fast',       freq: 285.0,  valence: 1, charge: 1,   desc: 'quick, rapid, instant, urgent' },
            '◇':  { cat: 'quality',  name: 'slow',       freq: 396.0,  valence: 1, charge: -1,  desc: 'gradual, patient, steady' },
            '★':  { cat: 'quality',  name: 'good',       freq: 528.0,  valence: 1, charge: 1,   desc: 'positive, beneficial, beautiful' },
            '☆':  { cat: 'quality',  name: 'bad',        freq: 417.0,  valence: 1, charge: -1,  desc: 'negative, harmful, ugly' },
            '●':  { cat: 'quality',  name: 'true',       freq: 639.0,  valence: 1, charge: 1,   desc: 'real, certain, verified, fact' },
            '○':  { cat: 'quality',  name: 'false',      freq: 741.0,  valence: 1, charge: -1,  desc: 'unreal, uncertain, lie, fiction' },
            '◆':  { cat: 'quality',  name: 'new',        freq: 852.0,  valence: 1, charge: 1,   desc: 'fresh, young, novel, recent' },
            '◁':  { cat: 'quality',  name: 'old',        freq: 963.0,  valence: 1, charge: 0,   desc: 'ancient, aged, worn, historic' },

            // ── Relations (how things connect) ──
            '∵':  { cat: 'relation', name: 'cause',      freq: 174.0,  valence: 2, charge: 0,   desc: 'because, reason, source, why' },
            '∴':  { cat: 'relation', name: 'effect',     freq: 285.0,  valence: 2, charge: 0,   desc: 'therefore, result, consequence' },
            '≈':  { cat: 'relation', name: 'similar',    freq: 396.0,  valence: 2, charge: 0,   desc: 'like, resembles, analogous' },
            '≠':  { cat: 'relation', name: 'different',  freq: 417.0,  valence: 2, charge: 0,   desc: 'unlike, opposite, contrast' },
            '⊂':  { cat: 'relation', name: 'part-of',    freq: 528.0,  valence: 2, charge: 0,   desc: 'inside, belongs to, subset' },
            '⊃':  { cat: 'relation', name: 'contains',   freq: 639.0,  valence: 2, charge: 0,   desc: 'holds, includes, encompasses' },
            '∝':  { cat: 'relation', name: 'proportion', freq: 741.0,  valence: 2, charge: 0,   desc: 'scales with, ratio, relative to' },

            // ── Temporal (when) ──
            '◀':  { cat: 'temporal', name: 'past',       freq: 174.0,  valence: 1, charge: 0,   desc: 'before, was, history, memory' },
            '▶':  { cat: 'temporal', name: 'future',     freq: 852.0,  valence: 1, charge: 0,   desc: 'after, will, prediction, plan' },
            '◈':  { cat: 'temporal', name: 'now',        freq: 528.0,  valence: 1, charge: 0,   desc: 'present, current, this moment' },
            '∞':  { cat: 'temporal', name: 'always',     freq: 963.0,  valence: 1, charge: 0,   desc: 'forever, eternal, constant' },
            '∅':  { cat: 'temporal', name: 'never',      freq: 396.0,  valence: 1, charge: -1,  desc: 'none, void, absence, zero' },

            // ── Spatial (where/how arranged) ──
            '↑':  { cat: 'spatial',  name: 'up',         freq: 285.0,  valence: 1, charge: 1,   desc: 'above, rise, ascend, grow' },
            '↓':  { cat: 'spatial',  name: 'down',       freq: 417.0,  valence: 1, charge: -1,  desc: 'below, fall, descend, shrink' },
            '⊙':  { cat: 'spatial',  name: 'center',     freq: 528.0,  valence: 1, charge: 0,   desc: 'middle, core, focus, origin' },
            '⊛':  { cat: 'spatial',  name: 'everywhere', freq: 639.0,  valence: 1, charge: 0,   desc: 'all around, distributed, field' },

            // ── Emotional (the felt dimension) ──
            '♡':  { cat: 'emotion',  name: 'love',       freq: 528.0,  valence: 4, charge: 2,   desc: 'love, care, bond, warmth, compassion' },
            '♢':  { cat: 'emotion',  name: 'fear',       freq: 396.0,  valence: 2, charge: -2,  desc: 'fear, anxiety, dread, caution' },
            '♤':  { cat: 'emotion',  name: 'power',      freq: 741.0,  valence: 3, charge: 1,   desc: 'strength, will, determination, agency' },
            '♧':  { cat: 'emotion',  name: 'wonder',     freq: 852.0,  valence: 3, charge: 1,   desc: 'awe, curiosity, mystery, discovery' },
            '⚘':  { cat: 'emotion',  name: 'peace',      freq: 432.0,  valence: 2, charge: 1,   desc: 'calm, harmony, balance, rest' },
            '⚔':  { cat: 'emotion',  name: 'conflict',   freq: 963.0,  valence: 3, charge: -1,  desc: 'struggle, tension, fight, challenge' },

            // ── Abstract (the unseen) ──
            '⊿':  { cat: 'abstract', name: 'truth',      freq: 432.0,  valence: 2, charge: 1,   desc: 'reality, fact, authentic, genuine' },
            '⊾':  { cat: 'abstract', name: 'value',      freq: 528.0,  valence: 3, charge: 0,   desc: 'worth, price, exchange, economy' },
            '⟁':  { cat: 'abstract', name: 'pattern',    freq: 639.0,  valence: 4, charge: 0,   desc: 'rhythm, structure, fractal, DNA' },
            '⟐':  { cat: 'abstract', name: 'wave',       freq: 741.0,  valence: 2, charge: 0,   desc: 'vibration, frequency, oscillation, signal' },
            '⟡':  { cat: 'abstract', name: 'quantum',    freq: 852.0,  valence: 6, charge: 0,   desc: 'superposition, entanglement, probability' },
            '⟢':  { cat: 'abstract', name: 'life',       freq: 963.0,  valence: 5, charge: 1,   desc: 'living, organic, growth, evolution, spirit' },
        };

        // ═══════════════════════════════════════════════════════════════
        //  PERIODIC TABLE OF ELEMENTS — real quantum numbers + prefix mapping
        // ═══════════════════════════════════════════════════════════════
        // Each element carries: atomic number (Z), symbol, name, mass,
        // electron config, quantum numbers of outer electron (n, l, ml, ms),
        // ground-state spectral line (nm), group/period, and the KEY BRIDGE:
        // a mapping from real quantum numbers to prefix symbols + gates.
        //
        // The hypothesis: if the 11-symbol prefix system truly maps to
        // quantum gates, then code patterns classified by those prefixes
        // should show statistical correlations with physical atomic properties
        // that share the same quantum number structure.
        var PERIODIC_TABLE = [
            // ── Period 1 ──
            { Z:1,  sym:'H',  name:'hydrogen',  mass:1.008,   config:'1s1',          n:1,l:0,ml:0,ms:0.5,   line:656.3,  group:1,  period:1, cat:'nonmetal',     spin:'1/2',   orbital:'s' },
            { Z:2,  sym:'He', name:'helium',     mass:4.003,   config:'1s2',          n:1,l:0,ml:0,ms:-0.5,  line:587.6,  group:18, period:1, cat:'noble',        spin:'0',     orbital:'s' },
            // ── Period 2 ──
            { Z:3,  sym:'Li', name:'lithium',    mass:6.941,   config:'[He]2s1',      n:2,l:0,ml:0,ms:0.5,   line:670.8,  group:1,  period:2, cat:'alkali',       spin:'1/2',   orbital:'s' },
            { Z:4,  sym:'Be', name:'beryllium',  mass:9.012,   config:'[He]2s2',      n:2,l:0,ml:0,ms:-0.5,  line:234.9,  group:2,  period:2, cat:'alkaline',     spin:'0',     orbital:'s' },
            { Z:5,  sym:'B',  name:'boron',      mass:10.81,   config:'[He]2s2 2p1',  n:2,l:1,ml:-1,ms:0.5,  line:249.7,  group:13, period:2, cat:'metalloid',    spin:'1/2',   orbital:'p' },
            { Z:6,  sym:'C',  name:'carbon',     mass:12.01,   config:'[He]2s2 2p2',  n:2,l:1,ml:0,ms:0.5,   line:247.9,  group:14, period:2, cat:'nonmetal',     spin:'0',     orbital:'p' },
            { Z:7,  sym:'N',  name:'nitrogen',   mass:14.01,   config:'[He]2s2 2p3',  n:2,l:1,ml:1,ms:0.5,   line:746.8,  group:15, period:2, cat:'nonmetal',     spin:'3/2',   orbital:'p' },
            { Z:8,  sym:'O',  name:'oxygen',     mass:16.00,   config:'[He]2s2 2p4',  n:2,l:1,ml:-1,ms:-0.5, line:777.4,  group:16, period:2, cat:'nonmetal',     spin:'2',     orbital:'p' },
            { Z:9,  sym:'F',  name:'fluorine',   mass:19.00,   config:'[He]2s2 2p5',  n:2,l:1,ml:0,ms:-0.5,  line:685.6,  group:17, period:2, cat:'halogen',      spin:'3/2',   orbital:'p' },
            { Z:10, sym:'Ne', name:'neon',        mass:20.18,   config:'[He]2s2 2p6',  n:2,l:1,ml:1,ms:-0.5,  line:640.2,  group:18, period:2, cat:'noble',        spin:'0',     orbital:'p' },
            // ── Period 3 ──
            { Z:11, sym:'Na', name:'sodium',      mass:22.99,   config:'[Ne]3s1',      n:3,l:0,ml:0,ms:0.5,   line:589.0,  group:1,  period:3, cat:'alkali',       spin:'1/2',   orbital:'s' },
            { Z:12, sym:'Mg', name:'magnesium',   mass:24.31,   config:'[Ne]3s2',      n:3,l:0,ml:0,ms:-0.5,  line:285.2,  group:2,  period:3, cat:'alkaline',     spin:'0',     orbital:'s' },
            { Z:13, sym:'Al', name:'aluminum',    mass:26.98,   config:'[Ne]3s2 3p1',  n:3,l:1,ml:-1,ms:0.5,  line:396.2,  group:13, period:3, cat:'metal',        spin:'1/2',   orbital:'p' },
            { Z:14, sym:'Si', name:'silicon',     mass:28.09,   config:'[Ne]3s2 3p2',  n:3,l:1,ml:0,ms:0.5,   line:288.2,  group:14, period:3, cat:'metalloid',    spin:'0',     orbital:'p' },
            { Z:15, sym:'P',  name:'phosphorus',  mass:30.97,   config:'[Ne]3s2 3p3',  n:3,l:1,ml:1,ms:0.5,   line:253.6,  group:15, period:3, cat:'nonmetal',     spin:'3/2',   orbital:'p' },
            { Z:16, sym:'S',  name:'sulfur',      mass:32.07,   config:'[Ne]3s2 3p4',  n:3,l:1,ml:-1,ms:-0.5, line:921.3,  group:16, period:3, cat:'nonmetal',     spin:'2',     orbital:'p' },
            { Z:17, sym:'Cl', name:'chlorine',    mass:35.45,   config:'[Ne]3s2 3p5',  n:3,l:1,ml:0,ms:-0.5,  line:725.7,  group:17, period:3, cat:'halogen',      spin:'3/2',   orbital:'p' },
            { Z:18, sym:'Ar', name:'argon',        mass:39.95,   config:'[Ne]3s2 3p6',  n:3,l:1,ml:1,ms:-0.5,  line:811.5,  group:18, period:3, cat:'noble',        spin:'0',     orbital:'p' },
            // ── Period 4 (representative + Fe, Cu, Zn) ──
            { Z:19, sym:'K',  name:'potassium',   mass:39.10,   config:'[Ar]4s1',      n:4,l:0,ml:0,ms:0.5,   line:766.5,  group:1,  period:4, cat:'alkali',       spin:'1/2',   orbital:'s' },
            { Z:20, sym:'Ca', name:'calcium',     mass:40.08,   config:'[Ar]4s2',      n:4,l:0,ml:0,ms:-0.5,  line:422.7,  group:2,  period:4, cat:'alkaline',     spin:'0',     orbital:'s' },
            { Z:26, sym:'Fe', name:'iron',         mass:55.85,   config:'[Ar]3d6 4s2',  n:3,l:2,ml:0,ms:0.5,   line:371.9,  group:8,  period:4, cat:'transition',   spin:'4',     orbital:'d' },
            { Z:29, sym:'Cu', name:'copper',       mass:63.55,   config:'[Ar]3d10 4s1', n:3,l:2,ml:2,ms:-0.5,  line:324.8,  group:11, period:4, cat:'transition',   spin:'1/2',   orbital:'d' },
            { Z:30, sym:'Zn', name:'zinc',         mass:65.38,   config:'[Ar]3d10 4s2', n:4,l:0,ml:0,ms:-0.5,  line:213.9,  group:12, period:4, cat:'transition',   spin:'0',     orbital:'d' },
            { Z:35, sym:'Br', name:'bromine',      mass:79.90,   config:'[Ar]3d10 4s2 4p5', n:4,l:1,ml:0,ms:-0.5, line:827.2, group:17, period:4, cat:'halogen',    spin:'3/2',   orbital:'p' },
            // ── Heavy / notable ──
            { Z:47, sym:'Ag', name:'silver',       mass:107.87,  config:'[Kr]4d10 5s1', n:4,l:2,ml:2,ms:-0.5,  line:328.1,  group:11, period:5, cat:'transition',   spin:'1/2',   orbital:'d' },
            { Z:79, sym:'Au', name:'gold',         mass:196.97,  config:'[Xe]4f14 5d10 6s1', n:6,l:0,ml:0,ms:0.5, line:267.6, group:11, period:6, cat:'transition', spin:'1/2',   orbital:'s' },
            { Z:92, sym:'U',  name:'uranium',      mass:238.03,  config:'[Rn]5f3 6d1 7s2', n:5,l:3,ml:0,ms:0.5, line:385.9,  group:3,  period:7, cat:'actinide',    spin:'9/2',   orbital:'f' },
        ];

        // ─── Quantum Number → Prefix Symbol Bridge ───
        // Maps real atomic quantum numbers to the 11-symbol prefix system.
        // l (angular momentum): s=0 → class(+0), p=1 → function(0), d=2 → condition(+n), f=3 → loop(+2)
        // ms (spin): +1/2 → comment(+1), -1/2 → error(-1)
        // ml: maps to spatial prefixes
        // n (principal): maps to scale — entry(n) for n=1, import(-n) for n>4
        var QUANTUM_PREFIX_MAP = {
            orbital: { 's': '+0:', 'p': '0:', 'd': '+n:', 'f': '+2:' },
            spin:    { '0.5': '+1:', '-0.5': '-1:', '0': '   ' },
            shell:   { 1: 'n:', 2: '1:', 3: '-0:', 4: '+3:', 5: '-n:', 6: '-n:', 7: '-n:' },
        };

        // Map element → its prefix signature (orbital + spin + shell)
        function elementToPrefix(element) {
            var orb = QUANTUM_PREFIX_MAP.orbital[element.orbital] || '   ';
            var spn = QUANTUM_PREFIX_MAP.spin[String(element.ms)] || '   ';
            var shl = QUANTUM_PREFIX_MAP.shell[element.n] || '   ';
            return { orbital: orb, spin: spn, shell: shl, combined: orb + '|' + spn + '|' + shl };
        }

        // ─── Quantum Gate Bridge ───
        // Maps prefix symbols to quantum gates, then finds which REAL elements
        // share the same gate assignment. This is the cross-reference.
        var PREFIX_TO_GATE = {'+1':'H','1':'CNOT','-1':'X','+0':'Rz','0':'I','-0':'S','+n':'T','n':'SWAP','-n':'M','+2':'CZ','+3':'Y'};

        function elementToGates(element) {
            var p = elementToPrefix(element);
            return {
                orbitalGate: PREFIX_TO_GATE[p.orbital.replace(':','')] || 'I',
                spinGate:    PREFIX_TO_GATE[p.spin.replace(':','')] || 'I',
                shellGate:   PREFIX_TO_GATE[p.shell.replace(':','')] || 'I',
            };
        }

        // ─── Physics↔Code Pattern Matcher ───
        // Given a code block's prefix distribution, find which chemical elements
        // have matching quantum signatures. Returns correlation scores.
        function matchPhysics(prefixCounts) {
            // prefixCounts = { '+1': 5, '0': 12, '-1': 3, ... } from QuantumPrefixes.prefixMetadata
            if (!prefixCounts || typeof prefixCounts !== 'object') return [];
            var total = Object.values(prefixCounts).reduce(function(a, b) { return a + b; }, 0);
            if (total === 0) return [];

            // Normalize to distribution
            var dist = {};
            Object.entries(prefixCounts).forEach(function(e) { dist[e[0]] = e[1] / total; });

            // Score each element: how well does its quantum signature match the code's prefix distribution?
            return PERIODIC_TABLE.map(function(el) {
                var prefix = elementToPrefix(el);
                var gates = elementToGates(el);
                var score = 0;
                var matches = [];

                // Orbital match: does the code have high usage of the element's orbital prefix?
                var orbKey = prefix.orbital.replace(':','').trim();
                if (orbKey && dist[orbKey]) {
                    score += dist[orbKey] * 40;  // weight: 40%
                    matches.push('orbital(' + el.orbital + ')=' + orbKey);
                }
                // Spin match
                var spnKey = prefix.spin.replace(':','').trim();
                if (spnKey && dist[spnKey]) {
                    score += dist[spnKey] * 30;  // weight: 30%
                    matches.push('spin(' + el.ms + ')=' + spnKey);
                }
                // Shell match
                var shlKey = prefix.shell.replace(':','').trim();
                if (shlKey && dist[shlKey]) {
                    score += dist[shlKey] * 20;  // weight: 20%
                    matches.push('shell(n=' + el.n + ')=' + shlKey);
                }
                // Frequency resonance: does the element's spectral line relate to Solfeggio?
                var nearest = SOLFEGGIO.reduce(function(best, sf) {
                    return Math.abs(el.line - sf) < Math.abs(el.line - best) ? sf : best;
                }, SOLFEGGIO[0]);
                var freqDelta = Math.abs(el.line - nearest) / nearest;
                if (freqDelta < 0.3) {
                    score += (1 - freqDelta) * 10;
                    matches.push('freq(' + el.line + 'nm~' + nearest + 'Hz)');
                }

                return {
                    Z: el.Z, sym: el.sym, name: el.name, mass: el.mass,
                    orbital: el.orbital, n: el.n, l: el.l, ms: el.ms,
                    config: el.config, line: el.line,
                    prefixSig: prefix.combined,
                    gates: gates,
                    score: Math.round(score * 100) / 100,
                    matches: matches,
                };
            }).filter(function(r) { return r.score > 0; })
              .sort(function(a, b) { return b.score - a.score; });
        }

        // ─── Lookup by atomic number, symbol, or name ───
        function getElement(query) {
            var q = String(query).toLowerCase();
            return PERIODIC_TABLE.find(function(el) {
                return el.Z === Number(query) || el.sym.toLowerCase() === q || el.name === q;
            }) || null;
        }

        // ─── All elements with prefix signatures ───
        function allElementsWithPrefixes() {
            return PERIODIC_TABLE.map(function(el) {
                return Object.assign({}, el, {
                    prefix: elementToPrefix(el),
                    gates: elementToGates(el),
                });
            });
        }

        // ─── Concept Lexicon: maps natural language words to concept atoms ───
        // Each word maps to one or more atoms with weights
        var LEXICON = {};
        // Build from keyword → atom mappings
        var WORD_MAP = {
            // Entities
            'i':['Ξ'],'me':['Ξ'],'my':['Ξ'],'self':['Ξ'],'myself':['Ξ'],
            'you':['Ω'],'your':['Ω'],'they':['Ω'],'them':['Ω'],'he':['Ω'],'she':['Ω'],'we':['Σ','Ξ'],
            'place':['Θ'],'where':['Θ'],'here':['Θ','◈'],'there':['Θ'],'home':['Θ','♡'],'world':['Θ','△'],
            'thing':['Φ'],'object':['Φ'],'item':['Φ'],'stuff':['Φ'],
            'idea':['Ψ'],'thought':['Ψ'],'concept':['Ψ'],'theory':['Ψ'],'mind':['Ψ','Ξ'],
            'people':['Σ'],'group':['Σ'],'team':['Σ'],'community':['Σ'],'family':['Σ','♡'],
            'system':['Λ'],'machine':['Λ'],'computer':['Λ'],'network':['Λ'],'body':['Λ','Ξ'],
            // Actions
            'go':['→'],'move':['→'],'run':['→','⚡'],'walk':['→','◇'],'travel':['→','Θ'],'flow':['→','⟐'],
            'make':['⊕'],'create':['⊕'],'build':['⊕'],'write':['⊕'],'design':['⊕','Ψ'],'code':['⊕','Λ'],
            'break':['⊖'],'destroy':['⊖'],'end':['⊖'],'stop':['⊖'],'die':['⊖','⟢'],
            'change':['⟲'],'become':['⟲'],'evolve':['⟲','⟢'],'grow':['⟲','↑'],'learn':['⟲','Ψ'],
            'connect':['⊗'],'join':['⊗'],'link':['⊗'],'merge':['⊗'],'bond':['⊗','♡'],
            'split':['⊘'],'divide':['⊘'],'cut':['⊘'],'separate':['⊘'],
            'see':['◎'],'look':['◎'],'watch':['◎'],'observe':['◎'],'know':['◎','Ψ'],'understand':['◎','Ψ','△'],
            'give':['⊞'],'share':['⊞','Σ'],'send':['⊞','→'],'help':['⊞','★'],
            'take':['⊟'],'get':['⊟'],'receive':['⊟'],'buy':['⊟','⊾'],
            // Qualities
            'big':['△'],'large':['△'],'huge':['△','△'],'much':['△'],'many':['△'],
            'small':['▽'],'little':['▽'],'tiny':['▽','▽'],'few':['▽'],
            'fast':['⚡'],'quick':['⚡'],'rapid':['⚡'],'instant':['⚡','◈'],
            'slow':['◇'],'gradual':['◇'],'patient':['◇','⚘'],
            'good':['★'],'great':['★','△'],'best':['★','★'],'beautiful':['★','♧'],
            'bad':['☆'],'terrible':['☆','△'],'worst':['☆','☆'],'ugly':['☆'],
            'true':['●'],'real':['●'],'fact':['●'],'yes':['●'],
            'false':['○'],'fake':['○'],'lie':['○'],'no':['○'],
            'new':['◆'],'fresh':['◆'],'novel':['◆'],'young':['◆','⟢'],
            'old':['◁'],'ancient':['◁','◁'],'historic':['◁','Θ'],
            // Relations
            'because':['∵'],'reason':['∵'],'cause':['∵'],'why':['∵'],
            'therefore':['∴'],'result':['∴'],'effect':['∴'],'consequence':['∴'],
            'like':['≈'],'similar':['≈'],'same':['≈'],'as':['≈'],
            'different':['≠'],'unlike':['≠'],'opposite':['≠'],'but':['≠'],
            'in':['⊂'],'inside':['⊂'],'within':['⊂'],'part':['⊂'],
            'contains':['⊃'],'has':['⊃'],'includes':['⊃'],'holds':['⊃'],
            // Temporal
            'was':['◀'],'past':['◀'],'before':['◀'],'ago':['◀'],'history':['◀','Θ'],
            'will':['▶'],'future':['▶'],'after':['▶'],'tomorrow':['▶'],'plan':['▶','Ψ'],
            'now':['◈'],'today':['◈'],'current':['◈'],'present':['◈'],
            'always':['∞'],'forever':['∞'],'eternal':['∞'],
            'never':['∅'],'none':['∅'],'nothing':['∅'],'zero':['∅'],
            // Spatial
            'up':['↑'],'above':['↑'],'rise':['↑'],'high':['↑'],
            'down':['↓'],'below':['↓'],'fall':['↓'],'low':['↓'],
            'center':['⊙'],'middle':['⊙'],'core':['⊙'],'focus':['⊙'],
            'everywhere':['⊛'],'all':['⊛'],'around':['⊛'],
            // Emotions
            'love':['♡'],'care':['♡'],'kind':['♡','★'],'warm':['♡'],
            'fear':['♢'],'afraid':['♢'],'scared':['♢'],'anxiety':['♢'],
            'strong':['♤'],'power':['♤'],'force':['♤'],'will':['♤'],
            'wonder':['♧'],'curious':['♧'],'discover':['♧','◎'],'amazing':['♧','△'],
            'peace':['⚘'],'calm':['⚘'],'balance':['⚘'],'rest':['⚘'],
            'fight':['⚔'],'struggle':['⚔'],'war':['⚔','△'],'conflict':['⚔'],
            // Abstract
            'truth':['⊿'],'honest':['⊿'],'authentic':['⊿'],
            'money':['⊾'],'price':['⊾'],'cost':['⊾'],'value':['⊾'],'economy':['⊾','Λ'],'debt':['⊾','☆'],
            'pattern':['⟁'],'rhythm':['⟁','⟐'],'structure':['⟁','Λ'],'dna':['⟁','⟢'],
            'wave':['⟐'],'frequency':['⟐'],'vibration':['⟐'],'signal':['⟐'],'sound':['⟐'],
            'quantum':['⟡'],'superposition':['⟡'],'entangle':['⟡','⊗'],
            'life':['⟢'],'alive':['⟢'],'living':['⟢'],'nature':['⟢','Θ'],'spirit':['⟢','Ψ'],
            // Chemistry / physics / periodic table
            'atom':['Φ','⟡','▽'],'molecule':['Φ','⊗','⟁'],'element':['Φ','⊿'],
            'proton':['Φ','♤','+'],'neutron':['Φ','⚘','0'],'electron':['Φ','⚡','-'],
            'orbital':['⟁','⟐','⊙'],'shell':['⊃','⟁'],'subshell':['⊂','⟁'],
            'spin':['⟐','⟡'],'charge':['♤','⟐'],'mass':['Φ','△'],
            'bond':['⊗','♡'],'ionic':['⊗','♤'],'covalent':['⊗','≈'],'metallic':['⊗','△'],
            'nucleus':['⊙','♤','▽'],'ion':['Φ','♤'],'isotope':['Φ','≈','≠'],
            'hydrogen':['Φ','▽','⟢'],'helium':['Φ','⚘'],'carbon':['Φ','⟢','⊗'],
            'oxygen':['Φ','⟢','⊞'],'nitrogen':['Φ','⟢'],'iron':['Φ','♤','◁'],
            'gold':['Φ','⊾','★'],'silver':['Φ','⊾'],'copper':['Φ','⊗'],
            'uranium':['Φ','♤','△','♢'],'silicon':['Φ','Λ'],
            'photon':['⟐','⚡','▽'],'wavelength':['⟐','△'],'spectrum':['⟐','⟁','◎'],
            'emission':['⊞','⟐'],'absorption':['⊟','⟐'],
            'fission':['⊘','♤','△'],'fusion':['⊗','♤','△','★'],
            'halflife':['◈','⊖','∝'],'decay':['⊖','◇','⟐'],
            'valence':['⊗','⟡'],'electronegativity':['⊟','♤'],
            // Solfeggio / music / chant
            'frequency':['⟐'],'vibration':['⟐'],'resonance':['⟐','⟁'],'harmonic':['⟐','⟁'],
            'octave':['⟐','∝'],'overtone':['⟐','↑'],'fundamental':['⟐','⊙'],
            'chant':['⟐','⚘','◁'],'mantra':['⟐','∞','⚘'],'om':['⟐','⊙','∞'],
            'tone':['⟐'],'pitch':['⟐','↑'],'melody':['⟐','→','⟁'],
            'cymatics':['⟐','◎','⟁'],'singing':['⟐','⟢','♡'],'tuning':['⟐','≈'],
            'healing':['⟲','★','⟢'],'sacred':['⊿','∞','♧'],
            'do':['⟐'],'re':['⟐'],'mi':['⟐'],'fa':['⟐'],'sol':['⟐'],'la':['⟐'],'si':['⟐'],
            // Vocal techniques
            'soprano':['⟐','↑','⟢'],'alto':['⟐','→','⟢'],'tenor':['⟐','⟢','♤'],
            'baritone':['⟐','↓','♤'],'bass':['⟐','↓','⊙'],'whistle':['⟐','↑','↑','△'],
            'falsetto':['⟐','↑','◇'],'belting':['⟐','⚔','↑'],'vibrato':['⟐','≈','⟁'],
            'growl':['⟐','⊖','⚔'],'scream':['⟐','⚔','↑','⊖'],'howl':['⟐','↑','→','◇'],
            'fry':['⟐','↓','◇'],'goblin':['⟐','◇','⊖'],'inward':['⟐','←','◇'],
            'tuvan':['⟐','∞','⟁','↑'],'khoomei':['⟐','∞','⟁'],'sygyt':['⟐','↑','∞'],
            'kargyraa':['⟐','↓','∞','⊙'],'overtone':['⟐','↑','⟁','∞'],
            'melisma':['⟐','→','↑','↓'],'yodel':['⟐','↑','↓','↑'],'beatbox':['⟐','Ξ','♤'],
            'scat':['⟐','→','◇','⟢'],'sprechstimme':['⟐','→','◇'],
            'gregorian':['⟐','⚘','∞','◁'],'plainchant':['⟐','⚘','→'],
            'kirtan':['⟐','⟢','⚘','∞'],'dhikr':['⟐','⚘','∞','⟲'],
            'mantra':['⟐','∞','⚘'],'psalm':['⟐','⚘','◁','♧'],
            'didgeridoo':['⟐','∞','↓','⊙'],'icaros':['⟐','⟲','⚘','★'],
            // Animal acoustics
            'echolocation':['⟐','→','←','◎'],'whale':['⟐','↓','→','∞'],
            'dolphin':['⟐','→','↑','◎'],'birdsong':['⟐','↑','→','⟢'],
            'stridulation':['⟐','→','←'],'infrasound':['⟐','↓','↓','→'],
            'ultrasonic':['⟐','↑','↑','→'],'sonar':['⟐','→','←','◎'],
            'howler':['⟐','↑','→','⊙'],'syrinx':['⟐','⟁','↑'],
            // Cosmic / planetary sounds
            'pulsar':['⟐','⟲','→','◎'],'magnetar':['⟐','⚔','⟲','△'],
            'gravitational':['◎','↓','≈'],'nebula':['◇','∞','◎'],
            'quasar':['⟐','→','△','⊙'],'schumann':['⟐','◎','⊙'],
            // Plant / bio signals
            'mycorrhizal':['⟲','→','⟢','⊙'],'phytoacoustic':['⟐','⟢','◇'],
            'photosynthesis':['⊙','⟲','⟢'],'stomata':['◇','⟲'],
            'cavitation':['⟐','⊖','→'],'allelopathy':['→','⟲','◇'],
            // Brain / neural / BCI
            'neuron':['◎','→','⟁'],'synapse':['→','◎','≈'],'spike':['↑','◎','→'],
            'cortical':['◎','⟁','→'],'organoid':['◎','⟢','⟲'],
            'neuralink':['◎','→','⊙','△'],'electrode':['→','◎','⟐'],
            'bci':['◎','→','⊙'],'eeg':['◎','⟐','≈'],'optogenetics':['⊙','◎','→'],
            'plasticity':['◎','⟲','≈'],'connectome':['◎','→','→','⟁'],
            'dishbrain':['◎','⟢','⟲','Ξ'],'biocomputing':['◎','⟢','⊙','→'],
            // Baseball
            'pitcher':['Ξ','♤','⊙'],'catcher':['Ξ','◎','⊙'],'batter':['Ξ','⚔','♤'],
            'strikeout':['⊖','♤'],'walk':['→','◇'],'homerun':['→','↑','△','♧'],
            'steal':['→','⚡','♢'],'error':['☆','○'],'score':['⊾','★'],
            'inning':['◈','⟁'],'game':['Λ','⚔','⟁'],
            // Compliance / regulatory
            'hipaa':['⊙','⛊','◎'],'compliance':['⊙','⛊','→'],'audit':['⊙','⟁','→'],
            'encryption':['⊙','⟲','→'],'authentication':['⊙','◎','→'],
            'authorization':['⊙','→','◎'],'breach':['☆','⊖','→'],
            'phi':['⊙','◎','⛊'],'pii':['⊙','◎'],'baa':['⊙','⛊','→'],
            'fhir':['→','◎','⟁'],'hl7':['→','◎','⟁'],'uscdi':['→','◎','⊙'],
            'epic':['→','◎','⊙','⟁'],'cerner':['→','◎','⊙'],
            'openssf':['⊙','⟲','→','◎'],'scorecard':['⊙','⟁','→'],
            'sbom':['⊙','⟁','→','◎'],'spdx':['⊙','⟁','→'],
            'cyclonedx':['⊙','⟁','⟲'],'provenance':['⊙','→','◎','⟁'],
            'sigstore':['⊙','⟲','→'],'cosign':['⊙','⟲','→','◎'],
            'cve':['☆','⊖','→'],'vulnerability':['☆','⊖','→','⟁'],
            'cmmi':['⊙','⟁','→'],'maturity':['⊙','→','⟁'],
            'soc2':['⊙','⛊','→','◎'],'fedramp':['⊙','⛊','→','△'],
            'iso27001':['⊙','⛊','→','⟁'],'nist':['⊙','⛊','→'],
            'osint':['→','⟁','◎'],'geolocation':['◎','→','↓'],
            'bellingcat':['→','⟁','◎','⟢'],'maltego':['→','⟁','◎'],
            'shodan':['→','⟁','◎','⊙'],'kubernetes':['⟲','→','◎','⟁'],
            'cncf':['⟲','→','⟁'],'oci':['⟲','→'],
            'gdpr':['⊙','⛊','→','◎'],'ccpa':['⊙','⛊','→'],
            'consent':['⊙','◎','→'],'retention':['⊙','→','⟁'],
            'incident':['☆','⊖','→','⊙'],'forensics':['→','⟁','◎','⊙'],
            'penetration':['→','⊖','⟁'],'remediation':['→','⊙','⟁'],
            // ─── Project Portfolio Domains ───
            'ceramics':['◎','⟢','⟁'],'kiln':['◎','⟢','↓'],'glaze':['◎','↓','⟢'],
            'porcelain':['◎','⟢','⟁'],'stoneware':['◎','⟢','↓'],'raku':['◎','☆','⟢'],
            'rubiks':['⟲','⟁','◎'],'speedcubing':['⟲','◎','→'],'cfop':['⟲','→','⟁'],
            'scramble':['⟲','⟁','◎'],'permutation':['⟲','→','⟁'],'solver':['⟲','→','◎'],
            'fashion':['◎','⟢','⟁'],'wardrobe':['◎','⟢','→'],'silhouette':['◎','↓','⟢'],
            'capsule-wardrobe':['◎','⟢','→','⟁'],'styling':['◎','⟢','↓'],
            'lidar':['→','◎','⟁'],'truedepth':['→','◎','⟁'],'nerf':['→','◎','⟁','⟢'],
            'holographic':['◎','⟢','☆'],'slit-scan':['◎','→','↓'],'face-mesh':['◎','→','⟁'],
            'nanosecond':['→','◎','⟁'],'biomaterials':['◎','⟢','⟁'],'fiber-optic':['→','◎','⟁'],
            'manufacturing':['◎','⟢','→'],'supply-chain':['→','⟁','◎'],
            'mars':['⟢','◎','☆'],'colonization':['⟢','◎','→'],'orbital':['⟲','⟢','◎'],
            'starport':['⟢','◎','☆'],'eva':['⟢','◎','→'],'transfer-window':['⟲','→','◎'],
            'favicon':['◎','→','⟁'],'icns':['◎','→','⟁'],'svg':['◎','→','⟢'],
            'icon-generation':['◎','⟢','→'],'multi-format':['→','◎','⟁'],
            'shoe-design':['◎','⟢','⟁'],'fdm':['◎','→','⟁'],'sla':['◎','→','⟁'],
            'cnc':['◎','→','⟁'],'gait':['→','◎','⟁'],'tpu':['◎','⟁','→'],
            'stl':['◎','→','⟁'],'slicer':['◎','→','⟁'],'infill':['◎','→','⟁'],
            'triangle-count':['→','◎','⟁'],'print-cost':['→','◎','⟁'],
            'usdz':['◎','→','⟁'],'gltf':['◎','→','⟁'],'glb':['◎','→','⟁'],
            'gcode':['◎','→','⟁'],'electron':['→','◎','⟁'],'thumbnail':['◎','→','⟁'],
            'transcription':['→','◎','⟁'],'asl':['◎','→','⟢'],'shot-by-shot':['→','◎','⟁'],
            'subtitle':['→','◎','⟁'],'synchronized':['⟲','→','◎'],
            'timezone':['→','◎','⟁'],'svg-preprocessing':['→','◎','⟁'],
            'state-boundaries':['◎','→','⟁'],'real-time-clock':['→','◎','⟁'],
            'pinecone':['◎','⟢','☆'],'ascii-art':['◎','→','⟢'],'terminal-logo':['◎','→','⟢'],
            'dpi':['→','◎','⟁'],'ppi':['→','◎','⟁'],'pica':['◎','→','⟁'],
            'rem':['→','◎','⟁'],'typography-units':['◎','→','⟁'],
            'synthesizer':['◎','⟢','→'],'op1':['◎','⟢','→'],'fm-synthesis':['◎','⟢','→'],
            'tape-mode':['◎','→','⟢'],'drum-sampler':['◎','⟢','→'],
            'waveform-typography':['◎','⟢','→'],'embossed':['◎','⟢','↓'],
            'cmyk':['◎','→','⟁'],'halftone':['◎','→','⟁'],'phong':['◎','⟢','→'],
            'bezier':['◎','→','⟢'],'tessellation':['◎','→','⟁'],
            'botanical':['◎','⟢','⟁'],'alembic':['◎','⟢','→'],'cannabinoid':['◎','⟢','⟁'],
            'thc':['◎','⟢','→'],'cbd':['◎','⟢','→'],'distillation':['◎','→','⟢'],
            'celestial':['⟢','◎','☆'],'moon-phase':['⟲','◎','☆'],'planetary':['⟢','◎','☆'],
            'life-weeks':['→','◎','⟁'],'cosmic-perspective':['⟢','☆','◎'],
            'geohash':['→','◎','⟁'],'h3-hex':['→','◎','⟁'],'strudel':['◎','⟢','→'],
            'hydra':['◎','⟢','→'],'tidal':['◎','⟢','→'],'sonification':['◎','⟢','→'],
            'cocktail':['◎','⟢','→'],'mixology':['◎','⟢','→'],'mocktail':['◎','⟢','→'],
            'bartending':['◎','⟢','→'],'garnish':['◎','⟢','↓'],
            'polaroid':['◎','→','⟢'],'frame-blending':['◎','→','⟢'],
            'node-workflow':['→','⟁','◎'],'film-strip':['◎','→','⟢'],
            'oracle-bone':['◎','☆','⟢'],'vedic':['◎','☆','⟢'],'waveform-letters':['◎','⟢','→'],
            'font-creator':['◎','⟢','→'],'audio-reactive':['◎','⟢','→'],
            'rtsp':['→','◎','⟁'],'hls':['→','◎','⟁'],'dash':['→','◎','⟁'],
            'smpte':['→','◎','⟁'],'walkie-talkie':['◎','→','⟢'],
            'morse-code':['→','◎','⟁'],'mediapipe':['→','◎','⟁'],
        };
        Object.entries(WORD_MAP).forEach(function(e) { LEXICON[e[0]] = e[1]; });

        // ─── Frequency Table: Solfeggio + harmonics + vocal/cosmic/bio resonance ───
        var SOLFEGGIO = [174, 285, 396, 417, 432, 528, 639, 741, 852, 963];

        // Extended frequency registry: maps domains to their characteristic Hz
        var FREQ_REGISTRY = {
            // Core Solfeggio (ancient sacred)
            solfeggio: { 174:'foundation', 285:'cognition', 396:'Ut liberation', 417:'Re change', 432:'universal tuning', 528:'Mi DNA repair', 639:'Fa connection', 741:'Sol intuition', 852:'La spiritual', 963:'Si divine' },
            // Vocal registers (fundamental frequency ranges)
            vocal: { 82:'bass low E2', 110:'bass A2', 130:'baritone C3', 165:'tenor E3', 196:'tenor G3', 262:'tenor high C4', 330:'alto E4', 440:'soprano A4', 523:'soprano C5', 659:'soprano E5', 784:'soprano G5', 1047:'soprano C6', 1397:'whistle C#6', 2093:'whistle C7', 4186:'whistle C8' },
            // Throat singing / extended techniques
            throat: { 55:'Kargyraa subharmonic', 75:'vocal fry pulse', 110:'Khoomei fundamental', 165:'overtone H3', 220:'overtone H4', 330:'Sygyt harmonic', 440:'overtone H8', 550:'overtone H10', 660:'overtone H12', 880:'high harmonic H16' },
            // EEG brain waves
            brain: { 0.5:'delta deep sleep', 2:'delta', 4:'theta meditation', 6:'theta', 8:'alpha relaxed', 10:'alpha', 12:'alpha', 13:'SMR sensorimotor', 15:'beta', 20:'beta active', 30:'beta high', 40:'gamma binding', 80:'high gamma', 100:'ripple', 200:'fast ripple' },
            // Earth / planetary
            planetary: { 7.83:'Schumann 1st', 14.3:'Schumann 2nd', 20.8:'Schumann 3rd', 27.3:'Schumann 4th', 33.8:'Schumann 5th', 136.1:'Earth year OM', 141.27:'Mercury', 221.23:'Venus', 194.18:'Earth day', 144.72:'Mars', 183.58:'Jupiter', 147.85:'Saturn', 207.36:'Uranus', 211.44:'Neptune' },
            // Animal frequency ranges (fundamental)
            animal: { 14:'elephant infrasound', 25:'whale low', 50:'lion roar', 100:'dolphin click base', 300:'frog chorus', 500:'bird song low', 1000:'cricket', 2000:'bird song mid', 4000:'bird song high', 8000:'bat low', 20000:'bat mid', 50000:'bat high', 100000:'dolphin echolocation', 200000:'bat ultrasonic' },
            // Plant signals
            plant: { 0.01:'root oscillation', 0.1:'circadian', 1:'action potential', 50:'photosynthesis vibration proxy', 1000:'growth stimulation', 20000:'cavitation emission', 100000:'ultrasonic stress', 600000000000000:'chlorophyll 500nm THz' },
            // Cortical Labs / neural
            neural: { 1:'spike rate low', 5:'theta oscillation', 10:'alpha cortical', 40:'gamma cortical', 100:'high frequency oscillation', 200:'ripple hippocampal', 500:'multi-unit burst', 1000:'spike waveform ms', 30000:'MEA sampling rate' },
        };

        // ─── Encode text → concept stream ───
        function encode(text) {
            if (!text || text.length < 1) return { symbols: '', atoms: [], ratio: 1, freq: [] };
            var words = text.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/).filter(function(w) { return w.length > 0; });
            var atoms = [];
            var unmapped = [];
            words.forEach(function(w) {
                var mapped = LEXICON[w];
                if (mapped) {
                    mapped.forEach(function(sym) { atoms.push(sym); });
                } else {
                    // Try stemming: remove common suffixes
                    var stem = w.replace(/(ing|tion|ness|ment|able|ible|ous|ive|ful|less|ly|ed|er|est|s)$/, '');
                    var stemMapped = LEXICON[stem];
                    if (stemMapped) {
                        stemMapped.forEach(function(sym) { atoms.push(sym); });
                    } else {
                        unmapped.push(w);
                    }
                }
            });
            // Compression ratio: original chars vs encoded symbols
            var origLen = text.length;
            var encodedLen = atoms.length;
            var ratio = origLen > 0 ? Math.round(origLen / Math.max(encodedLen, 1) * 10) / 10 : 1;
            // Frequency stream: each atom's vibration
            var freqStream = atoms.map(function(sym) { return ATOMS[sym] ? ATOMS[sym].freq : 0; });
            return {
                symbols: atoms.join(''),
                atoms: atoms,
                ratio: ratio,
                compressionPct: Math.round((1 - encodedLen / Math.max(origLen, 1)) * 100),
                freq: freqStream,
                unmapped: unmapped,
                wordCount: words.length,
                atomCount: atoms.length,
            };
        }

        // ─── Decode concept stream → natural language ───
        function decode(symbolString) {
            var syms = Array.from(symbolString);
            var words = syms.map(function(s) {
                var atom = ATOMS[s];
                return atom ? atom.name : '?';
            });
            return words.join(' ');
        }

        // ─── Frequency analysis: find the resonant signature of text ───
        function frequencySignature(text) {
            var enc = encode(text);
            if (enc.freq.length === 0) return null;
            // Bucket into solfeggio bands
            var bands = {};
            SOLFEGGIO.forEach(function(f) { bands[f] = 0; });
            enc.freq.forEach(function(f) {
                // Find nearest solfeggio
                var nearest = SOLFEGGIO.reduce(function(best, sf) {
                    return Math.abs(sf - f) < Math.abs(best - f) ? sf : best;
                }, SOLFEGGIO[0]);
                bands[nearest]++;
            });
            // Dominant frequency
            var dominant = Object.entries(bands).sort(function(a,b) { return b[1] - a[1]; })[0];
            // Harmonic complexity: how many bands are active
            var activeBands = Object.values(bands).filter(function(v) { return v > 0; }).length;
            return {
                bands: bands,
                dominant: { freq: parseInt(dominant[0]), count: dominant[1] },
                activeBands: activeBands,
                harmonicComplexity: Math.round(activeBands / SOLFEGGIO.length * 100),
                totalAtoms: enc.atomCount,
            };
        }

        // ─── Cross-language concept bridge ───
        // Given a concept atom, find matching words across all capsules
        function findConceptAcrossLanguages(atomSymbol) {
            var atom = ATOMS[atomSymbol];
            if (!atom) return [];
            var results = [];
            // Search the lexicon in reverse: which words map to this atom?
            var wordsForAtom = Object.entries(LEXICON).filter(function(e) {
                return e[1].indexOf(atomSymbol) !== -1;
            }).map(function(e) { return e[0]; });
            // Match against capsule words
            if (typeof CAPSULES !== 'undefined') {
                CAPSULES.forEach(function(cap) {
                    var matches = cap.words.filter(function(w) {
                        return wordsForAtom.indexOf(w.toLowerCase()) !== -1;
                    });
                    if (matches.length > 0) {
                        results.push({ capsule: cap.id, name: cap.name, cat: cap.cat, flag: cap.flag, matches: matches });
                    }
                });
            }
            return { atom: atomSymbol, concept: atom.name, freq: atom.freq, languages: results, totalMatches: results.reduce(function(s,r) { return s + r.matches.length; }, 0) };
        }

        // ─── Concept density: how much meaning per character ───
        function conceptDensity(text) {
            var enc = encode(text);
            var charCount = text.length;
            var conceptCount = enc.atomCount;
            var uniqueConcepts = new Set(enc.atoms).size;
            return {
                density: Math.round(conceptCount / Math.max(charCount, 1) * 1000) / 10,
                uniqueness: Math.round(uniqueConcepts / Math.max(conceptCount, 1) * 100),
                richness: Math.round(uniqueConcepts / Math.max(text.split(/\s+/).length, 1) * 100),
                compression: enc.ratio,
                symbols: enc.symbols,
            };
        }

        // ─── Wire to CapsuleAnalyzer: enrich each word with concept atoms ───
        function enrichWord(word) {
            var lw = word.toLowerCase();
            var mapped = LEXICON[lw];
            if (!mapped) {
                var stem = lw.replace(/(ing|tion|ness|ment|able|ible|ous|ive|ful|less|ly|ed|er|est|s)$/, '');
                mapped = LEXICON[stem];
            }
            if (!mapped) return { word: word, atoms: [], symbols: '', freq: [], category: 'unmapped' };
            var freqs = mapped.map(function(sym) { return ATOMS[sym] ? ATOMS[sym].freq : 0; });
            var cats = mapped.map(function(sym) { return ATOMS[sym] ? ATOMS[sym].cat : ''; });
            var charge = mapped.reduce(function(s, sym) { return s + (ATOMS[sym] ? ATOMS[sym].charge : 0); }, 0);
            return {
                word: word,
                atoms: mapped,
                symbols: mapped.join(''),
                freq: freqs,
                categories: [...new Set(cats)],
                charge: charge,
                valenceSum: mapped.reduce(function(s, sym) { return s + (ATOMS[sym] ? ATOMS[sym].valence : 0); }, 0),
            };
        }

        // ─── Sentence-level concept compression ───
        function compressSentence(sentence) {
            var enc = encode(sentence);
            // Group consecutive same-atoms
            var compressed = [];
            var prev = null, count = 0;
            enc.atoms.forEach(function(a) {
                if (a === prev) { count++; }
                else {
                    if (prev) compressed.push(count > 1 ? prev + '\u00b2' : prev);
                    prev = a; count = 1;
                }
            });
            if (prev) compressed.push(count > 1 ? prev + '\u00b2' : prev);
            return {
                original: sentence,
                originalLength: sentence.length,
                encoded: enc.symbols,
                compressed: compressed.join(''),
                compressedLength: compressed.join('').length,
                ratio: Math.round(sentence.length / Math.max(compressed.join('').length, 1) * 10) / 10,
                savings: Math.round((1 - compressed.join('').length / sentence.length) * 100) + '%',
                atoms: enc.atoms,
                freq: enc.freq,
                unmapped: enc.unmapped,
            };
        }

        // ─── Neural pathway: concept flow graph ───
        function conceptFlow(text) {
            var enc = encode(text);
            var transitions = [];
            for (var i = 1; i < enc.atoms.length; i++) {
                var from = enc.atoms[i-1], to = enc.atoms[i];
                transitions.push({
                    from: from, to: to,
                    fromName: ATOMS[from] ? ATOMS[from].name : '?',
                    toName: ATOMS[to] ? ATOMS[to].name : '?',
                    freqShift: (ATOMS[to] ? ATOMS[to].freq : 0) - (ATOMS[from] ? ATOMS[from].freq : 0),
                    chargeShift: (ATOMS[to] ? ATOMS[to].charge : 0) - (ATOMS[from] ? ATOMS[from].charge : 0),
                });
            }
            // Find the dominant flow direction
            var upShifts = transitions.filter(function(t) { return t.freqShift > 0; }).length;
            var downShifts = transitions.filter(function(t) { return t.freqShift < 0; }).length;
            return {
                transitions: transitions,
                flowDirection: upShifts > downShifts ? 'ascending' : downShifts > upShifts ? 'descending' : 'balanced',
                totalShift: transitions.reduce(function(s,t) { return s + t.freqShift; }, 0),
                chargeFlow: transitions.reduce(function(s,t) { return s + t.chargeShift; }, 0),
                complexity: transitions.length,
            };
        }

        // ─── Multi-Alphabet Symbol Representations ───
        // Every concept atom gets Braille, Morse, ASL, BSL encodings
        function atomAlphabets(atomSymbol) {
            var atom = ATOMS[atomSymbol];
            if (!atom) return null;
            var name = atom.name;
            var Enc = typeof window !== 'undefined' ? window.Encoder : null;
            var result = { symbol: atomSymbol, name: name, cat: atom.cat, freq: atom.freq };
            if (Enc) {
                result.braille = Enc.toBraille(name);
                result.morse = Enc.toMorse(name);
                result.asl = name.toLowerCase().split('').filter(function(c) { return /[a-z]/.test(c); }).map(function(c) {
                    return { letter: c, sign: ({'a':'fist,thumb-side','b':'flat hand up','c':'curved hand','d':'index up,circle','e':'curled fingers','f':'OK sign inverted','g':'point sideways','h':'2 fingers side','i':'pinky up','j':'pinky+arc','k':'2 fingers+thumb','l':'L-shape','m':'3 over thumb','n':'2 over thumb','o':'fingertips touch','p':'K-inverted down','q':'G-down','r':'crossed fingers','s':'fist,thumb-front','t':'thumb through','u':'2 fingers up','v':'peace sign','w':'3 fingers up','x':'hooked index','y':'hang loose','z':'index draws Z'})[c] || '?' };
                });
                result.bsl = name.toLowerCase().split('').filter(function(c) { return /[a-z]/.test(c); }).map(function(c) {
                    return { letter: c, sign: ({'a':'flat palm out,thumb up','b':'flat palm out,4 fingers','c':'curved palm left','d':'index up,palm out','e':'palm out,fingers bent','f':'index+thumb circle,3 up','g':'point right,thumb across','h':'2 fingers point right','i':'pinky up,fist','j':'pinky arc forward','k':'index+middle up,thumb between','l':'L-shape,palm out','m':'3 fingertips down on thumb','n':'2 fingertips down on thumb','o':'fingertips circle,palm out','p':'index down,thumb out','q':'flat hand down,thumb out','r':'crossed index+middle','s':'fist,palm out','t':'thumb between index+middle','u':'2 fingers up,palm out','v':'peace sign,palm out','w':'3 fingers up,palm out','x':'hooked index,palm left','y':'thumb+pinky out,palm out','z':'index draws Z,palm out'})[c] || '?' };
                });
                // Keyboard flow of the concept name
                var flow = Enc.toKeyboardFlow(name);
                result.keyFlow = flow ? flow.arrows : '';
                result.flowPattern = flow ? flow.pattern : '';
                // Musical notes
                result.musicalNotes = Enc.toMusicNotation(name);
                // Rhythm
                var rhythm = Enc.toRhythm(name);
                result.beats = rhythm ? rhythm.beats : '';
                result.bpm = rhythm ? rhythm.bpm : 0;
                // Dance/gesture
                result.danceNotation = Enc.toDanceMoves(name);
                result.wandNotation = Enc.toWandMoves(name);
            }
            return result;
        }

        // Build full alphabet table for all atoms
        function allAtomAlphabets() {
            return Object.keys(ATOMS).map(atomAlphabets);
        }

        // ══════════════════════════════════════════════════════════════
        //  CONTRAIL LANGUAGE — a new language built from keyboard flow
        // ══════════════════════════════════════════════════════════════
        // Every typed word becomes a sequence of directional arrows on a
        // keyboard layout. That sequence IS the word in the contrail
        // language. Different layouts produce different contrail words
        // for the same English text — each layout is a dialect.
        //
        // The contrail language has:
        //  • 9 phonemes: the 8 compass directions + same-key (·)
        //  • Syllables: consecutive same-direction runs
        //  • Homophones: different words that produce the same contrail
        //  • Grammar: concept atoms mapped to contrail signatures
        //  • Music: each direction has a pitch, so contrails are melodies
        //
        // This is the bridge between physical movement and meaning.
        // ══════════════════════════════════════════════════════════════

        var ContrailLang = (function() {

            // ── The 9 phonemes of contrail language ──
            var PHONEMES = {
                '\u2192': { code:'R',  name:'rah',   pitch:'C4',  degree:0,    desc:'rightward flow' },
                '\u2190': { code:'L',  name:'leh',   pitch:'D4',  degree:180,  desc:'leftward flow' },
                '\u2191': { code:'U',  name:'uhn',   pitch:'E4',  degree:90,   desc:'upward reach' },
                '\u2193': { code:'D',  name:'doh',   pitch:'F4',  degree:270,  desc:'downward press' },
                '\u2197': { code:'UR', name:'ura',   pitch:'G4',  degree:45,   desc:'ascending-right' },
                '\u2198': { code:'DR', name:'dra',   pitch:'A4',  degree:315,  desc:'descending-right' },
                '\u2196': { code:'UL', name:'ula',   pitch:'B4',  degree:135,  desc:'ascending-left' },
                '\u2199': { code:'DL', name:'dla',   pitch:'C5',  degree:225,  desc:'descending-left' },
                '\u00b7': { code:'S',  name:'sah',   pitch:'REST',degree:null, desc:'same-key stillness' },
            };

            // ── Direction music: each arrow is a note ──
            var PITCH_HZ = { 'C4':261.6,'D4':293.7,'E4':329.6,'F4':349.2,'G4':392.0,'A4':440.0,'B4':493.9,'C5':523.3,'REST':0 };

            // ── Build contrail for a word on a given layout ──
            function wordToContrail(word, layoutId) {
                var layout = typeof LAYOUTS !== 'undefined' ? LAYOUTS[layoutId || activeLayoutId || 'qwerty'] : null;
                if (!layout) return null;
                // Build key position map from layout
                var kp = {};
                layout.rows.forEach(function(row, ri) {
                    for (var ci = 0; ci < row.length; ci++) {
                        var ch = typeof row === 'string' ? row[ci] : row[ci];
                        if (ch) kp[ch.toLowerCase()] = { x: ci, y: ri };
                    }
                });
                kp[' '] = { x: 4.5, y: 3 };

                var chars = word.toLowerCase().split('');
                var arrows = [];
                var codes = [];
                var melody = [];
                var totalDist = 0;
                var turns = 0;
                var prevDir = null;

                for (var i = 1; i < chars.length; i++) {
                    var prev = kp[chars[i-1]];
                    var curr = kp[chars[i]];
                    if (!prev || !curr) { arrows.push('?'); codes.push('?'); melody.push(0); continue; }
                    var dx = curr.x - prev.x;
                    var dy = curr.y - prev.y;
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    totalDist += dist;

                    // Direction arrow
                    var arrow;
                    if (dx > 0.3 && dy < -0.3) arrow = '\u2197';
                    else if (dx > 0.3 && dy > 0.3) arrow = '\u2198';
                    else if (dx < -0.3 && dy < -0.3) arrow = '\u2196';
                    else if (dx < -0.3 && dy > 0.3) arrow = '\u2199';
                    else if (dx > 0.3) arrow = '\u2192';
                    else if (dx < -0.3) arrow = '\u2190';
                    else if (dy < -0.3) arrow = '\u2191';
                    else if (dy > 0.3) arrow = '\u2193';
                    else arrow = '\u00b7';

                    var ph = PHONEMES[arrow];
                    arrows.push(arrow);
                    codes.push(ph ? ph.code : '?');
                    melody.push(ph ? PITCH_HZ[ph.pitch] || 0 : 0);

                    // Track direction changes (turns)
                    if (prevDir && prevDir !== arrow) turns++;
                    prevDir = arrow;
                }

                // Syllables: group consecutive same-direction runs
                var syllables = [];
                var runArrow = null, runLen = 0;
                arrows.forEach(function(a) {
                    if (a === runArrow) { runLen++; }
                    else {
                        if (runArrow) syllables.push({ arrow: runArrow, len: runLen, phoneme: PHONEMES[runArrow] ? PHONEMES[runArrow].name : '?' });
                        runArrow = a; runLen = 1;
                    }
                });
                if (runArrow) syllables.push({ arrow: runArrow, len: runLen, phoneme: PHONEMES[runArrow] ? PHONEMES[runArrow].name : '?' });

                // Pronounceable form: syllable phonemes with length modifiers
                var spoken = syllables.map(function(s) {
                    return s.len > 1 ? s.phoneme + '-' + s.phoneme : s.phoneme;
                }).join("'");

                return {
                    word: word,
                    layout: layoutId || activeLayoutId || 'qwerty',
                    arrows: arrows.join(''),
                    codes: codes.join(' '),
                    spoken: spoken,
                    syllables: syllables,
                    melody: melody,
                    totalDist: Math.round(totalDist * 100) / 100,
                    turns: turns,
                    complexity: syllables.length,
                    letterCount: chars.length,
                    arrowCount: arrows.length,
                };
            }

            // ── Build vocabulary: all capsule words → contrail words ──
            var _vocabulary = null;
            var _vocabLayout = null;
            function buildVocabulary(layoutId) {
                var lid = layoutId || (typeof activeLayoutId !== 'undefined' ? activeLayoutId : 'qwerty');
                if (_vocabulary && _vocabLayout === lid) return _vocabulary;
                _vocabulary = {};
                _vocabLayout = lid;

                // Collect words from all capsules
                var allWords = new Set();
                if (typeof CAPSULES !== 'undefined') {
                    CAPSULES.forEach(function(cap) {
                        cap.words.forEach(function(w) {
                            var clean = w.replace(/^[A-Z]:\s*/, '').replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
                            if (clean.length > 1 && /^[a-z]/.test(clean)) allWords.add(clean);
                        });
                    });
                }
                // Also add lexicon words
                Object.keys(LEXICON).forEach(function(w) { if (w.length > 1) allWords.add(w); });

                allWords.forEach(function(w) {
                    var ct = wordToContrail(w, lid);
                    if (ct && ct.arrows.indexOf('?') === -1) {
                        _vocabulary[w] = ct;
                    }
                });
                return _vocabulary;
            }

            // ── Reverse lookup: contrail pattern → English words ──
            function contrailToWords(arrowSeq, layoutId) {
                var vocab = buildVocabulary(layoutId);
                var results = [];
                Object.entries(vocab).forEach(function(e) {
                    if (e[1].arrows === arrowSeq) {
                        results.push(e[0]);
                    }
                });
                return results;
            }

            // ── Find homophones: words with identical contrails ──
            function findHomophones(layoutId) {
                var vocab = buildVocabulary(layoutId);
                var byPattern = {};
                Object.entries(vocab).forEach(function(e) {
                    var a = e[1].arrows;
                    if (!byPattern[a]) byPattern[a] = [];
                    byPattern[a].push(e[0]);
                });
                // Only patterns with 2+ words
                var homophones = {};
                Object.entries(byPattern).forEach(function(e) {
                    if (e[1].length > 1) homophones[e[0]] = e[1];
                });
                return homophones;
            }

            // ── Translate: same word across layouts (dialects) ──
            function translateWord(word, fromLayout, toLayout) {
                var fromCt = wordToContrail(word, fromLayout);
                var toCt = wordToContrail(word, toLayout);
                if (!fromCt || !toCt) return null;
                return {
                    word: word,
                    from: { layout: fromLayout, arrows: fromCt.arrows, spoken: fromCt.spoken, melody: fromCt.melody },
                    to:   { layout: toLayout,   arrows: toCt.arrows,   spoken: toCt.spoken,   melody: toCt.melody },
                    same: fromCt.arrows === toCt.arrows,
                    distDelta: Math.round((toCt.totalDist - fromCt.totalDist) * 100) / 100,
                };
            }

            // ── Sentence → contrail language sentence ──
            function encodeSentence(sentence, layoutId) {
                var words = sentence.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/).filter(function(w) { return w.length > 0; });
                var contrailWords = [];
                var melodyAll = [];
                var totalComplexity = 0;
                words.forEach(function(w) {
                    var ct = wordToContrail(w, layoutId);
                    if (ct) {
                        contrailWords.push(ct);
                        melodyAll = melodyAll.concat(ct.melody);
                        totalComplexity += ct.complexity;
                    }
                });
                // Sentence as arrows (words separated by ·)
                var arrowSentence = contrailWords.map(function(ct) { return ct.arrows; }).join('\u00b7');
                // Spoken form
                var spokenSentence = contrailWords.map(function(ct) { return ct.spoken; }).join(' ');
                // Concept-contrail bridge: map concept atoms to their contrail representations
                var conceptBridge = [];
                words.forEach(function(w) {
                    var mapped = LEXICON[w];
                    if (mapped) {
                        var ct = wordToContrail(w, layoutId);
                        mapped.forEach(function(sym) {
                            conceptBridge.push({ atom: sym, name: ATOMS[sym] ? ATOMS[sym].name : '?', word: w, arrows: ct ? ct.arrows : '?' });
                        });
                    }
                });
                return {
                    original: sentence,
                    layout: layoutId || (typeof activeLayoutId !== 'undefined' ? activeLayoutId : 'qwerty'),
                    arrowSentence: arrowSentence,
                    spoken: spokenSentence,
                    words: contrailWords,
                    melody: melodyAll,
                    totalComplexity: totalComplexity,
                    conceptBridge: conceptBridge,
                    wordCount: contrailWords.length,
                };
            }

            // ── Grammar analysis: frequency of phonemes, common bigrams ──
            function analyzeGrammar(layoutId) {
                var vocab = buildVocabulary(layoutId);
                var phonemeFreq = {};
                var bigramFreq = {};
                var syllableStats = { total: 0, avgPerWord: 0 };
                var wordCount = 0;
                Object.keys(PHONEMES).forEach(function(k) { phonemeFreq[k] = 0; });

                Object.values(vocab).forEach(function(ct) {
                    wordCount++;
                    syllableStats.total += ct.syllables.length;
                    var arrows = ct.arrows.split ? ct.arrows : Array.from(ct.arrows);
                    for (var i = 0; i < arrows.length; i++) {
                        var a = arrows[i];
                        phonemeFreq[a] = (phonemeFreq[a] || 0) + 1;
                        if (i > 0) {
                            var bi = arrows[i-1] + a;
                            bigramFreq[bi] = (bigramFreq[bi] || 0) + 1;
                        }
                    }
                });

                syllableStats.avgPerWord = wordCount > 0 ? Math.round(syllableStats.total / wordCount * 10) / 10 : 0;

                // Sort phonemes and bigrams by frequency
                var sortedPhonemes = Object.entries(phonemeFreq).sort(function(a,b) { return b[1]-a[1]; });
                var sortedBigrams = Object.entries(bigramFreq).sort(function(a,b) { return b[1]-a[1]; }).slice(0, 20);

                return {
                    layout: layoutId || (typeof activeLayoutId !== 'undefined' ? activeLayoutId : 'qwerty'),
                    vocabularySize: wordCount,
                    phonemeFrequency: sortedPhonemes.map(function(e) { var ph = PHONEMES[e[0]]; return { arrow: e[0], code: ph ? ph.code : '?', name: ph ? ph.name : '?', count: e[1] }; }),
                    topBigrams: sortedBigrams.map(function(e) { return { pair: e[0], count: e[1] }; }),
                    syllableStats: syllableStats,
                };
            }

            // ── Dialect comparison: how different are two layouts? ──
            function compareDialects(layout1, layout2) {
                var vocab1 = buildVocabulary(layout1);
                _vocabulary = null; // force rebuild for layout2
                var vocab2 = buildVocabulary(layout2);
                _vocabulary = null; // reset

                var sameCount = 0, diffCount = 0, totalDist1 = 0, totalDist2 = 0;
                var commonWords = [];
                Object.keys(vocab1).forEach(function(w) {
                    if (vocab2[w]) {
                        if (vocab1[w].arrows === vocab2[w].arrows) {
                            sameCount++;
                        } else {
                            diffCount++;
                            if (commonWords.length < 10) {
                                commonWords.push({ word: w, dialect1: vocab1[w].arrows, dialect2: vocab2[w].arrows, spoken1: vocab1[w].spoken, spoken2: vocab2[w].spoken });
                            }
                        }
                        totalDist1 += vocab1[w].totalDist;
                        totalDist2 += vocab2[w].totalDist;
                    }
                });
                var total = sameCount + diffCount;
                return {
                    layout1: layout1, layout2: layout2,
                    totalWords: total,
                    identical: sameCount,
                    different: diffCount,
                    similarity: total > 0 ? Math.round(sameCount / total * 1000) / 10 : 0,
                    avgDistDelta: total > 0 ? Math.round((totalDist2 - totalDist1) / total * 100) / 100 : 0,
                    examples: commonWords,
                };
            }

            // ── Melody export: contrail as audio frequencies ──
            function wordMelody(word, layoutId) {
                var ct = wordToContrail(word, layoutId);
                if (!ct) return null;
                return {
                    word: word,
                    notes: ct.syllables.map(function(s) {
                        var ph = PHONEMES[s.arrow];
                        return { phoneme: ph ? ph.name : '?', pitch: ph ? ph.pitch : 'REST', hz: ph ? PITCH_HZ[ph.pitch] || 0 : 0, duration: s.len };
                    }),
                    melody: ct.melody,
                    totalDuration: ct.syllables.reduce(function(s,x) { return s + x.len; }, 0),
                };
            }

            return {
                PHONEMES: PHONEMES,
                PITCH_HZ: PITCH_HZ,
                wordToContrail: wordToContrail,
                buildVocabulary: buildVocabulary,
                contrailToWords: contrailToWords,
                findHomophones: findHomophones,
                translateWord: translateWord,
                encodeSentence: encodeSentence,
                analyzeGrammar: analyzeGrammar,
                compareDialects: compareDialects,
                wordMelody: wordMelody,
            };
        })();

        return {
            ATOMS: ATOMS,
            LEXICON: LEXICON,
            SOLFEGGIO: SOLFEGGIO,
            FREQ_REGISTRY: FREQ_REGISTRY,
            ContrailLang: ContrailLang,
            atomAlphabets: atomAlphabets,
            allAtomAlphabets: allAtomAlphabets,
            encode: encode,
            decode: decode,
            frequencySignature: frequencySignature,
            findConceptAcrossLanguages: findConceptAcrossLanguages,
            conceptDensity: conceptDensity,
            enrichWord: enrichWord,
            compressSentence: compressSentence,
            conceptFlow: conceptFlow,
            atomCount: function() { return Object.keys(ATOMS).length; },
            lexiconSize: function() { return Object.keys(LEXICON).length; },
            // Periodic Table & Physics Bridge
            PERIODIC_TABLE: PERIODIC_TABLE,
            QUANTUM_PREFIX_MAP: QUANTUM_PREFIX_MAP,
            getElement: getElement,
            elementToPrefix: elementToPrefix,
            elementToGates: elementToGates,
            allElementsWithPrefixes: allElementsWithPrefixes,
            matchPhysics: matchPhysics,
        };
    })();

    // ══════════════════ PERSONA CONTEXT ENGINE ══════════════════
    // 9-layer contextual zoom: world → region → state → local → precinct
    // → neighborhood → family → self → internal
    // Each layer carries language register, financial context, health context,
    // goals, pressures, and connects to search/history/AI for causality mapping.
    window.PersonaContext = (function() {
        'use strict';
        var STORE_KEY = 'uvspeed-persona-context';
        var persona = {};
        try { persona = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e) { persona = {}; }
        function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(persona)); } catch(e) {} }

        // Default layer structure
        var LAYERS = ['world','region','state','local','precinct','neighborhood','family','self','internal'];
        var LAYER_META = {
            world:        { icon:'\uD83C\uDF0D', name:'World',         desc:'Global events, geopolitics, climate, economy', register:'formal/news' },
            region:       { icon:'\uD83C\uDF0E', name:'Region',        desc:'Continental/cultural zone, trade blocs, shared history', register:'formal' },
            state:        { icon:'\uD83C\uDFDB', name:'State',         desc:'Governance, law, taxation, cost of living, regulations', register:'formal/civic' },
            local:        { icon:'\uD83C\uDFD9', name:'Locality',      desc:'City/town, job market, housing, transit, schools', register:'professional' },
            precinct:     { icon:'\uD83D\uDDFA', name:'Precinct',      desc:'District, voting patterns, infrastructure, services', register:'civic' },
            neighborhood: { icon:'\uD83C\uDFE0', name:'Neighborhood',  desc:'Block, community, safety, walkability, local business', register:'casual/community' },
            family:       { icon:'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', name:'Family', desc:'Household dynamics, relationships, dependents, pets, shared goals', register:'intimate' },
            self:         { icon:'\uD83E\uDDD1', name:'Self',          desc:'Personal health, career, education, identity, habits', register:'reflective' },
            internal:     { icon:'\uD83E\uDDE0', name:'Internal',      desc:'Thoughts, emotions, fears, aspirations, dreams, trauma', register:'private/therapeutic' },
        };

        // Initialize persona if empty
        if (!persona.layers) {
            persona.layers = {};
            LAYERS.forEach(function(l) {
                persona.layers[l] = {
                    // Context signals (user can set or AI can infer)
                    notes: '',              // free-form user notes
                    tags: [],               // topic tags
                    concerns: [],           // active worries/pressures
                    goals: [],              // aspirations at this layer
                    resources: [],          // available resources/supports
                    // Financial context
                    financial: {
                        pressure: 0,        // 0-100 financial pressure score
                        context: '',        // e.g., "student debt", "saving for house"
                        timeHorizon: '',    // e.g., "6 months", "5 years"
                    },
                    // Health context
                    health: {
                        concerns: [],       // health worries at this layer
                        supports: [],       // health resources
                    },
                    // Language register tracking
                    languageSignals: {
                        dominantRegister: '',
                        vocabularyLevel: '',
                        emotionalTone: '',
                    },
                    // Interaction history
                    interactionCount: 0,
                    lastInteraction: 0,
                    searchQueries: [],      // recent queries associated with this layer
                };
            });
            persona.created = Date.now();
            persona.lastUpdated = Date.now();
            save();
        }

        // ─── Financial Pressure Engine ───
        // Detects financial stress signals in text and maps to context layers
        var FINANCIAL_SIGNALS = {
            debt:       { weight: 80, pattern: /\b(debt|loan|owe|overdraft|collections|bankruptcy|default|late payment|interest rate|minimum payment|credit score)\b/i, layer: 'self' },
            housing:    { weight: 70, pattern: /\b(rent|mortgage|eviction|homeless|housing cost|afford|lease|landlord|foreclosure|down payment|housing crisis)\b/i, layer: 'local' },
            employment: { weight: 60, pattern: /\b(layoff|fired|unemploy|job search|resume|interview|salary|wage|paycheck|overtime|gig economy|side hustle)\b/i, layer: 'self' },
            education:  { weight: 50, pattern: /\b(tuition|student loan|scholarship|financial aid|FAFSA|college cost|degree worth|trade school|certification)\b/i, layer: 'self' },
            healthcare: { weight: 75, pattern: /\b(insurance|copay|deductible|prescription cost|medical bill|emergency room|uninsured|medicaid|medicare|out of pocket)\b/i, layer: 'family' },
            childcare:  { weight: 65, pattern: /\b(daycare|childcare cost|babysitter|after school|preschool|formula|diapers|child support)\b/i, layer: 'family' },
            food:       { weight: 85, pattern: /\b(food bank|food stamps|SNAP|WIC|hungry|food cost|grocery budget|food desert|meal prep|food insecurity)\b/i, layer: 'neighborhood' },
            savings:    { weight: 40, pattern: /\b(emergency fund|retirement|401k|IRA|savings account|investment|budget|compound interest|nest egg)\b/i, layer: 'self' },
            inflation:  { weight: 55, pattern: /\b(inflation|cost of living|price increase|shrinkflation|purchasing power|CPI|stagflation)\b/i, layer: 'state' },
            global_econ:{ weight: 45, pattern: /\b(recession|GDP|trade war|supply chain|sanctions|tariff|central bank|interest rate hike|quantitative|fiscal policy)\b/i, layer: 'world' },
        };

        function analyzeFinancialContext(text) {
            if (!text || text.length < 10) return null;
            var signals = [];
            var totalPressure = 0;
            var layerPressures = {};
            Object.entries(FINANCIAL_SIGNALS).forEach(function(e) {
                var key = e[0], sig = e[1];
                var matches = text.match(sig.pattern);
                if (matches) {
                    signals.push({ type: key, weight: sig.weight, layer: sig.layer, matches: matches.length });
                    totalPressure += sig.weight * Math.min(matches.length, 3);
                    layerPressures[sig.layer] = (layerPressures[sig.layer] || 0) + sig.weight;
                }
            });
            if (signals.length === 0) return null;
            return {
                signals: signals,
                overallPressure: Math.min(100, Math.round(totalPressure / signals.length)),
                layerPressures: layerPressures,
                primaryConcern: signals.sort(function(a,b) { return b.weight - a.weight; })[0].type,
                recommendations: generateFinancialGuidance(signals),
            };
        }

        function generateFinancialGuidance(signals) {
            var recs = [];
            var types = signals.map(function(s) { return s.type; });
            if (types.includes('food')) recs.push({ priority: 'critical', msg: 'Food security concern \u2014 search for local food banks, SNAP benefits, community gardens', action: 'search:food bank near me' });
            if (types.includes('housing')) recs.push({ priority: 'critical', msg: 'Housing pressure \u2014 look into tenant rights, housing assistance programs, HUD resources', action: 'search:housing assistance programs' });
            if (types.includes('healthcare')) recs.push({ priority: 'high', msg: 'Healthcare cost concern \u2014 explore community health centers, prescription assistance, telehealth options', action: 'search:community health center' });
            if (types.includes('debt')) recs.push({ priority: 'high', msg: 'Debt pressure \u2014 consider nonprofit credit counseling, consolidation options, income-driven repayment', action: 'search:nonprofit credit counseling' });
            if (types.includes('employment')) recs.push({ priority: 'high', msg: 'Employment concern \u2014 explore job training programs, workforce development, career counseling', action: 'search:workforce development programs' });
            if (types.includes('childcare')) recs.push({ priority: 'high', msg: 'Childcare cost \u2014 search for subsidized programs, Head Start, employer benefits', action: 'search:childcare assistance' });
            if (types.includes('education')) recs.push({ priority: 'medium', msg: 'Education financing \u2014 explore scholarships, Pell grants, income-based repayment plans', action: 'search:scholarship finder' });
            if (types.includes('savings')) recs.push({ priority: 'growth', msg: 'Building financial resilience \u2014 even small consistent savings compound over time', action: 'search:budgeting strategies' });
            if (types.includes('inflation')) recs.push({ priority: 'awareness', msg: 'Inflation affects purchasing power \u2014 track CPI trends, adjust budget categories', action: 'search:inflation calculator' });
            return recs;
        }

        // ─── Therapeutic Context Analyzer ───
        // Detects emotional/psychological signals for supportive assistance
        var THERAPEUTIC_SIGNALS = {
            stress:     { weight: 60, pattern: /\b(stressed|overwhelmed|exhausted|burnout|can't cope|breaking point|too much|drowning in|falling apart)\b/i },
            anxiety:    { weight: 70, pattern: /\b(anxious|worried|panic|nervous|dread|fear|can't sleep|racing thoughts|what if|overthinking)\b/i },
            depression: { weight: 80, pattern: /\b(hopeless|worthless|empty|numb|don't care|give up|no point|nothing matters|lonely|isolated)\b/i },
            grief:      { weight: 75, pattern: /\b(loss|grief|mourning|miss them|passed away|gone|funeral|bereaved|coping with loss)\b/i },
            anger:      { weight: 50, pattern: /\b(angry|furious|rage|unfair|injustice|fed up|sick of|frustrated|resentment)\b/i },
            growth:     { weight: 20, pattern: /\b(grateful|hopeful|progress|learning|growing|healing|better today|small wins|proud of|therapy)\b/i },
            goals:      { weight: 15, pattern: /\b(want to|plan to|goal|dream|aspire|working toward|someday|vision|purpose|meaning)\b/i },
            support:    { weight: 10, pattern: /\b(help me|need someone|talk to|listen|understand|safe space|not alone|support group|community)\b/i },
        };

        // Crisis detection — always prioritized
        var CRISIS_PATTERN = /\b(suicid|kill myself|end it|don't want to live|self[- ]harm|hurting myself|no reason to live|better off without me)\b/i;

        function analyzeTherapeuticContext(text) {
            if (!text || text.length < 10) return null;
            var signals = [];
            var isCrisis = CRISIS_PATTERN.test(text);
            Object.entries(THERAPEUTIC_SIGNALS).forEach(function(e) {
                var key = e[0], sig = e[1];
                var matches = text.match(sig.pattern);
                if (matches) signals.push({ type: key, weight: sig.weight, matches: matches.length });
            });
            if (signals.length === 0 && !isCrisis) return null;
            // Emotional balance: negative vs positive signals
            var negWeight = signals.filter(function(s) { return s.weight >= 50; }).reduce(function(sum, s) { return sum + s.weight; }, 0);
            var posWeight = signals.filter(function(s) { return s.weight < 50; }).reduce(function(sum, s) { return sum + s.weight; }, 0);
            var balance = posWeight > 0 ? Math.round(negWeight / (negWeight + posWeight) * 100) : (negWeight > 0 ? 100 : 50);
            return {
                isCrisis: isCrisis,
                signals: signals,
                emotionalBalance: balance, // 0=all positive, 100=all negative
                dominantState: signals.length > 0 ? signals.sort(function(a,b) { return b.weight - a.weight; })[0].type : 'neutral',
                hasGrowthSignals: signals.some(function(s) { return s.type === 'growth' || s.type === 'goals'; }),
                recommendations: generateTherapeuticGuidance(signals, isCrisis),
            };
        }

        function generateTherapeuticGuidance(signals, isCrisis) {
            var recs = [];
            if (isCrisis) {
                recs.push({ priority: 'CRISIS', msg: '\uD83D\uDEA8 If you are in crisis: 988 Suicide & Crisis Lifeline (call/text 988) | Crisis Text Line (text HOME to 741741) | International: findahelpline.com', action: 'tel:988' });
                recs.push({ priority: 'CRISIS', msg: 'You are not alone. These feelings are temporary. Professional help is available right now.', action: 'search:crisis support near me' });
                return recs;
            }
            var types = signals.map(function(s) { return s.type; });
            if (types.includes('depression')) recs.push({ priority: 'high', msg: 'Consider reaching out \u2014 therapy, trusted friends, or support lines can help. Small steps matter.', action: 'search:find a therapist' });
            if (types.includes('anxiety')) recs.push({ priority: 'high', msg: 'Grounding techniques: 5-4-3-2-1 senses, box breathing (4s in, 4s hold, 4s out, 4s hold)', action: 'search:anxiety coping techniques' });
            if (types.includes('stress')) recs.push({ priority: 'medium', msg: 'Burnout is real \u2014 identify one thing you can delegate, postpone, or let go of today', action: 'search:burnout recovery' });
            if (types.includes('grief')) recs.push({ priority: 'high', msg: 'Grief has no timeline. Be gentle with yourself. Grief support groups can provide connection.', action: 'search:grief support groups' });
            if (types.includes('anger')) recs.push({ priority: 'medium', msg: 'Anger often signals unmet needs or boundary violations. What need is underneath?', action: 'search:healthy anger expression' });
            if (types.includes('growth')) recs.push({ priority: 'positive', msg: 'You\'re showing growth signals \u2014 acknowledging progress is itself a form of healing', action: null });
            if (types.includes('goals')) recs.push({ priority: 'positive', msg: 'Having goals is protective \u2014 break them into smallest possible next steps', action: null });
            if (types.includes('support')) recs.push({ priority: 'high', msg: 'Asking for support is strength, not weakness. NAMI, 7cups.com, and local community centers offer free resources.', action: 'search:free mental health resources' });
            return recs;
        }

        // ─── Layer Interaction Recording ───
        function recordLayerSignal(layer, signal) {
            if (!persona.layers[layer]) return;
            var l = persona.layers[layer];
            l.interactionCount++;
            l.lastInteraction = Date.now();
            if (signal.query && l.searchQueries.length < 100) l.searchQueries.push({ q: signal.query, ts: Date.now() });
            if (signal.concern && l.concerns.indexOf(signal.concern) === -1 && l.concerns.length < 30) l.concerns.push(signal.concern);
            if (signal.goal && l.goals.indexOf(signal.goal) === -1 && l.goals.length < 30) l.goals.push(signal.goal);
            if (signal.tag && l.tags.indexOf(signal.tag) === -1 && l.tags.length < 50) l.tags.push(signal.tag);
            if (signal.financialPressure !== undefined) l.financial.pressure = signal.financialPressure;
            if (signal.financialContext) l.financial.context = signal.financialContext;
            if (signal.register) l.languageSignals.dominantRegister = signal.register;
            if (signal.emotion) l.languageSignals.emotionalTone = signal.emotion;
            persona.lastUpdated = Date.now();
            save();
        }

        // ─── Full Context Analysis ───
        // Analyzes text and maps signals to appropriate layers
        function analyzeFullContext(text) {
            if (!text || text.length < 10) return null;
            var financial = analyzeFinancialContext(text);
            var therapeutic = analyzeTherapeuticContext(text);
            // Detect which layers are active based on content
            var activeLayers = {};
            // Financial signals map to specific layers
            if (financial) {
                financial.signals.forEach(function(s) {
                    activeLayers[s.layer] = (activeLayers[s.layer] || 0) + s.weight;
                    recordLayerSignal(s.layer, { tag: s.type, financialPressure: s.weight, concern: s.type });
                });
            }
            // Therapeutic signals mostly map to self/internal
            if (therapeutic) {
                therapeutic.signals.forEach(function(s) {
                    var layer = s.weight >= 70 ? 'internal' : s.weight >= 40 ? 'self' : 'self';
                    activeLayers[layer] = (activeLayers[layer] || 0) + s.weight;
                    recordLayerSignal(layer, { tag: s.type, emotion: s.type });
                });
            }
            // Detect geographic/community layer signals
            if (/\b(global|worldwide|international|united nations|NATO|WHO|climate change|pandemic)\b/i.test(text)) activeLayers.world = (activeLayers.world || 0) + 30;
            if (/\b(state law|governor|state budget|DMV|highway|state park|state tax)\b/i.test(text)) activeLayers.state = (activeLayers.state || 0) + 30;
            if (/\b(city council|mayor|zoning|transit|downtown|local business|farmer.s market)\b/i.test(text)) activeLayers.local = (activeLayers.local || 0) + 30;
            if (/\b(voting|precinct|district|ward|polling|representative|redistricting)\b/i.test(text)) activeLayers.precinct = (activeLayers.precinct || 0) + 30;
            if (/\b(neighbor|block|street|park|community center|local school|HOA|block party)\b/i.test(text)) activeLayers.neighborhood = (activeLayers.neighborhood || 0) + 30;
            if (/\b(family|parent|child|sibling|spouse|partner|pet|dog|cat|household|kids|grandparent)\b/i.test(text)) activeLayers.family = (activeLayers.family || 0) + 30;
            if (/\b(I feel|I think|I want|I need|my goal|my dream|my health|my career|my body)\b/i.test(text)) activeLayers.self = (activeLayers.self || 0) + 30;
            if (/\b(afraid|wish|hope|imagine|remember|regret|wonder|believe|soul|spirit|meaning|purpose)\b/i.test(text)) activeLayers.internal = (activeLayers.internal || 0) + 30;

            return {
                financial: financial,
                therapeutic: therapeutic,
                activeLayers: activeLayers,
                primaryLayer: Object.keys(activeLayers).sort(function(a,b) { return activeLayers[b] - activeLayers[a]; })[0] || 'self',
                layerCount: Object.keys(activeLayers).length,
                timestamp: Date.now(),
            };
        }

        // Get persona summary for AI context
        function getPersonaSummary() {
            var summary = { layers: {}, totalInteractions: 0, topConcerns: [], topGoals: [], financialPressure: 0 };
            var allConcerns = [], allGoals = [];
            LAYERS.forEach(function(l) {
                var layer = persona.layers[l];
                if (!layer) return;
                summary.layers[l] = {
                    interactions: layer.interactionCount,
                    concerns: layer.concerns.length,
                    goals: layer.goals.length,
                    financialPressure: layer.financial.pressure,
                    lastActive: layer.lastInteraction,
                    tags: layer.tags.slice(0, 10),
                };
                summary.totalInteractions += layer.interactionCount;
                allConcerns = allConcerns.concat(layer.concerns);
                allGoals = allGoals.concat(layer.goals);
                summary.financialPressure = Math.max(summary.financialPressure, layer.financial.pressure);
            });
            // Deduplicate and rank
            summary.topConcerns = [...new Set(allConcerns)].slice(0, 15);
            summary.topGoals = [...new Set(allGoals)].slice(0, 15);
            summary.created = persona.created;
            summary.lastUpdated = persona.lastUpdated;
            return summary;
        }

        // Render a compact context card for UI
        function renderContextCard(analysis) {
            if (!analysis) return '';
            var html = '<div style="border:1px solid #30363d;border-radius:6px;padding:8px;background:#0d1117;font-size:.625rem;">';
            html += '<div style="font-weight:700;color:#c084fc;margin-bottom:6px;">\uD83C\uDF0D Persona Context</div>';
            // Active layers visualization
            html += '<div style="display:flex;gap:2px;margin-bottom:6px;">';
            LAYERS.forEach(function(l) {
                var active = analysis.activeLayers[l] || 0;
                var meta = LAYER_META[l];
                var opacity = active > 0 ? Math.min(1, 0.3 + active / 100) : 0.15;
                var border = l === analysis.primaryLayer ? '2px solid #58a6ff' : '1px solid #21262d';
                html += '<div style="flex:1;text-align:center;padding:4px 2px;background:rgba(88,166,255,' + opacity * 0.2 + ');border:' + border + ';border-radius:4px;cursor:help;" title="' + meta.name + ': ' + meta.desc + '">';
                html += '<div style="font-size:.75rem;">' + meta.icon + '</div>';
                html += '<div style="font-size:.4375rem;color:' + (active > 0 ? '#e6edf3' : '#484f58') + ';">' + meta.name.substring(0,5) + '</div>';
                if (active > 0) html += '<div style="font-size:.375rem;color:#58a6ff;">' + active + '</div>';
                html += '</div>';
            });
            html += '</div>';
            // Crisis alert
            if (analysis.therapeutic && analysis.therapeutic.isCrisis) {
                html += '<div style="background:#f8514920;border:2px solid #f85149;border-radius:6px;padding:8px;margin-bottom:6px;">';
                analysis.therapeutic.recommendations.forEach(function(r) {
                    html += '<div style="color:#f85149;font-weight:700;margin-bottom:4px;">' + r.msg + '</div>';
                });
                html += '</div>';
            }
            // Financial pressure
            if (analysis.financial) {
                var fp = analysis.financial;
                var pressureColor = fp.overallPressure > 70 ? '#f85149' : fp.overallPressure > 40 ? '#d4a017' : '#3fb950';
                html += '<div style="margin-bottom:6px;padding:6px;background:#161b22;border:1px solid #21262d;border-radius:4px;">';
                html += '<div style="display:flex;justify-content:space-between;"><span style="color:#fbbf24;font-weight:700;">Financial Pressure</span><span style="color:' + pressureColor + ';font-weight:700;">' + fp.overallPressure + '/100</span></div>';
                html += '<div style="background:#21262d;height:4px;border-radius:2px;margin:4px 0;"><div style="height:100%;width:' + fp.overallPressure + '%;background:' + pressureColor + ';border-radius:2px;"></div></div>';
                html += '<div style="color:#8b949e;">Primary: ' + fp.primaryConcern + '</div>';
                if (fp.recommendations.length > 0) {
                    fp.recommendations.slice(0, 3).forEach(function(r) {
                        html += '<div style="color:#58a6ff;margin-top:2px;cursor:pointer;" title="Click to search">\u2022 ' + r.msg.substring(0, 120) + '</div>';
                    });
                }
                html += '</div>';
            }
            // Therapeutic state
            if (analysis.therapeutic && !analysis.therapeutic.isCrisis) {
                var th = analysis.therapeutic;
                var balColor = th.emotionalBalance > 70 ? '#f85149' : th.emotionalBalance > 40 ? '#d4a017' : '#3fb950';
                html += '<div style="margin-bottom:6px;padding:6px;background:#161b22;border:1px solid #21262d;border-radius:4px;">';
                html += '<div style="display:flex;justify-content:space-between;"><span style="color:#a78bfa;font-weight:700;">Emotional State</span><span style="color:' + balColor + ';">' + th.dominantState + '</span></div>';
                if (th.hasGrowthSignals) html += '<div style="color:#3fb950;">\u2728 Growth signals detected</div>';
                th.recommendations.slice(0, 2).forEach(function(r) {
                    html += '<div style="color:#8b949e;margin-top:2px;">\u2022 ' + r.msg.substring(0, 140) + '</div>';
                });
                html += '</div>';
            }
            html += '</div>';
            return html;
        }

        return {
            LAYERS: LAYERS,
            LAYER_META: LAYER_META,
            analyzeFinancialContext: analyzeFinancialContext,
            analyzeTherapeuticContext: analyzeTherapeuticContext,
            analyzeFullContext: analyzeFullContext,
            recordLayerSignal: recordLayerSignal,
            getPersonaSummary: getPersonaSummary,
            renderContextCard: renderContextCard,
            getLayer: function(l) { return persona.layers[l] || null; },
            setLayerNote: function(l, note) { if (persona.layers[l]) { persona.layers[l].notes = note; save(); } },
            addGoal: function(l, goal) { if (persona.layers[l]) { var g = persona.layers[l].goals; if (g.indexOf(goal) === -1) g.push(goal); save(); } },
            addConcern: function(l, concern) { if (persona.layers[l]) { var c = persona.layers[l].concerns; if (c.indexOf(concern) === -1) c.push(concern); save(); } },
            getRaw: function() { return persona; },
            clear: function() { persona = {}; localStorage.removeItem(STORE_KEY); },
        };
    })();

    // ══════════════════ TRAINABLE CACHE INTELLIGENCE ══════════════════
    // Every word interaction builds a learning profile:
    //  - Quantum prefix classification (from QuantumPrefixes)
    //  - Typing biometrics (from Contrails engine)
    //  - Usage frequency + recency (from interactions)
    //  - Context associations (from co-occurring words)
    //  - AI relevance score (computed from all signals)
    //  - Capsule membership + cross-references
    window.CacheIntel = (function() {
        'use strict';
        var STORE_KEY = 'uvspeed-cache-intel';
        var intel = {};
        try { intel = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e) { intel = {}; }
        function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(intel)); } catch(e) {} }

        // Get or create intelligence entry for a word
        function getEntry(word) {
            var key = word.toLowerCase().trim();
            if (!intel[key]) {
                intel[key] = {
                    word: word,
                    // Usage signals
                    hitCount: 0,
                    firstSeen: Date.now(),
                    lastSeen: 0,
                    contexts: [],          // co-occurring words
                    capsules: [],          // which capsule categories it appeared in
                    // Quantum prefix classification
                    prefixSym: null,       // +1, 0, -n, etc.
                    prefixCat: null,       // comment, function, import, etc.
                    quantumGate: null,     // H, CNOT, X, etc.
                    quantumCoord: null,    // [x, y, z] position
                    // Typing biometrics (from Contrails)
                    avgTypingMs: 0,        // average ms per character
                    homeRowPct: 0,         // % of chars on home row
                    travelMM: 0,           // estimated finger travel
                    fingerBalance: null,   // L/R hand distribution
                    rhythmSignature: '',   // F/M/S/P pattern
                    // Pattern flow (from CapsuleAnalyzer seed)
                    contrailPath: '',
                    rsiRisk: 0,
                    avgForce: 0,
                    handBalance: 0,
                    sameFingerRepeat: 0,
                    rowChanges: 0,
                    musicalPattern: [],
                    // AI scores (computed)
                    relevance: 50,         // 0-100 relevance score
                    difficulty: 50,        // 0-100 typing difficulty
                    frequency: 0,          // normalized usage frequency
                    connections: 0,        // number of cross-references
                    // Learning trajectory
                    scores: [],            // [{ ts, relevance, difficulty }] history
                };
                // Seed from CapsuleAnalyzer if available
                if (window.CapsuleAnalyzer) {
                    try {
                        var seed = window.CapsuleAnalyzer.lookupWord(key);
                        if (seed && seed.analysis) {
                            var a = seed.analysis;
                            intel[key].homeRowPct = a.homeRowPct;
                            intel[key].travelMM = a.travelMM;
                            intel[key].rsiRisk = a.rsiRisk;
                            intel[key].avgForce = a.avgForce;
                            intel[key].fingerBalance = a.fingerBalance;
                            intel[key].handBalance = a.handBalance;
                            intel[key].contrailPath = a.contrailPath;
                            intel[key].sameFingerRepeat = a.sameFingerRepeat;
                            intel[key].rowChanges = a.rowChanges;
                            intel[key].musicalPattern = a.musicalPattern;
                            intel[key].quantumSym = a.quantumSym;
                            intel[key].quantumGate = a.quantumGate;
                            intel[key].quantumCoord = a.quantumCoord;
                            if (a.quantumSym) intel[key].prefixSym = a.quantumSym;
                            if (a.quantumGate) intel[key].quantumGate = a.quantumGate;
                            // Pre-compute difficulty from seed data
                            intel[key].difficulty = Math.round(a.complexity * 0.4 + a.rsiRisk * 0.3 + (100 - a.efficiency) * 0.3);
                            if (seed.capsule) intel[key].capsules.push(seed.capsule);
                        }
                    } catch(e) {}
                }
            }
            return intel[key];
        }

        // Record an interaction (word was clicked, typed, or looked up)
        function recordInteraction(word, context) {
            context = context || {};
            var entry = getEntry(word);
            entry.hitCount++;
            entry.lastSeen = Date.now();
            // Context associations
            if (context.coWords) {
                context.coWords.forEach(function(cw) {
                    if (entry.contexts.indexOf(cw) === -1 && entry.contexts.length < 50) entry.contexts.push(cw);
                });
            }
            if (context.capsule && entry.capsules.indexOf(context.capsule) === -1) {
                entry.capsules.push(context.capsule);
            }
            // Quantum prefix classification
            var QP = window.QuantumPrefixes;
            if (QP && QP.classifyLine && !entry.prefixSym) {
                var cl = QP.classifyLine(word, context.language || 'text');
                if (cl) {
                    entry.prefixSym = cl.sym;
                    entry.prefixCat = cl.category || cl.cls;
                    // Map to quantum gate
                    var gateMap = {'+1':'H','1':'CNOT','-1':'X','+0':'Rz','0':'I','-0':'S','+n':'T','n':'SWAP','-n':'M','+2':'CZ','+3':'Y'};
                    entry.quantumGate = gateMap[cl.sym] || 'I';
                }
            }
            // Quantum coordinates from prefix metadata
            if (QP && QP.prefixMetadata && !entry.quantumCoord) {
                var meta = QP.prefixMetadata(word, context.language || 'text');
                if (meta) {
                    entry.quantumCoord = [
                        meta.classifiedLines || 0,      // x: dependency depth
                        meta.totalLines || 1,            // y: size
                        Math.round(meta.coverage * 100)  // z: complexity
                    ];
                }
            }
            // Typing biometrics from Contrails
            if (context.biometrics) {
                var bio = context.biometrics;
                entry.avgTypingMs = bio.avgTypingMs || entry.avgTypingMs;
                entry.homeRowPct = bio.homeRowPct || entry.homeRowPct;
                entry.travelMM = bio.travelMM || entry.travelMM;
                entry.fingerBalance = bio.fingerBalance || entry.fingerBalance;
                entry.rhythmSignature = bio.rhythmSignature || entry.rhythmSignature;
            }
            // Recompute AI scores
            recomputeScores(entry);
            save();
            return entry;
        }

        // AI scoring algorithm — learns from all signals
        function recomputeScores(entry) {
            // Relevance: weighted combination of frequency, recency, connections
            var ageHours = (Date.now() - entry.firstSeen) / 3600000;
            var recencyHours = (Date.now() - entry.lastSeen) / 3600000;
            var freqScore = Math.min(100, entry.hitCount * 10);
            var recencyScore = Math.max(0, 100 - recencyHours * 2);
            var connectionScore = Math.min(100, (entry.contexts.length + entry.capsules.length * 5) * 3);
            var biometricBonus = entry.homeRowPct > 60 ? 10 : 0;
            entry.relevance = Math.round(freqScore * 0.3 + recencyScore * 0.3 + connectionScore * 0.3 + biometricBonus * 0.1);
            entry.relevance = Math.max(1, Math.min(100, entry.relevance));
            // Difficulty: based on typing metrics
            var lenPenalty = Math.min(30, entry.word.length * 2);
            var homeRowBonus = entry.homeRowPct > 0 ? (100 - entry.homeRowPct) * 0.5 : 25;
            var travelPenalty = Math.min(30, (entry.travelMM || 0) * 0.1);
            entry.difficulty = Math.round(lenPenalty + homeRowBonus + travelPenalty);
            entry.difficulty = Math.max(1, Math.min(100, entry.difficulty));
            // Frequency (normalized)
            entry.frequency = Math.min(100, Math.round(entry.hitCount / Math.max(ageHours / 24, 1) * 20));
            // Connections count
            entry.connections = entry.contexts.length + entry.capsules.length;
            // Record score trajectory (max 50 snapshots)
            entry.scores.push({ ts: Date.now(), relevance: entry.relevance, difficulty: entry.difficulty });
            if (entry.scores.length > 50) entry.scores = entry.scores.slice(-50);
        }

        // Bulk training: process an array of words with context
        function trainBatch(words, context) {
            context = context || {};
            words.forEach(function(w) { recordInteraction(w, context); });
            save();
        }

        // Get top N words by a scoring dimension
        function getTopWords(dimension, n) {
            dimension = dimension || 'relevance';
            n = n || 20;
            var all = Object.values(intel);
            all.sort(function(a, b) { return (b[dimension] || 0) - (a[dimension] || 0); });
            return all.slice(0, n);
        }

        // Get words that need more training (high difficulty + low frequency)
        function getTrainingTargets(n) {
            n = n || 20;
            var all = Object.values(intel);
            all.forEach(function(e) {
                e._trainingNeed = (e.difficulty || 50) * 0.6 + Math.max(0, 100 - (e.frequency || 0)) * 0.4;
            });
            all.sort(function(a, b) { return b._trainingNeed - a._trainingNeed; });
            return all.slice(0, n);
        }

        // Get words by quantum gate classification
        function getByQuantumGate(gate) {
            return Object.values(intel).filter(function(e) { return e.quantumGate === gate; });
        }

        // Get words by capsule category
        function getByCapsule(cat) {
            return Object.values(intel).filter(function(e) { return e.capsules.indexOf(cat) !== -1; });
        }

        // Generate AI-refined training dataset
        function exportTrainingData() {
            var entries = Object.values(intel);
            var dataset = {
                version: '1.0',
                generated: new Date().toISOString(),
                totalWords: entries.length,
                totalInteractions: entries.reduce(function(s, e) { return s + e.hitCount; }, 0),
                // Feature vectors for ML training
                features: entries.map(function(e) {
                    return {
                        word: e.word,
                        // Normalized features (0-1)
                        relevance: e.relevance / 100,
                        difficulty: e.difficulty / 100,
                        frequency: e.frequency / 100,
                        connections: Math.min(1, e.connections / 50),
                        homeRowPct: e.homeRowPct / 100,
                        wordLength: Math.min(1, e.word.length / 20),
                        hitCount: Math.min(1, e.hitCount / 100),
                        // Categorical features
                        prefixSym: e.prefixSym || '',
                        quantumGate: e.quantumGate || 'I',
                        capsules: e.capsules,
                        // Raw metrics
                        avgTypingMs: e.avgTypingMs,
                        travelMM: e.travelMM,
                        rhythmSignature: e.rhythmSignature,
                        contextCount: e.contexts.length,
                    };
                }),
                // Aggregate statistics
                stats: {
                    avgRelevance: entries.reduce(function(s,e) { return s + e.relevance; }, 0) / Math.max(entries.length, 1),
                    avgDifficulty: entries.reduce(function(s,e) { return s + e.difficulty; }, 0) / Math.max(entries.length, 1),
                    topGates: (function() {
                        var counts = {};
                        entries.forEach(function(e) { if (e.quantumGate) counts[e.quantumGate] = (counts[e.quantumGate] || 0) + 1; });
                        return counts;
                    })(),
                    topCapsules: (function() {
                        var counts = {};
                        entries.forEach(function(e) { e.capsules.forEach(function(c) { counts[c] = (counts[c] || 0) + 1; }); });
                        return counts;
                    })(),
                },
            };
            return dataset;
        }

        // Prune low-value entries (noise reduction)
        function prune(minRelevance) {
            minRelevance = minRelevance || 5;
            var keys = Object.keys(intel);
            var pruned = 0;
            keys.forEach(function(k) {
                if (intel[k].hitCount <= 1 && intel[k].relevance < minRelevance && (Date.now() - intel[k].lastSeen) > 86400000) {
                    delete intel[k];
                    pruned++;
                }
            });
            save();
            return pruned;
        }

        // Summary stats
        function getSummary() {
            var entries = Object.values(intel);
            if (entries.length === 0) return { totalWords: 0, totalInteractions: 0, avgRelevance: 0, topWord: null };
            entries.sort(function(a, b) { return b.hitCount - a.hitCount; });
            return {
                totalWords: entries.length,
                totalInteractions: entries.reduce(function(s, e) { return s + e.hitCount; }, 0),
                avgRelevance: Math.round(entries.reduce(function(s, e) { return s + e.relevance; }, 0) / entries.length),
                avgDifficulty: Math.round(entries.reduce(function(s, e) { return s + e.difficulty; }, 0) / entries.length),
                topWord: entries[0].word,
                quantumCoverage: Math.round(entries.filter(function(e) { return e.quantumGate; }).length / entries.length * 100),
                biometricCoverage: Math.round(entries.filter(function(e) { return e.homeRowPct > 0; }).length / entries.length * 100),
                capsuleSpread: new Set(entries.flatMap(function(e) { return e.capsules; })).size,
            };
        }

        return {
            recordInteraction: recordInteraction,
            trainBatch: trainBatch,
            getEntry: getEntry,
            getTopWords: getTopWords,
            getTrainingTargets: getTrainingTargets,
            getByQuantumGate: getByQuantumGate,
            getByCapsule: getByCapsule,
            exportTrainingData: exportTrainingData,
            prune: prune,
            getSummary: getSummary,
            getRaw: function() { return intel; },
            getSize: function() { return Object.keys(intel).length; },
            clear: function() { intel = {}; save(); },
        };
    })();

    // ══════════════════ CAPSULES TAB (Global Knowledge Base) ══════════════════
    (function(){
        // ─── LANGUAGE CAPSULES (30+ languages, teen baseline) ───
        const LANG_CAPSULES = [
            { id:'en-child', name:'English (Child)', flag:'\uD83C\uDDFA\uD83C\uDDF8', color:'#3fb950', cat:'lang', age:'0-12',
              desc:'Sight words, phonics, early readers',
              words:['the','and','is','it','to','in','was','you','he','she','we','they','said','my','for','are','but','not','what','all','can','had','her','him','his','how','its','may','new','now','old','our','out','own','say','too','way','who','any','big','boy','day','did','get','got','has','let','man','put','red','run','top','use'] },
            { id:'en-teen', name:'English (Teen)', flag:'\uD83C\uDDFA\uD83C\uDDF8', color:'#58a6ff', cat:'lang', age:'13-18',
              desc:'Academic, SAT prep, social media literacy',
              words:['analyze','context','evaluate','hypothesis','inference','rhetoric','synthesis','abstract','aesthetic','ambiguous','contemporary','diverse','elaborate','facilitate','generate','implement','justify','maintain','objective','perspective','relevant','significant','substantial','transition','utilize','advocate','derive','enhance','fluctuate','innovate','paradigm','reinforce','simulate','variable','volatile','algorithm','binary','protocol','bandwidth','encryption'] },
            { id:'en-adult', name:'English (Adult)', flag:'\uD83C\uDDFA\uD83C\uDDF8', color:'#a78bfa', cat:'lang', age:'18+',
              desc:'Professional, technical, financial',
              words:['acquisition','benchmark','compliance','derivative','equity','fiduciary','governance','infrastructure','jurisdiction','leverage','methodology','optimization','procurement','quantitative','regulatory','stakeholder','throughput','underwrite','valuation','workflow','amortize','contingency','depreciation','escrow','franchise','iterate','juxtapose','liquidate','monetize','pipeline','scalable'] },
            { id:'es-teen', name:'Spanish (Teen)', flag:'\uD83C\uDDEA\uD83C\uDDF8', color:'#f97316', cat:'lang', age:'13-18',
              desc:'Pan-Spanish academic + daily life',
              words:['hola','gracias','por favor','buenos días','agua','comida','casa','familia','amigo','trabajo','escuela','ciudad','país','tiempo','dinero','salud','amor','vida','mundo','libro','tienda','hospital','montaña','río','sol','luna','estrella','grande','pequeño','nuevo','bueno','malo','rápido','lento','blanco','negro','rojo','azul','verde','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','cien','hoy','mañana','ayer','siempre','nunca','gobierno','democracia','economía','universidad','tecnología','ciencia'] },
            { id:'fr-teen', name:'French (Teen)', flag:'\uD83C\uDDEB\uD83C\uDDF7', color:'#818cf8', cat:'lang', age:'13-18',
              desc:'French academic + conversational',
              words:['bonjour','merci','oui','non','eau','maison','famille','ami','travail','école','ville','temps','argent','santé','amour','vie','monde','livre','soleil','lune','étoile','grand','petit','nouveau','bon','mauvais','rapide','lent','blanc','noir','rouge','bleu','vert','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','cent','aujourd\'hui','demain','hier','toujours','jamais','gouvernement','liberté','égalité','fraternité','philosophie','révolution','république'] },
            { id:'de-teen', name:'German (Teen)', flag:'\uD83C\uDDE9\uD83C\uDDEA', color:'#f59e0b', cat:'lang', age:'13-18',
              desc:'German academic vocabulary',
              words:['hallo','danke','bitte','ja','nein','Wasser','Haus','Familie','Freund','Arbeit','Schule','Stadt','Land','Zeit','Geld','Gesundheit','Liebe','Leben','Welt','Buch','Sonne','Mond','Stern','groß','klein','neu','alt','gut','schlecht','schnell','langsam','weiß','schwarz','rot','blau','grün','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','hundert','heute','morgen','gestern','immer','nie','Wissenschaft','Universität','Regierung'] },
            { id:'pt-teen', name:'Portuguese (Teen)', flag:'\uD83C\uDDE7\uD83C\uDDF7', color:'#22c55e', cat:'lang', age:'13-18',
              desc:'Brazilian + European Portuguese',
              words:['olá','obrigado','sim','não','água','casa','família','amigo','trabalho','escola','cidade','país','tempo','dinheiro','saúde','amor','vida','mundo','livro','sol','lua','estrela','grande','pequeno','novo','bom','mau','rápido','lento','branco','preto','vermelho','azul','verde','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','cem','hoje','amanhã','ontem','sempre','nunca','governo','universidade','tecnologia','ciência','saudade'] },
            { id:'it-teen', name:'Italian (Teen)', flag:'\uD83C\uDDEE\uD83C\uDDF9', color:'#ec4899', cat:'lang', age:'13-18',
              desc:'Italian academic + cultural',
              words:['ciao','grazie','prego','sì','no','acqua','casa','famiglia','amico','lavoro','scuola','città','paese','tempo','soldi','salute','amore','vita','mondo','libro','sole','luna','stella','grande','piccolo','nuovo','vecchio','buono','cattivo','veloce','lento','bianco','nero','rosso','blu','verde','uno','due','tre','quattro','cinque','sei','sette','otto','nove','dieci','cento','oggi','domani','ieri','sempre','mai','governo','università','scienza','rinascimento','arte'] },
            { id:'ru-teen', name:'Russian (Teen)', flag:'\uD83C\uDDF7\uD83C\uDDFA', color:'#dc2626', cat:'lang', age:'13-18',
              desc:'Russian academic vocabulary',
              words:['привет','спасибо','пожалуйста','да','нет','вода','дом','семья','друг','работа','школа','город','страна','время','деньги','здоровье','любовь','жизнь','мир','книга','солнце','луна','звезда','большой','маленький','новый','старый','хороший','плохой','быстрый','медленный','белый','чёрный','красный','синий','зелёный','один','два','три','четыре','пять','шесть','семь','восемь','девять','десять','сто','сегодня','завтра','вчера','всегда','никогда','наука','университет'] },
            { id:'zh-teen', name:'Chinese (Teen)', flag:'\uD83C\uDDE8\uD83C\uDDF3', color:'#ef4444', cat:'lang', age:'13-18',
              desc:'Mandarin academic + newspaper',
              words:['的','一','是','不','了','人','我','在','有','他','这','中','大','来','上','国','个','到','说','们','为','子','和','你','地','出','会','时','要','也','以','就','那','年','学','对','可','她','里','后','自','心','小','去','生','多','天','全','家','两','发','最','如','行','动','方','三','科学','技术','大学','政府','经济','社会','文化','教育','环境'] },
            { id:'ja-teen', name:'Japanese (Teen)', flag:'\uD83C\uDDEF\uD83C\uDDF5', color:'#fb7185', cat:'lang', age:'13-18',
              desc:'Joyo kanji + academic',
              words:['一','二','三','四','五','六','七','八','九','十','百','千','上','下','左','右','中','大','小','月','日','年','木','山','川','空','田','天','生','人','名','子','目','耳','口','手','足','力','学','校','水','火','金','雨','白','赤','青','花','草','犬','本','文','字','先','見','音','気','円','入','出','立','休','科学','技術','大学','政府','経済','社会'] },
            { id:'ko-teen', name:'Korean (Teen)', flag:'\uD83C\uDDF0\uD83C\uDDF7', color:'#22d3ee', cat:'lang', age:'13-18',
              desc:'Korean academic vocabulary',
              words:['안녕하세요','감사합니다','네','아니요','물','집','가족','친구','일','학교','도시','나라','시간','돈','건강','사랑','삶','세계','책','해','달','별','크다','작다','새로운','오래된','좋다','나쁘다','빠르다','느리다','하얀','검은','빨간','파란','초록','하나','둘','셋','넷','다섯','여섯','일곱','여덟','아홉','열','백','오늘','내일','어제','항상','절대','과학','기술','대학교','정부','경제','사회'] },
            { id:'ar-teen', name:'Arabic (Teen)', flag:'\uD83C\uDDF8\uD83C\uDDE6', color:'#fbbf24', cat:'lang', age:'13-18',
              desc:'Modern Standard Arabic academic',
              words:['كتاب','قلم','بيت','ماء','أرض','سماء','شمس','قمر','نجم','بحر','جبل','شجرة','إنسان','طفل','رجل','امرأة','أب','أم','صديق','معلم','طبيب','مدرسة','جامعة','كبير','صغير','جديد','قديم','سريع','بطيء','أبيض','أسود','أحمر','أزرق','أخضر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','مئة','ألف','حكومة','اقتصاد','تكنولوجيا','علم','مجتمع','ثقافة','تعليم'] },
            { id:'hi-teen', name:'Hindi (Teen)', flag:'\uD83C\uDDEE\uD83C\uDDF3', color:'#84cc16', cat:'lang', age:'13-18',
              desc:'Hindi academic vocabulary',
              words:['नमस्ते','धन्यवाद','हाँ','नहीं','पानी','घर','परिवार','दोस्त','काम','स्कूल','शहर','देश','समय','पैसा','स्वास्थ्य','प्यार','जीवन','दुनिया','किताब','सूरज','चाँद','तारा','बड़ा','छोटा','नया','पुराना','अच्छा','बुरा','तेज़','धीमा','सफ़ेद','काला','लाल','नीला','हरा','एक','दो','तीन','चार','पाँच','छह','सात','आठ','नौ','दस','सौ','आज','कल','हमेशा','कभी नहीं','विज्ञान','प्रौद्योगिकी','विश्वविद्यालय','सरकार','अर्थव्यवस्था'] },
            { id:'bn-teen', name:'Bengali (Teen)', flag:'\uD83C\uDDE7\uD83C\uDDE9', color:'#06b6d4', cat:'lang', age:'13-18',
              desc:'Bengali academic core',
              words:['নমস্কার','ধন্যবাদ','হ্যাঁ','না','জল','বাড়ি','পরিবার','বন্ধু','কাজ','স্কুল','শহর','দেশ','সময়','টাকা','স্বাস্থ্য','ভালোবাসা','জীবন','পৃথিবী','বই','সূর্য','চাঁদ','তারা','বড়','ছোট','নতুন','পুরানো','ভালো','খারাপ','দ্রুত','ধীর','সাদা','কালো','লাল','নীল','সবুজ','এক','দুই','তিন','চার','পাঁচ','বিজ্ঞান','প্রযুক্তি','বিশ্ববিদ্যালয়','সরকার','অর্থনীতি'] },
            { id:'ur-teen', name:'Urdu (Teen)', flag:'\uD83C\uDDF5\uD83C\uDDF0', color:'#059669', cat:'lang', age:'13-18',
              desc:'Urdu academic vocabulary',
              words:['سلام','شکریہ','ہاں','نہیں','پانی','گھر','خاندان','دوست','کام','اسکول','شہر','ملک','وقت','پیسہ','صحت','محبت','زندگی','دنیا','کتاب','سورج','چاند','ستارہ','بڑا','چھوٹا','نیا','پرانا','اچھا','برا','تیز','سست','سفید','کالا','لال','نیلا','سبز','ایک','دو','تین','چار','پانچ','سائنس','ٹیکنالوجی','یونیورسٹی','حکومت','معیشت'] },
            { id:'id-teen', name:'Indonesian (Teen)', flag:'\uD83C\uDDEE\uD83C\uDDE9', color:'#dc2626', cat:'lang', age:'13-18',
              desc:'Bahasa Indonesia academic',
              words:['halo','terima kasih','ya','tidak','air','rumah','keluarga','teman','kerja','sekolah','kota','negara','waktu','uang','kesehatan','cinta','kehidupan','dunia','buku','matahari','bulan','bintang','besar','kecil','baru','lama','baik','buruk','cepat','lambat','putih','hitam','merah','biru','hijau','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','seratus','hari ini','besok','kemarin','selalu','tidak pernah','ilmu','teknologi','universitas','pemerintah','ekonomi'] },
            { id:'ms-teen', name:'Malay (Teen)', flag:'\uD83C\uDDF2\uD83C\uDDFE', color:'#0ea5e9', cat:'lang', age:'13-18',
              desc:'Bahasa Melayu academic',
              words:['hello','terima kasih','ya','tidak','air','rumah','keluarga','kawan','kerja','sekolah','bandar','negara','masa','wang','kesihatan','cinta','hidup','dunia','buku','matahari','bulan','bintang','besar','kecil','baharu','lama','baik','jahat','cepat','lambat','putih','hitam','merah','biru','hijau','satu','dua','tiga','empat','lima','enam','tujuh','lapan','sembilan','sepuluh','seratus','hari ini','esok','semalam','selalu','tidak pernah','sains','teknologi','universiti','kerajaan','ekonomi'] },
            { id:'th-teen', name:'Thai (Teen)', flag:'\uD83C\uDDF9\uD83C\uDDED', color:'#6366f1', cat:'lang', age:'13-18',
              desc:'Thai academic vocabulary',
              words:['สวัสดี','ขอบคุณ','ใช่','ไม่','น้ำ','บ้าน','ครอบครัว','เพื่อน','งาน','โรงเรียน','เมือง','ประเทศ','เวลา','เงิน','สุขภาพ','ความรัก','ชีวิต','โลก','หนังสือ','ดวงอาทิตย์','ดวงจันทร์','ดาว','ใหญ่','เล็ก','ใหม่','เก่า','ดี','ไม่ดี','เร็ว','ช้า','ขาว','ดำ','แดง','น้ำเงิน','เขียว','หนึ่ง','สอง','สาม','สี่','ห้า','วิทยาศาสตร์','เทคโนโลยี','มหาวิทยาลัย','รัฐบาล','เศรษฐกิจ'] },
            { id:'vi-teen', name:'Vietnamese (Teen)', flag:'\uD83C\uDDFB\uD83C\uDDF3', color:'#ea580c', cat:'lang', age:'13-18',
              desc:'Vietnamese academic vocabulary',
              words:['xin chào','cảm ơn','vâng','không','nước','nhà','gia đình','bạn','công việc','trường','thành phố','đất nước','thời gian','tiền','sức khỏe','tình yêu','cuộc sống','thế giới','sách','mặt trời','mặt trăng','ngôi sao','lớn','nhỏ','mới','cũ','tốt','xấu','nhanh','chậm','trắng','đen','đỏ','xanh dương','xanh lá','một','hai','ba','bốn','năm','sáu','bảy','tám','chín','mười','khoa học','công nghệ','đại học','chính phủ','kinh tế'] },
            { id:'tr-teen', name:'Turkish (Teen)', flag:'\uD83C\uDDF9\uD83C\uDDF7', color:'#e11d48', cat:'lang', age:'13-18',
              desc:'Turkish academic vocabulary',
              words:['merhaba','teşekkürler','evet','hayır','su','ev','aile','arkadaş','iş','okul','şehir','ülke','zaman','para','sağlık','aşk','hayat','dünya','kitap','güneş','ay','yıldız','büyük','küçük','yeni','eski','iyi','kötü','hızlı','yavaş','beyaz','siyah','kırmızı','mavi','yeşil','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz','on','yüz','bugün','yarın','dün','her zaman','asla','bilim','teknoloji','üniversite','hükümet','ekonomi'] },
            { id:'pl-teen', name:'Polish (Teen)', flag:'\uD83C\uDDF5\uD83C\uDDF1', color:'#dc2626', cat:'lang', age:'13-18',
              desc:'Polish academic vocabulary',
              words:['cześć','dziękuję','tak','nie','woda','dom','rodzina','przyjaciel','praca','szkoła','miasto','kraj','czas','pieniądze','zdrowie','miłość','życie','świat','książka','słońce','księżyc','gwiazda','duży','mały','nowy','stary','dobry','zły','szybki','wolny','biały','czarny','czerwony','niebieski','zielony','jeden','dwa','trzy','cztery','pięć','sześć','siedem','osiem','dziewięć','dziesięć','sto','dzisiaj','jutro','wczoraj','zawsze','nigdy','nauka','technologia','uniwersytet','rząd','gospodarka'] },
            { id:'nl-teen', name:'Dutch (Teen)', flag:'\uD83C\uDDF3\uD83C\uDDF1', color:'#f97316', cat:'lang', age:'13-18',
              desc:'Dutch academic vocabulary',
              words:['hallo','dank je','ja','nee','water','huis','familie','vriend','werk','school','stad','land','tijd','geld','gezondheid','liefde','leven','wereld','boek','zon','maan','ster','groot','klein','nieuw','oud','goed','slecht','snel','langzaam','wit','zwart','rood','blauw','groen','een','twee','drie','vier','vijf','zes','zeven','acht','negen','tien','honderd','vandaag','morgen','gisteren','altijd','nooit','wetenschap','technologie','universiteit','regering','economie'] },
            { id:'sv-teen', name:'Swedish (Teen)', flag:'\uD83C\uDDF8\uD83C\uDDEA', color:'#2563eb', cat:'lang', age:'13-18',
              desc:'Swedish academic vocabulary',
              words:['hej','tack','ja','nej','vatten','hus','familj','vän','arbete','skola','stad','land','tid','pengar','hälsa','kärlek','liv','värld','bok','sol','måne','stjärna','stor','liten','ny','gammal','bra','dålig','snabb','långsam','vit','svart','röd','blå','grön','en','två','tre','fyra','fem','sex','sju','åtta','nio','tio','hundra','idag','imorgon','igår','alltid','aldrig','vetenskap','teknik','universitet','regering','ekonomi'] },
            { id:'el-teen', name:'Greek (Teen)', flag:'\uD83C\uDDEC\uD83C\uDDF7', color:'#0284c7', cat:'lang', age:'13-18',
              desc:'Modern Greek academic',
              words:['γεια','ευχαριστώ','ναι','όχι','νερό','σπίτι','οικογένεια','φίλος','δουλειά','σχολείο','πόλη','χώρα','χρόνος','χρήματα','υγεία','αγάπη','ζωή','κόσμος','βιβλίο','ήλιος','φεγγάρι','αστέρι','μεγάλος','μικρός','νέος','παλιός','καλός','κακός','γρήγορος','αργός','άσπρος','μαύρος','κόκκινος','μπλε','πράσινος','ένα','δύο','τρία','τέσσερα','πέντε','επιστήμη','τεχνολογία','πανεπιστήμιο','κυβέρνηση','οικονομία','δημοκρατία','φιλοσοφία'] },
            { id:'he-teen', name:'Hebrew (Teen)', flag:'\uD83C\uDDEE\uD83C\uDDF1', color:'#1d4ed8', cat:'lang', age:'13-18',
              desc:'Modern Hebrew academic',
              words:['שלום','תודה','כן','לא','מים','בית','משפחה','חבר','עבודה','בית ספר','עיר','מדינה','זמן','כסף','בריאות','אהבה','חיים','עולם','ספר','שמש','ירח','כוכב','גדול','קטן','חדש','ישן','טוב','רע','מהיר','איטי','לבן','שחור','אדום','כחול','ירוק','אחד','שתיים','שלוש','ארבע','חמש','מדע','טכנולוגיה','אוניברסיטה','ממשלה','כלכלה'] },
            { id:'sw-teen', name:'Swahili (Teen)', flag:'\uD83C\uDDF0\uD83C\uDDEA', color:'#16a34a', cat:'lang', age:'13-18',
              desc:'Swahili academic + East African',
              words:['habari','asante','ndiyo','hapana','maji','nyumba','familia','rafiki','kazi','shule','jiji','nchi','wakati','pesa','afya','upendo','maisha','dunia','kitabu','jua','mwezi','nyota','kubwa','ndogo','mpya','zamani','nzuri','mbaya','haraka','polepole','nyeupe','nyeusi','nyekundu','bluu','kijani','moja','mbili','tatu','nne','tano','sita','saba','nane','tisa','kumi','mia','sayansi','teknolojia','chuo kikuu','serikali','uchumi'] },
            { id:'am-teen', name:'Amharic (Teen)', flag:'\uD83C\uDDEA\uD83C\uDDF9', color:'#059669', cat:'lang', age:'13-18',
              desc:'Amharic academic vocabulary',
              words:['ሰላም','አመሰግናለሁ','አዎ','አይ','ውሃ','ቤት','ቤተሰብ','ጓደኛ','ሥራ','ትምህርት ቤት','ከተማ','ሀገር','ጊዜ','ገንዘብ','ጤና','ፍቅር','ሕይወት','ዓለም','መጽሐፍ','ፀሐይ','ጨረቃ','ኮከብ','ትልቅ','ትንሽ','አዲስ','አሮጌ','ጥሩ','መጥፎ','ፈጣን','ቀስ','ነጭ','ጥቁር','ቀይ','ሰማያዊ','አረንጓዴ','አንድ','ሁለት','ሦስት','አራት','አምስት','ሳይንስ','ቴክኖሎጂ','ዩኒቨርሲቲ','መንግሥት','ኢኮኖሚ'] },
            { id:'tl-teen', name:'Filipino (Teen)', flag:'\uD83C\uDDF5\uD83C\uDDED', color:'#0369a1', cat:'lang', age:'13-18',
              desc:'Filipino/Tagalog academic',
              words:['kamusta','salamat','oo','hindi','tubig','bahay','pamilya','kaibigan','trabaho','paaralan','lungsod','bansa','oras','pera','kalusugan','pagmamahal','buhay','mundo','aklat','araw','buwan','bituin','malaki','maliit','bago','luma','mabuti','masama','mabilis','mabagal','puti','itim','pula','asul','berde','isa','dalawa','tatlo','apat','lima','anim','pito','walo','siyam','sampu','sandaan','agham','teknolohiya','unibersidad','gobyerno','ekonomiya'] },
            { id:'uk-teen', name:'Ukrainian (Teen)', flag:'\uD83C\uDDFA\uD83C\uDDE6', color:'#eab308', cat:'lang', age:'13-18',
              desc:'Ukrainian academic vocabulary',
              words:['привіт','дякую','так','ні','вода','дім','сім\'я','друг','робота','школа','місто','країна','час','гроші','здоров\'я','кохання','життя','світ','книга','сонце','місяць','зірка','великий','малий','новий','старий','добрий','поганий','швидкий','повільний','білий','чорний','червоний','синій','зелений','один','два','три','чотири','п\'ять','наука','технологія','університет','уряд','економіка','свобода','демократія'] },
            { id:'ro-teen', name:'Romanian (Teen)', flag:'\uD83C\uDDF7\uD83C\uDDF4', color:'#0891b2', cat:'lang', age:'13-18',
              desc:'Romanian academic vocabulary',
              words:['bună','mulțumesc','da','nu','apă','casă','familie','prieten','muncă','școală','oraș','țară','timp','bani','sănătate','dragoste','viață','lume','carte','soare','lună','stea','mare','mic','nou','vechi','bun','rău','rapid','lent','alb','negru','roșu','albastru','verde','unu','doi','trei','patru','cinci','știință','tehnologie','universitate','guvern','economie'] },
            { id:'hu-teen', name:'Hungarian (Teen)', flag:'\uD83C\uDDED\uD83C\uDDFA', color:'#b91c1c', cat:'lang', age:'13-18',
              desc:'Hungarian academic vocabulary',
              words:['szia','köszönöm','igen','nem','víz','ház','család','barát','munka','iskola','város','ország','idő','pénz','egészség','szerelem','élet','világ','könyv','nap','hold','csillag','nagy','kicsi','új','régi','jó','rossz','gyors','lassú','fehér','fekete','piros','kék','zöld','egy','kettő','három','négy','öt','tudomány','technológia','egyetem','kormány','gazdaság'] },
        ];

        // ─── DOMAIN CAPSULES (specialized knowledge) ───
        const DOMAIN_CAPSULES = [
            { id:'med-core', name:'Medical Core', flag:'\u2695', color:'#ef4444', cat:'medical', age:'all',
              desc:'Essential medical terminology, anatomy, first aid, symptoms',
              words:['diagnosis','symptom','treatment','prescription','surgery','anesthesia','antibiotics','vaccine','immune','infection','inflammation','chronic','acute','benign','malignant','fracture','hemorrhage','cardiac','respiratory','neurological','triage','vital signs','blood pressure','heart rate','temperature','pulse','oxygen','defibrillator','CPR','tourniquet','splint','concussion','stroke','seizure','allergic reaction','anaphylaxis','diabetes','hypertension','asthma','pneumonia','bronchitis','arthritis','osteoporosis','migraine','anemia','depression','anxiety','PTSD','rehabilitation','prognosis','remission'] },
            { id:'med-anatomy', name:'Anatomy', flag:'\uD83E\uDDB4', color:'#f97316', cat:'medical', age:'all',
              desc:'Human body systems and organ terminology',
              words:['skull','spine','ribcage','pelvis','femur','tibia','humerus','clavicle','scapula','sternum','heart','lungs','liver','kidneys','brain','stomach','intestines','pancreas','spleen','bladder','esophagus','trachea','diaphragm','artery','vein','capillary','nerve','muscle','tendon','ligament','cartilage','bone marrow','cerebrum','cerebellum','hypothalamus','pituitary','thyroid','adrenal','lymph node','platelet','hemoglobin','neuron','synapse','dendrite','axon','mitochondria','DNA','RNA','chromosome','genome','protein'] },
            { id:'med-mental', name:'Mental Health', flag:'\uD83E\uDDE0', color:'#8b5cf6', cat:'medical', age:'13+',
              desc:'Mental health terminology, conditions, and support',
              words:['anxiety','depression','PTSD','bipolar','schizophrenia','OCD','ADHD','autism','dyslexia','therapy','counseling','psychiatry','psychology','mindfulness','meditation','coping','resilience','burnout','self-care','boundaries','trauma','trigger','dissociation','panic attack','insomnia','eating disorder','addiction','recovery','relapse','stigma','neurodivergent','cognitive behavioral','dialectical','psychotherapy','serotonin','dopamine','cortisol','emotional regulation','grounding','safe space'] },
            { id:'survival', name:'Survival Essentials', flag:'\u26FA', color:'#16a34a', cat:'survival', age:'all',
              desc:'Emergency survival, first aid, wilderness, disaster preparedness',
              words:['shelter','water purification','fire starting','navigation','compass','signal mirror','emergency blanket','first aid kit','tourniquet','splint','hypothermia','dehydration','heatstroke','snake bite','bear safety','lightning','flood','earthquake','tornado','hurricane','evacuation','emergency radio','whistle','flare','SOS','morse code','knots','bowline','figure eight','tarp','paracord','water filter','solar still','edible plants','poisonous plants','mushroom identification','fishing','trapping','foraging','orienteering','topographic map','GPS coordinates','latitude','longitude','altitude','barometric pressure','weather signs','cloud types','wind direction','tidal patterns'] },
            { id:'survival-urban', name:'Urban Survival', flag:'\uD83C\uDFD9', color:'#0891b2', cat:'survival', age:'all',
              desc:'Urban emergency preparedness and safety',
              words:['emergency exit','fire escape','shelter in place','lockdown','power outage','water shutoff','gas leak','carbon monoxide','smoke detector','fire extinguisher','emergency contact','go bag','72 hour kit','water storage','food storage','generator','flashlight','battery','first aid','self defense','situational awareness','exit strategy','rally point','communication plan','ham radio','walkie talkie','solar charger','water bob','duct tape','multitool','cash reserve','document copies','insurance','emergency fund','community network','mutual aid','neighborhood watch'] },
            { id:'edu-stem', name:'STEM Foundations', flag:'\uD83D\uDD2C', color:'#3b82f6', cat:'education', age:'13+',
              desc:'Science, technology, engineering, math core concepts',
              words:['hypothesis','variable','control group','experiment','observation','data','analysis','conclusion','peer review','scientific method','atom','molecule','element','compound','reaction','energy','force','mass','velocity','acceleration','gravity','friction','momentum','wavelength','frequency','spectrum','photosynthesis','evolution','DNA','mutation','natural selection','ecosystem','biodiversity','climate','geology','plate tectonics','algorithm','binary','encryption','database','network','server','protocol','API','machine learning','neural network','quantum','relativity','calculus','statistics'] },
            { id:'edu-humanities', name:'Humanities', flag:'\uD83C\uDFDB', color:'#a78bfa', cat:'education', age:'13+',
              desc:'History, philosophy, literature, social science',
              words:['democracy','republic','monarchy','imperialism','colonialism','revolution','renaissance','enlightenment','industrialization','globalization','capitalism','socialism','communism','fascism','liberalism','conservatism','nationalism','federalism','constitution','bill of rights','civil rights','suffrage','abolition','apartheid','genocide','diplomacy','sovereignty','treaty','embargo','sanction','ethics','morality','existentialism','nihilism','pragmatism','empiricism','rationalism','metaphysics','epistemology','aesthetics','rhetoric','allegory','symbolism','irony','satire','narrative','protagonist','antagonist','theme','motif'] },
            { id:'career-tech', name:'Tech Careers', flag:'\uD83D\uDCBB', color:'#06b6d4', cat:'career', age:'16+',
              desc:'Software engineering, data science, cybersecurity paths',
              words:['frontend','backend','fullstack','DevOps','SRE','data engineer','data scientist','ML engineer','product manager','UX designer','QA engineer','security analyst','cloud architect','mobile developer','embedded systems','firmware','compiler','interpreter','runtime','framework','library','API','microservices','containerization','orchestration','CI/CD','version control','code review','pair programming','agile','scrum','sprint','kanban','standup','retrospective','deployment','monitoring','logging','debugging','profiling','refactoring','technical debt','documentation','open source','portfolio','internship','mentorship','certification'] },
            { id:'career-health', name:'Healthcare Careers', flag:'\uD83C\uDFE5', color:'#ef4444', cat:'career', age:'16+',
              desc:'Medical, nursing, pharmacy, research career paths',
              words:['physician','surgeon','nurse practitioner','registered nurse','pharmacist','physical therapist','occupational therapist','respiratory therapist','radiologist','anesthesiologist','pathologist','epidemiologist','biostatistician','clinical trial','residency','fellowship','board certification','medical school','MCAT','USMLE','NCLEX','continuing education','specialization','subspecialty','primary care','emergency medicine','pediatrics','geriatrics','oncology','cardiology','neurology','psychiatry','dermatology','orthopedics','obstetrics','gynecology','public health','preventive medicine','telemedicine','healthcare administration'] },
            { id:'career-trades', name:'Skilled Trades', flag:'\uD83D\uDD27', color:'#f59e0b', cat:'career', age:'16+',
              desc:'Electrician, plumbing, HVAC, welding, construction',
              words:['electrician','plumber','HVAC technician','welder','carpenter','machinist','diesel mechanic','auto technician','elevator installer','lineworker','pipefitter','ironworker','mason','roofer','glazier','apprenticeship','journeyman','master tradesperson','union','OSHA','safety certification','blueprint reading','building code','permit','inspection','voltage','amperage','resistance','circuit breaker','conduit','solder','flux','compression fitting','manifold','refrigerant','BTU','thermostat','TIG welding','MIG welding','arc welding','lathe','CNC','precision measurement','torque','hydraulic','pneumatic'] },
            { id:'news-2025', name:'News Trends (Recent)', flag:'\uD83D\uDCF0', color:'#f43f5e', cat:'trends', age:'all',
              desc:'Recent global news vocabulary, world events, trending terms',
              words:['artificial intelligence','large language model','generative AI','deepfake','misinformation','disinformation','fact check','climate crisis','renewable energy','carbon neutral','net zero','sustainability','green transition','electric vehicle','heat pump','wildfire','drought','flooding','extreme weather','pandemic','endemic','vaccine hesitancy','mental health crisis','cost of living','inflation','recession','supply chain','semiconductor shortage','chip manufacturing','geopolitical tension','sanctions','cybersecurity','ransomware','data breach','cryptocurrency','blockchain','central bank digital currency','space exploration','mars mission','quantum computing','fusion energy','CRISPR','gene therapy','biodiversity loss','ocean acidification','microplastics','housing crisis','immigration','refugee crisis','democratic backsliding','election integrity'] },
            { id:'news-phrases', name:'News Phrases', flag:'\uD83D\uDDE3', color:'#0ea5e9', cat:'trends', age:'all',
              desc:'Common news phrases and political language patterns',
              words:['breaking news','developing story','sources say','according to officials','in a statement','press conference','bipartisan support','executive order','landmark decision','unprecedented','historic','controversial','alleged','unconfirmed reports','crisis talks','peace negotiations','ceasefire agreement','humanitarian aid','emergency declaration','state of emergency','public outcry','grassroots movement','viral moment','social media backlash','whistleblower','leaked documents','ongoing investigation','under scrutiny','calls for resignation','economic downturn','market volatility','job creation','wage growth','trade deficit','budget deficit','national debt','infrastructure spending','diplomatic relations','bilateral agreement','multilateral cooperation'] },
            { id:'shakespeare', name:'Shakespeare Corpus', flag:'\uD83C\uDFAD', color:'#c084fc', cat:'culture', age:'all',
              desc:'Iconic Shakespeare vocabulary and phrases',
              words:['forsooth','wherefore','hath','doth','thou','thee','thine','prithee','methinks','perchance','anon','betwixt','ere','hence','hither','thither','whence','whilst','verily','alas','nay','aye','fie','marry','sirrah','villain','tempest','midsummer','hamlet','othello','macbeth','prospero','oberon','titania','puck','ariel','cordelia','desdemona','ophelia','juliet','rosalind','portia','brevity','conscience','honour','patience','mercy','wisdom','soliloquy','fortune','valour','dagger','parting','sorrow','cauldron','bubble'] },
            { id:'rhythm', name:'Musical Rhythm', flag:'\uD83C\uDFB5', color:'#f472b6', cat:'culture', age:'all',
              desc:'Musical terms, tempo markings, rhythm notation',
              words:['allegro','andante','crescendo','diminuendo','forte','piano','staccato','legato','fortissimo','pianissimo','adagio','presto','vivace','largo','moderato','rubato','fermata','glissando','arpeggio','tremolo','vibrato','syncopation','polyrhythm','downbeat','upbeat','backbeat','groove','cadence','harmony','melody','counterpoint','fugue','sonata','rondo','waltz','samba','tango','bolero','nocturne','etude','prelude','scherzo','coda','tempo','timbre','octave','chord','scale'] },
            { id:'dance', name:'Dance Moves', flag:'\uD83D\uDC83', color:'#fb923c', cat:'culture', age:'all',
              desc:'Dance terminology and movement vocabulary',
              words:['pirouette','plié','relevé','tendu','jeté','arabesque','chassé','fouetté','glissade','assemblé','moonwalk','breakdance','toprock','footwork','freeze','windmill','popping','locking','waving','tutting','krumping','shimmy','grapevine','charleston','foxtrot','quickstep','cha cha','jive','rumba','samba','salsa','bachata','merengue','flamenco','kathak','bharatanatyam','capoeira','contemporary','lyrical','jazz','tap','hip hop','ballet','folk','freestyle','isolation'] },
            { id:'books', name:'Classic Literature', flag:'\uD83D\uDCDA', color:'#60a5fa', cat:'culture', age:'all',
              desc:'Opening lines and iconic phrases from classic literature',
              words:['it was the best of times','call me ishmael','all happy families','it is a truth universally','once upon a time','in a hole in the ground','all animals are equal','to be or not to be','all the worlds a stage','something is rotten','friends romans countrymen','double double toil and trouble','brevity is the soul of wit','parting is such sweet sorrow'] },
        ];

        // ─── DEAD / ANCIENT LANGUAGE CAPSULES ───
        const ANCIENT_CAPSULES = [
            { id:'latin', name:'Latin (Classical)', flag:'\uD83C\uDFDB', color:'#d4a017', cat:'ancient', age:'all',
              desc:'Classical Latin — root of Romance languages, scientific/legal/medical terminology',
              words:['aqua','terra','ignis','aer','lux','vita','mors','amor','bellum','pax','rex','lex','vox','via','veritas','virtus','corpus','animus','tempus','opus','homo','deus','mundus','caelum','stella','luna','sol','fons','silva','mare','mons','flumen','urbs','civitas','populus','senatus','consul','imperium','libertas','iustitia','sapientia','fortuna','gloria','fides','spes','caritas','natura','ratio','scientia','ars','memoria'] },
            { id:'ancient-greek', name:'Ancient Greek', flag:'\u03A9', color:'#818cf8', cat:'ancient', age:'all',
              desc:'Classical Greek — philosophy, democracy, mathematics, mythology roots',
              words:['\u03BB\u03CC\u03B3\u03BF\u03C2','\u03C8\u03C5\u03C7\u03AE','\u03B1\u03C1\u03B5\u03C4\u03AE','\u03C3\u03BF\u03C6\u03AF\u03B1','\u03C6\u03B9\u03BB\u03BF\u03C3\u03BF\u03C6\u03AF\u03B1','\u03B4\u03B7\u03BC\u03BF\u03BA\u03C1\u03B1\u03C4\u03AF\u03B1','\u03B1\u03BB\u03AE\u03B8\u03B5\u03B9\u03B1','\u03BA\u03CC\u03C3\u03BC\u03BF\u03C2','\u03B8\u03B5\u03CC\u03C2','\u03B1\u03BD\u03B8\u03C1\u03C9\u03C0\u03BF\u03C2','logos','psyche','arete','sophia','philosophia','demokratia','aletheia','kosmos','theos','anthropos','polis','agora','techne','episteme','ethos','pathos','mythos','nous','kairos','chronos','hubris','nemesis','catharsis','praxis','thesis','antithesis','synthesis','cosmos','chaos','genesis','exodus','alpha','omega','delta','sigma','gamma','lambda','phi','theta','pi','epsilon'] },
            { id:'sanskrit', name:'Sanskrit', flag:'\u0950', color:'#f472b6', cat:'ancient', age:'all',
              desc:'Sanskrit — sacred language of Hinduism, root of Indo-European linguistics',
              words:['\u0927\u0930\u094D\u092E','\u0915\u0930\u094D\u092E','\u092F\u094B\u0917','\u092E\u0928\u094D\u0924\u094D\u0930','\u0938\u0942\u0924\u094D\u0930','\u0935\u0947\u0926','\u0917\u0941\u0930\u0941','\u0926\u0947\u0935','\u0906\u0924\u094D\u092E\u0928\u094D','dharma','karma','yoga','mantra','sutra','veda','guru','deva','atman','brahman','nirvana','avatar','chakra','tantra','maya','moksha','samsara','ahimsa','prana','rishi','ashram','namaste','om','shanti','satya','vidya','jnana','bhakti','tapas','seva','drishti','mudra','bandha','kundalini','samadhi','prajna','metta','karuna','sangha','dharana','dhyana'] },
            { id:'old-english', name:'Old English', flag:'\u2694', color:'#a3a3a3', cat:'ancient', age:'all',
              desc:'Anglo-Saxon (449-1066 CE) — Beowulf, runes, Germanic roots of English',
              words:['wyrd','weregild','wergeld','thane','earl','churl','fyrd','mead','hoard','wyrm','draca','beorn','helm','byrne','sweord','scield','spere','boga','here','cyning','ealdorman','witan','moot','shire','hundred','hide','burh','ham','tun','feld','dun','mere','broc','wudu','holm','ealand','middangeard','heofon','hel','aelf','dweorg','ent','troll','scop','gleeman','runestave','blot','symbel','frith','guild','folkmoot'] },
            { id:'aramaic', name:'Aramaic', flag:'\u2721', color:'#fbbf24', cat:'ancient', age:'all',
              desc:'Aramaic — lingua franca of ancient Near East, language of Jesus and Talmud',
              words:['\u05D0\u05D1\u05D0','\u05D0\u05DE\u05D0','\u05DE\u05DC\u05DB\u05D0','\u05E9\u05DE\u05D9\u05D0','\u05D0\u05E8\u05E2\u05D0','abba','imma','malka','shemaya','ara','bar','brikh','gadol','din','hevel','zayin','khet','tet','yod','kaf','lamed','mem','nun','samekh','ayin','pe','tsade','qof','resh','shin','tav','maranatha','talitha kumi','eloi eloi lama sabachthani','ephphatha','mammon','golgotha','gabbatha','hosanna','amen','hallelujah','sabbath','messiah','rabbi','pharisee','sadducee'] },
            { id:'egyptian', name:'Egyptian Hieroglyphs', flag:'\uD83C\uDFFA', color:'#d4a017', cat:'ancient', age:'all',
              desc:'Ancient Egyptian — 3000+ years of hieroglyphic writing, monumental inscriptions',
              words:['\uD80C\uDC00','\uD80C\uDC01','\uD80C\uDC02','\uD80C\uDC03','\uD80C\uDC04','ankh','djed','was','ka','ba','akh','maat','ra','aten','amun','isis','osiris','horus','thoth','anubis','pharaoh','neter','per-aa','hieroglyph','cartouche','scarab','papyrus','obelisk','pyramid','sphinx','sarcophagus','canopic','stele','pylon','hypostyle','mammisi','naos','benben','uraeus','crook','flail','djam','sekhem','hedjet','deshret','pschent','nemes','atef','khepresh'] },
            { id:'cuneiform', name:'Sumerian Cuneiform', flag:'\uD809\uDC00', color:'#a3a3a3', cat:'ancient', age:'all',
              desc:'Oldest known writing system (3400 BCE) — Mesopotamia, clay tablets',
              words:['\uD809\uDC00','\uD809\uDC01','\uD809\uDC02','\uD809\uDC03','\uD809\uDC04','an','ki','en','lugal','nam','dingir','ninda','a','e','mu','sag','kur','uru','gar','gal','tur','dug','nig','me','su','gin','tug','lu','ama','ad','dumu','nin','ab','ud','iti','ezen','alan','gish','kiri','apin','ur','gir','shar','lam','banda','mah','dugud','sig','zalag','babbar','gi'] },
            { id:'runic', name:'Elder Futhark (Runic)', flag:'\u16A0', color:'#6b7280', cat:'ancient', age:'all',
              desc:'Germanic runes (150-800 CE) — Norse/Anglo-Saxon divination and inscription',
              words:['\u16A0 fehu','\u16A2 uruz','\u16A6 thurisaz','\u16A8 ansuz','\u16B1 raidho','\u16B4 kenaz','\u16B7 gebo','\u16B9 wunjo','\u16BA hagalaz','\u16BE naudiz','\u16C1 isa','\u16C3 jera','\u16C7 eihwaz','\u16C8 perthro','\u16C9 algiz','\u16CA sowilo','\u16CF tiwaz','\u16D2 berkana','\u16D6 ehwaz','\u16D7 mannaz','\u16DA laguz','\u16DC ingwaz','\u16DE othala','\u16DF dagaz','rune','stave','galdr','seidr','volva','skald','edda','saga','thing','blot','sumbel','wyrd','orlog','hamingja','hugr','fylgja','hamr','valknut','mjolnir','yggdrasil'] },
            { id:'proto-indo', name:'Proto-Indo-European', flag:'\uD83C\uDF0D', color:'#9333ea', cat:'ancient', age:'all',
              desc:'Reconstructed ancestor of most European + Indian languages (4500-2500 BCE)',
              words:['*ph2ter (father)','*meh2ter (mother)','*bhreh2ter (brother)','*swesōr (sister)','*suHnus (son)','*dhugh2ter (daughter)','*h2ster (star)','*meh1ns (moon)','*seh2wol (sun)','*h2ekweh2 (water)','*peh2wr (fire)','*dhghom (earth)','*nebhos (cloud)','*snigwh (snow)','*h1esh2r (blood)','*h3esth1 (bone)','*h2ous (ear)','*h3ekw (eye)','*pods (foot)','*gombhos (tooth)','*ḱerd (heart)','*nōs (nose)','*ḱwōn (dog)','*h1eḱwos (horse)','*gʷōws (cow)','*h2owi (sheep)','*wl̥kʷos (wolf)','*h2ed (eat)','*peh3 (drink)','*gʷem (come)','*h1ey (go)','*weid (know)','*ḱlew (hear)','*deḱ (take)','*deh3 (give)','*bher (carry)','*steh2 (stand)','*sed (sit)','*legh (lie down)','*gʷen (woman)'] },
        ];

        // ─── ACCESSIBILITY / COMMUNICATION SYSTEM CAPSULES ───
        const ACCESS_CAPSULES = [
            { id:'asl-finger', name:'ASL Fingerspelling', flag:'\u{1F91F}', color:'#f472b6', cat:'access', age:'all',
              desc:'American Sign Language fingerspelling — hand shapes for each letter',
              words:['A: fist thumb-side','B: flat hand up','C: curved hand','D: index up circle','E: curled fingers','F: OK sign inverted','G: point sideways','H: two fingers sideways','I: pinky up','J: pinky up + arc','K: two fingers up thumb','L: L-shape','M: three over thumb','N: two over thumb','O: fingertips touch','P: K inverted down','Q: G pointing down','R: crossed fingers','S: fist thumb-front','T: thumb through fist','U: two fingers up','V: peace sign','W: three fingers up','X: hooked index','Y: hang loose','Z: index draws Z'] },
            { id:'asl-common', name:'ASL Common Signs', flag:'\u270B', color:'#ec4899', cat:'access', age:'all',
              desc:'Essential ASL signs — greetings, questions, daily communication',
              words:['hello (wave)','goodbye (wave away)','please (rub chest)','thank you (chin forward)','sorry (fist circles chest)','yes (fist nod)','no (fingers snap shut)','help (fist on palm lift)','stop (chop palm)','more (fingertips tap)','water (W on chin)','food (fingers to mouth)','bathroom (T shake)','home (kiss to ear)','family (F circles)','friend (hook index)','love (cross arms)','happy (brush up chest)','sad (hands down face)','angry (claw from face)','tired (droop hands chest)','sick (middle to head+belly)','hurt (index twist together)','want (claws pull in)','need (X nod down)','understand (flick index up)','dont understand (finger off forehead)','again (bent hand tips palm)','different (cross index apart)','same (Y together)','name (H tap H)','how (backs together roll)','what (finger across palm)','where (wag index)','when (circle index on index)','why (fingers off forehead wiggle)','who (circle at lips)','deaf (point ear close mouth)','hearing (circle at mouth)','sign language (hands alternate circle)'] },
            { id:'bsl', name:'BSL (British Sign)', flag:'\uD83C\uDDEC\uD83C\uDDE7', color:'#6366f1', cat:'access', age:'all',
              desc:'British Sign Language — two-handed fingerspelling, distinct from ASL',
              words:['A: fist thumb-up','B: flat hand palm-out','C: curved hand','D: index on thumb-circle','E: fingertips on thumb','F: two fingers on thumb','G: point index','H: point two fingers','I: pinky on fist','J: pinky + motion','K: two up thumb-mid','L: L-shape','M: three down on thumb','N: two down on thumb','O: circle','P: point index down','Q: index+thumb down','R: cross fingers','S: fist','T: thumb through','U: two up','V: two apart','W: three up','X: hook index','Y: pinky+thumb out','Z: index draws Z','hello','thank you','please','sorry','yes','no','deaf','hearing','interpreter','sign language'] },
            { id:'braille-alpha', name:'Braille Alphabet', flag:'\u2800', color:'#e5e7eb', cat:'access', age:'all',
              desc:'Grade 1 Braille — tactile reading system, Unicode dot patterns',
              words:['\u2801 a','\u2803 b','\u2809 c','\u2819 d','\u2811 e','\u280B f','\u281B g','\u2813 h','\u280A i','\u281A j','\u2805 k','\u2807 l','\u280D m','\u281D n','\u2815 o','\u280F p','\u281F q','\u2817 r','\u280E s','\u281E t','\u2825 u','\u2827 v','\u283A w','\u282D x','\u283D y','\u2835 z','\u283C #(number)','\u2824 .period','\u2804 ,comma','\u2826 ?question','\u2816 !exclaim','\u2832 ;semi','\u2812 :colon'] },
            { id:'braille-grade2', name:'Braille Contractions', flag:'\u2803', color:'#d1d5db', cat:'access', age:'all',
              desc:'Grade 2 Braille — contractions and short forms for faster reading',
              words:['and \u282F','for \u282B','of \u2829','the \u281C','with \u283E','but \u2803','can \u2809','do \u2819','every \u2811','from \u280B','go \u281B','have \u2813','just \u280A','knowledge \u2805','like \u2807','more \u280D','not \u281D','people \u280F','quite \u281F','rather \u2817','so \u280E','that \u281E','us \u2825','very \u2827','will \u283A','it \u282D','you \u283D','as \u2835','child \u2809\u2813','shall \u280E\u2813','this \u281E\u2813','which \u283A\u2813','enough \u2811\u281D','were \u283E\u2811\u2817\u2811'] },
            { id:'morse', name:'Morse Code', flag:'\u2022', color:'#22d3ee', cat:'access', age:'all',
              desc:'International Morse Code — dots and dashes, radio communication',
              words:['A \u00B7\u2013','B \u2013\u00B7\u00B7\u00B7','C \u2013\u00B7\u2013\u00B7','D \u2013\u00B7\u00B7','E \u00B7','F \u00B7\u00B7\u2013\u00B7','G \u2013\u2013\u00B7','H \u00B7\u00B7\u00B7\u00B7','I \u00B7\u00B7','J \u00B7\u2013\u2013\u2013','K \u2013\u00B7\u2013','L \u00B7\u2013\u00B7\u00B7','M \u2013\u2013','N \u2013\u00B7','O \u2013\u2013\u2013','P \u00B7\u2013\u2013\u00B7','Q \u2013\u2013\u00B7\u2013','R \u00B7\u2013\u00B7','S \u00B7\u00B7\u00B7','T \u2013','U \u00B7\u00B7\u2013','V \u00B7\u00B7\u00B7\u2013','W \u00B7\u2013\u2013','X \u2013\u00B7\u00B7\u2013','Y \u2013\u00B7\u2013\u2013','Z \u2013\u2013\u00B7\u00B7','SOS \u00B7\u00B7\u00B7\u2013\u2013\u2013\u00B7\u00B7\u00B7','1 \u00B7\u2013\u2013\u2013\u2013','2 \u00B7\u00B7\u2013\u2013\u2013','3 \u00B7\u00B7\u00B7\u2013\u2013','4 \u00B7\u00B7\u00B7\u00B7\u2013','5 \u00B7\u00B7\u00B7\u00B7\u00B7','6 \u2013\u00B7\u00B7\u00B7\u00B7','7 \u2013\u2013\u00B7\u00B7\u00B7','8 \u2013\u2013\u2013\u00B7\u00B7','9 \u2013\u2013\u2013\u2013\u00B7','0 \u2013\u2013\u2013\u2013\u2013'] },
            { id:'semaphore', name:'Flag Semaphore', flag:'\uD83D\uDEA9', color:'#f97316', cat:'access', age:'all',
              desc:'Visual flag signaling system — each letter is a two-arm position',
              words:['A: down+right-low','B: down+right-mid','C: down+right-high','D: down+up','E: down+left-high','F: down+left-mid','G: down+left-low','H: right-low+right-mid','I: right-low+right-high','J: right-mid+up','K: up+right-low','L: right-high+right-low','M: right-mid+right-low','N: left-low+right-low','O: right-low+right-high','P: up+right-mid','Q: right-high+right-mid','R: left-high+right-mid','S: left-mid+right-mid','T: left-low+right-mid','U: right-high+up','V: left-low+up','W: left-high+left-mid','X: left-high+left-low','Y: left-mid+up','Z: left-low+right-mid','error (8 waves)','attention','numeric','cancel'] },
            { id:'solfeggio', name:'Solfeggio Frequencies', flag:'\uD83C\uDFB6', color:'#c084fc', cat:'access', age:'all',
              desc:'Ancient Solfeggio scale — 9 sacred frequencies, healing tones, resonance patterns, Gregorian chant roots',
              words:['174 Hz (foundation)','285 Hz (quantum cognition)','396 Hz Ut (liberating guilt)','417 Hz Re (undoing situations)','432 Hz (universal tuning)','528 Hz Mi (transformation/DNA repair)','639 Hz Fa (connecting relationships)','741 Hz Sol (awakening intuition)','852 Hz La (returning to spiritual order)','963 Hz Si (divine consciousness)','Do (Ut queant laxis)','Re (Resonare fibris)','Mi (Mira gestorum)','Fa (Famuli tuorum)','Sol (Solve polluti)','La (Labii reatum)','Si (Sancte Iohannes)','A4=432 Hz (Verdi tuning)','A4=440 Hz (concert pitch)','A4=444 Hz (healing pitch)','Schumann resonance 7.83 Hz','Earth frequency 136.1 Hz','golden ratio 1.618','Pythagorean comma','harmonic series','overtone','fundamental','resonance','sympathetic vibration','standing wave','node','antinode','octave ratio 2:1','perfect fifth 3:2','perfect fourth 4:3','major third 5:4','minor third 6:5','tritone (diabolus in musica)','Fibonacci in music','cymatics (sound makes shape)','binaural beats','isochronic tones','singing bowls','tuning forks','crystal resonance','mantra','Om 136.1 Hz','Aum'] },
            { id:'guidonian', name:'Guidonian Hand', flag:'\u270B', color:'#d946ef', cat:'access', age:'all',
              desc:'Guido d\'Arezzo\'s medieval hand notation — 20 pitch positions mapped to joints of the left hand, used to teach sight-singing and Gregorian chant',
              words:['Gamma ut (thumb tip)','A re (thumb base)','B mi (index tip)','C fa (index mid)','D sol (index base)','E la (middle tip)','F fa (middle mid)','G sol (middle base)','a la (ring tip)','b mi (ring mid)','b fa (ring mid alt)','c sol (ring base)','d la (pinky tip)','e fa (pinky mid)','f sol (pinky base)','g la (palm center)','hexachord naturale (C-A)','hexachord durum (G-E)','hexachord molle (F-D)','mutation (hexachord switch)','vox (syllable name)','clavis (letter name)','ut (first of hexachord)','re (second)','mi (third)','fa (fourth)','sol (fifth)','la (sixth)','solmization','sight-singing','musica ficta','musica recta','neume (notational mark)','punctum (single note)','virga (ascending note)','clivis (descending pair)','torculus (low-high-low)','porrectus (high-low-high)','scandicus (ascending three)','climacus (descending three)','quilisma (ornamental)','liquescent neume','custos (guide note)','staff lines','clef (C clef)','Guido d\'Arezzo (inventor)','Micrologus (treatise)','11th century','Benedictine monk','Pomposa Abbey','Arezzo cathedral'] },
            { id:'baseball-short', name:'Baseball Shorthand', flag:'\u26BE', color:'#ef4444', cat:'access', age:'all',
              desc:'Baseball scoring notation — position numbers, play abbreviations, box score symbols used by scorekeepers worldwide',
              words:['1 pitcher','2 catcher','3 first base','4 second base','5 third base','6 shortstop','7 left field','8 center field','9 right field','K strikeout','K\u0336 strikeout looking','BB walk','IBB intentional walk','HBP hit by pitch','1B single','2B double','3B triple','HR home run','GDP ground into double play','FC fielders choice','E error','PB passed ball','WP wild pitch','SB stolen base','CS caught stealing','BK balk','SAC sacrifice bunt','SF sacrifice fly','RBI runs batted in','R run scored','H hit','AB at bat','PA plate appearance','LOB left on base','IP innings pitched','ERA earned run average','WHIP walks+hits per inning','OBP on base percentage','SLG slugging percentage','OPS on base plus slugging','AVG batting average','W win','L loss','SV save','HLD hold','BS blown save','QS quality start','CG complete game','SO shutout','NH no-hitter','PG perfect game','PH pinch hitter','PR pinch runner','DP double play','TP triple play','IF infield fly','6-4-3 (classic double play)','4-6-3 (reverse double play)','1-6-3 (pitcher to short to first)','5-4-3 (third to second to first)','F7 fly out to left','L6 line out to short','G3 ground out to first','P2 pop out to catcher'] },
        ];

        // ─── ENCODING / CODE SYSTEM CAPSULES ───
        const ENCODING_CAPSULES = [
            { id:'ascii', name:'ASCII Table', flag:'\u2336', color:'#22d3ee', cat:'encoding', age:'all',
              desc:'American Standard Code for Information Interchange — 128 characters',
              words:['NUL 0x00','SOH 0x01','STX 0x02','ETX 0x03','EOT 0x04','BEL 0x07','BS 0x08','TAB 0x09','LF 0x0A','CR 0x0D','ESC 0x1B','SP 0x20','! 0x21','\" 0x22','# 0x23','$ 0x24','% 0x25','& 0x26','( 0x28',') 0x29','* 0x2A','+ 0x2B',', 0x2C','- 0x2D','. 0x2E','/ 0x2F','0 0x30','9 0x39','A 0x41','Z 0x5A','a 0x61','z 0x7A','DEL 0x7F','printable 0x20-0x7E','control 0x00-0x1F','uppercase 0x41-0x5A','lowercase 0x61-0x7A','digits 0x30-0x39'] },
            { id:'hex-patterns', name:'Hex Patterns', flag:'\u2B22', color:'#fb923c', cat:'encoding', age:'all',
              desc:'Common hexadecimal patterns, magic numbers, and debug markers',
              words:['0xDEAD','0xBEEF','0xCAFE','0xBABE','0xFACE','0xFEED','0xC0DE','0xD00D','0xF00D','0xFF','0x00','0x0A','0x0D','0x1B','0x7F','0xFFFF','0xFFFFFFFF','0x55AA (MBR)','0x7F454C46 (ELF)','0x504B (ZIP)','0x89504E47 (PNG)','0xFFD8FF (JPEG)','0x47494638 (GIF)','0x25504446 (PDF)','0xCAFEBABE (Java)','0xFEFF (BOM)','0x4D5A (EXE)','0x1F8B (GZIP)','0xD0CF11E0 (DOC)','0x00000018 (MP4)','big-endian','little-endian','nibble','byte','word','dword','qword'] },
            { id:'unicode-blocks', name:'Unicode Blocks', flag:'\u2102', color:'#a78bfa', cat:'encoding', age:'all',
              desc:'Unicode standard — character encoding for all writing systems',
              words:['U+0000 Basic Latin','U+0080 Latin-1','U+0100 Latin Extended-A','U+0370 Greek','U+0400 Cyrillic','U+0530 Armenian','U+0590 Hebrew','U+0600 Arabic','U+0900 Devanagari','U+0980 Bengali','U+0E00 Thai','U+1000 Myanmar','U+10A0 Georgian','U+1100 Hangul Jamo','U+2000 General Punctuation','U+2190 Arrows','U+2200 Mathematical Operators','U+2580 Block Elements','U+2800 Braille','U+3000 CJK Symbols','U+4E00 CJK Unified','U+AC00 Hangul','U+D800 Surrogates','U+E000 Private Use','U+1F600 Emoticons','U+1F300 Misc Symbols','UTF-8','UTF-16','UTF-32','BOM','code point','grapheme','glyph','ligature','diacritical','combining character'] },
            { id:'binary-base', name:'Binary & Bases', flag:'\u2780', color:'#16a34a', cat:'encoding', age:'all',
              desc:'Number systems — binary, octal, decimal, hexadecimal, base64',
              words:['0b0000=0','0b0001=1','0b0010=2','0b0011=3','0b0100=4','0b0101=5','0b0110=6','0b0111=7','0b1000=8','0b1111=15','0b11111111=255','0o0=0','0o7=7','0o10=8','0o777=511','0x0=0','0xF=15','0xFF=255','base2 binary','base8 octal','base10 decimal','base16 hex','base32','base64','base58 (bitcoin)','base85 (ascii85)','MSB','LSB','twos complement','sign bit','mantissa','exponent','IEEE 754','NaN','infinity','underflow','overflow'] },
            { id:'code-python', name:'Python Keywords', flag:'\uD83D\uDC0D', color:'#3b82f6', cat:'code', age:'all',
              desc:'Python reserved words and built-in functions',
              words:['False','None','True','and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield','print','len','range','type','int','float','str','list','dict','tuple','set','bool','input','open','map','filter','zip','enumerate','sorted','reversed','any','all','isinstance','super','property'] },
            { id:'code-js', name:'JavaScript Keywords', flag:'\uD83D\uDFE8', color:'#f59e0b', cat:'code', age:'all',
              desc:'JavaScript/TypeScript reserved words and common APIs',
              words:['var','let','const','function','return','if','else','for','while','do','switch','case','break','continue','class','extends','new','this','super','import','export','default','async','await','try','catch','finally','throw','typeof','instanceof','void','delete','in','of','yield','static','get','set','constructor','prototype','Promise','fetch','console','document','window','addEventListener','setTimeout','setInterval','JSON','Map','Set','Symbol','Proxy','WeakMap','Reflect','globalThis'] },
            { id:'code-rust', name:'Rust Keywords', flag:'\u2699', color:'#ef4444', cat:'code', age:'all',
              desc:'Rust language keywords and common types',
              words:['fn','let','mut','const','static','struct','enum','impl','trait','type','where','for','loop','while','if','else','match','return','break','continue','move','ref','self','Self','super','crate','mod','pub','use','as','in','unsafe','async','await','dyn','Box','Vec','String','Option','Result','Some','None','Ok','Err','println','macro_rules','derive','Clone','Copy','Debug','Send','Sync','Sized','Drop','Fn','FnMut','FnOnce','Iterator','From','Into'] },
            { id:'code-sql', name:'SQL Keywords', flag:'\uD83D\uDDC3', color:'#06b6d4', cat:'code', age:'all',
              desc:'SQL — Structured Query Language for databases',
              words:['SELECT','FROM','WHERE','INSERT','UPDATE','DELETE','CREATE','DROP','ALTER','TABLE','INDEX','VIEW','JOIN','INNER','LEFT','RIGHT','OUTER','CROSS','ON','AND','OR','NOT','IN','BETWEEN','LIKE','IS NULL','ORDER BY','GROUP BY','HAVING','DISTINCT','AS','UNION','INTERSECT','EXCEPT','EXISTS','COUNT','SUM','AVG','MIN','MAX','CASE','WHEN','THEN','ELSE','END','LIMIT','OFFSET','FETCH','COMMIT','ROLLBACK','TRANSACTION','PRIMARY KEY','FOREIGN KEY','CONSTRAINT','TRIGGER','PROCEDURE'] },
            { id:'code-shell', name:'Shell/Bash', flag:'\uD83D\uDCBB', color:'#84cc16', cat:'code', age:'all',
              desc:'Unix shell commands and Bash scripting keywords',
              words:['echo','cd','ls','pwd','mkdir','rm','cp','mv','cat','grep','sed','awk','find','xargs','sort','uniq','wc','head','tail','tee','pipe |','redirect >','append >>','stdin <','stderr 2>','&& and','|| or','; seq','$VAR','${VAR}','if then fi','for do done','while','case esac','function','return','exit','export','source','alias','chmod','chown','kill','ps','top','df','du','tar','gzip','curl','wget','ssh','scp'] },
            { id:'code-html', name:'HTML/CSS', flag:'\uD83C\uDF10', color:'#e11d48', cat:'code', age:'all',
              desc:'HTML elements and CSS properties for web development',
              words:['<!DOCTYPE>','<html>','<head>','<body>','<div>','<span>','<p>','<a>','<img>','<ul>','<ol>','<li>','<table>','<form>','<input>','<button>','<canvas>','<video>','<audio>','<script>','<style>','<meta>','<link>','display','position','flex','grid','margin','padding','border','color','background','font-size','font-weight','width','height','overflow','z-index','opacity','transform','transition','animation','@media','@keyframes',':root','var()','calc()','clamp()','min()','max()'] },
            { id:'regex', name:'Regex Patterns', flag:'\u2731', color:'#8b5cf6', cat:'code', age:'all',
              desc:'Regular expression syntax — pattern matching across all languages',
              words:['. any char','\\d digit','\\w word char','\\s whitespace','\\b boundary','^ start','$ end','* zero+','+ one+','? optional','{n} exactly n','{n,m} n to m','[abc] char class','[^abc] negated','(group)','(?:non-capture)','(?=lookahead)','(?!neg look)','(?<=lookbehind)','\\1 backreference','| alternation','[A-Z] range','\\t tab','\\n newline','\\r return','(?i) case insens','(?m) multiline','(?s) dotall','.*? lazy','(?P<name>) named'] },
        ];

        // ─── SCIENCE / PHYSICS CAPSULES ───
        const SCIENCE_CAPSULES = [
            { id:'periodic-table', name:'Periodic Table', flag:'\u269B', color:'#22d3ee', cat:'science', age:'all',
              desc:'Chemical elements — symbols, names, properties, quantum numbers, orbital types, spectral lines',
              words:['H hydrogen Z=1 1s1','He helium Z=2 1s2','Li lithium Z=3 2s1','Be beryllium Z=4 2s2','B boron Z=5 2p1','C carbon Z=6 2p2','N nitrogen Z=7 2p3','O oxygen Z=8 2p4','F fluorine Z=9 2p5','Ne neon Z=10 2p6','Na sodium Z=11 3s1','Mg magnesium Z=12 3s2','Al aluminum Z=13 3p1','Si silicon Z=14 3p2','P phosphorus Z=15 3p3','S sulfur Z=16 3p4','Cl chlorine Z=17 3p5','Ar argon Z=18 3p6','K potassium Z=19 4s1','Ca calcium Z=20 4s2','Fe iron Z=26 3d6','Cu copper Z=29 3d10','Zn zinc Z=30','Br bromine Z=35','Ag silver Z=47','Au gold Z=79','U uranium Z=92','s orbital (spherical)','p orbital (dumbbell)','d orbital (cloverleaf)','f orbital (complex)','n principal quantum','l angular momentum','ml magnetic quantum','ms spin quantum','Pauli exclusion','Hund rule','Aufbau principle','Heisenberg uncertainty','Schrodinger equation','wave function psi','electron cloud','probability density','ground state','excited state','ionization energy','electron affinity','electronegativity','atomic radius','covalent radius','van der Waals'] },
            { id:'quantum-physics', name:'Quantum Mechanics', flag:'\u{1F30C}', color:'#a78bfa', cat:'science', age:'all',
              desc:'Quantum physics concepts — superposition, entanglement, measurement, gates, qubits',
              words:['qubit','superposition','entanglement','decoherence','measurement','collapse','Hadamard gate H','Pauli-X gate','Pauli-Y gate','Pauli-Z gate','CNOT gate','SWAP gate','Toffoli gate','phase gate S','T gate pi/8','rotation Rz','Bloch sphere','Dirac notation','bra-ket','eigenvalue','eigenstate','Hamiltonian','Schrodinger','Born rule','Bell state','EPR paradox','quantum teleportation','quantum tunneling','zero-point energy','Planck constant h','Planck length','Planck time','Planck mass','uncertainty principle','wave-particle duality','de Broglie wavelength','Compton scattering','photoelectric effect','blackbody radiation','Bohr model','quantum number n l ml ms','spin-orbit coupling','fine structure','hyperfine structure','Zeeman effect','Stark effect','Lamb shift','Casimir effect','quantum field theory','Feynman diagram','path integral','renormalization','standard model','fermion boson','lepton quark','gluon photon W Z Higgs'] },
            { id:'spectroscopy', name:'Spectroscopy & Waves', flag:'\u{1F308}', color:'#f472b6', cat:'science', age:'all',
              desc:'Electromagnetic spectrum, spectral lines, wave properties, light-matter interaction',
              words:['electromagnetic spectrum','gamma rays','X-rays','ultraviolet UV','visible light','infrared IR','microwave','radio waves','wavelength lambda','frequency nu','amplitude','period T','phase','interference','diffraction','refraction','reflection','polarization','Doppler effect','redshift','blueshift','absorption spectrum','emission spectrum','Balmer series','Lyman series','Paschen series','Rydberg constant','Fraunhofer lines','spectral fingerprint','photon energy E=hf','speed of light c','Planck relation','Stefan-Boltzmann','Wien displacement','Rayleigh scattering','Raman scattering','fluorescence','phosphorescence','laser','stimulated emission','coherent light','monochromatic','blackbody curve','color temperature','Kelvin scale','nanometer nm','angstrom','electron volt eV','wavenumber'] },
        ];

        // ─── ACOUSTIC / VOCAL / BIOLOGICAL SIGNAL CAPSULES ───
        const ACOUSTIC_CAPSULES = [
            { id:'vocal-techniques', name:'Vocal Techniques & Registers', flag:'\uD83C\uDFA4', color:'#ec4899', cat:'acoustic', age:'all',
              desc:'Extended vocal techniques — singing registers, extreme ranges, throat singing, extended methods, voice science, formants, vocal folds, resonance chambers',
              words:['soprano (C4-C6) coloratura lyric dramatic spinto soubrette','mezzo-soprano (A3-A5) lyric dramatic coloratura','alto contralto (F3-F5) deep rich chest register','tenor (C3-C5) lyric dramatic spinto heldentenor countertenor','baritone (A2-A4) lyric dramatic bass-baritone Verdi','bass (E2-E4) basso profondo basso buffo basso cantante','whistle register (C6-C8) flageolet Mariah Carey Minnie Riperton','vocal fry pulse register subharmonic creaky voice lowest Hz','chest voice modal register speaking voice full thick folds','head voice light register thin folds upper range falsetto','mixed voice passaggio bridge belt zona di passaggio','Tuvan throat singing khoomei sygyt kargyraa borbangnadyr','overtone singing harmonic formant manipulation spectral control','growl vocal distortion death metal guttural subharmonic false fold','scream fry scream false cord scream tunnel throat inhale scream','goblin voice technique vocal fry mixed with nasal resonance','inward singing circular breathing inward phonation inhale vocalize','belting mix chest-dominant high volume musical theatre power','vibrato rate 5-7 Hz extent pitch amplitude tremolo wobble','melisma riff run vocal agility ornamentation coloratura passage','glottal stop glottal fry creak onset offset phonation type','yodel rapid register alternation chest-head Swiss Tyrolean country','beatbox vocal percussion kick snare hi-hat bass oscillation','scat improvisation syllable jazz nonsense vocables be-bop','sprechstimme speech-song Berg Schoenberg melodrama parlando','recitative secco accompagnato speech-like opera narrative','castrato sopranist male soprano historically altered voice','countertenor male alto falsettist early music baroque','formant F1 F2 F3 F4 vowel color timbre spectral peak','larynx raised lowered neutral position thyroid cartilage cricoid','pharynx oral nasal cavity sinus resonance chamber amplification','diaphragm breath support appoggio intercostal expansion','subglottic pressure airflow volume velocity Bernoulli effect']
            },
            { id:'chanting-traditions', name:'Chanting & Sacred Vocal', flag:'\uD83D\uDD4A', color:'#a78bfa', cat:'acoustic', age:'all',
              desc:'Sacred chanting traditions — Gregorian, Vedic, Buddhist, Sufi, shamanic, indigenous vocal meditation, kirtan, dhikr, psalm tones',
              words:['Gregorian chant plainchant antiphon psalm tone introit gradual','alleluia tract offertory communion responsory hymn sequence','neumatic syllabic melismatic organum parallel oblique free','Vedic chanting udatta anudatta svarita three-tone recitation','Om Aum pranava cosmic vibration primordial sound seed mantra','mantra japa meditation repetition mala 108 beads TM Siddha','kirtan call-response devotional bhajan raga sangeet harmonium','Buddhist chanting sutra dharani Om Mani Padme Hum refuge vow','Tibetan overtone chanting deep bass multiphonic harmonic drone','Sufi dhikr zikr remembrance repetition whirling dervish breath','Quran tajweed recitation maqam melodic mode tarteel murattal','Torah cantillation trope te\'amim psalm accentuation nusach','shamanic icaros medicine song plant spirit ayahuasca healing voice','Aboriginal Australian didgeridoo circular breathing drone overtone','Native American vocable syllable powwow honor song medicine wheel','African call-response polyrhythm talking drum vocal percussion','Inuit throat singing katajjaq two-person alternating breath game','Georgian polyphonic three-voice Chakrulo UNESCO intangible heritage','Corsican paghjella polyphonic traditional three male voices','Sardinian cantu a tenore four-voice bass throat overtone UNESCO','Mongolian long song urtyn duu sustained syllable wide range','Japanese shomyo Buddhist hymn gagaku ritual chant','Korean pansori epic vocal performance chang drum accompaniment','Balinese kecak monkey chant interlocking rhythmic chorus','Maori haka challenge song throat vocalization poi waiata']
            },
            { id:'animal-acoustics', name:'Animal Acoustics & Bioacoustics', flag:'\uD83D\uDC33', color:'#06b6d4', cat:'acoustic', age:'all',
              desc:'Animal sound production — echolocation, whale song, bird calls, insect stridulation, electric fish, ultrasonic/infrasonic communication',
              words:['whale song humpback blue fin bowhead melody phrase theme 10-30 Hz','dolphin echolocation click train whistle signature burst-pulse social','bat ultrasonic frequency-modulated constant-frequency 20-200 kHz','bird song syrinx dual-source territorial mating dawn chorus mimic','parrot vocal learning imitation formant speech human words','lyrebird mimicry environmental sound chainsaw camera motor','songbird oscine subsong plastic song crystallized song tutor','elephant infrasound rumble 5-30 Hz long distance seismic ground','whale echolocation sperm whale click 230 dB loudest animal','cricket stridulation chirp wing frequency temperature Dolbear law','cicada tymbal membrane 100-120 dB loudest insect synchronous chorus','electric eel electrophorus pulse discharge 600-860 V communication','electric fish weakly electric mormyrid gymnotiform EOD waveform','shark ampullae of Lorenzini electroreception prey detection','platypus electroreception bill sensory lateral line','pistol shrimp cavitation bubble 200 dB snap sonoluminescence','spiderweb vibration frequency substrate-borne signal web pluck','tree frog vocal sac resonance inflatable amplifier chorus','howler monkey hyoid bone resonating chamber 140 dB territory','prairie dog alarm call referential vocabulary predator-specific','bee waggle dance vibration piping tooting quacking swarm','fish swim bladder drumming grunt snap pop courtship signal','moth ultrasonic click anti-bat jamming acoustic aposematism','mosquito wing beat frequency 300-600 Hz courtship harmonics','lion roar infrasonic component 50 Hz 114 dB 5 miles','gibbon duet pair bond territory great call song bout']
            },
            { id:'cosmic-sounds', name:'Cosmic & Planetary Acoustics', flag:'\uD83C\uDF0C', color:'#6366f1', cat:'acoustic', age:'all',
              desc:'Galactic signals — pulsar radio, magnetar burst, solar wind, planetary magnetosphere, cosmic microwave background, gravitational wave sonification',
              words:['pulsar radio pulse rotation period neutron star millisecond frequency','magnetar burst soft gamma repeater starquake magnetic 10^15 gauss','solar wind plasma oscillation coronal mass ejection heliosphere','Jupiter magnetosphere decametric radiation Io flux tube auroral','Saturn ring particle collision resonance Cassini division gap','Earth magnetosphere chorus risers hiss whistler lightning VLF','cosmic microwave background CMB 2.725K thermal radiation redshift','gravitational wave LIGO Virgo chirp binary merger ringdown strain','black hole accretion disk X-ray quasi-periodic oscillation QPO','solar oscillation helioseismology p-mode g-mode 5 minute period','stellar asteroseismology pulsation variable star Cepheid RR Lyrae','nebula emission spectrum hydrogen alpha 656.3 nm optical','interstellar medium 21 cm hydrogen spin-flip radio astronomy','fast radio burst FRB extragalactic millisecond dispersed pulse','quasar radio-loud radio-quiet active galactic nucleus jet','Voyager 1 2 plasma wave instrument interstellar medium crossing','sonification data-to-sound mapping frequency pitch duration','Schumann resonance Earth-ionosphere cavity 7.83 14.3 20.8 Hz','tidal force gravitational harmonic ocean resonance period','meteor ablation sonic boom ionization trail radar echo']
            },
            { id:'plant-signals', name:'Plant & Vegetation Signals', flag:'\uD83C\uDF31', color:'#22c55e', cat:'acoustic', age:'all',
              desc:'Phytoacoustics — plant electrical signals, root communication, mycorrhizal networks, photosynthesis vibration, ultrasonic emission under stress',
              words:['plant electrophysiology action potential variation potential','phytoacoustics ultrasonic emission cavitation drought stress 20-300 kHz','root tip electrical oscillation calcium wave auxin transport','mycorrhizal network wood wide web fungal hyphal nutrient signal','photosynthesis vibration chlorophyll quantum coherence 600 THz','stomata aperture turgor pressure gas exchange CO2 feedback','thigmomorphogenesis touch response mechanical signal wind vibration','gravitropism auxin redistribution root tip columella statocyte','phytochrome light sensing red far-red photomorphogenesis','circadian clock oscillation gene expression period 24 hour','allelopathy chemical signal volatile organic compound VOC terpene','ethylene ripening signal stress response gaseous hormone','jasmonic acid wound signal herbivore defense systemic acquired','salicylic acid pathogen defense systemic acquired resistance SAR','electric signal long-distance rapid wound response phloem xylem','music and plant growth sound frequency 1000 Hz stimulation debate','MIDI plant music biodata sonification resistance galvanic','forest bathing shinrin-yoku terpene aerosol phytoncide','Venus flytrap action potential Dionaea 0.1 second snap closure','Mimosa pudica sensitive plant rapid leaf fold turgor thigmonasty']
            },
            { id:'brain-tissue-bci', name:'Brain Tissue & BCI', flag:'\uD83E\uDDE0', color:'#f59e0b', cat:'acoustic', age:'all',
              desc:'Brain-computer interfaces, biological computing, neural organoids, Cortical Labs CL1, Neuralink, neural oscillations, EEG bands, spike trains',
              words:['Cortical Labs CL1 biological computer neuron silicon chip DishBrain Pong','organoid cerebral brain mini-organ stem cell iPSC differentiation','neural oscillation EEG band delta 0.5-4 Hz theta 4-8 Hz alpha 8-13 Hz','beta 13-30 Hz gamma 30-100 Hz high-gamma ripple sharp-wave','spike train action potential firing rate interspike interval code','local field potential LFP multi-unit activity extracellular recording','patch clamp intracellular voltage clamp current clamp whole-cell','MEA multi-electrode array 60 256 4096 channel high-density recording','calcium imaging GCaMP fluorescence two-photon confocal miniScope','optogenetics channelrhodopsin halorhodopsin light-activated gene','Neuralink N1 implant 1024 electrode thread robot insertion BCI','Utah array microelectrode intracortical motor cortex neuroprosthetic','ECoG electrocorticography subdural grid strip cortical surface','BCI brain-computer interface decode intent control cursor spell','motor imagery P300 SSVEP event-related potential ERP paradigm','neural dust wireless ultrasonic backscatter sub-mm implant','stentrode endovascular stent-electrode jugular vein motor cortex','brain organoid intelligence OI biological neural network learning','DishBrain in-vitro neuron culture learning real-time feedback loop','synaptic plasticity LTP LTD STDP Hebbian learning spike timing','neurotransmitter glutamate GABA dopamine serotonin acetylcholine','glial cell astrocyte oligodendrocyte microglia support modulate','neural code rate coding temporal coding population vector ensemble','connectome whole-brain wiring diagram synapse map Human Brain Project','brain-to-brain interface BBI hyperscanning social neuroscience','closed-loop neuromodulation DBS TMS tDCS responsive stimulation','neural interface API REST WebSocket streaming spike event real-time','cortical column minicolumn canonical microcircuit laminar structure','neuromorphic chip Intel Loihi IBM TrueNorth SpiNNaker spiking SNN','biocomputing efficiency 1e16 ops per watt vs GPU 1e12 organic learning']
            },
        ];

        // ─── STROKE / MOVEMENT / PATTERN CAPSULES ───
        const STROKE_CAPSULES = [
            { id:'font-strokes', name:'Font & Calligraphy Strokes', flag:'\u270D', color:'#f472b6', cat:'stroke', age:'all',
              desc:'Typography strokes — weight, kerning, bezier curves, serifs, ligatures, calligraphy brush angles, ascender, descender, x-height, baseline, cap-height',
              words:['stroke weight thin hairline light regular medium semibold bold black heavy','serif sans-serif monospace display script cursive decorative slab','ascender descender x-height cap-height baseline overshoot','kerning tracking leading ligature swash terminal','bezier cubic quadratic control point anchor handle','ink trap counter bowl stem crossbar finial','calligraphy nib angle pressure upstroke downstroke hairline thick thin','Roman uncial blackletter italic oblique compressed condensed extended','opentype truetype woff variable font axis weight width slant','glyph codepoint unicode contour path outline fill','brush script copperplate spencerian roundhand foundational','chisel broad edge pointed nib flex','ductus stroke order pen lift entry exit','flourish ornament drop cap initial versal']
            },
            { id:'drawing-painting', name:'Drawing & Painting Strokes', flag:'\uD83C\uDFA8', color:'#c084fc', cat:'stroke', age:'all',
              desc:'Brush techniques, painting analysis, print reproduction, multi-color plotting, anime/comic line art, hatching, rendering',
              words:['pencil graphite charcoal conte crayon pastel','brush round flat filbert fan rigger mop liner','stroke pressure velocity angle tilt azimuth bearing','impasto wash glazing scumbling dry brush wet on wet','hatching cross-hatching stippling pointillism contour blind contour','gesture line weight hierarchy focal point composition','plotter pen CMYK RGB spot color separation layer','giclée reproduction archival pigment inkjet print','rasterize vectorize trace outline edge detect','canvas paper board panel gesso primer ground','anime manga panel screentone speed line focus line','cell shading flat color gradient halftone','inking brush pen nib dip technical','perspective vanishing point horizon line foreshortening','chiaroscuro value scale tonal range contrast','color theory complementary analogous triadic split','sfumato atmospheric aerial perspective','printmaking lithograph etching engraving woodcut linocut screen','CMYK separation registration trap overprint bleed','3D print filament layer height infill nozzle extruder multi-color tool change purge tower']
            },
            { id:'sewing-textile', name:'Sewing & Textile Patterns', flag:'\uD83E\uDDF5', color:'#fb923c', cat:'stroke', age:'all',
              desc:'Sewing patterns, knitting charts, weaving drafts, embroidery stitches, quilting paths, loom patterns, fabric grain, bias',
              words:['stitch running backstitch chain stem satin cross French knot','seam allowance dart pleat gather tuck fold bias grain selvage','pattern piece notch grainline fold line cut line sew line','knit purl cast on bind off increase decrease yarn over','stockinette garter rib seed cable fair isle intarsia lace','warp weft shuttle loom heddle harness treadle reed dent','tabby twill satin weave plain basket herringbone','bobbin thread tension feed dog presser foot needle plate','embroidery hoop stabilizer transfer floss skein','quilting block log cabin flying geese star Dresden plate','applique patchwork binding batting backing top layer','crochet hook single double treble chain slip stitch','needle felting wet felting roving batt fiber wool silk','serger overlock coverstitch blind hem rolled hem','dart manipulation princess seam yoke gusset godet']
            },
            { id:'animal-movement', name:'Animal Pose & Movement', flag:'\uD83D\uDC3E', color:'#34d399', cat:'stroke', age:'all',
              desc:'Animal pose estimation, skeletal tracking, gait analysis, behavior classification — SLEAP, DeepLabCut, MAMMAL, neuroethology',
              words:['pose estimation keypoint skeleton joint limb','SLEAP DeepLabCut DANNCE DeepPoseKit DLC','multi-animal tracking identity markerless','gait stride stance swing cadence frequency phase','walk trot canter gallop pace amble bound pronk','locomotion quadruped bipedal flight swimming','nose head neck shoulder elbow wrist hip knee ankle tail','spine dorsal ventral rostral caudal lateral medial','behavior ethogram grooming rearing freezing exploring','social interaction approach retreat aggression play','top-down bottom-up centroid bounding box instance','confidence score heatmap PAF part affinity field','optical flow motion energy trajectory velocity acceleration','MAMMAL 3D surface motion capture mesh deformation','primate tracking macaque lemur marmoset','rodent mouse rat open field elevated plus maze','insect fly Drosophila wing leg antenna abdomen','fish zebrafish schooling swimming bout turn angle','bird avian flight feather wing beat soaring gliding','neuroethology computational behavior neural correlate']
            },
            { id:'pet-gestures', name:'Pet Gesture & Communication', flag:'\uD83D\uDC15', color:'#fbbf24', cat:'stroke', age:'all',
              desc:'Domestic animal body language, gesture signals, training cues, emotional states, inter-species communication patterns',
              words:['tail wag up down tucked high low slow fast circle','ear forward back flat alert relaxed perked rotation','body posture tense relaxed playful submissive dominant','play bow stretch yawn lip lick nose nudge paw lift','bark whine growl purr meow chirp trill hiss','eye contact blink slow blink whale eye half moon','head tilt cock turn away look toward gaze follow','belly exposure roll over side lie down sit stand','piloerection hackles raised fur smooth sleek','approach retreat circling parallel walk','calming signal displacement sniff ground shake off','training signal sit stay come heel down leave it','hand signal palm up flat down fist point sweep','clicker marker timing reward bridge','agility weave pole jump tunnel A-frame see-saw','fetch retrieve drop release hold carry','leash tension pressure walk pull heel loose','whisker position forward back neutral spread','respiration rate panting normal resting elevated','vocalization frequency pitch duration pattern modulation']
            },
        ];

        // ─── COMPLIANCE / REGULATORY / SECTOR STANDARDS CAPSULES ───
        const COMPLIANCE_CAPSULES = [
            { id:'hipaa-compliance', name:'HIPAA & Healthcare IT', flag:'\uD83C\uDFE5', color:'#ef4444', cat:'compliance', age:'all',
              desc:'HIPAA Privacy Rule, Security Rule, HITECH, PHI protection, BAA, ONC certification, USCDI, HL7 FHIR, Epic open.epic, Cerner, SMART on FHIR, clinical decision support',
              words:['HIPAA privacy security HITECH PHI PII ePHI','protected health information minimum necessary','business associate agreement BAA covered entity','ONC certification USCDI FHIR HL7 interoperability','access control authentication authorization RBAC','audit trail logging accountability non-repudiation','encryption AES-256 TLS HTTPS at-rest in-transit','breach notification 60-day rule HHS OCR','de-identification safe harbor expert determination','Epic open.epic SMART FHIR OAuth2 Cerner Allscripts','EHR EMR clinical decision support CDS Hooks','patient consent opt-in opt-out authorization','data retention disposition destruction policy','risk assessment vulnerability scanning penetration','contingency plan disaster recovery backup','workforce training security awareness clearance','facility access workstation use device media','transmission security integrity controls','CMMI level 3 defined process software maturity','ICD-10 CPT LOINC SNOMED-CT RxNorm terminology']
            },
            { id:'openssf-security', name:'OpenSSF & Supply Chain Security', flag:'\uD83D\uDD12', color:'#3b82f6', cat:'compliance', age:'all',
              desc:'OpenSSF Scorecard, CII Best Practices, SLSA provenance, Sigstore, SBOM, dependency scanning, CVE, NIST, supply chain integrity, reproducible builds',
              words:['OpenSSF scorecard security supply chain SLSA','SBOM software bill of materials SPDX CycloneDX','dependency scanning Dependabot Snyk Trivy audit','CVE vulnerability disclosure responsible coordinated','NIST cybersecurity framework CSF 800-53 800-171','branch protection code review signed commits GPG','static analysis SAST dynamic DAST fuzzing','reproducible build provenance attestation Sigstore','cosign Rekor transparency log OIDC keyless','CII best practices badge passing silver gold','pinned dependencies lockfile integrity hash','CI CD pipeline security GitHub Actions secrets','container scanning image signing admission control','secrets detection git-secrets trufflehog gitleaks','zero trust architecture least privilege principle','OWASP top 10 injection XSS CSRF SSRF IDOR','penetration testing red team blue team purple team','threat modeling STRIDE DREAD attack tree','security policy SECURITY.md disclosure process','incident response plan playbook escalation SLA']
            },
            { id:'spdx-licensing', name:'SPDX & Open Source Licensing', flag:'\u2696\uFE0F', color:'#8b5cf6', cat:'compliance', age:'all',
              desc:'SPDX license identifiers, SBOM, OSI-approved licenses, GPL MIT Apache BSD, NTIA minimum elements, CycloneDX, license compatibility, copyleft, permissive',
              words:['SPDX license identifier expression MIT Apache-2.0','GPL-2.0 GPL-3.0 BSD-2-Clause BSD-3-Clause ISC MPL','copyleft permissive weak strong reciprocal','LGPL AGPL SSPL BSL proprietary dual-license','OSI approved Open Source Initiative FSF','Creative Commons CC0 CC-BY CC-BY-SA CC-BY-NC','SBOM minimum elements NTIA supplier component','CycloneDX SPDX-2.3 package document creation','license compatibility matrix combination linking','attribution notice copyright NOTICE file header','contributor license agreement CLA DCO sign-off','patent grant retaliation termination scope','redistribution source binary modification fork','trademark use reserved fair use nominative','software composition analysis SCA Black Duck','FOSS compliance audit remediation obligation','export control EAR ITAR dual-use classification','open core freemium source-available fair-source','REUSE specification copyright machine-readable','dependency license propagation transitive direct']
            },
            { id:'soc2-enterprise', name:'SOC 2 & Enterprise Trust', flag:'\uD83D\uDEE1\uFE0F', color:'#f59e0b', cat:'compliance', age:'all',
              desc:'SOC 2 Type II trust services criteria, security availability processing-integrity confidentiality privacy, ISO 27001, AICPA, FedRAMP, CMMC, change management',
              words:['SOC 2 Type I Type II trust services criteria','security availability processing integrity','confidentiality privacy AICPA SSAE 18','ISO 27001 27002 ISMS information security','FedRAMP moderate high Li-SaaS authorization','CMMC cybersecurity maturity model certification','change management approval testing rollback','access review periodic recertification','monitoring alerting SIEM log aggregation','incident response classification severity','business continuity disaster recovery RPO RTO','vendor management third-party risk assessment','data classification public internal confidential','encryption key management rotation custody','network segmentation firewall WAF IDS IPS','identity federation SSO MFA SAML OIDC SCIM','penetration test remediation finding closure','risk register heat map likelihood impact','control testing evidence collection audit','compliance dashboard KPI metric reporting']
            },
            { id:'osint-intelligence', name:'OSINT & Intelligence Tradecraft', flag:'\uD83D\uDD0D', color:'#10b981', cat:'compliance', age:'all',
              desc:'Open Source Intelligence, Bellingcat methodology, OSINT Framework, geolocation, chronolocation, social media analysis, deep web, data provenance, ethical collection',
              words:['OSINT open source intelligence collection analysis','geolocation chronolocation shadow analysis sun calc','social media SOCMINT Twitter Facebook LinkedIn','reverse image search TinEye Google Lens Yandex','WHOIS DNS lookup subdomain enumeration recon','Wayback Machine Internet Archive web scraping','Maltego Shodan SpiderFoot theHarvester Recon-ng','dark web deep web Tor onion hidden service','metadata EXIF GPS timestamp camera model','satellite imagery Sentinel Maxar Planet Labs','Bellingcat verification cross-reference corroborate','digital forensics chain of custody hash integrity','HUMINT SIGINT GEOINT IMINT MASINT TECHINT','attribution actor tracking TTP MITRE ATT&CK','threat intelligence feed IOC indicator compromise','persona OPSEC operational security sock puppet','data broker people search public records FOIA','translation sentiment analysis NLP entity extraction','ethical collection legal boundary terms of service','intelligence cycle requirements collection processing']
            },
            { id:'linux-foundation', name:'Linux Foundation & Cloud Native', flag:'\uD83D\uDC27', color:'#0ea5e9', cat:'compliance', age:'all',
              desc:'Linux Foundation, CNCF, Kubernetes, OCI, containerd, Prometheus, Envoy, Helm, CKS certification, cloud native landscape, graduated incubating sandbox',
              words:['Linux Foundation CNCF cloud native landscape','Kubernetes K8s pod service deployment statefulset','OCI container image runtime spec distribution','containerd CRI-O runc podman buildah skopeo','Prometheus Grafana alerting metrics observability','Envoy Istio service mesh sidecar proxy mTLS','Helm chart Kustomize ArgoCD Flux GitOps','CKS CKA CKAD certification security admin developer','etcd consul vault secrets configuration discovery','CoreDNS ingress nginx traefik gateway API','SPIFFE SPIRE identity attestation workload','Open Policy Agent OPA Rego Gatekeeper admission','Falco runtime security Cilium eBPF networking','Jaeger OpenTelemetry tracing distributed spans','NATS gRPC protocol buffers CloudEvents','Harbor registry Notary TUF update framework','Backstage developer portal catalog scaffolding','Crossplane Terraform infrastructure as code IaC','Knative serverless eventing scaling','Vitess TiKV CockroachDB distributed database']
            },
        ];

        // ─── PROJECT PORTFOLIO CAPSULES — Figma / App / External ───
        const PROJECT_CAPSULES = [
            { id:'claydayzz', name:'ClayDayzZ — Ceramics Studio', flag:'\uD83C\uDFFA', color:'#c2855a', cat:'project', age:'all',
              desc:'Ceramics pottery VR studio — kiln control, glaze recipes, clay bodies, laser etching, vector overlay, 3D model viewing, materials marketplace, inventory management',
              words:['kiln firing temperature cone glaze clay body bisque','vitrification slip engobe underglaze overglaze reduction','oxidation raku stoneware porcelain earthenware','throwing hand-building slab coil wheel trimming','glazing bisque-firing glaze-firing kiln-controller','temperature ramp hold-time cooling-rate pyrometric','kiln-sitter kiln-furniture firing-schedule recipe','laser-etching vector-overlay ceramic-profile VR','timelapse materials marketplace wholesale inventory','Three.js React Three Fiber XR community directory']
            },
            { id:'cube-neural', name:'Cube Neural — Rubiks Battle', flag:'\uD83E\uDDE9', color:'#f97316', cat:'project', age:'all',
              desc:'Rubiks Cube battle platform — AI solver, team captain dashboard, neural collaboration, speedcubing training, spectator mode, 3D visualization',
              words:['Rubiks cube scramble solve algorithm move-notation','F2L OLL PLL CFOP Roux ZZ Petrus speedcubing','solve-time personal-best world-record team-captain','battle-mode spectator AI-solver neural-collaboration','3D-visualization face-turn slice-turn rotation','permutation orientation parity corner edge center','sticker color-scheme solving-method move-count','efficiency lookahead finger-tricks TPS','WCA competition reconstruction training','achievement leaderboard showcase practice']
            },
            { id:'futuristic-clothing', name:'Futuristic Clothing AI', flag:'\uD83D\uDC57', color:'#ec4899', cat:'project', age:'all',
              desc:'AI fashion agent platform — wardrobe management, outfit recommendation, style analysis, trend forecasting, virtual try-on, capsule wardrobe, color coordination',
              words:['AI-agent fashion-design styling wardrobe-management','outfit-recommendation color-palette fabric-selection','pattern-matching style-analysis trend-forecasting','personal-style body-type fit-analysis size','clothing-category garment accessories seasonal','capsule-wardrobe style-profile preferences','color-coordination pattern-mixing texture-combination','silhouette proportion balance harmony contrast','virtual-try-on style-inspiration mood-board','closet-organization outfit-planning transformation']
            },
            { id:'haloid-face', name:'HaloID — Face Scanning', flag:'\uD83D\uDC64', color:'#8b5cf6', cat:'project', age:'all',
              desc:'LiDAR face scanning — TrueDepth 3D capture, NERF model, holographic badge, slit-scan, depth map, point cloud, face mesh, biometric, WebXR',
              words:['LiDAR TrueDepth face-scan depth-map point-cloud','face-mesh 3D-model NERF neural-radiance-fields GSplat','face-capture depth-sensing WebXR immersive-AR','face-detection recognition landmarks confidence','holographic-badge slit-scan depth-slit-scan','face-visualization similar-faces face-tree','mesh-generation 3D-reconstruction depth-quality','texture-mapping UV-mapping face-symmetry','landmark-detection face-alignment pose-estimation','expression-capture face-database face-matching']
            },
            { id:'halvempty-mfg', name:'halvEMptY — Manufacturing', flag:'\uD83C\uDFED', color:'#64748b', cat:'project', age:'all',
              desc:'Nanosecond economics manufacturing platform — cost per nanosecond, fiber optic printing, machine management, biomaterials, parts inventory, industry directory',
              words:['nanosecond-economics cost-per-nanosecond pay-rate','fiber-optic-printing data-transfer-rate Gbps','bits-per-nanosecond cost-per-bit exabyte','manufacturing machine-management biomaterials','recipes parts-inventory industry-directory','manufacturers laboratories specialization','production-line quality-control supply-chain','vendor-management material-sourcing component','production-planning workflow-optimization','cost-analysis efficiency-metrics calculator']
            },
            { id:'mars-boarding', name:'Mars Boarding Pass', flag:'\uD83D\uDE80', color:'#dc2626', cat:'project', age:'all',
              desc:'Mars colonization boarding pass generator — transfer window calendar, orbital mechanics, resort training, holographic pass, pioneer colonist, robot builder',
              words:['Mars colonization boarding-pass transfer-window','orbital-mechanics launch-window Mars-transfer','Earth-Starport Mars-Starbase human-colonists','robot-builders pioneer-colonist flight-number','departure arrival seat-assignment gate passenger','zero-G-fitness EVA-training Starship-simulator','medical-clearance psychological-evaluation','Olympus-Mons Valles-Marineris Mars-base','26-month-cycle optimal-window mission-phases','holographic-badge VIP-status interplanetary']
            },
            { id:'multi-icon', name:'Multi Icon Maker', flag:'\uD83C\uDFA8', color:'#10b981', cat:'project', age:'all',
              desc:'AI-powered icon generation — multi-format export, SVG PNG ICNS HTML, favicon, iOS Android sizes, animated icons, font recommendations, canvas rendering',
              words:['icon-showcase vector-icon mobile-app-icon favicon','gradient-enabled icon-size custom-image quick-export','ICNS-package iOS-sizes Android-sizes favicon-sizes','font-recommendations animated-icon-editor output','SVG-string canvas-generation PNG-export HTML-export','font-CSS icon-color background-color icon-editor','AI-logo-generator image-uploader download','rounded-terminals geometric sans-serif organic','multi-format export batch-generation preset','Lucide React Canvas API Radix image-processing']
            },
            { id:'shoe-making', name:'Shoe Making Website', flag:'\uD83D\uDC5F', color:'#a855f7', cat:'project', age:'all',
              desc:'Custom shoe design — 3D printing FDM SLA, CNC machining, laser processing, AI foot analysis, gait patterns, Portland suppliers, manufacturing hub',
              words:['shoe-designer 3D-printing FDM SLA fused-deposition','stereolithography CNC-machining laser-processing','AI-powered-design foot-shape-analysis gait-patterns','custom-manufacturing layer-resolution material','PLA ABS TPU resin precision-machining PEEK','laser-cutting leather-processing fabric-etching','fit-optimization scan-accuracy manufacturing-hub','Portland-suppliers bulk-discounts same-day-pickup','T-slot-4040 production-time post-processing','finishing assembly-guides Three.js product-showcase']
            },
            { id:'stl-sorter', name:'STL Sorter — 3D Models', flag:'\uD83D\uDDA8\uFE0F', color:'#0ea5e9', cat:'project', age:'all',
              desc:'3D model management — STL sorting, cost estimation, slicer preview, supplier directory, metal prices, build schematics, CSV export, triangle count',
              words:['STL-sorter 3D-models print-mold-ready resolution','triangle-count supply-cost-estimate size-conversion','comparable-products distribution-channels print-cost','industry-categorization model-filters card-view','supplier-directory metal-prices 3D-viewer slicer','cost-calculator Portland T-slot-4040 bulk','build-schematics assembly-guides wiring-diagrams','component-information CSV-export model-metadata','thumbnail-generation slicing-parameters layer-height','infill-percentage support-structures print-time']
            },
            { id:'usdz-viewer', name:'USDZ Viewer Electron', flag:'\uD83D\uDCE6', color:'#6366f1', cat:'project', age:'all',
              desc:'Desktop 3D viewer — USDZ GLB GLTF STL OBJ G-Code, transparent background, format conversion, thumbnail generation, file wrangler, Electron',
              words:['USDZ universal-scene-description GLB GLTF','stereolithography wavefront-OBJ G-code binary','transparent-background window-locking aspect-ratio','always-on-top drag-and-drop file-associations','downloads-scanner thumbnail-generation quick-preview','tabbed-interface one-click-loading data-wrangling','automatic-categorization file-metadata duplicate','format-conversion auto-converted native-formats','glassmorphism smooth-animations color-coded','Electron Sharp Three.js IPC lazy-loading']
            },
            { id:'video-transcription', name:'Video Transcription Viewer', flag:'\uD83C\uDFAC', color:'#f59e0b', cat:'project', age:'all',
              desc:'Video transcription — YouTube integration, shot-by-shot entries, ASL animation, synchronized playback, timestamp, mobile-first, IFrame API',
              words:['video-transcription YouTube-integration shot-by-shot','start-time duration description note thumbnail','seek-time sign-language ASL-animation active','video-metadata channel views upload-date likes','transcription-entry shot-number follow-lead','center-stage soft-transition wide-stage tight-scene','vertical-shot piano-shot crowd-shot zoom-in zoom-out','wide-angle loop-playback synchronized-playback','time-update current-time entry-click mobile-first','IFrame-API post-message max-width aspect-video']
            },
            { id:'timezone-map', name:'U.S. Time Zone Map', flag:'\uD83D\uDDFA\uFE0F', color:'#3b82f6', cat:'project', age:'all',
              desc:'Interactive SVG US map — time zones, clickable states, real-time clock, state capitals, Eastern Central Mountain Pacific, preprocessing',
              words:['time-zone-map interactive-map SVG-preprocessing','state-boundaries state-codes time-zone-colors','Eastern-Time Central-Time Mountain-Time Pacific','Alaska Hawaii ET CT MT PT AKT HT state-capitals','state-selection highlight info-panel time-display','real-time-clock map-container wrapper enhanced','preprocessing-complete loading-progress initialization','SVG-elements clickable-states touch-support zoom','gradient-background backdrop-blur loading-screen','exponential-backoff custom-events ready-state']
            },
            { id:'freya-terminal-logo', name:'Terminal Logo for Freya', flag:'\uD83C\uDF32', color:'#22c55e', cat:'project', age:'all',
              desc:'ASCII art pinecone logo generator — terminal emulation, color schemes, flip transform, sunrise gradient, family mode, scale controls',
              words:['terminal-emulation ASCII-art pinecone-family','combined-family single-pinecone color-schemes','master-viewer-scale flip-transformation sunrise','terminal-header version-display command-generation','papa mama baby pinecones detailed-ASCII gradient','transform-origin drop-shadow terminal-prompt','geometric-patterns cursive-Unicode decorative-line','tree-line version-toggle individual-controls','family-connection zoom-control color-slider','scale-adjustment macOS-window-controls presets']
            },
            { id:'pixel-converter', name:'Pixel Converter', flag:'\uD83D\uDCCF', color:'#6366f1', cat:'project', age:'all',
              desc:'Typography unit converter — pixels inches centimeters millimeters points picas em rem, DPI settings, base font size, quick reference',
              words:['absolute-units relative-units physical-units DPI','PPI base-font-size em-units rem-units points picas','unit-conversion preset-DPI custom-DPI category','swap-units conversion-calculation pixel-to-physical','font-size-dependent web-standard-DPI print-quality','high-DPI-displays unit-categories measurement','typography-units screen-pixels imperial metric','Apple-Magic-Keyboard practical-examples reference','clickable-examples two-column input-output','unit-selectors DPI-settings-panel configuration']
            },
            { id:'op1-field', name:'OP-1 Field Web Instrument', flag:'\uD83C\uDFB9', color:'#f97316', cat:'project', age:'all',
              desc:'Teenage Engineering OP-1 Field synthesizer simulation — FM pulse string digital synthesis, drum sampler, tape mode, mixer, connectivity panel',
              words:['synthesizer FM-synthesis pulse-synthesis string','digital-synthesis drum-sampler tape-mode mixer','tape-transport playback recording rewind forward','stop play record keyboard-notes connectivity','Bluetooth WiFi USB-connection audio-engine','note-playback synth-parameters drum-kit','tape-recording mixer-channels channel-levels','OP-1-Field Teenage-Engineering physical-device','extended-functionality simulation-mode orange','mode-switching computer-keyboard A-L-keys status']
            },
            { id:'neuwave-typography', name:'NEUwave Typography', flag:'\uD83D\uDD24', color:'#a855f7', cat:'project', age:'all',
              desc:'3D waveform typography — embossed letterforms, CMYK halftone, spline engineering, Bezier curves, Phong shading, procedural displacement, harmonic synthesis',
              words:['typography-waveform 3D-typography waveform-amplitude','waveform-frequency embossed-typography halftone','CMYK-separation cyan magenta yellow black screen-angles','spline-engineering Bezier-curves continuous-splines','tension-control parametric-waves harmonic-synthesis','amplitude-mapping phase-continuity 3D-projection','extrusion-engine solid-geometry beveled-edges','surface-tessellation procedural-displacement normal','Phong-shading ambient diffuse specular lighting','dynamic-shadows surface-highlights edge-definition']
            },
            { id:'grammarie-botanical', name:'GramMarie Botanical', flag:'\uD83C\uDF3F', color:'#16a34a', cat:'project', age:'all',
              desc:'E-commerce botanical platform — essential oils, incense, distillation alembic, cannabinoid profiles THC CBD CBG CBN, shopping cart, product catalog',
              words:['botanical-products essential-oils incense distillation','alembic cannabinoid-profile THC-dominant CBD-dominant','CBG-rich CBN-rich product-categories shopping-cart','quantity size-selection product-cards search','category-navigation mobile-category product-detail','botanical-detail alembic-detail verification sitemap','Three.js-singleton cart-management mock-pricing','original-price badges scientific-names descriptions','mobile-detection responsive-design toast-notifications','herbs-page oils-page incense-page distillation-page']
            },
            { id:'life-visualizer', name:'Animated Life Visualizer', flag:'\uD83C\uDF19', color:'#7c3aed', cat:'project', age:'all',
              desc:'Life in weeks visualization — celestial influences, moon phases, planetary alignment, wave animation, cosmic perspective, color schemes, seasonal cycles',
              words:['life-in-weeks weeks-lived weeks-remaining total-weeks','percentage-lived birthdate week-grid past present future','moon-phases full-moon new-moon waxing waning lunar-cycle','planetary-alignment Mars Venus Jupiter celestial','wave-animation celestial-data seasonal-influence','base-wave-pattern month-boundaries year-labels','color-schemes custom-colors cosmic-perspective','Earth-travel-distance lunar-cycles universe-age','heartbeats breaths seasons-experienced cosmic-stats','perforation-lines glow-effects Canvas requestAnimation']
            },
            { id:'geosonic-crates', name:'GeoSonic Crates Neural', flag:'\uD83C\uDF10', color:'#06b6d4', cat:'project', age:'all',
              desc:'Geographic molecular live coding — H3 hex grid, GeoHash, periodic table orchestra, protein sonification, Strudel Hydra Tidal, remix studio',
              words:['oscillators NeuraGrid periodic-table-orchestra','atomic-frequencies protein-sonification amino-acid','H3-hexagonal-indexing GeoHash-spatial-encoding','Strudel-patterns Hydra-visuals Tidal-cycles live-coding','master-volume pattern-engine cross-page-sync','Rubiks-cube-battle molecular-dynamics alpha-helix','beta-sheet RMSD-drift signal-triangulation','geographic-audio-synthesis spatial-indexing','remix-studio track-mixing sample-regions playhead','snap-to-grid quantum-coordinates neural-training']
            },
            { id:'bar-cocktail', name:'Bar — Cocktail App', flag:'\uD83C\uDF78', color:'#ef4444', cat:'project', age:'all',
              desc:'Cocktail bar management — customer/staff views, recipe database, botanical illustrations, mocktails, classic tropical trending, mixology, PIN auth',
              words:['cocktail-categories mocktails classic-cocktails trending','tropical-drinks bartending-techniques preparation-time','difficulty-levels flavor-profiles glassware garnish','ingredients quantities units steps alcoholic','non-alcoholic botanical-illustrations customer-view','staff-view PIN-authentication splash-page recipe','flavor-classification serving-size mixology','three-js-botanical category-filter search-query','recipe-database cocktail-data SVG-imports','toast-notifications Sonner Radix responsive']
            },
            { id:'ascii-camera', name:'ASCII Art Camera', flag:'\uD83D\uDCF7', color:'#64748b', cat:'project', age:'all',
              desc:'Real-time ASCII art camera — Polaroid captures, slow-motion frame blending, node workflow editor, film strip recording, pixel-to-ASCII mapping',
              words:['ASCII-art-conversion Polaroid-format camera-feed','frame-blending slow-motion-capture film-strip','snapshot-gallery auto-snapshots manual-capture','recording-mode pause-resume fullscreen-mode','workflow-mode node-editor pixel-to-ASCII-mapping','brightness-levels character-density visual-style','ASCII-flow-HD motion-bars frame-rate-throttling','canvas-rendering MediaStream horizontal-flip','timestamp-overlay download-functionality','grid-resolution character-mapping WebRTC']
            },
            { id:'lark-fontlab', name:'Lark FontLab — ScriptLab', flag:'\u270D\uFE0F', color:'#d946ef', cat:'project', age:'all',
              desc:'Writing system font analysis — waveform letters, Oracle Bone Vedic Latin Chinese scripts, font creator, audio-reactive mode, alphabet poster, repository',
              words:['waveform-letters font-waveforms character-mapping','writing-systems script-analysis Oracle-Bone Vedic','Traditional-Chinese Simplified-Chinese Latin-script','font-repository alphabet-poster code-export','animation-types wave bounce pulse rotate shake','flip swing fade audio-reactive-mode font-settings','bar-height bar-width bar-spacing waveform-position','stagger-delay reverse-order alphabet-analysis','character-properties scale rotation opacity','color-presets font-creator image-analyzer Web-Audio']
            },
            { id:'video-feeds-app', name:'Video Feeds Multi-Stream', flag:'\uD83D\uDCFA', color:'#0284c7', cat:'project', age:'all',
              desc:'Vue multi-feed grid — YouTube IP streams RTSP HLS DASH, audio processing, 3D vision tracking, packet analysis, walkie-talkie, Morse code, H3 triangulation',
              words:['multi-feed-grid YouTube-IFrame-API IP-streams RTSP','HTTP HLS DASH master-volume individual-audio','feed-rearrangement feed-history bulk-paste world-clocks','Unix-timestamp SMPTE-timecode UTC-time GPS-coordinates','IP-geolocation audio-monitoring waveform-visualization','spectrum-analyzer directional-audio EQ low-pass high-pass','noise-gate audio-mixing ducking walkie-talkie push-to-talk','Morse-code radio-stations H3-triangulation UHF-channels','MediaPipe face-tracking pose-estimation point-cloud','packet-analyzer PCAP binary-hex subtitle-capture']
            },
        ];

        // ─── QUANTUM DYNAMICS CAPSULES — Ballistic / Financial / Atmos / Readout ───
        // [P0.12] D-Wave spin chain dynamics, financial signal patterns, Dolby Atmos spatial, measurement readout
        const QUANTUM_DYNAMICS_CAPSULES = [
            { id:'quantum-ballistic', name:'Quantum Ballistic Dynamics', flag:'\u269B\uFE0F', color:'#06b6d4', cat:'science', age:'all',
              desc:'D-Wave ballistic excitation dynamics — 120-spin ring, light cone propagation, interference patterns, dispersion relation, wave propagation, coupling synchronization',
              words:['ballistic-dynamics light-cone spin-chain ring-topology','excitation propagation interference dispersion-relation','120-spin lazy-river pebble-drop wave-propagation','self-interference coupling synchronization dance','qubit-ring circular-chain nearest-neighbor','spin-flip excitation-transfer energy-transport','group-velocity phase-velocity wave-vector lattice','Hamiltonian Heisenberg XXZ transverse-field Ising','annealing-schedule flux-qubit persistent-current','fluxonium DAC control-line multiplexed bias']
            },
            { id:'quantum-financial', name:'Quantum Financial Signals', flag:'\uD83D\uDCC8', color:'#f59e0b', cat:'science', age:'all',
              desc:'Financial signal → quantum measurement mapping — iron condor, RSI, MACD, Bollinger, volatility surface, theta decay, MRI structural imaging, option chain',
              words:['iron-condor put-call strike-price expiry theta-decay','RSI relative-strength-index overbought oversold','MACD moving-average convergence divergence signal','bollinger-band volatility-surface delta-hedge gamma','option-chain measurement-window confidence-region','MRI structural-imaging slice-selection gradient-echo','frequency-encoding phase-encoding signal-intensity','spin-echo refocusing-pulse T1-relaxation T2-decay','magnetization-amplitude readout-confidence error-bound','quantum-tomography state-reconstruction Wigner-function']
            },
            { id:'quantum-atmos', name:'Quantum Dolby Atmos Spatial', flag:'\uD83D\uDD0A', color:'#8b5cf6', cat:'science', age:'all',
              desc:'Dolby Atmos 7.1.4 → quantum state mapping — speaker-to-qubit, bed audio, object audio, binaural HRTF, flux-pinned source line, spatial field',
              words:['dolby-atmos 7.1.4 bed-audio object-audio binaural','HRTF head-tracking ambisonics speaker-layout spatial','LFE height-channel surround top-front top-rear','left right center sub surround-left surround-right','flux-pinned source-line persistent-current bias','DAC-voltage multiplexed-control channel-amplitude','object-routing spatial-field listener-position','partial-trace marginalize observer-frame basis-choice','speaker-qubit-mapping 12-channel 128-object','rendering-mode binaural-decode room-model BRIR']
            },
            { id:'quantum-readout', name:'Quantum Readout Framework', flag:'\uD83D\uDCCF', color:'#10b981', cat:'science', age:'all',
              desc:'Source/target/detector measurement — z-magnetization, rotation gates Rz Rx Ry, spin-up spin-down, basis change, detector delay, qubit index, readout fidelity',
              words:['z-magnetization x-magnetization y-magnetization','Rz-gate Rx-gate Ry-gate rotation-angle basis-change','spin-up spin-down zS-equals-1 xS-equals-0','source-target-detector readout-fidelity measurement','detector-delay qubit-index magnetization-graph','light-cone-graph interference-band decoherence','Rz-zero Rz-pi-over-4 Rz-pi-over-2 tomography','population coherence superposition-readout','Bloch-sphere theta phi polar-angle azimuthal','expectation-value Pauli-Z Pauli-X observable']
            },
        ];

        const CONTRAIL_CAPSULES = [
            { id:'code-symbols', name:'Code Symbol Shorthand', flag:'\u2261', color:'#58a6ff', cat:'contrail', age:'all',
              desc:'Why code uses > < <> [] {} () — symbol origins, block concepts, contrail shorthand for μgrad concept learning',
              words:['> greater-than flow-direction pipe-redirect output-to','< less-than input-from template-open generic-type','<> diamond not-equal generic-pair angle-bracket','[] array-access index square-bracket optional list','() group-precedence function-call tuple capture','{}  block-scope object-literal set dictionary','=> arrow-function fat-arrow implies maps-to lambda',
                '-> thin-arrow return-type pointer-deref field-access',':: scope-resolution namespace path-separator cons','.. range-operator spread rest slice exclusive',
                '... spread-operator rest-params variadic ellipsis','?? nullish-coalescing default-fallback nil-guard','?. optional-chain safe-access nil-traverse','// comment-line annotation remark documentation',
                '/* */ block-comment multi-line docstring region','| pipe union bitwise-or alternative choice','& reference bitwise-and intersection address-of','^ caret xor power exponent superscript',
                '~ tilde complement negate home-dir bitwise-not','! bang negation not assertion non-null force','@ at decorator attribute annotation mention',
                '# hash octothorpe comment preprocessor channel tag','$ dollar template-var environment shell-expansion','_ underscore discard private unused separator','` backtick template-literal command-sub raw-string',
                '; semicolon statement-end sequence separator','= assignment bind equals define set-to',
                '== equality comparison assert-equal test-match','=== strict-equal identity type-safe no-coerce',
                '!= not-equal differs mismatch reject-when','+ plus add concatenate increment positive','- minus subtract decrement negative dash',
                '* star multiply dereference glob wildcard import-all','/ divide path-separator URL fraction ratio','% modulo remainder format-string template'] },
            { id:'block-concepts', name:'Block Concept Contrails', flag:'\u25A0', color:'#a78bfa', cat:'contrail', age:'all',
              desc:'Contrail shorthand for code blocks — evolving Unicode-style concept symbols for μgrad to learn structural patterns as compressed ideas',
              words:['⊞ module-block namespace container package','⊟ collapse-block fold hidden minimized','⊠ sealed-block final frozen immutable','⊡ empty-block stub placeholder skeleton',
                '⊢ entails proves yields derives-from','⊣ left-tack receives accepts consumes','⊤ true tautology always top-type any','⊥ false bottom-type never absurd error',
                '⊦ assertion proof theorem verified','⊧ models satisfies valid-in semantic','⊨ entails valid consequence follows',
                '⋮ vertical-ellipsis continuation more-lines truncated','⋯ horizontal-ellipsis omitted abbreviated',
                '⟨⟩ angle-bracket generic type-param template','⟦⟧ semantic-bracket interpretation denotation',
                '⟬⟭ white-bracket optional maybe nullable','⟮⟯ flattened-bracket group inline-block',
                '◇ diamond maybe option monad either','□ box necessity must always modal','○ circle promise future async deferred',
                '● dot active current selected filled','◎ target bullseye focus codex entry-point','◉ fisheye zoom detail magnify inspect',
                '▶ play run execute start invoke','■ stop halt terminate end block','▲ up ascend parent super yield','▼ down descend child sub receive',
                '⇒ double-arrow implies then consequence','⇐ reverse-arrow from caused-by source','⇔ biconditional iff equivalent mutual',
                '∀ for-all universal every each map','∃ exists some any find filter','∄ not-exists none empty missing null'] },
            { id:'flow-contrails', name:'Flow & Pipe Contrails', flag:'\u21C0', color:'#3fb950', cat:'contrail', age:'all',
              desc:'Data flow contrail symbols — pipe chains, transformations, async patterns, stream processing concepts as compressed glyphs',
              words:['→ data-flows-to next-step transforms-into pipe','← data-comes-from source previous reverse','↔ bidirectional sync mirror two-way','↕ vertical-flow up-down stack push-pop',
                '⟶ long-arrow pipeline multi-step chain','⟹ yields-eventually async-result eventual-value',
                '∘ compose combine chain-functions pipe-right','⊕ xor-combine merge-unique exclusive-add',
                '⊗ tensor-product combine-dimensions cross-join','⊙ hadamard-product element-wise multiply-each',
                '≫ shift-right stream-forward fast-forward skip','≪ shift-left stream-back rewind seek',
                '⊲ left-inject feed-input provide supply','⊳ right-inject consume-output take drain',
                '∥ parallel concurrent both-at-once fork-join','⫽ divide-parallel split-stream fan-out',
                '⇝ leads-to eventually-becomes converges','⇜ originates-from diverges-from source-of',
                '↻ loop-back retry repeat cycle recurse','↺ undo rollback revert previous-state',
                '⤴ throw-up emit raise bubble propagate','⤵ catch-down handle absorb receive sink'] },
            { id:'type-contrails', name:'Type System Contrails', flag:'\u03C4', color:'#f0883e', cat:'contrail', age:'all',
              desc:'Type annotation shorthand — structural types, generics, bounds, variance as compact contrail symbols for code generation',
              words:['τ type type-variable placeholder generic-T','σ sigma sum-type union variant either','π product-type tuple struct record pair',
                '∩ intersection both must-satisfy all-of','∪ union one-of any-of some-of either','⊂ subtype extends inherits-from narrows','⊃ supertype widens generalizes parent',
                '∈ member-of element-in belongs-to contained','∉ not-member-of excluded outside foreign',
                '≡ identical-type structurally-same equivalent','≢ not-identical different-shape incompatible',
                '⊆ subtype-or-equal assignable-to fits-into','⊇ supertype-or-equal accepts-from covers',
                'ℕ natural-number unsigned positive integer','ℤ integer signed whole-number int','ℝ real-number float double decimal',
                'ℂ complex-number imaginary real-plus-imaginary','𝔹 boolean flag predicate true-false bit',
                '⊤ any top-type universal accepts-all','⊥ never bottom-type impossible rejects-all',
                '? optional maybe nullable could-be-null','! required non-null asserted must-exist'] }
        ];

        function mergeCapsuleSets(baseCapsules, generatedCapsules) {
            var out = [];
            var byId = {};
            function normWord(w) { return String(w || '').trim().toLowerCase(); }
            function mergeMeta(baseMeta, incomingMeta) {
                var a = baseMeta || {};
                var b = incomingMeta || {};
                var outMeta = Object.assign({}, a, b);
                ['aliases', 'top_venues'].forEach(function(k) {
                    var av = Array.isArray(a[k]) ? a[k] : [];
                    var bv = Array.isArray(b[k]) ? b[k] : [];
                    var seen = {};
                    outMeta[k] = av.concat(bv).filter(function(v) {
                        var key = String(v || '').trim().toLowerCase();
                        if (!key || seen[key]) return false;
                        seen[key] = 1;
                        return true;
                    });
                });
                return outMeta;
            }
            function pushCap(cap) {
                if (!cap || !cap.id) return;
                var id = String(cap.id);
                var words = Array.isArray(cap.words) ? cap.words : [];
                if (!byId[id]) {
                    byId[id] = {
                        id: id,
                        name: cap.name || id,
                        flag: cap.flag || '🧩',
                        color: cap.color || '#8b949e',
                        cat: cap.cat || 'misc',
                        age: cap.age || 'all',
                        desc: cap.desc || 'Generated/merged capsule',
                        meta: cap.meta || {},
                        words: [],
                        _seen: {}
                    };
                    out.push(byId[id]);
                }
                var target = byId[id];
                target.meta = mergeMeta(target.meta, cap.meta || {});
                if (cap.desc && target.desc === 'Generated/merged capsule') target.desc = cap.desc;
                if (cap.flag && target.flag === '🧩') target.flag = cap.flag;
                words.forEach(function(w) {
                    var raw = String(w || '').trim();
                    var s = normWord(w);
                    if (!s || target._seen[s]) return;
                    target._seen[s] = 1;
                    target.words.push(raw);
                });
            }
            (baseCapsules || []).forEach(pushCap);
            (generatedCapsules || []).forEach(pushCap);
            out.forEach(function(c) { delete c._seen; });
            return out;
        }

        var LOCAL_CAPSULE_STORE_KEY = "kbatch-capsules.local-overrides.v1";
        function loadLocalCapsuleOverrides() {
            try {
                var raw = localStorage.getItem(LOCAL_CAPSULE_STORE_KEY);
                if (!raw) return [];
                var parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                return [];
            }
        }
        function persistLocalCapsuleOverrides(list) {
            try {
                localStorage.setItem(LOCAL_CAPSULE_STORE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
            } catch (_) {}
        }
        function sanitizeCapsuleInput(raw, fallbackId) {
            var obj = raw || {};
            var id = String(obj.id || fallbackId || "").trim().toLowerCase();
            if (!id) return null;
            var words = Array.isArray(obj.words) ? obj.words : String(obj.words || "").split(/[,\n]/g);
            return {
                id: id,
                name: String(obj.name || id).trim(),
                flag: String(obj.flag || "🧩"),
                color: String(obj.color || "#8b949e"),
                cat: String(obj.cat || "code").trim().toLowerCase(),
                age: String(obj.age || "all"),
                desc: String(obj.desc || "Generated/merged capsule"),
                words: normalizeCapsuleWords(words),
                meta: Object.assign({}, obj.meta || {})
            };
        }

        const BASE_CAPSULES = LANG_CAPSULES.concat(DOMAIN_CAPSULES).concat(ANCIENT_CAPSULES).concat(ACCESS_CAPSULES).concat(ENCODING_CAPSULES).concat(SCIENCE_CAPSULES).concat(ACOUSTIC_CAPSULES).concat(STROKE_CAPSULES).concat(COMPLIANCE_CAPSULES).concat(PROJECT_CAPSULES).concat(QUANTUM_DYNAMICS_CAPSULES).concat(CONTRAIL_CAPSULES);
        const LOCAL_CAPSULE_OVERRIDES = loadLocalCapsuleOverrides();
        const CAPSULES = mergeCapsuleSets(
            mergeCapsuleSets(BASE_CAPSULES, window.kbatchCapsulesGenerated || []),
            LOCAL_CAPSULE_OVERRIDES
        );
        const CAPSULE_BY_ID = Object.create(null);
        CAPSULES.forEach(function(c) {
            CAPSULE_BY_ID[String(c && c.id || '').toLowerCase()] = c;
        });
        let capsuleSearchWorker = null;
        const capsuleSearchPending = Object.create(null);
        let capsuleSearchReq = 0;

        function ensureCapsuleSearchWorker() {
            if (capsuleSearchWorker) return capsuleSearchWorker;
            if (typeof Worker !== 'function') return null;
            try {
                capsuleSearchWorker = new Worker('kbatch-capsule-search-worker.js');
                capsuleSearchWorker.onmessage = function(ev) {
                    const msg = ev && ev.data ? ev.data : {};
                    if (msg.type !== 'search-result') return;
                    const reqId = String(msg.req_id || '');
                    const cb = capsuleSearchPending[reqId];
                    if (!cb) return;
                    delete capsuleSearchPending[reqId];
                    cb(Array.isArray(msg.results) ? msg.results : []);
                };
                capsuleSearchWorker.postMessage({ type: 'hydrate', capsules: CAPSULES });
            } catch (_) {
                capsuleSearchWorker = null;
            }
            return capsuleSearchWorker;
        }

        function capsuleSearchFallback(query, limit) {
            var q = String(query || '').trim().toLowerCase();
            var n = Math.max(1, parseInt(limit || 20, 10) || 20);
            if (!q) return [];
            return CAPSULES
                .filter(function(c) { return capsuleSearchText(c).indexOf(q) !== -1; })
                .slice(0, n)
                .map(function(c, idx) {
                    return {
                        id: c.id || '',
                        name: c.name || '',
                        cat: c.cat || '',
                        score: Math.max(1, n - idx),
                        words: Array.isArray(c.words) ? c.words.length : 0
                    };
                });
        }

        function capsuleSearchAsync(query, limit) {
            return new Promise(function(resolve) {
                var worker = ensureCapsuleSearchWorker();
                if (!worker) return resolve(capsuleSearchFallback(query, limit));
                var reqId = 'req-' + (++capsuleSearchReq) + '-' + Date.now();
                capsuleSearchPending[reqId] = resolve;
                worker.postMessage({
                    type: 'search',
                    req_id: reqId,
                    query: String(query || ''),
                    limit: Math.max(1, parseInt(limit || 20, 10) || 20)
                });
            });
        }

        function isVerifiedAgency(meta) {
            var src = String(meta && meta.registry_source_class || '').toLowerCase();
            var pack = String(meta && meta.pack_type || '').toLowerCase();
            return src === 'verified' || (pack === 'language-authority' && src !== 'synthesized');
        }

        function isSynthAgency(meta) {
            return String(meta && meta.registry_source_class || '').toLowerCase() === 'synthesized';
        }

        function capsuleMatchesFilter(cap, filter) {
            if (filter === 'all') return true;
            var meta = cap && cap.meta ? cap.meta : {};
            if (filter === 'research') return (cap.id || '').indexOf('caps.research.') === 0 || meta.entity_type === 'university' || meta.entity_type === 'publisher' || meta.entity_type === 'language-agency' || meta.entity_type === 'language-community';
            if (filter === 'university') return meta.entity_type === 'university';
            if (filter === 'publisher') return meta.entity_type === 'publisher';
            if (filter === 'agency') {
                return meta.entity_type === 'language-agency' || meta.entity_type === 'language-community' || (cap.id || '').indexOf('caps.lang.indigenous.stewardship.') === 0;
            }
            if (filter === 'agency-verified') return meta.entity_type === 'language-agency' && isVerifiedAgency(meta);
            if (filter === 'agency-synth') return meta.entity_type === 'language-agency' && isSynthAgency(meta);
            return cap.cat === filter;
        }

        function capsuleSearchText(cap) {
            var meta = cap && cap.meta ? cap.meta : {};
            var aliases = Array.isArray(meta.aliases) ? meta.aliases.join(' ') : '';
            var venues = Array.isArray(meta.top_venues) ? meta.top_venues.join(' ') : '';
            var spoken = Array.isArray(meta.spoken_languages) ? meta.spoken_languages.join(' ') : '';
            var clans = Array.isArray(meta.clan_subgroups) ? meta.clan_subgroups.join(' ') : '';
            return [
                cap.id, cap.name, cap.cat, cap.desc, (cap.words || []).join(' '),
                aliases, venues, spoken, clans, meta.nation_group || '', meta.authority_scope || '', meta.subset_type || '',
                meta.country || '', meta.domain || '', meta.entity_id || '', meta.parent_region || '', meta.canonical_url || ''
            ].join(' ').toLowerCase();
        }

        function getCapsuleById(id) {
            var k = String(id || '').trim().toLowerCase();
            return CAPSULE_BY_ID[k] || null;
        }

        function normalizeCapsuleWords(list) {
            var seen = Object.create(null);
            var out = [];
            (list || []).forEach(function(raw) {
                var token = String(raw || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9\-_]/g, ' ')
                    .trim();
                if (!token) return;
                token.split(/\s+/).forEach(function(part) {
                    if (!part || part.length < 3 || seen[part]) return;
                    seen[part] = true;
                    out.push(part);
                });
            });
            return out.slice(0, 128);
        }

        function buildPlanCorpusCapsules(idx) {
            if (!idx || !idx.categories) return [];
            var categories = idx.categories || {};
            var out = [];
            Object.keys(categories).forEach(function(cat) {
                var entry = categories[cat] || {};
                var catText = String(cat || '').replace(/[_\-]+/g, ' ').trim();
                var versions = Array.isArray(entry.versions) ? entry.versions : [];
                var latest = versions.length ? versions[versions.length - 1] : null;
                var versionWords = versions.slice(-4).map(function(v) { return v && v.file ? String(v.file).replace(/\.plan\.md$/i, '').replace(/[_\-]+/g, ' ') : ''; });
                var words = normalizeCapsuleWords([catText, (latest && latest.file) || '', (entry.latestVersion || ''), versionWords.join(' ')]);
                if (!words.length) return;
                var id = 'caps.plan.' + String(cat || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                out.push({
                    id: id,
                    name: catText || String(cat || 'plan'),
                    flag: '🧭',
                    color: '#58a6ff',
                    cat: 'research',
                    age: 'all ages',
                    desc: 'Plan corpus category capsule (live index feed)',
                    words: words,
                    meta: {
                        entity_type: 'plan-corpus',
                        source: 'plan-corpus',
                        plan_category: cat,
                        iteration_count: entry.iterationCount || versions.length || 0,
                        latest_version: entry.latestVersion || (latest && latest.file) || null,
                        corpus_generated_at: idx.generatedAt || null
                    }
                });
            });
            return out;
        }

        function upsertCapsules(capsules) {
            var changed = 0;
            (capsules || []).forEach(function(incoming) {
                if (!incoming || !incoming.id) return;
                var key = String(incoming.id).toLowerCase();
                var existing = CAPSULE_BY_ID[key];
                if (!existing) {
                    CAPSULES.push(incoming);
                    CAPSULE_BY_ID[key] = incoming;
                    changed++;
                    return;
                }
                var mergedWords = normalizeCapsuleWords((existing.words || []).concat(incoming.words || []));
                if (mergedWords.length && mergedWords.join(' ') !== (existing.words || []).join(' ')) {
                    existing.words = mergedWords;
                    changed++;
                }
                ['name', 'flag', 'color', 'cat', 'age', 'desc'].forEach(function(field) {
                    if (!incoming[field]) return;
                    if (String(existing[field] || '') !== String(incoming[field])) {
                        existing[field] = incoming[field];
                        changed++;
                    }
                });
                if (incoming.meta) existing.meta = Object.assign({}, existing.meta || {}, incoming.meta || {});
            });
            window.kbatchCapsules = CAPSULES;
            return changed;
        }

        function rememberLocalCapsuleOverride(cap) {
            if (!cap || !cap.id) return;
            var normalized = sanitizeCapsuleInput(cap, cap.id);
            if (!normalized) return;
            var idx = -1;
            for (var i = 0; i < LOCAL_CAPSULE_OVERRIDES.length; i++) {
                if (String(LOCAL_CAPSULE_OVERRIDES[i] && LOCAL_CAPSULE_OVERRIDES[i].id || '').toLowerCase() === normalized.id) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) LOCAL_CAPSULE_OVERRIDES[idx] = normalized;
            else LOCAL_CAPSULE_OVERRIDES.push(normalized);
            persistLocalCapsuleOverrides(LOCAL_CAPSULE_OVERRIDES);
        }

        function upsertCapsuleFromCli(raw, opts) {
            var capsule = sanitizeCapsuleInput(raw);
            if (!capsule) return { error: 'capsule id required' };
            var changed = upsertCapsules([capsule]);
            if ((opts && opts.persist) !== false) rememberLocalCapsuleOverride(capsule);
            rehydrateCapsuleSearchWorker();
            return { capsule: getCapsuleById(capsule.id), changed: changed };
        }

        function appendCapsuleWordsFromCli(id, words, opts) {
            var cap = getCapsuleById(id);
            if (!cap) return { error: 'capsule not found' };
            var extra = normalizeCapsuleWords(Array.isArray(words) ? words : String(words || '').split(/[,\n]/g));
            if (!extra.length) return { capsule: cap, added: 0, changed: 0 };
            var next = sanitizeCapsuleInput({
                id: cap.id,
                name: cap.name,
                flag: cap.flag,
                color: cap.color,
                cat: cap.cat,
                age: cap.age,
                desc: cap.desc,
                words: (cap.words || []).concat(extra),
                meta: Object.assign({}, cap.meta || {}, { local_source: 'kbatch-cli' })
            });
            var changed = upsertCapsules([next]);
            if ((opts && opts.persist) !== false) rememberLocalCapsuleOverride(next);
            rehydrateCapsuleSearchWorker();
            return { capsule: getCapsuleById(cap.id), added: extra.length, changed: changed };
        }

        function rehydrateCapsuleSearchWorker() {
            if (!capsuleSearchWorker) return;
            try { capsuleSearchWorker.postMessage({ type: 'hydrate', capsules: CAPSULES }); } catch (_) {}
        }

        function buildCapsuleStackPacket(cap) {
            var text = (cap && cap.words ? cap.words.join('\n') : '').trim();
            var QP = window.QuantumPrefixes;
            var QC = window.qbitCodec;
            var QS = window.QbitSteno;
            var language = 'text';
            var packet = {
                capsule: {
                    id: cap.id,
                    name: cap.name,
                    cat: cap.cat,
                    age: cap.age,
                    desc: cap.desc,
                    words: cap.words,
                    meta: cap.meta || {}
                },
                stack: buildStackEnvelope(text, language, 'kbatch-capsule-' + cap.id),
                text: text
            };
            if (QP && QP.prefixMetadata) {
                try { packet.prefix = QP.prefixMetadata(text, language); } catch (_) {}
            }
            if (QS && QS.stenoAnalyze) {
                try { packet.steno = QS.stenoAnalyze(text); } catch (_) {}
            }
            if (QC && QC.encode) {
                try {
                    var enc = QC.encode(text, language, 'kbatch-capsule-' + cap.id);
                    packet.codec = {
                        encodedBytes: ((enc && (enc.code || enc.text)) || '').length,
                        t5: (typeof QC.t5Available === 'function') ? (QC.t5Available() ? 'native' : 'browser') : 'browser'
                    };
                } catch (_) {}
            }
            return packet;
        }

        function exportCapsulePacket(cap) {
            if (!cap) return null;
            var packet = buildCapsuleStackPacket(cap);
            var payload = JSON.stringify(packet, null, 2);
            var QP = window.QuantumPrefixes;
            if (QP && QP.wrapJsonExport) {
                try {
                    payload = JSON.stringify(QP.wrapJsonExport(packet, payload, 'kbatch-capsule-' + cap.id), null, 2);
                } catch (_) {}
            }
            var blob = new Blob([payload], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'kbatch-capsule-' + String(cap.id || 'export') + '-' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(a.href);
            return packet;
        }

        function emitCapsulePacket(cap) {
            if (!cap) return null;
            var packet = buildCapsuleStackPacket(cap);
            publishToEcosystem('kbatch-capsule-packet', packet, ['quantum-prefixes', 'iron-line', 'uterm-notes', 'kbatch-training']);
            return packet;
        }

        function buildCapsuleOpenSearchQuery(cap, maxTerms) {
            var terms = [];
            var seen = {};
            function addTerm(t) {
                var s = String(t || '').trim();
                var k = s.toLowerCase();
                if (!s || seen[k]) return;
                seen[k] = 1;
                terms.push(s);
            }
            var meta = cap && cap.meta ? cap.meta : {};
            addTerm(cap && cap.name);
            addTerm(cap && cap.id);
            (Array.isArray(meta.aliases) ? meta.aliases : []).forEach(addTerm);
            (Array.isArray(meta.top_venues) ? meta.top_venues : []).slice(0, 6).forEach(addTerm);
            (Array.isArray(meta.spoken_languages) ? meta.spoken_languages : []).slice(0, 12).forEach(addTerm);
            (Array.isArray(meta.clan_subgroups) ? meta.clan_subgroups : []).slice(0, 10).forEach(addTerm);
            if (meta.nation_group) addTerm(meta.nation_group);
            if (meta.authority_scope) addTerm(meta.authority_scope);
            if (meta.subset_type) addTerm(meta.subset_type);
            (Array.isArray(cap && cap.words ? cap.words : []) ? cap.words : []).slice(0, Math.max(6, (maxTerms || 14) - terms.length)).forEach(addTerm);
            return terms.slice(0, maxTerms || 14).join(' ');
        }

        function runCapsuleOpenSearch(cap, opts) {
            var HS = window.HistorySearch;
            if (!cap) return Promise.resolve({ error: 'missing capsule' });
            if (!HS || !HS.search) return Promise.resolve({ error: 'history-search unavailable' });
            var options = opts || {};
            var maxTerms = Math.max(4, parseInt(options.maxTerms || 14, 10) || 14);
            var query = buildCapsuleOpenSearchQuery(cap, maxTerms);
            return HS.search(query, { onProgress: function() {} }).then(function(res) {
                var payload = {
                    capsuleId: cap.id,
                    capsuleName: cap.name,
                    query: query,
                    totalResults: res.totalResults,
                    connectorsUsed: res.connectorsUsed,
                    latencyMs: res.latencyMs,
                    topResults: (res.results || []).slice(0, 12).map(function(r) {
                        return { title: r.title, source: r.source, url: r.url, score: r.score };
                    }),
                    stack: buildStackEnvelope(query, 'text', 'kbatch-capsule-open-search')
                };
                publishToEcosystem('kbatch-capsule-open-search', payload, ['iron-line', 'kbatch-training', 'uterm-notes']);
                return payload;
            });
        }

        function languagePreservationProfile(cap) {
            if (!cap) return null;
            var meta = cap.meta || {};
            var track = meta.preservation_track || {};
            var profile = {
                capsuleId: cap.id,
                capsuleName: cap.name,
                nationGroup: meta.nation_group || '',
                originRegion: meta.origin_region || '',
                eldersSubset: track.elders_subset || '',
                origin: track.origin || '',
                keptAlive: track.kept_alive || '',
                reconnected: track.reconnected || '',
                timePeriod: track.time_period || '',
                diaspora: track.diaspora || '',
                keyboardExtensionNeeded: !!meta.keyboard_extension_needed,
                keyboardProfile: meta.keyboard_extension_profile || 'latin-basic',
                auditoryProfile: meta.auditory_expansion_profile || 'standard-speech-corpus',
                modalities: Array.isArray(meta.modalities) ? meta.modalities : ['oral', 'written', 'auditory'],
                crossSyncChannels: Array.isArray(meta.cross_sync_channels) ? meta.cross_sync_channels : ['iron-line', 'kbatch-training', 'uterm-notes'],
                stack: buildCapsuleStackPacket(cap)
            };
            return profile;
        }

        function emitLanguagePreservationSync(cap) {
            var profile = languagePreservationProfile(cap);
            if (!profile) return null;
            publishToEcosystem('kbatch-language-preservation-sync', profile, profile.crossSyncChannels);
            return profile;
        }

        function capsulesForScope(scope) {
            var s = String(scope || 'research').trim().toLowerCase();
            if (s === 'all') return CAPSULES.slice();
            if (s === 'university') {
                return CAPSULES.filter(function(c) { return c && c.meta && c.meta.entity_type === 'university'; });
            }
            if (s === 'publisher') {
                return CAPSULES.filter(function(c) { return c && c.meta && c.meta.entity_type === 'publisher'; });
            }
            if (s === 'agency') {
                return CAPSULES.filter(function(c) {
                    var meta = c && c.meta ? c.meta : {};
                    return meta.entity_type === 'language-agency' || meta.entity_type === 'language-community' || (c.id || '').indexOf('caps.lang.indigenous.stewardship.') === 0;
                });
            }
            if (s === 'agency-verified') {
                return CAPSULES.filter(function(c) {
                    var meta = c && c.meta ? c.meta : {};
                    return meta.entity_type === 'language-agency' && isVerifiedAgency(meta);
                });
            }
            if (s === 'agency-synth') {
                return CAPSULES.filter(function(c) {
                    var meta = c && c.meta ? c.meta : {};
                    return meta.entity_type === 'language-agency' && isSynthAgency(meta);
                });
            }
            if (s === 'entity') {
                return CAPSULES.filter(function(c) {
                    return c && c.meta && (
                        c.meta.entity_type === 'university' ||
                        c.meta.entity_type === 'publisher' ||
                        c.meta.entity_type === 'language-agency' ||
                        c.meta.entity_type === 'language-community'
                    );
                });
            }
            return CAPSULES.filter(function(c) { return (c.id || '').indexOf('caps.research.') === 0; });
        }

        function syncCapsulePackets(options, onProgress) {
            var opts = options || {};
            var scope = String(opts.scope || 'research').trim().toLowerCase();
            var batchSize = Math.max(1, parseInt(opts.batchSize || 12, 10) || 12);
            var delayMs = Math.max(0, parseInt(opts.delayMs || 60, 10) || 60);
            var targets = capsulesForScope(scope);
            var total = targets.length;
            var started = performance.now();
            return new Promise(function(resolve) {
                if (!total) {
                    var emptySummary = { scope: scope, total: 0, emitted: 0, elapsedMs: 0 };
                    if (typeof onProgress === 'function') onProgress(Object.assign({ done: true }, emptySummary));
                    resolve(emptySummary);
                    return;
                }
                var idx = 0;
                var emitted = 0;
                function tick() {
                    var from = idx;
                    var to = Math.min(idx + batchSize, total);
                    for (; idx < to; idx++) {
                        emitCapsulePacket(targets[idx]);
                        emitted++;
                    }
                    var progress = {
                        scope: scope,
                        total: total,
                        emitted: emitted,
                        batchStart: from + 1,
                        batchEnd: to,
                        done: emitted >= total
                    };
                    if (typeof onProgress === 'function') onProgress(progress);
                    if (emitted >= total) {
                        resolve({
                            scope: scope,
                            total: total,
                            emitted: emitted,
                            elapsedMs: Math.round(performance.now() - started)
                        });
                        return;
                    }
                    setTimeout(tick, delayMs);
                }
                tick();
            });
        }

        if (window.CapsuleEmbed) CapsuleEmbed.setCapsules(CAPSULES);

        // ══════════════════ CAPSULE ANALYZER — ML BENCHMARK SEED ══════════════════
        // Pre-analyzes every word in every capsule with full keyboard ergonomics,
        // contrail paths, rhythm signatures, quantum prefix classification, and
        // pattern flow data. This is the ML benchmark baseline — everything grows from it.
        window.CapsuleAnalyzer = (function() {
            'use strict';
            var STORE_KEY = 'uvspeed-capsule-analysis';
            var VERSION = 2;
            var cached = null;
            try {
                var raw = localStorage.getItem(STORE_KEY);
                if (raw) {
                    cached = JSON.parse(raw);
                    if (cached && cached.version !== VERSION) cached = null;
                }
            } catch(e) { cached = null; }

            // QWERTY positions (same as getActiveKeyPos but standalone for seed analysis)
            var QWERTY_ROWS = [
                ['q','w','e','r','t','y','u','i','o','p'],
                ['a','s','d','f','g','h','j','k','l',';'],
                ['z','x','c','v','b','n','m',',','.','/']
            ];
            var KEY_POS = {};
            QWERTY_ROWS.forEach(function(row, r) {
                row.forEach(function(key, c) {
                    KEY_POS[key] = { x: c + r * 0.25, y: r, row: r };
                });
            });
            KEY_POS[' '] = { x: 4.5, y: 3.2, row: 3 };

            var HOME_ROW = new Set('asdfghjkl;'.split(''));
            var KEY_SPACING_MM = 19.05;

            // Finger assignments
            var FINGERS = {};
            'qaz'.split('').forEach(function(k) { FINGERS[k] = { finger: 0, name: 'L-Pinky', hand: 'L', force: 0.6 }; });
            'wsx'.split('').forEach(function(k) { FINGERS[k] = { finger: 1, name: 'L-Ring', hand: 'L', force: 0.7 }; });
            'edc'.split('').forEach(function(k) { FINGERS[k] = { finger: 2, name: 'L-Middle', hand: 'L', force: 0.85 }; });
            'rfvtgb'.split('').forEach(function(k) { FINGERS[k] = { finger: 3, name: 'L-Index', hand: 'L', force: 1.0 }; });
            'yhnujm'.split('').forEach(function(k) { FINGERS[k] = { finger: 4, name: 'R-Index', hand: 'R', force: 1.0 }; });
            'ik,'.split('').forEach(function(k) { FINGERS[k] = { finger: 5, name: 'R-Middle', hand: 'R', force: 0.85 }; });
            'ol.'.split('').forEach(function(k) { FINGERS[k] = { finger: 6, name: 'R-Ring', hand: 'R', force: 0.7 }; });
            'p;/'.split('').forEach(function(k) { FINGERS[k] = { finger: 7, name: 'R-Pinky', hand: 'R', force: 0.6 }; });
            FINGERS[' '] = { finger: 8, name: 'Thumb', hand: 'B', force: 0.5 };

            // Rhythm base timing (ms) per finger — weaker fingers are slower
            var FINGER_TIMING = { 0: 145, 1: 125, 2: 105, 3: 95, 4: 95, 5: 105, 6: 125, 7: 145, 8: 80 };

            // Direction symbol
            function dirSym(dx, dy) {
                if (dx > 0.3 && dy < -0.3) return '\u2197';
                if (dx > 0.3 && dy > 0.3) return '\u2198';
                if (dx < -0.3 && dy < -0.3) return '\u2196';
                if (dx < -0.3 && dy > 0.3) return '\u2199';
                if (dx > 0.3) return '\u2192';
                if (dx < -0.3) return '\u2190';
                if (dy < -0.3) return '\u2191';
                if (dy > 0.3) return '\u2193';
                return '\u00b7';
            }

            // ── Analyze a single word ──
            function analyzeWord(word) {
                var lw = word.toLowerCase();
                var chars = lw.split('');
                var totalDist = 0;
                var contrailPath = '';
                var rowChanges = 0;
                var handAlternations = 0;
                var sameFingerRepeat = 0;
                var homeRowCount = 0;
                var fingerUsage = {};
                var rhythmMs = [];
                var keyPath = [];
                var bigrams = {};
                var prevFinger = null;
                var prevHand = null;
                var forceSum = 0;

                for (var i = 0; i < chars.length; i++) {
                    var ch = chars[i];
                    var pos = KEY_POS[ch];
                    var fi = FINGERS[ch] || { finger: -1, name: 'Unknown', hand: '?', force: 0.5 };

                    // Home row
                    if (HOME_ROW.has(ch)) homeRowCount++;
                    // Finger usage
                    fingerUsage[fi.name] = (fingerUsage[fi.name] || 0) + 1;
                    forceSum += fi.force;
                    // Rhythm: timing estimate based on finger strength + travel distance
                    var baseMs = FINGER_TIMING[fi.finger] || 120;

                    if (i > 0) {
                        var prevCh = chars[i - 1];
                        var prevPos = KEY_POS[prevCh];
                        var prevFi = FINGERS[prevCh] || { finger: -1, hand: '?' };

                        // Bigrams
                        var bi = prevCh + ch;
                        bigrams[bi] = (bigrams[bi] || 0) + 1;

                        if (pos && prevPos) {
                            var dx = pos.x - prevPos.x;
                            var dy = pos.y - prevPos.y;
                            var dist = Math.sqrt(dx * dx + dy * dy);
                            totalDist += dist;
                            contrailPath += dirSym(dx, dy);
                            keyPath.push({ from: prevCh, to: ch, dx: dx, dy: dy, dist: dist });

                            // Row changes
                            if (Math.abs(dy) > 0.3) rowChanges++;
                            // Travel penalty on rhythm
                            baseMs += dist * 12;
                        } else {
                            contrailPath += '?';
                        }

                        // Hand alternation
                        if (prevFi.hand !== fi.hand && prevFi.hand !== '?' && fi.hand !== '?') handAlternations++;
                        // Same finger repeat (RSI risk factor)
                        if (prevFi.finger === fi.finger && fi.finger >= 0) sameFingerRepeat++;
                    }
                    rhythmMs.push(Math.round(baseMs));
                }

                var len = chars.length;
                var homeRowPct = len > 0 ? homeRowCount / len : 0;
                var travelMM = totalDist * KEY_SPACING_MM;
                var avgForce = len > 0 ? forceSum / len : 0;
                var handBalance = handAlternations / Math.max(len - 1, 1);

                // Efficiency: closer to home row + less travel = higher
                var maxDist = Math.max((len - 1) * 3, 1);
                var efficiency = Math.max(0, Math.min(100, 100 - (totalDist / maxDist) * 100));
                // Complexity: row changes, travel, length
                var complexity = Math.min(100, rowChanges * 15 + totalDist * 5 + (len > 8 ? 15 : 0));
                // RSI risk estimate
                var rsiRisk = Math.max(0, Math.min(100, sameFingerRepeat * 20 + (1 - homeRowPct) * 40 + rowChanges * 10));
                // Rhythm signature: normalized timing pattern
                var totalRhythm = rhythmMs.reduce(function(s, v) { return s + v; }, 0);
                var rhythmSig = rhythmMs.map(function(v) { return totalRhythm > 0 ? +(v / totalRhythm * len).toFixed(3) : 1; });
                // Musical beats per character (normalize to 120 BPM = 500ms per beat)
                var bpm120beat = 500;
                var musicalPattern = rhythmMs.map(function(v) { return +(v / bpm120beat).toFixed(3); });

                // Quantum prefix classification (treat word as a single-line "code" statement)
                var quantumSym = '';
                var quantumGate = '';
                var quantumCoord = [0, 0, 0];
                if (typeof window !== 'undefined' && window.QuantumPrefixes) {
                    try {
                        var cls = window.QuantumPrefixes.classifyLine(word, 'text');
                        quantumSym = cls.sym || '';
                        quantumGate = cls.gate || '';
                        quantumCoord = [len, Math.round(complexity), Math.round(efficiency)];
                    } catch(e) {}
                }

                // Finger balance score (0=one finger, 100=perfectly distributed)
                var fingerCount = Object.keys(fingerUsage).length;
                var maxPerFinger = Math.max.apply(null, Object.values(fingerUsage).concat([1]));
                var fingerBalance = len > 0 ? Math.round((1 - maxPerFinger / len) * 100 * (fingerCount / 8)) : 0;

                return {
                    word: word,
                    length: len,
                    // Ergonomics
                    efficiency: Math.round(efficiency * 10) / 10,
                    complexity: Math.round(complexity * 10) / 10,
                    homeRowPct: Math.round(homeRowPct * 1000) / 10,
                    travelMM: Math.round(travelMM * 10) / 10,
                    rsiRisk: Math.round(rsiRisk * 10) / 10,
                    avgForce: Math.round(avgForce * 100) / 100,
                    fingerBalance: fingerBalance,
                    handBalance: Math.round(handBalance * 100),
                    sameFingerRepeat: sameFingerRepeat,
                    rowChanges: rowChanges,
                    handAlternations: handAlternations,
                    // Pattern flow
                    contrailPath: contrailPath,
                    keyPath: keyPath,
                    bigrams: bigrams,
                    fingerUsage: fingerUsage,
                    // Rhythm
                    rhythmMs: rhythmMs,
                    rhythmSignature: rhythmSig,
                    musicalPattern: musicalPattern,
                    totalRhythmMs: totalRhythm,
                    // Quantum
                    quantumSym: quantumSym,
                    quantumGate: quantumGate,
                    quantumCoord: quantumCoord,
                    // Steno concept atoms
                    conceptAtoms: [],
                    conceptSymbols: '',
                    conceptFreq: [],
                    conceptCharge: 0,
                    // Flow / music / rhythm / intonation
                    flowArrows: '',
                    flowPattern: '',
                    danceNotation: '',
                    wandNotation: '',
                    musicalNotes: '',
                    intonationPattern: '',
                    intonationCadence: '',
                    beatPattern: '',
                    timeSig: '',
                    bpm: 0,
                    // Multi-alphabet representations
                    braille: '',
                    morse: '',
                    asl: '',
                    bsl: '',
                };
                // Enrich with Encoder flow/music/rhythm data + multi-alphabet
                if (window.Encoder) {
                    try {
                        var flow = window.Encoder.toKeyboardFlow(word);
                        if (flow) { result.flowArrows = flow.arrows; result.flowPattern = flow.pattern; }
                        result.danceNotation = window.Encoder.toDanceMoves(word);
                        result.wandNotation = window.Encoder.toWandMoves(word);
                        result.musicalNotes = window.Encoder.toMusicNotation(word);
                        var rhythm = window.Encoder.toRhythm(word);
                        if (rhythm) { result.beatPattern = rhythm.beats; result.timeSig = rhythm.timeSig; result.bpm = rhythm.bpm; }
                        var inton = window.Encoder.toIntonation(word);
                        if (inton) { result.intonationPattern = inton.pattern; result.intonationCadence = inton.cadence; }
                        // Multi-alphabet encoding
                        result.braille = window.Encoder.toBraille(word);
                        result.morse = window.Encoder.toMorse(word);
                        result.asl = window.Encoder.toASL(word);
                        result.bsl = window.Encoder.toBSL(word);
                    } catch(e) {}
                }
                // Enrich with StenoEngine concept atoms
                if (window.StenoEngine) {
                    try {
                        var enriched = window.StenoEngine.enrichWord(word);
                        if (enriched && enriched.atoms.length > 0) {
                            result.conceptAtoms = enriched.atoms;
                            result.conceptSymbols = enriched.symbols;
                            result.conceptFreq = enriched.freq;
                            result.conceptCharge = enriched.charge;
                        }
                    } catch(e) {}
                }
                return result;
            }

            // ── Analyze an entire capsule ──
            function analyzeCapsule(capsule) {
                var wordAnalyses = capsule.words.map(analyzeWord);
                var n = wordAnalyses.length;
                if (n === 0) return { capsule: capsule.id, words: [], aggregate: null };

                // Aggregate stats
                var sum = function(arr, key) { return arr.reduce(function(s, w) { return s + (w[key] || 0); }, 0); };
                var avg = function(arr, key) { return Math.round(sum(arr, key) / n * 10) / 10; };

                // Top bigrams across capsule
                var allBigrams = {};
                wordAnalyses.forEach(function(w) {
                    Object.entries(w.bigrams).forEach(function(e) {
                        allBigrams[e[0]] = (allBigrams[e[0]] || 0) + e[1];
                    });
                });
                var topBigrams = Object.entries(allBigrams).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 20);

                // Finger usage across capsule
                var allFingers = {};
                wordAnalyses.forEach(function(w) {
                    Object.entries(w.fingerUsage).forEach(function(e) {
                        allFingers[e[0]] = (allFingers[e[0]] || 0) + e[1];
                    });
                });

                // Rhythm profile: average rhythm signature length-bucketed
                var rhythmBuckets = {};
                wordAnalyses.forEach(function(w) {
                    var bucket = Math.min(w.length, 12);
                    if (!rhythmBuckets[bucket]) rhythmBuckets[bucket] = [];
                    rhythmBuckets[bucket].push(w.rhythmSignature);
                });

                // Quantum gate distribution
                var gateDist = {};
                wordAnalyses.forEach(function(w) {
                    if (w.quantumGate) gateDist[w.quantumGate] = (gateDist[w.quantumGate] || 0) + 1;
                });

                return {
                    capsule: capsule.id,
                    name: capsule.name,
                    cat: capsule.cat,
                    meta: capsule.meta || {},
                    wordCount: n,
                    words: wordAnalyses,
                    aggregate: {
                        avgEfficiency: avg(wordAnalyses, 'efficiency'),
                        avgComplexity: avg(wordAnalyses, 'complexity'),
                        avgHomeRowPct: avg(wordAnalyses, 'homeRowPct'),
                        avgTravelMM: avg(wordAnalyses, 'travelMM'),
                        avgRsiRisk: avg(wordAnalyses, 'rsiRisk'),
                        avgForce: avg(wordAnalyses, 'avgForce'),
                        avgFingerBalance: avg(wordAnalyses, 'fingerBalance'),
                        avgHandBalance: avg(wordAnalyses, 'handBalance'),
                        avgLength: avg(wordAnalyses, 'length'),
                        avgRhythmMs: avg(wordAnalyses, 'totalRhythmMs'),
                        totalSameFingerRepeats: sum(wordAnalyses, 'sameFingerRepeat'),
                        totalRowChanges: sum(wordAnalyses, 'rowChanges'),
                        topBigrams: topBigrams,
                        fingerDistribution: allFingers,
                        rhythmBuckets: Object.keys(rhythmBuckets).length,
                        quantumGates: gateDist,
                    },
                };
            }

            // ── Run full library analysis ──
            function analyzeAll(capsules) {
                return capsules.map(analyzeCapsule);
            }

            // ── Build + cache ──
            var _library = null;
            function getLibrary() {
                if (_library) return _library;
                if (cached && cached.version === VERSION && cached.capsuleCount === CAPSULES.length) {
                    _library = cached;
                    return _library;
                }
                // Run full analysis
                var results = analyzeAll(CAPSULES);

                // Global aggregates
                var totalWords = 0;
                var globalFingers = {};
                var globalBigrams = {};
                var globalGates = {};
                var globalEfficiency = 0, globalComplexity = 0, globalHomeRow = 0;
                var globalTravelMM = 0, globalRsi = 0;
                results.forEach(function(r) {
                    totalWords += r.wordCount;
                    if (r.aggregate) {
                        globalEfficiency += r.aggregate.avgEfficiency * r.wordCount;
                        globalComplexity += r.aggregate.avgComplexity * r.wordCount;
                        globalHomeRow += r.aggregate.avgHomeRowPct * r.wordCount;
                        globalTravelMM += r.aggregate.avgTravelMM * r.wordCount;
                        globalRsi += r.aggregate.avgRsiRisk * r.wordCount;
                        Object.entries(r.aggregate.fingerDistribution).forEach(function(e) {
                            globalFingers[e[0]] = (globalFingers[e[0]] || 0) + e[1];
                        });
                        r.aggregate.topBigrams.forEach(function(b) {
                            globalBigrams[b[0]] = (globalBigrams[b[0]] || 0) + b[1];
                        });
                        Object.entries(r.aggregate.quantumGates).forEach(function(e) {
                            globalGates[e[0]] = (globalGates[e[0]] || 0) + e[1];
                        });
                    }
                });

                _library = {
                    version: VERSION,
                    analyzedAt: Date.now(),
                    capsuleCount: CAPSULES.length,
                    totalWords: totalWords,
                    capsules: results,
                    global: {
                        avgEfficiency: Math.round(globalEfficiency / Math.max(totalWords, 1) * 10) / 10,
                        avgComplexity: Math.round(globalComplexity / Math.max(totalWords, 1) * 10) / 10,
                        avgHomeRowPct: Math.round(globalHomeRow / Math.max(totalWords, 1) * 10) / 10,
                        avgTravelMM: Math.round(globalTravelMM / Math.max(totalWords, 1) * 10) / 10,
                        avgRsiRisk: Math.round(globalRsi / Math.max(totalWords, 1) * 10) / 10,
                        fingerDistribution: globalFingers,
                        topBigrams: Object.entries(globalBigrams).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 30),
                        quantumGates: globalGates,
                    },
                };
                // Cache to localStorage (store only aggregates + per-word compact vectors)
                try {
                    var compact = {
                        version: VERSION,
                        analyzedAt: _library.analyzedAt,
                        capsuleCount: _library.capsuleCount,
                        totalWords: _library.totalWords,
                        global: _library.global,
                        capsuleSummaries: results.map(function(r) {
                            return {
                                id: r.capsule,
                                name: r.name,
                                cat: r.cat,
                                wordCount: r.wordCount,
                                aggregate: r.aggregate,
                            };
                        }),
                    };
                    localStorage.setItem(STORE_KEY, JSON.stringify(compact));
                } catch(e) {}
                return _library;
            }

            // ── ML training vectors: flat array of per-word features ──
            function exportTrainingVectors() {
                var lib = getLibrary();
                var vectors = [];
                lib.capsules.forEach(function(cap) {
                    var meta = cap.meta || {};
                    cap.words.forEach(function(w) {
                        vectors.push({
                            word: w.word,
                            capsule: cap.capsule,
                            category: cap.cat,
                            entityType: meta.entity_type || '',
                            entityId: meta.entity_id || '',
                            country: meta.country || '',
                            parentRegion: meta.parent_region || '',
                            domain: meta.domain || '',
                            canonicalUrl: meta.canonical_url || '',
                            canonicalUrlConfidence: meta.canonical_url_confidence != null ? meta.canonical_url_confidence : '',
                            length: w.length,
                            efficiency: w.efficiency,
                            complexity: w.complexity,
                            homeRowPct: w.homeRowPct,
                            travelMM: w.travelMM,
                            rsiRisk: w.rsiRisk,
                            avgForce: w.avgForce,
                            fingerBalance: w.fingerBalance,
                            handBalance: w.handBalance,
                            sameFingerRepeat: w.sameFingerRepeat,
                            rowChanges: w.rowChanges,
                            handAlternations: w.handAlternations,
                            contrailPath: w.contrailPath,
                            rhythmMs: w.rhythmMs,
                            rhythmSignature: w.rhythmSignature,
                            musicalPattern: w.musicalPattern,
                            totalRhythmMs: w.totalRhythmMs,
                            quantumSym: w.quantumSym,
                            quantumGate: w.quantumGate,
                            quantumCoord: w.quantumCoord,
                            topBigram: Object.entries(w.bigrams).sort(function(a,b) { return b[1]-a[1]; })[0] ? Object.entries(w.bigrams).sort(function(a,b) { return b[1]-a[1]; })[0][0] : '',
                            // Flow / music / rhythm / concept
                            flowArrows: w.flowArrows || '',
                            flowPattern: w.flowPattern || '',
                            danceNotation: w.danceNotation || '',
                            musicalNotes: w.musicalNotes || '',
                            beatPattern: w.beatPattern || '',
                            timeSig: w.timeSig || '',
                            bpm: w.bpm || 0,
                            intonationCadence: w.intonationCadence || '',
                            conceptSymbols: w.conceptSymbols || '',
                            conceptCharge: w.conceptCharge || 0,
                            // Multi-alphabet representations
                            braille: w.braille || '',
                            morse: w.morse || '',
                            asl: w.asl || '',
                            bsl: w.bsl || '',
                        });
                    });
                });
                return vectors;
            }

            // ── CSV export: flat feature table ──
            function exportCSV() {
                var vectors = exportTrainingVectors();
                var headers = ['word','capsule','category','entityType','entityId','country','parentRegion','domain','canonicalUrl','canonicalUrlConfidence','length','efficiency','complexity','homeRowPct','travelMM','rsiRisk','avgForce','fingerBalance','handBalance','sameFingerRepeat','rowChanges','handAlternations','contrailPath','totalRhythmMs','quantumSym','quantumGate','topBigram'];
                var rows = [headers.join(',')];
                vectors.forEach(function(v) {
                    rows.push(headers.map(function(h) {
                        var val = v[h];
                        if (typeof val === 'string') return '"' + val.replace(/"/g,'""') + '"';
                        return val;
                    }).join(','));
                });
                return rows.join('\n');
            }

            // ── Lookup: get analysis for a specific word ──
            function lookupWord(word) {
                var lib = getLibrary();
                var lw = word.toLowerCase();
                for (var i = 0; i < lib.capsules.length; i++) {
                    for (var j = 0; j < lib.capsules[i].words.length; j++) {
                        if (lib.capsules[i].words[j].word.toLowerCase() === lw) {
                            return { capsule: lib.capsules[i].capsule, analysis: lib.capsules[i].words[j] };
                        }
                    }
                }
                // Not in capsule — analyze on the fly
                return { capsule: null, analysis: analyzeWord(word) };
            }

            // ── Compare two capsules ──
            function compareCapsules(id1, id2) {
                var lib = getLibrary();
                var c1 = lib.capsules.find(function(c) { return c.capsule === id1; });
                var c2 = lib.capsules.find(function(c) { return c.capsule === id2; });
                if (!c1 || !c2) return null;
                var keys = ['avgEfficiency','avgComplexity','avgHomeRowPct','avgTravelMM','avgRsiRisk','avgFingerBalance','avgHandBalance','avgLength','avgRhythmMs'];
                var diff = {};
                keys.forEach(function(k) {
                    diff[k] = { a: c1.aggregate[k], b: c2.aggregate[k], delta: Math.round((c1.aggregate[k] - c2.aggregate[k]) * 10) / 10 };
                });
                return { capsuleA: id1, capsuleB: id2, comparison: diff };
            }

            return {
                analyzeWord: analyzeWord,
                analyzeCapsule: analyzeCapsule,
                getLibrary: getLibrary,
                exportTrainingVectors: exportTrainingVectors,
                exportCSV: exportCSV,
                lookupWord: lookupWord,
                compareCapsules: compareCapsules,
            };
        })();

        const grid = document.getElementById('capsule-grid');
        const detail = document.getElementById('capsule-detail');
        if (!grid) return;

        let activeFilter = 'all';
        const totalWords = CAPSULES.reduce((s,c) => s + c.words.length, 0);
        const totalEl = document.getElementById('capsule-total-count');
        // Build CapsuleAnalyzer library on first load (lazy, cached in localStorage)
        var _capsuleLib = null;
        setTimeout(function() {
            if (window.CapsuleAnalyzer) {
                _capsuleLib = window.CapsuleAnalyzer.getLibrary();
                if (totalEl) {
                    totalEl.textContent = CAPSULES.length + ' capsules | ' + totalWords + ' words | 30+ languages | ML seed: ' + (_capsuleLib ? _capsuleLib.global.avgEfficiency + '% eff' : '...');
                }
            }
        }, 100);
        if (totalEl) totalEl.textContent = CAPSULES.length + ' capsules | ' + totalWords + ' words | 30+ languages';

        // ─── Cross-Linguistic Analysis Engine ───
        function detectScript(text) {
            const scripts = new Set();
            for (const ch of text) {
                const cp = ch.codePointAt(0);
                if (cp >= 0x4E00 && cp <= 0x9FFF) scripts.add('CJK');
                else if (cp >= 0x3040 && cp <= 0x30FF) scripts.add('Kana');
                else if (cp >= 0xAC00 && cp <= 0xD7AF) scripts.add('Hangul');
                else if (cp >= 0x0900 && cp <= 0x097F) scripts.add('Devanagari');
                else if (cp >= 0x0980 && cp <= 0x09FF) scripts.add('Bengali');
                else if (cp >= 0x0600 && cp <= 0x06FF) scripts.add('Arabic');
                else if (cp >= 0x0590 && cp <= 0x05FF) scripts.add('Hebrew');
                else if (cp >= 0x0400 && cp <= 0x04FF) scripts.add('Cyrillic');
                else if (cp >= 0x0370 && cp <= 0x03FF) scripts.add('Greek');
                else if (cp >= 0x0E00 && cp <= 0x0E7F) scripts.add('Thai');
                else if (cp >= 0x1200 && cp <= 0x137F) scripts.add('Ethiopic');
                else if (cp >= 0x16A0 && cp <= 0x16FF) scripts.add('Runic');
                else if (cp >= 0x12000 && cp <= 0x1237F) scripts.add('Cuneiform');
                else if (cp >= 0x13000 && cp <= 0x1342F) scripts.add('Hieroglyphs');
                else if (cp >= 0x2800 && cp <= 0x28FF) scripts.add('Braille');
                else if (cp >= 0x10300 && cp <= 0x1032F) scripts.add('Old Italic');
                else if (cp >= 0x10330 && cp <= 0x1034F) scripts.add('Gothic');
                else if (cp >= 0x10000 && cp <= 0x1007F) scripts.add('Linear B');
                else if (cp >= 0x10800 && cp <= 0x1083F) scripts.add('Cypriot');
                else if (cp >= 0x0041 && cp <= 0x024F) scripts.add('Latin');
            }
            return [...scripts];
        }

        function analyzeLanguageStructure(words) {
            const avgLen = words.reduce((s,w) => s + w.length, 0) / Math.max(words.length, 1);
            const hasSpaces = words.some(w => w.includes(' '));
            const scripts = detectScript(words.join(''));
            const uniqueChars = new Set(words.join('').split('')).size;
            const totalChars = words.join('').length;
            const charDiversity = uniqueChars / Math.max(totalChars, 1);
            const hasRTL = scripts.some(s => s === 'Arabic' || s === 'Hebrew');
            const vowels = (words.join('').toLowerCase().match(/[aeiouáéíóúàèìòùâêîôûäëïöüãõ]/g) || []).length;
            const vowelRatio = vowels / Math.max(totalChars, 1);
            const hasQuestions = words.some(w => w.includes('?'));
            const hasNumbers = words.some(w => /\d/.test(w));
            // Detect special system types
            const hasBraille = scripts.includes('Braille');
            const hasAncient = scripts.some(s => ['Runic','Cuneiform','Hieroglyphs','Gothic','Linear B','Cypriot','Old Italic'].includes(s));
            const hasEncoding = words.some(w => /^0x[0-9A-Fa-f]+$/.test(w) || /^U\+[0-9A-F]+$/.test(w) || /^0b[01]+$/.test(w) || /^0o[0-7]+$/.test(w));
            const systemType = hasBraille ? 'tactile' : hasAncient ? 'ancient' : hasEncoding ? 'encoding' : 'natural';
            return { avgLen, hasSpaces, scripts, uniqueChars, charDiversity, hasRTL, vowelRatio, hasQuestions, hasNumbers, totalWords: words.length, hasBraille, hasAncient, hasEncoding, systemType };
        }

        function crossLinguisticCompare(cap) {
            const analysis = analyzeLanguageStructure(cap.words);
            // Find similar capsules for cross-reference
            const similar = [];
            const sameCat = CAPSULES.filter(c => c.cat === cap.cat && c.id !== cap.id);
            sameCat.forEach(other => {
                const otherA = analyzeLanguageStructure(other.words);
                // Similarity score based on structure
                let sim = 0;
                sim += Math.max(0, 1 - Math.abs(analysis.avgLen - otherA.avgLen) / 10) * 25;
                sim += Math.max(0, 1 - Math.abs(analysis.charDiversity - otherA.charDiversity)) * 25;
                sim += Math.max(0, 1 - Math.abs(analysis.vowelRatio - otherA.vowelRatio)) * 25;
                sim += (analysis.scripts.some(s => otherA.scripts.includes(s)) ? 25 : 0);
                similar.push({ cap: other, score: sim });
            });
            similar.sort((a,b) => b.score - a.score);
            return { analysis, similar: similar.slice(0, 5) };
        }

        // AI helper — instant recommendations
        function getAIRecommendation(cap) {
            const recs = [];
            if (cap.cat === 'medical') recs.push('Start with anatomy basics, then build to symptoms and treatment terms');
            if (cap.cat === 'survival') recs.push('Practice emergency terms first — they could save a life');
            if (cap.cat === 'career') recs.push('Focus on industry-specific vocabulary for interviews and certifications');
            if (cap.cat === 'trends') recs.push('Cross-reference with news sources to understand current context');
            if (cap.cat === 'lang') {
                recs.push('Start with greetings and numbers, then build to academic terms');
                if (cap.age === '13-18') recs.push('This teen-level vocabulary covers school, daily life, and basic academics');
                const analysis = analyzeLanguageStructure(cap.words);
                if (analysis.hasRTL) recs.push('RTL script \u2014 practice right-to-left typing patterns');
                if (analysis.scripts.includes('CJK')) recs.push('Logographic script \u2014 each character carries meaning independently');
                if (analysis.charDiversity > 0.3) recs.push('High character diversity \u2014 strong for pattern recognition training');
            }
            if (cap.cat === 'education') recs.push('These are foundation concepts \u2014 prerequisite for advanced study');
            if (cap.cat === 'culture') recs.push('Cultural literacy builds cross-domain understanding');
            if (cap.cat === 'ancient') {
                recs.push('Dead/ancient language \u2014 root vocabulary that shaped modern languages');
                recs.push('Click any word to see it in Braille, Morse, Hex, and other encodings');
                if (cap.id === 'latin') recs.push('Latin roots appear in 60%+ of English scientific, legal, and medical terms');
                if (cap.id === 'ancient-greek') recs.push('Greek roots dominate philosophy, mathematics, and science terminology');
                if (cap.id === 'sanskrit') recs.push('Sanskrit roots connect to Hindi, Bengali, and most Indo-European languages');
                if (cap.id === 'proto-indo') recs.push('Reconstructed roots \u2014 the shared ancestor of 3 billion speakers today');
                if (cap.id === 'egyptian') recs.push('Hieroglyphs are logographic+phonetic \u2014 each glyph can be word, sound, or determinative');
                if (cap.id === 'cuneiform') recs.push('Oldest writing (3400 BCE) \u2014 wedge-shaped marks on clay, used for 3000 years');
                if (cap.id === 'runic') recs.push('Runes were both alphabet and divination system \u2014 each has a name and meaning');
            }
            if (cap.cat === 'access') {
                recs.push('Accessibility systems bridge communication across sensory differences');
                if (cap.id.startsWith('asl')) recs.push('ASL has its own grammar \u2014 not just signed English. Topic-comment structure, facial grammar.');
                if (cap.id === 'bsl') recs.push('BSL uses two-handed fingerspelling, completely different from ASL');
                if (cap.id.startsWith('braille')) recs.push('Braille is rendered in Unicode \u2014 copy/paste these patterns into any text field');
                if (cap.id === 'morse') recs.push('Morse maps to typing rhythm \u2014 the Contrails engine can visualize dit/dah patterns');
                if (cap.id === 'semaphore') recs.push('Flag semaphore is visual-only \u2014 each letter uses two arm positions at 45\u00B0 intervals');
            }
            if (cap.cat === 'encoding') {
                recs.push('Encoding systems are the bridge between human language and machine representation');
                if (cap.id === 'ascii') recs.push('ASCII is the foundation \u2014 128 characters that built the digital world');
                if (cap.id === 'hex-patterns') recs.push('Magic numbers identify file formats \u2014 every file starts with a hex signature');
                if (cap.id === 'unicode-blocks') recs.push('Unicode encodes every writing system in human history \u2014 150,000+ characters');
                if (cap.id === 'binary-base') recs.push('Understanding base conversion is fundamental to all computing');
            }
            if (cap.cat === 'code') {
                recs.push('Code keywords get quantum prefix classification \u2014 each maps to a structural role');
                recs.push('Try typing these keywords to see how they map to quantum gates via the prefix engine');
            }
            return recs;
        }

        function renderGrid(filter) {
            if (filter !== undefined) activeFilter = filter;
            grid.style.display = 'grid'; detail.style.display = 'none';
            grid.innerHTML = '';
            const filtered = CAPSULES.filter(c => capsuleMatchesFilter(c, activeFilter));
            filtered.forEach(cap => {
                const card = document.createElement('div');
                card.style.cssText = 'padding:12px;background:#161b22;border:1px solid #21262d;border-radius:8px;cursor:pointer;transition:all .15s;';
                card.onmouseenter = () => { card.style.borderColor = cap.color; card.style.transform = 'translateY(-2px)'; };
                card.onmouseleave = () => { card.style.borderColor = '#21262d'; card.style.transform = ''; };
                const meta = cap.meta || {};
                const entityBadge = meta.entity_type ? '<span style="font-size:.5rem;padding:1px 5px;background:#7c3aed22;color:#c4b5fd;border-radius:8px;border:1px solid #7c3aed55;">' + meta.entity_type + '</span>' : '';
                const catBadge = cap.cat === 'lang' ? '' : '<span style="font-size:.5rem;padding:1px 5px;background:' + cap.color + '22;color:' + cap.color + ';border-radius:8px;border:1px solid ' + cap.color + '44;">' + cap.cat + '</span>';
                card.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="font-size:1.2rem;">' + cap.flag + '</span>' + catBadge + entityBadge + '</div>' +
                    '<div style="font-weight:700;font-size:.75rem;color:#e6edf3;">' + cap.name + '</div>' +
                    (cap.age ? '<div style="font-size:.5rem;color:#58a6ff;">Age: ' + cap.age + '</div>' : '') +
                    (meta.country ? '<div style="font-size:.5rem;color:#8b949e;">' + meta.country + (meta.parent_region ? ' · ' + meta.parent_region : '') + '</div>' : '') +
                    '<div style="font-size:.5625rem;color:#484f58;margin:4px 0;">' + cap.desc + '</div>' +
                    '<div style="font-family:\'SF Mono\',monospace;font-size:.5625rem;color:' + cap.color + ';">' + cap.words.length + ' words</div>';
                card.onclick = () => showCapsule(cap);
                grid.appendChild(card);
            });
        }

        function showCapsule(cap) {
            var tp = document.getElementById('transcript-panel');
            if (cap.id === 'video-transcription') {
                grid.style.display = 'none'; detail.style.display = 'none';
                if (tp) tp.style.display = 'flex';
                return;
            }
            if (tp) tp.style.display = 'none';
            grid.style.display = 'none'; detail.style.display = 'flex';
            document.getElementById('capsule-name').textContent = cap.flag + ' ' + cap.name;
            document.getElementById('capsule-count').textContent = cap.words.length + ' words | ' + (cap.cat || 'lang') + ' | ' + (cap.age || 'all ages');
            const wordsEl = document.getElementById('capsule-words');
            const meta = cap.meta || {};
            wordsEl.innerHTML = '';
            const encEl = document.getElementById('capsule-encoder');
            if (encEl) {
                var packet = buildCapsuleStackPacket(cap);
                var aliases = Array.isArray(meta.aliases) ? meta.aliases.join(', ') : '';
                var venues = Array.isArray(meta.top_venues) ? meta.top_venues.slice(0, 6).join(' · ') : '';
                var spoken = Array.isArray(meta.spoken_languages) ? meta.spoken_languages.slice(0, 10).join(' · ') : '';
                var clans = Array.isArray(meta.clan_subgroups) ? meta.clan_subgroups.slice(0, 8).join(' · ') : '';
                var qCoverage = packet.prefix && packet.prefix.coverage != null ? Number(packet.prefix.coverage).toFixed(1) + '%' : '—';
                var stenoCapacity = packet.steno && packet.steno.capacityBits != null ? packet.steno.capacityBits : '—';
                var codecBytes = packet.codec && packet.codec.encodedBytes != null ? packet.codec.encodedBytes : 0;
                encEl.innerHTML =
                    '<div data-stack-panel="1" style="padding:8px;background:#161b22;border:1px solid #30363d;border-radius:6px;font-size:.625rem;">'
                    + '<div style="font-weight:700;color:#58a6ff;margin-bottom:4px;">Stack Leverage</div>'
                    + '<div style="color:#8b949e;">entity_id: <span style="color:#e6edf3;">' + (meta.entity_id || 'n/a') + '</span></div>'
                    + '<div style="color:#8b949e;">domain: <span style="color:#e6edf3;">' + (meta.domain || cap.cat || 'n/a') + '</span> | region: <span style="color:#e6edf3;">' + (meta.parent_region || 'n/a') + '</span></div>'
                    + '<div style="color:#8b949e;">quantum gutter coverage: <span style="color:#a78bfa;">' + qCoverage + '</span> | steno capacity(bits): <span style="color:#22d3ee;">' + stenoCapacity + '</span></div>'
                    + '<div style="color:#8b949e;">codec bytes: <span style="color:#fbbf24;">' + codecBytes + '</span> | t5 lane: <span style="color:#58a6ff;">' + ((packet.codec && packet.codec.t5) || 'browser') + '</span></div>'
                    + (aliases ? '<div style="margin-top:4px;color:#8b949e;">aliases: <span style="color:#e6edf3;">' + aliases + '</span></div>' : '')
                    + (venues ? '<div style="margin-top:4px;color:#8b949e;">top venues: <span style="color:#e6edf3;">' + venues + '</span></div>' : '')
                    + (spoken ? '<div style="margin-top:4px;color:#8b949e;">spoken languages: <span style="color:#e6edf3;">' + spoken + '</span></div>' : '')
                    + (clans ? '<div style="margin-top:4px;color:#8b949e;">clan subgroups: <span style="color:#e6edf3;">' + clans + '</span></div>' : '')
                    + (meta.canonical_url ? '<div style="margin-top:4px;color:#8b949e;">canonical: <a href="' + meta.canonical_url + '" target="_blank" rel="noopener" style="color:#58a6ff;">' + meta.canonical_url + '</a> (' + (meta.canonical_url_confidence != null ? meta.canonical_url_confidence : 'n/a') + ')</div>' : '')
                    + '<div style="display:flex;gap:6px;margin-top:8px;">'
                    + '<button id="capsule-emit-btn" style="padding:4px 8px;background:#1f2937;border:1px solid #30363d;color:#e6edf3;border-radius:4px;cursor:pointer;font-size:.5625rem;">Emit to Iron Line</button>'
                    + '<button id="capsule-export-btn" style="padding:4px 8px;background:#0f172a;border:1px solid #30363d;color:#e6edf3;border-radius:4px;cursor:pointer;font-size:.5625rem;">Export .qbit Packet</button>'
                    + '<button id="capsule-search-btn" style="padding:4px 8px;background:#312e81;border:1px solid #30363d;color:#e6edf3;border-radius:4px;cursor:pointer;font-size:.5625rem;">Open Search</button>'
                    + ((meta.pack_type === 'indigenous-language' || (cap.id || '').indexOf('caps.lang.indigenous.') === 0)
                        ? '<button id="capsule-preserve-btn" style="padding:4px 8px;background:#0b5; border:1px solid #30363d;color:#e6edf3;border-radius:4px;cursor:pointer;font-size:.5625rem;">Preservation Sync</button>'
                        : '')
                    + '</div>'
                    + '</div>';
                var emitBtn = document.getElementById('capsule-emit-btn');
                if (emitBtn) emitBtn.onclick = function() { emitCapsulePacket(cap); };
                var exportBtn = document.getElementById('capsule-export-btn');
                if (exportBtn) exportBtn.onclick = function() { exportCapsulePacket(cap); };
                var searchBtn = document.getElementById('capsule-search-btn');
                if (searchBtn) {
                    searchBtn.onclick = function() {
                        var statusEl = document.getElementById('capsule-livedict');
                        if (statusEl) statusEl.innerHTML = '<div style="color:#8b949e;">Running open search...</div>';
                        runCapsuleOpenSearch(cap, { maxTerms: 14 }).then(function(out) {
                            if (!statusEl) return;
                            if (out.error) {
                                statusEl.innerHTML = '<div style="color:#f87171;">Open search error: ' + out.error + '</div>';
                                return;
                            }
                            var lines = (out.topResults || []).slice(0, 8).map(function(r) {
                                return '<div style="margin:2px 0;"><span style="color:#a78bfa;">[' + (r.source || 'src') + ']</span> '
                                    + '<a href="' + (r.url || '#') + '" target="_blank" rel="noopener" style="color:#58a6ff;">'
                                    + (r.title || r.url || 'result') + '</a></div>';
                            });
                            statusEl.innerHTML = '<div style="font-size:.625rem;">'
                                + '<div style="color:#8b949e;">Open search query:</div><div style="color:#e6edf3;">' + out.query + '</div>'
                                + '<div style="margin-top:4px;color:#8b949e;">Results: ' + out.totalResults + ' | connectors: ' + out.connectorsUsed + ' | latency: ' + out.latencyMs + 'ms</div>'
                                + '<div style="margin-top:6px;">' + lines.join('') + '</div>'
                                + '</div>';
                        });
                    };
                }
                var preserveBtn = document.getElementById('capsule-preserve-btn');
                if (preserveBtn) {
                    preserveBtn.onclick = function() {
                        var statusEl = document.getElementById('capsule-livedict');
                        var profile = emitLanguagePreservationSync(cap);
                        if (statusEl) {
                            if (!profile) {
                                statusEl.innerHTML = '<div style="color:#f87171;">Preservation sync unavailable.</div>';
                            } else {
                                statusEl.innerHTML = '<div style="font-size:.625rem;">'
                                    + '<div style="color:#e6edf3;font-weight:700;">Preservation Sync Emitted</div>'
                                    + '<div style="color:#8b949e;">nation: ' + (profile.nationGroup || 'n/a') + ' | region: ' + (profile.originRegion || 'n/a') + '</div>'
                                    + '<div style="color:#8b949e;">elders subset: ' + (profile.eldersSubset || 'n/a') + '</div>'
                                    + '<div style="color:#8b949e;">time period: ' + (profile.timePeriod || 'n/a') + '</div>'
                                    + '<div style="color:#8b949e;">diaspora: ' + (profile.diaspora || 'n/a') + '</div>'
                                    + '<div style="color:#8b949e;">keyboard: ' + profile.keyboardProfile + (profile.keyboardExtensionNeeded ? ' (extension needed)' : ' (supported)') + '</div>'
                                    + '<div style="color:#8b949e;">auditory: ' + profile.auditoryProfile + '</div>'
                                    + '<div style="color:#8b949e;">channels: ' + (profile.crossSyncChannels || []).join(', ') + '</div>'
                                    + '</div>';
                            }
                        }
                    };
                }
            }
            // ─── Cisponju VocabularyComparator: analyze each word ───
            const HOME_ROW = new Set('asdfghjkl;'.split(''));
            const analyses = [];
            cap.words.forEach(w => {
                const lw = w.toLowerCase();
                const homeRowPct = lw.split('').filter(c => HOME_ROW.has(c)).length / Math.max(lw.length, 1);
                const uniqueKeys = new Set(lw.split('')).size;
                const diversity = uniqueKeys / Math.max(lw.length, 1);
                const eff = Math.min(100, 50 + homeRowPct * 25 + diversity * 20 + (lw.length <= 6 ? 10 : 0));
                const aiScore = Math.min(100, eff * 0.6 + diversity * 40);
                const aiSuit = aiScore > 75 ? 'excellent' : aiScore > 50 ? 'good' : 'poor';
                analyses.push({ word: w, eff: eff, homeRowPct: homeRowPct * 100, aiSuit: aiSuit, aiScore: aiScore, length: lw.length });

                const span = document.createElement('span');
                const effColor = eff > 70 ? '#3fb950' : eff > 50 ? '#d4a017' : '#f85149';
                const aiDot = aiSuit === 'excellent' ? '\u2605' : aiSuit === 'good' ? '\u25CB' : '\u25AA';
                span.style.cssText = 'padding:3px 8px;background:#161b22;border:1px solid #21262d;border-radius:4px;font-family:\'SF Mono\',monospace;font-size:.6875rem;color:#e6edf3;cursor:pointer;transition:all .15s;';
                span.innerHTML = w + '<span style="font-size:.5rem;color:' + effColor + ';margin-left:3px;" title="Eff:' + eff.toFixed(0) + '% AI:' + aiSuit + '">' + aiDot + '</span>';
                span.onclick = () => {
                    if (window.kbatch) window.kbatch.processText(w + ' ');
                    if (window.Contrails && window.Contrails.feedText) window.Contrails.feedText(w + ' ');
                    span.style.borderColor = cap.color; span.style.color = cap.color;
                    setTimeout(() => { span.style.borderColor = '#21262d'; span.style.color = '#e6edf3'; }, 300);
                    // Show encoder card for clicked word
                    if (encEl && window.Encoder) {
                        var stackPanel = encEl.querySelector('[data-stack-panel="1"]');
                        var preserved = stackPanel ? stackPanel.outerHTML : '';
                        encEl.innerHTML = preserved + window.Encoder.renderCard(w);
                    }
                    // Show CapsuleAnalyzer benchmark data for clicked word
                    if (window.CapsuleAnalyzer && encEl) {
                        var wa = window.CapsuleAnalyzer.lookupWord(w);
                        if (wa && wa.analysis) {
                            var a = wa.analysis;
                            encEl.innerHTML += '<div style="margin-top:8px;padding:8px;background:#161b22;border:1px solid #30363d;border-radius:6px;font-size:.625rem;">'
                                + '<div style="font-weight:700;color:#a78bfa;margin-bottom:4px;">\u26A1 ML Benchmark</div>'
                                + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">'
                                + '<div style="padding:3px;background:#0d1117;border-radius:3px;"><span style="color:#484f58;">Eff</span><br><b style="color:#3fb950;">' + a.efficiency + '%</b></div>'
                                + '<div style="padding:3px;background:#0d1117;border-radius:3px;"><span style="color:#484f58;">RSI</span><br><b style="color:' + (a.rsiRisk > 60 ? '#f85149' : a.rsiRisk > 30 ? '#d4a017' : '#3fb950') + ';">' + a.rsiRisk + '</b></div>'
                                + '<div style="padding:3px;background:#0d1117;border-radius:3px;"><span style="color:#484f58;">Travel</span><br><b style="color:#58a6ff;">' + a.travelMM + 'mm</b></div>'
                                + '<div style="padding:3px;background:#0d1117;border-radius:3px;"><span style="color:#484f58;">Home</span><br><b style="color:#fbbf24;">' + a.homeRowPct + '%</b></div>'
                                + '</div>'
                                + '<div style="margin-top:4px;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">'
                                + '<div style="padding:3px;background:#0d1117;border-radius:3px;"><span style="color:#484f58;">Fingers</span><br><b style="color:#c084fc;">' + a.fingerBalance + '</b></div>'
                                + '<div style="padding:3px;background:#0d1117;border-radius:3px;"><span style="color:#484f58;">Hands</span><br><b style="color:#fb923c;">' + a.handBalance + '%</b></div>'
                                + '<div style="padding:3px;background:#0d1117;border-radius:3px;"><span style="color:#484f58;">Force</span><br><b style="color:#e6edf3;">' + a.avgForce + '</b></div>'
                                + '</div>'
                                + '<div style="margin-top:4px;color:#8b949e;">Contrail: <span style="color:#58a6ff;font-family:monospace;">' + (a.contrailPath || '—') + '</span></div>'
                                + '<div style="color:#8b949e;">Rhythm (ms): <span style="color:#a78bfa;">' + (a.rhythmMs.join(' ') || '—') + '</span></div>'
                                + '<div style="color:#8b949e;">Musical: <span style="color:#fbbf24;">' + (a.musicalPattern.join(' ') || '—') + '</span></div>'
                                + (a.quantumGate ? '<div style="color:#8b949e;">Quantum: <span style="color:#c084fc;">' + a.quantumSym + '</span> \u2192 <span style="color:#a78bfa;">' + a.quantumGate + '</span> [' + a.quantumCoord.join(',') + ']</div>' : '')
                                + (a.braille ? '<div style="color:#8b949e;">Braille: <span style="color:#e5e7eb;">' + a.braille + '</span></div>' : '')
                                + (a.morse ? '<div style="color:#8b949e;">Morse: <span style="color:#22d3ee;">' + a.morse + '</span></div>' : '')
                                + '</div>';
                        }
                        // Contrail Language word
                        if (window.StenoEngine && window.StenoEngine.ContrailLang) {
                            var cl = window.StenoEngine.ContrailLang.wordToContrail(w);
                            if (cl) {
                                encEl.innerHTML += '<div style="margin-top:6px;padding:6px;background:#0d1117;border:1px solid #30363d;border-radius:6px;font-size:.625rem;">'
                                    + '<div style="font-weight:700;color:#a78bfa;margin-bottom:3px;">\uD83C\uDF0A Contrail Language</div>'
                                    + '<div style="font-size:1rem;letter-spacing:1px;color:#a78bfa;">' + cl.arrows + '</div>'
                                    + '<div style="color:#fbbf24;">\uD83D\uDD0A ' + cl.spoken + '</div>'
                                    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:3px;">'
                                    + '<span style="color:#3fb950;">dialect: ' + (typeof LAYOUTS !== 'undefined' && LAYOUTS[cl.layout] ? LAYOUTS[cl.layout].name : cl.layout) + '</span>'
                                    + '<span style="color:#58a6ff;">syllables: ' + cl.complexity + '</span>'
                                    + '<span style="color:#fb923c;">turns: ' + cl.turns + '</span>'
                                    + '<span style="color:#8b949e;">dist: ' + cl.totalDist + '</span>'
                                    + '</div>'
                                    + '</div>';
                            }
                        }
                    }
                    // Live dictionary lookup (Wiktionary + Datamuse + Free Dict)
                    if (window.LiveDict) window.LiveDict.lookupAndRender(w, 'capsule-livedict');
                    // Train cache intelligence on this interaction
                    if (window.CacheIntel) {
                        var bio = window.Contrails && window.Contrails.getBiometrics ? window.Contrails.getBiometrics() : null;
                        var coWords = cap.words.filter(function(cw) { return cw !== w; }).slice(0, 10);
                        window.CacheIntel.recordInteraction(w, {
                            capsule: cap.cat || 'lang',
                            language: cap.id,
                            coWords: coWords,
                            biometrics: bio ? { homeRowPct: bio.homeRowPct, travelMM: bio.totalDistMM, avgTypingMs: bio.wpm > 0 ? 12000 / bio.wpm : 0, fingerBalance: bio.fingerData ? (bio.fingerData.filter(function(f){ return f.hand === 'L'; }).length > 0 ? 'balanced' : 'right-heavy') : null } : null
                        });
                    }
                };
                wordsEl.appendChild(span);
            });
            // Stats
            const avgLen = analyses.reduce((s, a) => s + a.length, 0) / analyses.length;
            const avgEff = analyses.reduce((s, a) => s + a.eff, 0) / analyses.length;
            const avgHome = analyses.reduce((s, a) => s + a.homeRowPct, 0) / analyses.length;
            const excellent = analyses.filter(a => a.aiSuit === 'excellent').length;
            const scripts = detectScript(cap.words.join(''));
            document.getElementById('capsule-stats').innerHTML =
                'Avg len: <b>' + avgLen.toFixed(1) + '</b> | ' +
                'Scripts: <b>' + scripts.join(', ') + '</b> | ' +
                'Typing Eff: <b style="color:' + (avgEff > 70 ? '#3fb950' : '#d4a017') + ';">' + avgEff.toFixed(0) + '%</b> | ' +
                'Home Row: <b>' + avgHome.toFixed(0) + '%</b> | ' +
                'AI \u2605: <b style="color:#a78bfa;">' + excellent + '/' + analyses.length + '</b>';

            // ─── Cross-Linguistic Analysis ───
            const crossEl = document.getElementById('capsule-cross');
            if (crossEl) {
                const cross = crossLinguisticCompare(cap);
                const recs = getAIRecommendation(cap);
                let html = '';
                // AI recommendations
                if (recs.length > 0) {
                    html += '<div style="margin-bottom:8px;padding:8px;background:#1c2129;border:1px solid #30363d;border-radius:6px;"><div style="font-weight:700;color:#58a6ff;margin-bottom:4px;">\uD83E\uDD16 AI Guide</div>';
                    recs.forEach(r => { html += '<div style="color:#8b949e;font-size:.5625rem;padding:2px 0;">\u2022 ' + r + '</div>'; });
                    html += '</div>';
                }
                // Structure analysis
                const a = cross.analysis;
                html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:4px;margin-bottom:8px;">';
                html += '<div style="padding:4px 6px;background:#161b22;border:1px solid #21262d;border-radius:4px;"><div style="font-size:.5rem;color:#484f58;">Dir</div><div style="font-weight:700;color:#e6edf3;">' + (a.hasRTL ? 'RTL' : 'LTR') + '</div></div>';
                html += '<div style="padding:4px 6px;background:#161b22;border:1px solid #21262d;border-radius:4px;"><div style="font-size:.5rem;color:#484f58;">Char Diversity</div><div style="font-weight:700;color:#a78bfa;">' + (a.charDiversity * 100).toFixed(0) + '%</div></div>';
                html += '<div style="padding:4px 6px;background:#161b22;border:1px solid #21262d;border-radius:4px;"><div style="font-size:.5rem;color:#484f58;">Vowel Ratio</div><div style="font-weight:700;color:#f472b6;">' + (a.vowelRatio * 100).toFixed(0) + '%</div></div>';
                html += '<div style="padding:4px 6px;background:#161b22;border:1px solid #21262d;border-radius:4px;"><div style="font-size:.5rem;color:#484f58;">Unique Chars</div><div style="font-weight:700;color:#fb923c;">' + a.uniqueChars + '</div></div>';
                html += '</div>';
                // Similar capsules
                if (cross.similar.length > 0) {
                    html += '<div style="font-weight:700;color:#e6edf3;margin-bottom:4px;">Cross-References</div>';
                    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
                    cross.similar.forEach(s => {
                        html += '<span style="padding:2px 8px;background:#161b22;border:1px solid ' + s.cap.color + '44;color:' + s.cap.color + ';border-radius:4px;cursor:pointer;font-size:.5625rem;" onclick="document.getElementById(\'capsule-back\').click()" title="' + s.score.toFixed(0) + '% similar">' + s.cap.flag + ' ' + s.cap.name + ' (' + s.score.toFixed(0) + '%)</span>';
                    });
                    html += '</div>';
                }
                crossEl.innerHTML = html;
            }
        }

        // Filter buttons
        document.querySelectorAll('.capsule-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.capsule-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderGrid(btn.dataset.cat);
            });
        });

        document.getElementById('capsule-back').onclick = () => renderGrid();
        document.getElementById('transcript-back').onclick = () => {
            document.getElementById('transcript-panel').style.display = 'none';
            renderGrid();
        };
        renderGrid();
        (function routeCapsuleFromQuery() {
            var query = new URLSearchParams(window.location.search || '');
            var requested = String(query.get('capsule') || '').trim().toLowerCase();
            if (!requested) return;
            var target = getCapsuleById(requested);
            if (target) showCapsule(target);
        })();

        // Broadcast capsule knowledge to search engine for cross-referencing
        publishToEcosystem(
            'capsule-knowledge',
            CAPSULES.map(function(c) {
                return {
                    id: c.id,
                    name: c.name,
                    cat: c.cat,
                    age: c.age,
                    words: c.words,
                    meta: c.meta || {}
                };
            }),
            ['kbatch-training', 'iron-line', 'uterm-notes']
        );
        // Expose for direct access
        window.kbatchCapsules = CAPSULES;

        // Plan corpus → capsule cross-reference (Iron Line wiring)
        if (typeof BroadcastChannel !== 'undefined') {
            var corpusBC = new BroadcastChannel('plan-corpus');
            corpusBC.onmessage = function(e) {
                if (!e.data || e.data.type !== 'corpus-indexed') return;
                var idx = e.data.index;
                if (!idx || !idx.categories) return;
                window._planCorpusIndex = idx;
                var catNames = Object.keys(idx.categories);
                var planCapsules = buildPlanCorpusCapsules(idx);
                var changed = upsertCapsules(planCapsules);
                if (changed > 0) {
                    rehydrateCapsuleSearchWorker();
                    renderGrid(activeFilter);
                    publishToEcosystem(
                        'capsule-knowledge',
                        CAPSULES.map(function(c) {
                            return { id: c.id, name: c.name, cat: c.cat, age: c.age, words: c.words, meta: c.meta || {} };
                        }),
                        ['kbatch-training', 'iron-line', 'uterm-notes']
                    );
                    console.log('[kbatch] plan-corpus capsule feed updated:', changed, 'capsules');
                }
                var corpusWords = [];
                catNames.forEach(function(cat) {
                    cat.replace(/_/g, ' ').split(' ').forEach(function(w) {
                        if (w.length > 2) corpusWords.push(w.toLowerCase());
                    });
                });
                var matches = 0;
                CAPSULES.forEach(function(cap) {
                    if (!cap.words) return;
                    cap.words.forEach(function(w) {
                        if (corpusWords.indexOf(w.toLowerCase()) !== -1) matches++;
                    });
                });
                if (matches > 0) console.log('[kbatch] corpus→capsule cross-ref:', matches, 'word overlaps across', catNames.length, 'plan categories');
            };

            var hextermBC = new BroadcastChannel('hexterm');
            hextermBC.onmessage = function(e) {
                var msg = e && e.data ? e.data : null;
                if (!msg || msg.type !== 'kbatch-open-capsule') return;
                var target = getCapsuleById(msg.capsuleId || '');
                if (!target) return;
                showCapsule(target);
                console.log('[kbatch] opened capsule from hexterm:', target.id);
            };

            var contrailBC = new BroadcastChannel('kbatch-training');
            contrailBC.addEventListener('message', function(e) {
                if (!e.data || e.data.type !== 'contrail-train') return;
                var seq = e.data.symbols || '';
                if (!seq) return;
                window._contrailFromUgrad = { seq: seq, gen: e.data.gen, ts: e.data.ts };
                console.log('[kbatch] contrail from μgrad G' + e.data.gen + ': ' + seq.substring(0, 30) + '...');
                if (typeof setActiveLayout === 'function' && LAYOUTS.contrail) {
                    setActiveLayout('contrail');
                    var listItems = document.querySelectorAll('#layout-list .layout-item');
                    listItems.forEach(function(el) {
                        el.classList.remove('active');
                        if (el.dataset.id === 'contrail') el.classList.add('active');
                    });
                }
            });
        }
    })();

    // ══════════════════ P0b: TRANSCRIPT → DCA PIPELINE ══════════════════
    (function(){
        'use strict';
        var QP = window.QuantumPrefixes;
        var _segments = [];
        var _videoId = '';
        var _meta = {};

        function extractVideoId(input) {
            input = (input || '').trim();
            var m = input.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
            if (m) return m[1];
            if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
            return null;
        }

        function parseTimestamp(ts) {
            var parts = ts.split(':').map(Number);
            if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
            if (parts.length === 2) return parts[0]*60 + parts[1];
            return parts[0] || 0;
        }

        function parseTranscriptText(text) {
            var lines = text.split('\n');
            var segs = [], current = null;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) continue;
                var tsMatch = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)$/);
                if (!tsMatch) tsMatch = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
                if (tsMatch) {
                    if (current) segs.push(current);
                    current = { t: parseTimestamp(tsMatch[1]), text: '' };
                } else if (current) {
                    current.text += (current.text ? ' ' : '') + line;
                } else {
                    segs.push({ t: segs.length * 5, text: line });
                }
            }
            if (current && current.text) segs.push(current);
            return segs;
        }

        function classifySegment(text) {
            if (!QP) return { sym: ' ', cls: 'qp-default', category: 'default' };
            return QP.classifyLine(text, 'transcript');
        }

        function buildDCABlock(seg, idx, videoId) {
            var c = classifySegment(seg.text);
            var gateMap = {'+1':'H','1':'CNOT','-1':'X','+0':'Rz','0':'I','-0':'S','+n':'T','n':'SWAP','-n':'M','+2':'CZ','+3':'Y',' ':'I'};
            return {
                id: 'dwave-' + videoId + '-' + String(idx).padStart(3,'0'),
                type: c.category === 'class' ? 'concept' : c.category === 'function' ? 'method' : c.category === 'error' ? 'caveat' : c.category === 'return' ? 'conclusion' : c.category === 'output' ? 'demo' : c.category === 'variable' ? 'data' : c.category === 'condition' ? 'comparison' : c.category === 'loop' ? 'iteration' : c.category === 'import' ? 'reference' : c.category === 'shebang' ? 'entry' : 'explanation',
                prefix: c.sym,
                gate: gateMap[c.sym] || 'I',
                category: c.category,
                text: seg.text,
                t: seg.t,
                videoId: videoId,
                qpos: [idx % 120, Math.floor(idx / 120), seg.text.split(' ').length]
            };
        }

        function renderResults(blocks) {
            var el = document.getElementById('yt-results');
            if (!el) return;
            el.innerHTML = '';
            var prefixColors = {'n:':'#a78bfa','+1:':'#3fb950','-n:':'#58a6ff','+0:':'#f0883e',
                '0:':'#8b949e','-1:':'#f85149','+n:':'#fbbf24','+2:':'#22d3ee',
                '-0:':'#c084fc','+3:':'#ec4899','1:':'#e6edf3',' ':'#484f58'};
            blocks.forEach(function(b) {
                var col = prefixColors[b.prefix] || '#484f58';
                var ts = Math.floor(b.t/60) + ':' + String(Math.floor(b.t%60)).padStart(2,'0');
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;gap:6px;padding:4px 6px;background:#0d1117;border:1px solid #21262d;border-radius:4px;font-size:.625rem;align-items:flex-start;cursor:pointer;transition:border-color .15s;';
                row.innerHTML = '<span style="color:' + col + ';font-weight:700;min-width:24px;font-family:\'SF Mono\',monospace;">' + b.prefix + '</span>'
                    + '<span style="color:#484f58;min-width:36px;font-family:\'SF Mono\',monospace;">' + ts + '</span>'
                    + '<span style="color:#e6edf3;flex:1;">' + b.text + '</span>'
                    + '<span style="color:#30363d;font-size:.5rem;" title="' + b.gate + ' gate | qpos[' + b.qpos.join(',') + ']">' + b.gate + '</span>';
                row.onmouseenter = function(){ row.style.borderColor = col; };
                row.onmouseleave = function(){ row.style.borderColor = '#21262d'; };
                row.onclick = function(){
                    window.open('https://youtube.com/watch?v=' + b.videoId + '&t=' + Math.floor(b.t), '_blank');
                };
                el.appendChild(row);
            });
        }

        function renderSummary(blocks) {
            var el = document.getElementById('yt-summary');
            if (!el) return;
            var counts = {};
            blocks.forEach(function(b){ counts[b.prefix] = (counts[b.prefix]||0) + 1; });
            var total = blocks.length;
            var parts = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; })
                .map(function(k){ return k + ' ' + counts[k] + ' (' + Math.round(counts[k]/total*100) + '%)'; });
            el.innerHTML = total + ' segments classified | ' + parts.join(' · ') +
                ' | <!-- BLOCK:batch=' + _videoId + '|total=' + total + '|source=youtube -->';
        }

        function runPipeline(text, videoId) {
            _videoId = videoId || 'manual';
            var segs = parseTranscriptText(text);
            _segments = segs.map(function(s, i){ return buildDCABlock(s, i, _videoId); });
            renderResults(_segments);
            renderSummary(_segments);
            document.getElementById('yt-push').disabled = _segments.length === 0;
            document.getElementById('yt-status').textContent = _segments.length + ' DCA blocks ready';
        }

        // YouTube transcript fetch via noembed + timedtext fallback
        function fetchYouTubeTranscript(videoId) {
            var status = document.getElementById('yt-status');
            status.textContent = 'Fetching transcript for ' + videoId + '...';
            // Try YouTube's timedtext XML (works for auto-captions, may be CORS-blocked)
            var url = 'https://www.youtube.com/api/timedtext?v=' + videoId + '&lang=en&fmt=srv3';
            fetch(url).then(function(r){
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            }).then(function(xml){
                var parser = new DOMParser();
                var doc = parser.parseFromString(xml, 'text/xml');
                var texts = doc.querySelectorAll('text');
                if (!texts.length) throw new Error('No captions found');
                var segs = [];
                texts.forEach(function(t){
                    var start = parseFloat(t.getAttribute('start') || '0');
                    segs.push({ t: start, text: (t.textContent || '').replace(/\n/g,' ').trim() });
                });
                var merged = [];
                for (var i = 0; i < segs.length; i++) {
                    if (merged.length && segs[i].t - merged[merged.length-1].t < 3) {
                        merged[merged.length-1].text += ' ' + segs[i].text;
                    } else {
                        merged.push({ t: segs[i].t, text: segs[i].text });
                    }
                }
                runPipeline(merged.map(function(s){
                    var m = Math.floor(s.t/60), sec = Math.floor(s.t%60);
                    return m + ':' + String(sec).padStart(2,'0') + '\n' + s.text;
                }).join('\n'), videoId);
            }).catch(function(){
                status.textContent = 'Auto-fetch blocked by CORS — paste transcript manually';
                document.getElementById('yt-paste-area').style.display = 'block';
            });
        }

        // Wire UI
        var fetchBtn = document.getElementById('yt-fetch');
        var pasteBtn = document.getElementById('yt-paste');
        var pushBtn = document.getElementById('yt-push');
        var pasteArea = document.getElementById('yt-paste-area');
        var urlInput = document.getElementById('yt-url');

        if (fetchBtn) fetchBtn.onclick = function() {
            var vid = extractVideoId(urlInput.value);
            if (!vid) { document.getElementById('yt-status').textContent = 'Invalid video ID'; return; }
            fetchYouTubeTranscript(vid);
        };
        if (pasteBtn) pasteBtn.onclick = function() {
            pasteArea.style.display = pasteArea.style.display === 'none' ? 'block' : 'none';
        };
        if (pasteArea) pasteArea.addEventListener('input', function() {
            if (pasteArea.value.length > 50) {
                var vid = extractVideoId(urlInput.value) || 'manual';
                runPipeline(pasteArea.value, vid);
            }
        });
        if (pushBtn) pushBtn.onclick = function() {
            if (!_segments.length) return;
            publishToEcosystem('transcript-dca', {
                type: 'transcript-dca',
                source: 'kbatch',
                videoId: _videoId,
                meta: _meta,
                segments: _segments,
                timestamp: Date.now()
            }, ['kbatch-transcript', 'iron-line', 'uterm-notes']);
            document.getElementById('yt-status').textContent = 'Pushed ' + _segments.length + ' DCA blocks via shared stack channels';
        };

        // P0b.6: D-Wave playlist batch-index catalog
        var DWAVE_CATALOG = [
            { id: 'K9zxUWZgMBE', title: 'Quantum Simulation with D-Wave', est: 200, playlist: null },
            { id: 'oH1uw_JQzI4', title: 'D-Wave Tutorials', est: 500, playlist: 'PLPvKnT7dgEssLmMY3HVaVzqMgALYXF55L' },
            { id: 'RM3LSEtIffY', title: 'D-Wave Research', est: 400, playlist: 'PLPvKnT7dgEstP8uVo36TOy3UDGsa0RvI3' },
            { id: '3J4ttZlHx5U', title: 'D-Wave Translations', est: 300, playlist: 'PLPvKnT7dgEstBpqBjCXC7ztHrtwj8pV5_' }
        ];
        var catalogEl = document.getElementById('yt-url');
        if (catalogEl) {
            var catWrap = document.createElement('div');
            catWrap.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;';
            DWAVE_CATALOG.forEach(function(v) {
                var btn = document.createElement('button');
                btn.style.cssText = 'padding:2px 8px;background:#161b22;border:1px solid #30363d;border-radius:4px;color:#58a6ff;font-size:.5rem;cursor:pointer;';
                btn.textContent = v.title + ' (~' + v.est + ')';
                btn.onclick = function() {
                    catalogEl.value = v.id;
                    document.getElementById('yt-status').textContent = 'Ready: ' + v.title;
                };
                catWrap.appendChild(btn);
            });
            catalogEl.parentNode.appendChild(catWrap);
        }

        // Expose for cross-app access
        window.TranscriptDCA = {
            classify: classifySegment,
            buildBlock: buildDCABlock,
            parseTranscript: parseTranscriptText,
            getSegments: function(){ return _segments; },
            runPipeline: runPipeline,
            extractVideoId: extractVideoId,
            DWAVE_CATALOG: DWAVE_CATALOG
        };
    })();

    // ══════════════════ CONTRAILS ENGINE (Cisponju Pattern Flow) ══════════════════
    window.Contrails = (function(){
        'use strict';
        const canvas = document.getElementById('ct-canvas');
        const ctx = canvas ? canvas.getContext('2d') : null;
        const input = document.getElementById('ct-input');
        const statsEl = document.getElementById('ct-stats');
        const legendEl = document.getElementById('ct-legend');
        const metricsEl = document.getElementById('ct-metrics');
        const modeEl = document.getElementById('ct-mode');
        const speedEl = document.getElementById('ct-speed');
        const ergoPanel = document.getElementById('ct-ergo-panel');
        const ergoGrid = document.getElementById('ct-ergo-grid');
        const fingerGrid = document.getElementById('ct-finger-grid');
        const healthRisks = document.getElementById('ct-health-risks');
        const flowSymbols = document.getElementById('ct-flow-symbols');
        if (!canvas || !ctx) return { active: false };

        // QWERTY layout mapping — [row, col] for every key (from day's keyboard-analyzer.ts)
        const KBD = {};
        'qwertyuiop'.split('').forEach((k,i) => { KBD[k] = [0, i]; });
        'asdfghjkl;'.split('').forEach((k,i) => { KBD[k] = [1, i]; });
        'zxcvbnm,./'.split('').forEach((k,i) => { KBD[k] = [2, i]; });
        KBD[' '] = [3, 4.5]; KBD['\t'] = [0, -1]; KBD['\n'] = [1, 10];
        '1234567890'.split('').forEach((k,i) => { KBD[k] = [-1, i]; });

        // ─── Cisponju finger assignment map (from BiometricAnalyzer) ───
        const FINGER_MAP = {};
        'qaz'.split('').forEach(k => { FINGER_MAP[k] = { finger: 'L-Pinky', hand: 'left', force: 0.6 }; });
        'wsx'.split('').forEach(k => { FINGER_MAP[k] = { finger: 'L-Ring', hand: 'left', force: 0.7 }; });
        'edc'.split('').forEach(k => { FINGER_MAP[k] = { finger: 'L-Middle', hand: 'left', force: 0.85 }; });
        'rfvtgb'.split('').forEach(k => { FINGER_MAP[k] = { finger: 'L-Index', hand: 'left', force: 1.0 }; });
        'yhnujm'.split('').forEach(k => { FINGER_MAP[k] = { finger: 'R-Index', hand: 'right', force: 1.0 }; });
        'ik,'.split('').forEach(k => { FINGER_MAP[k] = { finger: 'R-Middle', hand: 'right', force: 0.85 }; });
        'ol.'.split('').forEach(k => { FINGER_MAP[k] = { finger: 'R-Ring', hand: 'right', force: 0.7 }; });
        'p;/'.split('').forEach(k => { FINGER_MAP[k] = { finger: 'R-Pinky', hand: 'right', force: 0.6 }; });
        FINGER_MAP[' '] = { finger: 'Thumb', hand: 'both', force: 0.5 };
        // Home row keys for ergonomic scoring
        const HOME_ROW = new Set('asdfghjkl;'.split(''));
        const KEY_SPACING_MM = 19.05; // standard key spacing

        const COLS = 10, ROWS = 4;
        let trails = [];
        let heatmap = new Float32Array(COLS * ROWS);
        let lastKey = null, lastPos = null;
        let totalKeys = 0, totalDist = 0, dirChanges = 0, lastDir = '';
        let animFrame = 0;
        let active = false;
        // ─── Cisponju biometric state ───
        let fingerData = {};
        let flowPath = []; // directional flow symbols (→←↓↑↘↙↗↖)
        let totalDistMM = 0; // real-world mm distance
        let muscleExertion = 0; // millijoules
        let homeRowHits = 0;
        let sessionStart = 0;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function keyToXY(key) {
            const k = key.toLowerCase();
            const pos = KBD[k];
            if (!pos) return null;
            const rect = canvas.getBoundingClientRect();
            const kw = rect.width / (COLS + 2);
            const kh = (rect.height - 40) / (ROWS + 1);
            return { x: (pos[1] + 1.5) * kw, y: (pos[0] + 1.5) * kh + 20 };
        }

        function dist(a, b) { return Math.sqrt(Math.pow(a.x-b.x, 2) + Math.pow(a.y-b.y, 2)); }

        function direction(a, b) {
            const dx = b.x - a.x, dy = b.y - a.y;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle > -22.5 && angle <= 22.5) return '\u2192';
            if (angle > 22.5 && angle <= 67.5) return '\u2198';
            if (angle > 67.5 && angle <= 112.5) return '\u2193';
            if (angle > 112.5 && angle <= 157.5) return '\u2199';
            if (angle > -67.5 && angle <= -22.5) return '\u2197';
            if (angle > -112.5 && angle <= -67.5) return '\u2191';
            if (angle > -157.5 && angle <= -112.5) return '\u2196';
            return '\u2190';
        }

        // Trail color based on efficiency (from day's contrail-mapper.ts)
        function trailColor(d) {
            if (d < 30) return { r:88, g:166, b:255 };  // blue — efficient
            if (d < 60) return { r:63, g:185, b:80 };   // green — smooth
            if (d < 100) return { r:212, g:160, b:23 };  // amber — moderate
            return { r:168, g:139, b:250 };               // purple — complex
        }

        function feedKey(key, correct) {
            const pos = keyToXY(key);
            if (!pos) return;
            if (totalKeys === 0) sessionStart = Date.now();
            totalKeys++;
            const lk = key.toLowerCase();
            // Heatmap
            const kp = KBD[lk];
            if (kp) {
                const row = Math.max(0, Math.min(ROWS-1, kp[0]+1));
                const col = Math.max(0, Math.min(COLS-1, kp[1]));
                heatmap[row * COLS + col] += 1;
            }
            // ─── Cisponju finger tracking ───
            if (HOME_ROW.has(lk)) homeRowHits++;
            const finfo = FINGER_MAP[lk] || { finger: 'Unknown', hand: 'unknown', force: 0.5 };
            if (!fingerData[finfo.finger]) fingerData[finfo.finger] = { keys: 0, dist: 0, hand: finfo.hand, force: finfo.force };
            fingerData[finfo.finger].keys++;

            if (lastPos) {
                const d = dist(lastPos, pos);
                totalDist += d;
                const dmm = d * (KEY_SPACING_MM / 40); // approximate px to mm
                totalDistMM += dmm;
                // Muscle exertion = 0.02 mJ per keypress + distance component (from Cisponju BiometricAnalyzer)
                muscleExertion += 0.02 + (dmm * 0.0001);
                // Track per-finger distance
                fingerData[finfo.finger].dist += dmm;

                const dir = direction(lastPos, pos);
                if (lastDir && dir !== lastDir) dirChanges++;
                lastDir = dir;
                flowPath.push(dir);
                const color = trailColor(d);
                trails.push({
                    x1: lastPos.x, y1: lastPos.y, x2: pos.x, y2: pos.y,
                    color: color, opacity: 1.0, age: 0,
                    correct: correct, dir: dir, finger: finfo.finger
                });
            } else {
                flowPath.push('\u25CF'); // first key marker
            }
            lastPos = pos; lastKey = key;
        }

        // Musical rhythm mode — maps key timings to notes
        function renderRhythm(w, h) {
            ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h);
            if (trails.length === 0) {
                ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
                ctx.fillText('Type to hear your rhythm pattern', w/2, h/2);
                ctx.textAlign = 'start'; return;
            }
            const noteH = h / 8;
            const noteW = Math.max(4, w / Math.max(trails.length, 1));
            trails.forEach((t, i) => {
                const x = i * noteW;
                const d = dist({x:t.x1,y:t.y1}, {x:t.x2,y:t.y2});
                const pitch = Math.max(0, Math.min(7, Math.floor(d / 20)));
                const y = (7 - pitch) * noteH;
                const hue = (i / trails.length) * 360;
                ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${t.opacity})`;
                ctx.beginPath();
                ctx.ellipse(x + noteW/2, y + noteH/2, noteW/2 - 1, noteH/3, 0, 0, Math.PI*2);
                ctx.fill();
                // Stem
                ctx.strokeStyle = `hsla(${hue}, 70%, 55%, ${t.opacity * 0.6})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + noteW - 2, y + noteH/2);
                ctx.lineTo(x + noteW - 2, y - noteH);
                ctx.stroke();
            });
            // Staff lines
            ctx.strokeStyle = '#21262d'; ctx.lineWidth = 0.5;
            for (let i = 0; i < 5; i++) {
                const y = (i + 1.5) * noteH;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
        }

        // Dance moves mode — swirl patterns
        function renderDance(w, h) {
            ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h);
            if (trails.length === 0) {
                ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
                ctx.fillText('Type to see your dance pattern', w/2, h/2);
                ctx.textAlign = 'start'; return;
            }
            const cx = w/2, cy = h/2;
            ctx.save();
            ctx.translate(cx, cy);
            trails.forEach((t, i) => {
                const angle = (i / trails.length) * Math.PI * 4;
                const radius = (i / trails.length) * Math.min(w, h) * 0.4;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const size = 3 + (t.opacity * 8);
                const hue = (i * 7) % 360;
                ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${t.opacity})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI*2);
                ctx.fill();
                // Connect with previous
                if (i > 0) {
                    const pa = ((i-1) / trails.length) * Math.PI * 4;
                    const pr = ((i-1) / trails.length) * Math.min(w, h) * 0.4;
                    ctx.strokeStyle = `hsla(${hue}, 60%, 50%, ${t.opacity * 0.3})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(pa)*pr, Math.sin(pa)*pr);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            });
            ctx.restore();
        }

        // Pattern flow mode — river-like flow visualization
        function renderFlow(w, h) {
            ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h);
            if (trails.length === 0) {
                ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
                ctx.fillText('Type to see pattern flow', w/2, h/2);
                ctx.textAlign = 'start'; return;
            }
            const stepX = w / Math.max(trails.length, 1);
            ctx.lineWidth = 2;
            for (let i = 1; i < trails.length; i++) {
                const t = trails[i];
                const prev = trails[i-1];
                const x1 = (i-1) * stepX, x2 = i * stepX;
                const y1 = h/2 + (prev.y1 - prev.y2) * 0.5;
                const y2 = h/2 + (t.y1 - t.y2) * 0.5;
                const hue = t.correct ? 140 : 0;
                ctx.strokeStyle = `hsla(${hue}, 70%, 55%, ${t.opacity})`;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                const cpx = (x1 + x2) / 2;
                ctx.bezierCurveTo(cpx, y1, cpx, y2, x2, y2);
                ctx.stroke();
                // Particle
                ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${t.opacity})`;
                ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI*2); ctx.fill();
            }
        }

        // ─── Cisponju Ergonomic View ───
        function renderErgo(w, h) {
            ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h);
            if (totalKeys === 0) {
                ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
                ctx.fillText('Type to see ergonomic analysis', w/2, h/2);
                ctx.textAlign = 'start'; return;
            }
            const kw = w / (COLS + 2);
            const kh = (h - 40) / (ROWS + 1);
            const keyRows = ['qwertyuiop','asdfghjkl;','zxcvbnm,./'];
            // Draw keys with strain coloring (from Cisponju CanvasViewer force model)
            keyRows.forEach((row, r) => {
                row.split('').forEach((key, c) => {
                    const x = (c + 1.5) * kw - kw/2;
                    const y = (r + 1.5) * kh + 20 - kh/2;
                    const fi = FINGER_MAP[key] || { force: 0.5 };
                    const fd = fingerData[fi.finger] || { keys: 0 };
                    const strain = Math.min(1, fd.keys / Math.max(totalKeys, 1) * 5);
                    const isHome = HOME_ROW.has(key);
                    // Color: green (low strain) → yellow → red (high strain)
                    const hue = (1 - strain) * 120;
                    ctx.fillStyle = `hsla(${hue}, 70%, ${isHome ? 35 : 25}%, ${0.4 + strain * 0.6})`;
                    ctx.fillRect(x + 1, y + 1, kw - 2, kh - 2);
                    if (isHome) {
                        ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1;
                        ctx.strokeRect(x + 1, y + 1, kw - 2, kh - 2);
                    }
                    ctx.fillStyle = strain > 0.5 ? '#fff' : '#8b949e';
                    ctx.font = `${Math.min(12, kw * 0.4)}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText(key, x + kw/2, y + kh/2 + 3);
                    // Force indicator dot
                    if (fd.keys > 0) {
                        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
                        ctx.beginPath();
                        ctx.arc(x + kw - 4, y + 4, 2 + strain * 3, 0, Math.PI*2);
                        ctx.fill();
                    }
                });
            });
            ctx.textAlign = 'start';
            // RSI risk bar at top
            const homeRowPct = totalKeys > 0 ? (homeRowHits / totalKeys) * 100 : 0;
            const rsiRisk = Math.max(0, Math.min(100, 100 - homeRowPct - (totalKeys < 50 ? 30 : 0)));
            ctx.fillStyle = '#161b22'; ctx.fillRect(4, 4, w - 8, 16);
            const rsiHue = (1 - rsiRisk/100) * 120;
            ctx.fillStyle = `hsl(${rsiHue}, 70%, 50%)`;
            ctx.fillRect(4, 4, (w - 8) * (rsiRisk / 100), 16);
            ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 9px monospace';
            ctx.fillText(`RSI Risk: ${rsiRisk.toFixed(0)}% | Home Row: ${homeRowPct.toFixed(0)}% | Travel: ${totalDistMM.toFixed(0)}mm`, 8, 15);
        }

        // ─── Cisponju Finger Analysis View ───
        function renderFinger(w, h) {
            ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h);
            const fingers = Object.entries(fingerData);
            if (fingers.length === 0) {
                ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
                ctx.fillText('Type to see finger analysis', w/2, h/2);
                ctx.textAlign = 'start'; return;
            }
            const ordered = ['L-Pinky','L-Ring','L-Middle','L-Index','Thumb','R-Index','R-Middle','R-Ring','R-Pinky'];
            const barW = Math.max(20, (w - 80) / ordered.length - 4);
            const maxKeys = Math.max(1, ...fingers.map(f => f[1].keys));
            const colors = { 'L-Pinky':'#f472b6','L-Ring':'#fb923c','L-Middle':'#facc15','L-Index':'#4ade80',
                'Thumb':'#60a5fa','R-Index':'#4ade80','R-Middle':'#facc15','R-Ring':'#fb923c','R-Pinky':'#f472b6' };
            ordered.forEach((name, i) => {
                const data = fingerData[name] || { keys: 0, dist: 0 };
                const x = 40 + i * (barW + 4);
                const pct = data.keys / maxKeys;
                const barH = pct * (h - 80);
                const y = h - 30 - barH;
                const color = colors[name] || '#8b949e';
                // Bar
                ctx.fillStyle = color; ctx.globalAlpha = 0.3;
                ctx.fillRect(x, h - 30 - (h - 80), barW, h - 80);
                ctx.globalAlpha = 1;
                ctx.fillStyle = color;
                ctx.fillRect(x, y, barW, barH);
                // Count label
                ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
                ctx.fillText(data.keys, x + barW/2, y - 4);
                // Finger label (rotated)
                ctx.save(); ctx.translate(x + barW/2, h - 24);
                ctx.rotate(-Math.PI / 4);
                ctx.fillStyle = '#8b949e'; ctx.font = '7px monospace'; ctx.textAlign = 'right';
                ctx.fillText(name, 0, 0);
                ctx.restore();
                // Distance under bar
                if (data.dist > 0) {
                    ctx.fillStyle = '#484f58'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
                    ctx.fillText(data.dist.toFixed(0) + 'mm', x + barW/2, y - 12);
                }
            });
            ctx.textAlign = 'start';
            // Title
            ctx.fillStyle = '#d2a8ff'; ctx.font = 'bold 10px monospace';
            ctx.fillText(`Finger Analysis | ${totalKeys} keys | ${Object.keys(fingerData).length} fingers`, 8, 14);
            // Hand balance
            let leftKeys = 0, rightKeys = 0;
            fingers.forEach(([n,d]) => { if (d.hand === 'left') leftKeys += d.keys; else if (d.hand === 'right') rightKeys += d.keys; });
            const total = leftKeys + rightKeys || 1;
            ctx.fillText(`L: ${Math.round(leftKeys/total*100)}% | R: ${Math.round(rightKeys/total*100)}%`, w - 120, 14);
        }

        // Heatmap mode
        function renderHeatmap(w, h) {
            ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h);
            const maxHeat = Math.max(1, ...heatmap);
            const kw = w / (COLS + 2);
            const kh = (h - 40) / (ROWS + 1);
            const keys = [
                '1234567890'.split(''),
                'qwertyuiop'.split(''),
                'asdfghjkl;'.split(''),
                'zxcvbnm,./'.split(''),
            ];
            keys.forEach((row, r) => {
                row.forEach((key, c) => {
                    const x = (c + 1.5) * kw - kw/2;
                    const y = r * kh + 20;
                    const heat = heatmap[Math.max(0,r) * COLS + Math.min(c, COLS-1)] / maxHeat;
                    const hue = 240 - heat * 240; // blue → red
                    ctx.fillStyle = `hsla(${hue}, 80%, ${20 + heat * 40}%, ${0.3 + heat * 0.7})`;
                    ctx.fillRect(x + 1, y + 1, kw - 2, kh - 2);
                    ctx.fillStyle = heat > 0.5 ? '#fff' : '#8b949e';
                    ctx.font = `${Math.min(14, kw * 0.5)}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText(key, x + kw/2, y + kh/2 + 4);
                });
            });
            ctx.textAlign = 'start';
        }

        // Standard contrails mode (from day's contrail-mapper.ts)
        function renderContrails(w, h) {
            ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h);
            // Draw keyboard outline
            const kw = w / (COLS + 2);
            const kh = (h - 40) / (ROWS + 1);
            const keyRows = ['qwertyuiop','asdfghjkl;','zxcvbnm,./'];
            ctx.strokeStyle = '#21262d'; ctx.lineWidth = 0.5;
            keyRows.forEach((row, r) => {
                row.split('').forEach((key, c) => {
                    const x = (c + 1.5) * kw - kw/2;
                    const y = (r + 1.5) * kh + 20 - kh/2;
                    ctx.strokeRect(x, y, kw - 1, kh - 1);
                    ctx.fillStyle = '#30363d'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
                    ctx.fillText(key, x + kw/2, y + kh/2 + 3);
                });
            });
            ctx.textAlign = 'start';

            if (trails.length === 0) {
                ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
                ctx.fillText('Type to generate contrails', w/2, h/2);
                ctx.textAlign = 'start'; return;
            }

            // Draw trails with Bezier curves and glow
            trails.forEach(t => {
                if (t.opacity < 0.01) return;
                ctx.save();
                ctx.globalAlpha = t.opacity;
                ctx.strokeStyle = `rgb(${t.color.r},${t.color.g},${t.color.b})`;
                ctx.shadowColor = `rgb(${t.color.r},${t.color.g},${t.color.b})`;
                ctx.shadowBlur = 6;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(t.x1, t.y1);
                const cpx = (t.x1 + t.x2) / 2;
                const cpy = Math.min(t.y1, t.y2) - 15;
                ctx.quadraticCurveTo(cpx, cpy, t.x2, t.y2);
                ctx.stroke();
                // Arrow at end
                ctx.fillStyle = `rgba(${t.color.r},${t.color.g},${t.color.b},${t.opacity})`;
                ctx.beginPath(); ctx.arc(t.x2, t.y2, 3, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            });
        }

        function animate() {
            if (!active) return;
            resize();
            const w = canvas.getBoundingClientRect().width;
            const h = canvas.getBoundingClientRect().height;
            const mode = modeEl ? modeEl.value : 'contrails';
            const speed = speedEl ? parseInt(speedEl.value) / 5 : 1;

            // Fade trails
            trails.forEach(t => { t.opacity *= (0.998 - speed * 0.001); t.age++; });
            trails = trails.filter(t => t.opacity > 0.01);

            switch (mode) {
                case 'heatmap': renderHeatmap(w, h); break;
                case 'rhythm': renderRhythm(w, h); break;
                case 'dance': renderDance(w, h); break;
                case 'flow': renderFlow(w, h); break;
                case 'ergo': renderErgo(w, h); break;
                case 'finger': renderFinger(w, h); break;
                default: renderContrails(w, h);
            }

            // Show ergo panel when in ergo/finger/flow modes
            const showErgo = mode === 'ergo' || mode === 'finger' || mode === 'flow';
            if (ergoPanel) ergoPanel.style.display = showErgo ? '' : 'none';
            if (showErgo) updateErgoPanel();

            // Stats overlay
            const eff = totalKeys > 1 ? Math.max(0, 100 - (totalDist / totalKeys) * 0.3).toFixed(0) : 0;
            const cpx = totalKeys > 1 ? ((dirChanges / Math.max(1, totalKeys-1)) * 100).toFixed(0) : 0;
            const cal = (muscleExertion / 4184000 + totalDistMM * 0.0001).toFixed(6);
            if (statsEl) statsEl.textContent = `Keys: ${totalKeys} | Eff: ${eff}% | Cpx: ${cpx}% | Trails: ${trails.length} | ${totalDistMM.toFixed(0)}mm | ${cal} cal`;

            animFrame = requestAnimationFrame(animate);
        }

        function start() {
            if (active) return;
            active = true;
            resize();
            animate();
            // Legend
            if (legendEl) {
                legendEl.innerHTML = [
                    ['#58a6ff', 'Efficient (<30px)'],
                    ['#3fb950', 'Smooth (30-60px)'],
                    ['#d4a017', 'Moderate (60-100px)'],
                    ['#a78bfa', 'Complex (>100px)'],
                ].map(([c,l]) => `<span style="display:flex;align-items:center;gap:4px;font-size:.5625rem;color:#8b949e;"><span style="width:10px;height:10px;border-radius:50%;background:${c};"></span>${l}</span>`).join('');
            }
        }

        function stop() { active = false; cancelAnimationFrame(animFrame); }

        // ─── Cisponju Ergonomic Panel Update ───
        function updateErgoPanel() {
            if (!ergoGrid || totalKeys === 0) return;
            const elapsed = (Date.now() - sessionStart) / 1000 || 1;
            const calories = muscleExertion / 4184000 + totalDistMM * 0.0001;
            const heatGen = muscleExertion * 0.0001; // degrees C
            const homeRowPct = totalKeys > 0 ? (homeRowHits / totalKeys) * 100 : 0;
            const rsiRisk = Math.max(0, Math.min(100, 100 - homeRowPct - (totalKeys < 50 ? 30 : 0)));
            const comfort = homeRowPct > 70 ? 90 : homeRowPct > 50 ? 70 : homeRowPct > 30 ? 50 : 30;
            const strain = Math.max(0, 100 - (totalKeys * 0.5));
            const wpm = (totalKeys / 5) / (elapsed / 60);
            const riceG = calories / 1.3;
            const chocoG = calories / 5.3;
            const items = [
                ['Travel', totalDistMM.toFixed(0) + 'mm', '#58a6ff'],
                ['Energy', (muscleExertion * 1000).toFixed(2) + '\u00B5J', '#a78bfa'],
                ['Calories', calories.toFixed(6), '#f472b6'],
                ['Heat', heatGen.toFixed(6) + '\u00B0C', '#fb923c'],
                ['WPM', wpm.toFixed(0), wpm > 60 ? '#3fb950' : '#d4a017'],
                ['Comfort', comfort.toFixed(0) + '%', comfort > 70 ? '#3fb950' : comfort > 40 ? '#d4a017' : '#f85149'],
                ['Home Row', homeRowPct.toFixed(0) + '%', homeRowPct > 60 ? '#3fb950' : '#d4a017'],
                ['RSI Risk', rsiRisk.toFixed(0) + '%', rsiRisk < 30 ? '#3fb950' : rsiRisk < 60 ? '#d4a017' : '#f85149'],
                ['Rice', riceG.toFixed(4) + 'g', '#fbbf24'],
                ['Chocolate', chocoG.toFixed(4) + 'g', '#a78bfa'],
            ];
            ergoGrid.innerHTML = items.map(([l,v,c]) => `<div style="padding:6px;background:#161b22;border:1px solid #21262d;border-radius:6px;"><div style="font-size:.5rem;color:#484f58;">${l}</div><div style="font-size:.75rem;font-weight:700;color:${c};font-family:var(--mono);">${v}</div></div>`).join('');
            // Finger grid
            if (fingerGrid) {
                const ordered = ['L-Pinky','L-Ring','L-Middle','L-Index','Thumb','R-Index','R-Middle','R-Ring','R-Pinky'];
                const maxK = Math.max(1, ...Object.values(fingerData).map(f => f.keys));
                fingerGrid.innerHTML = ordered.map(name => {
                    const d = fingerData[name] || { keys: 0, dist: 0 };
                    const pct = Math.round(d.keys / maxK * 100);
                    const strain = Math.min(100, d.dist / Math.max(totalDistMM, 1) * 300);
                    const color = strain > 60 ? '#f85149' : strain > 30 ? '#d4a017' : '#3fb950';
                    return `<div style="text-align:center;padding:4px;background:#161b22;border:1px solid #21262d;border-radius:4px;"><div style="font-size:.5rem;color:#8b949e;">${name.replace('L-','').replace('R-','')}</div><div style="font-size:.6875rem;font-weight:700;color:${color};">${d.keys}</div><div style="height:3px;background:#21262d;border-radius:2px;margin-top:2px;"><div style="height:100%;width:${pct}%;background:${color};border-radius:2px;"></div></div></div>`;
                }).join('');
            }
            // Health risks
            if (healthRisks) {
                const risks = [];
                if (rsiRisk > 60) risks.push(['RSI', '#f85149']);
                if (homeRowPct < 30) risks.push(['Off-Row Strain', '#fb923c']);
                const fingers = Object.entries(fingerData);
                const imbalance = fingers.some(([,d]) => d.keys > totalKeys * 0.3);
                if (imbalance) risks.push(['Finger Imbalance', '#d4a017']);
                if (totalDistMM > 1000) risks.push(['High Travel', '#fb923c']);
                if (risks.length === 0) risks.push(['All Clear', '#3fb950']);
                healthRisks.innerHTML = risks.map(([l,c]) => `<span style="padding:2px 8px;background:${c}22;color:${c};border:1px solid ${c}44;border-radius:4px;font-family:var(--mono);font-size:.5625rem;">${l}</span>`).join('');
            }
            // Flow symbols
            if (flowSymbols) {
                flowSymbols.textContent = flowPath.slice(-60).join('');
            }
        }

        function clear() {
            trails = []; heatmap = new Float32Array(COLS * ROWS);
            lastKey = null; lastPos = null;
            totalKeys = 0; totalDist = 0; dirChanges = 0; lastDir = '';
            fingerData = {}; flowPath = []; totalDistMM = 0; muscleExertion = 0; homeRowHits = 0; sessionStart = 0;
            if (ctx) { resize(); const w = canvas.getBoundingClientRect().width; const h = canvas.getBoundingClientRect().height; ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h); }
            if (statsEl) statsEl.textContent = 'Type or paste text to visualize';
            if (metricsEl) metricsEl.innerHTML = '';
            if (ergoGrid) ergoGrid.innerHTML = '';
            if (fingerGrid) fingerGrid.innerHTML = '';
            if (healthRisks) healthRisks.innerHTML = '';
            if (flowSymbols) flowSymbols.textContent = '';
        }

        // Wire input
        if (input) {
            input.addEventListener('input', () => {
                if (!active) start();
                const text = input.value;
                if (text.length > 0) feedKey(text[text.length - 1], true);
                // Update Contrail Language panel
                var clOut = document.getElementById('ct-lang-output');
                if (clOut && text.length > 2 && window.StenoEngine && window.StenoEngine.ContrailLang) {
                    try {
                        var CL = window.StenoEngine.ContrailLang;
                        var enc = CL.encodeSentence(text);
                        var parts = [];
                        parts.push('<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:4px;">');
                        parts.push('<span style="color:#a78bfa;font-size:1.1rem;letter-spacing:1px;" title="Contrail sentence">' + enc.arrowSentence + '</span>');
                        parts.push('<span style="color:#3fb950;font-size:.625rem;" title="Dialect">' + (typeof LAYOUTS !== 'undefined' && LAYOUTS[enc.layout] ? LAYOUTS[enc.layout].name : enc.layout) + ' dialect</span>');
                        parts.push('</div>');
                        parts.push('<div style="color:#fbbf24;font-size:.6875rem;margin-bottom:4px;" title="Spoken form">\uD83D\uDD0A ' + enc.spoken + '</div>');
                        // Show word-by-word breakdown
                        if (enc.words.length > 0 && enc.words.length <= 12) {
                            parts.push('<div style="display:flex;gap:4px;flex-wrap:wrap;">');
                            enc.words.forEach(function(wc) {
                                parts.push('<span style="background:#161b22;border:1px solid #21262d;border-radius:4px;padding:2px 5px;font-size:.5625rem;">' +
                                    '<span style="color:#8b949e;">' + wc.word + '</span> ' +
                                    '<span style="color:#a78bfa;">' + wc.arrows + '</span> ' +
                                    '<span style="color:#58a6ff;">' + wc.spoken + '</span>' +
                                '</span>');
                            });
                            parts.push('</div>');
                        }
                        // Concept bridge
                        if (enc.conceptBridge.length > 0) {
                            parts.push('<div style="margin-top:4px;font-size:.5625rem;color:#484f58;">Concept bridge: ');
                            enc.conceptBridge.slice(0, 8).forEach(function(cb) {
                                parts.push('<span style="color:#c084fc;">' + cb.atom + '</span><span style="color:#484f58;">' + cb.name + '</span> ');
                            });
                            parts.push('</div>');
                        }
                        clOut.innerHTML = parts.join('');
                    } catch(e) { clOut.innerHTML = '<span style="color:#484f58;">Type more to generate...</span>'; }
                }
            });
            input.addEventListener('focus', () => { if (!active) start(); });
        }

        // Observe tab activation
        const observer = new MutationObserver(() => {
            const panel = document.getElementById('panel-contrails');
            if (panel && panel.classList.contains('active')) { start(); }
            else { stop(); }
        });
        const panel = document.getElementById('panel-contrails');
        if (panel) observer.observe(panel, { attributes: true, attributeFilter: ['class'] });

        // Export for text feed
        function feedText(text) {
            if (!active) start();
            for (const ch of text) { feedKey(ch, true); }
            // Update metrics
            if (metricsEl) {
                const eff = totalKeys > 1 ? Math.max(0, 100 - (totalDist / totalKeys) * 0.3) : 0;
                const cpx = totalKeys > 1 ? (dirChanges / Math.max(1, totalKeys-1)) * 100 : 0;
                const avgDist = totalKeys > 1 ? totalDist / (totalKeys - 1) : 0;
                const homeRowPct = totalKeys > 0 ? (homeRowHits / totalKeys) * 100 : 0;
                const calories = (muscleExertion / 4184000 + totalDistMM * 0.0001);
                metricsEl.innerHTML = [
                    ['Total Keys', totalKeys, '#e6edf3'],
                    ['Efficiency', eff.toFixed(1) + '%', eff > 70 ? '#3fb950' : eff > 40 ? '#d4a017' : '#f85149'],
                    ['Complexity', cpx.toFixed(1) + '%', cpx > 50 ? '#f85149' : cpx > 25 ? '#d4a017' : '#3fb950'],
                    ['Travel', totalDistMM.toFixed(0) + 'mm', '#58a6ff'],
                    ['Home Row', homeRowPct.toFixed(0) + '%', homeRowPct > 60 ? '#3fb950' : '#d4a017'],
                    ['Energy', (muscleExertion * 1000).toFixed(2) + '\u00B5J', '#a78bfa'],
                    ['Calories', calories.toFixed(6), '#f472b6'],
                    ['Dir Changes', dirChanges, '#fb923c'],
                ].map(([l,v,c]) => `<div style="padding:8px;background:#161b22;border:1px solid #21262d;border-radius:6px;"><div style="font-size:.5625rem;color:#484f58;">${l}</div><div style="font-size:.875rem;font-weight:700;color:${c};font-family:var(--mono);">${v}</div></div>`).join('');
            }
        }

        // Biometric data export (for search/history AI Lens integration)
        function getBiometrics() {
            const elapsed = sessionStart > 0 ? (Date.now() - sessionStart) / 1000 : 0;
            const calories = muscleExertion / 4184000 + totalDistMM * 0.0001;
            const homeRowPct = totalKeys > 0 ? (homeRowHits / totalKeys) * 100 : 0;
            return {
                totalKeys, totalDistMM: Math.round(totalDistMM),
                muscleExertion: muscleExertion * 1000, // microjoules
                calories, heatGenerated: muscleExertion * 0.0001,
                homeRowPct: Math.round(homeRowPct),
                rsiRisk: Math.max(0, Math.min(100, 100 - homeRowPct - (totalKeys < 50 ? 30 : 0))),
                wpm: elapsed > 0 ? Math.round((totalKeys / 5) / (elapsed / 60)) : 0,
                fingerData: { ...fingerData },
                flowPath: flowPath.join(''),
                dirChanges, sessionElapsed: Math.round(elapsed),
                foodEquivalent: { riceG: calories / 1.3, chocolateG: calories / 5.3 },
            };
        }

        // ─── Gesture Search: find words/patterns by flow direction sequence ───
        function searchByGesture(gestureSeq) {
            // gestureSeq: string of direction symbols like "→↓↗→" or "R D UR R"
            // Normalize to direction codes
            var ARROW_TO_DIR = { '\u2191':'U', '\u2193':'D', '\u2190':'L', '\u2192':'R', '\u2196':'UL', '\u2197':'UR', '\u2199':'DL', '\u2198':'DR', '\u25CF':'S' };
            var seq = gestureSeq.replace(/[^UDLRS\u2191\u2193\u2190\u2192\u2196\u2197\u2199\u2198\u25CF]/g, '');
            var dirs = [];
            for (var i = 0; i < seq.length; i++) {
                var ch = seq[i];
                if (ARROW_TO_DIR[ch]) dirs.push(ARROW_TO_DIR[ch]);
                else if ('UDLRS'.indexOf(ch) !== -1) dirs.push(ch);
            }
            if (dirs.length < 2) return [];
            // Search capsule analyzer for matching flow patterns
            var results = [];
            var CapsAn = typeof window !== 'undefined' ? window.CapsuleAnalyzer : null;
            if (CapsAn) {
                var lib = CapsAn.getLibrary();
                if (lib && lib.capsules) {
                    lib.capsules.forEach(function(cap) {
                        cap.words.forEach(function(w) {
                            if (w.flowArrows && w.flowArrows.length >= dirs.length) {
                                // Convert arrows to dir codes for matching
                                var wDirs = [];
                                for (var j = 0; j < w.flowArrows.length; j++) {
                                    var d = ARROW_TO_DIR[w.flowArrows[j]];
                                    if (d) wDirs.push(d);
                                }
                                // Substring match
                                var wStr = wDirs.join(',');
                                var qStr = dirs.join(',');
                                if (wStr.indexOf(qStr) !== -1) {
                                    results.push({ word: w.word, capsule: cap.capsule, flowArrows: w.flowArrows, efficiency: w.efficiency, match: 'exact' });
                                }
                            }
                        });
                    });
                }
            }
            return results.slice(0, 30);
        }

        // ─── VR/XR/AR Hand Tracking → Key Mapping ───
        // Converts 3D hand joint positions to virtual key presses
        // Compatible with WebXR Hand Input API (XRHand joints)
        var VR_KEYBOARD = {
            // Virtual keyboard plane in VR space (meters from headset)
            planeDistance: 0.4,
            planeWidth: 0.35,
            planeHeight: 0.12,
            activeHand: null,
            lastFingerTip: null,
            keyPressThreshold: 0.015, // 15mm approach = press

            mapHandToKey: function(fingerTipPos, thumbTipPos) {
                // fingerTipPos/thumbTipPos: {x, y, z} in meters from plane center
                if (!fingerTipPos) return null;
                // Pinch detection: index tip close to thumb tip
                var pinchDist = thumbTipPos ? Math.sqrt(
                    Math.pow(fingerTipPos.x - thumbTipPos.x, 2) +
                    Math.pow(fingerTipPos.y - thumbTipPos.y, 2) +
                    Math.pow(fingerTipPos.z - thumbTipPos.z, 2)
                ) : 1;
                var isPinch = pinchDist < 0.025; // 25mm
                // Map x,y to keyboard grid
                var normalX = (fingerTipPos.x + this.planeWidth / 2) / this.planeWidth;
                var normalY = (fingerTipPos.y + this.planeHeight / 2) / this.planeHeight;
                if (normalX < 0 || normalX > 1 || normalY < 0 || normalY > 1) return null;
                var layout = getLayout();
                if (!layout) return null;
                var rowIdx = Math.min(Math.floor(normalY * layout.rows.length), layout.rows.length - 1);
                var row = layout.rows[rowIdx];
                var colIdx = Math.min(Math.floor(normalX * row.length), row.length - 1);
                var key = row[colIdx];
                // Z-depth press detection
                var isPress = fingerTipPos.z < this.keyPressThreshold;
                return {
                    key: key,
                    row: rowIdx,
                    col: colIdx,
                    isPinch: isPinch,
                    isPress: isPress,
                    normalX: normalX,
                    normalY: normalY,
                    depth: fingerTipPos.z,
                    gesture: isPinch ? 'pinch' : isPress ? 'press' : 'hover',
                };
            },

            // Convert WebXR XRHand joints to key events
            processXRHand: function(hand, handedness) {
                if (!hand) return null;
                // XRHand joint indices: INDEX_FINGER_TIP = 8, THUMB_TIP = 4
                var indexTip = hand.get ? hand.get('index-finger-tip') : null;
                var thumbTip = hand.get ? hand.get('thumb-tip') : null;
                if (!indexTip) return null;
                var result = this.mapHandToKey(
                    indexTip.transform ? { x: indexTip.transform.position.x, y: indexTip.transform.position.y, z: indexTip.transform.position.z } : indexTip,
                    thumbTip && thumbTip.transform ? { x: thumbTip.transform.position.x, y: thumbTip.transform.position.y, z: thumbTip.transform.position.z } : thumbTip
                );
                if (result) result.handedness = handedness || 'unknown';
                return result;
            },
        };

        // ─── Gesture-to-ASL/BSL Bridge ───
        // When in VR, map ASL/BSL finger configurations to concept atoms
        function gestureToSymbol(gesture) {
            // gesture: { type: 'asl'|'bsl', letter: 'a'-'z' }
            var Steno = typeof window !== 'undefined' ? window.StenoEngine : null;
            if (!Steno) return null;
            // Find words starting with this letter and their concept atoms
            var matches = [];
            Object.entries(Steno.LEXICON).forEach(function(e) {
                if (e[0].startsWith(gesture.letter)) {
                    matches.push({ word: e[0], atoms: e[1] });
                }
            });
            return { letter: gesture.letter, type: gesture.type, matches: matches.slice(0, 10) };
        }

        // ══════════════════ UNIVERSAL STROKE ADAPTER ══════════════════
        // Converts ANY 2D/3D movement path into contrail direction phonemes.
        // Input: pen strokes, animal joint trajectories, sewing paths, air writing,
        // hand controllers, touch surfaces, drawing tablets, font bezier curves.
        // Output: same direction phoneme stream as keyboard contrails — unified language.
        //
        // The key insight: movement through space IS the language. Whether it's
        // a finger on a keyboard, a pen on paper, a paw on ground, or a needle
        // through fabric — it all produces directional flow that can be encoded,
        // compared, and searched.

        var UniversalStroke = (function() {

            // ─── Direction quantizer: any dx,dy → 8-direction + stationary ───
            function quantize(dx, dy, threshold) {
                threshold = threshold || 0.01;
                if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return '\u25CF'; // stationary
                var angle = Math.atan2(dy, dx) * 180 / Math.PI;
                if (angle > -22.5 && angle <= 22.5) return '\u2192';     // →
                if (angle > 22.5 && angle <= 67.5) return '\u2198';      // ↘
                if (angle > 67.5 && angle <= 112.5) return '\u2193';     // ↓
                if (angle > 112.5 && angle <= 157.5) return '\u2199';    // ↙
                if (angle > -67.5 && angle <= -22.5) return '\u2197';    // ↗
                if (angle > -112.5 && angle <= -67.5) return '\u2191';   // ↑
                if (angle > -157.5 && angle <= -112.5) return '\u2196';  // ↖
                return '\u2190'; // ←
            }

            // ─── Core path-to-phonemes converter ───
            // path: Array of {x, y} (optionally {z, pressure, velocity, tilt, timestamp, label})
            // opts: { normalize: bool, sampleRate: int, source: string }
            function pathToPhonemes(path, opts) {
                opts = opts || {};
                if (!path || path.length < 2) return { phonemes: [], meta: {} };

                var points = path;
                // Normalize to 0-1 range if requested
                if (opts.normalize !== false) {
                    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    for (var i = 0; i < points.length; i++) {
                        if (points[i].x < minX) minX = points[i].x;
                        if (points[i].x > maxX) maxX = points[i].x;
                        if (points[i].y < minY) minY = points[i].y;
                        if (points[i].y > maxY) maxY = points[i].y;
                    }
                    var rangeX = maxX - minX || 1;
                    var rangeY = maxY - minY || 1;
                    points = points.map(function(p) {
                        return Object.assign({}, p, { x: (p.x - minX) / rangeX, y: (p.y - minY) / rangeY });
                    });
                }

                // Downsample if needed
                if (opts.sampleRate && opts.sampleRate < points.length) {
                    var step = Math.floor(points.length / opts.sampleRate);
                    var sampled = [];
                    for (var s = 0; s < points.length; s += step) sampled.push(points[s]);
                    if (sampled[sampled.length - 1] !== points[points.length - 1]) sampled.push(points[points.length - 1]);
                    points = sampled;
                }

                var phonemes = [];
                var totalDist = 0;
                var speeds = [];
                var pressures = [];
                var dirChanges = 0;
                var lastDir = '';

                for (var j = 1; j < points.length; j++) {
                    var dx = points[j].x - points[j-1].x;
                    var dy = points[j].y - points[j-1].y;
                    var d = Math.sqrt(dx * dx + dy * dy);
                    totalDist += d;

                    var dir = quantize(dx, dy, opts.threshold || 0.005);
                    if (lastDir && dir !== lastDir) dirChanges++;
                    lastDir = dir;

                    var speed = 0;
                    if (points[j].timestamp && points[j-1].timestamp) {
                        var dt = points[j].timestamp - points[j-1].timestamp;
                        speed = dt > 0 ? d / dt : 0;
                    } else if (points[j].velocity != null) {
                        speed = points[j].velocity;
                    }

                    phonemes.push({
                        dir: dir,
                        dist: d,
                        speed: speed,
                        pressure: points[j].pressure || 0,
                        tilt: points[j].tilt || 0,
                        z: points[j].z || 0,
                        label: points[j].label || '',
                        idx: j
                    });

                    if (speed) speeds.push(speed);
                    if (points[j].pressure) pressures.push(points[j].pressure);
                }

                // Direction frequency distribution
                var dirCounts = {};
                phonemes.forEach(function(p) { dirCounts[p.dir] = (dirCounts[p.dir] || 0) + 1; });

                // Flow signature: run-length encoded direction sequence
                var flowSig = '';
                var runLen = 1;
                for (var k = 1; k < phonemes.length; k++) {
                    if (phonemes[k].dir === phonemes[k-1].dir) {
                        runLen++;
                    } else {
                        flowSig += phonemes[k-1].dir + (runLen > 1 ? runLen : '');
                        runLen = 1;
                    }
                }
                if (phonemes.length > 0) flowSig += phonemes[phonemes.length-1].dir + (runLen > 1 ? runLen : '');

                return {
                    phonemes: phonemes,
                    directionString: phonemes.map(function(p) { return p.dir; }).join(''),
                    flowSignature: flowSig,
                    meta: {
                        source: opts.source || 'unknown',
                        pointCount: points.length,
                        totalDistance: totalDist,
                        directionChanges: dirChanges,
                        complexity: points.length > 1 ? dirChanges / (points.length - 1) : 0,
                        directionDistribution: dirCounts,
                        avgSpeed: speeds.length > 0 ? speeds.reduce(function(a,b){return a+b;},0) / speeds.length : 0,
                        avgPressure: pressures.length > 0 ? pressures.reduce(function(a,b){return a+b;},0) / pressures.length : 0,
                        dominantDirection: Object.entries(dirCounts).sort(function(a,b){return b[1]-a[1];})[0] || ['none',0],
                        is3D: path.some(function(p) { return p.z != null && p.z !== 0; }),
                        hasPressure: pressures.length > 0,
                    }
                };
            }

            // ─── SLEAP / DeepLabCut / Animal Pose Format Adapter ───
            // Ingests {keypoints: [{x,y,score,name}], skeleton: [[i,j]]} per frame
            // Returns phonemes for each joint trajectory across frames
            function fromPoseFrames(frames, opts) {
                opts = opts || {};
                if (!frames || frames.length < 2) return {};
                // Discover joint names from first frame
                var jointNames = [];
                var firstKP = frames[0].keypoints || frames[0].joints || frames[0];
                if (Array.isArray(firstKP)) {
                    firstKP.forEach(function(kp, idx) {
                        jointNames.push(kp.name || kp.label || ('joint_' + idx));
                    });
                }

                // Build per-joint trajectory across frames
                var trajectories = {};
                jointNames.forEach(function(name, idx) {
                    trajectories[name] = [];
                    frames.forEach(function(frame, fIdx) {
                        var kps = frame.keypoints || frame.joints || frame;
                        var kp = Array.isArray(kps) ? kps[idx] : kps[name];
                        if (kp && kp.x != null && kp.y != null) {
                            trajectories[name].push({
                                x: kp.x, y: kp.y,
                                z: kp.z || 0,
                                score: kp.score || kp.confidence || 1,
                                timestamp: frame.timestamp || fIdx * (1000 / (opts.fps || 30)),
                                label: name + '_f' + fIdx
                            });
                        }
                    });
                });

                // Convert each trajectory to phonemes
                var results = {};
                var combinedPhonemes = [];
                Object.entries(trajectories).forEach(function(e) {
                    var name = e[0], path = e[1];
                    if (path.length < 2) return;
                    var result = pathToPhonemes(path, {
                        source: 'pose/' + (opts.format || 'sleap') + '/' + name,
                        normalize: opts.normalize !== false,
                        threshold: opts.threshold || 0.01
                    });
                    results[name] = result;
                    // Weight by confidence score for combined signature
                    path.forEach(function(p, idx) {
                        if (idx > 0 && result.phonemes[idx-1]) {
                            combinedPhonemes.push(Object.assign({}, result.phonemes[idx-1], {
                                weight: p.score || 1,
                                joint: name
                            }));
                        }
                    });
                });

                // Aggregate direction distribution across all joints
                var aggDirCounts = {};
                Object.values(results).forEach(function(r) {
                    if (r.meta && r.meta.directionDistribution) {
                        Object.entries(r.meta.directionDistribution).forEach(function(e) {
                            aggDirCounts[e[0]] = (aggDirCounts[e[0]] || 0) + e[1];
                        });
                    }
                });

                return {
                    joints: results,
                    combined: combinedPhonemes,
                    aggregateDirections: aggDirCounts,
                    format: opts.format || 'sleap',
                    frameCount: frames.length,
                    jointCount: jointNames.length,
                    jointNames: jointNames
                };
            }

            // ─── Brush/Pen Stroke Adapter (Lark BrushEngine format) ───
            // Takes Point[] with {x, y, pressure, velocity, tilt, bearing}
            function fromBrushStroke(points, opts) {
                opts = opts || {};
                return pathToPhonemes(points.map(function(p) {
                    return {
                        x: p.x, y: p.y,
                        pressure: p.pressure || 0,
                        velocity: p.velocity || 0,
                        tilt: p.tilt || 0,
                        z: p.bearing || 0, // bearing → z for 3D
                        label: (opts.brushShape || 'pen') + '_' + (p.pressure > 0.7 ? 'heavy' : p.pressure > 0.3 ? 'medium' : 'light')
                    };
                }), { source: 'brush/' + (opts.brushShape || 'pen'), normalize: true });
            }

            // ─── Font/Glyph Bezier Adapter ───
            // Takes SVG path data or bezier control points → sample to path → phonemes
            function fromGlyphPath(glyphData, opts) {
                opts = opts || {};
                var points = [];
                if (typeof glyphData === 'string') {
                    // SVG path: M x y L x y C x1 y1 x2 y2 x y ...
                    var commands = glyphData.match(/[MLCSQAZ][^MLCSQAZ]*/gi) || [];
                    var cx = 0, cy = 0;
                    commands.forEach(function(cmd) {
                        var type = cmd[0].toUpperCase();
                        var nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
                        if (type === 'M') { cx = nums[0]; cy = nums[1]; points.push({x:cx,y:cy}); }
                        else if (type === 'L') { cx = nums[0]; cy = nums[1]; points.push({x:cx,y:cy}); }
                        else if (type === 'C') {
                            // Cubic bezier: sample at 8 points
                            for (var t = 0.125; t <= 1; t += 0.125) {
                                var mt = 1 - t;
                                var x = mt*mt*mt*cx + 3*mt*mt*t*nums[0] + 3*mt*t*t*nums[2] + t*t*t*nums[4];
                                var y = mt*mt*mt*cy + 3*mt*mt*t*nums[1] + 3*mt*t*t*nums[3] + t*t*t*nums[5];
                                points.push({x:x, y:y});
                            }
                            cx = nums[4]; cy = nums[5];
                        }
                        else if (type === 'Q') {
                            for (var tq = 0.125; tq <= 1; tq += 0.125) {
                                var mqt = 1 - tq;
                                var qx = mqt*mqt*cx + 2*mqt*tq*nums[0] + tq*tq*nums[2];
                                var qy = mqt*mqt*cy + 2*mqt*tq*nums[1] + tq*tq*nums[3];
                                points.push({x:qx, y:qy});
                            }
                            cx = nums[2]; cy = nums[3];
                        }
                    });
                } else if (Array.isArray(glyphData)) {
                    // Already a point array
                    points = glyphData;
                }
                if (points.length < 2) return { phonemes: [], meta: { source: 'glyph' } };
                return pathToPhonemes(points, { source: 'glyph/' + (opts.glyphName || 'unknown'), normalize: true });
            }

            // ─── Sewing/Textile Pattern Adapter ───
            // Takes pixel grid or stitch path → directional flow
            function fromSewingPattern(pattern, opts) {
                opts = opts || {};
                var points = [];
                if (pattern.stitches) {
                    // Stitch path: [{x,y,type:'knit'|'purl'|'cast'}]
                    points = pattern.stitches;
                } else if (pattern.pixels && Array.isArray(pattern.pixels)) {
                    // Pixel grid → trace active pixels (scanline)
                    pattern.pixels.forEach(function(row, y) {
                        row.forEach(function(px, x) {
                            if (px && (px.isActive || px.color)) {
                                points.push({ x: x, y: y, label: px.color || 'active' });
                            }
                        });
                    });
                } else if (pattern.grid && Array.isArray(pattern.grid)) {
                    // Simple grid: [[0,1,0],[1,1,1]] → points for active cells
                    pattern.grid.forEach(function(row, y) {
                        row.forEach(function(val, x) {
                            if (val) points.push({ x: x, y: y, label: typeof val === 'string' ? val : 'stitch' });
                        });
                    });
                }
                if (points.length < 2) return { phonemes: [], meta: { source: 'sewing' } };
                return pathToPhonemes(points, { source: 'sewing/' + (opts.patternType || 'generic'), normalize: true });
            }

            // ─── Air Writing / Hand Controller Adapter ───
            // Takes 3D hand position stream [{x,y,z,timestamp,gesture}]
            function fromAirWriting(points, opts) {
                opts = opts || {};
                // Project 3D to 2D (front view: x,y or top view: x,z)
                var projection = opts.projection || 'front';
                var projected = points.map(function(p) {
                    return {
                        x: p.x,
                        y: projection === 'top' ? (p.z || 0) : p.y,
                        z: projection === 'top' ? p.y : (p.z || 0),
                        pressure: p.pinchStrength || p.pressure || 0,
                        timestamp: p.timestamp || 0,
                        label: p.gesture || ''
                    };
                });
                return pathToPhonemes(projected, {
                    source: 'airwrite/' + (opts.hand || 'right'),
                    normalize: true
                });
            }

            // ─── Touch Surface Adapter ───
            // Takes Touch/PointerEvent streams
            function fromTouchEvents(events, opts) {
                opts = opts || {};
                var points = events.map(function(e) {
                    return {
                        x: e.clientX || e.x || 0,
                        y: e.clientY || e.y || 0,
                        pressure: e.pressure || e.force || 0,
                        tilt: e.tiltX != null ? Math.sqrt(e.tiltX * e.tiltX + (e.tiltY || 0) * (e.tiltY || 0)) : 0,
                        timestamp: e.timeStamp || e.timestamp || 0
                    };
                });
                return pathToPhonemes(points, {
                    source: 'touch/' + (opts.surface || 'screen'),
                    normalize: opts.normalize !== false
                });
            }

            // ─── Cross-domain similarity search ───
            // Compare a phoneme result against a library of stored patterns
            function compareStrokes(strokeA, strokeB) {
                var dirA = strokeA.directionString || '';
                var dirB = strokeB.directionString || '';
                if (!dirA || !dirB) return 0;
                // Direction distribution cosine similarity
                var distA = strokeA.meta ? strokeA.meta.directionDistribution : {};
                var distB = strokeB.meta ? strokeB.meta.directionDistribution : {};
                var allDirs = new Set(Object.keys(distA).concat(Object.keys(distB)));
                var dotProduct = 0, magA = 0, magB = 0;
                allDirs.forEach(function(d) {
                    var a = distA[d] || 0;
                    var b = distB[d] || 0;
                    dotProduct += a * b;
                    magA += a * a;
                    magB += b * b;
                });
                var cosSim = (magA > 0 && magB > 0) ? dotProduct / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;

                // Complexity similarity
                var cA = strokeA.meta ? strokeA.meta.complexity : 0;
                var cB = strokeB.meta ? strokeB.meta.complexity : 0;
                var complexitySim = 1 - Math.abs(cA - cB);

                // Longest common subsequence of direction string (simplified)
                var lcsLen = 0;
                var shorter = dirA.length < dirB.length ? dirA : dirB;
                var longer = dirA.length < dirB.length ? dirB : dirA;
                var si = 0;
                for (var li = 0; li < longer.length && si < shorter.length; li++) {
                    if (longer[li] === shorter[si]) { lcsLen++; si++; }
                }
                var lcsSim = shorter.length > 0 ? lcsLen / shorter.length : 0;

                return {
                    overall: cosSim * 0.4 + complexitySim * 0.2 + lcsSim * 0.4,
                    directionSimilarity: cosSim,
                    complexitySimilarity: complexitySim,
                    sequenceSimilarity: lcsSim
                };
            }

            // ─── Feed universal stroke into the main Contrails flow ───
            function feedToContrails(strokeResult) {
                if (!strokeResult || !strokeResult.phonemes) return;
                strokeResult.phonemes.forEach(function(p) {
                    flowPath.push(p.dir);
                    totalKeys++;
                    if (p.dir !== lastDir) dirChanges++;
                    lastDir = p.dir;
                });
            }

            // ─── Stroke pattern library (for cross-domain search) ───
            var patternLibrary = [];

            function registerPattern(name, category, strokeResult) {
                patternLibrary.push({
                    name: name,
                    category: category, // 'font', 'animal', 'sewing', 'gesture', 'drawing', 'pet'
                    stroke: strokeResult,
                    registered: Date.now()
                });
            }

            function searchPatterns(queryStroke, opts) {
                opts = opts || {};
                var category = opts.category; // filter by category or null for all
                var minScore = opts.minScore || 0.3;
                var limit = opts.limit || 20;
                var results = [];
                patternLibrary.forEach(function(pat) {
                    if (category && pat.category !== category) return;
                    var sim = compareStrokes(queryStroke, pat.stroke);
                    if (sim.overall >= minScore) {
                        results.push({
                            name: pat.name,
                            category: pat.category,
                            score: sim.overall,
                            details: sim
                        });
                    }
                });
                results.sort(function(a, b) { return b.score - a.score; });
                return results.slice(0, limit);
            }

            return {
                pathToPhonemes: pathToPhonemes,
                fromPoseFrames: fromPoseFrames,
                fromBrushStroke: fromBrushStroke,
                fromGlyphPath: fromGlyphPath,
                fromSewingPattern: fromSewingPattern,
                fromAirWriting: fromAirWriting,
                fromTouchEvents: fromTouchEvents,
                compareStrokes: compareStrokes,
                feedToContrails: feedToContrails,
                registerPattern: registerPattern,
                searchPatterns: searchPatterns,
                quantize: quantize,
                get library() { return patternLibrary; },
            };
        })();

        return {
            active: false, feedKey, feedText, clear, start, stop, getBiometrics,
            get flowPath() { return flowPath; },
            searchByGesture: searchByGesture,
            gestureToSymbol: gestureToSymbol,
            VR_KEYBOARD: VR_KEYBOARD,
            UniversalStroke: UniversalStroke,
        };
    })();

    window.ctClear = function() { if (window.Contrails) window.Contrails.clear(); };

    // ══════════════════ GESTURE SEARCH + XR SESSION ══════════════════
    window.appendGesture = function(arrow) {
        var el = document.getElementById('ct-gesture-input');
        if (el) el.value += arrow;
    };

    window.runGestureSearch = function() {
        var el = document.getElementById('ct-gesture-input');
        var resultsEl = document.getElementById('ct-gesture-results');
        if (!el || !resultsEl) return;
        var seq = el.value.trim();
        if (seq.length < 2) { resultsEl.innerHTML = '<span style="color:#484f58;">Enter at least 2 direction symbols</span>'; return; }
        var mode = (document.getElementById('ct-gesture-mode') || {}).value || 'flow';
        var results = [];
        if (mode === 'flow' && window.Contrails && window.Contrails.searchByGesture) {
            results = window.Contrails.searchByGesture(seq);
        } else if ((mode === 'asl' || mode === 'bsl') && window.StenoEngine) {
            // Search concept atoms by letter/sign
            var letter = seq[0].toLowerCase();
            var atomResults = window.StenoEngine.allAtomAlphabets().filter(function(a) {
                if (mode === 'asl') return a.asl && a.asl.some(function(s) { return s.letter === letter; });
                return a.bsl && a.bsl.some(function(s) { return s.letter === letter; });
            });
            results = atomResults.map(function(a) {
                return { word: a.name, capsule: 'StenoEngine', flowArrows: a.keyFlow, efficiency: '-', match: mode.toUpperCase() + ' sign: ' + letter };
            });
        } else if (mode === 'dance' && window.Encoder) {
            // Search by dance notation substring
            var CapsAn = window.CapsuleAnalyzer;
            if (CapsAn) {
                var lib = CapsAn.getLibrary();
                if (lib && lib.capsules) {
                    lib.capsules.forEach(function(cap) {
                        cap.words.forEach(function(w) {
                            if (w.danceNotation && w.danceNotation.indexOf(seq) !== -1) {
                                results.push({ word: w.word, capsule: cap.capsule, flowArrows: w.flowArrows || '', efficiency: w.efficiency, match: 'dance' });
                            }
                        });
                    });
                }
            }
        }
        if (results.length === 0) {
            resultsEl.innerHTML = '<span style="color:#484f58;">No matching words found for "' + seq + '"</span>';
            return;
        }
        resultsEl.innerHTML = results.slice(0, 20).map(function(r) {
            return '<div style="padding:4px 6px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #161b22;">' +
                '<span style="color:#e6edf3;font-weight:700;">' + r.word + '</span>' +
                '<span style="color:#484f58;">' + r.capsule + '</span>' +
                '<span style="color:#a78bfa;">' + (r.flowArrows || '') + '</span>' +
                (r.efficiency !== '-' ? '<span style="color:#fbbf24;">' + r.efficiency + '%</span>' : '') +
                '<span style="color:#58a6ff;font-size:.5625rem;">' + r.match + '</span>' +
                '</div>';
        }).join('');
    };

    window.initXRSession = function() {
        var statusEl = document.getElementById('ct-xr-status');
        if (!navigator.xr) {
            if (statusEl) statusEl.textContent = 'WebXR not available';
            statusEl.style.color = '#f85149';
            return;
        }
        navigator.xr.isSessionSupported('immersive-vr').then(function(supported) {
            if (!supported) {
                if (statusEl) { statusEl.textContent = 'VR not supported on this device'; statusEl.style.color = '#d4a017'; }
                return;
            }
            navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['hand-tracking'] }).then(function(session) {
                if (statusEl) { statusEl.textContent = 'XR Connected \u2714'; statusEl.style.color = '#3fb950'; }
                session.addEventListener('inputsourceschange', function(e) {
                    e.added.forEach(function(src) {
                        if (src.hand) {
                            var handEl = document.getElementById(src.handedness === 'left' ? 'ct-xr-left' : 'ct-xr-right');
                            if (handEl) handEl.textContent = src.handedness + ' hand tracked';
                        }
                    });
                });
                session.requestAnimationFrame(function xrFrame(t, frame) {
                    // Process hand input each frame
                    for (var src of session.inputSources) {
                        if (src.hand && window.Contrails && window.Contrails.VR_KEYBOARD) {
                            var result = window.Contrails.VR_KEYBOARD.processXRHand(src.hand, src.handedness);
                            if (result && result.isPress) {
                                window.Contrails.feedKey(result.key, true);
                                var handEl = document.getElementById(src.handedness === 'left' ? 'ct-xr-left' : 'ct-xr-right');
                                if (handEl) handEl.textContent = result.key.toUpperCase() + ' [' + result.gesture + ']';
                            }
                        }
                    }
                    session.requestAnimationFrame(xrFrame);
                });
            }).catch(function(err) {
                if (statusEl) { statusEl.textContent = 'XR Error: ' + err.message; statusEl.style.color = '#f85149'; }
            });
        });
    };

    // ══════════════════ LATTICE MULTI-ALPHABET + GESTURE SEARCH ══════════════════
    window.highlightLatticeNode = function() {
        var searchEl = document.getElementById('lattice-search');
        if (!searchEl) return;
        var query = searchEl.value.trim().toLowerCase();
        // Highlight nodes matching the search
        var cv = document.getElementById('cv-lattice');
        if (!cv) return;
        var ctx = cv.getContext('2d');
        // Re-render will pick up the highlight — store it
        window._latticeHighlight = query;
        // Force re-render by dispatching resize
        window.dispatchEvent(new Event('resize'));
    };

    // Wire lattice alphabet selector
    (function() {
        var sel = document.getElementById('lattice-alphabet');
        if (!sel) return;
        sel.addEventListener('change', function() {
            window._latticeAlphabetMode = sel.value;
            var nameEl = document.getElementById('lattice-alphabet-name');
            if (nameEl) nameEl.textContent = sel.options[sel.selectedIndex].text;
            window.dispatchEvent(new Event('resize'));
        });
    })();

    // ══════════════════ SYMBOL LAB TAB ══════════════════
    (function(){
        const SCRIPTS = {
            latin: { name: 'Latin', range: [0x0041, 0x024F], dir: 'LTR', sample: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
            cyrillic: { name: 'Cyrillic', range: [0x0400, 0x04FF], dir: 'LTR', sample: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' },
            arabic: { name: 'Arabic', range: [0x0600, 0x06FF], dir: 'RTL', sample: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي' },
            devanagari: { name: 'Devanagari', range: [0x0900, 0x097F], dir: 'LTR', sample: 'अआइईउऊएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह' },
            hangul: { name: 'Hangul', range: [0xAC00, 0xD7AF], dir: 'LTR', sample: '가나다라마바사아자차카타파하' },
            kanji: { name: 'Kanji/CJK', range: [0x4E00, 0x9FFF], dir: 'LTR', sample: '一二三四五六七八九十百千万' },
            hiragana: { name: 'Hiragana', range: [0x3040, 0x309F], dir: 'LTR', sample: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' },
            greek: { name: 'Greek', range: [0x0370, 0x03FF], dir: 'LTR', sample: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ' },
            hebrew: { name: 'Hebrew', range: [0x0590, 0x05FF], dir: 'RTL', sample: 'אבגדהוזחטיכלמנסעפצקרשת' },
            thai: { name: 'Thai', range: [0x0E00, 0x0E7F], dir: 'LTR', sample: 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ' },
            tamil: { name: 'Tamil', range: [0x0B80, 0x0BFF], dir: 'LTR', sample: 'அஆஇஈஉஊஎஏஐஒஓஔககாகிகீகுகூ' },
            georgian: { name: 'Georgian', range: [0x10A0, 0x10FF], dir: 'LTR', sample: 'ᲐᲑᲒᲓᲔᲕᲖᲗᲘᲙᲚᲛᲜᲝᲞᲟᲠᲡᲢᲣᲤᲥᲦᲧᲨᲩᲪᲫᲬᲭᲮᲯᲰ' },
            armenian: { name: 'Armenian', range: [0x0530, 0x058F], dir: 'LTR', sample: 'ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉdelays' },
        };

        const symInput = document.getElementById('sym-input');
        const symAnalysis = document.getElementById('sym-analysis');
        const symPatterns = document.getElementById('sym-patterns');
        const symProps = document.getElementById('sym-props');
        const symScript = document.getElementById('sym-script');
        if (!symInput) return;

        function analyze() {
            const text = symInput.value;
            if (!text) { symAnalysis.textContent = 'Type or paste characters to analyze...'; symPatterns.textContent = ''; symProps.textContent = ''; return; }

            // Unicode analysis
            const chars = [...text];
            const points = chars.map(ch => {
                const cp = ch.codePointAt(0);
                return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0') + ' ' + ch;
            });
            symAnalysis.innerHTML = points.slice(0, 30).map(p => '<div>' + p + '</div>').join('');

            // Pattern recognition
            const scriptCounts = {};
            chars.forEach(ch => {
                const cp = ch.codePointAt(0);
                for (const [id, s] of Object.entries(SCRIPTS)) {
                    if (cp >= s.range[0] && cp <= s.range[1]) { scriptCounts[id] = (scriptCounts[id] || 0) + 1; break; }
                }
            });
            const patternHtml = Object.entries(scriptCounts).map(([id, c]) =>
                '<div>' + SCRIPTS[id].name + ': ' + c + ' chars (' + Math.round(c / chars.length * 100) + '%)</div>'
            ).join('');
            symPatterns.innerHTML = patternHtml || '<div>No recognized scripts</div>';
            symPatterns.innerHTML += '<div style="margin-top:4px;color:#484f58;">Total: ' + chars.length + ' characters, ' + Object.keys(scriptCounts).length + ' scripts</div>';
        }

        symInput.addEventListener('input', analyze);
        symScript.addEventListener('change', () => {
            const s = SCRIPTS[symScript.value];
            if (s) {
                symInput.value = s.sample;
                symInput.dir = s.dir === 'RTL' ? 'rtl' : 'ltr';
                symProps.innerHTML = '<div>Script: ' + s.name + '</div><div>Direction: ' + s.dir + '</div><div>Unicode range: U+' + s.range[0].toString(16).toUpperCase() + ' - U+' + s.range[1].toString(16).toUpperCase() + '</div><div>Block size: ' + (s.range[1] - s.range[0]) + ' code points</div><div>Sample: ' + s.sample.length + ' characters</div>';
                analyze();
            }
        });
        // Init with latin
        symScript.dispatchEvent(new Event('change'));
    })();

    // ══════════════════ LATTICE TAB ══════════════════
    (function(){
        const cv = document.getElementById('cv-lattice');
        if (!cv) return;
        const ctx = cv.getContext('2d');
        let animating = false, animId = null;
        let rotX = 0.3, rotY = 0.5, rotZ = 0;
        let dragging = false, lastMX = 0, lastMY = 0;
        const nodes = [];
        const edges = [];
        const tunnels = [];

        function buildLattice() {
            nodes.length = 0; edges.length = 0; tunnels.length = 0;
            const layout = window.kbatch ? window.kbatch.layouts[window.kbatch.activeLayout] : null;
            if (!layout) return;
            const rows = layout.rows || [];
            rows.forEach((row, ri) => {
                [...row].forEach((ch, ci) => {
                    if (ch === ' ') return;
                    nodes.push({ ch: ch, x: (ci - row.length / 2) * 1.2, y: (ri - rows.length / 2) * 1.5, z: Math.sin(ci * 0.5 + ri) * 0.8, color: '#58a6ff' });
                });
            });
            // Build edges between adjacent nodes
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
                    if (Math.sqrt(dx * dx + dy * dy) < 2.0) edges.push([i, j]);
                }
            }
            // Quantum tunnels (random long-range connections)
            for (let i = 0; i < Math.min(nodes.length / 3, 10); i++) {
                const a = Math.floor(Math.random() * nodes.length);
                const b = Math.floor(Math.random() * nodes.length);
                if (a !== b) tunnels.push([a, b]);
            }
            document.getElementById('lattice-nodes').textContent = nodes.length;
            document.getElementById('lattice-edges').textContent = edges.length;
            document.getElementById('lattice-tunnels').textContent = tunnels.length;
        }

        function project(x, y, z) {
            // Rotate
            let x1 = x, y1 = y * Math.cos(rotX) - z * Math.sin(rotX), z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
            let x2 = x1 * Math.cos(rotY) + z1 * Math.sin(rotY), y2 = y1, z2 = -x1 * Math.sin(rotY) + z1 * Math.cos(rotY);
            const scale = 40 / (z2 + 6);
            return { sx: cv.width / 2 + x2 * scale * 30, sy: cv.height / 2 + y2 * scale * 30, depth: z2 };
        }

        function render() {
            cv.width = cv.parentElement.offsetWidth - 24;
            cv.height = cv.parentElement.offsetHeight - 60;
            ctx.fillStyle = '#050810'; ctx.fillRect(0, 0, cv.width, cv.height);
            if (nodes.length === 0) { ctx.fillStyle = '#484f58'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText('Loading lattice...', cv.width / 2, cv.height / 2); return; }
            const projected = nodes.map(n => project(n.x, n.y, n.z));
            // Edges
            edges.forEach(([a, b]) => {
                const pa = projected[a], pb = projected[b];
                ctx.strokeStyle = 'rgba(88,166,255,0.15)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy); ctx.stroke();
            });
            // Tunnels
            const t = Date.now() / 1000;
            tunnels.forEach(([a, b]) => {
                const pa = projected[a], pb = projected[b];
                ctx.strokeStyle = 'rgba(210,168,255,' + (0.2 + 0.2 * Math.sin(t * 2)) + ')';
                ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy); ctx.stroke();
                ctx.setLineDash([]);
            });
            // Nodes (sorted by depth) — multi-alphabet + gesture highlight
            var alphaMode = window._latticeAlphabetMode || 'key';
            var highlight = window._latticeHighlight || '';
            var Enc = window.Encoder;
            var BRAILLE_MAP = {'a':'\u2801','b':'\u2803','c':'\u2809','d':'\u2819','e':'\u2811','f':'\u280B','g':'\u281B','h':'\u2813','i':'\u280A','j':'\u281A','k':'\u2805','l':'\u2807','m':'\u280D','n':'\u281D','o':'\u2815','p':'\u280F','q':'\u281F','r':'\u2817','s':'\u280E','t':'\u281E','u':'\u2825','v':'\u2827','w':'\u283A','x':'\u282D','y':'\u283D','z':'\u2835'};
            var MORSE_MAP = {'a':'.-','b':'-...','c':'-.-.','d':'-..','e':'.','f':'..-.','g':'--.','h':'....','i':'..','j':'.---','k':'-.-','l':'.-..','m':'--','n':'-.','o':'---','p':'.--.','q':'--.-','r':'.-.','s':'...','t':'-','u':'..-','v':'...-','w':'.--','x':'-..-','y':'-.--','z':'--..'};
            var MUSIC_MAP = Enc && Enc.keyToNote ? null : {'q':'C4','w':'D4','e':'E4','r':'F4','t':'G4','y':'A4','u':'B4','i':'C5','o':'D5','p':'E5','a':'F3','s':'G3','d':'A3','f':'B3','g':'C3','h':'D3','j':'E3','k':'F3','l':'G3'};
            const sorted = projected.map((p, i) => ({ ...p, i })).sort((a, b) => a.depth - b.depth);
            sorted.forEach(p => {
                const n = nodes[p.i];
                const isHighlighted = highlight && n.ch.toLowerCase().indexOf(highlight) !== -1;
                const r = Math.max(3, (isHighlighted ? 12 : 8) - p.depth * 1.5);
                ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
                ctx.fillStyle = isHighlighted ? '#fbbf24' : n.color + (animating ? Math.round(180 + 75 * Math.sin(t * 3 + p.i)).toString(16) : 'cc');
                ctx.fill();
                if (isHighlighted) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke(); }
                if (r > 4) {
                    ctx.fillStyle = isHighlighted ? '#fff' : '#e6edf3'; ctx.textAlign = 'center';
                    var label = n.ch;
                    var chLow = n.ch.toLowerCase();
                    if (alphaMode === 'braille') label = BRAILLE_MAP[chLow] || n.ch;
                    else if (alphaMode === 'morse') { label = MORSE_MAP[chLow] || n.ch; ctx.font = Math.max(5, r * 0.7) + 'px monospace'; }
                    else if (alphaMode === 'asl') label = chLow.toUpperCase() + '\u2191'; // simple ASL indicator
                    else if (alphaMode === 'bsl') label = chLow.toUpperCase() + '\u270B'; // BSL indicator
                    else if (alphaMode === 'musical') label = (Enc && Enc.keyToNote ? Enc.keyToNote(chLow) : (MUSIC_MAP && MUSIC_MAP[chLow]) || n.ch);
                    if (alphaMode !== 'morse') ctx.font = Math.max(6, r) + 'px monospace';
                    ctx.fillText(label, p.sx, p.sy + r + 10);
                }
            });
            // Update layout name
            var lnEl = document.getElementById('lattice-layout-name');
            if (lnEl) { var lay = window.kbatch ? window.kbatch.layouts[window.kbatch.activeLayout] : null; lnEl.textContent = lay ? lay.name : '—'; }
            document.getElementById('lattice-rot').textContent = rotX.toFixed(2) + ',' + rotY.toFixed(2) + ',' + rotZ.toFixed(2);
        }

        function animate() {
            if (!animating) return;
            rotY += 0.005; rotX += 0.002;
            render();
            animId = requestAnimationFrame(animate);
        }

        // Mouse drag rotation
        cv.addEventListener('mousedown', e => { dragging = true; lastMX = e.clientX; lastMY = e.clientY; cv.style.cursor = 'grabbing'; });
        window.addEventListener('mouseup', () => { dragging = false; cv.style.cursor = 'grab'; });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            rotY += (e.clientX - lastMX) * 0.01;
            rotX += (e.clientY - lastMY) * 0.01;
            lastMX = e.clientX; lastMY = e.clientY;
            if (!animating) render();
        });

        document.getElementById('lattice-reset').onclick = () => { rotX = 0.3; rotY = 0.5; rotZ = 0; render(); };
        document.getElementById('lattice-animate').onclick = () => {
            animating = !animating;
            document.getElementById('lattice-animate').textContent = animating ? 'Stop' : 'Animate';
            if (animating) animate(); else if (animId) cancelAnimationFrame(animId);
        };

        // Build on tab switch
        const observer = new MutationObserver(() => {
            if (document.getElementById('panel-lattice').classList.contains('active')) {
                buildLattice(); render();
            }
        });
        observer.observe(document.getElementById('panel-lattice'), { attributes: true, attributeFilter: ['class'] });
        buildLattice();
    })();

    // ══════════════════ CODE CELL ══════════════════
    (function(){
        const codeInput = document.getElementById('code-input');
        const codeOutput = document.getElementById('code-output');
        function appendOutput(text, cls = 'out-line') {
            const div = document.createElement('div');
            div.className = cls; div.textContent = text;
            codeOutput.appendChild(div); codeOutput.scrollTop = codeOutput.scrollHeight;
        }
        function runCode() {
            const code = codeInput.value;
            if (!code.trim()) return;
            appendOutput('\u25b6 Running...', 'out-info');
            const origLog = console.log, origWarn = console.warn, origError = console.error;
            const logs = [];
            console.log = (...a) => { logs.push({t:'log',m:a.map(String).join(' ')}); origLog(...a); };
            console.warn = (...a) => { logs.push({t:'warn',m:a.map(String).join(' ')}); origWarn(...a); };
            console.error = (...a) => { logs.push({t:'error',m:a.map(String).join(' ')}); origError(...a); };
            try {
                const result = eval(code);
                logs.forEach(l => appendOutput(l.m, l.t==='error'?'out-error':l.t==='warn'?'out-info':'out-line'));
                if (result !== undefined) appendOutput('\u2192 ' + String(result), 'out-result');
            } catch (e) {
                logs.forEach(l => appendOutput(l.m, 'out-line'));
                appendOutput('Error: ' + e.message, 'out-error');
            }
            console.log = origLog; console.warn = origWarn; console.error = origError;
        }
        document.getElementById('code-run').addEventListener('click', runCode);
        document.getElementById('code-clear').addEventListener('click', () => { codeInput.value = ''; });
        document.getElementById('output-clear').addEventListener('click', () => { codeOutput.innerHTML = ''; });
        codeInput.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); }
            e.stopPropagation();
        });
        document.getElementById('code-example').addEventListener('click', () => {
            codeInput.value = `// Analyze with quantum circuit
kbatch.processText('the quick brown fox jumps over the lazy dog');
console.log('Layout:', kbatch.activeLayout);
console.log('WPM:', kbatch.state.wpm.toFixed(1));

// Build quantum circuit from typing pattern
const qasm = kbatch.quantum.buildFromTyping();
console.log('\\nCircuit preview:');
console.log(qasm.split('\\n').slice(0, 8).join('\\n'));

// Run local quantum simulation
const result = kbatch.quantum.simulate(1024);
const top3 = Object.entries(result).sort((a,b) => b[1]-a[1]).slice(0,3);
console.log('\\nTop 3 quantum states:');
top3.forEach(([s,c]) => console.log('  |' + s + '⟩: ' + (c/1024*100).toFixed(1) + '%'));

// Compare layouts
['qwerty','dvorak','colemak'].forEach(id => {
    kbatch.setLayout(id);
    const a = kbatch.analyze('quantum');
    console.log(id + ': eff=' + a.efficiency.toFixed(0) + '% dist=' + a.distance.toFixed(2));
});
kbatch.setLayout('qwerty');`;
        });
        document.getElementById('code-sync').addEventListener('click', () => {
            appendOutput('\u2500\u2500 kbatch State \u2500\u2500', 'out-info');
            appendOutput(kbatch.exportJSON(), 'out-result');
        });
        document.getElementById('code-panel-toggle').addEventListener('click', () => {
            document.getElementById('code-panel-body').classList.toggle('collapsed');
        });
    })();

    // ══════════════════ TERMINAL ══════════════════
    (function(){
        const termOutput = document.getElementById('term-output');
        const termInput = document.getElementById('term-input');
        const termHistory = [];
        let historyIdx = -1;
        const CODESTRAL_SCHEMA_TEMPLATES = {
            simple_response: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    confidence: { type: "number" }
                },
                required: ["summary", "confidence"],
                additionalProperties: false
            },
            structured_data: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    language: { type: "string" },
                    entities: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                category: { type: "string" },
                                score: { type: "number" }
                            },
                            required: ["name", "category", "score"],
                            additionalProperties: false
                        }
                    },
                    decisions: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["title", "language", "entities", "decisions"],
                additionalProperties: false
            },
            classification: {
                type: "object",
                properties: {
                    label: { type: "string" },
                    score: { type: "number" },
                    rationale: { type: "string" }
                },
                required: ["label", "score", "rationale"],
                additionalProperties: false
            },
            entity_extraction: {
                type: "object",
                properties: {
                    entities: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                text: { type: "string" },
                                type: { type: "string" },
                                start: { type: "integer" },
                                end: { type: "integer" }
                            },
                            required: ["text", "type", "start", "end"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["entities"],
                additionalProperties: false
            }
        };

        function escapeHtml(s) {
            return String(s || "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;");
        }

        function downloadJson(filename, payload) {
            var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            return filename;
        }

        function buildMistralBenchCommand(packetFile, opts) {
            var o = opts || {};
            var cmd = [
                "node qbit/tools/mistral-vibe-bench.js",
                "--packet \"" + String(packetFile || "kbatch-codestral-structured_data-<ts>.json") + "\"",
                "--cmd " + String(o.cmd || "mistral"),
                "--arg vibe --arg run --arg --model --arg " + String(o.model || "codestral-latest"),
                "--runs " + String(o.runs || 3)
            ];
            if (o.promptArg) cmd.push("--prompt-arg");
            return cmd.join(" ");
        }

        var KB_VENDOR_CACHE = null;
        var KB_VENDOR_ENDPOINTS = [
            "qbit/tools/vendor-profiles.json",
            "../qbit/tools/vendor-profiles.json",
            "/qbit/tools/vendor-profiles.json"
        ];
        var KB_VENDOR_FALLBACK = {
            providers: [
                { id: "openai", api_base: "https://api.openai.com/v1", api_key_env: "OPENAI_API_KEY" },
                { id: "mistral", api_base: "https://api.mistral.ai/v1", api_key_env: "MISTRAL_API_KEY" },
                { id: "groq", api_base: "https://api.groq.com/openai/v1", api_key_env: "GROQ_API_KEY" },
                { id: "together", api_base: "https://api.together.xyz/v1", api_key_env: "TOGETHER_API_KEY" },
                { id: "fireworks", api_base: "https://api.fireworks.ai/inference/v1", api_key_env: "FIREWORKS_API_KEY" },
                { id: "openrouter", api_base: "https://openrouter.ai/api/v1", api_key_env: "OPENROUTER_API_KEY" },
                { id: "hf", api_base: "https://router.huggingface.co/v1", api_key_env: "HF_TOKEN" },
                { id: "ollama", api_base: "http://127.0.0.1:11434/v1", api_key_env: "" },
                { id: "vllm", api_base: "http://127.0.0.1:8000/v1", api_key_env: "" },
                { id: "lmstudio", api_base: "http://127.0.0.1:1234/v1", api_key_env: "" }
            ],
            qbitos_paths: { models_root: "/Volumes/qbitOS/03.models", vllm_repo: "/Volumes/qbitOS/vllm-main" }
        };
        async function loadVendorProfiles(force) {
            if (!force && KB_VENDOR_CACHE) return KB_VENDOR_CACHE;
            for (var i = 0; i < KB_VENDOR_ENDPOINTS.length; i++) {
                try {
                    var res = await fetch(KB_VENDOR_ENDPOINTS[i], { cache: "no-cache" });
                    if (!res.ok) continue;
                    var doc = await res.json();
                    KB_VENDOR_CACHE = doc;
                    return doc;
                } catch (_) {}
            }
            KB_VENDOR_CACHE = KB_VENDOR_FALLBACK;
            return KB_VENDOR_CACHE;
        }
        function buildVendorBenchCommand(packetFile, providerId, modelId) {
            var p = String(providerId || "").trim().toLowerCase();
            var packet = String(packetFile || "kbatch-codestral-structured_data-<ts>.json");
            if (p === "lms" || p === "lmstudio") {
                return 'node qbit/tools/mistral-vibe-bench.js --packet "' + packet + '" --cmd lms --arg chat --arg ' + String(modelId || "mistralai/ministral-3-3b") + ' --arg --prompt --prompt-arg --runs 3';
            }
            if (p === "mistral-cli") {
                return 'node qbit/tools/mistral-vibe-bench.js --packet "' + packet + '" --cmd mistral --arg vibe --arg run --arg --model --arg ' + String(modelId || "codestral-latest") + ' --runs 3';
            }
            var noAuth = (p === "vllm" || p === "ollama" || p === "lmstudio");
            var cmd = 'node qbit/tools/mistral-vibe-bench.js --packet "' + packet + '" --provider ' + p + ' --api-model ' + String(modelId || "<model-id>") + ' --runs 3';
            if (noAuth) cmd += " --api-no-auth";
            return cmd;
        }
        function printVendorBenchCommands(packetFile, modelId, title) {
            var vendPacket = packetFile || window._kbLastCodestralExportFile || "kbatch-codestral-structured_data-<ts>.json";
            var vendModel = String(modelId || "").trim();
            return loadVendorProfiles().then(function(doc) {
                var providers = (doc && Array.isArray(doc.providers)) ? doc.providers : [];
                if (!providers.length) providers = KB_VENDOR_FALLBACK.providers.slice();
                termPrint('─── ' + escapeHtml(title || 'vendorbench provider commands') + ' ───', 'info');
                termPrint('packet=' + escapeHtml(vendPacket), 'result');
                providers.forEach(function(p) {
                    var pid = String((p && p.id) || "").toLowerCase();
                    if (!pid) return;
                    var cmdLine = buildVendorBenchCommand(vendPacket, pid, vendModel || "<model-id>");
                    termPrint('<b style="color:#58a6ff;">' + escapeHtml(pid) + '</b>');
                    termPrint('<pre>' + escapeHtml(cmdLine) + '</pre>', 'result');
                });
                var qbitos = doc && doc.qbitos_paths ? doc.qbitos_paths : null;
                if (qbitos) {
                    termPrint('qbitOS paths:', 'info');
                    if (qbitos.models_root) termPrint('models=' + escapeHtml(String(qbitos.models_root)));
                    if (qbitos.vllm_repo) termPrint('vllm=' + escapeHtml(String(qbitos.vllm_repo)));
                }
                return {
                    packetFile: vendPacket,
                    providers: providers.map(function(p) { return String((p && p.id) || "").toLowerCase(); }).filter(Boolean),
                    qbitos_paths: qbitos || {}
                };
            });
        }

        function exportCodestralPacketForBench(text, mode) {
            var packet = buildCodestralPacket(text || "", mode || "structured_data");
            var file = "kbatch-codestral-" + packet.mode + "-" + Date.now() + ".json";
            downloadJson(file, packet);
            window._kbLastCodestralPacket = packet;
            window._kbLastCodestralExportFile = file;
            window._kbLastMistralBenchCmd = buildMistralBenchCommand(file);
            return { packet: packet, file: file, cmd: window._kbLastMistralBenchCmd };
        }

        function buildCodestralPacket(text, mode) {
            var src = String(text || ((document.getElementById("typing-input") || {}).value || ""));
            var chosenMode = mode || "structured_data";
            if (!CODESTRAL_SCHEMA_TEMPLATES[chosenMode]) chosenMode = "structured_data";
            var bench = window.kbatch && window.kbatch.stack ? window.kbatch.stack.benchmark(src) : null;
            var caps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(src, 8) : [];
            var capsuleCtx = (caps || []).slice(0, 5).map(function(c) {
                return {
                    id: c.id,
                    name: c.name,
                    category: c.cat,
                    words: (c.words || []).slice(0, 12)
                };
            });
            var contrailInjection = buildContrailInjection(src, capsuleCtx, bench);
            var personaOutline = buildPersonaOutlineContext(src, capsuleCtx, bench, contrailInjection);
            var provenance = buildHomeProvenance("codestral.packet", src);
            var packet = {
                version: "0.1.0",
                source: "kbatch.codestral",
                mode: chosenMode,
                schema: CODESTRAL_SCHEMA_TEMPLATES[chosenMode],
                input: {
                    text: src,
                    language: "text",
                    capsules: capsuleCtx,
                    stack: bench || null,
                    contrail: contrailInjection,
                    persona: personaOutline
                },
                prompts: {
                    system: "You are a strict structured-output coding/data assistant. Return valid JSON matching the provided schema only.\nContrail prompt language: " + contrailInjection.promptLanguage + "\nPersona prompt language: " + personaOutline.promptLanguage + "\nAlways include reasoning alignment with the blockized runtime context: DAC, Iron Line, quantum gutter, prefixes, and preflight readiness.",
                    user: "Analyze the provided kbatch input + capsule context + contrail typing profile and return only JSON for the schema."
                },
                provenance: provenance,
                ts: Date.now()
            };
            return packet;
        }

        var DEFAULT_CONTRAIL_PROMPT_LANGUAGE = "Map keyboard contrails to code-intent primitives: flow arrows for control, turns for branch depth, cadence for loop pressure, and capsule overlap for domain injection.";
        var DEFAULT_PERSONA_PROMPT_LANGUAGE = "Fuse persona layers with musica cadence and capsule priors. Keep blockized context from DAC, Iron Line, quantum gutter, prefixes, and preflight visible for search/history reasoning.";
        function getContrailPromptLanguage() {
            if (typeof window !== "undefined" && window._kbatchContrailPromptLanguage) return String(window._kbatchContrailPromptLanguage);
            return DEFAULT_CONTRAIL_PROMPT_LANGUAGE;
        }
        function setContrailPromptLanguage(text) {
            var next = String(text || "").trim();
            if (!next) next = DEFAULT_CONTRAIL_PROMPT_LANGUAGE;
            window._kbatchContrailPromptLanguage = next;
            return next;
        }
        function getPersonaPromptLanguage() {
            if (typeof window !== "undefined" && window._kbatchPersonaPromptLanguage) return String(window._kbatchPersonaPromptLanguage);
            return DEFAULT_PERSONA_PROMPT_LANGUAGE;
        }
        function setPersonaPromptLanguage(text) {
            var next = String(text || "").trim();
            if (!next) next = DEFAULT_PERSONA_PROMPT_LANGUAGE;
            window._kbatchPersonaPromptLanguage = next;
            return next;
        }
        function captureTypedContrailTrace(limit) {
            var n = Math.max(8, parseInt(limit || 64, 10) || 64);
            var transitions = window.kbatch && window.kbatch.transitions ? window.kbatch.transitions() : [];
            return transitions.slice(-n).map(function(t) { return dirSymbol(t.dx, t.dy); }).join("");
        }
        function normalizeContrailSeq(seq) {
            return String(seq || "").replace(/[^↗↘↖↙→←↑↓·?]/g, "");
        }
        function contrailOverlapScore(a, b) {
            var x = normalizeContrailSeq(a);
            var y = normalizeContrailSeq(b);
            if (!x || !y) return 0;
            var grams = function(s) {
                var g = Object.create(null);
                for (var i = 0; i < s.length - 1; i++) {
                    var k = s.slice(i, i + 2);
                    g[k] = (g[k] || 0) + 1;
                }
                return g;
            };
            var g1 = grams(x);
            var g2 = grams(y);
            var hit = 0;
            var total = 0;
            Object.keys(g1).forEach(function(k) {
                total += g1[k];
                if (g2[k]) hit += Math.min(g1[k], g2[k]);
            });
            if (!total) return 0;
            return Math.round((hit / total) * 1000) / 10;
        }
        function buildContrailInjection(text, capsuleCtx, bench) {
            var src = String(text || "");
            var typed = captureTypedContrailTrace(80);
            var flow = window.Encoder && window.Encoder.toKeyboardFlow ? window.Encoder.toKeyboardFlow(src) : null;
            var rhythm = window.Encoder && window.Encoder.toRhythm ? window.Encoder.toRhythm(src) : null;
            return {
                promptLanguage: getContrailPromptLanguage(),
                typedTrace: typed,
                flowArrows: flow && flow.arrows ? flow.arrows : "",
                flowPattern: flow && flow.pattern ? flow.pattern : "",
                rhythmBpm: rhythm && rhythm.bpm ? rhythm.bpm : 0,
                musica: bench && bench.contrail ? (bench.contrail.musica || "") : "",
                capsuleSignals: (capsuleCtx || []).map(function(c) {
                    return { id: c.id, category: c.category, words: (c.words || []).slice(0, 6) };
                })
            };
        }
        function buildPersonaOutlineContext(text, capsuleCtx, bench, contrailInjection) {
            var src = String(text || "");
            var personaSummary = window.kbatch && window.kbatch.persona && window.kbatch.persona.summary
                ? window.kbatch.persona.summary()
                : (window.PersonaContext && window.PersonaContext.getPersonaSummary ? window.PersonaContext.getPersonaSummary() : null);
            var financial = window.kbatch && window.kbatch.persona && window.kbatch.persona.financial
                ? window.kbatch.persona.financial(src)
                : null;
            var therapeutic = window.kbatch && window.kbatch.persona && window.kbatch.persona.therapeutic
                ? window.kbatch.persona.therapeutic(src)
                : null;
            var topCaps = (capsuleCtx || []).slice(0, 3).map(function(c) {
                return { id: c.id, category: c.category, words: (c.words || []).slice(0, 8) };
            });
            return {
                promptLanguage: getPersonaPromptLanguage(),
                summary: personaSummary || null,
                musicaPrompt: {
                    notation: bench && bench.contrail ? (bench.contrail.musica || "") : "",
                    codeStyleAsMusic: bench ? (bench.codeStyleAsMusic || "") : "",
                    bpm: bench && bench.musicaEngine ? bench.musicaEngine.bpm : 0,
                    qBPM: bench && bench.musicaEngine ? bench.musicaEngine.qBPM : 0,
                    qHz: bench && bench.musicaEngine ? bench.musicaEngine.qHz : 0
                },
                capsulePrompt: {
                    matches: topCaps,
                    matchedCount: bench && bench.capsules ? bench.capsules.matched : topCaps.length
                },
                blockizedRuntime: {
                    dac: !!(window.prefixDAC || window.qbitCodec),
                    ironLine: true,
                    quantumGutterCoverage: bench ? Number((bench.quantumGutterCoverage || 0).toFixed(2)) : 0,
                    prefixes: !!window.QuantumPrefixes,
                    preflight: !!window.QbitPreflight,
                    t5Lane: bench ? String(bench.t5 || "unknown") : "unknown",
                    stenoRoundTrip: !!(bench && bench.stenoRoundTrip),
                    codecRoundTrip: !!(bench && bench.codecRoundTrip)
                },
                searchHistoryHints: {
                    queryTerms: topCaps.flatMap(function(c) { return (c.words || []).slice(0, 4); }).slice(0, 12),
                    contrailFlow: contrailInjection ? (contrailInjection.flowPattern || contrailInjection.typedTrace || "") : "",
                    financial: financial || null,
                    therapeutic: therapeutic || null
                }
            };
        }
        var PERSONA_FRAMEWORKS = [
            "big5",
            "jungian-archetypes",
            "motivational-drives",
            "somatic-signals",
            "therapeutic-context",
            "cognitive-behavioral-patterns",
            "socio-linguistic-register"
        ];
        var PERSONA_PSYCHOLOGICAL_FRAMEWORKS = {
            big_five: {
                id: "ffm-ocean",
                traits: ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"],
                role: "primary quantitative personality baseline"
            },
            hexaco: {
                id: "hexaco",
                traits: ["honesty_humility", "emotionality", "extraversion", "agreeableness", "conscientiousness", "openness"],
                role: "ethical and trust-oriented nuance layer"
            },
            mbti: {
                id: "mbti",
                dimensions: ["introversion_extraversion", "sensing_intuition", "thinking_feeling", "judging_perceiving"],
                role: "interaction style and communication preferences"
            },
            dark_triad: {
                id: "dark_triad",
                traits: ["machiavellianism", "psychopathy", "narcissism"],
                role: "manipulation and adversarial behavior risk profiling"
            }
        };
        var PERSONA_DATA_SOURCE_TYPES = [
            "natural_language_data",
            "interviews_and_questionnaires",
            "behavioral_digital_footprints",
            "textual_vocal_analysis",
            "professional_behavioral_context",
            "canine_behavior_cbarq"
        ];
        var PERSONA_METHODS = [
            "supervised_learning_svm_random_forest",
            "deep_learning_cnn_rnn",
            "nlp_bert_roberta",
            "rlhf_alignment_tuning"
        ];
        var PERSONA_BEHAVIOR_POLICIES = {
            interaction_context_rule: "30_percent_human_oversight_remainder",
            distinction: "personality_modeling_vs_personalization"
        };
        var PERSONA_ARCHETYPE_RULES = [
            { id: "analyst", pattern: /\b(system|logic|analyze|optimi[sz]e|precision|benchmark|evidence|model)\b/i },
            { id: "creator", pattern: /\b(create|design|imagine|aesthetic|music|story|novel|invent|art)\b/i },
            { id: "guardian", pattern: /\b(safety|protect|secure|risk|compliance|governance|policy|approve)\b/i },
            { id: "operator", pattern: /\b(run|deploy|pipeline|ops|latency|throughput|execute|preflight)\b/i },
            { id: "teacher", pattern: /\b(explain|learn|teach|curriculum|guide|lesson|student|knowledge)\b/i },
            { id: "healer", pattern: /\b(health|care|therap|wellbeing|stress|recovery|support)\b/i },
            { id: "diplomat", pattern: /\b(community|social|relationship|team|consensus|collaborat|trust)\b/i },
            { id: "explorer", pattern: /\b(search|discover|map|journey|adventure|research|unknown)\b/i }
        ];
        function inferPersonaArchetypes(text, capsuleCtx) {
            var src = String(text || "").toLowerCase();
            var capsuleWords = (capsuleCtx || []).flatMap(function(c) { return c.words || []; }).join(" ").toLowerCase();
            var combined = (src + " " + capsuleWords).trim();
            var out = PERSONA_ARCHETYPE_RULES.map(function(rule) {
                var m = combined.match(new RegExp(rule.pattern.source, "gi"));
                return { id: rule.id, score: m ? m.length : 0 };
            }).filter(function(r) { return r.score > 0; })
              .sort(function(a, b) { return b.score - a.score; });
            if (!out.length) out = [{ id: "analyst", score: 1 }, { id: "explorer", score: 1 }];
            return out.slice(0, 6);
        }
        function getRndrConfig() {
            var cfg = {
                endpoint: "https://canvas.otoy.ai",
                token: "",
                gsplatPlayer: "pending",
                notes: "Set token to enable authenticated RNDR/canvas requests."
            };
            try {
                var raw = localStorage.getItem("kbatch-rndr-config");
                if (raw) {
                    var parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === "object") {
                        if (parsed.endpoint) cfg.endpoint = String(parsed.endpoint);
                        if (parsed.token) cfg.token = String(parsed.token);
                    }
                }
            } catch (_) {}
            var hasGsplat = !!(window.GSplatPlayer || window.gsplat || window.GaussianSplats3D);
            cfg.gsplatPlayer = hasGsplat ? "detected" : "not-detected";
            return cfg;
        }
        function setRndrConfig(patch) {
            var prev = getRndrConfig();
            var next = {
                endpoint: patch && patch.endpoint ? String(patch.endpoint) : prev.endpoint,
                token: patch && typeof patch.token === "string" ? patch.token : prev.token
            };
            try { localStorage.setItem("kbatch-rndr-config", JSON.stringify(next)); } catch (_) {}
            return getRndrConfig();
        }
        function rndrStatusPayload() {
            var cfg = getRndrConfig();
            return {
                endpoint: cfg.endpoint,
                tokenConfigured: !!cfg.token,
                tokenPreview: cfg.token ? (cfg.token.slice(0, 4) + "..." + cfg.token.slice(-4)) : "",
                gsplatPlayer: cfg.gsplatPlayer,
                webgl: !!window.WebGLRenderingContext,
                webgpu: !!navigator.gpu
            };
        }
        function buildMultimodalComponentStatus() {
            var hasMediaDevices = !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            var hasAudioCtx = !!(window.AudioContext || window.webkitAudioContext);
            var hasImageBitmap = typeof window.createImageBitmap === "function";
            var hasVideoEl = typeof HTMLVideoElement !== "undefined";
            var hasMediaPipe = !!(window.Pose || window.Hands || window.Holistic || window.FaceMesh);
            var hasTracking = !!(window.MediaStreamTrackProcessor || window.Tracking || window.Tracker);
            var hasThree = !!window.THREE;
            var hasIK = !!(window.IK || window.IKSolver || window.CCDIKSolver || (window.THREE && window.THREE.CCDIKSolver));
            return {
                pipelines: {
                    video: hasMediaDevices && hasVideoEl,
                    image: hasImageBitmap,
                    audio: hasAudioCtx,
                    streamLane: true
                },
                ikPose: {
                    poseEstimation: hasMediaPipe,
                    tracking: hasTracking,
                    ikSolver: hasIK,
                    modelAttachment3D: hasThree
                },
                searchHistoryAttachment: {
                    enabled: true,
                    channels: ["history-search", "iron-line", "kbatch-training", "uterm-notes", "quantum-prefixes"],
                    payloads: ["kbatch-persona-outline", "kbatch-persona-multimodal-chain"]
                }
            };
        }
        async function buildPersonaChainReport(text) {
            var src = String(text || ((document.getElementById('typing-input') || {}).value || ""));
            var bench = window.kbatch && window.kbatch.stack ? window.kbatch.stack.benchmark(src) : null;
            var caps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(src, 12) : [];
            var capsuleCtx = (caps || []).slice(0, 8).map(function(c) {
                return {
                    id: c.id,
                    name: c.name,
                    category: c.cat,
                    words: (c.words || []).slice(0, 12)
                };
            });
            var contrail = buildContrailInjection(src, capsuleCtx, bench);
            var persona = buildPersonaOutlineContext(src, capsuleCtx, bench, contrail);
            var packet = buildCodestralPacket(src, "structured_data");
            var dictionary = await loadXrefDoc("dictionary");
            var bridge = await loadXrefDoc("bridge");
            var streamIndex = await loadStreamDoc("index", false);
            var multimodal = buildMultimodalComponentStatus();
            var archetypes = inferPersonaArchetypes(src, capsuleCtx);
            var rndr = rndrStatusPayload();
            return {
                version: "1.0.0",
                provenance: buildHomeProvenance("persona.chain", src),
                ts: Date.now(),
                input: {
                    text: src,
                    chars: src.length
                },
                chains: {
                    musica: {
                        bpm: bench && bench.musicaEngine ? bench.musicaEngine.bpm : 0,
                        qBPM: bench && bench.musicaEngine ? bench.musicaEngine.qBPM : 0,
                        qHz: bench && bench.musicaEngine ? bench.musicaEngine.qHz : 0,
                        notation: bench && bench.contrail ? (bench.contrail.musica || "") : "",
                        style: bench ? (bench.codeStyleAsMusic || "") : ""
                    },
                    capsule: {
                        matched: bench && bench.capsules ? bench.capsules.matched : 0,
                        wordHits: bench && bench.capsules ? bench.capsules.wordHits : 0,
                        top: (bench && bench.capsules && bench.capsules.topMatches) ? bench.capsules.topMatches.slice(0, 6) : []
                    },
                    contrail: contrail,
                    persona: persona,
                    foundationModels: {
                        personalityFrameworks: PERSONA_FRAMEWORKS.slice(),
                        psychologicalGroundTruth: PERSONA_PSYCHOLOGICAL_FRAMEWORKS,
                        dataSourceTypes: PERSONA_DATA_SOURCE_TYPES.slice(),
                        methodologies: PERSONA_METHODS.slice(),
                        behavioralPolicies: PERSONA_BEHAVIOR_POLICIES,
                        archetypes: archetypes,
                        modelFamilies: [
                            "text-foundation",
                            "multimodal-foundation",
                            "retrieval-augmented",
                            "governance-aware",
                            "persona-adaptive"
                        ]
                    },
                    multimodal: multimodal,
                    rndrGsplat: rndr,
                    blockized: {
                        dac: !!(window.prefixDAC || window.qbitCodec),
                        ironLine: true,
                        prefixes: !!window.QuantumPrefixes,
                        preflight: !!window.QbitPreflight,
                        t5Lane: bench ? String(bench.t5 || "unknown") : "unknown",
                        gutterCoverage: bench ? Number((bench.quantumGutterCoverage || 0).toFixed(2)) : 0,
                        stenoRoundTrip: !!(bench && bench.stenoRoundTrip),
                        codecRoundTrip: !!(bench && bench.codecRoundTrip)
                    },
                    dictionary: {
                        sources: dictionary && dictionary.dictionary_sources ? dictionary.dictionary_sources.length : 0,
                        languageBuckets: dictionary && dictionary.language_crossref ? dictionary.language_crossref.length : 0,
                        countryBuckets: dictionary && dictionary.country_crossref ? dictionary.country_crossref.length : 0
                    },
                    bridge: {
                        nodes: bridge && bridge.nodes ? bridge.nodes.length : 0,
                        edges: bridge && bridge.edges ? bridge.edges.length : 0
                    },
                    stream: {
                        assets: streamIndex && streamIndex.counts ? (streamIndex.counts.stream_assets_scanned || 0) : 0,
                        snapshots: streamIndex && streamIndex.counts ? (streamIndex.counts.stream_snapshots_scanned || 0) : 0
                    },
                    searchHistoryPacket: packet
                },
                chainCoverage: [
                    "musica",
                    "capsule",
                    "contrail",
                    "persona",
                    "foundation-models",
                    "rndr-gsplat-prep",
                    "multimodal-ik-attachment",
                    "blockized",
                    "dictionary",
                    "bridge",
                    "stream",
                    "search-history-packet"
                ]
            };
        }
        function crossReferenceCapsuleContrails(capsuleId, limit) {
            var cap = getCapsuleById(capsuleId);
            if (!cap) return { error: "capsule not found", capsuleId: capsuleId };
            var typed = captureTypedContrailTrace(96);
            var n = Math.max(1, Math.min(40, parseInt(limit || 12, 10) || 12));
            var matches = (cap.words || []).map(function(word) {
                var a = window.kbatch && window.kbatch.analyze ? window.kbatch.analyze(word) : null;
                var path = a && a.path ? a.path : "";
                return {
                    word: word,
                    score: contrailOverlapScore(typed, path),
                    path: path,
                    efficiency: a && a.efficiency != null ? a.efficiency : null,
                    complexity: a && a.complexity != null ? a.complexity : null
                };
            }).filter(function(r) { return !!r.path; })
              .sort(function(a, b) { return b.score - a.score; })
              .slice(0, n);
            return {
                capsuleId: cap.id,
                capsuleName: cap.name,
                typedTrace: typed,
                limit: n,
                matches: matches
            };
        }

        var KB_XREF_CACHE = { dictionary: null, bridge: null };
        var KB_COMPLIANCE_CACHE = { manifest: null, policy: null, ledger: null };
        var KB_XREF_ENDPOINTS = {
            dictionary: [
                "school/corpus/exports/dictionary-crossref-index.json",
                "../school/corpus/exports/dictionary-crossref-index.json",
                "/school/corpus/exports/dictionary-crossref-index.json"
            ],
            bridge: [
                "school/corpus/exports/bridge-graph.json",
                "../school/corpus/exports/bridge-graph.json",
                "/school/corpus/exports/bridge-graph.json"
            ]
        };
        var KB_COMPLIANCE_ENDPOINTS = {
            manifest: [
                "school/corpus/exports/provenance-manifest.json",
                "../school/corpus/exports/provenance-manifest.json",
                "/school/corpus/exports/provenance-manifest.json"
            ],
            policy: [
                "school/corpus/partner_identity_policy.json",
                "../school/corpus/partner_identity_policy.json",
                "/school/corpus/partner_identity_policy.json"
            ],
            ledger: [
                "school/corpus/exports/provenance-ledger.jsonl",
                "../school/corpus/exports/provenance-ledger.jsonl",
                "/school/corpus/exports/provenance-ledger.jsonl"
            ]
        };
        var KB_STREAM_CACHE = { index: null, ingest: null, capsules: null, preflight: null };
        var KB_BOOKLANE_CACHE = { registry: null, history: null, index: null };
        var KB_BOOKLANE_ENDPOINTS = {
            registry: [
                "school/corpus/rights_registry.jsonl",
                "../school/corpus/rights_registry.jsonl",
                "/school/corpus/rights_registry.jsonl"
            ],
            history: [
                "school/corpus/exports/history-search-documents.jsonl",
                "../school/corpus/exports/history-search-documents.jsonl",
                "/school/corpus/exports/history-search-documents.jsonl"
            ],
            index: [
                "school/corpus/exports/corpus-index.json",
                "../school/corpus/exports/corpus-index.json",
                "/school/corpus/exports/corpus-index.json"
            ]
        };
        var KB_STREAM_ENDPOINTS = {
            index: [
                "school/corpus/exports/stream-index.json",
                "../school/corpus/exports/stream-index.json",
                "/school/corpus/exports/stream-index.json"
            ],
            ingest: [
                "school/corpus/exports/stream-ingest-index.json",
                "../school/corpus/exports/stream-ingest-index.json",
                "/school/corpus/exports/stream-ingest-index.json"
            ],
            preflight: [
                "school/corpus/exports/stream-preflight.json",
                "../school/corpus/exports/stream-preflight.json",
                "/school/corpus/exports/stream-preflight.json"
            ],
            capsules: [
                "school/corpus/exports/stream-capsules.delta.json",
                "../school/corpus/exports/stream-capsules.delta.json",
                "/school/corpus/exports/stream-capsules.delta.json"
            ]
        };
        function parseJsonlText(text) {
            return String(text || "")
                .split(/\r?\n/)
                .map(function(line) { return line.trim(); })
                .filter(Boolean)
                .map(function(line) {
                    try { return JSON.parse(line); } catch (_) { return null; }
                })
                .filter(Boolean);
        }
        function makeBookCapsuleId(assetId) {
            return "caps.corpus." + String(assetId || "").trim();
        }
        var QB_HOME = {
            brand: "qbitOS/ugrad",
            project: "uvspeed",
            homeRepo: "https://github.com/qbitos/uvspeed",
            homeNotice: "If redistributed, preserve provenance and contact qbitOS/ugrad maintainers."
        };
        function fnv1aHash(str) {
            var s = String(str || "");
            var h = 0x811c9dc5;
            for (var i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i);
                h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
            }
            return ("00000000" + (h >>> 0).toString(16)).slice(-8);
        }
        function buildHomeProvenance(context, payloadText) {
            var text = String(payloadText || "");
            return {
                owner: QB_HOME.brand,
                project: QB_HOME.project,
                context: String(context || "runtime"),
                home_repo: QB_HOME.homeRepo,
                notice: QB_HOME.homeNotice,
                fingerprint: "fnv1a:" + fnv1aHash(text),
                ts: Date.now()
            };
        }
        function languageSupportSnapshot() {
            var qp = window.QuantumPrefixes;
            var codeLangs = qp && qp.LANGUAGE_PATTERNS ? Object.keys(qp.LANGUAGE_PATTERNS).length : 0;
            var enc = window.Encoder || {};
            var steno = window.StenoEngine || {};
            return {
                code: {
                    enabled: !!qp,
                    languages: codeLangs
                },
                spoken: {
                    enabled: !!(enc.toMorse || enc.toIntonation || enc.toRhythm),
                    modes: ["morse", "intonation", "rhythm", "musica"]
                },
                written: {
                    enabled: true,
                    modes: ["plain-text", "quantum-prefix", "dac", "qbit-codec"]
                },
                sign: {
                    enabled: !!(enc.toASL || enc.toBSL),
                    modes: ["asl", "bsl"]
                },
                steno: {
                    enabled: !!steno,
                    mode: "concept-compression"
                }
            };
        }
        function getBooklanePersonaOverrides() {
            try {
                return JSON.parse(localStorage.getItem("kbatch-booklane-persona-overrides") || "{}");
            } catch (_) {
                return {};
            }
        }
        function setBooklanePersonaOverride(assetId, profile) {
            var key = String(assetId || "").trim();
            if (!key) return null;
            var all = getBooklanePersonaOverrides();
            all[key] = profile || {};
            try { localStorage.setItem("kbatch-booklane-persona-overrides", JSON.stringify(all)); } catch (_) {}
            return all[key];
        }
        function getBooklanePersonaOverride(assetId) {
            var all = getBooklanePersonaOverrides();
            return all[String(assetId || "").trim()] || null;
        }
        async function loadBooklaneDoc(kind, force) {
            if (!force && KB_BOOKLANE_CACHE[kind]) return KB_BOOKLANE_CACHE[kind];
            var endpoints = KB_BOOKLANE_ENDPOINTS[kind] || [];
            for (var i = 0; i < endpoints.length; i++) {
                try {
                    var res = await fetch(endpoints[i], { cache: "no-cache" });
                    if (!res.ok) continue;
                    if (kind === "index") {
                        var json = await res.json();
                        KB_BOOKLANE_CACHE[kind] = json;
                        return json;
                    }
                    var txt = await res.text();
                    var rows = parseJsonlText(txt);
                    KB_BOOKLANE_CACHE[kind] = rows;
                    return rows;
                } catch (_) {}
            }
            return kind === "index" ? null : [];
        }
        function governanceAllow(record) {
            if (!record) return false;
            var status = String(record.rights_status || "").toLowerCase();
            var allowStatus = status === "public_domain" || status === "open_license";
            return allowStatus && !!record.training_allowed;
        }
        async function buildBooklaneAssetReport(assetId) {
            var id = String(assetId || "").trim();
            var registry = await loadBooklaneDoc("registry", false);
            var history = await loadBooklaneDoc("history", false);
            var index = await loadBooklaneDoc("index", false);
            var record = (registry || []).find(function(r) { return String(r.asset_id || "") === id; }) || null;
            var hdoc = (history || []).find(function(r) { return String(r.id || "") === ("history.corpus." + id); }) || null;
            var capId = makeBookCapsuleId(id);
            var capsule = getCapsuleById(capId);
            var override = getBooklanePersonaOverride(id);
            return {
                asset_id: id,
                governance: {
                    rights_status: record ? record.rights_status : "unknown",
                    training_allowed: !!(record && record.training_allowed),
                    allow: governanceAllow(record)
                },
                corpus: {
                    scanned_assets: index && index.counts ? index.counts.raw_assets_scanned : 0,
                    history_doc: hdoc,
                    capsule_id: capId,
                    capsule_present: !!capsule
                },
                persona: {
                    override: override,
                    capsule_outline: capsule && capsule.meta ? (capsule.meta.persona_outline || null) : null
                }
            };
        }
        function applyBooklanePersonaProfile(assetId, profile) {
            var id = String(assetId || "").trim();
            if (!id) return { error: "missing asset_id" };
            var capId = makeBookCapsuleId(id);
            var cap = getCapsuleById(capId);
            var incoming = profile || {};
            var personaOutline = Object.assign({}, (cap && cap.meta ? (cap.meta.persona_outline || {}) : {}), incoming);
            var saved = setBooklanePersonaOverride(id, personaOutline);
            if (cap) {
                upsertCapsuleFromCli({
                    id: cap.id,
                    name: cap.name,
                    cat: cap.cat,
                    words: (cap.words || []).slice(),
                    meta: Object.assign({}, cap.meta || {}, { persona_outline: personaOutline })
                }, { persist: true });
                renderGrid(activeFilter);
            }
            publishToEcosystem('kbatch-booklane-persona', {
                asset_id: id,
                capsule_id: capId,
                persona_outline: personaOutline,
                provenance: buildHomeProvenance("booklane.persona", id + JSON.stringify(personaOutline || {})),
                ts: Date.now()
            }, ['history-search', 'iron-line', 'kbatch-training', 'uterm-notes']);
            return {
                asset_id: id,
                capsule_id: capId,
                capsule_present: !!cap,
                persona_outline: saved,
                provenance: buildHomeProvenance("booklane.persona.result", id)
            };
        }
        async function buildBooklanePreflight(assetId) {
            var report = await buildBooklaneAssetReport(assetId);
            var xrefDoc = await loadXrefDoc("dictionary");
            var xrefHits = (xrefDoc && xrefDoc.capsule_bridge || []).filter(function(r) {
                return String(r.capsule_id || "") === report.corpus.capsule_id;
            });
            var checks = [
                { item: "registry record", ok: report.governance.rights_status !== "unknown" },
                { item: "governance allow", ok: !!report.governance.allow },
                { item: "history doc", ok: !!report.corpus.history_doc },
                { item: "capsule", ok: !!report.corpus.capsule_present },
                { item: "xref bridge", ok: xrefHits.length > 0 },
                { item: "persona attached", ok: !!(report.persona.override || report.persona.capsule_outline) }
            ];
            return {
                asset_id: report.asset_id,
                provenance: buildHomeProvenance("booklane.preflight", report.asset_id),
                checks: checks,
                pass: checks.every(function(c) { return !!c.ok; }),
                report: report,
                next_commands: [
                    "booklane pull " + report.asset_id,
                    "booklane analyze " + report.asset_id,
                    "booklane persona " + report.asset_id + " {\"goals\":[\"persona-memory-mindmap\"],\"strategies\":[\"chess\",\"go\",\"maze\"],\"reasoning_scale\":\"collegiate-enterprise\"}",
                    "booklane xref " + report.asset_id
                ]
            };
        }
        var UGRAD_GAMIFICATION_STRATEGIES = [
            { id: "chess", tags: ["chess", "opening", "endgame", "tempo", "fork"] },
            { id: "go", tags: ["go", "territory", "influence", "shape", "sente"] },
            { id: "maze", tags: ["maze", "pathfinding", "exploration", "graph", "solver"] }
        ];
        function matchGamificationPathlanes(text, caps) {
            var src = String(text || "").toLowerCase();
            var capWords = (caps || []).flatMap(function(c) { return c.words || []; }).join(" ").toLowerCase();
            return UGRAD_GAMIFICATION_STRATEGIES.map(function(s) {
                var tagHits = s.tags.filter(function(t) { return src.includes(t) || capWords.includes(t); });
                return {
                    id: s.id,
                    matched: tagHits.length > 0,
                    hits: tagHits
                };
            });
        }
        async function buildUgradTensorEvolutionPacket(text) {
            var src = String(text || ((document.getElementById('typing-input') || {}).value || ""));
            var bench = window.kbatch && window.kbatch.stack ? window.kbatch.stack.benchmark(src) : null;
            var caps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(src, 12) : [];
            var pathlanes = matchGamificationPathlanes(src, caps);
            var personaChain = await buildPersonaChainReport(src);
            var preflightFormat = null;
            try {
                if (window.QbitPreflight && typeof window.QbitPreflight.validateFormat === "function") {
                    preflightFormat = window.QbitPreflight.validateFormat(src);
                }
            } catch (_) {}
            var qc = window.qbitCodec || null;
            var hasCodec = !!qc;
            return {
                version: "1.0.0",
                source: "kbatch.ugrad.tensor",
                provenance: buildHomeProvenance("ugrad.tensor", src),
                ts: Date.now(),
                input: { text: src, chars: src.length },
                gamificationStrategyDirectory: {
                    strategies: UGRAD_GAMIFICATION_STRATEGIES,
                    pathlaneMatches: pathlanes
                },
                capsuleSkillsPathlanes: {
                    matched: bench && bench.capsules ? bench.capsules.matched : 0,
                    wordHits: bench && bench.capsules ? bench.capsules.wordHits : 0,
                    topMatches: bench && bench.capsules ? (bench.capsules.topMatches || []).slice(0, 8) : []
                },
                qbitCodecEvolution: {
                    available: hasCodec,
                    stenoRoundTrip: !!(bench && bench.stenoRoundTrip),
                    codecRoundTrip: !!(bench && bench.codecRoundTrip),
                    t5Lane: bench ? String(bench.t5 || "unknown") : "unknown"
                },
                blockizedRuntime: {
                    dac: !!(window.prefixDAC || window.qbitCodec),
                    ironLine: true,
                    prefixes: !!window.QuantumPrefixes,
                    preflight: !!window.QbitPreflight,
                    preflightFormat: preflightFormat,
                    timings: bench ? bench.timings : null
                },
                personaChain: personaChain
            };
        }
        async function loadXrefDoc(kind) {
            if (KB_XREF_CACHE[kind]) return KB_XREF_CACHE[kind];
            var endpoints = KB_XREF_ENDPOINTS[kind] || [];
            for (var i = 0; i < endpoints.length; i++) {
                try {
                    var res = await fetch(endpoints[i], { cache: "no-cache" });
                    if (!res.ok) continue;
                    var doc = await res.json();
                    KB_XREF_CACHE[kind] = doc;
                    return doc;
                } catch (_) {}
            }
            return null;
        }
        async function loadStreamDoc(kind, force) {
            if (!force && KB_STREAM_CACHE[kind]) return KB_STREAM_CACHE[kind];
            var endpoints = KB_STREAM_ENDPOINTS[kind] || [];
            for (var i = 0; i < endpoints.length; i++) {
                try {
                    var res = await fetch(endpoints[i], { cache: "no-cache" });
                    if (!res.ok) continue;
                    var doc = await res.json();
                    KB_STREAM_CACHE[kind] = doc;
                    return doc;
                } catch (_) {}
            }
            return null;
        }
        async function loadComplianceDoc(kind, force) {
            if (!force && KB_COMPLIANCE_CACHE[kind]) return KB_COMPLIANCE_CACHE[kind];
            var endpoints = KB_COMPLIANCE_ENDPOINTS[kind] || [];
            for (var i = 0; i < endpoints.length; i++) {
                try {
                    var res = await fetch(endpoints[i], { cache: "no-cache" });
                    if (!res.ok) continue;
                    if (kind === "ledger") {
                        var txt = await res.text();
                        var rows = parseJsonlText(txt);
                        KB_COMPLIANCE_CACHE[kind] = rows;
                        return rows;
                    }
                    var doc = await res.json();
                    KB_COMPLIANCE_CACHE[kind] = doc;
                    return doc;
                } catch (_) {}
            }
            return kind === "ledger" ? [] : null;
        }
        async function refreshStreamHeartbeatUI() {
            var ingest = await loadStreamDoc("ingest", true);
            var index = await loadStreamDoc("index", true);
            var preflight = await loadStreamDoc("preflight", true);
            window.__kbatchStreamStatus = {
                ingestIndex: ingest || null,
                exportIndex: index || null,
                preflight: preflight || null,
                updatedAt: Date.now()
            };
            var streamEl = document.getElementById('s-stream');
            if (streamEl) {
                var counts = index && index.counts ? index.counts : null;
                if (!counts) {
                    streamEl.textContent = 'offline';
                    streamEl.style.color = '#8b949e';
                } else {
                    var ready = !!(preflight && preflight.mistral_vibe_ready);
                    streamEl.textContent = String(counts.stream_assets_scanned || 0) + 'a/' + String(counts.stream_snapshots_scanned || 0) + 's' + (ready ? ' ✓' : '');
                    streamEl.style.color = ready ? '#22a06b' : (Number(counts.stream_snapshots_scanned || 0) > 0 ? '#f59e0b' : '#8b949e');
                }
            }
            return window.__kbatchStreamStatus;
        }

        function termPrint(text, cls = '') {
            const div = document.createElement('div');
            div.className = 'term-line ' + cls;
            div.innerHTML = text;
            termOutput.appendChild(div); termOutput.scrollTop = termOutput.scrollHeight;
        }

        const CMDS = {
            help: () => {
                termPrint('\u2500\u2500\u2500 kbatch Commands \u2500\u2500\u2500', 'info');
                termPrint('<b>status</b>        \u2014 current analysis summary');
                termPrint('<b>heatmap</b>       \u2014 key usage counts');
                termPrint('<b>contrails</b>     \u2014 recent movement paths');
                termPrint('<b>analyze &lt;word&gt;</b> \u2014 analyze a specific word');
                termPrint('<b>efficiency</b>    \u2014 efficiency breakdown');
                termPrint('<b>process &lt;text&gt;</b> \u2014 process text for analysis');
                termPrint('<b>topkeys</b>       \u2014 top 10 most-used keys');
                termPrint('<b>words</b>         \u2014 word frequency list');
                termPrint('<b>hapax</b>         \u2014 words appearing once');
                termPrint('<b>layout [name]</b> \u2014 switch/list keyboard layouts');
                termPrint('<b>compare &lt;a&gt; &lt;b&gt;</b> \u2014 compare two layouts');
                termPrint('<b>dict &lt;word&gt;</b>   \u2014 dictionary lookup');
                termPrint('<b>quantum</b>       \u2014 build + run quantum circuit');
                termPrint('<b>qasm</b>          \u2014 show current QASM');
                termPrint('<b>search &lt;q&gt;</b>    \u2014 universal search (14 connectors)');
                termPrint('<b>uterm &lt;text&gt;</b>   \u2014 send payload to new quantum terminal bus');
                termPrint('<b>musica [text]</b>  \u2014 emit BPM + qBPM/QHz/ns payload to DAW bridges');
                termPrint('<b>blocks [text]</b>  \u2014 emit prefix-tagged block payload to quantum-gutter');
                termPrint('<b>daw</b>           \u2014 show DAW bridge support matrix');
                termPrint('<b>bench [text]</b>   \u2014 run stack benchmark (prefix/steno/gluelam/iron-line/t5)');
                termPrint('<b>stack</b>         \u2014 show last stack benchmark status');
                termPrint('<b>capsfind &lt;q&gt;</b>  \u2014 search capsules (id/name/words/meta)');
                termPrint('<b>capsule &lt;id&gt;</b>  \u2014 show capsule entity metadata + stack stats');
                termPrint('<b>capsbus &lt;id&gt;</b>   \u2014 emit capsule packet to iron-line/quantum bus');
                termPrint('<b>capsqbit &lt;id&gt;</b>  \u2014 export capsule .qbit JSON packet');
                termPrint('<b>capsopen &lt;id&gt; [terms]</b> \u2014 run open search from capsule context');
                termPrint('<b>capslang &lt;id&gt;</b>  \u2014 show indigenous language preservation profile');
                termPrint('<b>capsaudio &lt;id&gt;</b> \u2014 emit auditory/keyboard cross-sync for language pack');
                termPrint('<b>caps put {json}</b> \u2014 create/update capsule (id,name,cat,words,meta) + persist local override');
                termPrint('<b>caps append &lt;id&gt; &lt;terms...&gt;</b> \u2014 append words to capsule + persist override');
                termPrint('<b>caps local</b>    \u2014 show local capsule overrides');
                termPrint('<b>caps sync [scope] [batch] [delay]</b> \u2014 warm-index emit (scope: research|entity|university|publisher|agency|agency-verified|agency-synth|all)');
                termPrint('<b>contrail xref &lt;capsuleId&gt; [n]</b> \u2014 cross-reference live typing contrails with capsule words');
                termPrint('<b>xref lang &lt;code&gt;</b>  \u2014 query corpus dictionary crossref by language');
                termPrint('<b>xref country &lt;name&gt;</b> \u2014 query corpus dictionary crossref by country');
                termPrint('<b>xref capsule &lt;id&gt;</b> \u2014 query corpus dictionary crossref by capsule id');
                termPrint('<b>booklane help</b> \u2014 corpus book workflow lane');
                termPrint('<b>booklane pull &lt;assetId&gt;</b> \u2014 governance-aware pull command + status');
                termPrint('<b>booklane analyze &lt;assetId&gt;</b> \u2014 inspect book capsule/history readiness');
                termPrint('<b>booklane persona &lt;assetId&gt; [json]</b> \u2014 attach persona profile to corpus book');
                termPrint('<b>booklane xref &lt;assetId&gt;</b> \u2014 inspect dictionary xref bridge for a book');
                termPrint('<b>booklane preflight &lt;assetId&gt;</b> \u2014 one-shot pass/fail readiness checks');
                termPrint('<b>booklane run &lt;assetId&gt; [json]</b> \u2014 virtual full chain (pull/analyze/persona/xref/preflight)');
                termPrint('<b>ugrad tensor [text]</b> \u2014 build ugrad tensor evolution packet with qbit/steno/dac/iron checks');
                termPrint('<b>ugrad pathlanes [text]</b> \u2014 gamification strategy directory matches (chess/go/maze)');
                termPrint('<b>ugrad preflight [text]</b> \u2014 tensor readiness + persona-chain integration');
                termPrint('<b>ugrad games</b> \u2014 list μgrad arena registry (npm-style index)');
                termPrint('<b>ugrad &lt;id&gt;</b> \u2014 open arena (e.g. <code>ugrad go</code> \u2192 Go board)');
                termPrint('<b>ugrad open &lt;id&gt;</b> \u2014 same as <code>ugrad &lt;id&gt;</code>');
                termPrint('<b>ugrad tensor send [env] [steps]</b> \u2014 dispatch ugrad-tensor-train');
                termPrint('<b>compliance home [text]</b> \u2014 qbitOS/ugrad provenance anchor + language modality coverage');
                termPrint('<b>bridge graph</b>  \u2014 show persona/QPM/contrail/linguistic bridge graph');
                termPrint('<b>stream status</b> \u2014 show live-stream export status');
                termPrint('<b>stream assets</b> \u2014 list stream capsules');
                termPrint('<b>stream xref &lt;assetId&gt;</b> \u2014 inspect one stream capsule + terms');
                termPrint('<b>stream preflight</b> \u2014 show Mistral-ready stream checklist');
                termPrint('<b>stream pulse</b> \u2014 refresh stream heartbeat now');
                termPrint('<b>contrail prompt [text]</b> \u2014 set/get contrail code prompt language injection string');
                termPrint('<b>contrail inject [text] [mode]</b> \u2014 inject contrail prompt packet into engine lanes');
                termPrint('<b>persona prompt [text]</b> \u2014 set/get persona prompt language (musica + capsule + blockized runtime)');
                termPrint('<b>persona outline [text]</b> \u2014 show persona outline used by codestral/search/history lanes');
                termPrint('<b>persona chain [text]</b> \u2014 run expanded persona analysis across all chains');
                termPrint('<b>persona models [text]</b> \u2014 show personality archetypes + foundational model families');
                termPrint('<b>persona ik</b> \u2014 show IK/pose/tracking + 3D attachment readiness');
                termPrint('<b>persona media</b> \u2014 show video/image/audio pipeline readiness');
                termPrint('<b>persona rndr [status|token &lt;value&gt;|endpoint &lt;url&gt;]</b> \u2014 RNDR/canvas/gsplat prep');
                termPrint('<b>codestral help</b> \u2014 show kbatch Codestral lane commands');
                termPrint('<b>codestral schema [name]</b> \u2014 emit JSON schema template (simple_response|structured_data|classification|entity_extraction)');
                termPrint('<b>codestral packet [text] [mode]</b> \u2014 build Codestral-ready packet from kbatch stack + capsules');
                termPrint('<b>codestral prompt [text] [mode]</b> \u2014 show system/user prompt pair + schema');
                termPrint('<b>codestral export [text] [mode]</b> \u2014 export Codestral packet JSON');
                termPrint('<b>mistralbench help</b> \u2014 one-liner export/run for mistral-vibe benchmark harness');
                termPrint('<b>mistralbench export [text] [mode]</b> \u2014 export packet + print exact shell command');
                termPrint('<b>mistralbench run [text] [mode]</b> \u2014 same as export, ready to paste into terminal');
                termPrint('<b>mistralbench last</b> \u2014 print command for the latest exported packet');
                termPrint('<b>vendorbench help</b> \u2014 vendor-agnostic benchmark command lane');
                termPrint('<b>vendorbench list [modelId]</b> \u2014 print provider-agnostic commands');
                termPrint('<b>mistralbench vendors [modelId]</b> \u2014 alias to vendorbench list (legacy)');
                termPrint('<b>trainer plan</b>   \u2014 show 5-stage trainer pipeline map');
                termPrint('<b>trainer packet [text]</b> \u2014 build trainer packet (ingest/embeddings/capsules/train)');
                termPrint('<b>fontlab [text]</b>   \u2014 run built-in font coverage + style detector');
                termPrint('<b>fontlab fabricate [plotter|printer3d|both] [text]</b> \u2014 repipe toolpaths');
                termPrint('<b>fontlab last</b>    \u2014 show last fontlab packet snapshot');
                termPrint('<b>fontlab compile [text]</b> \u2014 compile layout-wide font pack + capsule xref + multicast');
                termPrint('<b>fontlab pack</b>    \u2014 show last compiled font pack');
                termPrint('<b>export</b>        \u2014 export JSON state');
                termPrint('<b>reset</b>         \u2014 reset analysis');
                termPrint('<b>eval &lt;js&gt;</b>     \u2014 evaluate JavaScript');
                termPrint('<b>clear</b>         \u2014 clear terminal');
            },
            status: () => {
                const s = kbatch.state;
                termPrint(`Layout: <b style="color:#f0883e;">${LAYOUTS[activeLayoutId].name}</b> (${LAYOUTS[activeLayoutId].script})`)
                termPrint(`WPM: <b style="color:#58a6ff;">${s.wpm.toFixed(1)}</b> | Efficiency: <b style="color:#7ee787;">${s.efficiency.toFixed(1)}%</b> | Complexity: <b style="color:#f97583;">${s.complexity.toFixed(1)}%</b>`);
                termPrint(`Keys: ${s.totalKeys} | Distance: ${s.totalDist.toFixed(2)} | Words: ${s.words} | Hapax: ${s.hapax}`);
            },
            heatmap: () => {
                const hm = kbatch.heatmap();
                const sorted = Object.entries(hm).sort((a,b) => b[1]-a[1]);
                termPrint('\u2500\u2500\u2500 Key Heatmap \u2500\u2500\u2500', 'info');
                sorted.forEach(([k,v]) => {
                    const bar = '\u2588'.repeat(Math.min(30, v));
                    termPrint(`<span style="color:#f0883e;">${k === ' ' ? 'SPC' : k}</span> ${bar} ${v}`);
                });
            },
            contrails: () => {
                const trans = kbatch.transitions().slice(-20);
                termPrint('\u2500\u2500\u2500 Recent Contrails \u2500\u2500\u2500', 'info');
                trans.forEach(t => termPrint(`${t.from} ${dirSymbol(t.dx, t.dy)} ${t.to} (dist: ${t.dist.toFixed(2)})`));
            },
            efficiency: () => {
                const s = kbatch.state;
                termPrint('\u2500\u2500\u2500 Efficiency Breakdown \u2500\u2500\u2500', 'info');
                termPrint(`Overall: <b style="color:#7ee787;">${s.efficiency.toFixed(1)}%</b>`);
                termPrint(`Avg key distance: ${s.avgDist.toFixed(3)} units`);
                termPrint(`Finger strain: <b style="color:#e6b422;">${s.strain.toFixed(1)}%</b>`);
                termPrint(`Row-change complexity: <b style="color:#f97583;">${s.complexity.toFixed(1)}%</b>`);
            },
            topkeys: () => {
                termPrint('\u2500\u2500\u2500 Top 10 Keys \u2500\u2500\u2500', 'info');
                kbatch.topKeys(10).forEach((k,i) => termPrint(`${i+1}. <b style="color:#f0883e;">${k.key}</b> \u2014 ${k.count} presses`));
            },
            words: () => {
                const sorted = Object.entries(kbatch.wordFreq()).sort((a,b) => b[1]-a[1]).slice(0, 20);
                termPrint('\u2500\u2500\u2500 Word Frequency (top 20) \u2500\u2500\u2500', 'info');
                sorted.forEach(([w,c]) => termPrint(`<b>${w}</b> \u00d7${c}`));
            },
            hapax: () => {
                const hapax = Object.entries(kbatch.wordFreq()).filter(([,c]) => c === 1).map(([w]) => w);
                termPrint(`\u2500\u2500\u2500 Hapax Legomena (${hapax.length}) \u2500\u2500\u2500`, 'info');
                termPrint(hapax.join(', ') || '(none yet)');
            },
            export: () => { termPrint('\u2500\u2500\u2500 JSON Export \u2500\u2500\u2500', 'info'); termPrint(kbatch.exportJSON(), 'result'); },
            reset: () => { kbatch.reset(); termPrint('Analysis reset', 'info'); },
            clear: () => { termOutput.innerHTML = ''; },
            quantum: () => {
                termPrint('\u2500\u2500\u2500 Quantum Circuit \u2500\u2500\u2500', 'info');
                const qasm = QuantumBridge.buildFromTyping();
                termPrint(`Built ${QuantumBridge.lastCircuit.numQubits}-qubit circuit with ${QuantumBridge.lastCircuit.ops.length} gates`);
                const result = QuantumBridge.simulateLocal(1024);
                const top5 = Object.entries(result).sort((a,b) => b[1]-a[1]).slice(0,5);
                termPrint('Top 5 measurement outcomes (1024 shots):', 'info');
                top5.forEach(([s,c]) => {
                    const pct = (c/1024*100).toFixed(1);
                    const bar = '\u2588'.repeat(Math.floor(c/1024*30));
                    termPrint(`|${s}\u27E9 ${bar} ${pct}%`);
                });
                QuantumBridge.renderHistogram(document.getElementById('cv-quantum'), result);
            },
            qasm: () => {
                if (QuantumBridge.lastCircuit) termPrint(QuantumBridge.lastCircuit.qasm, 'result');
                else termPrint('No circuit built yet. Run: quantum', 'warn');
            },
            stack: () => {
                const bench = window.kbatch.stack.status();
                termPrint('\u2500\u2500\u2500 Stack Status \u2500\u2500\u2500', 'info');
                termPrint(`Gluelam: <b style="color:${bench.gluelam ? '#22a06b' : '#f97583'};">${bench.gluelam ? 'online' : 'degraded'}</b>`);
                termPrint(`T5 lane: <b style="color:#58a6ff;">${bench.t5}</b>`);
                termPrint(`Lang support: <b style="color:${bench.languageSupport.ready ? '#22a06b' : '#f97583'};">${bench.languageSupport.total}/${bench.languageSupport.target}</b>`);
                termPrint(`Quantum gutter coverage: <b style="color:#a855f7;">${bench.quantumGutterCoverage.toFixed(1)}%</b>`);
                termPrint(`Steno round-trip: <b style="color:${bench.stenoRoundTrip ? '#22a06b' : '#f97583'};">${bench.stenoRoundTrip ? 'pass' : 'fail'}</b>`);
                termPrint(`Codec round-trip: <b style="color:${bench.codecRoundTrip ? '#22a06b' : '#f97583'};">${bench.codecRoundTrip ? 'pass' : 'fail'}</b>`);
                termPrint(`Pattern: words=${bench.patternAnalysis.words} eff=${bench.patternAnalysis.avgEfficiency}% cpx=${bench.patternAnalysis.avgComplexity}% dist=${bench.patternAnalysis.avgDistance}`);
                termPrint(`Capsules: matched <b style="color:#f59e0b;">${bench.capsules.matched}</b> / ${bench.capsules.total}, word hits=${bench.capsules.wordHits}`);
                termPrint(`Contrail: ${(bench.contrail.flow || '—').slice(0, 24)} | Musica: ${(bench.contrail.musica || '—').slice(0, 24)}`);
                termPrint(`Code-style-as-music: ${(bench.codeStyleAsMusic || '—').slice(0, 96)}`);
                termPrint(`Musica engine: <b style="color:#1f5b9b;">${bench.musicaEngine.bpm} BPM</b> | <b style="color:#7c3aed;">${bench.musicaEngine.qBPM} qBPM</b> (${bench.musicaEngine.qHz} QHz, ${bench.musicaEngine.nsPerLine} ns/line, ${bench.musicaEngine.calibrationLane})`);
                termPrint(`Stage timings: prefix ${bench.timings.prefixMs}ms | steno ${bench.timings.stenoMs}ms | codec ${bench.timings.codecMs}ms | iron-line ${bench.timings.ironLineMs}ms`);
                termPrint(`End-to-end: <b style="color:#1f5b9b;">${bench.totalMs.toFixed(3)}ms</b>`, 'result');
            },
            daw: () => {
                const bench = window.kbatch.stack.status();
                const d = (bench.musicaEngine && bench.musicaEngine.dawSupport) || {};
                termPrint('\u2500\u2500\u2500 DAW Bridge Support \u2500\u2500\u2500', 'info');
                termPrint(`WebMIDI: <b style="color:${d.webMIDI ? '#22a06b' : '#f97583'};">${d.webMIDI ? 'ready' : 'unavailable'}</b>`);
                termPrint(`WebAudio: <b style="color:${d.webAudio ? '#22a06b' : '#f97583'};">${d.webAudio ? 'ready' : 'unavailable'}</b>`);
                termPrint(`Bridges: OSC=${d.oscBridge ? 'on' : 'off'} · Link=${d.abletonLinkBridge ? 'on' : 'off'} · MIDI-Clock=${d.midiClockBridge ? 'on' : 'off'}`);
                termPrint(`Plugin surface: ${(d.pluginSurface || []).join(', ') || '—'}`);
            },
        };

        function processCommand(input) {
            const trimmed = input.trim();
            if (!trimmed) return;
            termPrint(`<span style="color:#f0883e;">kb&gt;</span> ${trimmed}`);
            termHistory.unshift(trimmed);
            historyIdx = -1;
            const parts = trimmed.split(/\s+/);
            const cmd = parts[0].toLowerCase();

            if (cmd === 'compliance') {
                var compSub = (parts[1] || 'help').toLowerCase();
                if (compSub === 'help') {
                    termPrint('compliance commands:', 'info');
                    termPrint('  compliance home [text]');
                    termPrint('  compliance bundle');
                    termPrint('  compliance partner');
                    return;
                }
                if (compSub === 'home') {
                    var ctext = parts.slice(2).join(' ').trim();
                    if (!ctext) ctext = ((document.getElementById('typing-input') || {}).value || '');
                    var prov = buildHomeProvenance("compliance.home", ctext);
                    var lang = languageSupportSnapshot();
                    termPrint('─── Compliance Home Anchor ───', 'info');
                    termPrint('owner=' + escapeHtml(prov.owner) + ' project=' + escapeHtml(prov.project), 'result');
                    termPrint('home_repo=' + escapeHtml(prov.home_repo), 'result');
                    termPrint('fingerprint=' + escapeHtml(prov.fingerprint), 'result');
                    termPrint('code_langs=' + String((lang.code || {}).languages || 0) + ' spoken=' + String(!!(lang.spoken || {}).enabled) + ' written=' + String(!!(lang.written || {}).enabled) + ' sign=' + String(!!(lang.sign || {}).enabled), 'result');
                    termPrint('<pre>' + escapeHtml(JSON.stringify({ provenance: prov, languageSupport: lang }, null, 2)) + '</pre>', 'result');
                    publishToEcosystem('kbatch-compliance-home-anchor', {
                        provenance: prov,
                        languageSupport: lang,
                        ts: Date.now()
                    }, ['history-search', 'iron-line', 'kbatch-training', 'uterm-notes', 'quantum-prefixes']);
                    return;
                }
                if (compSub === 'bundle') {
                    Promise.all([
                        loadComplianceDoc("manifest", true),
                        loadComplianceDoc("ledger", true)
                    ]).then(function(values) {
                        var manifest = values[0] || null;
                        var ledger = values[1] || [];
                        if (!manifest) {
                            termPrint('provenance manifest not found. Run bootstrap or generate_provenance_bundle.py', 'warn');
                            return;
                        }
                        termPrint('─── Compliance Provenance Bundle ───', 'info');
                        termPrint('owner=' + escapeHtml(String(manifest.owner || 'qbitOS/ugrad')) + ' context=' + escapeHtml(String(manifest.context || 'n/a')), 'result');
                        termPrint('critical_files=' + String((manifest.critical_files || []).length) + ' runtimes=' + String((manifest.model_agnostic_runtimes || []).length), 'result');
                        var last = Array.isArray(ledger) && ledger.length ? ledger[ledger.length - 1] : null;
                        termPrint('ledger_entries=' + String((ledger || []).length) + (last ? (' last_hash=' + escapeHtml(String(last.entry_hash || ''))) : ''), 'result');
                        termPrint('<pre>' + escapeHtml(JSON.stringify({ manifest: manifest, ledger_last: last || null }, null, 2).slice(0, 5000)) + '</pre>', 'result');
                    }).catch(function(err) {
                        termPrint('compliance bundle error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (compSub === 'partner') {
                    loadComplianceDoc("policy", true).then(function(policy) {
                        if (!policy) {
                            termPrint('partner identity policy not found', 'warn');
                            return;
                        }
                        termPrint('─── Compliance Partner Identity Policy ───', 'info');
                        termPrint('policy=' + escapeHtml(String(policy.policy_name || 'partner-identity-safety')) + ' owner=' + escapeHtml(String(policy.owner || 'qbitOS/ugrad')), 'result');
                        termPrint('self_disclosure_required=' + String(!!(((policy.rules || {}).self_model_disclosure_required))) + ' human_confirmation=' + String(!!(((policy.rules || {}).human_partner_confirmation_required))), 'result');
                        termPrint('high_risk_phrases=' + String((((policy.rules || {}).high_risk_phrases || []).length)), 'result');
                        termPrint('<pre>' + escapeHtml(JSON.stringify(policy, null, 2).slice(0, 5000)) + '</pre>', 'result');
                    }).catch(function(err) {
                        termPrint('compliance partner error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                termPrint('Unknown compliance subcommand. Use: compliance help', 'error');
                return;
            } else if (cmd === 'xref') {
                var xrefSub = (parts[1] || "help").toLowerCase();
                if (xrefSub === "help") {
                    termPrint('xref commands:', 'info');
                    termPrint('  xref lang <code>');
                    termPrint('  xref country <name>');
                    termPrint('  xref capsule <id>');
                    termPrint('  xref sources');
                    return;
                }
                loadXrefDoc("dictionary").then(function(doc) {
                    if (!doc) {
                        termPrint('xref index not found. Export corpus first: uv run python school/corpus/export_capsules_and_history.py', 'warn');
                        return;
                    }
                    if (xrefSub === "sources") {
                        termPrint('─── Dictionary Sources ───', 'info');
                        (doc.dictionary_sources || []).forEach(function(s) {
                            termPrint('<b style="color:#58a6ff;">' + escapeHtml(s.id || '?') + '</b> ' + escapeHtml(s.status || ''));
                        });
                        return;
                    }
                    if (xrefSub === "lang" && parts.length >= 3) {
                        var lang = parts[2].toLowerCase();
                        var hits = (doc.language_crossref || []).filter(function(r) {
                            return String(r.language || '').toLowerCase() === lang;
                        });
                        termPrint('─── XRef Language: ' + escapeHtml(lang) + ' ───', 'info');
                        if (!hits.length) {
                            termPrint('No language hits', 'warn');
                        } else {
                            hits.forEach(function(h) {
                                termPrint('docs=' + h.docs + ' lang=' + escapeHtml(h.language), 'result');
                            });
                        }
                        return;
                    }
                    if (xrefSub === "country" && parts.length >= 3) {
                        var country = parts.slice(2).join(' ').toLowerCase();
                        var chits = (doc.country_crossref || []).filter(function(r) {
                            return String(r.country || '').toLowerCase() === country;
                        });
                        termPrint('─── XRef Country: ' + escapeHtml(parts.slice(2).join(' ')) + ' ───', 'info');
                        if (!chits.length) {
                            termPrint('No country hits', 'warn');
                        } else {
                            chits.forEach(function(h) {
                                termPrint('docs=' + h.docs + ' country=' + escapeHtml(h.country), 'result');
                            });
                        }
                        return;
                    }
                    if (xrefSub === "capsule" && parts.length >= 3) {
                        var cid = parts[2];
                        var caps = (doc.capsule_bridge || []).filter(function(r) { return String(r.capsule_id || '') === cid; });
                        termPrint('─── XRef Capsule: ' + escapeHtml(cid) + ' ───', 'info');
                        if (!caps.length) {
                            termPrint('No capsule bridge entries', 'warn');
                        } else {
                            caps.forEach(function(c) {
                                termPrint('country=' + escapeHtml(String(c.country || 'n/a')) + ' lang=' + escapeHtml(String(c.language || 'n/a')));
                                termPrint('terms=' + escapeHtml((c.search_terms_sample || []).slice(0, 12).join(', ')));
                            });
                        }
                        return;
                    }
                    termPrint('Unknown xref subcommand. Use: xref help', 'error');
                }).catch(function(err) {
                    termPrint('xref error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                });
                return;
            } else if (cmd === 'booklane') {
                var bookSub = (parts[1] || "help").toLowerCase();
                if (bookSub === "help") {
                    termPrint('booklane commands:', 'info');
                    termPrint('  booklane pull <assetId>');
                    termPrint('  booklane analyze <assetId>');
                    termPrint('  booklane persona <assetId> [json]');
                    termPrint('  booklane xref <assetId>');
                    termPrint('  booklane preflight <assetId>');
                    termPrint('  booklane run <assetId> [json]');
                    return;
                }
                if ((bookSub === "pull" || bookSub === "analyze" || bookSub === "persona" || bookSub === "xref" || bookSub === "preflight" || bookSub === "run") && parts.length < 3) {
                    termPrint('Missing assetId. Usage: booklane ' + bookSub + ' <assetId>', 'warn');
                    return;
                }
                if (bookSub === "pull") {
                    var pullId = parts[2];
                    loadBooklaneDoc("registry", true).then(function(registry) {
                        var rec = (registry || []).find(function(r) { return String(r.asset_id || "") === pullId; }) || null;
                        if (!rec) {
                            termPrint('asset not found in registry: ' + escapeHtml(pullId), 'error');
                            return;
                        }
                        var allowed = governanceAllow(rec);
                        termPrint('─── Booklane Pull: ' + escapeHtml(pullId) + ' ───', 'info');
                        termPrint('rights_status=' + escapeHtml(String(rec.rights_status || 'unknown')) + ' training_allowed=' + String(!!rec.training_allowed), allowed ? 'result' : 'warn');
                        termPrint('<pre>' + escapeHtml("uv run python school/corpus/pull_public_domain_sources.py --asset-id " + pullId) + '</pre>', 'result');
                        termPrint('<pre>' + escapeHtml("uv run python school/corpus/pull_public_domain_sources.py --asset-id " + pullId + " --execute") + '</pre>', 'result');
                        if (!allowed) {
                            termPrint('Governance currently blocks execute pull for this asset. See:', 'warn');
                            termPrint('<pre>' + escapeHtml("uv run python school/corpus/explain_governance.py --asset-id " + pullId) + '</pre>', 'warn');
                        }
                    }).catch(function(err) {
                        termPrint('booklane pull error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (bookSub === "analyze") {
                    var analyzeId = parts[2];
                    buildBooklaneAssetReport(analyzeId).then(function(rpt) {
                        termPrint('─── Booklane Analyze: ' + escapeHtml(analyzeId) + ' ───', 'info');
                        termPrint('governance allow=' + String(!!rpt.governance.allow) + ' rights=' + escapeHtml(String(rpt.governance.rights_status || 'unknown')), rpt.governance.allow ? 'result' : 'warn');
                        var h = rpt.corpus.history_doc || null;
                        if (h) {
                            termPrint('history doc: words=' + String(h.word_count || 0) + ' lang=' + escapeHtml(String(h.language || 'und')) + ' country=' + escapeHtml(String(h.country || 'Unknown')), 'result');
                            termPrint('content_path=' + escapeHtml(String(h.content_path || 'n/a')));
                        } else {
                            termPrint('history doc missing; run export', 'warn');
                        }
                        termPrint('capsule=' + escapeHtml(String(rpt.corpus.capsule_id || 'n/a')) + ' present=' + String(!!rpt.corpus.capsule_present), rpt.corpus.capsule_present ? 'result' : 'warn');
                        if (rpt.persona.override || rpt.persona.capsule_outline) {
                            termPrint('persona attached=true', 'result');
                        } else {
                            termPrint('persona attached=false (use: booklane persona ' + escapeHtml(analyzeId) + ' {"goals":["memory-mindmap"]})', 'warn');
                        }
                    }).catch(function(err) {
                        termPrint('booklane analyze error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (bookSub === "persona") {
                    var personaId = parts[2];
                    var personaJson = trimmed.replace(/^booklane\s+persona\s+\S+\s*/i, '').trim();
                    if (!personaJson) {
                        var current = getBooklanePersonaOverride(personaId);
                        termPrint('booklane persona profile: ' + escapeHtml(personaId), 'info');
                        termPrint('<pre>' + escapeHtml(JSON.stringify(current || {}, null, 2)) + '</pre>', 'result');
                        return;
                    }
                    try {
                        var profile = JSON.parse(personaJson);
                        var outP = applyBooklanePersonaProfile(personaId, profile);
                        if (outP.error) {
                            termPrint('booklane persona error: ' + escapeHtml(outP.error), 'error');
                            return;
                        }
                        termPrint('persona profile attached to ' + escapeHtml(outP.asset_id) + ' capsule=' + escapeHtml(outP.capsule_id) + ' present=' + String(!!outP.capsule_present), 'result');
                    } catch (e) {
                        termPrint('booklane persona JSON parse error: ' + escapeHtml(e.message), 'error');
                    }
                    return;
                }
                if (bookSub === "xref") {
                    var xrefId = parts[2];
                    loadXrefDoc("dictionary").then(function(doc) {
                        var capId = makeBookCapsuleId(xrefId);
                        var hits = (doc && doc.capsule_bridge || []).filter(function(r) { return String(r.capsule_id || "") === capId; });
                        termPrint('─── Booklane XRef: ' + escapeHtml(xrefId) + ' ───', 'info');
                        if (!hits.length) {
                            termPrint('No xref bridge entry for capsule ' + escapeHtml(capId), 'warn');
                            return;
                        }
                        hits.forEach(function(h) {
                            termPrint('country=' + escapeHtml(String(h.country || 'n/a')) + ' lang=' + escapeHtml(String(h.language || 'n/a')), 'result');
                            termPrint('terms=' + escapeHtml((h.search_terms_sample || []).slice(0, 16).join(', ')));
                        });
                    }).catch(function(err) {
                        termPrint('booklane xref error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (bookSub === "preflight") {
                    var preId = parts[2];
                    buildBooklanePreflight(preId).then(function(out) {
                        termPrint('─── Booklane Preflight: ' + escapeHtml(preId) + ' ───', 'info');
                        (out.checks || []).forEach(function(c) {
                            termPrint((c.ok ? 'PASS ' : 'FAIL ') + escapeHtml(String(c.item || '?')), c.ok ? 'result' : 'warn');
                        });
                        termPrint('ready=' + String(!!out.pass), out.pass ? 'result' : 'warn');
                        termPrint('recommended:', 'info');
                        (out.next_commands || []).forEach(function(cmdLine) {
                            termPrint('<pre>' + escapeHtml(String(cmdLine)) + '</pre>', 'result');
                        });
                    }).catch(function(err) {
                        termPrint('booklane preflight error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (bookSub === "run") {
                    var runId = parts[2];
                    var runJson = trimmed.replace(/^booklane\s+run\s+\S+\s*/i, '').trim();
                    var runProfile = null;
                    if (runJson) {
                        try {
                            runProfile = JSON.parse(runJson);
                        } catch (e) {
                            termPrint('booklane run JSON parse error: ' + escapeHtml(e.message), 'error');
                            return;
                        }
                    }
                    window.kbatch.booklane.run(runId, runProfile).then(function(out) {
                        var pre = out && out.preflight ? out.preflight : null;
                        termPrint('─── Booklane Run: ' + escapeHtml(runId) + ' ───', 'info');
                        termPrint('governance_allow=' + String(!!(out && out.before && out.before.governance && out.before.governance.allow)) + ' capsule=' + String(!!(out && out.before && out.before.corpus && out.before.corpus.capsule_present)), 'result');
                        termPrint('persona_attached=' + String(!!(out && out.persona && out.persona.persona_outline)), 'result');
                        termPrint('xref_hits=' + String((out && out.xref ? out.xref.length : 0)), 'result');
                        if (pre) {
                            termPrint('preflight_ready=' + String(!!pre.pass), pre.pass ? 'result' : 'warn');
                            (pre.checks || []).forEach(function(c) {
                                termPrint((c.ok ? 'PASS ' : 'FAIL ') + escapeHtml(String(c.item || '?')), c.ok ? 'result' : 'warn');
                            });
                        }
                        termPrint('<pre>' + escapeHtml(JSON.stringify(out, null, 2).slice(0, 5000)) + '</pre>', 'result');
                    }).catch(function(err) {
                        termPrint('booklane run error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                termPrint('Unknown booklane subcommand. Use: booklane help', 'error');
                return;
            } else if (cmd === 'ugrad') {
                var ugSub = (parts[1] || 'help').toLowerCase();
                if (ugSub === 'help') {
                    termPrint('ugrad commands:', 'info');
                    termPrint('  ugrad games   — list all arena ids (npm-style index)');
                    termPrint('  ugrad <id>    — open arena (e.g. ugrad go \u2192 go-ugrad board)');
                    termPrint('  ugrad open <id>  — same as ugrad <id>');
                    termPrint('  ugrad tensor [text]');
                    termPrint('  ugrad pathlanes [text]');
                    termPrint('  ugrad preflight [text]');
                    termPrint('  ugrad tensor send [env] [steps]');
                    return;
                }
                var UGR = window.UgradGameRegistry;
                if (ugSub === 'games' || ugSub === 'list') {
                    if (!UGR) {
                        termPrint('ugrad-game-registry.js not loaded', 'error');
                        return;
                    }
                    termPrint('\u03bcgrad arenas (registry):', 'info');
                    UGR.GAMES.forEach(function (g) {
                        termPrint('  ' + escapeHtml(g.id) + ' \u2014 ' + escapeHtml(g.title) + ' \xb7 ' + escapeHtml(g.file), 'result');
                    });
                    termPrint('use: ugrad <id>   (e.g. ugrad go)  |  ugrad open <id>  |  HexTerm: ugrad go', 'info');
                    return;
                }
                if (ugSub === 'open') {
                    if (!UGR) {
                        termPrint('ugrad-game-registry.js not loaded', 'error');
                        return;
                    }
                    var openId = parts.slice(2).join(' ').trim();
                    if (!openId) {
                        termPrint('usage: ugrad open <id>', 'error');
                        return;
                    }
                    var openRes = UGR.open(openId, { source: 'kbatch' });
                    if (openRes.ok) {
                        termPrint('opened ' + escapeHtml(openRes.game.file) + ' \u2014 ' + escapeHtml(openRes.game.title), 'result');
                    } else {
                        termPrint(escapeHtml(openRes.error || 'open failed'), 'error');
                    }
                    return;
                }
                if (ugSub === 'tensor' && ((parts[2] || '').toLowerCase() === 'send' || (parts[2] || '').toLowerCase() === 'run')) {
                    if (!UGR) {
                        termPrint('ugrad-game-registry.js not loaded', 'error');
                        return;
                    }
                    var tenEnv = parts[3] || 'go-board';
                    var tenSteps = parseInt(parts[4], 10) || 80;
                    if (UGR.trainTensor(tenEnv, tenSteps)) {
                        termPrint('ugrad-tensor-train ' + escapeHtml(tenEnv) + ' steps ' + tenSteps, 'result');
                    } else {
                        termPrint('ugrad-tensor-train dispatch failed', 'error');
                    }
                    return;
                }
                var reservedUg = { help: 1, games: 1, list: 1, open: 1, tensor: 1, pathlanes: 1, preflight: 1 };
                if (!reservedUg[ugSub] && UGR) {
                    var hitSh = UGR.find(ugSub);
                    if (hitSh) {
                        var openSh = UGR.open(ugSub, { source: 'kbatch' });
                        if (openSh.ok) {
                            termPrint('opened ' + escapeHtml(openSh.game.file) + ' \u2014 ' + escapeHtml(openSh.game.title), 'result');
                        } else {
                            termPrint(escapeHtml(openSh.error || 'open failed'), 'error');
                        }
                        return;
                    }
                }
                var ugText = parts.slice(2).join(' ').trim();
                if (!ugText) ugText = ((document.getElementById('typing-input') || {}).value || '');
                if (ugSub === 'pathlanes') {
                    var ugCaps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(ugText, 12) : [];
                    var lanes = matchGamificationPathlanes(ugText, ugCaps);
                    termPrint('ugrad gamification pathlanes', 'info');
                    lanes.forEach(function(l) {
                        termPrint(escapeHtml(l.id) + ' matched=' + String(!!l.matched) + ' hits=' + escapeHtml((l.hits || []).join(', ')), l.matched ? 'result' : '');
                    });
                    return;
                }
                if (ugSub === 'tensor' || ugSub === 'preflight') {
                    buildUgradTensorEvolutionPacket(ugText).then(function(pkt) {
                        termPrint('ugrad tensor evolution packet ready', 'result');
                        var b = pkt.blockizedRuntime || {};
                        var q = pkt.qbitCodecEvolution || {};
                        termPrint('qbitCodec=' + String(!!q.available) + ' stenoRT=' + String(!!q.stenoRoundTrip) + ' codecRT=' + String(!!q.codecRoundTrip) + ' t5=' + escapeHtml(String(q.t5Lane || 'unknown')), 'result');
                        termPrint('dac=' + String(!!b.dac) + ' ironLine=' + String(!!b.ironLine) + ' prefixes=' + String(!!b.prefixes) + ' preflight=' + String(!!b.preflight), 'result');
                        termPrint('strategy pathlanes=' + String((pkt.gamificationStrategyDirectory && pkt.gamificationStrategyDirectory.pathlaneMatches || []).filter(function(x){return x.matched;}).length), 'result');
                        termPrint('<pre>' + escapeHtml(JSON.stringify(pkt, null, 2).slice(0, 5000)) + '</pre>', 'result');
                        publishToEcosystem('kbatch-ugrad-tensor-evolution', pkt, ['kbatch-training', 'ugrad-training', 'iron-line', 'uterm-notes', 'quantum-prefixes']);
                    }).catch(function(err) {
                        termPrint('ugrad error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                termPrint('Unknown ugrad subcommand. Try: ugrad games  |  ugrad go  |  ugrad help', 'error');
                return;
            } else if (cmd === 'stream') {
                var streamSub = (parts[1] || "help").toLowerCase();
                if (streamSub === "help") {
                    termPrint('stream commands:', 'info');
                    termPrint('  stream status');
                    termPrint('  stream assets');
                    termPrint('  stream xref <assetId>');
                    termPrint('  stream preflight');
                    termPrint('  stream pulse');
                    return;
                }
                if (streamSub === "preflight") {
                    loadStreamDoc("preflight", true).then(function(doc) {
                        if (!doc) {
                            termPrint('stream preflight not found. Run: uv run python school/corpus/stream_preflight.py --execute-pulse', 'warn');
                            return;
                        }
                        termPrint('─── Stream Preflight ───', 'info');
                        termPrint('mistral_vibe_ready=' + String(!!doc.mistral_vibe_ready), doc.mistral_vibe_ready ? 'result' : 'warn');
                        (doc.checklist || []).forEach(function(item) {
                            var mark = item.ok ? 'PASS' : 'FAIL';
                            termPrint(mark + ' ' + escapeHtml(String(item.item || '?')), item.ok ? 'result' : 'warn');
                        });
                        if (Array.isArray(doc.next_commands) && doc.next_commands.length) {
                            termPrint('recommended commands:', 'info');
                            doc.next_commands.slice(0, 4).forEach(function(cmd) {
                                termPrint('<pre>' + escapeHtml(String(cmd)) + '</pre>', 'result');
                            });
                        }
                        if (doc.next_command) {
                            termPrint('next:', 'info');
                            termPrint('<pre>' + escapeHtml(String(doc.next_command)) + '</pre>', 'result');
                        }
                    }).catch(function(err) {
                        termPrint('stream preflight error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (streamSub === "pulse") {
                    refreshStreamHeartbeatUI().then(function(s) {
                        var idx = s && s.exportIndex && s.exportIndex.counts ? s.exportIndex.counts : {};
                        termPrint('stream heartbeat refreshed: assets=' + (idx.stream_assets_scanned || 0) + ' snapshots=' + (idx.stream_snapshots_scanned || 0), 'result');
                    }).catch(function(err) {
                        termPrint('stream pulse error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (streamSub === "status") {
                    loadStreamDoc("index").then(function(doc) {
                        if (!doc) {
                            termPrint('stream index not found. Run: uv run python school/corpus/stream_export.py', 'warn');
                            return;
                        }
                        termPrint('─── Stream Lane Status ───', 'info');
                        var c = doc.counts || {};
                        termPrint('assets=' + (c.stream_assets_scanned || 0) + ' snapshots=' + (c.stream_snapshots_scanned || 0), 'result');
                        termPrint('capsules=' + (c.stream_capsules || 0) + ' history_docs=' + (c.stream_history_docs || 0), 'result');
                        var exports = doc.exports || {};
                        termPrint('capsules_delta=' + escapeHtml(exports.stream_capsules_delta_json || 'n/a'));
                        termPrint('history_docs=' + escapeHtml(exports.stream_history_docs_jsonl || 'n/a'));
                    }).catch(function(err) {
                        termPrint('stream status error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (streamSub === "assets") {
                    loadStreamDoc("capsules").then(function(doc) {
                        if (!doc || !doc.length) {
                            termPrint('no stream capsules exported yet', 'warn');
                            return;
                        }
                        termPrint('─── Stream Capsules ───', 'info');
                        doc.slice(0, 24).forEach(function(c) {
                            var meta = c.meta || {};
                            termPrint('<b style="color:#22a06b;">' + escapeHtml(c.id || '?') + '</b> snapshots=' + String(meta.snapshot_count || 0));
                        });
                    }).catch(function(err) {
                        termPrint('stream assets error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (streamSub === "xref" && parts.length >= 3) {
                    var assetId = parts[2];
                    loadStreamDoc("capsules").then(function(doc) {
                        var target = (doc || []).find(function(c) {
                            var entityId = ((c.meta || {}).entity_id || "");
                            return entityId === assetId || String(c.id || "") === assetId;
                        });
                        if (!target) {
                            termPrint('stream capsule not found for asset: ' + escapeHtml(assetId), 'warn');
                            return;
                        }
                        var m = target.meta || {};
                        termPrint('─── Stream XRef: ' + escapeHtml(String(m.entity_id || target.id || '?')) + ' ───', 'info');
                        termPrint('type=' + escapeHtml(String(m.asset_type || 'stream')) + ' snapshots=' + String(m.snapshot_count || 0), 'result');
                        termPrint('source=' + escapeHtml(String(m.source_url || 'n/a')));
                        termPrint('terms=' + escapeHtml((target.words || []).slice(0, 18).join(', ')));
                    }).catch(function(err) {
                        termPrint('stream xref error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                termPrint('Unknown stream subcommand. Use: stream help', 'error');
                return;
            } else if (cmd === 'bridge') {
                var bridgeSub = (parts[1] || "help").toLowerCase();
                if (bridgeSub !== "graph") {
                    termPrint('bridge commands: bridge graph', 'info');
                    return;
                }
                loadXrefDoc("bridge").then(function(doc) {
                    if (!doc) {
                        termPrint('bridge graph not found. Export corpus first: uv run python school/corpus/export_capsules_and_history.py', 'warn');
                        return;
                    }
                    termPrint('─── Bridge Graph ───', 'info');
                    termPrint('nodes=' + (doc.nodes || []).length + ' edges=' + (doc.edges || []).length, 'result');
                    (doc.edges || []).slice(0, 12).forEach(function(e) {
                        termPrint(escapeHtml(String(e.source || '?')) + ' -> ' + escapeHtml(String(e.target || '?')) + ' (w=' + String(e.weight || 0) + ')');
                    });
                }).catch(function(err) {
                    termPrint('bridge error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                });
                return;
            } else if (cmd === 'vendorbench' || cmd === 'llmbench') {
                var vbSub = (parts[1] || "help").toLowerCase();
                if (vbSub === "help") {
                    termPrint('vendorbench commands:', 'info');
                    termPrint('  vendorbench list [modelId]');
                    termPrint('  vendorbench providers [modelId]');
                    termPrint('  vendorbench last [modelId]');
                    termPrint('  note: vendorbench is provider-agnostic (OpenAI-compatible + local endpoints)');
                    return;
                }
                if (vbSub === "list" || vbSub === "providers" || vbSub === "last") {
                    var vbModel = parts.slice(2).join(" ").trim();
                    printVendorBenchCommands(
                        window._kbLastCodestralExportFile || "kbatch-codestral-structured_data-<ts>.json",
                        vbModel || "<model-id>",
                        "vendorbench provider-agnostic commands"
                    ).catch(function(err) {
                        termPrint('vendorbench error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                termPrint('Unknown vendorbench subcommand. Use: vendorbench help', 'error');
                return;
            } else if (cmd === 'mistralbench') {
                var mbSub = (parts[1] || "help").toLowerCase();
                if (mbSub === "help") {
                    termPrint('mistralbench commands:', 'info');
                    termPrint('  mistralbench export [text] [mode]');
                    termPrint('  mistralbench run [text] [mode]');
                    termPrint('  mistralbench last');
                    termPrint('  mistralbench vendors [modelId] (legacy alias)');
                    termPrint('  mode: simple_response | structured_data | classification | entity_extraction');
                    return;
                }
                if (mbSub === "last") {
                    if (!window._kbLastCodestralExportFile) {
                        termPrint('No exported packet yet. Run: mistralbench export <text> [mode]', 'warn');
                        return;
                    }
                    var lastCmd = window._kbLastMistralBenchCmd || buildMistralBenchCommand(window._kbLastCodestralExportFile);
                    termPrint('latest packet: <b style="color:#58a6ff;">' + window._kbLastCodestralExportFile + '</b>', 'info');
                    termPrint('<pre>' + escapeHtml(lastCmd) + '</pre>', 'result');
                    return;
                }
                if (mbSub === "vendors") {
                    var vendModel = parts.slice(2).join(" ").trim();
                    termPrint('mistralbench vendors is legacy. Use: vendorbench list ' + escapeHtml(vendModel || "<model-id>"), 'warn');
                    printVendorBenchCommands(
                        window._kbLastCodestralExportFile || "kbatch-codestral-structured_data-<ts>.json",
                        vendModel || "<model-id>",
                        "vendorbench provider-agnostic commands"
                    ).catch(function(err) {
                        termPrint('mistralbench vendors error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (mbSub === "export" || mbSub === "run") {
                    var mbMode = (parts[parts.length - 1] || "").toLowerCase();
                    var mbHasMode = !!CODESTRAL_SCHEMA_TEMPLATES[mbMode];
                    var mbText = mbHasMode ? parts.slice(2, parts.length - 1).join(" ") : parts.slice(2).join(" ");
                    var mbChosenMode = mbHasMode ? mbMode : "structured_data";
                    if (!mbText) mbText = ((document.getElementById('typing-input') || {}).value || '');
                    var outBench = exportCodestralPacketForBench(mbText, mbChosenMode);
                    termPrint('mistralbench packet exported: <b style="color:#22a06b;">' + outBench.file + '</b>', 'result');
                    termPrint('copy/paste command:', 'info');
                    termPrint('<pre>' + escapeHtml(outBench.cmd) + '</pre>', 'result');
                    return;
                }
                termPrint('Unknown mistralbench subcommand. Use: mistralbench help', 'error');
                return;
            } else if (cmd === 'codestral') {
                var sub = (parts[1] || "help").toLowerCase();
                if (sub === "help") {
                    termPrint('codestral lane commands:', 'info');
                    termPrint('  codestral schema [simple_response|structured_data|classification|entity_extraction]');
                    termPrint('  codestral packet [text] [mode]');
                    termPrint('  codestral prompt [text] [mode]');
                    termPrint('  codestral export [text] [mode]');
                    termPrint('  notes: output is JSON-schema aligned for AI Studio / structured response format');
                    return;
                }
                if (sub === "schema") {
                    var schemaName = (parts[2] || "structured_data").toLowerCase();
                    var schema = CODESTRAL_SCHEMA_TEMPLATES[schemaName];
                    if (!schema) {
                        termPrint('Unknown schema template: ' + schemaName, 'error');
                        return;
                    }
                    termPrint('codestral schema: <b style="color:#58a6ff;">' + schemaName + '</b>', 'info');
                    termPrint('<pre>' + escapeHtml(JSON.stringify(schema, null, 2)) + '</pre>', 'result');
                    return;
                }
                if (sub === "packet" || sub === "prompt" || sub === "export") {
                    var mode = (parts[parts.length - 1] || "").toLowerCase();
                    var hasMode = !!CODESTRAL_SCHEMA_TEMPLATES[mode];
                    var textStart = 2;
                    var userText = hasMode ? parts.slice(textStart, parts.length - 1).join(" ") : parts.slice(textStart).join(" ");
                    var chosenMode = hasMode ? mode : "structured_data";
                    var packet = buildCodestralPacket(userText, chosenMode);
                    window._kbLastCodestralPacket = packet;
                    if (sub === "packet") {
                        termPrint('codestral packet ready: mode=<b style="color:#a855f7;">' + packet.mode + '</b> chars=' + packet.input.text.length + ' capsules=' + packet.input.capsules.length, 'result');
                        termPrint('<pre>' + escapeHtml(JSON.stringify(packet, null, 2).slice(0, 4000)) + '</pre>', 'result');
                        return;
                    }
                    if (sub === "prompt") {
                        termPrint('codestral prompt lane', 'info');
                        termPrint('<b>system</b>: ' + escapeHtml(packet.prompts.system));
                        termPrint('<b>user</b>: ' + escapeHtml(packet.prompts.user));
                        termPrint('<b>schema</b>: ' + escapeHtml(packet.mode) + ' (' + Object.keys(packet.schema.properties || {}).length + ' fields)');
                        return;
                    }
                    var ts = Date.now();
                    var exportedFile = 'kbatch-codestral-' + packet.mode + '-' + ts + '.json';
                    downloadJson(exportedFile, packet);
                    window._kbLastCodestralExportFile = exportedFile;
                    window._kbLastMistralBenchCmd = buildMistralBenchCommand(exportedFile);
                    termPrint('exported codestral packet JSON (' + packet.mode + ')', 'result');
                    return;
                }
                termPrint('Unknown codestral subcommand. Use: codestral help', 'error');
                return;
            } else if (cmd === 'trainer') {
                var trainerSub = (parts[1] || 'plan').toLowerCase();
                if (trainerSub === 'plan') {
                    termPrint('kbatch trainer pipeline:', 'info');
                    termPrint('  1) ingestion connectors');
                    termPrint('  2) OCR/transcription normalize');
                    termPrint('  3) embeddings/vector DB');
                    termPrint('  4) capsule compiler');
                    termPrint('  5) trainer/eval loop');
                    termPrint('Runtime action: run 34_kbatch_trainer_lane (on onboarding command surface)');
                    return;
                }
                if (trainerSub === 'packet') {
                    var srcText = parts.length >= 3 ? parts.slice(2).join(' ') : ((document.getElementById('typing-input') || {}).value || '');
                    var bench = window.kbatch && window.kbatch.stack ? window.kbatch.stack.benchmark(srcText) : null;
                    var capsuleMatches = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(srcText, 8) : [];
                    var trainerPacket = {
                        version: '0.1.0',
                        source: 'kbatch.trainer',
                        stages: ['ingestion_connectors','ocr_transcription_normalize','embeddings_vector_db','capsule_compiler','trainer_eval_loop'],
                        input: {
                            text: srcText,
                            stack: bench || null,
                            capsules: (capsuleMatches || []).slice(0, 5).map(function(c){ return { id: c.id, name: c.name, category: c.cat }; })
                        },
                        ts: Date.now()
                    };
                    window._kbLastTrainerPacket = trainerPacket;
                    termPrint('trainer packet prepared (' + srcText.length + ' chars, ' + trainerPacket.input.capsules.length + ' capsule refs)', 'result');
                    termPrint('<pre>' + escapeHtml(JSON.stringify(trainerPacket, null, 2).slice(0, 4000)) + '</pre>', 'result');
                    return;
                }
                termPrint('Unknown trainer subcommand. Use: trainer plan | trainer packet <text>', 'error');
                return;
            } else if (cmd === 'persona') {
                var personaSub = (parts[1] || 'help').toLowerCase();
                if (personaSub === 'help') {
                    termPrint('persona commands:', 'info');
                    termPrint('  persona prompt [text]');
                    termPrint('  persona outline [text]');
                    termPrint('  persona chain [text]');
                    termPrint('  persona expand [text]');
                    termPrint('  persona models [text]');
                    termPrint('  persona ik');
                    termPrint('  persona media');
                    termPrint('  persona rndr [status|token <value>|endpoint <url>]');
                    termPrint('  persona summary');
                    return;
                }
                if (personaSub === 'summary') {
                    var summary = window.kbatch && window.kbatch.persona && window.kbatch.persona.summary
                        ? window.kbatch.persona.summary()
                        : null;
                    if (!summary) {
                        termPrint('persona summary unavailable (PersonaContext not loaded)', 'warn');
                    } else {
                        termPrint('<pre>' + escapeHtml(JSON.stringify(summary, null, 2).slice(0, 4000)) + '</pre>', 'result');
                    }
                    return;
                }
                if (personaSub === 'prompt') {
                    var personaPromptText = parts.slice(2).join(' ').trim();
                    if (!personaPromptText) {
                        termPrint('Persona prompt language:', 'info');
                        termPrint('<pre>' + escapeHtml(getPersonaPromptLanguage()) + '</pre>', 'result');
                    } else {
                        var appliedPersonaPrompt = setPersonaPromptLanguage(personaPromptText);
                        termPrint('Persona prompt language updated (' + appliedPersonaPrompt.length + ' chars)', 'result');
                    }
                    return;
                }
                if (personaSub === 'outline') {
                    var personaText = parts.slice(2).join(' ').trim();
                    if (!personaText) personaText = ((document.getElementById('typing-input') || {}).value || '');
                    var personaBench = window.kbatch && window.kbatch.stack ? window.kbatch.stack.benchmark(personaText) : null;
                    var personaCaps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(personaText, 8) : [];
                    var personaCtx = (personaCaps || []).slice(0, 5).map(function(c) {
                        return { id: c.id, name: c.name, category: c.cat, words: (c.words || []).slice(0, 12) };
                    });
                    var personaContrail = buildContrailInjection(personaText, personaCtx, personaBench);
                    var outline = buildPersonaOutlineContext(personaText, personaCtx, personaBench, personaContrail);
                    termPrint('persona outline lane', 'info');
                    termPrint('<pre>' + escapeHtml(JSON.stringify(outline, null, 2).slice(0, 4000)) + '</pre>', 'result');
                    publishToEcosystem('kbatch-persona-outline', {
                        outline: outline,
                        ts: Date.now()
                    }, ['history-search', 'iron-line', 'kbatch-training', 'uterm-notes']);
                    return;
                }
                if (personaSub === 'chain' || personaSub === 'expand') {
                    var chainText = parts.slice(2).join(' ').trim();
                    if (!chainText) chainText = ((document.getElementById('typing-input') || {}).value || '');
                    buildPersonaChainReport(chainText).then(function(report) {
                        termPrint('persona chain expansion complete', 'result');
                        termPrint('coverage=' + escapeHtml(report.chainCoverage.join(', ')), 'info');
                        var ch = report.chains || {};
                        termPrint('musica bpm=' + ((ch.musica || {}).bpm || 0) + ' qBPM=' + ((ch.musica || {}).qBPM || 0) + ' qHz=' + ((ch.musica || {}).qHz || 0), 'result');
                        termPrint('capsules matched=' + ((ch.capsule || {}).matched || 0) + ' wordHits=' + ((ch.capsule || {}).wordHits || 0), 'result');
                        termPrint('archetypes=' + (((ch.foundationModels || {}).archetypes || []).map(function(a) { return a.id + ":" + a.score; }).join(', ') || 'none'), 'result');
                        termPrint('ik pose=' + String(!!(((ch.multimodal || {}).ikPose || {}).poseEstimation)) + ' tracking=' + String(!!(((ch.multimodal || {}).ikPose || {}).tracking)) + ' ikSolver=' + String(!!(((ch.multimodal || {}).ikPose || {}).ikSolver)) + ' 3d=' + String(!!(((ch.multimodal || {}).ikPose || {}).modelAttachment3D)), 'result');
                        termPrint('blockized dac=' + String(!!((ch.blockized || {}).dac)) + ' preflight=' + String(!!((ch.blockized || {}).preflight)) + ' t5=' + escapeHtml(String((ch.blockized || {}).t5Lane || 'unknown')), 'result');
                        termPrint('rndr endpoint=' + escapeHtml(String((ch.rndrGsplat || {}).endpoint || 'https://canvas.otoy.ai')) + ' token=' + String(!!((ch.rndrGsplat || {}).tokenConfigured)) + ' gsplat=' + escapeHtml(String((ch.rndrGsplat || {}).gsplatPlayer || 'pending')), 'result');
                        termPrint('dictionary sources=' + ((ch.dictionary || {}).sources || 0) + ' bridge nodes=' + ((ch.bridge || {}).nodes || 0) + ' edges=' + ((ch.bridge || {}).edges || 0), 'result');
                        termPrint('stream assets=' + ((ch.stream || {}).assets || 0) + ' snapshots=' + ((ch.stream || {}).snapshots || 0), 'result');
                        termPrint('<pre>' + escapeHtml(JSON.stringify(report, null, 2).slice(0, 5000)) + '</pre>', 'result');
                        publishToEcosystem('kbatch-persona-outline', {
                            outline: ch.persona || null,
                            chainReport: report,
                            source: 'persona.chain',
                            ts: Date.now()
                        }, ['history-search', 'iron-line', 'kbatch-training', 'uterm-notes', 'quantum-prefixes']);
                        publishToEcosystem('kbatch-contrail-prompt-injection', {
                            mode: 'structured_data',
                            input: (ch.searchHistoryPacket || {}).input || null,
                            prompts: (ch.searchHistoryPacket || {}).prompts || null,
                            ts: Date.now()
                        }, ['iron-line', 'kbatch-training', 'uterm-notes', 'quantum-prefixes', 'history-search']);
                        publishToEcosystem('kbatch-persona-multimodal-chain', {
                            foundationModels: ch.foundationModels || null,
                            multimodal: ch.multimodal || null,
                            rndrGsplat: ch.rndrGsplat || null,
                            blockized: ch.blockized || null,
                            ts: Date.now()
                        }, ['history-search', 'iron-line', 'kbatch-training', 'uterm-notes', 'quantum-prefixes']);
                    }).catch(function(err) {
                        termPrint('persona chain error: ' + escapeHtml(err && err.message ? err.message : String(err)), 'error');
                    });
                    return;
                }
                if (personaSub === 'models') {
                    var modelText = parts.slice(2).join(' ').trim();
                    if (!modelText) modelText = ((document.getElementById('typing-input') || {}).value || '');
                    var modelCaps = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(modelText, 8) : [];
                    var modelCtx = (modelCaps || []).slice(0, 6).map(function(c) { return { words: (c.words || []).slice(0, 8) }; });
                    var archetypes = inferPersonaArchetypes(modelText, modelCtx);
                    var payload = {
                        frameworks: PERSONA_FRAMEWORKS.slice(),
                        psychologicalGroundTruth: PERSONA_PSYCHOLOGICAL_FRAMEWORKS,
                        dataSourceTypes: PERSONA_DATA_SOURCE_TYPES.slice(),
                        methodologies: PERSONA_METHODS.slice(),
                        behavioralPolicies: PERSONA_BEHAVIOR_POLICIES,
                        archetypes: archetypes,
                        modelFamilies: ["text-foundation", "multimodal-foundation", "retrieval-augmented", "governance-aware", "persona-adaptive"]
                    };
                    termPrint('persona model registry', 'info');
                    termPrint('<pre>' + escapeHtml(JSON.stringify(payload, null, 2).slice(0, 4000)) + '</pre>', 'result');
                    return;
                }
                if (personaSub === 'ik') {
                    var ik = buildMultimodalComponentStatus().ikPose || {};
                    termPrint('persona IK / pose / tracking', 'info');
                    termPrint('poseEstimation=' + String(!!ik.poseEstimation) + ' tracking=' + String(!!ik.tracking) + ' ikSolver=' + String(!!ik.ikSolver) + ' modelAttachment3D=' + String(!!ik.modelAttachment3D), 'result');
                    termPrint('<pre>' + escapeHtml(JSON.stringify(ik, null, 2)) + '</pre>', 'result');
                    return;
                }
                if (personaSub === 'media') {
                    var media = buildMultimodalComponentStatus();
                    termPrint('persona media pipeline', 'info');
                    termPrint('video=' + String(!!(media.pipelines || {}).video) + ' image=' + String(!!(media.pipelines || {}).image) + ' audio=' + String(!!(media.pipelines || {}).audio) + ' stream=' + String(!!(media.pipelines || {}).streamLane), 'result');
                    termPrint('<pre>' + escapeHtml(JSON.stringify(media, null, 2).slice(0, 4000)) + '</pre>', 'result');
                    return;
                }
                if (personaSub === 'rndr') {
                    var action = (parts[2] || 'status').toLowerCase();
                    if (action === 'token') {
                        var token = parts.slice(3).join(' ').trim();
                        if (!token) {
                            termPrint('Usage: persona rndr token <token>', 'warn');
                            return;
                        }
                        var cfgToken = setRndrConfig({ token: token });
                        var payloadToken = rndrStatusPayload();
                        termPrint('RNDR token saved (local)', 'result');
                        termPrint('endpoint=' + escapeHtml(cfgToken.endpoint) + ' tokenConfigured=' + String(payloadToken.tokenConfigured), 'result');
                        return;
                    }
                    if (action === 'endpoint') {
                        var endpoint = parts.slice(3).join(' ').trim();
                        if (!endpoint) {
                            termPrint('Usage: persona rndr endpoint <url>', 'warn');
                            return;
                        }
                        var cfgEndpoint = setRndrConfig({ endpoint: endpoint });
                        termPrint('RNDR endpoint updated: ' + escapeHtml(cfgEndpoint.endpoint), 'result');
                        return;
                    }
                    var rndr = rndrStatusPayload();
                    termPrint('RNDR / gsplat prep status', 'info');
                    termPrint('endpoint=' + escapeHtml(rndr.endpoint) + ' tokenConfigured=' + String(rndr.tokenConfigured) + ' gsplat=' + escapeHtml(rndr.gsplatPlayer), 'result');
                    termPrint('webgl=' + String(rndr.webgl) + ' webgpu=' + String(rndr.webgpu), 'result');
                    termPrint('<pre>' + escapeHtml(JSON.stringify(rndr, null, 2)) + '</pre>', 'result');
                    publishToEcosystem('kbatch-rndr-config', {
                        status: rndr,
                        ts: Date.now()
                    }, ['history-search', 'iron-line', 'kbatch-training']);
                    return;
                }
                termPrint('Unknown persona subcommand. Use: persona help', 'error');
                return;
            } else if (cmd === 'contrail') {
                var contrailSub = (parts[1] || 'help').toLowerCase();
                if (contrailSub === 'help') {
                    termPrint('contrail commands:', 'info');
                    termPrint('  contrail xref <capsuleId> [n]');
                    termPrint('  contrail prompt [text]');
                    termPrint('  contrail inject [text] [mode]');
                    return;
                }
                if (contrailSub === 'xref' && parts.length >= 3) {
                    var capsuleId = parts[2];
                    var limit = parts.length >= 4 ? parseInt(parts[3], 10) : 10;
                    var out = crossReferenceCapsuleContrails(capsuleId, limit);
                    if (out.error) {
                        termPrint('Contrail xref error: ' + out.error, 'error');
                        return;
                    }
                    termPrint('─── Contrail XRef: ' + out.capsuleId + ' ───', 'info');
                    termPrint('typed trace: <span style="color:#a78bfa;">' + (out.typedTrace || '—') + '</span>');
                    out.matches.forEach(function(m, idx) {
                        termPrint((idx + 1) + '. <b style="color:#f0883e;">' + m.word + '</b> score=' + m.score + '% path=' + (m.path || '—'));
                    });
                    return;
                }
                if (contrailSub === 'prompt') {
                    var promptText = parts.slice(2).join(' ').trim();
                    if (!promptText) {
                        termPrint('Contrail prompt language:', 'info');
                        termPrint('<pre>' + escapeHtml(getContrailPromptLanguage()) + '</pre>', 'result');
                    } else {
                        var applied = setContrailPromptLanguage(promptText);
                        termPrint('Contrail prompt language updated (' + applied.length + ' chars)', 'result');
                    }
                    return;
                }
                if (contrailSub === 'inject') {
                    var lastTok = (parts[parts.length - 1] || '').toLowerCase();
                    var hasMode = !!CODESTRAL_SCHEMA_TEMPLATES[lastTok];
                    var modeName = hasMode ? lastTok : 'structured_data';
                    var payloadText = hasMode ? parts.slice(2, parts.length - 1).join(' ') : parts.slice(2).join(' ');
                    if (!payloadText) payloadText = ((document.getElementById('typing-input') || {}).value || '');
                    var packet = buildCodestralPacket(payloadText, modeName);
                    publishToEcosystem('kbatch-contrail-prompt-injection', {
                        mode: packet.mode,
                        input: packet.input,
                        prompts: packet.prompts,
                        ts: packet.ts
                    }, ['iron-line', 'kbatch-training', 'uterm-notes', 'quantum-prefixes']);
                    publishToEcosystem('kbatch-persona-outline', {
                        persona: packet.input && packet.input.persona ? packet.input.persona : null,
                        source: 'contrail.inject',
                        ts: packet.ts
                    }, ['history-search', 'iron-line', 'kbatch-training', 'uterm-notes']);
                    termPrint('Injected contrail prompt packet: mode=<b style="color:#a855f7;">' + packet.mode + '</b> chars=' + packet.input.text.length + ' capsules=' + packet.input.capsules.length, 'result');
                    return;
                }
                termPrint('Unknown contrail subcommand. Use: contrail help', 'error');
                return;
            } else if (cmd === 'analyze' && parts.length >= 2) {
                const word = parts.slice(1).join(' ');
                const a = kbatch.analyze(word);
                termPrint(`"${word}" \u2014 Eff: <b style="color:#7ee787;">${a.efficiency.toFixed(1)}%</b> | Cpx: <b style="color:#f97583;">${a.complexity.toFixed(1)}%</b> | Dist: ${a.distance.toFixed(2)} | Path: ${a.path}`);
            } else if (cmd === 'process' && parts.length >= 2) {
                kbatch.processText(parts.slice(1).join(' '));
                termPrint(`Processed ${parts.slice(1).join(' ').length} characters`, 'result');
            } else if (cmd === 'bench') {
                const sample = parts.length >= 2
                    ? parts.slice(1).join(' ')
                    : ((document.getElementById('typing-input') || {}).value || '');
                const bench = window.kbatch.stack.benchmark(sample);
                termPrint('\u2500\u2500\u2500 kbatch stack benchmark \u2500\u2500\u2500', 'info');
                termPrint(`Input: ${sample.length || 0} chars`);
                termPrint(`Gluelam: <b style="color:${bench.gluelam ? '#22a06b' : '#f97583'};">${bench.gluelam ? 'online' : 'degraded'}</b>`);
                termPrint(`T5 lane: <b style="color:#58a6ff;">${bench.t5}</b>`);
                termPrint(`Lang support: <b style="color:${bench.languageSupport.ready ? '#22a06b' : '#f97583'};">${bench.languageSupport.total}/${bench.languageSupport.target}</b> (${bench.languageSupport.sample.join(', ')})`);
                termPrint(`Gutter coverage: <b style="color:#a855f7;">${bench.quantumGutterCoverage.toFixed(1)}%</b>`);
                termPrint(`Pattern: words=${bench.patternAnalysis.words} eff=${bench.patternAnalysis.avgEfficiency}% cpx=${bench.patternAnalysis.avgComplexity}% dist=${bench.patternAnalysis.avgDistance} rsi=${bench.patternAnalysis.avgRsiRisk}`);
                termPrint(`Capsules: matched <b style="color:#f59e0b;">${bench.capsules.matched}</b> / ${bench.capsules.total}, word hits=${bench.capsules.wordHits}`);
                if (bench.capsules.topMatches.length) termPrint(`Top capsules: ${bench.capsules.topMatches.map(c => c.id + '(' + c.hits + ')').join(', ')}`);
                termPrint(`Contrail flow: ${(bench.contrail.flow || '—').slice(0, 40)} | Musica: ${(bench.contrail.musica || '—').slice(0, 40)}`);
                termPrint(`Code style as music: ${(bench.codeStyleAsMusic || '—').slice(0, 120)}`);
                termPrint(`Musica engine: <b style="color:#1f5b9b;">${bench.musicaEngine.bpm} BPM</b> | <b style="color:#7c3aed;">${bench.musicaEngine.qBPM} qBPM</b> (${bench.musicaEngine.qHz} QHz, ${bench.musicaEngine.nsPerLine} ns/line, ${bench.musicaEngine.calibrationLane})`);
                termPrint(`Steno RT: <b style="color:${bench.stenoRoundTrip ? '#22a06b' : '#f97583'};">${bench.stenoRoundTrip ? 'pass' : 'fail'}</b> | Codec RT: <b style="color:${bench.codecRoundTrip ? '#22a06b' : '#f97583'};">${bench.codecRoundTrip ? 'pass' : 'fail'}</b>`);
                termPrint(`Stage timings: prefix ${bench.timings.prefixMs}ms | steno ${bench.timings.stenoMs}ms | codec ${bench.timings.codecMs}ms | pattern ${bench.timings.patternMs}ms | capsules ${bench.timings.capsulesMs}ms | iron-line ${bench.timings.ironLineMs}ms`);
                termPrint(`Total: <b style="color:#1f5b9b;">${bench.totalMs.toFixed(3)}ms</b>`, 'result');
                refreshStackIndicators();
            } else if (cmd === 'fontlab') {
                const QC = window.qbitCodec;
                if (!QC || !QC.liveFontFaceAnalyze) {
                    termPrint('FontLab detector unavailable: qbitCodec live font lane missing', 'error');
                    return;
                }
                const sub = (parts[1] || '').toLowerCase();
                if (sub === 'help') {
                    termPrint('fontlab usage:', 'info');
                    termPrint('  fontlab [text]');
                    termPrint('  fontlab fabricate [plotter|printer3d|both] [text]');
                    termPrint('  fontlab last');
                    termPrint('  fontlab compile [text]');
                    termPrint('  fontlab pack');
                    return;
                }
                if (sub === 'last') {
                    const last = window.kbatch && window.kbatch.fontlab ? window.kbatch.fontlab.last() : null;
                    if (!last) { termPrint('No fontlab packet yet. Run: fontlab <text>', 'warn'); return; }
                    const fc = last.font && last.font.coverage ? last.font.coverage : {};
                    const st = last.stroke || {};
                    const sty = st.style || {};
                    termPrint('\u2500\u2500\u2500 FontLab Last Packet \u2500\u2500\u2500', 'info');
                    termPrint(`coverage: <b style="color:#a855f7;">${fc.coveragePct != null ? fc.coveragePct + '%' : 'n/a'}</b> (${fc.supported || 0}/${fc.required || 0})`);
                    termPrint(`style: <b style="color:#58a6ff;">${sty.label || 'unknown'}</b> score=${sty.score != null ? sty.score : 'n/a'} strokes=${st.strokeCount || 0} points=${st.pointCount || 0}`);
                    if (last.fabrication && last.fabrication.routed && last.fabrication.routed.length) {
                        termPrint(`fabrication routed: ${last.fabrication.routed.join(', ')}`, 'result');
                    }
                    return;
                }
                if (sub === 'pack') {
                    const pack = window.kbatch && window.kbatch.fontlab ? window.kbatch.fontlab.lastPack() : null;
                    if (!pack) { termPrint('No compiled font pack yet. Run: fontlab compile <text>', 'warn'); return; }
                    const cov = (((pack || {}).font || {}).coverage) || {};
                    const layouts = pack.layouts || [];
                    const mc = pack.multicast || {};
                    termPrint('\u2500\u2500\u2500 FontLab Compiled Pack \u2500\u2500\u2500', 'info');
                    termPrint(`id: <b style="color:#58a6ff;">${pack.id}</b> | name: ${pack.name}`);
                    termPrint(`glyphs: ${Array.isArray(pack.glyphs) ? pack.glyphs.length : 0} | layouts: ${layouts.length}`);
                    termPrint(`coverage: <b style="color:#a855f7;">${cov.coveragePct != null ? cov.coveragePct + '%' : 'n/a'}</b> (${cov.supported || 0}/${cov.required || 0})`);
                    termPrint(`capsule xref hits: <b style="color:#f59e0b;">${window._kbatchFontLabXrefCount || 0}</b> / ${CAPSULES.length}`);
                    if (mc.routed && mc.routed.length) termPrint(`multicast routed: ${mc.routed.join(', ')}`, 'result');
                    return;
                }
                if (sub === 'compile') {
                    const text = parts.length >= 3
                        ? parts.slice(2).join(' ')
                        : ((document.getElementById('typing-input') || {}).value || '');
                    if (!text) {
                        termPrint('No text provided. Use: fontlab compile <text>', 'warn');
                        return;
                    }
                    const pack = window.kbatch.fontlab.compile(text, {
                        source: 'kbatch-fontlab-compile-terminal',
                        target: 'qbit_roman_math_core',
                        channels: ['iron-line', 'quantum-prefixes', 'kbatch-training', 'hexterm']
                    });
                    if (!pack) {
                        termPrint('Font compiler unavailable: qbitCodec.compileFontPack missing', 'error');
                        return;
                    }
                    const cov = (((pack || {}).font || {}).coverage) || {};
                    const verdict = (((pack || {}).pipeline || {}).safetyVerdict) || 'n/a';
                    termPrint('\u2500\u2500\u2500 Font Compiler \u2500\u2500\u2500', 'info');
                    termPrint(`pack: <b style="color:#58a6ff;">${pack.id}</b> | layouts=${(pack.layouts || []).length} | glyphs=${(pack.glyphs || []).length}`);
                    termPrint(`coverage: <b style="color:#a855f7;">${cov.coveragePct != null ? cov.coveragePct + '%' : 'n/a'}</b> (${cov.supported || 0}/${cov.required || 0})`);
                    termPrint(`capsule xref: <b style="color:#f59e0b;">${window._kbatchFontLabXrefCount || 0}</b> / ${CAPSULES.length}`);
                    termPrint(`pipeline safety: <b style="color:${verdict === 'PASS' ? '#22a06b' : verdict === 'WARN' ? '#e6b422' : '#f97583'};">${verdict}</b>`);
                    if (pack.multicast && pack.multicast.routed && pack.multicast.routed.length) {
                        termPrint(`multicast channels: ${pack.multicast.routed.join(', ')}`, 'result');
                    }
                    return;
                }
                const isFabricate = sub === 'fabricate';
                let device = 'both';
                let textStart = 1;
                if (isFabricate) {
                    const d = (parts[2] || 'both').toLowerCase();
                    if (d === 'plotter' || d === 'printer3d' || d === 'both') device = d;
                    textStart = (d === 'plotter' || d === 'printer3d' || d === 'both') ? 3 : 2;
                }
                const text = parts.length > textStart
                    ? parts.slice(textStart).join(' ')
                    : ((document.getElementById('typing-input') || {}).value || '');
                if (!text) {
                    termPrint('No text provided. Use: fontlab <text>', 'warn');
                    return;
                }
                const packet = window.kbatch.fontlab.analyze(text, {
                    target: 'qbit_roman_math_core',
                    fabricate: isFabricate,
                    devices: device === 'both' ? ['plotter', 'printer3d'] : [device],
                    source: 'kbatch-fontlab-terminal',
                    broadcast: true
                });
                if (!packet) {
                    termPrint('FontLab detector failed to produce packet', 'error');
                    return;
                }
                const fc = packet.font && packet.font.coverage ? packet.font.coverage : {};
                const st = packet.stroke || {};
                const sty = st.style || {};
                termPrint('\u2500\u2500\u2500 FontLab Detector \u2500\u2500\u2500', 'info');
                termPrint(`text: ${text.length} chars | target: qbit_roman_math_core`);
                termPrint(`coverage: <b style="color:#a855f7;">${fc.coveragePct != null ? fc.coveragePct + '%' : 'n/a'}</b> (${fc.supported || 0}/${fc.required || 0})`);
                termPrint(`style: <b style="color:#58a6ff;">${sty.label || 'unknown'}</b> score=${sty.score != null ? sty.score : 'n/a'} | strokes=${st.strokeCount || 0} points=${st.pointCount || 0}`);
                const missingBlocks = fc.missingBlocks || {};
                const missingNames = Object.keys(missingBlocks).sort((a, b) => missingBlocks[b] - missingBlocks[a]).slice(0, 3);
                if (missingNames.length) {
                    termPrint(`gaps: ${missingNames.map(n => n + ':' + missingBlocks[n]).join(' \u00b7 ')}`, 'warn');
                }
                if (isFabricate && packet.fabrication && packet.fabrication.packets) {
                    const pk = packet.fabrication.packets;
                    if (pk.plotter) termPrint(`plotter toolpath lines: <b style="color:#22a06b;">${pk.plotter.lines}</b>`, 'result');
                    if (pk.printer3d) termPrint(`printer3d toolpath lines: <b style="color:#22a06b;">${pk.printer3d.lines}</b>`, 'result');
                }
            } else if (cmd === 'uterm' && parts.length >= 2) {
                const text = parts.slice(1).join(' ');
                publishToEcosystem('kbatch-terminal-forward', {
                    text: text,
                    stack: buildStackEnvelope(text, 'text', 'kbatch-terminal')
                }, ['uterm-notes', 'iron-line']);
                termPrint(`Forwarded ${text.length} chars to uterm + iron-line`, 'result');
            } else if (cmd === 'musica') {
                const text = parts.length >= 2
                    ? parts.slice(1).join(' ')
                    : ((document.getElementById('typing-input') || {}).value || '');
                const bench = window.kbatch.stack.benchmark(text);
                publishToEcosystem('musica-daw-payload', {
                    text: text,
                    bpm: bench.musicaEngine ? bench.musicaEngine.bpm : 0,
                    qBPM: bench.musicaEngine ? bench.musicaEngine.qBPM : 0,
                    qHz: bench.musicaEngine ? bench.musicaEngine.qHz : 0,
                    nsPerLine: bench.musicaEngine ? bench.musicaEngine.nsPerLine : 0,
                    calibrationLane: bench.musicaEngine ? bench.musicaEngine.calibrationLane : 'linear-bpm',
                    profile: bench.musicaEngine ? bench.musicaEngine.profile : 'steady',
                    notation: bench.contrail ? bench.contrail.musica : '',
                    style: bench.codeStyleAsMusic || '',
                    dawSupport: bench.musicaEngine ? bench.musicaEngine.dawSupport : {},
                    stack: buildStackEnvelope(text, 'text', 'kbatch-musica-terminal')
                }, ['iron-line', 'uterm-notes', 'kbatch-training']);
                termPrint(`Musica payload emitted @ ${(bench.musicaEngine && bench.musicaEngine.bpm) || 0} BPM | ${(bench.musicaEngine && bench.musicaEngine.qBPM) || 0} qBPM`, 'result');
                refreshMusicaPanel();
            } else if (cmd === 'blocks') {
                const text = parts.length >= 2
                    ? parts.slice(1).join(' ')
                    : ((document.getElementById('typing-input') || {}).value || '');
                const blocks = buildPrefixBlocks(text, 'text');
                publishToEcosystem('kbatch-blocks', {
                    source: 'kbatch-terminal',
                    text: text,
                    blocks: blocks,
                    stack: buildStackEnvelope(text, 'text', 'kbatch-blocks-terminal')
                }, ['quantum-prefixes', 'iron-line', 'uterm-notes', 'kbatch-training']);
                termPrint(`Emitted ${blocks.length} blocks to quantum-gutter + shared bus`, 'result');
            } else if (cmd === 'layout') {
                if (parts.length >= 2) {
                    const id = parts[1].toLowerCase();
                    if (LAYOUTS[id]) { setActiveLayout(id); termPrint(`Switched to ${LAYOUTS[id].name}`, 'result'); }
                    else termPrint(`Unknown layout: ${id}. Use: layout list`, 'error');
                } else {
                    termPrint('\u2500\u2500\u2500 Available Layouts \u2500\u2500\u2500', 'info');
                    Object.entries(LAYOUTS).forEach(([id, l]) => {
                        const active = id === activeLayoutId ? ' <b style="color:#7ee787;">\u2713 active</b>' : '';
                        termPrint(`<b style="color:#f0883e;">${id}</b> \u2014 ${l.name} (${l.script}, ${l.region})${active}`);
                    });
                }
            } else if (cmd === 'compare' && parts.length >= 3) {
                const a = parts[1].toLowerCase(), b = parts[2].toLowerCase();
                if (!LAYOUTS[a] || !LAYOUTS[b]) { termPrint('Unknown layout(s). Use: layout list', 'error'); return; }
                const posA = buildKeyPos(LAYOUTS[a]), posB = buildKeyPos(LAYOUTS[b]);
                const testWords = ['the','and','that','have','with','this','from','they','been','said','quantum','keyboard'];
                termPrint(`\u2500\u2500\u2500 ${LAYOUTS[a].name} vs ${LAYOUTS[b].name} \u2500\u2500\u2500`, 'info');
                let tA = 0, tB = 0;
                testWords.forEach(w => {
                    let dA = 0, dB = 0;
                    for (let i = 1; i < w.length; i++) {
                        const a1 = posA[w[i-1]], a2 = posA[w[i]];
                        const b1 = posB[w[i-1]], b2 = posB[w[i]];
                        if (a1 && a2) dA += Math.sqrt((a2.x-a1.x)**2 + (a2.y-a1.y)**2);
                        if (b1 && b2) dB += Math.sqrt((b2.x-b1.x)**2 + (b2.y-b1.y)**2);
                    }
                    tA += dA; tB += dB;
                    const winner = dA < dB ? a : b;
                    termPrint(`${w}: ${LAYOUTS[a].name}=${dA.toFixed(2)} ${LAYOUTS[b].name}=${dB.toFixed(2)} \u2192 <b style="color:#7ee787;">${LAYOUTS[winner].name}</b>`);
                });
                const pct = tA > 0 ? ((tA - tB) / tA * 100).toFixed(1) : '0';
                termPrint(`Total: ${LAYOUTS[a].name}=${tA.toFixed(1)} ${LAYOUTS[b].name}=${tB.toFixed(1)}`, 'result');
            } else if (cmd === 'dict' && parts.length >= 2) {
                const word = parts.slice(1).join(' ');
                termPrint(`Looking up "${word}"...`, 'info');
                DictEngine.lookup(word).then(data => {
                    if (data.error) { termPrint(data.error, 'error'); return; }
                    if (data.entries) {
                        data.entries.forEach(e => {
                            termPrint(`<b style="color:#f0883e;">${e.word}</b> ${e.phonetic || ''}`, 'result');
                            (e.meanings || []).forEach(m => {
                                termPrint(`  <span style="color:#d2a8ff;">${m.partOfSpeech}</span>`);
                                m.definitions.slice(0, 2).forEach(d => termPrint(`    \u2022 ${d.definition}`));
                            });
                        });
                    }
                    if (data.synonyms.length) termPrint(`Synonyms: ${data.synonyms.join(', ')}`, 'result');
                    // Bridge: cross-connector search for deeper context
                    const HS = window.HistorySearch;
                    if (HS) {
                        termPrint(`\u2500\u2500\u2500 Cross-connector context \u2500\u2500\u2500`, 'info');
                        HS.search(word, { onProgress: () => {} }).then(r => {
                            const bySource = {};
                            r.results.forEach(res => { if (!bySource[res.source]) bySource[res.source] = res; });
                            const sources = Object.values(bySource).slice(0, 6);
                            if (sources.length === 0) { termPrint('No cross-references found', 'warn'); return; }
                            sources.forEach(res => {
                                termPrint(`<span style="color:${HS.getSourceColor(res.source)};">[${res.source}]</span> ${res.title}${res.snippet ? ' \u2014 ' + res.snippet.substring(0, 80) : ''}`);
                            });
                            window._kbLastSearch = r.results;
                            termPrint(`${r.totalResults} results. Use <b style="color:#f0883e;">view [n]</b> to analyze.`, 'info');
                        });
                    }
                });
            } else if (cmd === 'search' && parts.length >= 2) {
                const query = parts.slice(1).join(' ');
                const HS = window.HistorySearch;
                if (!HS) { termPrint('HistorySearch not loaded', 'error'); return; }
                termPrint(`Searching: "${query}"...`, 'info');
                let searchResults = [];
                HS.search(query, { onProgress: (r) => {
                    if (r.results && r.results.length) {
                        r.results.slice(0, 5).forEach(res => {
                            termPrint(`<b style="color:#58a6ff;">${res.title}</b> <span style="color:#484f58;">[${res.source}]</span>`);
                            if (res.snippet) termPrint(`  ${res.snippet.substring(0, 120)}`);
                        });
                    }
                }}).then(r => {
                    searchResults = r.results;
                    window._kbLastSearch = searchResults;
                    termPrint(`${r.totalResults} results from ${r.connectorsUsed} connectors in ${r.latencyMs}ms`, 'result');
                    termPrint(`Use <b style="color:#f0883e;">view [n]</b> to fetch and analyze result #n`, 'info');
                });
            } else if (cmd === 'view') {
                const HS = window.HistorySearch;
                if (!HS || !HS.fetchDocument) { termPrint('HistorySearch v2 not loaded', 'error'); return; }
                const lastSearch = window._kbLastSearch || [];
                if (lastSearch.length === 0) { termPrint('No search results. Run: search <query>', 'warn'); return; }
                const idx = parts.length >= 2 ? parseInt(parts[1]) - 1 : 0;
                if (idx < 0 || idx >= lastSearch.length) { termPrint(`Invalid index. Range: 1-${lastSearch.length}`, 'error'); return; }
                const item = lastSearch[idx];
                termPrint(`Fetching: "${item.title}"...`, 'info');
                HS.fetchDocument(item.url, item.source).then(doc => {
                    termPrint(`\u2500\u2500\u2500 ${doc.title || item.title} (${doc.wordCount} words) \u2500\u2500\u2500`, 'info');
                    const preview = (doc.content || '').substring(0, 300);
                    if (preview) termPrint(preview + (doc.content.length > 300 ? '...' : ''));
                    const a = HS.analyzeContext(doc);
                    termPrint(`\u2500\u2500\u2500 ANALYSIS \u2500\u2500\u2500`, 'info');
                    termPrint(`Tone: <b style="color:${a.tone.dominant === 'academic' ? '#3b82f6' : a.tone.dominant === 'educational' ? '#34d399' : '#a78bfa'};">${a.tone.dominant || 'neutral'}</b> (acad:${a.tone.academic||0}% edu:${a.tone.educational||0}% narr:${a.tone.narrative||0}% mkt:${a.tone.marketing||0}% crisis:${a.tone.crisis||0}%)`);
                    const hb = Math.round((a.heartbeat || 0.5) * 100);
                    const hbColor = hb >= 50 ? '#8b5cf6' : '#f97316';
                    termPrint(`Heartbeat: <b style="color:${hbColor};">${hb}%</b> humanity | ${100 - hb}% profit-attention`);
                    termPrint(`Vocabulary: ${a.vocabulary.totalWords} total, ${a.vocabulary.uniqueWords} unique, TTR ${(a.vocabulary.typeTokenRatio*100).toFixed(1)}%`);
                    termPrint(`Readability: ${a.readabilityScore}/100 | Sentiment: ${a.sentiment > 0 ? '+' : ''}${a.sentiment}`);
                    if (a.monetarySignals.length) termPrint(`Monetary signals (${a.monetarySignals.length}): ${a.monetarySignals.slice(0, 8).join(', ')}`, 'result');
                    if (a.subReferences.dates && a.subReferences.dates.length) termPrint(`Dates found: ${a.subReferences.dates.slice(0, 5).join(', ')}`);
                    termPrint(`<span style="color:#484f58;font-size:.6rem;">${a.aiPerspective}</span>`);
                }).catch(e => { termPrint('Fetch error: ' + e.message, 'error'); });
            } else if (cmd === 'capsfind' && parts.length >= 2) {
                const q = parts.slice(1).join(' ');
                const matches = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.search(q, 20) : [];
                termPrint(`Capsule search: "${q}"`, 'info');
                if (!matches.length) {
                    termPrint('No capsule matches found', 'warn');
                } else {
                    matches.forEach(function(c, idx) {
                        const meta = c.meta || {};
                        const ent = meta.entity_type ? ' · ' + meta.entity_type : '';
                        const region = meta.parent_region ? ' · ' + meta.parent_region : '';
                        termPrint(`${idx + 1}. <b style="color:#f0883e;">${c.id}</b> — ${c.name} (${c.cat}${ent}${region}) [${c.words.length}]`);
                    });
                }
            } else if (cmd === 'capsule' && parts.length >= 2) {
                const id = parts.slice(1).join(' ');
                const cap = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.byId(id) : null;
                if (!cap) { termPrint('Capsule not found: ' + id, 'error'); return; }
                const packet = window.kbatch.capsules.packet(cap.id) || {};
                const meta = cap.meta || {};
                const pfx = packet.prefix || {};
                const steno = packet.steno || {};
                const codec = packet.codec || {};
                termPrint(`─── Capsule: ${cap.id} ───`, 'info');
                termPrint(`<b style="color:#58a6ff;">${cap.name}</b> | cat=${cap.cat} | words=${cap.words.length} | entity=${meta.entity_type || 'n/a'}`);
                termPrint(`entity_id=${meta.entity_id || 'n/a'} | country=${meta.country || 'n/a'} | region=${meta.parent_region || 'n/a'} | domain=${meta.domain || 'n/a'}`);
                termPrint(`gutter coverage=${pfx.coverage != null ? Number(pfx.coverage).toFixed(1) + '%' : 'n/a'} | steno bits=${steno.capacityBits != null ? steno.capacityBits : 'n/a'} | codec bytes=${codec.encodedBytes || 0}`);
                if (Array.isArray(meta.top_venues) && meta.top_venues.length) termPrint(`top_venues: ${meta.top_venues.slice(0, 8).join(' · ')}`);
                if (Array.isArray(meta.spoken_languages) && meta.spoken_languages.length) termPrint(`spoken_languages: ${meta.spoken_languages.slice(0, 12).join(' · ')}`);
                if (Array.isArray(meta.clan_subgroups) && meta.clan_subgroups.length) termPrint(`clan_subgroups: ${meta.clan_subgroups.slice(0, 10).join(' · ')}`);
                if (meta.canonical_url) termPrint(`canonical: <span style="color:#58a6ff;">${meta.canonical_url}</span> (confidence ${meta.canonical_url_confidence != null ? meta.canonical_url_confidence : 'n/a'})`);
            } else if (cmd === 'capsbus' && parts.length >= 2) {
                const id = parts.slice(1).join(' ');
                const packet = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.emit(id) : null;
                if (!packet) { termPrint('Capsule not found: ' + id, 'error'); return; }
                termPrint(`Emitted capsule packet: <b style="color:#22a06b;">${packet.capsule.id}</b> to quantum-prefixes + iron-line`, 'result');
            } else if (cmd === 'capsqbit' && parts.length >= 2) {
                const id = parts.slice(1).join(' ');
                const packet = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.export(id) : null;
                if (!packet) { termPrint('Capsule not found: ' + id, 'error'); return; }
                termPrint(`Exported .qbit packet for <b style="color:#22a06b;">${packet.capsule.id}</b>`, 'result');
            } else if (cmd === 'capsopen' && parts.length >= 2) {
                const id = parts[1];
                const maxTerms = parts.length >= 3 ? (parseInt(parts[2], 10) || 14) : 14;
                if (!window.kbatch || !window.kbatch.capsules || !window.kbatch.capsules.openSearch) {
                    termPrint('Capsule open search not available', 'error');
                    return;
                }
                termPrint(`Running capsule open search for <b style="color:#58a6ff;">${id}</b> (terms=${maxTerms})...`, 'info');
                window.kbatch.capsules.openSearch(id, { maxTerms: maxTerms }).then(function(out) {
                    if (!out || out.error) {
                        termPrint('Capsule open search error: ' + ((out && out.error) || 'unknown'), 'error');
                        return;
                    }
                    termPrint(`Query: <span style="color:#8b949e;">${out.query}</span>`);
                    termPrint(`Results: <b style="color:#22a06b;">${out.totalResults}</b> | connectors=${out.connectorsUsed} | latency=${out.latencyMs}ms`, 'result');
                    (out.topResults || []).slice(0, 8).forEach(function(r, i) {
                        termPrint(`${i + 1}. <span style="color:#a78bfa;">[${r.source || 'src'}]</span> ${r.title || r.url || ''}`);
                    });
                }).catch(function(e) {
                    termPrint('Capsule open search failed: ' + e.message, 'error');
                });
            } else if (cmd === 'capslang' && parts.length >= 2) {
                const id = parts.slice(1).join(' ');
                const profile = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.preservation(id) : null;
                if (!profile) { termPrint('Language profile not found: ' + id, 'error'); return; }
                termPrint(`─── Language Preservation: ${profile.capsuleId} ───`, 'info');
                termPrint(`Nation: <b style="color:#58a6ff;">${profile.nationGroup || 'n/a'}</b> | region=${profile.originRegion || 'n/a'}`);
                termPrint(`Elders subset: ${profile.eldersSubset || 'n/a'}`);
                termPrint(`Origin: ${profile.origin || 'n/a'}`);
                termPrint(`Kept alive: ${profile.keptAlive || 'n/a'}`);
                termPrint(`Reconnected: ${profile.reconnected || 'n/a'}`);
                termPrint(`Time period: ${profile.timePeriod || 'n/a'}`);
                termPrint(`Diaspora: ${profile.diaspora || 'n/a'}`);
                termPrint(`Keyboard: ${profile.keyboardProfile} ${profile.keyboardExtensionNeeded ? '(extension needed)' : '(supported)'}`);
                termPrint(`Auditory: ${profile.auditoryProfile}`);
                termPrint(`Modalities: ${(profile.modalities || []).join(', ')}`);
                termPrint(`Cross-sync: ${(profile.crossSyncChannels || []).join(', ')}`);
            } else if (cmd === 'capsaudio' && parts.length >= 2) {
                const id = parts.slice(1).join(' ');
                const sync = window.kbatch && window.kbatch.capsules ? window.kbatch.capsules.syncLanguage(id) : null;
                if (!sync) { termPrint('Language sync failed / pack not found: ' + id, 'error'); return; }
                termPrint(`Emitted language cross-sync for <b style="color:#22a06b;">${sync.capsuleId}</b>`, 'result');
                termPrint(`Keyboard profile: ${sync.keyboardProfile} | auditory: ${sync.auditoryProfile}`);
            } else if (cmd === 'caps') {
                const sub = (parts[1] || '').toLowerCase();
                if (sub === 'put') {
                    var jsonText = trimmed.replace(/^caps\s+put\s+/i, '').trim();
                    if (!jsonText) {
                        termPrint('Usage: caps put {"id":"caps.my.topic","name":"My Topic","cat":"code","words":["token-a","token-b"]}', 'warn');
                        return;
                    }
                    try {
                        var payload = JSON.parse(jsonText);
                        var up = upsertCapsuleFromCli(payload, { persist: true });
                        if (up.error) { termPrint('caps put error: ' + up.error, 'error'); return; }
                        renderGrid(activeFilter);
                        publishToEcosystem(
                            'capsule-knowledge',
                            CAPSULES.map(function(c) { return { id: c.id, name: c.name, cat: c.cat, age: c.age, words: c.words, meta: c.meta || {} }; }),
                            ['kbatch-training', 'iron-line', 'uterm-notes']
                        );
                        termPrint('Capsule upserted: <b style="color:#22a06b;">' + up.capsule.id + '</b> (' + (up.capsule.words || []).length + ' words, changed=' + up.changed + ')', 'result');
                    } catch (e) {
                        termPrint('caps put JSON parse error: ' + e.message, 'error');
                    }
                    return;
                }
                if (sub === 'append' && parts.length >= 4) {
                    var capId = parts[2];
                    var phrase = parts.slice(3).join(' ');
                    var app = appendCapsuleWordsFromCli(capId, phrase, { persist: true });
                    if (app.error) { termPrint('caps append error: ' + app.error, 'error'); return; }
                    renderGrid(activeFilter);
                    publishToEcosystem(
                        'capsule-knowledge',
                        CAPSULES.map(function(c) { return { id: c.id, name: c.name, cat: c.cat, age: c.age, words: c.words, meta: c.meta || {} }; }),
                        ['kbatch-training', 'iron-line', 'uterm-notes']
                    );
                    termPrint('Capsule append: <b style="color:#22a06b;">' + app.capsule.id + '</b> +' + app.added + ' words (changed=' + app.changed + ')', 'result');
                    return;
                }
                if (sub === 'local') {
                    termPrint('Local capsule overrides: ' + LOCAL_CAPSULE_OVERRIDES.length, 'info');
                    LOCAL_CAPSULE_OVERRIDES.slice(0, 20).forEach(function(c, idx) {
                        termPrint((idx + 1) + '. <b style="color:#58a6ff;">' + c.id + '</b> (' + (Array.isArray(c.words) ? c.words.length : 0) + ' words)');
                    });
                    return;
                }
                if (sub === 'sync') {
                    const scope = (parts[2] || 'research').toLowerCase();
                    const batchSize = parseInt(parts[3] || '12', 10) || 12;
                    const delayMs = parseInt(parts[4] || '60', 10) || 60;
                    if (!window.kbatch || !window.kbatch.capsules || !window.kbatch.capsules.sync) {
                        termPrint('Capsule sync not available', 'error');
                        return;
                    }
                    termPrint(`Starting capsule sync: scope=<b style="color:#58a6ff;">${scope}</b>, batch=${batchSize}, delay=${delayMs}ms`, 'info');
                    let lastPrinted = 0;
                    window.kbatch.capsules.sync({ scope: scope, batchSize: batchSize, delayMs: delayMs }, function(progress) {
                        if (!progress || progress.done) return;
                        const now = Date.now();
                        if (now - lastPrinted > 180) {
                            termPrint(`Sync progress: ${progress.emitted}/${progress.total} (batch ${progress.batchStart}-${progress.batchEnd})`);
                            lastPrinted = now;
                        }
                    }).then(function(summary) {
                        termPrint(`Capsule sync complete: emitted <b style="color:#22a06b;">${summary.emitted}</b>/${summary.total} in ${summary.elapsedMs}ms`, 'result');
                    }).catch(function(e) {
                        termPrint('Capsule sync failed: ' + e.message, 'error');
                    });
                    return;
                }
                termPrint('Unknown caps subcommand. Use: caps put | caps append | caps local | caps sync', 'error');
                return;
            } else if ((cmd === 'eval' || cmd === 'js') && parts.length >= 2) {
                try {
                    const result = eval(trimmed.slice(cmd.length).trim());
                    if (result !== undefined) termPrint('\u2192 ' + String(result), 'result');
                } catch (e) { termPrint('Error: ' + e.message, 'error'); }
            } else if (CMDS[cmd]) {
                CMDS[cmd]();
            } else {
                try {
                    const result = eval(trimmed);
                    if (result !== undefined) termPrint('\u2192 ' + String(result), 'result');
                } catch (e) { termPrint(`Unknown: <b>${cmd}</b>. Type <b>help</b>.`, 'error'); }
            }
        }

        termInput.addEventListener('keydown', e => {
            e.stopPropagation();
            if (e.key === 'Enter') { processCommand(termInput.value); termInput.value = ''; }
            else if (e.key === 'ArrowUp') { if (termHistory.length) { historyIdx = Math.min(historyIdx+1, termHistory.length-1); termInput.value = termHistory[historyIdx]; } }
            else if (e.key === 'ArrowDown') { if (historyIdx > 0) { historyIdx--; termInput.value = termHistory[historyIdx]; } else { historyIdx=-1; termInput.value=''; } }
        });

        document.getElementById('term-panel-toggle').addEventListener('click', () => {
            document.getElementById('term-panel-body').classList.toggle('collapsed');
        });
        if (window.kbatch) {
            window.kbatch.codestral = {
                templates: () => Object.keys(CODESTRAL_SCHEMA_TEMPLATES),
                schema: (name) => CODESTRAL_SCHEMA_TEMPLATES[(name || "structured_data").toLowerCase()] || null,
                packet: (text, mode) => buildCodestralPacket(text, mode || "structured_data"),
                export: (text, mode) => {
                    var p = buildCodestralPacket(text, mode || "structured_data");
                    downloadJson("kbatch-codestral-" + p.mode + "-" + Date.now() + ".json", p);
                    return p;
                }
            };
            window.kbatch.mistralbench = {
                command: (packetFile, opts) => buildMistralBenchCommand(packetFile, opts || {}),
                export: (text, mode) => exportCodestralPacketForBench(text || "", mode || "structured_data"),
                vendors: async (packetFile, modelId) => {
                    var packet = packetFile || window._kbLastCodestralExportFile || "kbatch-codestral-structured_data-<ts>.json";
                    var doc = await loadVendorProfiles();
                    var providers = (doc && Array.isArray(doc.providers)) ? doc.providers : KB_VENDOR_FALLBACK.providers.slice();
                    return providers.map(function(p) {
                        var id = String((p && p.id) || "").toLowerCase();
                        return { provider: id, command: buildVendorBenchCommand(packet, id, modelId || "<model-id>") };
                    }).filter(function(row) { return !!row.provider; });
                },
                last: () => ({
                    packetFile: window._kbLastCodestralExportFile || null,
                    command: window._kbLastMistralBenchCmd || null
                })
            };
            window.kbatch.vendorbench = {
                command: (packetFile, providerId, modelId) => buildVendorBenchCommand(packetFile, providerId, modelId),
                providers: async (packetFile, modelId) => {
                    var packet = packetFile || window._kbLastCodestralExportFile || "kbatch-codestral-structured_data-<ts>.json";
                    var doc = await loadVendorProfiles();
                    var providers = (doc && Array.isArray(doc.providers)) ? doc.providers : KB_VENDOR_FALLBACK.providers.slice();
                    return {
                        packetFile: packet,
                        qbitos_paths: (doc && doc.qbitos_paths) ? doc.qbitos_paths : (KB_VENDOR_FALLBACK.qbitos_paths || {}),
                        commands: providers.map(function(p) {
                            var id = String((p && p.id) || "").toLowerCase();
                            return { provider: id, command: buildVendorBenchCommand(packet, id, modelId || "<model-id>") };
                        }).filter(function(row) { return !!row.provider; })
                    };
                }
            };
            window.kbatch.contrails.xref = function(capsuleId, limit) { return crossReferenceCapsuleContrails(capsuleId, limit || 12); };
            window.kbatch.contrails.getPromptLanguage = function() { return getContrailPromptLanguage(); };
            window.kbatch.contrails.setPromptLanguage = function(text) { return setContrailPromptLanguage(text); };
            window.kbatch.capsules.upsert = function(payload, opts) { return upsertCapsuleFromCli(payload, opts || {}); };
            window.kbatch.capsules.appendWords = function(id, words, opts) { return appendCapsuleWordsFromCli(id, words, opts || {}); };
            window.kbatch.capsules.localOverrides = function() { return LOCAL_CAPSULE_OVERRIDES.slice(); };
        }
        refreshStreamHeartbeatUI().catch(function(){});
        setInterval(function() { refreshStreamHeartbeatUI().catch(function(){}); }, 15000);
    })();

    // ══════════════════ FULLSCREEN ══════════════════
    (function(){
        function enter() {
            document.body.classList.add('fullscreen'); renderAll();
            if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
        }
        function exit() {
            document.body.classList.remove('fullscreen'); renderAll();
            if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
        }
        document.getElementById('btn-fullscreen').addEventListener('click', enter);
        document.getElementById('btn-fs-exit').addEventListener('click', exit);
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) { document.body.classList.remove('fullscreen'); renderAll(); }
        });
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape' && document.body.classList.contains('fullscreen')) exit();
        });
    })();

    // ══════════════════ RESIZE + INIT ══════════════════
    window.addEventListener('resize', () => { renderAll(); renderLayoutPreview(); });
    renderAll();
    loadCorpusSignals().finally(function() {
        runStackBenchmark((document.getElementById('typing-input') || {}).value || '');
        refreshStackIndicators();
        refreshStreamIndicators();
        refreshMusicaPanel();
    });
    setInterval(function() { loadCorpusSignals().catch(function(){}); }, 60000);

    (function(){
        var btnRefresh = document.getElementById('musica-refresh');
        var btnExport = document.getElementById('musica-export-json');
        var btnPush = document.getElementById('musica-push-daw');
        if (btnRefresh) btnRefresh.addEventListener('click', function() {
            runStackBenchmark((document.getElementById('typing-input') || {}).value || '');
            refreshMusicaPanel();
        });
        if (btnExport) btnExport.addEventListener('click', function() {
            var bench = window.kbatch && window.kbatch.stack ? window.kbatch.stack.status() : null;
            if (!bench) return;
            var blob = new Blob([JSON.stringify({ musica: bench.musicaEngine, contrail: bench.contrail, style: bench.codeStyleAsMusic }, null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'kbatch-musica-' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(a.href);
        });
        if (btnPush) btnPush.addEventListener('click', function() {
            var bench = window.kbatch && window.kbatch.stack ? window.kbatch.stack.status() : null;
            if (!bench) return;
            publishToEcosystem('musica-daw-payload', {
                bpm: bench.musicaEngine ? bench.musicaEngine.bpm : 0,
                qBPM: bench.musicaEngine ? bench.musicaEngine.qBPM : 0,
                qHz: bench.musicaEngine ? bench.musicaEngine.qHz : 0,
                nsPerLine: bench.musicaEngine ? bench.musicaEngine.nsPerLine : 0,
                calibrationLane: bench.musicaEngine ? bench.musicaEngine.calibrationLane : 'linear-bpm',
                profile: bench.musicaEngine ? bench.musicaEngine.profile : 'steady',
                notation: bench.contrail ? bench.contrail.musica : '',
                style: bench.codeStyleAsMusic || '',
                dawSupport: bench.musicaEngine ? bench.musicaEngine.dawSupport : {},
                corpus: window._kbatchCorpus || null
            }, ['iron-line', 'uterm-notes', 'kbatch-training']);
        });
    })();

    // ═══ PWA SERVICE WORKER ═══
    if ('serviceWorker' in navigator) {
        try {
            var _sw = (typeof window.__SCH_WEB_ROOT === 'string')
                ? String(window.__SCH_WEB_ROOT).replace(/\/?$/, '/') + 'sw.js'
                : new URL('sw.js', new URL('../../web/', window.location.href)).href;
            navigator.serviceWorker.register(_sw).catch(() => {});
        } catch (_) {}
    }

    // ═══ QUANTUM PREFIX LIVE SYNC ═══
    (function() {
        const QP = window.QuantumPrefixes;
        if (!QP) return;
        QP.onStateChange(function(source, state) { if (source === 'kbatch' || !state) return; });
        QP.broadcastState('kbatch', {
            coverage: 0, totalLines: 0, classifiedLines: 0, prefixCounts: {},
            role: 'keyboard-quantum-analyzer',
            layouts: Object.keys(LAYOUTS).length,
            activeLayout: activeLayoutId
        });
        QP.requestStateSync();
    })();

    // ═══ ECOSYSTEM BUS (uterm + iron-line shared stack) ═══
    (function() {
        function handleIncoming(msg) {
            if (!msg) return;
            if (msg.source === 'kbatch') return; // avoid rebroadcast loops on shared channels
            if (msg.type === 'keyboard-data' && msg.text) {
                kbatch.processText(msg.text);
                return;
            }
            if (msg.type === 'kbatch-keyboard-data' && msg.payload && msg.payload.text) {
                kbatch.processText(msg.payload.text);
                return;
            }
            if ((msg.type === 'kbatch-blocks' || msg.type === 'quantum-gutter-blocks' || msg.type === 'block-payload') && msg.payload) {
                var blocks = Array.isArray(msg.payload.blocks) ? msg.payload.blocks : [];
                if (blocks.length) {
                    var text = blocks.map(function(b) {
                        return b.token || b.label || b.word || '';
                    }).filter(Boolean).join(' ');
                    if (text) kbatch.processText(text);
                } else if (msg.payload.text) {
                    kbatch.processText(msg.payload.text);
                }
                return;
            }
            if (msg.type === 'classify-request' && msg.data && msg.data.content && window.prefixDAC) {
                try {
                    var out = window.prefixDAC(msg.data.content, msg.data.language || 'text', 'kbatch');
                    publishToEcosystem('classify-result', { data_id: msg.data.data_id, meta: out.meta }, ['iron-line', 'uterm-notes']);
                } catch (_) {}
            }
        }

        try {
            const il = new BroadcastChannel('iron-line');
            il.onmessage = function(e) { handleIncoming(e.data); };
            window.__kbatchIronLine = il;
        } catch (_) {}

        try {
            const ut = new BroadcastChannel('uterm-notes');
            ut.onmessage = function(e) { handleIncoming(e.data); };
            window.__kbatchUTerm = ut;
        } catch (_) {}

        window.kbatch.broadcast = function(data) {
            publishToEcosystem('kbatch-message', data, ['iron-line', 'uterm-notes', 'kbatch-training']);
        };
    })();

