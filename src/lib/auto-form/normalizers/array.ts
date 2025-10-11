import type { AnyField, NormalizationContext, NormalizerFn } from "./types";

// WHY: Arrays in the UI often contain transient placeholders. Filtering with a
// single `Array.isArray` check ensures we only normalize real items and reuse
// the shared logic for each element type.
export const normalizeArrayField = (
  field: Extract<AnyField, { type: "array" }>,
  value: unknown,
  context: NormalizationContext,
  normalize: NormalizerFn
): unknown[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalize(field.itemType as AnyField, item, context));
};
