// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// History Search Engine — shared module for extension + PWA + hexterm
// Usage: <script src="history-search-engine.js"></script> then window.HistorySearch.search(query)
'use strict';

(function(root) {

const VERSION = '2.6.0';

const SRC_COLORS = {
    local: '#34d399', wikipedia: '#3b82f6', openlibrary: '#f97316',
    wayback: '#fb7185', 'sacred-texts': '#a78bfa', yale: '#fbbf24',
    arda: '#ef4444', arxiv: '#8b5cf6', pubchem: '#06b6d4',
    genbank: '#22d3ee', 'lgbtq-archives': '#d946ef', 'meta-research': '#6366f1',
    hathitrust: '#84cc16', 'internet-archive': '#f59e0b',
    fred: '#e11d48', worldbank: '#0ea5e9', coingecko: '#10b981',
    wiktionary: '#9333ea', datamuse: '#d946ef', youtube: '#ff0000',
    'video-transcript': '#f59e0b',
    /** Wikinews — neutral wire-style articles (Wikimedia; CORS-safe in browser) */
    'wire-news': '#0d9488',
    /** Library of Congress newspaper directory (History spine #2) */
    'history-archive': '#ea580c',
};

/* ══════════════════════════════════════════════════════
   CONNECTORS
   ══════════════════════════════════════════════════════ */
const CONNECTORS = [
    {
        name: 'Wikipedia', icon: 'W', enabled: true,
        search: q => fetch('https://en.wikipedia.org/w/api.php?action=opensearch&search=' + encodeURIComponent(q) + '&limit=6&format=json&origin=*')
            .then(r => r.json())
            .then(d => (d[1] || []).map((t, i) => ({ title: t, source: 'wikipedia', url: d[3][i], snippet: d[2][i] })))
            .catch(() => [])
    },
    {
        /** Wire desk: Wikinews (editorial, date-stamped; same-origin-friendly as Wikipedia). */
        name: 'Wikinews', icon: 'WS', enabled: true,
        search: q => fetch('https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(q) + '&srlimit=8&format=json&origin=*')
            .then(r => r.json())
            .then(d => {
                var hits = (d.query && d.query.search) || [];
                return hits.map(function (h) {
                    return {
                        title: h.title,
                        source: 'wire-news',
                        snippet: (h.snippet || '').replace(/<[^>]+>/g, ''),
                        url: 'https://en.wikinews.org/wiki/' + encodeURIComponent(String(h.title).replace(/ /g, '_'))
                    };
                });
            }).catch(function () { return []; })
    },
    {
        /** Historic newspapers — LOC newspaper directory (CORS `*`; pairs with History spine #2). */
        name: 'LOC Newspapers', icon: 'HN', enabled: true,
        search: q => fetch('https://www.loc.gov/newspapers/?dl=item&fo=json&q=' + encodeURIComponent(q) + '&c=10')
            .then(r => r.json())
            .then(d => {
                var items = (d.content && d.content.results) || [];
                return items.map(function (it) {
                    var title = (it.title || 'Newspaper').replace(/<[^>]+>/g, '');
                    var loc = (it.location_city && it.location_city[0] ? it.location_city[0] + ', ' : '') +
                        (it.location_state && it.location_state[0] ? it.location_state[0] : '');
                    return {
                        title: title.substring(0, 220),
                        source: 'history-archive',
                        snippet: (it.date || '') + (loc ? ' — ' + loc : '') + ' — Library of Congress',
                        url: it.id || ('https://www.loc.gov/newspapers/?q=' + encodeURIComponent(q))
                    };
                });
            }).catch(function () { return []; })
    },
    {
        name: 'Open Library', icon: 'OL', enabled: true,
        search: q => fetch('https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&limit=5')
            .then(r => r.json())
            .then(d => (d.docs || []).slice(0, 5).map(doc => ({
                title: doc.title, source: 'openlibrary',
                snippet: (doc.author_name || []).join(', ') + (doc.first_publish_year ? ' (' + doc.first_publish_year + ')' : ''),
                url: 'https://openlibrary.org' + doc.key
            }))).catch(() => [])
    },
    {
        name: 'Wayback Machine', icon: 'WB', enabled: true,
        search: q => fetch('https://web.archive.org/cdx/search/cdx?url=*' + encodeURIComponent(q) + '*&output=json&limit=5&fl=original,timestamp')
            .then(r => r.json())
            .then(d => d.slice(1).map(r => ({
                title: r[0], source: 'wayback',
                snippet: 'Archived: ' + r[1].substring(0, 4) + '-' + r[1].substring(4, 6) + '-' + r[1].substring(6, 8),
                url: 'https://web.archive.org/web/' + r[1] + '/' + r[0]
            }))).catch(() => [])
    },
    {
        name: 'Sacred Texts', icon: 'ST', enabled: true,
        search: q => Promise.resolve([{
            title: 'Sacred Texts: ' + q, source: 'sacred-texts',
            snippet: 'All world traditions — sacred-texts.com',
            url: 'https://www.sacred-texts.com/search.htm?q=' + encodeURIComponent(q)
        }])
    },
    {
        name: 'Yale Archives', icon: 'YA', enabled: true,
        search: q => Promise.resolve([{
            title: 'Yale Library: ' + q, source: 'yale',
            snippet: 'Beinecke Library + Yale digital collections',
            url: 'https://search.library.yale.edu/catalog?search_field=all_fields&q=' + encodeURIComponent(q)
        }])
    },
    {
        name: 'ARDA', icon: 'AR', enabled: true,
        search: q => Promise.resolve([{
            title: 'Religion Data Archives: ' + q, source: 'arda',
            snippet: 'Association of Religion Data Archives',
            url: 'https://www.thearda.com/data-archive'
        }])
    },
    {
        name: 'arXiv', icon: 'aX', enabled: true,
        search: q => fetch('https://export.arxiv.org/api/query?search_query=all:' + encodeURIComponent(q) + '&max_results=4')
            .then(r => r.text())
            .then(xml => {
                const entries = [];
                const re = /<entry>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<id>([\s\S]*?)<\/id>[\s\S]*?<summary>([\s\S]*?)<\/summary>[\s\S]*?<\/entry>/g;
                let m; while ((m = re.exec(xml)) !== null) entries.push({
                    title: m[1].trim(), source: 'arxiv', url: m[2].trim(),
                    snippet: m[3].trim().substring(0, 150)
                });
                return entries;
            }).catch(() => [])
    },
    {
        name: 'PubChem', icon: 'PC', enabled: true,
        search: q => fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/' + encodeURIComponent(q) + '/property/MolecularFormula,MolecularWeight/JSON')
            .then(r => r.json())
            .then(d => (d.PropertyTable?.Properties || []).map(p => ({
                title: q + ' \u2014 ' + p.MolecularFormula + ' (' + p.MolecularWeight + ' g/mol)',
                source: 'pubchem', snippet: 'Chemical compound data',
                url: 'https://pubchem.ncbi.nlm.nih.gov/compound/' + p.CID
            }))).catch(() => [])
    },
    {
        name: 'GenBank', icon: 'GB', enabled: true,
        search: q => Promise.resolve([{
            title: 'NCBI GenBank: ' + q, source: 'genbank',
            snippet: 'Nucleotide sequence database',
            url: 'https://www.ncbi.nlm.nih.gov/nuccore/?term=' + encodeURIComponent(q)
        }])
    },
    {
        name: 'LGBTQ Archives', icon: 'LQ', enabled: true,
        search: q => Promise.resolve([{
            title: 'LGBTQ Religious Archives: ' + q, source: 'lgbtq-archives',
            snippet: 'LGBTQ Religious Archives Network',
            url: 'https://lgbtqreligiousarchives.org/resources'
        }])
    },
    {
        name: 'Meta Research', icon: 'MR', enabled: true,
        search: q => Promise.resolve([{
            title: 'Meta FAIR: ' + q, source: 'meta-research',
            snippet: 'Meta AI research publications',
            url: 'https://ai.meta.com/research/?q=' + encodeURIComponent(q)
        }])
    },
    {
        name: 'HathiTrust', icon: 'HT', enabled: true,
        search: q => Promise.resolve([{
            title: 'HathiTrust: ' + q, source: 'hathitrust',
            snippet: 'HathiTrust Digital Library \u2014 17M+ volumes',
            url: 'https://catalog.hathitrust.org/Search/Home?lookfor=' + encodeURIComponent(q)
        }])
    },
    {
        name: 'Internet Archive', icon: 'IA', enabled: true,
        search: q => fetch('https://archive.org/advancedsearch.php?q=' + encodeURIComponent(q) + '&fl[]=identifier,title&rows=5&output=json')
            .then(r => r.json())
            .then(d => (d.response?.docs || []).map(doc => ({
                title: doc.title, source: 'internet-archive',
                snippet: 'Internet Archive collection',
                url: 'https://archive.org/details/' + doc.identifier
            }))).catch(() => [])
    },
    // ── Economic / Monetary connectors ──
    {
        name: 'FRED', icon: 'FR', enabled: true,
        search: q => fetch('https://api.stlouisfed.org/fred/series/search?search_text=' + encodeURIComponent(q) + '&api_key=DEMO_KEY&file_type=json&limit=4')
            .then(r => r.json())
            .then(d => (d.seriess || []).map(s => ({
                title: s.title, source: 'fred',
                snippet: s.frequency + ' \u2014 ' + (s.observation_start || '') + ' to ' + (s.observation_end || '') + ' \u2014 ' + (s.notes || '').substring(0, 100),
                url: 'https://fred.stlouisfed.org/series/' + s.id
            }))).catch(() => [])
    },
    {
        name: 'World Bank', icon: 'WB$', enabled: true,
        search: q => fetch('https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=3&date=2020:2024')
            .then(r => r.json())
            .then(d => {
                var items = (d[1] || []).filter(i => i.value !== null);
                return items.slice(0, 4).map(i => ({
                    title: (i.country ? i.country.value : 'World') + ' GDP ' + i.date,
                    source: 'worldbank',
                    snippet: 'GDP: $' + (i.value ? (i.value / 1e9).toFixed(1) + 'B' : 'N/A') + ' \u2014 ' + (i.indicator ? i.indicator.value : ''),
                    url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=' + (i.countryiso3code || '')
                }));
            }).catch(() => [])
    },
    {
        name: 'CoinGecko', icon: 'CG', enabled: true,
        search: q => fetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(q))
            .then(r => r.json())
            .then(d => (d.coins || []).slice(0, 4).map(c => ({
                title: c.name + ' (' + c.symbol.toUpperCase() + ')',
                source: 'coingecko',
                snippet: 'Market cap rank: #' + (c.market_cap_rank || 'N/A') + ' \u2014 ' + (c.id || ''),
                url: 'https://www.coingecko.com/en/coins/' + c.id
            }))).catch(() => [])
    },
    // ── Linguistic / Etymology connectors ──
    {
        name: 'Wiktionary', icon: 'Wk', enabled: true,
        search: q => fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(q))
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(data => {
                var results = [];
                (Array.isArray(data) ? data : []).forEach(function(langEntry) {
                    var lang = langEntry.language || 'English';
                    (langEntry.definitions || []).forEach(function(def) {
                        (def.definitions || []).slice(0, 2).forEach(function(d) {
                            var text = (d.definition || '').replace(/<[^>]*>/g, '');
                            if (text) results.push({
                                title: q + ' (' + lang + ', ' + (def.partOfSpeech || '') + ')',
                                source: 'wiktionary',
                                snippet: text.substring(0, 200),
                                url: 'https://en.wiktionary.org/wiki/' + encodeURIComponent(q)
                            });
                        });
                    });
                });
                return results.slice(0, 5);
            }).catch(() => [])
    },
    {
        name: 'Datamuse', icon: 'Dm', enabled: true,
        search: q => fetch('https://api.datamuse.com/words?ml=' + encodeURIComponent(q) + '&max=6&md=d')
            .then(r => r.json())
            .then(data => data.map(function(d) {
                var defs = (d.defs || []).map(function(def) { return def.replace(/^\w+\t/, ''); }).join('; ');
                return {
                    title: d.word + (d.tags ? ' [' + d.tags.join(', ') + ']' : ''),
                    source: 'datamuse',
                    snippet: defs || 'Related to: ' + q + ' (score: ' + (d.score || 0) + ')',
                    url: 'https://en.wiktionary.org/wiki/' + encodeURIComponent(d.word)
                };
            })).catch(() => [])
    },
    // ── YouTube Search + Transcript ──
    {
        name: 'YouTube', icon: 'YT', enabled: true,
        search: q => {
            // YouTube search via Invidious public API (no key needed)
            return fetch('https://vid.puffyan.us/api/v1/search?q=' + encodeURIComponent(q) + '&type=video&page=1')
                .then(r => r.json())
                .then(data => (Array.isArray(data) ? data : []).slice(0, 5).map(function(v) {
                    return {
                        title: v.title || q, source: 'youtube',
                        snippet: (v.author || '') + ' | ' + (v.lengthSeconds ? Math.floor(v.lengthSeconds/60) + ':' + ('0' + (v.lengthSeconds%60)).slice(-2) : '') + ' | ' + (v.viewCount ? v.viewCount.toLocaleString() + ' views' : '') + (v.description ? ' \u2014 ' + v.description.substring(0,100) : ''),
                        url: 'https://www.youtube.com/watch?v=' + (v.videoId || ''),
                        videoId: v.videoId || '',
                        duration: v.lengthSeconds || 0,
                        author: v.author || '',
                    };
                })).catch(() =>
                    // Fallback: simple YouTube search URL
                    [{ title: 'YouTube: ' + q, source: 'youtube', snippet: 'Search YouTube videos', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q) }]
                );
        }
    },
    {
        name: 'Video Transcripts', icon: 'VT', enabled: true,
        search: q => {
            var stored = JSON.parse(localStorage.getItem('transcript-dca-index') || '[]');
            var ql = q.toLowerCase();
            return Promise.resolve(stored.filter(s => s.text && s.text.toLowerCase().includes(ql)).slice(0, 12).map(s => {
                var ts = Math.floor(s.t/60) + ':' + String(Math.floor(s.t%60)).padStart(2,'0');
                return {
                    title: (s.prefix || '') + ' ' + (s.text || '').substring(0, 80),
                    source: 'video-transcript',
                    url: 'https://youtube.com/watch?v=' + s.videoId + '&t=' + Math.floor(s.t),
                    snippet: ts + ' | ' + (s.gate || 'I') + ' gate | ' + (s.type || 'segment') + ' | qpos[' + (s.qpos || [0,0,0]).join(',') + ']'
                };
            }));
        }
    },
];

