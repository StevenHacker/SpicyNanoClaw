import { describe, expect, it } from "vitest";
import { resolveSncAgentScope } from "./agent-scope.js";

describe("SNC agent scope", () => {
  it("keeps peer reviewer agent keys on the primary lane", () => {
    const scope = resolveSncAgentScope({
      sessionId: "session-reviewer-1",
      sessionKey: "agent:main:reviewer",
    });

    expect(scope.role).toBe("primary");
    expect(scope.agentKey).toBe("agent:main:reviewer");
    expect(scope.sessionScopeKey).toBe("agent:main:reviewer#session-reviewer-1");
  });

  it("treats explicit subagent lanes as helper scope", () => {
    const scope = resolveSncAgentScope({
      sessionId: "session-helper-1",
      sessionKey: "agent:main:subagent:child-7",
    });

    expect(scope.role).toBe("helper");
  });
});
