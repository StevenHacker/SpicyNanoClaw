import { definePluginEntry, type OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { resolveSncPluginConfig } from "./src/config.js";
import { createSncContextEngine } from "./src/engine.js";
import { isLikelyWritingPrompt, SNC_STABLE_WRITING_GUIDANCE } from "./src/prompt-guidance.js";

export default definePluginEntry({
  id: "snc",
  name: "SpicyNanoClaw",
  description: "Writing-oriented context engine for OpenClaw",
  kind: "context-engine",
  register(api: OpenClawPluginApi) {
    const config = resolveSncPluginConfig(api.pluginConfig, api.resolvePath);
    const sessionMatchers = config.sessionPatterns.flatMap((pattern) => {
      try {
        return [new RegExp(pattern, "u")];
      } catch (error) {
        api.logger.warn(
          `SNC ignored invalid sessionPatterns entry "${pattern}" (${String(error)})`,
        );
        return [];
      }
    });

    const shouldHandleSession = (sessionId?: string, sessionKey?: string): boolean => {
      if (sessionMatchers.length === 0) {
        return true;
      }
      return sessionMatchers.some(
        (matcher) =>
          (sessionId ? matcher.test(sessionId) : false) ||
          (sessionKey ? matcher.test(sessionKey) : false),
      );
    };

    api.registerContextEngine("snc", () =>
      createSncContextEngine({
        config,
        logger: api.logger,
      }),
    );

    api.on("before_prompt_build", async (event, ctx) => {
      if (
        !shouldHandleSession(ctx.sessionId, ctx.sessionKey) ||
        !isLikelyWritingPrompt(event.prompt)
      ) {
        return;
      }
      return {
        prependSystemContext: SNC_STABLE_WRITING_GUIDANCE,
      };
    });
  },
});
