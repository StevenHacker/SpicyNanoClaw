import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type {
  ContextEngine,
  ContextEngineRuntimeContext,
  PluginLogger,
} from "openclaw/plugin-sdk";
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";
import {
  buildSncSectionTitle,
  type SncResolvedConfig,
  type SncSpecializationMode,
} from "./config.js";
import {
  buildSncDurableMemoryDiagnosticsSection,
  buildSncDurableMemorySection,
  harvestSncDurableMemoryEntries,
  loadSncDurableMemoryCatalog,
  persistSncDurableMemoryStore,
  resolveSncDurableMemoryNamespace,
} from "./durable-memory.js";
import {
  buildSncEvidenceCurrentSupportSection,
  buildSncEvidenceHistoricalSupportSection,
  buildSncSessionStateSection,
  loadSncSessionState,
  persistSncSessionState,
  type SncSessionState,
} from "./session-state.js";
import {
  buildSncOutputDisciplineSection,
  buildSncTaskPostureSection,
  detectSncOutputDiscipline,
  detectSncTaskPosture,
  resolveSncEvidenceAwareProjectionPolicy,
  type SncOutputDisciplineContext,
  type SncTaskPostureContext,
} from "./task-posture.js";
import {
  buildSncStyleOverlaySection,
  resolveSncStyleOverlay,
} from "./style-overlay.js";
import { shapeSncTranscriptMessage } from "./transcript-shaping.js";
import {
  applySncWorkerLaunchIntent,
  buildSncWorkerLaunchSection,
} from "./worker-launch-intent.js";
import { buildSncWorkerDiagnosticsSection } from "./worker-diagnostics.js";
import {
  applySncWorkerCompletionEvents,
  buildSncWorkerStateSection,
  loadSncWorkerState,
} from "./worker-state.js";

const SNC_ENGINE_VERSION = "1.0.0";
const RECENT_TRANSCRIPT_MESSAGE_WINDOW = 8;
const RECENT_DURABLE_MEMORY_MESSAGE_WINDOW = 4;
const MAX_MAINTENANCE_REWRITES = 1;
const MIN_MAINTENANCE_BYTES_SAVED = 24;
const MAX_DURABLE_MEMORY_CONTEXT_BYTES = 1_024;
const MIN_SECTION_BODY_BYTES = 96;
const MIN_BUDGET_NOTE_BYTES = 160;
const SNC_TRUNCATION_MARKER = "\n\n[truncated by SNC]";

type SncContextSection = {
  title: string;
  body: string;
  budgetClass: "critical" | "standard" | "shrink-first";
  budgetGroup?: "packet-dir" | "diagnostics";
};

type SncRuntimeFramingMode = Exclude<SncSpecializationMode, "auto">;

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

  if (maxBytes <= 0) {
    return "";
  }

  const markerBytes = Buffer.byteLength(SNC_TRUNCATION_MARKER, "utf8");
  if (maxBytes <= markerBytes) {
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
    return input.slice(0, low).trimEnd();
  }

  const contentBudget = maxBytes - markerBytes;
  let low = 0;
  let high = input.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(input.slice(0, mid), "utf8") <= contentBudget) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const head = input.slice(0, low).trimEnd();
  const truncated = `${head}${SNC_TRUNCATION_MARKER}`;
  return Buffer.byteLength(truncated, "utf8") <= maxBytes
    ? truncated
    : clampUtf8(head, maxBytes - markerBytes) + SNC_TRUNCATION_MARKER;
}

function renderSncContextSection(section: SncContextSection): string {
  return `## ${section.title}\n${section.body}`;
}

function measureSncSectionBytes(section: SncContextSection): number {
  return Buffer.byteLength(renderSncContextSection(section), "utf8");
}

function withClampedSectionBody(
  section: SncContextSection,
  maxBodyBytes: number,
): SncContextSection {
  return {
    ...section,
    body: clampUtf8(section.body, maxBodyBytes),
  };
}

function resolvePacketDirBudget(maxBytes: number): number {
  return Math.max(512, Math.min(Math.floor(maxBytes * 0.35), 6_144));
}

