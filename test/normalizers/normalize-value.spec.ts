import { describe, expect, it } from "vitest";
import { normalizeValue } from "../../src/lib/auto-form/normalizers";
import type { AnyField } from "../../src/lib/auto-form/normalizers/types";

describe("normalizeValue", () => {
  it("returns primitive values unchanged", () => {
    const field = { type: "string", title: "Name" } as AnyField;
    expect(normalizeValue(field, "hello")).toBe("hello");
  });

  it("converts empty strings to undefined", () => {
    const field = { type: "string", title: "Name" } as AnyField;
    expect(normalizeValue(field, "")).toBeUndefined();
  });

  it("formats date-like primitives", () => {
    const field = { type: "date", title: "Birthday" } as AnyField;
    const result = normalizeValue(field, new Date("2024-05-04T00:00:00Z"));
    expect(result).toBe("2024-05-04");
  });

  it("recursively normalizes object fields", () => {
    const field = {
      type: "object",
      title: "Address",
      properties: {
        street: { type: "string", title: "Street" },
        moveIn: { type: "date", title: "Move in" },
      },
    } as AnyField;

    const result = normalizeValue(field, {
      street: "123 Main",
      moveIn: new Date("2022-01-02T10:00:00Z"),
    });

    expect(result).toEqual({
      street: "123 Main",
      moveIn: "2022-01-02",
    });
  });

  it("normalizes array items with their item schema", () => {
    const field = {
      type: "array",
      title: "Tags",
      itemType: { type: "time", title: "Tag" },
    } as AnyField;

    const result = normalizeValue(field, [new Date("2022-01-02T10:30:00Z"), "11:00"]);

    expect(result).toEqual(["10:30", "11:00"]);
  });

  it("drops invalid record entries while coercing keys", () => {
    const field = {
      type: "record",
      title: "Metadata",
      keyType: "number",
      valueType: { type: "string", title: "Value" },
    } as AnyField;

    const result = normalizeValue(field, [
      { key: "1", value: "one" },
      { key: "bad", value: "skip" },
      { key: 2, value: "two" },
    ]);

    expect(result).toEqual({
      "1": "one",
      "2": "two",
    });
  });

  it("hydrates union options when no value is provided", () => {
    const field = {
      type: "union",
      title: "Choice",
      anyOf: [
        { type: "string", title: "Text" },
        { type: "number", title: "Count" },
      ],
    } as AnyField;

    const result = normalizeValue(field, undefined);

    expect(result).toEqual({
      selected: 0,
      options: [undefined, undefined],
    });
  });
});
