import { definePluginEntry, type OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { resolveSncPluginConfig } from "./src/config.js";
import { installSncHookScaffold } from "./src/hook-scaffold.js";
import { createSncContextEngine } from "./src/engine.js";

export default definePluginEntry({
  id: "snc",
  name: "SpicyNanoClaw",
  description: "Writing-oriented context engine for OpenClaw",
  kind: "context-engine",
  register(api: OpenClawPluginApi) {
    const config = resolveSncPluginConfig(api.pluginConfig, api.resolvePath);

    api.registerContextEngine("snc", () =>
      createSncContextEngine({
        config,
        logger: api.logger,
      }),
    );

    installSncHookScaffold(api, config);
  },
});
