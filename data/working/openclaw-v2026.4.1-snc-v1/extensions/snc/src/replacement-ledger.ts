import { createHash } from "node:crypto";
import type { AgentMessage } from "@mariozechner/pi-agent-core";

const LEDGER_VERSION = 1;
const DEFAULT_MAX_ENTRIES = 128;
const MAX_PREVIEW_BYTES = 240;
const EPOCH_ISO = new Date(0).toISOString();

export type SncReplacementChannel = "before_message_write" | "tool_result_persist";
export type SncReplacementAction = "keep" | "replace" | "block";

export type SncReplacementLedgerKeyInput = {
  channel: SncReplacementChannel;
  message: AgentMessage;
  sessionKey?: string;
  agentId?: string;
  toolName?: string;
  toolCallId?: string;
};

export type SncReplacementDecisionInput = SncReplacementLedgerKeyInput & {
  action: SncReplacementAction;
  classification?: string;
  replacementMessage?: AgentMessage;
  now?: string;
  maxEntries?: number;
};

export type SncReplacementLedgerEntry = {
  key: string;
  channel: SncReplacementChannel;
  action: SncReplacementAction;
  classification?: string;
  sessionKey?: string;
  agentId?: string;
  toolName?: string;
  toolCallId?: string;
  messageRole?: string;
  originalFingerprint: string;
  replacementFingerprint?: string;
  originalPreview?: string;
  replacementPreview?: string;
  hitCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SncReplacementLedger = {
  version: number;
  updatedAt: string;
  entries: SncReplacementLedgerEntry[];
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeToken(value: string | undefined): string {
  return (value ?? "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "-";
}

function clampUtf8(input: string, maxBytes: number): string {
  if (Buffer.byteLength(input, "utf8") <= maxBytes) {
    return input;
  }

  let low = 0;
  let high = input.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(input.slice(0, mid), "utf8") <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return `${input.slice(0, low).trimEnd()} [truncated]`;
}

function stableSerialize(value: unknown): string {
  if (value === undefined) {
    return "null";
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }
  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const nextValue = objectValue[key];
    if (nextValue === undefined || key === "timestamp" || key === "createdAt" || key === "updatedAt") {
      continue;
    }
    parts.push(`${JSON.stringify(key)}:${stableSerialize(nextValue)}`);
  }
  return `{${parts.join(",")}}`;
}

function toFingerprint(value: unknown): string {
  return createHash("sha1").update(stableSerialize(value)).digest("hex");
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      const type = (part as { type?: unknown }).type;
      const text = (part as { text?: unknown }).text;
      return type === "text" && typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildMessagePreview(message: AgentMessage): string | undefined {
  const text = extractTextContent((message as { content?: unknown }).content).trim();
  if (text) {
    return clampUtf8(text, MAX_PREVIEW_BYTES);
  }
  const content = (message as { content?: unknown }).content;
  if (content === undefined) {
    return undefined;
  }
  return clampUtf8(stableSerialize(content), MAX_PREVIEW_BYTES);
}

function fingerprintMessage(message: AgentMessage): string {
  return toFingerprint({
    role: (message as { role?: unknown }).role,
    content: (message as { content?: unknown }).content,
  });
}

function normalizeLedgerEntry(value: unknown): SncReplacementLedgerEntry | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const key = normalizeOptionalString((value as { key?: unknown }).key);
  const channel = (value as { channel?: unknown }).channel;
  const action = (value as { action?: unknown }).action;
  const originalFingerprint = normalizeOptionalString(
    (value as { originalFingerprint?: unknown }).originalFingerprint,
  );
  const hitCountRaw = (value as { hitCount?: unknown }).hitCount;
  const createdAt = normalizeOptionalString((value as { createdAt?: unknown }).createdAt) ?? EPOCH_ISO;
  const updatedAt = normalizeOptionalString((value as { updatedAt?: unknown }).updatedAt) ?? createdAt;

  if (
    !key ||
    (channel !== "before_message_write" && channel !== "tool_result_persist") ||
    (action !== "keep" && action !== "replace" && action !== "block") ||
    !originalFingerprint
  ) {
    return undefined;
  }

  return {
    key,
    channel,
    action,
    classification: normalizeOptionalString((value as { classification?: unknown }).classification),
    sessionKey: normalizeOptionalString((value as { sessionKey?: unknown }).sessionKey),
    agentId: normalizeOptionalString((value as { agentId?: unknown }).agentId),
    toolName: normalizeOptionalString((value as { toolName?: unknown }).toolName),
    toolCallId: normalizeOptionalString((value as { toolCallId?: unknown }).toolCallId),
    messageRole: normalizeOptionalString((value as { messageRole?: unknown }).messageRole),
    originalFingerprint,
    replacementFingerprint: normalizeOptionalString(
      (value as { replacementFingerprint?: unknown }).replacementFingerprint,
    ),
    originalPreview: normalizeOptionalString((value as { originalPreview?: unknown }).originalPreview),
    replacementPreview: normalizeOptionalString(
      (value as { replacementPreview?: unknown }).replacementPreview,
    ),
    hitCount:
      typeof hitCountRaw === "number" && Number.isFinite(hitCountRaw) && hitCountRaw > 0
        ? Math.floor(hitCountRaw)
        : 1,
    createdAt,
    updatedAt,
  };
}

function normalizeLedger(value: unknown): SncReplacementLedger {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createSncReplacementLedger(EPOCH_ISO);
  }
  const entriesRaw = (value as { entries?: unknown }).entries;
  const entries = Array.isArray(entriesRaw)
    ? entriesRaw
        .map((entry) => normalizeLedgerEntry(entry))
        .filter((entry): entry is SncReplacementLedgerEntry => Boolean(entry))
    : [];

  return {
    version:
      typeof (value as { version?: unknown }).version === "number"
        ? (value as { version: number }).version
        : LEDGER_VERSION,
    updatedAt: normalizeOptionalString((value as { updatedAt?: unknown }).updatedAt) ?? EPOCH_ISO,
    entries,
  };
}

export function createSncReplacementLedger(now = new Date().toISOString()): SncReplacementLedger {
  return {
    version: LEDGER_VERSION,
    updatedAt: now,
    entries: [],
  };
}

export function buildSncReplacementLedgerKey(input: SncReplacementLedgerKeyInput): string {
  const scopeHash = toFingerprint({
    channel: input.channel,
    sessionKey: input.sessionKey,
    agentId: input.agentId,
    toolName: input.toolName,
    toolCallId: input.toolCallId,
  }).slice(0, 12);

  if (input.toolCallId) {
    return [
      "tool",
      normalizeToken(input.toolName),
      normalizeToken(input.toolCallId),
      scopeHash,
    ].join(":");
  }

  return [
    "message",
    normalizeToken(typeof input.message.role === "string" ? input.message.role : undefined),
    fingerprintMessage(input.message).slice(0, 16),
    scopeHash,
  ].join(":");
}

export function findSncReplacementDecision(
  ledger: SncReplacementLedger,
  input: string | SncReplacementLedgerKeyInput,
): SncReplacementLedgerEntry | undefined {
  const normalizedLedger = normalizeLedger(ledger);
  if (typeof input === "string") {
    return normalizedLedger.entries.find((entry) => entry.key === input);
  }

  const key = buildSncReplacementLedgerKey(input);
  const fingerprint = fingerprintMessage(input.message);
  return normalizedLedger.entries.find(
    (entry) => entry.key === key && entry.originalFingerprint === fingerprint,
  );
}

export function recordSncReplacementDecision(
  ledger: SncReplacementLedger,
  input: SncReplacementDecisionInput,
): SncReplacementLedger {
  const normalizedLedger = normalizeLedger(ledger);
  const now = input.now ?? new Date().toISOString();
  const key = buildSncReplacementLedgerKey(input);
  const originalFingerprint = fingerprintMessage(input.message);
  const replacementFingerprint = input.replacementMessage
    ? fingerprintMessage(input.replacementMessage)
    : undefined;
  const existingIndex = normalizedLedger.entries.findIndex((entry) => entry.key === key);
  const existingEntry = existingIndex >= 0 ? normalizedLedger.entries[existingIndex] : undefined;

  const nextEntry: SncReplacementLedgerEntry = {
    key,
    channel: input.channel,
    action: input.action,
    classification: normalizeOptionalString(input.classification),
    sessionKey: normalizeOptionalString(input.sessionKey),
    agentId: normalizeOptionalString(input.agentId),
    toolName: normalizeOptionalString(input.toolName),
    toolCallId: normalizeOptionalString(input.toolCallId),
    messageRole: typeof input.message.role === "string" ? input.message.role : undefined,
    originalFingerprint,
    replacementFingerprint,
    originalPreview: buildMessagePreview(input.message),
    replacementPreview: input.replacementMessage
      ? buildMessagePreview(input.replacementMessage)
      : undefined,
    hitCount: (existingEntry?.hitCount ?? 0) + 1,
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now,
  };

  const nextEntries =
    existingIndex >= 0
      ? normalizedLedger.entries.map((entry, index) => (index === existingIndex ? nextEntry : entry))
      : [...normalizedLedger.entries, nextEntry];
  const maxEntries = Math.max(1, Math.floor(input.maxEntries ?? DEFAULT_MAX_ENTRIES));

  return {
    version: LEDGER_VERSION,
    updatedAt: now,
    entries: nextEntries.slice(-maxEntries),
  };
}

export function serializeSncReplacementLedger(ledger: SncReplacementLedger): string {
  return `${JSON.stringify(normalizeLedger(ledger), null, 2)}\n`;
}

export function parseSncReplacementLedger(raw: string | null | undefined): SncReplacementLedger {
  if (!raw?.trim()) {
    return createSncReplacementLedger(EPOCH_ISO);
  }
  try {
    return normalizeLedger(JSON.parse(raw) as unknown);
  } catch {
    return createSncReplacementLedger(EPOCH_ISO);
  }
}
