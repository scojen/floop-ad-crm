/**
 * Personal-attributes hook linter (S9). A HEURISTIC AID, not a compliance
 * determination: Meta's personal-attributes rule is contextual — it
 * prohibits implying knowledge of personal attributes ("Are you diabetic?"),
 * not the topic itself ("Diabetes management that fits real life").
 * Flags second-person constructions combined with sensitive-attribute
 * keywords for HUMAN review.
 */

const SECOND_PERSON = /\b(you|your|you're|youre|are you|do you|struggling)\b/i;

const SENSITIVE_KEYWORDS = [
  // health / body
  'weight', 'fat', 'obese', 'diabet', 'depress', 'anxiet', 'addict',
  'disease', 'diagnos', 'condition', 'chronic', 'pain', 'infertil',
  'pregnan', 'hair loss', 'balding', 'acne', 'mental',
  // financial
  'debt', 'credit', 'bankrupt', 'loan', 'broke', 'salary', 'income',
  'foreclos',
  // identity / status
  'age', 'old', 'senior', 'religio', 'christian', 'jewish', 'muslim',
  'race', 'ethnic', 'immigrant', 'disab', 'veteran', 'divorce',
  'single', 'widow', 'criminal', 'arrest',
];

export interface HookLintHit {
  hookId: string;
  text: string;
  keywords: string[];
}

export function lintHook(text: string): string[] {
  if (!SECOND_PERSON.test(text)) return [];
  const lower = text.toLowerCase();
  return SENSITIVE_KEYWORDS.filter((keyword) => lower.includes(keyword));
}

export function lintHooks(
  hooks: { id: string; text: string }[],
): HookLintHit[] {
  const hits: HookLintHit[] = [];
  for (const hook of hooks) {
    if (!hook.text.trim()) continue;
    const keywords = lintHook(hook.text);
    if (keywords.length > 0) {
      hits.push({ hookId: hook.id, text: hook.text, keywords });
    }
  }
  return hits;
}
