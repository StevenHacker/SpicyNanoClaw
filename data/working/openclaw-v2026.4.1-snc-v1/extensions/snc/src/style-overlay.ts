import { readFile } from "node:fs/promises";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { SncResolvedConfig } from "./config.js";
import type { SncOutputDisciplineContext, SncTaskPostureContext } from "./task-posture.js";

type SncStyleAxes = {
  narrationFormality: number;
  sentenceBurstiness: number;
  expositionPressure: number;
  subtextDensity: number;
  emotionalTemperature: number;
  dialogueDensity: number;
  pacingVelocity: number;
  hookFrequency: number;
};

export type SncStyleProfile = {
  profileId: string;
  label: string;
  styleAxes: SncStyleAxes;
  narrativeMoves: {
    openings: string[];
    development: string[];
    closers: string[];
    dialogueRules: string[];
    sensoryBias: string[];
    tensionMechanics: string[];
  };
  tabooPatterns: string[];
  promptFragments: {
    styleGoal: string;
    avoid: string[];
    steeringNotes: string[];
  };
  syntheticExamples: Array<{
    sceneType: string;
    text: string;
    whyItWorks: string[];
  }>;
  evaluationChecks: string[];
};

export type SncResolvedStyleOverlay = {
  profile: SncStyleProfile;
  source: "builtin-auto" | "builtin-explicit" | "external-profile";
  operationalPromptFields: readonly SncStyleOperationalPromptField[];
};

type SncStyleOperationalPromptField =
  | "style_axes"
  | "narrative_moves"
  | "taboo_patterns"
  | "prompt_fragments"
  | "synthetic_examples"
  | "evaluation_checks";

const ALL_OPERATIONAL_PROMPT_FIELDS: readonly SncStyleOperationalPromptField[] = [
  "style_axes",
  "narrative_moves",
  "taboo_patterns",
  "prompt_fragments",
  "synthetic_examples",
  "evaluation_checks",
];

const OPERATIONAL_PROMPT_FIELD_SET = new Set<string>(ALL_OPERATIONAL_PROMPT_FIELDS);

type SncCoercedExternalProfile = {
  profile: SncStyleProfile;
  operationalPromptFields: readonly SncStyleOperationalPromptField[];
};

const STYLE_AUTO_PATTERNS: Array<{ profileId: string; patterns: RegExp[] }> = [
  {
    profileId: "mist-suspense",
    patterns: [
      /\b(mist|fog|mystery|suspense|uncanny|weird|horror|dread)\b/i,
      /(?:\u60ac\u7591|\u8be1\u5f02|\u602a\u6838|\u602a\u8c08|\u96fe\u611f|\u9634\u51b7|\u4e0d\u5b89|\u5f02\u6837)/u,
    ],
  },
  {
    profileId: "streetwise-banter",
    patterns: [
      /\b(banter|snark|streetwise|youthful|hot-blooded|dialogue-heavy)\b/i,
      /(?:\u5634\u8d2b|\u6597\u5634|\u8d2b\u5634|\u673a\u7075|\u70ed\u8840|\u5c11\u5e74|\u63d2\u79d1\u6253\u8be8|\u5634\u786c)/u,
    ],
  },
  {
    profileId: "bustling-intrigue",
    patterns: [
      /\b(ensemble|bustling|intrigue|market|teahouse|social maneuvering)\b/i,
      /(?:\u7fa4\u50cf|\u70ed\u95f9|\u4eba\u60c5|\u5e02\u4e95|\u671d\u5802|\u63a2\u6848|\u573a\u5b50|\u6765\u4e8b|\u4eba\u60c5\u4e16\u6545)/u,
    ],
  },
  {
    profileId: "pressure-escalation",
    patterns: [
      /\b(escalation|pressure|breakthrough|upgrade|showdown)\b/i,
      /(?:\u5347\u7ea7|\u6253\u8138|\u538b\u8feb|\u51b2\u5173|\u5b88\u4f4f|\u51b2\u8fc7\u53bb|\u7ffb\u76d8|\u53d8\u5f3a|\u9ad8\u538b)/u,
    ],
  },
];

