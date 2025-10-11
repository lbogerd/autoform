import type { AnyField } from "../normalizers/types";
import type { ValidationIssue } from "./types";

/**
 * Produces a uniform validation issue payload for downstream consumers.
 */
export const createIssue = (path: string[], message: string): ValidationIssue => ({
  path,
  message,
});

/**
 * Determines whether a value should be treated as "empty" for validation
 * purposes. This mirrors how normalization collapses empty inputs into
 * `undefined` so validation can consistently reason about missing data.
 */
export const isValueEmpty = (value: unknown): boolean => {
  if (value === undefined) {
    return true;
  }

  if (value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (typeof value === "number") {
    return Number.isNaN(value);
  }

  if (typeof value === "boolean") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isValueEmpty);
  }

  if (value && typeof value === "object") {
    const entries = Object.values(value as Record<string, unknown>);

    if (entries.length === 0) {
      return true;
    }

    return entries.every(isValueEmpty);
  }

  return false;
};

/**
 * Generates a default message for required-field violations while honoring any
 * schema-provided override.
 */
const requiredMessageFor = (field: AnyField): string =>
  field.errorMessage ?? `${field.title} is required`;

/**
 * Validates required-flag semantics for a single field.
 */
export const ensureRequired = (
  field: AnyField,
  value: unknown,
  path: string[]
): ValidationIssue[] => {
  if (!field.required) {
    return [];
  }

  if (value === null && field.nullable) {
    return [];
  }

  if (isValueEmpty(value)) {
    return [createIssue(path, requiredMessageFor(field))];
  }

  return [];
};
