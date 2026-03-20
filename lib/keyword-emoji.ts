const EMOJIS = ["📌", "💡", "🎯", "📊", "🔑", "⭐", "📝", "🏷️", "✨", "🔗", "📎", "🧭"];

export function keywordEmoji(keyword: string): string {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h + keyword.charCodeAt(i) * (i + 1)) % 997;
  return EMOJIS[h % EMOJIS.length];
}
