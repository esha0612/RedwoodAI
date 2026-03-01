import { pipeline, env, type TokenClassificationPipeline } from "@xenova/transformers";

env.cacheDir = "./.model-cache";
env.allowLocalModels = false;

export interface PiiMatch {
  type: string;
  originalValue: string;
  redactedValue: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  detectionMethod: "ner-transformer" | "pattern-regex" | "context-heuristic";
}

export interface PipelineMetrics {
  modelName: string;
  tokensProcessed: number;
  nerEntitiesFound: number;
  patternEntitiesFound: number;
  totalEntitiesFound: number;
  processingTimeMs: number;
  pipelineStages: string[];
}

let nerPipeline: TokenClassificationPipeline | null = null;
let modelLoading = false;
let modelReady = false;

export function isModelReady(): boolean {
  return modelReady;
}

export async function initNerModel(): Promise<void> {
  if (nerPipeline || modelLoading) return;
  modelLoading = true;
  try {
    console.log("[ML Pipeline] Loading NER transformer model (Xenova/bert-base-NER)...");
    nerPipeline = (await pipeline("token-classification", "Xenova/bert-base-NER", {
      quantized: true,
    })) as TokenClassificationPipeline;
    modelReady = true;
    console.log("[ML Pipeline] NER model loaded successfully - ready for inference");
  } catch (error) {
    console.error("[ML Pipeline] Failed to load NER model, falling back to pattern-only mode:", error);
    nerPipeline = null;
  } finally {
    modelLoading = false;
  }
}

const NER_ENTITY_MAP: Record<string, string> = {
  "B-PER": "name",
  "I-PER": "name",
  "B-ORG": "organization",
  "I-ORG": "organization",
  "B-LOC": "location",
  "I-LOC": "location",
  "B-MISC": "misc",
  "I-MISC": "misc",
};

