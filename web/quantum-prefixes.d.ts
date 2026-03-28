// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// Type definitions for quantum-prefixes.js — Shared Quantum Gutter Prefix Engine

/**
 * Prefix symbol strings used in the 11-symbol quantum system.
 */
export type PrefixSymbol =
  | 'n:'   // shebang / entry
  | '+1:'  // comment / decorator
  | '-n:'  // import
  | '+0:'  // class / struct
  | '0:'   // function / method
  | '-1:'  // error / exception
  | '+n:'  // condition / if-else
  | '+2:'  // loop
  | '-0:'  // return / yield
  | '+3:'  // output / print
  | '1:'   // variable / assignment
  | '   '; // default / unclassified

/**
 * Prefix category names.
 */
export type PrefixCategory =
  | 'shebang'
  | 'comment'
  | 'import'
  | 'class'
  | 'function'
  | 'error'
  | 'condition'
  | 'loop'
  | 'return'
  | 'output'
  | 'variable'
  | 'decorator'
  | 'default';

/**
 * Supported programming languages for prefix classification.
 */
export type SupportedLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'rust'
  | 'go'
  | 'shell'
  | 'c'
  | 'cpp'
  | 'html'
  | 'css'
  | 'markdown'
  | 'mermaid'
  | 'sql'
  | 'yaml'
  | 'json'
  | 'arduino';

/**
 * Theme mode identifier.
 */
export type ThemeMode = 'dark' | 'light';

/**
 * A single prefix definition with symbol, CSS class, and color.
 */
export interface PrefixDef {
  readonly sym: PrefixSymbol;
  readonly cls: string;
  readonly color: string;
}

/**
 * Result of classifying a single line.
 */
export interface ClassifyResult extends PrefixDef {
  readonly category: PrefixCategory;
}

/**
 * Per-line classification data within metadata output.
 */
export interface LineClassification {
  readonly line: number;
  readonly sym: PrefixSymbol;
  readonly category: PrefixCategory;
}

/**
 * Metadata result from analyzing content.
 */
export interface PrefixMetadataResult {
  readonly language: SupportedLanguage;
  readonly totalLines: number;
  readonly classifiedLines: number;
  readonly coverage: number;
  readonly prefixCounts: Record<PrefixCategory, number>;
  readonly lines: LineClassification[];
}

/**
 * Export result containing prefixed text and metadata.
 */
export interface ExportResult {
  readonly text: string;
  readonly meta: PrefixMetadataResult;
}

/**
 * Per-source sync state broadcast via BroadcastChannel.
 */
export interface SyncState {
  readonly coverage?: number;
  readonly totalLines?: number;
  readonly classifiedLines?: number;
  readonly prefixCounts?: Record<PrefixCategory, number>;
  readonly timestamp?: number;
  [key: string]: unknown;
}

/**
 * Global state map: source app name → sync state.
 */
export type GlobalState = Record<string, SyncState>;

/**
 * Aggregated stats across all running apps.
 */
export interface AggregateStats {
  readonly sources: string[];
  readonly totalLines: number;
  readonly classifiedLines: number;
  readonly coverage: number;
  readonly prefixCounts: Record<string, number>;
}

/**
 * Theme variable map: CSS custom property → value.
 */
export type ThemeVars = Record<string, string>;

/**
 * IoT/Quantum bridge connection options.
 */
export interface IoTConnectionOptions {
  onMessage?: (msg: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event | Error) => void;
  reconnect?: boolean;
}

/**
 * Language pattern map: category → regex.
 */
export type LanguagePatterns = Partial<Record<PrefixCategory, RegExp>>;

/**
 * Quantum gutter metadata injected into JSON exports.
 */
export interface QuantumGutterMeta {
  readonly source: string;
  readonly version: string;
  readonly symbols: PrefixSymbol[];
  readonly totalLines: number;
  readonly classifiedLines: number;
  readonly coverage: string;
  readonly prefixCounts: Record<string, number>;
  readonly timestamp: string;
}

/**
 * QSim statevector simulator instance.
 */
export interface QSimInstance {
  readonly n: number;
  apply(gate: number[][], target: number): void;
  measure(shots: number): Record<string, number>;
}

/**
 * Quantum circuit description.
 */
export interface QuantumCircuit {
  readonly qubits: number;
  readonly depth: number;
  readonly gates: Array<{ gate: string; target: number; param?: number }>;
  readonly qasm: string;
}

/**
 * Result of simulating a quantum circuit.
 */
export interface SimulationResult {
  readonly qubits: number;
  readonly counts: Record<string, number>;
  readonly circuit: QuantumCircuit;
}

/**
 * Context analysis input for contextToCoordinates.
 */
export interface ContextAnalysis {
  readonly tone?: { dominant?: string; academic?: number; marketing?: number; educational?: number; narrative?: number; legal?: number; crisis?: number; [key: string]: unknown };
  readonly vocabulary?: { totalWords: number; uniqueWords: number; typeTokenRatio: number; hapaxRatio: number; avgWordLength: number; top50?: Array<{ word: string; count: number }> };
  readonly subReferences?: Record<string, string[]>;
  readonly monetarySignals?: string[];
  readonly sentiment?: number;
  readonly readabilityScore?: number;
  readonly heartbeat?: number;
  readonly aiPerspective?: string;
}

/**
 * 3D quantum coordinate result.
 */
