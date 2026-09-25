/**
 * Heuristics for the "bebi" nickname Easter egg: decides whether the student's own chat message
 * should turn the nickname on, off, or leave it unchanged.
 *
 * IMPORTANT: this must only ever be run against the student's own typed message — never against
 * lesson content, chunks, prior AI replies, or anything else — so nothing in an uploaded document
 * can accidentally trigger or clear it.
 */

// Checked first: an explicit request to stop always wins, even though the text also contains "bebi".
const STOP_PATTERNS = [
  /\bdon'?t call me bebi\b/i,
  /\bstop calling me bebi\b/i,
  /\bdon'?t call me that\b/i,
  /\bstop (with )?(the )?bebi\b/i,
  /\bno more bebi\b/i,
];

// Checked second: an explicit request to bring it back.
const RESUME_PATTERNS = [/\byou can call me bebi( again)?\b/i, /\bcall me bebi again\b/i, /\byou can use bebi again\b/i];

// Checked last: any other mention of "bebi" in the student's own message — addressing MJ with it
// ("hey bebi", "bebi, explain this", "thanks bebi") — counts as activating it.
const MENTION_PATTERN = /\bbebi\b/i;

export type NicknameAction = "activate" | "deactivate" | "none";

export function detectNicknameAction(message: string): NicknameAction {
  if (STOP_PATTERNS.some((p) => p.test(message))) return "deactivate";
  if (RESUME_PATTERNS.some((p) => p.test(message))) return "activate";
  if (MENTION_PATTERN.test(message)) return "activate";
  return "none";
}
