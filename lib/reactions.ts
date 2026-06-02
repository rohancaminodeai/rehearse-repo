export const ALLOWED_EMOJI = ["👍", "❤️", "🔥", "💪", "😊"] as const;

export function validateReaction(emoji: string): string | null {
  if (!(ALLOWED_EMOJI as readonly string[]).includes(emoji))
    return `Emoji not allowed. Choose from: ${ALLOWED_EMOJI.join(" ")}`;
  return null;
}
