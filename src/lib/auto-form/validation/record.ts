import type { AnyField } from "../normalizers/types";
import { ensureRequired, isValueEmpty } from "./helpers";
import type { ValidationContext, ValidationIssue } from "./types";

// WHY: Record fields are captured as plain objects after normalization. The
// validator ensures at least one meaningful entry exists when the field is
// required and defers per-value validation to the nested AutoField instances.
export const validateRecordField = (
  field: Extract<AnyField, { type: "record" }>,
  value: unknown,
  _context: ValidationContext,
  path: string[]
): ValidationIssue[] => {
  if (!field.required) {
    return [];
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.values(value as Record<string, unknown>);
    if (entries.some((entry) => !isValueEmpty(entry))) {
      return [];
    }
  }

  return ensureRequired(field, value, path);
};
