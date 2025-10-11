import { describe, expect, it } from "vitest";

import {
  buildControlId,
  buildDefaultValues,
  createArrayItemDefault,
  createRecordEntryDefault,
  extractTimeValue,
  formatDateForInput,
  normalizeFormValues,
  parseDateValue,
} from "../src/lib/auto-form/utils";

import type { z } from "zod";
import { FieldSchema, RecordFieldSchema } from "../src/lib/auto-form/schemas";

// Helper to satisfy the inferred type without importing entire form builders
const field = (definition: z.infer<typeof FieldSchema>) => definition;

describe("date utilities", () => {
  it("parseDateValue should handle undefined values", () => {
    expect(parseDateValue(undefined)).toBeUndefined();
  });

  it("parseDateValue should return a valid Date for ISO strings", () => {
    const result = parseDateValue("2024-02-03");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString().startsWith("2024-02-03")).toBe(true);
  });

  it("parseDateValue should ignore invalid dates", () => {
    expect(parseDateValue("not-a-date")).toBeUndefined();
  });

  it("formatDateForInput should return empty string when value is falsy", () => {
    expect(formatDateForInput(undefined)).toBe("");
  });

  it("formatDateForInput should format Date instances", () => {
    const date = new Date("2024-02-03T12:34:00Z");
    expect(formatDateForInput(date)).toBe("2024-02-03");
  });

  it("formatDateForInput should format date strings", () => {
    expect(formatDateForInput("2025-01-15")).toBe("2025-01-15");
  });

  it("extractTimeValue should support Date instances", () => {
    const date = new Date(2024, 1, 3, 12, 34, 0, 0);
    expect(extractTimeValue(date)).toBe("12:34");
  });

  it("extractTimeValue should extract time from ISO strings", () => {
    expect(extractTimeValue("2024-02-03T07:45:30Z")).toBe("07:45");
  });

  it("extractTimeValue should handle plain HH:mm strings", () => {
    expect(extractTimeValue("18:05:59")).toBe("18:05");
  });
});

describe("buildControlId", () => {
  it("should convert complex field names into DOM-safe IDs", () => {
    expect(buildControlId("user.profile[0].email")).toBe(
      "af-user-profile-0-email"
    );
  });
});

describe("default value builders", () => {
  const fields = {
    name: field({ type: "string", title: "Name" }),
    age: field({ type: "number", title: "Age" }),
    active: field({ type: "boolean", title: "Active", default: true }),
    birthdate: field({
      type: "date",
      title: "Birthdate",
      default: "2024-02-03",
    }),
    schedule: field({ type: "datetime", title: "Schedule" }),
    tags: field({
      type: "array",
      title: "Tags",
      itemType: field({ type: "string", title: "Tag" }),
      default: ["alpha", "beta"],
    }),
    contact: field({
      type: "object",
      title: "Contact",
      properties: {
        email: field({ type: "email", title: "Email" }),
        phone: field({ type: "string", title: "Phone", default: "123" }),
      },
    }),
    preferences: field({
      type: "union",
      title: "Preferences",
      anyOf: [
        field({ type: "string", title: "StringOption", default: "hot" }),
        field({ type: "number", title: "NumberOption" }),
      ],
      default: "iced",
    }),
    metadata: field({
      type: "record",
      title: "Metadata",
      keyType: "string",
      valueType: field({ type: "string", title: "MetaValue" }),
      default: { theme: "dark" },
    }),
  } satisfies Record<string, z.infer<typeof FieldSchema>>;

  it("buildDefaultValues should honor per-field defaults", () => {
    const defaults = buildDefaultValues(fields);

    expect(defaults).toMatchObject({
      name: "",
      age: undefined,
      active: true,
      birthdate: "2024-02-03",
      schedule: { date: "", time: "" },
      tags: ["alpha", "beta"],
      contact: { email: "", phone: "123" },
      preferences: {
        selected: 0,
        options: ["iced", undefined],
      },
      metadata: [{ key: "theme", value: "dark" }],
    });
  });

  it("createArrayItemDefault should respect overrides", () => {
    const stringField = field({ type: "string", title: "Item" });
    const result = createArrayItemDefault(stringField, "custom");
    expect(result).toBe("custom");
  });

  it("createRecordEntryDefault should initialize blank entries", () => {
    const recordField: z.infer<typeof RecordFieldSchema> = {
      type: "record",
      title: "Settings",
      keyType: "string",
      valueType: field({ type: "number", title: "Value" }),
    };

    const entry = createRecordEntryDefault(recordField);
    expect(entry).toEqual({ key: "", value: undefined });
  });
});

describe("normalizeFormValues", () => {
  const fields = {
    schedule: field({ type: "datetime", title: "Schedule" }),
    metadata: field({
      type: "record",
      title: "Metadata",
      keyType: "string",
      valueType: field({ type: "string", title: "Meta" }),
    }),
    choice: field({
      type: "union",
      title: "Choice",
      anyOf: [
        field({ type: "string", title: "StringOption" }),
        field({ type: "number", title: "NumberOption" }),
      ],
    }),
  } satisfies Record<string, z.infer<typeof FieldSchema>>;

  it("should collapse datetime fields into ISO-like strings", () => {
    const values = {
      schedule: { date: "2024-05-01", time: "13:45" },
      metadata: [
        { key: "theme", value: "dark" },
        { key: "", value: "ignored" },
      ],
      choice: {
        selected: 1,
        options: [undefined, 42],
      },
    };

    const normalized = normalizeFormValues(values, fields);

    expect(normalized.schedule).toBe("2024-05-01T13:45");
    expect(normalized.metadata).toEqual({ theme: "dark" });
    expect(normalized.choice).toEqual({
      selected: 1,
      options: [undefined, 42],
    });
  });

  it("should guard against invalid record entries", () => {
    const values = {
      schedule: { date: "", time: "" },
      metadata: [
        { key: null, value: "noop" },
        { key: "count", value: 10 },
      ],
      choice: {
        selected: "not-a-number",
        options: ["hello"],
      },
    };

    const normalized = normalizeFormValues(values, fields);

    expect(normalized.schedule).toBe("");
    expect(normalized.metadata).toEqual({ count: 10 });
    expect(normalized.choice).toEqual({
      selected: 0,
      options: ["hello", undefined],
    });
  });
});