export const BUILTIN_STYLE_PROFILES: Record<string, SncStyleProfile> = {
  "mist-suspense": {
    profileId: "mist-suspense",
    label: "Mist suspense",
    styleAxes: {
      narrationFormality: 0.72,
      sentenceBurstiness: 0.38,
      expositionPressure: 0.14,
      subtextDensity: 0.78,
      emotionalTemperature: 0.42,
      dialogueDensity: 0.24,
      pacingVelocity: 0.43,
      hookFrequency: 0.74,
    },
    narrativeMoves: {
      openings: [
        "Build ordinary order first, then let one hairline abnormality disturb it.",
        "Open through space, objects, weather, or routine labor before naming danger.",
      ],
      development: [
        "Advance setting through concrete details instead of lecture blocks.",
        "Let readers notice the wrongness before the narrator explains it.",
      ],
      closers: ["End on a small fresh disturbance instead of a solved explanation."],
      dialogueRules: [
        "Keep dialogue sparse and slightly misaligned, as if people feel the air change before admitting it.",
      ],
      sensoryBias: [
        "Favor touch, dampness, light, texture, and object behavior over abstract fear words.",
      ],
      tensionMechanics: ["Delay confirmation.", "Let repetition of minor details create dread."],
    },
    tabooPatterns: [
      "Do not explain the setting before the scene starts breathing.",
      "Do not announce terror or mystery in summary language.",
      "Do not pile up jargon to fake atmosphere.",
      "Do not close paragraphs with meaning statements.",
    ],
    promptFragments: {
      styleGoal:
        "Write with calm intelligence and restrained unease. Let ordinary order hold the page for a beat, then let the wrongness seep out through detail instead of declared judgment.",
      avoid: ["manual-style setup", "recap voice", "meaning-first commentary"],
      steeringNotes: [
        "Prefer detail over interpretation.",
        "Hold back the answer for half a beat longer than feels comfortable.",
      ],
    },
    syntheticExamples: [
      {
        sceneType: "opening",
        text:
          "The milkman had already knocked on three doors before dawn properly arrived. When the bucket brushed the stone step, the hollow sound came back too quickly, like someone inside had answered for the house. The curtain did not move. There was no lamp behind the crack of the door. After he walked on, the handle turned half a circle by itself, then stopped.",
        whyItWorks: [
          "Ordinary labor comes first, abnormality second.",
          "The scene trusts object behavior more than overt fear words.",
        ],
      },
    ],
    evaluationChecks: [
      "Does the scene smell wrong before it explains why?",
      "Did detail carry the tension more than commentary?",
      "Does the ending leave a hook instead of a diagnosis?",
    ],
  },
  "streetwise-banter": {
    profileId: "streetwise-banter",
    label: "Streetwise banter",
    styleAxes: {
      narrationFormality: 0.24,
      sentenceBurstiness: 0.71,
      expositionPressure: 0.1,
      subtextDensity: 0.46,
      emotionalTemperature: 0.74,
      dialogueDensity: 0.78,
      pacingVelocity: 0.82,
      hookFrequency: 0.68,
    },
    narrativeMoves: {
      openings: [
        "Cut in on live dialogue or friction instead of prefacing the scene.",
        "Use one charged line to plant the speaker's momentum immediately.",
      ],
      development: [
        "Let teasing relieve pressure without erasing the stakes.",
        "Move from quick mouth to real cost in one turn.",
      ],
      closers: ["End on a hard, short reaction instead of a moral."],
      dialogueRules: ["Characters should interrupt, deflect, and bluff differently from one another."],
      sensoryBias: [
        "Favor breath, sweat, posture, glances, and hand movement over motivational declarations.",
      ],
      tensionMechanics: ["Let humor and danger exist in the same breath."],
    },
    tabooPatterns: [
      "Do not make every character sound like the same smartmouth.",
      "Do not turn dialogue into a joke showcase.",
      "Do not write heat as slogans.",
      "Do not make the cast sound like high-performing good students.",
    ],
    promptFragments: {
      styleGoal:
        "Write with quick reflexes, sly humor, and youthful nerve. Let dialogue feel alive, overlapping, and defensive, while the real pressure stays under the grin.",
      avoid: ["teacher voice", "performative cleverness", "clean motivational messaging"],
      steeringNotes: [
        "Jokes should come out of relationship, not stand-up rhythm.",
        "When the moment turns real, stop playing half a step earlier than expected.",
      ],
    },
    syntheticExamples: [
      {
        sceneType: "dialogue",
        text:
          "\"Why are you shaking?\" He glanced at the other boy's white knuckles, even though his own throat had tightened first. \"The door hasn't opened yet and you've already donated your soul. That's generous of you.\" \"You're not scared?\" \"Of course I am.\" He spun the knife once against his palm and grinned like the answer had insulted him. \"But running would be embarrassing forever.\"",
        whyItWorks: [
          "Fear and swagger coexist.",
          "The exchange stays active instead of explanatory.",
        ],
      },
    ],
    evaluationChecks: [
      "Do characters sound distinct while interrupting each other?",
      "Did the banter carry pressure instead of dissolving it?",
      "Did the scene avoid slogans and school-report phrasing?",
    ],
  },
  "bustling-intrigue": {
    profileId: "bustling-intrigue",
    label: "Bustling intrigue",
    styleAxes: {
      narrationFormality: 0.31,
      sentenceBurstiness: 0.63,
      expositionPressure: 0.16,
      subtextDensity: 0.49,
      emotionalTemperature: 0.68,
      dialogueDensity: 0.72,
      pacingVelocity: 0.77,
      hookFrequency: 0.64,
    },
    narrativeMoves: {
      openings: [
        "Begin with public space, heat, movement, or crowd reaction.",
        "Let side characters warm the air before the protagonist speaks.",
      ],
      development: [
        "Advance intrigue, humor, and social positioning in the same scene.",
        "Give side characters mouths and motives instead of using them as furniture.",
      ],
      closers: ["Leave a fresh social hook, debt, or rumor at the end."],
      dialogueRules: ["Keep the scene communal and reactive, not hero-only."],
      sensoryBias: ["Favor crowd noise, tea steam, footsteps, sleeves, glances, and table movement."],
      tensionMechanics: ["Tie problem-solving to face, favor, gossip, and relationship costs."],
    },
    tabooPatterns: [
      "Do not turn cases into reports.",
      "Do not let the protagonist monopolize the whole stage.",
      "Do not reduce ensemble scenes to functional lines.",
      "Do not leave only punchlines without human warmth.",
    ],
    promptFragments: {
      styleGoal:
        "Write with social heat and ensemble motion. Let humor, pressure, and human relationship move together so the scene feels lived in, not filed and summarized.",
      avoid: ["investigation report voice", "hero-only spotlighting", "functional crowd extras"],
      steeringNotes: [
        "Good scene energy should come from relationship traffic.",
        "Keep the room alive around the main beat.",
      ],
    },
    syntheticExamples: [
      {
        sceneType: "entry",
        text:
          "The moment he stepped through the gate, the idlers under the corridor all turned together, as neatly as if someone had rehearsed them. One man coughed into his sleeve. Another pretended tea required urgent supervision. The meanest one had already dragged his stool half a foot forward for a better view. He cursed them silently, then smiled first. \"You all look free enough that I should start charging admission.\"",
        whyItWorks: [
          "The crowd generates the heat before the protagonist acts.",
          "Human texture and intrigue arrive together.",
        ],
      },
    ],
    evaluationChecks: [
      "Did the scene feel occupied by more than one living agenda?",
      "Did humor and plot move together?",
      "Did the prose avoid case-report stiffness?",
    ],
  },
  "pressure-escalation": {
    profileId: "pressure-escalation",
    label: "Pressure escalation",
    styleAxes: {
      narrationFormality: 0.33,
      sentenceBurstiness: 0.75,
      expositionPressure: 0.12,
      subtextDensity: 0.34,
      emotionalTemperature: 0.79,
      dialogueDensity: 0.42,
      pacingVelocity: 0.9,
      hookFrequency: 0.79,
    },
    narrativeMoves: {
      openings: [
        "Start with a live objective and an immediate pressure clock.",
        "Make the cost visible fast instead of foreshadowing it abstractly.",
      ],
      development: [
        "Every scene should solve one local problem while exposing a larger one.",
        "Bind escalation to sacrifice, risk, or protection instead of empty hype.",
      ],
      closers: ["End on the next pressure threshold, not on a recap."],
      dialogueRules: ["Keep lines short, decisive, and physically grounded under pressure."],
      sensoryBias: ["Favor pulse, impact, breath, wounds, footing, and environmental strain."],
      tensionMechanics: [
        "Convert urgency into action choice, not summary statements.",
        "Make every gain drag a new cost behind it.",
      ],
    },
    tabooPatterns: [
      "Do not substitute tables, levels, or labels for drama.",
      "Do not repeat generic tension language.",
      "Do not shout heat without attaching cost.",
      "Do not pause for strategic recap while momentum is climbing.",
    ],
    promptFragments: {
      styleGoal:
        "Write with forward pull. Let every beat move toward a harder threshold, and let the scene earn force through cost, action, and pressure instead of strategy commentary.",
      avoid: ["system-report escalation", "empty hype", "progress-log narration"],
      steeringNotes: [
        "Tie every rise in pressure to a bodily or relational consequence.",
        "Do not let momentum collapse into explanation.",
      ],
    },
    syntheticExamples: [
      {
        sceneType: "escalation",
        text:
          "By the time the list hit the wall, the corridor had already gone quiet enough to hear paper breathe. Third second, someone ran. Fifth second, three trunks had been overturned and a window latch snapped open. He did not move. He only stared at the mark stamped beside his name until it stopped looking like honor and started looking like a countdown. Whatever came next, only the ones who could tear that mark off alive would get to call this a victory.",
        whyItWorks: [
          "Pressure is concrete and immediate.",
          "Momentum rises without collapsing into slogan or report voice.",
        ],
      },
    ],
    evaluationChecks: [
      "Did each beat push the scene forward?",
      "Was the pressure embodied instead of summarized?",
      "Did the ending point to the next threshold rather than explaining the last one?",
    ],
  },
};