/* ══════════════════════════════════════════════════════
   TIMELINE SCALES
   ══════════════════════════════════════════════════════ */
const TL_SCALES = [
    { name: 'Sub-quantum', min: -44, max: -24, color: '#8b5cf6' },
    { name: 'Quantum',     min: -24, max: -15, color: '#6366f1' },
    { name: 'Atomic',      min: -15, max: -9,  color: '#3b82f6' },
    { name: 'Photonic',    min: -9,  max: -6,  color: '#06b6d4' },
    { name: 'Signal',      min: -6,  max: -2,  color: '#22d3ee' },
    { name: 'Digital',     min: -2,  max: 2,   color: '#34d399' },
    { name: 'Human',       min: 2,   max: 8,   color: '#fbbf24' },
    { name: 'Historical',  min: 8,   max: 12,  color: '#f97316' },
    { name: 'Geological',  min: 12,  max: 16,  color: '#ef4444' },
    { name: 'Cosmic',      min: 16,  max: 18,  color: '#84cc16' },
];

/* ══════════════════════════════════════════════════════
   SEARCH ENGINE API
   ══════════════════════════════════════════════════════ */
async function search(query, opts = {}) {
    const t0 = performance.now();
    const onProgress = opts.onProgress || (() => {});
    const enabledConnectors = CONNECTORS.filter(c => c.enabled);
    const allResults = [];
    let completed = 0;

    await Promise.allSettled(enabledConnectors.map(async (conn) => {
        try {
            const results = await conn.search(query);
            results.forEach(r => allResults.push(r));
            completed++;
            onProgress({ results: allResults.slice(), completed, total: enabledConnectors.length, connector: conn.name, latestBatch: results });
        } catch (e) {
            completed++;
            onProgress({ results: allResults.slice(), completed, total: enabledConnectors.length, connector: conn.name, error: e.message, latestBatch: [] });
        }
    }));

    return {
        query,
        results: allResults,
        latencyMs: Math.round(performance.now() - t0),
        connectorsUsed: enabledConnectors.length,
        totalResults: allResults.length,
    };
}

function setConnectorEnabled(nameOrIndex, enabled) {
    const conn = typeof nameOrIndex === 'number' ? CONNECTORS[nameOrIndex] : CONNECTORS.find(c => c.name === nameOrIndex || c.icon === nameOrIndex);
    if (conn) conn.enabled = enabled;
}

function getConnectors() { return CONNECTORS.map(c => ({ name: c.name, icon: c.icon, enabled: c.enabled })); }
function getScales() { return TL_SCALES; }
function getSourceColor(source) { return SRC_COLORS[source] || '#64748b'; }

/* ══════════════════════════════════════════════════════
   MINI TIMELINE RENDERER
   ══════════════════════════════════════════════════════ */
function drawTimeline(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    const minLog = -44, maxLog = 18, range = maxLog - minLog;
    const isLight = document.documentElement.classList.contains('light');
    ctx.fillStyle = isLight ? '#f1f5f9' : '#050810'; ctx.fillRect(0, 0, W, H);
    TL_SCALES.forEach(s => {
        const x1 = ((s.min - minLog) / range) * W;
        const x2 = ((s.max - minLog) / range) * W;
        ctx.fillStyle = s.color + '18'; ctx.fillRect(x1, 0, x2 - x1, H);
        ctx.strokeStyle = s.color + '40'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, H); ctx.stroke();
        const lx = (x1 + x2) / 2;
        if (lx > 10 && lx < W - 10) {
            ctx.fillStyle = s.color + 'cc'; ctx.font = 'bold ' + Math.max(7, H * 0.2) + 'px monospace';
            ctx.textAlign = 'center'; ctx.fillText(s.name, lx, H / 2 + 3);
        }
    });
    ctx.textAlign = 'start';
}

/** Vertical timeline strip (left rail — Search PWA + mueee iframe). */
function drawTimelineVertical(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    const minLog = -44, maxLog = 18, range = maxLog - minLog;
    const isLight = document.documentElement.classList.contains('light');
    ctx.fillStyle = isLight ? '#f1f5f9' : '#050810';
    ctx.fillRect(0, 0, W, H);
    TL_SCALES.forEach(s => {
        const y1 = ((s.min - minLog) / range) * H;
        const y2 = ((s.max - minLog) / range) * H;
        ctx.fillStyle = s.color + '18';
        ctx.fillRect(0, y1, W, y2 - y1);
        ctx.strokeStyle = s.color + '40';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y1);
        ctx.lineTo(W, y1);
        ctx.stroke();
        const ly = (y1 + y2) / 2;
        if (ly > 12 && ly < H - 12) {
            ctx.save();
            ctx.translate(Math.max(4, W * 0.45), ly);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = s.color + (W >= 28 ? 'cc' : '99');
            ctx.font = 'bold ' + (W >= 28 ? '7' : '6') + 'px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(s.name, 0, 0);
            ctx.restore();
        }
    });
    ctx.textAlign = 'start';
}

/* ══════════════════════════════════════════════════════
   DOCUMENT FETCHER
   ══════════════════════════════════════════════════════ */

