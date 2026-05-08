/**
 * μ'search shell — staged blob → MediaSource playback (MSE).
 *
 * Mirrors the common “stage in RAM, drain when decoder ready” pattern used by
 * large-scale live feeds (buffered segments, ordered append, back-pressure).
 *
 * FFmpeg runs off-page: produce fragmented MP4 (or have your edge worker emit
 * fMP4 segments) and push each segment here as Blob / ArrayBuffer.
 *
 * References:
 *   https://ffmpeg.org/
 *   https://ffmpeg.org/download.html#repositories
 *
 * Example — fragmented MP4 suitable for SourceBuffer (init + moof/mdat):
 *   ffmpeg -i input.mp4 -c copy -movflags frag_keyframe+empty_moov+default_base_moof out.mp4
 *
 * Live-style pipe (edge / worker forwards binary WebSocket chunks → queueBlob):
 *   ffmpeg -re -i rtmp:... -c copy -movflags frag_keyframe+empty_moov+default_base_moof -f mp4 pipe:1
 */
(function (global) {
  'use strict';

  var DEFAULT_CODECS = [
    'video/mp4; codecs="avc1.640028"',
    'video/mp4; codecs="avc1.4D401E"',
    'video/mp4; codecs="avc1.42E01E"',
    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    'video/mp4'
  ];

  function pickMimeCodec(preferred) {
    if (preferred && global.MediaSource && MediaSource.isTypeSupported(preferred)) {
      return preferred;
    }
    for (var i = 0; i < DEFAULT_CODECS.length; i++) {
      if (global.MediaSource && MediaSource.isTypeSupported(DEFAULT_CODECS[i])) {
        return DEFAULT_CODECS[i];
      }
    }
    return 'video/mp4';
  }

  function toArrayBuffer(input) {
    if (input instanceof ArrayBuffer) {
      return Promise.resolve(input);
    }
    if (ArrayBuffer.isView(input)) {
      return Promise.resolve(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
    }
    if (input instanceof Blob) {
      return input.arrayBuffer();
    }
    return Promise.reject(new TypeError('Expected Blob, ArrayBuffer, or TypedArray'));
  }

  /**
   * @param {HTMLVideoElement} videoEl
   * @param {{ mimeCodec?: string, maxQueuedChunks?: number, onError?: function(Error): void }} opts
   */
  function MueeeStagedBlobMse(videoEl, opts) {
    opts = opts || {};
    this.video = videoEl;
    this.mimeCodec = pickMimeCodec(opts.mimeCodec);
    this.maxQueuedChunks = opts.maxQueuedChunks != null ? opts.maxQueuedChunks : 32;
    this.onError = typeof opts.onError === 'function' ? opts.onError : function () {};

    this._ms = null;
    this._sb = null;
    this._objectUrl = null;
    /** @type {ArrayBuffer[]} */
    this._queue = [];
    this._ended = false;
    this._destroyed = false;
    this._onUpdateEnd = this._drainQueue.bind(this);
  }

  MueeeStagedBlobMse.isSupported = function () {
    return !!(global.MediaSource && typeof MediaSource.isTypeSupported === 'function');
  };

  MueeeStagedBlobMse.prototype.open = function () {
    var self = this;
    if (self._destroyed) {
      return Promise.reject(new Error('MueeeStagedBlobMse destroyed'));
    }
    if (!MueeeStagedBlobMse.isSupported()) {
      var err = new Error('MediaSource API not available');
      self.onError(err);
      return Promise.reject(err);
    }
    return new Promise(function (resolve, reject) {
      self._ms = new MediaSource();
      self._objectUrl = URL.createObjectURL(self._ms);
      self.video.src = self._objectUrl;

      function onSourceOpen() {
        self._ms.removeEventListener('sourceopen', onSourceOpen);
        try {
          self._sb = self._ms.addSourceBuffer(self.mimeCodec);
          self._sb.mode = 'segments';
        } catch (e1) {
          self.onError(e1);
          reject(e1);
          return;
        }
        self._sb.addEventListener('updateend', self._onUpdateEnd);
        resolve(self);
        self._drainQueue();
      }

      self._ms.addEventListener('sourceopen', onSourceOpen);
    });
  };

  MueeeStagedBlobMse.prototype._trimBufferedStart = function (keepSeconds) {
    var sb = this._sb;
    var vid = this.video;
    if (!sb || !vid.buffered || !vid.buffered.length) return;
    keepSeconds = keepSeconds == null ? 30 : keepSeconds;
    var end = vid.currentTime - keepSeconds;
    if (end <= 0.5) return;
    try {
      sb.remove(0, end);
    } catch (e) {}
  };

  MueeeStagedBlobMse.prototype._drainQueue = function () {
    var self = this;
    if (self._destroyed || !self._sb || self._sb.updating) return;
    if (self._queue.length === 0) {
      if (self._ended && self._ms && self._ms.readyState === 'open') {
        try {
          self._ms.endOfStream();
        } catch (e2) {}
      }
      return;
    }
    var chunk = self._queue.shift();
    try {
      self._sb.appendBuffer(chunk);
    } catch (e3) {
      if (e3 && e3.name === 'QuotaExceededError') {
        self._queue.unshift(chunk);
        self._trimBufferedStart(12);
        return;
      }
      self.onError(e3);
    }
  };

  /**
   * Stage one fMP4 segment (init segment first, then moof/mdat fragments in order).
   * @param {Blob|ArrayBuffer|ArrayBufferView} blobOrBuf
   * @returns {Promise<void>}
   */
  MueeeStagedBlobMse.prototype.queueBlob = function (blobOrBuf) {
    var self = this;
    if (self._destroyed) {
      return Promise.reject(new Error('destroyed'));
    }
    if (!self._sb) {
      return Promise.reject(new Error('call open() before queueBlob'));
    }
    if (self._queue.length >= self.maxQueuedChunks) {
      return Promise.reject(new Error('staged blob queue full (back-pressure)'));
    }
    return toArrayBuffer(blobOrBuf).then(function (ab) {
      self._queue.push(ab);
      self._drainQueue();
    });
  };

  /** Mark end of VOD stream; after the queue drains, endOfStream() is called. */
  MueeeStagedBlobMse.prototype.signalEndOfStream = function () {
    this._ended = true;
    this._drainQueue();
  };

  MueeeStagedBlobMse.prototype.destroy = function () {
    var self = this;
    if (self._destroyed) return;
    self._destroyed = true;
    self._queue = [];
    self._ended = true;
    if (self._sb) {
      try {
        self._sb.removeEventListener('updateend', self._onUpdateEnd);
      } catch (e) {}
      self._sb = null;
    }
    if (self._ms) {
      try {
        if (self._ms.readyState === 'open') {
          self._ms.endOfStream();
        }
      } catch (e2) {}
      self._ms = null;
    }
    if (self._objectUrl) {
      URL.revokeObjectURL(self._objectUrl);
      self._objectUrl = null;
    }
    try {
      self.video.pause();
      self.video.removeAttribute('src');
      self.video.load();
    } catch (e3) {}
  };

  /**
   * Fetch ordered segment URLs (e.g. from your CDN / Worker that runs FFmpeg).
   * @param {HTMLVideoElement} videoEl
   * @param {string[]} urls
   * @param {{ mimeCodec?: string, maxQueuedChunks?: number, onError?: function(Error): void }} opts
   */
  MueeeStagedBlobMse.playFromSegmentUrls = function (videoEl, urls, opts) {
    var player = new MueeeStagedBlobMse(videoEl, opts || {});
    return player.open().then(function () {
      var i = 0;
      function next() {
        if (i >= urls.length) {
          player.signalEndOfStream();
          return Promise.resolve(player);
        }
        return fetch(urls[i++], { mode: 'cors', credentials: 'omit' })
          .then(function (r) {
            if (!r.ok) throw new Error('segment ' + (i - 1) + ' HTTP ' + r.status);
            return r.blob();
          })
          .then(function (b) {
            return player.queueBlob(b);
          })
          .then(next);
      }
      return next();
    });
  };

  global.MueeeStagedBlobMse = MueeeStagedBlobMse;
})(typeof window !== 'undefined' ? window : this);
