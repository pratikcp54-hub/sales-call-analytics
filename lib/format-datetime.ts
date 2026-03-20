/** Fixed locale + options so SSR and browser hydration match (avoids default-locale drift). */
const LOCALE = "en-US";

export function formatCallDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatCallDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}
