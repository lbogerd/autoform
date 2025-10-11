import { validateArrayField } from "./array";
import { validateObjectField } from "./object";
import { validatePrimitiveField } from "./primitive";
import { validateRecordField } from "./record";
import { validateUnionField } from "./union";
import type { ValidationContext, ValidationIssue, ValidatorFn } from "./types";
import type { AnyField } from "../normalizers/types";
import type { FieldSchema } from "../schemas";
import type z from "zod";

const DEFAULT_CONTEXT: ValidationContext = {};

/**
 * Delegates validation to field-family specific helpers.
 */
export const validateValue: ValidatorFn = (
  field,
  value,
  context = DEFAULT_CONTEXT,
  path
) => {
  const typedField = field as AnyField;

  switch (typedField.type) {
    case "object":
      return validateObjectField(typedField, value, context, path, validateValue);
    case "array":
      return validateArrayField(typedField, value, context, path, validateValue);
    case "record":
      return validateRecordField(typedField, value, context, path);
    case "union":
      return validateUnionField(typedField, value, context, path, validateValue);
    default:
      return validatePrimitiveField(typedField, value, context, path);
  }
};

/**
 * Validates an entire form payload using the provided schema definition.
 */
export const validateFormValues = (
  values: Record<string, unknown>,
  fields: Record<string, z.infer<typeof FieldSchema>>,
  context: ValidationContext = DEFAULT_CONTEXT
): ValidationIssue[] =>
  Object.entries(fields).flatMap(([key, field]) =>
    validateValue(field, values[key], context, [key])
  );

export type { ValidationIssue, ValidationContext } from "./types";