/** Strip MediaWiki HTML to plain text (removes &lt;style&gt;/&lt;script&gt; bodies — tag-only regex would leak CSS). */
function wikiHtmlToPlainTextRegex(html) {
    if (!html) return '';
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function wikiHtmlToPlainText(html) {
    if (!html) return '';
    if (typeof DOMParser !== 'undefined') {
        try {
            var d = new DOMParser().parseFromString(html, 'text/html');
            var body = d.body;
            if (!body) return wikiHtmlToPlainTextRegex(html);
            var kill = body.querySelectorAll(
                'style, script, noscript, .navbox, table.navbox, .navbox-inner, .sistersitebox, .metadata'
            );
            for (var i = 0; i < kill.length; i++) {
                var el = kill[i];
                if (el.parentNode) el.parentNode.removeChild(el);
            }
            var txt = body.textContent || '';
            return txt.replace(/\s+/g, ' ').trim();
        } catch (e) {
            /* fall through */
        }
    }
    return wikiHtmlToPlainTextRegex(html);
}

/** Pull key/value rows from Wikipedia infobox table for side-panel display. */
function wikiExtractInfobox(html) {
    if (!html || typeof DOMParser === 'undefined') return [];
    try {
        var d = new DOMParser().parseFromString(html, 'text/html');
        var box = d.querySelector('table.infobox');
        if (!box) return [];
        var strip = box.querySelectorAll('style, script, noscript');
        for (var s = 0; s < strip.length; s++) {
            var node = strip[s];
            if (node.parentNode) node.parentNode.removeChild(node);
        }
        var tbody = box.querySelector('tbody') || box;
        var rows = [];
        var ch = tbody.children;
        for (var i = 0; i < ch.length; i++) {
            var tr = ch[i];
            if (!tr || tr.tagName !== 'TR') continue;
            var th = null;
            var td = null;
            var cells = tr.children;
            for (var j = 0; j < cells.length; j++) {
                var cell = cells[j];
                if (cell.tagName === 'TH' && !th) th = cell;
                if (cell.tagName === 'TD' && !td) td = cell;
            }
            if (!th || !td) continue;
            var k = (th.textContent || '').replace(/\s+/g, ' ').trim();
            var v = (td.textContent || '').replace(/\s+/g, ' ').trim();
            if (k && v && k.length < 220 && v.length < 4000) rows.push({ key: k, value: v });
        }
        return rows;
    } catch (e) {
        return [];
    }
}

function wikiExtractImdbFromLinks(links) {
    if (!links || !links.length) return '';
    for (var i = 0; i < links.length; i++) {
        var m = String(links[i]).match(/imdb\.com\/title\/(tt\d+)/i);
        if (m) return m[1];
    }
    return '';
}

function wikiExtractYoutubeFromLinks(links) {
    if (!links || !links.length) return [];
    var out = [];
    for (var i = 0; i < links.length; i++) {
        var u = String(links[i]);
        if (/youtube\.com\/(watch|embed)|youtu\.be\//i.test(u)) out.push(u);
    }
    return out.slice(0, 8);
}

/** Wikidata claims: P345 IMDb, P4947 TMDB movie id (string or quantity). */
async function fetchWikidataExternalIds(qid) {
    var out = { imdbId: '', tmdbId: '' };
    if (!qid) return out;
    try {
        var url =
            'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' +
            encodeURIComponent(qid) +
            '&format=json&props=claims&origin=*';
        var res = await fetch(url);
        var data = await res.json();
        var ent = data.entities && data.entities[qid];
        if (!ent || !ent.claims) return out;
        var p345 = ent.claims.P345;
        if (p345 && p345[0] && p345[0].mainsnak && p345[0].mainsnak.datavalue) {
            var dv345 = p345[0].mainsnak.datavalue;
            if (dv345.type === 'string') out.imdbId = dv345.value;
        }
        var p4947 = ent.claims.P4947;
        if (p4947 && p4947[0] && p4947[0].mainsnak && p4947[0].mainsnak.datavalue) {
            var dv47 = p4947[0].mainsnak.datavalue;
            if (dv47.type === 'string') out.tmdbId = String(dv47.value);
            else if (dv47.type === 'quantity' && dv47.value && dv47.value.amount != null) {
                out.tmdbId = String(dv47.value.amount).replace(/^\+/, '');
            }
        }
    } catch (e) {
        /* optional */
    }
    return out;
}

function wikiBuildMediaRefs(doc) {
    var title = doc.title || '';
    var enc = encodeURIComponent;
    var refs = {
        youtubeTrailerSearch:
            'https://www.youtube.com/results?search_query=' + enc(title + ' official trailer'),
        youtubeFranchiseSearch:
            'https://www.youtube.com/results?search_query=' + enc(title + ' franchise trailer HD'),
        rottenSearch: 'https://www.rottentomatoes.com/search?search=' + enc(title),
        metacriticSearch: 'https://www.metacritic.com/search/all/' + enc(title) + '/',
        gettyCreative: 'https://www.gettyimages.com/photos/' + enc(title).replace(/%20/g, '-'),
        gettyNews:
            'https://www.gettyimages.com/editorial-images/search?phrase=' + enc(title),
        commonsSearch: 'https://commons.wikimedia.org/wiki/Special:Search?search=' + enc(title),
        commonsCategorySearch:
            'https://commons.wikimedia.org/wiki/Special:Search?search=Category%3A' +
            enc(title.replace(/\s+/g, '_'))
    };
    if (doc.imdbId) {
        refs.imdbTitle = 'https://www.imdb.com/title/' + doc.imdbId + '/';
        refs.imdbVideos = 'https://www.imdb.com/title/' + doc.imdbId + '/videogallery/';
        refs.imdbSoundtrack = 'https://www.imdb.com/title/' + doc.imdbId + '/soundtrack';
    }
    if (doc.tmdbId) {
        refs.tmdbMovie = 'https://www.themoviedb.org/movie/' + doc.tmdbId;
        refs.tmdbVideos = 'https://www.themoviedb.org/movie/' + doc.tmdbId + '/videos';
    }
    return refs;
}

async function fetchDocument(url, source) {
    source = source || '';
    var doc = { title: '', content: '', source: source, url: url, wordCount: 0, language: 'en', fetchedAt: Date.now() };
    try {
        // Wikipedia / Wikinews: REST summary + parse API for full plain text
        if (source === 'wikipedia' || source === 'wire-news' || url.indexOf('wikipedia.org') !== -1 || url.indexOf('wikinews.org') !== -1) {
            var titleMatch = url.match(/\/wiki\/(.+?)(?:#|$)/);
            if (titleMatch) {
                var wikiHostMatch = url.match(/https?:\/\/([a-z]{2,3})\.(wikipedia|wikinews)\.org/i);
                var wikiLang = wikiHostMatch ? wikiHostMatch[1].toLowerCase() : 'en';
                var wikiKind = wikiHostMatch ? wikiHostMatch[2].toLowerCase() : (source === 'wire-news' ? 'wikinews' : 'wikipedia');
                var wikiOrigin = 'https://' + wikiLang + '.' + wikiKind + '.org';
                var rawSlug = titleMatch[1];
                var decodedTitle = decodeURIComponent(rawSlug.replace(/\+/g, ' ')).replace(/_/g, ' ');
                var summaryPath = encodeURIComponent(decodedTitle.replace(/ /g, '_'));
                var restUrl = wikiOrigin + '/api/rest_v1/page/summary/' + summaryPath;
                var parseUrl =
                    wikiOrigin +
                    '/w/api.php?action=parse&page=' +
                    encodeURIComponent(decodedTitle) +
                    '&prop=text|categories|externallinks&format=json&origin=*';

                var restData = null;
                var parseData = null;
                try {
                    var restRes = await fetch(restUrl);
                    if (restRes.ok) restData = await restRes.json();
                } catch (e) { /* optional */ }
                try {
                    var parseRes = await fetch(parseUrl);
                    parseData = await parseRes.json();
                } catch (e) { /* optional */ }

                if (restData && (restData.title || restData.type)) {
                    if (restData.title) doc.title = restData.title;
                    doc.description = restData.description || '';
                    doc.extract = restData.extract || '';
                    if (restData.thumbnail && restData.thumbnail.source) {
                        doc.thumbnail = restData.thumbnail.source;
                        doc.thumbnailWidth = restData.thumbnail.width;
                        doc.thumbnailHeight = restData.thumbnail.height;
                    }
                    if (restData.originalimage && restData.originalimage.source) {
                        doc.originalimage = restData.originalimage.source;
                        doc.originalimageWidth = restData.originalimage.width;
                        doc.originalimageHeight = restData.originalimage.height;
                    }
                    if (restData.pageid != null) doc.pageid = restData.pageid;
                    if (restData.lang) doc.lang = restData.lang;
                    if (restData.coordinates) doc.coordinates = restData.coordinates;
                    if (restData.wikibase_item) doc.wikibase = restData.wikibase_item;
                    if (restData.type) doc.wikiType = restData.type;
                    if (restData.timestamp) doc.wikiTimestamp = restData.timestamp;
                    if (restData.revision != null) doc.wikiRevision = String(restData.revision);
                    if (restData.description_source) doc.descriptionSource = restData.description_source;
                    if (restData.content_urls && restData.content_urls.desktop) {
                        var d = restData.content_urls.desktop;
                        if (d.edit) doc.wikiEditUrl = d.edit;
                        if (d.revisions) doc.wikiHistoryUrl = d.revisions;
                        if (d.talk) doc.wikiTalkUrl = d.talk;
                    }
                }
                if (parseData && parseData.parse) {
                    var p = parseData.parse;
                    doc.title = p.title || doc.title || decodedTitle;
                    if (p.pageid != null && doc.pageid == null) doc.pageid = p.pageid;
                    var html = p.text ? p.text['*'] : '';
                    doc.infobox = wikiExtractInfobox(html);
                    doc.content = wikiHtmlToPlainText(html);
                    doc.categories = (p.categories || []).map(function(c) { return c['*']; });
                    var extLinks = p.externallinks || [];
                    doc.imdbId = wikiExtractImdbFromLinks(extLinks);
                    doc.youtubeLinksFromArticle = wikiExtractYoutubeFromLinks(extLinks);
                } else if (!doc.content && restData && restData.extract) {
                    doc.content = restData.extract;
                }
                if (doc.wikibase) {
                    var wdIds = await fetchWikidataExternalIds(doc.wikibase);
                    if (!doc.imdbId && wdIds.imdbId) doc.imdbId = wdIds.imdbId;
                    if (wdIds.tmdbId) doc.tmdbId = wdIds.tmdbId;
                }
                doc.mediaRefs = wikiBuildMediaRefs(doc);
                if (!doc.title) doc.title = decodedTitle;
                if (restData && restData.lang) doc.language = restData.lang;
            }
        }
        // arXiv: already have abstract, fetch extended metadata
        else if (source === 'arxiv' || url.indexOf('arxiv.org') !== -1) {
            var idMatch = url.match(/abs\/(.+?)(?:#|$)/) || url.match(/(\d{4}\.\d{4,5})/);
            if (idMatch) {
                var res = await fetch('https://export.arxiv.org/api/query?id_list=' + idMatch[1]);
                var xml = await res.text();
                var tM = xml.match(/<title>([\s\S]*?)<\/title>/);
                var sM = xml.match(/<summary>([\s\S]*?)<\/summary>/);
                var aM = xml.match(/<name>([\s\S]*?)<\/name>/g);
                doc.title = tM ? tM[1].trim() : '';
                doc.content = sM ? sM[1].trim() : '';
                doc.authors = aM ? aM.map(function(a) { return a.replace(/<[^>]+>/g, '').trim(); }) : [];
            }
        }
        // Open Library: fetch work description + subjects
        else if (source === 'openlibrary' || url.indexOf('openlibrary.org') !== -1) {
            var keyMatch = url.match(/\/works\/(\w+)/);
            if (keyMatch) {
                var res = await fetch('https://openlibrary.org/works/' + keyMatch[1] + '.json');
                var data = await res.json();
                doc.title = data.title || '';
                doc.content = typeof data.description === 'string' ? data.description : (data.description ? data.description.value : '');
                doc.subjects = (data.subjects || []).slice(0, 20);
            }
        }
        // Internet Archive: metadata endpoint
        else if (source === 'internet-archive' || url.indexOf('archive.org') !== -1) {
            var idMatch = url.match(/\/details\/(.+?)(?:#|$)/);
            if (idMatch) {
                var res = await fetch('https://archive.org/metadata/' + idMatch[1]);
                var data = await res.json();
                var m = data.metadata || {};
                doc.title = m.title || idMatch[1];
                doc.content = m.description || '';
                doc.creator = m.creator;
                doc.date = m.date;
            }
        }
        // FRED: fetch series observations
        else if (source === 'fred' || url.indexOf('fred.stlouisfed.org') !== -1) {
            var sMatch = url.match(/\/series\/(\w+)/);
            if (sMatch) {
                var res = await fetch('https://api.stlouisfed.org/fred/series?series_id=' + sMatch[1] + '&api_key=DEMO_KEY&file_type=json');
                var data = await res.json();
                var s = (data.seriess || [])[0] || {};
                doc.title = s.title || sMatch[1];
                doc.content = (s.notes || '') + '\n\nFrequency: ' + (s.frequency || '') + '\nUnits: ' + (s.units || '') + '\nSeasonal adjustment: ' + (s.seasonal_adjustment || '');
            }
        }
        // Library of Congress item (newspaper directory / history-archive)
        else if (source === 'history-archive' || (url.indexOf('loc.gov') !== -1 && url.indexOf('/item/') !== -1)) {
            var locMatch = url.match(/loc\.gov\/item\/(\d+)/);
            if (locMatch) {
                var locRes = await fetch('https://www.loc.gov/item/' + locMatch[1] + '/?fo=json');
                if (locRes.ok) {
                    var locData = await locRes.json();
                    var locItem = locData.item || {};
                    doc.title = typeof locItem.title === 'string' ? locItem.title : (doc.title || '');
                    if (Array.isArray(locItem.description)) doc.content = locItem.description.join('\n\n');
                    else doc.content = locItem.description || '';
                    if (!doc.content && Array.isArray(locItem.created_published)) doc.content = locItem.created_published.join('\n');
                    if (locItem.dates_of_publication) doc.date = locItem.dates_of_publication;
                }
            }
            if (!doc.content || String(doc.content).length < 20) {
                doc.content = 'Library of Congress newspaper record. Open the link for holdings and digitized issues.';
            }
        }
        // Generic: try to fetch and extract text
        else {
            doc.title = url;
            doc.content = 'Document preview not available for this source. Open the URL directly.';
        }
    } catch (e) {
        doc.content = 'Fetch error: ' + e.message;
    }
    doc.wordCount = doc.content ? doc.content.split(/\s+/).length : 0;
    return doc;
}

/* ══════════════════════════════════════════════════════
   CONTEXT ANALYZER
   ══════════════════════════════════════════════════════ */

// Word lists for tone detection
var _TONE_ACADEMIC = ['hypothesis','methodology','empirical','furthermore','consequently','paradigm','theoretical','correlation','significance','parameter','systematic','quantitative','qualitative','longitudinal','peer-reviewed','citation','appendix','abstract','et al','respectively'];
var _TONE_MARKETING = ['exclusive','limited','free','guaranteed','revolutionary','amazing','incredible','unbelievable','act now','best ever','discount','premium','unlock','boost','maximize','skyrocket','transform','ultimate','breakthrough','game-changing'];
var _TONE_EDUCATIONAL = ['learn','understand','example','practice','exercise','chapter','lesson','concept','fundamental','introduction','definition','explanation','diagram','tutorial','demonstrate','illustrate','step-by-step','overview','summary','review'];
var _TONE_NARRATIVE = ['i ','my ','me ','we ','our ','felt','remembered','walked','looked','thought','heart','dream','love','fear','hope','believed','whispered','laughed','cried','journey'];
var _TONE_LEGAL = ['shall','whereas','herein','thereof','pursuant','notwithstanding','indemnify','liability','obligation','amendment','jurisdiction','arbitration','stipulate','covenant','warrant','provision','clause','binding','enforceable','waiver'];
var _TONE_CRISIS = ['war','conflict','attack','bomb','troops','invasion','siege','casualties','refugee','displaced','famine','epidemic','pandemic','collapse','bankruptcy','default','crisis','emergency','catastrophe','devastation'];

var _MONETARY_PATTERNS = /\$[\d,.]+|\d+%|GDP|inflation|debt|deficit|trade|tariff|stock|bond|treasury|currency|exchange rate|interest rate|fiscal|monetary|capital|investment|revenue|profit|loss|billion|trillion|economy|recession|depression|surplus|subsidy|tax|wage|income|wealth|poverty|inequality/gi;

var _SUBREFERENCE_PATTERNS = {
    urls: /https?:\/\/[^\s"'<>]+/g,
    dates: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}|\d{4}\s(?:BC|BCE|AD|CE))\b/gi,
    monetary: /\$[\d,.]+\s*(?:billion|trillion|million)?|\d+(?:\.\d+)?\s*(?:billion|trillion|million)\s*(?:dollars|USD|EUR|GBP)?/gi,
    quotes: /"([^"]{10,200})"/g,
    properNouns: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
};

function analyzeContext(doc) {
    var text = (doc && doc.content) ? doc.content : (typeof doc === 'string' ? doc : '');
    var words = text.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 0; });
    var totalWords = words.length;
    if (totalWords === 0) return { tone: {}, vocabulary: {}, subReferences: {}, monetarySignals: [], sentiment: 0, readabilityScore: 0, heartbeat: 0.5, aiPerspective: '' };

    // ── Vocabulary fingerprint ──
    var freq = {};
    words.forEach(function(w) { var clean = w.replace(/[^a-z'-]/g, ''); if (clean.length > 1) freq[clean] = (freq[clean] || 0) + 1; });
    var uniqueWords = Object.keys(freq);
    var hapaxCount = uniqueWords.filter(function(w) { return freq[w] === 1; }).length;
    var avgWordLen = words.reduce(function(s, w) { return s + w.length; }, 0) / totalWords;
    var sortedWords = uniqueWords.sort(function(a, b) { return freq[b] - freq[a]; });

    var vocabulary = {
        totalWords: totalWords,
        uniqueWords: uniqueWords.length,
        typeTokenRatio: uniqueWords.length / totalWords,
        hapaxRatio: hapaxCount / uniqueWords.length,
        avgWordLength: Math.round(avgWordLen * 10) / 10,
        top50: sortedWords.slice(0, 50).map(function(w) { return { word: w, count: freq[w] }; }),
    };

    // ── Writing tone classification ──
    var lower = text.toLowerCase();
    function countHits(wordList) {
        var hits = 0;
        wordList.forEach(function(term) { var idx = -1; while ((idx = lower.indexOf(term, idx + 1)) !== -1) hits++; });
        return hits;
    }

    var toneScores = {
        academic: countHits(_TONE_ACADEMIC),
        marketing: countHits(_TONE_MARKETING),
        educational: countHits(_TONE_EDUCATIONAL),
        narrative: countHits(_TONE_NARRATIVE),
        legal: countHits(_TONE_LEGAL),
        crisis: countHits(_TONE_CRISIS),
    };
    var toneTotal = Object.values(toneScores).reduce(function(a, b) { return a + b; }, 0) || 1;
    var tone = {};
    for (var t in toneScores) tone[t] = Math.round((toneScores[t] / toneTotal) * 100);

    // Determine dominant tone
    var dominant = 'neutral';
    var maxScore = 0;
    for (var t in tone) { if (tone[t] > maxScore) { maxScore = tone[t]; dominant = t; } }
    tone.dominant = dominant;

    // ── Sub-reference extraction ──
    var subReferences = {};
    for (var key in _SUBREFERENCE_PATTERNS) {
        var matches = text.match(_SUBREFERENCE_PATTERNS[key]);
        subReferences[key] = matches ? matches.slice(0, 20) : [];
    }

    // ── Monetary signals ──
    var monetaryMatches = text.match(_MONETARY_PATTERNS) || [];
    var monetarySignals = monetaryMatches.slice(0, 30);

    // ── Sentiment (simple positive/negative ratio) ──
    var posWords = ['good','great','excellent','wonderful','positive','success','benefit','improve','growth','progress','hope','opportunity','achieve','prosper','peace','health','love','create','build','thrive'];
    var negWords = ['bad','terrible','awful','negative','failure','harm','damage','decline','crisis','danger','threat','loss','destroy','suffer','pain','fear','hate','corrupt','exploit','collapse'];
    var posCount = countHits(posWords);
    var negCount = countHits(negWords);
    var sentiment = (posCount + negCount) > 0 ? (posCount - negCount) / (posCount + negCount) : 0;

    // ── Readability (Flesch-Kincaid approximation) ──
    var sentences = text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 3; }).length || 1;
    var syllables = words.reduce(function(s, w) { var m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'').match(/[aeiouy]{1,2}/g); return s + (m ? m.length : 1); }, 0);
    var readabilityScore = Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * (totalWords / sentences) - 84.6 * (syllables / totalWords))));

    // ── Heartbeat: humanity vs profit-attention ratio ──
    var humanitySignals = toneScores.educational + toneScores.narrative + posCount;
    var profitSignals = toneScores.marketing + toneScores.crisis + monetarySignals.length;
    var heartbeatTotal = humanitySignals + profitSignals || 1;
    var heartbeat = Math.round((humanitySignals / heartbeatTotal) * 100) / 100;

    // ── AI self-awareness ──
    var aiPerspective = 'This analysis was performed by a pattern-matching system (regex word lists, not semantic AI). ' +
        'Tone classifications are structural, not contextual \u2014 a crisis report about humanitarian aid scores high on both crisis and educational. ' +
        'The heartbeat metric (' + Math.round(heartbeat * 100) + '% humanity) distinguishes profit-oriented framing from human-oriented content, ' +
        'but this distinction is itself a value judgment encoded in word lists. The system does not understand meaning; it counts patterns.';

    return {
        tone: tone,
        vocabulary: vocabulary,
        subReferences: subReferences,
        monetarySignals: monetarySignals,
        sentiment: Math.round(sentiment * 100) / 100,
        readabilityScore: readabilityScore,
        heartbeat: heartbeat,
        aiPerspective: aiPerspective,
    };
}

/* ══════════════════════════════════════════════════════
   PATTERN RECOGNITION (cross-result analysis)
   ══════════════════════════════════════════════════════ */
function detectPatterns(results, documents) {
    documents = documents || [];
    var clusters = { economic: [], academic: [], crisis: [], educational: [], narrative: [] };
    var totalEconDensity = 0;
    var totalAttention = 0;
    var totalHeartbeat = 0;
    var shockwaves = [];
    var docCount = 0;

    documents.forEach(function(doc) {
        if (!doc || !doc._analysis) return;
        var a = doc._analysis;
        docCount++;

        // Cluster by dominant tone
        if (a.tone && a.tone.dominant && clusters[a.tone.dominant]) {
            clusters[a.tone.dominant].push({ title: doc.title, source: doc.source, heartbeat: a.heartbeat });
        }

        // Economic density
        var econDensity = a.monetarySignals ? a.monetarySignals.length / Math.max(1, a.vocabulary.totalWords) * 1000 : 0;
        totalEconDensity += econDensity;

        // Attention (marketing/crisis) vs heartbeat (educational/narrative)
        totalAttention += (a.tone.marketing || 0) + (a.tone.crisis || 0);
        totalHeartbeat += (a.tone.educational || 0) + (a.tone.narrative || 0);

        // Shockwave detection: high crisis + high monetary = shockwave
        if ((a.tone.crisis || 0) > 25 && a.monetarySignals && a.monetarySignals.length > 3) {
            shockwaves.push({
                title: doc.title,
                source: doc.source,
                crisisScore: a.tone.crisis,
                monetaryTerms: a.monetarySignals.length,
                sentiment: a.sentiment,
            });
        }
    });

    var attentionTotal = totalAttention + totalHeartbeat || 1;
    var attentionRatio = Math.round((totalAttention / attentionTotal) * 100);

    return {
        clusters: clusters,
        economicDensity: docCount > 0 ? Math.round((totalEconDensity / docCount) * 10) / 10 : 0,
        attentionRatio: attentionRatio,
        heartbeatRatio: 100 - attentionRatio,
        shockwaves: shockwaves,
        documentsAnalyzed: docCount,
        prediction: shockwaves.length > 2
            ? 'High volatility pattern: multiple crisis-economic intersections detected. Historical correlation suggests impact on housing, education, and community stability within 6-18 months.'
            : shockwaves.length > 0
                ? 'Moderate disruption signal: ' + shockwaves.length + ' crisis-economic intersection(s). Monitor for cascading effects.'
                : 'Stable pattern: no significant crisis-economic intersections in analyzed documents.',
    };
}

/* ══════════════════════════════════════════════════════
   AI LENS — page structure, metric weighting, heatmap,
   content generation, vision tracking, board layout
   ══════════════════════════════════════════════════════ */

// Heatmap: track user interaction zones per result
var _heatmapData = {};  // id -> { clicks, hovers, dwellMs, scrollDepth }

function trackInteraction(resultId, type, extra) {
    if (!_heatmapData[resultId]) {
        _heatmapData[resultId] = { clicks: 0, hovers: 0, dwellMs: 0, scrollDepth: 0, firstSeen: Date.now(), zones: [] };
    }
    var h = _heatmapData[resultId];
    if (type === 'click') h.clicks++;
    if (type === 'hover') h.hovers++;
    if (type === 'dwell') h.dwellMs += (extra || 0);
    if (type === 'scroll') h.scrollDepth = Math.max(h.scrollDepth, extra || 0);
    if (type === 'zone' && extra) h.zones.push(extra);
    return h;
}

function getHeatmapData() { return JSON.parse(JSON.stringify(_heatmapData)); }
function clearHeatmap() { _heatmapData = {}; }

// Page structure analysis — like vision tracking / structural understanding
function analyzePageStructure(html) {
    if (!html || typeof html !== 'string') return { sections: [], links: [], images: [], headings: [], forms: [], depth: 0, complexity: 0 };

    var headings = []; var links = []; var images = []; var forms = []; var sections = [];
    var hm = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi) || [];
    hm.forEach(function(h) {
        var level = parseInt(h.charAt(2));
        var text = h.replace(/<[^>]+>/g, '').trim();
        if (text) headings.push({ level: level, text: text.substring(0, 120) });
    });
    var lm = html.match(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi) || [];
    lm.forEach(function(a) {
        var href = (a.match(/href="([^"]*)"/) || ['', ''])[1];
        var text = a.replace(/<[^>]+>/g, '').trim();
        if (href && text) links.push({ href: href, text: text.substring(0, 80) });
    });
    var im = html.match(/<img\s[^>]*>/gi) || [];
    im.forEach(function(i) {
        var src = (i.match(/src="([^"]*)"/) || ['', ''])[1];
        var alt = (i.match(/alt="([^"]*)"/) || ['', ''])[1];
        if (src) images.push({ src: src, alt: alt || '' });
    });
    var fm = html.match(/<form[\s\S]*?<\/form>/gi) || [];
    forms = fm.map(function(f) {
        var inputs = (f.match(/<input/gi) || []).length;
        var action = (f.match(/action="([^"]*)"/) || ['', ''])[1];
        return { action: action, inputCount: inputs };
    });

    // Build section hierarchy from headings
    var currentSection = null;
    headings.forEach(function(h, idx) {
        var section = { id: 'sec-' + idx, heading: h.text, level: h.level, subLinks: 0, subImages: 0 };
        sections.push(section);
        currentSection = section;
    });

    // Estimate complexity
    var tagCount = (html.match(/<[a-z]/gi) || []).length;
    var depth = 0; var maxD = 0; var inTag = false;
    for (var i = 0; i < Math.min(html.length, 50000); i++) {
        if (html[i] === '<' && html[i+1] !== '/') { depth++; if (depth > maxD) maxD = depth; }
        if (html[i] === '<' && html[i+1] === '/') depth--;
    }

    return {
        sections: sections,
        links: links.slice(0, 100),
        images: images.slice(0, 50),
        headings: headings,
        forms: forms,
        depth: maxD,
        complexity: Math.min(100, Math.round((tagCount / 50) + (maxD * 2) + (links.length * 0.3) + (forms.length * 5))),
        tagCount: tagCount,
        wordCount: html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length,
    };
}

