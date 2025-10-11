import { normalizeArrayField } from "./array";
import { normalizeObjectField } from "./object";
import { normalizePrimitiveField } from "./primitive";
import { normalizeRecordField } from "./record";
import { normalizeUnionField } from "./union";
import type { AnyField, NormalizationContext } from "./types";

const DEFAULT_CONTEXT: NormalizationContext = {};

/**
 * Delegates normalization to field-family specific helpers.
 */
export const normalizeValue = (
  field: AnyField,
  value: unknown,
  context: NormalizationContext = DEFAULT_CONTEXT
): unknown => {
  switch (field.type) {
    case "object":
      return normalizeObjectField(field, value, context, normalizeValue);
    case "array":
      return normalizeArrayField(field, value, context, normalizeValue);
    case "record":
      return normalizeRecordField(field, value, context, normalizeValue);
    case "union":
      return normalizeUnionField(field, value, context, normalizeValue);
    default:
      return normalizePrimitiveField(field, value, context);
  }
};

export type { NormalizationContext } from "./types";
