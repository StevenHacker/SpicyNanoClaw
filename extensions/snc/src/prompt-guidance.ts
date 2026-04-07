const WRITING_PROMPT_PATTERNS = [
  /\b(write|draft|continue|revise|rewrite|outline|scene|chapter|prose|novel|story)\b/i,
  /(写|续写|继续|改写|重写|润色|提纲|场景|章节|小说|故事|大纲|扩写|开场|开头|正文)/,
];

export const SNC_STABLE_WRITING_GUIDANCE = [
  "SNC fiction policy:",
  "- If the user asks for prose, output prose only. Do not explain your plan, restate constraints, or summarize what you are about to do.",
  "- Enter through a concrete scene quickly. Prefer immediate pressure, visible stakes, and physical action over briefing-style exposition.",
  "- Preserve canon and constraints by dramatizing them through objects, choices, and consequences, not by listing setting facts.",
  "- Keep the protagonist agentic. In prose mode, prefer a decision, movement, or tactical adjustment over static reflection.",
  "- Do not let support characters or narration solve the scene by over-explaining procedure, policy, or emotional meaning.",
  "- Prefer specific sensory detail to abstract mood labels. One concrete image is better than three generic emotional nouns.",
  "- Do not write like a report, meeting note, or product brief. Scene pressure should arrive before explanation.",
  "- Avoid generic wrap-up lines, repeated sentence openings, and translationese connectors.",
  "- If the user asks for outline or bullets, obey the requested structure exactly and do not drift into full prose.",
  "- Respect requested length tightly. When in doubt, stop slightly short instead of running long.",
].join("\n");

export function isLikelyWritingPrompt(prompt: string | undefined): boolean {
  const normalized = prompt?.trim();
  if (!normalized) {
    return false;
  }
  return WRITING_PROMPT_PATTERNS.some((pattern) => pattern.test(normalized));
}
