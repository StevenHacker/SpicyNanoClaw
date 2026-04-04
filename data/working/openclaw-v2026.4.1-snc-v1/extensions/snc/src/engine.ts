import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type {
  ContextEngine,
  ContextEngineRuntimeContext,
  PluginLogger,
} from "openclaw/plugin-sdk";
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";
import { buildSncSectionTitle, type SncResolvedConfig } from "./config.js";
import {
  buildSncDurableMemorySection,
  harvestSncDurableMemoryEntries,
  loadSncDurableMemoryCatalog,
  persistSncDurableMemoryStore,
} from "./durable-memory.js";
import {
  buildSncSessionStateSection,
  loadSncSessionState,
  persistSncSessionState,
  type SncSessionState,
} from "./session-state.js";
import { shapeSncTranscriptMessage } from "./transcript-shaping.js";
import {
  applySncWorkerCompletionEvents,
  buildSncWorkerStateSection,
  loadSncWorkerState,
} from "./worker-state.js";

const SNC_ENGINE_VERSION = "0.1.0";
const RECENT_TRANSCRIPT_MESSAGE_WINDOW = 8;
const RECENT_DURABLE_MEMORY_MESSAGE_WINDOW = 4;
const MAX_MAINTENANCE_REWRITES = 1;
const MIN_MAINTENANCE_BYTES_SAVED = 24;
const MAX_DURABLE_MEMORY_CONTEXT_BYTES = 1_024;

type SncContextSection = {
  title: string;
  body: string;
};

type SncTranscriptRewriteRequest = Parameters<
  NonNullable<ContextEngineRuntimeContext["rewriteTranscriptEntries"]>
>[0];
type SncTranscriptRewriteReplacement = SncTranscriptRewriteRequest["replacements"][number];

type TranscriptFileEntry = {
  type?: string;
  id?: string;
  parentId?: string | null;
  message?: AgentMessage;
};

type TranscriptMessageEntry = {
  id: string;
  parentId: string | null;
  message: AgentMessage;
};

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

  return `${input.slice(0, low).trimEnd()}\n\n[truncated by SNC]`;
}

function buildSystemPromptAddition(sections: SncContextSection[]): string | undefined {
  if (sections.length === 0) {
    return undefined;
  }

  return [
    "SNC writing context follows. Prefer it when planning, drafting, and maintaining continuity.",
    ...sections.map((section) => `## ${section.title}\n${section.body}`),
  ].join("\n\n");
}

function buildSncCompactionInstructions(
  state: SncSessionState | null,
  customInstructions?: string,
): string | undefined {
  const lines: string[] = [];
  if (state?.chapterState.focus) {
    lines.push(`- current focus: ${state.chapterState.focus}`);
  }
  if (state?.chapterState.latestUserDirective) {
    lines.push(`- latest user directive: ${state.chapterState.latestUserDirective}`);
  }
  if (state?.chapterState.latestAssistantPlan) {
    lines.push(`- latest assistant plan: ${state.chapterState.latestAssistantPlan}`);
  }
  if (state?.chapterState.constraints.length) {
    lines.push(`- active constraints: ${state.chapterState.constraints.slice(0, 4).join(" | ")}`);
  }
  if (state?.storyLedger.continuityNotes.length) {
    lines.push(
      `- continuity to preserve: ${state.storyLedger.continuityNotes.slice(-3).join(" | ")}`,
    );
  }

  const baseInstructions = customInstructions?.trim();
  if (lines.length === 0) {
    return baseInstructions || undefined;
  }

  const sncBlock = clampUtf8(
    [
      "Preserve these SNC writing anchors during compaction.",
      "Keep them explicit in the resulting summary instead of flattening them into a generic recap.",
      ...lines,
    ].join("\n"),
    4_096,
  );

  return baseInstructions ? `${baseInstructions}\n\n${sncBlock}` : sncBlock;
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

function extractDurableMemoryCurrentText(messages: AgentMessage[]): string | undefined {
  const currentText = messages
    .slice(-RECENT_DURABLE_MEMORY_MESSAGE_WINDOW)
    .map((message) => extractTextContent((message as { content?: unknown }).content))
    .filter((text) => text.trim().length > 0)
    .join("\n");

  return currentText.trim().length > 0
    ? clampUtf8(currentText, MAX_DURABLE_MEMORY_CONTEXT_BYTES)
    : undefined;
}

function parseTranscriptEntries(raw: string): TranscriptFileEntry[] {
  const entries: TranscriptFileEntry[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      entries.push(JSON.parse(trimmed) as TranscriptFileEntry);
    } catch {
      // Ignore malformed transcript lines and keep maintenance conservative.
    }
  }
  return entries;
}