// AI Metric Weighting — score results by usefulness
function weightResults(results, opts) {
    opts = opts || {};
    var contextAnalyses = opts.analyses || {};
    var heatmap = opts.heatmap || _heatmapData;
    var userGoal = opts.goal || 'research'; // research | app-building | learning | promo
    var promptModel = opts.promptModel || 'auto';
    var depthMod = 1;
    if (promptModel === 'deep') depthMod = 1.12;
    else if (promptModel === 'fast') depthMod = 0.88;
    else if (promptModel === 'code') depthMod = 1.08;
    else if (promptModel === 'balanced') depthMod = 1;

    var goalWeights = {
        research:      { depth: 0.3, breadth: 0.25, authority: 0.2, recency: 0.1, engagement: 0.15 },
        'app-building': { depth: 0.15, breadth: 0.15, authority: 0.15, recency: 0.25, engagement: 0.3 },
        learning:      { depth: 0.35, breadth: 0.2, authority: 0.2, recency: 0.05, engagement: 0.2 },
        promo:         { depth: 0.1, breadth: 0.3, authority: 0.15, recency: 0.2, engagement: 0.25 },
    };
    var w = goalWeights[userGoal] || goalWeights.research;

    return results.map(function(r, idx) {
        var id = r.id || String(idx);
        var analysis = contextAnalyses[id] || {};
        var heat = heatmap[id] || {};

        // Depth score: content richness
        var depthScore = 0;
        if (analysis.readability) depthScore += analysis.readability.grade / 20;
        if (analysis.subReferences) depthScore += Math.min(1, analysis.subReferences.length / 10);
        if (analysis.vocabulary) depthScore += Math.min(1, analysis.vocabulary.uniqueWords / 500);
        depthScore = Math.min(1, depthScore / 2.5);

        // Breadth: cross-references, multiple topics
        var breadthScore = 0;
        if (analysis.subReferences) breadthScore += Math.min(1, analysis.subReferences.length / 15);
        if (r.source) breadthScore += 0.3; // has identifiable source

        // Authority: source reputation + tone
        var authorityScore = 0;
        var trustedSources = ['wikipedia', 'wire-news', 'history-archive', 'arxiv', 'pubchem', 'genbank', 'hathitrust'];
        if (r.source && trustedSources.indexOf(r.source.toLowerCase()) >= 0) authorityScore += 0.6;
        if (analysis.tone && (analysis.tone.academic > 0.3 || analysis.tone.educational > 0.3)) authorityScore += 0.3;
        authorityScore = Math.min(1, authorityScore);

        // Recency
        var recencyScore = 0.5; // default mid
        if (r.date) {
            var age = Date.now() - new Date(r.date).getTime();
            var ageYears = age / (365.25 * 24 * 3600 * 1000);
            recencyScore = Math.max(0, 1 - (ageYears / 20));
        }

        // Engagement from heatmap
        var engagementScore = 0;
        if (heat.clicks) engagementScore += Math.min(0.5, heat.clicks * 0.15);
        if (heat.dwellMs) engagementScore += Math.min(0.3, heat.dwellMs / 30000);
        if (heat.scrollDepth) engagementScore += heat.scrollDepth * 0.2;
        engagementScore = Math.min(1, engagementScore);

        var totalScore = (depthScore * w.depth * depthMod) + (breadthScore * w.breadth) +
            (authorityScore * w.authority) + (recencyScore * w.recency) +
            (engagementScore * w.engagement);

        return {
            result: r,
            id: id,
            scores: {
                total: Math.round(totalScore * 100) / 100,
                depth: Math.round(depthScore * 100) / 100,
                breadth: Math.round(breadthScore * 100) / 100,
                authority: Math.round(authorityScore * 100) / 100,
                recency: Math.round(recencyScore * 100) / 100,
                engagement: Math.round(engagementScore * 100) / 100,
            },
            rank: 0, // set after sorting
        };
    }).sort(function(a, b) { return b.scores.total - a.scores.total; })
      .map(function(item, idx) { item.rank = idx + 1; return item; });
}

