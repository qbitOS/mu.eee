/**
 * YouTube watch / share URLs → optional direct stream URL template, with
 * canonical https://www.youtube.com/watch?v=… as fallback (for Search text
 * and for attachments.youtubeCanonical when a template is used).
 *
 * Configure (pick one):
 *   localStorage.setItem('mueee-yt-stream-url-template', 'https://your-worker.example/play?id={{id}}')
 *   window.__MUEEE_YT_STREAM_TEMPLATE__ = 'https://…{{id}}…'
 *
 * Template must contain literal {{id}} (video id is URL-encoded when inserted).
 * If unset, pasted links normalize to the main watch URL only.
 */
(function (global) {
  'use strict';

  var ID_RE = /^[a-zA-Z0-9_-]{11}$/;

  function extractYouTubeId(input) {
    var s = String(input || '').trim();
    if (!s) return null;
    var tryUrl = s;
    if (tryUrl.indexOf('//') === 0) tryUrl = 'https:' + tryUrl;
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(tryUrl)) tryUrl = 'https://' + tryUrl;
    var u;
    try {
      u = new URL(tryUrl);
    } catch (e) {
      return null;
    }
    var h = (u.hostname || '').replace(/^www\./i, '').toLowerCase();
    if (h === 'youtu.be') {
      var seg = (u.pathname || '').split('/').filter(Boolean)[0] || '';
      return ID_RE.test(seg) ? seg : null;
    }
    if (h === 'youtube.com' || h.endsWith('.youtube.com')) {
      var v = u.searchParams.get('v');
      if (v && ID_RE.test(v)) return v;
      var parts = (u.pathname || '').split('/').filter(Boolean);
      if (parts.length >= 2) {
        if (parts[0] === 'embed' && ID_RE.test(parts[1])) return parts[1];
        if (parts[0] === 'shorts' && ID_RE.test(parts[1])) return parts[1];
        if (parts[0] === 'live' && ID_RE.test(parts[1])) return parts[1];
      }
    }
    return null;
  }

  function getStreamTemplate() {
    try {
      if (global.localStorage) {
        var t = global.localStorage.getItem('mueee-yt-stream-url-template');
        if (t && t.indexOf('{{id}}') !== -1) return t.trim();
      }
    } catch (e) {}
    if (typeof global.__MUEEE_YT_STREAM_TEMPLATE__ === 'string' && global.__MUEEE_YT_STREAM_TEMPLATE__.indexOf('{{id}}') !== -1) {
      return global.__MUEEE_YT_STREAM_TEMPLATE__.trim();
    }
    return '';
  }

  function youTubeWatchUrl(id) {
    return 'https://www.youtube.com/watch?v=' + encodeURIComponent(id);
  }

  /**
   * @returns {{ href: string, youtubeId: string|null, usedDirectTemplate: boolean, canonical: string|null }}
   */
  function convertYouTubeLinkIfNeeded(href) {
    var raw = String(href || '').trim();
    if (!raw) {
      return { href: raw, youtubeId: null, usedDirectTemplate: false, canonical: null };
    }
    var id = extractYouTubeId(raw);
    if (!id) {
      return { href: raw, youtubeId: null, usedDirectTemplate: false, canonical: null };
    }
    var canonical = youTubeWatchUrl(id);
    var tpl = getStreamTemplate();
    if (!tpl) {
      return { href: canonical, youtubeId: id, usedDirectTemplate: false, canonical: canonical };
    }
    var stream = tpl.replace(/\{\{\s*id\s*\}\}/gi, encodeURIComponent(id));
    try {
      new URL(stream);
    } catch (e2) {
      return { href: canonical, youtubeId: id, usedDirectTemplate: false, canonical: canonical };
    }
    return { href: stream, youtubeId: id, usedDirectTemplate: true, canonical: canonical };
  }

  /**
   * Fields for shell link attachments + Search payload.
   * @returns {{ url: string, youtubeCanonical?: string }}
   */
  function buildLinkAttachment(href) {
    var r = convertYouTubeLinkIfNeeded(href);
    var o = { url: r.href };
    if (r.youtubeId && r.usedDirectTemplate && r.canonical) {
      o.youtubeCanonical = r.canonical;
    }
    return o;
  }

  global.MueeeYouTubeStreamLink = {
    extractYouTubeId: extractYouTubeId,
    convertYouTubeLinkIfNeeded: convertYouTubeLinkIfNeeded,
    youTubeWatchUrl: youTubeWatchUrl,
    buildLinkAttachment: buildLinkAttachment
  };
})(typeof window !== 'undefined' ? window : this);