function listActiveBranchMessages(entries: TranscriptFileEntry[]): TranscriptMessageEntry[] {
  const sessionEntries = entries.filter(
    (entry): entry is Required<Pick<TranscriptFileEntry, "type" | "id" | "parentId">> &
      TranscriptFileEntry =>
      entry.type !== "session" && typeof entry.id === "string",
  );
  const leaf = sessionEntries.at(-1);
  if (!leaf) {
    return [];
  }

  const byId = new Map(sessionEntries.map((entry) => [entry.id, entry]));
  const branch: TranscriptMessageEntry[] = [];
  let current: TranscriptFileEntry | undefined = leaf;
  while (current) {
    if (
      current.type === "message" &&
      typeof current.id === "string" &&
      "parentId" in current &&
      current.message
    ) {
      branch.push({
        id: current.id,
        parentId: current.parentId ?? null,
        message: current.message,
      });
    }
    const parentId: string | null =
      typeof current.parentId === "string" ? current.parentId : null;
    current = parentId ? byId.get(parentId) : undefined;
  }

  return branch.reverse();
}

function collectMaintenanceReplacements(
  branchMessages: TranscriptMessageEntry[],
): SncTranscriptRewriteReplacement[] {
  if (branchMessages.length <= RECENT_TRANSCRIPT_MESSAGE_WINDOW) {
    return [];
  }

  const olderMessages = branchMessages.slice(
    0,
    branchMessages.length - RECENT_TRANSCRIPT_MESSAGE_WINDOW,
  );
  const replacements: SncTranscriptRewriteReplacement[] = [];

  for (let index = olderMessages.length - 1; index >= 0; index--) {
    const entry = olderMessages[index];
    if (entry.message.role !== "assistant") {
      continue;
    }

    const originalText = extractTextContent(entry.message.content);
    const shaped = shapeSncTranscriptMessage(entry.message, {
      maxSegments: 2,
      maxSummaryBytes: 480,
    });
    if (!shaped.shouldRewrite || !shaped.summary || !shaped.replacementMessage) {
      continue;
    }

    if (
      Buffer.byteLength(originalText, "utf8") - Buffer.byteLength(shaped.summary, "utf8") <
      MIN_MAINTENANCE_BYTES_SAVED
    ) {
      continue;
    }

    replacements.push({
      entryId: entry.id,
      message: shaped.replacementMessage,
    });

    if (replacements.length >= MAX_MAINTENANCE_REWRITES) {
      break;
    }
  }

  return replacements;
}

export class SncContextEngine implements ContextEngine {
  readonly info = {
    id: "snc",
    name: "SpicyNanoClaw",
    version: SNC_ENGINE_VERSION,
    ownsCompaction: false,
  } as const;

  private readonly warnedPaths = new Set<string>();

  constructor(
    private readonly config: SncResolvedConfig,
    private readonly logger?: PluginLogger,
  ) {}

  async ingest(_params: {
    sessionId: string;
    sessionKey?: string;
    message: AgentMessage;
    isHeartbeat?: boolean;
  }) {
    return { ingested: false as const };
  }

