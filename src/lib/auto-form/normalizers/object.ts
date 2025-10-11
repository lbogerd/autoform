import type { AnyField, NormalizationContext, NormalizerFn } from "./types";

// WHY: Object fields own a nested schema tree. Recursively normalizing each
// property keeps deeply nested forms predictable, even when users omit values.
export const normalizeObjectField = (
  field: Extract<AnyField, { type: "object" }>,
  value: unknown,
  context: NormalizationContext,
  normalize: NormalizerFn
): Record<string, unknown> => {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return Object.entries(field.properties).reduce<Record<string, unknown>>(
    (acc, [key, subField]) => {
      acc[key] = normalize(subField as AnyField, source[key], context);
      return acc;
    },
    {}
  );
};
