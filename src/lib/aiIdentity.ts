/**
 * Central AI identity config. Change the assistant's name/gender here — everything
 * that displays the assistant's name (chat header, welcome screen, message labels,
 * system prompt) reads from this single source instead of hardcoding a string.
 */
export const AI_IDENTITY = {
  name: "MJ",
  gender: "male" as "male" | "female" | "neutral",
};

export const AI_NAME = AI_IDENTITY.name;