  async assemble(params: {
    sessionId: string;
    sessionKey?: string;
    messages: AgentMessage[];
    tokenBudget?: number;
    model?: string;
    prompt?: string;
  }) {
    const sections = await this.loadSections();
    const sessionState = await loadSncSessionState({
      stateDir: this.config.stateDir,
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
    }).catch((error) => {
      this.warnOnce(
        `state-read:${params.sessionId}`,
        `SNC session state read failed for ${params.sessionId} (${String(error)})`,
      );
      return null;
    });

    const sessionStateBody = sessionState ? buildSncSessionStateSection(sessionState) : undefined;
    if (sessionStateBody) {
      sections.push({
        title: "Session snapshot",
        body: sessionStateBody,
      });
    }

    const workerState = await loadSncWorkerState({
      stateDir: this.config.stateDir,
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
    }).catch((error) => {
      this.warnOnce(
        `worker-read:${params.sessionId}`,
        `SNC worker state read failed for ${params.sessionId} (${String(error)})`,
      );
      return null;
    });

    const workerStateBody = workerState ? buildSncWorkerStateSection(workerState) : undefined;
    if (workerStateBody) {
      sections.push({
        title: "Worker controller",
        body: workerStateBody,
      });
    }

    const durableCatalog = await loadSncDurableMemoryCatalog({
      stateDir: this.config.stateDir,
    }).catch((error) => {
      this.warnOnce(
        `durable-read:${params.sessionId}`,
        `SNC durable memory read failed for ${params.sessionId} (${String(error)})`,
      );
      return null;
    });

    const durableMemoryBody = durableCatalog
      ? buildSncDurableMemorySection({
          entries: durableCatalog,
          currentText: extractDurableMemoryCurrentText(params.messages),
          currentFocus: sessionState?.chapterState.focus,
          currentConstraints: sessionState?.chapterState.constraints,
        })
      : undefined;
    if (durableMemoryBody) {
      sections.push({
        title: "Durable memory",
        body: durableMemoryBody,
      });
    }

    return {
      messages: params.messages,
      estimatedTokens: 0,
      ...(sections.length > 0
        ? { systemPromptAddition: buildSystemPromptAddition(sections) }
        : {}),
    };
  }

