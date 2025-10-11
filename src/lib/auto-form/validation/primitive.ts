import type { AnyField } from "../normalizers/types";
import { ensureRequired } from "./helpers";
import type { ValidationContext, ValidationIssue } from "./types";

// WHY: Primitive fields only enforce required semantics at this stage. More
// specialized business rules can layer on in future phases without complicating
// the base validator.
export const validatePrimitiveField = (
  field: AnyField,
  value: unknown,
  _context: ValidationContext,
  path: string[]
): ValidationIssue[] => {
  return ensureRequired(field, value, path);
};