// Content Generation — produce outputs from analysis
function generateContent(type, results, analyses, opts) {
    opts = opts || {};
    var title = opts.title || 'Research Summary';
    var weighted = weightResults(results, { analyses: analyses, goal: opts.goal || 'research' });

    if (type === 'research-paper') {
        var lines = [];
        lines.push('# ' + title);
        lines.push('');
        lines.push('**Generated:** ' + new Date().toISOString().split('T')[0]);
        lines.push('**Sources:** ' + results.length + ' documents analyzed');
        lines.push('**Engine:** uvspeed History Search v' + VERSION);
        lines.push('');
        lines.push('## Abstract');
        lines.push('');
        var topResults = weighted.slice(0, 5);
        lines.push('This analysis synthesizes ' + results.length + ' sources across ' + new Set(results.map(function(r) { return r.source; })).size + ' knowledge bases. ');
        lines.push('The highest-weighted sources emphasize ' + (topResults.length > 0 ? topResults.map(function(r) { return r.result.title || 'untitled'; }).join(', ') : 'various topics') + '.');
        lines.push('');
        lines.push('## Source Analysis');
        lines.push('');
        lines.push('| Rank | Source | Score | Depth | Authority | Title |');
        lines.push('|------|--------|-------|-------|-----------|-------|');
        weighted.slice(0, 15).forEach(function(w) {
            lines.push('| ' + w.rank + ' | ' + (w.result.source || '?') + ' | ' + w.scores.total + ' | ' + w.scores.depth + ' | ' + w.scores.authority + ' | ' + (w.result.title || '').substring(0, 40) + ' |');
        });
        lines.push('');
        lines.push('## Key Themes');
        lines.push('');
        // Cluster by source
        var bySource = {};
        results.forEach(function(r) { var s = r.source || 'unknown'; if (!bySource[s]) bySource[s] = []; bySource[s].push(r); });
        Object.keys(bySource).forEach(function(src) {
            lines.push('### ' + src + ' (' + bySource[src].length + ' results)');
            lines.push('');
            bySource[src].slice(0, 3).forEach(function(r) {
                lines.push('- **' + (r.title || 'Untitled') + '**: ' + (r.snippet || '').substring(0, 200));
            });
            lines.push('');
        });
        lines.push('## Methodology');
        lines.push('');
        lines.push('Results weighted using multi-dimensional scoring: depth (' + (opts.goal === 'research' ? '30%' : '15-35%') + '), breadth, authority, recency, and engagement metrics.');
        lines.push('');
        lines.push('---');
        lines.push('*beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}*');
        return lines.join('\n');
    }

    if (type === 'pwa-spec') {
        var spec = {
            name: opts.appName || 'Generated App',
            description: 'PWA generated from ' + results.length + ' search results',
            version: '1.0.0',
            generated: new Date().toISOString(),
            engine: 'uvspeed-history-search-v' + VERSION,
            sources: results.length,
            topResults: weighted.slice(0, 10).map(function(w) {
                return { title: w.result.title, url: w.result.url, score: w.scores.total, source: w.result.source };
            }),
            suggestedFeatures: [],
            contentSections: [],
        };
        // Suggest features based on result types
        var hasMath = results.some(function(r) { return (r.snippet || '').match(/\d+\.\d+|equation|formula|theorem/i); });
        var hasMedia = results.some(function(r) { return (r.snippet || '').match(/video|image|audio|visual/i); });
        var hasData = results.some(function(r) { return (r.snippet || '').match(/data|dataset|csv|table|chart/i); });
        var hasTimeline = results.some(function(r) { return (r.snippet || '').match(/timeline|chronolog|history|century|era/i); });
        if (hasMath) spec.suggestedFeatures.push('calculator-panel');
        if (hasMedia) spec.suggestedFeatures.push('media-gallery');
        if (hasData) spec.suggestedFeatures.push('data-table-view');
        if (hasTimeline) spec.suggestedFeatures.push('timeline-visualization');
        spec.suggestedFeatures.push('search-integration', 'offline-cache', 'dark-light-theme');

        // Content sections from top results
        weighted.slice(0, 8).forEach(function(w) {
            spec.contentSections.push({
                heading: w.result.title || 'Section ' + w.rank,
                sourceUrl: w.result.url,
                relevanceScore: w.scores.total,
                type: w.result.source || 'web',
            });
        });
        return JSON.stringify(spec, null, 2);
    }

    if (type === 'suggestions') {
        var suggestions = [];
        var totalDepth = 0; var totalAuth = 0;
        weighted.forEach(function(w) { totalDepth += w.scores.depth; totalAuth += w.scores.authority; });
        var avgDepth = weighted.length ? totalDepth / weighted.length : 0;
        var avgAuth = weighted.length ? totalAuth / weighted.length : 0;

        if (avgDepth < 0.3) suggestions.push({ type: 'research', text: 'Low content depth — try more specific queries or academic sources (arXiv, PubChem)', priority: 'high' });
        if (avgAuth < 0.3) suggestions.push({ type: 'authority', text: 'Low source authority — consider cross-referencing with Wikipedia, arXiv, or peer-reviewed sources', priority: 'high' });
        if (weighted.length < 5) suggestions.push({ type: 'breadth', text: 'Few results — enable more connectors or broaden search terms', priority: 'medium' });
        if (weighted.length > 0 && weighted[0].scores.engagement < 0.1) suggestions.push({ type: 'engagement', text: 'No engagement data yet — click through results to build preference model', priority: 'low' });

        // App suggestions
        suggestions.push({ type: 'export', text: 'Generate a research paper from top ' + Math.min(15, weighted.length) + ' results', action: 'research-paper' });
        suggestions.push({ type: 'export', text: 'Create a PWA app spec for an app-maker tool', action: 'pwa-spec' });
        if (weighted.length >= 3) {
            suggestions.push({ type: 'layout', text: 'Try Board view to organize results spatially', action: 'board-view' });
            suggestions.push({ type: 'analysis', text: 'Run heatmap analysis to visualize engagement patterns', action: 'heatmap' });
        }
        return suggestions;
    }

    if (type === 'board-layout') {
        // Pinterest-style column assignment
        var columns = opts.columns || 3;
        var cols = [];
        for (var c = 0; c < columns; c++) cols.push({ items: [], height: 0 });
        weighted.forEach(function(w) {
            // Estimate card height based on content
            var h = 120 + (w.result.snippet ? Math.min(80, w.result.snippet.length / 3) : 0) +
                    (w.scores.total > 0.5 ? 30 : 0);
            // Place in shortest column
            var shortest = 0;
            for (var i = 1; i < cols.length; i++) { if (cols[i].height < cols[shortest].height) shortest = i; }
            cols[shortest].items.push({ weighted: w, estimatedHeight: h });
            cols[shortest].height += h + 10;
        });
        return { columns: cols, totalItems: weighted.length };
    }

    return null;
}

