// beyondBINARY quantum-prefixed | uvspeed | bloch-video-codec.js
// .qvid (Quantum Video) encoder/decoder
// Format: structural video where every frame is a labeled AI training sample
// Tiers: mono 15Kbps | stereo 16Kbps | 360 23Kbps | VR 30Kbps | lightfield 48Kbps

(function(root) {
    'use strict';

    var MAGIC = 0x51564944; // 'QVID'
    var VERSION = 1;
    var RING_SIZE = 120;
    var MAX_QUBITS = 8;

    // ━━━ Header (64 bytes) ━━━
    // bytes 0-3:   magic 'QVID'
    // bytes 4-5:   version
    // bytes 6:     nq (qubit count)
    // bytes 7:     ring_size
    // bytes 8-9:   fps
    // bytes 10:    mode (0=mono,1=stereo,2=360,3=vr360,4=lightfield)
    // bytes 11:    flags (bit0=elevation_ring, bit1=rndr_compat)
    // bytes 12-15: frame_count
    // bytes 16-23: creation_timestamp (float64)
    // bytes 24-63: reserved / DCA block address

    function encodeHeader(meta) {
        var buf = new ArrayBuffer(64);
        var dv = new DataView(buf);
        dv.setUint32(0, MAGIC);
        dv.setUint16(4, VERSION);
        dv.setUint8(6, meta.nq || MAX_QUBITS);
        dv.setUint8(7, meta.ringSize || RING_SIZE);
        dv.setUint16(8, meta.fps || 30);
        dv.setUint8(10, ['mono','stereo','360','vr360','lightfield'].indexOf(meta.mode || 'mono'));
        var flags = 0;
        if (meta.elevationRing) flags |= 1;
        if (meta.rndrCompat) flags |= 2;
        dv.setUint8(11, flags);
        dv.setUint32(12, meta.frameCount || 0);
        dv.setFloat64(16, meta.timestamp || Date.now());
        return new Uint8Array(buf);
    }

    function decodeHeader(bytes) {
        var dv = new DataView(bytes.buffer, bytes.byteOffset, 64);
        if (dv.getUint32(0) !== MAGIC) return null;
        var modeIdx = dv.getUint8(10);
        var modes = ['mono','stereo','360','vr360','lightfield'];
        var flags = dv.getUint8(11);
        return {
            version: dv.getUint16(4),
            nq: dv.getUint8(6),
            ringSize: dv.getUint8(7),
            fps: dv.getUint16(8),
            mode: modes[modeIdx] || 'mono',
            elevationRing: !!(flags & 1),
            rndrCompat: !!(flags & 2),
            frameCount: dv.getUint32(12),
            timestamp: dv.getFloat64(16)
        };
    }

    // ━━━ Per-Frame (variable size based on mode) ━━━
    // Bloch angles: nq * 2 floats (theta, phi) = nq * 8 bytes (Float32 each)
    // Spin ring:    ring_size * 1 byte (quantized to int8, -1.0 to +1.0)
    // Elevation:    ring_size * 1 byte (if enabled)
    // Metadata:     16 bytes (fidelity, kzConv, coneRadius, velocity, frameIdx, prefixBits)
    // Training:     11 bytes (prefix distribution, one byte per symbol count)
    // Ballistic:    24 bytes (optional: rsi, macd, iron condor, readout, z-mag, atmos, dispersion)

    function encodeFrame(state) {
        var nq = state.qubits ? state.qubits.length : MAX_QUBITS;
        var hasEl = state.elevationRing && state.elevationRing.length > 0;
        var blochBytes = nq * 8;
        var ringBytes = RING_SIZE;
        var elBytes = hasEl ? RING_SIZE : 0;
        var metaBytes = 16;
        var trainBytes = 11;
        var ballisticBytes = 24;
        var total = blochBytes + ringBytes + elBytes + metaBytes + trainBytes + ballisticBytes;

        var buf = new ArrayBuffer(total);
        var dv = new DataView(buf);
        var off = 0;

        for (var q = 0; q < nq; q++) {
            var qb = state.qubits[q] || { theta: 0, phi: 0 };
            dv.setFloat32(off, qb.theta); off += 4;
            dv.setFloat32(off, qb.phi); off += 4;
        }

        var ring = state.spinRing || [];
        for (var i = 0; i < RING_SIZE; i++) {
            dv.setInt8(off++, Math.round(Math.max(-127, Math.min(127, (ring[i] || 0) * 127))));
        }

        if (hasEl) {
            var elRing = state.elevationRing;
            for (var i = 0; i < RING_SIZE; i++) {
                dv.setInt8(off++, Math.round(Math.max(-127, Math.min(127, (elRing[i] || 0) * 127))));
            }
        }

        dv.setFloat32(off, state.fidelity || 0); off += 4;
        dv.setFloat32(off, state.kzConvergence || 0); off += 4;
        dv.setFloat32(off, state.lightConeRadius || 0); off += 4;
        dv.setFloat32(off, state.ballisticVelocity || 0); off += 4;

        var pd = state.prefixDistribution || {};
        var syms = ['n:','+1:','   ','1:','0:','-0:','-n:','+0:','-1:','+n:','+2:'];
        for (var s = 0; s < 11; s++) {
            dv.setUint8(off++, Math.min(255, pd[syms[s]] || 0));
        }

        var fin = state.financialSignals || {};
        dv.setFloat32(off, fin.rsi || 50); off += 4;
        dv.setFloat32(off, fin.macdSignal || 0); off += 4;
        dv.setFloat32(off, fin.macdHist || 0); off += 4;
        dv.setFloat32(off, fin.ironCondorLow || 0.3); off += 4;
        dv.setFloat32(off, fin.ironCondorHigh || 0.7); off += 4;
        dv.setFloat32(off, fin.dispersionSlope || 0); off += 4;

        return new Uint8Array(buf);
    }

    function decodeFrame(bytes, header) {
        var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        var nq = header.nq;
        var off = 0;
        var qubits = [];
        for (var q = 0; q < nq; q++) {
            qubits.push({ theta: dv.getFloat32(off), phi: dv.getFloat32(off + 4) });
            off += 8;
        }
        var spinRing = new Float64Array(RING_SIZE);
        for (var i = 0; i < RING_SIZE; i++) {
            spinRing[i] = dv.getInt8(off++) / 127;
        }
        var elevationRing = null;
        if (header.elevationRing) {
            elevationRing = new Float64Array(RING_SIZE);
            for (var i = 0; i < RING_SIZE; i++) {
                elevationRing[i] = dv.getInt8(off++) / 127;
            }
        }
        var fidelity = dv.getFloat32(off); off += 4;
        var kzConv = dv.getFloat32(off); off += 4;
        var coneR = dv.getFloat32(off); off += 4;
        var velocity = dv.getFloat32(off); off += 4;
        var syms = ['n:','+1:','   ','1:','0:','-0:','-n:','+0:','-1:','+n:','+2:'];
        var prefixDist = {};
        for (var s = 0; s < 11; s++) {
            var count = dv.getUint8(off++);
            if (count > 0) prefixDist[syms[s]] = count;
        }
        var financialSignals = {};
        if (off + 24 <= bytes.byteLength) {
            financialSignals.rsi = dv.getFloat32(off); off += 4;
            financialSignals.macdSignal = dv.getFloat32(off); off += 4;
            financialSignals.macdHist = dv.getFloat32(off); off += 4;
            financialSignals.ironCondorLow = dv.getFloat32(off); off += 4;
            financialSignals.ironCondorHigh = dv.getFloat32(off); off += 4;
            financialSignals.dispersionSlope = dv.getFloat32(off); off += 4;
        }
        return {
            qubits: qubits, spinRing: spinRing, elevationRing: elevationRing,
            fidelity: fidelity, kzConvergence: kzConv,
            lightConeRadius: coneR, ballisticVelocity: velocity,
            prefixDistribution: prefixDist, financialSignals: financialSignals
        };
    }

    // ━━━ Full .qvid File Encode/Decode ━━━
    function encode(frames, meta) {
        meta = meta || {};
        meta.frameCount = frames.length;
        var header = encodeHeader(meta);
        var encodedFrames = frames.map(function(f) { return encodeFrame(f); });
        var totalSize = 64;
        encodedFrames.forEach(function(ef) { totalSize += 2 + ef.length; });
        totalSize += 64; // footer

        var out = new Uint8Array(totalSize);
        out.set(header, 0);
        var off = 64;
        encodedFrames.forEach(function(ef) {
            out[off] = (ef.length >> 8) & 0xFF;
            out[off + 1] = ef.length & 0xFF;
            off += 2;
            out.set(ef, off);
            off += ef.length;
        });

        var footer = new TextEncoder().encode(
            '<!-- BLOCK:qvid | frames:' + frames.length +
            ' | mode:' + (meta.mode || 'mono') +
            ' | dca:11-sym | train:true -->'
        );
        var footerPad = new Uint8Array(64);
        footerPad.set(footer.slice(0, 64), 0);
        out.set(footerPad, off);

        return out;
    }

    function decode(bytes) {
        var u8 = new Uint8Array(bytes);
        var header = decodeHeader(u8.slice(0, 64));
        if (!header) return null;
        var frames = [];
        var off = 64;
        for (var f = 0; f < header.frameCount; f++) {
            if (off + 2 > u8.length) break;
            var len = (u8[off] << 8) | u8[off + 1];
            off += 2;
            if (off + len > u8.length) break;
            frames.push(decodeFrame(u8.slice(off, off + len), header));
            off += len;
        }
        return { header: header, frames: frames };
    }

    function download(frames, meta, filename) {
        var data = encode(frames, meta);
        var blob = new Blob([data], { type: 'application/octet-stream' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename || 'capture.qvid';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    root.QvidCodec = {
        encode: encode, decode: decode, download: download,
        encodeHeader: encodeHeader, decodeHeader: decodeHeader,
        encodeFrame: encodeFrame, decodeFrame: decodeFrame,
        MAGIC: MAGIC, VERSION: VERSION, RING_SIZE: RING_SIZE
    };

})(typeof window !== 'undefined' ? window : globalThis);
