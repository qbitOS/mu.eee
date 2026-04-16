// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// History Search Engine — shared module for extension + PWA + hexterm
// Usage: <script src="history-search-engine.js"></script> then window.HistorySearch.search(query)
'use strict';

(function(root) {

const VERSION = '2.10.3';

/**
 * Optional same-origin / Worker proxy so connectors work when APIs omit CORS (Safari, localhost).
 * Set window.__UVSPEED_FETCH_PROXY__ or localStorage "uvspeed-fetch-proxy-url" to your Worker origin + path, e.g.
 *   https://your-worker.workers.dev/api/fetch-proxy
 * Deploy: cloudflare/uvspeed-fetch-proxy-worker.js
 */
function getFetchProxyBase() {
    try {
        var w = (typeof root !== 'undefined' && root.__UVSPEED_FETCH_PROXY__) || '';
        w = String(w || '').trim();
        if (w) return w.replace(/\/?$/, '');
        if (typeof localStorage !== 'undefined') {
            w = String(localStorage.getItem('uvspeed-fetch-proxy-url') || '').trim();
            if (w) return w.replace(/\/?$/, '');
        }
    } catch (e) {}
    return '';
}

function corsFetch(url, init) {
    init = init || {};
    var target = String(url);
    var base = getFetchProxyBase();
    if (!base || !/^https?:\/\//i.test(target)) {
        return fetch(target, init);
    }
    var proxyUrl = base + '?url=' + encodeURIComponent(target);
    return fetch(proxyUrl, init);
}

var INVIDIOUS_INSTANCES = [
    'https://vid.puffyan.us',
    'https://invidious.projectsegfau.lt',
    'https://invidious.flokinet.to',
    'https://inv.riverside.rocks',
    'https://invidious.privacyredirect.com'
];

function mapInvidiousVideos(data, q) {
    return (Array.isArray(data) ? data : []).slice(0, 5).map(function (v) {
        var vid = v.videoId || '';
        return {
            title: v.title || q,
            source: 'youtube',
            snippet:
                (v.author || '') +
                ' | ' +
                (v.lengthSeconds
                    ? Math.floor(v.lengthSeconds / 60) + ':' + ('0' + (v.lengthSeconds % 60)).slice(-2)
                    : '') +
                ' | ' +
                (v.viewCount ? v.viewCount.toLocaleString() + ' views' : '') +
                (v.description ? ' \u2014 ' + v.description.substring(0, 100) : ''),
            url: 'https://www.youtube.com/watch?v=' + vid,
            videoId: vid,
            duration: v.lengthSeconds || 0,
            author: v.author || '',
            thumbnail: vid ? 'https://i.ytimg.com/vi/' + vid + '/mqdefault.jpg' : ''
        };
    });
}

function searchInvidiousYoutube(q) {
    var urls = INVIDIOUS_INSTANCES.map(function (base) {
        return base + '/api/v1/search?q=' + encodeURIComponent(q) + '&type=video&page=1';
    });
    function attempt(i) {
        if (i >= urls.length) return Promise.resolve(null);
        return corsFetch(urls[i])
            .then(function (r) {
                if (!r.ok) throw new Error(String(r.status));
                return r.json();
            })
            .then(function (data) {
                if (Array.isArray(data) && data.length) return data;
                return attempt(i + 1);
            })
            .catch(function () {
                return attempt(i + 1);
            });
    }
    return attempt(0).then(function (data) {
        if (data && data.length) return mapInvidiousVideos(data, q);
        return [
            {
                title: 'YouTube: ' + q,
                source: 'youtube',
                snippet: 'No Invidious instance responded — open YouTube or set a CORS fetch proxy (see Search settings).',
                url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q)
            }
        ];
    });
}

const SRC_COLORS = {
    local: '#34d399', wikipedia: '#3b82f6', openlibrary: '#f97316',
    wayback: '#fb7185', 'sacred-texts': '#a78bfa', yale: '#fbbf24',
    arda: '#ef4444', arxiv: '#8b5cf6', pubchem: '#06b6d4',
    genbank: '#22d3ee', 'lgbtq-archives': '#d946ef', 'meta-research': '#6366f1',
    hathitrust: '#84cc16', 'internet-archive': '#f59e0b',
    fred: '#e11d48', worldbank: '#0ea5e9', coingecko: '#10b981',
    wiktionary: '#9333ea', datamuse: '#d946ef', youtube: '#ff0000',
    duckduckgo: '#de5833',
    'video-transcript': '#f59e0b',
    /** Wikinews — neutral wire-style articles (Wikimedia; CORS-safe in browser) */
    'wire-news': '#0d9488',
    /** Library of Congress newspaper directory (History spine #2) */
    'history-archive': '#ea580c',
    'loc-periodicals': '#c2410c',
    'loc-photos': '#9a3412',
    /** YC / Hacker News (Algolia public API) */
    hn: '#f97316',
    /** Substack discover (link-out) */
    substack: '#ff6719',
    /** YC / HN portal rows (same lane as Substack connector) */
    'yc-portal': '#ea580c',
    crunchbase: '#0284c7',
    sequoia: '#047857',
    /** AP / Reuters / AFP portal rows (subscription APIs are server-side only) */
    'press-wire': '#64748b',
    /** World wires + live CC / TTY-adjacent surfaces (link-out; no wholesale API in browser) */
    'wire-live-tx': '#ea580c',
    /** NOAA / NCEI — climate & historical weather portals */
    'noaa-climate': '#0ea5e9',
    /** USGS — earthquakes + water + science */
    'usgs-earth': '#78716c',
    /** USDA / moon / seasons / solar — agrarian & Earth cycles */
    'earth-cycles': '#84cc16',
    /** Better Business Bureau */
    bbb: '#f59e0b',
    /** IANA / ICANN / DNS root & RDAP */
    'iana-icann': '#6366f1',
};

/** Compact book record for corpus / L2 ingest (search hit — no full work fetch). */
function buildBookIngestPreviewFromOlSearchDoc(doc, coverUrl) {
    var key = doc.key || '';
    var wkey = key.replace(/^\/works\//, '') || '';
    var ia = doc.ia || [];
    return {
        schema: 'uvspeed.book.ingest.v1',
        title: doc.title || '',
        subtitle: doc.subtitle || '',
        authors: doc.author_name || [],
        year: doc.first_publish_year || null,
        subjects: (doc.subject || []).slice(0, 16),
        openLibraryUrl: key ? ('https://openlibrary.org' + key) : '',
        openLibraryKey: wkey,
        coverUrl: coverUrl || '',
        preview: (doc.first_sentence && String(doc.first_sentence).trim()) || '',
        internetArchiveIds: ia,
        iaBrowseUrl: ia[0] ? ('https://archive.org/details/' + ia[0]) : '',
        access: {
            publicScan: !!doc.public_scan_b,
            fulltext: !!doc.has_fulltext,
            ebook: doc.ebook_access || '',
        },
        editionCount: doc.edition_count || 0,
        source: 'openlibrary-search',
        fetchedAt: Date.now(),
    };
}

/**
 * Map Library of Congress JSON search (`content.results`) into result rows.
 * Used by multiple LOC facets (newspapers directory already has a dedicated parser).
 */
function mapLocSearchResults(d, q, meta) {
    meta = meta || {};
    var items = (d.content && d.content.results) || [];
    var lane = meta.label || 'Library of Congress';
    return items.map(function (it) {
        var title =
            (it.title ||
                (it.item && it.item.title) ||
                (it.index && it.index.title) ||
                it.id ||
                'LOC item')
                .toString()
                .replace(/<[^>]+>/g, '');
        var thumb = '';
        if (it.image_url) {
            thumb = Array.isArray(it.image_url) ? (it.image_url[0] || '') : String(it.image_url);
        } else if (it.thumbnail) {
            thumb = typeof it.thumbnail === 'string' ? it.thumbnail : (it.thumbnail.url || '');
        }
        var bits = [lane];
        if (it.date) bits.push(String(it.date));
        if (it.digitized) bits.push('digitized');
        return {
            title: title.substring(0, 220),
            source: meta.source || 'history-archive',
            snippet: bits.join(' — ').substring(0, 280),
            url: it.id || ('https://www.loc.gov/search/?q=' + encodeURIComponent(q)),
            date: it.date || '',
            location: (it.partof && it.partof[0]) || '',
            archive: lane,
            thumbnail: thumb
        };
    });
}

/* ══════════════════════════════════════════════════════
   CONNECTORS
   ══════════════════════════════════════════════════════ */
/** Data connectors (expand: push a new object with { name, icon, enabled, search: async (q) => [...] }).
 *  Current count: 37 — Wikipedia, Wikinews, DuckDuckGo, LOC Newspapers, LOC Periodicals, LOC Photos, Open Library, Wayback, Sacred Texts,
 *  Yale, ARDA, arXiv, PubChem, GenBank, LGBTQ Archives, Meta Research, HathiTrust, Internet Archive,
 *  FRED, World Bank, CoinGecko, Wiktionary, Datamuse, YouTube, Video Transcripts,
 *  Agency wires, Agency live TX (world wires + live CC / captions), Hacker News (Algolia), Substack + YC/HN portals, Crunchbase, Sequoia,
 *  NOAA Climate, USGS, Earth cycles (USDA / moon / seasons / solar), BBB, DNS governance (IANA / ICANN / RDAP). */
const CONNECTORS = [
    {
        name: 'Wikipedia', icon: 'W', enabled: true,
        search: q => corsFetch('https://en.wikipedia.org/w/api.php?action=opensearch&search=' + encodeURIComponent(q) + '&limit=6&format=json&origin=*')
            .then(r => r.json())
            .then(function (d) {
                var titles = d[1] || [];
                var urls = d[3] || [];
                var snippets = d[2] || [];
                if (!titles.length) return [];
                var tparam = titles.map(function (t) { return encodeURIComponent(t); }).join('|');
                return corsFetch('https://en.wikipedia.org/w/api.php?action=query&titles=' + tparam + '&prop=pageimages&format=json&origin=*&pithumbsize=120')
                    .then(r => r.json())
                    .then(function (pi) {
                        var pages = (pi.query && pi.query.pages) || {};
                        return titles.map(function (t, i) {
                            var p = Object.values(pages).find(function (pg) { return pg && pg.title === t; });
                            var thumb = (p && p.thumbnail && p.thumbnail.source) ? p.thumbnail.source : '';
                            return { title: t, source: 'wikipedia', url: urls[i], snippet: snippets[i], thumbnail: thumb };
                        });
                    })
                    .catch(function () {
                        return titles.map(function (t, i) {
                            return { title: t, source: 'wikipedia', url: urls[i], snippet: snippets[i], thumbnail: '' };
                        });
                    });
            })
            .catch(() => [])
    },
    {
        /** Wire desk: Wikinews (editorial, date-stamped; same-origin-friendly as Wikipedia). */
        name: 'Wikinews', icon: 'WS', enabled: true,
        search: q => corsFetch('https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(q) + '&srlimit=8&format=json&origin=*')
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
        /** Instant answer + related — api.duckduckgo.com has no CORS in many browsers; use fetch proxy or HTML fallback. */
        name: 'DuckDuckGo', icon: 'DD', enabled: true,
        search: function (q) {
            var eq = encodeURIComponent(q);
            var webFallback = function () {
                return [
                    {
                        title: 'DuckDuckGo — ' + q,
                        source: 'duckduckgo',
                        snippet: 'Web results (instant JSON API blocked by CORS here — set localStorage uvspeed-fetch-proxy-url or open link).',
                        url: 'https://duckduckgo.com/?q=' + eq
                    },
                    {
                        title: 'DuckDuckGo — HTML',
                        source: 'duckduckgo',
                        snippet: 'Legacy HTML results page (same-origin not required for navigation).',
                        url: 'https://duckduckgo.com/html/?q=' + eq
                    }
                ];
            };
            var skipDdgJson = false;
            try {
                if (!getFetchProxyBase() && typeof location !== 'undefined' && location.hostname) {
                    if (/^(127\.0\.0\.1|localhost)$/i.test(location.hostname)) skipDdgJson = true;
                }
            } catch (eSkip) {}
            if (skipDdgJson) {
                return Promise.resolve(webFallback());
            }
            return corsFetch(
                'https://api.duckduckgo.com/?q=' + eq + '&format=json&no_html=1&no_redirect=1&t=uvspeed'
            )
                .then(function (r) {
                    if (!r.ok) throw new Error('ddg http');
                    return r.json();
                })
                .then(function (d) {
                    var out = [];
                    if (d.Abstract && String(d.Abstract).trim()) {
                        out.push({
                            title: (d.Heading || q).substring(0, 200),
                            source: 'duckduckgo',
                            snippet: String(d.Abstract).substring(0, 280),
                            url: d.AbstractURL || 'https://duckduckgo.com/?q=' + eq,
                            thumbnail: d.Image || ''
                        });
                    }
                    (d.RelatedTopics || []).slice(0, 10).forEach(function (rt) {
                        if (rt && typeof rt === 'object' && rt.Text && rt.FirstURL) {
                            out.push({
                                title: rt.Text.substring(0, 100),
                                source: 'duckduckgo',
                                snippet: rt.Text.substring(0, 240),
                                url: rt.FirstURL
                            });
                        }
                    });
                    if (out.length) return out.slice(0, 8);
                    return webFallback();
                })
                .catch(function () {
                    return webFallback();
                });
        }
    },
    {
        /** Historic newspapers — LOC newspaper directory (CORS `*`; pairs with History spine #2). */
        name: 'LOC Newspapers', icon: 'HN', enabled: true,
        search: q => corsFetch('https://www.loc.gov/newspapers/?dl=item&fo=json&q=' + encodeURIComponent(q) + '&c=10')
            .then(r => r.json())
            .then(d => {
                var items = (d.content && d.content.results) || [];
                return items.map(function (it) {
                    var title = (it.title || 'Newspaper').replace(/<[^>]+>/g, '');
                    var loc = (it.location_city && it.location_city[0] ? it.location_city[0] + ', ' : '') +
                        (it.location_state && it.location_state[0] ? it.location_state[0] : '');
                    var locTrim = (loc || '').replace(/,\s*$/, '').trim();
                    var thumb = '';
                    if (it.image_url) {
                        thumb = Array.isArray(it.image_url) ? (it.image_url[0] || '') : String(it.image_url);
                    } else if (it.thumbnail) {
                        thumb = typeof it.thumbnail === 'string' ? it.thumbnail : (it.thumbnail.url || '');
                    }
                    return {
                        title: title.substring(0, 220),
                        source: 'history-archive',
                        snippet: (it.date || '') + (locTrim ? ' — ' + locTrim : '') + ' — Library of Congress',
                        url: it.id || ('https://www.loc.gov/newspapers/?q=' + encodeURIComponent(q)),
                        date: it.date || '',
                        location: locTrim,
                        archive: 'Library of Congress',
                        thumbnail: thumb
                    };
                });
            }).catch(function () { return []; })
    },
    {
        /** Historic periodicals — same LOC JSON API, different facet (fills “history” bucket with non-newspaper serials). */
        name: 'LOC Periodicals', icon: 'Pd', enabled: true,
        search: q =>
            corsFetch(
                'https://www.loc.gov/search/?q=' +
                    encodeURIComponent(q) +
                    '&fo=json&c=10&fa=original-format:periodical'
            )
                .then(r => r.json())
                .then(d =>
                    mapLocSearchResults(d, q, {
                        source: 'loc-periodicals',
                        label: 'LOC periodicals'
                    })
                )
                .catch(function () {
                    return [];
                })
    },
    {
        /** Prints & photographs — visual history lane; still tagged for History band filters. */
        name: 'LOC Photos', icon: 'Pt', enabled: true,
        search: q =>
            corsFetch('https://www.loc.gov/photos/?q=' + encodeURIComponent(q) + '&fo=json&c=10')
                .then(r => r.json())
                .then(d =>
                    mapLocSearchResults(d, q, {
                        source: 'loc-photos',
                        label: 'LOC photos / prints'
                    })
                )
                .catch(function () {
                    return [];
                })
    },
    {
        name: 'Open Library', icon: 'OL', enabled: true,
        search: q => corsFetch(
            'https://openlibrary.org/search.json?q=' + encodeURIComponent(q) +
            '&limit=8&fields=key,title,subtitle,author_name,first_publish_year,cover_i,subject,' +
            'ia,public_scan_b,has_fulltext,ebook_access,first_sentence,edition_count,lending_edition_s'
        )
            .then(r => r.json())
            .then(d => (d.docs || []).slice(0, 8).map(function(doc) {
                var cover = doc.cover_i ? ('https://covers.openlibrary.org/b/id/' + doc.cover_i + '-M.jpg') : '';
                var authorLine = (doc.author_name || []).join(', ');
                var yearBit = doc.first_publish_year ? ' (' + doc.first_publish_year + ')' : '';
                var preview = (doc.first_sentence && String(doc.first_sentence).trim()) || '';
                var snippet = preview
                    ? (preview.length > 220 ? preview.substring(0, 217) + '…' : preview)
                    : (authorLine + yearBit + (doc.edition_count ? ' · ' + doc.edition_count + ' ed.' : ''));
                return {
                    title: doc.title,
                    source: 'openlibrary',
                    snippet: snippet,
                    url: 'https://openlibrary.org' + doc.key,
                    year: doc.first_publish_year || '',
                    thumbnail: cover,
                    olCoverId: doc.cover_i || null,
                    olFirstSentence: preview || null,
                    olIa: doc.ia || [],
                    olPublicScan: !!doc.public_scan_b,
                    olHasFulltext: !!doc.has_fulltext,
                    olEbookAccess: doc.ebook_access || '',
                    olEditionCount: doc.edition_count || 0,
                    bookIngestPreview: buildBookIngestPreviewFromOlSearchDoc(doc, cover),
                };
            })
            ).catch(() => [])
    },
    {
        /** CDX API has no CORS from browsers — link-out avoids console noise on mueee / PWAs. */
        name: 'Wayback Machine', icon: 'WB', enabled: true,
        search: q => Promise.resolve([{
            title: 'Wayback / Archive.org — search: ' + q,
            source: 'wayback',
            snippet: 'Open archive.org (CDX JSON is not CORS-safe in-browser).',
            url: 'https://archive.org/search.php?query=' + encodeURIComponent(q)
        }])
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
        search: q => corsFetch('https://export.arxiv.org/api/query?search_query=all:' + encodeURIComponent(q) + '&max_results=4')
            .then(r => r.text())
            .then(xml => {
                const entries = [];
                const re = /<entry>([\s\S]*?)<\/entry>/g;
                let m;
                while ((m = re.exec(xml)) !== null) {
                    const block = m[1];
                    const tm = /<title>([\s\S]*?)<\/title>/.exec(block);
                    const idm = /<id>([\s\S]*?)<\/id>/.exec(block);
                    const sm = /<summary>([\s\S]*?)<\/summary>/.exec(block);
                    const pub = /<published>([^<]+)<\/published>/.exec(block);
                    const upd = /<updated>([^<]+)<\/updated>/.exec(block);
                    if (!tm || !idm) continue;
                    const publishedAt = pub ? pub[1].trim() : '';
                    const updatedAt = upd ? upd[1].trim() : '';
                    entries.push({
                        title: tm[1].trim().replace(/\s+/g, ' '),
                        source: 'arxiv',
                        url: idm[1].trim(),
                        snippet: sm ? sm[1].trim().substring(0, 150) : '',
                        publishedAt: publishedAt,
                        updatedAt: updatedAt,
                        date: publishedAt || updatedAt || ''
                    });
                }
                return entries;
            }).catch(() => [])
    },
    {
        name: 'PubChem', icon: 'PC', enabled: true,
        search: q => corsFetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/' + encodeURIComponent(q) + '/property/MolecularFormula,MolecularWeight/JSON')
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
        search: q => corsFetch('https://archive.org/advancedsearch.php?q=' + encodeURIComponent(q) + '&fl[]=identifier,title,publicdate&rows=5&output=json')
            .then(r => r.json())
            .then(d => (d.response?.docs || []).map(doc => {
                var pd = doc.publicdate || '';
                return {
                    title: doc.title, source: 'internet-archive',
                    snippet: 'Internet Archive collection',
                    url: 'https://archive.org/details/' + doc.identifier,
                    publishedAt: pd,
                    date: pd
                };
            })).catch(() => [])
    },
    // ── Economic / Monetary connectors ──
    {
        /** FRED web UI (JSON API needs a free fred.stlouisfed.org API key — do not hardcode). */
        name: 'FRED', icon: 'FR', enabled: true,
        search: q =>
            Promise.resolve([
                {
                    title: 'FRED — search: ' + q,
                    source: 'fred',
                    snippet: 'St. Louis Fed economic data (browser: open link; API needs key + proxy).',
                    url: 'https://fred.stlouisfed.org/search?st=' + encodeURIComponent(q)
                }
            ])
    },
    {
        name: 'World Bank', icon: 'WB$', enabled: true,
        search: q => corsFetch('https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=3&date=2020:2024')
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
        search: q => corsFetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(q))
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
        search: q => corsFetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(q))
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
        search: q => corsFetch('https://api.datamuse.com/words?ml=' + encodeURIComponent(q) + '&max=6&md=d')
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
        search: function (q) {
            return searchInvidiousYoutube(q);
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
    // ── Wholesale wire portals (browser: search pages; APIs require contracts + server keys) ──
    {
        name: 'Agency wires', icon: 'Aw', enabled: true,
        search: function (q) {
            return Promise.resolve([
                {
                    title: 'AP News — ' + q,
                    source: 'press-wire',
                    snippet: 'Associated Press — wholesale API is contract-only; opens site search.',
                    url: 'https://apnews.com/search?q=' + encodeURIComponent(q)
                },
                {
                    title: 'Reuters — ' + q,
                    source: 'press-wire',
                    snippet: 'Reuters — Connect / Newswires are B2B; opens site search.',
                    url: 'https://www.reuters.com/site-search/?query=' + encodeURIComponent(q)
                },
                {
                    title: 'AFP — ' + q,
                    source: 'press-wire',
                    snippet: 'Agence France-Presse — wholesale feeds are subscription; opens site search.',
                    url: 'https://www.afp.com/en/search?query=' + encodeURIComponent(q)
                },
                {
                    title: 'EFE — Spain — ' + q,
                    source: 'press-wire',
                    snippet: 'EFE Agencia — Spanish-language wire; public search (wholesale API is B2B).',
                    url: 'https://www.efe.com/efe/english/search/?q=' + encodeURIComponent(q)
                },
                {
                    title: 'Europa Press — ' + q,
                    source: 'press-wire',
                    snippet: 'Spanish private wire — site search.',
                    url: 'https://www.europapress.es/buscar/' + encodeURIComponent(q)
                },
                {
                    title: 'ANSA — Italy — ' + q,
                    source: 'press-wire',
                    snippet: 'Agenzia Nazionale Stampa Associata — English search.',
                    url: 'https://www.ansa.it/sito/english/search.shtml?query=' + encodeURIComponent(q)
                },
                {
                    title: 'dpa — Germany — ' + q,
                    source: 'press-wire',
                    snippet: 'Deutsche Presse-Agentur — English wire search.',
                    url: 'https://www.dpa-international.com/search/?q=' + encodeURIComponent(q)
                },
                {
                    title: 'PA Media — UK — ' + q,
                    source: 'press-wire',
                    snippet: 'UK national news agency — public site search.',
                    url: 'https://www.pa.media/search/?q=' + encodeURIComponent(q)
                },
                {
                    title: 'The Guardian — UK — ' + q,
                    source: 'press-wire',
                    snippet: 'Guardian Open Platform / editorial search (not raw wire).',
                    url: 'https://www.theguardian.com/uk/search?q=' + encodeURIComponent(q)
                },
                {
                    title: 'El País — Spain — ' + q,
                    source: 'press-wire',
                    snippet: 'Spanish daily — search (complements EFE / Europa Press).',
                    url: 'https://elpais.com/buscar/?q=' + encodeURIComponent(q)
                },
                {
                    title: 'EU — Commission search — ' + q,
                    source: 'press-wire',
                    snippet: 'European Commission portal — news, press, policy (supranational EU bodies).',
                    url: 'https://commission.europa.eu/search_en?query=' + encodeURIComponent(q)
                },
                {
                    title: 'EUR-Lex — EU law — ' + q,
                    source: 'press-wire',
                    snippet: 'Official EU legal database — directives, regs, decisions.',
                    url: 'https://eur-lex.europa.eu/search.html?type=simple&lang=en&text=' + encodeURIComponent(q)
                }
            ]);
        }
    },
    {
        /** World news agencies + intl broadcast: live streams, CC, ENR-style captions, UN — link-out only (no wholesale transcript API in-browser). */
        name: 'Agency live TX', icon: 'Tx', enabled: true,
        search: function (q) {
            var eq = encodeURIComponent(q);
            return Promise.resolve([
                {
                    title: 'Reuters — site + video desks — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Wire + Connect are B2B; browser opens public search / video. Automated room transcripts are subscriber-side.',
                    url: 'https://www.reuters.com/site-search/?query=' + eq
                },
                {
                    title: 'Bloomberg — search & live — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Terminal EVT / corporate transcripts are Terminal-only; web search + live video use [CC] where offered.',
                    url: 'https://www.bloomberg.com/search?query=' + eq
                },
                {
                    title: 'Associated Press — AP News — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'AP Newsroom / wholesale APIs are professional; public site search + alerts.',
                    url: 'https://apnews.com/search?q=' + eq
                },
                {
                    title: 'AFP — Agence France-Presse — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Wire + multimedia; full feeds subscription. Site search for public copy.',
                    url: 'https://www.afp.com/en/search?query=' + eq
                },
                {
                    title: 'BBC News — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'BBC World + iPlayer: live programmes often carry broadcast CC (regional rules).',
                    url: 'https://www.bbc.co.uk/search?q=' + eq
                },
                {
                    title: 'BBC iPlayer — live & catch-up',
                    source: 'wire-live-tx',
                    snippet: 'UK: live channels; use player [S]ubtitles where enabled — not a raw transcript API.',
                    url: 'https://www.bbc.co.uk/iplayer'
                },
                {
                    title: 'CNN — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'CNN International live streams: web player [CC] for many regions (FCC-style rules in US).',
                    url: 'https://www.cnn.com/search?q=' + eq
                },
                {
                    title: 'CNN — live',
                    source: 'wire-live-tx',
                    snippet: 'Breaking live video; captions on supported browsers/players.',
                    url: 'https://www.cnn.com/live'
                },
                {
                    title: 'Al Jazeera English — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Live + on-demand; use player captions for speech-to-text style reading.',
                    url: 'https://www.aljazeera.com/search/?q=' + eq
                },
                {
                    title: 'Al Jazeera — live',
                    source: 'wire-live-tx',
                    snippet: 'AJ English live stream page.',
                    url: 'https://live.aljazeera.com/'
                },
                {
                    title: 'France 24 — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'French intl broadcast — live + VOD; captions vary by platform.',
                    url: 'https://www.france24.com/en/search/?search_mode=normal&query=' + eq
                },
                {
                    title: 'DW — Deutsche Welle — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'German intl public — live TV + audio; subtitles on many clips.',
                    url: 'https://www.dw.com/en/search/en/?language=en&phrase=' + eq
                },
                {
                    title: 'Euronews — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Pan-European live + VoD; check player for CC.',
                    url: 'https://www.euronews.com/search?query=' + eq
                },
                {
                    title: 'Sky News — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'UK rolling news — live with broadcast captions on supported apps.',
                    url: 'https://news.sky.com/search?q=' + eq
                },
                {
                    title: 'NPR — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'US public radio + live station streams; transcripts on many articles.',
                    url: 'https://www.npr.org/search?query=' + eq
                },
                {
                    title: 'CBS News — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Network live + local; web [CC] on many players.',
                    url: 'https://www.cbsnews.com/search/?q=' + eq
                },
                {
                    title: 'ABC News — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'ABC News Live + articles; captions on stream where provided.',
                    url: 'https://abcnews.go.com/search?searchtext=' + eq
                },
                {
                    title: 'NBC News — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'MSNBC / NBC digital — live captions platform-dependent.',
                    url: 'https://www.nbcnews.com/search/?q=' + eq
                },
                {
                    title: 'UN WebTV — search — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'UN meetings & special events — often with UN verbatim / summary docs; video with caption tracks when posted.',
                    url: 'https://media.un.org/en/asset/search?query=' + eq
                },
                {
                    title: 'UN News — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'UN coverage + press briefings text (not raw steno).',
                    url: 'https://news.un.org/en/content/un-news-search?search=' + eq
                },
                {
                    title: 'NHK World — Japan — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'English public international — live TV + many clips with subtitles.',
                    url: 'https://www3.nhk.or.jp/nhkworld/en/news/'
                },
                {
                    title: 'Kyodo News — English — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Japanese wire English desk (use site search box for topics).',
                    url: 'https://english.kyodonews.net/'
                },
                {
                    title: 'Yonhap — English — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Korea wire English service.',
                    url: 'https://en.yna.co.kr/search?query=' + eq
                },
                {
                    title: 'Xinhua — English — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'China state wire English — site search.',
                    url: 'https://english.news.cn/'
                },
                {
                    title: 'TASS — English — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Russian state wire English.',
                    url: 'https://tass.com/search?search=' + eq
                },
                {
                    title: 'ANSA — English — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Italian wire English.',
                    url: 'https://www.ansa.it/english/'
                },
                {
                    title: 'EFE — English — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'Spanish wire international English.',
                    url: 'https://www.efe.com/efe/english/4'
                },
                {
                    title: 'dpa international — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'German press agency international desk.',
                    url: 'https://www.dpa-international.com/news/?s=' + eq
                },
                {
                    title: 'Radio New Zealand — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'RNZ news + live audio; article text and some transcripts.',
                    url: 'https://www.rnz.co.nz/search?q=' + eq
                },
                {
                    title: 'Australian Associated Press — ' + q,
                    source: 'wire-live-tx',
                    snippet: 'AAP newswire surface — wholesale is B2B; public site.',
                    url: 'https://www.aap.com.au/search/?q=' + eq
                },
                {
                    title: 'Rev — transcripts (human + AI)',
                    source: 'wire-live-tx',
                    snippet: 'Third-party: upload AV for transcript; not an agency feed.',
                    url: 'https://www.rev.com/'
                },
                {
                    title: 'Web Captioner — browser live captions',
                    source: 'wire-live-tx',
                    snippet: 'DIY: mic / tab audio → live text in browser (TTY-adjacent for some workflows).',
                    url: 'https://webcaptioner.com/'
                },
                {
                    title: 'FCC — closed captioning rules (US broadcast)',
                    source: 'wire-live-tx',
                    snippet: 'Regulatory context for live CC on TV vs web; not agency transcripts.',
                    url: 'https://www.fcc.gov/general/closed-captioning-video-programming'
                },
                {
                    title: 'Live captioning — Wikipedia',
                    source: 'wire-live-tx',
                    snippet: 'Overview: CART, ENR, steno, vs AI live captioning.',
                    url: 'https://en.wikipedia.org/wiki/Live_captioning'
                }
            ]);
        }
    },
    {
        /** Public Algolia HN API — CORS-friendly; icon `hN` avoids collision with LOC Newspapers (`HN`). */
        name: 'Hacker News', icon: 'hN', enabled: true,
        search: function (q) {
            return corsFetch(
                'https://hn.algolia.com/api/v1/search?query=' +
                    encodeURIComponent(q) +
                    '&tags=story&hitsPerPage=10'
            )
                .then(function (r) {
                    if (!r.ok) throw new Error(String(r.status));
                    return r.json();
                })
                .then(function (d) {
                    var hits = d.hits || [];
                    return hits.map(function (h) {
                        var id = h.objectID || h.story_id || '';
                        var u = h.url || (id ? 'https://news.ycombinator.com/item?id=' + id : 'https://news.ycombinator.com');
                        var pts = h.points != null ? h.points + ' pts' : '';
                        var au = h.author || '';
                        var nc = h.num_comments != null ? h.num_comments + ' comments' : '';
                        var sn = [pts, au, nc].filter(Boolean).join(' · ');
                        var ca = h.created_at || '';
                        return {
                            title: (h.title || q).substring(0, 240),
                            source: 'hn',
                            snippet: sn || 'Hacker News',
                            url: u,
                            date: ca,
                            publishedAt: ca
                        };
                    });
                })
                .catch(function () {
                    return [];
                });
        }
    },
    {
        /** Newsletters + YC/HN portal entry points (link-out until your data lake ingests APIs). */
        name: 'Substack', icon: 'SS', enabled: true,
        search: function (q) {
            return Promise.resolve([
                {
                    title: 'Substack discover — ' + q,
                    source: 'substack',
                    snippet: 'Newsletter search (link-out). Deep ingest: per-publication RSS or your Worker.',
                    url: 'https://substack.com/discover/search?q=' + encodeURIComponent(q)
                },
                {
                    title: 'Hacker News search — ' + q,
                    source: 'yc-portal',
                    snippet: 'Official Algolia search UI (hn.algolia.com) — same story index as news.ycombinator.com.',
                    url: 'https://hn.algolia.com/?query=' + encodeURIComponent(q)
                },
                {
                    title: 'news.ycombinator.com — home',
                    source: 'yc-portal',
                    snippet: 'HN front page. Use the Hacker News connector for ranked story results.',
                    url: 'https://news.ycombinator.com'
                },
                {
                    title: 'YC Launches — ' + q,
                    source: 'yc-portal',
                    snippet: 'Product launches — ycombinator.com/launches',
                    url: 'https://www.ycombinator.com/launches?q=' + encodeURIComponent(q)
                },
                {
                    title: 'YC Companies — ' + q,
                    source: 'yc-portal',
                    snippet: 'Startup directory — ycombinator.com/companies',
                    url: 'https://www.ycombinator.com/companies?q=' + encodeURIComponent(q)
                },
                {
                    title: 'YC Library — ' + q,
                    source: 'yc-portal',
                    snippet: 'Essays & founder posts — ycombinator.com/library',
                    url: 'https://www.ycombinator.com/library?q=' + encodeURIComponent(q)
                }
            ]);
        }
    },
    {
        name: 'Crunchbase', icon: 'Cb', enabled: true,
        search: function (q) {
            return Promise.resolve([{
                title: 'Crunchbase — ' + q,
                source: 'crunchbase',
                snippet: 'Company & funding search (link-out; Crunchbase API is enterprise).',
                url: 'https://www.crunchbase.com/textsearch?q=' + encodeURIComponent(q)
            }]);
        }
    },
    {
        name: 'Sequoia', icon: 'Sq', enabled: true,
        search: function (q) {
            return Promise.resolve([
                {
                    title: 'Sequoia podcasts — ' + q,
                    source: 'sequoia',
                    snippet: 'Podcasts — sequoiacap.com/podcasts',
                    url: 'https://www.sequoiacap.com/podcasts/'
                },
                {
                    title: 'Sequoia stories — ' + q,
                    source: 'sequoia',
                    snippet: 'Essays & spotlights — sequoiacap.com/stories',
                    url: 'https://www.sequoiacap.com/stories/'
                },
                {
                    title: 'Sequoia portfolio — ' + q,
                    source: 'sequoia',
                    snippet: 'Our companies directory — sequoiacap.com/our-companies',
                    url: 'https://www.sequoiacap.com/our-companies/#all-panel'
                }
            ]);
        }
    },
    // ── NOAA / USGS / agrarian cycles / civic trust / Internet governance ──
    {
        /** NCEI + Climate.gov + NWS + CO-OPS — link-out (bulk JSON APIs need keys or server proxy). */
        name: 'NOAA Climate', icon: 'NC', enabled: true,
        search: function (q) {
            var eq = encodeURIComponent(q);
            return Promise.resolve([
                {
                    title: 'NCEI — Climate Data Online — ' + q,
                    source: 'noaa-climate',
                    snippet: 'NOAA NCEI — GHCN, hourly, normals, radar mosaics; historical weather & climate archives.',
                    url: 'https://www.ncei.noaa.gov/access/search/data-search?q=' + eq
                },
                {
                    title: 'Climate.gov — ' + q,
                    source: 'noaa-climate',
                    snippet: 'NOAA Climate.gov — maps, tools, news, resilience.',
                    url: 'https://www.climate.gov/search?q=' + eq
                },
                {
                    title: 'Weather.gov — ' + q,
                    source: 'noaa-climate',
                    snippet: 'NOAA National Weather Service — forecasts, alerts, past weather.',
                    url: 'https://www.weather.gov/search?query=' + eq
                },
                {
                    title: 'CO-OPS — tides & currents — ' + q,
                    source: 'noaa-climate',
                    snippet: 'NOAA tides & currents — water levels, predictions, harmonic constituents.',
                    url: 'https://tidesandcurrents.noaa.gov/'
                }
            ]);
        }
    },
    {
        /** USGS FDSN earthquake GeoJSON (CORS) + water / science link-out. */
        name: 'USGS', icon: 'UG', enabled: true,
        search: function (q) {
            var eq = encodeURIComponent(q);
            var linkOut = [
                {
                    title: 'USGS Water — NWIS — ' + q,
                    source: 'usgs-earth',
                    snippet: 'National Water Information System — gauges, discharge, groundwater.',
                    url: 'https://waterdata.usgs.gov/nwis/inventory?search=' + eq
                },
                {
                    title: 'USGS Science Explorer — ' + q,
                    source: 'usgs-earth',
                    snippet: 'USGS science stories, data releases, hazards.',
                    url: 'https://www.usgs.gov/search?query=' + eq
                }
            ];
            return corsFetch(
                'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=6&orderby=time&text=' + eq
            )
                .then(function (r) { return r.json(); })
                .then(function (geo) {
                    var feats = geo.features || [];
                    if (!feats.length) return linkOut;
                    var rows = feats.map(function (f) {
                        var p = f.properties || {};
                        var place = p.place || '';
                        var mag = p.mag != null ? String(p.mag) : '';
                        var t = p.time ? new Date(p.time).toISOString() : '';
                        return {
                            title: 'M' + mag + ' — ' + place,
                            source: 'usgs-earth',
                            snippet: (t ? t + ' — ' : '') + (p.title || place || 'USGS earthquake'),
                            url: p.url || 'https://earthquake.usgs.gov/earthquakes/eventpage/' + (p.id || ''),
                            date: t,
                            publishedAt: t
                        };
                    });
                    return rows.concat(linkOut.slice(0, 1));
                })
                .catch(function () { return linkOut; });
        }
    },
    {
        /** USDA NASS, moon phases, Landsat, NOAA space weather — seasons & Earth–Sun–Moon coupling. */
        name: 'Earth cycles', icon: 'Ea', enabled: true,
        search: function (q) {
            var eq = encodeURIComponent(q);
            return Promise.resolve([
                {
                    title: 'USDA NASS Quick Stats — ' + q,
                    source: 'earth-cycles',
                    snippet: 'USDA National Agricultural Statistics — crops, livestock, census, county data.',
                    url: 'https://quickstats.nass.usda.gov/'
                },
                {
                    title: 'USDA NASS search — ' + q,
                    source: 'earth-cycles',
                    snippet: 'USDA National Agricultural Statistics — publications & search.',
                    url: 'https://www.nass.usda.gov/Search/?q=' + eq
                },
                {
                    title: 'Moon phases — Time and Date — ' + q,
                    source: 'earth-cycles',
                    snippet: 'Lunar calendar — phases, illumination, rise/set (refine location in UI).',
                    url: 'https://www.timeanddate.com/moon/phases/'
                },
                {
                    title: 'USNO — astronomical data — ' + q,
                    source: 'earth-cycles',
                    snippet: 'U.S. Naval Observatory — Sun/Moon rise, phases, celestial almanac.',
                    url: 'https://aa.usno.navy.mil/data/MoonPhases'
                },
                {
                    title: 'USGS EarthExplorer — Landsat — ' + q,
                    source: 'earth-cycles',
                    snippet: 'Landsat & aerial — crop cycles, land change, phenology.',
                    url: 'https://earthexplorer.usgs.gov/'
                },
                {
                    title: 'NOAA SWPC — space weather — ' + q,
                    source: 'earth-cycles',
                    snippet: 'Solar cycles, geomagnetic storms, aurora — Earth–Sun coupling.',
                    url: 'https://www.swpc.noaa.gov/'
                }
            ]);
        }
    },
    {
        name: 'BBB', icon: 'B3', enabled: true,
        search: function (q) {
            var eq = encodeURIComponent(q);
            return Promise.resolve([
                {
                    title: 'BBB Business Profiles — ' + q,
                    source: 'bbb',
                    snippet: 'Better Business Bureau — accredited businesses, reviews, complaints.',
                    url: 'https://www.bbb.org/search?find_text=' + eq + '&find_loc=&page=1'
                },
                {
                    title: 'BBB Scam Tracker — ' + q,
                    source: 'bbb',
                    snippet: 'BBB Scam Tracker — report and lookup scams.',
                    url: 'https://www.bbb.org/scamtracker/'
                }
            ]);
        }
    },
    {
        /** IANA root zone + ICANN RDAP + protocol registries — DNS & naming governance. */
        name: 'DNS governance', icon: 'IG', enabled: true,
        search: function (q) {
            var raw = String(q || '').trim();
            var domain = raw.replace(/^https?:\/\//i, '').split('/')[0].trim();
            var rdapQ = encodeURIComponent(domain || raw || 'example.com');
            return Promise.resolve([
                {
                    title: 'ICANN Lookup — ' + (domain || raw || 'domain'),
                    source: 'iana-icann',
                    snippet: 'RDAP / WHOIS — domain registration and nameserver data.',
                    url: 'https://lookup.icann.org/en?q=' + rdapQ
                },
                {
                    title: 'IANA — root zone database',
                    source: 'iana-icann',
                    snippet: 'Root zone — TLD delegations and operators.',
                    url: 'https://www.iana.org/domains/root/db'
                },
                {
                    title: 'IANA — root zone file',
                    source: 'iana-icann',
                    snippet: 'Authoritative root zone (zone file download).',
                    url: 'https://www.iana.org/domains/root/files'
                },
                {
                    title: 'IANA — protocol parameter registries',
                    source: 'iana-icann',
                    snippet: 'IANA registries — numbers, protocols, MIME, HTTP status, etc.',
                    url: 'https://www.iana.org/protocols'
                },
                {
                    title: 'ICANN — ' + q,
                    source: 'iana-icann',
                    snippet: 'ICANN — policy, DNS security, accountability.',
                    url: 'https://www.icann.org/en/search?q=' + encodeURIComponent(q)
                },
                {
                    title: 'Public Suffix List',
                    source: 'iana-icann',
                    snippet: 'Mozilla Public Suffix List — eTLD / registrable domains.',
                    url: 'https://publicsuffix.org/list/public_suffix_list.dat'
                },
                {
                    title: 'RDAP — IANA bootstrap (JSON)',
                    source: 'iana-icann',
                    snippet: 'ICANN RDAP DNS bootstrap file — programmatic RDAP entry points.',
                    url: 'https://data.iana.org/rdap/dns.json'
                }
            ]);
        }
    },
];

/* ══════════════════════════════════════════════════════
   TIMELINE SCALES
   ══════════════════════════════════════════════════════ */
const TL_SCALES = [
    { name: 'Sub-quantum', short: 'Sub-q', min: -44, max: -24, color: '#8b5cf6' },
    { name: 'Quantum',     short: 'Qu',    min: -24, max: -15, color: '#6366f1' },
    { name: 'Atomic',      short: 'Atom',  min: -15, max: -9,  color: '#3b82f6' },
    { name: 'Photonic',    short: 'Photo', min: -9,  max: -6,  color: '#06b6d4' },
    { name: 'Signal',      short: 'Sig',   min: -6,  max: -2,  color: '#22d3ee' },
    { name: 'Digital',     short: 'Dig',   min: -2,  max: 2,   color: '#34d399' },
    { name: 'Human',       short: 'Hum',   min: 2,   max: 8,   color: '#fbbf24' },
    { name: 'Historical',  short: 'Hist',  min: 8,   max: 12,  color: '#f97316' },
    { name: 'Geological',  short: 'Geo',   min: 12,  max: 16,  color: '#ef4444' },
    { name: 'Cosmic',      short: 'Cos',   min: 16,  max: 18,  color: '#84cc16' },
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
    if (W < 2 || H < 8) return;
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
        const segH = y2 - y1;
        const label = s.short || s.name;
        if (ly > 10 && ly < H - 10 && segH > 14) {
            ctx.save();
            ctx.translate(Math.max(3, W * 0.5), ly);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = isLight ? (s.color + 'ee') : (s.color + 'ff');
            var fz = W >= 36 ? 8 : (W >= 28 ? 7 : 6);
            ctx.font = '600 ' + fz + 'px ui-monospace, "SF Mono", Menlo, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, 0, 0);
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
        var res = await corsFetch(url);
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

/**
 * Wikipedia / Wikinews: list images used on the page, resolve thumb + full URL via imageinfo.
 * Skips obvious UI assets; merges REST lead thumbnail when missing from the list.
 */
async function fetchWikiGalleryImages(wikiOrigin, decodedTitle, leadThumbUrl, originalImageUrl) {
    var leadNorm = (leadThumbUrl || '').split('?')[0].toLowerCase();
    var out = [];
    try {
        var qUrl =
            wikiOrigin +
            '/w/api.php?action=query&titles=' +
            encodeURIComponent(decodedTitle) +
            '&prop=images&imlimit=28&format=json&origin=*';
        var r = await corsFetch(qUrl);
        if (!r.ok) throw new Error(String(r.status));
        var j = await r.json();
        var pages = j.query && j.query.pages;
        if (!pages) throw new Error('no pages');
        var pk = Object.keys(pages)[0];
        var page = pages[pk];
        if (!page || page.missing) throw new Error('missing');
        var imgs = (page && page.images) || [];
        var titles = [];
        for (var i = 0; i < imgs.length && titles.length < 20; i++) {
            var t = imgs[i].title;
            if (!t) continue;
            var tl = t.toLowerCase();
            if (tl.endsWith('.svg')) continue;
            if (/icon|logo|wikimedia-commons|wikimedia logo|flag of|emoji|favicon|button/i.test(tl)) continue;
            titles.push(t);
        }
        for (var bi = 0; bi < titles.length; bi += 8) {
            var batch = titles.slice(bi, bi + 8);
            var iiUrl =
                wikiOrigin +
                '/w/api.php?action=query&titles=' +
                batch.map(encodeURIComponent).join('|') +
                '&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=480&format=json&origin=*';
            var r2 = await corsFetch(iiUrl);
            if (!r2.ok) continue;
            var j2 = await r2.json();
            var p2 = j2.query && j2.query.pages;
            if (!p2) continue;
            Object.keys(p2).forEach(function (pid) {
                var pg = p2[pid];
                if (pg.missing) return;
                var ii = pg.imageinfo && pg.imageinfo[0];
                if (!ii) return;
                var thumb = ii.thumburl || ii.url;
                var full = ii.url || thumb;
                if (!thumb) return;
                out.push({ title: pg.title || '', thumb: thumb, url: full });
            });
        }
        var seen = {};
        out = out.filter(function (row) {
            var k = (row.url || '').split('?')[0];
            if (!k || seen[k]) return false;
            seen[k] = true;
            return true;
        });
        if (leadThumbUrl) {
            var haveLead = out.some(function (o) {
                return (o.url || '').split('?')[0].toLowerCase() === leadNorm;
            });
            if (!haveLead) {
                out.unshift({
                    title: 'Lead image',
                    thumb: leadThumbUrl,
                    url: originalImageUrl || leadThumbUrl
                });
            }
        }
    } catch (e) {
        out = [];
        if (leadThumbUrl) {
            out.push({ title: '', thumb: leadThumbUrl, url: originalImageUrl || leadThumbUrl });
        }
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
                    var restRes = await corsFetch(restUrl);
                    if (restRes.ok) restData = await restRes.json();
                } catch (e) { /* optional */ }
                try {
                    var parseRes = await corsFetch(parseUrl);
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
                try {
                    var gal = await fetchWikiGalleryImages(
                        wikiOrigin,
                        decodedTitle,
                        doc.thumbnail || '',
                        doc.originalimage || ''
                    );
                    if (gal && gal.length) doc.wikiGallery = gal;
                } catch (eGal) {
                    /* optional */
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
                var res = await corsFetch('https://export.arxiv.org/api/query?id_list=' + idMatch[1]);
                var xml = await res.text();
                var tM = xml.match(/<title>([\s\S]*?)<\/title>/);
                var sM = xml.match(/<summary>([\s\S]*?)<\/summary>/);
                var aM = xml.match(/<name>([\s\S]*?)<\/name>/g);
                doc.title = tM ? tM[1].trim() : '';
                doc.content = sM ? sM[1].trim() : '';
                doc.authors = aM ? aM.map(function(a) { return a.replace(/<[^>]+>/g, '').trim(); }) : [];
            }
        }
        // Open Library: work JSON + search mirror (first_sentence, IA) + editions sample + ingest pack + kbatch profile
        else if (source === 'openlibrary' || url.indexOf('openlibrary.org') !== -1) {
            var keyMatch = url.match(/\/works\/(\w+)/);
            if (keyMatch) {
                var wkey = keyMatch[1];
                var res = await corsFetch('https://openlibrary.org/works/' + wkey + '.json');
                var data = await res.json();
                doc.title = data.title || '';
                doc.olWorkKey = wkey;
                var desc = typeof data.description === 'string' ? data.description : (data.description ? data.description.value : '');
                doc.subjects = (data.subjects || []).slice(0, 24);
                if (data.covers && data.covers.length) {
                    doc.thumbnail = 'https://covers.openlibrary.org/b/id/' + data.covers[0] + '-M.jpg';
                }
                doc.olAuthorNames = [];
                try {
                    var sRes = await corsFetch(
                        'https://openlibrary.org/search.json?q=' + encodeURIComponent('key:/works/' + wkey) +
                        '&limit=1&fields=first_sentence,ia,public_scan_b,has_fulltext,ebook_access,author_name,title,first_publish_year,cover_i,subject,edition_count'
                    );
                    var sJson = await sRes.json();
                    var sd = (sJson.docs || [])[0];
                    if (sd) {
                        doc.olFirstSentence = (sd.first_sentence && String(sd.first_sentence).trim()) || '';
                        doc.olIa = sd.ia || [];
                        doc.olPublicScan = !!sd.public_scan_b;
                        doc.olHasFulltext = !!sd.has_fulltext;
                        doc.olEbookAccess = sd.ebook_access || '';
                        if ((sd.author_name || []).length) doc.olAuthorNames = sd.author_name;
                        if (sd.first_publish_year) doc.year = sd.first_publish_year;
                        if (sd.cover_i && !doc.thumbnail) {
                            doc.thumbnail = 'https://covers.openlibrary.org/b/id/' + sd.cover_i + '-M.jpg';
                        }
                    }
                } catch (eOlS) { /* optional */ }
                try {
                    var eRes = await corsFetch('https://openlibrary.org/works/' + wkey + '/editions.json?limit=6');
                    var eJson = await eRes.json();
                    var entries = eJson.entries || [];
                    doc.olEditionsSample = entries.slice(0, 5).map(function(e) {
                        return {
                            key: e.key,
                            publish_date: e.publish_date,
                            publishers: (e.publishers || []).slice(0, 2),
                            isbn_13: (e.isbn_13 || [])[0],
                            number_of_pages: e.number_of_pages,
                        };
                    });
                } catch (eOlE) { /* optional */ }
                var parts = [];
                if (doc.olFirstSentence) parts.push('Preview: ' + doc.olFirstSentence);
                if (desc) parts.push(desc);
                if (doc.subjects.length) parts.push('Subjects: ' + doc.subjects.join(', '));
                doc.content = parts.length ? parts.join('\n\n') : (desc || 'No description indexed for this work.');
                doc.bookIngest = {
                    schema: 'uvspeed.book.ingest.v1',
                    title: doc.title,
                    authors: doc.olAuthorNames || [],
                    year: doc.year || '',
                    subjects: doc.subjects,
                    workUrl: 'https://openlibrary.org/works/' + wkey,
                    openLibraryKey: wkey,
                    coverUrl: doc.thumbnail || '',
                    preview: doc.olFirstSentence || (desc ? desc.substring(0, 500) : ''),
                    description: desc || '',
                    internetArchiveIds: doc.olIa || [],
                    iaBrowseUrl: (doc.olIa && doc.olIa[0]) ? ('https://archive.org/details/' + doc.olIa[0]) : '',
                    readUrl: 'https://openlibrary.org/works/' + wkey,
                    editionsSample: doc.olEditionsSample || [],
                    access: {
                        publicScan: doc.olPublicScan,
                        fulltext: doc.olHasFulltext,
                        ebook: doc.olEbookAccess || '',
                    },
                    source: 'openlibrary-work',
                    fetchedAt: Date.now(),
                };
                try {
                    if (doc.olIa && doc.olIa[0]) {
                        var iaId = doc.olIa[0];
                        var iaRes = await corsFetch('https://archive.org/metadata/' + encodeURIComponent(iaId));
                        var iaData = await iaRes.json();
                        doc.olIaMediatype = (iaData.metadata && iaData.metadata.mediatype) || '';
                        doc.olIaEmbedUrl = 'https://archive.org/embed/' + encodeURIComponent(iaId);
                        var files = iaData.files || [];
                        for (var fi = 0; fi < files.length; fi++) {
                            var fn = files[fi].name || '';
                            if (/\.mp3$/i.test(fn) && fn.indexOf('sample') === -1) {
                                doc.olIaAudioUrl = 'https://archive.org/download/' + encodeURIComponent(iaId) + '/' + encodeURIComponent(fn);
                                break;
                            }
                        }
                    }
                } catch (eIaMeta) { /* optional */ }
                try {
                    doc._contextProfile = buildContextProfile(doc.content);
                } catch (eProf) { doc._contextProfile = null; }
            }
        }
        // Internet Archive: metadata endpoint
        else if (source === 'internet-archive' || url.indexOf('archive.org') !== -1) {
            var idMatch = url.match(/\/details\/(.+?)(?:#|$)/);
            if (idMatch) {
                var res = await corsFetch('https://archive.org/metadata/' + idMatch[1]);
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
                var res = await corsFetch('https://api.stlouisfed.org/fred/series?series_id=' + sMatch[1] + '&api_key=DEMO_KEY&file_type=json');
                var data = await res.json();
                var s = (data.seriess || [])[0] || {};
                doc.title = s.title || sMatch[1];
                doc.content = (s.notes || '') + '\n\nFrequency: ' + (s.frequency || '') + '\nUnits: ' + (s.units || '') + '\nSeasonal adjustment: ' + (s.seasonal_adjustment || '');
            }
        }
        // Library of Congress item (newspaper directory / history-archive)
        else if (
            source === 'history-archive' ||
            source === 'loc-periodicals' ||
            source === 'loc-photos' ||
            (url.indexOf('loc.gov') !== -1 && url.indexOf('/item/') !== -1)
        ) {
            var locMatch = url.match(/loc\.gov\/item\/(\d+)/);
            if (locMatch) {
                var locRes = await corsFetch('https://www.loc.gov/item/' + locMatch[1] + '/?fo=json');
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

    var out = {
        tone: tone,
        vocabulary: vocabulary,
        subReferences: subReferences,
        monetarySignals: monetarySignals,
        sentiment: Math.round(sentiment * 100) / 100,
        readabilityScore: readabilityScore,
        heartbeat: heartbeat,
        aiPerspective: aiPerspective,
    };
    if (doc && doc._contextProfile) {
        out.kbatchContextProfile = doc._contextProfile;
    }
    return out;
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

/* ══════════════════════════════════════════════════════
   SOURCE GOVERNANCE (Ground News–style: bias axis + pipeline)
   Curated heuristics for ranking + UI — expand via Worker/API later.
   biasAxis: -1 far left … 0 center … +1 far right (approximate).
   ══════════════════════════════════════════════════════ */
var DEFAULT_GOVERNANCE = {
    biasLabel: 'unknown',
    biasAxis: 0,
    factuality: 0.5,
    longevity: 0.5,
    ownership: 'unknown',
    transparency: 0.5,
    pipeline: 'unknown',
};

var GOVERNANCE_BY_CONNECTOR = {
    wikipedia: { biasLabel: 'center', biasAxis: 0, factuality: 0.88, longevity: 0.98, ownership: 'Wikimedia', transparency: 0.75, pipeline: 'wiki-community' },
    wiktionary: { biasLabel: 'center', biasAxis: 0, factuality: 0.85, longevity: 0.96, ownership: 'Wikimedia', transparency: 0.75, pipeline: 'wiki-community' },
    'wire-news': { biasLabel: 'center', biasAxis: 0, factuality: 0.72, longevity: 0.75, ownership: 'Wikinews', transparency: 0.6, pipeline: 'editorial-wiki' },
    'history-archive': { biasLabel: 'center', biasAxis: 0, factuality: 0.85, longevity: 0.95, ownership: 'Library of Congress', transparency: 0.9, pipeline: 'federal-archive' },
    arxiv: { biasLabel: 'n/a', biasAxis: 0, factuality: 0.92, longevity: 0.95, ownership: 'arXiv/Cornell', transparency: 0.95, pipeline: 'preprint-research' },
    'meta-research': { biasLabel: 'org', biasAxis: -0.05, factuality: 0.78, longevity: 0.88, ownership: 'Meta', transparency: 0.65, pipeline: 'corp-lab' },
    pubchem: { biasLabel: 'n/a', biasAxis: 0, factuality: 0.95, longevity: 0.98, ownership: 'NCBI/NIH', transparency: 0.9, pipeline: 'gov-science' },
    genbank: { biasLabel: 'n/a', biasAxis: 0, factuality: 0.95, longevity: 0.98, ownership: 'NCBI/NIH', transparency: 0.9, pipeline: 'gov-science' },
    hathitrust: { biasLabel: 'center', biasAxis: 0, factuality: 0.88, longevity: 0.98, ownership: 'HathiTrust', transparency: 0.85, pipeline: 'library-consortium' },
    duckduckgo: { biasLabel: 'aggregator', biasAxis: 0, factuality: 0.55, longevity: 0.7, ownership: 'DuckDuckGo', transparency: 0.5, pipeline: 'instant-answer' },
    hn: { biasLabel: 'tech-forum', biasAxis: 0, factuality: 0.55, longevity: 0.7, ownership: 'Y Combinator', transparency: 0.55, pipeline: 'forum-vote' },
    'press-wire': { biasLabel: 'varies', biasAxis: 0, factuality: 0.85, longevity: 0.92, ownership: 'wire agency', transparency: 0.7, pipeline: 'wholesale-wire' },
    'wire-live-tx': { biasLabel: 'varies', biasAxis: 0, factuality: 0.55, longevity: 0.75, ownership: 'broadcast + wire', transparency: 0.5, pipeline: 'live-cc-linkout' },
    'yc-portal': { biasLabel: 'startup-ecosystem', biasAxis: 0, factuality: 0.5, longevity: 0.85, ownership: 'Y Combinator', transparency: 0.55, pipeline: 'yc-surface' },
    substack: { biasLabel: 'varies', biasAxis: 0, factuality: 0.45, longevity: 0.55, ownership: 'authors', transparency: 0.45, pipeline: 'newsletter' },
    crunchbase: { biasLabel: 'commercial-db', biasAxis: 0, factuality: 0.65, longevity: 0.7, ownership: 'Crunchbase', transparency: 0.55, pipeline: 'startup-db' },
    sequoia: { biasLabel: 'vc-surface', biasAxis: 0, factuality: 0.5, longevity: 0.88, ownership: 'Sequoia Capital', transparency: 0.45, pipeline: 'vc-portfolio-pr' },
    youtube: { biasLabel: 'varies', biasAxis: 0, factuality: 0.45, longevity: 0.55, ownership: 'YouTube', transparency: 0.4, pipeline: 'ugc-video' },
    'video-transcript': { biasLabel: 'varies', biasAxis: 0, factuality: 0.5, longevity: 0.45, ownership: 'transcript', transparency: 0.35, pipeline: 'dca-transcript' },
    openlibrary: { biasLabel: 'center', biasAxis: 0, factuality: 0.88, longevity: 0.9, ownership: 'Internet Archive', transparency: 0.8, pipeline: 'library-catalog' },
    'internet-archive': { biasLabel: 'center', biasAxis: 0, factuality: 0.85, longevity: 0.95, ownership: 'Internet Archive', transparency: 0.8, pipeline: 'digital-archive' },
    coingecko: { biasLabel: 'market-data', biasAxis: 0, factuality: 0.7, longevity: 0.6, ownership: 'CoinGecko', transparency: 0.55, pipeline: 'crypto-market' },
    fred: { biasLabel: 'gov', biasAxis: 0, factuality: 0.95, longevity: 0.98, ownership: 'St. Louis Fed', transparency: 0.9, pipeline: 'gov-economic' },
    worldbank: { biasLabel: 'igov', biasAxis: 0, factuality: 0.9, longevity: 0.95, ownership: 'World Bank', transparency: 0.85, pipeline: 'intl-org' },
    datamuse: { biasLabel: 'lexical', biasAxis: 0, factuality: 0.75, longevity: 0.65, ownership: 'Datamuse', transparency: 0.7, pipeline: 'linguistic-api' },
    wayback: { biasLabel: 'archive', biasAxis: 0, factuality: 0.8, longevity: 0.98, ownership: 'Internet Archive', transparency: 0.85, pipeline: 'web-archive' },
    'sacred-texts': { biasLabel: 'archive', biasAxis: 0, factuality: 0.75, longevity: 0.85, ownership: 'sacred-texts.com', transparency: 0.65, pipeline: 'text-archive' },
    yale: { biasLabel: 'university', biasAxis: 0, factuality: 0.82, longevity: 0.92, ownership: 'Yale', transparency: 0.8, pipeline: 'univ-archive' },
    arda: { biasLabel: 'research', biasAxis: 0, factuality: 0.8, longevity: 0.85, ownership: 'ARDA', transparency: 0.75, pipeline: 'religion-data' },
    'lgbtq-archives': { biasLabel: 'archive', biasAxis: 0, factuality: 0.75, longevity: 0.8, ownership: 'LGBTQ Archives', transparency: 0.7, pipeline: 'community-archive' },
    'noaa-climate': { biasLabel: 'gov', biasAxis: 0, factuality: 0.92, longevity: 0.98, ownership: 'NOAA / DOC', transparency: 0.9, pipeline: 'gov-climate-weather' },
    'usgs-earth': { biasLabel: 'gov', biasAxis: 0, factuality: 0.93, longevity: 0.98, ownership: 'USGS', transparency: 0.9, pipeline: 'gov-earth-science' },
    'earth-cycles': { biasLabel: 'varies', biasAxis: 0, factuality: 0.75, longevity: 0.9, ownership: 'USDA / USNO / USGS / NOAA', transparency: 0.75, pipeline: 'agri-astro-landsat' },
    bbb: { biasLabel: 'registry', biasAxis: 0, factuality: 0.68, longevity: 0.88, ownership: 'Better Business Bureau', transparency: 0.72, pipeline: 'business-trust' },
    'iana-icann': { biasLabel: 'governance', biasAxis: 0, factuality: 0.96, longevity: 0.99, ownership: 'IANA / ICANN', transparency: 0.88, pipeline: 'dns-root-rdap' },
};

var GOVERNANCE_BY_HOST = {
    'apnews.com': { biasLabel: 'center', biasAxis: 0, factuality: 0.92, longevity: 0.95, ownership: 'Associated Press', transparency: 0.85, pipeline: 'wire-cooperative' },
    'reuters.com': { biasLabel: 'center-left', biasAxis: -0.18, factuality: 0.9, longevity: 0.95, ownership: 'Thomson Reuters', transparency: 0.82, pipeline: 'wire-global' },
    'nytimes.com': { biasLabel: 'lean-left', biasAxis: -0.35, factuality: 0.78, longevity: 0.95, ownership: 'NYT Co.', transparency: 0.72, pipeline: 'national-daily' },
    'washingtonpost.com': { biasLabel: 'lean-left', biasAxis: -0.38, factuality: 0.78, longevity: 0.93, ownership: 'Nash Holdings', transparency: 0.7, pipeline: 'national-daily' },
    'theguardian.com': { biasLabel: 'lean-left', biasAxis: -0.42, factuality: 0.76, longevity: 0.92, ownership: 'Guardian Media', transparency: 0.72, pipeline: 'national-daily' },
    'bbc.com': { biasLabel: 'center-left', biasAxis: -0.22, factuality: 0.82, longevity: 0.96, ownership: 'BBC', transparency: 0.78, pipeline: 'public-broadcast' },
    'bbc.co.uk': { biasLabel: 'center-left', biasAxis: -0.22, factuality: 0.82, longevity: 0.96, ownership: 'BBC', transparency: 0.78, pipeline: 'public-broadcast' },
    'npr.org': { biasLabel: 'center-left', biasAxis: -0.25, factuality: 0.8, longevity: 0.92, ownership: 'NPR', transparency: 0.75, pipeline: 'public-radio' },
    'cnn.com': { biasLabel: 'lean-left', biasAxis: -0.3, factuality: 0.68, longevity: 0.9, ownership: 'Warner Bros Discovery', transparency: 0.6, pipeline: 'cable-digital' },
    'foxnews.com': { biasLabel: 'right', biasAxis: 0.55, factuality: 0.55, longevity: 0.88, ownership: 'Fox Corp', transparency: 0.52, pipeline: 'cable-digital' },
    'wsj.com': { biasLabel: 'center-right', biasAxis: 0.28, factuality: 0.82, longevity: 0.95, ownership: 'Dow Jones', transparency: 0.75, pipeline: 'financial-daily' },
    'economist.com': { biasLabel: 'center', biasAxis: -0.08, factuality: 0.85, longevity: 0.95, ownership: 'Economist Group', transparency: 0.72, pipeline: 'magazine' },
    'ft.com': { biasLabel: 'center', biasAxis: -0.1, factuality: 0.84, longevity: 0.94, ownership: 'Nikkei', transparency: 0.74, pipeline: 'financial-daily' },
    'bloomberg.com': { biasLabel: 'center', biasAxis: -0.05, factuality: 0.82, longevity: 0.93, ownership: 'Bloomberg LP', transparency: 0.7, pipeline: 'terminal-news' },
    'axios.com': { biasLabel: 'center', biasAxis: -0.12, factuality: 0.75, longevity: 0.75, ownership: 'Axios Media', transparency: 0.65, pipeline: 'digital-native' },
    'politico.com': { biasLabel: 'center-left', biasAxis: -0.28, factuality: 0.72, longevity: 0.82, ownership: 'Politico', transparency: 0.62, pipeline: 'political-news' },
    'france24.com': { biasLabel: 'center-left', biasAxis: -0.2, factuality: 0.78, longevity: 0.88, ownership: 'France Médias Monde', transparency: 0.72, pipeline: 'intl-broadcast' },
    'afp.com': { biasLabel: 'center', biasAxis: -0.05, factuality: 0.88, longevity: 0.94, ownership: 'AFP', transparency: 0.8, pipeline: 'wire-agency' },
    'substack.com': { biasLabel: 'varies', biasAxis: 0, factuality: 0.45, longevity: 0.5, ownership: 'Substack', transparency: 0.45, pipeline: 'newsletter-platform' },
    'ycombinator.com': { biasLabel: 'startup-ecosystem', biasAxis: 0, factuality: 0.55, longevity: 0.9, ownership: 'Y Combinator', transparency: 0.55, pipeline: 'accelerator' },
    'sequoiacap.com': { biasLabel: 'vc-surface', biasAxis: 0, factuality: 0.5, longevity: 0.88, ownership: 'Sequoia Capital', transparency: 0.45, pipeline: 'vc-pr' },
    'crunchbase.com': { biasLabel: 'commercial-db', biasAxis: 0, factuality: 0.65, longevity: 0.72, ownership: 'Crunchbase', transparency: 0.55, pipeline: 'startup-db' },
    'wikipedia.org': { biasLabel: 'center', biasAxis: 0, factuality: 0.88, longevity: 0.98, ownership: 'Wikimedia', transparency: 0.75, pipeline: 'wiki-community' },
    'wiktionary.org': { biasLabel: 'center', biasAxis: 0, factuality: 0.85, longevity: 0.96, ownership: 'Wikimedia', transparency: 0.75, pipeline: 'wiki-community' },
    'wikinews.org': { biasLabel: 'center', biasAxis: 0, factuality: 0.72, longevity: 0.75, ownership: 'Wikimedia', transparency: 0.6, pipeline: 'editorial-wiki' },
    'noaa.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.92, longevity: 0.98, ownership: 'NOAA', transparency: 0.9, pipeline: 'gov-climate-weather' },
    'ncei.noaa.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.93, longevity: 0.98, ownership: 'NOAA NCEI', transparency: 0.9, pipeline: 'gov-climate-archive' },
    'climate.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.9, longevity: 0.95, ownership: 'NOAA', transparency: 0.88, pipeline: 'gov-climate-comm' },
    'weather.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.9, longevity: 0.97, ownership: 'NOAA NWS', transparency: 0.88, pipeline: 'gov-weather' },
    'tidesandcurrents.noaa.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.91, longevity: 0.97, ownership: 'NOAA CO-OPS', transparency: 0.88, pipeline: 'gov-tides' },
    'swpc.noaa.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.9, longevity: 0.95, ownership: 'NOAA SWPC', transparency: 0.88, pipeline: 'gov-space-weather' },
    'usgs.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.93, longevity: 0.98, ownership: 'USGS', transparency: 0.9, pipeline: 'gov-earth-science' },
    'earthquake.usgs.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.94, longevity: 0.98, ownership: 'USGS', transparency: 0.92, pipeline: 'gov-seismic' },
    'waterdata.usgs.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.92, longevity: 0.98, ownership: 'USGS', transparency: 0.9, pipeline: 'gov-hydrology' },
    'earthexplorer.usgs.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.9, longevity: 0.95, ownership: 'USGS / NASA', transparency: 0.85, pipeline: 'landsat-portal' },
    'usda.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.88, longevity: 0.98, ownership: 'USDA', transparency: 0.88, pipeline: 'gov-agriculture' },
    'nass.usda.gov': { biasLabel: 'gov', biasAxis: 0, factuality: 0.88, longevity: 0.97, ownership: 'USDA NASS', transparency: 0.85, pipeline: 'gov-ag-stats' },
    'usno.navy.mil': { biasLabel: 'gov', biasAxis: 0, factuality: 0.94, longevity: 0.98, ownership: 'USNO', transparency: 0.88, pipeline: 'gov-astronomy' },
    'bbb.org': { biasLabel: 'registry', biasAxis: 0, factuality: 0.68, longevity: 0.88, ownership: 'BBB', transparency: 0.72, pipeline: 'business-trust' },
    'iana.org': { biasLabel: 'governance', biasAxis: 0, factuality: 0.97, longevity: 0.99, ownership: 'IANA', transparency: 0.9, pipeline: 'iana-registries' },
    'icann.org': { biasLabel: 'governance', biasAxis: 0, factuality: 0.92, longevity: 0.98, ownership: 'ICANN', transparency: 0.82, pipeline: 'dns-policy' },
    'lookup.icann.org': { biasLabel: 'governance', biasAxis: 0, factuality: 0.93, longevity: 0.95, ownership: 'ICANN', transparency: 0.85, pipeline: 'rdap-lookup' },
    'publicsuffix.org': { biasLabel: 'community', biasAxis: 0, factuality: 0.85, longevity: 0.85, ownership: 'Mozilla PSL', transparency: 0.8, pipeline: 'public-suffix-list' },
    'timeanddate.com': { biasLabel: 'reference', biasAxis: 0, factuality: 0.75, longevity: 0.85, ownership: 'timeanddate.com', transparency: 0.65, pipeline: 'calendar-astro' },
};

var GOVERNANCE_TLD_GOV = { biasLabel: 'gov', biasAxis: 0, factuality: 0.9, longevity: 0.98, ownership: 'government TLD', transparency: 0.88, pipeline: 'government' };
var GOVERNANCE_TLD_EDU = { biasLabel: 'academic', biasAxis: 0, factuality: 0.85, longevity: 0.92, ownership: 'academic TLD', transparency: 0.8, pipeline: 'university' };

function _hostFromUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        return new URL(url, 'https://example.invalid').hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
        return '';
    }
}

function _mergeGov(base, override) {
    var o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    if (override) Object.keys(override).forEach(function (k) { o[k] = override[k]; });
    return o;
}

function getGovernanceForResult(result) {
    var r = result || {};
    var key = String(r.source || '').toLowerCase();
    var g = GOVERNANCE_BY_CONNECTOR[key] ? _mergeGov(DEFAULT_GOVERNANCE, GOVERNANCE_BY_CONNECTOR[key]) : null;
    var host = _hostFromUrl(r.url);
    if (host) {
        var h = host;
        var hostHit = null;
        while (h) {
            if (GOVERNANCE_BY_HOST[h]) {
                hostHit = GOVERNANCE_BY_HOST[h];
                break;
            }
            var dot = h.indexOf('.');
            if (dot < 0) break;
            h = h.slice(dot + 1);
        }
        if (hostHit) {
            g = g ? _mergeGov(g, hostHit) : _mergeGov(DEFAULT_GOVERNANCE, hostHit);
        }
        if (!g) g = _mergeGov(DEFAULT_GOVERNANCE, {});
        if (host.endsWith('.gov')) g = _mergeGov(g, GOVERNANCE_TLD_GOV);
        else if (host.endsWith('.edu')) g = _mergeGov(g, GOVERNANCE_TLD_EDU);
    } else if (!g) {
        g = _mergeGov(DEFAULT_GOVERNANCE, {});
    }
    return g;
}

function _computeFreshnessScore(result) {
    var raw = result && result.date;
    if (!raw) return 0.5;
    var d = new Date(raw);
    if (isNaN(d.getTime())) return 0.5;
    var ageDays = Math.max(0, (Date.now() - d.getTime()) / 86400000);
    return Math.exp(-ageDays / 72);
}

// AI Metric Weighting — freshness vs reliability vs longevity + optional bias preference (Ground News–style gov metadata)
function weightResults(results, opts) {
    opts = opts || {};
    var contextAnalyses = opts.analyses || {};
    var heatmap = opts.heatmap || _heatmapData;
    var userGoal = opts.goal || 'research'; // research | app-building | learning | promo
    var promptModel = opts.promptModel || 'auto';
    var biasPreference = opts.biasPreference || 'any'; // any | prefer-center
    var depthMod = 1;
    if (promptModel === 'deep') depthMod = 1.12;
    else if (promptModel === 'fast') depthMod = 0.88;
    else if (promptModel === 'code') depthMod = 1.08;
    else if (promptModel === 'balanced') depthMod = 1;

    var goalWeights = {
        research:      { depth: 0.15, breadth: 0.12, authority: 0.1, fresh: 0.1, reliability: 0.18, longevity: 0.15, engagement: 0.2 },
        'app-building': { depth: 0.1, breadth: 0.1, authority: 0.08, fresh: 0.22, reliability: 0.12, longevity: 0.08, engagement: 0.3 },
        learning:      { depth: 0.18, breadth: 0.14, authority: 0.12, fresh: 0.06, reliability: 0.18, longevity: 0.18, engagement: 0.14 },
        promo:         { depth: 0.08, breadth: 0.18, authority: 0.08, fresh: 0.16, reliability: 0.1, longevity: 0.08, engagement: 0.32 },
    };
    var w = goalWeights[userGoal] || goalWeights.research;

    return results.map(function(r, idx) {
        var id = r.id || String(idx);
        var analysis = contextAnalyses[id] || {};
        var heat = heatmap[id] || {};
        var gov = getGovernanceForResult(r);

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

        // Authority: connector reputation + tone
        var authorityScore = 0;
        var trustedSources = ['wikipedia', 'wire-news', 'history-archive', 'loc-periodicals', 'loc-photos', 'arxiv', 'pubchem', 'genbank', 'hathitrust'];
        var communitySources = ['hn'];
        if (r.source && trustedSources.indexOf(r.source.toLowerCase()) >= 0) authorityScore += 0.6;
        else if (r.source && communitySources.indexOf(r.source.toLowerCase()) >= 0) authorityScore += 0.28;
        if (analysis.tone && (analysis.tone.academic > 0.3 || analysis.tone.educational > 0.3)) authorityScore += 0.3;
        authorityScore = Math.min(1, authorityScore);

        // Freshness (time-decay; favors newest when date known)
        var freshScore = _computeFreshnessScore(r);

        // Reliability: governance factuality + transparency + connector authority
        var reliabilityScore = Math.min(1,
            gov.factuality * 0.5 + gov.transparency * 0.25 + authorityScore * 0.25);

        // Longevity: institutional endurance (registry + authority)
        var longevityScore = Math.min(1, gov.longevity * 0.75 + authorityScore * 0.25);

        // Engagement from heatmap
        var engagementScore = 0;
        if (heat.clicks) engagementScore += Math.min(0.5, heat.clicks * 0.15);
        if (heat.dwellMs) engagementScore += Math.min(0.3, heat.dwellMs / 30000);
        if (heat.scrollDepth) engagementScore += heat.scrollDepth * 0.2;
        engagementScore = Math.min(1, engagementScore);

        var totalScore = (depthScore * w.depth * depthMod) + (breadthScore * w.breadth) +
            (authorityScore * w.authority) + (freshScore * w.fresh) +
            (reliabilityScore * w.reliability) + (longevityScore * w.longevity) +
            (engagementScore * w.engagement);

        if (biasPreference === 'prefer-center') {
            totalScore *= (1 + 0.1 * (1 - Math.min(1, Math.abs(gov.biasAxis || 0))));
        }

        var round2 = function (x) { return Math.round(x * 100) / 100; };

        return {
            result: r,
            id: id,
            governance: {
                biasLabel: gov.biasLabel,
                biasAxis: gov.biasAxis,
                factuality: gov.factuality,
                longevity: gov.longevity,
                ownership: gov.ownership,
                transparency: gov.transparency,
                pipeline: gov.pipeline,
            },
            scores: {
                total: round2(totalScore),
                depth: round2(depthScore),
                breadth: round2(breadthScore),
                authority: round2(authorityScore),
                fresh: round2(freshScore),
                recency: round2(freshScore),
                reliability: round2(reliabilityScore),
                longevity: round2(longevityScore),
                engagement: round2(engagementScore),
            },
            rank: 0,
        };
    }).sort(function(a, b) { return b.scores.total - a.scores.total; })
      .map(function(item, idx) { item.rank = idx + 1; return item; });
}

// Content Generation — produce outputs from analysis
function generateContent(type, results, analyses, opts) {
    opts = opts || {};
    var title = opts.title || 'Research Summary';
    var weighted = weightResults(results, {
        analyses: analyses,
        goal: opts.goal || 'research',
        biasPreference: opts.biasPreference || 'any',
    });

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
        lines.push('Results weighted using multi-dimensional scoring: depth, breadth, connector authority, freshness (time decay), reliability (factuality + transparency), longevity (institutional), engagement, and optional center-source bias preference.');
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
    VERSION: '2.10.1',
    search,
    corsFetch,
    getFetchProxyBase,
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
    getGovernanceForResult,
    DEFAULT_GOVERNANCE,
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
    buildBookIngestPreviewFromOlSearchDoc,
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