// Vision tracking: compute page element importance zones
function computeVisionZones(pageStructure) {
    if (!pageStructure) return [];
    var zones = [];
    var totalElements = (pageStructure.headings || []).length + (pageStructure.links || []).length +
                        (pageStructure.images || []).length + (pageStructure.forms || []).length;
    if (totalElements === 0) return zones;

    // Headings are high-importance zones
    (pageStructure.headings || []).forEach(function(h, idx) {
        zones.push({
            type: 'heading', text: h.text, level: h.level,
            importance: 1 - (h.level * 0.12),
            position: idx / Math.max(1, (pageStructure.headings || []).length),
            color: h.level <= 2 ? '#7c3aed' : h.level <= 4 ? '#22d3ee' : '#64748b',
        });
    });

    // Images are attention zones
    (pageStructure.images || []).forEach(function(img, idx) {
        zones.push({
            type: 'image', alt: img.alt, src: img.src,
            importance: 0.7,
            position: idx / Math.max(1, (pageStructure.images || []).length),
            color: '#f97316',
        });
    });

    // Links are navigation zones
    var linkImportance = Math.max(0.2, 1 - ((pageStructure.links || []).length / 100));
    (pageStructure.links || []).slice(0, 30).forEach(function(link, idx) {
        zones.push({
            type: 'link', text: link.text, href: link.href,
            importance: linkImportance * (link.text.length > 3 ? 1 : 0.5),
            position: idx / 30,
            color: '#34d399',
        });
    });

    // Forms are high-importance interaction zones
    (pageStructure.forms || []).forEach(function(f) {
        zones.push({
            type: 'form', action: f.action, inputs: f.inputCount,
            importance: 0.9,
            position: 0.5,
            color: '#fb7185',
        });
    });

    return zones.sort(function(a, b) { return b.importance - a.importance; });
}

// Draw a heatmap visualization on a canvas
function drawHeatmap(canvas, zones, opts) {
    if (!canvas || !canvas.getContext) return;
    opts = opts || {};
    var w = opts.width || canvas.parentElement.clientWidth || 300;
    var h = opts.height || 200;
    var dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Detect theme
    var isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
    ctx.fillStyle = isLight ? '#f0f2f5' : '#0a0f1a';
    ctx.fillRect(0, 0, w, h);

    if (!zones || zones.length === 0) {
        ctx.fillStyle = isLight ? '#656d76' : '#64748b';
        ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('No vision data', w / 2, h / 2);
        return;
    }

    // Draw zones as positioned circles with importance-based radius
    zones.forEach(function(z, idx) {
        var x = (z.position || 0.5) * w * 0.8 + w * 0.1;
        var y = (idx / zones.length) * h * 0.8 + h * 0.1;
        var r = Math.max(4, z.importance * 20);

        // Glow
        var grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
        grad.addColorStop(0, z.color + '60');
        grad.addColorStop(1, z.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, Math.PI * 2); ctx.fill();

        // Core dot
        ctx.fillStyle = z.color;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

        // Label
        if (z.importance > 0.5 && z.text) {
            ctx.font = '8px sans-serif'; ctx.fillStyle = isLight ? '#1f2328' : '#e2e8f0'; ctx.textAlign = 'left';
            ctx.fillText((z.text || '').substring(0, 20), x + r + 3, y + 3);
        }
    });

    // Legend
    var legendY = h - 14;
    ctx.font = '9px monospace'; ctx.textAlign = 'left';
    var legendItems = [['heading', '#7c3aed'], ['image', '#f97316'], ['link', '#34d399'], ['form', '#fb7185']];
    var lx = 6;
    legendItems.forEach(function(li) {
        ctx.fillStyle = li[1]; ctx.fillRect(lx, legendY, 6, 6);
        ctx.fillStyle = isLight ? '#656d76' : '#64748b'; ctx.fillText(li[0], lx + 9, legendY + 6);
        lx += ctx.measureText(li[0]).width + 18;
    });
}


/* ══════════════════════════════════════════════════════
   KBATCH TRAINING BRIDGE (v2.2)
   ══════════════════════════════════════════════════════ */
var _kbatchData = { sessions: [], aggregates: null, biometrics: null };

function receiveKbatchTraining(data) {
    if (!data) return;
    if (data.sessions) _kbatchData.sessions = data.sessions;
    if (data.aggregates) _kbatchData.aggregates = data.aggregates;
    if (data.biometrics) _kbatchData.biometrics = data.biometrics;
}

function getKbatchData() { return _kbatchData; }

// Analyze keyboard patterns from training sessions
function analyzeKeyboardPatterns(sessions) {
    if (!sessions || sessions.length === 0) return null;
    var totalWpm = 0, totalAcc = 0, totalInterval = 0, totalVariance = 0;
    var drillCounts = {};
    var rhythmSignatures = [];
    sessions.forEach(function(s) {
        totalWpm += s.wpm || 0;
        totalAcc += s.accuracy || 0;
        totalInterval += s.avgKeyInterval || 0;
        totalVariance += s.rhythmVariance || 0;
        drillCounts[s.drill] = (drillCounts[s.drill] || 0) + 1;
        if (s.rhythmSignature) rhythmSignatures.push(s.rhythmSignature);
    });
    var n = sessions.length;
    // Rhythm pattern frequency analysis
    var patternFreq = {};
    rhythmSignatures.forEach(function(sig) {
        for (var i = 0; i < sig.length - 2; i++) {
            var tri = sig.substr(i, 3);
            patternFreq[tri] = (patternFreq[tri] || 0) + 1;
        }
    });
    var topPatterns = Object.entries(patternFreq).sort(function(a,b) { return b[1]-a[1]; }).slice(0, 10);
    // Typing style classification
    var avgInterval = totalInterval / n;
    var avgVariance = totalVariance / n;
    var style = 'steady';
    if (avgVariance > 100) style = 'bursty';
    else if (avgVariance > 50) style = 'rhythmic';
    else if (avgInterval < 100) style = 'rapid';
    // Biometric aggregates from Cisponju engine
    var totalTravel = 0, totalHomeRow = 0, totalCalories = 0, totalRsi = 0;
    var bioCount = 0;
    sessions.forEach(function(s) {
        if (s.travelMM !== undefined) { totalTravel += s.travelMM; bioCount++; }
        if (s.homeRowPct !== undefined) totalHomeRow += s.homeRowPct;
        if (s.calories !== undefined) totalCalories += s.calories;
        if (s.rsiRisk !== undefined) totalRsi += s.rsiRisk;
    });
    return {
        totalSessions: n,
        avgWpm: Math.round(totalWpm / n),
        avgAccuracy: Math.round(totalAcc / n),
        avgKeyInterval: Math.round(avgInterval),
        rhythmVariance: Math.round(avgVariance),
        typingStyle: style,
        drillDistribution: drillCounts,
        topRhythmPatterns: topPatterns,
        // Musical mapping — rhythm signatures mapped to tempo
        musicalTempo: avgInterval < 80 ? 'presto' : avgInterval < 120 ? 'allegro' : avgInterval < 180 ? 'moderato' : avgInterval < 250 ? 'andante' : 'adagio',
        // Dance mapping — variance mapped to movement style
        danceStyle: avgVariance > 100 ? 'breakdance' : avgVariance > 60 ? 'jazz' : avgVariance > 30 ? 'waltz' : 'ballet',
        // Cisponju biometric aggregates
        biometrics: bioCount > 0 ? {
            avgTravelMM: Math.round(totalTravel / bioCount),
            avgHomeRowPct: Math.round(totalHomeRow / bioCount),
            totalCalories: totalCalories,
            avgRsiRisk: Math.round(totalRsi / bioCount),
        } : null,
    };
}

// Generate content enriched with keyboard pattern data
function generatePatternReport(sessions, opts) {
    opts = opts || {};
    var analysis = analyzeKeyboardPatterns(sessions);
    if (!analysis) return '# No training data\n\nComplete some drills in KBatch to generate a pattern report.';
    var md = '# Keyboard Pattern Analysis Report\n\n';
    md += '**Generated:** ' + new Date().toISOString() + '  \n';
    md += '**Sessions:** ' + analysis.totalSessions + ' | **Avg WPM:** ' + analysis.avgWpm + ' | **Accuracy:** ' + analysis.avgAccuracy + '%\n\n';
    md += '## Typing Profile\n\n';
    md += '| Metric | Value |\n|---|---|\n';
    md += '| Style | ' + analysis.typingStyle + ' |\n';
    md += '| Avg Key Interval | ' + analysis.avgKeyInterval + 'ms |\n';
    md += '| Rhythm Variance | ' + analysis.rhythmVariance + 'ms |\n';
    md += '| Musical Tempo | ' + analysis.musicalTempo + ' |\n';
    md += '| Dance Style | ' + analysis.danceStyle + ' |\n\n';
    md += '## Drill Distribution\n\n';
    Object.entries(analysis.drillDistribution).forEach(function(e) {
        md += '- **' + e[0] + '**: ' + e[1] + ' sessions\n';
    });
    md += '\n## Top Rhythm Patterns\n\n';
    md += 'Pattern signatures: F=fast(<80ms) M=medium(80-150ms) S=slow(150-300ms) P=pause(>300ms)\n\n';
    if (analysis.topRhythmPatterns.length > 0) {
        md += '| Pattern | Frequency |\n|---|---|\n';
        analysis.topRhythmPatterns.forEach(function(p) {
            md += '| `' + p[0] + '` | ' + p[1] + ' |\n';
        });
    }
    md += '\n## Cross-Domain Mapping\n\n';
    md += 'Typing rhythm naturally maps to other pattern domains:\n\n';
    md += '- **Music**: Your typing tempo maps to *' + analysis.musicalTempo + '* — ';
    md += analysis.musicalTempo === 'presto' ? 'lightning fast, concert-level intensity' :
          analysis.musicalTempo === 'allegro' ? 'brisk and lively, energetic flow' :
          analysis.musicalTempo === 'moderato' ? 'balanced and measured, steady rhythm' :
          analysis.musicalTempo === 'andante' ? 'walking pace, thoughtful deliberation' :
          'slow and deliberate, each key placed with care';
    md += '\n- **Dance**: Your variance maps to *' + analysis.danceStyle + '* — ';
    md += analysis.danceStyle === 'breakdance' ? 'explosive bursts with dramatic pauses' :
          analysis.danceStyle === 'jazz' ? 'syncopated rhythm, creative improvisation' :
          analysis.danceStyle === 'waltz' ? 'graceful three-beat flow, elegant transitions' :
          'precise, controlled, classical technique';
    md += '\n\n---\n*Generated by uvspeed KBatch v4.19*\n';
    return md;
}

