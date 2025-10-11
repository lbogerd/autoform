import type { FieldSchema, RecordFieldSchema } from "./schemas";
import type z from "zod";
import { extractTimeValue, formatDateForInput } from "./date-helpers";
import { normalizeValue } from "./normalizers";
import { validateFormValues } from "./validation";
import type { AnyField, UnionOptionsValue } from "./normalizers/types";

export { parseDateValue } from "./date-helpers";
export { validateFormValues } from "./validation";

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

/**
 * Determines whether a provided value structurally matches the expected field definition.
 *
 * The check is intentionally permissive; it only verifies high-level type compatibility
 * so that defaults can be applied without forcing consumers to precisely match the schema.
 */
const isValueMatchingField = (value: unknown, field: AnyField): boolean => {
  switch (field.type) {
    case "string":
    case "email":
    case "password":
    case "url":
    case "time":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "date":
    case "datetime":
      return typeof value === "string" || value instanceof Date;
    case "array":
      return Array.isArray(value);
    case "object":
      return (
        Boolean(value) && typeof value === "object" && !Array.isArray(value)
      );
    case "union":
      return Boolean(value);
    case "record":
      return (
        Boolean(value) && typeof value === "object" && !Array.isArray(value)
      );
    default:
      return false;
  }
};

/**
 * Builds a default value for a field, optionally using an override when provided.
 *
 * This function recursively traverses composite fields (objects, arrays, unions, records)
 * so the resulting structure always matches what the form expects.
 */
const buildDefaultValue = (field: AnyField, override?: unknown): unknown => {
  const fallback = override ?? ("default" in field ? field.default : undefined);

  switch (field.type) {
    case "string":
    case "email":
    case "password":
    case "url":
    case "time":
      return typeof fallback === "string" ? fallback : "";
    case "number": {
      if (typeof fallback === "number") {
        return fallback;
      }

      if (typeof fallback === "string" && fallback.trim() !== "") {
        const parsed = Number(fallback);
        return Number.isNaN(parsed) ? undefined : parsed;
      }

      return undefined;
    }
    case "boolean":
      return typeof fallback === "boolean" ? fallback : false;
    case "date":
      return typeof fallback === "string"
        ? fallback
        : formatDateForInput(fallback);
    case "datetime":
      return {
        date: formatDateForInput(fallback),
        time: extractTimeValue(fallback) ?? "",
      } satisfies { date: string; time: string };
    case "object": {
      const defaultObject =
        (fallback && typeof fallback === "object" && !Array.isArray(fallback)
          ? (fallback as Record<string, unknown>)
          : {}) ?? {};

      return Object.entries(field.properties).reduce<Record<string, unknown>>(
        (acc, [key, subField]) => {
          acc[key] = buildDefaultValue(subField, defaultObject[key]);
          return acc;
        },
        {}
      );
    }
    case "array": {
      const source = Array.isArray(fallback)
        ? fallback
        : Array.isArray(field.default)
        ? field.default
        : [];
      return source.map((item) => buildDefaultValue(field.itemType, item));
    }
    case "record": {
      const source =
        (fallback && typeof fallback === "object" && !Array.isArray(fallback)
          ? (fallback as Record<string | number, unknown>)
          : field.default) ?? {};

      return Object.entries(source).map(([key, value]) => ({
        key,
        value: buildDefaultValue(field.valueType, value),
      }));
    }
    case "union": {
      const defaultOptions = field.anyOf.map((option) =>
        buildDefaultValue(option)
      );
      const result: UnionOptionsValue = {
        selected: 0,
        options: defaultOptions,
      };

      if (fallback !== undefined) {
        const matchedIndex = field.anyOf.findIndex((option) =>
          isValueMatchingField(fallback, option)
        );

        if (matchedIndex >= 0) {
          result.selected = matchedIndex;
          result.options[matchedIndex] = buildDefaultValue(
            field.anyOf[matchedIndex],
            fallback
          );
        }
      }

      return result;
    }
    default:
      return undefined;
  }
};

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
  normalizeValue(field, value);

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
