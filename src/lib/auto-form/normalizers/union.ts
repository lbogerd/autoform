import type {
  AnyField,
  NormalizationContext,
  NormalizerFn,
  UnionOptionsValue,
} from "./types";

// WHY: Union fields capture both the selected option and the per-option payloads
// so the UI can seamlessly switch between choices. Normalizing ensures every
// option slot is hydrated, even when the user never touched it.
export const normalizeUnionField = (
  field: Extract<AnyField, { type: "union" }>,
  value: unknown,
  context: NormalizationContext,
  normalize: NormalizerFn
): UnionOptionsValue => {
  if (!value || typeof value !== "object") {
    return {
      selected: 0,
      options: field.anyOf.map((option) => normalize(option, undefined, context)),
    } satisfies UnionOptionsValue;
  }

  const unionValue = value as UnionOptionsValue;
  const selectedIndex = Number((unionValue as { selected?: unknown }).selected ?? 0);

  return {
    selected: Number.isNaN(selectedIndex) ? 0 : selectedIndex,
    options: field.anyOf.map((option, index) =>
      normalize(option, unionValue.options?.[index], context)
    ),
  } satisfies UnionOptionsValue;
};
