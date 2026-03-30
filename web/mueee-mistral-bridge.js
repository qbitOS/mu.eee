/**
 * beyondBINARY quantum-prefixed | uvspeed
 * Mμ → Mistral: build chat payloads from MueeeMu + mu-agent fields; POST to a same-origin or Worker proxy.
 * Document AI (OCR, Document QnA, Annotations): https://docs.mistral.ai/capabilities/document_ai
 * Never put MISTRAL_API_KEY in the browser — use cloudflare/mueee-mistral-proxy-worker.js (or your own) server-side.
 */
(function () {
  'use strict';

  var DEFAULT_MODEL = 'mistral-small-latest';
  var DEFAULT_OCR_MODEL = 'mistral-ocr-latest';

  /** Official docs + cookbooks (same Worker can expose /api/mistral-chat and /api/mistral-ocr). */
  var DOCUMENT_AI = {
    overview: 'https://docs.mistral.ai/capabilities/document_ai',
    documentQnA: 'https://docs.mistral.ai/capabilities/document_ai/document_qna',
    annotations: 'https://docs.mistral.ai/capabilities/document_ai/annotations',
    ocrProcessor: 'https://docs.mistral.ai/capabilities/document_ai/basic_ocr',
    apiOcr: 'https://api.mistral.ai/v1/ocr',
    notebooks: {
      batchOcr:
        'https://colab.research.google.com/github/mistralai/cookbook/blob/main/mistral/ocr/batch_ocr.ipynb',
      toolUsage:
        'https://colab.research.google.com/github/mistralai/cookbook/blob/main/mistral/ocr/tool_usage.ipynb',
      dataExtraction:
        'https://colab.research.google.com/github/mistralai/cookbook/blob/main/mistral/ocr/data_extraction.ipynb',
      documentUnderstanding:
        'https://colab.research.google.com/github/mistralai/cookbook/blob/main/mistral/ocr/document_understanding.ipynb'
    }
  };

  /** Same-origin API on live mueee Worker (see cloudflare/mu-eee-subdomain-worker.js). */
  function defaultMistralChatUrlForHost() {
    try {
      if (typeof window === 'undefined' || !window.location) return '';
      var h = String(window.location.hostname || '');
      if (h === 'mueee.qbitos.ai' || h === 'mu.eee.qbitos.ai' || h === 'mue.qbitos.ai') {
        return window.location.origin + '/api/mistral-chat';
      }
    } catch (e) {}
    return '';
  }

  function defaultMistralOcrUrlForHost() {
    try {
      if (typeof window === 'undefined' || !window.location) return '';
      var h = String(window.location.hostname || '');
      if (h === 'mueee.qbitos.ai' || h === 'mu.eee.qbitos.ai' || h === 'mue.qbitos.ai') {
        return window.location.origin + '/api/mistral-ocr';
      }
    } catch (e) {}
    return '';
  }

  function getChatUrl() {
    try {
      var w = (typeof window !== 'undefined' && window.__MUEEE_MISTRAL_CHAT_URL__) || '';
      w = String(w || '').trim();
      if (w) return w;
      w = String(localStorage.getItem('mueee-mistral-chat-url') || '').trim();
      if (w) return w;
      return defaultMistralChatUrlForHost();
    } catch (e) {
      return '';
    }
  }

  /** Proxy URL for POST /v1/ocr (Worker path /api/mistral-ocr). */
  function getOcrUrl() {
    try {
      var w = (typeof window !== 'undefined' && window.__MUEEE_MISTRAL_OCR_URL__) || '';
      w = String(w || '').trim();
      if (w) return w;
      w = String(localStorage.getItem('mueee-mistral-ocr-url') || '').trim();
      if (w) return w;
      var def = defaultMistralOcrUrlForHost();
      if (def) return def;
      var chat = getChatUrl();
      if (chat && /\/api\/mistral-chat\/?$/i.test(chat)) {
        return chat.replace(/\/api\/mistral-chat\/?$/i, '/api/mistral-ocr');
      }
      return '';
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
          'No Mistral proxy URL. Set window.__MUEEE_MISTRAL_CHAT_URL__ or localStorage key "mueee-mistral-chat-url".'
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
    var tun =
      typeof window !== 'undefined' && typeof window.getMistralTuningPayload === 'function'
        ? window.getMistralTuningPayload() || {}
        : {};
    var merged = {};
    Object.assign(merged, tun, opts);
    var body = {
      model: opts.model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText }
      ],
      temperature:
        typeof merged.temperature === 'number' ? merged.temperature : 0.35
    };
    if (typeof merged.top_p === 'number') body.top_p = merged.top_p;
    if (typeof merged.max_tokens === 'number') body.max_tokens = merged.max_tokens;
    if (merged.safe_prompt === true) body.safe_prompt = true;
    if (merged.response_format && typeof merged.response_format === 'object') {
      body.response_format = merged.response_format;
    }
    if (Array.isArray(merged.guardrails)) body.guardrails = merged.guardrails;
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

  /**
   * Mistral Document QnA: chat.completions with user content = text + document_url (public URL).
   * @see https://docs.mistral.ai/capabilities/document_ai/document_qna
   */
  function chatMistralDocumentQnA(opts) {
    opts = opts || {};
    var url =
      opts.url != null && String(opts.url).trim() !== ''
        ? String(opts.url).trim()
        : getChatUrl();
    if (!url) {
      return Promise.resolve({
        ok: false,
        error:
          'No Mistral proxy URL. Set window.__MUEEE_MISTRAL_CHAT_URL__ or localStorage key "mueee-mistral-chat-url".'
      });
    }
    var question = String(opts.question || opts.userText || '').trim();
    var documentUrl = String(opts.documentUrl || '').trim();
    if (!question) {
      return Promise.resolve({ ok: false, error: 'Empty question' });
    }
    if (!documentUrl) {
      return Promise.resolve({ ok: false, error: 'documentUrl required (public PDF URL for Mistral)' });
    }
    var userContent = [
      { type: 'text', text: question },
      { type: 'document_url', document_url: documentUrl }
    ];
    var messages = [];
    if (opts.system && String(opts.system).trim()) {
      messages.push({ role: 'system', content: String(opts.system).trim() });
    }
    messages.push({ role: 'user', content: userContent });
    var body = {
      model: opts.model || DEFAULT_MODEL,
      messages: messages,
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

  /**
   * OCR API: POST body forwarded to https://api.mistral.ai/v1/ocr via Worker /api/mistral-ocr.
   * Pass opts.body = { model, document: { type, document_url }, table_format?, include_image_base64?, ... }
   * @see https://docs.mistral.ai/capabilities/document_ai/basic_ocr
   */
  function mistralOcrProcess(opts) {
    opts = opts || {};
    var url = opts.url != null && String(opts.url).trim() !== '' ? String(opts.url).trim() : getOcrUrl();
    if (!url) {
      return Promise.resolve({
        ok: false,
        error:
          'No OCR proxy URL. Set window.__MUEEE_MISTRAL_OCR_URL__, localStorage mueee-mistral-ocr-url, or a chat URL ending in /api/mistral-chat (OCR path /api/mistral-ocr is derived)'
      });
    }
    var body = opts.body;
    if (!body || typeof body !== 'object') {
      return Promise.resolve({ ok: false, error: 'mistralOcrProcess requires opts.body (OCR request JSON)' });
    }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: opts.signal
    })
      .then(function (res) {
        return res.text().then(function (text) {
          if (!res.ok) {
            return { ok: false, error: text || res.statusText, status: res.status, raw: text };
          }
          var json;
          try {
            json = JSON.parse(text);
          } catch (e) {
            return { ok: true, text: text, raw: text };
          }
          return { ok: true, json: json, raw: json };
        });
      })
      .catch(function (err) {
        return { ok: false, error: (err && err.message) || String(err) };
      });
  }

  /** Convenience: OCR a public PDF URL with defaults. */
  function mistralOcrFromPdfUrl(pdfUrl, ocrOpts) {
    ocrOpts = ocrOpts || {};
    var body = {
      model: ocrOpts.model || DEFAULT_OCR_MODEL,
      document: {
        type: 'document_url',
        document_url: String(pdfUrl || '').trim()
      },
      include_image_base64: ocrOpts.include_image_base64 !== false
    };
    if (ocrOpts.table_format != null && ocrOpts.table_format !== '') {
      body.table_format = ocrOpts.table_format;
    }
    if (ocrOpts.extract_header === true) body.extract_header = true;
    if (ocrOpts.extract_footer === true) body.extract_footer = true;
    return mistralOcrProcess({ url: ocrOpts.url, signal: ocrOpts.signal, body: body });
  }

  var MueeeMistralBridge = {
    DEFAULT_MODEL: DEFAULT_MODEL,
    DEFAULT_OCR_MODEL: DEFAULT_OCR_MODEL,
    DOCUMENT_AI: DOCUMENT_AI,
    defaultMistralChatUrlForHost: defaultMistralChatUrlForHost,
    defaultMistralOcrUrlForHost: defaultMistralOcrUrlForHost,
    getChatUrl: getChatUrl,
    getOcrUrl: getOcrUrl,
    buildSystemBlock: buildSystemBlock,
    chatMistralMu: chatMistralMu,
    chatMistralDocumentQnA: chatMistralDocumentQnA,
    mistralOcrProcess: mistralOcrProcess,
    mistralOcrFromPdfUrl: mistralOcrFromPdfUrl
  };

  if (typeof window !== 'undefined') window.MueeeMistralBridge = MueeeMistralBridge;
  if (typeof module !== 'undefined' && module.exports) module.exports = MueeeMistralBridge;
})();
