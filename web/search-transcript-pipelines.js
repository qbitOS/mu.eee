/**
 * beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}
 * Transcript → wire brief — multi-pass prompts for Mμ / Gemini / Mistral (paste after OCR or upload).
 * Load after mueee-mu-context.js; optional: wire into Mμ agent UI.
 */
(function (root) {
  'use strict';

  var PIPELINE_VERSION = '1';

  /** Phase 1: clean raw ASR without summarizing. */
  var PHASE_JANITOR = [
    'Role: You are a Professional News Transcript Editor.',
    'Task: Clean the provided raw transcript of verbal filler and noise.',
    'Rules:',
    '- Remove fillers: um, uh, like, you know, I mean unless quoted.',
    '- Fix false starts: keep only the completed thought.',
    '- If speaker labels exist (Speaker 1/2), prefer REPORTER: / SOURCE: / names when clear.',
    '- Strict fidelity: do NOT summarize yet; keep every factual claim and direct quote.',
    '- Optional: maintain a timestamp at each topic change if timestamps exist in input.',
    '',
    'Input transcript:',
    '{{TRANSCRIPT}}'
  ].join('\n');

  /** Phase 2: news brief. */
  var PHASE_WIRE_BRIEF = [
    'Role: You are a Senior Editor at a global news wire.',
    'Task: Create a ~200-word News Brief from the CLEANED transcript below.',
    'Structure:',
    '- Headline: 10 words or fewer, active voice.',
    '- The Lede: one sentence for the top development.',
    '- Key Facts: 3–5 bullets (names, dates, numbers, locations).',
    '- Verified Quote: one high-impact direct quote.',
    '- Context: 1–2 sentences on why this matters now.',
    '- Tone: neutral, objective, urgent; avoid hype adjectives.',
    '- Optional: Note if topic momentum or entity visibility matters — cross-check with regional Google Trends or public creator stats (e.g. Social Blade) when relevant.',
    '',
    'Optional: Return JSON with keys headline, lede, bullet_points, quote, context.',
    '',
    'Cleaned transcript:',
    '{{CLEANED}}'
  ].join('\n');

  /** Phase 3: audit summary vs source. */
  var PHASE_FACTCHECK = [
    'Role: Fact-checker.',
    'Task: Audit the News Brief against the ORIGINAL raw transcript.',
    'Checks:',
    '- Names, dates, numbers must match the source.',
    '- Flag missing qualifiers (allegedly, unconfirmed).',
    '- List contradictions between brief and source.',
    '',
    'News Brief:',
    '{{BRIEF}}',
    '',
    'Original raw transcript:',
    '{{TRANSCRIPT}}'
  ].join('\n');

  /** Short-form / TikTok-style: verbatim + diarization hint. */
  var PROMPT_VERBATIM_DIARIZED = [
    'Transcribe audio verbatim. Preserve fillers and interruptions unless asked to omit.',
    'Use [MM:SS] at each speaker turn. Label Speaker 1, Speaker 2, or names if known.',
    'Include [brackets] for non-speech: [music], [laughter], [noise].',
    '',
    '{{TRANSCRIPT_OR_MEDIA}}'
  ].join('\n');

  function fill(tpl, vars) {
    vars = vars || {};
    var out = String(tpl);
    Object.keys(vars).forEach(function (k) {
      out = out.split('{{' + k + '}}').join(vars[k] != null ? String(vars[k]) : '');
    });
    return out;
  }

  root.MueeeTranscriptPipelines = {
    version: PIPELINE_VERSION,
    PHASE_JANITOR: PHASE_JANITOR,
    PHASE_WIRE_BRIEF: PHASE_WIRE_BRIEF,
    PHASE_FACTCHECK: PHASE_FACTCHECK,
    PROMPT_VERBATIM_DIARIZED: PROMPT_VERBATIM_DIARIZED,
    fill: fill,
    buildJanitor: function (transcript) {
      return fill(PHASE_JANITOR, { TRANSCRIPT: transcript });
    },
    buildWireBrief: function (cleaned) {
      return fill(PHASE_WIRE_BRIEF, { CLEANED: cleaned });
    },
    buildFactcheck: function (brief, rawTranscript) {
      return fill(PHASE_FACTCHECK, { BRIEF: brief, TRANSCRIPT: rawTranscript });
    }
  };
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : this);