// Listen for kbatch training data via BroadcastChannel
if (typeof BroadcastChannel !== 'undefined') {
    try {
        var kbatchBC = new BroadcastChannel('kbatch-training');
        kbatchBC.onmessage = function(e) {
            if (e.data && e.data.type === 'training-data') {
                receiveKbatchTraining(e.data);
            }
            if (e.data && e.data.type === 'capsule-knowledge') {
                _kbatchData.capsuleKnowledge = e.data.payload;
            }
        };
    } catch(e) {}
}


/* ══════════════════════════════════════════════════════
   CROSS-LINGUISTIC INTELLIGENCE (v2.3)
   Phrase analysis, intent detection, context profiling
   ══════════════════════════════════════════════════════ */

// Tone / register detection patterns
var REGISTER_PATTERNS = {
    formal:   /\b(therefore|furthermore|consequently|moreover|nevertheless|notwithstanding|pursuant|herein|whereas|hereby)\b/i,
    academic: /\b(hypothesis|methodology|paradigm|empirical|correlation|synthesis|quantitative|qualitative|peer[\s-]review|longitudinal)\b/i,
    casual:   /\b(gonna|wanna|gotta|kinda|sorta|lol|btw|imo|tbh|ngl|fr|lowkey|highkey|vibe|slay|lit)\b/i,
    medical:  /\b(diagnosis|symptom|treatment|chronic|acute|prescription|prognosis|triage|hemorrhage|anesthesia)\b/i,
    legal:    /\b(plaintiff|defendant|jurisdiction|statute|liability|indemnify|arbitration|tort|counsel|deposition)\b/i,
    tech:     /\b(API|frontend|backend|deployment|containerization|microservice|CI\/CD|kubernetes|docker|serverless)\b/i,
    news:     /\b(breaking|alleged|unprecedented|bipartisan|according to|sources say|developing story|confirmed|unverified)\b/i,
    survival: /\b(shelter|evacuate|emergency|first aid|tourniquet|dehydration|hypothermia|rations|signal|rescue)\b/i,
    ancient:  /\b(pharaoh|hieroglyph|cuneiform|papyrus|stele|dharma|karma|yoga|sutra|veda|logos|polis|agora|futhark|rune|wyrd|codex|manuscript)\b/i,
    encoding: /\b(0x[0-9A-Fa-f]+|U\+[0-9A-F]{4}|base64|ASCII|UTF-8|UTF-16|unicode|hexadecimal|binary|octal)\b/i,
    access:   /\b(braille|ASL|sign language|morse code|fingerspelling|deaf|accessibility|screen reader|tactile|semaphore)\b/i,
    code:     /\b(function|class|import|return|const|let|var|async|await|struct|enum|impl|SELECT|FROM|WHERE|def|lambda)\b/i,
};

// Age-register intonation markers
var AGE_MARKERS = {
    child:  /\b(mommy|daddy|yummy|owie|potty|boo-boo|puppy|kitty|blankie|nap|story|play|candy)\b/i,
    teen:   /\b(cringe|vibe|slay|no cap|bussin|sus|based|stan|simp|rizz|flex|ratio|w\/|bruh|fr fr|lowkey)\b/i,
    young_adult: /\b(hustle|grind|mindset|networking|startup|side gig|remote work|portfolio|branding|linkedin)\b/i,
    mature: /\b(mortgage|retirement|portfolio|estate|annuity|beneficiary|fiduciary|pension|401k|equity)\b/i,
};

// Regional dialect/variant markers
var REGIONAL_MARKERS = {
    american: /\b(sidewalk|apartment|cookie|gas|truck|elevator|fall|soccer|gotten|faucet)\b/i,
    british:  /\b(pavement|flat|biscuit|petrol|lorry|lift|autumn|football|colour|favour)\b/i,
    australian: /\b(arvo|barbie|brekkie|chunder|crikey|dunny|esky|mozzie|servo|thongs)\b/i,
    indian_english: /\b(prepone|revert back|do the needful|kindly|good name|only na|itself)\b/i,
};

function analyzeTextIntelligence(text) {
    if (!text || text.length < 3) return null;
    var result = {
        registers: [],
        ageRegister: 'general',
        regionalVariant: 'neutral',
        intentSignals: [],
        sentimentLean: 'neutral',
        complexity: 0,
        readingLevel: 'general',
        phrasePatterns: [],
    };
    // Register detection
    Object.entries(REGISTER_PATTERNS).forEach(function(e) {
        var matches = text.match(e[1]);
        if (matches) result.registers.push({ type: e[0], strength: matches.length });
    });
    // Age register
    Object.entries(AGE_MARKERS).forEach(function(e) {
        if (e[1].test(text)) result.ageRegister = e[0];
    });
    // Regional variant
    Object.entries(REGIONAL_MARKERS).forEach(function(e) {
        if (e[1].test(text)) result.regionalVariant = e[0];
    });
    // Intent signals
    if (/\?/.test(text)) result.intentSignals.push('questioning');
    if (/!/.test(text)) result.intentSignals.push('emphatic');
    if (/\b(how to|steps to|guide|tutorial|learn)\b/i.test(text)) result.intentSignals.push('learning');
    if (/\b(buy|price|cost|deal|discount|sale|order)\b/i.test(text)) result.intentSignals.push('commercial');
    if (/\b(help|emergency|urgent|need|please|save)\b/i.test(text)) result.intentSignals.push('assistance');
    if (/\b(compare|versus|vs|difference|better|worse)\b/i.test(text)) result.intentSignals.push('comparative');
    if (/\b(opinion|think|feel|believe|should|must)\b/i.test(text)) result.intentSignals.push('opinion');
    if (/\b(data|research|study|evidence|statistics|analysis)\b/i.test(text)) result.intentSignals.push('research');
    // Sentiment lean
    var posWords = (text.match(/\b(good|great|excellent|amazing|wonderful|love|best|fantastic|brilliant|outstanding|beautiful|perfect|hope|progress|success)\b/gi) || []).length;
    var negWords = (text.match(/\b(bad|terrible|horrible|awful|worst|hate|poor|disaster|failure|crisis|problem|danger|threat|collapse|corrupt)\b/gi) || []).length;
    if (posWords > negWords + 1) result.sentimentLean = 'positive';
    else if (negWords > posWords + 1) result.sentimentLean = 'negative';
    else if (posWords > 0 && negWords > 0) result.sentimentLean = 'mixed';
    // Complexity (Flesch-Kincaid proxy)
    var words = text.split(/\s+/).filter(function(w) { return w.length > 0; });
    var sentences = text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 0; });
    var avgWordLen = words.reduce(function(s,w) { return s + w.length; }, 0) / Math.max(words.length, 1);
    var avgSentLen = words.length / Math.max(sentences.length, 1);
    result.complexity = Math.min(100, Math.round(avgWordLen * 8 + avgSentLen * 2));
    if (result.complexity > 70) result.readingLevel = 'advanced';
    else if (result.complexity > 45) result.readingLevel = 'intermediate';
    else result.readingLevel = 'basic';
    // Phrase pattern extraction (common n-grams)
    var bigrams = {};
    for (var i = 0; i < words.length - 1; i++) {
        var bi = words[i].toLowerCase() + ' ' + words[i+1].toLowerCase();
        bigrams[bi] = (bigrams[bi] || 0) + 1;
    }
    result.phrasePatterns = Object.entries(bigrams).sort(function(a,b) { return b[1]-a[1]; }).slice(0,10).map(function(e) { return { phrase: e[0], count: e[1] }; });
    return result;
}

// Cross-reference text against capsule knowledge base
function crossReferenceCapsules(text, capsuleData) {
    if (!text || !capsuleData) return [];
    var lowerText = text.toLowerCase();
    var matches = [];
    capsuleData.forEach(function(cap) {
        var found = [];
        cap.words.forEach(function(w) {
            if (lowerText.includes(w.toLowerCase())) found.push(w);
        });
        if (found.length > 0) {
            matches.push({ capsule: cap.id, name: cap.name, cat: cap.cat, matchCount: found.length, matchedWords: found.slice(0, 10), coverage: found.length / cap.words.length });
        }
    });
    matches.sort(function(a,b) { return b.matchCount - a.matchCount; });
    return matches.slice(0, 10);
}

// AI-ready context profile for any text input
/* ══════════════════════════════════════════════════════
   TRANSCRIPT BATCH ANALYZER
   Fetches YouTube transcript via bridge → runs Universal Encoder
   on every line → produces flow/rhythm/music/concept analysis
   ══════════════════════════════════════════════════════ */
var BRIDGE_URL = 'http://localhost:8085';

async function fetchTranscript(urlOrId) {
    var url = urlOrId;
    if (!url.startsWith('http')) url = 'https://www.youtube.com/watch?v=' + urlOrId;
    try {
        var resp = await fetch(BRIDGE_URL + '/api/day/youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url }),
        });
        var data = await resp.json();
        return { url: url, transcript: data.transcript || '', error: data.error || null, exitCode: data.exit_code };
    } catch(e) {
        return { url: url, transcript: '', error: 'Bridge not running at ' + BRIDGE_URL + ': ' + e.message, exitCode: -1 };
    }
}

