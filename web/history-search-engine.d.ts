// beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
// Type definitions for history-search-engine.js v2.0

export interface SearchResult {
  title: string;
  source: string;
  url?: string;
  snippet?: string;
  author?: string;
  year?: number;
  id?: string;
  _fetchedDoc?: FetchedDocument;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  latencyMs: number;
  connectorsUsed: number;
  totalResults: number;
}

export interface SearchOptions {
  onProgress?: (progress: SearchProgress) => void;
}

export interface SearchProgress {
  results: SearchResult[];
  completed: number;
  total: number;
  connector: string;
  error?: string;
  latestBatch: SearchResult[];
}

export interface ConnectorInfo {
  name: string;
  icon: string;
  enabled: boolean;
}

export interface TimelineScale {
  name: string;
  min: number;
  max: number;
  color: string;
}

export interface FetchedDocument {
  title: string;
  content: string;
  source: string;
  url: string;
  wordCount: number;
  language: string;
  fetchedAt: number;
  categories?: string[];
  authors?: string[];
  subjects?: string[];
  creator?: string;
  date?: string;
  snippet?: string;
  _analysis?: ContextAnalysisResult;
}

export interface ToneScores {
  academic: number;
  marketing: number;
  educational: number;
  narrative: number;
  legal: number;
  crisis: number;
  dominant: string;
}

export interface VocabularyProfile {
  totalWords: number;
  uniqueWords: number;
  typeTokenRatio: number;
  hapaxRatio: number;
  avgWordLength: number;
  top50: Array<{ word: string; count: number }>;
}

export interface ContextAnalysisResult {
  tone: ToneScores;
  vocabulary: VocabularyProfile;
  subReferences: Record<string, string[]>;
  monetarySignals: string[];
  sentiment: number;
  readabilityScore: number;
  heartbeat: number;
  aiPerspective: string;
}

export interface PatternCluster {
  title: string;
  source: string;
  heartbeat: number;
}

export interface Shockwave {
  title: string;
  source: string;
  crisisScore: number;
  monetaryTerms: number;
  sentiment: number;
}

export interface PatternResult {
  clusters: Record<string, PatternCluster[]>;
  economicDensity: number;
  attentionRatio: number;
  heartbeatRatio: number;
  shockwaves: Shockwave[];
  documentsAnalyzed: number;
  prediction: string;
}

export interface HistorySearchAPI {
  readonly VERSION: string;

  /** Search across all enabled connectors. */
  search(query: string, opts?: SearchOptions): Promise<SearchResponse>;

  /** Get list of all connectors with current enabled state. */
  getConnectors(): ConnectorInfo[];

  /** Enable/disable a connector by name or index. */
  setConnectorEnabled(nameOrIndex: string | number, enabled: boolean): void;

  /** Get timeline scale definitions. */
  getScales(): TimelineScale[];

  /** Get color for a source name. */
  getSourceColor(source: string): string;

  /** Render mini timeline on a canvas element. */
  drawTimeline(canvas: HTMLCanvasElement): void;

  /** Fetch and extract document content from a URL. */
  fetchDocument(url: string, source?: string): Promise<FetchedDocument>;

  /** Analyze document context: tone, vocabulary, references, monetary signals. */
  analyzeContext(doc: FetchedDocument | { content: string } | string): ContextAnalysisResult;

  /** Detect cross-result patterns, economic density, shockwaves. */
  detectPatterns(results: SearchResult[], documents?: FetchedDocument[]): PatternResult;

  // AI Lens (v2.1)
  /** Track user interaction with a result (click, hover, dwell, scroll, zone). */
  trackInteraction(resultId: string, type: 'click' | 'hover' | 'dwell' | 'scroll' | 'zone', extra?: number | unknown): HeatmapEntry;
  /** Get all heatmap tracking data. */
  getHeatmapData(): Record<string, HeatmapEntry>;
  /** Clear all heatmap data. */
  clearHeatmap(): void;
  /** Analyze HTML page structure for vision zones. */
  analyzePageStructure(html: string): PageStructure;
  /** Weight results by multi-dimensional scoring (depth, authority, breadth, recency, engagement). */
  weightResults(results: SearchResult[], opts?: WeightOptions): WeightedResult[];
  /** Generate content from results (research-paper, pwa-spec, suggestions, board-layout). */
  generateContent(type: 'research-paper' | 'pwa-spec' | 'suggestions' | 'board-layout', results: SearchResult[], analyses?: Record<string, ContextAnalysisResult>, opts?: ContentOptions): string | unknown[] | BoardLayout | null;
  /** Compute vision zones from page structure for heatmap visualization. */
  computeVisionZones(pageStructure: PageStructure): VisionZone[];
  /** Draw a heatmap visualization on a canvas. */
  drawHeatmap(canvas: HTMLCanvasElement, zones: VisionZone[], opts?: { width?: number; height?: number }): void;

  readonly SRC_COLORS: Record<string, string>;
  readonly CONNECTORS: unknown[];
  readonly TL_SCALES: TimelineScale[];
}

export interface HeatmapEntry {
  clicks: number;
  hovers: number;
  dwellMs: number;
  scrollDepth: number;
  firstSeen: number;
  zones: unknown[];
}

export interface PageStructure {
  sections: { id: string; heading: string; level: number; subLinks: number; subImages: number }[];
  links: { href: string; text: string }[];
  images: { src: string; alt: string }[];
  headings: { level: number; text: string }[];
  forms: { action: string; inputCount: number }[];
  depth: number;
  complexity: number;
  tagCount: number;
  wordCount: number;
}

export interface WeightOptions {
  analyses?: Record<string, ContextAnalysisResult>;
  heatmap?: Record<string, HeatmapEntry>;
  goal?: 'research' | 'app-building' | 'learning' | 'promo';
}

export interface WeightedResult {
  result: SearchResult;
  id: string;
  scores: {
    total: number;
    depth: number;
    breadth: number;
    authority: number;
    recency: number;
    engagement: number;
  };
  rank: number;
}

export interface ContentOptions {
  title?: string;
  goal?: string;
  appName?: string;
  columns?: number;
}

export interface BoardLayout {
  columns: { items: { weighted: WeightedResult; estimatedHeight: number }[]; height: number }[];
  totalItems: number;
}

export interface VisionZone {
  type: 'heading' | 'image' | 'link' | 'form';
  text?: string;
  importance: number;
  position: number;
  color: string;
}

declare global {
  interface Window {
    HistorySearch: HistorySearchAPI;
  }
}

export default HistorySearchAPI;
