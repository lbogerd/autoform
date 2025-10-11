import type { AnyField, UnionOptionsValue } from "../normalizers/types";
import { ensureRequired, isValueEmpty, createIssue } from "./helpers";
import type { ValidationContext, ValidationIssue, ValidatorFn } from "./types";

// WHY: Unions present several possible shapes but only one active option should
// be validated at a time. The validator focuses on the selected option so users
// receive actionable feedback tied to the visible inputs.
export const validateUnionField = (
  field: Extract<AnyField, { type: "union" }>,
  value: unknown,
  context: ValidationContext,
  path: string[],
  validate: ValidatorFn
): ValidationIssue[] => {
  const unionValue =
    value && typeof value === "object"
      ? (value as UnionOptionsValue)
      : ({ selected: 0, options: [] } as UnionOptionsValue);

  const selectedIndex = Number(unionValue.selected ?? 0);
  const normalizedIndex = Number.isNaN(selectedIndex) ? 0 : selectedIndex;
  const optionField = field.anyOf[normalizedIndex] as AnyField | undefined;
  const optionValue = unionValue.options?.[normalizedIndex];
  const optionPath = [...path, "options", normalizedIndex.toString()];

  if (!optionField) {
    return [
      createIssue(
        path,
        field.errorMessage ?? `${field.title} has an invalid selection`
      ),
    ];
  }

  if (field.required && isValueEmpty(optionValue)) {
    return ensureRequired(field, optionValue, optionPath);
  }

  return validate(optionField, optionValue, context, optionPath);
};
