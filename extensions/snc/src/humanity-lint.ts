const BRIEFING_PATTERNS = [
  /\b(first|second|next|finally|overall|in summary|this chapter|what matters is|the point is|it means|can be seen|in this scene)\b/i,
  /(首先|其次|然后|最后|总之|总体来说|换句话说|需要注意|意味着|可以看到|这一章|本章|接下来|在这里|值得注意的是|某种意义上|从这个角度看)/,
  /\b(mechanism|procedure|framework|process|arrangement|coordination|policy|agreement|response)\b/i,
  /(机制|流程|规则|条款|程序|安排|沟通会|回执|协议|方案|步骤|框架|系统|预案|法务|观察条款)/,
];

const ABSTRACT_PATTERNS = [
  /\b(emotion|atmosphere|feeling|situation|problem|condition|pressure|risk|plan|strategy|logic|tension|response)\b/i,
  /(情绪|氛围|感觉|状态|问题|处境|压力|风险|计划|策略|逻辑|局面|信息|情况|层面|程度|性质|回应|意义)/,
];

const SENSORY_PATTERNS = [
  /\b(smell|cold|hot|wet|dark|bright|sound|taste|blood|sweat|breath|hand|finger|door|rain|smoke|rust)\b/i,
  /(冷|热|湿|汗|气味|呼吸|手指|掌心|脚步|门缝|雨|血|雾|光|声|痛|麻|烫|潮|铁锈|霉味|脊背|喉咙|牙根|视线|鼻尖|指节|衣角|风|潮气)/,
];

const ACTION_PATTERNS = [
  /\b(run|grab|turn|step|push|pull|open|close|duck|glance|hold|move|climb|hide|jump|reach|lean|press|drag)\b/i,
  /(跑|抓|拽|推|拉|抬|压|扑|躲|冲|迈|踩|掀|扯|扣|摸|捏|抬眼|回头|钻|撑|挪|停|踹|撞|贴|翻|拧|压低|攥|探|缩|挤)/,
];

const AGENCY_SUBJECT_PATTERNS = [/\b(I|he|she|they)\b/i, /(我|他|她|他们|她们|主角)/];

const TEMPLATE_CLOSER_PATTERNS = [
  /\b(this is only the beginning|the real .* has just begun|no one knew what would happen next|the storm was only starting)\b/i,
  /(一切才刚刚开始|故事才刚刚开始|真正的.*才刚开始|新的风暴.*拉开序幕|而这只是开始|未来.*等待着|没人知道接下来|命运的齿轮|总之|总而言之)/,
];

const TRANSLATIONESE_PATTERNS = [
  /\b(however|therefore|meanwhile|moreover|in this context|to some extent|on the other hand)\b/i,
  /(然而|因此|与此同时|此外|另一方面|在此基础上|某种程度上|从而|换言之|与此同时)/,
];

export type SncHumanityRisk = "low" | "moderate" | "high";

export type SncHumanityDiagnostics = {
  sentenceCount: number;
  briefingSignals: number;
  abstractSignals: number;
  sensorySignals: number;
  actionSignals: number;
  agencySignals: number;
  templateClosureSignals: number;
  repeatedStarts: number;
  translationeseSignals: number;
  risk: SncHumanityRisk;
  warnings: string[];
  strengths: string[];
  recommendedDirectives: string[];
  recommendedAvoids: string[];
};

function uniqueList(entries: string[], limit = 4): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const entry of entries) {
    const normalized = entry.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    values.push(entry.trim());
    if (values.length >= limit) {
      break;
    }
  }
  return values;
}

function splitSentences(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/(?<=[.!?。！？；;])\s*/))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isStructuredOutput(text: string): boolean {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return true;
  }
  const bulletLines = lines.filter((line) => /^[-*•\d]/.test(line)).length;
  return bulletLines >= 3 && bulletLines / lines.length >= 0.5;
}

function countMatchingSentences(sentences: string[], patterns: RegExp[]): number {
  return sentences.filter((sentence) => patterns.some((pattern) => pattern.test(sentence))).length;
}

function countAgencySentences(sentences: string[]): number {
  return sentences.filter(
    (sentence) =>
      AGENCY_SUBJECT_PATTERNS.some((pattern) => pattern.test(sentence)) &&
      ACTION_PATTERNS.some((pattern) => pattern.test(sentence)),
  ).length;
}

function countRepeatedStarts(sentences: string[]): number {
  let repeated = 0;
  let previous = "";
  for (const sentence of sentences) {
    const asciiStart = sentence.match(/^[A-Za-z]+/)?.[0]?.toLowerCase() ?? "";
    const cjkStart = sentence.replace(/\s+/g, "").slice(0, 3);
    const current = asciiStart || cjkStart;
    if (current && current === previous) {
      repeated += 1;
    }
    previous = current;
  }
  return repeated;
}

