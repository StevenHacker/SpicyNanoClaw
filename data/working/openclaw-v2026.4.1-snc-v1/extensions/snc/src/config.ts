import path from "node:path";

const DEFAULT_MAX_SECTION_BYTES = 24_576;
const MIN_MAX_SECTION_BYTES = 512;
const DEFAULT_SPECIALIZATION_MODE = "auto" as const;
const DEFAULT_DURABLE_MEMORY_MAX_CATALOG_ENTRIES = 64;
const MIN_DURABLE_MEMORY_MAX_CATALOG_ENTRIES = 1;
const DEFAULT_DURABLE_MEMORY_STALE_ENTRY_DAYS = 30;
const MIN_DURABLE_MEMORY_STALE_ENTRY_DAYS = 1;
const DEFAULT_DURABLE_MEMORY_PROJECTION_LIMIT = 3;
const MIN_DURABLE_MEMORY_PROJECTION_LIMIT = 1;
const DEFAULT_DURABLE_MEMORY_PROJECTION_MINIMUM_SCORE = 3;
const MIN_DURABLE_MEMORY_PROJECTION_MINIMUM_SCORE = 0;
const DEFAULT_HOOK_MAX_REWRITES_PER_SESSION = 6;
const MIN_HOOK_MAX_REWRITES_PER_SESSION = 1;
const DEFAULT_HOOK_MAX_REPLACEMENT_BYTES = 768;
const MIN_HOOK_MAX_REPLACEMENT_BYTES = 160;
const DEFAULT_HOOK_MAX_TOOL_RESULT_BYTES = 2_048;
const MIN_HOOK_MAX_TOOL_RESULT_BYTES = 256;
const DEFAULT_HOOK_TARGETS = [
  "before_message_write",
  "tool_result_persist",
  "session_end",
  "subagent_spawned",
  "subagent_ended",
] as const;

export type SncHookTarget = (typeof DEFAULT_HOOK_TARGETS)[number];

export type SncPluginHookConfig = {
  enabled?: boolean;
  targets?: SncHookTarget[];
  maxRewritesPerSession?: number;
  maxReplacementBytes?: number;
  maxToolResultBytes?: number;
};

export type SncSpecializationMode = "auto" | "writing" | "general";

export type SncPluginDurableMemoryConfig = {
  maxCatalogEntries?: number;
  staleEntryDays?: number;
  projectionLimit?: number;
  projectionMinimumScore?: number;
};

export type SncPluginConfig = {
  briefFile?: string;
  ledgerFile?: string;
  packetFiles?: string[];
  packetDir?: string;
  stateDir?: string;
  memoryNamespace?: string;
  specializationMode?: SncSpecializationMode;
  durableMemory?: SncPluginDurableMemoryConfig;
  maxSectionBytes?: number;
  hooks?: SncPluginHookConfig;
};

export type SncResolvedHookConfig = {
  enabled: boolean;
  targets: SncHookTarget[];
  maxRewritesPerSession: number;
  maxReplacementBytes: number;
  maxToolResultBytes: number;
};

export type SncResolvedConfig = {
  briefFile?: string;
  ledgerFile?: string;
  packetFiles: string[];
  packetDir?: string;
  stateDir?: string;
  memoryNamespace?: string;
  specializationMode: SncSpecializationMode;
  durableMemory: {
    maxCatalogEntries: number;
    staleEntryDays: number;
    projectionLimit: number;
    projectionMinimumScore: number;
  };
  maxSectionBytes: number;
  hooks: SncResolvedHookConfig;
};

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry));

  return Array.from(new Set(normalized));
}

function resolveOptionalPath(
  value: unknown,
  resolvePath: (input: string) => string,
): string | undefined {
  const normalized = normalizeString(value);
  return normalized ? resolvePath(normalized) : undefined;
}

function resolvePathList(value: unknown, resolvePath: (input: string) => string): string[] {
  return Array.from(new Set(normalizeStringArray(value).map((entry) => resolvePath(entry))));
}

function normalizeHookTarget(value: unknown): SncHookTarget | undefined {
  if (
    value === "before_message_write" ||
    value === "tool_result_persist" ||
    value === "session_end" ||
    value === "subagent_spawned" ||
    value === "subagent_ended"
  ) {
    return value;
  }
  return undefined;
}

function normalizeHookTargetList(value: unknown): SncHookTarget[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = value
    .map((entry) => normalizeHookTarget(entry))
    .filter((entry): entry is SncHookTarget => Boolean(entry));
  return Array.from(new Set(normalized));
}

function normalizeBoundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(minimum, Math.floor(value));
}

function resolveSpecializationMode(value: unknown): SncSpecializationMode {
  return value === "writing" || value === "general" ? value : DEFAULT_SPECIALIZATION_MODE;
}

