import type { AnyField } from "../normalizers/types";
import { ensureRequired } from "./helpers";
import type { ValidationContext, ValidationIssue, ValidatorFn } from "./types";

// WHY: Arrays combine a required check with per-item validation so collections
// surface both structural and item-level issues.
export const validateArrayField = (
  field: Extract<AnyField, { type: "array" }>,
  value: unknown,
  context: ValidationContext,
  path: string[],
  validate: ValidatorFn
): ValidationIssue[] => {
  const items = Array.isArray(value) ? value : [];
  const issues: ValidationIssue[] = [];

  const requiredIssues = ensureRequired(field, items, path);
  if (requiredIssues.length > 0) {
    return requiredIssues;
  }

  items.forEach((item, index) => {
    issues.push(
      ...validate(
        field.itemType as AnyField,
        item,
        context,
        [...path, index.toString()]
      )
    );
  });

  return issues;
};
