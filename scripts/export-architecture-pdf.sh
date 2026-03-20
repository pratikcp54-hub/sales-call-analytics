#!/usr/bin/env bash
# Regenerate docs/ARCHITECTURE.pdf from docs/ARCHITECTURE.md (requires: Node/npx, Google Chrome/Chromium).
# IMPORTANT: Chrome only renders HTML when the temp file has a .html extension; otherwise file:// is served
# as text/plain and the PDF shows raw angle-bracket “code”.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MD="$ROOT/docs/ARCHITECTURE.md"
PDF="$ROOT/docs/ARCHITECTURE.pdf"
BODY="$(mktemp)"
# Must use .html suffix so Chromium applies HTML parsing + CSS (not plain text).
FULL="$(mktemp "${TMPDIR:-/tmp}/architecture-pdf-XXXXXX.html")"
trap 'rm -f "$BODY" "$FULL"' EXIT

npx --yes marked -i "$MD" -o "$BODY" --gfm
{
  printf '%s' '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sales Call Analytics — Architecture</title><style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 900px; margin: 24px auto; padding: 0 16px 32px; line-height: 1.55; color: #111; font-size: 11pt; }
    h1 { font-size: 1.5rem; font-weight: 600; border-bottom: 1px solid #ddd; padding-bottom: 0.35em; margin-top: 0; }
    h2 { font-size: 1.2rem; font-weight: 600; margin-top: 1.5em; }
    h3 { font-size: 1.05rem; font-weight: 600; margin-top: 1.1em; }
    table { border-collapse: collapse; width: 100%; font-size: 0.88em; margin: 1em 0; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; font-weight: 600; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9em; background: #f0f0f0; padding: 0.1em 0.35em; border-radius: 3px; }
    pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.85em; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    pre code { background: none; padding: 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1em; color: #444; }
    @media print { body { max-width: none; margin: 0.4in; } }
  </style></head><body>'
  cat "$BODY"
  printf '%s' '</body></html>'
} >"$FULL"

CHROME="${CHROME:-}"
for c in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$c" &>/dev/null; then CHROME="$c"; break; fi
done
if [[ -z "$CHROME" ]]; then
  echo "No Chrome/Chromium found in PATH. Set CHROME=/path/to/chrome." >&2
  exit 1
fi

"$CHROME" --headless --disable-gpu --no-sandbox --print-to-pdf="$PDF" "file://${FULL}"
echo "Wrote $PDF"
