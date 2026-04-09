import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { resolveSncPluginConfig } from "./config.js";
import {
  buildSncStyleOverlaySection,
  resolveSncStyleOverlay,
} from "./style-overlay.js";
import { detectSncOutputDiscipline, detectSncTaskPosture } from "./task-posture.js";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "snc-style-test-"));
  tempDirs.push(dir);
  return dir;
}

function message(role: "user" | "assistant", content: string): AgentMessage {
  return { role, content, timestamp: 1 } as AgentMessage;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("SNC style overlay", () => {
  it("auto-selects a built-in profile for direct writing turns", async () => {
    const config = resolveSncPluginConfig(
      {
        style: {
          enabled: true,
          mode: "auto",
        },
      },
      (input) => input,
    );
    const messages = [
      message(
        "user",
        "Continue this suspense opening. Keep the mist thick, establish ordinary order first, and let the abnormality seep in slowly.",
      ),
    ];
    const taskPosture = detectSncTaskPosture({ messages });
    const outputDiscipline = detectSncOutputDiscipline({
      messages,
      framingMode: "writing",
      taskPosture,
    });

    const overlay = await resolveSncStyleOverlay({
      config: config.style,
      framingMode: "writing",
      taskPosture,
      outputDiscipline,
      messages,
    });

    expect(overlay?.profile.profileId).toBe("mist-suspense");
    const section = buildSncStyleOverlaySection({
      overlay: overlay!,
      config: config.style,
    });
    expect(section).toContain("Taboo patterns (highest priority):");
    expect(section).toContain("Anti-manual voice:");
  });

  it("stays off during evidence-first turns", async () => {
    const config = resolveSncPluginConfig(
      {
        style: {
          enabled: true,
          mode: "auto",
        },
      },
      (input) => input,
    );
    const messages = [
      message("user", "Read the report and list the top three continuity risks according to the workspace docs."),
    ];
    const taskPosture = detectSncTaskPosture({ messages });
    const outputDiscipline = detectSncOutputDiscipline({
      messages,
      framingMode: "writing",
      taskPosture,
    });

    const overlay = await resolveSncStyleOverlay({
      config: config.style,
      framingMode: "writing",
      taskPosture,
      outputDiscipline,
      messages,
    });

    expect(taskPosture.posture).toBe("evidence-grounding");
    expect(overlay).toBeUndefined();
  });

  it("loads an external profile file in explicit profile mode", async () => {
    const root = createTempDir();
    const profileFile = path.join(root, "style.json");
    writeFileSync(
      profileFile,
      JSON.stringify({
        schema_version: "1.0",
        profile_id: "custom_misty",
        label: "Custom misty",
        safety_mode: "desensitized",
        intended_use: ["suspense"],
        inspiration_scope: {
          bucket: "mist-suspense",
          source_count: 2,
          raw_source_pack: "./raw-pack.md",
          abstraction_rule: "multi-source-archetype",
        },
        copyright_guardrails: {
          must_not_include: ["verbatim source sentences"],
          operational_prompt_fields: [
            "style_axes",
            "narrative_moves",
            "taboo_patterns",
            "prompt_fragments",
            "synthetic_examples",
            "evaluation_checks",
          ],
          research_only_fields: ["raw source links"],
        },
        style_axes: {
          narration_formality: 0.7,
          sentence_burstiness: 0.4,
          exposition_pressure: 0.2,
          subtext_density: 0.6,
          emotional_temperature: 0.5,
          dialogue_density: 0.3,
          pacing_velocity: 0.5,
          hook_frequency: 0.6,
        },
        narrative_moves: {
          openings: ["Open with stillness before fracture."],
          development: ["Let the wrong detail keep returning."],
          closers: ["Close on an unresolved disturbance."],
          dialogue_rules: ["Keep dialogue sparse."],
          sensory_bias: ["Favor damp texture and object behavior."],
          tension_mechanics: ["Delay confirmation."],
        },
        taboo_patterns: ["Do not explain first."],
        prompt_fragments: {
          style_goal: "Write as if the air knows more than the narrator says.",
          avoid: ["summary fear words"],
          steering_notes: ["Trust implication."],
        },
        synthetic_examples: [
          {
            scene_type: "opening",
            text: "The cup cooled before the room noticed.",
            why_it_works: ["Small disturbance first."],
          },
        ],
        evaluation_checks: ["Does the scene leave air inside it?"],
      }),
      "utf8",
    );

    const config = resolveSncPluginConfig(
      {
        style: {
          mode: "profile",
          profileFile,
        },
      },
      (input) => input,
    );
    const messages = [
      message("user", "Continue this passage in direct prose and do not explain first."),
    ];
    const taskPosture = detectSncTaskPosture({ messages });
    const outputDiscipline = detectSncOutputDiscipline({
      messages,
      framingMode: "writing",
      taskPosture,
    });

    const overlay = await resolveSncStyleOverlay({
      config: config.style,
      framingMode: "writing",
      taskPosture,
      outputDiscipline,
      messages,
    });

    expect(overlay?.profile.profileId).toBe("custom_misty");
  });

  it("rejects raw-source external profiles", async () => {
    const root = createTempDir();
    const profileFile = path.join(root, "raw-profile.json");
    writeFileSync(
      profileFile,
      JSON.stringify({
        schema_version: "1.0",
        profile_id: "raw_profile",
        label: "Raw profile",
        safety_mode: "raw-source",
        intended_use: ["suspense"],
        inspiration_scope: {
          bucket: "mist-suspense",
          source_count: 1,
          raw_source_pack: "./raw-pack.md",
          abstraction_rule: "multi-source-archetype",
        },
        copyright_guardrails: {
          must_not_include: ["verbatim source sentences"],
          operational_prompt_fields: [
            "style_axes",
            "narrative_moves",
            "taboo_patterns",
            "prompt_fragments",
            "synthetic_examples",
            "evaluation_checks",
          ],
          research_only_fields: ["raw source links"],
        },
        style_axes: {
          narration_formality: 0.7,
          sentence_burstiness: 0.4,
          exposition_pressure: 0.2,
          subtext_density: 0.6,
          emotional_temperature: 0.5,
          dialogue_density: 0.3,
          pacing_velocity: 0.5,
          hook_frequency: 0.6,
        },
        narrative_moves: {
          openings: ["Open with stillness before fracture."],
          development: ["Let the wrong detail keep returning."],
          closers: ["Close on an unresolved disturbance."],
          dialogue_rules: ["Keep dialogue sparse."],
          sensory_bias: ["Favor damp texture and object behavior."],
          tension_mechanics: ["Delay confirmation."],
        },
        taboo_patterns: ["Do not explain first."],
        prompt_fragments: {
          style_goal: "Raw-source donor text should never load.",
          avoid: ["summary fear words"],
          steering_notes: ["Trust implication."],
        },
        synthetic_examples: [
          {
            scene_type: "opening",
            text: "This donor-like line must never enter the runtime.",
            why_it_works: ["Small disturbance first."],
          },
        ],
        evaluation_checks: ["Does the scene leave air inside it?"],
      }),
      "utf8",
    );

    const config = resolveSncPluginConfig(
      {
        style: {
          mode: "profile",
          profileFile,
        },
      },
      (input) => input,
    );
    const messages = [message("user", "Continue this passage in direct prose.")];
    const taskPosture = detectSncTaskPosture({ messages });
    const outputDiscipline = detectSncOutputDiscipline({
      messages,
      framingMode: "writing",
      taskPosture,
    });

    const overlay = await resolveSncStyleOverlay({
      config: config.style,
      framingMode: "writing",
      taskPosture,
      outputDiscipline,
      messages,
    });

    expect(overlay).toBeUndefined();
  });

  it("rejects external profiles that lack required desensitization guardrails", async () => {
    const root = createTempDir();
    const profileFile = path.join(root, "missing-guardrails.json");
    writeFileSync(
      profileFile,
      JSON.stringify({
        schema_version: "1.0",
        profile_id: "broken_profile",
        label: "Broken profile",
        safety_mode: "desensitized",
        intended_use: ["suspense"],
        inspiration_scope: {
          bucket: "mist-suspense",
          source_count: 1,
          raw_source_pack: "./raw-pack.md",
          abstraction_rule: "multi-source-archetype",
        },
        copyright_guardrails: {
          must_not_include: ["verbatim source sentences"],
          research_only_fields: ["raw source links"],
        },
        style_axes: {
          narration_formality: 0.7,
          sentence_burstiness: 0.4,
          exposition_pressure: 0.2,
          subtext_density: 0.6,
          emotional_temperature: 0.5,
          dialogue_density: 0.3,
          pacing_velocity: 0.5,
          hook_frequency: 0.6,
        },
        narrative_moves: {
          openings: ["Open with stillness before fracture."],
          development: ["Let the wrong detail keep returning."],
          closers: ["Close on an unresolved disturbance."],
          dialogue_rules: ["Keep dialogue sparse."],
          sensory_bias: ["Favor damp texture and object behavior."],
          tension_mechanics: ["Delay confirmation."],
        },
        taboo_patterns: ["Do not explain first."],
        prompt_fragments: {
          style_goal: "This must not load without operational fields.",
          avoid: ["summary fear words"],
          steering_notes: ["Trust implication."],
        },
        synthetic_examples: [
          {
            scene_type: "opening",
            text: "This example should never surface.",
            why_it_works: ["Small disturbance first."],
          },
        ],
        evaluation_checks: ["Does the scene leave air inside it?"],
      }),
      "utf8",
    );

    const config = resolveSncPluginConfig(
      {
        style: {
          mode: "profile",
          profileFile,
        },
      },
      (input) => input,
    );
    const messages = [message("user", "Continue this passage in direct prose.")];
    const taskPosture = detectSncTaskPosture({ messages });
    const outputDiscipline = detectSncOutputDiscipline({
      messages,
      framingMode: "writing",
      taskPosture,
    });

    const overlay = await resolveSncStyleOverlay({
      config: config.style,
      framingMode: "writing",
      taskPosture,
      outputDiscipline,
      messages,
    });

    expect(overlay).toBeUndefined();
  });

  it("only renders external fields explicitly allowed by desensitized guardrails", async () => {
    const root = createTempDir();
    const profileFile = path.join(root, "guardrailed-profile.json");
    writeFileSync(
      profileFile,
      JSON.stringify({
        schema_version: "1.0",
        profile_id: "guardrailed_profile",
        label: "Guardrailed profile",
        safety_mode: "desensitized",
        intended_use: ["suspense"],
        inspiration_scope: {
          bucket: "mist-suspense",
          source_count: 2,
          raw_source_pack: "./raw-pack.md",
          abstraction_rule: "multi-source-archetype",
        },
        copyright_guardrails: {
          must_not_include: ["verbatim source sentences"],
          operational_prompt_fields: [
            "style_axes",
            "narrative_moves",
            "taboo_patterns",
            "evaluation_checks",
          ],
          research_only_fields: ["raw source links", "manual comparison notes"],
        },
        style_axes: {
          narration_formality: 0.7,
          sentence_burstiness: 0.4,
          exposition_pressure: 0.2,
          subtext_density: 0.6,
          emotional_temperature: 0.5,
          dialogue_density: 0.3,
          pacing_velocity: 0.5,
          hook_frequency: 0.6,
        },
        narrative_moves: {
          openings: ["Open with stillness before fracture."],
          development: ["Let the wrong detail keep returning."],
          closers: ["Close on an unresolved disturbance."],
          dialogue_rules: ["Keep dialogue sparse."],
          sensory_bias: ["Favor damp texture and object behavior."],
          tension_mechanics: ["Delay confirmation."],
        },
        taboo_patterns: ["Do not explain first."],
        prompt_fragments: {
          style_goal: "This donor-like goal must not be rendered.",
          avoid: ["summary fear words"],
          steering_notes: ["Trust implication."],
        },
        synthetic_examples: [
          {
            scene_type: "opening",
            text: "This donor-like example must stay out of the overlay.",
            why_it_works: ["Small disturbance first."],
          },
        ],
        evaluation_checks: ["Does the scene leave air inside it?"],
      }),
      "utf8",
    );

    const config = resolveSncPluginConfig(
      {
        style: {
          mode: "profile",
          profileFile,
        },
      },
      (input) => input,
    );
    const messages = [message("user", "Continue this passage in direct prose.")];
    const taskPosture = detectSncTaskPosture({ messages });
    const outputDiscipline = detectSncOutputDiscipline({
      messages,
      framingMode: "writing",
      taskPosture,
    });

    const overlay = await resolveSncStyleOverlay({
      config: config.style,
      framingMode: "writing",
      taskPosture,
      outputDiscipline,
      messages,
    });

    expect(overlay?.profile.profileId).toBe("guardrailed_profile");
    const section = buildSncStyleOverlaySection({
      overlay: overlay!,
      config: config.style,
    });
    expect(section).not.toContain("This donor-like goal must not be rendered.");
    expect(section).not.toContain("This donor-like example must stay out of the overlay.");
    expect(section).toContain("Taboo patterns (highest priority):");
    expect(section).toContain("Silent self-checks before finalizing:");
  });
});