function analyzeTranscript(transcript) {
    if (!transcript || transcript.length < 10) return null;
    var lines = transcript.split('\n').filter(function(l) { return l.trim().length > 0; });
    var Enc = typeof window !== 'undefined' ? window.Encoder : null;
    var Steno = typeof window !== 'undefined' ? window.StenoEngine : null;
    var CapsAn = typeof window !== 'undefined' ? window.CapsuleAnalyzer : null;

    // Per-line analysis
    var analyzed = lines.map(function(line, idx) {
        var entry = { line: idx, text: line, wordCount: line.split(/\s+/).length };

        // Universal Encoder: flow, rhythm, music, cadence
        if (Enc) {
            try {
                var flow = Enc.toKeyboardFlow(line);
                entry.flowArrows = flow ? flow.arrows : '';
                entry.flowPattern = flow ? flow.pattern : '';
                entry.danceNotation = Enc.toDanceMoves(line);
                entry.wandNotation = Enc.toWandMoves(line);
                entry.musicalNotes = Enc.toMusicNotation(line);
                var rhythm = Enc.toRhythm(line);
                if (rhythm) {
                    entry.beats = rhythm.beats;
                    entry.timeSig = rhythm.timeSig;
                    entry.bpm = rhythm.bpm;
                }
                var inton = Enc.toIntonation(line);
                if (inton) {
                    entry.intonation = inton.pattern;
                    entry.cadence = inton.cadence;
                    entry.syllables = inton.totalSyllables;
                    entry.isChant = inton.isChant;
                    entry.musicalScale = inton.musicalScale;
                }
            } catch(e) {}
        }

        // StenoEngine: concept compression
        if (Steno) {
            try {
                var comp = Steno.compressSentence(line);
                entry.conceptSymbols = comp.compressed;
                entry.compressionRatio = comp.ratio;
                entry.conceptAtoms = comp.atoms;
                var sig = Steno.frequencySignature(line);
                if (sig) {
                    entry.dominantFreq = sig.dominant.freq;
                    entry.harmonicComplexity = sig.harmonicComplexity;
                }
                var flow2 = Steno.conceptFlow(line);
                if (flow2) {
                    entry.conceptFlowDir = flow2.flowDirection;
                    entry.chargeFlow = flow2.chargeFlow;
                }
            } catch(e) {}
        }

        // CapsuleAnalyzer: word-level ergonomic benchmark
        if (CapsAn) {
            try {
                var words = line.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2; });
                var analyses = words.slice(0, 20).map(function(w) { return CapsAn.lookupWord(w); });
                var inCapsule = analyses.filter(function(a) { return a.capsule; }).length;
                entry.capsulePct = Math.round(inCapsule / Math.max(analyses.length, 1) * 100);
                entry.avgEfficiency = Math.round(analyses.reduce(function(s,a) { return s + (a.analysis.efficiency || 0); }, 0) / Math.max(analyses.length, 1));
                entry.avgRsiRisk = Math.round(analyses.reduce(function(s,a) { return s + (a.analysis.rsiRisk || 0); }, 0) / Math.max(analyses.length, 1));
            } catch(e) {}
        }

        return entry;
    });

    // Aggregate stats across full transcript
    var totalWords = analyzed.reduce(function(s,a) { return s + a.wordCount; }, 0);
    var avgBpm = analyzed.filter(function(a) { return a.bpm; }).reduce(function(s,a) { return s + a.bpm; }, 0) / Math.max(analyzed.filter(function(a) { return a.bpm; }).length, 1);
    var avgCompression = analyzed.filter(function(a) { return a.compressionRatio; }).reduce(function(s,a) { return s + a.compressionRatio; }, 0) / Math.max(analyzed.filter(function(a) { return a.compressionRatio; }).length, 1);
    var chantLines = analyzed.filter(function(a) { return a.isChant; }).length;

    // Cadence distribution
    var cadenceDist = {};
    analyzed.forEach(function(a) { if (a.cadence) cadenceDist[a.cadence] = (cadenceDist[a.cadence] || 0) + 1; });

    // Concept flow direction distribution
    var flowDist = {};
    analyzed.forEach(function(a) { if (a.conceptFlowDir) flowDist[a.conceptFlowDir] = (flowDist[a.conceptFlowDir] || 0) + 1; });

    // Dominant frequencies across transcript
    var freqDist = {};
    analyzed.forEach(function(a) { if (a.dominantFreq) freqDist[a.dominantFreq] = (freqDist[a.dominantFreq] || 0) + 1; });

    // All concept atoms flattened
    var allAtoms = [];
    analyzed.forEach(function(a) { if (a.conceptAtoms) allAtoms = allAtoms.concat(a.conceptAtoms); });
    var atomCounts = {};
    allAtoms.forEach(function(a) { atomCounts[a] = (atomCounts[a] || 0) + 1; });
    var topAtoms = Object.entries(atomCounts).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 15);

    return {
        lineCount: lines.length,
        totalWords: totalWords,
        avgBpm: Math.round(avgBpm),
        avgCompression: Math.round(avgCompression * 10) / 10,
        chantLines: chantLines,
        cadenceDistribution: cadenceDist,
        conceptFlowDistribution: flowDist,
        dominantFrequencies: freqDist,
        topConceptAtoms: topAtoms,
        lines: analyzed,
        // Full context profile of entire transcript text
        contextProfile: null,  // caller can fill with buildContextProfile()
    };
}

async function analyzeYouTubeVideo(urlOrId) {
    var t = await fetchTranscript(urlOrId);
    if (t.error && !t.transcript) return { error: t.error, url: t.url };
    var analysis = analyzeTranscript(t.transcript);
    if (analysis) {
        analysis.url = t.url;
        analysis.contextProfile = buildContextProfile(t.transcript);
    }
    return analysis;
}

function buildContextProfile(text) {
    var intel = analyzeTextIntelligence(text);
    if (!intel) return null;
    var capsuleRefs = _kbatchData.capsuleKnowledge ? crossReferenceCapsules(text, _kbatchData.capsuleKnowledge) : [];
    // Pull cache intelligence if available (from kbatch CacheIntel)
    var cacheInsights = null;
    if (typeof window !== 'undefined' && window.CacheIntel) {
        var words = text.split(/\s+/).filter(function(w) { return w.length > 2; });
        var known = 0, totalRelevance = 0, totalDifficulty = 0, gates = {};
        words.forEach(function(w) {
            var entry = window.CacheIntel.getEntry(w.toLowerCase());
            if (entry && entry.hitCount > 0) {
                known++;
                totalRelevance += entry.relevance;
                totalDifficulty += entry.difficulty;
                if (entry.quantumGate) gates[entry.quantumGate] = (gates[entry.quantumGate] || 0) + 1;
            }
        });
        if (known > 0) {
            cacheInsights = {
                knownWords: known,
                totalWords: words.length,
                knownPct: Math.round(known / words.length * 100),
                avgRelevance: Math.round(totalRelevance / known),
                avgDifficulty: Math.round(totalDifficulty / known),
                quantumGateDistribution: gates,
                cacheSize: window.CacheIntel.getSize(),
            };
        }
    }
    // Persona context (from kbatch PersonaContext engine)
    var personaAnalysis = null;
    if (typeof window !== 'undefined' && window.PersonaContext) {
        personaAnalysis = window.PersonaContext.analyzeFullContext(text);
    }
    // Capsule benchmark data (from CapsuleAnalyzer)
    var capsuleBenchmark = null;
    if (typeof window !== 'undefined' && window.CapsuleAnalyzer) {
        try {
            var words = text.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2; });
            var analyzed = words.slice(0, 50).map(function(w) { return window.CapsuleAnalyzer.lookupWord(w); });
            var inCapsule = analyzed.filter(function(a) { return a.capsule; }).length;
            var avgEff = analyzed.reduce(function(s, a) { return s + (a.analysis.efficiency || 0); }, 0) / Math.max(analyzed.length, 1);
            var avgRsi = analyzed.reduce(function(s, a) { return s + (a.analysis.rsiRisk || 0); }, 0) / Math.max(analyzed.length, 1);
            capsuleBenchmark = {
                wordsAnalyzed: analyzed.length,
                inCapsulePct: Math.round(inCapsule / Math.max(analyzed.length, 1) * 100),
                avgEfficiency: Math.round(avgEff * 10) / 10,
                avgRsiRisk: Math.round(avgRsi * 10) / 10,
            };
        } catch(e) {}
    }
    return {
        intelligence: intel,
        capsuleMatches: capsuleRefs,
        cacheInsights: cacheInsights,
        personaContext: personaAnalysis,
        capsuleBenchmark: capsuleBenchmark,
        stenoCompression: (typeof window !== 'undefined' && window.StenoEngine) ? window.StenoEngine.compressSentence(text) : null,
        timestamp: Date.now(),
        wordCount: text.split(/\s+/).length,
        charCount: text.length,
        recommendations: generateContextRecommendations(intel, capsuleRefs, personaAnalysis),
    };
}

function generateContextRecommendations(intel, capsuleMatches, personaCtx) {
    var recs = [];
    // Persona-driven recommendations (highest priority)
    if (personaCtx) {
        if (personaCtx.therapeutic && personaCtx.therapeutic.isCrisis) {
            recs.push({ type: 'CRISIS', msg: '\uD83D\uDEA8 Crisis detected \u2014 988 Suicide & Crisis Lifeline (call/text 988) | Crisis Text Line (text HOME to 741741)' });
        }
        if (personaCtx.financial && personaCtx.financial.overallPressure > 60) {
            recs.push({ type: 'financial', msg: 'High financial pressure detected (' + personaCtx.financial.primaryConcern + ') \u2014 prioritize actionable resources over theoretical content' });
        }
        if (personaCtx.therapeutic && personaCtx.therapeutic.dominantState && personaCtx.therapeutic.dominantState !== 'neutral') {
            recs.push({ type: 'therapeutic', msg: 'Emotional state: ' + personaCtx.therapeutic.dominantState + ' \u2014 weight results toward supportive, constructive content' });
        }
        if (personaCtx.primaryLayer) {
            recs.push({ type: 'context', msg: 'Primary context layer: ' + personaCtx.primaryLayer + ' \u2014 focus results at this scope level' });
        }
    }
    if (intel.registers.length === 0) recs.push({ type: 'info', msg: 'No strong register detected \u2014 generic content' });
    if (intel.registers.some(function(r) { return r.type === 'medical'; })) recs.push({ type: 'caution', msg: 'Medical content detected — verify with professional sources' });
    if (intel.registers.some(function(r) { return r.type === 'news'; })) recs.push({ type: 'verify', msg: 'News language detected — cross-reference with multiple sources' });
    if (intel.registers.some(function(r) { return r.type === 'ancient'; })) recs.push({ type: 'domain', msg: 'Ancient/historical language detected — cross-reference with archaeological sources and etymological databases' });
    if (intel.registers.some(function(r) { return r.type === 'encoding'; })) recs.push({ type: 'tech', msg: 'Encoding/binary content detected — use Universal Encoder for live conversion (Braille, Morse, Hex, ASCII)' });
    if (intel.registers.some(function(r) { return r.type === 'access'; })) recs.push({ type: 'access', msg: 'Accessibility content detected — ensure output is compatible with screen readers, Braille displays, and sign language resources' });
    if (intel.registers.some(function(r) { return r.type === 'code'; })) recs.push({ type: 'tech', msg: 'Code/programming content detected — apply quantum prefix classification for structural analysis' });
    if (intel.intentSignals.includes('commercial')) recs.push({ type: 'awareness', msg: 'Commercial intent detected — evaluate for promotional bias' });
    if (intel.intentSignals.includes('assistance')) recs.push({ type: 'priority', msg: 'Help request detected — prioritize actionable information' });
    if (intel.ageRegister === 'child') recs.push({ type: 'adapt', msg: 'Child-level language — simplify responses and explanations' });
    if (intel.ageRegister === 'teen') recs.push({ type: 'adapt', msg: 'Teen register — balance relatable tone with accuracy' });
    if (intel.complexity > 70) recs.push({ type: 'info', msg: 'High complexity text — consider summarization for broader audience' });
    if (capsuleMatches.length > 0) {
        var topCat = capsuleMatches[0].cat;
        recs.push({ type: 'domain', msg: 'Primary domain: ' + topCat + ' — use specialized vocabulary in responses' });
    }
    if (intel.sentimentLean === 'negative') recs.push({ type: 'tone', msg: 'Negative sentiment — approach with empathy, provide constructive framing' });
    return recs;
}

/* ══════════════════════════════════════════════════════
   EXPORT
   ══════════════════════════════════════════════════════ */
const HistorySearch = {
    VERSION: '2.5.0',
    search,
    getConnectors,
    setConnectorEnabled,
    getScales,
    getSourceColor,
    drawTimeline,
    drawTimelineVertical,
    fetchDocument,
    analyzeContext,
    detectPatterns,
    // AI Lens (v2.1)
    trackInteraction,
    getHeatmapData,
    clearHeatmap,
    analyzePageStructure,
    weightResults,
    generateContent,
    computeVisionZones,
    drawHeatmap,
    // KBatch Bridge (v2.2)
    receiveKbatchTraining,
    getKbatchData,
    analyzeKeyboardPatterns,
    generatePatternReport,
    // Cross-Linguistic Intelligence (v2.3)
    analyzeTextIntelligence,
    crossReferenceCapsules,
    buildContextProfile,
    generateContextRecommendations,
    // YouTube Transcript Analyzer (v2.5)
    fetchTranscript,
    analyzeTranscript,
    analyzeYouTubeVideo,
    SRC_COLORS,
    CONNECTORS,
    TL_SCALES,
};

root.HistorySearch = HistorySearch;

// Also broadcast availability
if (typeof BroadcastChannel !== 'undefined') {
    try {
        var bc = new BroadcastChannel('history-search');
        bc.postMessage({ type: 'engine-ready', version: VERSION });
    } catch(e) {}
}

})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : this);
