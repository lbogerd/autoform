import { describe, expect, it } from "vitest";

import { validateValue } from "../../src/lib/auto-form/validation";
import type { AnyField } from "../../src/lib/auto-form/normalizers/types";

describe("validateValue", () => {
  it("flags missing required primitives", () => {
    const field = {
      type: "string",
      title: "Full name",
      required: true,
    } as AnyField;

    const issues = validateValue(field, undefined, undefined, ["fullName"]);

    expect(issues).toEqual([
      { path: ["fullName"], message: "Full name is required" },
    ]);
  });

  it("validates required arrays when empty", () => {
    const field = {
      type: "array",
      title: "Tags",
      required: true,
      errorMessage: "Add at least one tag",
      itemType: { type: "string", title: "Tag" },
    } as AnyField;

    const issues = validateValue(field, [], undefined, ["tags"]);

    expect(issues).toEqual([
      { path: ["tags"], message: "Add at least one tag" },
    ]);
  });

  it("validates required record fields without entries", () => {
    const field = {
      type: "record",
      title: "Metadata",
      required: true,
      errorMessage: "Provide at least one entry",
      keyType: "string",
      valueType: { type: "string", title: "Value" },
    } as AnyField;

    const issues = validateValue(field, {}, undefined, ["metadata"]);

    expect(issues).toEqual([
      { path: ["metadata"], message: "Provide at least one entry" },
    ]);
  });

  it("validates the active union option when required", () => {
    const field = {
      type: "union",
      title: "Contact",
      required: true,
      anyOf: [
        { type: "string", title: "Email" },
        { type: "string", title: "Phone" },
      ],
    } as AnyField;

    const issues = validateValue(
      field,
      { selected: 1, options: [undefined, undefined] },
      undefined,
      ["contact"]
    );

    expect(issues).toEqual([
      { path: ["contact", "options", "1"], message: "Contact is required" },
    ]);
  });
});
