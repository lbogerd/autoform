import type { FieldSchema } from "../schemas";
import type z from "zod";
import type { AnyField } from "../normalizers/types";

/**
 * Shared contract for validation helpers.
 */
export type ValidationField = AnyField | z.infer<typeof FieldSchema>;

/**
 * Structured description of a validation problem encountered while traversing
 * the schema.
 */
export interface ValidationIssue {
  /** Dot-free path segments pointing to the offending field. */
  path: string[];
  /** Human friendly message explaining what went wrong. */
  message: string;
}

/**
 * Placeholder context object to keep validator signatures aligned with the
 * normalizers. Later phases can extend this surface without refactoring each
 * helper.
 */
export interface ValidationContext {}

export type ValidatorFn = (
  field: ValidationField,
  value: unknown,
  context: ValidationContext,
  path: string[]
) => ValidationIssue[];
