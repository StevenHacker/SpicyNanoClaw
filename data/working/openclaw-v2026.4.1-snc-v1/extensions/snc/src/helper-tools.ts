import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import type { Static, TSchema } from "@sinclair/typebox";
import { buildSncSectionTitle, type SncResolvedConfig } from "./config.js";
import {
  buildSncSessionStateSection,
  loadSncSessionState,
  type SncSessionState,
} from "./session-state.js";

const DEFAULT_ARTIFACT_PREVIEW_BYTES = 960;
const DEFAULT_ARTIFACT_MAX_ITEMS = 6;
const DEFAULT_SESSION_PREVIEW_BYTES = 2_048;
const DEFAULT_SESSION_PREVIEW_MESSAGES = 6;

export const SNC_HELPER_ARTIFACT_TOOL_NAME = "snc_artifact_lookup";
export const SNC_HELPER_SESSION_STATE_TOOL_NAME = "snc_session_state_projection";

export type SncOwnedArtifactKind = "brief" | "ledger" | "packet" | "packet-dir";

export type SncOwnedArtifactSource = {
  kind: SncOwnedArtifactKind;
  title: string;
  path: string;
  body: string;
  byteLength: number;
};

export type SncArtifactToolQuery = {
  query?: string;
  includeBodies?: boolean;
  maxItems?: number;
};

export type SncArtifactToolDetails = {
  ok: true;
  query?: string;
  sourceCount: number;
  matchCount: number;
  artifacts: SncOwnedArtifactSource[];
};

export type SncSessionStateToolQuery = {
  sessionId: string;
  sessionKey?: string;
  includeRecentMessages?: boolean;
  maxRecentMessages?: number;
};

export type SncSessionStateToolDetails = {
  ok: true;
  sessionId: string;
  sessionKey?: string;
  found: boolean;
  sessionState?: SncSessionState;
};

export type SncHelperToolDefinition<TParams extends TSchema, TDetails> = {
  name: string;
  label: string;
  description: string;
  promptSnippet?: string;
  promptGuidelines?: string[];
  parameters: TParams;
  execute(
    toolCallId: string,
    params: Static<TParams>,
    signal?: AbortSignal,
    onUpdate?: unknown,
    ctx?: unknown,
  ): Promise<AgentToolResult<TDetails>>;
};

export type SncHelperToolset = {
  artifactTool: SncHelperToolDefinition<typeof ArtifactQuerySchema, SncArtifactToolDetails>;
  sessionStateTool: SncHelperToolDefinition<
    typeof SessionStateQuerySchema,
    SncSessionStateToolDetails
  >;
};

const ArtifactQuerySchema = Type.Object({
  query: Type.Optional(Type.String({ minLength: 1 })),
  includeBodies: Type.Optional(Type.Boolean()),
  maxItems: Type.Optional(Type.Integer({ minimum: 1, maximum: 12 })),
});

const SessionStateQuerySchema = Type.Object({
  sessionId: Type.String({ minLength: 1 }),
  sessionKey: Type.Optional(Type.String({ minLength: 1 })),
  includeRecentMessages: Type.Optional(Type.Boolean()),
  maxRecentMessages: Type.Optional(Type.Integer({ minimum: 1, maximum: 12 })),
});

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

  return `${input.slice(0, low).trimEnd()} [truncated by SNC]`;
}

function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeQuery(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function splitIntoSections(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((line) => normalizeInlineWhitespace(line))
    .filter(Boolean);
}

function buildArtifactSource(
  kind: SncOwnedArtifactKind,
  filePath: string,
  body: string,
  maxSectionBytes: number,
): SncOwnedArtifactSource {
  return {
    kind,
    title: buildSncSectionTitle(filePath),
    path: filePath,
    body: clampUtf8(body.trim(), maxSectionBytes),
    byteLength: Buffer.byteLength(body, "utf8"),
  };
}

async function readArtifactSource(
  kind: SncOwnedArtifactKind,
  filePath: string,
  maxSectionBytes: number,
): Promise<SncOwnedArtifactSource | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    return buildArtifactSource(kind, filePath, trimmed, maxSectionBytes);
  } catch {
    return null;
  }
}

