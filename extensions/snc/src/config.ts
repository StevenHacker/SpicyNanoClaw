import path from "node:path";

const DEFAULT_MAX_SECTION_BYTES = 24_576;
const MIN_MAX_SECTION_BYTES = 512;

export type SncPluginConfig = {
  briefFile?: string;
  ledgerFile?: string;
  packetFiles?: string[];
  packetDir?: string;
  stateDir?: string;
  sessionPatterns?: string[];
  maxSectionBytes?: number;
};

export type SncResolvedConfig = {
  briefFile?: string;
  ledgerFile?: string;
  packetFiles: string[];
  packetDir?: string;
  stateDir?: string;
  sessionPatterns: string[];
  maxSectionBytes: number;
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
    sessionPatterns: normalizeStringArray(raw.sessionPatterns),
    maxSectionBytes:
      typeof maxSectionBytesRaw === "number" && Number.isFinite(maxSectionBytesRaw)
        ? Math.max(MIN_MAX_SECTION_BYTES, Math.floor(maxSectionBytesRaw))
        : DEFAULT_MAX_SECTION_BYTES,
  };
}

export function buildSncSectionTitle(filePath: string): string {
  const baseName = path.basename(filePath);
  const trimmedExtension = baseName.replace(/\.[^.]+$/, "");
  const normalized = trimmedExtension.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : baseName;
}