function resolveDiagnosticsBudget(maxBytes: number): number {
  return Math.max(384, Math.min(Math.floor(maxBytes * 0.18), 1_536));
}

function applySncGroupBudgets(
  sections: SncContextSection[],
  maxBytes: number,
): { sections: SncContextSection[]; notes: string[] } {
  const packetDirBudget = resolvePacketDirBudget(maxBytes);
  const diagnosticsBudget = resolveDiagnosticsBudget(maxBytes);
  const packetDirSections = sections.filter((section) => section.budgetGroup === "packet-dir");
  const diagnosticsSections = sections.filter((section) => section.budgetGroup === "diagnostics");
  const sectionIndexes = new Map(sections.map((section, index) => [section, index]));
  const replacements = new Map<number, SncContextSection>();
  const omittedIndexes = new Set<number>();
  const notes: string[] = [];

  const applyGroupBudget = (
    groupSections: SncContextSection[],
    budget: number,
    omittedLabel: string,
  ) => {
    let consumed = 0;
    let omitted = 0;
    for (const section of groupSections) {
      const index = sectionIndexes.get(section);
      if (index === undefined) {
        continue;
      }
      const currentBytes = measureSncSectionBytes(section);
      if (consumed + currentBytes <= budget) {
        consumed += currentBytes;
        continue;
      }

      const remaining = budget - consumed;
      if (remaining >= MIN_SECTION_BODY_BYTES && !replacements.has(index)) {
        const truncated = withClampedSectionBody(section, remaining);
        replacements.set(index, truncated);
        consumed += measureSncSectionBytes(truncated);
      } else {
        omittedIndexes.add(index);
        omitted += 1;
      }
    }
    if (omitted > 0) {
      notes.push(`${omitted} ${omittedLabel} omitted by SNC section budget.`);
    }
  };

  applyGroupBudget(packetDirSections, packetDirBudget, "packet-dir section(s)");
  applyGroupBudget(diagnosticsSections, diagnosticsBudget, "diagnostics section(s)");

  return {
    sections: sections
      .map((section, index) => replacements.get(index) ?? section)
      .filter((_, index) => !omittedIndexes.has(index)),
    notes,
  };
}

function fitSncSectionsToBudget(
  sections: SncContextSection[],
  maxBytes: number,
): SncContextSection[] {
  const afterGroupBudgets = applySncGroupBudgets(sections, maxBytes);
  const working = [...afterGroupBudgets.sections];
  const notes = [...afterGroupBudgets.notes];
  const totalBytes = () =>
    working.reduce((sum, section) => sum + measureSncSectionBytes(section), 0);

  while (totalBytes() > maxBytes) {
    const shrinkIndex = [...working.keys()]
      .reverse()
      .find((index) => working[index]?.budgetClass === "shrink-first");
    if (shrinkIndex === undefined) {
      break;
    }
    const removed = working.splice(shrinkIndex, 1)[0];
    notes.push(`${removed.title} omitted by SNC section budget.`);
  }

  while (totalBytes() > maxBytes) {
    const clampIndex = [...working.keys()]
      .reverse()
      .find(
        (index) =>
          working[index]?.budgetClass !== "critical" &&
          Buffer.byteLength(working[index]!.body, "utf8") > MIN_SECTION_BODY_BYTES,
      );
    if (clampIndex === undefined) {
      break;
    }
    const overflow = totalBytes() - maxBytes;
    const current = working[clampIndex]!;
    const bodyBytes = Buffer.byteLength(current.body, "utf8");
    const targetBodyBytes = Math.max(MIN_SECTION_BODY_BYTES, bodyBytes - overflow - 48);
    working[clampIndex] = withClampedSectionBody(current, targetBodyBytes);
  }

  if (notes.length > 0) {
    const budgetNotesSection: SncContextSection = {
      title: "SNC budget notes",
      body: clampUtf8(
        ["SNC trimmed optional context to keep higher-trust sections alive.", ...notes]
          .map((line) => `- ${line}`)
          .join("\n"),
        Math.max(MIN_BUDGET_NOTE_BYTES, Math.min(768, Math.floor(maxBytes * 0.16))),
      ),
      budgetClass: "shrink-first",
      budgetGroup: "diagnostics",
    };
    working.push(budgetNotesSection);
    while (totalBytes() > maxBytes) {
      const shrinkFirstNonNotesIndex = [...working.keys()]
        .reverse()
        .find(
          (index) =>
            working[index]?.budgetClass === "shrink-first" &&
            working[index]?.title !== "SNC budget notes",
        );
      if (shrinkFirstNonNotesIndex !== undefined) {
        const removed = working.splice(shrinkFirstNonNotesIndex, 1)[0];
        notes.push(`${removed.title} omitted to preserve SNC budget notes.`);
        continue;
      }

      const removableStandardIndex = [...working.keys()]
        .reverse()
        .find(
          (index) =>
            working[index]?.title !== "SNC budget notes" &&
            working[index]?.budgetClass === "standard",
        );
      if (removableStandardIndex !== undefined) {
        const removed = working.splice(removableStandardIndex, 1)[0];
        notes.push(`${removed.title} omitted to preserve SNC budget notes.`);
        continue;
      }

      const clampIndex = [...working.keys()]
        .reverse()
        .find(
          (index) =>
            working[index]?.title !== "SNC budget notes" &&
            working[index]?.budgetClass !== "critical" &&
            Buffer.byteLength(working[index]!.body, "utf8") > MIN_SECTION_BODY_BYTES,
        );
      if (clampIndex !== undefined) {
        const overflow = totalBytes() - maxBytes;
        const current = working[clampIndex]!;
        const bodyBytes = Buffer.byteLength(current.body, "utf8");
        const targetBodyBytes = Math.max(MIN_SECTION_BODY_BYTES, bodyBytes - overflow - 48);
        working[clampIndex] = withClampedSectionBody(current, targetBodyBytes);
        continue;
      }

      const removableIndex = [...working.keys()]
        .reverse()
        .find((index) => working[index]?.title === "SNC budget notes");
      if (removableIndex === undefined) {
        break;
      }
      working.splice(removableIndex, 1);
      break;
    }
  }

  return working;
}

