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
  buildSncSessionStateSection,
  loadSncSessionState,
  persistSncSessionState,
} from "./session-state.js";
import { buildSncHumanityPromptWatch } from "./humanity-lint.js";

const SNC_ENGINE_VERSION = "0.1.0";
const SNC_DYNAMIC_WRITING_GUIDANCE = [
  "SNC runtime priorities:",
  "- Treat the current scene packet as the highest-priority dynamic context.",
  "- Keep canon and continuity, but do not turn the answer into a briefing or recap.",
  "- For prose requests, privilege scene pressure, concrete detail, and protagonist agency.",
  "- If the last prose drifted toward report or meeting-note language, correct toward scene action immediately.",
  "- For revision or outline requests, follow the requested structure exactly and suppress stray prose.",
].join("\n");

type SncContextSection = {
  title: string;
  body: string;
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
    SNC_DYNAMIC_WRITING_GUIDANCE,
    ...sections.map((section) => `## ${section.title}\n${section.body}`),
  ].join("\n\n");
}

export class SncContextEngine implements ContextEngine {
  readonly info = {
    id: "snc",
    name: "SpicyNanoClaw",
    version: SNC_ENGINE_VERSION,
    ownsCompaction: false,
  } as const;

  private readonly warnedPaths = new Set<string>();
  private readonly sessionMatchers: RegExp[];

  constructor(
    private readonly config: SncResolvedConfig,
    private readonly logger?: PluginLogger,
  ) {
    this.sessionMatchers = (config.sessionPatterns ?? []).flatMap((pattern) => {
      try {
        return [new RegExp(pattern, "u")];
      } catch (error) {
        this.logger?.warn(`SNC ignored invalid sessionPatterns entry "${pattern}" (${String(error)})`);
        return [];
      }
    });
  }

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
    if (!this.shouldHandleSession(params.sessionId, params.sessionKey)) {
      return {
        messages: params.messages,
        estimatedTokens: 0,
      };
    }

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
    const humanityWatch = sessionState
      ? buildSncHumanityPromptWatch(sessionState.humanityDiagnostics)
      : undefined;
    if (humanityWatch) {
      sections.unshift({
        title: "Quality watch",
        body: humanityWatch,
      });
    }
    if (sessionStateBody) {
      sections.push({
        title: "Session snapshot",
        body: sessionStateBody,
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
    if (!this.shouldHandleSession(params.sessionId, params.sessionKey)) {
      return;
    }

    try {
      await persistSncSessionState({
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
    }
  }

  async maintain(_params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
    runtimeContext?: ContextEngineRuntimeContext;
  }) {
    return {
      changed: false,
      bytesFreed: 0,
      rewrittenEntries: 0,
      reason: "snc-maintenance-not-implemented",
    };
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
    return await delegateCompactionToRuntime(params);
  }

  private shouldHandleSession(sessionId: string, sessionKey?: string): boolean {
    if (this.sessionMatchers.length === 0) {
      return true;
    }

    return this.sessionMatchers.some(
      (matcher) => matcher.test(sessionId) || (sessionKey ? matcher.test(sessionKey) : false),
    );
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