function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractMessageText(message: AgentMessage): string {
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") {
    return normalizeInlineWhitespace(content);
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      return (part as { type?: unknown }).type === "text" &&
        typeof (part as { text?: unknown }).text === "string"
        ? normalizeInlineWhitespace((part as { text: string }).text)
        : "";
    })
    .filter(Boolean)
    .join(" ");
}

function collectCurrentTurnUserText(messages: AgentMessage[]): string {
  const texts: string[] = [];
  let foundCurrentTurn = false;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }
    if (message.role === "user") {
      const text = extractMessageText(message);
      if (text) {
        texts.push(text);
      }
      foundCurrentTurn = true;
      continue;
    }
    if (foundCurrentTurn) {
      break;
    }
  }
  return texts.reverse().join(" ");
}

function clampList<T>(items: T[], count: number): T[] {
  return items.slice(0, Math.max(0, count));
}

function scalarLabel(value: number): "low" | "medium" | "high" {
  if (value >= 0.67) return "high";
  if (value <= 0.33) return "low";
  return "medium";
}

function buildAxisSummary(profile: SncStyleProfile): string[] {
  return [
    `- Narration formality: ${scalarLabel(profile.styleAxes.narrationFormality)}.`,
    `- Exposition pressure: ${scalarLabel(profile.styleAxes.expositionPressure)}.`,
    `- Dialogue density: ${scalarLabel(profile.styleAxes.dialogueDensity)}.`,
    `- Pacing velocity: ${scalarLabel(profile.styleAxes.pacingVelocity)}.`,
    `- Emotional temperature: ${scalarLabel(profile.styleAxes.emotionalTemperature)}.`,
    `- Hook frequency: ${scalarLabel(profile.styleAxes.hookFrequency)}.`,
  ];
}