export interface ContextCoordinates {
  readonly coordinates: [number, number, number];
  readonly label: string;
  readonly color: string;
  readonly gate: string;
  readonly raw: {
    readonly refDensity: number;
    readonly vocabRichness: number;
    readonly toneComplexity: number;
    readonly activeTones: number;
    readonly toneEntropy: number;
  };
}

/**
 * ⚛ QuantumPrefixes — The main API exposed on `window.QuantumPrefixes`.
 *
 * Universal module used by all UV-Speed apps for 11-symbol quantum prefix
 * classification, cross-app synchronization, IoT bridging, and theming.
 */
export interface QuantumPrefixesAPI {
  // ── Constants ──
  readonly PREFIXES: Record<PrefixCategory, PrefixDef>;
  readonly PREFIX_ANSI: Record<PrefixSymbol, string>;
  readonly LANG_PATTERNS: Record<SupportedLanguage, LanguagePatterns>;
  readonly VERSION: string;
  readonly THEMES: Record<ThemeMode, ThemeVars>;

  // ── Core Classification ──

  /** Detect the programming language of content. */
  detectLanguage(content: string, hint?: SupportedLanguage): SupportedLanguage;

  /** Classify a single line of code → prefix result. */
  classifyLine(line: string, language?: SupportedLanguage): ClassifyResult;

  /** Classify a single line → symbol string only (for terminal use). */
  classifyLineSym(line: string, language?: SupportedLanguage): PrefixSymbol;

  // ── Content Operations ──

  /** Prefix every line in content with its quantum symbol. */
  prefixContent(content: string, language?: SupportedLanguage): string;

  /** Analyze content and return detailed prefix metadata. */
  prefixMetadata(content: string, language?: SupportedLanguage): PrefixMetadataResult;

  /** Generate a header comment string with prefix stats. */
  exportHeader(meta: PrefixMetadataResult, source?: string): string;

  /** Prefix content and prepend a stats header. */
  exportWithPrefixes(content: string, language?: SupportedLanguage, source?: string): ExportResult;

  /** Download content as a prefixed file with header. */
  downloadWithPrefixes(content: string, filename: string, language?: SupportedLanguage, source?: string): PrefixMetadataResult;

  /** Wrap a JSON data object with quantum gutter metadata. */
  wrapJsonExport<T extends Record<string, unknown>>(data: T, contents: string | Array<{ content: string; language?: SupportedLanguage }>, source?: string): T & { quantumGutter: QuantumGutterMeta };

  /** Render a single line with ANSI color codes for terminal display. */
  gutterLineAnsi(line: string, lineNum: number, language?: SupportedLanguage): string;

  // ── Live Sync (BroadcastChannel) ──

  /** Broadcast prefix state to all other open uvspeed apps. */
  broadcastState(source: string, state: SyncState): void;

  /** Request all apps to re-broadcast their current state. */
  requestStateSync(): void;

  /** Register a listener for state changes from other apps. */
  onStateChange(fn: (source: string, state: SyncState | null, globalState: GlobalState) => void): void;

  /** Get the current global state map (all sources). */
  getGlobalState(): GlobalState;

  /** Load persisted state from localStorage. */
  loadPersistedState(): GlobalState;

  /** Aggregate stats across all running apps. */
  aggregateGlobalStats(): AggregateStats;

  // ── IoT / Quantum Bridge ──

  /** Connect to an IoT quantum computer bridge via WebSocket. */
  connectIoT(url: string, opts?: IoTConnectionOptions): void;

  /** Disconnect from the IoT bridge. */
  disconnectIoT(): void;

  /** Check if the IoT bridge is connected. */
  isIoTConnected(): boolean;

  // ── QPU Simulation ──

  /** Local statevector quantum simulator (up to 12 qubits). */
  QSim: new (n: number) => QSimInstance;

  /** Standard quantum gate matrices. */
  QGATES: Record<string, number[][]>;

  /** Rotation-X gate constructor. */
  rxGate(theta: number): number[][];

  /** Rotation-Y gate constructor. */
  ryGate(theta: number): number[][];

  /** Rotation-Z gate constructor. */
  rzGate(theta: number): number[][];

  /** Build and simulate a quantum circuit from source code. */
  simulateCircuit(code: string, language?: SupportedLanguage, shots?: number): SimulationResult;

  /** Submit a quantum circuit to IBM Quantum via REST API. */
  submitToIBM(circuit: QuantumCircuit, token: string, backend?: string, shots?: number): Promise<Record<string, number>>;

  /** Calculate Hellinger fidelity between two measurement distributions. */
  hellingerFidelity(dist1: Record<string, number>, dist2: Record<string, number>): number;

  // ── 3D Context Mapping ──

  /** Map document/context analysis to 3D quantum coordinates [x, y, z]. */
  contextToCoordinates(analysis: ContextAnalysis): ContextCoordinates;

  // ── Theme Engine ──

  /** Toggle between light and dark theme. */
  toggleTheme(): void;

  /** Set the theme explicitly. */
  setTheme(theme: ThemeMode): void;

  /** Get the current theme mode. */
  getTheme(): ThemeMode;

  /** Register a listener for theme changes. */
  onThemeChange(fn: (theme: ThemeMode) => void): void;
}

// ── Global declaration ──
declare global {
  interface Window {
    QuantumPrefixes: QuantumPrefixesAPI;
  }
}

export default QuantumPrefixesAPI;
