import type {
  FieldSchema,
  RecordFieldSchema,
} from "@/components/autoform/schemas";
import type z from "zod";

/**
 * Attempts to coerce an arbitrary value into a valid {@link Date} instance.
 *
 * @param value - Raw value coming from default values, form state, or schema.
 * @returns A {@link Date} when the value can be interpreted as one, otherwise `undefined`.
 */
export const parseDateValue = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
};

/**
 * Normalizes a date-like value into the `YYYY-MM-DD` string used by native date inputs.
 *
 * @param value - Any value that might represent a date (string, Date, etc.).
 * @returns A formatted date string or an empty string when the value is not a valid date.
 */
export const formatDateForInput = (value: unknown): string => {
  const date = parseDateValue(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Extracts the `HH:MM` portion from time-like values so they can be consumed by time inputs.
 *
 * @param value - A string or {@link Date} potentially containing a time component.
 * @returns The first five characters of the time component or `undefined` if unavailable.
 */
export const extractTimeValue = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toTimeString().slice(0, 5);
  }

  if (typeof value === "string") {
    if (value.includes("T")) {
      const [, timePart] = value.split("T");
      if (timePart) {
        return timePart.slice(0, 5);
      }
    }

    if (/^\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 5);
    }
  }

  return undefined;
};

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

type AnyField = z.infer<typeof FieldSchema>;
type FormValues = Record<string, unknown>;

type UnionOptionsValue = {
  selected: number;
  options: unknown[];
};

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
 */
const normalizeFieldValue = (field: AnyField, value: unknown): unknown => {
  switch (field.type) {
    case "object": {
      const source =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};

      return Object.entries(field.properties).reduce<Record<string, unknown>>(
        (acc, [key, subField]) => {
          acc[key] = normalizeFieldValue(subField, source[key]);
          return acc;
        },
        {}
      );
    }
    case "array": {
      if (!Array.isArray(value)) {
        return [];
      }

      return value.map((item) =>
        normalizeFieldValue(field.itemType as AnyField, item)
      );
    }
    case "record": {
      if (!Array.isArray(value)) {
        return {};
      }

      return value.reduce<Record<string, unknown>>((acc, entry) => {
        if (!entry || typeof entry !== "object") {
          return acc;
        }

        const rawKey = (entry as { key?: unknown }).key;
        if (rawKey === undefined || rawKey === null || rawKey === "") {
          return acc;
        }

        const normalizedKey =
          field.keyType === "number" ? Number(rawKey) : String(rawKey);

        if (field.keyType === "number" && Number.isNaN(normalizedKey)) {
          return acc;
        }

        acc[String(normalizedKey)] = normalizeFieldValue(
          field.valueType,
          (entry as { value?: unknown }).value
        );
        return acc;
      }, {});
    }
    case "union": {
      if (!value || typeof value !== "object") {
        return {
          selected: 0,
          options: field.anyOf.map((option) =>
            normalizeFieldValue(option, undefined)
          ),
        } satisfies UnionOptionsValue;
      }

      const unionValue = value as UnionOptionsValue;
      const selectedIndex = Number(
        (unionValue as { selected?: unknown }).selected ?? 0
      );

      return {
        selected: Number.isNaN(selectedIndex) ? 0 : selectedIndex,
        options: field.anyOf.map((option, index) =>
          normalizeFieldValue(option, unionValue.options?.[index])
        ),
      } satisfies UnionOptionsValue;
    }
    case "date": {
      if (typeof value === "string") {
        return value;
      }

      return formatDateForInput(value);
    }
    case "time": {
      if (typeof value === "string") {
        return value;
      }

      return extractTimeValue(value) ?? "";
    }
    case "datetime": {
      if (!value || typeof value !== "object") {
        return "";
      }

      const rawDate = (value as { date?: unknown }).date;
      const rawTime = (value as { time?: unknown }).time;

      const datePart =
        typeof rawDate === "string" ? rawDate : formatDateForInput(rawDate);
      const timePart =
        typeof rawTime === "string" ? rawTime : extractTimeValue(rawTime) ?? "";

      if (!datePart && !timePart) {
        return "";
      }

      return timePart ? `${datePart}T${timePart}` : datePart;
    }
    default:
      return value;
  }
};

/**
 * Normalizes an entire form submission payload based on the schema definitions.
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