function readStringList(input: unknown): string[] {
  return Array.isArray(input)
    ? input
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => normalizeInlineWhitespace(entry))
        .filter(Boolean)
    : [];
}

function readOperationalPromptFieldList(input: unknown): SncStyleOperationalPromptField[] | undefined {
  const values = readStringList(input);
  if (values.length === 0) {
    return undefined;
  }

  const deduped: SncStyleOperationalPromptField[] = [];
  for (const value of values) {
    if (!OPERATIONAL_PROMPT_FIELD_SET.has(value)) {
      return undefined;
    }
    if (!deduped.includes(value as SncStyleOperationalPromptField)) {
      deduped.push(value as SncStyleOperationalPromptField);
    }
  }
  return deduped;
}

function coerceExternalProfile(value: unknown): SncCoercedExternalProfile | undefined {
  const source =
    Array.isArray(value) && value.length > 0 && typeof value[0] === "object" ? value[0] : value;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const profile = source as Record<string, unknown>;
  const profileId =
    typeof profile.profile_id === "string"
      ? profile.profile_id
      : typeof profile.profileId === "string"
        ? profile.profileId
        : undefined;
  const schemaVersion = typeof profile.schema_version === "string" ? profile.schema_version : undefined;
  const safetyMode = typeof profile.safety_mode === "string" ? profile.safety_mode : undefined;
  const intendedUse = readStringList(profile.intended_use ?? profile.intendedUse);
  const inspirationScope =
    profile.inspiration_scope && typeof profile.inspiration_scope === "object" &&
      !Array.isArray(profile.inspiration_scope)
      ? (profile.inspiration_scope as Record<string, unknown>)
      : undefined;
  const copyrightGuardrails =
    profile.copyright_guardrails && typeof profile.copyright_guardrails === "object" &&
      !Array.isArray(profile.copyright_guardrails)
      ? (profile.copyright_guardrails as Record<string, unknown>)
      : undefined;
  const mustNotInclude = readStringList(copyrightGuardrails?.must_not_include);
  const operationalPromptFields = readOperationalPromptFieldList(
    copyrightGuardrails?.operational_prompt_fields,
  );
  const researchOnlyFields = readStringList(copyrightGuardrails?.research_only_fields);

  if (
    !profileId ||
    schemaVersion !== "1.0" ||
    safetyMode !== "desensitized" ||
    intendedUse.length === 0 ||
    !inspirationScope ||
    typeof inspirationScope.bucket !== "string" ||
    typeof inspirationScope.source_count !== "number" ||
    !Number.isInteger(inspirationScope.source_count) ||
    inspirationScope.source_count < 1 ||
    typeof inspirationScope.raw_source_pack !== "string" ||
    (inspirationScope.abstraction_rule !== "author-agnostic" &&
      inspirationScope.abstraction_rule !== "multi-source-archetype") ||
    mustNotInclude.length === 0 ||
    !operationalPromptFields ||
    researchOnlyFields.length === 0
  ) {
    return undefined;
  }
  const styleAxesInput = profile.style_axes ?? profile.styleAxes;
  const narrativeMovesInput = profile.narrative_moves ?? profile.narrativeMoves;
  const promptFragmentsInput = profile.prompt_fragments ?? profile.promptFragments;
  if (
    !styleAxesInput || typeof styleAxesInput !== "object" || Array.isArray(styleAxesInput) ||
    !narrativeMovesInput || typeof narrativeMovesInput !== "object" || Array.isArray(narrativeMovesInput) ||
    !promptFragmentsInput || typeof promptFragmentsInput !== "object" || Array.isArray(promptFragmentsInput)
  ) {
    return undefined;
  }
  const styleAxes = styleAxesInput as Record<string, unknown>;
  const narrativeMoves = narrativeMovesInput as Record<string, unknown>;
  const promptFragments = promptFragmentsInput as Record<string, unknown>;
  const numeric = (valueAt: unknown, fallback: number) =>
    typeof valueAt === "number" && Number.isFinite(valueAt) ? valueAt : fallback;
  const styleGoalRaw = promptFragments.style_goal ?? promptFragments.styleGoal;
  if (typeof styleGoalRaw !== "string") {
    return undefined;
  }
  const rawExamples = profile.synthetic_examples ?? profile.syntheticExamples;
  const parsedNarrativeMoves = {
    openings: readStringList(narrativeMoves.openings),
    development: readStringList(narrativeMoves.development),
    closers: readStringList(narrativeMoves.closers),
    dialogueRules: readStringList(narrativeMoves.dialogue_rules ?? narrativeMoves.dialogueRules),
    sensoryBias: readStringList(narrativeMoves.sensory_bias ?? narrativeMoves.sensoryBias),
    tensionMechanics: readStringList(narrativeMoves.tension_mechanics ?? narrativeMoves.tensionMechanics),
  };
  const parsedPromptFragments = {
    styleGoal: normalizeInlineWhitespace(styleGoalRaw),
    avoid: readStringList(promptFragments.avoid),
    steeringNotes: readStringList(promptFragments.steering_notes ?? promptFragments.steeringNotes),
  };
  const parsedSyntheticExamples = Array.isArray(rawExamples)
    ? rawExamples
        .map((entry: unknown) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return undefined;
          }
          const example = entry as Record<string, unknown>;
          return typeof example.text === "string"
            ? {
                sceneType:
                  typeof example.scene_type === "string"
                    ? example.scene_type
                    : typeof example.sceneType === "string"
                      ? example.sceneType
                      : "example",
                text: normalizeInlineWhitespace(example.text),
                whyItWorks: readStringList(example.why_it_works ?? example.whyItWorks),
              }
            : undefined;
        })
        .filter(
          (
            entry: SncStyleProfile["syntheticExamples"][number] | undefined,
          ): entry is SncStyleProfile["syntheticExamples"][number] => Boolean(entry),
        )
    : [];
  const parsedEvaluationChecks = readStringList(profile.evaluation_checks ?? profile.evaluationChecks);
  const parsedTabooPatterns = readStringList(profile.taboo_patterns ?? profile.tabooPatterns);

  if (
    parsedNarrativeMoves.openings.length === 0 ||
    parsedNarrativeMoves.development.length === 0 ||
    parsedNarrativeMoves.closers.length === 0 ||
    parsedNarrativeMoves.dialogueRules.length === 0 ||
    parsedNarrativeMoves.sensoryBias.length === 0 ||
    parsedNarrativeMoves.tensionMechanics.length === 0 ||
    parsedTabooPatterns.length === 0 ||
    !parsedPromptFragments.styleGoal ||
    parsedPromptFragments.avoid.length === 0 ||
    parsedPromptFragments.steeringNotes.length === 0 ||
    parsedSyntheticExamples.length === 0 ||
    parsedEvaluationChecks.length === 0
  ) {
    return undefined;
  }

  return {
    profile: {
      profileId,
      label:
        typeof profile.label === "string"
          ? profile.label
          : typeof profile.name === "string"
            ? profile.name
            : "External style profile",
      styleAxes: {
        narrationFormality: numeric(styleAxes.narration_formality ?? styleAxes.narrationFormality, 0.5),
        sentenceBurstiness: numeric(styleAxes.sentence_burstiness ?? styleAxes.sentenceBurstiness, 0.5),
        expositionPressure: numeric(styleAxes.exposition_pressure ?? styleAxes.expositionPressure, 0.2),
        subtextDensity: numeric(styleAxes.subtext_density ?? styleAxes.subtextDensity, 0.5),
        emotionalTemperature: numeric(styleAxes.emotional_temperature ?? styleAxes.emotionalTemperature, 0.5),
        dialogueDensity: numeric(styleAxes.dialogue_density ?? styleAxes.dialogueDensity, 0.5),
        pacingVelocity: numeric(styleAxes.pacing_velocity ?? styleAxes.pacingVelocity, 0.5),
        hookFrequency: numeric(styleAxes.hook_frequency ?? styleAxes.hookFrequency, 0.5),
      },
      narrativeMoves: parsedNarrativeMoves,
      tabooPatterns: parsedTabooPatterns,
      promptFragments: parsedPromptFragments,
      syntheticExamples: parsedSyntheticExamples,
      evaluationChecks: parsedEvaluationChecks,
    },
    operationalPromptFields,
  };
}

