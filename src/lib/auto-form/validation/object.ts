import type { AnyField } from "../normalizers/types";
import { ensureRequired } from "./helpers";
import type { ValidationContext, ValidationIssue, ValidatorFn } from "./types";

// WHY: Object validators coordinate nested validation while also supporting a
// top-level required flag. This keeps deeply nested forms consistent without
// duplicating traversal logic in every consumer.
export const validateObjectField = (
  field: Extract<AnyField, { type: "object" }>,
  value: unknown,
  context: ValidationContext,
  path: string[],
  validate: ValidatorFn
): ValidationIssue[] => {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const issues: ValidationIssue[] = [];

  issues.push(...ensureRequired(field, source, path));

  for (const [key, child] of Object.entries(field.properties)) {
    issues.push(
      ...validate(child as AnyField, source[key], context, [...path, key])
    );
  }

  return issues;
};