async function runNerInference(text: string): Promise<PiiMatch[]> {
  if (!nerPipeline) return [];

  const findings: PiiMatch[] = [];
  try {
    const chunks = splitIntoChunks(text, 450);
    let globalOffset = 0;

    for (const chunk of chunks) {
      const results = await nerPipeline(chunk.text, { ignore_labels: [] });
      const entities = Array.isArray(results) ? results : [];

      const merged = mergeTokens(entities);

      for (const entity of merged) {
        const entityType = NER_ENTITY_MAP[entity.entity] || NER_ENTITY_MAP[entity.entity_group] || null;
        if (!entityType) continue;
        if (entityType === "name" && entity.word.length < 3) continue;
        if (entityType === "organization") continue;
        if (entityType === "location") continue;

        const cleanWord = entity.word.replace(/##/g, "").trim();
        if (!cleanWord || cleanWord.length < 2) continue;

        const startIdx = text.indexOf(cleanWord, globalOffset + (entity.start || 0));
        if (startIdx === -1) continue;

        findings.push({
          type: entityType,
          originalValue: cleanWord,
          redactedValue: `[${entityType.toUpperCase()} REDACTED]`,
          confidence: entity.score,
          startIndex: startIdx,
          endIndex: startIdx + cleanWord.length,
          detectionMethod: "ner-transformer",
        });
      }

      globalOffset += chunk.text.length;
    }
  } catch (error) {
    console.error("[ML Pipeline] NER inference error:", error);
  }

  return findings;
}

function splitIntoChunks(text: string, maxLen: number): Array<{ text: string; offset: number }> {
  const chunks: Array<{ text: string; offset: number }> = [];
  const lines = text.split("\n");
  let current = "";
  let offset = 0;

  for (const line of lines) {
    if (current.length + line.length + 1 > maxLen && current.length > 0) {
      chunks.push({ text: current, offset });
      offset += current.length;
      current = "";
    }
    current += (current ? "\n" : "") + line;
  }
  if (current) {
    chunks.push({ text: current, offset });
  }
  return chunks;
}

interface NerToken {
  entity?: string;
  entity_group?: string;
  score: number;
  word: string;
  start?: number;
  end?: number;
  index?: number;
}

function mergeTokens(tokens: NerToken[]): NerToken[] {
  const merged: NerToken[] = [];
  let current: NerToken | null = null;

  for (const token of tokens) {
    const entity = token.entity || token.entity_group || "";
    const isBegin = entity.startsWith("B-");
    const isContinue = entity.startsWith("I-");
    const baseEntity = entity.replace(/^[BI]-/, "");

    if (isBegin || (!isContinue && !current)) {
      if (current) merged.push(current);
      current = { ...token, entity_group: entity, word: token.word.replace(/^##/, "") };
    } else if (isContinue && current) {
      const currentBase = (current.entity_group || "").replace(/^[BI]-/, "");
      if (currentBase === baseEntity) {
        const sep = token.word.startsWith("##") ? "" : " ";
        current.word += sep + token.word.replace(/^##/, "");
        current.score = (current.score + token.score) / 2;
        if (token.end) current.end = token.end;
      } else {
        merged.push(current);
        current = { ...token, entity_group: entity, word: token.word.replace(/^##/, "") };
      }
    } else {
      if (current) merged.push(current);
      current = { ...token, entity_group: entity, word: token.word.replace(/^##/, "") };
    }
  }
  if (current) merged.push(current);
  return merged;
}

const PII_PATTERNS: Array<{
  type: string;
  pattern: RegExp;
  redactor: (match: string) => string;
  confidence: number;
}> = [
  {
    type: "ssn",
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    redactor: () => "[SSN REDACTED]",
    confidence: 0.97,
  },
  {
    type: "credit_card",
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    redactor: () => "[CREDIT CARD REDACTED]",
    confidence: 0.96,
  },
  {
    type: "email",
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    redactor: (match) => {
      const [, domain] = match.split("@");
      return `[EMAIL]@${domain}`;
    },
    confidence: 0.99,
  },
  {
    type: "phone",
    pattern: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    redactor: () => "[PHONE REDACTED]",
    confidence: 0.92,
  },
  {
    type: "date_of_birth",
    pattern: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    redactor: () => "[DOB REDACTED]",
    confidence: 0.88,
  },
  {
    type: "account_number",
    pattern: /\b(?:PCM|ESC|FA)-\d{4}-\d{4,8}\b/gi,
    redactor: (match) => {
      const prefix = match.split("-")[0];
      return `${prefix}-[REDACTED]`;
    },
    confidence: 0.90,
  },
  {
    type: "routing_number",
    pattern: /\b(?:routing\s*(?:number|#|no\.?)?:?\s*)(\d{9})\b/gi,
    redactor: () => "[ROUTING # REDACTED]",
    confidence: 0.93,
  },
  {
    type: "apn",
    pattern: /\bAPN:\s*[\d-]+\b/gi,
    redactor: () => "APN: [REDACTED]",
    confidence: 0.85,
  },
];

const CONTEXTUAL_NAME_PATTERNS = [
  /(?:BORROWER|Borrower|borrower|GRANTOR|Grantor|GRANTEE|Grantee):\s*([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+){1,3})/g,
  /(?:Signed|Contact|Officer):\s*([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+){1,3})/g,
];

function runPatternDetection(content: string): PiiMatch[] {
  const findings: PiiMatch[] = [];

  for (const { type, pattern, redactor, confidence } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const originalValue = match[1] || match[0];
      const redactedValue = redactor(originalValue);

      if (type === "phone" && /\b\d{4,5}\.\d{2}\b/.test(originalValue)) continue;
      if (type === "phone" && /\$[\d,]+/.test(content.substring(Math.max(0, match.index - 5), match.index))) continue;

      findings.push({
        type,
        originalValue,
        redactedValue,
        confidence,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        detectionMethod: "pattern-regex",
      });
    }
  }

  for (const namePattern of CONTEXTUAL_NAME_PATTERNS) {
    const regex = new RegExp(namePattern.source, namePattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      if (name && name.length > 3) {
        const nameStart = match.index + match[0].indexOf(name);
        findings.push({
          type: "name",
          originalValue: name,
          redactedValue: "[NAME REDACTED]",
          confidence: 0.84,
          startIndex: nameStart,
          endIndex: nameStart + name.length,
          detectionMethod: "context-heuristic",
        });
      }
    }
  }

  return findings;
}

function deduplicateFindings(findings: PiiMatch[]): PiiMatch[] {
  findings.sort((a, b) => a.startIndex - b.startIndex || b.confidence - a.confidence);

  const result: PiiMatch[] = [];
  for (const finding of findings) {
    const overlaps = result.some(
      (existing) =>
        finding.startIndex < existing.endIndex && finding.endIndex > existing.startIndex
    );
    if (!overlaps) {
      result.push(finding);
    }
  }

  return result;
}

export async function detectPii(content: string): Promise<{
  findings: PiiMatch[];
  redactedContent: string;
  metrics: PipelineMetrics;
}> {
  const startTime = Date.now();

  const [nerFindings, patternFindings] = await Promise.all([
    runNerInference(content),
    Promise.resolve(runPatternDetection(content)),
  ]);

  const allFindings = [...patternFindings, ...nerFindings];
  const deduplicated = deduplicateFindings(allFindings);

  deduplicated.sort((a, b) => b.startIndex - a.startIndex);
  let redacted = content;
  for (const finding of deduplicated) {
    redacted =
      redacted.substring(0, finding.startIndex) +
      finding.redactedValue +
      redacted.substring(finding.endIndex);
  }

  const uniqueFindings = deduplicated.filter(
    (f, i, arr) =>
      arr.findIndex(
        (x) => x.originalValue === f.originalValue && x.type === f.type
      ) === i
  );

  const processingTimeMs = Date.now() - startTime;
  const wordCount = content.split(/\s+/).length;

  const metrics: PipelineMetrics = {
    modelName: modelReady ? "Xenova/bert-base-NER (ONNX quantized)" : "Pattern-only fallback",
    tokensProcessed: wordCount,
    nerEntitiesFound: nerFindings.length,
    patternEntitiesFound: patternFindings.length,
    totalEntitiesFound: uniqueFindings.length,
    processingTimeMs,
    pipelineStages: [
      "Document Ingestion",
      "Text Tokenization",
      modelReady ? "Transformer NER Inference (BERT)" : "Pattern-Based NER (fallback)",
      "Regex Pattern Matching (SSN/CC/Phone/Email)",
      "Context-Aware Name Detection",
      "Entity Deduplication & Conflict Resolution",
      "Span-Based Redaction",
    ],
  };

  return { findings: uniqueFindings, redactedContent: redacted, metrics };
}

export function extractPropertyAddress(content: string): string | null {
  const patterns = [
    /PROPERTY\s+ADDRESS:\s*(.+?)(?:\n|$)/i,
    /Property\s+Address:\s*(.+?)(?:\n|$)/i,
    /(?:located\s+at|situated\s+at|address(?:ed)?(?:\s+at)?)\s*:?\s*(\d+\s+.+?,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2}\s+\d{5})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}