function chooseAutoProfileId(currentTurnText: string): string | undefined {
  const text = normalizeInlineWhitespace(currentTurnText);
  if (!text) {
    return undefined;
  }
  let bestMatch: { profileId: string; score: number } | undefined;
  for (const candidate of STYLE_AUTO_PATTERNS) {
    const score = candidate.patterns.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0);
    if (score === 0) {
      continue;
    }
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { profileId: candidate.profileId, score };
    }
  }
  return bestMatch?.profileId;
}

export async function resolveSncStyleOverlay(params: {
  config: SncResolvedConfig["style"];
  framingMode: "writing" | "general";
  taskPosture: SncTaskPostureContext;
  outputDiscipline: SncOutputDisciplineContext;
  messages: AgentMessage[];
}): Promise<SncResolvedStyleOverlay | undefined> {
  if (
    !params.config.enabled ||
    params.config.mode === "off" ||
    params.framingMode !== "writing" ||
    params.taskPosture.posture === "evidence-grounding" ||
    params.outputDiscipline.mode !== "writing-prose"
  ) {
    return undefined;
  }

  if (params.config.mode === "profile") {
    if (params.config.profileId && BUILTIN_STYLE_PROFILES[params.config.profileId]) {
      return {
        profile: BUILTIN_STYLE_PROFILES[params.config.profileId],
        source: "builtin-explicit",
        operationalPromptFields: ALL_OPERATIONAL_PROMPT_FIELDS,
      };
    }
    if (params.config.profileFile) {
      const raw = JSON.parse(await readFile(params.config.profileFile, "utf8")) as unknown;
      const profile = coerceExternalProfile(raw);
      if (profile) {
        return {
          profile: profile.profile,
          source: "external-profile",
          operationalPromptFields: profile.operationalPromptFields,
        };
      }
    }
    return undefined;
  }

  if (params.config.profileId && BUILTIN_STYLE_PROFILES[params.config.profileId]) {
    return {
      profile: BUILTIN_STYLE_PROFILES[params.config.profileId],
      source: "builtin-explicit",
      operationalPromptFields: ALL_OPERATIONAL_PROMPT_FIELDS,
    };
  }

  if (params.config.profileFile) {
    const raw = JSON.parse(await readFile(params.config.profileFile, "utf8")) as unknown;
    const profile = coerceExternalProfile(raw);
    if (profile) {
      return {
        profile: profile.profile,
        source: "external-profile",
        operationalPromptFields: profile.operationalPromptFields,
      };
    }
  }

  const autoProfileId = chooseAutoProfileId(collectCurrentTurnUserText(params.messages));
  return autoProfileId
    ? {
        profile: BUILTIN_STYLE_PROFILES[autoProfileId],
        source: "builtin-auto",
        operationalPromptFields: ALL_OPERATIONAL_PROMPT_FIELDS,
      }
    : undefined;
}

