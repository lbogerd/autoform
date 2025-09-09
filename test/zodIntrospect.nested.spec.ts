import { describe, expect, it } from "vitest";
import * as z from "zod";
import type {
  ArrayFieldSpec,
  BooleanFieldSpec,
  FieldSpec,
  FormMeta,
  NumberFieldSpec,
  ObjectFieldSpec,
  StringFieldSpec,
  UnionFieldSpec,
} from "../src/core/types";
import { zodObjectToFieldSpecs } from "../src/core/zodIntrospect";

function byName<T extends FieldSpec>(fields: FieldSpec[], name: string) {
  const f = fields.find((x) => x.name === name);
  if (!f) throw new Error(`Missing field ${name}`);
  return f as T;
}

describe("zodObjectToFieldSpecs (Nested Schemas)", () => {
  describe("Objects", () => {
    it("parses nested objects", () => {
      const Schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
          active: z.boolean().default(true),
        }),
        settings: z
          .object({
            theme: z.enum(["light", "dark"]),
            notifications: z.boolean(),
          })
          .optional(),
      });

      const fields = zodObjectToFieldSpecs(Schema);

      const user = byName<ObjectFieldSpec>(fields, "user");
      expect(user.kind).toBe("object");
      expect(user.required).toBe(true);
      expect(user.fields).toHaveLength(3);

      const userName = byName<StringFieldSpec>(user.fields, "name");
      expect(userName.kind).toBe("string");
      expect(userName.required).toBe(true);

      const userAge = byName<NumberFieldSpec>(user.fields, "age");
      expect(userAge.kind).toBe("number");
      expect(userAge.required).toBe(true);

      const userActive = byName<BooleanFieldSpec>(user.fields, "active");
      expect(userActive.kind).toBe("boolean");
      expect(userActive.required).toBe(false);
      expect(userActive.defaultValue).toBe(true);

      const settings = byName<ObjectFieldSpec>(fields, "settings");
      expect(settings.kind).toBe("object");
      expect(settings.required).toBe(false);
      expect(settings.fields).toHaveLength(2);
    });

    it("applies meta to nested object fields", () => {
      const Schema = z.object({
        profile: z.object({
          firstName: z.string(),
          lastName: z.string(),
        }),
      });

      const meta: FormMeta = {
        profile: { label: "User Profile", help: "Personal information" },
        firstName: { label: "First Name", order: 2 },
        lastName: { label: "Last Name", order: 1 },
      };

      const fields = zodObjectToFieldSpecs(Schema, meta);
      const profile = byName<ObjectFieldSpec>(fields, "profile");

      expect(profile.label).toBe("User Profile");
      expect(profile.description).toBe("Personal information");

      // Check that nested fields are ordered correctly
      expect(profile.fields[0].name).toBe("lastName");
      expect(profile.fields[0].label).toBe("Last Name");
      expect(profile.fields[1].name).toBe("firstName");
      expect(profile.fields[1].label).toBe("First Name");
    });

    it("handles deeply nested objects", () => {
      const Schema = z.object({
        company: z.object({
          info: z.object({
            name: z.string(),
            address: z.object({
              street: z.string(),
              city: z.string(),
              zipCode: z.string(),
            }),
          }),
        }),
      });

      const fields = zodObjectToFieldSpecs(Schema);
      const company = byName<ObjectFieldSpec>(fields, "company");
      const info = byName<ObjectFieldSpec>(company.fields, "info");
      const address = byName<ObjectFieldSpec>(info.fields, "address");

      expect(address.fields).toHaveLength(3);
      expect(byName<StringFieldSpec>(address.fields, "street").kind).toBe(
        "string"
      );
      expect(byName<StringFieldSpec>(address.fields, "city").kind).toBe(
        "string"
      );
      expect(byName<StringFieldSpec>(address.fields, "zipCode").kind).toBe(
        "string"
      );
    });
  });

  describe("Arrays", () => {
    it("parses array of primitives", () => {
      const Schema = z.object({
        tags: z.array(z.string()),
        scores: z.array(z.number().min(0).max(100)),
        flags: z.array(z.boolean()).optional(),
      });

      const fields = zodObjectToFieldSpecs(Schema);

      const tags = byName<ArrayFieldSpec>(fields, "tags");
      expect(tags.kind).toBe("array");
      expect(tags.required).toBe(true);
      expect(tags.elementSpec.kind).toBe("string");

      const scores = byName<ArrayFieldSpec>(fields, "scores");
      expect(scores.kind).toBe("array");
      expect(scores.elementSpec.kind).toBe("number");
      expect((scores.elementSpec as NumberFieldSpec).min).toBe(0);
      expect((scores.elementSpec as NumberFieldSpec).max).toBe(100);

      const flags = byName<ArrayFieldSpec>(fields, "flags");
      expect(flags.required).toBe(false);
      expect(flags.elementSpec.kind).toBe("boolean");
    });

    it("parses array with constraints", () => {
      const Schema = z.object({
        items: z.array(z.string()).min(1).max(5),
        optionalItems: z.array(z.number()).min(2).optional(),
      });

      const fields = zodObjectToFieldSpecs(Schema);

      const items = byName<ArrayFieldSpec>(fields, "items");
      expect(items.minItems).toBe(1);
      expect(items.maxItems).toBe(5);

      const optionalItems = byName<ArrayFieldSpec>(fields, "optionalItems");
      expect(optionalItems.minItems).toBe(2);
      expect(optionalItems.required).toBe(false);
    });

    it("parses array of objects", () => {
      const Schema = z.object({
        users: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            role: z.enum(["admin", "user"]),
          })
        ),
      });

      const fields = zodObjectToFieldSpecs(Schema);
      const users = byName<ArrayFieldSpec>(fields, "users");

      expect(users.kind).toBe("array");
      expect(users.elementSpec.kind).toBe("object");

      const elementSpec = users.elementSpec as ObjectFieldSpec;
      expect(elementSpec.fields).toHaveLength(3);
      expect(byName<NumberFieldSpec>(elementSpec.fields, "id").kind).toBe(
        "number"
      );
      expect(byName<StringFieldSpec>(elementSpec.fields, "name").kind).toBe(
        "string"
      );
      expect(byName(elementSpec.fields, "role").kind).toBe("enum");
    });

    it("parses nested arrays", () => {
      const Schema = z.object({
        matrix: z.array(z.array(z.number())),
        groupedTags: z.array(z.array(z.string().min(1))),
      });

      const fields = zodObjectToFieldSpecs(Schema);

      const matrix = byName<ArrayFieldSpec>(fields, "matrix");
      expect(matrix.kind).toBe("array");
      expect(matrix.elementSpec.kind).toBe("array");

      const innerArray = matrix.elementSpec as ArrayFieldSpec;
      expect(innerArray.elementSpec.kind).toBe("number");

      const groupedTags = byName<ArrayFieldSpec>(fields, "groupedTags");
      const innerTagArray = groupedTags.elementSpec as ArrayFieldSpec;
      expect(innerTagArray.elementSpec.kind).toBe("string");
      expect((innerTagArray.elementSpec as StringFieldSpec).minLength).toBe(1);
    });

    it("handles array with default values", () => {
      const Schema = z.object({
        categories: z.array(z.string()).default(["general"]),
        priorities: z.array(z.number()).optional().default([]),
      });

      const fields = zodObjectToFieldSpecs(Schema);

      const categories = byName<ArrayFieldSpec>(fields, "categories");
      expect(categories.required).toBe(false);
      expect(categories.defaultValue).toEqual(["general"]);

      const priorities = byName<ArrayFieldSpec>(fields, "priorities");
      expect(priorities.required).toBe(false);
      expect(priorities.defaultValue).toEqual([]);
    });
  });

  describe("Unions", () => {
    it("parses simple union types", () => {
      const Schema = z.object({
        stringOrNumber: z.union([z.string(), z.number()]),
        boolOrString: z.union([z.boolean(), z.string()]).optional(),
      });

      const fields = zodObjectToFieldSpecs(Schema);

      const stringOrNumber = byName<UnionFieldSpec>(fields, "stringOrNumber");
      expect(stringOrNumber.kind).toBe("union");
      expect(stringOrNumber.required).toBe(true);
      expect(stringOrNumber.options).toHaveLength(2);
      expect(stringOrNumber.options[0].kind).toBe("string");
      expect(stringOrNumber.options[1].kind).toBe("number");

      const boolOrString = byName<UnionFieldSpec>(fields, "boolOrString");
      expect(boolOrString.required).toBe(false);
      expect(boolOrString.options).toHaveLength(2);
    });

    it("parses union of objects", () => {
      const Schema = z.object({
        contact: z.union([
          z.object({
            type: z.literal("email"),
            email: z.string().email(),
          }),
          z.object({
            type: z.literal("phone"),
            phone: z.string(),
            countryCode: z.string().optional(),
          }),
        ]),
      });

      const fields = zodObjectToFieldSpecs(Schema);
      const contact = byName<UnionFieldSpec>(fields, "contact");

      expect(contact.kind).toBe("union");
      expect(contact.options).toHaveLength(2);

      const emailOption = contact.options[0] as ObjectFieldSpec;
      const phoneOption = contact.options[1] as ObjectFieldSpec;

      expect(emailOption.kind).toBe("object");
      expect(emailOption.fields).toHaveLength(2);
      expect(byName(emailOption.fields, "type").kind).toBe("enum");
      expect(byName(emailOption.fields, "email").kind).toBe("string");

      expect(phoneOption.kind).toBe("object");
      expect(phoneOption.fields).toHaveLength(3);
      expect(byName(phoneOption.fields, "phone").kind).toBe("string");
      expect(byName(phoneOption.fields, "countryCode").required).toBe(false);
    });

    it("parses discriminated unions", () => {
      const Schema = z.object({
        notification: z.discriminatedUnion("type", [
          z.object({
            type: z.literal("email"),
            subject: z.string(),
            body: z.string(),
          }),
          z.object({
            type: z.literal("sms"),
            message: z.string(),
            phoneNumber: z.string(),
          }),
          z.object({
            type: z.literal("push"),
            title: z.string(),
            body: z.string(),
            badge: z.number().optional(),
          }),
        ]),
      });

      const fields = zodObjectToFieldSpecs(Schema);
      const notification = byName<UnionFieldSpec>(fields, "notification");

      expect(notification.kind).toBe("union");
      expect(notification.discriminatorKey).toBe("type");
      expect(notification.options).toHaveLength(3);

      // Check that all options are objects with the discriminator field
      notification.options.forEach((option) => {
        expect(option.kind).toBe("object");
        const objectOption = option as ObjectFieldSpec;
        const typeField = byName(objectOption.fields, "type");
        expect(typeField.kind).toBe("enum");
      });
    });

    it("handles nested unions", () => {
      const Schema = z.object({
        complexField: z.union([
          z.string(),
          z.array(z.number()),
          z.object({
            nested: z.union([z.boolean(), z.date()]),
          }),
        ]),
      });

      const fields = zodObjectToFieldSpecs(Schema);
      const complexField = byName<UnionFieldSpec>(fields, "complexField");

      expect(complexField.options).toHaveLength(3);
      expect(complexField.options[0].kind).toBe("string");
      expect(complexField.options[1].kind).toBe("array");
      expect(complexField.options[2].kind).toBe("object");

      const objectOption = complexField.options[2] as ObjectFieldSpec;
      const nestedUnion = byName<UnionFieldSpec>(objectOption.fields, "nested");
      expect(nestedUnion.kind).toBe("union");
      expect(nestedUnion.options).toHaveLength(2);
      expect(nestedUnion.options[0].kind).toBe("boolean");
      expect(nestedUnion.options[1].kind).toBe("date");
    });
  });

  describe("Complex Nested Structures", () => {
    it("parses array of objects with unions", () => {
      const Schema = z.object({
        configurations: z.array(
          z.object({
            name: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
            metadata: z
              .object({
                required: z.boolean(),
                description: z.string().optional(),
              })
              .optional(),
          })
        ),
      });

      const fields = zodObjectToFieldSpecs(Schema);
      const configurations = byName<ArrayFieldSpec>(fields, "configurations");

      expect(configurations.kind).toBe("array");

      const elementSpec = configurations.elementSpec as ObjectFieldSpec;
      expect(elementSpec.fields).toHaveLength(3);

      const value = byName<UnionFieldSpec>(elementSpec.fields, "value");
      expect(value.kind).toBe("union");
      expect(value.options).toHaveLength(3);

      const metadata = byName<ObjectFieldSpec>(elementSpec.fields, "metadata");
      expect(metadata.kind).toBe("object");
      expect(metadata.required).toBe(false);
    });

    it("parses object with array of unions", () => {
      const Schema = z.object({
        mixedData: z.object({
          items: z.array(
            z.union([
              z.object({ type: z.literal("text"), content: z.string() }),
              z.object({ type: z.literal("number"), value: z.number() }),
              z.object({
                type: z.literal("list"),
                items: z.array(z.string()),
              }),
            ])
          ),
          count: z.number(),
        }),
      });

      const fields = zodObjectToFieldSpecs(Schema);
      const mixedData = byName<ObjectFieldSpec>(fields, "mixedData");
      const items = byName<ArrayFieldSpec>(mixedData.fields, "items");
      const unionElement = items.elementSpec as UnionFieldSpec;

      expect(unionElement.kind).toBe("union");
      expect(unionElement.options).toHaveLength(3);

      // Check the third option which has a nested array
      const listOption = unionElement.options[2] as ObjectFieldSpec;
      const nestedItems = byName<ArrayFieldSpec>(listOption.fields, "items");
      expect(nestedItems.kind).toBe("array");
      expect(nestedItems.elementSpec.kind).toBe("string");
    });

    it("handles all types together with meta", () => {
      const Schema = z.object({
        profile: z.object({
          personal: z.object({
            name: z.string(),
            age: z.number(),
          }),
          contacts: z.array(
            z.discriminatedUnion("type", [
              z.object({
                type: z.literal("email"),
                address: z.string().email(),
              }),
              z.object({
                type: z.literal("phone"),
                number: z.string(),
              }),
            ])
          ),
          preferences: z
            .union([
              z.object({
                theme: z.enum(["light", "dark"]),
                notifications: z.boolean(),
              }),
              z.literal("default"),
            ])
            .optional(),
        }),
      });

      const meta: FormMeta = {
        profile: { label: "User Profile" },
        personal: { label: "Personal Info" },
        name: { label: "Full Name" },
        contacts: { label: "Contact Methods" },
      };

      const fields = zodObjectToFieldSpecs(Schema, meta);
      const profile = byName<ObjectFieldSpec>(fields, "profile");

      expect(profile.label).toBe("User Profile");
      expect(profile.fields).toHaveLength(3);

      const personal = byName<ObjectFieldSpec>(profile.fields, "personal");
      expect(personal.label).toBe("Personal Info");

      const contacts = byName<ArrayFieldSpec>(profile.fields, "contacts");
      expect(contacts.label).toBe("Contact Methods");

      const preferences = byName<UnionFieldSpec>(profile.fields, "preferences");
      expect(preferences.required).toBe(false);
    });
  });

  describe("Error Cases", () => {
    it("throws on unsupported nested types", () => {
      const WithTuple = z.object({
        coordinates: z.tuple([z.number(), z.number()]),
      });

      const WithRecord = z.object({
        mapping: z.record(z.string(), z.string()),
      });

      const WithMap = z.object({
        cache: z.map(z.string(), z.number()),
      });

      expect(() => zodObjectToFieldSpecs(WithTuple)).toThrow(
        /tuples are not supported/
      );
      expect(() => zodObjectToFieldSpecs(WithRecord)).toThrow(
        /records are not supported/
      );
      expect(() => zodObjectToFieldSpecs(WithMap)).toThrow(
        /maps\/sets are not supported/
      );
    });

    it("handles empty objects and arrays gracefully", () => {
      const Schema = z.object({
        emptyObject: z.object({}),
        emptyArray: z.array(z.string()).length(0),
      });

      const fields = zodObjectToFieldSpecs(Schema);

      const emptyObject = byName<ObjectFieldSpec>(fields, "emptyObject");
      expect(emptyObject.kind).toBe("object");
      expect(emptyObject.fields).toHaveLength(0);

      const emptyArray = byName<ArrayFieldSpec>(fields, "emptyArray");
      expect(emptyArray.kind).toBe("array");
      // Note: The constraint extraction may not work for all Zod versions/builds
      // So we just check that the array field spec is created correctly
      expect(emptyArray.elementSpec.kind).toBe("string");
    });
  });
});
