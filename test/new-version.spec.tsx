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

const deeplyNestedForm = {
  title: "Deeply Nested Form",
  description: "A form with deeply nested structures",
  fields: {
    level1: {
      type: "object",
      properties: {
        level2: {
          type: "object",
          properties: {
            level3: {
              type: "array",
              itemType: {
                type: "object",
                properties: {
                  name: { type: "string", required: true },
                  details: {
                    type: "object",
                    properties: {
                      age: { type: "number" },
                      isActive: { type: "boolean", default: false },
                    },
                  },
                },
              },
            },
          },
          required: true,
        },
      },
      required: true,
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
        fail: { type: "string", default: 13 },
      },
    };

    const parseResult = FormSchema.safeParse(invalidForm);
    expect(parseResult.success).toBe(false);
  });

  it("should parse deeply nested forms correctly", () => {
    expect(FormSchema.safeParse(deeplyNestedForm).success).toBe(true);
  });

  it("should fail parsing deeply nested forms with errors", () => {
    const invalidDeeplyNestedForm = {
      ...deeplyNestedForm,
    };

    (
      invalidDeeplyNestedForm as any
    ).fields.level1.properties.level2.properties.level3.type = "asdfasdfasdf";

    expect(FormSchema.safeParse(invalidDeeplyNestedForm).success).toBe(false);
  });
});
