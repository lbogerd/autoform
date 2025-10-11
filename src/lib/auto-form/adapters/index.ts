import type z from "zod";
import {
  ArrayFieldSchema,
  DateFieldSchema,
  DateTimeFieldSchema,
  FieldSchema,
  RecordFieldSchema,
  TimeFieldSchema,
} from "../schemas";
import { extractTimeValue, formatDateForInput } from "../date-utils";

export type AnyField = z.infer<typeof FieldSchema>;
export type ArrayField = z.infer<typeof ArrayFieldSchema>;
export type DateField = z.infer<typeof DateFieldSchema>;
export type DateTimeField = z.infer<typeof DateTimeFieldSchema>;
export type RecordField = z.infer<typeof RecordFieldSchema>;
export type TimeField = z.infer<typeof TimeFieldSchema>;

export type UnionOptionsValue = {
  selected: number;
  options: unknown[];
};

interface AdapterContext {
  getDefaultValue(field: AnyField, override?: unknown): unknown;
  normalizeValue(field: AnyField, value: unknown): unknown;
}

interface FieldAdapter<TField extends AnyField> {
  getDefault(
    context: AdapterContext,
    field: TField,
    override?: unknown
  ): unknown;
  normalize(context: AdapterContext, field: TField, value: unknown): unknown;
}

type AdapterMap = {
  [Type in AnyField["type"]]: FieldAdapter<Extract<AnyField, { type: Type }>>;
};

const adapterMap: AdapterMap = {
  string: {
    getDefault: (_ctx, field, override) => {
      const fallback = override ?? field.default;
      return typeof fallback === "string" ? fallback : "";
    },
    normalize: (_ctx, _field, value) => value,
  },
  email: {
    getDefault: (_ctx, field, override) => {
      const fallback = override ?? field.default;
      return typeof fallback === "string" ? fallback : "";
    },
    normalize: (_ctx, _field, value) => value,
  },
  password: {
    getDefault: (_ctx, field, override) => {
      const fallback = override ?? field.default;
      return typeof fallback === "string" ? fallback : "";
    },
    normalize: (_ctx, _field, value) => value,
  },
  url: {
    getDefault: (_ctx, field, override) => {
      const fallback = override ?? field.default;
      return typeof fallback === "string" ? fallback : "";
    },
    normalize: (_ctx, _field, value) => value,
  },
  time: {
    getDefault: (_ctx, field: TimeField, override) => {
      const fallback = override ?? field.default;
      return typeof fallback === "string"
        ? fallback
        : extractTimeValue(fallback) ?? "";
    },
    normalize: (_ctx, _field, value) =>
      typeof value === "string" ? value : extractTimeValue(value) ?? "",
  },
  number: {
    getDefault: (_ctx, field, override) => {
      const fallback = override ?? field.default;

      if (typeof fallback === "number") {
        return fallback;
      }

      if (typeof fallback === "string" && fallback.trim() !== "") {
        const parsed = Number(fallback);
        return Number.isNaN(parsed) ? undefined : parsed;
      }

      return undefined;
    },
    normalize: (_ctx, _field, value) => value,
  },
  boolean: {
    getDefault: (_ctx, field, override) => {
      const fallback = override ?? field.default;
      return typeof fallback === "boolean" ? fallback : false;
    },
    normalize: (_ctx, _field, value) => value,
  },
  date: {
    getDefault: (_ctx, field: DateField, override) => {
      const fallback = override ?? field.default;
      return typeof fallback === "string"
        ? fallback
        : formatDateForInput(fallback);
    },
    normalize: (_ctx, _field, value) =>
      typeof value === "string" ? value : formatDateForInput(value),
  },
  datetime: {
    getDefault: (_ctx, field: DateTimeField, override) => {
      const fallback = override ?? field.default;
      return {
        date: formatDateForInput(fallback),
        time: extractTimeValue(fallback) ?? "",
      } satisfies { date: string; time: string };
    },
    normalize: (_ctx, _field, value) => {
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
    },
  },
  object: {
    getDefault: (ctx, field, override) => {
      const fallback =
        override && typeof override === "object" && !Array.isArray(override)
          ? (override as Record<string, unknown>)
          : field.default && typeof field.default === "object"
          ? (field.default as Record<string, unknown>)
          : {};

      return Object.entries(field.properties).reduce<Record<string, unknown>>(
        (acc, [key, subField]) => {
          acc[key] = ctx.getDefaultValue(subField, fallback[key]);
          return acc;
        },
        {}
      );
    },
    normalize: (ctx, field, value) => {
      const source =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};

      return Object.entries(field.properties).reduce<Record<string, unknown>>(
        (acc, [key, subField]) => {
          acc[key] = ctx.normalizeValue(subField, source[key]);
          return acc;
        },
        {}
      );
    },
  },
  array: {
    getDefault: (ctx, field: ArrayField, override) => {
      const fallback = Array.isArray(override)
        ? override
        : Array.isArray(field.default)
        ? field.default
        : [];

      return fallback.map((item) => ctx.getDefaultValue(field.itemType, item));
    },
    normalize: (ctx, field: ArrayField, value) => {
      if (!Array.isArray(value)) {
        return [];
      }

      return value.map((item) =>
        ctx.normalizeValue(field.itemType as AnyField, item)
      );
    },
  },
  record: {
    getDefault: (ctx, field: RecordField, override) => {
      const fallback =
        override && typeof override === "object" && !Array.isArray(override)
          ? (override as Record<string | number, unknown>)
          : field.default ?? {};

      return Object.entries(fallback).map(([key, value]) => ({
        key,
        value: ctx.getDefaultValue(field.valueType, value),
      }));
    },
    normalize: (ctx, field: RecordField, value) => {
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

        acc[String(normalizedKey)] = ctx.normalizeValue(
          field.valueType,
          (entry as { value?: unknown }).value
        );
        return acc;
      }, {});
    },
  },
  union: {
    getDefault: (ctx, field, override) => {
      const defaultOptions = field.anyOf.map((option) =>
        ctx.getDefaultValue(option)
      );

      const result: UnionOptionsValue = {
        selected: 0,
        options: defaultOptions,
      };

      const fallback = override ?? field.default;

      if (fallback !== undefined) {
        const matchedIndex = field.anyOf.findIndex((option) =>
          isValueMatchingField(fallback, option as AnyField)
        );

        if (matchedIndex >= 0) {
          result.selected = matchedIndex;
          result.options[matchedIndex] = ctx.getDefaultValue(
            field.anyOf[matchedIndex] as AnyField,
            fallback
          );
        }
      }

      return result;
    },
    normalize: (ctx, field, value) => {
      if (!value || typeof value !== "object") {
        return {
          selected: 0,
          options: field.anyOf.map((option) =>
            ctx.normalizeValue(option as AnyField, undefined)
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
          ctx.normalizeValue(option as AnyField, unionValue.options?.[index])
        ),
      } satisfies UnionOptionsValue;
    },
  },
};

const resolveAdapter = <TField extends AnyField>(
  field: TField
): FieldAdapter<TField> => adapterMap[field.type] as FieldAdapter<TField>;

const getDefaultValue = <TField extends AnyField>(
  field: TField,
  override?: unknown
): unknown => resolveAdapter(field).getDefault(context, field, override);

const normalizeValue = <TField extends AnyField>(
  field: TField,
  value: unknown
): unknown => resolveAdapter(field).normalize(context, field, value);

const context: AdapterContext = {
  getDefaultValue,
  normalizeValue,
};

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

export { getDefaultValue, normalizeValue };