function buildIntensityCue(intensity: number): string {
  if (intensity >= 0.85) {
    return "Lean into the overlay strongly, but never at the expense of truth or user constraints.";
  }
  if (intensity >= 0.55) {
    return "Lean into the overlay clearly while keeping semantic truth primary.";
  }
  return "Apply the overlay lightly as a surface nudge, not as a dominant personality.";
}

function buildStrictnessCue(strictness: number): string {
  if (strictness >= 0.85) {
    return "Treat taboo patterns as hard bans unless the user explicitly asks for them.";
  }
  if (strictness >= 0.55) {
    return "Treat taboo patterns as strong avoid rules.";
  }
  return "Treat taboo patterns as caution flags.";
}

export function buildSncStyleOverlaySection(params: {
  overlay: SncResolvedStyleOverlay;
  config: SncResolvedConfig["style"];
}): string {
  const { overlay, config } = params;
  const allowed = new Set(overlay.operationalPromptFields);
  const examples = clampList(
    overlay.profile.syntheticExamples,
    Math.min(overlay.profile.syntheticExamples.length, Math.max(1, config.maxExamples)),
  );
  const lines = [
    `Profile: ${overlay.profile.label} (${overlay.profile.profileId})`,
    `Source: ${overlay.source}`,
    "",
    "Operating rule:",
    "- This overlay controls surface writing behavior only. It must not override current evidence, contradiction suppression, explicit constraints, or anti-fabrication behavior.",
    `- ${buildIntensityCue(config.intensity)}`,
    `- ${buildStrictnessCue(config.strictness)}`,
  ];

  if (allowed.has("taboo_patterns")) {
    lines.push("", "Taboo patterns (highest priority):");
    lines.push(...overlay.profile.tabooPatterns.map((entry) => `- ${entry}`));
  }

  if (allowed.has("prompt_fragments")) {
    lines.push("", "Style goal:");
    lines.push(`- ${overlay.profile.promptFragments.styleGoal}`);
  }

  if (allowed.has("style_axes")) {
    lines.push("", "Style axes:");
    lines.push(...buildAxisSummary(overlay.profile));
  }

  if (allowed.has("narrative_moves")) {
    lines.push("", "Narrative moves:");
    lines.push(...clampList(overlay.profile.narrativeMoves.openings, 2).map((entry) => `- Opening: ${entry}`));
    lines.push(...clampList(overlay.profile.narrativeMoves.development, 2).map((entry) => `- Development: ${entry}`));
    lines.push(...clampList(overlay.profile.narrativeMoves.dialogueRules, 1).map((entry) => `- Dialogue: ${entry}`));
    lines.push(...clampList(overlay.profile.narrativeMoves.sensoryBias, 1).map((entry) => `- Sensory: ${entry}`));
    lines.push(...clampList(overlay.profile.narrativeMoves.tensionMechanics, 2).map((entry) => `- Tension: ${entry}`));
    lines.push(...clampList(overlay.profile.narrativeMoves.closers, 1).map((entry) => `- Close: ${entry}`));
  }

  lines.push("", "Anti-manual voice:");
  lines.push(
    "- Suppress judgment, strategy, recap, milestone, checklist, and review-sounding prose inside the draft.",
  );
  lines.push(
    "- Prefer scene, motion, interruption, implication, and bodily/emotional staging over abstract conclusion sentences.",
  );
  if (allowed.has("prompt_fragments")) {
    lines.push(...overlay.profile.promptFragments.avoid.map((entry) => `- Avoid: ${entry}`));
    lines.push(...overlay.profile.promptFragments.steeringNotes.map((entry) => `- Steer: ${entry}`));
  }

  if (allowed.has("synthetic_examples") && examples.length > 0) {
    lines.push("", "Synthetic examples:");
    for (const example of examples) {
      lines.push(`- ${example.sceneType}: ${example.text}`);
    }
  }

  if (allowed.has("evaluation_checks") && overlay.profile.evaluationChecks.length > 0) {
    lines.push("", "Silent self-checks before finalizing:");
    lines.push(...overlay.profile.evaluationChecks.map((entry) => `- ${entry}`));
  }

  return lines.join("\n");
}
