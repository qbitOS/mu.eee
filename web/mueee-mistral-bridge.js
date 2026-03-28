/**
 * beyondBINARY quantum-prefixed | uvspeed
 * Mμ → Mistral: build chat payloads from MueeeMu + mu-agent fields; POST to a same-origin or Worker proxy.
 * Never put MISTRAL_API_KEY in the browser — use cloudflare/mueee-mistral-proxy-worker.js (or your own) server-side.
 */
(function () {
  'use strict';

  var DEFAULT_MODEL = 'mistral-small-latest';

  function getChatUrl() {
    try {
      var w = (typeof window !== 'undefined' && window.__MUEEE_MISTRAL_CHAT_URL__) || '';
      w = String(w || '').trim();
      if (w) return w;
      return String(localStorage.getItem('mueee-mistral-chat-url') || '').trim();
    } catch (e) {
      return '';
    }
  }

  function buildSystemBlock(mu) {
    mu = mu || {};
    var parts = [];
    if (mu.instructions) parts.push('## Agent instructions\n' + mu.instructions);
    if (mu.guardrails) parts.push('## Guardrails\n' + mu.guardrails);
    if (mu.tone) parts.push('## Tone\n' + mu.tone);
    if (mu.knowledge) parts.push('## Knowledge / context\n' + mu.knowledge);
    return parts.join('\n\n').trim();
  }

  /**
   * @param {object} opts
   * @param {string} [opts.userText]
   * @param {string} [opts.url] — override proxy URL
   * @param {object} [opts.muPayload] — from getSearchMuAgentPayloadForApi(); built if omitted when that fn exists
   * @param {string} [opts.model]
   * @param {AbortSignal} [opts.signal]
   * @returns {Promise<{ok:boolean,text?:string,error?:string,status?:number,raw?:object}>}
   */
  function chatMistralMu(opts) {
    opts = opts || {};
    var url;
    if (opts.url != null && String(opts.url).trim() !== '') {
      url = String(opts.url).trim();
    } else {
      url = getChatUrl();
    }
    if (!url) {
      return Promise.resolve({
        ok: false,
        error:
          'No Mistral proxy URL. Set window.__MUEEE_MISTRAL_CHAT_URL__ or localStorage key mueee-mistral-chat-url'
      });
    }
    var userText = String(opts.userText || '').trim();
    if (!userText) {
      return Promise.resolve({ ok: false, error: 'Empty user prompt' });
    }
    var mu =
      opts.muPayload && typeof opts.muPayload === 'object'
        ? opts.muPayload
        : typeof window !== 'undefined' && typeof window.getSearchMuAgentPayloadForApi === 'function'
          ? window.getSearchMuAgentPayloadForApi()
          : null;
    if (!mu || !mu.instructions) {
      return Promise.resolve({
        ok: false,
        error: 'Mμ payload missing — load mueee-mu-context.js and open Mμ agent fields'
      });
    }
    var system = buildSystemBlock({
      instructions: mu.instructions,
      guardrails: mu.guardrails,
      tone: mu.tone,
      knowledge: mu.knowledge
    });
    if (!system) {
      return Promise.resolve({ ok: false, error: 'Empty system block' });
    }
    var body = {
      model: opts.model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText }
      ],
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.35
    };
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: opts.signal
    })
      .then(function (res) {
        return res.text().then(function (text) {
          if (!res.ok) {
            return { ok: false, error: text || res.statusText, status: res.status };
          }
          var json;
          try {
            json = JSON.parse(text);
          } catch (e) {
            return { ok: false, error: 'Proxy did not return JSON', raw: text };
          }
          var out =
            json.choices &&
            json.choices[0] &&
            json.choices[0].message &&
            json.choices[0].message.content;
          if (!out) {
            return { ok: false, error: 'Unexpected Mistral response shape', raw: json };
          }
          return { ok: true, text: String(out), raw: json };
        });
      })
      .catch(function (err) {
        return { ok: false, error: (err && err.message) || String(err) };
      });
  }

  var MueeeMistralBridge = {
    DEFAULT_MODEL: DEFAULT_MODEL,
    getChatUrl: getChatUrl,
    buildSystemBlock: buildSystemBlock,
    chatMistralMu: chatMistralMu
  };

  if (typeof window !== 'undefined') window.MueeeMistralBridge = MueeeMistralBridge;
  if (typeof module !== 'undefined' && module.exports) module.exports = MueeeMistralBridge;
})();
