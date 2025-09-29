import { describe, expect, it } from "vitest";

import z from "zod";
import { FormSchema } from "../src/components/autoform/test";

const newForm = {
  title: "Example Form",
  description: "This is an example form schema",
  fields: {
    name: {
      type: "string",
      required: true,
    },
    age: {
      type: "number",
      default: 13,
    },
    isStudent: {
      type: "boolean",
    },
    address: {
      type: "object",
      properties: {
        street: { type: "string", required: true },
        city: { type: "string", required: true },
        zipCode: { type: "string" },
      },
      required: true,
    },
    nullableField: {
      type: "string",
      nullable: true,
    },
    role: {
      type: "string",
      enum: ["admin", "user", "guest"],
      default: "user",
    },
    tags: {
      type: "array",
      itemType: { type: "string" },
    },
    preferences: {
      type: "record",
      keyType: "string",
      valueType: {
        type: "object",
        properties: { darkMode: { type: "boolean", required: true } },
      },
    },
  },
} satisfies z.infer<typeof FormSchema>;

describe("New version tests", () => {
  it("should be parsed correctly", () => {
    expect(FormSchema.safeParse(newForm).success).toBe(true);
  });

  it("should fail for invalid data", () => {
    const invalidForm = {
      ...newForm,
      fields: {
        ...newForm.fields,
        age: { type: "string", default: 13 },
      },
    };

    const parseResult = FormSchema.safeParse(invalidForm);
    expect(parseResult.success).toBe(false);
  });
});