  async afterTurn(params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
    messages: AgentMessage[];
    prePromptMessageCount: number;
    autoCompactionSummary?: string;
    isHeartbeat?: boolean;
    tokenBudget?: number;
    runtimeContext?: ContextEngineRuntimeContext;
  }): Promise<void> {
    let persistedState: SncSessionState | null = null;

    try {
      persistedState = await persistSncSessionState({
        stateDir: this.config.stateDir,
        sessionId: params.sessionId,
        sessionKey: params.sessionKey,
        messages: params.messages,
        prePromptMessageCount: params.prePromptMessageCount,
        autoCompactionSummary: params.autoCompactionSummary,
      });
    } catch (error) {
      this.warnOnce(
        `state-write:${params.sessionId}`,
        `SNC session state write failed for ${params.sessionId} (${String(error)})`,
      );
      return;
    }

    try {
      await applySncWorkerCompletionEvents({
        stateDir: this.config.stateDir,
        sessionId: params.sessionId,
        sessionKey: params.sessionKey,
        messages: params.messages.slice(params.prePromptMessageCount),
        updatedAt: persistedState?.updatedAt,
      });
    } catch (error) {
      this.warnOnce(
        `worker-write:${params.sessionId}`,
        `SNC worker state write failed for ${params.sessionId} (${String(error)})`,
      );
    }

    const harvestedEntries = persistedState
      ? harvestSncDurableMemoryEntries({
          sessionId: params.sessionId,
          sessionKey: params.sessionKey,
          sessionState: persistedState,
          now: persistedState.updatedAt,
        })
      : [];

    if (harvestedEntries.length === 0) {
      return;
    }

    try {
      await persistSncDurableMemoryStore({
        stateDir: this.config.stateDir,
        entries: harvestedEntries,
        now: persistedState?.updatedAt,
      });
    } catch (error) {
      this.warnOnce(
        `durable-write:${params.sessionId}`,
        `SNC durable memory write failed for ${params.sessionId} (${String(error)})`,
      );
    }
  }

  async maintain(params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
    runtimeContext?: ContextEngineRuntimeContext;
  }) {
    if (!params.runtimeContext?.rewriteTranscriptEntries) {
      return {
        changed: false,
        bytesFreed: 0,
        rewrittenEntries: 0,
        reason: "snc-maintenance-no-runtime-rewrite-helper",
      };
    }

    let branchMessages: TranscriptMessageEntry[];
    try {
      const raw = await readFile(params.sessionFile, "utf8");
      branchMessages = listActiveBranchMessages(parseTranscriptEntries(raw));
    } catch (error) {
      const reason = `snc-maintenance-read-failed:${String(error)}`;
      this.warnOnce(`maintain-read:${params.sessionId}`, `SNC maintenance read failed (${reason})`);
      return {
        changed: false,
        bytesFreed: 0,
        rewrittenEntries: 0,
        reason,
      };
    }

    const replacements = collectMaintenanceReplacements(branchMessages);
    if (replacements.length === 0) {
      return {
        changed: false,
        bytesFreed: 0,
        rewrittenEntries: 0,
        reason: "snc-maintenance-no-eligible-messages",
      };
    }

    return await params.runtimeContext.rewriteTranscriptEntries({ replacements });
  }

  async compact(params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
    tokenBudget?: number;
    force?: boolean;
    currentTokenCount?: number;
    compactionTarget?: "budget" | "threshold";
    customInstructions?: string;
    runtimeContext?: ContextEngineRuntimeContext;
  }) {
    const sessionState = await loadSncSessionState({
      stateDir: this.config.stateDir,
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
    }).catch((error) => {
      this.warnOnce(
        `compact-state-read:${params.sessionId}`,
        `SNC session state read failed during compaction for ${params.sessionId} (${String(error)})`,
      );
      return null;
    });

    const customInstructions = buildSncCompactionInstructions(
      sessionState,
      params.customInstructions,
    );

    return await delegateCompactionToRuntime({
      ...params,
      ...(customInstructions ? { customInstructions } : {}),
    });
  }

  private async loadSections(): Promise<SncContextSection[]> {
    const sections: SncContextSection[] = [];

    const orderedFiles = [
      this.config.briefFile,
      this.config.ledgerFile,
      ...this.config.packetFiles,
    ].filter((filePath): filePath is string => Boolean(filePath));

    for (const filePath of orderedFiles) {
      const section = await this.loadSectionFromFile(filePath);
      if (section) {
        sections.push(section);
      }
    }

    if (this.config.packetDir) {
      const dirSections = await this.loadSectionsFromDirectory(this.config.packetDir);
      sections.push(...dirSections);
    }

    return sections;
  }

  private async loadSectionsFromDirectory(packetDir: string): Promise<SncContextSection[]> {
    try {
      const entries = await readdir(packetDir, { withFileTypes: true });
      const candidateFiles = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => /\.(md|txt|json)$/i.test(name))
        .sort((left, right) => left.localeCompare(right, "en"));

      const sections: SncContextSection[] = [];
      for (const fileName of candidateFiles) {
        const section = await this.loadSectionFromFile(path.join(packetDir, fileName));
        if (section) {
          sections.push(section);
        }
      }
      return sections;
    } catch (error) {
      this.warnOnce(packetDir, `SNC packetDir unavailable: ${packetDir} (${String(error)})`);
      return [];
    }
  }

  private async loadSectionFromFile(filePath: string): Promise<SncContextSection | null> {
    try {
      const raw = await readFile(filePath, "utf8");
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return null;
      }

      return {
        title: buildSncSectionTitle(filePath),
        body: clampUtf8(trimmed, this.config.maxSectionBytes),
      };
    } catch (error) {
      this.warnOnce(filePath, `SNC context file unavailable: ${filePath} (${String(error)})`);
      return null;
    }
  }

  private warnOnce(key: string, message: string): void {
    if (this.warnedPaths.has(key)) {
      return;
    }
    this.warnedPaths.add(key);
    this.logger?.warn(message);
  }
}

export function createSncContextEngine(params: {
  config: SncResolvedConfig;
  logger?: PluginLogger;
}): ContextEngine {
  return new SncContextEngine(params.config, params.logger);
}