export function analyzeSncHumanity(text: string | undefined): SncHumanityDiagnostics | null {
  const normalized = text?.trim();
  if (!normalized || normalized.length < 80 || isStructuredOutput(normalized)) {
    return null;
  }

  const sentences = splitSentences(normalized);
  if (sentences.length === 0) {
    return null;
  }

  const briefingSignals = countMatchingSentences(sentences, BRIEFING_PATTERNS);
  const abstractSignals = countMatchingSentences(sentences, ABSTRACT_PATTERNS);
  const sensorySignals = countMatchingSentences(sentences, SENSORY_PATTERNS);
  const actionSignals = countMatchingSentences(sentences, ACTION_PATTERNS);
  const agencySignals = countAgencySentences(sentences);
  const templateClosureSignals = countMatchingSentences(sentences.slice(-2), TEMPLATE_CLOSER_PATTERNS);
  const repeatedStarts = countRepeatedStarts(sentences);
  const translationeseSignals = countMatchingSentences(sentences, TRANSLATIONESE_PATTERNS);

  let riskScore = 0;
  if (briefingSignals >= Math.max(2, Math.ceil(sentences.length * 0.35))) {
    riskScore += 2;
  } else if (briefingSignals >= 1) {
    riskScore += 1;
  }
  if (abstractSignals > sensorySignals + 1) {
    riskScore += 1;
  }
  if (actionSignals === 0 && sentences.length >= 3) {
    riskScore += 2;
  } else if (agencySignals === 0 && sentences.length >= 3) {
    riskScore += 1;
  }
  if (sensorySignals === 0 && sentences.length >= 3) {
    riskScore += 1;
  }
  if (templateClosureSignals > 0) {
    riskScore += 1;
  }
  if (repeatedStarts >= 2) {
    riskScore += 1;
  }
  if (translationeseSignals >= 2) {
    riskScore += 1;
  }
  if (actionSignals >= 2 && agencySignals >= 1) {
    riskScore = Math.max(0, riskScore - 1);
  }
  if (sensorySignals >= 2) {
    riskScore = Math.max(0, riskScore - 1);
  }

  const risk: SncHumanityRisk =
    riskScore >= 4 ? "high" : riskScore >= 2 ? "moderate" : "low";

  const warnings = uniqueList(
    [
      briefingSignals >= 2 ? "Explanatory or procedural phrasing is crowding the scene." : "",
      abstractSignals > sensorySignals + 1
        ? "Abstract labels are outnumbering concrete image and consequence."
        : "",
      actionSignals === 0 ? "The passage lacks visible movement or tactical adjustment." : "",
      agencySignals === 0 ? "Protagonist agency is weak or off-page." : "",
      templateClosureSignals > 0 ? "The ending drifts into a generic summary or forecast." : "",
      repeatedStarts >= 2 ? "Sentence openings are repeating and flattening voice texture." : "",
      translationeseSignals >= 2 ? "Connector-heavy phrasing is raising translationese risk." : "",
    ],
    4,
  );

  const strengths = uniqueList(
    [
      sensorySignals >= 2 ? "Concrete sensory detail is carrying some of the scene weight." : "",
      actionSignals >= 2 ? "The prose contains visible movement instead of pure explanation." : "",
      agencySignals >= 1 ? "The protagonist is making or embodying decisions on-page." : "",
      templateClosureSignals === 0 ? "The ending avoids a canned summary line." : "",
    ],
    4,
  );

  const recommendedDirectives = uniqueList(
    [
      briefingSignals >= 2
        ? "Enter through immediate scene pressure instead of setup summary."
        : "",
      actionSignals === 0
        ? "Drive the next passage through a visible decision, movement, or tactical adjustment."
        : "",
      sensorySignals === 0
        ? "Add one bodily or environmental detail before abstract explanation."
        : "",
      agencySignals === 0
        ? "Let the protagonist carry the scene logic through action, not a helper's explanation."
        : "",
      templateClosureSignals > 0
        ? "End on a concrete disturbance, task, or consequence instead of a summary."
        : "",
    ],
    4,
  );

  const recommendedAvoids = uniqueList(
    [
      briefingSignals >= 2 ? "Do not open with process explanation or meeting-style setup." : "",
      abstractSignals > sensorySignals + 1
        ? "Do not stack abstract labels where an object, gesture, or consequence can carry the meaning."
        : "",
      templateClosureSignals > 0
        ? "Do not close with a generic forecast or summary sentence."
        : "",
      translationeseSignals >= 2
        ? "Do not lean on connector-heavy translationese transitions."
        : "",
    ],
    4,
  );

  return {
    sentenceCount: sentences.length,
    briefingSignals,
    abstractSignals,
    sensorySignals,
    actionSignals,
    agencySignals,
    templateClosureSignals,
    repeatedStarts,
    translationeseSignals,
    risk,
    warnings,
    strengths,
    recommendedDirectives,
    recommendedAvoids,
  };
}

export function buildSncHumanityPromptWatch(
  diagnostics: SncHumanityDiagnostics | undefined,
): string | undefined {
  if (!diagnostics || diagnostics.risk === "low") {
    return undefined;
  }

  const lines = [
    `latest prose risk: ${diagnostics.risk}`,
    "Corrective priorities:",
  ];

  for (const directive of diagnostics.recommendedDirectives) {
    lines.push(`- ${directive}`);
  }

  if (diagnostics.recommendedAvoids.length > 0) {
    lines.push("Avoid:");
    for (const entry of diagnostics.recommendedAvoids) {
      lines.push(`- ${entry}`);
    }
  }

  return lines.join("\n");
}
