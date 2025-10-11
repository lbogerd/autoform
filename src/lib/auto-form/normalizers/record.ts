import type { AnyField, NormalizationContext, NormalizerFn } from "./types";

// WHY: Records are modeled as arrays of `{ key, value }` entries in the form UI.
// Rebuilding a plain object keeps the submit payload ergonomic while silently
// dropping malformed keys to match the legacy behavior.
export const normalizeRecordField = (
  field: Extract<AnyField, { type: "record" }>,
  value: unknown,
  context: NormalizationContext,
  normalize: NormalizerFn
): Record<string, unknown> => {
  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce<Record<string, unknown>>((acc, entry) => {
    if (!entry || typeof entry !== "object") {
      return acc;
    }

    const rawKey = (entry as { key?: unknown }).key;
    if (rawKey === undefined || rawKey === null || rawKey === "") {
      return acc;
    }

    const normalizedKey =
      field.keyType === "number" ? Number(rawKey) : String(rawKey);

    if (field.keyType === "number" && Number.isNaN(normalizedKey)) {
      return acc;
    }

    acc[String(normalizedKey)] = normalize(
      field.valueType,
      (entry as { value?: unknown }).value,
      context
    );
    return acc;
  }, {});
};
