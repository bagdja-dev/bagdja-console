/**
 * Shared "metadata" JSON textarea helper used by PlanModal/LicenseModal/ProductModal.
 *
 * Plain `JSON.parse` rejects common copy-paste-friendly mistakes (unquoted
 * keys, `=` instead of `:`, single quotes, trailing commas) with a cryptic
 * V8 error (e.g. "Expected property name or '}' in JSON at position 1") that
 * doesn't tell the user WHAT to fix. This module tries to auto-repair those
 * mistakes first (so the "Format" button actually does something useful on
 * near-miss input, not just on already-valid JSON), and otherwise returns a
 * friendlier error message with concrete hints.
 */

export interface MetadataJsonResult {
  /** Parsed object, or `null` if the input could not be turned into a valid JSON object. */
  value: Record<string, unknown> | null;
  /** User-facing error message, or `null` if `value` is valid. */
  error: string | null;
  /**
   * Pretty-printed JSON produced by auto-fixing minor syntax mistakes.
   * Only set when the ORIGINAL text was invalid but became valid after fixing
   * — callers can use this to update the textarea and show a "auto-fixed" hint.
   */
  fixedText: string | null;
}

const FIX_HINT =
  "Cek lagi: pakai ':' (bukan '=') antara key dan value, key & string harus dibungkus tanda kutip ganda (\"key\": \"value\"), dan jangan ada koma sebelum '}' atau ']'.";

/** Best-effort repair of common "almost JSON" mistakes. Safe to run on already-valid JSON (no-op). */
function autoFix(input: string): string {
  let fixed = input;
  // Curly/smart quotes -> straight quotes.
  fixed = fixed.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  // `key=value` -> `"key": value` (object-literal `=` used instead of `:`, e.g. `{limit=3}`).
  fixed = fixed.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*=\s*/g, '$1"$2": ');
  // Bare/unquoted keys -> quoted keys (`{limit: 3}` -> `{"limit": 3}`). Already-quoted
  // keys are untouched since the char right after `{`/`,` won't match the identifier pattern.
  fixed = fixed.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
  // Single-quoted strings -> double-quoted (best-effort — no support for nested/escaped quotes).
  fixed = fixed.replace(/'([^'"\n]*)'/g, '"$1"');
  // Trailing comma before `}`/`]`.
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');
  return fixed;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Invalid JSON format';
  return `${message}. ${FIX_HINT}`;
}

/**
 * Parse a metadata textarea value into a plain object.
 * - Empty input is treated as `{}` (metadata optional).
 * - Valid JSON is returned as-is (never rewritten).
 * - Minor mistakes (see `autoFix`) are silently repaired; `fixedText` carries
 *   the corrected, pretty-printed JSON for the caller to display/apply.
 * - Anything else falls back to a friendly, hint-augmented error message.
 */
export function parseMetadataJson(input: string): MetadataJsonResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: {}, error: null, fixedText: null };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        value: null,
        error: 'Metadata must be a JSON object, e.g. {"key": "value"}',
        fixedText: null,
      };
    }
    return { value: parsed as Record<string, unknown>, error: null, fixedText: null };
  } catch {
    // Fall through to auto-fix attempt below.
  }

  const fixed = autoFix(trimmed);
  if (fixed !== trimmed) {
    try {
      const parsed: unknown = JSON.parse(fixed);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return {
          value: parsed as Record<string, unknown>,
          error: null,
          fixedText: JSON.stringify(parsed, null, 2),
        };
      }
    } catch {
      // Still invalid after auto-fix — report the error below.
    }
  }

  try {
    JSON.parse(trimmed);
    return { value: null, error: `Invalid JSON format. ${FIX_HINT}`, fixedText: null };
  } catch (err) {
    return { value: null, error: friendlyError(err), fixedText: null };
  }
}