async function readPacketDirectorySources(
  packetDir: string,
  maxSectionBytes: number,
): Promise<SncOwnedArtifactSource[]> {
  try {
    const entries = await readdir(packetDir, { withFileTypes: true });
    const fileNames = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(md|txt|json)$/i.test(name))
      .sort((left, right) => left.localeCompare(right, "en"));

    const sources: SncOwnedArtifactSource[] = [];
    for (const fileName of fileNames) {
      const source = await readArtifactSource(
        "packet-dir",
        path.join(packetDir, fileName),
        maxSectionBytes,
      );
      if (source) {
        sources.push(source);
      }
    }
    return sources;
  } catch {
    return [];
  }
}

function matchesQuery(source: SncOwnedArtifactSource, query: string | undefined): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${source.kind} ${source.title} ${source.path} ${source.body}`.toLowerCase();
  return haystack.includes(query);
}

function formatArtifactSection(
  source: SncOwnedArtifactSource,
  includeBody: boolean,
  previewBytes: number,
): string {
  const preview = clampUtf8(source.body, previewBytes);
  const lines = [
    `- kind: ${source.kind}`,
    `  title: ${source.title}`,
    `  path: ${source.path}`,
    `  bytes: ${source.byteLength}`,
    ...(includeBody
      ? [`  body:`, ...splitIntoSections(source.body).map((line) => `    ${line}`)]
      : [`  preview: ${preview}`]),
  ];
  return lines.join("\n");
}

function toTextResult<TDetails>(content: string, details: TDetails): AgentToolResult<TDetails> {
  return {
    content: [{ type: "text", text: content }],
    details,
  };
}

export async function collectSncOwnedArtifactSources(
  config: Pick<SncResolvedConfig, "briefFile" | "ledgerFile" | "packetFiles" | "packetDir" | "maxSectionBytes">,
): Promise<SncOwnedArtifactSource[]> {
  const sources: SncOwnedArtifactSource[] = [];

  if (config.briefFile) {
    const source = await readArtifactSource("brief", config.briefFile, config.maxSectionBytes);
    if (source) {
      sources.push(source);
    }
  }

  if (config.ledgerFile) {
    const source = await readArtifactSource("ledger", config.ledgerFile, config.maxSectionBytes);
    if (source) {
      sources.push(source);
    }
  }

  for (const filePath of config.packetFiles) {
    const source = await readArtifactSource("packet", filePath, config.maxSectionBytes);
    if (source) {
      sources.push(source);
    }
  }

  if (config.packetDir) {
    sources.push(...(await readPacketDirectorySources(config.packetDir, config.maxSectionBytes)));
  }

  const deduped = new Map<string, SncOwnedArtifactSource>();
  for (const source of sources) {
    const key = path.resolve(source.path).toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, source);
    }
  }
  return [...deduped.values()];
}

export function buildSncArtifactTool(
  config: Pick<SncResolvedConfig, "briefFile" | "ledgerFile" | "packetFiles" | "packetDir" | "maxSectionBytes">,
): SncHelperToolDefinition<typeof ArtifactQuerySchema, SncArtifactToolDetails> {
  return {
    name: SNC_HELPER_ARTIFACT_TOOL_NAME,
    label: "SNC artifact lookup",
    description: "Read bounded excerpts from SNC-owned brief, ledger, and packet artifacts.",
    promptSnippet:
      "Use this to inspect SNC-owned brief, ledger, and packet files when you need a smaller on-demand read.",
    promptGuidelines: [
      "Prefer this for SNC-owned artifacts only.",
      "Treat the output as read-only project context.",
    ],
    parameters: ArtifactQuerySchema,
    async execute(_toolCallId, params) {
      const query = normalizeQuery((params as SncArtifactToolQuery).query);
      const includeBodies = (params as SncArtifactToolQuery).includeBodies === true;
      const maxItems = Math.max(
        1,
        Math.min(
          DEFAULT_ARTIFACT_MAX_ITEMS,
          Math.floor((params as SncArtifactToolQuery).maxItems ?? DEFAULT_ARTIFACT_MAX_ITEMS),
        ),
      );
      const availableSources = await collectSncOwnedArtifactSources(config);
      const matchedSources = availableSources.filter((source) =>
        matchesQuery(source, query),
      );
      const chosen = matchedSources.slice(0, maxItems);
      const sourceCount = availableSources.length;
      const matchCount = matchedSources.length;
      const body =
        matchCount > 0
          ? [
              "SNC artifact lookup",
              `sourceCount: ${sourceCount}`,
              `matchCount: ${matchCount}`,
              ...chosen.map((source) =>
                formatArtifactSection(source, includeBodies, DEFAULT_ARTIFACT_PREVIEW_BYTES),
              ),
            ].join("\n")
          : query
            ? `No SNC-owned artifacts matched query: ${query}`
            : "No SNC-owned artifacts were available.";

      return toTextResult(body, {
        ok: true,
        query: query ?? undefined,
        sourceCount,
        matchCount,
        artifacts: chosen,
      });
    },
  };
}

export function buildSncSessionStateTool(
  config: Pick<SncResolvedConfig, "stateDir">,
): SncHelperToolDefinition<typeof SessionStateQuerySchema, SncSessionStateToolDetails> {
  return {
    name: SNC_HELPER_SESSION_STATE_TOOL_NAME,
    label: "SNC session state projection",
    description: "Read the current SNC session-state projection for a specific session.",
    promptSnippet:
      "Use this to inspect the current SNC session-state projection without mutating host state.",
    promptGuidelines: [
      "Read-only only.",
      "Use explicit session identifiers.",
      "Prefer this when continuity anchors or recent session state matter.",
    ],
    parameters: SessionStateQuerySchema,
    async execute(_toolCallId, params) {
      const sessionId = params.sessionId.trim();
      const sessionKey = normalizeOptionalString(params.sessionKey);
      const maxRecentMessages = Math.max(
        1,
        Math.min(
          DEFAULT_SESSION_PREVIEW_MESSAGES,
          Math.floor(params.maxRecentMessages ?? DEFAULT_SESSION_PREVIEW_MESSAGES),
        ),
      );
      const sessionState = await loadSncSessionState({
        stateDir: config.stateDir,
        sessionId,
        sessionKey,
      });

      if (!sessionState) {
        return toTextResult(
          `No SNC session state found for sessionId=${sessionId}${sessionKey ? ` sessionKey=${sessionKey}` : ""}.`,
          {
            ok: true,
            sessionId,
            ...(sessionKey ? { sessionKey } : {}),
            found: false,
          },
        );
      }

      const projection = buildSncSessionStateSection(
        params.includeRecentMessages === false
          ? {
              ...sessionState,
              recentMessages: [],
            }
          : {
              ...sessionState,
              recentMessages: sessionState.recentMessages.slice(-maxRecentMessages),
            },
      );

      const body = clampUtf8(
        projection
          ? `## Session snapshot\n${projection}`
          : `SNC session state is present for sessionId=${sessionId}${sessionKey ? ` sessionKey=${sessionKey}` : ""}.`,
        DEFAULT_SESSION_PREVIEW_BYTES,
      );

      return toTextResult(body, {
        ok: true,
        sessionId,
        ...(sessionKey ? { sessionKey } : {}),
        found: true,
        sessionState,
      });
    },
  };
}

export function buildSncHelperTools(
  config: Pick<SncResolvedConfig, "briefFile" | "ledgerFile" | "packetFiles" | "packetDir" | "maxSectionBytes" | "stateDir">,
): SncHelperToolset {
  return {
    artifactTool: buildSncArtifactTool(config),
    sessionStateTool: buildSncSessionStateTool(config),
  };
}
