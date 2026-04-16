// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// WASM Loader — Dynamically loads the Rust prefix engine in the browser
// Falls back to the JavaScript implementation if WASM is not available.

/**
 * Result from WASM prefix classification.
 */
interface WasmClassifyResult {
  symbol: string;
  category: string;
  bits: number;
  coords: [number, number, number];
  line_num: number;
}

/**
 * The WASM prefix classifier instance (mirrors Rust WasmPrefixClassifier).
 */
interface WasmPrefixClassifier {
  new (): WasmPrefixClassifier;
  classify(line: string): string;        // Returns JSON string
  classify_source(source: string): string; // Returns JSON array string
  gutter(source: string): string;        // Returns JSON array string
  classify_binary(source: string): Uint8Array;
}

interface WasmExports {
  WasmPrefixClassifier: WasmPrefixClassifier;
  default: (input?: RequestInfo | URL) => Promise<void>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let wasmClassifier: WasmPrefixClassifier | null = null;
let wasmLoaded = false;
let wasmFailed = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Loader
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Initialize the WASM prefix engine.
 * Returns true if WASM loaded successfully, false if falling back to JS.
 */
async function initWasm(): Promise<boolean> {
  if (wasmLoaded) return true;
  if (wasmFailed) return false;

  try {
    // Dynamic import of the WASM module
    const wasm = await import('./wasm/prefix_engine.js') as unknown as WasmExports;
    await wasm.default();

    // Create classifier instance
    wasmClassifier = new wasm.WasmPrefixClassifier();
    wasmLoaded = true;

    console.log('⚛ WASM prefix engine loaded — Rust-speed classification active');
    return true;
  } catch (err) {
    wasmFailed = true;
    console.warn('⚛ WASM prefix engine not available, using JS fallback:', err);
    return false;
  }
}

/**
 * Classify a single line using WASM (returns null if WASM not loaded).
 */
function wasmClassifyLine(line: string): WasmClassifyResult | null {
  if (!wasmClassifier) return null;
  try {
    return JSON.parse(wasmClassifier.classify(line));
  } catch {
    return null;
  }
}

/**
 * Classify entire source using WASM (returns null if WASM not loaded).
 */
function wasmClassifySource(source: string): WasmClassifyResult[] | null {
  if (!wasmClassifier) return null;
  try {
    return JSON.parse(wasmClassifier.classify_source(source));
  } catch {
    return null;
  }
}

/**
 * Get gutter strings using WASM (returns null if WASM not loaded).
 */
function wasmGutter(source: string): string[] | null {
  if (!wasmClassifier) return null;
  try {
    return JSON.parse(wasmClassifier.gutter(source));
  } catch {
    return null;
  }
}

/**
 * Get binary-packed prefix data using WASM.
 */
function wasmClassifyBinary(source: string): Uint8Array | null {
  if (!wasmClassifier) return null;
  try {
    return wasmClassifier.classify_binary(source);
  } catch {
    return null;
  }
}

/**
 * Check if the WASM engine is available.
 */
function isWasmReady(): boolean {
  return wasmLoaded && wasmClassifier !== null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WasmPrefixEngine = {
  init: initWasm,
  classifyLine: wasmClassifyLine,
  classifySource: wasmClassifySource,
  gutter: wasmGutter,
  classifyBinary: wasmClassifyBinary,
  isReady: isWasmReady,
};

// Expose globally
if (typeof window !== 'undefined') {
  (window as any).WasmPrefixEngine = WasmPrefixEngine;
}

export default WasmPrefixEngine;
