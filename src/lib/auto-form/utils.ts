import type { FieldSchema, RecordFieldSchema } from "./schemas";
import type z from "zod";

import {
  getDefaultValue as getDefaultValueForField,
  normalizeValue as normalizeValueForField,
  type AnyField,
} from "./adapters";

export {
  parseDateValue,
  formatDateForInput,
  extractTimeValue,
} from "./date-utils";

/**
 * Builds a stable, DOM-safe identifier for a given React Hook Form field name.
 *
 * @param name - The dot/bracket notation name used by React Hook Form.
 * @returns A kebab-cased identifier safe for use as an `id` attribute.
 */
export const buildControlId = (name: string): string =>
  `af-${name
    .replace(/\[(\d+)\]/g, "-$1")
    .replace(/[.\s]+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "-")}`;

type FormValues = Record<string, unknown>;

const buildDefaultValue = (field: AnyField, override?: unknown): unknown =>
  getDefaultValueForField(field, override);
/**
 * Converts a form schema definition into the default values object consumed by React Hook Form.
 */
export const buildDefaultValues = (
  fields: Record<string, z.infer<typeof FieldSchema>>
): FormValues => {
  return Object.entries(fields).reduce<FormValues>((acc, [key, field]) => {
    acc[key] = buildDefaultValue(field);
    return acc;
  }, {});
};

/**
 * Normalizes raw field values into the canonical shape expected by consumers on submit.
 *
 * The normalization mirrors `buildDefaultValue`, ensuring deeply nested structures are
 * consistent regardless of how the user interacted with the UI.
 *
 * Example transformations include:
 * - Converting date objects to strings
 * - Flattening union selections into their chosen option
 * - Ensuring records are plain objects instead of arrays of entries
 */
const normalizeFieldValue = (field: AnyField, value: unknown): unknown =>
  normalizeValueForField(field, value);

/**
 * Normalizes an entire form submission payload based on the schema definitions.
 *
 * Example: converting date objects to strings, flattening union selections, etc.
 */
export const normalizeFormValues = (
  values: FormValues,
  fields: Record<string, z.infer<typeof FieldSchema>>
): Record<string, unknown> =>
  Object.entries(fields).reduce<Record<string, unknown>>(
    (acc, [key, field]) => {
      acc[key] = normalizeFieldValue(field, values[key]);
      return acc;
    },
    {}
  );

/**
 * Creates a default array entry for the provided item schema while honoring overrides.
 */
export const createArrayItemDefault = (field: AnyField, override?: unknown) =>
  buildDefaultValue(field, override);

/**
 * Generates an empty record entry, pre-populating the value with its own defaults.
 */
export const createRecordEntryDefault = (
  field: z.infer<typeof RecordFieldSchema>
): { key: string; value: unknown } => ({
  key: "",
  value: buildDefaultValue(field.valueType),
});
