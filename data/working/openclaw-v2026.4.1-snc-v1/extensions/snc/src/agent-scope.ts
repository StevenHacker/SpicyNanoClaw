import { createHash } from "node:crypto";
import { normalizeHyphenSlug } from "openclaw/plugin-sdk/core";

export type SncAgentRole = "primary" | "helper";

export type SncResolvedAgentScope = {
  sessionId: string;
  sessionKey?: string;
  sessionScopeKey: string;
  agentKey: string;
  familyKey: string;
  role: SncAgentRole;
};

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function deriveFamilyKey(sessionId: string, sessionKey?: string): string {
  const normalizedSessionKey = normalizeOptionalString(sessionKey);
  if (!normalizedSessionKey) {
    return sessionId;
  }

  const parts = normalizedSessionKey
    .split(":")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return normalizedSessionKey;
}

function deriveAgentRole(sessionKey?: string): SncAgentRole {
  const normalizedSessionKey = normalizeOptionalString(sessionKey);
  if (!normalizedSessionKey) {
    return "primary";
  }

  const parts = normalizedSessionKey
    .split(":")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  // Only explicit structural helper lanes should count as helper scope.
  // Peer agent keys such as `agent:main:reviewer` remain primary.
  return parts.includes("subagent") ? "helper" : "primary";
}

export function resolveSncAgentScope(params: {
  sessionId: string;
  sessionKey?: string;
}): SncResolvedAgentScope {
  const sessionId = normalizeOptionalString(params.sessionId) ?? "session";
  const sessionKey = normalizeOptionalString(params.sessionKey);
  const agentKey = sessionKey ?? sessionId;
  return {
    sessionId,
    ...(sessionKey ? { sessionKey } : {}),
    sessionScopeKey: sessionKey ? `${sessionKey}#${sessionId}` : sessionId,
    agentKey,
    familyKey: deriveFamilyKey(sessionId, sessionKey),
    role: deriveAgentRole(sessionKey),
  };
}

export function buildSncScopedFilename(scopeKey: string): string {
  const slug = normalizeHyphenSlug(scopeKey.replace(/[#:|]+/g, "-")) || "session";
  const hash = createHash("sha1").update(scopeKey).digest("hex").slice(0, 10);
  return `${slug}-${hash}.json`;
}

export function buildSncAgentScopeSection(scope: SncResolvedAgentScope): string {
  const lines = [
    `role: ${scope.role}`,
    `sessionScope: ${scope.sessionScopeKey}`,
    `agentKey: ${scope.agentKey}`,
  ];
  if (scope.familyKey !== scope.agentKey) {
    lines.push(`familyKey: ${scope.familyKey}`);
  }
  lines.push(
    "Keep continuity, compaction summaries, and worker notes bound to this exact session scope.",
  );
  lines.push(
    "Do not merge sibling-agent summaries or treat helper-session residue as canonical authoring state.",
  );
  if (scope.role === "helper") {
    lines.push(
      "Helper scope: use project context as bounded reference for the current objective, not as a license to inherit the primary agent's prose lane.",
    );
  }
  return lines.map((line) => `- ${line}`).join("\n");
}