function buildSystemPromptAddition(
  sections: SncContextSection[],
  framingMode: SncRuntimeFramingMode,
  taskPosture: SncTaskPostureContext,
  outputDiscipline: SncOutputDisciplineContext,
  maxBytes: number,
): string | undefined {
  if (sections.length === 0) {
    return undefined;
  }

  const intro = (() => {
    if (taskPosture.posture === "evidence-grounding") {
      return "SNC evidence-grounding context follows. When the user asks you to read, inspect, compare, or list from current materials, prioritize those materials first and treat continuity as secondary support.";
    }
    if (framingMode === "writing" && outputDiscipline.mode === "writing-prose") {
      return "SNC writing context follows. This turn looks like direct drafting, so deliver clean prose first and keep process chatter out unless the user explicitly asks for it.";
    }
    return framingMode === "writing"
      ? "SNC writing context follows. Prefer it when drafting, revising, and maintaining continuity."
      : "SNC continuity context follows. Use it to preserve active instructions, continuity, and worker results across turns.";
  })();

  const introBytes = Buffer.byteLength(intro, "utf8");
  const sectionBudget = Math.max(MIN_SECTION_BODY_BYTES, maxBytes - introBytes - 2);
  const budgetedSections = fitSncSectionsToBudget(sections, sectionBudget);

  return [
    intro,
    ...budgetedSections.map((section) => renderSncContextSection(section)),
  ].join("\n\n");
}

function buildSncCompactionInstructions(
  state: SncSessionState | null,
  framingMode: SncRuntimeFramingMode,
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
      framingMode === "writing"
        ? "Preserve these SNC writing anchors during compaction."
        : "Preserve these SNC continuity anchors during compaction.",
      "Keep them explicit in the resulting summary instead of flattening them into a generic recap.",
      ...lines,
    ].join("\n"),
    4_096,
  );

  return baseInstructions ? `${baseInstructions}\n\n${sncBlock}` : sncBlock;
}

function hasWritingArtifacts(config: SncResolvedConfig): boolean {
  return Boolean(
    config.briefFile ||
      config.ledgerFile ||
      config.packetDir ||
      config.packetFiles.length > 0,
  );
}