function resolveHookConfig(value: unknown): SncResolvedHookConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      enabled: false,
      targets: [],
      maxRewritesPerSession: DEFAULT_HOOK_MAX_REWRITES_PER_SESSION,
      maxReplacementBytes: DEFAULT_HOOK_MAX_REPLACEMENT_BYTES,
      maxToolResultBytes: DEFAULT_HOOK_MAX_TOOL_RESULT_BYTES,
    };
  }

  const hookConfig = value as {
    enabled?: unknown;
    targets?: unknown;
    maxRewritesPerSession?: unknown;
    maxReplacementBytes?: unknown;
    maxToolResultBytes?: unknown;
  };
  const enabled = hookConfig.enabled === true;
  const hasTargets = Object.prototype.hasOwnProperty.call(value, "targets");
  const normalizedTargets = normalizeHookTargetList(hookConfig.targets);
  const targets = enabled ? (hasTargets ? normalizedTargets : [...DEFAULT_HOOK_TARGETS]) : [];

  return {
    enabled,
    targets,
    maxRewritesPerSession: normalizeBoundedInteger(
      hookConfig.maxRewritesPerSession,
      DEFAULT_HOOK_MAX_REWRITES_PER_SESSION,
      MIN_HOOK_MAX_REWRITES_PER_SESSION,
    ),
    maxReplacementBytes: normalizeBoundedInteger(
      hookConfig.maxReplacementBytes,
      DEFAULT_HOOK_MAX_REPLACEMENT_BYTES,
      MIN_HOOK_MAX_REPLACEMENT_BYTES,
    ),
    maxToolResultBytes: normalizeBoundedInteger(
      hookConfig.maxToolResultBytes,
      DEFAULT_HOOK_MAX_TOOL_RESULT_BYTES,
      MIN_HOOK_MAX_TOOL_RESULT_BYTES,
    ),
  };
}

function resolveDurableMemoryConfig(
  value: unknown,
): SncResolvedConfig["durableMemory"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      maxCatalogEntries: DEFAULT_DURABLE_MEMORY_MAX_CATALOG_ENTRIES,
      staleEntryDays: DEFAULT_DURABLE_MEMORY_STALE_ENTRY_DAYS,
      projectionLimit: DEFAULT_DURABLE_MEMORY_PROJECTION_LIMIT,
      projectionMinimumScore: DEFAULT_DURABLE_MEMORY_PROJECTION_MINIMUM_SCORE,
    };
  }

  const durableMemory = value as {
    maxCatalogEntries?: unknown;
    staleEntryDays?: unknown;
    projectionLimit?: unknown;
    projectionMinimumScore?: unknown;
  };

  return {
    maxCatalogEntries: normalizeBoundedInteger(
      durableMemory.maxCatalogEntries,
      DEFAULT_DURABLE_MEMORY_MAX_CATALOG_ENTRIES,
      MIN_DURABLE_MEMORY_MAX_CATALOG_ENTRIES,
    ),
    staleEntryDays: normalizeBoundedInteger(
      durableMemory.staleEntryDays,
      DEFAULT_DURABLE_MEMORY_STALE_ENTRY_DAYS,
      MIN_DURABLE_MEMORY_STALE_ENTRY_DAYS,
    ),
    projectionLimit: normalizeBoundedInteger(
      durableMemory.projectionLimit,
      DEFAULT_DURABLE_MEMORY_PROJECTION_LIMIT,
      MIN_DURABLE_MEMORY_PROJECTION_LIMIT,
    ),
    projectionMinimumScore: normalizeBoundedInteger(
      durableMemory.projectionMinimumScore,
      DEFAULT_DURABLE_MEMORY_PROJECTION_MINIMUM_SCORE,
      MIN_DURABLE_MEMORY_PROJECTION_MINIMUM_SCORE,
    ),
  };
}

export function resolveSncPluginConfig(
  value: Record<string, unknown> | undefined,
  resolvePath: (input: string) => string,
): SncResolvedConfig {
  const raw = value ?? {};
  const maxSectionBytesRaw = raw.maxSectionBytes;

  return {
    briefFile: resolveOptionalPath(raw.briefFile, resolvePath),
    ledgerFile: resolveOptionalPath(raw.ledgerFile, resolvePath),
    packetFiles: resolvePathList(raw.packetFiles, resolvePath),
    packetDir: resolveOptionalPath(raw.packetDir, resolvePath),
    stateDir: resolveOptionalPath(raw.stateDir, resolvePath),
    memoryNamespace: normalizeString(raw.memoryNamespace),
    specializationMode: resolveSpecializationMode(raw.specializationMode),
    durableMemory: resolveDurableMemoryConfig(raw.durableMemory),
    maxSectionBytes:
      typeof maxSectionBytesRaw === "number" && Number.isFinite(maxSectionBytesRaw)
        ? Math.max(MIN_MAX_SECTION_BYTES, Math.floor(maxSectionBytesRaw))
        : DEFAULT_MAX_SECTION_BYTES,
    hooks: resolveHookConfig(raw.hooks),
  };
}

export function buildSncSectionTitle(filePath: string): string {
  const baseName = path.basename(filePath);
  const trimmedExtension = baseName.replace(/\.[^.]+$/, "");
  const normalized = trimmedExtension.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : baseName;
}