function resolveSncRuntimeFramingMode(config: SncResolvedConfig): SncRuntimeFramingMode {
  if (config.specializationMode === "writing" || config.specializationMode === "general") {
    return config.specializationMode;
  }
  return hasWritingArtifacts(config) ? "writing" : "general";
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
    const framingMode = resolveSncRuntimeFramingMode(this.config);
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

    const taskPosture = detectSncTaskPosture({
      messages: params.messages,
      sessionState,
    });
    const taskPostureBody = buildSncTaskPostureSection(taskPosture);
    if (taskPostureBody) {
      sections.push({
        title: "Task posture",
        body: taskPostureBody,
        budgetClass: "critical",
      });
    }
    const outputDiscipline = detectSncOutputDiscipline({
      messages: params.messages,
      sessionState,
      framingMode,
      taskPosture,
    });
    const outputDisciplineBody = buildSncOutputDisciplineSection(outputDiscipline);
    if (outputDisciplineBody) {
      sections.push({
        title: "Writing output discipline",
        body: outputDisciplineBody,
        budgetClass: "critical",
      });
    }
    const styleOverlay = await resolveSncStyleOverlay({
      config: this.config.style,
      framingMode,
      taskPosture,
      outputDiscipline,
      messages: params.messages,
    }).catch((error) => {
      this.warnOnce(
        `style-read:${params.sessionId}`,
        `SNC style profile read failed for ${params.sessionId} (${String(error)})`,
      );
      return undefined;
    });
    if (styleOverlay) {
      sections.push({
        title: "Writing style overlay",
        body: buildSncStyleOverlaySection({
          overlay: styleOverlay,
          config: this.config.style,
        }),
        budgetClass: "standard",
      });
    }

    if (sessionState) {
      if (taskPosture.posture === "evidence-grounding") {
        const currentSupportBody = buildSncEvidenceCurrentSupportSection(sessionState);
        if (currentSupportBody) {
          sections.push({
            title: "Current-task support",
            body: currentSupportBody,
            budgetClass: "critical",
          });
        }

        const historicalSupportBody = buildSncEvidenceHistoricalSupportSection(sessionState);
        if (historicalSupportBody) {
          sections.push({
            title: "Historical continuity support",
            body: historicalSupportBody,
            budgetClass: "shrink-first",
          });
        }
      } else {
        const sessionStateBody = buildSncSessionStateSection(sessionState, {
          mode: outputDiscipline.mode === "writing-prose" ? "writing-prose" : "continuity",
        });
        if (sessionStateBody) {
          sections.push({
            title: "Session snapshot",
            body: sessionStateBody,
            budgetClass: "critical",
          });
        }
      }
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

    const workerLaunchBody = workerState
      ? buildSncWorkerLaunchSection(workerState, sessionState)
      : undefined;
    if (workerLaunchBody) {
      sections.push({
        title: "Worker launch lane",
        body: workerLaunchBody,
        budgetClass: "standard",
      });
    }

    const workerDiagnosticsBody = workerState
      ? buildSncWorkerDiagnosticsSection(workerState)
      : undefined;
    if (workerDiagnosticsBody) {
      sections.push({
        title: "Worker diagnostics",
        body: workerDiagnosticsBody,
        budgetClass: "shrink-first",
        budgetGroup: "diagnostics",
      });
    }

    const workerStateBody = workerState ? buildSncWorkerStateSection(workerState) : undefined;
    if (workerStateBody) {
      sections.push({
        title: "Worker controller",
        body: workerStateBody,
        budgetClass: "standard",
      });
    }

    const durableCatalog = await loadSncDurableMemoryCatalog({
      stateDir: this.config.stateDir,
      namespace: this.resolveDurableMemoryNamespace(params.sessionId, params.sessionKey),
    }).catch((error) => {
      this.warnOnce(
        `durable-read:${params.sessionId}`,
        `SNC durable memory read failed for ${params.sessionId} (${String(error)})`,
      );
      return null;
    });

    const durableProjectionPolicy = resolveSncEvidenceAwareProjectionPolicy(taskPosture, {
      limit: this.config.durableMemory.projectionLimit,
      minimumScore: this.config.durableMemory.projectionMinimumScore,
    });
    const durableMemoryBody = durableCatalog
      ? buildSncDurableMemorySection({
          entries: durableCatalog,
          currentText: extractDurableMemoryCurrentText(params.messages),
          currentFocus: sessionState?.chapterState.focus,
          currentConstraints: sessionState?.chapterState.constraints,
          limit: durableProjectionPolicy.limit,
          minimumScore: durableProjectionPolicy.minimumScore,
        })
      : undefined;
    if (durableMemoryBody) {
      sections.push({
        title: "Durable memory",
        body: durableMemoryBody,
        budgetClass: "standard",
      });
    }

    const durableMemoryDiagnosticsBody = durableCatalog
      ? buildSncDurableMemoryDiagnosticsSection({
          entries: durableCatalog,
          currentText: extractDurableMemoryCurrentText(params.messages),
          currentFocus: sessionState?.chapterState.focus,
          currentConstraints: sessionState?.chapterState.constraints,
          limit: durableProjectionPolicy.limit,
          minimumScore: durableProjectionPolicy.minimumScore,
          now: durableCatalog.updatedAt,
          staleEntryDays: this.config.durableMemory.staleEntryDays,
        })
      : undefined;
    if (durableMemoryDiagnosticsBody) {
      sections.push({
        title: "Durable memory diagnostics",
        body: durableMemoryDiagnosticsBody,
        budgetClass: "shrink-first",
        budgetGroup: "diagnostics",
      });
    }

    return {
      messages: params.messages,
      estimatedTokens: 0,
      ...(sections.length > 0
        ? {
            systemPromptAddition: buildSystemPromptAddition(
              sections,
              framingMode,
              taskPosture,
              outputDiscipline,
              this.config.maxSectionBytes,
            ),
          }
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

    let workerState = null;
    try {
      workerState = await applySncWorkerCompletionEvents({
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

    if (persistedState) {
      try {
        workerState = await applySncWorkerLaunchIntent({
          stateDir: this.config.stateDir,
          sessionId: params.sessionId,
          sessionKey: params.sessionKey,
          sessionState: persistedState,
          existingState: workerState,
          now: persistedState.updatedAt,
        });
      } catch (error) {
        this.warnOnce(
          `worker-launch-write:${params.sessionId}`,
          `SNC worker launch intent write failed for ${params.sessionId} (${String(error)})`,
        );
      }
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
        namespace: this.resolveDurableMemoryNamespace(params.sessionId, params.sessionKey),
        entries: harvestedEntries,
        now: persistedState?.updatedAt,
        maxCatalogEntries: this.config.durableMemory.maxCatalogEntries,
        staleEntryDays: this.config.durableMemory.staleEntryDays,
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
    const framingMode = resolveSncRuntimeFramingMode(this.config);
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
      framingMode,
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
      const budgetClass =
        filePath === this.config.briefFile || filePath === this.config.ledgerFile
          ? "critical"
          : "standard";
      const section = await this.loadSectionFromFile(filePath, {
        budgetClass,
      });
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
        const section = await this.loadSectionFromFile(path.join(packetDir, fileName), {
          budgetClass: "shrink-first",
          budgetGroup: "packet-dir",
        });
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

  private async loadSectionFromFile(
    filePath: string,
    budget: Pick<SncContextSection, "budgetClass" | "budgetGroup">,
  ): Promise<SncContextSection | null> {
    try {
      const raw = await readFile(filePath, "utf8");
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return null;
      }

      return {
        title: buildSncSectionTitle(filePath),
        body: clampUtf8(trimmed, this.config.maxSectionBytes),
        budgetClass: budget.budgetClass,
        ...(budget.budgetGroup ? { budgetGroup: budget.budgetGroup } : {}),
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

  private resolveDurableMemoryNamespace(sessionId: string, sessionKey?: string): string | undefined {
    return resolveSncDurableMemoryNamespace({
      sessionId,
      sessionKey,
      configuredNamespace: this.config.memoryNamespace,
    });
  }
}

export function createSncContextEngine(params: {
  config: SncResolvedConfig;
  logger?: PluginLogger;
}): ContextEngine {
  return new SncContextEngine(params.config, params.logger);
}
